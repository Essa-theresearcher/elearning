#!/usr/bin/env python3
import cgi
import hashlib
import hmac
import json
import mimetypes
import os
import shutil
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
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
APP_HOST = os.environ.get("APP_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8765"))
USE_POSTGRES = bool(DATABASE_URL)
LESSON_SLUG = os.environ.get("LESSON_SLUG", "cs-fundamentals-lesson-1")
COOKIE_NAME = os.environ.get("COOKIE_NAME", "dba_student_id")
AUTH_COOKIE_NAME = os.environ.get("AUTH_COOKIE_NAME", "dba_session")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "").lower() in {"1", "true", "yes"}
REQUIRE_LOGIN = os.environ.get("REQUIRE_LOGIN", "1").lower() not in {"0", "false", "no"}
ALLOW_SIGNUP = os.environ.get("ALLOW_SIGNUP", "0").lower() not in {"0", "false", "no"}
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "30"))
SYSTEM_ADMIN_USERNAME = os.environ.get("SYSTEM_ADMIN_USERNAME", "admin").strip().lower()
SYSTEM_ADMIN_PASSWORD = os.environ.get("SYSTEM_ADMIN_PASSWORD", "adminchangeme123")
SYSTEM_ADMIN_DISPLAY_NAME = os.environ.get("SYSTEM_ADMIN_DISPLAY_NAME", "Admin").strip() or "Admin"
TEACHER_USERNAME = os.environ.get(
    "TEACHER_USERNAME",
    os.environ.get("ADMIN_USERNAME", "teacher"),
).strip().lower()
TEACHER_PASSWORD = os.environ.get(
    "TEACHER_PASSWORD",
    os.environ.get("ADMIN_PASSWORD", "changeme123"),
)
TEACHER_DISPLAY_NAME = (
    os.environ.get("TEACHER_DISPLAY_NAME")
    or os.environ.get("ADMIN_DISPLAY_NAME")
    or "Teacher"
).strip() or "Teacher"
STUDENT_USERNAME = os.environ.get("STUDENT_USERNAME", "student").strip().lower()
STUDENT_PASSWORD = os.environ.get("STUDENT_PASSWORD", "changeme123")
STUDENT_DISPLAY_NAME = os.environ.get("STUDENT_DISPLAY_NAME", "Student").strip() or "Student"
DIRECT_ACCESS_STUDENT_USERNAMES_RAW = os.environ.get(
    "DIRECT_ACCESS_STUDENT_USERNAMES",
    "zakariya",
)
PASSWORD_ITERATIONS = 260_000
MIN_PASSWORD_LENGTH = 8
VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".ogg"}
RESOURCE_TYPES = {"class", "reading", "video", "link", "assignment", "download", "other"}
MAX_VIDEO_UPLOAD_BYTES = int(os.environ.get("MAX_VIDEO_UPLOAD_MB", "250")) * 1024 * 1024
LESSONS = {
    "intermediate-readiness-week": {
        "title": "Week 0 Python Readiness Assessment",
        "section_ids": ["welcome", "reading", "quiz", "project", "wrapup"],
        "prerequisite": None,
        "requires_activity_submission": True,
        "video_dir": os.environ.get("WEEK0_VIDEO_DIR", "assets/videos/week0"),
        "recording_segments": [],
    },
    "cs-fundamentals-lesson-1": {
        "title": "How Computers Actually Work",
        "section_ids": ["welcome", "video", "reading", "activity", "quiz", "wrapup"],
        "prerequisite": "intermediate-readiness-week",
        "video_dir": os.environ.get("LESSON1_VIDEO_DIR", "assets/videos/lesson1"),
        "recording_segments": [
            {
                "part": 1,
                "title": "Welcome & Why This Lesson Matters",
                "duration": "~4 min",
                "slug": "welcome-why-this-lesson-matters",
            },
            {
                "part": 2,
                "title": "What Is a Computer, Really?",
                "duration": "~9 min",
                "slug": "what-is-a-computer-really",
            },
            {
                "part": 3,
                "title": "Everything Is Just Numbers: Binary",
                "duration": "~11 min",
                "slug": "binary",
            },
            {
                "part": 4,
                "title": "From Your Code to a Running Program",
                "duration": "~11 min",
                "slug": "code-to-running-program",
            },
            {
                "part": 5,
                "title": "How Python Actually Stores Your Variables",
                "duration": "~12 min",
                "slug": "python-variables-memory",
            },
            {
                "part": 6,
                "title": "The Operating System's Role",
                "duration": "~9 min",
                "slug": "operating-system-role",
            },
            {
                "part": 7,
                "title": "Wrap-Up: The Full Journey",
                "duration": "~5 min",
                "slug": "wrap-up-full-journey",
            },
        ],
    },
    "internet-fundamentals-lesson-2": {
        "title": "How the Internet Actually Works",
        "section_ids": ["welcome", "video", "reading", "activity", "quiz", "wrapup"],
        "prerequisite": "cs-fundamentals-lesson-1",
        "video_dir": os.environ.get("LESSON2_VIDEO_DIR", "assets/videos/lesson2"),
        "recording_segments": [
            {
                "part": 1,
                "title": "Welcome & Framing",
                "duration": "~5 min",
                "slug": "welcome-framing",
            },
            {
                "part": 2,
                "title": "Names & Addresses: IP Addresses and DNS",
                "duration": "~20 min",
                "slug": "names-addresses-dns",
            },
            {
                "part": 3,
                "title": "The Request-Response Cycle",
                "duration": "~20 min",
                "slug": "request-response-cycle",
            },
            {
                "part": 4,
                "title": "Data Travels in Packets",
                "duration": "~20 min",
                "slug": "packets-routing",
            },
            {
                "part": 5,
                "title": "Servers, Ports, and APIs",
                "duration": "~15 min",
                "slug": "servers-ports-apis",
            },
            {
                "part": 6,
                "title": "HTTPS and Encryption",
                "duration": "~15 min",
                "slug": "https-encryption",
            },
            {
                "part": 7,
                "title": "Summary: The Full Journey",
                "duration": "~15 min",
                "slug": "summary-full-journey",
            },
        ],
    },
    "data-storage-lesson-3": {
        "title": "How Databases Actually Store Your Data",
        "section_ids": ["welcome", "video", "reading", "activity", "quiz", "wrapup"],
        "prerequisite": "internet-fundamentals-lesson-2",
        "video_dir": os.environ.get("LESSON3_VIDEO_DIR", "assets/videos/lesson3"),
        "recording_segments": [
            {
                "part": 1,
                "title": "Welcome & Why Databases Matter",
                "duration": "~5 min",
                "slug": "welcome-why-databases-matter",
            },
            {
                "part": 2,
                "title": "Tables, Rows, Columns, and Keys",
                "duration": "~20 min",
                "slug": "tables-rows-columns-keys",
            },
            {
                "part": 3,
                "title": "CRUD and SQL Thinking",
                "duration": "~20 min",
                "slug": "crud-sql-thinking",
            },
            {
                "part": 4,
                "title": "Relationships and Normalization",
                "duration": "~20 min",
                "slug": "relationships-normalization",
            },
            {
                "part": 5,
                "title": "Indexes and Query Speed",
                "duration": "~15 min",
                "slug": "indexes-query-speed",
            },
            {
                "part": 6,
                "title": "Reliability, Backups, and Permissions",
                "duration": "~15 min",
                "slug": "reliability-backups-permissions",
            },
            {
                "part": 7,
                "title": "Summary: The Full Data Journey",
                "duration": "~15 min",
                "slug": "summary-full-data-journey",
            },
        ],
    },
    "web-applications-lesson-4": {
        "title": "How Web Applications Actually Work",
        "section_ids": ["welcome", "video", "reading", "activity", "quiz", "wrapup"],
        "prerequisite": "data-storage-lesson-3",
        "video_dir": os.environ.get("LESSON4_VIDEO_DIR", "assets/videos/lesson4"),
        "recording_segments": [
            {
                "part": 1,
                "title": "Welcome & Full-App Framing",
                "duration": "~5 min",
                "slug": "welcome-full-app-framing",
            },
            {
                "part": 2,
                "title": "Frontend: What the User Touches",
                "duration": "~20 min",
                "slug": "frontend-user-actions",
            },
            {
                "part": 3,
                "title": "Backend Routes and APIs",
                "duration": "~20 min",
                "slug": "backend-routes-apis",
            },
            {
                "part": 4,
                "title": "Database Integration",
                "duration": "~20 min",
                "slug": "database-integration",
            },
            {
                "part": 5,
                "title": "Login, Sessions, and Roles",
                "duration": "~15 min",
                "slug": "login-sessions-roles",
            },
            {
                "part": 6,
                "title": "Deployment, Domains, and Environment",
                "duration": "~15 min",
                "slug": "deployment-domains-environment",
            },
            {
                "part": 7,
                "title": "Summary: The Full Web App Journey",
                "duration": "~15 min",
                "slug": "summary-full-web-app-journey",
            },
        ],
    },
}

