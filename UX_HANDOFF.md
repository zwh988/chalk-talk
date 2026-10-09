# Chalk Talk — UX improvement handoff (chunks 7 onward)

Give a fresh Claude chat this file, `CLAUDE.md`, `docs/PROJECT_STATE.md`, and the source files listed per chunk below (use the versions in your repo **after chunks 0–6 were committed**).

---

## 0. Prompt to paste at the start of the new chat

> I'm continuing a UX improvement plan for Chalk Talk, a 9-ball logging PWA. Attached: `UX_HANDOFF.md` (read it fully first), `CLAUDE.md`, `PROJECT_STATE.md`, and the source files for the chunk we're doing.
>
> Chunks 0–6 are done and committed. We work **one chunk at a time**: you implement it, I review and test on my phone, then we move on. Start with **chunk 7** unless I say otherwise.
>
> Rules: don't read or rewrite unrelated files; search for symbols instead of reading whole files; follow imports only as needed; match the compact code style; never store derived state (the app replays break/visit records). I cannot give you the repo, so I attach the files you need. If you need a file I didn't attach, ask for it by name before guessing. Deliver **full changed files** (I download and commit manually). After each chunk: concise diff summary, typecheck/build status (say "unverified" if you can't run them), and update `CLAUDE.md` / `PROJECT_STATE.md` when anything in them becomes stale, delivering those files too.
>
> Before coding a chunk, state briefly what you'll change and any decision you need from me. Don't start the next chunk until I say so.

---

## 1. Product and design brief

Chalk Talk logs real 9-ball matches fast, then turns the accumulated data into information for improving as a player. Used on a phone, at the table, usually one-handed. Local-first (IndexedDB), syncs to a private GitHub repo.

Personality: **90% serious performance tool, 10% pool personality.** Focused, professional, fast, clear, data-driven, slightly distinctive. Not a gacha game, generic SaaS dashboard, social app, flashy esports UI, or "AI app". Prefer solid product-design principles over trend chasing. Keep the rank/radar card restrained.

## 2. Working method and environment notes

- The assistant has no repo access. Uploaded files are read-only at `/mnt/user-data/uploads`. Work on copies in a scratch dir, apply edits with exact-string replacements that assert match counts, write final files to `/mnt/user-data/outputs`, and call `present_files`.
- Base every edit on the **latest committed version** of each file (earlier chunks changed `App.tsx`, `Live.tsx`, `Shots.tsx`, `Review.tsx`, `Practice.tsx`, `History.tsx`, `Decks.tsx`, `Cropper.tsx`, `styles.css`, plus the new `ui.tsx`).
- There is no `node_modules`, so `npm run typecheck`/`build` cannot run. A useful partial check: `tsc --noEmit --jsx preserve --target es2020 --skipLibCheck --noResolve --strict false <files> | grep -E "error TS1[0-9]{3}"` catches syntax-level errors (it found a duplicate-key bug in chunk 0). Report typecheck/build as **unverified** unless actually run.
- If a headless browser is available (Playwright + Chromium worked before), verify CSS/layout by rendering mock HTML with `styles.css` at ~390px width and viewing the screenshot. This is how the invalid-font bug was confirmed.
- Update `CLAUDE.md` and `PROJECT_STATE.md` as part of each chunk when stale (new files, conventions, behaviour, remaining work). Deliver them with the chunk.
- **Base edits on the latest delivered files, not the originally uploaded copies.** Uploads from earlier in a chat go stale once a chunk ships (chunk 6 nearly started from a pre-chunk-5 `App.tsx`). The user re-attaches only files that changed outside the chat; if unsure, ask whether the last delivery was committed.
- `tsc` exists at `/home/claude/.npm-global/bin/tsc` (syntax check above). The bash tool is `/bin/sh`: no brace expansion (`{a,b}`) or process substitution; loop over files or write a Python edit script instead.
- Keep the tone concise; the user reviews on a phone. Group deliverables and say exactly what to test.

## 3. State of the codebase after chunks 0–6

**Chunk 0 (done):** copy fixes ("More → Players/Venues" instead of nonexistent tabs); removed duplicate `path` key in the Shots editor `hint` object (it was a TS1117 error); contact diagram ball radius 48→40 so the ghost ball is never clipped; "No shot" no longer shown twice on the opening-shot buttons; `tipLabel` now imported from `Shots.tsx` instead of duplicated in `Live.tsx`.

**Chunk 1 (done), `styles.css` + two colour edits:**
- Semantic tokens `--good --bad --warn` (light and dark values), **fixed, not in `theme.ts`, not user-editable**. Better/worse arrows (Review `Dlt`) and Practice ✓/✗ use them. Never use `--cloth`/`--amber` to mean good/bad (in the Burgundy theme `--cloth` is burgundy).
- Type scale `--fs-s/m/b/l/xl/n` = 12/14/15/18/22/30px and `--font`. `h2` is styled (18px, tight margin). Body uses tabular numerals.
- **Bug fixed:** every `font:600 14px inherit` shorthand was invalid CSS and silently dropped, leaving buttons 13px/regular. Now `font:600 var(--fs-m) var(--font)`. Buttons are now actually bold/larger as originally intended. **Never write `font:… inherit` with other values.**
- Buttons: `.go` amber primary, `.ghost` now a **solid** outline secondary, `.link` text, `.danger` modifier (red text/border; `.go.danger` is filled red). Dashed borders remain only on `.chip.opt` (optional/add). `.danger` must stay after `.link`/`.ghost` in the CSS so it wins.

**Chunk 2 (done):**
- New `ui.tsx`: `Sheet` (bottom sheet, `.sheet`, z-index 50), `ask(msg, okLabel='Delete', danger=true)` → `Promise<boolean>`, `tell(msg)` → `Promise<void>`, `<Dialogs/>` mounted once in `App`. They replace native `confirm()`/`alert()` (fallback to native if `<Dialogs/>` isn't mounted). Z-order: Cropper `.modal` 20, Sheet 50, Photo viewer 100.
- Live header: `[Undo last] [N unsynced] ........ [End session]` (End session red, far right, **always** opens a confirm sheet; offers "Sync and end" first when unsynced; buttons disabled while syncing). Under it, when events exist: "Last logged: …" (ellipsised one-liner via `line()`) so Undo's target is visible.
- Flag-shot modal and push-out prompt now use `Sheet` (flag sheet ignores backdrop taps so notes aren't lost; push-out sheet has Cancel).
- Destructive buttons across History/Decks/Shots/App (Players)/Cropper converted to `ask()`/`tell()` and styled `.danger`.
- `Venues.tsx` delete now uses `ask()` + `.danger` (done after chunk 3). `sync.ts` error copy says "More → Sync".

**Chunk 3 (done), `Live.tsx` + `styles.css`:**
- **Sticky action bar:** `<div className="stick">` is the last in-flow child of the Break/Visit card, holding the `.go` button (`position:sticky;bottom:-14px` inside `main`; the -14px cancels `main`'s bottom padding, which sticky honours, so the bar sits flush on the nav). Reused by the Practice Made/Missed bar (chunk 6, with `borderRadius:0` because it sits directly in `main`, not in a card); reuse for the shot-editor Save bar (chunk 11).
- **Score header:** `.score` grid = `.sc` (avatar, name, 30px score, `.cap` "breaking"/"at table") | `.rk` (Rack N) | `.sc`. `.sc.at` = amber outline for who is at the table; during the break phase it follows the form's "Change breaker" via `onBy` → `cb` state in `Live` (keyed to event count so it resets after each log).
- **Ball strips:** new `.strip.t` + `.bt` (whole cell is the button, 46px tall, circle drawn by `::before`, states `.pot .gone .now .fl`). Cells are 36px wide at 360px, 40px at 390px (nine balls cannot reach 40px at 360). The old `.b` rules remain in `styles.css` because Shots (unseen) may use them; remove only after checking.
- `.tag .x` has a 40px hit area via negative margins (tag size unchanged). Flag note no longer autofocuses. Optional row chips: "⚑ Flag shot · Save for the library", "✦ Fluke · Lucky pot · stat note" (wording provisional until the terminology pass).
- Not done: scannable rack-log lines (moved to chunk 8, because `line()` also feeds "Last logged" and History). Tip/power collapse still undecided: try the sticky bar first.
- Verified only by a syntax-level `tsc` run and a Playwright mock at 360px (tap-target widths, sticky flush with nav). Real-phone test pending.

**Chunk 4 (done), `App.tsx` `ui.tsx` `Shots.tsx` `Decks.tsx` `Practice.tsx` `styles.css`:**
- **Nav:** icon + 12px label (`.lb`), `aria-current="page"`, aria-label includes the badge. Badges `.bdg` (amber count, `.bdg.dot` for Play) come from three `useLiveQuery`s in `App` (session without `end`; flags with `status!=='converted'`; `dirty===1`). More list shows "N unsynced" on the Sync row.
- **State kept:** Play and Shots render always, wrapped in `<div hidden>` + `[hidden]{display:none!important}`; Review and More remount. `main` scroll position is saved/restored per tab (`pos` ref, `useLayoutEffect`).
- **Back stack (`ui.tsx`):** `useBack(open, close)`; one sentinel `history` entry while the stack is non-empty; `popstate` pops the top entry and calls `close()`, which may return `false`/Promise<false> to veto (entry is re-pushed). `Active` context (provided per tab) excludes hidden tabs. `Sheet` registers itself (no `onClose` = swallows Back). Used by: More sub-pages, Players cropper, Shots editor, Decks detail + editor, Practice run (setup is now a `Sheet`; Flagged is a chip, not a sub-screen). Logic was exercised in headless Chromium (stack order, in-app close, veto, same-tick swap); the React wiring is unverified on a device.
- **Shot editor:** ‹ Catalogue and Back call `leave()`: confirms ("Discard") only when the serialised diagram/fields differ from the opened state. Save/Delete leave directly.
- **Practice:** Back on setup = exit; mid-run = confirm "End practice" (attempts kept) then end; empty run dropped; on the summary = Done.
- **Not covered:** Review chip views and History cards (not sub-screens), Photo full-screen viewer (`Photo.tsx` not seen), Live's own sheets are covered only via `Sheet`.

**Chunk 5 (done), `App.tsx` only:**
- **New session defaults are derived from the latest session record** (sorted by `d.start`): format, players (`players[0]`; `solo` → "solo"; Scotch partners from `teams`), venue (`venueId`, falling back to the venue name), table. Archived players and deleted venues fall back to blank; the session name is not copied. The user's edits live in an overrides object `o` (`g(k)=k in o?o[k]:df[k]`), so defaults follow the data and nothing is stored. (A "Rematch" button / "Same as last match" line was built, then removed at the user's request: prefill alone is enough, no extra UI.) After Start, `o` and the name are cleared.
- **First run:** no players → card with an **Add players** button → `toPlayers()` in `App` (`go('more')` then `setMi('players')`; `More` takes an `init` prop; `go()` resets `mi`).
- **"Me" default player: declined** (no `ct.me`, Review untouched).

**Chunk 6 (done), `App.tsx` `Decks.tsx` `Practice.tsx` `Shots.tsx` `styles.css`:**
- **Tab renamed Train** (internal key still `shots`; label in the `LABEL` map; Play · Review · Train reads as three verbs, and avoids a clash with "Solo practice" in Play). `ShotsHome` has a `Seg` **Decks | Library | Flagged (n)** and lands on Decks. `Shots` now takes a `flags` prop: Flagged is its own view (no back button, no ⚑ header button, no `useBack`); Create shot still opens the editor and returns to the list. Shots screen title is "Library"; editor back button "‹ Library".
- **Train badge:** a dot while `unfinished()` returns a run (takes priority), otherwise the pending-flag count. aria note is "practice in progress" or "flagged".
- **Deck list cards:** `.hist` open-button containing the name, summary and a `.dth` grid of the first 4 shots' `Table small` thumbnails with captions (2x2 on phones, 4 across ≥620px), then a "Last practiced …" hint + **Start practice**; deck detail's Start practice opens the same setup.
- **`Setup` sheet** (exported from `Practice.tsx`): defaults from the latest `practice` record (player unless archived, venue if it exists, attempts per shot), same overrides-object pattern as chunk 5; Start saves the practice and calls `onStart({pd,sid})`. `Decks` holds `su` (deck for the sheet) and `run` (`{sid,pd}`); `Practice` (default export) is a wrapper around a keyed `Run`, so **Practice again** saves a fresh record (same player/venue/per) and resets the run.
- **Resume:** `unfinished()` (exported from `Practice.tsx`) = latest `practice` without `end`, ignoring empty ones older than a day → `{x,n}`; drives both the badge and a Decks banner: **Resume**, **End practice** (when it has attempts; they are kept), **Discard** (only when empty), no Resume if the deck was deleted. Attempts are never discarded.
- **Run screen:** header "End practice" (confirms via `ask` when attempts exist, same as Back); why-now line is a button that reveals "N% chance of this pick"; a sticky bar (`.stick` + `.pbar`) holds the attempt counter, a narrow Undo and equal solid **✓ Made** (`--good`) / **✗ Missed** (`--bad`) with text colour `--on` (new token: `#fff` light, `#0c1819` dark). Summary: "Practice done" with Done | Practice again.
- Not rendered in a browser; layout of the new bar unverified. Starting a new practice while another is unfinished leaves the old banner after the new one ends (acceptable).

**Chunk 7 (done), `Review.tsx` + `styles.css`:**
- Filter row `.filt` (player full width; window + type side by side, with aria-labels). Type options: All types / Matches only / Solo only.
- `CH` card header = title + scope (`ws`: "Last N sessions"/"All …"); rating card scope `rs` = "All N sessions" (ignores the window, respects the type filter). Top lines: "Faded = fewer than 5 observations" and either the arrows explanation or "Trends unlock after 8 completed sessions (N more)" (`dn` = completed sessions, `PN` = `N` from `delta.ts`).
- Compare select moved above the radar; `.key` legend only while comparing. Radar labels 13, `Cols` labels 12 (viewBox 300x112, max-width 480).
- "Where visits end" → "Lowest ball left after a miss" + n. **Assumption:** `d.low` is set in `Live.tsx` (not seen); `stats.ts` counts it only for `Missed` visits with an Easy/Hard opening. Confirm the meaning against `Live.tsx` if the title looks wrong.
- 7b: rank shown as a big block letter in tier colours (R2; `.rank`, `--rk-*`), provisional when `confidence < CONF[1][0]` (letter faded to ~35%, "Provisional" caption); the Confidence line was removed, and the card header leads with a large avatar and the name; "Work on" line = lowest `adj` among attributes with n ≥ PROV/2, only when ≥2 qualify. `rating.ts`, `ratingConfig.ts`, `stats.ts`, `delta.ts`, `App.tsx` unchanged.
- Verified: syntax-level `tsc` + a Playwright mock at 390px of the new pieces. Not run on a phone; typecheck/build unverified.

**Chunk 8 (done), `History.tsx` `Live.tsx` `styles.css`:**
- History cards: title (name or date) + chevron (rotates, `aria-expanded`), meta line, one `.sr` scoreboard row per player (avatar, name, score; winner `.w` bold + "Won", loser `.l` muted; no winner for solo/ties/in-progress). Month headers `.mh` with counts. Player/venue dropdown filters (`.filt`, each shown only with >1 option).
- Expanded: `Summary` (grid `.ms`) from `playerStats`/`breakStats`: Racks won, Run-outs, Won from chance, 1-ball on the break, Safeties held, Fouls. Scotch: racks + run-outs only (team visits aren't credited by `playerStats`); solo: one column, no racks row. Not faded for n<5 (shown as w/n). Then Edit details, racks (header `.rh.hx` with a full-size `ghost danger` Delete rack), Delete session.
- `Live.tsx`: `line()` is now `lineP()` (parts + index of the result + ball missed) joined; text output unchanged ("Last logged" uses it). New exported `Ln` component renders the scannable line (bold result, `.bg` ball glyph); used by the Live rack log and History. Tap-to-edit is still chunk 9.
- Not done: nothing from the chunk 8 list was skipped; search is dropdown filters only (player/venue), no text search.
- Verified: syntax-level `tsc` on `History.tsx`/`Live.tsx` and a Playwright mock at 390px (cards, summary, rack header, ball glyph). Typecheck/build unverified; not tried on a phone. `engine.ts`, `stats.ts` unchanged.

**Gotchas to remember**
- Call `useBack` before any early `return` in a component (hooks order). Hidden-mounted tabs keep their live queries running.
- In `Live.tsx`, `BreakForm`/`VisitForm` have local state named `ask`/`setAsk`; import only `Sheet` there, not `ask` (name clash).
- `html, body` are `overflow:hidden`; `main` is the scroll container and `nav` sits outside it (portrait: bottom, landscape ≥600px: left rail 76px). `position:sticky` must live inside `main`.
- `useLiveQuery` returns `undefined` until loaded; the code mostly does `||[]`, so empty-state text flashes before data arrives.
- Solo practice sessions use virtual player ids `<id>~2`; always resolve players through `id.split('~')[0]` (`base()` in App, `bs()` in History).
- Derived-defaults pattern (Session, `Setup`): `df` from the latest record + `o` overrides; never copy derived values into state, and clear `o` after submit.
- Solo/virtual ids and `unfinished()`: practice `by` is always a real player id; only match sessions use `<id>~2`.
- Shared helpers currently duplicated: `Cols` (Review) vs `Bars` (Decks) bar charts, `BC` ball colours (Live vs Shots), `blank()` (Decks vs Shots). Consolidate into `ui.tsx` only when a chunk touches them.

- **Stats control redesign (see `STATS_CONTROL_SPEC.md`).** S1 `control.ts` (derivation), S2 (Initiative + How the initiative was lost, `controlConfig.ts`, CSS `.big .stk .lg .tl .tk .rw .er`) S3 (Finishing, Defence, Hard shots; CSS `.sw .tg`) and S4 (tap-to-trace sheets; CSS `.tr`, `.rv`, tappable `.t`) shipped. The spec's chunks are complete; follow-ups are listed in PROJECT_STATE. Opponent-based blocks are hidden for "Solo only".

## 4. Remaining plan

Do chunks in order unless the user reorders. Each lists files to attach, the work, acceptance checks, risks.

### Chunk 3 — Live logging ergonomics (DONE, see section 3)
**Attach:** `Live.tsx`, `styles.css`, `App.tsx` (only if the Session/Live wiring needs it), `ui.tsx`.
**Work**
1. **Sticky primary action bar** for **Log break** and **Log visit** (inside `main`; `position:sticky;bottom:0` with an opaque `--bg` background, safe-area aware, so the CTA is always visible without scrolling). The Break form is ~3 screens tall (contact diagram ≈250px) and Log break was at the very bottom.
2. **Score header hierarchy:** the score must be the biggest element (currently 15px bold next to a 22px "Rack N" h1). Show who is at the table (highlight active player avatar/name); today only the card title says it.
3. **Ball strip hit targets:** `.b` is `width:100%;max-width:46px`; on 360–390px phones the 9 balls shrink to ~30–33px. Target ≥40×44px tap area (visual circle may stay smaller; enlarge the hit area), keep the "tap last ball potted" behaviour untouched.
4. **Tag ✕ targets** (`.x`, ~20px) → ≥40px hit area.
5. **Flag sheet:** remove `autoFocus` on the note field so the keyboard doesn't cover the camera/photo option.
6. **Visit form "Optional" group:** Flag shot (library bookmark) and Fluke (stat modifier) are different things; relabel/separate lightly (final wording after the terminology pass).
7. Optional: racks log lines more scannable (bold the result, ball glyph for the low ball). Keep one-line-per-visit; tap-to-edit comes in chunk 9.
**Decision pending:** collapse tip + power on the Break form behind "Same as last break · Edit". Recommendation: **do not** in this chunk; try the sticky bar first, then decide.
**Check:** CTA visible at 360×640 on both forms; no regression of keyboard focus; ball taps reliable at 360px; landscape still fine.

### Chunk 4 — Navigation: labels, badges, state (DONE, see section 3)
**Attach:** `App.tsx`, `Shots.tsx`, `Decks.tsx`, `Review.tsx`, `History.tsx`, `styles.css`, `ui.tsx`.
**Work**
1. Visible **labels under nav icons** (12px; the 76px landscape rail has room). Keep `aria-label`; add `aria-current="page"` on the active tab.
2. **Badges (all derived, nothing stored):** dot on Play when a session without `d.end` exists; count on Shots for pending flags (`flag` records where `status !== 'converted'`, not deleted); count on More for unsynced (`db.recs.where('dirty').equals(1).count()`, same query Live/Sync already use).
3. **Keep state across tab switches:** tabs currently unmount (a half-filled visit, shot-editor diagram, or practice run is lost when a nav icon is tapped). Preferred approach: keep Play and Shots mounted and hide inactive ones (`hidden` + a `[hidden]{display:none!important}` rule); Review/More can stay unmounted. Mind that hidden screens keep running their live queries.
4. **Back navigation:** custom `‹` buttons use local `useState`, so the Android back button likely exits the PWA. Add a small history-API helper (push an entry when a sub-screen opens, handle `popstate` to close it) for: More sub-pages, Shots/Decks detail, deck editor, shot editor, Practice run (confirm via `ask` when leaving a run is risky), Review sub-views if sensible. At the root, back exiting is acceptable.
5. **Discard confirmation** in the shot editor: "‹ Catalogue" currently discards unsaved diagram edits silently; confirm only when dirty.
**Risks:** hidden-mounted screens and sticky/scroll positions; keep the change small and test each tab round-trip.

### Chunk 5 — Session start memory (DONE, see section 3)

### Chunk 6 — Practice promotion and resume (DONE, see section 3)

### Chunk 7 — Review restructure (DONE, see section 3)
**Attach:** `Review.tsx`, `App.tsx` (the Review wrapper/`Seg` for Match history | Players | Breaks), `styles.css`; for 7b also `rating.ts`, `ratingConfig.ts`, `stats.ts`, `delta.ts`.
**7a**
- Replace the 3 stacked full-width selects with a compact filter row (player full width; window + type side by side).
- **Scope labels:** the rating card says "all sessions" (rating always uses all sessions per CLAUDE.md) while the window filter says "Last 4 sessions" for other cards. Label scope explicitly per card, and rename the type filter options so they stop reading as the opposite of the window ("All types / Matches only / Solo only").
- **Radar legend** (solid = selected player, dashed amber = compared player). Move "Compare with…" above the radar.
- **Trend-unlock message:** when `periods()` returns null say "Trends unlock after 8 completed sessions (N more)". Include "faded = fewer than 5 observations" legend near the top.
- Chart text: SVG fonts at 9 viewBox units render ~9–10px; raise to ≥11px effective.
- Rename "Where visits end" to something explicit (verify in `stats.ts` that it is the lowest ball left on the table when the visit ended).
**7b**
- Rank letter (46px, weight 900) is currently the loudest thing even with 1 session / 50% confidence. Make it visibly **provisional below ~75% confidence** (muted/outlined + "Provisional" tag), keep restrained.
- Optional lead line: "Work on: <weakest attribute with enough n>" derived from `attrs()`; no new stored data.

### Chunk 8 — History polish and match summary (DONE, see section 3)
**Attach:** `History.tsx`, `stats.ts`, `engine.ts`, `Live.tsx` (for `line`), `styles.css`.
**Work:** chevron/expand affordance on session cards; group by month; emphasise the winner of each match; larger **Delete rack** target (currently an 11px underlined link); per-match **summary strip** when expanded (run-outs, breaks, safeties held, etc.) reusing `playerStats`/`walk`/`derive` rather than new logic. Consider search/filter by player or venue if cheap.

### Chunk 9 — Correct past visits (high risk, do last of the logic work)
**Attach:** `Live.tsx`, `engine.ts`, `History.tsx`, `db.ts`, `stats.ts`.
**Problem:** only the last event can be undone; History can delete a whole rack. Mistakes earlier in a rack force undoing everything after them.
**Constraint:** events carry `next` (who shoots next), `won`, `first`, `rack`; state is derived by replay, so editing/deleting a middle event can invalidate later events.
**Suggested design (confirm with user before building):** tap a log line → sheet with **Edit** and **Delete**. Safest implementation is "rewind": after a confirm that states how many later events in that rack will be removed, soft-delete this event and all later ones in the rack and reopen the form pre-filled with the old values. 9a = tap line → delete/rewind only; 9b = pre-filled edit. Read `engine.ts` and the existing `delRack` renumbering first. Update CLAUDE.md "Business rules" (Undo/edit semantics).

### Chunk 10 — Accessibility, PWA, polish
**Attach:** `styles.css`, `index.html`, `vite.config.ts`, **`main.tsx`**, `Shots.tsx`, `Live.tsx`, `Practice.tsx`, `App.tsx`.
- `aria-pressed` on toggle chips and ball buttons; `role="tablist"`/`aria-selected` on `Seg`; `aria-label`/`role="img"` summaries on SVG charts; Photo viewer `alt`.
- Custom pointer-only widgets (`Power`, `Tip`, kitchen diagram, contact picker): add roles (`slider` where sensible), keyboard/arrow support or equivalent alternative.
- Practice Made/Missed uses `--good`/`--bad` (red/green) with ✓/✗ glyphs; check `--on` text contrast in the preset/custom themes and that Settings can't override it badly.
- Touch targets ≥40–44px for `.ghost`, `.link`, small icon buttons. Muted text contrast: default `--mute #62777a` on `#f2f5f4` ≈ 4.3:1 at 12px — darken slightly or avoid mute on `--bg` for 12px text; check preset themes too (e.g. Midnight cloth `#1f8f7d` with white text ≈ 4:1).
- Inputs: they inherit 15px, which makes iOS Safari zoom on focus; set `font-size:max(16px,…)`.
- PWA: check `main.tsx`; with `registerType:'autoUpdate'` a new deploy may reload an open tab and drop an unsaved form — verify and consider prompt-on-update or deferring reload while a form is dirty/session live. Add `apple-touch-icon` link and apple-mobile-web-app meta (user supplies a 180×180 icon). Manifest `background_color` is static.
- Loading states: don't show "No sessions yet" before queries resolve (distinguish `undefined` from empty).
- Optional: **Screen Wake Lock** in Live and Practice (re-acquire on `visibilitychange`); light haptics (`navigator.vibrate`) on Made/Missed/Log.

### Chunk 11 — Library, decks and More polish (optional, after the above)
- Shots list: two filters side by side, group by tag with headers when "All tags", search box; consider difficulty filter when that feature exists.
- Shot editor: mode chips (Balls/Target/Leave/Path) styled distinctly from filter chips; Save bar reusing the sticky action bar from chunk 3; measurement tags currently reuse the purple/gold flag/fluke tag styles with a different meaning — give them their own style.
- Deck detail: player select mid-page, long scroll; deck editor pick rows use `.chip` as checkbox rows (show a real check).
- Players page: avatar tap-to-upload has no visible affordance; Archive/Delete cluster; Sync shows no "last synced" time (needs `sync.ts`); Settings colour pickers have no contrast guard (consider presets + accent only).
- Spacing scale (4/8/12/16): replace ad-hoc inline margins opportunistically in screens being touched; don't do a big-bang sweep.
- De-duplicate `Cols`/`Bars`, `BC`, `blank()` into shared modules.

### Cross-cutting terminology pass (needs user approval; slot into chunk 3, 6 or 7)
Proposed UI-string-only changes (never rename data types like `session`):
- **Match** for two-player play; **Solo session** for playing both sides ("Myself"); **Practice** only for deck drills. Today "session" means both match and practice run, and "Solo practice" (Play) vs "Practice" (Decks) collide.
- Visit form header "first shot" (first visit after the break) vs field "Opening shot" are different concepts: rename the header ("After the break" / "First visit").
- Opening "Easy · Clear shot" vs board "Clean": reduce the Clear/Clean collision (e.g. Easy sublabel "Straightforward").
- One name for the shot list: now Train (tab) → **Library** (chip and screen title, editor back "‹ Library") — done in chunk 6; still grep UI strings for leftover "Catalogue"/"Full Catalogue"/"whole library".
- Play tab: labels now exist, but its icon is still a video-play glyph; consider replacing it.
- "Myself (solo practice)" in the Play form vs the Practice (deck drills) in Train: still the main collision; rename to "Solo session" if the glossary is approved.

## 5. Pending decisions (ask the user; suggested defaults)
1. Collapse tip/power on the Break form? → not yet; try sticky bar first.
2. ~~Default "me" player~~ → **declined** (chunk 5).
3. ~~Rename Shots tab to Train~~ → **done** (chunk 6; Decks | Library | Flagged).
4. Terminology glossary above → still needs explicit approval (Match / Solo session / Practice, "After the break" header, Clear/Clean).
5. Made/Missed colours: built as solid green/red with glyphs; the user may prefer a neutral Missed (one-line CSS change in `.pbar .m`).
6. Chunk 9 edit approach (rewind vs in-place edit).

## 6. Do-not-change list (from the audit)
- Tap-the-last-ball-potted strip behaviour.
- Event-log architecture: derived-not-stored, soft-delete undo.
- n shown on every stat; rows with n<5 faded; confidence only drives the provisional rank; deltas need ≥5 obs each side.
- Cause required on Missed/Foul for Easy/Hard openings.
- Dropdown filters (explicit prior decision), newest-first ordering.
- Decided against (chunk 5): a default "me" player.
- Amber primary CTA; kitchen/contact diagrams and shared `Table`/`Tip`/`Power` across Live, Shots, Practice.
- CSS-variable theming and presets; bottom nav (portrait) + left rail (landscape).
- Restrained rank/radar card; flags saved immediately.
- "Decided against" list in `PROJECT_STATE.md` (per-shot logging, combos/carom, head-to-head Elo, light/dark selector, fluke ball marker per shot).

## 7. Reference: audit findings behind the plan (condensed)
- **Strengths:** domain-native input widgets with last-break prefill; progressive disclosure in the visit form; statistical honesty; coherent cloth/chalk/amber identity; safe-area/landscape care; trustworthy event-log undo.
- **Weaknesses addressed so far:** single dashed button style for everything; unguarded End session next to Undo; semantic colours tied to brand tokens; four overlay patterns + native dialogs; unlabelled copy pointing to nonexistent tabs; clipped contact diagram; invalid button font shorthand; primary CTAs below the fold, state lost on tab switch / no back stack, session start re-asking everything, Practice buried and not resumable (chunks 3–6).
- **Weaknesses still open:** no way to correct earlier visits (9); accessibility/iOS zoom/PWA update risk (10); terminology collisions; Shot library/More polish (11).
- **Developer-built vs product-built:** domain widgets feel product-built; the chrome (buttons, dialogs, empty states, text logs) felt developer-built — chunks 1–2 addressed buttons and dialogs; empty/loading/error states remain.

## 8. Per-chunk delivery checklist for the assistant
1. State the plan and any decision needed; wait if blocked.
2. Edit copies of the latest files with asserted exact-string replacements; keep the compact style.
3. Syntax check; render mocks in a browser if CSS/layout changed; view the screenshot.
4. Output full changed files + updated `CLAUDE.md`/`PROJECT_STATE.md` to `/mnt/user-data/outputs`, `present_files`.
5. Reply: what changed (grouped by file), typecheck/build status (usually "unverified"), exactly what to test on a phone, any decision for the next chunk. Mention whether `PROJECT_STATE.md`/`CLAUDE.md` were updated and why.
