let currentCourses = [];
let checkoutOrders = [];
let openCourseId = null;
let openLessonId = null;
let studentFullName = '';

async function init() {
  const meRes = await fetch('/api/me');
  if (!meRes.ok) return (window.location.href = 'login.html');
  const me = await meRes.json();
  if (me.role !== 'student') return (window.location.href = 'admin.html');
  document.getElementById('studentName').textContent = me.name;
  studentFullName = me.name;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'login.html';
  });

  await loadCourses();
}

function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    if (u.hostname.includes('drive.google.com')) {
      return url.replace('/view', '/preview');
    }
    return url; // fall back to raw link in an iframe
  } catch {
    return url;
  }
}

function renderLessonVideo(lesson) {
  if (!lesson.videoUrl) return '';
  if (lesson.videoType === 'upload') {
    return `
      <video class="video-frame" controls preload="metadata">
        <source src="${escapeAttr(lesson.videoUrl)}" />
        Your browser does not support the video tag.
      </video>
    `;
  }
  return `<iframe class="video-frame" src="${escapeAttr(toEmbedUrl(lesson.videoUrl))}" allowfullscreen frameborder="0"></iframe>`;
}

function formatMultiline(str) {
  return escapeHtml(str).replace(/\n/g, '<br />');
}

function renderSessionSection(title, body, options = {}) {
  if (!String(body || '').trim()) return '';
  return `
    <section class="session-section ${options.accent ? 'accent' : ''}">
      <div class="session-section-title">${escapeHtml(title)}</div>
      <div class="session-section-body">${formatMultiline(String(body).trim())}</div>
    </section>
  `;
}

