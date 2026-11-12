// BST Shipment Tracker: live ship positions.
// Runs on GitHub Actions every ~15 minutes. Signs in as the app user "ais-bot", reads the open shipments that have an
// MMSI or IMO number, listens to aisstream.io for a few minutes and saves the latest position, speed, course, destination
// and a short track of each ship in the Firestore collection "vessels". The app shows them on the real map.
import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

const KEY = process.env.AISSTREAM_KEY, BOT = (process.env.AIS_BOT_ID || 'ais-bot').toLowerCase(), PW = process.env.AIS_BOT_PASSWORD;
const LISTEN = Math.max(30, Number(process.env.LISTEN_SECONDS || 270)) * 1000;
if (!KEY || !PW) { console.log('Live ship tracking is not set up yet: add the GitHub secrets AISSTREAM_KEY and AIS_BOT_PASSWORD.'); process.exit(0); }

// Firebase settings are the same public values the website uses
const win = {}; new Function('window', fs.readFileSync(new URL('../../web/js/config.js', import.meta.url), 'utf8'))(win);
const app = initializeApp(win.BST_FIREBASE_CONFIG), db = getFirestore(app), DOMAIN = win.BST_LOGIN_DOMAIN || 'users.bst-tracker.app';

const isDone = s => /deliver|purchase|cancel/i.test(s.stage || '') || !!s.whDate;
const toIso = t => { const m = String(t || '').match(/^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d:\d\d)/); return m ? m[1] + 'T' + m[2] + 'Z' : new Date().toISOString(); };
const km = (a, b) => { const R = Math.PI / 180, x = (b[1] - a[1]) * R * Math.cos((a[0] + b[0]) / 2 * R), y = (b[0] - a[0]) * R; return Math.sqrt(x * x + y * y) * 6371; };

