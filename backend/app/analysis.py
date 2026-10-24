import re
from uuid import uuid4


SEVERITY_WEIGHTS = {"High": 15, "Medium": 7, "Low": 3}
TOKEN_PATTERN = re.compile(
    r"\b(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?%?|\d{4}-\d{1,2}-\d{1,2}|"
    r"\d{1,2}/\d{1,2}/\d{2,4}|"
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?)\b",
    re.IGNORECASE,
)


def _finding(rule, category, severity, matched, explanation, suggestion,
             confidence, start=None, end=None, needs_review=False):
    return {
        "id": str(uuid4()),
        "category": category,
        "severity": severity,
        "matched_text": matched,
        "explanation": explanation,
        "source_rule": rule["description"],
        "suggestion": suggestion,
        "confidence": confidence,
        "start": start,
        "end": end,
        "needs_human_review": needs_review,
        "suggestion_status": "pending",
    }


def _matches(text, term):
    if not term:
        return []
    pattern = re.compile(r"(?<!\w)" + re.escape(term) + r"(?!\w)", re.IGNORECASE)
    return list(pattern.finditer(text))


def analyze_content(content, rules):
    findings = []
    approved_facts = " ".join(
        rule["term"] for rule in rules if rule["type"] == "fact"
    ).casefold()

    for rule in rules:
        rule_type = rule["type"]
        if rule_type in {"banned", "preferred", "claim"}:
            for match in _matches(content, rule["term"]):
                if rule_type == "banned":
                    findings.append(_finding(
                        rule, "Banned language", rule["severity"], match.group(),
                        f'The phrase "{match.group()}" is not approved for this brand.',
                        rule.get("replacement") or "Remove or replace this phrase.",
                        0.99, match.start(), match.end(),
                    ))
                elif rule_type == "preferred":
                    findings.append(_finding(
                        rule, "Preferred terminology", rule["severity"], match.group(),
                        f'Use the approved term "{rule.get("replacement")}" instead.',
                        rule.get("replacement") or "Use the preferred brand terminology.",
                        0.98, match.start(), match.end(),
                    ))
                else:
                    findings.append(_finding(
                        rule, "Promotional claim", rule["severity"], match.group(),
                        "This promotional claim requires substantiation and is not approved by a configured brand fact.",
                        "Add an approved source or remove/rephrase the claim.",
                        0.96, match.start(), match.end(), True,
                    ))
        elif rule_type == "tone":
            for term in filter(None, (part.strip() for part in rule["term"].split("|"))):
                for match in _matches(content, term):
                    findings.append(_finding(
                        rule, "Tone and style", rule["severity"], match.group(),
                        f'This wording may not match the tone rule: {rule["description"]}',
                        rule.get("replacement") or "Rephrase in a professional, clear tone.",
                        0.82, match.start(), match.end(), True,
                    ))
        elif rule_type == "required":
            if not _matches(content, rule["term"]):
                findings.append(_finding(
                    rule, "Required phrase", rule["severity"], None,
                    f'The required phrase "{rule["term"]}" was not found.',
                    f'Include "{rule["term"]}" where appropriate.',
                    1.0,
                ))
        elif rule_type == "fact":
            for match in TOKEN_PATTERN.finditer(content):
                token = match.group()
                if token.casefold() not in approved_facts:
                    findings.append(_finding(
                        rule, "Fact check", rule["severity"], token,
                        "This number or date could not be matched to an approved brand fact. Verify it before publishing.",
                        "Verify against an approved fact or remove the unsupported detail.",
                        0.65, match.start(), match.end(), True,
                    ))

    findings.sort(key=lambda item: (item["start"] is None, item["start"] or 0))
    deductions = sum(SEVERITY_WEIGHTS[finding["severity"]] for finding in findings)
    score = max(0, 100 - deductions)
    return {
        "score": score,
        "issues": findings,
        "severity_counts": {
            severity: sum(item["severity"] == severity for item in findings)
            for severity in SEVERITY_WEIGHTS
        },
        "score_formula": "100 minus 15 points per High, 7 per Medium, and 3 per Low finding; floored at 0.",
    }
