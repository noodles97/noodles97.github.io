// 순수 자바스크립트 인코더 모음. 외부 의존성 없이 RGBA 픽셀 버퍼({width,height,data})를
// 각 형식의 바이트(Uint8Array)로 바꿉니다. 메인 스레드와 워커 양쪽에서 그대로 import 합니다.

const textEncoder = new TextEncoder();

export function parseColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0xffffff;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hasAlpha(data) {
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return true;
  return false;
}

function concat(parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function ascii(s) { return textEncoder.encode(s); }

async function deflate(bytes, format) {
  const cs = new CompressionStream(format);
  const writer = cs.writable.getWriter();
  const done = writer.write(bytes).then(() => writer.close());
  const buf = await new Response(cs.readable).arrayBuffer();
  await done;
  return new Uint8Array(buf);
}

/* ---------- BMP (24비트, 알파는 배경색에 합성) ---------- */
export function encodeBMP({ width, height, data }, { background = '#ffffff' } = {}) {
  const [br, bg, bb] = parseColor(background);
  const rowBytes = (width * 3 + 3) & ~3;
  const pixelBytes = rowBytes * height;
  const fileSize = 54 + pixelBytes;
  const buf = new ArrayBuffer(fileSize);
  const v = new DataView(buf);
  const out = new Uint8Array(buf);
  out[0] = 0x42; out[1] = 0x4d;
  v.setUint32(2, fileSize, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, pixelBytes, true);
  v.setInt32(38, 2835, true);
  v.setInt32(42, 2835, true);
  for (let y = 0; y < height; y++) {
    let o = 54 + (height - 1 - y) * rowBytes;
    let i = y * width * 4;
    for (let x = 0; x < width; x++, i += 4) {
      const a = data[i + 3];
      if (a === 255) {
        out[o++] = data[i + 2]; out[o++] = data[i + 1]; out[o++] = data[i];
      } else {
        const ia = 255 - a;
        out[o++] = (data[i + 2] * a + bb * ia + 127) / 255 | 0;
        out[o++] = (data[i + 1] * a + bg * ia + 127) / 255 | 0;
        out[o++] = (data[i] * a + br * ia + 127) / 255 | 0;
      }
    }
  }
  return out;
}

/* ---------- TIFF (8비트 RGB/RGBA, 가능하면 Deflate 압축) ---------- */
export async function encodeTIFF({ width, height, data }, { compress = true } = {}) {
  const alpha = hasAlpha(data);
  const spp = alpha ? 4 : 3;
  let pixels;
  if (alpha) {
    pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else {
    pixels = new Uint8Array(width * height * 3);
    for (let i = 0, o = 0; i < data.length; i += 4) {
      pixels[o++] = data[i]; pixels[o++] = data[i + 1]; pixels[o++] = data[i + 2];
    }
  }
  let strip = pixels;
  let compression = 1;
  if (compress && typeof CompressionStream !== 'undefined') {
    try { strip = await deflate(pixels, 'deflate'); compression = 8; } catch { strip = pixels; }
  }
  const entries = [
    [256, 4, 1, width],
    [257, 4, 1, height],
    [258, 3, spp, 'bits'],
    [259, 3, 1, compression],
    [262, 3, 1, 2],
    [273, 4, 1, 'strip'],
    [277, 3, 1, spp],
    [278, 4, 1, height],
    [279, 4, 1, strip.length],
    [284, 3, 1, 1],
  ];
  if (alpha) entries.push([338, 3, 1, 2]);
  const ifdSize = 2 + entries.length * 12 + 4;
  const bitsOffset = 8 + ifdSize;
  const bitsSize = (spp * 2 + 1) & ~1;
  const stripOffset = bitsOffset + bitsSize;
  const head = new ArrayBuffer(stripOffset);
  const v = new DataView(head);
  v.setUint8(0, 0x49); v.setUint8(1, 0x49);
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true);
  v.setUint16(8, entries.length, true);
  let p = 10;
  for (const [tag, type, count, value] of entries) {
    v.setUint16(p, tag, true);
    v.setUint16(p + 2, type, true);
    v.setUint32(p + 4, count, true);
    if (value === 'bits') v.setUint32(p + 8, bitsOffset, true);
    else if (value === 'strip') v.setUint32(p + 8, stripOffset, true);
    else if (type === 3) v.setUint16(p + 8, value, true);
    else v.setUint32(p + 8, value, true);
    p += 12;
  }
  v.setUint32(p, 0, true);
  for (let i = 0; i < spp; i++) v.setUint16(bitsOffset + i * 2, 8, true);
  return concat([new Uint8Array(head), strip]);
}

/* ---------- GIF (단일 프레임, 중앙값 분할 팔레트 + 오차 확산 디더링) ---------- */
function medianCut(samples, count, maxColors) {
  const idx = new Uint32Array(count);
  for (let i = 0; i < count; i++) idx[i] = i;
  const boxes = [{ s: 0, e: count }];
  const stat = (b) => {
    let mn = [255, 255, 255], mx = [0, 0, 0];
    for (let i = b.s; i < b.e; i++) {
      const o = idx[i] * 3;
      for (let c = 0; c < 3; c++) { const val = samples[o + c]; if (val < mn[c]) mn[c] = val; if (val > mx[c]) mx[c] = val; }
    }
    let ch = 0, range = -1;
    for (let c = 0; c < 3; c++) if (mx[c] - mn[c] > range) { range = mx[c] - mn[c]; ch = c; }
    b.ch = ch; b.range = range;
  };
  stat(boxes[0]);
  while (boxes.length < maxColors) {
    let best = -1, bestScore = 0;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.e - b.s < 2 || b.range === 0) continue;
      const score = b.range * Math.sqrt(b.e - b.s);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) break;
    const b = boxes[best];
    const ch = b.ch;
    idx.subarray(b.s, b.e).sort((a, c) => samples[a * 3 + ch] - samples[c * 3 + ch]);
    const mid = (b.s + b.e) >> 1;
    const left = { s: b.s, e: mid }, right = { s: mid, e: b.e };
    stat(left); stat(right);
    boxes[best] = left; boxes.push(right);
  }
  const palette = new Uint8Array(boxes.length * 3);
  boxes.forEach((b, k) => {
    let r = 0, g = 0, bl = 0;
    const n = b.e - b.s;
    for (let i = b.s; i < b.e; i++) { const o = idx[i] * 3; r += samples[o]; g += samples[o + 1]; bl += samples[o + 2]; }
    palette[k * 3] = Math.round(r / n); palette[k * 3 + 1] = Math.round(g / n); palette[k * 3 + 2] = Math.round(bl / n);
  });
  return palette;
}

