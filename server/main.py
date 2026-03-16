from fastapi import FastAPI, HTTPException, Depends
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

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)
app = FastAPI()
apikey=os.getenv('API_KEY')

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
    return {"message": "Hello, World!"}

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

            return {"message": f"Saved {len(rates)} rates for {base}", "base": base}
            
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Network error: {exc}")
        except Exception as e:
            # Log the error 'e' here if possible
            raise HTTPException(status_code=500, detail="Internal server error")
