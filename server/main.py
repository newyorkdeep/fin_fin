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

@app.get("/checkthekey")
async def checkapi():
    return {"key found": bool(apikey), "prefix":apikey if apikey else "Not found"}

@app.post("/save-rates")
async def save_rates(payload: dict, db: Session = Depends(get_db)):
    # 1. Extract the base and the rates dictionary
    base_currency = payload.get("base")
    rates = payload.get("rates") # This is the {"USD": 1, "EUR": 0.9} part

    if not base_currency or not rates:
        raise HTTPException(status_code=400, detail="Invalid JSON structure")

    # 2. Loop through the rates dictionary
    for currency_code, rate_value in rates.items():
        new_entry = ExchangeRate(
            base_currency = base_currency, 
            target_currency = currency_code,
            rate = Decimal(str(rate_value)),
            created_at = datetime.now(timezone.utc),
        )
        db.add(new_entry)

    # 3. Commit everything at once
    db.commit()
    return {"message": f"Saved {len(rates)} rates for {base_currency}"}

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

@app.api_route("/fetchtodb/{base_currency}", methods=["GET", "POST"])
def fetch_and_save(base_currency: str, db: Session = Depends(get_db)):
    """
    Fetch rates using the Python 'requests' library and save them directly.
    Equivalent to GET /rates/{base_currency} followed by POST /save-rates.
    """
    base_currency = base_currency.upper()
    if not apikey:
        raise HTTPException(status_code=500, detail="API_KEY is missing. Set API_KEY in environment.")
    url = f"https://v6.exchangerate-api.com/v6/{apikey}/latest/{base_currency}"
    try:
        r = requests.get(url, timeout=20)
        content_type = r.headers.get("content-type", "")
        data = r.json() if "json" in content_type.lower() else None
        if r.status_code != 200:
            detail = data.get("error-type") if isinstance(data, dict) else r.text
            raise HTTPException(status_code=502, detail=f"Upstream error: {detail}")
        if not isinstance(data, dict) or data.get("result") != "success":
            err = data.get("error-type") if isinstance(data, dict) else "unknown_error"
            raise HTTPException(status_code=400, detail=f"API error: {err}")
        payload = {
            "base": data.get("base_code"),
            "rates": data.get("conversion_rates", {})
        }
        # Validate payload structure
        base = payload.get("base")
        rates = payload.get("rates")
        if not base or not rates:
            raise HTTPException(status_code=400, detail="Invalid JSON structure from upstream API")

        # Save to DB (same logic as save_rates)
        for currency_code, rate_value in rates.items():
            new_entry = ExchangeRate(
                base_currency=base,
                target_currency=currency_code,
                rate=Decimal(str(rate_value)),
                created_at=datetime.now(timezone.utc),
            )
            db.add(new_entry)
        db.commit()
        return {"message": f"Saved {len(rates)} rates for {base}", "base": base}
    except HTTPException:
        # let HTTPExceptions pass through
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
