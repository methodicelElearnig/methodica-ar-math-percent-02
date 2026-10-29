/* ═══════════════ Track A regression oracle — shared-layer extraction ═══════════════
   NOT DEPLOYED. Dev tooling only — must be excluded from any release package.

   PURPOSE
   This is the gate for the shared-layer extraction. It loads the REAL index.html,
   css and js of all seven parts into jsdom and executes their script tags in
   document order from disk — it does not call the code in isolation, it runs it.
   Then it walks every screen of every part and records a digest of the rendered
   #app. Those digests are the baseline: the extraction is only safe if moving code
   out of the seven main.js files leaves every screen rendering byte-identically.

   Run it BEFORE touching anything (that writes the baseline), then after every
   extraction step. A digest change is either a real regression or a deliberate
   change you must re-baseline on purpose.

   WHY A DIGEST AND NOT THE HTML
   66 screens of full #app markup is megabytes and unreadable in a diff. A SHA-256
   of the normalised markup detects any change at all, and the structural summary
   stored beside it (active screen, element counts) is enough to say WHAT moved
   before you go looking. This unit contains no Math.random, no Date.now and no
   shuffled boards, so the render is naturally deterministic — verified, not assumed.

   RUN (jsdom is NOT in the repo and there is no package.json — do NOT install it
   inside the project folder, which is OneDrive-synced):

     NODE_PATH=/c/Users/Vadim/AppData/Local/lomda-test/node_modules \
       node _test/verify-shared.js

     node _test/verify-shared.js --update-snapshots   # re-baseline, deliberately

   Exit 0 = everything passed. A base path may be passed as the first non-flag
   argument; without one the harness assumes its own parent directory.

   ⚠️ Real script tags put top-level `function`/`var` on window, which is what makes
   val() work. `let`/`const` bindings never reach window even in a real browser, so
   those are read by executing an expression in page scope instead. */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');

const argv   = process.argv.slice(2);
const UPDATE = argv.includes('--update-snapshots');
const BASE   = argv.find(a => !a.startsWith('--')) || path.join(__dirname, '..');

const UNIT     = 'methodica-math-percent-02';
const PARTS    = ['01', '02', '03', '04', '05', '06', '07'];
const PART_DIR = c => UNIT + '-' + c;

/* Per-part entry points. percent-02 uses js/main.js + css/style.css, NOT the
   family's flat script.js/styles.css — parameterised here rather than inline at
   every call site so a rename is one edit. See the plan: do NOT rename them. */
const MAIN_JS   = 'js/main.js';
const STYLE_CSS = 'css/style.css';

/* The screen counts the parts declare. Asserted against both TOTAL_SCREENS and the
   DOM, so a mismatch in either direction is caught rather than assumed. */
const EXPECTED_SCREENS = { '01': 25, '02': 8, '03': 15, '04': 2, '05': 6, '06': 6, '07': 4 };

const SNAP_DIR  = path.join(__dirname, 'snapshots');
const SNAP_FILE = path.join(SNAP_DIR, 'app-digests.json');

const failures = [];
const notes    = [];
let passes = 0;

function ok(tag, what, cond, detail) {
  if (cond) { passes++; return true; }
  failures.push('[' + tag + '] ' + what + (detail ? '  —  ' + detail : ''));
  return false;
}
function note(msg) { notes.push(msg); }

function sha(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16); }

function makeRunner(w) {
  const exec = (code) => {
    const s = w.document.createElement('script');
    s.textContent = code;
    w.document.head.appendChild(s);
    s.remove();
  };
  const val = (expr) => {
    exec('window.__v = (function(){ try { return (' + expr + '); } catch (e) { return "__throw:" + e.message; } })();');
    return w.__v;
  };
  return { exec, val };
}

/* ── Load one part: real DOM, real script tags, in document order ───────────── */
function loadPart(c, opts) {
  opts = opts || {};
  const dir  = path.join(BASE, PART_DIR(c));
  const file = path.join(dir, 'index.html');
  const consoleErrors = [];

  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    url: 'http://localhost:8090/' + PART_DIR(c) + '/index.html' + (opts.search || '') + (opts.hash || ''),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const { exec, val } = makeRunner(w);

  w.console.error = (...a) => consoleErrors.push(a.join(' '));
  w.console.warn  = () => {};
  w.console.log   = () => {};

  /* jsdom implements neither load/play/pause; play() returns undefined, so the real
     `video.play().catch(...)` in this unit throws. Give them the browser contract so
     the REAL code path runs instead of a jsdom gap. This is the exact shape that,
     per the spec §3.2, once killed the rest of a script silently. */
  w.HTMLMediaElement.prototype.load  = function () {};
  w.HTMLMediaElement.prototype.play  = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};

  /* IntersectionObserver / ResizeObserver are used by the motion engine's popup
     watcher and are absent from jsdom. Inert stubs keep the engine's real
     registration path running without pretending to observe anything. */
  for (const name of ['IntersectionObserver', 'ResizeObserver']) {
    if (!w[name]) {
      w[name] = class { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
    }
  }

  const srcs = [...w.document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
  const executed = [];
  for (const src of srcs) {
    if (/^[a-z]+:\/\//i.test(src) || src.startsWith('//')) continue;   // third-party, never fetched
    const p = path.resolve(dir, src.split('?')[0]);
    if (!fs.existsSync(p)) { consoleErrors.push('missing script ' + src); continue; }
    try { exec(fs.readFileSync(p, 'utf8')); executed.push(src); }
    catch (e) { consoleErrors.push('threw in ' + src + ': ' + e.message); }
  }
  return { dom, w, exec, val, srcs, executed, dir, consoleErrors };
}

/* ── The digest of a rendered screen ────────────────────────────────────────────
   Normalised so that only meaningful render differences move the hash: whitespace
   runs collapse, and #app's own inline transform is dropped because scaleApp
   computes it from the viewport, which is a property of jsdom rather than of the
   content. Everything else — classes, hidden flags, injected nodes, text — counts. */
function screenDigest(w) {
  const app = w.document.getElementById('app');
  if (!app) return { digest: 'NO-APP', summary: {} };
  let html = app.innerHTML.replace(/\s+/g, ' ').trim();
  const active = w.document.querySelector('.screen.active');
  return {
    digest: sha(html),
    summary: {
      active: active ? (active.id || active.getAttribute('data-screen')) : null,
      activeCount: w.document.querySelectorAll('.screen.active').length,
      nodes: app.querySelectorAll('*').length,
      hidden: app.querySelectorAll('[hidden]').length,
      len: html.length,
    },
  };
}

/* ══════════════ 1. Clean load + structure ══════════════ */
function checkLoad(results) {
  for (const c of PARTS) {
    const r = results[c];
    ok('load', c + ' loads with no console errors',
      r.consoleErrors.length === 0, r.consoleErrors.slice(0, 3).join(' | '));

    const total = r.val('typeof TOTAL_SCREENS !== "undefined" ? TOTAL_SCREENS : null');
    ok('screens', c + ': TOTAL_SCREENS is ' + EXPECTED_SCREENS[c],
      total === EXPECTED_SCREENS[c], 'got ' + total);

    const domCount = r.w.document.querySelectorAll('.screen').length;
    ok('screens', c + ': DOM .screen count equals TOTAL_SCREENS',
      domCount === EXPECTED_SCREENS[c], 'DOM=' + domCount + ' expected=' + EXPECTED_SCREENS[c]);

    /* data-screen must be exactly 0..N-1 with no gaps: a gap is a screen that
       silently never reports once SCREEN_TO_SUBCONTENT exists (spec §6.2 trap 1). */
    const ds = [...r.w.document.querySelectorAll('.screen')]
      .map(s => Number(s.getAttribute('data-screen'))).sort((a, b) => a - b);
    const want = Array.from({ length: EXPECTED_SCREENS[c] }, (_, i) => i);
    ok('screens', c + ': data-screen values are exactly 0..' + (EXPECTED_SCREENS[c] - 1),
      JSON.stringify(ds) === JSON.stringify(want), JSON.stringify(ds));

    ok('load', c + ': exactly one .screen.active after boot',
      r.w.document.querySelectorAll('.screen.active').length === 1,
      String(r.w.document.querySelectorAll('.screen.active').length));
  }
}

/* ══════════════ 2. goTo sweep + golden digests ══════════════
   The core of the gate. Walk every screen, assert the navigation contract holds,
   and record what rendered. */
function checkSweepAndSnapshots(results) {
  const baseline = (!UPDATE && fs.existsSync(SNAP_FILE)) ? JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8')) : null;
  const current  = {};

  for (const c of PARTS) {
    const r = results[c];
    current[c] = {};
    for (let n = 0; n < EXPECTED_SCREENS[c]; n++) {
      const before = r.consoleErrors.length;
      const res = r.val('(function(){ try { goTo(' + n + '); return "ok"; } catch (e) { return "__throw:" + e.message; } })()');
      ok('sweep', c + ': goTo(' + n + ') does not throw', res === 'ok', String(res));

      const cur = r.val('typeof currentScreen !== "undefined" ? currentScreen : null');
      ok('sweep', c + ': goTo(' + n + ') sets currentScreen', cur === n, 'got ' + cur);

      const activeCount = r.w.document.querySelectorAll('.screen.active').length;
      ok('sweep', c + ': goTo(' + n + ') leaves exactly one active screen',
        activeCount === 1, String(activeCount));

      ok('sweep', c + ': goTo(' + n + ') logs no console error',
        r.consoleErrors.length === before,
        r.consoleErrors.slice(before).slice(0, 2).join(' | '));

      current[c][n] = screenDigest(r.w);
    }
  }

  if (!baseline) {
    fs.mkdirSync(SNAP_DIR, { recursive: true });
    fs.writeFileSync(SNAP_FILE, JSON.stringify(current, null, 2) + '\n', 'utf8');
    note('BASELINE WRITTEN: ' + path.relative(BASE, SNAP_FILE) +
         ' (' + PARTS.reduce((a, c) => a + Object.keys(current[c]).length, 0) + ' screens). ' +
         'Commit it — later runs compare against it.');
    return;
  }

  let compared = 0, moved = [];
  for (const c of PARTS) {
    for (let n = 0; n < EXPECTED_SCREENS[c]; n++) {
      const b = baseline[c] && baseline[c][n];
      const x = current[c][n];
      if (!b) { moved.push(c + '/s' + n + ': NEW screen, no baseline'); continue; }
      compared++;
      if (b.digest !== x.digest) {
        moved.push(c + '/s' + n + ': digest ' + b.digest + ' -> ' + x.digest +
          ' (nodes ' + b.summary.nodes + '->' + x.summary.nodes +
          ', len ' + b.summary.len + '->' + x.summary.len + ')');
      }
    }
  }
  ok('snapshot', 'all ' + compared + ' screen digests match the baseline',
    moved.length === 0, moved.slice(0, 8).join(' | '));

  /* Always leave the current run on disk for inspection, without touching the
     baseline — a digest change is much easier to chase with both in hand. */
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  fs.writeFileSync(path.join(SNAP_DIR, 'app-digests.current.json'),
    JSON.stringify(current, null, 2) + '\n', 'utf8');
}

/* ══════════════ 2b. Shared functions must RUN in every part ══════════════
   The gap this closes, found the hard way in step 7b: step 5 lifted
   getCanvasSize() and clampPopup() into the shared layer but left the
   CANVAS_W / CANVAS_H / BOTTOM_BAR_H they read declared per-part — and part 04
   never declared them. Both threw "CANVAS_W is not defined" there for two
   commits. Nothing caught it, because the assertions only ever exercised a
   shared function in a part that already used it, and part 04 calls neither.

   So: call each shared helper in EVERY part, with arguments harmless enough to
   run anywhere, and require it not to throw. A ReferenceError here means the
   shared layer depends on something a part does not have — exactly the failure
   mode that extraction creates and that a per-part smoke test cannot see.

   Detached elements are used on purpose: these must work without being in the
   document, and it keeps the checks from mutating the page the digests read. */
const SMOKE = [
  ['getCanvasSize', 'getCanvasSize()'],
  ['getAppScale', 'getAppScale()'],
  ['frac', 'frac(1, 2)'],
  ['resetPopupPosition', 'resetPopupPosition(document.createElement("div"))'],
  /* clampPopup returns early on a .hidden popup, so give it a visible one with
     a numeric left/top — that is the path that reads the canvas constants. */
  ['clampPopup', '(function(){ var d = document.createElement("div");' +
    ' d.style.left = "10px"; d.style.top = "10px"; clampPopup(d); return "ok"; })()'],
  ['setNavLabel', 'setNavLabel(document.createElement("button"), "x")'],
];

function checkSharedSmoke(results) {
  for (const c of PARTS) {
    const r = results[c];
    for (const [name, expr] of SMOKE) {
      if (r.val('typeof ' + name) !== 'function') continue;   // not shared into this part
      const out = r.val('(function(){ try { ' + expr + '; return "ok"; } catch (e) { return "__throw:" + e.message; } })()');
      ok('smoke', c + ': ' + name + '() runs without throwing',
        out === 'ok', String(out));
    }
  }
}

/* ══════════════ 2c. The reporting layer's API surface and regression gate ══════════════
   §10.2: every function the parts and markup call must exist in every part, so
   an extraction or a missing script tag cannot leave a call site dangling.

   §6.8: THE REGRESSION GATE, and it is easy to misread. Off-platform there is
   no ?slxapi, the CDN library never loads, and sendStatement720 does not
   exist. The guarantee is NOT that XAPI_USING_G is false — it is legitimately
   true when a resume-capable letter is chosen, because it only records that
   the chosen build SUPPORTS item statements. The guarantee is that NO
   STATEMENT CAN FLOW: every send path is additionally gated on
   sendStatement720 being a function.

   The third assertion is the direct test of §6.4's invariant — the write to
   XAPI_Q_RESULTS happens on xapiAnswered's FIRST line, before the
   XAPI_USING_G guard and outside the try — which is what makes scoring and
   routing behave identically with reporting fully off. That is the entire
   off-platform QA mode. */
const SHARED_REPORTING_API = [
  'shortId', 'bootXAPI',
  'xapiOnScreen', 'xapiAnswered', 'xapiRequestedHint',
  'xapiAnswerText', 'xapiScqOptEl',
  'xapiCompleteComponent', 'xapiEndComponent', 'xapiActiveContinueButton',
  'initReportModal', 'openReportModal', 'tryCloseReportModal', 'submitReport',
  'sendCompletedOnce', 'itemLedgerKey', 'currentPartSlug',
  'readUnitState', 'initResumeResetHatch', 'initResumeLeaveHandlers',
  /* the §8.7 unit-level layer plus the nav seam P4 added. These are what the
     per-part code calls through typeof guards, so a part that loads but a
     shared file that does not would silently degrade rather than fail - the
     guards are the point, and this list is what proves they are not the only
     thing standing between the learner and a lost character or verdict. */
  'getUnitCharacter', 'setUnitCharacter', 'getUnitResult', 'setUnitResult',
  'adoptUnitCharacter', 'migrateState', 'drainPendingUnitState', 'dropBootCover',
  'writeForwardState', 'goBackToPreviousPart', 'previousPartHref',
  'applyExecutionState', 'repaintScreen', 'scheduleResumeSave', 'flushResumeSave',
  'jumpToLinkedScreen',
];

function checkReportingLayer(results) {
  for (const c of PARTS) {
    const r = results[c];

    for (const fn of SHARED_REPORTING_API) {
      ok('shared', c + ' defines ' + fn, r.val('typeof ' + fn) === 'function',
        String(r.val('typeof ' + fn)));
    }

    /* identity, read from the loaded layer rather than from the source text */
    ok('identity', c + ': XAPI_UNIT_ID is the plain v2.5 slug',
      r.val('window.XAPI_UNIT_ID') === 'methodica-math-percent-02',
      String(r.val('window.XAPI_UNIT_ID')));
    ok('identity', c + ': XAPI_ID_PREFIX is this unit\'s math/percent/02 prefix',
      r.val('XAPI_ID_PREFIX') === 'https://lomdot.education.gov.il/metodica/720active/math/percent/02/',
      String(r.val('XAPI_ID_PREFIX')));

    /* ── the §6.8 regression gate ── */
    ok('gate', c + ': sendStatement720 absent without ?slxapi',
      r.val('typeof sendStatement720') === 'undefined',
      String(r.val('typeof sendStatement720')));
    for (const [name, expr] of [
      ['xapiOnScreen', 'xapiOnScreen(0); xapiOnScreen(1)'],
      ['xapiAnswered', 'xapiAnswered("001","q1",true,true,"x")'],
      ['xapiRequestedHint', 'xapiRequestedHint("001","q1")'],
      ['xapiCompleteComponent', 'xapiCompleteComponent({success:true})'],
      ['xapiEndComponent', 'xapiEndComponent({success:true}, null)'],
    ]) {
      ok('gate', c + ': ' + name + ' is a silent no-op with no library',
        r.val('(function(){ try { ' + expr + '; return "ok"; } catch (e) { return e.message; } })()') === 'ok',
        String(r.val('(function(){ try { ' + expr + '; return "ok"; } catch (e) { return e.message; } })()')));
    }
    ok('gate', c + ': xapiAnswered still records the score with reporting off',
      r.val('(function(){ xapiAnswered("001","q1",true,true,"x"); return XAPI_Q_RESULTS["001/q1"]; })()') === true,
      String(r.val('(function(){ xapiAnswered("001","q1",true,true,"x"); return XAPI_Q_RESULTS["001/q1"]; })()')));
  }
}

/* ══════════════ 3. Inline on*= handlers must resolve ══════════════
   Every identifier named in an inline attribute has to exist after load. This is
   the check that catches an extraction that moved a function into a shared file
   the part does not actually load — the markup still calls it and the click dies
   with a ReferenceError nobody sees. */
function checkInlineHandlers(results) {
  for (const c of PARTS) {
    const r = results[c];
    const names = new Set();
    for (const el of r.w.document.querySelectorAll('*')) {
      for (const at of el.attributes) {
        if (!/^on/i.test(at.name)) continue;
        /* Take every `identifier(` occurrence: handlers here are small call
           expressions, sometimes several separated by ; */
        for (const m of at.value.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)) names.add(m[1]);
      }
    }
    /* Language/runtime builtins that legitimately appear in handlers. */
    const BUILTIN = /^(?:if|for|while|switch|return|function|typeof|new|this|event|alert|Number|String|Boolean|Array|Object|Math|parseInt|parseFloat|JSON|window|document|console|setTimeout|clearTimeout|requestAnimationFrame)$/;
    const missing = [...names].filter(nm => !BUILTIN.test(nm) && r.val('typeof ' + nm) === 'undefined');
    ok('handlers', c + ': all ' + names.size + ' inline on*= identifiers are defined',
      missing.length === 0, 'undefined: ' + missing.join(', '));
  }
}

/* ══════════════ 4. No identifier declared in two layers ══════════════
   §3.3: a var/function collision between a shared file and the part file is a
   SILENT last-wins overwrite, and the part file loads last — so a leftover
   part-local copy wins and the extraction looks successful while shipping the old
   code. Scanned per part over its own script tags, so it works before the
   extraction (motion.js/partnav.js vs main.js) and after (unit-js/* vs main.js). */
const DECL = /^(?:\s*)(?:function|var|let|const)\s+([A-Za-z0-9_$]+)/;

function topLevelDecls(text) {
  /* Depth-0 declarations only: anything nested inside a function or an IIFE is
     module-private and cannot collide across script tags. */
  const out = new Set();
  let depth = 0;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '');
    if (depth === 0) { const m = line.match(DECL); if (m) out.add(m[1]); }
    for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth = Math.max(0, depth - 1); }
  }
  return out;
}

