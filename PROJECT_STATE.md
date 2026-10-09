# Project state (update only when it materially changes)

## Implemented
- Players (photo + cropper, archive/delete), venues, session start (name, venue dropdown, table).
- Live logging: break form (kitchen diagram, face-tap contact picker, tip, 1-ball direction, droppers, scratch, golden break, skip), visit form (opening shot, board/problem balls, outcomes incl. push-out, safe, escape, won rack, cause required, flukes, flag counter), undo, end session with sync prompt.
- Match history (newest first), edit session details, delete session/rack, avatars.
- Review → Players: rating (0–1000, rank F–SSS), radar with compare, six attributes with provisional/trend, graphs; Review → Breaks (donuts + tables by position/contact). Dropdown filters.
- Shots: diagram editor (balls, target, leave, cue-ball path, tangent reference, cue tip, speed), measured cut/distances in diamonds, 7-level power, one tag per shot with derived per-tag numbering (deleting/retagging closes gaps), tag/player filters.
- Decks (Shots → Decks): smart (tag and/or shot-by; no rule = whole catalogue) and custom decks, deck detail with shots, create/edit/delete.
- Practice: pick player, venue, attempts per shot (default 3); full-scale diagram, cue tip, power, cut/distances; Made/Missed, undo, end any time; saved attempts per player+shot. Per-player stats (attempts, make %, last practiced, recent), progress chart, shots needing attention, delete a session or reset a player's deck history. Adaptive selection (weak/new/stale shots more often, mastered still appear, cooldown) with mastery and why-now shown.
- Flag shot: capture note/photo during a visit (saved at once with session/rack/player/venue context), pending list in Train → Flagged, Create shot opens the editor and links the flag to the new shot (flag kept, status converted). Photos stay local to the device.
- Rating confidence: unshrunk rating shown with a confidence label/percent (data backing it) and per-attribute n.
- Review: recent-change arrows (latest 4 vs previous 4 completed sessions) on rating, run-out/conversion/safeties/racks and break stats.
- Solo practice sessions (Player 2 = "Myself"): both seats logged as normal, shown as "Name" and "Name (2)", counted in Review and rating (rack-win stats skipped); Review filter: All / Matches only / Solo only.
- GitHub sync, PWA, theme presets + custom colours, status-bar colour follows theme.
- UX audit pass (chunks 0–2): copy/typo fixes, contact-diagram clipping fixed, semantic colour tokens + type scale + valid button fonts (buttons are now genuinely bold/larger), `ui.tsx` bottom sheets and `ask()/tell()` dialogs replacing native confirm/alert, red `.danger` on destructive buttons, End session always confirms and sits apart from Undo, Undo shows what it will remove.
- UX audit chunk 3 (Live ergonomics): sticky Log break / Log visit bar (`.stick`), score header (two player blocks with big score, active player highlighted, rack in the middle), full-cell ball tap targets (`.bt`), 40px tag ✕, flag note no autofocus, Flag shot / Fluke chips with sublabels.
- UX audit chunk 4 (navigation): labelled nav icons (`aria-current`), derived badges (Play dot while a session is live, Shots = pending flags, More = unsynced), Play and Shots stay mounted across tab switches (state, half-filled forms, diagram and practice run survive) with per-tab scroll memory, Android/iOS Back closes sub-screens via `useBack` (More pages, deck detail/editor, shot editor, flagged list, practice, cropper, sheets/dialogs), shot editor asks before discarding unsaved changes.
- UX audit chunk 5 (session start): New session defaults come from the latest session (players, Scotch teams, "Myself", venue, table; archived players/deleted venues fall back to blank), the form resets after Start, and with no players a button opens More → Players. Nothing stored.
- UX audit chunk 6 (Practice promotion): Shots tab renamed Train (Decks | Library | Flagged (n), lands on Decks; Flagged is its own chip, the Library header no longer has a Flagged button; Shots screen titled Library, editor back button "‹ Library"); deck cards show thumbnails of the first 4 shots (2x2, one row on wide screens) plus Start practice + last-practiced hint; setup is a sheet defaulting to the latest practice's player/venue/attempts; run has a sticky bar (Undo · ✓ Made · ✗ Missed, equal-weight solid green/red), End practice confirms, odds hidden behind a tap, summary has Practice again; an unfinished run (no `end`) shows a Resume / End practice (or Discard if empty) banner on Decks and a dot on the Train tab (priority over the flag count).
- UX audit chunk 7 (Review): compact filter row (player; window + type side by side), explicit scope label on every card (rating = "All N sessions", others follow the window), type options renamed All types / Matches only / Solo only, "Compare with…" above the radar with a legend, trend-unlock message ("Trends unlock after 8 completed sessions (N more)"), faded legend near the top, larger chart text, "Where visits end" renamed "Lowest ball left after a miss" (with n), rank letter provisional (outlined + tag) below 75% confidence, "Work on" line.
- Practice history edit: Edit button per session in deck history (player and venue); changing the player moves all its attempts to that player.

