'use strict';

/* ═══════════════════════════════════════════════════════════
   js/main.js — methodica-math-percent-02-06 (part 06)

   Engine (scaleApp / goTo / resetScreenState / keyboard nav / dev
   bridge) carried over from parts 01-05 so every part behaves
   identically. Screen roster:
     S0 — TransitionScreen kickoff into the "שאלת שיא" (climax
          question — 4 sub-parts, need 3+ correct), slide79
     S1 — Scenario/context intro (image + text, no input), "משפחת
          כהן יצאה לחופשה..." (slide80), item -001 (shared with S0 —
          this slide isn't its own lettered sub-part)
     S2 — ValueInputQuestion, percent-distribution TABLE fill-in
          (slide81), item -001 sub-part א. 4 holistically-validated
          inputs (לינה/ארוחות/ספא ומתקנים/חנייה), maxAttempts:2, View
          My Answer Toggle on final wrong. Source total-cost error
          (2,500 instead of 5,000) corrected throughout, then the whole
          scenario halved BACK to a 2,500 basis on 2026-08-16 for an
          unrelated content reason — see the header comment on #s2 in
          index.html for both.
     S3 — SingleChoiceQuestion, "פי כמה גדול הסכום ששולם עבור הלינה..."
          (slide82), item -001 sub-part ב. Reuses the SAME cost table
          as S2 (now all given values, no inputs) as a reference.
          4 options, correctId 'c' (פי 6). No hint (explicit producer
          note on this slide). Does NOT use the View My Answer Toggle
          — correct+wrong options marked simultaneously on final wrong,
          per SingleChoiceQuestion's own contract.
          **Option DOM/visual order note:** the PPTX's own <a:t> text-
          run dump order for this slide's 4 options ("פי 4, פי 6" then
          later "פי 8, פי 2") does NOT match their real top-to-bottom
          y-position — verified directly from each option's own xfrm
          offset rather than trusted from dump order. Real order,
          confirmed by y-coordinate: פי 2, פי 4, פי 6, פי 8.
     S4 — SingleChoiceQuestion, "ניר טענה כי הסכום ששולם עבור הארוחות
          והחנייה..." (slide83), item -001 sub-part ג. Same reference
          table as S2/S3. 4 options, all OMML (extracted from the
          deck's own rendered Fallback images, not the raw text dump).
          correctId 'c' — also confirmed independently by that option's
          own radio-circle shape being pre-filled green in the source
          XML. No hint (explicit producer note, same as S3). Does not
          use the View My Answer Toggle.
     S5 — SingleChoiceQuestion, "קובי, הבן הבכור של משפחת כהן..."
          (slide84), item -001 sub-part ד (closes out the item's 4
          sub-parts). No table/image on this slide — text-col only.
          Only 3 options (not 4) — confirmed by counting each option's
          own row container, not assumed. correctId 'a' (topmost this
          time) — Kobi is actually RIGHT here, unlike Nir in S3. No
          hint. Does not use the View My Answer Toggle.
   Slide numbers are the deck's own displayed numbers and map 1:1 to
   ppt/slides/slideN.xml (verified this session against
   presentation.xml's sldIdLst).
   Bump TOTAL_SCREENS as more screens are added.

   Past S5, `advanceScreen()` redirects to part 07 (the "מועד ב"
   remedial climax question) if the learner scored below 3-of-4 correct
   — see `climaxPassed()` below, added 2026-08-12 per producer decision.
   ═══════════════════════════════════════════════════════════ */

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 6;  // S0-S5

/* ─── Companion character ───────────────────────────────────
   Part 01 WRITES the learner's choice to this namespaced key; every
   later part READS it back — key string must stay byte-identical
   (720-templates → _global-components.md → Companion character system
   → "Cross-part persistence"). */
const CHARACTER_STORAGE_KEY = 'methodica_math_percent_02_selectedCharacter';
const DEFAULT_CHARACTER = 'character-1';

/* S0's character video — supplied 2026-08-11 (Character-{1,2}-
   Challenge.mp4, 1280x720, 6s, decorative — no sound, no player
   controls, see the video element's own attributes in index.html).
   `still` is the same defensive-only fallback pattern every other
   part uses — shown only if the video fails to load. */
