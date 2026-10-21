// 우사기어 코덱. 한글 한 글자를 초성·중성·종성으로 나눠 각각 우사기 소리로 바꾸고,
// 그 밖의 글자(로마자, 숫자, 가나 등)는 코드값을 16진수 소리로 적습니다.
// 띄어쓰기와 문장 부호, 이모지는 그대로 둡니다. 모든 변환은 되돌릴 수 있습니다.

const CHO_KO = ['우라', '우라르', '우랴', '우르', '우르루', '우루', '우르르', '우루루', '우루르', '우랏', '우랏랏', '우', '우라아', '우라랏', '우라라', '우랴랴', '우르라', '우루라', '우랴아'];
const JUNG_KO = ['하', '야앗', '야야', '하앗앗', '야아', '하앗', '하야', '야하하', '하하', '하하하', '야앗앗', '야야야', '하하아', '야하', '하야아', '하아앗', '야아아', '야하아', '하아', '하아아', '야'];
const JONG_KO = ['', '프루', '프루랴', '푸루랴', '프', '부루랴', '프랴랴', '푸랴', '푸', '푸랴랴', '부랴랴', '프르르', '푸르르', '부르르', '프라라', '푸라라', '푸루', '프랴', '부라라', '부루', '부랴', '부', '프르', '부르', '푸라', '프라', '부라', '푸르'];
const HEX_KO = ['라', '랴', '르', '루', '리', '레', '로', '료', '래', '려', '류', '뤼', '뢰', '뤄', '롸', '뤠'];
const ESC_KO = '뿌';

// 한글 소리 → 가타카나 소리. 한 음절씩 치환해 같은 구조를 유지합니다.
const KANA = { 우: 'ウ', 라: 'ラ', 랴: 'リャ', 르: 'ルゥ', 루: 'ル', 랏: 'ラッ', 아: 'ァ', 앗: 'ァッ', 하: 'ハ', 야: 'ヤ', 프: 'プ', 푸: 'プー', 부: 'ブ', 뿌: 'ピ',
  리: 'リ', 레: 'レ', 로: 'ロ', 료: 'リョ', 래: 'レー', 려: 'リェ', 류: 'リュ', 뤼: 'ルィ', 뢰: 'ロィ', 뤄: 'ルォ', 롸: 'ルァ', 뤠: 'ルェ' };
const toKana = (s) => [...s].map((c) => KANA[c] ?? c).join('');

export const SCRIPTS = {
  ko: { cho: CHO_KO, jung: JUNG_KO, jong: JONG_KO, hex: HEX_KO, esc: ESC_KO },
  ja: { cho: CHO_KO.map(toKana), jung: JUNG_KO.map(toKana), jong: JONG_KO.map(toKana), hex: HEX_KO.map(toKana), esc: toKana(ESC_KO) },
};

export const CHO_NAMES = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const JUNG_NAMES = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
export const JONG_NAMES = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const LETTER = /[\p{L}\p{N}]/u;

// 한국어 → 우사기어
export function encode(text, script = 'ko') {
  const t = SCRIPTS[script] ?? SCRIPTS.ko;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const u = text.charCodeAt(i);
    if (u >= 0xac00 && u <= 0xd7a3) {
      const s = u - 0xac00;
      out += t.cho[Math.floor(s / 588)] + t.jung[Math.floor((s % 588) / 28)] + t.jong[s % 28];
    } else if (LETTER.test(text[i])) {
      out += escapeUnit(u, t);
    } else {
      out += text[i];
    }
  }
  return out;
}

function escapeUnit(u, t) {
  if (u < 0x100) return t.esc + t.hex[u >> 4] + t.hex[u & 15];
  return t.esc + t.esc + t.hex[(u >> 12) & 15] + t.hex[(u >> 8) & 15] + t.hex[(u >> 4) & 15] + t.hex[u & 15];
}

