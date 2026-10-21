// 우사기어 코덱. 인공지능 없이 규칙만으로 동작합니다.
//
// 1) 암호 모드 (encode / decode): 한글 한 글자를 초성·중성·종성으로 나눠 각각 우사기 소리로 바꿉니다.
//    초성은 「우라」 계열, 중성은 「하아?」「야하」 계열, 받침은 「푸루야」「후응」「프루루」 계열입니다.
//    계열의 첫 글자가 다르기 때문에 어디서 글자가 끊기는지 알 수 있고, 그래서 그대로 되돌릴 수 있습니다.
//    한글이 아닌 글자는 「뿌」 뒤에 코드값을 16진수 소리로 적습니다. 띄어쓰기는 「!」로, 원래 있던 「!」는 「！」로 적습니다.
// 2) 회화 모드 (speak / gloss): 팬들이 정리한 우사기어 사전으로 뜻을 옮깁니다. 되돌릴 수 없는 대신 진짜 우사기 말처럼 보입니다.

// ---------- 암호 모드 토큰표 ----------
// [한글 표기, 가타카나 표기]. 자주 쓰는 자모에 짧은 소리를 줬습니다.
const CHO = [ // ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
  ['우라', 'ウラ'], ['우라우라아', 'ウラウラァ'], ['우라아', 'ウラァ'], ['우라우라', 'ウラウラ'], ['우라우랏', 'ウラウラッ'], ['우랏', 'ウラッ'], ['우라아아', 'ウラァァ'],
  ['우라랏', 'ウララッ'], ['우라아우라', 'ウラァウラ'], ['우라라', 'ウララ'], ['우우라', 'ウウラ'], ['우', 'ウ'], ['우아', 'ウァ'], ['우라우라우라', 'ウラウラウラ'],
  ['우라라아', 'ウララァ'], ['우라아라', 'ウラァラ'], ['우랏라', 'ウラッラ'], ['우라라라', 'ウラララ'], ['우앗', 'ウァッ'],
];
const JUNG = [ // ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ ㅡ ㅢ ㅣ
  ['하', 'ハ'], ['야하아', 'ヤハァ'], ['야앗', 'ヤァッ'], ['야하아아', 'ヤハァァ'], ['야', 'ヤ'], ['하하', 'ハハ'], ['야아', 'ヤァ'], ['야하야핫', 'ヤハヤハッ'],
  ['핫', 'ハッ'], ['하하아', 'ハハァ'], ['하하하', 'ハハハ'], ['야하핫', 'ヤハハッ'], ['하아아', 'ハァァ'], ['야핫', 'ヤハッ'], ['하핫', 'ハハッ'],
  ['야하야하야하', 'ヤハヤハヤハ'], ['야하하', 'ヤハハ'], ['야하야하', 'ヤハヤハ'], ['하아', 'ハァ'], ['하앗', 'ハァッ'], ['야하', 'ヤハ'],
];
const JONG = [ // (없음) ㄱ ㄲ ㄳ ㄴ ㄵ ㄶ ㄷ ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅁ ㅂ ㅄ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ
  ['', ''], ['푸루', 'プル'], ['푸루루루', 'プルルルル'], ['후응응응', 'フゥンンン'], ['푸루야', 'プルャ'], ['푸루야야', 'プルャャ'], ['푸루야앗', 'プルャァッ'],
  ['후응응', 'フゥンン'], ['후응', 'フゥン'], ['후응아', 'フゥンァ'], ['후웅웅', 'フーンーン'], ['후웅아', 'フーンァ'], ['후응앗', 'フゥンッ'], ['후웅앗', 'フーンッ'],
  ['후응야', 'フゥンャ'], ['후웅야', 'フーンャ'], ['후웅', 'フーン'], ['푸루얏', 'プルャッ'], ['푸루얏얏', 'プルャッャッ'], ['프룻', 'プルッ'], ['프루룻', 'プルルッ'],
  ['프루루', 'プルル'], ['푸루야아', 'プルャァ'], ['푸루아', 'プルァ'], ['푸루앗', 'プルァッ'], ['프루루아', 'プルルァ'], ['프루루앗', 'プルルァッ'], ['프루루루', 'プルルル'],
];
const HEX = [['라', 'ラ'], ['랴', 'リャ'], ['르', 'ルゥ'], ['루', 'ル'], ['리', 'リ'], ['레', 'レ'], ['로', 'ロ'], ['료', 'リョ'],
  ['래', 'レー'], ['려', 'リェ'], ['류', 'リュ'], ['뤼', 'ルィ'], ['뢰', 'ロィ'], ['뤄', 'ルォ'], ['롸', 'ルァ'], ['뤠', 'ルェ']];
