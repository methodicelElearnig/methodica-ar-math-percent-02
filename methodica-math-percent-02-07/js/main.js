'use strict';

/* ═══════════════════════════════════════════════════════════
   js/main.js — methodica-math-percent-02-07 (part 07)

   Engine (scaleApp / goTo / resetScreenState / keyboard nav / dev
   bridge) carried over from parts 01-06 so every part behaves
   identically. This part is the REMEDIAL twin of part 06's climax
   question, reached only when the learner fails part 06's own climax
   question — see part 06's own `climaxPassed()`/`advanceScreen()`
   override for the navigation side of this contract.

   Screen roster:
     S0 — TransitionScreen kickoff, ORIGINAL retry-framed copy (no
          dedicated slide in the script for this "מועד ב" section —
          see the header comment on #s0 in index.html)
     S1 — Scenario/context intro (image + text, no input), "שי ואלון
          החליטו להשתתף באתגר בריאות..." (slide86), item -001 (shared
          with S0 — this slide isn't its own lettered sub-part)
     S2 — SingleChoiceQuestion, "האם שי צודקת או טועה?" (slide87), item
          -001 sub-part א. Reuses the SAME reference image as S1/S3.
          4 options, correctId 'b'. Hint IS present (visible from
          start — see the header comment on #s2 in style.css for why
          this differs from part 06's own no-hint SCQ screens). Does
          NOT use the View My Answer Toggle.
     S3 — ValueInputQuestion, "השלימו:" (slide88), item -001 sub-part ב
          (closes out the item's 2 sub-parts). TWO inline blanks inside
          running sentences (shai=6400, alon=7200), validated
          holistically. Hint hidden until first wrong attempt (this
          project's own established ValueInputQuestion convention).
          Does NOT use the View My Answer Toggle (only one shared
          explanation body exists in the source — see the header
          comment on #s3 in style.css).
   Slide numbers are the deck's own displayed numbers and map 1:1 to
   ppt/slides/slideN.xml (verified this session against
   presentation.xml's sldIdLst).
   Bump TOTAL_SCREENS as more screens are added.
   ═══════════════════════════════════════════════════════════ */

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 4;  // S0-S3

/* ─── Companion character ───────────────────────────────────
   Part 01 WRITES the learner's choice to this namespaced key; every
   later part READS it back — key string must stay byte-identical
   (720-templates → _global-components.md → Companion character system
   → "Cross-part persistence"). */
const CHARACTER_STORAGE_KEY = 'methodica_math_percent_02_selectedCharacter';
const DEFAULT_CHARACTER = 'character-1';

/* S0's character video — swapped 2026-08-12 (producer decision) from
   the Character-{1,2}-Challenge.mp4 asset (still used by part 06's own
   S0) to Character-{1,2}-Rocket.mp4: character-1 rides a rocket-
   powered wheelchair, character-2 flies with a jetpack, both trailing
   flame/smoke — a different "launch" visual for this part's own
   kickoff. 1280x720, decorative — no sound, no player controls, see
   the video element's own attributes in index.html. Alt text derived
   from the video's own poster frame (extracted via Windows Shell
   `IShellItemImageFactory`, no ffmpeg available in this environment).
   `still` is the same defensive-only fallback pattern every other part
   uses — shown only if the video fails to load. Selection is by the
   SAME `window.lomdaState.selectedCharacter` read as every other part
   — set on part 01's own character-choice screen, never re-decided
   here. */
