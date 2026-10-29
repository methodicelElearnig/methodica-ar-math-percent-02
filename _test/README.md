# `_test/` — the regression gates

**NOT DEPLOYED.** Dev tooling only. Must be excluded from any release package
(`ADDING-REPORTING-AND-RESUME.md` §11.1 — never ship `_test/`).

## What this is for

Track A moves behaviour that is duplicated across the seven parts into one shared layer. The whole
risk of that work is a change nobody notices: a `var`/`function` name declared in both layers is a
**silent last-wins overwrite**, and `js/main.js` loads last — so a leftover part-local copy wins,
the extraction looks finished, and the old code ships (spec §3.3).

`verify-shared.js` exists to make that impossible to miss. It loads the real `index.html`,
`js/motion.js`, `js/partnav.js` and `js/main.js` of all seven parts into jsdom and **executes the
script tags in document order from disk** — it does not call the code in isolation, it runs it. Then
it walks all 66 screens and records a digest of the rendered `#app`.

## Running it

jsdom is **not** in this repo and there is no `package.json`. Do not install it inside the project
folder — the tree is OneDrive-synced and `node_modules` is ~26 MB of pointless sync (spec §10.1).
It is already installed outside the tree:

```bash
NODE_PATH=/c/Users/Vadim/AppData/Local/lomda-test/node_modules node _test/verify-shared.js
```

```bash
NODE_PATH=/c/Users/Vadim/AppData/Local/lomda-test/node_modules node _test/statement-flow.js
```

```bash
NODE_PATH=/c/Users/Vadim/AppData/Local/lomda-test/node_modules node _test/report-flow.js
```

Exit 0 = everything passed. Options:

| | |
|---|---|
| `--update-snapshots` | re-baseline the digests. Only ever deliberately — see below |
| *first positional arg* | a different base path, e.g. a built package to verify |

## The baseline

`snapshots/app-digests.json` is **tracked, and is the gate**. It holds, for each of the 66 screens,
a SHA-256 of the normalised `#app` markup plus a small structural summary (active screen, node
count, `[hidden]` count, length).

A digest is stored rather than the markup because 66 screens of full `#app` HTML is megabytes and
unreadable in a diff; the hash catches *any* change and the summary says what moved before you go
looking. Every run also writes `snapshots/app-digests.current.json` (gitignored) so a failure can be
diffed against the baseline directly.

The unit contains **no `Math.random`, no `Date.now` and no shuffled boards** — verified, not assumed
— so the render is deterministic and a digest change always means the content changed.

> **When a digest moves, that is the harness working.** Either it is a regression, or it is a change
> you intended. Re-baseline with `--update-snapshots` only after you have read the diff and can say
> why every listed screen moved. Re-baselining to make the suite quiet destroys the only record of
> what the pre-extraction render looked like.

## What it asserts

