# Entrecore Demo Environment

A version of the Entrecore web app that runs with **no backend**. Every API call, socket event and workflow run is answered in the browser from fixed data, so:

- anyone can explore it freely from a link, with no login or setup;
- the same click always gives the same result;
- no real customer data is involved.

It has two jobs:

1. **Show prospects the platform**: today's product, plus the ideal version we're building toward.
2. **Act as the roadmap.** Each screen records whether it's live, partial or roadmap-only, and the data it uses is the API spec for the backend. A screen moves to the production app once its backend is real.

Started from the production frontend (`entrecoreray` FE, `origin/dev` @ `fee7445`, 2026-10-28).

## Run it

```bash
npm ci --legacy-peer-deps
npm run dev            # http://localhost:3000. You're signed in as the demo user automatically
```

Open any page with `?view=roadmap` to see the internal roadmap view. `?view=demo` hides it again.

## How it works

```
app code ──axios / fetch──▶ demo/install.ts ──▶ demo/server ──▶ 1. handler   (demo/server/handlers, state in demo/server/db.ts)
                                                              2. recording (demo/fixtures/recorded, captured from staging)
                                                              3. empty 200, logged as "unhandled"
Socket.IO / WebSocket ◀── demo/realtime (scripted events, e.g. agent replies, run progress)
```

| Path                       | What it is                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `demo/install.ts`          | Routes all axios and API `fetch` traffic to the demo server. Imported first by `app/config/axios.ts` and `app/config/session.ts`. |
| `demo/server/`             | Router, in-memory database (resets on reload) and one handler file per product area.                                              |
| `demo/realtime/`           | Fake Socket.IO client and WebSocket. Handlers push events with `pushSocketIO` / `pushWorkflow` / `playTimeline`.                  |
| `demo/data/`               | The demo tenant: **Larkspur Holdings**, a made-up company. All dates are relative to page load (`ago({ days: 3 })`).              |
| `demo/fixtures/recorded/`  | Responses recorded from staging. Generated; don't edit by hand.                                                                   |
| `demo/roadmap/registry.ts` | Live / partial / roadmap status for each screen, shown in the roadmap view.                                                       |
| `components/demo/`         | Demo-only UI: auto sign-in and the roadmap view.                                                                                  |
| `docs/demo/`               | Page structure (IA), and fixes to bring back to the production app.                                                               |

Changes to the original app code that exist only for the demo are kept small and marked with a `Demo:` comment (`grep -rn "// Demo:" app components contexts`). Bugs fixed here that also exist in production are listed in [docs/demo/UPSTREAM_FIXES.md](docs/demo/UPSTREAM_FIXES.md).

## Adding a screen

1. Open the page with `?view=roadmap`. The roadmap view lists every API call on it that the demo doesn't answer yet.
2. Answer those calls, either by
   - **recording** them from staging (below), when the real API already returns what you want to show; or
   - **writing a handler** in `demo/server/handlers/<area>.ts`, when the response must react to the visitor (create, edit, chat), is scripted (runs, agent replies), or is a roadmap feature the backend doesn't have yet.
3. Add the screen to `demo/roadmap/registry.ts` with its status and the backend endpoints it relies on.

Keep the demo the same on every visit: no `Math.random()` or wall-clock data in fixtures. Use `ago()` for dates and `newId()` for ids.

## Recording from staging

Only record from a made-up demo company, never a real tenant.

1. On staging, open DevTools → Network, click through the screens, then right-click → **Save all as HAR (sanitized)**.
2. Import, mapping the staging company and user ids to the demo ones in `demo/data/tenant.ts`:

```bash
node scripts/import-har.mjs ~/Downloads/staging.har catalog \
  --map <staging-company-id>=0b6f2a1e-4c1d-4b8e-9a51-7d2c9f3e1a01 \
  --map <staging-user-id>=5c8e3d72-1f4a-4e2b-8c6d-3a9b7e0f2d11
```

The script replaces signed document URLs and lists every email address it finds. Check that list before committing.

## Deploy

Netlify, from the CLI. `netlify.toml` sets the build and the (deliberately unreachable) API URLs; the site needs no secrets. Pages send `X-Robots-Tag: noindex`.

```bash
npm ci --legacy-peer-deps && npm run build    # check it builds
netlify link                                  # once, to the demo site
netlify deploy --build --prod
```

Coding standards inherited from the production app: [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md).
