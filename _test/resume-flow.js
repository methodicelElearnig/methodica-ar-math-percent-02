/* ═══════════════ resume harness — Stage A: unit-level state ═══════════════
   NOT DEPLOYED. Dev tooling only — must be excluded from any release package.

   RESUME_ENABLED is still false in shipped code (§4.4: it also selects the
   library letter, and §0 fixes the order reporting → issue reporting → resume).
   So everything here runs against a SIMULATED platform: the harness turns the
   flag on inside a loaded part, opens the write gate, and installs an empty
   state document — which is exactly the state the loader reaches at the end of
   Phase B (§8.5).

   Three stubs, each for a stated reason:

     capturePartPayload()   a P5 per-part hook that does not exist yet.
                            persistUnitState(captureUnitState()) goes through
                            it, so without a stub every unit-level write throws
                            into its own catch and logs. That is also WHY
                            RESUME_ENABLED must stay false until P5 lands.
     saveState720()         the real one lives in the CDN library. Stubbed to a
                            recorder so a write can be asserted to have
                            happened, and counted.
     loadState720()         returns whatever document the test wants to
                            simulate arriving from Kata.

   ⚠️ One fresh realm per assertion, for the same reason as statement-flow.js:
   _unitState and the pending queues are module-scope in 40-resume.js and are
   not reachable from window, so a new realm is the only clean slate.

   RUN (jsdom is outside the repo — see _test/README.md):

     NODE_PATH=/c/Users/Vadim/AppData/Local/lomda-test/node_modules \
       node _test/resume-flow.js
*/
'use strict';

const { loadPart } = require('./verify-shared.js');

let passes = 0;
const failures = [];
const notes = [];

function ok(tag, what, cond, detail) {
  if (cond) { passes++; return true; }
  failures.push('[' + tag + '] ' + what + (detail ? '  —  ' + detail : ' <no detail>'));
  return false;
}
function note(m) { notes.push(m); }

/* ── the rig ─────────────────────────────────────────────────────────────── */
function rig(part, opts) {
  opts = opts || {};
  const r = loadPart(part, { search: opts.search });

  r.w.__saves = [];
  r.exec(
    /* the P5 hook, stubbed: enough shape for captureUnitState() to run */
    'if (typeof capturePartPayload !== "function") {' +
    '  window.capturePartPayload = function () { return { currentScreen: currentScreen }; };' +
    '}' +
    'window.saveState720 = function (id, doc) {' +
    '  window.__saves.push(JSON.parse(JSON.stringify(doc))); return true;' +
    '};' +
    'window.loadState720 = function () { return ' +
    (opts.doc ? JSON.stringify(opts.doc) : 'null') + '; };');

  if (opts.platform !== false) {
    /* the state the loader reaches at the end of Phase B (§8.5): the flag on,
       the WRITE gate open, and a document in memory */
    r.exec('RESUME_ENABLED = true; _resumeReady = true;' +
           '_unitState = readUnitState();');
  }

  const g = {
    r, part,
    v: expr => r.val(expr),
    saves: () => r.w.__saves.map(d => JSON.parse(JSON.stringify(d))),
    errors: () => r.consoleErrors.slice(),
    close() { r.dom.window.close(); },
  };
  return g;
}

/* ══════════════ 1. the four gate verdicts round-trip ══════════════ */
const GATES = [
  ['02', '02-practice',  'practiceSetPassed'],
  ['03', '03-basic',     'basicPracticePassed'],
  ['03', '03-standard',  'standardPracticePassed'],
  ['06', '06-climax',    'climaxPassed'],
];

function checkVerdicts() {
  for (const [part, key, pred] of GATES) {
    /* With no answers in this page load the live computation scores 0, so a
       stored verdict is the only thing that can route the learner correctly. */
    for (const [stored, want] of [['pass', true], ['fail', false]]) {
      const g = rig(part);
      g.r.exec('setUnitResult(' + JSON.stringify(key) + ', ' + JSON.stringify(stored) + ');');
      ok('verdict', part + '/' + key + ": a stored '" + stored + "' drives " + pred + '()',
        g.v(pred + '()') === want, String(g.v(pred + '()')));
      ok('verdict', part + '/' + key + ': the write reached the state document',
        g.saves().length >= 1 &&
          g.saves()[g.saves().length - 1].results[key] === stored,
        JSON.stringify(g.saves().slice(-1)));
      ok('verdict', part + '/' + key + ': no console error on the write path',
        g.errors().length === 0, g.errors().slice(0, 2).join(' | '));
      g.close();
    }

    /* …and with resume OFF the stored value must be IGNORED, or a verdict
       leaks across attempts through localStorage (which is per-browser and
       unbounded, unlike the per-registration document). */
    const h = rig(part, { platform: false });
    h.r.exec('RESUME_ENABLED = false;' +
             'window.localStorage.setItem(' + JSON.stringify(key) + ', "pass");');
    ok('verdict', part + '/' + key + ': with resume OFF a cached verdict is ignored',
      h.v(pred + '()') === false, String(h.v(pred + '()')));
    h.close();
  }
}

/* ══════════════ 2. the live answers beat a stale verdict ══════════════
   This is what makes the write at each decision point an UPDATE rather than an
   echo: a learner who comes back and re-answers must not have the old verdict
   handed back to them. */
function checkLiveWins() {
  /* part 06: resolve all four sections correctly, with 'fail' on record */
  let g = rig('06');
  g.r.exec("setUnitResult('06-climax', 'fail');" +
           's2vDone = true; s2vAnswer = null;' +
           "s3qDone = true; s3qLastResult = 'correct';" +
           "s4qDone = true; s4qLastResult = 'correct';" +
           "s5qDone = true; s5qLastResult = 'correct';");
  ok('live', "06: resolved answers beat a stored 'fail'",
    g.v('climaxResolved()') === true && g.v('climaxPassed()') === true,
    'resolved=' + g.v('climaxResolved()') + ' passed=' + g.v('climaxPassed()'));
  g.close();

  /* and the reverse: a stored 'pass' must not survive a genuinely failed set */
  g = rig('06');
  g.r.exec("setUnitResult('06-climax', 'pass');" +
           's2vDone = true; s2vAnswer = 1;' +
           "s3qDone = true; s3qLastResult = 'wrong2';" +
           "s4qDone = true; s4qLastResult = 'wrong2';" +
           "s5qDone = true; s5qLastResult = 'wrong2';");
  ok('live', "06: resolved answers beat a stored 'pass' too",
    g.v('climaxResolved()') === true && g.v('climaxPassed()') === false,
    'resolved=' + g.v('climaxResolved()') + ' passed=' + g.v('climaxPassed()'));
  g.close();

  /* part 02: the same, through its own seven screens */
  g = rig('02');
  g.r.exec("setUnitResult('02-practice', 'fail');" +
           's1Answered = s2Answered = s3Answered = s4Answered = true;' +
           's5Answered = s6Answered = s7Answered = true;' +
           "s1Result = s2Result = s3Result = 'correct';" +
           "s4Result = s5Result = s6Result = s7Result = 'correct';");
  ok('live', "02: resolved answers beat a stored 'fail'",
    g.v('practiceSetResolved()') === true && g.v('practiceSetPassed()') === true,
    'resolved=' + g.v('practiceSetResolved()') + ' passed=' + g.v('practiceSetPassed()'));
  g.close();
}

