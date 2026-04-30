# Laporan Review Implementasi & Security Audit

Repo: `SitiNafayasmin/anjas` / lokal `/home/ubuntu/repos/9router-saas`  
Branch: `devin/initial-9router-saas`  
Commit yang direview: `c4f3cdb`  
Tanggal review: 30 April 2026

## Ringkasan eksekutif

Project ini sudah valid sebagai **starter MVP / fondasi teknis** untuk SaaS penjualan API key coding berbasis 9router. Struktur monorepo sudah rapi, service utama sudah terpisah, 9router dijalankan sebagai internal service, Docker production compose valid, dan smoke test service berhasil.

Namun project ini **belum production-ready untuk dijual ke publik**. Alasannya: auth user belum ada, API key masih demo statis, quota/rate limit belum database-backed, endpoint business API belum diproteksi, dan provider 9router belum dikonfigurasi. Artinya project aman untuk deploy VPS sebagai preview/fondasi, tapi belum aman untuk menerima customer berbayar.

Kesimpulan:

- Status build: **lulus**
- Status dependency audit: **lulus**
- Status Docker production smoke test: **lulus**
- Status security untuk public paid launch: **belum lulus**
- Status deploy VPS untuk demo/fondasi: **siap**

## Scope review

Area yang direview:

- Struktur monorepo
- Next.js web app
- NestJS business API
- Fastify proxy API
- Integrasi internal 9router
- Prisma schema
- Dockerfile dan Docker Compose
- Environment variable template
- Caddy reverse proxy
- Deployment docs
- Dependency audit
- Smoke test container production

## Checklist hasil verifikasi

Perintah yang dijalankan:

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
docker compose config --quiet
docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet
docker compose -f docker-compose.prod.yml --env-file .env.production.example up -d --build postgres redis 9router api proxy web
```

Hasil:

| Check | Status | Catatan |
| --- | --- | --- |
| Lint | Lulus | Semua workspace lulus ESLint |
| Typecheck | Lulus | API, proxy, web, db lulus TypeScript |
| Build | Lulus | Next.js production build sukses |
| npm audit | Lulus | 0 vulnerability level moderate ke atas |
| Dev Docker Compose config | Lulus | Compose valid |
| Prod Docker Compose config | Lulus | Compose valid |
| Production container startup | Lulus | Postgres, Redis, 9router, API, proxy, web start |
| API `/health` | Lulus | Return 200 |
| Proxy `/health` | Lulus | Return 200 |
| Web app | Lulus | Return 200 HTML |
| 9router dashboard internal | Lulus | Return 200 dari Docker network |
| Proxy `/v1/models` tanpa auth | Lulus | Return 401 |
| Proxy `/v1/models` dengan demo key | Lulus | Return 200 model alias |
| Proxy `/v1/chat/completions` | Expected upstream error | Request sampai ke 9router, tapi provider belum dikonfigurasi |

Error `/v1/chat/completions` yang terlihat:

```json
{
  "error": {
    "message": "No active credentials for provider: openrouter",
    "type": "invalid_request_error",
    "code": "model_not_found"
  }
}
```

Ini **bukan bug aplikasi**. Ini normal sampai provider credential dimasukkan ke dashboard 9router.

## Review struktur project

Struktur saat ini:

```txt
apps/web      -> Next.js landing page, dashboard shell, docs shell
apps/api      -> NestJS business API
apps/proxy    -> Fastify OpenAI-compatible proxy
packages/db   -> Prisma schema dan Prisma client export
infra/caddy   -> Reverse proxy HTTPS
infra/9router.Dockerfile -> Container internal 9router pinned
docs          -> Dokumentasi teknis
```

Penilaian:

- Pemisahan `web`, `api`, `proxy`, dan `db` sudah benar.
- Memisahkan proxy AI dari API bisnis adalah keputusan bagus karena request AI bisa streaming panjang dan berat.
- 9router tidak diekspos publik di production compose; ini benar.
- `.dockerignore` sudah mengecualikan `.env`, `.git`, `node_modules`, `.next`, dan output build; ini bagus untuk keamanan dan ukuran build context.
- Payment sengaja belum dimasukkan, sesuai requirement.

## Review keamanan

### Hal yang sudah bagus

#### 9router tidak langsung diekspos publik

Di `docker-compose.prod.yml`, service `9router` hanya memakai:

```yaml
expose:
  - "20128"
