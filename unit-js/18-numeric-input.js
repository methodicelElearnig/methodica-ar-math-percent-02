/* ═══════════════════ unit-js/18-numeric-input.js ═══════════════════
   THE one copy for this unit. Loaded by every part as
   ../unit-js/18-numeric-input.js; edit here, there is nowhere else.

   Extracted from the seven main.js files, where this block was
   byte-identical (3,988 chars, same hash in all seven). It was an IIFE
   that ran on load; it is now a named function so that this file stays
   DEFINITION-ONLY per ADDING-REPORTING-AND-RESUME.md §3.2. Each part
   calls initNumericInputs() at the point the IIFE used to run, and that
   call moves into unit-js/90-boot.js once the boot sequence exists.

   The original rationale follows verbatim — it is the producer decision
   this code implements, and it explains two things that look wrong
   (why normalisation is installed on the inputs rather than in each
   validator, and why the character filter had to be re-added).
   Thousands separators in numeric answer inputs
   (producer instruction, 2026-08-20)

   A learner may type "1,400" or "1400" and both must evaluate as
   1400. The comma is an input convenience only — it never becomes
   part of the canonical answer.

   Why it is done here rather than inside each validator: this part
   has ~10 independent answer validators, and they compare in two
   different ways — `Number(raw) === const` for most, but plain
   STRING equality for the table/equation screens (e.g. part 01's
   S11/S12 compare against '40' / '100' / '200'). Normalising inside
   each one would mean editing every validator, every multi-field
   value collector and every `Signature()` de-dup helper, in all
   seven parts. Instead the normalisation is installed once, on the
   inputs themselves:

     - the `value` GETTER returns the comma-stripped string, so every
       existing read — Number(), ===, .trim(), signatures — sees the
       clean value with no change to the validation logic;
     - the SETTER is the native one, so reset, the solution reveal
       and the View-My-Answer toggle all keep writing normally.

   The character filter is required because these inputs used to be
   `type="number"`, which blocked letters natively. They are now
   `type="text" inputmode="numeric"` (a number input silently refuses
   a comma and reports value===""), so the filter restores that
   protection. It runs in the CAPTURE phase, ahead of each screen's
   own inline `oninput=` handler, so those handlers never observe a
   character that is about to be removed.

   Digits, comma, dot and a minus sign are allowed. Dot and minus are
   kept because `type="number"` accepted them before — this must not
   make input stricter than it already was. Letters (including the
   "e" exponent a number input used to permit) and every other symbol
   are stripped.

   Scope: `input[inputmode="numeric"]` only. Part 01's S12 "x" slot is
   `inputmode="text"` and is deliberately left alone — it holds a
   letter, not a number.
   ═══════════════════════════════════════════════════════════ */

function initNumericInputs() {
  var NATIVE = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (!NATIVE || !NATIVE.get || !NATIVE.set) return;   // very old engine: leave as-is

  var ALLOWED = /[^0-9.,\-]/g;

  function rawOf(el)      { return NATIVE.get.call(el); }
  function setRaw(el, v)  { NATIVE.set.call(el, v); }

  function enhance(el) {
    if (el.dataset.commaAware === '1') return;
    el.dataset.commaAware = '1';
    Object.defineProperty(el, 'value', {
      configurable: true,
      enumerable: true,
      get: function () { return rawOf(this).replace(/,/g, ''); },
      set: function (v) { setRaw(this, v); }
    });
  }

  function enhanceAll() {
    var list = document.querySelectorAll('input[inputmode="numeric"]');
    for (var i = 0; i < list.length; i++) enhance(list[i]);
  }

  /* Capture phase: strip disallowed characters before the screen's own
     inline oninput handler runs, keeping the caret where the learner
     expects it. */
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el || el.tagName !== 'INPUT') return;
    if (el.getAttribute('inputmode') !== 'numeric') return;
    enhance(el);
    var raw = rawOf(el);
    var clean = raw.replace(ALLOWED, '');
    if (clean === raw) return;
    var pos = el.selectionStart == null ? clean.length : el.selectionStart;
    var dropped = 0;
    for (var i = 0; i < pos && i < raw.length; i++) {
      if (ALLOWED.test(raw.charAt(i))) dropped++;
      ALLOWED.lastIndex = 0;
    }
    setRaw(el, clean);
    var next = Math.max(0, pos - dropped);
    try { el.setSelectionRange(next, next); } catch (e) { /* not selectable */ }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAll);
  } else {
    enhanceAll();
  }
}
