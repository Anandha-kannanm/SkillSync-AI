# SkillSync AI

SkillSync AI is a career-learning platform that helps learners explore IT career paths, build a personalized learning plan, and track their progress. The frontend is built with React and Vite. Its API and account features are provided by a FastAPI backend.

## Features

- Browse, search, and filter career roadmaps.
- Get an AI-generated skills analysis and learning recommendations for a target career.
- Create an account and sign in to save learning progress.
- Study lessons, take course assessments, and track courses from a personal dashboard.
- Earn a course certificate after completing all lessons and achieving 100% on the assessment.
- Switch the interface between English and Tamil.
- Ask the AI tutor questions about lessons (requires a Gemini API key).
- Ask the authenticated AI career assistant for English or Tamil guidance (requires a Gemini API key).
- Browse an India-wide company-career directory and search admin-verified job postings.
- Save jobs, track applications manually, set matching preferences, and receive non-repeating match alerts.
- Use the responsive landing page to navigate existing learning features and identify planned modules.
- Password recovery is not configured; the forgot-password page explains this instead of claiming to send an email.

## Technology

- Frontend: React, Vite, and JavaScript
- Backend: Python, FastAPI, and SQLite
- AI features: Google Gemini API (optional)

## Prerequisites

- Node.js and npm. Vite 8 requires Node.js 20.19+ or 22.12+.
- Python 3.11 or later.
- A Gemini API key only if you want to use AI skill analysis and the AI tutor.

## Run locally on Windows

Run the backend and frontend in two separate PowerShell terminals. First, make sure each terminal is in the project root: the `SkillSync-AI` folder containing both `backend` and `frontend`. If you opened PowerShell in the parent `SkillSync AI` folder, enter the project folder first:

```powershell
Set-Location "C:\Users\USER\Documents\SkillSync AI\SkillSync-AI"
Test-Path .\backend\main.py
```

`Test-Path` should print `True`. Do not create `backend\venv` from the parent folder; that would create a different environment outside this project.

### 1. Set up and start the backend

Create the virtual environment and install the backend packages once, from the project root:

```powershell
python -m venv backend\venv
.\backend\venv\Scripts\python.exe -m pip install fastapi uvicorn python-dotenv google-genai
```

If `backend\venv` already exists and its `python.exe` works, skip the environment creation command and install packages only if needed.

Create a backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

If `backend\.env` already exists, do not overwrite it; open it and edit the existing file instead.

Open `backend\.env` and add your Gemini API key to `GEMINI_API_KEY` if you want AI features. The key is optional; the roadmaps, lessons, and assessments can still be used without it.

Start the API server from the project root:

```powershell
.\backend\venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Keep this terminal open while using the website. Wait for `Application startup complete` and leave Uvicorn running; if the terminal shows `Shutting down`, the backend has stopped. The API runs at `http://127.0.0.1:8000`. You can check its health at `http://127.0.0.1:8000/api/health` and view the interactive API documentation at `http://127.0.0.1:8000/api/docs`.

If port 8000 is unavailable or Windows reports `WinError 10013`, start the backend on port 8001 instead:

```powershell
.\backend\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001
```

### 2. Install and start the frontend

Open a second PowerShell terminal, enter the project root, and then move into `frontend`:

```powershell
Set-Location "C:\Users\USER\Documents\SkillSync AI\SkillSync-AI\frontend"
npm install
```

For the default backend port 8000, start Vite in this terminal:

```powershell
npm run dev
```

If you started the backend on port 8001, set the Vite proxy target in this same frontend terminal before starting Vite instead:

```powershell
$env:API_PROXY_TARGET = "http://127.0.0.1:8001"
npm run dev
```

For port 8000, leave `API_PROXY_TARGET` unset; that is the default. Open the local URL printed by Vite, usually `http://localhost:5173`. Keep both backend and frontend terminals open while using the app. Vite forwards `/api` requests to the backend. If you change the backend port or proxy target, stop and restart Vite so it picks up the new setting.

## Environment configuration

The backend reads these optional settings from `backend\.env`:

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Enables AI analysis and tutoring. | Empty (AI features are unavailable) |
| `GEMINI_MODEL` | Gemini model used by the AI features. | `gemini-3.5-flash` |
| `APP_ENV` | Set to `production` when deploying behind HTTPS. | `development` |
| `SKILLSYNC_DB_PATH` | SQLite database file location. | `backend/skillsync.db` |
| `FRONTEND_ORIGINS` | Comma-separated list of allowed frontend origins. | Local development origins |
| `JOB_ADMIN_EMAILS` | Comma-separated account emails allowed to manage and verify company/job listings. | Empty (admin routes disabled) |

