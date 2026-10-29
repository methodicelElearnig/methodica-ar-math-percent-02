'use strict';

/* ═══════════════════════════════════════════════════════════
   js/main.js — methodica-math-percent-02-02 (part 02)

   Moved from part 01's own S29-S36 during the 2026-08-12 project-
   manager-requested split of the opening teaching section from the
   first standard practice set (renumbered S29→S0 ... S36→S7). Engine
   (scaleApp / goTo / resetScreenState / keyboard nav / dev bridge) and
   the popup/fraction helpers below are carried over from part 01 so
   this part behaves identically. Screen roster:
     S0 — TransitionScreen kickoff ("מסך הזנקה", "5 שאלות"), item -001
     S1 — DropdownQuestion (multi-blank), item -001
     S2 — ValueInputQuestion, item -001
     S3 — MultipleChoiceQuestion, item -001
     S4 — ValueInputQuestion (4-field table), item -002
     S5 — MultipleChoiceQuestion, item -003
     S6 — SingleChoiceQuestion, item -004
     S7 — True/False local-variant template, item -005
   Bump TOTAL_SCREENS as the remaining practice questions are added.
   ═══════════════════════════════════════════════════════════ */

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 8;  // S0-S7 — bump as screens are added


/* ─── Companion character ───────────────────────────────────
   Part 01 WRITES the learner's choice to this namespaced key; every
   later part READS it back. The key string must stay byte-identical to
   part 01's CHARACTER_STORAGE_KEY or the choice silently fails to
   carry over (720-templates → _global-components.md → Companion
   character system → "Cross-part persistence"). This part is
   read-only from the key (per part 01's own screen never restoring a
   previous choice on reload) — same contract as every other later part.
   ─────────────────────────────────────────────────────────── */
const CHARACTER_STORAGE_KEY = 'methodica_math_percent_02_selectedCharacter';
const DEFAULT_CHARACTER = 'character-1';

/* S0's own companion character videos — decorative "Read" clip, one per
   character (ported from part 01's own S29_CHARACTER_VIDEOS, renamed). */
const S0_CHARACTER_VIDEOS = {
  'character-1': 'assets/video/Character-1-Read.mp4',
  'character-2': 'assets/video/Character-2-Read.mp4',
};

/* Resolve the stored choice, validating it against the IDs this part
   actually has assets for. Wrapped in try/catch so a storage-disabled
   context (private browsing) cannot throw. */
function getCharacter() {
  /* Document first, the localStorage cache only as a fallback (§8.7).
     The precedence matters in one direction specifically: a document that
     was RESET holds {character: null}, and that must beat a stale cache,
     or the reset hatch is not a reset. getUnitCharacter() implements that
     by testing for the presence of the ui SECTION, not for a truthy value.

     typeof-guarded because this runs at script top level, inside
     lomdaState's own initialiser: a shared file that failed to load has to
     degrade to the old cache-only behaviour, not throw and abort the rest
     of this part's script. */
  let stored = null;
  if (typeof getUnitCharacter === 'function') {
    stored = getUnitCharacter();
  } else {
    try { stored = localStorage.getItem(CHARACTER_STORAGE_KEY); } catch (e) {}
  }
  return (stored && Object.prototype.hasOwnProperty.call(S0_CHARACTER_VIDEOS, stored))
    ? stored
    : DEFAULT_CHARACTER;
}

/* ─── Global lomda state ─────────────────────────────────── */
window.lomdaState = window.lomdaState || {
  selectedCharacter: getCharacter()
};

/* ─── State ─────────────────────────────────────────────── */
let currentScreen = 0;

/* ─── Feedback popup dragging — pointer events only, clamped to the
   canvas / above the bottom bar (see _global-components.md → Feedback
   popup system → "Drag bounds" for the formula). Ported verbatim from
   part 01 — shared by every draggable popup in this part (S1-S7). ── */


/* Stacked-fraction markup (proper math typesetting, not "20/100"
   slash text) — see .frac / .frac-num / .frac-den in style.css.
   Ported verbatim from part 01 (originally introduced by part 01's own
   S6 carousel screen, reused generically by any screen that needs a
   worked-example fraction — several of this part's own screens do). */
function s8Frac(num, den) {
  return '<span class="frac"><span class="frac-num">' + num + '</span><span class="frac-den">' + den + '</span></span>';
}


/* ─── Navigation ────────────────────────────────────────── */
/* No screen-leave cleanup in this part: every overlay it owns is
   matched by the shared goTo's [id$="-popup"] / [id$="-hint-overlay"]
   sweep. Defined empty rather than omitted so the hook contract is
   visible in all seven parts. */
function partScreenLeave(prev) {}

function resetScreenState(n) {
  if (n === 0) {
    const char = window.lomdaState.selectedCharacter || 'character-1';
    const src  = S0_CHARACTER_VIDEOS[char] || S0_CHARACTER_VIDEOS['character-1'];
    const vid  = document.getElementById('s0-video');
    if (vid && (!vid.getAttribute('src') || !vid.getAttribute('src').endsWith(src))) {
      vid.src = src;
      vid.load();
      vid.play().catch(() => {});
      /* No end-of-playback handler on purpose. 720-templates ->
         _global-components.md -> "Decorative character video" ->
         "End-state hierarchy" step 1: a <video> with no `loop` already
         stops on its final encoded frame, which IS the required
         end-state. Every clip this part loads was sampled frame by
         frame on 2026-09-01 and holds a meaningful final frame, so no
         asset here qualifies for the step-2 blank-tail exception.
         A freezeVideoOnEnd() helper used to run here and rewind to
         `currentTime = 0` — the opening pose, which the hierarchy
         prohibits outright. Do not reintroduce it. */
    }
    // Keep the first screen's cross-part Back button in sync with the
    // navigation trail — on initial load and on every return to S0 from
    // inside this part (js/partnav.js).
    PartNav.mountBack('s0-back');
  }
  /* Every one of these is a resolved-question screen with its own feedback
     popup, so returning to it must bring the feedback back alongside the
     preserved markings — 720-templates → _global-components.md → "Reopening
     feedback on return to a resolved screen". S3/S5/S6/S7 previously had only
     the not-yet-resolved half of this branch, on the mistaken reading that
     they had "no popup to reopen"; they each do. The outcome comes from the
     {prefix}Result each of them already stores for the Progress Question nav
     — no new state, no re-validation, no attempt change. S4 keeps its own
     richer branch below because it also has the View My Answer Toggle. */
  if (n === 3) {
    if (!s3Done) s3ResetInitial();
    else s3ShowPopup(s3Result === 'correct' ? 'correct' : 'wrong2');
  }
  if (n === 4 && !s4Done) {
    s4ResetInitial();
  }
  if (n === 5) {
    if (!s5Done) s5ResetInitial();
    else s5ShowPopup(s5Result === 'correct' ? 'correct' : 'wrong2');
  }
  if (n === 6) {
    if (!s6Done) s6ResetInitial();
    else s6ShowPopup(s6Result === 'correct' ? 'correct' : 'wrong2');
  }
  if (n === 7) {
    if (!s7Done) s7ResetInitial();
    else s7ShowPopup(s7Result === 'correct' ? 'correct' : 'wrong2');
  }
  if (n === 4 && s4Done) {
    if (s4Result === 'incorrect' && s4Answer !== null) {
      s4View = 'solution';
      s4ApplyView();
    } else if (s4Result === 'correct') {
      s4ShowPopup('correct');
    }
  }
  if (n === 2 && !s2Done) {
    s2ResetInitial();
  }
  if (n === 2 && s2Done) {
    if (s2Result === 'incorrect' && s2Answer !== null) {
      s2View = 'solution';
      s2ApplyView();
    } else if (s2Result === 'correct') {
      s2ShowPopup('correct');
    }
  }
  if (n === 1 && !s1Done) {
    s1ResetInitial();
  }
  if (n === 1 && s1Done) {
    // Reopening feedback on return to a resolved screen (DropdownQuestion.md
    // → "On re-entry": a final-wrong resolution always comes back on the
    // solution view; a first-try-correct resolution has nothing to toggle).
    if (s1Result === 'incorrect' && s1Answer !== null) {
      s1View = 'solution';
      s1ApplyView();
    } else if (s1Result === 'correct') {
      s1ShowPopup('correct');
    }
  }
  // S0 (the kickoff screen) carries no progress nav — only the 5-question
  // practice set S1-S7 does. Keeping S0 out of this range is also what
  // makes the initial resetScreenState(0) call below safe: the nav's own
  // PRACTICE_QUESTIONS / s*Done bindings are `const`/`let` declared further
  // down this file, so reaching them during initial load would hit their
  // temporal dead zone. Same contract as every sibling part.
  if (n >= 1 && n <= 7) syncPracticeProgressNav(document.getElementById('s' + n));
}

/* Cross-part navigation trail (js/partnav.js). Must run AFTER the two
   lines above: if this page was entered via a Back from part 03 or part
   04, init() jumps straight to the screen the learner left from, and it
   does that through goTo() so the landed screen gets the normal
   cancel/activate/reveal/resetScreenState treatment instead of a second,
   conflicting initial reveal. */

/* Pass threshold formula (720-templates -> _question-template-defaults.md
   -> "Pass threshold formula"): Basic/Standard practice, N = number of
   items (a multi-sub-part item counts as one unit, correct only if ALL
   its sub-parts are correct). N=5 (item -001..-005) -> passThreshold =
   ceil(2*5/3) = 4 -- matches this part's own S0 TransitionScreen text
   verbatim ("צריך לענות נכון על 4 שאלות לפחות"). */
/* The key this part's verdict is stored under in the state document's
   unit-level `results` map (§8.1). Unit-level and NOT a part payload: it is
   decided here and consumed by the routing, and captureUnitState() replaces a
   part's own slot on every save, so anything parked there is destroyed on the
   next screen change of a different part.
   ⚠️ Never rename it - a renamed key reads as "no verdict yet" for every
   learner already mid-unit, silently. */
const RESULT_KEY_PRACTICE = '02-practice';

/* Whether the five practice questions were actually resolved in THIS page
   load - the test for "the live computation is meaningful". Deliberately
   about resolution and not correctness: every one of the seven screens sets
   its own sNAnswered from its check function, on the correct branch and on
   the final-wrong branch alike. */
function practiceSetResolved() {
  return s1Answered && s2Answered && s3Answered && s4Answered &&
         s5Answered && s6Answered && s7Answered;
}

function practiceSetPassed() {
  /* The verdict recorded at the decision point, used ONLY when this page load
     does not itself hold the answers: a resumed or re-entered part has none of
     the sN* state the live computation below reads, so it would score 0 and
     route a learner who had PASSED into remediation (§8.7 Stage A).

     Gated on RESUME_ENABLED, not merely on the getter existing. With resume off
     getUnitResult() falls back to localStorage, which is per-browser and
     unbounded - it would carry a verdict across ATTEMPTS, which the
     per-registration state document never does.

     The live path still wins whenever the answers ARE here, and that is what
     makes the write at the decision point an update rather than an echo. */
  if (!practiceSetResolved() && RESUME_ENABLED && typeof getUnitResult === 'function') {
    const stored = getUnitResult(RESULT_KEY_PRACTICE);
    if (stored) return stored === 'pass';
  }

  const results = [
    s1Result === 'correct' && s2Result === 'correct' && s3Result === 'correct', // item -003 (S1+S2+S3)
    s4Result === 'correct', // item -004
    s5Result === 'correct', // item -005
    s6Result === 'correct', // item -006
    s7Result === 'correct', // item -007
  ];
  return results.filter(Boolean).length >= 4;
}