// 한글·가타카나 표기를 한 표로 합쳐, 섞여 있어도 읽습니다.
const ALL = {
  cho: mergeTokens('cho'), jung: mergeTokens('jung'), jong: mergeTokens('jong'), hex: mergeTokens('hex'),
  esc: [[SCRIPTS.ko.esc, 0], [SCRIPTS.ja.esc, 0]],
};
function mergeTokens(kind) {
  const list = [];
  for (const s of Object.values(SCRIPTS)) s[kind].forEach((tok, i) => { if (tok) list.push([tok, i]); });
  return list.sort((a, b) => b[0].length - a[0].length); // 긴 것부터 맞춰 봄
}
function match(table, text, pos) {
  for (const [tok, i] of table) if (text.startsWith(tok, pos)) return [tok.length, i];
  return null;
}

// 우사기어 → 한국어. 우사기어가 아닌 글자는 그대로 두고 그 수를 함께 돌려줍니다.
export function decode(text) {
  let out = '';
  let unknown = 0;
  let i = 0;
  while (i < text.length) {
    const esc = match(ALL.esc, text, i);
    if (esc) {
      const r = readEscape(text, i, esc[0]);
      if (r) { out += String.fromCharCode(r.unit); i = r.next; continue; }
    } else {
      const cho = match(ALL.cho, text, i);
      if (cho) {
        const jung = match(ALL.jung, text, i + cho[0]);
        if (jung) {
          const jong = match(ALL.jong, text, i + cho[0] + jung[0]);
          const code = 0xac00 + cho[1] * 588 + jung[1] * 28 + (jong ? jong[1] : 0);
          out += String.fromCharCode(code);
          i += cho[0] + jung[0] + (jong ? jong[0] : 0);
          continue;
        }
      }
    }
    if (LETTER.test(text[i])) unknown++;
    out += text[i];
    i++;
  }
  return { text: out, unknown };
}

function readEscape(text, pos, escLen) {
  let i = pos + escLen;
  let digits = 2;
  const second = match(ALL.esc, text, i);
  if (second) { i += second[0]; digits = 4; }
  let unit = 0;
  for (let k = 0; k < digits; k++) {
    const h = match(ALL.hex, text, i);
    if (!h) return null;
    unit = unit * 16 + h[1];
    i += h[0];
  }
  return { unit, next: i };
}

// 흉내 모드: 뜻은 버리고 느낌만 우사기처럼. 되돌릴 수 없습니다.
const VIBE = [['우라', 'ウラ'], ['우라우라', 'ウラウラ'], ['야하', 'ヤハ'], ['프루랴', 'プルャ'], ['하', 'ハ'], ['하아', 'ハァ'], ['우랴', 'ウリャ'], ['우라아', 'ウラァ'],
  ['우르르르', 'ウルルル'], ['부르르르', 'ブルルル'], ['야하아', 'ヤハァ'], ['프루랴아', 'プルャァ'], ['우랏', 'ウラッ'], ['하앗', 'ハァッ'], ['우라랏', 'ウラッ'], ['야하~', 'ヤハ〜']];
const ASK = [['하?', 'ハ?'], ['하아?', 'ハァ?'], ['우라?', 'ウラ?'], ['야하?', 'ヤハ?']];
const SHOUT = [['우라아!', 'ウラァ!'], ['우라우라!', 'ウラウラ!'], ['야하!', 'ヤハ!'], ['프루랴!', 'プルャ!'], ['하아아!', 'ハァァ!']];

export function vibe(text, script = 'ko') {
  const col = script === 'ja' ? 1 : 0;
  return text.replace(/\S+/gu, (word) => {
    const m = word.match(/^(.*?)([\p{P}\p{S}]*)$/su);
    const core = m[1];
    const tail = m[2];
    if (!core) return word;
    const h = hash(core);
    let pick;
    if (tail.includes('?')) pick = ASK[h % ASK.length][col] + tail.replace(/\?/g, '');
    else if (tail.includes('!')) pick = SHOUT[h % SHOUT.length][col] + tail.replace(/!/g, '');
    else {
      pick = VIBE[h % VIBE.length][col];
      if (core.length >= 4) pick += VIBE[(h >> 5) % VIBE.length][col];
      pick += tail;
    }
    return pick;
  });
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
