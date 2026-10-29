/* ═══════════════ xAPI statement-flow harness (§6.8) ═══════════════
   NOT DEPLOYED. Dev tooling only — must be excluded from any release package.

   verify-shared.js checks that the wiring EXISTS and that it is silent
   off-platform. This file checks what the wiring actually EMITS: it stubs
   sendStatement720 into a log, turns XAPI_USING_G on, and drives real
   interactions, then asserts the sequence.

   WHY A STUB AND NOT THE REAL LIBRARY
   The CDN library is never loaded here, so this proves payload SHAPE and
   ORDER, not arrival. Arrival needs a live Kata run (§12) and nothing here
   substitutes for it. What a stub does prove is the whole class of bug a live
   run makes almost impossible to see: a statement sent twice, a statement not
   sent at all, or one pointing at an id the catalogue does not contain — Kata
   accepts all three silently.

   HOW THE PLATFORM IS SIMULATED
   Off-platform bootXAPI() returns early, so nothing in the reporting path runs
   and window.METADATA is never fetched. Rather than fake the launch parameters
   and the CDN, the rig below sets up the three things the layer actually reads:

     window.XAPI_USING_G     = true                 the item-statement gate
     window.sendStatement720 = <logger>             the only send path
     window.METADATA         = metadata/<comp>.json what xapiQ() resolves ids from

   That is the same seam the §6.8 gate in verify-shared.js checks from the
   other side: with those three absent nothing can flow; with them present
   everything flows through one observable function.

   ⚠️ ONE FRESH REALM PER ASSERTION, and this is not paranoia — it is the
   completed-ledger. sendCompletedOnce() suppresses a second `completed` for
   the same object, the ledger lives in a module-scope variable in
   40-resume.js that is NOT reachable from window, and it is per page load. So
   two assertions that each expect to see a `completed` for item X cannot share
   a realm: the first one consumes it and the second sees nothing. That is the
   ledger working correctly, and reusing a realm reads as a phantom failure.
   (It cost exactly that during this file's own bring-up.)

   RUN (jsdom is outside the repo — see _test/README.md):

     NODE_PATH=/c/Users/Vadim/AppData/Local/lomda-test/node_modules \
       node _test/statement-flow.js
*/
'use strict';

const fs   = require('fs');
const path = require('path');
const { loadPart, UNIT, BASE } = require('./verify-shared.js');

const PARTS = ['01', '02', '03', '04', '05', '06', '07'];

let passes = 0;
const failures = [];
const notes = [];

function ok(tag, what, cond, detail) {
  if (cond) { passes++; return true; }
  failures.push('[' + tag + '] ' + what + (detail ? '  —  ' + detail : '<no detail>'));
  return false;
}
function note(m) { notes.push(m); }

/* ── the rig ─────────────────────────────────────────────────────────────── */
function rig(part) {
  const r = loadPart(part);
  const md = JSON.parse(fs.readFileSync(
    path.join(BASE, 'metadata', UNIT + '-' + part + '.json'), 'utf8').replace(/^﻿/, ''));

  r.w.__log = [];
  r.w.METADATA = md;
  r.w.XAPI_USING_G = true;
  r.exec(
    'window.sendStatement720 = function (verb, objectType, result, opts) {' +
    '  window.__log.push({ verb: verb, objectType: objectType,' +
    '                      result: result ? JSON.parse(JSON.stringify(result)) : null,' +
    '                      opts: opts ? JSON.parse(JSON.stringify(opts)) : null });' +
    '  return true;' +
    '};');

  /* PartNav.forward() ends in window.location.replace(), which jsdom cannot do
     and reports as "Not implemented: navigation to another Document" on stderr.
     It runs AFTER every xapi call in every router, so replacing it with a
     recorder removes the noise without hiding anything this file asserts. */
  r.exec('if (window.PartNav) { window.__fwd = [];' +
         '  PartNav.forward = function (p) { window.__fwd.push(p); }; }');

  const snap = () => r.w.__log.map(e => JSON.parse(JSON.stringify(e)));
  const g = {
    r, md, part,
    clear() { r.w.__log.length = 0; return g; },
    /* run `code`, return only the statements it produced */
    burst(code) { g.clear(); r.exec(code); const out = snap(); g.clear(); return out; },
    /* set up state without caring what it emits */
    setup(code) { r.exec(code); g.clear(); return g; },
    itemId: suffix => r.val('xapiItemId(' + JSON.stringify(suffix) + ')'),
    unitId: () => r.val('window.XAPI_UNIT_ID'),
    map: () => JSON.parse(r.val('JSON.stringify(SCREEN_TO_SUBCONTENT)')),
    close() { r.dom.window.close(); },
  };
  return g;
}

