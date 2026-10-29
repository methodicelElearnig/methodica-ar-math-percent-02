/* ═══════════════════ unit-js/15-ui.js ═══════════════════
   Shared UI helpers. THE one copy for this unit; loaded by every part as
   ../unit-js/15-ui.js. Edit here, there is nowhere else.

   DEFINITION-ONLY per ADDING-REPORTING-AND-RESUME.md §3.2 — nothing here
   runs on load, including the popup-drag manager at the bottom, whose three
   window listeners are registered by initPopupDrag() from
   unit-js/90-boot.js. scaleApp() is likewise called from there.

   The file is in four sections, in the order they were built:

   1. STEP 5 — bodies that were already BYTE-IDENTICAL in every part that
      declared them, lifted with no reconciliation. Their preceding comments
      did differ (each written against that part's screens); the longest was
      kept, since all describe the same code.

        scaleApp             7/7
        getCanvasSize        6/7  (not in 04)
        getAppScale          6/7  (not in 04)
        resetPopupPosition   6/7  (not in 04)
        clampPopup           4/7  (03/05/06/07)
        frac                 4/7  (03/05/06/07)

      Partial coverage is deliberate rather than drift: part 04 has two
      screens and never needed the canvas or popup helpers, and only parts
      03/05/06/07 have draggable popups. The extra definitions are inert
      where nothing calls them, and no part declared any of these names in
      any other way — checked before moving them.

   2. STEP 7 — the drifted set, reconciled. setNavLabel, applyCompanionCharacter,
      popupPointerDown, renderPopupAction, openImageZoom, closeImageZoom.
      Five differed only by comments; setNavLabel was the one real merge.
      getCharacter was deliberately NOT brought here — see that section.

   3. STEP 7b — the single popup-drag manager, and the canvas constants the
      shared functions above depend on.

   4. STEP 10 — the last code-identical helpers: hideHintButton,
      showHintButton, reanchorPopupBottom, s0ApplyCharacter, setsEqual and
      practiceQuestionState. */

/* ─── Scale App — 1280×710 design grid, scale-to-fit + extend the
   canvas to fill the viewport (no letterboxing) so chrome anchored to
   canvas edges (flag button, bottom bar) reaches the actual screen
   edges on any aspect ratio. Identical to part 01.
   - scale  = min(viewportW/1280, viewportH/710)  → no distortion
   - canvas = viewport / scale  → in design coords, fills viewport
   ─────────────────────────────────────────────────────────── */
function scaleApp() {
  const app = document.getElementById('app');
  const scale   = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  const canvasW = window.innerWidth  / scale;
  const canvasH = window.innerHeight / scale;
  app.style.width     = canvasW + 'px';
  app.style.height    = canvasH + 'px';
  app.style.transform = `scale(${scale})`;
  app.style.left      = '0px';
  app.style.top       = '0px';
}


/* Canvas geometry. Declared HERE, not per part: getCanvasSize() and
   clampPopup() above/below both read them, and part 04 never declared them —
   so before this move those two shared functions threw
   "CANVAS_W is not defined" in part 04 whenever the `parseFloat(...) ||`
   short-circuit did not save them (verified live in a browser). Identical
   1280 / 710 / 74 in the six parts that did declare them. */
const CANVAS_W = 1280, CANVAS_H = 710, BOTTOM_BAR_H = 74;
function getCanvasSize() {
  const app = document.getElementById('app');
  return {
    w: parseFloat(app.style.width)  || CANVAS_W,
    h: parseFloat(app.style.height) || CANVAS_H
  };
}

