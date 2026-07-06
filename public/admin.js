let courses = [];
let students = [];
let orders = [];
let openCourseId = null;
let lessonsCache = {}; // courseId -> lessons[]

const modalBackdrop = document.getElementById('modalBackdrop');
const modalContent = document.getElementById('modalContent');

function openModal(html) {
  modalContent.innerHTML = html;
  modalBackdrop.classList.add('open');
}
function closeModal() {
  modalBackdrop.classList.remove('open');
  modalContent.innerHTML = '';
}
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }

function lessonVideoSummary(lesson) {
  if (!lesson.videoUrl) return '';
  const label = lesson.videoType === 'upload'
    ? `Uploaded video: ${lesson.videoOriginalName || lesson.videoUrl.split('/').pop()}`
    : lesson.videoUrl;
  return `<p class="muted mt-8">🎬 ${escapeHtml(label)}</p>`;
}

function lessonPromptSummary(lesson) {
  const items = [
    ['Assignment', lesson.assignment],
    ['Hands-on project', lesson.handsOnProject],
    ['Quiz', lesson.quiz],
    ['Mini project', lesson.miniProject]
  ].filter(([, value]) => String(value || '').trim());

  if (items.length === 0) return '';
  return `
    <div class="lesson-meta-grid mt-8">
      ${items.map(([label, value]) => `
        <div class="lesson-meta-item">
          <strong>${label}</strong>
          <span>${escapeHtml(String(value).trim())}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function priceLabel(priceKes) {
  const price = Number(priceKes || 0);
  return price > 0 ? `KES ${price.toLocaleString()}` : 'Free';
}

function checkedAttr(value) {
  return value ? 'checked' : '';
}

function activateTab(tabName) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const panel = document.getElementById('panel-' + tabName);
  if (!tab || !panel) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  panel.classList.add('active');
  if (tabName === 'orders') loadOrders();
}

async function init() {
  const meRes = await fetch('/api/me');
  if (!meRes.ok) return (window.location.href = 'login.html');
  const me = await meRes.json();
  if (me.role !== 'admin') return (window.location.href = 'student.html');
  document.getElementById('adminName').textContent = me.name;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'login.html';
  });

  document.getElementById('changePwBtn').addEventListener('click', showChangePasswordModal);
  document.getElementById('newCourseBtn').addEventListener('click', showNewCourseModal);
  document.getElementById('newStudentBtn').addEventListener('click', showNewStudentModal);

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.tab);
    });
  });

  await Promise.all([loadCourses(), loadStudents(), loadProgress(), loadOrders()]);
  if (window.location.hash === '#courses') activateTab('courses');
  if (window.location.hash === '#orders') activateTab('orders');
}

// ---------------- PROGRESS TAB ----------------
async function loadProgress() {
  const res = await fetch('/api/admin/progress');
  const data = await res.json();
  const container = document.getElementById('progressContainer');

  if (data.length === 0) {
    container.innerHTML = `<div class="card empty-state">No students yet. Add a student and enroll them in a course to see progress here.</div>`;
    return;
  }

  container.innerHTML = data.map(student => {
    const activity = activityPill(student.lastActiveAt);
    return `
      <div class="card" style="margin-bottom:16px;">
        <div class="space-between">
          <div>
            <strong>${escapeHtml(student.name)}</strong>
            <span class="muted">@${escapeHtml(student.username)}</span>
          </div>
          ${activity}
        </div>
        ${student.courses.length === 0
          ? `<p class="muted mt-8">Not enrolled in any course.</p>`
          : student.courses.map(c => `
            <div class="mt-16">
              <div class="space-between">
                <span style="font-size:14px; font-weight:600;">${escapeHtml(c.courseTitle)}</span>
                <span class="muted">${c.completedLessons}/${c.totalLessons} lessons</span>
              </div>
              <div class="progress-row mt-8">
                <div class="progress-track" style="flex:1"><div class="progress-fill" style="width:${c.percent}%"></div></div>
                <div class="progress-pct">${c.percent}%</div>
              </div>
            </div>
          `).join('')}
      </div>
    `;
  }).join('');
}

