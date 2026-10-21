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
// 일본 팬이 정리한 「うさぎ語 訳」 목록과 그것을 옮긴 농담곰 갤러리의 「우사기어 정리」를 그대로 따랐습니다.
// 공식 설정이 아니라 장면을 보고 정리한 해석입니다. match는 한국어 → 우사기어로 옮길 때 찾는 말이고, 글 전체에 순서대로 적용합니다.
const W = (src) => new RegExp(src, 'gu');
export const GLOSSARY = [
  { ko: '야하', ja: 'ヤハ', meanings: ['찾았다!', '응 (맞장구)'], when: '누군가나 어떤 물건을 찾았을 때, 맞장구칠 때',
    match: W('찾았|찾아냈|발견|여깄|여기\\s*있|저기\\s*있|있다!|있네|찾은') },
  { ko: '우라', ja: 'ウラ', meanings: ['최근', '응 (맞장구)'], when: '"최근"이라는 뜻, 맞장구칠 때',
    match: W('최근|요즘|요새|근래|(?<=^|\\s)(응|그래|그렇지|네|넹|예|어)(?=[\\s.,~!]|$)') },
  { ko: '푸루야', ja: 'プルヤ', meanings: ['그치?', '같이 가자', '힘내'], when: '공감을 요구할 때, 초대하거나 따라오라고 할 때, 응원할 때',
    match: W('그치|그쵸|그죠|맞지|같이|따라와|따라오|이리\\s*와|놀자|힘내|파이팅|화이팅|응원|하자(?=[\\s.,~!?]|$)|할래|할까') },
  { ko: '푸루', ja: 'プル', meanings: ['알겠어', '풀 이름'], when: '"알겠어". 어떤 풀(잡초)의 이름이기도 합니다',
    match: W('알았|알겠|오케이|오키|okay|ok|넵|콜(?=[\\s.,~!?]|$)|ㅇㅋ|잡초|풀(?=[\\s.,~!?]|$)') },
  { ko: '우-라-', ja: 'ウーラー', meanings: ['거대하다'], when: '엄청 큰 것을 봤을 때',
    match: W('거대|커다|크다|큰\\s|엄청\\s*크|진짜\\s*크|대형|왕(?=\\S)') },
  { ko: '하아? 하아?', ja: 'ハア？ハア？', meanings: ['왜?'], when: '이유를 물을 때',
    match: W('왜|어째서|어떻게|무슨|뭔데|어쩌다|어찌') },
  { ko: '하아?', ja: 'ハア？', meanings: ['뭐야?', '깜짝'], when: '"뭐야?", 놀랐을 때',
    match: W('뭐|머(?=[야\\s?])|뭣|헐|엥|헉|깜짝|놀라|놀랐|어\\?|진짜\\?|정말\\?|설마|어머|엄마야') },
  { ko: '후응', ja: 'フゥン', meanings: ['맞아'], when: '긍정할 때',
    match: W('맞아|맞다|그렇구나|그렇군|그렇네|그래그래|응응|그러게|당연|물론|역시|^음(?=[\\s.,~!?]|$)|흠') },
  { ko: '쥬르리', ja: 'じゅるり', meanings: ['군침'], when: '식욕이 생길 때',
    match: W('군침|먹고\\s*싶|배고파|배고프|배고픈|맛있겠|침\\s*나|침\\s*흘') },
  { ko: '우라라라라라라아!', ja: 'ウラララララア！', meanings: ['신난다!'], when: '텐션이 올라갈 때',
    match: W('신나|신난|흥분|들뜨|들떴|야호|우와|오예|기대돼|두근') },
  { ko: '야아아아아앗!', ja: 'ヤァアアアッ！', meanings: ['간다!'], when: '기세등등할 때 (1)',
    match: W('간다|받아라|돌격|공격|에잇|이얍|덤벼|싸우|때리') },
  { ko: '하아아아아앗!', ja: 'ハアアアア！', meanings: ['으랏차!'], when: '기세등등할 때 (2)',
    match: W('으랏|영차|으쌰|힘을|힘껏|전력|있는\\s*힘') },
  { ko: '야하야하야하!', ja: 'ヤハヤハヤハ', meanings: ['가자!'], when: '기세등등할 때 (3)',
    match: W('가자|출발|달려|달리|뛰어|가보자|고고|ㄱㄱ|시작') },
  { ko: '야핫! 으핫!', ja: 'ャハッ.ッハッ.', meanings: ['얍!'], when: '기세등등할 때 (4)',
    match: W('얍|얏|읏차|훗|후우(?=[\\s.,~!?]|$)') },
  { ko: '푸루루루루루', ja: 'プルルルルル', meanings: ['즐겁다', '기쁘다'], when: '즐거울 때, 기쁠 때',
    match: W('즐거|즐겁|재밌|재미있|기쁘|기뻐|행복|신기|좋아(?=[\\s.,~!?]|$)|좋다|좋네|최고|대박|짱|만족|웃겨|웃기') },
  { ko: '야푸', ja: 'ヤプ', meanings: ['풍덩'], when: '물속에 들어갈 때', once: true,
    match: W('풍덩|수영|물속|물에\\s*들어|입수|다이빙|바다|계곡|물놀이') },
  { ko: '미야아아', ja: 'みャアアア', meanings: ['어서오세요'], when: '손님을 맞을 때', once: true,
    match: W('어서\\s*오|어서오|환영|웰컴|들어오세요|오세요') },
  { ko: '후으-응', ja: 'フゥーン', meanings: ['흥, 어때?'], when: '득의양양할 때',
    match: W('뿌듯|자랑|역시\\s*나|내가\\s*짱|봤지|어때\\s*나|대단하지|잘했지|나\\s*잘|멋지지|내가\\s*했') },
  { ko: '우-이-', ja: 'ウー.イー.', meanings: ['모르겠어'], when: '풀리지 않을 때',
    match: W('모르겠|몰라|모름|모르|어려워|어렵|못\\s*풀|글쎄|헷갈') },
  { ko: '이-', ja: 'イ～', meanings: ['이거 봐봐'], when: '보여주고 싶을 때',
    match: W('봐봐|이거\\s*봐|이것\\s*봐|봐\\s*봐|보세요|봐라|보여줄|보여\\s*줄|여기\\s*봐') },
  { ko: '하앗핫!', ja: 'ハアッハッ', meanings: ['(춤)'], when: '춤출 때',
    match: W('춤|댄스|흔들|들썩') },
  { ko: '유후후후후후후후후후~', ja: 'ユフフフフフフフフゥ～', meanings: ['생일 축하해'], when: '생일 축하 노래', once: true,
    match: W('생일|생축|축하') },
  { ko: '우아', ja: 'ウア', meanings: ['맛있다'], when: '맛있을 때',
    match: W('맛있|맛나|꿀맛|존맛|맛좋|맛이\\s*좋|JMT') },
  { ko: '우로루', ja: 'ウロル', meanings: ['달고 맛있다'], when: '달콤한 것을 먹을 때',
    match: W('달다|달콤|달아|달달|달고') },
  { ko: '츠츠우라우라', ja: 'ツツウラウラ', meanings: ['방방곡곡'], when: '어디 다녀왔냐는 물음에 「津々浦々(방방곡곡)」라고 답한 장면에서', once: true,
    match: W('방방곡곡|여기저기|이곳저곳|여행|돌아다|구석구석|여기\\s*저기|어디든|곳곳') },
  { ko: '샤아아아우라라라랏세에-', ja: 'シャアアアゥララララッセェー', meanings: ['어서오세요 (2)'], when: '손님을 맞을 때', match: null },
  { ko: '푸루야우라우라', ja: 'プルャウラウラ', meanings: ['(해독 불가)'], when: '팬들도 아직 못 푼 말', match: null },
  // 효과음 계열 (우사기 말풍선에서 난 소리)
  { ko: '사쿳', ja: 'サクッ', meanings: ['바삭'], when: '쿠키 같은 것을 먹을 때', sfx: true, once: true, match: W('바삭|쿠키|과자|비스킷|크래커') },
  { ko: '즈고쿳', ja: 'ズゴクッ', meanings: ['쭈욱'], when: '빙수 남은 국물을 마실 때', sfx: true, match: W('빙수|쭈욱|들이켜|원샷|쭉\\s*마') },
  { ko: '슛', ja: 'シュッ', meanings: ['쏙'], when: '혀를 집어넣을 때', sfx: true, match: W('혀를|쏙|메롱') },
  { ko: '후와리', ja: 'フワリ', meanings: ['살랑살랑'], when: '꼬리를 흔들 때', sfx: true, match: W('꼬리|살랑|폴짝|팔랑') },
  { ko: '하굿', ja: 'ハグッ', meanings: ['냠'], when: '밥 같은 것을 먹을 때', sfx: true, once: true, match: W('냠|먹자|먹어|먹는|먹을|밥|식사|한입|한\\s*입') },
  { ko: '무샤무샷', ja: 'むしゃムシャッ', meanings: ['우물우물'], when: '씹는 소리', sfx: true, match: W('우물우물|오물오물|씹|쩝쩝') },
  { ko: '조조조', ja: 'ぞぞぞ', meanings: ['후루룩'], when: '메밀국수를 먹을 때', sfx: true, match: W('후루룩|소바|메밀|국수|면(?=[\\s.,~!?]|$)|라면|우동') },
  { ko: '쥬.페로..', ja: 'ジュ.ペロ..', meanings: ['할짝'], when: '핥을 때', sfx: true, match: W('핥|할짝|날름') },
  { ko: '푸룻푸랏', ja: 'プルップラッ', meanings: ['(자랑)'], when: '자랑할 때', sfx: true, match: W('자랑해|자랑이|으쓱|뽐내') },
];
// 사전에 없는 말에 끼워 넣는 추임새
const FILLER = [['우라', 'ウラ'], ['야하', 'ヤハ'], ['후응', 'フゥン'], ['푸루야', 'プルヤ'], ['푸루', 'プル'], ['하아', 'ハア'], ['야핫', 'ャハッ'], ['우라우라', 'ウラウラ'], ['푸루루', 'プルル'], ['이-', 'イ～']];
const ASK = [['하아?', 'ハア？'], ['하아? 하아?', 'ハア？ハア？'], ['우라?', 'ウラ？'], ['푸루야?', 'プルヤ？']];
const SHOUT = [['야하!', 'ヤハ！'], ['우라!', 'ウラ！'], ['야아아아아앗!', 'ヤァアアアッ！'], ['하아아아아앗!', 'ハアアアア！'], ['야하야하야하!', 'ヤハヤハヤハ！'], ['우라라라라라라아!', 'ウラララララア！']];