The frontend's Vite development proxy can be pointed to another backend URL with `API_PROXY_TARGET`.

## Useful frontend commands

Run these commands from the `frontend` folder:

```powershell
npm run dev       # Start the development server
npm run build     # Create a production build in frontend\dist
npm run preview   # Preview the production build locally
npm run lint      # Run Oxlint
```

## Run backend tests

From the project root:

```powershell
Set-Location backend
.\venv\Scripts\python.exe -m unittest test_main
```

## Project structure

```text
SkillSync-AI/
├── backend/
│   ├── main.py                 # FastAPI API, authentication, and learning features
│   ├── job_platform.py         # Company directory, verified jobs, matching, and admin APIs
│   ├── test_main.py            # Backend tests
│   ├── .env.example            # Example backend configuration
│   └── skillsync.db            # Local SQLite database (created automatically)
└── frontend/
    ├── src/
    │   ├── App.jsx             # Home page and skill analysis interface
    │       ├── JobsPlatform.jsx    # Company search, verified jobs, profile, and admin UI
    │   ├── CoursePlatform.jsx  # Sign-in, dashboard, and course pages
    │   ├── LearningLesson.jsx  # Lesson experience
    │   ├── roadmaps.js         # Career roadmap data
    │   ├── learningResources.js# Lesson content
    │   └── i18n.js             # English and Tamil translations
    ├── package.json
    └── vite.config.js          # Development server and API proxy
```

## How the project works

SkillSync AI is a small full-stack web application. The browser displays the React frontend, while the FastAPI backend handles accounts, saved course progress, assessments, certificates, and requests to Gemini. SQLite stores account and learning records on the backend machine.

```text
Learner's browser
    │
    ├── React pages and local roadmap/lesson content
    │
    └── /api requests
          │
          ├── Vite proxy during local development
          │
          └── FastAPI backend
                ├── SQLite: users, sessions, lesson progress, assessment attempts
                └── Gemini API: optional AI skill analysis and lesson tutoring
```

In local development, the browser loads the frontend from Vite, usually at `http://localhost:5173`. Requests whose path begins with `/api` are forwarded by Vite to `http://127.0.0.1:8000`. The browser does not connect directly to SQLite or Gemini. The Gemini API key stays in the backend environment and is never needed by the frontend.

## Learner workflow

### 1. Explore career paths

The home page displays career roadmaps defined in `frontend/src/roadmaps.js`. Learners can search the roadmap titles, descriptions, categories, milestone titles, details, and topics, or filter by category. Selecting a roadmap opens its course page.

The roadmap catalogue is authored in the frontend. The backend recognizes supported course IDs and handles saved progress and assessments for those courses. The AI-generated skill analysis is a separate recommendation; it does not automatically create or modify a roadmap or enroll the learner.

### 2. Optionally request a skill analysis

On the home page, the learner enters a target career and current skills and submits the form. The frontend sends those values and the selected language to `POST /api/analyze`. The backend asks Gemini to return strengths, missing skills, a learning order, roadmap suggestions, and project ideas.

This feature requires `GEMINI_API_KEY`. Without it, the backend returns an AI-not-configured error. The analysis is displayed on the current page; it is not saved to the learner's account.

### 3. Create an account or sign in

Learners need an account to save course progress. Sign-up collects a name, email, and password. Sign-in uses the email and password. The backend normalizes email addresses, validates inputs, hashes passwords with scrypt, and creates a session.

The session is represented by a random `HttpOnly` cookie, so frontend JavaScript cannot read the session token. The frontend obtains a CSRF token from the authenticated-user response and sends it with state-changing requests. Sessions last up to seven days. Signing out revokes the stored session and clears the cookie.

### 4. Work through a course

When a signed-in learner opens a course, the frontend requests the course's saved progress. The course contains six ordered milestones. Each lesson includes a concept explanation, a worked example, practice, and a short knowledge check.

- A correct answer to a lesson's knowledge check marks that lesson complete.
- The frontend sends the completion to the backend, which stores it in SQLite.
- Lessons unlock in order. The backend also enforces that the previous lesson must be complete before a later one can be recorded.
- The course page shows completed milestones and overall progress. When the learner returns, the frontend opens the first incomplete lesson (or the final lesson if all are complete).
- For HTML/CSS topics, the practice area offers an editable preview in a sandboxed iframe with scripts disabled. Other lessons offer a practice note. Practice notes are held only in the current page and are not saved to the account.

