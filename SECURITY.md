# Security

## What this project is

Raisonne is a self-hosted catalogue site. A typical install holds:

- public catalogue data (works, CV, press)
- optional wallet sign-in sessions
- optional shop orders (name, email, postal address) under `.data/`
- environment secrets (Stripe, Alchemy, session signing key)

## Reporting a vulnerability

Do **not** open a public GitHub issue for a security problem.

Email **security@orkhan.art** with:

- a description of the issue
- steps to reproduce
- impact (what an attacker can read or change)
- your contact details if you want a reply

If that address is unavailable, use a **private security advisory** on the GitHub repository:  
https://github.com/orkhan-art-web/raisonne-os/security/advisories/new

Please give a reasonable time to fix before any public disclosure.

## What is in scope

- Authentication and session handling (SIWE, cookies)
- Checkout, webhooks, and order lookup
- Leakage of env secrets, order PII, or owner-only setup detail
- Cross-site request forgery on state-changing routes
- Path or host confusion that forges sign-in domains

## What is out of scope

- Denial of service against a single self-hosted install
- Issues that require physical access or an already-compromised host
- Reports that only apply after `RAISONNE_TOOLS=1` is deliberately published on a public host (those routes are the artist’s workbench and are off in production by default)
- Social engineering of the artist’s wallet keys

## Hardening notes for operators

- Never commit `.env.local`, `src/fixtures/local/`, or `.data/`
- Set `RAISONNE_OWNER_ADDRESSES` explicitly; do not treat old minting keys as admin keys
- Set `RAISONNE_SITE_URL` (or `RAISONNE_SIWE_DOMAIN`) so sign-in messages are bound to your domain
- Keep `RAISONNE_TOOLS` off on public production hosts
- Put Stripe webhook verification in place before going live (`STRIPE_WEBHOOK_SECRET`)
- Prefer `RAISONNE_UPDATE=0` on production hosts that deploy from images; use your platform’s deploy to update the app
