import type { ReactNode } from 'react';

const navItems = [
  ['Overview', '/dashboard'],
  ['Analytics', '/analytics'],
  ['Admin', '/admin'],
  ['Docs', '/docs'],
  ['Status', '/status'],
];

export function AppShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <main className="app-shell">
      <aside className="side-nav">
        <a className="logo-lockup compact-logo" href="/">
          <span className="logo-cube">◆</span>
          <strong>CodeLink</strong>
        </a>
        <nav>
          {navItems.map(([label, href]) => (
            <a className={active === label ? 'active' : ''} href={href} key={href}>
              <span>⊹</span>
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <section className="content-shell">{children}</section>
    </main>
  );
}

export function MarketingNav() {
  return (
    <nav className="marketing-nav">
      <a className="logo-lockup" href="/">
        <span className="logo-cube">◆</span>
        <strong>CodeLink</strong>
      </a>
      <div>
        <a href="/#features">Features</a>
        <a href="/#models">Models</a>
        <a href="/#pricing">Pricing</a>
        <a href="/docs">Docs</a>
        <a href="/status">Status</a>
      </div>
      <span className="nav-actions">
        <a className="secondary-button" href="/login">Log in</a>
        <a className="button" href="/login">Get API Key</a>
      </span>
    </nav>
  );
}
