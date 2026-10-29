'use strict';

/* ═══════════════════════════════════════════════════════════
   js/main.js — methodica-math-percent-02-03 (part 03)

   Engine (scaleApp / goTo / resetScreenState / keyboard nav / dev
   bridge) is carried over from part 01 so both parts behave
   identically. Screen roster so far:
     S0 — "מסך הזנקה" kickoff screen (slide 56)
     S1 — ValueInputQuestion, "20% מתוך 65" (slide 57), question א of 5
     S2 — SingleChoiceQuestion, "20% מתוך 130" (slide 58), question ב of 5
     S3 — ValueInputQuestion + image, "55% מתוך 800" (slide 59), item -002
     S4 — ValueInputQuestion + image, "15% מתוך 1,300" (slide 60), item -003
     S5 — ValueInputQuestion + image, "35% מתוך 2,400" (slide 61), item -004
     S6 — SingleChoiceQuestion + pie chart (slide 62), item -005 sub-part א
     S7 — ValueInputQuestion + pie chart (slide 63), item -005 sub-part ב
     S8 — SingleChoiceQuestion + pie chart (slide 64), item -005 sub-part ג,
          the only screen in the part with NO hint
   Slide numbers are the deck's own displayed numbers and map 1:1 to
   ppt/slides/slideN.xml (verified via presentation.xml's sldIdLst).
   Bump TOTAL_SCREENS as the remaining practice questions are added.
   ═══════════════════════════════════════════════════════════ */

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 15;  // S0-S14 — bump as screens are added

/* ─── Companion character ───────────────────────────────────
   Part 01 WRITES the learner's choice to this namespaced key; every
   later part READS it back. The key string must stay byte-identical to
   part 01's CHARACTER_STORAGE_KEY or the choice silently fails to
   carry over (720-templates → _global-components.md → Companion
   character system → "Cross-part persistence").
   ─────────────────────────────────────────────────────────── */
const CHARACTER_STORAGE_KEY = 'methodica_math_percent_02_selectedCharacter';
const DEFAULT_CHARACTER = 'character-1';

/* Per-character assets for this part's screens. Resolved ONLY through
   this logical-ID-keyed map — never by filename guessing, colour name,
   or folder order (companion character system).

   `video` is the kickoff screen's real asset: the learner who picked the
   wheelchair character (character-1) gets Character-1-Sporty.mp4, the
   one who picked the pink character (character-2) gets
   Character-2-Sporty.mp4. Both live in assets/video/ and both are
   present and verified (2026-08-05).

   `still` is the SAME character's static pose, kept purely as defensive
   degradation if a video ever fails to load on a slow//restricted LMS —
   it is NOT a placeholder and is not expected to appear in normal use.
   See s0ApplyCharacter(). */
const S0_CHARACTER = {
  'character-1': {
    video: 'assets/video/Character-1-Sporty.mp4',
    still: '../unit-assets/img/character-1-normal.png',
    alt:   'الشخصية على الكرسي المتحرك تشجّع قبل التمرين'
  },
  'character-2': {
    video: 'assets/video/Character-2-Sporty.mp4',
    still: '../unit-assets/img/character-2-normal.png',
    alt:   'الشخصية الزهرية تشجّع قبل التمرين'
  }
};

/* S10's own character-asset map (Boxing, not Sporty) — a separate map
   from S0_CHARACTER because the two screens use different video clips
   for the same character IDs. `still` reuses the SAME static poses as
   S0 (defensive fallback only, per S0_CHARACTER's own note). No
   presenter "Alt text:" note exists for this slide (checked — its rels
   have no notesSlide relationship at all), so these alt strings are
   authored here rather than copied from a source note. */
const S10_CHARACTER = {
  'character-1': {
    video: 'assets/video/Character-1-Boxing.mp4',
    still: '../unit-assets/img/character-1-normal.png',
    alt:   'الشخصية على الكرسي المتحرك تمارس الملاكمة بحماس، مستعدة للتحدي التالي'
  },
  'character-2': {
    video: 'assets/video/Character-2-Boxing.mp4',
    still: '../unit-assets/img/character-2-normal.png',
    alt:   'الشخصية الوردية تؤدي حركات ملاكمة بحماس، مستعدة للتحدي التالي'
  }
};

/* Resolve the stored choice, validating it against the IDs this part
   actually has assets for — a value left over from an older/renamed
   scheme must fall back rather than break the screen. Wrapped in
   try/catch so a storage-disabled context (private browsing) cannot
   throw. */
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
/* Screen-leave cleanup for this part (called from the shared goTo). */
function partScreenLeave(prev) {
  /* The image-zoom modal's id doesn't match either sweep suffix, and
     closeImageZoom() also clears the cloned stage content, which the
     generic sweep can't do — so it needs its own explicit close. */
  closeImageZoom();
}

function resetScreenState(n) {
  if (n === 0) {
    s0ApplyCharacter();
    // Keep the first screen's cross-part Back button in sync with the
    // navigation trail — on initial load and on every return to S0 from
    // inside this part (js/partnav.js).
    PartNav.mountBack('s0-back');
  }
  if (n === 1) {
    // Resume-state guard: a resolved question must NOT hand out a fresh
    // attempt on return. On a resolved re-entry the screen comes back on
    // the SOLUTION view with its feedback reopened (_global-components.md
    // → "Reopening feedback on return to a resolved screen"); s1vDone is
    // the only flag involved.
    if (!s1vDone) {
      s1vResetInitial();
    } else if (s1vAnswer !== null) {
      s1vView = 'solution';
      s1vApplyView();
    } else {
      s1vShowPopup('correct');
    }
  }
  if (n === 2) {
    // No View My Answer Toggle on this template (see the header comment
    // on #s2) — the option list already shows the resolved state
    // permanently (selected/correct/wrong classes persist in the DOM,
    // which is never destroyed), so resuming only has to reopen the
    // popup with whichever outcome was actually reached.
    if (!s2scDone) s2scResetInitial();
    else s2scShowPopup(s2scResult);
  }
  if (n === 3) {
    // Same resume-state contract as S1 (this template also has the View
    // My Answer Toggle): resolved-correct reopens the "correct" popup,
    // resolved-wrong reopens the toggle's current view.
    if (!s3vDone) {
      s3vResetInitial();
    } else if (s3vAnswer !== null) {
      s3vApplyView();
    } else {
      s3vShowPopup('correct');
    }
  }
  if (n === 4) {
    // Same resume contract as S1/S3 (View My Answer Toggle template).
    if (!s4vDone) {
      s4vResetInitial();
    } else if (s4vAnswer !== null) {
      s4vApplyView();
    } else {
      s4vShowPopup('correct');
    }
  }
  if (n === 5) {
    // Same resume contract again (View My Answer Toggle template).
    if (!s5vDone) {
      s5vResetInitial();
    } else if (s5vAnswer !== null) {
      s5vApplyView();
    } else {
      s5vShowPopup('correct');
    }
  }
  // Question 5's three sub-parts. S6 and S8 are SingleChoiceQuestion, so
  // they follow S2's simpler contract (no toggle: the option list already
  // shows the resolved state, so resuming only reopens the outcome that
  // was reached). S7 is a ValueInputQuestion and follows S1/S3/S4/S5's.
  if (n === 6) {
    if (!s6scDone) s6scResetInitial();
    else s6scShowPopup(s6scResult);
  }
  if (n === 7) {
    if (!s7vDone) {
      s7vResetInitial();
    } else if (s7vAnswer !== null) {
      s7vApplyView();
    } else {
      s7vShowPopup('correct');
    }
  }
  if (n === 8) {
    if (!s8scDone) s8scResetInitial();
    else s8scShowPopup(s8scResult);
  }
  if (n === 9) {
    // Same resume contract as S1/S3/S4/S5/S7 (View My Answer Toggle template).
    if (!s9vDone) {
      s9vResetInitial();
    } else if (s9vAnswer !== null) {
      s9vApplyView();
    } else {
      s9vShowPopup('correct');
    }
  }
  if (n === 10) s10ApplyCharacter();
  if (n === 11) {
    // Same resume contract as every other View-My-Answer-Toggle screen
    // (S1/S3/S4/S5/S7/S9), generalized to the snapshot ARRAY: null while
    // unresolved-or-correct, an array of 4 strings on the destructive
    // final-wrong path.
    if (!s11vDone) {
      s11vResetInitial();
    } else if (s11vAnswerSnapshot !== null) {
      s11vApplyView();
    } else {
      s11vShowPopup('correct');
    }
  }
  if (n === 12) {
    // No done/resolved concept at all (no correctness model) — never
    // clear the learner's typed text on re-entry, just recompute
    // Continue's enabled state from whatever is currently in the box.
    s12oqInputChange();
  }
  if (n === 13) {
    // Same resume contract as every other View-My-Answer-Toggle screen
    // (S1/S3/S4/S5/S7/S9/S11).
    if (!s13vDone) {
      s13vResetInitial();
    } else if (s13vAnswer !== null) {
      s13vApplyView();
    } else {
      s13vShowPopup('correct');
    }
  }
  if (n === 14) {
    // Same resume contract again.
    if (!s14vDone) {
      s14vResetInitial();
    } else if (s14vAnswer !== null) {
      s14vApplyView();
    } else {
      s14vShowPopup('correct');
    }
  }
  // Progress Question nav: re-sync on every entry into a question screen
  // (not just once), so returning to an earlier question after resolving
  // a later one still shows the correct state — per the component's own
  // behavioral rule. Two independent navs, one per practice set, each
  // numbered from 1: S1-S9 = the 5-question בסיסי תרגול set, S11-S14 =
  // the 2-question תרגול סטנדרטי set. S0 (kickoff) and S10 (the
  // TransitionScreen between the sets) carry no nav.
  if (n >= 1  && n <= 9)  syncPracticeProgressNav(document.getElementById('s' + n));
  if (n >= 11 && n <= 14) syncStandardProgressNav(document.getElementById('s' + n));
}


function s10ApplyCharacter() { applyCompanionCharacter(S10_CHARACTER, 's10-char-video', 's10-char-img'); }

/* Cross-part navigation trail (js/partnav.js). Must run AFTER the two
   lines above: if this page was entered via a Back from part 04, init()
   jumps straight to the screen the learner left from, and it does that
   through goTo() so the landed screen gets the normal
   cancel/activate/reveal/resetScreenState treatment instead of a second,
   conflicting initial reveal. */

/* This part's own component-divider slide (slide52.xml, unbuilt structural
   marker, not a lomda screen) names it "תרגול בסיסי ותרגול סטנדרטי 2" --
   Basic Practice AND Standard Practice 2 are two internal graded stages
   of ONE component, each its own Decision Point (720-templates ->
   _question-template-defaults.md -> "Pass threshold formula",
   passThreshold = ceil(2N/3)). VIQ screens have no dedicated Result var --
   `Done && Answer === null` means solved correctly (Answer is only ever
   set on an exhausted-wrong final attempt), same convention as part 06's
   climaxPassed(). */

/* Stage 1 -- "תרגול בסיסי" (Basic Practice), N=5 (item -001..-005, S1-S9)
   -> passThreshold = ceil(2*5/3) = 4, matching this part's own S0
   TransitionScreen text verbatim ("ענו נכון על 4 שאלות ומעלה כדי
   להתקדם" -- "in order to progress"). A multi-sub-part item counts as
   one unit, correct only if ALL its sub-parts are correct. */
/* The key this part's verdict is stored under in the state document's
   unit-level `results` map (§8.1). Unit-level and NOT a part payload: it is
   decided here and consumed by the routing, and captureUnitState() replaces a
   part's own slot on every save, so anything parked there is destroyed on the
   next screen change of a different part.
   ⚠️ Never rename it - a renamed key reads as "no verdict yet" for every
   learner already mid-unit, silently. */
const RESULT_KEY_BASIC    = '03-basic';
const RESULT_KEY_STANDARD = '03-standard';

/* Resolution, not correctness - see the note in part 02. The nine screens
   of Basic Practice each set their own Done flag on both terminal branches.
   This is also what advanceScreen()'s terminal-failure edge tests before it
   reports a failed component, so the two cannot drift apart. */
function basicPracticeResolved() {
  return s1vDone && s2scDone && s3vDone && s4vDone && s5vDone &&
         s6scDone && s7vDone && s8scDone && s9vDone;
}

/* S12 is excluded on purpose: it is a HookOpenQuestion with no correctness
   model and no *Check at all, so it never resolves and never counts. */
function standardPracticeResolved() {
  return s11vDone && s13vDone && s14vDone;
}

function basicPracticePassed() {
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
  if (!basicPracticeResolved() && RESUME_ENABLED && typeof getUnitResult === 'function') {
    const stored = getUnitResult(RESULT_KEY_BASIC);
    if (stored) return stored === 'pass';
  }

  const results = [
    (s1vDone && s1vAnswer === null) && s2scResult === 'correct',   // item -001 (S1+S2)
    (s3vDone && s3vAnswer === null),                               // item -002 (S3)
    (s4vDone && s4vAnswer === null),                               // item -003 (S4)
    (s5vDone && s5vAnswer === null),                               // item -004 (S5)
    s6scResult === 'correct' && (s7vDone && s7vAnswer === null) &&
      s8scResult === 'correct' && (s9vDone && s9vAnswer === null), // item -005 (S6+S7+S8+S9)
  ];
  return results.filter(Boolean).length >= 4;
}

/* Stage 2 -- "תרגול סטנדרטי 2" (Standard Practice 2), N=2 (item -006:
   S10 TransitionScreen + S11 sub-part א + S12 sub-part ב; item -007: S13
   sub-part א + S14 sub-part ב) -> passThreshold = ceil(2*2/3) = 2, i.e.
   BOTH must be correct. S12 is a HookOpenQuestion ("No correctness model
   at all" -- see its own header comment) -- a free-text sub-part with no
   right/wrong answer, so it cannot participate in item -006's AND-
   combination; item -006's graded status rests on S11 alone. */
function standardPracticePassed() {
  /* Same fallback as basicPracticePassed() above, same reasoning. */
  if (!standardPracticeResolved() && RESUME_ENABLED && typeof getUnitResult === 'function') {
    const stored = getUnitResult(RESULT_KEY_STANDARD);
    if (stored) return stored === 'pass';
  }

  const results = [
    (s11vDone && s11vAnswerSnapshot === null),                     // item -006 (S11 only -- S12 is ungraded)
    (s13vDone && s13vAnswer === null) && (s14vDone && s14vAnswer === null), // item -007 (S13+S14)
  ];
  return results.filter(Boolean).length >= 2;
}

