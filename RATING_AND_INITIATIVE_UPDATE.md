# Chalk Talk — Update spec: rename "control" → "initiative", rebuild the rating, new rank badge

Give a fresh Claude chat this file together with `CLAUDE.md`, `PROJECT_STATE.md`, `UX_HANDOFF.md`, `STATS_CONTROL_SPEC.md` (the earlier spec; this file **amends** it) and the source files in section 8. Everything here is derived from existing `visit`/`break` records; **no new logged fields**. Rules of engagement (one chunk at a time, state the plan first, full changed files, derived-not-stored, compact style, say "unverified" when typecheck/build can't run) are in `CLAUDE.md` and `UX_HANDOFF.md`.

**Prompt to paste at the start of the new chat:**
> I'm continuing work on Chalk Talk, a 9-ball logging PWA. Attached: `CLAUDE.md`, `PROJECT_STATE.md`, `UX_HANDOFF.md`, `STATS_CONTROL_SPEC.md`, and `RATING_AND_INITIATIVE_UPDATE.md` (read it fully first; it amends the earlier spec), plus the source files it lists. Work one chunk at a time, starting with R3 (the rename) unless I say otherwise: state your plan and any decision you need before coding, then deliver full changed files plus updated docs, and say "unverified" if you can't run typecheck/build. If you need a file I didn't attach, ask for it by name.

Status assumption: the user has already implemented the stats redesign from `STATS_CONTROL_SPEC.md` (derivation + Review layout), with "control" wording. This file is the follow-up. **Ask for the user's implemented derivation file (probably `control.ts`) and current `Review.tsx` before coding; names may differ from the old spec.**

---

## Part A — Rename "control" to "initiative" (UI strings and docs only)

Why: in pool "control" usually means cue-ball control (position play), and one loss reason is literally "Position error". The idea is who is dictating the rack (alpha/beta), which we call **initiative**. **The definition does not change**: initiative is *held* when the opponent's next opening is No shot or Hard; *lost* when it is Easy; a won rack is its own outcome.

| Old text | New text |
|---|---|
| Card title "Control" | "Initiative" |
| "You kept control on 45 of your 63 chances." | "You held the initiative on 45 of your 63 chances." |
| Bar segments: Won the rack / Kept control / Gave up control | Won the rack / Held the initiative / Lost the initiative |
| "How control was lost" | "How the initiative was lost" |
| "N more errors didn't cost you control" | "N more errors didn't cost you the initiative" |
| Section 3.2/3.3 headings and prose in specs and docs ("Gave up control", "Kept control", "control kept") | "Lost the initiative", "Held the initiative", "initiative held" |
| aria-labels, legends, sheet titles (tap-to-trace), empty-state text | same substitutions |

Notes:
- Do a case-insensitive search for `control` across `src/` and the docs and review each hit; **leave unrelated uses alone** (e.g. real cue-ball control, DOM "controls", comments about form controls).
- Code identifiers (`control.ts`, function/variable names) may stay as they are to keep the diff small; renaming them to `initiative` is optional. If renamed, do it in one mechanical pass.
- Update the business-rules wording in `CLAUDE.md`, `PROJECT_STATE.md`, `UX_HANDOFF.md`, and mark `STATS_CONTROL_SPEC.md` as superseded in its wording by this file (or regenerate it with the substitutions).

## Part B — Rating rebuild

### B1. Decisions (settled with the user)
- The rating is for **the user's own progress** and to see how far they are from stronger players. It is **not benchmarked against pros inside the app**: the app stays flexible (view your own stats, friends, pros — all are just players in the Review player dropdown, and "Compare with…" draws any other player on the radar). The scale is **balanced so logged pros land at the top**, by tuning anchors/cutoffs from data (B6), not by hard-coding a pro benchmark.
- **Ranking stays** (F D C B A S SS SSS).
- **Initiative is not an input** to the rating. It is a per-chance rate and stays the page's headline, but the error and defence attributes already add up to it, so including it would double count. (It is correct that initiative-held is not opponent-dependent per chance; only the *number* of chances varies.)
- **All attributes are "higher is better"** (every rate is expressed as a clean/success rate, never an error rate) so rows, the radar and arrows all read the same way.
- **Count every Easy-opening error** (any `Missed`/`Foul` with the relevant cause), whether or not it cost the initiative. The page's "How the initiative was lost" list still shows only the costly ones.
- **Discipline is retired.** Fouls are inside the error rates and escapes are in Defence. **Decision replaces it** as the sixth axis. Progress-over-time features are **out of scope** (later).

### B2. Attributes
Order is unchanged so existing code keeps working: `ATTRS = ['Finishing','Potting','Position','Break','Defence','Decision']`. Use the same exclusions as the stats spec: skip Scotch (`sp`/`bp`) records and push-outs; "chance" = Easy/Hard opening visit; "resolved" = won, or has a next visit (see `STATS_CONTROL_SPEC.md` section 3).

Scoring helper (existing `sc`): `score(rate,[lo,hi]) = clamp((rate−lo)/(hi−lo)·100, 0, 100)`. The anchors below are **placeholders** (B6).

| Attribute | Rate (higher = better) | n (for confidence) | Sessions counted |
|---|---|---|---|
| **Finishing** | Run-out rate, **per length bucket** (6+, 3–5, 1–2 balls at visit start, from `walk()`), each bucket scored on its own, then the **mean of buckets that have ≥5 chances** (a bucket under 5 is left out). Break-and-run visits are excluded here (they belong to Break). | chance visits in the buckets | matches + solo |
| **Potting** | **Per ball**, Easy-opening visits only: `made / (made + potErrors)`. `made` = balls potted in the visit minus fluke balls (`max(0, potted.length − fl.length)`); potErrors = 1 if the visit ended in `Missed`/`Foul` with `cause='Pot'`. | `made + potErrors` (balls) | matches + solo |
| **Position** | **Per ball**, Easy-opening visits only: `posOK / (posOK + posFail)`. Per visit: `posOK += max(0, made−1)` (every ball except the last was left position for the next shot) `+ 1` if `made>0` and the visit ended on a pot error (the last ball's position was fine); `posFail += 1` if the visit ended in `Missed`/`Foul` with `cause='Position'`. A rack won or a safety adds nothing for the last ball. | `posOK + posFail` (balls) | matches + solo |
| **Break** | **Unchanged** (existing formula in `rating.ts`); the break area is being reworked separately | breaks | as today |
| **Defence** | Mean of the components that have data: (a) **forced-error rate** = (forced escape + forced miss + forced foul) / resolved safeties; (b) **safe rate** = `1 − leftEasy / resolved safeties` (outcomes as in stats spec 3.4); (c) **escape success** = made / attempted (stats spec 3.5) | resolved safeties + escape attempts | (a),(b) matches only; (c) matches + solo |
| **Decision** | `1 − (easyDecisionErrors + gamblesLost) / resolvedChances`, where easyDecisionErrors = Easy-opening `Missed`/`Foul` with `cause='Decision'` (all of them), and **gamblesLost** = Hard-opening `Missed`/`Foul` that left the opponent an Easy opening (stats spec 3.3, reason 3) | resolved chances | matches only (needs the opponent's next opening) |

Notes:
- Counting gambles lost here is a **rating-only** choice the user asked for. The page keeps describing gambles neutrally (no "bad decision" label on the Hard-shots block).
- Defence components (a) and (b) overlap (forced ⊂ not-left-easy). Accepted for now; if it reads too generous, weight them in `ratingConfig` rather than redesigning.
- Break-and-run is **not** double counted: it is in Break (existing `brkRun`, which today counts any rack win on the breaker's next visit, not strictly a run-out; leave until the Break rework) and excluded from Finishing's buckets.
- Keep `attrs(pid, groups)` returning the same shape `{raw, n, adj, prov, conf}[]` (`adj = raw`, no shrinkage; `n = 0` ⇒ attribute left out of the rating and shown as a 50 placeholder on the radar as today) so the radar, attribute rows, "Work on" line, Compare, delta/trend code in `Review.tsx` and `delta.ts` keep working.
- **Do not duplicate the per-visit classification**: reuse the user's implemented initiative derivation (error reasons, safety outcomes, gamble-lost flag, post-own-break visit detection) so the page and the rating can never disagree. If it only returns aggregates, add a small shared per-visit classifier and have both use it.

Worked example (placeholder anchors): `made` 100 balls and 8 pot errors → 100/108 = .926 → Potting `(0.926−0.75)/(0.97−0.75)` = 80.0. `posOK` 70, `posFail` 10 → .875 → Position `(0.875−0.60)/(0.93−0.60)` = 83.3. 80 resolved chances, 2 Easy Decision errors + 3 gambles lost → clean .9375 → Decision `(0.9375−0.85)/(0.99−0.85)` = 62.5 (Decision stays per resolved chance because gambles lost come from Hard openings).

### B3. Overall rating
Unchanged mechanism: weighted mean of the attributes that have data (`n>0`), weights renormalised over those, ×10; no data = 500. Weights in attribute order (`W`): **Finishing .25 · Potting .15 · Position .15 · Break .20 · Defence .15 · Decision .10** (sum 1.0; placeholders). Confidence = Σ weight × min(1, n/PROV) and the "provisional below 75% confidence" rule are unchanged. `rating(a, only)` (like-for-like comparison) is unchanged.

### B4. Starting anchors and provisional sizes (all placeholders; live in `ratingConfig.ts`)
| Measure | [score 0 at, score 100 at] |
|---|---|
| Run-out, 6+ balls | [0.05, 0.50] |
| Run-out, 3–5 balls | [0.30, 0.85] |
| Run-out, 1–2 balls | [0.50, 0.95] |
| Potting (per ball) | [0.75, 0.97] (existing) |
| Position (per ball) | [0.60, 0.93] (existing) |
| Decision clean rate | [0.85, 0.99] |
| Forced-error rate (safeties) | [0.05, 0.35] |
| Safe rate (not leaving an easy shot) | [0.45, 0.90] |
| Escape success | [0.20, 0.80] (existing) |

`PROV` (observations before "provisional" drops), in attribute order: **[40, 100, 100, 40, 30, 80]** (Potting/Position counts are balls, so they keep the existing 100). Also: delete the unused `K` array and its stale "shrink toward 50" comment, and move `CONF`/`confLabel` thresholds from `rating.ts` into `ratingConfig.ts` (both are listed debt in `CLAUDE.md`).
Expect the rating numbers and ranks to **jump** after this change (new definitions, uncalibrated anchors); that is fine, but tell the user.

### B5. Radar and attribute rows
Axes become Finishing, Potting, Position, Break, Defence, Decision. Everything else on the rating card (avatar, number + delta, "N to <rank>", confidence line, progress bar, "Work on" line, Compare select + legend, six attribute rows with ▲▼) stays; the "Work on" line already picks the weakest attribute with enough data. The Compare dropdown already lists every non-archived player, which covers friends and pros. A future "who is best at what" view across players is a later feature.

### B6. Calibration (later, but design for it now)
When enough players are logged (the user's own matches, friends, pros): set each measure's **top anchor** near the best logged player's rate (or the 90th percentile), the **bottom anchor** near the weakest logged player, and the **rank cut-offs** at quantiles of all logged players so the best pros land at SS/SSS. Until then keep the existing `RANKS` cut-offs and label the scale **uncalibrated** in the info/rubric screen when that is built (under More, not part of this update). Keep all of it in `ratingConfig.ts` so recalibrating is a data edit.

### B7. Denominators (decided)
Potting and Position are **per ball** (as in the older code), restricted to Easy-opening visits, so a player who pots six balls and then misses is credited for the six. The user agreed. Decision is per resolved chance (B2).

## Part C — Rank badge (replaces the big letter, and fixes the provisional style)

Problem to fix: the provisional rank used `-webkit-text-stroke` with a transparent fill. A text stroke is centred on the glyph outline, so it eats into thin parts (for example the curve of the B runs into its vertical bar). **Do not use text-stroke anywhere.**

Spec:
- New small component (e.g. `Rank` in `Review.tsx` or `ui.tsx`) rendering an **inline SVG badge** ~64×72 on phone: a shield/hexagon shape with the rank letter centred. Props: `r` (letter), `prov` (boolean), `size`. `role="img"`, `aria-label="Rank B"` / `"Rank B, provisional"`.
- Tier styling, restrained but more flashy than today (the *card* stays plain; only the badge gets the treatment): linear gradient fill (lighter top, darker bottom) of the tier colour, a thin light inner highlight stroke, white or dark letter (whichever passes contrast, check ≥4.5:1; dark ink on the light tiers), weight 900. Letters shrink to fit (SS ≈ 26px, SSS ≈ 22px in the 64px badge). For lettering that needs an outline for legibility use `paint-order:stroke` with a thin dark stroke (painted *behind* the fill, so it never thins the glyph).
- Suggested starting palette (fixed tokens in `styles.css`, e.g. `--rk-F`…`--rk-SSS`, **not themeable**, tune after viewing in light, dark and the preset themes): F slate `#7d8f91` · D bronze `#a8693f` · C silver `#8aa0a8` · B blue `#3f86b5` · A emerald `#2f9d73` · S gold `#e0a82e` · SS gold→orange with a soft glow (`filter:drop-shadow`) · SSS prismatic gradient (gold → magenta → cyan) with the glow. Static; no animation (or only if `prefers-reduced-motion` allows).
- **Provisional** (confidence < 75%): same shape and tier hue but washed out: fill at ~18% opacity, **dashed 2px border in the tier colour**, letter in solid `--mute`, caption "Provisional" under it (as today). No outline-only text.
- The progress bar under the rating may take the current tier colour (optional).

## Part D — Suggested chunks (one at a time; user tests on phone between)
- **R1 — rating maths:** `rating.ts` + `ratingConfig.ts` (new attribute definitions via the shared per-visit classifier, `ATTRS` with Decision, `W`, `PROV`, anchors; remove `K`; move `CONF`). `Review.tsx` should need little or no change (axis labels come from `ATTRS`). Check radar, rows, "Work on", Compare and delta still work.
- **R2 — rank badge:** `Rank` component + CSS tokens; replace the letter block in the rating card; provisional variant.
- **R3 — rename pass:** Part A strings across `Review.tsx` (and sheets), docs.
- R3 is cheap and can go first. Update `CLAUDE.md` (business rules for Rating, attributes, "Initiative" definition, remove Discipline), `PROJECT_STATE.md`, `UX_HANDOFF.md` with each chunk and deliver them.

Acceptance checks (manual): attribute values match the worked example on a hand-made session; an attribute with no data is left out and weights renormalise; solo sessions feed Finishing/Potting/Position/escapes but not Decision or safety components; Scotch records are ignored; a rack won after a safety (the "pot 1–3, safety, forced escape, pot 4–9" example) does not hurt Finishing or Defence; provisional badge looks correct for B, SS and SSS in light and dark themes; no `n=` wording introduced.

## Part E — Open items
1. Finishing bucket minimum of 5 chances and the Defence component weights are guesses.
2. Anchors, weights, `PROV`, tier colours and rank cut-offs are placeholders until calibrated.
3. Break attribute formula is untouched and still counts any rack win after the break (not strictly run-out); revisit with the Break rework.

## 8. Files to attach
`CLAUDE.md`, `PROJECT_STATE.md`, `UX_HANDOFF.md`, `STATS_CONTROL_SPEC.md`, this file, and the **latest committed** `rating.ts`, `ratingConfig.ts`, `stats.ts`, `delta.ts`, `Review.tsx`, the user's implemented initiative/control derivation file, `engine.ts`, `Live.tsx` (for `line`/`Ln`), `ui.tsx`, `styles.css`. Ask for any file not listed before guessing.

## 9. Do-not-change reminders
Derived-not-stored; no new logged fields; Break area untouched; semantic colour tokens fixed (`--good --bad --warn`); the rank/radar card layout otherwise as is; dropdown filters; solo ids `<id>~2` resolved through `id.split('~')[0]`; cause remains mandatory on Missed/Foul for Easy/Hard openings (the error rates rely on it); the decided-against list in `PROJECT_STATE.md` (head-to-head Elo, per-shot logging, default "me" player, etc.).
