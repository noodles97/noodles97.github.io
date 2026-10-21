import * as codecs from './codecs.js';

const FORMATS = {
  png: { label: 'PNG', ext: 'png', mime: 'image/png', alpha: true, hint: '무손실. 투명도를 유지합니다.' },
  jpeg: { label: 'JPEG', ext: 'jpg', mime: 'image/jpeg', quality: true, hint: '사진에 적합. 투명 영역은 배경색으로 채워집니다.' },
  webp: { label: 'WebP', ext: 'webp', mime: 'image/webp', alpha: true, quality: true, detect: true, hint: '같은 품질에서 JPEG보다 작습니다. 투명도를 유지합니다.' },
  avif: { label: 'AVIF', ext: 'avif', mime: 'image/avif', alpha: true, quality: true, detect: true, hint: '가장 작게 압축되지만 인코딩이 느리고 오래된 기기에서 열리지 않을 수 있습니다.' },
  gif: { label: 'GIF', ext: 'gif', mime: 'image/gif', alpha: 'binary', hint: '256색으로 줄어듭니다. 투명은 완전 투명한 픽셀만 유지됩니다.' },
  bmp: { label: 'BMP', ext: 'bmp', mime: 'image/bmp', hint: '압축 없는 24비트. 투명 영역은 배경색으로 채워집니다.' },
  tiff: { label: 'TIFF', ext: 'tif', mime: 'image/tiff', alpha: true, hint: '무손실(Deflate 압축). 투명도를 유지합니다.' },
  ico: { label: 'ICO', ext: 'ico', mime: 'image/x-icon', alpha: true, hint: '선택한 크기들을 한 파일에 담은 윈도우 아이콘. 정사각형이 아니면 여백이 투명으로 채워집니다.' },
  pdf: { label: 'PDF', ext: 'pdf', mime: 'application/pdf', quality: true, hint: '이미지 한 장을 JPEG로 담은 1페이지 PDF. 투명 영역은 배경색으로 채워집니다.' },
  svg: { label: 'SVG', ext: 'svg', mime: 'image/svg+xml', alpha: true, hint: '벡터로 바뀌는 것이 아니라 PNG를 SVG 안에 담습니다.' },
};
const MAX_DIM = 16384;
const STORAGE_KEY = 'image-converter:settings';

const $ = (sel) => document.querySelector(sel);
const els = {
  drop: $('#drop'), input: $('#file-input'), form: $('#settings'), format: $('#format'), quality: $('#quality'), qualityOut: $('#quality-out'),
  resize: $('#resize'), resizeValue: $('#resize-value'), background: $('#background'), backgroundOut: $('#background-out'),
  hint: $('#format-hint'), results: $('#results'), summary: $('#summary'), files: $('#files'), clear: $('#clear'), downloadAll: $('#download-all'),
};

/* ---------- 설정 ---------- */
function readSettings() {
  const fd = new FormData(els.form);
  return {
    format: fd.get('format'),
    quality: Number(fd.get('quality')) || 85,
    resize: fd.get('resize'),
    resizeValue: Math.max(1, Number(fd.get('resizeValue')) || 1),
    upscale: fd.get('upscale') === 'on',
    background: fd.get('background') || '#ffffff',
    dither: fd.get('dither') === 'on',
    pdfPage: fd.get('pdfPage'),
    icoSizes: fd.getAll('icoSizes').map(Number),
  };
}
function applySettings(s) {
  if (!s) return;
  if (s.format && FORMATS[s.format]) els.format.value = s.format;
  if (s.quality) els.quality.value = s.quality;
  if (s.resize) els.resize.value = s.resize;
  if (s.resizeValue) els.resizeValue.value = s.resizeValue;
  $('#upscale').checked = !!s.upscale;
  if (/^#[0-9a-f]{6}$/i.test(s.background || '')) els.background.value = s.background;
  $('#dither').checked = s.dither !== false;
  if (s.pdfPage) $('#pdf-page').value = s.pdfPage;
  if (Array.isArray(s.icoSizes)) for (const cb of els.form.querySelectorAll('input[name=icoSizes]')) cb.checked = s.icoSizes.includes(Number(cb.value));
}
function syncSettingsUI() {
  const s = readSettings();
  const fmt = FORMATS[s.format];
  const show = { quality: !!fmt.quality, background: !fmt.alpha || fmt.alpha === 'binary', dither: s.format === 'gif', pdfPage: s.format === 'pdf', icoSizes: s.format === 'ico', upscale: s.resize !== 'none' && s.resize !== 'percent' };
  for (const el of els.form.querySelectorAll('[data-for]')) el.hidden = !show[el.dataset.for];
  els.resizeValue.hidden = s.resize === 'none';
  if (s.resize === 'percent') { els.resizeValue.max = 1000; } else { els.resizeValue.max = MAX_DIM; }
  els.qualityOut.textContent = s.quality;
  els.backgroundOut.textContent = s.background;
  els.hint.textContent = fmt.hint;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* 저장 공간 없음 */ }
  return s;
}

