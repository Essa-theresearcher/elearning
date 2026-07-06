const express = require('express');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ---------- tiny JSON "database" ----------
function readDB() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  ensureDBShape(db);
  return db;
}
function writeDB(db) {
  ensureDBShape(db);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function ensureDBShape(db) {
  if (!Array.isArray(db.orders)) db.orders = [];
  db.orders.forEach(order => {
    if (!order.status) order.status = 'pending';
    if (!('approvedAt' in order)) order.approvedAt = null;
    if (!('paidAt' in order)) order.paidAt = null;
  });
  (db.courses || []).forEach(course => {
    if (typeof course.isPublished !== 'boolean') course.isPublished = false;
    if (typeof course.priceKes !== 'number') course.priceKes = 0;
    if (!course.category) course.category = 'General';
    if (!course.language) course.language = 'English';
    if (!course.level) course.level = 'Beginner';
    if (!course.teacherName) course.teacherName = 'Teacher';
    if (!course.imageUrl) course.imageUrl = '';
    if (!course.salesDescription) course.salesDescription = course.description || '';
    if (!course.whatYouWillLearn) course.whatYouWillLearn = '';
  });
}
function seedIfNeeded() {
  if (fs.existsSync(DB_PATH)) return;
  const db = {
    users: [
      {
        id: 'u_admin',
        username: 'teacher',
        passwordHash: bcrypt.hashSync('changeme123', 10),
        role: 'admin',
        name: 'Teacher',
        enrolledCourses: [],
        lastActiveAt: null
      }
    ],
    courses: [],
    lessons: [],
    progress: {}, // key: `${userId}__${lessonId}` -> { completed: bool, completedAt }
    orders: []
  };
  writeDB(db);
  console.log('Seeded database. Default admin login -> username: teacher / password: changeme123');
  console.log('IMPORTANT: change this password after first login.');
}
seedIfNeeded();

function newId(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

// ---------- app setup ----------
const app = express();
app.use(express.json());
app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'change-this-secret-in-production'],
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  })
);
app.use((req, res, next) => {
  const lockedPages = new Set(['/marketplace.html', '/course.html', '/checkout.html']);
  if (lockedPages.has(req.path) && !req.session.userId) {
    return res.redirect(`/login.html?next=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

const RESOURCE_FILE_LIMIT = 50 * 1024 * 1024;
const VIDEO_FILE_LIMIT = 1024 * 1024 * 1024;
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

function uploadStorage() {
  return multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const safeName = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, safeName);
    }
  });
}

const resourceUpload = multer({
  storage: uploadStorage(),
  limits: { fileSize: RESOURCE_FILE_LIMIT } // 50MB cap for resource files
});

const videoUpload = multer({
  storage: uploadStorage(),
  limits: { fileSize: VIDEO_FILE_LIMIT }, // 1GB cap for lesson videos
  fileFilter: (req, file, cb) => {
    if ((file.mimetype || '').startsWith('video/') || VIDEO_EXTENSIONS.test(file.originalname)) {
      return cb(null, true);
    }
    cb(new Error('Please upload a video file.'));
  }
});

function handleUpload(uploader, fieldName, maxSizeLabel) {
  return (req, res, next) => {
    uploader.single(fieldName)(req, res, err => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File is too large. Maximum size is ${maxSizeLabel}.` });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    });
  };
}

function removeUploadByUrl(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOADS_DIR, path.basename(url)), err => {
    if (err && err.code !== 'ENOENT') {
      console.warn(`Could not remove uploaded file ${url}: ${err.message}`);
    }
  });
}

function removeLessonUploads(lesson) {
  if (!lesson) return;
  if (lesson.videoType === 'upload') removeUploadByUrl(lesson.videoUrl);
  (lesson.resources || []).forEach(resource => {
    if (resource.type === 'file') removeUploadByUrl(resource.url);
  });
}

// ---------- auth helpers ----------
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}
function requireAdmin(req, res, next) {
  const db = readDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}
function requireStudent(req, res, next) {
  const db = readDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user || user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  next();
}
function touchActivity(userId) {
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.lastActiveAt = new Date().toISOString();
    writeDB(db);
  }
}