function activityPill(lastActiveAt) {
  if (!lastActiveAt) return `<span class="pill stale">Never logged in</span>`;
  const days = (Date.now() - new Date(lastActiveAt)) / (1000 * 60 * 60 * 24);
  if (days < 2) return `<span class="pill fresh">Active recently</span>`;
  if (days < 7) return `<span class="pill">Active ${Math.floor(days)}d ago</span>`;
  return `<span class="pill stale">Inactive ${Math.floor(days)}d</span>`;
}

// ---------------- MARKETPLACE ORDERS TAB ----------------
async function loadOrders() {
  const res = await fetch('/api/admin/orders');
  orders = await res.json();
  renderOrders();
}

function renderOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;
  const pending = orders.filter(order => order.status === 'pending');
  if (orders.length === 0) {
    container.innerHTML = `<div class="card empty-state">No marketplace checkout requests yet. Published paid courses will appear here when students request enrollment.</div>`;
    return;
  }

  container.innerHTML = `
    ${pending.length === 0 ? `<div class="card empty-state" style="margin-bottom:16px;">No pending approvals right now.</div>` : ''}
    <div class="card">
      <table>
        <thead><tr><th>Student</th><th>Course</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${orders.map(order => `
            <tr>
              <td>${escapeHtml(order.studentName)} <span class="muted">@${escapeHtml(order.studentUsername)}</span></td>
              <td>${escapeHtml(order.courseTitle)}</td>
              <td>${escapeHtml(order.amountLabel)}</td>
              <td><span class="pill ${order.status === 'paid' ? 'fresh' : ''}">${escapeHtml(order.statusLabel || order.status)}</span></td>
              <td>
                ${order.status === 'pending'
                  ? `<button data-approve-order="${order.id}">Approve for checkout</button>`
                  : order.status === 'approved'
                    ? `<span class="muted">Waiting for checkout</span>`
                    : `<span class="muted">${order.paidAt ? new Date(order.paidAt).toLocaleDateString() : ''}</span>`
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-approve-order]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const res = await fetch(`/api/admin/orders/${btn.getAttribute('data-approve-order')}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        btn.disabled = false;
        return alert(data.error || 'Could not approve this order.');
      }
      await Promise.all([loadOrders(), loadStudents(), loadProgress()]);
    });
  });
}

// ---------------- COURSES TAB ----------------
async function loadCourses() {
  const res = await fetch('/api/admin/courses');
  courses = await res.json();
  renderCourses();
}

function renderCourses() {
  const container = document.getElementById('coursesContainer');
  if (courses.length === 0) {
    container.innerHTML = `<div class="card empty-state">No courses yet. Create your first course to start adding lessons.</div>`;
    return;
  }
  container.innerHTML = courses.map(c => `
    <div class="card course-card">
      <div class="course-head">
        <div style="cursor:pointer" data-open-course="${c.id}">
          <h3>${escapeHtml(c.title)}</h3>
          <p class="course-desc">${escapeHtml(c.description || '')}</p>
          <div class="market-meta mt-8">
            <span class="pill ${c.isPublished ? 'fresh' : ''}">${c.isPublished ? 'Published' : 'Draft'}</span>
            <span class="pill">${escapeHtml(priceLabel(c.priceKes))}</span>
            <span class="pill">${escapeHtml(c.category || 'General')}</span>
            <span class="pill">${escapeHtml(c.language || 'English')}</span>
            <span class="pill">${escapeHtml(c.level || 'Beginner')}</span>
          </div>
        </div>
        <div class="row-gap">
          <button class="secondary" data-open-course="${c.id}">${openCourseId === c.id ? 'Hide lessons' : 'View lessons'}</button>
          <button class="secondary" data-market-settings="${c.id}">Marketplace settings</button>
          ${c.isPublished ? `<a class="btn secondary" href="course.html?id=${encodeURIComponent(c.id)}" target="_blank">View page</a>` : ''}
          <button class="danger" data-delete-course="${c.id}">Delete</button>
        </div>
      </div>
      <div id="lessons-${c.id}">${openCourseId === c.id ? '<p class="muted">Loading…</p>' : ''}</div>
    </div>
  `).join('');

  container.querySelectorAll('[data-open-course]').forEach(el => {
    el.addEventListener('click', async () => {
      const id = el.getAttribute('data-open-course');
      openCourseId = openCourseId === id ? null : id;
      renderCourses();
      if (openCourseId) await loadLessons(id);
    });
  });
  container.querySelectorAll('[data-delete-course]').forEach(el => {
    el.addEventListener('click', async () => {
      if (!confirm('Delete this course and all its lessons? This cannot be undone.')) return;
      await fetch(`/api/admin/courses/${el.getAttribute('data-delete-course')}`, { method: 'DELETE' });
      await loadCourses();
      await loadProgress();
      await loadOrders();
    });
  });
  container.querySelectorAll('[data-market-settings]').forEach(el => {
    el.addEventListener('click', () => {
      const course = courses.find(c => c.id === el.getAttribute('data-market-settings'));
      showMarketplaceSettingsModal(course);
    });
  });
}

async function loadLessons(courseId) {
  const res = await fetch(`/api/admin/courses/${courseId}/lessons`);
  lessonsCache[courseId] = await res.json();
  renderLessons(courseId);
}

function renderLessons(courseId) {
  const el = document.getElementById(`lessons-${courseId}`);
  if (!el) return;
  const lessons = lessonsCache[courseId] || [];
  el.innerHTML = `
    <hr class="divider" />
    <div class="lesson-list">
      ${lessons.map((l, idx) => `
        <div class="lesson-row">
          <div class="space-between">
            <div class="lesson-title-group">
              <div class="lesson-num">${idx + 1}</div>
              <div class="lesson-title">${escapeHtml(l.title)}</div>
            </div>
            <button class="danger" data-delete-lesson="${l.id}" data-course="${courseId}">Delete</button>
          </div>
          ${l.description ? `<p class="muted mt-8">${escapeHtml(l.description)}</p>` : ''}
          ${lessonVideoSummary(l)}
          ${lessonPromptSummary(l)}
          <ul class="resource-list">
            ${(l.resources || []).map(r => `
              <li style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <a href="${escapeAttr(r.url)}" target="_blank">📎 ${escapeHtml(r.title)}</a>
                <button class="secondary" style="padding:4px 8px;" data-delete-resource="${r.id}" data-lesson="${l.id}">✕</button>
              </li>
            `).join('')}
          </ul>
          <div class="row-gap mt-8">
            <button class="secondary" data-add-link="${l.id}">+ Add resource link</button>
            <button class="secondary" data-add-file="${l.id}">+ Upload file</button>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="mt-16" data-add-lesson="${courseId}">+ Add lesson</button>
  `;

  el.querySelector(`[data-add-lesson]`)?.addEventListener('click', () => showNewLessonModal(courseId));
  el.querySelectorAll('[data-delete-lesson]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this lesson?')) return;
      await fetch(`/api/admin/lessons/${btn.getAttribute('data-delete-lesson')}`, { method: 'DELETE' });
      await loadLessons(btn.getAttribute('data-course'));
      await loadProgress();
    });
  });
  el.querySelectorAll('[data-add-link]').forEach(btn => {
    btn.addEventListener('click', () => showAddLinkModal(btn.getAttribute('data-add-link'), courseId));
  });
  el.querySelectorAll('[data-add-file]').forEach(btn => {
    btn.addEventListener('click', () => showAddFileModal(btn.getAttribute('data-add-file'), courseId));
  });
  el.querySelectorAll('[data-delete-resource]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lessonId = btn.getAttribute('data-lesson');
      await fetch(`/api/admin/lessons/${lessonId}/resources/${btn.getAttribute('data-delete-resource')}`, { method: 'DELETE' });
      await loadLessons(courseId);
    });
  });
}

