'use strict';
/* ═══════════════════ resume — the family painters (§8.8) ═══════════════════
   Shared by all seven parts. DEFINITION-ONLY per §3.2.

   ONE painter per interaction TYPE, not one per screen. percent-02 has 66
   screens and about six interaction families; the reference unit's own
   experience is that seven single-choice screens sharing one painter drift far
   less than seven near-copies, and every production hard-lock it shipped in
   this area was in a hand-written per-screen painter.

   ⚠️ EVERY PAINTER TAKES ITS CONFIG AS A PARAMETER and never dereferences one
   by global name (§8.8 rule 7). That is not style. The reference unit shipped a
   hard lock because a hand-written painter asked for `SCQ14` when the object
   was called `MCQ14` — the ReferenceError landed after the wrong-marks loop and
   before the option lock, the feedback and the continue button, so the screen
   came up blank with a dead check button, inside a try/catch that reduced it to
   one console line. The four multi-selects next door were fine for exactly one
   reason: their shared painter took `cfg` as an argument.

   ── THE FIVE RULES THAT SHAPE EVERY FUNCTION HERE ──

   1. NEVER RESET (rule 5). A painter runs on EVERY navigation, not once per
      page load, and the "nothing attempted yet" branch is reached with
      unsubmitted work in place — a half-typed answer, a selected-but-unchecked
      option. Resetting there destroys it on every screen change. So each
      painter opens with a clean-screen guard that returns UNTOUCHED, and no
      painter here calls any sNResetInitial().

   2. DOM WRITES ONLY (rule 3). No state mutation, no xapiAnswered, no score
      maps — all of that already happened. This is why the painters call
      sNFinishDom() and not sNFinish(): since P2, the Finish functions also
      send component and unit `completed` statements, and a painter running on
      every navigation must never touch those.

   3. IDEMPOTENT AND CLEAN-SCREEN SAFE (rule 4). Clear before marking —
      classList.remove(...) then add(...), or toggle(x, cond) with the explicit
      second argument, never a bare toggle.

   4. THE UNRESOLVED BRANCH MUST RECOMPUTE THE CHECK BUTTON (rule 2) from the
      same predicate the live code uses. The live code disables it after a wrong
      answer and only an input or selection handler re-enables it; after a page
      load that leaves the learner staring at a full screen and a dead button.

   5. EVERY BRANCH RE-APPLIES WHAT THE LEARNER SEES, the all-correct branch
      included (rule 8). This is the one a "does it throw?" sweep cannot catch,
      and it shipped to production: in live play the marks are already on screen
      from the click, so the submit branch adds none of its own and nothing
      needs re-adding — until a reload produces a fresh DOM. Then the popup came
      back and the answer came back blank.

   ⚠️ Each painter must be EXCEPTION-SAFE but must not swallow quietly: the
   caller (repaintScreen) already wraps it, and a painter that cannot paint some
   state must return rather than throw. The harness's painter-never-throws sweep
   forces every question into the answered state and walks all 66 screens, so a
   throw is a test failure rather than one console line nobody reads. */


/* ── single choice: one .scq-opt per option, one correct id ──
   cfg:
     done, attempts, selected, lastWrong, lastResult   the restored state
     correctId                                          from the screen's config
     mark(id, cls)                                      the screen's own marker
     showPopup(type)                                    the screen's own popup
     finishDom()                                        the DOM half of finishing
     showHint(), updateBar()                            optional
*/
function paintSingleChoice(cfg) {
  if (!cfg) return;
  /* clean screen: nothing attempted, nothing to repaint. Returning here is
     what makes the painter safe to run on every navigation. */
  if (!cfg.done && !cfg.attempts) return;

  if (cfg.done) {
    /* Rule 8: re-apply what live play leaves on screen — the correct option
       marked, plus the learner's own wrong pick on the final-wrong path. Live
       play never shows green marks on a wrong answer, so neither does this. */
    if (cfg.correctId) cfg.mark(cfg.correctId, 'correct');
    if (cfg.lastResult !== 'correct' && cfg.selected && cfg.selected !== cfg.correctId) {
      cfg.mark(cfg.selected, 'wrong');
    }
    if (typeof cfg.finishDom === 'function') cfg.finishDom();
    if (cfg.lastResult) cfg.showPopup(cfg.lastResult);
    return;
  }

  /* Attempted but not resolved — the first-wrong state. Live play leaves the
     wrong pick marked, the retry popup open and the hint button revealed. */
  if (cfg.lastWrong) cfg.mark(cfg.lastWrong, 'wrong');
  if (typeof cfg.showHint === 'function') cfg.showHint();
  cfg.showPopup('retry');
  /* Rule 2: the check button comes back from the live predicate, not from the
     markup's disabled attribute. */
  if (typeof cfg.updateBar === 'function') cfg.updateBar();
}


