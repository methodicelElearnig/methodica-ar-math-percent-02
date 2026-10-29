/* ═══════════════════ unit-js/60-devbridge.js ═══════════════════
   The index_dev.html postMessage bridge. THE one copy for this unit;
   loaded by every part as ../unit-js/60-devbridge.js.

   DEFINITION-ONLY per §3.2. It was two top-level statements in each
   main.js — an addEventListener and a framed postMessage — and is now
   one named function each part calls at the same point. That call moves
   into unit-js/90-boot.js at step 9.

   The seven copies differed by exactly ONE BLANK LINE (parts 01-03 had
   it, 04-07 did not) and were otherwise byte-identical, so there was
   nothing to reconcile.

   goTo() is resolved at CALL time, not load time, which is what lets
   this file load before each part's main.js defines it.

   ⚠️ This file SHIPS, unlike _test/: every part's index.html loads it.
   The bridge is inert outside a dev harness — it only acts on a DEV_GOTO
   message and only posts DEV_READY when framed.

   index_dev.html itself does NOT ship. §11.1 says never; both sibling units'
   actual deployment records list it as a dev-only exclusion, and their shared
   verify-package.ps1 refuses a package containing it. This repo's .gitignore
   claims the opposite ("part of the deliverable"), which conflates TRACKED IN
   GIT — correct, it is a dev tool worth versioning — with SHIPPED TO THE CDN.

   ⚠️ ORIGIN CHECK, added 2026-09-10 with the RESUME_ENABLED flip.
   postMessage has no same-origin restriction: any window holding a reference
   to this page can post to it, and this listener used to act on DEV_GOTO
   whatever the sender. That was inert while goTo() only swapped screens. It is
   not any more — goTo() now calls scheduleResumeSave(), so a DEV_GOTO moves
   the learner's SAVED position, and jumping into a screen they never reached
   rewrites their execution state.

   Not a serious vulnerability, and it should not be described as one: on the
   platform this page is framed cross-origin, so a third party has no handle to
   post through, and an attacker framing their own copy gets a session without
   the learner's ?registration. This is defence in depth, and it is free —
   index_dev.html iframes a RELATIVE path, so the harness is always same-origin
   and keeps working, including over file:// where both sides report "null". */
function initDevBridge() {
  window.addEventListener('message', (e) => {
    /* A dev harness is same-origin by construction; the platform frame is not,
       and never sends DEV_GOTO. */
    if (e.origin !== window.location.origin) return;
    if (!e.data || e.data.type !== 'DEV_GOTO') return;
    const n = parseInt(e.data.screen, 10);
    if (!isNaN(n)) goTo(n);
  });
  // Notify parent of actual screen count (DOM-based — auto-updates when screens are added)
  if (window.parent !== window) {
    const screenCount = document.querySelectorAll('.screen').length;
    window.parent.postMessage({ type: 'DEV_READY', total: screenCount }, '*');
  }
}
