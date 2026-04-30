const apiKeys = [
  {
    name: 'Local development key',
    prefix: 'ak_live_demo',
    status: 'Active',
    lastUsed: 'Not used yet',
  },
];

export default function DashboardPage() {
  return (
    <main className="container">
      <span className="pill">Dashboard shell</span>
      <h1>Secure API key dashboard</h1>
      <p className="muted">
        Backend endpoints now support session auth, database-backed API key
        generation, revocation, quota, usage logs, and QRIS checkout records.
      </p>
      <section className="grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <strong>Generate key</strong>
          <pre>{`POST /api-keys
Authorization: Bearer sess_...`}</pre>
        </div>
        <div className="card">
          <strong>Usage summary</strong>
          <pre>{`GET /usage/summary
Authorization: Bearer sess_...`}</pre>
        </div>
        <div className="card">
          <strong>QRIS checkout</strong>
          <pre>{`POST /payments/checkout
Authorization: Bearer sess_...`}</pre>
        </div>
      </section>
      <section className="card">
        {apiKeys.map((key) => (
          <div
            key={key.prefix}
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <strong>{key.name}</strong>
              <p className="muted">{key.prefix}••••••••</p>
            </div>
            <span className="pill">{key.status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
