const terms = [
  'Use the service only with provider accounts, API keys, and usage rights that you are allowed to use.',
  'Do not resell prohibited personal subscriptions or violate upstream provider terms.',
  'Do not use the API for malware, credential theft, abuse, spam, or illegal activity.',
  'The beta service may enforce quota, rate limit, provider fallback, suspension, and manual review.',
  'Public production access requires configured payment, provider, monitoring, backup, and abuse-response operations.',
];

export default function TermsPage() {
  return (
    <main className="container legal-page">
      <span className="pill">Terms of Service</span>
      <h1>Developer API terms for safe public launch.</h1>
      <section className="card">
        {terms.map((term) => <p key={term}>{term}</p>)}
      </section>
    </main>
  );
}
