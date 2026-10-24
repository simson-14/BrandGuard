import re
from dataclasses import dataclass

from ..models import BrandRule


@dataclass
class AnalysisFinding:
    rule_id: int
    category: str
    severity: str
    matched_text: str
    explanation: str
    source_rule: str
    suggested_correction: str
    confidence: float
    start_position: int | None
    end_position: int | None


def _matches_phrase(text: str, phrase: str):
    return re.finditer(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", text, re.IGNORECASE)


def _fact_findings(text: str, rule: BrandRule) -> list[AnalysisFinding]:
    approved = re.search(r"(?P<topic>[a-z][a-z ]{1,40}?)\s+(?:is|of|:)?\s*(?P<number>\d+(?:\.\d+)?)\s*(?P<unit>hours?|days?|months?|years?|gb|mb|%|percent)?", rule.value, re.I)
    if not approved:
        return []
    topic_words = [word for word in approved.group("topic").lower().split() if word not in {"is", "of", "the", "a", "an", "our"}]
    if not topic_words:
        return []
    number = approved.group("number")
    unit = approved.group("unit") or ""
    findings = []
    pattern = re.compile(r"(?P<number>\d+(?:\.\d+)?)(?:\s*(?P<unit>hours?|days?|months?|years?|gb|mb|%|percent))?", re.I)
    for match in pattern.finditer(text):
        if match.group("number") == number and (match.group("unit") or "").lower() == unit.lower():
            continue
        context_start = max(0, match.start() - 50)
        context_end = min(len(text), match.end() + 40)
        context = text[context_start:context_end]
        if any(word in context.lower() for word in topic_words):
            start, end = match.span()
            matched = text[start:end]
            findings.append(AnalysisFinding(
                rule.id, "FACT_CONFLICT", "High", matched,
                f"This product detail differs from the approved fact: {rule.value}. Needs human review.",
                rule.value, f"Verify the claim against: {rule.value}", 0.72, start, start + len(matched),
            ))
    return findings


def analyze_text(text: str, rules: list[BrandRule]) -> list[AnalysisFinding]:
    findings: list[AnalysisFinding] = []
    for rule in rules:
        if not rule.enabled:
            continue
        if rule.category == "APPROVED_FACT":
            findings.extend(_fact_findings(text, rule))
            continue
        if rule.category == "TONE":
            if "professional" in rule.value.lower() or "clear" in rule.value.lower():
                for match in re.finditer(r"\b(?:hey|gonna|wanna|awesome|super)\b|!{2,}", text, re.IGNORECASE):
                    findings.append(AnalysisFinding(
                        rule.id, "TONE", rule.severity, match.group(0),
                        f"This wording may conflict with the configured {rule.value} tone. Needs human review.",
                        rule.value, "Use neutral, specific wording.", 0.68, match.start(), match.end(),
                    ))
            continue
        if rule.category == "REQUIRED_PHRASE":
            if not list(_matches_phrase(text, rule.value)):
                findings.append(AnalysisFinding(
                    rule.id, rule.category, rule.severity, "(required phrase missing)",
                    rule.explanation or "This configured phrase was not found.", rule.value,
                    f"Include '{rule.value}' where appropriate.", 1.0, None, None,
                ))
            continue
        for match in _matches_phrase(text, rule.value):
            if rule.category == "PROMOTIONAL_CLAIM":
                explanation = f"The claim '{match.group(0)}' requires evidence or human review."
                correction = rule.replacement or "Add substantiation or remove the claim."
                confidence = 0.9
            elif rule.category == "PREFERRED_TERM":
                explanation = f"Use the preferred term '{rule.replacement}' for consistent brand language."
                correction = rule.replacement
                confidence = 1.0
            else:
                explanation = rule.explanation or f"'{match.group(0)}' is not approved brand language."
                correction = rule.replacement or "Remove or replace this wording."
                confidence = 1.0
            findings.append(AnalysisFinding(
                rule.id, rule.category, rule.severity, match.group(0), explanation,
                rule.value, correction, confidence, match.start(), match.end(),
            ))
    return sorted(findings, key=lambda finding: (finding.start_position is None, finding.start_position or 0))


def compliance_score(findings: list[AnalysisFinding]) -> int:
    penalties = {"High": 20, "Medium": 10, "Low": 4}
    return max(0, 100 - sum(penalties.get(finding.severity, 0) for finding in findings))