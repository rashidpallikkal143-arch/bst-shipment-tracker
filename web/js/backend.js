/*
 * BST Shipment Tracker: data layer.
 * Gives the app the same server functions it had in Google Apps Script (google.script.run.xxx),
 * now backed by Firebase (Firestore + logins), or by this device's storage in DEMO MODE.
 */
(function () {
  'use strict';
  var CFG = window.BST_FIREBASE_CONFIG || {};
  var MODE = CFG.apiKey && !/PASTE/i.test(CFG.apiKey) ? 'firebase' : 'demo';
  var DOMAIN = window.BST_LOGIN_DOMAIN || 'users.bst-tracker.app';
  var FBV = '10.12.2', FBB = 'https://www.gstatic.com/firebasejs/' + FBV + '/';

  // ------------------------------------------------------------------ constants
  var RIGHTS = [
    ['admin', 'Full admin (all rights)'], ['users', 'Manage users'],
    ['egView', 'Egypt: view'], ['egEdit', 'Egypt: add & edit'], ['egDel', 'Egypt: delete'],
    ['gView', 'Global import: view'], ['gEdit', 'Global import: add & edit'], ['gDel', 'Global import: delete'],
    ['inspEdit', 'Inspections: add & edit'], ['mxView', 'Matex payments: view'], ['mxEdit', 'Matex payments: add & edit'],
    ['settings', 'Settings, import & backup']
  ];
  var RX_KEYS = ['line', 'vessel', 'imo', 'mmsi', 'voyage', 'bl', 'tlink', 'refId', 'piDate', 'poStatus', 'poNs', 'piNs', 'port1', 'eta1', 'ata1', 'fs1', 'fe1', 'fu1', 'fu2',
    'invoice', 'po', 'pi', 'country', 'ref', 'contQty', 'contSize', 'stage', 'etd', 'atd', 'eta', 'ata', 'freeStart', 'freeEnd', 'supplier', 'shipper', 'whDate', 'payment', 'remarks', 'month', 'port'];
  var EG_KEYS = ['sr', 'sched', 'actual', 'items', 'batch', 'supplier', 'inv', 'brand', 'origin', 'ctn', 'pallets', 'container', 'vehicle', 'driver', 'mobile',
    'po', 'supPay', 'invAmt', 'frPay', 'frAmt', 'loading', 'ksa', 'ghu', 'wh', 'delivered', 'purchase', 'updated', 'remarks'];
  var EG_NUM = { sr: 1, ctn: 1, pallets: 1, invAmt: 1, frAmt: 1 };
  var INSP_KEYS = ['id', 'ref', 'invoice', 'level', 'product', 'status', 'authority', 'date', 'result', 'clearance', 'clearDate', 'action', 'owner', 'due', 'remarks', 'updated', 'by'];
  var MX_KEYS = ['id', 'month', 'container', 'inv', 'invDate', 'desc', 'amount', 'paid', 'status', 'payDate', 'mode', 'ref', 'due', 'remarks', 'updated'];
  var DONE = ['Delivered to warehouse', 'Purchase not booked', 'Purchase booked'];
  var DEFAULT_SETTINGS = {
    transitDays: 8,
    egMonths: ['OCT 2026', 'NOV 2026', 'DEC 2026'],
    egLists: { po: ['Not Placed', 'Placed'], supPay: ['Unpaid', 'Pending', 'Initiated', 'Completed'], frPay: ['Unpaid', 'Pending', 'Initiated', 'Completed'],
      loading: ['Scheduled', 'Dispatched'], ksa: ['En Route', 'Arrived', 'Cleared'], ghu: ['En Route', 'Arrived', 'Cleared'], wh: ['Arrived', 'Delivered'], purchase: ['Not Booked', 'Booked'] },
    rx: {
      stages: ['PO issued to supplier', 'Supplier confirmed / ready', 'Shipping documents received', 'Booking confirmed', 'Loaded & departed', 'In transit', 'Arrived at port / border',
        'Port release (DO / free time)', 'Customs declaration (Bayan) submitted', 'Duty paid & cleared', 'Transport to warehouse', 'Delivered to warehouse', 'Purchase not booked', 'Purchase booked'],
      sizes: ["20' GP", "40' GP", "40' HC", "20' Reefer", "40' Reefer", "40' HC Reefer", 'Truck / Trailer', 'Other'],
      units: ['Total weight (kg)', 'Cartons (ctns)', 'Pallets', 'Bags', 'Metric tons (MT)'],
      payments: ['Advance payment', 'PDC Cheque', 'Current Date Cheque', 'Online Transfer']
    },
    track: {
      lines: [
        { name: 'MSC', prefixes: ['MSCU', 'MEDU', 'MSDU', 'MSMU'], url: 'https://www.msc.com/en/track-a-shipment?agencyPath=msc&trackingNumber={NO}' },
        { name: 'Maersk', prefixes: ['MAEU', 'MSKU', 'MRKU', 'MRSU', 'MCAU', 'MSWU'], url: 'https://www.maersk.com/tracking/{NO}' },
        { name: 'CMA CGM', prefixes: ['CMAU', 'CGMU', 'ECMU', 'APHU', 'APZU'], url: 'https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference={NO}' },
        { name: 'Hapag-Lloyd', prefixes: ['HLXU', 'HLBU', 'HAMU', 'UACU'], url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container={NO}' },
        { name: 'COSCO', prefixes: ['CSNU', 'CBHU', 'CCLU', 'COSU'], url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number={NO}' },
        { name: 'ONE', prefixes: ['ONEU', 'NYKU', 'MOLU', 'KKFU'], url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?trakNoParam={NO}' },
        { name: 'Evergreen', prefixes: ['EGHU', 'EISU', 'EMCU', 'EGSU'], url: 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do' },
        { name: 'OOCL', prefixes: ['OOLU', 'OOCU'], url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx' },
        { name: 'Yang Ming', prefixes: ['YMLU', 'YMMU'], url: 'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx' },
        { name: 'HMM', prefixes: ['HDMU', 'HMMU'], url: 'https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do' },
        { name: 'ZIM', prefixes: ['ZIMU', 'ZCSU'], url: 'https://www.zim.com/tools/track-a-shipment?consnumber={NO}' },
        { name: 'PIL', prefixes: ['PCIU', 'PILU'], url: 'https://www.pilship.com/en--/120.html' }
      ],
      container: [{ name: 'Track-Trace (any line)', url: 'https://www.track-trace.com/container' }],
      vessel: [
        { name: 'MarineTraffic', url: 'https://www.marinetraffic.com/en/ais/details/ships/imo:{IMO}' },
        { name: 'VesselFinder', url: 'https://www.vesselfinder.com/vessels/details/{IMO}' },
        { name: 'MyShipTracking', url: 'https://www.myshiptracking.com/vessels?name={NAME}' }
      ],
      findImo: 'https://www.vesselfinder.com/vessels?name={NAME}',
      port: [
        { name: 'Dubai Trade (Jebel Ali)', url: 'https://www.dubaitrade.ae/' },
        { name: 'AD Ports Maqta Gateway (Khalifa / Abu Dhabi)', url: 'https://www.maqta.ae/' }
      ]
    }
  };

  // ------------------------------------------------------------------ helpers
  var today = function () { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date()); };
  var s_ = function (v) { return v === null || v === undefined ? '' : String(v); };
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var monKey = function (m) { var p = String(m || '').toUpperCase().split(' '); return parseInt(p[1], 10) * 12 + MON.indexOf(p[0]); };
  var addDays = function (d, n) { if (!d) return ''; var x = new Date(d + 'T00:00:00Z'); if (isNaN(x)) return ''; x.setUTCDate(x.getUTCDate() + Number(n || 0)); return x.toISOString().slice(0, 10); };
  var dayDiff = function (a, b) { return Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 864e5); };
  var genId = function (p) { return (p || 'R') + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); };
  var rxKey = function (o) { var inv = String(o.invoice || '').split(/\s*[,;\n]\s*/)[0].trim(); return inv || o.po || o.pi || o.refId || ''; };
  var userEmail = function (uid) { uid = String(uid || '').trim().toLowerCase(); return uid.indexOf('@') >= 0 ? uid : uid + '@' + DOMAIN; };
  var err = function (m) { return new Error(m); };
  function niceErr(e) {
    var c = (e && e.code) || '', m = (e && e.message) || String(e);
    if (/permission/i.test(c + m)) return err('You do not have permission for this. Ask your admin to give you the right.');
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/i.test(c)) return err('Wrong user ID or password.');
    if (/too-many-requests/i.test(c)) return err('Too many attempts. Wait a few minutes and try again.');
    if (/email-already-in-use/i.test(c)) return err('This user ID already exists.');
    if (/weak-password/i.test(c)) return err('The password must have at least 6 characters.');
    if (/network|unavailable/i.test(c + m)) return err('No internet connection. Check the connection and try again.');
    return e instanceof Error ? e : err(m);
  }

  // ------------------------------------------------------------------ DEMO store (this device only)
  function demoStore() {
    var K = 'bst_demo_db', A = 'bst_demo_auth';
    var load = function (k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } };
    var save = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };
    var sha = function (t) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode('bst|' + t)).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }); };
    var db = {
      all: function (col, field, val) { var d = load(K)[col] || {}; return Promise.resolve(Object.keys(d).map(function (id) { return Object.assign({ _id: id }, d[id]); }).filter(function (x) { return !field || x[field] === val; })); },
      get: function (col, id) { var d = (load(K)[col] || {})[id]; return Promise.resolve(d ? Object.assign({ _id: id }, d) : null); },
      set: function (col, id, data) { var a = load(K); a[col] = a[col] || {}; a[col][id] = JSON.parse(JSON.stringify(data)); save(K, a); return Promise.resolve(); },
      merge: function (col, id, data) { var a = load(K); a[col] = a[col] || {}; a[col][id] = Object.assign(a[col][id] || {}, JSON.parse(JSON.stringify(data))); save(K, a); return Promise.resolve(); },
      del: function (col, id) { var a = load(K); if (a[col]) delete a[col][id]; save(K, a); return Promise.resolve(); },
      batch: function (ops) { ops.forEach(function (o) { if (o.op === 'del') db.del(o.col, o.id); else if (o.op === 'merge') db.merge(o.col, o.id, o.data); else db.set(o.col, o.id, o.data); }); return Promise.resolve(); }
    };
    var auth = {
      current: function () { var a = load(A); return Promise.resolve(a.current ? { uid: a.current } : null); },
      needsBootstrap: function () { return db.get('meta', 'bootstrap').then(function (b) { return !b; }); },
      signIn: function (u, p) { var a = load(A), x = (a.users || {})[String(u).trim().toLowerCase()]; return sha(p).then(function (h) { if (!x || x.h !== h) throw err('Wrong user ID or password.'); a.current = x.uid; save(A, a); return { uid: x.uid }; }); },
      signOut: function () { var a = load(A); delete a.current; save(A, a); return Promise.resolve(); },
      createUser: function (u, p) { u = String(u).trim().toLowerCase(); var a = load(A); a.users = a.users || {}; if (a.users[u]) return Promise.reject(err('This user ID already exists.')); if (String(p).length < 6) return Promise.reject(err('The password must have at least 6 characters.'));
        return sha(p).then(function (h) { var uid = genId('U'); a = load(A); a.users = a.users || {}; a.users[u] = { uid: uid, h: h }; save(A, a); return uid; }); },
      bootstrapSignIn: function (u, p) { return auth.createUser(u, p).then(function (uid) { var a = load(A); a.current = uid; save(A, a); return { uid: uid }; }); },
      changePassword: function (u, oldP, newP) { u = String(u).trim().toLowerCase(); var a = load(A), x = (a.users || {})[u]; if (String(newP).length < 6) return Promise.reject(err('The password must have at least 6 characters.'));
        return sha(oldP).then(function (h) { if (!x || x.h !== h) throw err('The current password is wrong.'); return sha(newP); }).then(function (h2) { a = load(A); a.users[u].h = h2; save(A, a); }); }
    };
    return Promise.resolve({ db: db, auth: auth });
  }

  // ------------------------------------------------------------------ FIREBASE store
  function firebaseStore() {
    return Promise.all([import(FBB + 'firebase-app.js'), import(FBB + 'firebase-auth.js'), import(FBB + 'firebase-firestore.js')]).then(function (m) {
      var A = m[0], U = m[1], F = m[2];
      var app = A.initializeApp(CFG), au = U.getAuth(app), fs;
      try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); } catch (e) { fs = F.getFirestore(app); }
      var ref = function (col, id) { return F.doc(fs, col, id); };
      var clean = function (o) { return JSON.parse(JSON.stringify(o)); };
      var db = {
        all: function (col, field, val) { var q = field ? F.query(F.collection(fs, col), F.where(field, '==', val)) : F.collection(fs, col);
          return F.getDocs(q).then(function (sn) { return sn.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); }); }); },
        get: function (col, id) { return F.getDoc(ref(col, id)).then(function (d) { return d.exists() ? Object.assign({ _id: d.id }, d.data()) : null; }); },
        set: function (col, id, data) { return F.setDoc(ref(col, id), clean(data)); },
        merge: function (col, id, data) { return F.setDoc(ref(col, id), clean(data), { merge: true }); },
        del: function (col, id) { return F.deleteDoc(ref(col, id)); },
        batch: function (ops) { var chain = Promise.resolve();
          for (var i = 0; i < ops.length; i += 400) (function (part) { chain = chain.then(function () { var b = F.writeBatch(fs);
            part.forEach(function (o) { if (o.op === 'del') b.delete(ref(o.col, o.id)); else if (o.op === 'merge') b.set(ref(o.col, o.id), clean(o.data), { merge: true }); else b.set(ref(o.col, o.id), clean(o.data)); });
            return b.commit(); }); })(ops.slice(i, i + 400));
          return chain; }
      };
      var first = new Promise(function (res) { var off = U.onAuthStateChanged(au, function (u) { off(); res(u); }); });
      var second = null;
      var auth = {
        current: function () { return first.then(function () { return au.currentUser ? { uid: au.currentUser.uid } : null; }); },
        needsBootstrap: function () { return db.get('meta', 'bootstrap').then(function (b) { return !b; }); },
        signIn: function (u, p) { return U.signInWithEmailAndPassword(au, userEmail(u), p).then(function (c) { return { uid: c.user.uid }; }); },
        signOut: function () { return U.signOut(au); },
        // a second Firebase instance creates the new login, so the admin stays signed in
        createUser: function (u, p) { second = second || A.initializeApp(CFG, 'bst-admin-create'); var a2 = U.getAuth(second);
          return U.createUserWithEmailAndPassword(a2, userEmail(u), p).then(function (c) { var uid = c.user.uid; return U.signOut(a2).then(function () { return uid; }); }); },
        bootstrapSignIn: function (u, p) { return U.createUserWithEmailAndPassword(au, userEmail(u), p).then(function (c) { return { uid: c.user.uid }; }); },
        changePassword: function (u, oldP, newP) { var cu = au.currentUser; if (!cu) return Promise.reject(err('Sign in again first.'));
          return U.reauthenticateWithCredential(cu, U.EmailAuthProvider.credential(cu.email, oldP)).catch(function () { throw err('The current password is wrong.'); })
            .then(function () { return U.updatePassword(cu, newP); }); }
      };
      return { db: db, auth: auth };
    });
  }

  // ------------------------------------------------------------------ session + rights
  var S = null, ME = null, SET = null;
  var ready = (MODE === 'firebase' ? firebaseStore() : demoStore()).then(function (x) { S = x; return x; });
  var can = function (r) { return !!(ME && ME.active !== false && ME.rights && (ME.rights.admin || ME.rights[r])); };
  var need = function (r) { if (!can(r)) throw err('You do not have permission for this. Ask your admin to give you the right.'); };
  function loadSettings() { return S.db.get('settings', 'main').then(function (x) { var d = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); x = x || {};
    ['transitDays', 'egMonths', 'egLists', 'rx', 'track'].forEach(function (k) { if (x[k] !== undefined && x[k] !== null) d[k] = x[k]; });
    d.rx = Object.assign({}, DEFAULT_SETTINGS.rx, d.rx || {}); d.egLists = Object.assign({}, DEFAULT_SETTINGS.egLists, d.egLists || {}); d.track = d.track || DEFAULT_SETTINGS.track; SET = d; return d; }); }
  function loadMe(uid) { return S.db.get('users', uid).then(function (u) {
    if (!u) throw err('This login has no user profile. Ask your admin to set up your user ID.');
    if (u.active === false) throw err('This user ID has been switched off by the admin.');
    ME = Object.assign({ uid: uid }, u); ME.rights = ME.rights || {}; return loadSettings().then(function () { return ME; }); }); }

  // ------------------------------------------------------------------ Egypt
  function egCompute(r) {
    var o = Object.assign({}, r), t = SET.transitDays, td = today();
    var base = o.actual || o.sched; o.eta = base ? addDays(base, t) : (o.etaManual || '');
    var dl = o.wh === 'Delivered' || o.wh === 'Arrived';
    o.position = o.purchase === 'Booked' ? 'Closed - Purchase Booked' : dl ? 'Delivered to Warehouse' : o.ghu === 'Cleared' ? 'Out for Delivery' : o.ghu === 'Arrived' ? 'At Ghuwaifat Border'
      : (o.ksa === 'Cleared' || o.ghu === 'En Route') ? 'En Route to Ghuwaifat' : o.ksa === 'Arrived' ? 'At KSA Border' : (o.loading === 'Dispatched' || o.ksa === 'En Route') ? 'En Route to KSA Border'
      : o.loading === 'Scheduled' ? 'Awaiting Loading' : 'Pre-Shipment';
    o.milestones = ((o.po === 'Placed') + (o.supPay === 'Completed') + (o.frPay === 'Completed') + (o.loading === 'Dispatched') + (o.ksa === 'Cleared') + (o.ghu === 'Cleared') + dl + (o.purchase === 'Booked')) / 8;
    if (!o.eta) o.alert = ''; else if (dl) o.alert = 'Delivered'; else { var n = dayDiff(o.eta, td); o.alert = n < 0 ? 'Overdue ' + (-n) + ' days' : n === 0 ? 'Due today' : 'Due in ' + n + ' days'; }
    return o;
  }
  var API = {};
  API.getEgyptData = function () { need('egView'); return Promise.all([loadSettings(), S.db.all('eg')]).then(function (x) {
    var docs = x[1], months = (SET.egMonths || []).slice();
    docs.forEach(function (d) { if (d.month && months.indexOf(d.month) < 0) months.push(d.month); });
    months = months.filter(function (m) { return /^[A-Z]{3} \d{4}$/.test(m); }).sort(function (a, b) { return monKey(a) - monKey(b); });
    var rows = docs.map(function (d) { var o = {}; EG_KEYS.forEach(function (k) { o[k] = EG_NUM[k] ? (d[k] === '' || d[k] === undefined || isNaN(Number(d[k])) ? '' : Number(d[k])) : s_(d[k]); });
      o.month = d.month; o.etaManual = s_(d.etaManual); o = egCompute(o); o.row = d._id; return o; })
      .filter(function (o) { return o.items || o.container || o.supplier || o.sched; })
      .sort(function (a, b) { return monKey(a.month) - monKey(b.month) || (Number(a.sr) || 0) - (Number(b.sr) || 0); });
    var cols = {}; months.forEach(function (m) { cols[m] = EG_KEYS.concat(['eta', 'position', 'milestones', 'alert']); });
    return { months: months, rows: rows, cols: cols, lists: SET.egLists, today: today(), url: '' }; }); };
  API.saveEgyptEntry = function (o) { need('egEdit'); var v = o.v || {};
    if (!/^[A-Z]{3} \d{4}$/.test(String(o.month))) throw err('Invalid month');
    if (!o.row && !String(v.inv || '').trim()) throw err('Invoice number is required');
    if (!o.row && !v.items && !v.container && !v.supplier) throw err('Enter at least the items, container number or supplier');
    return S.db.all('eg').then(function (docs) {
      var data = {}; v.updated = today();
      EG_KEYS.forEach(function (k) { if (v[k] === undefined || v[k] === null) return; data[k] = EG_NUM[k] && v[k] !== '' ? Number(v[k]) : s_(v[k]); });
      if (o.row) { var cur = docs.filter(function (d) { return d._id === o.row; })[0]; if (!cur) throw err('This entry was deleted meanwhile. Click Refresh.');
        return S.db.merge('eg', o.row, data).then(function () { return { row: o.row, month: cur.month }; }); }
      var mx = 0; docs.forEach(function (d) { if (d.month === o.month && Number(d.sr) > mx) mx = Number(d.sr); });
      if (!data.sr) data.sr = mx + 1; data.month = o.month; data.created = new Date().toISOString(); data.by = ME.userId || '';
      var id = genId('E');
      return S.db.set('eg', id, data).then(function () {
        if ((SET.egMonths || []).indexOf(o.month) < 0) return S.db.merge('settings', 'main', { egMonths: (SET.egMonths || []).concat([o.month]) }).catch(function () {}); })
        .then(function () { return { row: id, month: o.month }; }); }); };
  API.deleteEgyptEntry = function (o) { need('egDel'); return S.db.del('eg', o.row).then(function () { return true; }); };

  // ------------------------------------------------------------------ Global import
  API.getData = function () { need('gView'); return Promise.all([loadSettings(), S.db.all('rx')]).then(function (x) {
    var shipments = [], items = [], containers = [];
    x[1].forEach(function (d) { var o = {}; RX_KEYS.forEach(function (k) { o[k] = s_(d[k]); }); o.key = rxKey(o); if (!o.key) return; o._doc = d._id; shipments.push(o);
      (d.items || []).forEach(function (i) { items.push({ invoice: o.key, desc: s_(i.desc), qty: s_(i.qty), unit: s_(i.unit), remarks: s_(i.remarks), inv: s_(i.inv) }); });
      (d.containers || []).forEach(function (c) { containers.push({ key: o.key, no: s_(c.no), size: s_(c.size), seal: s_(c.seal), remarks: s_(c.remarks) }); }); });
    var r = SET.rx;
    return { track: SET.track, liveApi: false, stages: r.stages, sizes: r.sizes, units: r.units, payments: r.payments, shipments: shipments, items: items, containers: containers, today: today(), url: '' }; }); };
  function findRx(docs, key) { return docs.filter(function (d) { var o = {}; RX_KEYS.forEach(function (k) { o[k] = s_(d[k]); }); return key && rxKey(o) === String(key); })[0] || null; }
  API.saveShipment = function (s, oldKey) { need('gEdit');
    if (!String(s.invoice || '').trim() && !s.po && !s.pi && !s.refId) { var t = new Date(); s.refId = 'BST-' + t.toISOString().slice(2, 10).replace(/-/g, '') + '-' + t.toTimeString().slice(0, 8).replace(/:/g, ''); }
    var newKey = rxKey(s);
    return S.db.all('rx').then(function (docs) {
      var key = oldKey || newKey, cur = findRx(docs, key);
      if (key !== newKey) { var dup = findRx(docs, newKey); if (dup && (!cur || dup._id !== cur._id)) throw err('A shipment with this reference already exists'); }
      if (!cur && !oldKey) { var d2 = findRx(docs, newKey); if (d2) throw err('A shipment with this reference already exists'); }
      var data = {}; RX_KEYS.forEach(function (k) { data[k] = s_(s[k]); });
      data.items = (s.items || []).filter(function (i) { return i.desc || i.qty; }).map(function (i) { return { desc: s_(i.desc), qty: s_(i.qty), unit: s_(i.unit), remarks: s_(i.remarks), inv: s_(i.inv) }; });
      data.containers = (s.containers || []).filter(function (c) { return String(c.no || '').trim(); }).map(function (c) { return { no: s_(c.no).trim(), size: s_(c.size), seal: s_(c.seal), remarks: s_(c.remarks) }; });
      data.updated = today(); data.by = ME.userId || '';
      var id = cur ? cur._id : genId('S'); if (!cur) data.created = new Date().toISOString();
      return S.db.set('rx', id, data).then(function () { return newKey; }); }); };
  API.advanceStage = function (key) { need('gEdit'); return Promise.all([loadSettings(), S.db.all('rx')]).then(function (x) {
    var cur = findRx(x[1], key); if (!cur) throw err('Shipment not found');
    var st = SET.rx.stages, next = st[Math.min(Math.max(st.indexOf(cur.stage), -1) + 1, st.length - 1)], up = { stage: next, updated: today() };
    if (next === 'Delivered to warehouse' && !cur.whDate) up.whDate = today();
    return S.db.merge('rx', cur._id, up).then(function () { return next; }); }); };
  API.deleteShipment = function (key) { need('gDel'); return S.db.all('rx').then(function (docs) { var cur = findRx(docs, key); return cur ? S.db.del('rx', cur._id) : null; }).then(function () { return true; }); };

  // ------------------------------------------------------------------ Inspections + Matex payments
  var TAB = { egInsp: { col: 'insp', sc: 'eg', view: 'egView', edit: 'inspEdit', keys: INSP_KEYS }, rxInsp: { col: 'insp', sc: 'rx', view: 'gView', edit: 'inspEdit', keys: INSP_KEYS },
    matex: { col: 'matex', view: 'mxView', edit: 'mxEdit', keys: MX_KEYS } };
  API.getTab = function (kind) { var t = TAB[kind]; if (!t) throw err('Unknown table: ' + kind); need(t.view);
    return (t.sc ? S.db.all(t.col, 'sc', t.sc) : S.db.all(t.col)).then(function (docs) { return docs.map(function (d) { var o = {};
      t.keys.forEach(function (k) { o[k] = (k === 'amount' || k === 'paid') ? (d[k] === '' || d[k] === undefined || isNaN(Number(d[k])) ? '' : Number(d[k])) : s_(d[k]); }); o.id = o.id || d._id; return o; }); }); };
  API.saveTabRow = function (kind, rec) { var t = TAB[kind]; if (!t) throw err('Unknown table: ' + kind); need(t.edit);
    if (t.sc && !String(rec.invoice || '').trim()) throw err('Invoice number is required for an inspection record');
    var id = rec.id || genId('R'), data = {}; t.keys.forEach(function (k) { if (rec[k] !== undefined) data[k] = (k === 'amount' || k === 'paid') && rec[k] !== '' ? Number(rec[k]) : s_(rec[k]); });
    data.id = id; data.updated = today(); if (t.sc) { data.sc = t.sc; data.by = ME.userId || ''; }
    return S.db.set(t.col, id, data).then(function () { return id; }); };
  API.deleteTabRow = function (kind, id) { var t = TAB[kind]; if (!t) throw err('Unknown table: ' + kind); need(t.edit); return S.db.del(t.col, id).then(function () { return true; }); };

  // ------------------------------------------------------------------ old password checks (now: rights of the signed-in user)
  API.checkViewer = function () { return ME ? (can('admin') ? 'admin' : 'viewer') : ''; };
  API.checkAdmin = function () { var sec = window.CURSEC; return sec === 'eg' ? can('egEdit') : sec === 'rx' ? can('gEdit') : can('admin'); };
  API.getVesselLive = function () { return { configured: false, data: {} }; };

  // ------------------------------------------------------------------ users (admin)
  API.listUsers = function () { need('users'); return S.db.all('users').then(function (l) { return l.map(function (u) { return { uid: u._id, name: s_(u.name), userId: s_(u.userId), rights: u.rights || {}, active: u.active !== false, created: s_(u.created) }; })
    .sort(function (a, b) { return a.userId.localeCompare(b.userId); }); }); };
  API.createUser = function (o) { need('users'); var id = String(o.userId || '').trim().toLowerCase();
    if (!/^[a-z0-9._@-]{3,40}$/.test(id)) throw err('User ID: 3 to 40 characters, letters, numbers, dot, dash or underscore only.');
    if (String(o.password || '').length < 6) throw err('The password must have at least 6 characters.');
    if (o.rights && o.rights.admin && !can('admin')) throw err('Only a full admin can create another full admin.');
    return S.db.all('users').then(function (l) { if (l.some(function (u) { return u.userId === id; })) throw err('This user ID already exists.');
      return S.auth.createUser(id, o.password); }).then(function (uid) {
      return S.db.set('users', uid, { name: s_(o.name) || id, userId: id, rights: o.rights || {}, active: true, created: new Date().toISOString(), createdBy: ME.userId || '' }).then(function () { return uid; }); }); };
  API.updateUser = function (o) { need('users'); if (o.uid === ME.uid && o.rights && !o.rights.admin && ME.rights.admin) throw err('You cannot remove your own full-admin right.');
    if (o.uid === ME.uid && o.active === false) throw err('You cannot switch off your own user ID.');
    if (o.rights && o.rights.admin && !can('admin')) throw err('Only a full admin can give full-admin rights.');
    var up = {}; ['name', 'rights', 'active'].forEach(function (k) { if (o[k] !== undefined) up[k] = o[k]; }); up.updated = new Date().toISOString();
    return S.db.merge('users', o.uid, up).then(function () { return true; }); };
  API.changeMyPassword = function (oldP, newP) { if (!ME) throw err('Sign in first.'); if (String(newP).length < 6) throw err('The password must have at least 6 characters.');
    return S.auth.changePassword(ME.userId, oldP, newP).then(function () { return true; }); };

  // ------------------------------------------------------------------ settings, import, backup
  API.getSettings = function () { if (!ME) throw err('Sign in first.'); return loadSettings(); };
  API.saveSettings = function (x) { need('settings'); var up = {}; ['transitDays', 'egMonths', 'egLists', 'rx'].forEach(function (k) { if (x[k] !== undefined) up[k] = x[k]; });
    if (up.transitDays !== undefined) { up.transitDays = Number(up.transitDays); if (!(up.transitDays >= 0 && up.transitDays <= 90)) throw err('Transit days must be a number from 0 to 90.'); }
    return S.db.merge('settings', 'main', up).then(loadSettings); };
  function fromSheets(j) { // file made by exportForNewApp() in the old Google Apps Script
    var out = { settings: {}, eg: [], rx: [], insp: [], matex: [] }, e = j.egypt || {}, g = j.global || {};
    if (e.months) out.settings.egMonths = e.months; if (e.transitDays) out.settings.transitDays = Number(e.transitDays); if (e.lists && Object.keys(e.lists).length) out.settings.egLists = e.lists;
    if (g.lists) out.settings.rx = { stages: g.lists.stages, sizes: g.lists.sizes, units: g.lists.units, payments: g.lists.payments };
    (e.rows || []).forEach(function (r) { var d = { month: r.month }; EG_KEYS.forEach(function (k) { if (r[k] !== undefined && r[k] !== '') d[k] = EG_NUM[k] ? Number(r[k]) : s_(r[k]); });
      if (!r.sched && !r.actual && r.eta) d.etaManual = s_(r.eta); out.eg.push(d); });
    (g.shipments || []).forEach(function (s) { var d = {}; RX_KEYS.forEach(function (k) { d[k] = s_(s[k]); }); var key = rxKey(d);
      d.items = (g.items || []).filter(function (i) { return s_(i.invoice) === key; }).map(function (i) { return { desc: s_(i.desc), qty: s_(i.qty), unit: s_(i.unit), remarks: s_(i.remarks), inv: s_(i.inv) }; });
      d.containers = (g.containers || []).filter(function (c) { return s_(c.key) === key; }).map(function (c) { return { no: s_(c.no), size: s_(c.size), seal: s_(c.seal), remarks: s_(c.remarks) }; });
      if (!d.containers.length && d.ref) d.containers = d.ref.split(/\s*[,;\n]\s*/).filter(Boolean).map(function (n) { return { no: n, size: d.contSize, seal: '', remarks: '' }; });
      out.rx.push(d); });
    ['eg', 'rx'].forEach(function (sc) { ((j.inspections || {})[sc] || []).forEach(function (r) { var d = { sc: sc }; INSP_KEYS.forEach(function (k) { d[k] = s_(r[k]); }); d.id = d.id || genId('R'); out.insp.push(d); }); });
    (j.matex || []).forEach(function (r) { var d = {}; MX_KEYS.forEach(function (k) { d[k] = (k === 'amount' || k === 'paid') && r[k] !== '' && r[k] !== undefined ? Number(r[k]) : s_(r[k]); }); d.id = d.id || genId('M'); out.matex.push(d); });
    return out; }
  API.importData = function (j, replace) { need('settings'); if (!j || typeof j !== 'object') throw err('This is not a tracker data file.');
    var x = j.format === 'bst-sheets-export' ? fromSheets(j) : j.format === 'bst-app-backup' ? j : null; if (!x) throw err('This file is not a BST tracker export or backup.');
    var cols = ['eg', 'rx', 'insp', 'matex'];
    return (replace ? Promise.all(cols.map(function (c) { return S.db.all(c); })) : Promise.resolve([[], [], [], []])).then(function (old) {
      var ops = []; old.forEach(function (l, i) { l.forEach(function (d) { ops.push({ op: 'del', col: cols[i], id: d._id }); }); });
      (x.eg || []).forEach(function (d) { ops.push({ op: 'set', col: 'eg', id: d._id || genId('E'), data: strip(d) }); });
      (x.rx || []).forEach(function (d) { ops.push({ op: 'set', col: 'rx', id: d._id || genId('S'), data: strip(d) }); });
      (x.insp || []).forEach(function (d) { ops.push({ op: 'set', col: 'insp', id: d._id || d.id, data: strip(d) }); });
      (x.matex || []).forEach(function (d) { ops.push({ op: 'set', col: 'matex', id: d._id || d.id, data: strip(d) }); });
      if (x.settings && Object.keys(x.settings).length) ops.push({ op: 'merge', col: 'settings', id: 'main', data: strip(x.settings) });
      return S.db.batch(ops).then(function () { return { eg: (x.eg || []).length, rx: (x.rx || []).length, insp: (x.insp || []).length, matex: (x.matex || []).length, removed: replace ? old.reduce(function (a, l) { return a + l.length; }, 0) : 0 }; }); }); };
  function strip(d) { var o = Object.assign({}, d); delete o._id; return o; }
  API.exportBackup = function () { need('settings'); return Promise.all([S.db.get('settings', 'main'), S.db.all('eg'), S.db.all('rx'), S.db.all('insp'), S.db.all('matex')]).then(function (x) {
    return { format: 'bst-app-backup', version: 1, exportedAt: new Date().toISOString(), settings: x[0] ? strip(x[0]) : {}, eg: x[1], rx: x[2], insp: x[3], matex: x[4] }; }); };

  // ------------------------------------------------------------------ public object for the login / admin screens
  window.BST = {
    mode: MODE, rights: RIGHTS, ready: ready,
    me: function () { return ME; }, can: can, settings: function () { return SET; },
    start: function () { return ready.then(function () { return S.auth.current(); }).then(function (u) { return u ? loadMe(u.uid).catch(function (e) { return S.auth.signOut().then(function () { throw e; }); }) : null; }); },
    needsBootstrap: function () { return ready.then(function () { return S.auth.needsBootstrap(); }).catch(function () { return false; }); },
    signIn: function (u, p) { return ready.then(function () { return S.auth.signIn(u, p); }).then(function (x) { return loadMe(x.uid); })
      .catch(function (e) { var ne = niceErr(e); return S.auth.signOut().catch(function () {}).then(function () { throw ne; }); }); },
    signOut: function () { ME = null; return ready.then(function () { return S.auth.signOut(); }); },
    bootstrap: function (name, u, p) { u = String(u || '').trim().toLowerCase();
      if (!/^[a-z0-9._@-]{3,40}$/.test(u)) return Promise.reject(err('User ID: 3 to 40 characters, letters, numbers, dot, dash or underscore only.'));
      if (String(p || '').length < 6) return Promise.reject(err('The password must have at least 6 characters.'));
      return ready.then(function () { return S.auth.needsBootstrap(); }).then(function (n) { if (!n) throw err('The first admin already exists. Sign in instead.'); return S.auth.bootstrapSignIn(u, p); })
        .then(function (x) { return S.db.batch([{ op: 'set', col: 'users', id: x.uid, data: { name: name || u, userId: u, rights: { admin: true }, active: true, created: new Date().toISOString() } },
          { op: 'set', col: 'meta', id: 'bootstrap', data: { by: x.uid, at: new Date().toISOString() } }]).then(function () { return loadMe(x.uid); }); }).catch(function (e) { throw niceErr(e); }); },
    call: function (name) { var a = [].slice.call(arguments, 1); return ready.then(function () { if (!API[name]) throw err('Unknown function ' + name); return API[name].apply(null, a); }).catch(function (e) { throw niceErr(e); }); }
  };

  // ------------------------------------------------------------------ google.script.run replacement used by the app
  function runner() {
    var ok = function () {}, fail = function (e) { console.error(e); };
    var r = new Proxy({}, { get: function (t, name) {
      if (name === 'withSuccessHandler') return function (f) { ok = f; return r; };
      if (name === 'withFailureHandler') return function (f) { fail = f; return r; };
      if (name === 'withUserObject') return function () { return r; };
      return function () { var a = [].slice.call(arguments); window.BST.call.apply(null, [name].concat(a)).then(function (v) { ok(v); }, function (e) { fail(e); }); };
    } });
    return r;
  }
  window.google = window.google || {};
  window.google.script = { get run() { return runner(); }, host: { close: function () {} } };
})();