const S0_CHARACTER = {
  'character-1': {
    video: 'assets/video/Character-1-Challenge.mp4',
    still: '../unit-assets/img/character-1-normal.png',
    alt:   'الشخصية على الكرسي المتحرك تتسلق جبلًا ثلجيًا، وتسحب حبلًا باتجاه علم أحمر في القمة'
  },
  'character-2': {
    video: 'assets/video/Character-2-Challenge.mp4',
    still: '../unit-assets/img/character-2-normal.png',
    alt:   'الشخصية الزهرية تتسلق جبلًا ثلجيًا باتجاه علم أحمر في القمة'
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
/* Screen-leave cleanup for this part (called from the shared goTo). */
function partScreenLeave(prev) {
  /* The image-zoom modal lives outside every .screen div, so a screen
     swap alone never closes it if it's open. */
  closeImageZoom();
}


/* Per-screen resume-state contract (same shape every other part uses):
   called on every goTo() AND once on initial page load below. S0
   re-resolves/re-mounts the companion character video on every entry
   (so a mid-lomda character change on re-entering part 01 is picked up
   here too). S1 has no dynamic state to restore. S2 follows the same
   resume-state contract as every other View-My-Answer-Toggle
   ValueInputQuestion in this series: resolved-correct reopens the
   "correct" popup, resolved-wrong reopens the toggle's current view,
   unresolved gets a fresh attempt. */
function resetScreenState(n) {
  if (n === 0) {
    s0ApplyCharacter();
    // Keep the first screen's cross-part Back button in sync with the
    // navigation trail — on initial load and on every return to S0 from
    // inside this part (js/partnav.js).
    PartNav.mountBack('s0-back');
  }
  if (n === 2) {
    if (!s2vDone) {
      s2vResetInitial();
    } else if (s2vAnswer !== null) {
      s2vApplyView();
    } else {
      s2vShowPopup('correct');
    }
  }
  if (n === 3) {
    // Per 720-templates → _global-components.md → Feedback popup
    // system → "Reopening feedback on return to a resolved screen":
    // Back onto a resolved SCQ screen must reopen its feedback popup
    // (goTo()'s generic sweep just hid it), alongside the option
    // marks already sitting in the DOM from the last check.
    if (!s3qDone) s3qResetInitial();
    else s3qShowPopup(s3qLastResult);
  }
  if (n === 4) {
    if (!s4qDone) s4qResetInitial();
    else s4qShowPopup(s4qLastResult);
  }
  if (n === 5) {
    if (!s5qDone) s5qResetInitial();
    else s5qShowPopup(s5qLastResult);
  }
}


/* Cross-part navigation trail (js/partnav.js). Must run AFTER the two
   lines above: if this page was entered via a Back from part 07, init()
   jumps straight to the screen the learner left from, and it does that
   through goTo() so the landed screen gets the normal
   cancel/activate/reveal/resetScreenState treatment instead of a second,
   conflicting initial reveal. */

/* Bounds-checked by goTo() — advancing past the last BUILT screen is a
   deliberate no-op until the next screen exists, same convention every
   other part followed before its own next screen was added (see
   [[project_math_percent02_state]]).

   Past the LAST screen (S5, this part's own climax question), the
   producer's own S0 promise ("יש בה 4 סעיפים. עליכם להצליח ב-3
   לפחות") has a real consequence, per producer decision 2026-08-12:
   a learner who scores below 3-of-4 correct on S2-S5 is redirected to
   part 07 — the "מועד ב" remedial twin of this same climax question
   (sibling-folder relative path, same pattern as part 05→06's own
   redirect). A learner who passes stays here (dead end, matching this
   part's own established "no summary screen was ever requested"
   precedent) — only failure has a consequence. */
/* The key this part's verdict is stored under in the state document's
   unit-level `results` map (§8.1). Unit-level and NOT a part payload: it is
   decided here and consumed by the routing, and captureUnitState() replaces a
   part's own slot on every save, so anything parked there is destroyed on the
   next screen change of a different part.
   ⚠️ Never rename it - a renamed key reads as "no verdict yet" for every
   learner already mid-unit, silently. */
const RESULT_KEY_CLIMAX = '06-climax';

/* Resolution, not correctness - see the note in part 02. S1 carries no
   question, so the four graded screens are S2-S5. */
function climaxResolved() {
  return s2vDone && s3qDone && s4qDone && s5qDone;
}

function climaxPassed() {
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
  if (!climaxResolved() && RESUME_ENABLED && typeof getUnitResult === 'function') {
    const stored = getUnitResult(RESULT_KEY_CLIMAX);
    if (stored) return stored === 'pass';
  }

  const results = [
    s2vDone && s2vAnswer === null,   // S2 solved correctly before exhausting attempts
    s3qLastResult === 'correct',
    s4qLastResult === 'correct',
    s5qLastResult === 'correct'
  ];
  return results.filter(Boolean).length >= 3;
}
function advanceScreen() {
  // Re-crossing forward after a cross-part Back — the climaxPassed()
  // results that decided this part's exit die with the page, so a
  // learner returning from part 07 re-crosses on the recorded
  // destination rather than on a re-run of the Decision Point. See
  // "RE-CROSSING FORWARD" in js/partnav.js.
  const returnForward = PartNav.forwardOverride();
  if (returnForward && currentScreen + 1 >= TOTAL_SCREENS) {
    PartNav.forward(returnForward);
    return;
  }
  if (currentScreen + 1 >= TOTAL_SCREENS) {
    /* xAPI: the component result is reported BEFORE the branch, so the
       failing path reports too - a component the learner failed must still
       be recorded, and routing that learner is the platform's job via
       recommendedAfterFail in the metadata (6.5).

       success is climaxPassed(), the real gate: 3 of the 4 sections the
       screen promised ("יש בה 4 סעיפים"), so the denominator is 4 (6.4).
       The SCORE is read back out of XAPI_Q_RESULTS rather than recomputed,
       so it cannot disagree with what the four answered calls reported.
       The two agree by construction - q1 is correct exactly when
       s2vAnswer stayed null, and q2-q4 exactly when sNqLastResult is
       "correct" - but the gate stays the source of truth for success.

       This is also TERMINAL A of the unit: passing the climax ends the
       lomda here. Reported where the result is decided rather than on a
       finish screen, so it is recorded even though no finish screen
       exists. The failing path does not report the unit - part 07 does,
       once its moed-B question resolves.

       Deliberately NOT reported on the returnForward path above: that is a
       re-crossing after a cross-part Back, where the results that decided
       this part died with the page, so climaxPassed() would be false and
       would report a failure that never happened. */
    const _passed06 = climaxPassed();
    /* Recorded on both edges: the failing one routes to part 07, whose own
       exit never re-evaluates this gate, so this is the only record of it. */
    if (climaxResolved() && typeof setUnitResult === 'function') {
      setUnitResult(RESULT_KEY_CLIMAX, _passed06 ? 'pass' : 'fail');
    }
    const _n06 = ['q1', 'q2', 'q3', 'q4']
      .filter(function (q) { return XAPI_Q_RESULTS['001/' + q]; }).length;
    /* Last click of the part: report and stop — the platform routes on the result
       (recommendedAfterFail → 07; 2026-09-16). The unit-level 'completed' that followed on the
       passing path is gone: object is item or component only (v2.5/v2.7). */
    xapiEndComponent({ success: _passed06, score: { scaled: _n06 / 4 } }, xapiActiveContinueButton());

    if (!_passed06) PartNav.forward('07');   // dev-only (DEV_NAV)
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

/* S1 — scenario/context intro, non-interactive (no input to
   validate) — same "המשך is the only way to proceed" contract as
   part 01's S4 InfoCardsImage. */
function advanceFromS1() { advanceScreen(); }
function goBackFromS1() { goTo(0); }


document.addEventListener('click', e => {
  const zoomBtn = e.target.closest('[data-zoom-src]');
  if (zoomBtn) { openImageZoom(zoomBtn); return; }
  if (e.target.closest('[data-zoom-close="true"]')) closeImageZoom();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeImageZoom();
});

/* ─── Feedback popup machinery (drag/clamp/reanchor/action-button) +
   canvas/bottom-bar dimensions, ported verbatim from part 05 — first
   needed in part 06 by S2's feedback popup.
   ─────────────────────────────────────────────────────────── */


const CHECK_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 12" fill="none" aria-hidden="true">' +
  '<path d="M4.52036 12C4.12296 12.0002 3.74183 11.8126 3.46106 11.4787L0.258452 7.67744C-0.0861507 7.26814 -0.0861507 6.60467 0.258452 6.19536C0.603165 5.78619 1.16194 5.78619 1.50666 6.19536L4.52036 9.77374L12.4933 0.306878C12.8381 -0.102293 13.3968 -0.102293 13.7415 0.306878C14.0862 0.716179 14.0862 1.37966 13.7415 1.78896L5.57966 11.4787C5.29889 11.8126 4.91776 12.0002 4.52036 12Z" fill="#609E12"/>' +
  '</svg>';
const WRONG_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
  '<path d="M13.6743 0.325691C13.4657 0.117151 13.1828 0 12.8879 0C12.5929 0 12.31 0.117151 12.1014 0.325691L7 5.42709L1.8986 0.325691C1.69 0.117151 1.40711 0 1.11215 0C0.817183 0 0.534294 0.117151 0.325691 0.325691C0.117151 0.534294 0 0.817183 0 1.11215C0 1.40711 0.117151 1.69 0.325691 1.8986L5.42709 7L0.325691 12.1014C0.117151 12.31 0 12.5929 0 12.8879C0 13.1828 0.117151 13.4657 0.325691 13.6743C0.534294 13.8829 0.817183 14 1.11215 14C1.40711 14 1.69 13.8829 1.8986 13.6743L7 8.57291L12.1014 13.6743C12.31 13.8829 12.5929 14 12.8879 14C13.1828 14 13.4657 13.8829 13.6743 13.6743C13.8829 13.4657 14 13.1828 14 12.8879C14 12.5929 13.8829 12.31 13.6743 12.1014L8.57291 7L13.6743 1.8986C13.8829 1.69 14 1.40711 14 1.11215C14 0.817183 13.8829 0.534294 13.6743 0.325691Z" fill="#B20010"/>' +
  '</svg>';


document.addEventListener('keydown', e => {
  if (hasOwnArrowKeyMeaning(e.target)) return;
  if (e.key === 'ArrowLeft')  advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* ═══════════════════════════════════════════════════════════
   S2 — percent-distribution table, slide81. See the header comment on
   #s2 in index.html for the full source-data-error correction
   rationale (2,500 → 5,000 throughout), and the later 2026-08-16
   reversal back to 2,500 (unrelated content reason, not an error).
   Explanation shows the SAME single example equation as the source's
   own rendered mockup (media/image730.png: "0.6 · 2,500 = 1,500") —
   now back to that exact original figure after the 08-16 halving.
   ═══════════════════════════════════════════════════════════ */
const S2V_EXPLAIN =
  '<p>انظروا إلى الإجابات الصحيحة‎.</p>' +
  '<p>في كل سطر، كان عليكم ضرب النسبة المئوية بصيغة عدد عشري بتكلفة العطلة الإجمالية، مثلًا‎:</p>' +
  '<div class="eq-row"><span>0.6</span><span>&middot;</span><span>2,500</span><span>=</span><span>1,500</span></div>';

const S2V = {
  correct: { lodging: 1500, meals: 625, spa: 250, parking: 125 }, maxAttempts: 2,
  popup: {
    retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
    correct: { bg: '#edf8ed', title: 'صحيح‎!',
               body: ['ملأتم تكاليف جميع المصروفات من التكلفة الإجمالية بصورة صحيحة‎.'] },
    /* PROJECT-WIDE FINAL-WRONG RULE (producer, 2026-09-01): every
       `wrong2` title — the popup shown after the LAST attempt — ends
       with a line break and a second line, "התשובה הנכונה מוצגת.", which
       the .scq-popup-title rule renders bold along with the first line.
       The title is therefore written to the element with innerHTML, not
       textContent. Deliberately NOT applied to `retry`, to `correct`, or
       to a wrong2 `answerView` — the answer view shows the learner's own
       answer, not the correct one. */
    wrong2:  { bg: '#ffdbdc', title: 'قد تكون بعض الإجابات خاطئة‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,   // body:null -> S2V_EXPLAIN
               action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
               answerView: {
                 title: 'الإجابة غير صحيحة‎.',
                 body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
                 action: { label: 'الإجابة الصحيحة', view: 'solution' }
               } }
  }
};
const S2V_KEYS = ['lodging', 'meals', 'spa', 'parking'];

let s2vAttempts = 0, s2vAnswered = false, s2vDone = false;
let s2vLastWrong = null;   // joined signature of all four fields
let s2vAnswer = null;      // {lodging,meals,spa,parking} snapshot of the learner's final-wrong values
let s2vView   = 'solution';

function s2vInputs() {
  const o = {}; S2V_KEYS.forEach(k => o[k] = document.getElementById('s2v-input-' + k)); return o;
}
function s2vFields() {
  const o = {}; S2V_KEYS.forEach(k => o[k] = document.getElementById('s2v-field-' + k)); return o;
}
function s2vIcos() {
  const o = {}; S2V_KEYS.forEach(k => o[k] = document.getElementById('s2v-input-ico-' + k)); return o;
}
function s2vSignature(i) { return S2V_KEYS.map(k => i[k].value.trim()).join('|'); }

function s2vInputChange() {
  if (s2vAnswered) return;
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  S2V_KEYS.forEach(k => {
    f[k]?.classList.remove('error', 'correct');
    if (ico[k]) ico[k].innerHTML = '';
  });
  document.getElementById('s2v-popup')?.classList.add('hidden');
  const chk = document.getElementById('s2v-check');
  const hasAll = S2V_KEYS.every(k => i[k].value.trim() !== '');
  if (chk) chk.disabled = !hasAll || (s2vSignature(i) === s2vLastWrong);
}
/* Per-field correctness map. The sub-part as a whole is right only when
   EVERY box is (s2vIsCorrect below), but the learner must still be shown
   WHICH boxes they got right and which they missed — producer rule
   (2026-08-19, first applied to part 01's S8; extended to every
   multi-input screen 2026-08-26). Never mark the whole set red just
   because the set as a whole is wrong. */
function s2vFieldStates(v) {
  const o = {}; S2V_KEYS.forEach(k => o[k] = Number(v[k]) === S2V.correct[k]); return o;
}
function s2vIsCorrect(v) {
  return S2V_KEYS.every(k => Number(v[k]) === S2V.correct[k]);
}
function s2vCheck() {
  if (s2vAnswered) { advanceScreen(); return; }
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  if (!S2V_KEYS.every(k => i[k].value.trim() !== '')) return;
  const v = {}; S2V_KEYS.forEach(k => v[k] = i[k].value.trim());
  s2vAttempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s2vOk = s2vIsCorrect(v);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. Values come from `v` rather than
     from the DOM: the final-wrong branch reveals the solution into those
     same inputs, so by then .value is no longer what the learner typed. */
  xapiAnswered('001', 'q1', s2vOk,
    s2vOk || s2vAttempts >= S2V.maxAttempts,
    S2V_KEYS.map(function (k) { return k + '=' + v[k]; }).join(', '));

  if (s2vOk) {
    S2V_KEYS.forEach(k => {
      f[k]?.classList.remove('error'); f[k]?.classList.add('correct');
      if (ico[k]) ico[k].innerHTML = CHECK_SVG;
    });
    s2vFinish();
    s2vShowPopup('correct');
  } else if (s2vAttempts >= S2V.maxAttempts) {
    s2vAnswer = v;
    s2vView = 'solution';
    s2vFinish();
    s2vApplyView();
  } else {
    const fc = s2vFieldStates(v);
    S2V_KEYS.forEach(k => {
      f[k]?.classList.remove('correct', 'error');
      f[k]?.classList.add(fc[k] ? 'correct' : 'error');
      if (ico[k]) ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
    s2vLastWrong = s2vSignature(i);
    document.getElementById('s2v-check').disabled = true;
    showHintButton('s2v-hint');   // hidden-until-first-wrong policy
    s2vShowPopup('retry');
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
function s2vApplyView() {
  if (s2vAnswer === null) return;
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  const showAnswer = s2vView === 'answer';
  /* Solution view is the correct answer, so every box is green. Answer
     view replays what the learner submitted — per-field again, same rule
     as the retry state above, NOT blanket red. */
  const fc = showAnswer ? s2vFieldStates(s2vAnswer) : null;
  S2V_KEYS.forEach(k => {
    i[k].value = showAnswer ? s2vAnswer[k] : String(S2V.correct[k]);
    const ok = showAnswer ? fc[k] : true;
    f[k]?.classList.remove('correct', 'error');
    f[k]?.classList.add(ok ? 'correct' : 'error');
    if (ico[k]) ico[k].innerHTML = ok ? CHECK_SVG : WRONG_SVG;
  });
  s2vShowPopup('wrong2', s2vView);
}
function s2vToggleView() {
  if (s2vAnswer === null) return;
  s2vView = (s2vView === 'solution') ? 'answer' : 'solution';
  s2vApplyView();
}
/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s2vFinishDom() {
  const i = s2vInputs();
  S2V_KEYS.forEach(k => { i[k].disabled = true; });
  const chk = document.getElementById('s2v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s2v-hint');
}

function s2vFinish() {
  s2vAnswered = true; s2vDone = true;
  s2vFinishDom();
}
function s2vResetInitial() {
  s2vAttempts = 0; s2vAnswered = false; s2vLastWrong = null;
  s2vAnswer = null; s2vView = 'solution';
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  S2V_KEYS.forEach(k => {
    if (i[k]) { i[k].value = ''; i[k].disabled = false; }
    f[k]?.classList.remove('error', 'correct');
    if (ico[k]) ico[k].innerHTML = '';
  });
  document.getElementById('s2v-popup')?.classList.add('hidden');
  document.getElementById('s2v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s2v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s2v-hint');   // hidden-until-first-wrong policy
}
function s2vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('001', 'q1');
  document.getElementById('s2v-hint-overlay')?.classList.remove('hidden');
}
function s2vCloseHint() { document.getElementById('s2v-hint-overlay')?.classList.add('hidden'); }
function s2vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s2vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s2v-hint-overlay')?.classList.contains('hidden')) s2vCloseHint();
});
function s2vShowPopup(type, view) {
  const popup = document.getElementById('s2v-popup');
  if (!popup) return;
  const base = S2V.popup[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  else if (type === 'wrong2') reanchorPopupBottom(popup);
  const titleEl = document.getElementById('s2v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s2v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S2V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s2v-popup', cfg.action, s2vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function goBackFromS2() { goTo(1); }

/* ═══════════════════════════════════════════════════════════
   S3 — SingleChoiceQuestion, slide82. Reuses part 01's own S2Q shape
   (`.scq-answers`/`.scq-opt`/`.scq-radio` + draggable `.scq-popup`) —
   see the header comment on #s3 in index.html for why this project's
   own sibling implementation was ported instead of the generic
   720-templates skill's `#scq-feedbox` contract. No hint on this
   screen (explicit producer note). Does not use the View My Answer
   Toggle — both the chosen wrong option and the correct option are
   marked simultaneously on the final wrong attempt.
   ═══════════════════════════════════════════════════════════ */
const S3Q = { correctId: 'c', maxAttempts: 2 }; // 'c' = פי 6 (1500/250)

const S3Q_BODY = [
  'المبلغ المدفوع مقابل المبيت هو: 1500 شيكل',
  'والمبلغ المدفوع مقابل السبا والمَرافق هو 250 شيكل.',
  '250 شيكل ضرب 6 يساوي 1,500 شيكل.',
  'لذلك فإن المبلغ المدفوع مقابل المبيت أكبر بـ 6 مرات من المبلغ المدفوع مقابل السبا والمَرافق‎.'
];
const S3Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S3Q_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، لكن يمكن التعلّم من هذا الخطأ.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S3Q_BODY }
};

let s3qSelected  = null;
let s3qAttempts  = 0;
let s3qAnswered  = false;
let s3qDone      = false;
let s3qLastWrong = null;
let s3qLastResult = null;   // 'correct' | 'wrong2' — for reopening on Back

function s3qSelect(id) {
  if (s3qAnswered) return;
  s3qSelected = id;
  if (s3qAttempts > 0) {
    document.getElementById('s3q-popup')?.classList.add('hidden');
    document.querySelectorAll('#s3 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s3 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  s3qUpdateBar();
}
function s3qMark(id, cls) {
  const opt = document.querySelector('#s3 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}
/* Hint (added 2026-08-20, producer correction — see the button's own
   comment in index.html for why slide82's "no hint" note was overridden).
   Same three-function shape + Escape handler as S2's own hint. */
function s3qOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('001', 'q2');
  document.getElementById('s3q-hint-overlay')?.classList.remove('hidden');
}
function s3qCloseHint() { document.getElementById('s3q-hint-overlay')?.classList.add('hidden'); }
function s3qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s3qCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s3q-hint-overlay')?.classList.contains('hidden')) s3qCloseHint();
});

function s3qShowPopup(type) {
  const popup = document.getElementById('s3q-popup');
  if (!popup) return;
  const cfg = S3Q_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  const titleEl = document.getElementById('s3q-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s3q-popup-body');
  if (bodyEl) bodyEl.innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function s3qCheck() {
  if (s3qAnswered) { advanceScreen(); return; }
  if (!s3qSelected) return;

  s3qAttempts++;
  const isCorrect = s3qSelected === S3Q.correctId;

  /* xAPI: answered - after both guards, before the branches. The
     s3qAnswered guard above is what stops a repaint re-reporting. */
  xapiAnswered('001', 'q2', isCorrect,
    isCorrect || s3qAttempts >= S3Q.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s3', s3qSelected)));

  if (isCorrect) {
    s3qMark(S3Q.correctId, 'correct');
    s3qLastResult = 'correct';
    s3qShowPopup('correct');
    s3qFinish();
  } else if (s3qAttempts >= S3Q.maxAttempts) {
    s3qMark(S3Q.correctId, 'correct');
    s3qMark(s3qSelected, 'wrong');
    s3qLastResult = 'wrong2';
    s3qShowPopup('wrong2');
    s3qFinish();
  } else {
    s3qMark(s3qSelected, 'wrong');
    s3qLastWrong = s3qSelected;
    showHintButton('s3q-hint');   // hidden-until-first-wrong policy
    s3qShowPopup('retry');
    s3qUpdateBar();
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
function s3qFinishDom() {
  document.querySelectorAll('#s3 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s3q-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
}

function s3qFinish() {
  s3qAnswered = true;
  s3qDone = true;
  s3qFinishDom();
}
function s3qUpdateBar() {
  if (s3qAnswered) return;
  const chk = document.getElementById('s3q-check');
  if (chk) chk.disabled = !s3qSelected || s3qSelected === s3qLastWrong;
}
function s3qResetInitial() {
  s3qSelected = null;
  s3qAttempts = 0;
  s3qAnswered = false;
  s3qLastWrong = null;
  s3qLastResult = null;
  document.querySelectorAll('#s3 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s3q-popup')?.classList.add('hidden');
  document.getElementById('s3q-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s3q-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s3q-hint');   // hidden-until-first-wrong policy
}
function goBackFromS3() { goTo(2); }


/* ═══════════════════════════════════════════════════════════
   S4 — SingleChoiceQuestion, slide83. Same shape as S3 (reuses the
   same `.scq-answers`/`.scq-opt` apparatus, no hint, no View My Answer
   Toggle — see the header comment on #s4 in index.html for the option-
   order/correct-answer extraction detail).
   ═══════════════════════════════════════════════════════════ */
const S4Q = { correctId: 'c', maxAttempts: 2 };

const S4Q_BODY = [
  'عبير مخطئة‎.',
  'المبلغ المدفوع مقابل الوجبات وموقف السيارات يشكل %30 من المبلغ الإجمالي، وهذا عدد قريب من الثلث لكنه ليس ثلثًا بالضبط.',
  'ثلث الـ %100 هو <span dir="ltr">33' + frac(1, 3) + '%</span>.'
];
const S4Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S4Q_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، لكن يمكن التعلّم من هذا الخطأ.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S4Q_BODY }
};

let s4qSelected  = null;
let s4qAttempts  = 0;
let s4qAnswered  = false;
let s4qDone      = false;
let s4qLastWrong = null;
let s4qLastResult = null;   // 'correct' | 'wrong2' — for reopening on Back

function s4qSelect(id) {
  if (s4qAnswered) return;
  s4qSelected = id;
  if (s4qAttempts > 0) {
    document.getElementById('s4q-popup')?.classList.add('hidden');
    document.querySelectorAll('#s4 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s4 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  s4qUpdateBar();
}
function s4qMark(id, cls) {
  const opt = document.querySelector('#s4 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}
/* Hint (added 2026-08-20, producer correction — see the button's own
   comment in index.html for why slide83's "no hint" note was overridden).
   Same shape as S2's and S3's own hints. */
function s4qOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('001', 'q3');
  document.getElementById('s4q-hint-overlay')?.classList.remove('hidden');
}
function s4qCloseHint() { document.getElementById('s4q-hint-overlay')?.classList.add('hidden'); }
function s4qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s4qCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s4q-hint-overlay')?.classList.contains('hidden')) s4qCloseHint();
});

function s4qShowPopup(type) {
  const popup = document.getElementById('s4q-popup');
  if (!popup) return;
  const cfg = S4Q_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  const titleEl = document.getElementById('s4q-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s4q-popup-body');
  if (bodyEl) bodyEl.innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function s4qCheck() {
  if (s4qAnswered) { advanceScreen(); return; }
  if (!s4qSelected) return;

  s4qAttempts++;
  const isCorrect = s4qSelected === S4Q.correctId;

  /* xAPI: answered - after both guards, before the branches. The
     s4qAnswered guard above is what stops a repaint re-reporting. */
  xapiAnswered('001', 'q3', isCorrect,
    isCorrect || s4qAttempts >= S4Q.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s4', s4qSelected)));

  if (isCorrect) {
    s4qMark(S4Q.correctId, 'correct');
    s4qLastResult = 'correct';
    s4qShowPopup('correct');
    s4qFinish();
  } else if (s4qAttempts >= S4Q.maxAttempts) {
    s4qMark(S4Q.correctId, 'correct');
    s4qMark(s4qSelected, 'wrong');
    s4qLastResult = 'wrong2';
    s4qShowPopup('wrong2');
    s4qFinish();
  } else {
    s4qMark(s4qSelected, 'wrong');
    s4qLastWrong = s4qSelected;
    showHintButton('s4q-hint');   // hidden-until-first-wrong policy
    s4qShowPopup('retry');
    s4qUpdateBar();
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
function s4qFinishDom() {
  document.querySelectorAll('#s4 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s4q-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
}

function s4qFinish() {
  s4qAnswered = true;
  s4qDone = true;
  s4qFinishDom();
}
function s4qUpdateBar() {
  if (s4qAnswered) return;
  const chk = document.getElementById('s4q-check');
  if (chk) chk.disabled = !s4qSelected || s4qSelected === s4qLastWrong;
}
function s4qResetInitial() {
  s4qSelected = null;
  s4qAttempts = 0;
  s4qAnswered = false;
  s4qLastWrong = null;
  s4qLastResult = null;
  document.querySelectorAll('#s4 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s4q-popup')?.classList.add('hidden');
  document.getElementById('s4q-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s4q-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s4q-hint');   // hidden-until-first-wrong policy
}
function goBackFromS4() { goTo(3); }

/* ═══════════════════════════════════════════════════════════
   S5 — SingleChoiceQuestion, slide84. Same no-hint/no-toggle SCQ
   shape as S3/S4, but only 3 options (confirmed by counting each
   option's own row container, not assumed) and no second column (no
   table/image on this slide — see the header comment on #s5 in
   index.html).
   ═══════════════════════════════════════════════════════════ */
const S5Q = { correctId: 'a', maxAttempts: 2 };

const S5Q_BODY = [
  'ماهر على صواب.',
  'حسبَ ماهر كم يساوي %40 من المبلغ المخصص للوجبات (625 شيكل) وحصل على‎:',
  '<div class="eq-row"><span>40%</span><span>&middot;</span><span>625</span><span>=</span><span>0.4</span><span>&middot;</span><span>625</span><span>=</span><span>250</span></div>',
  'لذلك استنتج أنه إذا كانت تكلفة وجبات الإفطار 250 شيكل وكان مجموع الوجبات 625 شيكل، فإن تكلفة وجبات العشاء كانت 375 شيكل:',
  '<div class="eq-row"><span>625</span><span>&minus;</span><span>250</span><span>=</span><span>375</span></div>'
];
const S5Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S5Q_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'أهطأتم، لكن رائع أنكم حاولتم مواجهة التحدي‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S5Q_BODY }
};

let s5qSelected  = null;
let s5qAttempts  = 0;
let s5qAnswered  = false;
let s5qDone      = false;
let s5qLastWrong = null;
let s5qLastResult = null;   // 'correct' | 'wrong2' — for reopening on Back

function s5qSelect(id) {
  if (s5qAnswered) return;
  s5qSelected = id;
  if (s5qAttempts > 0) {
    document.getElementById('s5q-popup')?.classList.add('hidden');
    document.querySelectorAll('#s5 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s5 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  s5qUpdateBar();
}
function s5qMark(id, cls) {
  const opt = document.querySelector('#s5 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}
/* Hint (added 2026-08-20, producer correction — see the button's own
   comment in index.html, including the content flag on this one's text). */
function s5qOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('001', 'q4');
  document.getElementById('s5q-hint-overlay')?.classList.remove('hidden');
}
function s5qCloseHint() { document.getElementById('s5q-hint-overlay')?.classList.add('hidden'); }
function s5qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s5qCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s5q-hint-overlay')?.classList.contains('hidden')) s5qCloseHint();
});

function s5qShowPopup(type) {
  const popup = document.getElementById('s5q-popup');
  if (!popup) return;
  const cfg = S5Q_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  const titleEl = document.getElementById('s5q-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s5q-popup-body');
  if (bodyEl) bodyEl.innerHTML = cfg.body.map(p => p.startsWith('<div') ? p : '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function s5qCheck() {
  if (s5qAnswered) { advanceScreen(); return; }
  if (!s5qSelected) return;

  s5qAttempts++;
  const isCorrect = s5qSelected === S5Q.correctId;

  /* xAPI: answered - after both guards, before the branches. The
     s5qAnswered guard above is what stops a repaint re-reporting. */
  xapiAnswered('001', 'q4', isCorrect,
    isCorrect || s5qAttempts >= S5Q.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s5', s5qSelected)));

  if (isCorrect) {
    s5qMark(S5Q.correctId, 'correct');
    s5qLastResult = 'correct';
    s5qShowPopup('correct');
    s5qFinish();
  } else if (s5qAttempts >= S5Q.maxAttempts) {
    s5qMark(S5Q.correctId, 'correct');
    s5qMark(s5qSelected, 'wrong');
    s5qLastResult = 'wrong2';
    s5qShowPopup('wrong2');
    s5qFinish();
  } else {
    s5qMark(s5qSelected, 'wrong');
    s5qLastWrong = s5qSelected;
    showHintButton('s5q-hint');   // hidden-until-first-wrong policy
    s5qShowPopup('retry');
    s5qUpdateBar();
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
function s5qFinishDom() {
  document.querySelectorAll('#s5 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s5q-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
}

function s5qFinish() {
  s5qAnswered = true;
  s5qDone = true;
  s5qFinishDom();
}
function s5qUpdateBar() {
  if (s5qAnswered) return;
  const chk = document.getElementById('s5q-check');
  if (chk) chk.disabled = !s5qSelected || s5qSelected === s5qLastWrong;
}
function s5qResetInitial() {
  s5qSelected = null;
  s5qAttempts = 0;
  s5qAnswered = false;
  s5qLastWrong = null;
  s5qLastResult = null;
  document.querySelectorAll('#s5 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s5q-popup')?.classList.add('hidden');
  const chk = document.getElementById('s5q-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  document.getElementById('s5q-hint-overlay')?.classList.add('hidden');
  hideHintButton('s5q-hint');   // hidden-until-first-wrong policy
}
function goBackFromS5() { goTo(4); }

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
  window.Motion?.reveal(document.querySelector('.screen.active')); // reveal the initial screen once
  PartNav.init({
    part: '06',
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
   reading this part's screen text against metadata/methodica-math-percent-02-06.json
   and cross-checking which screens own a *Check function. Each screen carries
   the matched item's title so the derivation stays auditable without redoing
   it. Every suffix comes from metadata/ - never from a code comment and never
   from a remembered slide number (see 4.2, and 6.2 trap 2: prose in this
   family numbers screens 1-based, these keys are 0-based).

   One item across five screens: the suffix never changes over keys 1-5, so
   xapiOnScreen emits ONE initialized on entering s1 and nothing at all while
   the learner pages through the four sections; the single completed carries
   the whole result (6.2). This is the climax question - failing
   climaxPassed() routes the learner into part 07, its moed-B twin.
*/
var SCREEN_TO_SUBCONTENT = {
  0:  null,          /* מעבר - "...עכשיו מגיעה שאלת השיא יש בה 4 סעיפים" */
  1:  ['001', 1],    /* חלוקת עלויות חופשת משפחת כהן - פתיחה, ללא *Check */
  2:  ['001', 2],    /* אותו פריט - טבלת העלויות, סעיף א (s2vCheck) */
  3:  ['001', 3],    /* אותו פריט - סעיף ב (פי כמה גדול) */
  4:  ['001', 4],    /* אותו פריט - סעיף ג (האם ניר צודקת) */
  5:  ['001', 5]     /* אותו פריט - סעיף ד (פירוט חשבון הארוחות) */
};

/* Exactly TOTAL_SCREENS keys (6), 0..5, no gaps. A MISSING key is
   indistinguishable at runtime from null - the screen silently stops
   reporting. _test/verify-shared.js enforces the count, the contiguity and
   two-way coverage against metadata/ (6.2 traps 1 and 3). */

var XAPI_COMP_SLUG = 'methodica-math-percent-02-06';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* MUST end '/' - 6.1 */
var XAPI_EVAL_ITEMS = { '001': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-02-06.json';


/* ═══════════════ resume — the four per-part hooks (§8.7) ═══════════════
   Here because every learner state variable in this file is declared `let` at
   top level: the global LEXICAL environment, not reachable through window. */

function capturePartPayload() {
  /* The four field values are DOM-only on the CORRECT path: s2vAnswer stays
     null there, so what the learner typed exists only in the inputs (§8.9). */
  var i2 = s2vInputs();
  var typed2 = {};
  S2V_KEYS.forEach(function (k) { typed2[k] = i2[k] ? i2[k].value : ''; });

  function scq(sel, att, ans, done, lw, lr) {
    return { selected: sel, attempts: att, answered: ans,
             done: done, lastWrong: lw, lastResult: lr };
  }

  return {
    currentScreen: currentScreen,
    s2v: {
      attempts:  s2vAttempts,
      answered:  s2vAnswered,
      done:      s2vDone,
      lastWrong: s2vLastWrong,
      /* §8.10's three: the learner's own answer, which view is showing, and the
         displayed values. Drop `answer` and a restored solution view is
         promoted to "what the learner answered". */
      answer:    s2vAnswer,
      view:      s2vView,
      inputs:    typed2
    },
    s3q: scq(s3qSelected, s3qAttempts, s3qAnswered, s3qDone, s3qLastWrong, s3qLastResult),
    s4q: scq(s4qSelected, s4qAttempts, s4qAnswered, s4qDone, s4qLastWrong, s4qLastResult),
    s5q: scq(s5qSelected, s5qAttempts, s5qAnswered, s5qDone, s5qLastWrong, s5qLastResult)
  };
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.s2v) {
    s2vAttempts  = st.s2v.attempts || 0;
    s2vAnswered  = !!st.s2v.answered;
    s2vDone      = !!st.s2v.done;
    s2vLastWrong = st.s2v.lastWrong;
    s2vAnswer    = (st.s2v.answer === undefined) ? null : st.s2v.answer;
    s2vView      = st.s2v.view || 'solution';
  }
  if (st.s3q) {
    s3qSelected = st.s3q.selected;   s3qAttempts   = st.s3q.attempts || 0;
    s3qAnswered = !!st.s3q.answered; s3qDone       = !!st.s3q.done;
    s3qLastWrong = st.s3q.lastWrong; s3qLastResult = st.s3q.lastResult;
  }
  if (st.s4q) {
    s4qSelected = st.s4q.selected;   s4qAttempts   = st.s4q.attempts || 0;
    s4qAnswered = !!st.s4q.answered; s4qDone       = !!st.s4q.done;
    s4qLastWrong = st.s4q.lastWrong; s4qLastResult = st.s4q.lastResult;
  }
  if (st.s5q) {
    s5qSelected = st.s5q.selected;   s5qAttempts   = st.s5q.attempts || 0;
    s5qAnswered = !!st.s5q.answered; s5qDone       = !!st.s5q.done;
    s5qLastWrong = st.s5q.lastWrong; s5qLastResult = st.s5q.lastResult;
  }
}

function applyResumeDom(st) {
  if (!st) return;
  /* Guarded per block, not once at the top (§8.9). */
  if (st.s2v && st.s2v.inputs) {
    var i = s2vInputs();
    S2V_KEYS.forEach(function (k) {
      if (i[k] && typeof st.s2v.inputs[k] === 'string') i[k].value = st.s2v.inputs[k];
    });
  }
}

function restoreScreenUI(n) {
  /* ⚠️ NEVER delegate to resetScreenState(n) and never reach a
     sNResetInitial(): this runs on EVERY navigation (§8.4a) and reset's
     not-answered branch clears the fields and the selection, which would wipe a
     half-finished answer on every screen change (§8.8 rule 5, risk 1). */
  if (n === 2) {
    paintValueFields({
      done: s2vDone, attempts: s2vAttempts, answered: s2vAnswered,
      lastWrong: s2vLastWrong, answer: s2vAnswer,
      keys: S2V_KEYS,
      inputs: s2vInputs, fields: s2vFields, icos: s2vIcos,
      fieldStates: s2vFieldStates,
      applyView: s2vApplyView,
      showPopup: s2vShowPopup,
      finishDom: s2vFinishDom,
      showHint: function () { showHintButton('s2v-hint'); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG,
      /* s2vInputChange() would be rule 2's recompute, but it also clears every
         field mark and hides the popup - it would undo the paint above. */
      checkButton: undefined
    });
  }
  if (n === 3) {
    paintSingleChoice({
      done: s3qDone, attempts: s3qAttempts, selected: s3qSelected,
      lastWrong: s3qLastWrong, lastResult: s3qLastResult,
      correctId: S3Q.correctId,
      mark: s3qMark, showPopup: s3qShowPopup, finishDom: s3qFinishDom,
      showHint: function () { showHintButton('s3q-hint'); },
      updateBar: s3qUpdateBar
    });
  }
  if (n === 4) {
    paintSingleChoice({
      done: s4qDone, attempts: s4qAttempts, selected: s4qSelected,
      lastWrong: s4qLastWrong, lastResult: s4qLastResult,
      correctId: S4Q.correctId,
      mark: s4qMark, showPopup: s4qShowPopup, finishDom: s4qFinishDom,
      showHint: function () { showHintButton('s4q-hint'); },
      updateBar: s4qUpdateBar
    });
  }
  if (n === 5) {
    paintSingleChoice({
      done: s5qDone, attempts: s5qAttempts, selected: s5qSelected,
      lastWrong: s5qLastWrong, lastResult: s5qLastResult,
      correctId: S5Q.correctId,
      mark: s5qMark, showPopup: s5qShowPopup, finishDom: s5qFinishDom,
      showHint: function () { showHintButton('s5q-hint'); },
      updateBar: s5qUpdateBar
    });
  }
}