### 5. Ask the lesson tutor (optional)

The signed-in learner can ask a question from the current course lesson. The frontend sends the question, selected language, lesson title, and lesson context to `POST /api/ai/tutor`. The backend uses Gemini to provide a beginner-friendly explanation grounded in that lesson.

The tutor requires both a signed-in session and `GEMINI_API_KEY`. If the key is missing or Gemini cannot respond, the interface displays an error. AI responses are not stored as course progress.

### 6. Complete the final assessment

The final assessment becomes available only after all six lessons are recorded as complete. The frontend fetches questions from `GET /api/courses/{course_id}/assessment`. The API does not include correct answers in the question response.

When the learner submits every answer, the frontend sends them to `POST /api/courses/{course_id}/assessment`. The backend validates the answer set and scores it against its own answer key, then saves the attempt and any topics answered incorrectly. Results include the score, percentage, topics to practise, and updated progress. Learners can review the indicated lessons and retake an assessment below 100%.

The dashboard displays each active course's lesson completion and best assessment score. Course progress and attempts are associated with the signed-in account, not just the current browser page.

### 7. Unlock and print a certificate

A certificate is unlocked when both conditions are met:

1. All six course lessons are complete.
2. The learner has achieved a 100% score on at least one assessment attempt.

The backend checks this eligibility before returning certificate details. The course page then displays the learner name, course, completion date, score, and certificate ID. Use **Print / Save as PDF** in the browser to print or save it.

## What is saved, and where

| Information | Where it is handled | Persistence |
| --- | --- | --- |
| Roadmap definitions and lesson content | Frontend source files | Bundled with the application |
| Selected English/Tamil interface language | Browser local storage | Persists in that browser |
| Account name, email, and password hash | Backend SQLite database | Persists on the backend machine |
| Login session and CSRF information | Backend SQLite database and browser cookie | Session expires after up to seven days; logout revokes it |
| Completed lessons and assessment attempts | Backend SQLite database | Persists per account and course |
| AI analysis result | Current home-page state | Not saved to the account |
| AI tutor answer | Current course-page state | Not saved to the account |
| Lesson practice notes | Current lesson component | Temporary; lost when leaving that lesson |
| HTML/CSS playground edits | Current lesson component | Temporary; not submitted to the backend |

The local database is normally `backend/skillsync.db`. The backend creates its tables and database file as needed. Back up the database if you need to preserve local account and progress data.

## Main frontend pages and backend endpoints

