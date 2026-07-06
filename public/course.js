let course = null;
let currentUser = null;

async function initCoursePage() {
  const hasViewer = await loadViewer();
  if (!hasViewer) return;
  renderNav();

  const id = new URLSearchParams(window.location.search).get('id');
  const container = document.getElementById('courseDetail');
  if (!id) {
    container.innerHTML = `<div class="card empty-state">Course not found.</div>`;
    return;
  }

  const res = await fetch(`/api/marketplace/courses/${encodeURIComponent(id)}`);
  if (res.status === 401) {
    window.location.href = loginUrl();
    return;
  }
  if (!res.ok) {
    container.innerHTML = `<div class="card empty-state">This course is not available on the marketplace.</div>`;
    return;
  }
  course = await res.json();
  document.title = `${course.title} - Digital Bridge Academy`;
  renderCourse();
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

function renderNav() {
  const nav = document.getElementById('courseNav');
  if (!currentUser) {
    nav.innerHTML = `
      <a class="btn secondary" href="marketplace.html">Marketplace</a>
      <a class="btn secondary" href="login.html">Sign in</a>
    `;
    return;
  }
  nav.innerHTML = `
    <span>${escapeHtml(currentUser.name)}</span>
    <a class="btn secondary" href="marketplace.html">Marketplace</a>
    <a class="btn secondary" href="${currentUser.role === 'admin' ? 'admin.html' : 'student.html'}">Dashboard</a>
  `;
}

function loginUrl() {
  return `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

function renderCourse() {
  const container = document.getElementById('courseDetail');
  container.innerHTML = `
    <div class="course-sales-grid">
      <section class="course-sales-main">
        <div class="course-sales-cover ${course.imageUrl ? 'has-image' : ''}">
          ${course.imageUrl ? `<img src="${escapeAttr(course.imageUrl)}" alt="" />` : ''}
          <span>${escapeHtml(course.category)}</span>
        </div>
        <div class="course-sales-card">
          <div class="market-card-meta">
            <span>${escapeHtml(course.level)}</span>
            <span>${escapeHtml(course.language)}</span>
            <span>${course.lessonCount} ${course.lessonCount === 1 ? 'lesson' : 'lessons'}</span>
          </div>
          <h1>${escapeHtml(course.title)}</h1>
          <p class="course-sales-description">${escapeHtml(course.salesDescription || course.description || '')}</p>
          <div class="course-teacher">By ${escapeHtml(course.teacherName)}</div>
        </div>

        ${course.whatYouWillLearn.length ? `
          <section class="course-sales-card">
            <h2>What students will learn</h2>
            <ul class="learn-list">
              ${course.whatYouWillLearn.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </section>
        ` : ''}

        <section class="course-sales-card">
          <h2>Course outline</h2>
          <div class="outline-list">
            ${course.outline.length
              ? course.outline.map(lesson => `
                <div class="outline-row">
                  <div>
                    <strong>${lesson.order}. ${escapeHtml(lesson.title)}</strong>
                    ${lesson.description ? `<p>${escapeHtml(lesson.description)}</p>` : ''}
                  </div>
                  <div class="outline-tags">
                    ${lesson.hasVideo ? '<span>Video</span>' : ''}
                    ${lesson.resourceCount ? `<span>${lesson.resourceCount} resources</span>` : ''}
                    ${lesson.hasAssignment ? '<span>Assignment</span>' : ''}
                    ${lesson.hasProject ? '<span>Project</span>' : ''}
                    ${lesson.hasQuiz ? '<span>Quiz</span>' : ''}
                  </div>
                </div>
              `).join('')
              : `<p class="muted">Lessons will appear here once the teacher adds them.</p>`
            }
          </div>
        </section>
      </section>

      <aside class="checkout-card">
        <div class="checkout-price">${escapeHtml(course.priceLabel)}</div>
        <p class="muted">Enroll to unlock the full course, uploaded videos, study resources, assignments, quizzes, and projects.</p>
        <button id="checkoutBtn" ${course.isEnrolled ? 'class="secondary"' : ''} ${course.orderStatus === 'pending' ? 'disabled' : ''}>
          ${checkoutButtonLabel()}
        </button>
        <div id="checkoutMessage" class="checkout-message"></div>
        ${course.priceKes > 0 ? `<p class="checkout-note">${escapeHtml(checkoutNoteText())}</p>` : ''}
      </aside>
    </div>
  `;

  document.getElementById('checkoutBtn').addEventListener('click', checkout);
}

function checkoutButtonLabel() {
  if (course.isEnrolled) return 'Go to dashboard';
  if (course.priceKes <= 0) return 'Enroll free';
  if (course.orderStatus === 'pending') return 'Waiting for approval';
  if (course.orderStatus === 'approved') return 'Go to checkout';
  return 'Request enrollment';
}

function checkoutNoteText() {
  if (course.orderStatus === 'pending') return 'Your request is with the teacher. Checkout opens after approval.';
  if (course.orderStatus === 'approved') return 'Your request was approved. Complete checkout to unlock the course.';
  if (course.orderStatus === 'paid' || course.isEnrolled) return 'Payment is complete and the course is unlocked.';
  return 'Paid courses start with a teacher approval request. After approval, the student is sent to checkout.';
}

async function checkout() {
  if (course.isEnrolled) {
    window.location.href = 'student.html';
    return;
  }
  if (course.orderStatus === 'approved' && course.checkoutUrl) {
    window.location.href = course.checkoutUrl;
    return;
  }
  if (course.orderStatus === 'pending') {
    setCheckoutMessage('Your request is waiting for teacher approval.');
    return;
  }
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  if (currentUser.role !== 'student') {
    setCheckoutMessage('Use a student account to enroll in marketplace courses.');
    return;
  }

  const btn = document.getElementById('checkoutBtn');
  btn.disabled = true;
  const res = await fetch(`/api/marketplace/courses/${encodeURIComponent(course.id)}/checkout`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  btn.disabled = false;

  if (!res.ok) {
    setCheckoutMessage(data.error || 'Could not start enrollment.');
    return;
  }

  setCheckoutMessage(data.message || 'Enrollment request sent.');
  if (data.status === 'approved_for_checkout' && data.checkoutUrl) {
    window.location.href = data.checkoutUrl;
    return;
  }
  if (data.status === 'enrolled' || data.status === 'already_enrolled') {
    btn.textContent = 'Go to dashboard';
    btn.classList.add('secondary');
    course.isEnrolled = true;
    return;
  }
  if (data.status === 'pending') {
    course.orderStatus = 'pending';
    renderCourse();
    setCheckoutMessage(data.message || 'Your request is waiting for teacher approval.');
  }
}

function setCheckoutMessage(message) {
  document.getElementById('checkoutMessage').textContent = message;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }

initCoursePage();
