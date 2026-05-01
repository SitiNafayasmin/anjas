# Security Hardening Notes

Implemented:

- password hashing with Argon2
- HMAC-hashed sessions
- hash-only API keys with one-time reveal
- verified email gate for API key creation and checkout
- request schema validation and body size limits
- Redis quota/rate/concurrency guard in proxy
- auth endpoint rate limit for login/register/forgot-password
- admin role checks
- admin audit log for sensitive actions
- metadata-only request logs
- Caddy security headers

Before public launch:

- enable Brevo with a verified sender domain
- set `AUTH_SESSION_SECRET` to at least 32 random bytes
- set strict VPS firewall rules: expose only 80/443/SSH
- disable direct Postgres/Redis public access
- create a dedicated non-root deploy user
- configure automated backups and restore drill
- rotate any setup secrets shared during beta
- add admin 2FA before multiple operators use admin
- review upstream provider ToS before selling routed access