/* Hook names are the expected exceptions — they are SUPPOSED to live per-part and
   be read by the shared layer at call time (spec §3.3, §8.7). */
const HOOKS = new Set([
  'TOTAL_SCREENS', 'PART_ID', 'currentScreen', 'resetScreenState', 'advanceScreen',
  'goBack', 'backFromCurrentScreen', 'partScreenLeave', 'partBoot',
  'capturePartPayload', 'applyResumeVars', 'applyResumeDom', 'restoreScreenUI',
  'SCREEN_TO_SUBCONTENT', 'XAPI_COMP_SLUG', 'XAPI_COMP_ID', 'XAPI_EVAL_ITEMS',
  'XAPI_METADATA_FILE',
]);

function checkLayerCollisions(results) {
  for (const c of PARTS) {
    const r = results[c];
    const mainIdx = r.executed.findIndex(s => s.split('?')[0].endsWith(MAIN_JS));
    if (mainIdx < 0) { ok('layers', c + ': ' + MAIN_JS + ' is among the executed scripts', false); continue; }

    const shared = new Map();   // name -> file that declared it
    for (let i = 0; i < r.executed.length; i++) {
      if (i === mainIdx) continue;
      const src = r.executed[i];
      const text = fs.readFileSync(path.resolve(r.dir, src.split('?')[0]), 'utf8');
      for (const nm of topLevelDecls(text)) if (!shared.has(nm)) shared.set(nm, src);
    }
    const mainText = fs.readFileSync(path.resolve(r.dir, MAIN_JS), 'utf8');
    const clashes = [...topLevelDecls(mainText)]
      .filter(nm => shared.has(nm) && !HOOKS.has(nm))
      .map(nm => nm + ' (also in ' + shared.get(nm) + ')');

    ok('layers', c + ': no identifier declared in both the shared layer and ' + MAIN_JS,
      clashes.length === 0, clashes.join(', '));
  }
}

/* ══════════════ 5. Shared URLs agree across parts ══════════════
   §3.4: every part references the same shared URL, so a given shared file's ?v=
   must be identical in all of them. A mismatch means one part fetches a second
   copy under a different URL, and two parts can execute DIFFERENT versions of the
   same logic inside one learner session.

   Today percent-02 carries no ?v= at all, so this passes trivially — and that is
   worth knowing: it means a released main.js is served stale to returning
   learners. The assertion is written now so it keeps holding once ?v= is added. */