COURSES = {
    "computer-fundamentals": {
        "title": "Computer Fundamentals",
        "category": "Technology",
        "status": "open",
        "image": "assets/school/icon-coding.png",
        "entry_path": "prework.html",
        "price_label": "Manual checkout",
        "description": (
            "Understand how computers, memory, operating systems, and the "
            "internet, databases, and web applications actually work before "
            "deeper programming lessons."
        ),
        "highlights": [
            "Week 0 readiness assessment",
            "How Computers Actually Work",
            "How the Internet Actually Works",
            "How Databases Actually Store Your Data",
            "How Web Applications Actually Work",
        ],
        "lesson_slugs": [
            "intermediate-readiness-week",
            "cs-fundamentals-lesson-1",
            "internet-fundamentals-lesson-2",
            "data-storage-lesson-3",
            "web-applications-lesson-4",
        ],
    },
    "python-fundamentals": {
        "title": "Python Fundamentals",
        "category": "Programming",
        "status": "planned",
        "image": "assets/school/icon-coding.png",
        "entry_path": "",
        "price_label": "Manual checkout",
        "description": (
            "A beginner-friendly path for students who need Python foundations "
            "before intermediate work."
        ),
        "highlights": [
            "Variables and data types",
            "Control flow and functions",
            "Lists, dictionaries, and files",
        ],
        "lesson_slugs": [],
    },
    "web-development-coding": {
        "title": "Web Development & Coding",
        "category": "Coding",
        "status": "planned",
        "image": "assets/school/icon-rocket.png",
        "entry_path": "",
        "price_label": "Manual checkout",
        "description": (
            "Build practical websites and learn the programming logic behind "
            "interactive web apps."
        ),
        "highlights": [
            "HTML and CSS",
            "JavaScript fundamentals",
            "Projects and problem solving",
        ],
        "lesson_slugs": [],
    },
    "data-it-skills": {
        "title": "Data & IT Skills",
        "category": "IT",
        "status": "planned",
        "image": "assets/school/icon-networking.png",
        "entry_path": "",
        "price_label": "Manual checkout",
        "description": (
            "Learn practical digital, analytical, networking, and computer "
            "systems skills for modern workplaces."
        ),
        "highlights": [
            "Data analysis and visualization",
            "Networking fundamentals",
            "Computer systems basics",
        ],
        "lesson_slugs": [],
    },
    "graphic-design-creativity": {
        "title": "Graphic Design & Creativity",
        "category": "Design",
        "status": "planned",
        "image": "assets/school/icon-design.png",
        "entry_path": "",
        "price_label": "Manual checkout",
        "description": (
            "Practice visual communication through branding, layout, and "
            "creative digital tools."
        ),
        "highlights": [
            "Canva and Photoshop basics",
            "Logo and brand design",
            "Creative project work",
        ],
        "lesson_slugs": [],
    },
    "digital-marketing": {
        "title": "Digital Marketing",
        "category": "Marketing",
        "status": "planned",
        "image": "assets/school/icon-data.png",
        "entry_path": "",
        "price_label": "Manual checkout",
        "description": (
            "Plan and publish online campaigns with content, social media, "
            "search, and brand strategy."
        ),
        "highlights": [
            "Social media strategy",
            "Content creation",
            "SEO and online branding",
        ],
        "lesson_slugs": [],
    },
    "mobile-app-development": {
        "title": "Mobile App Development",
        "category": "Apps",
        "status": "planned",
        "image": "assets/school/icon-people.png",
        "entry_path": "",
        "price_label": "Manual checkout",
        "description": (
            "Learn the structure, design thinking, and practical steps behind "
            "mobile application projects."
        ),
        "highlights": [
            "Android development",
            "iOS basics",
            "User experience",
        ],
        "lesson_slugs": [],
    },
    "english-communication": {
        "title": "English & Communication",
        "category": "Communication",
        "status": "planned",
        "image": "assets/school/icon-graduation.png",
        "entry_path": "",
        "price_label": "Manual checkout",
        "description": (
            "Build confidence for speaking, writing, interviews, "
            "presentations, and workplace communication."
        ),
        "highlights": [
            "Business English",
            "Presentation skills",
            "Interview preparation",
        ],
        "lesson_slugs": [],
    },
}


def sqlite_db_path():
    raw_path = os.environ.get("SQLITE_DB_PATH", "data/learning_ms.sqlite3")
    path = Path(raw_path)
    if not path.is_absolute():
        path = ROOT / path
    return path


DB_PATH = sqlite_db_path()


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def utc_from_now(days):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat(
        timespec="seconds"
    )


def normalize_username(username):
    return (username or "").strip().lower()


def direct_access_student_usernames():
    usernames = []
    for username in DIRECT_ACCESS_STUDENT_USERNAMES_RAW.split(","):
        normalized = normalize_username(username)
        if normalized and normalized not in usernames:
            usernames.append(normalized)
    return usernames


def parse_json_field(raw_value, fallback):
    if raw_value in (None, ""):
        return fallback
    try:
        return json.loads(raw_value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return fallback


def public_user(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "username": row["username"],
        "displayName": row["display_name"],
        "role": row["role"],
    }


def public_student(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "username": row["username"],
        "displayName": row["display_name"],
        "role": row["role"],
        "createdAt": row["created_at"],
    }


def public_resource(row):
    if not row:
        return None
    lesson_slug = row["lesson_slug"]
    return {
        "id": row["id"],
        "lessonSlug": lesson_slug,
        "lessonTitle": lesson_config(lesson_slug).get("title", lesson_slug),
        "title": row["title"],
        "resourceType": row["resource_type"],
        "url": row["url"],
        "description": row["description"],
        "createdBy": row["created_by"],
        "createdAt": row["created_at"],
    }


def public_course(slug, config):
    return {
        "slug": slug,
        "title": config["title"],
        "category": config["category"],
        "status": config["status"],
        "image": config["image"],
        "entryPath": config["entry_path"],
        "priceLabel": config["price_label"],
        "description": config["description"],
        "highlights": list(config["highlights"]),
        "lessonSlugs": list(config["lesson_slugs"]),
    }


def course_summaries():
    return [public_course(slug, config) for slug, config in COURSES.items()]


def course_for_lesson(lesson_slug):
    for slug, config in COURSES.items():
        if lesson_slug in config.get("lesson_slugs", []):
            return slug
    return None


def public_enrollment(row):
    if not row:
        return None
    course_slug = row["course_slug"]
    course = COURSES.get(course_slug, {})
    result = {
        "id": row["id"],
        "studentId": row["student_id"],
        "courseSlug": course_slug,
        "courseTitle": course.get("title", course_slug),
        "status": row["status"],
        "paymentReference": row["payment_reference"],
        "paymentNote": row["payment_note"],
        "requestedAt": row["requested_at"],
        "reviewedAt": row["reviewed_at"],
    }
    if "student_username" in row.keys():
        result["studentUsername"] = row["student_username"]
    if "student_display_name" in row.keys():
        result["studentDisplayName"] = row["student_display_name"]
    if "reviewed_by_username" in row.keys():
        result["reviewedByUsername"] = row["reviewed_by_username"]
    return result


def public_lesson_progress(row):
    if not row:
        return None
    lesson_slug = row["lesson_slug"]
    return {
        "studentId": row["student_id"],
        "lessonSlug": lesson_slug,
        "lessonTitle": lesson_config(lesson_slug).get("title", lesson_slug),
        "completedSections": parse_json_field(row["completed_sections"], []),
        "updatedAt": row["updated_at"],
    }


def public_activity_submission(row):
    if not row:
        return None
    lesson_slug = row["lesson_slug"]
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "lessonSlug": lesson_slug,
        "lessonTitle": lesson_config(lesson_slug).get("title", lesson_slug),
        "answers": parse_json_field(row["answers"], {}),
        "createdAt": row["created_at"],
    }


def public_quiz_result(row):
    if not row:
        return None
    lesson_slug = row["lesson_slug"]
    answer_details = row["answer_details"] if "answer_details" in row.keys() else "[]"
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "lessonSlug": lesson_slug,
        "lessonTitle": lesson_config(lesson_slug).get("title", lesson_slug),
        "score": row["score"],
        "totalQuestions": row["total_questions"],
        "categoryBreakdown": parse_json_field(row["category_breakdown"], {}),
        "answerDetails": parse_json_field(answer_details, []),
        "createdAt": row["created_at"],
    }


