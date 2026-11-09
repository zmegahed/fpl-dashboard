# Touchline

A practical Fantasy Premier League workspace, rebuilt from the original FPL dashboard. The design pairs forest green, soft lime and a quiet neutral canvas with a weekly planning workflow.

## Run locally

Node.js 20.19+ or Node.js 22+ is recommended.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. One process serves the React frontend and the FPL API proxy. There is no Python server to start, no API key and no account registration.

```sh
npm test
npm run build
```

## What works

- Live official FPL players, current prices, ownership, availability and injuries.
- Current gameweek average and next deadline in the visitor's local time.
- Search by player or club; position, budget, club and availability filters; numeric sorting and pagination.
- Saved watchlists, CSV export and up to three players compared side by side.
- Five-gameweek fixture planner using official difficulty ratings, with blank and double gameweeks represented explicitly.
- Fifteen-player squad planning with the £100m budget, positional requirements, duplicate prevention and three-player club limit enforced.
- Auto-fill that retains existing picks and fills an affordable squad around them.
- Player detail dialogs, keyboard focus handling, responsive navigation, browser back/forward and mobile player cards.
- Season-scoped watchlists and squads in localStorage; no cloud sync. A storage warning appears when saving is unavailable.
- Included real-data snapshot from 9 November 2026 UTC (8 November in US Eastern time) and a newer local cache as fallback. Snapshot/live labels and retrieval timestamps are explicit.

## Ranking and limitations

The form shortlist uses available players with 270+ minutes and a scheduled fixture next gameweek. Its sorting score is:

`0.55 × form + 0.30 × points_per_game + 0.15 × (6 − mean difficulty of fixtures in next 3 gameweeks)`.

This score is a heuristic, not a prediction of points. Fixture difficulty is the official FPL team-level rating. A team with no scheduled games is not shown as having an easy run. Auto-fill builds a cheap valid squad then iteratively upgrades unlocked picks using the score; it does not claim global optimization or future returns.

The squad builder is for planning at current purchase prices. It does not import or change an official team, calculate selling prices, transfer hits, choose a starting XI, or submit a captain. Complete those actions on official FPL. Watchlists and squads persist only in this browser. Comparisons last for the current visit.

The original hard-coded three-season analysis is archived under `legacy/` and is not served. It was replaced by current-season decision tools rather than presenting mixed, incorrectly dated seasons as reliable historical analysis.

## Data and deployment

The server requests only these public official endpoints:

- https://fantasy.premierleague.com/api/bootstrap-static/
- https://fantasy.premierleague.com/api/fixtures/

Requests time out after 12 seconds, successful responses are cached for five minutes per server instance, and concurrent requests share the in-flight fetch. The frontend times out after 16 seconds and retains the last usable data. Refresh is on page load or the refresh button; this is not a continuously streaming feed.

- **Vercel:** import this folder. `vercel.json` points the frontend at `dist/client`; `api/dashboard.js` is the Node serverless API. No secrets are needed.
- **Cloudflare Worker / Sites:** `npm run build` also creates `dist/server/index.js`, a self-contained Worker containing the React assets and API proxy. `.openai/hosting.json` belongs to the private Site associated with this project.
- **Static hosts:** `dist/client` works with the dated snapshot. Live refresh needs `/api/dashboard` hosted on a server; static hosting alone cannot provide that endpoint. GitHub Pages also needs the appropriate Vite base path.

Fonts are loaded from Google Fonts with a system sans-serif fallback. No analytics or tracking are included. This is an independent companion, not an official Premier League product.

## Validation

`npm test` checks squad legality, duplicate/position/club/budget constraints, preservation of locked picks, impossible-squad handling, season detection, and blank/double fixtures. Desktop and 390px mobile layouts were checked in the browser. Search, zero-result filters, watchlist persistence, comparison, player dialogs and auto-fill were exercised.

## Project structure

- `src/App.jsx` — interface and interaction flows
- `src/index.css` — responsive visual system
- `src/data/model.js` — official-data normalization and squad rules
- `src/data/snapshot.json` — dated real-data fallback
- `server/data.js` — bounded, cached official API requests
- `api/dashboard.js` — Vercel adapter
- `scripts/build-worker.mjs` — self-contained Worker packaging
- `tests/model.test.js` — domain logic checks
- `legacy/` — unserved original backend for reference
