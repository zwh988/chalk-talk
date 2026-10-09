# Chalk Talk — Player stats redesign ("initiative model"): design spec and context

> **Wording superseded by `RATING_AND_INITIATIVE_UPDATE.md`**: "control" is now "initiative" (Held / Lost the initiative); the definitions are unchanged. Its rating section (8) is also superseded: the rating attributes are rebuilt on this model.

Give a fresh Claude chat this file together with `CLAUDE.md`, `PROJECT_STATE.md`, `UX_HANDOFF.md` and the source files listed in section 11. This spec is the outcome of a long discussion about what the player stats should measure. It replaces the "AI-suggested first cut" for **Review → Players** only. **Review → Breaks is out of scope** (the user will brief it separately; it is complicated). The Easy/Hard/None rubric screen is also out of scope (later, under More).

Working rules are in `CLAUDE.md` and `UX_HANDOFF.md` section 0/2/8 (one chunk at a time, state the plan first, full changed files, derived-not-stored, compact code style, say "unverified" if typecheck/build can't run). Nothing in this spec needs new logged fields: **everything is derived from the existing `visit` / `break` records** (`open`, `res`, `cause`, `potted`, `won`, `runout`, `low`, `push`, `by`, `rack`, plus the opponent's next visit).

---

## 1. Why we are changing it

The current page leads with **run-out rate** ("Run-out from chance"), plus a 0–1000 rating with a big rank letter. Problems found:

1. **Run-out is not the same as holding the initiative.** Example: pot 1–3, play a safety on 4, opponent is forced to escape, then pot 4–9. That is two visits; the first ends in "Safe played" so it counts as a failed chance, and the player shows 50% run-out for a rack they controlled from start to finish. A safety was treated like a miss.
2. **The "Run-out from chance" number is mislabelled.** It counts racks *won* on a chance visit (includes a 9 off a combo), not true run-outs (`runout` = every ball potted in order).
3. **"Safeties held" is the wrong idea.** "No shot" for the next player only means they have no *offensive* shot; they may still safe back. So "no shot" does not prove the safety was good. A safety is only fully effective if the opponent then has to escape and misses/fouls/escapes.
4. **No view of unforced errors / losing control** (bad position, bad pot, bad decision), though cause is already logged.
5. The rating inputs (anchors/weights/ranks) are invented and unvalidated.

## 2. Principles (agreed with the user)

- **The unit is the visit.** Not the rack: control can be kept, lost and regained several times within one rack. Do not build rack-level "control" numbers.
- **Grade the safety and the shooter separately.** A safety is graded only by what the opponent was left (their opening shot, and for "no shot", what they then did). The shooter's own result is never credited/blamed on the previous safety.
- **Gambles are described, never judged.** A hard shot missed that gave the opponent an easy shot is reported neutrally. We cannot know from the data whether attempting it was a bad decision (depends on odds); only the player's own logged `cause = Decision` is a per-visit "decision error". No verdict, not even in aggregate, for now.
- **Player page shows only that player.** No opponent-mirror stats ("errors you forced" is only shown from the player's own safeties' outcomes).
- **No `n=x` in the UI.** Use plain units: "63 chances", "14 safeties", "4 of 11". Thin data gets an **"Early read"** tag (and the existing fade for <5) instead.
- **Headline = Initiative**, with run-out demoted to a "Finishing" block.
- **Terminology is provisional** ("Contained", "Forced an error", "Lost the initiative", "Left an easy shot"). Keep all outcome values distinct in the data so the display wording/grouping can change cheaply.

## 3. Definitions (all derived; use `walk()` from `stats.ts` for each visit's starting table)

Scope for every definition below: visits by the selected player (`isMe(by,pid)`), **excluding Scotch Doubles records** (`d.sp`/`d.bp`, as `playerStats` does) and **excluding push-out visits** (`d.push`) unless stated.