function advanceScreen() {
  // Re-crossing forward after a cross-part Back. Load-bearing HERE in
  // particular: this part's exit is the journey's first Decision Point,
  // and on a page re-entered via Back none of the s1..s7 results that
  // decided it survive — practiceSetPassed() would read false and push a
  // learner who had PASSED into the remediation part they legitimately
  // skipped. The recorded destination wins instead. See "RE-CROSSING
  // FORWARD" in js/partnav.js.
  const returnForward = PartNav.forwardOverride();
  if (returnForward && currentScreen + 1 >= TOTAL_SCREENS) {
    PartNav.forward(returnForward);
    return;
  }
  // Every question screen gates Continue on being answered first.
  if (currentScreen === 1 && !s1Answered) return;
  if (currentScreen === 2 && !s2Answered) return;
  if (currentScreen === 3 && !s3Answered) return;
  if (currentScreen === 4 && !s4Answered) return;
  if (currentScreen === 5 && !s5Answered) return;
  if (currentScreen === 6 && !s6Answered) return;
  if (currentScreen === 7 && !s7Answered) return;
  // End of Component 1's own practice set — the first pedagogical
  // Decision Point in the learning journey (not a physical-part-boundary
  // redirect like 01->02, which stays unconditional). Pass skips
  // remediation straight to the class task (part 04); fail routes into
  // the remediation part (part 03).
  if (currentScreen + 1 >= TOTAL_SCREENS) {
    /* xAPI: reported BEFORE the branch, so the failing path reports too.
       A component the learner failed must still be recorded; routing that
       learner is the platform's job via recommendedAfterFail (6.5).

       The denominator is 5, not 9. The screen promises "5 שאלות" and
       "צריך לענות נכון על 4 שאלות לפחות", so N = 5 and the threshold is 4
       (6.4: N is what the learner was PROMISED). Those five are the five
       ITEMS 003-007 - and item 003 spans three screens while item 007
       carries five rows, which is why the nine answered statements do not
       map one-to-one onto the five.

       So the five outcomes are rebuilt from XAPI_Q_RESULTS at ITEM
       granularity - an item counts only if every one of its questions was
       right, exactly how practiceSetPassed() combines s1..s7 - rather than
       recomputed from the sNResult variables. success stays the real gate. */
    const _r02 = [XAPI_Q_RESULTS['003/q1'] && XAPI_Q_RESULTS['003/q2'] && XAPI_Q_RESULTS['003/q3'],
                  XAPI_Q_RESULTS['004/q1'],
                  XAPI_Q_RESULTS['005/q1'],
                  XAPI_Q_RESULTS['006/q1'],
                  ['q1', 'q2', 'q3', 'q4', 'q5'].every(function (q) { return XAPI_Q_RESULTS['007/' + q]; })];
    const _n02 = _r02.filter(Boolean).length;

    /* Evaluated ONCE and reused for the verdict, the report and the branch.
       It used to be called twice here; with the stored-verdict fallback in
       play, two calls is also two chances to disagree.

       The verdict is written from this LIVE value - practiceSetResolved() is
       necessarily true at this point, because each of the seven per-screen
       gates above returns unless its screen was answered - so a learner who
       comes back and re-answers updates the verdict instead of having the old
       one echoed back at them.

       Two synchronous state writes happen on this one click (this one, and
       markSent inside xapiCompleteComponent). That is once per part boundary,
       not once per answer, so it is well inside what §8.3 warns about. */
    const _pass02 = practiceSetPassed();
    if (typeof setUnitResult === 'function') {
      setUnitResult(RESULT_KEY_PRACTICE, _pass02 ? 'pass' : 'fail');
    }
    /* Last click of the part: report and stop — the platform routes on the result
       (recommendedAfterFail → 03; 2026-09-16). */
    xapiEndComponent({ success: _pass02, score: { scaled: _n02 / 5 } }, xapiActiveContinueButton());

    PartNav.forward(_pass02 ? '04' : '03');   // dev-only (DEV_NAV)
    return;
  }
  goTo(currentScreen + 1);
}
function goBack() {
  // From the part's FIRST screen, Back crosses the part boundary
  // backwards instead of no-opping into goTo(-1): it returns to the last
  // screen of whichever part the learner actually arrived from. With no
  // recorded crossing (this part opened directly) PartNav.back() is a
  // no-op, exactly the behaviour this key had before.
  if (currentScreen === 0) { PartNav.back(); return; }
  goTo(currentScreen - 1);
}

/* ─── Keyboard navigation (RTL: next = ←, prev = →) ─────── */
// Must not fire while focus is on a control where ArrowLeft/ArrowRight
// already has its own in-control meaning (caret move in a text/number
// field, native slider value change, textarea/contenteditable caret,
// select option cycling) — otherwise ordinary editing inside this
// part's number inputs silently double-fires as screen navigation,
// including an ungated goBack() that can discard whatever the learner
// just typed.

document.addEventListener('keydown', e => {
  if (hasOwnArrowKeyMeaning(e.target)) return;
  if (e.key === 'ArrowLeft')  advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* ─── Standard shared image-zoom modal (720-templates → _global-
   components.md → "Image zoom") — one delegated document click handler:
   any [data-zoom-src] opens, any [data-zoom-close] closes. Ported
   verbatim from part 01 (minus part 01's own S2-specific special-case
   live-reparenting variant, not used by this part). The clone source is
   whichever inner-wrapper class the opener's frame actually uses:
   `.scq-img-inner` or the bare generic `.zoom-img-inner`. ─── */
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-zoom-src]');
  if (opener) {
    const modal = document.getElementById('img-zoom-modal');
    const stage = document.getElementById('img-zoom-stage');
    const wrapper = opener.parentElement?.querySelector('.scq-img-inner, .zoom-img-inner');
    if (modal && stage && wrapper) {
      stage.innerHTML = '';
      const clone = wrapper.cloneNode(true);
      clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
      stage.appendChild(clone);
      modal.classList.remove('hidden');
    }
    return;
  }
  if (e.target.closest('[data-zoom-close]')) {
    document.getElementById('img-zoom-modal')?.classList.add('hidden');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.getElementById('img-zoom-modal')?.classList.add('hidden');
  document.querySelectorAll('[id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
});


/* S0's cross-part Back — returns to part 01's last screen, and only
   exists as a visible button when the learner really came through part
   01 (PartNav.mountBack() in resetScreenState(0) decides that). */
function goBackFromS0() { PartNav.back(); }
/* ═══════════════════════════════════════════════════════════
   TEMPLATE — DropdownQuestion, multi-blank (Screen 46 / S1, first of
   the 5-question practice set, slide 45, item -001). FIRST use of this
   template in the project — see 720-templates → DropdownQuestion.md
   for the full contract (retry gate, View My Answer Toggle, per-slot
   marking); design tokens cross-checked against a validated production
   reference (methodica-science-mass-liquid-01-01's own S10) but NOT
   its `insertAdjacentHTML('afterbegin', ...)` icon insertion — that's
   drift from this project's own established rule (beforeend for a
   direction:ltr-forced row), not copied forward.
   4 independent slots, same shared option pool for every slot (a
   placement/matching exercise, not per-slot-distinct pools). Hint
   hidden until the first wrong attempt (producer instruction, 2026-08-20 — this part previously showed it from the start),
   maxAttempts:2.
   ═══════════════════════════════════════════════════════════ */
const S1 = {
  correct: { 1: '65%', 2: 'x', 3: '100%', 4: '60' },
  maxAttempts: 2,
};
const S1_SLOTS = [1, 2, 3, 4];

/* Type 1 feedback icons — bare 16px glyph, no circle, rendered INSIDE a
   value-input's own coloured border (720-templates → _question-template-
   defaults.md → "Correct/incorrect icon system"; ValueInputQuestion row).
   Same two paths S1_CHECK_ICON/S1_WRONG_ICON use, but sized 16px inline for
   the .viq-input-ico slot instead of CSS-sized for a dropdown pill. Colours
   are Figma's Feedback/Correct/300 #609E12 and Feedback/Incorrect/300
   #B20010 (verified on nodes 1027:26063 / 1027:26058). Named to match part
   01's own constants so the two parts read identically. */
const CHECK_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 12" fill="none" aria-hidden="true">' +
  '<path d="M4.52036 12C4.12296 12.0002 3.74183 11.8126 3.46106 11.4787L0.258452 7.67744C-0.0861507 7.26814 -0.0861507 6.60467 0.258452 6.19536C0.603165 5.78619 1.16194 5.78619 1.50666 6.19536L4.52036 9.77374L12.4933 0.306878C12.8381 -0.102293 13.3968 -0.102293 13.7415 0.306878C14.0862 0.716179 14.0862 1.37966 13.7415 1.78896L5.57966 11.4787C5.29889 11.8126 4.91776 12.0002 4.52036 12Z" fill="#609E12"/>' +
  '</svg>';
const WRONG_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
  '<path d="M13.6743 0.325691C13.4657 0.117151 13.1828 0 12.8879 0C12.5929 0 12.31 0.117151 12.1014 0.325691L7 5.42709L1.8986 0.325691C1.69 0.117151 1.40711 0 1.11215 0C0.817183 0 0.534294 0.117151 0.325691 0.325691C0.117151 0.534294 0 0.817183 0 1.11215C0 1.40711 0.117151 1.69 0.325691 1.8986L5.42709 7L0.325691 12.1014C0.117151 12.31 0 12.5929 0 12.8879C0 13.1828 0.117151 13.4657 0.325691 13.6743C0.534294 13.8829 0.817183 14 1.11215 14C1.40711 14 1.69 13.8829 1.8986 13.6743L7 8.57291L12.1014 13.6743C12.31 13.8829 12.5929 14 12.8879 14C13.1828 14 13.4657 13.8829 13.6743 13.6743C13.8829 13.4657 14 13.1828 14 12.8879C14 12.5929 13.8829 12.31 13.6743 12.1014L8.57291 7L13.6743 1.8986C13.8829 1.69 14 1.40711 14 1.11215C14 0.817183 13.8829 0.534294 13.6743 0.325691Z" fill="#B20010"/>' +
  '</svg>';

const S1_CHECK_ICON =
  '<svg class="dq-check-ico" viewBox="0 0 14 12" fill="none" aria-hidden="true">' +
  '<path d="M4.52036 12C4.12296 12.0002 3.74183 11.8126 3.46106 11.4787L0.258452 7.67744C-0.0861507 7.26814 -0.0861507 6.60467 0.258452 6.19536C0.603165 5.78619 1.16194 5.78619 1.50666 6.19536L4.52036 9.77374L12.4933 0.306878C12.8381 -0.102293 13.3968 -0.102293 13.7415 0.306878C14.0862 0.716179 14.0862 1.37966 13.7415 1.78896L5.57966 11.4787C5.29889 11.8126 4.91776 12.0002 4.52036 12Z" fill="#609e12"/></svg>';
const S1_WRONG_ICON =
  '<svg class="dq-wrong-ico" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
  '<path d="M13.6743 0.325691C13.4657 0.117151 13.1828 0 12.8879 0C12.5929 0 12.31 0.117151 12.1014 0.325691L7 5.42709L1.8986 0.325691C1.69 0.117151 1.40711 0 1.11215 0C0.817183 0 0.534294 0.117151 0.325691 0.325691C0.117151 0.534294 0 0.817183 0 1.11215C0 1.40711 0.117151 1.69 0.325691 1.8986L5.42709 7L0.325691 12.1014C0.117151 12.31 0 12.5929 0 12.8879C0 13.1828 0.117151 13.4657 0.325691 13.6743C0.534294 13.8829 0.817183 14 1.11215 14C1.40711 14 1.69 13.8829 1.8986 13.6743L7 8.57291L12.1014 13.6743C12.31 13.8829 12.5929 14 12.8879 14C13.1828 14 13.4657 13.8829 13.6743 13.6743C13.8829 13.4657 14 13.1828 14 12.8879C14 12.5929 13.8829 12.31 13.6743 12.1014L8.57291 7L13.6743 1.8986C13.8829 1.69 14 1.40711 14 1.11215C14 0.817183 13.8829 0.534294 13.6743 0.325691Z" fill="#b20010"/></svg>';

let s1Selections = { 1: null, 2: null, 3: null, 4: null };
let s1Attempts   = 0;
let s1Answered   = false;
let s1Done       = false;
let s1LastWrong  = null;   // JSON snapshot of the last non-final wrong selection set
let s1Answer     = null;   // { 1: {value, correct}, ... } — final selection + per-slot correctness, captured before any reveal
let s1View       = 'solution';
let s1Result     = null;
let s1ListenerRegistered = false;

function s1Snapshot() {
  return JSON.stringify(s1Selections);
}

function s1Toggle(n) {
  const btn  = document.getElementById('dq-btn-' + n);
  const list = document.getElementById('dq-list-' + n);
  if (!btn || !list || btn.disabled) return;
  if (s1Attempts > 0 && !document.getElementById('s1-popup').classList.contains('hidden')) {
    document.getElementById('s1-popup').classList.add('hidden');
  }
  const isOpen = !list.classList.contains('hidden');
  s1CloseAllDropdowns();
  if (!isOpen) {
    list.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }
}
function s1CloseAllDropdowns() {
  S1_SLOTS.forEach(n => {
    document.getElementById('dq-list-' + n)?.classList.add('hidden');
    document.getElementById('dq-btn-'  + n)?.setAttribute('aria-expanded', 'false');
  });
}
function s1OutsideClick(e) {
  if (currentScreen !== 1) return;
  if (!e.target.closest('.dq-dropdown-wrap')) s1CloseAllDropdowns();
}

function s1Select(n, value) {
  if (s1Answered) return;
  s1Selections[n] = value;
  const sel = document.getElementById('dq-selected-' + n);
  if (sel) sel.textContent = value;
  const btn = document.getElementById('dq-btn-' + n);
  if (btn) btn.removeAttribute('data-empty');
  s1CloseAllDropdowns();
  s1UpdateBar();
}

function s1UpdateBar() {
  if (s1Answered) return;
  const chk = document.getElementById('s1-check');
  const allFilled = S1_SLOTS.every(n => s1Selections[n] !== null);
  chk.disabled = !allFilled || s1Snapshot() === s1LastWrong;
}

/* No producer-authored correct/wrong2 titles exist on this slide (no
   "נכון"/"טעות" text anywhere in its own runs, unlike every prior
   screen) — "נכון!" matches this project's own near-universal default;
   the wrong2 title is DropdownQuestion.md's own documented default,
   since there's no producer text to transcribe. Flag for correction if
   the producer sends a screenshot, same as every other proactive title
   guess this session. */
const S1_EXPLANATION_BODY = [
  'في جدول التناسب نكتب النسبة المئوية المعطاة فوق النسبة المئوية الكاملة، والكمية الجزئية فوق الكمية الكاملة‎:',
  // Dash separators replaced with commas (producer instruction,
  // 2026-08-20). The first line also had a double space after the dash;
  // it collapses to a single space with the comma.
  'الكمية الجزئية: x، وهي المعلومة الناقصة التي نبحث عنها‎.',
  'الكمية الكاملة: 60، كل المتطوعين‎.',
  'النسبة المئوية المعطاة: %65.',
  // Bold per slide45's own run-level formatting (producer correction,
  // 2026-08-20): the run "תמיד יהיה 100%." carries b=1 while
  // "האחוז השלם :" is b=0. The period is inside the bold run there, so
  // it is inside the <strong> here too.
  'النسبة المئوية الكاملة: <strong>دائمًا %100.</strong>',
  '<table class="eq-table"><tr><th>عدد المسجّلين</th><th>النسبة المئوية</th></tr><tr><td>x</td><td>65%</td></tr><tr><td>60</td><td>100%</td></tr></table>',
];
const S1_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S1_EXPLANATION_BODY },
  /* PROJECT-WIDE FINAL-WRONG RULE (producer, 2026-09-01): every
     `wrong2` title — the popup shown after the LAST attempt — ends
     with a line break and a second line, "התשובה הנכונה מוצגת.", which
     the .scq-popup-title rule renders bold along with the first line.
     The title is therefore written to the element with innerHTML, not
     textContent. Deliberately NOT applied to `retry`, to `correct`, or
     to a wrong2 `answerView` — the answer view shows the learner's own
     answer, not the correct one. */
  wrong2:  {
    bg: '#ffdbdc', title: 'غير دقيق.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S1_EXPLANATION_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
};