function showNewCourseModal() {
  openModal(`
    <h3>New course</h3>
    <form id="newCourseForm">
      <div class="field"><label>Title</label><input name="title" required /></div>
      <div class="field"><label>Description</label><textarea name="description" rows="3"></textarea></div>
      <div class="field"><label>Sales page description</label><textarea name="salesDescription" rows="4" placeholder="Describe who this course is for and the outcome students will get."></textarea></div>
      <div class="field"><label>Cover image URL</label><input name="imageUrl" placeholder="/course-covers/course-name.png" /></div>
      <div class="field"><label>What students will learn</label><textarea name="whatYouWillLearn" rows="4" placeholder="One learning outcome per line."></textarea></div>
      <div class="form-grid">
        <div class="field"><label>Price (KES)</label><input name="priceKes" type="number" min="0" step="1" value="0" /></div>
        <div class="field"><label>Category</label><input name="category" placeholder="Data Analysis" /></div>
        <div class="field"><label>Language</label><input name="language" placeholder="English" value="English" /></div>
        <div class="field"><label>Level</label><input name="level" placeholder="Beginner" value="Beginner" /></div>
      </div>
      <div class="field">
        <label style="display:flex; align-items:center; gap:8px; text-transform:none; font-weight:500;">
          <input type="checkbox" name="requireSequential" checked style="width:auto;" />
          Require lessons to be watched in order
        </label>
      </div>
      <div class="field">
        <label style="display:flex; align-items:center; gap:8px; text-transform:none; font-weight:500;">
          <input type="checkbox" name="isPublished" style="width:auto;" />
          Publish this course on the marketplace
        </label>
      </div>
      <div class="row-gap mt-16">
        <button type="submit">Create course</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('newCourseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'),
        description: fd.get('description'),
        salesDescription: fd.get('salesDescription'),
        imageUrl: fd.get('imageUrl'),
        whatYouWillLearn: fd.get('whatYouWillLearn'),
        priceKes: fd.get('priceKes'),
        category: fd.get('category'),
        language: fd.get('language'),
        level: fd.get('level'),
        requireSequential: fd.get('requireSequential') === 'on',
        isPublished: fd.get('isPublished') === 'on'
      })
    });
    closeModal();
    await loadCourses();
    await loadProgress();
  });
}

function showMarketplaceSettingsModal(course) {
  if (!course) return;
  openModal(`
    <h3>Marketplace settings</h3>
    <form id="marketSettingsForm">
      <div class="field"><label>Course title</label><input name="title" value="${escapeAttr(course.title || '')}" required /></div>
      <div class="field"><label>Short description</label><textarea name="description" rows="3">${escapeHtml(course.description || '')}</textarea></div>
      <div class="field"><label>Sales page description</label><textarea name="salesDescription" rows="4">${escapeHtml(course.salesDescription || course.description || '')}</textarea></div>
      <div class="field"><label>Cover image URL</label><input name="imageUrl" value="${escapeAttr(course.imageUrl || '')}" placeholder="/course-covers/course-name.png" /></div>
      <div class="field"><label>What students will learn</label><textarea name="whatYouWillLearn" rows="4" placeholder="One learning outcome per line.">${escapeHtml(course.whatYouWillLearn || '')}</textarea></div>
      <div class="form-grid">
        <div class="field"><label>Price (KES)</label><input name="priceKes" type="number" min="0" step="1" value="${Number(course.priceKes || 0)}" /></div>
        <div class="field"><label>Category</label><input name="category" value="${escapeAttr(course.category || 'General')}" /></div>
        <div class="field"><label>Language</label><input name="language" value="${escapeAttr(course.language || 'English')}" /></div>
        <div class="field"><label>Level</label><input name="level" value="${escapeAttr(course.level || 'Beginner')}" /></div>
      </div>
      <div class="field">
        <label style="display:flex; align-items:center; gap:8px; text-transform:none; font-weight:500;">
          <input type="checkbox" name="requireSequential" ${checkedAttr(course.requireSequential !== false)} style="width:auto;" />
          Require lessons to be watched in order
        </label>
      </div>
      <div class="field">
        <label style="display:flex; align-items:center; gap:8px; text-transform:none; font-weight:500;">
          <input type="checkbox" name="isPublished" ${checkedAttr(course.isPublished)} style="width:auto;" />
          Publish this course on the marketplace
        </label>
      </div>
      <div class="row-gap mt-16">
        <button type="submit">Save settings</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('marketSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await fetch(`/api/admin/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'),
        description: fd.get('description'),
        salesDescription: fd.get('salesDescription'),
        imageUrl: fd.get('imageUrl'),
        whatYouWillLearn: fd.get('whatYouWillLearn'),
        priceKes: fd.get('priceKes'),
        category: fd.get('category'),
        language: fd.get('language'),
        level: fd.get('level'),
        requireSequential: fd.get('requireSequential') === 'on',
        isPublished: fd.get('isPublished') === 'on'
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'Could not save marketplace settings.');
    closeModal();
    await loadCourses();
  });
}