/* ── a group of value inputs, with a solution/my-answer reveal toggle ──
   cfg:
     done, attempts, answered, lastWrong, lastResult    the restored state
     answer                                            the learner's final-wrong
                                                        values, or null (§8.10)
     keys                                              the field keys, in order
     inputs(), fields(), icos()                        the screen's own getters
     fieldStates(vals)                                 per-field correctness
     applyView()                                       the screen's own reveal
                                                        painter (already
                                                        complete — see below)
     showPopup(type)                                   the screen's own popup
     finishDom()                                       the DOM half of finishing
     showHint(), inputChange()                         optional
     okGlyph, wrongGlyph                               the check/cross SVGs
*/
function paintValueFields(cfg) {
  if (!cfg) return;
  if (!cfg.done && !cfg.attempts) return;

  var i = cfg.inputs(), f = cfg.fields(), ico = cfg.icos();

  if (cfg.done) {
    /* FINAL-WRONG: applyView() is already a complete painter for this state —
       it writes the displayed values for whichever of the two views is
       selected, disables the inputs, sets the per-field classes and glyphs, and
       reopens the popup in the matching view. It also opens with its own
       `answer === null` guard. §8.10's three things are all restored state:
       the displayed values (applyView derives them), the learner's own answer
       (cfg.answer) and which view is showing (the screen's own view variable,
       which applyView reads). */
    if (cfg.answer !== null && cfg.answer !== undefined) {
      if (typeof cfg.finishDom === 'function') cfg.finishDom();
      cfg.applyView();
      return;
    }
    /* ALL CORRECT — rule 8, and the branch resetScreenState does NOT cover:
       its done-and-answer-null branch shows the popup and nothing else, which
       is right inside one page load (the marks are still on screen from the
       click) and wrong after a reload, when the DOM is pristine. The values
       themselves come back through applyResumeDom; here we re-add the marks. */
    cfg.keys.forEach(function (k) {
      if (f[k]) { f[k].classList.remove('error'); f[k].classList.add('correct'); }
      if (ico[k]) ico[k].innerHTML = cfg.okGlyph;
    });
    if (typeof cfg.finishDom === 'function') cfg.finishDom();
    cfg.showPopup('correct');
    return;
  }

  /* Attempted but not resolved: live play leaves each field marked from
     fieldStates(), the retry popup open and the hint button revealed. Read the
     values from the LIVE inputs, which applyResumeDom has already refilled —
     not from a variable, because a first-wrong attempt records only a joined
     signature. */
  var vals = {};
  cfg.keys.forEach(function (k) { vals[k] = i[k] ? i[k].value.trim() : ''; });
  var fc = cfg.fieldStates(vals);
  cfg.keys.forEach(function (k) {
    if (f[k]) {
      f[k].classList.remove('correct', 'error');
      f[k].classList.add(fc[k] ? 'correct' : 'error');
    }
    if (ico[k]) ico[k].innerHTML = fc[k] ? cfg.okGlyph : cfg.wrongGlyph;
  });
  if (typeof cfg.showHint === 'function') cfg.showHint();
  cfg.showPopup('retry');
  /* Rule 2: the same predicate the live input handler uses. Note this is
     called AFTER the marks above on purpose — inputChange() clears them, so
     calling it first would paint and then immediately unpaint. Screens whose
     inputChange also hides the popup pass it as undefined instead. */
  if (typeof cfg.checkButton === 'function') cfg.checkButton();
}