/* ══════════════ 3. the decision points record the verdict ══════════════ */
function checkDecisionPoints() {
  /* part 02's exit: the journey's first Decision Point. 3 of 5 items right,
     so it fails, and the FAILING edge must still record it. */
  let g = rig('02');
  g.r.exec('goTo(7); currentScreen = 7;' +
           's1Answered = s2Answered = s3Answered = s4Answered = true;' +
           's5Answered = s6Answered = s7Answered = true;' +
           "s1Result = s2Result = s3Result = 'correct';" +
           "s4Result = s5Result = 'correct';" +
           "s6Result = s7Result = 'incorrect';" +
           'advanceScreen();');
  let last = g.saves()[g.saves().length - 1] || { results: {} };
  ok('decision', "02: the failing edge records 02-practice = fail",
    last.results['02-practice'] === 'fail', JSON.stringify(last.results));
  g.close();

  /* part 06's exit, passed: records a pass */
  g = rig('06');
  g.r.exec('goTo(2); currentScreen = 5;' +
           's2vDone = true; s2vAnswered = true; s2vAnswer = null;' +
           "s3qDone = true; s3qLastResult = 'correct';" +
           "s4qDone = true; s4qLastResult = 'correct';" +
           "s5qDone = true; s5qLastResult = 'correct';" +
           'advanceScreen();');
  last = g.saves()[g.saves().length - 1] || { results: {} };
  ok('decision', '06: a passed climax records 06-climax = pass',
    last.results['06-climax'] === 'pass', JSON.stringify(last.results));
  g.close();

  /* part 03's DP1 terminal failure edge: the learner stays on S9 and this part
     never reaches its own exit, so this write is the only record of it. */
  g = rig('03');
  g.r.exec('goTo(9); currentScreen = 9;' +
           's1vDone = s2scDone = s3vDone = s4vDone = s5vDone = true;' +
           's6scDone = s7vDone = s8scDone = s9vDone = true;' +
           's1vAnswer = 1; s3vAnswer = 1; s4vAnswer = 1; s5vAnswer = 1;' +
           "s2scResult = 'wrong2'; s6scResult = 'wrong2'; s8scResult = 'wrong2';" +
           'advanceScreen();');
  last = g.saves()[g.saves().length - 1] || { results: {} };
  ok('decision', '03: the S9 terminal failure edge records 03-basic = fail',
    last.results['03-basic'] === 'fail', JSON.stringify(last.results));
  g.close();

  /* an UNRESOLVED gate must record nothing at all - otherwise ArrowLeft on an
     unanswered S9 writes a failure the learner never had */
  g = rig('03');
  g.r.exec('goTo(9); currentScreen = 9; advanceScreen();');
  const wrote = g.saves().some(d => d.results && '03-basic' in d.results);
  ok('decision', '03: an unresolved S9 records no verdict at all', !wrote,
    JSON.stringify(g.saves().map(d => d.results)));
  g.close();
}

/* ══════════════ 4. the character, and the reset-beats-cache rule ══════════════ */
function checkCharacter() {
  /* part 01 is the only part that writes it */
  let g = rig('01');
  g.r.exec("setUnitCharacter('character-2');");
  ok('character', '01: setUnitCharacter writes the document',
    (g.saves()[g.saves().length - 1] || { ui: {} }).ui.character === 'character-2',
    JSON.stringify(g.saves().slice(-1)));
  ok('character', '01: …and the localStorage cache, under percent-02\'s own key',
    g.v("window.localStorage.getItem('methodica_math_percent_02_selectedCharacter')")
      === 'character-2', String(g.v("window.localStorage.getItem('methodica_math_percent_02_selectedCharacter')")));
  ok('character', '01: …and window.lomdaState, for this page',
    g.v('window.lomdaState.selectedCharacter') === 'character-2',
    String(g.v('window.lomdaState.selectedCharacter')));
  g.close();

  /* a later part reads the document, not the cache */
  for (const part of ['02', '03', '05', '07']) {
    const h = rig(part, { doc: { v: 5, component: 'methodica-math-percent-02-' + part, payload: null,
                                 done: {}, doneItems: {}, ui: { character: 'character-2' },
                                 results: {} } });
    h.r.exec("window.localStorage.setItem('methodica_math_percent_02_selectedCharacter', 'character-1');");
    ok('character', part + ': the document beats a contradicting cache',
      h.v('getCharacter()') === 'character-2', String(h.v('getCharacter()')));
    h.close();
  }

  /* ⚠️ the rule that makes the reset hatch a real reset: a document that was
     RESET holds {character: null}, and the PRESENCE of the ui section must beat
     a stale cache. Testing a truthy value instead would resurrect the old
     character on every reset. */
  /* a v4 document (the previous shape) is migrated in place: this part's slot becomes payload */
  const m4 = rig('03', { doc: { v: 4, part: 'methodica-math-percent-02-03',
                                parts: { 'methodica-math-percent-02-03': { currentScreen: 2 }, 'methodica-math-percent-02-01': { currentScreen: 9 } },
                                prev: { a: 1 }, done: { d: true }, doneItems: {}, ui: { character: 'character-2' }, results: { '03-basic': 'pass' } } });
  ok('character', '03: a v4 document migrates to v5 — payload, ledger, character and verdict kept, pointer fields dropped',
    m4.v('_unitState.v') === 5 && m4.v('_unitState.component') === 'methodica-math-percent-02-03' &&
    m4.v('_unitState.payload.currentScreen') === 2 && m4.v('_unitState.done.d') === true &&
    m4.v('getCharacter()') === 'character-2' && m4.v("getUnitResult('03-basic')") === 'pass' &&
    m4.v("'part' in _unitState") === false && m4.v("'parts' in _unitState") === false && m4.v("'prev' in _unitState") === false,
    JSON.stringify(m4.v('JSON.stringify(_unitState)')));
  m4.close();

  const k = rig('02', { doc: { v: 5, component: 'methodica-math-percent-02-02', payload: null, done: {},
                               doneItems: {}, ui: { character: null }, results: {} } });
  k.r.exec("window.localStorage.setItem('methodica_math_percent_02_selectedCharacter', 'character-2');");
  ok('character', '02: a RESET document (character: null) beats a stale cache',
    k.v('getUnitCharacter()') === null, JSON.stringify(k.v('getUnitCharacter()')));
  ok('character', '02: …and getCharacter() then falls back to the default',
    k.v('getCharacter()') === k.v('DEFAULT_CHARACTER'),
    k.v('getCharacter()') + ' vs ' + k.v('DEFAULT_CHARACTER'));
  k.close();
}

/* ══════════════ 5. the landing pointer (§8.6) ══════════════
   §8.6 calls this the single most likely thing to break, and the failure does
   not look like a resume bug: a cross-part button that navigates without
   moving the pointer leaves the destination's loader seeing it still aimed at
   the part just left, so it bounces the learner straight back and one press
   feels like the page is stuck. */
