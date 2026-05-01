'use client';

import { FormEvent, useEffect, useState, type ChangeEvent } from 'react';
import { AppShell } from '../components/shell';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerifiedAt?: string | null;
};

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type UsageSummary = {
  monthlyRequests: number;
  monthlyInputTokens: number;
  monthlyOutputTokens: number;
  requestsLast24h: number;
  recentLogs: {
    requestId: string;
    status: string;
    statusCode: number;
    modelAlias: string | null;
    createdAt: string;
  }[];
};

type Payment = {
  id: string;
  orderId: string;
  amountTotal: number;
  status: string;
  qrisContent: string | null;
  createdAt: string;
};

type Subscription = {
  status: string;
  currentEnd: string | null;
  plan: {
    name: string;
    slug: string;
    monthlyPriceIdr: number;
  };
};

type AdminOverview = {
  users: number;
  activeUsers: number;
  activeKeys: number;
  requests24h: number;
  pendingPayments: number;
};

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [keyName, setKeyName] = useState('Default coding key');
  const [planSlug, setPlanSlug] = useState('pro');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function authedFetch(path: string, init: RequestInit = {}) {
    const sessionToken = token ?? localStorage.getItem('9router_session_token');

    if (!sessionToken) {
      throw new Error('Missing login session');
    }

    return fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${sessionToken}`,
        'content-type': 'application/json',
        ...init.headers,
      },
    });
  }

  async function loadDashboard() {
    const [meResponse, keysResponse, usageResponse, subscriptionResponse, paymentsResponse] = await Promise.all([
      authedFetch('/auth/me'),
      authedFetch('/api-keys'),
      authedFetch('/usage/summary'),
      authedFetch('/payments/subscription/status'),
      authedFetch('/payments'),
    ]);

    if (!meResponse.ok) {
      localStorage.removeItem('9router_session_token');
      setToken(null);
      return;
    }

    const mePayload = (await meResponse.json()) as { user: User };
    const keysPayload = (await keysResponse.json()) as { apiKeys: ApiKey[] };
    const usagePayload = (await usageResponse.json()) as UsageSummary;
    const subscriptionPayload = (await subscriptionResponse.json()) as { subscription: Subscription | null };
    const paymentsPayload = (await paymentsResponse.json()) as { payments: Payment[] };

    setUser(mePayload.user);
    setApiKeys(keysResponse.ok ? keysPayload.apiKeys : []);
    setUsage(usagePayload);
    setSubscription(subscriptionPayload.subscription);
    setPayments(paymentsPayload.payments ?? []);

    if (mePayload.user.role === 'ADMIN') {
      const adminResponse = await authedFetch('/admin/overview');
      if (adminResponse.ok) {
        setAdminOverview((await adminResponse.json()) as AdminOverview);
      }
    }
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('9router_session_token');
    setToken(storedToken);

    if (storedToken) {
      void loadDashboard();
    }
  }, []);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setCreatedKey(null);

    const response = await authedFetch('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: keyName }),
    });
    const payload = (await response.json()) as { key?: string; message?: string };

    if (!response.ok || !payload.key) {
      setStatus(payload.message ?? 'Failed to create API key');
      return;
    }

    setCreatedKey(payload.key);
    setStatus('API key created. Copy it now, it will not be shown again.');
    await loadDashboard();
  }

  async function revokeKey(id: string) {
    await authedFetch(`/api-keys/${id}`, { method: 'DELETE' });
    await loadDashboard();
  }

  async function resendVerification() {
    const response = await authedFetch('/auth/resend-verification', { method: 'POST' });
    setStatus(response.ok ? 'Verification email sent.' : 'Could not send verification email.');
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await authedFetch('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ planSlug }),
    });
    setStatus(response.ok ? 'Checkout created. See billing history below.' : 'Checkout failed.');
    await loadDashboard();
  }

  async function cancelSubscription() {
    await authedFetch('/payments/subscription/cancel', { method: 'POST' });
    setStatus('Subscription canceled.');
    await loadDashboard();
  }

  function logout() {
    localStorage.removeItem('9router_session_token');
    window.location.href = '/login';
  }

  if (!token) {
    return (
      <main className="container center-page">
        <section className="card narrow">
          <span className="pill">Login required</span>
          <h1>Open your dashboard</h1>
          <p className="muted">Login or create an account first to manage API keys.</p>
          <a className="button" href="/login">
            Go to login
          </a>
        </section>
      </main>
    );
  }

  return (
    <AppShell active="Overview">
      <div className="dashboard-header">
        <div>
          <span className="pill">✦ Overview</span>
          <h1>Welcome back, Developer! 👋</h1>
          <p className="muted">
            {user ? `Logged in as ${user.email}` : 'Loading account...'}
          </p>
          {user && !user.emailVerifiedAt ? (
            <p className="auth-status">
              Email belum verified. Generate API key dan checkout akan dibatasi sampai email diverifikasi.
              <button className="link-button inline-link" onClick={() => void resendVerification()} type="button">
                Kirim ulang email
              </button>
            </p>
          ) : null}
        </div>
        <button className="secondary-button" onClick={logout} type="button">
          Logout
        </button>
      </div>

      <section className="grid metrics-grid">
        <div className="card metric-card">
          <span className="muted">Requests this month</span>
          <strong className="metric">{usage?.monthlyRequests ?? 0}</strong>
        </div>
        <div className="card metric-card">
          <span className="muted">Current plan</span>
          <strong className="metric">{subscription?.plan.name ?? 'None'}</strong>
          <p className="muted">{subscription?.status ?? 'No subscription'}</p>
        </div>
        <div className="card metric-card">
          <span className="muted">Tokens this month</span>
          <strong className="metric">
            {(usage?.monthlyInputTokens ?? 0) + (usage?.monthlyOutputTokens ?? 0)}
          </strong>
        </div>
        <div className="card metric-card">
          <span className="muted">Requests last 24h</span>
          <strong className="metric">{usage?.requestsLast24h ?? 0}</strong>
        </div>
      </section>

      <section className="dashboard-grid">
        <form className="card form-card" onSubmit={checkout}>
          <span className="pill">Billing</span>
          <h2>Upgrade plan</h2>
          <label>
            Plan slug
            <input
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPlanSlug(event.target.value)}
              required
              type="text"
              value={planSlug}
            />
          </label>
          <button className="button auth-button" type="submit">
            Create QRIS checkout
          </button>
          <button className="secondary-button" onClick={() => void cancelSubscription()} type="button">
            Cancel current subscription
          </button>
        </form>

        <section className="card">
          <span className="pill">Payment history</span>
          <div className="key-list">
            {payments.length === 0 ? <p className="muted">No payments yet.</p> : null}
            {payments.map((payment) => (
              <div className="key-row" key={payment.id}>
                <div>
                  <strong>{payment.orderId}</strong>
                  <p className="muted">Rp{payment.amountTotal.toLocaleString('id-ID')}</p>
                  {payment.qrisContent ? <small className="muted">QRIS content ready</small> : null}
                </div>
                <span className="pill">{payment.status}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      {user?.role === 'ADMIN' ? (
        <section className="card">
          <span className="pill">Admin overview</span>
          <div className="grid metrics-grid">
            <div>
              <span className="muted">Users</span>
              <strong className="metric">{adminOverview?.users ?? 0}</strong>
            </div>
            <div>
              <span className="muted">Active keys</span>
              <strong className="metric">{adminOverview?.activeKeys ?? 0}</strong>
            </div>
            <div>
              <span className="muted">Requests 24h</span>
              <strong className="metric">{adminOverview?.requests24h ?? 0}</strong>
            </div>
            <div>
              <span className="muted">Pending payments</span>
              <strong className="metric">{adminOverview?.pendingPayments ?? 0}</strong>
            </div>
          </div>
          <p className="muted">
            Full admin backend tersedia di `/admin/users`, `/admin/plans`, `/admin/model-aliases`,
            `/admin/providers`, dan `/admin/audit-logs`.
          </p>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <form className="card form-card" onSubmit={createKey}>
          <span className="pill">API keys</span>
          <h2>Create key</h2>
          <label>
            Key name
            <input
              onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyName(event.target.value)}
              required
              type="text"
              value={keyName}
            />
          </label>
          <button className="button auth-button" type="submit">
            Generate API key
          </button>
          {status ? <p className="auth-status">{status}</p> : null}
          {createdKey ? (
            <div className="secret-box">
              <strong>Copy this key now</strong>
              <code>{createdKey}</code>
            </div>
          ) : null}
        </form>

        <section className="card">
          <span className="pill">Active keys</span>
          <div className="key-list">
            {apiKeys.length === 0 ? <p className="muted">No API keys yet.</p> : null}
            {apiKeys.map((key) => (
              <div className="key-row" key={key.id}>
                <div>
                  <strong>{key.name}</strong>
                  <p className="muted">{key.prefix}••••••••</p>
                  <small className="muted">Created {new Date(key.createdAt).toLocaleString()}</small>
                </div>
                <div className="key-actions">
                  <span className="pill">{key.status}</span>
                  {key.status === 'ACTIVE' ? (
                    <button className="danger-button" onClick={() => void revokeKey(key.id)} type="button">
                      Revoke
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="card">
        <span className="pill">Recent request logs</span>
        <div className="log-list">
          {usage?.recentLogs.length ? null : <p className="muted">No requests logged yet.</p>}
          {usage?.recentLogs.map((log) => (
            <div className="log-row" key={log.requestId}>
              <code>{log.requestId}</code>
              <span>{log.modelAlias ?? '-'}</span>
              <span>{log.status}</span>
              <span>{log.statusCode}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
