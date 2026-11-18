/* Product master with barcodes.
   Each product (barcode, name, pack size, brand, origin, supplier, unit, CTN per pallet, HS code) is entered once.
   In the Egypt and Global entry forms, typing / scanning a barcode fills the product; the user adds only quantity and batch. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = window.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var can = function (r) { return !!(window.BST && BST.can && (BST.can(r) || BST.can('settings'))); };
  var canEdit = function () { return can('egEdit') || can('gEdit'); }, canDel = function () { return can('egDel') || can('gDel'); };
  var call = function (n) { var a = [].slice.call(arguments, 1); return BST.call.apply(BST, [n].concat(a)); };
  var P = { list: [], map: {}, at: 0, loading: null };
  var norm = function (bc) { return String(bc || '').replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06F0; }).replace(/[^A-Za-z0-9]/g, ''); };
  var SECS = { both: 'Egypt & Global', eg: 'Egypt', rx: 'Global' };

  function load(force) {
    if (!force && P.at && Date.now() - P.at < 120000) return Promise.resolve(P.list);
    if (P.loading) return P.loading;
    P.loading = call('getProducts').then(function (l) { P.list = l || []; P.map = {}; P.list.forEach(function (p) { P.map[norm(p.barcode)] = p; }); P.at = Date.now(); P.loading = null; return P.list; },
      function (e) { P.loading = null; throw e; });
    return P.loading; }
  function find(bc) { return P.map[norm(bc)] || null; }

  // ------------------------------------------------------------------ camera scanning (phone / laptop camera)
  var LIB = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js', libP = null;
  function loadLib() { if (window.Html5Qrcode) return Promise.resolve(); if (libP) return libP;
    libP = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = function () { libP = null; no(new Error('The scanner could not be loaded. Check the internet connection, or type the barcode.')); }; document.head.appendChild(s); });
    return libP; }
  function scan(onCode) {
    var o = $('bcscan'); if (!o) { o = document.createElement('div'); o.id = 'bcscan'; document.body.appendChild(o); }
    o.innerHTML = '<div class="bcs-b"><div class="bcs-h"><b>Scan barcode</b><button type="button" id="bcs-x">Close</button></div><div id="bcs-v"></div><div class="mu" id="bcs-m">Starting the camera… allow camera access if asked. Hold the barcode inside the box.</div>' +
      '<form id="bcs-f" class="bcs-f"><input id="bcs-i" inputmode="numeric" placeholder="or type the barcode"><button class="p" type="submit">Use</button></form></div>';
    o.style.display = 'flex'; var cam = null, done = false;
    var stop = function () { o.style.display = 'none'; if (cam) { cam.stop().catch(function () {}).then(function () { try { cam.clear(); } catch (e) {} }); cam = null; } };
    var got = function (code) { if (done) return; done = true; if (navigator.vibrate) try { navigator.vibrate(80); } catch (e) {} stop(); onCode(norm(code)); };
    $('bcs-x').onclick = stop; o.onclick = function (e) { if (e.target === o) stop(); };
    $('bcs-f').onsubmit = function (e) { e.preventDefault(); var v = $('bcs-i').value.trim(); if (v) got(v); };
    loadLib().then(function () {
      var F = window.Html5QrcodeSupportedFormats, fm = F ? [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE].filter(function (x) { return x != null; }) : undefined;
      cam = new Html5Qrcode('bcs-v', fm ? { formatsToSupport: fm, verbose: false } : undefined);
      return cam.start({ facingMode: 'environment' }, { fps: 12, qrbox: function (w, h) { return { width: Math.min(320, w * 0.9), height: Math.min(160, h * 0.5) }; }, experimentalFeatures: { useBarCodeDetectorIfSupported: true } }, got, function () {})
        .then(function () { $('bcs-m').textContent = 'Point the camera at the barcode.'; }); })
      .catch(function (e) { var m = $('bcs-m'); if (m) m.textContent = (e && e.message ? e.message : String(e)).replace(/^.*NotAllowedError.*$/, 'Camera access was blocked. Allow the camera for this site, or type the barcode below.') + ''; });
    setTimeout(function () { var i = $('bcs-i'); if (i && !('ontouchstart' in window)) i.focus(); }, 300); }

  // ------------------------------------------------------------------ product form
  function form(p, onSaved) {
    p = p || {}; var isNew = !p.id, m = $('bcmod'); if (!m) { m = document.createElement('div'); m.id = 'bcmod'; document.body.appendChild(m); }
    var f = function (k, l, extra) { return '<label>' + l + '<input data-p="' + k + '" value="' + esc(p[k] || '') + '"' + (extra || '') + '></label>'; };
    m.innerHTML = '<div class="bcm-b"><div class="bcs-h"><b>' + (isNew ? 'New product' : 'Edit product') + '</b><button type="button" data-bc="x">✕</button></div>' +
      '<div class="bcm-g"><label>Barcode *<span class="bcw"><input data-p="barcode" inputmode="numeric" value="' + esc(p.barcode || '') + '" placeholder="scan or type"><button type="button" class="bcs" data-bc="scan" title="Scan with the camera">📷</button></span></label>' +
      f('name', 'Product name *', ' placeholder="e.g. Green Peas"') + f('pack', 'Pack size', ' placeholder="e.g. 10 x 400 g"') + f('brand', 'Brand') + f('origin', 'Origin', ' placeholder="e.g. Egypt"') + f('supplier', 'Supplier', ' list="bc-sup"') +
      '<label>Unit<select data-p="unit">' + ['CTN', 'BAG', 'KG', 'MT', 'PCS', 'BOX', 'CASE', 'PALLET'].concat(p.unit && ['CTN', 'BAG', 'KG', 'MT', 'PCS', 'BOX', 'CASE', 'PALLET'].indexOf(p.unit) < 0 ? [p.unit] : []).map(function (u) { return '<option' + (u === (p.unit || 'CTN') ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label>' +
      f('ctnPal', 'CTN per pallet', ' inputmode="numeric"') + f('hs', 'HS code') +
      '<label>Used in<select data-p="sec">' + Object.keys(SECS).map(function (k) { return '<option value="' + k + '"' + (k === (p.sec || 'both') ? ' selected' : '') + '>' + SECS[k] + '</option>'; }).join('') + '</select></label>' +
      '<label class="bcm-w">Remarks<input data-p="remarks" value="' + esc(p.remarks || '') + '"></label></div>' +
      '<datalist id="bc-sup">' + Object.keys(P.list.reduce(function (a, x) { if (x.supplier) a[x.supplier] = 1; return a; }, {})).sort().map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>' +
      '<div class="egm-e" id="bcm-e"></div><div class="bcm-f"><button type="button" data-bc="x">Cancel</button><button type="button" class="p" data-bc="save">Save product</button></div></div>';
    m.style.display = 'flex';
    var close = function () { m.style.display = 'none'; m.innerHTML = ''; };
    m.onclick = function (e) { var b = e.target.closest('[data-bc]'); if (e.target === m) return close(); if (!b) return;
      if (b.dataset.bc === 'x') return close();
      if (b.dataset.bc === 'scan') return scan(function (c) { m.querySelector('[data-p="barcode"]').value = c; });
      if (b.dataset.bc === 'save') { var o = {}; m.querySelectorAll('[data-p]').forEach(function (i) { o[i.dataset.p] = i.value.trim(); }); o.barcode = norm(o.barcode);
        b.disabled = true; b.textContent = 'Saving…'; $('bcm-e').textContent = '';
        call('saveProduct', o, p.barcode || '').then(function () { return load(true); }).then(function () { close(); if (onSaved) onSaved(find(o.barcode)); if ($('ovprod') && $('ovprod').style.display === 'block') draw(); },
          function (e) { b.disabled = false; b.textContent = 'Save product'; $('bcm-e').textContent = e.message || e; }); } };
    setTimeout(function () { var i = m.querySelector(p.barcode ? '[data-p="name"]' : '[data-p="barcode"]'); if (i) i.focus(); }, 50); }

  // ------------------------------------------------------------------ product list screen
  function open() {
    var o = $('ovprod'); if (!o) { o = document.createElement('div'); o.id = 'ovprod'; document.body.appendChild(o); }
    o.innerHTML = '<div class="pr-in"><div class="pr-h"><div><h2>🏷 Products & barcodes</h2><span class="mu">Enter each product once with its barcode. In the Egypt and Global entries, type or scan the barcode and the product fills in.</span></div><button type="button" id="pr-x">Close</button></div>' +
      '<div class="pr-t"><input id="pr-q" placeholder="Search barcode, product, brand, supplier…"><button type="button" id="pr-scan" title="Find a product by scanning">📷 Scan</button>' + (canEdit() ? '<button type="button" class="p" id="pr-add">+ Add product</button>' : '') +
      '<span class="pr-sp"></span><button type="button" id="pr-ex">⬇ Excel export</button>' + (canEdit() ? '<button type="button" id="pr-tp">⬇ Empty template</button><button type="button" id="pr-im">⬆ Excel import</button><input type="file" id="pr-f" accept=".xlsx,.xls,.csv" style="display:none">' : '') + '</div>' +
      '<div id="pr-msg"></div><div id="pr-list"><div class="mu">Loading…</div></div></div>';
    o.style.display = 'block'; document.body.classList.add('tk-on');
    $('pr-x').onclick = function () { o.style.display = 'none'; document.body.classList.remove('tk-on'); };
    $('pr-q').oninput = draw;
    $('pr-scan').onclick = function () { scan(function (c) { $('pr-q').value = c; draw(); if (!find(c) && canEdit() && confirm('Barcode ' + c + ' is not in the list. Add it now?')) form({ barcode: c }); }); };
    if ($('pr-add')) $('pr-add').onclick = function () { form(); };
    $('pr-ex').onclick = function () { xl().then(function (X) { var ws = X.utils.json_to_sheet(P.list.map(row)), wb = X.utils.book_new(); ws['!cols'] = COLS.map(function (c) { return { wch: c[2] }; }); X.utils.book_append_sheet(wb, ws, 'Products'); X.writeFile(wb, 'BST products and barcodes ' + new Date().toISOString().slice(0, 10) + '.xlsx'); }, msgErr); };
    if ($('pr-tp')) $('pr-tp').onclick = function () { xl().then(function (X) { var ex = {}; COLS.forEach(function (c) { ex[c[0]] = c[3] || ''; }); var ws = X.utils.json_to_sheet([ex]), wb = X.utils.book_new(); ws['!cols'] = COLS.map(function (c) { return { wch: c[2] }; });
      X.utils.book_append_sheet(wb, ws, 'Products'); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['How to fill'], ['One row per product. Barcode and Product name are required; the other columns are optional.'], ['Keep the barcode column as text so leading zeros stay (type it with a leading apostrophe if needed).'], ['Used in: Egypt, Global or Egypt & Global.'], ['Delete the example row before importing.']]), 'How to fill'); X.writeFile(wb, 'BST products template.xlsx'); }, msgErr); };
    if ($('pr-im')) { $('pr-im').onclick = function () { $('pr-f').value = ''; $('pr-f').click(); };
      $('pr-f').onchange = function () { var file = this.files[0]; if (!file) return; msg('Reading ' + file.name + '…');
        Promise.all([xl(), file.arrayBuffer()]).then(function (x) { var X = x[0], wb = X.read(x[1], { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]], rows = X.utils.sheet_to_json(ws, { defval: '', raw: false });
          var hk = function (h) { return String(h).toLowerCase().replace(/[^a-z]/g, ''); }, ALT = { barcode: ['barcode', 'ean', 'code', 'upc'], name: ['productname', 'product', 'name', 'item', 'description', 'itemname'], pack: ['packsize', 'pack', 'packing'], ctnPal: ['ctnperpallet', 'cartonsperpallet'], hs: ['hscode', 'hs'], sec: ['usedin', 'section'] };
          var l = rows.map(function (r) { var o = {}, keys = Object.keys(r); COLS.forEach(function (c) { var want = [hk(c[0])].concat(ALT[c[1]] || []), k = null; want.some(function (w) { k = keys.filter(function (h) { return hk(h) === w; })[0]; return !!k; }); o[c[1]] = k ? String(r[k]).trim() : ''; });
            o.sec = /egypt.*global|both/i.test(o.sec) ? 'both' : /global/i.test(o.sec) ? 'rx' : /egypt/i.test(o.sec) ? 'eg' : 'both'; o.barcode = norm(o.barcode); return o; }).filter(function (o) { return o.barcode || o.name; });
          var bad = l.filter(function (o) { return !o.barcode || !o.name; }); if (!l.length) throw new Error('No products found in the file.');
          if (!confirm('Import ' + (l.length - bad.length) + ' product(s)' + (bad.length ? ' (' + bad.length + ' row(s) without barcode or name are skipped)' : '') + '? Products with the same barcode are updated.')) return msg('');
          return call('importProducts', l.filter(function (o) { return o.barcode && o.name; })).then(function (n) { return load(true).then(function () { msg('✓ ' + n + ' product(s) imported.'); draw(); }); }); }).catch(msgErr); }; }
    o.querySelector('#pr-list').onclick = function (e) { var b = e.target.closest('[data-pe],[data-pd]'); if (!b) return; var p = P.list[Number(b.dataset.pe != null ? b.dataset.pe : b.dataset.pd)];
      if (b.dataset.pe != null) return form(p); if (confirm('Delete ' + p.name + ' (' + p.barcode + ') from the product list? Entries that already use it keep their product details.')) call('deleteProduct', p.barcode).then(function () { return load(true); }).then(draw, msgErr); };
    load(true).then(draw, function (e) { $('pr-list').innerHTML = '<div class="tk-none">' + esc(e.message || e) + '</div>'; }); }
  var COLS = [['Barcode', 'barcode', 16, '6221234567890'], ['Product name', 'name', 30, 'Green Peas'], ['Pack size', 'pack', 14, '10 x 400 g'], ['Brand', 'brand', 14, 'Wega'], ['Origin', 'origin', 12, 'Egypt'], ['Supplier', 'supplier', 24, 'Wega Foods'],
    ['Unit', 'unit', 8, 'CTN'], ['CTN per pallet', 'ctnPal', 12, '80'], ['HS code', 'hs', 12, '0710.21'], ['Used in', 'sec', 14, 'Egypt & Global'], ['Remarks', 'remarks', 24, '']];
  function row(p) { var o = {}; COLS.forEach(function (c) { o[c[0]] = c[1] === 'sec' ? SECS[p.sec || 'both'] : p[c[1]] || ''; }); return o; }
  function xl() { if (window.XLSX) return Promise.resolve(window.XLSX); return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = function () { ok(window.XLSX); }; s.onerror = function () { no(new Error('The Excel tool could not be loaded.')); }; document.head.appendChild(s); }); }
  function msg(t) { var e = $('pr-msg'); if (e) e.innerHTML = t ? '<div class="pr-m">' + esc(t) + '</div>' : ''; }
  function msgErr(e) { msg('✖ ' + (e && e.message || e)); }
  function draw() {
    var q = String(($('pr-q') || {}).value || '').toLowerCase().trim(), l = P.list.map(function (p, i) { return [p, i]; }).filter(function (x) { var p = x[0]; return !q || [p.barcode, p.name, p.pack, p.brand, p.supplier, p.origin, p.hs].join(' ').toLowerCase().indexOf(q) >= 0; });
    $('pr-list').innerHTML = (P.list.length ? '<div class="mu" style="margin:6px 0">' + l.length + ' of ' + P.list.length + ' product(s)</div>' : '') +
      (l.length ? '<div class="tw"><table class="egtb pr-tb"><thead><tr><th>Barcode</th><th>Product</th><th>Pack size</th><th>Brand</th><th>Origin</th><th>Supplier</th><th>Unit</th><th class="n">CTN / pallet</th><th>Used in</th><th></th></tr></thead><tbody>' +
        l.map(function (x) { var p = x[0], i = x[1]; return '<tr><td class="pr-bc">' + esc(p.barcode) + '</td><td><b>' + esc(p.name) + '</b>' + (p.hs ? '<div class="mu">HS ' + esc(p.hs) + '</div>' : '') + '</td><td>' + esc(p.pack) + '</td><td>' + esc(p.brand) + '</td><td>' + esc(p.origin) + '</td><td>' + esc(p.supplier) + '</td><td>' + esc(p.unit) + '</td><td class="n">' + esc(p.ctnPal) + '</td><td>' + esc(SECS[p.sec || 'both']) + '</td><td class="pr-a">' +
          (canEdit() ? '<button type="button" class="sm" data-pe="' + i + '">Edit</button>' : '') + (canDel() ? '<button type="button" class="sm" data-pd="' + i + '">Delete</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="tk-none">' + (P.list.length ? 'No product matches "' + esc(q) + '".' : 'No products yet. Use <b>+ Add product</b>, or download the <b>Empty template</b>, fill it in Excel and <b>Excel import</b> it.') + '</div>'); }

  // ------------------------------------------------------------------ barcode box in the entry forms
  var BCBOX = '<label class="bcl">Barcode<span class="bcw"><input class="ibc" inputmode="numeric" autocomplete="off" placeholder="scan / type"><button type="button" class="bcs" title="Scan with the camera">📷</button></span><small class="bcn"></small></label>';
  function attach(row, sc, apply) {
    var inp = row.querySelector('.ibc'), note = row.querySelector('.bcn');
    var last = null, use = function (code, quiet) { code = norm(code); if (code && code === last) return; last = code; inp.value = code; note.innerHTML = ''; if (!code) return;
      load().then(function () { var p = find(code);
        if (p) { apply(p); note.innerHTML = '<span class="ok">✓ ' + esc(p.name) + '</span>'; inp.classList.remove('bad'); return; }
        inp.classList.add('bad'); note.innerHTML = 'Not in the product list' + (canEdit() ? ' · <a href="#" class="bc-add">add it</a>' : '');
        var a = note.querySelector('.bc-add'); if (a) a.onclick = function (e) { e.preventDefault(); form({ barcode: code, sec: sc }, function (np) { if (np) { apply(np); note.innerHTML = '<span class="ok">✓ ' + esc(np.name) + ' added</span>'; inp.classList.remove('bad'); } }); }; },
        function (e) { if (!quiet) note.textContent = e.message || String(e); }); };
    inp.addEventListener('change', function () { use(inp.value); }); inp.addEventListener('input', function () { if (norm(inp.value) !== last) { note.innerHTML = ''; inp.classList.remove('bad'); } });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); use(inp.value); } });
    row.querySelector('.bcs').onclick = function () { scan(function (c) { use(c); }); };
    return use; }
  function fillMark(el, v) { if (!el || v == null || v === '') return; el.value = v; el.classList.add('xfill'); el.addEventListener('input', function () { el.classList.remove('xfill'); }, { once: true }); }
  // Egypt item rows: barcode -> item name and pack size; then CTN and batch are typed
  if (typeof window.egAddItem === 'function') { var oEg = window.egAddItem;
    window.egAddItem = function (it) { var x = oEg.apply(this, arguments), row = $('eits').lastElementChild; if (!row || row.querySelector('.ibc')) return x;
      row.insertAdjacentHTML('afterbegin', BCBOX); row.classList.add('er-bc'); if (it && it.bc) row.querySelector('.ibc').value = it.bc;
      attach(row, 'eg', function (p) { fillMark(row.querySelector('.in'), p.name); fillMark(row.querySelector('.ip'), p.pack);
        var F = function (k) { return document.querySelector('#eform [data-e="' + k + '"]'); };
        ['brand', 'origin', 'supplier'].forEach(function (k) { var e = F(k); if (e && !e.value && p[k]) fillMark(e, p[k]); });
        if (window.DIRTY) DIRTY.ov3 = true; window.EITEMS = true; var c = row.querySelector('.ic'); if (c) c.focus(); });
      return x; }; }
  // Global item rows: barcode -> description (with pack) and unit; then quantity and batch are typed
  if (typeof window.addItem === 'function') { var oRx = window.addItem;
    window.addItem = function (it) { var x = oRx.apply(this, arguments), row = $('its') && $('its').lastElementChild; if (!row || row.querySelector('.ibc')) return x;
      row.insertAdjacentHTML('afterbegin', BCBOX); row.classList.add('ir-bc');
      var q = row.querySelector('.q'); if (q && q.closest('label')) q.closest('label').insertAdjacentHTML('afterend', '<label>Batch no.<input class="ibt" placeholder="e.g. 2611A"></label>');
      if (q) { q.type = 'text'; q.setAttribute('inputmode', 'decimal'); q.dataset.num = '1'; }
      if (it) { row.querySelector('.ibc').value = it.barcode || ''; row.querySelector('.ibt').value = it.batch || ''; }
      attach(row, 'rx', function (p) { fillMark(row.querySelector('.d'), p.name + (p.pack ? ' (' + p.pack + ')' : ''));
        var u = row.querySelector('.u'); if (u && p.unit) { if (![].some.call(u.options, function (o) { return o.value === p.unit; })) u.insertAdjacentHTML('beforeend', '<option>' + esc(p.unit) + '</option>'); u.value = p.unit; }
        var F = function (k) { return document.querySelector('#f [data-k="' + k + '"]'); }; ['supplier', 'brand'].forEach(function (k) { var e = F(k); if (e && !e.value && p[k]) fillMark(e, p[k]); });
        if (window.DIRTY) DIRTY.ov = true; if (q) q.focus(); });
      return x; }; }

  var css = document.createElement('style');
  css.textContent = [
    '#eform .er.er-bc{grid-template-columns:1.35fr 1.8fr 1.1fr 1fr .75fr .75fr auto}#its .ir.ir-bc{grid-template-columns:1.3fr 2.2fr .8fr .9fr .9fr 1fr 1fr auto}',
    '.bcw{display:flex;gap:4px}.bcw input{flex:1;min-width:0;font-family:ui-monospace,Menlo,Consolas,monospace}.bcs{padding:4px 8px!important;flex:none}.bcl small{display:block;font-size:11px;font-weight:400;min-height:0}.bcl small .ok{color:var(--acd)}.bcl small a{color:var(--acd)}.ibc.bad{border-color:#f0c43c}',
    '#bcscan,#bcmod{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:110;display:none;align-items:center;justify-content:center;padding:14px}.bcs-b,.bcm-b{background:#fff;border-radius:14px;width:min(520px,100%);max-height:94vh;overflow:auto;padding:16px}.bcm-b{width:min(640px,100%)}',
    '.bcs-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:16px}#bcs-v{width:100%;min-height:220px;background:#0b1320;border-radius:10px;overflow:hidden}#bcs-v video{width:100%!important;height:auto}.bcs-f{display:flex;gap:6px;margin-top:10px}.bcs-f input{flex:1}',
    '.bcm-g{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}.bcm-g label{font-size:13px;font-weight:600}.bcm-g input,.bcm-g select{width:100%;margin-top:4px}.bcm-w{grid-column:1/-1}.bcm-f{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}',
    '#ovprod{position:fixed;inset:0;z-index:96;background:var(--bg);overflow:auto;display:none}.pr-in{max-width:1200px;margin:0 auto;padding:18px 16px 40px}.pr-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.pr-h h2{margin:0 0 4px}',
    '.pr-t{display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#fff;border:1px solid var(--bd);border-radius:12px;padding:10px}.pr-t input{flex:1;min-width:220px}.pr-sp{flex:1}.pr-m{margin:10px 0;padding:8px 12px;border-radius:8px;background:#eef6f1}.pr-tb .pr-bc{font-family:ui-monospace,Menlo,Consolas,monospace;white-space:nowrap}.pr-a{white-space:nowrap}.pr-a button{margin-left:4px}',
    '#ovprod .tw{background:#fff;border:1px solid var(--bd);border-radius:12px;padding:4px 8px}',
    '@media(max-width:760px){#eform .er.er-bc,#its .ir.ir-bc{grid-template-columns:1fr 1fr}#eform .er.er-bc .bcl,#its .ir.ir-bc .bcl{grid-column:1/-1}.bcm-g{grid-template-columns:1fr}.pr-sp{display:none}}'
  ].join('\n');
  document.head.appendChild(css);
  document.addEventListener('click', function (e) { if (e.target.closest('[data-xprod]')) open(); });
  window.BSTPROD = { open: open, find: function (bc) { return load().then(function () { return find(bc); }); }, scan: scan, load: load };
})();
