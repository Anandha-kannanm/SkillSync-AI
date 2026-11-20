import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from pydantic import ValidationError

TEST_DATABASE_DIRECTORY = tempfile.TemporaryDirectory()
os.environ["SKILLSYNC_DB_PATH"] = str(Path(TEST_DATABASE_DIRECTORY.name) / "test-skillsync.db")

from fastapi.testclient import TestClient

import main


ORIGIN = "http://localhost:5173"


class LearningPlatformAPITests(unittest.TestCase):
    def setUp(self):
        main.signup_attempts.clear()
        main.failed_logins.clear()
        self.client = TestClient(main.app)
        self.headers = {"Origin": ORIGIN}
        self.email = f"learner-{id(self)}@example.com"
        response = self.client.post(
            "/api/auth/signup",
            headers=self.headers,
            json={"name": "Test Learner", "email": self.email, "password": "secure-test-password"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.csrf = response.json()["user"]["csrf_token"]
        self.write_headers = {**self.headers, "X-CSRF-Token": self.csrf}

    def tearDown(self):
        self.client.close()

    def test_passwords_are_hashed_and_login_errors_are_generic(self):
        with main.get_connection() as connection:
            row = connection.execute("SELECT password_hash FROM users WHERE email = ?", (self.email,)).fetchone()
        self.assertTrue(row["password_hash"].startswith("scrypt$"))
        self.assertNotEqual(row["password_hash"], "secure-test-password")

        response = self.client.post(
            "/api/auth/login",
            headers=self.headers,
            json={"email": self.email, "password": "incorrect-password"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Email or password is incorrect.")

    def test_login_can_use_a_session_cookie_instead_of_a_persistent_cookie(self):
        response = self.client.post(
            "/api/auth/login",
            headers=self.headers,
            json={
                "email": self.email,
                "password": "secure-test-password",
                "remember_me": False,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn("max-age=", response.headers["set-cookie"].lower())

    def test_career_assistant_requires_auth_and_reports_missing_configuration(self):
        payload = {
            "message": "Which verified jobs match my skills?",
            "profile_context": {
                "education": "BCA",
                "degree": "BCA",
                "skills": ["Python", "SQL"],
                "experience_years": 0,
                "preferred_locations": ["Chennai"],
                "career_interests": ["Data Analyst"],
            },
            "job_context": [{
                "title": "Junior Data Analyst",
                "company_name": "Example Company",
                "location": "Chennai",
                "match_percent": 82,
                "why_it_matches": ["Python matches a required skill"],
            }],
        }
        anonymous = TestClient(main.app)
        try:
            response = anonymous.post(
                "/api/ai/career-assistant",
                headers=self.headers,
                json=payload,
            )
            self.assertEqual(response.status_code, 401)
        finally:
            anonymous.close()

        with patch.object(main, "client", None):
            response = self.client.post(
                "/api/ai/career-assistant",
                headers=self.write_headers,
                json=payload,
            )
        self.assertEqual(response.status_code, 503)
        self.assertIn("not configured", response.json()["detail"])

    def test_ai_language_is_validated_and_defaults_to_english(self):
        tutor = main.TutorRequest(
            question="Explain a variable.",
            lesson_title="Programming foundations",
            lesson_context="Variables store values.",
        )
        self.assertEqual(tutor.language, "English")
        localized_analysis = main.SkillRequest(career="Developer", skills="HTML", language="Tamil")
        self.assertEqual(localized_analysis.language, "Tamil")
        with self.assertRaises(ValidationError):
            main.TutorRequest(
                question="Explain a variable.",
                lesson_title="Programming foundations",
                lesson_context="Variables store values.",
                language="French",
            )

    def test_origin_and_csrf_protect_progress_writes(self):
        body = {"lesson_index": 0}
        response = self.client.post(
            "/api/courses/full-stack/lessons/0/complete",
            headers={"Origin": "https://untrusted.example", "X-CSRF-Token": self.csrf},
            json=body,
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            "/api/courses/full-stack/lessons/0/complete",
            headers=self.headers,
            json=body,
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            "/api/courses/full-stack/lessons/0/complete",
            headers=self.write_headers,
            json=body,
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["completed_lessons"], [0])

    def test_assessment_is_server_scored_and_certificate_requires_everything(self):
        before_lessons = self.client.get("/api/courses/full-stack/assessment")
        self.assertEqual(before_lessons.status_code, 409)

        skipped_lesson = self.client.post(
            "/api/courses/full-stack/lessons/1/complete",
            headers=self.write_headers,
            json={"lesson_index": 1},
        )
        self.assertEqual(skipped_lesson.status_code, 409)

        for lesson_index in range(6):
            response = self.client.post(
                f"/api/courses/full-stack/lessons/{lesson_index}/complete",
                headers=self.write_headers,
                json={"lesson_index": lesson_index},
            )
            self.assertEqual(response.status_code, 200, response.text)

        quiz_response = self.client.get("/api/courses/full-stack/assessment")
        self.assertEqual(quiz_response.status_code, 200)
        questions = quiz_response.json()["questions"]
        self.assertTrue(questions)
        self.assertNotIn("correct_index", questions[0])

        certificate_before_test = self.client.get("/api/courses/full-stack/certificate")
        self.assertEqual(certificate_before_test.status_code, 403)

        incorrect_answers = {
            f"full-stack-{index}": (2 - (index + 1) % 3) % 3
            for index in range(len(questions))
        }
        failed_attempt = self.client.post(
            "/api/courses/full-stack/assessment",
            headers=self.write_headers,
            json={"answers": incorrect_answers},
        )
        self.assertEqual(failed_attempt.status_code, 200, failed_attempt.text)
        self.assertEqual(failed_attempt.json()["percent"], 0)
        self.assertEqual(len(failed_attempt.json()["weak_topics"]), len(questions))

        correct_answers = {
            f"full-stack-{index}": (-(index + 1) % 3)
            for index in range(len(questions))
        }
        passed_attempt = self.client.post(
            "/api/courses/full-stack/assessment",
            headers=self.write_headers,
            json={"answers": correct_answers},
        )
        self.assertEqual(passed_attempt.status_code, 200, passed_attempt.text)
        self.assertEqual(passed_attempt.json()["percent"], 100)
        self.assertTrue(passed_attempt.json()["progress"]["certificate_unlocked"])

        certificate = self.client.get("/api/courses/full-stack/certificate")
        self.assertEqual(certificate.status_code, 200, certificate.text)
        self.assertEqual(certificate.json()["learner_name"], "Test Learner")

    def test_course_data_is_private_and_logout_revokes_session(self):
        unauthenticated = TestClient(main.app)
        try:
            response = unauthenticated.get("/api/courses/full-stack/progress")
            self.assertEqual(response.status_code, 401)
        finally:
            unauthenticated.close()

        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["user"]["email"], self.email)
        self.assertEqual(me.json()["user"]["csrf_token"], self.csrf)

        logout = self.client.post("/api/auth/logout", headers=self.write_headers)
        self.assertEqual(logout.status_code, 200)
        after_logout = self.client.get("/api/auth/me")
        self.assertEqual(after_logout.status_code, 401)

    def test_company_directory_has_no_fake_active_jobs(self):
        companies = self.client.get("/api/jobs/companies")
        self.assertEqual(companies.status_code, 200)
        self.assertTrue(any(item["name"] == "Zoho" for item in companies.json()["companies"]))

        jobs = self.client.get("/api/jobs")
        self.assertEqual(jobs.status_code, 200)
        self.assertEqual(jobs.json()["jobs"], [])
        self.assertIn("No active, verified listings", jobs.json()["message"])

    def test_verified_job_matching_alerts_and_user_tracking(self):
        expiry = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        job = {
            "company_id": "zoho",
            "title": "Data Analyst",
            "category": "Data Analyst",
            "description": "Analyze business data using SQL and Python.",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "work_mode": "Office",
            "employment_type": "Full-time",
            "experience_min": 0,
            "experience_max": 1,
            "salary_min": 400000,
            "salary_max": 700000,
            "required_education": ["BCA"],
            "skills": ["Python", "SQL", "Excel"],
            "expires_at": expiry,
            "application_url": "https://www.zoho.com/careers/",
            "source_url": "https://www.zoho.com/careers/",
            "source_name": "Company careers page",
        }
        with patch.dict(os.environ, {"JOB_ADMIN_EMAILS": self.email}):
            created = self.client.post(
                "/api/admin/jobs/listings",
                headers=self.write_headers,
                json=job,
            )
            self.assertEqual(created.status_code, 200, created.text)
            job_id = created.json()["job_id"]
            duplicate = self.client.post(
                "/api/admin/jobs/listings",
                headers=self.write_headers,
                json=job,
            )
            self.assertEqual(duplicate.status_code, 409)

            pending_public = self.client.get("/api/jobs")
            self.assertEqual(pending_public.json()["jobs"], [])

            verified = self.client.post(
                f"/api/admin/jobs/listings/{job_id}/review",
                headers=self.write_headers,
                json={"status": "active"},
            )
            self.assertEqual(verified.status_code, 200, verified.text)
            self.assertIsNotNone(verified.json()["verified_at"])

        filtered = self.client.get(
            "/api/jobs?company_id=zoho&city=Chennai&education=BCA&min_salary=500000&max_experience=1&skills=SQL&organization_type=Private"
        )
        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertEqual(filtered.json()["total"], 1)
        government_only = self.client.get("/api/jobs?organization_type=Government")
        self.assertEqual(government_only.json()["jobs"], [])

        profile = {
            "education": "BCA",
            "degree": "BCA",
            "skills": ["Python", "SQL"],
            "experience_years": 0,
            "preferred_locations": ["Chennai"],
            "career_interests": ["Data Analyst"],
            "alerts_enabled": True,
            "minimum_match_percent": 70,
        }
        saved_profile = self.client.post(
            "/api/jobs/profile",
            headers=self.write_headers,
            json=profile,
        )
        self.assertEqual(saved_profile.status_code, 200, saved_profile.text)

        recommendations = self.client.get("/api/jobs/recommendations")
        self.assertEqual(recommendations.status_code, 200, recommendations.text)
        recommendation = recommendations.json()["recommendations"][0]
        self.assertEqual(recommendation["job"]["id"], job_id)
        self.assertIn("Excel", recommendation["missing_skills"])
        self.assertGreaterEqual(recommendation["match_percent"], 70)
        self.assertIn("/courses/data-analyst", recommendation["learning_path"]["url"])
        self.assertIn("not a hiring", recommendation["score_note"])

        self.assertEqual(len(self.client.get("/api/jobs/alerts").json()["alerts"]), 1)
        self.client.get("/api/jobs/recommendations")
        self.assertEqual(len(self.client.get("/api/jobs/alerts").json()["alerts"]), 1)

        toggle_saved = self.client.post(
            f"/api/jobs/{job_id}/save",
            headers=self.write_headers,
            json={"saved": True},
        )
        self.assertEqual(toggle_saved.status_code, 200)
        self.assertEqual(len(self.client.get("/api/jobs/saved").json()["jobs"]), 1)

        other = TestClient(main.app)
        try:
            other_signup = other.post(
                "/api/auth/signup",
                headers=self.headers,
                json={
                    "name": "Second Learner",
                    "email": f"second-{id(self)}@example.com",
                    "password": "secure-second-password",
                },
            )
            self.assertEqual(other_signup.status_code, 200)
            self.assertEqual(other.get("/api/jobs/saved").json()["jobs"], [])
            self.assertEqual(other.get("/api/jobs/applications").json()["applications"], [])
        finally:
            other.close()

        applied = self.client.post(
            f"/api/jobs/{job_id}/application",
            headers=self.write_headers,
            json={"status": "applied"},
        )
        self.assertEqual(applied.status_code, 200)
        self.assertTrue(applied.json()["user_reported"])
        self.assertEqual(self.client.get("/api/jobs/applications").json()["applications"][0]["status"], "applied")

        dismissed = self.client.post(
            f"/api/jobs/alerts/{job_id}/dismiss",
            headers=self.write_headers,
        )
        self.assertEqual(dismissed.status_code, 200)
        self.assertEqual(self.client.get("/api/jobs/alerts").json()["alerts"], [])

        with main.get_connection() as connection:
            connection.execute(
                "UPDATE job_postings SET expires_at = ? WHERE id = ?",
                ((datetime.now(timezone.utc) - timedelta(days=1)).isoformat(), job_id),
            )
        self.assertEqual(self.client.get("/api/jobs").json()["jobs"], [])
        with main.get_connection() as connection:
            status = connection.execute(
                "SELECT status FROM job_postings WHERE id = ?", (job_id,)
            ).fetchone()["status"]
        self.assertEqual(status, "expired")

    def test_job_profile_is_private_and_admin_routes_are_restricted(self):
        with patch.dict(os.environ, {"JOB_ADMIN_EMAILS": ""}):
            summary = self.client.get("/api/admin/jobs/summary")
        self.assertEqual(summary.status_code, 403)
        categories = self.client.get("/api/jobs/categories")
        self.assertIn("Data Analyst", categories.json()["categories"])

        other = TestClient(main.app)
        try:
            response = other.post(
                "/api/auth/signup",
                headers=self.headers,
                json={
                    "name": "Other Learner",
                    "email": f"other-{id(self)}@example.com",
                    "password": "secure-other-password",
                },
            )
            self.assertEqual(response.status_code, 200)
            profile = other.get("/api/jobs/profile")
            self.assertEqual(profile.status_code, 200)
            self.assertEqual(profile.json()["profile"]["skills"], [])
            self.assertEqual(profile.json()["profile"]["resume_text"], "")

            other_user_id = response.json()["user"]["id"]
            with patch.dict(os.environ, {"JOB_ADMIN_EMAILS": self.email}):
                users = self.client.get("/api/admin/jobs/users")
                self.assertEqual(users.status_code, 200)
                self.assertTrue(any(item["id"] == other_user_id for item in users.json()["users"]))
                category = self.client.post(
                    "/api/admin/jobs/categories",
                    headers=self.write_headers,
                    json={"name": "Quality Assurance", "active": True},
                )
                self.assertEqual(category.status_code, 200, category.text)
                disabled_category = self.client.post(
                    "/api/admin/jobs/categories",
                    headers=self.write_headers,
                    json={"name": "Quality Assurance", "active": False},
                )
                self.assertEqual(disabled_category.status_code, 200)
                self.assertNotIn("Quality Assurance", self.client.get("/api/jobs/categories").json()["categories"])
                disabled = self.client.post(
                    f"/api/admin/jobs/users/{other_user_id}/status",
                    headers=self.write_headers,
                    json={"active": False},
                )
                self.assertEqual(disabled.status_code, 200)
                self.assertEqual(
                    self.client.post(
                        f"/api/admin/jobs/users/{self.client.get('/api/auth/me').json()['user']['id']}/status",
                        headers=self.write_headers,
                        json={"active": False},
                    ).status_code,
                    422,
                )
            self.assertEqual(other.get("/api/auth/me").status_code, 401)
            disabled_login = other.post(
                "/api/auth/login",
                headers=self.headers,
                json={
                    "email": f"other-{id(self)}@example.com",
                    "password": "secure-other-password",
                },
            )
            self.assertEqual(disabled_login.status_code, 401)
        finally:
            other.close()


if __name__ == "__main__":
    unittest.main()
