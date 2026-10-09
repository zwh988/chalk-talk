# Chalk Talk — project context for Claude

Read this first. Then open only the files the task needs. Do not read the whole repo unless explicitly asked.

## What it is

Mobile-first PWA for logging and analysing 9-ball matches between two players on one phone, plus a shared shot catalogue. Local-first (IndexedDB), no backend; syncs to a private GitHub repo.

Goal: diagnostic, traceable stats (run-out from chance, balls run, break analysis, rating), not gamification.

## Architecture

* React 18 + TypeScript + Vite + vite-plugin-pwa.
* Dexie (IndexedDB).
* No server, no auth, no tests.
* Event log, not stored state. Breaks and visits are saved as records; rack number, score, table (balls left), shooter and phase are derived by replaying them (`engine.ts`). Stats (`stats.ts`) and rating (`rating.ts`) are also computed from the records every time. Never store derived values.
* All writes go through `save(type,d,id?)` / `drop(id)` (soft delete) in `db.ts`; reads via `ofType()` or `db.recs` + `useLiveQuery`.
* Sync (`sync.ts`) runs in the browser against the GitHub API with a token in localStorage.

## Key files (src/)

| File                            | Role                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db.ts`                         | Dexie table `recs`, `save`, `drop`, `ofType`. Record = `{id,type,u,dirty,del,d}`                                                                                                                               |
| `engine.ts`                     | `derive(players,events)` → rack, table, scores, shooter, first-shot flag, phase, breaker, problem balls                                                                                                        |
| `Live.tsx`                      | Live session: `BreakForm`, `VisitForm` (incl. flag-shot modal), rack log, `line()` plain-text formatter (also `lineP` parts + `Ln` component: bold result, ball glyph for the ball missed; used by the rack log and History), undo (shows "Last logged: …") and end session (always opens a confirm sheet; offers sync first if unsynced) |
| `photo.ts`                      | `shrink(file)` → small JPEG data URL                                                                                                                                                                           |
| `delta.ts`                      | Recent-change helpers: `periods` (latest 4 vs previous 4 completed sessions, needs 8), `ppDelta` (pp change, hidden if either side <5 observations)                                                            |
| `Photo.tsx`                     | Photo thumbnail, tap for full-screen view                                                                                                                                                                      |
| `ui.tsx`                        | Cross-screen overlay primitives: `Sheet` (bottom sheet), `ask(msg,okLabel)` / `tell(msg)` promise dialogs (replace `confirm`/`alert`), `<Dialogs/>` mounted once in `App`; `useBack(open,close)` back-stack hook + `Active` context (see UI/UX principles)                                      |
| `stats.ts`                      | `walk()` replays a session (gives each visit its starting table); `playerStats`, `breakStats`                                                                                                                  |
| `controlConfig.ts`              | `EARLY` thresholds for the initiative blocks (30 chances, 10 safeties, 10 hard shots, 10 lost-initiative visits before "Biggest leak"); below them a card gets an "Early read" pill |
| `control.ts`                    | `controlStats(pid,groups)`: initiative model for Review → Players (spec: `STATS_CONTROL_SPEC.md`). Pure, derived; every count is the list of records behind it. Opponent-based parts skip solo sessions; Scotch (`sp`/`bp`) records and push-out visits never count. Also feeds `rating.ts` (R1): adds `ball` (per-ball pot/position counts, Easy openings, solo included) and `escA` (escapes incl. solo) for the rating only. |
| `rating.ts` / `ratingConfig.ts` | Six attribute scores (Finishing, Potting, Position, Break, Defence, Decision), 0–1000 rating, ranks. Everything but Break is built from `controlStats`. All tunables (ATTRS, W, PROV, anchors `AN`/`RO`, `MINB`, `RANKS`, `CONF`) live in `ratingConfig`                                                                                                                     |
| `Review.tsx`                    | Review → Players (rating card with provisional rank + "Work on" line, radar with compare/legend, graphs) and Breaks; compact filter row; every card shows its scope (`CH`). Players order: rating card, Initiative, How the initiative was lost (`ControlCards`), Finishing (`FinishCard`, includes solo), Defence and Hard shots (`DefenceCard`/`HardCard`), then a "More detail" heading with Balls run and Lowest ball left. Everything opponent-based is hidden when there are no matches (e.g. "Solo only"). Tap to trace: every row, stacked-bar segment, legend item and rack tile opens a `Sheet` (state `tc`, helper `op(title,records,unit,tag?)`) listing the records behind the number, newest first, with date · opponent · rack and the `Ln` log line (small tag e.g. Won/Lost/Ran out); no deep link into History; Hard shots are descriptive only (header tag "Descriptive, no verdict")                                       |
| `History.tsx`                   | Match history: sessions grouped by month, scoreboard cards (winner emphasised, chevron), player/venue dropdown filters, expanded view with derived match summary (rows: Racks won, Break and run as ran/own breaks via `controlStats`, Won from chance, 1-ball on the break, Safeties held, Fouls; `Summary`, via `playerStats`/`breakStats`), edit details, delete session / rack (Delete rack is a real button) |
| `Shots.tsx`                     | Shot catalogue list/filters, SVG diagram editor, `measure()` (ghost ball, cut angle, distances), `title()` (derived per-tag numbering), exported `Table`/`Tip`/`Power`/`POW`/`ShotCard`/`tipLabel`             |
| `Decks.tsx`                     | Decks: list (cards with first-4-shot thumbnails (`Table small`), Start practice + last-practiced hint, resume banner for an unfinished run), detail (shots, per-player stats, progress chart, history + delete), editor; `deckShots()` resolves membership; owns the setup sheet / run state                                                                                     |
| `Practice.tsx`                  | `Setup` sheet (defaults from the latest practice record), run (sticky Made/Missed/Undo bar, End practice confirms, summary with Practice again, mastery + why-now, odds behind a tap); `unfinished()` = latest practice without `end` (empty ones older than a day ignored) drives the resume banner and the Train badge                                                                                                     |
| `practice.ts`                   | `shotStats` (per player+shot, derived), `mastery`/`level`, adaptive `weigh`/`pickNext`, all tunables in `PC`                                                                                                   |
| `sync.ts`                       | GitHub sync, file layout below                                                                                                                                                                                 |
| `App.tsx`                       | Tabs (Play, Review, Train, More; the Train tab = old Shots tab, internal key still `shots`; labelled icons with derived badges; Play and Shots stay mounted when hidden, Review and More remount), Train tab = Decks | Library switch (lands on Decks), Players, Session start (defaults derived from the latest session; first-run button opens More → Players), Sync screens                                                                                                       |
| `theme.ts`, `Settings.tsx`      | CSS-variable theming, presets, status-bar colour                                                                                                                                                               |
| `Avatar.tsx`, `Cropper.tsx`     | Player photos (192px JPEG data URL stored in the player record)                                                                                                                                                |

## Data model (record `type` → payload `d`)

* `player` `{name, archived, pic?}` · `venue` `{name}`

* `session` `{name?, players:[idA,idB], solo?, venueId, venue(name snapshot), table, start, end?}`

* `break` `{t, s(session id), rack, by, z(0–6 L3..R3), ct(1–8 eighths of overlap, 8=straight), cf, side(0 L/1 R), spd(0–2), tip[x,y], one(0 pocketed/1 high/2 low/3 other), drops[], scratch, nine(=golden break), next, skip?}`

* `visit` `{t, s, rack, by, open('Easy'|'Hard'|'None'), board('Clear'|'Problem'), prob[], res, potted[], oo[], low, cause, fl[], fg, won, first, push, next, runout}`

  * `res`: Won rack · Missed · Safe played · Escape hit · Foul · Push out

* `flag` `{t, s, rack, visit(id of the visit being logged), by(player id, base), venueId, venue, table(balls up), open, note, photo?(≤720px JPEG data URL), status('pending'|'converted'; missing = pending), shot?(id of the shot it became)}`.

  A flag is a bookmark, not a shot: saved immediately from the visit form (Flag shot → note/photo optional → Save), listed in Train → Flagged (n), converted via Create shot (opens the normal editor; sets `status:'converted'` + `shot`, keeps the flag).

* `shot` `{no, tag, name, by, balls[{n,x,y} inches; n=0 is cue ball], target, pocket(0–5), path[] (cue ball route after contact), tip, pw(0–6; legacy speed maps via pw()), leave{x,y,tol}, note}`.

  The per-tag number ("Spot Shot #3") is derived in `title()` (rank by `no`, then id, within tag, case-insensitive); it is a label, never an identity. Attempts reference the shot `id`.

* `deck` `{name, kind('smart'|'custom'), rule{tag,by}, shotIds[], c}`.

  Smart = tag and/or shot-by match (no rule = whole catalogue); custom = explicit ids. Resolved at read time, nothing copied; a shot can be in many decks.

* `practice` `{deck, deckName, by, venueId, venue(name snapshot), per, start, end?}` · `attempt` `{t, s(practice id), shot(id), by, n(1..per), ok}`

  Attempts are append-only; undo/delete = soft delete. Practice stats are per player + shot, derived from attempts every time; never stored. Editing a practice session (Decks → history → Edit: player, venue) rewrites `by` on the practice record and on all its attempts, since stats key off `attempt.by`.

* Ordering of events: sort by `d.t` (fallback `u`). Legacy fields exist in old test data (`rating`, `cut`, `prefill`, "Pocketed anyway") — keep reading them gracefully.

## Business rules to preserve

* A rack starts with a **break record** (or a skipped break). Who shoots first is stored in `next` and derived from the break: scratch or nothing dropped → opponent; ball dropped without scratch → breaker continues; golden break (9 down) → rack won by breaker.
* Breaker defaults to previous rack winner.
* Push-out only on the first visit after the break; potted balls stay down; the 9 is respotted (locked, cannot win the rack). Visit stores `push`; follow-up decides who shoots.
* Visit = one turn at the table. Required input: opening shot (Easy / Hard / None) + outcome. Cause (Pot/Position/Decision/Other) is mandatory on Missed/Foul for Easy/Hard openings. Board state Clear/Problem with problem balls, which carry over to later visits while still on the table.
* Table strip: tap the last ball potted → everything lower on the table fills in; tap a potted ball to take it back (handles combos/skips). Rack is won when the 9 is potted (`runout` = every ball potted in order).
* Safeties: "held" is derived from the opponent's next opening (None/Hard = held); not user-editable.
* Fluke = visit-level list of balls (optional ball). Combos/carom are deliberately not tracked as a stat.
* Break analysis: left and right are never pooled; judge breaks by 1-ball pocketed, other droppers, scratch/golden, and the opening shot of the next visit.
* Initiative model (`control.ts`): unit = the visit. Chance = Easy/Hard opening (not push). Per chance: **won** the rack, **held** the initiative (opponent's next opening Hard/None) or **lost** the initiative (next opening Easy); no next visit = pending, excluded. Safeties are graded only by the opponent's next visit (easy / hard / contained / forced escape, miss, foul). Hard-shot misses are descriptive, never an unforced error; unforced error = Easy opening + Missed/Foul + cause Pot/Position/Decision that cost the initiative. Break-and-run counts only from the player's own break; that first visit is left out of the run-out-by-length buckets (6+/3–5/1–2, by balls on the table at the start). Rack win % as breaker/receiver: matches only.
* Every stat shows its n; rows with n<5 are faded. Rating uses all sessions; trends compare last 4 vs previous 4 sessions.
* Rating has no shrinkage toward 50: `adj` = raw attribute score; attributes with n=0 are left out and weights renormalised (no data at all = 500). All attributes are clean/success rates (higher = better); initiative is not an input (error and defence rates already add up to it). Attributes (`rating.ts`, from `controlStats`; Scotch and push-outs excluded): **Finishing** = mean of per-length run-out scores (6+/3–5/1–2 balls, buckets with <`MINB`=5 chances left out; solo included; first visit after own break excluded) · **Potting** = made/(made+pot errors) per ball, Easy openings only (solo included) · **Position** = per ball, Easy openings only (every ball but the last counts as position kept; last ball counts kept only when the visit ended on a pot error) · **Break** = unchanged formula (any rack win on the breaker's next visit counts as break-and-run until the Break rework) · **Defence** = mean of forced-error rate, safe rate (1 − left easy) over resolved safeties (matches only) and escape success (solo included) · **Decision** = 1 − (all Easy-opening Decision errors + gambles lost)/resolved chances (matches only). Weights Finishing .25 · Potting .15 · Position .15 · Break .20 · Defence .15 · Decision .10; `PROV` [40,100,100,40,30,80]. Confidence (0–1) = Σ weight × min(1, n/PROV); `CONF` in ratingConfig holds the bands (Low <40% / Medium <75% / High) but only the 75% line is used in the UI. The rating delta compares only attributes that have data in both periods (`rating(a, only)`). Weights/anchors are uncalibrated placeholders. Ranks F D C B A S SS SSS (no +/−), SSS uncapped. The rank is a big block letter (`Rank` in `Review.tsx`, class `.rank` in `styles.css`) coloured by tier with fixed `--rk-*` tokens (F dull grey · D bronze · C silver · B gold · A platinum · S emerald · SS diamond blue · SSS prismatic magenta gradient; glow grows with tier; the UI shows letters only, no tier names). While confidence < 75% (`CONF[1][0]`) it is **provisional** = same letter at ~35% opacity, no glow, with a "Provisional" caption. Confidence is no longer displayed as a label/percent; it only drives the provisional state. Never use `-webkit-text-stroke`. The rating card header leads with a large avatar (88px) and the player name (18px), then scope, rating number and "N to <rank>". Terminology: the model is **initiative** (alpha/beta, who dictates the rack), not "control" (cue-ball position play); code identifiers (`control.ts`, `controlStats`, `ControlCards`) keep the old name. "Work on: <attribute>" = lowest `adj` among attributes with n ≥ PROV/2, shown only when at least two qualify; derived, never stored.
* Undo = soft-delete the last event. Deleting a rack renumbers later racks.
* Recent change (Review): arrows compare the latest 4 vs the 4 before, completed sessions only (`s.d.end`), respecting the session-type filter; stats are recomputed over each combined period (never averaged per session); needs ≥8 completed sessions. Rating delta uses the existing `rating(attrs())` per period. Arrow = direction the number moved, green = better (scratch rate is lower-is-better).
* Break power: stored as `spd` 0–2, shown on the shared 7-step `Power` bar (exported from Shots.tsx) as levels 4–6 (`POW[4+spd]`: Firm, Hard, Max power); lower steps are visible but not selectable. Board state is stored as `Clear` and displayed as `Clean` in the visit form.
* Solo practice session (`solo:true`): you play both sides. Seat 2 is a virtual player id `<id>~2` so the engine/Live treat it as two players unchanged; always resolve player ids through `id.split('~')[0]` when looking up a player (App, History do). Stats/rating use `isMe(by,pid)` (stats.ts) so both seats count as the player; break/next-visit comparisons use the break record's own `by` (not `pid`); rack results are skipped for solo (always "won"). Review has an All / Matches only / Solo only filter.
* Practice: a shot is shown for `per` attempts in a row, then the next shot is picked. Ending early keeps logged attempts; unattempted shots are not recorded; an empty session is dropped. Mastery = last 10 attempts smoothed toward 50%; selection weight = (floor + need + staleness) × cooldown, never the same shot twice in a row (see `PC`).
* Shot difficulty/measurements are derived from the diagram (ghost ball from target ball + pocket; distances in diamonds, 1 diamond = 12.5"); never typed in.

## UI/UX principles

* One-handed, minimal taps at the table; phone portrait first, unfolded/landscape is also used for review.
* Bottom icon nav in portrait, left rail in landscape.
* Filters are dropdowns (many players/tags expected), not chips.
* Newest first everywhere.
* Destructive actions: `.danger` styling + `await ask('…','Verb')` (never native `confirm()`/`alert()`; use `tell()` for notices).
* Overlays use `<Sheet>`.
* Back navigation: any screen opened on top of a root screen (More sub-page, deck detail/editor, shot editor, flagged list, practice setup/run, cropper, every `Sheet`/`ask`) calls `useBack(open, close)` from `ui.tsx`, so Android Back / iOS swipe closes it instead of leaving the app. `close` may return `false` (or a promise of false) to veto: the shot editor does that when there are unsaved changes (also on its ‹ button), the practice run asks before ending. In-app ‹ buttons just set state; the hook keeps history in sync. Call `useBack` before any early return. A `Sheet` without `onClose` swallows Back. Screens inside a hidden tab don't join the stack (`Active` context provided per tab in `App`).
* Nav badges (derived, never stored): dot on Play = a session without `end`; count on Shots = pending flags; count on More = `dirty` records (also shown on the Sync row). Each tab's scroll position is remembered in `App`.
* Review: filters are a compact row (player full width; window + type side by side, `.filt`). Each stats card header is `<CH t sub/>` with its scope ("Last 4 sessions" / "All time"); the rating card always says "All N sessions" (it ignores the window, not the type filter). Type options: All types / Matches only / Solo only. Radar: "Compare with…" sits above it, legend appears when comparing (solid = selected, dashed amber = compared). Trends line: "Trends unlock after 8 completed sessions (N more)" until `periods()` returns data. Chart text ≥12 viewBox units.
* History: cards show date/name, meta line, then one scoreboard row per player (winner of a finished match bold with a "Won" tag, loser muted; none for solo, ties, in-progress). Months are grouped under headers with a count. Filters are dropdowns (player, venue), each shown only if it has more than one option. Expanded: match summary (Scotch Doubles shows only racks because `playerStats` doesn't credit team visits; solo has one column and no rack result), then racks newest first. Not faded for n<5 (descriptive, n shown as w/n).
* Clean, functional, data-focused; the rank/radar card is the one deliberate game-style element — keep it restrained.
* Theme via CSS variables (`--bg --panel --ink --mute --cloth --amber --nav --chip --line`); user can pick colours/presets. No light/dark selector for now.
* Semantic colours are fixed tokens, not themeable (`--good --bad --warn`, defined in `styles.css`, absent from `theme.ts`): use them for better/worse/caution, never `--cloth`/`--amber`.
* Type scale `--fs-s/m/b/l/xl/n` = 12/14/15/18/22/30px, font `--font`; `h2` is styled (18px).
* Buttons: `.go` amber primary, `.ghost` solid-outline secondary, `.link` text, `.danger` modifier (red; `.go.danger` filled).
* Dashed border (`.chip.opt`) only means optional/add.
* Primary action on long forms (Live break/visit) goes in `<div className="stick">` as the last in-flow child of the card: sticky to the bottom of `main`. Ball tap strips use `.strip.t` + `.bt` (hit area = whole cell, circle is `::before`); the older `.b` may still be used elsewhere (e.g. Shots).
* Live header: `.score` (two `.sc` blocks + `.rk`); `.sc.at` marks who is at the table (breaker during the break phase, following the form's "Change breaker").

## Conventions

* Dense, compact TypeScript (short names, one-line handlers, liberal `any`); single `styles.css`; shared small components inline in the screen file (cross-screen primitives go in `ui.tsx`). Match the surrounding style.
* Hidden-mounted tabs (Play, Shots) keep running their `useLiveQuery`s; keep their screens light and don't add mount-time side effects that assume the tab is visible.
* CSS gotcha: `font:600 14px inherit` is invalid (the whole declaration is dropped, leaving 13px regular). Use `font:600 var(--fs-m) var(--font)`.
* Reactive reads with `useLiveQuery`; local React state for forms; no global store.

## Verification and development workflow

### General rule

Do not run commands merely for the sake of running them.

If terminal execution is available, use it when it materially helps the task. If terminal execution is unavailable, continue with source inspection and clearly state that verification could not be executed.

### Dependencies

Do **not** run `npm install` automatically.

Run `npm install` only when:

* `node_modules` is missing and dependencies are needed for verification; or
* the user explicitly asks for a clean dependency install; or
* a dependency-related problem clearly requires it.

If dependencies are already installed, skip `npm install`.

### Typechecking/building

For implementation tasks, after making changes, prefer:

```bash
npm run typecheck
npm run build
```

Run both when practical and when the project provides those scripts.

If a command fails:

1. Determine whether the failure was caused by the current changes.
2. Fix errors caused by the current changes.
3. Do not make unrelated refactors just to eliminate pre-existing errors.
4. Report pre-existing failures separately.

Do not repeatedly rebuild after every tiny edit. Make a coherent set of changes, then verify.

For audit/planning/review tasks where no code is being changed, do not spend time running a build unless there is a specific reason it would provide useful information.

There is no automated test framework. Where appropriate, verify with typecheck/build and then manual testing on a phone.

## Sync / deployment

* Site: GitHub Actions (`.github/workflows/deploy.yml`) builds with Vite (`base:'./'`) and deploys to GitHub Pages from `main`. PWA, auto-update.
* Data: separate private repo, files `players.json` (players+venues), `sessions/<id>.json` (session + its breaks/visits/flags), `catalogue.json` (shots + decks), `practice/<id>.json` (a practice session + its attempts). Each file `{recs:[…]}`, last-write-wins by `u`, per-file sha tracked in localStorage (`ct.shas`, `ct.seen:*`). Token (fine-grained, Contents RW) lives only in localStorage. Old `records/` folder is obsolete.
* Photos: profile pics are small data URLs inside player records (synced). Flag photos are data URLs inside the flag record but stripped on push and kept on pull, so they stay on the device that took them.

## Known issues / debt

* Much of the code was written without being compiled in the authoring environment. When dependencies are available, run `npm run typecheck` and `npm run build` before trusting implementation changes. Run `npm install` only if dependencies are missing.
* No automated tests.
* Rating anchors/weights/rank cut-offs unvalidated (placeholders until calibrated; Break formula untouched, being reworked separately).
* Practice tunables (`PC`) unvalidated.
* Shot `no` can repeat if two phones create shots offline (harmless: ties break by id).
* Unused leftovers: `COLORS` in `App.tsx`, `sha` field in `Rec`.

## Working rules for Claude

* Treat the existing codebase as the source of truth for implementation details.
* Do not assume a file exists just because it is listed here. Inspect the actual project when necessary.
* Before changing code, inspect the relevant existing implementation and surrounding patterns.
* Do not redesign unrelated parts of the app while implementing a specific request.
* Preserve existing data, business rules, backwards compatibility, and legacy-field handling unless the task explicitly changes them.
* Prefer the smallest coherent change that solves the requested problem.
* Reuse existing components, helpers, styles, and conventions before creating new ones.
* Do not introduce new libraries or architectural patterns without a concrete reason.
* For UI work, preserve mobile usability and one-handed operation.
* For destructive or potentially data-affecting changes, be especially careful with existing records and derived-state logic.
* If the requested behavior conflicts with an existing business rule, stop and explain the conflict before changing the rule.
* If a task is ambiguous, inspect the relevant code first and then ask only the minimum necessary clarification.
* When finished, report:

  * files changed
  * what changed
  * verification performed
  * any remaining issues or assumptions

## Status

See `docs/PROJECT_STATE.md`.