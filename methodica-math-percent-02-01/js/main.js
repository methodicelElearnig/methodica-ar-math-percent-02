'use strict';

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_SCREENS = 25;  // S0-S24 — bump as screens are added


/* Correct/incorrect Type 1 icon (720-design-guidelines →
   components-icons-states.md, Figma nodes 1027-26019 / 1027-26020) —
   bare 16px vector, no circle/background, inserted into a .viq-input-ico
   span inside a ValueInputQuestion field's own bordered box. */
const CHECK_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 12" fill="none" aria-hidden="true">' +
  '<path d="M4.52036 12C4.12296 12.0002 3.74183 11.8126 3.46106 11.4787L0.258452 7.67744C-0.0861507 7.26814 -0.0861507 6.60467 0.258452 6.19536C0.603165 5.78619 1.16194 5.78619 1.50666 6.19536L4.52036 9.77374L12.4933 0.306878C12.8381 -0.102293 13.3968 -0.102293 13.7415 0.306878C14.0862 0.716179 14.0862 1.37966 13.7415 1.78896L5.57966 11.4787C5.29889 11.8126 4.91776 12.0002 4.52036 12Z" fill="#609E12"/>' +
  '</svg>';
const WRONG_SVG =
  '<svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
  '<path d="M13.6743 0.325691C13.4657 0.117151 13.1828 0 12.8879 0C12.5929 0 12.31 0.117151 12.1014 0.325691L7 5.42709L1.8986 0.325691C1.69 0.117151 1.40711 0 1.11215 0C0.817183 0 0.534294 0.117151 0.325691 0.325691C0.117151 0.534294 0 0.817183 0 1.11215C0 1.40711 0.117151 1.69 0.325691 1.8986L5.42709 7L0.325691 12.1014C0.117151 12.31 0 12.5929 0 12.8879C0 13.1828 0.117151 13.4657 0.325691 13.6743C0.534294 13.8829 0.817183 14 1.11215 14C1.40711 14 1.69 13.8829 1.8986 13.6743L7 8.57291L12.1014 13.6743C12.31 13.8829 12.5929 14 12.8879 14C13.1828 14 13.4657 13.8829 13.6743 13.6743C13.8829 13.4657 14 13.1828 14 12.8879C14 12.5929 13.8829 12.31 13.6743 12.1014L8.57291 7L13.6743 1.8986C13.8829 1.69 14 1.40711 14 1.11215C14 0.817183 13.8829 0.534294 13.6743 0.325691Z" fill="#B20010"/>' +
  '</svg>';

/* ─── S1 companion character videos — asset map keyed by the logical
   character IDs from the S0 selection screen (companion character
   system: never hardcode a character asset). ─── */
const S1_CHARACTER_VIDEOS = {
  'character-1': 'assets/video/Character-1-wonder.mp4',
  'character-2': 'assets/video/Character-2-wonder.mp4',
};

/* S20 companion character videos — decorative "remembering" clip, one per
   character, supplied 2026-08-11 (filenames lowercase, unlike S1's own
   capitalized convention — used exactly as delivered). */
const S20_CHARACTER_VIDEOS = {
  'character-1': 'assets/video/character-1-remembering.mp4',
  'character-2': 'assets/video/character-2-remembering.mp4',
};

/* End-state for decorative character clips — 720-templates →
   _global-components.md → "Companion character system" → "Decorative
   character video" → "End-state hierarchy".

   STEP 1, the default, is NO handler at all: a <video> with no `loop`
   already stops on its final encoded frame, which is exactly the required
   behaviour. Every clip this part loads was sampled frame by frame on
   2026-09-01 (ink coverage at t=0, mid-clip, and across the last 0.6s);
   all of them except the two below hold a fully meaningful final frame,
   so nothing is wired for them and the browser is left alone.

   STEP 2, the blank-tail exception, is these two assets and only these
   two. Both end in ~0.1s of completely blank frames — measured ink
   coverage falls from ~43% to 0% at the timestamps noted — so they hold
   their own last meaningful frame instead of their literal end. Both are
   S5/S9 method-picker clips; no TransitionScreen clip needs this.

   This REPLACES freezeVideoOnEnd(), which ran on every decorative clip
   and did `currentTime = 0` — a rewind to the OPENING pose. The hierarchy
   prohibits that outright: it is not a hold on the final frame, and on a
   clip that builds toward its ending (Character-1-Rocket accumulates its
   flame and smoke across the whole clip) it discarded the payoff. Do not
   reintroduce it, and do not extend the map below to an asset that has
   not actually been measured. */
const BLANK_TAIL_FREEZE_AT = {
  'character-2-selection-Propotion.mp4': 2.66, // blank from 2.70s of 2.80s
  'character-1-selection-Fractions.mp4': 3.66, // blank from 3.71s of 3.77s
};
function holdLastMeaningfulFrame(vid) {
  if (!vid || vid._freezeWired) return;
  const at = BLANK_TAIL_FREEZE_AT[(vid.getAttribute('src') || '').split('/').pop()];
  if (at == null) return;                       // step 1 — nothing to wire
  vid._freezeWired = true;
  function hold() { vid.pause(); try { vid.currentTime = at; } catch (e) {} }
  /* Both events on purpose: `timeupdate` can tick as slowly as ~250ms,
     which is wider than either of these tails, so the crossing test alone
     can miss the window and leave the blank frame showing. `ended` is the
     backstop; it seeks back to a MEANINGFUL timestamp, which is what
     separates this from the prohibited rewind-to-zero. */
  vid.addEventListener('timeupdate', function () { if (vid.currentTime >= at) hold(); });
  vid.addEventListener('ended', hold);
}

/* S5 companion-character asset map — character-with-whiteboard clips
   for the calculation-method picker (Screen 06), also reused verbatim
   at S9. Swapped from static images to video 2026-08-13. Filenames
   don't follow the character-N-[state] convention cleanly (a typo
   survives in the source assets: "Propotion"), so this is an explicit
   mapping rather than a derived filename. */
const S5_CHARACTER_VIDEOS = {
  'character-1': {
    proportion: 'assets/video/character-1-selection-Propotion.mp4',
    fraction:   'assets/video/character-1-selection-Fractions.mp4'
  },
  'character-2': {
    proportion: 'assets/video/character-2-selection-Propotion.mp4',
    fraction:   'assets/video/character-2-selection-Fractions.mp4'
  }
};

/* ─── Companion character persistence ───────────────────────
   Namespaced storage key (per-lomda) — see 720-templates
   → references/_global-components.md → Companion character system →
   "Cross-part persistence (localStorage)". Write-only from part 01:
   the choice is saved here so later parts can read and resolve their
   own character assets from it, but part 01's own Screen 01 never
   restores/pre-selects from a prior session — producer instruction:
   the character-selection screen's initial state must always show no
   selection, even on reload. */
const CHARACTER_STORAGE_KEY = 'methodica_math_percent_02_selectedCharacter';

/* ─── Global lomda state ─────────────────────────────────────
   Single source of truth that persists across every screen for the
   whole session. Always starts unselected (see note above). */
window.lomdaState = window.lomdaState || {
  selectedCharacter: null
};

/* ─── State ─────────────────────────────────────────────── */
let currentScreen = 0;


/* ─── Navigation ────────────────────────────────────────── */
/* Screen-leave cleanup for this part (called from the shared goTo).
   Both of these were inline in part 01's own goTo before the spine was
   shared. They run before the .active swap, exactly as they did. */
function partScreenLeave(prev) {
  /* The S2 zoom modal reparents a live widget rather than toggling a
     class, so it needs its own close call (not just the "hidden" sweep)
     to move the widget back before the screen swap. Its id matches
     neither sweep suffix. */
  if (!document.getElementById('s2-zoom-modal')?.classList.contains('hidden')) s2CloseZoom();
  /* Stop S2's gesture-hint loop when leaving that screen, so no timer
     keeps firing on a hidden screen (_gesture-hints.md lifecycle rule).
     This is why the hook takes prev. */
  if (prev && prev.id === 's2') s2GhStop();
}

