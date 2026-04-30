# Tutorial Deploy 9router SaaS ke VPS untuk Pemula

Dokumen ini ditulis untuk pemula yang baru pertama kali deploy aplikasi ke VPS. Ikuti pelan-pelan dari atas ke bawah.

## Target hasil akhir

Setelah selesai, kamu akan punya:

- Website utama: `https://domainkamu.com`
- API proxy: `https://api.domainkamu.com/v1`
- Business API health: `https://api.domainkamu.com/health`
- 9router berjalan internal di server
- PostgreSQL dan Redis berjalan internal di server
- HTTPS otomatis dari Caddy

Catatan penting: versi project saat ini cocok untuk demo/fondasi. Untuk jualan publik, wajib lanjut implement auth user, API key database, quota, dan rate limit real.

## Spek VPS yang disarankan

Untuk awal:

- Ubuntu 24.04 LTS
- 4 vCPU
- 8 GB RAM
- 100 GB NVMe
- Public IPv4
- Region Singapore kalau target user Indonesia

Provider yang cocok:

- Hetzner
- Vultr
- DigitalOcean
- Contabo
- Biznet Gio / provider lokal jika butuh Indonesia

## Yang perlu kamu siapkan

- VPS Ubuntu.
- Domain, misalnya `domainkamu.com`.
- Akses SSH ke VPS.
- Repo GitHub: `https://github.com/SitiNafayasmin/anjas.git`.
- GitHub token kalau repo private.

## Langkah 1 — Login ke VPS

Dari laptop/PC kamu, buka terminal.

Kalau memakai Linux/macOS:

```bash
ssh root@IP_VPS_KAMU
```

Kalau memakai Windows:

- Bisa pakai Windows Terminal / PowerShell.
- Jalankan perintah yang sama:

```powershell
ssh root@IP_VPS_KAMU
```

Ganti `IP_VPS_KAMU` dengan IP server kamu.

Contoh:

```bash
ssh root@123.123.123.123
```

## Langkah 2 — Update server

Di dalam VPS, jalankan:

```bash
sudo apt update
sudo apt upgrade -y
```

Install tools dasar:

```bash
sudo apt install -y ca-certificates curl git ufw nano openssl
```

## Langkah 3 — Install Docker

Jalankan:

```bash
curl -fsSL https://get.docker.com | sudo sh
```

Tambahkan user kamu ke group Docker:

```bash
sudo usermod -aG docker $USER
```

Aktifkan Docker:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

Cek Docker:

```bash
docker --version
docker compose version
```

Kalau muncul versi Docker, berarti berhasil.

Logout lalu login lagi supaya group Docker aktif:

```bash
exit
```

Lalu SSH lagi:

```bash
ssh root@IP_VPS_KAMU
```

## Langkah 4 — Setup firewall

Izinkan SSH, HTTP, dan HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Cek status:

```bash
sudo ufw status
```

Yang boleh public hanya:

- Port 22 untuk SSH
- Port 80 untuk HTTP
- Port 443 untuk HTTPS

PostgreSQL, Redis, dan 9router tidak perlu dibuka ke internet.

## Langkah 5 — Arahkan DNS domain ke VPS

Masuk ke panel DNS domain kamu.

Buat record:

```txt
Type: A
Name: @
Value: IP_VPS_KAMU
```

Buat record kedua:

```txt
Type: A
Name: api
Value: IP_VPS_KAMU
```

Contoh jika domain kamu `domainkamu.com`:

- `domainkamu.com` mengarah ke VPS
- `api.domainkamu.com` mengarah ke VPS

Tunggu DNS propagasi. Biasanya 5 menit sampai beberapa jam.

Cek dari terminal:

```bash
ping domainkamu.com
ping api.domainkamu.com
```

Kalau IP yang muncul adalah IP VPS kamu, DNS sudah benar.

## Langkah 6 — Clone repo

Masuk ke folder `/opt`:

```bash
cd /opt
```

Clone repo:

```bash
git clone -b devin/initial-9router-saas https://github.com/SitiNafayasmin/anjas.git 9router-saas
```

Masuk ke folder project:

```bash
cd /opt/9router-saas
```

Cek isi folder:

```bash
ls
```

Harus terlihat file seperti:

```txt
apps
docker-compose.prod.yml
infra
package.json
```

