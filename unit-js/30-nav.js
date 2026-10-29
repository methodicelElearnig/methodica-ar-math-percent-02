/* ═══════════════════ unit-js/30-nav.js ═══════════════════
   Shared navigation. THE one copy for this unit; loaded by every part as
   ../unit-js/30-nav.js. Edit here, there is nowhere else.

   DEFINITION-ONLY per §3.2.

   Starts with the one navigation helper whose body was byte-identical in
   all seven parts. goTo() is NOT here yet: it has seven genuinely
   different bodies (38/13/19/9/24/24/51 lines), and separating its shared
   spine from each part's own screen-leave cleanup is step 8 — the
   riskiest move in Track A, deliberately left until last.

   goBack(), advanceScreen() and resetScreenState() stay per-part
   permanently: they are the per-part router, gate table and screen
   dispatcher, not shared logic. Part 01's goBack is a different
   navigation MODEL (a visit trail), not a stale copy of the others. */

/* Keyboard navigation — global left/right, matching every other part.
   Must not fire while focus is on a control where ArrowLeft/ArrowRight
   already has its own in-control meaning (caret move in a text/number
   field, native slider value change, textarea/contenteditable caret,
   select option cycling) — otherwise ordinary editing inside e.g. the
   S1 table's number cells silently double-fires as screen navigation.
   Generalizes the old range-only guard (carried over from parts 01-03)
   rather than special-casing just `type === 'number'`. */
function hasOwnArrowKeyMeaning(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    // Every INPUT type except pure-selection controls gives ArrowLeft/
    // ArrowRight an intrinsic, in-control meaning (caret move, spinner/
    // slider value change, native date/time segment change, etc.).
    const noArrowMeaning = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image'];
    return !noArrowMeaning.includes(el.type);
  }
  return false;
}

/* ─── Screen navigation ───────────────────────────────────────────
   THE goTo() for all seven parts. Extracted from seven bodies that ran
   9-24 lines and differed in only three places; everything else was
   already identical.

   1. THE POPUP / HINT SWEEP. Feedback popups and hint overlays are
      absolutely-positioned siblings OUTSIDE every .screen div, so
      toggling .screen.active never hides them and a stale one would
      carry over to the next screen. The id suffixes are the contract
      this matches on — that is why screens name their overlays
      "<id>-popup" / "<id>-hint-overlay".

      Six of the seven parts had it. Part 04 did not, and adopting it
      there is a no-op that was checked rather than assumed: part 04's
      markup contains no id ending in -popup or -hint-overlay at all.

   2. THE MOTION GUARD. Three forms were in use — bare `Motion.`,
      `window.Motion &&` and `window.Motion?.`. The guarded form is the
      superset and is kept. It is not merely defensive: Motion now comes
      from ../unit-js/05-motion.js, so a part whose shared script failed
      to load would otherwise throw here on EVERY navigation and strand
      the learner, instead of degrading to un-animated screen swaps.

   3. PER-PART CLEANUP -> partScreenLeave(prev). Some parts must close a
      modal whose id matches neither suffix, or stop a timer belonging to
      the screen being left. That is content, not shared logic, so it
      stays per-part behind a hook — never parameterised into this
      function. The hook is called with the outgoing .screen.active
      element (or null) because part 01's cleanup is prev-dependent.

   ⚠️ DO NOT REORDER THE TAIL. resetScreenState(n) runs AFTER
   classList.add('active'), which is the reverse of the 720 family rule in
   §8.11. It is deliberate here: Motion.reveal() needs the screen already
   active, and resetScreenState resolves the companion-character image, so
   swapping them reintroduces the avatar flash the family rule guards
   against in units that reveal differently. The resume work adds
   repaintScreen(n) immediately after classList.add('active') and before
   any save — see §8.4a — so leave room there, not above.

   ⚠️ currentScreen and TOTAL_SCREENS are per-part top-level `let`/`const`.
   They are reachable from here because top-level let/const in one classic
   script share the global lexical environment with the next — but only at
   CALL time, which is why this file loads before each part's main.js and
   nothing here runs on load. */
