from io import BytesIO

import pytest
from docx import Document as WordDocument
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, main
from app.database import Base


@pytest.fixture
def client(monkeypatch):
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_sessions = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(database, "engine", test_engine)
    monkeypatch.setattr(database, "SessionLocal", test_sessions)
    monkeypatch.setattr(main, "engine", test_engine)
    monkeypatch.setattr(main, "SessionLocal", test_sessions)
    with TestClient(main.app) as test_client:
        yield test_client
    Base.metadata.drop_all(test_engine)


def submit(client, text):
    brand = client.get("/api/brands").json()[0]
    return client.post("/api/analyze", data={
        "brand_id": brand["id"],
        "title": "Launch page",
        "content_type": "Website",
        "text": text,
    })


def test_clean_content_has_no_findings(client):
    response = submit(client, "NovaTech makes reliable devices for customers.")
    assert response.status_code == 201
    assert response.json()["findings"] == []
    assert response.json()["compliance_score"] == 100


def test_banned_word_and_promotional_claim_are_detected(client):
    response = submit(client, "This cheap device is number one.")
    findings = response.json()["findings"]
    assert response.status_code == 201
    assert {finding["category"] for finding in findings} == {"BANNED_TERM", "PROMOTIONAL_CLAIM"}
    assert all(finding["source_rule"] for finding in findings)
    assert all(finding["start_position"] is not None for finding in findings)


def test_unsupported_claim_is_detected_independently(client):
    response = submit(client, "Our device is the best in the world.")
    assert response.status_code == 201
    assert [item["category"] for item in response.json()["findings"]] == ["PROMOTIONAL_CLAIM"]


def test_json_analysis_request_is_supported(client):
    brand_id = client.get("/api/brands").json()[0]["id"]
    response = client.post("/api/analyze", json={"brand_id": brand_id, "title": "JSON draft", "text": "A reliable product for every customer."})
    assert response.status_code == 201
    assert response.json()["original_content"] == "A reliable product for every customer."


def test_tone_heuristic_is_explicit_and_uncertain(client):
    response = submit(client, "Hey, this is super useful!!")
    findings = [item for item in response.json()["findings"] if item["category"] == "TONE"]
    assert findings
    assert all("Needs human review" in item["explanation"] for item in findings)


def test_product_fact_conflict_is_marked_for_human_review(client):
    response = submit(client, "The battery life is 8 hours.")
    finding = next(item for item in response.json()["findings"] if item["category"] == "FACT_CONFLICT")
    assert "Needs human review" in finding["explanation"]
    assert finding["confidence"] < 1
    assert finding["matched_text"] == "8 hours"
    assert response.json()["original_content"][finding["start_position"]:finding["end_position"]] == "8 hours"


def test_empty_content_is_rejected(client):
    brand_id = client.get("/api/brands").json()[0]["id"]
    response = client.post("/api/analyze", data={"brand_id": brand_id, "title": "Empty", "text": "   "})
    assert response.status_code == 422


def test_invalid_upload_is_rejected(client):
    brand_id = client.get("/api/brands").json()[0]["id"]
    response = client.post("/api/analyze", data={"brand_id": brand_id, "title": "Bad file"}, files={"file": ("notes.txt", b"text", "text/plain")})
    assert response.status_code == 415
    corrupt = client.post("/api/analyze", data={"brand_id": brand_id, "title": "Corrupt file"}, files={"file": ("broken.docx", b"not a Word document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert corrupt.status_code == 400


def test_docx_text_is_extracted_and_analyzed(client):
    word_file = BytesIO()
    document = WordDocument()
    document.add_paragraph("This cheap device is ready for customers.")
    document.save(word_file)
    brand_id = client.get("/api/brands").json()[0]["id"]
    response = client.post("/api/analyze", data={"brand_id": brand_id, "title": "DOCX draft"}, files={"file": ("draft.docx", word_file.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert response.status_code == 201
    assert response.json()["original_content"] == "This cheap device is ready for customers."
    assert response.json()["findings"][0]["matched_text"] == "cheap"


def test_review_actions_and_approval_persist_in_history(client):
    document = submit(client, "This cheap device is number one.").json()
    finding_id = document["findings"][0]["id"]
    accepted = client.post(f"/api/documents/{document['id']}/review", json={"action": "ACCEPT_SUGGESTION", "finding_id": finding_id})
    assert accepted.status_code == 200
    assert any(item["review_state"] == "ACCEPTED" for item in accepted.json()["findings"])
    rejected = client.post(f"/api/documents/{document['id']}/review", json={"action": "REJECT_SUGGESTION", "finding_id": document["findings"][1]["id"]})
    assert rejected.status_code == 200
    commented = client.post(f"/api/documents/{document['id']}/review", json={"action": "COMMENT", "comment": "Please verify the campaign wording."})
    assert commented.status_code == 200
    approved = client.post(f"/api/documents/{document['id']}/review", json={"action": "APPROVE"})
    assert approved.json()["status"] == "APPROVED"
    assert approved.json()["approved_at"] is not None
    history = client.get(f"/api/documents/{document['id']}").json()
    assert history["original_content"] == "This cheap device is number one."
    assert len(history["actions"]) == 4
    assert history["actions"][2]["comment"] == "Please verify the campaign wording."


def test_needs_changes_is_not_approved(client):
    document = submit(client, "A clear product description for customers.").json()
    client.post(f"/api/documents/{document['id']}/review", json={"action": "NEEDS_CHANGES"})
    response = client.post(f"/api/documents/{document['id']}/review", json={"action": "APPROVE"})
    assert response.status_code == 409
    assert client.get(f"/api/documents/{document['id']}").json()["status"] == "NEEDS_CHANGES"