import { encode, decode, vibe, SCRIPTS, CHO_NAMES, JUNG_NAMES, JONG_NAMES } from './usagi.js';

const $ = (id) => document.getElementById(id);
const src = $('src'), out = $('out'), note = $('note'), opts = $('opts'), vibeBox = $('vibe');
const SAMPLE = '하, 우르르르, 부르르르, 하. 우사기 번역기 해줘. 괜찮은데?';
let noteTimer = 0;

const dir = () => document.querySelector('input[name=dir]:checked').value;
const script = () => document.querySelector('input[name=script]:checked').value;
const setDir = (v) => { document.querySelector(`input[name=dir][value=${v}]`).checked = true; };

function render() {
  const text = src.value;
  const encoding = dir() === 'encode';
  $('src-label').textContent = encoding ? '한국어' : '우사기어';
  $('out-label').textContent = encoding ? '우사기어' : '한국어';
  out.placeholder = encoding ? '우라 하? 야하 프루랴' : '풀린 글이 여기에 나옵니다';
  src.placeholder = encoding ? `여기에 쓰면 바로 바뀝니다. 예: ${SAMPLE}` : '우사기어를 붙여 넣으면 바로 풀립니다.';
  opts.hidden = !encoding;
  $('src-count').textContent = `${[...text].length}자`;
  let result = '';
  let warn = '';
  if (text) {
    if (!encoding) {
      const d = decode(text);
      result = d.text;
      if (d.unknown) warn = `우사기어가 아닌 글자 ${d.unknown}개는 그대로 두었습니다.`;
    } else if (vibeBox.checked) {
      result = vibe(text, script());
    } else {
      result = encode(text, script());
    }
  }
  out.value = result;
  $('out-count').textContent = result ? `${[...result].length}자` : '';
  if (!noteTimer) setNote(warn, warn ? 'is-warn' : '');
  $('share').disabled = $('copy').disabled = !result;
  updateHash();
}

function setNote(msg, cls = '', ms = 0) {
  note.textContent = msg;
  note.className = `note ${cls}`;
  clearTimeout(noteTimer);
  noteTimer = 0;
  if (ms) noteTimer = setTimeout(() => { noteTimer = 0; render(); }, ms);
}

// 주소 뒤에 글을 붙여 두면 새로 고쳐도 남고, 그대로 공유 링크가 됩니다.
function updateHash() {
  const text = src.value;
  const url = new URL(location.href);
  url.hash = text ? `${dir() === 'encode' ? 'k' : 'u'}=${encodeURIComponent(text)}` : '';
  history.replaceState(null, '', url);
}
function readHash() {
  const m = location.hash.match(/^#([ku])=(.*)$/);
  if (!m) return;
  try { src.value = decodeURIComponent(m[2]); } catch { return; }
  setDir(m[1] === 'u' ? 'decode' : 'encode');
}

function shareUrl() {
  // 우사기어를 받은 사람이 바로 풀어 볼 수 있도록 '우사기어 → 한국어' 방향으로 엽니다.
  const url = new URL(location.href);
  const usagi = dir() === 'encode' ? out.value : src.value;
  url.hash = `u=${encodeURIComponent(usagi)}`;
  return url.toString();
}

src.addEventListener('input', render);
document.querySelectorAll('input[name=dir],input[name=script],#vibe').forEach((el) => el.addEventListener('change', render));

$('swap').addEventListener('click', () => {
  const next = out.value;
  setDir(dir() === 'encode' ? 'decode' : 'encode');
  if (vibeBox.checked && dir() === 'decode') vibeBox.checked = false;
  src.value = next;
  render();
  src.focus();
});
$('clear').addEventListener('click', () => { src.value = ''; render(); src.focus(); });
$('sample').addEventListener('click', () => { src.value = dir() === 'encode' ? SAMPLE : encode(SAMPLE, 'ko'); render(); });

$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(out.value);
    setNote('복사했습니다.', 'is-ok', 1800);
  } catch {
    out.select();
    document.execCommand('copy');
    setNote('복사했습니다.', 'is-ok', 1800);
  }
});
$('share').addEventListener('click', async () => {
  const url = shareUrl();
  if (vibeBox.checked && dir() === 'encode') { setNote('흉내 모드 결과는 되돌릴 수 없어서 링크로 풀리지 않습니다.', 'is-warn', 3000); return; }
  if (navigator.share) {
    try { await navigator.share({ title: '우사기 번역기', text: out.value, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); setNote('링크를 복사했습니다. 받은 사람은 열자마자 한국어로 풀립니다.', 'is-ok', 3000); }
  catch { prompt('이 링크를 복사하세요', url); }
});

// 규칙 표
function table(title, names, ko, ja) {
  const rows = names.map((n, i) => n ? `<tr><td>${n}</td><td>${ko[i]}</td><td>${ja[i]}</td></tr>` : '').join('');
  return `<div><h3>${title}</h3><table>${rows}</table></div>`;
}
$('tables').innerHTML =
  table('초성', CHO_NAMES, SCRIPTS.ko.cho, SCRIPTS.ja.cho) +
  table('중성', JUNG_NAMES, SCRIPTS.ko.jung, SCRIPTS.ja.jung) +
  table('받침', JONG_NAMES, SCRIPTS.ko.jong, SCRIPTS.ja.jong) +
  table('16진수 (한글 아닌 글자)', [...'0123456789ABCDEF'], SCRIPTS.ko.hex, SCRIPTS.ja.hex);

$('year').textContent = new Date().getFullYear();
readHash();
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