function checkSharedUrlAgreement() {
  const byFile = new Map();   // basename -> Map(url -> [parts])
  for (const c of PARTS) {
    const html = fs.readFileSync(path.join(BASE, PART_DIR(c), 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
      .filter(u => !/^[a-z]+:\/\//i.test(u) && !u.startsWith('//'));
    for (const u of refs) {
      const key = u.split('?')[0].split('/').pop();
      if (!byFile.has(key)) byFile.set(key, new Map());
      const m = byFile.get(key);
      if (!m.has(u)) m.set(u, []);
      m.get(u).push(c);
    }
  }
  for (const [file, urls] of byFile) {
    const shared = [...urls.values()].some(ps => ps.length > 1) || urls.size > 1;
    if (!shared) continue;
    ok('urls', 'all parts reference ' + file + ' at one identical URL',
      urls.size === 1,
      [...urls.entries()].map(([u, ps]) => u + ' <- ' + ps.join(',')).join(' | '));
  }
  /* Every CODE reference must carry ?v= (§3.4, §11.4). Without it a release
     serves stale JS/CSS to returning learners from cache — and for the shared
     layer that is worse than stale, because a cached older shared file running
     beside a fresh part file is the exact ReferenceError-on-every-navigation
     shape §8.4a warns about.

     Media is deliberately NOT required to be versioned: an asset that changes
     gets a new filename, and versioning 27 video refs would be noise. */
  const CODE = /\.(?:js|css)$/;
  for (const [file, urls] of byFile) {
    if (!CODE.test(file)) continue;
    for (const [u, ps] of urls) {
      ok('urls', file + ' carries ?v= in ' + (ps.length === PARTS.length ? 'all parts' : 'parts ' + ps.join(',')),
        /\?v=\d+/.test(u), u);
    }
  }
}

/* ══════════════ 5b. Shared CSS url() must resolve at the right DEPTH ══════════════
   The bug this exists for: step 2 moved @font-face rules verbatim out of
   <part>/css/style.css into unit-css/, carrying their `../../unit-assets/`
   paths. From unit-css/ the assets are only ONE level up, so the depth was
   wrong for two commits — and completely invisible in dev, because a browser
   clamps ".." at the server root and ../../ resolves the same as ../ when the
   unit is served from /. Under the production subpath they diverge:

     ../../ -> .../metodica/720active/math/percent/unit-assets/...   404
     ../    -> .../metodica/720active/math/percent/02/unit-assets/... right

   Every font would have 404'd on the real host. Resolving each url() against
   its own stylesheet's directory and requiring the file to exist catches it
   regardless of how the dev server happens to be mounted. */
function checkSharedCssAssets() {
  for (const f of fs.readdirSync(path.join(BASE, 'unit-css'))) {
    if (!f.endsWith('.css')) continue;
    const cssPath = path.join(BASE, 'unit-css', f);
    const css = fs.readFileSync(cssPath, 'utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const u = m[1].trim();
      if (/^(?:data:|https?:|\/\/)/i.test(u)) continue;
      const target = path.resolve(path.dirname(cssPath), u.split('?')[0]);
      ok('css-assets', 'unit-css/' + f + ' -> ' + u + ' resolves to a real file',
        fs.existsSync(target), 'looked at ' + target);
      /* A path that climbs above the unit root cannot be right: unit-css/ is
         itself at the unit root, so anything reaching past it escapes the
         deployed folder even when the dev server hides that by clamping. */
      ok('css-assets', 'unit-css/' + f + ' -> ' + u + ' stays inside the unit',
        !path.relative(BASE, target).startsWith('..'), path.relative(BASE, target));
    }
  }
}

/* ══════════════ 6. No stale generated copies ══════════════
   Once the engines move to ../unit-js/, a leftover per-part copy would shadow the
   shared file and re-open exactly the drift the sync scripts existed to police.
   Reports rather than fails while the copies are still the live arrangement. */
function checkNoStaleCopies() {
  const retired = ['js/motion.js', 'js/partnav.js', 'css/motion.css'];
  const engines = ['_motion-engine', '_nav-engine'];
  const enginesLeft = engines.filter(d => fs.existsSync(path.join(BASE, d)));
  const copiesLeft = [];
  for (const c of PARTS) {
    for (const rel of retired) {
      if (fs.existsSync(path.join(BASE, PART_DIR(c), rel))) copiesLeft.push(PART_DIR(c) + '/' + rel);
    }
  }
  if (enginesLeft.length || copiesLeft.length) {
    note('PRE-EXTRACTION state: ' + copiesLeft.length + ' generated copies and ' +
         enginesLeft.length + ' engine folders (' + enginesLeft.join(', ') + ') still present. ' +
         'After step 3 this must be 0 and 0, and both sync .ps1 scripts must be gone.');
  } else {
    ok('stale', 'no per-part engine copies and no _*-engine folders remain', true);
    for (const c of PARTS) {
      const html = fs.readFileSync(path.join(BASE, PART_DIR(c), 'index.html'), 'utf8');
      ok('stale', PART_DIR(c) + ' references no retired per-part engine path',
        !retired.some(rel => html.includes('"' + rel)), html.match(/"(?:js|css)\/(?:motion|partnav)\.[a-z]+"/g) + '');
    }
  }
}


/* ══════════════ 10. The per-part xAPI config block (§6.1, §6.2) ══════════════
   SCREEN_TO_SUBCONTENT is the one piece of P2 that cannot be checked by running
   the lomda: a wrong suffix reports a real statement about the WRONG catalogue
   item, and Kata accepts it silently (§4.2). So it is checked against
   metadata/ from three directions at once.

   The two assertions that earn their keep are the ones a runtime read of the
   object cannot make:

     • SOURCE KEY COUNT vs RUNTIME KEY COUNT. A duplicated key ({0: null,
       … 0: ['001', 1]}) is legal JS — the last one silently wins — so the
       loaded object shows N-1 keys and looks merely short, with no clue why.
       Counting the numeric-key lines in the source text and comparing is the
       only way to see it.

     • THE GROUPING CROSS-CHECK. Parts 02, 03 and 05 already declare which
       screens belong to one on-screen question (PRACTICE_QUESTIONS /
       STANDARD_QUESTIONS, written long before any of this). Those groupings
       were authored from the content, and the catalogue items were authored
       from the same content by a different person at a different time. Requiring
       them to agree — all screens of one question map to one suffix, and two
       questions never share a suffix — checks the derived map against an
       INDEPENDENT witness instead of against my reading of the Hebrew. All
       three parts agree today; if a future edit renumbers either side, this is
       what catches it.

   xapiItemId() is also called for every mapped suffix and compared byte-for-byte
   against the id in metadata/, which pins XAPI_ID_PREFIX, XAPI_COMP_SLUG,
   XAPI_COMP_ID and the trailing slash in a single comparison. */

/* Parts with no config block yet. Asserted to be exactly this list, so a part
   cannot be quietly forgotten and a newly-missing one fails. */
const MAP_PENDING = [];

/* Catalogue items that deliberately have NO screen in their own component's
   part, with the reason. Anything not listed here fails, and anything listed
   here that IS mapped also fails - so the list cannot rot in either direction.

   Empty, and that is the point: it briefly held 02/001 and 02/002, the two
   'שאלת חימום' warm-ups, which metadata/ catalogued under component -02 while
   the code has them as part 01's screens 21-24. They were moved to component
   -01 as items 008/009 rather than left unreportable, which is what emptied
   this. */
const MAP_UNMAPPED_OK = {};

function checkScreenMaps(results) {
  const missing = PARTS.filter(c => results[c].val('typeof SCREEN_TO_SUBCONTENT') !== 'object');
  ok('map', 'exactly the declared parts lack a config block',
    missing.join(',') === MAP_PENDING.join(','),
    'missing=[' + missing + '] declared=[' + MAP_PENDING + ']');
  for (const c of MAP_PENDING) {
    note('part ' + c + ' has no SCREEN_TO_SUBCONTENT yet — see MAP_PENDING');
  }

  for (const c of PARTS) {
    if (missing.includes(c)) continue;
    const r    = results[c];
    const text = fs.readFileSync(path.join(BASE, PART_DIR(c), MAIN_JS), 'utf8');
    const mdRel = 'metadata/' + UNIT + '-' + c + '.json';
    const md   = JSON.parse(fs.readFileSync(path.join(BASE, mdRel), 'utf8').replace(/^\uFEFF/, ''));

    const suffixOf = id => String(id).replace(/\/+$/, '').split('-').pop();
    const metaSuffixes = md.subContent.map(s => suffixOf(s.id));
    const metaById = {};
    md.subContent.forEach(s => { metaById[suffixOf(s.id)] = s; });

    const map  = JSON.parse(r.val('JSON.stringify(SCREEN_TO_SUBCONTENT)'));
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    const n    = EXPECTED_SCREENS[c];

    /* — shape (§6.2 trap 1) — */
    ok('map', c + ': SCREEN_TO_SUBCONTENT has exactly TOTAL_SCREENS keys',
      keys.length === n, keys.length + ' keys, TOTAL_SCREENS=' + n);
    ok('map', c + ': keys are contiguous 0..' + (n - 1),
      keys.every((k, i) => k === i), 'keys=' + keys.join(','));

    /* — a duplicate key is invisible at runtime; count the source lines — */
    const openIdx = text.indexOf('\nvar SCREEN_TO_SUBCONTENT = {\n');
    ok('map', c + ': the block is a literal object opened on its own line',
      openIdx !== -1, 'not found in ' + MAIN_JS);
    if (openIdx !== -1) {
      const closeIdx = text.indexOf('\n};', openIdx);
      ok('map', c + ': the block ends with a bare "};" (§6.2 trap 4)',
        closeIdx !== -1 && text.indexOf('var XAPI_COMP_SLUG', openIdx) > closeIdx,
        'close=' + closeIdx);
      const body = text.slice(openIdx, closeIdx);
      const srcKeys = body.match(/^\s*(\d+)\s*:/gm) || [];
      ok('map', c + ': no duplicate key silently shadowed in the source',
        srcKeys.length === keys.length,
        srcKeys.length + ' key lines vs ' + keys.length + ' runtime keys');
    }

    /* — values — */
    const used = [];
    let badVal = null;
    for (const k of keys) {
      const v = map[k];
      if (v === null) continue;
      if (!Array.isArray(v) || typeof v[0] !== 'string' || !/^\d{3}$/.test(v[0]) ||
          typeof v[1] !== 'number') { badVal = k + ' -> ' + JSON.stringify(v); break; }
      used.push(v[0]);
    }
    ok('map', c + ': every value is null or [3-digit string, page number]',
      badVal === null, String(badVal));
    const usedSet = [...new Set(used)];

    /* — two-way coverage against metadata/ (§6.2 trap 3) — */
    const notInMeta = usedSet.filter(s => !metaSuffixes.includes(s));
    ok('map', c + ': every mapped suffix exists in ' + mdRel,
      notInMeta.length === 0, 'orphans=' + notInMeta.join(','));
    const allowed  = MAP_UNMAPPED_OK[c] || [];
    const unmapped = metaSuffixes.filter(s => !usedSet.includes(s));
    ok('map', c + ': every catalogue item has a screen, or a documented reason',
      unmapped.every(s => allowed.includes(s)),
      'unmapped=' + unmapped.join(',') + ' allowed=' + allowed.join(','));
    ok('map', c + ': the documented-exception list is not stale',
      allowed.every(s => unmapped.includes(s)),
      'allowed but actually mapped=' + allowed.filter(s => !unmapped.includes(s)).join(','));

    /* — ids, byte-for-byte against the catalogue (§4.2, §6.1) — */
    const slug = r.val('XAPI_COMP_SLUG');
    const cid  = r.val('XAPI_COMP_ID');
    ok('map', c + ': XAPI_COMP_SLUG is the last segment of METADATA.id',
      slug === suffixOf0(md.id), slug + ' vs ' + suffixOf0(md.id));
    ok('map', c + ': XAPI_COMP_ID is prefix + slug + "/" and ends with "/"',
      cid === r.val('XAPI_ID_PREFIX') + slug + '/' && cid.endsWith('/'), cid);
    ok('map', c + ': XAPI_METADATA_FILE points at this component\'s file',
      r.val('XAPI_METADATA_FILE') === '../' + mdRel &&
        fs.existsSync(path.join(BASE, mdRel)), String(r.val('XAPI_METADATA_FILE')));
    /* metaById[s] is only guaranteed for suffixes the coverage check above
       accepted. Dereferencing it for an orphan threw an uncaught TypeError and
       killed the whole run, which reports nothing at all — found by the
       negative test, which is the only reason it was visible. Skip orphans
       here; they are already reported. */
    for (const s of usedSet) {
      if (!metaById[s]) continue;
      const built = r.val('xapiItemId(' + JSON.stringify(s) + ')');
      ok('map', c + '/' + s + ': xapiItemId() equals the catalogue id exactly',
        built === metaById[s].id, built + ' vs ' + metaById[s].id);
    }

    /* — XAPI_EVAL_ITEMS — */
    const ev = Object.keys(JSON.parse(r.val('JSON.stringify(XAPI_EVAL_ITEMS)')));
    ok('map', c + ': every XAPI_EVAL_ITEMS key is a mapped suffix',
      ev.every(s => usedSet.includes(s)),
      'stray=' + ev.filter(s => !usedSet.includes(s)).join(','));
    const qCount = s => ((metaById[s] || {}).questions || []).length;
    ok('map', c + ': every graded item actually declares a question',
      ev.every(s => qCount(s) > 0),
      'questionless=' + ev.filter(s => !qCount(s)).join(','));
    const ungraded = usedSet.filter(s => qCount(s) && !ev.includes(s));
    if (ungraded.length) {
      note('part ' + c + ': item(s) ' + ungraded.join(',') +
        ' have catalogue questions but are not in XAPI_EVAL_ITEMS (never emit answered)');
    }

    /* — the independent witness: the part's own question groupings — */
    for (const gname of ['PRACTICE_QUESTIONS', 'STANDARD_QUESTIONS']) {
      if (r.val('typeof ' + gname) !== 'object') continue;
      const groups = JSON.parse(r.val('JSON.stringify(' + gname + ')'));
      const seen = {};
      for (const g of groups) {
        const sufs = [...new Set(g.screens.map(s => (map[s] || [null])[0]))];
        ok('map', c + '/' + gname + ' q' + g.number + ': its screens map to one item',
          sufs.length === 1 && sufs[0] !== null && sufs[0] !== undefined,
          'screens=' + g.screens.join(',') + ' -> ' + sufs.join('|'));
        if (sufs.length === 1 && sufs[0]) {
          ok('map', c + '/' + gname + ' q' + g.number + ': that item is not shared with another question',
            !seen[sufs[0]], sufs[0] + ' also used by q' + seen[sufs[0]]);
          seen[sufs[0]] = g.number;
        }
      }
    }
  }
}

/* Last path segment of a component/unit id, slashes trimmed. Named apart from the
   local suffixOf above, which strips to the 3-digit ITEM suffix instead. */
function suffixOf0(id) { return String(id).replace(/\/+$/, '').split('/').pop(); }


/* ══════════════ 11. P2 call-site coverage (§6.3, §6.5) ══════════════
   A MISSING xapiAnswered call is the quietest failure in this whole layer.
   Nothing throws, the lomda behaves identically, the learner sees nothing, and
   the question simply never appears in the LRS - so it can only be caught by
   asking the question the other way round: for every graded catalogue
   question, is there a call site that reports it?

   The check is static, over the source text, because driving all 39 check
   functions would mean synthesising a valid answer for each - and a static
   scan is exactly what catches the case a runtime sweep would miss anyway,
   namely a site that exists but names the wrong item or question.

   Two call shapes are recognised:
     xapiAnswered('007', 'q3', …)          a literal question
     xapiAnswered('007', 'q' + (i + 1), …) a loop over one item's questions,
                                           which covers ALL of them
   The second is part 02's five-row screen. It is treated as a wildcard rather
   than evaluated, so this stays a text scan and never has to interpret code.

   The rule that gives it teeth is two-directional: an item in XAPI_EVAL_ITEMS
   must have EVERY one of its questions reported, and an item NOT in
   XAPI_EVAL_ITEMS must have NO answered call at all. That second half is what
   protects the two deliberate absences - part 01's item 001 (a motivational
   exploration with zero catalogue questions, whose s2qCheck must stay silent)
   and its item 007 (a worked example the learner is told not to solve) - from
   being 'completed' by someone tidying up. */
/* Catalogue questions that deliberately have NO answered call even though
   their ITEM is in XAPI_EVAL_ITEMS, with the reason. Asserted in BOTH
   directions, so an entry cannot be added to hide a real gap and cannot rot
   once the gap is closed.

   XAPI_EVAL_ITEMS marks an item that carries a code-graded question - not one
   whose every question is graded. 03/006 used to be the case that distinguished
   them: S11 is a graded table (006/q1) but S12 ('המליצו לעדי...') is an open
   reflection with no *Check and no correctness model at all, so there was
   nothing to report for 006/q2. The item still belongs in XAPI_EVAL_ITEMS
   because of S11.

   EMPTIED 2026-09-11. The producer removed 006/q2 from the catalogue - which is
   consistent with what it always was, an open reflection that no correctness
   model could grade - and metadata/ was re-synced FROM KATA, so the question no
   longer exists to be excepted. S12 still renders and still asks it; it simply
   never had an answered call, so nothing about the runtime changes.

   The "exists in metadata/" half of this assertion is what caught it. Do not
   re-add an entry here to silence a failure: if a question is in this list and
   not in metadata/, the list is stale, and if it is reported after all, the
   exception was wrong to begin with. */
const SITES_UNGRADED_OK = {};

/* Source text with comments removed, for the call-site scans below.

   NOT optional. Scanning the raw text counted COMMENTED-OUT calls as real:
   wrapping a component's only xapiCompleteComponent() in a block comment left
   the regex count unchanged and the gate green, and the same held for a
   disabled xapiAnswered - so the coverage check could have been satisfied by
   code that never runs. Found by the negative test. This project has hit the
   identical bug once before, counting @font-face inside a comment.

   String-aware, and regex-literal-aware via the usual heuristic: a '/' opens a
   regex only when the previous non-space character cannot end an expression.
   Newlines inside block comments are preserved so line numbers stay usable.

   The stripper cannot quietly eat real code without the coverage assertions
   below going red, which is what keeps it honest. */
function stripJsComments(src) {
  const PRE = '(,=:[!&|?{};+-*%~^<>';
  let out = '', i = 0, instr = null, prev = '';
  while (i < src.length) {
    const ch = src[i], nxt = src[i + 1];
    if (instr) {
      out += ch;
      if (ch === '\\') { out += (nxt === undefined ? '' : nxt); i += 2; continue; }
      if (ch === instr) instr = null;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { instr = ch; out += ch; prev = ch; i++; continue; }
    if (ch === '/' && nxt === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && nxt === '*') {
      const end = src.indexOf('*/', i + 2);
      const chunk = src.slice(i, end === -1 ? src.length : end + 2);
      out += chunk.replace(/[^\n]/g, ' ');
      i = (end === -1) ? src.length : end + 2;
      continue;
    }
    if (ch === '/' && (prev === '' || PRE.indexOf(prev) !== -1)) {
      out += ch; i++;
      let esc = false, cls = false;
      while (i < src.length) {
        const c = src[i];
        out += c;
        i++;
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '[') cls = true;
        else if (c === ']') cls = false;
        else if (c === '/' && !cls) break;
        else if (c === '\n') break;
      }
      prev = '/';
      continue;
    }
    out += ch;
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return out;
}

function checkCallSites(results) {  const ANSWERED = /xapiAnswered\(\s*'(\d{3})'\s*,\s*(?:'(q\d+)'|'q'\s*\+)/g;
  const HINT     = /xapiRequestedHint\(\s*'(\d{3})'\s*,\s*'(q\d+)'/g;
  let units = 0;

  for (const c of PARTS) {
    const r    = results[c];
    const text = stripJsComments(
      fs.readFileSync(path.join(BASE, PART_DIR(c), MAIN_JS), 'utf8'));
    const md   = JSON.parse(fs.readFileSync(
      path.join(BASE, 'metadata', UNIT + '-' + c + '.json'), 'utf8').replace(/^\uFEFF/, ''));

    /* questions each item declares, by suffix */
    const qs = {};
    for (const sc of md.subContent) {
      qs[sc.id.replace(/\/+$/, '').split('-').pop()] =
        (sc.questions || []).map(q => q.questionId.replace(/\/+$/, '').split('/').pop());
    }
    const ev = Object.keys(JSON.parse(r.val('JSON.stringify(XAPI_EVAL_ITEMS)')));

    /* covered[item] = Set of qKeys, or true for a whole-item loop */
    const covered = {};
    let m;
    ANSWERED.lastIndex = 0;
    while ((m = ANSWERED.exec(text)) !== null) {
      const item = m[1];
      if (m[2] === undefined) { covered[item] = true; continue; }
      if (covered[item] !== true) (covered[item] = covered[item] || new Set()).add(m[2]);
    }

    const allowed = SITES_UNGRADED_OK[c] || [];
    const skipped = [];
    for (const item of ev) {
      const want = (qs[item] || []).filter(q => !allowed.includes(item + '/' + q));
      (qs[item] || []).filter(q => allowed.includes(item + '/' + q))
        .forEach(q => skipped.push(item + '/' + q));
      const got = covered[item];
      ok('sites', c + '/' + item + ': every graded question has an answered call',
        got === true || (got && want.every(q => got.has(q))),
        'expected=' + want.join(',') + ' reported=' +
          (got === true ? '<all, loop>' : got ? [...got].join(',') : 'NONE'));
    }
    /* an allow-listed question that IS reported means the list is stale */
    ok('sites', c + ': the ungraded-question exception list is not stale',
      allowed.every(k => {
        const [it, q] = k.split('/');
        const got = covered[it];
        return got !== true && !(got && got.has(q));
      }),
      'listed but reported: ' + allowed.filter(k => {
        const [it, q] = k.split('/');
        const got = covered[it];
        return got === true || (got && got.has(q));
      }).join(','));
    ok('sites', c + ': every allow-listed question exists in metadata/',
      allowed.length === skipped.length,
      'listed=' + allowed.join(',') + ' matched=' + skipped.join(','));
    for (const item of Object.keys(covered)) {
      ok('sites', c + '/' + item + ': reported by an answered call, so it is a graded item',
        ev.includes(item), 'not in XAPI_EVAL_ITEMS');
      const got = covered[item] === true ? null : covered[item];
      if (got) {
        const stray = [...got].filter(q => !(qs[item] || []).includes(q));
        ok('sites', c + '/' + item + ': every reported qKey exists in metadata/',
          stray.length === 0, 'stray=' + stray.join(','));
      }
    }

    /* hints must point at a question that exists */
    HINT.lastIndex = 0;
    const badHints = [];
    while ((m = HINT.exec(text)) !== null) {
      if (!(qs[m[1]] || []).includes(m[2])) badHints.push(m[1] + '/' + m[2]);
    }
    ok('sites', c + ': every requested-hint call names a real catalogue question',
      badHints.length === 0, 'bad=' + badHints.join(','));

    /* every part ends its component through xapiEndComponent (report, then disable the
       button); nothing reports the unit — the platform owns routing since 2026-09-16 */
    const comps = (text.match(/xapiEndComponent\(/g) || []).length;
    ok('sites', c + ': ends its component via xapiEndComponent at least once (§6.5)', comps >= 1,
      comps + ' call(s)');
    ok('sites', c + ': no bare xapiCompleteComponent call is left in the part (the button must be disabled too)',
      !/xapiCompleteComponent\(/.test(text));
    units += (text.match(/xapiCompleteUnit\(/g) || []).length;
  }

  /* 2026-09-16: v2.5/v2.7 define object as item or component only, and the platform derives the
     unit outcome itself. The two terminals (06 passed, 07) report their component only. */
  ok('sites', 'no unit-level statement anywhere — xapiCompleteUnit is gone', units === 0,
    units + ' xapiCompleteUnit call(s)');
}
/* ══════════════ 11b. The platform owns routing (2026-09-16) ══════════════
   Kata launches each part on its own URL with its own ?registration and routes
   on our 'completed'. So: no unit-level statement anywhere; every
   location.href= / location.replace( in shipped code sits behind PartNav's or
   goBackToPreviousPart's `if (!DEV_NAV) return`; the loader's resume hop is
   gone; DEV_NAV needs ?dev=1 AND no ?registration; and in a production boot
   #s0-back keeps its .hidden class, PartNav.back() is a no-op and
   forwardOverride() is null. resume-flow.js drives the ?dev=1 twin. */
function checkPlatformRouting(results) {
  const shared = fs.readdirSync(path.join(BASE, 'unit-js')).filter(f => f.endsWith('.js')).sort();
  const files = [...shared.map(f => 'unit-js/' + f), ...PARTS.map(c => PART_DIR(c) + '/js/main.js')];
  for (const rel of files) {
    const code = stripJsComments(fs.readFileSync(path.join(BASE, rel), 'utf8'));
    ok('routing', rel + ': no unit-level statement (xapiCompleteUnit / XAPI_UNIT_ID as objectId)',
      !/xapiCompleteUnit\s*\(/.test(code) && !/objectId\s*:\s*window\.XAPI_UNIT_ID/.test(code));
    for (const m of code.matchAll(/location\.(href\s*=(?!=)|replace\s*\()/g)) {
      const before = code.slice(Math.max(0, m.index - 4000), m.index);
      /* the guard must sit inside the SAME function as the hop: no `function` keyword between */
      const at = before.search(/if \(!DEV_NAV\) return( false)?;(?![\s\S]*\n\s*function )/);
      ok('routing', rel + ': the hop at offset ' + m.index + ' is behind an if (!DEV_NAV) return in its own function',
        at !== -1, m[0]);
    }
  }
  const ident = fs.readFileSync(path.join(BASE, 'unit-js', '10-identity.js'), 'utf8');
  ok('routing', "10-identity.js: DEV_NAV needs ?dev=1 AND no ?registration",
    /get\('dev'\)\s*===\s*'1'\s*&&\s*!\w+\.has\('registration'\)/.test(ident));
  const loader = stripJsComments(fs.readFileSync(path.join(BASE, 'unit-js', '50-loader.js'), 'utf8'));
  ok('routing', '50-loader.js: the resume hop to _saved.part is gone',
    !/_saved\.part\s*!==\s*currentPartSlug\(\)/.test(loader) && !/location\.replace/.test(loader));
  const nav = stripJsComments(fs.readFileSync(path.join(BASE, 'unit-js', '08-partnav.js'), 'utf8'));
  ok('routing', '08-partnav.js: forward() and back() return unless DEV_NAV; forwardOverride() is null unless DEV_NAV; mountBack() shows only under DEV_NAV',
    /function forward\(part\)\s*\{\s*if \(!DEV_NAV\) return;/.test(nav) &&
    /function back\(\)\s*\{\s*if \(!DEV_NAV\) return;/.test(nav) &&
    /function forwardOverride\(\)\s*\{\s*return DEV_NAV \? forwardTo : null;/.test(nav) &&
    /toggle\('hidden', !\(DEV_NAV && canGoBack\(\)\)\)/.test(nav));
  const resume = stripJsComments(fs.readFileSync(path.join(BASE, 'unit-js', '40-resume.js'), 'utf8'));
  ok('routing', '40-resume.js: goBackToPreviousPart returns false unless DEV_NAV',
    /function goBackToPreviousPart\([^)]*\)\s*\{\s*if \(!DEV_NAV\) return false;/.test(resume));
  const p07 = stripJsComments(fs.readFileSync(path.join(BASE, PART_DIR('07'), 'js', 'main.js'), 'utf8'));
  ok('routing', '07: s3vFinish reports nothing; s3vEnd (the second #s3v-check click) ends the component',
    !/function s3vFinish\(\)[\s\S]{0,300}xapi(Complete|End)Component/.test(p07) &&
    /function s3vEnd\(\)[\s\S]{0,400}xapiEndComponent\(/.test(p07) &&
    /if \(s3vAnswered\) \{ s3vEnd\(\); return; \}/.test(p07));

  /* Production boots (the results[] parts carry no query string). */
  for (const c of PARTS) {
    const r = results[c];
    ok('routing', c + ': DEV_NAV is false in a production boot', r.val('DEV_NAV') === false, String(r.val('DEV_NAV')));
    ok('routing', c + ': xapiCompleteUnit no longer exists', r.val('typeof xapiCompleteUnit') === 'undefined');
    ok('routing', c + ': PartNav.forwardOverride() is null', r.val('PartNav.forwardOverride()') === null);
    if (c !== '01') {
      r.exec('goTo(0);');
      ok('routing', c + ': #s0-back keeps its .hidden class (display:none !important) after mountBack',
        r.val("document.getElementById('s0-back').classList.contains('hidden')") === true);
      r.exec('window.sessionStorage.setItem("methodica_math_percent_02_navTrail", JSON.stringify([{ part: "01", screen: 3 }])); PartNav.back();');
      ok('routing', c + ': PartNav.back() is a no-op — the trail is untouched and no return is queued',
        r.val('window.sessionStorage.getItem("methodica_math_percent_02_navTrail")') === JSON.stringify([{ part: '01', screen: 3 }]) &&
        r.val('window.sessionStorage.getItem("methodica_math_percent_02_navReturn")') === null);
      r.exec('window.sessionStorage.removeItem("methodica_math_percent_02_navTrail");');
    }
    /* the last screen carries the button xapiEndComponent will disable */
    r.exec('goTo(TOTAL_SCREENS - 1);');
    ok('routing', c + ': the last screen has a .btn-continue for xapiActiveContinueButton()',
      r.val('!!xapiActiveContinueButton()') === true, String(r.val('TOTAL_SCREENS - 1')));
    r.exec('goTo(0);');
  }

  /* The flag's two conditions, live, on part 03. */
  const flag = (search) => {
    const x = loadPart('03', { search });
    x.exec('window.sessionStorage.setItem("methodica_math_percent_02_navTrail", JSON.stringify([{ part: "02", screen: 7 }])); PartNav.mountBack("s0-back");');
    const res = { DEV_NAV: x.val('DEV_NAV'), backHidden: x.val("document.getElementById('s0-back').classList.contains('hidden')") };
    x.exec('window.sessionStorage.removeItem("methodica_math_percent_02_navTrail");');
    x.dom.window.close();
    return res;
  };
  let r = flag('');
  ok('devnav', 'no query: DEV_NAV false, back hidden even with a trail', r.DEV_NAV === false && r.backHidden === true, JSON.stringify(r));
  r = flag('?dev=1');
  ok('devnav', '?dev=1 alone: DEV_NAV true, back shown when the trail says so', r.DEV_NAV === true && r.backHidden === false, JSON.stringify(r));
  r = flag('?dev=1&registration=r1');
  ok('devnav', '?dev=1&registration: DEV_NAV false, back hidden — a launch URL never opens navigation',
    r.DEV_NAV === false && r.backHidden === true, JSON.stringify(r));
}

/* ══════════════ 12. The issue-report markup contract (§7.1, §7.6) ══════════════
   25-report.js and 25-report.css are copied byte-for-byte and take no per-part
   configuration, so EVERY way this feature can break is a markup or CSS fact.
   Each assertion below maps onto one of §7.1's nine constraints, and each one
   is a silent failure if broken: no error, no console message, just a dialog
   that never appears or a button that does nothing.

   Two are worth naming because they are the least obvious:

     * `.report-modal-overlay[hidden] { display: none; }` must exist. The base
       rule sets display:flex, which OVERRIDES the UA's [hidden]{display:none}
       - so without the explicit rule all three dialogs are permanently
       visible no matter what the JS does. §7.1 calls this the single most
       confusing way to get the feature wrong. It has to be checked as CSS
       TEXT: jsdom applies no external stylesheets, so nothing at runtime can
       see it.

     * exactly ONE .report-submit-btn inside #report-modal. reportCheckSubmit()
       enables/disables querySelector('#report-modal .report-submit-btn'), so a
       second element carrying that class silently steals the submit gate. */

/* ══════════════ 11c. One document per component (v5, 2026-09-16) ══════════════
   Kata's registration is per {learner, component} and the platform may clear one
   part's document on a re-take. The document is flat — `component` + `payload` —
   migrated from v4 in place, never applied when it names another part, and the
   character travels 01 → 02..07 through the same-browser mirror only.
   Groups: shape / isolation / retake / character. The store is keyed by
   registration + state id, exactly as two Kata launches would be. */
function checkPerComponentState() {
  const stores = {};
  const warns = [];
  const bootS = (c, search) => {
    const x = loadPart(c, { search });
    const w = x.dom.window;
    w.console.warn = (m) => warns.push(String(m));
    const reg = new URL(w.location.href).searchParams.get('registration') || '';
    const key = (id) => reg + '::' + id;
    w.loadState720 = function (id) { const k = key(id); return stores[k] ? JSON.parse(stores[k]) : null; };
    w.saveState720 = function (id, doc) { stores[key(id)] = JSON.stringify(doc); return true; };
    w.saveState720Debounced = w.saveState720;
    w.__stmts2 = [];
    w.sendStatement720 = function (v, t, res, o) { w.__stmts2.push({ v, t, res, o }); };
    const seed = (doc) => { stores[key(x.val('RESUME_STATE_ID'))] = JSON.stringify(doc); };
    const stored = () => { const s = stores[key(x.val('RESUME_STATE_ID'))]; return s ? JSON.parse(s) : null; };
    return { w, exec: x.exec, val: x.val, seed, stored, slug: PART_DIR(c), close: () => x.dom.window.close() };
  };
  const q = (r, extra) => '?slxapi=1&registration=' + r + (extra || '');
  const CKS = JSON.stringify('methodica_math_percent_02_selectedCharacter');

  // ── shape ──
  let b = bootS('01', q('r1'));
  ok('shape', 'emptyUnitState() has exactly the v5 fields',
    b.val('Object.keys(emptyUnitState()).sort().join()') === 'component,done,doneItems,payload,results,ui,v',
    String(b.val('Object.keys(emptyUnitState()).sort().join()')));
  ok('shape', 'a fresh document names this part', b.val('emptyUnitState().component') === b.slug);
  ok('shape', 'RESUME_STATE_ID carries the part slug',
    b.val('RESUME_STATE_ID') === 'execution-state::' + b.slug, String(b.val('RESUME_STATE_ID')));
  b.seed({ v: 4, part: 'x', parts: { [b.slug]: { currentScreen: 3 }, other: { currentScreen: 9 } }, prev: { a: 1 },
           done: { a: true }, doneItems: { b: true }, ui: { character: 'character-2' }, results: { k: 'pass' } });
  b.exec('readUnitState();');
  ok('shape', 'v4 → v5 migration keeps this part\'s slot as payload',
    b.val('_unitState.v') === 5 && b.val('_unitState.component') === b.slug && b.val('_unitState.payload.currentScreen') === 3,
    String(b.val('JSON.stringify(_unitState)')));
  ok('shape', 'v4 → v5 migration keeps the ledgers, the character and the results',
    b.val('_unitState.done.a') === true && b.val('_unitState.doneItems.b') === true &&
    b.val('_unitState.ui.character') === 'character-2' && b.val('_unitState.results.k') === 'pass');
  ok('shape', 'v4 → v5 migration drops part, prev and parts',
    b.val("'part' in _unitState") === false && b.val("'prev' in _unitState") === false && b.val("'parts' in _unitState") === false);
  b.seed({ v: 4, part: 'x', parts: { other: { currentScreen: 9 } } });
  b.exec('readUnitState();');
  ok('shape', 'a v4 document with no slot for this part migrates to payload:null',
    b.val('_unitState.payload') === null && b.val('_unitState.v') === 5);
  b.seed({ v: 3, parts: { [b.slug]: { currentScreen: 3 } } });
  b.exec('readUnitState();');
  ok('shape', 'any other version is discarded', b.val('_unitState.payload') === null && b.val('_unitState.v') === 5);
  warns.length = 0;
  b.seed({ v: 5, component: 'other-slug', payload: { currentScreen: 7 }, done: { z: true } });
  b.exec('readUnitState();');
  ok('shape', 'a document that names another part is discarded…',
    b.val('_unitState.payload') === null && b.val('_unitState.component') === b.slug && b.val('Object.keys(_unitState.done).length') === 0);
  ok('shape', '…with a console.warn naming both parts',
    warns.some(m => /\[resume\] document belongs to "other-slug", not "/.test(m)), JSON.stringify(warns));
  b.exec('_resumeReady = true; readUnitState(); goTo(1);');
  ok('shape', 'captureUnitState().payload is capturePartPayload()',
    b.val('JSON.stringify(captureUnitState().payload) === JSON.stringify(capturePartPayload())') === true);
  b.close();

  // ── isolation ──
  const A = bootS('01', q('r1')), B = bootS('03', q('r2'));
  A.exec('_resumeReady = true; readUnitState(); goTo(2); flushResumeSave(); markSent("done", currentPartSlug());');
  B.exec('readUnitState();');
  ok('isolation', 'part B under its own registration sees an empty document',
    B.val('_unitState.payload') === null && B.val('Object.keys(_unitState.done).length') === 0);
  ok('isolation', 'part A\'s stored document never mentions part B',
    JSON.stringify(A.stored()).indexOf(B.slug) === -1 && A.stored().component === A.slug && A.stored().done[A.slug] === true,
    JSON.stringify(A.stored()));
  ok('isolation', 'only registrations that wrote have a document',
    Object.keys(stores).filter(k => k.indexOf('r2::') === 0).length === 0, Object.keys(stores).join());
  warns.length = 0;
  B.seed(A.stored());
  B.exec('readUnitState();');
  ok('isolation', 'another part\'s document under my registration is discarded, not applied',
    B.val('_unitState.payload') === null && warns.some(m => /document belongs to "/.test(m)));
  A.close(); B.close();

  // ── retake: Kata cleared the document; the same-browser mirrors still hold the last attempt ──
  b = bootS('03', q('r5'));
  b.exec("localStorage.setItem('03-basic', 'pass'); localStorage.setItem('03-standard', 'pass'); localStorage.setItem(" + CKS + ", 'character-2');");
  b.exec('readUnitState(); window.__payloadAtBoot = _unitState.payload; window.__changed = adoptUnitCharacter(_unitState);');
  ok('retake', 'an absent document leaves every verdict null — the mirrors are not consulted',
    b.val("getUnitResult('03-basic')") === null && b.val("getUnitResult('03-standard')") === null &&
    b.val("localStorage.getItem('03-basic')") === 'pass');
  ok('retake', 'the basic-practice gate is closed again', b.val('basicPracticePassed()') === false, String(b.val('basicPracticePassed()')));
  ok('retake', 'the ledger is empty again, so the re-take will report completed',
    b.val("alreadySent('done', currentPartSlug())") === false);
  b.exec("_resumeReady = true; sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', null);");
  ok('retake', 'the re-take\'s completed goes out', b.w.__stmts2.filter(s => s.v === 'completed').length === 1);
  ok('retake', 'nothing is restored', b.val('window.__payloadAtBoot === null') === true);
  ok('retake', 'the character IS adopted from the mirror (decision 2026-09-16)',
    b.val('_unitState.ui.character') === 'character-2' && b.val('getCharacter()') === 'character-2' && b.w.__changed === true);
  b.close();

  // ── character: four steps, both stores ──
  b = bootS('01', q('r1'));
  b.exec("_resumeReady = true; readUnitState(); setUnitCharacter('character-2');");
  ok('character', '01: the choice lands in the mirror AND in this part\'s document',
    b.val('localStorage.getItem(' + CKS + ')') === 'character-2' && b.val('_unitState.ui.character') === 'character-2' &&
    b.stored() && b.stored().ui.character === 'character-2', JSON.stringify(b.stored()));
  b.close();
  b = bootS('03', q('r3'));
  b.seed({ v: 5, component: b.slug, ui: { character: 'character-1' } });
  b.exec('localStorage.setItem(' + CKS + ", 'character-2'); readUnitState(); adoptUnitCharacter(_unitState);");
  ok('character', '03 step 1: the document wins over the mirror, and the mirror follows',
    b.val('getCharacter()') === 'character-1' && b.val('localStorage.getItem(' + CKS + ')') === 'character-1');
  b.close();
  b = bootS('03', q('r3b'));
  b.exec('localStorage.setItem(' + CKS + ", 'character-2'); readUnitState(); window.__changed = adoptUnitCharacter(_unitState);");
  ok('character', '03 steps 2+3: an empty document adopts the mirror into the document and getCharacter()',
    b.val('_unitState.ui.character') === 'character-2' && b.val('getUnitCharacter()') === 'character-2' &&
    b.val('getCharacter()') === 'character-2' && b.w.__changed === true);
  ok('character', '03 step 3: the mirror is NOT deleted (the old applyUnitProfile did)',
    b.val('localStorage.getItem(' + CKS + ')') === 'character-2');
  ok('character', '03 step 3: nothing is written before phase B…', b.stored() === null);
  b.exec('_resumeReady = true; drainPendingUnitState();');
  ok('character', '…and phase B persists the adopted character into this part\'s document',
    b.stored() && b.stored().ui.character === 'character-2' && b.stored().component === b.slug, JSON.stringify(b.stored()));
  b.close();
  b = bootS('03', q('r3c'));
  b.exec("readUnitState(); adoptUnitCharacter(_unitState);");
  ok('character', '03 step 4: no document, no mirror → getCharacter() is the default',
    b.val('getUnitCharacter()') === null && b.val('getCharacter()') === b.val('DEFAULT_CHARACTER') && b.val('localStorage.getItem(' + CKS + ')') === null);
  b.close();
  b = bootS('03', q('r3d', '&resetState'));
  ok('character', '?resetState: the hatch ran at boot and cleared the mirror',
    b.val('_resetRequested') === true && b.val('localStorage.getItem(' + CKS + ')') === null);
  b.exec('localStorage.setItem(' + CKS + ", 'character-2'); readUnitState(); adoptUnitCharacter(_unitState);");
  ok('character', '?resetState: a mirror that reappears is NOT adopted — a reset adopts nothing',
    b.val('getUnitCharacter()') === null);
  b.close();
}

/* ══════════════ 11d. Source scan for the v5 shape ══════════════ */
function checkStateShapeSource() {
  const shared = fs.readdirSync(path.join(BASE, 'unit-js')).filter(f => f.endsWith('.js')).sort();
  const files = [...shared.map(f => 'unit-js/' + f), ...PARTS.map(c => PART_DIR(c) + '/js/main.js')];
  for (const rel of files) {
    const src = stripJsComments(fs.readFileSync(path.join(BASE, rel), 'utf8'));
    ok('shape', rel + ': no landing pointer, no prev map, no parts map',
      !/\b(doc|_unitState|_saved|st|old)\.prev\b/.test(src) && !/(?<!old)\.parts\[/.test(src) && !/\b(doc|_unitState|_saved|st)\.part\b/.test(src));
    ok('shape', rel + ': applyUnitProfile is gone', !/applyUnitProfile/.test(src));
  }
  const rs = stripJsComments(fs.readFileSync(path.join(BASE, 'unit-js/40-resume.js'), 'utf8'));
  ok('shape', '40-resume.js: RESUME_STATE_VERSION is 5', /var RESUME_STATE_VERSION = 5;/.test(rs));
  ok('shape', '40-resume.js: RESUME_STATE_ID is per part',
    /var RESUME_STATE_ID\s*=\s*'execution-state::' \+ currentPartSlug\(\);/.test(rs));
  ok('shape', '40-resume.js: readUnitState migrates, then refuses another part\'s document with a warning',
    /doc = migrateState\(doc\);[\s\S]{0,200}doc\.component !== currentPartSlug\(\)[\s\S]{0,200}console\.warn\(/.test(rs));
  const adopt = /function adoptUnitCharacter\(doc\)\s*\{[\s\S]*?\n\}/.exec(rs);
  ok('shape', '40-resume.js: adoptUnitCharacter never deletes the mirror',
    !!adopt && !/_lsDel/.test(adopt[0]) && /_lsGet\(UI_CHARACTER_KEY\)/.test(adopt[0]) && /_pendingProfile = \{ character: c \}/.test(adopt[0]));
  ok('shape', '40-resume.js: RESULT_KEYS holds this unit\'s keys, not the science unit\'s',
    !/lomda_moed/.test(rs) && /'02-practice'/.test(rs) && /'06-climax'/.test(rs));
  ok('shape', '40-resume.js: the reset hatch clears PartNav\'s trail', /PartNav\.clearTrail\(\)/.test(rs));
  const nav = stripJsComments(fs.readFileSync(path.join(BASE, 'unit-js/08-partnav.js'), 'utf8'));
  ok('shape', '08-partnav.js: clearTrail is exported', /clearTrail: clearTrail/.test(nav) && /function clearTrail\(\)/.test(nav));
  const ld = stripJsComments(fs.readFileSync(path.join(BASE, 'unit-js/50-loader.js'), 'utf8'));
  ok('shape', '50-loader.js: phase A restores payload and adopts the character',
    /_payload = _saved\.payload;/.test(ld) && /adoptUnitCharacter\(_saved\)/.test(ld));
}

function checkReportMarkup(results) {
  const DIALOGS = ['report-modal', 'report-thanks-modal', 'report-confirm-modal'];
  const IDS = DIALOGS.concat(['report-type-wrapper', 'report-type', 'report-type-error',
                              'report-text', 'report-text-error', 'report-char-count']);

  /* the CSS rule that makes `hidden` mean anything at all - checked once */
  const css = fs.readFileSync(path.join(BASE, 'unit-css', '25-report.css'), 'utf8');
  ok('report', 'unit-css/25-report.css hides .report-modal-overlay[hidden]',
    /\.report-modal-overlay\[hidden\]\s*\{[^}]*display:\s*none/.test(css),
    'the base rule is display:flex, which overrides the UA [hidden] rule');

  for (const c of PARTS) {
    const r = results[c];
    const q = expr => r.val(expr);

    for (const id of IDS) {
      ok('report', c + ': #' + id + ' exists exactly once',
        q('document.querySelectorAll("#' + id + '").length') === 1,
        String(q('document.querySelectorAll("#' + id + '").length')));
    }

    for (const id of DIALOGS) {
      /* constraint 1: the whole open/close protocol is setAttribute('hidden')
         / removeAttribute('hidden'), so a dialog without it in source is
         visible from load */
      ok('report', c + ': #' + id + ' starts hidden in the markup',
        q('document.getElementById("' + id + '").hasAttribute("hidden")') === true,
        String(q('document.getElementById("' + id + '").outerHTML.slice(0, 80)')));
      ok('report', c + ': #' + id + ' is inside #app',
        q('document.querySelectorAll("#app #' + id + '").length') === 1,
        'the overlay is position:absolute inset:0 and #app is its positioned ancestor');
      ok('report', c + ': #' + id + ' is outside every .screen',
        q('document.querySelectorAll(".screen #' + id + '").length') === 0,
        '.screen is display:none unless .active');
    }

    /* the custom select */
    ok('report', c + ': exactly 3 .report-select-option',
      q('document.querySelectorAll("#report-modal .report-select-option").length') === 3,
      String(q('document.querySelectorAll("#report-modal .report-select-option").length')));
    ok('report', c + ': the three data-values are the REPORT_TYPE_LABELS keys',
      q('JSON.stringify([...document.querySelectorAll("#report-modal .report-select-option")]' +
        '.map(function (o) { return o.dataset.value; }))') ===
        '["technical","unclear","other"]',
      String(q('JSON.stringify([...document.querySelectorAll("#report-modal .report-select-option")]' +
        '.map(function (o) { return o.dataset.value; }))')));
    for (const cls of ['report-select-btn', 'report-select-value', 'report-select-list']) {
      ok('report', c + ': .' + cls + ' is inside #report-type-wrapper',
        q('!!document.querySelector("#report-type-wrapper .' + cls + '")') === true,
        'found by wrapper.querySelector()');
    }

    /* the submit gate */
    ok('report', c + ': exactly one .report-submit-btn inside #report-modal',
      q('document.querySelectorAll("#report-modal .report-submit-btn").length') === 1,
      String(q('document.querySelectorAll("#report-modal .report-submit-btn").length')));
    ok('report', c + ': #report-modal has a .report-cancel-btn',
      q('!!document.querySelector("#report-modal .report-cancel-btn")') === true, '');
    ok('report', c + ': #report-thanks-modal has a .report-submit-btn (the focus target)',
      q('!!document.querySelector("#report-thanks-modal .report-submit-btn")') === true, '');

    /* constraint 3: the JS finds the required star via the FIRST .report-field */
    ok('report', c + ': the problem-type field is the FIRST .report-field',
      q('!!document.querySelector("#report-modal .report-field").querySelector("#report-type-wrapper")')
        === true, 'querySelector("#report-modal .report-field") must be the type field');

    /* the stylesheet link, after the part's own css so a specificity tie
       falls to the shared file (§7.1 constraint 9) */
    const html = fs.readFileSync(path.join(BASE, PART_DIR(c), 'index.html'), 'utf8');
    const iReport = html.indexOf('unit-css/25-report.css');
    ok('report', c + ': links unit-css/25-report.css', iReport !== -1, '');
    ok('report', c + ': 25-report.css is linked AFTER ' + STYLE_CSS,
      iReport > html.indexOf(STYLE_CSS) && html.indexOf(STYLE_CSS) !== -1,
      'style at ' + html.indexOf(STYLE_CSS) + ', report at ' + iReport);

    /* the flag button exists and is wired by delegation, so the count is free
       to vary per part - percent-02 uses one global instance per part, the
       reference unit mixes one-global and one-per-screen (§7.4) */
    const flags = q('document.querySelectorAll(".flag-btn").length');
    ok('report', c + ': has at least one .flag-btn', flags >= 1, String(flags));
    ok('report', c + ': every .flag-btn carries the inner .flag-btn-label used by delegation',
      q('document.querySelectorAll(".flag-btn .flag-btn-label").length') === flags,
      flags + ' buttons, ' +
        q('document.querySelectorAll(".flag-btn .flag-btn-label").length') + ' labels');
  }
}

/* ══════════════ 13. The boot cover (§8.11) ══════════════
   The cover is the one addition in this whole project that can BRICK a unit:
   an opaque div over the canvas with no way out. So it is asserted from three
   directions.

   1. It must be a SIBLING of #app and precede it. #app is moved and scaled by
      scaleApp(), and a child would inherit that transform — the cover would be
      scaled with the canvas instead of covering it.

   2. It must be styled INLINE and carry a dependency-free failsafe in the
      markup. Both halves are about not trusting a file: a stale CSS cache
      would leave a stylesheet-styled cover unstyled and useless, and a
      40-resume.js or 50-loader.js that fails to load must not be able to
      strand a learner behind it. The failsafe is plain markup and cannot.

   3. ⚠️ It must actually be GONE after a load. This is the assertion that
      would have caught the real gap: 50-loader.js drops the cover from all
      seven of §8.11's exit paths, but every one of them sits inside the
      metadata-ready callback or behind a gate percent-02 no longer trips — so
      with RESUME_ENABLED false NOTHING dropped it synchronously, and every
      learner on every part would have paid the failsafe's 800 ms of white
      screen. Resume off means there is definitionally nothing to restore, so
      the loader now drops it immediately in that case. */
function checkBootCover(results) {
  for (const c of PARTS) {
    const r = results[c];
    const html = fs.readFileSync(path.join(BASE, PART_DIR(c), 'index.html'), 'utf8');

    const iCover = html.indexOf('id="boot-cover"');
    const iApp = html.indexOf('<div id="app">');
    ok('cover', c + ': has a #boot-cover in the markup', iCover !== -1, '');
    ok('cover', c + ': the cover precedes #app', iCover !== -1 && iCover < iApp,
      'cover at ' + iCover + ', #app at ' + iApp);
    ok('cover', c + ': exactly one cover',
      (html.match(/id="boot-cover"/g) || []).length === 1,
      String((html.match(/id="boot-cover"/g) || []).length));

    /* styled inline, so a stale CSS cache cannot render it useless */
    const tag = (html.match(/<div id="boot-cover"[^>]*>/) || [''])[0];
    for (const decl of ['position:fixed', 'inset:0', 'z-index', 'background']) {
      ok('cover', c + ': the cover sets ' + decl + ' inline', tag.indexOf(decl) !== -1, tag);
    }

    /* the failsafe: plain markup, no dependency on any JS file */
    ok('cover', c + ': carries the dependency-free failsafe',
      html.indexOf('setTimeout(tick, 800)') !== -1, '');
    ok('cover', c + ': the failsafe waits for a restore in flight, with a hard ceiling',
      html.indexOf('__resumeInFlight') !== -1 && html.indexOf('6000') !== -1, '');
    ok('cover', c + ': the failsafe is inline script, not a src=',
      /<script>\s*\(function \(\) \{[\s\S]*boot-cover/.test(html), '');

    /* — and the one that matters: the cover is never STRANDED —
       This assertion has two shapes because the contract genuinely differs,
       and conflating them is how it would go quiet:

         resume OFF — there is nothing to restore, by definition, so the cover
           has no job and must be gone at the end of the synchronous load.
           Nothing else drops it synchronously on that path, so without it
           EVERY learner eats the 800 ms failsafe.

         resume ON — the cover is HELD on purpose, from before the CDN loads,
           because stage A runs after two serial CDN scripts and on a cold
           cache that is well past 800 ms; revealing screen 0 there brings back
           the exact flash the cover exists to prevent. So "still present" is
           correct here, and what must be true instead is that it is present
           BECAUSE __resumeInFlight is set. A cover present with the flag clear
           is a stranded cover, and the markup failsafe would drop it late.

       jsdom cannot see the drop itself under resume ON: every remaining drop
       path is inside the CDN scripts' callback, and jsdom does not fetch
       https:// script tags. That is what checkLoaderCoverExits() below is
       for - it holds those paths statically instead of pretending. */
    const coverGone = r.val('!!document.getElementById("boot-cover")') === false;
    if (r.val('RESUME_ENABLED') === true) {
      ok('cover', c + ': the cover is held deliberately, not stranded',
        !coverGone && r.val('window.__resumeInFlight') === true,
        coverGone ? 'dropped before the restore could run — screen 0 will flash'
                  : 'present with __resumeInFlight clear — the failsafe holds it late');
    } else {
      ok('cover', c + ': the cover is REMOVED by the time the load finishes',
        coverGone,
        'still present; every learner would wait for the 800ms failsafe');
    }

    /* dropBootCover() must actually REMOVE the node and clear the flag. Note
       what is deliberately NOT asserted: that calling it twice does not throw.
       Its whole body sits inside try/catch, so that can never fail however it
       is broken - an assertion that cannot fail is worse than none, because it
       reads as coverage. These two can fail. */
    /* Clear FIRST, then plant exactly one. Appending to a DOM that still holds
       the real cover leaves two nodes with the same id, dropBootCover removes
       one, getElementById finds the other, and the assertion fails for a
       reason that has nothing to do with dropBootCover — which is exactly what
       happened when RESUME_ENABLED flipped and the cover stopped being gone by
       this point. An assertion whose result depends on an earlier one's side
       effects reports the wrong thing. */
    ok('cover', c + ': dropBootCover() removes a cover that is present',
      r.val('(function(){' +
            ' document.querySelectorAll("#boot-cover").forEach(function (n) { n.remove(); });' +
            ' var d = document.createElement("div"); d.id = "boot-cover";' +
            ' document.body.appendChild(d);' +
            ' if (!document.getElementById("boot-cover")) return "setup failed";' +
            ' dropBootCover();' +
            ' return !!document.getElementById("boot-cover"); })()') === false, '');
    ok('cover', c + ': dropBootCover() clears __resumeInFlight',
      r.val('(function(){ window.__resumeInFlight = true; dropBootCover();' +
            ' return window.__resumeInFlight; })()') === false,
      'the markup failsafe waits on this flag, so a stuck true holds the cover 6s');
  }

  /* The cover lives OUTSIDE #app, which is also why none of the 66 golden
     digests moved when it was added — they hash app.innerHTML. Asserted so
     that a future move INTO #app is caught here and not by a puzzling
     66-screen digest diff. */
  for (const c of PARTS) {
    ok('cover', c + ': the cover is not inside #app',
      results[c].val('document.querySelectorAll("#app #boot-cover").length') === 0,
      'a child of #app would inherit scaleApp()\'s transform');
  }
}

/* ══════════════ Main ══════════════ */
/* Exported so _test/statement-flow.js can reuse loadPart() instead of keeping
   its own copy of ~60 lines of jsdom setup - two loaders would drift, and the
   setup is where the fidelity lives (real script tags, the HTMLMediaElement
   contract, the observer stubs). main() runs only when this file IS the entry
   point, so requiring it costs nothing. */
/* ══════════════ 14. §8.3 — flush before return ══════════════
   THE invariant: an interaction that commits an answer must persist it
   SYNCHRONOUSLY, and no `return` may sit between the commitment and the flush.

   Static, because the failure is invisible at runtime unless the tab happens to
   die at the wrong moment. The reference unit shipped it for MONTHS with a
   source that read correctly: 13 of its 25 committing functions ended their
   correct-answer branch in `return;` before the tail flush, so a WRONG answer
   persisted and a CORRECT one did not. The split fell along authoring style —
   choice questions wrote `if (isCorrect) { … return; }`, table/dropdown ones
   wrote if/else-if/else with a common tail — so no single branch read as wrong.

   percent-02 does NOT have that asymmetry: all 80 of its answer-committing
   functions fall through to a common tail. This check exists to keep it that
   way, and to hold the three things that took real work to get right:

   1. THE SITE IS THE FUNCTION THE CLICK ENTERS, not the one that commits.
      Part 01's s2qCheck commits nothing itself — its screen belongs to item
      001, which declares zero questions, so it deliberately emits no
      xapiAnswered — while s2qFinish does. A rule keyed on "the committing
      function" therefore picks s2qFinish, which the RETRY branch never
      reaches, and a retry followed by a killed tab loses sNAttempts and
      sNLastWrong. Entry points are read off the real wiring (inline on* in
      index.html, addEventListener in main.js), never inferred by walking up
      the call graph — that would happily nominate resetScreenState, a restore
      path that must never write.

   2. ONE FLUSH PER INTERACTION. persistUnitState() fires a BLOCKING
      synchronous PUT, so a second call on the same click costs another round
      trip (§8.3). sNCheck→sNFinish pairs carry the call in the Check half
      only, and this asserts no site is reachable from another.

   3. setUnitResult / markSent ARE ALREADY SYNCHRONOUS. Both call
      persistUnitState themselves, so the three advanceScreen() functions that
      record a gate verdict need no flush — adding one there would be exactly
      the double PUT of point 2. That is why COMMIT below is answer commits
      only.

   §8.3 also says how to find the functions: brace-match every `function NAME(`
   rather than grepping for `*Check`. An audit keyed on that convention missed
   four questions served by a factory closure named plain `check`. And the
   brace matcher must skip nested function bodies: 07/s3vCheck's
   `S3V_KEYS.map(function (k) { return … })` sits inside the xapiAnswered
   ARGUMENTS, and counting that `return` reported 10 false violations. */

/* Answer commits only — see point 3 above. */
const FLUSH_COMMIT = /\b(s[0-9a-zA-Z]*(?:Done|Answered)\s*=\s*true|xapiAnswered\s*\()/;
const FLUSH_CALL   = /\bflushResumeSave\s*\(/;

/* Restore/repaint paths. A flush inside one of these would write during a
   replay; flushResumeSave() self-guards on _restoring, but a flush planted
   here is a design error whether or not the guard catches it. */
const FLUSH_RESTORE = ['resetScreenState', 'restoreScreenUI', 'applyResumeDom',
                       'applyResumeVars', 'capturePartPayload', 'repaintScreen'];

/* A canary, in the spirit of EXPECTED_SCREENS: the sites are computed, not
   hardcoded, but a silent change in how many there are should fail loudly.
   04 is legitimately 0 — it is an open class task with no correctness model
   and no answer commitment anywhere in it. */
const EXPECTED_FLUSH_SITES = { '01': 12, '02': 7, '03': 12, '04': 0,
                               '05': 5, '06': 4, '07': 2 };

/* i points at '{'; returns the index of its matching '}', or -1. */
function flushMatchBrace(src, i) {
  let depth = 0, instr = null;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (instr) {
      if (ch === '\\') { j++; continue; }
      if (ch === instr) instr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { instr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return j; }
  }
  return -1;
}

/* true at every offset inside a NESTED function body (function… or `=> {`). */
function flushNestedMask(body) {
  const mask = new Uint8Array(body.length);
  const paint = (i) => {
    const j = flushMatchBrace(body, i);
    if (j === -1) return;
    mask.fill(1, i, j + 1);
  };
  let m;
  const fnRe = /\bfunction\b/g;
  while ((m = fnRe.exec(body)) !== null) {
    const i = body.indexOf('{', m.index + 8);
    if (i !== -1) paint(i);
  }
  const arRe = /=>\s*\{/g;
  while ((m = arRe.exec(body)) !== null) paint(body.indexOf('{', m.index));
  return mask;
}

/* Block depth of `at` relative to the function body, ignoring nested
   functions. 1 means "a direct statement of the body", i.e. it runs on every
   branch — which is the whole point of putting the flush at the tail. */
function flushBlockDepth(body, at, mask) {
  let depth = 0, instr = null;
  for (let j = 0; j < at; j++) {
    const ch = body[j];
    if (instr) {
      if (ch === '\\') { j++; continue; }
      if (ch === instr) instr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { instr = ch; continue; }
    if (mask[j] && j > 0) continue;
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return depth;
}

function flushFunctions(src) {
  const out = [];
  const re = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const i = src.indexOf('{', m.index);
    if (i === -1) continue;
    const j = flushMatchBrace(src, i);
    if (j === -1) continue;
    out.push({ name: m[1], body: src.slice(i, j + 1) });
  }
  return out;
}

function checkFlushBeforeReturn() {
  for (const c of PARTS) {
    const src  = stripJsComments(
      fs.readFileSync(path.join(BASE, PART_DIR(c), MAIN_JS), 'utf8'));
    const html = fs.readFileSync(
      path.join(BASE, PART_DIR(c), 'index.html'), 'utf8');

    const fns   = flushFunctions(src);
    const byName = new Map(fns.map(f => [f.name, f]));
    const names = new Set(byName.keys());

    /* call graph over the part's own top-level functions */
    const calls = new Map();
    for (const f of fns) {
      const s = new Set();
      for (const n of names) {
        if (n !== f.name && new RegExp('\\b' + n + '\\s*\\(').test(f.body)) s.add(n);
      }
      calls.set(f.name, s);
    }
    const reachable = (start) => {
      const out = new Set(), stack = [start];
      while (stack.length) {
        for (const d of calls.get(stack.pop()) || []) {
          if (!out.has(d)) { out.add(d); stack.push(d); }
        }
      }
      return out;
    };

    const commits = new Set(fns.filter(f => FLUSH_COMMIT.test(f.body)).map(f => f.name));

    /* entry points: how this unit actually wires a click */
    const entries = new Set();
    let m;
    /* The attribute has to START at whitespace. `\bon\w+=` also matches
       `data-was-onclick=` — a word boundary sits after the hyphen — so a
       renamed-out attribute would still read as live wiring. */
    const onRe = /(?:^|\s)on\w+\s*=\s*"([^"]*)"/g;
    while ((m = onRe.exec(html)) !== null) {
      const cRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
      let cm;
      while ((cm = cRe.exec(m[1])) !== null) if (names.has(cm[1])) entries.add(cm[1]);
    }
    const alRe = /addEventListener\s*\(\s*[^,]+,\s*([A-Za-z_$][\w$]*)\s*[,)]/g;
    while ((m = alRe.exec(src)) !== null) if (names.has(m[1])) entries.add(m[1]);

    const sites = [...entries].filter(e =>
      !FLUSH_RESTORE.includes(e) &&
      (commits.has(e) || [...reachable(e)].some(n => commits.has(n)))).sort();

    ok('flush', c + ': the flush-site count is what it was',
      sites.length === EXPECTED_FLUSH_SITES[c],
      sites.length + ' sites, expected ' + EXPECTED_FLUSH_SITES[c] +
      ' — ' + sites.join(', '));

    /* part 04 is the documented zero: no correctness model, no commitment */
    if (EXPECTED_FLUSH_SITES[c] === 0) {
      ok('flush', c + ': commits no answer, so carries no flush',
        commits.size === 0 && !FLUSH_CALL.test(src),
        'commits: ' + [...commits].join(', '));
      continue;
    }

    const noFlush = [], midReturn = [], notTail = [];
    for (const name of sites) {
      const body = byName.get(name).body;
      const mask = flushNestedMask(body);

      /* own-scope flush only: one inside a callback would not run on the click */
      let fa = -1;
      const fRe = /\bflushResumeSave\s*\(/g;
      let fm;
      while ((fm = fRe.exec(body)) !== null) {
        if (!mask[fm.index]) { fa = fm.index; break; }
      }
      if (fa === -1) { noFlush.push(name); continue; }

      /* depth 1 = a direct statement of the body, so every branch reaches it */
      if (flushBlockDepth(body, fa, mask) !== 1) notTail.push(name);

      /* Where the commitment happens IN THIS FUNCTION. Two cases, and missing
         the second one made this check fail its own four sites: a site need
         not commit itself. s15Select commits nothing — s15Finish does — so
         anchoring on FLUSH_COMMIT alone leaves at=0, and then the opening
         guard `if (s15Answered) return;` reads as a post-commitment return.
         The anchor is therefore the earlier of the first own commitment and
         the first call to a callee that commits. */
      let at = Infinity;
      const cm = body.match(FLUSH_COMMIT);
      if (cm) at = body.indexOf(cm[0]) + cm[0].length;
      const reach = reachable(name);
      for (const callee of reach) {
        if (!commits.has(callee)) continue;
        const cRe2 = new RegExp('\\b' + callee + '\\s*\\(', 'g');
        let c2;
        while ((c2 = cRe2.exec(body)) !== null) {
          if (!mask[c2.index]) { at = Math.min(at, c2.index); break; }
        }
      }
      if (!isFinite(at)) at = 0;
      const rRe = /\breturn\b/g;
      let rm;
      while ((rm = rRe.exec(body)) !== null) {
        if (rm.index >= at && rm.index < fa && !mask[rm.index]) {
          midReturn.push(name);
          break;
        }
      }
    }

    ok('flush', c + ': every interaction that commits an answer flushes',
      noFlush.length === 0, 'missing: ' + noFlush.join(', '));
    ok('flush', c + ': no `return` sits between a commitment and its flush',
      midReturn.length === 0, 'offenders: ' + midReturn.join(', '));
    ok('flush', c + ': the flush runs on every branch, not inside one',
      notTail.length === 0, 'nested in a block: ' + notTail.join(', '));

    /* one blocking PUT per click: no site may be reachable from another */
    const nested = [];
    for (const a of sites) {
      for (const b of sites) if (a !== b && reachable(a).has(b)) nested.push(b + ' via ' + a);
    }
    ok('flush', c + ': one flush per interaction, never two',
      nested.length === 0, 'nested sites: ' + nested.join('; '));

    /* The flush set must be EXACTLY the site set. The nesting check above
       compares sites against each other, so it cannot see a flush added to a
       function that is not an entry point at all — and s2qFinish is precisely
       that: not wired to any click, reached only from s2qCheck, so a flush
       there is a second blocking PUT on the same interaction that the nesting
       check reports as clean. Found by mutation, not by reading. */
    const flushers = fns.filter(f => {
      const mk = flushNestedMask(f.body);
      const fr = /\bflushResumeSave\s*\(/g;
      let fm2;
      while ((fm2 = fr.exec(f.body)) !== null) if (!mk[fm2.index]) return true;
      return false;
    }).map(f => f.name).sort();
    const extra = flushers.filter(n => !sites.includes(n));
    ok('flush', c + ': only the interaction entry points flush',
      extra.length === 0, 'unexpected flush in: ' + extra.join(', '));

    /* nothing that commits is left out of a site's reach */
    const covered = new Set();
    for (const s of sites) { covered.add(s); for (const n of reachable(s)) covered.add(n); }
    const orphans = [...commits].filter(n => !covered.has(n));
    ok('flush', c + ': no answer commitment sits outside a flush site',
      orphans.length === 0, 'unreachable from any site: ' + orphans.join(', '));

    /* and no flush was planted on a restore path */
    const onRestore = FLUSH_RESTORE
      .filter(r => byName.has(r) && FLUSH_CALL.test(byName.get(r).body));
    ok('flush', c + ': no flush on a restore/repaint path',
      onRestore.length === 0, 'flushes during replay: ' + onRestore.join(', '));
  }
}

/* ══════════════ 15. §8.11 — the loader's cover exit paths ══════════════
   With RESUME_ENABLED true, jsdom can no longer watch the cover come off:
   every remaining drop path lives inside the callback of two https:// CDN
   scripts, and jsdom does not fetch those. The behavioural assertion above
   therefore only proves the cover is HELD on purpose. These hold the paths
   that actually take it off again — statically, which is honest about what is
   being checked rather than asserting something weaker and calling it
   coverage.

   Why each one matters, in the order a learner meets them:

     * gate 1 (no XAPI_METADATA_FILE) returns early, and a return that skips
       the drop strands the cover until the markup failsafe.
     * the no-payload branch is what makes the cover acceptable AT ALL. A
       first-time learner has an empty document, so parts[] is empty, and the
       cover comes off there — at the earliest possible moment, without waiting
       for pollMetadataReady. Losing it re-opens the objection that sank the
       boot curtain in 2026-08-19: "~1s of empty canvas on every load even with
       no saved progress".
     * the poll ceiling: if the metadata file 404s, cb() is never called, so
       the drop has to happen on the timeout instead.
     * the catches: an exception on the read or init path must not leave the
       cover up.

   The one return that deliberately does NOT drop it is the cross-part
   redirect: the page is leaving, and holding the cover is what hides the
   flash of screen 01 that a learner sees on every such jump today. */
function checkLoaderCoverExits() {
  const raw = fs.readFileSync(path.join(BASE, 'unit-js', '50-loader.js'), 'utf8');
  const src = stripJsComments(raw);

  /* every own-scope `return` in bootXAPI must drop the cover or navigate away,
     judged over its ENCLOSING BLOCK - not a fixed-width window, which in an
     earlier audit in this project straddled two adjacent blocks and reported
     nonsense */
  const boot = flushFunctions(src).find(f => f.name === 'bootXAPI');
  ok('cover', 'loader: bootXAPI is present and brace-matched', !!boot, '');
  if (boot) {
    const mask = flushNestedMask(boot.body);
    const bad = [];
    const rRe = /\breturn\b/g;
    let m;
    while ((m = rRe.exec(boot.body)) !== null) {
      if (mask[m.index]) continue;
      /* walk back to the start of the enclosing block */
      let depth = 0, start = 0;
      for (let j = m.index; j >= 0; j--) {
        const ch = boot.body[j];
        if (ch === '}') depth++;
        else if (ch === '{') {
          if (depth === 0) { start = j; break; }
          depth--;
        }
      }
      const block = boot.body.slice(start, m.index);
      if (!/dropBootCover\s*\(/.test(block) && !/location\.replace/.test(block)) {
        bad.push(boot.body.slice(Math.max(0, m.index - 60), m.index + 7).replace(/\s+/g, ' '));
      }
    }
    ok('cover', 'loader: every early return drops the cover or navigates away',
      bad.length === 0, bad.join(' || '));
  }

  /* the first-load path: an empty document means nothing to restore, so the
     cover comes off before the metadata poll rather than after it */
  ok('cover', 'loader: the no-payload branch drops the cover immediately',
    /if\s*\(\s*!_payload\s*\)\s*dropBootCover\s*\(\s*\)/.test(src),
    'a first-time learner would hold the cover until stage B');

  /* the drop on the normal path must not sit inside a branch */
  const normal = src.split(/pollMetadataReady\s*\(\s*function/)[1] || '';
  ok('cover', 'loader: the normal path drops the cover unconditionally',
    /\n\s{8,}dropBootCover\s*\(\s*\)\s*;/.test(normal),
    'the main drop looks conditional');

  /* the 404 case: cb() never fires, so the timeout has to do it */
  const poll = (src.match(/function pollMetadataReady[\s\S]*?\n\s{2}\}/) || [''])[0];
  ok('cover', 'loader: the metadata poll ceiling drops the cover',
    /dropBootCover\s*\(/.test(poll),
    'a 404 on the metadata file would hold the cover for the full ceiling');

  /* The two OUTERMOST catches are the ones that matter: they catch anything
     thrown before the unconditional drop is reached, so nothing downstream
     will take the cover off for them.

     Deliberately not asserted: "every logged catch drops the cover". That
     over-reaches, and it failed on two catches that are both correct - the
     `[resume] init` catch recovers and falls THROUGH to the unconditional
     drop, and the `[xAPI] ready hook` catch runs after it, when the cover is
     already gone. Adding a drop to either would just be a redundant call.
     What is left is the narrow invariant that can actually strand a learner:
     a catch that ABANDONS the sequence must drop first. */
  for (const tag of ['init', 'load']) {
    const re = new RegExp("catch\\s*\\([^)]*\\)\\s*\\{[^}]*\\[xAPI\\] " + tag + "[^}]*\\}");
    const blk = (src.match(re) || [''])[0];
    ok('cover', "loader: the outermost '" + tag + "' catch drops the cover",
      blk !== '' && /dropBootCover\s*\(/.test(blk),
      blk === '' ? 'catch not found' : blk.replace(/\s+/g, ' '));
  }

  const catches = src.match(/catch\s*\([^)]*\)\s*\{[^}]*\}/g) || [];
  const abandoning = catches.filter(b =>
    /console\.error\(\s*'\[(resume|xAPI)\]/.test(b) && /\breturn\b/.test(b));
  const stranding = abandoning.filter(b => !/dropBootCover\s*\(/.test(b));
  ok('cover', 'loader: no logged catch abandons the boot without dropping the cover',
    stranding.length === 0, stranding.map(b => b.replace(/\s+/g, ' ')).join(' || '));

  /* canary, so a path deleted wholesale is noticed even if the greps above
     still match somewhere else */
  const sites = (src.match(/dropBootCover\s*\(\s*\)/g) || []).length;
  ok('cover', 'loader: the number of cover-drop sites is what it was',
    sites === 9, sites + ' sites, expected 9');
}

/* ══════════════ 16. §3.5 — the library letter moves with the flag ══════════════
   §3.5: the library letter and the XAPI_USING_G regex must change in the same
   edit as RESUME_ENABLED, every time. The reason it is a rule at all is that
   getting it half-right fails SILENTLY in both directions:

     * flag on, letter still -i  → xapi-720-i.js has no State API layer, so
       loadState720/saveState720 are undefined. Every write path is wrapped in
       a typeof guard, so nothing throws and nothing is logged - resume simply
       never happens, and the unit looks fine.
     * letter -k, regex narrowed → XAPI_USING_G goes false, and that flag tells
       every screen whether ITEM-LEVEL statements are available at all. The
       unit keeps reporting, but scoring silently stops.

   This unit does not follow §3.5's manual pattern: 50-loader.js DERIVES the
   letter from the flag and uses a regex that covers every letter it can
   select. That is strictly better than two constants kept in step by hand, so
   these assertions protect the derivation rather than a pair of literals - a
   future "simplification" to a hardcoded letter is the thing to catch. */
function checkResumeLibraryCoupling(results) {
  const src = stripJsComments(
    fs.readFileSync(path.join(BASE, 'unit-js', '50-loader.js'), 'utf8'));
  const ident = stripJsComments(
    fs.readFileSync(path.join(BASE, 'unit-js', '10-identity.js'), 'utf8'));

  /* the letter is chosen BY the flag, not written down twice */
  const pick = (src.match(/RESUME_ENABLED\s*\?\s*'xapi-720-(\w)\.js'\s*:\s*'xapi-720-(\w)\.js'/) || []);
  ok('gate', 'loader: the library letter is derived from RESUME_ENABLED',
    pick.length === 3, 'no derived choice found — a hardcoded letter fails silently');
  ok('gate', 'loader: the flag picks -k with resume and -i without',
    pick[1] === 'k' && pick[2] === 'i',
    pick.length === 3 ? 'picks -' + pick[1] + ' / -' + pick[2] : '');

  /* whichever letter the flag can select, the gate regex must still match it */
  const gate = (src.match(/XAPI_USING_G\s*=\s*(\/[^/]+\/)\.test/) || [])[1];
  ok('gate', 'loader: XAPI_USING_G is set from a regex over the chosen library',
    !!gate, 'not found');
  if (gate && pick.length === 3) {
    let re = null;
    try { re = new RegExp(gate.slice(1, -1)); } catch (e) {}
    ok('gate', 'loader: the gate regex matches BOTH letters the flag can select',
      !!re && re.test('xapi-720-' + pick[1] + '.js') &&
              re.test('xapi-720-' + pick[2] + '.js'),
      'regex ' + gate + ' vs -' + pick[1] + ' / -' + pick[2]);
  }

  /* and the flag itself is a single declaration in the identity layer */
  const decls = (ident.match(/\bvar\s+RESUME_ENABLED\s*=/g) || []).length;
  ok('gate', 'identity: RESUME_ENABLED is declared exactly once',
    decls === 1, String(decls));

  /* the runtime consequence, per part: with resume on, item-level statements
     must be declared available, or scoring stops with nothing in the console */
  for (const c of PARTS) {
    const r = results[c];
    ok('gate', c + ': XAPI_USING_G agrees with RESUME_ENABLED',
      r.val('RESUME_ENABLED') !== true || r.val('window.XAPI_USING_G') === true,
      'resume is on but item-level statements are gated off');
  }
}

/* ══════════════ 17. the dev bridge is origin-gated ══════════════
   unit-js/60-devbridge.js SHIPS - every part's index.html loads it - and it
   turns a postMessage into goTo(n). postMessage has no same-origin
   restriction, so before the origin check any window holding a reference to
   this page could drive it.

   That was inert while goTo() only swapped screens. Since RESUME_ENABLED went
   true it is not: goTo() calls scheduleResumeSave(), so a DEV_GOTO moves the
   learner's SAVED position, and jumping into a screen they never reached
   rewrites their execution state.

   Deliberately not overstated: on the platform this page is framed
   cross-origin, so a third party has no handle to post through, and an
   attacker framing their own copy gets a session without the learner's
   ?registration. This is defence in depth. It is asserted because it is the
   kind of one-line guard that gets removed as "unnecessary" by someone who
   only sees the dev harness using it - and index_dev.html iframes a RELATIVE
   path, so it is always same-origin and never notices the guard at all.

   Runs LAST because it navigates: the golden digests are captured in
   checkSweepAndSnapshots, which is already done by this point. */
function checkDevBridgeOrigin(results) {
  for (const c of PARTS) {
    const r = results[c];
    const post = (origin, screen) =>
      r.val('window.dispatchEvent(new MessageEvent("message", { data: ' +
            '{ type: "DEV_GOTO", screen: ' + screen + ' }, origin: ' + origin + ' }))');

    /* ⚠️ Re-park between the two, and ask for DIFFERENT screens. The first
       version reused screen 1 for both and did not re-park, so with the guard
       INVERTED the foreign post moved the screen to 1 and the same-origin
       assertion then found 1 and passed - by accident, describing a bridge
       that only accepts foreign messages as working correctly. Mutation
       testing found it; reading it did not. Same lesson as the boot-cover
       assertion that appended to a DOM an earlier assertion had left dirty. */

    /* a foreign origin must not move us */
    r.val('goTo(0)');
    const parked = r.val('currentScreen');
    post('"https://evil.example"', 1);
    ok('gate', c + ': a DEV_GOTO from a foreign origin is ignored',
      r.val('currentScreen') === parked,
      'moved to ' + r.val('currentScreen') + ' — and goTo now writes resume state');

    /* and the guard must not break the harness it exists for.
       Park at 1 and ask for 0 - the opposite direction, so this cannot be
       satisfied by the previous post having moved us. Screens 0 and 1 are the
       only two valid in EVERY part: part 04 has TOTAL_SCREENS = 2, so a
       goTo(2) here would be refused by goTo's own range guard and the
       assertion would fail for the wrong reason. */
    r.val('goTo(1)');
    post('window.location.origin', 0);
    ok('gate', c + ': a DEV_GOTO from the same origin still works',
      r.val('currentScreen') === 0,
      'index_dev.html drives the lomda through this; got ' + r.val('currentScreen'));

    r.val('goTo(0)');
  }
}

function main() {
  const t0 = Date.now();
  const results = {};
  for (const c of PARTS) results[c] = loadPart(c);

  checkLoad(results);
  checkSharedSmoke(results);
  checkReportingLayer(results);
  checkInlineHandlers(results);
  checkLayerCollisions(results);
  checkSweepAndSnapshots(results);      // last: it navigates and mutates the DOM
  checkSharedUrlAgreement();
  checkSharedCssAssets();
  checkNoStaleCopies();
  checkScreenMaps(results);
  checkCallSites(results);
  checkPlatformRouting(results);
  checkPerComponentState();
  checkStateShapeSource();
  checkReportMarkup(results);
  checkBootCover(results);
  checkFlushBeforeReturn();
  checkLoaderCoverExits();
  checkResumeLibraryCoupling(results);
  checkDevBridgeOrigin(results);   // navigates; must follow the digest sweep

  for (const c of PARTS) results[c].dom.window.close();

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
}

module.exports = { loadPart, stripJsComments, PARTS, PART_DIR, UNIT, MAIN_JS,
                   EXPECTED_SCREENS, BASE };

if (require.main === module) main();
