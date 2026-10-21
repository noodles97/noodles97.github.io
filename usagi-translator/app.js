import { encode, decode, speak, gloss, readUsagi, GLOSSARY, TABLES, CHO_NAMES, JUNG_NAMES, JONG_NAMES } from './usagi.js';

const $ = (id) => document.getElementById(id);
const src = $('src'), out = $('out'), note = $('note'), glossBox = $('gloss');
const SAMPLES = {
  cipher: '하, 우르르르, 부르르르, 하. 우사기 번역기 해줘. 괜찮은데?',
  talk: '찾았다! 배고파, 같이 밥 먹자. 맛있겠다, 그치? 요즘 뭐해?',
  talkUsagi: '야하! 하아? 하아? 푸루야 쥬르리 후응 우-라- 이- 푸루루루루루',
};
let noteTimer = 0;

const pick = (name) => document.querySelector(`input[name=${name}]:checked`).value;
const set = (name, v) => { document.querySelector(`input[name=${name}][value=${v}]`).checked = true; };
const mode = () => pick('mode');
const dir = () => pick('dir');
const script = () => pick('script');

function render() {
  const text = src.value;
  const encoding = dir() === 'encode';
  const cipher = mode() === 'cipher';
  $('src-label').textContent = encoding ? '한국어' : '우사기어';
  $('out-label').textContent = encoding ? '우사기어' : '한국어';
  src.placeholder = encoding ? `여기에 쓰면 바로 바뀝니다. 예: ${cipher ? SAMPLES.cipher : SAMPLES.talk}` : `우사기어를 붙여 넣으면 바로 풀립니다. 예: ${cipher ? '우 하 푸루야 우라아 야아 프루루' : SAMPLES.talkUsagi}`;
  out.placeholder = encoding ? '우라 하? 야하 푸루야' : '풀린 글이 여기에 나옵니다';
  $('opt-script').hidden = !encoding;
  $('share').hidden = !cipher;
  $('mode-hint').textContent = cipher
    ? '글자마다 소리가 정해져 있어 그대로 되돌릴 수 있습니다. 암호처럼 주고받을 때.'
    : '팬들이 정리한 우사기어 사전으로 뜻을 옮깁니다. 되돌릴 수는 없지만 진짜 우사기 말처럼 보입니다.';
  $('src-count').textContent = `${[...text].length}자`;
  let result = '';
  let warn = '';
  let used = [];
  let reading = ''; // 일본어 표기를 한글로 읽은 것
  let readingLabel = '';
  const hasKana = /[\u3041-\u30ff]/.test(text);
  if (text) {
    if (cipher && encoding) {
      result = encode(text, script());
      if (script() === 'ja') { reading = encode(text, 'ko'); readingLabel = '한글로 읽기'; }
    } else if (cipher) {
      const d = decode(text);
      result = d.text;
      if (d.unknown) warn = `우사기어가 아닌 글자 ${d.unknown}개는 그대로 두었습니다.`;
      if (hasKana) { reading = d.unknown ? readUsagi(text) : encode(result, 'ko'); readingLabel = '입력을 한글로 읽기'; }
    } else if (encoding) {
      result = speak(text, script());
      if (script() === 'ja') { reading = speak(text, 'ko'); readingLabel = '한글로 읽기'; }
    } else {
      const g = gloss(text); result = g.text; used = g.used;
      if (hasKana) { reading = readUsagi(text); readingLabel = '입력을 한글로 읽기'; }
    }
  }
  $('reading').hidden = !reading;
  $('reading-label').textContent = readingLabel;
  $('reading-text').textContent = reading;
  out.value = result;
  $('out-count').textContent = result ? `${[...result].length}자` : '';
  if (!noteTimer) setNote(warn, warn ? 'is-warn' : '');
  $('copy').disabled = !result;
  $('share').disabled = !result;
  renderGloss(used);
  updateHash();
}

function renderGloss(used) {
  glossBox.hidden = !used.length;
  glossBox.innerHTML = used.length
    ? '<h3>단어 풀이</h3><ul>' + used.map((e) => `<li><b>${e.ko}</b> <span class="ja">${e.ja}</span> <span class="meaning">${e.meanings.join(' · ')}</span><small>${e.when}</small></li>`).join('') + '</ul>'
    : '';
}