const verbs = evs => evs.map(e => e.verb).join(' -> ') || '<none>';
const lessons = evs => evs.filter(e => e.objectType === 'onlinelesson');

/* ══════════════ 1. item pairs, driven from goTo (§6.2) ══════════════
   Generic and driven by each part's own map, so all seven are covered rather
   than one hand-picked example. Each sub-case gets its own realm — see the
   ledger note at the top of this file. */
function checkItemPairs() {
  for (const part of PARTS) {
    const probe = rig(part);
    const map = probe.map();
    probe.close();

    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    const suf = n => (map[n] ? map[n][0] : null);

    /* opening an item from a clean state */
    const first = keys.find(n => suf(n) !== null);
    let g = rig(part);
    let evs = g.burst('goTo(' + first + ')');
    ok('pairs', part + ': goTo(' + first + ') emits exactly one initialized',
      evs.length === 1 && evs[0].verb === 'initialized' &&
        evs[0].objectType === 'question' &&
        evs[0].opts.objectId === g.itemId(suf(first)),
      verbs(evs) + ' ' + JSON.stringify(evs.map(e => e.opts && e.opts.objectId)));
    g.close();

    /* paging WITHIN one item must emit nothing at all */
    const inner = keys.find(n => n > 0 && suf(n) !== null && suf(n) === suf(n - 1));
    if (inner === undefined) {
      note('part ' + part + ' has no two adjacent screens sharing an item');
    } else {
      g = rig(part);
      g.setup('goTo(' + (inner - 1) + ')');
      evs = g.burst('goTo(' + inner + ')');
      ok('pairs', part + ': paging within item ' + suf(inner) +
        ' (' + (inner - 1) + '->' + inner + ') emits nothing',
        evs.length === 0, verbs(evs));
      g.close();
    }

    /* crossing to a different item: completed(old) then initialized(new) */
    const cross = keys.find(n => n > 0 && suf(n) !== null && suf(n - 1) !== null &&
      suf(n) !== suf(n - 1));
    if (cross === undefined) {
      note('part ' + part + ' has no adjacent pair of different items');
    } else {
      g = rig(part);
      g.setup('goTo(' + (cross - 1) + ')');
      evs = g.burst('goTo(' + cross + ')');
      ok('pairs', part + ': crossing ' + suf(cross - 1) + '->' + suf(cross) +
        ' emits completed then initialized, in that order',
        evs.length === 2 && evs[0].verb === 'completed' && evs[1].verb === 'initialized' &&
          evs[0].opts.objectId === g.itemId(suf(cross - 1)) &&
          evs[1].opts.objectId === g.itemId(suf(cross)),
        verbs(evs));
      g.close();

      /* re-entering a closed item: a second initialized, and the ledger
         suppresses the second completed (§6.2, last row of its table) */
      g = rig(part);
      g.setup('goTo(' + (cross - 1) + '); goTo(' + cross + ');');
      evs = g.burst('goTo(' + (cross - 1) + ')');
      ok('pairs', part + ': re-entering a closed item re-initializes it',
        evs.some(e => e.verb === 'initialized' &&
          e.opts.objectId === g.itemId(suf(cross - 1))), verbs(evs));
      ok('pairs', part + ': its second completed is suppressed by the ledger',
        !evs.some(e => e.verb === 'completed' &&
          e.opts.objectId === g.itemId(suf(cross - 1))), verbs(evs));
      g.close();
    }

    /* into a null screen: the old item closes and nothing opens */
    const toNull = keys.find(n => n > 0 && suf(n) === null && suf(n - 1) !== null);
    if (toNull === undefined) {
      note('part ' + part + ' has no item screen followed by a null screen');
    } else {
      g = rig(part);
      g.setup('goTo(' + (toNull - 1) + ')');
      evs = g.burst('goTo(' + toNull + ')');
      ok('pairs', part + ': entering null screen ' + toNull +
        ' closes ' + suf(toNull - 1) + ' and opens nothing',
        evs.length === 1 && evs[0].verb === 'completed' &&
          evs[0].opts.objectId === g.itemId(suf(toNull - 1)),
        verbs(evs));
      g.close();
    }
  }
}

