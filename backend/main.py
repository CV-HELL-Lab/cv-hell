from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from core.database import engine
from core import database
import models  # ensures all models are registered before create_all
import models.system_setting  # ensure system_setting table is registered
from api import auth, game, admin

# Create tables (new tables only)
database.Base.metadata.create_all(bind=engine)

# Incremental column migrations — safe to run repeatedly (IF NOT EXISTS)
with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_cv_encrypted BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR PRIMARY KEY,
            value VARCHAR NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        INSERT INTO system_settings (key, value)
        VALUES ('difficulty_mode', 'hard')
        ON CONFLICT (key) DO NOTHING
    """))
    conn.commit()

app = FastAPI(title="CV HELL API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
