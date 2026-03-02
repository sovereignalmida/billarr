export function apiFetch(path, options = {}) {
  const password = sessionStorage.getItem('billarr-auth');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (password) headers['Authorization'] = 'Basic ' + btoa(':' + password);
  return fetch(path, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body.errors ? body.errors.join(', ') : (body.error || `HTTP ${res.status}`);
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return res.json();
  });
}
