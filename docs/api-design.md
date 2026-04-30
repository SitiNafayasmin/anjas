# API Design

## Public proxy

Base URL:

```txt
https://api.yourdomain.com/v1
```

Initial endpoints:

- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`

## Business API

Base URL:

```txt
https://api.yourdomain.com/internal
```

Planned endpoints:

- `GET /health`
- `GET /plans`
- `GET /api-keys`
- `POST /api-keys`
- `DELETE /api-keys/:id`
- `GET /usage/summary`
- `GET /usage/events`

## API key format

Use a prefix that is safe to show in dashboards:

```txt
ak_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Store:

- `prefix`
- `keyHash`
- `status`
- `lastUsedAt`

Never store plaintext keys.
