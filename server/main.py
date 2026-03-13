from fastapi import FastAPI, HTTPException
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()
apikey=os.getenv('API_KEY')

@app.get("/")
async def root():
    return {"message": "Hello, World!"}

@app.get("/checkthekey")
async def checkapi():
    return {"key found": bool(apikey), "prefix":apikey if apikey else "Not found"}
    