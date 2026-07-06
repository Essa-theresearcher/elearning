# Digital Bridge Academy

A simple, self-hosted app for running pre-recorded classes: the teacher posts videos and
resources per lesson, students log in with a username/password to watch, and there's a
built-in accountability dashboard so you can see who's actually watching.

## What it does

- **You (teacher/admin)** log in and:
  - Create courses, and add lessons to each course (title, description, video upload)
  - Publish courses to a public marketplace with price, category, language, level, and sales copy
  - Attach resources to a lesson — either a link, or upload a file (PDF, doc, etc.)
  - Manually create a student account (username + password) once they've paid you
  - Approve paid/manual marketplace enrollment requests
  - Enroll a student in a course
  - See an **Accountability** dashboard: per-student, per-course completion % and
    when they were last active in the app
- **Students** log in and:
  - See only the courses they're enrolled in
  - Watch the video and download resources for each lesson
  - Mark a lesson complete — by default, lessons unlock in order, so they can't skip ahead
    without finishing the previous one (you can turn this off per course)

## Video lessons

Lessons accept direct **video uploads** from the teacher dashboard:

- Add a lesson, choose a video file, and the app stores it in the local `uploads/` folder.
- Uploaded lesson videos are capped at 1GB each.
- Existing lessons that already use YouTube, Vimeo, or Google Drive links will still play.

Resources (PDFs, notes, slides) can also be uploaded directly into the app.

## Marketplace flow

The app includes a marketplace MVP:

- Public catalog: `http://localhost:3000/marketplace.html`
- Public course page: created automatically for each published course
- Free courses enroll students immediately
- Paid courses create a pending marketplace order for the teacher to approve after manual payment

M-Pesa/Daraja can be connected later at the checkout step. Until then, the paid-course flow
keeps access controlled through teacher approval.

## Running it locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

**First login:** username `teacher`, password `changeme123`.
Log in as the teacher, click **Change password** in the top bar, and update it immediately.

## Deploying

This is a plain Node.js/Express app — no separate database server needed, so it deploys the
same way as your other Node projects (Hostinger/Dokploy, etc.):

1. Push this folder to your server / repo
2. `npm install`
3. Set two environment variables for production:
   - `SESSION_SECRET` — any long random string (keeps login sessions secure)
   - `PORT` — if your host requires a specific port
4. `npm start` (or point your process manager, e.g. PM2, at `server.js`)

Data is stored in a local `db.json` file and an `uploads/` folder — make sure both are on a
persistent volume/disk on your host (not wiped on redeploy), and back them up periodically.

## Notes / limits

- Built for a small number of students/courses (dozens, not thousands) — the JSON-file
  storage is simple and reliable at that scale, but if you outgrow it later this can be
  swapped for a real database (Postgres/Prisma, which you're already using elsewhere)
  without changing the frontend.
- Uploaded resource files are capped at 50MB each, and uploaded lesson videos are capped at
  1GB each (adjustable in `server.js`).
- There's no self-signup — accounts are always created by the teacher, matching how you
  handle manual payment.
