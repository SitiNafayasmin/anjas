import { loadConfig } from '../config.js';

type EmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: EmailInput) {
  const config = loadConfig();

  if (!config.brevoApiKey) {
    console.warn(`Email skipped because BREVO_API_KEY is empty: ${input.subject}`);
    return { sent: false, skipped: true };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.brevoApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: config.emailFrom,
        name: config.emailFromName,
      },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo email failed with status ${response.status}`);
  }

  return { sent: true, skipped: false };
}

export function emailButton(url: string, label: string) {
  return `<a href="${url}" style="background:#0ea5e9;border-radius:999px;color:#020617;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">${label}</a>`;
}
