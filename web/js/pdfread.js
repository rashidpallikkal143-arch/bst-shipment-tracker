/* BST Shipment Tracker: read text out of PDF files and scanned images (photos, WhatsApp scans).
   Text PDFs are read with pdf.js; pages without text and images are read with OCR (tesseract.js).
   Result: lines of text cells with their positions, for the purchase-order reader in extras.js. */
(function () {
  'use strict';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  var loaded = {};
  function script(src) { if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { loaded[src] = null; rej(new Error('A reading tool could not be loaded. Check the internet connection.')); }; document.head.appendChild(s); });
    return loaded[src]; }
  function pdfjs() { return script(PDFJS + 'pdf.min.js').then(function () { var p = window.pdfjsLib; p.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; return p; }); }
  var worker = null;
  function ocrWorker(progress) { if (worker) { worker.say = progress; return worker; }
    worker = script(TESS).then(function () { return window.Tesseract.createWorker('eng', 1, { logger: function (m) { if (worker.say && m && m.status === 'recognizing text') worker.say('Reading the scan… ' + Math.round((m.progress || 0) * 100) + '%'); } }); })
      .then(function (w) { return w.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' }).then(function () { return w; }); })
      .catch(function (e) { worker = null; throw e; });
    worker.say = progress; return worker; }
  // grey and stretch the contrast: phone scans read much better
  function clean(cv) { try { var g = cv.getContext('2d'), im = g.getImageData(0, 0, cv.width, cv.height), d = im.data, h = new Array(256).fill(0), n = d.length / 4, i;
    for (i = 0; i < d.length; i += 4) { var y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0; d[i] = y; h[y]++; }
    var lo = 0, hi = 255, c = 0; while (lo < 255 && (c += h[lo]) < n * 0.02) lo++; c = 0; while (hi > 0 && (c += h[hi]) < n * 0.02) hi--; if (hi - lo < 30) { lo = 0; hi = 255; }
    for (i = 0; i < d.length; i += 4) { var v = Math.max(0, Math.min(255, (d[i] - lo) * 255 / (hi - lo))); d[i] = d[i + 1] = d[i + 2] = v; }
    g.putImageData(im, 0, 0); } catch (e) {} return cv; }

  // group positioned words into lines, and words into cells where the gap is wide
  function toLines(words, gapFactor) {
    words = words.filter(function (w) { return w.t && w.t.trim(); }).sort(function (a, b) { return a.y - b.y || a.x0 - b.x0; });
    var lines = [];
    words.forEach(function (w) { var h = w.h || 10, L = lines[lines.length - 1];
      if (L && Math.abs(L.y - w.y) <= Math.max(3, h * 0.55)) L.words.push(w); else lines.push({ y: w.y, h: h, words: [w] }); });
    return lines.map(function (L) { L.words.sort(function (a, b) { return a.x0 - b.x0; });
      var cw = L.words.reduce(function (s, w) { return s + (w.x1 - w.x0) / Math.max(1, w.t.length); }, 0) / L.words.length || 5;
      var cells = [];
      L.words.forEach(function (w) { var c = cells[cells.length - 1];
        if (c && w.x0 - c.x1 < cw * (gapFactor || 1.6)) { c.t += (w.x0 - c.x1 > cw * 0.25 ? ' ' : '') + w.t; c.x1 = w.x1; } else cells.push({ x0: w.x0, x1: w.x1, t: w.t }); });
      cells.forEach(function (c) { c.t = c.t.replace(/\s+/g, ' ').trim(); });
      return { y: L.y, cells: cells.filter(function (c) { return c.t; }) }; }).filter(function (l) { return l.cells.length; });
  }
  function ocrCanvas(canvas, progress) { clean(canvas); return ocrWorker(progress).then(function (w) { return w.recognize(canvas); }).then(function (r) {
    var words = []; ((r.data && r.data.words) || []).forEach(function (x) { if (x.confidence < 30 && !/\w/.test(x.text)) return; words.push({ t: x.text, x0: x.bbox.x0, x1: x.bbox.x1, y: (x.bbox.y0 + x.bbox.y1) / 2, h: x.bbox.y1 - x.bbox.y0 }); });
    return toLines(words, 1.4); }); }
  function readPdf(buf, progress) {
    return pdfjs().then(function (P) { return P.getDocument({ data: buf }).promise; }).then(function (doc) {
      var n = Math.min(doc.numPages, 6), pages = [], pageOcr = [], usedOcr = false, i = 1;
      var next = function () { if (i > n) return Promise.resolve({ pages: pages, pageOcr: pageOcr, ocr: usedOcr, pageCount: doc.numPages });
        var pn = i++; if (progress) progress('Reading page ' + pn + ' of ' + n + '…');
        return doc.getPage(pn).then(function (pg) { return pg.getTextContent().then(function (tc) {
          var vp = pg.getViewport({ scale: 1 }), words = [];
          tc.items.forEach(function (it) { if (!it.str || !it.str.trim()) return; var x = it.transform[4], y = vp.height - it.transform[5], fh = Math.hypot(it.transform[2], it.transform[3]) || 10;
            words.push({ t: it.str, x0: x, x1: x + (it.width || it.str.length * fh * 0.5), y: y - fh / 2, h: fh }); });
          var chars = words.reduce(function (s, w) { return s + w.t.trim().length; }, 0);
          if (chars > 40) { pages.push(toLines(words, 1.8)); pageOcr.push(false); return; }
          // scanned page: draw it and read it with OCR
          usedOcr = true; var v2 = pg.getViewport({ scale: 2.2 }), cv = document.createElement('canvas'); cv.width = v2.width; cv.height = v2.height;
          return pg.render({ canvasContext: cv.getContext('2d'), viewport: v2 }).promise.then(function () { return ocrCanvas(cv, progress); }).then(function (l) { pages.push(l); pageOcr.push(true); }); }); }).then(next); };
      return next(); }); }
  function readImage(blob, progress) {
    return new Promise(function (res, rej) { var img = new Image(); img.onload = function () { res(img); }; img.onerror = function () { rej(new Error('This image could not be opened.')); }; img.src = URL.createObjectURL(blob); })
      .then(function (img) { var k = Math.min(2.5, Math.max(1, 2400 / Math.max(img.width, img.height))), cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k;
        var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(img.src);
        return ocrCanvas(cv, progress).then(function (l) { return { pages: [l], pageOcr: [true], ocr: true, pageCount: 1 }; }); }); }
  window.BSTPDF = {
    isDoc: function (name) { return /\.(pdf|png|jpe?g|webp|bmp|gif)$/i.test(name || ''); },
    read: function (file, progress) { return file.arrayBuffer().then(function (buf) { return /\.pdf$/i.test(file.name) ? readPdf(buf, progress) : readImage(new Blob([buf], { type: file.type || 'image/jpeg' }), progress); }); }
  };
})();
