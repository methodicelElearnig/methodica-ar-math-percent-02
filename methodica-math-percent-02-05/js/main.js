'use strict';

/* ═══════════════════════════════════════════════════════════
   js/main.js — methodica-math-percent-02-05 (part 05)

   Engine (scaleApp / goTo / resetScreenState / keyboard nav / dev
   bridge) carried over from parts 01-04 so every part behaves
   identically. Screen roster:
     S0 — TransitionScreen bridge into the harder-practice set (slide72)
     S1 — ValueInputQuestion + pie chart, "35% מתוך 400" (slide73),
          item -001 sub-part א
     S2 — ValueInputQuestion (2 inline blanks) + pie chart, "20% מעבר
          בין מגמות" (slide74), item -001 sub-part ב
     S3 — ValueInputQuestion + content image, "מונדיאל!!!" (slide75),
          item -002 (NEW item — no hint on this screen, per notesSlide66)
     S4 — ValueInputQuestion + content image, "מונדיאל!!!" continued
          (slide76), item -002 sub-part ב (hint present this time)
     S5 — ValueInputQuestion (3 stacked blanks) + content image (same
          photo again), "גילינו שיש 108 גרם..." (slide77), item -002
          sub-part ג. New "לצפייה בנתונים" reference-data toggle card
          (notesSlide68). No attempt limit / no view-toggle here — every
          wrong attempt shows the full worked solution immediately
          ("טעית, המשיכו לנסות."), unlike every earlier screen's
          maxAttempts:2 + "מעבר לתשובה שלי" pattern.
   Slide numbers are the deck's own displayed numbers and map 1:1 to
   ppt/slides/slideN.xml (re-verified this session — presentation.xml's
   sldIdLst confirms 1:1 for this range; the source pptx had been
   edited again since part 04's own session, so this was re-checked
   rather than trusted from an older citation).
   Bump TOTAL_SCREENS as more screens are added.
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

/* S0's character video — supplied 2026-08-11, decorative (no sound, no
   player controls — see the video element's own attributes in
   index.html: disablepictureinpicture + controlsList, per this
   project's standing rule for any non-educational companion-character
   clip). `still` is the same defensive-only fallback pattern every
   other part uses — shown only if the video fails to load. */
