/* ═══════════════════ unit-js/90-boot.js ═══════════════════
   THE ONLY file in the shared layer with top-level side effects (§3.2).
   Loaded LAST, after each part's js/main.js, in its own <script> tag.

   ⚠️ IT MUST STAY A SEPARATE TAG, never appended to js/main.js. A top-level
   throw inside main.js kills the rest of that file silently — the spec
   records exactly that happening through `video.play().catch(...)` in an
   environment where play() returns undefined, which left the report modal
   uninitialised with no error anywhere. A separate tag runs regardless.

   Each call is wrapped individually (§7.3) so one failure cannot suppress
   the others. That is not theoretical here: initMotion() and
   initPopupDrag() wire the animation and drag layers, and a throw in one
   must not cost the learner the other.

   ── ORDER MIRRORS WHAT RAN BEFORE THIS FILE EXISTED ──
   Deliberately not the order the plan suggested. Each line is where its
   work actually happened, so introducing this file changes no sequencing:

     initMotion()         was 05-motion.js load time   (i.e. before main.js)
     initPopupDrag()      was 15-ui.js load time       (before main.js)
     scaleApp() + resize  was main.js, early — identical in all seven parts
     partBoot()           was main.js: resetScreenState(0), the reveal and
                          PartNav.init, in each part's OWN order
     initDevBridge()      was main.js, late
     initNumericInputs()  was main.js, last

   The last two stay AFTER partBoot on purpose. initNumericInputs()'s
   one-shot enhanceAll() only enhances inputs that exist when it runs, and
   today it runs after resetScreenState(0) in every part — hoisting it could
   miss an input that reset injects. Its character filter is a delegated
   listener on document, so that half is order-independent either way.

   ── TRACK B ADDED THE PLATFORM LAYER BELOW THE UI LAYER ──
   The reporting inits run AFTER the unit's own startup and bootXAPI() runs
   LAST of everything (§7.3). (Until 2026-09-16 it could also
   window.location.replace() to another part on the resume path — the hop is
   gone; the platform owns routing, see 10-identity.js DEV_NAV.) So: keep new
   shared UI work above partBoot(), and never move anything below bootXAPI().

   initResumeResetHatch() stays first of the three reporting inits, as in the
   reference unit: it honours ?resetState, which must take effect before
   anything reads the state document. With RESUME_ENABLED false it is a no-op,
   like initResumeLeaveHandlers() — both bail on the flag — but the order is
   kept so flipping the flag does not also require reordering this file.

   bootXAPI() is intentionally NOT wrapped here: it wraps itself internally,
   and it is last, so a throw could not suppress anything anyway.
   ═══════════════════════════════════════════════════════════ */
(function boot() {
  /* ── the UI layer (Track A) ── */
  try { initMotion(); }        catch (e) { console.error('[boot] initMotion', e); }
  try { initPopupDrag(); }     catch (e) { console.error('[boot] initPopupDrag', e); }
  try {
    scaleApp();
    window.addEventListener('resize', scaleApp);
  } catch (e) { console.error('[boot] scaleApp', e); }
  try { if (typeof partBoot === 'function') partBoot(); }
  catch (e) { console.error('[boot] partBoot', e); }
  /* Immediately after the part has initialised itself, and before anything
     in the platform layer: a cross-part חזרה carries '#screen=N', and this
     is what honours it when there is no document to restore (§8.4b). */
  try { jumpToLinkedScreen(); } catch (e) { console.error('[boot] jumpToLinkedScreen', e); }
  try { initDevBridge(); }     catch (e) { console.error('[boot] initDevBridge', e); }
  try { initNumericInputs(); } catch (e) { console.error('[boot] initNumericInputs', e); }

  /* ── the platform layer (Track B) ── */
  try { initResumeResetHatch(); }    catch (e) { console.error('[boot] initResumeResetHatch', e); }
  try { initResumeLeaveHandlers(); } catch (e) { console.error('[boot] initResumeLeaveHandlers', e); }
  try { initReportModal(); }         catch (e) { console.error('[boot] initReportModal', e); }
  bootXAPI();
})();
