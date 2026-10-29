'use strict';

/* ═══════════════════════════════════════════════════════════
   js/main.js — methodica-math-percent-02-04 (part 04)

   Engine (scaleApp / goTo / resetScreenState / keyboard nav / dev
   bridge) carried over from parts 01-03 so every part behaves
   identically. Screen roster:
     S0 — TransitionScreen bridge out of the practice set (slide69)
     S1 — classroom-task table, no scoring/no feedback (slide70)
   Slide numbers are the deck's own displayed numbers and map 1:1 to
   ppt/slides/slideN.xml (re-verified this session — presentation.xml's
   sldIdLst confirms 1:1 for this range; the source pptx was edited the
   same day this part was started, so this was re-checked rather than
   trusted from an older citation).
   Bump TOTAL_SCREENS as more screens are added.
   ═══════════════════════════════════════════════════════════ */

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 2;  // S0-S1

/* ─── Companion character ───────────────────────────────────
   Part 01 WRITES the learner's choice to this namespaced key; every
   later part READS it back — key string must stay byte-identical
   (720-templates → _global-components.md → Companion character system
   → "Cross-part persistence"). */
const CHARACTER_STORAGE_KEY = 'methodica_math_percent_02_selectedCharacter';
const DEFAULT_CHARACTER = 'character-1';

/* S0's main character zone — video per producer request (2026-08-09),
   supplied as character-{1,2}-hoilding-bag.mp4 (1280x720, same
   resolution as every other companion-character video in this lomda;
   confirmed via loadedmetadata, durations 5.43s/4.53s). `still` is the
   same defensive-only fallback pattern parts 01-03 use for their own
   kickoff/transition videos (S0_CHARACTER/S10_CHARACTER there) — shown
   only if the video fails to load, not expected in normal use. No
   presenter "Alt text:" note exists for this slide, so these alt
   strings are authored here. */
const S0_CHARACTER = {
  'character-1': {
    video: 'assets/video/character-1-hoilding-bag.mp4',
    still: '../unit-assets/img/character-1-normal.png',
    alt:   'الشخصية على الكرسي المتحرك تحمل حقيبة'
  },
  'character-2': {
    video: 'assets/video/character-2-hoilding-bag.mp4',
    still: '../unit-assets/img/character-2-normal.png',
    alt:   'الشخصية الزهرية تحمل حقيبة'
  }
};

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
  return (stored && Object.prototype.hasOwnProperty.call(S0_CHARACTER, stored))
    ? stored
    : DEFAULT_CHARACTER;
}

/* ─── Global lomda state ─────────────────────────────────── */
window.lomdaState = window.lomdaState || {
  selectedCharacter: getCharacter()
};

/* ─── State ─────────────────────────────────────────────── */
let currentScreen = 0;


/* ─── Navigation ────────────────────────────────────────── */
/* No screen-leave cleanup in this part, and nothing for the shared
   goTo's sweep to hide either: part 04's markup has no id ending in
   -popup or -hint-overlay. Defined empty so the hook contract is
   visible in all seven parts. */
function partScreenLeave(prev) {}

function resetScreenState(n) {
  if (n === 0) {
    s0ApplyCharacter();
    // Keep the first screen's cross-part Back button in sync with the
    // navigation trail — on initial load and on every return to S0 from
    // inside this part (js/partnav.js).
    PartNav.mountBack('s0-back');
  }
  if (n === 1) s1Reset();
}


/* S1's nudge character — plain static image, same still pose S0 uses
   as its own video-load fallback (no video here — see the answered
   clarification in this session: the producer's video request was for
   S0, not this nudge). */
function s1NudgeApplyCharacter() {
  const char = window.lomdaState.selectedCharacter || DEFAULT_CHARACTER;
  const assets = S0_CHARACTER[char] || S0_CHARACTER[DEFAULT_CHARACTER];
  const img = document.getElementById('s1-nudge-char-img');
  if (!img) return;
  img.src = assets.still;
  img.alt = assets.alt;
}