const ESC = ['뿌', 'ピ'];
const SPACE = '!';      // 원문의 띄어쓰기
const BANG = '！';      // 원문의 느낌표

export const CHO_NAMES = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const JUNG_NAMES = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
export const JONG_NAMES = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const TABLES = { cho: CHO, jung: JUNG, jong: JONG, hex: HEX, esc: ESC };

const col = (script) => (script === 'ja' ? 1 : 0);
const LETTER = /[\p{L}\p{N}]/u;

// 한국어 → 우사기어 (암호)
// 소리와 소리 사이의 띄어쓰기는 「!」로 적고, 문장 부호 옆이나 글 처음·끝의 띄어쓰기는 그대로 둡니다.
// 소리 사이에 넣는 공백은 읽기 좋으라고 넣는 것이라 뜻이 없습니다.
export function encode(text, script = 'ko') {
  const c = col(script);
  const segs = []; // {kind: 'tok' | 'pass' | 'sp', text}
  const push = (kind, t) => {
    const last = segs[segs.length - 1];
    if (kind === 'sp' && last && last.kind === 'sp') last.text += t;
    else segs.push({ kind, text: t });
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const u = text.charCodeAt(i);
    if (u >= 0xac00 && u <= 0xd7a3) {
      const s = u - 0xac00;
      push('tok', CHO[Math.floor(s / 588)][c]);
      push('tok', JUNG[Math.floor((s % 588) / 28)][c]);
      const jong = JONG[s % 28][c];
      if (jong) push('tok', jong);
    } else if (ch === ' ') push('sp', ' ');
    else if (ch === '!') push('pass', BANG);
    else if (LETTER.test(ch) || ch === BANG || ch === SPACE) push('tok', escapeUnit(u, c));
    else push('pass', ch);
  }
  let out = '';
  let prev = null;
  segs.forEach((seg, i) => {
    let kind = seg.kind;
    let t = seg.text;
    if (kind === 'sp') {
      const before = segs[i - 1]?.kind === 'tok';
      const after = segs[i + 1]?.kind === 'tok';
      if (before && after) { kind = 'mark'; t = SPACE.repeat(t.length); }
    }
    if ((prev === 'tok' || prev === 'mark') && kind === 'tok') out += ' ';
    out += t;
    prev = kind;
  });
  return out;
}

function escapeUnit(u, c) {
  if (u < 0x100) return ESC[c] + HEX[u >> 4][c] + HEX[u & 15][c];
  return ESC[c] + ESC[c] + HEX[(u >> 12) & 15][c] + HEX[(u >> 8) & 15][c] + HEX[(u >> 4) & 15][c] + HEX[u & 15][c];
}

// 한글·가타카나 표기를 한 표로 합쳐, 섞여 있어도 읽습니다. 긴 소리부터 맞춰 봅니다.
const flat = (table) => {
  const list = [];
  table.forEach((pair, i) => pair.forEach((tok) => { if (tok) list.push([tok, i]); }));
  return list.sort((a, b) => b[0].length - a[0].length);
};
const T = { cho: flat(CHO), jung: flat(JUNG), jong: flat(JONG), hex: flat(HEX), esc: ESC.map((t) => [t, 0]) };
function match(table, text, pos) {
  for (const [tok, i] of table) if (text.startsWith(tok, pos)) return [tok.length, i];
  return null;
}

