# Deployment Notes

## Backend (Render)

1. Set the Render service to use the root Dockerfile or the `render.yaml` file.
2. Set environment variables from `.env.example`.
3. Health check URL: `/health`.
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000 --app-dir backend`.

## Frontend (Vercel / GitHub Pages)

1. Deploy the static files in `frontend/`.
2. Set `window.__DEVSECURE_API_BASE__` in the page or replace `meta[name="devsecurecoach-api-url"]` with the production backend URL.
3. Use the deployed Render backend URL for API calls.

## Semgrep

- The scanner depends on the `semgrep` executable in PATH.
- Render and Docker images must include `semgrep` via `backend/requirements.txt`.
- The current implementation already uses `shutil.which("semgrep")` and falls back to `semgrep.exe` on Windows.
