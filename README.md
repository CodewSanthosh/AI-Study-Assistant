# AI Study Assistant

An open-source, 100% free AI study assistant built with FastAPI, React, and RAG.

## Features
- **Learning**: Quizzes, Flashcards, Study Plans
- **RAG Pipeline**: Document chunking, embeddings, and retrieval
- **Analytics**: Performance tracking, weak area identification
- **AI Tutor**: Adaptive learning responses

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: Supabase
- **Vector DB**: Pinecone
- **LLM**: Google Gemini API
- **Deployment**: Vercel (Frontend), Render (Backend)

## Setup Instructions

### Backend
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