function getAppScale() {
  const app = document.getElementById('app');
  const m = app.style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function resetPopupPosition(popup) {
  popup.style.left   = '2px';
  popup.style.top    = 'auto';
  popup.style.bottom = '76px';
}

function clampPopup(popup) {
  if (!popup || popup.classList.contains('hidden')) return;
  const { w: canvasW, h: canvasH } = getCanvasSize();
  const left = parseFloat(popup.style.left);
  const top  = parseFloat(popup.style.top);
  if (!isNaN(left)) popup.style.left = Math.max(0, Math.min(left, canvasW - popup.offsetWidth)) + 'px';
  if (!isNaN(top))  popup.style.top  = Math.max(0, Math.min(top, canvasH - BOTTOM_BAR_H - popup.offsetHeight)) + 'px';
}

/* Stacked fraction — same markup contract as part 01's S8 (.frac /
   .frac-num / .frac-den), so "20/100" is typeset as a real fraction
   rather than slash text. */
function frac(num, den) {
  return '<span class="frac"><span class="frac-num">' + num + '</span><span class="frac-den">' + den + '</span></span>';
}

/* ═══════════════ step 7 — reconciled from the seven parts ═══════════════
   Everything above was byte-identical wherever it was declared. Everything
   below had VARIANTS, and each was measured before being merged: the source
   of every function here is part 03's copy, because part 03 turned out to be
   both the best-documented variant and — in each case — inside the majority
   CODE group once comments were stripped.

   Five of the six differed by COMMENTS AND WHITESPACE ONLY. The plan
   expected defensive guards to reconcile here; there were none to find.
   Part 03 had simply been commented more thoroughly, and those comments are
   the reason to take its copy: they record why the code is shaped as it is
   (the .nav-label width-reservation trick, why openImageZoom measures the
   ORIGINAL img rather than the clone, why popupPointerDown needs no
   drag-vs-scroll guard any more).

   setNavLabel is the one real reconciliation — see its own note below.

   NOT extracted, deliberately: getCharacter. Its two variants differ in
   which map they validate the stored id against, and that is content, not
   drift — part 02's S0_CHARACTER_VIDEOS is a flat id->video-path map while
   parts 03-07 use S0_CHARACTER, an id->{video,still,alt} map. Parameterising
   a shared function to paper over that is exactly what the plan forbids, and
   each variant already reads getUnitCharacter() first — this part's own state
   document, into which adoptUnitCharacter copied the mirror at boot (v5,
   2026-09-16) — and validates against its own map. It stays per-part.
   ═════════════════════════════════════════════════════════════════════════ */

/* Resolve and mount the selected character on the kickoff screen: the
   video keyed to that character in S0_CHARACTER. If it cannot load, the
   SAME character's static pose is shown instead, so the screen degrades
   to a correct image of the right character rather than an empty
   player. Both videos exist, so this path is defensive only. */
/* Generic companion-character video+still applier — used by S0
   (S0_CHARACTER, Sporty clips) and S10 (S10_CHARACTER, Boxing clips).
   Was s0ApplyCharacter() with S0's ids hardcoded; generalized the
   moment a second screen needed the identical still-image-fallback
   logic, rather than duplicating it a third time. */
function applyCompanionCharacter(characterMap, videoId, imgId) {
  const char   = window.lomdaState.selectedCharacter || DEFAULT_CHARACTER;
  const assets = characterMap[char] || characterMap[DEFAULT_CHARACTER];
  const vid = document.getElementById(videoId);
  const img = document.getElementById(imgId);
  if (!vid || !img) return;

  img.alt = assets.alt;
  if (!img.getAttribute('src')) img.src = assets.still;

  // Swap to the still if the video errors (missing file / unsupported).
  if (!vid._fallbackWired) {
    vid._fallbackWired = true;
    vid.addEventListener('error', showStill);
    // A missing source fires `error` on the inner source in some engines
    // and leaves readyState at 0 in others, so also check after load.
    vid.addEventListener('loadeddata', () => {
      if (!vid.videoWidth) showStill();
    });
  }
  function showStill() {
    vid.classList.add('hidden');
    img.classList.remove('hidden');
  }

  if (!vid.getAttribute('src') || !vid.getAttribute('src').endsWith(assets.video)) {
    vid.classList.remove('hidden');
    img.classList.add('hidden');
    vid.src = assets.video;
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
}

function popupPointerDown(e, popupId) {
  // The in-popup action button must stay clickable — never start a drag
  // from it (guard first, per the View My Answer Toggle contract).
  if (e.target.closest('.popup-action')) return;
  const popup = document.getElementById(popupId);
  const app   = document.getElementById('app');
  if (!popup || !app) return;
  // (No drag-vs-scroll guard needed: no popup in this part scrolls any
  // more — every feedback popup is plain auto-height, so dragging from
  // anywhere on it, body text included, is correct.)
  popupDragId = popupId;
  const scale = getAppScale();
  const canvasX = (e.clientX - (parseFloat(app.style.left) || 0)) / scale;
  const canvasY = (e.clientY - (parseFloat(app.style.top)  || 0)) / scale;
  // Convert a bottom-anchored popup to top-anchored before dragging.
  const topPx = parseFloat(popup.style.top);
  const popupTop = isNaN(topPx) ? popup.offsetTop : topPx;
  popup.style.top    = popupTop + 'px';
  popup.style.bottom = 'auto';
  popupOffX = canvasX - (parseFloat(popup.style.left) || 2);
  popupOffY = canvasY - popupTop;
  e.preventDefault();
}

/* Render / update / remove the action button inside a feedback popup.
   `action` is { label, view } or falsy to remove the row. Idempotent:
   re-rendering the same action is a no-op; a different one relabels in
   place instead of rebuilding. */
function renderPopupAction(popupId, action, onClick) {
  const popup = document.getElementById(popupId);
  if (!popup) return;
  let row = popup.querySelector('.scq-popup-actions');
  if (!action) { if (row) row.remove(); return; }
  if (!row) {
    row = document.createElement('div');
    row.className = 'scq-popup-actions';
    popup.appendChild(row);
  }
  let btn = row.querySelector('.popup-action');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'popup-action';
    // Label goes inside a .nav-label width-reservation wrapper, NOT via
    // btn.textContent — this button's hover flips to weight 600 and bold
    // Assistant is wider, so a bare text node makes the button grow
    // (measured +16px) mid-hover. See the HOVER STABILITY block in
    // css/style.css and _global-components.md's ShowAnswer spec, which
    // says to reuse this mechanism rather than let the label resize the
    // button. This is why the reference implementation emits the label
    // pre-wrapped instead of assigning textContent.
    const wrap = document.createElement('span');
    wrap.className = 'nav-label';
    wrap.appendChild(document.createElement('span'));
    btn.appendChild(wrap);
    row.appendChild(btn);
  }
  const wrap = btn.querySelector('.nav-label');
  if (wrap.getAttribute('data-label') !== action.label) {
    wrap.setAttribute('data-label', action.label);   // reserves the bold width
    wrap.firstElementChild.textContent = action.label;
  }
  btn.onclick = onClick || null;
}

/* ═══════════════════════════════════════════════════════════
   Standard clone-based Image Zoom (720-templates → _global-
   components.md → "Image zoom") — ONE delegated document click
   handler for any [data-zoom-src] button in this part, opening the ONE
   shared #img-zoom-modal. Distinct from part 01's reparenting variant:
   this clones the wrapper (never the live node), so no interactive
   state needs to survive the enlargement — a plain photo has none.
   ═══════════════════════════════════════════════════════════ */
function openImageZoom(btn) {
  const wrapper = btn.closest('.scq-img-inner');
  const stage = document.getElementById('img-zoom-stage');
  const modal = document.getElementById('img-zoom-modal');
  const panel = modal && modal.querySelector('.img-zoom-panel');
  if (!wrapper || !stage || !modal || !panel) return;
  const srcImg = wrapper.querySelector('img');
  const clone = wrapper.cloneNode(true);
  clone.querySelector('.img-zoom-btn')?.remove();   // never show a zoom button inside the zoom
  stage.innerHTML = '';
  stage.appendChild(clone);
  modal.classList.remove('hidden');   // must be visible BEFORE measuring the panel

  /* Size the stage to the image's OWN ratio, fitted inside the panel's
     content box. Letting the stage self-size (its previous behaviour)
     only happened to work for a portrait image in a portrait panel; a
     landscape one either overflowed or came out smaller than it already
     was on the screen. Driving it from naturalWidth/naturalHeight makes
     the clone (width/height:100%) land ratio-exact with zero letterbox
     for ANY orientation, and guarantees the zoom actually enlarges.
     Read from the ORIGINAL img, not the clone: the original is already
     displayed so its intrinsic size is known, whereas a fresh clone may
     not have decoded yet. */
  if (srcImg && srcImg.naturalWidth && srcImg.naturalHeight) {
    const cs = getComputedStyle(panel);
    const boxW = panel.clientWidth  - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const boxH = panel.clientHeight - parseFloat(cs.paddingTop)  - parseFloat(cs.paddingBottom);
    const scale = Math.min(boxW / srcImg.naturalWidth, boxH / srcImg.naturalHeight);
    stage.style.width  = (srcImg.naturalWidth  * scale) + 'px';
    stage.style.height = (srcImg.naturalHeight * scale) + 'px';
  }
  document.getElementById('img-zoom-close')?.focus();
}

function closeImageZoom() {
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-stage');
  if (modal) modal.classList.add('hidden');
  if (stage) {
    stage.innerHTML = '';            // drop the clone; nothing to preserve
    stage.style.width = '';          // clear the per-image sizing so the next
    stage.style.height = '';         // open measures fresh rather than inheriting
  }
}

/* Relabel a button WITHOUT destroying its .nav-label width reservation.
   `el.textContent = 'x'` would replace the wrapper span with a bare text
   node, silently removing the hover-width guard (see the HOVER STABILITY
   block in css/style.css) — so every runtime label change on a 720 button
   must go through here, never through textContent.

   ⚠️ THE ONE REAL RECONCILIATION IN STEP 7. There were two implementations:

     parts 03-07  this one — null-guard, then REUSE an existing .nav-label,
                  creating it only when absent
     parts 01,02  `btn.innerHTML = ''` followed by an unconditional rebuild
                  of wrapper + inner span, and no null guard

   Parts 01 and 02 now use this one. Three things were checked first, because
   swapping a rebuild for a reuse is a behavioural change and not obviously
   safe:

     1. The rendered result is identical. Every button this is called on
        already ships `<span class="nav-label" data-label="X"><span>X</span></span>`
        in its own markup — verified in all seven parts — and the wrapper is
        the button's ONLY child, so there is nothing for the old
        `innerHTML = ''` to destroy that the rebuild did not immediately
        recreate. The harness agrees: zero movement in all 66 screen digests.
     2. Nothing depended on the nodes being replaced. There is no animation,
        no transition and no @keyframes on .nav-label in any part's CSS, so
        no insert-triggered effect is lost by reusing the nodes. (Note the
        family rule about a global `* { transition: none !important; }` does
        NOT apply here — this unit has no such rule; that is a
        mass-measure-02 fact.)
     3. Reuse is verified live, not assumed. In part 01, calling this with a
        new label updates both data-label and the inner text while returning
        the SAME wrapper and inner nodes — so the reuse branch really runs
        rather than falling through to the create branch.

   The adopted null guard makes parts 01/02 strictly more defensive: a call
   with a missing element used to throw on `btn.innerHTML` and now returns
   quietly. That is the intended direction, but it does mean such a call is
   now silent — if a label ever fails to appear, check the element resolves
   before suspecting this function. */
function setNavLabel(el, text) {
  if (!el) return;
  let wrap = el.querySelector('.nav-label');
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.className = 'nav-label';
    wrap.appendChild(document.createElement('span'));
    el.textContent = '';
    el.appendChild(wrap);
  }
  wrap.setAttribute('data-label', text);          // reserves the bold width
  wrap.firstElementChild.textContent = text;
}