/* ══════════════ 2. answered and requested.1 (§6.3) ══════════════
   xapiQ() returns { questionId, parentId } — NOT objectId, which is what the
   item-level pairs use. Both keys are asserted: §6.8 calls for parentId = the
   item id and questionId = item id + qN. */
function checkAnswered() {
  /* single choice, wrong then right — part 07 S2, item 001/q1 ('b' correct) */
  let g = rig('07');
  g.setup('goTo(2)');
  let evs = g.burst("s2qSelected = 'a'; s2qCheck();");
  ok('answered', '07/001/q1 first wrong is `answered`, not `.last`',
    evs.length === 1 && evs[0].verb === 'answered', verbs(evs));
  ok('answered', '07/001/q1 first wrong reports success false, scaled 0',
    evs.length === 1 && evs[0].result.success === false &&
      evs[0].result.score.scaled === 0, JSON.stringify(evs[0] && evs[0].result));
  ok('answered', '07/001/q1 questionId is the item id + q1, parentId is the item',
    evs.length === 1 && evs[0].opts.questionId === g.itemId('001') + 'q1' &&
      evs[0].opts.parentId === g.itemId('001'),
    JSON.stringify(evs[0] && evs[0].opts));
  ok('answered', '07/001/q1 student_answer is an array of exactly one string',
    evs.length === 1 && Array.isArray(evs[0].result.extensions.student_answer) &&
      evs[0].result.extensions.student_answer.length === 1 &&
      typeof evs[0].result.extensions.student_answer[0] === 'string',
    JSON.stringify(evs[0] && evs[0].result.extensions));
  ok('answered', '07/001/q1 the response really carries the visible Hebrew',
    evs.length === 1 && /[֐-׿]/.test(
      (evs[0].result.extensions.student_answer || [''])[0]),
    JSON.stringify(evs[0] && evs[0].result.extensions));

  evs = g.burst("s2qSelected = 'b'; s2qCheck();");
  ok('answered', '07/001/q1 correct is `answered.last`, success, scaled 1',
    evs.length === 1 && evs[0].verb === 'answered.last' &&
      evs[0].result.success === true && evs[0].result.score.scaled === 1,
    verbs(evs) + ' ' + JSON.stringify(evs[0] && evs[0].result));
  g.close();

  /* the hint */
  g = rig('07');
  g.setup('goTo(2)');
  evs = g.burst('s2qOpenHint();');
  ok('hint', '07/001/q1 opening the hint emits one requested.1 on the question',
    evs.length === 1 && evs[0].verb === 'requested.1' &&
      evs[0].opts.questionId === g.itemId('001') + 'q1' &&
      evs[0].opts.parentId === g.itemId('001'),
    verbs(evs) + ' ' + JSON.stringify(evs[0] && evs[0].opts));
  evs = g.burst('s2qOpenHint();');
  ok('hint', '07/001/q1 re-opening the hint emits nothing (deduped per question)',
    evs.length === 0, verbs(evs));
  g.close();

  /* §6.3 trap 2: the hint call must sit AFTER every guard. Placed above an
     early return it reports a hint request that never happened.

     Part 01's S7 is the case that can show it — its opener really does have a
     guard (`if (s7Answered) return;`), unlike part 07's, which has none. The
     second half is the control: without it a zero could just as well mean the
     hint never reports at all. */
  g = rig('01');
  g.setup('goTo(7); s7Answered = true;');
  evs = g.burst('s7OpenHint();');
  ok('hint', '01/004/q1 a hint on an already-answered question reports nothing',
    evs.length === 0, verbs(evs));
  g.setup('s7Answered = false;');
  evs = g.burst('s7OpenHint();');
  ok('hint', '01/004/q1 control: the same opener DOES report when unanswered',
    evs.length === 1 && evs[0].verb === 'requested.1' &&
      evs[0].opts.questionId === g.itemId('004') + 'q1', verbs(evs));
  g.close();

  /* several sub-questions on ONE screen — part 02 S7, item 007's five rows.
     Row 3 is set wrong on purpose: the point of reporting rows separately is
     that each carries its OWN success, not the screen's all-or-nothing result. */
  g = rig('02');
  g.setup('goTo(7)');
  evs = g.burst("s7Selections = { 1: 'true', 2: 'false', 3: 'true', 4: 'true', 5: 'false' };" +
                ' s7Check();');
  const ans = evs.filter(e => e.verb.indexOf('answered') === 0);
  const qids = ans.map(e => e.opts && e.opts.questionId);
  ok('answered', '02/007 five rows emit five answered statements',
    ans.length === 5, ans.length + ': ' + verbs(evs));
  ok('answered', '02/007 the five questionIds are all DISTINCT',
    new Set(qids).size === 5, qids.join(' '));
  ok('answered', '02/007 each row reports its own correctness, not the screen\'s',
    ans.filter(e => e.result.success === true).length === 4 &&
      ans.filter(e => e.result.success === false).length === 1,
    JSON.stringify(ans.map(e => e.result.success)));
  /* isLast is SHARED across the five rows and derived from the whole screen,
     so on attempt 1 — with a retry still available — none of them is `.last`
     even though four rows are already right. On attempt 2 the screen is
     exhausted and all five become `.last` together. That pairing is the whole
     point of a shared isLast: a row cannot be retried on its own. */
  ok('answered', '02/007 attempt 1 leaves a retry, so no row is `.last` yet',
    ans.every(e => e.verb === 'answered'), verbs(ans));
  const ans2 = g.burst('s7Check();').filter(e => e.verb.indexOf('answered') === 0);
  ok('answered', '02/007 attempt 2 exhausts the screen, so all five turn `.last`',
    ans2.length === 5 && ans2.every(e => e.verb === 'answered.last'), verbs(ans2));
  ok('answered', '02/007 attempt 2 keeps the same per-row results',
    ans2.filter(e => e.result.success === true).length === 4,
    JSON.stringify(ans2.map(e => e.result.success)));
  g.close();
}

