import json
import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class JobProfileRequest(APIModel):
    education: str = Field(default="", max_length=160)
    degree: str = Field(default="", max_length=120)
    skills: list[str] = Field(default_factory=list, max_length=60)
    experience_years: float = Field(default=0, ge=0, le=60)
    preferred_locations: list[str] = Field(default_factory=list, max_length=20)
    career_interests: list[str] = Field(default_factory=list, max_length=20)
    resume_text: str = Field(default="", max_length=12000)
    alerts_enabled: bool = True
    minimum_match_percent: int = Field(default=70, ge=40, le=100)


class CompanyRequest(APIModel):
    id: str | None = Field(default=None, max_length=80)
    name: str = Field(min_length=2, max_length=160)
    industry: str = Field(min_length=2, max_length=100)
    organization_type: str = Field(min_length=2, max_length=60)
    headquarters: str = Field(min_length=2, max_length=120)
    website_url: str = Field(min_length=8, max_length=500)
    careers_url: str = Field(min_length=8, max_length=500)
    logo_url: str | None = Field(default=None, max_length=500)
    review_careers_link: bool = False


class JobRequest(APIModel):
    company_id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=2, max_length=180)
    category: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=1, max_length=10000)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    work_mode: Literal["Remote", "Hybrid", "Office"]
    employment_type: Literal["Full-time", "Internship", "Contract", "Government"]
    experience_min: float = Field(default=0, ge=0, le=60)
    experience_max: float | None = Field(default=None, ge=0, le=60)
    salary_min: int | None = Field(default=None, ge=0, le=100000000)
    salary_max: int | None = Field(default=None, ge=0, le=100000000)
    required_education: list[str] = Field(default_factory=list, max_length=20)
    skills: list[str] = Field(default_factory=list, max_length=50)
    posted_at: str | None = Field(default=None, max_length=40)
    expires_at: str = Field(min_length=10, max_length=40)
    application_url: str = Field(min_length=8, max_length=500)
    source_url: str = Field(min_length=8, max_length=500)
    source_name: str = Field(min_length=2, max_length=120)


class JobReviewRequest(APIModel):
    status: Literal["active", "closed", "expired"]
    expires_at: str | None = Field(default=None, max_length=40)


class SaveJobRequest(APIModel):
    saved: bool


class ApplicationRequest(APIModel):
    status: Literal["applied", "interview", "rejected", "offer"]


class CategoryRequest(APIModel):
    name: str = Field(min_length=2, max_length=100)
    active: bool = True


class UserStatusRequest(APIModel):
    active: bool


COMPANY_SEED = (
    ("zoho", "Zoho", "Technology", "Product", "Chennai, Tamil Nadu", "https://www.zoho.com/", "https://www.zoho.com/careers/", True),
    ("adobe", "Adobe", "Technology", "Product MNC", "Noida, Uttar Pradesh", "https://www.adobe.com/", "https://careers.adobe.com/us/en", True),
    ("tcs", "Tata Consultancy Services", "IT Services", "Service MNC", "Mumbai, Maharashtra", "https://www.tcs.com/", "https://www.tcs.com/careers", False),
    ("infosys", "Infosys", "IT Services", "Service MNC", "Bengaluru, Karnataka", "https://www.infosys.com/", "https://www.infosys.com/careers.html", False),
    ("accenture", "Accenture", "IT Services", "Service MNC", "Bengaluru, Karnataka", "https://www.accenture.com/", "https://www.accenture.com/in-en/careers", True),
    ("wipro", "Wipro", "IT Services", "Service MNC", "Bengaluru, Karnataka", "https://www.wipro.com/", "https://careers.wipro.com/", True),
    ("hdfc-bank", "HDFC Bank", "Banking", "Private Bank", "Mumbai, Maharashtra", "https://www.hdfcbank.com/", "https://www.hdfc.bank.in/careers", True),
    ("icici-bank", "ICICI Bank", "Banking", "Private Bank", "Mumbai, Maharashtra", "https://www.icici.bank.in/", "https://careers.icici.bank.in/CareerApplicant/Career/Home/", True),
    ("sbi", "State Bank of India", "Banking", "Public Sector Bank", "Mumbai, Maharashtra", "https://sbi.bank.in/", "https://sbi.bank.in/web/careers", True),
    ("isro", "Indian Space Research Organisation", "Government / Space", "Government", "Bengaluru, Karnataka", "https://www.isro.gov.in/", "https://www.isro.gov.in/Careers.html", True),
    ("tata-motors", "Tata Motors", "Manufacturing / Automotive", "Manufacturing", "Mumbai, Maharashtra", "https://www.tatamotors.com/", "https://careers.tatamotors.com/", True),
    ("tata-steel", "Tata Steel", "Manufacturing / Steel", "Manufacturing", "Jamshedpur, Jharkhand", "https://www.tatasteel.com/", "https://www.tatasteel.com/careers/", True),
    ("phonepe", "PhonePe", "Fintech", "Startup / Product", "Bengaluru, Karnataka", "https://www.phonepe.com/", "https://www.phonepe.com/careers/", True),
    ("apollo-hospitals", "Apollo Hospitals", "Healthcare", "Healthcare", "Chennai, Tamil Nadu", "https://www.apollohospitals.com/", "https://www.apollohospitals.com/careers/", False),
    ("fortis-healthcare", "Fortis Healthcare", "Healthcare", "Healthcare", "Gurugram, Haryana", "https://www.fortishealthcare.com/", "https://www.fortishealthcare.com/careers-at-Fortis-basic", False),
)

