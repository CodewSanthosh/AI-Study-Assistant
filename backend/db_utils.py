import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Fetch database URL from environment variable
# Expected format: postgresql+psycopg2://user:password@endpoint:5432/dbname
DATABASE_URL = os.getenv("DATABASE_URL")

# If no DB URL is provided yet (e.g. running locally for testing without RDS), we fail gracefully
if not DATABASE_URL:
    print("Warning: DATABASE_URL is not set. Database operations will fail.")
    engine = None
    SessionLocal = None
else:
    engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 3})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    if not SessionLocal:
        raise Exception("Database is not configured. Please set DATABASE_URL.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
