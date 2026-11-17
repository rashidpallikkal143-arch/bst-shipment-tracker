/* Egypt operations workspace: dashboard, pipeline board, one-tap step updates, step-by-step entry form, Egypt report.
   Works on the same Egypt records as before (status fields stay as they were) and adds a date for every step. */
(function () {
  'use strict';
  var B = window.BST, can = function (r) { return !!(B && B.can && B.can(r)); };
  var $ = function (id) { return document.getElementById(id); };
  var esc = window.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { var n = Number(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
  var nf = function (n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); };
  var today = function () { return String(window.TD || new Date().toISOString()).slice(0, 10); };
  var dd = function (a, b) { if (!a || !b) return null; var x = (new Date(b.slice(0, 10)) - new Date(a.slice(0, 10))) / 864e5; return isNaN(x) ? null : Math.round(x); };
  var dshow = function (d) { if (!/^\d{4}-\d\d-\d\d/.test(d || '')) return d || ''; var x = new Date(d.slice(0, 10) + 'T00:00:00'); return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); };
  var dlong = function (d) { if (!/^\d{4}-\d\d-\d\d/.test(d || '')) return d || '-'; var x = new Date(d.slice(0, 10) + 'T00:00:00'); return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };

  // ------------------------------------------------------------------ the journey
  var ST = [
    { t: 'Planned / loading', s: 'Planned', d: 'sched', c: '#8a94a6' },
    { t: 'On the road to KSA', s: 'To KSA', d: 'actual', c: '#1f6feb' },
    { t: 'At KSA border', s: 'At KSA', d: 'dKsaArr', c: '#c27a0a' },
    { t: 'On the road to Ghuwaifat', s: 'To Ghuwaifat', d: 'dKsa', c: '#1f6feb' },
    { t: 'At Ghuwaifat border', s: 'At Ghuwaifat', d: 'dGhuArr', c: '#c27a0a' },
    { t: 'Out for delivery', s: 'Out for delivery', d: 'dGhu', c: '#7a5af8' },
    { t: 'Delivered · purchase not booked', s: 'Delivered', d: 'delivered', c: '#00a651' },
    { t: 'Closed · purchase booked', s: 'Closed', d: 'dPurchase', c: '#007a3d' }];
  var STEP = [
    { t: 'Dispatched from Egypt', b: 'Dispatched', date: 'actual', set: { loading: 'Dispatched' }, also: { ksa: 'En Route' } },
    { t: 'Arrived at KSA border', b: 'At KSA', date: 'dKsaArr', set: { ksa: 'Arrived' } },
    { t: 'Cleared KSA border', b: 'KSA cleared', date: 'dKsa', set: { ksa: 'Cleared' }, also: { ghu: 'En Route' } },
    { t: 'Arrived at Ghuwaifat border', b: 'At Ghuwaifat', date: 'dGhuArr', set: { ghu: 'Arrived' } },
    { t: 'Cleared Ghuwaifat · out for delivery', b: 'Ghuwaifat cleared', date: 'dGhu', set: { ghu: 'Cleared' } },
    { t: 'Delivered to warehouse', b: 'Delivered', date: 'delivered', set: { wh: 'Delivered' } },
    { t: 'Purchase booked in the system', b: 'Book purchase', date: 'dPurchase', set: { purchase: 'Booked' } }];
  function stg(r) { var i = typeof pi === 'function' ? pi(r) : -1; return i <= 1 ? 0 : i - 1; }
  var LEGS = [['Egypt → KSA border', 'actual', 'dKsaArr'], ['Waiting at KSA border', 'dKsaArr', 'dKsa'], ['KSA → Ghuwaifat', 'dKsa', 'dGhuArr'],
    ['Waiting at Ghuwaifat border', 'dGhuArr', 'dGhu'], ['Ghuwaifat → warehouse', 'dGhu', 'delivered'], ['Door to door (dispatch → delivery)', 'actual', 'delivered']];

  var ISOV = '0123456789A?BCDEFGHIJK?LMNOPQRSTU?VWXYZ';
  function isoOk(c) { c = String(c || '').toUpperCase().replace(/[\s-]/g, ''); if (!/^[A-Z]{3}[UJZ]\d{7}$/.test(c)) return false; var s = 0; for (var i = 0; i < 10; i++) s += ISOV.indexOf(c[i]) * Math.pow(2, i); return (s % 11) % 10 === Number(c[10]); }
  function itemsOf(r) { return typeof egParseItems === 'function' ? egParseItems(r.items) : []; }
  function ctnOf(r) { if (num(r.ctn)) return num(r.ctn); var c = 0; itemsOf(r).forEach(function (i) { c += num(i.c); }); return c; }
  function ref(r) { return r.container || r.vehicle || ('SR ' + r.sr); }
  var OWN = /al[\s-]?saih|baniyas|\bbst\b/i;
  function supName(s) { s = String(s || '').trim(); if (!s) return ''; return s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(\/&-])([a-z])/g, function (a, b, c) { return b + c.toUpperCase(); }) : s; }

  // ------------------------------------------------------------------ required to book the purchase (nothing is compulsory before that)
  function bookMissing(r) { var m = [], its = itemsOf(r), ctn = num(r.ctn) || its.reduce(function (a, i) { return a + num(i.c); }, 0);
    if (!String(r.supplier || '').trim() || OWN.test(r.supplier)) m.push(['Supplier (Egypt)', 'order']); if (!r.inv) m.push(['Invoice no.', 'order']); if (!num(r.invAmt)) m.push(['Invoice amount', 'order']);
    if (!its.length) m.push(['Products', 'items']); else if (!ctn) m.push(['CTN quantities', 'items']); if (!r.container) m.push(['Container no.', 'truck']); if (!r.vehicle) m.push(['Truck plate no.', 'truck']);
    if (!num(r.frAmt)) m.push(['Freight amount', 'pay']); if (!r.actual) m.push(['Dispatch date', 'trip']); if (!r.delivered) m.push(['Delivery date', 'trip']); return m; }
  // ------------------------------------------------------------------ checks ("needs fixing")
  function checks(r) {
    var out = [], st = stg(r), add = function (m, sec, lvl) { out.push({ m: m, sec: sec, lvl: lvl || 'w' }); };
    if (r.supplier && OWN.test(r.supplier)) add('Supplier is your own company (' + r.supplier + '), enter the Egyptian supplier', 'order');
    if (r.inv && /^\d{4}-\d\d-\d\d$/.test(r.inv)) add('Invoice no. looks like a date (' + r.inv + ')', 'order');
    // delivered: everything needed for the purchase booking should now be complete
    if (st >= 6) bookMissing(r).forEach(function (x) { if (!(x[0] === 'Supplier (Egypt)' && r.supplier)) add(x[0] + ' missing' + (st >= 7 ? '' : ' (needed to book the purchase)'), x[1], st >= 7 ? 'e' : 'w'); });
    if (r.delivered && st < 6) add('Has a delivery date but warehouse status is "' + (r.wh || 'not set') + '"', 'trip');
    if (st >= 6 && !r.delivered) add('Delivered but no delivery date', 'trip');
    if (r.actual && r.delivered && r.delivered < r.actual) add('Delivery date is before the dispatch date', 'trip', 'e');
    var seq = [['actual', 'dispatch'], ['dKsaArr', 'KSA arrival'], ['dKsa', 'KSA clearance'], ['dGhuArr', 'Ghuwaifat arrival'], ['dGhu', 'Ghuwaifat clearance'], ['delivered', 'delivery']], last = null;
    seq.forEach(function (q) { var d = r[q[0]]; if (!d) return; if (last && d < last[0]) add('The ' + q[1] + ' date is before the ' + last[1] + ' date', 'trip'); last = [d, q[1]]; });
    var s = 0; itemsOf(r).forEach(function (i) { s += num(i.c); }); if (s && num(r.ctn) && num(r.ctn) !== s) add('Total CTN ' + nf(r.ctn) + ' does not match the products (' + nf(s) + ')', 'items');
    return out; }

  // ------------------------------------------------------------------ dashboard
  function scopeLabel() { return typeof month !== 'undefined' && month && month !== 'ALL' ? month : 'all months'; }
  function inScope(r) { return typeof egIn === 'function' ? egIn(r) : true; }
  function stuck(r) { var s = stg(r), d = ST[s] && r[ST[s].d]; return s >= 1 && s <= 5 && d ? dd(d, today()) : null; }
  function cardHtml(r) {
    var s = stg(r), its = itemsOf(r), late = typeof isOver === 'function' && isOver(r), sd = stuck(r), when = '';
    if (s >= 1 && s <= 5) when = sd != null ? sd + ' d ' + (s === 2 || s === 4 ? 'at border' : 'on the road') : '';
    if (s === 0) when = r.sched ? 'Loading ' + dshow(r.sched) : 'No loading date';
    if (s === 6) when = r.delivered ? 'Delivered ' + dshow(r.delivered) : 'Delivered';
    var al = r.alert && s < 6 ? '<span class="egb ' + (late ? 'r' : /due/i.test(r.alert) ? 'o' : '') + '">' + esc(r.alert) + '</span>' : '';
    var nfix = checks(r).length;
    return '<div class="egc' + (late ? ' late' : '') + '"><div class="egc-m" data-ei="' + r._i + '" title="Open details"><div class="egc-t"><b>' + esc(ref(r)) + '</b>' + (r.container && r.vehicle ? '<span class="mu">' + esc(r.vehicle) + '</span>' : '') + '</div>' +
      '<div class="egc-s">' + esc(supName(r.supplier) || 'Supplier not entered') + '</div><div class="mu">' + esc((its[0] && its[0].n) || '') + (its.length > 1 ? ' +' + (its.length - 1) : '') + (ctnOf(r) ? ' · ' + nf(ctnOf(r)) + ' CTN' : '') + '</div>' +
      '<div class="egc-f"><span class="mu">' + esc(when) + '</span>' + al + (nfix ? '<span class="egb w" title="Needs fixing">⚠ ' + nfix + '</span>' : '') + '</div></div>' +
      (can('egEdit') ? '<div class="egc-a">' + (s < 7 ? '<button type="button" class="p" data-egx="next" data-i="' + r._i + '">' + esc(STEP[s].b) + ' ▸</button>' : '') + '<button type="button" data-egx="edit" data-i="' + r._i + '" title="Edit">✎</button></div>' : '') + '</div>'; }
  var FOLD = (function () { try { return JSON.parse(localStorage.getItem('bst.egfold') || '{}') || {}; } catch (e) { return {}; } })();
  function cl(k) { return FOLD[k] ? ' egcl' : ''; }
  function ar(k) { return '<span class="egar" aria-hidden="true">' + (FOLD[k] ? '▸' : '▾') + '</span>'; }
  function fold(k) { FOLD[k] = !FOLD[k]; try { localStorage.setItem('bst.egfold', JSON.stringify(FOLD)); } catch (e) {}
    var p = document.querySelector('#egdash [data-egp="' + k + '"]'); if (!p) return; p.classList.toggle('egcl', !!FOLD[k]); var a = p.querySelector('[data-egtg="' + k + '"] .egar'); if (a) a.textContent = FOLD[k] ? '▸' : '▾'; }
  function render() {
    var host = $('egdash'); if (!host || !window.E || !E.rows) return;
    var all = E.rows, sc = all.filter(inScope), open = all.filter(function (r) { return stg(r) <= 5; });
    var road = all.filter(function (r) { var s = stg(r); return s === 1 || s === 3 || s === 5; }), border = all.filter(function (r) { var s = stg(r); return s === 2 || s === 4; });
    var over = all.filter(function (r) { return typeof isOver === 'function' && isOver(r); }), delS = sc.filter(function (r) { return stg(r) >= 6; });
    var ctnS = 0; sc.forEach(function (r) { ctnS += ctnOf(r); });
    var supDue = all.filter(function (r) { return r.supPay !== 'Completed'; }), frDue = all.filter(function (r) { return stg(r) >= 1 && r.frPay !== 'Completed'; });
    var sum = function (l, k) { var t = 0; l.forEach(function (r) { t += num(r[k]); }); return t; };
    var fixes = []; all.forEach(function (r) { checks(r).forEach(function (c) { fixes.push({ r: r, c: c }); }); });
    var kpi = function (t, v, sub, cls, act) { return '<div class="egk ' + (cls || '') + '"' + (act ? ' data-egk="' + act + '"' : '') + '><span>' + t + '</span><b>' + v + '</b><em>' + (sub || '') + '</em></div>'; };
    var h = '<div class="egh"><div><h2>Egypt operations</h2><span class="mu">Egypt → KSA border → Ghuwaifat → warehouse · report date ' + esc(dlong(today())) + ' · showing ' + esc(scopeLabel()) + '</span></div><div class="egh-b">' +
      (can('egEdit') ? '<button type="button" class="p" data-egx="new">+ New container</button>' : '') + '<button type="button" data-egx="report">🖨 Egypt report</button><button type="button" data-egk="fix"' + (fixes.length ? ' class="warnb"' : '') + '>⚠ Needs fixing (' + fixes.length + ')</button></div></div>';
    h += '<div class="egks">' + kpi('Open shipments', open.length, 'not yet delivered', '', 'board') + kpi('On the road', road.length, 'to KSA / Ghuwaifat / warehouse', 'b', 'f:road') +
      kpi('At the borders', border.length, 'KSA ' + all.filter(function (r) { return stg(r) === 2; }).length + ' · Ghuwaifat ' + all.filter(function (r) { return stg(r) === 4; }).length, 'o', 'f:port') +
      kpi('Overdue', over.length, over.length ? 'past ETA, not delivered' : 'all on time', over.length ? 'r' : 'g', 'f:overdue') +
      kpi('Delivered', delS.length, scopeLabel(), 'g', 'f:delivered') + kpi('Cartons', nf(ctnS), 'CTN · ' + scopeLabel(), '', '') +
      kpi('Supplier payments due', supDue.length, '$ ' + nf(sum(supDue, 'invAmt')) + (supDue.some(function (r) { return !num(r.invAmt); }) ? ' + amounts missing' : ''), supDue.length ? 'o' : 'g', 'pay') +
      kpi('Freight payments due', frDue.length, '$ ' + nf(sum(frDue, 'frAmt')) + (frDue.some(function (r) { return !num(r.frAmt); }) ? ' + amounts missing' : ''), frDue.length ? 'o' : 'g', 'pay') + '</div>';
    // pipeline
    h += '<div class="pn' + cl('board') + '" id="eg-board" data-egp="board"><h3 class="egt" data-egtg="board">' + ar('board') + 'Shipment pipeline <span class="mu">every open shipment, all months · tap a card for details' + (can('egEdit') ? ', use the green button to move it to the next step' : '') + '</span></h3><div class="egpl">' +
      ST.slice(0, 7).map(function (s, i) { var l = all.filter(function (r) { return stg(r) === i; }).sort(function (a, b) { return Number(isOver(b)) - Number(isOver(a)) || (stuck(b) || 0) - (stuck(a) || 0); });
        return '<div class="egcol"><div class="egcol-h" style="border-color:' + s.c + '"><b>' + esc(s.t) + '</b><span>' + l.length + '</span></div>' + (l.length ? l.map(cardHtml).join('') : '<div class="egempty">Nothing here</div>') + '</div>'; }).join('') +
      '</div><div class="mu" style="margin-top:6px">Closed (purchase booked): ' + all.filter(function (r) { return stg(r) === 7; }).length + ' shipments.</div></div>';
    // payments + transit
    var payRow = function (r, kind) { var amt = kind === 'sup' ? r.invAmt : r.frAmt, st2 = kind === 'sup' ? r.supPay : r.frPay;
      return '<tr><td><a data-ei="' + r._i + '"><b>' + esc(ref(r)) + '</b></a><div class="mu">' + esc(r.month) + ' · INV ' + esc(r.inv || '-') + '</div></td><td>' + esc(kind === 'sup' ? supName(r.supplier) || '-' : r.vehicle || '-') + '</td><td>' + esc(st2 || 'Unpaid') + '</td><td class="n">' + (num(amt) ? '$ ' + nf(amt) : '<span class="late">missing</span>') + '</td><td>' +
        (can('egEdit') ? '<button type="button" class="sm" data-egx="paid" data-k="' + kind + '" data-i="' + r._i + '">Mark paid</button>' : '') + '</td></tr>'; };
    var payT = function (l, kind) { return l.length ? '<div class="tw"><table class="egtb egpay"><thead><tr><th>Shipment</th><th>' + (kind === 'sup' ? 'Supplier' : 'Truck') + '</th><th>Status</th><th class="n">Amount</th><th></th></tr></thead><tbody>' + l.map(function (r) { return payRow(r, kind); }).join('') +
      '</tbody><tfoot><tr><td colspan="3"><b>Total</b></td><td class="n"><b>$ ' + nf(sum(l, kind === 'sup' ? 'invAmt' : 'frAmt')) + '</b></td><td></td></tr></tfoot></table></div>' : '<div class="mu">All paid.</div>'; };
    h += '<div class="grid2"><div class="pn' + cl('pay') + '" id="eg-pay" data-egp="pay"><h3 class="egt" data-egtg="pay">' + ar('pay') + 'Payments due</h3><div class="egsub' + cl('paysup') + '" data-egp="paysup"><b class="egst" data-egtg="paysup">' + ar('paysup') + 'Supplier payments (' + supDue.length + ')</b>' + payT(supDue, 'sup') + '</div><div class="egsub' + cl('payfr') + '" data-egp="payfr"><b class="egst" data-egtg="payfr">' + ar('payfr') + 'Truck freight payments (' + frDue.length + ')</b>' + payT(frDue, 'fr') + '</div>' + '</div>';
    h += '<div class="pn' + cl('transit') + '" data-egp="transit"><h3 class="egt" data-egtg="transit">' + ar('transit') + 'Transit times <span class="mu">average days · ' + esc(scopeLabel()) + '</span></h3>' + transitHtml(sc) + '</div></div>';
    // needs fixing + suppliers
    var fixL = fixes.filter(function (f) { return inScope(f.r) || stg(f.r) <= 6; });
    h += '<div class="grid2"><div class="pn' + cl('fix') + '" id="eg-fix" data-egp="fix"><h3 class="egt" data-egtg="fix">' + ar('fix') + 'Needs fixing <span class="mu">' + fixL.length + ' issue(s) · fix them so reports are right</span></h3>' +
      (fixL.length ? '<div class="egfx">' + fixL.map(function (f) { return '<div class="egfi ' + f.c.lvl + '"><span><b>' + esc(ref(f.r)) + '</b> <span class="mu">' + esc(f.r.month) + ' · SR ' + esc(f.r.sr) + '</span><br>' + esc(f.c.m) + '</span>' +
        (can('egEdit') ? '<button type="button" class="sm" data-egx="fix" data-sec="' + f.c.sec + '" data-i="' + f.r._i + '">Fix</button>' : '') + '</div>'; }).join('') + '</div>' : '<div class="mu">✓ No problems found.</div>') + '</div>';
    h += '<div class="pn' + cl('sup') + '" data-egp="sup"><h3 class="egt" data-egtg="sup">' + ar('sup') + 'Suppliers <span class="mu">' + esc(scopeLabel()) + '</span></h3>' + supplierHtml(sc) + '</div></div>';
    h += '<div class="pn' + cl('trend') + '" data-egp="trend"><h3 class="egt" data-egtg="trend">' + ar('trend') + 'Monthly trend</h3>' + trendHtml() + '</div>';
    host.innerHTML = h; }
  function transitHtml(l) {
    var rows = LEGS.map(function (g) { var v = []; l.forEach(function (r) { var x = dd(r[g[1]], r[g[2]]); if (x != null && x >= 0) v.push(x); });
      if (!v.length) return '<tr><td>' + esc(g[0]) + '</td><td class="n mu" colspan="3">no dates yet</td></tr>';
      var a = v.reduce(function (s, x) { return s + x; }, 0) / v.length;
      return '<tr' + (/door/i.test(g[0]) ? ' class="tot"' : '') + '><td>' + esc(g[0]) + '</td><td class="n"><b>' + a.toFixed(1) + '</b></td><td class="n mu">' + Math.min.apply(null, v) + '–' + Math.max.apply(null, v) + '</td><td class="n mu">' + v.length + '</td></tr>'; }).join('');
    return '<div class="tw"><table class="egtb"><thead><tr><th>Leg</th><th class="n">Avg days</th><th class="n">Range</th><th class="n">Trips</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="mu" style="margin-top:6px">Border times fill in as you move shipments step by step; each step records its date.</div>'; }
  function supplierHtml(l) {
    var m = {}, o = []; l.forEach(function (r) { var k = supName(r.supplier) || '(supplier not entered)'; if (!m[k]) { m[k] = { n: 0, ctn: 0, del: 0, d2d: [], ot: 0, amt: 0 }; o.push(k); } var x = m[k]; x.n++; x.ctn += ctnOf(r); x.amt += num(r.invAmt);
      if (stg(r) >= 6) { x.del++; var t = dd(r.actual, r.delivered); if (t != null && t >= 0) x.d2d.push(t); if (r.eta && r.delivered && r.delivered <= r.eta) x.ot++; } });
    if (!o.length) return '<div class="mu">No shipments.</div>';
    o.sort(function (a, b) { return m[b].ctn - m[a].ctn; });
    return '<div class="tw"><table class="egtb"><thead><tr><th>Supplier</th><th class="n">Shipments</th><th class="n">CTN</th><th class="n">Invoice $</th><th class="n">Avg days</th><th class="n">On time</th></tr></thead><tbody>' + o.map(function (k) { var x = m[k];
      return '<tr><td>' + esc(k) + '</td><td class="n">' + x.n + '</td><td class="n">' + nf(x.ctn) + '</td><td class="n">' + (x.amt ? nf(x.amt) : '-') + '</td><td class="n">' + (x.d2d.length ? (x.d2d.reduce(function (a, b) { return a + b; }, 0) / x.d2d.length).toFixed(1) : '-') + '</td><td class="n">' + (x.del ? Math.round(x.ot / x.del * 100) + '%' : '-') + '</td></tr>'; }).join('') + '</tbody></table></div>'; }
  function trendHtml() {
    var ms = E.months.map(function (m) { var l = E.rows.filter(function (r) { return r.month === m; }), c = 0; l.forEach(function (r) { c += ctnOf(r); }); return { m: m, n: l.length, c: c, d: l.filter(function (r) { return stg(r) >= 6; }).length }; }).filter(function (x) { return x.n; });
    if (!ms.length) return '<div class="mu">No data.</div>';
    var mx = Math.max.apply(null, ms.map(function (x) { return x.c; })) || 1;
    return '<div class="egtr">' + ms.map(function (x) { return '<div class="egtr-r" data-egm="' + esc(x.m) + '"><span><b>' + esc(x.m) + '</b></span><div class="egtr-b"><i style="width:' + Math.max(2, x.c / mx * 100) + '%"></i></div><span class="n">' + x.n + ' shipments · ' + nf(x.c) + ' CTN · ' + x.d + ' delivered</span></div>'; }).join('') + '</div>'; }

  // ------------------------------------------------------------------ small dialogs
  function modal(title, body, okText, onOk) {
    var m = $('egmod'); if (!m) { m = document.createElement('div'); m.id = 'egmod'; document.body.appendChild(m); }
    m.innerHTML = '<div class="egm-b"><div class="egm-h"><b>' + title + '</b><button type="button" data-egm="x">✕</button></div><div class="egm-c">' + body + '</div><div class="egm-e"></div><div class="egm-f"><button type="button" data-egm="x">Cancel</button><button type="button" class="p" data-egm="ok">' + okText + '</button></div></div>';
    m.style.display = 'flex'; var close = function () { m.style.display = 'none'; m.innerHTML = ''; };
    m.onclick = function (e) { var b = e.target.closest('[data-egm]'); if (e.target === m) return close(); if (!b) return; if (b.dataset.egm === 'x') return close();
      var er = m.querySelector('.egm-e'); er.textContent = ''; b.disabled = true; b.textContent = 'Saving…';
      Promise.resolve().then(function () { return onOk(m); }).then(close, function (x) { b.disabled = false; b.textContent = okText; er.textContent = x && x.message || String(x); }); };
    return m; }
  function save(r, v) { return new Promise(function (ok, no) { google.script.run.withSuccessHandler(ok).withFailureHandler(no).saveEgyptEntry({ month: r.month, v: v, row: r.row, orig: { sr: r.sr, container: r.container, inv: r.inv } }, window.APW); })
    .then(function (x) { if (typeof loadEg === 'function') loadEg(); return x; }); }
  function nextStep(r) {
    var s = stg(r); if (s >= 7) return;
    var opts = STEP.slice(s).map(function (x, k) { return '<option value="' + (s + k) + '"' + (k === 0 ? ' selected' : '') + '>' + esc(x.t) + '</option>'; }).join('');
    var body = '<div class="egm-now">Now: <b>' + esc(ST[s].t) + '</b></div><label>Move to<select id="egn-to">' + opts + '</select></label><label>Date<input type="date" id="egn-d" value="' + today() + '"></label>' +
      '<div id="egn-tr" class="egm-g"><label>Truck plate no.<input id="egn-veh" value="' + esc(r.vehicle || '') + '" placeholder="e.g. 1481"></label><label>Container no.<input id="egn-cont" value="' + esc(r.container || '') + '" placeholder="e.g. 8253"></label>' +
      '<label>Driver<input id="egn-drv" value="' + esc(r.driver || '') + '"></label><label>Driver mobile<input id="egn-mob" value="' + esc(r.mobile || '') + '"></label></div><label id="egn-invw">Invoice no. <span class="mu">(optional until purchase booking)</span><input id="egn-inv" value="' + esc(r.inv || '') + '"></label><div class="mu">Skipped steps are marked done without a date; you can add dates later in Edit.</div>';
    var m = modal('Update ' + esc(ref(r)), body, 'Save step', function (m2) {
      var to = Number(m2.querySelector('#egn-to').value), d = m2.querySelector('#egn-d').value, v = {};
      if (!d) throw new Error('Enter the date.');
      if (r.actual && d < r.actual && to > 0) throw new Error('The date is before the dispatch date (' + dlong(r.actual) + ').');
      for (var k = s; k <= to; k++) { var x = STEP[k]; Object.keys(x.set).forEach(function (f) { v[f] = x.set[f]; }); if (x.also) Object.keys(x.also).forEach(function (f) { if (!r[f] || r[f] === 'Not Placed') v[f] = v[f] || x.also[f]; }); if (k === to) v[x.date] = d; }
      var inv = m2.querySelector('#egn-inv').value.trim(); if (inv && inv !== (r.inv || '')) v.inv = inv;
      if (s === 0) { var veh = m2.querySelector('#egn-veh').value.trim(), ct = m2.querySelector('#egn-cont').value.trim().toUpperCase().replace(/\s+/g, '');
        if (veh) v.vehicle = veh; if (ct) v.container = ct; v.driver = m2.querySelector('#egn-drv').value.trim(); v.mobile = m2.querySelector('#egn-mob').value.trim(); if (!r.po) v.po = 'Placed'; }
      if (to >= 6) { var miss = bookMissing(Object.assign({}, r, v)); if (miss.length) throw new Error('To book the purchase, first enter: ' + miss.map(function (x) { return x[0]; }).join(', ') + '. Use ✎ Edit on the card.'); }
      return save(r, v); });
    var tr = m.querySelector('#egn-tr'); tr.style.display = s === 0 ? '' : 'none';
    var iw = function () { m.querySelector('#egn-invw').style.display = !r.inv ? '' : 'none'; }; m.querySelector('#egn-to').addEventListener('change', iw); iw();
    }
  function markPaid(r, kind) {
    var amtK = kind === 'sup' ? 'invAmt' : 'frAmt', body = '<label>Paid on<input type="date" id="egp-d" value="' + today() + '"></label><label>' + (kind === 'sup' ? 'Invoice amount to supplier ($)' : 'Freight amount ($)') + '<input type="number" min="0" step="any" id="egp-a" value="' + esc(r[amtK] || '') + '"></label>';
    modal((kind === 'sup' ? 'Supplier payment · ' : 'Freight payment · ') + esc(ref(r)), body, 'Mark as paid', function (m) { var v = {}, d = m.querySelector('#egp-d').value, a = m.querySelector('#egp-a').value;
      if (!d) throw new Error('Enter the payment date.'); v[kind === 'sup' ? 'supPay' : 'frPay'] = 'Completed'; v[kind === 'sup' ? 'dSupPay' : 'dFrPay'] = d; if (a !== '') v[amtK] = a; return save(r, v); }); }

  // ------------------------------------------------------------------ entry form
  var SEC = [['order', '1 · Order & invoice'], ['items', '2 · Products'], ['truck', '3 · Truck & container'], ['trip', '4 · Journey & dates'], ['pay', '5 · Payments & notes']];
  var STATUSROWS = [['Supplier PO', 'po', [['dPo', 'PO date']]], ['Loading & dispatch', 'loading', [['actual', 'Dispatched on']]], ['KSA border', 'ksa', [['dKsaArr', 'Arrived'], ['dKsa', 'Cleared']]],
    ['Ghuwaifat border (UAE)', 'ghu', [['dGhuArr', 'Arrived'], ['dGhu', 'Cleared']]], ['Warehouse delivery', 'wh', [['delivered', 'Delivered on']]], ['Purchase entry (system booking)', 'purchase', [['dPurchase', 'Booked on']]]];
  // a date implies a status; a finished status gets today's date if none
  var IMPLY = { dPo: ['po', 'Placed'], actual: ['loading', 'Dispatched'], dKsaArr: ['ksa', 'Arrived'], dKsa: ['ksa', 'Cleared'], dGhuArr: ['ghu', 'Arrived'], dGhu: ['ghu', 'Cleared'], delivered: ['wh', 'Delivered'], dPurchase: ['purchase', 'Booked'], dSupPay: ['supPay', 'Completed'], dFrPay: ['frPay', 'Completed'] };
  var DONE = { po: { Placed: 'dPo' }, loading: { Dispatched: 'actual' }, ksa: { Arrived: 'dKsaArr', Cleared: 'dKsa' }, ghu: { Arrived: 'dGhuArr', Cleared: 'dGhu' }, wh: { Delivered: 'delivered' }, purchase: { Booked: 'dPurchase' }, supPay: { Completed: 'dSupPay' }, frPay: { Completed: 'dFrPay' } };
  var RANK = { ksa: ['', 'En Route', 'Arrived', 'Cleared'], ghu: ['', 'En Route', 'Arrived', 'Cleared'] };
  function openForm(r, pre, focus) {
    if (!window.E) { alert('Egypt data is still loading.'); return; }
    r = r && r.month ? r : null; pre = r ? null : (pre || null); window.EGEDIT = r; window.EITEMS = true;
    var o = r || pre || {}, val = function (k) { return o[k] != null ? o[k] : ''; };
    var cur = r ? r.month : ((pre && pre.month && E.months.indexOf(pre.month) >= 0 ? pre.month : (month !== 'ALL' ? month : E.months[E.months.length - 1])) || '');
    var inp = function (k, label, type, extra) { return '<label>' + label + '<input data-e="' + k + '" value="' + esc(val(k)) + '"' + (type === 'date' ? ' type="date"' : type === 'number' ? ' type="number" min="0" step="any"' : '') + (extra || '') + '></label>'; };
    var sel = function (k) { return '<select data-e="' + k + '">' + (typeof egOpt === 'function' ? egOpt(k, val(k)) : '') + '</select>'; };
    var sups = {}; E.rows.forEach(function (x) { if (x.supplier && !OWN.test(x.supplier)) sups[supName(x.supplier)] = 1; });
    var h = '<div class="egf-top"><h2>' + (r ? 'Edit Egypt shipment · ' + esc(r.month) + ' · SR ' + esc(r.sr) : pre ? 'New Egypt shipment from ' + esc(pre.poNo || 'purchase order') : 'New Egypt shipment') + '</h2><button data-x="ov3" type="button">Close</button></div>' +
      '<div class="egf-nav">' + SEC.map(function (x) { return '<button type="button" data-egs="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="egf-sec" id="egs-order"><h3>Order & invoice</h3><div class="g"><label>Month<select id="ef-m"' + (r ? ' disabled' : '') + '>' + E.months.map(function (m) { return '<option' + (m === cur ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></label>' +
      inp('sr', 'SR no.', 'number', ' placeholder="auto"') + inp('supplier', 'Supplier (Egypt)', '', ' list="egf-sup" placeholder="e.g. Wega Foods"') + inp('inv', 'Invoice no.', '', ' placeholder="needed at purchase booking"') + inp('invDate', 'Invoice date', 'date') +
      inp('poNo', 'PO / schedule no.') + '<input type="hidden" data-e="poId" value="' + esc(val('poId')) + '">' + inp('brand', 'Brand') + inp('origin', 'Origin') + inp('sched', 'Planned loading date', 'date') + inp('invAmt', 'Invoice amount to supplier ($)', 'number') + '</div>' +
      '<datalist id="egf-sup">' + Object.keys(sups).sort().map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist></div>' +
      '<div class="egf-sec" id="egs-items"><h3>Products <button id="eai" type="button">+ Add product</button></h3><div id="eits"></div><div class="g" style="margin-top:10px">' + inp('ctn', 'Total CTN (auto)', 'number') + inp('pallets', 'Total pallets (auto)', 'number') + '</div></div>' +
      '<div class="egf-sec" id="egs-truck"><h3>Truck & container</h3><div class="g">' + inp('vehicle', 'Truck plate no.', '', ' placeholder="e.g. 1481"') + '<label>Container no.<input data-e="container" value="' + esc(val('container')) + '" placeholder="e.g. 8253"></label>' +
      inp('driver', 'Driver name') + inp('mobile', 'Driver mobile') + inp('frAmt', 'Freight amount ($)', 'number') + '</div></div>' +
      '<div class="egf-sec" id="egs-trip"><h3>Journey & dates <span class="mu">pick a status or type a date; the other fills itself</span></h3><div class="egj">' +
      STATUSROWS.map(function (x) { return '<div class="egj-r"><span class="egj-l">' + x[0] + '</span>' + sel(x[1]) + x[2].map(function (d) { return '<label class="egj-d">' + d[1] + '<input type="date" data-e="' + d[0] + '" value="' + esc(val(d[0])) + '"></label>'; }).join('') + '</div>'; }).join('') +
      '</div><div class="mu" style="margin-top:6px">ETA in the UAE = dispatch date + ' + esc((window.BST && BST.settings && BST.settings.transitDays) || 8) + ' days.</div></div>' +
      '<div class="egf-sec" id="egs-pay"><h3>Payments & notes</h3><div class="egj">' + [['Supplier payment', 'supPay', 'dSupPay'], ['Freight payment (truck)', 'frPay', 'dFrPay']].map(function (x) { return '<div class="egj-r"><span class="egj-l">' + x[0] + '</span>' + sel(x[1]) + '<label class="egj-d">Paid on<input type="date" data-e="' + x[2] + '" value="' + esc(val(x[2])) + '"></label></div>'; }).join('') + '</div>' +
      '<label style="display:block;margin-top:10px">Remarks<textarea data-e="remarks" rows="3">' + esc(val('remarks')) + '</textarea></label></div>' +
      '<div class="egf-chk" id="egf-chk"></div>' +
      '<div class="egf-foot"><button id="edel" type="button" style="' + (r && can('egDel') ? '' : 'visibility:hidden') + '">Delete</button><span><button data-x="ov3" type="button">Cancel</button> <button class="p" id="esv" type="button">' + (r ? 'Save changes' : 'Save shipment') + '</button></span></div>';
    var fm = $('eform'); fm.innerHTML = h; fm.classList.add('egf');
    var its = (r || pre) ? itemsOf(r || pre) : [], ob = String(val('batch') || '').trim();
    if (ob && its.length && its.every(function (i) { return !i.b; })) its.forEach(function (i) { i.b = ob; });
    if (its.length) its.forEach(egAddItem); else egAddItem();
    if (r) ['ctn', 'pallets'].forEach(function (k) { var e = fm.querySelector('[data-e="' + k + '"]'); if (e && val(k) !== '') e.dataset.man = 1; });
    if (!r) { var og = fm.querySelector('[data-e="origin"]'); if (og && !og.value) og.value = 'Egypt'; }
    $('eai').onclick = function () { egAddItem(); };
    var Q = function (k) { return fm.querySelector('[data-e="' + k + '"]'); };
    var ci = function () {};
    var live = function () { var v = collect(true), l = checks(Object.assign({ position: posOf(v) }, v)); $('egf-chk').innerHTML = l.length ? '<b>Checks</b>' + l.map(function (c) { return '<div class="' + c.lvl + '">' + (c.lvl === 'e' ? '✖ ' : '⚠ ') + esc(c.m) + '</div>'; }).join('') : '<b>✓ Checks passed</b>'; };
    fm.oninput = function (e) { var t = e.target; if (t.dataset.e === 'container') ci(); clearTimeout(fm._t); fm._t = setTimeout(live, 250); };
    fm.onchange = function (e) { var t = e.target, k = t.dataset.e; if (!k) return;
      if (IMPLY[k] && t.value) { var s2 = Q(IMPLY[k][0]), want = IMPLY[k][1], rk = RANK[IMPLY[k][0]]; if (s2 && (!rk || rk.indexOf(s2.value) < rk.indexOf(want))) { if (![].some.call(s2.options, function (x) { return x.value === want; })) s2.insertAdjacentHTML('beforeend', '<option>' + want + '</option>'); s2.value = want; } }
      if (DONE[k] && DONE[k][t.value]) { var dk = DONE[k][t.value], de = Q(dk); if (de && !de.value) { de.value = today(); de.classList.add('xfill'); } }
      if (k === 'loading' && t.value === 'Dispatched' && !Q('ksa').value) Q('ksa').value = 'En Route';
      if (k === 'ksa' && t.value === 'Cleared' && !Q('ghu').value) Q('ghu').value = 'En Route';
      live(); };
    fm.querySelector('.egf-nav').onclick = function (e) { var b = e.target.closest('[data-egs]'); if (b) $('egs-' + b.dataset.egs).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    function posOf(v) { var dl = v.wh === 'Delivered' || v.wh === 'Arrived'; return v.purchase === 'Booked' ? 'Closed - Purchase Booked' : dl ? 'Delivered to Warehouse' : v.ghu === 'Cleared' ? 'Out for Delivery' : v.ghu === 'Arrived' ? 'At Ghuwaifat Border' : (v.ksa === 'Cleared' || v.ghu === 'En Route') ? 'En Route to Ghuwaifat' : v.ksa === 'Arrived' ? 'At KSA Border' : (v.loading === 'Dispatched' || v.ksa === 'En Route') ? 'En Route to KSA Border' : 'Pre-Shipment'; }
    function collect(quiet) { var v = {}; fm.querySelectorAll('[data-e]').forEach(function (e) { v[e.dataset.e] = String(e.value || '').trim(); }); v.container = v.container.toUpperCase().replace(/\s+/g, '');
      var lines = [], bs = []; fm.querySelectorAll('#eits .er').forEach(function (x) { var n = x.querySelector('.in').value.trim(), p = x.querySelector('.ip').value.trim(), c = x.querySelector('.ic').value.trim(), l = x.querySelector('.il').value.trim(), b = x.querySelector('.ib').value.trim().replace(/[\[\]]/g, '');
        if (!n) return; lines.push(n + (p ? ' (' + p + ')' : '') + (c ? ': ' + Number(c).toLocaleString('en-US') + ' ctn' : '') + (l ? ' / ' + l + ' plt' : '') + (b ? ' [Batch: ' + b + ']' : '')); if (b && bs.indexOf(b) < 0) bs.push(b); });
      v.items = lines.join('\n'); v.batch = bs.join(', '); return v; }
    $('esv').onclick = function () { var v = collect(), m = $('ef-m').value;
      if (v.purchase === 'Booked') { var miss = bookMissing(v); if (miss.length) { alert('To mark the purchase as booked, first enter:\n• ' + miss.map(function (x) { return x[0]; }).join('\n• ')); $('egs-' + miss[0][1]).scrollIntoView(); return; } }
      if (!v.items && !v.container && !v.supplier) { alert('Enter at least one product, the container number or the supplier.'); return; }
      if (v.actual && v.delivered && v.delivered < v.actual) { alert('The delivery date is before the dispatch date.'); $('egs-trip').scrollIntoView(); return; }
      if (!r && !v.sr) delete v.sr;
      $('esv').disabled = true; $('esv').textContent = 'Saving…';
      google.script.run.withSuccessHandler(function (x) { if (window.DIRTY) DIRTY.ov3 = false; hide('ov3'); hide('ov2'); month = m; $('msg').textContent = (r ? 'Updated in ' : 'Saved to ') + m + '.';
        if (pre && pre.poId && window.BST) BST.call('linkPO', pre.poId, { ref: x && x.row || '', label: (v.inv || '') + (v.container ? ' · ' + v.container : ''), month: m }).catch(function () {}); loadEg(); })
        .withFailureHandler(function (e) { $('esv').disabled = false; $('esv').textContent = r ? 'Save changes' : 'Save shipment'; alert(e.message); })
        .saveEgyptEntry({ month: m, v: v, row: r && r.row, orig: r ? { sr: r.sr, container: r.container, inv: r.inv } : undefined }, window.APW); };
    if (r) $('edel').onclick = function () { if (!confirm('Delete shipment ' + ref(r) + ' from ' + r.month + '? This cannot be undone.')) return;
      google.script.run.withSuccessHandler(function () { if (window.DIRTY) DIRTY.ov3 = false; hide('ov3'); hide('ov2'); $('msg').textContent = 'Deleted from ' + r.month + '.'; loadEg(); }).withFailureHandler(function (e) { alert(e.message); }).deleteEgyptEntry({ month: r.month, row: r.row, orig: { sr: r.sr, container: r.container, inv: r.inv } }, window.APW); };
    ci(); live(); show('ov3');
    if (focus) setTimeout(function () { var s3 = $('egs-' + focus); if (s3) s3.scrollIntoView({ block: 'start' }); }, 60); }

  // ------------------------------------------------------------------ details: journey timeline with dates
  function timeline(r) {
    var s = stg(r), pts = [['Loading planned', r.sched, 0], ['Dispatched from Egypt', r.actual, 1], ['Arrived KSA border', r.dKsaArr, 2], ['Cleared KSA border', r.dKsa, 3], ['Arrived Ghuwaifat', r.dGhuArr, 4], ['Cleared Ghuwaifat', r.dGhu, 5], ['Delivered to warehouse', r.delivered, 6], ['Purchase booked', r.dPurchase, 7]];
    return '<div class="egtl">' + pts.map(function (p, i) { var done = i === 0 ? s >= 1 || !!p[1] : s >= p[2], prev = i ? pts[i - 1][1] : null, gap = p[1] && prev ? dd(prev, p[1]) : null;
      return '<div class="egtl-i ' + (done ? 'd' : s === p[2] - 1 ? 'n' : '') + '"><i></i><span><b>' + esc(p[0]) + '</b><br><span class="mu">' + (p[1] ? esc(dlong(p[1])) + (gap != null && gap >= 0 ? ' · ' + gap + ' d' : '') : done ? 'done · no date' : '—') + '</span></span></div>'; }).join('') + '</div>' +
      '<div class="ms" style="margin-top:8px"><span class="chip ' + (r.supPay === 'Completed' ? 'cg' : 'co') + '">Supplier payment: ' + esc(r.supPay || 'Not updated') + (r.dSupPay ? ' · ' + esc(dlong(r.dSupPay)) : '') + '</span> <span class="chip ' + (r.frPay === 'Completed' ? 'cg' : 'co') + '">Freight payment: ' + esc(r.frPay || 'Not updated') + (r.dFrPay ? ' · ' + esc(dlong(r.dFrPay)) : '') + '</span></div>'; }

  // ------------------------------------------------------------------ Egypt report (print / PDF)
  function report() {
    var o = $('ovegr'); if (!o) { o = document.createElement('div'); o.id = 'ovegr'; document.body.appendChild(o); }
    var per = typeof month !== 'undefined' ? month : 'ALL';
    o.innerHTML = '<div class="egr-bar"><b>Egypt report</b><select id="egr-p"><option value="ALL">All months</option>' + E.months.map(function (m) { return '<option' + (m === per ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select><button type="button" class="p" id="egr-print">🖨 Print / save as PDF</button><button type="button" id="egr-x">Close</button></div><div class="egr-doc" id="egr-doc"></div>';
    var draw = function () { $('egr-doc').innerHTML = reportHtml($('egr-p').value); };
    $('egr-p').onchange = draw; $('egr-x').onclick = function () { o.style.display = 'none'; };
    $('egr-print').onclick = function () { pageStyle(true); document.body.classList.add('egr-print'); setTimeout(function () { window.print(); }, 50); };
    draw(); o.style.display = 'block'; }
  // landscape pages for this report only (the other reports print portrait)
  function pageStyle(on) { var e = $('egr-pg'); if (on && !e) { e = document.createElement('style'); e.id = 'egr-pg'; e.textContent = '@page{size:A4 landscape;margin:8mm}'; document.head.appendChild(e); } if (!on && e) e.remove(); }
  window.addEventListener('afterprint', function () { document.body.classList.remove('egr-print'); pageStyle(false); });
  function reportHtml(per) {
    var l = E.rows.filter(function (r) { return per === 'ALL' || r.month === per; }), ctn = 0; l.forEach(function (r) { ctn += ctnOf(r); });
    var sum = function (x, k) { var t = 0; x.forEach(function (r) { t += num(r[k]); }); return t; };
    var del = l.filter(function (r) { return stg(r) >= 6; }), over = l.filter(function (r) { return isOver(r); }), supDue = l.filter(function (r) { return r.supPay !== 'Completed'; }), frDue = l.filter(function (r) { return stg(r) >= 1 && r.frPay !== 'Completed'; });
    var fix = 0; l.forEach(function (r) { fix += checks(r).length; });
    var k = [['Shipments', l.length], ['Cartons (CTN)', nf(ctn)], ['Delivered', del.length], ['In transit / at borders', l.filter(function (r) { var s = stg(r); return s >= 1 && s <= 5; }).length], ['Overdue', over.length],
      ['Invoice value', '$ ' + nf(sum(l, 'invAmt'))], ['Freight', '$ ' + nf(sum(l, 'frAmt'))], ['Supplier payments due', supDue.length + ' · $ ' + nf(sum(supDue, 'invAmt'))], ['Freight payments due', frDue.length + ' · $ ' + nf(sum(frDue, 'frAmt'))], ['Data issues', fix]];
    var rows = l.slice().sort(function (a, b) { return (a.month === b.month ? 0 : E.months.indexOf(a.month) - E.months.indexOf(b.month)) || num(a.sr) - num(b.sr); });
    return '<div class="egr-h"><div><h1>Egypt import shipments report</h1><div>Baniyas Spike Trading · ' + esc(per === 'ALL' ? 'All months' : per) + ' · printed ' + esc(dlong(today())) + '</div></div></div>' +
      '<div class="egr-k">' + k.map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div>' +
      '<h3>Shipments</h3><table class="egr-t"><thead><tr><th>SR</th><th>Month</th><th>Container / truck</th><th>Supplier</th><th>Invoice</th><th>Products</th><th class="n">CTN</th><th>Dispatched</th><th>KSA cleared</th><th>Ghuwaifat cleared</th><th>Delivered</th><th class="n">Days</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (r) { var t = dd(r.actual, r.delivered); return '<tr><td>' + esc(r.sr) + '</td><td>' + esc(r.month) + '</td><td>' + esc(r.container || '-') + (r.vehicle ? '<br><small>' + esc(r.vehicle) + '</small>' : '') + '</td><td>' + esc(supName(r.supplier) || '-') + '</td><td>' + esc(r.inv || '-') + '</td><td>' +
        itemsOf(r).map(function (i) { return esc(i.n) + (i.b ? ' <small>(' + esc(i.b) + ')</small>' : ''); }).join('<br>') + '</td><td class="n">' + nf(ctnOf(r)) + '</td><td>' + esc(dshow(r.actual) || '-') + '</td><td>' + esc(dshow(r.dKsa) || (stg(r) >= 3 ? '✓' : '-')) + '</td><td>' + esc(dshow(r.dGhu) || (stg(r) >= 5 ? '✓' : '-')) + '</td><td>' + esc(dshow(r.delivered) || '-') + '</td><td class="n">' + (t != null && t >= 0 ? t : '') + '</td><td>' + esc(ST[stg(r)].s) + (isOver(r) ? ' · <b>' + esc(r.alert) + '</b>' : '') + '</td></tr>'; }).join('') +
      '<tr class="tot"><td colspan="6">Total ' + l.length + ' shipments</td><td class="n">' + nf(ctn) + '</td><td colspan="6"></td></tr></tbody></table>' +
      '<div class="egr-2"><div><h3>Transit times</h3>' + transitHtml(l) + '</div><div><h3>Suppliers</h3>' + supplierHtml(l) + '</div></div>' +
      '<h3>Payments due</h3><table class="egr-t"><thead><tr><th>Shipment</th><th>Supplier</th><th>Supplier payment</th><th class="n">Invoice $</th><th>Freight payment</th><th class="n">Freight $</th></tr></thead><tbody>' +
      l.filter(function (r) { return r.supPay !== 'Completed' || (stg(r) >= 1 && r.frPay !== 'Completed'); }).map(function (r) { return '<tr><td>' + esc(ref(r)) + ' <small>' + esc(r.month) + '</small></td><td>' + esc(supName(r.supplier) || '-') + '</td><td>' + esc(r.supPay || 'Unpaid') + '</td><td class="n">' + (num(r.invAmt) ? nf(r.invAmt) : '-') + '</td><td>' + esc(r.frPay || 'Unpaid') + '</td><td class="n">' + (num(r.frAmt) ? nf(r.frAmt) : '-') + '</td></tr>'; }).join('') + '</tbody></table>'; }

  // ------------------------------------------------------------------ wiring
  var css = document.createElement('style');
  css.textContent = [
    '#egdash{margin-bottom:12px}.egh{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap;margin:4px 0 12px}.egh h2{margin:0;font-size:20px}.egh-b{display:flex;gap:8px;flex-wrap:wrap}.warnb{border-color:#f0c43c;background:#fff8e1}',
    '.egks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.egk{background:#fff;border:1px solid var(--bd);border-left:4px solid #8a94a6;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;cursor:pointer;min-width:0}.egk span{font-size:12px;color:var(--mu);font-weight:600}.egk b{font-size:24px;line-height:1.1}.egk em{font-style:normal;font-size:12px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.egk.b{border-left-color:var(--bl)}.egk.o{border-left-color:var(--wa)}.egk.r{border-left-color:var(--er)}.egk.r b{color:var(--er)}.egk.g{border-left-color:var(--ac)}.egk:hover{box-shadow:0 2px 10px rgba(0,0,0,.06)}',
    '[data-egtg]{cursor:pointer;user-select:none}.egar{display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;border-radius:6px;background:#eef6f1;color:var(--acd);font-size:12px;margin-right:6px;flex:none}[data-egtg]:hover .egar{background:var(--ac);color:#fff}' +
    '.grid2>.pn.egcl{align-self:start}.pn.egcl>:not(.egt){display:none!important}.pn.egcl .egt{margin-bottom:0}.egsub.egcl>:not(.egst){display:none!important}.egst{display:flex!important;align-items:center}' +
    '.egt{margin:0 0 10px;font-size:15px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.egt .mu{font-weight:400;font-size:12px}.egst{display:block;margin:8px 0 4px;font-size:13px}',
    '.egpl{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(196px,1fr);gap:10px;overflow-x:auto;padding-bottom:6px}.egcol{background:#f6f8fa;border-radius:10px;padding:8px;min-height:120px}.egcol-h{display:flex;justify-content:space-between;align-items:center;border-top:3px solid;padding:6px 2px 8px;font-size:13px}.egcol-h span{background:#fff;border-radius:999px;padding:1px 9px;font-weight:700;border:1px solid var(--bd)}',
    '.egc{background:#fff;border:1px solid var(--bd);border-radius:10px;margin-bottom:8px;overflow:hidden}.egc.late{border-color:var(--er);box-shadow:inset 3px 0 0 var(--er)}.egc-m{padding:8px 10px;cursor:pointer}.egc-t{display:flex;justify-content:space-between;gap:6px}.egc-s{font-size:13px;margin:2px 0}.egc-f{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px;font-size:12px}',
    '.egb{font-size:11px;border-radius:999px;padding:1px 7px;background:#eef1f5;font-weight:600}.egb.r{background:#fde8e8;color:var(--er)}.egb.o{background:#fff3dc;color:var(--wa)}.egb.w{background:#fff8e1;color:#8a6100}',
    '.egc-a{display:flex;gap:6px;padding:0 10px 8px}.egc-a button{font-size:12px;padding:5px 8px}.egc-a button.p{flex:1}.egempty{color:var(--mu);font-size:12px;text-align:center;padding:16px 0}',
    '.egtb{width:100%;border-collapse:collapse;font-size:13px;min-width:0}.egtb th,.egtb td{padding:6px 8px;border-bottom:1px solid var(--bd);text-align:left;vertical-align:top}.egtb th{font-size:12px;color:var(--mu)}.egtb .n{text-align:right;white-space:nowrap}.egtb button.sm{white-space:nowrap}.egtb tr.tot td{font-weight:700;background:#f6f8fa}.egtb a{cursor:pointer}.egtb button.sm{padding:4px 8px;font-size:12px}',
    '.egfx{max-height:360px;overflow:auto}.egfi{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:7px 4px;border-bottom:1px solid var(--bd);font-size:13px}.egfi.e{box-shadow:inset 3px 0 0 var(--er)}.egfi.w{box-shadow:inset 3px 0 0 #f0c43c}.egfi span{padding-left:6px}.egfi button{padding:4px 12px;font-size:12px}',
    '.egtr-r{display:grid;grid-template-columns:90px 1fr auto;gap:10px;align-items:center;padding:4px 0;font-size:13px;cursor:pointer}.egtr-b{background:#eef1f5;border-radius:6px;height:14px;overflow:hidden}.egtr-b i{display:block;height:100%;background:var(--ac);border-radius:6px}',
    '#egmod{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:90;display:none;align-items:center;justify-content:center;padding:14px}.egm-b{background:#fff;border-radius:14px;width:min(520px,100%);max-height:92vh;overflow:auto;padding:16px}.egm-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:16px}',
    '.egm-c label{display:block;margin-top:8px;font-size:13px;font-weight:600}.egm-c input,.egm-c select{width:100%;margin-top:4px}.egm-g{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.egm-now{background:#f6f8fa;border-radius:8px;padding:8px 10px;font-size:13px}.egm-e{color:var(--er);font-size:13px;margin-top:8px}.egm-f{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}',
    'small.bad,.egf small.bad{color:var(--er)}small.ok{color:var(--acd)}',
    '.egf .egf-top{display:flex;justify-content:space-between;align-items:center}.egf .egf-top h2{margin:0;font-size:17px}.egf-nav{position:sticky;top:-1px;z-index:3;background:#fff;display:flex;gap:6px;overflow-x:auto;padding:10px 0;border-bottom:1px solid var(--bd)}.egf-nav button{white-space:nowrap;font-size:12px;padding:6px 10px;border-radius:999px}',
    '.egf-sec{border:1px solid var(--bd);border-radius:12px;padding:12px;margin-top:12px;scroll-margin-top:60px}.egf-sec h3{margin:0 0 8px;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:8px}.egf-sec h3 .mu{font-weight:400;font-size:12px;flex:1}',
    '.egj-r{display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(120px,1fr) repeat(2,minmax(130px,1fr));gap:8px;align-items:end;padding:6px 0;border-bottom:1px dashed var(--bd)}.egj-l{font-weight:600;font-size:13px;align-self:center}.egj-d{font-size:12px}',
    '.egf-chk{margin-top:12px;padding:10px 12px;border-radius:10px;background:#f6f8fa;font-size:13px}.egf-chk .e{color:var(--er)}.egf-chk .w{color:#8a6100}.egf-foot{position:sticky;bottom:-1px;background:#fff;display:flex;justify-content:space-between;gap:8px;padding:12px 0 2px;margin-top:10px;border-top:1px solid var(--bd)}',
    '.egtl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:6px}.egtl-i{display:flex;gap:8px;font-size:12px;align-items:flex-start}.egtl-i i{width:12px;height:12px;border-radius:50%;border:2px solid #c3cad5;margin-top:2px;flex:none}.egtl-i.d i{background:var(--ac);border-color:var(--ac)}.egtl-i.n i{border-color:var(--bl);box-shadow:0 0 0 3px #dbe7ff}',
    '#ovegr{position:fixed;inset:0;background:#e9edf2;z-index:95;overflow:auto;display:none}.egr-bar{position:sticky;top:0;background:#fff;display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--bd);flex-wrap:wrap}.egr-bar b{flex:1}',
    '.egr-doc{background:#fff;max-width:1100px;margin:16px auto;padding:24px;font-size:12px}.egr-h h1{margin:0 0 4px;font-size:20px}.egr-k{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:14px 0}.egr-k div{border:1px solid var(--bd);border-radius:8px;padding:8px}.egr-k span{display:block;color:var(--mu);font-size:11px}.egr-k b{font-size:15px}',
    '.egr-t{width:100%;border-collapse:collapse;margin-bottom:12px}.egr-t th,.egr-t td{border:1px solid #d5dbe3;padding:4px 6px;text-align:left;vertical-align:top}.egr-t th{background:#f1f4f7;font-size:11px;white-space:normal}.egr-t td{white-space:normal}.egr-t .n{text-align:right}.egr-t tr.tot td{font-weight:700;background:#f6f8fa}.egr-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.egr-doc h3{margin:14px 0 6px;font-size:14px}',
    '.egr-doc table{min-width:0!important;width:100%}.egr-doc .tw{overflow:visible}.egr-doc .egtb{font-size:11px}',
    '@media print{body.egr-print>*:not(#ovegr){display:none!important}body.egr-print .egr-doc{font-size:10px}body.egr-print .egr-t th,body.egr-print .egr-t td{padding:3px 4px}body.egr-print .egr-t tr{break-inside:avoid}body.egr-print #ovegr{position:static;display:block!important;background:#fff}body.egr-print .egr-bar{display:none}body.egr-print .egr-doc{margin:0;max-width:none;padding:0}}',
    '@media(max-width:760px){.egpay td:nth-child(3),.egpay th:nth-child(3){display:none}.egks{grid-template-columns:repeat(2,minmax(0,1fr))}.egk b{font-size:20px}.egj-r{grid-template-columns:1fr 1fr}.egj-l{grid-column:1/-1}.egtl{grid-template-columns:1fr 1fr}.egr-k{grid-template-columns:repeat(2,1fr)}.egr-2{grid-template-columns:1fr}.egpl{grid-auto-columns:minmax(240px,85%)}}'
  ].join('\n');
  document.head.appendChild(css);

  function setup() {
    var sec = $('eg'); if (!sec || $('egdash')) return;
    var d = document.createElement('div'); d.id = 'egdash'; var hl = $('hl-eg'); (hl || sec.firstChild).insertAdjacentElement('afterend', d);
    // the old overview panels are replaced by the dashboard
    var hideP = function (id) { var e = $(id); if (!e) return; var p = e.closest('.grid2') || e.closest('.pn'); if (p) p.style.display = 'none'; };
    ['ecards', 'epos', 'eatt'].forEach(hideP); if (hl) hl.style.display = 'none'; var ea = $('eadd'); if (ea && ea.closest('.tools')) ea.closest('.tools').style.display = 'none';
    d.addEventListener('click', function (e) {
      var tg = e.target.closest('[data-egtg]'); if (tg && !e.target.closest('a,button')) return fold(tg.dataset.egtg);
      var b = e.target.closest('[data-egx],[data-egk],[data-egm]'); if (!b) return; var r = b.dataset.i != null ? E.rows[Number(b.dataset.i)] : null;
      if (b.dataset.egm) { month = b.dataset.egm; var em = $('em'); if (em) em.value = month; if (typeof renderAll === 'function') renderAll(); return; }
      if (b.dataset.egk) { var k = b.dataset.egk; if (k === 'board' || k === 'pay' || k === 'fix') { if (FOLD[k]) fold(k); if (k === 'pay') { if (FOLD.paysup) fold('paysup'); if (FOLD.payfr) fold('payfr'); } return $('eg-' + k).scrollIntoView({ behavior: 'smooth' }); }
        if (/^f:/.test(k)) { eF = k.slice(2); if (typeof renderEgReport === 'function') renderEgReport(); var t = $('etb'); if (t) t.closest('.pn').scrollIntoView({ behavior: 'smooth' }); } return; }
      var x = b.dataset.egx; if (x === 'new') return openForm(); if (x === 'report') return report(); if (!r) return;
      if (x === 'next') return nextStep(r); if (x === 'edit') return openForm(r); if (x === 'paid') return markPaid(r, b.dataset.k); if (x === 'fix') return openForm(r, null, b.dataset.sec); }); }
  // take over the Egypt entry form, the overview and the details view
  window.openEg = function (r, pre) { return openForm(r, pre); };
  if (typeof window.renderEg === 'function') { var oRender = window.renderEg; window.renderEg = function () { var x = oRender.apply(this, arguments); try { setup(); render(); } catch (e) { console.error(e); } return x; }; }
  if (typeof window.egDetail === 'function') { var oDet = window.egDetail; window.egDetail = function (r) { var x = oDet.apply(this, arguments);
    try { var hb = [].filter.call(document.querySelectorAll('#dt b'), function (b) { return b.textContent === 'Milestones'; })[0]; if (hb && r) { hb.textContent = 'Journey'; hb.parentNode.querySelector('.ms').outerHTML = timeline(r); }
      var kvb = [].filter.call(document.querySelectorAll('#dt .kv span'), function (s) { return s.textContent === 'Vehicle'; })[0]; if (kvb) kvb.textContent = 'Truck plate no.';
      var kc = [].filter.call(document.querySelectorAll('#dt .kv span'), function (s) { return s.textContent === 'Total CTN'; })[0]; if (kc && r && kc.nextElementSibling && kc.nextElementSibling.textContent.trim() === '-' && ctnOf(r)) kc.nextElementSibling.textContent = nf(ctnOf(r)); } catch (e) {} return x; }; }
  window.BSTEG = { checks: checks, stage: stg, isoOk: isoOk, render: render };
})();