const S0_CHARACTER = {
  'character-1': {
    video: 'assets/video/Character-1-Rocket.mp4',
    still: '../unit-assets/img/character-1-normal.png',
    alt:   'الشخصية على الكرسي المتحرك تنطلق على الكرسي المتحرك الصاروخي، مع علم صغير ولهب ودخان خلفها'
  },
  'character-2': {
    video: 'assets/video/Character-2-Rocket.mp4',
    still: '../unit-assets/img/character-2-normal.png',
    alt:   'الشخصية الزهرية تطير في الهواء باستخدام جت باك، مع لهب ودخان خلفها'
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
   re-resolves/re-mounts the companion character video on every entry.
   S1 has no dynamic state to restore. S2/S3 follow the same
   resume-state contract as every other SCQ/ValueInputQuestion screen
   in this series: resolved reopens the last popup, unresolved gets a
   fresh attempt. */
function resetScreenState(n) {
  if (n === 0) {
    s0ApplyCharacter();
    // Keep the first screen's cross-part Back button in sync with the
    // navigation trail — on initial load and on every return to S0 from
    // inside this part (js/partnav.js).
    PartNav.mountBack('s0-back');
  }
  if (n === 2) {
    if (!s2qDone) s2qResetInitial();
    else s2qShowPopup(s2qLastResult);
  }
  if (n === 3) {
    if (!s3vDone) {
      s3vResetInitial();
    } else if (s3vAnswer !== null) {
      // Toggle contract: "Back-navigation returns to the solution
      // view" (720-templates → _global-components.md → Feedback popup
      // system → View My Answer Toggle) — always re-enter on 'solution',
      // never whichever view the learner had toggled to before leaving.
      s3vView = 'solution';
      s3vApplyView();
    } else {
      s3vShowPopup('correct');
    }
  }
}


/* Cross-part navigation trail (js/partnav.js). This part is the
   journey's terminal branch — nothing leads out of it, so it never
   pushes a trail entry and is never a Back TARGET. init() still runs
   because back() needs to know which part it is leaving (it records
   that on the return, so part 06 can re-cross forward). */

/* Bounds-checked by goTo() — advancing past the last BUILT screen is a
   deliberate no-op, same convention every other part followed before
   its own next screen was added. This part has no screen past S3 (the
   pass/fail summary in the script, slides 89-90, is a scripting
   mistake per producer instruction and was not built), so this stays a
   dead end — consistent with part 06's own S5 having no further
   screen either. */
function advanceScreen() { goTo(currentScreen + 1); }
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
   canvas/bottom-bar dimensions, ported verbatim from part 06.
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
   S2 — SingleChoiceQuestion, slide87. Reuses this project's own
   established SCQ shape (`.scq-answers`/`.scq-opt`/`.scq-radio` +
   draggable `.scq-popup`). Hint IS present here (unlike part 06's
   S3-S5). Hint hidden until first wrong attempt — producer decision
   (2026-08-12 chat) overriding this build's own initial "visible from
   start" call (the generic 720-templates template default, applied
   for lack of a documented local SCQ-hint precedent); the producer
   wants BOTH question screens in this part (S2 and S3) to share the
   same hidden-until-wrong policy. Does not use the View My Answer
   Toggle — both the chosen wrong option and the correct option are
   marked simultaneously on the final wrong attempt.
   ═══════════════════════════════════════════════════════════ */
const S2Q = { correctId: 'b', maxAttempts: 2 };

const S2Q_BODY = [
  'سمر مخطئة‎.',
  'نسبة الإنجاز الأعلى لا تعني بالضرورة أنكم مشيتم عددًا أكبر من الخطوات فعليًا — فهذا يعتمد أيضًا على الهدف اليومي لكل شخص‎.',
  'الهدف اليومي الأكبر (مثل هدف وسام) قد "يحتوي" على عدد أكبر من الخطوات فعليًا، حتى لو أُنجِزت منه نسبة مئوية أقل‎.',
  'في البند التالي ستحسبون بأنفسكم عدد الخطوات الدقيق لكل واحد منهما، ويمكنكم التحقق من ذلك‎.'
];
const S2Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S2Q_BODY },
  /* PROJECT-WIDE FINAL-WRONG RULE (producer, 2026-09-01): every
     `wrong2` title — the popup shown after the LAST attempt — ends
     with a line break and a second line, "התשובה הנכונה מוצגת.", which
     the .scq-popup-title rule renders bold along with the first line.
     The title is therefore written to the element with innerHTML, not
     textContent. Deliberately NOT applied to `retry`, to `correct`, or
     to a wrong2 `answerView` — the answer view shows the learner's own
     answer, not the correct one. */
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، تعالوا نفحص معًا‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S2Q_BODY }
};

let s2qSelected  = null;
let s2qAttempts  = 0;
let s2qAnswered  = false;
let s2qDone      = false;
let s2qLastWrong = null;
let s2qLastResult = null;   // 'correct' | 'wrong2' — for reopening on Back
let s2qHintUsed  = false;

