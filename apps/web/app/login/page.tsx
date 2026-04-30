export default function LoginPage() {
  return (
    <main className="container">
      <section className="card narrow">
        <span className="pill">Account access</span>
        <h1>Login dashboard</h1>
        <p className="muted">
          Authentication endpoints are available at <code>/auth/register</code>,{' '}
          <code>/auth/login</code>, and <code>/auth/me</code>. The visual form can
          be wired to these endpoints after the product UI is finalized.
        </p>
        <pre>{`POST /auth/login
{
  "email": "you@example.com",
  "password": "minimum-8-chars"
}`}</pre>
      </section>
    </main>
  );
}