/* ═══════════════ the one popup-drag manager ═══════════════
   ONE pointermove/pointerup/pointercancel triple for the whole unit, driven by
   popupDragId, which popupPointerDown() above sets. Taken from part 07 and
   asserted identical in parts 03/05/06/07 before the move.

   Parts 01 and 02 previously had a per-SCREEN implementation each — 16 of
   them, so 16 dragging flags, 16 offset pairs, 16 pointerdown functions and
   48 window listeners, all differing only in a hardcoded popup id. They now
   call the shared popupPointerDown(event, '<id>-popup') from their markup, and
   their clampPopupPosition() is gone: its arithmetic is identical to the
   clamping inlined below (same canvasW - offsetWidth and
   (canvasH - BOTTOM_BAR_H) - offsetHeight bounds).

   ⚠️ Adopting the shared pointerdown ADDS the `.popup-action` guard to 8
   screens that lacked it (part 01 s2q/s21/s23/s24, part 02 s3/s5/s6/s7). That
   guard keeps an in-popup action button clickable by refusing to start a drag
   from it. It is provably INERT on those 8: none of them has a
   <prefix>-popup-actions container in its markup, and nothing in their JS
   injects one — the action buttons exist only on the 8 screens that already
   carried the guard. Asserted, not assumed.
   ═══════════════════════════════════════════════════════════ */
