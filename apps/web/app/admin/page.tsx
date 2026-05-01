'use client';

import { FormEvent, useEffect, useState, type ChangeEvent } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type AdminOverview = {
  users: number;
  activeUsers: number;
  activeKeys: number;
  requests24h: number;
  pendingPayments: number;
};

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  role: string;
  emailVerifiedAt: string | null;
  subscriptions: { status: string; plan: { slug: string; name: string } }[];
  _count: { apiKeys: number; requestLogs: number; payments: number };
};

type AdminPlan = {
  slug: string;
  name: string;
  monthlyPriceIdr: number;
  monthlyTokenQuota: string;
  dailyRequestLimit: number;
  requestsPerMinute: number;
  maxConcurrentStreams: number;
  allowedModelAliases: string[];
  isActive: boolean;
};

type ModelAlias = {
  alias: string;
  description: string;
  fallbackModels: string[];
  isPublic: boolean;
  isActive: boolean;
};

type ProviderAccount = {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  baseUrl: string | null;
  notes: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { email: string } | null;
};

type AdminAnalytics = {
  totals: {
    requests: number;
    tokens: number;
    estimatedCost: string;
    averageLatencyMs: number;
  };
  byStatus: { status: string; count: number }[];
  byProvider: { provider: string; count: number; averageLatencyMs: number }[];
  topUsers: { userId: string; requests: number; tokens: number }[];
  payments: { status: string; count: number; amountTotal: number }[];
};

