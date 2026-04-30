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
      <h1>API Keys</h1>
      <p className="muted">
        This page will connect to the API service for key generation, revocation,
        quota, and usage.
      </p>
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