// 우사기어 → 한국어 (암호). 우사기어가 아닌 글자는 그대로 두고 그 수를 함께 돌려줍니다.
const TOKLIKE = /[\p{L}\p{N}!]/u;
export function decode(input) {
  // 소리와 소리 사이의 공백은 읽기용이라 지우고, 문장 부호 옆이나 글 처음·끝의 공백은 남깁니다.
  const text = input.replace(/ +/g, (m, pos, str) => {
    const before = pos > 0 && TOKLIKE.test(str[pos - 1]);
    const after = pos + m.length < str.length && TOKLIKE.test(str[pos + m.length]);
    return before && after ? '' : m;
  });
  let out = '';
  let unknown = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === SPACE) { out += ' '; i++; continue; }
    if (ch === BANG) { out += '!'; i++; continue; }
    const esc = match(T.esc, text, i);
    if (esc) {
      const r = readEscape(text, i + esc[0]);
      if (r) { out += String.fromCharCode(r.unit); i = r.next; continue; }
    } else {
      const cho = match(T.cho, text, i);
      if (cho) {
        const jung = match(T.jung, text, i + cho[0]);
        if (jung) {
          const jong = match(T.jong, text, i + cho[0] + jung[0]);
          out += String.fromCharCode(0xac00 + cho[1] * 588 + jung[1] * 28 + (jong ? jong[1] : 0));
          i += cho[0] + jung[0] + (jong ? jong[0] : 0);
          continue;
        }
      }
    }
    if (LETTER.test(ch)) unknown++;
    out += ch;
    i++;
  }
  return { text: out, unknown };
}

function readEscape(text, pos) {
  let i = pos;
  let digits = 2;
  const second = match(T.esc, text, i);
  if (second) { i += second[0]; digits = 4; }
  let unit = 0;
  for (let k = 0; k < digits; k++) {
    const h = match(T.hex, text, i);
    if (!h) return null;
    unit = unit * 16 + h[1];
    i += h[0];
  }
  return { unit, next: i };
}

