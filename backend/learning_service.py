import json
from google import genai
from sqlalchemy.orm import Session
from rag_service import retrieve_context, get_api_key

def generate_quiz(topic: str, db: Session, user_id: int, num_questions: int = 5) -> dict:
    """
    Generates a multiple-choice quiz based on the user's uploaded documents.
    """
    api_key = get_api_key()
    if not api_key:
        return {"error": "GOOGLE_API_KEY is missing. Please set it in backend/.env"}

    context = retrieve_context(topic, db, user_id, top_k=5)
    
    prompt = f"""
    You are an AI Study Assistant. Create a {num_questions}-question multiple choice quiz about "{topic}" based ONLY on the following context.
    
    CRITICAL RULES:
    1. Each question MUST have exactly 4 options.
    2. The options must be plain text strings (NOT prefixed with "A)", "B)", etc.).
    3. The `correct_answer` MUST be the exact full string of one of the 4 options.
    4. Return ONLY valid JSON in the exact format shown below, with no markdown formatting or extra text.

    Format:
    {{
      "quiz_title": "Title of the Quiz",
      "questions": [
        {{
          "question": "The question text?",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correct_answer": "Option 1",
          "explanation": "Why this is correct."
        }}
      ]
    }}
    
    Context:
    {context}
    """
    
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    
    try:
        # Clean up markdown formatting if the LLM includes it
        text = response.text
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        data = json.loads(text.strip())
        
        # Safety check: Ensure correct_answer matches an option exactly
        for q in data.get("questions", []):
            if q["correct_answer"] not in q["options"]:
                # If there's a mismatch, just pick the first option as a fallback to prevent UI crash
                # (Though our improved prompt should prevent this)
                q["correct_answer"] = q["options"][0]
                q["explanation"] = "Error: Original answer did not match options. " + q.get("explanation", "")
                
        return data
    except json.JSONDecodeError:
        print(f"Failed to parse JSON. Raw response: {response.text}")
        raise ValueError("Failed to parse the generated quiz into JSON.")

def generate_flashcards(topic: str, db: Session, user_id: int, num_cards: int = 5) -> dict:
    """
    Generates flashcards based on the user's uploaded documents.
    """
    api_key = get_api_key()
    if not api_key:
        return {"error": "GOOGLE_API_KEY is missing. Please set it in backend/.env"}

    context = retrieve_context(topic, db, user_id, top_k=5)
    
    prompt = f"""
    You are an AI Study Assistant. Create {num_cards} flashcards about "{topic}" based ONLY on the following context.
    Each flashcard should have a clear "front" (the concept/term) and a concise "back" (the definition/explanation).
    
    CRITICAL RULE: Return ONLY valid JSON in the exact format shown below, with no markdown formatting or extra text.

    Format:
    {{
      "flashcards": [
        {{
          "front": "Term or Concept",
          "back": "Clear and concise definition or explanation."
        }}
      ]
    }}
    
    Context:
    {context}
    """
    
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    
    try:
        text = response.text
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except json.JSONDecodeError:
        print(f"Failed to parse JSON. Raw response: {response.text}")
        raise ValueError("Failed to parse the generated flashcards into JSON.")