```

Artinya 9router hanya tersedia di Docker network, bukan langsung ke internet. Ini benar, karena user harus lewat proxy SaaS.

#### Customer API key tidak diteruskan ke 9router

Proxy memakai `ROUTER_API_KEY` internal opsional untuk request ke 9router. API key customer tidak diteruskan ke upstream. Ini desain yang benar.

#### Environment production memakai placeholder, bukan secret asli

Tidak ditemukan secret production asli yang ter-commit. `.env.production.example` hanya berisi placeholder.

#### Public proxy sudah menolak request tanpa bearer token

Endpoint `/v1/models`, `/v1/chat/completions`, dan `/v1/responses` melakukan validasi bearer token. Smoke test membuktikan tanpa auth return 401.

#### Dependency audit bersih

`npm audit --audit-level=moderate` return 0 vulnerability.

## Temuan security gap

### P0 — API key masih demo statis, belum database-backed

File terkait:

- `apps/proxy/src/auth.ts`
- `apps/proxy/src/config.ts`
- `.env.production.example`

Saat ini proxy hanya membandingkan token dengan `DEMO_API_KEY`. Ini cukup untuk smoke test, tapi tidak aman untuk public launch.

Risiko:

- Semua customer memakai satu key.
- Tidak bisa revoke key per user.
- Tidak ada per-user quota.
- Kalau key bocor, semua akses harus diganti.
- Default fallback `ak_live_demo` tetap ada jika env tidak diset.

Proposal fix:

- Buat API key random minimal 32 byte.
- Simpan hanya hash, bukan plaintext.
- Format key: `ak_live_<random>`.
- Simpan prefix pendek untuk dashboard.
- Validasi key dengan constant-time comparison.
- Hapus fallback `ak_live_demo` untuk production; app harus fail start jika `DEMO_API_KEY` kosong saat mode demo.
- Tambahkan endpoint generate/revoke key dengan auth user.

Prioritas: **wajib sebelum jualan publik**.

### P0 — Business API belum punya auth

File terkait:

- `apps/api/src/modules/api-keys.module.ts`
- `apps/api/src/modules/plans.module.ts`
- `infra/caddy/Caddyfile`

Endpoint `/api-keys` saat ini bisa diakses publik lewat `api.domain.com/api-keys*` dan belum punya auth user.

Risiko:

- Data API key demo bisa terlihat publik.
- Nanti jika endpoint ini tersambung DB, data user bisa bocor.
- Admin/business API bisa disalahgunakan jika endpoint create/delete ditambah tanpa auth.

Proposal fix:

- Tambahkan auth user terlebih dahulu sebelum endpoint business API dibuat real.
- Minimal: session/JWT auth untuk dashboard.
- Pisahkan route internal admin dengan proteksi admin role.
- Jangan expose endpoint internal yang belum siap lewat Caddy.

Prioritas: **wajib sebelum endpoint API key real diaktifkan**.

### P0 — Quota dan rate limit belum benar-benar per user/API key

File terkait:

- `apps/proxy/src/server.ts`
- `packages/db/prisma/schema.prisma`

Proxy saat ini memakai global Fastify rate limit:

```ts
max: 60,
timeWindow: '1 minute'
```

Ini belum pakai Redis store dan belum per API key/plan.

Risiko:

- Customer bisa memakai lebih dari quota.
- Rate limit tidak akurat saat service diskalakan lebih dari 1 container.
- Tidak ada monthly token quota enforcement.
- Tidak ada max concurrent stream.

Proposal fix:

- Gunakan Redis sebagai store rate limit.
- Key rate limit harus berdasarkan API key hash/prefix, bukan hanya IP.
- Tambahkan quota check sebelum forward ke 9router.
- Catat usage setelah request selesai.
- Tambahkan concurrent stream counter dengan TTL.

Prioritas: **wajib sebelum paid beta**.

### P1 — CORS proxy terlalu permissive

File terkait:

- `apps/proxy/src/server.ts`

Saat ini:

```ts
await app.register(cors, { origin: true });
```

Untuk API key bearer, CORS bukan satu-satunya security boundary. Tapi origin terbuka tetap sebaiknya dibatasi agar browser dari domain asing tidak bebas memanggil API kamu.

Risiko:

- Mempermudah abuse dari browser.
- Kurang sesuai best practice production.

Proposal fix:

- Untuk API proxy, pertimbangkan tidak perlu CORS kecuali ada browser client resmi.
- Jika perlu CORS, batasi ke `WEB_ORIGIN`.
- Jangan enable credential untuk origin wildcard.

Prioritas: **sebelum production public**.

### P1 — Belum ada request body schema validation dan body size limit khusus AI

File terkait:

- `apps/proxy/src/server.ts`
- `apps/proxy/src/router-client.ts`

Request body langsung diteruskan ke 9router setelah rewrite model alias. Belum ada validasi payload seperti `messages`, `model`, `stream`, `max_tokens`, dan batas ukuran body.

Risiko:

- Payload terlalu besar bisa membebani memory.
- Input aneh bisa menimbulkan error upstream.
- Abuse token/request lebih sulit dikontrol.

Proposal fix:

- Tambahkan schema validation dengan Zod.
- Tambahkan `bodyLimit` di Fastify.
- Set limit per plan untuk `max_tokens`.
- Reject model yang tidak ada di allowlist plan.

Prioritas: **sebelum paid beta**.

### P1 — Belum ada timeout, abort, dan streaming safety

File terkait:

- `apps/proxy/src/router-client.ts`
- `apps/proxy/src/server.ts`

Request ke upstream memakai `fetch` tanpa timeout eksplisit.

Risiko:

- Request upstream menggantung terlalu lama.
- Streaming dapat menahan koneksi dan resource.
- Sulit membatasi concurrency.

Proposal fix:

- Gunakan `AbortController` dengan timeout per plan.
- Tambahkan max concurrent streaming request per API key.
- Normalisasi error timeout.

Prioritas: **sebelum production public**.

### P1 — Header upstream diteruskan terlalu longgar

File terkait:

- `apps/proxy/src/server.ts`

Proxy meneruskan hampir semua header upstream kecuali `content-encoding`, `content-length`, dan `transfer-encoding`.

Risiko:

- Header seperti `set-cookie`, `server`, atau header internal upstream bisa ikut keluar.
- Potensi perilaku tidak diinginkan dari client.

Proposal fix:

- Buat allowlist header response.
- Umumnya cukup: `content-type`, `cache-control`, `x-request-id`.
- Untuk streaming SSE: pastikan `content-type: text/event-stream`.

Prioritas: **sebelum production public**.

### P1 — Caddy belum menambahkan security headers

File terkait:

- `infra/caddy/Caddyfile`

Belum ada HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, dan Content-Security-Policy.

Proposal fix:

- Tambahkan header security dasar di Caddy.
- CSP perlu disesuaikan setelah UI final.

Prioritas: **sebelum public launch**.

### P1 — Docker container masih berjalan sebagai root

File terkait:

- `apps/web/Dockerfile`
- `apps/api/Dockerfile`
- `apps/proxy/Dockerfile`
- `infra/9router.Dockerfile`

Container Node default berjalan sebagai root jika tidak diubah.

Risiko:

- Jika app compromise, dampaknya di container lebih besar.

Proposal fix:

- Pakai user `node` di image runner.
- Pastikan ownership file sesuai.

Prioritas: **sebelum production serius**.

### P1 — Production migration script masih memakai `prisma migrate dev`

File terkait:

- `packages/db/package.json`
- `docs/vps-deployment.md`

Script:

```json
"db:migrate": "prisma migrate dev"
```

`migrate dev` bukan perintah production. Untuk production seharusnya `prisma migrate deploy`.

Proposal fix:

- Tambahkan script `db:migrate:deploy`.
- Buat migration file resmi dari schema.
- Update deployment guide agar production memakai `migrate deploy`.

Prioritas: **sebelum DB dipakai real**.

### P2 — Redis belum memakai password

File terkait:

- `docker-compose.prod.yml`

Redis tidak expose port publik, jadi aman untuk MVP single-server. Tapi untuk hardening, Redis bisa diberi password internal.

Proposal fix:

- Tambah `REDIS_PASSWORD`.
- Jalankan Redis dengan `--requirepass`.
- Update `REDIS_URL`.

Prioritas: **medium**.

### P2 — App container belum punya healthcheck

File terkait:

- `docker-compose.prod.yml`

Postgres dan Redis punya healthcheck. Web/API/proxy/9router belum.

Proposal fix:

- Tambah healthcheck untuk `api`, `proxy`, `web`, dan `9router`.
- Caddy sebaiknya depends_on service healthy jika memungkinkan.

Prioritas: **medium**.

### P2 — Deployment doc dashboard tunnel 9router perlu dikoreksi

File terkait:

- `docs/vps-deployment.md`

Instruksi:

```bash
ssh -L 20128:9router:20128 root@YOUR_VPS_IP
```

Di host VPS, hostname Docker service `9router` biasanya tidak bisa di-resolve langsung. Cara yang lebih aman dan beginner-friendly adalah expose dashboard hanya ke localhost VPS memakai compose override:

```yaml
services:
  9router:
    ports:
      - "127.0.0.1:20128:20128"
