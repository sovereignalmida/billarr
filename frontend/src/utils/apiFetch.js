export function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  // JWT mode takes priority
  const token = localStorage.getItem('billarr-token');
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    // Legacy Basic Auth fallback
    const password = sessionStorage.getItem('billarr-auth');
    if (password) headers['Authorization'] = 'Basic ' + btoa(':' + password);
  }

  return fetch(path, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body.errors ? body.errors.join(', ') : (body.error || `HTTP ${res.status}`);
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  });
}

/** Persist JWT token after login */
export function setAuthToken(token) {
  if (token) localStorage.setItem('billarr-token', token);
  else localStorage.removeItem('billarr-token');
}

/** Clear all auth state */
export function clearAuth() {
  localStorage.removeItem('billarr-token');
  sessionStorage.removeItem('billarr-auth');
}
