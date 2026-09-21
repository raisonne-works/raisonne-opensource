# CLAUDE.md — install and extend Raisonne

This file is for an agent (Claude, Codex, Hermes, …) asked to install or change this app. Read it before inventing a stack.

## What Raisonne is

- One **self-hosted catalogue raisonne** per artist (not multi-tenant SaaS).
- Data is files under `src/fixtures/` (demo ships in-repo; the artist’s own data is gitignored under `src/fixtures/local/`).
- Optional: wallet sign-in, collectors/leaderboard/insights, shop/checkout.
- Stack: **Next.js 16**, React 19, pnpm, TypeScript, viem (SIWE), shadcn/Base UI.

This is **not** the Next.js you memorised from older training data. Read `AGENTS.md` and, before non-trivial Next changes, the guides under `node_modules/next/dist/docs/`.

## Fresh install (happy path)

```bash
git clone https://github.com/orkhan-art-web/raisonne-os.git
cd raisonne-os
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000 — you should see the **Demo Artist** fixture. Footer says demo data.

Production-shaped run:

```bash
pnpm build && pnpm start
```

Checks:

```bash
pnpm exec tsc --noEmit
pnpm lint
```

## Environment

All variables are optional. With none set, the catalogue works; pages that need a key name the missing variable instead of crashing.

Minimum for a real artist install:

| Variable | Why |
| --- | --- |
| `RAISONNE_SITE_URL` | Canonical URLs, SIWE domain default |
| `RAISONNE_SESSION_SECRET` | ≥32 chars; wallet sign-in (`openssl rand -base64 32`) |
| `RAISONNE_OWNER_ADDRESSES` | Artist wallets (comma-separated). Required for owner pages |
| `ALCHEMY_API_KEY` | Live chain reads (collectors / insights); free tier is enough |

Shop (optional): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

App self-update (optional): see `/update` and `pnpm update:check`. Production web apply needs `RAISONNE_UPDATE=1`.

Never put secrets in fixtures. Never commit `.env.local`, `src/fixtures/local/`, or `.data/`.

## Artist data (not the app)

| Command | Effect |
| --- | --- |
| `pnpm snapshot` | Fill `src/fixtures/local/site.json` from an existing site’s public proxy (`RAISONNE_CMS_URL`) |
| `pnpm snapshot:chain` | Fill `src/fixtures/local/chain.json` from the chain (`ALCHEMY_API_KEY`) |
| `pnpm seed:demo` | Rebuild demo chain block only |

Editing profile/CV/press in v0.1 is **edit the JSON** (or re-run snapshot). There is no full studio CMS UI yet. Owner wallet gates exist; treat file edit as the documented path.

## App updates (the code)

```bash
pnpm update:check
pnpm update:raisonne
pnpm build && pnpm start
```

Or sign in as owner → `/update`. Does not touch catalogue data, orders, or env.

## Where code lives

| Path | Role |
| --- | --- |
| `src/lib/types.ts` | Domain shapes components render |
| `src/fixtures/` | Data loader + demo |
| `src/lib/config.ts` | All env reads + feature status |
| `src/lib/auth/` | SIWE, session, owner gates |
| `src/lib/chain/` | Alchemy + pure derivations |
| `src/lib/store/` | Cart, checkout, orders |
| `src/lib/update/` | Version check + apply |
| `src/components/raisonne/` | UI |
| `src/proxy.ts` | Maintenance + light auth redirect (Next 16 proxy, not middleware) |

Pages take typed data only — do not couple components to CMS response shapes.

## Rules of the house

1. **Honesty over polish.** Missing config → named variable panel. Unknown edition size → “Edition not recorded”, never invent “Unique”.
2. **No secrets in the browser.** Setup detail for missing env is owner/dev via `/api/setup`, not public HTML.
3. **Prices and payments are server-side.** Never trust a client-supplied price.
4. **One artist per install.** No multi-tenant shortcuts.
5. **Do not enable `RAISONNE_TOOLS=1` on a public host** unless the artist asked; `/import` and `/design-system` are workbench pages.
6. Prefer `pnpm`, not npm/yarn.

## Deploy sketch (one server)

1. Node 20+, pnpm, git clone of this repo (or image built from it).
2. `.env.local` on the host (or platform env).
3. `pnpm install && pnpm build && pnpm start` (or process manager / Coolify / Docker).
4. Persist `.data/` and `src/fixtures/local/` across deploys.
5. TLS terminator in front; set `RAISONNE_TRUSTED_PROXY=1` when it sets `X-Forwarded-For`.
6. Point DNS at the host; set `RAISONNE_SITE_URL=https://your.domain`.

## Out of scope for agents unless asked

- Copying Orkhan’s private site design or Kilim microsite
- Implementing POD provider adapters
- Opening the public repo to the artist’s real catalogue data
- Weakening auth, CSRF, or webhook verification “to make demo easier”
