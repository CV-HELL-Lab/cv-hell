"""
Seed the database with the 5 bosses and initialize their prize pools.
Run once after the database is created: python seed.py
"""
import json
import os
import uuid
from core.database import SessionLocal
from core.config import settings
from models.boss import Boss
from models.prize_pool import PrizePool


BOSS_CONFIG_FILES = [
    "layout_tyrant.json",
    "structure_sniper.json",
    "bullet_butcher.json",
    "scan_reaper.json",
    "cold_recruiter.json",
]


def seed():
    db = SessionLocal()
    try:
        if db.query(Boss).count() > 0:
            print("Bosses already seeded. Skipping.")
            return

        for i, filename in enumerate(BOSS_CONFIG_FILES):
            path = os.path.join(settings.BOSS_CONFIGS_PATH, filename)
            with open(path) as f:
                config = json.load(f)

            status = "current" if i == 0 else "locked"
            boss = Boss(
                id=uuid.uuid4(),
                name=config["name"],
                slug=config["slug"],
                order_index=config["order_index"],
                specialty=config["specialty"],
                status=status,
                rudeness_level=2,
            )
            db.add(boss)
            db.flush()

            if status == "current":
                pool = PrizePool(id=uuid.uuid4(), boss_id=boss.id, total_points=0)
                db.add(pool)

            print(f"Seeded: {boss.name} [{status}]")

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