function showNewLessonModal(courseId) {
  openModal(`
    <h3>Add lesson</h3>
    <form id="newLessonForm" enctype="multipart/form-data">
      <div class="field"><label>Lesson title</label><input name="title" required /></div>
      <div class="field"><label>Description (optional)</label><textarea name="description" rows="2"></textarea></div>
      <div class="field">
        <label>Video file (MP4, MOV, WebM, AVI, or MKV — max 1GB)</label>
        <input name="videoFile" type="file" accept="video/*" required />
      </div>
      <div class="field"><label>Assignment after this session</label><textarea name="assignment" rows="3" placeholder="What should the student complete after watching?"></textarea></div>
      <div class="field"><label>Hands-on project</label><textarea name="handsOnProject" rows="3" placeholder="A practical task they should do step by step."></textarea></div>
      <div class="field"><label>Quiz</label><textarea name="quiz" rows="4" placeholder="Add quick questions, one per line."></textarea></div>
      <div class="field"><label>Mini project</label><textarea name="miniProject" rows="3" placeholder="A small project to prove they understood the session."></textarea></div>
      <div class="row-gap mt-16">
        <button type="submit">Add lesson</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('newLessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    const res = await fetch(`/api/admin/courses/${courseId}/lessons`, {
      method: 'POST',
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add lesson';
      return alert(data.error || 'Could not add the lesson.');
    }
    closeModal();
    await loadLessons(courseId);
    await loadProgress();
  });
}

function showAddLinkModal(lessonId, courseId) {
  openModal(`
    <h3>Add resource link</h3>
    <form id="addLinkForm">
      <div class="field"><label>Title</label><input name="title" placeholder="e.g. Lecture slides" required /></div>
      <div class="field"><label>URL</label><input name="url" placeholder="https://..." required /></div>
      <div class="row-gap mt-16">
        <button type="submit">Add</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('addLinkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await fetch(`/api/admin/lessons/${lessonId}/resources/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: fd.get('title'), url: fd.get('url') })
    });
    closeModal();
    await loadLessons(courseId);
  });
}

