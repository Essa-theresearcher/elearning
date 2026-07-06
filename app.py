#!/usr/bin/env python3
import json
import mimetypes
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from socketserver import ThreadingTCPServer
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://") :]
APP_HOST = os.environ.get("APP_HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8765"))
USE_POSTGRES = bool(DATABASE_URL)
LESSON_SLUG = os.environ.get("LESSON_SLUG", "cs-fundamentals-lesson-1")
COOKIE_NAME = os.environ.get("COOKIE_NAME", "dba_student_id")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "").lower() in {"1", "true", "yes"}


def sqlite_db_path():
    raw_path = os.environ.get("SQLITE_DB_PATH", "data/learning_ms.sqlite3")
    path = Path(raw_path)
    if not path.is_absolute():
        path = ROOT / path
    return path


DB_PATH = sqlite_db_path()


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_sql(sql):
    if USE_POSTGRES:
        return sql.replace("?", "%s")
    return sql


def db_execute(conn, sql, params=()):
    return conn.execute(db_sql(sql), params)


def connect_db():
    if USE_POSTGRES:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as exc:
            raise RuntimeError(
                "PostgreSQL requires psycopg. Install dependencies with "
                "`pip install -r requirements.txt`."
            ) from exc

        return psycopg.connect(DATABASE_URL, row_factory=dict_row)

    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    if USE_POSTGRES:
        with connect_db() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS lesson_progress (
                    student_id TEXT NOT NULL,
                    lesson_slug TEXT NOT NULL,
                    completed_sections TEXT NOT NULL DEFAULT '[]',
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (student_id, lesson_slug)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS activity_submissions (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    lesson_slug TEXT NOT NULL,
                    answers TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS quiz_results (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    lesson_slug TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    total_questions INTEGER NOT NULL,
                    category_breakdown TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
        return

    with connect_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS lesson_progress (
                student_id TEXT NOT NULL,
                lesson_slug TEXT NOT NULL,
                completed_sections TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL,
                PRIMARY KEY (student_id, lesson_slug)
            );

            CREATE TABLE IF NOT EXISTS activity_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                lesson_slug TEXT NOT NULL,
                answers TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS quiz_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                lesson_slug TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                category_breakdown TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


class LearningHandler(SimpleHTTPRequestHandler):
    server_version = "LearningMS/1.0"

    def translate_path(self, path):
        parsed = urlparse(path)
        request_path = parsed.path
        if request_path == "/":
            request_path = "/index.html"

        relative = Path(request_path.lstrip("/"))
        target = (ROOT / relative).resolve()
        if ROOT not in target.parents and target != ROOT:
            return str(ROOT / "index.html")
        return str(target)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/progress/lesson":
            self.handle_get_lesson_progress(parsed)
            return
        if parsed.path == "/api/progress":
            self.handle_get_progress_summary()
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/progress/lesson":
            self.handle_post_lesson_progress()
            return
        if parsed.path == "/api/progress/activity":
            self.handle_post_activity()
            return
        if parsed.path == "/api/progress/quiz":
            self.handle_post_quiz()
            return
        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def guess_type(self, path):
        if path.endswith(".pdf"):
            return "application/pdf"
        if path.endswith(".js"):
            return "text/javascript"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def current_student_id(self):
        cookie_header = self.headers.get("Cookie", "")
        cookies = SimpleCookie(cookie_header)
        morsel = cookies.get(COOKIE_NAME)
        if morsel and morsel.value:
            return morsel.value, False
        return str(uuid.uuid4()), True

    def read_json_body(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = 0
        if size <= 0:
            return {}
        raw = self.rfile.read(size)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON body")

    def send_json(self, payload, status=HTTPStatus.OK, student_id=None, set_cookie=False):
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if set_cookie and student_id:
            secure = "; Secure" if COOKIE_SECURE else ""
            self.send_header(
                "Set-Cookie",
                f"{COOKIE_NAME}={student_id}; Path=/; SameSite=Lax; HttpOnly; "
                f"Max-Age=31536000{secure}",
            )
        self.end_headers()
        self.wfile.write(body)

    def handle_get_lesson_progress(self, parsed):
        student_id, set_cookie = self.current_student_id()
        params = parse_qs(parsed.query)
        lesson_slug = params.get("lessonSlug", [LESSON_SLUG])[0] or LESSON_SLUG

        with connect_db() as conn:
            row = db_execute(
                conn,
                """
                SELECT completed_sections, updated_at
                FROM lesson_progress
                WHERE student_id = ? AND lesson_slug = ?
                """,
                (student_id, lesson_slug),
            ).fetchone()

        completed_sections = []
        updated_at = None
        if row:
            completed_sections = json.loads(row["completed_sections"])
            updated_at = row["updated_at"]

        self.send_json(
            {
                "studentId": student_id,
                "lessonSlug": lesson_slug,
                "completedSections": completed_sections,
                "updatedAt": updated_at,
            },
            student_id=student_id,
            set_cookie=set_cookie,
        )

    def handle_get_progress_summary(self):
        student_id, set_cookie = self.current_student_id()
        with connect_db() as conn:
            lesson_rows = db_execute(
                conn,
                """
                SELECT lesson_slug, completed_sections, updated_at
                FROM lesson_progress
                WHERE student_id = ?
                ORDER BY updated_at DESC
                """,
                (student_id,),
            ).fetchall()
            activity_count = db_execute(
                conn,
                "SELECT COUNT(*) AS count FROM activity_submissions WHERE student_id = ?",
                (student_id,),
            ).fetchone()["count"]
            quiz_count = db_execute(
                conn,
                "SELECT COUNT(*) AS count FROM quiz_results WHERE student_id = ?",
                (student_id,),
            ).fetchone()["count"]
            latest_quiz = db_execute(
                conn,
                """
                SELECT lesson_slug, score, total_questions, created_at
                FROM quiz_results
                WHERE student_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """,
                (student_id,),
            ).fetchone()

        self.send_json(
            {
                "studentId": student_id,
                "lessons": [
                    {
                        "lessonSlug": row["lesson_slug"],
                        "completedSections": json.loads(row["completed_sections"]),
                        "updatedAt": row["updated_at"],
                    }
                    for row in lesson_rows
                ],
                "activitySubmissionCount": activity_count,
                "quizResultCount": quiz_count,
                "latestQuiz": dict(latest_quiz) if latest_quiz else None,
            },
            student_id=student_id,
            set_cookie=set_cookie,
        )

    def handle_post_lesson_progress(self):
        student_id, set_cookie = self.current_student_id()
        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        lesson_slug = data.get("lessonSlug") or LESSON_SLUG
        completed_sections = data.get("completedSections")
        if not isinstance(completed_sections, list) or not all(
            isinstance(item, str) for item in completed_sections
        ):
            self.send_json(
                {"error": "completedSections must be a list of strings"},
                HTTPStatus.BAD_REQUEST,
            )
            return

        completed_json = json.dumps(sorted(set(completed_sections)))
        updated_at = utc_now()
        with connect_db() as conn:
            db_execute(
                conn,
                """
                INSERT INTO lesson_progress (
                    student_id, lesson_slug, completed_sections, updated_at
                )
                VALUES (?, ?, ?, ?)
                ON CONFLICT(student_id, lesson_slug)
                DO UPDATE SET
                    completed_sections = excluded.completed_sections,
                    updated_at = excluded.updated_at
                """,
                (student_id, lesson_slug, completed_json, updated_at),
            )

        self.send_json(
            {
                "ok": True,
                "studentId": student_id,
                "lessonSlug": lesson_slug,
                "completedSections": json.loads(completed_json),
                "updatedAt": updated_at,
            },
            student_id=student_id,
            set_cookie=set_cookie,
        )

    def handle_post_activity(self):
        student_id, set_cookie = self.current_student_id()
        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        lesson_slug = data.get("lessonSlug") or LESSON_SLUG
        answers = data.get("answers")
        if not isinstance(answers, dict):
            self.send_json({"error": "answers must be an object"}, HTTPStatus.BAD_REQUEST)
            return

        created_at = utc_now()
        with connect_db() as conn:
            if USE_POSTGRES:
                cursor = db_execute(
                    conn,
                    """
                    INSERT INTO activity_submissions (
                        student_id, lesson_slug, answers, created_at
                    )
                    VALUES (?, ?, ?, ?)
                    RETURNING id
                    """,
                    (student_id, lesson_slug, json.dumps(answers), created_at),
                )
                submission_id = cursor.fetchone()["id"]
            else:
                cursor = db_execute(
                    conn,
                    """
                    INSERT INTO activity_submissions (
                        student_id, lesson_slug, answers, created_at
                    )
                    VALUES (?, ?, ?, ?)
                    """,
                    (student_id, lesson_slug, json.dumps(answers), created_at),
                )
                submission_id = cursor.lastrowid

        self.send_json(
            {
                "ok": True,
                "studentId": student_id,
                "lessonSlug": lesson_slug,
                "submissionId": submission_id,
                "createdAt": created_at,
            },
            status=HTTPStatus.CREATED,
            student_id=student_id,
            set_cookie=set_cookie,
        )

    def handle_post_quiz(self):
        student_id, set_cookie = self.current_student_id()
        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        lesson_slug = data.get("lessonSlug") or LESSON_SLUG
        try:
            score = int(data.get("score"))
            total_questions = int(data.get("totalQuestions"))
        except (TypeError, ValueError):
            self.send_json(
                {"error": "score and totalQuestions must be numbers"},
                HTTPStatus.BAD_REQUEST,
            )
            return

        category_breakdown = data.get("categoryBreakdown")
        if not isinstance(category_breakdown, dict):
            self.send_json(
                {"error": "categoryBreakdown must be an object"},
                HTTPStatus.BAD_REQUEST,
            )
            return

        created_at = utc_now()
        with connect_db() as conn:
            if USE_POSTGRES:
                cursor = db_execute(
                    conn,
                    """
                    INSERT INTO quiz_results (
                        student_id, lesson_slug, score, total_questions,
                        category_breakdown, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    RETURNING id
                    """,
                    (
                        student_id,
                        lesson_slug,
                        score,
                        total_questions,
                        json.dumps(category_breakdown),
                        created_at,
                    ),
                )
                result_id = cursor.fetchone()["id"]
            else:
                cursor = db_execute(
                    conn,
                    """
                    INSERT INTO quiz_results (
                        student_id, lesson_slug, score, total_questions,
                        category_breakdown, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        student_id,
                        lesson_slug,
                        score,
                        total_questions,
                        json.dumps(category_breakdown),
                        created_at,
                    ),
                )
                result_id = cursor.lastrowid

        self.send_json(
            {
                "ok": True,
                "studentId": student_id,
                "lessonSlug": lesson_slug,
                "resultId": result_id,
                "score": score,
                "totalQuestions": total_questions,
                "createdAt": created_at,
            },
            status=HTTPStatus.CREATED,
            student_id=student_id,
            set_cookie=set_cookie,
        )


class LearningServer(ThreadingTCPServer):
    allow_reuse_address = True


def main():
    init_db()
    with LearningServer((APP_HOST, PORT), LearningHandler) as httpd:
        print(f"Learning MS backend running at http://{APP_HOST}:{PORT}/")
        if USE_POSTGRES:
            print("PostgreSQL database: configured by DATABASE_URL")
        else:
            print(f"SQLite database: {DB_PATH}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
