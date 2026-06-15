# DevSecureCoach MVP

## Stack
- Frontend: existing static site preserved in demo.html/index.html/waitlist.html
- Backend: FastAPI + Semgrep + Pydantic

## Run locally
1. python -m venv venv
2. .\venv\Scripts\Activate.ps1
3. pip install -r backend/requirements.txt
4. uvicorn app.main:app --app-dir backend

## Test
- pytest -q

## Deploy
- Frontend: Vercel
- Backend: Render