/* ── ONE value input, with the same solution/my-answer reveal toggle ──
   A separate family from paintValueFields and not a keys-of-one special case,
   because the two mirror DIFFERENT live code, which is rule 1: derive
   correctness the way the live code does.

     a field GROUP's wrong branch marks each field from fieldStates(v), so some
     fields can come back green and others red;
     a SINGLE input's wrong branch marks error unconditionally - there is only
     one field and it is the wrong one.

   Recomputing from the current value here would be worse than useless: it would
   show green for a learner who typed the right answer after a wrong attempt but
   has not submitted it, i.e. feedback they never earned.

   These screens also have no Inputs()/Fields()/Icos() map helpers, so the
   getters are single-element.

   cfg:
     done, attempts, answer          the restored state (§8.10's answer)
     input(), field(), ico()         single-element getters
     applyView()                    the screen's own reveal painter
     showPopup(type), finishDom()
     showHint()                      optional
     okGlyph, wrongGlyph
*/
function paintSingleValue(cfg) {
  if (!cfg) return;
  if (!cfg.done && !cfg.attempts) return;

  var field = cfg.field(), ico = cfg.ico();

  if (cfg.done) {
    /* FINAL WRONG: applyView() is already complete for this state - it writes
       the displayed value for whichever view is selected, marks the field,
       sets the glyph and reopens the popup in the matching view, behind its own
       `answer === null` guard. */
    if (cfg.answer !== null && cfg.answer !== undefined) {
      if (typeof cfg.finishDom === 'function') cfg.finishDom();
      cfg.applyView();
      return;
    }
    /* ALL CORRECT - rule 8. The value itself comes back through
       applyResumeDom; the marks are what a fresh DOM is missing. */
    if (field) { field.classList.remove('error'); field.classList.add('correct'); }
    if (ico) ico.innerHTML = cfg.okGlyph;
    if (typeof cfg.finishDom === 'function') cfg.finishDom();
    cfg.showPopup('correct');
    return;
  }

  /* Attempted but unresolved: exactly what the live wrong branch leaves - the
     field in error, the retry popup open, the hint button revealed. */
  if (field) { field.classList.remove('correct'); field.classList.add('error'); }
  if (ico) ico.innerHTML = cfg.wrongGlyph;
  if (typeof cfg.showHint === 'function') cfg.showHint();
  cfg.showPopup('retry');
}


/* ── a set of dropdown slots, with a reveal toggle ──
   ⚠️ §8.9's dropdown case, which restored "successfully" and still looked
   broken in production. The slot's VALUE lives in a JS map and restores fine,
   but the visible LABEL is a separate DOM node written only by the live click
   handler - so it comes back blank while the marking function, reading the map,
   cheerfully draws ✓ and ✗ on visibly empty cells. Everything the code could
   check said the restore had worked.

   The label is therefore NOT this painter's job: it belongs in
   applyResumeDom, from the restored selections map. This painter only marks.

   cfg:
     done, attempts, answer, view    the restored state
     slots                          the slot keys, in order
     mark(slot, state)              'correct' | 'solution' | 'answer'
     applyView(), showPopup(type), finishDom()
     showHint(), updateBar()        optional
*/
function paintDropdownSlots(cfg) {
  if (!cfg) return;
  if (!cfg.done && !cfg.attempts) return;

  if (cfg.done) {
    /* FINAL WRONG: applyView() marks every slot from the recorded per-slot
       correctness and reopens the popup in the matching view. */
    if (cfg.answer !== null && cfg.answer !== undefined) {
      if (typeof cfg.finishDom === 'function') cfg.finishDom();
      cfg.applyView();
      return;
    }
    /* ALL CORRECT - rule 8. mark(n, 'correct') deliberately leaves the
       learner's own selection text in place, which is exactly why the label has
       to have been restored first. */
    cfg.slots.forEach(function (n) { cfg.mark(n, 'correct'); });
    if (typeof cfg.finishDom === 'function') cfg.finishDom();
    cfg.showPopup('correct');
    return;
  }

  /* Attempted but unresolved. NO per-slot marking, deliberately: this family's
     own QA rule is that a non-final wrong leaves every slot unmarked and
     selectable, so the retry still has something to find. Marking here would
     invent feedback live play never shows. */
  if (typeof cfg.showHint === 'function') cfg.showHint();
  cfg.showPopup('retry');
  if (typeof cfg.updateBar === 'function') cfg.updateBar();
}


/* ── multi-select: a Set of chosen option ids ──
   cfg:
     done, attempts, lastResult      the restored state
     selected                        an ARRAY of chosen ids (see below)
     correctIds                      an array of the correct ids
     mark(id, cls), showPopup(type), finishDom()
     showHint(), updateBar()         optional

   ⚠️ The live state is a Set, and a Set does not survive JSON - it serialises
   as {}. capturePartPayload must convert to an array and applyResumeVars back
   to a Set, or the selection silently restores EMPTY. That is why this painter
   takes an array: it should not care which side of that conversion it is on.
*/
function paintMultiSelect(cfg) {
  if (!cfg) return;
  if (!cfg.done && !cfg.attempts) return;

  var chosen = cfg.selected || [];
  var correct = cfg.correctIds || [];
  var isCorrect = function (id) { return correct.indexOf(id) !== -1; };

  if (cfg.done) {
    /* Both terminal branches reveal the FULL correct set, including options the
       learner never picked; the final-wrong one also marks their own wrong
       picks. Live play shows exactly this. */
    correct.forEach(function (id) { cfg.mark(id, 'correct'); });
    if (cfg.lastResult !== 'correct') {
      chosen.forEach(function (id) { if (!isCorrect(id)) cfg.mark(id, 'wrong'); });
    }
    if (typeof cfg.finishDom === 'function') cfg.finishDom();
    if (cfg.lastResult) cfg.showPopup(cfg.lastResult === 'correct' ? 'correct' : 'wrong2');
    return;
  }

  /* Attempted but unresolved: live play judges every option the learner
     SUBMITTED and only those - a correct option they never picked stays
     neutral, so the retry still has something to find. */
  chosen.forEach(function (id) { cfg.mark(id, isCorrect(id) ? 'correct' : 'wrong'); });
  if (typeof cfg.showHint === 'function') cfg.showHint();
  cfg.showPopup('retry');
  if (typeof cfg.updateBar === 'function') cfg.updateBar();
}


