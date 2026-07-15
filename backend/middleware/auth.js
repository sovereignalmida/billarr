/**
 * Auth middleware factory.
 * Returns requireAuth and requireAdmin bound to the given authService.
 *
 * When authService.isEnabled() is false (no JWT_SECRET), both functions
 * call next() immediately — the app runs open or with legacy Basic Auth.
 */

const ROLE_CHECK_TIMEOUT_MS = 5000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Role lookup timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function createAuthMiddleware(authService) {
  async function requireAuth(req, res, next) {
    if (!authService.isEnabled()) return next();

    const auth = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer /, '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let payload;
    try {
      payload = authService.verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Re-check the user's current role in the DB rather than trusting the
    // JWT's role claim — a token signed before a demotion or deletion (or
    // one forged with a leaked secret) must not keep granting access
    // forever. A null role means the user row is gone.
    let currentRole;
    try {
      currentRole = await withTimeout(authService.getUserRole(payload.id), ROLE_CHECK_TIMEOUT_MS);
    } catch (err) {
      // A transient failure (DB busy, wedged callback) is not proof the
      // token/user is invalid — treat it as a service error, not a logout,
      // so the frontend doesn't clear a perfectly good session over a blip.
      console.error('❌ requireAuth role lookup failed:', err.message);
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    if (currentRole === null) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { ...payload, role: currentRole };
    next();
  }

  function requireAdmin(req, res, next) {
    // The global /api middleware already runs requireAuth for every route
    // (see server.js), so req.user is normally already populated with a
    // freshly-checked role by the time we get here — don't pay for a second
    // DB round trip. Fall back to running it if that's ever not true.
    if (req.user) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      return next();
    }
    requireAuth(req, res, () => {
      if (!authService.isEnabled()) return next();
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });
  }

  return { requireAuth, requireAdmin };
}

module.exports = createAuthMiddleware;
