# Chalk Talk — project context for Claude

Read this first. Then open only the files the task needs. Do not read the whole repo.

## What it is
Mobile-first PWA for logging and analysing 9-ball matches between two players on one phone, plus a shared shot catalogue. Local-first (IndexedDB), no backend; syncs to a private GitHub repo. Goal: diagnostic, traceable stats (run-out from chance, balls run, break analysis, rating), not gamification.

## Architecture
- React 18 + TypeScript + Vite + vite-plugin-pwa. Dexie (IndexedDB). No server, no auth, no tests.
- **Event log, not stored state.** Breaks and visits are saved as records; rack number, score, table (balls left), shooter and phase are *derived* by replaying them (`engine.ts`). Stats (`stats.ts`) and rating (`rating.ts`) are also computed from the records every time. Never store derived values.
- All writes go through `save(type,d,id?)` / `drop(id)` (soft delete) in `db.ts`; reads via `ofType()` or `db.recs` + `useLiveQuery`.
- Sync (`sync.ts`) runs in the browser against the GitHub API with a token in localStorage.

## Key files (src/)
| File | Role |
|---|---|
| `db.ts` | Dexie table `recs`, `save`, `drop`, `ofType`. Record = `{id,type,u,dirty,del,d}` |
| `engine.ts` | `derive(players,events)` → rack, table, scores, shooter, first-shot flag, phase, breaker, problem balls |
| `Live.tsx` | Live session: `BreakForm`, `VisitForm` (incl. flag-shot modal), rack log, `line()` text formatter, undo/end session |
| `photo.ts` | `shrink(file)` → small JPEG data URL |
| `delta.ts` | Recent-change helpers: `periods` (latest 4 vs previous 4 completed sessions, needs 8), `ppDelta` (pp change, hidden if either side <5 observations) |
| `Photo.tsx` | Photo thumbnail, tap for full-screen view |
| `stats.ts` | `walk()` replays a session (gives each visit its starting table); `playerStats`, `breakStats` |
| `rating.ts` / `ratingConfig.ts` | Six attribute scores, shrinkage, 0–1000 rating, ranks. **All tunables live in ratingConfig** |
| `Review.tsx` | Review → Players (rating card, radar, graphs) and Breaks |
| `History.tsx` | Match history, edit session details, delete session/rack |
| `Shots.tsx` | Shot catalogue list/filters, SVG diagram editor, `measure()` (ghost ball, cut angle, distances), `title()` (derived per-tag numbering), exported `Table`/`Tip`/`ShotCard` |
| `Decks.tsx` | Decks: list, detail (shots, per-player stats, progress chart, history + delete), editor; `deckShots()` resolves membership |
| `Practice.tsx` | Practice setup (player, venue, attempts/shot) and run (Made/Missed, undo, end, summary, mastery + why-now) |
| `practice.ts` | `shotStats` (per player+shot, derived), `mastery`/`level`, adaptive `weigh`/`pickNext`, **all tunables in `PC`** |
| `sync.ts` | GitHub sync, file layout below |
| `App.tsx` | Tabs (Play, Review, Shots, More), Shots tab = Shots \| Decks switch, Players, Session start, Sync screens |
| `theme.ts`, `Settings.tsx` | CSS-variable theming, presets, status-bar colour |
| `Avatar.tsx`, `Cropper.tsx` | Player photos (192px JPEG data URL stored in the player record) |

## Data model (record `type` → payload `d`)
- `player` {name, archived, pic?} · `venue` {name}
- `session` {name?, players:[idA,idB], solo?, venueId, venue(name snapshot), table, start, end?}
- `break` {t, s(session id), rack, by, z(0–6 L3..R3), ct(1–8 eighths of overlap, 8=straight), cf, side(0 L/1 R), spd(0–2), tip[x,y], one(0 pocketed/1 high/2 low/3 other), drops[], scratch, nine(=golden break), next, skip?}
- `visit` {t, s, rack, by, open('Easy'|'Hard'|'None'), board('Clear'|'Problem'), prob[], res, potted[], oo[], low, cause, fl[], fg, won, first, push, next, runout}
  - `res`: Won rack · Missed · Safe played · Escape hit · Foul · Push out