/* ── a grid of rows, each an independent true/false pill pair ──
   ⚠️ THIS IS §8.8 RULE 8'S PRODUCTION BUG, verbatim. In live play the chosen
   pill keeps its `selected` class from the CLICK, and the submit branch adds no
   marks of its own on the all-correct path - so nothing is ever wrong on screen
   and nothing needs re-adding, until a reload produces a fresh DOM. Then the
   popup came back and every pill came back blank. Note the shape of it: the
   half-answered case restored perfectly, so the bug only appeared after
   answering COMPLETELY correctly and reloading, which QA reported as
   intermittent and "fine after clearing data".

   So this painter re-adds `selected` FIRST, on every branch, before any mark.

   cfg:
     done, attempts, lastResult      the restored state
     rows                            the row keys, in order
     selections                      row -> chosen value
     correct                         row -> correct value
     btn(row, value)                 the pill element
     showPopup(type), finishDom()
     showHint(), updateBar()         optional
*/
function paintRowGrid(cfg) {
  if (!cfg) return;
  if (!cfg.done && !cfg.attempts) return;

  /* what the learner's own clicks left on screen - rule 8 */
  cfg.rows.forEach(function (r) {
    var chosen = cfg.selections ? cfg.selections[r] : null;
    if (chosen === null || chosen === undefined) return;
    var el = cfg.btn(r, chosen);
    if (el) {
      el.classList.add('selected');
      el.setAttribute('aria-checked', 'true');
    }
  });

  if (cfg.done) {
    cfg.rows.forEach(function (r) {
      var right = cfg.btn(r, cfg.correct[r]);
      if (right) right.classList.add('correct');
      if (cfg.lastResult !== 'correct') {
        var chosen = cfg.selections ? cfg.selections[r] : null;
        if (chosen !== cfg.correct[r]) {
          var wrong = cfg.btn(r, chosen);
          if (wrong) wrong.classList.add('wrong');
        }
      }
    });
    if (typeof cfg.finishDom === 'function') cfg.finishDom();
    if (cfg.lastResult) cfg.showPopup(cfg.lastResult === 'correct' ? 'correct' : 'wrong2');
    return;
  }

  /* Attempted but unresolved: live play reveals nothing per row here - only the
     retry popup - so neither does this. The `selected` classes above are the
     whole paint. */
  if (typeof cfg.showHint === 'function') cfg.showHint();
  cfg.showPopup('retry');
  if (typeof cfg.updateBar === 'function') cfg.updateBar();
}


/* ── a guided pick: one click, immediate reveal, no popup and no retry ──
   Part 01's S15/S17/S18. The learner picks once; the click marks the correct
   option, marks their own if it differs, flags the chosen one, and finishes.
   There is no attempts counter and no feedback popup at all.

   ⚠️ Why these need a painter even though their own resetScreenState has no
   done-branch. That code carries a comment saying the reveal classes "are
   already sitting there" because goTo() only toggles the .screen's .active
   class - which is TRUE inside one page load and false after a reload, when
   the DOM is pristine. Same shape as §8.8 rule 8: nothing needed re-adding
   until a fresh DOM existed. The comment there also warns against
   generalising it to a screen that DOES have a popup; this painter is the
   other half of that warning.

   cfg:
     done, selected            the restored state
     options()                 the option elements
     correctId
     correctClass, wrongClass, pickedClass
     finishDom()
*/
function paintGuidedPick(cfg) {
  if (!cfg) return;
  /* Clean-screen guard: no pick, nothing to reveal. These screens resolve on
     the first click, so "attempted but unresolved" does not exist. */
  if (!cfg.done || cfg.selected === null || cfg.selected === undefined) return;

  cfg.options().forEach(function (o) {
    var id = o.dataset.id;
    if (id === cfg.correctId) o.classList.add(cfg.correctClass);
    else if (id === cfg.selected) o.classList.add(cfg.wrongClass);
    /* explicit second argument, never a bare toggle (rule 4) */
    o.classList.toggle(cfg.pickedClass, id === cfg.selected);
    o.setAttribute('aria-checked', id === cfg.selected ? 'true' : 'false');
  });
  if (typeof cfg.finishDom === 'function') cfg.finishDom();
}