def is_admin_role(role):
    return role == "admin"


def is_teacher_role(role):
    return role == "teacher"


def is_staff_role(role):
    return role in {"admin", "teacher"}


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password, stored_hash):
    try:
        algorithm, iterations, salt, expected = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations),
        ).hex()
    except (AttributeError, TypeError, ValueError):
        return False
    return hmac.compare_digest(digest, expected)


def validate_new_user(username, display_name, password):
    username = normalize_username(username)
    display_name = (display_name or username).strip()
    password = password or ""

    if len(username) < 3 or len(username) > 80:
        return None, None, "Username must be between 3 and 80 characters."
    if not all(char.isalnum() or char in {"_", "-", ".", "@"} for char in username):
        return None, None, "Username can only use letters, numbers, _, -, ., and @."
    if len(display_name) < 1 or len(display_name) > 120:
        return None, None, "Display name must be between 1 and 120 characters."
    if len(password) < MIN_PASSWORD_LENGTH:
        return None, None, f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    return username, display_name, None


def validate_password(password):
    password = password or ""
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    return None


def validate_resource_payload(data):
    lesson_slug = (data.get("lessonSlug") or "").strip()
    title = (data.get("title") or "").strip()
    resource_type = (data.get("resourceType") or "link").strip().lower()
    url = (data.get("url") or "").strip()
    description = (data.get("description") or "").strip()

    if lesson_slug not in LESSONS:
        return None, "Choose a valid lesson."
    if len(title) < 2 or len(title) > 160:
        return None, "Resource title must be between 2 and 160 characters."
    if resource_type not in RESOURCE_TYPES:
        return None, "Choose a valid resource type."
    if len(url) < 3 or len(url) > 2048:
        return None, "Resource URL is required."

    parsed = urlparse(url)
    if parsed.scheme and parsed.scheme not in {"http", "https"}:
        return None, "Resource URL must use http or https."
    if not parsed.scheme and not url.startswith("/"):
        return None, "Use a full https link or a site path that starts with /."
    if len(description) > 500:
        return None, "Description must be 500 characters or less."

    return {
        "lesson_slug": lesson_slug,
        "title": title,
        "resource_type": resource_type,
        "url": url,
        "description": description,
    }, None


def validate_checkout_payload(data):
    raw_slugs = data.get("courseSlugs")
    if not isinstance(raw_slugs, list):
        raw_slugs = []

    course_slugs = []
    for slug in raw_slugs:
        slug = (slug or "").strip()
        if slug and slug not in course_slugs:
            course_slugs.append(slug)

    if not course_slugs:
        return None, "Add at least one course to the cart."
    invalid_slugs = [slug for slug in course_slugs if slug not in COURSES]
    if invalid_slugs:
        return None, "One or more courses are not available."

    payment_reference = (data.get("paymentReference") or "").strip()
    payment_note = (data.get("paymentNote") or "").strip()
    if len(payment_reference) > 120:
        return None, "Payment reference must be 120 characters or less."
    if len(payment_note) > 500:
        return None, "Payment note must be 500 characters or less."

    return {
        "course_slugs": course_slugs,
        "payment_reference": payment_reference,
        "payment_note": payment_note,
    }, None


def display_name_from_file(path):
    name = path.stem.replace("_", " ").replace("-", " ").strip()
    return " ".join(word.capitalize() for word in name.split()) or path.name


def recording_part_from_file(path):
    digits = []
    for char in path.stem:
        if not char.isdigit():
            break
        digits.append(char)
    if not digits:
        return None
    try:
        return int("".join(digits))
    except ValueError:
        return None


def video_filename_for_part(lesson_slug, part, extension):
    config = lesson_config(lesson_slug)
    segments = config.get("recording_segments", [])
    slug = None
    for segment in segments:
        if segment.get("part") == part:
            slug = segment.get("slug")
            break
    if not slug:
        slug = f"part-{part}"
    return f"{part:02d}-{slug}{extension}"


def lesson_config(lesson_slug):
    return (
        LESSONS.get(lesson_slug)
        or LESSONS.get(LESSON_SLUG)
        or next(iter(LESSONS.values()))
    )


def lesson_summaries():
    return [
        {
            "slug": slug,
            "title": config.get("title", slug),
            "prerequisite": config.get("prerequisite"),
            "recordingSegments": [
                dict(segment) for segment in config.get("recording_segments", [])
            ],
        }
        for slug, config in LESSONS.items()
    ]


def video_dir_path(lesson_slug):
    path = Path(lesson_config(lesson_slug)["video_dir"])
    if not path.is_absolute():
        path = ROOT / path
    return path.resolve()


def list_lesson_recordings(lesson_slug):
    video_path = video_dir_path(lesson_slug)
    recording_segments = lesson_config(lesson_slug)["recording_segments"]
    files = []
    if not video_path.exists() or not video_path.is_dir():
        files = []
    elif ROOT in video_path.parents or video_path == ROOT:
        files = [
            path
            for path in sorted(video_path.iterdir(), key=lambda item: item.name.lower())
            if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
        ]

    numbered_files = {}
    unnumbered_files = []
    for path in files:
        part = recording_part_from_file(path)
        if part and part not in numbered_files:
            numbered_files[part] = path
        else:
            unnumbered_files.append(path)

    recordings = []
    used_paths = set()
    unnumbered_index = 0
    for index, segment in enumerate(recording_segments):
        item = dict(segment)
        path = numbered_files.get(segment["part"])
        if not path:
            while unnumbered_index < len(unnumbered_files):
                candidate = unnumbered_files[unnumbered_index]
                unnumbered_index += 1
                if candidate not in used_paths:
                    path = candidate
                    break
        item["name"] = f"Part {segment['part']}: {segment['title']}"
        item["uploaded"] = bool(path)
        item["fileName"] = None
        item["url"] = None
        item["size"] = None

        if path:
            used_paths.add(path)
            relative_path = path.relative_to(ROOT).as_posix()
            item["fileName"] = path.name
            item["url"] = "/" + relative_path
            item["size"] = path.stat().st_size

        recordings.append(item)

    for path in files:
        if path in used_paths:
            continue
        relative_path = path.relative_to(ROOT).as_posix()
        part = len(recordings) + 1
        title = display_name_from_file(path)
        recordings.append(
            {
                "part": part,
                "title": title,
                "duration": "",
                "slug": title.lower().replace(" ", "-"),
                "name": f"Part {part}: {title}",
                "uploaded": True,
                "fileName": path.name,
                "url": "/" + relative_path,
                "size": path.stat().st_size,
            }
        )
    return recordings


def course_access_status(conn, student_id, course_slug):
    course = COURSES.get(course_slug)
    if not course:
        return None

    row = db_execute(
        conn,
        """
        SELECT id, student_id, course_slug, status, payment_reference,
            payment_note, requested_at, reviewed_by, reviewed_at
        FROM course_enrollments
        WHERE student_id = ? AND course_slug = ?
        """,
        (student_id, course_slug),
    ).fetchone()

    return {
        "course": public_course(course_slug, course),
        "enrollment": public_enrollment(row) if row else None,
        "approved": bool(row and row["status"] == "approved"),
    }


def grant_course_enrollment(
    conn,
    student_id,
    course_slug="computer-fundamentals",
    reviewed_by=None,
    payment_reference="Admin grant",
    payment_note="Granted by admin",
):
    if course_slug not in COURSES:
        raise ValueError("Choose a valid course.")
    reviewed_at = utc_now()
    requested_at = reviewed_at
    db_execute(
        conn,
        """
        INSERT INTO course_enrollments (
            student_id, course_slug, status, payment_reference, payment_note,
            requested_at, reviewed_by, reviewed_at
        )
        VALUES (?, ?, 'approved', ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, course_slug)
        DO UPDATE SET
            status = 'approved',
            payment_reference = excluded.payment_reference,
            payment_note = excluded.payment_note,
            reviewed_by = excluded.reviewed_by,
            reviewed_at = excluded.reviewed_at
        """,
        (
            student_id,
            course_slug,
            payment_reference,
            payment_note,
            requested_at,
            reviewed_by,
            reviewed_at,
        ),
    )
    return db_execute(
        conn,
        """
        SELECT id, student_id, course_slug, status, payment_reference,
            payment_note, requested_at, reviewed_by, reviewed_at
        FROM course_enrollments
        WHERE student_id = ? AND course_slug = ?
        """,
        (student_id, course_slug),
    ).fetchone()