CAREER_CATEGORIES = [
    "Software Development",
    "Data Science",
    "Data Analyst",
    "Artificial Intelligence",
    "Machine Learning",
    "Cybersecurity",
    "Cloud Computing",
    "DevOps",
    "Banking",
    "Finance",
    "Government",
    "Manufacturing",
    "Healthcare",
    "Business Analytics",
    "Sales",
    "Human Resources",
    "Other",
]

ROLE_COURSES = (
    (("data analyst", "business analyst", "data science", "data scientist"), "data-analyst", "Data Analyst"),
    (("machine learning", "artificial intelligence", "ai/ml"), "ai-ml-engineer", "AI / ML Engineer"),
    (("cybersecurity", "security"), "cybersecurity-analyst", "Cybersecurity Analyst"),
    (("cloud", "devops", "site reliability"), "cloud-engineer", "Cloud Engineer"),
    (("frontend", "front-end", "web developer", "react"), "frontend", "Frontend Developer"),
    (("backend", "back-end", "full stack", "software developer"), "full-stack", "Full Stack Developer"),
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp(value: datetime | None = None) -> str:
    return (value or _now()).isoformat()


def _parse_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid ISO-8601 date and time.") from exc
    if parsed.tzinfo is None:
        raise HTTPException(status_code=422, detail="Dates must include a timezone.")
    return parsed.astimezone(timezone.utc)


def _posted_timestamp(value: str | None) -> str:
    posted_at = _parse_timestamp(value) if value else _now()
    if posted_at > _now():
        raise HTTPException(status_code=422, detail="A posting date cannot be in the future.")
    return _timestamp(posted_at)


def _https_url(value: str, label: str) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise HTTPException(status_code=422, detail=f"{label} must be a valid HTTPS URL.")
    return value.strip()


def _json_list(value: str) -> list:
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return []
    return parsed if isinstance(parsed, list) else []


def _clean_list(values: list[str]) -> list[str]:
    cleaned = []
    seen = set()
    for value in values:
        item = " ".join(value.strip().split())[:100]
        key = item.casefold()
        if item and key not in seen:
            cleaned.append(item)
            seen.add(key)
    return cleaned


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")[:80]


def initialize_job_database(connection_factory) -> None:
    with connection_factory() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS job_companies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                industry TEXT NOT NULL,
                organization_type TEXT NOT NULL,
                headquarters TEXT NOT NULL,
                website_url TEXT NOT NULL,
                careers_url TEXT NOT NULL,
                logo_url TEXT,
                careers_link_reviewed_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS job_profiles (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                education TEXT NOT NULL DEFAULT '',
                degree TEXT NOT NULL DEFAULT '',
                skills_json TEXT NOT NULL DEFAULT '[]',
                experience_years REAL NOT NULL DEFAULT 0,
                preferred_locations_json TEXT NOT NULL DEFAULT '[]',
                career_interests_json TEXT NOT NULL DEFAULT '[]',
                resume_text TEXT NOT NULL DEFAULT '',
                alerts_enabled INTEGER NOT NULL DEFAULT 1,
                minimum_match_percent INTEGER NOT NULL DEFAULT 70,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS job_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS job_postings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT NOT NULL REFERENCES job_companies(id),
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                work_mode TEXT NOT NULL,
                employment_type TEXT NOT NULL,
                experience_min REAL NOT NULL DEFAULT 0,
                experience_max REAL,
                salary_min INTEGER,
                salary_max INTEGER,
                required_education_json TEXT NOT NULL DEFAULT '[]',
                skills_json TEXT NOT NULL DEFAULT '[]',
                posted_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                application_url TEXT NOT NULL,
                source_url TEXT NOT NULL,
                source_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                verified_at TEXT,
                verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS job_postings_active_expiry
                ON job_postings(status, expires_at, verified_at);
            CREATE INDEX IF NOT EXISTS job_postings_company
                ON job_postings(company_id, status);
            CREATE TABLE IF NOT EXISTS saved_jobs (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
                saved_at TEXT NOT NULL,
                PRIMARY KEY (user_id, job_id)
            );
            CREATE TABLE IF NOT EXISTS job_applications (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
                status TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, job_id)
            );
            CREATE TABLE IF NOT EXISTS job_alerts (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
                match_percent INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                dismissed_at TEXT,
                PRIMARY KEY (user_id, job_id)
            );
            """
        )
        user_columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)")}
        if "is_active" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1")
        now = _timestamp()
        for category in CAREER_CATEGORIES:
            connection.execute(
                """
                INSERT OR IGNORE INTO job_categories(id, name, active, created_at, updated_at)
                VALUES (?, ?, 1, ?, ?)
                """,
                (_slug(category), category, now, now),
            )
        for company in COMPANY_SEED:
            company_id, name, industry, company_type, headquarters, website, careers, reviewed = company
            connection.execute(
                """
                INSERT OR IGNORE INTO job_companies
                    (id, name, industry, organization_type, headquarters, website_url,
                     careers_url, careers_link_reviewed_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    company_id, name, industry, company_type, headquarters, website, careers,
                    now if reviewed else None, now, now,
                ),
            )


def _company_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "industry": row["industry"],
        "organization_type": row["organization_type"],
        "headquarters": row["headquarters"],
        "website_url": row["website_url"],
        "careers_url": row["careers_url"],
        "logo_url": row["logo_url"],
        "careers_link_reviewed_at": row["careers_link_reviewed_at"],
    }