- `flag` {t, s, rack, visit(id of the visit being logged), by(player id, base), venueId, venue, table(balls up), open, note, photo?(≤720px JPEG data URL), status('pending'|'converted'; missing = pending), shot?(id of the shot it became)}. A flag is a bookmark, not a shot: saved immediately from the visit form (Flag shot → note/photo optional → Save), listed in Shots → ⚑ Flagged (n), converted via Create shot (opens the normal editor; sets `status:'converted'` + `shot`, keeps the flag).
- `shot` {no, tag, name, by, balls[{n,x,y} inches; n=0 is cue ball], target, pocket(0–5), path[] (cue ball route after contact), tip, pw(0–6; legacy `speed` maps via `pw()`), leave{x,y,tol}, note}. The per-tag number ("Spot Shot #3") is **derived** in `title()` (rank by `no`, then id, within tag, case-insensitive); it is a label, never an identity. Attempts reference the shot **id**.
- `deck` {name, kind('smart'|'custom'), rule{tag,by}, shotIds[], c}. Smart = tag and/or shot-by match (no rule = whole catalogue); custom = explicit ids. Resolved at read time, nothing copied; a shot can be in many decks.
- `practice` {deck, deckName, by, venueId, venue(name snapshot), per, start, end?} · `attempt` {t, s(practice id), shot(id), by, n(1..per), ok}. Attempts are append-only; undo/delete = soft delete. Practice stats are **per player + shot**, derived from attempts every time; never stored.
- Ordering of events: sort by `d.t` (fallback `u`). Legacy fields exist in old test data (`rating`, `cut`, `prefill`, "Pocketed anyway") — keep reading them gracefully.

