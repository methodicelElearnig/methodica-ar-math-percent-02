# The live Kata verification run — percent-02

Everything in `_test/` is a stub. Reporting and resume are **not verified** until they have run
against the real platform. This is the handoff for that run (§12 of
`Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`), with the parts specific to
this unit filled in.

## Before you start

⚠️ **The launch link carries a live `Authorization: Bearer <token>` inside `?slxapi`.** Do not paste
the URL, the envelope, or the token into a transcript, a chat, a log or a file. Report booleans,
status codes and redacted values only. Use a **test learner** — the run writes a full attempt to
that registration. Have the token rotated afterwards.

**Deploy first.** The run must happen against the deployed unit if Kata's CORS policy only allows
the production origin. (Observed 2026-08-17 in a sibling unit: the cross-origin call from
`lomdot.education.gov.il` to `kata.cet.ac.il` is permitted.)

**Deploy order is not negotiable** — see `PACKAGING.md`. `xapi-720-k.js` must be on the CDN
*before* the unit, all seven parts atomically, and the library verified **by size and signature,
not `HTTP 200`**.

## What this unit should show at preflight

| | expected |
|---|---|
| `XAPI_DISABLED` | `false` |
| `XAPI_USING_G` | `true` |
| library letter | **`-k`** — derived from `RESUME_ENABLED`, which is `true` |
| `window.XAPI_UNIT_ID` | `methodica-math-percent-02` — a **bare slug**, not an IRI (v2.5 §2.7) |
| `XAPI_COMP_ID` | `<prefix><comp-slug>/` — **trailing slash**, and it must equal `METADATA.id` |
| `registration` | present |
| state URL path | `/api/v1/xapi/activities/state` |
| `?v=` on every shared file | `2`, identical across all seven parts |

The id prefix is
`https://lomdot.education.gov.il/metodica/720active/math/percent/02/`, all lowercase.

## Probe order — check `stateLastResult720()` after each

| # | Probe | Expect |
|---|---|---|
| 1 | Preflight | the table above |
| 2 | First read | **`404` → `reason:'absent'`, `ok:true`** |
| 3 | Write, then read back | `204` → `ok`; then `200` → `ok` with a valid state document |
| 4 | Answer, reload | Lands on the saved screen, fully painted; `XAPI_DISABLED` still `false` |
| 5 | Ledger | After the reload, re-cross a completed item boundary several times → **zero `completed`**, `initialized` still fires |
| 6 | Cross-part hop | Pointer moved, back-edge recorded, query string survived, Back resolves to the recorded part |
| 7 | Cleanup | `?resetState` empties the document and strips itself from the URL |

**Probe 2 is the most informative single result.** A clean 404 proves in one shot that the URL is
right, the **token was accepted** (a bad one returns 401), the registration is valid, and there is
simply no state yet. Under `-j` all of those were an indistinguishable `null` — which is the whole
reason `-k` exists.

**Probe 5 is the real proof.** After a full page load the library's own one-`completed`-per-load
dedupe no longer exists, so only the ledger stored in Kata's document can suppress the second send.

⚠️ **§12's probe 3 says "a valid v3 document". That is stale** — the state document has been **v4**
since 2026-08-20, and this unit writes v4: `part`, `parts`, `prev`, `done`, `doneItems`, `ui`,
`results`. Check for those keys, not for a `v3` marker.

## What to exercise, per part

Probe 4 needs a screen whose restore is non-trivial. The cheapest per shape:

| Part | Screen to answer before reloading | What must come back |
|---|---|---|
| 01 | `s8` (field group) or `s15` (guided pick) | typed values + marks; and for the guided picks, the reveal |
| 02 | `s5` (multi-select) | the whole correct set re-revealed, not just the learner's picks |
| 03 | `s3v` (single value) | the value, its mark, and the popup |
| 04 | — | nothing to paint; an open class task. Confirm it still reports `initialized`/`completed` |
| 05 | `s2v` (field group) | values + per-field marks |
| 06 | `s2v` then the climax exit | the `06-climax` verdict in `results`, and terminal A's unit `completed` |
| 07 | `s3v` (field group) | the learner's own final-wrong values, **not** the revealed solution |

⚠️ **Part 01 also carries ROUTING state that is not per-screen:**
`lomdaState.selectedCalcMethod` / `selectedCalcMethod2` decide the fraction-vs-proportion track and
the S8/S12 reconvergence, and they live on `window.lomdaState` rather than in a `let`. If a reload
puts the learner back on the right screen but down the *other* track, that is what broke.

## The four gate verdicts to confirm in `results`

Persisted at the moment the decision is made, beside `xapiCompleteComponent`:
`02-practice`, `03-basic`, `03-standard`, `06-climax`. Their point is that a learner who resumes
mid-unit is **not** re-scored 0 and routed into remediation they had already passed — so the
check that matters is: pass part 02, resume, and confirm you are **not** sent to part 03.

## Two limitations you will hit (§12.1)

- **`GET /api/v1/xapi/statements` returns 401 with the reporting token.** It may *write* statements
  and read/write state, but not **search** statements. So the no-duplicate property cannot be
  confirmed from the LRS side. Verify from the lomda side: wrap `sendStatement720` in a counting
  **pass-through** (observe, never replace) and read the ledger out of the live document.
  Confirming from Kata's side needs a platform `X-API-Key`.
- **Deleting test data.** `DELETE` on the state resource removes the resume document (`204`, then a
  verifying `GET` gives `404`). It does **not** remove ingested statements — a separate store,
  needing platform-side action.

## Also not automatable, and required before release

**One real issue report from each of the seven parts**, confirmed in the shared 720 response sheet
with the right slugs (§7.6). This is the only test of the live Google Form endpoint — `report-flow.js`
stubs `fetch` and asserts the POST body, which proves everything except that the endpoint accepts
it. The unit slug field should read `methodica-math-percent-02`.

## Known-open, neither blocking (§13)

- **Multi-tab.** Every save writes the whole document from a possibly-stale in-memory copy, so two
  tabs on one launch can clobber each other — a stale write can resurrect a `done` entry and send a
  duplicate `completed`. Accepted because a classroom launch is single-tab in practice. Kata does
  support opt-in `If-Match`/ETag; the library is deliberately ETag-unaware.
- **Deep launch.** Kata's model is one state document per learner–component pair.
