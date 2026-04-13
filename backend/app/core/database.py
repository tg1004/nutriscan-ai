from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create the database engine (the actual connection pool)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # checks connection is alive before using it
    pool_size=10,             # keep up to 10 connections open
    max_overflow=20           # allow up to 20 extra connections under load
)

# SessionLocal is a factory — call it to get a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all our database models will inherit from
Base = declarative_base()

def get_db():
    """
    FastAPI dependency — provides a database session per request,
    and automatically closes it when the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()