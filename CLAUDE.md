# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Good-Habits is a habit-formation PWA. It is plain HTML/CSS/JS with **no build step, no framework, and no dependencies**. Scripts are ES5-style IIFEs that attach a single global each (`window.GH_*`). Data is stored only in the browser (`localStorage`); there is no backend and no network calls except Google Fonts.

Specs live in [plan.md](plan.md) (behavior), [content/messages.md](content/messages.md) (display text), and [mockups/](mockups/) (Claude Design `.dc.html` files — visual reference for UI and badges).

## Running and deploying

- **Local**: `python -m http.server 8000` then open `http://localhost:8000`. The Service Worker (offline cache, home-screen install) does **not** run from `file://` — it needs an `http(s)` origin or `localhost`.
- **Production**: GitHub Pages serves the `main` branch root at <https://mtateishi-92.github.io/good-habits/>. `git push` to `main` triggers an automatic rebuild (~30s). `.nojekyll` keeps files served as-is.
- The site is served from a **subpath** (`/good-habits/`), so every asset reference must stay **relative** (`css/style.css`, `./index.html`, `sw.js`) — never root-absolute (`/css/...`).
- **After changing ANY asset** (JS, CSS, HTML, an icon PNG — anything in `CORE_ASSETS`): bump `CACHE_NAME` in [sw.js](sw.js) (e.g. `good-habits-v1` → `v2`) and keep the `CORE_ASSETS` list in sync. The Service Worker is cache-first, so without a new `CACHE_NAME` installed clients keep serving the stale copy indefinitely.
- **App icons**: edit [icons/gen_icon.py](icons/gen_icon.py) (or `icons/icon-512.svg`), then `cd icons && python gen_icon.py` (requires Pillow) to regenerate the four PNGs.

There are no tests and no linter.

### How updates reach installed clients

- The browser re-installs the Service Worker only when **`sw.js` itself is byte-different** from the cached copy. Changing `CACHE_NAME` is what makes that happen and also triggers `install` → re-fetch all `CORE_ASSETS`, then `activate` → delete the old cache. `skipWaiting()` + `clients.claim()` mean it takes roughly **two app restarts** to switch over (one to install, one to show).
- The **home-screen launcher icon** is outside the Service Worker's control — it is captured from `manifest.json` at install time. Android/Chrome refreshes it lazily (can take days); iOS/Safari never refreshes it. Only uninstall + reinstall changes it immediately. Data survives a reinstall as long as the origin and the `goodHabbits.state.v1` key are unchanged.
- The runtime `fetch` handler ([sw.js](sw.js)) caches every successful GET forever, including cross-origin/opaque responses (Google Fonts). There is no cache expiry or size cap.

## Architecture

### Single page, script-order-dependent globals

[index.html](index.html) contains every screen as a `<section class="screen">`; navigation just toggles the `.active` class. Scripts load in a fixed order and each depends on globals defined earlier:

```
icons.js → content.js → badges.js → storage.js → logic.js → ui.js → app.js
```

### Layer discipline (important)

- **`GH_STORAGE`** ([js/storage.js](js/storage.js)) — `load()`/`save()`/`migrate()` against localStorage key `goodHabbits.state.v1`, plus date-key helpers and backup `serialize()`/`parseBackup()`. `defaultState()` is the schema of record. `parseBackup()` accepts both the `{ app, schema, state }` wrapper and a bare state object, then runs it through `migrate()`.
- **`GH_LOGIC`** ([js/logic.js](js/logic.js)) — **the only place `state` is mutated.** Functions take `state` and mutate it in place, returning info the caller needs for UI reactions.
- **`GH_UI`** ([js/ui.js](js/ui.js)) — renders from `state`, never mutates it. Escapes user text via `esc()`.
- **`GH_CONTENT` / `GH_BADGES` / `GH_ICONS`** — static data only.
- **`app.js`** — one IIFE owning the single `state` object. Handles clicks via **event delegation on `document`** (dispatch on `data-action` / `data-nav-target` / `data-*` attributes). Every interaction follows the same shape: `LOGIC.*(state, ...)` → `persist()` → `UI.render*(state)`.

### Domain model

- **App day vs calendar day**: settings `resetHour` (0–4) shifts the day boundary. `STORAGE.appDayKey()` returns the `YYYY-MM-DD` key for "today" in app terms; all history/streak logic uses this, not raw dates.
- **Rollover**: `LOGIC.runRollover(state, now)` runs on **every app open**. It walks each app-day between `meta.lastRolloverDay` and today, writing `{done, total}` into `state.history[dayKey]`, resetting `doneToday`, and zeroing `currentStreak` for habits not completed that day.
- **Two independent counters per habit**:
  - `totalCompletedDays` — cumulative; counts *down* toward `targetDays`; a missed day does not reduce it (you just don't progress).
  - `currentStreak` — consecutive app-days; resets to 0 on any missed day.
- **Completion**: when `totalCompletedDays >= targetDays`, the habit is deleted and a celebration fires (`toggleHabitDone` returns `achieved`).
- **Courses** (`GH_CONTENT.CATEGORIES`): `easy`=21, `medium`=90, `hard`=180, `test`=1 days.
- **Badges**: `state.progressFacts` accumulates monotonic facts (`bestStreakEver`, `achievedTiers`, `maxSimultaneousActive`, …). Each badge in [js/badges.js](js/badges.js) is `{ condition(facts), progress(facts) }` — pure functions over `progressFacts`. `LOGIC.checkBadges` runs after every toggle; newly earned badges surface in the celebration overlay.

### Keeping content in sync

`js/content.js` messages/praise must match [content/messages.md](content/messages.md). `js/badges.js` conditions/tiers must match the badge spec in [plan.md](plan.md). These are maintained by hand.

## Known constraints (by design, do not "fix" without a backend)

- **No OS notifications at all.** A backend-less PWA cannot do scheduled push, and timer-based reminders only run while the app is foregrounded, so they were removed. All nudging is in-app only: the "missed yesterday" banner shown on next open (`state.settings.notifySkipped`, handled in [js/logic.js](js/logic.js) + rendered by `GH_UI`). Do not reintroduce the `Notification` API without a Web Push backend.
- Data is device-local; clearing site data erases all records. Backup/restore is manual via **Settings → データのバックアップ** (JSON file download, clipboard copy, file/paste restore); restore fully replaces the current state. There is no automatic sync. End-user instructions live in [how_to_use.md](how_to_use.md).