const S0_CHARACTER = {
  'character-1': {
    video: 'assets/video/Character-1-Workout.mp4',
    still: '../unit-assets/img/character-1-normal.png',
    alt:   'الشخصية على الكرسي المتحرك تتدرب'
  },
  'character-2': {
    video: 'assets/video/Character-2-Workout.mp4',
    still: '../unit-assets/img/character-2-normal.png',
    alt:   '‎الشخصية الزهرية تتدرب'
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
  /* The recall modal's id doesn't match the generic sweep (it's one
     shared overlay, not per-screen suffixed). Route through
     closeRecallPopup() rather than adding .hidden directly: it also
     re-enables the trigger, which would otherwise stay disabled forever
     if the learner navigated away with the modal open and came back to
     an already-resolved screen (s5vResetInitial, the only other place
     that re-syncs it, is skipped once s5vDone). */
  closeRecallPopup();
  /* The image-zoom modal lives outside every .screen div, so a screen
     swap alone never closes it if it's open. */
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
    // Same resume-state contract as every other View-My-Answer-Toggle
    // ValueInputQuestion in this lomda (parts 01-03's S1/S3/S4/S5/S7/S9/
    // S11/S13/etc.): resolved-correct reopens the "correct" popup,
    // resolved-wrong reopens the toggle's current view, unresolved gets
    // a fresh attempt.
    if (!s1vDone) {
      s1vResetInitial();
    } else if (s1vAnswer !== null) {
      s1vApplyView();
    } else {
      s1vShowPopup('correct');
    }
  }
  if (n === 2) {
    // Same resume-state contract, generalized to the snapshot OBJECT
    // ({cs, bio}) since this screen holds two inputs, not one.
    if (!s2vDone) {
      s2vResetInitial();
    } else if (s2vAnswer !== null) {
      s2vApplyView();
    } else {
      s2vShowPopup('correct');
    }
  }
  if (n === 3) {
    // Same resume-state contract — no hint state to restore here (this
    // screen has none).
    if (!s3vDone) {
      s3vResetInitial();
    } else if (s3vAnswer !== null) {
      s3vApplyView();
    } else {
      s3vShowPopup('correct');
    }
  }
  if (n === 4) {
    // Hint IS present on this screen (unlike S3) — back to the
    // template baseline (hidden until first wrong).
    if (!s4vDone) {
      s4vResetInitial();
    } else if (s4vAnswer !== null) {
      s4vApplyView();
    } else {
      s4vShowPopup('correct');
    }
  }
  if (n === 5) {
    // Same resume-state contract as S1-S4 now that this screen also has
    // a final-wrong state to come back to (resolved-wrong reopens the
    // toggle's current view; resolved-correct reopens the correct popup).
    if (!s5vDone) {
      s5vResetInitial();
    } else if (s5vAnswer !== null) {
      s5vApplyView();
    } else {
      s5vShowPopup('correct');
    }
  }
  // Re-sync the progress nav on every entry so a question resolved
  // earlier still shows its V/X when the learner navigates back into
  // any of its screens. S0 has no nav (it is the TransitionScreen).
  if (n >= 1 && n <= 5) syncPracticeProgressNav(document.getElementById('s' + n));
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL COMPONENT — Progress Question nav (2 questions)
   Added 2026-08-20 (producer instruction). Ported from part 03's own
   copy; the only thing that differs is the question model below.

   This part's five question screens group into TWO questions:
     Q1 = S1 + S2   (sub-parts א+ב)
     Q2 = S3 + S4 + S5 (sub-parts א+ב+ג)

   A question shows V/X ONLY once EVERY one of its screens is answered
   (`outcomes.every(o => o !== null)`), and V requires ALL of them to be
   correct — so a learner who gets S3 right but S4 wrong sees nothing on
   Q2 until S5 is answered, and then sees X. That is exactly the
   producer's rule; it falls out of practiceQuestionState() unchanged.
   ═══════════════════════════════════════════════════════════ */
const PRACTICE_QUESTIONS = [
  { number: 1, screens: [1, 2] },
  { number: 2, screens: [3, 4, 5] }
];

/* One getter per question screen: null while unresolved, else
   'correct'/'incorrect'. Each reads that screen's OWN existing state —
   no parallel tracking. Every screen here is a ValueInputQuestion, so
   they all share the same shape: sXvAnswer stays null on the correct
   path and is snapshotted with the learner's wrong value only on the
   final-wrong reveal. */
const PRACTICE_SCREEN_OUTCOME = {
  1: () => s1vDone ? (s1vAnswer === null ? 'correct' : 'incorrect') : null,
  2: () => s2vDone ? (s2vAnswer === null ? 'correct' : 'incorrect') : null,
  3: () => s3vDone ? (s3vAnswer === null ? 'correct' : 'incorrect') : null,
  4: () => s4vDone ? (s4vAnswer === null ? 'correct' : 'incorrect') : null,
  5: () => s5vDone ? (s5vAnswer === null ? 'correct' : 'incorrect') : null
};


/* Generic renderer — one copy for every screen. `visited` is DERIVED
   (state !== 'not-answered'), not a second stored flag. */
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


/* Cross-part navigation trail (js/partnav.js). Must run AFTER the two
   lines above: if this page was entered via a Back from part 06, init()
   jumps straight to the screen the learner left from, and it does that
   through goTo() so the landed screen gets the normal
   cancel/activate/reveal/resetScreenState treatment instead of a second,
   conflicting initial reveal. */

/* Crossing into part 06 from this part's own last screen (S5) — the
   FIRST actual cross-part navigation in this project (parts 01-05 never built one: each part's last screen's Continue called
   advanceScreen() into a deliberate no-op, since goTo() bounds-checks
   n against TOTAL_SCREENS and there was never a next screen to land
   on). Centralized here rather than in s5vCheck() specifically so it
   applies uniformly to every path that calls advanceScreen() (button
   click AND the ArrowLeft keyboard shortcut below, which — like every
   other screen's arrow-key transition in this project — does not gate
   on whether the current screen is answered). Sibling-folder relative
   path, matching how these parts already sit next to each other on
   disk (methodica-math-percent-02-05/ → ../methodica-math-percent-02-06/). */
function advanceScreen() {
  // Re-crossing forward after a cross-part Back. Load-bearing HERE:
  // s5vDone below is per-page state that dies with the page, so a
  // learner returning from part 06 would land on S5 and be refused by
  // their own already-satisfied completion gate. Checked BEFORE that
  // gate for exactly that reason. See "RE-CROSSING FORWARD" in
  // js/partnav.js.
  const returnForward = PartNav.forwardOverride();
  if (returnForward && currentScreen + 1 >= TOTAL_SCREENS) {
    PartNav.forward(returnForward);
    return;
  }
  // S5's own COMPLETION gate -- resolved-either-way, never correctness.
  // s5vDone is set by s5vFinish(), which both the correct branch and the
  // final-wrong branch call, so a learner who exhausts both attempts
  // still leaves for part 06 (this is a reinforcement-practice stage: no
  // score aggregate, no pass/fail edge at the part boundary). Gated here
  // rather than only inside s5vCheck() so the ArrowLeft keyboard
  // shortcut below -- which calls advanceScreen() directly -- cannot
  // bypass it, matching every other per-screen gate in this lomda.
  if (currentScreen === 5 && !s5vDone) return;
  if (currentScreen + 1 >= TOTAL_SCREENS) {
    /* xAPI: the component result, reported at the one boundary this part
       has. There is NO pass/fail gate here - the S5 gate above is
       resolved-either-way, never correctness, because this is a
       reinforcement-practice stage (see its comment). Nothing is gated on
       `success` and no learner is routed by it.
       MOE 2026-10-08: real score, success only ≥60%, no gate, nothing shown
       (was: all five sections right).

       The denominator is 5, the five catalogue questions across items 001
       and 002 - i.e. the five sections the learner actually answered. The
       opening screen promises "2 שאלות מתקדמות", which is the two ITEMS;
       the sections are what carry results, so they are what the score is
       over (6.4: the score denominator may be wider than the gating set).
       Read back out of XAPI_Q_RESULTS rather than recomputed, so it cannot
       disagree with what the five answered calls reported.

       Not reported on the returnForward path above: that is a re-crossing
       after a cross-part Back, where this page's results are already gone. */
    const _keys05 = ['001/q1', '001/q2', '002/q1', '002/q2', '002/q3'];
    const _n05 = _keys05.filter(function (k) { return XAPI_Q_RESULTS[k]; }).length;
    const _s05 = _n05 / _keys05.length;
    xapiEndComponent({ success: _s05 >= 0.6,
                       score: { scaled: _s05 } }, xapiActiveContinueButton());

    PartNav.forward('06');   // dev-only (DEV_NAV); the platform routes since 2026-09-16
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
   Shared feedback-popup helpers — position reset, canvas clamp, in-popup
   action button, and dragging. Ported verbatim from part 03 (same
   generic contract: popup id is a parameter, so any future question
   screen in this part reuses these rather than growing its own copy).
   ═══════════════════════════════════════════════════════════ */


const CHECK_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 12" fill="none" aria-hidden="true">' +
  '<path d="M4.52036 12C4.12296 12.0002 3.74183 11.8126 3.46106 11.4787L0.258452 7.67744C-0.0861507 7.26814 -0.0861507 6.60467 0.258452 6.19536C0.603165 5.78619 1.16194 5.78619 1.50666 6.19536L4.52036 9.77374L12.4933 0.306878C12.8381 -0.102293 13.3968 -0.102293 13.7415 0.306878C14.0862 0.716179 14.0862 1.37966 13.7415 1.78896L5.57966 11.4787C5.29889 11.8126 4.91776 12.0002 4.52036 12Z" fill="#609E12"/>' +
  '</svg>';
const WRONG_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
  '<path d="M13.6743 0.325691C13.4657 0.117151 13.1828 0 12.8879 0C12.5929 0 12.31 0.117151 12.1014 0.325691L7 5.42709L1.8986 0.325691C1.69 0.117151 1.40711 0 1.11215 0C0.817183 0 0.534294 0.117151 0.325691 0.325691C0.117151 0.534294 0 0.817183 0 1.11215C0 1.40711 0.117151 1.69 0.325691 1.8986L5.42709 7L0.325691 12.1014C0.117151 12.31 0 12.5929 0 12.8879C0 13.1828 0.117151 13.4657 0.325691 13.6743C0.534294 13.8829 0.817183 14 1.11215 14C1.40711 14 1.69 13.8829 1.8986 13.6743L7 8.57291L12.1014 13.6743C12.31 13.8829 12.5929 14 12.8879 14C13.1828 14 13.4657 13.8829 13.6743 13.6743C13.8829 13.4657 14 13.1828 14 12.8879C14 12.5929 13.8829 12.31 13.6743 12.1014L8.57291 7L13.6743 1.8986C13.8829 1.69 14 1.40711 14 1.11215C14 0.817183 13.8829 0.534294 13.6743 0.325691Z" fill="#B20010"/>' +
  '</svg>';

/* ═══════════════════════════════════════════════════════════
   Pie chart — "advanced1" (slide73's alt text names it), drawn as live
   SVG rather than shipping the PPTX's own image, which bakes every
   label into the bitmap. Colours pixel-sampled from that same source
   PNG (ppt/media/image63.png, confirmed byte-identical composition to
   the producer's separately-supplied reference image) via a headless-
   Chrome canvas harness — not eyeballed — same method part 03's own
   pie chart used. Order is CLOCKWISE FROM 12 O'CLOCK, matching the
   source image exactly (boundaries measured at 4°/39.5°/93.5°/184°/
   310°, i.e. starting essentially at 12 o'clock once bbox-detection
   noise is accounted for). Percentages are the exact values from
   notesSlide64.xml, not the ~0.1-0.2%-off measured spans.
   Labels sit INSIDE each wedge in bold white text (percentage line
   first, then the field name split across 1-2 lines exactly as the
   source image wraps it) — this matches THIS slide's own alt-text
   description of the intended design, not part 03's own pie chart's
   outside-the-ring convention (a different component/source, not the
   same one reused). */
/* `lr` (label-anchor radius) is an OVERRIDE, not a fixed constant — the
   two narrowest wedges (כלכלה 36° sweep, תקשורת 54°) need their 3-line
   label block (percent + 2-line name) pushed further from centre than
   the default, since a pie wedge is narrower near the centre and a
   vertically-stacked text block's top/bottom lines drift toward the
   wedge's angled boundaries the closer the anchor sits to the apex —
   confirmed by measuring wedge width at the label's own y-coordinate,
   not by eyeballing. Producer caught "כלכלה" spilling into the
   neighbouring wedge at the old shared radius (100). */
const PIE_SEGMENTS = [
  { pct: 10, color: '#8e87da', name: ['تخصص', 'الاقتصاد'], lr: 130 },
  { pct: 15, color: '#4674b4', name: ['تخصص الفن'] },
  { pct: 25, color: '#4b8897', name: ['تخصص البيولوجيا'] },
  { pct: 35, color: '#5293c7', name: ['تخصص الحاسوب'] },
  { pct: 15, color: '#7c88c4', name: ['تخصص', 'الإعلام'], lr: 118 }
];
const PIE_ALT = 'مخطط دائري يعرض توزيع خمسة تخصصات دراسية: تخصص الحاسوب (35%)، تخصص البيولوجيا (25%)، تخصص الفن (15%)، تخصص الإعلام (15%) وتخصص الاقتصاد (10%).';


function pieChartSVG() {
  const CX = 180, CY = 180, R = 170, LR_DEFAULT = 105;   // default label-anchor radius
  const LINE_H = 20;
  let angle = 0;
  const wedges = [], labels = [];
  PIE_SEGMENTS.forEach(seg => {
    const sweep = seg.pct * 3.6;
    wedges.push('<path d="' + pieSlicePath(CX, CY, R, angle, angle + sweep) +
                '" fill="' + seg.color + '" stroke="#fff" stroke-width="1.5"/>');
    const mid = angle + sweep / 2;
    const rad = (mid - 90) * Math.PI / 180;
    const LR = seg.lr || LR_DEFAULT;
    const lx = CX + LR * Math.cos(rad), ly = CY + LR * Math.sin(rad);
    // Percentage line, then 1-2 name lines, stacked and vertically
    // centred on the anchor point.
    const lines = [seg.pct + '%'].concat(seg.name);
    const n = lines.length;
    lines.forEach((text, i) => {
      const y = ly + (i - (n - 1) / 2) * LINE_H;
      labels.push('<text class="pie-label" x="' + lx.toFixed(1) + '" y="' + y.toFixed(1) +
        '" text-anchor="middle" dominant-baseline="middle">' + text + '</text>');
    });
    angle += sweep;
  });
  return '<svg viewBox="0 0 360 360" role="img" aria-label="' + PIE_ALT + '">' +
         wedges.join('') + labels.join('') + '</svg>';
}
function renderPieCharts() {
  // S1 and S2 show the same unchanging distribution — build the SVG
  // once and reuse its markup for every .pie-figure host rather than
  // recomputing an identical chart per screen.
  const svg = pieChartSVG();
  document.querySelectorAll('.pie-figure').forEach(host => {
    host.innerHTML = svg;
  });
}
renderPieCharts();

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion + pie chart (Screen 02 · S1, slide73).
   Item methodica-math-percent-02-05-001, sub-part א. Hint hidden until
   first wrong attempt (template baseline — no override note on this
   slide). Correct = 140 (35% of 400). Explanation equation/"x = 140"
   line are OMML in the source (invisible to the raw text dump, same
   gotcha this project has hit before) — rebuilt from the rendered
   mockups (media/image105.png correct / image107.png wrong2, which
   share the identical body per the established "shared explanation"
   default).
   ═══════════════════════════════════════════════════════════ */
/* Table added after the producer flagged it missing against the pptx's
   own rendered mockup — column order [מספר תלמידים right, אחוז left]
   matches this project's own established count-right/percent-left
   convention (same as every other proportion table in this series). */
const S1V_EXPLAIN =
  '<p>نحلّ بواسطة جدول التناسب‎:</p>' +
  '<table class="eq-table"><tr><th>عدد الطلاب</th><th>النسبة المئوية</th></tr>' +
  '<tr><td>x</td><td>35%</td></tr>' +
  '<tr><td>400</td><td>100%</td></tr></table>' +
  '<div class="eq-row">' + frac(35, 100) + '<span>=</span>' + frac('x', 400) + '</div>' +
  '<p><span dir="ltr" style="unicode-bidi:isolate">x = 140</span></p>' +
  '<p>الاستنتاج: 140 طالبًا سجلوا لتخصص الحاسوب‎.</p>';

const S1V = {
  correct: 140, maxAttempts: 2,
  popup: {
    retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
    correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S1V_EXPLAIN
    /* PROJECT-WIDE FINAL-WRONG RULE (producer, 2026-09-01): every
       `wrong2` title — the popup shown after the LAST attempt — ends
       with a line break and a second line, "התשובה הנכונה מוצגת.", which
       the .scq-popup-title rule renders bold along with the first line.
       The title is therefore written to the element with innerHTML, not
       textContent. Deliberately NOT applied to `retry`, to `correct`, or
       to a wrong2 `answerView` — the answer view shows the learner's own
       answer, not the correct one. */
    wrong2:  { bg: '#ffdbdc', title: '‎أخطأتم، لا بأس‎!<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
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
let s1vAnswer = null;
let s1vView   = 'solution';

function s1vInputChange() {
  if (s1vAnswered) return;
  const inp = document.getElementById('s1v-input');
  const chk = document.getElementById('s1v-check');
  const ico = document.getElementById('s1v-input-ico');
  document.getElementById('s1v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s1v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
  if (chk) chk.disabled = (v === '') || (v === s1vLastWrongValue);
}
function s1vIsCorrect(raw) {
  if (String(raw).trim() === '') return false;
  return Number(raw) === S1V.correct;
}
function s1vCheck() {
  if (s1vAnswered) { advanceScreen(); return; }
  const inp = document.getElementById('s1v-input');
  const ico = document.getElementById('s1v-input-ico');
  if (!inp || inp.value.trim() === '') return;
  s1vAttempts++;
  const field = document.getElementById('s1v-field');
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s1vOk = s1vIsCorrect(inp.value);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. The response is read from the live
     input HERE and not later: the final-wrong branch reveals the solution
     into that same input, after which .value is no longer the learner's. */
  xapiAnswered('001', 'q1', s1vOk,
    s1vOk || s1vAttempts >= S1V.maxAttempts,
    inp.value.trim());

  if (s1vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = CHECK_SVG;
    s1vFinish();
    s1vShowPopup('correct');
  } else if (s1vAttempts >= S1V.maxAttempts) {
    s1vAnswer = inp.value.trim();
    s1vView = 'solution';
    s1vFinish();
    s1vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = WRONG_SVG;
    s1vLastWrongValue = inp.value.trim();
    document.getElementById('s1v-check').disabled = true;
    showHintButton('s1v-hint');   // hidden-until-first-wrong policy
    s1vShowPopup('retry');
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
function s1vApplyView() {
  if (s1vAnswer === null) return;
  const inp = document.getElementById('s1v-input');
  const ico = document.getElementById('s1v-input-ico');
  const field = document.getElementById('s1v-field');
  if (inp) {
    inp.value = (s1vView === 'answer') ? s1vAnswer : String(S1V.correct);
    field?.classList.remove('correct', 'error');
    field?.classList.add(s1vView === 'answer' ? 'error' : 'correct');
    if (ico) ico.innerHTML = (s1vView === 'answer') ? WRONG_SVG : CHECK_SVG;
  }
  s1vShowPopup('wrong2', s1vView);
}
function s1vToggleView() {
  if (s1vAnswer === null) return;
  s1vView = (s1vView === 'solution') ? 'answer' : 'solution';
  s1vApplyView();
}
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
  s1vAnswered = true; s1vDone = true;
  s1vFinishDom();
}
function s1vResetInitial() {
  s1vAttempts = 0; s1vAnswered = false; s1vLastWrongValue = null;
  s1vAnswer = null; s1vView = 'solution';
  const inp = document.getElementById('s1v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s1v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s1v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s1v-popup')?.classList.add('hidden');
  document.getElementById('s1v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s1v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s1v-hint');   // hidden-until-first-wrong policy
}
function s1vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('001', 'q1');
  document.getElementById('s1v-hint-overlay')?.classList.remove('hidden');
}
function s1vCloseHint() { document.getElementById('s1v-hint-overlay')?.classList.add('hidden'); }
function s1vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s1vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s1v-hint-overlay')?.classList.contains('hidden')) s1vCloseHint();
});
function s1vShowPopup(type, view) {
  const popup = document.getElementById('s1v-popup');
  if (!popup) return;
  const base = S1V.popup[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  else if (type === 'wrong2') reanchorPopupBottom(popup);
  const titleEl = document.getElementById('s1v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s1v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S1V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s1v-popup', cfg.action, s1vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function goBackFromS1() { goTo(0); }

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, TWO inline blanks + pie chart
   (Screen 03 · S2, slide74). Item methodica-math-percent-02-05-001,
   sub-part ב (continues S1's item — same registration data, same pie
   chart, "20% מעבר בין מגמות" scenario). Hint hidden until first wrong
   (no override note — template baseline, same as S1).

   Correct = {cs: 112, bio: 128}. Both blanks validated HOLISTICALLY as
   one unit (same pattern as part 01's multi-field screens) — a single
   right/wrong outcome, not per-field feedback, matching the source's
   own single "נכון!"/"טעית" popup covering both answers together.

   Explanation is entirely OMML in the source — the flattened text dump
   was missing not just the equations but a WHOLE extra paragraph
   ("קודם נחשב... לפני השינוי:" + its own 25%·400=100 equation) that
   only the rendered mockup (media/image108.png correct / image109.png
   wrong2, identical body) revealed. Rebuilt as live HTML from that
   mockup, not the incomplete text dump.
   ═══════════════════════════════════════════════════════════ */
/* Every equation ends in a "NUMBER תלמידים" phrase — under this row's
   own direction:ltr (needed so the "=" chain reads in standard maths
   order), the DOM order for that trailing pair must be [תלמידים, number]
   so it renders with the word to the NUMBER'S LEFT (matching natural
   Hebrew right-to-left reading of "100 תלמידים": the numeral sits at
   the phrase's own right edge, the word continues further left) —
   producer caught the original build with the word on the number's
   RIGHT instead, i.e. plain DOM order [number, word]. */
const S2V_EXPLAIN =
  '<p>أولًا نحسب كم طالبًا سجلوا لتخصص البيولوجيا قبل التغيير‎:</p>' +
  '<div class="eq-row"><span>25%</span><span>&middot;</span><span>400</span><span>=</span>' +
    frac(25, 100) + '<span>&middot;</span><span>400</span><span>=</span><span>طالب</span><span>100</span></div>' +
  '<p>%20 ‎من أصل 140 طالبًا سجلوا لتخصص الحاسوب نقلوا تسجيلهم إلى تخصص البيولوجيا، أي‎:</p>' +
  '<div class="eq-row"><span>20%</span><span>&middot;</span><span>140</span><span>=</span>' +
    frac(20, 100) + '<span>&middot;</span><span>140</span><span>=</span><span>طالبًا</span><span>28</span></div>' +
  '<p>نضيف 28 طالبًا إلى المسجلين لتخصص البيولوجيا:</p>' +
  '<div class="eq-row"><span dir="ltr">100 + 28 =</span><span>طالبًا</span><span dir="ltr">128</span></div>' +
  '<p>نطرح 28 طالبًا من المسجلين لتخصص الحاسوب‎:</p>' +
  '<div class="eq-row"><span dir="ltr">140 - 28 =</span><span>طالبًا</span><span dir="ltr">112</span></div>';

const S2V = {
  correct: { cs: 112, bio: 128 }, maxAttempts: 2,
  popup: {
    retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
    correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S2V_EXPLAIN
    wrong2:  { bg: '#ffdbdc', title: '‎أخطأتم، كل خطأ يعمّق المعرفة.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
               action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
               answerView: {
                 title: 'الإجابة غير صحيحة‎.',
                 body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
                 action: { label: 'الإجابة الصحيحة', view: 'solution' }
               } }
  }
};

let s2vAttempts = 0, s2vAnswered = false, s2vDone = false;
let s2vLastWrong = null;   // joined signature of both fields
let s2vAnswer = null;      // { cs, bio } snapshot of the learner's own final-wrong values
let s2vView   = 'solution';

function s2vInputs() {
  return {
    cs:  document.getElementById('s2v-input-cs'),
    bio: document.getElementById('s2v-input-bio')
  };
}
function s2vFields() {
  return {
    cs:  document.getElementById('s2v-field-cs'),
    bio: document.getElementById('s2v-field-bio')
  };
}
function s2vIcos() {
  return {
    cs:  document.getElementById('s2v-input-ico-cs'),
    bio: document.getElementById('s2v-input-ico-bio')
  };
}
function s2vSignature(i) { return i.cs.value.trim() + '|' + i.bio.value.trim(); }

function s2vInputChange() {
  if (s2vAnswered) return;
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  f.cs?.classList.remove('error', 'correct');
  f.bio?.classList.remove('error', 'correct');
  if (ico.cs) ico.cs.innerHTML = '';
  if (ico.bio) ico.bio.innerHTML = '';
  document.getElementById('s2v-popup')?.classList.add('hidden');
  const chk = document.getElementById('s2v-check');
  const hasAll = i.cs.value.trim() !== '' && i.bio.value.trim() !== '';
  if (chk) chk.disabled = !hasAll || (s2vSignature(i) === s2vLastWrong);
}
const S2V_KEYS = ['cs', 'bio'];
/* Per-field correctness map. The sub-part as a whole is right only when
   BOTH boxes are (s2vIsCorrect below), but the learner must still be
   shown WHICH box they got right and which they missed — producer rule
   (2026-08-19, first applied to part 01's S8; extended to every
   multi-input screen 2026-08-26). Never mark both boxes red just
   because the pair as a whole is wrong. */
function s2vFieldStates(v) {
  const o = {}; S2V_KEYS.forEach(k => o[k] = Number(v[k]) === S2V.correct[k]); return o;
}
function s2vIsCorrect(v) {
  return S2V_KEYS.every(k => Number(v[k]) === S2V.correct[k]);
}
function s2vCheck() {
  if (s2vAnswered) { advanceScreen(); return; }
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  if (i.cs.value.trim() === '' || i.bio.value.trim() === '') return;
  const v = { cs: i.cs.value.trim(), bio: i.bio.value.trim() };
  s2vAttempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s2vOk = s2vIsCorrect(v);

  /* xAPI: answered - before the branches so all three paths report.
     Values come from `v` rather than the DOM: the final-wrong branch
     reveals the solution into those same inputs. */
  xapiAnswered('001', 'q2', s2vOk,
    s2vOk || s2vAttempts >= S2V.maxAttempts,
    ['cs', 'bio'].map(function (k) { return k + '=' + v[k]; }).join(', '));

  if (s2vOk) {
    f.cs?.classList.remove('error'); f.cs?.classList.add('correct');
    f.bio?.classList.remove('error'); f.bio?.classList.add('correct');
    if (ico.cs) ico.cs.innerHTML = CHECK_SVG;
    if (ico.bio) ico.bio.innerHTML = CHECK_SVG;
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
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}
function s2vApplyView() {
  if (s2vAnswer === null) return;
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  const showAnswer = s2vView === 'answer';
  /* Solution view is the correct answer, so both boxes are green. Answer
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
  i.cs.disabled = true; i.bio.disabled = true;
  const chk = document.getElementById('s2v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s2v-hint');
  syncPracticeProgressNav(document.getElementById('s2'));
}

function s2vFinish() {
  s2vAnswered = true; s2vDone = true;
  s2vFinishDom();
}
function s2vResetInitial() {
  s2vAttempts = 0; s2vAnswered = false; s2vLastWrong = null;
  s2vAnswer = null; s2vView = 'solution';
  const i = s2vInputs(), f = s2vFields(), ico = s2vIcos();
  [i.cs, i.bio].forEach(el => { if (el) { el.value = ''; el.disabled = false; } });
  [f.cs, f.bio].forEach(el => el?.classList.remove('error', 'correct'));
  if (ico.cs) ico.cs.innerHTML = '';
  if (ico.bio) ico.bio.innerHTML = '';
  document.getElementById('s2v-popup')?.classList.add('hidden');
  document.getElementById('s2v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s2v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s2v-hint');   // hidden-until-first-wrong policy
}
function s2vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('001', 'q2');
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
   TEMPLATE — ValueInputQuestion + content image (Screen 05 · S3,
   slide75). Item methodica-math-percent-02-05-002 (a NEW item).
   NO HINT on this screen (notesSlide66.xml: "שימו לב שאין רמז") — the
   first ValueInputQuestion in this project's lomda-wide question set
   built without one; every hint-related step other screens have is
   simply absent here (no hint button in the markup, nothing to
   reveal/hide in the JS below). Correct = 108 (18% of 600).

   Explanation shows BOTH the fraction and decimal conversion methods,
   separated by "או" — same shape as part 03's own S1, rebuilt from the
   rendered mockup (media/image110.png correct / image111.png wrong2,
   identical body) since the equations are OMML in the source. Every
   "NUMBER תלמידים"-style unit phrase — here "108 גרם" — follows the
   same word-before-number DOM order already corrected on S2 (natural
   Hebrew right-to-left reading places the numeral at the phrase's own
   right edge, the word further left).
   ═══════════════════════════════════════════════════════════ */
const S3V_EXPLAIN =
  '<p>نوضح الحل من خلال تحويل النسبة المئوية إلى كسر‎:</p>' +
  '<div class="eq-row"><span>18%</span><span>&middot;</span><span>600</span><span>=</span>' +
    frac(18, 100) + '<span>&middot;</span><span>600</span><span>=</span><span>غرام</span><span>108</span></div>' +
  '<p class="eq-or">أو</p>' +
  '<div class="eq-row"><span>18%</span><span>&middot;</span><span>600</span><span>=</span>' +
    '<span>0.18</span><span>&middot;</span><span>600</span><span>=</span><span>غرام</span><span>108</span></div>' +
  '<p>يوجد 108 غرام من الجوز في الخليط‎.</p>';

const S3V = {
  correct: 108, maxAttempts: 2,
  popup: {
    retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
    correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S3V_EXPLAIN
    wrong2:  { bg: '#ffdbdc', title: 'أخطأتم. لا بأس، نتعلّم من الأخطاء أيضًا ونتحسن من تمرين لآخر.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
               action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
               answerView: {
                 title: 'الإجابة غير صحيحة‎.',
                 body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
                 action: { label: 'الإجابة الصحيحة', view: 'solution' }
               } }
  }
};

let s3vAttempts = 0, s3vAnswered = false, s3vDone = false;
let s3vLastWrongValue = null;
let s3vAnswer = null;
let s3vView   = 'solution';

function s3vInputChange() {
  if (s3vAnswered) return;
  const inp = document.getElementById('s3v-input');
  const chk = document.getElementById('s3v-check');
  const ico = document.getElementById('s3v-input-ico');
  document.getElementById('s3v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s3v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
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
     final-wrong paths each report once. The response is read from the live
     input HERE and not later: the final-wrong branch reveals the solution
     into that same input, after which .value is no longer the learner's. */
  xapiAnswered('002', 'q1', s3vOk,
    s3vOk || s3vAttempts >= S3V.maxAttempts,
    inp.value.trim());

  if (s3vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = CHECK_SVG;
    s3vFinish();
    s3vShowPopup('correct');
  } else if (s3vAttempts >= S3V.maxAttempts) {
    s3vAnswer = inp.value.trim();
    s3vView = 'solution';
    s3vFinish();
    s3vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = WRONG_SVG;
    s3vLastWrongValue = inp.value.trim();
    document.getElementById('s3v-check').disabled = true;
    // No hint on this screen — nothing to reveal here (compare S1/S2's
    // showHintButton() call at this exact point).
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
    if (ico) ico.innerHTML = (s3vView === 'answer') ? WRONG_SVG : CHECK_SVG;
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
  syncPracticeProgressNav(document.getElementById('s3'));
}

function s3vFinish() {
  s3vAnswered = true; s3vDone = true;
  s3vFinishDom();
}
function s3vResetInitial() {
  s3vAttempts = 0; s3vAnswered = false; s3vLastWrongValue = null;
  s3vAnswer = null; s3vView = 'solution';
  const inp = document.getElementById('s3v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s3v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s3v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s3v-popup')?.classList.add('hidden');
  const chk = document.getElementById('s3v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function s3vShowPopup(type, view) {
  const popup = document.getElementById('s3v-popup');
  if (!popup) return;
  const base = S3V.popup[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  else if (type === 'wrong2') reanchorPopupBottom(popup);
  const titleEl = document.getElementById('s3v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s3v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S3V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s3v-popup', cfg.action, s3vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function goBackFromS3() { goTo(2); }

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion + content image (Screen 06 · S4,
   slide76). Item methodica-math-percent-02-05-002, sub-part ב
   (continues S3's item — same "מונדיאל" context/photo). Correct = 360
   (15%+45%=60% of 600). Hint IS present here (no override note, unlike
   S3's explicit "no hint" — back to the template's own hidden-until-
   first-wrong baseline).

   Same image slot as S3 reuses assets/img/mondial-scene.png — the
   slide's own picture shape ("תמונה 18") actually embeds image70.png,
   which is a duplicate of the CORRECT-feedback mockup (image113.png,
   byte-identical content), not a scene photo. Confirmed authoring
   mistake, not intentional: the shape sits at the exact byte-identical
   off/ext as S3's own real scene image, and this slide's own alt text
   (notesSlide67.xml) describes the SAME Messi/Di María/Pedri/Lamine
   Yamal scene S3 already used, not a feedback graphic. Building what
   the shape ACTUALLY embeds would show a green "נכון!" card as if it
   were the content photo — reusing the real scene image is the
   correct call per this project's "rendered mockup / actual intent
   wins over a raw shape embed" rule, extended here to an embed that's
   simply wrong rather than merely stale.

   The on-canvas "לא ראיתי יעד שמדבר על חיבור או חיסור אחוזים, אז מניח
   שבסדר" shape is a reviewer/production note (curriculum-alignment
   sanity check), not learner content — same call as S3's removed
   "שאלה אוריינית" badge, deliberately not built despite sitting
   on-canvas (see [[project state]] — this is the second such case in
   this project, worth checking for on every future screen).

   Explanation has an extra "15%+45%=60%" line before the quantity
   equations (all OMML, rebuilt from media/image113.png correct /
   image114.png wrong2, identical body) — same fraction/decimal "או"
   shape as S3, with the same word-before-number order for "360 גרם".
   ═══════════════════════════════════════════════════════════ */
const S4V_EXPLAIN =
  '<p>نجمع النسب المئوية للوز والفول السوداني‎:</p>' +
  '<div class="eq-row"><span>15%</span><span>+</span><span>45%</span><span>=</span><span>60%</span></div>' +
  '<p>والآن نحسب الكمية‎:</p>' +
  '<div class="eq-row"><span>60%</span><span>&middot;</span><span>600</span><span>=</span>' +
    frac(60, 100) + '<span>&middot;</span><span>600</span><span>=</span><span>غرام</span><span>360</span></div>' +
  '<p class="eq-or">أو</p>' +
  '<div class="eq-row"><span>60%</span><span>&middot;</span><span>600</span><span>=</span>' +
    '<span>0.6</span><span>&middot;</span><span>600</span><span>=</span><span>غرام</span><span>360</span></div>' +
  '<p>يوجد 360 غرام من اللوز والفول السوداني في الخليط‎.</p>';

const S4V = {
  correct: 360, maxAttempts: 2,
  popup: {
    retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
    correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S4V_EXPLAIN
    wrong2:  { bg: '#ffdbdc', title: 'أخطأتم. لا بأس، نتعلّم من الأخطاء أيضًا ونتحسن من تمرين لآخر.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
               action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
               answerView: {
                 title: 'الإجابة غير صحيحة‎.',
                 body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
                 action: { label: 'الإجابة الصحيحة', view: 'solution' }
               } }
  }
};

let s4vAttempts = 0, s4vAnswered = false, s4vDone = false;
let s4vLastWrongValue = null;
let s4vAnswer = null;
let s4vView   = 'solution';

function s4vInputChange() {
  if (s4vAnswered) return;
  const inp = document.getElementById('s4v-input');
  const chk = document.getElementById('s4v-check');
  const ico = document.getElementById('s4v-input-ico');
  document.getElementById('s4v-field')?.classList.remove('error');
  if (ico) ico.innerHTML = '';
  document.getElementById('s4v-popup')?.classList.add('hidden');
  const v = inp.value.trim();
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
     final-wrong paths each report once. The response is read from the live
     input HERE and not later: the final-wrong branch reveals the solution
     into that same input, after which .value is no longer the learner's. */
  xapiAnswered('002', 'q2', s4vOk,
    s4vOk || s4vAttempts >= S4V.maxAttempts,
    inp.value.trim());

  if (s4vOk) {
    field?.classList.remove('error');
    field?.classList.add('correct');
    if (ico) ico.innerHTML = CHECK_SVG;
    s4vFinish();
    s4vShowPopup('correct');
  } else if (s4vAttempts >= S4V.maxAttempts) {
    s4vAnswer = inp.value.trim();
    s4vView = 'solution';
    s4vFinish();
    s4vApplyView();
  } else {
    field?.classList.add('error');
    if (ico) ico.innerHTML = WRONG_SVG;
    s4vLastWrongValue = inp.value.trim();
    document.getElementById('s4v-check').disabled = true;
    showHintButton('s4v-hint');   // hidden-until-first-wrong policy
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
    if (ico) ico.innerHTML = (s4vView === 'answer') ? WRONG_SVG : CHECK_SVG;
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
  s4vAnswered = true; s4vDone = true;
  s4vFinishDom();
}
function s4vResetInitial() {
  s4vAttempts = 0; s4vAnswered = false; s4vLastWrongValue = null;
  s4vAnswer = null; s4vView = 'solution';
  const inp = document.getElementById('s4v-input');
  if (inp) { inp.value = ''; inp.disabled = false; }
  document.getElementById('s4v-field')?.classList.remove('error', 'correct');
  const ico = document.getElementById('s4v-input-ico');
  if (ico) ico.innerHTML = '';
  document.getElementById('s4v-popup')?.classList.add('hidden');
  document.getElementById('s4v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s4v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s4v-hint');   // hidden-until-first-wrong policy
}
function s4vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('002', 'q2');
  document.getElementById('s4v-hint-overlay')?.classList.remove('hidden');
}
function s4vCloseHint() { document.getElementById('s4v-hint-overlay')?.classList.add('hidden'); }
function s4vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s4vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s4v-hint-overlay')?.classList.contains('hidden')) s4vCloseHint();
});
function s4vShowPopup(type, view) {
  const popup = document.getElementById('s4v-popup');
  if (!popup) return;
  const base = S4V.popup[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  else if (type === 'wrong2') reanchorPopupBottom(popup);
  const titleEl = document.getElementById('s4v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s4v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S4V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s4v-popup', cfg.action, s4vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}
function goBackFromS4() { goTo(3); }

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, THREE stacked blanks + content image
   (Screen 09 · S5, slide77). Item methodica-math-percent-02-05-002,
   sub-part ג (continues S3/S4's item — same photo, same 600g mixture,
   same 18/15/45% split). Hint hidden until first wrong (template
   baseline — no override note on this slide).

   Correct = {wa: 152, al: 134, pe: 314}, validated HOLISTICALLY as one
   unit (same pattern as S2's two-blank screen). maxAttempts: 2 — the
   ValueInputQuestion template default, same as every sibling screen in
   this part.

   CORRECTED 2026-08-13. This screen originally shipped as "unlimited
   retries, wrong never resolves" with the FULL worked solution shown on
   the very first wrong attempt. That was wrong on three counts:
     (a) notesSlide68.xml is SILENT on attempts, and per
         _question-template-defaults.md → "Presenter notes and template
         defaults", silence means the TEMPLATE DEFAULT applies
         (maxAttempts: 2) — it is not licence to invent a third model;
     (b) this slide HAS a hint ("קודם חשבו את משקל הצימוקים.") under the
         hidden-until-first-wrong policy, and ValueInputQuestion.md
         state 3 ties that reveal to the *retry* state — a hint revealed
         at the first wrong answer is only meaningful if a SECOND attempt
         exists, which a no-resolution model never reaches meaningfully
         and a single-attempt model would make unreachable outright;
     (c) it left the learner with no exit at all: after a wrong answer
         the check button disables until the value changes and nothing
         ever relabels to המשך, so anyone who could not produce all three
         correct values was permanently stuck — and progression was
         effectively gated on CORRECTNESS, which this reinforcement-
         practice stage's own consequence-free routing forbids.
   The slide's two rendered mockups (media/image116.png correct /
   image117.png wrong, byte-different, identical body) are the
   correct + wrong2 states; the short retry popup is a template default
   that this deck never mocks on ANY slide in this part (verified: none
   of slides 73-77 contain "שננסה שוב?" or "מעבר לתשובה שלי", yet S1-S4
   all legitimately implement maxAttempts: 2), so its absence here was
   never evidence of a different attempt model.

   "טעית, המשיכו לנסות." is the wrong2/FINAL title, matching the
   encouraging-final-title family every sibling uses ("טעיתם, לא נורא!",
   "כל טעות בונה ידע עמוק יותר", "לומדים ומשתפרים מתרגיל לתרגיל").
   CONFIRMED 2026-08-13: that phrase is encouraging pedagogical copy
   ONLY — it does not imply unlimited retries. S5 follows the standard
   ValueInputQuestion model used throughout this lomda: maximum 2
   attempts, the second wrong attempt resolving the question and
   allowing progression. There is never a case with more than 2
   attempts. Settled — do not reopen this as an open question.

   New interaction on this slide: a "לצפייה בנתונים" (view data) toggle
   button that raises a small card recapping the earlier-established
   percentages/gram findings, closed via an X (notesSlide68.xml: "מעלה
   חלון חדש עם טקסט וסגירה ב-X. הכפתور לא פעיל כשהחלון פתוח" — the
   trigger button itself must be disabled while the card is open). This
   card is a plain child of #s5 (not a page-level sibling like
   .scq-popup/.scq-hint-overlay), so it needs no entry in goTo()'s
   generic hide-sweep — the normal .screen display:none already hides
   it on navigation; s5vResetInitial() below just re-syncs its
   hidden/enabled state for the next visit. ═══════════════════════════════════════════════════════ */
/* Each nut-type sub-header in the explanation is a bold label on its own
   line. It used to carry a bullet marker too (added 2026-08-11); the
   producer asked for the bullets to come off on 2026-08-20, so the row
   is now just the label. The row keeps its own class for the bold weight
   — the flex/gap on it are harmless with a single child, and leaving the
   class in place keeps the three sub-headers styled as one group. */
function s5NutRow(label) {
  return '<p class="s5-nut-row"><span>' + label + '</span></p>';
}
const S5V_EXPLAIN =
  '<p>أولًا نحسب كمية الزبيب‎:</p>' +
  '<div class="eq-row"><span>22%</span><span>&middot;</span><span>600</span><span>=</span>' +
    frac(22, 100) + '<span>&middot;</span><span>600</span><span>=</span><span>غرام</span><span>132</span></div>' +
  '<p>سيتم توزيع 132 غرام بين 3 مكونات، 44 غرام لكل مكوّن‎.</p>' +
  '<p>والآن نحسب الكمية لكل مكوّن‎:</p>' +
  s5NutRow('الجوز‎:') +
  '<div class="eq-row"><span dir="ltr">108 + 44 =</span><span>غرام</span><span dir="ltr">152</span></div>' +
  s5NutRow('اللوز‎:') +
  '<div class="eq-row"><span>15%</span><span>&middot;</span><span>600</span><span>=</span>' +
    frac(15, 100) + '<span>&middot;</span><span>600</span><span>=</span><span dir="ltr">90 + 44 =</span><span>غرام</span><span dir="ltr">134</span></div>' +
  s5NutRow('الفول السوداني‎:') +
  '<div class="eq-row"><span>45%</span><span>&middot;</span><span>600</span><span>=</span>' +
    frac(45, 100) + '<span>&middot;</span><span>600</span><span>=</span><span dir="ltr">270 + 44 =</span><span>غرام</span><span dir="ltr">314</span></div>';

const S5V = {
  correct: { wa: 152, al: 134, pe: 314 }, maxAttempts: 2,
  popup: {
    retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
    correct: { bg: '#edf8ed', title: 'صحيح‎!', body: null },   // body:null -> S5V_EXPLAIN
    wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، استمروا في المحاولة.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: null,
               action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
               answerView: {
                 title: 'الإجابة غير صحيحة‎.',
                 body:  ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
                 action: { label: 'الإجابة الصحيحة', view: 'solution' }
               } }
  }
};

let s5vAttempts = 0, s5vAnswered = false, s5vDone = false;
let s5vLastWrong = null;   // joined signature of all three fields
let s5vAnswer = null;      // { wa, al, pe } snapshot of the learner's own final-wrong values
let s5vView   = 'solution';

function s5vInputs() {
  return {
    wa: document.getElementById('s5v-input-wa'),
    al: document.getElementById('s5v-input-al'),
    pe: document.getElementById('s5v-input-pe')
  };
}
function s5vFields() {
  return {
    wa: document.getElementById('s5v-field-wa'),
    al: document.getElementById('s5v-field-al'),
    pe: document.getElementById('s5v-field-pe')
  };
}
function s5vIcos() {
  return {
    wa: document.getElementById('s5v-input-ico-wa'),
    al: document.getElementById('s5v-input-ico-al'),
    pe: document.getElementById('s5v-input-ico-pe')
  };
}
function s5vSignature(i) { return i.wa.value.trim() + '|' + i.al.value.trim() + '|' + i.pe.value.trim(); }

function s5vInputChange() {
  if (s5vAnswered) return;
  const i = s5vInputs(), f = s5vFields(), ico = s5vIcos();
  Object.values(f).forEach(el => el?.classList.remove('error', 'correct'));
  Object.values(ico).forEach(el => { if (el) el.innerHTML = ''; });
  document.getElementById('s5v-popup')?.classList.add('hidden');
  const chk = document.getElementById('s5v-check');
  const hasAll = i.wa.value.trim() !== '' && i.al.value.trim() !== '' && i.pe.value.trim() !== '';
  if (chk) chk.disabled = !hasAll || (s5vSignature(i) === s5vLastWrong);
}
const S5V_KEYS = ['wa', 'al', 'pe'];
/* Per-field correctness map. The sub-part as a whole is right only when
   ALL THREE boxes are (s5vIsCorrect below), but the learner must still
   be shown WHICH boxes they got right and which they missed — producer
   rule (2026-08-19, first applied to part 01's S8; extended to every
   multi-input screen 2026-08-26). Never mark the whole set red just
   because the set as a whole is wrong. */
function s5vFieldStates(v) {
  const o = {}; S5V_KEYS.forEach(k => o[k] = Number(v[k]) === S5V.correct[k]); return o;
}
function s5vIsCorrect(v) {
  return S5V_KEYS.every(k => Number(v[k]) === S5V.correct[k]);
}
function s5vCheck() {
  if (s5vAnswered) { advanceScreen(); return; }
  const i = s5vInputs(), f = s5vFields(), ico = s5vIcos();
  if (i.wa.value.trim() === '' || i.al.value.trim() === '' || i.pe.value.trim() === '') return;
  const v = { wa: i.wa.value.trim(), al: i.al.value.trim(), pe: i.pe.value.trim() };
  s5vAttempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s5vOk = s5vIsCorrect(v);

  /* xAPI: answered - before the branches so all three paths report.
     Values come from `v` rather than the DOM: the final-wrong branch
     reveals the solution into those same inputs. */
  xapiAnswered('002', 'q3', s5vOk,
    s5vOk || s5vAttempts >= S5V.maxAttempts,
    ['wa', 'al', 'pe'].map(function (k) { return k + '=' + v[k]; }).join(', '));

  if (s5vOk) {
    Object.values(f).forEach(el => el?.classList.remove('error'));
    Object.values(f).forEach(el => el?.classList.add('correct'));
    Object.values(ico).forEach(el => { if (el) el.innerHTML = CHECK_SVG; });
    s5vFinish();
    s5vShowPopup('correct');
  } else if (s5vAttempts >= S5V.maxAttempts) {
    s5vAnswer = v;            // capture BEFORE the reveal overwrites the inputs
    s5vView = 'solution';
    s5vFinish();
    s5vApplyView();
  } else {
    const fc = s5vFieldStates(v);
    S5V_KEYS.forEach(k => {
      f[k]?.classList.remove('correct', 'error');
      f[k]?.classList.add(fc[k] ? 'correct' : 'error');
      if (ico[k]) ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
    s5vLastWrong = s5vSignature(i);
    document.getElementById('s5v-check').disabled = true;
    showHintButton('s5v-hint');   // hidden-until-first-wrong policy
    s5vShowPopup('retry');
  }
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}
/* Final-wrong reveal is destructive (the correct values overwrite the same
   three inputs the learner typed into), so it owes the View My Answer
   Toggle -- ValueInputQuestion.md state 5 + _global-components.md ->
   Feedback popup system. Ported from this file's own s2v machinery
   (2 fields -> 3), the same verbatim-port fix already applied when this
   was missed once before on part 06's own S3.
   Solution view is the correct answer, so every box is green. Answer
   view replays what the learner submitted — marked PER FIELD, same rule
   as the retry state above, NOT blanket red. */
function s5vApplyView() {
  if (s5vAnswer === null) return;
  const i = s5vInputs(), f = s5vFields(), ico = s5vIcos();
  const showAnswer = s5vView === 'answer';
  const fc = showAnswer ? s5vFieldStates(s5vAnswer) : null;
  S5V_KEYS.forEach(k => {
    i[k].value = showAnswer ? s5vAnswer[k] : String(S5V.correct[k]);
    const ok = showAnswer ? fc[k] : true;
    f[k]?.classList.remove('correct', 'error');
    f[k]?.classList.add(ok ? 'correct' : 'error');
    if (ico[k]) ico[k].innerHTML = ok ? CHECK_SVG : WRONG_SVG;
  });
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
  const i = s5vInputs();
  Object.values(i).forEach(el => { if (el) el.disabled = true; });
  const chk = document.getElementById('s5v-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  hideHintButton('s5v-hint');
  // Recall trigger stays enabled — per 720-templates' recall-popup contract,
  // question state (answered/correct/locked) never gates it; only its own
  // open/close (below) does.
  closeRecallPopup();
  syncPracticeProgressNav(document.getElementById('s5'));
}

function s5vFinish() {
  s5vAnswered = true; s5vDone = true;
  s5vFinishDom();
}
function s5vResetInitial() {
  s5vAttempts = 0; s5vAnswer = null; s5vView = 'solution';
  s5vAnswered = false; s5vDone = false; s5vLastWrong = null;
  const i = s5vInputs(), f = s5vFields(), ico = s5vIcos();
  Object.values(i).forEach(el => { if (el) { el.value = ''; el.disabled = false; } });
  Object.values(f).forEach(el => el?.classList.remove('error', 'correct'));
  Object.values(ico).forEach(el => { if (el) el.innerHTML = ''; });
  document.getElementById('s5v-popup')?.classList.add('hidden');
  document.getElementById('s5v-hint-overlay')?.classList.add('hidden');
  const chk = document.getElementById('s5v-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
  hideHintButton('s5v-hint');   // hidden-until-first-wrong policy
  closeRecallPopup();
  const dataBtn = document.getElementById('s5-databtn');
  if (dataBtn) dataBtn.disabled = false;
}
function s5vOpenHint() {
  /* xAPI: requested.1 - immediately before the reveal; this opens the
     overlay and never toggles it, so there is no double report. */
  xapiRequestedHint('002', 'q3');
  document.getElementById('s5v-hint-overlay')?.classList.remove('hidden');
}
function s5vCloseHint() { document.getElementById('s5v-hint-overlay')?.classList.add('hidden'); }
function s5vCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s5vCloseHint(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('s5v-hint-overlay')?.classList.contains('hidden')) s5vCloseHint();
});
function s5vShowPopup(type, view) {
  const popup = document.getElementById('s5v-popup');
  if (!popup) return;
  const base = S5V.popup[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  else if (type === 'wrong2') reanchorPopupBottom(popup);
  const titleEl = document.getElementById('s5v-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s5v-popup-body');
  if (bodyEl) bodyEl.innerHTML = (cfg.body === null) ? S5V_EXPLAIN : cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s5v-popup', cfg.action, s5vToggleView);
  popup.classList.remove('hidden');
  clampPopup(popup);
}
/* ═══════════════════════════════════════════════════════════
   Recall modal — 720-templates pattern (same overlay/open/close/
   backdrop-click contract, same #recall-overlay id, as methodica-
   science-mass-liquid-01-06's own recall popup). Global, outside every
   .screen div — same reason .scq-popup/.scq-hint-overlay live outside
   .screen: goTo() must be able to force-hide it on any navigation
   regardless of which screen opened it (see the goTo() hide-sweep,
   extended below with an explicit line for this one since its id
   doesn't match the "[id$=\"-popup\"], [id$=\"-hint-overlay\"]"
   pattern the generic sweep already covers).

   S5's own "לצפייה בנתונים" is the only recall button in this part so
   far, so the trigger-disable-while-open behavior (notesSlide68.xml:
   "הכפתור לא פעיל כשהחלון פתוח") is hardcoded to s5-databtn here rather
   than generalized — the day a second recall button needs this same
   overlay, thread the trigger id through instead of hardcoding a
   second one. */
function s5OpenRecallPopup() {
  document.getElementById('recall-overlay')?.classList.remove('hidden');
  const btn = document.getElementById('s5-databtn');
  if (btn) btn.disabled = true;
}
function closeRecallPopup() {
  document.getElementById('recall-overlay')?.classList.add('hidden');
  const btn = document.getElementById('s5-databtn');
  if (btn) btn.disabled = false;
}
function closeRecallPopupOnBackdrop(e) { if (e.target === e.currentTarget) closeRecallPopup(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('recall-overlay')?.classList.contains('hidden')) closeRecallPopup();
});
function goBackFromS5() { goTo(4); }


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
  Motion.reveal(document.querySelector('.screen.active')); // initial screen entrance (animation-system SKILL.md step 2.3)
  PartNav.init({
    part: '05',
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
   reading this part's screen text against metadata/methodica-math-percent-02-05.json
   and cross-checking which screens own a *Check function. Each screen carries
   the matched item's title so the derivation stays auditable without redoing
   it. Every suffix comes from metadata/ - never from a code comment and never
   from a remembered slide number (see 4.2, and 6.2 trap 2: prose in this
   family numbers screens 1-based, these keys are 0-based).
*/
var SCREEN_TO_SUBCONTENT = {
  0:  null,          /* מעבר - "זמן ל-2 שאלות מתקדמות" */
  1:  ['001', 1],    /* מגמות לימוד י' לפי דיאגרמת עיגול - סעיף א */
  2:  ['001', 2],    /* אותו פריט - סעיף ב (קמפיין הביולוגיה) */
  3:  ['002', 1],    /* תערובת פיצוחים למונדיאל - סעיף א */
  4:  ['002', 2],    /* אותו פריט - סעיף ב (שקדים + בוטנים) */
  5:  ['002', 3]     /* אותו פריט - סעיף ג (הצימוקים) */
};

/* Exactly TOTAL_SCREENS keys (6), 0..5, no gaps. A MISSING key is
   indistinguishable at runtime from null - the screen silently stops
   reporting. _test/verify-shared.js enforces the count, the contiguity and
   two-way coverage against metadata/ (6.2 traps 1 and 3). */

var XAPI_COMP_SLUG = 'methodica-math-percent-02-05';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* MUST end '/' - 6.1 */
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-02-05.json';


/* ═══════════════ resume — the four per-part hooks (§8.7) ═══════════════
   Here because every learner state variable in this file is declared `let` at
   top level: the global LEXICAL environment, not reachable through window.

   All five screens carry a reveal toggle, so §8.10 applies five times: the
   displayed value, the learner's OWN answer, and which of the two is showing.
   Drop the middle one and a restored solution view is silently promoted to
   "what the learner answered". */

function capturePartPayload() {
  /* The input values are DOM-only on the CORRECT path - sNvAnswer stays null
     there, so what the learner typed exists nowhere else (§8.9). */
  return {
    currentScreen: currentScreen,
    s1v: {
      attempts:  s1vAttempts,
      answered:  s1vAnswered,
      done:      s1vDone,
      lastWrong: s1vLastWrongValue,
      answer:    s1vAnswer,
      view:      s1vView,
      input:     (document.getElementById('s1v-input') || {}).value || ''
    },
    s3v: {
      attempts:  s3vAttempts,
      answered:  s3vAnswered,
      done:      s3vDone,
      lastWrong: s3vLastWrongValue,
      answer:    s3vAnswer,
      view:      s3vView,
      input:     (document.getElementById('s3v-input') || {}).value || ''
    },
    s4v: {
      attempts:  s4vAttempts,
      answered:  s4vAnswered,
      done:      s4vDone,
      lastWrong: s4vLastWrongValue,
      answer:    s4vAnswer,
      view:      s4vView,
      input:     (document.getElementById('s4v-input') || {}).value || ''
    },
    s2v: {
      attempts:  s2vAttempts,
      answered:  s2vAnswered,
      done:      s2vDone,
      lastWrong: s2vLastWrong,
      answer:    s2vAnswer,
      view:      s2vView,
      inputs:    (function () {
        var i = s2vInputs(), o = {};
        ['cs', 'bio'].forEach(function (k) { o[k] = i[k] ? i[k].value : ''; });
        return o;
      }())
    },
    s5v: {
      attempts:  s5vAttempts,
      answered:  s5vAnswered,
      done:      s5vDone,
      lastWrong: s5vLastWrong,
      answer:    s5vAnswer,
      view:      s5vView,
      inputs:    (function () {
        var i = s5vInputs(), o = {};
        ['wa', 'al', 'pe'].forEach(function (k) { o[k] = i[k] ? i[k].value : ''; });
        return o;
      }())
    }
  };
}

function applyResumeVars(st) {
  if (!st) return;
  if (st.s1v) {
    s1vAttempts       = st.s1v.attempts || 0;
    s1vAnswered       = !!st.s1v.answered;
    s1vDone           = !!st.s1v.done;
    s1vLastWrongValue = st.s1v.lastWrong;
    s1vAnswer         = (st.s1v.answer === undefined) ? null : st.s1v.answer;
    s1vView           = st.s1v.view || 'solution';
  }
  if (st.s3v) {
    s3vAttempts       = st.s3v.attempts || 0;
    s3vAnswered       = !!st.s3v.answered;
    s3vDone           = !!st.s3v.done;
    s3vLastWrongValue = st.s3v.lastWrong;
    s3vAnswer         = (st.s3v.answer === undefined) ? null : st.s3v.answer;
    s3vView           = st.s3v.view || 'solution';
  }
  if (st.s4v) {
    s4vAttempts       = st.s4v.attempts || 0;
    s4vAnswered       = !!st.s4v.answered;
    s4vDone           = !!st.s4v.done;
    s4vLastWrongValue = st.s4v.lastWrong;
    s4vAnswer         = (st.s4v.answer === undefined) ? null : st.s4v.answer;
    s4vView           = st.s4v.view || 'solution';
  }
  if (st.s2v) {
    s2vAttempts  = st.s2v.attempts || 0;
    s2vAnswered  = !!st.s2v.answered;
    s2vDone      = !!st.s2v.done;
    s2vLastWrong = st.s2v.lastWrong;
    s2vAnswer    = (st.s2v.answer === undefined) ? null : st.s2v.answer;
    s2vView      = st.s2v.view || 'solution';
  }
  if (st.s5v) {
    s5vAttempts  = st.s5v.attempts || 0;
    s5vAnswered  = !!st.s5v.answered;
    s5vDone      = !!st.s5v.done;
    s5vLastWrong = st.s5v.lastWrong;
    s5vAnswer    = (st.s5v.answer === undefined) ? null : st.s5v.answer;
    s5vView      = st.s5v.view || 'solution';
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
  if (st.s2v && st.s2v.inputs) {
    var i2 = s2vInputs();
    ['cs', 'bio'].forEach(function (k) {
      if (i2[k] && typeof st.s2v.inputs[k] === 'string') i2[k].value = st.s2v.inputs[k];
    });
  }
  if (st.s5v && st.s5v.inputs) {
    var i5 = s5vInputs();
    ['wa', 'al', 'pe'].forEach(function (k) {
      if (i5[k] && typeof st.s5v.inputs[k] === 'string') i5[k].value = st.s5v.inputs[k];
    });
  }
}

function restoreScreenUI(n) {
  /* ⚠️ NEVER delegate to resetScreenState(n) and never reach a
     sNvResetInitial(): this runs on EVERY navigation (§8.4a), and reset's
     not-answered branch clears the inputs - it would wipe a half-typed answer
     on every screen change (§8.8 rule 5, risk 1). */
  if (n === 1) {
    paintSingleValue({
      done: s1vDone, attempts: s1vAttempts, answer: s1vAnswer,
      input: function () { return document.getElementById('s1v-input'); },
      field: function () { return document.getElementById('s1v-field'); },
      ico:   function () { return document.getElementById('s1v-input-ico'); },
      applyView: s1vApplyView,
      showPopup: s1vShowPopup,
      finishDom: s1vFinishDom,
      showHint:  function () { showHintButton('s1v-hint'); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG
    });
  }
  if (n === 3) {
    paintSingleValue({
      done: s3vDone, attempts: s3vAttempts, answer: s3vAnswer,
      input: function () { return document.getElementById('s3v-input'); },
      field: function () { return document.getElementById('s3v-field'); },
      ico:   function () { return document.getElementById('s3v-input-ico'); },
      applyView: s3vApplyView,
      showPopup: s3vShowPopup,
      finishDom: s3vFinishDom,
      showHint:  function () { showHintButton('s3v-hint'); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG
    });
  }
  if (n === 4) {
    paintSingleValue({
      done: s4vDone, attempts: s4vAttempts, answer: s4vAnswer,
      input: function () { return document.getElementById('s4v-input'); },
      field: function () { return document.getElementById('s4v-field'); },
      ico:   function () { return document.getElementById('s4v-input-ico'); },
      applyView: s4vApplyView,
      showPopup: s4vShowPopup,
      finishDom: s4vFinishDom,
      showHint:  function () { showHintButton('s4v-hint'); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG
    });
  }
  if (n === 2) {
    paintValueFields({
      done: s2vDone, attempts: s2vAttempts, answered: s2vAnswered,
      lastWrong: s2vLastWrong, answer: s2vAnswer,
      keys: ['cs', 'bio'],
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
  if (n === 5) {
    paintValueFields({
      done: s5vDone, attempts: s5vAttempts, answered: s5vAnswered,
      lastWrong: s5vLastWrong, answer: s5vAnswer,
      keys: ['wa', 'al', 'pe'],
      inputs: s5vInputs, fields: s5vFields, icos: s5vIcos,
      fieldStates: s5vFieldStates,
      applyView: s5vApplyView,
      showPopup: s5vShowPopup,
      finishDom: s5vFinishDom,
      showHint: function () { showHintButton('s5v-hint'); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG,
      /* s5vInputChange() would be rule 2's recompute, but it also clears every
         field mark and hides the popup - it would undo the paint above. */
      checkButton: undefined
    });
  }
}
