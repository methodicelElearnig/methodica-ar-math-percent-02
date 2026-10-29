'use strict';
/* ═══════════════════ xAPI (720) — identity ═══════════════════
   Shared by all seven parts of methodica-math-percent-02. Loaded first of the
   reporting files. DEFINITION-ONLY per §3.2.

   Ported from methodica-science-mass-measure-02 and rewritten for this unit,
   because two of the three values here differ and one of them differs in a way
   that unit does NOT anticipate. Everything else in the reporting layer
   (20-xapi.js, 25-report.js, 40-resume.js, 50-loader.js) is copied verbatim.

   ── THE ID CONVENTION, VERIFIED AGAINST metadata/ (2026-09-09) ──
   §4.2 says check this, never infer it, because it has been guessed wrong in
   both directions across the family. Checked against the real files:

     unit       methodica-math-percent-02                      NO prefix, NO slash
     component  <prefix>methodica-math-percent-02-0N/          trailing slash
     item       <component><comp-slug>-NNN/                    trailing slash
     question   <item>qN                                       no slash

   All lowercase, everywhere: the reported slug, the folder names on disk and
   the internal storage keys. Kata derives uniqueKey from the last path segment
   of the reported id, so case matters there; and the slug follows metadata/,
   not the folder name.

   The check is not manual: 50-loader.js compares XAPI_COMP_ID against
   window.METADATA.id on every load of every part and shouts to the console on
   a mismatch — including one trailing slash or one capital letter. */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720active/math/percent/02/';

/* ⚠️ THE UNIT ID IS A PLAIN SLUG HERE, NOT AN IRI — AND THAT IS CORRECT.
   This is the one place percent-02 deliberately departs from
   mass-measure-02, which uses XAPI_ID_PREFIX + '<unit-slug>/'.

   720 standard v2.5 §2.7 dropped the IRI requirement for the CONTENT UNIT id
   (component and item ids are still required to be IRIs, and above they are).
   This unit's catalogue entry — verified by reading it back out of Kata — is
   the bare slug, and metadata/methodica-math-percent-02_unit.json matches. The
   value reported MUST equal what the catalogue holds byte for byte, so it is
   the slug.

   mass-measure-02's metadata was authored 2026-08-12, five days BEFORE v2.5,
   and is v2.4-shaped: full-IRI unit id, singular targetSector, array
   targetAudience, prerequisiteLearningObjective still present. Copy its CODE,
   not its metadata shape. Do not "fix" this line to match it.

   §6.1's warning still holds and is worth restating, because it is why this
   is a slug and not the prefix: Kata derives uniqueKey from the LAST path
   segment, so the prefix alone would yield uniqueKey = "02" and collide with
   every unit 02 in every subject. That mistake has shipped once in this
   family. The bare slug's last segment is methodica-math-percent-02 — unique.

   Two consumers to keep in mind if this ever changes: shortId() below returns
   it unchanged (which is what issue reporting posts as the unit slug, §7.2),
   and it is interpolated into the library's localStorage fallback state key,
   so it must stay filename-safe. */
window.XAPI_UNIT_ID = 'methodica-math-percent-02';

/* Last segment of a canonical id — the short slug the issue-report form
   records. On the unit id above it is a no-op, by design. */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* ═══ Resume (Kata State API) — ON ═══
   §4.4: "-i if you are shipping reporting WITHOUT resume. -k if with." This
   flag is what 50-loader.js reads to choose, so false loads xapi-720-i.js and
   true loads xapi-720-k.js. It therefore changes REPORTING as well as
   restoration — it is not a resume-only switch. §3.5 wants the library letter
   and the XAPI_USING_G regex moved in the same edit as the flag; here the
   letter is DERIVED from this flag and the regex is /xapi-720-[ghijk]\.js/,
   which already covers both, so there is nothing to keep in sync by hand.
   Leave it that way rather than hardcoding a letter.

   Turned on 2026-09-10, after all four preconditions below were met and
   negative-tested. Each one, if missing, ships a unit that LOOKS restored and
   is not — so if you ever need to switch back to reporting-only, false is an
   explicitly supported state (§0) and none of this has to be undone.

     1. The four per-part hooks in every js/main.js: capturePartPayload,
        applyResumeVars (its parameter MUST be named `st` — it runs
        eval("… = st.vars[k]") and renaming fails silently), applyResumeDom
        and restoreScreenUI. Without painters, a restored screen looks
        answerable and ignores clicks (§8.7).
        → all 7 parts; 7 family painters in unit-js/45-painters.js.
     2. repaintScreen(n) called from each part's goTo, right after
        classList.add('active') — see the note in 30-nav.js for where.
        → in the shared goTo, deliberately AFTER resetScreenState because this
          unit's goTo order is reversed; the note there explains why.
     3. The boot cover in every index.html, with its dependency-free 800 ms
        failsafe (§8.11).
        → all 7, dropped on every loader exit path including resume-off.
     4. Every ?v= bumped in the same commit (§3.4): a cached older
        40-resume.js reading a newer state document discards it, which
        presents as "resume just stopped working" with nothing in the console.
        → bumped to v=2 in the same commit as this flip.

   And the one §8.3 requires: flushResumeSave() at the 42 interaction entry
   points, so an answer is persisted synchronously rather than by a debounced
   timer that can fire after the forward write. */
var RESUME_ENABLED = true;

/* ── The platform owns routing (2026-09-16; _test/README.md "The platform routes",
   Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md §8.6) ──
   Kata launches each part on its own URL with its own ?registration, and routes on our
   'completed' statements. The unit therefore no longer moves between parts by itself: the
   last-screen buttons report and stop, the first-screen "חזרה" stays hidden, PartNav's trail is
   inert, and the loader's resume hop is gone. The navigation code is kept for local walkthroughs
   behind this flag — and ONLY when the page was not launched by the platform: every Kata launch
   URL carries ?registration, and a hop in a real session would report the next part under this
   part's registration. So the flag is refused outright whenever ?registration is present,
   whatever else the URL says. */
var DEV_NAV = false;
try {
  var _devQ = new URLSearchParams(location.search);
  DEV_NAV = _devQ.get('dev') === '1' && !_devQ.has('registration');
} catch (e) {}
