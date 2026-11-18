# TF2Do maintainer handoff

Version 0.1.0 delivers the local planner and documentation. [The README](README.md) introduces the app, [Development](docs/DEVELOPMENT.md) gives the exact setup and check commands, and [GitHub handoff](docs/GITHUB-HANDOFF.md) covers the source and wiki repositories.

## Verification

The release package is checked using Node.js 24.22.1 and pnpm 11.25.0. Exact application and tooling versions are pinned in [the lockfile](pnpm-lock.yaml).

- `pnpm check` runs formatting, TypeScript, the production build, and 21 domain/storage tests covering dates, undo, import validation, atomic recovery, and stale-tab writes.
- `pnpm exec playwright test` runs five Chromium workflows against the production build. They cover the planning loop, browser persistence, import/export and recovery, keyboard focus, the 360px layout, and backup preservation after retrying a failed replacement.
- GitHub Actions runs these checks on the first push to `main` and on pull requests. Browser automation covers Chromium. Other browsers and screen-reader behavior need separate verification.

## Next development milestone

Add an account-backed workspace with durable storage and per-user data separation. Decide how offline edits and conflicts work, then verify that two accounts cannot read or change each other’s records. Keep local exports available through those changes. See the [roadmap](wiki/Roadmap.md).