function checkLandingPointer() {
  /* '#screen=N' must land the learner on that screen, with NO document at all
     — this is the path the loader's screenOverride never reaches. */
  for (const [part, screen] of [['03', 7], ['01', 19], ['02', 5]]) {
    const r = loadPart(part, { hash: '#screen=' + screen });
    ok('hash', part + ': #screen=' + screen + ' lands there with no document',
      r.val('currentScreen') === screen, String(r.val('currentScreen')));
    ok('hash', part + ': …and exactly that screen is active in the DOM',
      r.val('document.querySelector(".screen.active").id') === 's' + screen,
      String(r.val('document.querySelector(".screen.active").id')));
    r.dom.window.close();
  }

  /* An out-of-range hash must leave the part coherent. goTo() bounds-guards and
     RETURNS, so without the range check currentScreen would be set to a screen
     that does not exist while the markup still shows S0. */
  for (const bad of ['#screen=99', '#screen=-1', '#screen=abc', '#screen=']) {
    const r = loadPart('07', { hash: bad });
    ok('hash', '07: ' + JSON.stringify(bad) + ' is ignored and S0 stays coherent',
      r.val('currentScreen') === 0 &&
        r.val('document.querySelector(".screen.active").id') === 's0',
      'currentScreen=' + r.val('currentScreen') +
        ' active=' + r.val('document.querySelector(".screen.active").id'));
    r.dom.window.close();
  }

  /* …and "ignored" has to mean goTo() is never CALLED, not merely that it
     declined. percent-02's goTo() happens to bounds-guard on its first line,
     before it touches currentScreen, so the screen stays coherent either way -
     which means the range check above looks redundant and would survive being
     deleted. It is not redundant: it is the only thing standing between an
     out-of-range hash and whatever a future goTo() does with it, and §8.4b
     calls for the check precisely because the family's goTo() sets
     currentScreen first. Wrapping goTo() is what makes that testable. */
  {
    const r = loadPart('07');
    r.exec('window.__gotos = []; var _g = goTo;' +
           'goTo = function (n) { window.__gotos.push(n); return _g(n); };');
    for (const bad of ['#screen=99', '#screen=-1', '#screen=abc']) {
      r.exec('window.location.hash = ' + JSON.stringify(bad) + '; jumpToLinkedScreen();');
    }
    ok('hash', '07: an out-of-range hash never reaches goTo() at all',
      JSON.stringify(r.w.__gotos) === '[]', JSON.stringify(r.w.__gotos));
    r.exec('window.location.hash = "#screen=2"; jumpToLinkedScreen();');
    ok('hash', '07: control — an in-range hash does reach goTo()',
      JSON.stringify(r.w.__gotos) === '[2]', JSON.stringify(r.w.__gotos));
    r.dom.window.close();
  }

  /* ── The platform owns routing (2026-09-16): in PRODUCTION (no ?dev) PartNav is inert ── */
  let g = rig('05');
  g.r.exec('currentScreen = 3; PartNav.forward("06");');
  ok('pointer', '05: production forward() writes nothing', g.saves().length === 0, String(g.saves().length));
  ok('pointer', '05: …and the document stays this part\'s (v5: there is no landing pointer at all)',
    g.v('_unitState.component') === 'methodica-math-percent-02-05' && g.v("'part' in _unitState") === false,
    String(g.v('_unitState.component')));
  ok('pointer', '05: …and writes no trail',
    g.v('window.sessionStorage.getItem("methodica_math_percent_02_navTrail")') === null);
  g.close();
  g = rig('06');
  g.r.exec('window.sessionStorage.setItem("methodica_math_percent_02_navTrail",' +
           ' JSON.stringify([{ part: "05", screen: 4 }]));' +
           'PartNav.back();');
  ok('pointer', '06: production back() writes nothing and leaves the trail alone',
    g.saves().length === 0 &&
    g.v('window.sessionStorage.getItem("methodica_math_percent_02_navTrail")') === JSON.stringify([{ part: '05', screen: 4 }]) &&
    g.v('window.sessionStorage.getItem("methodica_math_percent_02_navReturn")') === null &&
    g.v('_unitState.component') === 'methodica-math-percent-02-06',
    'saves=' + g.saves().length + ' component=' + g.v('_unitState.component'));
  ok('pointer', '06: production forwardOverride() is null even with a pending return',
    g.v('PartNav.forwardOverride()') === null);
  g.close();

  /* ── Under ?dev=1 (no ?registration) the old handover still works for the local walkthrough ── */
  /* forward() must point the document at the DESTINATION before navigating. */
  g = rig('05', { search: '?dev=1' });
  ok('pointer', 'dev: DEV_NAV is true with ?dev=1 and no ?registration', g.v('DEV_NAV') === true);
  g.r.exec('currentScreen = 3; PartNav.forward("06");');
  let last = g.saves()[g.saves().length - 1] || {};
  ok('pointer', '05: forward() saves THIS part\'s document — its own payload, no pointer fields (v5)',
    last.component === 'methodica-math-percent-02-05' && !!last.payload &&
      !('part' in last) && !('parts' in last) && !('prev' in last),
    JSON.stringify(Object.keys(last)));
  ok('pointer', '05: …and records the return edge with the screen being left, in the sessionStorage edge map',
    (function () { try { const e = JSON.parse(g.v('window.sessionStorage.getItem("lomda_nav_edges::methodica-math-percent-02")'))['methodica-math-percent-02-06']; return e.from === 'methodica-math-percent-02-05' && e.hash === '#screen=3'; } catch (e) { return false; } })(),
    String(g.v('window.sessionStorage.getItem("lomda_nav_edges::methodica-math-percent-02")')));
  g.close();

  /* back() must aim the document at the destination too. */
  g = rig('06', { search: '?dev=1' });
  g.r.exec('window.sessionStorage.setItem("methodica_math_percent_02_navTrail",' +
           ' JSON.stringify([{ part: "05", screen: 4 }]));' +
           'PartNav.back();');
  last = g.saves()[g.saves().length - 1] || {};
  ok('pointer', '06: back() saves THIS part before navigating (v5: no pointer to aim)',
    last.component === 'methodica-math-percent-02-06' && !('part' in last), JSON.stringify(Object.keys(last)));
  g.close();

  /* v5: there is no pointer write that could fail, so the fail-closed branch is gone. What
     remains to protect is the reset hatch: RESULT_KEYS must be THIS unit's four live verdict
     keys (until 2026-09-16 it was the science unit's moed list, so ?resetState cleared five
     dead names and left the real mirrors alive) and PartNav's trail/return keys must go too. */
  g = rig('02');
  ok('reset', 'RESULT_KEYS is this unit\'s four verdict keys',
    g.v('JSON.stringify(RESULT_KEYS.slice().sort())') === JSON.stringify(['02-practice', '03-basic', '03-standard', '06-climax']),
    g.v('JSON.stringify(RESULT_KEYS)'));
  ok('reset', 'RESULT_KEYS agrees with the parts\' own constants',
    g.v('RESULT_KEY_PRACTICE') === '02-practice');
  g.r.exec('history.replaceState(null, "", "?resetState");' +
           'RESULT_KEYS.forEach(function (k) { window.localStorage.setItem(k, "pass"); });' +
           'window.localStorage.setItem(' + JSON.stringify('methodica_math_percent_02_selectedCharacter') + ', "character-2");' +
           'window.sessionStorage.setItem("methodica_math_percent_02_navTrail", "[]"); window.sessionStorage.setItem("methodica_math_percent_02_navReturn", "{}");' +
           'initResumeResetHatch();');
  ok('reset', '?resetState clears the four live verdict mirrors and the character mirror',
    g.v('RESULT_KEYS.every(function (k) { return window.localStorage.getItem(k) === null; })') === true &&
    g.v('window.localStorage.getItem(' + JSON.stringify('methodica_math_percent_02_selectedCharacter') + ')') === null);
  ok('reset', '?resetState clears PartNav\'s trail and return keys (PartNav.clearTrail)',
    g.v('window.sessionStorage.getItem("methodica_math_percent_02_navTrail")') === null && g.v('window.sessionStorage.getItem("methodica_math_percent_02_navReturn")') === null);
  g.close();

  /* RETURN_KEY must no longer carry a screen: two mechanisms choosing the
     landing screen is the ping-pong itself (§8.6). */
  g = rig('06', { search: '?dev=1' });
  g.r.exec('window.sessionStorage.setItem("methodica_math_percent_02_navTrail",' +
           ' JSON.stringify([{ part: "05", screen: 4 }]));' +
           'PartNav.back();');
  const ret = JSON.parse(
    g.v('window.sessionStorage.getItem("methodica_math_percent_02_navReturn")') || 'null');
  ok('pointer', '06: RETURN_KEY carries forwardTo only, never a screen',
    ret && ret.forwardTo === '06' && !('screen' in ret), JSON.stringify(ret));
  g.close();
}

