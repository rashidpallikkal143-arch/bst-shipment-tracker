// One-off check: how many AIS position messages aisstream.io delivers for a few sea areas in 90 seconds.
const KEY = process.env.AISSTREAM_KEY, AREAS = {
  'UAE / Jebel Ali': [[24.6, 54.6], [25.5, 55.6]], 'Strait of Hormuz': [[25.8, 55.8], [27.0, 57.2]], 'Karachi': [[24.4, 66.6], [25.2, 67.4]],
  'Mundra / Kandla': [[22.4, 69.4], [23.2, 70.4]], 'Mumbai / JNPT': [[18.6, 72.6], [19.2, 73.1]], 'Arabian Sea (open)': [[12, 60], [20, 68]],
  'Singapore': [[1.0, 103.5], [1.5, 104.2]] };
const n = {}; Object.keys(AREAS).forEach(k => n[k] = new Set());
const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
ws.onopen = () => ws.send(JSON.stringify({ APIKey: KEY, BoundingBoxes: Object.values(AREAS), FilterMessageTypes: ['PositionReport'] }));
ws.onmessage = async e => { const t = typeof e.data === 'string' ? e.data : Buffer.from(await e.data.arrayBuffer()).toString(); try { const j = JSON.parse(t), m = j.MetaData;
  for (const [k, [a, b]] of Object.entries(AREAS)) if (m.latitude >= a[0] && m.latitude <= b[0] && m.longitude >= a[1] && m.longitude <= b[1]) n[k].add(m.MMSI); } catch (x) {} };
setTimeout(() => { ws.close(); for (const k in n) console.log(`COVERAGE ${k}: ${n[k].size} ships seen in 90 s`); process.exit(0); }, 90000);