function s2qSelect(id) {
  if (s2qAnswered) return;
  s2qSelected = id;
  if (s2qAttempts > 0) {
    document.getElementById('s2q-popup')?.classList.add('hidden');
    document.querySelectorAll('#s2 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s2 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  s2qUpdateBar();
}
function s2qMark(id, cls) {
  const opt = document.querySelector('#s2 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}
function s2qShowPopup(type) {
  const popup = document.getElementById('s2q-popup');
  if (!popup) return;
  const cfg = S2Q_POPUP_CFG[type];
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  const titleEl = document.getElementById('s2q-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s2q-popup-body');
  if (bodyEl) bodyEl.innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function s2qCheck() {
  if (s2qAnswered) { advanceScreen(); return; }
  if (!s2qSelected) return;

  s2qAttempts++;
  const isCorrect = s2qSelected === S2Q.correctId;

  /* xAPI: answered - after both guards and before the branches, so the
     correct, retry and final-wrong paths each report exactly once. isLast is
     the family idiom: correct || attempts >= max. The s2qAnswered guard above
     is what stops a repaint or a second click re-reporting. */
  xapiAnswered('001', 'q1', isCorrect,
    isCorrect || s2qAttempts >= S2Q.maxAttempts,
    xapiAnswerText(xapiScqOptEl('s2', s2qSelected)));

  if (isCorrect) {
    s2qMark(S2Q.correctId, 'correct');
    s2qLastResult = 'correct';
    s2qShowPopup('correct');
    s2qFinish();
  } else if (s2qAttempts >= S2Q.maxAttempts) {
    s2qMark(S2Q.correctId, 'correct');
    s2qMark(s2qSelected, 'wrong');
    s2qLastResult = 'wrong2';
    s2qShowPopup('wrong2');
    s2qFinish();
  } else {
    s2qMark(s2qSelected, 'wrong');
    s2qLastWrong = s2qSelected;
    showHintButton('s2q-hint');   // hidden-until-first-wrong policy
    s2qShowPopup('retry');
    s2qUpdateBar();
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
   §8.8 rule 3: a painter mirrors DOM writes only - and a painter here runs on
   every navigation, so it must never reach the state writes or the reporting
   that the full sNFinish() also does. One source of truth beats copying these
   writes into the painter and letting the two drift. */
function s2qFinishDom() {
  document.querySelectorAll('#s2 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s2q-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s2q-hint');
}

function s2qFinish() {
  s2qAnswered = true;
  s2qDone = true;
  s2qFinishDom();
}
function s2qUpdateBar() {
  if (s2qAnswered) return;
  const chk = document.getElementById('s2q-check');
  if (chk) chk.disabled = !s2qSelected || s2qSelected === s2qLastWrong;
}
function s2qResetInitial() {
  s2qSelected = null;
  s2qAttempts = 0;
  s2qAnswered = false;
  s2qLastWrong = null;
  s2qLastResult = null;
  document.querySelectorAll('#s2 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s2q-popup')?.classList.add('hidden');
  document.getElementById('s2q-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s2q-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s2q-hint');   // hidden-until-first-wrong policy
}
function s2qOpenHint() {
  s2qHintUsed = true;
  /* xAPI: requested.1 - immediately before the reveal. This function opens
     the overlay, it never toggles it, so there is no double report. */
  xapiRequestedHint('001', 'q1');
  document.getElementById('s2q-hint-overlay')?.classList.remove('hidden');
}
function s2qCloseHint() { document.getElementById('s2q-hint-overlay')?.classList.add('hidden'); }
function s2qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s2qCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s2q-hint-overlay')?.classList.contains('hidden')) s2qCloseHint();
});
function goBackFromS2() { goTo(1); }

/* ═══════════════════════════════════════════════════════════
   S3 — ValueInputQuestion, slide88. TWO inline blanks inside running
   sentences (shai/alon), validated holistically as one combined
   outcome (same pattern as part 06's own S2 table).

   **DOES use the View My Answer Toggle — corrected 2026-08-12,
   producer-reported bug.** The final-wrong reveal overwrites the same
   two `<input>` slots the learner typed into, and the shared
   explanation-body reasoning ("only one body exists in the source")
   is irrelevant to the Applicability rule, which is purely about UI
   mechanics: 720-templates → _global-components.md → Feedback popup
   system → "View My Answer Toggle" → Applicability rule's "one slot,
   two possible values" test — (1) final-wrong reveals the solution,
   (2) into the SAME input elements, (3) the learner can no longer see
   what they submitted — all three hold here, same as part 06's own S2
   table. The initial build wrongly treated "does the script provide a
   separate learner-answer-view text" (no) as the deciding factor; the
   toggle's answer-view copy is always the fixed canonical text below,
   never the screen's own pedagogical explanation — see
   `_question-template-defaults.md` → "Feedback: shared explanation"
   → "This convention governs the solution view only."

   Hint hidden until first wrong attempt (this project's own
   established ValueInputQuestion convention, see part 06's own S2).
   ═══════════════════════════════════════════════════════════ */
const S3V = { correct: { shai: 6400, alon: 7200 }, maxAttempts: 2 };
const S3V_KEYS = ['shai', 'alon'];


/* Equations rebuilt to the script's own three-step form (producer
   correction, 2026-08-20). The earlier build collapsed each one to a
   single decimal step ("0.8 · 8,000 = 6,400"), because the real
   equations are OMML on slide89 and invisible to the <a:t> run dump —
   only the surrounding prose came through. media/image129.png (correct)
   and image130.png (wrong2) render them in full:
     80% · 8,000  = 80/100 · 8,000  = 6,400 צעדים
     60% · 12,000 = 60/100 · 12,000 = 7,200 צעדים
   NOTE — the script's SECOND equation ends "6,400 צעדים", which is a
   source error: 60/100 · 12,000 is 7,200, and the slide's very next
   line ("אלון צעד 7,200 צעדים.") plus the answer key (S3V.correct.alon
   = 7200) and the slide's own filled-in answer box all say 7,200. Built
   with 7,200 so the feedback doesn't state a false equality and then
   contradict itself one line later; flagged to the producer.
   The trailing "unit + number" follows the project-wide arrangement
   (producer decision, restated in positional terms 2026-08-27):

     physically LEFT to RIGHT:   ... = צעדים 6,400

   the number physically to the RIGHT of the unit word, the unit word
   physically to the RIGHT of the "=". This IS what image129.png above
   draws — the mockup was right, and the rendered PPTX is the source of
   truth for this arrangement. A 2026-08-26 pass briefly inverted it here
   and in parts 02/03 on a misread bug report; corrected 2026-08-27.

   The unit word and the number each sit in their own <bdi>, and the row
   is direction:ltr, so DOM order IS physical left-to-right order. The
   enclosing dir="ltr" span alone is not enough: the run holds no
   strong-LTR character (digits are bidi-WEAK), so bidi can resolve the
   whole run as RTL and swap the pair. See part 02's S7_EXPLANATION_BODY
   for the full note. */
const S3V_EXPLAIN = [
  '‎الهدف اليومي سمر هو 8,000 خطوة، وقد أُنجِزَ %80 من الهدف. لذلك‎:',
  '<div class="eq-row"><span>80%</span><span>&middot;</span><span>8,000</span><span>=</span>' + frac(80, 100) + '<span>&middot;</span><span>8,000</span><span>=</span><span dir="ltr"><bdi>خطوة</bdi> <bdi>6,400</bdi></span></div>',
  'مشت سمر 6,400 خطوة‎.',
  'الهدف اليومي لوسام هو 12,000 خطوة، وقد أُنجِزَ %60 من الهدف. لذلك‎:',
  '<div class="eq-row"><span>60%</span><span>&middot;</span><span>12,000</span><span>=</span>' + frac(60, 100) + '<span>&middot;</span><span>12,000</span><span>=</span><span dir="ltr"><bdi>خطوة</bdi> <bdi>7,200</bdi></span></div>',
  'مشى وسام 7,200 خطوة‎.'
];
const S3V_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S3V_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم. لا بأس، نتعلّم من الأخطاء أيضًا ونتحسن من تمرين لآخر.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S3V_EXPLAIN,
             action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
             answerView: {
               title: 'الإجابة غير صحيحة‎.',
               body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
               action: { label: 'الإجابة الصحيحة', view: 'solution' }
             } }
};

let s3vAttempts = 0, s3vAnswered = false, s3vDone = false;
let s3vLastWrong = null;    // joined signature of both fields
let s3vLastResult = null;   // 'correct' | 'wrong2' — for reopening on Back
let s3vAnswer = null;       // {shai,alon} snapshot of the learner's final-wrong values
let s3vView   = 'solution';

function s3vInputs() {
  const o = {}; S3V_KEYS.forEach(k => o[k] = document.getElementById('s3v-input-' + k)); return o;
}
function s3vFields() {
  const o = {}; S3V_KEYS.forEach(k => o[k] = document.getElementById('s3v-field-' + k)); return o;
}
function s3vIcos() {
  const o = {}; S3V_KEYS.forEach(k => o[k] = document.getElementById('s3v-ico-' + k)); return o;
}
function s3vSignature(i) { return S3V_KEYS.map(k => i[k].value.trim()).join('|'); }

function s3vInputChange() {
  if (s3vAnswered) return;
  const i = s3vInputs(), f = s3vFields(), ico = s3vIcos();
  S3V_KEYS.forEach(k => {
    f[k]?.classList.remove('error', 'correct');
    if (ico[k]) ico[k].innerHTML = '';
  });
  document.getElementById('s3v-popup')?.classList.add('hidden');
  const chk = document.getElementById('s3v-check');
  const hasAll = S3V_KEYS.every(k => i[k].value.trim() !== '');
  if (chk) chk.disabled = !hasAll || (s3vSignature(i) === s3vLastWrong);
}
/* Per-field correctness map. The sub-part as a whole is right only when
   EVERY box is (s3vIsCorrect below), but the learner must still be shown
   WHICH boxes they got right and which they missed — producer rule
   (2026-08-19, first applied to part 01's S8; extended to every
   multi-input screen 2026-08-26). Never mark the whole set red just
   because the set as a whole is wrong. */
function s3vFieldStates(v) {
  const o = {}; S3V_KEYS.forEach(k => o[k] = Number(v[k]) === S3V.correct[k]); return o;
}
function s3vIsCorrect(v) {
  return S3V_KEYS.every(k => Number(v[k]) === S3V.correct[k]);
}
function s3vCheck() {
  if (s3vAnswered) { s3vEnd(); return; }
  const i = s3vInputs(), f = s3vFields(), ico = s3vIcos();
  if (!S3V_KEYS.every(k => i[k].value.trim() !== '')) return;
  const v = {}; S3V_KEYS.forEach(k => v[k] = i[k].value.trim());
  s3vAttempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s3vOk = s3vIsCorrect(v);

  /* xAPI: answered - before the branches so all three paths report.
     The response text is built inline rather than with xapiFieldsAnswer(),
     which reads .value from the live DOM: on the final-wrong branch the
     reveal overwrites those inputs, so the values are taken from `v`,
     captured above while they were still the learner's own. */
  xapiAnswered('001', 'q2', s3vOk,
    s3vOk || s3vAttempts >= S3V.maxAttempts,
    S3V_KEYS.map(function (k) { return k + '=' + v[k]; }).join(', '));

  if (s3vOk) {
    S3V_KEYS.forEach(k => {
      f[k]?.classList.remove('error'); f[k]?.classList.add('correct');
      if (ico[k]) ico[k].innerHTML = CHECK_SVG;
    });
    s3vLastResult = 'correct';
    s3vFinish();
    s3vShowPopup('correct');
  } else if (s3vAttempts >= S3V.maxAttempts) {
    // Snapshot the learner's own final-wrong values BEFORE the reveal
    // overwrites the inputs — this is the only point they still exist.
    s3vAnswer = v;
    s3vView = 'solution';
    s3vLastResult = 'wrong2';
    s3vFinish();
    s3vApplyView();
  } else {
    const fc = s3vFieldStates(v);
    S3V_KEYS.forEach(k => {
      f[k]?.classList.remove('correct', 'error');
      f[k]?.classList.add(fc[k] ? 'correct' : 'error');
      if (ico[k]) ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
    s3vLastWrong = s3vSignature(i);
    document.getElementById('s3v-check').disabled = true;
    showHintButton('s3v-hint');   // hidden-until-first-wrong policy
    s3vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}
/* Single owner of the resolved-wrong board state — solution view shows
   S3V.correct in both fields (all green); answer view restores exactly
   what the learner submitted, marked PER FIELD (a box they got right
   stays green even though the attempt as a whole was wrong — same rule
   as the retry state above). Re-render can recreate unlocked elements,
   so this also re-applies the disabled/locked state. */
function s3vApplyView() {
  if (s3vAnswer === null) return;
  const i = s3vInputs(), f = s3vFields(), ico = s3vIcos();
  const showAnswer = s3vView === 'answer';
  const fc = showAnswer ? s3vFieldStates(s3vAnswer) : null;
  S3V_KEYS.forEach(k => {
    i[k].value = showAnswer ? s3vAnswer[k] : String(S3V.correct[k]);
    i[k].disabled = true;
    const ok = showAnswer ? fc[k] : true;
    f[k]?.classList.remove('correct', 'error');
    f[k]?.classList.add(ok ? 'correct' : 'error');
    if (ico[k]) ico[k].innerHTML = ok ? CHECK_SVG : WRONG_SVG;
  });
  s3vShowPopup('wrong2', s3vView);
}
// Pure view switch — NEVER calls s3vCheck(), NEVER touches attempts/done/scoring.
function s3vToggleView() {
  if (s3vAnswer === null) return;
  s3vView = (s3vView === 'solution') ? 'answer' : 'solution';
  s3vApplyView();
}
/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only - and a painter here runs on
   every navigation, so it must never reach the state writes or the reporting
   that the full sNFinish() also does. One source of truth beats copying these
   writes into the painter and letting the two drift. */
function s3vFinishDom() {
  const i = s3vInputs();
  S3V_KEYS.forEach(k => { i[k].disabled = true; });
  const chk = document.getElementById('s3v-check');
  if (chk) {
    setNavLabel(chk, 'متابعة'); chk.disabled = false;
    /* A restore lands here too: once the component has reported (s3vEnd), the button stays
       disabled so a second click is not even offered. */
    try {
      if (typeof alreadySent === 'function' && alreadySent('done', currentPartSlug())) {
        chk.disabled = true; chk.setAttribute('aria-disabled', 'true');
      }
    } catch (e) {}
  }
  hideHintButton('s3v-hint');
}

function s3vFinish() {
  s3vAnswered = true; s3vDone = true;
  s3vFinishDom();
  /* Nothing is reported HERE any more (2026-09-16). Until then both the component and the
     unit 'completed' went out at this point — where the result is decided — so an attempt was
     recorded even if the learner never clicked on. Under the platform model that ordering is
     wrong: Kata removes the part the moment 'completed' arrives (v2.7 p.23), and the learner
     would lose the feedback popup and the solution view they have just earned. The component
     'completed' therefore moved to s3vEnd(), the second click of #s3v-check ("המשך"). */
}

/* The last click of the last part: "המשך" on the resolved S3. Component 'completed' only —
   the unit-level statement (success:false, the moed-B twin) is gone: v2.5/v2.7 define object as
   item or component only, and the platform derives the unit outcome itself. Known cost,
   accepted: a learner who closes the tab after the feedback without clicking "המשך" is not
   recorded for this part. The denominator is 2, the two sections the learner was shown (6.4), read
   back out of XAPI_Q_RESULTS so the component score cannot disagree with what answered reported. */
function s3vEnd() {
  const _q07 = (XAPI_Q_RESULTS['001/q1'] ? 1 : 0) + (XAPI_Q_RESULTS['001/q2'] ? 1 : 0);
  xapiEndComponent({ success: _q07 === 2, score: { scaled: _q07 / 2 } },
                   document.getElementById('s3v-check'));
}
function s3vResetInitial() {
  s3vAttempts = 0; s3vAnswered = false; s3vLastWrong = null; s3vLastResult = null;
  s3vAnswer = null; s3vView = 'solution';
  const i = s3vInputs(), f = s3vFields(), ico = s3vIcos();
  S3V_KEYS.forEach(k => {
    if (i[k]) { i[k].value = ''; i[k].disabled = false; }
    f[k]?.classList.remove('error', 'correct');
    if (ico[k]) ico[k].innerHTML = '';
  });
  document.getElementById('s3v-popup')?.classList.add('hidden');
  document.getElementById('s3v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s3v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s3v-hint');   // hidden-until-first-wrong policy
}
function s3vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; opens, never toggles. */
  xapiRequestedHint('001', 'q2');
  document.getElementById('s3v-hint-overlay')?.classList.remove('hidden');
}
function s3vCloseHint() { document.getElementById('s3v-hint-overlay')?.classList.add('hidden'); }
function s3vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s3vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s3v-hint-overlay')?.classList.contains('hidden')) s3vCloseHint();
});
function s3vShowPopup(type, view) {
  const popup = document.getElementById('s3v-popup');
  if (!popup) return;
  const base = S3V_POPUP_CFG[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  else if (type === 'wrong2') reanchorPopupBottom(popup);
  const titleEl = document.getElementById('s3v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s3v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? '' : cfg.body.map(p => p.startsWith('<div') ? p : '<p>' + p + '</p>').join('');
  renderPopupAction('s3v-popup', cfg.action, s3vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function goBackFromS3() { goTo(2); }

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
  Motion.reveal(document.querySelector('.screen.active')); // initial screen's own entrance, once on load
  PartNav.init({
    part: '07',
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
   reading this part's screen text against metadata/methodica-math-percent-02-07.json
   and cross-checking which screens own a *Check function. Each screen carries
   the matched item's title so the derivation stays auditable without redoing
   it. Every suffix comes from metadata/ - never from a code comment and never
   from a remembered slide number (see 4.2, and 6.2 trap 2: prose in this
   family numbers screens 1-based, these keys are 0-based).

   Part 07 is the moed-B remedial twin of part 06's climax, entered only when
   climaxPassed() is false - which is why components -06 and -07 share the
   title 'שאלת שיא'. It is also terminal: s3vFinish() is where the unit's
   {success: false} completed belongs (6.5).
*/
var SCREEN_TO_SUBCONTENT = {
  0:  null,          /* מעבר - "עכשיו מגיעה שאלת השיא יש בה 2 סעיפים" */
  1:  ['001', 1],    /* השוואת התקדמות צעדים - פתיחה (שי/אלון), ללא *Check */
  2:  ['001', 2],    /* אותו פריט - סעיף א (s2qCheck) */
  3:  ['001', 3]     /* אותו פריט - סעיף ב "השלימו" (s3vCheck) */
};

/* Exactly TOTAL_SCREENS keys (4), 0..3, no gaps. A MISSING key is
   indistinguishable at runtime from null - the screen silently stops
   reporting. _test/verify-shared.js enforces the count, the contiguity and
   two-way coverage against metadata/ (6.2 traps 1 and 3). */

var XAPI_COMP_SLUG = 'methodica-math-percent-02-07';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* MUST end '/' - 6.1 */
var XAPI_EVAL_ITEMS = { '001': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-02-07.json';


/* ═══════════════ resume — the four per-part hooks (§8.7) ═══════════════
   They live here and not in the shared layer for one reason: every learner
   state variable in this file is declared `let` at top level, which puts it in
   the global LEXICAL environment. It is not reachable through window, so no
   shared function can read or write it.

   ⚠️ applyResumeVars' parameter is named `st` by family convention. This
   implementation assigns explicitly rather than through eval, so the name is
   not load-bearing here - but the reference unit's version runs
   eval(k + ' = st.vars[k]'), where renaming it fails SILENTLY, and keeping the
   name identical is what makes a future port a copy rather than a rewrite. */

function capturePartPayload() {
  /* Read from the LIVE DOM, not from a cache, for anything the learner can see
     but no variable holds (§8.9). Here that is the two input values: on the
     correct path s3vAnswer stays null, so the values the learner typed exist
     only in the inputs. Without them a resumed correct answer comes back with
     empty fields and a "correct" popup. */
  var i = s3vInputs();
  var typed = {};
  S3V_KEYS.forEach(function (k) { typed[k] = i[k] ? i[k].value : ''; });

  return {
    currentScreen: currentScreen,
    s2q: {
      selected:   s2qSelected,
      attempts:   s2qAttempts,
      answered:   s2qAnswered,
      done:       s2qDone,
      lastWrong:  s2qLastWrong,
      lastResult: s2qLastResult,
      hintUsed:   s2qHintUsed
    },
    s3v: {
      attempts:   s3vAttempts,
      answered:   s3vAnswered,
      done:       s3vDone,
      lastWrong:  s3vLastWrong,
      lastResult: s3vLastResult,
      /* §8.10, all three: the learner's own answer, which view is showing, and
         the displayed values. Without `answer` a restored solution view would
         be promoted to "what the learner answered". */
      answer:     s3vAnswer,
      view:       s3vView,
      inputs:     typed
    }
  };
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.s2q) {
    s2qSelected   = st.s2q.selected;
    s2qAttempts   = st.s2q.attempts || 0;
    s2qAnswered   = !!st.s2q.answered;
    s2qDone       = !!st.s2q.done;
    s2qLastWrong  = st.s2q.lastWrong;
    s2qLastResult = st.s2q.lastResult;
    s2qHintUsed   = !!st.s2q.hintUsed;
  }
  if (st.s3v) {
    s3vAttempts   = st.s3v.attempts || 0;
    s3vAnswered   = !!st.s3v.answered;
    s3vDone       = !!st.s3v.done;
    s3vLastWrong  = st.s3v.lastWrong;
    s3vLastResult = st.s3v.lastResult;
    s3vAnswer     = (st.s3v.answer === undefined) ? null : st.s3v.answer;
    /* Default to 'solution', matching the toggle contract that back-navigation
       always re-enters on the solution view. */
    s3vView       = st.s3v.view || 'solution';
  }
}

function applyResumeDom(st) {
  if (!st) return;
  /* ⚠️ Guard per BLOCK, not once at the top. A payload that carries one
     screen's DOM state but not another's must not skip the rest - §8.9's
     dropdown bug was exactly an early return that shadowed a later block. */
  if (st.s3v && st.s3v.inputs) {
    var i = s3vInputs();
    S3V_KEYS.forEach(function (k) {
      if (i[k] && typeof st.s3v.inputs[k] === 'string') i[k].value = st.s3v.inputs[k];
    });
  }
}

function restoreScreenUI(n) {
  /* ⚠️ NEVER delegate to resetScreenState(n), and never reach a
     sNResetInitial(). repaintScreen() calls this on EVERY navigation (§8.4a),
     and resetScreenState's not-answered branch calls sNResetInitial(), which
     clears the inputs and the selection - it would wipe a half-finished answer
     every single time the learner changes screen (§8.8 rule 5, risk 1).

     Each painter below opens with its own clean-screen guard and returns
     untouched when there is nothing to repaint. */
  if (n === 2) {
    paintSingleChoice({
      done:       s2qDone,
      attempts:   s2qAttempts,
      selected:   s2qSelected,
      lastWrong:  s2qLastWrong,
      lastResult: s2qLastResult,
      correctId:  S2Q.correctId,
      mark:       s2qMark,
      showPopup:  s2qShowPopup,
      finishDom:  s2qFinishDom,
      showHint:   function () { showHintButton('s2q-hint'); },
      updateBar:  s2qUpdateBar
    });
  }
  if (n === 3) {
    paintValueFields({
      done:        s3vDone,
      attempts:    s3vAttempts,
      answered:    s3vAnswered,
      lastWrong:   s3vLastWrong,
      lastResult:  s3vLastResult,
      answer:      s3vAnswer,
      keys:        S3V_KEYS,
      inputs:      s3vInputs,
      fields:      s3vFields,
      icos:        s3vIcos,
      fieldStates: s3vFieldStates,
      applyView:   s3vApplyView,
      showPopup:   s3vShowPopup,
      finishDom:   s3vFinishDom,
      showHint:    function () { showHintButton('s3v-hint'); },
      okGlyph:     CHECK_SVG,
      wrongGlyph:  WRONG_SVG,
      /* Deliberately omitted: s3vInputChange() would be the rule-2 recompute,
         but it also clears every field mark and hides the popup - i.e. it would
         undo the unresolved branch's own paint. The check button is instead
         left as the markup and finishDom leave it, which for an unresolved
         screen is disabled-until-edited, exactly what the live first-wrong
         state looks like. */
      checkButton: undefined
    });
  }
}
