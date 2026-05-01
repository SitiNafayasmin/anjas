const featureCards = [
  {
    icon: '</>',
    title: 'OpenAI-compatible',
    body: 'Satu base URL, format request yang sudah kamu kenal.',
  },
  {
    icon: '♢',
    title: 'Smart fallback',
    body: 'Otomatis pindah ke provider terbaik saat utama bermasalah.',
  },
  {
    icon: '▥',
    title: 'Usage control',
    body: 'Pantau pemakaian, quota, dan limit dalam satu dashboard.',
  },
  {
    icon: '▱',
    title: 'Multiple models',
    body: 'Akses banyak model AI terbaik lewat alias sederhana.',
  },
  {
    icon: '♡',
    title: 'Developer first',
    body: 'Dibangun oleh developer untuk developer.',
  },
];

const modelCards = [
  ['coding-free', 'Untuk testing & trial', 'Free', '⚡'],
  ['coding-fast', 'Untuk response cepat', 'Low', '↯'],
  ['coding-cheap', 'Untuk hemat biaya', 'Very Low', '♨'],
  ['coding-smart', 'Untuk coding kompleks', 'Medium', '✧'],
];

const toolLogos = ['Codex CLI', 'Cursor', 'Cline', 'Continue', 'Roo Code', 'OpenCode'];

const launchLinks = [
  ['Features', '#features'],
  ['Models', '#models'],
  ['Pricing', '#pricing'],
  ['Docs', '/docs'],
  ['Status', '/status'],
  ['Blog', '/docs'],
];

export default function HomePage() {
  return (
    <main>
      <nav className="marketing-nav">
        <a className="logo-lockup" href="/">
          <span className="logo-cube">◆</span>
          <strong>CodeLink</strong>
        </a>
        <div>
          {launchLinks.map(([label, href]) => (
            <a href={href} key={`${label}-${href}`}>{label}</a>
          ))}
        </div>
        <span className="nav-actions">
          <a className="secondary-button" href="/login">Log in</a>
          <a className="button" href="/login">Get API Key</a>
        </span>
      </nav>

      <section className="hero-shell hero-light">
        <div>
          <span className="pill">✦ OpenAI-compatible AI API Gateway</span>
          <h1>One API key. Every AI model. <span>Zero friction.</span></h1>
          <p className="muted hero-copy">
            CodeLink adalah gateway API coding yang menghubungkan kamu ke banyak model AI terbaik
            dengan routing pintar, fallback otomatis, dan dashboard transparan.
          </p>
          <div className="hero-actions">
            <a className="button big-button" href="/login">Get Your API Key →</a>
            <a className="secondary-button big-button" href="/docs">⌘ View Docs</a>
          </div>
          <div className="tool-strip">
            <p>Works with your favorite tools</p>
            <div>
              {toolLogos.map((tool) => <span key={tool}>⬡<small>{tool}</small></span>)}
              <span className="more-chip">and more...</span>
            </div>
          </div>
        </div>

        <div className="dashboard-preview">
          <aside>
            <span className="logo-cube">◆</span>
            <strong>CodeLink</strong>
            {['Overview', 'API Keys', 'Usage', 'Request Logs', 'Models', 'Docs', 'Billing'].map((item) => (
              <small className={item === 'Overview' ? 'active' : ''} key={item}>⊹ {item}</small>
            ))}
          </aside>
          <section>
            <div className="preview-top">
              <div>
                <h3>Welcome back, Developer! 👋</h3>
                <p>Here&apos;s what&apos;s happening with your API.</p>
              </div>
              <button>Copy Base URL</button>
            </div>
            <div className="preview-metrics">
              <div><span>Requests Today</span><strong>12,847</strong><small>↑ 12.5%</small></div>
              <div><span>Tokens Today</span><strong>25.6M</strong><small>↑ 8.3%</small></div>
              <div><span>Quota Usage</span><strong>68%</strong><i /></div>
              <div><span>Active Keys</span><strong>3</strong><small>View all</small></div>
            </div>
            <div className="preview-chart">
              <span>Requests (Last 7 days)</span>
              <svg viewBox="0 0 420 150" role="img" aria-label="Requests chart">
                <path d="M0 110 C35 70 65 95 95 80 C130 55 165 50 200 70 C235 92 270 25 315 62 C350 92 380 45 420 20" />
              </svg>
            </div>
            <pre>{`curl https://api.codelink.dev/v1/chat/completions \\
  -H "Authorization: Bearer cl_live_xxxxxx" \\
  -d '{"model":"coding-fast","messages":[...]}'`}</pre>
          </section>
        </div>
      </section>

      <section className="container section-stack" id="features">
        <div className="section-title">
          <span className="pill">✦ Kenapa CodeLink?</span>
          <h2>Built for developers. Designed for <span>performance.</span></h2>
        </div>
        <div className="grid feature-grid">
          {featureCards.map((card) => (
            <article className="feature-card light-card" key={card.title}>
              <div className="icon-box">{card.icon}</div>
              <h2>{card.title}</h2>
              <p className="muted">{card.body}</p>
            </article>
          ))}
        </div>

        <section className="model-section" id="models">
          <div>
            <span className="pill">✦ Model Aliases</span>
            <h2>Pilih alias yang sesuai kebutuhanmu</h2>
          </div>
          <div className="model-grid">
            {modelCards.map(([alias, subtitle, cost, icon]) => (
              <article className="model-card" key={alias}>
                <div className="icon-box">{icon}</div>
                <h3>{alias}</h3>
                <p>{subtitle}</p>
                <dl>
                  <div><dt>Speed</dt><dd>✦ ✦ ✦ ✦</dd></div>
                  <div><dt>Quality</dt><dd>✦ ✦ ✦ ✧</dd></div>
                  <div><dt>Cost</dt><dd>{cost}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="steps-section">
          <span className="pill">3 Langkah Mudah</span>
          <h2>Start coding in less than <span>2 minutes.</span></h2>
          <div className="steps-grid">
            {['Buat akun', 'Dapatkan API key', 'Hubungkan tool kamu'].map((step, index) => (
              <article key={step}>
                <b>{index + 1}</b>
                <div className="icon-box">{index === 0 ? '♙' : index === 1 ? '🔑' : '⌁'}</div>
                <h3>{step}</h3>
                <p>{index === 0 ? 'Daftar gratis dan pilih plan.' : index === 1 ? 'Generate key dan copy base URL.' : 'Paste ke Codex, Cursor, Cline, atau tool lainnya.'}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-band" id="pricing">
          <div>
            <h2>Ready to level up your coding experience?</h2>
            <p>Gabung developer lainnya yang membangun lebih cepat dengan AI.</p>
          </div>
          <a className="button big-button" href="/login">Get Your API Key Now →</a>
          <a className="secondary-button big-button" href="/docs">View Setup Guide</a>
        </section>
      </section>
    </main>
  );
}
