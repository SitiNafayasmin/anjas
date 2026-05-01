import { MarketingNav } from '../components/shell';

export default function RefundPage() {
  return (
    <main>
      <MarketingNav />
      <section className="container legal-page">
        <span className="pill">✦ Refund Policy</span>
        <h1>Simple beta refund policy.</h1>
        <section className="card legal-card">
          <p>Paid plans can be refunded manually during beta if the service fails to provide access after payment and the issue cannot be resolved quickly.</p>
          <p>Refunds are reviewed against usage, provider incidents, duplicate payments, and abuse signals.</p>
          <p>QRIS/payment gateway reconciliation is recorded in payment history and admin audit logs.</p>
        </section>
      </section>
    </main>
  );
}
