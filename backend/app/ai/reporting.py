from __future__ import annotations

import re
from dataclasses import dataclass

from app.models.models import ComplaintPriority


KEYWORDS = {
    "safety": {"fire", "smoke", "injury", "accident", "electric", "shock", "danger", "unsafe"},
    "infrastructure": {"water", "leak", "road", "light", "sewage", "building", "damage", "broken"},
    "service": {"delay", "rude", "support", "staff", "service", "queue", "appointment"},
    "security": {"theft", "threat", "harass", "violence", "unauthorized", "security"},
    "technical": {"server", "login", "error", "app", "network", "payment", "system", "bug"},
}

HIGH_RISK_WORDS = {
    "urgent",
    "critical",
    "danger",
    "injury",
    "fire",
    "smoke",
    "violence",
    "threat",
    "electric",
    "shock",
    "flood",
    "leak",
}

PRIORITY_WEIGHTS = {
    ComplaintPriority.LOW.value: 5,
    ComplaintPriority.MEDIUM.value: 18,
    ComplaintPriority.HIGH.value: 34,
    ComplaintPriority.CRITICAL.value: 52,
}


@dataclass
class AIReport:
    summary: str
    category: str
    risk_score: int
    risk_level: str
    recommended_priority: str
    recommended_actions: list[str]
    live_monitoring: list[str]
    evidence_review: list[str]


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _category(words: set[str]) -> str:
    scores = {
        category: len(words.intersection(category_words))
        for category, category_words in KEYWORDS.items()
    }
    best = max(scores, key=scores.get)
    return best if scores[best] else "general"


def _risk_level(score: int) -> str:
    if score >= 75:
        return "critical"
    if score >= 52:
        return "high"
    if score >= 28:
        return "medium"
    return "low"


def _recommended_priority(score: int) -> str:
    if score >= 75:
        return ComplaintPriority.CRITICAL.value
    if score >= 52:
        return ComplaintPriority.HIGH.value
    if score >= 28:
        return ComplaintPriority.MEDIUM.value
    return ComplaintPriority.LOW.value


def analyze_case(
    title: str,
    description: str,
    priority: str,
    voice_transcript: str | None = None,
    photo_count: int = 0,
    video_count: int = 0,
    has_audio: bool = False,
) -> AIReport:
    source_text = " ".join(
        value for value in [title, description, voice_transcript or ""] if value
    )
    words = _tokens(source_text)
    high_risk_hits = sorted(words.intersection(HIGH_RISK_WORDS))
    category = _category(words)

    score = PRIORITY_WEIGHTS.get(priority, 18)
    score += min(len(high_risk_hits) * 10, 35)
    score += min(photo_count * 4, 12)
    score += min(video_count * 6, 18)
    score += 6 if has_audio else 0
    score = min(score, 100)
    risk_level = _risk_level(score)

    first_sentence = re.split(r"(?<=[.!?])\s+", description.strip())[0] if description else title
    summary = first_sentence[:220] if first_sentence else "Case requires review."

    actions = [
        "Verify reporter details and confirm current impact.",
        "Review attached evidence before changing status.",
        "Assign a responder and set the first response target.",
    ]
    if risk_level in {"high", "critical"}:
        actions.insert(0, "Escalate to an admin or emergency responder immediately.")
    if category == "technical":
        actions.append("Capture system logs, screenshots, timestamps, and affected user count.")
    if category == "safety":
        actions.append("Secure the area and document any immediate safety risk.")

    live_monitoring = [
        "Watch for repeated status changes without evidence updates.",
        "Flag the case if no responder update is posted after assignment.",
        "Prioritize cases with high-risk language or new media evidence.",
    ]
    if high_risk_hits:
        live_monitoring.append(f"Detected risk terms: {', '.join(high_risk_hits[:6])}.")

    evidence_review = []
    if photo_count:
        evidence_review.append(f"{photo_count} photo attachment(s) available for visual inspection.")
    if video_count:
        evidence_review.append(f"{video_count} video attachment(s) available for incident timeline review.")
    if has_audio:
        evidence_review.append("Audio evidence or voice report is attached.")
    if voice_transcript:
        evidence_review.append("Voice transcript was included in the AI analysis.")
    if not evidence_review:
        evidence_review.append("No media evidence attached yet.")

    return AIReport(
        summary=summary,
        category=category,
        risk_score=score,
        risk_level=risk_level,
        recommended_priority=_recommended_priority(score),
        recommended_actions=actions,
        live_monitoring=live_monitoring,
        evidence_review=evidence_review,
    )


def analyze_voice_transcript(transcript: str) -> AIReport:
    return analyze_case(
        title="Voice report",
        description=transcript,
        priority=ComplaintPriority.MEDIUM.value,
        voice_transcript=transcript,
        has_audio=True,
    )
