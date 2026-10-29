/* ═══════════════════════════════════════════════════════════
   Cross-part navigation trail — unit-js/08-partnav.js
   THE one copy for this unit. Loaded by every part as
   ../unit-js/08-partnav.js; edit here, there is nowhere else.

   WHY THIS EXISTS
   Each part is its own page, so a part's FIRST screen has no sibling
   screen to go back to — every part's S0 therefore shipped without a
   Back button. But the learning journey is a graph, not a line: part
   04 is reached from part 02 (practice passed, remediation skipped)
   OR from part 03 (remediation completed), and "back" has to mean
   whichever one the learner actually came through. That cannot be
   derived from the part number alone, so the crossing is RECORDED as
   it happens and read back on the next page.

   THE TRAIL
   sessionStorage (per tab, gone on tab close — a fresh session must
   not show a stale Back button) holds an array of
     { part: '02', screen: 7 }
   entries, one per part boundary the learner has crossed, in order.
   Every cross-part redirect goes through forward(), which pushes the
   part being LEFT plus the screen it was left from. back() pops the
   last entry and returns there, so the trail always mirrors the real
   route rather than the nominal part order.

   Empty trail = the part was opened directly (deep link / dev / LMS
   entry point) = there is genuinely nowhere to go back to, and the
   Back button stays hidden. That is the whole visibility rule.

   RE-CROSSING FORWARD (forwardOverride)
   Going back lands the learner on the previous part's last screen on
   a FRESH page: none of the in-page state that decided that part's
   exit survives (per-screen state restoration is deliberately out of
   scope here — it belongs to the resume branch). Re-judging the exit
   on empty state would be wrong and in two places actively harmful:
   part 02 would route a learner who had passed into remediation, and
   part 03/05 would refuse to let them out at all. So a page entered
   via back() remembers where it was entered FROM, and re-crossing the
   same boundary skips the gates instead of re-evaluating them — the
   learner already earned that passage on the way through.
   KNOWN LIMIT (same out-of-scope reason): this covers the part's own
   exit only. A learner who goes back INTO a part and then keeps
   navigating backwards inside it can still meet that part's internal
   gates (e.g. part 03's S9 basic-practice gate) with the same empty
   state. Resolved by state restoration, not here.
   ═══════════════════════════════════════════════════════════ */
/* ⚠️ SINCE 2026-09-16 ALL OF THIS IS DEV-ONLY. The platform owns routing:
   Kata launches each part on its own URL and registration and routes on
   the 'completed' each part's exit sends (xapiEndComponent, 20-xapi.js).
   forward(), back(), forwardOverride() and mountBack() therefore do
   nothing — no trail write, no pointer move, no navigation, no visible
   Back button — unless DEV_NAV (10-identity.js: ?dev=1 and NO
   ?registration). The callers in every js/main.js are unchanged, so the
   local walkthrough still works exactly as described above. */