def _job_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "company_id": row["company_id"],
        "company_name": row["company_name"],
        "industry": row["industry"],
        "organization_type": row["organization_type"],
        "title": row["title"],
        "category": row["category"],
        "description": row["description"],
        "city": row["city"],
        "state": row["state"],
        "location": f'{row["city"]}, {row["state"]}',
        "work_mode": row["work_mode"],
        "employment_type": row["employment_type"],
        "experience_min": row["experience_min"],
        "experience_max": row["experience_max"],
        "salary_min": row["salary_min"],
        "salary_max": row["salary_max"],
        "required_education": _json_list(row["required_education_json"]),
        "skills": _json_list(row["skills_json"]),
        "posted_at": row["posted_at"],
        "expires_at": row["expires_at"],
        "application_url": row["application_url"],
        "source_url": row["source_url"],
        "source_name": row["source_name"],
        "verified_at": row["verified_at"],
        "status": row["status"],
    }


JOB_SELECT = """
    SELECT jobs.*, companies.name AS company_name, companies.industry,
           companies.organization_type
    FROM job_postings AS jobs
    JOIN job_companies AS companies ON companies.id = jobs.company_id
"""


def _active_job_rows(connection: sqlite3.Connection, limit: int = 250) -> list[sqlite3.Row]:
    now = _timestamp()
    connection.execute(
        "UPDATE job_postings SET status = 'expired', updated_at = ? WHERE status = 'active' AND expires_at <= ?",
        (now, now),
    )
    return connection.execute(
        JOB_SELECT
        + """
        WHERE jobs.status = 'active' AND jobs.verified_at IS NOT NULL
          AND jobs.expires_at > ?
        ORDER BY jobs.posted_at DESC, jobs.id DESC
        LIMIT ?
        """,
        (now, limit),
    ).fetchall()


def _normalized(value: str) -> str:
    return " ".join(re.sub(r"[^\w+#.]+", " ", value.casefold()).split())


def _contains_term(text: str, term: str) -> bool:
    normalized_text = _normalized(text)
    normalized_term = _normalized(term)
    return bool(normalized_term) and f" {normalized_term} " in f" {normalized_text} "


def _recommendation(job: dict, profile: dict) -> dict:
    resume = profile["resume_text"]
    skills_text = f'{" ".join(profile["skills"])} {resume}'
    matched_skills = [skill for skill in job["skills"] if _contains_term(skills_text, skill)]
    missing_skills = [skill for skill in job["skills"] if not _contains_term(skills_text, skill)]

    components: list[tuple[int, float]] = []
    reasons = []
    if job["skills"]:
        skill_score = len(matched_skills) / len(job["skills"])
        components.append((60, skill_score))
        if matched_skills:
            reasons.append(f'Matching skills: {", ".join(matched_skills[:5])}.')

    if job["required_education"] and (profile["education"] or profile["degree"] or resume.strip()):
        education_text = f'{profile["education"]} {profile["degree"]} {resume}'
        education_matches = [
            item for item in job["required_education"] if _contains_term(education_text, item)
        ]
        components.append((15, 1.0 if education_matches else 0.0))
        if education_matches:
            reasons.append(f'Education matches: {", ".join(education_matches[:3])}.')

    if job["experience_min"] > 0 or job["experience_max"] is not None:
        required_years = job["experience_min"]
        experience_score = 1.0 if profile["experience_years"] >= required_years else (
            profile["experience_years"] / required_years if required_years else 1.0
        )
        if job["experience_max"] is not None and profile["experience_years"] > job["experience_max"]:
            experience_score *= max(0.5, job["experience_max"] / profile["experience_years"])
        components.append((10, experience_score))
        if experience_score >= 1:
            reasons.append("Your experience level meets the stated range.")

    if profile["preferred_locations"]:
        location_text = f'{job["city"]} {job["state"]} {job["work_mode"]}'
        location_match = any(_contains_term(location_text, place) for place in profile["preferred_locations"])
        components.append((10, 1.0 if location_match else 0.0))
        if location_match:
            reasons.append(f'Location matches your preference for {job["location"] if job["work_mode"] != "Remote" else "remote work"}.')

    if profile["career_interests"]:
        role_text = f'{job["title"]} {job["category"]} {job["industry"]}'
        interest_matches = [
            interest for interest in profile["career_interests"] if _contains_term(role_text, interest)
        ]
        components.append((5, 1.0 if interest_matches else 0.0))
        if interest_matches:
            reasons.append(f'Related to your career interest in {", ".join(interest_matches[:3])}.')

    score = round(100 * sum(weight * value for weight, value in components) / sum(weight for weight, _ in components)) if components else 0
    if not reasons:
        reasons.append("Add profile details to see which requirements align.")

    role_text = f'{job["title"]} {job["category"]}'.casefold()
    course_id, course_title = "full-stack", "Full Stack Developer"
    for needles, candidate_id, candidate_title in ROLE_COURSES:
        if any(needle in role_text for needle in needles):
            course_id, course_title = candidate_id, candidate_title
            break
    return {
        "job": job,
        "match_percent": score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "why_it_matches": reasons,
        "required_qualifications": job["required_education"],
        "learning_path": {
            "title": f"{course_title} roadmap",
            "url": f"/courses/{course_id}",
            "missing_skills": missing_skills,
        },
        "score_note": "An estimate based only on the profile details you provided; it is not a hiring or interview guarantee.",
    }


