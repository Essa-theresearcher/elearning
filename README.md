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

The homepage opens `prework.html`, which is Week 0: Python Readiness Assessment.

- Week 0 includes an auto-scored Python readiness quiz and an open-ended coding review.
- Week 1 Lesson 1 is reading-based while videos are not ready. Students work through `assets/lesson1-notes.pdf`, then complete the activity and quiz.
- Week 1 Lesson 1 unlocks after Week 0 sections are complete, the Week 0 quiz is submitted, and the Week 0 coding review is submitted.
- Week 1 Lesson 2 sits under Week 1 and unlocks after Lesson 1 sections are complete and the Lesson 1 quiz is submitted.

## Database

Local development defaults to SQLite and creates:

```text
data/learning_ms.sqlite3
```

It stores:

- Admin, teacher, and student login accounts
- Browser login sessions
- Lesson section progress
- Class activity submissions
- Practice quiz results
- Teacher-added class links and lesson resources

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
SYSTEM_ADMIN_USERNAME=admin
SYSTEM_ADMIN_PASSWORD=change_this_admin_password
SYSTEM_ADMIN_DISPLAY_NAME=Admin
TEACHER_USERNAME=teacher
TEACHER_PASSWORD=change_this_teacher_password
TEACHER_DISPLAY_NAME=Teacher
STUDENT_USERNAME=student
STUDENT_PASSWORD=change_this_student_password
STUDENT_DISPLAY_NAME=Student
COOKIE_NAME=dba_student_id
LESSON_SLUG=cs-fundamentals-lesson-1
LESSON1_VIDEO_DIR=assets/videos/lesson1
LESSON2_VIDEO_DIR=assets/videos/lesson2
```

When `DATABASE_URL` is present, the app uses PostgreSQL and creates the needed tables automatically. When `DATABASE_URL` is missing, it uses SQLite.

The app creates an admin account, a teacher account, and a student account when those usernames are missing. Set `SYSTEM_ADMIN_PASSWORD`, `TEACHER_PASSWORD`, and `STUDENT_PASSWORD` to strong passwords before sharing the public link. If an account already exists, changing the environment variable will not change that saved password automatically.

Open `/admin.html` for management. Staff accounts are sent there when they sign in from the course pages. Admin accounts can use the Teachers and Students tabs to create accounts and reset teacher/student passwords. Teacher accounts can use the Classes & resources tab to add class links, readings, videos, assignments, downloads, and other resources to lessons. Staff can also change their own password from the My password tab.

Older deployments that already use `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_DISPLAY_NAME` will still use those values for the default teacher account unless the newer `TEACHER_*` variables are set.

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
