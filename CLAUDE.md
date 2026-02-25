# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web proxy application built on [MercuryWorkshop Scramjet](https://github.com/MercuryWorkshop/scramjet), disguised as "Percy Julian Encyclopedia." Intended for deployment on an Ubuntu server behind nginx. Currently in local development/testing phase.

## Commands

- **Start dev server:** `npm start` (runs on port 8080 by default, or `PORT=3000 npm start`)
- **Install dependencies:** `npm install`

There are no test, lint, or build commands — this is a vanilla JS project with no build step.

## Architecture

### Server (`src/index.js`)

Fastify HTTP server with a custom `serverFactory` that:
- Sets COOP/COEP headers on every response (required for SharedArrayBuffer, which scramjet needs)
- Routes WebSocket upgrades on `/wisp/` to the Wisp server (the proxy transport layer)
- Binds to `127.0.0.1` only (localhost) — intended to sit behind nginx in production
- Serves four static roots:
  - `/` → `public/` (frontend)
  - `/scram/` → scramjet client-side files
  - `/libcurl/` → libcurl-transport WASM files
  - `/baremux/` → bare-mux worker files

**Authentication:** Password-gated via `@fastify/session` + `@fastify/cookie`. A `preHandler` hook redirects unauthenticated requests to `login.html`. Login is `POST /api/login` with a JSON body `{ password }` checked against `SITE_PASSWORD` from `config.js`. Public paths exempt from auth: `/login.html`, `/index.css`, `/favicon.ico`, `/api/login`.

**Wisp config:** DNS set to Cloudflare (`1.1.1.1`, `1.0.0.1`), UDP streams disabled, logging off.

**404 handler:** Serves `public/404.html` for unmatched routes.

### Frontend (`public/`)

All vanilla JS, no framework, no bundler. Key pages:

- **`login.html`** — password form. On success, opens the main app in an about:blank tab (iframe pointing back to origin), then shows a "logged in" message.
- **`index.html`** — main proxy page. Script load order matters:
  1. `scramjet.all.js` and `baremux/index.js` — loaded in `<head>` (global `$scramjetLoadController` and `BareMux`)
  2. `register-sw.js` — registers `sw.js` as a service worker (deferred)
  3. `search.js` — URL/search query parser (deferred)
  4. `index.js` — main app logic: initializes `ScramjetController`, sets up `BareMux` connection to wisp, handles form submission to proxy URLs (deferred)
- **`about_us/`** — Cookie Clicker game, disguised as "About Us". Opened via the About Us button using the same about:blank iframe technique.
- **`404.html`** — simple error page.

### Proxy Flow

Form submit → register service worker → set libcurl transport with wisp WebSocket URL → `scramjet.createFrame()` → `frame.go(url)` renders proxied content in a full-viewport iframe.

### Key Dependencies

| Package | Role |
|---|---|
| `@mercuryworkshop/scramjet` | Core proxy rewriter (service worker + client) |
| `@mercuryworkshop/bare-mux` | Transport abstraction layer |
| `@mercuryworkshop/libcurl-transport` | WASM-based network transport |
| `@mercuryworkshop/wisp-js` | Wisp protocol server (WebSocket-based proxy protocol) |
| `@fastify/cookie` | Cookie parsing for session management |
| `@fastify/session` | Server-side session store (random secret, 5-hour expiry) |
| `ws` | WebSocket library (used by wisp-js) |

## Reference Repos

@/home/plein/scramjet
@/home/plein/Scramjet-App
- `/home/plein/Scramjet-App` — official Scramjet demo app (reference implementation)
- `/home/plein/scramjet` — scramjet source code and documentation

Use Scramjet-App as the primary reference for patterns and API usage. Consult the scramjet source for internals and undocumented behavior.

## Notes

- The frontend is meant to be customized freely — the "Percy Julian Encyclopedia" theming is intentional disguise.
- **about:blank iframe pattern:** Both the login redirect and About Us button open content in an `about:blank` tab with a full-viewport iframe pointing back to the origin. This makes the browser tab show "about:blank" in the address bar.
- Service workers only register on `https://` or `localhost`/`127.0.0.1` over HTTP.
- `config.js` exports `SITE_PASSWORD` — the login password. A `config.example.js` template is provided with the value `"changeme"`. The real `config.js` is gitignored.
- The project uses ES modules (`"type": "module"` in package.json).