function lzwEncode(indices, minCodeSize) {
  const CLEAR = 1 << minCodeSize, EOI = CLEAR + 1;
  let codeSize = minCodeSize + 1, nextCode = EOI + 1;
  let bytes = new Uint8Array(Math.max(1024, indices.length >> 1));
  let len = 0, bitBuf = 0, bitCnt = 0;
  const push = (b) => {
    if (len === bytes.length) { const n = new Uint8Array(bytes.length * 2); n.set(bytes); bytes = n; }
    bytes[len++] = b;
  };
  const emit = (code) => {
    bitBuf |= code << bitCnt; bitCnt += codeSize;
    while (bitCnt >= 8) { push(bitBuf & 255); bitBuf >>>= 8; bitCnt -= 8; }
  };
  let dict = new Map();
  emit(CLEAR);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const code = dict.get(key);
    if (code !== undefined) { prefix = code; continue; }
    emit(prefix);
    if (nextCode === 4096) {
      emit(CLEAR);
      dict = new Map(); nextCode = EOI + 1; codeSize = minCodeSize + 1;
    } else {
      if (nextCode >= (1 << codeSize)) codeSize++;
      dict.set(key, nextCode++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(EOI);
  if (bitCnt > 0) push(bitBuf & 255);
  return bytes.subarray(0, len);
}

export function encodeGIF({ width, height, data }, { background = '#ffffff', dither = true } = {}) {
  const [br, bg, bb] = parseColor(background);
  const n = width * height;
  let transparentIdx = -1;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) { transparentIdx = 0; break; }
  // 반투명 픽셀은 배경에 합성한 RGB 버퍼를 만든다.
  const rgb = new Uint8Array(n * 3);
  for (let i = 0, o = 0; i < n; i++, o += 3) {
    const p = i * 4, a = data[p + 3];
    if (a === 255) { rgb[o] = data[p]; rgb[o + 1] = data[p + 1]; rgb[o + 2] = data[p + 2]; }
    else { const ia = 255 - a; rgb[o] = (data[p] * a + br * ia + 127) / 255 | 0; rgb[o + 1] = (data[p + 1] * a + bg * ia + 127) / 255 | 0; rgb[o + 2] = (data[p + 2] * a + bb * ia + 127) / 255 | 0; }
  }
  const maxColors = transparentIdx >= 0 ? 255 : 256;
  const step = Math.max(1, Math.floor(n / 60000));
  let sampleCount = 0;
  const samples = new Uint8Array(Math.ceil(n / step) * 3);
  for (let i = 0; i < n; i += step) {
    if (transparentIdx >= 0 && data[i * 4 + 3] < 128) continue;
    samples[sampleCount * 3] = rgb[i * 3]; samples[sampleCount * 3 + 1] = rgb[i * 3 + 1]; samples[sampleCount * 3 + 2] = rgb[i * 3 + 2];
    sampleCount++;
  }
  if (sampleCount === 0) { samples[0] = samples[1] = samples[2] = 0; sampleCount = 1; }
  const pal = medianCut(samples, sampleCount, maxColors);
  const palCount = pal.length / 3;
  const offset = transparentIdx >= 0 ? 1 : 0;
  const tableColors = Math.max(2, 1 << Math.ceil(Math.log2(palCount + offset)));
  const table = new Uint8Array(tableColors * 3);
  table.set(pal, offset * 3);
  const cache = new Int16Array(32768).fill(-1);
  const nearest = (r, g, b) => {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let best = cache[key];
    if (best >= 0) return best;
    let bestD = Infinity;
    for (let k = 0; k < palCount; k++) {
      const dr = pal[k * 3] - r, dg = pal[k * 3 + 1] - g, db = pal[k * 3 + 2] - b;
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
      if (d < bestD) { bestD = d; best = k; }
    }
    cache[key] = best;
    return best;
  };
  const indices = new Uint8Array(n);
  const clamp = (x) => x < 0 ? 0 : x > 255 ? 255 : x;
  if (dither) {
    const err = new Float32Array((width + 2) * 3 * 2);
    let cur = 0, nxt = (width + 2) * 3;
    for (let y = 0; y < height; y++) {
      err.fill(0, nxt, nxt + (width + 2) * 3);
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (transparentIdx >= 0 && data[i * 4 + 3] < 128) { indices[i] = transparentIdx; continue; }
        const e = cur + (x + 1) * 3;
        const r = clamp(Math.round(rgb[i * 3] + err[e])), g = clamp(Math.round(rgb[i * 3 + 1] + err[e + 1])), b = clamp(Math.round(rgb[i * 3 + 2] + err[e + 2]));
        const k = nearest(r, g, b);
        indices[i] = k + offset;
        const dr = r - pal[k * 3], dg = g - pal[k * 3 + 1], db = b - pal[k * 3 + 2];
        const right = cur + (x + 2) * 3, dl = nxt + x * 3, dn = nxt + (x + 1) * 3, drt = nxt + (x + 2) * 3;
        err[right] += dr * 7 / 16; err[right + 1] += dg * 7 / 16; err[right + 2] += db * 7 / 16;
        err[dl] += dr * 3 / 16; err[dl + 1] += dg * 3 / 16; err[dl + 2] += db * 3 / 16;
        err[dn] += dr * 5 / 16; err[dn + 1] += dg * 5 / 16; err[dn + 2] += db * 5 / 16;
        err[drt] += dr / 16; err[drt + 1] += dg / 16; err[drt + 2] += db / 16;
      }
      const t = cur; cur = nxt; nxt = t;
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (transparentIdx >= 0 && data[i * 4 + 3] < 128) { indices[i] = transparentIdx; continue; }
      indices[i] = nearest(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]) + offset;
    }
  }
  const sizeBits = Math.log2(tableColors) - 1;
  const minCodeSize = Math.max(2, sizeBits + 1);
  const lzw = lzwEncode(indices, minCodeSize);
  const parts = [];
  const header = new Uint8Array(13);
  header.set(ascii('GIF89a'));
  const hv = new DataView(header.buffer);
  hv.setUint16(6, width, true); hv.setUint16(8, height, true);
  header[10] = 0x80 | (7 << 4) | sizeBits; header[11] = 0; header[12] = 0;
  parts.push(header, table);
  if (transparentIdx >= 0) parts.push(new Uint8Array([0x21, 0xf9, 4, 1, 0, 0, transparentIdx, 0]));
  const desc = new Uint8Array(10);
  desc[0] = 0x2c;
  const dv = new DataView(desc.buffer);
  dv.setUint16(5, width, true); dv.setUint16(7, height, true);
  parts.push(desc, new Uint8Array([minCodeSize]));
  for (let i = 0; i < lzw.length; i += 255) {
    const chunk = lzw.subarray(i, Math.min(i + 255, lzw.length));
    parts.push(new Uint8Array([chunk.length]), chunk);
  }
  parts.push(new Uint8Array([0, 0x3b]));
  return concat(parts);
}