async function canEncode(mime) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const blob = await new Promise((res) => c.toBlob(res, mime));
    return !!blob && blob.type === mime;
  } catch { return false; }
}
async function detectFormats() {
  for (const [key, fmt] of Object.entries(FORMATS)) {
    if (!fmt.detect) continue;
    fmt.supported = await canEncode(fmt.mime);
    const opt = els.format.querySelector(`option[value=${key}]`);
    if (!fmt.supported) { opt.disabled = true; opt.textContent += ' (이 브라우저 미지원)'; }
  }
  if (els.format.selectedOptions[0]?.disabled) els.format.value = 'png';
}

/* ---------- 워커 ---------- */
const workerReady = (async () => {
  if (typeof Worker === 'undefined') return null;
  try {
    const w = new Worker('./worker.js', { type: 'module' });
    const ok = await new Promise((res) => {
      w.onmessage = (e) => res(!!(e.data && e.data.pong));
      w.onerror = () => res(false);
      setTimeout(() => res(false), 8000);
      w.postMessage({ op: 'ping' });
    });
    if (!ok) { w.terminate(); return null; }
    w.onmessage = (e) => {
      const p = pending.get(e.data.id); if (!p) return;
      pending.delete(e.data.id);
      e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.result);
    };
    w.onerror = (e) => { for (const p of pending.values()) p.reject(new Error(e.message || '워커 오류')); pending.clear(); };
    return w;
  } catch { return null; }
})();
const pending = new Map();
let seq = 0;
function collectBuffers(value, out = new Set(), depth = 0) {
  if (depth > 4 || !value || typeof value !== 'object') return out;
  if (ArrayBuffer.isView(value)) { out.add(value.buffer); return out; }
  for (const v of Array.isArray(value) ? value : Object.values(value)) collectBuffers(v, out, depth + 1);
  return out;
}
async function runCodec(op, ...args) {
  const w = await workerReady;
  if (!w) return codecs[op](...args);
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, op, args }, [...collectBuffers(args)]);
  });
}

/* ---------- 디코드와 렌더 ---------- */
async function decode(file) {
  for (const opts of [{ imageOrientation: 'from-image' }, undefined]) {
    try {
      const bmp = await createImageBitmap(file, opts);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch { /* 옵션 미지원 브라우저는 옵션 없이, SVG·HEIC 등은 img 요소로 재시도 */ }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  try {
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('이 브라우저가 열 수 없는 형식입니다')); img.src = url; });
  } catch (e) { URL.revokeObjectURL(url); throw e; }
  const vector = /svg/i.test(file.type) || /\.svgz?$/i.test(file.name);
  return { source: img, width: img.naturalWidth || 1024, height: img.naturalHeight || 1024, vector, close: () => URL.revokeObjectURL(url) };
}

