export type ProxyConfig = {
  port: number;
  publicBaseUrl: string;
  routerBaseUrl: string;
  redisUrl: string;
  demoApiKey: string;
};

export function loadConfig(): ProxyConfig {
  return {
    port: Number(process.env.PROXY_PORT ?? 4100),
    publicBaseUrl: process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:4100',
    routerBaseUrl: process.env.ROUTER_BASE_URL ?? 'http://localhost:20128',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    demoApiKey: process.env.DEMO_API_KEY ?? 'ak_live_demo',
  };
}