function advanceScreen() {
  // Re-crossing forward after a cross-part Back. Load-bearing HERE: this
  // part's exit is gated on standardPracticePassed(), and on a page
  // re-entered via Back from part 04 none of the results that decided it
  // survive — the gate would read false and strand the learner on S14
  // with no way out at all. The recorded destination wins instead. See
  // "RE-CROSSING FORWARD" in js/partnav.js (including its note that this
  // covers the part's own EXIT, not the internal S9 gate below).
  const returnForward = PartNav.forwardOverride();
  if (returnForward && currentScreen + 1 >= TOTAL_SCREENS) {
    PartNav.forward(returnForward);
    return;
  }
  // Decision Point 1: end of Basic Practice (S9 -> S10 boundary). Fail is
  // the Learning Journey's defined non-progression terminal state: per
  // this project's own established convention (part 05->06 / part 06->07),
  // only the branch with a real destination gets a redirect, so no
  // redirect fires on failure and the learner simply does not advance
  // past S9. Pass continues linearly into Standard Practice 2 (S10).
  /* xAPI: the component result for this part, used at BOTH decision points
     below. Kept as a function so an ordinary screen-to-screen advance does
     not pay for it, and so the two sites cannot drift apart.

     N = 7, the seven ITEMS: S0 promises "5 שאלות פשוטות יותר" and S10
     promises "2 תרגילים ברמת קושי גבוהה יותר". BOTH thresholds are required
     (6.4) - at least 4 of the 5 basic items AND both standard ones - which
     is exactly basicPracticePassed() && standardPracticePassed().

     The score is rebuilt from XAPI_Q_RESULTS at ITEM granularity: an item
     counts only if every graded question in it was right, the same way the
     two gates combine their screens. Read back rather than recomputed, so
     it cannot disagree with what the answered statements reported.

     006/q2 is deliberately absent - S12 is an open reflection with no
     *Check and no correctness model, so it never reports answered and
     cannot count toward anything. */
  const xapiResult03 = function () {
    const items = [
      XAPI_Q_RESULTS['001/q1'] && XAPI_Q_RESULTS['001/q2'],
      XAPI_Q_RESULTS['002/q1'],
      XAPI_Q_RESULTS['003/q1'],
      XAPI_Q_RESULTS['004/q1'],
      ['q1', 'q2', 'q3', 'q4'].every(function (q) { return XAPI_Q_RESULTS['005/' + q]; }),
      XAPI_Q_RESULTS['006/q1'],
      XAPI_Q_RESULTS['007/q1'] && XAPI_Q_RESULTS['007/q2'],
    ];
    return { success: basicPracticePassed() && standardPracticePassed(),
             score: { scaled: items.filter(Boolean).length / 7 } };
  };

  if (currentScreen === 9) {
    /* xAPI: this failure edge is TERMINAL - per the convention above no
       redirect fires, so the learner stays on S9 and the part is over for
       them. A component the learner failed must still be reported or the
       whole attempt goes unrecorded (6.5), so it reports here.

       Gated on the basic set being fully RESOLVED, not merely on the gate
       reading false: advanceScreen() is also reachable straight from the
       ArrowLeft shortcut, and on an unanswered S9 basicPracticePassed() is
       false simply because nothing has been answered yet. Reporting then
       would record a failure the learner never had. */
    /* The verdict is recorded on BOTH edges of this decision point, and from
       the live computation, which basicPracticeResolved() confirms is
       meaningful. On the failing edge it is the only record that survives:
       the learner stays on S9 and this part never reaches its own exit. */
    const _basic03 = basicPracticePassed();
    if (basicPracticeResolved() && typeof setUnitResult === 'function') {
      setUnitResult(RESULT_KEY_BASIC, _basic03 ? 'pass' : 'fail');
    }
    if (!_basic03) {
      if (basicPracticeResolved()) {
        xapiEndComponent(xapiResult03(), xapiActiveContinueButton());
      }
      return;
    }
    goTo(10);
    return;
  }
  // Decision Point 2: end of Standard Practice 2 (past S14, the part's
  // true last screen) -- success edge (part 04, same reconvergence
  // destination Component 1's own pass edge uses) vs. failure edge
  // (same non-progression convention as Decision Point 1 above).
  if (currentScreen + 1 >= TOTAL_SCREENS) {
    /* xAPI: reported BEFORE the branch, so this failure edge reports too. */
    const _std03 = standardPracticePassed();
    if (standardPracticeResolved() && typeof setUnitResult === 'function') {
      setUnitResult(RESULT_KEY_STANDARD, _std03 ? 'pass' : 'fail');
    }
    /* Last click of the part: report and stop — the platform routes (2026-09-16). */
    xapiEndComponent(xapiResult03(), xapiActiveContinueButton());

    if (_std03) PartNav.forward('04');   // dev-only (DEV_NAV)
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


/* S0's cross-part Back — returns to part 02's last screen (this part is
   only ever reached from part 02's practice-set fail edge), and only
   exists as a visible button when that crossing was actually recorded
   (PartNav.mountBack() in resetScreenState(0)). */
function goBackFromS0() { PartNav.back(); }

/* ─── Keyboard navigation (RTL: next = ←, prev = →) ─────── */
// Must not fire while focus is on a control where ArrowLeft/ArrowRight
// already has its own in-control meaning (caret move in a text/number
// field, native slider value change, textarea/contenteditable caret,
// select option cycling) — otherwise ordinary editing inside this
// part's number inputs or S12's free-text textarea silently double-
// fires as screen navigation, including an ungated goBack() that can
// discard whatever the learner just typed.

document.addEventListener('keydown', e => {
  if (hasOwnArrowKeyMeaning(e.target)) return;
  if (e.key === 'ArrowLeft')  advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* Dev-mode postMessage bridge for index_dev.html — shared, see
   ../unit-js/60-devbridge.js. ⚠️ This call moves into unit-js/90-boot.js
   once that exists. */


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion (Screen 02 / S1, slide 57)
   Variant A, single value. Item methodica-math-percent-02-03-001,
   sub-part א. Spec: 720-templates → references/ValueInputQuestion.md.

   Hint policy: VISIBLE AND ENABLED FROM THE START — presenter note on
   slide 57, in bold: "מזכיר שבכל התרגולים הבסיסיים הרמז מופיע מיד".
   That is also the template's own default, but both of the template's
   cited reference implementations choose hidden-until-first-wrong, so
   the note is what settles it here (and for the other 4 questions).

   Completion label is "המשך" — ValueInputQuestion's own completion
   label, deliberately NOT SingleChoiceQuestion's "שנמשיך?" (part 01's
   S2 uses that one; the two templates do not share it).
   ═══════════════════════════════════════════════════════════ */

/* Checkmark / X for the input's correct/incorrect icon — exact vectors
   from Figma eSbp4bKHgBky0rakDb8l9N node 1027:13669 ("NumberValue").
   These two fills are Feedback Correct/Incorrect, which are
   theme-INDEPENDENT tokens, so a literal hex is correct here. */
const S1V_CHECK_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 12" fill="none" aria-hidden="true">' +
  '<path d="M4.52036 12C4.12296 12.0002 3.74183 11.8126 3.46106 11.4787L0.258452 7.67744C-0.0861507 7.26814 -0.0861507 6.60467 0.258452 6.19536C0.603165 5.78619 1.16194 5.78619 1.50666 6.19536L4.52036 9.77374L12.4933 0.306878C12.8381 -0.102293 13.3968 -0.102293 13.7415 0.306878C14.0862 0.716179 14.0862 1.37966 13.7415 1.78896L5.57966 11.4787C5.29889 11.8126 4.91776 12.0002 4.52036 12Z" fill="#609E12"/>' +
  '</svg>';
const S1V_WRONG_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
  '<path d="M13.6743 0.325691C13.4657 0.117151 13.1828 0 12.8879 0C12.5929 0 12.31 0.117151 12.1014 0.325691L7 5.42709L1.8986 0.325691C1.69 0.117151 1.40711 0 1.11215 0C0.817183 0 0.534294 0.117151 0.325691 0.325691C0.117151 0.534294 0 0.817183 0 1.11215C0 1.40711 0.117151 1.69 0.325691 1.8986L5.42709 7L0.325691 12.1014C0.117151 12.31 0 12.5929 0 12.8879C0 13.1828 0.117151 13.4657 0.325691 13.6743C0.534294 13.8829 0.817183 14 1.11215 14C1.40711 14 1.69 13.8829 1.8986 13.6743L7 8.57291L12.1014 13.6743C12.31 13.8829 12.5929 14 12.8879 14C13.1828 14 13.4657 13.8829 13.6743 13.6743C13.8829 13.4657 14 13.1828 14 12.8879C14 12.5929 13.8829 12.31 13.6743 12.1014L8.57291 7L13.6743 1.8986C13.8829 1.69 14 1.40711 14 1.11215C14 0.817183 13.8829 0.534294 13.6743 0.325691Z" fill="#B20010"/>' +
  '</svg>';


/* The shared explanation, rebuilt as LIVE HTML. Slide 56 supplies these
   two equations only as a rendered PNG inside each feedback panel
   (media/image76.png, image77.png) — shipping those would bake
   learner-facing text into an image, which the asset rules forbid, so
   the equations are typeset here instead. Both panels in the source
   carry the SAME body and differ only in title, which is exactly the
   "Feedback: shared explanation" default. */
const S1V_EXPLAIN = [
  '<p>‎نحسب كم يساوي %20 من 65‏‎:</p>',
  '<div class="eq-row"><span>20%</span><span>&middot;</span><span>65</span><span>=</span>' +
    frac(20, 100) + '<span>&middot;</span><span>65</span><span>=</span><span>13</span></div>',
  '<p class="eq-or">أو</p>',
  '<div class="eq-row"><span>20%</span><span>&middot;</span><span>65</span><span>=</span>' +
    '<span>0.2</span><span>&middot;</span><span>65</span><span>=</span><span>13</span></div>'
];

const S1V = {
  correct: 13, maxAttempts: 2,
  popup: {
    retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
    correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S1V_EXPLAIN
    /* One outcome, two views. The solution view keeps this screen's own
       explanation; the answer view's copy is fixed and canonical per
       _question-template-defaults.md — it must never reuse the
       pedagogical explanation. */
    /* PROJECT-WIDE FINAL-WRONG RULE (producer, 2026-09-01): every
       `wrong2` title — the popup shown after the LAST attempt — ends
       with a line break and a second line, "התשובה הנכונה מוצגת.", which
       the .scq-popup-title rule renders bold along with the first line.
       The title is therefore written to the element with innerHTML, not
       textContent. Deliberately NOT applied to `retry`, to `correct`, or
       to a wrong2 `answerView` — the answer view shows the learner's own
       answer, not the correct one. */
    wrong2:  { bg: '#ffdbdc', title: '‎أخطأتم، كل خطأ يعمّق المعرفة.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
               action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
               answerView: {
                 title: 'الإجابة غير صحيحة‎.',
                 body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
                 action: { label: 'الإجابة الصحيحة', view: 'solution' }
               } }
  }
};

let s1vAttempts = 0, s1vAnswered = false, s1vDone = false;
let s1vLastWrongValue = null;
/* This template keeps no JS mirror of the typed value — s1vCheck() reads
   the input directly — so the final-wrong branch is the ONLY place the
   learner's raw string survives before the reveal overwrites it. Captured
   exactly as typed (a leading zero, a trailing .0, etc. are preserved). */
let s1vAnswer = null;
let s1vView   = 'solution';

function s1vInputChange() {
  if (s1vAnswered) return;
  const inp = document.getElementById('s1v-input');
  const chk = document.getElementById('s1v-check');
  const ico = document.getElementById('s1v-input-ico');
  // Clear a previous wrong attempt's marks as soon as the learner edits.
  // The state classes live on .viq-field (the bordered box), not on the
  // input — see the .viq-field comment in css/style.css.
  document.getElementById('s1v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s1v-popup')?.classList.add('hidden');
  // Retry gate (_question-template-defaults.md): re-enable only once the
  // entered value genuinely DIFFERS from the one just marked wrong — a
  // live comparison, not a one-shot flag.
  const v = inp.value.trim();
  if (chk) chk.disabled = (v === '') || (v === s1vLastWrongValue);
}

/* Number() so 13 and 13.0 both pass, while 13.5 / 1 / 3 do not. */
function s1vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S1V.correct;
}

function s1vCheck() {
  if (s1vAnswered) { advanceScreen(); return; }   // label now reads "המשך"
  const inp = document.getElementById('s1v-input');
  const ico = document.getElementById('s1v-input-ico');
  if (!inp || inp.value.trim() === '') return;

  const field = document.getElementById('s1v-field');
  s1vAttempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s1vOk = s1vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('001', 'q1', s1vOk,
    s1vOk || s1vAttempts >= S1V.maxAttempts,
    inp.value.trim());

  if (s1vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s1vShowPopup('correct');
    s1vFinish();
  } else if (s1vAttempts >= S1V.maxAttempts) {
    s1vAnswer = inp.value.trim();   // capture BEFORE the reveal overwrites it
    s1vView = 'solution';
    s1vApplyView();
    s1vFinish();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s1vLastWrongValue = inp.value.trim();
    const chk = document.getElementById('s1v-check');
    if (chk) chk.disabled = true;   // force it now; nothing else re-evaluates
                                     // the button until the next input event
    s1vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* Single owner of the resolved-wrong state: writes the board (the input)
   and the popup to match s1vView. */
function s1vApplyView() {
  if (s1vAnswer === null) return;
  const inp = document.getElementById('s1v-input');
  const ico = document.getElementById('s1v-input-ico');
  const field = document.getElementById('s1v-field');
  if (inp) {
    inp.value = (s1vView === 'answer') ? s1vAnswer : String(S1V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s1vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s1vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s1vShowPopup('wrong2', s1vView);
}

/* Pure view switch — never routes through s1vCheck(), never touches
   attempts / done / navigation state. */
function s1vToggleView() {
  if (s1vAnswer === null) return;
  s1vView = (s1vView === 'solution') ? 'answer' : 'solution';
  s1vApplyView();
}

function s1vShowPopup(type, view) {
  const popup = document.getElementById('s1v-popup');
  if (!popup) return;
  const base = S1V.popup[type];
  // Merge the answer-view override onto the base config when showing the
  // learner's own answer.
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;

  popup.style.background = cfg.bg;
  // Reset to the default position ONLY when the popup was actually
  // closed — so a position the learner dragged to survives a view toggle.
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);

  const titleEl = document.getElementById('s1v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s1v-popup-body');
  if (bodyEl) {
    bodyEl.innerHTML = (cfg.body === null)
      ? S1V_EXPLAIN.join('')
      : cfg.body.map(p => '<p>' + p + '</p>').join('');
  }
  renderPopupAction('s1v-popup', cfg.action, s1vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);   // a view swap changes the popup's height
}

/* Locks the input and flips the main button to the completion label.
   Never sets popup content or the input's value — that is
   s1vApplyView()'s job on the final-wrong path. */
/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s1vFinishDom() {
  const inp = document.getElementById('s1v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s1v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s1v-hint');
  syncPracticeProgressNav(document.getElementById('s1'));
}

function s1vFinish() {
  s1vAnswered = true;
  s1vDone = true;
  s1vFinishDom();
}

function s1vResetInitial() {
  s1vAttempts = 0;
  s1vAnswered = false;
  s1vLastWrongValue = null;
  s1vAnswer = null;
  s1vView = 'solution';
  const inp = document.getElementById('s1v-input');
  if (inp) {
    inp.value = '';
    inp.disabled = false;
  }
  document.getElementById('s1v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s1v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s1v-popup')?.classList.add('hidden');
  document.getElementById('s1v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s1v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  // Hint is available from the first moment on this screen (see the
  // policy note at the top of this block).
  showHintButton('s1v-hint');
}

/* ── Hint overlay. Unlike the feedback popup this DOES have a close
   control; it is a separate component. Reopening is allowed (the note
   says the hint is simply available), so opening does not disable the
   button — only finishing the question does. ── */
function s1vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; opens, never toggles. */
  xapiRequestedHint('001', 'q1');
  document.getElementById('s1v-hint-overlay')?.classList.remove('hidden');
}
function s1vCloseHint() {
  document.getElementById('s1v-hint-overlay')?.classList.add('hidden');
}
function s1vCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s1vCloseHint();
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s1v-hint-overlay')?.classList.contains('hidden')) s1vCloseHint();
});

/* ═══════════════════════════════════════════════════════════
   Shared feedback-popup helpers — position reset, canvas clamp, in-popup
   action button, and dragging. Generic (popup id is a parameter) so the
   remaining 4 question screens reuse these rather than each growing its
   own copy. renderPopupAction/clampPopup are ported per
   ValueInputQuestion.md's instruction to port them verbatim rather than
   reimplement per screen.
   ═══════════════════════════════════════════════════════════ */


/* ── Dragging, clamped to the canvas and to above the bottom bar. ── */

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestion (Screen 03 / S2, slide 58 — slide58.xml, the deck maps 1:1). Item methodica-math-percent-02-03-001,
   sub-part ב. Spec: 720-templates → references/SingleChoiceQuestion.md.

   Hint policy: shown from the start — no override note on this slide,
   so the template default applies, and it matches every other question
   in this basic-practice set (S1's note said so explicitly; this slide
   is silent, which per _question-template-defaults.md's "presenter
   notes restate only deviations" rule means the same default holds).

   Does NOT use the View My Answer Toggle: the chosen wrong option and
   the correct option are shown simultaneously in the same option list
   on the final attempt — SingleChoiceQuestion.md excludes the toggle
   for exactly this shape ("already simultaneously visible").
   ═══════════════════════════════════════════════════════════ */
const S2SC = { correctId: 'c', maxAttempts: 2 };   // 'c' = 26 (20% of 130)

let s2scSelected  = null;
let s2scAttempts  = 0;
let s2scAnswered  = false;
let s2scDone      = false;
let s2scLastWrong = null;
let s2scResult    = null;   // 'correct' | 'wrong2' — which popup to reopen on return

/* Shared explanation (correct AND wrong2 — the current 720 default per
   _question-template-defaults.md → "Feedback: shared explanation").
   Rebuilt as live HTML from the PPTX's rendered mockups
   (media/image78.png correct / image79.png wrong), which bake this
   entire table + all three equations into an image — not shipped, same
   asset rule as S1's equations. Table has no explicit cell fill/bold in
   the source (its header colour is PowerPoint's generic table theme,
   an authoring artifact — see _question-template-defaults.md → "Shape/
   box fill color vs. run-level text color" — not a design instruction),
   so it uses this project's own subject accent instead of copying that
   arbitrary PPT blue. */
const S2SC_EXPLAIN =
  '<p>‎نكتب في جدول التناسب: العدد 130 هو الـ %100%، ونحن نبحث عن القيمة الملائمة لـ %20.</p>' +
  // Column order flipped to the project rule (producer instruction,
  // 2026-08-20: אחוז physical LEFT = last in DOM). Missed by that
  // sweep's first pass because this header reads "האחוז", not "אחוז".
  '<table class="eq-table"><tr><th>العدد</th><th>النسبة المئوية</th></tr>' +
  '<tr><td>x</td><td>20%</td></tr><tr><td>130</td><td>100%</td></tr></table>' +
  '<p>‎والآن نبني معادلة التناسب من خلال مساواة النسبة بين النسب المئوية مع النسبة بين الأعداد الملائمة لها، ونحصل على‎:</p>' +
  '<div class="eq-row">' + frac('20%', '100%') + '<span>=</span>' + frac('x', '130') + '</div>' +
  '<p>نختزل النسب المئوية ونحصل على المعادلة</p>' +
  '<div class="eq-row">' + frac(20, 100) + '<span>=</span>' + frac('x', 130) + '</div>' +
  '<p>نضرب بالمقام المشترك 1300 ونحصل على‎:</p>' +
  /* Producer instruction (2026-09-01): the unknown side leads — "100x"
     physically LEFT, then "=", then the product "130 · 20" to its right.
     This DELIBERATELY departs from slide55, which writes "130∙20=100𝑥";
     do not "restore" it to the script. It matches S3's own row, where
     the producer made the same call ("x = 55 · 8" — see the note there).
     .eq-row is direction:ltr, so DOM order IS left-to-right order. */
  '<div class="eq-row"><span>100x</span><span>=</span><span>130</span><span>&middot;</span><span>20</span></div>' +
  '<p>ومن هنا: <span dir="ltr" style="unicode-bidi:isolate">x = 26</span></p>' +
  '<p>الاستنتاج: %20 من 130 هي 26.</p>';

/* No `scrollGate` flag on any outcome — see the note on s2scShowPopup()
   below for why the scroll-gated variant was removed from this screen. */
const S2SC_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: '‎صحيح جدًا‎!',          body: S2SC_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، لا بأس، تعالوا نشرح‎:<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S2SC_EXPLAIN }
};

function s2scSelect(id) {
  if (s2scAnswered) return;
  s2scSelected = id;
  if (s2scAttempts > 0) {
    document.getElementById('s2sc-popup')?.classList.add('hidden');
    document.querySelectorAll('#s2 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s2 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  // Retry gate: re-enable only once the selection genuinely differs from
  // the option just marked wrong.
  const chk = document.getElementById('s2sc-check');
  if (chk && !s2scAnswered) chk.disabled = !s2scSelected || s2scSelected === s2scLastWrong;
}

function s2scMark(id, cls) {
  const opt = document.querySelector('#s2 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}

function s2scCheck() {
  if (s2scAnswered) { advanceScreen(); return; }   // label is "שנמשיך?" — safe no-op until S3 exists
  if (!s2scSelected) return;

  s2scAttempts++;
  const isCorrect = s2scSelected === S2SC.correctId;

  /* xAPI: answered - after both guards, before the branches. */
  xapiAnswered('001', 'q2', isCorrect,
    isCorrect || s2scAttempts >= S2SC.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s2', s2scSelected)));

  if (isCorrect) {
    s2scMark(S2SC.correctId, 'correct');
    s2scResult = 'correct';
    // s2scFinish() BEFORE s2scShowPopup(): finish() unconditionally
    // enables the check button as part of reaching the completion
    // state, but a scroll-gated popup must override that back to
    // disabled until the gate is satisfied — showPopup() has to run
    // LAST so its disabled=true is the one that sticks. Reversing this
    // order silently re-enables "שנמשיך?" before the learner has
    // scrolled, which was caught by the assertion suite, not by eye.
    s2scFinish();
    s2scShowPopup('correct');
  } else if (s2scAttempts >= S2SC.maxAttempts) {
    // Final wrong: BOTH the correct option and the chosen wrong option
    // turn on at once — no toggle needed, nothing is overwritten.
    s2scMark(S2SC.correctId, 'correct');
    s2scMark(s2scSelected, 'wrong');
    s2scResult = 'wrong2';
    s2scFinish();
    s2scShowPopup('wrong2');
  } else {
    s2scMark(s2scSelected, 'wrong');
    s2scLastWrong = s2scSelected;
    document.getElementById('s2sc-check').disabled = true;
    s2scShowPopup('retry');
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
function s2scFinishDom() {
  document.querySelectorAll('#s2 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s2sc-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s2sc-hint');
  syncPracticeProgressNav(document.getElementById('s2'));
}

function s2scFinish() {
  s2scAnswered = true;
  s2scDone = true;
  s2scFinishDom();
}

function s2scResetInitial() {
  s2scSelected = null;
  s2scAttempts = 0;
  s2scAnswered = false;
  s2scLastWrong = null;
  s2scResult = null;
  document.querySelectorAll('#s2 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s2sc-popup')?.classList.add('hidden');
  document.getElementById('s2sc-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s2sc-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  showHintButton('s2sc-hint');   // available from the start on this screen
}

function s2scOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; opens, never toggles. */
  xapiRequestedHint('001', 'q2');
  document.getElementById('s2sc-hint-overlay')?.classList.remove('hidden');
}
function s2scCloseHint() {
  document.getElementById('s2sc-hint-overlay')?.classList.add('hidden');
}
function s2scCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s2scCloseHint();
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s2sc-hint-overlay')?.classList.contains('hidden')) s2scCloseHint();
});

/* ═══════════════════════════════════════════════════════════
   S2's feedback popup — plain auto-height, NOT the scroll-gated variant.

   REMOVED (2026-08-05, producer decision): this screen previously used
   the scroll-gated long-feedback variant (fixed 300px popup + "גללו
   למטה / כדי להמשיך" tooltip + a continue button gated on scrolling to
   the bottom), along with all of its machinery — SCROLL_END_TOLERANCE,
   atBottom(), scrollGateState, checkScrollGate(), positionScrollHint(),
   the body scroll/resize/pointermove listeners, the body tabindex
   toggling, and the drag-vs-scroll guard in popupPointerDown().

   Why: the gate was never actually needed. The measurement that
   originally justified it was CIRCULAR — it compared the body's
   scrollHeight against the clientHeight of the gate's OWN fixed 300px
   box, which overflows by construction. The real question is whether
   the explanation overflows the CANVAS when left at auto height, and it
   does not: this popup renders 572.6px tall, and anchored at
   bottom:76px in the 710-tall design canvas that puts its top edge at
   y=61 — on-canvas, clear of the report button, and (being 426px wide
   on the left) never covering the answer options on the right. So the
   whole explanation is visible at once and there is nothing to scroll.

   If a FUTURE screen genuinely needs the gated variant, re-derive it
   from 720-templates → _global-components.md → "Long-feedback variant —
   scroll-gated popup" rather than from this file's history, and justify
   it with an ungated-height measurement against the canvas — not
   against the gate's own box.
   ═══════════════════════════════════════════════════════════ */
function s2scShowPopup(type) {
  const popup = document.getElementById('s2sc-popup');
  if (!popup) return;
  const cfg = S2SC_POPUP[type];
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);

  const titleEl = document.getElementById('s2sc-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s2sc-popup-body');
  if (bodyEl) {
    bodyEl.innerHTML = Array.isArray(cfg.body) ? cfg.body.map(p => '<p>' + p + '</p>').join('') : cfg.body;
  }

  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion WITH a content image (Screen 04 / S3,
   slide 59 = slide59.xml, the deck maps 1:1). Item
   methodica-math-percent-02-03-002 (a new item, unlike S1/S2's lettered
   sub-parts of -001). Hint shown from the start (no override note).
   Correct answer: 440 (55% of 800). Completion label "המשך" — this
   template's own label, same as S1, not SCQ's "שנמשיך?".
   ═══════════════════════════════════════════════════════════ */
const S3V = { correct: 440, maxAttempts: 2 };

let s3vAttempts = 0, s3vAnswered = false, s3vDone = false;
let s3vLastWrongValue = null;
let s3vAnswer = null;   // raw typed string, snapshotted before the final-wrong reveal
let s3vView   = 'solution';

/* Shared explanation (correct AND wrong2). Rebuilt as live HTML from
   the PPTX's rendered mockups (media/image81.png correct /
   image82.png wrong — same asset rule as S1/S2's equations: not
   shipped as images). Table column order preserved exactly as the
   source has it (מספר תלמידים first, אחוזים second) — NOT assumed to
   match S2's table, which orders the other way (האחוז first); each
   screen's table reflects its own slide, not a cross-screen norm. */
const S3V_EXPLAIN =
  '<p>نحل بواسطة جدول التناسب‎:</p>' +
  '<table class="eq-table"><tr><th>عدد الطلاب</th><th>النسب المئوية</th></tr>' +
  '<tr><td>x</td><td>55%</td></tr><tr><td>800</td><td>100%</td></tr></table>' +
  '<p>نكتب التناسب بعد اختزال النسب المئوية‎:</p>' +
  '<div class="eq-row">' + frac(55, 100) + '<span>=</span>' + frac('x', 800) + '</div>' +
  '<p>نضرب بالمقام المشترك 800 ونحصل على‎:</p>' +
  // Producer instruction (2026-08-26): the equation reads "x = 55 · 8",
  // with x on the physical LEFT. The row is direction:ltr, so source
  // order = physical left-to-right — x, =, 55, ·, 8. This matches the
  // derivation above (55/100 = x/800, so x = 55 · 8). Earlier revisions
  // read "x = 8 · 55" and then "8 · 55 = x"; do not re-flip.
  '<div class="eq-row"><span>x</span><span>=</span><span>55</span><span>&middot;</span><span>8</span></div>' +
  '<p>أي: <span dir="ltr" style="unicode-bidi:isolate">x = 440</span></p>' +
  '<p>الاستنتاج: 440 طالبًا يشاهدون "السباق إلى باطن الأرض" عبر الشبكات الاجتماعية.</p>';

const S3V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S3V_EXPLAIN
  wrong2:  { bg: '#ffdbdc', title: 'غير دقيق.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s3vInputChange() {
  if (s3vAnswered) return;
  const inp = document.getElementById('s3v-input');
  const ico = document.getElementById('s3v-input-ico');
  document.getElementById('s3v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s3v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  const chk = document.getElementById('s3v-check');
  if (chk) chk.disabled = (v === '') || (v === s3vLastWrongValue);
}

function s3vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S3V.correct;
}

function s3vCheck() {
  if (s3vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s3v-input');
  const ico = document.getElementById('s3v-input-ico');
  if (!inp || inp.value.trim() === '') return;

  s3vAttempts++;
  const field = document.getElementById('s3v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s3vOk = s3vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('002', 'q1', s3vOk,
    s3vOk || s3vAttempts >= S3V.maxAttempts,
    inp.value.trim());

  if (s3vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s3vFinish();
    s3vShowPopup('correct');
  } else if (s3vAttempts >= S3V.maxAttempts) {
    s3vAnswer = inp.value.trim();
    s3vView = 'solution';
    s3vFinish();
    s3vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s3vLastWrongValue = inp.value.trim();
    document.getElementById('s3v-check').disabled = true;
    s3vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

function s3vApplyView() {
  if (s3vAnswer === null) return;
  const inp = document.getElementById('s3v-input');
  const ico = document.getElementById('s3v-input-ico');
  const field = document.getElementById('s3v-field');
  if (inp) {
    inp.value = (s3vView === 'answer') ? s3vAnswer : String(S3V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s3vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s3vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s3vShowPopup('wrong2', s3vView);
}
function s3vToggleView() {
  if (s3vAnswer === null) return;
  s3vView = (s3vView === 'solution') ? 'answer' : 'solution';
  s3vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s3vFinishDom() {
  const inp = document.getElementById('s3v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s3v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s3v-hint');
  syncPracticeProgressNav(document.getElementById('s3'));
}

function s3vFinish() {
  s3vAnswered = true;
  s3vDone = true;
  s3vFinishDom();
}

function s3vResetInitial() {
  s3vAttempts = 0;
  s3vAnswered = false;
  s3vLastWrongValue = null;
  s3vAnswer = null;
  s3vView = 'solution';
  const inp = document.getElementById('s3v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s3v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s3v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s3v-popup')?.classList.add('hidden');
  document.getElementById('s3v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s3v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  showHintButton('s3v-hint');
}

function s3vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('002', 'q1');
  document.getElementById('s3v-hint-overlay')?.classList.remove('hidden');
}
function s3vCloseHint() { document.getElementById('s3v-hint-overlay')?.classList.add('hidden'); }
function s3vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s3vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s3v-hint-overlay')?.classList.contains('hidden')) s3vCloseHint();
});

/* Plain auto-height popup — no scrolling. Measured: S3V_EXPLAIN renders
   443.8px tall in the standard 426px-wide popup, which anchored at
   bottom:76px puts its top edge at y=190 — well inside the
   CANVAS_H - BOTTOM_BAR_H (636px) ceiling clampPopup() enforces. (Was
   495px before the .eq-table type dropped 24px→20px per Figma.) S2's
   longer explanation fits the same way at 572.6px, which is why the
   scroll-gated variant was removed from this part entirely — see the
   note on s2scShowPopup() above. */
function s3vShowPopup(type, view) {
  const popup = document.getElementById('s3v-popup');
  if (!popup) return;
  const base = S3V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;

  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);

  const titleEl = document.getElementById('s3v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s3v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S3V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s3v-popup', cfg.action, s3vToggleView);

  popup.classList.remove('hidden');
  clampPopup(popup);
}


document.addEventListener('click', e => {
  const zoomBtn = e.target.closest('[data-zoom-src]');
  if (zoomBtn) { openImageZoom(zoomBtn); return; }
  if (e.target.closest('[data-zoom-close="true"]')) closeImageZoom();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('img-zoom-modal')?.classList.contains('hidden')) closeImageZoom();
});

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion WITH a content image (Screen 05 / S4,
   slide 60 = slide60.xml, the deck maps 1:1). Item
   methodica-math-percent-02-03-003. Hint shown from the start (presenter
   note states it explicitly). Correct answer: 195 (15% of 1,300).
   Completion label "המשך" — this template's own, not SCQ's "שנמשיך?".

   Near-identical in shape to S3, so it reuses every shared helper
   (frac, S1V_CHECK_SVG/S1V_WRONG_SVG, resetPopupPosition, clampPopup,
   renderPopupAction, popupPointerDown, setNavLabel, hideHintButton /
   showHintButton) rather than cloning them.
   ═══════════════════════════════════════════════════════════ */
const S4V = { correct: 195, maxAttempts: 2 };

let s4vAttempts = 0, s4vAnswered = false, s4vDone = false;
let s4vLastWrongValue = null;
let s4vAnswer = null;   // raw typed string, snapshotted before the destructive reveal
let s4vView   = 'solution';

/* Shared explanation (correct AND wrong2), rebuilt as live HTML from the
   slide's own rendered mockups (media/image84.png correct /
   image85.png wrong) — never shipped as those images, which would bake
   learner-facing text into an asset.

   Structure and wording follow the source exactly, including that this
   slide has NO separate "multiply out" equation line: the source's own
   paragraph reads "נכפול במכנה המשותף ונקבל:" immediately followed by
   the result, unlike S3 which shows an intermediate "x = 55 · 8" row.
   Table column order is likewise this slide's own (מ"ג first, אחוזים
   second) — the same order S3 happens to use, but read from this table
   rather than assumed from it. */
const S4V_EXPLAIN =
  '<p>نحل بطريقة التناسب‎:</p>' +
  '<table class="eq-table"><tr><th>ملغم</th><th>النسب المئوية</th></tr>' +
  '<tr><td>x</td><td>15%</td></tr><tr><td>1,300</td><td>100%</td></tr></table>' +
  '<p>نبني معادلة التناسب بعد اختزال النسب المئوية‎:</p>' +
  '<div class="eq-row">' + frac(15, 100) + '<span>=</span>' + frac('x', 1300) + '</div>' +
  '<p>نضرب بالمقام المشترك ونحصل على: <span dir="ltr" style="unicode-bidi:isolate">x = 195</span>.</p>' +
  '<p>لذلك، يوجد في كوب الحليب 195 ملغم من الكالسيوم.</p>';

/* Titles come from the slide's own two feedback shapes. The toggle's own
   copy (answerView) is the template's, not the slide's — the slide only
   mocks the solution state, but the reveal here is destructive (it
   overwrites the learner's typed value), so ValueInputQuestion requires
   the View My Answer Toggle. Same reasoning as S3. */
const S4V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S4V_EXPLAIN
  wrong2:  { bg: '#ffdbdc', title: '‎أخطأتم، لا بأس‎!<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s4vInputChange() {
  if (s4vAnswered) return;
  const inp = document.getElementById('s4v-input');
  const ico = document.getElementById('s4v-input-ico');
  document.getElementById('s4v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s4v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  const chk = document.getElementById('s4v-check');
  if (chk) chk.disabled = (v === '') || (v === s4vLastWrongValue);
}

function s4vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S4V.correct;
}

function s4vCheck() {
  if (s4vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s4v-input');
  const ico = document.getElementById('s4v-input-ico');
  if (!inp || inp.value.trim() === '') return;

  s4vAttempts++;
  const field = document.getElementById('s4v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s4vOk = s4vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('003', 'q1', s4vOk,
    s4vOk || s4vAttempts >= S4V.maxAttempts,
    inp.value.trim());

  if (s4vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s4vFinish();
    s4vShowPopup('correct');
  } else if (s4vAttempts >= S4V.maxAttempts) {
    s4vAnswer = inp.value.trim();
    s4vView = 'solution';
    s4vFinish();
    s4vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s4vLastWrongValue = inp.value.trim();
    document.getElementById('s4v-check').disabled = true;
    s4vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

function s4vApplyView() {
  if (s4vAnswer === null) return;
  const inp = document.getElementById('s4v-input');
  const ico = document.getElementById('s4v-input-ico');
  const field = document.getElementById('s4v-field');
  if (inp) {
    inp.value = (s4vView === 'answer') ? s4vAnswer : String(S4V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s4vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s4vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s4vShowPopup('wrong2', s4vView);
}
function s4vToggleView() {
  if (s4vAnswer === null) return;
  s4vView = (s4vView === 'solution') ? 'answer' : 'solution';
  s4vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s4vFinishDom() {
  const inp = document.getElementById('s4v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s4v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s4v-hint');
  syncPracticeProgressNav(document.getElementById('s4'));
}

function s4vFinish() {
  s4vAnswered = true;
  s4vDone = true;
  s4vFinishDom();
}

function s4vResetInitial() {
  s4vAttempts = 0;
  s4vAnswered = false;
  s4vLastWrongValue = null;
  s4vAnswer = null;
  s4vView = 'solution';
  const inp = document.getElementById('s4v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s4v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s4v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s4v-popup')?.classList.add('hidden');
  document.getElementById('s4v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s4v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  showHintButton('s4v-hint');
}

function s4vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('003', 'q1');
  document.getElementById('s4v-hint-overlay')?.classList.remove('hidden');
}
function s4vCloseHint() { document.getElementById('s4v-hint-overlay')?.classList.add('hidden'); }
function s4vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s4vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s4v-hint-overlay')?.classList.contains('hidden')) s4vCloseHint();
});

/* Plain auto-height popup — no scroll gate anywhere in this part (see the
   note on s2scShowPopup). This explanation is shorter than S3's, so it
   comfortably clears the canvas budget; measured during verification. */
function s4vShowPopup(type, view) {
  const popup = document.getElementById('s4v-popup');
  if (!popup) return;
  const base = S4V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;

  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);

  const titleEl = document.getElementById('s4v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s4v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S4V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s4v-popup', cfg.action, s4vToggleView);

  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion WITH a content image (Screen 06 / S5,
   slide 61 = slide61.xml, the deck maps 1:1). Item
   methodica-math-percent-02-03-004. Hint shown from the start.
   Correct answer: 840 (35% of 2,400). Completion label "המשך".

   Solved by CONVERTING THE PERCENT (simple/decimal fraction), not by a
   proportion table — so the explanation reuses S1's two-equation + "או"
   shape and has no .eq-table, unlike S3/S4.
   ═══════════════════════════════════════════════════════════ */
const S5V = { correct: 840, maxAttempts: 2 };

let s5vAttempts = 0, s5vAnswered = false, s5vDone = false;
let s5vLastWrongValue = null;
let s5vAnswer = null;   // raw typed string, snapshotted before the destructive reveal
let s5vView   = 'solution';

/* Shared explanation (correct AND wrong2), rebuilt as live HTML from the
   slide's own rendered mockups (media/image86.png correct /
   image87.png wrong) — never shipped as those images.
   Structure is exactly the source's: intro line, the fraction form, the
   "או" separator, the decimal form, then the conclusion. The two blank
   source paragraphs around the conclusion are the template's own
   paragraph spacing, not extra spacers. */
const S5V_EXPLAIN =
  '<p>نحسب كم يساوي %35 من 2,400‏‎:</p>' +
  '<div class="eq-row"><span>35%</span><span>&middot;</span><span>2400</span><span>=</span>' +
    frac(35, 100) + '<span>&middot;</span><span>2400</span><span>=</span><span>840</span></div>' +
  '<p class="eq-or">أو</p>' +
  '<div class="eq-row"><span>35%</span><span>&middot;</span><span>2400</span><span>=</span>' +
    '<span>0.35</span><span>&middot;</span><span>2400</span><span>=</span><span>840</span></div>' +
  '<p>الاستنتاج - تمّ جمع 840 عبوة كرتون.</p>';

/* Titles are the slide's own. On the wrong shape the source puts the
   title and the first explanation line in ONE paragraph split by a line
   break, so "טעית, זה סימן שיש בו חשיבה." is the title and the rest is
   body. The toggle's answer-view copy is the template's (the slide only
   mocks the solution state) — required because the reveal overwrites the
   learner's typed value. */
const S5V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S5V_EXPLAIN
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، وهذا دليل على أنكم تفكّرون.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s5vInputChange() {
  if (s5vAnswered) return;
  const inp = document.getElementById('s5v-input');
  const ico = document.getElementById('s5v-input-ico');
  document.getElementById('s5v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s5v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  const chk = document.getElementById('s5v-check');
  if (chk) chk.disabled = (v === '') || (v === s5vLastWrongValue);
}

function s5vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S5V.correct;
}

function s5vCheck() {
  if (s5vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s5v-input');
  const ico = document.getElementById('s5v-input-ico');
  if (!inp || inp.value.trim() === '') return;

  s5vAttempts++;
  const field = document.getElementById('s5v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s5vOk = s5vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('004', 'q1', s5vOk,
    s5vOk || s5vAttempts >= S5V.maxAttempts,
    inp.value.trim());

  if (s5vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s5vFinish();
    s5vShowPopup('correct');
  } else if (s5vAttempts >= S5V.maxAttempts) {
    s5vAnswer = inp.value.trim();
    s5vView = 'solution';
    s5vFinish();
    s5vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s5vLastWrongValue = inp.value.trim();
    document.getElementById('s5v-check').disabled = true;
    s5vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

function s5vApplyView() {
  if (s5vAnswer === null) return;
  const inp = document.getElementById('s5v-input');
  const ico = document.getElementById('s5v-input-ico');
  const field = document.getElementById('s5v-field');
  if (inp) {
    inp.value = (s5vView === 'answer') ? s5vAnswer : String(S5V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s5vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s5vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s5vShowPopup('wrong2', s5vView);
}
function s5vToggleView() {
  if (s5vAnswer === null) return;
  s5vView = (s5vView === 'solution') ? 'answer' : 'solution';
  s5vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s5vFinishDom() {
  const inp = document.getElementById('s5v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s5v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s5v-hint');
  syncPracticeProgressNav(document.getElementById('s5'));
}

function s5vFinish() {
  s5vAnswered = true;
  s5vDone = true;
  s5vFinishDom();
}

function s5vResetInitial() {
  s5vAttempts = 0;
  s5vAnswered = false;
  s5vLastWrongValue = null;
  s5vAnswer = null;
  s5vView = 'solution';
  const inp = document.getElementById('s5v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s5v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s5v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s5v-popup')?.classList.add('hidden');
  document.getElementById('s5v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s5v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  showHintButton('s5v-hint');
}

function s5vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s5v-hint-overlay')?.classList.remove('hidden');
}
function s5vCloseHint() { document.getElementById('s5v-hint-overlay')?.classList.add('hidden'); }
function s5vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s5vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s5v-hint-overlay')?.classList.contains('hidden')) s5vCloseHint();
});

/* Plain auto-height popup — nothing in this part scrolls (see the note on
   s2scShowPopup). Height verified against the canvas budget. */
function s5vShowPopup(type, view) {
  const popup = document.getElementById('s5v-popup');
  if (!popup) return;
  const base = S5V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;

  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);

  const titleEl = document.getElementById('s5v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s5v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S5V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s5v-popup', cfg.action, s5vToggleView);

  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ═══════════════════════════════════════════════════════════
   SHARED — volunteering pie chart ("basic5"), used by S6/S7/S8
   (slides 62/63/64, the three sub-parts of item -005).

   LIVE SVG, not a bitmap. All three slides carry the production note
   "יש להשתמש בתמונה של הדיאגרמה בלי הטקסט ולהוסיף את הטקסטים עם החוזים
   בנפרד – טקסט חי" — use the diagram WITHOUT its text and add the
   percentage texts separately as LIVE text. No text-free version of the
   diagram exists in the pptx (media/image50.png and image57.png are
   visually identical, both with labels baked in), so the asset the note
   asks for is unavailable. Drawing the whole diagram as SVG satisfies the
   note fully — every label is real text — and avoids upscaling a 453×295
   bitmap. Wedge colours are pixel-sampled from the source image so the
   palette matches the producer's design exactly.

   Rendered by one function and injected into each screen so the ~40 lines
   of SVG exist once, not three times.
   ═══════════════════════════════════════════════════════════ */

/* Order is CLOCKWISE FROM 12 O'CLOCK, matching the source image: teal 35%
   sweeps from north to ESE, then orange 15% to due south, then green 20%
   to WSW, then blue 30% back to north. `side` places the label outside
   its own wedge on the same side as the source has it. */
const PIE_SEGMENTS = [
  { label: 'بيت المسنّين',      pct: 35, color: '#025776' },
  { label: 'تعبة طرود غذائية',     pct: 15, color: '#bc3808' },
  { label: '‎مساعدة تعليمية',     pct: 20, color: '#25702f' },
  { label: 'إرشاد اجتماعي',  pct: 30, color: '#4099c5' }
];

/* Verbatim alt text from the presenter notes of all three slides. */
const PIE_ALT = 'مخطط دائري يعرض توزيع أربع فئات: بيت المسنّين (%35)، إرشاد اجتماعي (%30)، مساعدة تعليمية (%20)، وتعبئة طرود غذائية (%15).';


function pieChartSVG() {
  const CX = 226, CY = 150, R = 78, LR = 122;   // label ring radius
  let angle = 0;
  const wedges = [], labels = [];
  PIE_SEGMENTS.forEach(seg => {
    const sweep = seg.pct * 3.6;
    wedges.push('<path d="' + pieSlicePath(CX, CY, R, angle, angle + sweep) +
                '" fill="' + seg.color + '"/>');
    // label sits on the ring, on the bisector of its own wedge
    const mid = angle + sweep / 2;
    const rad = (mid - 90) * Math.PI / 180;
    const lx = CX + LR * Math.cos(rad), ly = CY + LR * Math.sin(rad);
    labels.push(
      '<text class="pie-label" x="' + lx.toFixed(1) + '" y="' + (ly - 4).toFixed(1) + '" ' +
        'fill="' + seg.color + '" text-anchor="middle">' + seg.label + '</text>' +
      '<text class="pie-label pie-label-pct" x="' + lx.toFixed(1) + '" y="' + (ly + 16).toFixed(1) + '" ' +
        'fill="' + seg.color + '" text-anchor="middle" dir="ltr">' + seg.pct + '%</text>'
    );
    angle += sweep;
  });
  return '<svg viewBox="0 0 453 300" role="img" aria-label="' + PIE_ALT + '">' +
         wedges.join('') + labels.join('') + '</svg>';
}

/* Inject into every host that asks for it. Idempotent: re-rendering the
   same host replaces its contents rather than appending a second chart. */
function renderPieCharts() {
  document.querySelectorAll('.pie-figure').forEach(host => {
    host.innerHTML = pieChartSVG();
  });
}
renderPieCharts();

/* ═══════════════════════════════════════════════════════════
   TEMPLATES — item methodica-math-percent-02-03-005, question 5 in THREE
   sub-parts (slides 62/63/64, deck maps 1:1):
     S6 · א · SingleChoiceQuestion · 48/24/18/36, correct 18
     S7 · ב · ValueInputQuestion   · correct 78
     S8 · ג · SingleChoiceQuestion · כן/לא/לא-ניתן-לדעת, correct "לא"
   All three share the live-SVG pie chart (see renderPieCharts above).
   S6/S7 keep the set-wide "hint from the start" policy; S8 has NO hint at
   all, per its presenter note.
   ═══════════════════════════════════════════════════════════ */

/* ── S6 · slide 62 · sub-part א ───────────────────────────── */
const S6SC = { correctId: 'c', maxAttempts: 2 };   // 'c' = 18
let s6scSelected = null, s6scAttempts = 0, s6scAnswered = false,
    s6scDone = false, s6scLastWrong = null, s6scResult = null;

/* Rebuilt live from the slide's rendered mockups (media/image89.png
   correct / image90.png wrong). Same fraction-then-decimal shape as
   S1/S5, so it reuses .eq-row/.eq-or/frac(). */
const S6SC_EXPLAIN =
  '<p>%15 ‎من الـ 120 طالبًا طلبوا التطوع في تعبئة الطرود الغذائية‎.</p>' +
  '<p>نحسب بواسطة تحويل النسبة المئوية إلى كسر‎:</p>' +
  '<div class="eq-row"><span>15%</span><span>&middot;</span><span>120</span><span>=</span>' +
    frac(15, 100) + '<span>&middot;</span><span>120</span><span>=</span><span>18</span></div>' +
  '<p class="eq-or">أو</p>' +
  '<div class="eq-row"><span>15%</span><span>&middot;</span><span>120</span><span>=</span>' +
    '<span>0.15</span><span>&middot;</span><span>120</span><span>=</span><span>18</span></div>' +
  '<p>18 ‎طالبًا طلبوا التطوع في تعبئة الطرود الغذائية‎.</p>';

/* Titles verbatim from the slide's two feedback shapes. SingleChoice has
   no View My Answer Toggle — the chosen wrong option and the correct one
   are both visibly marked in the list at once. */
const S6SC_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S6SC_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، هذا جزء طبيعي من عملية التعلم.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S6SC_EXPLAIN }
};

function s6scSelect(id) {
  if (s6scAnswered) return;
  s6scSelected = id;
  // After a wrong attempt, picking again must clear the stale red/green
  // marks — otherwise the option marked wrong on attempt 1 stays red
  // alongside the one marked on attempt 2, and the final state shows TWO
  // wrong options instead of "the chosen wrong option". Matches S2.
  if (s6scAttempts > 0) {
    document.querySelectorAll('#s6 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s6 .scq-opt').forEach(b => {
    const on = b.dataset.id === id;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  document.getElementById('s6sc-popup')?.classList.add('hidden');
  const chk = document.getElementById('s6sc-check');
  if (chk) chk.disabled = (id === null) || (id === s6scLastWrong);
}

function s6scMark() {
  document.querySelectorAll('#s6 .scq-opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.id === S6SC.correctId) b.classList.add('correct');
    else if (b.dataset.id === s6scSelected) b.classList.add('wrong');
  });
}

function s6scCheck() {
  if (s6scAnswered) { advanceScreen(); return; }
  if (!s6scSelected) return;
  s6scAttempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s6scOk = s6scSelected === S6SC.correctId;

  /* xAPI: answered - after both guards, before the branches. */
  xapiAnswered('005', 'q1', s6scOk,
    s6scOk || s6scAttempts >= S6SC.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s6', s6scSelected)));

  if (s6scOk) {
    s6scResult = 'correct';
    document.querySelectorAll('#s6 .scq-opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.id === S6SC.correctId) b.classList.add('correct');
    });
    s6scFinish();
    s6scShowPopup('correct');
  } else if (s6scAttempts >= S6SC.maxAttempts) {
    s6scResult = 'wrong2';
    s6scMark();
    s6scFinish();
    s6scShowPopup('wrong2');
  } else {
    s6scLastWrong = s6scSelected;
    document.querySelector('#s6 .scq-opt[data-id="' + s6scSelected + '"]')?.classList.add('wrong');
    const chk = document.getElementById('s6sc-check');
    if (chk) chk.disabled = true;
    s6scShowPopup('retry');
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
function s6scFinishDom() {
  const chk = document.getElementById('s6sc-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s6sc-hint');
  syncPracticeProgressNav(document.getElementById('s6'));
}

function s6scFinish() {
  s6scAnswered = true; s6scDone = true;
  s6scFinishDom();
}

function s6scResetInitial() {
  s6scSelected = null; s6scAttempts = 0; s6scAnswered = false;
  s6scLastWrong = null; s6scResult = null;
  document.querySelectorAll('#s6 .scq-opt').forEach(b => {
    b.disabled = false;
    b.classList.remove('selected', 'correct', 'wrong');
    b.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s6sc-popup')?.classList.add('hidden');
  document.getElementById('s6sc-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s6sc-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  showHintButton('s6sc-hint');
}

function s6scOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('005', 'q1');
  document.getElementById('s6sc-hint-overlay')?.classList.remove('hidden');
}
function s6scCloseHint() { document.getElementById('s6sc-hint-overlay')?.classList.add('hidden'); }
function s6scCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s6scCloseHint(); }

function s6scShowPopup(type) {
  const popup = document.getElementById('s6sc-popup');
  if (!popup) return;
  const cfg = S6SC_POPUP[type];
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  const titleEl = document.getElementById('s6sc-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s6sc-popup-body');
  if (bodyEl) bodyEl.innerHTML = Array.isArray(cfg.body) ? cfg.body.map(p => '<p>' + p + '</p>').join('') : cfg.body;
  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ── S7 · slide 63 · sub-part ב ───────────────────────────── */
const S7V = { correct: 78, maxAttempts: 2 };
let s7vAttempts = 0, s7vAnswered = false, s7vDone = false;
let s7vLastWrongValue = null, s7vAnswer = null, s7vView = 'solution';

/* From media/image92.png (correct) / image93.png (wrong). This one has an
   extra first step the other sub-parts don't: summing the two wedges
   (35% + 30% = 65%) before converting. */
const S7V_EXPLAIN =
  '<p>سجل لبيت المسنّين والإرشاد الاجتماعي‎ %65 من الطلاب:</p>' +
  '<div class="eq-row"><span>35%</span><span>+</span><span>30%</span><span>=</span><span>65%</span></div>' +
  '<p>بواسطة تحويل النسبة المئوية إلى كسر‎:</p>' +
  '<div class="eq-row"><span>65%</span><span>&middot;</span><span>120</span><span>=</span>' +
    frac(65, 100) + '<span>&middot;</span><span>120</span><span>=</span><span>78</span></div>' +
  '<p>78 طالبًا سجلوا للتطوع في بيت المسنّين والإرشاد الاجتماعي.</p>';

const S7V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، وهذا دليل على أنكم في طريقكم إلى الفهم.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s7vInputChange() {
  if (s7vAnswered) return;
  const inp = document.getElementById('s7v-input');
  const ico = document.getElementById('s7v-input-ico');
  document.getElementById('s7v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s7v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  const chk = document.getElementById('s7v-check');
  if (chk) chk.disabled = (v === '') || (v === s7vLastWrongValue);
}

function s7vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S7V.correct;
}

function s7vCheck() {
  if (s7vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s7v-input');
  const ico = document.getElementById('s7v-input-ico');
  if (!inp || inp.value.trim() === '') return;
  s7vAttempts++;
  const field = document.getElementById('s7v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s7vOk = s7vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('005', 'q2', s7vOk,
    s7vOk || s7vAttempts >= S7V.maxAttempts,
    inp.value.trim());

  if (s7vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s7vFinish();
    s7vShowPopup('correct');
  } else if (s7vAttempts >= S7V.maxAttempts) {
    s7vAnswer = inp.value.trim();
    s7vView = 'solution';
    s7vFinish();
    s7vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s7vLastWrongValue = inp.value.trim();
    document.getElementById('s7v-check').disabled = true;
    s7vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

function s7vApplyView() {
  if (s7vAnswer === null) return;
  const inp = document.getElementById('s7v-input');
  const ico = document.getElementById('s7v-input-ico');
  const field = document.getElementById('s7v-field');
  if (inp) {
    inp.value = (s7vView === 'answer') ? s7vAnswer : String(S7V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s7vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s7vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s7vShowPopup('wrong2', s7vView);
}
function s7vToggleView() {
  if (s7vAnswer === null) return;
  s7vView = (s7vView === 'solution') ? 'answer' : 'solution';
  s7vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s7vFinishDom() {
  const inp = document.getElementById('s7v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s7v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s7v-hint');
  syncPracticeProgressNav(document.getElementById('s7'));
}

function s7vFinish() {
  s7vAnswered = true; s7vDone = true;
  s7vFinishDom();
}

function s7vResetInitial() {
  s7vAttempts = 0; s7vAnswered = false; s7vLastWrongValue = null;
  s7vAnswer = null; s7vView = 'solution';
  const inp = document.getElementById('s7v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s7v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s7v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s7v-popup')?.classList.add('hidden');
  document.getElementById('s7v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s7v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  showHintButton('s7v-hint');
}

function s7vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('005', 'q2');
  document.getElementById('s7v-hint-overlay')?.classList.remove('hidden');
}
function s7vCloseHint() { document.getElementById('s7v-hint-overlay')?.classList.add('hidden'); }
function s7vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s7vCloseHint(); }

function s7vShowPopup(type, view) {
  const popup = document.getElementById('s7v-popup');
  if (!popup) return;
  const base = S7V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  const titleEl = document.getElementById('s7v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s7v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S7V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s7v-popup', cfg.action, s7vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ── S8 · slide 64 · sub-part ג ─────────────────────────────
   NO HINT on this screen (presenter note: "שימו לב שאין רמז"), so there
   are no s8scOpenHint/CloseHint functions and no hideHintButton call —
   there is no hint button to hide. Explanation is prose only; this
   sub-part is a reasoning question, so the slide shows no equations. */
const S8SC = { correctId: 'b', maxAttempts: 2 };   // 'b' = לא
let s8scSelected = null, s8scAttempts = 0, s8scAnswered = false,
    s8scDone = false, s8scLastWrong = null, s8scResult = null;

const S8SC_EXPLAIN =
  '<p>إذا تطوع %25 من الطلاب في كل مجال تطوع، سيكون هناك فائض من المتطوعين في بيت المسنّين والإرشاد الاجتماعي‎.</p>' +
  '<p>%30 و-%35 هما أكثر من %25 المخصصة لكل مجال تطوع‎.</p>';

const S8SC_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S8SC_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، لكن يمكن التعلّم من هذا الخطأ.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S8SC_EXPLAIN }
};

function s8scSelect(id) {
  if (s8scAnswered) return;
  s8scSelected = id;
  // Same stale-mark clear as S6/S2 — see the note on s6scSelect.
  if (s8scAttempts > 0) {
    document.querySelectorAll('#s8 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s8 .scq-opt').forEach(b => {
    const on = b.dataset.id === id;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  document.getElementById('s8sc-popup')?.classList.add('hidden');
  const chk = document.getElementById('s8sc-check');
  if (chk) chk.disabled = (id === null) || (id === s8scLastWrong);
}

function s8scMark() {
  document.querySelectorAll('#s8 .scq-opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.id === S8SC.correctId) b.classList.add('correct');
    else if (b.dataset.id === s8scSelected) b.classList.add('wrong');
  });
}

function s8scCheck() {
  if (s8scAnswered) { advanceScreen(); return; }
  if (!s8scSelected) return;
  s8scAttempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s8scOk = s8scSelected === S8SC.correctId;

  /* xAPI: answered - after both guards, before the branches. */
  xapiAnswered('005', 'q3', s8scOk,
    s8scOk || s8scAttempts >= S8SC.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s8', s8scSelected)));

  if (s8scOk) {
    s8scResult = 'correct';
    document.querySelectorAll('#s8 .scq-opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.id === S8SC.correctId) b.classList.add('correct');
    });
    s8scFinish();
    s8scShowPopup('correct');
  } else if (s8scAttempts >= S8SC.maxAttempts) {
    s8scResult = 'wrong2';
    s8scMark();
    s8scFinish();
    s8scShowPopup('wrong2');
  } else {
    s8scLastWrong = s8scSelected;
    document.querySelector('#s8 .scq-opt[data-id="' + s8scSelected + '"]')?.classList.add('wrong');
    const chk = document.getElementById('s8sc-check');
    if (chk) chk.disabled = true;
    s8scShowPopup('retry');
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
function s8scFinishDom() {
  const chk = document.getElementById('s8sc-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  /* no hint button on this screen — nothing to hide */
  syncPracticeProgressNav(document.getElementById('s8'));
}

function s8scFinish() {
  s8scAnswered = true; s8scDone = true;
  s8scFinishDom();
}

function s8scResetInitial() {
  s8scSelected = null; s8scAttempts = 0; s8scAnswered = false;
  s8scLastWrong = null; s8scResult = null;
  document.querySelectorAll('#s8 .scq-opt').forEach(b => {
    b.disabled = false;
    b.classList.remove('selected', 'correct', 'wrong');
    b.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s8sc-popup')?.classList.add('hidden');
  const chk = document.getElementById('s8sc-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function s8scShowPopup(type) {
  const popup = document.getElementById('s8sc-popup');
  if (!popup) return;
  const cfg = S8SC_POPUP[type];
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  const titleEl = document.getElementById('s8sc-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s8sc-popup-body');
  if (bodyEl) bodyEl.innerHTML = Array.isArray(cfg.body) ? cfg.body.map(p => '<p>' + p + '</p>').join('') : cfg.body;
  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* Escape closes whichever hint overlay is open on S6/S7 (S8 has none). */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s6sc-hint-overlay')?.classList.contains('hidden')) s6scCloseHint();
  if (!document.getElementById('s7v-hint-overlay')?.classList.contains('hidden')) s7vCloseHint();
  if (!document.getElementById('s9v-hint-overlay')?.classList.contains('hidden')) s9vCloseHint();
});

/* ═══════════════════════════════════════════════════════════
   S9 · slide 62 · sub-part ד · ValueInputQuestion (Item -005's 4th
   sub-part — a slide inserted into the deck AFTER S6/S7/S8 were already
   built; see the markup comment on #s9 for the full renumbering story).
   Correct answer: 18 (78 registered − 2×[25% of 120] already-allocated
   seats). Hint shown from the start (no override note). Completion label
   "המשך" — this template's own, not SingleChoice's "שנמשיך?".

   Explanation reuses S1/S5/S6's fraction-typesetting pieces (frac(),
   .eq-row) for the percent-conversion step, plus a plain numeric eq-row
   for the final subtraction — the SAME two-equation shape as this item's
   own mockup image, whose equations are OMML objects invisible to a
   text-run dump (see the markup comment: always check the rendered
   mockup, not just <a:t> text, before writing a ValueInputQuestion
   explanation).
   ═══════════════════════════════════════════════════════════ */
const S9V = { correct: 18, maxAttempts: 2 };

let s9vAttempts = 0, s9vAnswered = false, s9vDone = false;
let s9vLastWrongValue = null, s9vAnswer = null, s9vView = 'solution';

/* From media/image94.png (correct) / image95.png (wrong) — both bodies
   are identical apart from the title. The wrong shape's SOURCE text
   duplicates the final "אחר." — confirmed in the mockup too, so it is a
   genuine authoring artifact, not a transcription slip on this end.
   Shipped as a single "אחר.", matching the correct shape's own text. */
const S9V_EXPLAIN =
  '<p>وجدنا من قبل أن 78 طالبًا سجلوا للتطوع في بيت المسنّين والإرشاد الاجتماعي.</p>' +
  '<p>في كل مجال سيتطوع %25 من أصل 120 طالبًا. نحسب عدد المتطوعين في كل مجال‎.</p>' +
  '<div class="eq-row"><span>25%</span><span>&middot;</span><span>120</span><span>=</span>' +
    // Unit phrase arrangement (producer decision, restated in positional
    // terms 2026-08-27): physically left-to-right the row ends
    // "... = תלמידים 30" — the number to the RIGHT of the unit word.
    // That is what the slide29-era mockups draw (and image129.png in
    // part 07 for the same shape); the rendered PPTX is the source of
    // truth here. Word and number each in their own <bdi>, row is
    // direction:ltr, so DOM order IS physical order. See part 02's
    // S7_EXPLANATION_BODY for the full note.
    frac(25, 100) + '<span>&middot;</span><span>120</span><span>=</span><span dir="ltr"><bdi>طالبًا</bdi> <bdi>30</bdi></span></div>' +
  '<p>في المجالين معًا سيتطوع 60 طالبًا، بينما سجل 78 طالبًا‎.</p>' +
  '<div class="eq-row"><span>78</span><span>&minus;</span><span>60</span><span>=</span><span>18</span></div>' +
  '<p>لذلك سيضطر 18 طالبًا إلى اختيار مجال تطوع آخر‎.</p>';

const S9V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S9V_EXPLAIN
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، وهذا دليل على أنكم في طريقكم إلى الفهم.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s9vInputChange() {
  if (s9vAnswered) return;
  const inp = document.getElementById('s9v-input');
  const ico = document.getElementById('s9v-input-ico');
  document.getElementById('s9v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s9v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  const chk = document.getElementById('s9v-check');
  if (chk) chk.disabled = (v === '') || (v === s9vLastWrongValue);
}

function s9vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S9V.correct;
}

function s9vCheck() {
  if (s9vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s9v-input');
  const ico = document.getElementById('s9v-input-ico');
  if (!inp || inp.value.trim() === '') return;
  s9vAttempts++;
  const field = document.getElementById('s9v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s9vOk = s9vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('005', 'q4', s9vOk,
    s9vOk || s9vAttempts >= S9V.maxAttempts,
    inp.value.trim());

  if (s9vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s9vFinish();
    s9vShowPopup('correct');
  } else if (s9vAttempts >= S9V.maxAttempts) {
    s9vAnswer = inp.value.trim();
    s9vView = 'solution';
    s9vFinish();
    s9vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s9vLastWrongValue = inp.value.trim();
    document.getElementById('s9v-check').disabled = true;
    s9vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

function s9vApplyView() {
  if (s9vAnswer === null) return;
  const inp = document.getElementById('s9v-input');
  const ico = document.getElementById('s9v-input-ico');
  const field = document.getElementById('s9v-field');
  if (inp) {
    inp.value = (s9vView === 'answer') ? s9vAnswer : String(S9V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s9vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s9vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s9vShowPopup('wrong2', s9vView);
}
function s9vToggleView() {
  if (s9vAnswer === null) return;
  s9vView = (s9vView === 'solution') ? 'answer' : 'solution';
  s9vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s9vFinishDom() {
  const inp = document.getElementById('s9v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s9v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s9v-hint');
  syncPracticeProgressNav(document.getElementById('s9'));
}

function s9vFinish() {
  s9vAnswered = true; s9vDone = true;
  s9vFinishDom();
}

function s9vResetInitial() {
  s9vAttempts = 0; s9vAnswered = false; s9vLastWrongValue = null;
  s9vAnswer = null; s9vView = 'solution';
  const inp = document.getElementById('s9v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s9v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s9v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s9v-popup')?.classList.add('hidden');
  document.getElementById('s9v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s9v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  showHintButton('s9v-hint');
}

function s9vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('005', 'q4');
  document.getElementById('s9v-hint-overlay')?.classList.remove('hidden');
}
function s9vCloseHint() { document.getElementById('s9v-hint-overlay')?.classList.add('hidden'); }
function s9vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s9vCloseHint(); }

function s9vShowPopup(type, view) {
  const popup = document.getElementById('s9v-popup');
  if (!popup) return;
  const base = S9V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  const titleEl = document.getElementById('s9v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s9v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S9V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s9v-popup', cfg.action, s9vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL COMPONENT — Progress Question nav for the בסיסי תרגול set.
   Contract source: 720-templates -> _global-components.md -> "Progress
   Question" (states/markup/behavioral rules); colors/geometry from
   Figma (see the CSS block). Deliberate LOCAL VARIANT of the doc's
   default one-screen-per-question model: some questions here span
   MULTIPLE screens (Q1 = S1+S2, Q5 = S6-S9), and "success in the
   question" per the producer's own rule means success in EVERY
   sub-part — so a question's dot state is a computed AGGREGATE over
   its screens' own already-existing resolution state, not a separately
   maintained field. This avoids a second source of truth that could
   drift from each screen's real s*vDone/s*vAnswer/s*scResult — those
   variables stay the only place "is this resolved, and was it right"
   is recorded; the nav just reads them.

   Aggregation rule (confirmed with the producer): a question's dot
   only becomes correct/incorrect once ALL of its sub-screens are
   resolved — never early, even if an earlier sub-part already failed.
   Click-to-navigate on a resolved/current question's dot goes to its
   FIRST sub-screen (also confirmed).
   ═══════════════════════════════════════════════════════════ */
const PRACTICE_QUESTIONS = [
  { number: 1, screens: [1, 2] },
  { number: 2, screens: [3] },
  { number: 3, screens: [4] },
  { number: 4, screens: [5] },
  { number: 5, screens: [6, 7, 8, 9] }
];

/* One getter per question screen: null while unresolved, else
   'correct'/'incorrect'. Each reads that screen's OWN existing state
   variables — no parallel tracking. VIQ screens: s*vAnswer stays null
   only on the correct path (both first-try and second-try-correct);
   it is snapshotted with the learner's wrong value only on the
   final-wrong/destructive-reveal path (see each screen's *Check()).
   SCQ screens: s*scResult is 'correct' or 'wrong2'. */
const PRACTICE_SCREEN_OUTCOME = {
  1: () => (typeof s1vDone !== 'undefined' && s1vDone) ? (s1vAnswer === null ? 'correct' : 'incorrect') : null,
  2: () => (typeof s2scDone !== 'undefined' && s2scDone) ? (s2scResult === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => (typeof s3vDone !== 'undefined' && s3vDone) ? (s3vAnswer === null ? 'correct' : 'incorrect') : null,
  4: () => (typeof s4vDone !== 'undefined' && s4vDone) ? (s4vAnswer === null ? 'correct' : 'incorrect') : null,
  5: () => (typeof s5vDone !== 'undefined' && s5vDone) ? (s5vAnswer === null ? 'correct' : 'incorrect') : null,
  6: () => (typeof s6scDone !== 'undefined' && s6scDone) ? (s6scResult === 'correct' ? 'correct' : 'incorrect') : null,
  7: () => (typeof s7vDone !== 'undefined' && s7vDone) ? (s7vAnswer === null ? 'correct' : 'incorrect') : null,
  8: () => (typeof s8scDone !== 'undefined' && s8scDone) ? (s8scResult === 'correct' ? 'correct' : 'incorrect') : null,
  9: () => (typeof s9vDone !== 'undefined' && s9vDone) ? (s9vAnswer === null ? 'correct' : 'incorrect') : null
};

/* Both sets share ONE renderer/aggregator — the doc's reuse rule. The
   set (questions + per-screen outcome getters) is a parameter, not a
   hardcoded global, so adding the 2-question "תרגול סטנדרטי" nav needed
   no second copy of this logic. */
function questionState(q, outcomeMap) {
  const outcomes = q.screens.map(n => outcomeMap[n]());
  if (outcomes.every(o => o !== null)) {
    return outcomes.every(o => o === 'correct') ? 'correct' : 'incorrect';
  }
  if (q.screens.indexOf(currentScreen) !== -1) return 'current';
  return 'not-answered';
}

/* Generic renderer — one copy for every screen, per the doc's reuse
   rule. `visited` is DERIVED (state !== 'not-answered'), not a second
   stored flag: with this lomda's strictly linear/gated progression
   (each screen's own Continue stays disabled until answered, and the
   only way to reach screen N is through 1..N-1), a question can only
   ever be current/resolved/not-yet-reached — "visited but still
   unresolved and not current" is not a reachable state here. */
function updateProgressQuestion(container, questions, outcomeMap) {
  const states = questions.map(q => questionState(q, outcomeMap));
  questions.forEach((q, i) => {
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
  for (let n = 1; n < questions.length; n++) {
    const conn = container.querySelector('[data-connector="' + n + '"]');
    if (!conn) continue;
    const resolved = states[n - 1] === 'correct' || states[n - 1] === 'incorrect';
    conn.classList.toggle('progress-question__connector--visited', resolved);
  }
}
function syncProgressNav(sectionEl, questions, outcomeMap) {
  const nav = sectionEl?.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, questions, outcomeMap);
}
function syncPracticeProgressNav(sectionEl) {
  syncProgressNav(sectionEl, PRACTICE_QUESTIONS, PRACTICE_SCREEN_OUTCOME);
}

/* ── Progress Question nav, SECOND instance: the "תרגול סטנדרטי" set
   (S11-S14), 2 questions, each spanning two sub-parts:
     שאלה 1 = S11 (סעיף א') + S12 (סעיף ב')
     שאלה 2 = S13 (סעיף א') + S14 (סעיף ב')
   Identical component, behavior and geometry to the S1-S9 nav — only
   the dot count and the screen mapping differ. Its own set/getters
   rather than extra entries in PRACTICE_* so each nav renders exactly
   its own questions, numbered from 1, with no cross-set state.

   Same producer aggregation rule as the basic set: a question resolves
   to correct/incorrect only once BOTH of its sub-parts are answered —
   a wrong סעיף א' does NOT show its X until סעיף ב' has been answered
   too (confirmed 2026-08-26). ── */
const STANDARD_QUESTIONS = [
  { number: 1, screens: [11, 12] },
  { number: 2, screens: [13, 14] }
];

const STANDARD_SCREEN_OUTCOME = {
  11: () => (typeof s11vDone !== 'undefined' && s11vDone) ? (s11vAnswerSnapshot === null ? 'correct' : 'incorrect') : null,
  /* S12 is a HookOpenQuestion — "no correctness model at all" (see its
     own header comment), so it can never be 'incorrect' and never
     decides שאלה 1's icon; S11 alone does. All it contributes is the
     TIMING gate above: until it is answered, שאלה 1 stays 'current'.
     Resolution is read LIVE from the textarea — the same single source
     of truth its own Continue button is enabled from — rather than a
     second stored flag that could drift from it. */
  12: () => ((document.getElementById('s12oq-input')?.value || '').trim().length >= S12OQ_MIN_CHARS) ? 'correct' : null,
  13: () => (typeof s13vDone !== 'undefined' && s13vDone) ? (s13vAnswer === null ? 'correct' : 'incorrect') : null,
  14: () => (typeof s14vDone !== 'undefined' && s14vDone) ? (s14vAnswer === null ? 'correct' : 'incorrect') : null
};

function syncStandardProgressNav(sectionEl) {
  syncProgressNav(sectionEl, STANDARD_QUESTIONS, STANDARD_SCREEN_OUTCOME);
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, Variant C: multi-blank table
   (Screen 12 · S11, new slide 64). See the CSS block and index.html
   comments for the full source/measurement trail. This is the first
   screen in this project's "תרגול סטנדרטי" (standard-practice) set —
   hint policy is HIDDEN-until-first-wrong (opposite of S1-S9's basic
   practice), reusing the existing hideHintButton()/showHintButton()
   helpers, just called at different points in the lifecycle.

   State model generalizes the single-input View My Answer Toggle
   (S1/S3/S4/S5/S7/S9) to N fields: one snapshot ARRAY instead of one
   scalar, restored/compared together, but each field's own
   correct/incorrect class+icon is still computed and shown
   INDIVIDUALLY (not one shared verdict) — matches SingleChoiceQuestion's
   own "mark the specific wrong option" granularity rather than treating
   the four inputs as an opaque combined answer.
   ═══════════════════════════════════════════════════════════ */
const S11V = {
  rows: [
    { key: 'sandwich', correct: 20 },
    { key: 'cereal',   correct: 10 },
    { key: 'yogurt',   correct: 5  },
    { key: 'fruit',    correct: 15 }
  ],
  maxAttempts: 2
};

let s11vAttempts = 0, s11vAnswered = false, s11vDone = false;
let s11vLastWrongSnapshot = null, s11vAnswerSnapshot = null, s11vView = 'solution';

/* From media/image96.png (correct) / image97.png (wrong) — both bodies
   identical apart from the title, same shared-explanation convention as
   every other ValueInputQuestion screen in this part. Equations are
   OMML objects in the source, invisible to the <a:t> text dump (same
   gotcha S9 already hit) — rebuilt here as live HTML via the existing
   frac()/.eq-row helpers. */
const S11V_EXPLAIN =
  '<p>نحسب بواسطة تحويل النسبة المئوية إلى كسر، عدد الوجبات التي تناولها وائل من كل نوع.</p>' +
  '<p>شطيرة‎:</p>' +
  '<div class="eq-row"><span>40%</span><span>&middot;</span><span>50</span><span>=</span>' +
    frac(40, 100) + '<span>&middot;</span><span>50</span><span>=</span><span>20</span></div>' +
  '<p>حبوب الإفطار‎:</p>' +
  '<div class="eq-row"><span>20%</span><span>&middot;</span><span>50</span><span>=</span>' +
    frac(20, 100) + '<span>&middot;</span><span>50</span><span>=</span><span>10</span></div>' +
  '<p>زبادي بروتين‎:</p>' +
  '<div class="eq-row"><span>10%</span><span>&middot;</span><span>50</span><span>=</span>' +
    frac(10, 100) + '<span>&middot;</span><span>50</span><span>=</span><span>5</span></div>' +
  '<p>فاكهة‎:</p>' +
  '<div class="eq-row"><span>30%</span><span>&middot;</span><span>50</span><span>=</span>' +
    frac(30, 100) + '<span>&middot;</span><span>50</span><span>=</span><span>15</span></div>' +
  '<p>انتبهوا إلى أن مجموع عمود النسبة المئوية يساوي %100 - أي، الصحيح بالنسبة المئوية، ومجموع عمود عدد الوجبات يساوي 50 يومًا، وهي الكمية الكاملة لدينا‎.</p>';

const S11V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S11V_EXPLAIN
  wrong2:  { bg: '#ffdbdc', title: 'هذا خطأ، كل خطأ يقوّي قدراتكم‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s11vInputEl(key)  { return document.getElementById('s11v-input-' + key); }
function s11vFieldEl(key)  { return document.getElementById('s11v-field-' + key); }
function s11vIcoEl(key)    { return document.getElementById('s11v-ico-' + key); }

function s11vSnapshot() {
  return S11V.rows.map(r => s11vInputEl(r.key).value.trim());
}
function s11vAllFilled() {
  return S11V.rows.every(r => s11vInputEl(r.key).value.trim() !== '');
}
function s11vMarkField(key, correct) {
  const field = s11vFieldEl(key);
  const ico = s11vIcoEl(key);
  field?.classList.remove('error', 'correct');
  field?.classList.add(correct ? 'correct' : 'error');
  if (ico) ico.innerHTML = correct ? S1V_CHECK_SVG : S1V_WRONG_SVG;
}
function s11vClearField(key) {
  s11vFieldEl(key)?.classList.remove('error', 'correct');
  const ico = s11vIcoEl(key);
  if (ico) ico.innerHTML = '';
}

function s11vInputChange() {
  if (s11vAnswered) return;
  document.getElementById('s11v-popup')?.classList.add('hidden');
  S11V.rows.forEach(r => s11vClearField(r.key));
  const chk = document.getElementById('s11v-check');
  if (chk) {
    const snap = JSON.stringify(s11vSnapshot());
    chk.disabled = !s11vAllFilled() || (snap === s11vLastWrongSnapshot);
  }
}

function s11vCheck() {
  if (s11vAnswered) { advanceScreen(); return; }
  if (!s11vAllFilled()) return;
  s11vAttempts++;
  const results = S11V.rows.map(r => Number(s11vInputEl(r.key).value) === r.correct);
  const allCorrect = results.every(Boolean);

  /* xAPI: answered - before the branches. The rows here are the columns of
     ONE catalogue question (006/q1), not separate questions, so they report
     as a single all-or-nothing result - which is also the only granularity
     S11V offers: attempts and the reveal are per-screen.
     The response comes from s11vSnapshot() while the inputs are still the
     learner's; the final-wrong branch overwrites them with the solution. */
  xapiAnswered('006', 'q1', allCorrect,
    allCorrect || s11vAttempts >= S11V.maxAttempts,
    JSON.stringify(s11vSnapshot()));
  if (allCorrect) {
    S11V.rows.forEach(r => s11vMarkField(r.key, true));
    s11vFinish();
    s11vShowPopup('correct');
  } else if (s11vAttempts >= S11V.maxAttempts) {
    s11vAnswerSnapshot = s11vSnapshot();   // capture BEFORE the reveal overwrites it
    s11vView = 'solution';
    s11vFinish();
    s11vApplyView();
  } else {
    S11V.rows.forEach((r, i) => s11vMarkField(r.key, results[i]));
    s11vLastWrongSnapshot = JSON.stringify(s11vSnapshot());
    document.getElementById('s11v-check').disabled = true;
    showHintButton('s11v-hint');   // hidden-until-first-wrong policy
    s11vShowPopup('retry');
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

function s11vApplyView() {
  if (s11vAnswerSnapshot === null) return;
  S11V.rows.forEach((r, i) => {
    const inp = s11vInputEl(r.key);
    const val = (s11vView === 'answer') ? s11vAnswerSnapshot[i] : String(r.correct);
    inp.value = val;
    s11vMarkField(r.key, Number(val) === r.correct);
  });
  s11vShowPopup('wrong2', s11vView);
}
function s11vToggleView() {
  if (s11vAnswerSnapshot === null) return;
  s11vView = (s11vView === 'solution') ? 'answer' : 'solution';
  s11vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s11vFinishDom() {
  S11V.rows.forEach(r => { const inp = s11vInputEl(r.key); if (inp) inp.disabled = true; });
  const chk = document.getElementById('s11v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s11v-hint');
  syncStandardProgressNav(document.getElementById('s11'));
}

function s11vFinish() {
  s11vAnswered = true; s11vDone = true;
  s11vFinishDom();
}

function s11vResetInitial() {
  s11vAttempts = 0; s11vAnswered = false; s11vLastWrongSnapshot = null;
  s11vAnswerSnapshot = null; s11vView = 'solution';
  S11V.rows.forEach(r => {
    const inp = s11vInputEl(r.key);
    if (inp) { inp.value = ''; inp.disabled = false; }
    s11vClearField(r.key);
  });
  document.getElementById('s11v-popup')?.classList.add('hidden');
  document.getElementById('s11v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s11v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s11v-hint');   // hidden-until-first-wrong policy (opposite of S1-S9)
}

function s11vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('006', 'q1');
  document.getElementById('s11v-hint-overlay')?.classList.remove('hidden');
}
function s11vCloseHint() { document.getElementById('s11v-hint-overlay')?.classList.add('hidden'); }
function s11vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s11vCloseHint(); }

function s11vShowPopup(type, view) {
  const popup = document.getElementById('s11v-popup');
  if (!popup) return;
  const base = S11V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  const titleEl = document.getElementById('s11v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s11v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S11V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s11v-popup', cfg.action, s11vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ═══════════════════════════════════════════════════════════
   NEW TEMPLATE — HookOpenQuestion (Screen 13 · S12, new slide 65).
   See the CSS block for the full source/Figma-node trail. No
   correctness model at all — the only state is "is there enough
   text yet", recomputed live from the textarea's own current value,
   never stored/reset separately. Continue's onclick is the plain
   generic advanceScreen() (see index.html) — this screen has no
   check/submit step of its own to route through first. */
const S12OQ_MIN_CHARS = 2;

function s12oqInputChange() {
  const inp = document.getElementById('s12oq-input');
  const btn = document.getElementById('s12-continue');
  if (!inp || !btn) return;
  btn.disabled = inp.value.trim().length < S12OQ_MIN_CHARS;
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion (Screen 14 · S13, new slide 66)
   Variant A, single value. Item methodica-math-percent-02-03-007,
   sub-part א — a new item, continuing the "תרגול סטנדרטי" set S11/S12
   started (hint hidden-until-first-wrong, per notesSlide61.xml).
   Correct = 1400 (70% of 2000). Shares the generic-helper pattern
   already established across S1/S3/S4/S5/S7/S9 (frac, S1V_CHECK_SVG/
   S1V_WRONG_SVG, resetPopupPosition, clampPopup, renderPopupAction,
   popupPointerDown, setNavLabel, hideHintButton/showHintButton) rather
   than cloning them.
   ═══════════════════════════════════════════════════════════ */
const S13V = { correct: 1400, maxAttempts: 2 };

let s13vAttempts = 0, s13vAnswered = false, s13vDone = false;
let s13vLastWrongValue = null, s13vAnswer = null, s13vView = 'solution';

/* From media/image99.png (correct) / image101.png (wrong) — the intro
   line "נרשום את משוואת הפרופורציה לאחר צמצום האחוזים" and the 70/100=
   x/2000 equation itself are baked into the mockup image only (OMML,
   invisible to the <a:t> run dump — same gotcha S9 already hit), while
   the surrounding prose IS present as real text.
   Proportion table restored (producer correction, 2026-08-20). An
   earlier pass dropped slide66's two "טבלה" shapes as unused because
   they sit at negative x. That reading was wrong: the slide's BOTH
   feedback panels are themselves staged off-canvas (green at x=-312,
   pink at x=-629), and one table sits on each of them (x=-236 and
   x=-540) — so the tables are panel content, not scratch. The mockup
   images corroborate rather than contradict this: image99 has a large
   blank band between "נפתור באמצעות טבלת הפרופורציה:" and the equation,
   at exactly the table's own y (360) — the table is a separate overlaid
   frame that the mockup export left out, which is why the gap is there.
   Hence the table goes right after that opening line, as the line's own
   wording ("נפתור באמצעות טבלת הפרופורציה") already announced.
   Cells are slide66's own — "x" for the unknown and "2000" uncommaed.
   Column order per the project rule: quantity first in DOM (physical
   RIGHT), אחוז last (physical LEFT), matching the rendered panels. */
const S13V_EXPLAIN =
  '<p>نحلّ بواسطة جدول التناسب‎:</p>' +
  '<table class="eq-table"><tr><th>عدد الطلاب</th><th>النسبة المئوية</th></tr>' +
  '<tr><td>x</td><td>70%</td></tr><tr><td>2000</td><td>100%</td></tr></table>' +
  '<p>نكتب معادلة التناسب بعد اختزال النسب المئوية</p>' +
  '<div class="eq-row">' + frac(70, 100) + '<span>=</span>' + frac('x', 2000) + '</div>' +
  /* "x=1400" is isolated like every other "x = N" result line in this
     project (S2/S3/S4 above): the x must stay on the LEFT of the "=",
     as the script writes it. Bare in RTL prose the run relies on the
     leading "x" being the only strong-L anchor — see
     LESSONS-bidi-mixed-maths-2026-08-27.md; do not unwrap it. */
  '<p>نضرب بالمقام المشترك ونحصل على: <span dir="ltr" style="unicode-bidi:isolate">x=1400</span></p>' +
  '<p>لذلك، 1,400 شاب يتصفحون الهاتف لمدة نصف ساعة على الأقل بعد إطفاء الأنوار‎.</p>';

const S13V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S13V_EXPLAIN
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم. لا بأس، نتعلّم من الأخطاء أيضًا!<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s13vInputChange() {
  if (s13vAnswered) return;
  const inp = document.getElementById('s13v-input');
  const ico = document.getElementById('s13v-input-ico');
  document.getElementById('s13v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s13v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  const chk = document.getElementById('s13v-check');
  if (chk) chk.disabled = (v === '') || (v === s13vLastWrongValue);
}

function s13vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S13V.correct;
}

function s13vCheck() {
  if (s13vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s13v-input');
  const ico = document.getElementById('s13v-input-ico');
  if (!inp || inp.value.trim() === '') return;
  s13vAttempts++;
  const field = document.getElementById('s13v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s13vOk = s13vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('007', 'q1', s13vOk,
    s13vOk || s13vAttempts >= S13V.maxAttempts,
    inp.value.trim());

  if (s13vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s13vFinish();
    s13vShowPopup('correct');
  } else if (s13vAttempts >= S13V.maxAttempts) {
    s13vAnswer = inp.value.trim();
    s13vView = 'solution';
    s13vFinish();
    s13vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s13vLastWrongValue = inp.value.trim();
    document.getElementById('s13v-check').disabled = true;
    showHintButton('s13v-hint');   // hidden-until-first-wrong policy
    s13vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

function s13vApplyView() {
  if (s13vAnswer === null) return;
  const inp = document.getElementById('s13v-input');
  const ico = document.getElementById('s13v-input-ico');
  const field = document.getElementById('s13v-field');
  if (inp) {
    inp.value = (s13vView === 'answer') ? s13vAnswer : String(S13V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s13vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s13vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s13vShowPopup('wrong2', s13vView);
}
function s13vToggleView() {
  if (s13vAnswer === null) return;
  s13vView = (s13vView === 'solution') ? 'answer' : 'solution';
  s13vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s13vFinishDom() {
  const inp = document.getElementById('s13v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s13v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s13v-hint');
  syncStandardProgressNav(document.getElementById('s13'));
}

function s13vFinish() {
  s13vAnswered = true; s13vDone = true;
  s13vFinishDom();
}

function s13vResetInitial() {
  s13vAttempts = 0; s13vAnswered = false; s13vLastWrongValue = null;
  s13vAnswer = null; s13vView = 'solution';
  const inp = document.getElementById('s13v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s13v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s13v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s13v-popup')?.classList.add('hidden');
  document.getElementById('s13v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s13v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s13v-hint');   // hidden-until-first-wrong policy (opposite of S1-S9)
}

function s13vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('007', 'q1');
  document.getElementById('s13v-hint-overlay')?.classList.remove('hidden');
}
function s13vCloseHint() { document.getElementById('s13v-hint-overlay')?.classList.add('hidden'); }
function s13vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s13vCloseHint(); }

function s13vShowPopup(type, view) {
  const popup = document.getElementById('s13v-popup');
  if (!popup) return;
  const base = S13V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  const titleEl = document.getElementById('s13v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s13v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S13V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s13v-popup', cfg.action, s13vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion (Screen 15 · S14, new slide 67)
   Variant A, single value. Item methodica-math-percent-02-03-007,
   sub-part ב (S13 was sub-part א of this same item). Hint hidden
   until first wrong attempt (notesSlide62.xml, same "תרגול סטנדרטי"
   policy as S11-S13). Correct = 1050 (75% of 1400).
   ═══════════════════════════════════════════════════════════ */
const S14V = { correct: 1050, maxAttempts: 2 };

let s14vAttempts = 0, s14vAnswered = false, s14vDone = false;
let s14vLastWrongValue = null, s14vAnswer = null, s14vView = 'solution';

/* From media/image103.png (correct) / image104.png (wrong). Equation
   shape differs from S13's own plain 70/100=x/2000: here the FIRST
   fraction's numerator is itself a two-token product ("75% · 1,400"),
   confirmed by reading the rendered mockup (this line is entirely
   OMML/image-only, invisible to the <a:t> dump — same gotcha every
   ValueInputQuestion explanation in this project has hit). frac()'s
   num/den params are plain HTML strings, so a compound numerator is
   just passed straight through — no new helper needed.
   Proportion table restored (producer correction, 2026-08-20, from the
   script's own rendered feedback panels): an earlier pass read this
   slide's two-column "טבלה" shapes as off-canvas and dropped them, but
   both feedback panels do carry the table, between the opening line and
   the equation. Cells are the slide's own — "?" for the unknown (not
   the "x" S3/S4 use) and the header's singular "אחוז". Column order
   follows the project rule: quantity first in DOM (physical RIGHT),
   אחוז last (physical LEFT). Both panels share this one body via
   S14V_POPUP's body:null, so the table lands in the correct AND the
   wrong-answer feedback at once. */
const S14V_EXPLAIN =
  '<p>نحل بطريقة التناسب، حيث إنّ الصحيح لدينا هو 1,400 – الشبيبة الذين يواصلون التصفح بعد إطفاء الأنوار‎.</p>' +
  '<table class="eq-table"><tr><th>عدد الطلاب</th><th>النسبة المئوية</th></tr>' +
  '<tr><td>x</td><td>75%</td></tr><tr><td>1400</td><td>100%</td></tr></table>' +
  '<div class="eq-row">' + frac('75% &middot; 1,400', '100%') + '<span>=</span>' + frac('105,000', '100%') + '<span>=</span><span>1,050</span></div>' +
  '<p>1,050 شابًا ممّن يواصلون التصفح بعد إطفاء الأنوار يعانون من التعب المزمن وصعوبات التركيز‎.</p>';

const S14V_POPUP = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S14V_EXPLAIN
  wrong2:  { bg: '#ffdbdc', title: 'هذا خطأ، كل خطأ يقوّي قدراتكم‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

function s14vInputChange() {
  if (s14vAnswered) return;
  const inp = document.getElementById('s14v-input');
  const ico = document.getElementById('s14v-input-ico');
  document.getElementById('s14v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s14v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  const chk = document.getElementById('s14v-check');
  if (chk) chk.disabled = (v === '') || (v === s14vLastWrongValue);
}

function s14vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S14V.correct;
}

function s14vCheck() {
  if (s14vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s14v-input');
  const ico = document.getElementById('s14v-input-ico');
  if (!inp || inp.value.trim() === '') return;
  s14vAttempts++;
  const field = document.getElementById('s14v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s14vOk = s14vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Read from the live input HERE:
     the final-wrong branch reveals the solution into it (see its own
     "capture BEFORE the reveal" comment). */
  xapiAnswered('007', 'q2', s14vOk,
    s14vOk || s14vAttempts >= S14V.maxAttempts,
    inp.value.trim());

  if (s14vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = S1V_CHECK_SVG;
    s14vFinish();
    s14vShowPopup('correct');
  } else if (s14vAttempts >= S14V.maxAttempts) {
    s14vAnswer = inp.value.trim();
    s14vView = 'solution';
    s14vFinish();
    s14vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = S1V_WRONG_SVG;
    s14vLastWrongValue = inp.value.trim();
    document.getElementById('s14v-check').disabled = true;
    showHintButton('s14v-hint');   // hidden-until-first-wrong policy
    s14vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

function s14vApplyView() {
  if (s14vAnswer === null) return;
  const inp = document.getElementById('s14v-input');
  const ico = document.getElementById('s14v-input-ico');
  const field = document.getElementById('s14v-field');
  if (inp) {
    inp.value = (s14vView === 'answer') ? s14vAnswer : String(S14V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s14vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s14vView === 'answer') ? S1V_WRONG_SVG : S1V_CHECK_SVG;
  }
  s14vShowPopup('wrong2', s14vView);
}
function s14vToggleView() {
  if (s14vAnswer === null) return;
  s14vView = (s14vView === 'solution') ? 'answer' : 'solution';
  s14vApplyView();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s14vFinishDom() {
  const inp = document.getElementById('s14v-input');
  if (inp) inp.disabled = true;
  const chk = document.getElementById('s14v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s14v-hint');
  syncStandardProgressNav(document.getElementById('s14'));
}

function s14vFinish() {
  s14vAnswered = true; s14vDone = true;
  s14vFinishDom();
}

function s14vResetInitial() {
  s14vAttempts = 0; s14vAnswered = false; s14vLastWrongValue = null;
  s14vAnswer = null; s14vView = 'solution';
  const inp = document.getElementById('s14v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s14v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s14v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s14v-popup')?.classList.add('hidden');
  document.getElementById('s14v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s14v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s14v-hint');   // hidden-until-first-wrong policy
}

function s14vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('007', 'q2');
  document.getElementById('s14v-hint-overlay')?.classList.remove('hidden');
}
function s14vCloseHint() { document.getElementById('s14v-hint-overlay')?.classList.add('hidden'); }
function s14vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s14vCloseHint(); }

function s14vShowPopup(type, view) {
  const popup = document.getElementById('s14v-popup');
  if (!popup) return;
  const base = S14V_POPUP[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  const titleEl = document.getElementById('s14v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s14v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S14V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s14v-popup', cfg.action, s14vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
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
  window.Motion?.reveal(document.querySelector('.screen.active')); // initial screen's own reveal, held until window load
  PartNav.init({
    part: '03',
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
   reading this part's screen text against metadata/methodica-math-percent-02-03.json
   and cross-checking which screens own a *Check function. Each screen carries
   the matched item's title so the derivation stays auditable without redoing
   it. Every suffix comes from metadata/ - never from a code comment and never
   from a remembered slide number (see 4.2, and 6.2 trap 2: prose in this
   family numbers screens 1-based, these keys are 0-based).

   Note on item 006: metadata declares two questions but only s11 has a
   *Check - s12 ('המליצו לעדי...') is an open reflection with nothing to
   grade. The ITEM still belongs in XAPI_EVAL_ITEMS because s11 is
   code-graded; only the per-question answered call is absent for q2.
*/
var SCREEN_TO_SUBCONTENT = {
  0:  null,          /* מעבר - "אין כמו תרגול... וכבר בהתחלה יש רמז!" */
  1:  ['001', 1],    /* חישוב אחוז משתי כמויות - א. 20% מתוך 65 */
  2:  ['001', 2],    /* אותו פריט - ב. 20% מתוך 130 */
  3:  ['002', 1],    /* צפיות ברשתות חברתיות בשעשועון */
  4:  ['003', 1],    /* סידן בכוס חלב */
  5:  ['004', 1],    /* מיחזור אריזות קרטון */
  6:  ['005', 1],    /* התנדבות שכבתית - סעיף א (4 סעיפים = 4 מסכים) */
  7:  ['005', 2],    /* אותו פריט - סעיף ב */
  8:  ['005', 3],    /* אותו פריט - סעיף ג */
  9:  ['005', 4],    /* אותו פריט - סעיף ד */
  10: null,          /* מעבר - "נחזור ל-2 תרגילים ברמת קושי גבוהה יותר" */
  11: ['006', 1],    /* מעקב ארוחות בוקר עתירות חלבון - סעיף א (s11vCheck) */
  12: ['006', 2],    /* אותו פריט - סעיף ב, שאלה פתוחה ללא *Check */
  13: ['007', 1],    /* שימוש בטלפון לפני השינה - סעיף א */
  14: ['007', 2]     /* אותו פריט - סעיף ב */
};

/* Exactly TOTAL_SCREENS keys (15), 0..14, no gaps. A MISSING key is
   indistinguishable at runtime from null - the screen silently stops
   reporting. _test/verify-shared.js enforces the count, the contiguity and
   two-way coverage against metadata/ (6.2 traps 1 and 3). */

var XAPI_COMP_SLUG = 'methodica-math-percent-02-03';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* MUST end '/' - 6.1 */
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1, '005': 1, '006': 1, '007': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-02-03.json';


/* ═══════════════ resume — the four per-part hooks (§8.7) ═══════════════
   Here because every learner state variable in this file is declared `let` at
   top level: the global LEXICAL environment, not reachable through window.

   ⚠️ This part's glyphs are S1V_CHECK_SVG / S1V_WRONG_SVG, not the
   CHECK_SVG / WRONG_SVG every other part uses, and its single-choice result
   variable is sNscResult, not sNscLastResult. Neither needed a painter change,
   which is the payoff for taking every dependency as a parameter (§8.8 rule 7). */

function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    s1v: { attempts: s1vAttempts, answered: s1vAnswered, done: s1vDone,
           lastWrong: s1vLastWrongValue, answer: s1vAnswer, view: s1vView,
           input: (document.getElementById('s1v-input') || {}).value || '' },
    s3v: { attempts: s3vAttempts, answered: s3vAnswered, done: s3vDone,
           lastWrong: s3vLastWrongValue, answer: s3vAnswer, view: s3vView,
           input: (document.getElementById('s3v-input') || {}).value || '' },
    s4v: { attempts: s4vAttempts, answered: s4vAnswered, done: s4vDone,
           lastWrong: s4vLastWrongValue, answer: s4vAnswer, view: s4vView,
           input: (document.getElementById('s4v-input') || {}).value || '' },
    s5v: { attempts: s5vAttempts, answered: s5vAnswered, done: s5vDone,
           lastWrong: s5vLastWrongValue, answer: s5vAnswer, view: s5vView,
           input: (document.getElementById('s5v-input') || {}).value || '' },
    s7v: { attempts: s7vAttempts, answered: s7vAnswered, done: s7vDone,
           lastWrong: s7vLastWrongValue, answer: s7vAnswer, view: s7vView,
           input: (document.getElementById('s7v-input') || {}).value || '' },
    s9v: { attempts: s9vAttempts, answered: s9vAnswered, done: s9vDone,
           lastWrong: s9vLastWrongValue, answer: s9vAnswer, view: s9vView,
           input: (document.getElementById('s9v-input') || {}).value || '' },
    s13v: { attempts: s13vAttempts, answered: s13vAnswered, done: s13vDone,
           lastWrong: s13vLastWrongValue, answer: s13vAnswer, view: s13vView,
           input: (document.getElementById('s13v-input') || {}).value || '' },
    s14v: { attempts: s14vAttempts, answered: s14vAnswered, done: s14vDone,
           lastWrong: s14vLastWrongValue, answer: s14vAnswer, view: s14vView,
           input: (document.getElementById('s14v-input') || {}).value || '' },
    s2sc: { selected: s2scSelected, attempts: s2scAttempts, answered: s2scAnswered,
            done: s2scDone, lastWrong: s2scLastWrong, result: s2scResult },
    s6sc: { selected: s6scSelected, attempts: s6scAttempts, answered: s6scAnswered,
            done: s6scDone, lastWrong: s6scLastWrong, result: s6scResult },
    s8sc: { selected: s8scSelected, attempts: s8scAttempts, answered: s8scAnswered,
            done: s8scDone, lastWrong: s8scLastWrong, result: s8scResult },
    s11v: {
      attempts:  s11vAttempts,
      answered:  s11vAnswered,
      done:      s11vDone,
      lastWrong: s11vLastWrongSnapshot,
      /* an ARRAY, not a map - S11V.rows order. §8.10's "the learner's own
         answer": without it a restored solution view is promoted to what they
         answered. */
      answer:    s11vAnswerSnapshot,
      view:      s11vView,
      inputs:    s11vSnapshot()
    },
    s12oq: {
      /* No state variable exists for this screen - it is a HookOpenQuestion
         with no correctness model. The text is the entire state, and it lives
         only in the DOM (§8.9). */
      text: (document.getElementById('s12oq-input') || {}).value || ''
    }
  };
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.s1v) {
    s1vAttempts = st.s1v.attempts || 0;   s1vAnswered = !!st.s1v.answered;
    s1vDone = !!st.s1v.done;              s1vLastWrongValue = st.s1v.lastWrong;
    s1vAnswer = (st.s1v.answer === undefined) ? null : st.s1v.answer;
    s1vView = st.s1v.view || 'solution';
  }
  if (st.s3v) {
    s3vAttempts = st.s3v.attempts || 0;   s3vAnswered = !!st.s3v.answered;
    s3vDone = !!st.s3v.done;              s3vLastWrongValue = st.s3v.lastWrong;
    s3vAnswer = (st.s3v.answer === undefined) ? null : st.s3v.answer;
    s3vView = st.s3v.view || 'solution';
  }
  if (st.s4v) {
    s4vAttempts = st.s4v.attempts || 0;   s4vAnswered = !!st.s4v.answered;
    s4vDone = !!st.s4v.done;              s4vLastWrongValue = st.s4v.lastWrong;
    s4vAnswer = (st.s4v.answer === undefined) ? null : st.s4v.answer;
    s4vView = st.s4v.view || 'solution';
  }
  if (st.s5v) {
    s5vAttempts = st.s5v.attempts || 0;   s5vAnswered = !!st.s5v.answered;
    s5vDone = !!st.s5v.done;              s5vLastWrongValue = st.s5v.lastWrong;
    s5vAnswer = (st.s5v.answer === undefined) ? null : st.s5v.answer;
    s5vView = st.s5v.view || 'solution';
  }
  if (st.s7v) {
    s7vAttempts = st.s7v.attempts || 0;   s7vAnswered = !!st.s7v.answered;
    s7vDone = !!st.s7v.done;              s7vLastWrongValue = st.s7v.lastWrong;
    s7vAnswer = (st.s7v.answer === undefined) ? null : st.s7v.answer;
    s7vView = st.s7v.view || 'solution';
  }
  if (st.s9v) {
    s9vAttempts = st.s9v.attempts || 0;   s9vAnswered = !!st.s9v.answered;
    s9vDone = !!st.s9v.done;              s9vLastWrongValue = st.s9v.lastWrong;
    s9vAnswer = (st.s9v.answer === undefined) ? null : st.s9v.answer;
    s9vView = st.s9v.view || 'solution';
  }
  if (st.s13v) {
    s13vAttempts = st.s13v.attempts || 0;   s13vAnswered = !!st.s13v.answered;
    s13vDone = !!st.s13v.done;              s13vLastWrongValue = st.s13v.lastWrong;
    s13vAnswer = (st.s13v.answer === undefined) ? null : st.s13v.answer;
    s13vView = st.s13v.view || 'solution';
  }
  if (st.s14v) {
    s14vAttempts = st.s14v.attempts || 0;   s14vAnswered = !!st.s14v.answered;
    s14vDone = !!st.s14v.done;              s14vLastWrongValue = st.s14v.lastWrong;
    s14vAnswer = (st.s14v.answer === undefined) ? null : st.s14v.answer;
    s14vView = st.s14v.view || 'solution';
  }
  if (st.s2sc) {
    s2scSelected = st.s2sc.selected;   s2scAttempts = st.s2sc.attempts || 0;
    s2scAnswered = !!st.s2sc.answered; s2scDone = !!st.s2sc.done;
    s2scLastWrong = st.s2sc.lastWrong; s2scResult = st.s2sc.result;
  }
  if (st.s6sc) {
    s6scSelected = st.s6sc.selected;   s6scAttempts = st.s6sc.attempts || 0;
    s6scAnswered = !!st.s6sc.answered; s6scDone = !!st.s6sc.done;
    s6scLastWrong = st.s6sc.lastWrong; s6scResult = st.s6sc.result;
  }
  if (st.s8sc) {
    s8scSelected = st.s8sc.selected;   s8scAttempts = st.s8sc.attempts || 0;
    s8scAnswered = !!st.s8sc.answered; s8scDone = !!st.s8sc.done;
    s8scLastWrong = st.s8sc.lastWrong; s8scResult = st.s8sc.result;
  }
  if (st.s11v) {
    s11vAttempts          = st.s11v.attempts || 0;
    s11vAnswered          = !!st.s11v.answered;
    s11vDone              = !!st.s11v.done;
    s11vLastWrongSnapshot = st.s11v.lastWrong;
    s11vAnswerSnapshot    = (st.s11v.answer === undefined) ? null : st.s11v.answer;
    s11vView              = st.s11v.view || 'solution';
  }
}

function applyResumeDom(st) {
  if (!st) return;
  /* Guarded per block, not once at the top (§8.9): a payload carrying one
     screen's DOM state but not another's must not skip the rest. */
  if (st.s1v && typeof st.s1v.input === 'string') {
    var e1 = document.getElementById('s1v-input');
    if (e1) e1.value = st.s1v.input;
  }
  if (st.s3v && typeof st.s3v.input === 'string') {
    var e3 = document.getElementById('s3v-input');
    if (e3) e3.value = st.s3v.input;
  }
  if (st.s4v && typeof st.s4v.input === 'string') {
    var e4 = document.getElementById('s4v-input');
    if (e4) e4.value = st.s4v.input;
  }
  if (st.s5v && typeof st.s5v.input === 'string') {
    var e5 = document.getElementById('s5v-input');
    if (e5) e5.value = st.s5v.input;
  }
  if (st.s7v && typeof st.s7v.input === 'string') {
    var e7 = document.getElementById('s7v-input');
    if (e7) e7.value = st.s7v.input;
  }
  if (st.s9v && typeof st.s9v.input === 'string') {
    var e9 = document.getElementById('s9v-input');
    if (e9) e9.value = st.s9v.input;
  }
  if (st.s13v && typeof st.s13v.input === 'string') {
    var e13 = document.getElementById('s13v-input');
    if (e13) e13.value = st.s13v.input;
  }
  if (st.s14v && typeof st.s14v.input === 'string') {
    var e14 = document.getElementById('s14v-input');
    if (e14) e14.value = st.s14v.input;
  }
  if (st.s11v && Array.isArray(st.s11v.inputs)) {
    S11V.rows.forEach(function (r, i) {
      var el = s11vInputEl(r.key);
      if (el && typeof st.s11v.inputs[i] === 'string') el.value = st.s11v.inputs[i];
    });
  }
  if (st.s12oq && typeof st.s12oq.text === 'string') {
    var e12 = document.getElementById('s12oq-input');
    if (e12) e12.value = st.s12oq.text;
  }
}

function restoreScreenUI(n) {
  /* ⚠️ NEVER delegate to resetScreenState(n) and never reach a
     sNResetInitial(): this runs on EVERY navigation (§8.4a), and reset's
     not-answered branch clears the inputs and selections - it would wipe a
     half-finished answer on every screen change (§8.8 rule 5, risk 1). */
  if (n === 1) {
    paintSingleValue({
      done: s1vDone, attempts: s1vAttempts, answer: s1vAnswer,
      input: function () { return document.getElementById('s1v-input'); },
      field: function () { return document.getElementById('s1v-field'); },
      ico:   function () { return document.getElementById('s1v-input-ico'); },
      applyView: s1vApplyView, showPopup: s1vShowPopup, finishDom: s1vFinishDom,
      showHint: function () { showHintButton('s1v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 3) {
    paintSingleValue({
      done: s3vDone, attempts: s3vAttempts, answer: s3vAnswer,
      input: function () { return document.getElementById('s3v-input'); },
      field: function () { return document.getElementById('s3v-field'); },
      ico:   function () { return document.getElementById('s3v-input-ico'); },
      applyView: s3vApplyView, showPopup: s3vShowPopup, finishDom: s3vFinishDom,
      showHint: function () { showHintButton('s3v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 4) {
    paintSingleValue({
      done: s4vDone, attempts: s4vAttempts, answer: s4vAnswer,
      input: function () { return document.getElementById('s4v-input'); },
      field: function () { return document.getElementById('s4v-field'); },
      ico:   function () { return document.getElementById('s4v-input-ico'); },
      applyView: s4vApplyView, showPopup: s4vShowPopup, finishDom: s4vFinishDom,
      showHint: function () { showHintButton('s4v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 5) {
    paintSingleValue({
      done: s5vDone, attempts: s5vAttempts, answer: s5vAnswer,
      input: function () { return document.getElementById('s5v-input'); },
      field: function () { return document.getElementById('s5v-field'); },
      ico:   function () { return document.getElementById('s5v-input-ico'); },
      applyView: s5vApplyView, showPopup: s5vShowPopup, finishDom: s5vFinishDom,
      showHint: function () { showHintButton('s5v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 7) {
    paintSingleValue({
      done: s7vDone, attempts: s7vAttempts, answer: s7vAnswer,
      input: function () { return document.getElementById('s7v-input'); },
      field: function () { return document.getElementById('s7v-field'); },
      ico:   function () { return document.getElementById('s7v-input-ico'); },
      applyView: s7vApplyView, showPopup: s7vShowPopup, finishDom: s7vFinishDom,
      showHint: function () { showHintButton('s7v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 9) {
    paintSingleValue({
      done: s9vDone, attempts: s9vAttempts, answer: s9vAnswer,
      input: function () { return document.getElementById('s9v-input'); },
      field: function () { return document.getElementById('s9v-field'); },
      ico:   function () { return document.getElementById('s9v-input-ico'); },
      applyView: s9vApplyView, showPopup: s9vShowPopup, finishDom: s9vFinishDom,
      showHint: function () { showHintButton('s9v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 13) {
    paintSingleValue({
      done: s13vDone, attempts: s13vAttempts, answer: s13vAnswer,
      input: function () { return document.getElementById('s13v-input'); },
      field: function () { return document.getElementById('s13v-field'); },
      ico:   function () { return document.getElementById('s13v-input-ico'); },
      applyView: s13vApplyView, showPopup: s13vShowPopup, finishDom: s13vFinishDom,
      showHint: function () { showHintButton('s13v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 14) {
    paintSingleValue({
      done: s14vDone, attempts: s14vAttempts, answer: s14vAnswer,
      input: function () { return document.getElementById('s14v-input'); },
      field: function () { return document.getElementById('s14v-field'); },
      ico:   function () { return document.getElementById('s14v-input-ico'); },
      applyView: s14vApplyView, showPopup: s14vShowPopup, finishDom: s14vFinishDom,
      showHint: function () { showHintButton('s14v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG
    });
  }
  if (n === 2) {
    paintSingleChoice({
      done: s2scDone, attempts: s2scAttempts, selected: s2scSelected,
      lastWrong: s2scLastWrong, lastResult: s2scResult,
      correctId: S2SC.correctId,
      mark: s2scMark, showPopup: s2scShowPopup, finishDom: s2scFinishDom,
      showHint: function () { showHintButton('s2sc-hint'); }
    });
  }
  if (n === 6) {
    paintSingleChoice({
      done: s6scDone, attempts: s6scAttempts, selected: s6scSelected,
      lastWrong: s6scLastWrong, lastResult: s6scResult,
      correctId: S6SC.correctId,
      mark: s6scMark, showPopup: s6scShowPopup, finishDom: s6scFinishDom,
      showHint: function () { showHintButton('s6sc-hint'); }
    });
  }
  if (n === 8) {
    paintSingleChoice({
      done: s8scDone, attempts: s8scAttempts, selected: s8scSelected,
      lastWrong: s8scLastWrong, lastResult: s8scResult,
      correctId: S8SC.correctId,
      mark: s8scMark, showPopup: s8scShowPopup, finishDom: s8scFinishDom,
      showHint: function () { showHintButton('s8sc-hint'); }
    });
  }
  if (n === 11) {
    /* The row table, through the field-group painter. The adapters bridge two
       shapes: this screen addresses its cells with element-id helpers rather
       than map getters, and its `answer` is an ARRAY in S11V.rows order.
       paintValueFields only tests whether `answer` is null before delegating to
       s11vApplyView(), which understands its own array - so the array never has
       to become a map. */
    var s11Keys = S11V.rows.map(function (r) { return r.key; });
    paintValueFields({
      done: s11vDone, attempts: s11vAttempts, answered: s11vAnswered,
      lastWrong: s11vLastWrongSnapshot, answer: s11vAnswerSnapshot,
      keys: s11Keys,
      inputs: function () {
        var o = {}; S11V.rows.forEach(function (r) { o[r.key] = s11vInputEl(r.key); }); return o;
      },
      fields: function () {
        var o = {}; S11V.rows.forEach(function (r) { o[r.key] = s11vFieldEl(r.key); }); return o;
      },
      icos: function () {
        var o = {}; S11V.rows.forEach(function (r) { o[r.key] = s11vIcoEl(r.key); }); return o;
      },
      fieldStates: function (vals) {
        var o = {};
        S11V.rows.forEach(function (r) { o[r.key] = Number(vals[r.key]) === r.correct; });
        return o;
      },
      applyView: s11vApplyView, showPopup: s11vShowPopup, finishDom: s11vFinishDom,
      showHint: function () { showHintButton('s11v-hint'); },
      okGlyph: S1V_CHECK_SVG, wrongGlyph: S1V_WRONG_SVG,
      checkButton: undefined
    });
  }
  if (n === 12) {
    /* No marks, no popup, nothing to lock - and nothing to guard against,
       because there is no answered state to be inconsistent with. The one thing
       a restore owes this screen is rule 2: recompute the continue button from
       the live predicate, or the learner returns to a full textarea and a dead
       button. s12oqInputChange() is that predicate, and it touches only the
       button. */
    try { s12oqInputChange(); } catch (e) {}
  }
}