// ---------- 회화 모드: 팬 사전 ----------
// 뜻은 공식 설정이 아니라 팬들이 장면을 보고 정리한 해석입니다. 자료마다 조금씩 달라서 겹치는 해석을 모았습니다.
export const GLOSSARY = [
  { ko: '야하', ja: 'ヤハ', meanings: ['찾았다!', '신난다', '반가워'], when: '무언가를 찾았을 때, 기쁠 때, 인사할 때, 맞장구칠 때',
    match: /찾았|발견|여깄|여기\s*있|찾은|신나|신난|기쁘|기뻐|야호|만세|반가|안녕|하이$|헬로|좋다$|좋아$/ },
  { ko: '우라', ja: 'ウラ', meanings: ['응', '알았어', '힘내'], when: '긍정하거나 대답할 때, 기합을 넣을 때, 뭔가를 보여줄 때',
    match: /^(응|넵|네|예|그래|오케이|오키|ok|okay|콜|ㅇㅇ|ㅇㅋ)$|^(알았|알겠|그래요|좋아요|그럴게|할게)/i, alt: /힘내|파이팅|화이팅|기합|봐라|이거\s*봐|자\s*봐/ },
  { ko: '하아?', ja: 'ハァ？', meanings: ['뭐?', '왜?', '어?'], when: '놀랐을 때, 되물을 때, 어이없을 때',
    match: /^(뭐|머|왜|엥|뭣|헐|어$|어디|어째|어떻|어쩌|응$|에\?)/, alt: /뭐야|뭐라|뭔데|어째서|어떻게|진짜\?|정말\?|설마|무슨/ },
  { ko: '푸루야', ja: 'プルャ', meanings: ['그치?', '맞지?', '봐봐'], when: '공감을 구할 때, 같이 하자고 할 때',
    match: /그치|그렇지|맞지|그쵸|그죠|봐봐|어때|같이|하자$|할래|할까/ },
  { ko: '프루루루', ja: 'プルルル', meanings: ['최고!', '맛있다', '재밌다'], when: '기쁘고 신나서 입술을 떨 때 (부르르르)',
    match: /최고|대박|짱|맛있|재밌|재미있|설레|두근|행복|신난다|즐거/ },
  { ko: '후응', ja: 'フゥン', meanings: ['맞아', '그렇구나', '흠'], when: '맞장구칠 때, 뿌듯할 때',
    match: /맞아|그렇구나|그렇군|그렇네|그래그래|^음$|^흠|역시|당연|그러게|알지|물론/ },
  { ko: '우라우라', ja: 'ウラウラ', meanings: ['여기저기', '방방곡곡'], once: true, when: '어디 다녀왔냐는 물음에 「츠츠우라우라(津々浦々, 방방곡곡)」라고 답한 장면에서',
    match: /여기저기|방방곡곡|이곳저곳|여행|돌아다|구석구석|여기\s*저기|어디든/ },
  { ko: '야하야하', ja: 'ヤハヤハ', meanings: ['가자!', '달려!'], when: '기세를 올릴 때, 부를 때',
    match: /가자|출발|달려|뛰어|가보자|고고|ㄱㄱ/ },
  { ko: '하앗!', ja: 'ハッ！', meanings: ['헉!', '깜짝이야'], when: '깜짝 놀랐을 때',
    match: /^(헉|깜짝|놀라|으악|앗|어머|엄마야|어이쿠)/ },
  { ko: '우라아!', ja: 'ウラァ！', meanings: ['받아라!', '화났다'], when: '공격할 때, 화났을 때',
    match: /화나|화났|열받|받아라|공격|싸우|때리|죽어|덤벼|으르렁|짜증/ },
  { ko: '하!', ja: 'ハ！', meanings: ['싫어', '아니'], when: '거부하거나 불만일 때',
    match: /싫어|싫다|^아니|안\s*해|안해|됐어|그만|싫/ },
  { ko: '유후후후', ja: 'ユフフフ', meanings: ['생일 축하해'], once: true, when: '생일을 축하할 때',
    match: /생일|축하|생축/ },
  { ko: '푸루야우라우라', ja: 'プルャウラウラ', meanings: ['(해독 불가)'], when: '팬들도 아직 못 푼 말', match: null },
];
// 모르는 말에 끼워 넣는 추임새
const FILLER = [['우라', 'ウラ'], ['야하', 'ヤハ'], ['후응', 'フゥン'], ['푸루야', 'プルャ'], ['프루루', 'プルル'], ['우라아', 'ウラァ'], ['야핫', 'ヤハッ'], ['하아', 'ハァ'], ['우라우라', 'ウラウラ'], ['푸루야우라우라', 'プルャウラウラ']];
const ASK = [['하아?', 'ハァ？'], ['하?', 'ハ？'], ['우라?', 'ウラ？'], ['푸루야?', 'プルャ？']];
const SHOUT = [['야하!', 'ヤハ！'], ['우라!', 'ウラ！'], ['프루루루!', 'プルルル！'], ['야하야하!', 'ヤハヤハ！'], ['우라아!', 'ウラァ！']];