function renderStudyResources(resources = []) {
  if (!resources.length) {
    return `
      <section class="session-section">
        <div class="session-section-title">Study resources</div>
        <div class="session-empty">No study resources uploaded for this session yet.</div>
      </section>
    `;
  }

  return `
    <section class="session-section">
      <div class="session-section-title">Study resources</div>
      <ul class="resource-list">
        ${resources.map(r => `<li><a href="${escapeAttr(r.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(r.title)}</a></li>`).join('')}
      </ul>
    </section>
  `;
}

async function loadCourses() {
  const [coursesRes, checkoutRes] = await Promise.all([
    fetch('/api/student/courses'),
    fetch('/api/student/checkout-orders')
  ]);
  currentCourses = await coursesRes.json();
  checkoutOrders = checkoutRes.ok ? await checkoutRes.json() : [];
  if (currentCourses.length && !currentCourses.some(course => course.id === openCourseId)) {
    openCourseId = currentCourses[0].id;
  }
  render();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function renderHero(studentName) {
  const hero = document.getElementById('heroSection');
  const totalCourses = currentCourses.length;
  const allLessons = currentCourses.flatMap(c => c.lessons);
  const completedLessons = allLessons.filter(l => l.completed).length;
  const overallPercent = allLessons.length ? Math.round((completedLessons / allLessons.length) * 100) : 0;

  hero.innerHTML = `
    <h1 class="hero-greeting">${greeting()}, ${escapeHtml(studentName.split(' ')[0])}.</h1>
    <p class="hero-sub">${totalCourses === 0 ? "You'll see your courses here once you're enrolled." : "Here's where you left off."}</p>
    ${totalCourses > 0 ? `
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-num">${totalCourses}</div>
          <div class="stat-label">${totalCourses === 1 ? 'Course' : 'Courses'} enrolled</div>
        </div>
        <div class="stat-card">
          <div class="stat-num accent">${completedLessons}/${allLessons.length}</div>
          <div class="stat-label">Lessons completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${overallPercent}%</div>
          <div class="stat-label">Overall progress</div>
        </div>
      </div>
    ` : ''}
  `;
}

function findNextLesson() {
  for (const course of currentCourses) {
    const next = course.lessons.find(l => !l.completed && !l.locked);
    if (next) return { lesson: next, course };
  }
  return null;
}

function renderContinue() {
  const el = document.getElementById('continueSection');
  if (currentCourses.length === 0) {
    el.innerHTML = '';
    return;
  }

  const next = findNextLesson();
  if (!next) {
    const anyLessons = currentCourses.some(c => c.lessons.length > 0);
    el.innerHTML = anyLessons ? `
      <div class="continue-card all-done">
        <div>
          <div class="continue-eyebrow">All caught up</div>
          <div class="continue-title">You've completed every lesson available right now 🎉</div>
          <p class="continue-course">Nice work — check back once your teacher adds more.</p>
        </div>
      </div>
    ` : '';
    return;
  }

  el.innerHTML = `
    <div class="continue-card">
      <div>
        <div class="continue-eyebrow">Continue learning</div>
        <div class="continue-title">${escapeHtml(next.lesson.title)}</div>
        <p class="continue-course">${escapeHtml(next.course.title)}</p>
      </div>
      <button data-jump-lesson="${next.lesson.id}">Resume lesson →</button>
    </div>
  `;
  el.querySelector('[data-jump-lesson]').addEventListener('click', () => {
    openLessonId = next.lesson.id;
    render();
    document.getElementById(`lesson-${next.lesson.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function renderCheckoutCart() {
  const el = document.getElementById('cartSection');
  if (!el) return;
  if (checkoutOrders.length === 0) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <section class="student-cart">
      <div class="student-cart-head">
        <div>
          <div class="continue-eyebrow">Checkout cart</div>
          <h2>Courses waiting for checkout</h2>
        </div>
        <a class="btn secondary" href="marketplace.html">Browse more</a>
      </div>
      <div class="cart-order-list">
        ${checkoutOrders.map(order => `
          <div class="cart-order-card">
            <div class="cart-order-cover ${order.imageUrl ? 'has-image' : ''}">
              ${order.imageUrl ? `<img src="${escapeAttr(order.imageUrl)}" alt="" />` : ''}
            </div>
            <div class="cart-order-body">
              <div class="cart-order-meta">
                <span>${escapeHtml(order.statusLabel)}</span>
                <strong>${escapeHtml(order.amountLabel)}</strong>
              </div>
              <h3>${escapeHtml(order.courseTitle)}</h3>
              <p>${escapeHtml(order.courseDescription || '')}</p>
            </div>
            <button ${order.status === 'approved' ? `data-checkout-order="${order.id}"` : 'disabled'}>
              ${order.status === 'approved' ? 'Go to checkout' : 'Waiting for approval'}
            </button>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  el.querySelectorAll('[data-checkout-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `checkout.html?order=${encodeURIComponent(btn.getAttribute('data-checkout-order'))}`;
    });
  });
}

function render() {
  renderHero(studentFullName);
  renderCheckoutCart();
  renderContinue();

  const container = document.getElementById('coursesContainer');
  if (currentCourses.length === 0) {
    container.innerHTML = `<div class="card empty-state">${checkoutOrders.length ? 'Complete checkout to unlock your approved courses here.' : "You're not enrolled in any courses yet. Your teacher will add you once your course is set up."}</div>`;
    return;
  }

  container.innerHTML = currentCourses.map(course => `
    <div class="card course-card ${openCourseId === course.id ? 'open' : ''}">
      <div class="course-head" data-toggle-course="${course.id}">
        <div>
          <h3>${escapeHtml(course.title)}</h3>
          <p class="course-desc">${escapeHtml(course.description || '')}</p>
          <div class="course-materials">
            <span>${course.lessons.length} ${course.lessons.length === 1 ? 'lesson' : 'lessons'}</span>
            <span>${countResources(course)} resources</span>
            <span>${countItems(course, 'quiz')} quizzes</span>
            <span>${countProjects(course)} projects</span>
          </div>
        </div>
        <button type="button" class="secondary" data-open-course="${course.id}">${openCourseId === course.id ? 'Close course' : 'Open course'}</button>
      </div>
      ${openCourseId === course.id ? `
        <div class="progress-row">
          <div class="progress-track" style="flex:1"><div class="progress-fill" style="width:${course.percent}%"></div></div>
          <div class="progress-pct">${course.percent}%</div>
        </div>
        <div class="lesson-list">
          ${course.lessons.length
            ? course.lessons.map((l, idx) => renderLesson(l, idx)).join('')
            : `<div class="empty-state compact">Lessons, resources, quizzes, and projects will appear here once the teacher adds them.</div>`
          }
        </div>
      ` : ''}
    </div>
  `).join('');

  container.querySelectorAll('[data-toggle-course]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-toggle-course');
      openCourseId = openCourseId === id ? null : id;
      openLessonId = null;
      render();
    });
  });

  container.querySelectorAll('[data-open-course]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-open-course');
      openCourseId = openCourseId === id ? null : id;
      openLessonId = null;
      render();
    });
  });

  container.querySelectorAll('[data-toggle-lesson]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-toggle-lesson');
      openLessonId = openLessonId === id ? null : id;
      render();
    });
  });

  container.querySelectorAll('[data-complete-lesson]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-complete-lesson');
      el.disabled = true;
      await fetch(`/api/student/lessons/${id}/complete`, { method: 'POST' });
      await loadCourses();
    });
  });
}

function countResources(course) {
  return course.lessons.reduce((total, lesson) => total + (lesson.resources || []).length, 0);
}

function countItems(course, key) {
  return course.lessons.filter(lesson => String(lesson[key] || '').trim()).length;
}

function countProjects(course) {
  return course.lessons.filter(lesson => (
    String(lesson.handsOnProject || '').trim() ||
    String(lesson.miniProject || '').trim()
  )).length;
}

function renderLesson(l, idx) {
  const isOpen = openLessonId === l.id && !l.locked;
  return `
    <div class="lesson-row ${l.locked ? 'locked' : ''}" id="lesson-${l.id}">
      <div class="lesson-head" ${l.locked ? '' : `data-toggle-lesson="${l.id}"`}>
        <div class="lesson-title-group">
          <div class="lesson-num ${l.completed ? 'done' : ''}">${l.completed ? '✓' : idx + 1}</div>
          <div class="lesson-title">${escapeHtml(l.title)}</div>
        </div>
        ${l.locked
          ? `<div class="lock-note">🔒 Complete the previous lesson first</div>`
          : `<div class="muted">${isOpen ? 'Hide' : 'View'}</div>`
        }
      </div>
      <div class="lesson-body ${isOpen ? 'open' : ''}">
        ${l.description ? `<p class="muted">${escapeHtml(l.description)}</p>` : ''}
        <section class="session-section video-session">
          <div class="session-section-title">Session video</div>
          ${renderLessonVideo(l)}
        </section>
        ${renderStudyResources(l.resources || [])}
        ${renderSessionSection('Assignment', l.assignment, { accent: true })}
        ${renderSessionSection('Hands-on project', l.handsOnProject)}
        ${renderSessionSection('Quiz after this session', l.quiz)}
        ${renderSessionSection('Mini project', l.miniProject, { accent: true })}
        <div class="mark-complete-row">
          <button data-complete-lesson="${l.id}" class="${l.completed ? 'secondary' : ''}">
            ${l.completed ? 'Mark as not watched' : 'Mark as complete'}
          </button>
          ${l.completed ? `<span class="muted">Completed ${new Date(l.completedAt).toLocaleDateString()}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }

init();
