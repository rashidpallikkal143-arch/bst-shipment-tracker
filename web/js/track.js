/* "Track your shipment": one search box for Egypt and Global shipments, courier-style status table and timeline.
   Search by anything: container, truck plate, invoice, B/L, PO / PI, vessel, supplier, product, batch, order no. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = window.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var can = function (r) { return !!(window.BST && BST.can && BST.can(r)); };
  var nf = function (n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); };
  var isD = function (d) { return /^\d{4}-\d\d-\d\d/.test(d || ''); };
  var today = function () { return String(window.TD || new Date().toISOString()).slice(0, 10); };
  var dlong = function (d) { return isD(d) ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  var CACHE = { at: 0, eg: [], rx: [], items: [], conts: [] }, LAST = [], SEL = null;

  function load(force) {
    if (!force && Date.now() - CACHE.at < 60000) return Promise.resolve(CACHE);
    var call = function (n) { return window.BST && BST.call ? BST.call(n) : Promise.reject(new Error('not signed in')); };
    return Promise.all([can('egView') ? call('getEgyptData').catch(function () { return null; }) : null, can('gView') ? call('getData').catch(function () { return null; }) : null]).then(function (x) {
      CACHE = { at: Date.now(), eg: x[0] && x[0].rows || [], rx: x[1] && x[1].shipments || [], items: x[1] && x[1].items || [], conts: x[1] && x[1].containers || [] }; return CACHE; }); }

  // ------------------------------------------------------------------ one shape for both sections
  function egItems(r) { return typeof egParseItems === 'function' ? egParseItems(r.items) : []; }
  function fromEg(r) {
    var its = egItems(r), ctn = Number(r.ctn) || its.reduce(function (s, i) { return s + (Number(i.c) || 0); }, 0), dl = r.wh === 'Delivered' || r.wh === 'Arrived';
    var ev = [], add = function (d, t, where, icon, done) { ev.push({ d: d, t: t, w: where, i: icon, done: done !== false }); };
    var st = r.position || '', origin = r.origin || 'Egypt';
    // the step the shipment has reached (same order as the Egypt pipeline); every step up to it is shown, with its date when recorded
    var P = ['Pre-Shipment', 'Awaiting Loading', 'En Route to Egypt Border', 'Ferry Transit Egypt to KSA', 'At KSA Border', 'En Route to Ghuwaifat', 'At Ghuwaifat Border', 'On the Road to Warehouse', 'Delivered to Warehouse', 'Closed - Purchase Booked'], at = P.indexOf(st);
    var reached = function (k, d) { return !!d || at >= k; };
    if (r.sched) add(r.sched, 'Loading planned', origin, '📋');
    if (reached(2, r.actual)) add(r.actual, 'Dispatched, on the road to the Egypt border', origin + '  -to-  Egypt border (port)', '🚚');
    if (reached(3, r.dFerry)) add(r.dFerry, 'Ferry transit Egypt to KSA', 'Egypt port  -to-  KSA border', '⛴️');
    if (reached(4, r.dKsaArr)) add(r.dKsaArr, 'Arrived at KSA border', 'Saudi Arabia', '🛃');
    if (reached(5, r.dKsa)) add(r.dKsa, 'Cleared KSA border, on the road to Ghuwaifat', 'KSA  -to-  Ghuwaifat border', '🚚');
    if (reached(6, r.dGhuArr)) add(r.dGhuArr, 'Arrived at Ghuwaifat border', 'Ghuwaifat, UAE', '🛃');
    if (reached(7, r.dGhu)) add(r.dGhu, 'Cleared UAE customs, on the road to the warehouse', 'Ghuwaifat  -to-  warehouse', '🚚');
    if (reached(8, r.delivered) || dl) { add(r.delivered, 'Delivered to warehouse', 'BST warehouse, UAE', '✅');
      var tx = [r.temp === '' || r.temp == null ? '' : (Number(r.temp) > 0 ? '+' : '') + r.temp + ' °C', r.reefer, r.tempNote].filter(Boolean).join(' · ');
      if (tx) { ev[ev.length - 1].x = '🌡 Temperature: ' + tx; ev[ev.length - 1].bad = !!r.reefer && r.reefer !== 'Reefer OK' && r.reefer !== 'Not a reefer (dry cargo)'; } }
    if (reached(9, r.dPurchase)) add(r.dPurchase, 'Purchase booked in the system', 'BST', '🧾');
    if (!dl && r.eta) add(r.eta, 'Expected delivery (ETA)', 'BST warehouse, UAE', '⏳', false);
    return { sc: 'eg', id: r.row, raw: r, ref: r.container || r.vehicle || ('#' + r.sr), sub: 'Egypt · ' + r.month + ' · #' + r.sr,
      status: st || 'Pre-Shipment', alert: !dl && r.alert && /overdue|due/i.test(r.alert) ? r.alert : '', done: dl,
      rows: [['Current Status', st || 'Pre-Shipment'], ['Section', 'Egypt (road)'], ['Origin', origin], ['Destination', 'BST warehouse, UAE (ferry to KSA, then Ghuwaifat)'],
        ['Consignment', [ctn ? nf(ctn) + ' CTN' : '', Number(r.pallets) ? nf(r.pallets) + ' pallets' : '', its.length ? its.length + ' product' + (its.length > 1 ? 's' : '') : ''].filter(Boolean).join(' · ')],
        ['Supplier', r.supplier], ['Invoice no.', r.inv], ['Container no.', r.container], ['Truck plate no.', r.vehicle], ['Driver', [r.driver, r.mobile].filter(Boolean).join(' · ')],
        ['PO / schedule', r.poNo], ['Trucks on this invoice', r.grp ? CACHE.eg.filter(function (x) { return x.grp === r.grp; }).map(function (x) { return (x === r ? '▶ ' : '') + (x.container || x.vehicle || '#' + x.sr) + (x.driver ? ' (' + x.driver + ')' : '') + ' · ' + (x.position || ''); }).join('\n') : ''], ['Temperature', [r.temp === '' || r.temp == null ? '' : r.temp + ' °C', r.reefer, r.tempNote].filter(Boolean).join(' · ')], ['Dispatched', dlong(r.actual)], [dl ? 'Delivered' : 'ETA', dlong(dl ? r.delivered : r.eta)]],
      items: its.map(function (i) { return [i.n + (i.p ? ' (' + i.p + ')' : ''), i.c ? nf(i.c) + ' CTN' : '', i.b ? 'Batch ' + i.b : '']; }),
      ev: ev, hay: [r.sr, 'sr' + r.sr, r.month, r.inv, r.container, r.vehicle, r.driver, r.mobile, r.supplier, r.brand, r.items, r.batch, r.poNo, r.remarks, r.origin].join(' ') }; }
  function fromRx(s) {
    var its = CACHE.items.filter(function (i) { return i.invoice === s.key; }), cs = CACHE.conts.filter(function (c) { return c.key === s.key; });
    var dl = !!s.whDate || /deliver|warehouse|closed|complete/i.test(s.stage || ''), ev = [], add = function (d, t, where, icon, done) { ev.push({ d: d, t: t, w: where, i: icon, done: done !== false }); };
    var mode = /air/i.test(s.line + ' ' + s.stage) ? '✈️' : '🚢', from = s.country || 'Origin', port = s.port || 'UAE port';
    if (s.piDate) add(s.piDate, 'PI / PO issued to supplier', s.supplier || from, '📋');
    if (s.atd) add(s.atd, 'Loaded & departed' + (s.vessel ? ' on ' + s.vessel : ''), from + '  -to-  ' + (s.port1 && !s.ata1 ? s.port1 : port), mode);
    else if (s.etd) add(s.etd, 'Expected departure (ETD)', from, '⏳', s.etd <= today());
    if (s.port1) { if (s.ata1) add(s.ata1, 'Arrived at transshipment port', s.port1 + '  -to-  ' + port, '⚓'); else if (s.eta1) add(s.eta1, 'Expected at transshipment port', s.port1, '⏳', false); }
    if (s.ata) add(s.ata, 'Arrived at port of discharge', port, '⚓'); else if (s.eta) add(s.eta, 'Expected arrival (ETA)', port, '⏳', false);
    if (s.ata && !dl && s.freeEnd) add(s.freeEnd, 'Free days end (detention / demurrage after this)', port, '⏱', s.freeEnd <= today());
    if (s.whDate) add(s.whDate, 'Delivered to warehouse', 'BST warehouse, UAE', '✅');
    var late = !dl && s.eta && !s.ata && s.eta < today();
    return { sc: 'rx', id: s._doc, raw: s, ref: (cs[0] && cs[0].no) || s.bl || s.key, sub: 'Global · ' + s.key + (s.month ? ' · ' + s.month : ''),
      status: s.stage || 'Open', alert: late ? 'ETA passed' : '', done: dl,
      rows: [['Current Status', s.stage || 'Open'], ['Section', 'Global (' + (mode === '✈️' ? 'air' : 'sea') + ')'], ['Origin', s.country], ['Destination', port],
        ['Consignment', [cs.length ? cs.length + ' container' + (cs.length > 1 ? 's' : '') + (cs[0] && cs[0].size ? ' · ' + cs[0].size : '') : (s.contQty ? s.contQty + ' × ' + (s.contSize || 'container') : ''), its.length ? its.length + ' item' + (its.length > 1 ? 's' : '') : ''].filter(Boolean).join(' · ')],
        ['Supplier', s.supplier], ['Shipper', s.shipper], ['Invoice no.', s.invoice || s.key], ['B/L no.', s.bl], ['Shipping line', s.line], ['Vessel / voyage', [s.vessel, s.voyage].filter(Boolean).join(' / ')],
        ['Containers', cs.map(function (c) { return c.no; }).join(', ')], ['PO / PI', [s.po, s.pi].filter(Boolean).join(' / ')], ['Departed', dlong(s.atd || '')], [s.ata ? 'Arrived' : 'ETA', dlong(s.ata || s.eta)], ['Free days end', dlong(s.freeEnd)], ['Payment', s.payment]],
      items: its.map(function (i) { return [i.desc, [i.qty, i.unit].filter(Boolean).join(' '), i.inv && i.inv !== s.key ? 'Inv ' + i.inv : '']; }), conts: cs,
      ev: ev, hay: Object.keys(s).filter(function (k) { return k.charAt(0) !== '_'; }).map(function (k) { return s[k]; }).concat(its.map(function (i) { return i.desc; }), cs.map(function (c) { return c.no + ' ' + c.seal; })).join(' ') }; }

  // ------------------------------------------------------------------ search
  var norm = function (s) { return String(s || '').toLowerCase(); }, tight = function (s) { return norm(s).replace(/[\s\-\/._]/g, ''); };
  function search(q, scope) {
    q = String(q || '').trim(); if (!q) return [];
    var all = (scope !== 'rx' ? CACHE.eg.map(fromEg) : []).concat(scope !== 'eg' ? CACHE.rx.map(fromRx) : []), toks = norm(q).split(/\s+/).filter(Boolean), qt = tight(q);
    var res = all.map(function (x) { var h = norm(x.hay), ht = tight(x.hay), ok = toks.every(function (t) { return h.indexOf(t) >= 0 || ht.indexOf(tight(t)) >= 0; }) || (qt.length >= 4 && ht.indexOf(qt) >= 0);
      if (!ok) return null; var exact = x.rows.some(function (r) { return r[1] && tight(r[1]) === qt; }) || tight(x.ref) === qt; x.score = (exact ? 100 : 0) + (x.done ? 0 : 10); return x; }).filter(Boolean);
    return res.sort(function (a, b) { return b.score - a.score; }); }

  // ------------------------------------------------------------------ page
  function page() {
    var o = $('ovtrk'); if (o) return o;
    o = document.createElement('div'); o.id = 'ovtrk'; document.body.appendChild(o);
    o.innerHTML = '<div class="tk-hd"><div class="tk-in"><button type="button" class="tk-x" id="tk-x" title="Close">✕</button><h1>Track Your Shipment</h1><div class="tk-bc"><a id="tk-home">Home</a> » Track Your Shipment</div></div></div>' +
      '<div class="tk-in"><form class="tk-s" id="tk-f" autocomplete="off"><input id="tk-q" placeholder="Enter container, truck, invoice, B/L, PO, product or batch no."><button type="submit" id="tk-go">🔍 Search</button></form>' +
      '<div class="tk-sc"><label><input type="radio" name="tk-sc" value="all" checked> All</label><label><input type="radio" name="tk-sc" value="eg"> Egypt</label><label><input type="radio" name="tk-sc" value="rx"> Global</label><span class="mu" id="tk-n"></span></div>' +
      '<div id="tk-out"><div class="tk-hint">Type any detail of a shipment: <b>container no.</b>, <b>truck plate</b>, <b>invoice</b>, <b>B/L</b>, <b>PO / PI</b>, <b>vessel</b>, <b>supplier</b>, <b>product</b>, <b>batch</b> or <b>order no.</b>, then press Search.</div></div></div>';
    $('tk-x').onclick = $('tk-home').onclick = close;
    $('tk-f').onsubmit = function (e) { e.preventDefault(); go(); };
    o.querySelectorAll('[name="tk-sc"]').forEach(function (x) { x.onchange = function () { if ($('tk-q').value.trim()) go(); }; });
    o.addEventListener('click', function (e) { var b = e.target.closest('[data-tk]'); if (!b) return; var k = b.dataset.tk;
      if (k === 'pick') { SEL = LAST[Number(b.dataset.i)]; show(SEL, true); }
      if (k === 'back') list(LAST);
      if (k === 'det') openDet(SEL);
      if (k === 'copy') { var u = location.origin + location.pathname + '#track=' + encodeURIComponent(SEL.ref); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { b.textContent = '✓ Link copied'; }, function () { prompt('Copy this link', u); }); } });
    return o; }
  function open(q) { var o = page(); o.style.display = 'block'; document.body.classList.add('tk-on'); if (q) { $('tk-q').value = q; go(); } else setTimeout(function () { $('tk-q').focus(); }, 50); }
  function close() { var o = $('ovtrk'); if (o) o.style.display = 'none'; document.body.classList.remove('tk-on'); if (/^#track=/.test(location.hash)) history.replaceState(null, '', location.pathname); }
  function go() {
    var q = $('tk-q').value.trim(), sc = (document.querySelector('[name="tk-sc"]:checked') || {}).value || 'all'; if (!q) return;
    $('tk-go').disabled = true; $('tk-out').innerHTML = '<div class="tk-hint">Searching…</div>';
    load().then(function () { LAST = search(q, sc); $('tk-n').textContent = '';
      if (!LAST.length) $('tk-out').innerHTML = '<div class="tk-none">No shipment found for <b>' + esc(q) + '</b>. Check the number, or search with another detail (invoice, truck plate, supplier…).</div>';
      else if (LAST.length === 1) { SEL = LAST[0]; show(SEL, false); } else list(LAST); },
      function (e) { $('tk-out').innerHTML = '<div class="tk-none">Could not load shipments: ' + esc(e.message || e) + '</div>'; })
      .then(function () { $('tk-go').disabled = false; }); }
  function list(l) {
    $('tk-n').textContent = l.length + ' shipments found';
    $('tk-out').innerHTML = '<div class="tk-list">' + l.slice(0, 60).map(function (x, i) { return '<button type="button" class="tk-li" data-tk="pick" data-i="' + i + '"><span class="tk-tag ' + x.sc + '">' + (x.sc === 'eg' ? 'Egypt' : 'Global') + '</span><span><b>' + esc(x.ref) + '</b><br><small>' + esc(x.sub) + (x.rows[5] && x.rows[5][1] ? ' · ' + esc(x.rows[5][1]) : '') + '</small></span><span class="tk-st' + (x.done ? ' ok' : /overdue|passed/i.test(x.alert) ? ' late' : x.alert ? ' due' : '') + '">' + esc(x.status) + (x.alert ? '<br><small>' + esc(x.alert) + '</small>' : '') + '</span></button>'; }).join('') + '</div>' +
      (l.length > 60 ? '<div class="mu">Showing the first 60. Type more of the number to narrow it down.</div>' : ''); }
  function show(x, fromList) {
    $('tk-n').textContent = '';
    var ev = x.ev.filter(function (e) { return !e.done; }).sort(function (a, b) { return (a.d || '') < (b.d || '') ? 1 : -1; }).concat(x.ev.filter(function (e) { return e.done; }).reverse());
    var cur = ev.filter(function (e) { return e.done; })[0];
    var h = (fromList ? '<button type="button" class="tk-back" data-tk="back">‹ Back to ' + LAST.length + ' results</button>' : '') +
      '<div class="tk-res"><div class="tk-l"><table class="tk-t"><thead><tr><th colspan="2">Delivery Status</th></tr></thead><tbody>' +
      x.rows.filter(function (r) { return r[1] != null && String(r[1]).trim() !== ''; }).map(function (r, i) { return '<tr><td>' + esc(r[0]) + '</td><td' + (i === 0 ? ' class="tk-cur' + (x.done ? ' ok' : /overdue|passed/i.test(x.alert) ? ' late' : x.alert ? ' due' : '') + '"' : '') + '>' + esc(r[1]) + (i === 0 && x.alert ? ' · ' + esc(x.alert) : '') + '</td></tr>'; }).join('') + '</tbody></table>' +
      (x.items.length ? '<table class="tk-t tk-it"><thead><tr><th colspan="3">Products</th></tr></thead><tbody>' + x.items.map(function (i) { return '<tr><td>' + esc(i[0]) + '</td><td>' + esc(i[1]) + '</td><td>' + esc(i[2]) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
      '<div class="tk-act">' + (canDet(x) ? '<button type="button" data-tk="det">Open full details</button>' : '') + '<button type="button" data-tk="copy">🔗 Copy tracking link</button>' +
      (x.sc === 'rx' && x.conts && typeof dpwUrl === 'function' ? x.conts.filter(function (c) { return /^[A-Z]{4}\d{7}$/.test(c.no) && /jebel/i.test(x.raw.port || ''); }).map(function (c) { return '<a class="tk-a" target="_blank" rel="noopener" href="' + esc(dpwUrl(c.no)) + '">⚓ ' + esc(c.no) + ' at DP World</a>'; }).join('') : '') + '</div></div>' +
      '<div class="tk-r"><h2>Status of ' + esc(x.sc === 'eg' ? (x.raw.container ? 'Container' : x.raw.vehicle ? 'Truck' : 'Shipment') : 'Shipment') + ' No. ' + esc(x.ref) + '</h2><div class="mu">' + esc(x.sub) + '</div>' +
      (ev.length ? '<div class="tk-tl">' + ev.map(function (e) { return '<div class="tk-e' + (e.done ? '' : ' exp') + (e === cur ? ' now' : '') + '"><div class="tk-d">' + (e.d ? esc(dlong(e.d)) : '<span class="mu">date not recorded</span>') + (e.done ? '' : '<br><small>expected</small>') + '</div><div class="tk-i">' + e.i + '</div><div class="tk-w"><b>' + esc(e.t) + '</b><br>' + esc(e.w || '') + (e.x ? '<div class="tk-temp' + (e.bad ? ' bad' : '') + '">' + esc(e.x) + '</div>' : '') + '</div></div>'; }).join('') + '</div>'
        : '<div class="tk-none">No movement recorded yet.</div>') + '</div></div>';
    $('tk-out').innerHTML = h; }
  function canDet(x) { return x.sc === 'eg' ? !!(window.E && E.rows && typeof egDetail === 'function') : !!(window.D && D.shipments && D.shipments.length && typeof rxDetail === 'function'); }
  function openDet(x) { if (!x) return; var r;
    if (x.sc === 'eg') { r = E.rows.filter(function (y) { return y.row === x.id; })[0]; if (r) { close(); egDetail(r); } }
    else { r = D.shipments.filter(function (y) { return y._doc === x.id; })[0]; if (r) { close(); rxDetail(r); } }
    if (!r) alert('Open the ' + (x.sc === 'eg' ? 'Egypt' : 'Global') + ' section first to see the full details.'); }

  var css = document.createElement('style');
  css.textContent = [
    '#ovtrk{position:fixed;inset:0;z-index:96;background:var(--bg);color:var(--tx);overflow:auto;display:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}body.tk-on{overflow:hidden}',
    '.tk-hd{background:radial-gradient(circle at 30% 0%,#0b8a4b 0%,#04512c 60%,#022f1a 100%);color:#fff;padding:26px 0 30px}.tk-in{max-width:1140px;margin:0 auto;padding:0 20px;position:relative}.tk-hd h1{margin:0 0 8px;font-size:30px;font-weight:700;letter-spacing:-.01em}.tk-bc{font-size:15px}.tk-bc a{color:#fff;cursor:pointer}',
    '.tk-x{position:absolute;right:20px;top:-6px;background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:6px 11px;cursor:pointer}',
    '.tk-s{display:flex;margin:44px 0 10px;max-width:640px}.tk-s input{flex:1;background:#fff;border:1px solid var(--bd);border-right:0;border-radius:4px 0 0 4px;padding:9px 12px;font-size:15px;min-width:0}.tk-s button{background:var(--ac);color:#fff;border:0;border-radius:0 4px 4px 0;padding:9px 16px;font-size:15px;cursor:pointer;white-space:nowrap}.tk-s button:hover{background:var(--acd)}.tk-s button:disabled{opacity:.6}',
    '.tk-sc{display:flex;gap:14px;align-items:center;font-size:13px;margin-bottom:24px;flex-wrap:wrap}.tk-sc label{display:flex;gap:4px;align-items:center;cursor:pointer}',
    '.tk-hint,.tk-none{color:var(--mu);background:#fff;border:1px dashed var(--bd);border-radius:8px;padding:16px;font-size:14px}',
    '.tk-res{display:grid;grid-template-columns:minmax(0,415px) minmax(0,1fr);gap:0;align-items:start;margin-bottom:40px}.tk-l{padding-right:22px;border-right:2px solid var(--ac)}.tk-r{padding-left:12px}',
    '.tk-t{width:100%;border-collapse:collapse;border:2px solid var(--ac);background:#fff;font-size:13px;margin-bottom:14px}.tk-t th{background:var(--ac);color:#fff;font-weight:600;padding:9px;text-align:center}.tk-t td{border:1px solid #cfe9da;padding:8px;vertical-align:top}.tk-t td:first-child{background:#f3faf6;color:var(--mu)}.tk-t td:first-child{width:42%}',
    '.tk-cur{font-weight:600}.tk-t td{white-space:pre-line}.tk-cur.ok{color:var(--acd)}.tk-cur.late{color:#c62828}.tk-it td:first-child{width:auto;background:#fff;color:var(--tx)}.tk-it td:nth-child(2),.tk-it td:nth-child(3){white-space:nowrap}',
    '.tk-r h2{margin:0;font-weight:600;font-size:22px;color:var(--tx)}.tk-tl{position:relative;margin-top:18px}.tk-tl:before{content:"";position:absolute;left:calc(200px + 18px);top:0;bottom:0;width:3px;background:#d7e9df}',
    '.tk-e{display:grid;grid-template-columns:200px 40px 1fr;gap:16px;align-items:center;padding:12px 0;position:relative}.tk-d{text-align:right;font-size:15px;color:var(--tx)}.tk-i{width:40px;height:40px;border-radius:50%;background:#04512c;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;position:relative;z-index:1}',
    '.tk-e.now .tk-i{background:var(--ac);box-shadow:0 0 0 5px #d3f2e0}.tk-e.exp{opacity:.6}.tk-e.exp .tk-i{background:#fff;border:2px dashed #9aa3af}.tk-w{font-size:15px;color:var(--tx)}.tk-w b{font-weight:600}',
    '.tk-temp{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:999px;background:#e9f7ef;color:var(--acd);font-size:13px;font-weight:600}.tk-temp.bad{background:#fde8e8;color:var(--er)}.tk-act{display:flex;gap:8px;flex-wrap:wrap}.tk-act button,.tk-a{border:1px solid var(--bd);background:#fff;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:13px;color:#333;text-decoration:none}.tk-back{border:0;background:none;color:var(--acd);cursor:pointer;padding:0 0 12px;font-size:14px}',
    '.tk-list{display:grid;gap:8px;margin-bottom:30px}.tk-li{display:grid;grid-template-columns:70px 1fr auto;gap:12px;align-items:center;text-align:left;background:#fff;border:1px solid var(--bd);border-radius:10px;padding:10px 12px;cursor:pointer;font-size:14px}.tk-li:hover{border-color:var(--ac)}',
    '.tk-tag{font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px;text-align:center;color:#fff}.tk-tag.eg{background:#00a651}.tk-tag.rx{background:#1f6feb}.tk-st{text-align:right;font-size:13px}.tk-st.ok{color:var(--acd)}.tk-st.late{color:#c62828}.tk-st.due,.tk-cur.due{color:#b36b00}',
    '@media(max-width:820px){.tk-res{grid-template-columns:1fr}.tk-l{border-right:0;padding-right:0;border-bottom:1px solid #1cbfa0;padding-bottom:12px;margin-bottom:12px}.tk-r{padding-left:0}.tk-e{grid-template-columns:96px 36px 1fr;gap:10px}.tk-tl:before{left:calc(96px + 10px + 16px)}.tk-i{width:36px;height:36px;font-size:16px}.tk-d,.tk-w{font-size:13px}.tk-hd h1{font-size:28px}.tk-s{margin-top:24px}.tk-r h2{font-size:19px}.tk-li{grid-template-columns:60px 1fr}.tk-st{grid-column:2;text-align:left}}'
  ].join('\n');
  document.head.appendChild(css);
  document.addEventListener('click', function (e) { if (e.target.closest('[data-xtrk]')) open(); });
  window.addEventListener('hashchange', function () { var m = /^#track=(.+)$/.exec(location.hash); if (m) open(decodeURIComponent(m[1])); });
  // a shared tracking link opens the page once the user is signed in
  var tries = 0, wait = setInterval(function () { var m = /^#track=(.+)$/.exec(location.hash); if (!m || ++tries > 60) return clearInterval(wait); if (window.BST && BST.me && BST.me()) { clearInterval(wait); open(decodeURIComponent(m[1])); } }, 1000);
  window.BSTTRACK = { open: open, search: function (q, sc) { return load().then(function () { return search(q, sc); }); } };
})();
