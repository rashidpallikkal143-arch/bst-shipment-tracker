// BST Shipment Tracker: daily automatic backup.
// Runs on GitHub Actions. Signs in as the read-only app user "backup-bot", reads every collection and writes one JSON file
// in the same format as "Download backup" in the app (so "Import data" can restore it). The workflow then encrypts it.
import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

const BOT = (process.env.BACKUP_BOT_ID || 'backup-bot').toLowerCase(), PW = process.env.BACKUP_BOT_PASSWORD, OUT = process.env.OUT || 'backup.json';
if (!PW) { console.log('Automatic backup is not set up yet: add the GitHub secrets BACKUP_BOT_PASSWORD and BACKUP_PASSWORD.'); fs.writeFileSync('.skip', '1'); process.exit(0); }
const win = {}; new Function('window', fs.readFileSync(new URL('../../web/js/config.js', import.meta.url), 'utf8'))(win);
const app = initializeApp(win.BST_FIREBASE_CONFIG), db = getFirestore(app), DOMAIN = win.BST_LOGIN_DOMAIN || 'users.bst-tracker.app';

const all = async (q, label) => { try { const sn = await getDocs(q); return sn.docs.map(d => Object.assign({ _id: d.id }, d.data())); }
  catch (e) { throw new Error(label + ': ' + (e.code || e.message)); } };

async function main() {
  const lg = await getDoc(doc(db, 'logins', BOT)).catch(() => null);
  const email = lg && lg.exists() && lg.data().email ? lg.data().email : BOT + '@' + DOMAIN;
  await signInWithEmailAndPassword(getAuth(app), email, PW).catch(e => { throw new Error('signing in as ' + BOT + ': ' + (e.code || e.message)); });
  const st = await getDoc(doc(db, 'settings', 'main'));
  const out = { format: 'bst-app-backup', version: 1, exportedAt: new Date().toISOString(), automatic: true, settings: st.exists() ? st.data() : {},
    eg: await all(collection(db, 'eg'), 'Egypt (backup-bot needs "Egypt: view")'),
    rx: await all(collection(db, 'rx'), 'Global import (backup-bot needs "Global import: view")'),
    insp: (await all(query(collection(db, 'insp'), where('sc', '==', 'eg')), 'Egypt inspections')).concat(await all(query(collection(db, 'insp'), where('sc', '==', 'rx')), 'Global inspections')),
    matex: await all(collection(db, 'matex'), 'Matex payments (backup-bot needs "Matex payments: view")') };
  // users, rights and history are saved for the record (passwords are never included; Import does not change users)
  out.users = await all(collection(db, 'users'), 'users').catch(e => { console.log('Note: users not included (' + e.message + ')'); return []; });
  out.activity = await all(collection(db, 'activity'), 'activity').catch(e => { console.log('Note: activity history not included (' + e.message + ')'); return []; });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  fs.writeFileSync('summary.txt', `Egypt ${out.eg.length} · Global import ${out.rx.length} · inspections ${out.insp.length} · Matex ${out.matex.length} · users ${out.users.length}`);
  console.log(`Backup ready: Egypt ${out.eg.length} · Global import ${out.rx.length} · inspections ${out.insp.length} · Matex ${out.matex.length} · users ${out.users.length} · history lines ${out.activity.length}`);
}
main().then(() => process.exit(0), e => { console.error('Backup failed while ' + e.message); process.exit(1); });
