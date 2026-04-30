'use client';

import { FormEvent, useMemo, useState, type ChangeEvent } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const title = useMemo(() => (mode === 'login' ? 'Welcome back' : 'Create account'), [mode]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    const response = await fetch(`${apiBaseUrl}/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        ...(mode === 'register' ? { name } : {}),
      }),
    });
    const payload = (await response.json()) as {
      token?: string;
      user?: { email: string };
      message?: string;
      error?: string;
    };

    setIsLoading(false);

    if (!response.ok || !payload.token) {
      setStatus(payload.message ?? payload.error ?? 'Authentication failed');
      return;
    }

    localStorage.setItem('9router_session_token', payload.token);
    setStatus(`Logged in as ${payload.user?.email ?? email}. Redirecting...`);
    window.location.href = '/dashboard';
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <a className="muted" href="/">
            ← Back to home
          </a>
          <span className="pill auth-pill">Developer dashboard</span>
          <h1>Login to 9router SaaS</h1>
          <p className="muted">
            Manage API keys, monitor usage, and connect your coding tools through
            one OpenAI-compatible gateway.
          </p>
          <div className="auth-benefits">
            <div>
              <strong>Secure API keys</strong>
              <span>Generate, copy once, and revoke any key.</span>
            </div>
            <div>
              <strong>Usage control</strong>
              <span>Quota, rate limits, and request logs per account.</span>
            </div>
            <div>
              <strong>Smart fallback</strong>
              <span>Route coding requests through internal 9router.</span>
            </div>
          </div>
        </div>

        <form className="auth-card" onSubmit={submitAuth}>
          <div>
            <span className="pill">{mode === 'login' ? 'Sign in' : 'Register'}</span>
            <h2>{title}</h2>
            <p className="muted">
              {mode === 'login'
                ? 'Use your account to enter the dashboard.'
                : 'Create your developer account and start with the trial plan.'}
            </p>
          </div>

          {mode === 'register' ? (
            <label>
              Name
              <input
                onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                placeholder="Your name"
                type="text"
                value={name}
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              minLength={8}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              required
              type="password"
              value={password}
            />
          </label>

          {status ? <p className="auth-status">{status}</p> : null}

          <button className="button auth-button" disabled={isLoading} type="submit">
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Login dashboard' : 'Create account'}
          </button>

          <div className="auth-divider">
            <span />
            <small>New user?</small>
            <span />
          </div>

          <button
            className="secondary-button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setStatus(null);
            }}
            type="button"
          >
            {mode === 'login' ? 'Create account' : 'Back to login'}
          </button>

          <p className="muted small">
            This form connects to <code>{apiBaseUrl}</code> and stores the session
            token locally for the dashboard.
          </p>
        </form>
      </section>
    </main>
  );
}
