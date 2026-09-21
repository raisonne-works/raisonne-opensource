# Contributing

Thanks for considering a contribution.

## Before you start

- Read [README.md](README.md) and [CLAUDE.md](CLAUDE.md).
- Raisonne is **one artist per install**. Features that assume multi-tenancy or a hosted SaaS control plane are out of scope unless discussed first.
- Security issues: see [SECURITY.md](SECURITY.md) — do not file them as public issues.

## Development

```bash
pnpm install
pnpm dev
pnpm exec tsc --noEmit
pnpm lint
```

Use the demo fixture (`src/fixtures/demo.json`). Do not commit anything under `src/fixtures/local/`, `.data/`, or `.env*`.

## Pull requests

- Keep changes focused and explained in plain language.
- Prefer honesty in UI copy when data or config is missing.
- Do not add analytics, trackers, or phone-home by default.
- Match existing TypeScript, server/client boundaries, and `src/lib/config.ts` for new env vars (and document them in `.env.example` + README).

## License

By contributing, you agree your work is licensed under the MIT License in [LICENSE](LICENSE).