function readMarketplaceFields(body = {}, fallbackTeacherName = 'Teacher') {
  const price = Math.max(0, Math.round(Number(body.priceKes || 0)));
  return {
    isPublished: body.isPublished === true || body.isPublished === 'true' || body.isPublished === 'on',
    priceKes: Number.isFinite(price) ? price : 0,
    category: String(body.category || 'General').trim() || 'General',
    language: String(body.language || 'English').trim() || 'English',
    level: String(body.level || 'Beginner').trim() || 'Beginner',
    teacherName: String(body.teacherName || fallbackTeacherName).trim() || fallbackTeacherName,
    imageUrl: String(body.imageUrl || '').trim(),
    salesDescription: String(body.salesDescription || body.description || '').trim(),
    whatYouWillLearn: String(body.whatYouWillLearn || '').trim()
  };
}

function formatPriceKes(priceKes) {
  return priceKes > 0 ? `KES ${priceKes.toLocaleString('en-KE')}` : 'Free';
}

function marketplaceCoursePayload(course, lessons, viewer, viewerOrder = null) {
  const lessonCount = lessons.length;
  const isEnrolled = !!viewer?.enrolledCourses?.includes(course.id);
  return {
    id: course.id,
    title: course.title,
    description: course.description || '',
    salesDescription: course.salesDescription || course.description || '',
    teacherName: course.teacherName || 'Teacher',
    priceKes: course.priceKes || 0,
    priceLabel: formatPriceKes(course.priceKes || 0),
    category: course.category || 'General',
    language: course.language || 'English',
    level: course.level || 'Beginner',
    imageUrl: course.imageUrl || '',
    lessonCount,
    whatYouWillLearn: String(course.whatYouWillLearn || '')
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean),
    outline: lessons.map((lesson, idx) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || '',
      order: idx + 1,
      hasVideo: !!lesson.videoUrl,
      resourceCount: (lesson.resources || []).length,
      hasAssignment: !!lesson.assignment,
      hasProject: !!lesson.handsOnProject || !!lesson.miniProject,
      hasQuiz: !!lesson.quiz
    })),
    isEnrolled,
    orderStatus: viewerOrder?.status || null,
    orderId: viewerOrder?.id || null,
    checkoutUrl: viewerOrder?.status === 'approved' ? `checkout.html?order=${encodeURIComponent(viewerOrder.id)}` : ''
  };
}

function marketplacePayloadForCourse(db, course, lessons, viewer) {
  const viewerOrder = viewer?.role === 'student'
    ? (db.orders || []).find(order => (
        order.courseId === course.id &&
        order.studentId === viewer.id &&
        ['pending', 'approved', 'paid'].includes(order.status)
      ))
    : null;
  return marketplaceCoursePayload(course, lessons, viewer, viewerOrder);
}

function orderStatusLabel(status) {
  if (status === 'pending') return 'Waiting for approval';
  if (status === 'approved') return 'Ready for checkout';
  if (status === 'paid') return 'Paid';
  return status || 'Unknown';
}

function studentCheckoutOrderPayload(db, order) {
  const course = db.courses.find(c => c.id === order.courseId);
  return {
    id: order.id,
    courseId: order.courseId,
    courseTitle: course?.title || 'Unknown course',
    courseDescription: course?.description || '',
    imageUrl: course?.imageUrl || '',
    amountKes: order.amountKes || 0,
    amountLabel: formatPriceKes(order.amountKes || 0),
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    checkoutUrl: order.status === 'approved' ? `checkout.html?order=${encodeURIComponent(order.id)}` : '',
    createdAt: order.createdAt,
    approvedAt: order.approvedAt || null,
    paidAt: order.paidAt || null
  };
}

// ---------- auth routes ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === String(username || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId = user.id;
  touchActivity(user.id);
  res.json({ role: user.role, name: user.name });
});

app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/me', requireLogin, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ id: user.id, role: user.role, name: user.name, username: user.username });
});

app.post('/api/change-password', requireLogin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const db = readDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!bcrypt.compareSync(currentPassword || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeDB(db);
  res.json({ ok: true });
});

// ================= MARKETPLACE ROUTES =================