var PartNav = (function () {
  'use strict';

  /* Sibling-folder layout — the same relative path every cross-part
     redirect in this project already used literally. */
  const FOLDER_PREFIX = '../methodica-math-percent-02-';
  /* Namespaced like CHARACTER_STORAGE_KEY, for the same reason: an LMS
     may host several lomdot on one origin. */
  const TRAIL_KEY  = 'methodica_math_percent_02_navTrail';
  const RETURN_KEY = 'methodica_math_percent_02_navReturn';
  /* Defensive cap only. The real trail is at most one entry per part. */
  const MAX_TRAIL  = 16;

  let PART = null;                 // this page's part id, e.g. '04'
  let getScreen = function () { return 0; };
  let forwardTo = null;            // set only when entered via back()

  /* Storage access is wrapped everywhere: a sandboxed iframe or a
     privacy mode can make sessionStorage throw on ACCESS, not just on
     write. Every failure degrades to "no trail" = no Back button. */
  function store() {
    try { return window.sessionStorage; } catch (e) { return null; }
  }
  function read(key) {
    const s = store();
    if (!s) return null;
    try {
      const raw = s.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function write(key, value) {
    const s = store();
    if (!s) return;
    try {
      if (value === null) s.removeItem(key);
      else s.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function trail() {
    const t = read(TRAIL_KEY);
    return Array.isArray(t) ? t : [];
  }
  /* ⚠️ The query string MUST be carried across every part boundary.
     The platform launches the unit with ?slxapi= (the LRS config and the
     learner's actor) and ?registration= (which addresses the resume state
     document). Both live only in the URL. Dropping them on a cross-part
     hop means every part after the first reports nothing at all and resume
     cannot find its document — silently, because a part with no ?slxapi
     just behaves like an uninstrumented lomda.

     This was already broken here and simply had no visible effect yet:
     there is no ?slxapi in play until the reporting layer lands, so
     location.search is empty today and this change is a no-op for now.

     Deliberately still location.href and not location.replace. §8.5 wants
     replace, so that Back cannot land on a URL that immediately redirects
     forward — but that hazard only exists once a resume landing pointer
     does the redirecting. Switching now would remove cross-part browser
     Back with nothing yet gained, so it belongs with the resume work. */
  function partUrl(part) {
    return FOLDER_PREFIX + part + '/index.html' + window.location.search;
  }

  /* The folder slug, which is what the resume layer keys everything by:
     currentPartSlug() reads it off the pathname, so the document's
     `component`, the sessionStorage edge map and the ledger all use this
     form, while PartNav's own API takes the bare '04'. */
  function slugFor(part) {
    return FOLDER_PREFIX.replace('../', '') + part;
  }

  /* The hash that returns a learner to the screen they are leaving. It is
     what replaces the RETURN_KEY screen jump — see init(). */
  function returnHash() {
    return '#screen=' + getScreen();
  }

  /* ── Public API ─────────────────────────────────────────── */

  /* Called once per page, AFTER the part's own initial screen setup
     (see the call site in each main.js): if this page was entered via
     Back, it jumps straight to the screen the learner left from, which
     must happen through the part's own goTo() so the screen gets its
     normal activate + reveal + resetScreenState treatment.

     The jump is DEFERRED to a microtask, and that is not optional: the
     landing screen's resetScreenState() reads that screen's own state
     variables, which in every part are `let`s declared FURTHER DOWN
     main.js than the init() call site. Jumping synchronously hits them
     in the temporal dead zone and throws, which aborts the rest of
     main.js and leaves the page half-initialised (observed on part 02:
     "Cannot access 's7Done' before initialization"). Deferring runs the
     jump once main.js has finished executing — still inside the same
     load task, so nothing has painted yet and there is no flash of S0.
     forwardTo is set synchronously, so forwardOverride() is correct
     immediately regardless. */
  function init(opts) {
    opts = opts || {};
    PART = String(opts.part);
    if (typeof opts.getScreen === 'function') getScreen = opts.getScreen;

    const pending = read(RETURN_KEY);
    if (!pending || pending.part !== PART) return;
    write(RETURN_KEY, null);              // one-shot: consumed on arrival
    forwardTo = pending.forwardTo || null;

    /* ⚠️ The screen jump that used to live here is GONE, deliberately.
       back() now navigates to '#screen=N' and jumpToLinkedScreen() in
       30-nav.js honours it, so RETURN_KEY carries forwardTo and nothing
       else. Two mechanisms choosing the landing screen is exactly the
       ping-pong §8.6 describes: the loader's applyExecutionState() takes
       the same hash as its screenOverride, and a second, microtask-deferred
       jump would fire AFTER the restore and yank the learner off the screen
       it had just landed on — or race it, depending on when the document
       arrives.

       The deferral that jump needed is gone with it: the reason it had to be
       a microtask was that init() is called from partBoot(), i.e. from the
       middle of main.js, where the landing screen's `let`s are still in the
       temporal dead zone (observed as "Cannot access 's7Done' before
       initialization"). jumpToLinkedScreen() runs from 90-boot.js, a
       separate script tag executed after main.js has finished, so every
       binding exists and the jump can be synchronous. */
  }

  /* Cross a part boundary forward. Replaces the bare
     `window.location.href = '../methodica-math-percent-02-NN/index.html'`
     every part used to do inline — same navigation, plus the trail
     entry that makes the destination's Back button work. */
  function forward(part) {
    /* The platform routes (2026-09-16): the component already reported via
       xapiEndComponent before this call; in production nothing else happens. */
    if (!DEV_NAV) return;
    part = String(part);
    const t = trail();
    /* A cycle would otherwise grow the trail forever. There is no cycle
       in the current routing map; this keeps the trail a true path if
       one is ever added. */
    const seenAt = t.findIndex(function (e) { return e && e.part === part; });
    if (seenAt !== -1) t.length = seenAt;
    t.push({ part: PART, screen: getScreen() });
    while (t.length > MAX_TRAIL) t.shift();
    write(TRAIL_KEY, t);
    forwardTo = null;

    /* Record the return edge in the sessionStorage edge map and save THIS part's
       document before navigating (v5, 2026-09-16: one document per part — there is
       no landing pointer to aim and no destination slot to seed; the destination's
       document is its own). typeof-guarded so a shared file that failed to load
       still navigates. */
    if (typeof writeForwardState === 'function') {
      writeForwardState(slugFor(part), returnHash());
    }

    /* replace() and not href: otherwise
       the browser's own Back returns to the part just left, whose loader
       reads the pointer, hops forward again, and the press feels like the
       page is stuck. The header comment above deferred this to the resume
       work; this is that work. Cross-part Back is served by the in-page
       חזרה button, which is what back() below is for. */
    window.location.replace(partUrl(part));
  }

  function canGoBack() { return trail().length > 0; }

  /* Cross a part boundary backwards, to the last screen of the part the
     learner actually arrived from. No-op (not an error) on an empty
     trail, so a stray keyboard ArrowRight on S0 behaves exactly as it
     did before this module existed. */
  function back() {
    if (!DEV_NAV) return;               // the platform routes (2026-09-16)
    const t = trail();
    const entry = t.pop();
    if (!entry || !entry.part) return;
    const screen = typeof entry.screen === 'number' ? entry.screen : 0;
    const hash = '#screen=' + screen;
    write(TRAIL_KEY, t);
    write(RETURN_KEY, {
      part: entry.part,
      forwardTo: PART               // so that part can re-cross forward
    });

    /* goBackToPreviousPart() resolves the destination from the sessionStorage
       edge map, then from these fallback arguments — which are PartNav's own
       trail, i.e. the pre-resume behaviour, kept for when storage is blocked.
       v5 (2026-09-16): it saves THIS part's document and navigates; there is no
       landing pointer to move and no write that could fail. */
    if (typeof goBackToPreviousPart === 'function') {
      /* slugFor(): the trail stores bare part ids ('05') but the resume layer
         keys everything by folder slug, and this argument is also the FALLBACK
         used to build the href when the edge map is empty - '../05/index.html'
         would simply 404. */
      const started = goBackToPreviousPart(slugFor(entry.part), hash);
      /* ⚠️ Only an explicit false means it stayed put. location.replace() does
         not halt this script, so execution reaches here on the SUCCESS path
         too - rolling back unconditionally would clear the trail and the
         forwardTo on every successful press. An older cached shared file
         returns undefined; not rolling back is the safer of the two wrong
         answers, and §3.4 requires both ?v= to move together anyway. */
      if (started === false) {
        t.push(entry);
        write(TRAIL_KEY, t);
        write(RETURN_KEY, null);
      }
      return;
    }
    window.location.replace(partUrl(entry.part) + hash);
  }

  /* The part this page was entered FROM via Back, or null. See
     "RE-CROSSING FORWARD" in the header comment. */
  function forwardOverride() { return DEV_NAV ? forwardTo : null; }

  /* Show/hide a first-screen Back button to match trail state. Called
     from the part's resetScreenState(0) so it is correct on initial
     load and on every return to S0 from within the part. */
  /* ?resetState (40-resume.js) clears both keys through this, since they are private here. */
  function clearTrail() {
    try { sessionStorage.removeItem(TRAIL_KEY); sessionStorage.removeItem(RETURN_KEY); } catch (e) {}
  }

  function mountBack(id) {
    const btn = document.getElementById(id || 's0-back');
    /* .hidden is display:none !important (unit-css/10-base.css), so the class alone
       really hides it — unlike a bare [hidden] attribute, which a button's own
       display rule can override (seen in two sibling units on 16/09). */
    if (btn) btn.classList.toggle('hidden', !(DEV_NAV && canGoBack()));
  }

  return {
    clearTrail: clearTrail,
    init: init,
    forward: forward,
    back: back,
    canGoBack: canGoBack,
    forwardOverride: forwardOverride,
    mountBack: mountBack
  };
})();
