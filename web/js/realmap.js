/* BST Shipment Tracker: real map view for the product tracker.
   Satellite or street map (Leaflet), with the route following real sea lanes (Suez, Bab el-Mandeb, Hormuz,
   Malacca, Cape of Good Hope ...) and the Egypt trucks following the actual road / ferry route to Abu Dhabi. */
(function () {
  'use strict';
  var LV = '1.9.4', CDN = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/' + LV + '/';
  var loading = null, map = null, layers = null, lastKey = '', raf = 0;

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = CDN + 'leaflet.min.css'; document.head.appendChild(c);
      var s = document.createElement('script'); s.src = CDN + 'leaflet.min.js'; s.onload = function () { res(window.L); };
      s.onerror = function () { loading = null; rej(new Error('The map could not be loaded. Check the internet connection.')); }; document.head.appendChild(s);
    });
    return loading;
  }

  // ------------------------------------------------------------ sea lanes
  var GO = [24.9, 58.3];                                                    // Gulf of Oman (outside Hormuz)
  var GULF_OUT = [[25.7, 55.2], [26.45, 55.8], [26.5, 56.55], [25.9, 57.0]]; // from inside the Gulf out through Hormuz
  var ARAB = [[18.5, 58.5], [22.7, 60.5], GO];                              // Arabian Sea up to the Gulf of Oman
  var ADEN = [[12.6, 43.35], [12.3, 46.5], [13.4, 50.5], [14.5, 54]].concat(ARAB);
  var RED = [[27.6, 33.9], [25, 35.9], [20, 38.8], [15, 41.6]].concat(ADEN);
  var SUEZ = [[31.35, 32.35], [30.6, 32.32], [29.9, 32.55], [28.5, 33.05]].concat(RED);
  var MED_E = [[34.6, 26.4]].concat(SUEZ);                                   // south-east of Crete to Port Said
  var GIB = [[35.95, -5.6], [37.3, 11.3], [35.2, 22]].concat(SUEZ);
  var ATL_N = [[43.5, -9.6], [37, -9.5]].concat(GIB);                        // Cape Finisterre, Cape St Vincent
  var INDIA_W = [[21, 63]].concat(ARAB.slice(1));
  var SRI = [[5.3, 80.6], [7.5, 76.5], [14, 70]].concat(INDIA_W);
  var MALACCA = [[1.4, 104.6], [1.2, 103.6], [2.6, 101.2], [6.3, 97.5], [6.2, 94.5]].concat(SRI);
  var SCS = [[10, 110]].concat(MALACCA);                                      // South China Sea
  var EAFR = [[-3, 44], [2, 48], [11, 54.5]].concat(ARAB);
  var CAPE = [[-36.5, 20], [-28, 34], [-20, 40], [-11, 42]].concat(EAFR);
  var CARIB = [[18, -67.8], [36, -12], [36, -8]].concat(GIB);

  function inGulf(p) { return p[0] > 23.5 && p[0] < 30.8 && p[1] > 47.4 && p[1] < 56.45 && !(p[1] > 56 && p[0] < 25.6); }
  function nearHub(p) { return p[0] > 22 && p[0] < 26.6 && p[1] >= 56 && p[1] < 61; }
  // waypoints from a point to the Gulf of Oman
  function chain(p) {
    var la = p[0], lo = p[1];
    if (inGulf(p)) return GULF_OUT.concat([GO]);
    if (nearHub(p)) return [];
    if (la > 8 && lo >= 60 && lo < 77.3) return INDIA_W;                                   // Pakistan, India west, Iran east
    if (la > 5 && la < 9 && lo >= 77.3 && lo < 82) return [[8, 76]].concat(SRI.slice(2));   // Sri Lanka
    if (la > 5 && lo >= 77.3 && lo < 98.5) return [[17, 88]].concat(SRI);                  // India east, Bangladesh, Myanmar
    if (la < -10 && lo > 110) return (lo > 160 ? [[-40, 165]] : []).concat([[-39.5, 147], [-35.5, 115], [-10, 95], [8, 68]]).concat(INDIA_W);   // Australia, NZ
    if (la < 0 && lo > 95) return [[-5.9, 105.8], [-6.5, 104.5], [-3, 99], [2, 94], [5.3, 80.6]].concat(SRI.slice(1));   // Indonesia
    if (la >= 0 && la < 7.5 && lo >= 98.5 && lo < 105) return [[3.5, 100.5]].concat(MALACCA.slice(3));                   // Malaysia, Singapore
    if (lo >= 98.5 && la >= 7.5 && lo < 105.5) return [[8.5, 102.5]].concat(MALACCA);    // Thailand
    if (lo >= 105.5 && la < 12.5 && lo < 112) return [[8.5, 107.5]].concat(MALACCA);      // Vietnam south
    if (lo >= 128 && la > 30) return [[33, 135.5], [30, 129.5], [25, 122.5], [21.5, 117]].concat(SCS);   // Japan, Korea
    if (lo >= 105.5 && la > 23) return [[24.5, 119.5], [21.5, 115]].concat(SCS);          // China
    if (lo >= 105.5) return [[21.5, 117]].concat(SCS);                                     // Hong Kong, Taiwan, Philippines
    if (la < 12.6 && la > -12 && lo > 38 && lo < 52) {                                     // Djibouti, Yemen south, Horn & East Africa
      if (la > 10.5) return ADEN.slice(la > 11.8 && lo > 44.5 ? 2 : 1);
      return la > 5 ? ADEN : (la > 0 ? EAFR.slice(1) : EAFR); }
    if (lo < -70 && la < 9 && la > -60) return (la < -5 ? [[-20, -73], [-5, -82]] : [[-3, -81]]).concat([[8.9, -79.5], [9.4, -79.9], [13, -77], [16.5, -72]]).concat(CARIB);   // Pacific south America
    if (la <= -12 || (la < 8 && lo < 15 && lo > -25)) {                                    // southern & western Africa, Brazil, Argentina
      var pre = lo < -25 ? [[-36, -40], [-38, 0]] : la > -20 && lo < 15 ? [[0, 3], [-20, 8]] : la < -30 && lo < 22 ? [[-35, 18.3]] : [];
      return pre.concat(lo > 30 ? CAPE.slice(1) : CAPE); }
    if (la > 12.5 && la < 30 && lo >= 32.3 && lo < 43.6) {                                // Red Sea (Jordan, Sudan, Saudi west, Egypt Red Sea)
      if (la > 28 && lo > 34.3) return [[27.9, 34.45]].concat(RED.slice(1));
      return RED.filter(function (w) { return w[0] < la - 0.5; }); }
    if (la > 28.5 && la < 31.3 && lo > 29 && lo < 32.4) return SUEZ.slice(2);             // Cairo, Suez
    if (lo > 32 && lo < 37 && la > 31 && la < 37.5) return SUEZ;                           // Cyprus, Lebanon, Syria, Port Said
    if (la > 40.8 && lo > 27.5 && lo < 42) return (la > 41.3 ? [[42.5, 30], [41.25, 29.1]] : []).concat([[40.6, 28.2], [40.05, 26.2], [39, 25.5], [36.5, 26.6], [35.5, 27.7]]).concat(SUEZ);   // Black Sea, Istanbul
    if (lo > 21 && lo < 27.5 && la > 34 && la < 41) return [[37.3, 24.3]].concat(MED_E);  // Greece
    if (la > 30 && la < 46 && lo > -6 && lo < 21) {                                       // western & central Med
      var w = lo < 8 ? [[38, 5]] : la > 40 ? [[43, 9.8], [40.5, 11.5], [38.3, 11.6]] : [];
      return w.concat(GIB.slice(1)); }
    if (la > 30 && la < 37 && lo > -13 && lo <= -6) return [[35.8, -6.5]].concat(GIB);    // Morocco
    if (la > 36 && la < 43.6 && lo > -13 && lo <= -6) return ATL_N.slice(1);               // Portugal
    if (la >= 43.6 && lo > -15 && lo < 45) {                                               // northern Europe
      var n = [];
      if (lo > 20 && la > 58) n = [[59.9, 27], [58.5, 20], [55.5, 15]];
      if (lo > 13 && la > 53.5 && !n.length) n = [[55.5, 15]];
      if (lo > 9 && la > 53.3) n = n.concat([[55.5, 12.9], [57.8, 10.7], [57, 8], [54, 5]]);
      if (lo < -5 && la > 51) n = n.concat([[51.8, -5.8], [49, -6.5]]); else n = n.concat([[52, 3], [51, 1.5], [49.8, -3], [48.3, -5.8]]);
      return n.concat(ATL_N); }
    if (lo < -100 && la > 20) return [[48.4, -124.8], [40, -126], [20, -108], [8.9, -79.5], [9.4, -79.9], [13, -77], [16.5, -72]].concat(CARIB);   // Pacific north America
    if (lo < -80 && la > 17) return [[22.5, -93], [24.3, -86], [24.2, -81.5], [25.5, -79.7], [27.5, -79.6], [36, -12], [36, -8]].concat(GIB);    // Gulf of Mexico
    if (lo < -30 && la >= 8) return [[13, -74], [18, -67.8]].concat(CARIB.slice(1));       // Caribbean, North Atlantic
    return [GO];
  }
  function seaPath(a, b) {
    if (inGulf(a) && inGulf(b)) return [a, b];
    var hub = nearHub(a) || nearHub(b), out = [a];
    chain(a).concat(chain(b).slice().reverse()).concat([b]).forEach(function (p) {
      if (hub && p === GO) return; var q = out[out.length - 1]; if (Math.abs(q[0] - p[0]) > 1e-6 || Math.abs(q[1] - p[1]) > 1e-6) out.push(p); });
    return out;
  }
  function airPath(a, b) { var R = Math.PI / 180, out = [], la1 = a[0] * R, lo1 = a[1] * R, la2 = b[0] * R, lo2 = b[1] * R;
    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((la2 - la1) / 2), 2) + Math.cos(la1) * Math.cos(la2) * Math.pow(Math.sin((lo2 - lo1) / 2), 2)));
    if (d < 1e-6) return [a, b];
    for (var i = 0; i <= 32; i++) { var f = i / 32, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      var x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2), y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2), z = A * Math.sin(la1) + B * Math.sin(la2);
      out.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / R, Math.atan2(y, x) / R]); }
    return out; }

  // Egypt trucks: Cairo -> Red Sea coast road -> Safaga ferry -> Duba -> across Saudi Arabia -> Batha / Ghuwaifat -> E11 -> Abu Dhabi
  var EG_ROAD = [
    [[29.97, 32.5], [29.6, 32.35], [29.1, 32.65], [28.36, 33.08], [27.25, 33.8], [26.73, 33.94]],
    [[28.38, 36.57], [27.63, 38.55], [27.52, 41.69], [26.33, 43.97]],
    [[24.15, 47.3], [24.15, 49.07], [24.07, 50.6], [24.0, 51.4]],
    [[24.03, 51.77], [24.08, 52.7], [24.1, 53.45], [24.25, 54.1]]
  ];

  // ------------------------------------------------------------ geometry helpers
  function dist(a, b) { var R = Math.PI / 180, dl = (b[0] - a[0]) * R, dn = (b[1] - a[1]) * R * Math.cos((a[0] + b[0]) / 2 * R); return Math.sqrt(dl * dl + dn * dn); }
  function plen(p) { var s = 0; for (var i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]); return s; }
  function at(p, f) { var L = plen(p) * Math.max(0, Math.min(1, f)), s = 0; for (var i = 1; i < p.length; i++) { var d = dist(p[i - 1], p[i]); if (s + d >= L && d > 0) { var k = (L - s) / d; return { pt: [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k], i: i }; } s += d; } return { pt: p[p.length - 1], i: p.length - 1 }; }
  function splitAt(p, f) { var r = at(p, f); return [p.slice(0, r.i).concat([r.pt]), [r.pt].concat(p.slice(r.i))]; }
  function nearestOn(p, q) { var best = { d: 1e9, i: 1, pt: p[0] }; for (var i = 1; i < p.length; i++) { var a = p[i - 1], b = p[i], dx = b[1] - a[1], dy = b[0] - a[0], L = dx * dx + dy * dy, t = L ? ((q[1] - a[1]) * dx + (q[0] - a[0]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    var c = [a[0] + dy * t, a[1] + dx * t], d = dist(c, q); if (d < best.d) best = { d: d, i: i, pt: c }; } return best; }

  // one polyline per step of the route (N[i] -> N[i+1])
  function segments(sc) {
    var N = sc.N.map(function (n) { return { n: n, p: [n.lat, n.lon] }; }), M = sc.modes, segs = [], i = 0, eg = window.TR && TR.sc === 'eg';
    while (i < N.length - 1) {
      var md = M[i] || 'road';
      if (md === 'road') { segs.push([N[i].p].concat(eg && EG_ROAD[i] ? EG_ROAD[i] : []).concat([N[i + 1].p])); i++; continue; }
      // sea / air leg: run to the next real place; markers in between (e.g. "At sea", a live vessel) sit on the lane
      var j = i + 1, mids = [];
      while (j < N.length - 1 && (M[j] === md) && (N[j].n.minor || /live/.test(N[j].n.n))) { mids.push(j); j++; }
      var full = md === 'air' ? airPath(N[i].p, N[j].p) : seaPath(N[i].p, N[j].p), rest = full, done = 0;
      mids.forEach(function (k, m) {
        if (/live/.test(N[k].n.n)) { var c = nearestOn(rest, N[k].p); segs.push(rest.slice(0, c.i).concat([N[k].p])); rest = [N[k].p].concat(rest.slice(c.i)); }
        else { var f = (m + 1) / (mids.length + 1 - done), sp = splitAt(rest, f); N[k].p = sp[0][sp[0].length - 1]; sc.N[k] = Object.assign({}, sc.N[k], { lat: N[k].p[0], lon: N[k].p[1] }); segs.push(sp[0]); rest = sp[1]; }
        done++; });
      segs.push(rest); i = j;
    }
    return segs;
  }
  function posAt(segs, t) { var k = Math.max(0, Math.min(segs.length, t)), s = Math.min(segs.length - 1, Math.floor(k)), f = k - s; if (k >= segs.length) { s = segs.length - 1; f = 1; } return at(segs[s], f).pt; }
  function partPath(segs, t) { var out = [], k = Math.max(0, Math.min(segs.length, t)); for (var s = 0; s < segs.length; s++) { if (s + 1 <= k) out = out.concat(segs[s]); else { if (k > s) out = out.concat(splitAt(segs[s], k - s)[0]); break; } } return out; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var COL = { dl: '#16a34a', od: '#dc2626', bd: '#f59e0b', go: '#2563eb', pre: '#64748b' };

  function ensureMap(L, el) {
    if (map && map.getContainer() === el) return map;
    if (map) { map.remove(); map = null; }
    map = L.map(el, { zoomControl: true, worldCopyJump: true, attributionControl: true, preferCanvas: false });
    var sat = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 })]);
    var street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' });
    var pref = 'sat'; try { pref = localStorage.getItem('bst_map_layer') || 'sat'; } catch (e) {}
    (pref === 'street' ? street : sat).addTo(map);
    L.control.layers({ '🛰 Satellite': sat, '🗺 Street map': street }, null, { position: 'topright' }).addTo(map);
    map.on('baselayerchange', function (e) { try { localStorage.setItem('bst_map_layer', e.layer === street ? 'street' : 'sat'); } catch (x) {} });
    L.control.scale({ imperial: false }).addTo(map);
    return map;
  }

  // hide labels that would sit on top of a more important one (they reappear when you zoom in)
  var LABS = [];
  function declutter() { if (!map) return; var shown = [];
    LABS.slice().sort(function (a, b) { return a.pr - b.pr; }).forEach(function (o) { var t = o.m.getTooltip(), el = t && t.getElement(); if (!el) return;
      var p = map.latLngToContainerPoint(o.m.getLatLng()), hit = shown.some(function (q) { return Math.abs(q.x - p.x) < 150 && Math.abs(q.y - p.y) < 34; });
      el.style.visibility = hit ? 'hidden' : ''; if (!hit) shown.push(p); }); }
  // ------------------------------------------------------------ live ship helpers
  var follow = false, liveTimer = 0, liveCtl = null;
  try { follow = localStorage.getItem('bst_map_follow') === '1'; } catch (e) {}
  var NAV = { 0: 'Under way', 1: 'At anchor', 2: 'Not under command', 3: 'Restricted manoeuvrability', 4: 'Constrained by draught', 5: 'Moored', 6: 'Aground', 7: 'Fishing', 8: 'Under way (sailing)' };
  function when(ts) { var d = new Date(ts); if (isNaN(d)) return ''; var mi = Math.round((Date.now() - d) / 6e4);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' (' + (mi < 1 ? 'just now' : mi < 60 ? mi + ' min ago' : mi < 1440 ? Math.round(mi / 60) + ' h ago' : Math.round(mi / 1440) + ' days ago') + ')'; }
  function shipSvg(c) { var r = isFinite(c) && c !== null ? Number(c) : 0;
    return '<svg viewBox="0 0 24 24" width="24" height="24" style="transform:rotate(' + r + 'deg)"><path d="M12 1.5 L17.5 19 L12 15.5 L6.5 19 Z" fill="#16a34a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'; }
  function estimate(lv) { var age = (Date.now() - new Date(lv.ts)) / 36e5, sp = Number(lv.speed), c = Number(lv.course);
    if (!(age > 0 && age < 2 && sp > 0.5 && isFinite(c) && lv.course !== null)) return { pt: [lv.lat, lv.lon], est: false };
    var d = sp * age / 60, R = Math.PI / 180;           // degrees of latitude travelled
    return { pt: [lv.lat + d * Math.cos(c * R), lv.lon + d * Math.sin(c * R) / Math.max(0.2, Math.cos(lv.lat * R))], est: true }; }
  function liveBox(L, m, lv, rr) {
    if (liveCtl) { liveCtl.remove(); liveCtl = null; }
    var x = rr && rr.x; if (!x || x.sc === 'eg' || !(window.TR && TR.sc === 'rx')) return;
    var Ctl = L.Control.extend({ options: { position: 'bottomleft' }, onAdd: function () { var d = L.DomUtil.create('div', 'rm-live'); L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
      if (!lv) { d.innerHTML = '<b>🚢 ' + esc(x.vessel || 'Vessel') + '</b><div class="mu">' + (window.vk && vk(x) ? 'No live position yet. Positions are checked about every 15 minutes; far out at sea a ship can be out of range for a while.' : 'Add the vessel <b>MMSI</b> (or IMO) number to this shipment to see the ship live here.') + '</div>'; return d; }
      d.innerHTML = '<div class="rm-lh"><b>🚢 ' + esc(lv.name || x.vessel || 'Vessel') + '</b><span class="rm-dot"></span><span class="rm-ago">Live AIS</span></div>' +
        '<div class="rm-kv"><span>Speed</span><b>' + (lv.speed != null ? esc(lv.speed) + ' kn' : '-') + '</b><span>Course</span><b>' + (lv.course != null ? Math.round(lv.course) + '°' : '-') + '</b>' +
        '<span>Status</span><b>' + esc(NAV[lv.navstat] || '-') + '</b><span>Destination</span><b>' + esc(lv.dest || '-') + '</b><span>AIS ETA</span><b>' + esc(lv.eta || '-') + '</b>' +
        '<span>Position</span><b>' + lv.lat.toFixed(4) + ', ' + lv.lon.toFixed(4) + '</b><span>Received</span><b>' + esc(when(lv.ts)) + '</b></div>' +
        '<div class="rm-est" id="rm-est"></div><label class="rm-fl"><input type="checkbox" id="rm-follow"' + (follow ? ' checked' : '') + '> Follow the ship</label>' +
        '<div class="mu" style="font-size:11px">MMSI ' + esc(lv.mmsi) + (lv.imo ? ' · IMO ' + esc(lv.imo) : '') + ' · refreshes by itself</div>';
      setTimeout(function () { var f = document.getElementById('rm-follow'); if (f) f.onchange = function () { follow = this.checked; try { localStorage.setItem('bst_map_follow', follow ? '1' : '0'); } catch (e) {} if (follow) m.setView(estimate(lv).pt, Math.max(m.getZoom(), 8)); }; }, 0);
      return d; } });
    liveCtl = new Ctl(); liveCtl.addTo(m);
  }
  // fresh positions every minute while the map is open
  setInterval(function () { var el = document.getElementById('tr-real'), ov = document.getElementById('ovtr');
    if (!el || el.style.display === 'none' || !ov || ov.style.display !== 'block' || !window.TR || TR.sc !== 'rx' || typeof vlFetch !== 'function') return;
    vlFetch(TR.list.slice(0, 40).map(function (r) { return r.x; }), function () { window.rmDraw(); }); }, 60000);

  window.rmDraw = function (force) {
    var el = document.getElementById('tr-real'); if (!el || el.style.display === 'none') return;
    var sc = typeof trScene === 'function' ? trScene() : null;
    var h = Math.max(340, Math.round(window.innerHeight * (document.body.classList.contains('m') ? 0.6 : 0.62)));
    if (!el.firstChild) el.innerHTML = '<div class="rm-box" style="height:' + h + 'px"></div><div class="rm-leg"><span><i style="background:#22c55e"></i>Route covered</span><span><i class="dsh"></i>Route ahead</span><span><i style="background:#f97316"></i>Ship's real AIS track</span><span>🚢 sea · 🚛 road · ✈️ air</span></div>';
    var box = el.querySelector('.rm-box'); box.style.height = h + 'px';
    if (!sc) { box.innerHTML = '<div class="tr-empty" style="padding:40px;text-align:center;color:#9fb6d6">Select a shipment to see its route</div>'; if (map) { map.remove(); map = null; } return; }
    loadLeaflet().then(function (L) {
      var m = ensureMap(L, box); setTimeout(function () { m.invalidateSize(); }, 50);
      var segs = segments(sc), key = (window.TR ? TR.sc + '|' + TR.sel + '|' : '') + sc.N.map(function (n) { return n.n; }).join('>') + '|' + sc.t;
      var rr = window.TR && TR.list ? TR.list[TR.sel] : null, lv = rr && rr._live && window.VL && window.vk ? VL[vk(rr.x)] : null;
      clearInterval(liveTimer);
      // a live ship: the part already sailed follows its real AIS track instead of the planned lane
      var li = -1; sc.N.forEach(function (n, i) { if (/· live$/.test(n.n)) li = i; });
      if (lv && li > 0 && lv.track && lv.track.length > 1 && segs[li - 1]) { var s0 = segs[li - 1][0];
        segs[li - 1] = [s0].concat(lv.track.map(function (p) { return [p[0], p[1]]; })).concat([[lv.lat, lv.lon]]); }
      var isNew = key !== lastKey || force; lastKey = key;
      if (layers) layers.remove(); layers = L.layerGroup().addTo(m);
      var all = [].concat.apply([], segs), labs = [];
      L.polyline(all, { color: '#0b1d3a', weight: 7, opacity: 0.45 }).addTo(layers);
      L.polyline(all, { color: '#e2e8f0', weight: 3, opacity: 0.95, dashArray: '8 8' }).addTo(layers);
      var covered = L.polyline([], { color: '#22c55e', weight: 5, opacity: 0.95 }).addTo(layers);
      sc.N.forEach(function (n, i) {
        var last = i === sc.N.length - 1, first = i === 0;
        var mk = L.circleMarker([n.lat, n.lon], { radius: n.minor ? 5 : 8, color: '#fff', weight: 2, fillColor: last ? '#16a34a' : first ? '#0b3fa8' : n.minor ? '#94a3b8' : '#f59e0b', fillOpacity: 1 }).addTo(layers);
        var tip = '<b>' + esc(n.n) + '</b>' + (n.s ? '<br>' + esc(n.s) : '');
        mk.bindTooltip(tip, { permanent: !n.minor, direction: i % 2 ? 'bottom' : 'top', className: 'rm-tip', offset: [0, i % 2 ? 8 : -8] });
        if (!n.minor) labs.push({ m: mk, pr: last ? 0 : first ? 1 : 3 });
      });
      // other shipments on the same route
      sc.M.forEach(function (q) { if (q.sel) return;
        var p = posAt(segs, q.t), ic = L.divIcon({ className: '', html: '<div class="rm-v sm" style="border-color:' + (COL[q.st] || '#2563eb') + '">' + q.ic + '</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
        L.marker(p, { icon: ic, zIndexOffset: 400 }).addTo(layers).bindTooltip(esc(q.lb), { direction: 'top', offset: [0, -12] })
          .on('click', function () { var it = document.querySelector('#tr-list [data-tr="' + q.i + '"]'); if (it) it.click(); }); });
      var me = sc.M.filter(function (q) { return q.sel; })[0], icon = me ? me.ic : '📦';
      // the ship's real AIS track so far
      if (lv && lv.track && lv.track.length > 1) {
        L.polyline(lv.track.map(function (p) { return [p[0], p[1]]; }), { color: '#f97316', weight: 3, opacity: 0.95 }).addTo(layers);
        lv.track.forEach(function (p, i) { if (i % 3 && i !== lv.track.length - 1) return; L.circleMarker([p[0], p[1]], { radius: 2.5, color: '#f97316', weight: 1, fillColor: '#fff', fillOpacity: 1 }).addTo(layers).bindTooltip(esc(when(p[2])), { direction: 'top' }); }); }
      var vehHtml = lv ? '<div class="rm-v live"><span class="rm-pulse"></span>' + shipSvg(lv.course != null ? lv.course : lv.heading) + '</div>' : '<div class="rm-v"><span class="rm-pulse"></span>' + icon + '</div>';
      var veh = L.marker(posAt(segs, 0), { icon: L.divIcon({ className: '', html: vehHtml, iconSize: [40, 40], iconAnchor: [20, 20] }), zIndexOffset: 1000 }).addTo(layers);
      var ahead = L.polyline([], { color: '#22c55e', weight: 3, opacity: 0.9, dashArray: '2 6' }).addTo(layers);
      liveBox(L, m, lv, rr);
      if (me) { veh.bindTooltip(esc(me.lb), { direction: 'right', offset: [16, 0], className: 'rm-tip', permanent: !document.body.classList.contains('m') }); labs.push({ m: veh, pr: 2, moving: 1 }); }
      LABS = labs; m.off('zoomend', declutter); m.on('zoomend', declutter);
      if (isNew && !(lv && follow)) m.fitBounds(L.latLngBounds(all).pad(0.12), { animate: false, maxZoom: 9 });
      if (lv && follow) m.setView([lv.lat, lv.lon], Math.max(m.getZoom() || 0, 8), { animate: !isNew });
      cancelAnimationFrame(raf); var T = sc.t, t0 = performance.now(), dur = isNew ? 1600 : 0;
      var step = function (now) { var k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3), t = T * e;
        veh.setLatLng(posAt(segs, t)); covered.setLatLngs(partPath(segs, t)); if (k < 1) raf = requestAnimationFrame(step); else { declutter(); if (lv) startLive(); } };
      // between AIS updates the ship keeps moving on its last speed and course (up to 2 hours), so the icon moves smoothly
      function startLive() { var tick = function () { var e = estimate(lv); veh.setLatLng(e.pt); ahead.setLatLngs(e.est ? [[lv.lat, lv.lon], e.pt] : []);
          var st = document.getElementById('rm-est'); if (st) st.textContent = e.est ? 'estimated now (moving ' + lv.speed + ' kn)' : 'last AIS position';
          if (follow) m.panTo(e.pt, { animate: true }); };
        tick(); liveTimer = setInterval(tick, 3000); }
      raf = requestAnimationFrame(step);
    }).catch(function (e) { box.innerHTML = '<div class="tr-empty" style="padding:40px;text-align:center">' + esc(e.message) + '</div>'; });
  };
  window.addEventListener('resize', function () { if (map) map.invalidateSize(); });
  window.rmMap = function () { return map; };
})();
