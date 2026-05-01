# Brevo Email Setup

The app uses Brevo transactional email for:

- email verification after registration
- forgot-password / reset-password links
- future quota and billing notifications

## Required env

```bash
APP_PUBLIC_URL="https://yourdomain.com"
BREVO_API_KEY="xkeysib-your-key"
EMAIL_FROM="no-reply@yourdomain.com"
EMAIL_FROM_NAME="9router SaaS"
```

Create the key in Brevo:

1. Open Brevo dashboard.
2. Go to SMTP & API.
3. Create an API key with transactional email permission.
4. Add the key to `.env` on the VPS as `BREVO_API_KEY`.
5. Verify the sender/domain in Brevo before public launch.

If `BREVO_API_KEY` is empty, the API logs that email was skipped. This is useful for local development but not acceptable for public production.

## Auth endpoints

- `POST /auth/register` creates account, trial subscription, and email verification token.
- `POST /auth/resend-verification` sends a new verification email.
- `GET /auth/verify-email?token=...` verifies the token from the email link.
- `POST /auth/forgot-password` sends a reset email if the account exists.
- `POST /auth/reset-password` updates password and clears existing sessions.

API key creation and checkout require verified email.
