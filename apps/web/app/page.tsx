const cards = [
  {
    badge: 'FREE',
    title: 'FREE Emergency Fallback',
    body: 'OpenRouter free models, Gemini, Groq, and other official free-tier providers as a safety net.',
  },
  {
    badge: 'FAST',
    title: 'Coding Fast Lane',
    body: 'Alias `coding-fast` routes requests to low-latency providers with quota and fallback control.',
  },
  {
    badge: 'SMART',
    title: 'Smart Coding Router',
    body: 'One OpenAI-compatible endpoint for Cursor, Cline, Continue, Codex CLI, and custom tools.',
  },
];

const launchLinks = [
  ['Docs', '/docs'],
  ['Status', '/status'],
  ['Terms', '/terms'],
  ['Privacy', '/privacy'],
  ['Refund', '/refund'],
  ['SLA', '/sla'],
];

export default function HomePage() {
  return (
    <main>
      <nav className="marketing-nav">
        <a className="brand-mark" href="/">9R</a>
        <div>
          {launchLinks.map(([label, href]) => (
            <a href={href} key={href}>{label}</a>
          ))}
        </div>
        <a className="button" href="/login">Get API key</a>
      </nav>

      <section className="hero-shell">
        <div>
          <span className="pill">Managed router + quota + fallback + dashboard</span>
          <h1>One coding API key. Multiple AI providers. Emergency fallback.</h1>
          <p className="muted hero-copy">
            9router SaaS helps developers connect coding tools to a secure OpenAI-compatible gateway
            with database-backed keys, Redis quota, smart model aliases, and usage analytics.
          </p>
          <div className="hero-actions">
            <a className="button" href="/login">Start beta</a>
            <a className="secondary-button" href="/docs">Read setup guide</a>
          </div>
        </div>

        <div className="reference-card">
          <div className="icon-box">✪</div>
          <span className="pill">FREE</span>
          <h2>FREE Emergency Fallback</h2>
          <p>iFlow, Qwen, Kiro unlimited. Final safety net ensures you never stop coding.</p>
        </div>
      </section>

      <section className="container">
        <div className="grid">
          {cards.map((card) => (
            <article className="feature-card tall" key={card.title}>
              <div className="icon-box">✦</div>
              <span className="pill">{card.badge}</span>
              <h2>{card.title}</h2>
              <p className="muted">{card.body}</p>
            </article>
          ))}
        </div>

        <section className="card launch-card">
          <span className="pill">Public launch checklist</span>
          <h2>Built for beta launch, with ops controls included.</h2>
          <div className="grid">
            <p>Auth, email verification, password reset, API key hashing, Redis quota, billing lifecycle.</p>
            <p>Admin UI, analytics cockpit, monitoring docs, backup script, legal pages, and status page.</p>
            <p>Provider credentials, Brevo key, payment key, and VPS monitoring must be configured before real public traffic.</p>
          </div>
        </section>
      </section>
    </main>
  );
}
