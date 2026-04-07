from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine
from core import database
import models  # ensures all models are registered before create_all
from api import auth, game, admin

# Create tables
database.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CV HELL API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(game.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