function targetSize(w, h, s) {
  let scale = 1;
  const v = s.resizeValue;
  if (s.resize === 'percent') scale = v / 100;
  else if (s.resize === 'long') scale = v / Math.max(w, h);
  else if (s.resize === 'width') scale = v / w;
  else if (s.resize === 'height') scale = v / h;
  if (s.resize !== 'none' && s.resize !== 'percent' && !s.upscale) scale = Math.min(scale, 1);
  const tw = Math.max(1, Math.round(w * scale)), th = Math.max(1, Math.round(h * scale));
  if (tw > MAX_DIM || th > MAX_DIM) throw new Error(`결과가 너무 큽니다 (${tw}×${th}). 크기 조절로 ${MAX_DIM}px 이하로 줄여 주세요.`);
  return [tw, th];
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다. 이미지가 너무 클 수 있습니다.');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  return [c, ctx];
}

function render(src, tw, th, background) {
  let cur = src.source, cw = src.width, ch = src.height;
  if (!src.vector) {
    // 절반씩 단계적으로 줄여야 축소 품질이 좋다.
    while (cw >= tw * 2 && ch >= th * 2) {
      const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
      const [c, ctx] = makeCanvas(nw, nh);
      ctx.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
      cur = c; cw = nw; ch = nh;
    }
  }
  const [canvas, ctx] = makeCanvas(tw, th);
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, tw, th); }
  ctx.drawImage(cur, 0, 0, cw, ch, 0, 0, tw, th);
  return [canvas, ctx];
}

function toBlob(canvas, mime, quality) {
  return new Promise((res, rej) => {
    try { canvas.toBlob((b) => (b ? res(b) : rej(new Error('이 형식으로 저장하지 못했습니다'))), mime, quality); } catch (e) { rej(e); }
  });
}
const blobBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());

async function encode(canvas, ctx, s) {
  const fmt = FORMATS[s.format];
  const q = s.quality / 100;
  const { width, height } = canvas;
  const imageData = () => { const d = ctx.getImageData(0, 0, width, height); return { width, height, data: d.data }; };
  switch (s.format) {
    case 'png': return toBlob(canvas, 'image/png');
    case 'jpeg': return toBlob(canvas, 'image/jpeg', q);
    case 'webp': case 'avif': {
      const blob = await toBlob(canvas, fmt.mime, q);
      if (blob.type !== fmt.mime) throw new Error(`${fmt.label} 저장을 이 브라우저가 지원하지 않습니다`);
      return blob;
    }
    case 'bmp': return new Blob([await runCodec('encodeBMP', imageData(), { background: s.background })], { type: fmt.mime });
    case 'tiff': return new Blob([await runCodec('encodeTIFF', imageData(), {})], { type: fmt.mime });
    case 'gif': return new Blob([await runCodec('encodeGIF', imageData(), { background: s.background, dither: s.dither })], { type: fmt.mime });
    case 'ico': {
      const sizes = s.icoSizes.length ? s.icoSizes : [256];
      const entries = [];
      for (const size of sizes) {
        const [c, cx] = makeCanvas(size, size);
        const scale = Math.min(size / width, size / height);
        const dw = Math.max(1, Math.round(width * scale)), dh = Math.max(1, Math.round(height * scale));
        cx.drawImage(canvas, (size - dw) / 2, (size - dh) / 2, dw, dh);
        entries.push({ size, png: await blobBytes(await toBlob(c, 'image/png')) });
      }
      return new Blob([await runCodec('encodeICO', entries)], { type: fmt.mime });
    }
    case 'pdf': {
      const jpeg = await blobBytes(await toBlob(canvas, 'image/jpeg', q));
      return new Blob([await runCodec('encodePDF', { width, height }, jpeg, { page: s.pdfPage })], { type: fmt.mime });
    }
    case 'svg': {
      const png = await blobBytes(await toBlob(canvas, 'image/png'));
      return new Blob([await runCodec('wrapSVG', { width, height }, png)], { type: fmt.mime });
    }
    default: throw new Error('알 수 없는 형식');
  }
}

/* ---------- 목록과 변환 ---------- */
const items = [];
let running = false;
const settingsKey = () => JSON.stringify(readSettings());

