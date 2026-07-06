let currentUser = null;
let checkoutData = null;

async function initCheckout() {
  await loadViewer();
  renderNav();

  const orderId = new URLSearchParams(window.location.search).get('order');
  const container = document.getElementById('checkoutContainer');
  if (!orderId) {
    container.innerHTML = `<div class="card empty-state">Checkout not found.</div>`;
    return;
  }

  const res = await fetch(`/api/checkout/${encodeURIComponent(orderId)}`);
  if (!res.ok) {
    container.innerHTML = `<div class="card empty-state">This checkout is not available.</div>`;
    return;
  }

  checkoutData = await res.json();
  document.title = `${checkoutData.order.courseTitle} checkout - Digital Bridge Academy`;
  renderCheckout();
}

async function loadViewer() {
  const res = await fetch('/api/me');
  if (!res.ok) {
    window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }
  currentUser = await res.json();
  if (currentUser.role !== 'student') window.location.href = 'admin.html';
}

function renderNav() {
  const nav = document.getElementById('checkoutNav');
  nav.innerHTML = `
    <span>${escapeHtml(currentUser?.name || '')}</span>
    <a class="btn secondary" href="marketplace.html">Marketplace</a>
    <a class="btn secondary" href="student.html">Dashboard</a>
  `;
}

function renderCheckout() {
  const { order, course } = checkoutData;
  const isApproved = order.status === 'approved';
  const isPaid = order.status === 'paid' || course.isEnrolled;

  document.getElementById('checkoutContainer').innerHTML = `
    <div class="checkout-page-grid">
      <section class="checkout-main card">
        <div class="checkout-step-label">${escapeHtml(order.statusLabel)}</div>
        <h1>Checkout</h1>
        <p class="muted">Complete checkout to unlock the course in your student dashboard.</p>

        <div class="payment-panel">
          <h2>Payment method</h2>
          <label class="payment-method-option">
            <input type="radio" name="paymentMethod" value="mpesa" checked ${isApproved ? '' : 'disabled'} />
            <span>
              <strong>M-Pesa</strong>
              <small>Use this for mobile money checkout.</small>
            </span>
          </label>
          <label class="payment-method-option">
            <input type="radio" name="paymentMethod" value="card" ${isApproved ? '' : 'disabled'} />
            <span>
              <strong>Card</strong>
              <small>Use this when card payments are connected.</small>
            </span>
          </label>
        </div>

        <button id="completeCheckoutBtn" ${isApproved ? '' : 'disabled'}>
          ${isPaid ? 'Course unlocked' : isApproved ? 'Complete checkout' : 'Waiting for approval'}
        </button>
        <div id="checkoutMessage" class="checkout-message"></div>
        ${isPaid ? `<a class="btn secondary checkout-dashboard-link" href="student.html">Go to dashboard</a>` : ''}
      </section>

      <aside class="checkout-summary card">
        <div class="checkout-course-cover ${order.imageUrl ? 'has-image' : ''}">
          ${order.imageUrl ? `<img src="${escapeAttr(order.imageUrl)}" alt="" />` : ''}
        </div>
        <div class="market-card-meta">
          <span>${escapeHtml(course.level)}</span>
          <span>${escapeHtml(course.language)}</span>
          <span>${course.lessonCount} ${course.lessonCount === 1 ? 'lesson' : 'lessons'}</span>
        </div>
        <h2>${escapeHtml(order.courseTitle)}</h2>
        <p>${escapeHtml(course.salesDescription || order.courseDescription || '')}</p>
        <div class="checkout-total">
          <span>Total</span>
          <strong>${escapeHtml(order.amountLabel)}</strong>
        </div>
      </aside>
    </div>
  `;

  document.getElementById('completeCheckoutBtn')?.addEventListener('click', completeCheckout);
}

async function completeCheckout() {
  const btn = document.getElementById('completeCheckoutBtn');
  const selected = document.querySelector('input[name="paymentMethod"]:checked');
  btn.disabled = true;

  const res = await fetch(`/api/checkout/${encodeURIComponent(checkoutData.order.id)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethod: selected?.value || 'manual' })
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    btn.disabled = false;
    setCheckoutMessage(data.error || 'Could not complete checkout.');
    return;
  }

  setCheckoutMessage(data.message || 'Checkout complete.');
  setTimeout(() => {
    window.location.href = 'student.html';
  }, 900);
}

function setCheckoutMessage(message) {
  document.getElementById('checkoutMessage').textContent = message;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }

initCheckout();
