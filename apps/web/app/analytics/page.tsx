'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../components/shell';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type Analytics = {
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: string;
    averageLatencyMs: number;
  };
  byStatus: { status: string; count: number }[];
  byModel: { modelAlias: string; count: number; tokens: number }[];
  byProvider: { provider: string; count: number; averageLatencyMs: number }[];
  byApiKey: { apiKeyId: string | null; count: number; averageLatencyMs: number }[];
  logs: {
    requestId: string;
    status: string;
    statusCode: number;
    errorCode: string | null;
    latencyMs: number | null;
    modelAlias: string | null;
    provider: string | null;
    createdAt: string;
  }[];
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('9router_session_token');
    if (!token) {
      setStatus('Login required.');
      return;
    }

    void fetch(`${apiBaseUrl}/usage/analytics`, {
      headers: { authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok) {
        setStatus('Could not load analytics.');
        return;
      }
      setAnalytics((await response.json()) as Analytics);
    });
  }, []);

  const totalTokens = (analytics?.totals.inputTokens ?? 0) + (analytics?.totals.outputTokens ?? 0);

  return (
    <AppShell active="Analytics">
        <div className="dashboard-header">
          <div>
            <span className="pill">✦ Analytics cockpit</span>
            <h1>Usage, reliability, latency, and cost insight.</h1>
            <p className="muted">Metadata-only analytics. Prompt/code body tidak disimpan default.</p>
          </div>
        </div>

        {status ? <p className="auth-status">{status}</p> : null}

        <section className="grid metrics-grid">
          <Metric label="30d requests" value={analytics?.totals.requests ?? 0} />
          <Metric label="30d tokens" value={totalTokens} />
          <Metric label="Avg latency" value={`${analytics?.totals.averageLatencyMs ?? 0}ms`} />
          <Metric label="Estimated cost" value={`$${analytics?.totals.estimatedCost ?? '0'}`} />
        </section>

        <section className="dashboard-grid">
          <Breakdown title="Status breakdown" rows={analytics?.byStatus.map((item) => [item.status, item.count]) ?? []} />
          <Breakdown title="Provider latency" rows={analytics?.byProvider.map((item) => [item.provider, `${item.count} req · ${item.averageLatencyMs}ms`]) ?? []} />
        </section>

        <section className="dashboard-grid">
          <Breakdown title="Model aliases" rows={analytics?.byModel.map((item) => [item.modelAlias, `${item.count} req · ${item.tokens} tokens`]) ?? []} />
          <Breakdown title="API key usage" rows={analytics?.byApiKey.map((item) => [item.apiKeyId ?? 'unknown', `${item.count} req · ${item.averageLatencyMs}ms`]) ?? []} />
        </section>

        <section className="card data-card">
          <span className="pill">Request log stream</span>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Status</th>
                  <th>Model</th>
                  <th>Provider</th>
                  <th>Latency</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.logs.map((log) => (
                  <tr key={log.requestId}>
                    <td><code>{log.requestId}</code></td>
                    <td>{log.status} · {log.statusCode}</td>
                    <td>{log.modelAlias ?? '-'}</td>
                    <td>{log.provider ?? '-'}</td>
                    <td>{log.latencyMs ?? 0}ms</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
    </AppShell>
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

function Breakdown({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <section className="card">
      <span className="pill">{title}</span>
      <div className="key-list">
        {rows.length === 0 ? <p className="muted">No data yet.</p> : null}
        {rows.map(([label, value]) => (
          <div className="key-row" key={label}>
            <strong>{label}</strong>
            <span className="pill">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
