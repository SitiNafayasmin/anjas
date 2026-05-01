export default function SlaPage() {
  return (
    <main className="container legal-page">
      <span className="pill">SLA</span>
      <h1>Beta availability targets.</h1>
      <section className="grid">
        <div className="card"><h2>API gateway</h2><p className="muted">Target 99% monthly uptime during beta after monitoring is enabled.</p></div>
        <div className="card"><h2>Provider fallback</h2><p className="muted">Fallback depends on upstream provider availability, quota, and credentials.</p></div>
        <div className="card"><h2>Support</h2><p className="muted">Manual response for payment/account incidents during early launch.</p></div>
      </section>
    </main>
  );
}