let popupDragId = null, popupOffX = 0, popupOffY = 0;


/* §3.2: the three listeners are wrapped so this file stays
   definition-only. initPopupDrag() is called once from
   unit-js/90-boot.js. */
function initPopupDrag() {
  window.addEventListener('pointermove', e => {
    if (!popupDragId) return;
    const popup = document.getElementById(popupDragId);
    const app   = document.getElementById('app');
    if (!popup || !app) return;
    const scale = getAppScale();
    const rawX = (e.clientX - (parseFloat(app.style.left) || 0)) / scale - popupOffX;
    const rawY = (e.clientY - (parseFloat(app.style.top)  || 0)) / scale - popupOffY;
    const { w: canvasW, h: canvasH } = getCanvasSize();
    popup.style.left = Math.min(Math.max(rawX, 0), canvasW - popup.offsetWidth) + 'px';
    popup.style.top  = Math.min(Math.max(rawY, 0), (canvasH - BOTTOM_BAR_H) - popup.offsetHeight) + 'px';
  });
  window.addEventListener('pointerup',     () => { popupDragId = null; });
  window.addEventListener('pointercancel', () => { popupDragId = null; });
}

/* ═══════════════ step 10 — the last shared helpers ═══════════════
   Code-identical in every part that declared them; comments differed and the
   fullest were kept. They read per-part seams (S0_CHARACTER,
   PRACTICE_SCREEN_OUTCOME, currentScreen) at CALL time, which is what lets
   them live here while their data stays per-part.

   setsEqual and practiceQuestionState are not strictly "UI", and are here
   rather than in a new file because one small function per file buys nothing.
   ═════════════════════════════════════════════════════════════════ */