| Group | Assertion |
|---|---|
| `load` | each part loads with **no** `console.error`; exactly one `.screen.active` after boot |
| `screens` | `TOTAL_SCREENS` matches 25/8/15/2/6/6/4; the DOM `.screen` count matches it; `data-screen` is exactly `0..N-1` with no gaps |
| `handlers` | every identifier named in an inline `on*=` attribute is defined after load |
| `layers` | no identifier declared at top level in **both** a shared script and `js/main.js` (hook names excepted) |
| `sweep` | for all 66 screens: `goTo(n)` does not throw, sets `currentScreen`, leaves exactly one active screen, and logs no error |
| `snapshot` | all 66 screen digests match the baseline |
| `urls` | every shared file is referenced at one identical URL across all parts (spec §3.4) |
| `stale` | after the engine retirement, no per-part engine copy and no `_*-engine/` folder remains |
| `map` | the per-part xAPI config block: key count and contiguity, two-way coverage against `metadata/`, `xapiItemId()` byte-equality with the catalogue, `XAPI_EVAL_ITEMS` sanity, and the grouping cross-check below |
| `sites` | P2 call-site coverage, asked from the catalogue side: every graded question has an `xapiAnswered` call, every reported id exists in `metadata/`, every part ends its component via `xapiEndComponent` (report, then disable the button), and **nothing** reports the unit — `xapiCompleteUnit` is gone (2026-09-16) |
| `routing` / `devnav` | **The platform routes** (2026-09-16). Source scan of every shipped script: no unit-level statement; every `location.href =` / `location.replace(` behind an `if (!DEV_NAV) return` in its own function; the loader's resume hop gone; `DEV_NAV` needs `?dev=1` **and** no `?registration`; `PartNav.forward/back/forwardOverride/mountBack` all gated; part 07's `s3vFinish` reports nothing and `s3vEnd` (the second `#s3v-check` click) ends the component. Live production boots of all seven parts: `DEV_NAV === false`, `xapiCompleteUnit` undefined, `forwardOverride() === null`, `#s0-back` keeps `.hidden`, `PartNav.back()` leaves the trail alone, the last screen has a `.btn-continue` to disable. Three boots of part 03: no query / `?dev=1` / `?dev=1&registration=r1` |
| `shape` / `isolation` / `retake` / `character` | **One document per component** (2026-09-16, state v5). `emptyUnitState()` is exactly `{v:5, component, payload, done, doneItems, ui, results}`; a v4 document migrates in place (payload = this part's slot; ledgers, character and verdicts kept; `part`/`prev`/`parts` dropped); other versions discarded; a document naming another part is discarded with `console.warn`; `RESUME_STATE_ID` carries the slug. Two parts under two registrations → two documents, no cross-trace. Re-take: an absent document leaves every verdict null and `basicPracticePassed()` false while the mirrors still say `pass`, the ledger is empty, `completed` goes out again, the character is adopted. The character's four steps (`adoptUnitCharacter`), "never deletes the mirror", phase B persists, `?resetState` adopts nothing. Source scan: no `.part`/`.prev`/`.parts[`, no `applyUnitProfile`, `RESULT_KEYS` is this unit's four keys, the hatch calls `PartNav.clearTrail()`. `resume-flow.js` adds `reset` (the four live mirrors, the character mirror and PartNav's two keys all cleared) and the v4 → v5 migration case |
| `report` | the issue-report markup contract: three dialogs, each starting `hidden`, inside `#app` and outside every `.screen`; the custom select; the submit-gate selectors; and the `[hidden]` CSS override |

Two groups report as **notes** rather than failures while the pre-extraction arrangement is still
the live one, and become assertions as Track A lands:

- **`?v=`** — there is none on any asset today. That is itself a defect (a released `main.js` is
  served stale to returning learners) and adding it is a Track A deliverable.
- **generated copies** — 21 per-part engine copies and both `_*-engine/` folders are still present.
  After the retirement step this must be 0 and 0, with both sync `.ps1` scripts deleted.

## The `layers` scan, and why it is two-layered

The static scan reads top-level declarations at brace depth 0 from every script a part loads and
compares them against `js/main.js`. Depth 0 only: anything inside a function or an IIFE is
module-private and cannot collide. Today the engines contribute exactly one name, `PartNav`
(`motion.js` is a bare IIFE that assigns `window.Motion` from inside).

The hook names are the expected exceptions — they are *supposed* to live per-part and be read by the
shared layer at call time (§3.3, §8.7): `TOTAL_SCREENS`, `currentScreen`, `resetScreenState`,
`advanceScreen`, `goBack`, `partScreenLeave`, `partBoot`, the four resume hooks, and the xAPI config
seams.

## The `map` group — checking `SCREEN_TO_SUBCONTENT` without a runtime

A wrong screen-to-item map cannot be caught by running the lomda. It produces a real, well-formed
statement about the **wrong catalogue item**, and Kata accepts it silently (spec §4.2). Worse, the
raw material for the map is gone: `mapping.txt` (slide → item) was dropped from the metadata export,
so every entry was derived by matching screen text against `metadata/`.

So the map is checked from three directions, two of which are worth calling out because a plain
runtime read of the object cannot make them:

- **Source key count vs runtime key count.** A duplicated key — `{0: null, … 0: ['001', 1]}` — is
  legal JS and the last one silently wins, so the loaded object shows one key fewer and merely looks
  short. Counting the numeric-key lines in the source text is the only way to see it.

