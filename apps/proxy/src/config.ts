export type ProxyConfig = {
  port: number;
  publicBaseUrl: string;
  routerBaseUrl: string;
  routerApiKey: string | undefined;
  redisUrl: string;
  demoApiKey: string;
  corsOrigins: string[];
  requestTimeoutMs: number;
  maxBodyBytes: number;
};

export function loadConfig(): ProxyConfig {
  return {
    port: Number(process.env.PROXY_PORT ?? 4100),
    publicBaseUrl: process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:4100',
    routerBaseUrl: process.env.ROUTER_BASE_URL ?? 'http://localhost:20128',
    routerApiKey: process.env.ROUTER_API_KEY,
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    demoApiKey: process.env.DEMO_API_KEY ?? 'ak_live_demo',
    corsOrigins: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    requestTimeoutMs: Number(process.env.PROXY_REQUEST_TIMEOUT_MS ?? 120_000),
    maxBodyBytes: Number(process.env.PROXY_MAX_BODY_BYTES ?? 1_048_576),
  };
}
