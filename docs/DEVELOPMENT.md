# Development

Use Node.js 24 and pnpm 11.25.0. On a fresh installation of Node.js, you can install the pinned pnpm version with `npm install --global pnpm@11.25.0`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The dev server listens on [127.0.0.1:5173](http://127.0.0.1:5173/). The production preview listens on [127.0.0.1:4173](http://127.0.0.1:4173/) after `pnpm build` and `pnpm preview`. The two ports have separate browser storage.

| Command                                 | What it does                                                      |
| --------------------------------------- | ----------------------------------------------------------------- |
| `pnpm format`                           | Format source and documentation                                   |
| `pnpm check`                            | Check formatting, run domain/storage tests, type-check, and build |
| `pnpm exec playwright install chromium` | Install the browser used by end-to-end tests                      |
| `pnpm test:e2e`                         | Build and run Chromium workflows against the production preview   |

Close any separate preview server on port 4173 before running the browser suite. On Linux runners that need browser system packages, use `pnpm exec playwright install --with-deps chromium`.

`src/domain` contains task, date, and import rules. `src/storage` contains the IndexedDB adapter and workspace hook. The app and components present the planner and controls. `tests` contains domain and persistence tests, plus browser workflows.

The static output is in `dist/`. Keep its generated `THIRD-PARTY-LICENSES.md` when serving or distributing the build. See the [Vite static deployment guide](https://vite.dev/guide/static-deploy.html) for hosting details. The GitHub workflow runs verification only.