app.get('/api/marketplace/courses', requireLogin, (req, res) => {
  const db = readDB();
  const viewer = req.session.userId ? db.users.find(u => u.id === req.session.userId) : null;
  const courses = db.courses
    .filter(course => course.isPublished)
    .map(course => {
      const lessons = db.lessons
        .filter(lesson => lesson.courseId === course.id)
        .sort((a, b) => a.order - b.order);
      return marketplacePayloadForCourse(db, course, lessons, viewer);
    });
  res.json(courses);
});

app.get('/api/marketplace/courses/:id', requireLogin, (req, res) => {
  const db = readDB();
  const course = db.courses.find(c => c.id === req.params.id && c.isPublished);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const viewer = req.session.userId ? db.users.find(u => u.id === req.session.userId) : null;
  const lessons = db.lessons
    .filter(lesson => lesson.courseId === course.id)
    .sort((a, b) => a.order - b.order);
  res.json(marketplacePayloadForCourse(db, course, lessons, viewer));
});

app.post('/api/marketplace/courses/:id/checkout', requireLogin, requireStudent, (req, res) => {
  const db = readDB();
  const student = db.users.find(u => u.id === req.session.userId);
  const course = db.courses.find(c => c.id === req.params.id && c.isPublished);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (student.enrolledCourses.includes(course.id)) {
    return res.json({ status: 'already_enrolled', message: 'You are already enrolled in this course.' });
  }

  if ((course.priceKes || 0) <= 0) {
    student.enrolledCourses.push(course.id);
    writeDB(db);
    return res.json({ status: 'enrolled', message: 'You are enrolled. The course is now in your dashboard.' });
  }

  const existingOrder = db.orders.find(order => (
    order.courseId === course.id &&
    order.studentId === student.id &&
    ['pending', 'approved', 'paid'].includes(order.status)
  ));
  if (existingOrder) {
    if (existingOrder.status === 'approved') {
      return res.json({
        status: 'approved_for_checkout',
        orderId: existingOrder.id,
        checkoutUrl: `checkout.html?order=${encodeURIComponent(existingOrder.id)}`,
        message: 'Your request was approved. Continue to checkout to unlock the course.'
      });
    }
    if (existingOrder.status === 'paid') {
      if (!student.enrolledCourses.includes(course.id)) student.enrolledCourses.push(course.id);
      writeDB(db);
      return res.json({
        status: 'enrolled',
        orderId: existingOrder.id,
        message: 'Payment is complete. The course is now in your dashboard.'
      });
    }
    return res.json({
      status: 'pending',
      orderId: existingOrder.id,
      message: 'Your enrollment request is waiting for teacher approval.'
    });
  }

  const order = {
    id: newId('o'),
    courseId: course.id,
    studentId: student.id,
    amountKes: course.priceKes || 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
    approvedAt: null,
    paidAt: null
  };
  db.orders.push(order);
  writeDB(db);
  res.json({
    status: 'pending',
    orderId: order.id,
    message: `Enrollment request sent. Once approved, checkout will open for ${formatPriceKes(order.amountKes)}.`
  });
});

// ================= ADMIN ROUTES =================

// -- students --
app.get('/api/admin/students', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  const students = db.users
    .filter(u => u.role === 'student')
    .map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      enrolledCourses: u.enrolledCourses,
      lastActiveAt: u.lastActiveAt
    }));
  res.json(students);
});

app.post('/api/admin/students', requireLogin, requireAdmin, (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'username, password, and name are required' });
  }
  const db = readDB();
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'That username is already taken' });
  }
  const student = {
    id: newId('u'),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'student',
    name,
    enrolledCourses: [],
    lastActiveAt: null
  };
  db.users.push(student);
  writeDB(db);
  res.json({ id: student.id });
});

app.post('/api/admin/students/:id/enroll', requireLogin, requireAdmin, (req, res) => {
  const { courseId } = req.body;
  const db = readDB();
  const student = db.users.find(u => u.id === req.params.id && u.role === 'student');
  const course = db.courses.find(c => c.id === courseId);
  if (!student || !course) return res.status(404).json({ error: 'Student or course not found' });
  if (!student.enrolledCourses.includes(courseId)) student.enrolledCourses.push(courseId);
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/admin/students/:id/unenroll', requireLogin, requireAdmin, (req, res) => {
  const { courseId } = req.body;
  const db = readDB();
  const student = db.users.find(u => u.id === req.params.id && u.role === 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  student.enrolledCourses = student.enrolledCourses.filter(c => c !== courseId);
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/admin/students/:id/reset-password', requireLogin, requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const db = readDB();
  const student = db.users.find(u => u.id === req.params.id && u.role === 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });
  student.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeDB(db);
  res.json({ ok: true });
});