- **The grouping cross-check.** Parts 02, 03 and 05 already declare which screens make up one
  on-screen question (`PRACTICE_QUESTIONS` / `STANDARD_QUESTIONS`), authored from the content long
  before any of this work; the catalogue items were authored from the same content by someone else at
  another time. Requiring the two to agree — every screen of one question maps to one suffix, and no
  two questions share a suffix — validates the derived map against an **independent witness** rather
  than against one person's reading of the Hebrew. All three parts agree today, and this is what
  catches a future renumbering on either side.

`xapiItemId()` is also called for every mapped suffix and compared byte-for-byte with the id in
`metadata/`, which pins `XAPI_ID_PREFIX`, `XAPI_COMP_SLUG`, `XAPI_COMP_ID` and the trailing slash in
one comparison.

Two lists at the top of the group are deliberately load-bearing, and both are asserted in **both**
directions so neither can rot:

| | |
|---|---|
| `MAP_PENDING` | parts with no config block yet. Currently `[]` — all seven are mapped |
| `MAP_UNMAPPED_OK` | catalogue items with no screen in their own component's part, with the reason. Currently `{}` |

`MAP_UNMAPPED_OK` is empty, and that is the point. It briefly held `{'02': ['001','002']}`:
component `-02`'s first two items (the two שאלת חימום warm-ups) are code part **01**'s screens
21–24, and since a part reports exactly one component, leaving them there made them unreportable —
4 of the unit's 44 questions. They were moved to component `-01` as items `008`/`009`, which emptied
both lists. The "not stale" assertion is what forced this list to be cleared rather than left behind.

## `statement-flow.js` — what the wiring EMITS

`verify-shared.js` proves the wiring exists and is silent off-platform. It cannot prove that a call
fires on the right branch, that `isLast` ever becomes `answered.last`, or that a `completed` is not
sent twice — all three are invisible to a static scan and to the learner.

So `statement-flow.js` stubs `sendStatement720` into a log, turns `XAPI_USING_G` on, injects
`window.METADATA` from `metadata/`, and drives real interactions. Three things are worth knowing
before editing it:

- **It proves payload shape and ORDER, not arrival.** The CDN library is never loaded. Arrival needs
  a live Kata run (§12) and nothing here substitutes for it. What a stub *does* prove is the class of
  bug a live run makes almost impossible to spot: a statement sent twice, one not sent at all, or one
  pointing at an id the catalogue does not contain. Kata accepts all three silently.

- **⚠️ One fresh jsdom realm per assertion, and this is not tidiness.** `sendCompletedOnce()`
  suppresses a second `completed` for the same object, the ledger lives in a module-scope variable in
  `40-resume.js` that is *not* reachable from `window`, and it is per page load. Two assertions that
  each expect to see a `completed` for the same item therefore cannot share a realm — the first
  consumes it and the second sees nothing. That is the ledger working correctly, and it reads exactly
  like a phantom failure. It cost that during this file's own bring-up.

- **The platform owns routing (2026-09-16).** `checkCompletion` now asserts that every exit reports
  the component and disables the button, that nothing unit-level leaves (06 passed, 07), that the
  routers still hand their destination to `PartNav.forward` (stubbed here; inert in production,
  which `resume-flow.js` proves with production and `?dev=1` twins), and that part 07's component
  `completed` moved from the resolution (`s3vFinish`) to the second click of `#s3v-check`
  (`s3vEnd`) — Kata removes the part on `completed`, so it must be the learner's last click.

- **The challenge threshold (MOE 2026-10-08).** Part 05 ("בואו נאתגר") reports its real score over
  its 5 declared questions, and `success` only at ≥ 0.6. `checkCompletion` runs 0, 2, 3, 4 and 5 of 5
  correct, one realm each. It expects `false:0, false:0.4, true:0.6, true:0.8, true:1`, so 3 of 5 is
  the inclusive edge. It fails on the previous all-five-right rule.

- **The item-pair checks are generic**, driven from each part's own `SCREEN_TO_SUBCONTENT`, so all
  seven parts are covered rather than one example: opening an item, paging *within* one item (zero
  statements), crossing to another (`completed` then `initialized`, in that order), entering a `null`
  screen, and re-entering a closed item (a second `initialized`, no second `completed`).