function resetScreenState(n) {
  if (n === 0) {
    const saved = window.lomdaState.selectedCharacter;
    document.querySelectorAll('#s0 .option-card').forEach(card => {
      const isSelected = !!saved && card.dataset.value === saved;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
    const continueBtn = document.getElementById('s0-continue');
    if (continueBtn) continueBtn.disabled = !saved;
    // Decorative option-card preview clips: play once, freeze on the
    // last frame (not a loop). Both clips were measured on 2026-09-01 and
    // hold a meaningful final frame, so per the end-state hierarchy's step
    // 1 nothing is wired here at all — a <video> with no `loop` already
    // stops there. The old freezeVideoOnEnd() call that used to sit here
    // rewound them to frame 0 instead; see holdLastMeaningfulFrame().
  }
  if (n === 1) {
    const char = window.lomdaState.selectedCharacter || 'character-1';
    const src  = S1_CHARACTER_VIDEOS[char] || S1_CHARACTER_VIDEOS['character-1'];
    const vid  = document.getElementById('s1-video');
    if (vid && (!vid.getAttribute('src') || !vid.getAttribute('src').endsWith(src))) {
      vid.src = src;
      vid.load();
      vid.play().catch(() => {});
      /* No end-handler: this clip's final frame was measured and is
         meaningful, so the hierarchy's step 1 applies — a <video> with
         no `loop` already holds it. Nothing to wire. */
    }
  }
  if (n === 2) {
    /* Resolved → bring the feedback back with the markings, per
       _global-components.md → "Reopening feedback on return to a resolved
       screen". s2qLastResult is recorded by s2qShowPopup() itself, so it can
       never drift from the branch that actually fired. */
    if (!s2qDone) s2qResetInitial();
    else s2qShowPopup(s2qLastResult);
    // Loading-bar widget is independent of the quiz state above — always
    // re-measure its floating percentage label once the screen is
    // actually visible/laid out (offsetWidth is 0 while display:none).
    s2SliderReflow();
    // Both discovery affordances (container pulse + gesture hint) re-arm
    // on entry ONLY while the learner still hasn't worked the slider —
    // once they have, s2SliderUsed stays true for the session and
    // neither comes back. See s2MarkSliderUsed().
    if (!s2SliderUsed) {
      document.querySelector('.s2-slider-wrap')?.classList.remove('s2-pulse-done');
      s2GhStart();
    }
  }
  if (n === 3) {
    const char = window.lomdaState.selectedCharacter || 'character-1';
    const src  = S1_CHARACTER_VIDEOS[char] || S1_CHARACTER_VIDEOS['character-1'];
    const vid  = document.getElementById('s3-video');
    if (vid && (!vid.getAttribute('src') || !vid.getAttribute('src').endsWith(src))) {
      vid.src = src;
      vid.load();
      vid.play().catch(() => {});
      /* No end-handler: this clip's final frame was measured and is
         meaningful, so the hierarchy's step 1 applies — a <video> with
         no `loop` already holds it. Nothing to wire. */
    }
  }
  if (n === 5) {
    const char = window.lomdaState.selectedCharacter || 'character-1';
    const assets = S5_CHARACTER_VIDEOS[char] || S5_CHARACTER_VIDEOS['character-1'];
    const propVid = document.getElementById('s5-img-proportion');
    const fracVid = document.getElementById('s5-img-fraction');
    if (propVid && (!propVid.getAttribute('src') || !propVid.getAttribute('src').endsWith(assets.proportion))) { propVid.src = assets.proportion; propVid.load(); propVid.play().catch(() => {}); holdLastMeaningfulFrame(propVid); }
    if (fracVid && (!fracVid.getAttribute('src') || !fracVid.getAttribute('src').endsWith(assets.fraction))) { fracVid.src = assets.fraction; fracVid.load(); fracVid.play().catch(() => {}); holdLastMeaningfulFrame(fracVid); }

    const saved = window.lomdaState.selectedCalcMethod;
    document.querySelectorAll('#s5 .option-card').forEach(card => {
      const isSelected = !!saved && card.dataset.value === saved;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
    const continueBtn = document.getElementById('s5-continue');
    if (continueBtn) continueBtn.disabled = !saved;
  }
  if (n === 6) {
    s6UpdateUI();
  }
  if (n === 7 && !s7Done) {
    s7ResetInitial();
  }
  if (n === 7 && s7Done) {
    // Reopening feedback on return to a resolved screen (_global-components.md)
    // applies to EVERY resolved outcome, not just the final-wrong/toggle path.
    if (s7Result === 'incorrect' && s7Answer !== null) {
      s7View = 'solution';
      s7ApplyView();
    } else if (s7Result === 'correct') {
      s7ShowPopup('correct');
    }
  }
  if (n === 8 && !s8Done) {
    s8ResetInitial();
  }
  if (n === 8 && s8Done) {
    if (s8Result === 'incorrect' && s8Answer !== null) {
      s8View = 'solution';
      s8ApplyView();
    } else if (s8Result === 'correct') {
      s8ShowPopup('correct');
    }
  }
  if (n === 9) {
    const char = window.lomdaState.selectedCharacter || 'character-1';
    const assets = S5_CHARACTER_VIDEOS[char] || S5_CHARACTER_VIDEOS['character-1'];
    const propVid = document.getElementById('s9-img-proportion');
    const fracVid = document.getElementById('s9-img-fraction');
    if (propVid && (!propVid.getAttribute('src') || !propVid.getAttribute('src').endsWith(assets.proportion))) { propVid.src = assets.proportion; propVid.load(); propVid.play().catch(() => {}); holdLastMeaningfulFrame(propVid); }
    if (fracVid && (!fracVid.getAttribute('src') || !fracVid.getAttribute('src').endsWith(assets.fraction))) { fracVid.src = assets.fraction; fracVid.load(); fracVid.play().catch(() => {}); holdLastMeaningfulFrame(fracVid); }

    // The method already completed at S5 can't be picked again here —
    // producer instruction ("המסלול שהלומד בחר ב-S5 צריך להיות לא פעיל
    // ב-S9"). window.lomdaState.selectedCalcMethod holds that FIRST
    // choice (set once at S5 and never touched again); selectedCalcMethod2
    // is this screen's own separate state for the SECOND/remaining pick.
    const completedMethod = window.lomdaState.selectedCalcMethod;
    document.querySelectorAll('#s9 .option-card').forEach(card => {
      const isCompleted = !!completedMethod && card.dataset.value === completedMethod;
      card.classList.toggle('disabled', isCompleted);
      card.setAttribute('aria-disabled', isCompleted ? 'true' : 'false');
      card.tabIndex = isCompleted ? -1 : 0;
    });

    const saved = window.lomdaState.selectedCalcMethod2;
    document.querySelectorAll('#s9 .option-card').forEach(card => {
      const isSelected = !!saved && card.dataset.value === saved;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
    const continueBtn = document.getElementById('s9-continue');
    if (continueBtn) continueBtn.disabled = !saved;
  }
  if (n === 10) {
    s10UpdateUI();
  }
  if (n === 11 && !s11Done) {
    s11ResetInitial();
  }
  if (n === 11 && s11Done) {
    if (s11Result === 'incorrect' && s11Answer !== null) {
      s11View = 'solution';
      s11ApplyView();
    } else if (s11Result === 'correct') {
      s11ShowPopup('correct');
    }
  }
  if (n === 12 && !s12Done) {
    s12ResetInitial();
  }
  if (n === 12 && s12Done) {
    if (s12Result === 'incorrect' && s12Answer !== null) {
      s12View = 'solution';
      s12ApplyView();
    } else if (s12Result === 'correct') {
      s12ShowPopup('correct');
    }
  }
  // S13's clip has a static src (same clip for either character, see
  // index.html's section comment) and its final frame was measured as
  // meaningful, so this screen now needs NO entry wiring at all: the
  // markup's own autoplay starts it and a <video> with no `loop` holds
  // its last frame. The freezeVideoOnEnd() call that used to live here
  // rewound it to frame 0 instead — see holdLastMeaningfulFrame().
  if (n === 20) {
    const char = window.lomdaState.selectedCharacter || 'character-1';
    const src  = S20_CHARACTER_VIDEOS[char] || S20_CHARACTER_VIDEOS['character-1'];
    const vid  = document.getElementById('s20-video');
    if (vid && (!vid.getAttribute('src') || !vid.getAttribute('src').endsWith(src))) {
      vid.src = src;
      vid.load();
      vid.play().catch(() => {});
      /* No end-handler: this clip's final frame was measured and is
         meaningful, so the hierarchy's step 1 applies — a <video> with
         no `loop` already holds it. Nothing to wire. */
    }
  }
  if (n === 15 && !s15Done) {
    s15ResetInitial();
  }
  // No s15Done branch needed on revisit, and this one is genuinely true:
  // the guided-practice steps mark inline and open NO feedback popup at all,
  // so there is nothing to reopen. The .selected/.correct/.incorrect/.picked
  // classes are never destroyed by goTo() (it only toggles the .screen's own
  // .active class), so the revealed state is already sitting there correctly.
  // Do not generalise this to a screen that DOES have a popup — that mistake
  // is exactly what left S2Q/S21/S23/S24 coming back silent (see their own
  // branches above/below).
  if (n === 17 && !s17Done) {
    s17ResetInitial();
  }
  // Same no-done-branch reasoning as S15 above.
  if (n === 18 && !s18Done) {
    s18ResetInitial();
  }
  /* S21/S23/S24 keep their .correct/.wrong option classes on revisit — goTo()
     only toggles the .screen's own .active class, so the revealed answer state
     is already sitting there. What was MISSING is the popup: returning to a
     resolved question must bring its feedback back too, not just its markings
     (720-templates → _global-components.md → "Reopening feedback on return to
     a resolved screen"). The comment that used to sit here claimed these
     screens had "no popup to reopen" — they all have one; that mistaken
     reading is why Back came back silent on them. Same {prefix}Done lock as
     every other resolved screen, plus the {prefix}LastResult the popup funnel
     records; no re-validation, no attempt change, no re-marking. */
  if (n === 21) {
    if (!s21Done) s21ResetInitial();
    else s21ShowPopup(s21LastResult);
  }
  if (n === 23) {
    if (!s23Done) s23ResetInitial();
    else s23ShowPopup(s23LastResult);
  }
  if (n === 24) {
    if (!s24Done) s24ResetInitial();
    else s24ShowPopup(s24LastResult);
  }
  if (n === 22 && !s22Done) {
    s22ResetInitial();
  }
  if (n === 22 && s22Done) {
    // Reopening feedback on return to a resolved screen — same reasoning
    // as S7/S8 (View My Answer Toggle reveal overwrites the input, so
    // the reveal state needs re-applying, unlike the simpler S15/S17/S18
    // screens whose classes just sit there untouched).
    if (s22Result === 'incorrect' && s22Answer !== null) {
      s22View = 'solution';
      s22ApplyView();
    } else if (s22Result === 'correct') {
      s22ShowPopup('correct');
    }
  }
}

/* Cross-part navigation trail (js/partnav.js). This part is the lomda's
   entry point, so its own S0 has no Back button — nothing can ever
   precede it. It still takes part in the trail on both sides: it PUSHES
   when crossing into part 02, and it is a Back TARGET (part 02's S0 Back
   returns here, to S24), which is what init() handles below. Must run
   after resetScreenState(0)/Motion.reveal above so a landing jump goes
   through the normal goTo() path. */

function advanceScreen() {
  // Re-crossing forward after a cross-part Back — see the identical
  // block in every other part's advanceScreen() and the "RE-CROSSING
  // FORWARD" note in js/partnav.js.
  const returnForward = PartNav.forwardOverride();
  if (returnForward && currentScreen + 1 >= TOTAL_SCREENS) {
    PartNav.forward(returnForward);
    return;
  }
  // Screen 01 gate: a character must be selected before advancing
  if (currentScreen === 0 && !window.lomdaState.selectedCharacter) return;
  // Screen 03 gate: the question must be answered before advancing
  if (currentScreen === 2 && !s2qAnswered) return;
  // Screen 06 gate: a calculation method must be selected before advancing
  if (currentScreen === 5 && !window.lomdaState.selectedCalcMethod) return;
  // Screen 09 gate: the carousel must reach its last step before advancing
  if (currentScreen === 6 && s6Step !== S6_LAST_STEP) return;
  // Screen 10 gate: the fraction question must be answered before advancing
  if (currentScreen === 7 && !s7Answered) return;
  // Screen 11 gate: the multiply question must be answered before advancing
  if (currentScreen === 8 && !s8Answered) return;
  // Screen 12 gate: the second (remaining) method must be selected before advancing
  if (currentScreen === 9 && !window.lomdaState.selectedCalcMethod2) return;
  // Screen 15 gate: the carousel must reach its last step before advancing
  if (currentScreen === 10 && !(s10Step === S10_LAST_STEP && s10SubReveal === s10CurrentSubMax())) return;
  // Screen 16 gate: the table question must be answered before advancing
  if (currentScreen === 11 && !s11Answered) return;
  // Screen 17 gate: the equation-solving question must be answered before advancing
  if (currentScreen === 12 && !s12Answered) return;
  // Screen 20 gate: the guided-step question must be answered before advancing
  if (currentScreen === 15 && !s15Answered) return;
  // Screen 22 gate: the guided-step question must be answered before advancing
  if (currentScreen === 17 && !s17Answered) return;
  // Screen 23 gate: the guided-step question must be answered before advancing
  if (currentScreen === 18 && !s18Answered) return;
  // Screen 42 gate: the warm-up question must be answered before advancing
  if (currentScreen === 21 && !s21Answered) return;
  // Screen 43 gate: the value-input question must be answered before advancing
  if (currentScreen === 22 && !s22Answered) return;
  // Screen 44 gate: the table-choice question must be answered before advancing
  if (currentScreen === 23 && !s23Answered) return;
  // Screen 45 gate: the yes/no question must be answered before advancing
  if (currentScreen === 24 && !s24Answered) return;
  /* Branch edges that used to live ONLY in the Continue buttons' own
     advanceFromSN() handlers. advanceScreen() is also what ArrowLeft
     calls, so with the routing only in the buttons the keyboard fell
     through to the generic +1 and walked into the sibling branch the
     learner had not chosen. Same class of bug as the Back one, same fix:
     the route lives in exactly one place and both entry points read it.
     The method picker opens the chosen method's carousel DIRECTLY on its
     first card (client decision 2026-09-08: the video option and the
     "read / watch" choice screens were removed from the module). */
  if (currentScreen === 5)  { goForward(window.lomdaState.selectedCalcMethod === 'proportion' ? 10 : 6); return; }
  /* Path A/B reconvergence: S8 (fraction track) and S12 (proportion
     track) can each be the FIRST or the SECOND track to finish, depending
     on what was picked at S5. Go on to S13 only once BOTH tracks are
     actually finished; otherwise go to S9 to force the remaining one.

     The test is the two tracks' own resolved locks. It used to be "has
     selectedCalcMethod2 been set", which is written the moment a card is
     CLICKED on S9 — so a learner who reached S9, picked a method, then
     pressed Back to the track they had just finished would, on pressing
     Continue again, be sent straight to S13 with the second method never
     taught. s8Done/s12Done are set only by a track actually reaching a
     terminal outcome, they survive Back (that is what resetScreenState's
     resume guard protects), and they are the same locks the feedback
     restore reads — no new state. */
  if (currentScreen === 8) { goForward(s8Done && s12Done ? 13 : 9); return; }
  if (currentScreen === 12) { goForward(s8Done && s12Done ? 13 : 9); return; }
  // S9 forces whichever method was NOT picked first at S5 — not a fixed
  // +1 — and, like S5, lands on that method's carousel directly.
  if (currentScreen === 9) { goForward(window.lomdaState.selectedCalcMethod2 === 'proportion' ? 10 : 6); return; }
  // Crossing into part 02 from this part's own last screen (S24) — purely
  // a technical/content split of one lomda (2026-08-12), not a pedagogical
  // branch, so this redirect is unconditional (no score/threshold check).
  // Sibling-folder relative path, same pattern later parts use for their
  // own unconditional part boundary (part 05 → part 06).
  if (currentScreen + 1 >= TOTAL_SCREENS) {
    /* xAPI: the component result at this part's one exit. This boundary is
       unconditional - a technical/content split of one lomda, not a
       pedagogical Decision Point - so there is no gate to report against
       and nothing is routed on the outcome.

       The denominator is 4: the four items that carry code-graded
       questions (004, 006, 008, 009 - exactly XAPI_EVAL_ITEMS). The other
       five items in this component are instruction, a motivational
       exploration, and a worked example; they report their
       initialized/completed pairs and have nothing to score. Item 007 is
       the clearest case: it declares a question in metadata/ but has no
       *Check anywhere, because the learner is told "אל תפתרו אותו, רק
       הסתכלו".

       An item counts only if every one of its graded questions was right,
       read back out of XAPI_Q_RESULTS so it cannot disagree with what the
       eight answered statements reported. */
    const _items01 = [XAPI_Q_RESULTS['004/q1'] && XAPI_Q_RESULTS['004/q2'],
                      XAPI_Q_RESULTS['006/q1'] && XAPI_Q_RESULTS['006/q2'],
                      XAPI_Q_RESULTS['008/q1'] && XAPI_Q_RESULTS['008/q2'],
                      XAPI_Q_RESULTS['009/q1'] && XAPI_Q_RESULTS['009/q2']];
    const _n01 = _items01.filter(Boolean).length;
    /* Last click of the part: report and stop — the platform routes (2026-09-16). */
    xapiEndComponent({ success: _n01 === 4, score: { scaled: _n01 / 4 } }, xapiActiveContinueButton());

    PartNav.forward('02');   // dev-only (DEV_NAV): records this part + screen for part 02's Back
    return;
  }
  goForward(currentScreen + 1);
}
/* ─── Same-part route history ─────────────────────────────────────────
   Part 01 is NOT a linear chain. S5 forks into the fraction track
   (S6→S7→S8) or the proportion track (S10→S11→S12); both tracks
   reconverge on S9, which then forces the remaining track; both
   reconverge again on S13. So `currentScreen - 1` is not the learner's
   predecessor — it is just the previous NUMBER, and on a fork boundary it
   names a screen of the sibling branch the learner never entered. That is
   the reported bug: finishing the proportion track lands on S9, whose
   Back went to S8 — the fraction track's last screen, still empty.

   One mechanism replaces every hard-coded Back destination: a stack of the
   screens the learner actually left. Forward pushes, Back pops. Because
   Back pops instead of pushing, it can never build a two-screen A↔B loop,
   and because a screen only enters the stack by being left, Back can never
   walk into a branch that was never entered.

   Two movement verbs, so every call site declares its own intent:
     goForward(n)  — a real advance; records the screen being left.
     goBack()      — return to the actual predecessor; consumes it.
   goTo() itself stays trail-neutral, which is what keeps the dev
   postMessage bridge and PartNav's cross-part landing jump from writing
   learner history. */
let routeTrail = [];

function goForward(n) {
  if (n === currentScreen) return;
  routeTrail.push(currentScreen);
  goTo(n);
}
function goBack() {
  if (!routeTrail.length) return;   // nothing recorded (fresh load / dev jump)
  goTo(routeTrail.pop());
}

/* The single Back entry point. The visible Back button calls the screen's
   own goBackFromSN() (some screens step backwards INSIDE themselves before
   leaving — the two carousels), and ArrowRight now calls this, so the key
   and the button can no longer diverge. Screens with no handler fall
   through to the plain trail pop. */
function backFromCurrentScreen() {
  const own = window['goBackFromS' + currentScreen];
  if (typeof own === 'function') { own(); return; }
  goBack();
}

/* ─── Keyboard navigation (RTL: next = ←, prev = →) ─────── */
// Must not fire while focus is on a control where ArrowLeft/ArrowRight
// already has its own in-control meaning (caret move in a text/number
// field, native slider value change, textarea/contenteditable caret,
// select option cycling) — otherwise ordinary editing (e.g. S2's
// loading-bar widget, or any of this part's number/text inputs)
// silently double-fires as screen navigation, including an ungated
// goBack() that can discard whatever the learner just typed.

document.addEventListener('keydown', e => {
  if (hasOwnArrowKeyMeaning(e.target)) return;
  if (e.key === 'ArrowLeft')  advanceScreen();
  // Same entry point the visible Back button uses, so the key and the
  // button behave identically — including the two carousels, where Back
  // steps backwards INSIDE the screen before it leaves. ArrowRight used to
  // call goBack() directly and skipped that.
  if (e.key === 'ArrowRight') backFromCurrentScreen();
});

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TwoOptionSelection (Screen 01, character selection)
   Selecting a card stores the choice and enables Continue. No modal,
   no auto-advance. See 720-templates → references/TwoOptionSelection.md
   ═══════════════════════════════════════════════════════════ */
function selectOption(cardEl) {
  document.querySelectorAll('#s0 .option-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');

  /* Persist globally for the rest of the lomda. setUnitCharacter() writes
     all three tiers synchronously (§8.1, §8.3): window.lomdaState for this
     page, the localStorage cache for the next part's first paint, and - once
     RESUME_ENABLED is on - the state document, which is the only tier that
     survives a different computer.

     Synchronous and not debounced on purpose: the learner clicks המשך
     immediately after choosing, and a deferred write could be cut off by the
     navigation. If the choice is made before the document has arrived,
     setUnitCharacter queues it and the loader drains the queue ahead of
     applying the document - a choice made in THIS session is newer.

     typeof-guarded per §8.7: this is the only place the character is ever
     recorded, so a shared file that failed to load must still capture it the
     old way rather than lose it. */
  if (typeof setUnitCharacter === 'function') {
    setUnitCharacter(cardEl.dataset.value);
  } else {
    window.lomdaState.selectedCharacter = cardEl.dataset.value;
    try { localStorage.setItem(CHARACTER_STORAGE_KEY, cardEl.dataset.value); } catch (e) {}
  }

  const continueBtn = document.getElementById('s0-continue');
  if (continueBtn) continueBtn.disabled = false;
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TransitionScreen (Screen 02, "app download" hook)
   ═══════════════════════════════════════════════════════════ */
function advanceFromS1() {
  advanceScreen();
}
function goBackFromS1() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TransitionScreen (Screen 04 / S3, "percent represents
   part of an amount" bridge). Structurally identical to S1 (reuses
   its CSS classes and character-video map) — only the text differs.
   ═══════════════════════════════════════════════════════════ */
function advanceFromS3() {
  advanceScreen();
}
function goBackFromS3() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — InfoCardsImage as a pure knowledge/illustration screen
   (Screen 05 / S4, "shopping vs. restaurant" percent-of-an-amount
   examples). Not interactive (producer instruction) — the two cards
   are plain illustrations; "המשך" is the only way to advance.
   ═══════════════════════════════════════════════════════════ */
function advanceFromS4() {
  advanceScreen();
}
function goBackFromS4() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TwoOptionSelection (Screen 06 / S5, calculation-method
   picker). Same select/Continue mechanics as Screen 01 — see
   selectOption() — just a separate state key (this isn't a character
   choice, and it's a plain screen-to-screen advance, not the
   companion-character cross-part persistence contract).
   ═══════════════════════════════════════════════════════════ */
function s5Select(cardEl) {
  document.querySelectorAll('#s5 .option-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');
  window.lomdaState.selectedCalcMethod = cardEl.dataset.value;
  const continueBtn = document.getElementById('s5-continue');
  if (continueBtn) continueBtn.disabled = false;
}
/* Branches to the fraction carousel (S6) or the proportion carousel
   (S10) — see the currentScreen===5 edge in advanceScreen(). */
function advanceFromS5() {
  advanceScreen();   // route lives in advanceScreen(), shared with ArrowLeft
}
function goBackFromS5() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TwoOptionSelection (Screen 12 / S9, A/B reconvergence —
   duplicate of S5's picker with the "second method" subtitle. Same
   select/Continue mechanics as S5, separate state key
   (selectedCalcMethod2) so the FIRST method choice (S5's own
   selectedCalcMethod) survives to drive the disabled/already-completed
   card. advanceFromS9() delegates to advanceScreen(), whose own
   currentScreen===11 branch (see advanceScreen() above) routes to
   whichever method was NOT picked first at S5.
   ═══════════════════════════════════════════════════════════ */
function s9Select(cardEl) {
  if (cardEl.classList.contains('disabled')) return; // already-completed method, can't be re-picked
  document.querySelectorAll('#s9 .option-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');
  window.lomdaState.selectedCalcMethod2 = cardEl.dataset.value;
  const continueBtn = document.getElementById('s9-continue');
  if (continueBtn) continueBtn.disabled = false;
}
function advanceFromS9() {
  advanceScreen();
}
function goBackFromS9() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — "Carousel" 5-step slider (Screen 15 / S10, proportion-
   table method, slides 25-29). See index.html's
   section comment above #s10 for the step2-progressive-reveal design
   note. Content persists across screen switches (no reset-to-0 on
   re-entry), same as S6.
   ═══════════════════════════════════════════════════════════ */
const S10_LAST_STEP = 4;
let s10Step = 0;
let s10SubReveal = 0; // sub-stage counter, meaning is local to whichever step defines S10_SUB_MAX for it
// Steps with their own internal reveal stages (index -> max sub-stage, 0-based):
// step 2 (slide 27) has an explicit 3-paragraph reveal in the production notes.
// step 3 (slide 28) is NOT explicitly staged in the notes, but its own note
// ("הערה כללית על נוסחאות - שלא יהיו צפופות מידי וקריאות" — formulas must not
// be cramped) plus a measured overflow into the bottom bar at 1280x710 (the
// same equation-chain shown all at once genuinely doesn't fit) made a 2-stage
// split the only content-preserving fix — see s10Step3Html()'s own comment.
const S10_SUB_MAX = { 2: 2, 3: 2 };

/* Live proportion table — Figma-confirmed spec (see .s10-table in
   style.css). Each data row argument is still [percentCell, quantityCell]
   — callers are unchanged — but the RENDER order is כמות right / אחוז
   left (producer instruction, 2026-08-20, applied project-wide: the
   percent column is always the physically leftmost of the two), so each
   row prints row[1] (quantity) before row[0] (percent). An empty string
   renders a blank cell (the not-yet-filled-in state). */
function s10Table(row1, row2) {
  return '<table class="s10-table"><tr><th>الكمية</th><th>النسبة المئوية</th></tr>' +
    '<tr><td>' + row1[1] + '</td><td>' + row1[0] + '</td></tr>' +
    '<tr><td>' + row2[1] + '</td><td>' + row2[0] + '</td></tr></table>';
}

const S10_STEP_HTML = [
  // Step 1 (slide 25) — intro: what we're given, what we're building.
  '<p>علينا إيجاد <strong>قيمة النسبة المئوية المعطاة</strong> من <strong>الكمية الكاملة‎.</strong></p>' +
  '<p>عندما يكون معطى لنا:</p>' +
  '<ol class="s10-list"><li>الكمية الكاملة</li><li>النسبة المئوية المعطاة</li><li>الصحيح بالنسبة المئوية - 100‏‎%</li></ol>' +
  '<p>نبني جدول تناسب ونحسب من خلال التناسب (مقارنة النسب)‎.</p>',

  // Step 2 (slide 26) — worked example setup, no table yet.
  '<p><strong class="s6-step-label">في المرحلة الأولى:</strong><br>نقرأ المعطيات ونحدد الكميات والنسب المئوية‎:</p>' +
  '<p>مثلًا، معطى أن الصحيح هو 60، أي الـ %100.</p>' +
  '<p>ومعطاة لنا أيضًا النسبة المئوية: %20</p>' +
  '<p>السؤال هو: كم تساوي %20 من 60؟</p>',

  // Steps 3 and 4 (slides 27-28) are staged reveals — see s10Step2Html()/
  // s10Step3Html(), not static strings.
  null,
  null,

  /* Step 5 (slide 29) — sanity-check the result.
     Check equation restored (producer correction, 2026-08-20): the
     12/60 = 1/5 = 20/100 = 20% line is an OMML object on slide29
     (AlternateContent at x=157), so it never appeared in the <a:t> run
     dump the original build worked from — only the prose came through.
     Read off the slide's own rendered fallback, ppt/media/image32.png.
     Placed INSIDE the prose flow — after the "12 לחלק ל- 60..." line it
     demonstrates and before the "באמת צדקנו!" conclusion it justifies
     (producer instruction, 2026-08-20). The slide itself parks it in a
     separate left-hand block; the producer moved it into the reading
     order instead, so this step stays single-column rather than reusing
     steps 2-3's `.s6-two-col`. `--right` aligns it with the prose lines,
     the same treatment step 3's own in-column equation uses. */
  '<p><strong class="s6-step-label">المرحلة 4:</strong><br><strong>الفحص‎:</strong></p>' +
  '<p>نفحص هل النتيجة التي حصلنا عليها منطقية؟</p>' +
  '<p>نفحص بالطريقة التي تناسبنا‎:</p>' +
  '<p>مثلًا من خلال التحويل إلى كسر بسيط:<br>12 على 60 يساوي خُمسين، أي %20.</p>' +
  '<div class="s6-equation s6-equation--right">' + s6Frac(12, 60) + '<span>=</span>' + s6Frac(1, 5) +
    '<span>=</span>' + s6Frac(20, 100) + '<span>=</span><span>20%</span></div>' +
  '<p><strong>لقد كنا على صواب فعلًا‎!</strong></p>',
];

/* Step 2 (station 3, slide 27) — FIXED two-column skeleton (producer
   correction, 2026-08-06): the table lives in a permanent left column
   and the text in a permanent right column (S6's own `.s6-two-col` /
   `.s6-col-right` (text, first DOM → renders right) / `.s6-col-left`
   (table, second DOM → renders left)), built ONCE per entry into this
   step — s10UpdateUI() only calls s10BuildStep2Skeleton() when the
   skeleton isn't already the current body content. The 3 internal
   reveal stages (production notes: "הטקסט פה מחולק ל3 פסקאות") then
   only toggle which paragraphs/cells are visible inside that already-
   built skeleton via s10ApplyStep2Reveal() — nothing is torn down or
   repositioned between stages, so the table never moves regardless of
   how tall the revealed text grows (`align-items:flex-start` on
   `.s6-two-col` keeps each column's start position independent of the
   other's height). */
function s10BuildStep2Skeleton() {
  return (
    '<div class="s6-two-col">' +
      '<div class="s6-col-right">' +
        '<p><strong class="s6-step-label">في المرحلة الثانية:</strong><br>نكتب المعطيات المتوفرة لدينا في جدول التناسب‎:</p>' +
        '<p class="s10-reveal" id="s10-s2-p1">نكتب في السطر السفلي <strong>الكمية</strong> الكاملة (60)، ومقابلها مكتب <strong>الصحيح بالنسبة المئوية</strong> (100%).</p>' +
        '<p class="s10-reveal" id="s10-s2-p2">نكتب في السطر العلوي‎ X ‎بدلًا من<strong>الكمية</strong> الجزئية (التي نبحث عنها)، ومقابلها نكتب<strong>النسبة المئوية</strong> المعطاة.<br>. وهكذا تكون النسبة المئوية المعطاة مقابل الكمية الجزئية التي نبحث عنها‎.</p>' +
      '</div>' +
      '<div class="s6-col-left">' +
        /* כמות right / אחוז left (producer instruction, 2026-08-20,
           applied project-wide) — cell ids are unchanged and still read/
           written by s10SetCell() purely by id, never by DOM position,
           so swapping which column each id's <td> sits in is a pure
           visual change. */
        '<table class="s10-table"><tr><th>الكمية</th><th>النسبة المئوية</th></tr>' +
          '<tr><td id="s10-s2-top-qty"></td><td id="s10-s2-top-pct"></td></tr>' +
          '<tr><td id="s10-s2-bottom-qty"></td><td id="s10-s2-bottom-pct"></td></tr>' +
        '</table>' +
      '</div>' +
    '</div>'
  );
}
function s10SetReveal(el, show) {
  if (!el) return;
  el.classList.toggle('s10-reveal--visible', show);
}
function s10SetCell(el, text) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('s10-cell-filled');
  if (text) { void el.offsetWidth; el.classList.add('s10-cell-filled'); }
}
function s10ApplyStep2Reveal() {
  const body = document.getElementById('s10-body');
  if (!body) return;
  s10SetReveal(document.getElementById('s10-s2-p1'), s10SubReveal >= 1);
  s10SetReveal(document.getElementById('s10-s2-p2'), s10SubReveal >= 2);
  s10SetCell(document.getElementById('s10-s2-bottom-pct'), s10SubReveal >= 1 ? '100%' : '');
  s10SetCell(document.getElementById('s10-s2-bottom-qty'), s10SubReveal >= 1 ? '60' : '');
  s10SetCell(document.getElementById('s10-s2-top-pct'), s10SubReveal >= 2 ? '20%' : '');
  s10SetCell(document.getElementById('s10-s2-top-qty'), s10SubReveal >= 2 ? 'X' : '');
}
/* Step 3 (station 4, slide 28) — FIXED two-column skeleton, table-only
   left column (producer correction, 2026-08-06, follow-up to the first
   two-column pass): each equation belongs INLINE right after the
   sentence that introduces it (producer's own annotated screenshot drew
   an arrow from each sentence straight to its equation), so only the
   TABLE is pinned in the permanent LEFT column — every equation moved
   into `.s6-col-right`, directly below its own paragraph, same as any
   other line of the narrative. This also RESTORES the source's literal
   repeat of the "20%/100% = x/60" equation (once when building the
   proportion, again right before solving it) that an earlier pass had
   deliberately dropped as a redundant duplicate — the producer wants it
   shown twice, matching the PPTX exactly. Splitting this into 4 reveal
   stages (was 3) is what makes room for the restored repeat without
   re-overflowing the 382px budget — one paragraph(+equation) per click,
   same granularity already used for step 2's own 3-paragraph reveal.
   Even at 4 stages, the fully cumulative final state measured 469px
   against the 382px budget — reproducing the earlier "cumulative
   reveal can't shrink its own final stage" lesson, since every stage
   still has to show everything by the end. The producer's own
   restored-duplicate equation is itself the fix's key: once the
   repeat (eq1b) appears, the ORIGINAL "נחלק אחוז..." sentence + its
   equation are pixel-identical scaffolding with nothing further to add
   — retired (not merely faded, fully removed from flow) at that point,
   the same "an earlier scaffold becomes redundant once restated" logic
   already used for this step's table in an earlier pass. Measured
   this alone closes the gap (see s10ApplyStep3Reveal). */
/* Left-pointing transformation arrow between two equations on the same
   row — reuses S6's own S6_UP_ARROW_SVG asset (Figma node 2880:44088)
   in its NATIVE un-rotated orientation (that SVG is a west/left-
   pointing arrow; S6 rotates it 90deg to point up for its own
   vertical layout, this use needs no rotation at all). */
const S10_LEFT_ARROW_SVG =
  '<span class="s10-eq-arrow"><svg viewBox="0 0 52.7498 39.999" fill="none" aria-hidden="true">' +
  '<path d="M20.2625 0C21.0291 0.0469136 21.7406 0.593551 21.9325 1.33594C22.1184 1.97452 21.9065 2.69287 21.4207 3.14551C16.3584 8.16901 11.29 13.1867 6.22641 18.209L51.0018 18.2568C51.968 18.2581 52.7508 19.0425 52.7498 20.0088C52.7488 20.975 51.965 21.7574 50.9989 21.7568L6.14437 21.709C11.2355 26.7585 16.3319 31.8035 21.4217 36.8535C21.949 37.3457 22.1482 38.1498 21.8817 38.8213C21.6392 39.488 20.9719 39.9521 20.2635 39.999H20.0887C19.5954 39.9677 19.1305 39.7406 18.7909 39.3867C12.7084 33.358 6.62196 27.3308 0.542812 21.2988C-0.179708 20.6223 -0.182166 19.378 0.542812 18.7031C6.62292 12.6694 12.7091 6.64291 18.7909 0.613281C19.1305 0.258626 19.5957 0.0312718 20.0907 0H20.2625Z" fill="currentColor"/>' +
  '</svg></span>';
/* Red cancel-line over each "%" (Figma node 3879:2338, "type=erase") —
   marks the two percent signs being cancelled out on the "before
   simplifying" equation in the transformation row, matching
   "נצמצם את האחוזים" (we'll cancel the percentages) literally rather
   than only in words. Replaces the earlier red-X mark (node
   1027:26020, producer instruction 2026-08-20) with a single
   round-capped diagonal stroke. */
const S10_PCT_LINE_ICON =
  '<span class="s10-pct-line"><svg viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
  '<line x1="1.3" y1="1.3" x2="12.7" y2="12.7" stroke="#B20010" stroke-width="2.6" stroke-linecap="round"/>' +
  '</svg></span>';
function s10PctStrike(text) {
  return text.replace('%', '<span class="s10-pct-strike">%' + S10_PCT_LINE_ICON + '</span>');
}
function s10BuildStep3Skeleton() {
  return (
    '<div class="s6-two-col">' +
      '<div class="s6-col-right" id="s10-s3-col-right">' +
        '<p><strong class="s6-step-label">في المرحلة الثالثة:</strong><br><strong>نبني التناسب (معادلة النسب)‎:</strong></p>' +
        '<p id="s10-s3-p0">نقسم النسبة المئوية على النسبة المئوية والكمية على الكمية ونساوي بينهما‎:</p>' +
        '<div class="s6-equation s6-equation--right" id="s10-s3-eq1a">' + s6Frac('20%', '100%') + '<span>=</span>' + s6Frac('x', '60') + '</div>' +
        '<p class="s10-reveal" id="s10-s3-p1">في المرحلة الثالثة نحل المعادلة - نختزل النسب المئوية ونحصل على المعادلة‎:</p>' +
        '<div class="s10-eq-row s10-reveal" id="s10-s3-eqrow">' +
          '<div class="s6-equation">' + s6Frac(s10PctStrike('20%'), s10PctStrike('100%')) + '<span>=</span>' + s6Frac('x', '60') + '</div>' +
          S10_LEFT_ARROW_SVG +
          '<div class="s6-equation">' + s6Frac('20', '100') + '<span>=</span>' + s6Frac('x', '60') + '</div>' +
        '</div>' +
        '<p class="s10-reveal" id="s10-s3-p3">نضرب المعادلة بالمقام المشترك 6,000 ونحصل على <span dir="ltr" class="s6-nowrap">x = 12</span>.</p>' +
        '<p class="s10-reveal" id="s10-s3-p4">الإجابة هي: %20 من 60 هي 12‏‎.</p>' +
      '</div>' +
      '<div class="s6-col-left" id="s10-s3-col-left">' +
        s10Table(['20%', 'X'], ['100%', '60']) +
      '</div>' +
    '</div>'
  );
}
function s10ApplyStep3Reveal() {
  s10SetReveal(document.getElementById('s10-s3-p1'), s10SubReveal >= 1);
  s10SetReveal(document.getElementById('s10-s3-eqrow'), s10SubReveal >= 1);
  s10SetReveal(document.getElementById('s10-s3-p3'), s10SubReveal >= 2);
  s10SetReveal(document.getElementById('s10-s3-p4'), s10SubReveal >= 2);
}

function s10CurrentSubMax() {
  return S10_SUB_MAX[s10Step] || 0;
}
function s10UpdateUI() {
  const body = document.getElementById('s10-body');
  if (body) {
    if (s10Step === 2) {
      if (!document.getElementById('s10-s2-p1')) body.innerHTML = s10BuildStep2Skeleton();
      s10ApplyStep2Reveal();
    } else if (s10Step === 3) {
      if (!document.getElementById('s10-s3-p1')) body.innerHTML = s10BuildStep3Skeleton();
      s10ApplyStep3Reveal();
    } else {
      body.innerHTML = S10_STEP_HTML[s10Step];
    }
  }

  document.querySelectorAll('#s10 .s6-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === s10Step);
  });

  const leftBtn  = document.getElementById('s10-arrow-left');  // forward
  const rightBtn = document.getElementById('s10-arrow-right'); // back-within-carousel
  if (leftBtn)  leftBtn.disabled  = s10Step === S10_LAST_STEP;
  if (rightBtn) rightBtn.disabled = s10Step === 0 && s10SubReveal === 0;

  const continueBtn = document.getElementById('s10-continue');
  if (continueBtn) continueBtn.disabled = !(s10Step === S10_LAST_STEP && s10SubReveal === s10CurrentSubMax());
}
function s10Next() {
  if (s10SubReveal < s10CurrentSubMax()) { s10SubReveal++; s10UpdateUI(); return; }
  if (s10Step >= S10_LAST_STEP) return;
  s10Step++;
  s10SubReveal = 0;
  s10UpdateUI();
}
function s10Prev() {
  if (s10SubReveal > 0) { s10SubReveal--; s10UpdateUI(); return; }
  if (s10Step <= 0) return;
  s10Step--;
  s10SubReveal = s10CurrentSubMax(); // re-entering a step from ahead shows it fully revealed
  s10UpdateUI();
}
function advanceFromS10() {
  advanceScreen();
}
/* Back steps within the carousel (and un-reveals a step's sub-stages one
   at a time); only from the very first state does it leave the screen,
   back to the method picker it was entered from — same rule as S6's
   goBackFromS6(). */
function goBackFromS10() {
  if (s10Step > 0 || s10SubReveal > 0) { s10Prev(); return; }
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — "Carousel" 3-step slider (Screen 09 / S6, percent→fraction
   method, slides 13-15). Side arrows are a
   local nav mechanism separate from the bottom Continue/Back bar.
   Corrected physical mapping (producer-confirmed): physical LEFT =
   forward (only enabled direction on step 1, disables on step 3);
   physical RIGHT = back-within-carousel (disabled on step 1, enabled
   afterward). Continue enables only once the last step is reached.
   Content persists across screen switches (no reset-to-0 on re-entry)
   — see resetScreenState(8), which just re-renders whatever step
   s6Step already is.
   ═══════════════════════════════════════════════════════════ */
const S6_LAST_STEP = 2;
let s6Step = 0;

/* Stacked-fraction markup (proper math typesetting, not "20/100"
   slash text) — see .frac / .frac-num / .frac-den in style.css. */
function s6Frac(num, den) {
  return '<span class="frac"><span class="frac-num">' + num + '</span><span class="frac-den">' + den + '</span></span>';
}
/* Up-arrow under the step-2 equation — Figma node 2880:44088 (a
   sideways line-arrow), rotated 90deg via CSS to point up. Inline SVG
   on currentColor, same technique as every other icon in this lomda. */
const S6_UP_ARROW_SVG =
  '<span class="s6-up-arrow-wrap"><svg class="s6-up-arrow" viewBox="0 0 52.7498 39.999" fill="none" aria-hidden="true">' +
  '<path d="M20.2625 0C21.0291 0.0469136 21.7406 0.593551 21.9325 1.33594C22.1184 1.97452 21.9065 2.69287 21.4207 3.14551C16.3584 8.16901 11.29 13.1867 6.22641 18.209L51.0018 18.2568C51.968 18.2581 52.7508 19.0425 52.7498 20.0088C52.7488 20.975 51.965 21.7574 50.9989 21.7568L6.14437 21.709C11.2355 26.7585 16.3319 31.8035 21.4217 36.8535C21.949 37.3457 22.1482 38.1498 21.8817 38.8213C21.6392 39.488 20.9719 39.9521 20.2635 39.999H20.0887C19.5954 39.9677 19.1305 39.7406 18.7909 39.3867C12.7084 33.358 6.62196 27.3308 0.542812 21.2988C-0.179708 20.6223 -0.182166 19.378 0.542812 18.7031C6.62292 12.6694 12.7091 6.64291 18.7909 0.613281C19.1305 0.258626 19.5957 0.0312718 20.0907 0H20.2625Z" fill="currentColor"/>' +
  '</svg></span>';

const S6_STEP_HTML = [
  // Step 1 (slide 13) — intro + worked example. Single column, unchanged.
  '<p>لحساب كمية من نسبة مئوية‎:</p>' +
  '<p>نحوّل النسبة المئوية إلى كسر ونضربها بالكمية الكاملة‎.</p>' +
  '<p>مثلًا: لدينا 60 غرضًا‎.</p>' +
  '<p class="s6-question">كم غرضًا تشكّل %20 من الـ 60 غرضًا؟</p>',

  // Step 2 (slide 14) — convert percent to fraction. Two columns: right
  // = running explanation, left = equation + up-arrow + caption.
  // "נמיר..." line forced to one line (measured 458px, fits the 490px
  // right column); the reduce-the-fraction sentence gets its own line
  // break with an inline stacked 1/5 immediately before "(חמישית),".
  '<div class="s6-two-col">' +
    '<div class="s6-col-right">' +
      '<p class="s6-question">كم غرضًا تشكّل %20 من الـ 60 غرضًا؟</p>' +
      '<p><strong class="s6-step-label">المرحلة 1:</strong><br><strong class="s6-nowrap">نحوّل النسبة المئوية إلى كسر بسيط/كسر عشري‎:</strong></p>' +
      '<p>%20 ‎هي عمليًا 20 على 100‏‎.</p>' +
      '<p>انتبهوا إلى أنه يمكن اختزال الكسر‎:<br>' + s6Frac(1, 5) + ' (خُمس)، أو كتابته كـ 0.2، بصيغة كسر عشري‎.</p>' +
    '</div>' +
    '<div class="s6-col-left">' +
      '<div class="s6-equation">' +
        '<span>20%</span><span>=</span>' +
        '<span id="s6-arrow-anchor">' + s6Frac(20, 100) + '</span>' + '<span>=</span>' +
        s6Frac(1, 5) + '<span>=</span>' +
        '<span>0.2</span>' +
      '</div>' +
      '<div class="s6-arrow-callout">' +
        S6_UP_ARROW_SVG +
        '<p class="s6-caption">تتحول النسبة المئوية إلى كسر<br>مقامه مئة (20 جزءًا من مئة)</p>' +
      '</div>' +
    '</div>' +
  '</div>',

  // Step 3 (slide 15) — multiply the fraction by the whole quantity.
  // Single column; equation right-aligned to match the text lines above
  // (not centered on the full width) — see .s6-equation--right.
  '<p class="s6-question">كم غرضًا تشكّل %20 من الـ 60 غرضًا؟</p>' +
  '<p><strong class="s6-step-label">المرحلة 2:</strong><br><strong>نضرب الكسر الذي حصلنا عليه بالكمية الكاملة</strong> (60).</p>' +
  '<div class="s6-equation s6-equation--right" style="margin-top:16px;">' +
    '<span>20%</span><span>·</span><span>60</span><span>=</span>' +
    s6Frac(20, 100) + '<span>·</span><span>60</span><span>=</span>' +
    s6Frac(1, 5) + '<span>·</span><span>60</span><span>=</span>' +
    '<span>0.2</span><span>·</span><span>60</span><span>=</span>' +
    '<span>12</span>' +
  '</div>' +
  '<p style="margin-top:16px;">%20 ‎من 60 هي 12‏‎!</p>',
];

/* Step 2's up-arrow (and its caption, moved as one unit via
   .s6-arrow-callout) needs to sit exactly under the 20/100 fraction,
   not under the equation's own visual center (the "=" chain isn't
   symmetric around that fraction) — measured against #s6-arrow-anchor
   (offsetLeft-based, so it stays correct under scaleApp()'s CSS-
   transform scaling, same technique as the PathToggle pill). */
function s6AlignUpArrow() {
  const anchor  = document.getElementById('s6-arrow-anchor');
  const callout = document.querySelector('#s6 .s6-arrow-callout');
  if (!anchor || !callout) return;
  callout.style.transform = '';
  const anchorCenter  = anchor.offsetLeft + anchor.offsetWidth / 2;
  const calloutCenter = callout.offsetLeft + callout.offsetWidth / 2;
  callout.style.transform = 'translateX(' + (anchorCenter - calloutCenter) + 'px)';
}
function s6UpdateUI() {
  const body = document.getElementById('s6-body');
  if (body) body.innerHTML = S6_STEP_HTML[s6Step];
  s6AlignUpArrow();

  document.querySelectorAll('#s6 .s6-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === s6Step);
  });

  const leftBtn  = document.getElementById('s6-arrow-left');  // forward
  const rightBtn = document.getElementById('s6-arrow-right'); // back-within-carousel
  if (leftBtn)  leftBtn.disabled  = s6Step === S6_LAST_STEP;
  if (rightBtn) rightBtn.disabled = s6Step === 0;

  const continueBtn = document.getElementById('s6-continue');
  if (continueBtn) continueBtn.disabled = s6Step !== S6_LAST_STEP;
}
function s6Next() {
  if (s6Step >= S6_LAST_STEP) return;
  s6Step++;
  s6UpdateUI();
}
function s6Prev() {
  if (s6Step <= 0) return;
  s6Step--;
  s6UpdateUI();
}
function advanceFromS6() {
  advanceScreen();
}
/* Back steps within the carousel; only from the first step does it
   leave the screen, back to the method picker it was entered from —
   producer instruction, slide 13 notes. */
function goBackFromS6() {
  if (s6Step > 0) { s6Prev(); return; }
  goBack();
}

/* ─── Standard shared image-zoom modal (720-templates → _global-
   components.md → "Image zoom") — one delegated document click handler:
   any [data-zoom-src] opens, any [data-zoom-close] closes. First use in
   this project (S2's own #s2-zoom-modal is a distinct, special-case
   live-reparenting variant — see its comment in index.html). The clone
   source is whichever inner-wrapper class the opener's frame actually
   uses: `.scq-img-inner` (ValueInputQuestion's own 380×380 frame,
   S7/S8/S11/S12) or the bare generic `.zoom-img-inner` (any other
   consumer, e.g. S4's option-cards — see that class's own CSS comment
   for why it's kept separate from .scq-img-inner). ─── */
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
  if (!document.getElementById('s7-hint-overlay')?.classList.contains('hidden')) s7CloseHint();
  if (!document.getElementById('s8-hint-overlay')?.classList.contains('hidden')) s8CloseHint();
});

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, Variant B: fraction (Screen 10 / S7).
   Follows S6 (the fraction carousel). Two attempts; hint
   hidden until the first wrong attempt (slide 16 notes); accepts either
   2/5 or 40/100 (both explicitly listed as correct). Final-wrong uses
   the View My Answer Toggle (_global-components.md) since the reveal
   overwrites the same input boxes the learner typed into.
   ═══════════════════════════════════════════════════════════ */
const S7 = { maxAttempts: 2 };
function s7IsCorrect(num, den) {
  return (num === '2' && den === '5') || (num === '40' && den === '100');
}

let s7Attempts  = 0;
let s7Answered  = false;
let s7Done      = false;
let s7LastWrong = null;   // 'num/den' snapshot of the last non-final wrong attempt
let s7Answer    = null;   // { num, den } snapshot of the learner's final-wrong answer
let s7View      = 'solution';
let s7Result    = null;   // 'correct' | 'incorrect' — which popup to reopen on return

const S7_CORRECT_BODY = [
  'نكتب %40 بصيغة كسر‎: ' + s6Frac(40, 100),
  'يمكن أيضًا الاختزال‎: ' + s6Frac(40, 100) + ' = ' + s6Frac(2, 5),
  'الكسر الملائم لـ %40 هو‎: ' + s6Frac(2, 5),
];
const S7_POPUP_CFG = {
  retry: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S7_CORRECT_BODY },
  /* PROJECT-WIDE FINAL-WRONG RULE (producer, 2026-09-01): every
     `wrong2` title — the popup shown after the LAST attempt — ends
     with a line break and a second line, "התשובה הנכונה מוצגת.", which
     the .scq-popup-title rule renders bold along with the first line.
     The title is therefore written to the element with innerHTML, not
     textContent. Deliberately NOT applied to `retry`, to `correct`, or
     to a wrong2 `answerView` — the answer view shows the learner's own
     answer, not the correct one. */
  wrong2: {
    bg: '#ffdbdc', title: 'أخطأتم – من الرائع أنكم حاولتم، والآن يمكن التدقيق‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S7_CORRECT_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
};

function s7RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s7-popup-actions');
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
function s7ResetPopupPosition(popup) {
  popup.style.left = '2px';
  popup.style.top = 'auto';
  popup.style.bottom = '76px';
}
function s7ShowPopup(type, view) {
  const popup = document.getElementById('s7-popup');
  if (!popup) return;
  let cfg = S7_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) s7ResetPopupPosition(popup);
  document.getElementById('s7-popup-title').innerHTML = cfg.title;
  document.getElementById('s7-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s7RenderPopupAction(cfg.action, () => { s7View = cfg.action.view; s7ApplyView(); });
  } else {
    s7RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

/* DELIBERATE EXCEPTION to the project-wide per-field marking rule
   (producer rule 2026-08-19, extended to every multi-input screen
   2026-08-26 — see s8FieldStates above and the matching helpers in
   parts 05/06/07). Both boxes here are marked TOGETHER, on purpose.

   Two reasons, confirmed with the producer 2026-08-26:
   1. These two boxes are ONE answer (a single fraction), not two
      independent quantities. Greening the numerator while the
      denominator is red hands the learner the answer — "your 2 is
      right, just change the 4 to something else" — which is a hint,
      not feedback.
   2. s7IsCorrect accepts TWO equivalent forms (2/5 and 40/100), so
      per-box correctness is not even well defined: for 2/100 the
      numerator is right against one form and the denominator against
      the other. Any per-box verdict would be arbitrary.

   The single icon sits to the physical RIGHT of the fraction
   (producer instruction 2026-08-26); the geometry that keeps it there
   without shifting the fraction lives in .viq-frac-ico in style.css.

   Do NOT "fix" this to match the other multi-input screens. */
function s7Mark(cls) {
  // Both boxes carry the colour (the whole fraction is the unit being
  // judged), but only ONE icon is written — the fraction's own.
  document.getElementById('s7-num-field').classList.add(cls);
  document.getElementById('s7-den-field').classList.add(cls);
  const ico = document.getElementById('s7-frac-ico');
  if (ico) ico.innerHTML = cls === 'correct' ? CHECK_SVG : WRONG_SVG;
}
function s7OnInput() {
  if (s7Answered) return;
  document.getElementById('s7-num-field').classList.remove('error', 'correct');
  document.getElementById('s7-den-field').classList.remove('error', 'correct');
  const fracIco = document.getElementById('s7-frac-ico');
  if (fracIco) fracIco.innerHTML = '';
  // First-attempt retry feedback dismissal: starting to correct hides the retry popup.
  const popup = document.getElementById('s7-popup');
  if (s7Attempts > 0 && !popup.classList.contains('hidden')) popup.classList.add('hidden');
  const num = document.getElementById('s7-num').value.trim();
  const den = document.getElementById('s7-den').value.trim();
  const hasBoth = num !== '' && den !== '';
  document.getElementById('s7-check').disabled = !hasBoth || (num + '/' + den === s7LastWrong);
}

function s7Check() {
  if (s7Answered) { advanceScreen(); return; }
  const numInput = document.getElementById('s7-num');
  const denInput = document.getElementById('s7-den');
  const num = numInput.value.trim();
  const den = denInput.value.trim();
  if (!num || !den) return;

  s7Attempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s7Ok = s7IsCorrect(num, den);

  /* xAPI: answered - before the branches so the correct, retry and
     final-wrong paths each report once. num/den were read at the top of
     this function, so they are the learner's own even on the final-wrong
     path where s7ApplyView() reveals the solution into those inputs. */
  xapiAnswered('004', 'q1', s7Ok,
    s7Ok || s7Attempts >= S7.maxAttempts,
    num + '/' + den);

  if (s7Ok) {
    s7Result = 'correct';
    s7Mark('correct');
    s7ShowPopup('correct');
    s7Finish();
  } else if (s7Attempts >= S7.maxAttempts) {
    s7Result = 'incorrect';
    s7Answer = { num, den };   // snapshot BEFORE the reveal overwrites the inputs
    s7Finish();
    s7View = 'solution';
    s7ApplyView();   // sets the correct/error class per view — solution is green, never red
  } else {
    s7Mark('error');
    s7LastWrong = num + '/' + den;
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
  document.getElementById('s7-num').disabled = true;
  document.getElementById('s7-den').disabled = true;
  const chk = document.getElementById('s7-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  // Hint is only relevant while the question is still open — hide it (not
  // just disable it) once resolved, correct-first-try or final-wrong alike.
  const hintBtn = document.getElementById('s7-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s7Finish() {
  s7Answered = true;
  s7Done = true;
  s7FinishDom();
}
function s7ApplyView() {
  if (s7Answer === null) return;
  const numInput = document.getElementById('s7-num');
  const denInput = document.getElementById('s7-den');
  const numField = document.getElementById('s7-num-field');
  const denField = document.getElementById('s7-den-field');
  const fracIco  = document.getElementById('s7-frac-ico');
  if (s7View === 'answer') {
    // The learner's own (wrong) answer — red. ONE icon for the whole
    // fraction (see s7Mark's header comment): never a per-box verdict.
    numInput.value = s7Answer.num;
    denInput.value = s7Answer.den;
    numField.classList.remove('correct'); numField.classList.add('error');
    denField.classList.remove('correct'); denField.classList.add('error');
    if (fracIco) fracIco.innerHTML = WRONG_SVG;
  } else {
    // The correct solution — green, never red (it's the right answer being shown).
    numInput.value = '2';
    denInput.value = '5';
    numField.classList.remove('error'); numField.classList.add('correct');
    denField.classList.remove('error'); denField.classList.add('correct');
    if (fracIco) fracIco.innerHTML = CHECK_SVG;
  }
  s7ShowPopup('wrong2', s7View);
}
function s7ToggleView() {
  if (s7Answer === null) return;
  s7View = (s7View === 'solution') ? 'answer' : 'solution';
  s7ApplyView();
}
function s7RevealHint() {
  const hintBtn = document.getElementById('s7-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
/* Full-canvas modal (established shared component — see style.css
   comment). Opens on the hint button; the button then disables (per
   the skill's documented "hint button disables after use" behavior),
   since the question's own attempts-count already grants a fixed
   number of tries and the hint is a one-time reveal, not re-openable. */
function s7OpenHint() {
  if (s7Answered) return;
  /* xAPI: requested.1 - AFTER the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s7-hint-overlay')?.classList.remove('hidden');
}
function s7CloseHint() {
  document.getElementById('s7-hint-overlay')?.classList.add('hidden');
}
function s7CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's7-hint-overlay') s7CloseHint();
}
function s7ResetInitial() {
  s7Attempts = 0;
  s7Answered = false;
  s7LastWrong = null;
  s7Answer = null;
  s7View = 'solution';
  s7Result = null;
  const numInput = document.getElementById('s7-num');
  const denInput = document.getElementById('s7-den');
  if (numInput) { numInput.value = ''; numInput.disabled = false; }
  if (denInput) { denInput.value = ''; denInput.disabled = false; }
  document.getElementById('s7-num-field')?.classList.remove('error', 'correct');
  document.getElementById('s7-den-field')?.classList.remove('error', 'correct');
  const s7FracIco = document.getElementById('s7-frac-ico'); if (s7FracIco) s7FracIco.innerHTML = '';
  document.getElementById('s7-popup')?.classList.add('hidden');
  document.getElementById('s7-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s7-hint');
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; }
  const chk = document.getElementById('s7-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function goBackFromS7() {
  goBack();
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, Variant A: two values inline in one
   equation (Screen 11 / S8). Continues directly from S7 — same item,
   its own screen (not an internal step). Same hint/attempt policy as S7
   (no override in this slide's own notes).
   Producer correction, 2026-08-19: "200" (the playlist total) is its
   own input too, not a given constant — validated holistically together
   with the final answer, same pattern as S12's multi-field group
   (s12Inputs()/s12Fields()/s12Icos()/s12IsCorrect(), just 2 fields
   instead of 5): one wrong entry fails the whole attempt, and a retry
   must change at least one field to re-enable the check button.
   ═══════════════════════════════════════════════════════════ */
const S8 = { correctTotal: 200, correct: 80, maxAttempts: 2 };

let s8Attempts  = 0;
let s8Answered  = false;
let s8Done      = false;
let s8LastWrong = null;
let s8Answer    = null;
let s8View      = 'solution';
let s8Result    = null;   // 'correct' | 'incorrect' — which popup to reopen on return

/* The two pure-equation lines carry no Hebrew (strong-RTL) characters, so
   the popup's direction:rtl becomes the deciding bidi context and reverses
   the whole numeric sequence's visual order — wrap them in dir="ltr" (same
   fix as S6/S8's own on-screen equations) to force correct reading order. */
const S8_CORRECT_BODY = [
  'نضرب الكسر بالعدد الكامل‎.',
  'في حالتنا - 200 أغنية في قائمة التشغيل‎.',
  // "או" separates the two equivalent methods, so it belongs BETWEEN
  // them (producer correction, 2026-08-20). It used to sit after both,
  // where it read as if it introduced the conclusion line below.
  '<span dir="ltr">40% · 200 = ' + s6Frac(2, 5) + ' · 200 = 80</span>',
  'أو',
  '<span dir="ltr">40% · 200 = 0.4 · 200 = 80</span>',
  'يوجد 80 أغنية عربية في قائمة التشغيل‎.',
];
const S8_POPUP_CFG = {
  retry: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S8_CORRECT_BODY },
  wrong2: {
    bg: '#ffdbdc', title: 'أخطأتم - هذه مرحلة مهمة في الطريق إلى الحل الدقيق‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S8_CORRECT_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
};

function s8RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s8-popup-actions');
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
function s8ResetPopupPosition(popup) {
  popup.style.left = '2px';
  popup.style.top = 'auto';
  popup.style.bottom = '76px';
}
function s8ShowPopup(type, view) {
  const popup = document.getElementById('s8-popup');
  if (!popup) return;
  let cfg = S8_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) s8ResetPopupPosition(popup);
  document.getElementById('s8-popup-title').innerHTML = cfg.title;
  document.getElementById('s8-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s8RenderPopupAction(cfg.action, () => { s8View = cfg.action.view; s8ApplyView(); });
  } else {
    s8RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

function s8Inputs() {
  return { total: document.getElementById('s8-total'), final: document.getElementById('s8-input') };
}
function s8Fields() {
  return { total: document.getElementById('s8-total-field'), final: document.getElementById('s8-input-field') };
}
function s8Icos() {
  return { total: document.getElementById('s8-total-ico'), final: document.getElementById('s8-input-ico') };
}
function s8Signature(i) {
  return i.total.value + '|' + i.final.value;
}
function s8IsCorrect(v) {
  return Number(v.total) === S8.correctTotal && Number(v.final) === S8.correct;
}
/* Per-field correctness (producer correction, 2026-08-19): the retry
   feedback must mark EACH field by its own value, not blanket every
   field red just because the attempt as a whole failed — a learner who
   got "200" right and only "80" wrong deserves to see that, so they
   don't waste their second attempt re-typing the one they already had
   right. */
function s8FieldStates(v) {
  return { total: Number(v.total) === S8.correctTotal, final: Number(v.final) === S8.correct };
}
function s8OnInput() {
  if (s8Answered) return;
  Object.values(s8Fields()).forEach(el => el.classList.remove('error', 'correct'));
  Object.values(s8Icos()).forEach(el => { el.innerHTML = ''; });
  const popup = document.getElementById('s8-popup');
  if (s8Attempts > 0 && !popup.classList.contains('hidden')) popup.classList.add('hidden');
  const i = s8Inputs();
  const hasAll = i.total.value.trim() !== '' && i.final.value.trim() !== '';
  document.getElementById('s8-check').disabled = !hasAll || (s8Signature(i) === s8LastWrong);
}
function s8Check() {
  if (s8Answered) { advanceScreen(); return; }
  const i = s8Inputs();
  const v = { total: i.total.value.trim(), final: i.final.value.trim() };
  if (!v.total || !v.final) return;

  s8Attempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s8Ok = s8IsCorrect(v);

  /* xAPI: answered - before the branches. Values come from `v`,
     captured at the top: the final-wrong branch reveals the solution
     into these same inputs (see its own snapshot comment). */
  xapiAnswered('004', 'q2', s8Ok,
    s8Ok || s8Attempts >= S8.maxAttempts,
    Object.keys(v).map(function (k) { return k + '=' + v[k]; }).join(', '));

  if (s8Ok) {
    s8Result = 'correct';
    Object.values(s8Fields()).forEach(el => el.classList.add('correct'));
    Object.values(s8Icos()).forEach(el => { el.innerHTML = CHECK_SVG; });
    s8ShowPopup('correct');
    s8Finish();
  } else if (s8Attempts >= S8.maxAttempts) {
    s8Result = 'incorrect';
    s8Answer = v;   // snapshot BEFORE the reveal overwrites the inputs
    s8Finish();
    s8View = 'solution';
    s8ApplyView();   // sets the correct/error class per view — solution is green, never red
  } else {
    const fc = s8FieldStates(v), f = s8Fields(), ico = s8Icos();
    Object.keys(fc).forEach(k => {
      f[k].classList.add(fc[k] ? 'correct' : 'error');
      ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
    s8LastWrong = s8Signature(i);
    s8RevealHint();
    s8ShowPopup('retry');
    document.getElementById('s8-check').disabled = true;
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
function s8FinishDom() {
  Object.values(s8Inputs()).forEach(el => el.disabled = true);
  const chk = document.getElementById('s8-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  // Hint is only relevant while the question is still open — hide it (not
  // just disable it) once resolved, correct-first-try or final-wrong alike.
  const hintBtn = document.getElementById('s8-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s8Finish() {
  s8Answered = true;
  s8Done = true;
  s8FinishDom();
}
function s8ApplyView() {
  if (s8Answer === null) return;
  const i = s8Inputs();
  if (s8View === 'answer') {
    i.total.value = s8Answer.total; i.final.value = s8Answer.final;   // the learner's own (wrong) values
    /* Per-field, not blanket red (producer correction, 2026-08-19): the
       overall attempt is wrong, but a field the learner DID get right
       must still show green here — same reasoning as the retry state's
       own s8FieldStates() use in s8Check(). */
    const fc = s8FieldStates(s8Answer), f = s8Fields(), ico = s8Icos();
    Object.keys(fc).forEach(k => {
      f[k].classList.remove('correct', 'error'); f[k].classList.add(fc[k] ? 'correct' : 'error');
      ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
  } else {
    i.total.value = String(S8.correctTotal); i.final.value = String(S8.correct);   // the correct solution — green, never red
    Object.values(s8Fields()).forEach(el => { el.classList.remove('error'); el.classList.add('correct'); });
    Object.values(s8Icos()).forEach(el => { el.innerHTML = CHECK_SVG; });
  }
  s8ShowPopup('wrong2', s8View);
}
function s8ToggleView() {
  if (s8Answer === null) return;
  s8View = (s8View === 'solution') ? 'answer' : 'solution';
  s8ApplyView();
}
function s8RevealHint() {
  const hintBtn = document.getElementById('s8-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s8OpenHint() {
  if (s8Answered) return;
  /* xAPI: requested.1 - AFTER the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('004', 'q2');
  document.getElementById('s8-hint-overlay')?.classList.remove('hidden');
}
function s8CloseHint() {
  document.getElementById('s8-hint-overlay')?.classList.add('hidden');
}
function s8CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's8-hint-overlay') s8CloseHint();
}
function s8ResetInitial() {
  s8Attempts = 0;
  s8Answered = false;
  s8LastWrong = null;
  s8Answer = null;
  s8View = 'solution';
  s8Result = null;
  Object.values(s8Inputs()).forEach(el => { if (el) { el.value = ''; el.disabled = false; } });
  Object.values(s8Fields()).forEach(el => el?.classList.remove('error', 'correct'));
  Object.values(s8Icos()).forEach(el => { if (el) el.innerHTML = ''; });
  document.getElementById('s8-popup')?.classList.add('hidden');
  document.getElementById('s8-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s8-hint');
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; }
  const chk = document.getElementById('s8-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function goBackFromS8() {
  goBack();
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion IN A TABLE (Screen 15 / S11, slide 30).
   Follows the proportion carousel (S10) — see index.html's section
   comment above #s11.
   3 separate numeric inputs (row1%, row2%, row2-quantity), row1's
   quantity cell is a fixed "X" label. Correctness is holistic (all 3
   must match, mirroring s7IsCorrect's own num+den pair check) since no
   per-field feedback was authored. Hint is visible from the very first
   attempt (producer instruction for this screen specifically) rather
   than gated behind a first wrong attempt like S7/S8's own hint —
   still hidden once the question resolves, per this project's
   universal hint rule. Final-wrong uses the View My Answer Toggle
   (720-templates → ValueInputQuestion.md → "Final-attempt reveal"),
   same as S7/S8 — added 2026-08-06 after an audit against that skill
   found this screen had shipped without it (a destructive reveal
   across 3 separate fields is exactly the case the toggle exists for;
   "no source content distinguishes an answer view" was never a valid
   reason to skip it — the toggle is a template-level requirement, not
   something contingent on the producer's own slide content).
   ═══════════════════════════════════════════════════════════ */
const S11 = { maxAttempts: 2, correctPct1: '40', correctPct2: '100', correctQty2: '200' };
function s11IsCorrect(pct1, pct2, qty2) {
  return pct1 === S11.correctPct1 && pct2 === S11.correctPct2 && qty2 === S11.correctQty2;
}
/* Per-field correctness (producer correction, 2026-08-19): the retry
   feedback marks EACH cell by its own value, not every cell red just
   because the table as a whole is wrong. */
function s11FieldStates(v) {
  return {
    pct1: v.pct1 === S11.correctPct1,
    pct2: v.pct2 === S11.correctPct2,
    qty2: v.qty2 === S11.correctQty2,
  };
}

let s11Attempts = 0;
let s11Answered = false;
let s11Done     = false;
let s11Result   = null; // 'correct' | 'incorrect' — which popup to reopen on return
let s11Answer   = null; // { pct1, pct2, qty2 } snapshot of the learner's final-wrong values
let s11View     = 'solution'; // 'solution' | 'answer'

const S11_FEEDBACK_TABLE =
  '<table class="eq-table"><tr><th>عدد الأغاني</th><th>النسبة المئوية</th></tr>' +
  '<tr><td>X</td><td>40%</td></tr><tr><td>200</td><td>100%</td></tr></table>';
/* Producer correction (2026-09-01): the closing line "מיד נעבור לחישובים."
   was dropped from BOTH the correct and the final-wrong popup — this body
   is shared by the two. Do not reinstate it. */
const S11_WRONG2_BODY = ['نكتب القيم في جدول التناسب‎:', S11_FEEDBACK_TABLE];
const S11_POPUP_CFG = {
  // First (non-final) wrong attempt — this project's universal standard
  // retry popup (producer confirmed 2026-08-06, verified against
  // methodica-science-mass-measure-01-01), same as every other question
  // screen's own `retry` config. Only the FINAL wrong attempt keeps
  // this screen's own specific table-reveal content (below).
  retry: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  wrong2: {
    bg: '#ffdbdc', title: 'أخطأتم، المهم أن تحاولوا ولا تستسلموا‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.',
    body: S11_WRONG2_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
  correct: {
    bg: '#edf8ed', title: 'صحيح‎!',
    body: S11_WRONG2_BODY,
  },
};

function s11RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s11-popup-actions');
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
function s11ResetPopupPosition(popup) {
  popup.style.left = '2px';
  popup.style.top = 'auto';
  popup.style.bottom = '76px';
}
function s11ShowPopup(type, view) {
  const popup = document.getElementById('s11-popup');
  if (!popup) return;
  let cfg = S11_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) s11ResetPopupPosition(popup);
  document.getElementById('s11-popup-title').innerHTML = cfg.title;
  document.getElementById('s11-popup-body').innerHTML = cfg.body.map(p => p.startsWith('<table') ? p : '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s11RenderPopupAction(cfg.action, () => { s11View = cfg.action.view; s11ApplyView(); });
  } else {
    s11RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

function s11Inputs() {
  return {
    pct1: document.getElementById('s11-pct1'),
    pct2: document.getElementById('s11-pct2'),
    qty2: document.getElementById('s11-qty2'),
  };
}
function s11Fields() {
  return {
    pct1: document.getElementById('s11-pct1-field'),
    pct2: document.getElementById('s11-pct2-field'),
    qty2: document.getElementById('s11-qty2-field'),
  };
}
function s11Icos() {
  return {
    pct1: document.getElementById('s11-pct1-ico'),
    pct2: document.getElementById('s11-pct2-ico'),
    qty2: document.getElementById('s11-qty2-ico'),
  };
}
function s11Mark(cls) {
  const f = s11Fields(), ico = s11Icos();
  const svg = cls === 'correct' ? CHECK_SVG : WRONG_SVG;
  Object.keys(f).forEach(k => { f[k].classList.add(cls); ico[k].innerHTML = svg; });
}
function s11OnInput() {
  if (s11Answered) return;
  const { pct1, pct2, qty2 } = s11Inputs();
  const f = s11Fields(), ico = s11Icos();
  Object.values(f).forEach(el => el.classList.remove('error', 'correct'));
  Object.values(ico).forEach(el => { el.innerHTML = ''; });
  const popup = document.getElementById('s11-popup');
  if (s11Attempts > 0 && !popup.classList.contains('hidden')) popup.classList.add('hidden');
  const hasAll = pct1.value.trim() !== '' && pct2.value.trim() !== '' && qty2.value.trim() !== '';
  document.getElementById('s11-check').disabled = !hasAll;
}

function s11Check() {
  if (s11Answered) { advanceScreen(); return; }
  const { pct1, pct2, qty2 } = s11Inputs();
  const v1 = pct1.value.trim(), v2 = pct2.value.trim(), v3 = qty2.value.trim();
  if (!v1 || !v2 || !v3) return;

  s11Attempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s11Ok = s11IsCorrect(v1, v2, v3);

  /* xAPI: answered - before the branches. Named to match the field keys
     the rest of this screen uses, from the values read at the top. */
  xapiAnswered('006', 'q1', s11Ok,
    s11Ok || s11Attempts >= S11.maxAttempts,
    'pct1=' + v1 + ', pct2=' + v2 + ', qty2=' + v3);

  if (s11Ok) {
    s11Result = 'correct';
    s11Mark('correct');
    s11ShowPopup('correct');
    s11Finish();
  } else if (s11Attempts >= S11.maxAttempts) {
    s11Result = 'incorrect';
    s11Answer = { pct1: v1, pct2: v2, qty2: v3 };   // snapshot BEFORE the reveal overwrites the inputs
    s11Finish();
    s11View = 'solution';
    s11ApplyView();   // sets the correct/error class per view — solution is green, never red
  } else {
    const fc = s11FieldStates({ pct1: v1, pct2: v2, qty2: v3 });
    const f = s11Fields(), ico = s11Icos();
    Object.keys(fc).forEach(k => {
      f[k].classList.add(fc[k] ? 'correct' : 'error');
      ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
    s11ShowPopup('retry');
    document.getElementById('s11-check').disabled = true;
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
function s11FinishDom() {
  const { pct1, pct2, qty2 } = s11Inputs();
  [pct1, pct2, qty2].forEach(el => el.disabled = true);
  const chk = document.getElementById('s11-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  // Hint is only relevant while the question is still open — hide it
  // (not just disable it) once resolved, correct-first-try or final-
  // wrong alike, matching this project's universal hint rule.
  const hintBtn = document.getElementById('s11-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s11Finish() {
  s11Answered = true;
  s11Done = true;
  s11FinishDom();
}
function s11ApplyView() {
  if (s11Answer === null) return;
  const { pct1, pct2, qty2 } = s11Inputs();
  const f = s11Fields(), ico = s11Icos();
  if (s11View === 'answer') {
    // The learner's own (wrong) answer — per-field, not blanket red
    // (producer correction, 2026-08-19): a cell they DID get right must
    // still show green here, same as the retry state's own
    // s11FieldStates() use in s11Check().
    pct1.value = s11Answer.pct1; pct2.value = s11Answer.pct2; qty2.value = s11Answer.qty2;
    const fc = s11FieldStates(s11Answer);
    Object.keys(f).forEach(k => {
      f[k].classList.remove('correct', 'error'); f[k].classList.add(fc[k] ? 'correct' : 'error');
      ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
  } else {
    // The correct solution — green, never red (it's the right answer being shown).
    pct1.value = S11.correctPct1; pct2.value = S11.correctPct2; qty2.value = S11.correctQty2;
    Object.keys(f).forEach(k => { f[k].classList.remove('error'); f[k].classList.add('correct'); ico[k].innerHTML = CHECK_SVG; });
  }
  s11ShowPopup('wrong2', s11View);
}
function s11ToggleView() {
  if (s11Answer === null) return;
  s11View = (s11View === 'solution') ? 'answer' : 'solution';
  s11ApplyView();
}
function s11OpenHint() {
  if (s11Answered) return;
  /* xAPI: requested.1 - AFTER the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('006', 'q1');
  document.getElementById('s11-hint-overlay')?.classList.remove('hidden');
}
function s11CloseHint() {
  document.getElementById('s11-hint-overlay')?.classList.add('hidden');
}
function s11CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's11-hint-overlay') s11CloseHint();
}
function s11ResetInitial() {
  s11Attempts = 0;
  s11Answered = false;
  s11Result = null;
  s11Answer = null;
  s11View = 'solution';
  const { pct1, pct2, qty2 } = s11Inputs();
  [pct1, pct2, qty2].forEach(el => {
    if (!el) return;
    el.value = ''; el.disabled = false;
  });
  Object.values(s11Fields()).forEach(el => el?.classList.remove('error', 'correct'));
  Object.values(s11Icos()).forEach(el => { if (el) el.innerHTML = ''; });
  document.getElementById('s11-popup')?.classList.add('hidden');
  document.getElementById('s11-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s11-hint');
  if (hintBtn) { hintBtn.style.visibility = 'visible'; hintBtn.disabled = false; }
  const chk = document.getElementById('s11-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function goBackFromS11() {
  goBack();
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, Variant A single value (Screen 16 /
   S12, slide 31). Direct linear continuation of S11 (same item ref
   -006) — see index.html's section comment above #s12. Correct = 80
   (40% of 200), confirmed via the slide's own embedded OMML equation
   (40%/100% = x/200) and its feedback text. Hint hidden until first
   wrong attempt (this template's demonstrated baseline, per both S7
   and S8 — no per-screen override given this time, unlike S11's
   explicit exception). View My Answer Toggle per the universal
   ValueInputQuestion rule, same single-field shape as S8's own.
   ═══════════════════════════════════════════════════════════ */
const S12 = {
  correctPctNum: '40', correctPctDen: '100', correctXNum: 'x', correctXDen: '200',
  correct: 80, maxAttempts: 2,
};

let s12Attempts  = 0;
let s12Answered  = false;
let s12Done      = false;
let s12LastWrong = null;
let s12Answer    = null; // { pctNum, pctDen, xNum, xDen, final } snapshot of the learner's final-wrong values
let s12View      = 'solution';
let s12Result    = null; // 'correct' | 'incorrect' — which popup to reopen on return

/* Second (simplified) equation restored (producer correction,
   2026-08-20). An earlier pass merged two separate script steps into one
   comma-joined sentence and dropped the equation between them. slide31's
   own panel runs are unambiguous: "האחוזים מצטמצמים ומקבלים את המשוואה :"
   is followed by an OMML fraction pair (it shows in the run dump as an
   empty run, "=", empty run — the fractions themselves are OMML and
   invisible to <a:t>, the "=" is plain text), and "כופלים במכנה המשותף"
   is its own sentence after that. The percentages are gone from this
   second equation — 40/100, not 40%/100% — which is exactly what
   "האחוזים מצטמצמים" states. Inline-after-the-text, matching both the
   rendered panel and S23's own structurally identical line. */
const S12_CORRECT_BODY = [
  'نبني معادلة التناسب‎:',
  '<span dir="ltr">' + s6Frac('40%', '100%') + ' = ' + s6Frac('x', '200') + '</span>',
  'نختزل النسب المئوية ونحصل على المعادلة‎: <span dir="ltr" class="s15-eq-row">' + s6Frac(40, 100) + '<span class="s15-eq-sign">=</span>' + s6Frac('x', '200') + '</span>',
  'نضرب بالمقام المشترك 200 ونحصل على <span dir="ltr">x = 80</span>.',
  'الاستنتاج: 80 أغنية من الأغاني الموجودة في قائمة التشغيل هي أغانٍ عربية‎.',
];
const S12_POPUP_CFG = {
  retry: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S12_CORRECT_BODY },
  wrong2: {
    bg: '#ffdbdc', title: 'أخطأتم، نتعلم ونتحسن ونتابع.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S12_CORRECT_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
};

function s12RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s12-popup-actions');
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
function s12ResetPopupPosition(popup) {
  popup.style.left = '2px';
  popup.style.top = 'auto';
  popup.style.bottom = '76px';
}
function s12ShowPopup(type, view) {
  const popup = document.getElementById('s12-popup');
  if (!popup) return;
  let cfg = S12_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) s12ResetPopupPosition(popup);
  document.getElementById('s12-popup-title').innerHTML = cfg.title;
  document.getElementById('s12-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s12RenderPopupAction(cfg.action, () => { s12View = cfg.action.view; s12ApplyView(); });
  } else {
    s12RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

/* 5 total inputs (producer correction, 2026-08-06): the 4 proportion
   values (40%, 100%, x, 200) that build the equation, re-entered from
   the table — confirmed as genuine inputs via the raw pptx (all 4 are
   rounded-rect "input-style" shapes, matching the same visual language
   this deck uses for every other input field, not a static display) —
   plus the original final-answer input. Validated holistically as one
   group, same pattern as S11's 3-field table. */
function s12Inputs() {
  return {
    pctNum: document.getElementById('s12-pct-num'),
    pctDen: document.getElementById('s12-pct-den'),
    xNum: document.getElementById('s12-x-num'),
    xDen: document.getElementById('s12-x-den'),
    final: document.getElementById('s12-input'),
  };
}
function s12AllInputEls() {
  const i = s12Inputs();
  return [i.pctNum, i.pctDen, i.xNum, i.xDen, i.final];
}
function s12Fields() {
  return {
    pctNum: document.getElementById('s12-pct-num-field'),
    pctDen: document.getElementById('s12-pct-den-field'),
    xNum: document.getElementById('s12-x-num-field'),
    xDen: document.getElementById('s12-x-den-field'),
    final: document.getElementById('s12-input-field'),
  };
}
function s12Icos() {
  return {
    pctNum: document.getElementById('s12-pct-num-ico'),
    pctDen: document.getElementById('s12-pct-den-ico'),
    xNum: document.getElementById('s12-x-num-ico'),
    xDen: document.getElementById('s12-x-den-ico'),
    final: document.getElementById('s12-input-ico'),
  };
}
function s12Signature(i) {
  return [i.pctNum.value, i.pctDen.value, i.xNum.value, i.xDen.value, i.final.value].join('|');
}
function s12IsCorrect(v) {
  return v.pctNum === S12.correctPctNum && v.pctDen === S12.correctPctDen &&
    v.xNum.trim().toLowerCase() === S12.correctXNum && v.xDen === S12.correctXDen &&
    Number(v.final) === S12.correct;
}
/* Per-field correctness (producer correction, 2026-08-19): the retry
   feedback marks EACH of the 5 slots by its own value, not every slot
   red just because the equation as a whole is wrong. */
function s12FieldStates(v) {
  return {
    pctNum: v.pctNum === S12.correctPctNum,
    pctDen: v.pctDen === S12.correctPctDen,
    xNum: v.xNum.trim().toLowerCase() === S12.correctXNum,
    xDen: v.xDen === S12.correctXDen,
    final: Number(v.final) === S12.correct,
  };
}
function s12OnInput() {
  if (s12Answered) return;
  Object.values(s12Fields()).forEach(el => el.classList.remove('error', 'correct'));
  Object.values(s12Icos()).forEach(el => { el.innerHTML = ''; });
  const popup = document.getElementById('s12-popup');
  if (s12Attempts > 0 && !popup.classList.contains('hidden')) popup.classList.add('hidden');
  const i = s12Inputs();
  const hasAll = [i.pctNum, i.pctDen, i.xNum, i.xDen, i.final].every(el => el.value.trim() !== '');
  document.getElementById('s12-check').disabled = !hasAll || (s12Signature(i) === s12LastWrong);
}
function s12Check() {
  if (s12Answered) { advanceScreen(); return; }
  const i = s12Inputs();
  const v = {
    pctNum: i.pctNum.value.trim(), pctDen: i.pctDen.value.trim(),
    xNum: i.xNum.value.trim(), xDen: i.xDen.value.trim(), final: i.final.value.trim(),
  };
  if (!v.pctNum || !v.pctDen || !v.xNum || !v.xDen || !v.final) return;

  s12Attempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s12Ok = s12IsCorrect(v);

  /* xAPI: answered - before the branches. Values come from `v`,
     captured at the top: the final-wrong branch reveals the solution
     into these same inputs (see its own snapshot comment). */
  xapiAnswered('006', 'q2', s12Ok,
    s12Ok || s12Attempts >= S12.maxAttempts,
    Object.keys(v).map(function (k) { return k + '=' + v[k]; }).join(', '));

  if (s12Ok) {
    s12Result = 'correct';
    Object.values(s12Fields()).forEach(el => el.classList.add('correct'));
    Object.values(s12Icos()).forEach(el => { el.innerHTML = CHECK_SVG; });
    s12ShowPopup('correct');
    s12Finish();
  } else if (s12Attempts >= S12.maxAttempts) {
    s12Result = 'incorrect';
    s12Answer = v;   // snapshot BEFORE the reveal overwrites the inputs
    s12Finish();
    s12View = 'solution';
    s12ApplyView();   // sets the correct/error class per view — solution is green, never red
  } else {
    const fc = s12FieldStates(v), f = s12Fields(), ico = s12Icos();
    Object.keys(fc).forEach(k => {
      f[k].classList.add(fc[k] ? 'correct' : 'error');
      ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
    s12LastWrong = s12Signature(i);
    s12RevealHint();
    s12ShowPopup('retry');
    document.getElementById('s12-check').disabled = true;
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
function s12FinishDom() {
  s12AllInputEls().forEach(el => el.disabled = true);
  const chk = document.getElementById('s12-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  // Hint is only relevant while the question is still open — hide it (not
  // just disable it) once resolved, correct-first-try or final-wrong alike.
  const hintBtn = document.getElementById('s12-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s12Finish() {
  s12Answered = true;
  s12Done = true;
  s12FinishDom();
}
function s12ApplyView() {
  if (s12Answer === null) return;
  const i = s12Inputs();
  if (s12View === 'answer') {
    // The learner's own (wrong) values — per-field, not blanket red
    // (producer correction, 2026-08-19): a slot they DID get right must
    // still show green here, same as the retry state's own
    // s12FieldStates() use in s12Check().
    i.pctNum.value = s12Answer.pctNum; i.pctDen.value = s12Answer.pctDen;
    i.xNum.value = s12Answer.xNum; i.xDen.value = s12Answer.xDen; i.final.value = s12Answer.final;
    const fc = s12FieldStates(s12Answer), f = s12Fields(), ico = s12Icos();
    Object.keys(fc).forEach(k => {
      f[k].classList.remove('correct', 'error'); f[k].classList.add(fc[k] ? 'correct' : 'error');
      ico[k].innerHTML = fc[k] ? CHECK_SVG : WRONG_SVG;
    });
  } else {
    // The correct solution — green, never red (it's the right answer being shown).
    i.pctNum.value = S12.correctPctNum; i.pctDen.value = S12.correctPctDen;
    i.xNum.value = S12.correctXNum; i.xDen.value = S12.correctXDen; i.final.value = String(S12.correct);
    Object.values(s12Fields()).forEach(el => { el.classList.remove('error'); el.classList.add('correct'); });
    Object.values(s12Icos()).forEach(el => { el.innerHTML = CHECK_SVG; });
  }
  s12ShowPopup('wrong2', s12View);
}
function s12ToggleView() {
  if (s12Answer === null) return;
  s12View = (s12View === 'solution') ? 'answer' : 'solution';
  s12ApplyView();
}
function s12RevealHint() {
  const hintBtn = document.getElementById('s12-hint');
  if (hintBtn) hintBtn.style.visibility = 'visible';
}
function s12OpenHint() {
  if (s12Answered) return;
  /* xAPI: requested.1 - AFTER the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('006', 'q2');
  document.getElementById('s12-hint-overlay')?.classList.remove('hidden');
}
function s12CloseHint() {
  document.getElementById('s12-hint-overlay')?.classList.add('hidden');
}
function s12CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's12-hint-overlay') s12CloseHint();
}
function s12ResetInitial() {
  s12Attempts = 0;
  s12Answered = false;
  s12LastWrong = null;
  s12Answer = null;
  s12View = 'solution';
  s12Result = null;
  s12AllInputEls().forEach(el => {
    if (!el) return;
    el.value = ''; el.disabled = false;
  });
  Object.values(s12Fields()).forEach(el => el?.classList.remove('error', 'correct'));
  Object.values(s12Icos()).forEach(el => { if (el) el.innerHTML = ''; });
  document.getElementById('s12-popup')?.classList.add('hidden');
  document.getElementById('s12-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s12-hint');
  if (hintBtn) { hintBtn.style.visibility = 'hidden'; hintBtn.disabled = false; }
  const chk = document.getElementById('s12-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function goBackFromS12() {
  goBack();
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — TransitionScreen (Screen 33 / S13, Path A+B convergence
   bridge). Reachable from whichever track (fraction, ending at S8, or
   proportion, ending at S12) finishes SECOND, regardless of which
   order the learner chose them in at S5/S9 — see advanceScreen()'s
   own currentScreen===10/16 branches for that routing. advanceFromS13
   is a plain ungated advance (no gate condition — matches the source
   slide's own presenter note "כפתור המשך יהיה זמין ללחיצה"). Back is
   direction-aware: selectedCalcMethod2 names whichever method was
   picked SECOND at S9, i.e. whichever track just finished and landed
   here, so Back returns to that track's own last screen (S12 or S8)
   rather than one fixed predecessor.
   ═══════════════════════════════════════════════════════════ */
function advanceFromS13() {
  advanceScreen();
}
function goBackFromS13() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   Screen 34 (S14) — guided-practice preview (slide 33), NOT a
   question template — no gate, no state to track. Continue is a
   plain advance; Back is a plain linear predecessor (S13 already
   resolved the Path A/B convergence, so everything downstream is a
   single unified sequence).
   ═══════════════════════════════════════════════════════════ */
function advanceFromS14() {
  advanceScreen();
}
function goBackFromS14() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   Screen 35 (S15) — guided-practice STEP 1 (slide 34), single-choice
   question rendered as a "Guided Step" card (Figma node 2384:20806 +
   states audit 2379:20435/2384:19588 — see index.html's section
   comment for the full state inventory).
   Producer-corrected interaction (supersedes this screen's first
   pass, which gated the reveal behind a separate Continue click):
   clicking an option answers IMMEDIATELY — no intermediate "selected,
   not yet checked" state, single attempt, locks all options, and only
   THEN enables Continue as a plain advance (no check step of its own,
   unlike S2Q/S7/S8/S11/S12's own "check-then-advance" shared button).
   No popup exists in this component's design — correctness reveals
   directly on the option pills (Correct/Incorrect classes), nothing
   else to show/hide.
   ═══════════════════════════════════════════════════════════ */
const S15 = { correctId: 'b' };
let s15Selected = null;
let s15Answered = false;
let s15Done     = false;

function s15Select(id) {
  if (s15Answered) return;
  s15Selected = id;
  document.querySelectorAll('#s15 .s15-opt').forEach(o => {
    if (o.dataset.id === S15.correctId) o.classList.add('correct');
    else if (o.dataset.id === id) o.classList.add('incorrect');
    o.classList.toggle('picked', o.dataset.id === id);
    o.setAttribute('aria-checked', o.dataset.id === id ? 'true' : 'false');
  });
  s15Finish();
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s15FinishDom() {
  document.querySelectorAll('#s15 .s15-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s15-continue');
  if (chk) chk.disabled = false;
}

function s15Finish() {
  s15Answered = true;
  s15Done = true;
  s15FinishDom();
}

function s15ResetInitial() {
  s15Selected = null;
  document.querySelectorAll('#s15 .s15-opt').forEach(o => {
    o.disabled = false;
    o.classList.remove('correct', 'incorrect', 'picked');
    o.setAttribute('aria-checked', 'false');
  });
  const chk = document.getElementById('s15-continue');
  if (chk) chk.disabled = true;
}

function advanceFromS15() {
  advanceScreen();
}
function goBackFromS15() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   Screen 36 (S16) — guided-practice STEP 2 (slide 35), NOT a question
   — a static explanation + reference table, no state to track (same
   shape as S14: presenter note "כפתור 'המשך' יהיה זמין ללחיצה").
   ═══════════════════════════════════════════════════════════ */
function advanceFromS16() {
  advanceScreen();
}
function goBackFromS16() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   Screen 37 (S17) — guided-practice STEP 2 continued (slide 36),
   single-choice question reusing S15's own `.s15-opt` component and
   immediate-feedback interaction verbatim (presenter note is
   identical to S15's: "התקדמות בלחיצה על הכפתורים ואז על המשך").
   Same shape as s15Select/s15Finish — separate state so S15's own
   answer isn't clobbered when both screens are visited in one session.
   ═══════════════════════════════════════════════════════════ */
const S17 = { correctId: 'b' };
let s17Selected = null;
let s17Answered = false;
let s17Done     = false;

function s17Select(id) {
  if (s17Answered) return;
  s17Selected = id;
  document.querySelectorAll('#s17 .s15-opt').forEach(o => {
    if (o.dataset.id === S17.correctId) o.classList.add('correct');
    else if (o.dataset.id === id) o.classList.add('incorrect');
    o.classList.toggle('picked', o.dataset.id === id);
    o.setAttribute('aria-checked', o.dataset.id === id ? 'true' : 'false');
  });
  s17Finish();
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s17FinishDom() {
  document.querySelectorAll('#s17 .s15-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s17-continue');
  if (chk) chk.disabled = false;
}

function s17Finish() {
  s17Answered = true;
  s17Done = true;
  s17FinishDom();
}

function s17ResetInitial() {
  s17Selected = null;
  document.querySelectorAll('#s17 .s15-opt').forEach(o => {
    o.disabled = false;
    o.classList.remove('correct', 'incorrect', 'picked');
    o.setAttribute('aria-checked', 'false');
  });
  const chk = document.getElementById('s17-continue');
  if (chk) chk.disabled = true;
}

function advanceFromS17() {
  advanceScreen();
}
function goBackFromS17() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   Screen 38 (S18) — guided-practice STEP 3 (slide 37), single-choice
   question reusing S15's own `.s15-opt` component and immediate-
   feedback interaction verbatim (presenter note identical to S15/
   S17's: "התקדמות בלחיצה על הכפתורים ואז על המשך"). Options this time
   are equations, not sentences, but the state machine is unchanged.
   ═══════════════════════════════════════════════════════════ */
const S18 = { correctId: 'b' };
let s18Selected = null;
let s18Answered = false;
let s18Done     = false;

function s18Select(id) {
  if (s18Answered) return;
  s18Selected = id;
  document.querySelectorAll('#s18 .s15-opt').forEach(o => {
    if (o.dataset.id === S18.correctId) o.classList.add('correct');
    else if (o.dataset.id === id) o.classList.add('incorrect');
    o.classList.toggle('picked', o.dataset.id === id);
    o.setAttribute('aria-checked', o.dataset.id === id ? 'true' : 'false');
  });
  s18Finish();
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s18FinishDom() {
  document.querySelectorAll('#s18 .s15-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s18-continue');
  if (chk) chk.disabled = false;
}

function s18Finish() {
  s18Answered = true;
  s18Done = true;
  s18FinishDom();
}

function s18ResetInitial() {
  s18Selected = null;
  document.querySelectorAll('#s18 .s15-opt').forEach(o => {
    o.disabled = false;
    o.classList.remove('correct', 'incorrect', 'picked');
    o.setAttribute('aria-checked', 'false');
  });
  const chk = document.getElementById('s18-continue');
  if (chk) chk.disabled = true;
}

function advanceFromS18() {
  advanceScreen();
}
function goBackFromS18() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   Screen 39 (S19) — guided-practice STEP 4 / final solution (slide
   38), NOT a question — plain reveal, no state to track (presenter
   note: "התקדמות בלחיצה על המשך", same ungated shape as S14/S16).
   ═══════════════════════════════════════════════════════════ */
function advanceFromS19() {
  advanceScreen();
}
function goBackFromS19() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   Screen 40 (S20) — TransitionScreen kickoff (slide 39, item -008).
   Plain ungated advance, same shape as S1/S3/S13. No character-swap
   video logic yet — see index.html's section comment for why.
   ═══════════════════════════════════════════════════════════ */
function advanceFromS20() {
  advanceScreen();
}
function goBackFromS20() {
  goBack();
}

/* Keyboard activation for the selection cards (Enter / Space) —
   template contract for TwoOptionSelection radiogroups. One delegated
   handler covers every screen that uses .option-card. */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const s0card = e.target.closest('#s0 .option-card');
  if (s0card) { e.preventDefault(); selectOption(s0card); return; }
  const s5card = e.target.closest('#s5 .option-card');
  if (s5card) { e.preventDefault(); s5Select(s5card); }
});

/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestion (Screen 03, "GB download" question)
   No hint button: the inline tooltip on "ג'יגה בייט" fills that role
   for this question. Feedback popup follows the shared draggable-popup
   contract (720-templates → _global-components.md → Feedback popup
   system): no close button, resets to default position on every open,
   clamped to the canvas / above the bottom bar while dragging.
   ═══════════════════════════════════════════════════════════ */
const S2Q = { correctId: 'b', maxAttempts: 2 }; // 'b' = 72 GB (36% of 200GB)

let s2qSelected  = null;
let s2qAttempts  = 0;
let s2qAnswered  = false;
let s2qDone      = false;
let s2qLastResult = null;  // 'correct' | 'wrong2' — for reopening on Back
let s2qLastWrong = null;

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

/* Correct/wrong2 body copy is still pending from the producer — only
   the retry (first-wrong) body is filled in, matching this project's
   universal standard retry popup (producer confirmed 2026-08-06,
   verified against methodica-science-mass-measure-01-01). */
const S2Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎.', body: [] },
  // Body emptied (producer, 2026-09-01): it used to read "התשובה הנכונה
  // מסומנת." — a duplicate of the second title line the project-wide
  // final-wrong rule now adds. `correct` above is body-less the same way.
  wrong2:  { bg: '#ffdbdc', title: 'إجابتك غير صحيحة‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: [] }
};


function s2qShowPopup(type) {
  const popup = document.getElementById('s2q-popup');
  if (!popup) return;
  const cfg = S2Q_POPUP_CFG[type];
  if (type !== 'retry') s2qLastResult = type;   // terminal outcome, for the Back reopen
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  const titleEl = document.getElementById('s2q-popup-title');
  if (titleEl) titleEl.innerHTML = cfg.title;
  const bodyEl = document.getElementById('s2q-popup-body');
  if (bodyEl) bodyEl.innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s2qCheck() {
  if (s2qAnswered) { advanceScreen(); return; } // label is "שנמשיך?" → go next (safe no-op)
  if (!s2qSelected) return;

  s2qAttempts++;
  const isCorrect = s2qSelected === S2Q.correctId;

  /* xAPI: NO answered call here, deliberately - do not "complete the set".
     This screen is part of item 001 (הורדת אפליקציה ובר התקדמות), which is
     a motivational exploration and declares ZERO questions in metadata/.
     There is no questionId to report against, so xapiAnswered would build an
     id that does not exist in the catalogue - which Kata accepts silently
     (4.2). The screen still reports through its item's
     initialized/completed pair from SCREEN_TO_SUBCONTENT, and 001 is
     correctly absent from XAPI_EVAL_ITEMS. */

  if (isCorrect) {
    s2qMark(S2Q.correctId, 'correct');
    s2qShowPopup('correct');
    s2qFinish();
  } else if (s2qAttempts >= S2Q.maxAttempts) {
    s2qMark(S2Q.correctId, 'correct');
    s2qMark(s2qSelected, 'wrong');
    s2qShowPopup('wrong2');
    s2qFinish();
  } else {
    s2qMark(s2qSelected, 'wrong');
    s2qLastWrong = s2qSelected;
    s2qShowPopup('retry');
    s2qUpdateBar();
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
function s2qFinishDom() {
  document.querySelectorAll('#s2 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s2q-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
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
  s2qLastResult = null;
  s2qLastWrong = null;
  document.querySelectorAll('#s2 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s2q-popup')?.classList.add('hidden');
  const chk = document.getElementById('s2q-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function goBackFromS2() {
  goBack();
}

/* ═══════════════════════════════════════════════════════════
   S2 loading-bar widget — a learning SIMULATION overlaid on hook1.png,
   entirely independent of the SCQ question/answer logic above: no
   validation, no correct answer, no stored value, never gates
   Continue/navigation. Default 50% only proves it's interactive.
   Built on a native <input type="range"> so drag, click-anywhere-on-
   track, and 1%-step keyboard nudging are all free native behavior —
   see .s2-slider in css/style.css for the cross-browser track/thumb
   restyling (WebKit fill via a --s2-fill-pct gradient var; Firefox via
   ::-moz-range-progress).
   ═══════════════════════════════════════════════════════════ */
function s2SliderInput(el) {
  const pct = parseInt(el.value, 10);
  el.setAttribute('aria-valuetext', pct + ' بالمئة، ' + (pct * 2) + ' من أصل 200 جيغابايت');
  const label = document.getElementById('s2-slider-pct');
  if (label) label.textContent = pct + '%';
  const value = document.getElementById('s2-slider-value');
  if (value) value.textContent = (pct * 2) + ' GB';
  // The learner just worked the slider, so both discovery affordances
  // have done their job — see s2SliderUsed below.
  s2MarkSliderUsed();
  s2SliderReflow();
}

/* "The learner has found the slider" — one session-scoped flag shared by
   BOTH discovery affordances on this widget (the container pulse and the
   gesture hint). _gesture-hints.md requires the hint's own
   gesture-understood state to be tracked independently of unrelated
   resettable screen state, and to stop permanently for the session on
   the learner's first real gesture — so this deliberately does NOT get
   cleared by resetScreenState(). The pulse is gated on the same flag on
   purpose: once the learner has used the slider, neither affordance
   should come back nagging on a later re-entry. */
let s2SliderUsed = false;
function s2MarkSliderUsed() {
  s2SliderUsed = true;
  document.querySelector('.s2-slider-wrap')?.classList.add('s2-pulse-done');
  s2GhStop();
}

/* Repositions the floating percentage label to sit above the thumb,
   clamped so it never runs past the track's own left/right edge (0%/
   100%) — required by the widget's own spec, not just nice-to-have.
   Re-run on value change, window resize, and zoom open/close, since
   all three change the pixel geometry it depends on. */
function s2SliderReflow() {
  const slider = document.getElementById('s2-slider');
  const label  = document.getElementById('s2-slider-pct');
  if (!slider || !label) return;
  const trackWidth = slider.offsetWidth;
  const half = label.offsetWidth / 2;
  const pct = (slider.value - slider.min) / (slider.max - slider.min);
  const left = Math.max(half, Math.min(trackWidth - half, trackWidth * pct));
  label.style.left = left + 'px';
  s2SliderFillReflow();
  s2GhReanchor();
}

/* Sizes the drawn fill pill (see .s2-slider-fill in css/style.css, which
   replaced the old gradient so the fill's leading end can be rounded).
   It ends at the THUMB'S CENTRE — thumbD/2 + v·(trackW − thumbD), the
   position the native thumb actually travels to — so the round thumb
   always sits centred on the fill's round end, exactly as in Figma.
   Note this is not the same as the old gradient's `v% of trackWidth`,
   which only coincided with the thumb at v=50 and drifted from it
   towards both extremes. */
function s2SliderFillReflow() {
  const slider = document.getElementById('s2-slider');
  const fill   = document.getElementById('s2-slider-fill');
  if (!slider || !fill) return;
  const trackW = slider.offsetWidth;
  const thumbD = slider.offsetHeight;
  if (!trackW || !thumbD) return;               // screen not laid out yet
  const v = (slider.value - slider.min) / (slider.max - slider.min);
  fill.style.width = (thumbD / 2 + (trackW - thumbD) * v) + 'px';
}
window.addEventListener('resize', s2SliderReflow);

/* ═══════════════════════════════════════════════════════════
   S2 gesture hint — looping hand demonstrating that the slider is
   draggable (720-templates → references/_gesture-hints.md; see the
   .s2-gh block in css/style.css for the documented deviation on the
   "never move backwards" drag rule, which doesn't apply to a slider
   where both directions are the gesture).
   ═══════════════════════════════════════════════════════════ */

/* Fingertip offset inside the 28×33 hand asset: the extended index
   finger's tip sits at x≈12, y≈0 of its own viewBox (measured from the
   exported SVG's path geometry, not eyeballed), so subtracting 12 from
   a target X puts the fingertip — not the icon's left edge — on it. */
const S2_GH_FINGERTIP_X = 12;
/* How far either side of the thumb the hand sweeps, in slider-value
   points. Kept well inside 0/100 so the hand never runs past the
   track's own ends. */
const S2_GH_SWEEP = 22;

/* Writes the three X anchors + the Y anchor as custom properties on the
   hint root. Anchors are derived from the REAL thumb geometry rather
   than estimated: a native range thumb's centre travels from thumbD/2
   to trackWidth − thumbD/2, i.e. centre(v) = thumbD/2 + v·(trackW −
   thumbD). Re-run from s2SliderReflow(), so resize and zoom open/close
   both re-anchor for free. */
function s2GhReanchor() {
  const gh     = document.getElementById('s2-gh');
  const slider = document.getElementById('s2-slider');
  const row    = document.querySelector('.s2-slider-row');
  if (!gh || !slider || !row) return;
  const trackW = slider.offsetWidth;
  const thumbD = slider.offsetHeight;          // .s2-slider height === var(--s2-thumb-d)
  if (!trackW || !thumbD) return;              // screen not laid out yet
  const travel = trackW - thumbD;
  const centreAt = v => thumbD / 2 + travel * (v / 100);
  const here = parseInt(slider.value, 10);
  const clamp = v => Math.max(0, Math.min(100, v));
  gh.style.setProperty('--s2-gh-home',  (centreAt(here) - S2_GH_FINGERTIP_X) + 'px');
  gh.style.setProperty('--s2-gh-right', (centreAt(clamp(here + S2_GH_SWEEP)) - S2_GH_FINGERTIP_X) + 'px');
  gh.style.setProperty('--s2-gh-left',  (centreAt(clamp(here - S2_GH_SWEEP)) - S2_GH_FINGERTIP_X) + 'px');
  // Fingertip lands on the thumb's own vertical centre. The slider sits
  // at bottom:0 of .s2-slider-row, so that centre is rowHeight − thumbD/2
  // in the row's coordinate space (which .s2-gh spans via inset:0).
  gh.style.setProperty('--s2-gh-top', (row.offsetHeight - thumbD / 2) + 'px');
}

let s2GhTimer = null;
let s2GhToken = 0;
function s2GhStop() {
  s2GhToken++;
  if (s2GhTimer) { clearTimeout(s2GhTimer); s2GhTimer = null; }
  const gh = document.getElementById('s2-gh');
  if (gh) gh.className = 's2-gh';
}
function s2GhStart() {
  if (s2SliderUsed) return;                    // gesture already discovered
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  s2GhStop();
  const myToken = s2GhToken;
  const gh = document.getElementById('s2-gh');
  if (!gh) return;
  s2GhReanchor();
  // One SWEEP_MS must stay >= the CSS transition on .s2-gh-hand (0.62s),
  // or a leg gets cut off mid-travel by the next phase.
  const FADE_MS = 280, SWEEP_MS = 620, DWELL_MS = 140, GAP_MS = 900;
  const LEG = SWEEP_MS + DWELL_MS;
  function phaseIn()    { if (myToken !== s2GhToken) return; gh.className = 's2-gh s2-gh-show';            s2GhTimer = setTimeout(phaseRight, FADE_MS); }
  function phaseRight() { if (myToken !== s2GhToken) return; gh.className = 's2-gh s2-gh-show s2-gh-r';    s2GhTimer = setTimeout(phaseHome1, LEG); }
  function phaseHome1() { if (myToken !== s2GhToken) return; gh.className = 's2-gh s2-gh-show';            s2GhTimer = setTimeout(phaseLeft, LEG); }
  function phaseLeft()  { if (myToken !== s2GhToken) return; gh.className = 's2-gh s2-gh-show s2-gh-l';    s2GhTimer = setTimeout(phaseHome2, LEG); }
  function phaseHome2() { if (myToken !== s2GhToken) return; gh.className = 's2-gh s2-gh-show';            s2GhTimer = setTimeout(phaseOut, LEG); }
  // Fades out already AT home, so no position change is in flight while
  // it's still partly visible — the one part of the reference's
  // fade-before-reposition discipline that still matters here.
  function phaseOut()   { if (myToken !== s2GhToken) return; gh.className = 's2-gh';                       s2GhTimer = setTimeout(phaseIn, FADE_MS + GAP_MS); }
  phaseIn();
}

/* Grabbing the thumb counts as finding the gesture even before the value
   moves — pointerdown fires on grab, whereas `input` only fires once the
   value actually changes, so a learner who presses and holds would
   otherwise still be lectured at by the hint. */
document.getElementById('s2-slider')?.addEventListener('pointerdown', s2MarkSliderUsed);

/* ── Image zoom — enlarges the whole widget (phone image + slider +
   labels). Deliberately NOT the standard clone-based image-zoom stage
   (720-templates → _global-components.md → "Image zoom"): that clones
   a static image and strips interactivity, but this widget must stay
   fully draggable/clickable while zoomed. Instead, the live #s2-widget
   node is REPARENTED into the modal's stage and back — same element,
   same listeners, just relocated and given the larger CSS size profile
   (.s2-zoomed, see css/style.css). ── */
function s2OpenZoom() {
  const widget = document.getElementById('s2-widget');
  const stage  = document.getElementById('s2-zoom-stage');
  const modal  = document.getElementById('s2-zoom-modal');
  const frame  = document.getElementById('s2-img-frame');
  if (!widget || !stage || !modal || !frame) return;
  widget.classList.add('s2-zoomed');
  stage.appendChild(widget);
  frame.classList.add('s2-source-hidden');
  modal.classList.remove('hidden');
  document.getElementById('s2-zoom-close')?.focus();
  s2SliderReflow();
}
function s2CloseZoom() {
  const widget = document.getElementById('s2-widget');
  const frame  = document.getElementById('s2-img-frame');
  const modal  = document.getElementById('s2-zoom-modal');
  if (!widget || !frame || !modal) return;
  widget.classList.remove('s2-zoomed');
  frame.insertBefore(widget, frame.firstChild);
  frame.classList.remove('s2-source-hidden');
  modal.classList.add('hidden');
  document.getElementById('s2-zoom-btn')?.focus();
  s2SliderReflow();
}
document.getElementById('s2-zoom-modal')?.addEventListener('click', e => {
  if (e.target.closest('[data-zoom-close="true"]')) s2CloseZoom();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('s2-zoom-modal')?.classList.contains('hidden')) {
    s2CloseZoom();
  }
});

/* ── Feedback popup dragging — pointer events only, clamped to the
   canvas / above the bottom bar (see _global-components.md → Feedback
   popup system → "Drag bounds" for the formula). ── */


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — MultipleChoiceQuestion (Screen 41 / S21, "שאלת חימום 1",
   slide 40, item -008). First use of this template in part 01 — S2 is
   SingleChoiceQuestion (a single id, not a Set). Reuses S2's own
   .scq-question/.scq-img/.s2-right-col/.s2-intro/.scq-qtext/
   .scq-answers/.scq-opt/.scq-radio/.scq-popup shell and the generic
   clone-based zoom (.zoom-img-inner, NOT .scq-img-inner — see that
   class's own CSS comment on why the #img-zoom-stage override there
   is hardcoded to haknaya1.jpg's aspect ratio and would distort this
   different photo). No View My Answer Toggle: MultipleChoiceQuestion.md
   excludes it — the full correct set reveals inline alongside the
   learner's own selections, so there's never a "one slot, two values"
   case the Toggle exists to resolve. Hint is visible from the start
   (no presenter-note deviation, so no s7-style RevealHint step).
   Correct set {c, d} and every option's equation/feedback body text
   below are transcribed verbatim from slide 40's own paragraph runs
   (fresh re-extraction from the unpacked pptx, not the media-folder
   OMML fallbacks — the S18 lesson: those can go stale).
   ═══════════════════════════════════════════════════════════ */
const S21 = { correctIds: new Set(['c', 'd']), maxAttempts: 2 };


let s21Selected  = new Set();
let s21Attempts  = 0;
let s21Answered  = false;
let s21Done      = false;
let s21LastResult = null;  // 'correct' | 'wrong2' — for reopening on Back
let s21LastWrong = null;   // sorted-JSON snapshot of the last non-final wrong Set

function s21Snapshot(set) {
  return JSON.stringify([...set].sort());
}

function s21Toggle(id) {
  if (s21Answered) return;
  if (s21Selected.has(id)) s21Selected.delete(id); else s21Selected.add(id);
  if (s21Attempts > 0) {
    document.getElementById('s21-popup')?.classList.add('hidden');
    document.querySelectorAll('#s21 .scq-opt').forEach(o => o.classList.remove('wrong', 'correct'));
  }
  document.querySelectorAll('#s21 .scq-opt').forEach(o => {
    const on = s21Selected.has(o.dataset.id);
    o.classList.toggle('selected', on);
    o.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  s21UpdateBar();
}

/* Shared explanation body (slide 40's own text, verbatim) — correct and
   final-wrong reuse the SAME body, titles only differ, this project's
   universal convention (see S7/S2Q). */
const S21_EXPLANATION_BODY = [
  'إذا حوّلنا %45 إلى كسر سنحصل على <span dir="ltr">' + s6Frac(45, 100) + '</span>أو 0.45‏‎.',
  // Line breaks after "השלישית:", and around the "או" that separates the
  // two equivalent products (producer instruction, 2026-08-20) — puts each
  // form on its own line instead of running all three parts together.
  'بعد ذلك نضرب بالكمية الكاملة، 80GB، كما يظهر في الإجابة الثالثة‎:<br>' +
    '<span dir="ltr" class="s15-eq-row">' + s6Frac(45, 100) + '<span class="s15-eq-sign">&middot;</span>80</span>' +
    '<br>أو<br><span dir="ltr">0.45 &middot; 80</span>.',
];
const S21_POPUP_CFG = {
  /* MCQ-ONLY retry copy (producer, 2026-09-01). A multi-select set can be
     partly right, so this screen does NOT use the project's standard
     "התשובה אינה נכונה." / "שננסה שוב?" retry popup — it says the set is
     not FULLY correct, without hinting which member is at fault. Do not
     copy this wording onto SingleChoiceQuestion screens. */
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة بالكامل‎.', body: ['حاولوا مرة أخرى‎.'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S21_EXPLANATION_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'هذا خطأ، استمروا في المحاولة، فهذا سيفيدكم كثيرًا.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S21_EXPLANATION_BODY },
};

function s21ShowPopup(type) {
  const popup = document.getElementById('s21-popup');
  if (!popup) return;
  const cfg = S21_POPUP_CFG[type];
  if (type !== 'retry') s21LastResult = type;   // terminal outcome, for the Back reopen
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  document.getElementById('s21-popup-title').innerHTML = cfg.title;
  document.getElementById('s21-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s21Mark(id, cls) {
  const opt = document.querySelector('#s21 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}

function s21Check() {
  if (s21Answered) { advanceScreen(); return; } // label is "שנמשיך?" → go next (safe no-op)
  if (s21Selected.size < 1) return;

  s21Attempts++;
  const isCorrect = setsEqual(s21Selected, S21.correctIds);

  /* xAPI: answered - before the branches. A multi-select reports the whole
     submitted SET as one response: setsEqual() is all-or-nothing and there
     is no per-option result to report without inventing one. */
  xapiAnswered('008', 'q1', isCorrect,
    isCorrect || s21Attempts >= S21.maxAttempts,
    xapiMultiAnswer(Array.from(s21Selected), function (id) { return xapiScqOptEl('s21', id); }));

  if (isCorrect) {
    S21.correctIds.forEach(id => s21Mark(id, 'correct'));
    s21ShowPopup('correct');
    s21Finish();
  } else if (s21Attempts >= S21.maxAttempts) {
    // Final wrong: reveal the FULL correct set (including any option never
    // selected) as correct, AND mark the learner's own wrong selections —
    // both at once (MultipleChoiceQuestion.md reveal rules).
    S21.correctIds.forEach(id => s21Mark(id, 'correct'));
    s21Selected.forEach(id => { if (!S21.correctIds.has(id)) s21Mark(id, 'wrong'); });
    s21ShowPopup('wrong2');
    s21Finish();
  } else {
    /* Non-final wrong: reveal the truth about EVERY option the learner
       submitted, and only those (project lead, 2026-09-01). A selected
       option that is right goes green/✓; a selected option that is wrong
       goes red/✕; a correct option the learner never picked stays
       neutral, so the retry still has something to find.

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
       selection stays fully editable (nothing is disabled until
       s21Finish), s21Toggle clears these marks and hides the popup the
       moment the set changes, and s21UpdateBar keeps צדקתי? disabled
       until the set differs from s21LastWrong.

       720-templates/references/MultipleChoiceQuestion.md still documents
       the older reveal rule; this screen deliberately does not follow it.
       Do not propagate either direction without an instruction. The
       final-wrong and correct branches above are untouched and still
       follow the template. */
    s21Selected.forEach(id => s21Mark(id, S21.correctIds.has(id) ? 'correct' : 'wrong'));
    s21LastWrong = s21Snapshot(s21Selected);
    s21ShowPopup('retry');
    s21UpdateBar();
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
function s21FinishDom() {
  document.querySelectorAll('#s21 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s21-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  // Hint is only relevant while the question is open — hide it once resolved.
  const hintBtn = document.getElementById('s21-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s21Finish() {
  s21Answered = true;
  s21Done = true;
  s21FinishDom();
}

function s21UpdateBar() {
  if (s21Answered) return;
  const chk = document.getElementById('s21-check');
  if (chk) chk.disabled = s21Selected.size < 1 || s21Snapshot(s21Selected) === s21LastWrong;
}

function s21ResetInitial() {
  s21Selected = new Set();
  s21Attempts = 0;
  s21Answered = false;
  s21LastResult = null;
  s21LastWrong = null;
  document.querySelectorAll('#s21 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s21-popup')?.classList.add('hidden');
  document.getElementById('s21-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s21-hint');
  if (hintBtn) { hintBtn.style.visibility = 'visible'; hintBtn.disabled = false; } // visible-from-start policy
  const chk = document.getElementById('s21-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function s21OpenHint() {
  if (s21Answered) return;
  /* xAPI: requested.1 - AFTER the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('008', 'q1');
  document.getElementById('s21-hint-overlay')?.classList.remove('hidden');
}
function s21CloseHint() {
  document.getElementById('s21-hint-overlay')?.classList.add('hidden');
}
function s21CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's21-hint-overlay') s21CloseHint();
}

function goBackFromS21() {
  goBack();
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — ValueInputQuestion, single value (Screen 42 / S22, part ב
   of "שאלת חימום 1", slide 41, item -008 — continues directly from
   S21's part א). NO HINT on this screen at all (presenter note: "שימו
   לב שאין רמז") — no hint button, no hint overlay, nothing to reveal;
   the wrong-attempt branch below has an explicit comment marking where
   a `showHintButton()`-equivalent call would normally sit on every
   other ValueInputQuestion screen (same convention as part04's S3).
   Correct = 36 (0.45·80 = 45/100·80). Uses the View My Answer Toggle on
   final-wrong, same reasoning as S7/S8 (the reveal overwrites the
   single input the learner typed into).
   ═══════════════════════════════════════════════════════════ */
const S22 = { correct: 36, maxAttempts: 2 };

let s22Attempts  = 0;
let s22Answered  = false;
let s22Done      = false;
let s22LastWrong = null;
let s22Answer    = null;
let s22View      = 'solution';
let s22Result    = null;   // 'correct' | 'incorrect' — which popup to reopen on return

/* Body transcribed verbatim from the slide's own rendered feedback
   mockups (ppt/media/image55.png correct / image56.png wrong2, shared
   body, titles differ only) — not the inline OMML fallbacks, per the
   standing S18 lesson. dir="ltr" on each equation for standard math
   reading order, same convention as every other on-screen equation. */
const S22_EXPLANATION_BODY = [
  'نحل التمرين‎:',
  '<span dir="ltr" class="s15-eq-row">' + s6Frac(45, 100) + '<span class="s15-eq-sign">&middot;</span>80 = 36</span>',
  'أو',
  '<span dir="ltr">0.45 &middot; 80 = 36</span>',
  'حتى الآن تم تنزيل 36‏‎ GB ‎من اللعبة إلى الهاتف‎.',
];
const S22_POPUP_CFG = {
  retry: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة‎.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S22_EXPLANATION_BODY },
  wrong2: {
    bg: '#ffdbdc', title: 'هذا خطأ، استمروا في المحاولة، فهذا سيفيدكم كثيرًا.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S22_EXPLANATION_BODY,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة‎.', body: ['يمكن مشاهدة الحل الصحيح مرة أخرى‎.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' },
    },
  },
};

function s22RenderPopupAction(action, onClick) {
  const wrap = document.getElementById('s22-popup-actions');
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
function s22ShowPopup(type, view) {
  const popup = document.getElementById('s22-popup');
  if (!popup) return;
  let cfg = S22_POPUP_CFG[type];
  if (type === 'wrong2' && view === 'answer') cfg = Object.assign({}, cfg, cfg.answerView);
  popup.style.background = cfg.bg;
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  document.getElementById('s22-popup-title').innerHTML = cfg.title;
  document.getElementById('s22-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (type === 'wrong2') {
    s22RenderPopupAction(cfg.action, () => { s22View = cfg.action.view; s22ApplyView(); });
  } else {
    s22RenderPopupAction(null, null);
  }
  popup.classList.remove('hidden');
}

function s22OnInput() {
  if (s22Answered) return;
  // State classes belong on the FIELD wrapper (which owns the border), not on
  // the borderless input inside it — same as every other viq screen here.
  document.getElementById('s22-input-field').classList.remove('error', 'correct');
  document.getElementById('s22-input-ico').innerHTML = '';
  const popup = document.getElementById('s22-popup');
  if (s22Attempts > 0 && !popup.classList.contains('hidden')) popup.classList.add('hidden');
  const val = document.getElementById('s22-input').value.trim();
  document.getElementById('s22-check').disabled = !val || (val === s22LastWrong);
}
function s22Check() {
  if (s22Answered) { advanceScreen(); return; }
  const input = document.getElementById('s22-input');
  const field = document.getElementById('s22-input-field');
  const ico   = document.getElementById('s22-input-ico');
  const raw = input.value.trim();
  if (!raw) return;

  s22Attempts++;
  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s22Ok = Number(raw) === S22.correct;

  /* xAPI: answered - before the branches. `raw` was read at the top, so it
     survives the final-wrong branch's reveal into the same input. */
  xapiAnswered('008', 'q2', s22Ok,
    s22Ok || s22Attempts >= S22.maxAttempts, raw);

  if (s22Ok) {
    s22Result = 'correct';
    field.classList.add('correct');
    ico.innerHTML = CHECK_SVG;
    s22ShowPopup('correct');
    s22Finish();
  } else if (s22Attempts >= S22.maxAttempts) {
    s22Result = 'incorrect';
    s22Answer = raw;   // snapshot BEFORE the reveal overwrites the input
    s22Finish();
    s22View = 'solution';
    s22ApplyView();   // sets the correct/error class per view — solution is green, never red
  } else {
    field.classList.add('error');
    ico.innerHTML = WRONG_SVG;
    s22LastWrong = raw;
    // No hint to reveal on this screen (presenter note: "שימו לב שאין
    // רמז") — every other ValueInputQuestion screen calls its own
    // sNRevealHint() here.
    s22ShowPopup('retry');
    document.getElementById('s22-check').disabled = true;
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
function s22FinishDom() {
  document.getElementById('s22-input').disabled = true;
  const chk = document.getElementById('s22-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
}

function s22Finish() {
  s22Answered = true;
  s22Done = true;
  s22FinishDom();
}
function s22ApplyView() {
  if (s22Answer === null) return;
  const input = document.getElementById('s22-input');
  const field = document.getElementById('s22-input-field');
  const ico   = document.getElementById('s22-input-ico');
  if (s22View === 'answer') {
    input.value = s22Answer;   // the learner's own (wrong) answer — red
    field.classList.remove('correct'); field.classList.add('error');
    ico.innerHTML = WRONG_SVG;
  } else {
    input.value = String(S22.correct);   // the correct solution — green, never red
    field.classList.remove('error'); field.classList.add('correct');
    ico.innerHTML = CHECK_SVG;
  }
  s22ShowPopup('wrong2', s22View);
}
function s22ToggleView() {
  if (s22Answer === null) return;
  s22View = (s22View === 'solution') ? 'answer' : 'solution';
  s22ApplyView();
}
function s22ResetInitial() {
  s22Attempts = 0;
  s22Answered = false;
  s22LastWrong = null;
  s22Answer = null;
  s22View = 'solution';
  s22Result = null;
  const input = document.getElementById('s22-input');
  if (input) { input.value = ''; input.disabled = false; }
  document.getElementById('s22-input-field')?.classList.remove('error', 'correct');
  const s22Ico = document.getElementById('s22-input-ico'); if (s22Ico) s22Ico.innerHTML = '';
  document.getElementById('s22-popup')?.classList.add('hidden');
  const chk = document.getElementById('s22-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}
function goBackFromS22() {
  goBack();
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestion, table-shaped options, SINGLE
   ATTEMPT (Screen 43 / S23, "שאלת חימום 2", slide 42, item -009).
   Producer correction, 2026-08-11: this screen is single-attempt just
   like S24 (its own presenter note only said "SingleChoiceQuestion"
   with no explicit attempts note when first built, but the producer
   clarified both halves of this item share the same one-attempt
   policy) — no retry state, no attempts counter, no last-wrong
   snapshot: a wrong pick goes straight to the final-wrong reveal, same
   shape as S24's own `s24Check()`. Hint visible from start (unchanged).
   Hint title is the generic "רמז" (applying the S21 correction
   proactively — see index.html's section comment).
   ═══════════════════════════════════════════════════════════ */
const S23 = { correctId: 'a' };

let s23Selected = null;
let s23Answered = false;
let s23Done     = false;
let s23LastResult = null;  // 'correct' | 'wrong2' — for reopening on Back

function s23Select(id) {
  if (s23Answered) return;
  s23Selected = id;
  document.querySelectorAll('#s23 .s23-table-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  document.getElementById('s23-check').disabled = false;
}

function s23Mark(id, cls) {
  const opt = document.querySelector('#s23 .s23-table-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}

/* Restated table transcribed verbatim from the slide's own live text
   runs (not a mockup image this time — the table is plain text/OMML-
   free content), using the shared `.eq-table` (light header) since this
   is a FEEDBACK POPUP table, not the screen's own dark-header
   `.s23-table` answer-option style — see index.html's section comment
   for why the two are deliberately different specs. */
const S23_EXPLANATION_BODY = [
  'نرتب النسبة المئوية المعطاة فوق النسبة المئوية الكاملة (%100).',
  'نرتب الكمية الجزئية فوق الكمية الكاملة المعطاة لنا‎.',
  '<table class="eq-table"><tr><th>الكمية</th><th>النسبة المئوية</th></tr><tr><td>x</td><td>15%</td></tr><tr><td>40</td><td>100%</td></tr></table>',
];
const S23_POPUP_CFG = {
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S23_EXPLANATION_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'هذا خطأ، كل خطأ يقوّي قدراتكم‎.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S23_EXPLANATION_BODY },
};

function s23ShowPopup(type) {
  const popup = document.getElementById('s23-popup');
  if (!popup) return;
  const cfg = S23_POPUP_CFG[type];
  if (type !== 'retry') s23LastResult = type;   // terminal outcome, for the Back reopen
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  document.getElementById('s23-popup-title').innerHTML = cfg.title;
  document.getElementById('s23-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s23Check() {
  if (s23Answered) { advanceScreen(); return; } // label is "שנמשיך?" → go next (safe no-op)
  if (!s23Selected) return;

  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s23Ok = s23Selected === S23.correctId;

  /* xAPI: answered - before the branches. isLast is unconditionally TRUE
     here: this screen has no attempts counter and no retry branch, so the
     first submission is always the last one (contrast every other check in
     this unit, where isLast is correct || attempts >= max).

     ⚠️ The option is looked up INLINE, not through xapiScqOptEl(): S23's
     options are .s23-table-opt (a table row), the one place in the unit
     that is not .scq-opt. The helper would return null and
     xapiAnswerText(null) returns '', i.e. an empty answer reported as if
     it were real. See the warning on xapiScqOptEl in 20-xapi.js. */
  xapiAnswered('009', 'q1', s23Ok, true,
    xapiAnswerText(document.querySelector(
      '#s23 .s23-table-opt[data-id="' + s23Selected + '"]')));

  if (s23Ok) {
    s23Mark(S23.correctId, 'correct');
    s23ShowPopup('correct');
  } else {
    s23Mark(S23.correctId, 'correct');
    s23Mark(s23Selected, 'wrong');
    s23ShowPopup('wrong2');
  }
  s23Finish();
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s23FinishDom() {
  document.querySelectorAll('#s23 .s23-table-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s23-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s23-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s23Finish() {
  s23Answered = true;
  s23Done = true;
  s23FinishDom();
}

function s23ResetInitial() {
  s23Selected = null;
  s23Answered = false;
  s23LastResult = null;
  document.querySelectorAll('#s23 .s23-table-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s23-popup')?.classList.add('hidden');
  document.getElementById('s23-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s23-hint');
  if (hintBtn) { hintBtn.style.visibility = 'visible'; hintBtn.disabled = false; }
  const chk = document.getElementById('s23-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function s23OpenHint() {
  if (s23Answered) return;
  /* xAPI: requested.1 - AFTER the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('009', 'q1');
  document.getElementById('s23-hint-overlay')?.classList.remove('hidden');
}
function s23CloseHint() {
  document.getElementById('s23-hint-overlay')?.classList.add('hidden');
}
function s23CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's23-hint-overlay') s23CloseHint();
}

function goBackFromS23() {
  goBack();
}


/* ═══════════════════════════════════════════════════════════
   TEMPLATE — SingleChoiceQuestion, single-attempt (Screen 44 / S24,
   part ב of "שאלת חימום 2", slide 43, item -009 — continues directly
   from S23). Presenter note: "רק ניסיון אחד" (only one attempt) — no
   retry state, no attempts counter, no last-wrong snapshot: a wrong
   pick goes straight to the final-wrong reveal on the very first check,
   so that machinery (present on every maxAttempts:2 screen in this
   project) would be unreachable dead code here and is omitted rather
   than kept for consistency's sake. Hint visible from start ("רמז פעיל
   מהניסיון הראשון" — active from the first attempt).
   ═══════════════════════════════════════════════════════════ */
const S24 = { correctId: 'a' }; // 'a' = כן

let s24Selected = null;
let s24Answered = false;
let s24Done     = false;
let s24LastResult = null;  // 'correct' | 'wrong2' — for reopening on Back

function s24Select(id) {
  if (s24Answered) return;
  s24Selected = id;
  document.querySelectorAll('#s24 .scq-opt').forEach(o => {
    const sel = o.dataset.id === id;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  document.getElementById('s24-check').disabled = false;
}

function s24Mark(id, cls) {
  const opt = document.querySelector('#s24 .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  opt.classList.remove('selected');
  opt.classList.add(cls);
}

/* Shared explanation body (slide 43's own rendered mockups,
   ppt/media/image58.png correct / image59.png wrong2 — pixel-identical
   body, titles differ only). */
const S24_EXPLANATION_BODY = [
  'نبني معادلة التناسب (مقارنة النسب)‎:',
  '<span dir="ltr" class="s15-eq-row">' + s6Frac('15%', '100%') + '<span class="s15-eq-sign">=</span>' + s6Frac('x', '40') + '</span>',
  'نختزل النسب المئوية ونحصل على المعادلة‎: <span dir="ltr" class="s15-eq-row">' + s6Frac(15, 100) + '<span class="s15-eq-sign">=</span>' + s6Frac('x', 40) + '</span>',
  // Colon after "ומקבלים" + line break after the 5x=30 step (producer
  // instruction, 2026-08-20), so the intermediate result and the
  // conclusion drawn from it sit on separate lines. A further break
  // after the colon itself (producer instruction, 2026-08-26) puts the
  // 5x=30 result on its own line rather than trailing the sentence that
  // introduces it — three lines now: instruction, result, conclusion.
  'نضرب بالمقام المشترك 200 ونحصل على:<br><span dir="ltr">5x=30</span><br>ومن هنا <span dir="ltr">x=6</span>.',
  'الاستنتاج: بقيت لدى أمل 6 ساعات من البطارية‎.',
  'لذلك الإجابة هي "نعم" - لدى أمل بطارية تكفي لساعتين من التمرين‎.',
];
const S24_POPUP_CFG = {
  correct: { bg: '#edf8ed', title: 'صحيح‎!', body: S24_EXPLANATION_BODY },
  wrong2:  { bg: '#ffdbdc', title: 'أخطأتم، نتعلم ونتحسن ونتابع.<br>الإجابة الإجابة الصحيحة تَظهَر الآن.', body: S24_EXPLANATION_BODY },
};

function s24ShowPopup(type) {
  const popup = document.getElementById('s24-popup');
  if (!popup) return;
  const cfg = S24_POPUP_CFG[type];
  if (type !== 'retry') s24LastResult = type;   // terminal outcome, for the Back reopen
  popup.style.background = cfg.bg;
  resetPopupPosition(popup);
  document.getElementById('s24-popup-title').innerHTML = cfg.title;
  document.getElementById('s24-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  popup.classList.remove('hidden');
}

function s24Check() {
  if (s24Answered) { advanceScreen(); return; } // label is "שנמשיך?" → go next (safe no-op)
  if (!s24Selected) return;

  /* Hoisted so the branch and the answered call share ONE evaluation. */
  const s24Ok = s24Selected === S24.correctId;

  /* xAPI: answered - before the branches. isLast is unconditionally TRUE:
     like S23 this screen has no attempts counter and no retry branch. */
  xapiAnswered('009', 'q2', s24Ok, true,
    xapiAnswerText(xapiScqOptEl('s24', s24Selected)));

  if (s24Ok) {
    s24Mark(S24.correctId, 'correct');
    s24ShowPopup('correct');
  } else {
    s24Mark(S24.correctId, 'correct');
    s24Mark(s24Selected, 'wrong');
    s24ShowPopup('wrong2');
  }
  s24Finish();
  /* §8.3 - synchronous persist on answer commit; tail, so every branch flushes. */
  if (typeof flushResumeSave === 'function') flushResumeSave();
}

/* The DOM half of finishing, split out so restoreScreenUI() can re-apply
   exactly what a resolved screen looks like WITHOUT re-running anything else.
   §8.8 rule 3: a painter mirrors DOM writes only, and a painter here runs on
   EVERY navigation - so it must never reach the state writes, and never the
   reporting that some sNFinish() in this unit also does. One source of truth
   beats copying these writes into the painter and letting the two drift. */
function s24FinishDom() {
  document.querySelectorAll('#s24 .scq-opt').forEach(o => { o.disabled = true; });
  const chk = document.getElementById('s24-check');
  if (chk) { setNavLabel(chk, 'متابعة'); chk.disabled = false; }
  const hintBtn = document.getElementById('s24-hint');
  if (hintBtn) hintBtn.style.visibility = 'hidden';
}

function s24Finish() {
  s24Answered = true;
  s24Done = true;
  s24FinishDom();
}

function s24ResetInitial() {
  s24Selected = null;
  s24Answered = false;
  s24LastResult = null;
  document.querySelectorAll('#s24 .scq-opt').forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s24-popup')?.classList.add('hidden');
  document.getElementById('s24-hint-overlay')?.classList.add('hidden');
  const hintBtn = document.getElementById('s24-hint');
  if (hintBtn) { hintBtn.style.visibility = 'visible'; hintBtn.disabled = false; }
  const chk = document.getElementById('s24-check');
  if (chk) { setNavLabel(chk, 'هل إجابتي صحيحة؟'); chk.disabled = true; }
}

function s24OpenHint() {
  if (s24Answered) return;
  /* xAPI: requested.1 - AFTER the answered guard above and immediately
     before the reveal. Opens, never toggles. */
  xapiRequestedHint('009', 'q2');
  document.getElementById('s24-hint-overlay')?.classList.remove('hidden');
}
function s24CloseHint() {
  document.getElementById('s24-hint-overlay')?.classList.add('hidden');
}
function s24CloseHintOnBackdrop(e) {
  if (e.target && e.target.id === 's24-hint-overlay') s24CloseHint();
}

function goBackFromS24() {
  goBack();
}


/* Dev-mode postMessage bridge for index_dev.html — shared, see
   ../unit-js/60-devbridge.js. ⚠️ This call moves into unit-js/90-boot.js
   once that exists. */

/* Thousands separators in numeric answer inputs — the implementation is
   shared: see ../unit-js/18-numeric-input.js for the full rationale.
   ⚠️ This call moves into unit-js/90-boot.js once that exists; it stays
   here for now so the install point in the load order is unchanged. */


/* This part's own startup, called by unit-js/90-boot.js.

   ⚠️ THE ORDER HERE IS PART 01'S AND IS DELIBERATE: the reveal runs BEFORE
   resetScreenState(0), the reverse of the other six parts. It is safe
   because this part's S0 is the character-CHOICE screen — its
   resetScreenState(0) only reads selectedCharacter (which must start null,
   per the producer rule that the choice screen always opens unselected) and
   mounts no companion character. The §8.11 avatar-flash hazard therefore
   cannot occur here. Parts 03-07 call s0ApplyCharacter() from
   resetScreenState(0) and must reset first. Do not "normalise" this. */
function partBoot() {
  Motion.reveal(document.querySelector('.screen.active'));
  resetScreenState(0); // restore state on initial page load, not only on goTo()
  PartNav.init({
    part: '01',
    getScreen: function () { return currentScreen; },
    // A trail entry written by an older build of this part (before the
    // video path was removed, when it had more screens) can name a screen
    // number that no longer exists — land on the last screen instead of
    // letting goTo()'s range guard drop the jump and strand S0.
    goTo: function (n) { goTo(Math.min(n, TOTAL_SCREENS - 1)); }
  });
}

/* ════════════ xAPI (720) — קונפיגורציה של הסין (§6.1) ════════════
   Data only. The shared layer in ../unit-js/ reads every value here at CALL
   time, which is why the block sits at the bottom, after all the code that
   uses it.

   DERIVED BY MATCHING CONTENT, NOT FROM mapping.txt. The slide-to-item file
   was dropped from the metadata export, so every line below was produced by
   reading this part's screen text against metadata/methodica-math-percent-02-01.json
   and cross-checking which screens own a *Check function. Each screen carries
   the matched item's title so the derivation stays auditable without redoing
   it. Every suffix comes from metadata/ - never from a code comment and never
   from a remembered slide number (see 4.2, and 6.2 trap 2: prose in this
   family numbers screens 1-based, these keys are 0-based).

   Items 008 and 009 are the two 'שאלת חימום' warm-ups. metadata/ originally
   catalogued them under component -02, but they are these screens (21-24), and
   a part reports exactly one component - so they were moved to -01 and re-ided
   008/009. Component -02 keeps suffixes 003-007 and is deliberately not
   renumbered: those ids already exist in Kata.

   Item 002 appears TWICE, on screens 5 and 9 - the learner picks a calculation
   method, learns it, then comes back to pick the second one, and both screens
   are that same catalogue activity. Re-entering an item that already closed
   emits a second 'initialized'; the ledger suppresses the second 'completed'
   (6.2, 'back into an item already closed'). That is the documented behaviour,
   not a bug to design around.

   Screen 2 has a *Check (s2qCheck, the download slider) but item 001 declares
   NO question in metadata/ - it is a motivational exploration. So 001 stays out
   of XAPI_EVAL_ITEMS and s2qCheck must NOT call xapiAnswered: there is no
   questionId to report against. Item 007 is the reverse case: it has one
   catalogue question but no *Check anywhere, because it is a worked example
   ('אל תפתרו אותו, רק הסתכלו') spread over screens 14-19.
*/
var SCREEN_TO_SUBCONTENT = {
  0:  null,          /* בחירת דמות מלווה - אין פריט בקטלוג */
  1:  ['001', 1],    /* הורדת אפליקציה ובר התקדמות - פתיחה */
  2:  ['001', 2],    /* אותו פריט - הורדת המשחק 200GB (s2qCheck, אין שאלה בקטלוג) */
  3:  ['001', 3],    /* אותו פריט - "גילינו שאחוז מייצג חלק מהכמות" */
  4:  null,          /* מעבר - "מתי בכלל נצטרך לחשב אחוז מתוך כמות?" */
  5:  ['002', 1],    /* בחירת שיטת חישוב - השיטה הראשונה */
  6:  ['003', 1],    /* המרת אחוז לשבר וכפל בכמות - קרוסלת הוראה */
  7:  ['004', 1],    /* פלייליסט אימונים, המרה לשבר - שלב 1 (s7Check) */
  8:  ['004', 2],    /* אותו פריט - שלב 2 (s8Check) */
  9:  ['002', 2],    /* בחירת שיטת חישוב - השיטה השנייה (אותו פריט כמו מסך 5) */
  10: ['005', 1],    /* טבלת הפרופורציה - קרוסלת הוראה */
  11: ['006', 1],    /* פלייליסט אימונים, טבלת פרופורציה - איתור הנתונים (s11Check) */
  12: ['006', 2],    /* אותו פריט - בניית המשוואה ופתרונה (s12Check) */
  13: null,          /* מעבר - "רגע לפני, בואו נפתור תרגיל אחד יחד" */
  14: ['007', 1],    /* נפתור יחד: יעד צעדים יומי - תרגיל פתור, ללא *Check */
  15: ['007', 2],    /* אותו פריט - המשך התרגיל הפתור */
  16: ['007', 3],    /* אותו פריט */
  17: ['007', 4],    /* אותו פריט */
  18: ['007', 5],    /* אותו פריט */
  19: ['007', 6],    /* אותו פריט - סיום התרגיל הפתור */
  20: null,          /* מעבר - "שתי שאלות קלילות לחימום לפני שנתקדם" */
  21: ['008', 1],    /* שאלת חימום 1: הורדת משחק - סעיף א (s21Check) */
  22: ['008', 2],    /* אותו פריט - סעיף ב (s22Check) */
  23: ['009', 1],    /* שאלת חימום 2: סוללת אוזניות - סעיף א (s23Check) */
  24: ['009', 2]     /* אותו פריט - סעיף ב (s24Check) */
};

/* Exactly TOTAL_SCREENS keys (25), 0..24, no gaps. A MISSING key is
   indistinguishable at runtime from null - the screen silently stops
   reporting. _test/verify-shared.js enforces the count, the contiguity and
   two-way coverage against metadata/ (6.2 traps 1 and 3). */

var XAPI_COMP_SLUG = 'methodica-math-percent-02-01';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* MUST end '/' - 6.1 */
var XAPI_EVAL_ITEMS = { '004': 1, '006': 1, '008': 1, '009': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-02-01.json';


/* ═══════════════ resume — the four per-part hooks (§8.7) ═══════════════
   The largest part: 25 screens, 69 state variables, twelve of them answerable.
   Here and not in the shared layer because every one of those is declared
   `let` at top level, which lives in the global LEXICAL environment and is not
   reachable through window.

   TWO THINGS IN THIS PART ARE NOT PER-SCREEN STATE and would be easy to miss:

   * window.lomdaState.selectedCalcMethod / selectedCalcMethod2 — the two
     calculation methods chosen at S5 and S9. They are not answers, they are
     ROUTING: advanceScreen()'s branch edges read them to decide whether S5
     goes to the fraction carousel or the proportion one, and whether S8/S12
     reconverge to S13 or divert to S9. Lose them and a resumed learner is sent
     down a track they did not choose, or made to repeat one they finished.
     They live on window.lomdaState rather than in a `let`, which is exactly
     why they are easy to overlook when hunting for `let s`.

   * s2GhTimer / s2GhToken are deliberately NOT captured. They are a
     setTimeout handle and a generation counter - meaningless in the next page
     load, and restoring a stale timer id could cancel a live timer. Only
     s2SliderUsed carries meaning across a reload.
*/

function capturePartPayload() {
  /* Keys come from the getter itself. Part 01 declares no S*_KEYS arrays, and
     deriving them here is drift-proof anyway: a field added to sNInputs() is
     captured without a second list needing to agree. */
  function vals(getter) {
    var i = getter(), o = {};
    Object.keys(i).forEach(function (k) { o[k] = i[k] ? i[k].value : ''; });
    return o;
  }

  return {
    currentScreen: currentScreen,

    /* ROUTING state, not answers - see the header note. */
    route: {
      calcMethod:  window.lomdaState ? (window.lomdaState.selectedCalcMethod || null) : null,
      calcMethod2: window.lomdaState ? (window.lomdaState.selectedCalcMethod2 || null) : null
    },

    /* S2 carries two independent things: the loading-bar widget's
       discovery affordances and the single-choice question. */
    s2:  { sliderUsed: s2SliderUsed },
    s2q: { selected: s2qSelected, attempts: s2qAttempts, answered: s2qAnswered,
           done: s2qDone, lastWrong: s2qLastWrong, lastResult: s2qLastResult },

    /* The two carousels. Their resetScreenState branches call sNUpdateUI(),
       which renders entirely from these counters - so restoring the counter IS
       restoring the screen, and neither needs a painter. */
    s6:  { step: s6Step },
    s10: { step: s10Step, subReveal: s10SubReveal },

    /* S7 - a fraction: two inputs judged as ONE unit (see s7Mark). */
    s7: { attempts: s7Attempts, answered: s7Answered, done: s7Done,
          lastWrong: s7LastWrong, answer: s7Answer, view: s7View, result: s7Result,
          inputs: { num: (document.getElementById('s7-num') || {}).value || '',
                    den: (document.getElementById('s7-den') || {}).value || '' } },

    s8:  { attempts: s8Attempts, answered: s8Answered, done: s8Done,
           lastWrong: s8LastWrong, answer: s8Answer, view: s8View, result: s8Result,
           inputs: vals(s8Inputs) },

    s11: { attempts: s11Attempts, answered: s11Answered, done: s11Done,
           result: s11Result, answer: s11Answer, view: s11View,
           inputs: vals(s11Inputs) },

    s12: { attempts: s12Attempts, answered: s12Answered, done: s12Done,
           lastWrong: s12LastWrong, answer: s12Answer, view: s12View,
           result: s12Result, inputs: vals(s12Inputs) },

    /* The three guided-practice steps: one click, immediate reveal, no popup. */
    s15: { selected: s15Selected, answered: s15Answered, done: s15Done },
    s17: { selected: s17Selected, answered: s17Answered, done: s17Done },
    s18: { selected: s18Selected, answered: s18Answered, done: s18Done },

    /* ⚠️ s21Selected is a SET, and a Set serialises as {} - stored as an array
       here and rebuilt as a Set in applyResumeVars, or the whole selection
       restores empty with nothing to show that it did. */
    s21: { selected: Array.from(s21Selected), attempts: s21Attempts,
           answered: s21Answered, done: s21Done,
           lastWrong: s21LastWrong, lastResult: s21LastResult },

    s22: { attempts: s22Attempts, answered: s22Answered, done: s22Done,
           lastWrong: s22LastWrong, answer: s22Answer, view: s22View,
           result: s22Result,
           input: (document.getElementById('s22-input') || {}).value || '' },

    s23: { selected: s23Selected, answered: s23Answered, done: s23Done,
           lastResult: s23LastResult },
    s24: { selected: s24Selected, answered: s24Answered, done: s24Done,
           lastResult: s24LastResult }
  };
}

function applyResumeVars(st) {
  if (!st) return;

  /* Routing first: several resetScreenState branches read these while
     painting, so they must be right before any goTo runs. */
  if (st.route && window.lomdaState) {
    window.lomdaState.selectedCalcMethod  = st.route.calcMethod;
    window.lomdaState.selectedCalcMethod2 = st.route.calcMethod2;
  }

  if (st.s2)  s2SliderUsed = !!st.s2.sliderUsed;
  if (st.s6)  s6Step = st.s6.step || 0;
  if (st.s10) { s10Step = st.s10.step || 0; s10SubReveal = st.s10.subReveal || 0; }

  if (st.s2q) {
    s2qSelected = st.s2q.selected;   s2qAttempts = st.s2q.attempts || 0;
    s2qAnswered = !!st.s2q.answered; s2qDone = !!st.s2q.done;
    s2qLastWrong = st.s2q.lastWrong; s2qLastResult = st.s2q.lastResult;
  }
  if (st.s7) {
    s7Attempts = st.s7.attempts || 0; s7Answered = !!st.s7.answered;
    s7Done = !!st.s7.done;            s7LastWrong = st.s7.lastWrong;
    s7Answer = (st.s7.answer === undefined) ? null : st.s7.answer;
    s7View = st.s7.view || 'solution'; s7Result = st.s7.result;
  }
  if (st.s8) {
    s8Attempts = st.s8.attempts || 0; s8Answered = !!st.s8.answered;
    s8Done = !!st.s8.done;            s8LastWrong = st.s8.lastWrong;
    s8Answer = (st.s8.answer === undefined) ? null : st.s8.answer;
    s8View = st.s8.view || 'solution'; s8Result = st.s8.result;
  }
  if (st.s11) {
    s11Attempts = st.s11.attempts || 0; s11Answered = !!st.s11.answered;
    s11Done = !!st.s11.done;            s11Result = st.s11.result;
    s11Answer = (st.s11.answer === undefined) ? null : st.s11.answer;
    s11View = st.s11.view || 'solution';
  }
  if (st.s12) {
    s12Attempts = st.s12.attempts || 0; s12Answered = !!st.s12.answered;
    s12Done = !!st.s12.done;            s12LastWrong = st.s12.lastWrong;
    s12Answer = (st.s12.answer === undefined) ? null : st.s12.answer;
    s12View = st.s12.view || 'solution'; s12Result = st.s12.result;
  }
  if (st.s15) { s15Selected = st.s15.selected; s15Answered = !!st.s15.answered; s15Done = !!st.s15.done; }
  if (st.s17) { s17Selected = st.s17.selected; s17Answered = !!st.s17.answered; s17Done = !!st.s17.done; }
  if (st.s18) { s18Selected = st.s18.selected; s18Answered = !!st.s18.answered; s18Done = !!st.s18.done; }
  if (st.s21) {
    /* back into a Set - see the capture note */
    s21Selected = new Set(Array.isArray(st.s21.selected) ? st.s21.selected : []);
    s21Attempts = st.s21.attempts || 0; s21Answered = !!st.s21.answered;
    s21Done = !!st.s21.done;            s21LastWrong = st.s21.lastWrong;
    s21LastResult = st.s21.lastResult;
  }
  if (st.s22) {
    s22Attempts = st.s22.attempts || 0; s22Answered = !!st.s22.answered;
    s22Done = !!st.s22.done;            s22LastWrong = st.s22.lastWrong;
    s22Answer = (st.s22.answer === undefined) ? null : st.s22.answer;
    s22View = st.s22.view || 'solution'; s22Result = st.s22.result;
  }
  if (st.s23) {
    s23Selected = st.s23.selected; s23Answered = !!st.s23.answered;
    s23Done = !!st.s23.done;       s23LastResult = st.s23.lastResult;
  }
  if (st.s24) {
    s24Selected = st.s24.selected; s24Answered = !!st.s24.answered;
    s24Done = !!st.s24.done;       s24LastResult = st.s24.lastResult;
  }
}

function applyResumeDom(st) {
  if (!st) return;
  /* Guarded per block, not once at the top (§8.9): a payload carrying one
     screen's DOM state but not another's must not skip the rest. */
  function fill(getter, stored) {
    if (!stored) return;
    var i = getter();
    Object.keys(i).forEach(function (k) {
      if (i[k] && typeof stored[k] === 'string') i[k].value = stored[k];
    });
  }

  if (st.s7 && st.s7.inputs) {
    var n7 = document.getElementById('s7-num'), d7 = document.getElementById('s7-den');
    if (n7 && typeof st.s7.inputs.num === 'string') n7.value = st.s7.inputs.num;
    if (d7 && typeof st.s7.inputs.den === 'string') d7.value = st.s7.inputs.den;
  }
  if (st.s8)  fill(s8Inputs, st.s8.inputs);
  if (st.s11) fill(s11Inputs, st.s11.inputs);
  if (st.s12) fill(s12Inputs, st.s12.inputs);
  if (st.s22 && typeof st.s22.input === 'string') {
    var e22 = document.getElementById('s22-input');
    if (e22) e22.value = st.s22.input;
  }
}

function restoreScreenUI(n) {
  /* ⚠️ NEVER delegate to resetScreenState(n) and never reach a
     sNResetInitial(): this runs on EVERY navigation (§8.4a), and reset's
     not-answered branches call sNResetInitial(), which clears the inputs and
     the selection - it would wipe a half-finished answer on every screen
     change (§8.8 rule 5, risk 1).

     Screens 0/1/3/5/6/9/10/13/20 have no painter here on purpose: they carry no
     answered state. The carousels (6, 10) render entirely from their step
     counters, which resetScreenState's own sNUpdateUI() call already does. */

  if (n === 2) {
    paintSingleChoice({
      done: s2qDone, attempts: s2qAttempts, selected: s2qSelected,
      lastWrong: s2qLastWrong, lastResult: s2qLastResult,
      correctId: S2Q.correctId,
      mark: s2qMark, showPopup: s2qShowPopup, finishDom: s2qFinishDom,
      updateBar: s2qUpdateBar
    });
  }

  if (n === 7) {
    /* The fraction is judged as ONE unit, not per box: s7Mark colours both
       fields and writes a single icon for the whole fraction. So fieldStates
       returns the same verdict for both keys, and only 'num' carries the icon
       element - which reproduces s7Mark exactly through the generic painter. */
    paintValueFields({
      done: s7Done, attempts: s7Attempts, answered: s7Answered,
      lastWrong: s7LastWrong, answer: s7Answer,
      keys: ['num', 'den'],
      inputs: function () {
        return { num: document.getElementById('s7-num'), den: document.getElementById('s7-den') };
      },
      fields: function () {
        return { num: document.getElementById('s7-num-field'),
                 den: document.getElementById('s7-den-field') };
      },
      icos: function () {
        return { num: document.getElementById('s7-frac-ico'), den: null };
      },
      fieldStates: function (v) {
        var ok = s7IsCorrect(v.num, v.den);
        return { num: ok, den: ok };
      },
      applyView: s7ApplyView, showPopup: s7ShowPopup, finishDom: s7FinishDom,
      showHint: function () { s7RevealHint(); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG,
      checkButton: undefined
    });
  }

  if (n === 8) {
    paintValueFields({
      done: s8Done, attempts: s8Attempts, answered: s8Answered,
      lastWrong: s8LastWrong, answer: s8Answer,
      keys: Object.keys(s8Inputs()),
      inputs: s8Inputs, fields: s8Fields, icos: s8Icos, fieldStates: s8FieldStates,
      applyView: s8ApplyView, showPopup: s8ShowPopup, finishDom: s8FinishDom,
      showHint: function () { s8RevealHint(); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG,
      checkButton: undefined
    });
  }

  if (n === 11) {
    paintValueFields({
      done: s11Done, attempts: s11Attempts, answered: s11Answered,
      answer: s11Answer,
      keys: Object.keys(s11Inputs()),
      inputs: s11Inputs, fields: s11Fields, icos: s11Icos, fieldStates: s11FieldStates,
      applyView: s11ApplyView, showPopup: s11ShowPopup, finishDom: s11FinishDom,
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG,
      checkButton: undefined
    });
  }

  if (n === 12) {
    paintValueFields({
      done: s12Done, attempts: s12Attempts, answered: s12Answered,
      lastWrong: s12LastWrong, answer: s12Answer,
      keys: Object.keys(s12Inputs()),
      inputs: s12Inputs, fields: s12Fields, icos: s12Icos, fieldStates: s12FieldStates,
      applyView: s12ApplyView, showPopup: s12ShowPopup, finishDom: s12FinishDom,
      showHint: function () { s12RevealHint(); },
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG,
      checkButton: undefined
    });
  }

  /* The three guided steps. Their own resetScreenState branches deliberately
     have no done-half, on the grounds that the reveal classes "are already
     sitting there" - true inside a page load, false after a reload. */
  if (n === 15) {
    paintGuidedPick({
      done: s15Done, selected: s15Selected, correctId: S15.correctId,
      options: function () { return document.querySelectorAll('#s15 .s15-opt'); },
      correctClass: 'correct', wrongClass: 'incorrect', pickedClass: 'picked',
      finishDom: s15FinishDom
    });
  }
  if (n === 17) {
    paintGuidedPick({
      done: s17Done, selected: s17Selected, correctId: S17.correctId,
      /* s17 and s18 reuse S15's option class - verified in the markup, not
         assumed from the screen number. */
      options: function () { return document.querySelectorAll('#s17 .s15-opt'); },
      correctClass: 'correct', wrongClass: 'incorrect', pickedClass: 'picked',
      finishDom: s17FinishDom
    });
  }
  if (n === 18) {
    paintGuidedPick({
      done: s18Done, selected: s18Selected, correctId: S18.correctId,
      options: function () { return document.querySelectorAll('#s18 .s15-opt'); },
      correctClass: 'correct', wrongClass: 'incorrect', pickedClass: 'picked',
      finishDom: s18FinishDom
    });
  }

  if (n === 21) {
    paintMultiSelect({
      done: s21Done, attempts: s21Attempts, lastResult: s21LastResult,
      selected: Array.from(s21Selected),
      correctIds: Array.from(S21.correctIds),
      mark: s21Mark, showPopup: s21ShowPopup, finishDom: s21FinishDom,
      updateBar: s21UpdateBar
    });
  }

  if (n === 22) {
    paintSingleValue({
      done: s22Done, attempts: s22Attempts, answer: s22Answer,
      input: function () { return document.getElementById('s22-input'); },
      field: function () { return document.getElementById('s22-input-field'); },
      ico:   function () { return document.getElementById('s22-input-ico'); },
      applyView: s22ApplyView, showPopup: s22ShowPopup, finishDom: s22FinishDom,
      okGlyph: CHECK_SVG, wrongGlyph: WRONG_SVG
    });
  }

  /* S23 and S24 resolve on the FIRST click - no attempts counter exists, so
     "attempted but unresolved" is not a reachable state and the painter's
     clean-screen guard sees attempts 0 and returns unless done. */
  if (n === 23) {
    paintSingleChoice({
      done: s23Done, attempts: 0, selected: s23Selected,
      lastResult: s23LastResult, correctId: S23.correctId,
      /* s23Mark owns the .s23-table-opt selector - the one place in the unit
         whose options are table rows rather than .scq-opt. */
      mark: s23Mark, showPopup: s23ShowPopup, finishDom: s23FinishDom
    });
  }
  if (n === 24) {
    paintSingleChoice({
      done: s24Done, attempts: 0, selected: s24Selected,
      lastResult: s24LastResult, correctId: S24.correctId,
      mark: s24Mark, showPopup: s24ShowPopup, finishDom: s24FinishDom
    });
  }
}