function setNote(msg, cls = '', ms = 0) {
  note.textContent = msg;
  note.className = `note ${cls}`;
  clearTimeout(noteTimer);
  noteTimer = 0;
  if (ms) noteTimer = setTimeout(() => { noteTimer = 0; render(); }, ms);
}

// 주소 뒤에 상태를 붙여 두면 새로 고쳐도 남고, 그대로 공유 링크가 됩니다.
// k: 암호로 만들기, u: 암호 풀기, s: 회화로 옮기기, g: 회화 뜻풀이
const KEYS = { 'cipher/encode': 'k', 'cipher/decode': 'u', 'talk/encode': 's', 'talk/decode': 'g' };
function updateHash() {
  const url = new URL(location.href);
  url.hash = src.value ? `${KEYS[`${mode()}/${dir()}`]}=${encodeURIComponent(src.value)}` : '';
  history.replaceState(null, '', url);
}
function readHash() {
  const m = location.hash.match(/^#([kusg])=(.*)$/);
  if (!m) return;
  try { src.value = decodeURIComponent(m[2]); } catch { return; }
  const key = Object.entries(KEYS).find(([, v]) => v === m[1])[0];
  const [md, d] = key.split('/');
  set('mode', md);
  set('dir', d);
}
function shareUrl() {
  // 받은 사람이 바로 풀어 볼 수 있도록 '우사기어 → 한국어' 방향으로 엽니다.
  const url = new URL(location.href);
  url.hash = `u=${encodeURIComponent(dir() === 'encode' ? out.value : src.value)}`;
  return url.toString();
}

src.addEventListener('input', render);
document.querySelectorAll('input[name=mode],input[name=dir],input[name=script]').forEach((el) => el.addEventListener('change', render));

$('swap').addEventListener('click', () => {
  const next = out.value;
  set('dir', dir() === 'encode' ? 'decode' : 'encode');
  src.value = next;
  render();
  src.focus();
});
$('clear').addEventListener('click', () => { src.value = ''; render(); src.focus(); });
$('sample').addEventListener('click', () => {
  const cipher = mode() === 'cipher';
  const encoding = dir() === 'encode';
  src.value = cipher ? (encoding ? SAMPLES.cipher : encode(SAMPLES.cipher, 'ko')) : (encoding ? SAMPLES.talk : SAMPLES.talkUsagi);
  render();
});

$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(out.value); }
  catch { out.select(); document.execCommand('copy'); }
  setNote('복사했습니다.', 'is-ok', 1800);
});
$('share').addEventListener('click', async () => {
  const url = shareUrl();
  if (navigator.share) {
    try { await navigator.share({ title: '우사기 번역기', text: out.value, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); setNote('링크를 복사했습니다. 받은 사람은 열자마자 한국어로 풀립니다.', 'is-ok', 3000); }
  catch { prompt('이 링크를 복사하세요', url); }
});

// 규칙 표와 사전
function table(title, names, pairs) {
  const rows = names.map((n, i) => n ? `<tr><td>${n}</td><td>${pairs[i][0]}</td><td>${pairs[i][1]}</td></tr>` : '').join('');
  return `<div><h3>${title}</h3><table>${rows}</table></div>`;
}
$('tables').innerHTML =
  table('초성', CHO_NAMES, TABLES.cho) + table('중성', JUNG_NAMES, TABLES.jung) + table('받침', JONG_NAMES, TABLES.jong) +
  table('16진수 (한글 아닌 글자)', [...'0123456789ABCDEF'], TABLES.hex);
const row = (e) => `<tr><td><b>${e.ko}</b><br><span class="ja">${e.ja}</span></td><td>${e.meanings.join(' · ')}</td><td>${e.when}</td></tr>`;
$('dict').innerHTML = GLOSSARY.filter((e) => !e.sfx).map(row).join('') +
  '<tr class="dict-sub"><th colspan="3">효과음 계열 (우사기 말풍선에서 난 소리)</th></tr>' + GLOSSARY.filter((e) => e.sfx).map(row).join('');

$('year').textContent = new Date().getFullYear();
readHash();
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
