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
COOKIE_NAME=dba_student_id
LESSON_SLUG=cs-fundamentals-lesson-1
```

When `DATABASE_URL` is present, the app uses PostgreSQL and creates the needed tables automatically. When `DATABASE_URL` is missing, it uses SQLite.

## Bad Gateway Checklist

If the deployed app shows Bad Gateway, check the application service:

- Start command is `python app.py` or the platform detects `Procfile`.
- `PORT` matches the port your platform gives the app.
- `APP_HOST=0.0.0.0`.
- `DATABASE_URL` is set on the application service.
- The build installs dependencies with `pip install -r requirements.txt`.
- The database service is running and the app uses the internal database URL when available.
