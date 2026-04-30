const modelAliases = ['coding-free', 'coding-fast', 'coding-smart'];

const features = [
  'OpenAI-compatible endpoint for Codex, Cursor, Cline, and other coding tools',
  'User API key management with quota and rate-limit foundation',
  'Internal 9router service for model fallback across free and cheap providers',
  'Usage tracking designed for future billing integration',
];

export default function HomePage() {
  return (
    <main className="container">
      <section style={{ padding: '72px 0' }}>
        <span className="pill">Payment module coming later</span>
        <h1 style={{ fontSize: 64, lineHeight: 1, marginBottom: 20 }}>
          Coding API keys backed by smart 9router fallback.
        </h1>
        <p className="muted" style={{ fontSize: 20, maxWidth: 720 }}>
          Sell one API key that works with AI coding tools while your gateway
          handles user quotas, model aliases, provider fallback, and usage logs.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <a className="button" href="/login">
            Login
          </a>
          <a className="button" href="/dashboard">
            Open dashboard shell
          </a>
          <a className="button" href="/docs" style={{ background: '#e2e8f0' }}>
            View setup docs
          </a>
        </div>
      </section>

      <section className="grid">
        {features.map((feature) => (
          <div className="card" key={feature}>
            <p>{feature}</p>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Public model aliases</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {modelAliases.map((alias) => (
            <span className="pill" key={alias}>
              {alias}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
