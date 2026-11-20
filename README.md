# SkillSync AI

SkillSync AI is a full-stack career-learning platform for students and freshers. It combines career roadmaps, interactive lessons, assessments, certificates, AI-powered career assistance, and an India-focused verified jobs portal.

The project uses a React and Vite frontend with a FastAPI and SQLite backend.

## Features

### Career learning

- Explore 25+ career roadmaps across development, mobile, games, data, AI, cybersecurity, cloud, IT operations, design, and product.
- Search roadmaps by career, skill, tool, or category.
- Open a six-step learning course for each career path.
- Complete lessons in order with recorded account progress.
- Use an HTML and CSS mini playground for practical learning.
- Ask an AI tutor for simpler explanations, hints, examples, or lesson questions.
- Take a server-scored final assessment after completing every lesson.
- Unlock a printable certificate only after completing all lessons and earning 100%.
- View saved course progress and the best assessment score in the dashboard.

### Account and dashboard

- Create an account or sign in with email and password.
- Passwords are hashed with salted scrypt.
- Server-side opaque sessions use secure HttpOnly cookies.
- Remember-me controls session persistence.
- CSRF and origin validation protect state-changing requests.
- See active courses, completed lessons, assessment scores, and certificate status.
- Sign out securely from all account UI areas.

### AI skill analysis

- Enter a target career and comma-separated skills.
- Receive strengths, missing skills, a learning order, a roadmap, and project ideas.
- English and Tamil are supported.
- A Gemini API key is required for live AI responses.

### AI career assistant

- Available to signed-in users through the floating assistant.
- Supports career guidance, interview preparation, resume analysis, job searching, and skill recommendations.
- Uses the selected language and optional job-profile context.
- Recommends only verified jobs supplied by the existing jobs API.
- Reports that assistance is unavailable when Gemini is not configured.

### India jobs portal

- Search verified job listings and company career pages.
- Browse public company and category directories.
- Filter jobs by search text, company, industry, category, state, city, work mode, employment type, organization type, education, skills, salary, and experience.
- Save private learner job profiles containing education, degree, skills, experience, locations, career interests, resume text, and alert preferences.
- Receive explainable estimated job-match percentages.
- Save jobs for later.
- Track user-reported application states such as applied, interviewing, rejected, and offer.
- Dismiss match alerts.
- Administrator tools manage categories, companies, listings, verification, account access, and analytics.

Job matching is a weighted estimate based on skills, education, experience, location, and interests. It is not an employment, interview, or hiring guarantee. The application status is learner-reported only; SkillSync AI does not submit applications.

### Interface and accessibility

- Futuristic responsive design with light and dark theme options.
- English and Tamil interface translations.
- Theme and animation preferences stored in browser storage.
- Reduced-motion support.
- Keyboard-navigation-friendly controls and semantic page structure.
- Lazy-loaded course and jobs workspaces.

## Technology

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | User interface and application state |
| Vite 8 | Development server and production builds |
| React Three Fiber / Three.js | Neural background and visual effects |
| Framer Motion | Interface animation |
| CSS | Responsive themes and layout |

### Backend

| Technology | Purpose |
|---|---|
| Python | Backend language |
| FastAPI | REST API, validation, sessions, and API documentation |
| SQLite | Local persistent database |
| Pydantic | Request and response validation |
| Scrypt | Password hashing |
| Google Gemini SDK | AI tutor, career assistant, and skill analysis |
| python-dotenv | Environment configuration |

## Project structure

```text
SkillSync-AI/
|-- README.md
|-- frontend/
|   |-- src/
|   |   |-- App.jsx                 # Home page and top-level routing
|   |   |-- CoursePlatform.jsx      # Auth, dashboard, courses, assessments
|   |   |-- LearningLesson.jsx      # Interactive lesson and practice
|   |   |-- JobsPlatform.jsx        # India jobs portal
|   |   |-- CareerAssistant.jsx     # Floating AI career assistant
|   |   |-- roadmaps.js             # Career roadmap definitions
|   |   |-- learningResources.js    # Lesson guides and knowledge bank
|   |   |-- i18n.js                 # English and Tamil translations
|   |   |-- *.css                   # Layout and visual themes
|   |-- package.json
|   `-- vite.config.js
`-- backend/
    |-- main.py                     # Authentication, courses, AI, and core API
    |-- job_platform.py             # Jobs, profiles, alerts, and admin API
    |-- test_main.py                # API and security tests
    |-- skillsync.db                # SQLite database
    |-- .env                        # Local environment settings
    `-- venv/                        # Existing local Python environment
```

## Requirements

- Windows PowerShell
- Python 3.10 or later
- Node.js 18 or later
- npm
- Optional: a Gemini API key

## Local setup

### 1. Backend

From the project root:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend starts at:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/api/docs
- Health: http://127.0.0.1:8000/api/health

If the existing virtual environment is unavailable, create and prepare a new one:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install fastapi "uvicorn[standard]" python-dotenv "google-genai"
```

### 2. Frontend

In a separate terminal:

```powershell
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173.

The Vite development server proxies `/api` requests to `http://127.0.0.1:8000`.

## Environment configuration

