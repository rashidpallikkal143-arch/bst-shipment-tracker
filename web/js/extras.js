/* BST Shipment Tracker: purchase orders / schedules, Excel import & export, management summary report,
   and editing a shipment straight from the product tracker. Works on top of index.html and app-ui.js. */
(function () {
  'use strict';
  var B = window.BST; if (!B) return;
  var $ = function (i) { return document.getElementById(i); };
  var esc = window.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (v) { var n = Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
  var fmtN = function (n) { return n === '' || n == null || isNaN(Number(n)) ? '' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var monOf = function (d) { d = String(d || ''); return /^\d{4}-\d\d/.test(d) ? MON[Number(d.slice(5, 7)) - 1] + ' ' + d.slice(0, 4) : ''; };
  var monKey = function (m) { var x = /^([A-Z]{3}) (\d{4})$/.exec(String(m || '')); return x ? Number(x[2]) * 12 + MON.indexOf(x[1]) : 0; };
  var SECN = { eg: 'Egypt', rx: 'BST Global Import' };
  var canEdit = function (sc) { return B.can(sc === 'eg' ? 'egEdit' : 'gEdit'); };
  var canDel = function (sc) { return B.can(sc === 'eg' ? 'egDel' : 'gDel'); };
  var canView = function (sc) { return B.can(sc === 'eg' ? 'egView' : 'gView'); };
  var call = function () { return B.call.apply(B, arguments); };
  var showOv = function (id) { if (window.show) window.show(id); else $(id).style.display = 'block'; };
  var hideOv = function (id) { $(id).style.display = 'none'; };
  var reload = function (sc) { try { if (sc === 'eg' && window.loadEg) window.loadEg(); if (sc === 'rx' && window.loadRx) window.loadRx(); } catch (e) {} };

  // ------------------------------------------------------------------ styles
  var css = document.createElement('style');
  css.textContent =
    '.xbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.xbar button{border-radius:10px;padding:8px 14px;font-weight:600;background:#fff;border:1px solid var(--bd);cursor:pointer}' +
    '.xbar button:hover{border-color:var(--ac);color:var(--acd)}.xbar .xn{display:inline-block;min-width:20px;padding:0 6px;margin-left:4px;border-radius:999px;background:#e8590c;color:#fff;font-size:12px}' +
    '#ovpo,#ovxl{z-index:72}#ovpf{z-index:76}#ovpo .box,#ovxl .box{max-width:1250px}#ovpf .box{max-width:980px}' +
    '.xh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.xh h2{margin:0;font-size:18px}.xh span{display:flex;gap:6px;flex-wrap:wrap}' +
    '.xban{margin:12px 0;padding:12px 14px;border-radius:12px;background:#fff7e6;border:1px solid #f5c46b;color:#5c3b00;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.xban b{color:#8a5a00}' +
    '.xf{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 8px;align-items:center}.xf button{border-radius:999px;padding:5px 12px}.xf button.on{background:#e6f6ee;border-color:var(--ac);color:var(--acd);font-weight:700}.xf input{min-width:220px;flex:1}' +
    '.pst{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}.pst.o{background:#e6effc;color:#1d4f9a}.pst.p{background:#fff3dc;color:#8a5a00}.pst.f{background:#e3f4ea;color:#0b6b3a}.pst.c{background:#f1f1f1;color:#777}' +
    '.pit{font-size:12.5px;line-height:1.5}.pit div{white-space:nowrap}.pbar{height:6px;border-radius:3px;background:#e5e9ef;margin-top:4px;overflow:hidden}.pbar i{display:block;height:100%;background:#16a34a}' +
    '.prow{display:grid;grid-template-columns:2fr 1.2fr .8fr .8fr .8fr auto;gap:8px;align-items:end;margin-bottom:6px}.prow.rx{grid-template-columns:2.4fr 1.2fr .8fr .9fr auto}.prow label{font-size:12px}.prow .x{height:34px}' +
    'body.m .prow,body.m .prow.rx{grid-template-columns:1fr 1fr;border:1px solid var(--bd);border-radius:10px;padding:8px}body.m .prow label:first-child{grid-column:1/-1}' +
    '.xlt{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-top:12px}.xlc{border:1px solid var(--bd);border-radius:14px;padding:14px;background:#fff}.xlc h3{margin:0 0 4px;font-size:15px}.xlc .ab{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}' +
    '.xlp{margin-top:14px;border:1px solid var(--bd);border-radius:12px;padding:12px;background:#f8fafc}.xlp .bad{color:#b3261e}.xlp table{font-size:12.5px}' +
    '.trd-ed{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 10px;padding:8px 12px;border-radius:10px;background:#e6f6ee;color:#0b6b3a;font-weight:600;font-size:13px}.trd-ed button{background:#0b6b3a;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer}' +
    '#tr-det.ed{cursor:pointer}#tr-det.ed:hover{box-shadow:0 0 0 2px rgba(22,163,74,.35) inset;border-radius:12px}' +
    /* summary report */
    '#ovrp{display:none;position:fixed;inset:0;z-index:90;background:#e9edf2;overflow:auto}#ovrp .rpbar{position:sticky;top:0;z-index:2;background:#04512c;color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
    '#ovrp .rpbar b{font-size:16px;margin-right:auto}#ovrp .rpbar button{border-radius:8px;padding:7px 14px;font-weight:700;border:0;cursor:pointer}#ovrp .rpbar .pr{background:#fff;color:#04512c}#ovrp .rpbar .cl{background:rgba(255,255,255,.15);color:#fff}' +
    '#ovrp .rpf{max-width:1100px;margin:14px auto;background:#fff;border-radius:14px;padding:14px 16px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#ovrp .rpf .ck{grid-column:1/-1;display:flex;gap:14px;flex-wrap:wrap}#ovrp .rpf .ck label{display:flex;flex-direction:row;gap:6px;align-items:center;font-weight:600}#ovrp .rpf .ck input{width:auto}' +
    '#ovrp .rpf .go{grid-column:1/-1;display:flex;gap:8px}body.m #ovrp .rpf{grid-template-columns:1fr 1fr}' +
    '.rpd{max-width:1100px;margin:0 auto 30px;background:#fff;padding:28px 32px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.08);color:#111;font-size:12.5px}' +
    '.rpd .rh{display:flex;gap:18px;align-items:center;border-bottom:3px solid #04512c;padding-bottom:12px;margin-bottom:14px}.rpd .rh img{height:58px}.rpd .rh h1{margin:0;font-size:20px;color:#04512c}.rpd .rh .m{color:#555;font-size:12px;margin-top:3px}' +
    '.rpd h2{font-size:15px;color:#04512c;margin:20px 0 8px;border-bottom:1px solid #d6dde4;padding-bottom:4px;break-after:avoid}.rpd h3{font-size:13px;margin:14px 0 6px;color:#123;break-after:avoid}' +
    '.rpd .kp{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}.rpd .kp div{border:1px solid #d6dde4;border-radius:8px;padding:8px 10px}.rpd .kp b{display:block;font-size:18px;color:#04512c}.rpd .kp span{color:#555;font-size:11.5px}' +
    '.rpd table{width:100%;border-collapse:collapse;margin:4px 0 10px;font-size:11.5px;min-width:0}.rpd th{background:#eef3f0;color:#123;text-align:left;font-weight:700;border:1px solid #cfd8dd;padding:5px 6px}.rpd td{border:1px solid #dfe5e9;padding:4px 6px;vertical-align:top}' +
    '.rpd tr.t td{font-weight:700;background:#f6f8f7}.rpd .nt{color:#666;font-style:italic}.rpd .ft{margin-top:22px;color:#777;font-size:11px;border-top:1px solid #d6dde4;padding-top:8px;display:flex;justify-content:space-between}' +
    'body.m .rpd{padding:14px;margin:0 6px 20px}body.m .rpd table{display:block;overflow-x:auto}' +
    '@media print{body.rp-print>*:not(#ovrp){display:none!important}body.rp-print #ovrp{position:static;display:block!important;background:#fff;overflow:visible}body.rp-print #ovrp .noprint{display:none!important}' +
    'body.rp-print .rpd{box-shadow:none;margin:0;padding:0;max-width:none;border-radius:0}body.rp-print .rpd table{display:table}.rpd tr{break-inside:avoid}@page{size:A4;margin:12mm}}';
  css.textContent += '.xinv{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:12px 0 4px;padding:10px 12px;border:1px dashed #1f9d55;border-radius:10px;background:#f2fbf5}.xinv .mu{font-size:12px;flex:1;min-width:200px}.xinv-st{flex-basis:100%;font-size:13px}.xinv-st:empty{display:none}.xinv-st .bad{color:#c0392b}.xfill{background:#fff6cc!important;box-shadow:0 0 0 2px #f0c43c inset}';
  document.head.appendChild(css);

  // ------------------------------------------------------------------ overlays
  document.body.insertAdjacentHTML('beforeend',
    '<div class="ovl" id="ovpo"><div class="box"><div class="xh"><h2 id="po-t">Purchase orders &amp; schedules</h2><span><button class="p" id="po-add" type="button">+ New PO / schedule</button><span id="po-xl"></span><button data-x="ovpo" type="button">Close</button></span></div>' +
    '<div class="mu" style="margin-top:4px">Orders and dispatch schedules made by Baniyas Spike. When the supplier sends the invoice, open the PO and click <b>Make shipment</b> to enter the invoice and container details.</div>' +
    '<div id="po-xp"></div><div id="po-ban"></div><div class="xf" id="po-f"></div><div id="po-l"></div></div></div>' +
    '<div class="ovl" id="ovpf"><div class="box" id="pf"></div></div>' +
    '<div class="ovl" id="ovxl"><div class="box"><div class="xh"><h2 id="xl-t">Excel import &amp; export</h2><span><button data-x="ovxl" type="button">Close</button></span></div>' +
    '<div class="mu" style="margin-top:4px"><b>Export</b> downloads an Excel file you can share, or edit and import back. <b>Import</b> adds new rows and updates rows that still have their ID column. Tip: export first and use that file as the template.</div>' +
    '<div class="xlt" id="xl-c"></div><div id="xl-p"></div><input type="file" id="xl-f" accept=".xlsx,.xls,.xlsm,.csv,.pdf,.png,.jpg,.jpeg,.webp" multiple style="display:none"></div></div>' +
    '<div id="ovrp"><div class="rpbar noprint"><b>📄 Summary report</b><button class="pr" id="rp-pr" type="button">🖨 Print / Save as PDF</button><button class="cl" id="rp-x" type="button">Close</button></div>' +
    '<div class="rpf noprint" id="rp-f"></div><div id="rp-o"></div></div>');
  if (window.FORMS) window.FORMS.ovpf = 'pf-sv';

  // section toolbars
  function bars() {
    ['eg', 'rx'].forEach(function (sc) { var sec = $(sc); if (!sec || sec.querySelector('.xbar')) return; var ms = sec.querySelector('.msel'); if (!ms) return;
      ms.insertAdjacentHTML('afterend', '<div class="xbar noprint" data-sc="' + sc + '"><button type="button" data-xpo="' + sc + '">📋 Purchase orders / schedules<b class="xn" id="xn-' + sc + '" style="display:none"></b></button>' +
        '<button type="button" data-xxl="' + sc + '">📊 Excel import / export</button><button type="button" data-xrp="' + sc + '">📄 Summary report (PDF / print)</button></div>'); });
  }
  bars();
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-xpo],[data-xxl],[data-xrp]'); if (!b) return;
    if (b.dataset.xpo) openPOs(b.dataset.xpo); else if (b.dataset.xxl) openXL(b.dataset.xxl); else openReport(b.dataset.xrp);
  });

  // ================================================================== PURCHASE ORDERS / SCHEDULES
  var PO = { sc: 'eg', list: [], f: 'open', q: '' };
  var PST = ['Open', 'Partly shipped', 'Fully shipped', 'Cancelled'];
  var pstC = function (s) { return s === 'Fully shipped' ? 'f' : s === 'Partly shipped' ? 'p' : s === 'Cancelled' ? 'c' : 'o'; };
  function linkedOf(p) {
    if (p.sc === 'eg') return ((window.E && E.rows) || []).filter(function (r) { return r.poId === p.id; });
    return ((window.D && D.shipments) || []).filter(function (s) { return s.poId === p.id; });
  }
  function poTotals(p) { var o = { ctn: 0, plt: 0, qty: 0 }; p.items.forEach(function (i) { o.ctn += num(i.ctn); o.plt += num(i.pallets); o.qty += num(i.qty); }); return o; }
  function shippedOf(p) { var l = linkedOf(p), o = { n: l.length, ctn: 0, qty: 0 };
    if (p.sc === 'eg') l.forEach(function (r) { o.ctn += num(r.ctn); });
    else { var keys = {}; l.forEach(function (s) { keys[s.key] = 1; }); ((window.D && D.items) || []).forEach(function (i) { if (keys[i.invoice]) o.qty += num(i.qty); }); }
    return o; }
  function openPOs(sc) {
    if (!canView(sc)) { alert('You do not have access to this section.'); return; }
    PO.sc = sc; $('po-t').textContent = 'Purchase orders & schedules · ' + SECN[sc];
    $('po-add').style.display = canEdit(sc) ? '' : 'none'; var tid = sc === 'eg' ? 'egpo' : 'rxpo'; $('po-xp').innerHTML = '';
    $('po-xl').innerHTML = '<button type="button" data-xe="' + tid + '">⬇ Export to Excel</button>' + (canEdit(sc) ? '<button type="button" data-xt="' + tid + '">📄 Empty Excel template</button><button type="button" data-xi="' + tid + '">⬆ Bulk import from Excel</button>' : '');
    showOv('ovpo'); loadPOs(); loadXL().catch(function () {});
  }
  function loadPOs() { $('po-l').innerHTML = '<div class="mu" style="padding:20px">Loading…</div>';
    call('getPOs', PO.sc).then(function (l) { PO.list = l; drawPOs(); countBadge(PO.sc, l); })
      .catch(function (e) { $('po-l').innerHTML = '<div class="late" style="padding:12px">' + esc(e.message) + (/permission|insufficient/i.test(e.message) ? ' — the database rules need to be published (they publish automatically from GitHub; try again in a minute).' : '') + '</div>'; }); }
  function countBadge(sc, l) { var n = l.filter(function (p) { return p.status === 'Open' || p.status === 'Partly shipped' || !p.status; }).length, b = $('xn-' + sc); if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; } }
  function drawPOs() {
    var sc = PO.sc, l = PO.list;
    // Egypt: container entries without an invoice number are POs / schedules
    var ban = '';
    if (sc === 'eg' && window.E && E.rows) { var noInv = E.rows.filter(function (r) { return !String(r.inv || '').trim(); });
      if (noInv.length) { var bym = {}; noInv.forEach(function (r) { bym[r.month] = (bym[r.month] || 0) + 1; });
        ban = '<div class="xban"><span>⚠ <b>' + noInv.length + ' container entr' + (noInv.length === 1 ? 'y has' : 'ies have') + ' no invoice number</b> (' + Object.keys(bym).map(function (m) { return esc(m) + ': ' + bym[m]; }).join(', ') +
          '). These are POs / schedules made by Baniyas Spike, not shipped containers.</span>' + (canEdit('eg') && B.can('egDel') ? '<button class="p" type="button" id="po-mv">Move them to Purchase orders</button>' : '<span class="mu">Ask a user with Egypt add &amp; delete rights to move them.</span>') + '</div>'; } }
    $('po-ban').innerHTML = ban;
    if ($('po-mv')) $('po-mv').onclick = function () { var n = E.rows.filter(function (r) { return !String(r.inv || '').trim(); }).length;
      if (!confirm('Move ' + n + ' entries without invoice number to Purchase orders / schedules?\n\nThey leave the container report, and you can make the container entry from each schedule when the invoice comes. A backup is taken every night.')) return;
      this.disabled = true; this.textContent = 'Moving…';
      call('moveEgNoInvoiceToPO', '').then(function (k) { alert(k + ' entries moved to Purchase orders / schedules.'); reload('eg'); loadPOs(); }).catch(function (e) { alert(e.message); drawPOs(); }); };
    var cnt = { open: 0, done: 0, cancel: 0, all: l.length };
    l.forEach(function (p) { if (p.status === 'Fully shipped') cnt.done++; else if (p.status === 'Cancelled') cnt.cancel++; else cnt.open++; });
    $('po-f').innerHTML = [['open', 'Open & partly shipped'], ['done', 'Fully shipped'], ['cancel', 'Cancelled'], ['all', 'All']].map(function (x) { return '<button type="button" data-pof="' + x[0] + '" class="' + (PO.f === x[0] ? 'on' : '') + '">' + x[1] + ' (' + cnt[x[0]] + ')</button>'; }).join('') +
      '<input id="po-q" placeholder="Search PO no., supplier, item…" value="' + esc(PO.q) + '">';
    $('po-q').oninput = function () { PO.q = this.value; drawList(); };
    drawList();
  }
  function drawList() {
    var sc = PO.sc, q = PO.q.toLowerCase().trim();
    var l = PO.list.filter(function (p) { var st = p.status || 'Open'; return PO.f === 'all' || (PO.f === 'open' ? (st === 'Open' || st === 'Partly shipped') : PO.f === 'done' ? st === 'Fully shipped' : st === 'Cancelled'); })
      .filter(function (p) { return !q || [p.poNo, p.supplier, p.shipper, p.brand, p.country, p.origin, p.remarks].concat(p.items.map(function (i) { return i.desc; })).join(' ').toLowerCase().indexOf(q) >= 0; });
    if (!l.length) { $('po-l').innerHTML = '<div class="mu" style="padding:16px">No purchase orders or schedules here yet.' + (canEdit(sc) ? ' Click <b>+ New PO / schedule</b> to add one.' : '') + '</div>'; return; }
    $('po-l').innerHTML = '<div class="tw"><table class="cmp"><thead><tr><th>PO / schedule</th><th>' + (sc === 'eg' ? 'Planned dispatch' : 'ETD (planned)') + '</th><th>Supplier</th><th>Items ordered</th><th>Shipped so far</th><th>Status</th><th></th></tr></thead><tbody>' +
      l.map(function (p) { var t = poTotals(p), sh = shippedOf(p), ord = sc === 'eg' ? t.ctn : t.qty, done = sc === 'eg' ? sh.ctn : sh.qty, pct = ord ? Math.min(100, Math.round(done / ord * 100)) : 0;
        var od = p.status !== 'Fully shipped' && p.status !== 'Cancelled' && p.sched && p.sched < today();
        return '<tr><td data-label="PO / schedule"><b>' + esc(p.poNo) + '</b><div class="mu">' + esc(p.kind || 'Purchase order') + (p.poDate ? ' · ' + esc(p.poDate) : '') + (p.month ? ' · ' + esc(p.month) : '') + '</div></td>' +
          '<td data-label="' + (sc === 'eg' ? 'Planned dispatch' : 'ETD') + '">' + esc(p.sched || '-') + (od ? '<div class="late" style="font-size:12px">Past due</div>' : '') + '</td>' +
          '<td data-label="Supplier">' + esc(p.supplier || '-') + '<div class="mu">' + esc([p.brand, p.shipper, p.country || p.origin].filter(Boolean).join(' · ')) + '</div></td>' +
          '<td data-label="Items" class="pit">' + p.items.map(function (i) { return '<div>' + esc(i.desc) + (i.pack ? ' (' + esc(i.pack) + ')' : '') + ': <b>' + (sc === 'eg' ? fmtN(i.ctn) + ' ctn' + (i.pallets ? ' / ' + fmtN(i.pallets) + ' plt' : '') : fmtN(i.qty) + ' ' + esc(i.unit)) + '</b></div>'; }).join('') + '</td>' +
          '<td data-label="Shipped">' + (sh.n ? '<b>' + sh.n + '</b> ' + (sc === 'eg' ? 'container' + (sh.n > 1 ? 's' : '') + ' · ' + fmtN(sh.ctn) + ' ctn' : 'shipment' + (sh.n > 1 ? 's' : '')) : '<span class="mu">Nothing yet</span>') + (ord ? '<div class="pbar"><i style="width:' + pct + '%"></i></div><div class="mu" style="font-size:11.5px">' + pct + '% of ordered</div>' : '') + '</td>' +
          '<td data-label="Status"><span class="pst ' + pstC(p.status) + '">' + esc(p.status || 'Open') + '</span></td>' +
          '<td data-label="">' + (canEdit(sc) && p.status !== 'Cancelled' && p.status !== 'Fully shipped' ? '<button class="p sm" type="button" data-pmk="' + esc(p.id) + '">➜ Make ' + (sc === 'eg' ? 'container entry' : 'shipment') + '</button> ' : '') +
          '<button class="sm" type="button" data-ped="' + esc(p.id) + '">' + (canEdit(sc) ? 'Edit' : 'View') + '</button></td></tr>'; }).join('') + '</tbody></table></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pof],[data-pmk],[data-ped]'); if (!b || !$('ovpo').contains(b)) return;
    if (b.dataset.pof) { PO.f = b.dataset.pof; drawPOs(); return; }
    var p = PO.list.filter(function (x) { return x.id === (b.dataset.pmk || b.dataset.ped); })[0]; if (!p) return;
    if (b.dataset.pmk) makeFromPO(p); else poForm(p);
  });
  $('po-add').onclick = function () { poForm(null); };

  function poRowHtml(sc, i) { i = i || {};
    return sc === 'eg'
      ? '<div class="prow"><label>Item<input class="pi-d" value="' + esc(i.desc) + '" placeholder="e.g. Green Peas"></label><label>Pack size<input class="pi-p" value="' + esc(i.pack) + '" placeholder="e.g. 4 x 2.5 kg"></label><label>CTN<input class="pi-c" type="number" min="0" step="any" value="' + esc(i.ctn) + '"></label><label>Pallets<input class="pi-l" type="number" min="0" step="any" value="' + esc(i.pallets) + '"></label><label>Qty (other)<input class="pi-q" type="number" min="0" step="any" value="' + esc(i.qty) + '"></label><button type="button" class="x" title="Remove line">✕</button></div>'
      : '<div class="prow rx"><label>Item description<input class="pi-d" value="' + esc(i.desc) + '"></label><label>Pack size<input class="pi-p" value="' + esc(i.pack) + '"></label><label>Qty<input class="pi-q" type="number" min="0" step="any" value="' + esc(i.qty) + '"></label><label>Unit<select class="pi-u">' + (window.opts ? opts(((window.D && D.units) || ['CTN', 'BAG', 'KG', 'MT', 'PCS']).concat(i.unit && ((window.D && D.units) || ['CTN', 'BAG', 'KG', 'MT', 'PCS']).indexOf(i.unit) < 0 ? [i.unit] : []), i.unit) : '<option>' + esc(i.unit || '') + '</option>') + '</select></label><button type="button" class="x" title="Remove line">✕</button></div>'; }
  function poForm(p, onSaved, srcName) {
    var sc = PO.sc, ro = !canEdit(sc), v = function (k) { return p && p[k] != null ? p[k] : ''; }, isNew = !p || !p.id;
    var months = sc === 'eg' && window.E ? E.months : [];
    var f = function (k, lab, type, extra) { return '<label>' + lab + '<input data-p="' + k + '" value="' + esc(v(k)) + '"' + (type ? ' type="' + type + '"' : '') + (extra || '') + '></label>'; };
    $('pf').innerHTML = '<div class="xh"><h2>' + (isNew ? (srcName ? 'Check and save · ' + esc(srcName) : 'New purchase order / schedule') : esc(p.poNo)) + ' · ' + SECN[sc] + '</h2><span><button type="button" id="pf-x">Close</button></span></div>' + (srcName ? '<div class="xban" style="margin:8px 0">These details were read from the document. Please check every field (especially quantities and dates) and correct anything that is wrong, then Save.</div>' : '') +
      '<div class="g" style="margin-top:12px"><label>Type<select data-p="kind">' + ['Purchase order', 'Schedule'].map(function (x) { return '<option' + (x === (v('kind') || (sc === 'eg' ? 'Schedule' : 'Purchase order')) ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      f('poNo', 'PO / schedule no. *', '', ' placeholder="e.g. BST/PO/2026-118"') + f('poDate', 'PO date', 'date') + f('supplier', 'Supplier', '', ' list="dl-sup"') +
      (sc === 'eg' ? f('brand', 'Brand') + f('origin', 'Origin', '', isNew ? ' placeholder="Egypt"' : '') +
        '<label>Month<select data-p="month"><option value=""></option>' + months.map(function (m) { return '<option' + (m === v('month') ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></label>' + f('sched', 'Planned dispatch date (Egypt)', 'date')
        : f('shipper', 'Shipper') + f('country', 'Origin country') + f('sched', 'ETD (planned departure)', 'date') + f('port', 'Arrival port', '', ' list="dl-port"')) +
      '<label>Status<select data-p="status">' + PST.map(function (x) { return '<option' + (x === (v('status') || 'Open') ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label style="grid-column:1/-1">Remarks<input data-p="remarks" value="' + esc(v('remarks')) + '"></label></div>' +
      '<div class="sech" style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><b>Items ordered</b><button type="button" id="pf-ai">+ Add item</button></div><div id="pf-it"></div>' +
      (p && p.id && linkedOf(p).length ? '<h3 class="sec">Made from this ' + esc((p.kind || 'PO').toLowerCase()) + '</h3>' + linkedOf(p).map(function (r) { return '<div class="li"><span>' + (sc === 'eg' ? esc((r.inv || '') + ' · ' + (r.container || r.vehicle || 'SR ' + r.sr) + ' · ' + r.month) : esc(r.key + ' · ' + (r.stage || ''))) + '</span><span class="mu">' + esc(sc === 'eg' ? (r.position || '') : (r.ref || '')) + '</span></div>'; }).join('') : '') +
      (p && p.links && p.links.length ? '<div class="mu" style="margin-top:6px">History: ' + p.links.map(function (x) { return esc(x.label || x.ref) + ' (' + esc((x.at || '').slice(0, 10)) + ', ' + esc(x.by || '') + ')'; }).join(' · ') + '</div>' : '') +
      '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px;flex-wrap:wrap"><button type="button" id="pf-del" style="' + (p && p.id && canDel(sc) ? '' : 'visibility:hidden') + '">Delete</button>' +
      '<span>' + (p && p.id && !ro && p.status !== 'Cancelled' ? '<button type="button" id="pf-mk">➜ Make ' + (sc === 'eg' ? 'container entry' : 'shipment') + '</button> ' : '') + '<button type="button" id="pf-cx">Cancel</button> ' + (ro ? '' : '<button class="p" id="pf-sv" type="button">' + (isNew ? 'Save PO / schedule' : 'Save changes') + '</button>') + '</span></div>';
    var add = function (i) { var w = document.createElement('div'); w.innerHTML = poRowHtml(sc, i); var r = w.firstChild; r.querySelector('.x').onclick = function () { r.remove(); if (window.DIRTY) DIRTY.ovpf = true; }; $('pf-it').appendChild(r); };
    (p && p.items.length ? p.items : [{}]).forEach(add);
    if (ro) $('pf').querySelectorAll('input,select').forEach(function (x) { x.disabled = true; });
    $('pf-ai').onclick = function () { add({}); }; if (ro) $('pf-ai').style.display = 'none';
    var close = function () { if (window.closeForm && !ro) closeForm('ovpf'); else hideOv('ovpf'); };
    $('pf-x').onclick = close; $('pf-cx').onclick = close;
    var collect = function () { var o = { sc: sc, id: p ? p.id : '' }; $('pf').querySelectorAll('[data-p]').forEach(function (x) { o[x.dataset.p] = x.value.trim(); });
      if (sc === 'eg' && !o.origin) o.origin = 'Egypt';
      o.items = [].map.call($('pf-it').children, function (r) { var g = function (c) { var e = r.querySelector(c); return e ? e.value.trim() : ''; };
        return { desc: g('.pi-d'), pack: g('.pi-p'), ctn: g('.pi-c'), pallets: g('.pi-l'), qty: g('.pi-q'), unit: sc === 'eg' ? (g('.pi-c') ? 'CTN' : '') : g('.pi-u') }; }).filter(function (i) { return i.desc || i.ctn || i.qty; });
      return o; };
    if ($('pf-sv')) $('pf-sv').onclick = function () { var o = collect(), btn = this; if (!o.poNo) { alert('Enter the PO / schedule number.'); return; } if (!o.items.length) { alert('Add at least one item.'); return; }
      btn.disabled = true; btn.textContent = 'Saving…';
      call('savePO', o).then(function () { if (window.DIRTY) DIRTY.ovpf = false; hideOv('ovpf'); if (onSaved) onSaved(); else loadPOs(); }).catch(function (e) { btn.disabled = false; btn.textContent = 'Save'; alert(e.message); }); };
    if ($('pf-mk')) $('pf-mk').onclick = function () { if (window.DIRTY && DIRTY.ovpf && !confirm('Your changes to this PO are not saved. Continue without saving them?')) return; hideOv('ovpf'); makeFromPO(p); };
    if (p && p.id && canDel(sc)) $('pf-del').onclick = function () { if (!confirm('Delete ' + p.poNo + '?' + (linkedOf(p).length ? '\nThe container entries / shipments made from it stay.' : ''))) return;
      call('deletePO', p.id).then(function () { hideOv('ovpf'); loadPOs(); }).catch(function (e) { alert(e.message); }); };
    showOv('ovpf');
  }
  function makeFromPO(p) {
    if (!canEdit(p.sc)) return;
    hideOv('ovpo');
    if (p.sc === 'eg') {
      var items = p.items.map(function (i) { return i.desc + (i.pack ? ' (' + i.pack + ')' : '') + (i.ctn ? ': ' + num(i.ctn).toLocaleString('en-US') + ' ctn' : '') + (i.pallets ? ' / ' + i.pallets + ' plt' : ''); }).join('\n');
      var t = poTotals(p);
      openEg(null, { month: p.month || monOf(p.sched), supplier: p.supplier, brand: p.brand, origin: p.origin || 'Egypt', sched: p.sched, items: items, ctn: t.ctn || '', pallets: t.plt || '', poNo: p.poNo, poId: p.id, remarks: p.remarks, po: 'Confirmed' });
    } else {
      var m = monOf(p.poDate) || monOf(today());
      openEdit({ month: m, po: p.poNo, poStatus: (window.PO_ST || []).indexOf('Confirmed') >= 0 ? 'Confirmed' : '', supplier: p.supplier, shipper: p.shipper, country: p.country, etd: p.sched, port: p.port, remarks: p.remarks, poId: p.id,
        _items: p.items.map(function (i) { return { desc: i.desc + (i.pack ? ' (' + i.pack + ')' : ''), qty: i.qty, unit: i.unit, remarks: '' }; }) });
    }
  }
  // keep the open-PO counters on the section bars up to date
  function refreshBadges() { ['eg', 'rx'].forEach(function (sc) { if (!canView(sc)) return; call('getPOs', sc).then(function (l) { if (PO.sc === sc && $('ovpo').style.display === 'block') { PO.list = l; drawPOs(); } countBadge(sc, l); }).catch(function () {}); }); }

  // ================================================================== EXCEL
  var XLV = '0.18.5', xlLoading = null;
  function loadXL() { if (window.XLSX) return Promise.resolve(window.XLSX); if (xlLoading) return xlLoading;
    xlLoading = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/' + XLV + '/xlsx.full.min.js';
      s.onload = function () { res(window.XLSX); }; s.onerror = function () { xlLoading = null; rej(new Error('The Excel tool could not be loaded. Check the internet connection.')); }; document.head.appendChild(s); });
    return xlLoading; }
  // [header, key, type]; type: d = date, n = number, ro = read only (export only)
  var C_EG = [['Row ID (keep for updates)', 'row', 'id'], ['Month', 'month'], ['SR no.', 'sr', 'n'], ['Planned dispatch', 'sched', 'd'], ['Actual dispatch', 'actual', 'd'], ['Supplier', 'supplier'], ['Invoice no.', 'inv'], ['PO / schedule no.', 'poNo'],
    ['Batch', 'batch'], ['Brand', 'brand'], ['Origin', 'origin'], ['Container no.', 'container'], ['Vehicle no.', 'vehicle'], ['Driver', 'driver'], ['Driver mobile', 'mobile'], ['Items (one per line: Item (pack): CTN ctn / pallets plt)', 'items'],
    ['Total CTN', 'ctn', 'n'], ['Total pallets', 'pallets', 'n'], ['Invoice amount ($)', 'invAmt', 'n'], ['Freight paid ($)', 'frAmt', 'n'], ['Supplier PO status', 'po'], ['Supplier payment', 'supPay'], ['Freight payment', 'frPay'],
    ['Loading & dispatch', 'loading'], ['KSA border', 'ksa'], ['Ghuwaifat border', 'ghu'], ['Warehouse delivery', 'wh'], ['Purchase entry', 'purchase'], ['Actual delivery date', 'delivered', 'd'], ['Remarks', 'remarks'],
    ['ETA (calculated)', 'eta', 'ro'], ['Position (calculated)', 'position', 'ro'], ['Alert (calculated)', 'alert', 'ro']];
  var C_RX = [['Key (keep for updates)', 'key', 'id'], ['Report month', 'month'], ['PI date', 'piDate', 'd'], ['PO no.', 'po'], ['PI no.', 'pi'], ['Invoice no(s).', 'invoice'], ['PO status', 'poStatus'], ['Origin country', 'country'], ['Stage', 'stage'],
    ['Supplier', 'supplier'], ['Shipper', 'shipper'], ['ETD', 'etd', 'd'], ['ATD', 'atd', 'd'], ['ETA', 'eta', 'd'], ['ATA', 'ata', 'd'], ['Arrival port', 'port'], ['First port', 'port1'], ['First port ETA', 'eta1', 'd'], ['First port ATA', 'ata1', 'd'],
    ['Free time start', 'freeStart', 'd'], ['Free time end', 'freeEnd', 'd'], ['Payment stage', 'payment'], ['Warehouse delivery date', 'whDate', 'd'], ['Shipping line', 'line'], ['Vessel', 'vessel'], ['Vessel IMO', 'imo'], ['Vessel MMSI', 'mmsi'],
    ['Voyage', 'voyage'], ['B/L no.', 'bl'], ['Remarks', 'remarks'], ['Containers (count)', 'contQty', 'ro'], ['Container nos.', 'ref', 'ro']];
  var C_RXI = [['Shipment key / PO / invoice', 'key'], ['Item description', 'desc'], ['Qty', 'qty', 'n'], ['Unit', 'unit'], ['Invoice', 'inv'], ['Remarks', 'remarks']];
  var C_RXC = [['Shipment key / PO / invoice', 'key'], ['Container / AWB / truck no.', 'no'], ['Size', 'size'], ['Seal no.', 'seal'], ['Remarks', 'remarks']];
  var C_IN = [['ID (keep for updates)', 'id', 'id'], ['Reference (container / shipment)', 'ref'], ['Invoice no.', 'invoice'], ['Level', 'level'], ['Product', 'product'], ['Status', 'status'], ['Authority', 'authority'], ['Inspection date', 'date', 'd'],
    ['Result', 'result'], ['Clearance', 'clearance'], ['Clearance date', 'clearDate', 'd'], ['Action needed', 'action'], ['Owner', 'owner'], ['Due date', 'due', 'd'], ['Remarks', 'remarks'], ['Last updated', 'updated', 'ro']];
  var C_MX = [['ID (keep for updates)', 'id', 'id'], ['Month', 'month'], ['Container no.', 'container'], ['Invoice no.', 'inv'], ['Invoice date', 'invDate', 'd'], ['Description', 'desc'], ['Amount (AED)', 'amount', 'n'], ['Paid (AED)', 'paid', 'n'],
    ['Status', 'status'], ['Payment date', 'payDate', 'd'], ['Payment mode', 'mode'], ['Payment ref.', 'ref'], ['Due date', 'due', 'd'], ['Remarks', 'remarks'], ['Last updated', 'updated', 'ro']];
  var C_PO = [['PO ID (keep for updates)', 'id', 'id'], ['PO / schedule no.', 'poNo'], ['Type', 'kind'], ['PO date', 'poDate', 'd'], ['Supplier', 'supplier'], ['Shipper', 'shipper'], ['Brand', 'brand'], ['Origin / country', 'origin'], ['Month', 'month'],
    ['Planned dispatch / ETD', 'sched', 'd'], ['Arrival port', 'port'], ['Status', 'status'], ['Remarks', 'remarks'], ['Item', 'i_desc'], ['Pack size', 'i_pack'], ['Qty', 'i_qty', 'n'], ['Unit', 'i_unit'], ['CTN', 'i_ctn', 'n'], ['Pallets', 'i_pallets', 'n']];
  var XT = {
    eg: [{ id: 'egc', t: 'Egypt container entries', d: 'All months, one row per container. Items stay in one cell, one line per item.', right: 'egEdit' },
      { id: 'egpo', t: 'Egypt purchase orders / schedules', d: 'One row per item line. Rows with the same PO no. make one PO.', right: 'egEdit' },
      { id: 'egi', t: 'Egypt inspections', d: 'Inspection and clearance follow-up records.', right: 'inspEdit' },
      { id: 'mx', t: 'Matex payments', d: 'Matex payment entries.', right: 'mxEdit', view: 'mxView' }],
    rx: [{ id: 'rxs', t: 'Global import shipments', d: 'Three sheets: Shipments, Items and Containers, linked by the shipment key (or PO / invoice no. for new rows).', right: 'gEdit' },
      { id: 'rxpo', t: 'Global purchase orders', d: 'One row per item line. Rows with the same PO no. make one PO.', right: 'gEdit' },
      { id: 'rxi', t: 'Global inspections', d: 'Inspection and clearance follow-up records.', right: 'inspEdit' }]
  };
  var XL = { sc: 'eg', t: null, plan: null, out: 'xl-p' };
  function openXL(sc) { if (!canView(sc)) return; XL.sc = sc; XL.out = 'xl-p'; $('xl-t').textContent = 'Excel import & export · ' + SECN[sc]; $('xl-p').innerHTML = '';
    $('xl-c').innerHTML = XT[sc].filter(function (t) { return !t.view || B.can(t.view); }).map(function (t) { return '<div class="xlc"><h3>' + esc(t.t) + '</h3><div class="mu">' + esc(t.d) + '</div><div class="ab"><button type="button" class="p" data-xe="' + t.id + '">⬇ Export to Excel</button>' +
      (B.can(t.right) ? '<button type="button" data-xi="' + t.id + '">⬆ Import from Excel</button>' : '') + '</div></div>'; }).join('');
    showOv('ovxl'); loadXL().catch(function () {}); }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-xe],[data-xi],[data-xt],[data-xrv],#xl-go,#xl-cancel,#xl-one'); if (!b) return;
    if (b.dataset.xrv != null) { var pl0 = XL.plan, fi = pl0 && pl0.files[Number(b.dataset.xrv)]; if (fi) poForm(Object.assign({}, fi.rec), function () { fi.saved = true; pl0.jobs[fi.ji].done = true; showPlan(pl0); loadPOs(); }, fi.file); return; }
    if (b.id === 'xl-one') { var pl = XL.plan; if (pl && pl.recs) loadXL().then(function (X) { var wb = X.utils.book_new(); X.utils.book_append_sheet(wb, sheet(X, C_PO, poFlat(pl.recs.map(function (r) { return Object.assign({ items: [] }, r, { origin: r.origin || r.country }); }))), 'Purchase orders'); X.writeFile(wb, 'BST ' + (XL.sc === 'eg' ? 'Egypt' : 'Global') + ' purchase orders combined ' + today() + '.xlsx'); }); return; } var inPO = $('ovpo').contains(b); if (!inPO && !$('ovxl').contains(b)) return;
    if (!b.id && b.dataset.xrv == null) { XL.out = inPO ? 'po-xp' : 'xl-p'; XL.sc = inPO ? PO.sc : XL.sc; }
    if (b.id === 'xl-cancel') { $(XL.out).innerHTML = ''; XL.plan = null; return; }
    if (b.id === 'xl-go') { runImport(); return; }
    var t = XT[XL.sc].filter(function (x) { return x.id === (b.dataset.xe || b.dataset.xi || b.dataset.xt); })[0]; if (!t) return;
    if (b.dataset.xt) { poTemplate(t).catch(function (er) { alert(er.message); }); return; }
    if (b.dataset.xe) { b.disabled = true; var lab = b.textContent; b.textContent = 'Preparing…'; doExport(t).catch(function (er) { alert(er.message); }).then(function () { b.disabled = false; b.textContent = lab; }); }
    else { XL.t = t; $('xl-f').value = ''; $('xl-f').click(); } });
  var cellOut = function (v, type) { if (v === '' || v == null) return ''; if (type === 'n') { var n = Number(v); return isFinite(n) ? n : v; } return String(v); };
  function sheet(X, cols, rows) { var aoa = [cols.map(function (c) { return c[0]; })].concat(rows.map(function (r) { return cols.map(function (c) { return cellOut(r[c[1]], c[2]); }); }));
    var ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = cols.map(function (c) { return { wch: c[1] === 'items' ? 48 : Math.min(32, Math.max(10, c[0].length + 2)) }; }); ws['!freeze'] = { xSplit: 0, ySplit: 1 }; return ws; }
  function poFlat(l) { var out = []; l.forEach(function (p) { (p.items.length ? p.items : [{}]).forEach(function (i) { out.push({ id: p.id, poNo: p.poNo, kind: p.kind, poDate: p.poDate, supplier: p.supplier, shipper: p.shipper, brand: p.brand, origin: p.origin || p.country, month: p.month,
    sched: p.sched, port: p.port, status: p.status, remarks: p.remarks, i_desc: i.desc, i_pack: i.pack, i_qty: i.qty, i_unit: i.unit, i_ctn: i.ctn, i_pallets: i.pallets }); }); }); return out; }
  function doExport(t) { return loadXL().then(function (X) {
    var wb = X.utils.book_new(), stamp = today(), name = 'BST ' + t.t + ' ' + stamp + '.xlsx';
    var go = function () { X.writeFile(wb, name); };
    if (t.id === 'egc') return call('getEgyptData').then(function (d) { X.utils.book_append_sheet(wb, sheet(X, C_EG, d.rows), 'Egypt containers'); go(); });
    if (t.id === 'egpo' || t.id === 'rxpo') return call('getPOs', t.id === 'egpo' ? 'eg' : 'rx').then(function (l) { X.utils.book_append_sheet(wb, sheet(X, C_PO, poFlat(l)), 'Purchase orders'); go(); });
    if (t.id === 'egi' || t.id === 'rxi') return call('getTab', t.id === 'egi' ? 'egInsp' : 'rxInsp').then(function (l) { X.utils.book_append_sheet(wb, sheet(X, C_IN, l), 'Inspections'); go(); });
    if (t.id === 'mx') return call('getTab', 'matex').then(function (l) { X.utils.book_append_sheet(wb, sheet(X, C_MX, l), 'Matex payments'); go(); });
    if (t.id === 'rxs') return call('getData').then(function (d) {
      X.utils.book_append_sheet(wb, sheet(X, C_RX, d.shipments), 'Shipments');
      X.utils.book_append_sheet(wb, sheet(X, C_RXI, d.items.map(function (i) { return { key: i.invoice, desc: i.desc, qty: i.qty, unit: i.unit, inv: i.inv, remarks: i.remarks }; })), 'Items');
      X.utils.book_append_sheet(wb, sheet(X, C_RXC, (d.containers || []).map(function (c) { return { key: c.key, no: c.no, size: c.size, seal: c.seal, remarks: c.remarks }; })), 'Containers'); go(); });
  }); }
  function poTemplate(t) { return loadXL().then(function (X) { var sc = t.id === 'egpo' ? 'eg' : 'rx', wb = X.utils.book_new();
    var ex = sc === 'eg'
      ? [{ poNo: 'SCH-DEC-01', kind: 'Schedule', poDate: today(), supplier: 'Supplier name', brand: 'Mahra', origin: 'Egypt', month: monOf(today()), sched: today(), status: 'Open', i_desc: 'Green Peas', i_pack: '4 x 2.5 kg', i_ctn: 1200, i_pallets: 12 },
         { poNo: 'SCH-DEC-01', i_desc: 'Cut Green Beans', i_pack: '4 x 2.5 kg', i_ctn: 1100, i_pallets: 10 }]
      : [{ poNo: 'BST/PO/2026-200', kind: 'Purchase order', poDate: today(), supplier: 'Supplier name', shipper: 'Shipper name', origin: 'India', sched: today(), port: 'Jebel Ali Port', status: 'Open', i_desc: 'Basmati rice 25 kg', i_qty: 1000, i_unit: 'BAG' },
         { poNo: 'BST/PO/2026-200', i_desc: 'Sona masoori rice 5 kg', i_qty: 500, i_unit: 'BAG' }];
    X.utils.book_append_sheet(wb, sheet(X, C_PO, ex), 'Purchase orders');
    var help = [['How to fill this sheet'], [''], ['• One row per item line. Several rows with the same "PO / schedule no." make ONE purchase order with several items.'],
      ['• PO details (date, supplier, status…) only need to be on the first row of each PO.'], ['• Leave "PO ID" empty for new POs. Rows exported from the app keep their PO ID so the import updates them.'],
      ['• Dates: use the date format of your Excel, or type them like 2026-12-05.'], ['• Status: Open, Partly shipped, Fully shipped or Cancelled (empty = Open).'],
      ['• ' + (sc === 'eg' ? 'Egypt: fill CTN and Pallets for each item; Month like DEC 2026.' : 'Global: fill Qty and Unit for each item (e.g. BAG, CTN, KG, MT).')],
      ['• Delete the two example rows before importing.'], [''], ['Then: Purchase orders / schedules → ⬆ Bulk import from Excel → choose this file → check the preview → Import.']];
    var hs = X.utils.aoa_to_sheet(help); hs['!cols'] = [{ wch: 110 }]; X.utils.book_append_sheet(wb, hs, 'How to fill');
    X.writeFile(wb, 'BST ' + (sc === 'eg' ? 'Egypt' : 'Global') + ' purchase orders template.xlsx'); }); }
  // ---- import
  var normH = function (h) { return String(h || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
  function cellIn(v, type) { if (v === null || v === undefined) return '';
    if (v instanceof Date) { if (isNaN(v)) return ''; var d = new Date(Math.round(v.getTime() / 6e4) * 6e4); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    if (type === 'd') { if (typeof v === 'number' && v > 20000 && v < 80000) { var dt = new Date(Math.round((v - 25569) * 864e5)); return dt.toISOString().slice(0, 10); }
      var s = String(v).trim().replace(/\s*([\/.-])\s*/g, '$1'), m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
      var MN = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 }, a = /^([a-z]{3,9})\.?,?\s*(\d{1,2}),?\s*(\d{4})$/i.exec(s.replace(/,/g, ', ').replace(/\s+/g, ' ')), b = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3,9})\.?,?[\s-]+(\d{4})$/i.exec(s);
      var mo = function (x) { return MN[String(x).toLowerCase().slice(0, 4)] || MN[String(x).toLowerCase().slice(0, 3)]; };
      if (a && mo(a[1])) return a[3] + '-' + String(mo(a[1])).padStart(2, '0') + '-' + a[2].padStart(2, '0'); if (b && mo(b[2])) return b[3] + '-' + String(mo(b[2])).padStart(2, '0') + '-' + b[1].padStart(2, '0');
      return s; }
    return String(v).trim(); }
  function readSheet(X, ws, cols) { var aoa = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }); if (!aoa.length) return { rows: [], miss: cols.map(function (c) { return c[0]; }) };
    var hdr = aoa[0].map(normH), idx = cols.map(function (c) { var h = normH(c[0]); var i = hdr.indexOf(h); if (i < 0) i = hdr.findIndex(function (x) { return x && (x.indexOf(h) === 0 || h.indexOf(x) === 0); }); return i; });
    var rows = aoa.slice(1).filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); }).map(function (r) { var o = {}; cols.forEach(function (c, k) { if (idx[k] >= 0 && c[2] !== 'ro') o[c[1]] = cellIn(r[idx[k]], c[2]); }); return o; });
    return { rows: rows, miss: cols.filter(function (c, k) { return idx[k] < 0 && c[2] !== 'ro'; }).map(function (c) { return c[0]; }), found: cols.filter(function (c, k) { return idx[k] >= 0 && c[2] !== 'ro'; }).map(function (c) { return c[1]; }) }; }
  var findSheet = function (wb, names) { var n = wb.SheetNames.filter(function (s) { return names.some(function (x) { return s.toLowerCase().indexOf(x) >= 0; }); })[0]; return wb.Sheets[n || wb.SheetNames[0]]; };
  $('xl-f').onchange = function () { var files = [].slice.call(this.files || []), t = XL.t; if (!files.length || !t) return;
    if (!/po$/.test(t.id)) files = files.slice(0, 1);
    $(XL.out).innerHTML = '<div class="xlp">Reading ' + (files.length > 1 ? files.length + ' files' : esc(files[0].name)) + '…</div>';
    var isPO = /po$/.test(t.id), docs = window.BSTPDF ? files.filter(function (f) { return BSTPDF.isDoc(f.name); }) : [];
    if (docs.length && !isPO) { $(XL.out).innerHTML = '<div class="xlp bad">PDF and photo reading is for purchase orders. For this table choose an Excel file.</div>'; return; }
    var said = function (m) { var el = $(XL.out); if (el) el.innerHTML = '<div class="xlp">' + esc(m) + '</div>'; };
    loadXL().then(function (X) { var wbs = [], i = 0;
      var next = function () { if (i >= files.length) return planImport(t, X, wbs[0] && wbs[0].wb, wbs); var f = files[i++], pre = files.length > 1 ? 'File ' + i + ' of ' + files.length + ' (' + f.name + '): ' : f.name + ': ';
        if (window.BSTPDF && BSTPDF.isDoc(f.name)) { said(pre + 'reading…'); return BSTPDF.read(f, function (m) { said(pre + m); }).then(function (d) { wbs.push({ name: f.name, doc: d }); }, function (e) { wbs.push({ name: f.name, err: e.message || 'could not be read' }); }).then(next); }
        return f.arrayBuffer().then(function (b) { try { wbs.push({ name: f.name, wb: X.read(b, { type: 'array', cellDates: true }) }); } catch (e) { wbs.push({ name: f.name, err: 'could not be opened as an Excel file' }); } }).then(next); };
      return next(); })
      .then(function (plan) { XL.plan = plan; showPlan(plan); }).catch(function (e) { $(XL.out).innerHTML = '<div class="xlp bad">' + esc(e.message) + '</div>'; }); };
  function templateSheet(wb) { var n = wb.SheetNames.filter(function (nm) { var ws = wb.Sheets[nm], r = ws && ws['!ref'] ? window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 0 })[0] || [] : [];
      var h = r.map(normH); return h.indexOf('po schedule no') >= 0 && h.indexOf('item') >= 0; })[0]; return n ? wb.Sheets[n] : null; }
  // reads a PO in its own layout: labels like "PO No.", "Date", "Supplier" anywhere on the sheet, and an item table with Description + Qty columns
  function parseFreePO(X, wb, fname, sc) {
    var out = { rec: null, warn: [] }, best = null;
    wb.SheetNames.forEach(function (nm) { var A = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: true, defval: '' }); var r = readFreeSheet(A, sc); if (r.items.length && (!best || r.items.length > best.items.length)) best = r; });
    if (!best) { out.warn.push('no item table found (needs columns like Description and Quantity)'); return out; }
    var rec = best.head; rec.items = best.items;
    if (!rec.poNo) { rec.poNo = String(fname || '').replace(/\.[^.]+$/, '').trim(); out.warn.push('PO no. not found inside the file, the file name "' + rec.poNo + '" is used'); }
    if (!rec.supplier) out.warn.push(rec.poNo + ': supplier not found (you can add it later with Edit)');
    if (sc === 'eg' && !rec.month) rec.month = monOf(rec.sched) || monOf(rec.poDate);
    out.rec = rec; return out; }
  function readFreeSheet(A, sc, maxRows) {
    var tx = function (v) { return v instanceof Date ? cellIn(v, 'd') : String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); };
    var LAB = [['poNo', /^((l\.?p\.?o|p\.?\s*o|purchase\s*order|order|schedule|indent)\s*(no|number|num|ref|reference|#)?|(proforma\s*|commercial\s*)?invoice\s*(no|number|#)|p\.?\s*i\.?\s*(no|number|#)|contract\s*(no|number)|proforma\s*invoice)\.?\s*[:#.]?$/i, ''], ['poDate', /^((p\.?\s*o|order|lpo)\s*)?date\s*[:.]?$/i, 'd'],
      ['supplier', /^(supplier|vendor|seller|exporter|messrs|m\/s|bill\s*from|supplier\s*name|vendor\s*name|beneficiary|account\s*name)\s*[:.]?$/i, ''], ['shipper', /^(shipper|shipper\s*name)\s*[:.]?$/i, ''],
      ['origin', /^(origin|country\s*of\s*origin|origin\s*country|country)\s*[:.]?$/i, ''], ['sched', /^(delivery\s*date|etd|shipment\s*date|dispatch\s*date|loading\s*date|required\s*by|ship\s*date|expected\s*dispatch)\s*[:.]?$/i, 'd'],
      ['port', /^(port\s*of\s*discharge|destination\s*port|discharge\s*port|pod|destination|delivery\s*port)\s*[:.]?$/i, ''], ['brand', /^brand\s*[:.]?$/i, ''], ['payment', /^(payment\s*terms?|terms\s*of\s*payment|payment)\s*[:.]?$/i, ''],
      ['product', /^(product|commodity|goods|description\s*of\s*goods)\s*[:.]?$/i, ''], ['quantity', /^(quantity|qty|total\s*quantity)\s*[:.]?$/i, ''], ['packing', /^(packing|packaging|pack\s*size)\s*[:.]?$/i, ''], ['shipment', /^(shipment|shipping|route)\s*[:.]?$/i, '']];
    var isLabel = function (v) { return LAB.some(function (L) { return L[1].test(v); }); };
    var head = {}, HDR = { desc: /description|item|product|particular|commodity|goods|material/i, pack: /pack|packing|size|weight|spec/i, qty: /^(qty|quantity|qnty|no\.?\s*of|nos)|quantity/i,
      unit: /^(unit|uom|u\/m)$/i, ctn: /ctn|carton|case|boxes/i, pallets: /pallet|plt/i };
    var hdrRow = -1, col = {};
    for (var r = 0; r < Math.min(A.length, maxRows || 80); r++) { var row = A[r] || [], cells = row.map(tx);
      // label : value pairs
      cells.forEach(function (c, ci) { if (!c || c.length > 45) return; LAB.forEach(function (L) { if (head[L[0]]) return;
        var m = /^([^:]{2,40}):\s*(.+)$/.exec(c); if (m && L[1].test(m[1].trim() + ':')) { head[L[0]] = L[2] === 'd' ? cellIn(m[2].trim(), 'd') : m[2].trim(); return; }
        if (!L[1].test(c)) return;
        var okv = function (v) { return L[0] !== 'supplier' || /[A-Za-z]{4,}/.test(v); };
        for (var k = ci + 1; k < Math.min(row.length, ci + 7); k++) { var v = tx(row[k]).replace(/^[:\-\s]+/, ''); if (v && !isLabel(v) && okv(v)) { head[L[0]] = L[2] === 'd' ? cellIn(v, 'd') : v; return; } }
        var below = A[r + 1] && tx(A[r + 1][ci]); if (below && !isLabel(below) && okv(below) && !/^[A-Z ]{12,}$/.test(below)) head[L[0]] = L[2] === 'd' ? cellIn(A[r + 1][ci], 'd') : below; }); });
      // item table header
      if (hdrRow < 0) { var di = cells.findIndex(function (c) { return c && c.length < 40 && HDR.desc.test(c) && !/no\.?$|code/i.test(c); }),
          qi = cells.findIndex(function (c, k) { return k !== di && c && c.length < 30 && (HDR.qty.test(c) || HDR.ctn.test(c)); });
        if (di >= 0 && qi >= 0) { hdrRow = r; col.desc = di; cells.forEach(function (c, k) { if (!c || k === di) return;
          if (col.pallets == null && HDR.pallets.test(c)) col.pallets = k; else if (col.pack == null && /per\s*carton|units?\s*\//i.test(c)) col.pack = k; else if (col.ctn == null && HDR.ctn.test(c) && !/price|rate|amount|value/i.test(c)) col.ctn = k;
          else if (col.qty == null && HDR.qty.test(c)) col.qty = k; else if (col.unit == null && HDR.unit.test(c)) col.unit = k; else if (col.pack == null && HDR.pack.test(c) && !/price|amount/i.test(c)) col.pack = k; });
          col.qtyHdr = cells[col.qty != null ? col.qty : -1] || ''; } }
    }
    var items = [];
    if (hdrRow >= 0) { var blanks = 0;
      for (var r2 = hdrRow + 1; r2 < A.length && blanks < 3; r2++) { var rw = A[r2] || [], d = tx(rw[col.desc]);
        if (!d && !rw.some(function (x) { return tx(x); })) { blanks++; continue; } blanks = 0;
        if (/^(total|grand\s*total|sub\s*-?\s*total|net\s*total|amount\s*in\s*words|terms)/i.test(d) || rw.some(function (x) { return /^(grand\s*)?total\b/i.test(tx(x)); })) break;
        if (!d || /^\d+$/.test(d)) continue;
        var g = function (k) { return k != null ? tx(rw[k]).replace(/,/g, '') : ''; };
        var q = g(col.qty), c = g(col.ctn), u = g(col.unit);
        if (!u && col.qty != null) u = /bag/i.test(col.qtyHdr) ? 'BAG' : /ctn|carton|case/i.test(col.qtyHdr) ? 'CTN' : /kg/i.test(col.qtyHdr) ? 'KG' : /mt|ton/i.test(col.qtyHdr) ? 'MT' : /pcs|pieces/i.test(col.qtyHdr) ? 'PCS' : '';
        if (sc === 'eg' && !c && /ctn|carton|case/i.test(u || col.qtyHdr)) c = q;
        if (!q && !c) continue;
        items.push({ desc: d, pack: g(col.pack), qty: sc === 'eg' && c === q ? '' : q, unit: u, ctn: c, pallets: g(col.pallets) }); } }
    if (head.origin && sc === 'rx') { head.country = head.origin; delete head.origin; }
    return { head: head, items: items }; }
  // ---- PDF / scan reading: the item table is found by the positions of its column headings
  var PACKRE = /(\d+\s*[x×*]\s*\d+(?:\.\d+)?\s*(?:g|gm|gms|gr|kg|kgs|ml|l|ltr|lt|oz)\b)/i;
  function unitFrom(h) { h = String(h || ''); return /bag/i.test(h) ? 'BAG' : /ctn|carton|case|box/i.test(h) ? 'CTN' : /\bkgs?\b/i.test(h) ? 'KG' : /\bm\.?\s*t|ton/i.test(h) ? 'MT' : /pcs|pieces|nos/i.test(h) ? 'PCS' : /fcl|container/i.test(h) ? 'FCL' : ''; }
  function docTable(lines) {
    var D = /desc|item|product|particular|commodity|goods|material/i, Q = /qty|quantity|qnty|package|pkgs|carton|ctn|bags|cases|^nos?\.?$/i, NOTQ = /price|rate|amount|value|weight|total\s*value|unit\s*price/i;
    for (var h = 0; h < lines.length; h++) {
      var dc = lines[h].cells.filter(function (c) { return c.t.length < 45 && D.test(c.t) && !/code|no\.?$/i.test(c.t); })[0]; if (!dc) continue;
      var block = []; for (var k = Math.max(0, h - 2); k <= Math.min(lines.length - 1, h + 2); k++) { if (k === h || lines[k].cells.every(function (c) { return c.t.length < 40 && !/\d{3,}/.test(c.t); })) block.push(k); }
      var hc = []; block.forEach(function (k) { lines[k].cells.forEach(function (c) { hc.push({ x0: c.x0, x1: c.x1, t: c.t }); }); });
      hc.sort(function (a, b) { return a.x0 - b.x0; }); var cols = [];
      hc.forEach(function (c) { var o = cols.filter(function (z) { return c.x0 < z.x1 + 2 && c.x1 > z.x0 - 2; })[0]; if (o) { o.x0 = Math.min(o.x0, c.x0); o.x1 = Math.max(o.x1, c.x1); o.t += ' ' + c.t; } else cols.push({ x0: c.x0, x1: c.x1, t: c.t }); });
      cols.sort(function (a, b) { return a.x0 - b.x0; });
      var ci = {}; cols.forEach(function (c, i) { var t = c.t;
        if (ci.desc == null && D.test(t) && !/^(container|code)/i.test(t)) ci.desc = i;
        else if (ci.pallets == null && /pallet|plt/i.test(t)) ci.pallets = i;
        else if (ci.pack == null && /per\s*carton|units?\s*\/|pack(ing)?\s*(size)?$|^size|spec/i.test(t) && !NOTQ.test(t)) ci.pack = i;
        else if (ci.qty == null && Q.test(t) && !NOTQ.test(t)) ci.qty = i;
        else if (ci.unit == null && /^(unit|uom)$/i.test(t)) ci.unit = i; });
      if (ci.desc == null || ci.qty == null) continue;
      var colOf = function (c) { var cx = (c.x0 + c.x1) / 2, best = -1, bd = 1e9; cols.forEach(function (z, i) { var d = cx < z.x0 ? z.x0 - cx : cx > z.x1 ? cx - z.x1 : 0; if (d < bd) { bd = d; best = i; } }); return best; };
      var start = Math.max.apply(null, block) + 1, items = [], cur = null, idle = 0;
      for (var r = start; r < lines.length && r < start + 70; r++) { var L = lines[r], row = {};
        if (L.cells.some(function (c) { return /^(total|grand\s*total|sub\s*-?\s*total)\b/i.test(c.t); })) break;
        L.cells.forEach(function (c) { var i = colOf(c); row[i] = (row[i] ? row[i] + ' ' : '') + c.t; });
        var d = String(row[ci.desc] || '').trim(), qn = (String(row[ci.qty] || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/) || [])[0];
        var info = /^(pro|exp|mfg|lot|batch|hs\s*code|production|expiry|best\s*before|net|gross)\b/i.test(d);
        if (d && !info && /[a-z]{3}/i.test(d) && (!cur || cur.q)) { cur = { desc: d, q: '', pack: row[ci.pack] || '', unit: row[ci.unit] || '', pal: row[ci.pallets] || '' }; items.push(cur); idle = 0; }
        else if (d && !info && cur && !cur.q && /[a-z]{3}/i.test(d)) cur.desc += ' ' + d;
        if (cur && qn && !cur.q) { cur.q = qn; cur.qt = row[ci.qty]; idle = 0; } else if (!d) idle++;
        if (cur && !cur.pack && row[ci.pack]) cur.pack = row[ci.pack];
        if (items.length && idle > 4) break; }
      items = items.filter(function (i) { return i.q; });
      if (items.length) return { items: items, qtyHdr: cols[ci.qty].t };
    }
    return null; }
  // no readable column headings (common on phone scans): look for a run of rows "description … numbers"
  function docRows(lines) {
    var num = function (t) { var m = String(t).replace(/,/g, '').match(/^\D{0,2}(\d+(?:\.\d+)?)\D{0,3}$/); return m ? Number(m[1]) : null; }, rows = [];
    lines.forEach(function (l) { var c = l.cells; if (!c.length) return; var m = /^[^a-z]{0,3}([a-z][a-z .,&()'\/-]*?(?:\d+(?:\.\d+)?\s*(?:kg|kilo|g|gm|ml|l|ltr)\b[a-z .,&()'\/-]*)?)\s*([\d.,|\[\]_ -]*)$/i.exec(c[0].t), d = m && m[1].trim();
      if (!d || d.length < 8 || !/[a-z]{3}/i.test(d) || /^(total|sub|grand|down|balance|bank|account|branch|date|buyer|address|tel|fax|email|payment|price|value)/i.test(d)) return;
      var nums = []; (m[2] + ' ' + c.slice(1).map(function (x) { return x.t; }).join(' ')).split(/[\s|\[\]_]+/).forEach(function (t) { var v = num(t); if (v != null) nums.push(v); });
      if (nums.length) rows.push({ d: d, nums: nums, y: l.y }); });
    // keep the largest group of rows sharing the first word (jam…, jam…, jam…)
    var g = {}; rows.forEach(function (r) { var k = r.d.split(/\s+/)[0].toLowerCase(); (g[k] = g[k] || []).push(r); });
    var best = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.length - a.length; })[0];
    if (!best || best.length < 2) return null;
    var items = best.map(function (r) { var n = r.nums, q = '', pack = '', ok = false, i, j, k;
      // quantity × price = value tells the right number apart from misread ones
      for (i = 0; i < n.length && !ok; i++) for (j = 0; j < n.length && !ok; j++) for (k = 0; k < n.length && !ok; k++) if (i !== j && j !== k && i !== k && n[i] >= 1 && Math.round(n[i]) === n[i] && n[k] > n[j] && Math.abs(n[i] * n[j] - n[k]) <= n[k] * 0.002) { q = n[i]; ok = true; }
      if (!ok) { var prices = n.filter(function (v) { return v % 1 !== 0 && v < 100000; }), vals = n.filter(function (v) { return v > 1000; });
        prices.some(function (p) { return vals.some(function (v) { var x = v / p; if (Math.abs(x - Math.round(x)) < 0.01 && x >= 1) { q = Math.round(x); ok = true; return true; } }); }); }
      var ints = n.filter(function (v) { return Math.round(v) === v; });
      if (!q) q = ints.filter(function (v) { return v >= 10 && v < 100000; })[0] || '';
      var small = ints.filter(function (v) { return v > 1 && v <= 48 && v !== q; })[0]; if (small) pack = String(small);
      return { desc: r.d.replace(/\s*[§]\s*/g, ' 5 '), q: q ? String(q) : '', pack: pack, unit: '', pal: '', unsure: !ok }; });
    return { items: items, qtyHdr: '', rows: true }; }
  function parseDocPO(doc, fname, sc) {
    var out = { rec: null, warn: [] }, lines = [], off = 0, textOnly = (doc.pageOcr || []).some(function (o) { return !o; });
    doc.pages.forEach(function (pg, pi) { if (textOnly && doc.pageOcr[pi]) return; pg.forEach(function (l) { lines.push({ y: l.y + off, cells: l.cells }); }); off += 100000; });
    if (!lines.length) { out.warn.push('no text could be read' + (doc.ocr ? ' from the scan (try a clearer photo)' : '')); return out; }
    var A = lines.map(function (l) { return l.cells.map(function (c) { return c.t; }); });
    // a label followed by several pieces on the same line: keep the pieces together as one value
    var LBL = /^(product|commodity|goods|quantity|qty|packing|packaging|pack\s*size|brand|payment(\s*terms?)?|terms\s*of\s*payment|shipment|shipping|origin|country\s*of\s*origin|port\s*of\s*discharge|destination|beneficiary|supplier|seller|exporter|buyer|address|date|rate|price|contract\s*value|contact\s*value|our\s*bank|bank\s*name|account\s*name|account\s*no\.?)\s*[:.]?$/i;
    A = A.map(function (r) { if (r.length < 3 || !LBL.test(r[0])) return r; var o = [r[0]], v = []; for (var k = 1; k < r.length; k++) { if (LBL.test(r[k])) { if (v.length) o.push(v.join(' ')); v = []; o.push(r[k]); } else v.push(r[k]); } if (v.length) o.push(v.join(' ')); return o; });
    var fr = readFreeSheet(A, sc, 400), H = fr.head;
    var rec = { poNo: H.poNo, poDate: H.poDate, supplier: H.supplier, shipper: H.shipper, brand: H.brand, sched: H.sched, port: H.port, payment: H.payment };
    if (sc === 'eg') rec.origin = H.origin || 'Egypt'; else rec.country = H.country || H.origin;
    // values without labels near the top: a reference like GVA/0036/2026-27 and a date
    var top = A.slice(0, 18).map(function (r) { return r.join(' '); });
    if (!rec.poNo) top.some(function (t) { var m = /\b([A-Z]{2,8}[\/-][A-Z0-9][A-Z0-9\/-]{3,24})\b/.exec(t); if (m && !/\d{6,}/.test(m[1].replace(/\D/g, '').slice(0, 0) + '') && !/^(P\.?O|TEL|FAX)/i.test(m[1])) { rec.poNo = m[1]; return true; } });
    if (!rec.poDate) top.some(function (t) { var m = /\b(\d{1,2}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{4}|[A-Za-z]{3,9}\.?,?\s*\d{1,2},?\s*\d{4})\b/.exec(t); if (m) { var d = cellIn(m[1], 'd'); if (/^\d{4}-\d\d-\d\d$/.test(d)) { rec.poDate = d; return true; } } });
    if (!rec.supplier) A.slice(0, 8).some(function (r) { var t = r.join(' '); if (/(ltd|limited|llc|l\.l\.c|co\.|company|industries|foods?|agro|pvt|gmbh|s\.a\.|inc\b|corp)/i.test(t) && !/baniyas|al-saih|buyer|consignee|to:/i.test(t) && t.length < 70) { rec.supplier = t.replace(/\s*\(.*?star export.*?\)/i, '').replace(/^[a-z ]{3,20}:\s*/i, '').trim(); return true; } });
    if (rec.supplier) rec.supplier = rec.supplier.replace(/^[:\-\s]+/, '').replace(/\s+\./g, '.').replace(/\s*,\s*/g, ', ').replace(/\.$/, '').trim();
    if (!rec.port && H.shipment) { var pm = /\bto\s+([a-z .'-]+?)(?:,|\s+by\b|$)/i.exec(H.shipment); if (pm) rec.port = pm[1].replace(/\s+/g, ' ').trim().replace(/\b\w/g, function (c) { return c.toUpperCase(); }).replace(/^Jebel Ali$/, 'Jebel Ali Port'); }
    // items: the table, else the Excel-style reader, else "Product / Quantity / Packing" lines
    var tb = docTable(lines) || docRows(lines), items = [];
    if (tb && tb.items.some(function (i) { return i.unsure; })) out.warn.push('some quantities were hard to read: check them in Review');
    if (tb) items = tb.items.map(function (i) { var desc = i.desc.replace(/^[^A-Za-z0-9]+/, '').replace(/\s+/g, ' ').trim(), pack = String(i.pack || '').trim(), pm2 = PACKRE.exec(desc);
      if (!pack && pm2) { pack = pm2[1].replace(/\s*[x×*]\s*/, ' x ').replace(/(\d)(g|gm|gms|gr|kg|kgs|ml|l|ltr|lt|oz)\b/i, '$1 $2').toLowerCase(); desc = desc.replace(pm2[1], '').replace(/\s+/g, ' ').trim(); }
      if (/^\d+$/.test(pack)) pack = pack + ' per carton';
      var u = String(i.unit || '').toUpperCase() || unitFrom(i.qt) || unitFrom(tb.qtyHdr);
      var it = { desc: desc.replace(/\b([A-Z])([A-Z]+)\b/g, function (w, a, b) { return a + b.toLowerCase(); }), pack: pack, qty: i.q, unit: u, ctn: '', pallets: String(i.pal || '').replace(/[^\d.]/g, '') };
      if (sc === 'eg' && (!u || u === 'CTN')) { it.ctn = i.q; it.qty = ''; it.unit = 'CTN'; } return it; });
    else if (fr.items.length) items = fr.items;
    else if (H.product) { H.product = H.product.replace(/^[^A-Za-z0-9]+/, ''); var q = String(H.quantity || ''), mt = /(\d[\d,.]*)\s*(?:mts?|m\.?\s*tons?|metric\s*tons?|mt)\b/i.exec(q), any = /(\d[\d,.]*)\s*([a-z]+)?/i.exec(q);
      var qty = mt ? mt[1] : any ? any[1] : '', unit = mt ? 'MT' : any && any[2] ? unitFrom(any[2]) || any[2].toUpperCase() : '';
      items = [{ desc: H.product.replace(/\.$/, ''), pack: String(H.packing || '').replace(/^packed\s*in\s*/i, '').replace(/\.$/, ''), qty: String(qty).replace(/,/g, ''), unit: unit, ctn: sc === 'eg' && unit === 'CTN' ? String(qty).replace(/,/g, '') : '', pallets: '' }];
      if (mt && any && /fcl/i.test(q)) rec.remarks = (rec.remarks ? rec.remarks + ' · ' : '') + q.replace(/^[:\s]+/, ''); }
    var fw = items.map(function (i) { return String(i.desc || '').split(' ')[0]; });
    items.forEach(function (i, x) { fw.forEach(function (w) { var me = fw[x]; if (w && w.length < me.length && me.length - w.length <= 2 && me.slice(-(w.length - 1)).toLowerCase() === w.slice(1).toLowerCase()) i.desc = w + i.desc.slice(me.length); }); });
    items.forEach(function (i) { if (i.desc && i.desc === i.desc.toLowerCase()) i.desc = i.desc.charAt(0).toUpperCase() + i.desc.slice(1); });
    if (rec.supplier && rec.supplier === rec.supplier.toLowerCase()) rec.supplier = rec.supplier.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }).replace(/\b(For|Of|And)\b/g, function (w) { return w.toLowerCase(); });
    if (sc !== 'eg' && !rec.country) { var om = /\b(indian|pakistani|chinese|thai|vietnamese|egyptian|turkish|brazilian|ukrainian|russian)\s+origin\b/i.exec(items.map(function (i) { return i.desc; }).join(' ')); if (om) rec.country = { indian: 'India', pakistani: 'Pakistan', chinese: 'China', thai: 'Thailand', vietnamese: 'Vietnam', egyptian: 'Egypt', turkish: 'Turkey', brazilian: 'Brazil', ukrainian: 'Ukraine', russian: 'Russia' }[om[1].toLowerCase()]; }
    if (!items.length) { out.warn.push('no items found: open Review and type them in'); items = [{ desc: '', pack: '', qty: '', unit: '', ctn: '', pallets: '' }]; }
    if (rec.poNo && /^\d{1,4}$/.test(rec.poNo)) rec.poNo = (rec.supplier ? rec.supplier.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' : '') + 'PI-' + rec.poNo + (rec.poDate ? '-' + rec.poDate.slice(2, 4) : '');
    if (!rec.poNo) { rec.poNo = String(fname || '').replace(/\.[^.]+$/, '').trim(); out.warn.push('PO / PI number not found, the file name is used'); }
    if (H.payment) rec.remarks = (rec.remarks ? rec.remarks + ' · ' : '') + 'Payment: ' + H.payment;
    if (!rec.supplier) out.warn.push(rec.poNo + ': supplier not found');
    if (sc === 'eg' && !rec.month) rec.month = monOf(rec.sched) || monOf(rec.poDate);
    rec.items = items; rec.kind = 'Purchase order'; out.rec = rec; return out; }
  function planImport(t, X, wb, wbs) {
    var plan = { t: t, jobs: [], bad: [], miss: [], newN: 0, updN: 0 };
    var addJob = function (label, isUpd, fn) { plan.jobs.push({ label: label, fn: fn }); if (isUpd) plan.updN++; else plan.newN++; };
    if (t.id === 'egc') return call('getEgyptData').then(function (d) { var r = readSheet(X, findSheet(wb, ['egypt', 'container']), C_EG); plan.miss = r.miss;
      var byRow = {}; d.rows.forEach(function (x) { byRow[x.row] = x; });
      r.rows.forEach(function (o, i) { var cur = byRow[o.row], m = o.month || (cur && cur.month) || monOf(o.sched) || monOf(today()); m = String(m).toUpperCase().trim();
        if (!/^[A-Z]{3} \d{4}$/.test(m)) { plan.bad.push('Row ' + (i + 2) + ': month "' + o.month + '" should look like NOV 2026'); return; }
        var v = {}; r.found.forEach(function (k) { if (k !== 'row' && k !== 'month') v[k] = o[k]; });
        if (!cur && !v.inv) { plan.bad.push('Row ' + (i + 2) + ': new entry without invoice number (put POs / schedules in the purchase order sheet)'); return; }
        if (!cur && !v.items && !v.container && !v.supplier) { plan.bad.push('Row ' + (i + 2) + ': needs items, container no. or supplier'); return; }
        addJob((cur ? 'Update ' : 'Add ') + m + ' · ' + (v.inv || cur && cur.inv || '') + ' ' + (v.container || ''), !!cur, function () { return call('saveEgyptEntry', { month: cur ? cur.month : m, v: v, row: cur ? cur.row : undefined }); }); });
      return plan; });
    if (t.id === 'egpo' || t.id === 'rxpo') { var sc = t.id === 'egpo' ? 'eg' : 'rx';
      return call('getPOs', sc).then(function (l) {
        var lc = function (x) { return String(x || '').trim().toLowerCase(); };
        var ex = {}, byNo = {}; l.forEach(function (p) { ex[p.id] = p; byNo[lc(p.poNo)] = p; });
        var got = {}, order = []; plan.files = []; plan.recs = [];
        var put = function (rec, file, how) { var k = lc(rec.poNo); if (!k) { plan.bad.push(file + ': no PO / schedule number found'); return; }
          if (!rec.items || !rec.items.length) { plan.bad.push(file + ': ' + rec.poNo + ' has no item lines'); return; }
          if (rec.items.every(function (i) { return !i.desc; })) how += ' · items missing';
          if (got[k]) plan.bad.push(file + ': PO ' + rec.poNo + ' is also in ' + got[k].file + ' (this file is used)'); else order.push(k);
          got[k] = { rec: rec, file: file, how: how }; };
        (wbs || [{ name: '', wb: wb }]).forEach(function (f) {
          if (f.err) { plan.bad.push(f.name + ': ' + f.err); return; }
          if (f.doc) { var dr = parseDocPO(f.doc, f.name, sc); dr.warn.forEach(function (w) { plan.bad.push(f.name + ': ' + w); }); if (dr.rec) put(dr.rec, f.name, (f.doc.pageOcr || []).every(Boolean) ? 'scan (OCR) · please review' : 'PDF · please review'); return; }
          var tws = templateSheet(f.wb);
          if (tws) { var r = readSheet(X, tws, C_PO), groups = {}, ord = [];
            r.rows.forEach(function (o, i) { var k = o.id || ('no:' + lc(o.poNo)); if (!o.poNo && !o.id) { plan.bad.push(f.name + ' row ' + (i + 2) + ': no PO / schedule no.'); return; }
              if (!groups[k]) { groups[k] = { head: o, items: [] }; ord.push(k); }
              if (o.i_desc || o.i_qty || o.i_ctn) groups[k].items.push({ desc: o.i_desc, pack: o.i_pack, qty: o.i_qty, unit: o.i_unit, ctn: o.i_ctn, pallets: o.i_pallets }); });
            ord.forEach(function (k) { var g = groups[k], h = g.head, rec = { id: h.id || '' };
              ['poNo', 'kind', 'poDate', 'supplier', 'shipper', 'brand', 'month', 'sched', 'port', 'status', 'remarks'].forEach(function (x) { if (r.found.indexOf(x) >= 0 && h[x] !== '') rec[x] = h[x]; });
              if (h.origin) { if (sc === 'eg') rec.origin = h.origin; else rec.country = h.origin; }
              rec.items = g.items; if (!rec.poNo && h.id && ex[h.id]) rec.poNo = ex[h.id].poNo; put(rec, f.name || 'file', 'template'); });
          } else { var fr = parseFreePO(X, f.wb, f.name, sc); fr.warn.forEach(function (w) { plan.bad.push(f.name + ': ' + w); }); if (fr.rec) put(fr.rec, f.name, 'PO layout'); }
        });
        order.forEach(function (k) { var g = got[k], rec = g.rec, cur = (rec.id && ex[rec.id]) || byNo[k];
          var full = Object.assign({}, cur || {}, rec, { sc: sc, id: cur ? cur.id : '' }); if (!cur && !full.status) full.status = 'Open';
          if (!cur && !full.kind) full.kind = sc === 'eg' ? 'Schedule' : 'Purchase order';
          plan.recs.push(full); var t2 = { n: full.items.length, q: 0, c: 0 }; full.items.forEach(function (i) { t2.q += num(i.qty); t2.c += num(i.ctn); });
          var ji = plan.jobs.length; plan.files.push({ ji: ji, rec: full, file: g.file, how: g.how, poNo: full.poNo, supplier: full.supplier || '', date: full.poDate || '', items: t2.n + ' item' + (t2.n > 1 ? 's' : '') + (sc === 'eg' ? (t2.c ? ' · ' + fmtN(t2.c) + ' ctn' : '') : (t2.q ? ' · qty ' + fmtN(t2.q) : '')), upd: !!cur });
          addJob((cur ? 'Update ' : 'Add ') + full.poNo, !!cur, function () { if (full.items.every(function (i) { return !i.desc; })) return Promise.reject(new Error('items missing, use Review')); return call('savePO', full); }); });
        return plan; }); }
    if (t.id === 'egi' || t.id === 'rxi' || t.id === 'mx') { var kind = t.id === 'egi' ? 'egInsp' : t.id === 'rxi' ? 'rxInsp' : 'matex', cols = t.id === 'mx' ? C_MX : C_IN;
      return call('getTab', kind).then(function (l) { var r = readSheet(X, findSheet(wb, [t.id === 'mx' ? 'matex' : 'inspection']), cols); plan.miss = r.miss.filter(function (h) { return !/^ID/.test(h); });
        var ex = {}; l.forEach(function (x) { ex[x.id] = x; });
        r.rows.forEach(function (o, i) { var cur = o.id && ex[o.id], rec = Object.assign({}, cur || {}); r.found.forEach(function (k) { rec[k] = o[k]; }); if (!cur) delete rec.id;
          if (kind !== 'matex' && !rec.invoice) { plan.bad.push('Row ' + (i + 2) + ': invoice number is required'); return; }
          addJob((cur ? 'Update ' : 'Add ') + (rec.invoice || rec.inv || rec.ref || rec.container || ''), !!cur, function () { return call('saveTabRow', kind, rec); }); });
        return plan; }); }
    if (t.id === 'rxs') return call('getData').then(function (d) {
      var rs = readSheet(X, findSheet(wb, ['shipment']), C_RX); plan.miss = rs.miss.filter(function (h) { return !/^Key/.test(h); });
      var ri = wb.SheetNames.some(function (n) { return /item/i.test(n); }) ? readSheet(X, findSheet(wb, ['item']), C_RXI).rows : [];
      var rc = wb.SheetNames.some(function (n) { return /container/i.test(n); }) ? readSheet(X, findSheet(wb, ['container']), C_RXC).rows : [];
      var byKey = {}; d.shipments.forEach(function (s) { byKey[s.key] = s; });
      rs.rows.forEach(function (o, i) { var cur = o.key && byKey[o.key], s = Object.assign({}, cur || {});
        rs.found.forEach(function (k) { if (k !== 'key') s[k] = o[k]; });
        var ids = [o.key, o.po, o.invoice, o.pi].filter(Boolean).map(function (x) { return String(x).toLowerCase(); });
        var mine = function (x) { return ids.indexOf(String(x.key || '').toLowerCase()) >= 0; };
        var its = ri.filter(mine), cs = rc.filter(mine);
        s.items = its.length ? its.map(function (x) { return { desc: x.desc, qty: x.qty, unit: x.unit, inv: x.inv, remarks: x.remarks }; }) : (cur ? d.items.filter(function (x) { return x.invoice === cur.key; }) : []);
        s.containers = cs.length ? cs.map(function (x) { return { no: x.no, size: x.size, seal: x.seal, remarks: x.remarks }; }) : (cur ? (d.containers || []).filter(function (x) { return x.key === cur.key; }) : []);
        if (s.containers.length) { var cnt = {}; s.containers.forEach(function (c) { if (c.size) cnt[c.size] = (cnt[c.size] || 0) + 1; }); s.ref = s.containers.map(function (c) { return c.no; }).join(', '); s.contQty = String(s.containers.length); s.contSize = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0] || ''; }
        if (s.piDate && /^\d{4}-\d\d/.test(s.piDate)) s.month = monOf(s.piDate);
        if (!s.month) s.month = monOf(s.etd) || monOf(today());
        if (!s.invoice && !s.po && !s.pi && !s.poNs && !s.piNs) { plan.bad.push('Row ' + (i + 2) + ': needs a PO, PI or invoice number'); return; }
        if (s.imo) { s.imo = String(s.imo).replace(/\D/g, ''); if (!/^\d{7}$/.test(s.imo)) { plan.bad.push('Row ' + (i + 2) + ': IMO must have 7 digits'); return; } }
        addJob((cur ? 'Update ' : 'Add ') + (s.invoice || s.po || s.pi), !!cur, function () { return call('saveShipment', s, cur ? cur.key : null); }); });
      return plan; });
    return Promise.reject(new Error('Unknown table'));
  }
  function showPlan(p) {
    $(XL.out).innerHTML = '<div class="xlp"><b>' + esc(p.t.t) + '</b>: ' + p.newN + ' new, ' + p.updN + ' to update' + (p.bad.length ? ', <span class="bad">' + p.bad.length + ' row(s) skipped</span>' : '') +
      (p.miss.length ? '<div class="mu" style="margin-top:4px">Columns not found in the file (left unchanged): ' + esc(p.miss.slice(0, 12).join(', ')) + (p.miss.length > 12 ? '…' : '') + '</div>' : '') +
      (p.files && p.files.length ? '<div class="tw" style="margin-top:8px;max-height:260px;overflow:auto"><table class="cmp"><thead><tr><th>File</th><th>PO / schedule no.</th><th>Supplier</th><th>PO date</th><th>Items</th><th></th></tr></thead><tbody>' + p.files.map(function (f) { return '<tr><td data-label="File">' + esc(f.file) + '<div class="mu" style="font-size:11px">read as ' + esc(f.how) + '</div></td><td data-label="PO"><b>' + esc(f.poNo) + '</b></td><td data-label="Supplier">' + (f.supplier ? esc(f.supplier) : '<span class="bad">not found</span>') + '</td><td data-label="Date">' + esc(f.date || '-') + '</td><td data-label="Items">' + esc(f.items) + '</td><td data-label="">' + (f.saved ? '<span class="pst f">saved</span>' : (f.upd ? '<span class="pst p">update</span>' : '<span class="pst o">new</span>') + (/review/.test(f.how) && canEdit(XL.sc) ? ' <button type="button" class="sm p" data-xrv="' + p.files.indexOf(f) + '">Review &amp; save</button>' : '')) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      (p.bad.length ? '<div class="bad" style="margin-top:6px;font-size:12.5px">' + p.bad.slice(0, 15).map(esc).join('<br>') + (p.bad.length > 15 ? '<br>…' : '') + '</div>' : '') +
      (p.jobs.length ? '<div class="mu" style="margin-top:6px;font-size:12px;max-height:120px;overflow:auto">' + p.jobs.slice(0, 40).map(function (j) { return esc(j.label); }).join('<br>') + (p.jobs.length > 40 ? '<br>… and ' + (p.jobs.length - 40) + ' more' : '') + '</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:10px"><button class="p" type="button" id="xl-go"' + (p.jobs.length ? '' : ' disabled') + '>Import ' + (p.jobs.filter(function (j) { return !j.done; }).length) + (/po$/.test(p.t.id) ? ' purchase order(s)' : ' row(s)') + '</button>' + (p.recs && p.recs.length ? '<button type="button" id="xl-one">⬇ Download all as one Excel</button>' : '') + '<button type="button" id="xl-cancel">Cancel</button><span class="mu" id="xl-s" style="align-self:center"></span></div>' + (p.files && p.files.some(function (f) { return f.how !== 'template'; }) ? '<div class="mu" style="font-size:12px;margin-top:6px">Check that the PO numbers, suppliers and items were read correctly. If a file was not read right, click <b>Download all as one Excel</b>, correct it there, and import that one file.</div>' : '') + '</div>'; }
  function runImport() { var p = XL.plan; if (!p || !p.jobs.length) return; var ok = 0, fail = [], i = 0; $('xl-go').disabled = true; $('xl-cancel').disabled = true;
    var next = function () { if (i >= p.jobs.length) { $('xl-s').textContent = ''; $(XL.out).innerHTML = '<div class="xlp"><b>Import finished:</b> ' + ok + ' saved' + (fail.length ? ', <span class="bad">' + fail.length + ' failed</span><div class="bad" style="font-size:12.5px;margin-top:4px">' + fail.slice(0, 15).map(esc).join('<br>') + '</div>' : '') + '.</div>'; XL.plan = null;
        reload(XL.sc); refreshBadges(); if (XL.out === 'po-xp') loadPOs(); return; }
      var j = p.jobs[i++]; if (j.done) { ok++; return next(); } $('xl-s').textContent = 'Saving ' + i + ' of ' + p.jobs.length + '…';
      Promise.resolve().then(j.fn).then(function () { ok++; }, function (e) { fail.push(j.label + ': ' + e.message); }).then(next); };
    next(); }

  // ================================================================== SUMMARY REPORT
  var RP = { eg: null, rx: null, poEg: [], poRx: [] };
  function openReport(sc) {
    var both = canView('eg') && canView('rx'), d = new Date(), first = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0), lastS = last.getFullYear() + '-' + String(last.getMonth() + 1).padStart(2, '0') + '-' + String(last.getDate()).padStart(2, '0');
    var g = [['month', 'Month-wise'], ['date', 'Date-wise'], ['item', 'Item-wise'], ['cont', 'Container-wise'], ['sup', 'Supplier-wise'], ['shp', 'Shipper-wise'], ['po', 'Open purchase orders / schedules']];
    $('rp-f').innerHTML = '<label>Section<select id="rp-s">' + (canView('eg') ? '<option value="eg"' + (sc === 'eg' ? ' selected' : '') + '>Egypt</option>' : '') + (canView('rx') ? '<option value="rx"' + (sc === 'rx' ? ' selected' : '') + '>BST Global Import</option>' : '') + (both ? '<option value="both">Both sections</option>' : '') + '</select></label>' +
      '<label>From<input type="date" id="rp-a" value="' + first + '"></label><label>To<input type="date" id="rp-b" value="' + lastS + '"></label>' +
      '<label>Date used<select id="rp-k"><option value="disp">Dispatch date (actual, else planned)</option><option value="arr">Arrival / ETA</option><option value="del">Warehouse delivery date</option><option value="any">Any of these dates</option></select></label>' +
      '<div class="ck">' + g.map(function (x) { return '<label><input type="checkbox" data-rg="' + x[0] + '" checked> ' + x[1] + '</label>'; }).join('') + '<label><input type="checkbox" id="rp-u"> Include entries without a date</label></div>' +
      '<div class="go"><button class="p" type="button" id="rp-go">Make report</button><button type="button" data-rq="m">This month</button><button type="button" data-rq="pm">Last month</button><button type="button" data-rq="y">This year</button></div>';
    $('rp-o').innerHTML = '<div class="rpd"><div class="mu">Choose the period and click <b>Make report</b>.</div></div>';
    $('ovrp').style.display = 'block'; document.body.style.overflow = 'hidden';
    $('rp-go').onclick = makeReport;
    $('rp-f').querySelectorAll('[data-rq]').forEach(function (b) { b.onclick = function () { var t = new Date(), a, z;
      if (b.dataset.rq === 'm') { a = new Date(t.getFullYear(), t.getMonth(), 1); z = new Date(t.getFullYear(), t.getMonth() + 1, 0); }
      else if (b.dataset.rq === 'pm') { a = new Date(t.getFullYear(), t.getMonth() - 1, 1); z = new Date(t.getFullYear(), t.getMonth(), 0); }
      else { a = new Date(t.getFullYear(), 0, 1); z = new Date(t.getFullYear(), 11, 31); }
      var f = function (x) { return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
      $('rp-a').value = f(a); $('rp-b').value = f(z); makeReport(); }; });
    makeReport();
  }
  $('rp-x').onclick = function () { $('ovrp').style.display = 'none'; document.body.style.overflow = ''; };
  $('rp-pr').onclick = function () { document.body.classList.add('rp-print'); setTimeout(function () { window.print(); }, 50); };
  window.addEventListener('afterprint', function () { document.body.classList.remove('rp-print'); });
  function egDate(r, k) { var d = k === 'disp' ? (r.actual || r.sched) : k === 'arr' ? r.eta : k === 'del' ? r.delivered : (r.actual || r.sched || r.eta || r.delivered); return String(d || '').slice(0, 10); }
  function rxDate(s, k) { var d = k === 'disp' ? (s.atd || s.etd || s.piDate) : k === 'arr' ? (s.ata || s.eta) : k === 'del' ? s.whDate : (s.atd || s.etd || s.ata || s.eta || s.whDate || s.piDate); return String(d || '').slice(0, 10); }
  var RXDONE = ['Delivered to warehouse', 'Purchase not booked', 'Purchase booked'];
  function egItems(t) { return String(t || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { var m = /^(.*?)\s*(?:\(([^)]*)\))?\s*(?::\s*([\d,.]+)\s*ctn)?\s*(?:\/\s*([\d,.]+)\s*plt)?\s*$/i.exec(x) || [];
    return { n: (m[1] || x).trim(), p: m[2] || '', c: num((m[3] || '').replace(/,/g, '')), l: num((m[4] || '').replace(/,/g, '')) }; }); }
  function egCtn(r) { if (num(r.ctn)) return num(r.ctn); var c = 0; egItems(r.items).forEach(function (i) { c += i.c; }); return c; }
  function egPlt(r) { if (num(r.pallets)) return num(r.pallets); var c = 0; egItems(r.items).forEach(function (i) { c += i.l; }); return c; }
  function tbl(head, rows, foot) { return '<table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
    (foot ? '<tr class="t">' + foot.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>' : '') + '</tbody></table>'; }
  var grp = function (l, kf) { var m = {}, o = []; l.forEach(function (x) { var k = kf(x) || '—'; if (!m[k]) { m[k] = []; o.push(k); } m[k].push(x); }); return { keys: o, map: m }; };
  var dfmt = function (d) { if (!/^\d{4}-\d\d-\d\d/.test(d || '')) return esc(d || '-'); var x = new Date(d + 'T00:00:00'); return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
  function makeReport() {
    var sc = $('rp-s').value, a = $('rp-a').value, z = $('rp-b').value, k = $('rp-k').value, und = $('rp-u').checked, G = {};
    $('rp-f').querySelectorAll('[data-rg]').forEach(function (c) { G[c.dataset.rg] = c.checked; });
    if (a && z && a > z) { alert('"From" is after "To".'); return; }
    $('rp-o').innerHTML = '<div class="rpd"><div class="mu">Collecting the data…</div></div>';
    var need = sc === 'both' ? ['eg', 'rx'] : [sc];
    Promise.all(need.map(function (s) { return Promise.all([s === 'eg' ? call('getEgyptData') : call('getData'), call('getPOs', s).catch(function () { return []; })]); }))
      .then(function (res) { var data = {}; need.forEach(function (s, i) { data[s] = { d: res[i][0], po: res[i][1] }; }); $('rp-o').innerHTML = buildReport(data, need, a, z, k, und, G); })
      .catch(function (e) { $('rp-o').innerHTML = '<div class="rpd"><div class="late">' + esc(e.message) + '</div></div>'; });
  }
  var KLAB = { disp: 'dispatch date', arr: 'arrival / ETA', del: 'warehouse delivery date', any: 'any date' };
  function buildReport(data, need, a, z, k, und, G) {
    var me = B.me() || {}, inR = function (d) { return d ? (!a || d >= a) && (!z || d <= z) : und; };
    var logo = ($('hlogo') && $('hlogo').src) || '';
    var h = '<div class="rpd"><div class="rh">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') + '<div><h1>Import Shipment Summary Report</h1><div class="m">Baniyas Spike Trading Co. L.L.C. · ' + need.map(function (s) { return SECN[s]; }).join(' &amp; ') + '</div>' +
      '<div class="m">Period: <b>' + dfmt(a) + ' – ' + dfmt(z) + '</b> (by ' + KLAB[k] + ')' + (und ? ' · including entries without a date' : '') + '</div></div></div>';
    need.forEach(function (sc) {
      var D0 = data[sc].d, pos = data[sc].po;
      if (sc === 'eg') {
        var L = D0.rows.filter(function (r) { return inR(egDate(r, k)); }).sort(function (x, y) { return egDate(x, k).localeCompare(egDate(y, k)); });
        var tot = { n: L.length, ctn: 0, plt: 0, del: 0, road: 0, over: 0 }; L.forEach(function (r) { tot.ctn += egCtn(r); tot.plt += egPlt(r); if (r.delivered || /^delivered/i.test(r.alert || '')) tot.del++; else { if (r.actual) tot.road++; if (/^overdue/i.test(r.alert || '')) tot.over++; } });
        var openPO = pos.filter(function (p) { return p.status !== 'Fully shipped' && p.status !== 'Cancelled'; });
        h += '<h2>Egypt · road containers</h2><div class="kp">' + [['Containers', tot.n], ['Cartons (CTN)', fmtN(tot.ctn)], ['Pallets', fmtN(tot.plt)], ['Delivered', tot.del], ['On the road / at border', tot.road], ['Overdue', tot.over], ['Open POs / schedules', openPO.length]]
          .map(function (x) { return '<div><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>';
        if (!L.length) h += '<div class="nt" style="margin-top:8px">No Egypt containers in this period.</div>';
        else {
          if (G.month) { var gm = grp(L, function (r) { return r.month; }); h += '<h3>Month-wise</h3>' + tbl(['Month', 'Containers', 'CTN', 'Pallets', 'Delivered', 'Pending'], gm.keys.sort(function (x, y) { return monKey(x) - monKey(y); }).map(function (m) { var l = gm.map[m], c = 0, p = 0, dl = 0; l.forEach(function (r) { c += egCtn(r); p += egPlt(r); if (r.delivered || /^delivered/i.test(r.alert || '')) dl++; }); return [esc(m), l.length, fmtN(c), fmtN(p), dl, l.length - dl]; }), ['Total', tot.n, fmtN(tot.ctn), fmtN(tot.plt), tot.del, tot.n - tot.del]); }
          if (G.date) { var gd = grp(L, function (r) { return egDate(r, k); }); h += '<h3>Date-wise (' + KLAB[k] + ')</h3>' + tbl(['Date', 'Containers', 'Invoices', 'CTN'], gd.keys.map(function (d) { var l = gd.map[d], c = 0; l.forEach(function (r) { c += egCtn(r); }); return [dfmt(d), l.length, esc(l.map(function (r) { return r.inv || '-'; }).join(', ')), fmtN(c)]; }), ['Total', tot.n, '', fmtN(tot.ctn)]); }
          if (G.item) { var im = {}, io = []; L.forEach(function (r) { egItems(r.items).forEach(function (i) { var key = i.n.toLowerCase() + '|' + i.p.toLowerCase(); if (!im[key]) { im[key] = { n: i.n, p: i.p, c: 0, l: 0, k: {} }; io.push(key); } im[key].c += i.c; im[key].l += i.l; im[key].k[r.row] = 1; }); });
            io.sort(function (x, y) { return im[y].c - im[x].c; }); var tc = 0, tl = 0; io.forEach(function (x) { tc += im[x].c; tl += im[x].l; });
            h += '<h3>Item-wise</h3>' + tbl(['Item', 'Pack size', 'Containers', 'CTN', 'Pallets'], io.map(function (x) { var i = im[x]; return [esc(i.n), esc(i.p || '-'), Object.keys(i.k).length, fmtN(i.c), fmtN(i.l)]; }), ['Total', '', '', fmtN(tc), fmtN(tl)]); }
          if (G.cont) h += '<h3>Container-wise</h3>' + tbl(['Container / vehicle', 'Invoice', 'Supplier', 'Items', 'CTN', 'Dispatched', 'ETA', 'Delivered', 'Position'], L.map(function (r) { return ['<b>' + esc(r.container || r.vehicle || 'SR ' + r.sr) + '</b>', esc(r.inv || '-'), esc(r.supplier || '-'), esc(egItems(r.items).map(function (i) { return i.n; }).join(', ')), fmtN(egCtn(r)), dfmt(r.actual || r.sched), dfmt(r.eta), dfmt(r.delivered), esc(r.position || '')]; }), ['Total ' + tot.n, '', '', '', fmtN(tot.ctn), '', '', '', '']);
          if (G.sup) { var gs = grp(L, function (r) { return r.supplier; }); h += '<h3>Supplier-wise</h3>' + tbl(['Supplier', 'Containers', 'CTN', 'Pallets', 'Delivered', 'Pending'], gs.keys.sort().map(function (s) { var l = gs.map[s], c = 0, p = 0, dl = 0; l.forEach(function (r) { c += egCtn(r); p += egPlt(r); if (r.delivered || /^delivered/i.test(r.alert || '')) dl++; }); return [esc(s), l.length, fmtN(c), fmtN(p), dl, l.length - dl]; }), ['Total', tot.n, fmtN(tot.ctn), fmtN(tot.plt), tot.del, tot.n - tot.del]); }
          if (G.shp) { var gb = grp(L, function (r) { return r.brand; }); h += '<h3>Shipper / brand-wise</h3><div class="nt">Egypt road entries record the brand, not a separate shipper.</div>' + tbl(['Brand', 'Containers', 'CTN'], gb.keys.sort().map(function (s) { var l = gb.map[s], c = 0; l.forEach(function (r) { c += egCtn(r); }); return [esc(s), l.length, fmtN(c)]; })); }
        }
        if (G.po && openPO.length) h += '<h3>Open purchase orders / schedules</h3>' + tbl(['PO / schedule', 'Planned dispatch', 'Supplier', 'Items', 'CTN ordered', 'Status'], openPO.map(function (p) { var c = 0; p.items.forEach(function (i) { c += num(i.ctn); }); return ['<b>' + esc(p.poNo) + '</b>', dfmt(p.sched), esc(p.supplier || '-'), esc(p.items.map(function (i) { return i.desc + (i.ctn ? ' ' + fmtN(i.ctn) + ' ctn' : ''); }).join(', ')), fmtN(c), esc(p.status || 'Open')]; }));
      } else {
        var S = D0.shipments.filter(function (s) { return inR(rxDate(s, k)); }).sort(function (x, y) { return rxDate(x, k).localeCompare(rxDate(y, k)); });
        var itemsOf = function (key) { return D0.items.filter(function (i) { return i.invoice === key; }); }, contsOf = function (key) { return (D0.containers || []).filter(function (c) { return c.key === key; }); };
        var nC = function (s) { var c = contsOf(s.key).length; return c || num(s.contQty); };
        var isDone = function (s) { return RXDONE.indexOf(s.stage) >= 0 || !!s.whDate; };
        var t2 = { n: S.length, c: 0, del: 0, tr: 0, port: 0 }; S.forEach(function (s) { t2.c += nC(s); if (isDone(s)) t2.del++; else if (/transit|departed|loaded/i.test(s.stage || '')) t2.tr++; else if (/port|customs|release|arrived/i.test(s.stage || '')) t2.port++; });
        var qtyTxt = function (l) { var m = {}; l.forEach(function (i) { if (i.qty !== '' && !isNaN(Number(i.qty))) m[i.unit || 'units'] = (m[i.unit || 'units'] || 0) + Number(i.qty); }); var ks = Object.keys(m); return ks.length ? ks.map(function (u) { return fmtN(m[u]) + ' ' + esc(u); }).join(' · ') : '-'; };
        var allIt = function (l) { var o = []; l.forEach(function (s) { o = o.concat(itemsOf(s.key)); }); return o; };
        var openPO2 = pos.filter(function (p) { return p.status !== 'Fully shipped' && p.status !== 'Cancelled'; });
        h += '<h2>BST Global Import · shipments</h2><div class="kp">' + [['Shipments', t2.n], ['Containers', t2.c], ['Delivered / booked', t2.del], ['In transit', t2.tr], ['At port / customs', t2.port], ['Quantity', qtyTxt(allIt(S))], ['Open POs', openPO2.length]]
          .map(function (x) { return '<div><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>';
        var ref = function (s) { return esc([s.invoice, s.po && 'PO ' + s.po, s.pi && 'PI ' + s.pi].filter(Boolean).join(' · ') || s.key); };
        if (!S.length) h += '<div class="nt" style="margin-top:8px">No Global shipments in this period.</div>';
        else {
          if (G.month) { var gm2 = grp(S, function (s) { return s.month || monOf(rxDate(s, k)); }); h += '<h3>Month-wise</h3>' + tbl(['Month', 'Shipments', 'Containers', 'Quantity', 'Delivered', 'Pending'], gm2.keys.sort(function (x, y) { return monKey(x) - monKey(y); }).map(function (m) { var l = gm2.map[m], c = 0, dl = 0; l.forEach(function (s) { c += nC(s); if (isDone(s)) dl++; }); return [esc(m), l.length, c, qtyTxt(allIt(l)), dl, l.length - dl]; }), ['Total', t2.n, t2.c, qtyTxt(allIt(S)), t2.del, t2.n - t2.del]); }
          if (G.date) { var gd2 = grp(S, function (s) { return rxDate(s, k); }); h += '<h3>Date-wise (' + KLAB[k] + ')</h3>' + tbl(['Date', 'Shipments', 'References', 'Containers'], gd2.keys.map(function (d) { var l = gd2.map[d], c = 0; l.forEach(function (s) { c += nC(s); }); return [dfmt(d), l.length, l.map(ref).join('<br>'), c]; }), ['Total', t2.n, '', t2.c]); }
          if (G.item) { var im2 = {}, io2 = []; S.forEach(function (s) { itemsOf(s.key).forEach(function (i) { var key = String(i.desc || '').toLowerCase().trim() + '|' + (i.unit || ''); if (!im2[key]) { im2[key] = { n: i.desc, u: i.unit, q: 0, s: {} }; io2.push(key); } im2[key].q += num(i.qty); im2[key].s[s.key] = 1; }); });
            io2.sort(function (x, y) { return im2[y].q - im2[x].q; });
            h += '<h3>Item-wise</h3>' + tbl(['Item', 'Unit', 'Shipments', 'Quantity'], io2.map(function (x) { var i = im2[x]; return [esc(i.n || '-'), esc(i.u || '-'), Object.keys(i.s).length, fmtN(i.q)]; })); }
          if (G.cont) { var cr = []; S.forEach(function (s) { var cl = contsOf(s.key); (cl.length ? cl : [{ no: s.ref || '-', size: s.contSize }]).forEach(function (c) { cr.push(['<b>' + esc(c.no) + '</b>', esc(c.size || '-'), ref(s), esc(s.supplier || '-'), esc(s.port || '-'), dfmt(s.atd || s.etd), dfmt(s.ata || s.eta), esc(s.stage || '')]); }); });
            h += '<h3>Container-wise</h3>' + tbl(['Container', 'Size', 'Shipment', 'Supplier', 'Arrival port', 'Departure', 'Arrival', 'Stage'], cr); }
          if (G.sup) { var gs2 = grp(S, function (s) { return s.supplier; }); h += '<h3>Supplier-wise</h3>' + tbl(['Supplier', 'Shipments', 'Containers', 'Quantity', 'Delivered', 'Pending'], gs2.keys.sort().map(function (x) { var l = gs2.map[x], c = 0, dl = 0; l.forEach(function (s) { c += nC(s); if (isDone(s)) dl++; }); return [esc(x), l.length, c, qtyTxt(allIt(l)), dl, l.length - dl]; }), ['Total', t2.n, t2.c, qtyTxt(allIt(S)), t2.del, t2.n - t2.del]); }
          if (G.shp) { var gh = grp(S, function (s) { return s.shipper; }); h += '<h3>Shipper-wise</h3>' + tbl(['Shipper', 'Shipments', 'Containers', 'Quantity', 'Delivered', 'Pending'], gh.keys.sort().map(function (x) { var l = gh.map[x], c = 0, dl = 0; l.forEach(function (s) { c += nC(s); if (isDone(s)) dl++; }); return [esc(x), l.length, c, qtyTxt(allIt(l)), dl, l.length - dl]; }), ['Total', t2.n, t2.c, qtyTxt(allIt(S)), t2.del, t2.n - t2.del]); }
        }
        if (G.po && openPO2.length) h += '<h3>Open purchase orders</h3>' + tbl(['PO', 'ETD', 'Supplier', 'Shipper', 'Items', 'Status'], openPO2.map(function (p) { return ['<b>' + esc(p.poNo) + '</b>', dfmt(p.sched), esc(p.supplier || '-'), esc(p.shipper || '-'), esc(p.items.map(function (i) { return i.desc + (i.qty ? ' ' + fmtN(i.qty) + ' ' + (i.unit || '') : ''); }).join(', ')), esc(p.status || 'Open')]; }));
      }
    });
    var now = new Date();
    h += '<div class="ft"><span>Prepared by ' + esc(me.name || me.userId || '') + ' · BST Shipment Tracker</span><span>Generated ' + esc(now.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</span></div></div>';
    return h;
  }

  // ================================================================== EDIT FROM THE PRODUCT TRACKER
  if (typeof window.trDetail === 'function') {
    var origTrDetail = window.trDetail;
    window.trDetail = function () { var out = origTrDetail.apply(this, arguments);
      try { var el = $('tr-det'), r = window.TR && TR.list ? TR.list[TR.sel] : null;
        if (el && r && canEdit(r.sc) && !el.querySelector('.trd-ed')) { el.insertAdjacentHTML('afterbegin', '<div class="trd-ed"><span>✏️ Click these details to edit this ' + (r.sc === 'eg' ? 'container entry' : 'shipment') + '</span><button type="button" data-tred="1">Edit</button></div>'); el.classList.add('ed'); }
        else if (el && !(r && canEdit(r.sc))) el.classList.remove('ed'); } catch (e) {}
      return out; };
  }
  document.addEventListener('click', function (e) { var el = $('tr-det'); if (!el || !el.contains(e.target) || !el.classList.contains('ed')) return;
    if (e.target.closest('a,input,select,textarea') || (e.target.closest('button') && !e.target.closest('[data-tred]'))) return;
    var r = window.TR && TR.list ? TR.list[TR.sel] : null; if (!r || !canEdit(r.sc)) return;
    if (r.sc === 'eg') openEg(r.x); else openEdit(r.x); });
  // after a save, refresh the tracker list when it is open
  if (typeof window.renderAll === 'function') { var origRA = window.renderAll;
    window.renderAll = function () { var out = origRA.apply(this, arguments); try { if ($('ovtr') && $('ovtr').style.display === 'block' && typeof trRender === 'function') trRender(true); } catch (e) {} setTimeout(refreshBadges, 300); return out; }; }

  // ================================================================== FILL A CONTAINER ENTRY FROM AN INVOICE / PACKING LIST / B/L
  var ISOV = '0123456789A?BCDEFGHIJK?LMNOPQRSTU?VWXYZ';
  function isoOk(c) { var s = 0; for (var i = 0; i < 10; i++) { var v = ISOV.indexOf(c[i]); if (v < 0) return false; s += v * Math.pow(2, i); } return (s % 11) % 10 === Number(c[10]); }
  function shipDoc(doc, fname, sc) {
    var po = parseDocPO(doc, fname, sc), r = po.rec || {}, base = String(fname || '').replace(/\.[^.]+$/, '').trim();
    var all = [], off = 0; doc.pages.forEach(function (pg) { pg.forEach(function (l) { all.push(l.cells.map(function (c) { return c.t; })); }); });
    var text = all.map(function (r2) { return r2.join(' | '); }).join('\n'), up = text.toUpperCase();
    var o = { inv: r.poNo && r.poNo !== base ? r.poNo : '', invDate: r.poDate || '', supplier: r.supplier || '', shipper: r.shipper || '', brand: r.brand || '', port: r.port || '', etd: r.sched || '',
      origin: r.origin && r.origin !== 'Egypt' ? r.origin : r.country || '', items: (r.items || []).filter(function (i) { return i.desc; }), conts: [], size: '', bl: '', vessel: '', voyage: '', batch: '', amount: '', seal: '' };
    if (sc === 'eg' && !o.origin && r.origin) o.origin = r.origin;
    if (/\bPI-\d/.test(o.inv) && !/proforma/i.test(text)) o.inv = '';
    // containers (ISO 6346 with a valid check digit)
    var seen = {}, cand = [], m, re = /\b([A-Z]{3}[UJZ])\s?(\d{6})\s?-?\s?(\d)(?!\d)/g;
    while ((m = re.exec(up))) { var c = m[1] + m[2] + m[3]; if (seen[c]) continue; seen[c] = 1; (isoOk(c) ? o.conts : cand).push(c); }
    if (!o.conts.length) o.conts = cand.slice(0, 3);
    var sz = /(\d+)\s*[X×*]\s*(20|40|45)(?!\d)\s*['’"]?\s*(HC|HQ|GP|DV|RF|RH|STD|FT|FCL)?/.exec(up) || /\b(20|40|45)\s*['’"]\s*(HC|HQ|GP|DV|RF|RH|STD)?/.exec(up);
    var tc = function (v) { v = String(v || ''); return v && v === v.toUpperCase() && /[A-Z]{3}/.test(v) ? v.toLowerCase().replace(/(^|[\s(\/-])([a-z])/g, function (a, b, c) { return b + c.toUpperCase(); }).replace(/\b(Co|Ltd|Llc|Pvt|Inc|Fze|Fzco)\b\.?/g, function (w) { return w.toUpperCase() === 'LLC' || w.toUpperCase() === 'FZE' || w.toUpperCase() === 'FZCO' ? w.toUpperCase() : w; }) : v; };
    if (sz) { var ft = sz.length > 3 ? sz[2] : sz[1], ty = (sz.length > 3 ? sz[3] : sz[2]) || '', S = (window.D && D.sizes) || [];
      o.size = S.filter(function (z) { return z.indexOf(ft) === 0 && ty && /HC|HQ/.test(ty) && /HC|HQ|high/i.test(z); })[0] || S.filter(function (z) { return z.indexOf(ft) === 0 && !/HC|HQ|high|reef|RF/i.test(z); })[0] || S.filter(function (z) { return z.indexOf(ft) === 0; })[0] || ''; }
    var lines2 = text.split('\n'), lab = function (rx) { var x = null; lines2.some(function (ln) { x = rx.exec(ln); return !!x; }); return x ? x[x.length - 1].replace(/^[\s:|.#-]+/, '').replace(/\s*\|.*$/, '').trim() : ''; };
    o.bl = lab(/\b(?:b\s*\/\s*l|bill\s*of\s*lading|bl)\s*(?:no|number|#)\.?\s*[:.]?\s*\|?\s*([A-Z0-9][A-Z0-9-]{5,24})/i);
    var vs = lab(/\b(?:ocean\s*)?vessel(?:\s*name)?(?:\s*(?:\/|&|and)\s*voy(?:age)?(?:\s*no)?)?\.?\s*[:.]?\s*\|?\s*([A-Z][A-Z0-9 .'-]{2,40}(?:\s*(?:V\.?|VOY\.?|\/)\s*[A-Z0-9]{2,10})?)/i);
    if (vs && !/^(by|for|the|name|voyage)\b/i.test(vs)) { var vv = /^(.*?)(?:\s*(?:\/|\bV\.?|\bVOY\.?)\s*([A-Z0-9]{2,10}))?$/i.exec(vs); o.vessel = vv[1].trim(); o.voyage = vv[2] || ''; }
    if (!o.voyage) o.voyage = lab(/\bvoy(?:age)?\s*(?:no|number)?\.?\s*[:.]?\s*\|?\s*([A-Z0-9]{2,12})\b/i);
    o.batch = lab(/\b(?:lot|batch)\s*(?:no|number)?\.?\s*[:.]?\s*([A-Z0-9][A-Z0-9\/-]{2,20})/i);
    o.seal = lab(/\bseal\s*(?:no|number)?\.?\s*[:.]?\s*\|?\s*([A-Z0-9-]*\d[A-Z0-9-]{3,14})/i);
    if (!o.port) { var pd = lab(/\bport\s*of\s*(?:discharge|destination)\s*[:.]?\s*\|?\s*([A-Z][A-Za-z .,'-]{2,40})/i); if (pd) o.port = pd.replace(/,.*$/, '').trim().replace(/\b\w+/g, function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).replace(/^Jebel Ali$/, 'Jebel Ali Port'); }
    // invoice amount: a labelled total, or the largest amount on the TOTAL line
    var am = lab(/\b(?:total\s*(?:invoice\s*)?(?:amount|value)|invoice\s*(?:amount|value)|grand\s*total|contract\s*value|contact\s*value)\s*(?:\(?[A-Z$]{0,4}\)?)?\s*[:.]?\s*\|?\s*(?:US\s*\$|USD|\$|EGP)?\s*([\d,]+(?:\.\d+)?)/i);
    if (!am) all.forEach(function (row) { if (!/^(grand\s*)?total\b/i.test(row[0] || '')) return; row.forEach(function (c) { var n = /^[\d,]+\.\d{2}$/.test(c.trim()) ? Number(c.replace(/,/g, '')) : 0; if (n > (Number(am) || 0)) am = String(n); }); });
    o.amount = am ? String(am).replace(/,/g, '') : '';
    o.origin = tc(o.origin); o.port = tc(o.port); o.vessel = String(o.vessel || '').toUpperCase();
    o.warn = po.warn.filter(function (w) { return !/PO \/ PI number not found|supplier not found|no items found/.test(w); });
    o.ocr = (doc.pageOcr || []).every(Boolean);
    return o; }
  window.BSTINV = { read: function (doc, name, sc) { return shipDoc(doc, name, sc); } };
  function mergeDocs(list) { var o = { conts: [], items: [] };
    list.forEach(function (d) { Object.keys(d).forEach(function (k) { if (k === 'conts') d.conts.forEach(function (c) { if (o.conts.indexOf(c) < 0) o.conts.push(c); }); else if (k === 'items') { if (d.items.length > o.items.length) o.items = d.items; } else if (!o[k] && d[k]) o[k] = d[k]; }); });
    return o; }
  function invBar(sc) { return '<div class="xinv" data-sc="' + sc + '"><button type="button" class="p" data-xinv="' + sc + '">📄 Fill from invoice / B/L (PDF or photo)</button><span class="mu">Reads the commercial invoice, packing list or bill of lading and fills the empty fields. You can pick several files.</span><input type="file" class="xinv-f" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" style="display:none"><div class="xinv-st"></div></div>'; }
  function fillForm(sc, o, names) {
    var n = 0, kept = [], mark = function (el) { el.classList.add('xfill'); el.addEventListener('input', function () { el.classList.remove('xfill'); }, { once: true }); n++; };
    var set = function (el, v, label) { if (!el || v == null || v === '') return; v = String(v); var cur = String(el.value || '').trim();
      if (!cur) { if (el.tagName === 'SELECT' && ![].some.call(el.options, function (op) { return op.value === v || op.text === v; })) el.insertAdjacentHTML('beforeend', '<option>' + esc(v) + '</option>'); el.value = v; mark(el); }
      else if (cur.toLowerCase() !== v.toLowerCase()) kept.push(label + ': form has "' + cur + '", document says "' + v + '"'); };
    var itemsOk = o.items.length, Q = function (s) { return document.querySelector(s); };
    if (sc === 'eg') { var E2 = function (k) { return Q('#eform [data-e="' + k + '"]'); };
      set(E2('inv'), o.inv, 'Invoice no.'); set(E2('supplier'), o.supplier, 'Supplier'); set(E2('origin'), o.origin, 'Origin'); set(E2('brand'), o.brand, 'Brand'); set(E2('batch'), o.batch, 'Batch'); set(E2('invAmt'), o.amount, 'Invoice amount');
      set(E2('container'), o.conts[0], 'Container no.'); if (o.conts.length > 1) kept.push('More containers in the document: ' + o.conts.slice(1).join(', ') + ' (one container per Egypt entry)');
      if (itemsOk) { var rows = [].slice.call(document.querySelectorAll('#eits .er')), filled = rows.filter(function (x) { return x.querySelector('.in').value.trim(); });
        if (!filled.length || confirm('Replace the ' + filled.length + ' item line(s) in the form with the ' + itemsOk + ' item(s) read from the document?')) {
          rows.forEach(function (x) { x.remove(); });
          o.items.forEach(function (i) { var c = i.ctn || (/^(CTN|CARTON|CASE|BOX)$/i.test(i.unit || '') || !i.unit ? i.qty : ''); egAddItem({ n: i.desc, p: i.pack, c: c, l: i.pallets }); });
          document.querySelectorAll('#eits .er input').forEach(function (x) { if (x.value) mark(x); }); window.EITEMS = true; try { EITEMS = true; } catch (e) {} egTotals(); } }
      if (window.DIRTY) DIRTY.ov3 = true;
    } else { var F = function (k) { return Q('#f [data-k="' + k + '"]'); };
      set(F('supplier'), o.supplier, 'Supplier'); set(F('shipper'), o.shipper, 'Shipper'); set(F('country'), o.origin, 'Origin country'); set(F('etd'), o.etd, 'ETD');
      set(F('vessel'), o.vessel, 'Vessel'); set(F('voyage'), o.voyage, 'Voyage'); set(F('bl'), o.bl, 'B/L no.'); var pl = [].map.call(document.querySelectorAll('#dl-port option'), function (x) { return x.value; }), pk = String(o.port || '').toLowerCase(); if (pk) o.port = pl.filter(function (x) { return x.toLowerCase().indexOf(pk) === 0 || pk.indexOf(x.toLowerCase().replace(/\s*(port|\(.*\))\s*$/g, '')) === 0; })[0] || o.port;
      set(F('port'), o.port, 'Final port');
      if (o.inv && invList().indexOf(o.inv) < 0) { var ei = [].filter.call(document.querySelectorAll('#invs .iv'), function (x) { return !x.value.trim(); })[0]; if (!ei) { addInv(''); ei = [].slice.call(document.querySelectorAll('#invs .iv')).pop(); } ei.value = o.inv; mark(ei); syncInvSel(); }
      o.conts.forEach(function (c) { var have = [].map.call(document.querySelectorAll('#cns .cno'), function (x) { return x.value.trim().toUpperCase(); }); if (have.indexOf(c) >= 0) return;
        var row = [].filter.call(document.querySelectorAll('#cns .cnr'), function (x) { return !x.querySelector('.cno').value.trim(); })[0]; if (!row) { addCont({}); row = [].slice.call(document.querySelectorAll('#cns .cnr')).pop(); }
        row.querySelector('.cno').value = c; mark(row.querySelector('.cno')); if (o.size) set(row.querySelector('.cz'), o.size, 'Container size'); if (o.seal && o.conts.length === 1) set(row.querySelector('.cs'), o.seal, 'Seal no.'); });
      cnCount();
      if (itemsOk) { var rws = [].slice.call(document.querySelectorAll('#its .ir')), fl = rws.filter(function (x) { return x.querySelector('.d').value.trim(); });
        if (!fl.length || confirm('Replace the ' + fl.length + ' item line(s) in the form with the ' + itemsOk + ' item(s) read from the document?')) {
          rws.forEach(function (x) { x.remove(); });
          o.items.forEach(function (i) { var u = (i.unit || '').toUpperCase(), q = i.qty || i.ctn; if (!u && i.ctn) u = 'CTN'; addItem({ desc: i.desc + (i.pack ? ' (' + i.pack + ')' : ''), qty: q, unit: u, inv: o.inv }); var us = [].slice.call(document.querySelectorAll('#its .ir .u')).pop(); if (us && u && us.value !== u) { if (![].some.call(us.options, function (op) { return op.value === u; })) us.insertAdjacentHTML('beforeend', '<option>' + esc(u) + '</option>'); us.value = u; } });
          document.querySelectorAll('#its .ir .d, #its .ir .q').forEach(function (x) { if (x.value) mark(x); }); } }
      if (window.DIRTY) DIRTY.ov = true; }
    var h = n ? '<b>' + n + ' field(s) filled</b> from ' + esc(names.join(', ')) + '. The filled fields are highlighted in yellow: please check them' + (o.ocr ? ' carefully (read from a scan, numbers can be misread)' : '') + ', then Save.'
      : 'Nothing new was filled from ' + esc(names.join(', ')) + ': the fields were already filled or could not be read.';
    if (kept.length) h += '<div class="mu" style="margin-top:4px">Not changed:<br>' + kept.map(esc).join('<br>') + '</div>';
    return h; }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-xinv]'); if (!b) return; var bar = b.closest('.xinv'), f = bar.querySelector('.xinv-f'); f.value = ''; f.click(); });
  document.addEventListener('change', function (e) { var f = e.target; if (!f.classList || !f.classList.contains('xinv-f')) return;
    var bar = f.closest('.xinv'), sc = bar.dataset.sc, st = bar.querySelector('.xinv-st'), btn = bar.querySelector('[data-xinv]'), files = [].slice.call(f.files || []);
    if (!files.length) return; if (!window.BSTPDF) { st.innerHTML = '<span class="bad">The document reader is not loaded. Reload the page.</span>'; return; }
    btn.disabled = true; var got = [], i = 0, say = function (m) { st.textContent = m; };
    var next = function () { if (i >= files.length) return Promise.resolve();
      var fl = files[i++], pre = files.length > 1 ? 'File ' + i + ' of ' + files.length + ': ' : ''; say(pre + 'reading ' + fl.name + '…');
      return BSTPDF.read(fl, function (m) { say(pre + m); }).then(function (d) { got.push(shipDoc(d, fl.name, sc)); }, function (er) { got.push({ conts: [], items: [], warn: [fl.name + ': ' + (er.message || 'could not be read')] }); }).then(next); };
    next().then(function () { var o = mergeDocs(got), w = [].concat.apply([], got.map(function (g) { return g.warn || []; }));
      st.innerHTML = fillForm(sc, o, files.map(function (x) { return x.name; })) + (w.length ? '<div class="mu">' + w.map(esc).join('<br>') + '</div>' : ''); })
      .catch(function (er) { st.innerHTML = '<span class="bad">' + esc(er.message || String(er)) + '</span>'; })
      .then(function () { btn.disabled = false; }); });
  // put the bar on both entry forms
  if (typeof window.openEg === 'function') { var origEg = window.openEg;
    window.openEg = function () { var out = origEg.apply(this, arguments);
      try { var fm = $('eform'), g = fm && fm.querySelector('.g'); if (g && canEdit('eg') && window.BSTPDF && !fm.querySelector('.xinv')) g.insertAdjacentHTML('beforebegin', invBar('eg')); } catch (e) {} return out; }; }
  if (typeof window.openEdit === 'function') { var origEd = window.openEdit;
    window.openEdit = function () { var out = origEd.apply(this, arguments);
      try { var f0 = $('f'), old = f0 && f0.parentNode.querySelector('.xinv'); if (old) old.remove();
        if (f0 && canEdit('rx') && window.BSTPDF) f0.insertAdjacentHTML('beforebegin', invBar('rx')); } catch (e) {} return out; }; }
  setTimeout(refreshBadges, 2500);
})();
