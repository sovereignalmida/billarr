/**
 * Auth middleware factory.
 * Returns requireAuth and requireAdmin bound to the given authService.
 *
 * When authService.isEnabled() is false (no JWT_SECRET), both functions
 * call next() immediately — the app runs open or with legacy Basic Auth.
 */

function createAuthMiddleware(authService) {
  function requireAuth(req, res, next) {
    if (!authService.isEnabled()) return next();

    const auth = req.headers['authorization'] || '';
    const token = auth.replace(/^Bearer /, '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      req.user = authService.verifyToken(token);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
      if (authService.isEnabled() && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });
  }

  return { requireAuth, requireAdmin };
}

module.exports = createAuthMiddleware;
