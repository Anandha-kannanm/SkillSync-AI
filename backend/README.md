# SkillSync AI backend

## Run locally

From the project root, activate the existing backend environment and run:

```powershell
.\backend\venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload
```

Alternatively, run `uvicorn main:app --reload` from `backend`.

The API creates `backend/skillsync.db` automatically. Set `SKILLSYNC_DB_PATH` to use another SQLite file. Copy `.env.example` to `.env` and add a Gemini API key to enable the AI tutor and career analysis. Without a key, interactive lessons and assessments still work; the tutor reports that it is unavailable.

## Accounts and security

- Passwords are stored as salted scrypt hashes; plaintext passwords are never saved.
- Sessions use random, server-stored opaque tokens in `HttpOnly`, `SameSite=Lax` cookies. Set `APP_ENV=production` behind HTTPS to enable the `Secure` cookie flag.
- Signup/login check the request origin; authenticated state-changing requests require both an allow-listed `Origin` and a session-bound CSRF token.
- Configure production frontend origins with `FRONTEND_ORIGINS`; do not use wildcard origins with credentials.
- Email verification and account recovery are not configured in this MVP. Add a verified email/reset flow before relying on account recovery in production.
- The default SQLite database is for a single-instance deployment. Use a managed database and a durable secret/session strategy before horizontal scaling or handling production accounts.
- Final assessment answers are checked on the server. A certificate is issued only when all six lessons are recorded and the best assessment result is 100%.

The Vite development server proxies `/api` to `http://127.0.0.1:8000` by default. Set `API_PROXY_TARGET` to use another local API port. Configure the production web host to serve the frontend and proxy `/api` to this backend on the same origin.

## Languages

The frontend defaults to English and lets each learner switch between English and Tamil. The selection is saved in browser storage and is included in AI tutor and career-analysis requests so generated responses use the selected language.

## Tests

From `backend`, run:

```powershell
.\venv\Scripts\python.exe -m unittest test_main
```
