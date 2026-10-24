from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Brand, BrandRule


def seed_sample_data(db: Session) -> Brand:
    brand = db.scalar(select(Brand).where(Brand.name == "NovaTech"))
    if brand:
        return brand
    brand = Brand(name="NovaTech", description="NovaTech makes practical, reliable consumer technology with clear, evidence-led communication.")
    db.add(brand)
    db.flush()
    rules = [
        ("PREFERRED_TERM", "user", "customer", "Low", "Prefer customer-first terminology."),
        ("BANNED_TERM", "cheap", "affordable", "High", "Avoid language that undermines product quality."),
        ("PROMOTIONAL_CLAIM", "number one", "Add substantiation or remove the claim.", "High", "Comparative leadership claims require evidence."),
        ("PROMOTIONAL_CLAIM", "100% guaranteed", "Describe the specific, supportable commitment.", "High", "Absolute guarantees require approved substantiation."),
        ("PROMOTIONAL_CLAIM", "best in the world", "Add substantiation or remove the claim.", "High", "Superlative claims require evidence."),
        ("APPROVED_FACT", "battery life is 10 hours", "", "High", "Approved product specification."),
        ("TONE", "professional and clear", "", "Low", "Write in a professional, clear tone."),
    ]
    for category, value, replacement, severity, explanation in rules:
        db.add(BrandRule(brand_id=brand.id, category=category, value=value, replacement=replacement, severity=severity, explanation=explanation))
    db.commit()
    db.refresh(brand)
    return brand


if __name__ == "__main__":
    from .database import Base, SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_sample_data(session)
    print("NovaTech sample brand is ready.")