**Opponent-based stats (Initiative, How the initiative was lost, Defence, Hard shots, breaker/receiver) use matches only — skip solo sessions** (both seats are the same player, so "opponent's next opening" is meaningless). Finishing may include solo (it needs no opponent). The existing session-type filter still applies on top; when the filter is "Solo only", show the opponent-based blocks as empty with a one-line note ("Needs matches").

**Next visit** = the next `visit` in the same session and same `rack` after this one (as `stats.ts` already finds it). If none exists (end of session / still in progress), the visit is **pending and excluded** from anything that needs it. If the next visit's `by` is the same side as this visit (e.g. after a push-out pass), treat as unresolved/excluded.

### 3.1 Chance
A visit with `open` = `Easy` or `Hard` (not `push`). The Initiative block's denominator is **resolved chances**: chance visits that either won the rack or have a next visit.

### 3.2 Initiative (per chance visit)
| Outcome | Rule |
|---|---|
| **Won the rack** | `d.won` (includes a 9 off a combo) |
| **Held the initiative** | not won, and the opponent's next visit `open` is `Hard` or `None` |
| **Lost the initiative** | not won, and the opponent's next visit `open` is `Easy` |

Headline number: `(won + kept) / resolved chances`. Plain sentence: "You held the initiative on 45 of your 63 chances."

### 3.3 How the initiative was lost (only visits classed "Lost the initiative")
Classify each into exactly one reason, first match wins:
1. `open === 'Easy'` and `res` ∈ {Missed, Foul} and `cause` ∈ {Pot, Position, Decision} → **Unforced error**, split by cause: *Potting*, *Position*, *Decision*. (This is the agreed unforced-error definition: Easy opening only, and only when it actually cost control.)
2. `open === 'Easy'` and `res` ∈ {Missed, Foul} with `cause` = Other or missing → **Other miss** (grey row; not counted as an unforced error).
3. `open === 'Hard'` and `res` ∈ {Missed, Foul} → **Hard shot missed, left an easy one** (a "gamble lost"; descriptive).
4. `res === 'Safe played'` → **Safety left an easy shot**.
5. anything else (e.g. escape-type results on a chance visit) → fold into Other miss.

Also show one footnote line: "N more errors didn't cost you the initiative" = Easy-opening Missed/Foul with a cause in Pot/Position/Decision where the initiative was **held** (so unforced-error volume is visible without claiming the initiative was lost).
"Biggest leak: <row>, X of Y" appears only when the number of lost-initiative visits is at least the Early-read threshold (section 7), and only over the three cause rows plus the safety/gamble rows.
**Failed escapes are not in this list** (an escape visit has `open = None`, which is not a chance). They appear in Defence ("Your escapes").

### 3.4 Safety outcomes (the player's `res === 'Safe played'` visits, graded by the opponent's next visit)
| Opponent's next visit | Outcome (keep all as separate values) |
|---|---|
| `open` Easy, or they won the rack | **Left an easy shot** |
| `open` Hard | **Left a hard shot** |
| `open` None and `res` Safe played | **Contained** (unresolved: neither good nor bad) |
| `open` None and `res` Escape hit | **Forced escape** |
| `open` None and `res` Missed | **Forced miss** |
| `open` None and `res` Foul | **Forced foul** (gives the player ball in hand: strongest outcome) |
No next visit → pending, excluded. Display grouping (adjustable later): *Left an easy shot* · *Left a hard shot* · *Contained* · *Forced an error* (= forced escape + miss + foul, with the three-way split shown as a sub-line). The old "safeties held" (None or Hard = held) is **replaced** in the new UI (but see 8: the rating still uses it for now).

### 3.5 Escapes
`open === 'None'` visits whose `res` ∈ {Escape hit, Missed, Foul}: **made X of Y** where made = Escape hit. (`Safe played` on a No-shot opening is a safe-back, not an escape attempt.)