// -- marketplace orders --
app.get('/api/admin/orders', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  const orders = db.orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(order => {
      const course = db.courses.find(c => c.id === order.courseId);
      const student = db.users.find(u => u.id === order.studentId);
      return {
        ...order,
        amountLabel: formatPriceKes(order.amountKes || 0),
        statusLabel: orderStatusLabel(order.status),
        courseTitle: course?.title || 'Unknown course',
        studentName: student?.name || 'Unknown student',
        studentUsername: student?.username || 'unknown',
        paidAt: order.paidAt || null
      };
    });
  res.json(orders);
});

app.post('/api/admin/orders/:id/approve', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const student = db.users.find(u => u.id === order.studentId && u.role === 'student');
  const course = db.courses.find(c => c.id === order.courseId);
  if (!student || !course) return res.status(404).json({ error: 'Student or course not found' });
  if (order.status === 'paid') {
    if (!student.enrolledCourses.includes(course.id)) student.enrolledCourses.push(course.id);
    writeDB(db);
    return res.json({ ok: true });
  }
  order.status = 'approved';
  order.approvedAt = order.approvedAt || new Date().toISOString();
  writeDB(db);
  res.json({ ok: true });
});

// -- courses --
app.get('/api/admin/courses', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.courses);
});

app.post('/api/admin/courses', requireLogin, requireAdmin, (req, res) => {
  const { title, description, requireSequential } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const db = readDB();
  const teacher = db.users.find(u => u.id === req.session.userId);
  const marketplaceFields = readMarketplaceFields(req.body, teacher?.name || 'Teacher');
  const course = {
    id: newId('c'),
    title,
    description: description || '',
    requireSequential: requireSequential !== false, // default true: lessons unlock in order
    ...marketplaceFields
  };
  db.courses.push(course);
  writeDB(db);
  res.json(course);
});

app.patch('/api/admin/courses/:id', requireLogin, requireAdmin, (req, res) => {
  const { title, description, requireSequential } = req.body;
  const db = readDB();
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const teacher = db.users.find(u => u.id === req.session.userId);
  Object.assign(course, {
    title,
    description: description || '',
    requireSequential: requireSequential !== false,
    ...readMarketplaceFields(req.body, teacher?.name || course.teacherName || 'Teacher')
  });
  writeDB(db);
  res.json(course);
});

app.delete('/api/admin/courses/:id', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  db.lessons.filter(l => l.courseId === req.params.id).forEach(removeLessonUploads);
  db.courses = db.courses.filter(c => c.id !== req.params.id);
  db.lessons = db.lessons.filter(l => l.courseId !== req.params.id);
  db.orders = db.orders.filter(o => o.courseId !== req.params.id);
  db.users.forEach(u => {
    if (u.enrolledCourses) u.enrolledCourses = u.enrolledCourses.filter(c => c !== req.params.id);
  });
  writeDB(db);
  res.json({ ok: true });
});

// -- lessons --
app.get('/api/admin/courses/:id/lessons', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  const lessons = db.lessons
    .filter(l => l.courseId === req.params.id)
    .sort((a, b) => a.order - b.order);
  res.json(lessons);
});

