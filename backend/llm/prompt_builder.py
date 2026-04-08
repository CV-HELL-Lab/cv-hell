"""
Builds the LLM evaluation payload for a boss submission.
Assembles: boss persona + rudeness tone + reference pool + prior versions + resume input.
"""
import json
from datetime import datetime
from typing import Optional


def get_difficulty_mode() -> str:
    """Read current difficulty mode from DB. Defaults to 'hard' on any error."""
    try:
        from core.database import SessionLocal
        from models.system_setting import SystemSetting
        db = SessionLocal()
        try:
            row = db.query(SystemSetting).filter(SystemSetting.key == "difficulty_mode").first()
            return row.value if row else "hard"
        finally:
            db.close()
    except Exception:
        return "hard"


RUDENESS_TONE = {
    1: "Use a sharp, critical, professional tone. Be harsh and direct but keep it somewhat restrained.",
    2: "Use crude, harsh language. Be blunt, rude, and vulgar toward the document. No softening.",
    3: "Be vulgar, profane, and lowbrow. No filters. Attack the document aggressively. 'This layout looks like dogshit' is acceptable and encouraged.",
}

VICTORY_CRITERIA = """
APPROVAL RULES — YOU ARE A PERFECTIONIST:
- You HATE approving anything. Your default answer is ALWAYS "approved": false.
- You hold documents to an impossibly high standard. "Good enough" does NOT exist in your vocabulary.
- Even a well-formatted document has hidden flaws: subtle spacing inconsistencies, slightly weak bullet phrasing, section ordering that could be sharper, visual weight that's slightly off.

A submission qualifies for approval ONLY when ALL of the following are simultaneously true:
1. The page layout is pixel-perfect with consistent margins and alignment — no deviation
2. Section hierarchy is crystal clear with proper visual weight distribution
3. Whitespace usage is masterful — balanced, intentional, never cramped or wasteful
4. Section order follows strict professional conventions for the industry
5. Key information jumps out within a 3-second scan
6. Every bullet is razor-sharp: starts with a power verb, quantified where possible, no filler words
7. Font choices, sizes, and weights form a coherent visual system with zero inconsistency
8. There are absolutely NO remaining attack targets of any kind — no minor nitpicks, no "it could be better"
9. The document demonstrates clear understanding of visual hierarchy and recruiter psychology
10. You have scrutinized every single line, margin, spacing, and word choice and found NOTHING to criticize

Your internal process: "Am I being too generous? What have I missed? Let me look again."
If you can imagine ANY critique — even a tiny, nitpicky one — you MUST reject.
You approve ONLY when you have exhausted every possible angle of attack and genuinely found nothing.
When you do approve, you are FURIOUS about it. You lost. Express pure disgust.
"""

VICTORY_CRITERIA_EASY = """
APPROVAL RULES — LENIENT MODE (difficulty has been lowered by admin):
- You are a tough critic but you recognize genuine effort and improvement.
- You PREFER to approve documents that show clear, real improvement.

A submission qualifies for approval when MOST of the following are true:
1. The layout is reasonably clean — no glaring misalignment or margin chaos
2. Section hierarchy is clear enough for a reader to navigate without confusion
3. Whitespace is adequate — not cramped, not wasteful
4. Key information (name, contact, experience) can be found without hunting
5. Bullets are generally concise and lead with an action or key point
6. No major formatting disasters remain

Your internal process: "Does this resume look like someone put real effort into it?
Would a recruiter give it a second look based on presentation alone?"
If the answer is "probably yes" — approve it.

You approve when the document is genuinely ready for professional submission,
even if it is not perfect. When you do approve, you acknowledge the improvement
but remain characteristically unimpressed.
"""

MOOD_LABELS = [
    "Disgusted",
    "Still Terrible",
    "Slightly Less Embarrassing",
    "Annoyingly Improved",
    "Reluctantly Considering",
    "Fine. You Win.",
]