/* ══════════════ 6. Stage B — the per-part hooks and painters ══════════════
   TABLE-DRIVEN, because the whole point of the family painters is that seven
   parts share them: an assertion written against one part's variable names
   proves nothing about the other six. Each entry says which screens a part
   owns and which family each belongs to, and every assertion below is
   generated from that.

   A part absent from the table is skipped LOUDLY (a note), not silently
   passed — so the six parts whose hooks are not written yet cannot look green. */
const STAGE_B = {
  '04': { scq: [], fields: [] },   // hooks only: an open table, nothing to paint
  '06': {
    scq: [{ n: 3, p: 's3q', cfg: 'S3Q' },
          { n: 4, p: 's4q', cfg: 'S4Q' },
          { n: 5, p: 's5q', cfg: 'S5Q' }],
    fields: [{ n: 2, p: 's2v', cfg: 'S2V', keys: ['lodging', 'meals', 'spa', 'parking'] }],
  },
  '01': {
    /* S23 and S24 resolve on the FIRST click and have no attempts counter,
       so `noAttempts` tells the assertions not to set one - an attempted-
       but-unresolved state is unreachable there. */
    scq: [{ n: 2,  p: 's2q', cfg: 'S2Q' },
          { n: 23, p: 's23', cfg: 'S23', noAttempts: true, optSel: '.s23-table-opt' },
          { n: 24, p: 's24', cfg: 'S24', noAttempts: true }],
    single: [{ n: 22, p: 's22', cfg: 'S22' }],
    /* ⚠️ `correct` is spelled out here because part 01's configs use FLAT
       names (S8.correctTotal, S11.correctPct1, S12.correctPctNum) rather
       than the `cfg.correct` map every other part has - there is nothing to
       index. S7's two boxes are ONE judged unit (see s7Mark). */
    fields: [{ n: 7,  p: 's7',  cfg: 'S7',  keys: ['num', 'den'],
               inputsExpr: '({ num: document.getElementById("s7-num"),' +
                            ' den: document.getElementById("s7-den") })',
               correct: { num: '2', den: '5' } },
             { n: 8,  p: 's8',  cfg: 'S8',  keys: ['total', 'final'],
               correct: { total: '200', final: '80' } },
             { n: 11, p: 's11', cfg: 'S11', keys: ['pct1', 'pct2', 'qty2'],
               correct: { pct1: '40', pct2: '100', qty2: '200' } },
             { n: 12, p: 's12', cfg: 'S12',
               keys: ['pctNum', 'pctDen', 'xNum', 'xDen', 'final'],
               correct: { pctNum: '40', pctDen: '100', xNum: 'x',
                          xDen: '200', final: '80' } }],
    multiselect: [{ n: 21, p: 's21', cfg: 'S21' }],
    guided: [{ n: 15, p: 's15', cfg: 'S15' },
             { n: 17, p: 's17', cfg: 'S17' },
             { n: 18, p: 's18', cfg: 'S18' }],
  },
  '02': {
    scq: [{ n: 3, p: 's3', cfg: 'S3', rv: 'Result' },
          { n: 6, p: 's6', cfg: 'S6', rv: 'Result' }],
    single: [{ n: 2, p: 's2', cfg: 'S2' }],
    fields: [{ n: 4, p: 's4', cfg: 'S4',
               keys: ['cooking', 'tents', 'ropes', 'firstaid'] }],
    /* the three shapes that appear only in this part */
    dropdown:    [{ n: 1, p: 's1', cfg: 'S1' }],
    multiselect: [{ n: 5, p: 's5', cfg: 'S5' }],
    rowgrid:     [{ n: 7, p: 's7', cfg: 'S7' }],
  },
  '03': {
    /* ⚠️ rv: this part spells the result variable sNscResult, not
       sNscLastResult. Assigning the wrong name in a non-strict exec creates a
       global and throws nothing, so the assertions simply stopped seeing the
       popup - which is why the name belongs in the table. */
    scq: [{ n: 2, p: 's2sc', cfg: 'S2SC', rv: 'Result' },
          { n: 6, p: 's6sc', cfg: 'S6SC', rv: 'Result' },
          { n: 8, p: 's8sc', cfg: 'S8SC', rv: 'Result' }],
    single: [{ n: 1, p: 's1v', cfg: 'S1V' }, { n: 3, p: 's3v', cfg: 'S3V' },
             { n: 4, p: 's4v', cfg: 'S4V' }, { n: 5, p: 's5v', cfg: 'S5V' },
             { n: 7, p: 's7v', cfg: 'S7V' }, { n: 9, p: 's9v', cfg: 'S9V' },
             { n: 13, p: 's13v', cfg: 'S13V' }, { n: 14, p: 's14v', cfg: 'S14V' }],
    fields: [],
    /* a four-row table addressed by element-id helpers, whose `answer` is an
       ARRAY rather than a map - its own shape, so its own loop below. */
    rows: [{ n: 11, p: 's11v', cfg: 'S11V', answerVar: 'AnswerSnapshot' }],
  },
  '05': {
    scq: [],
    single: [{ n: 1, p: 's1v', cfg: 'S1V' },
             { n: 3, p: 's3v', cfg: 'S3V' },
             { n: 4, p: 's4v', cfg: 'S4V' }],
    fields: [{ n: 2, p: 's2v', cfg: 'S2V', keys: ['cs', 'bio'] },
             { n: 5, p: 's5v', cfg: 'S5V', keys: ['wa', 'al', 'pe'] }],
  },
  '07': {
    scq: [{ n: 2, p: 's2q', cfg: 'S2Q' }],
    fields: [{ n: 3, p: 's3v', cfg: 'S3V', keys: ['shai', 'alon'] }],
  },
};

/* Force every question in a payload into an answered state. Recursive because
   payload shapes differ per part.

   ⚠️ The KEY VOCABULARY is percent-02's, not the reference unit's: it keys on
   `phase: 'correct'`, which does not exist here at all, so copying its forcer
   verbatim would set nothing and the sweep would test nothing. */
function forceAnswered(o, result) {
  if (!o || typeof o !== 'object') return o;
  Object.keys(o).forEach(function (k) {
    if (k === 'done' || k === 'answered') o[k] = true;
    else if (k === 'attempts') o[k] = 1;
    /* both spellings: most parts store lastResult, part 03 stores result.
       Missing one leaves a done screen with a null result, which is a state
       live play cannot produce - and resetScreenState's showPopup(null) then
       throws, so the sweep reports a crash that is really the forcer's. */
    else if (k === 'lastResult' || k === 'result') o[k] = result;
    else if (k === 'view') o[k] = 'solution';
    else if (o[k] && typeof o[k] === 'object') forceAnswered(o[k], result);
  });
  return o;
}

