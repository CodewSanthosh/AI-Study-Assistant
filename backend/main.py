from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
from datetime import timedelta
from sqlalchemy.orm import Session
from s3_utils import upload_file_to_s3
from document_processor import process_document
from embedding_utils import generate_embeddings
from db_utils import get_db, engine, Base
from models import DocumentChunk, User, ChatHistory
from rag_service import ask_tutor
from learning_service import generate_quiz, generate_flashcards
from auth_utils import get_password_hash, verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi.security import OAuth2PasswordRequestForm

# Create tables in the database (for local dev / cloud RDS)
if engine:
    try:
        # We need to recreate tables because schema changed significantly
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Notice: Could not auto-create tables on startup: {e}")

app = FastAPI(title="AI Study Assistant API", description="Backend for the AI Study Assistant")

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Schemas ---
class UserCreate(BaseModel):
    email: str
    password: str

class AskRequest(BaseModel):
    question: str

class TopicRequest(BaseModel):
    topic: str
    count: int = 5

# --- Auth Routes ---
@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": new_user.id, "email": new_user.email}}

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "email": user.email}}

# --- Protected Feature Routes ---
@app.post("/ask/")
def ask_question(request: AskRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    try:
        # Save user message
        user_msg = ChatHistory(user_id=user_id, role="user", content=request.question)
        db.add(user_msg)
        db.commit()

        answer = ask_tutor(request.question, db, user_id)
        
        # Save AI response
        ai_msg = ChatHistory(user_id=user_id, role="assistant", content=answer)
        db.add(ai_msg)
        db.commit()

        return {"question": request.question, "answer": answer}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")

@app.get("/chat/history")
def get_chat_history(db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    history = db.query(ChatHistory).filter(ChatHistory.user_id == user_id).order_by(ChatHistory.timestamp.asc()).all()
    return [{"role": h.role, "content": h.content} for h in history]

@app.post("/quiz/")
def create_quiz(request: TopicRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    try:
        quiz = generate_quiz(request.topic, db, user_id, request.count)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@app.post("/flashcards/")
def create_flashcards(request: TopicRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    try:
        cards = generate_flashcards(request.topic, db, user_id, request.count)
        return cards
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")

@app.post("/upload/")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    if not file.filename.endswith('.pdf') and not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only PDF or TXT files are allowed.")
    
    try:
        # 1. Read file bytes
        file_bytes = await file.read()

        # 2. Upload to AWS S3 (or local fallback)
        file_key = upload_file_to_s3(io.BytesIO(file_bytes), file.filename)

        # 3. Process and Chunk the document
        chunks = process_document(file_bytes, file.filename)

        # 4. Generate Embeddings using Gemini
        embeddings = generate_embeddings(chunks)

        # 5. Store in AWS RDS (Postgres + pgvector) with user_id
        for text_chunk, vector_emb in zip(chunks, embeddings):
            doc_chunk = DocumentChunk(
                user_id=user_id,
                filename=file.filename,
                chunk_text=text_chunk,
                embedding=vector_emb
            )
            db.add(doc_chunk)
        
        db.commit()
        
        return {
            "message": "File uploaded, chunked, and stored successfully!",
            "s3_key": file_key,
            "filename": file.filename,
            "total_chunks_processed": len(chunks)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

