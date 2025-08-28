from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
from dotenv import load_dotenv

from database import SessionLocal, engine, get_db
from models import Base, User, Challenge, DailyEntry

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Weekly Challenges API", version="1.0.0")

# CORS middleware
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ChallengeCreate(BaseModel):
    title: str
    week_start_date: datetime

class ChallengeResponse(BaseModel):
    id: int
    title: str
    is_active: bool
    week_start_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

class DailyEntryCreate(BaseModel):
    day_index: int  # 0-6
    completed: bool = False
    difficulty: Optional[int] = None
    note: Optional[str] = None

class DailyEntryUpdate(BaseModel):
    completed: bool = False
    difficulty: Optional[int] = None
    note: Optional[str] = None

class DailyEntryResponse(BaseModel):
    id: int
    challenge_id: int
    day_index: int
    completed: bool
    difficulty: Optional[int]
    note: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

# Authentication endpoints
@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Challenge endpoints
@app.post("/challenges", response_model=ChallengeResponse)
def create_challenge(
    challenge: ChallengeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Deactivate any existing active challenges
    db.query(Challenge).filter(
        Challenge.owner_id == current_user.id,
        Challenge.is_active == True
    ).update({"is_active": False})
    
    # Create new challenge
    db_challenge = Challenge(
        title=challenge.title,
        week_start_date=challenge.week_start_date,
        is_active=True,
        owner_id=current_user.id
    )
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    
    # Create 7 daily entries (Monday=0 to Sunday=6)
    for day_index in range(7):
        daily_entry = DailyEntry(
            challenge_id=db_challenge.id,
            day_index=day_index,
            completed=False
        )
        db.add(daily_entry)
    
    db.commit()
    return db_challenge

@app.get("/challenges/current", response_model=ChallengeResponse)
def get_current_challenge(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    challenge = db.query(Challenge).filter(
        Challenge.owner_id == current_user.id,
        Challenge.is_active == True
    ).first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="No active challenge found")
    return challenge

@app.get("/challenges", response_model=List[ChallengeResponse])
def read_challenges(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    challenges = db.query(Challenge).filter(Challenge.owner_id == current_user.id).offset(skip).limit(limit).all()
    return challenges

# Daily entry endpoints
@app.put("/challenges/{challenge_id}/days/{day_index}", response_model=DailyEntryResponse)
def update_daily_entry(
    challenge_id: int,
    day_index: int,
    entry_update: DailyEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate day_index
    if day_index < 0 or day_index > 6:
        raise HTTPException(status_code=400, detail="day_index must be between 0 and 6")
    
    # Verify the challenge belongs to the current user
    challenge = db.query(Challenge).filter(
        Challenge.id == challenge_id,
        Challenge.owner_id == current_user.id
    ).first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Find the daily entry
    daily_entry = db.query(DailyEntry).filter(
        DailyEntry.challenge_id == challenge_id,
        DailyEntry.day_index == day_index
    ).first()
    if daily_entry is None:
        raise HTTPException(status_code=404, detail="Daily entry not found")
    
    # Update the entry
    daily_entry.completed = entry_update.completed
    daily_entry.difficulty = entry_update.difficulty
    daily_entry.note = entry_update.note
    
    db.commit()
    db.refresh(daily_entry)
    return daily_entry

@app.get("/challenges/{challenge_id}/days", response_model=List[DailyEntryResponse])
def get_challenge_days(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify the challenge belongs to the current user
    challenge = db.query(Challenge).filter(
        Challenge.id == challenge_id,
        Challenge.owner_id == current_user.id
    ).first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    entries = db.query(DailyEntry).filter(
        DailyEntry.challenge_id == challenge_id
    ).order_by(DailyEntry.day_index).all()
    return entries

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Weekly Challenges API is running!"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
