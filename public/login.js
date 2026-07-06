const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const nextUrl = safeNextUrl();

// If already logged in, bounce to the right dashboard
fetch('/api/me').then(r => r.ok ? r.json() : null).then(me => {
  if (me) window.location.href = nextUrl || defaultLanding(me.role);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.classList.remove('show');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorMsg.textContent = data.error || 'Something went wrong. Try again.';
      errorMsg.classList.add('show');
      return;
    }
    window.location.href = nextUrl || defaultLanding(data.role);
  } catch (err) {
    errorMsg.textContent = 'Could not reach the server. Check your connection.';
    errorMsg.classList.add('show');
  }
});

function defaultLanding(role) {
  return role === 'admin' ? 'admin.html' : 'student.html';
}

function safeNextUrl() {
  const raw = new URLSearchParams(window.location.search).get('next');
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.endsWith('/login.html')) return '';
    return url.pathname + url.search + url.hash;
  } catch {
    return '';
  }
}