| User action | Frontend location | Backend request |
| --- | --- | --- |
| Check whether the API is running | `frontend/src/App.jsx` | `GET /api/health` |
| Create an account / sign in / sign out | `frontend/src/CoursePlatform.jsx` | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout` |
| Check the current login session | `frontend/src/CoursePlatform.jsx` | `GET /api/auth/me` |
| Generate a skills analysis | `frontend/src/App.jsx` | `POST /api/analyze` |
| Load course progress and dashboard | `frontend/src/CoursePlatform.jsx` | `GET /api/courses/{course_id}/progress`, `GET /api/dashboard` |
| Save a passed lesson | `frontend/src/CoursePlatform.jsx` | `POST /api/courses/{course_id}/lessons/{lesson_index}/complete` |
| Load and submit the final assessment | `frontend/src/CoursePlatform.jsx` | `GET` and `POST /api/courses/{course_id}/assessment` |
| Ask a lesson question | `frontend/src/CoursePlatform.jsx` | `POST /api/ai/tutor` |
| Check certificate eligibility and load details | `frontend/src/CoursePlatform.jsx` | `GET /api/courses/{course_id}/certificate` |
| Search companies and verified job listings | `frontend/src/JobsPlatform.jsx` | `GET /api/jobs/companies`, `GET /api/jobs` |
| Save a profile, get job recommendations, and manage alerts | `frontend/src/JobsPlatform.jsx` | `/api/jobs/profile`, `/api/jobs/recommendations`, `/api/jobs/alerts` |
| Save jobs and track applications | `frontend/src/JobsPlatform.jsx` | `/api/jobs/saved`, `/api/jobs/{job_id}/save`, `/api/jobs/{job_id}/application` |
| Create, edit, and verify listings | `frontend/src/JobsPlatform.jsx` | `/api/admin/jobs/*` (requires `JOB_ADMIN_EMAILS`) |

Interactive API documentation is available at `http://127.0.0.1:8000/api/docs` while the backend is running.

## Language support

The interface defaults to English and supports Tamil. The learner can switch languages using the language selector. The choice is stored in browser local storage. Course content and interface strings use the frontend translation helpers; AI requests also include the selected language so generated responses can be returned in English or Tamil.

## Account and deployment considerations

- Passwords are stored as salted scrypt hashes rather than plaintext.
- Session cookies are `HttpOnly` and `SameSite=Lax`. The `Secure` cookie flag is enabled when `APP_ENV=production`; production should use HTTPS.
- CORS and request-origin checks use `FRONTEND_ORIGINS`. Configure the exact deployed frontend origins; do not use wildcard origins with credentialed sessions.
- Authenticated write requests require a valid session, an allowed origin, and the session's CSRF token.
- The default SQLite setup is for local development and a single backend instance. A multi-instance deployment needs a shared, durable database and an appropriate session/storage strategy.
- Email verification and account recovery are not implemented. Add those flows before relying on production accounts.
- Keep Gemini credentials in backend-only environment configuration. Never put API keys in frontend source or commit `.env` files.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| `.\backend\venv\Scripts\python.exe` is not recognized | PowerShell is probably in the wrong folder. Change to the `SkillSync-AI` project root (not its parent) and confirm `Test-Path .\backend\venv\Scripts\python.exe` returns `True`. |
| The home page says the API is offline or Vite logs `ECONNREFUSED` | Start the backend in a separate terminal and keep it open. Check `http://127.0.0.1:8000/api/health` (or port `8001` if selected). Make sure `API_PROXY_TARGET` in the frontend terminal matches the backend port, then restart Vite. |
| Uvicorn reports `WinError 10013` on port 8000 | Try the documented port 8001 command and set `API_PROXY_TARGET` to `http://127.0.0.1:8001` before starting Vite. |
| The backend prints `Shutting down` | The backend process has exited, often because the terminal was closed or interrupted. Start Uvicorn again and keep that terminal open. |
| `Set-Location frontend` or npm reports that `package.json` cannot be found | The terminal is not at the project root. Use the full `frontend` path shown in the setup instructions; run npm commands only from `frontend`. |
| Python reports it cannot copy `venvlauncher.exe` | Check that you are in the `SkillSync-AI` project root and that `backend\venv\Scripts\python.exe` exists. If it already exists and works, do not recreate the environment; proceed with package installation and server startup. |
| The frontend cannot start | Confirm a supported Node.js version is installed, run `npm install` inside `frontend`, then run `npm run dev`. |
| AI analysis or tutor is unavailable | Set a valid `GEMINI_API_KEY` in `backend\.env`, restart the backend, and check its terminal output. Core roadmap and course features do not require Gemini. |
| A course page redirects to sign-in | Course progress and lessons require an account. Sign in, then reopen the course. |
| The assessment is unavailable | Complete all six lessons in order first. |
| A lesson will not unlock | Complete the previous lesson's quick-check question correctly; milestones are sequential. |
| Certificate remains locked | Complete every lesson and achieve 100% on a course assessment. A lower score is saved, but does not unlock the certificate. |
| Port 5173 or 8000 is already in use | Stop the other process using that port or configure a different port and update the frontend proxy/origin settings accordingly. |

## Extending the project

- Add or update career paths and milestone metadata in `frontend/src/roadmaps.js`.
- Add or adjust lesson explanations, examples, practice instructions, and quick checks in `frontend/src/learningResources.js`.
- Update English/Tamil interface strings in `frontend/src/i18n.js`.
- Add or update API behavior, database operations, and assessment rules in `backend/main.py`.
- Add backend regression tests in `backend/test_main.py`.
- If a new course is added, make sure its ID is supported by the backend and that the frontend course, lesson count, and backend completion/assessment rules stay consistent.

## Glossary

- **Roadmap / learning path:** An ordered set of milestones for a career direction.
- **Milestone / lesson:** One learning step within a course.
- **API:** The interface the frontend uses to ask the backend for data or actions.
- **Session:** The server-recognized signed-in state associated with a browser cookie.
- **CSRF token:** A token used with authenticated write requests to help prevent unwanted cross-site actions.
- **SQLite:** A file-based database used here to store accounts and learning records locally.
- **Gemini API key:** A backend credential that authorizes optional AI requests.

## Notes

- User accounts and course progress are stored in the local SQLite database. The database is created automatically by the backend.
- AI features require a valid Gemini API key. Do not commit `backend\.env` or expose the key in frontend code.
- The default SQLite setup is intended for local development and a single backend instance, not a horizontally scaled production deployment.
- Email verification and account recovery are not configured in this MVP. Review the backend README before deploying or relying on production accounts.
