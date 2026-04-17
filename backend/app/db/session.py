from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create the engine (The actual connection to Postgres)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True # Automatically checks if the connection is alive
)

# Create a SessionLocal class (THe factory for DB sessions)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
        
# Create the Base for models (Blueprints)
# Note we are moving this to 'base_class.py' for better organization
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()