/* ─── Hint button visibility (shared by EVERY question screen) ───────
   Producer rule (2026-08-05): once a question is resolved — i.e. after
   the final answer check, whether the learner got it right or used up
   every attempt — the hint button is HIDDEN, not merely disabled. The
   greyed-out disabled state was the earlier behaviour and was rejected.

   Uses the project's own global `.hidden` utility (display:none) rather
   than a second bespoke mechanism. Safe here because `.scq-hint` is
   absolutely positioned (bottom:15px; left:180px), so removing it from
   flow shifts nothing — the Continue button and Back button keep their
   fixed positions. (Part 01 hides this same control with `visibility`
   instead, but for the opposite situation: there the hint is revealed
   only AFTER a first wrong answer, so it needs its box reserved in
   advance to stop the bar jumping when it appears. Here it is going
   away permanently for the rest of the screen's life, so there is
   nothing to reserve.)

   Kept as a pair of helpers rather than inlined so all three question
   screens cannot drift apart, and so the disabled→hidden switch is a
   one-line change if the producer revisits it. `disabled` is set
   alongside `.hidden` deliberately: it keeps the control genuinely
   inert even if a stylesheet ever fails to load. */
function hideHintButton(id) {
  const hint = document.getElementById(id);
  if (!hint) return;
  hint.classList.add('hidden');
  hint.disabled = true;
}

function showHintButton(id) {
  const hint = document.getElementById(id);
  if (!hint) return;
  hint.classList.remove('hidden');
  hint.disabled = false;
}

/* Re-anchors just the vertical axis, leaving any horizontal drag alone.
   Needed because a wrong2 popup toggles between a tall "solution" body
   and a short "my answer" body while staying open the whole time — once
   even a 1-2px accidental pointerdown+move has flipped the popup from
   bottom-anchored to a fixed pixel `top` (see popupPointerDown below),
   the height shrink on toggle leaves a gap under it instead of staying
   flush with the bottom bar's divider line, since a fixed `top` makes
   the box shrink from the BOTTOM rather than the top. */
function reanchorPopupBottom(popup) {
  popup.style.top    = 'auto';
  popup.style.bottom = '76px';
}

function s0ApplyCharacter()  { applyCompanionCharacter(S0_CHARACTER,  's0-char-video',  's0-char-img'); }

/* Set equality — used by every MultipleChoiceQuestion's correctness
   check (order-independent). Ported verbatim from part 01. */
function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function practiceQuestionState(q) {
  const outcomes = q.screens.map(n => PRACTICE_SCREEN_OUTCOME[n]());
  if (outcomes.every(o => o !== null)) {
    return outcomes.every(o => o === 'correct') ? 'correct' : 'incorrect';
  }
  if (q.screens.indexOf(currentScreen) !== -1) return 'current';
  return 'not-answered';
}
