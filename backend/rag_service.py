import os
from sqlalchemy.orm import Session
from sqlalchemy import text
from embedding_utils import generate_embeddings
from google import genai

def get_api_key():
    return os.getenv("GOOGLE_API_KEY")

def retrieve_context(query: str, db: Session, user_id: int, top_k: int = 5) -> str:
    """
    Retrieves the most relevant document chunks for a given query, filtered by user_id.
    """
    # 1. Embed the user's query
    query_embedding = generate_embeddings([query])[0]
    
    # 2. Query Postgres pgvector for the closest chunks (Cosine distance using <=>)
    # Note: pgvector supports L2 distance (<->), Cosine distance (<=>), and Inner product (<#>)
    # We use Cosine distance for text embeddings.
    
    # Convert list of floats to a Postgres vector string format
    vector_str = "[" + ",".join(map(str, query_embedding)) + "]"
    
    sql_query = text(f"""
        SELECT chunk_text 
        FROM document_chunks 
        WHERE user_id = :user_id
        ORDER BY embedding <=> '{vector_str}' 
        LIMIT :top_k
    """)
    
    results = db.execute(sql_query, {"top_k": top_k, "user_id": user_id}).fetchall()
    
    if not results:
        return "No relevant context found in uploaded documents."
        
    # Combine the top chunks into a single context string
    context = "\n\n---\n\n".join([row[0] for row in results])
    return context

def ask_tutor(query: str, db: Session, user_id: int) -> str:
    """
    Retrieves context and asks the Gemini LLM to answer the question based on the context.
    """
    api_key = get_api_key()
    if not api_key:
        return "Error: GOOGLE_API_KEY is missing. Please set it in backend/.env"

    context = retrieve_context(query, db, user_id, top_k=5)
    
    prompt = f"""
    You are an expert AI Study Assistant. Answer the user's question based ONLY on the provided context from their study materials.
    If the context does not contain the answer, politely say that you cannot find the answer in the uploaded documents.
    
    Context:
    {context}
    
    Question: {query}
    
    Answer:
    """
    
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    
    return response.text
