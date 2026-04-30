export default function LoginPage() {
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

        <form className="auth-card">
          <div>
            <span className="pill">Sign in</span>
            <h2>Welcome back</h2>
            <p className="muted">Use your account to enter the dashboard.</p>
          </div>

          <label>
            Email
            <input placeholder="you@example.com" type="email" />
          </label>

          <label>
            Password
            <input placeholder="Minimum 8 characters" type="password" />
          </label>

          <button className="button auth-button" type="button">
            Login dashboard
          </button>

          <div className="auth-divider">
            <span />
            <small>New user?</small>
            <span />
          </div>

          <button className="secondary-button" type="button">
            Create account
          </button>

          <p className="muted small">
            Backend auth endpoints are ready. This visual form will be wired to
            `/auth/login` and `/auth/register` in the next UI implementation pass.
          </p>
        </form>
      </section>
    </main>
  );
}
