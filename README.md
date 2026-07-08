# Learning MS

Local course app for Digital Bridge Academy lessons.

## Run Locally

```bash
python3 app.py
```

Then open:

```text
http://127.0.0.1:8765/
```

## Course Sequence

The homepage opens `prework.html`, which is Week 1: Intermediate Readiness Intensive.

- Week 1 is designed as a detailed 6-hour readiness session with reading, practice drills, a diagnostic quiz, and a mini project.
- Lesson 1 unlocks after Week 1 sections are complete, the Week 1 quiz is submitted, and the Week 1 mini project is submitted.
- Lesson 2 unlocks after Lesson 1 sections are complete and the Lesson 1 quiz is submitted.

## Database

Local development defaults to SQLite and creates:

```text
data/learning_ms.sqlite3
```

It stores:

- Student and teacher login accounts
- Browser login sessions
- Lesson section progress
- Class activity submissions
- Practice quiz results

## Production PostgreSQL

Install the PostgreSQL driver:

```bash
pip install -r requirements.txt
```

Set these environment variables in production:

```bash
DATABASE_URL=postgresql://learning_user:change_me@db.example.com:5432/learning_ms
APP_HOST=0.0.0.0
PORT=8765
COOKIE_SECURE=1
AUTH_COOKIE_NAME=dba_session
REQUIRE_LOGIN=1
ALLOW_SIGNUP=0
SESSION_DAYS=30
ADMIN_USERNAME=teacher
ADMIN_PASSWORD=change_this_teacher_password
ADMIN_DISPLAY_NAME=Teacher
COOKIE_NAME=dba_student_id
LESSON_SLUG=cs-fundamentals-lesson-1
LESSON1_VIDEO_DIR=assets/videos/lesson1
LESSON2_VIDEO_DIR=assets/videos/lesson2
```

When `DATABASE_URL` is present, the app uses PostgreSQL and creates the needed tables automatically. When `DATABASE_URL` is missing, it uses SQLite.

The app creates the first teacher account when the users table is empty. Set `ADMIN_PASSWORD` to a strong password before the first production start. If the default account already exists, update the password in the database or recreate the account intentionally.

`ALLOW_SIGNUP=0` keeps student self-registration disabled. Set `ALLOW_SIGNUP=1` only if you want students to create their own accounts from the login screen.

## Lesson Recordings

Lessons use separate recording folders. Upload browser-playable video files such as `.mp4`, `.mov`, `.m4v`, or `.webm`.

Lesson 1 recordings go into:

```text
assets/videos/lesson1/
```

Use filenames that sort in recording order:

```text
01-welcome-why-this-lesson-matters.mp4
02-what-is-a-computer-really.mp4
03-binary.mp4
04-code-to-running-program.mp4
05-python-variables-memory.mp4
06-operating-system-role.mp4
07-wrap-up-full-journey.mp4
```

The portal labels those files as:

| Part | Title | Runtime |
| --- | --- | --- |
| 1 | Welcome & Why This Lesson Matters | ~4 min |
| 2 | What Is a Computer, Really? | ~9 min |
| 3 | Everything Is Just Numbers: Binary | ~11 min |
| 4 | From Your Code to a Running Program | ~11 min |
| 5 | How Python Actually Stores Your Variables | ~12 min |
| 6 | The Operating System's Role | ~9 min |
| 7 | Wrap-Up: The Full Journey | ~5 min |

Lesson 2 recordings go into:

```text
assets/videos/lesson2/
```

Use filenames that sort in recording order:

```text
01-welcome-framing.mp4
02-names-addresses-dns.mp4
03-request-response-cycle.mp4
04-packets-routing.mp4
05-servers-ports-apis.mp4
06-https-encryption.mp4
07-summary-full-journey.mp4
```

The portal labels those files as:

| Part | Title | Runtime |
| --- | --- | --- |
| 1 | Welcome & Framing | ~5 min |
| 2 | Names & Addresses: IP Addresses and DNS | ~20 min |
| 3 | The Request-Response Cycle | ~20 min |
| 4 | Data Travels in Packets | ~20 min |
| 5 | Servers, Ports, and APIs | ~15 min |
| 6 | HTTPS and Encryption | ~15 min |
| 7 | Summary: The Full Journey | ~15 min |

You do not need to restart the app after adding videos. Refresh the lesson page and uploaded parts will become playable.

## Bad Gateway Checklist

If the deployed app shows Bad Gateway, check the application service:

- Start command is `python app.py` or the platform detects `Procfile`.
- `PORT` matches the port your platform gives the app.
- `APP_HOST=0.0.0.0`.
- `DATABASE_URL` is set on the application service.
- The build installs dependencies with `pip install -r requirements.txt`.
- The database service is running and the app uses the internal database URL when available.