function getSessionToken() {
  return localStorage.getItem('9router_session_token');
}

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [aliases, setAliases] = useState<ModelAlias[]>([]);
  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [provider, setProvider] = useState('openrouter');
  const [displayName, setDisplayName] = useState('OpenRouter');
  const [status, setStatus] = useState<string | null>(null);

  async function authedFetch(path: string, init: RequestInit = {}) {
    const token = getSessionToken();
    if (!token) throw new Error('Missing login session');

    return fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...init.headers,
      },
    });
  }

  async function loadAdmin() {
    const [overviewResponse, usersResponse, plansResponse, aliasesResponse, providersResponse, auditResponse, analyticsResponse] =
      await Promise.all([
        authedFetch('/admin/overview'),
        authedFetch('/admin/users'),
        authedFetch('/admin/plans'),
        authedFetch('/admin/model-aliases'),
        authedFetch('/admin/providers'),
        authedFetch('/admin/audit-logs'),
        authedFetch('/admin/analytics'),
      ]);

    if (!overviewResponse.ok) {
      setStatus('Admin access required. Login as ADMIN first.');
      return;
    }

    setOverview((await overviewResponse.json()) as AdminOverview);
    setUsers(((await usersResponse.json()) as { users: AdminUser[] }).users);
    setPlans(((await plansResponse.json()) as { plans: AdminPlan[] }).plans);
    setAliases(((await aliasesResponse.json()) as { modelAliases: ModelAlias[] }).modelAliases);
    setProviders(((await providersResponse.json()) as { providers: ProviderAccount[] }).providers);
    setAuditLogs(((await auditResponse.json()) as { auditLogs: AuditLog[] }).auditLogs);
    setAnalytics((await analyticsResponse.json()) as AdminAnalytics);
  }

  useEffect(() => {
    void loadAdmin();
  }, []);

  async function updateUser(id: string, payload: Record<string, string>) {
    await authedFetch(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await loadAdmin();
  }

  async function upsertProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await authedFetch('/admin/providers', {
      method: 'POST',
      body: JSON.stringify({ provider, displayName, status: 'ACTIVE' }),
    });
    setStatus('Provider saved.');
    await loadAdmin();
  }

  async function runCleanup() {
    const response = await authedFetch('/workers/cleanup', {
      method: 'POST',
      body: JSON.stringify({ requestLogRetentionDays: 90 }),
    });
    const payload = (await response.json()) as Record<string, number>;
    setStatus(`Cleanup done: ${Object.entries(payload).map(([key, value]) => `${key}=${value}`).join(', ')}`);
  }

  return (
    <main className="app-shell">
      <aside className="side-nav">
        <a className="brand-mark" href="/">
          9R
        </a>
        <a href="/dashboard">Dashboard</a>
        <a href="/analytics">Analytics</a>
        <a className="active" href="/admin">Admin</a>
        <a href="/docs">Docs</a>
      </aside>

      <section className="content-shell">
        <div className="dashboard-header">
          <div>
            <span className="pill">Admin command center</span>
            <h1>User, plan, routing, and ops control.</h1>
            <p className="muted">Kelola user, plan, provider, model alias, audit log, dan cleanup worker.</p>
          </div>
          <button className="secondary-button" onClick={() => void runCleanup()} type="button">
            Run cleanup
          </button>
        </div>

        {status ? <p className="auth-status">{status}</p> : null}

        <section className="grid metrics-grid">
          <Metric label="Users" value={overview?.users ?? 0} />
          <Metric label="Active users" value={overview?.activeUsers ?? 0} />
          <Metric label="Active keys" value={overview?.activeKeys ?? 0} />
          <Metric label="Requests 24h" value={overview?.requests24h ?? 0} />
          <Metric label="Pending payments" value={overview?.pendingPayments ?? 0} />
          <Metric label="Avg latency" value={`${analytics?.totals.averageLatencyMs ?? 0}ms`} />
        </section>

        <section className="card data-card">
          <div className="section-heading">
            <div>
              <span className="pill">Users</span>
              <h2>Account operations</h2>
            </div>
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.email}</strong>
                      <small>{user.emailVerifiedAt ? 'Verified' : 'Unverified'}</small>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.status}</td>
                    <td>{user.subscriptions[0]?.plan.name ?? 'None'}</td>
                    <td>{user._count.requestLogs} logs · {user._count.apiKeys} keys</td>
                    <td className="table-actions">
                      <button onClick={() => void updateUser(user.id, { status: 'SUSPENDED' })} type="button">
                        Suspend
                      </button>
                      <button onClick={() => void updateUser(user.id, { status: 'ACTIVE' })} type="button">
                        Activate
                      </button>
                      <button onClick={() => void updateUser(user.id, { role: 'ADMIN' })} type="button">
                        Make admin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-grid wide-left">
          <div className="card">
            <span className="pill">Plans</span>
            <div className="key-list">
              {plans.map((plan) => (
                <div className="feature-card" key={plan.slug}>
                  <div className="icon-box">₨</div>
                  <div>
                    <strong>{plan.name}</strong>
                    <p className="muted">Rp{plan.monthlyPriceIdr.toLocaleString('id-ID')} · {plan.dailyRequestLimit}/day · {plan.requestsPerMinute}/min</p>
                    <small>{plan.allowedModelAliases.join(', ')}</small>
                  </div>
                  <span className="pill">{plan.isActive ? 'ACTIVE' : 'OFF'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <span className="pill">Provider ops</span>
            <form className="form-card compact-form" onSubmit={upsertProvider}>
              <label>
                Provider
                <input onChange={(event: ChangeEvent<HTMLInputElement>) => setProvider(event.target.value)} value={provider} />
              </label>
              <label>
                Display name
                <input onChange={(event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)} value={displayName} />
              </label>
              <button className="button auth-button" type="submit">Save provider</button>
            </form>
            <div className="key-list">
              {providers.map((item) => (
                <div className="key-row" key={item.id}>
                  <div>
                    <strong>{item.displayName}</strong>
                    <p className="muted">{item.provider}</p>
                  </div>
                  <span className="pill">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="card">
            <span className="pill">Model routing</span>
            <div className="key-list">
              {aliases.map((alias) => (
                <div className="feature-card" key={alias.alias}>
                  <div className="icon-box">✦</div>
                  <div>
                    <strong>{alias.alias}</strong>
                    <p className="muted">{alias.description}</p>
                    <small>{alias.fallbackModels.join(' → ')}</small>
                  </div>
                  <span className="pill">{alias.isActive ? 'ON' : 'OFF'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <span className="pill">Audit log</span>
            <div className="log-list">
              {auditLogs.map((log) => (
                <div className="log-row" key={log.id}>
                  <strong>{log.action}</strong>
                  <span>{log.actor?.email ?? 'system'}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card metric-card">
      <span className="muted">{label}</span>
      <strong className="metric">{value}</strong>
    </div>
  );
}
