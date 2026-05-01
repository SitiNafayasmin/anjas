const tools = [
  ['Base URL', 'https://api.yourdomain.com/v1'],
  ['Model alias', 'coding-fast'],
  ['API key', 'ak_live_...'],
];

const integrations = [
  'Cursor: Settings → Models → OpenAI-compatible → paste base URL and key.',
  'Cline/Roo: Provider OpenAI Compatible → base URL → model alias.',
  'Continue: Add OpenAI-compatible provider in config.json.',
  'Codex CLI/custom tools: set OPENAI_BASE_URL and OPENAI_API_KEY.',
];

export default function DocsPage() {
  return (
    <main className="container docs-layout">
      <aside className="doc-sidebar">
        <a className="brand-mark" href="/">9R</a>
        <a href="#quickstart">Quickstart</a>
        <a href="#tools">Tools</a>
        <a href="#errors">Errors</a>
        <a href="/dashboard">Dashboard</a>
      </aside>

      <section>
        <span className="pill">Setup docs</span>
        <h1>Connect your coding tool in 3 steps.</h1>
        <p className="muted hero-copy">Generate API key, copy base URL, pick a model alias.</p>

        <section className="card" id="quickstart">
          <h2>Quickstart</h2>
          {tools.map(([label, value]) => (
            <div className="doc-row" key={label}>
              <span>{label}</span>
              <code>{value}</code>
            </div>
          ))}
          <pre>{`curl https://api.yourdomain.com/v1/chat/completions \\
  -H "Authorization: Bearer ak_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"coding-fast","messages":[{"role":"user","content":"Hello"}]}'`}</pre>
        </section>

        <section className="card" id="tools">
          <h2>Tool setup</h2>
          <div className="key-list">
            {integrations.map((item) => (
              <div className="key-row" key={item}>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" id="errors">
          <h2>Troubleshooting</h2>
          <div className="grid">
            <p><strong>401</strong><br />API key invalid, revoked, or missing.</p>
            <p><strong>403</strong><br />Email not verified, quota exceeded, or alias not included in plan.</p>
            <p><strong>429</strong><br />Rate limit or concurrent stream limit reached.</p>
          </div>
        </section>
      </section>
    </main>
  );
}
