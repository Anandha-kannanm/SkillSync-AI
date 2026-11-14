import os
import tempfile
import unittest
from pathlib import Path

from pydantic import ValidationError

TEST_DATABASE_DIRECTORY = tempfile.TemporaryDirectory()
os.environ["SKILLSYNC_DB_PATH"] = str(Path(TEST_DATABASE_DIRECTORY.name) / "test-skillsync.db")

from fastapi.testclient import TestClient

import main


ORIGIN = "http://localhost:5173"


class LearningPlatformAPITests(unittest.TestCase):
    def setUp(self):
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


if __name__ == "__main__":
    unittest.main()
