/* BST Shipment Tracker: sign-in, user accounts & rights, settings, import and backup. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var B = window.BST;
  var RN = {}; B.rights.forEach(function (r) { RN[r[0]] = r[1]; });

  // ---------------------------------------------------------------- styles + screens
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '#login{position:fixed;inset:0;z-index:94;background:radial-gradient(circle at 50% 30%,#0b8a4b 0%,#04512c 55%,#022f1a 100%);overflow:auto;display:none;align-items:center;justify-content:center;padding:24px 16px}' +
    '.lg-in{width:100%;max-width:420px;text-align:center;color:#fff}.lg-card{background:#fff;color:var(--tx);border-radius:16px;padding:20px;text-align:left;margin-top:20px;box-shadow:0 18px 50px rgba(0,0,0,.35)}' +
    '.lg-card h2{margin:0 0 4px;font-size:18px}.lg-card label{display:block;margin-top:10px;font-size:13px;font-weight:600}.lg-card input{width:100%;font-size:16px;margin-top:4px}' +
    '.lg-card .p{width:100%;margin-top:14px;padding:11px;font-size:15px}.lg-m{color:var(--er);font-weight:600;font-size:13px;margin-top:8px;min-height:1px}' +
    '.lg-demo{background:#fff4e0;color:#8a5300;border:1px solid #f6d7a7;border-radius:10px;padding:8px 10px;font-size:12.5px;margin-top:12px;text-align:left}' +
    '.lg-lk{background:none;border:0;color:#0b6e3a;text-decoration:underline;font-size:13px;margin-top:10px;padding:0}' +
    '#ovacc,#ovusr,#ovset{z-index:96}.ub{max-width:1100px}.uh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.uh h2{margin:0;font-size:18px}' +
    '.rch{display:inline-block;font-size:11.5px;font-weight:600;background:#eef4ff;color:#1f4f8f;border-radius:10px;padding:1px 8px;margin:2px 3px 2px 0}.rch.a{background:#e7f7ee;color:#006b35}' +
    '.ut td{vertical-align:top}.ut .off{opacity:.55}.rg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 14px;margin-top:8px}' +
    '.rg label{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:500;margin:0}.rg input{width:auto;margin:0}' +
    '.us{border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-top:12px;background:#fafcfe}.us h3{margin:0 0 6px;font-size:15px}' +
    '.sg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.sg label{font-size:12.5px;font-weight:600}.sg textarea{width:100%;min-height:96px;font-size:12.5px}' +
    '.ab{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.ab button{padding:9px 14px}.mbadge{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;background:#fff4e0;color:#8a5300;border-radius:10px;padding:1px 8px;vertical-align:middle}' +
    'body.m #us-f .g,body.m #ac-pw .g,body.m #st-b .g{grid-template-columns:1fr!important}body.m .rg{grid-template-columns:1fr 1fr}body.m .sg{grid-template-columns:1fr 1fr}#elink,#rlink{display:none!important}' +
    '</style>');
  var logo = ($('logo0') && $('logo0').src) || '';
  document.body.insertAdjacentHTML('beforeend',
    '<div id="login"><div class="lg-in"><div class="hm-logo"><img src="' + logo + '" alt="Baniyas Spike Trading Co. L.L.C."></div>' +
    '<div class="hm-t">Import Container Tracking</div>' +
    '<div class="lg-card" id="lg-sign"><h2>Sign in</h2><div class="mu">Use the user ID and password your admin gave you.</div>' +
    '<label>User ID<input id="lg-u" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
    '<label>Password<input id="lg-p" type="password" autocomplete="current-password"></label>' +
    '<button class="p" id="lg-go" type="button">Sign in</button><div class="lg-m" id="lg-m"></div>' +
    '<button class="lg-lk" id="lg-first" type="button" style="display:none">First-time setup: create the admin account</button></div>' +
    '<div class="lg-card" id="lg-boot" style="display:none"><h2>First-time setup</h2><div class="mu">Create the main admin. This admin then creates everyone else\'s user ID and password.</div>' +
    '<label>Your name<input id="bt-n"></label><label>Admin user ID<input id="bt-u" autocapitalize="none" spellcheck="false" placeholder="e.g. rashid"></label>' +
    '<label>Password (at least 6 characters)<input id="bt-p" type="password" autocomplete="new-password"></label><label>Repeat password<input id="bt-p2" type="password" autocomplete="new-password"></label>' +
    '<button class="p" id="bt-go" type="button">Create admin and sign in</button><div class="lg-m" id="bt-m"></div></div>' +
    (B.mode === 'demo' ? '<div class="lg-demo"><b>Demo mode.</b> Firebase is not connected yet, so data is saved only on this device. Add your Firebase settings in <code>js/config.js</code> to share live data between all users and devices.</div>' : '') +
    '</div></div>' +
    '<div class="ovl" id="ovacc"><div class="box" style="max-width:520px"><div class="uh"><h2 id="ac-n"></h2><button type="button" data-x="ovacc">Close</button></div>' +
    '<div class="mu" id="ac-u"></div><div id="ac-r" style="margin-top:8px"></div><div class="ab" id="ac-b"></div>' +
    '<div class="us" id="ac-pw" style="display:none"><h3>Change my password</h3><div class="g" style="grid-template-columns:1fr 1fr 1fr"><label>Current password<input id="pw-o" type="password"></label><label>New password<input id="pw-n" type="password"></label><label>Repeat new<input id="pw-n2" type="password"></label></div>' +
    '<div class="ab"><button class="p" id="pw-go" type="button">Change password</button><span class="mu" id="pw-m" style="align-self:center"></span></div></div></div></div>' +
    '<div class="ovl" id="ovusr"><div class="box ub"><div class="uh"><h2>Users &amp; rights</h2><span><button class="p" id="us-add" type="button">+ Add user</button> <button type="button" data-x="ovusr">Close</button></span></div>' +
    '<div class="mu" style="margin-top:4px">Create a user ID and password for each person, then tick what they may see and do. Switch a person off to block their access at once.</div>' +
    '<div class="us" id="us-f" style="display:none"></div><div class="tw" style="margin-top:12px"><table class="cmp ut"><thead><tr><th>Name</th><th>User ID</th><th>Rights</th><th>Status</th><th></th></tr></thead><tbody id="us-l"></tbody></table></div></div></div>' +
    '<div class="ovl" id="ovset"><div class="box ub"><div class="uh"><h2>Settings &amp; data</h2><button type="button" data-x="ovset">Close</button></div><div id="st-b"></div></div></div>');

  // ---------------------------------------------------------------- sign in
  function showLogin(msg) {
    document.querySelectorAll('.ovl').forEach(function (o) { o.style.display = 'none'; });
    $('home').style.display = 'none'; $('login').style.display = 'flex'; $('lg-sign').style.display = ''; $('lg-boot').style.display = 'none';
    $('lg-m').textContent = msg || ''; $('lg-p').value = ''; $('lg-go').disabled = false;
    B.needsBootstrap().then(function (n) { $('lg-first').style.display = n ? '' : 'none'; if (n === true && !msg) showBoot(); });
    setTimeout(function () { ($('lg-u').value ? $('lg-p') : $('lg-u')).focus(); }, 80);
  }
  function showBoot() { $('lg-sign').style.display = 'none'; $('lg-boot').style.display = ''; setTimeout(function () { $('bt-n').focus(); }, 60); }
  $('lg-first').onclick = showBoot;
  $('lg-go').onclick = function () {
    var u = $('lg-u').value.trim(), p = $('lg-p').value; if (!u || !p) { $('lg-m').textContent = 'Enter your user ID and password.'; return; }
    $('lg-go').disabled = true; $('lg-go').textContent = 'Signing in…'; $('lg-m').textContent = '';
    B.signIn(u, p).then(function () { try { localStorage.setItem('bst_last_user', u); } catch (e) {} afterLogin(); })
      .catch(function (e) { $('lg-m').textContent = e.message; }).then(function () { $('lg-go').disabled = false; $('lg-go').textContent = 'Sign in'; });
  };
  $('lg-p').onkeydown = function (e) { if (e.key === 'Enter') $('lg-go').click(); };
  $('lg-u').onkeydown = function (e) { if (e.key === 'Enter') $('lg-p').focus(); };
  $('bt-go').onclick = function () {
    if ($('bt-p').value !== $('bt-p2').value) { $('bt-m').textContent = 'The two passwords are not the same.'; return; }
    $('bt-go').disabled = true; $('bt-m').textContent = '';
    B.bootstrap($('bt-n').value.trim(), $('bt-u').value, $('bt-p').value).then(function () { try { localStorage.setItem('bst_last_user', $('bt-u').value.trim().toLowerCase()); } catch (e) {} afterLogin(); })
      .catch(function (e) { $('bt-m').textContent = e.message; }).then(function () { $('bt-go').disabled = false; });
  };

  // ---------------------------------------------------------------- after sign-in: sections by rights
  function afterLogin() {
    var me = B.me(); $('login').style.display = 'none';
    PW.eg = B.can('egView') ? 'session' : ''; PW.rx = B.can('gView') ? 'session' : '';
    LOADED = { eg: false, rx: false }; ADMIN = false; APW = ''; document.body.classList.remove('admin');
    label(); $('hm-lock').textContent = 'Sign out (' + (me.name || me.userId) + ')';
    if (PW.eg && !PW.rx) { enterSec('eg'); return; } if (PW.rx && !PW.eg) { enterSec('rx'); return; }
    showHome();
  }
  window.homeRender = function () { ['eg', 'rx'].forEach(function (s) { $('hc-' + s).classList.toggle('ok', !!PW[s]); $('hc-' + s).style.opacity = PW[s] ? '' : '.55';
    $('hs-' + s).textContent = PW[s] ? '🔓 Click to open' : '⛔ No access for your user ID'; }); };
  window.pick = function (sec) { HSEL = sec; $('home').style.display = 'flex'; $('hp').style.display = 'block'; $('hp-t').textContent = SECNAME[sec];
    document.querySelector('#hp .hm-row').style.display = 'none'; $('hp-m').textContent = 'Your user ID does not have access to this section. Ask your admin to give you the "view" right.'; };
  window.savePw = function (sec, pw) { PW[sec] = pw; };
  var _enter = window.enterSec;
  window.enterSec = function (sec) {
    if (!PW[sec]) { pick(sec); return; }
    window.CURSEC = sec; var edit = B.can(sec === 'eg' ? 'egEdit' : 'gEdit') || (sec === 'eg' && B.can('mxEdit')) || B.can('inspEdit');
    ADMIN = !!edit; APW = edit ? 'session' : ''; document.body.classList.toggle('admin', ADMIN);
    document.body.classList.toggle('nodel', !B.can(sec === 'eg' ? 'egDel' : 'gDel'));
    _enter(sec); label();
  };
  window.setAdmin = function () { label(); };
  window.adminOut = function () { label(); };
  function label() { var me = B.me(); $('adm').textContent = me ? '👤 ' + (me.name || me.userId) : '👤 Account'; $('adm').title = 'My account, users and settings'; }
  $('adm').onclick = openAccount;
  $('hm-lock').insertAdjacentHTML('beforebegin', '<div><button id="hm-acc" class="hm-lk" type="button" style="text-decoration:none;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:6px 14px;color:#fff">👤 My account · users · settings</button></div>');
  $('hm-acc').onclick = openAccount;
  $('hm-lock').onclick = function () { if (!confirm('Sign out of the tracker on this device?')) return; signOut(); };
  function signOut() { B.signOut().then(function () { PW.eg = PW.rx = ''; LOADED = { eg: false, rx: false }; E = null; D = { stages: [], sizes: [], units: [], payments: [], shipments: [], items: [], containers: [], today: '', months: [] }; ADMIN = false; document.body.classList.remove('admin'); showLogin('You are signed out.'); }); }

  // ---------------------------------------------------------------- my account
  function rightsChips(r) { r = r || {}; if (r.admin) return '<span class="rch a">Full admin</span>';
    var l = B.rights.filter(function (x) { return x[0] !== 'admin' && r[x[0]]; }); return l.length ? l.map(function (x) { return '<span class="rch">' + esc(x[1]) + '</span>'; }).join('') : '<span class="mu">No rights yet</span>'; }
  function openAccount() { var me = B.me(); if (!me) return;
    $('ac-n').innerHTML = esc(me.name || me.userId) + (B.mode === 'demo' ? '<span class="mbadge">Demo mode</span>' : '');
    $('ac-u').textContent = 'User ID: ' + me.userId; $('ac-r').innerHTML = rightsChips(me.rights);
    $('ac-b').innerHTML = '<button type="button" id="ac-cp">🔑 Change my password</button>' + (B.can('users') ? '<button type="button" id="ac-us">👥 Users &amp; rights</button>' : '') +
      (B.can('settings') ? '<button type="button" id="ac-st">⚙️ Settings, import &amp; backup</button>' : '') + '<button type="button" id="ac-home">⌂ Sections</button><button type="button" id="ac-out">Sign out</button>';
    $('ac-pw').style.display = 'none'; show('ovacc');
    $('ac-cp').onclick = function () { $('ac-pw').style.display = ''; $('pw-m').textContent = ''; $('pw-o').focus(); };
    if ($('ac-us')) $('ac-us').onclick = function () { hide('ovacc'); openUsers(); };
    if ($('ac-st')) $('ac-st').onclick = function () { hide('ovacc'); openSettings(); };
    $('ac-home').onclick = function () { hide('ovacc'); showHome(); };
    $('ac-out').onclick = function () { hide('ovacc'); signOut(); };
  }
  $('pw-go').onclick = function () { if ($('pw-n').value !== $('pw-n2').value) { $('pw-m').textContent = 'The new passwords are not the same.'; return; }
    $('pw-go').disabled = true; B.call('changeMyPassword', $('pw-o').value, $('pw-n').value).then(function () { $('pw-m').textContent = '✓ Password changed.'; $('pw-o').value = $('pw-n').value = $('pw-n2').value = ''; })
      .catch(function (e) { $('pw-m').textContent = e.message; }).then(function () { $('pw-go').disabled = false; }); };

  // ---------------------------------------------------------------- users & rights
  var USERS = [];
  function openUsers() { show('ovusr'); $('us-f').style.display = 'none'; $('us-l').innerHTML = '<tr><td colspan="5" class="mu">Loading…</td></tr>';
    B.call('listUsers').then(function (l) { USERS = l; drawUsers(); }).catch(function (e) { $('us-l').innerHTML = '<tr><td colspan="5" class="late">' + esc(e.message) + '</td></tr>'; }); }
  function drawUsers() { $('us-l').innerHTML = USERS.map(function (u, i) { return '<tr class="' + (u.active ? '' : 'off') + '"><td><b>' + esc(u.name) + '</b></td><td>' + esc(u.userId) + '</td><td>' + rightsChips(u.rights) + '</td><td>' +
    (u.active ? '<span class="chip cg">Active</span>' : '<span class="chip cr">Switched off</span>') + '</td><td><button type="button" class="sm" data-ued="' + i + '">Edit</button></td></tr>'; }).join('') || '<tr><td colspan="5" class="mu">No users.</td></tr>'; }
  function userForm(u) { var isNew = !u; u = u || { name: '', userId: '', rights: { egView: true, gView: true }, active: true }; var me = B.me();
    $('us-f').style.display = ''; $('us-f').innerHTML = '<h3>' + (isNew ? 'Add a user' : 'Edit ' + esc(u.name)) + '</h3><div class="g" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
      '<label>Name<input id="uf-n" value="' + esc(u.name) + '" placeholder="e.g. Abdul Nasar"></label><label>User ID' + (isNew ? '' : ' (cannot change)') + '<input id="uf-u" value="' + esc(u.userId) + '"' + (isNew ? ' placeholder="e.g. nasar"' : ' disabled') + ' autocapitalize="none"></label>' +
      (isNew ? '<label>Password (at least 6)<input id="uf-p" type="text" autocomplete="off" placeholder="Give this to the person"></label>' : '<label>Status<select id="uf-a"><option value="1"' + (u.active ? ' selected' : '') + '>Active</option><option value="0"' + (u.active ? '' : ' selected') + '>Switched off (no access)</option></select></label>') +
      '</div><div style="margin-top:10px;font-weight:700;font-size:13px">Rights</div><div class="rg">' + B.rights.map(function (r) { var dis = r[0] === 'admin' && !(me.rights && me.rights.admin);
        return '<label><input type="checkbox" data-r="' + r[0] + '"' + (u.rights && u.rights[r[0]] ? ' checked' : '') + (dis ? ' disabled' : '') + '>' + esc(r[1]) + '</label>'; }).join('') + '</div>' +
      '<div class="mu" style="margin-top:6px">Tip: "add &amp; edit" works best together with "view" of the same section. A full admin has every right.</div>' +
      (isNew ? '' : '<div class="mu" style="margin-top:6px">To change this person\'s password: switch this user off and create a new user ID, or ask them to use "Change my password" after signing in.</div>') +
      '<div class="ab"><button class="p" id="uf-s" type="button">' + (isNew ? 'Create user' : 'Save changes') + '</button><button type="button" id="uf-c">Cancel</button><span class="mu" id="uf-m" style="align-self:center"></span></div>';
    $('uf-c').onclick = function () { $('us-f').style.display = 'none'; };
    $('uf-s').onclick = function () { var r = {}; document.querySelectorAll('#us-f [data-r]').forEach(function (c) { if (c.checked) r[c.dataset.r] = true; });
      $('uf-s').disabled = true; $('uf-m').textContent = 'Saving…';
      var p = isNew ? B.call('createUser', { name: $('uf-n').value.trim(), userId: $('uf-u').value.trim(), password: $('uf-p').value, rights: r })
        : B.call('updateUser', { uid: u.uid, name: $('uf-n').value.trim(), rights: r, active: $('uf-a').value === '1' });
      p.then(function () { $('us-f').style.display = 'none'; if (isNew) alert('User created.\n\nUser ID: ' + $('uf-u').value.trim().toLowerCase() + '\nPassword: ' + $('uf-p').value + '\n\nGive these to the person. They can change the password after signing in.'); openUsers(); })
        .catch(function (e) { $('uf-m').textContent = e.message; $('uf-s').disabled = false; }); };
    setTimeout(function () { (isNew ? $('uf-n') : $('uf-n')).focus(); }, 50); }
  $('us-add').onclick = function () { userForm(null); };
  $('us-l').addEventListener('click', function (e) { var b = e.target.closest('[data-ued]'); if (b) userForm(USERS[+b.dataset.ued]); });

  // ---------------------------------------------------------------- settings, import, backup
  var EGL = [['po', 'Supplier PO status'], ['supPay', 'Supplier payment'], ['frPay', 'Freight payment'], ['loading', 'Loading & dispatch'], ['ksa', 'KSA border'], ['ghu', 'Ghuwaifat border'], ['wh', 'Warehouse delivery'], ['purchase', 'Purchase entry']];
  var RXL = [['stages', 'Stages (in order)'], ['sizes', 'Container sizes'], ['units', 'Units'], ['payments', 'Payment stages']];
  function openSettings() { show('ovset'); $('st-b').innerHTML = '<div class="mu">Loading…</div>';
    B.call('getSettings').then(function (s) { var lines = function (a) { return esc((a || []).join('\n')); };
      var mons = (s.egMonths || []).slice();
      $('st-b').innerHTML = '<div class="us"><h3>Egypt</h3><div class="g" style="grid-template-columns:1fr 2fr"><label>Transit days (Egypt dispatch → UAE arrival)<input id="st-td" type="number" min="0" max="90" value="' + esc(s.transitDays) + '"></label>' +
        '<div><div style="font-size:12.5px;font-weight:600">Month tabs</div><div id="st-mo" style="margin-top:6px">' + mons.map(function (m) { return '<span class="rch">' + esc(m) + '</span>'; }).join('') + '</div><button type="button" id="st-nm" style="margin-top:6px">+ Add next month</button></div></div>' +
        '<div style="font-size:12.5px;font-weight:600;margin-top:10px">Dropdown lists (one option per line)</div><div class="sg" style="margin-top:6px">' + EGL.map(function (l) { return '<label>' + l[1] + '<textarea data-egl="' + l[0] + '">' + lines(s.egLists[l[0]]) + '</textarea></label>'; }).join('') + '</div></div>' +
        '<div class="us"><h3>Global import</h3><div class="sg">' + RXL.map(function (l) { return '<label>' + l[1] + '<textarea data-rxl="' + l[0] + '">' + lines(s.rx[l[0]]) + '</textarea></label>'; }).join('') + '</div></div>' +
        '<div class="ab"><button class="p" id="st-sv" type="button">Save settings</button><span class="mu" id="st-m" style="align-self:center"></span></div>' +
        '<div class="us"><h3>Import data</h3><div class="mu">Bring in the file made by <b>exportForNewApp</b> in the old Google Apps Script, or a backup file from this app.</div>' +
        '<div class="ab"><input type="file" id="im-f" accept=".json,application/json"><label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="im-r" style="width:auto"> Replace all existing shipments, containers, inspections and payments</label></div>' +
        '<div class="ab"><button class="p" id="im-go" type="button">Import</button><span class="mu" id="im-m" style="align-self:center"></span></div></div>' +
        '<div class="us"><h3>Backup</h3><div class="mu">Download everything as one file. Keep it safe: it can be imported back here at any time.</div><div class="ab"><button type="button" id="bk-go">⬇ Download backup</button><span class="mu" id="bk-m" style="align-self:center"></span></div></div>' +
        (B.mode === 'demo' ? '<div class="lg-demo"><b>Demo mode.</b> Data is saved only on this device until Firebase is connected (js/config.js).</div>' : '');
      $('st-nm').onclick = function () { var M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], last = mons[mons.length - 1] || (M[new Date().getMonth()] + ' ' + new Date().getFullYear()), p = last.split(' '),
        mi = M.indexOf(p[0]) + 1, y = Number(p[1]); if (!mons.length) mi--; if (mi > 11) { mi = 0; y++; } var n = M[mi] + ' ' + y; if (mons.indexOf(n) < 0) mons.push(n);
        $('st-mo').innerHTML = mons.map(function (m) { return '<span class="rch">' + esc(m) + '</span>'; }).join(''); $('st-m').textContent = 'Added ' + n + '. Click Save settings.'; };
      $('st-sv').onclick = function () { var x = { transitDays: $('st-td').value, egMonths: mons, egLists: {}, rx: {} }, split = function (t) { return t.value.split('\n').map(function (v) { return v.trim(); }).filter(Boolean); };
        document.querySelectorAll('[data-egl]').forEach(function (t) { x.egLists[t.dataset.egl] = split(t); }); document.querySelectorAll('[data-rxl]').forEach(function (t) { x.rx[t.dataset.rxl] = split(t); });
        if (!x.rx.stages.length) { $('st-m').textContent = 'The stage list cannot be empty.'; return; }
        $('st-sv').disabled = true; B.call('saveSettings', x).then(function () { $('st-m').textContent = '✓ Saved.'; reloadData(); }).catch(function (e) { $('st-m').textContent = e.message; }).then(function () { $('st-sv').disabled = false; }); };
      $('im-go').onclick = function () { var f = $('im-f').files[0]; if (!f) { $('im-m').textContent = 'Choose the file first.'; return; } var rep = $('im-r').checked;
        if (rep && !confirm('Replace ALL existing data with the data in this file?')) return; var rd = new FileReader();
        rd.onload = function () { var j; try { j = JSON.parse(rd.result); } catch (e) { $('im-m').textContent = 'This file is not valid JSON.'; return; }
          $('im-go').disabled = true; $('im-m').textContent = 'Importing…';
          B.call('importData', j, rep).then(function (r) { $('im-m').textContent = '✓ Imported ' + r.eg + ' Egypt containers, ' + r.rx + ' shipments, ' + r.insp + ' inspections, ' + r.matex + ' payments' + (r.removed ? ' (' + r.removed + ' old records replaced)' : '') + '.'; reloadData(); })
            .catch(function (e) { $('im-m').textContent = e.message; }).then(function () { $('im-go').disabled = false; }); };
        rd.readAsText(f); };
      $('bk-go').onclick = function () { $('bk-m').textContent = 'Preparing…'; B.call('exportBackup').then(function (j) { var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(j, null, 1)], { type: 'application/json' })); a.download = 'bst-tracker-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); a.remove(); $('bk-m').textContent = '✓ Downloaded.'; }).catch(function (e) { $('bk-m').textContent = e.message; }); };
    }).catch(function (e) { $('st-b').innerHTML = '<div class="late">' + esc(e.message) + '</div>'; }); }
  function reloadData() { if (LOADED.eg) loadEg(); if (LOADED.rx) loadRx(); }

  // ---------------------------------------------------------------- start
  window.BSTUI = { showLogin: showLogin, account: openAccount, users: openUsers, settings: openSettings };
  try { $('lg-u').value = localStorage.getItem('bst_last_user') || ''; } catch (e) {}
  B.start().then(function (me) { if (me) afterLogin(); else showLogin(); }).catch(function (e) { showLogin(e.message); });
})();
