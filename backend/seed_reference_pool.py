"""
Seed the reference pool with excellent/bad/mid/victory_descriptor items.
Run after seed.py: python seed_reference_pool.py

Excellent and bad/mid samples are extracted directly from the real resume files
in doc/CV_Hell_Reference_Pool/ and doc/CV_References_Harvard_MIT_Yale/.
"""
import os
import uuid
import sys

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from core.database import SessionLocal
from models.reference_pool import ReferencePoolItem


DOC_DIR = os.path.join(os.path.dirname(__file__), "..", "doc")
REF_POOL_DIR = os.path.join(DOC_DIR, "CV_Hell_Reference_Pool")
HMY_DIR = os.path.join(DOC_DIR, "CV_References_Harvard_MIT_Yale")


def extract_pdf(path: str) -> str:
    import pdfplumber
    lines = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                lines.append(text.strip())
    return "\n\n".join(lines)


def extract_docx(path: str) -> str:
    from docx import Document
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def load_file(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        return extract_pdf(path)
    elif ext == ".docx":
        return extract_docx(path)
    raise ValueError(f"Unsupported file type: {ext}")


VICTORY_DESCRIPTOR = """VICTORY STATE DESCRIPTOR — When the boss must approve

A resume has reached the victory threshold when ALL of the following are true.
This is not about perfection. It is about the absence of high-value attack targets.

REQUIRED CONDITIONS FOR APPROVAL:

1. PAGE STRUCTURE IS NOT CHAOTIC
   - The page does not look visually crammed or randomly assembled
   - Margins are consistent; sections do not bleed into each other
   - There is clear separation between sections

2. SECTION HIERARCHY IS VISIBLE
   - Section headers are clearly distinguishable from body text
   - The reader's eye naturally flows from header to header
   - Name and contact block is immediately obvious at the top

3. WHITESPACE IS ADEQUATE
   - The page does not feel suffocating or overly sparse
   - Line spacing within sections is consistent
   - There is breathing room between sections

4. SECTION ORDER MAKES LOGICAL SENSE
   - For students/new grads: Education → Experience → Projects → Skills
   - For experienced: Experience → Education → Skills
   - No major section is misplaced
   - No obviously missing sections (no contact info, no experience, no dates)

5. KEY INFORMATION IS SCANNABLE IN 6 SECONDS
   - Name is at the top, large and obvious
   - Most recent role/institution is immediately findable
   - Dates are visible and consistently placed (preferably right-aligned)

6. BULLETS ARE COMPRESSED AND LEAD WITH THE POINT
   - No bullet is more than 2 lines
   - Bullets start with action verbs, not "I" or filler preamble
   - No bullet is a paragraph disguised with a hyphen

7. NO REMAINING HIGH-VALUE TARGETS
   - The boss has no obvious structural or layout crime left to name
   - All previously identified critical issues have been addressed
   - Only minor stylistic preferences remain (not structural crimes)

APPROVAL TRIGGER:
If a boss cannot name a specific, concrete, high-value structural or layout attack
against this resume, it MUST approve — reluctantly, with resigned language.
The boss does not need to like the resume. It just needs to have nothing left to destroy.
"""


def build_items() -> list[dict]:
    items = []

    # ── Excellent: project-curated samples ──────────────────────────────
    excellent_pdf = os.path.join(REF_POOL_DIR, "cv_hell_reference_excellent.pdf")
    items.append({
        "type": "excellent",
        "boss_scope": "global",
        "content": (
            "EXCELLENT RESUME REFERENCE (curated samples — these are the formatting standard the boss internally uses)\n\n"
            + load_file(excellent_pdf)
        ),
        "tags_json": '["layout","structure","bullets","hierarchy","scan-ability"]',
    })

    # ── Excellent: MIT undergrad sample ─────────────────────────────────
    mit_ug = os.path.join(HMY_DIR, "MIT-Undergrad.pdf")
    items.append({
        "type": "excellent",
        "boss_scope": "global",
        "content": (
            "EXCELLENT RESUME REFERENCE — MIT Undergraduate Sample\n"
            "(Sourced from MIT CAPD official sample resume collection)\n\n"
            + load_file(mit_ug)
        ),
        "tags_json": '["layout","structure","bullets","mit"]',
    })

    # ── Excellent: MIT masters sample ───────────────────────────────────
    mit_masters = os.path.join(HMY_DIR, "MIT-Masters.pdf")
    items.append({
        "type": "excellent",
        "boss_scope": "global",
        "content": (
            "EXCELLENT RESUME REFERENCE — MIT Masters Sample\n"
            "(Sourced from MIT CAPD official sample resume collection)\n\n"
            + load_file(mit_masters)
        ),
        "tags_json": '["layout","structure","bullets","mit","graduate"]',
    })

    # ── Excellent: Yale Technical template ──────────────────────────────
    yale_tech = os.path.join(HMY_DIR, "Yale-Technical.docx")
    items.append({
        "type": "excellent",
        "boss_scope": "global",
        "content": (
            "EXCELLENT RESUME REFERENCE — Yale OCS Technical Resume Template\n"
            "(Sourced from Yale Office of Career Strategy official template)\n\n"
            + load_file(yale_tech)
        ),
        "tags_json": '["layout","structure","yale","technical"]',
    })

    # ── Bad: project-curated samples ────────────────────────────────────
    bad_pdf = os.path.join(REF_POOL_DIR, "cv_hell_reference_bad.pdf")
    items.append({
        "type": "bad",
        "boss_scope": "global",
        "content": (
            "BAD RESUME REFERENCE (these are examples of everything wrong — use them to name specific attack targets)\n\n"
            "Common flaws in this sample:\n"
            "- Bloated skills dump listing every language ever touched\n"
            "- Objective statements that say nothing\n"
            "- Bullet points that are wall-of-text paragraphs with no white space\n"
            "- Words run together with no spacing (formatting collapse)\n"
            "- Missing dates or vague date ranges\n"
            "- Hobbies and 'references available upon request' wasting lines\n"
            "- No quantified impact anywhere\n\n"
            + load_file(bad_pdf)
        ),
        "tags_json": '["layout","bullets","structure","scan-ability","anti-pattern"]',
    })

    # ── Mid: project-curated samples ────────────────────────────────────
    mid_pdf = os.path.join(REF_POOL_DIR, "cv_hell_reference_mid.pdf")
    items.append({
        "type": "mid",
        "boss_scope": "global",
        "content": (
            "MID-QUALITY RESUME REFERENCE (better than bad but still attackable — use to show 'improved but not done')\n\n"
            "What's better than the bad sample:\n"
            "- No bloated header or objective\n"
            "- Bullet format exists (not wall of text)\n"
            "- Sections are in reasonable order\n\n"
            "What's still flawed (boss should continue attacking):\n"
            "- Weak verbs: 'Helped', 'Worked on', 'Participated in', 'Assisted'\n"
            "- No quantified impact — 'improved response times' means nothing\n"
            "- Vague date ranges (just years, no months)\n"
            "- Skills are an unlabeled comma-dump\n"
            "- Bullets are similar length but all equally weak\n\n"
            + load_file(mid_pdf)
        ),
        "tags_json": '["bullets","structure","hierarchy","mid-quality"]',
    })

    # ── Victory descriptor ───────────────────────────────────────────────
    items.append({
        "type": "victory_descriptor",
        "boss_scope": "global",
        "content": VICTORY_DESCRIPTOR,
        "tags_json": '["victory","approval","threshold"]',
    })

    return items


def seed_reference_pool():
    db = SessionLocal()
    try:
        existing = db.query(ReferencePoolItem).count()
        if existing > 0:
            print(f"Reference pool already has {existing} items.")
            answer = input("Re-seed? This will delete all existing items. [y/N]: ").strip().lower()
            if answer != "y":
                print("Skipped.")
                return
            db.query(ReferencePoolItem).delete()
            db.commit()
            print("Cleared existing reference pool.")

        items = build_items()
        for item_data in items:
            item = ReferencePoolItem(
                id=uuid.uuid4(),
                type=item_data["type"],
                boss_scope=item_data["boss_scope"],
                content=item_data["content"],
                tags_json=item_data["tags_json"],
            )
            db.add(item)

        db.commit()
        print(f"\nSeeded {len(items)} reference pool items:")
        for item_data in items:
            print(f"  [{item_data['type'].upper():20s}] scope={item_data['boss_scope']}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_reference_pool()