def create_job_router(connection_factory, current_session, require_session) -> APIRouter:
    router = APIRouter()

    def require_job_admin(user: dict = Depends(current_session)) -> dict:
        allowed = {
            item.strip().casefold()
            for item in os.getenv("JOB_ADMIN_EMAILS", "").split(",")
            if item.strip()
        }
        if not allowed or user["email"].casefold() not in allowed:
            raise HTTPException(status_code=403, detail="Job administrator access is required.")
        return user

    def require_job_admin_write(user: dict = Depends(require_session)) -> dict:
        allowed = {
            item.strip().casefold()
            for item in os.getenv("JOB_ADMIN_EMAILS", "").split(",")
            if item.strip()
        }
        if not allowed or user["email"].casefold() not in allowed:
            raise HTTPException(status_code=403, detail="Job administrator access is required.")
        return user

    def profile_for(connection: sqlite3.Connection, user_id: int) -> dict:
        row = connection.execute(
            "SELECT * FROM job_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
        if row is None:
            return {
                "education": "",
                "degree": "",
                "skills": [],
                "experience_years": 0,
                "preferred_locations": [],
                "career_interests": [],
                "resume_text": "",
                "alerts_enabled": True,
                "minimum_match_percent": 70,
            }
        return {
            "education": row["education"],
            "degree": row["degree"],
            "skills": _json_list(row["skills_json"]),
            "experience_years": row["experience_years"],
            "preferred_locations": _json_list(row["preferred_locations_json"]),
            "career_interests": _json_list(row["career_interests_json"]),
            "resume_text": row["resume_text"],
            "alerts_enabled": bool(row["alerts_enabled"]),
            "minimum_match_percent": row["minimum_match_percent"],
        }

    @router.get("/api/jobs/categories")
    def list_job_categories():
        with connection_factory() as connection:
            rows = connection.execute(
                "SELECT name FROM job_categories WHERE active = 1 ORDER BY name COLLATE NOCASE"
            ).fetchall()
        return {"categories": [row["name"] for row in rows]}

    @router.get("/api/jobs/companies")
    def list_companies(
        search: str = Query(default="", max_length=120),
        industry: str = Query(default="", max_length=100),
        limit: int = Query(default=100, ge=1, le=250),
    ):
        clauses = []
        values: list = []
        if search.strip():
            like = f"%{search.strip()}%"
            clauses.append("(name LIKE ? COLLATE NOCASE OR headquarters LIKE ? COLLATE NOCASE)")
            values.extend((like, like))
        if industry.strip():
            clauses.append("industry LIKE ? COLLATE NOCASE")
            values.append(f"%{industry.strip()}%")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with connection_factory() as connection:
            rows = connection.execute(
                f"SELECT * FROM job_companies {where} ORDER BY name COLLATE NOCASE LIMIT ?",
                (*values, limit),
            ).fetchall()
        return {"companies": [_company_dict(row) for row in rows]}

    @router.get("/api/jobs")
    def list_jobs(
        search: str = Query(default="", max_length=120),
        company_id: str = Query(default="", max_length=80),
        industry: str = Query(default="", max_length=100),
        category: str = Query(default="", max_length=100),
        state: str = Query(default="", max_length=100),
        city: str = Query(default="", max_length=100),
        work_mode: str = Query(default="", max_length=20),
        employment_type: str = Query(default="", max_length=30),
        organization_type: str = Query(default="", max_length=60),
        education: str = Query(default="", max_length=120),
        skills: str = Query(default="", max_length=300),
        min_salary: int | None = Query(default=None, ge=0, le=100000000),
        max_salary: int | None = Query(default=None, ge=0, le=100000000),
        min_experience: float | None = Query(default=None, ge=0, le=60),
        max_experience: float | None = Query(default=None, ge=0, le=60),
        page: int = Query(default=1, ge=1, le=10000),
        page_size: int = Query(default=20, ge=1, le=100),
    ):
        clauses = [
            "jobs.status = 'active'",
            "jobs.verified_at IS NOT NULL",
            "jobs.expires_at > ?",
        ]
        values: list = [_timestamp()]
        filters = (
            (search, "(jobs.title LIKE ? COLLATE NOCASE OR jobs.description LIKE ? COLLATE NOCASE OR companies.name LIKE ? COLLATE NOCASE)", 3),
            (company_id, "companies.id = ?", 1),
            (industry, "companies.industry LIKE ? COLLATE NOCASE", 1),
            (category, "jobs.category LIKE ? COLLATE NOCASE", 1),
            (state, "jobs.state LIKE ? COLLATE NOCASE", 1),
            (city, "jobs.city LIKE ? COLLATE NOCASE", 1),
            (work_mode, "jobs.work_mode = ? COLLATE NOCASE", 1),
            (employment_type, "jobs.employment_type = ? COLLATE NOCASE", 1),
        )
        for value, clause, count in filters:
            if value.strip():
                clauses.append(clause)
                values.extend([f"%{value.strip()}%"] * count if " LIKE " in clause else [value.strip()])
        if organization_type.strip():
            if organization_type.strip().casefold() == "government":
                clauses.append("(companies.organization_type LIKE '%government%' COLLATE NOCASE OR companies.organization_type LIKE '%public sector%' COLLATE NOCASE)")
            elif organization_type.strip().casefold() == "private":
                clauses.append("(companies.organization_type NOT LIKE '%government%' COLLATE NOCASE AND companies.organization_type NOT LIKE '%public sector%' COLLATE NOCASE)")
            else:
                clauses.append("companies.organization_type LIKE ? COLLATE NOCASE")
                values.append(f"%{organization_type.strip()}%")
        if education.strip():
            if education.strip().casefold() == "degree":
                clauses.append("(jobs.required_education_json = '[]' OR jobs.required_education_json LIKE '%any degree%' COLLATE NOCASE)")
            else:
                clauses.append("jobs.required_education_json LIKE ? COLLATE NOCASE")
                values.append(f"%{education.strip()}%")
        if min_salary is not None:
            clauses.append("(jobs.salary_max IS NOT NULL AND jobs.salary_max >= ?)")
            values.append(min_salary)
        if max_salary is not None:
            clauses.append("(jobs.salary_min IS NOT NULL AND jobs.salary_min <= ?)")
            values.append(max_salary)
        if min_experience is not None:
            clauses.append("(jobs.experience_max IS NULL OR jobs.experience_max >= ?)")
            values.append(min_experience)
        if max_experience is not None:
            clauses.append("jobs.experience_min <= ?")
            values.append(max_experience)
        requested_skills = _clean_list([item for item in skills.split(",") if item.strip()])
        for skill in requested_skills:
            clauses.append("jobs.skills_json LIKE ? COLLATE NOCASE")
            values.append(f"%{skill}%")
        where = " WHERE " + " AND ".join(clauses)
        with connection_factory() as connection:
            connection.execute(
                "UPDATE job_postings SET status = 'expired', updated_at = ? WHERE status = 'active' AND expires_at <= ?",
                (_timestamp(), _timestamp()),
            )
            total = connection.execute(
                "SELECT COUNT(*) AS count FROM job_postings AS jobs JOIN job_companies AS companies ON companies.id = jobs.company_id"
                + where,
                values,
            ).fetchone()["count"]
            rows = connection.execute(
                JOB_SELECT
                + where
                + " ORDER BY jobs.posted_at DESC, jobs.id DESC LIMIT ? OFFSET ?",
                (*values, page_size, (page - 1) * page_size),
            ).fetchall()
        return {
            "jobs": [_job_dict(row) for row in rows],
            "page": page,
            "page_size": page_size,
            "total": total,
            "message": None if total else "No active, verified listings match these filters.",
        }

    @router.get("/api/jobs/profile")
    def get_job_profile(user: dict = Depends(current_session)):
        with connection_factory() as connection:
            return {"profile": profile_for(connection, user["id"])}

    @router.post("/api/jobs/profile")
    def save_job_profile(data: JobProfileRequest, user: dict = Depends(require_session)):
        profile = data.model_dump()
        profile["education"] = profile["education"].strip()
        profile["degree"] = profile["degree"].strip()
        profile["skills"] = _clean_list(profile["skills"])
        profile["preferred_locations"] = _clean_list(profile["preferred_locations"])
        profile["career_interests"] = _clean_list(profile["career_interests"])
        profile["resume_text"] = profile["resume_text"].strip()
        now = _timestamp()
        with connection_factory() as connection:
            connection.execute(
                """
                INSERT INTO job_profiles
                    (user_id, education, degree, skills_json, experience_years,
                     preferred_locations_json, career_interests_json, resume_text,
                     alerts_enabled, minimum_match_percent, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    education=excluded.education, degree=excluded.degree,
                    skills_json=excluded.skills_json, experience_years=excluded.experience_years,
                    preferred_locations_json=excluded.preferred_locations_json,
                    career_interests_json=excluded.career_interests_json,
                    resume_text=excluded.resume_text, alerts_enabled=excluded.alerts_enabled,
                    minimum_match_percent=excluded.minimum_match_percent, updated_at=excluded.updated_at
                """,
                (
                    user["id"], profile["education"], profile["degree"], json.dumps(profile["skills"]),
                    profile["experience_years"], json.dumps(profile["preferred_locations"]),
                    json.dumps(profile["career_interests"]), profile["resume_text"],
                    int(profile["alerts_enabled"]), profile["minimum_match_percent"], now,
                ),
            )
        return {"profile": profile, "updated_at": now}

    @router.get("/api/jobs/recommendations")
    def job_recommendations(user: dict = Depends(current_session)):
        with connection_factory() as connection:
            profile = profile_for(connection, user["id"])
            rows = _active_job_rows(connection)
            results = [_recommendation(_job_dict(row), profile) for row in rows]
            results.sort(key=lambda item: (item["match_percent"], item["job"]["posted_at"]), reverse=True)
            if profile["alerts_enabled"] and (profile["skills"] or profile["resume_text"].strip()):
                minimum = profile["minimum_match_percent"]
                recent_cutoff = _timestamp(_now() - timedelta(days=30))
                for item in results:
                    job = item["job"]
                    if item["match_percent"] < minimum or (job["verified_at"] or "") < recent_cutoff:
                        continue
                    connection.execute(
                        """
                        INSERT OR IGNORE INTO job_alerts(user_id, job_id, match_percent, created_at)
                        VALUES (?, ?, ?, ?)
                        """,
                        (user["id"], job["id"], item["match_percent"], _timestamp()),
                    )
        return {
            "recommendations": results,
            "profile": {key: value for key, value in profile.items() if key != "resume_text"},
            "score_note": "Estimated profile matching is not a hiring or interview guarantee.",
        }

    @router.get("/api/jobs/alerts")
    def get_job_alerts(user: dict = Depends(current_session)):
        with connection_factory() as connection:
            rows = connection.execute(
                JOB_SELECT
                + """
                JOIN job_alerts AS alerts ON alerts.job_id = jobs.id
                WHERE alerts.user_id = ? AND alerts.dismissed_at IS NULL
                  AND jobs.status = 'active' AND jobs.verified_at IS NOT NULL AND jobs.expires_at > ?
                ORDER BY alerts.created_at DESC LIMIT 50
                """,
                (user["id"], _timestamp()),
            ).fetchall()
            results = []
            for row in rows:
                item = _job_dict(row)
                alert = connection.execute(
                    "SELECT match_percent, created_at FROM job_alerts WHERE user_id = ? AND job_id = ?",
                    (user["id"], item["id"]),
                ).fetchone()
                results.append({**item, "match_percent": alert["match_percent"], "alert_created_at": alert["created_at"]})
        return {"alerts": results}

    @router.post("/api/jobs/alerts/{job_id}/dismiss")
    def dismiss_job_alert(job_id: int, user: dict = Depends(require_session)):
        with connection_factory() as connection:
            result = connection.execute(
                "UPDATE job_alerts SET dismissed_at = ? WHERE user_id = ? AND job_id = ? AND dismissed_at IS NULL",
                (_timestamp(), user["id"], job_id),
            )
            if not result.rowcount:
                raise HTTPException(status_code=404, detail="Job alert not found.")
        return {"dismissed": True}

    @router.post("/api/jobs/{job_id}/save")
    def save_job(job_id: int, data: SaveJobRequest, user: dict = Depends(require_session)):
        with connection_factory() as connection:
            row = connection.execute(
                "SELECT id FROM job_postings WHERE id = ? AND status = 'active' AND verified_at IS NOT NULL AND expires_at > ?",
                (job_id, _timestamp()),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Active verified job not found.")
            if data.saved:
                connection.execute(
                    "INSERT OR IGNORE INTO saved_jobs(user_id, job_id, saved_at) VALUES (?, ?, ?)",
                    (user["id"], job_id, _timestamp()),
                )
            else:
                connection.execute("DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?", (user["id"], job_id))
        return {"job_id": job_id, "saved": data.saved}

    @router.get("/api/jobs/saved")
    def list_saved_jobs(user: dict = Depends(current_session)):
        with connection_factory() as connection:
            rows = connection.execute(
                JOB_SELECT
                + " JOIN saved_jobs AS saved ON saved.job_id = jobs.id WHERE saved.user_id = ? ORDER BY saved.saved_at DESC",
                (user["id"],),
            ).fetchall()
        return {"jobs": [_job_dict(row) for row in rows]}

    @router.post("/api/jobs/{job_id}/application")
    def set_application_status(job_id: int, data: ApplicationRequest, user: dict = Depends(require_session)):
        with connection_factory() as connection:
            row = connection.execute(
                "SELECT id FROM job_postings WHERE id = ?", (job_id,)
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Job not found.")
            connection.execute(
                """
                INSERT INTO job_applications(user_id, job_id, status, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, job_id) DO UPDATE SET
                    status=excluded.status, updated_at=excluded.updated_at
                """,
                (user["id"], job_id, data.status, _timestamp()),
            )
        return {"job_id": job_id, "status": data.status, "user_reported": True}

    @router.get("/api/jobs/applications")
    def list_applications(user: dict = Depends(current_session)):
        with connection_factory() as connection:
            rows = connection.execute(
                JOB_SELECT
                + " JOIN job_applications AS applications ON applications.job_id = jobs.id"
                + " WHERE applications.user_id = ? ORDER BY applications.updated_at DESC",
                (user["id"],),
            ).fetchall()
            applications = connection.execute(
                "SELECT job_id, status, updated_at FROM job_applications WHERE user_id = ?",
                (user["id"],),
            ).fetchall()
        states = {row["job_id"]: {"status": row["status"], "updated_at": row["updated_at"]} for row in applications}
        return {"applications": [{**_job_dict(row), **states[row["id"]], "user_reported": True} for row in rows]}

    @router.get("/api/admin/jobs/summary")
    def admin_job_summary(user: dict = Depends(require_job_admin)):
        with connection_factory() as connection:
            connection.execute(
                "UPDATE job_postings SET status = 'expired', updated_at = ? WHERE status = 'active' AND expires_at <= ?",
                (_timestamp(), _timestamp()),
            )
            stats = {
                row["status"]: row["count"]
                for row in connection.execute("SELECT status, COUNT(*) AS count FROM job_postings GROUP BY status")
            }
            company_count = connection.execute("SELECT COUNT(*) AS count FROM job_companies").fetchone()["count"]
            user_count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        return {
            "companies": company_count,
            "users": user_count,
            "listings": {"pending": stats.get("pending", 0), "active": stats.get("active", 0), "closed": stats.get("closed", 0), "expired": stats.get("expired", 0)},
        }

    @router.get("/api/admin/jobs/users")
    def admin_list_users(user: dict = Depends(require_job_admin)):
        with connection_factory() as connection:
            rows = connection.execute(
                """
                SELECT id, name, email, created_at, is_active
                FROM users ORDER BY created_at DESC LIMIT 300
                """
            ).fetchall()
        return {
            "users": [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "email": row["email"],
                    "created_at": row["created_at"],
                    "active": bool(row["is_active"]),
                }
                for row in rows
            ]
        }

    @router.post("/api/admin/jobs/users/{user_id}/status")
    def admin_set_user_status(
        user_id: int,
        data: UserStatusRequest,
        user: dict = Depends(require_job_admin_write),
    ):
        if user_id == user["id"] and not data.active:
            raise HTTPException(status_code=422, detail="You cannot disable your own administrator account.")
        with connection_factory() as connection:
            result = connection.execute(
                "UPDATE users SET is_active = ? WHERE id = ?",
                (int(data.active), user_id),
            )
            if not result.rowcount:
                raise HTTPException(status_code=404, detail="User account not found.")
            if not data.active:
                connection.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        return {"user_id": user_id, "active": data.active}

    @router.get("/api/admin/jobs/categories")
    def admin_list_categories(user: dict = Depends(require_job_admin)):
        with connection_factory() as connection:
            rows = connection.execute(
                "SELECT id, name, active FROM job_categories ORDER BY name COLLATE NOCASE"
            ).fetchall()
        return {"categories": [{"id": row["id"], "name": row["name"], "active": bool(row["active"])} for row in rows]}

    @router.post("/api/admin/jobs/categories")
    def admin_save_category(data: CategoryRequest, user: dict = Depends(require_job_admin_write)):
        name = " ".join(data.name.strip().split())
        category_id = _slug(name)
        if not category_id:
            raise HTTPException(status_code=422, detail="Category name must contain letters or numbers.")
        now = _timestamp()
        try:
            with connection_factory() as connection:
                connection.execute(
                    """
                    INSERT INTO job_categories(id, name, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name=excluded.name, active=excluded.active, updated_at=excluded.updated_at
                    """,
                    (category_id, name, int(data.active), now, now),
                )
                row = connection.execute(
                    "SELECT id, name, active FROM job_categories WHERE id = ?", (category_id,)
                ).fetchone()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=409, detail="That category name already exists.") from exc
        return {"category": {"id": row["id"], "name": row["name"], "active": bool(row["active"])}}

    @router.get("/api/admin/jobs/companies")
    def admin_list_companies(user: dict = Depends(require_job_admin)):
        with connection_factory() as connection:
            rows = connection.execute("SELECT * FROM job_companies ORDER BY name COLLATE NOCASE").fetchall()
        return {"companies": [_company_dict(row) for row in rows]}

    @router.post("/api/admin/jobs/companies")
    def admin_save_company(data: CompanyRequest, user: dict = Depends(require_job_admin_write)):
        company_id = data.id or _slug(data.name)
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", company_id or ""):
            raise HTTPException(status_code=422, detail="Company ID may contain lowercase letters, numbers, and hyphens.")
        website = _https_url(data.website_url, "Company website")
        careers = _https_url(data.careers_url, "Careers page")
        logo = _https_url(data.logo_url, "Logo URL") if data.logo_url else None
        now = _timestamp()
        reviewed_at = now if data.review_careers_link else None
        with connection_factory() as connection:
            existing = connection.execute(
                "SELECT careers_url, careers_link_reviewed_at FROM job_companies WHERE id = ?", (company_id,)
            ).fetchone()
            if existing and not data.review_careers_link and existing["careers_url"] == careers:
                reviewed_at = existing["careers_link_reviewed_at"]
            connection.execute(
                """
                INSERT INTO job_companies
                    (id, name, industry, organization_type, headquarters, website_url,
                     careers_url, logo_url, careers_link_reviewed_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name, industry=excluded.industry,
                    organization_type=excluded.organization_type, headquarters=excluded.headquarters,
                    website_url=excluded.website_url, careers_url=excluded.careers_url,
                    logo_url=excluded.logo_url, careers_link_reviewed_at=excluded.careers_link_reviewed_at,
                    updated_at=excluded.updated_at
                """,
                (
                    company_id, data.name.strip(), data.industry.strip(), data.organization_type.strip(),
                    data.headquarters.strip(), website, careers, logo, reviewed_at, now, now,
                ),
            )
            row = connection.execute("SELECT * FROM job_companies WHERE id = ?", (company_id,)).fetchone()
        return {"company": _company_dict(row)}

    @router.get("/api/admin/jobs/listings")
    def admin_listings(
        status: str = Query(default="", max_length=20),
        user: dict = Depends(require_job_admin),
    ):
        with connection_factory() as connection:
            connection.execute(
                "UPDATE job_postings SET status = 'expired', updated_at = ? WHERE status = 'active' AND expires_at <= ?",
                (_timestamp(), _timestamp()),
            )
            if status and status not in {"pending", "active", "closed", "expired"}:
                raise HTTPException(status_code=422, detail="Unknown listing status.")
            query = JOB_SELECT + (" WHERE jobs.status = ?" if status else "") + " ORDER BY jobs.created_at DESC LIMIT 300"
            rows = connection.execute(query, (status,) if status else ()).fetchall()
        return {"jobs": [_job_dict(row) for row in rows]}

    @router.post("/api/admin/jobs/listings")
    def admin_create_listing(data: JobRequest, user: dict = Depends(require_job_admin_write)):
        if data.experience_max is not None and data.experience_max < data.experience_min:
            raise HTTPException(status_code=422, detail="Maximum experience cannot be lower than minimum experience.")
        if data.salary_min is not None and data.salary_max is not None and data.salary_max < data.salary_min:
            raise HTTPException(status_code=422, detail="Maximum salary cannot be lower than minimum salary.")
        expires_at = _parse_timestamp(data.expires_at)
        if expires_at <= _now():
            raise HTTPException(status_code=422, detail="A new listing must expire in the future.")
        application_url = _https_url(data.application_url, "Application link")
        source_url = _https_url(data.source_url, "Source link")
        now = _timestamp()
        with connection_factory() as connection:
            if connection.execute("SELECT 1 FROM job_companies WHERE id = ?", (data.company_id,)).fetchone() is None:
                raise HTTPException(status_code=404, detail="Company not found.")
            if connection.execute(
                "SELECT 1 FROM job_categories WHERE name = ? COLLATE NOCASE AND active = 1",
                (data.category.strip(),),
            ).fetchone() is None:
                raise HTTPException(status_code=422, detail="Choose an active job category.")
            duplicate = connection.execute(
                """
                SELECT id FROM job_postings
                WHERE company_id = ? AND title = ? COLLATE NOCASE AND city = ? COLLATE NOCASE
                  AND status IN ('pending', 'active')
                LIMIT 1
                """,
                (data.company_id, data.title.strip(), data.city.strip()),
            ).fetchone()
            if duplicate:
                raise HTTPException(status_code=409, detail="A pending or active listing for this company, role, and city already exists.")
            posted_at = _posted_timestamp(data.posted_at)
            cursor = connection.execute(
                """
                INSERT INTO job_postings
                    (company_id, title, category, description, city, state, work_mode,
                     employment_type, experience_min, experience_max, salary_min, salary_max,
                     required_education_json, skills_json, posted_at, expires_at, application_url,
                     source_url, source_name, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                (
                    data.company_id, data.title.strip(), data.category.strip(), data.description.strip(),
                    data.city.strip(), data.state.strip(), data.work_mode, data.employment_type,
                    data.experience_min, data.experience_max, data.salary_min, data.salary_max,
                    json.dumps(_clean_list(data.required_education)), json.dumps(_clean_list(data.skills)),
                    posted_at, _timestamp(expires_at), application_url, source_url, data.source_name.strip(),
                    now, now,
                ),
            )
            job_id = cursor.lastrowid
        return {"job_id": job_id, "status": "pending", "message": "Listing saved for review; it is not public until verified."}

    @router.post("/api/admin/jobs/listings/{job_id}/edit")
    def admin_edit_listing(job_id: int, data: JobRequest, user: dict = Depends(require_job_admin_write)):
        if data.experience_max is not None and data.experience_max < data.experience_min:
            raise HTTPException(status_code=422, detail="Maximum experience cannot be lower than minimum experience.")
        if data.salary_min is not None and data.salary_max is not None and data.salary_max < data.salary_min:
            raise HTTPException(status_code=422, detail="Maximum salary cannot be lower than minimum salary.")
        expires_at = _parse_timestamp(data.expires_at)
        if expires_at <= _now():
            raise HTTPException(status_code=422, detail="Listing expiry must be in the future.")
        now = _timestamp()
        with connection_factory() as connection:
            if connection.execute("SELECT 1 FROM job_companies WHERE id = ?", (data.company_id,)).fetchone() is None:
                raise HTTPException(status_code=404, detail="Company not found.")
            if connection.execute(
                "SELECT 1 FROM job_categories WHERE name = ? COLLATE NOCASE AND active = 1",
                (data.category.strip(),),
            ).fetchone() is None:
                raise HTTPException(status_code=422, detail="Choose an active job category.")
            duplicate = connection.execute(
                """
                SELECT id FROM job_postings
                WHERE company_id = ? AND title = ? COLLATE NOCASE AND city = ? COLLATE NOCASE
                  AND status IN ('pending', 'active') AND id <> ?
                LIMIT 1
                """,
                (data.company_id, data.title.strip(), data.city.strip(), job_id),
            ).fetchone()
            if duplicate:
                raise HTTPException(status_code=409, detail="A pending or active listing for this company, role, and city already exists.")
            result = connection.execute(
                """
                UPDATE job_postings SET company_id=?, title=?, category=?, description=?, city=?, state=?,
                    work_mode=?, employment_type=?, experience_min=?, experience_max=?, salary_min=?, salary_max=?,
                    required_education_json=?, skills_json=?, posted_at=?, expires_at=?, application_url=?,
                    source_url=?, source_name=?, status='pending', verified_at=NULL, verified_by=NULL, updated_at=?
                WHERE id=?
                """,
                (
                    data.company_id, data.title.strip(), data.category.strip(), data.description.strip(),
                    data.city.strip(), data.state.strip(), data.work_mode, data.employment_type,
                    data.experience_min, data.experience_max, data.salary_min, data.salary_max,
                    json.dumps(_clean_list(data.required_education)), json.dumps(_clean_list(data.skills)),
                    _posted_timestamp(data.posted_at),
                    _timestamp(expires_at), _https_url(data.application_url, "Application link"),
                    _https_url(data.source_url, "Source link"), data.source_name.strip(), now, job_id,
                ),
            )
            if not result.rowcount:
                raise HTTPException(status_code=404, detail="Job listing not found.")
        return {"job_id": job_id, "status": "pending", "message": "Edited listing returned to review."}

    @router.post("/api/admin/jobs/listings/{job_id}/review")
    def admin_review_listing(job_id: int, data: JobReviewRequest, user: dict = Depends(require_job_admin_write)):
        now = _timestamp()
        expires_at = data.expires_at
        verified_at = now if data.status == "active" else None
        if data.status == "active":
            if not expires_at:
                with connection_factory() as connection:
                    existing = connection.execute(
                        "SELECT expires_at FROM job_postings WHERE id = ?", (job_id,)
                    ).fetchone()
                if existing is None:
                    raise HTTPException(status_code=404, detail="Job listing not found.")
                expires_at = existing["expires_at"]
            if _parse_timestamp(expires_at) <= _now():
                raise HTTPException(status_code=422, detail="Verified listing expiry must be in the future.")
        with connection_factory() as connection:
            result = connection.execute(
                """
                UPDATE job_postings
                SET status=?, expires_at=COALESCE(?, expires_at), verified_at=?, verified_by=?, updated_at=?
                WHERE id=?
                """,
                (
                    data.status, _timestamp(_parse_timestamp(expires_at)) if expires_at else None,
                    verified_at, user["id"] if verified_at else None, now, job_id,
                ),
            )
            if not result.rowcount:
                raise HTTPException(status_code=404, detail="Job listing not found.")
        return {
            "job_id": job_id,
            "status": data.status,
            "verified_at": verified_at,
            "message": "Listing is now public." if data.status == "active" else "Listing is no longer public.",
        }

    @router.get("/api/admin/jobs/analytics")
    def admin_job_analytics(user: dict = Depends(require_job_admin)):
        with connection_factory() as connection:
            connection.execute(
                "UPDATE job_postings SET status = 'expired', updated_at = ? WHERE status = 'active' AND expires_at <= ?",
                (_timestamp(), _timestamp()),
            )
            rows = connection.execute(
                """
                SELECT companies.industry, jobs.status, COUNT(*) AS count
                FROM job_postings AS jobs JOIN job_companies AS companies ON companies.id=jobs.company_id
                GROUP BY companies.industry, jobs.status ORDER BY companies.industry
                """
            ).fetchall()
        return {
            "by_industry": [
                {"industry": row["industry"], "status": row["status"], "count": row["count"]}
                for row in rows
            ]
        }

    return router