app.post('/api/admin/courses/:id/lessons', requireLogin, requireAdmin, handleUpload(videoUpload, 'videoFile', '1GB'), (req, res) => {
  const {
    title,
    description,
    videoUrl,
    assignment,
    handsOnProject,
    quiz,
    miniProject
  } = req.body;
  const uploadedVideoUrl = req.file ? '/uploads/' + req.file.filename : '';
  if (!title || (!uploadedVideoUrl && !videoUrl)) {
    removeUploadByUrl(uploadedVideoUrl);
    return res.status(400).json({ error: 'Title and video file are required' });
  }
  const db = readDB();
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) {
    removeUploadByUrl(uploadedVideoUrl);
    return res.status(404).json({ error: 'Course not found' });
  }
  const existing = db.lessons.filter(l => l.courseId === req.params.id);
  const lesson = {
    id: newId('l'),
    courseId: req.params.id,
    title,
    description: description || '',
    videoUrl: uploadedVideoUrl || videoUrl,
    videoType: uploadedVideoUrl ? 'upload' : 'link',
    videoOriginalName: req.file ? req.file.originalname : '',
    assignment: assignment || '',
    handsOnProject: handsOnProject || '',
    quiz: quiz || '',
    miniProject: miniProject || '',
    order: existing.length + 1,
    resources: []
  };
  db.lessons.push(lesson);
  writeDB(db);
  res.json(lesson);
});

app.delete('/api/admin/lessons/:id', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  const lesson = db.lessons.find(l => l.id === req.params.id);
  removeLessonUploads(lesson);
  db.lessons = db.lessons.filter(l => l.id !== req.params.id);
  Object.keys(db.progress).forEach(key => {
    if (key.endsWith('__' + req.params.id)) delete db.progress[key];
  });
  writeDB(db);
  res.json({ ok: true });
});

