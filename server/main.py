from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import httpx
import requests
import os
from dotenv import load_dotenv
from .database import engine
from . import models
from sqlalchemy.orm import Session
from .models import ExchangeRate
from .database import SessionLocal
from datetime import datetime, timezone
from pathlib import Path
from decimal import Decimal
from sqlalchemy import func
import json
from contextlib import asynccontextmanager
import logging

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)
apikey=os.getenv('API_KEY')

# 1. Stop Uvicorn from repeating startup messages
#logging.getLogger("uvicorn.error").propagate = False
# 2. Stop the "Will watch for changes..." messages from watchfiles
logging.getLogger("watchfiles.main").setLevel(logging.WARNING)
# 3. (Optional) Stop SQLAlchemy from logging every database check
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

FILE_PATH = "avaliable_currencies.json"

async def fetch_supported_codes():
    # Use the global apikey defined above
    if not apikey:
        print("CRITICAL ERROR: API_KEY is missing from .env file!")
        return # Stop here if no key

    url = f"https://v6.exchangerate-api.com/v6/{apikey}/codes"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("result") == "success":
                codes = data.get("supported_codes", [])
                with open(FILE_PATH, "w") as f: 
                    json.dump({"currencies": codes}, f, indent=2)
                print(f"✅ Successfully saved {len(codes)} codes to {FILE_PATH}")
            else:
                print(f"❌ API returned an error: {data.get('error-type')}")
        except Exception as e: 
            print(f"❌ Network Error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check if file exists
    if not os.path.exists(FILE_PATH):
        print('🚀 avaliable_currencies.json does not exist. Calling the API...')
        await fetch_supported_codes()
    else: 
        print('📂 avaliable_currencies.json found. Skipping API call.')
    yield

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:3000",   # Default for many React/Vite templates
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",  # Common default for Expo web
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # List of allowed origins
    allow_credentials=True,     # Allow cookies and auth headers
    allow_methods=["*"],        # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],        # Allow all headers
    max_age=600,
)

@app.on_event("startup")
def startup_create_tables():
    models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "Welcome to the financial dashboard where you can get up to speed on exchange rates and crypto"}

@app.get("/check_api")
async def checkapi():
    return {"key found": bool(apikey), "prefix":apikey[:4] + "****" if apikey else "Not found"}

@app.get("/rates/{base_currency}")
async def getrate(base_currency: str):
    base_currency=base_currency.upper()
    if not apikey:
        raise HTTPException(status_code=500, detail="API_KEY is missing. Set API_KEY in environment.")
    url=f"https://v6.exchangerate-api.com/v6/{apikey}/latest/{base_currency}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            data = response.json()
            if response.status_code != 200:
                detail = data.get("error-type") if isinstance(data, dict) else "Upstream error"
                raise HTTPException(status_code=502, detail=f"Upstream error: {detail}")
            if not isinstance(data, dict) or data.get("result") != "success":
                err = data.get("error-type") if isinstance(data, dict) else "unknown_error"
                raise HTTPException(status_code=400, detail=f"API error: {err}")
            return {
                "base": data["base_code"],
                "rates": data["conversion_rates"]
            }
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Internal server error")

@app.api_route("/fetch_and_save/{base_currency}", methods=["GET", "POST"])
async def fetch_and_save(base_currency: str, db: Session = Depends(get_db)):
    
    
    utc_now = datetime.now(timezone.utc)
    latest_row = db.query(ExchangeRate).filter(func.date(ExchangeRate.created_at) == utc_now.date(), ExchangeRate.base_currency == base_currency.upper()).first()
    if latest_row:
        return {"message": f"Already updated {base_currency} for today's date (UTC)."}
    
    base_currency = base_currency.upper()
    if not apikey:
        raise HTTPException(status_code=500, detail="API_KEY is missing. Set API_KEY in environment.")
    url = f"https://v6.exchangerate-api.com/v6/{apikey}/latest/{base_currency}"
    async with httpx.AsyncClient() as client:
        try:
            # 1. Non-blocking network request
            response = await client.get(url, timeout=20.0)

             # 2. Handle non-200 responses
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Upstream error: {response.status_code}")
            
            data = response.json()
            
            # 3. Validate API response
            if data.get("result") != "success":
                err = data.get("error-type", "unknown_error")
                raise HTTPException(status_code=400, detail=f"API error: {err}")
            
            base = data.get("base_code")
            rates = data.get("conversion_rates", {})

            if not base or not rates:
                raise HTTPException(status_code=400, detail="Invalid data from upstream")
            
            # 4. Save to DB
            for currency_code, rate_value in rates.items():
                new_entry = ExchangeRate(
                    base_currency=base,
                    target_currency=currency_code,
                    rate=Decimal(str(rate_value)),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(new_entry)

            # NOTE: Use 'await db.commit()' ONLY if your 'get_db' provides an AsyncSession.
            # If using a standard synchronous SessionLocal, keep it as 'db.commit()'.
            db.commit() 

            return {"message": f"Saved {len(rates)} rates for {base}"}
            
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Network error: {exc}")
        except Exception as e:
            # Log the error 'e' here if possible
            raise HTTPException(status_code=500, detail="Internal server error")