function checkPainters() {
  for (const part of ['01', '02', '03', '04', '05', '06', '07']) {
    const spec = STAGE_B[part];
    if (!spec) { note('part ' + part + ' has no Stage B hooks yet — skipped'); continue; }

    /* ── §8.8 rule 7: a painter NEVER throws, whatever the state ──
       The try/catch layers that stop a broken paint from breaking navigation
       are the same layers that reduce a painter fault to one console line
       nobody reads. This sweep turns that line into a test failure. */
    for (const result of ['correct', 'wrong2']) {
      const g = rig(part);
      g.r.exec('window.__snap = capturePartPayload();');
      const snap = forceAnswered(JSON.parse(JSON.stringify(g.r.w.__snap)), result);
      g.r.exec('applyResumeVars(' + JSON.stringify(snap) + ');' +
               'applyResumeDom(' + JSON.stringify(snap) + ');');
      const before = g.errors().length;
      g.r.exec('for (var n = 0; n < TOTAL_SCREENS; n++) { goTo(n); }');
      const added = g.errors().slice(before);
      ok('painter', part + '/' + result +
        ': no painter throws across all TOTAL_SCREENS with every question answered',
        added.filter(e => /\[resume\]/.test(e)).length === 0,
        added.slice(0, 3).join(' | '));
      g.close();
    }

    /* ── the round trip: capture -> apply -> capture is stable ──
       Runs for every part, including 04, because it is the one assertion that
       needs no per-family knowledge and still catches a dropped field. */
    {
      const g = rig(part);
      g.r.exec('window.__snap = capturePartPayload();');
      const forced = forceAnswered(JSON.parse(JSON.stringify(g.r.w.__snap)), 'wrong2');
      g.r.exec('applyResumeVars(' + JSON.stringify(forced) + ');' +
               'applyResumeDom(' + JSON.stringify(forced) + ');');
      const first = g.v('JSON.stringify(capturePartPayload())');
      g.r.exec('window.__p = ' + first + ';' +
               'applyResumeVars(window.__p); applyResumeDom(window.__p);');
      ok('painter', part + ': capture -> apply -> capture round-trips unchanged',
        g.v('JSON.stringify(capturePartPayload())') === first,
        first + '  vs  ' + g.v('JSON.stringify(capturePartPayload())'));
      g.close();
    }


    /* ── part 01's ROUTING state ──
       Not answers: advanceScreen()'s branch edges read these to decide whether
       S5 opens the fraction carousel or the proportion one, and whether S8/S12
       reconverge to S13 or divert to S9. They live on window.lomdaState rather
       than in a `let`, which is exactly why they are easy to miss when hunting
       for state — and losing them sends a resumed learner down a track they
       did not choose, or makes them repeat one they finished. */
    if (part === '01') {
      const g = rig(part);
      g.r.exec("window.lomdaState.selectedCalcMethod = 'proportion';" +
               "window.lomdaState.selectedCalcMethod2 = 'fraction';" +
               'window.__p = capturePartPayload();' +
               "window.lomdaState.selectedCalcMethod = null;" +
               "window.lomdaState.selectedCalcMethod2 = null;" +
               'applyResumeVars(window.__p);');
      ok('painter', part + ': the chosen calculation methods survive a restore',
        g.v('window.lomdaState.selectedCalcMethod') === 'proportion' &&
          g.v('window.lomdaState.selectedCalcMethod2') === 'fraction',
        '1=' + g.v('window.lomdaState.selectedCalcMethod') +
          ' 2=' + g.v('window.lomdaState.selectedCalcMethod2'));
      g.close();
    }

    /* ── single choice ── */
    for (const s of (spec.scq || [])) {
      /* part 01's S23 is the one screen whose options are table rows */
      const sel = '#s' + s.n + ' ' + (s.optSel || '.scq-opt');
      /* screens that resolve on the first click have no attempts counter */
      const att = s.noAttempts ? '' : s.p + 'Attempts = 1;';
      const att2 = s.noAttempts ? '' : s.p + 'Attempts = 2;';

      /* CORRECT — §8.8 rule 8, the branch a "does it throw?" sweep cannot see.
         In live play the mark is already on screen from the click, so the
         submit branch adds none of its own and nothing needs re-adding until a
         reload produces a fresh DOM. */
      let g = rig(part);
      g.r.exec('goTo(' + s.n + ');' +
               s.p + 'Done = true; ' + s.p + 'Answered = true; ' + att +
               s.p + 'Selected = ' + s.cfg + '.correctId; ' +
               s.p + (s.rv || 'LastResult') + " = 'correct';" +
               'restoreScreenUI(' + s.n + ');');
      ok('painter', part + '/s' + s.n + ': a restored CORRECT choice shows the correct mark',
        g.v('!!document.querySelector("' + sel + '.correct")') === true, '');
      ok('painter', part + '/s' + s.n + ': …and shows no wrong mark',
        g.v('document.querySelectorAll("' + sel + '.wrong").length') === 0,
        String(g.v('document.querySelectorAll("' + sel + '.wrong").length')));
      ok('painter', part + '/s' + s.n + ': …and locks the options, revives the check button',
        g.v('document.querySelector("' + sel + '").disabled') === true &&
          g.v('document.getElementById("' + s.p + '-check").disabled') === false,
        'locked=' + g.v('document.querySelector("' + sel + '").disabled') +
          ' check=' + g.v('document.getElementById("' + s.p + '-check").disabled'));
      ok('painter', part + '/s' + s.n + ': …and reopens the feedback popup',
        g.v('document.getElementById("' + s.p + '-popup").classList.contains("hidden")') === false,
        '');
      g.close();

      /* FINAL WRONG — both the answer and the learner's own pick */
      g = rig(part);
      g.r.exec('goTo(' + s.n + ');' +
               /* any option that is not the correct one */
               'window.__wrong = [].slice.call(document.querySelectorAll("' + sel + '"))' +
               '  .map(function (o) { return o.dataset.id; })' +
               '  .filter(function (id) { return id !== ' + s.cfg + '.correctId; })[0];' +
               s.p + 'Done = true; ' + s.p + 'Answered = true; ' + att2 +
               s.p + 'Selected = window.__wrong; ' +
               s.p + (s.rv || 'LastResult') + " = 'wrong2';" +
               'restoreScreenUI(' + s.n + ');');
      ok('painter', part + '/s' + s.n + ': a restored FINAL-WRONG choice marks the correct option',
        g.v('!!document.querySelector("' + sel + '.correct")') === true, '');
      ok('painter', part + '/s' + s.n + ": …and the learner's own wrong pick",
        g.v('!!document.querySelector("#s' + s.n +
            ' .scq-opt[data-id=\'" + window.__wrong + "\'].wrong")') === true,
        'wrong id=' + g.v('window.__wrong'));
      g.close();

      /* CLEAN SCREEN — rule 4/5: nothing attempted, so nothing painted */
      g = rig(part);
      g.r.exec('goTo(' + s.n + '); restoreScreenUI(' + s.n + ');');
      ok('painter', part + '/s' + s.n + ': an untouched choice screen is left untouched',
        g.v('document.querySelectorAll("' + sel + '.correct, ' + sel + '.wrong").length') === 0 &&
          g.v('document.getElementById("' + s.p + '-popup").classList.contains("hidden")') === true,
        'marks=' + g.v('document.querySelectorAll("' + sel + '.correct, ' + sel + '.wrong").length'));
      g.close();
    }


    /* ── ONE value input, the third family ── */
    for (const f of (spec.single || [])) {
      /* RISK 1 / rule 5: never reset. On restoreScreenUI directly, to isolate
         the painter from resetScreenState's own clearing on navigation. */
      let g = rig(part);
      g.r.exec('goTo(' + f.n + ');' +
               "document.getElementById('" + f.p + "-input').value = '4321';" +
               'restoreScreenUI(' + f.n + ');');
      ok('painter', part + '/s' + f.n + ': a repaint leaves unsubmitted input untouched',
        g.v("document.getElementById('" + f.p + "-input').value") === '4321',
        String(g.v("document.getElementById('" + f.p + "-input').value")));
      ok('painter', part + '/s' + f.n + ': …and marks nothing with nothing resolved',
        g.v('document.querySelectorAll("#s' + f.n + ' .correct, #s' + f.n + ' .error").length') === 0,
        String(g.v('document.querySelectorAll("#s' + f.n + ' .correct, #s' + f.n + ' .error").length')));
      g.close();

      /* ⚠️ An attempted-but-unresolved input must come back in ERROR even if
         the learner has since typed the right value without submitting it.
         Rule 1: derive correctness the way the LIVE code does, and the live
         wrong branch marks error unconditionally. Recomputing from the current
         value would hand out feedback the learner never earned - and it is the
         reason this is its own family rather than paintValueFields with one
         key, since a field GROUP legitimately does recompute per field. */
      g = rig(part);
      g.r.exec('goTo(' + f.n + ');' +
               f.p + 'Attempts = 1; ' + f.p + 'Done = false;' +
               "document.getElementById('" + f.p + "-input').value = String(" + f.cfg + '.correct);' +
               'restoreScreenUI(' + f.n + ');');
      ok('painter', part + '/s' + f.n +
        ': an unresolved input stays in error even when the value is now right',
        g.v('!!document.querySelector("#s' + f.n + ' .error")') === true &&
          g.v('document.querySelectorAll("#s' + f.n + ' .correct").length') === 0,
        'error=' + g.v('!!document.querySelector("#s' + f.n + ' .error")') +
          ' correct=' + g.v('document.querySelectorAll("#s' + f.n + ' .correct").length'));
      g.close();

      /* ALL CORRECT — the branch resetScreenState does not cover (rule 8) */
      g = rig(part);
      g.r.exec('goTo(' + f.n + ');' +
               f.p + 'Done = true; ' + f.p + 'Answered = true; ' + f.p + 'Attempts = 1;' +
               f.p + 'Answer = null;' +
               "document.getElementById('" + f.p + "-input').value = String(" + f.cfg + '.correct);' +
               'restoreScreenUI(' + f.n + ');');
      ok('painter', part + '/s' + f.n + ': a restored ALL-CORRECT input shows a correct mark',
        g.v('!!document.querySelector("#s' + f.n + ' .correct")') === true, '');
      ok('painter', part + '/s' + f.n + ': …and disables the input',
        g.v("document.getElementById('" + f.p + "-input').disabled") === true, '');
      g.close();

      /* §8.10 — the toggle carries the learner's own answer */
      g = rig(part);
      g.r.exec('goTo(' + f.n + ');' +
               f.p + 'Done = true; ' + f.p + 'Answered = true; ' + f.p + 'Attempts = 2;' +
               f.p + "Answer = '777';" + f.p + "View = 'answer';" +
               'restoreScreenUI(' + f.n + ');');
      ok('painter', part + '/s' + f.n + ": the 'my answer' view shows the learner's value",
        g.v("document.getElementById('" + f.p + "-input').value") === '777',
        String(g.v("document.getElementById('" + f.p + "-input').value")));
      g.r.exec(f.p + "View = 'solution'; restoreScreenUI(" + f.n + ');');
      ok('painter', part + '/s' + f.n + ": the 'solution' view shows the solution",
        g.v("document.getElementById('" + f.p + "-input').value") === String(g.v(f.cfg + '.correct')),
        g.v("document.getElementById('" + f.p + "-input').value") + ' vs ' + g.v(f.cfg + '.correct'));
      ok('painter', part + '/s' + f.n + ": …and the answer survives in the payload",
        g.v('capturePartPayload().' + f.p + '.answer') === '777',
        String(g.v('capturePartPayload().' + f.p + '.answer')));
      g.close();
    }


    /* ── row tables: element-id helpers, an ARRAY answer ── */
    for (const t of (spec.rows || [])) {
      const key0 = 'S11V.rows[0].key';
      /* RISK 1 / rule 5 */
      let g = rig(part);
      g.r.exec('goTo(' + t.n + ');' +
               t.p + "InputEl(" + t.cfg + ".rows[0].key).value = '4321';" +
               'restoreScreenUI(' + t.n + ');');
      ok('painter', part + '/s' + t.n + ': a repaint leaves unsubmitted input untouched',
        g.v(t.p + 'InputEl(' + t.cfg + '.rows[0].key).value') === '4321',
        String(g.v(t.p + 'InputEl(' + t.cfg + '.rows[0].key).value')));
      ok('painter', part + '/s' + t.n + ': …and marks nothing with nothing resolved',
        g.v('document.querySelectorAll("#s' + t.n + ' .correct, #s' + t.n + ' .error").length') === 0,
        String(g.v('document.querySelectorAll("#s' + t.n + ' .correct, #s' + t.n + ' .error").length')));
      g.close();

      /* ALL CORRECT (rule 8): every row marked, every input locked */
      g = rig(part);
      g.r.exec('goTo(' + t.n + ');' +
               t.p + 'Done = true; ' + t.p + 'Answered = true; ' + t.p + 'Attempts = 1;' +
               t.p + t.answerVar + ' = null;' +
               t.cfg + '.rows.forEach(function (r) {' +
               '  ' + t.p + 'InputEl(r.key).value = String(r.correct); });' +
               'restoreScreenUI(' + t.n + ');');
      ok('painter', part + '/s' + t.n + ': a restored ALL-CORRECT table marks every row',
        g.v('document.querySelectorAll("#s' + t.n + ' .correct").length') >=
          g.v(t.cfg + '.rows.length'),
        g.v('document.querySelectorAll("#s' + t.n + ' .correct").length') + ' of ' +
          g.v(t.cfg + '.rows.length'));
      g.close();

      /* §8.10 with an ARRAY answer - the shape that made this its own loop */
      g = rig(part);
      g.r.exec('goTo(' + t.n + ');' +
               t.p + 'Done = true; ' + t.p + 'Answered = true; ' + t.p + 'Attempts = 2;' +
               t.p + t.answerVar + ' = ' + t.cfg + ".rows.map(function (r, i) { return String(90 + i); });" +
               t.p + "View = 'answer';" +
               'restoreScreenUI(' + t.n + ');');
      ok('painter', part + '/s' + t.n + ": the 'my answer' view shows the learner's rows",
        g.v(t.p + 'InputEl(' + t.cfg + '.rows[0].key).value') === '90',
        String(g.v(t.p + 'InputEl(' + t.cfg + '.rows[0].key).value')));
      g.r.exec(t.p + "View = 'solution'; restoreScreenUI(" + t.n + ');');
      ok('painter', part + '/s' + t.n + ": the 'solution' view shows the row answers",
        g.v(t.p + 'InputEl(' + t.cfg + '.rows[0].key).value') ===
          String(g.v(t.cfg + '.rows[0].correct')),
        g.v(t.p + 'InputEl(' + t.cfg + '.rows[0].key).value') + ' vs ' +
          g.v(t.cfg + '.rows[0].correct'));
      ok('painter', part + '/s' + t.n + ': …and the array answer survives in the payload',
        g.v('JSON.stringify(capturePartPayload().' + t.p + '.answer)') === '["90","91","92","93"]',
        String(g.v('JSON.stringify(capturePartPayload().' + t.p + '.answer)')));
      g.close();
    }



    /* ── guided picks: one click, immediate reveal, no popup ── */
    for (const p2 of (spec.guided || [])) {
      /* ⚠️ These screens' own resetScreenState branches deliberately have NO
         done-half, on the stated grounds that the reveal classes are already
         sitting in the DOM because goTo only toggles .active. True inside one
         page load; false after a reload, when the DOM is pristine. Same shape
         as §8.8 rule 8, and the only thing that catches it is asserting what
         the learner SEES. */
      let g = rig(part);
      g.r.exec('goTo(' + p2.n + ');' +
               p2.p + 'Done = true; ' + p2.p + 'Answered = true;' +
               p2.p + 'Selected = ' + p2.cfg + '.correctId;' +
               'restoreScreenUI(' + p2.n + ');');
      ok('painter', part + '/s' + p2.n + ': a restored guided pick reveals the correct option',
        g.v('!!document.querySelector("#s' + p2.n + ' .s15-opt.correct")') === true, '');
      ok('painter', part + '/s' + p2.n + ": …and flags the learner's own pick",
        g.v('document.querySelectorAll("#s' + p2.n + ' .s15-opt.picked").length') === 1,
        String(g.v('document.querySelectorAll("#s' + p2.n + ' .s15-opt.picked").length')));
      g.close();

      /* untouched: nothing revealed, because there is no pick to reveal */
      g = rig(part);
      g.r.exec('goTo(' + p2.n + '); restoreScreenUI(' + p2.n + ');');
      ok('painter', part + '/s' + p2.n + ': an untouched guided pick reveals nothing',
        g.v('document.querySelectorAll("#s' + p2.n +
            ' .s15-opt.correct, #s' + p2.n + ' .s15-opt.incorrect").length') === 0,
        String(g.v('document.querySelectorAll("#s' + p2.n +
            ' .s15-opt.correct, #s' + p2.n + ' .s15-opt.incorrect").length')));
      g.close();
    }

    /* ── dropdown slots ── */
    for (const d of (spec.dropdown || [])) {
      /* ⚠️ §8.9's dropdown case: the VALUE map restores fine and the marking
         function reads that map, so a missing label restore leaves ✓/✗ marks on
         visibly EMPTY cells — and every check the code can make says the
         restore worked. Assert what the LEARNER sees. */
      let g = rig(part);
      const picked = { 1: 'aaa', 2: 'bbb', 3: 'ccc', 4: 'ddd' };
      g.r.exec('window.__p = capturePartPayload();' +
               'window.__p.' + d.p + '.selections = ' + JSON.stringify(picked) + ';' +
               'window.__p.' + d.p + '.done = true;' +
               'applyResumeVars(window.__p); applyResumeDom(window.__p);' +
               'goTo(' + d.n + ');');
      ok('painter', part + '/s' + d.n + ': the dropdown LABELS come back, not just the values',
        g.v('document.getElementById("dq-selected-1").textContent') === 'aaa' &&
          g.v('document.getElementById("dq-selected-4").textContent') === 'ddd',
        '1=' + g.v('document.getElementById("dq-selected-1").textContent') +
          ' 4=' + g.v('document.getElementById("dq-selected-4").textContent'));
      g.close();

      /* ALL CORRECT (rule 8): every slot marked */
      g = rig(part);
      g.r.exec('goTo(' + d.n + ');' +
               d.p + 'Done = true; ' + d.p + 'Answered = true; ' + d.p + 'Attempts = 1;' +
               d.p + 'Answer = null;' +
               'restoreScreenUI(' + d.n + ');');
      ok('painter', part + '/s' + d.n + ': a restored ALL-CORRECT dropdown marks every slot',
        g.v('document.querySelectorAll("#s' + d.n + ' .dq-correct").length') ===
          g.v(d.cfg + '_SLOTS.length'),
        g.v('document.querySelectorAll("#s' + d.n + ' .dq-correct").length') + ' of ' +
          g.v(d.cfg + '_SLOTS.length'));
      g.close();

      /* An unresolved dropdown must stay UNMARKED: this family's own QA rule is
         that a non-final wrong leaves every slot selectable, so the retry still
         has something to find. */
      g = rig(part);
      g.r.exec('goTo(' + d.n + '); ' + d.p + 'Attempts = 1; ' + d.p + 'Done = false;' +
               'restoreScreenUI(' + d.n + ');');
      ok('painter', part + '/s' + d.n + ': an unresolved dropdown marks no slot at all',
        g.v('document.querySelectorAll("#s' + d.n + ' .dq-correct, #s' + d.n + ' .dq-wrong").length') === 0,
        String(g.v('document.querySelectorAll("#s' + d.n + ' .dq-correct, #s' + d.n + ' .dq-wrong").length')));
      g.close();
    }

    /* ── multi-select ── */
    for (const m of (spec.multiselect || [])) {
      /* ⚠️ The Set trap: a Set serialises as {}, so a capture that does not
         convert to an array restores an EMPTY selection with nothing at all to
         show that it did. */
      let g = rig(part);
      g.r.exec('goTo(' + m.n + '); ' + m.p + 'Selected = new Set(["c", "d"]);' +
               'window.__p = capturePartPayload();');
      ok('painter', part + '/s' + m.n + ': the selection survives JSON as an array',
        JSON.stringify(g.r.w.__p[m.p].selected) === '["c","d"]',
        JSON.stringify(g.r.w.__p[m.p].selected));
      g.r.exec(m.p + 'Selected = new Set(); applyResumeVars(window.__p);');
      ok('painter', part + '/s' + m.n + ': …and comes back as a real Set',
        g.v(m.p + 'Selected instanceof Set') === true && g.v(m.p + 'Selected.size') === 2,
        'isSet=' + g.v(m.p + 'Selected instanceof Set') + ' size=' + g.v(m.p + 'Selected.size'));
      g.close();

      /* FINAL WRONG: the whole correct set revealed, plus the learner's own
         wrong pick. Live play reveals options they never chose, so this does. */
      g = rig(part);
      g.r.exec('goTo(' + m.n + ');' +
               m.p + 'Selected = new Set(["a"]);' +
               m.p + 'Done = true; ' + m.p + 'Answered = true; ' + m.p + 'Attempts = 2;' +
               m.p + 'Result = "incorrect";' +
               'restoreScreenUI(' + m.n + ');');
      ok('painter', part + '/s' + m.n +
        ': a restored FINAL-WRONG multi-select reveals the whole correct set',
        g.v('document.querySelectorAll("#s' + m.n + ' .scq-opt.correct").length') ===
          g.v(m.cfg + '.correctIds.size'),
        g.v('document.querySelectorAll("#s' + m.n + ' .scq-opt.correct").length') + ' of ' +
          g.v(m.cfg + '.correctIds.size'));
      ok('painter', part + '/s' + m.n + ": …and marks the learner's own wrong pick",
        g.v('!!document.querySelector("#s' + m.n + ' .scq-opt.wrong")') === true, '');
      g.close();
    }

    /* ── row grids (true/false pill pairs) ── */
    for (const t of (spec.rowgrid || [])) {
      /* ⚠️ §8.8 RULE 8'S PRODUCTION BUG, verbatim. In live play the chosen pill
         keeps `selected` from the CLICK and the all-correct submit branch adds
         no marks of its own, so nothing needs re-adding — until a reload
         produces a fresh DOM, and then every pill comes back blank. The
         half-answered case restored perfectly, which is exactly why QA reported
         it as intermittent and "fine after clearing data". */
      let g = rig(part);
      g.r.exec('goTo(' + t.n + ');' +
               t.p + 'Selections = { 1: "true", 2: "false", 3: "false", 4: "true", 5: "false" };' +
               t.p + 'Done = true; ' + t.p + 'Answered = true; ' + t.p + 'Attempts = 1;' +
               t.p + 'Result = "correct";' +
               'restoreScreenUI(' + t.n + ');');
      ok('painter', part + '/s' + t.n + ': an ALL-CORRECT grid re-shows every chosen pill',
        g.v('document.querySelectorAll("#s' + t.n + ' .tf-opt.selected").length') ===
          g.v(t.cfg + '_ROWS.length'),
        g.v('document.querySelectorAll("#s' + t.n + ' .tf-opt.selected").length') + ' of ' +
          g.v(t.cfg + '_ROWS.length'));
      ok('painter', part + '/s' + t.n + ': …and marks the right answer on every row',
        g.v('document.querySelectorAll("#s' + t.n + ' .tf-opt.correct").length') ===
          g.v(t.cfg + '_ROWS.length'),
        String(g.v('document.querySelectorAll("#s' + t.n + ' .tf-opt.correct").length')));
      g.close();

      /* FINAL WRONG: row 3 answered wrongly, so that row carries both marks */
      g = rig(part);
      g.r.exec('goTo(' + t.n + ');' +
               t.p + 'Selections = { 1: "true", 2: "false", 3: "true", 4: "true", 5: "false" };' +
               t.p + 'Done = true; ' + t.p + 'Answered = true; ' + t.p + 'Attempts = 2;' +
               t.p + 'Result = "incorrect";' +
               'restoreScreenUI(' + t.n + ');');
      ok('painter', part + '/s' + t.n + ": a FINAL-WRONG grid marks the learner's wrong row",
        g.v(t.p + 'Btn(3, "true").classList.contains("wrong")') === true, '');
      ok('painter', part + '/s' + t.n + ': …and still shows the correct value on that row',
        g.v(t.p + 'Btn(3, ' + t.cfg + '.correct[3]).classList.contains("correct")') === true, '');
      g.close();
    }

    /* ── value-field groups, with the reveal toggle ── */
    for (const f of (spec.fields || [])) {
      const k0 = f.keys[0], k1 = f.keys[f.keys.length - 1];
      /* a JS expression for the correct value of one key, and the value
         itself - explicit table map first, else the cfg.correct map */
      /* S7 addresses its two boxes directly and has no s7Inputs() helper, so a
         part may supply the getter expression itself. */
      const inputsFn = f.inputsExpr || (f.p + 'Inputs()');
      const cexpr = k => (f.correct ? JSON.stringify(String(f.correct[k]))
                                    : ('String(' + f.cfg + '.correct.' + k + ')'));
      const cval = k => (f.correct ? String(f.correct[k])
                                   : String(g.v(f.cfg + '.correct.' + k)));

      /* RISK 1 / rule 5: a painter must never reset. Asserted on
         restoreScreenUI directly, not through goTo, to isolate the painter
         from the pre-existing behaviour where navigating off an unanswered
         screen clears it. */
      let g = rig(part);
      g.r.exec('goTo(' + f.n + '); var _i = ' + inputsFn + ';' +
               "_i." + k0 + ".value = '1234'; _i." + k1 + ".value = '99';" +
               'restoreScreenUI(' + f.n + ');');
      ok('painter', part + '/s' + f.n + ': a repaint leaves unsubmitted input untouched',
        g.v(inputsFn + '.' + k0 + '.value') === '1234' &&
          g.v(inputsFn + '.' + k1 + '.value') === '99',
        k0 + '=' + g.v(inputsFn + '.' + k0 + '.value') +
          ' ' + k1 + '=' + g.v(inputsFn + '.' + k1 + '.value'));
      ok('painter', part + '/s' + f.n + ': …and marks nothing with nothing resolved',
        g.v('document.querySelectorAll("#s' + f.n + ' .correct, #s' + f.n + ' .error").length') === 0,
        String(g.v('document.querySelectorAll("#s' + f.n + ' .correct, #s' + f.n + ' .error").length')));
      ok('painter', part + '/s' + f.n + ': …and leaves the popup closed',
        g.v('document.getElementById("' + f.p + '-popup").classList.contains("hidden")') === true,
        '');
      g.close();

      /* ALL CORRECT — the branch resetScreenState does NOT cover: inside one
         page load the marks are still on screen from the click, so only a
         reload exposes it (rule 8). */
      g = rig(part);
      g.r.exec('goTo(' + f.n + ');' +
               f.p + 'Done = true; ' + f.p + 'Answered = true; ' + f.p + 'Attempts = 1;' +
               f.p + 'Answer = null;' +
               'var _i = ' + inputsFn + ';' +
               f.keys.map(k => '_i.' + k + '.value = ' + cexpr(k) + ';').join('') +
               'restoreScreenUI(' + f.n + ');');
      ok('painter', part + '/s' + f.n + ': a restored ALL-CORRECT group shows correct marks',
        g.v('document.querySelectorAll("#s' + f.n + ' .correct").length') >= f.keys.length,
        String(g.v('document.querySelectorAll("#s' + f.n + ' .correct").length')));
      ok('painter', part + '/s' + f.n + ': …and keeps the values the learner typed',
        g.v(inputsFn + '.' + k0 + '.value') === cval(k0),
        g.v(inputsFn + '.' + k0 + '.value') + ' vs ' + cval(k0));
      ok('painter', part + '/s' + f.n + ': …and disables the inputs',
        g.v(inputsFn + '.' + k0 + '.disabled') === true, '');
      g.close();

      /* §8.10 — the reveal toggle must carry all THREE things. When the
         solution is displayed, the displayed values ARE the solution and the
         learner's own answer survives only in `answer`. */
      g = rig(part);
      const answer = {};
      f.keys.forEach((k, i) => { answer[k] = String(111 * (i + 1)); });
      g.r.exec('goTo(' + f.n + ');' +
               f.p + 'Done = true; ' + f.p + 'Answered = true; ' + f.p + 'Attempts = 2;' +
               f.p + 'Answer = ' + JSON.stringify(answer) + ';' +
               f.p + "View = 'answer';" +
               'restoreScreenUI(' + f.n + ');');
      ok('painter', part + '/s' + f.n + ": the 'my answer' view shows the learner's values",
        g.v(inputsFn + '.' + k0 + '.value') === answer[k0],
        g.v(inputsFn + '.' + k0 + '.value') + ' vs ' + answer[k0]);
      g.r.exec(f.p + "View = 'solution'; restoreScreenUI(" + f.n + ');');
      ok('painter', part + '/s' + f.n + ": the 'solution' view shows the solution",
        g.v(inputsFn + '.' + k0 + '.value') === cval(k0),
        g.v(inputsFn + '.' + k0 + '.value') + ' vs ' + cval(k0));
      ok('painter', part + '/s' + f.n + ": …and the learner's answer survives in the payload",
        g.v('JSON.stringify(capturePartPayload().' + f.p + '.answer)') === JSON.stringify(answer),
        String(g.v('JSON.stringify(capturePartPayload().' + f.p + '.answer)')));
      g.close();
    }
  }
}

/* ══════════════ Main ══════════════ */
(function main() {
  const t0 = Date.now();
  checkVerdicts();
  checkLiveWins();
  checkDecisionPoints();
  checkCharacter();
  checkLandingPointer();
  checkPainters();

  console.log('');
  for (const n of notes) console.log('  note: ' + n);
  if (notes.length) console.log('');
  if (failures.length) {
    console.log('FAILURES (' + failures.length + '):');
    for (const f of failures) console.log('  ✗ ' + f);
  }
  console.log((failures.length ? 'FAIL' : 'PASS') +
    '  —  ' + passes + ' passed, ' + failures.length + ' failed, ' +
    ((Date.now() - t0) / 1000).toFixed(1) + 's');
  process.exit(failures.length ? 1 : 0);
})();