function s1RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s1-popup-actions');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!action) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'popup-action';
  setNavLabel(btn, action.label);
  btn.onclick = onClick;
  wrap.appendChild(btn);
}
function s1ShowPopup(type, view) {
  const popup = document.getElementById('s1-popup');
  if (!popup) return;
  let cfg = S1_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  document.getElementById('s1-popup-title').innerHTML = cfg.title;
  document.getElementById('s1-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s1RenderPopupAction(cfg.action, () => { s1View = cfg.action.view; s1ApplyView(); });
  } else {
    s1RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

function s1Mark(n, state) {
  const btn = document.getElementById('dq-btn-' + n);
  const sel = document.getElementById('dq-selected-' + n);
  if (!btn || !sel) return;
  btn.classList.remove('dq-correct', 'dq-wrong');
  btn.querySelector('.dq-check-ico')?.remove();
  btn.querySelector('.dq-wrong-ico')?.remove();
  btn.disabled = true;
  const chevron = btn.querySelector('.dq-chevron');
  if (state === 'answer') {
    sel.textContent = s1Answer[n].value;
    btn.removeAttribute('data-empty');
    btn.classList.add('dq-wrong');
    if (chevron) chevron.style.display = '';
    btn.insertAdjacentHTML('beforeend', S1_WRONG_ICON);
  } else {
    // 'solution' overwrites this slot with the correct value; 'correct'
    // leaves the learner's own already-correct selection in place.
    if (state === 'solution') { sel.textContent = S1.correct[n]; btn.removeAttribute('data-empty'); }
    btn.classList.add('dq-correct');
    if (chevron) chevron.style.display = 'none';
    btn.insertAdjacentHTML('beforeend', S1_CHECK_ICON);
  }
}

function s1Check() {
  if (s1Answered) { advanceScreen(); return; } // label is "שנמשיך?" → go next (safe no-op)
  if (!S1_SLOTS.every(n => s1Selections[n] !== null)) return;

  s1Attempts++;
  const results = S1_SLOTS.map(n => ({ n, correct: s1Selections[n] === S1.correct[n] }));
  const allCorrect = results.every(r => r.correct);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. The response is built from
     s1Selections rather than the DOM: the final-wrong branch calls
     s1ApplyView(), which replaces the slots with the solution. */
  xapiAnswered('003', 'q1', allCorrect,
    allCorrect || s1Attempts >= S1.maxAttempts,
    S1_SLOTS.map(function (n) { return n + '=' + s1Selections[n]; }).join(', '));

  if (allCorrect) {
    s1Result = 'correct';
    results.forEach(r => s1Mark(r.n, 'correct'));
    s1ShowPopup('correct');
    s1Finish();
  } else if (s1Attempts >= S1.maxAttempts) {
    s1Result = 'incorrect';
    s1Answer = {};
    results.forEach(r => { s1Answer[r.n] = { value: s1Selections[r.n], correct: r.correct }; });
    s1View = 'solution';
    s1ApplyView();
    s1Finish();
  } else {
    // Non-final wrong: per DropdownQuestion.md's own QA checklist (row 5),
    // NO per-slot marking happens here — every slot stays selectable and
    // unmarked, only the retry popup shows. Marking is reserved for the
    // correct/final-wrong outcomes above.
    s1LastWrong = s1Snapshot();
    s1RevealHint();
    s1ShowPopup('retry');
    s1UpdateBar();
  }
  /* §8.3 - commit an answer, persist it SYNCHRONOUSLY. goTo() only arms a
     debounced save, and the gap is real: the learner answers, clicks continue
     200ms later, the router writes the forward blob and navigates - but this
     page stays alive while the next document loads, long enough for the stale
     timer to fire AFTER the forward write and send the next launch back into
     the part just finished.

     At the TAIL, and in the function the CLICK enters, for two separate
     reasons:

       * the tail runs on every branch. Putting it in sNFinish() instead would
         skip the retry branch, which still moved sNAttempts and sNLastWrong.
         (Part 01's s2qCheck is the case that proves it: s2qCheck commits
         nothing itself - its screen belongs to item 001, which declares zero
         questions - so a rule keyed on "the committing function" picks
         s2qFinish, which the retry branch never reaches.)
       * capturePartPayload() reads wrong-marks off the LIVE DOM (§8.9), so the
         flush has to land after all of the branch's painting, not straight
         after the Done flag.

     One flush per interaction, never two: persistUnitState() fires a BLOCKING
     synchronous PUT, so a second call on the same click costs the learner
     another round trip (§8.3). sNCheck -> sNFinish pairs therefore carry the
     call in the Check half only.

     Inert until RESUME_ENABLED flips - flushResumeSave() itself returns early
     on !RESUME_ENABLED || !_resumeReady || _restoring. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s1FinishDom() {
  S1_SLOTS.forEach(n => { const btn = document.getElementById('dq-btn-' + n); if (btn) btn.disabled = true; });
  const chk = document.getElementById('s1-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s1-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s1Finish() {
  s1Answered = true;
  s1Done = true;
  s1FinishDom();
}

function s1ApplyView() {
  if (s1Answer === null) return;
  S1_SLOTS.forEach(n => {
    const a = s1Answer[n];
    s1Mark(n, a.correct ? 'correct' : (s1View === 'answer' ? 'answer' : 'solution'));
  });
  s1ShowPopup('wrong2', s1View);
}
function s1ToggleView() {
  if (s1Answer === null) return;
  s1View = (s1View === 'solution') ? 'answer' : 'solution';
  s1ApplyView();
}

function s1ResetInitial() {
  s1Selections = { 1: null, 2: null, 3: null, 4: null };
  s1Attempts = 0;
  s1Answered = false;
  s1LastWrong = null;
  s1Answer = null;
  s1View = 'solution';
  s1Result = null;
  S1_SLOTS.forEach(n => {
    const btn = document.getElementById('dq-btn-' + n);
    const sel = document.getElementById('dq-selected-' + n);
    if (!btn || !sel) return;
    btn.classList.remove('dq-correct', 'dq-wrong');
    btn.querySelector('.dq-check-ico')?.remove();
    btn.querySelector('.dq-wrong-ico')?.remove();
    btn.disabled = false;
    btn.setAttribute('data-empty', 'true');
    btn.setAttribute('aria-expanded', 'false');
    const chevron = btn.querySelector('.dq-chevron');
    if (chevron) chevron.style.display = '';
    sel.textContent = 'اختاروا';
  });
  document.getElementById('s1-popup')?.classList.add('hidden');
  document.getElementById('s1-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s1-hint');
  // Hidden until the first wrong attempt (producer instruction,
  // 2026-08-20) — revealed by s1RevealHint() from the retry branch.
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; }
  const chk = document.getElementById('s1-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  s1CloseAllDropdowns();
  if (!s1ListenerRegistered) {
    document.addEventListener('click', s1OutsideClick);
    s1ListenerRegistered = true;
  }
}

function s1RevealHint() {
  const hintBtn = document.getElementById('s1-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s1OpenHint() {
  if (s1Answered) return;
  /* xAPI: requested.1 - after the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('003', 'q1');
  document.getElementById('s1-hint-overlay')?.classList.remove('hidden');
}
function s1CloseHint() {
  document.getElementById('s1-hint-overlay')?.classList.add('hidden');
}
function s1CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's1-hint-overlay') s1CloseHint();
}

function goBackFromS1() {
  goTo(0);
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, single value + hint (Screen 47 / S2,
   part ב of the same question, slide 46, item -001 — continues
   directly from S1's part א). Unlike S22 (no hint at all), this
   screen HAS a hint, hidden until the first wrong attempt (producer instruction, 2026-08-20 — this part previously showed it from the start).
   Correct = 39. Uses the View My Answer Toggle on final-wrong (reveal
   overwrites the single input), same shape as S7/S8/S22.
   ═══════════════════════════════════════════════════════════ */
const S2 = { correct: 39, maxAttempts: 2 };

let s2Attempts  = 0;
let s2Answered  = false;
let s2Done      = false;
let s2LastWrong = null;
let s2Answer    = null;
let s2View      = 'solution';
let s2Result    = null;

/* Body transcribed from the slide's own rendered feedback mockups
   (ppt/media/image61.png correct / image62.png wrong2 — shared body,
   titles differ). NOT verbatim: see the note on the common-denominator
   line below, which is flipped relative to the source. Titles are
   genuinely custom on this slide
   (unlike S1) — "יפה מאוד!" / "טעית, כל טעות היא צעד קדימה בדרך.",
   used exactly as given rather than normalized to this project's usual
   "נכון!". */
const S2_EXPLANATION_BODY = [
  'ننفّذ الحساب بواسطة معادلة التناسب‎:',
  '<table class="eq-table"><tr><th>عدد المسجلين</th><th>النسبة المئوية</th></tr><tr><td>x</td><td>65%</td></tr><tr><td>60</td><td>100%</td></tr></table>',
  '<span dir="ltr" class="s19-eq-row">' + s8Frac('65%', '100%') + '<span class="s19-eq-sign">=</span>' + s8Frac('x', 60) + '</span>',
  'نختزل النسب المئوية ونحصل على المعادلة‎: <span dir="ltr" class="s19-eq-row">' + s8Frac(65, 100) + '<span class="s19-eq-sign">=</span>' + s8Frac('x', 60) + '</span>',
  // Break after "300 ומקבלים:" (producer instruction, 2026-08-20) so the
  // equation starts on its own line.
  //
  // "5x = 3 · 65" IS FLIPPED relative to the source and always has been.
  // Slide46's OMML runs are, in document order, `3` `∙65=` `5` `𝑥` —
  // i.e. "3 · 65 = 5𝑥" — and image61/image62 render it exactly that way,
  // product left, unknown right. Confirmed 2026-09-01 by reading the raw
  // run order out of slide46.xml rather than trusting how the extracted
  // line renders in a terminal. The flip predates that check and was not
  // documented; it is left standing because it matches the house rule the
  // producer set on 2026-09-01 (part 03 S2: the unknown leads), and part
  // 01 S24's own "5x=30" leads the same way. Do not "restore" it to the
  // script without asking — and do not re-flip it either.
  'نضرب بالمقام المشترك 300 ونحصل على:<br><span dir="ltr">5x = 3 &middot; 65</span> ومن هنا: <span dir="ltr">x = 39</span>.',
  'الاستنتاج: 39 متطوعًا سجلوا لورشة القيادة‎.',
];
const S2_POPUP_CFG = {
  retry: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'رائع جدًا!', body: S2_EXPLANATION_BODY },
  wrong2: {
    bg: '#ffdbdc', title: 'أخطأتم، كل خطأ هو خطوة إلى الأمام.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S2_EXPLANATION_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
};

function s2RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s2-popup-actions');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!action) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'popup-action';
  setNavLabel(btn, action.label);
  btn.onclick = onClick;
  wrap.appendChild(btn);
}
function s2ShowPopup(type, view) {
  const popup = document.getElementById('s2-popup');
  if (!popup) return;
  let cfg = S2_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  document.getElementById('s2-popup-title').innerHTML = cfg.title;
  document.getElementById('s2-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s2RenderPopupAction(cfg.action, () => { s2View = cfg.action.view; s2ApplyView(); });
  } else {
    s2RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

function s2OnInput() {
  if (s2Answered) return;
  // State classes belong on the FIELD wrapper (which owns the border), not on
  // the borderless input inside it; the icon slot clears alongside them.
  document.getElementById('s2-input-field').classList.remove('error', 'correct');
  document.getElementById('s2-input-ico').innerHTML = '';
  const popup = document.getElementById('s2-popup');
  if (s2Attempts > 0 && !popup.classList.contains('hidden')) popup.classList.add('hidden');
  const val = document.getElementById('s2-input').value.trim();
  document.getElementById('s2-check').disabled = !val || (val === s2LastWrong);
}
function s2Check() {
  if (s2Answered) { advanceScreen(); return; }
  const input = document.getElementById('s2-input');
  const field = document.getElementById('s2-input-field');
  const ico   = document.getElementById('s2-input-ico');
  const raw = input.value.trim();
  if (!raw) return;

  s2Attempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s2Ok = Number(raw) === S2.correct;

  /* xAPI: answered - before the branches. `raw` was read at the top of
     this function, so it is the learner's own value even on the
     final-wrong path where s2ApplyView() overwrites the input. */
  xapiAnswered('003', 'q2', s2Ok,
    s2Ok || s2Attempts >= S2.maxAttempts, raw);

  if (s2Ok) {
    s2Result = 'correct';
    field.classList.add('correct');
    ico.innerHTML = CHECK_SVG;
    s2ShowPopup('correct');
    s2Finish();
  } else if (s2Attempts >= S2.maxAttempts) {
    s2Result = 'incorrect';
    s2Answer = raw;
    s2Finish();
    s2View = 'solution';
    s2ApplyView();
  } else {
    field.classList.add('error');
    ico.innerHTML = WRONG_SVG;
    s2LastWrong = raw;
    // Hint is already visible from the start on this screen — nothing
    // to reveal on a wrong attempt (unlike S7/S8's own hidden-until-
    // wrong policy).
    s2RevealHint();
    s2ShowPopup('retry');
    document.getElementById('s2-check').disabled = true;
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}
/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s2FinishDom() {
  document.getElementById('s2-input').disabled = true;
  const chk = document.getElementById('s2-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s2-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s2Finish() {
  s2Answered = true;
  s2Done = true;
  s2FinishDom();
}
function s2ApplyView() {
  if (s2Answer === null) return;
  const input = document.getElementById('s2-input');
  const field = document.getElementById('s2-input-field');
  const ico   = document.getElementById('s2-input-ico');
  if (s2View === 'answer') {
    input.value = s2Answer;   // the learner's own (wrong) answer — red + ✗
    field.classList.remove('correct'); field.classList.add('error');
    ico.innerHTML = WRONG_SVG;
  } else {
    input.value = String(S2.correct);   // the correct solution — green + ✓
    field.classList.remove('error'); field.classList.add('correct');
    ico.innerHTML = CHECK_SVG;
  }
  s2ShowPopup('wrong2', s2View);
}
function s2ToggleView() {
  if (s2Answer === null) return;
  s2View = (s2View === 'solution') ? 'answer' : 'solution';
  s2ApplyView();
}
function s2ResetInitial() {
  s2Attempts = 0;
  s2Answered = false;
  s2LastWrong = null;
  s2Answer = null;
  s2View = 'solution';
  s2Result = null;
  const input = document.getElementById('s2-input');
  if (input) { input.value = ''; input.disabled = false; }
  document.getElementById('s2-input-field')?.classList.remove('error', 'correct');
  const s2Ico = document.getElementById('s2-input-ico'); if (s2Ico) s2Ico.innerHTML = '';
  document.getElementById('s2-popup')?.classList.add('hidden');
  document.getElementById('s2-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s2-hint');
  // Hidden until the first wrong attempt (producer instruction,
  // 2026-08-20) — revealed by s2RevealHint() from the retry branch.
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; }
  const chk = document.getElementById('s2-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function s2RevealHint() {
  const hintBtn = document.getElementById('s2-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s2OpenHint() {
  if (s2Answered) return;
  /* xAPI: requested.1 - after the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('003', 'q2');
  document.getElementById('s2-hint-overlay')?.classList.remove('hidden');
}
function s2CloseHint() {
  document.getElementById('s2-hint-overlay')?.classList.add('hidden');
}
function s2CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's2-hint-overlay') s2CloseHint();
}
function goBackFromS2() {
  goTo(1);
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestion, no hint (Screen 48 / S3, part ג of
   the same question, slide 47, item -001 — continues directly from
   S2's part ב). Presenter note: "אין רמז" — no hint button/overlay
   markup at all (same convention as S22). maxAttempts defaults to 2
   (no presenter-note deviation).
   ═══════════════════════════════════════════════════════════ */
const S3 = { correctId: 'b', maxAttempts: 2 }; // 'b' = לא

let s3Selected  = null;
let s3Attempts  = 0;
let s3Answered  = false;
let s3Done      = false;
let s3LastWrong = null;
let s3Result    = null; // 'correct' | 'incorrect' — read by the Progress Question nav

function s3Select(id) {
  if (s3Answered) return;
  s3Selected = id;
  if (s3Attempts > 0) {
    document.getElementById('s3-popup')?.classList.add('hidden');
    document.querySelectorAll('#s3 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s3 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  s3UpdateBar();
}

function s3Mark(id, cls) {
  const opt = document.querySelector('#s3 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}

/* Shared body (correct/wrong2) transcribed verbatim from the slide's
   own text runs, including its own "😉" — source content, not an
   invented addition. Wrong2 title is NOT authored on this slide (no
   "טעית" text anywhere in its own runs) — reused this item's own
   established fallback (first used on S1) for consistency. */
const S3_EXPLANATION_BODY = [
  'كان شرط المديرة لإقامة اليوم الترفيهي أن يسجل 40 متطوعًا على الأقل‎.',
  'فعليًا، سجل 39 متطوعًا فقط (أقل من 40)، ولذلك لن توافق على إقامة اليوم الترفيهي‎.',
  'من سيتطوّع لإقناعها بإقامة اليوم الترفيهي؟ 😉',
];
const S3_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S3_EXPLANATION_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'غير دقيق.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S3_EXPLANATION_BODY },
};

function s3ShowPopup(type) {
  const popup = document.getElementById('s3-popup');
  if (!popup) return;
  const cfg = S3_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  document.getElementById('s3-popup-title').innerHTML = cfg.title;
  document.getElementById('s3-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s3Check() {
  if (s3Answered) { advanceScreen(); return; } // label is "שנמשיך?" → go next (safe no-op)
  if (!s3Selected) return;

  s3Attempts++;
  const isCorrect = s3Selected === S3.correctId;

  /* xAPI: answered - after both guards, before the branches. */
  xapiAnswered('003', 'q3', isCorrect,
    isCorrect || s3Attempts >= S3.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s3', s3Selected)));

  if (isCorrect) {
    s3Result = 'correct';
    s3Mark(S3.correctId, 'correct');
    s3ShowPopup('correct');
    s3Finish();
  } else if (s3Attempts >= S3.maxAttempts) {
    s3Result = 'incorrect';
    s3Mark(S3.correctId, 'correct');
    s3Mark(s3Selected, 'wrong');
    s3ShowPopup('wrong2');
    s3Finish();
  } else {
    s3Mark(s3Selected, 'wrong');
    s3LastWrong = s3Selected;
    s3ShowPopup('retry');
    s3UpdateBar();
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s3FinishDom() {
  document.querySelectorAll('#s3 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s3-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
}

function s3Finish() {
  s3Answered = true;
  s3Done = true;
  s3FinishDom();
}

function s3UpdateBar() {
  if (s3Answered) return;
  const chk = document.getElementById('s3-check');
  if (chk) chk.disabled = !s3Selected || s3Selected === s3LastWrong;
}

function s3ResetInitial() {
  s3Selected = null;
  s3Attempts = 0;
  s3Answered = false;
  s3LastWrong = null;
  s3Result = null;
  document.querySelectorAll('#s3 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s3-popup')?.classList.add('hidden');
  const chk = document.getElementById('s3-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function goBackFromS3() {
  goTo(2);
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, 4-field table fill-in (Screen 49 /
   S4, slide 48, item -002 — first new question after the practice
   set kicked off by S0). Named per-field locals (cooking/tents/ropes/
   firstaid), same shape as this project's own S11 (3 fields) rather
   than part 05's array-driven S2V refactor — part 01's own convention.
   Uses the View My Answer Toggle on final-wrong (S11's own reasoning:
   a destructive reveal across several fields is exactly the case the
   toggle exists for). Hint hidden-until-first-wrong (majority
   convention in this project — S7/S8/S12 — no presenter-note
   override either way on this slide).
   ═══════════════════════════════════════════════════════════ */
const S4 = {
  maxAttempts: 2,
  correct: { cooking: 90, tents: 80, ropes: 24, firstaid: 6 },
};

let s4Attempts = 0;
let s4Answered = false;
let s4Done     = false;
let s4Result   = null; // 'correct' | 'incorrect' — which popup to reopen on return
let s4Answer   = null; // { cooking, tents, ropes, firstaid } snapshot of the learner's final-wrong values
let s4View     = 'solution'; // 'solution' | 'answer'

/* Shared body (correct/wrong2) transcribed verbatim from the slide's
   own OMML equation runs (e.g. "45% · 200 = 45/100 · 200 = 90 מ"ק"),
   walked once per equipment type via `s8Frac()`. */
const S4_EXPLANATION_BODY = [
  'نحسب مقدار الحجم الذي يُشغِله كل نوع من المعدات في الحاوية التي حجمها 200 متر مكعب، بواسطة التحويل إلى كسر‎:',
  '<strong>معدات الطبخ:</strong><br><span dir="ltr" class="s19-eq-row">%45<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span>' + s8Frac(45, 100) + '<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span><span dir="ltr"><bdi>مترًا مكعبًا</bdi> <bdi>90</bdi></span></span>',
  '<strong>الخيام والمباني:</strong><br><span dir="ltr" class="s19-eq-row">%40<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span>' + s8Frac(40, 100) + '<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span><span dir="ltr"><bdi>مترًا مكعبًا</bdi> <bdi>80</bdi></span></span>',
  '<strong>معدات الحبال والسلامة:</strong><br><span dir="ltr" class="s19-eq-row">%12<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span>' + s8Frac(12, 100) + '<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span><span dir="ltr"><bdi>مترًا مكعبًا</bdi> <bdi>24</bdi></span></span>',
  '<strong>الإسعاف الأولي:</strong><br><span dir="ltr" class="s19-eq-row">%3<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span>' + s8Frac(3, 100) + '<span class="s19-eq-sign">&middot;</span>200<span class="s19-eq-sign">=</span><span dir="ltr"><bdi>متر مكعب</bdi> <bdi>6</bdi></span></span>',
  'انتبهوا إلى أن مجموع عمود النسبة المئوية يساوي %100 - أي، الصحيح بالنسبة المئوية، ومجموع عمود الحجم (الكمية) يساوي 200 مكتر مكعب، وهو الصحيح الكميّ لدينا (حجم الحاوية)‎.',
];
const S4_POPUP_CFG = {
  // Not authored on this slide — this project's own universal standard
  // retry popup, same as every other question screen.
  retry: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S4_EXPLANATION_BODY },
  wrong2: {
    bg: '#ffdbdc', title: 'هذا خطأ، كل خطأ يقوّي قدراتكم‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.',
    body: S4_EXPLANATION_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
};

function s4RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s4-popup-actions');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!action) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'popup-action';
  setNavLabel(btn, action.label);
  btn.onclick = onClick;
  wrap.appendChild(btn);
}
function s4ResetPopupPosition(popup) {
  popup.style.left = '2px';
  popup.style.top = 'auto';
  popup.style.bottom = '76px';
}
function s4ShowPopup(type, view) {
  const popup = document.getElementById('s4-popup');
  if (!popup) return;
  let cfg = S4_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) s4ResetPopupPosition(popup);
  document.getElementById('s4-popup-title').innerHTML = cfg.title;
  document.getElementById('s4-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s4RenderPopupAction(cfg.action, () => { s4View = cfg.action.view; s4ApplyView(); });
  } else {
    s4RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

function s4Inputs() {
  return {
    cooking:  document.getElementById('s4-input-cooking'),
    tents:    document.getElementById('s4-input-tents'),
    ropes:    document.getElementById('s4-input-ropes'),
    firstaid: document.getElementById('s4-input-firstaid'),
  };
}
/* The field wrappers and icon slots, keyed exactly like s4Inputs() so all
   three can be zipped per key. State classes belong on the FIELD (it owns
   the border) and the glyph goes in the field's own icon slot — colour alone
   is never sufficient feedback (720-templates → "Correct/incorrect icon
   system"; the icon is required visual behavior, not an optional extra). */
const S4_KEYS = ['cooking', 'tents', 'ropes', 'firstaid'];
function s4Fields() {
  const o = {};
  S4_KEYS.forEach(k => o[k] = document.getElementById('s4-field-' + k));
  return o;
}
function s4Icos() {
  const o = {};
  S4_KEYS.forEach(k => o[k] = document.getElementById('s4-ico-' + k));
  return o;
}
/* Applies ONE state to all four fields at once — correct for the two
   cases that are genuinely uniform (every field right on a correct
   attempt; the final-wrong view toggle, which shows either all of the
   learner's own values as wrong or the whole solution as right). The
   RETRY (non-final wrong) attempt does NOT use this any more — see
   s4FieldStates()/s4Check(), which marks each field by its own value
   (producer correction, 2026-08-19: a learner who got some fields right
   must see that, not have them painted red along with the rest). */
function s4Mark(cls) {
  const fields = s4Fields(), icos = s4Icos();
  const glyph = cls === 'correct' ? CHECK_SVG : WRONG_SVG;
  S4_KEYS.forEach(k => {
    if (fields[k]) { fields[k].classList.remove('error', 'correct'); fields[k].classList.add(cls); }
    if (icos[k]) icos[k].innerHTML = glyph;
  });
}
function s4ClearMarks() {
  const fields = s4Fields(), icos = s4Icos();
  S4_KEYS.forEach(k => {
    if (fields[k]) fields[k].classList.remove('error', 'correct');
    if (icos[k]) icos[k].innerHTML = '';
  });
}
function s4IsCorrect(v) {
  return Number(v.cooking) === S4.correct.cooking &&
         Number(v.tents)   === S4.correct.tents &&
         Number(v.ropes)   === S4.correct.ropes &&
         Number(v.firstaid) === S4.correct.firstaid;
}
/* Per-field correctness (producer correction, 2026-08-19): the retry
   feedback marks EACH of the 4 supply categories by its own value, not
   every field red just because the group as a whole is wrong. */
function s4FieldStates(v) {
  const o = {};
  S4_KEYS.forEach(k => { o[k] = Number(v[k]) === S4.correct[k]; });
  return o;
}
function s4OnInput() {
  if (s4Answered) return;
  const { cooking, tents, ropes, firstaid } = s4Inputs();
  s4ClearMarks();
  const popup = document.getElementById('s4-popup');
  if (s4Attempts > 0 && !popup.classList.contains('hidden')) popup.classList.add('hidden');
  const hasAll = cooking.value.trim() !== '' && tents.value.trim() !== '' &&
                 ropes.value.trim() !== '' && firstaid.value.trim() !== '';
  document.getElementById('s4-check').disabled = !hasAll;
}
function s4Check() {
  if (s4Answered) { advanceScreen(); return; }
  const { cooking, tents, ropes, firstaid } = s4Inputs();
  const v = {
    cooking: cooking.value.trim(), tents: tents.value.trim(),
    ropes: ropes.value.trim(), firstaid: firstaid.value.trim(),
  };
  if (!v.cooking || !v.tents || !v.ropes || !v.firstaid) return;

  s4Attempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s4Ok = s4IsCorrect(v);

  /* xAPI: answered - before the branches. Values come from `v`, captured
     at the top: the final-wrong branch reveals the solution into these
     same inputs (see its own snapshot comment). */
  xapiAnswered('004', 'q1', s4Ok,
    s4Ok || s4Attempts >= S4.maxAttempts,
    S4_KEYS.map(function (k) { return k + '=' + v[k]; }).join(', '));

  if (s4Ok) {
    s4Result = 'correct';
    s4Mark('correct');
    s4ShowPopup('correct');
    s4Finish();
  } else if (s4Attempts >= S4.maxAttempts) {
    s4Result = 'incorrect';
    s4Answer = v;   // snapshot BEFORE the reveal overwrites the inputs
    s4Finish();
    s4View = 'solution';
    s4ApplyView();   // sets the correct/error class per view — solution is green, never red
  } else {
    const fc = s4FieldStates(v), fields = s4Fields(), icos = s4Icos();
    const glyphCorrect = CHECK_SVG, glyphWrong = WRONG_SVG;
    S4_KEYS.forEach(k => {
      fields[k].classList.add(fc[k] ? 'correct' : 'error');
      icos[k].innerHTML = fc[k] ? glyphCorrect : glyphWrong;
    });
    s4RevealHint();
    s4ShowPopup('retry');
    document.getElementById('s4-check').disabled = true;
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}
/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s4FinishDom() {
  const { cooking, tents, ropes, firstaid } = s4Inputs();
  [cooking, tents, ropes, firstaid].forEach(el => el.disabled = true);
  const chk = document.getElementById('s4-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s4-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s4Finish() {
  s4Answered = true;
  s4Done = true;
  s4FinishDom();
}
function s4ApplyView() {
  if (s4Answer === null) return;
  const { cooking, tents, ropes, firstaid } = s4Inputs();
  if (s4View === 'answer') {
    cooking.value = s4Answer.cooking; tents.value = s4Answer.tents;
    ropes.value = s4Answer.ropes; firstaid.value = s4Answer.firstaid;
    /* Per-field, not blanket red (producer correction, 2026-08-19): a
       category the learner DID get right must still show green here,
       same as the retry state's own s4FieldStates() use in s4Check(). */
    const fc = s4FieldStates(s4Answer), fields = s4Fields(), icos = s4Icos();
    S4_KEYS.forEach(k => {
      fields[k].classList.remove('correct', 'error'); fields[k].classList.add(fc[k] ? 'correct' : 'error');
      icos[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
  } else {
    cooking.value = S4.correct.cooking; tents.value = S4.correct.tents;
    ropes.value = S4.correct.ropes; firstaid.value = S4.correct.firstaid;
    s4Mark('correct');   // the correct solution — green border + ✓, never red
  }
  s4ShowPopup('wrong2', s4View);
}
function s4ToggleView() {
  if (s4Answer === null) return;
  s4View = (s4View === 'solution') ? 'answer' : 'solution';
  s4ApplyView();
}
function s4RevealHint() {
  const hintBtn = document.getElementById('s4-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s4OpenHint() {
  if (s4Answered) return;
  /* xAPI: requested.1 - after the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s4-hint-overlay')?.classList.remove('hidden');
}
function s4CloseHint() {
  document.getElementById('s4-hint-overlay')?.classList.add('hidden');
}
function s4CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's4-hint-overlay') s4CloseHint();
}
function s4ResetInitial() {
  s4Attempts = 0;
  s4Answered = false;
  s4Result = null;
  s4Answer = null;
  s4View = 'solution';
  const { cooking, tents, ropes, firstaid } = s4Inputs();
  [cooking, tents, ropes, firstaid].forEach(el => {
    if (!el) return;
    el.value = ''; el.disabled = false;
  });
  s4ClearMarks();
  document.getElementById('s4-popup')?.classList.add('hidden');
  document.getElementById('s4-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s4-hint');
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; }
  const chk = document.getElementById('s4-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function goBackFromS4() {
  goTo(3);
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — MultipleChoiceQuestion (Screen 50 / S5, slide 49, item
   -003 — a new self-contained question). Second use of this template
   in the project (first was S21) — same Set-based multi-select shape,
   ported verbatim. Hint hidden until the first wrong attempt (producer instruction, 2026-08-20 — this part previously showed it from the start) (S21's own established
   convention for this template). Does not use the View My Answer
   Toggle — MultipleChoiceQuestion never does (the option buttons ARE
   the learner's own selections already on screen).
   ═══════════════════════════════════════════════════════════ */
const S5 = { correctIds: new Set(['c', 'd']), maxAttempts: 2 };

let s5Selected  = new Set();
let s5Attempts  = 0;
let s5Answered  = false;
let s5Done      = false;
let s5LastWrong = null;   // sorted-JSON snapshot of the last non-final wrong Set
let s5Result    = null;   // 'correct' | 'incorrect' — read by the Progress Question nav

function s5Snapshot(set) {
  return JSON.stringify([...set].sort());
}

function s5Toggle(id) {
  if (s5Answered) return;
  if (s5Selected.has(id)) s5Selected.delete(id); else s5Selected.add(id);
  if (s5Attempts > 0) {
    document.getElementById('s5-popup')?.classList.add('hidden');
    document.querySelectorAll('#s5 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s5 .scq-opt').forEach(o => {
    const on = s5Selected.has(o.dataset.id);
    o.classList.toggle('selected', on);
    o.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  s5UpdateBar();
}

/* Shared body (correct/wrong2) transcribed verbatim from the slide's
   own OMML equation runs. */
const S5_EXPLANATION_BODY = [
  'الصعوبة التي ستواجهها مركّزة الصف هي صعوبة في الميزانية‎:',
  'عدد التذاكر التي تم طلبها للمعلمين: <span dir="ltr" class="s19-eq-row">20%<span class="s19-eq-sign">&middot;</span>150<span class="s19-eq-sign">=</span>' + s8Frac(20, 100) + '<span class="s19-eq-sign">&middot;</span>150<span class="s19-eq-sign">=</span>0.2<span class="s19-eq-sign">&middot;</span>150<span class="s19-eq-sign">=</span>30</span>',
  // Breaks after "לכן" and after "הוא:" (producer instruction,
  // 2026-08-20) — each conclusion starts on its own line.
  'هناك 30 تذكرة للمعلمين، لكن حضر 32 معلمًا، ولذلك<br>تنقص تذكرتان للمعلمين‎.',
  'عدد تذاكر الطلاب هو:<br><span dir="ltr">150 &minus; 30 = 120</span>120',
  'هناك 120 تذكرة للطلاب، لكن حضر 118 طالبًا فقط – بقيت تذكرتان غير مستخدمتين‎ للطلاب.',
  '<strong>يمكن لمركّزة الصف إعطاء تذكرتَيّ الطلاب الشاغرتين للمعلمَين الإضافيَّين – لكن تذكرة الطالب أغلى من تذكرة المعلم، ولذلك ستكون مصروفاتها أعلى من المخطط‎.</strong>',
  '<strong>بالإضافة إلى ذلك، لديها بلوزتان إضافيتان للطلاب‎.</strong>',
];
const S5_POPUP_CFG = {
  /* MCQ-ONLY retry copy (producer, 2026-09-01) — same wording and same
     reasoning as part 01 S21, the module's other MultipleChoiceQuestion:
     a multi-select set can be partly right, so the retry popup says the
     set is not FULLY correct without hinting which member is at fault.
     Do not copy this onto SingleChoiceQuestion screens (S3/S6 here still
     use the project's standard "התשובה אינה נכונה." / "שננסה שוב?"). */
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة بالكامل‎.', body: ['حاولوا مرة أخرى‎.'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S5_EXPLANATION_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، هذا جزء طبيعي من عملية التعلم.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S5_EXPLANATION_BODY },
};

function s5ShowPopup(type) {
  const popup = document.getElementById('s5-popup');
  if (!popup) return;
  const cfg = S5_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  document.getElementById('s5-popup-title').innerHTML = cfg.title;
  document.getElementById('s5-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s5Mark(id, cls) {
  const opt = document.querySelector('#s5 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}

function s5Check() {
  if (s5Answered) { advanceScreen(); return; }
  if (s5Selected.size < 1) return;

  s5Attempts++;
  const isCorrect = setsEqual(s5Selected, S5.correctIds);

  /* xAPI: answered - before the branches. A multi-select reports the whole
     submitted SET as one response, which is the granularity the UI decides
     at: setsEqual() is all-or-nothing and there is no per-option result to
     report without inventing one. */
  xapiAnswered('005', 'q1', isCorrect,
    isCorrect || s5Attempts >= S5.maxAttempts,
    xapiMultiAnswer(Array.from(s5Selected), function (id) { return xapiScqOptEl('s5', id); }));

  if (isCorrect) {
    s5Result = 'correct';
    S5.correctIds.forEach(id => s5Mark(id, 'correct'));
    s5ShowPopup('correct');
    s5Finish();
  } else if (s5Attempts >= S5.maxAttempts) {
    // Final wrong: reveal the FULL correct set (including any option never
    // selected) as correct, AND mark the learner's own wrong selections —
    // both at once (MultipleChoiceQuestion.md reveal rules).
    s5Result = 'incorrect';
    S5.correctIds.forEach(id => s5Mark(id, 'correct'));
    s5Selected.forEach(id => { if (!S5.correctIds.has(id)) s5Mark(id, 'wrong'); });
    s5ShowPopup('wrong2');
    s5Finish();
  } else {
    /* Non-final wrong: reveal the truth about EVERY option the learner
       submitted, and only those (project lead, 2026-09-01) — identical
       to part 01 S21, this module's other MultipleChoiceQuestion. A
       selected option that is right goes green/✓; a selected option that
       is wrong goes red/✕; a correct option the learner never picked
       stays neutral, so the retry still has something to find.

       The point of marking the right picks too is that a submitted set
       must never come back half-revealed — one member reddened while
       another sits in plain purple `.selected` reads as "we didn't
       bother to check that one". Either every submitted option is
       judged or none is.

       (Supersedes two earlier passes on this same branch, both dated
       2026-09-01: the original marked ONLY the wrong picks, which is the
       half-revealed state above; the pass after it revealed nothing at
       all. This is the settled rule — check with the producer before
       moving it again.)

       Everything else about the retry is unchanged: group-level popup,
       selection stays editable (nothing is disabled until s5Finish),
       s5Toggle clears these marks and hides the popup the moment the set
       changes, and s5UpdateBar keeps צדקתי? disabled until the set
       differs from s5LastWrong. The hint still reveals here — that is
       this screen's own behaviour, unrelated.

       720-templates/references/MultipleChoiceQuestion.md still documents
       the older reveal rule; this screen deliberately does not follow it.
       Do not propagate either direction without an instruction. The
       final-wrong and correct branches above are untouched and still
       follow the template. */
    s5Selected.forEach(id => s5Mark(id, S5.correctIds.has(id) ? 'correct' : 'wrong'));
    s5LastWrong = s5Snapshot(s5Selected);
    s5RevealHint();
    s5ShowPopup('retry');
    s5UpdateBar();
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s5FinishDom() {
  document.querySelectorAll('#s5 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s5-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s5-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s5Finish() {
  s5Answered = true;
  s5Done = true;
  s5FinishDom();
}

function s5UpdateBar() {
  if (s5Answered) return;
  const chk = document.getElementById('s5-check');
  if (chk) chk.disabled = s5Selected.size < 1 || s5Snapshot(s5Selected) === s5LastWrong;
}

function s5ResetInitial() {
  s5Selected = new Set();
  s5Attempts = 0;
  s5Answered = false;
  s5LastWrong = null;
  s5Result = null;
  document.querySelectorAll('#s5 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s5-popup')?.classList.add('hidden');
  document.getElementById('s5-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s5-hint');
  // Hidden until the first wrong attempt (producer instruction,
  // 2026-08-20) — revealed by s5RevealHint() from the retry branch.
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; } // hidden-until-first-wrong policy
  const chk = document.getElementById('s5-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function s5RevealHint() {
  const hintBtn = document.getElementById('s5-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s5OpenHint() {
  if (s5Answered) return;
  /* xAPI: requested.1 - after the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('005', 'q1');
  document.getElementById('s5-hint-overlay')?.classList.remove('hidden');
}
function s5CloseHint() {
  document.getElementById('s5-hint-overlay')?.classList.add('hidden');
}
function s5CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's5-hint-overlay') s5CloseHint();
}

function goBackFromS5() {
  goTo(4);
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestion (Screen 51 / S6, slide 50, item
   -004 — a new self-contained question). Same "mark both simultaneously
   on final-wrong" shape as S2Q, maxAttempts:2 (no presenter-note
   deviation). Hint hidden until the first wrong attempt (producer instruction, 2026-08-20 — this part previously showed it from the start) (S23's own established
   convention for this template).
   ═══════════════════════════════════════════════════════════ */
const S6 = { correctId: 'c', maxAttempts: 2 }; // 'c' = פרו-מקס, 25g vs 24g

let s6Selected  = null;
let s6Attempts  = 0;
let s6Answered  = false;
let s6Done      = false;
let s6LastWrong = null;
let s6Result    = null; // 'correct' | 'incorrect' — read by the Progress Question nav

function s6Select(id) {
  if (s6Answered) return;
  s6Selected = id;
  if (s6Attempts > 0) {
    document.getElementById('s6-popup')?.classList.add('hidden');
    document.querySelectorAll('#s6 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s6 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  s6UpdateBar();
}

function s6Mark(id, cls) {
  const opt = document.querySelector('#s6 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}

/* Shared body (correct/wrong2) transcribed verbatim from the slide's
   own OMML equation runs. */
const S6_EXPLANATION_BODY = [
  'لكي نقارن بين المنتجين، علينا حساب كمية البروتين الفعلية (بالغرامات) في كل منتج‎:',
  '<strong>برو-ماكس‎:</strong><br><span dir="ltr" class="s19-eq-row">' + s8Frac(10, 100) + '<span class="s19-eq-sign">&middot;</span>250<span class="s19-eq-sign">=</span>25</span>',
  '<strong>إكسترا-فيت‎:</strong><br><span dir="ltr" class="s19-eq-row">' + s8Frac(16, 100) + '<span class="s19-eq-sign">&middot;</span>150<span class="s19-eq-sign">=</span>24</span>',
  'من المفضل أن يختار عامر برو-ماكس، لأنه يحتوي على 25 غرام من البروتين، بينما يحتوي إكسترا-فيت على 24 غرام فقط.',
];
const S6_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S6_EXPLANATION_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، من الرائع أنكم حاولتم، والآن يمكن التدقيق‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S6_EXPLANATION_BODY },
};

function s6ShowPopup(type) {
  const popup = document.getElementById('s6-popup');
  if (!popup) return;
  const cfg = S6_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  document.getElementById('s6-popup-title').innerHTML = cfg.title;
  document.getElementById('s6-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s6Check() {
  if (s6Answered) { advanceScreen(); return; }
  if (!s6Selected) return;

  s6Attempts++;
  const isCorrect = s6Selected === S6.correctId;

  /* xAPI: answered - after both guards, before the branches. */
  xapiAnswered('006', 'q1', isCorrect,
    isCorrect || s6Attempts >= S6.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s6', s6Selected)));

  if (isCorrect) {
    s6Result = 'correct';
    s6Mark(S6.correctId, 'correct');
    s6ShowPopup('correct');
    s6Finish();
  } else if (s6Attempts >= S6.maxAttempts) {
    s6Result = 'incorrect';
    s6Mark(S6.correctId, 'correct');
    s6Mark(s6Selected, 'wrong');
    s6ShowPopup('wrong2');
    s6Finish();
  } else {
    s6Mark(s6Selected, 'wrong');
    s6LastWrong = s6Selected;
    s6RevealHint();
    s6ShowPopup('retry');
    s6UpdateBar();
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s6FinishDom() {
  document.querySelectorAll('#s6 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s6-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s6-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s6Finish() {
  s6Answered = true;
  s6Done = true;
  s6FinishDom();
}

function s6UpdateBar() {
  if (s6Answered) return;
  const chk = document.getElementById('s6-check');
  if (chk) chk.disabled = !s6Selected || s6Selected === s6LastWrong;
}

function s6ResetInitial() {
  s6Selected = null;
  s6Attempts = 0;
  s6Answered = false;
  s6LastWrong = null;
  s6Result = null;
  document.querySelectorAll('#s6 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s6-popup')?.classList.add('hidden');
  document.getElementById('s6-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s6-hint');
  // Hidden until the first wrong attempt (producer instruction,
  // 2026-08-20) — revealed by s6RevealHint() from the retry branch.
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; } // hidden-until-first-wrong policy
  const chk = document.getElementById('s6-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function s6RevealHint() {
  const hintBtn = document.getElementById('s6-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s6OpenHint() {
  if (s6Answered) return;
  /* xAPI: requested.1 - after the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('006', 'q1');
  document.getElementById('s6-hint-overlay')?.classList.remove('hidden');
}
function s6CloseHint() {
  document.getElementById('s6-hint-overlay')?.classList.add('hidden');
}
function s6CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's6-hint-overlay') s6CloseHint();
}

function goBackFromS6() {
  goTo(5);
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — True/False Question, local variant (Screen 52 / S7,
   slide 51, item -005 — a new self-contained question). 5 independent
   binary rows, named per-field locals (row keys 1-5, matching this
   project's own S11/S4 convention rather than an array), validated
   HOLISTICALLY as one combined outcome. No per-row marking on a
   non-final wrong attempt (DropdownQuestion.md QA rule, already
   applied to S1). On final wrong, both the learner's own wrong pick
   and the correct option are marked simultaneously per row — no View
   My Answer Toggle needed (both toggle values stay visible at once).
   Hint hidden until the first wrong attempt (producer instruction, 2026-08-20 — this part previously showed it from the start) (S1's own established convention for this
   closest sibling).
   ═══════════════════════════════════════════════════════════ */
const S7 = {
  correct: { 1: 'true', 2: 'false', 3: 'false', 4: 'true', 5: 'false' },
  maxAttempts: 2,
};
const S7_ROWS = [1, 2, 3, 4, 5];

let s7Selections = { 1: null, 2: null, 3: null, 4: null, 5: null };
let s7Attempts = 0, s7Answered = false, s7Done = false;
let s7Result = null; // 'correct' | 'incorrect' — read by the Progress Question nav

function s7Btn(row, value) {
  return document.querySelector('#s7-row-' + row + ' .tf-opt[data-value="' + value + '"]');
}
function s7AllAnswered() {
  return S7_ROWS.every(r => s7Selections[r] !== null);
}
function s7IsCorrect() {
  return S7_ROWS.every(r => s7Selections[r] === S7.correct[r]);
}
function s7Toggle(row, value) {
  if (s7Answered) return;
  s7Selections[row] = value;
  if (s7Attempts > 0) {
    document.getElementById('s7-popup')?.classList.add('hidden');
    S7_ROWS.forEach(r => {
      s7Btn(r, 'true')?.classList.remove('correct', 'wrong');
      s7Btn(r, 'false')?.classList.remove('correct', 'wrong');
    });
  }
  ['true', 'false'].forEach(v => {
    const btn = s7Btn(row, v);
    if (!btn) return;
    const sel = v === value;
    btn.classList.toggle('selected', sel);
    btn.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  s7UpdateBar();
}

/* Shared body (correct/wrong2) transcribed verbatim from the slide's
   own OMML equation runs.
   PROJECT-WIDE UNIT-PHRASE ARRANGEMENT (producer decision, restated in
   positional terms 2026-08-27). The rendered PPTX is the source of truth
   for how a trailing "unit + number" sits in an equation row, and it is
   consistent throughout the script:

     physically LEFT to RIGHT:   ... = <unit word> <number>
     from the RIGHT edge left:   number -> unit word -> "=" -> the rest

   i.e. the NUMBER is physically to the RIGHT of the unit word, and the
   unit word is physically to the RIGHT of the "=". Part 05 has always
   built it this way; this file, part 03 and part 07 were briefly built
   inverted on 2026-08-26 and corrected on 2026-08-27.

   The unit word and the number are each wrapped in their OWN <bdi>, and
   the row is direction:ltr, so DOM order IS physical left-to-right order
   and the arrangement above is read straight off the source. A single
   enclosing dir="ltr" span is NOT enough: such a run holds no strong-LTR
   character (digits are bidi-WEAK), so bidi can resolve the whole run as
   RTL and swap the pair. Never collapse the two <bdi> elements back into
   one text run, and never re-order them without rendered evidence from
   the PPTX — a Hebrew phrase quoted in a bug report or a comment cannot
   express physical order, because the quoting medium reorders it too. */
const S7_EXPLANATION_BODY = [
  '‎نحسب عدد المصوتين للخيارين الأكثر تفضيلًا: %35 و-%30 من أصل 80 مصوّتًا.',
  '1. <strong>‎صحيح</strong> - عدد الذين اختاروا البارك المائي: <span dir="ltr" class="s19-eq-row">%35<span class="s19-eq-sign">&middot;</span>80<span class="s19-eq-sign">=</span>' + s8Frac(35, 100) + '<span class="s19-eq-sign">&middot;</span>80<span class="s19-eq-sign">=</span><span dir="ltr"><bdi>طالبًا</bdi> <bdi>28</bdi></span></span>',
  '2. <strong>‎غير صحيح</strong> - %35 هي النسبة المئوية، وليست الكمية الفعلية (28 طالبًا)‎.',
  '3. ‎<strong>غير صحيح</strong> - %30 هي النسبة المئوية، وليست الكمية الفعلية (24 طالبًا)‎.',
  '4. <strong>‎صحيح</strong> - عدد الذين اختاروا مجمع النينجا: <span dir="ltr" class="s19-eq-row">%30<span class="s19-eq-sign">&middot;</span>80<span class="s19-eq-sign">=</span>' + s8Frac(30, 100) + '<span class="s19-eq-sign">&middot;</span>80<span class="s19-eq-sign">=</span><span dir="ltr"><bdi>طالبًا</bdi> <bdi>24</bdi></span></span><br>هي كمية أقل من 25.',
  '5. <strong>‎غير صحيح</strong> - كما ورد في السؤال، فإن الـ %35 المتبقية موزعة على عدة خيارات، وقد اختار كل واحد منها عدد قليل من الطلاب‎.',
];
const S7_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S7_EXPLANATION_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'غير دقيق.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S7_EXPLANATION_BODY },
};

function s7ShowPopup(type) {
  const popup = document.getElementById('s7-popup');
  if (!popup) return;
  const cfg = S7_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  document.getElementById('s7-popup-title').innerHTML = cfg.title;
  document.getElementById('s7-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s7Check() {
  if (s7Answered) { advanceScreen(); return; }
  if (!s7AllAnswered()) return;

  s7Attempts++;
  /* Hoisted so the branch and the answered calls share ONE evaluation. */
  const s7Ok = s7IsCorrect();

  /* xAPI: item 007 carries five נכון/לא נכון rows on ONE screen, and the
     code knows each row separately (s7Selections[r] vs S7.correct[r]), so
     each row reports its OWN result instead of collapsing to s7IsCorrect()
     - reporting five identical all-or-nothing results would throw away
     information the UI already has (6.3).

     isLast is SHARED and derived from the whole screen, because attempts
     are per-screen: the learner cannot retry one row on its own.

     S7_ROWS is [1, 2, 3, 4, 5] in display order, which is the order of
     q1..q5 in metadata/ - the five statements the learner ticks. */
  S7_ROWS.forEach(function (r, i) {
    xapiAnswered('007', 'q' + (i + 1), s7Selections[r] === S7.correct[r],
      s7Ok || s7Attempts >= S7.maxAttempts, String(s7Selections[r]));
  });

  if (s7Ok) {
    s7Result = 'correct';
    S7_ROWS.forEach(r => s7Btn(r, S7.correct[r])?.classList.add('correct'));
    s7ShowPopup('correct');
    s7Finish();
  } else if (s7Attempts >= S7.maxAttempts) {
    s7Result = 'incorrect';
    S7_ROWS.forEach(r => {
      s7Btn(r, S7.correct[r])?.classList.add('correct');
      if (s7Selections[r] !== S7.correct[r]) s7Btn(r, s7Selections[r])?.classList.add('wrong');
    });
    s7ShowPopup('wrong2');
    s7Finish();
  } else {
    // First wrong: no per-row reveal — just the retry popup, all rows
    // stay selectable (DropdownQuestion.md QA rule).
    s7RevealHint();
    s7ShowPopup('retry');
    document.getElementById('s7-check').disabled = true;
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s7FinishDom() {
  document.querySelectorAll('#s7 .tf-opt').forEach(b => { b.disabled = true; });
  const chk = document.getElementById('s7-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s7-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s7Finish() {
  s7Answered = true;
  s7Done = true;
  s7FinishDom();
}

function s7UpdateBar() {
  if (s7Answered) return;
  const chk = document.getElementById('s7-check');
  if (chk) chk.disabled = !s7AllAnswered();
}

function s7ResetInitial() {
  s7Selections = { 1: null, 2: null, 3: null, 4: null, 5: null };
  s7Attempts = 0;
  s7Answered = false;
  s7Result = null;
  document.querySelectorAll('#s7 .tf-opt').forEach(b => {
    b.classList.remove('selected', 'correct', 'wrong');
    b.disabled = false;
    b.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s7-popup')?.classList.add('hidden');
  document.getElementById('s7-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s7-hint');
  // Hidden until the first wrong attempt (producer instruction,
  // 2026-08-20) — revealed by s7RevealHint() from the retry branch.
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; } // hidden-until-first-wrong policy
  const chk = document.getElementById('s7-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function s7RevealHint() {
  const hintBtn = document.getElementById('s7-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s7OpenHint() {
  if (s7Answered) return;
  /* xAPI: requested.1 - after the answered guard above and immediately
     This screen has ONE shared hint for all five rows, so it is reported
     ONCE against q1 as the item's first question. Reporting it against
     all five would claim five hint requests where the learner made one.
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('007', 'q1');
  document.getElementById('s7-hint-overlay')?.classList.remove('hidden');
}
function s7CloseHint() {
  document.getElementById('s7-hint-overlay')?.classList.add('hidden');
}
function s7CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's7-hint-overlay') s7CloseHint();
}

function goBackFromS7() {
  goTo(6);
}


/* ═══════════════════════════════════════════════════════════
   COMPONENT — Progress Question nav (720-templates skill →
   _global-components.md → "Progress Question"), covering S1-S7 —
   the 5-question practice set kicked off by S0 ("5 שאלות"). Ported
   verbatim from this SAME lomda's own part 02 (methodica-math-
   percent-02-02/js/main.js), which already established this exact
   pattern for a question spanning multiple sub-screens: producer
   confirmed there (and again here, for Q1 = S1+S2+S3's own א/ב/ג
   sub-parts) that a question's dot only becomes correct/incorrect
   once ALL of its sub-screens are resolved — never early, even if an
   earlier sub-part already failed. State is DERIVED from each screen's
   own existing s*Done/s*Result variables, not a second tracked flag —
   avoids a source of truth that could drift from the real per-screen
   state. Click-to-navigate on a resolved/current question's dot goes
   to its FIRST sub-screen.
   ═══════════════════════════════════════════════════════════ */
const PRACTICE_QUESTIONS = [
  { number: 1, screens: [1, 2, 3] },
  { number: 2, screens: [4] },
  { number: 3, screens: [5] },
  { number: 4, screens: [6] },
  { number: 5, screens: [7] }
];

/* One getter per question screen: null while unresolved, else
   'correct'/'incorrect'. Each reads that screen's OWN existing
   s*Done/s*Result variables — no parallel tracking. */
const PRACTICE_SCREEN_OUTCOME = {
  1: () => (typeof s1Done !== 'undefined' && s1Done) ? s1Result : null,
  2: () => (typeof s2Done !== 'undefined' && s2Done) ? s2Result : null,
  3: () => (typeof s3Done !== 'undefined' && s3Done) ? s3Result : null,
  4: () => (typeof s4Done !== 'undefined' && s4Done) ? s4Result : null,
  5: () => (typeof s5Done !== 'undefined' && s5Done) ? s5Result : null,
  6: () => (typeof s6Done !== 'undefined' && s6Done) ? s6Result : null,
  7: () => (typeof s7Done !== 'undefined' && s7Done) ? s7Result : null,
};


/* Generic renderer — one copy for every screen, per the doc's reuse
   rule. `visited` is DERIVED (state !== 'not-answered'), not a second
   stored flag — this lomda's strictly linear/gated progression means
   "visited but still unresolved and not current" is not reachable. */
function updateProgressQuestion(container) {
  const states = PRACTICE_QUESTIONS.map(practiceQuestionState);
  PRACTICE_QUESTIONS.forEach((q, i) => {
    const item = container.querySelector('[data-question="' + q.number + '"]');
    if (!item) return;
    const state = states[i];
    const visited = state !== 'not-answered';
    const icon = item.querySelector('.progress-question__icon');
    icon.classList.remove(
      'progress-question__icon--current',
      'progress-question__icon--correct',
      'progress-question__icon--incorrect'
    );
    if (state !== 'not-answered') icon.classList.add('progress-question__icon--' + state);
    item.querySelector('.progress-question__label').classList.toggle('progress-question__label--visited', visited);
    const targetScreen = q.screens[0];
    const navigable = visited && targetScreen !== currentScreen;
    item.style.cursor = navigable ? 'pointer' : '';
    item.onclick = navigable ? (() => goTo(targetScreen)) : null;
  });
  for (let n = 1; n < PRACTICE_QUESTIONS.length; n++) {
    const conn = container.querySelector('[data-connector="' + n + '"]');
    if (!conn) continue;
    const resolved = states[n - 1] === 'correct' || states[n - 1] === 'incorrect';
    conn.classList.toggle('progress-question__connector--visited', resolved);
  }
}
function syncPracticeProgressNav(sectionEl) {
  const nav = sectionEl?.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav);
}

/* Thousands separators in numeric answer inputs — the implementation is
   shared: see ../unit-js/18-numeric-input.js for the full rationale.
   ⚠️ This call moves into unit-js/90-boot.js once that exists; it stays
   here for now so the install point in the load order is unchanged. */


/* This part's own startup, called by unit-js/90-boot.js.

   resetScreenState(0) runs BEFORE the reveal, and must: it resolves the
   companion character, which has to be correct before the screen becomes
   visible or the learner sees the wrong avatar for a frame (§8.11). */
function partBoot() {
  resetScreenState(0); // restore state on initial page load, not only on goTo()
  window.Motion && Motion.reveal(document.querySelector('.screen.active')); // initial screen's own reveal — held until window.load, see motion.js
  PartNav.init({
    part: '02',
    getScreen: function () { return currentScreen; },
    goTo: goTo
  });
}

/* ════════════ xAPI (720) — קונפיגורציה של הסין (§6.1) ════════════
   Data only. The shared layer in ../unit-js/ reads every value here at CALL
   time, which is why the block sits at the bottom, after all the code that
   uses it.

   DERIVED BY MATCHING CONTENT, NOT FROM mapping.txt. The slide-to-item file
   was dropped from the metadata export, so every line below was produced by
   reading this part's screen text against metadata/methodica-math-percent-02-02.json
   and cross-checking which screens own a *Check function. Each screen carries
   the matched item's title so the derivation stays auditable without redoing
   it. Every suffix comes from metadata/ - never from a code comment and never
   from a remembered slide number (see 4.2, and 6.2 trap 2: prose in this
   family numbers screens 1-based, these keys are 0-based).

   WHY THIS COMPONENT'S SUFFIXES START AT 003, WITH NO 001 OR 002.
   metadata/ originally gave component -02 seven items, but its first two -
   'שאלת חימום: הורדת משחק' and 'שאלת חימום: סוללת אוזניות' - are code part
   01's screens 21-24 (s21Check..s24Check), not this part's. A part reports
   exactly ONE component, so leaving them here made them unreportable; they
   were moved to component -01 as items 008/009 instead.
   The remaining five are deliberately NOT renumbered to 001-005: these ids
   already exist in Kata, renumbering would orphan five items and create five
   new ones, and 3-digit suffixes only have to be unique, not contiguous.
*/
var SCREEN_TO_SUBCONTENT = {
  0:  null,          /* מעבר - "סיימנו את שלב הלימוד... 5 שאלות"; אין פריט בקטלוג */
  1:  ['003', 1],    /* יום גיבוש מועדון נוער - סעיף א */
  2:  ['003', 2],    /* אותו פריט - סעיף ב (3 סעיפים = 3 מסכים) */
  3:  ['003', 3],    /* אותו פריט - סעיף ג */
  4:  ['004', 1],    /* חלוקת נפח ציוד במכולה */
  5:  ['005', 1],    /* חלוקת כרטיסים לגמר הארצי */
  6:  ['006', 1],    /* השוואת תכולת חלבון בין מעדנים */
  7:  ['007', 1]     /* סקר טיול שכבתי - 5 היגדים במסך אחד, s7Check אחד */
};

/* Exactly TOTAL_SCREENS keys (8), 0..7, no gaps. A MISSING key is
   indistinguishable at runtime from null - the screen silently stops
   reporting. _test/verify-shared.js enforces the count, the contiguity and
   two-way coverage against metadata/ (6.2 traps 1 and 3). */

var XAPI_COMP_SLUG = 'methodica-math-percent-02-02';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* MUST end '/' - 6.1 */
var XAPI_EVAL_ITEMS = { '003': 1, '004': 1, '005': 1, '006': 1, '007': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-02-02.json';


/* ═══════════════ resume — the four per-part hooks (§8.7) ═══════════════
   Here because every learner state variable in this file is declared `let` at
   top level: the global LEXICAL environment, not reachable through window. */

function capturePartPayload() {
  return {
    currentScreen: currentScreen,

    /* S1 - dropdown slots. `selections` is what restores the visible LABELS in
       applyResumeDom; without them the marks land on empty cells (§8.9). */
    s1: {
      selections: JSON.parse(JSON.stringify(s1Selections)),
      attempts:   s1Attempts,
      answered:   s1Answered,
      done:       s1Done,
      lastWrong:  s1LastWrong,
      answer:     s1Answer,
      view:       s1View,
      result:     s1Result
    },

    /* S2 - one numeric input. The typed value is DOM-only on the correct
       path, where s2Answer stays null. */
    s2: {
      attempts:  s2Attempts,  answered: s2Answered, done: s2Done,
      lastWrong: s2LastWrong, answer:   s2Answer,   view: s2View,
      result:    s2Result,
      input:     (document.getElementById('s2-input') || {}).value || ''
    },

    s3: { selected: s3Selected, attempts: s3Attempts, answered: s3Answered,
          done: s3Done, lastWrong: s3LastWrong, result: s3Result },

    /* S4 - four fields with a reveal toggle. */
    s4: {
      attempts: s4Attempts, answered: s4Answered, done: s4Done,
      result:   s4Result,   answer:   s4Answer,   view: s4View,
      inputs: (function () {
        var i = s4Inputs(), o = {};
        S4_KEYS.forEach(function (k) { o[k] = i[k] ? i[k].value : ''; });
        return o;
      }())
    },

    /* S5 - multi-select. ⚠️ s5Selected is a SET, and a Set serialises as {}:
       stored as an ARRAY here and rebuilt as a Set in applyResumeVars, or the
       whole selection restores empty with nothing to show that it did. */
    s5: {
      selected:  Array.from(s5Selected),
      attempts:  s5Attempts, answered: s5Answered, done: s5Done,
      lastWrong: s5LastWrong, result:  s5Result
    },

    s6: { selected: s6Selected, attempts: s6Attempts, answered: s6Answered,
          done: s6Done, lastWrong: s6LastWrong, result: s6Result },

    /* S7 - five true/false rows on one screen. */
    s7: {
      selections: JSON.parse(JSON.stringify(s7Selections)),
      attempts:   s7Attempts, answered: s7Answered, done: s7Done,
      result:     s7Result
    }
  };
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.s1) {
    if (st.s1.selections) s1Selections = JSON.parse(JSON.stringify(st.s1.selections));
    s1Attempts = st.s1.attempts || 0;  s1Answered = !!st.s1.answered;
    s1Done = !!st.s1.done;             s1LastWrong = st.s1.lastWrong;
    s1Answer = (st.s1.answer === undefined) ? null : st.s1.answer;
    s1View = st.s1.view || 'solution'; s1Result = st.s1.result;
  }
  if (st.s2) {
    s2Attempts = st.s2.attempts || 0;  s2Answered = !!st.s2.answered;
    s2Done = !!st.s2.done;             s2LastWrong = st.s2.lastWrong;
    s2Answer = (st.s2.answer === undefined) ? null : st.s2.answer;
    s2View = st.s2.view || 'solution'; s2Result = st.s2.result;
  }
  if (st.s3) {
    s3Selected = st.s3.selected;  s3Attempts = st.s3.attempts || 0;
    s3Answered = !!st.s3.answered; s3Done = !!st.s3.done;
    s3LastWrong = st.s3.lastWrong; s3Result = st.s3.result;
  }
  if (st.s4) {
    s4Attempts = st.s4.attempts || 0; s4Answered = !!st.s4.answered;
    s4Done = !!st.s4.done;            s4Result = st.s4.result;
    s4Answer = (st.s4.answer === undefined) ? null : st.s4.answer;
    s4View = st.s4.view || 'solution';
  }
  if (st.s5) {
    /* back into a Set - see the capture note */
    s5Selected = new Set(Array.isArray(st.s5.selected) ? st.s5.selected : []);
    s5Attempts = st.s5.attempts || 0; s5Answered = !!st.s5.answered;
    s5Done = !!st.s5.done;            s5LastWrong = st.s5.lastWrong;
    s5Result = st.s5.result;
  }
  if (st.s6) {
    s6Selected = st.s6.selected;  s6Attempts = st.s6.attempts || 0;
    s6Answered = !!st.s6.answered; s6Done = !!st.s6.done;
    s6LastWrong = st.s6.lastWrong; s6Result = st.s6.result;
  }
  if (st.s7) {
    if (st.s7.selections) s7Selections = JSON.parse(JSON.stringify(st.s7.selections));
    s7Attempts = st.s7.attempts || 0; s7Answered = !!st.s7.answered;
    s7Done = !!st.s7.done;            s7Result = st.s7.result;
  }
}

function applyResumeDom(st) {
  if (!st) return;
  /* Guarded per block, not once at the top (§8.9). */

  /* ⚠️ S1's dropdown labels. THE §8.9 case: the value map restores fine and the
     marking function reads THAT map, so without this block the screen comes
     back showing ✓ and ✗ on visibly EMPTY cells - and everything the code can
     check says the restore worked. The label is a projection of state that no
     other restore path reproduces, because its only writers are live-play
     click handlers. */
  if (st.s1 && st.s1.selections) {
    S1_SLOTS.forEach(function (n) {
      var sel = document.getElementById('dq-selected-' + n);
      var btn = document.getElementById('dq-btn-' + n);
      var v = st.s1.selections[n];
      if (sel && v !== null && v !== undefined && v !== '') {
        /* Exactly the two writes s1Select() makes on a click, and nothing
           more: s1Selections stores the DISPLAY string itself, so there is no
           value-to-label lookup to do. (An earlier version routed through an
           S1.options map that does not exist; it fell through to the raw value
           and therefore worked, which is the worst way for dead code to
           behave.) */
        sel.textContent = v;
        if (btn) btn.removeAttribute('data-empty');
      }
    });
  }

  if (st.s2 && typeof st.s2.input === 'string') {
    var e2 = document.getElementById('s2-input');
    if (e2) e2.value = st.s2.input;
  }

  if (st.s4 && st.s4.inputs) {
    var i4 = s4Inputs();
    S4_KEYS.forEach(function (k) {
      if (i4[k] && typeof st.s4.inputs[k] === 'string') i4[k].value = st.s4.inputs[k];
    });
  }
}

function restoreScreenUI(n) {
  /* ⚠️ NEVER delegate to resetScreenState(n) and never reach a sNResetInitial():
     this runs on EVERY navigation (§8.4a), and reset's not-answered branch
     clears the inputs and selections - it would wipe a half-finished answer on
     every screen change (§8.8 rule 5, risk 1). */
  if (n === 1) {
    paintDropdownSlots({
      done: s1Done, attempts: s1Attempts, answer: s1Answer, view: s1View,
      slots: S1_SLOTS,
      mark: s1Mark, applyView: s1ApplyView, showPopup: s1ShowPopup,
      finishDom: s1FinishDom,
      showHint: function () { s1RevealHint(); },
      updateBar: s1UpdateBar
    });
  }
  if (n === 2) {
    paintSingleValue({
      done: s2Done, attempts: s2Attempts, answer: s2Answer,
      input: function () { return document.getElementById('s2-input'); },
      field: function () { return document.getElementById('s2-input-field'); },
      ico:   function () { return document.getElementById('s2-input-ico'); },
      applyView: s2ApplyView, showPopup: s2ShowPopup, finishDom: s2FinishDom,
      showHint: function () { s2RevealHint(); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG
    });
  }
  if (n === 3) {
    paintSingleChoice({
      done: s3Done, attempts: s3Attempts, selected: s3Selected,
      lastWrong: s3LastWrong, lastResult: s3Result,
      correctId: S3.correctId,
      mark: s3Mark, showPopup: s3ShowPopup, finishDom: s3FinishDom,
      updateBar: s3UpdateBar
    });
  }
  if (n === 4) {
    paintValueFields({
      done: s4Done, attempts: s4Attempts, answered: s4Answered,
      answer: s4Answer,
      keys: S4_KEYS,
      inputs: s4Inputs, fields: s4Fields, icos: s4Icos,
      fieldStates: s4FieldStates,
      applyView: s4ApplyView, showPopup: s4ShowPopup, finishDom: s4FinishDom,
      showHint: function () { s4RevealHint(); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG,
      checkButton: undefined
    });
  }
  if (n === 5) {
    paintMultiSelect({
      done: s5Done, attempts: s5Attempts, lastResult: s5Result,
      selected: Array.from(s5Selected),
      correctIds: Array.from(S5.correctIds),
      mark: s5Mark, showPopup: s5ShowPopup, finishDom: s5FinishDom,
      showHint: function () { s5RevealHint(); },
      updateBar: s5UpdateBar
    });
  }
  if (n === 6) {
    paintSingleChoice({
      done: s6Done, attempts: s6Attempts, selected: s6Selected,
      lastWrong: s6LastWrong, lastResult: s6Result,
      correctId: S6.correctId,
      mark: s6Mark, showPopup: s6ShowPopup, finishDom: s6FinishDom,
      showHint: function () { s6RevealHint(); },
      updateBar: s6UpdateBar
    });
  }
  if (n === 7) {
    paintRowGrid({
      done: s7Done, attempts: s7Attempts, lastResult: s7Result,
      rows: S7_ROWS, selections: s7Selections, correct: S7.correct,
      btn: s7Btn, showPopup: s7ShowPopup, finishDom: s7FinishDom,
      showHint: function () { s7RevealHint(); },
      updateBar: s7UpdateBar
    });
  }
}
