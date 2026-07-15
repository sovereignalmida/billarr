/**
 * Auth middleware factory.
 * Returns requireAuth and requireAdmin bound to the given authService.
 *
 * When authService.isEnabled() is false (no JWT_SECRET), both functions
 * call next() immediately — the app runs open or with legacy Basic Auth.
 */

const ROLE_CHECK_TIMEOUT_MS = 5000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Role lookup timed out')), ms)),
  ]);
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

    try {
      // Re-check the user's current role in the DB rather than trusting the
      // JWT's role claim — a token signed before a demotion or deletion (or
      // one forged with a leaked secret) must not keep granting access
      // forever. A null role means the user row is gone.
      const currentRole = await withTimeout(authService.getUserRole(payload.id), ROLE_CHECK_TIMEOUT_MS);
      if (currentRole === null) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.user = { ...payload, role: currentRole };
      next();
    } catch (err) {
      console.error('❌ requireAuth role lookup failed:', err.message);
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  function requireAdmin(req, res, next) {
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
