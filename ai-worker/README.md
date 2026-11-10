# Phuket Atlas · Private Broker Edition

**Status:** Ready for secure deployment. Cloudflare account, access password and OpenAI API billing must be configured by the owner. The existing GitHub Pages site remains PUBLIC until intentionally disabled.

## Security architecture

- A *single* Cloudflare Worker serves the website, catalog, PDFs, illustrations, cover images and chat endpoint.
- `[assets].run_worker_first=true` guarantees a server-side authorization check for **every** requested static asset, including PDFs.
- If `ATLAS_GATE_PASSWORD` is missing or shorter than 24 characters, all requests return 503 and no content is served.
- HTTP Basic Auth username is `broker` and password is the random Cloudflare secret `ATLAS_GATE_PASSWORD` over HTTPS only. Do not use a weak/reused password.
- Optional but strongly recommended: put Cloudflare Access in front of the Worker with an Allow policy for **exactly one verified email address**, not "Everyone", "Email Domain" or "All login methods". Set **All traffic**.
- There are no public APIs and no secrets in the front-end source. `POST /api/chat` is on the same protected origin and uses the same authentication gate.
- Requests for personal chat use OpenAI Responses API with `store:false`; `OPENAI_API_KEY` is stored in Cloudflare secrets.
- The Worker reads the latest **deployed private asset** `/data/locations.json` rather than public `raw.githubusercontent.com`, so the GitHub repo can later become private.
- Login is server-enforced, not the `?broker=1` UI toggle. Browser Basic Auth credentials are retained until browser session/credential cache is cleared.

## Deployment setup — owner's action

1. Create / sign in to a Cloudflare account (Workers enabled).
2. Create a Cloudflare API token scoped to Workers Scripts write and relevant account permissions. Find your Cloudflare Account ID.
3. Save `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions repository secrets for `Ativ83/Phuket-Atlas`.
4. On the GitHub Actions tab, run **Deploy private Phuket Atlas (manual)**. This creates `phuket-atlas-private.<your-subdomain>.workers.dev` in **fail-closed** mode (it will not serve the catalog until your password secret is set).
5. Open Cloudflare dashboard → Workers & Pages → `phuket-atlas-private` → Settings → Variables and Secrets. Create a new encrypted secret `ATLAS_GATE_PASSWORD` (random, **at least 24 characters**, and unique). Save and deploy. Keep it out of chat and GitHub.
6. Create encrypted secret `OPENAI_API_KEY` from the OpenAI API platform. This enables real AI conversation (separately billed). The optional `OPENAI_MODEL` var defaults to `gpt-5-mini`.
7. Enable Cloudflare Zero Trust, open Worker settings → **Access** → Protect Worker behind Access → **All traffic**. Configure **Allow exact email address** for your own account only. Verify from an incognito/unapproved session that you cannot open any URL, including direct PDFs and `/data/locations.json`.
8. Open the new protected Worker URL; sign in and enter Basic Auth username `broker` and the secret password. The AI button appears automatically; no `?broker=1` parameter is needed. AI makes same-origin `POST /api/chat` calls. There is no additional browser token to configure.
9. Only after verifying the new site loads, all audio/maps/cards work, AI answers, and unapproved access fails, disable GitHub Pages and make the GitHub repository **private**. A private repo alone does not immediately revoke previously published URLs; actively disable the old Pages site and verify its files no longer resolve. Purge any copies if previously shared.
10. Deploy later updates by manually running the GitHub workflow again. Keep Cloudflare Access enabled.

**Do not share the GitHub Pages URL as a private link**: `https://ativ83.github.io/Phuket-Atlas/` is the old public deployment.

## What's deliberately not included

- No Bitrix24, CRM, clients, leads, or multiuser management.
- No hidden agent price sheets or secret documents in a public GitHub Pages directory.
- Google Drive agent folders are **not yet connected live** to the Cloudflare Worker. Only vetted fields already copied into `data/locations.json` are available to GPT. Live access needs a server-side Google OAuth integration, with private refresh credentials stored in Cloudflare.
- Telegram ingestion, automated project edits and voice conversations are future stages.
- No real-time inventory or automatic claims about current prices without a dated source.

## Local validation

```sh
python3 scripts/build_private_atlas.py
node --check ai-worker/src/index.js
node --check broker-ai.js
```

The public GitHub Pages site remains unchanged until the private counterpart has been verified.
