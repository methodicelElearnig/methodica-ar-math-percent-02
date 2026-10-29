/* ═══════════════ issue-reporting flow harness (§7.6) ═══════════════
   NOT DEPLOYED. Dev tooling only — must be excluded from any release package.

   verify-shared.js checks the markup contract (§7.1) statically, in all seven
   parts. This file drives the dialog: it clicks the flag button, works the
   custom select, exercises the submit gate and the abandonment confirm, and
   captures the actual POST body.

   Two things make this fully testable off-platform, and they are the reason
   §7.2's dependency note matters:

     * issue reporting needs window.METADATA to LOAD — the unit and component
       slugs are read from it on every submission — but it does NOT need
       statement sending to work. So there is no ?slxapi here and no CDN
       library; only the real metadata/<part>.json, injected.
     * fetch() is stubbed, because Google Forms answers with an opaque
       response. The code is forbidden from branching on status (mode:
       'no-cors'), so the only observable is the request itself.

   ⚠️ If METADATA fails to load in production, both slugs post EMPTY — and the
   response sheet holds every 720 unit together, so that is a row attributable
   to no unit at all. Both fields are asserted in every part for that reason.

   RUN (jsdom is outside the repo — see _test/README.md):

     NODE_PATH=/c/Users/Vadim/AppData/Local/lomda-test/node_modules \
       node _test/report-flow.js
*/
'use strict';

const fs   = require('fs');
const path = require('path');
const { loadPart, UNIT, BASE } = require('./verify-shared.js');

const PARTS = ['01', '02', '03', '04', '05', '06', '07'];
const FORM_URL_RE = /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/formResponse$/;

/* The Hebrew labels the form must carry — the LABEL, never the internal key. */
const LABELS = {
  technical: 'תקלה טכנית או שמשהו לא עובד',
  unclear:   'משהו לא ברור לי',
  other:     'אחר',
};

let passes = 0;
const failures = [];
const notes = [];

function ok(tag, what, cond, detail) {
  if (cond) { passes++; return true; }
  failures.push('[' + tag + '] ' + what + (detail ? '  —  ' + detail : ' <no detail>'));
  return false;
}
function note(m) { notes.push(m); }

/* ── the rig ───────────────────────────────────────────────────────────────
   `reject` makes the stub return a rejecting promise, for the "failure never
   blocks the learner" case. Note that path DOES log a console.error by
   design (the .catch in submitReport), so only the happy path asserts a
   clean console. */
function rig(part, opts) {
  opts = opts || {};
  const r = loadPart(part);
  r.w.METADATA = JSON.parse(fs.readFileSync(
    path.join(BASE, 'metadata', UNIT + '-' + part + '.json'), 'utf8').replace(/^﻿/, ''));

  r.w.__fetches = [];
  r.exec(
    'window.fetch = function (url, init) {' +
    '  window.__fetches.push({' +
    '    url: url, method: init && init.method, mode: init && init.mode,' +
    '    isUSP: !!(init && init.body instanceof URLSearchParams),' +
    '    body: init && init.body ? Object.fromEntries(init.body) : null' +
    '  });' +
    (opts.reject ? '  return Promise.reject(new Error("stub network failure"));'
                 : '  return Promise.resolve({});') +
    '};');

  const g = {
    r, part,
    v: expr => r.val(expr),
    fetches: () => r.w.__fetches.map(f => JSON.parse(JSON.stringify(f))),
    hidden: id => r.val('document.getElementById("' + id + '").hasAttribute("hidden")'),
    errors: () => r.consoleErrors.slice(),
    close() { r.dom.window.close(); },
  };
  return g;
}

/* ══════════════ 1. the flag button, every instance (§7.4) ══════════════
   The click goes on the inner .flag-btn-label, NOT the button — that is what
   proves closest() delegation rather than a handler bound to the button
   itself. A getElementById-shaped wiring passes a click on the button and
   fails this. */
function checkFlagButtons() {
  for (const part of PARTS) {
    const g = rig(part);
    const n = g.v('document.querySelectorAll(".flag-btn").length');
    let firstBad = -1;
    for (let i = 0; i < n; i++) {
      g.r.exec('document.getElementById("report-modal").setAttribute("hidden", "");' +
               'document.querySelectorAll(".flag-btn .flag-btn-label")[' + i + '].click();');
      if (g.hidden('report-modal') !== false) { firstBad = i; break; }
    }
    ok('flag', part + ': all ' + n + ' .flag-btn instance(s) open the modal ' +
      '(clicking the inner label)', firstBad === -1,
      'first failing index ' + firstBad);
    g.close();
  }
}