// 한국어 → 우사기어 (회화). 뜻이 맞는 말은 사전에서, 나머지는 추임새로.
export function speak(text, script = 'ko') {
  const c = script === 'ja' ? 1 : 0;
  const word = (e) => (c ? e.ja : e.ko);
  let last = null; // 바로 앞 단어가 쓴 사전 항목
  return text.replace(/\S+/gu, (raw) => {
    const m = raw.match(/^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/su);
    const [, head, core, tail] = m;
    if (!core) return raw;
    const entry = GLOSSARY.find((e) => e.match && (e.match.test(core) || (e.alt && e.alt.test(core))));
    const prev = last;
    last = entry ? { entry, core } : null;
    let pick;
    if (entry) {
      if (entry.once && prev && prev.entry === entry) return head + tail.replace(/^[?？!！]+/, '');
      pick = word(entry);
      // 사전 말이 이미 ?/!로 끝나면 꼬리 부호와 겹치지 않게 합니다
      const t = tail.replace(/^[?？!！]+/, '');
      if (/[?？!！]$/.test(pick)) return head + pick + t;
      if (tail.includes('?')) return head + pick + (c ? '？' : '?') + t.replace(/[?？]/g, '');
      return head + pick + tail;
    }
    const h = hash(core);
    if (tail.includes('?')) pick = ASK[h % ASK.length][c] + tail.replace(/[?？]/g, '');
    else if (tail.includes('!')) pick = SHOUT[h % SHOUT.length][c] + tail.replace(/[!！]/g, '');
    else {
      pick = FILLER[h % FILLER.length][c];
      if (core.length >= 4) pick += ' ' + FILLER[(h >>> 7) % FILLER.length][c];
      pick += tail;
    }
    return head + pick;
  }).replace(/ +([.,!?！？~～])/g, '$1').replace(/ {2,}/g, ' ').replace(/ +$/gm, '');
}

// 우사기어 → 한국어 (회화). 말마다 사전의 첫 뜻을 적고, 쓰인 말의 풀이 목록도 돌려줍니다.
export function gloss(text) {
  const used = new Map();
  const out = text.replace(/[^\s]+/gu, (raw) => {
    const m = raw.match(/^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/su);
    const [, head, core, tail] = m;
    if (!core) return raw;
    const entry = lookup(core, tail);
    if (!entry) return raw;
    used.set(entry.ko, entry);
    const meaning = entry.meanings[0];
    const t = /[?!]$/.test(meaning) ? tail.replace(/^[?？!！~～.。]+/, '') : tail;
    return head + meaning + t;
  });
  return { text: out, used: [...used.values()] };
}

const KANA2KO = [['ヤハ', '야하'], ['ウラ', '우라'], ['プルャ', '푸루야'], ['プルル', '프루루'], ['プル', '푸루'], ['フゥン', '후응'], ['フーン', '후웅'], ['ユフ', '유후'],
  ['ハ', '하'], ['フ', '후'], ['ァ', '아'], ['ッ', '앗'], ['ル', '루'], ['ー', '아'], ['ャ', '야']];
// 표기 차이를 없앱니다: 가타카나 → 한글, 핫 → 하앗, 부르르르/푸루루루 → 프루루, 길게 끈 소리는 짧게.
function normalize(s) {
  let k = s;
  for (const [ja, ko] of KANA2KO) k = k.split(ja).join(ko);
  k = k.replace(/핫/g, '하앗').replace(/얏/g, '야앗').replace(/랏/g, '라앗').replace(/[부푸]/g, '프').replace(/르/g, '루')
    .replace(/[~～ㅡ\-]+/g, '').replace(/아{2,}/g, '아').replace(/(루){3,}/g, '루루').replace(/(후){3,}/g, '후후');
  if (k.length > 2) k = k.replace(/앗$/, '');
  return k;
}
function lookup(core, tail) {
  const q = /[?？]/.test(tail);
  const bang = /[!！]/.test(tail);
  const n = normalize(core);
  let best = null;
  let bestScore = 0;
  for (const e of GLOSSARY) {
    const key = normalize(e.ko.replace(/[?!]$/, ''));
    let score = key === n ? 3 : key + '아' === n || key === n + '아' ? 1 : 0;
    if (!score) continue;
    // 「하」 계열은 부호로 구분합니다: 하아? → 뭐?, 하! → 싫어, 하앗! → 헉
    const wantQ = e.ko.endsWith('?');
    const wantBang = e.ko.endsWith('!');
    if (wantQ === q && (wantBang ? bang : true)) score += 2;
    else if (wantQ && !q) score -= 2;
    if (score > bestScore) { best = e; bestScore = score; }
  }
  return best;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