// -- resources (link or uploaded file) --
app.post('/api/admin/lessons/:id/resources/link', requireLogin, requireAdmin, (req, res) => {
  const { title, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL are required' });
  const db = readDB();
  const lesson = db.lessons.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  lesson.resources.push({ id: newId('r'), title, type: 'link', url });
  writeDB(db);
  res.json({ ok: true });
});

app.post(
  '/api/admin/lessons/:id/resources/file',
  requireLogin,
  requireAdmin,
  handleUpload(resourceUpload, 'file', '50MB'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const db = readDB();
    const lesson = db.lessons.find(l => l.id === req.params.id);
    if (!lesson) {
      removeUploadByUrl('/uploads/' + req.file.filename);
      return res.status(404).json({ error: 'Lesson not found' });
    }
    lesson.resources.push({
      id: newId('r'),
      title: req.body.title || req.file.originalname,
      type: 'file',
      url: '/uploads/' + req.file.filename
    });
    writeDB(db);
    res.json({ ok: true });
  }
);

app.delete('/api/admin/lessons/:lessonId/resources/:resourceId', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  const lesson = db.lessons.find(l => l.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const resource = lesson.resources.find(r => r.id === req.params.resourceId);
  if (resource?.type === 'file') removeUploadByUrl(resource.url);
  lesson.resources = lesson.resources.filter(r => r.id !== req.params.resourceId);
  writeDB(db);
  res.json({ ok: true });
});

// -- progress overview (accountability dashboard for the teacher) --
app.get('/api/admin/progress', requireLogin, requireAdmin, (req, res) => {
  const db = readDB();
  const students = db.users.filter(u => u.role === 'student');
  const result = students.map(student => {
    const courseProgress = student.enrolledCourses.map(courseId => {
      const course = db.courses.find(c => c.id === courseId);
      const lessons = db.lessons.filter(l => l.courseId === courseId);
      const completedCount = lessons.filter(
        l => db.progress[`${student.id}__${l.id}`]?.completed
      ).length;
      return {
        courseId,
        courseTitle: course ? course.title : 'Unknown course',
        totalLessons: lessons.length,
        completedLessons: completedCount,
        percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0
      };
    });
    return {
      studentId: student.id,
      name: student.name,
      username: student.username,
      lastActiveAt: student.lastActiveAt,
      courses: courseProgress
    };
  });
  res.json(result);
});

// ================= STUDENT ROUTES =================

app.get('/api/student/checkout-orders', requireLogin, requireStudent, (req, res) => {
  const db = readDB();
  const student = db.users.find(u => u.id === req.session.userId);
  const checkoutOrders = (db.orders || [])
    .filter(order => (
      order.studentId === student.id &&
      ['pending', 'approved'].includes(order.status) &&
      !student.enrolledCourses.includes(order.courseId)
    ))
    .sort((a, b) => new Date(b.approvedAt || b.createdAt) - new Date(a.approvedAt || a.createdAt))
    .map(order => studentCheckoutOrderPayload(db, order));
  res.json(checkoutOrders);
});

app.get('/api/checkout/:id', requireLogin, requireStudent, (req, res) => {
  const db = readDB();
  const student = db.users.find(u => u.id === req.session.userId);
  const order = db.orders.find(o => o.id === req.params.id && o.studentId === student.id);
  if (!order) return res.status(404).json({ error: 'Checkout not found' });
  const course = db.courses.find(c => c.id === order.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const lessons = db.lessons
    .filter(lesson => lesson.courseId === course.id)
    .sort((a, b) => a.order - b.order);
  res.json({
    order: studentCheckoutOrderPayload(db, order),
    course: marketplaceCoursePayload(course, lessons, student, order)
  });
});

app.post('/api/checkout/:id/complete', requireLogin, requireStudent, (req, res) => {
  const db = readDB();
  const student = db.users.find(u => u.id === req.session.userId);
  const order = db.orders.find(o => o.id === req.params.id && o.studentId === student.id);
  if (!order) return res.status(404).json({ error: 'Checkout not found' });
  const course = db.courses.find(c => c.id === order.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (order.status === 'pending') {
    return res.status(400).json({ error: 'This request needs teacher approval before checkout.' });
  }
  if (!['approved', 'paid'].includes(order.status)) {
    return res.status(400).json({ error: 'This checkout is not available.' });
  }

  order.status = 'paid';
  order.paidAt = order.paidAt || new Date().toISOString();
  order.paymentMethod = req.body.paymentMethod || 'manual';
  if (!student.enrolledCourses.includes(course.id)) student.enrolledCourses.push(course.id);
  writeDB(db);
  res.json({
    status: 'enrolled',
    message: 'Checkout complete. The course is now in your dashboard.'
  });
});

app.get('/api/student/courses', requireLogin, requireStudent, (req, res) => {
  const db = readDB();
  const student = db.users.find(u => u.id === req.session.userId);
  const courses = student.enrolledCourses.map(courseId => {
    const course = db.courses.find(c => c.id === courseId);
    if (!course) return null;
    const lessons = db.lessons
      .filter(l => l.courseId === courseId)
      .sort((a, b) => a.order - b.order)
      .map((l, idx, arr) => {
        const progressEntry = db.progress[`${student.id}__${l.id}`];
        const completed = !!progressEntry?.completed;
        let locked = false;
        if (course.requireSequential && idx > 0) {
          const prevLesson = arr[idx - 1];
          const prevDone = !!db.progress[`${student.id}__${prevLesson.id}`]?.completed;
          locked = !prevDone;
        }
        return {
          id: l.id,
          title: l.title,
          description: l.description,
          videoUrl: locked ? null : l.videoUrl,
          videoType: locked ? null : (l.videoType || 'link'),
          videoOriginalName: locked ? null : (l.videoOriginalName || ''),
          assignment: locked ? '' : (l.assignment || ''),
          handsOnProject: locked ? '' : (l.handsOnProject || ''),
          quiz: locked ? '' : (l.quiz || ''),
          miniProject: locked ? '' : (l.miniProject || ''),
          resources: locked ? [] : l.resources,
          completed,
          completedAt: progressEntry?.completedAt || null,
          locked
        };
      });
    const completedCount = lessons.filter(l => l.completed).length;
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      lessons,
      percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0
    };
  }).filter(Boolean);
  res.json(courses);
});

app.post('/api/student/lessons/:id/complete', requireLogin, requireStudent, (req, res) => {
  const db = readDB();
  const student = db.users.find(u => u.id === req.session.userId);
  const lesson = db.lessons.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (!student.enrolledCourses.includes(lesson.courseId)) {
    return res.status(403).json({ error: 'Not enrolled in this course' });
  }
  const key = `${student.id}__${lesson.id}`;
  const current = db.progress[key]?.completed;
  db.progress[key] = {
    completed: !current,
    completedAt: !current ? new Date().toISOString() : null
  };
  writeDB(db);
  touchActivity(student.id);
  res.json(db.progress[key]);
});

// ---------- page routes ----------
app.get('/', (req, res) => res.redirect('/login.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Course portal running on http://localhost:${PORT}`));