/* ---------- ICO (PNG 포함 방식) ---------- */
export function encodeICO(entries) {
  const head = new Uint8Array(6 + entries.length * 16);
  const v = new DataView(head.buffer);
  v.setUint16(2, 1, true);
  v.setUint16(4, entries.length, true);
  let offset = head.length;
  entries.forEach(({ size, png }, i) => {
    const p = 6 + i * 16;
    head[p] = size >= 256 ? 0 : size;
    head[p + 1] = size >= 256 ? 0 : size;
    v.setUint16(p + 4, 1, true);
    v.setUint16(p + 6, 32, true);
    v.setUint32(p + 8, png.length, true);
    v.setUint32(p + 12, offset, true);
    offset += png.length;
  });
  return concat([head, ...entries.map((e) => e.png)]);
}

/* ---------- PDF (JPEG 한 장을 담은 1페이지) ---------- */
const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
export function encodePDF({ width, height }, jpeg, { page = 'image', orientation = 'auto' } = {}) {
  let pw, ph;
  if (page === 'image') { pw = width * 72 / 96; ph = height * 72 / 96; }
  else {
    [pw, ph] = PAGE_SIZES[page] || PAGE_SIZES.a4;
    const landscape = orientation === 'landscape' || (orientation === 'auto' && width > height);
    if (landscape) [pw, ph] = [ph, pw];
  }
  const scale = Math.min(pw / width, ph / height);
  const dw = width * scale, dh = height * scale;
  const x = (pw - dw) / 2, y = (ph - dh) / 2;
  const f = (num) => (Math.round(num * 100) / 100).toString();
  const content = ascii(`q ${f(dw)} 0 0 ${f(dh)} ${f(x)} ${f(y)} cm /Im0 Do Q`);
  const objects = [
    ascii('<< /Type /Catalog /Pages 2 0 R >>'),
    ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    concat([ascii(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, ascii('\nendstream')]),
    concat([ascii(`<< /Length ${content.length} >>\nstream\n`), content, ascii('\nendstream')]),
  ];
  const parts = [ascii('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')];
  let pos = parts[0].length;
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pos);
    const chunk = concat([ascii(`${i + 1} 0 obj\n`), body, ascii('\nendobj\n')]);
    parts.push(chunk); pos += chunk.length;
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += String(o).padStart(10, '0') + ' 00000 n \n';
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  parts.push(ascii(xref));
  return concat(parts);
}

/* ---------- SVG (PNG를 감싼 래스터 SVG) ---------- */
export function wrapSVG({ width, height }, png) {
  let bin = '';
  for (let i = 0; i < png.length; i += 0x8000) bin += String.fromCharCode.apply(null, png.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  return ascii(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${b64}" xlink:href="data:image/png;base64,${b64}"/></svg>`);
}

/* ---------- ZIP (압축 없이 저장만) ---------- */
let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; }
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

export function encodeZIP(entries) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = textEncoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true); lv.setUint16(12, dosDate, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, nameBytes.length, true); lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    parts.push(local, data); central.push(cd);
    offset += local.length + data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  return concat([...parts, ...central, end]);
}
