"""
Calls the LLM with the assembled boss evaluation payload.
Returns parsed structured response.
"""
import json
import logging
import re
from .client import get_llm_client
from .prompt_builder import build_system_prompt, build_user_message

logger = logging.getLogger(__name__)


class EvaluationError(Exception):
    pass


def evaluate_resume(
    boss_config: dict,
    rudeness_level: int,
    extracted_text: str,
    image_base64_list: list[str],
    prior_versions: list[dict],
    reference_items: list[dict],
    language: str = "en",
) -> dict:
    """
    Call LLM and return parsed boss evaluation result.
    Raises EvaluationError on failure.
    """
    system_prompt = build_system_prompt(boss_config, rudeness_level, reference_items, language=language)
    user_content = build_user_message(extracted_text, image_base64_list, prior_versions)

    try:
        client, model = get_llm_client()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
            max_tokens=1024,
            timeout=60,
        )
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise EvaluationError(f"LLM call failed: {e}")

    raw = response.choices[0].message.content
    logger.debug(f"Raw LLM response: {raw}")

    try:
        clean = raw.strip()
        # Strip <think>...</think> blocks (Qwen3 chain-of-thought)
        clean = re.sub(r"<think>.*?</think>", "", clean, flags=re.DOTALL).strip()
        # Strip markdown code fences if present
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        # Extract first {...} JSON object in case of trailing text
        match = re.search(r"\{.*\}", clean, re.DOTALL)
        if match:
            clean = match.group(0)
        # Fix common LLM JSON quirks that Python's json module rejects:
        # 1. Trailing commas before ] or }  e.g. ["a", "b",]
        clean = re.sub(r",\s*([}\]])", r"\1", clean)
        # 2. Single-quoted strings → double-quoted  e.g. {'key': 'val'}
        clean = re.sub(r"(?<![\\])'", '"', clean)
        result = json.loads(clean.strip())
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON: {e}\nRaw: {raw}")
        raise EvaluationError(f"LLM returned invalid JSON: {e}")

    required_fields = ["roast_opening", "why_it_fails", "top_issues", "fix_direction", "mood", "mood_level", "approved"]
    for field in required_fields:
        if field not in result:
            raise EvaluationError(f"LLM response missing field: {field}")

    result["raw"] = raw
    return result