const PH = (i) => `${i}`;
const PH_RE = /(\d+)/u;

// 한국어 → 우사기어 (회화). 사전에 맞는 말은 사전대로, 나머지 말은 추임새로.
export function speak(text, script = 'ko') {
  const c = script === 'ja' ? 1 : 0;
  const word = (e) => (c ? e.ja : e.ko);
  // 1) 글 전체에서 사전의 말을 찾아 자리표로 바꿉니다 (긴 말, 구체적인 말이 먼저 오도록 사전 순서를 둡니다)
  let marked = text;
  GLOSSARY.forEach((e, i) => { if (e.match) marked = marked.replace(e.match, PH(i)); });
  // 2) 말마다 자리표면 사전 말로, 아니면 추임새로
  let last = null;
  return marked.replace(/\S+/gu, (raw) => {
    const m = raw.match(/^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/su);
    const [, head, core, tail] = m;
    if (!core) return raw;
    const ph = core.match(PH_RE);
    const entry = ph ? GLOSSARY[+ph[1]] : null;
    const prev = last;
    last = entry;
    if (entry) {
      if (entry.once && prev === entry) return head + tail.replace(/^[?？!！]+/, '');
      const pick = word(entry);
      const t = tail.replace(/^[?？!！]+/, '');
      if (/[?？!！~～]$/.test(pick)) return head + pick + t;
      if (/[?？]/.test(tail)) return head + pick + (c ? '？' : '?') + t;
      if (/[!！]/.test(tail)) return head + pick + (c ? '！' : '!') + t;
      return head + pick + tail;
    }
    const h = hash(core);
    let pick;
    if (/[?？]/.test(tail)) pick = ASK[h % ASK.length][c] + tail.replace(/[?？]/g, '');
    else if (/[!！]/.test(tail)) pick = SHOUT[h % SHOUT.length][c] + tail.replace(/[!！]/g, '');
    else {
      pick = FILLER[h % FILLER.length][c];
      if (core.length >= 4) pick += ' ' + FILLER[(h >>> 7) % FILLER.length][c];
      pick += tail;
    }
    return head + pick;
  }).replace(/ +([.,!?！？~～])/g, '$1').replace(/ {2,}/g, ' ').replace(/ +$/gm, '');
}

