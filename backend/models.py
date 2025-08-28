from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    challenges = relationship("Challenge", back_populates="owner")

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    week_start_date = Column(DateTime, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="challenges")
    daily_entries = relationship("DailyEntry", back_populates="challenge")

class DailyEntry(Base):
    __tablename__ = "daily_entries"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"))
    day_index = Column(Integer, nullable=False)  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    completed = Column(Boolean, default=False)
    difficulty = Column(Integer)  # 1-5 scale
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    challenge = relationship("Challenge", back_populates="daily_entries")