def grant_direct_access_students(conn):
    usernames = direct_access_student_usernames()
    if not usernames:
        return

    placeholders = ", ".join("?" for _ in usernames)
    rows = db_execute(
        conn,
        f"""
        SELECT id, username
        FROM app_users
        WHERE role = 'student' AND username IN ({placeholders})
        """,
        tuple(usernames),
    ).fetchall()

    for student in rows:
        grant_course_enrollment(
            conn,
            student["id"],
            course_slug="computer-fundamentals",
            payment_reference="Direct student access",
            payment_note="Bypasses checkout approval",
        )

    if rows:
        granted = ", ".join(row["username"] for row in rows)
        print(f"Granted Computer Fundamentals direct access to: {granted}")


def lesson_access_status(conn, student_id, lesson_slug):
    config = lesson_config(lesson_slug)
    course_slug = course_for_lesson(lesson_slug)
    if course_slug:
        course_status = course_access_status(conn, student_id, course_slug)
        if course_status and not course_status["approved"]:
            return {
                "lessonSlug": lesson_slug,
                "unlocked": False,
                "course": course_status,
                "prerequisite": None,
            }

    prerequisite_slug = config.get("prerequisite")
    if not prerequisite_slug:
        return {
            "lessonSlug": lesson_slug,
            "unlocked": True,
            "course": course_access_status(conn, student_id, course_slug) if course_slug else None,
            "prerequisite": None,
        }

    prerequisite = lesson_config(prerequisite_slug)
    required_sections = prerequisite.get("section_ids", [])
    progress_row = db_execute(
        conn,
        """
        SELECT completed_sections, updated_at
        FROM lesson_progress
        WHERE student_id = ? AND lesson_slug = ?
        """,
        (student_id, prerequisite_slug),
    ).fetchone()

    completed_sections = []
    updated_at = None
    if progress_row:
        completed_sections = json.loads(progress_row["completed_sections"])
        updated_at = progress_row["updated_at"]

    completed_set = set(completed_sections)
    missing_sections = [
        section for section in required_sections if section not in completed_set
    ]
    quiz_count = db_execute(
        conn,
        """
        SELECT COUNT(*) AS count
        FROM quiz_results
        WHERE student_id = ? AND lesson_slug = ?
        """,
        (student_id, prerequisite_slug),
    ).fetchone()["count"]
    quiz_completed = quiz_count > 0
    requires_activity_submission = prerequisite.get("requires_activity_submission", False)
    activity_count = 0
    if requires_activity_submission:
        activity_count = db_execute(
            conn,
            """
            SELECT COUNT(*) AS count
            FROM activity_submissions
            WHERE student_id = ? AND lesson_slug = ?
            """,
            (student_id, prerequisite_slug),
        ).fetchone()["count"]
    activity_completed = not requires_activity_submission or activity_count > 0
    unlocked = not missing_sections and quiz_completed and activity_completed

    return {
        "lessonSlug": lesson_slug,
        "unlocked": unlocked,
        "course": course_access_status(conn, student_id, course_slug) if course_slug else None,
        "prerequisite": {
            "lessonSlug": prerequisite_slug,
            "title": prerequisite.get("title", prerequisite_slug),
            "completedSections": completed_sections,
            "requiredSections": required_sections,
            "missingSections": missing_sections,
            "quizCompleted": quiz_completed,
            "quizResultCount": quiz_count,
            "activityCompleted": activity_completed,
            "activitySubmissionCount": activity_count,
            "requiresActivitySubmission": requires_activity_submission,
            "updatedAt": updated_at,
        },
    }


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


def seed_user_if_missing(conn, username, display_name, password, role):
    existing = db_execute(
        conn,
        "SELECT id FROM app_users WHERE username = ?",
        (username,),
    ).fetchone()
    if existing:
        return

    username, display_name, error = validate_new_user(
        username,
        display_name,
        password,
    )
    if error:
        raise RuntimeError(f"Invalid default {role} account: {error}")

    db_execute(
        conn,
        """
        INSERT INTO app_users (
            id, username, display_name, password_hash, role, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            str(uuid.uuid4()),
            username,
            display_name,
            hash_password(password),
            role,
            utc_now(),
        ),
    )
    print(f"Seeded {role} account. Username: {username}")


def seed_default_accounts(conn):
    seed_user_if_missing(
        conn,
        SYSTEM_ADMIN_USERNAME,
        SYSTEM_ADMIN_DISPLAY_NAME,
        SYSTEM_ADMIN_PASSWORD,
        "admin",
    )
    seed_user_if_missing(
        conn,
        TEACHER_USERNAME,
        TEACHER_DISPLAY_NAME,
        TEACHER_PASSWORD,
        "teacher",
    )
    seed_user_if_missing(
        conn,
        STUDENT_USERNAME,
        STUDENT_DISPLAY_NAME,
        STUDENT_PASSWORD,
        "student",
    )
    grant_direct_access_students(conn)
    if SYSTEM_ADMIN_PASSWORD == "adminchangeme123":
        print("Default admin password is adminchangeme123. Change SYSTEM_ADMIN_PASSWORD in production.")
    if TEACHER_PASSWORD == "changeme123":
        print("Default teacher password is changeme123. Change TEACHER_PASSWORD in production.")
    if STUDENT_PASSWORD == "changeme123":
        print("Default student password is changeme123. Change STUDENT_PASSWORD in production.")


def ensure_schema_migrations(conn):
    if USE_POSTGRES:
        conn.execute(
            """
            ALTER TABLE quiz_results
            ADD COLUMN IF NOT EXISTS answer_details TEXT NOT NULL DEFAULT '[]'
            """
        )
        return

    columns = conn.execute("PRAGMA table_info(quiz_results)").fetchall()
    column_names = {row["name"] for row in columns}
    if "answer_details" not in column_names:
        conn.execute(
            "ALTER TABLE quiz_results ADD COLUMN answer_details TEXT NOT NULL DEFAULT '[]'"
        )


def init_db():
    if USE_POSTGRES:
        with connect_db() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS app_users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    display_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'student',
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS auth_sessions (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                )
                """
            )
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
                    answer_details TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS lesson_resources (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    lesson_slug TEXT NOT NULL,
                    title TEXT NOT NULL,
                    resource_type TEXT NOT NULL,
                    url TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_by TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS course_enrollments (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    student_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                    course_slug TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    payment_reference TEXT NOT NULL DEFAULT '',
                    payment_note TEXT NOT NULL DEFAULT '',
                    requested_at TEXT NOT NULL,
                    reviewed_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
                    reviewed_at TEXT,
                    UNIQUE (student_id, course_slug)
                )
                """
            )
            ensure_schema_migrations(conn)
            seed_default_accounts(conn)
        return

    with connect_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS app_users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );

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
                answer_details TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lesson_resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lesson_slug TEXT NOT NULL,
                title TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                url TEXT NOT NULL,
                description TEXT NOT NULL,
                created_by TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS course_enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                course_slug TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                payment_reference TEXT NOT NULL DEFAULT '',
                payment_note TEXT NOT NULL DEFAULT '',
                requested_at TEXT NOT NULL,
                reviewed_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
                reviewed_at TEXT,
                UNIQUE (student_id, course_slug)
            );
            """
        )
        ensure_schema_migrations(conn)
        seed_default_accounts(conn)