## Just shipped, awaiting user test
UX audit chunk 7: Review → Players/Breaks on a phone: filter row layout, scope labels change with window/type, Compare + legend, rank outlined with few sessions (and solid once confidence ≥ 75%), "Work on" line, trend message with < 8 completed sessions, chart text legibility, the renamed misses chart.
UX audit chunk 6: Train tab label/landing; Start practice from a deck card and from deck detail (sheet remembers last player/venue/per); Made/Missed bar stays at the bottom while scrolling, ✓/✗ and Undo; End practice confirm; summary Practice again; kill/reload the app mid-run → banner Resume (attempts intact) and Train dot; empty orphan; deleted-deck orphan; Back on sheet/run.
UX audit chunk 5: finish a match, open Play: players/venue/table prefilled; try Scotch and Myself (solo) as the last session, an archived last player, a deleted last venue; fresh install: Add players button → More → Players, Back returns.
UX audit chunk 4: check nav labels/badges in portrait and landscape; start a visit, switch tabs and come back; open a shot editor, edit, switch tabs, return; press Android Back in More pages, deck detail/editor, shot editor (dirty and clean), flagged list, practice run (confirm), sheets; Back at a root tab should still exit.
UX audit chunks 0–3 (see Implemented): check button sizes/wrapping on a phone, the End-session sheet, the push-out and flag sheets, the smaller contact-diagram ball, Venues delete sheet. Chunk 3: sticky Log bar on both forms, score header, ball taps at 360px.
Decks, practice, stats, adaptive selection, progress view (written without being compiled: run typecheck/build first). Tags + filter, edit session details, landscape layout fix (rail full height, content flush top), Won rack on No shot, dropdown filters, graphs, rating.

## In progress / next
1. UX audit plan, one chunk at a time (done 0–7): 8 History polish + match summary · 9 correct past visits (needs `engine.ts` review) · 10 accessibility/PWA polish.
2. Flag follow-ups: show flagged count on the Play tab, optional "return to pending" if a converted shot is deleted.
3. Shot difficulty from effective pocket size (proposal: effective width = mouth × cos(approach angle) − ball diameter → angular margin → aim tolerance → 1–5; placeholder mouths ≈4.5" corner / 5" side, adjustable in Settings).
4. Rating balancing using the user's logged pro matches (edit `ratingConfig.ts`).
5. Practice follow-ups: tune `PC` and mastery thresholds on real data; optional pot/position result per attempt; cross-deck practice history screen.
6. Break recommendation engine (explore/exploit, coarse bins first) — deferred.

## Pending decisions
- UX: (now that the chunk 3 sticky bar exists) collapse tip/power on the Break form (after trying the sticky bar)? terminology glossary (match vs session vs practice).
- Rank thresholds/anchors after real data; whether Breaks view should also be graphs; trend sparklines.

## Decided against
Default "me" player (declined in chunk 5), Per-shot logging, combo/carom tracking, head-to-head Elo, light/dark selector (for now), fluke ball marker per shot.