## Langkah 7 — Buat file environment production

Copy contoh env:

```bash
cp .env.production.example .env
```

Buat password PostgreSQL random:

```bash
openssl rand -hex 32
```

Copy hasilnya. Contoh:

```txt
9f0b0c8a1e2d3c4b5a...
```

Buat demo API key random:

```bash
echo "ak_live_$(openssl rand -hex 24)"
```

Copy hasilnya. Contoh:

```txt
ak_live_123abc456def...
```

Edit `.env`:

```bash
nano .env
```

Isi seperti ini, sesuaikan domain dan password:

```env
APP_DOMAIN="domainkamu.com"
API_DOMAIN="api.domainkamu.com"

WEB_ORIGIN="https://domainkamu.com"
PUBLIC_API_BASE_URL="https://api.domainkamu.com"

POSTGRES_DB="9router_saas"
POSTGRES_USER="9router_saas"
POSTGRES_PASSWORD="PASSWORD_RANDOM_KAMU"
DATABASE_URL="postgresql://9router_saas:PASSWORD_RANDOM_KAMU@postgres:5432/9router_saas?schema=public"

REDIS_URL="redis://redis:6379"

DEMO_API_KEY="ak_live_RANDOM_KAMU"
ROUTER_API_KEY=""
NINE_ROUTER_VERSION="0.4.8"
```

Penting:

- `POSTGRES_PASSWORD` dan password di `DATABASE_URL` harus sama.
- Jangan pakai `change-this-long-random-password`.
- Jangan pakai `ak_live_demo` untuk server online.
- Jangan upload `.env` ke GitHub.

Simpan nano:

- Tekan `CTRL + O`
- Tekan `Enter`
- Tekan `CTRL + X`

## Langkah 8 — Jalankan aplikasi production

Build dan start semua service:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Proses pertama bisa memakan waktu beberapa menit karena Docker harus build image.

Cek container:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

Harus ada service:

- `web`
- `api`
- `proxy`
- `9router`
- `postgres`
- `redis`
- `caddy`

## Langkah 9 — Cek log jika ada error

Cek semua log:

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f
```

Cek log service tertentu:

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f web
docker compose --env-file .env -f docker-compose.prod.yml logs -f api
docker compose --env-file .env -f docker-compose.prod.yml logs -f proxy
docker compose --env-file .env -f docker-compose.prod.yml logs -f 9router
docker compose --env-file .env -f docker-compose.prod.yml logs -f caddy
```

Untuk keluar dari log:

```txt
CTRL + C
```

## Langkah 10 — Test dari VPS

Test API health:

```bash
curl https://api.domainkamu.com/health
```

Harus keluar seperti:

```json
{"ok":true,"service":"api","timestamp":"..."}
```

Test proxy health:

```bash
curl https://api.domainkamu.com/v1/models
```

Tanpa API key harus error 401. Ini benar.

Test dengan API key:

```bash
source .env
curl https://api.domainkamu.com/v1/models \
  -H "Authorization: Bearer $DEMO_API_KEY"
```

Harus keluar list model alias:

```json
{
  "object": "list",
  "data": [
    {"id":"coding-free","object":"model","owned_by":"9router-saas"},
    {"id":"coding-fast","object":"model","owned_by":"9router-saas"},
    {"id":"coding-cheap","object":"model","owned_by":"9router-saas"},
    {"id":"coding-smart","object":"model","owned_by":"9router-saas"}
  ]
}
```

Test website:

Buka di browser:

```txt
https://domainkamu.com
```

## Langkah 11 — Pahami kenapa chat completion belum jalan

Kalau kamu test:

```bash
source .env
curl https://api.domainkamu.com/v1/chat/completions \
  -H "Authorization: Bearer $DEMO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "coding-free",
    "messages": [
      {"role": "user", "content": "Halo"}
    ]
  }'
```

Kemungkinan keluar error:

```json
{
  "error": {
    "message": "No active credentials for provider: openrouter"
  }
}
```

Ini normal. Artinya aplikasi kamu sudah sampai ke 9router, tapi 9router belum diberi provider credential.

Kamu harus setup provider di dashboard 9router dulu.

## Langkah 12 — Buka dashboard 9router dengan aman

Jangan buka port 9router ke public internet.

