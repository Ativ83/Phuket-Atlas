# Phuket Atlas · personal broker AI

## What is built

- Broker-only entry point: `https://ativ83.github.io/Phuket-Atlas/?broker=1`
- Local read-only project search works without an AI backend.
- A Cloudflare Worker connects to the OpenAI Responses API when configured.
- Every request uses a broker token. OpenAI credentials never go into the HTML or GitHub.
- Atlas catalog is fetched fresh from the public repository (approximately five-minute edge cache). Private Google Drive folders are **not yet connected**.
- The standard `https://ativ83.github.io/Phuket-Atlas/` view does not show the broker entry point.
- The `?broker=1` switch is **not authentication**; the public page/source can be viewed by anyone. Only the server-protected AI service is access-controlled.

## Connect the AI server

In Cloudflare Workers, create a Worker using `ai-worker/src/index.js`, or install Wrangler locally and run:

```sh
cd ai-worker
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put BROKER_ACCESS_TOKEN
npx wrangler deploy
```

Use a newly generated, random, long (>= 32-character) broker token; it must be different from your OpenAI key. Never put either secret into GitHub commits, client-side JS, or chat messages.

In the broker interface, tap ⚙, enter the deployed Worker URL (HTTPS) and **broker token**, not the OpenAI key. Settings are kept in the current browser tab's memory, never persisted in localStorage or URL.

For the first deployment, configure the Cloudflare Worker secrets in Cloudflare dashboard under **Settings → Variables and Secrets** if not using Wrangler. Without both secrets, the Worker deliberately returns an error instead of sending requests.

## Limitations / next work

- No automatic access to private Google Drive, Telegram or Bitrix24.
- Unit prices and ownership reflect the Atlas catalog snapshot and may be incomplete; verify with the developer before making offers.
- No server-side per-user history is persisted; only recent chat turns are sent with each request.
- The Worker has token authentication and exact CORS origin, but no sophisticated per-IP rate limiting. Add Cloudflare WAF/Rate Limiting before broader release.
- If you want the entire Atlas, including its catalog, to be truly private, move it off public GitHub Pages behind proper identity-based authentication. Hiding the broker button is not security.
- OpenAI API calls are billed separately from ChatGPT subscriptions.

