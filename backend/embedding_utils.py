import os
import time
from google import genai
from google.genai import types

# Fetch Gemini API key from environment
def get_api_key():
    return os.getenv("GOOGLE_API_KEY")

# We use gemini-embedding-2 and reduce dimensionality to 768 (matches our DB schema)
EMBEDDING_MODEL = "gemini-embedding-2"

def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    """
    Takes a list of text chunks and returns a list of embedding vectors.
    Embeds each chunk individually since the Gemini SDK treats a list
    of strings as parts of a single content (not separate embeddings).
    """
    api_key = get_api_key()
    if not api_key:
        raise ValueError("Cannot generate embeddings without GOOGLE_API_KEY. Please set GOOGLE_API_KEY in backend/.env")

    client = genai.Client(api_key=api_key)
    
    all_embeddings = []
    total = len(chunks)
    
    for i, chunk in enumerate(chunks):
        if (i + 1) % 10 == 0 or i == 0 or i == total - 1:
            print(f"  Embedding chunk {i + 1}/{total}...")
        
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=chunk,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        
        all_embeddings.append(response.embeddings[0].values)
        
        # Rate limit: pause every 10 chunks to avoid hitting API limits
        if (i + 1) % 10 == 0 and i + 1 < total:
            time.sleep(1)
    
    print(f"  Total embeddings generated: {len(all_embeddings)}")
    return all_embeddings
