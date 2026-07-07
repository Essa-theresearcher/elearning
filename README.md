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
ALLOW_SIGNUP=1
SESSION_DAYS=30
ADMIN_USERNAME=teacher
ADMIN_PASSWORD=change_this_teacher_password
ADMIN_DISPLAY_NAME=Teacher
COOKIE_NAME=dba_student_id
LESSON_SLUG=cs-fundamentals-lesson-1
VIDEO_DIR=assets/videos/lesson1
```

When `DATABASE_URL` is present, the app uses PostgreSQL and creates the needed tables automatically. When `DATABASE_URL` is missing, it uses SQLite.

The app creates the first teacher account when the users table is empty. Set `ADMIN_PASSWORD` to a strong password before the first production start. If the default account already exists, update the password in the database or recreate the account intentionally.

`ALLOW_SIGNUP=1` lets students create their own accounts from the login screen. Set `ALLOW_SIGNUP=0` if you only want manually created accounts.

## Lesson Recordings

Lesson 1 is segmented from the teacher recording script into seven focused videos. Upload browser-playable video files such as `.mp4`, `.mov`, `.m4v`, or `.webm` into:

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

You do not need to restart the app after adding videos. Refresh the lesson page and uploaded parts will become playable.

## Bad Gateway Checklist

If the deployed app shows Bad Gateway, check the application service:

- Start command is `python app.py` or the platform detects `Procfile`.
- `PORT` matches the port your platform gives the app.
- `APP_HOST=0.0.0.0`.
- `DATABASE_URL` is set on the application service.
- The build installs dependencies with `pip install -r requirements.txt`.
- The database service is running and the app uses the internal database URL when available.
