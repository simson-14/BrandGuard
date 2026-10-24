import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


DATABASE_PATH = Path(os.environ.get(
    "BRANDGUARD_DATABASE",
    Path(__file__).resolve().parents[1] / "brandguard.db",
))

SAMPLE_RULES = [
    {"type": "preferred", "term": "client", "description": 'Prefer "customer" when referring to people who use our products.', "replacement": "customer", "severity": "Low"},
    {"type": "banned", "term": "cheap", "description": 'Do not describe NovaTech products as "cheap".', "replacement": "affordable", "severity": "Medium"},
    {"type": "tone", "term": "awesome|gonna|kinda|dude", "description": "Use a professional, clear tone; avoid casual slang.", "replacement": "Use professional, precise wording.", "severity": "Low"},
    {"type": "claim", "term": "number one", "description": 'Do not make unsupported "number one" claims.', "replacement": "Substantiate or remove the claim.", "severity": "High"},
    {"type": "claim", "term": "100% guaranteed", "description": 'Do not use unsupported "100% guaranteed" claims.', "replacement": "Substantiate or remove the claim.", "severity": "High"},
    {"type": "claim", "term": "best in the world", "description": 'Do not make unsupported "best in the world" claims.', "replacement": "Substantiate or remove the claim.", "severity": "High"},
    {"type": "fact", "term": "NovaTech approved product facts: no numerical or dated product facts have been configured.", "description": "Numbers and dates in product claims must be verified against approved facts.", "replacement": "Verify numbers and dates before publishing.", "severity": "Medium"},
]


@contextmanager
def connect():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database():
    with connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS brands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                term TEXT NOT NULL,
                description TEXT NOT NULL,
                replacement TEXT NOT NULL DEFAULT '',
                severity TEXT NOT NULL DEFAULT 'Medium'
            );
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand_id INTEGER NOT NULL REFERENCES brands(id),
                title TEXT NOT NULL,
                content_type TEXT NOT NULL,
                content TEXT NOT NULL,
                analysis TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Awaiting Review',
                reviewer_comments TEXT NOT NULL DEFAULT '',
                submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
                approval_at TEXT
            );
            CREATE TABLE IF NOT EXISTS review_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                issue_id TEXT,
                action TEXT NOT NULL,
                comment TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)
        brand = db.execute("SELECT id FROM brands WHERE name = 'NovaTech'").fetchone()
        if not brand:
            cursor = db.execute(
                "INSERT INTO brands(name, description) VALUES (?, ?)",
                ("NovaTech", "Technology that helps people do their best work."),
            )
            brand_id = cursor.lastrowid
            db.executemany(
                "INSERT INTO rules(brand_id, type, term, description, replacement, severity) VALUES (?, ?, ?, ?, ?, ?)",
                [(brand_id, r["type"], r["term"], r["description"], r["replacement"], r["severity"]) for r in SAMPLE_RULES],
            )


def row_dict(row):
    return dict(row) if row else None


def document_dict(row):
    item = dict(row)
    item["analysis"] = json.loads(item["analysis"])
    return item