// 우사기어 → 한국어 (회화). 말마다 사전의 첫 뜻을 적고, 쓰인 말의 풀이 목록도 돌려줍니다.
// 하이픈·물결(우-라-, 이-)은 말의 일부로 보고, 꼬리의 ?!.,만 부호로 봅니다.
const SPLIT = /^([^\p{L}\p{N}\-ー～~]*)(.*?)([?？!！,，、.。;；:：…"'」』）)\]]*)$/su;
export function gloss(text) {
  const used = new Map();
  // 「ハア？ハア？」처럼 부호 뒤에 바로 글자가 이어지면 띄웁니다
  const words = text.replace(/([?？!！])(?=[\p{L}])/gu, '$1 ').split(/(\s+)/u);
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w || /^\s+$/u.test(w)) { out.push(w); continue; }
    let hit = null;
    if (i + 2 < words.length && /^\s+$/u.test(words[i + 1])) hit = lookupWords([w, words[i + 2]]);
    if (hit) { out.push(renderGloss(hit)); used.set(hit.entry.ko, hit.entry); i += 2; continue; }
    hit = lookupWords([w]);
    if (hit) { out.push(renderGloss(hit)); used.set(hit.entry.ko, hit.entry); continue; }
    out.push(w);
  }
  return { text: out.join(''), used: [...used.values()] };
}
function renderGloss({ entry, head, tail }) {
  const meaning = entry.meanings[0];
  const t = /[?!)]$/.test(meaning) ? tail.replace(/^[?？!！.。]+/, '') : tail;
  return head + meaning + t;
}
function lookupWords(ws) {
  const parts = ws.map((w) => w.match(SPLIT));
  const cores = parts.map((p) => p[2]);
  if (cores.some((x) => !x)) return null;
  const q = parts.some((p) => /[?？]/.test(p[3]));
  const bang = parts.some((p) => /[!！]/.test(p[3]));
  const n = cores.map(normalize).join('');
  if (!n) return null;
  let best = null;
  let bestScore = 0;
  for (const e of GLOSSARY) {
    const key = e.ko.split(' ').map(normalize).join('');
    let score = key === n ? 3 : key + '아' === n || key === n + '아' ? 1 : 0;
    if (!score) continue;
    // 하아? (뭐야?) · 하아아아아앗! (으랏차) 처럼 같은 소리는 부호로 가립니다
    if (e.ko.includes('?')) score += q ? 2 : -1;
    if (e.ko.includes('!')) score += bang ? 2 : -2;
    if (score > bestScore) { best = e; bestScore = score; }
  }
  return best ? { entry: best, head: parts[0][1], tail: parts[parts.length - 1][3] } : null;
}

