let marketplaceCourses = [];
let currentUser = null;

async function initMarketplace() {
  const hasViewer = await loadViewer();
  if (!hasViewer) return;
  const res = await fetch('/api/marketplace/courses');
  if (!res.ok) {
    window.location.href = loginUrl();
    return;
  }
  marketplaceCourses = await res.json();
  document.getElementById('courseSearch').addEventListener('input', renderMarketplace);
  renderNav();
  renderActions();
  renderMarketplace();
}

async function loadViewer() {
  const res = await fetch('/api/me');
  if (!res.ok) {
    window.location.href = loginUrl();
    return false;
  }
  currentUser = await res.json();
  return true;
}

function loginUrl() {
  return `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

function renderNav() {
  const nav = document.getElementById('marketNav');
  if (!currentUser) {
    nav.innerHTML = `<a class="btn secondary" href="login.html">Sign in</a>`;
    return;
  }
  nav.innerHTML = `
    <span>${escapeHtml(currentUser.name)}</span>
    <a class="btn secondary" href="${currentUser.role === 'admin' ? 'admin.html#courses' : 'student.html'}">${currentUser.role === 'admin' ? 'Teacher dashboard' : 'Dashboard'}</a>
  `;
}

function renderActions() {
  const actions = document.getElementById('marketplaceActions');
  if (!actions) return;
  if (currentUser?.role === 'admin') {
    actions.innerHTML = `
      <a class="btn" href="admin.html#courses">Create course</a>
    `;
    return;
  }
  actions.innerHTML = '';
}

function renderMarketplace() {
  const grid = document.getElementById('marketplaceGrid');
  const query = document.getElementById('courseSearch').value.trim().toLowerCase();
  const courses = marketplaceCourses.filter(course => {
    const haystack = [
      course.title,
      course.description,
      course.salesDescription,
      course.teacherName,
      course.category,
      course.language,
      course.level
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (courses.length === 0) {
    grid.innerHTML = `<div class="card empty-state marketplace-empty">No published courses match your search yet.</div>`;
    return;
  }

  grid.innerHTML = courses.map(course => `
    <a class="market-course-card" href="course.html?id=${encodeURIComponent(course.id)}">
      <div class="market-card-cover ${course.imageUrl ? 'has-image' : ''}">
        ${course.imageUrl ? `<img src="${escapeAttr(course.imageUrl)}" alt="" loading="lazy" />` : ''}
        <span>${escapeHtml(course.category)}</span>
      </div>
      <div class="market-card-body">
        <div class="market-card-meta">
          <span>${escapeHtml(course.level)}</span>
          <span>${escapeHtml(course.language)}</span>
        </div>
        <h2>${escapeHtml(course.title)}</h2>
        <p>${escapeHtml(course.salesDescription || course.description || '')}</p>
        <div class="market-card-footer">
          <span>${escapeHtml(course.teacherName)}</span>
          <strong>${escapeHtml(course.priceLabel)}</strong>
        </div>
        <div class="market-card-lessons">${course.lessonCount} ${course.lessonCount === 1 ? 'lesson' : 'lessons'}</div>
      </div>
    </a>
  `).join('');
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }

initMarketplace();