Create `backend/.env` from `backend/.env.example`:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
APP_ENV=development
SKILLSYNC_DB_PATH=backend/skillsync.db
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JOB_ADMIN_EMAILS=
```

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables Gemini-backed AI features |
| `GEMINI_MODEL` | Gemini model name |
| `APP_ENV` | Use `production` behind HTTPS to enable secure cookies |
| `SKILLSYNC_DB_PATH` | SQLite database path |
| `FRONTEND_ORIGINS` | Comma-separated browser origins allowed by CORS and Origin checks |
| `JOB_ADMIN_EMAILS` | Comma-separated accounts that receive jobs administrator access |

Do not put API keys in frontend code or commit real credentials.

To enable the AI tutor, career assistant, and skill analysis, add a valid Gemini key and restart the backend:

```dotenv
GEMINI_API_KEY=your-key-here
```

Without a key, the site still works for local lessons and assessments. AI endpoints return a clear not-configured response.

## Frontend routes

| Route | Page |
|---|---|
| `/` | Home, roadmaps, AI skill analysis |
| `/login` | Sign in |
| `/signup` | Create account |
| `/forgot-password` | Password recovery placeholder |
| `/dashboard` | Authenticated learning dashboard |
| `/courses/<course-id>` | Career course and lesson workspace |
| `/assessment/<course-id>` | Final course assessment |
| `/certificate/<course-id>` | Printable certificate |
| `/jobs` | Search verified listings |
| `/jobs/companies` | Company directory |
| `/jobs/profile` | Private learner job profile |
| `/jobs/saved` | Saved jobs |
| `/jobs/applied` | Application tracking |
| `/jobs/alerts` | Match alerts |
| `/jobs/admin` | Administrator jobs workspace |

## Main API endpoints

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/me` | Current session and user |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | End session |

### Learning

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health |
| GET | `/api/dashboard` | Learning dashboard |
| GET | `/api/courses/{course_id}/progress` | Course progress |
| POST | `/api/courses/{course_id}/lessons/{lesson_index}/complete` | Complete a lesson |
| GET | `/api/courses/{course_id}/assessment` | Assessment questions |
| POST | `/api/courses/{course_id}/assessment` | Server-score an attempt |
| GET | `/api/courses/{course_id}/certificate` | Eligible certificate details |

### AI

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/analyze` | AI target-career skill analysis |
| POST | `/api/ai/tutor` | Context-aware lesson tutor |
| POST | `/api/ai/career-assistant` | Authenticated career assistant |

### Public jobs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/jobs/categories` | Active job categories |
| GET | `/api/jobs/companies` | Company directory |
| GET | `/api/jobs` | Search active, verified, unexpired listings |

### Learner jobs

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/jobs/profile` | Read or save job profile |
| GET | `/api/jobs/recommendations` | Estimated profile matches |
| GET | `/api/jobs/alerts` | Match alerts |
| POST | `/api/jobs/alerts/{job_id}/dismiss` | Dismiss an alert |
| POST | `/api/jobs/{job_id}/save` | Save or unsave a job |
| GET | `/api/jobs/saved` | Saved jobs |
| POST | `/api/jobs/{job_id}/application` | Record learner-reported application state |
| GET | `/api/jobs/applications` | Application tracking |

### Job administrators

The administrator API provides category, company, listing, verification, account-status, analytics, and summary management under `/api/admin/jobs`.

Configure `JOB_ADMIN_EMAILS` with exact account email addresses before restarting the backend. Administrator writes require an authenticated session, allowed origin, and CSRF token.

## SQLite data

The backend creates the SQLite database and tables automatically.

Main tables include:

- `users`
- `sessions`
- `lesson_progress`
- `assessment_attempts`
- `job_categories`
- `job_companies`
- `job_profiles`
- `job_postings`
- `saved_jobs`
- `job_applications`
- `job_alerts`

The database is designed for local or single-instance use. For horizontal scaling or production accounts, use a managed database and durable session/secret storage.

## Security behavior

- Passwords use salted scrypt hashes.
- Sessions are random opaque tokens stored as server-side hashes.
- Cookies use `HttpOnly` and `SameSite=Lax`.
- `Secure` is enabled for the session cookie in production mode behind HTTPS.
- Signup and login validate the request origin.
- State-changing account and learning writes require a session-bound CSRF token.
- Login, signup, and AI requests have rate limits.
- Security headers include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- API responses use `Cache-Control: no-store`.
- Assessment answers are scored on the backend.
- Expired or unverified job postings are not publicly returned.
- Resume text and job profiles are private to the signed-in user.

## Job administrator setup

1. Create or sign in with an account.
2. Add the account email to `JOB_ADMIN_EMAILS` in `backend/.env`.
3. Restart the backend.
4. Open `/jobs/admin`.
5. Add official company and category records.
6. Enter an official source URL and application URL.
7. Set a future expiry date and verify the listing.

Verified listings appear publicly only when active and not expired. The project does not seed vacancies or use an external job feed.

## Tests

Run the backend unit tests from `backend`:

```powershell
cd backend
.\venv\Scripts\python.exe -m unittest test_main
```

Tests cover password hashing, login behavior, origin and CSRF protection, lesson order, server-scored assessments, certificate rules, AI configuration, and language validation.

Run the frontend build:

```powershell
cd frontend
npm run build
```

Run the frontend lint task:

```powershell
cd frontend
npm run lint
```

## Production build

Build the frontend:

```powershell
cd frontend
npm ci
npm run build
```

The static output is written to `frontend/dist`.

Serve the frontend and proxy `/api` requests to the FastAPI service on the same origin. Set:

```dotenv
APP_ENV=production
FRONTEND_ORIGINS=https://your-frontend.example
SKILLSYNC_DB_PATH=/absolute/path/to/skillsync.db
GEMINI_API_KEY=your-key-here
```

Configure HTTPS and a reverse proxy or managed web hosting for the FastAPI backend.

## Current limitations

- Email verification and account recovery are not implemented.
- Forgot-password is currently a placeholder.
- Gemini integration is optional and requires a valid API key.
- There is no PDF resume parser.
- There is no third-party job-feed refresh or push notification service.
- Job vacancies must be entered and verified by an administrator.
- The SQLite database is not intended for a horizontally scaled deployment.
- AI output can contain mistakes and must be reviewed by the learner.