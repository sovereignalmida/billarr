import React, { useState } from 'react';
import { setAuthToken } from '../utils/apiFetch';
import './Login.css';

/**
 * Login handles three modes passed in via the `mode` prop:
 *   'jwt'    — email + password login against /api/auth/login
 *   'setup'  — first-run: create the initial admin account
 *   'legacy' — single password field (old BILLARR_PASSWORD Basic Auth)
 */
const Login = ({ mode = 'legacy', onLogin }) => {
  const isSetup  = mode === 'setup';
  const isJwt    = mode === 'jwt' || isSetup;

  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSetup && password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (isSetup && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      if (isSetup) {
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Setup failed');
        setAuthToken(data.token);
        onLogin(data.user);
      } else if (isJwt) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        setAuthToken(data.token);
        onLogin(data.user);
      } else {
        // Legacy: test password via Basic Auth
        const authHeader = 'Basic ' + btoa(':' + password);
        const res = await fetch('/api/bills', { headers: { Authorization: authHeader } });
        if (res.ok) {
          sessionStorage.setItem('billarr-auth', password);
          onLogin(null);
        } else {
          throw new Error('Incorrect password');
        }
      }
    } catch (err) {
      setError(err.message || 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="/logolong.png" alt="Billarr" className="login-logo-img" />
        {isSetup ? (
          <p className="login-subtitle">Create your admin account to get started</p>
        ) : isJwt ? (
          <p className="login-subtitle">Sign in to your account</p>
        ) : (
          <p className="login-subtitle">Enter your password to continue</p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isSetup && (
            <input
              type="text"
              className="login-input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          )}

          {isJwt && (
            <input
              type="email"
              className="login-input"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus={!isSetup}
              required
            />
          )}

          <input
            type="password"
            className="login-input"
            placeholder={isSetup ? 'Choose a password (8+ chars)' : 'Password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus={!isJwt}
            required
          />

          {isSetup && (
            <input
              type="password"
              className="login-input"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? (isSetup ? 'Creating account...' : 'Signing in...')
              : (isSetup ? 'Create Admin Account' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