// 표기 차이를 없앱니다: 가나 → 한글, 받침 ㅅ과 ッ은 무시, 푸/프/부 → 푸, 길게 끈 소리는 두 번까지만, 끝의 긴소리 표시는 뺌.
const KANA2KO = [['フゥーン', '후으ー응'], ['フゥン', '후응'], ['フゥ', '후'], ['ツツ', '츠츠'], ['シャ', '샤'], ['しゃ', '샤'], ['セェ', '세에'], ['じゅ', '쥬'], ['ジュ', '쥬'], ['ペロ', '페로'],
  ['サク', '사쿠'], ['ズゴク', '즈고쿠'], ['シュ', '슈'], ['ワリ', '와리'], ['プルャ', '푸루야'], ['プルヤ', '푸루야'], ['プル', '푸루'], ['ユフ', '유후'],
  ['ヤハ', '야하'], ['ャハ', '야하'], ['ウラ', '우라'], ['ハ', '하'], ['は', '하'], ['フ', '후'], ['ァ', '아'], ['ア', '아'], ['ル', '루'], ['る', '루'], ['り', '리'],
  ['ャ', '야'], ['ヤ', '야'], ['ウ', '우'], ['ラ', '라'], ['イ', '이'], ['プ', '푸'], ['ロ', '로'], ['ミ', '미'], ['み', '미'], ['ぐ', '구'], ['グ', '구'], ['む', '무'], ['ム', '무'], ['ぞ', '조'],
  ['ゥ', '우'], ['ェ', '에'], ['〜', 'ー'], ['～', 'ー'], ['-', 'ー'], ['－', 'ー'], ['~', 'ー']];
const BATCHIM = { 핫: '하', 얏: '야', 랏: '라', 룻: '루', 쿳: '쿠', 굿: '구', 슛: '슈', 샷: '샤', 앗: '아' };
function normalize(s) {
  let k = s.replace(/(^|[.。])ッハ/g, '$1으하'); // ッハッ(으핫)
  for (const [ja, ko] of KANA2KO) k = k.split(ja).join(ko);
  k = k.replace(/[핫얏랏룻쿳굿슛샷앗ッ]/g, (ch) => BATCHIM[ch] ?? '').replace(/[부프]/g, '푸').replace(/르/g, '루').replace(/[.。?？!！]/g, '')
    .replace(/(.)\1+/gu, '$1$1').replace(/ー+/g, 'ー').replace(/ー$/, '');
  return k;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