### A real bug this found before it could ship

`xapiOnScreen(n)` was **not** wired into the shared `goTo`. `50-loader.js` calls it once for the
landing screen — the opening screen has `.active` hard-coded in the markup and never passes through
`goTo` — and nothing called it again. Every `SCREEN_TO_SUBCONTENT` map in the unit would have been
dead weight, with no error anywhere.

### And one in the ledger, which the spec warns about in passing

`readUnitState()` is called only inside `if (RESUME_ENABLED)` in `50-loader.js`. With resume off
`_unitState` stayed `null`, so `alreadySent()` always answered false and `markSent()` bailed on its
first line — **the ledger was inert**, and every `completed` could be sent more than once: an item
re-entered and left again, a routing function reached twice, a unit terminal re-run. §6.5 says both
`complete*` helpers depend on the ledger "even if you are not adding resume"; §6.7 calls for a
"minimal fail-open version". `sendCompletedOnce()` now creates an in-memory-only ledger when there
is no document, and `markSent()` skips persistence while `RESUME_ENABLED` is false — persistence
needs `capturePartPayload()`, a P5 hook that does not exist yet and would throw into a `catch` on
every `completed`. Flipping the flag in P4/P5 restores the original path exactly.
## `report-flow.js` — the issue-report dialog

The `report` group in `verify-shared.js` covers §7.1's markup contract statically in all seven parts.
`report-flow.js` drives the dialog itself: it clicks the flag button, works the custom select,
exercises the submit gate and the abandonment confirm, and captures the actual POST body.

It is fully testable off-platform, and that is the point of §7.2's dependency note: issue reporting
needs `window.METADATA` to **load** — the unit and component slugs come from it on every submission —
but it does **not** need statement sending to work. So there is no `?slxapi` here and no CDN library,
only the real `metadata/<part>.json`, injected. `fetch` is stubbed because Google Forms answers with an
opaque response: the code is forbidden from branching on status (`mode: 'no-cors'`), so the request
itself is the only observable.

Two details worth keeping:

- **The flag-button test clicks the inner `.flag-btn-label`, not the button.** That is what proves
  `closest()` delegation rather than a handler bound to the button — a `getElementById`-shaped wiring
  passes a click on the button and fails this. percent-02 has **one** `.flag-btn` per part (7 in
  total, the global-instance shape); the reference unit mixes one-global and one-per-screen for 20
  instances. Delegation is what makes that choice free, so the assertion reports "all N instances"
  and names the first failing index rather than assuming a count.

- **A rejecting `fetch` is expected to log a `console.error`.** `submitReport()` has its own `.catch`.
  So only the happy path asserts a clean console; the failure path asserts that the thank-you still
  appears, because `showReportThanks()` runs on the synchronous path and failure must never block the
  learner.

### What the harness structurally cannot see

jsdom applies **no external CSS**, so nothing here can tell you the dialog looks right — only that the
markup and behaviour are correct. That half was checked in a real browser (part 05, `localhost:8090`):
the overlay aligns to the scaled canvas, the three options render, selecting one swaps the placeholder
for the Hebrew label, the counter tracks (`14 / 250`), submit turns from grey to blue only when both
fields are set, cancelling with unsent input raises the abandonment dialog, and "אני רוצה לדווח"
returns to the form **with the input preserved**. Only `unit-css/25-report.css` and `unit-js/25-report.js`
were requested, both `200`.

⚠️ **Still not covered by anything, and required before release:** one real report sent from each
part and confirmed in the shared 720 response sheet with the right slugs (§7.6). That is the only
test of the actual endpoint, and it is deliberately not automated — the sheet is shared across every
720 unit and the content team reads it.
## Every assertion here has been negative-tested

Per spec §10.4 — five assertions in the reference project initially "passed" while testing nothing.
Each mutation below was confirmed to have landed, then reverted with a byte comparison:

| Mutation | Result |
|---|---|
| `<i id="mutant">` inserted inside a `.screen` | `snapshot` fails, naming `04/s0` and `04/s1` with node counts 95→96 |
| `var PartNav = 1;` prepended to a part's `main.js` | `layers` fails (4 assertions) |
| an inline-handler function renamed | `handlers` fails |
| `goTo` early-returns for `n === 1` | `sweep` fails (`currentScreen` got 0) **and** `snapshot` fails |
| 17 separate mutations of the config blocks | each fails the **named** `map` assertion and nothing else was accepted as a pass |
| 8 mutations of the call sites | each fails the named `sites` assertion |
| 8 mutations aimed at `statement-flow.js` | removing `xapiOnScreen` from `goTo`, disabling the ledger, dropping the attempts half of the `isLast` idiom, collapsing the five-row screen to one result, adding a score to the class task, hard-coding `isLast` true, silencing the unit terminal, and moving a hint call above its guard |
| 6 mutations of the report markup | dropping a dialog's `hidden`, turning the `[hidden]` CSS override into `display:flex`, putting the dialogs inside a `.screen`, adding a second `.report-submit-btn`, reordering the stylesheet links, and breaking a `data-value` |
| 9 mutations of `25-report.js` | breaking the flag delegation, the option handler's hidden-input and label writes, the abandonment branch, an `entry.*` key, the Hebrew label, `no-cors`, the empty item id on an unmapped screen, and making the thank-you wait for the network |

One mutation that **did not** fail is worth recording, because it looked like a broken assertion and
was not: adding an attribute to `#app` **itself** changes nothing, because the digest hashes
`app.innerHTML`, which excludes the element's own attributes. Mutate something *inside* `#app`.

Two findings from negative-testing the `map` group, both recorded because each one *hid* a real
problem behind a green-looking result:

- **Two of those assertions originally crashed instead of failing.** Dereferencing
  `metaById[suffix]` for a suffix absent from `metadata/` threw an uncaught `TypeError` that killed
  the whole run, so the harness reported *nothing* — no failures, no passes, just a stack trace.
  They now skip orphans, which the coverage assertion reports on its own.

- **Three mutations initially "tested nothing" for three different reasons**, and each is a trap
  worth knowing when adding a case: one wrapped the object literal in `Object.assign(...)`, which is
  a **syntax error**, so the part never loaded and a *different* assertion fired; one re-pointed a
  screen whose item was also mapped by two other screens, so the coverage assertion was correctly
  still green; and one replaced a line with the empty string, which is not reversible by the same
  swap (`str.count('')` is not 1), so the restore silently refused and left the mutation on disk.
  That last one was caught only by re-running the baseline at the end of the sweep — which is why
  that final re-run exists.

Two further findings from negative-testing the `sites` group and the flow harness, both recorded
because each made a gate look green while testing nothing:

- **The call-site scan counted COMMENTED-OUT calls as real.** Wrapping part 04's only
  `xapiCompleteComponent()` in a block comment left the count unchanged and the gate green, and the
  same held for a disabled `xapiAnswered` — so coverage could have been satisfied by code that never
  runs. The scan now works on a comment-stripped view (`stripJsComments`). This project had already
  hit the identical bug once, counting `@font-face` inside a comment.

- **A mutation whose restore string was not unique left the file mutated.** The case deleted a hint's
  `if (sNAnswered) return;` guard and tried to restore by matching the comment that followed, which
  appears once per hint in part 01 — so the restore refused, and the sweep's own final baseline
  re-run did not catch it because no assertion covered that part's hint at the time. Both halves are
  fixed: the swap is now unique in both directions, and there is an assertion (with a control) for a
  guarded hint. **When adding a mutation, check that BOTH strings are unique, not just the first.**

One more trap from negative-testing the report work, worth knowing before adding a case:

- **A multi-line anchor must match the target file's line endings.** `unit-js/25-report.js` and
  `unit-css/25-report.css` are CRLF (they were copied from the reference unit that way) while every
  `index.html` here is LF, and the mutation tables read files untranslated. Anchors are written with
  `\n`, so multi-line ones silently failed to match the CRLF files while single-line ones matched
  everywhere — which disguised a systematic problem as one broken case. `swap()` now normalises the
  anchor to the file's own newline. This is the third time this project has lost time to a
  Windows/POSIX line-ending or path-form mismatch.
