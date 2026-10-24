# BrandGuard

BrandGuard is a local-first brand governance workspace for checking marketing copy against explicit brand rules. The stack is React, Vite, Tailwind CSS, FastAPI, SQLAlchemy, and SQLite. NovaTech is created automatically on the first API start with a small working rulebook.

## Features

- Dashboard metrics, recent reviews, and stored finding-category counts.
- Brand profiles and CRUD for banned/preferred terms, claims, approved facts, required phrases, and tone rules.
- Paste content or upload a `.docx` file (5 MB maximum); empty, oversized, and invalid inputs receive clear errors.
- Deterministic analysis with matched text, character offsets, severity, confidence, source rule, and a suggested correction.
- Accept/reject suggestions, add reviewer comments, request changes, and explicitly approve a document. Review actions and approval time are persisted.
- Review history and reports calculated from stored records.
- JSON and multipart analysis requests are supported by `POST /api/analyze`.

## Requirements

- Python 3.10 or later
- Node.js 20 or later and npm
- Docker Desktop is optional for the containerized setup

## Run Locally

1. Start the API from the repository root:

   ```powershell
   cd backend
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   py -m pip install -r requirements.txt
   py -m uvicorn app.main:app --reload
   ```

   On PowerShell systems that block script activation, run `.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.venv\Scripts\python.exe -m uvicorn app.main:app --reload` instead. The API listens on `http://localhost:8000`; its OpenAPI UI is at `/docs`.

2. In a second terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173`. The frontend calls `http://localhost:8000/api` by default.

The SQLite database is created as `backend/brandguard.db` when the API starts. Set `DATABASE_URL` to change its location. Set comma-separated `CORS_ORIGINS` when hosting the frontend on another origin. The optional frontend build variable is `VITE_API_URL`.

## Tests and Build

From `backend/` run:

```powershell
py -m pytest -q
```

From `frontend/` run:

```powershell
npm run build
```

Backend tests use an isolated in-memory SQLite database. They cover clean content, banned and preferred language, unsupported claims, an approved-fact mismatch, tone heuristics, JSON input, empty text, invalid uploads, suggestion decisions, comments, approval, and history retrieval.

## API Surface

- `GET /api/health`
- `GET, POST /api/brands`
- `GET, POST /api/rules`; `PUT, DELETE /api/rules/{rule_id}`
- `POST /api/analyze`
- `GET /api/documents`; `GET /api/documents/{document_id}`
- `POST /api/documents/{document_id}/review`
- `GET /api/dashboard/stats`
- `GET /api/reports`

## Architecture

- `backend/app/main.py` owns REST routes, startup schema creation, and sample-data initialization.
- `backend/app/models.py` defines brands, rules, documents, findings, and review actions. `database.py` provides SQLAlchemy sessions.
- `backend/app/services/analyzer.py` evaluates configured terms and claims, required phrases, basic tone heuristics, and numeric product facts. Every finding retains a rule source; a fact mismatch and tone heuristic are explicitly marked “Needs human review.”
- `backend/app/services/document_parser.py` accepts DOCX only, limits bytes before parsing, and extracts paragraph text without executing uploaded content.
- `frontend/src/services/api.js` is the REST client. `frontend/src/App.jsx` contains the navigation and API-connected product views; `styles.css` provides responsive styling.
- The Docker Compose setup serves the UI through nginx, the API through Uvicorn, and persists SQLite in a named volume.

## Scoring and Review Semantics

Every analysis starts at 100. Each high-severity finding subtracts 20 points, each medium finding 10, and each low finding 4; the result is floored at 0. Scores do not assert legal, regulatory, factual, or publication readiness. Findings are deterministic rule matches or named heuristics, not AI-generated judgments. Approval is only recorded by the explicit approve action; requesting changes clears the approval timestamp and blocks approval until a new analysis is created.

## Deployment

For a local container deployment, run from the repository root:

```powershell
docker compose up --build
```

The UI is served at `http://localhost:8080`, the API at `http://localhost:8000`, and data persists in the `brandguard-data` Docker volume. For a hosted deployment, set `CORS_ORIGINS` to the exact frontend origin, set `VITE_API_URL` at frontend build time to the public API base URL, persist `/data` for SQLite, and terminate TLS at a trusted reverse proxy. This project does not include authentication, authorization, tenant isolation, or managed database migrations; do not expose it publicly with sensitive content until those controls are added.

## Known Limitations

- No authentication, roles, multi-tenant access control, or user identity; reviewer actions are attributed to the local “Marketing team” UI label only.
- Tone detection is a deliberately small word/punctuation heuristic and can be wrong; it asks for human review. It does not perform semantic sentiment analysis.
- Approved-fact conflict detection compares nearby numeric mentions to a simple configured topic/value format. It can miss paraphrases or flag unrelated figures; all such results require human review.
- Findings are stored as a snapshot at analysis time. Rule edits do not retroactively rewrite old reviews.
- DOCX paragraph text is extracted; tables, images, PDFs, and other formats are not analyzed.
- SQLite is suitable for local development and small demos, not concurrent production workloads or managed backups.
- The UI does not apply accepted suggestions to rewrite the submitted document; it records the reviewer decision.

## Proposed Round 3 Improvements

1. Add image and PDF brand-compliance checking with OCR and explicit source references.
2. Expand recurring-violation analytics with date ranges, trend comparisons, and rule-level drill-downs.
3. Add document version comparison and a complete team approval workflow with authenticated users and role-based permissions.