function showAddFileModal(lessonId, courseId) {
  openModal(`
    <h3>Upload resource file</h3>
    <form id="addFileForm">
      <div class="field"><label>Title (optional)</label><input name="title" placeholder="e.g. Worksheet 1" /></div>
      <div class="field"><label>File (PDF, doc, etc — max 50MB)</label><input name="file" type="file" required /></div>
      <div class="row-gap mt-16">
        <button type="submit">Upload</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('addFileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await fetch(`/api/admin/lessons/${lessonId}/resources/file`, { method: 'POST', body: fd });
    closeModal();
    await loadLessons(courseId);
  });
}

// ---------------- STUDENTS TAB ----------------
async function loadStudents() {
  const res = await fetch('/api/admin/students');
  students = await res.json();
  renderStudents();
}

function renderStudents() {
  const container = document.getElementById('studentsContainer');
  if (students.length === 0) {
    container.innerHTML = `<div class="card empty-state">No students yet. Add one to get started — since students pay manually, you create their login here.</div>`;
    return;
  }
  container.innerHTML = `
    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Username</th><th>Enrolled courses</th><th></th></tr></thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td>${escapeHtml(s.name)}</td>
              <td>${escapeHtml(s.username)}</td>
              <td>${s.enrolledCourses.map(id => escapeHtml(courses.find(c => c.id === id)?.title || 'Unknown')).join(', ') || '<span class="muted">None</span>'}</td>
              <td class="row-gap">
                <button class="secondary" data-enroll="${s.id}">Enroll</button>
                <button class="secondary" data-reset-pw="${s.id}">Reset password</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.querySelectorAll('[data-enroll]').forEach(btn => {
    btn.addEventListener('click', () => showEnrollModal(btn.getAttribute('data-enroll')));
  });
  container.querySelectorAll('[data-reset-pw]').forEach(btn => {
    btn.addEventListener('click', () => showResetPasswordModal(btn.getAttribute('data-reset-pw')));
  });
}

function showNewStudentModal() {
  openModal(`
    <h3>New student</h3>
    <form id="newStudentForm">
      <div class="field"><label>Full name</label><input name="name" required /></div>
      <div class="field"><label>Username</label><input name="username" required /></div>
      <div class="field"><label>Password</label><input name="password" required minlength="6" /></div>
      <p class="muted">Share these login details with the student directly.</p>
      <div class="row-gap mt-16">
        <button type="submit">Create student</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('newStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fd.get('name'), username: fd.get('username'), password: fd.get('password') })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    closeModal();
    await loadStudents();
    await loadProgress();
  });
}

function showEnrollModal(studentId) {
  const student = students.find(s => s.id === studentId);
  openModal(`
    <h3>Enroll ${escapeHtml(student.name)}</h3>
    <div class="field">
      <label>Course</label>
      <select id="courseSelect">
        ${courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('')}
      </select>
    </div>
    <div class="row-gap mt-16">
      <button id="enrollConfirm">Enroll</button>
      <button type="button" class="secondary" id="cancelBtn">Cancel</button>
    </div>
    ${student.enrolledCourses.length ? `
      <hr class="divider" />
      <p class="muted">Currently enrolled in:</p>
      ${student.enrolledCourses.map(cid => `
        <div class="space-between mt-8">
          <span>${escapeHtml(courses.find(c => c.id === cid)?.title || 'Unknown')}</span>
          <button class="danger" data-unenroll="${cid}" style="padding:4px 10px;">Remove</button>
        </div>
      `).join('')}
    ` : ''}
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('enrollConfirm').addEventListener('click', async () => {
    const courseId = document.getElementById('courseSelect').value;
    await fetch(`/api/admin/students/${studentId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });
    closeModal();
    await loadStudents();
    await loadProgress();
  });
  document.querySelectorAll('[data-unenroll]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/admin/students/${studentId}/unenroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: btn.getAttribute('data-unenroll') })
      });
      closeModal();
      await loadStudents();
      await loadProgress();
    });
  });
}

function showResetPasswordModal(studentId) {
  openModal(`
    <h3>Reset password</h3>
    <form id="resetPwForm">
      <div class="field"><label>New password</label><input name="newPassword" required minlength="6" /></div>
      <div class="row-gap mt-16">
        <button type="submit">Reset</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('resetPwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await fetch(`/api/admin/students/${studentId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: fd.get('newPassword') })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    closeModal();
    alert('Password updated.');
  });
}

function showChangePasswordModal() {
  openModal(`
    <h3>Change your password</h3>
    <form id="changePwForm">
      <div class="field"><label>Current password</label><input name="currentPassword" type="password" required /></div>
      <div class="field"><label>New password</label><input name="newPassword" type="password" required minlength="6" /></div>
      <div class="row-gap mt-16">
        <button type="submit">Update</button>
        <button type="button" class="secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('changePwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    closeModal();
    alert('Password updated.');
  });
}

init();