/* ══════════════ 2. the select and the submit gate ══════════════ */
function checkFormGate() {
  for (const part of PARTS) {
    const g = rig(part);
    const dis = () => g.v('document.querySelector("#report-modal .report-submit-btn").disabled');

    g.r.exec('openReportModal();');
    ok('gate', part + ': submit is disabled with nothing filled in', dis() === true, String(dis()));

    /* clicking an option must write BOTH the hidden input and the visible
       label — the option handler dispatches a synthetic `change` on the
       input, and that dispatch is what re-runs the submit gate (§7.1) */
    g.r.exec('document.querySelector("#report-modal .report-select-option[data-value=\'unclear\']").click();');
    ok('gate', part + ': clicking an option writes the hidden input',
      g.v('document.getElementById("report-type").value') === 'unclear',
      String(g.v('document.getElementById("report-type").value')));
    ok('gate', part + ': clicking an option writes the visible Hebrew label',
      g.v('document.querySelector("#report-type-wrapper .report-select-value").textContent.trim()')
        === LABELS.unclear,
      String(g.v('document.querySelector("#report-type-wrapper .report-select-value").textContent.trim()')));
    ok('gate', part + ': submit is STILL disabled with only the type set',
      dis() === true, String(dis()));

    g.r.exec('var t = document.getElementById("report-text");' +
             't.value = "הטקסט לא נטען"; t.dispatchEvent(new Event("input"));');
    ok('gate', part + ': submit is enabled once both fields are set',
      dis() === false, String(dis()));
    g.close();
  }
}

/* ══════════════ 3. abandonment confirm (§7.1) ══════════════
   report-thanks-modal and report-confirm-modal are two DIFFERENT dialogs, not
   two states of one — merging them is the obvious-looking simplification and
   it is wrong, so the thanks dialog is asserted to stay hidden here. */
function checkAbandon() {
  for (const part of PARTS) {
    const g = rig(part);
    g.r.exec('openReportModal();' +
             'var t = document.getElementById("report-text");' +
             't.value = "התחלתי לכתוב"; t.dispatchEvent(new Event("input"));');
    g.r.exec('tryCloseReportModal();');
    ok('abandon', part + ': closing with unsent input opens #report-confirm-modal',
      g.hidden('report-confirm-modal') === false, 'hidden=' + g.hidden('report-confirm-modal'));
    ok('abandon', part + ': …and hides #report-modal',
      g.hidden('report-modal') === true, 'hidden=' + g.hidden('report-modal'));
    ok('abandon', part + ': …and does NOT show the thanks dialog',
      g.hidden('report-thanks-modal') === true, 'hidden=' + g.hidden('report-thanks-modal'));

    g.r.exec('backToReportForm();');
    ok('abandon', part + ': backToReportForm() returns to the form',
      g.hidden('report-modal') === false && g.hidden('report-confirm-modal') === true,
      'modal=' + g.hidden('report-modal') + ' confirm=' + g.hidden('report-confirm-modal'));
    g.close();
  }
}