### 3.6 Hard shots (descriptive only; no verdict)
Visits with `open === 'Hard'`, not push, `res` not in {Safe played, Escape hit}: these are **attempts**. **Made** = `potted.length >= 1`. Missed = attempts − made. Of the misses (that are resolved): *gave up an easy shot* (opponent's next `open` Easy) vs *no easy shot given up*. Also list misses by `cause` (Pot / Position / Decision / Other). A missed hard shot is never counted as a forced or unforced error and is never charged to the opponent's previous safety.

### 3.7 Finishing (run-outs)
- **Run-out** = one visit clears the table with every ball potted in order (`d.runout`), from any starting table. A 9 off a combo is a win but **not** a run-out.
- **Run-out by length**, bucketed by balls on the table at the start of the visit (`start.length` from `walk()`), chance visits only: **6+**, **3–5**, **1–2**. Show "ran out X of N" per bucket.
- **Break and run**: counted **only from the player's own break** — the player's break (not `skip`, not `nine`) whose next visit in the rack is by the same player and is a run-out (`won && runout`). Shown as "X of N breaks". **That visit is excluded from the run-out-by-length buckets** (so it is not double counted, and a 9-ball clear from ball-in-hand after the opponent scratched is just a 6+ run-out). *(Assumption to confirm: exclusion of the post-own-break first visit from the buckets.)*
- **Golden break** (9 on the break, `d.nine`) stays its own count ("Golden breaks: N").
- Run-out stays visible but is no longer the headline. The old donut "Run-out from chance" is dropped (its meaning is folded into Initiative's "Won the rack").

### 3.8 Rack win % as breaker / receiver
Per completed rack (has a winning event: `won` visit or `nine` break), matches only. **Breaker** = `by` of the rack's break record (including `skip` records, which still carry `by`). Show "58% racks won as breaker (14 of 24)" and "41% as receiver (11 of 27)". Ignore racks without a winner.

## 4. Page layout (Review → Players), top to bottom

Filter row and legend lines stay as they are after chunk 7 (player / window + type dropdowns; "Faded = …" line). Then:

1. **Rating card — unchanged formatting, moved to the top.** Avatar, rating number + delta, "N to <rank>", confidence line, provisional rank treatment, progress bar, "Work on" line, Compare select + legend, **radar** (the user explicitly wants the radar kept as the overall strengths/weaknesses indicator), six attribute rows with ▲▼. No change to `rating.ts` in the first pass (see 8).
2. **Initiative** (new headline). "71% of chances" big number + one-sentence explanation, stacked bar (Won the rack / Held the initiative / Lost the initiative) with a legend that includes counts, then two small stat tiles: racks won as breaker, racks won as receiver. Card scope label "Last 4 sessions" like other cards (`CH`).
3. **How the initiative was lost.** Takeaway callout ("Biggest leak: Position errors, 6 of 18"), then rows with a thin proportional bar: Position error · Potting error · Decision error (unforced errors, `--bad`) / Safety left an easy shot · Hard shot missed, left an easy one (`--warn`) / Other miss (grey). Footnote line from 3.3.
4. **Finishing.** Rows with proportional bars: Break and run "2 of 9", Ran out from 6+ balls, 3–5 balls, 1–2 balls. Sub-line "Golden breaks: N".
5. **Defence.** A stacked bar of safety outcomes (left an easy shot / left a hard shot / contained / forced an error), the four rows with counts, the forced-error split sub-line (Escape · Miss · Foul), and "Your escapes: made 4 of 7".
6. **Hard shots.** "Made 11 of 20" with bar, "Missed, opponent got an easy shot", "Missed, no easy shot given up", cause split line. Header tag: "Descriptive, no verdict".
7. **Existing cards kept for now under a "More detail" heading** (lowest risk): *Balls run* (conversion + 0/1–2/3–4/5+ distribution) and *Lowest ball left after a miss*. **Removed because superseded:** Run-out from chance donut, Miss and foul causes bar, Defence and discipline, Racks donut.

Not on this page: Breaks section (stays in Review → Breaks, untouched), the rubric link (later, under More).

### Visual spec (see the mockup at https://claude.ai/artifact/NeonMEeottoGTw5Wb6JUde, which shows layout/density but is slightly out of date vs. this spec)
Differences between the mockup and this spec: the rating card goes to the top with its existing formatting and radar; Finishing buckets are 6+ / 3–5 / 1–2 plus break-and-run from the break only; "Failed escape" is not in the loss list; the Breaks block and the rubric link are removed. Sample numbers in the mockup are illustrative and not internally consistent with the final definitions.
- Phone-first, one screen ≈ 6–8 sentences; every block is a `.card` with `<CH t sub/>` header (existing).
- **Colours: use the fixed semantic tokens**, never `--cloth`/`--amber` to mean good/bad (the mockup used teal for "good" only for speed). Won = `--good`; Kept = `--good` mixed ~45% with `--panel` (differs in lightness, not just hue); Gave up = `--bad`; safety/gamble rows = `--warn`; contained/neutral = `--line`/`--mute`. Stacked-bar segments must also differ in lightness (colour-blind safe) and every segment is labelled in the legend with its count.
- Rows: min-height 44px, label left, value right ("6", "4 of 11"), a `›` chevron when tappable (see 6), optional 6px proportional bar underneath.
- Takeaway callout: amber-tinted rounded box, one line.
- Type scale: use the existing `--fs-*` tokens; 12px for sub-lines/legends, 30px for the one big number.
- "Early read" tag: small amber-tinted pill beside a card's scope label; used instead of "n=".
- Tabular numerals are already on at `body`.

## 5. Worked examples (use as acceptance cases)

1. **The motivating example.** P: Easy opening, pots 1–3, `Safe played`. Opponent next visit: `open None`, `res Escape hit`. P's next visit: pots 4–9, `won`, `runout`. Expected: first visit = chance, **Held the initiative** (opponent `None`), safety outcome **Forced escape**; second visit = chance, **Won the rack**. Initiative = 2 of 2. Run-out by length: the second visit counts in the bucket of its starting table size, the first is not a run-out attempt success.
2. **Lost the initiative by position.** P: Easy opening, pots 2 balls, `Missed`, cause Position; opponent next `open Easy`. Expected: **Lost the initiative → Position error**.
3. **Miss that didn't cost the initiative.** Same, but opponent next `open None`. Expected: **Held the initiative**, and it increments "N more errors didn't cost you the initiative".
4. **Gamble lost.** P: Hard opening, `Missed` with 0 potted, opponent next `open Easy`. Expected: Lost the initiative → "Hard shot missed, left an easy one"; Hard shots: attempt, not made, "gave up an easy shot". **Not** an unforced error.
5. **Gamble missed, harmless.** Same but opponent next `open Hard`: Held the initiative; hard shot missed, no easy shot given up.
6. **Safety graded.** P `Safe played`; opponent next `open Hard` → **Left a hard shot** (ineffective); `open None` + `Safe played` → **Contained**; `open None` + `Foul` → **Forced foul**; `open Easy` → **Left an easy shot** (and the same visit is "Lost the initiative → Safety left an easy shot" in 3.3).
7. **Break and run vs 9-ball chance run.** Breaker's break then same player's next visit wins with `runout` → counts in Break and run. A rack where the opponent scratched and P runs all 9 from ball in hand → counts in "6+ run-out", not Break and run.
8. **Pending.** Last visit of a session ending in `Safe played` with no next visit → excluded from the resolved-chance denominator and from safety outcomes.

## 6. Interaction: tap to trace (separate sub-chunk, after the numbers are right)
Every row/bar segment is tappable and opens a `Sheet` listing the visits behind that number (session date/opponent, rack, and the plain-text line via `Ln`/`line()` from `Live.tsx`), newest first. This keeps the app's original goal of traceable stats. Implementation hint: the new derivation returns, next to each count, the list of event records that produced it (so counts and drill-downs can never disagree). No deep link into History in v1.

## 7. Thin-data handling and config
- Replace `n=` wording with units everywhere on this page. Keep the n<5 fade on rows; add the **Early read** tag on a card when its main denominator is small (proposal: Initiative < 30 chances, safeties < 10, hard shots < 10; put these in a config file next to `ratingConfig.ts`, not inline).
- No trend arrows on the new blocks in the first pass (noise: a match has a handful of chances). Existing arrows on the rating card stay. A later step: count-based windows (e.g. last N chances) and "no clear change" instead of arrows.

## 8. What stays as is, and follow-ups to decide later
- **`rating.ts` / `ratingConfig.ts` unchanged** in the first pass. Known mismatch: Finishing uses run-out/conversion and Defence uses "held" (None/Hard = held), which no longer match the new definitions. Re-basing the six attributes on the initiative model (and calibrating anchors on the user's logged pro matches) is a later, separate decision. Rank stays provisional below 75% confidence.
- "Work on" line stays attribute-based for now; a later option is to base it on the biggest initiative leak.
- `delta.ts` (`periods`, `ppDelta`) unchanged.
- Review → Breaks, History, Live are unaffected. (`Ln`/`line` from Live are reused for drill-downs.)

## 9. Suggested implementation chunks (one at a time; user tests on phone between)
- **S1 — derivation only**: new `control.ts` (pure functions over the same `groups: Rec[][]` that `playerStats` takes; use `walk()`; return counts **and** the contributing event lists). Do not change `playerStats` outputs (rating depends on them). Provide a short manual check list from section 5. No UI change; if desired, expose a temporary read-out to verify numbers against real data before building UI.
- **S2 — Review layout**: reorder (rating card to top), Initiative + How the initiative was lost blocks, remove superseded cards, "More detail" heading, `CH` scope labels, Early-read tags, CSS for stacked bar/rows/callout (extend `styles.css`, honour semantic tokens).
- **S3 — Finishing, Defence, Hard shots blocks.**
- **S4 — tap-to-trace sheets.**
Update `CLAUDE.md` (business rules: control definition, safety outcomes, break-and-run = from the break, solo/Scotch exclusions), `PROJECT_STATE.md` and `UX_HANDOFF.md` with each chunk.

## 10. Open questions for the user (ask before/while building)
1. Confirm: first visit after the player's own break is excluded from the run-out-by-length buckets (counted only as break-and-run).
2. Confirm: keep *Balls run* and *Lowest ball left after a miss* under "More detail", or drop them?
3. Early-read thresholds (30 chances / 10 safeties / 10 hard shots) acceptable?
4. Wording of outcomes ("Contained", "Forced an error", "Lost the initiative", "Left an easy shot") — fine for now, finalise during the terminology pass.
5. When the type filter is "Solo only": show opponent-based blocks empty with a note (proposed), or hide them?
6. Later: re-base the rating attributes on the initiative model and the "Work on" line on the biggest leak.

## 11. Files to attach to the implementation chat
`CLAUDE.md`, `PROJECT_STATE.md`, `UX_HANDOFF.md`, this file, and the **latest committed** versions of: `Review.tsx`, `stats.ts`, `rating.ts`, `ratingConfig.ts`, `delta.ts`, `engine.ts`, `Live.tsx` (for `line`/`Ln`/`lineP`), `ui.tsx` (for `Sheet`), `db.ts`, `styles.css`, `App.tsx` (only if the Review wrapper changes). If you can, also attach a screenshot of the mockup. Ask for any file not listed before guessing.

## 12. Do-not-change reminders (from `UX_HANDOFF.md` section 6)
Derived-not-stored; soft-delete event log; amber primary CTA; semantic colour tokens fixed; dropdown filters; restrained rank/radar card; n/size of data always visible to the user (now phrased in plain units); cause required on Missed/Foul for Easy/Hard openings (this spec relies on it); solo ids `<id>~2` resolved through `id.split('~')[0]`.