/* Cross-part navigation trail (js/partnav.js). Must run AFTER the two
   lines above: if this page was entered via a Back from part 05, init()
   jumps straight to the screen the learner left from, and it does that
   through goTo() so the landed screen gets the normal
   cancel/activate/reveal/resetScreenState treatment instead of a second,
   conflicting initial reveal. */

function advanceScreen() {
  // Re-crossing the boundary the learner just came back over: they
  // already cleared this part on the way through, but the in-page state
  // that proved it died with the page (state restoration is the resume
  // branch's job). Re-judging on empty state would be wrong, so the
  // recorded destination wins over this part's own exit logic. Harmless
  // here (part 04's exit is unconditional anyway) but kept identical in
  // every part so the rule lives in one recognisable shape.
  const returnForward = PartNav.forwardOverride();
  if (returnForward && currentScreen + 1 >= TOTAL_SCREENS) {
    PartNav.forward(returnForward);
    return;
  }
  // S1's one-time soft completion gate (notesSlide63.xml: "אם הם מנסים
  // להתקדם בלי הזנה עולה הדמות, אבל לא מונע מהם להתקדם בלחיצה נוספת" --
  // shows the character once, never blocks a second attempt). Lives here
  // rather than only in the Continue button's own handler so keyboard
  // navigation (which calls advanceScreen() directly) shares the exact
  // same gate as the button, matching every other per-screen gate in
  // this lomda.
  if (currentScreen === 1 && !s1Nudged && !s1TableComplete()) {
    s1Nudged = true;
    s1ShowNudge();
    return;
  }
  // End of this part's own linear sequence -- a physical part boundary,
  // not a score-based Decision Point, so the redirect is unconditional
  // (same convention as part 01 -> part 02).
  if (currentScreen + 1 >= TOTAL_SCREENS) {
    /* xAPI: the component result. Reported with success and NO score, on
       purpose (6.4: "for an off-computer class task, reporting a score
       would invent a number nobody measured").

       This component is a single project-or-inquiry-task item with zero
       questions in metadata/, and this part has no *Check function at all
       - the work happens in the classroom, off screen. Reaching this
       boundary is the only thing the lomda can observe, and the boundary
       is unconditional, so success is true. */
    xapiEndComponent({ success: true }, xapiActiveContinueButton());   // report and stop (2026-09-16)

    PartNav.forward('05');   // dev-only (DEV_NAV)
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


function goBackFromS0() { PartNav.back(); }

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — classroom-task table (Screen 02 · S1). No correctness
   model: every cell is free-entry and nothing is ever validated. The
   only state is whether the table is fully filled (drives the one-time
   nudge) and the character image, which persists across re-entries
   like every other companion-character mount in this lomda.
   ═══════════════════════════════════════════════════════════ */
const S1_ROWS = ['s1-r1', 's1-r2', 's1-r3', 's1-r4'];

function s1AllInputEls() {
  const els = [];
  S1_ROWS.forEach(r => {
    const count = document.getElementById(r + '-count');
    const pct   = document.getElementById(r + '-pct');
    if (count) els.push(count);
    if (pct) els.push(pct);
  });
  return els;
}
function s1TableComplete() {
  return s1AllInputEls().every(el => el.value.trim() !== '');
}
function s1HideNudge() {
  document.getElementById('s1-nudge')?.classList.add('hidden');
}
function s1ShowNudge() {
  document.getElementById('s1-nudge')?.classList.remove('hidden');
}
function s1OnInput() {
  // Any interaction dismisses the nudge — no need to keep nagging once
  // the learner is actively filling the table back in.
  s1HideNudge();
}
/* Continue's onclick. The actual gate (one free block, then advances
   regardless) lives in advanceScreen() itself so keyboard nav shares it
   too -- this is a thin alias kept so the existing HTML onclick doesn't
   need to change. s1Nudged tracks whether that one free block has
   already been spent this visit. */
let s1Nudged = false;
function s1AdvanceOrNudge() {
  advanceScreen();
}
function s1Reset() {
  s1NudgeApplyCharacter();
  s1Nudged = false;
  s1HideNudge();
}
function goBackFromS1() { goTo(0); }


document.addEventListener('keydown', e => {
  if (hasOwnArrowKeyMeaning(e.target)) return;
  if (e.key === 'ArrowLeft')  advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* Dev-mode postMessage bridge for index_dev.html — shared, see
   ../unit-js/60-devbridge.js. ⚠️ This call moves into unit-js/90-boot.js
   once that exists. */

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
  Motion.reveal(document.querySelector('.screen.active')); // initial screen's entrance
  PartNav.init({
    part: '04',
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
   reading this part's screen text against metadata/methodica-math-percent-02-04.json
   and cross-checking which screens own a *Check function. Each screen carries
   the matched item's title so the derivation stays auditable without redoing
   it. Every suffix comes from metadata/ - never from a code comment and never
   from a remembered slide number (see 4.2, and 6.2 trap 2: prose in this
   family numbers screens 1-based, these keys are 0-based).

   XAPI_EVAL_ITEMS is deliberately EMPTY. Item 001 is a
   project-or-inquiry-task with zero questions in metadata/, this part has no
   *Check function at all, and the work happens off-screen in the classroom.
   So it reports an initialized/completed pair and never emits answered -
   6.2's documented legitimate case, not an oversight.
*/
var SCREEN_TO_SUBCONTENT = {
  0:  null,          /* מעבר - "השלמת בהצלחה את התרגול - כל הכבוד!" */
  1:  ['001', 1]     /* סקר תחביבי הכיתה לפי אחוזים - משימת כיתה */
};

/* Exactly TOTAL_SCREENS keys (2), 0..1, no gaps. A MISSING key is
   indistinguishable at runtime from null - the screen silently stops
   reporting. _test/verify-shared.js enforces the count, the contiguity and
   two-way coverage against metadata/ (6.2 traps 1 and 3). */

var XAPI_COMP_SLUG = 'methodica-math-percent-02-04';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* MUST end '/' - 6.1 */
var XAPI_EVAL_ITEMS = {};
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-02-04.json';


/* ═══════════════ resume — the four per-part hooks (§8.7) ═══════════════
   Here because every learner state variable in this file is declared `let` at
   top level, which lives in the global LEXICAL environment and is not
   reachable through window. */

function capturePartPayload() {
  /* The table cells are DOM-only state (§8.9): the learner types them and no
     variable ever holds them, so without this block a resumed class task comes
     back empty. Keyed by element id so the restore is exact and order-free. */
  var cells = {};
  s1AllInputEls().forEach(function (el) { if (el.id) cells[el.id] = el.value; });

  return {
    currentScreen: currentScreen,
    s1: { nudged: s1Nudged, cells: cells }
  };
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.s1) s1Nudged = !!st.s1.nudged;
}

function applyResumeDom(st) {
  if (!st) return;
  /* Guarded per block, not once at the top (§8.9). */
  if (st.s1 && st.s1.cells) {
    s1AllInputEls().forEach(function (el) {
      if (el.id && typeof st.s1.cells[el.id] === 'string') el.value = st.s1.cells[el.id];
    });
  }
}

function restoreScreenUI(n) {
  /* Deliberately a no-op, and that is the whole finding for this part rather
     than an omission: S1 has no marks, no feedback popup and no locked state to
     re-apply - it is an open table with a soft nudge, and the nudge is a
     per-visit affordance that resetScreenState(1) resets on arrival anyway.
     The only thing a restore owes this screen is the cell values, and those
     come back through applyResumeDom.

     It still has to EXIST and stay exception-safe: repaintScreen() calls it on
     every navigation, and §8.8 rule 7's sweep asserts that no painter throws
     for any state. A quiet return is a valid painter; a missing function is a
     ReferenceError on every screen change. */
}