/* '#screen=N' picks the landing screen for a cross-part חזרה (§8.4b).

   It is the ONLY thing that honours the hash when there is no state
   document to restore — the loader's applyExecutionState() takes the same
   hash as its screenOverride, but only runs when a payload exists. So with
   resume off, or on a first launch, this is what lands the learner on the
   screen they came back to instead of on S0.

   Called from 90-boot.js, after partBoot() and before bootXAPI(): main.js
   has fully executed by then, so every per-screen `let` exists and the jump
   can be synchronous. That is what let the microtask-deferred jump in
   PartNav.init() be retired — see the note there.

   ⚠️ parseInt AND a range check. goTo() bounds-guards and RETURNS, so an
   out-of-range hash would leave currentScreen stale while the markup still
   shows S0 — the learner sees the opening screen with the rest of the part
   thinking it is somewhere else. A raw regex capture is also a STRING; the
   comparison below would then never match and the jump would repeat. */
function jumpToLinkedScreen() {
  var m = /^#screen=(\d+)$/.exec(window.location.hash || '');
  if (!m) return;
  var n = parseInt(m[1], 10);
  if (!isFinite(n) || n < 0) return;
  if (typeof TOTAL_SCREENS !== 'number' || n >= TOTAL_SCREENS) return;
  if (n === currentScreen) return;
  goTo(n);
}

function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]')
    .forEach(el => el.classList.add('hidden'));
  const prev = document.querySelector('.screen.active');
  if (typeof partScreenLeave === 'function') partScreenLeave(prev);
  if (prev) { window.Motion?.cancel(prev); prev.classList.remove('active'); }
  currentScreen = n;
  const next = document.getElementById('s' + n);
  if (next) { next.classList.add('active'); window.Motion?.reveal(next); }
  resetScreenState(n);

  /* resume: repaint an already-answered screen (§8.4a). THE most severe resume
     defect found in production so far, and it hard-locks the learner:
     applyResumeVars restores the answer variables for EVERY question in the
     part, but the restore sequence paints only the LANDING screen. Every other
     answered screen is then left saying "variables answered, DOM blank" — and
     that combination is inescapable, because sNSelect opens with
     `if (done) return`, resetScreenState early-returns on the same flag, and
     the check button's disabled comes from the markup. No marks, no feedback,
     a dead button and unclickable options; only a reload escapes.

     ⚠️ POSITION. §8.4a says "right after classList.add('active')", which is
     correct for the family's goTo, where resetScreenState runs BEFORE the class
     swap. THIS unit's goTo is the other way round (see risk 7 — do not
     reorder), so the equivalent position is here: AFTER resetScreenState, whose
     not-answered branch calls a sNResetInitial() that would otherwise wipe what
     the painter just drew, and BEFORE xapiOnScreen and any save — capture reads
     wrong-marks off the DOM, so a save that ran first would persist blanks.

     Never an empty catch: the helper lives in the shared layer while the
     painters live per part, so a stale cached copy of one against a fresh copy
     of the other throws ReferenceError on EVERY navigation. */
  try { repaintScreen(n); } catch (e) { console.error('[resume] repaint', e); }

  /* xAPI: the item initialized/completed pairs, driven entirely from here
     (§6.7). Without this line SCREEN_TO_SUBCONTENT is dead weight - the
     loader calls xapiOnScreen once for the LANDING screen, because the
     opening screen has .active hard-coded in the markup and never passes
     through goTo, and nothing else ever calls it again.

     LAST in the function, and deliberately AFTER resetScreenState(n):

       - after classList.add('active'), so a network call can never delay
         the paint;
       - after resetScreenState, because this unit's goTo runs reset AFTER
         the class swap - the reverse of the family rule in §8.11 - and
         Motion.reveal depends on that order. Do not reorder either line to
         match the reference unit; see risk 7 in the plan.

     It needs no guard of its own: xapiOnScreen returns immediately unless
     window.XAPI_USING_G is set AND sendStatement720 is a function, which
     is the §6.8 regression gate - off-platform this is a silent no-op and
     the lomda behaves exactly as it did before instrumentation. */
  xapiOnScreen(n);
}

/* ═══════════════ step 10 ═══════════════
   advanceFromS0() is a three-line passthrough to advanceScreen(), identical
   in all seven parts. It exists because every part's screen-0 markup calls it
   by name; the indirection is the markup contract, so it is kept rather than
   rewritten at seven call sites.
   ════════════════════════════════════════ */

/* S0 — TransitionScreen kickoff. Continue is always enabled (established
   TransitionScreen convention — not gated on anything). Back is the
   cross-part one: this part is reached only via part 06's own
   climaxPassed()-gated redirect, so Back returns to part 06's last
   screen — and stays hidden if this part was opened directly rather
   than through that redirect (PartNav.mountBack() decides). */
function advanceFromS0() { advanceScreen(); }