```

Lalu dari laptop:

```bash
ssh -L 20128:127.0.0.1:20128 root@YOUR_VPS_IP
```

Prioritas: **medium**.

## Status requirement

| Requirement | Status | Catatan |
| --- | --- | --- |
| Web SaaS shell | Ada | Landing, dashboard shell, docs shell |
| Backend API | Ada | Health, plans, api-keys demo |
| Fastify proxy | Ada | `/v1/models`, `/v1/chat/completions`, `/v1/responses` |
| PostgreSQL schema | Ada | Prisma schema lengkap fondasi |
| Redis | Ada | Service tersedia, belum digunakan sebagai store real |
| 9router internal | Ada | Pinned via Dockerfile |
| Model alias | Ada | Hardcoded di proxy |
| API key management real | Belum | Masih demo key |
| Usage tracking real | Belum | Schema ada, logic belum |
| Quota enforcement | Belum | Belum per user/API key |
| Rate limit per plan | Belum | Baru global in-memory |
| Auth user | Belum | Wajib ditambah |
| Payment | Sengaja belum | Sesuai requirement user |
| Admin panel | Belum | Roadmap |
| Production deploy config | Ada | Docker Compose + Caddy |
| Provider credentials 9router | Belum | Harus diset setelah deploy |

## Production readiness verdict

### Siap untuk:

- Push ke GitHub.
- Deploy ke VPS sebagai preview/demo.
- Menjalankan web, API, proxy, 9router, Postgres, Redis dalam Docker Compose.
- Smoke test endpoint dasar.
- Melanjutkan development auth, API key real, usage, quota, dan billing.

### Belum siap untuk:

- Dijual ke customer publik.
- Menerima pembayaran dan traffic real.
- Menjamin quota/customer isolation.
- Menyediakan SLA.
- Menyimpan data user production.

## Prioritas implementasi berikutnya

Urutan yang paling aman:

1. Tambahkan authentication user untuk dashboard dan business API.
2. Implement API key generation/revocation database-backed.
3. Hash API key dan validasi di proxy.
4. Implement Redis-backed rate limit per API key.
5. Implement quota token/request per plan.
6. Implement usage event dan request log metadata.
7. Tambahkan request schema validation dan body size limit.
8. Tambahkan timeout/concurrency limit untuk streaming.
9. Tambahkan security headers di Caddy.
10. Tambahkan production migration script `prisma migrate deploy`.
11. Tambahkan healthcheck service app.
12. Baru integrasikan payment service setelah fondasi aman.

## Rekomendasi sebelum deploy VPS sekarang

Kalau hanya mau demo/fondasi:

- Gunakan domain testing dulu.
- Ganti `POSTGRES_PASSWORD` dengan random kuat.
- Ganti `DEMO_API_KEY` dengan random kuat, jangan pakai `ak_live_demo`.
- Jangan expose 9router dashboard ke public internet.
- Jangan promosikan sebagai service paid dulu.

Kalau mau paid beta:

- Selesaikan P0 dan P1 dulu.

## Catatan akhir

Project ini sudah punya arah arsitektur yang benar untuk SaaS API key coding berbasis 9router. Kelemahan yang ditemukan bukan karena struktur salah, tetapi karena project masih berada di tahap starter/fondasi. Dengan memperbaiki P0 dan P1, project bisa bergerak dari “siap deploy demo” menjadi “siap paid beta”.