Cara aman: expose dashboard hanya ke localhost VPS, lalu tunnel via SSH.

Di folder project VPS:

```bash
cd /opt/9router-saas
```

Buat file override:

```bash
nano docker-compose.9router-local.yml
```

Isi:

```yaml
services:
  9router:
    ports:
      - "127.0.0.1:20128:20128"
```

Simpan file.

Restart 9router dengan override:

```bash
docker compose --env-file .env \
  -f docker-compose.prod.yml \
  -f docker-compose.9router-local.yml \
  up -d 9router
```

Dari laptop/PC kamu, buka terminal baru:

```bash
ssh -L 20128:127.0.0.1:20128 root@IP_VPS_KAMU
```

Selama SSH ini aktif, buka browser di laptop:

```txt
http://localhost:20128/dashboard
```

Di dashboard 9router, tambahkan provider seperti:

- OpenRouter
- Z.ai
- Groq
- Cerebras
- MiniMax
- Kiro/OpenCode Free jika didukung versi 9router kamu

Setelah provider aktif, ulangi test `/v1/chat/completions`.

Kalau sudah selesai setup, kamu boleh tetap membiarkan binding `127.0.0.1` karena tidak public. Tapi kalau ingin lebih ketat, matikan override dan restart:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d 9router
```

## Langkah 13 — Update aplikasi kalau ada commit baru

Masuk ke project:

```bash
cd /opt/9router-saas
```

Tarik update:

```bash
git pull
```

Rebuild:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Cek status:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

## Langkah 14 — Backup database

Buat folder backup:

```bash
mkdir -p /opt/backups/9router-saas
```

Backup manual:

```bash
source .env
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "/opt/backups/9router-saas/backup-$(date +%F-%H%M).sql"
```

Cek file backup:

```bash
ls -lh /opt/backups/9router-saas
```

Untuk production serius, backup harus otomatis harian dan dikirim ke object storage/S3.

## Langkah 15 — Command penting sehari-hari

Lihat container:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

Restart semua:

```bash
docker compose --env-file .env -f docker-compose.prod.yml restart
```

Stop semua:

```bash
docker compose --env-file .env -f docker-compose.prod.yml down
```

Start lagi:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

Lihat log:

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f
```

Rebuild setelah update:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

### Website belum HTTPS

Cek DNS:

```bash
ping domainkamu.com
ping api.domainkamu.com
```

Cek log Caddy:

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f caddy
```

Pastikan port 80 dan 443 dibuka:

```bash
sudo ufw status
```

### API health tidak jalan

Cek container:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

Cek log API:

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f api
```

### `/v1/models` selalu 401

Pastikan pakai API key dari `.env`:

```bash
source .env
echo $DEMO_API_KEY
```

Test lagi:

```bash
curl https://api.domainkamu.com/v1/models \
  -H "Authorization: Bearer $DEMO_API_KEY"
```

### Chat completion error provider credential

Kalau errornya:

```txt
No active credentials for provider
```

Berarti 9router belum disambungkan ke provider. Buka dashboard 9router dan tambah API key provider.

### Docker permission denied

Kalau muncul error permission Docker, logout lalu login lagi:

```bash
exit
ssh root@IP_VPS_KAMU
```

Atau jalankan pakai sudo:

```bash
sudo docker compose --env-file .env -f docker-compose.prod.yml ps
```

## Security checklist sebelum jualan publik

Sebelum menerima customer berbayar, selesaikan ini:

- Ganti demo API key dengan API key per user dari database.
- Hash API key, jangan simpan plaintext.
- Tambahkan register/login user.
- Proteksi endpoint `/api-keys`.
- Tambahkan quota per plan.
- Tambahkan Redis-backed rate limit per API key.
- Tambahkan usage logging.
- Tambahkan request body validation.
- Tambahkan timeout dan concurrency limit.
- Tambahkan security headers.
- Tambahkan monitoring dan alert.
- Tambahkan backup otomatis.

## Kesimpulan

Dengan tutorial ini kamu bisa deploy project ke VPS sebagai fondasi/demo. Aplikasi akan hidup, domain HTTPS aktif, proxy bisa validasi API key demo, dan 9router bisa disiapkan sebagai internal router.

Untuk launching berbayar, jangan langsung jual dulu sebelum security checklist selesai.
