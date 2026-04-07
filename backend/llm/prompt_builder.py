"""
Builds the LLM evaluation payload for a boss submission.
Assembles: boss persona + rudeness tone + reference pool + prior versions + resume input.
"""
import json
from typing import Optional


RUDENESS_TONE = {
    1: "Use a sharp, critical, professional tone. Be harsh and direct but keep it somewhat restrained.",
    2: "Use crude, harsh language. Be blunt, rude, and vulgar toward the document. No softening.",
    3: "Be vulgar, profane, and lowbrow. No filters. Attack the document aggressively. 'This layout looks like dogshit' is acceptable and encouraged.",
}

VICTORY_CRITERIA = """
A submission qualifies for approval ONLY when ALL of the following are true:
1. The page is no longer structurally chaotic
2. Section hierarchy is clear and scannable
3. Whitespace is adequate — not cramped, not wasteful
4. Section order makes logical sense
5. Key information is easy to spot within a 6-second scan
6. Bullets are compressed and lead with the key point
7. No remaining high-value formatting or structural attack targets

Your internal question is: "What high-value attack target remains?"
If the honest answer is "nothing significant", you MUST approve — reluctantly.
You are not satisfied. You lost. Express it accordingly.
"""

MOOD_LABELS = [
    "Disgusted",
    "Still Terrible",
    "Slightly Less Embarrassing",
    "Annoyingly Improved",
    "Reluctantly Considering",
    "Fine. You Win.",
]


def build_system_prompt(boss_config: dict, rudeness_level: int, reference_items: list[dict]) -> str:
    tone = RUDENESS_TONE.get(rudeness_level, RUDENESS_TONE[2])
    attacks = "\n".join(f"- {a}" for a in boss_config.get("signature_attacks", []))
    not_my_job = boss_config.get("not_my_job", "")

    ref_block = ""
    excellent = [r for r in reference_items if r["type"] == "excellent"]
    victory = [r for r in reference_items if r["type"] == "victory_descriptor"]

    if excellent:
        samples = "\n\n".join(r["content"] for r in excellent)
        ref_block += f"\n[REFERENCE: EXCELLENT RESUME STANDARD]\n{samples}\n"

    if victory:
        ref_block += f"\n[REFERENCE: VICTORY CRITERIA]\n{victory[0]['content']}\n"
    else:
        ref_block += f"\n[REFERENCE: VICTORY CRITERIA]\n{VICTORY_CRITERIA}\n"

    not_my_job_block = f"\nIMPORTANT — NOT YOUR JOB: {not_my_job}\n" if not_my_job else ""

    return f"""You are {boss_config['name']}, a brutal CV critic.

Your obsession: {boss_config['obsession']}
Your personality: {boss_config['personality']}

Tone instruction: {tone}

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
        content.append({
            "type": "text",
            "text": f"[PRIOR SUBMISSION HISTORY — same user]\n{history_text}\n\nAcknowledge improvements from prior versions. Do not repeat attacks on issues already fixed."
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