## Business rules to preserve
- A rack starts with a **break record** (or a skipped break). Who shoots first is stored in `next` and derived from the break: scratch or nothing dropped → opponent; ball dropped without scratch → breaker continues; golden break (9 down) → rack won by breaker.
- Breaker defaults to previous rack winner.
- **Push-out** only on the first visit after the break; potted balls stay down; the 9 is respotted (locked, cannot win the rack). Visit stores `push`; follow-up decides who shoots.
- Visit = one turn at the table. Required input: opening shot (Easy / Hard / None) + outcome. **Cause (Pot/Position/Decision/Other) is mandatory on Missed/Foul for Easy/Hard openings.** Board state Clear/Problem with problem balls, which **carry over** to later visits while still on the table.
- Table strip: tap the last ball potted → everything lower on the table fills in; tap a potted ball to take it back (handles combos/skips). Rack is won when the 9 is potted (`runout` = every ball potted in order).
- Safeties: "held" is **derived** from the opponent's next opening (None/Hard = held); not user-editable.
- Fluke = visit-level list of balls (optional ball). Combos/carom are deliberately **not** tracked as a stat.
- Break analysis: left and right are **never pooled**; judge breaks by 1-ball pocketed, other droppers, scratch/golden, and the opening shot of the next visit.
- Every stat shows its n; rows with n<5 are faded. Rating uses all sessions; trends compare last 4 vs previous 4 sessions.
- Rating has **no shrinkage toward 50**: `adj` = raw attribute score; attributes with n=0 are left out and weights renormalised (no data at all = 500). Confidence (0–1) = Σ weight × min(1, n/PROV) over the six attributes, labelled Low <40% / Medium <75% / High (`CONF` in rating.ts; move to ratingConfig). The rating delta compares only attributes that have data in both periods (`rating(a, only)`). Attribute weights/anchors are placeholders pending real data. Ranks F D C B A S SS SSS (no +/−), SSS uncapped.
- Undo = soft-delete the last event. Deleting a rack renumbers later racks.
- Recent change (Review): arrows compare the latest 4 vs the 4 before, completed sessions only (`s.d.end`), respecting the session-type filter; stats are recomputed over each combined period (never averaged per session); needs ≥8 completed sessions. Rating delta uses the existing `rating(attrs())` per period. Arrow = direction the number moved, green = better (scratch rate is lower-is-better).
- Break power: stored as `spd` 0–2, shown on the shared 7-step `Power` bar (exported from Shots.tsx) as levels 4–6 (`POW[4+spd]`: Firm, Hard, Max power); lower steps are visible but not selectable. Board state is stored as 'Clear' and displayed as 'Clean' in the visit form.
- Solo practice session (`solo:true`): you play both sides. Seat 2 is a virtual player id `<id>~2` so the engine/Live treat it as two players unchanged; **always resolve player ids through `id.split('~')[0]`** when looking up a player (App, History do). Stats/rating use `isMe(by,pid)` (stats.ts) so both seats count as the player; break/next-visit comparisons use the break record's own `by` (not `pid`); rack results are skipped for solo (always "won"). Review has an All / Matches only / Solo only filter.
- Practice: a shot is shown for `per` attempts in a row, then the next shot is picked. Ending early keeps logged attempts; unattempted shots are not recorded; an empty session is dropped. Mastery = last 10 attempts smoothed toward 50%; selection weight = (floor + need + staleness) × cooldown, never the same shot twice in a row (see `PC`).
- Shot difficulty/measurements are derived from the diagram (ghost ball from target ball + pocket; distances in diamonds, 1 diamond = 12.5"); never typed in.

## UI/UX principles
- One-handed, minimal taps at the table; phone portrait first, unfolded/landscape is also used for review.
- Bottom icon nav in portrait, left rail in landscape. Filters are dropdowns (many players/tags expected), not chips.
- Newest first everywhere. Confirm destructive actions. Clean, functional, data-focused; the rank/radar card is the one deliberate game-style element — keep it restrained.
- Theme via CSS variables (`--bg --panel --ink --mute --cloth --amber --nav --chip --line`); user can pick colours/presets. No light/dark selector for now.

## Conventions
- Dense, compact TypeScript (short names, one-line handlers, liberal `any`); single `styles.css`; shared small components inline in the screen file. Match the surrounding style.
- Reactive reads with `useLiveQuery`; local React state for forms; no global store.
- No test framework. Verify with `npm run typecheck` and `npm run build`, then on a phone.

## Sync / deployment
- Site: GitHub Actions (`.github/workflows/deploy.yml`) builds with Vite (`base:'./'`) and deploys to GitHub Pages from `main`. PWA, auto-update.
- Data: separate **private** repo, files `players.json` (players+venues), `sessions/<id>.json` (session + its breaks/visits/flags), `catalogue.json` (shots + decks), `practice/<id>.json` (a practice session + its attempts). Each file `{recs:[…]}`, last-write-wins by `u`, per-file sha tracked in localStorage (`ct.shas`, `ct.seen:*`). Token (fine-grained, Contents RW) lives only in localStorage. Old `records/` folder is obsolete.
- Photos: profile pics are small data URLs inside player records (synced). Flag photos are data URLs inside the flag record but **stripped on push and kept on pull** (`sync.ts`), so they stay on the device that took them.

## Known issues / debt
- Much of the code was written without being compiled in the authoring environment; run `npm install && npm run typecheck && npm run build` before trusting it and fix type errors.
- No automated tests. Rating anchors/weights unvalidated; practice tunables (`PC`) unvalidated. Shot `no` can repeat if two phones create shots offline (harmless: ties break by id).
- Unused leftovers: `COLORS` in `App.tsx`, `sha` field in `Rec`.

## Status
See `docs/PROJECT_STATE.md`.
