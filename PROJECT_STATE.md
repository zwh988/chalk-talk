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
- Solo practice sessions (Player 2 = "Myself"): both seats logged as normal, shown as "Name" and "Name (2)", counted in Review and rating (rack-win stats skipped); Review filter: All / Matches only / Solo only.
- GitHub sync, PWA, theme presets + custom colours, status-bar colour follows theme.

## Just shipped, awaiting user test
Decks, practice, stats, adaptive selection, progress view (written without being compiled: run typecheck/build first). Tags + filter, edit session details, landscape layout fix (rail full height, content flush top), Won rack on No shot, dropdown filters, graphs, rating.

## In progress / next
1. Flag follow-ups: show flagged count on the Play tab, optional "return to pending" if a converted shot is deleted.
2. Shot difficulty from effective pocket size (proposal: effective width = mouth × cos(approach angle) − ball diameter → angular margin → aim tolerance → 1–5; placeholder mouths ≈4.5" corner / 5" side, adjustable in Settings).
3. Rating balancing using the user's logged pro matches (edit `ratingConfig.ts`).
4. Practice follow-ups: tune `PC` and mastery thresholds on real data; resume an interrupted session; optional pot/position result per attempt; cross-deck practice history screen.
5. Break recommendation engine (explore/exploit, coarse bins first) — deferred.

## Pending decisions
- Rank thresholds/anchors after real data; whether Breaks view should also be graphs; trend sparklines.

## Decided against
Per-shot logging, combo/carom tracking, head-to-head Elo, light/dark selector (for now), fluke ball marker per shot.