async function main() {
  const lg = await getDoc(doc(db, 'logins', BOT)).catch(() => null);
  const email = lg && lg.exists() && lg.data().email ? lg.data().email : BOT + '@' + DOMAIN;
  let step = 'signing in as ' + BOT;
  const fail = e => { e.step = step; throw e; };
  await signInWithEmailAndPassword(getAuth(app), email, PW).catch(fail);

  // open shipments with a ship number
  const seen = new Map();
  step = 'reading shipments (ais-bot needs the right "Global import: view")';
  for (const f of ['mmsi', 'imo']) (await getDocs(query(collection(db, 'rx'), where(f, '>', ''))).catch(fail)).forEach(d => seen.set(d.id, d.data()));
  const ships = [...seen.values()].filter(s => !isDone(s)).map(s => ({ mmsi: String(s.mmsi || '').replace(/\D/g, ''), imo: String(s.imo || '').replace(/\D/g, ''), name: s.vessel || '' }))
    .filter(s => /^\d{9}$/.test(s.mmsi) || /^\d{7}$/.test(s.imo));
  step = 'reading saved ship positions (publish the latest firestore.rules in Firebase)';
  const vdocs = new Map(); (await getDocs(collection(db, 'vessels')).catch(fail)).forEach(d => vdocs.set(d.id, d.data()));
  const imoToMmsi = {}; vdocs.forEach((v, id) => { if (v.imo) imoToMmsi[v.imo] = id; });
  const want = new Map();                       // mmsi -> {imo, name}
  const unknownImo = new Set();
  ships.forEach(s => { const m = /^\d{9}$/.test(s.mmsi) ? s.mmsi : imoToMmsi[s.imo]; if (m) want.set(m, { imo: s.imo || (vdocs.get(m) || {}).imo || '', name: s.name }); else unknownImo.add(s.imo); });
  console.log(`Open shipments with a ship number: ${ships.length} · ships to follow: ${want.size} · IMO numbers still being matched: ${unknownImo.size}`);
  if (!want.size && !unknownImo.size) return;

  const got = new Map();                        // mmsi -> collected data
  const rec = m => { if (!got.has(m)) got.set(m, {}); return got.get(m); };
  const text = async e => typeof e.data === 'string' ? e.data : Buffer.from(e.data instanceof ArrayBuffer ? e.data : await e.data.arrayBuffer()).toString();
  const WORLD = [[[-90, -180], [90, 180]]];
  let posWs = null;
  const subPos = () => { const ids = [...want.keys()].slice(0, 200); if (!ids.length) return;
    const msg = JSON.stringify({ APIKey: KEY, BoundingBoxes: WORLD, FiltersShipMMSI: ids, FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData'] });
    if (posWs && posWs.readyState === 1) posWs.send(msg); else if (!posWs) open(msg, onPos).then(w => { posWs = w; }); };
  function open(sub, handler) { return new Promise(res => { const w = new WebSocket('wss://stream.aisstream.io/v0/stream');
    w.onopen = () => { w.send(sub); res(w); };
    w.onmessage = async e => { try { handler(JSON.parse(await text(e))); } catch (x) { } };
    w.onerror = e => console.log('aisstream connection problem', e && e.message || ''); w.onclose = () => {}; }); }
  function onStatic(m, st) { const r = rec(m); r.name = (st.Name || '').trim() || r.name; r.dest = (st.Destination || '').trim(); if (st.ImoNumber) r.imo = String(st.ImoNumber);
    const e = st.Eta || {}; if (e.Month && e.Day) r.eta = String(e.Month).padStart(2, '0') + '-' + String(e.Day).padStart(2, '0') + ' ' + String(e.Hour ?? 0).padStart(2, '0') + ':' + String(e.Minute ?? 0).padStart(2, '0'); }
  function onPos(j) { const md = j.MetaData || {}, m = String(md.MMSI || ''), M = j.Message || {}; if (!want.has(m)) return;
    if (j.MessageType === 'ShipStaticData') return onStatic(m, M.ShipStaticData || {});
    const p = M.PositionReport || M.StandardClassBPositionReport || M.ExtendedClassBPositionReport; if (!p) return;
    const lat = Number(p.Latitude ?? md.latitude), lon = Number(p.Longitude ?? md.longitude); if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return;
    const r = rec(m); r.name = r.name || (md.ShipName || '').trim(); (r.pts = r.pts || []).push([+lat.toFixed(5), +lon.toFixed(5), toIso(md.time_utc)]);
    Object.assign(r, { lat, lon, speed: p.Sog != null && p.Sog < 102.3 ? +Number(p.Sog).toFixed(1) : null, course: p.Cog != null && p.Cog < 360 ? +Number(p.Cog).toFixed(1) : null,
      heading: p.TrueHeading != null && p.TrueHeading < 360 ? p.TrueHeading : null, navstat: p.NavigationalStatus ?? null, ts: toIso(md.time_utc) }); }
  // ships known only by IMO: watch the ships' own identity broadcasts to learn their MMSI
  if (unknownImo.size) open(JSON.stringify({ APIKey: KEY, BoundingBoxes: WORLD, FilterMessageTypes: ['ShipStaticData'] }), j => {
    const st = (j.Message || {}).ShipStaticData || {}, imo = String(st.ImoNumber || ''); if (!unknownImo.has(imo)) return;
    const m = String((j.MetaData || {}).MMSI || ''); if (!/^\d{9}$/.test(m)) return;
    unknownImo.delete(imo); want.set(m, { imo, name: st.Name || '' }); onStatic(m, st); console.log(`Matched IMO ${imo} to MMSI ${m}`); setTimeout(subPos, 1100); })
    .then(w => setTimeout(() => w.close(), LISTEN));
  subPos();
  await new Promise(r => setTimeout(r, LISTEN));
  if (posWs) posWs.close();

  // save
  const now = new Date().toISOString(); let saved = 0;
  for (const [m, w] of want) { const r = got.get(m), old = vdocs.get(m) || {};
    if (!r && old.imo === w.imo && old.mmsi) continue;
    const out = { mmsi: m, imo: (r && r.imo) || w.imo || old.imo || '', name: (r && r.name) || old.name || w.name || '', checked: now };
    if (r) { ['dest', 'eta'].forEach(k => { if (r[k]) out[k] = r[k]; });
      if (r.ts) { Object.assign(out, { lat: r.lat, lon: r.lon, speed: r.speed, course: r.course, heading: r.heading, navstat: r.navstat, ts: r.ts });
        let tr = Array.isArray(old.track) ? old.track.slice() : [];
        (r.pts || []).forEach(p => { const l = tr[tr.length - 1]; if (!l || km(l, p) > 0.4 || (Date.parse(p[2]) - Date.parse(l[2])) > 30 * 60e3) tr.push(p); });
        out.track = tr.slice(-400); } }
    await setDoc(doc(db, 'vessels', m), out, { merge: true }); saved++;
    console.log(`${m} ${out.name}: ${r && r.ts ? `position ${out.lat.toFixed(3)}, ${out.lon.toFixed(3)} at ${out.ts}, ${out.speed ?? '-'} kn` : 'no new position this round'}`); }
  // forget ships no longer needed (kept 30 days after the last open shipment)
  for (const [id, v] of vdocs) if (!want.has(id) && !(v.imo && [...unknownImo].includes(v.imo)) && Date.now() - Date.parse(v.checked || 0) > 30 * 864e5) await deleteDoc(doc(db, 'vessels', id)).catch(() => {});
  console.log(`Saved ${saved} ship(s).`);
}
main().then(() => process.exit(0), e => { console.error('Live ship tracking failed while ' + (e && e.step || 'saving') + ':', e && (e.code || e.message) || e); process.exit(1); });
