# Product Plan

## MVP without payment

The first version should prove the technical flow:

1. User has an account.
2. User generates an API key.
3. User configures Codex, Cursor, Cline, Continue, or another OpenAI-compatible coding tool.
4. Request reaches the SaaS proxy.
5. Proxy validates the key, checks quota/rate limits, resolves model alias, and forwards to 9router.
6. Usage is recorded for future billing.

## Core pages

- Landing page
- Dashboard
- API keys
- Usage
- Setup docs
- Admin users
- Admin model aliases
- Admin provider health

## Initial plans

Payment activation can be added later. Until then, plans can be manually assigned by admins.

- Trial: `coding-free`, small limits
- Pro: `coding-fast`, `coding-cheap`, `coding-smart`
- Max: higher quota and concurrency

## Provider strategy

Free and emergency fallback:

- OpenRouter free
- Z.ai Flash
- Groq free
- Cerebras free
- OpenCode Free
- Kiro

Cheap paid:

- MiniMax M2.x
- GLM/Z.ai
- Kimi K2
- DeepSeek via OpenRouter/SiliconFlow/DeepInfra
- Gemini Flash

Do not market the product as unlimited. Use fair usage limits and provider health checks.
