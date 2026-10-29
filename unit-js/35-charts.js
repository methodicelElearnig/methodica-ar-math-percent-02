/* ═══════════════════ unit-js/35-charts.js ═══════════════════
   Chart geometry shared by the parts that draw pie charts. THE one copy for
   this unit; loaded as ../unit-js/35-charts.js.

   DEFINITION-ONLY per §3.2.

   Only pieSlicePath is here. pieChartSVG() and renderPieCharts() also exist
   in parts 03 and 05 but have genuinely DIFFERENT code in each — not a
   comment difference — so they stay per-part rather than being reconciled
   into something neither part actually had.
   ═══════════════════════════════════════════════════════════ */

/* Wedge path. Angles are degrees clockwise from 12 o'clock; the -90
   rotation maps 0deg to north, and SVG sweep-flag 1 draws clockwise. */
function pieSlicePath(cx, cy, r, startDeg, endDeg) {
  const rad = d => (d - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(rad(startDeg)), y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg)),   y2 = cy + r * Math.sin(rad(endDeg));
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return 'M ' + cx + ' ' + cy + ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
         ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z';
}