/* ══════════════ 4. the real send ══════════════ */
function checkSend() {
  for (const part of PARTS) {
    const g = rig(part);
    const md = g.r.w.METADATA;
    const compSlug = String(md.id).replace(/\/+$/, '').split('/').pop();

    /* a MAPPED screen, so the item id is a real catalogue item */
    const map = JSON.parse(g.v('JSON.stringify(SCREEN_TO_SUBCONTENT)'));
    const mapped = Object.keys(map).map(Number).sort((a, b) => a - b)
      .find(n => map[n] !== null);
    g.r.exec('goTo(' + mapped + ');');

    const TEXT = 'הכפתור לא מגיב כשלוחצים עליו';
    g.r.exec('openReportModal();' +
             'document.querySelector("#report-modal .report-select-option[data-value=\'technical\']").click();' +
             'var t = document.getElementById("report-text");' +
             't.value = ' + JSON.stringify(TEXT) + '; t.dispatchEvent(new Event("input"));' +
             'submitReport();');

    const f = g.fetches();
    ok('send', part + ': exactly one fetch', f.length === 1, f.length + '');
    if (f.length === 1) {
      ok('send', part + ': the URL is the shared 720 form endpoint',
        FORM_URL_RE.test(f[0].url), f[0].url);
      ok('send', part + ': method POST, mode no-cors (the response is opaque)',
        f[0].method === 'POST' && f[0].mode === 'no-cors',
        f[0].method + ' / ' + f[0].mode);
      ok('send', part + ': the body is URLSearchParams, not JSON',
        f[0].isUSP === true, String(f[0].isUSP));

      const b = f[0].body || {};
      ok('send', part + ': posts the unit slug',
        b['entry.1933069481'] === UNIT, String(b['entry.1933069481']));
      ok('send', part + ': posts this component\'s slug',
        b['entry.2070680092'] === compSlug, String(b['entry.2070680092']));
      ok('send', part + ': posts the item id from SCREEN_TO_SUBCONTENT',
        b['entry.1555704258'] === compSlug + '-' + map[mapped][0],
        String(b['entry.1555704258']));
      ok('send', part + ': posts the page-within-item',
        b['entry.1671046914'] === String(map[mapped][1]), String(b['entry.1671046914']));
      ok('send', part + ': posts the Hebrew LABEL, not the internal key',
        b['entry.1179822443'] === LABELS.technical, String(b['entry.1179822443']));
      ok('send', part + ': posts the free text verbatim',
        b['entry.806447525'] === TEXT, String(b['entry.806447525']));
      ok('send', part + ': posts a four-digit year',
        /^\d{4}$/.test(String(b['entry.301404029_year'])),
        String(b['entry.301404029_year']));
      ok('send', part + ': posts a 1-based month',
        Number(b['entry.301404029_month']) >= 1 && Number(b['entry.301404029_month']) <= 12,
        String(b['entry.301404029_month']));
    }
    ok('send', part + ': shows the thank-you dialog',
      g.hidden('report-thanks-modal') === false, 'hidden=' + g.hidden('report-thanks-modal'));
    ok('send', part + ': …and hides the form',
      g.hidden('report-modal') === true, 'hidden=' + g.hidden('report-modal'));
    ok('send', part + ': no console.error on the happy path',
      g.errors().length === 0, g.errors().slice(0, 2).join(' | '));
    g.close();
  }
}

/* ══════════════ 5. an UNMAPPED screen, and a failing network ══════════════ */
function checkEdges() {
  /* On a null screen the item id must post EMPTY and the page falls back to
     the raw screen number (§7.2). Left to manual checking in the reference;
     it is cheap to automate, so it is automated. */
  const g = rig('01');
  const map = JSON.parse(g.v('JSON.stringify(SCREEN_TO_SUBCONTENT)'));
  const nul = Object.keys(map).map(Number).sort((a, b) => a - b).find(n => map[n] === null);
  if (nul === undefined) {
    note('part 01 has no null screen to test the empty item id');
  } else {
    g.r.exec('goTo(' + nul + '); openReportModal();' +
             'document.querySelector("#report-modal .report-select-option[data-value=\'other\']").click();' +
             'var t = document.getElementById("report-text");' +
             't.value = "בדיקה"; t.dispatchEvent(new Event("input")); submitReport();');
    const b = (g.fetches()[0] || {}).body || {};
    ok('edge', '01: an unmapped screen posts an EMPTY item id',
      b['entry.1555704258'] === '', JSON.stringify(b['entry.1555704258']));
    ok('edge', '01: …and falls back to the raw screen number for the page',
      b['entry.1671046914'] === String(nul), String(b['entry.1671046914']));
  }
  g.close();

  /* Failure never blocks the learner: showReportThanks() runs on the
     synchronous path, before the request could resolve. The rejecting stub
     DOES produce a console.error from submitReport's own .catch — that is the
     designed behaviour, so it is asserted rather than tolerated. */
  const h = rig('01', { reject: true });
  h.r.exec('goTo(1); openReportModal();' +
           'document.querySelector("#report-modal .report-select-option[data-value=\'other\']").click();' +
           'var t = document.getElementById("report-text");' +
           't.value = "בדיקה"; t.dispatchEvent(new Event("input")); submitReport();');
  ok('edge', '01: a rejecting fetch still shows the thank-you',
    h.hidden('report-thanks-modal') === false, 'hidden=' + h.hidden('report-thanks-modal'));
  ok('edge', '01: a rejecting fetch still hides the form',
    h.hidden('report-modal') === true, 'hidden=' + h.hidden('report-modal'));
  h.close();
}

/* ══════════════ Main ══════════════ */
(function main() {
  const t0 = Date.now();
  checkFlagButtons();
  checkFormGate();
  checkAbandon();
  checkSend();
  checkEdges();

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
