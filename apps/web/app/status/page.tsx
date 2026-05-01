import { MarketingNav } from '../components/shell';

const services = [
  ['Web dashboard', 'Operational'],
  ['Business API', 'Operational'],
  ['OpenAI-compatible proxy', 'Operational'],
  ['Internal 9router', 'Requires provider configuration'],
  ['Brevo email', 'Requires BREVO_API_KEY'],
  ['QRIS payment', 'Requires PAYMENT_GATEWAY_API_KEY'],
];

export default function StatusPage() {
  return (
    <main>
      <MarketingNav />
      <section className="container legal-page">
        <span className="pill">✦ Status</span>
        <h1>Service health and launch dependencies.</h1>
        <section className="card">
          <div className="key-list">
            {services.map(([name, status]) => (
              <div className="key-row" key={name}>
                <strong>{name}</strong>
                <span className="pill">{status}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
