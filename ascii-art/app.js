// 문구는 페이지(_data/ascii_art.yml → window.AA_STRINGS)에서 받습니다. 한국어·영어 페이지가 같은 스크립트를 씁니다.
(function () {
  'use strict';
  const T = window.AA_STRINGS || {};
  const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

  const RAMPS = {
    dense: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
    standard: '@%#*+=-:. ',
    blocks: '█▓▒░ ',
    dots: '●◆○•· ',
  };
  const FONTS = {
    sans: '"IBM Plex Sans KR", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    display: '"Black Han Sans", "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    serif: '"Noto Serif KR", "Apple Myungjo", "Nanum Myeongjo", "Batang", Georgia, serif',
    mono: '"IBM Plex Mono", "Apple SD Gothic Neo", "Malgun Gothic", Menlo, Consolas, monospace',
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    out: $('out'), stats: $('stats'), toast: $('toast'), copy: $('copy'),
    cols: $('cols'), colsOut: $('cols-out'), charset: $('charset'), custom: $('custom'),
    contrast: $('contrast'), contrastOut: $('contrast-out'), invert: $('invert'), color: $('color'),
    file: $('file'), drop: $('drop'), thumb: $('thumb'), thumbName: $('thumb-name'),
    text: $('text'), font: $('font'), fsize: $('fsize'), fsizeOut: $('fsize-out'),
    sampleTag: $('sample-tag'), imageFields: $('image-fields'), textFields: $('text-fields'),
  };

  const state = { mode: 'image', image: null, isSample: true, plain: '' };
  const work = document.createElement('canvas');
  const wctx = work.getContext('2d', { willReadFrequently: true });

  /* ---------- 샘플 이미지 ---------- */
  function makeSample() {
    const c = document.createElement('canvas'); c.width = 360; c.height = 240;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 240); bg.addColorStop(0, '#0b1020'); bg.addColorStop(1, '#2a3550');
    g.fillStyle = bg; g.fillRect(0, 0, 360, 240);
    g.strokeStyle = 'rgba(120,200,255,0.55)'; g.lineWidth = 1.2;
    for (let i = 0; i <= 12; i++) { const x = i * 30; g.beginPath(); g.moveTo(180 + (x - 180) * 0.25, 150); g.lineTo(x, 240); g.stroke(); }
    for (let i = 0; i < 7; i++) { const y = 150 + 90 * (i * i) / 36; g.beginPath(); g.moveTo(0, y); g.lineTo(360, y); g.stroke(); }
    const sg = g.createRadialGradient(150, 95, 10, 180, 115, 78);
    sg.addColorStop(0, '#fff6d8'); sg.addColorStop(0.45, '#f0a040'); sg.addColorStop(1, '#3a1208');
    g.fillStyle = sg; g.beginPath(); g.arc(180, 115, 72, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(200, 196, 70, 16, 0, 0, Math.PI * 2); g.fill();
    return c;
  }

  /* ---------- 글자 → 캔버스 ---------- */
  function textCanvas() {
    const raw = el.text.value.replace(/\r/g, '');
    const lines = (raw.trim() ? raw : ' ').split('\n');
    const family = FONTS[el.font.value] || FONTS.sans;
    const fs = 120, lh = fs * 1.18;
    const c = document.createElement('canvas'); const g = c.getContext('2d');
    g.font = `bold ${fs}px ${family}`;
    const w = Math.max(...lines.map((l) => g.measureText(l || ' ').width)) + fs * 0.4;
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.ceil(lines.length * lh + fs * 0.3);
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = `bold ${fs}px ${family}`; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, fs * 0.2, fs * 0.15 + i * lh));
    return c;
  }

  /* ---------- 변환 ---------- */
  function ramp() {
    if (el.charset.value === 'custom') {
      const v = Array.from(el.custom.value);
      return v.length >= 2 ? v : Array.from(RAMPS.standard);
    }
    return Array.from(RAMPS[el.charset.value] || RAMPS.standard);
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function render() {
    const src = state.mode === 'image' ? state.image : textCanvas();
    if (!src || !src.width || !src.height) return;
    const cols = +el.cols.value;
    const rows = Math.max(1, Math.round(cols * (src.height / src.width) * 0.5));
    work.width = cols; work.height = rows;
    wctx.clearRect(0, 0, cols, rows);
    wctx.drawImage(src, 0, 0, cols, rows);
    const d = wctx.getImageData(0, 0, cols, rows).data;
    const chars = ramp(); const n = chars.length - 1;
    const invert = el.invert.checked, color = el.color.checked, k = +el.contrast.value;
    const plain = [], html = [];
    for (let y = 0; y < rows; y++) {
      let line = '', hline = '';
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = d[i + 3] / 255, bgv = invert ? 255 : 0;
        const r = d[i] * a + bgv * (1 - a), g = d[i + 1] * a + bgv * (1 - a), b = d[i + 2] * a + bgv * (1 - a);
        let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        lum = Math.min(1, Math.max(0, (lum - 0.5) * k + 0.5));
        if (invert) lum = 1 - lum;
        const ch = chars[Math.round((1 - lum) * n)];
        line += ch;
        if (color) hline += `<span style="color:rgb(${r | 0},${g | 0},${b | 0})">${esc(ch)}</span>`;
      }
      plain.push(line);
      if (color) html.push(hline);
    }
    state.plain = plain.join('\n');
    if (color) el.out.innerHTML = html.join('\n'); else el.out.textContent = state.plain;
    el.stats.textContent = fill(T.stats, { cols, rows, chars: (cols * rows).toLocaleString() });
    el.sampleTag.hidden = !(state.mode === 'image' && state.isSample);
  }

  /* ---------- 이미지 불러오기 ---------- */
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.image = img; state.isSample = false;
      el.thumb.src = url; el.thumbName.textContent = file.name || T.clipboard || 'clipboard';
      if (state.mode !== 'image') setMode('image'); else render();
    };
    img.onerror = () => { URL.revokeObjectURL(url); showToast(T.load_fail); };
    img.src = url;
  }
  el.file.addEventListener('change', () => loadFile(el.file.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => el.drop.addEventListener(ev, (e) => { e.preventDefault(); el.drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => el.drop.addEventListener(ev, (e) => { e.preventDefault(); el.drop.classList.remove('over'); }));
  el.drop.addEventListener('drop', (e) => loadFile(e.dataTransfer.files[0]));
  document.addEventListener('paste', (e) => {
    const item = Array.from(e.clipboardData?.items || []).find((it) => it.type.startsWith('image/'));
    if (item) { e.preventDefault(); loadFile(item.getAsFile()); }
  });

  /* ---------- 모드와 컨트롤 ---------- */
  function setMode(mode) {
    state.mode = mode;
    $('mode-image').setAttribute('aria-pressed', String(mode === 'image'));
    $('mode-text').setAttribute('aria-pressed', String(mode === 'text'));
    el.imageFields.hidden = mode !== 'image';
    el.textFields.hidden = mode !== 'text';
    if (mode === 'text') ensureFont().then(render); else render();
  }
  function ensureFont() {
    const family = FONTS[el.font.value] || FONTS.sans;
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return document.fonts.load(`bold 120px ${family}`, el.text.value || 'A').catch(() => {});
  }
  $('mode-image').addEventListener('click', () => setMode('image'));
  $('mode-text').addEventListener('click', () => setMode('text'));

  el.cols.addEventListener('input', () => { el.colsOut.textContent = el.cols.value; render(); });
  el.contrast.addEventListener('input', () => { el.contrastOut.textContent = (+el.contrast.value).toFixed(1); render(); });
  el.charset.addEventListener('change', () => { el.custom.hidden = el.charset.value !== 'custom'; if (!el.custom.hidden) el.custom.focus(); render(); });
  el.custom.addEventListener('input', render);
  el.invert.addEventListener('change', render);
  el.color.addEventListener('change', render);
  el.text.addEventListener('input', () => ensureFont().then(render));
  el.font.addEventListener('change', () => ensureFont().then(render));
  el.fsize.addEventListener('input', () => { el.out.style.fontSize = el.fsize.value + 'px'; el.fsizeOut.textContent = el.fsize.value + 'px'; });

  /* ---------- 복사 ---------- */
  let toastTimer = 0;
  function showToast(msg) { el.toast.textContent = msg || ''; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.toast.textContent = ''; }, 3000); }
  function selectOutput() {
    const range = document.createRange(); range.selectNodeContents(el.out);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }
  el.copy.addEventListener('click', () => {
    const fallback = () => { selectOutput(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } showToast(ok ? T.copied : T.copy_fail); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(state.plain).then(() => showToast(T.copied)).catch(fallback);
    } else fallback();
  });

  /* ---------- 시작 ---------- */
  $('year').textContent = String(new Date().getFullYear());
  state.image = makeSample();
  el.thumb.src = state.image.toDataURL();
  el.out.style.fontSize = el.fsize.value + 'px';
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (state.mode === 'text') render(); });
})();
