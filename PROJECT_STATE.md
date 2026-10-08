# Project state (update only when it materially changes)

## Implemented
- Players (photo + cropper, archive/delete), venues, session start (name, venue dropdown, table).
- Live logging: break form (kitchen diagram, face-tap contact picker, tip, 1-ball direction, droppers, scratch, golden break, skip), visit form (opening shot, board/problem balls, outcomes incl. push-out, safe, escape, won rack, cause required, flukes, flag counter), undo, end session with sync prompt.
- Match history (newest first), edit session details, delete session/rack, avatars.
- Review → Players: rating (0–1000, rank F–SSS), radar with compare, six attributes with provisional/trend, graphs; Review → Breaks (donuts + tables by position/contact). Dropdown filters.
- Shots: diagram editor (balls, target, leave, cue-ball path, tangent reference, cue tip, speed), measured cut/distances in diamonds, 7-level power, one tag per shot with derived per-tag numbering (deleting/retagging closes gaps), tag/player filters.
- Decks (Shots → Decks): smart (tag and/or shot-by; no rule = whole catalogue) and custom decks, deck detail with shots, create/edit/delete.
- Practice: pick player, venue, attempts per shot (default 3); full-scale diagram, cue tip, power, cut/distances; Made/Missed, undo, end any time; saved attempts per player+shot. Per-player stats (attempts, make %, last practiced, recent), progress chart, shots needing attention, delete a session or reset a player's deck history. Adaptive selection (weak/new/stale shots more often, mastered still appear, cooldown) with mastery and why-now shown.
- Flag shot: capture note/photo during a visit (saved at once with session/rack/player/venue context), pending list in Shots → ⚑ Flagged, Create shot opens the editor and links the flag to the new shot (flag kept, status converted). Photos stay local to the device.
- Rating confidence: unshrunk rating shown with a confidence label/percent (data backing it) and per-attribute n.
- Review: recent-change arrows (latest 4 vs previous 4 completed sessions) on rating, run-out/conversion/safeties/racks and break stats.
- Solo practice sessions (Player 2 = "Myself"): both seats logged as normal, shown as "Name" and "Name (2)", counted in Review and rating (rack-win stats skipped); Review filter: All / Matches only / Solo only.
- GitHub sync, PWA, theme presets + custom colours, status-bar colour follows theme.
- UX audit pass (chunks 0–2): copy/typo fixes, contact-diagram clipping fixed, semantic colour tokens + type scale + valid button fonts (buttons are now genuinely bold/larger), `ui.tsx` bottom sheets and `ask()/tell()` dialogs replacing native confirm/alert, red `.danger` on destructive buttons, End session always confirms and sits apart from Undo, Undo shows what it will remove.
- UX audit chunk 3 (Live ergonomics): sticky Log break / Log visit bar (`.stick`), score header (two player blocks with big score, active player highlighted, rack in the middle), full-cell ball tap targets (`.bt`), 40px tag ✕, flag note no autofocus, Flag shot / Fluke chips with sublabels.

## Just shipped, awaiting user test
UX audit chunks 0–3 (see Implemented): check button sizes/wrapping on a phone, the End-session sheet, the push-out and flag sheets, the smaller contact-diagram ball, Venues delete sheet. Chunk 3: sticky Log bar on both forms, score header, ball taps at 360px.
Decks, practice, stats, adaptive selection, progress view (written without being compiled: run typecheck/build first). Tags + filter, edit session details, landscape layout fix (rail full height, content flush top), Won rack on No shot, dropdown filters, graphs, rating.

## In progress / next
1. UX audit plan, one chunk at a time (done 0–3): 4 nav labels + badges + keep state across tabs + history back + discard confirm in shot editor · 5 session-start memory/rematch · 6 Practice promotion (Train tab), resumable run, setup sheet, equal-weight Made/Missed · 7 Review filter row/labels/legend/provisional rank · 8 History polish + match summary · 9 correct past visits (needs `engine.ts` review) · 10 accessibility/PWA polish.
2. Flag follow-ups: show flagged count on the Play tab, optional "return to pending" if a converted shot is deleted.
3. Shot difficulty from effective pocket size (proposal: effective width = mouth × cos(approach angle) − ball diameter → angular margin → aim tolerance → 1–5; placeholder mouths ≈4.5" corner / 5" side, adjustable in Settings).
4. Rating balancing using the user's logged pro matches (edit `ratingConfig.ts`).
5. Practice follow-ups: tune `PC` and mastery thresholds on real data; resume an interrupted session; optional pot/position result per attempt; cross-deck practice history screen.
6. Break recommendation engine (explore/exploit, coarse bins first) — deferred.

## Pending decisions
- UX: (now that the chunk 3 sticky bar exists) collapse tip/power on the Break form (after trying the sticky bar)? default "me" player? rename Shots tab to Train? terminology glossary (match vs session vs practice).
- Rank thresholds/anchors after real data; whether Breaks view should also be graphs; trend sparklines.

## Decided against
Per-shot logging, combo/carom tracking, head-to-head Elo, light/dark selector (for now), fluke ball marker per shot.
