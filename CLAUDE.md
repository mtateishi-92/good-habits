# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Good-Habits is a habit-formation PWA. It is plain HTML/CSS/JS with **no build step, no framework, and no dependencies**. Scripts are ES5-style IIFEs that attach a single global each (`window.GH_*`). Data is stored only in the browser (`localStorage`); there is no backend and no network calls except Google Fonts.

Specs live in [plan.md](plan.md) (behavior), [content/messages.md](content/messages.md) (display text), and [mockups/](mockups/) (Claude Design `.dc.html` files — visual reference for UI and badges).

## Running and deploying

- **Local**: `python -m http.server 8000` then open `http://localhost:8000`. The Service Worker (offline cache, home-screen install) does **not** run from `file://` — it needs an `http(s)` origin or `localhost`.
- **Production**: GitHub Pages serves the `main` branch root at <https://mtateishi-92.github.io/good-habits/>. `git push` to `main` triggers an automatic rebuild (~30s). `.nojekyll` keeps files served as-is.
- The site is served from a **subpath** (`/good-habits/`), so every asset reference must stay **relative** (`css/style.css`, `./index.html`, `sw.js`) — never root-absolute (`/css/...`).
- **After changing any JS or CSS**: bump `CACHE_NAME` in [sw.js](sw.js) (e.g. `good-habits-v1` → `v2`) and keep the `CORE_ASSETS` list in sync, or clients keep serving the stale cached copy.
- **App icons**: edit [icons/gen_icon.py](icons/gen_icon.py) (or `icons/icon-512.svg`), then `cd icons && python gen_icon.py` (requires Pillow) to regenerate the four PNGs.

There are no tests and no linter.

## Architecture

### Single page, script-order-dependent globals

[index.html](index.html) contains every screen as a `<section class="screen">`; navigation just toggles the `.active` class. Scripts load in a fixed order and each depends on globals defined earlier:

```
icons.js → content.js → badges.js → storage.js → logic.js → notifications.js → ui.js → app.js
```

### Layer discipline (important)

- **`GH_STORAGE`** ([js/storage.js](js/storage.js)) — `load()`/`save()`/`migrate()` against localStorage key `goodHabbits.state.v1`, plus date-key helpers. `defaultState()` is the schema of record.
- **`GH_LOGIC`** ([js/logic.js](js/logic.js)) — **the only place `state` is mutated.** Functions take `state` and mutate it in place, returning info the caller needs for UI reactions.
- **`GH_UI`** ([js/ui.js](js/ui.js)) — renders from `state`, never mutates it. Escapes user text via `esc()`.
- **`GH_CONTENT` / `GH_BADGES` / `GH_ICONS`** — static data only.
- **`GH_NOTIFY`** ([js/notifications.js](js/notifications.js)) — 30-minute idle reminder; OS `Notification` when granted, otherwise an in-app toast callback.
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

- Exact-time notifications (e.g. "notify at 10:00 the day after a miss") are impossible in a backend-less PWA. The app uses an in-app banner on next open instead.
- `new Notification()` is unsupported in some mobile browsers → falls back to toast only.
- Data is device-local; clearing site data erases all records. No export/import yet.
