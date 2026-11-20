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
- Login's remember-me option controls whether the browser cookie persists; server-side sessions expire after at most seven days.
- Signup/login check the request origin; authenticated state-changing requests require both an allow-listed `Origin` and a session-bound CSRF token.
- Configure production frontend origins with `FRONTEND_ORIGINS`; do not use wildcard origins with credentials.
- Email verification and account recovery are not configured in this MVP. Add a verified email/reset flow before relying on account recovery in production.
- The default SQLite database is for a single-instance deployment. Use a managed database and a durable secret/session strategy before horizontal scaling or handling production accounts.
- Final assessment answers are checked on the server. A certificate is issued only when all six lessons are recorded and the best assessment result is 100%.

The Vite development server proxies `/api` to `http://127.0.0.1:8000` by default. Set `API_PROXY_TARGET` to use another local API port. Configure the production web host to serve the frontend and proxy `/api` to this backend on the same origin.

## Languages

The frontend defaults to English and lets each learner switch between English and Tamil. The selection is saved in browser storage and is included in AI tutor and career-analysis requests so generated responses use the selected language.

The authenticated floating career assistant uses `POST /api/ai/career-assistant`. Requests require the active session and CSRF token. Like the AI tutor and skill analysis, the assistant requires `GEMINI_API_KEY`; if it is not configured, the API reports that AI assistance is unavailable rather than returning a demo answer.

## India jobs

The job portal adds a searchable company-career directory, private learner job profiles, deterministic profile matching, saved jobs, user-reported application tracking, and match alerts. It uses the existing FastAPI and SQLite stack; existing account and learning APIs are unchanged.

No job vacancies are seeded, and no third-party job feed is configured. Public results include only listings an administrator explicitly verifies with a future expiry date. The backend marks expired postings as expired when job and admin listing endpoints are read. Until an authorized feed is configured, administrators must enter a posting's official source and application URLs and verify it before publication.

To allow administrators, add their account email addresses to `JOB_ADMIN_EMAILS` in `backend\.env` (comma-separated), then restart the backend. Do not send API keys or secrets through chat or place them in frontend code. Admin writes still require the authenticated session, allowed origin, and CSRF token. Administrators can manage company links, categories, postings, and user account access; disabling a user revokes that account's sessions, and an administrator cannot disable their own account. Job/profile records are scoped to the signed-in user; optional pasted resume text is private profile data and can be cleared by saving an empty value.

The portal exposes:

- Public company and verified listing search: `GET /api/jobs/companies`, `GET /api/jobs`, and `GET /api/jobs/categories`.
- Authenticated profile, recommendations, alerts, saved jobs, and application tracking under `/api/jobs`.
- Administrator-only company/listing management and verification under `/api/admin/jobs`.

Match percentages use an explainable weighted comparison of entered skills or pasted resume text, education, experience, location, and career interests. They are estimates, not hiring guarantees. Marking an application is a learner-reported tracking action; SkillSync does not submit applications. There is no PDF resume parser, automatic job-feed refresh, or push-notification service in this iteration.

## Tests

From `backend`, run:

```powershell
.\venv\Scripts\python.exe -m unittest test_main
```
