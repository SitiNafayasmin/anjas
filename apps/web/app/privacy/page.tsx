const items = [
  'We store account email, hashed password, session metadata, API key hashes, usage metadata, payment metadata, and audit logs.',
  'We do not store prompt/code request bodies by default. Request logs are metadata-only for security and debugging.',
  'API keys are shown once during creation and stored as irreversible hashes.',
  'Operational logs may be retained for 30-90 days depending on configured policy.',
  'Users can request account deletion or export through support while the beta dashboard is being improved.',
];

export default function PrivacyPage() {
  return (
    <main className="container legal-page">
      <span className="pill">Privacy Policy</span>
      <h1>Privacy-first metadata logging for coding API access.</h1>
      <section className="card">
        {items.map((item) => <p key={item}>{item}</p>)}
      </section>
    </main>
  );
}