function baseName(name) { return name.replace(/\.[^.]+$/, '') || 'image'; }
function fmtBytes(n) { return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`; }

function addFiles(fileList) {
  const files = [...fileList].filter((f) => f && f.size > 0);
  if (!files.length) return;
  for (const file of files) items.push({ id: ++seq, file, status: 'queued' });
  renderList();
  scheduleConvert(0);
}

async function thumbnail(src) {
  const size = 56;
  const scale = Math.min(size / src.width, size / src.height, 1);
  const w = Math.max(1, Math.round(src.width * scale)), h = Math.max(1, Math.round(src.height * scale));
  const [c, ctx] = makeCanvas(w, h);
  ctx.drawImage(src.source, 0, 0, w, h);
  return c;
}

async function convertOne(item) {
  const s = readSettings();
  const key = JSON.stringify(s);
  item.status = 'working'; item.error = null; item.key = key; renderItem(item);
  let src;
  try {
    src = await decode(item.file);
    item.srcWidth = src.width; item.srcHeight = src.height;
    if (!item.thumb) item.thumb = await thumbnail(src);
    const [tw, th] = targetSize(src.width, src.height, s);
    const fmt = FORMATS[s.format];
    const [canvas, ctx] = render(src, tw, th, fmt.alpha ? null : s.background);
    src.close(); src = null;
    const blob = await encode(canvas, ctx, s);
    if (key !== settingsKey()) { item.status = 'queued'; return; }
    if (item.url) URL.revokeObjectURL(item.url);
    item.result = { blob, name: `${baseName(item.file.name)}.${fmt.ext}`, width: tw, height: th, format: s.format };
    item.url = URL.createObjectURL(blob);
    item.status = 'done';
  } catch (e) {
    if (key !== settingsKey()) { item.status = 'queued'; return; }
    item.status = 'error'; item.error = e && e.message ? e.message : String(e);
  } finally { if (src) src.close(); renderItem(item); }
}

let convertTimer = 0;
// 현재 설정과 다른 설정으로 만든 결과만 다시 대기열에 넣는다.
function requeueAll() {
  const key = settingsKey();
  for (const item of items) if ((item.status === 'done' || item.status === 'error') && item.key !== key) item.status = 'queued';
  renderList();
}
function scheduleConvert(delay = 400) {
  clearTimeout(convertTimer);
  requeueAll();
  convertTimer = setTimeout(convertAll, delay);
}
async function convertAll() {
  const s = readSettings();
  if (!FORMATS[s.format] || FORMATS[s.format].supported === false) return;
  requeueAll();
  if (running) return; // 진행 중인 루프가 바뀐 설정을 이어서 처리한다.
  running = true;
  try {
    for (;;) {
      const next = items.find((i) => i.status === 'queued');
      if (!next) break;
      await convertOne(next);
    }
  } finally { running = false; renderList(); }
}

function renderList() {
  els.results.hidden = items.length === 0;
  if (!items.length) { els.files.replaceChildren(); return; }
  const seen = new Set();
  for (const item of items) {
    let li = els.files.querySelector(`[data-id="${item.id}"]`);
    if (!li) { li = buildItem(item); els.files.append(li); }
    seen.add(li); renderItem(item, li);
  }
  for (const li of [...els.files.children]) if (!seen.has(li)) li.remove();
  const done = items.filter((i) => i.status === 'done');
  const inBytes = done.reduce((a, i) => a + i.file.size, 0), outBytes = done.reduce((a, i) => a + i.result.blob.size, 0);
  const working = items.some((i) => i.status === 'working' || i.status === 'queued');
  els.summary.textContent = working ? `변환 중… ${done.length} / ${items.length}` : done.length ? `${done.length}개 완료 · ${fmtBytes(inBytes)} → ${fmtBytes(outBytes)}` : '';
  els.downloadAll.disabled = done.length === 0 || working;
  els.downloadAll.textContent = done.length > 1 ? `모두 내려받기 (ZIP, ${done.length}개)` : '내려받기';
}

function buildItem(item) {
  const li = document.createElement('li');
  li.className = 'file'; li.dataset.id = item.id;
  li.innerHTML = `<div class="thumb"></div><div class="file-info"><div class="file-name"></div><div class="file-meta"></div></div><div class="file-actions"><a class="btn btn-small" download hidden>저장</a><button type="button" class="btn btn-small" data-act="remove" aria-label="목록에서 제거">✕</button></div>`;
  li.querySelector('[data-act=remove]').addEventListener('click', () => removeItem(item));
  return li;
}

function renderItem(item, li = els.files.querySelector(`[data-id="${item.id}"]`)) {
  if (!li) return;
  li.className = `file is-${item.status}`;
  const thumb = li.querySelector('.thumb');
  if (item.thumb && thumb.firstChild !== item.thumb) thumb.replaceChildren(item.thumb);
  const name = li.querySelector('.file-name');
  const meta = li.querySelector('.file-meta');
  const link = li.querySelector('a');
  const dims = item.srcWidth ? `${item.srcWidth}×${item.srcHeight}` : '';
  meta.classList.toggle('is-error', item.status === 'error');
  if (item.status === 'done') {
    const r = item.result;
    name.textContent = r.name;
    name.title = `${item.file.name} → ${r.name}`;
    const ratio = Math.round((r.blob.size / item.file.size) * 100);
    meta.innerHTML = `${dims}${dims !== `${r.width}×${r.height}` ? ` → ${r.width}×${r.height}` : ''} · ${fmtBytes(item.file.size)} → <span class="ok">${fmtBytes(r.blob.size)}</span> (${ratio}%)`;
    link.hidden = false; link.href = item.url; link.download = r.name;
  } else {
    name.textContent = item.file.name;
    meta.textContent = item.status === 'error' ? item.error : item.status === 'working' ? `변환 중 ${dims}` : `대기 중 · ${fmtBytes(item.file.size)}`;
    link.hidden = true;
  }
}

function removeItem(item) {
  const i = items.indexOf(item);
  if (i < 0) return;
  items.splice(i, 1);
  if (item.url) URL.revokeObjectURL(item.url);
  renderList();
}
function clearAll() {
  for (const item of items) if (item.url) URL.revokeObjectURL(item.url);
  items.length = 0;
  renderList();
}

function triggerDownload(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
}
async function downloadAll() {
  const done = items.filter((i) => i.status === 'done');
  if (!done.length) return;
  if (done.length === 1) { triggerDownload(done[0].url, done[0].result.name); return; }
  els.downloadAll.disabled = true;
  const prev = els.downloadAll.textContent;
  els.downloadAll.textContent = 'ZIP 만드는 중…';
  try {
    const used = new Map();
    const entries = [];
    for (const item of done) {
      let name = item.result.name;
      const n = (used.get(name) || 0) + 1; used.set(name, n);
      if (n > 1) name = name.replace(/(\.[^.]+)$/, ` (${n})$1`);
      entries.push({ name, data: await blobBytes(item.result.blob) });
    }
    const zip = await runCodec('encodeZIP', entries);
    const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
    triggerDownload(url, `images-${FORMATS[done[0].result.format].ext}.zip`);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    alert(`ZIP을 만들지 못했습니다: ${e.message}`);
  } finally { els.downloadAll.textContent = prev; els.downloadAll.disabled = false; }
}

/* ---------- 이벤트 ---------- */
els.input.addEventListener('change', () => { addFiles(els.input.files); els.input.value = ''; });
for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.add('is-over'); });
for (const ev of ['dragleave', 'drop']) document.addEventListener(ev, (e) => { if (ev === 'drop' || !e.relatedTarget) els.drop.classList.remove('is-over'); });
document.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });
document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.items || [])].filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
  if (files.length) { e.preventDefault(); addFiles(files.map((f, i) => (f.name ? f : new File([f], `clipboard-${Date.now()}-${i + 1}.png`, { type: f.type })))); }
});
els.form.addEventListener('input', () => { syncSettingsUI(); if (items.length) scheduleConvert(); });
els.form.addEventListener('submit', (e) => e.preventDefault());
els.clear.addEventListener('click', clearAll);
els.downloadAll.addEventListener('click', downloadAll);
$('#year').textContent = new Date().getFullYear();

/* ---------- 시작 ---------- */
try { applySettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); } catch { /* 무시 */ }
detectFormats().then(syncSettingsUI);
syncSettingsUI();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
