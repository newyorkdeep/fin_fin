from sqlalchemy import Column, Integer, String, Numeric, DateTime
from datetime import datetime
from server.database import Base  # Base is defined in server/database.py

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    base_currency = Column(String(3), nullable=False) # e.g., 'USD'
    target_currency = Column(String(3), nullable=False) # e.g., 'EUR'
    rate = Column(Numeric(precision=10, scale=6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)