class LearningHandler(SimpleHTTPRequestHandler):
    server_version = "LearningMS/1.0"

    def translate_path(self, path):
        parsed = urlparse(path)
        request_path = parsed.path
        if request_path == "/":
            request_path = "/home.html"
        if request_path == "/teacher.html":
            request_path = "/admin.html"

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
        if parsed.path in {"/health", "/api/health"}:
            self.handle_health()
            return
        if parsed.path == "/api/auth/me":
            self.handle_auth_me()
            return
        if parsed.path == "/api/catalog":
            self.handle_get_catalog()
            return
        if parsed.path == "/api/enrollments":
            self.handle_get_student_enrollments()
            return
        if parsed.path == "/api/admin/students":
            self.handle_admin_students()
            return
        if parsed.path == "/api/admin/student-work":
            self.handle_admin_student_work()
            return
        if parsed.path == "/api/admin/teachers":
            self.handle_admin_teachers()
            return
        if parsed.path == "/api/admin/enrollments":
            self.handle_admin_enrollments()
            return
        if parsed.path == "/api/admin/resources":
            self.handle_admin_resources(parsed)
            return
        if parsed.path == "/api/resources":
            self.handle_get_resources(parsed)
            return
        if parsed.path == "/api/recordings":
            self.handle_get_recordings(parsed)
            return
        if parsed.path == "/api/lesson-access":
            self.handle_get_lesson_access(parsed)
            return
        if parsed.path == "/api/progress/lesson":
            self.handle_get_lesson_progress(parsed)
            return
        if parsed.path == "/api/progress":
            self.handle_get_progress_summary()
            return
        super().do_GET()

    def handle_health(self):
        self.send_json(
            {
                "ok": True,
                "service": "learning-ms",
                "database": "postgresql" if USE_POSTGRES else "sqlite",
                "time": utc_now(),
            }
        )

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth/login":
            self.handle_auth_login()
            return
        if parsed.path == "/api/auth/register":
            self.handle_auth_register()
            return
        if parsed.path == "/api/auth/logout":
            self.handle_auth_logout()
            return
        if parsed.path == "/api/auth/change-password":
            self.handle_auth_change_password()
            return
        if parsed.path == "/api/checkout":
            self.handle_checkout()
            return
        if parsed.path == "/api/admin/students":
            self.handle_admin_create_student()
            return
        if parsed.path == "/api/admin/teachers":
            self.handle_admin_create_teacher()
            return
        if parsed.path == "/api/admin/users/password":
            self.handle_admin_update_user_password()
            return
        if parsed.path == "/api/admin/enrollments/review":
            self.handle_admin_review_enrollment()
            return
        if parsed.path == "/api/admin/enrollments/grant":
            self.handle_admin_grant_enrollment()
            return
        if parsed.path == "/api/admin/resources":
            self.handle_admin_create_resource()
            return
        if parsed.path == "/api/admin/videos/upload":
            self.handle_admin_upload_video()
            return
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

    def current_session_token(self):
        cookie_header = self.headers.get("Cookie", "")
        cookies = SimpleCookie(cookie_header)
        morsel = cookies.get(AUTH_COOKIE_NAME)
        if morsel and morsel.value:
            return morsel.value
        return None

    def current_user(self):
        token = self.current_session_token()
        if not token:
            return None

        now = utc_now()
        with connect_db() as conn:
            row = db_execute(
                conn,
                """
                SELECT
                    app_users.id,
                    app_users.username,
                    app_users.display_name,
                    app_users.role,
                    auth_sessions.expires_at
                FROM auth_sessions
                JOIN app_users ON app_users.id = auth_sessions.user_id
                WHERE auth_sessions.token = ?
                """,
                (token,),
            ).fetchone()
            if not row:
                return None
            if row["expires_at"] <= now:
                db_execute(conn, "DELETE FROM auth_sessions WHERE token = ?", (token,))
                return None
            return row

    def current_admin_user(self):
        user = self.current_user()
        if user and is_admin_role(user["role"]):
            return user
        return None

    def current_staff_user(self):
        user = self.current_user()
        if user and is_staff_role(user["role"]):
            return user
        return None

    def current_student_user(self):
        user = self.current_user()
        if user and user["role"] == "student":
            return user
        return None

    def create_auth_session(self, user_id):
        token = secrets.token_urlsafe(32)
        with connect_db() as conn:
            db_execute(
                conn,
                """
                INSERT INTO auth_sessions (token, user_id, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                """,
                (token, user_id, utc_now(), utc_from_now(SESSION_DAYS)),
            )
        return token

    def delete_current_session(self):
        token = self.current_session_token()
        if not token:
            return
        with connect_db() as conn:
            db_execute(conn, "DELETE FROM auth_sessions WHERE token = ?", (token,))

    def current_student_id(self):
        user = self.current_user()
        if user:
            return user["id"], False
        if REQUIRE_LOGIN:
            return None, False

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

    def send_json(
        self,
        payload,
        status=HTTPStatus.OK,
        student_id=None,
        set_cookie=False,
        auth_token=None,
        clear_auth_cookie=False,
    ):
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
        if auth_token:
            secure = "; Secure" if COOKIE_SECURE else ""
            self.send_header(
                "Set-Cookie",
                f"{AUTH_COOKIE_NAME}={auth_token}; Path=/; SameSite=Lax; HttpOnly; "
                f"Max-Age={SESSION_DAYS * 86400}{secure}",
            )
        if clear_auth_cookie:
            secure = "; Secure" if COOKIE_SECURE else ""
            self.send_header(
                "Set-Cookie",
                f"{AUTH_COOKIE_NAME}=; Path=/; SameSite=Lax; HttpOnly; "
                f"Max-Age=0{secure}",
            )
        self.end_headers()
        self.wfile.write(body)

    def send_auth_required(self):
        self.send_json({"error": "Login required"}, HTTPStatus.UNAUTHORIZED)

    def send_admin_required(self):
        self.send_json({"error": "Admin login required"}, HTTPStatus.FORBIDDEN)

    def send_staff_required(self):
        self.send_json({"error": "Teacher or admin login required"}, HTTPStatus.FORBIDDEN)

    def send_lesson_locked(self, status):
        self.send_json(
            {
                "error": "Lesson locked",
                "lessonSlug": status["lessonSlug"],
                "course": status.get("course"),
                "prerequisite": status["prerequisite"],
            },
            HTTPStatus.LOCKED,
        )

    def is_lesson_unlocked(self, student_id, lesson_slug):
        user = self.current_user()
        if user and is_staff_role(user["role"]):
            return {
                "lessonSlug": lesson_slug,
                "unlocked": True,
                "prerequisite": None,
                "adminBypass": True,
            }
        with connect_db() as conn:
            return lesson_access_status(conn, student_id, lesson_slug)

    def handle_auth_me(self):
        user = self.current_user()
        self.send_json(
            {
                "authenticated": bool(user),
                "user": public_user(user),
                "allowSignup": ALLOW_SIGNUP,
            }
        )

    def handle_auth_login(self):
        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        username = normalize_username(data.get("username"))
        password = data.get("password") or ""
        login_role = (data.get("loginRole") or "").strip().lower()
        with connect_db() as conn:
            user = db_execute(
                conn,
                """
                SELECT id, username, display_name, password_hash, role
                FROM app_users
                WHERE username = ?
                """,
                (username,),
            ).fetchone()

        if not user or not verify_password(password, user["password_hash"]):
            self.send_json(
                {"error": "Incorrect username or password."},
                HTTPStatus.UNAUTHORIZED,
            )
            return

        if login_role == "student" and user["role"] != "student":
            self.send_json(
                {"error": "This is a staff account. Use Teacher or Admin login."},
                HTTPStatus.FORBIDDEN,
            )
            return
        if login_role == "teacher" and not is_teacher_role(user["role"]):
            if is_admin_role(user["role"]):
                self.send_json(
                    {"error": "This is an admin account. Use Admin login."},
                    HTTPStatus.FORBIDDEN,
                )
                return
            self.send_json(
                {"error": "This is a student account. Use Student login."},
                HTTPStatus.FORBIDDEN,
            )
            return
        if login_role == "admin" and not is_admin_role(user["role"]):
            if is_teacher_role(user["role"]):
                self.send_json(
                    {"error": "This is a teacher account. Use Teacher login."},
                    HTTPStatus.FORBIDDEN,
                )
                return
            self.send_json(
                {"error": "This is a student account. Use Student login."},
                HTTPStatus.FORBIDDEN,
            )
            return

        token = self.create_auth_session(user["id"])
        self.send_json(
            {
                "authenticated": True,
                "user": public_user(user),
                "allowSignup": ALLOW_SIGNUP,
            },
            auth_token=token,
        )

    def handle_auth_register(self):
        if not ALLOW_SIGNUP:
            self.send_json({"error": "Sign up is disabled."}, HTTPStatus.FORBIDDEN)
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        username, display_name, error = validate_new_user(
            data.get("username"),
            data.get("displayName"),
            data.get("password"),
        )
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return

        user_id = str(uuid.uuid4())
        with connect_db() as conn:
            existing_user = db_execute(
                conn,
                "SELECT id FROM app_users WHERE username = ?",
                (username,),
            ).fetchone()
            if existing_user:
                self.send_json(
                    {"error": "That username is already in use."},
                    HTTPStatus.CONFLICT,
                )
                return

            db_execute(
                conn,
                """
                INSERT INTO app_users (
                    id, username, display_name, password_hash, role, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    username,
                    display_name,
                    hash_password(data.get("password") or ""),
                    "student",
                    utc_now(),
                ),
            )

        token = self.create_auth_session(user_id)
        self.send_json(
            {
                "authenticated": True,
                "user": {
                    "id": user_id,
                    "username": username,
                    "displayName": display_name,
                    "role": "student",
                },
                "allowSignup": ALLOW_SIGNUP,
            },
            status=HTTPStatus.CREATED,
            auth_token=token,
        )

    def handle_auth_logout(self):
        self.delete_current_session()
        self.send_json(
            {"authenticated": False, "user": None, "allowSignup": ALLOW_SIGNUP},
            clear_auth_cookie=True,
        )

    def handle_auth_change_password(self):
        user = self.current_user()
        if not user:
            self.send_auth_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        current_password = data.get("currentPassword") or ""
        new_password = data.get("newPassword") or ""
        error = validate_password(new_password)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return

        token = self.current_session_token()
        with connect_db() as conn:
            row = db_execute(
                conn,
                "SELECT password_hash FROM app_users WHERE id = ?",
                (user["id"],),
            ).fetchone()
            if not row or not verify_password(current_password, row["password_hash"]):
                self.send_json(
                    {"error": "Current password is incorrect."},
                    HTTPStatus.UNAUTHORIZED,
                )
                return

            db_execute(
                conn,
                "UPDATE app_users SET password_hash = ? WHERE id = ?",
                (hash_password(new_password), user["id"]),
            )
            db_execute(
                conn,
                "DELETE FROM auth_sessions WHERE user_id = ? AND token != ?",
                (user["id"], token),
            )

        self.send_json({"ok": True, "user": public_user(user)})

    def handle_get_catalog(self):
        user = self.current_student_user()
        enrollments = []
        if user:
            with connect_db() as conn:
                rows = db_execute(
                    conn,
                    """
                    SELECT id, student_id, course_slug, status, payment_reference,
                        payment_note, requested_at, reviewed_by, reviewed_at
                    FROM course_enrollments
                    WHERE student_id = ?
                    ORDER BY requested_at DESC, id DESC
                    """,
                    (user["id"],),
                ).fetchall()
                enrollments = [public_enrollment(row) for row in rows]

        self.send_json(
            {
                "courses": course_summaries(),
                "enrollments": enrollments,
                "user": public_user(user),
            }
        )

    def handle_get_student_enrollments(self):
        student = self.current_student_user()
        if not student:
            if self.current_user():
                self.send_json(
                    {"error": "Student login required."},
                    HTTPStatus.FORBIDDEN,
                )
            else:
                self.send_auth_required()
            return

        with connect_db() as conn:
            rows = db_execute(
                conn,
                """
                SELECT id, student_id, course_slug, status, payment_reference,
                    payment_note, requested_at, reviewed_by, reviewed_at
                FROM course_enrollments
                WHERE student_id = ?
                ORDER BY requested_at DESC, id DESC
                """,
                (student["id"],),
            ).fetchall()

        self.send_json(
            {
                "student": public_user(student),
                "enrollments": [public_enrollment(row) for row in rows],
            }
        )

    def handle_checkout(self):
        student = self.current_student_user()
        if not student:
            if self.current_user():
                self.send_json(
                    {"error": "Only student accounts can checkout courses."},
                    HTTPStatus.FORBIDDEN,
                )
            else:
                self.send_auth_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        checkout, error = validate_checkout_payload(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return

        requested_at = utc_now()
        enrollments = []
        with connect_db() as conn:
            for course_slug in checkout["course_slugs"]:
                existing = db_execute(
                    conn,
                    """
                    SELECT id, student_id, course_slug, status, payment_reference,
                        payment_note, requested_at, reviewed_by, reviewed_at
                    FROM course_enrollments
                    WHERE student_id = ? AND course_slug = ?
                    """,
                    (student["id"], course_slug),
                ).fetchone()

                if existing and existing["status"] == "approved":
                    enrollments.append(public_enrollment(existing))
                    continue

                if existing:
                    db_execute(
                        conn,
                        """
                        UPDATE course_enrollments
                        SET status = 'pending',
                            payment_reference = ?,
                            payment_note = ?,
                            requested_at = ?,
                            reviewed_by = NULL,
                            reviewed_at = NULL
                        WHERE id = ?
                        """,
                        (
                            checkout["payment_reference"],
                            checkout["payment_note"],
                            requested_at,
                            existing["id"],
                        ),
                    )
                    enrollment_id = existing["id"]
                elif USE_POSTGRES:
                    cursor = db_execute(
                        conn,
                        """
                        INSERT INTO course_enrollments (
                            student_id, course_slug, status, payment_reference,
                            payment_note, requested_at
                        )
                        VALUES (?, ?, 'pending', ?, ?, ?)
                        RETURNING id
                        """,
                        (
                            student["id"],
                            course_slug,
                            checkout["payment_reference"],
                            checkout["payment_note"],
                            requested_at,
                        ),
                    )
                    enrollment_id = cursor.fetchone()["id"]
                else:
                    cursor = db_execute(
                        conn,
                        """
                        INSERT INTO course_enrollments (
                            student_id, course_slug, status, payment_reference,
                            payment_note, requested_at
                        )
                        VALUES (?, ?, 'pending', ?, ?, ?)
                        """,
                        (
                            student["id"],
                            course_slug,
                            checkout["payment_reference"],
                            checkout["payment_note"],
                            requested_at,
                        ),
                    )
                    enrollment_id = cursor.lastrowid

                row = db_execute(
                    conn,
                    """
                    SELECT id, student_id, course_slug, status, payment_reference,
                        payment_note, requested_at, reviewed_by, reviewed_at
                    FROM course_enrollments
                    WHERE id = ?
                    """,
                    (enrollment_id,),
                ).fetchone()
                enrollments.append(public_enrollment(row))

        self.send_json(
            {
                "ok": True,
                "student": public_user(student),
                "enrollments": enrollments,
            },
            status=HTTPStatus.CREATED,
        )

    def handle_admin_enrollments(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        with connect_db() as conn:
            rows = db_execute(
                conn,
                """
                SELECT
                    ce.id,
                    ce.student_id,
                    ce.course_slug,
                    ce.status,
                    ce.payment_reference,
                    ce.payment_note,
                    ce.requested_at,
                    ce.reviewed_by,
                    ce.reviewed_at,
                    student.username AS student_username,
                    student.display_name AS student_display_name,
                    reviewer.username AS reviewed_by_username
                FROM course_enrollments ce
                JOIN app_users student ON student.id = ce.student_id
                LEFT JOIN app_users reviewer ON reviewer.id = ce.reviewed_by
                ORDER BY
                    CASE ce.status
                        WHEN 'pending' THEN 0
                        WHEN 'approved' THEN 1
                        ELSE 2
                    END,
                    ce.requested_at DESC,
                    ce.id DESC
                """
            ).fetchall()

        self.send_json(
            {
                "enrollments": [public_enrollment(row) for row in rows],
                "courses": course_summaries(),
                "admin": public_user(admin),
            }
        )

    def handle_admin_review_enrollment(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        try:
            enrollment_id = int(data.get("enrollmentId"))
        except (TypeError, ValueError):
            self.send_json({"error": "Enrollment is required."}, HTTPStatus.BAD_REQUEST)
            return

        status = (data.get("status") or "").strip().lower()
        if status not in {"approved", "rejected"}:
            self.send_json(
                {"error": "Status must be approved or rejected."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        reviewed_at = utc_now()
        with connect_db() as conn:
            existing = db_execute(
                conn,
                "SELECT id FROM course_enrollments WHERE id = ?",
                (enrollment_id,),
            ).fetchone()
            if not existing:
                self.send_json(
                    {"error": "Enrollment request not found."},
                    HTTPStatus.NOT_FOUND,
                )
                return

            db_execute(
                conn,
                """
                UPDATE course_enrollments
                SET status = ?,
                    reviewed_by = ?,
                    reviewed_at = ?
                WHERE id = ?
                """,
                (status, admin["id"], reviewed_at, enrollment_id),
            )
            row = db_execute(
                conn,
                """
                SELECT
                    ce.id,
                    ce.student_id,
                    ce.course_slug,
                    ce.status,
                    ce.payment_reference,
                    ce.payment_note,
                    ce.requested_at,
                    ce.reviewed_by,
                    ce.reviewed_at,
                    student.username AS student_username,
                    student.display_name AS student_display_name,
                    reviewer.username AS reviewed_by_username
                FROM course_enrollments ce
                JOIN app_users student ON student.id = ce.student_id
                LEFT JOIN app_users reviewer ON reviewer.id = ce.reviewed_by
                WHERE ce.id = ?
                """,
                (enrollment_id,),
            ).fetchone()

        self.send_json({"ok": True, "enrollment": public_enrollment(row)})

    def handle_admin_grant_enrollment(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        user_id = (data.get("userId") or "").strip()
        course_slug = (data.get("courseSlug") or "computer-fundamentals").strip()
        if course_slug not in COURSES:
            self.send_json({"error": "Choose a valid course."}, HTTPStatus.BAD_REQUEST)
            return
        if not user_id:
            self.send_json({"error": "Student is required."}, HTTPStatus.BAD_REQUEST)
            return

        with connect_db() as conn:
            student = db_execute(
                conn,
                """
                SELECT id, username, display_name, role, created_at
                FROM app_users
                WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
            if not student or student["role"] != "student":
                self.send_json({"error": "Student not found."}, HTTPStatus.NOT_FOUND)
                return

            row = grant_course_enrollment(
                conn,
                student["id"],
                course_slug=course_slug,
                reviewed_by=admin["id"],
                payment_reference="Admin grant",
                payment_note="Granted from the Students tab",
            )

        self.send_json(
            {
                "ok": True,
                "student": public_student(student),
                "enrollment": public_enrollment(row),
            }
        )

    def handle_admin_students(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        with connect_db() as conn:
            rows = db_execute(
                conn,
                """
                SELECT id, username, display_name, role, created_at
                FROM app_users
                WHERE role = 'student'
                ORDER BY created_at DESC, username ASC
                """,
            ).fetchall()
            enrollment_rows = db_execute(
                conn,
                """
                SELECT id, student_id, course_slug, status, payment_reference,
                    payment_note, requested_at, reviewed_by, reviewed_at
                FROM course_enrollments
                WHERE course_slug = 'computer-fundamentals'
                """,
            ).fetchall()

        enrollments_by_student = {}
        for row in enrollment_rows:
            enrollments_by_student.setdefault(row["student_id"], []).append(
                public_enrollment(row)
            )
        students = []
        for row in rows:
            student = public_student(row)
            student["courseEnrollments"] = enrollments_by_student.get(row["id"], [])
            students.append(student)

        self.send_json(
            {
                "students": students,
                "lessons": lesson_summaries(),
                "admin": public_user(admin),
            }
        )

    def handle_admin_student_work(self):
        staff = self.current_staff_user()
        if not staff:
            self.send_staff_required()
            return

        with connect_db() as conn:
            student_rows = db_execute(
                conn,
                """
                SELECT id, username, display_name, role, created_at
                FROM app_users
                WHERE role = 'student'
                ORDER BY display_name ASC, username ASC
                """,
            ).fetchall()
            progress_rows = db_execute(
                conn,
                """
                SELECT student_id, lesson_slug, completed_sections, updated_at
                FROM lesson_progress
                ORDER BY updated_at DESC
                """,
            ).fetchall()
            activity_rows = db_execute(
                conn,
                """
                SELECT id, student_id, lesson_slug, answers, created_at
                FROM activity_submissions
                ORDER BY created_at DESC, id DESC
                """,
            ).fetchall()
            quiz_rows = db_execute(
                conn,
                """
                SELECT id, student_id, lesson_slug, score, total_questions,
                    category_breakdown, answer_details, created_at
                FROM quiz_results
                ORDER BY created_at DESC, id DESC
                """,
            ).fetchall()

        self.send_json(
            {
                "staff": public_user(staff),
                "students": [public_student(row) for row in student_rows],
                "lessons": lesson_summaries(),
                "progress": [public_lesson_progress(row) for row in progress_rows],
                "activities": [
                    public_activity_submission(row) for row in activity_rows
                ],
                "quizzes": [public_quiz_result(row) for row in quiz_rows],
            }
        )

    def handle_admin_teachers(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        with connect_db() as conn:
            rows = db_execute(
                conn,
                """
                SELECT id, username, display_name, role, created_at
                FROM app_users
                WHERE role = 'teacher'
                ORDER BY created_at DESC, username ASC
                """,
            ).fetchall()

        self.send_json(
            {
                "teachers": [public_student(row) for row in rows],
                "admin": public_user(admin),
            }
        )

    def handle_admin_create_student(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        username, display_name, error = validate_new_user(
            data.get("username"),
            data.get("displayName"),
            data.get("password"),
        )
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return

        user_id = str(uuid.uuid4())
        created_at = utc_now()
        with connect_db() as conn:
            existing_user = db_execute(
                conn,
                "SELECT id FROM app_users WHERE username = ?",
                (username,),
            ).fetchone()
            if existing_user:
                self.send_json(
                    {"error": "That username is already in use."},
                    HTTPStatus.CONFLICT,
                )
                return

            db_execute(
                conn,
                """
                INSERT INTO app_users (
                    id, username, display_name, password_hash, role, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    username,
                    display_name,
                    hash_password(data.get("password") or ""),
                    "student",
                    created_at,
                ),
            )
            enrollment = grant_course_enrollment(
                conn,
                user_id,
                course_slug="computer-fundamentals",
                reviewed_by=admin["id"],
                payment_reference="Admin-created student",
                payment_note="Computer Fundamentals access granted automatically",
            )

        self.send_json(
            {
                "student": {
                    "id": user_id,
                    "username": username,
                    "displayName": display_name,
                    "role": "student",
                    "createdAt": created_at,
                    "courseEnrollments": [public_enrollment(enrollment)],
                }
            },
            status=HTTPStatus.CREATED,
        )

    def handle_admin_update_user_password(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        user_id = (data.get("userId") or "").strip()
        new_password = data.get("password") or ""
        error = validate_password(new_password)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return
        if not user_id:
            self.send_json({"error": "User is required."}, HTTPStatus.BAD_REQUEST)
            return

        with connect_db() as conn:
            target = db_execute(
                conn,
                """
                SELECT id, username, display_name, role, created_at
                FROM app_users
                WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
            if not target:
                self.send_json({"error": "User not found."}, HTTPStatus.NOT_FOUND)
                return
            if target["role"] not in {"teacher", "student"}:
                self.send_json(
                    {"error": "Only teacher and student passwords can be reset here."},
                    HTTPStatus.FORBIDDEN,
                )
                return

            db_execute(
                conn,
                "UPDATE app_users SET password_hash = ? WHERE id = ?",
                (hash_password(new_password), user_id),
            )
            db_execute(conn, "DELETE FROM auth_sessions WHERE user_id = ?", (user_id,))

        self.send_json({"ok": True, "user": public_student(target)})

    def handle_admin_create_teacher(self):
        admin = self.current_admin_user()
        if not admin:
            self.send_admin_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        username, display_name, error = validate_new_user(
            data.get("username"),
            data.get("displayName"),
            data.get("password"),
        )
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return

        user_id = str(uuid.uuid4())
        created_at = utc_now()
        with connect_db() as conn:
            existing_user = db_execute(
                conn,
                "SELECT id FROM app_users WHERE username = ?",
                (username,),
            ).fetchone()
            if existing_user:
                self.send_json(
                    {"error": "That username is already in use."},
                    HTTPStatus.CONFLICT,
                )
                return

            db_execute(
                conn,
                """
                INSERT INTO app_users (
                    id, username, display_name, password_hash, role, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    username,
                    display_name,
                    hash_password(data.get("password") or ""),
                    "teacher",
                    created_at,
                ),
            )

        self.send_json(
            {
                "teacher": {
                    "id": user_id,
                    "username": username,
                    "displayName": display_name,
                    "role": "teacher",
                    "createdAt": created_at,
                }
            },
            status=HTTPStatus.CREATED,
        )

    def handle_admin_resources(self, parsed):
        staff = self.current_staff_user()
        if not staff:
            self.send_staff_required()
            return

        params = parse_qs(parsed.query)
        lesson_slug = (params.get("lessonSlug", [""])[0] or "").strip()
        where_clause = ""
        values = ()
        if lesson_slug:
            if lesson_slug not in LESSONS:
                self.send_json({"error": "Choose a valid lesson."}, HTTPStatus.BAD_REQUEST)
                return
            where_clause = "WHERE lesson_slug = ?"
            values = (lesson_slug,)

        with connect_db() as conn:
            rows = db_execute(
                conn,
                f"""
                SELECT id, lesson_slug, title, resource_type, url, description,
                    created_by, created_at
                FROM lesson_resources
                {where_clause}
                ORDER BY created_at DESC, id DESC
                """,
                values,
            ).fetchall()

        self.send_json(
            {
                "resources": [public_resource(row) for row in rows],
                "lessons": lesson_summaries(),
            }
        )

    def handle_admin_create_resource(self):
        staff = self.current_staff_user()
        if not staff:
            self.send_staff_required()
            return

        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        resource, error = validate_resource_payload(data)
        if error:
            self.send_json({"error": error}, HTTPStatus.BAD_REQUEST)
            return

        created_at = utc_now()
        with connect_db() as conn:
            if USE_POSTGRES:
                cursor = db_execute(
                    conn,
                    """
                    INSERT INTO lesson_resources (
                        lesson_slug, title, resource_type, url, description,
                        created_by, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    RETURNING id, lesson_slug, title, resource_type, url,
                        description, created_by, created_at
                    """,
                    (
                        resource["lesson_slug"],
                        resource["title"],
                        resource["resource_type"],
                        resource["url"],
                        resource["description"],
                        staff["id"],
                        created_at,
                    ),
                )
                row = cursor.fetchone()
            else:
                cursor = db_execute(
                    conn,
                    """
                    INSERT INTO lesson_resources (
                        lesson_slug, title, resource_type, url, description,
                        created_by, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        resource["lesson_slug"],
                        resource["title"],
                        resource["resource_type"],
                        resource["url"],
                        resource["description"],
                        staff["id"],
                        created_at,
                    ),
                )
                row = {
                    "id": cursor.lastrowid,
                    "lesson_slug": resource["lesson_slug"],
                    "title": resource["title"],
                    "resource_type": resource["resource_type"],
                    "url": resource["url"],
                    "description": resource["description"],
                    "created_by": staff["id"],
                    "created_at": created_at,
                }

        self.send_json(
            {"resource": public_resource(row)},
            status=HTTPStatus.CREATED,
        )

    def handle_admin_upload_video(self):
        staff = self.current_staff_user()
        if not staff:
            self.send_staff_required()
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0:
            self.send_json({"error": "Choose a video file."}, HTTPStatus.BAD_REQUEST)
            return
        if content_length > MAX_VIDEO_UPLOAD_BYTES:
            self.send_json(
                {
                    "error": (
                        "Video is too large. Maximum upload is "
                        f"{MAX_VIDEO_UPLOAD_BYTES // (1024 * 1024)} MB."
                    )
                },
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
            )
            return

        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self.send_json(
                {"error": "Use the video upload form."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
                "CONTENT_LENGTH": str(content_length),
            },
        )

        lesson_slug = (form.getfirst("lessonSlug", "") or "").strip()
        if lesson_slug not in LESSONS:
            self.send_json({"error": "Choose a valid lesson."}, HTTPStatus.BAD_REQUEST)
            return

        try:
            video_part = int(form.getfirst("videoPart", "0"))
        except (TypeError, ValueError):
            video_part = 0
        if video_part < 1 or video_part > 99:
            self.send_json({"error": "Choose a valid video part."}, HTTPStatus.BAD_REQUEST)
            return

        file_item = form["videoFile"] if "videoFile" in form else None
        if isinstance(file_item, list):
            file_item = file_item[0] if file_item else None
        if file_item is None or not getattr(file_item, "filename", ""):
            self.send_json({"error": "Choose a video file."}, HTTPStatus.BAD_REQUEST)
            return

        extension = Path(file_item.filename).suffix.lower()
        if extension not in VIDEO_EXTENSIONS:
            self.send_json(
                {"error": "Upload an MP4, MOV, M4V, WebM, or OGG video."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        video_path = video_dir_path(lesson_slug)
        if ROOT not in video_path.parents and video_path != ROOT:
            self.send_json(
                {"error": "Video folder must stay inside the app directory."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        video_path.mkdir(parents=True, exist_ok=True)
        filename = video_filename_for_part(lesson_slug, video_part, extension)
        target_path = (video_path / filename).resolve()
        if ROOT not in target_path.parents:
            self.send_json(
                {"error": "Invalid upload path."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        with target_path.open("wb") as output:
            shutil.copyfileobj(file_item.file, output)

        relative_path = target_path.relative_to(ROOT).as_posix()
        self.send_json(
            {
                "ok": True,
                "lessonSlug": lesson_slug,
                "part": video_part,
                "fileName": target_path.name,
                "url": "/" + relative_path,
                "size": target_path.stat().st_size,
            },
            status=HTTPStatus.CREATED,
        )

    def handle_get_resources(self, parsed):
        if REQUIRE_LOGIN and not self.current_user():
            self.send_auth_required()
            return

        params = parse_qs(parsed.query)
        lesson_slug = params.get("lessonSlug", [LESSON_SLUG])[0] or LESSON_SLUG
        if lesson_slug not in LESSONS:
            self.send_json({"error": "Choose a valid lesson."}, HTTPStatus.BAD_REQUEST)
            return

        student_id, set_cookie = self.current_student_id()
        if not student_id:
            self.send_auth_required()
            return

        access_status = self.is_lesson_unlocked(student_id, lesson_slug)
        if not access_status["unlocked"]:
            self.send_lesson_locked(access_status)
            return

        with connect_db() as conn:
            rows = db_execute(
                conn,
                """
                SELECT id, lesson_slug, title, resource_type, url, description,
                    created_by, created_at
                FROM lesson_resources
                WHERE lesson_slug = ?
                ORDER BY created_at DESC, id DESC
                """,
                (lesson_slug,),
            ).fetchall()

        self.send_json(
            {
                "lessonSlug": lesson_slug,
                "resources": [public_resource(row) for row in rows],
            },
            student_id=student_id,
            set_cookie=set_cookie,
        )

    def handle_get_recordings(self, parsed):
        if REQUIRE_LOGIN and not self.current_user():
            self.send_auth_required()
            return
        params = parse_qs(parsed.query)
        lesson_slug = params.get("lessonSlug", [LESSON_SLUG])[0] or LESSON_SLUG
        student_id, set_cookie = self.current_student_id()
        if not student_id:
            self.send_auth_required()
            return
        access_status = self.is_lesson_unlocked(student_id, lesson_slug)
        if not access_status["unlocked"]:
            self.send_lesson_locked(access_status)
            return

        self.send_json(
            {
                "lessonSlug": lesson_slug,
                "recordings": list_lesson_recordings(lesson_slug),
            },
            student_id=student_id,
            set_cookie=set_cookie,
        )

    def handle_get_lesson_access(self, parsed):
        student_id, set_cookie = self.current_student_id()
        if not student_id:
            self.send_auth_required()
            return

        params = parse_qs(parsed.query)
        lesson_slug = params.get("lessonSlug", [LESSON_SLUG])[0] or LESSON_SLUG
        status = self.is_lesson_unlocked(student_id, lesson_slug)

        self.send_json(
            status,
            student_id=student_id,
            set_cookie=set_cookie,
        )

    def handle_get_lesson_progress(self, parsed):
        student_id, set_cookie = self.current_student_id()
        if not student_id:
            self.send_auth_required()
            return
        params = parse_qs(parsed.query)
        lesson_slug = params.get("lessonSlug", [LESSON_SLUG])[0] or LESSON_SLUG
        access_status = self.is_lesson_unlocked(student_id, lesson_slug)
        if not access_status["unlocked"]:
            self.send_lesson_locked(access_status)
            return

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
        if not student_id:
            self.send_auth_required()
            return
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
        if not student_id:
            self.send_auth_required()
            return
        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        lesson_slug = data.get("lessonSlug") or LESSON_SLUG
        access_status = self.is_lesson_unlocked(student_id, lesson_slug)
        if not access_status["unlocked"]:
            self.send_lesson_locked(access_status)
            return

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
        if not student_id:
            self.send_auth_required()
            return
        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        lesson_slug = data.get("lessonSlug") or LESSON_SLUG
        access_status = self.is_lesson_unlocked(student_id, lesson_slug)
        if not access_status["unlocked"]:
            self.send_lesson_locked(access_status)
            return

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
        if not student_id:
            self.send_auth_required()
            return
        try:
            data = self.read_json_body()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        lesson_slug = data.get("lessonSlug") or LESSON_SLUG
        access_status = self.is_lesson_unlocked(student_id, lesson_slug)
        if not access_status["unlocked"]:
            self.send_lesson_locked(access_status)
            return

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

        answer_details = data.get("answerDetails", [])
        if not isinstance(answer_details, list):
            self.send_json(
                {"error": "answerDetails must be a list"},
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
                        category_breakdown, answer_details, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    RETURNING id
                    """,
                    (
                        student_id,
                        lesson_slug,
                        score,
                        total_questions,
                        json.dumps(category_breakdown),
                        json.dumps(answer_details),
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
                        category_breakdown, answer_details, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        student_id,
                        lesson_slug,
                        score,
                        total_questions,
                        json.dumps(category_breakdown),
                        json.dumps(answer_details),
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
