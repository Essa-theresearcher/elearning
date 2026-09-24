#!/usr/bin/env python3
"""Reset a user password in the local SQLite or production database.

Usage (from repo root):
  python3 scripts/reset_user_password.py admin 'YourNewPassword123'

Uses the same DATABASE_URL / SQLITE_DB_PATH as app.py.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app  # noqa: E402


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: python3 scripts/reset_user_password.py <username> <new_password>",
            file=sys.stderr,
        )
        return 1

    username = app.normalize_username(sys.argv[1])
    new_password = sys.argv[2]
    error = app.validate_password(new_password)
    if error:
        print(error, file=sys.stderr)
        return 1

    with app.connect_db() as conn:
        row = app.db_execute(
            conn,
            "SELECT id, username, role FROM app_users WHERE username = ?",
            (username,),
        ).fetchone()
        if not row:
            print(f"No user found with username: {username}", file=sys.stderr)
            return 1

        app.db_execute(
            conn,
            "UPDATE app_users SET password_hash = ? WHERE id = ?",
            (app.hash_password(new_password), row["id"]),
        )
        conn.commit()

    print(f"Password updated for {row['username']} ({row['role']}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