/* ══════════════ 3. component and unit completion (§6.5) ══════════════ */
function checkCompletion() {
  /* part 04 — the off-computer class task: success, and NO score at all.
     S1 has a one-time soft nudge that swallows the first Continue, so
     s1Nudged is pre-set; otherwise the first advanceScreen() only nudges. */
  let g = rig('04');
  g.setup('goTo(1); s1Nudged = true;');
  let evs = g.burst('advanceScreen();');
  let comp = lessons(evs);
  ok('component', '04 reports its component exactly once, as onlinelesson',
    comp.length === 1, verbs(evs));
  ok('component', '04 reports success true',
    comp.length === 1 && comp[0].result.success === true,
    JSON.stringify(comp[0] && comp[0].result));
  ok('component', '04 reports NO score — an unmeasured class task (§6.4)',
    comp.length === 1 && comp[0].result.score === undefined,
    JSON.stringify(comp[0] && comp[0].result));
  ok('component', '04 the last screen\'s button is disabled after the report (the platform routes, 2026-09-16)',
    g.r.val("!!document.querySelector('.screen.active .btn-continue') && document.querySelector('.screen.active .btn-continue').disabled") === true,
    String(g.r.val("document.querySelector('.screen.active .btn-continue') && document.querySelector('.screen.active .btn-continue').outerHTML.slice(0, 80)")));
  evs = g.burst('advanceScreen();');
  ok('ledger', '04 a second router call emits no component statement',
    lessons(evs).length === 0, verbs(evs));
  g.close();

  /* part 06 — the climax, PASSED: the component — and nothing unit-level (2026-09-16) */
  g = rig('06');
  g.setup('goTo(2); s2vAnswered = true; s2vDone = true; s2vAnswer = null;' +
          "s3qLastResult = 'correct'; s4qLastResult = 'correct'; s5qLastResult = 'correct';" +
          "XAPI_Q_RESULTS['001/q1'] = true; XAPI_Q_RESULTS['001/q2'] = true;" +
          "XAPI_Q_RESULTS['001/q3'] = true; XAPI_Q_RESULTS['001/q4'] = true;" +
          'currentScreen = 5;');
  evs = g.burst('advanceScreen();');
  comp = lessons(evs);
  ok('component', '06 passed: the component only — no unit-level statement (2026-09-16)',
    comp.length === 1 && comp[0].opts == null,
    verbs(evs) + ' ' + JSON.stringify(comp.map(e => e.opts && e.opts.objectId)));
  ok('component', '06 passed: component success true, scaled 1 (4 of 4)',
    comp.length === 1 && comp[0].result.success === true &&
      comp[0].result.score.scaled === 1, JSON.stringify(comp[0] && comp[0].result));
  ok('unit', '06 passed: nothing carries XAPI_UNIT_ID',
    !evs.some(e => e.opts && e.opts.objectId === g.unitId()), JSON.stringify(evs.map(e => e.opts)));
  ok('routing', '06 passed: PartNav.forward is not called — the platform routes',
    String(g.r.val('JSON.stringify(window.__fwd)')) === '[]', String(g.r.val('JSON.stringify(window.__fwd)')));
  ok('component', '06 passed: the last screen\'s button is disabled after the report',
    g.r.val("!!document.querySelector('.screen.active .btn-continue') && document.querySelector('.screen.active .btn-continue').disabled") === true);
  evs = g.burst('advanceScreen();');
  ok('ledger', '06 a second router call emits nothing at all',
    evs.length === 0, verbs(evs));
  g.close();

  /* part 06 — the climax, FAILED: the component must still report (§6.5) */
  g = rig('06');
  g.setup('goTo(2); s2vAnswered = true; s2vDone = true; s2vAnswer = 1;' +
          "s3qLastResult = 'wrong2'; s4qLastResult = 'wrong2'; s5qLastResult = 'wrong2';" +
          'currentScreen = 5;');
  evs = g.burst('advanceScreen();');
  comp = lessons(evs);
  ok('component', '06 failed: the component still reports, success false',
    comp.length === 1 && comp[0].result.success === false,
    verbs(evs) + ' ' + JSON.stringify(comp[0] && comp[0].result));
  ok('unit', '06 failed: nothing unit-level — there is no unit statement anywhere since 2026-09-16',
    !comp.some(e => e.opts && e.opts.objectId), verbs(evs));
  ok('routing', '06 failed: the caller still hands "07" to PartNav.forward (inert in production — resume-flow proves it; live under ?dev=1)',
    JSON.stringify(g.r.val('JSON.stringify(window.__fwd)')) .indexOf('07') !== -1,
    String(g.r.val('JSON.stringify(window.__fwd)')));
  g.close();

  /* part 02 — the first Decision Point, failed with 3 of its 5 items right */
  g = rig('02');
  g.setup('goTo(7);' +
          "s1Result = 'correct'; s2Result = 'correct'; s3Result = 'correct';" +
          "s4Result = 'correct'; s5Result = 'correct';" +
          "s6Result = 'incorrect'; s7Result = 'incorrect';" +
          's1Answered = s2Answered = s3Answered = s4Answered = true;' +
          's5Answered = s6Answered = s7Answered = true;' +
          "XAPI_Q_RESULTS['003/q1'] = XAPI_Q_RESULTS['003/q2'] = XAPI_Q_RESULTS['003/q3'] = true;" +
          "XAPI_Q_RESULTS['004/q1'] = true; XAPI_Q_RESULTS['005/q1'] = true;" +
          'currentScreen = 7;');
  evs = g.burst('advanceScreen();');
  comp = lessons(evs);
  ok('component', '02 failing the gate still reports: success false, scaled 3/5',
    comp.length === 1 && comp[0].result.success === false &&
      Math.abs(comp[0].result.score.scaled - 0.6) < 1e-9,
    verbs(evs) + ' ' + JSON.stringify(comp[0] && comp[0].result));
  ok('routing', '02 failing the gate still hands "03" to PartNav.forward (inert in production; the platform routes on recommendedAfterFail)',
    String(g.r.val('JSON.stringify(window.__fwd)')).indexOf('03') !== -1,
    String(g.r.val('JSON.stringify(window.__fwd)')));
  g.close();

  /* part 05 — the challenge ("בואו נאתגר"). MOE 2026-10-08: it reports its real score over the 5
     declared questions (unanswered = wrong) and success only at >= 60% (3 of 5 is the inclusive
     edge). No gate: the S5 gate stays resolved-either-way. One realm per case (ledger). */
  const KEYS05 = ['001/q1', '001/q2', '002/q1', '002/q2', '002/q3'];
  const got05 = [0, 2, 3, 4, 5].map(function (n) {
    const g5 = rig('05');
    g5.setup('goTo(5); s5vDone = true; currentScreen = 5;' +
             KEYS05.slice(0, n).map(k => "XAPI_Q_RESULTS['" + k + "'] = true;").join(''));
    const c5 = lessons(g5.burst('advanceScreen();'));
    g5.close();
    return c5.length === 1 ? c5[0].result.success + ':' + c5[0].result.score.scaled : 'n=' + c5.length;
  }).join(',');
  ok('component', '05 challenge: success only at >= 60%, real score (0/5, 2/5 fail; 3/5, 4/5, 5/5 pass)',
    got05 === 'false:0,false:0.4,true:0.6,true:0.8,true:1', got05);

  /* part 07 — terminal B. Correct values so s3vCheck resolves on attempt 1.
     Since 2026-09-16 the component 'completed' is the learner's LAST click — the second press of
     #s3v-check ("המשך") — not the resolution itself: Kata removes the part the moment 'completed'
     arrives, and the feedback would vanish with it. Nothing unit-level leaves at all. */
  g = rig('07');
  g.setup("goTo(3); XAPI_Q_RESULTS['001/q1'] = true;");   /* q1 (S2) answered right, so S3 decides 2 of 2 */
  evs = g.burst('const _i = s3vInputs();' +
                "_i.shai.value = '6400'; _i.alon.value = '7200'; s3vCheck();");
  ok('component', '07 resolving S3 reports NO component yet — the finale must stay on screen',
    lessons(evs).length === 0, verbs(evs));
  ok('component', '07 after resolving, #s3v-check is the enabled "המשך"',
    g.r.val("document.getElementById('s3v-check').disabled") === false);
  evs = g.burst('s3vCheck();');             /* the second click */
  comp = lessons(evs);
  ok('component', '07 the second click reports the component exactly once, success true (2 of 2)',
    comp.length === 1 && comp[0].opts == null && comp[0].result.success === true &&
      comp[0].result.score.scaled === 1,
    verbs(evs) + ' ' + JSON.stringify(comp[0] && comp[0].result));
  ok('unit', '07 nothing unit-level leaves',
    !evs.some(e => e.opts && e.opts.objectId === g.unitId()), JSON.stringify(evs.map(e => e.opts)));
  ok('component', '07 …and #s3v-check is disabled',
    g.r.val("document.getElementById('s3v-check').disabled") === true &&
    g.r.val("document.getElementById('s3v-check').getAttribute('aria-disabled')") === 'true');
  evs = g.burst('s3vCheck(); s3vFinish();');
  ok('ledger', '07 a third click and a re-run of the finish handler emit nothing',
    lessons(evs).length === 0, verbs(evs));
  /* A restore onto the resolved S3 after the report: the painter re-disables the button. */
  g.r.exec("document.getElementById('s3v-check').disabled = false; s3vFinishDom();");
  ok('component', '07 the painter keeps #s3v-check disabled once the ledger holds the component',
    g.r.val("document.getElementById('s3v-check').disabled") === true);
  g.close();

  /* part 03 — Decision Point 1, the terminal failure edge */
  g = rig('03');
  g.setup('goTo(9); currentScreen = 9;' +
          's1vDone = s2scDone = s3vDone = s4vDone = s5vDone = true;' +
          's6scDone = s7vDone = s8scDone = s9vDone = true;' +
          's1vAnswer = 1; s3vAnswer = 1; s4vAnswer = 1; s5vAnswer = 1;' +
          "s2scResult = 'wrong2'; s6scResult = 'wrong2'; s8scResult = 'wrong2';");
  evs = g.burst('advanceScreen();');
  ok('component', '03 the S9 terminal failure edge still reports the component',
    lessons(evs).length === 1 && lessons(evs)[0].result.success === false,
    verbs(evs) + ' ' + JSON.stringify(lessons(evs)[0] && lessons(evs)[0].result));
  g.close();

  /* …and the same call on an UNRESOLVED basic set must stay silent, or it
     records a failure the learner never had */
  g = rig('03');
  g.setup('goTo(9); currentScreen = 9;');
  evs = g.burst('advanceScreen();');
  ok('component', '03 an unresolved S9 reports no component at all',
    lessons(evs).length === 0, verbs(evs));
  g.close();
}

/* ══════════════ F-2 (QA 2026-10-02): a fraction answer keeps its slash ══════════════
   01 s21 (45/80·100 …) and 06 s4 option c (33⅓%) carry stacked fractions whose bar is a CSS border, so
   the reported text read "4580·100" and "3313%". */
function checkFractionText() {
  let g = rig('01');
  const a = g.r.val("xapiAnswerText(xapiScqOptEl('s21', 'a'))");
  ok('F-2', '01 s21 option a is reported with 45/80', typeof a === 'string' && a.indexOf('45/80') !== -1, a);
  g.close();
  g = rig('06');
  const c = g.r.val("xapiAnswerText(xapiScqOptEl('s4', 'c'))");
  ok('F-2', '06 s4 option c is reported with 33 1/3 %', typeof c === 'string' && /33 1\/3/.test(c), c);
  g.close();
}

/* ══════════════ Main ══════════════ */
(function main() {
  const t0 = Date.now();
  checkItemPairs();
  checkAnswered();
  checkCompletion();
  checkFractionText();

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