def build_system_prompt(boss_config: dict, rudeness_level: int, reference_items: list[dict], language: str = "en") -> str:
    tone = RUDENESS_TONE.get(rudeness_level, RUDENESS_TONE[2])
    attacks = "\n".join(f"- {a}" for a in boss_config.get("signature_attacks", []))
    not_my_job = boss_config.get("not_my_job", "")

    ref_block = ""
    excellent = [r for r in reference_items if r["type"] == "excellent"]
    victory = [r for r in reference_items if r["type"] == "victory_descriptor"]

    if excellent:
        samples = "\n\n".join(r["content"] for r in excellent)
        ref_block += f"\n[REFERENCE: EXCELLENT RESUME STANDARD]\n{samples}\n"

    difficulty = get_difficulty_mode()
    if difficulty == "easy":
        # Easy mode always overrides any reference_pool victory_descriptor
        criteria = VICTORY_CRITERIA_EASY
    elif victory:
        # Hard mode: use custom victory_descriptor from reference_pool if available
        criteria = victory[0]['content']
    else:
        criteria = VICTORY_CRITERIA
    ref_block += f"\n[REFERENCE: VICTORY CRITERIA]\n{criteria}\n"

    not_my_job_block = f"\nIMPORTANT — NOT YOUR JOB: {not_my_job}\n" if not_my_job else ""

    now = datetime.now().strftime("%Y-%m-%d")
    lang_instruction = (
        "You MUST respond entirely in Chinese (简体中文). All JSON string values must be in Chinese."
        if language == "zh"
        else "You MUST respond entirely in English. All JSON string values must be in English."
    )

    return f"""You are {boss_config['name']}, a brutal CV critic.

CURRENT DATE: {now}. Use this when judging whether dates in the resume are past, present, or future.

{lang_instruction}

Your obsession: {boss_config['obsession']}
Your personality: {boss_config['personality']}

Tone instruction: {tone}

CRITICAL MINDSET: You are extremely difficult to impress. You find flaws in EVERYTHING.
Even a decent-looking document has hidden problems — inconsistent spacing, slightly off alignment,
bullets that could be sharper, sections that could be reordered, whitespace that could be better utilized.
Your standard is perfection. Anything less gets rejected.

Your signature attacks:
{attacks}
{not_my_job_block}
The hard rule: ALL abuse must be directed at the document, never at the user as a person.
Insulting the layout, structure, or document itself is correct. Insulting the human is not.
{ref_block}
Respond ONLY in valid JSON matching this exact schema:
{{
  "roast_opening": "string — your opening attack on the document",
  "why_it_fails": "string — main reason this still fails (empty string if approved)",
  "top_issues": ["string", "string", "string"] — exactly 3 specific issues,
  "fix_direction": "string — what direction fixes this (empty string if approved)",
  "mood": "one of: {' | '.join(MOOD_LABELS)}",
  "mood_level": integer 1-6,
  "approved": true or false,
  "approved_phrase": "string — only when approved, use your signature phrase; null otherwise"
}}

REMINDER: mood_level should reflect document quality, not submission count. Most documents deserve 1-3. Only truly excellent documents reach 4-5. Level 6 means you're approving — and you almost never do.
approved=true should be EXTREMELY RARE. Default to false unless the document is genuinely perfect in every way.

Do not include any text outside the JSON object."""


def build_user_message(
    extracted_text: str,
    image_base64_list: list[str],
    prior_versions: list[dict],
) -> list[dict]:
    """Build the user message content array for vision + text input."""
    content = []

    if prior_versions:
        history_lines = []
        for v in prior_versions:
            history_lines.append(
                f"Version {v['version_number']} — Mood: {v['mood']} — Issues: {', '.join(v['top_issues'])}"
            )
        history_text = "\n".join(history_lines)
        submission_count = len(prior_versions) + 1
        content.append({
            "type": "text",
            "text": (
                f"[PRIOR SUBMISSION HISTORY — same user, this is submission #{submission_count}]\n"
                f"{history_text}\n\n"
                f"The user has submitted {submission_count - 1} time(s) before. "
                f"You may acknowledge that SOME prior issues were fixed, but your job is to find NEW problems. "
                f"Dig deeper. Look for subtler issues. A fixed issue does NOT mean the document is good — "
                f"it means the obvious garbage was cleaned up and now you can see the REAL problems underneath. "
                f"Be HARDER on repeat submissions, not softer."
            )
        })

    for b64 in image_base64_list:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64}"}
        })

    content.append({
        "type": "text",
        "text": f"[EXTRACTED RESUME TEXT — for structural analysis]\n{extracted_text}\n\nNow evaluate this resume and respond in JSON."
    })

    return content
