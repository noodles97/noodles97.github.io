// 가나(가타카나·히라가나) → 한글 읽기. 우사기 말을 한국어로 읽을 때 참고하기 위한 것이라
// 외래어 표기법보다 팬들이 쓰는 표기(ハ→하, ッ→받침 ㅅ, ァ→아, ー→-)를 따릅니다.

// 자모 번호: 초성 ㄱ0 ㄲ1 ㄴ2 ㄷ3 ㄸ4 ㄹ5 ㅁ6 ㅂ7 ㅃ8 ㅅ9 ㅆ10 ㅇ11 ㅈ12 ㅉ13 ㅊ14 ㅋ15 ㅌ16 ㅍ17 ㅎ18
// 중성 ㅏ0 ㅐ1 ㅑ2 ㅒ3 ㅓ4 ㅔ5 ㅕ6 ㅖ7 ㅗ8 ㅘ9 ㅙ10 ㅚ11 ㅛ12 ㅜ13 ㅝ14 ㅞ15 ㅟ16 ㅠ17 ㅡ18 ㅢ19 ㅣ20
const A = 0, I = 20, U = 13, E = 5, O = 8, YA = 2, YU = 17, YO = 12, EU = 18;
const ROWS = {
  ア: [11, [A, I, U, E, O]], カ: [15, [A, I, U, E, O]], ガ: [0, [A, I, U, E, O]], サ: [9, [A, I, EU, E, O]], ザ: [12, [A, I, EU, E, O]],
  タ: [16, [A, I, EU, E, O]], ダ: [3, [A, I, EU, E, O]], ナ: [2, [A, I, U, E, O]], ハ: [18, [A, I, U, E, O]], バ: [7, [A, I, U, E, O]],
  パ: [17, [A, I, U, E, O]], マ: [6, [A, I, U, E, O]], ラ: [5, [A, I, U, E, O]],
};
const KANA = {};
const order = ['アイウエオ', 'カキクケコ', 'ガギグゲゴ', 'サシスセソ', 'ザジズゼゾ', 'タチツテト', 'ダヂヅデド', 'ナニヌネノ', 'ハヒフヘホ', 'バビブベボ', 'パピプペポ', 'マミムメモ', 'ラリルレロ'];
const rowKeys = Object.keys(ROWS);
order.forEach((kana, r) => [...kana].forEach((k, v) => { const [cho, vowels] = ROWS[rowKeys[r]]; KANA[k] = [cho, vowels[v]]; }));
Object.assign(KANA, { チ: [14, I], ツ: [14, EU], ヂ: [12, I], ヅ: [12, EU], シ: [9, I], ジ: [12, I], ヤ: [11, YA], ユ: [11, YU], ヨ: [11, YO], ワ: [11, 9], ヲ: [11, O], ヴ: [7, U],
  ャ: [11, YA], ュ: [11, YU], ョ: [11, YO], ァ: [11, A], ィ: [11, I], ゥ: [11, U], ェ: [11, E], ォ: [11, O], ヮ: [11, 9] });
// 요음: 앞 글자의 초성에 ㅑㅠㅛ를 붙입니다. 치/지 계열은 차/주/조.
const YOON = { ャ: YA, ュ: YU, ョ: YO };
const SMALL_V = { ァ: A, ィ: I, ゥ: U, ェ: E, ォ: O };
const syl = (cho, jung, jong = 0) => String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong);
const isHangul = (ch) => ch >= '가' && ch <= '힣';
const parts = (ch) => { const s = ch.charCodeAt(0) - 0xac00; return [Math.floor(s / 588), Math.floor((s % 588) / 28), s % 28]; };

export function kanaToHangul(text) {
  // 히라가나는 가타카나로
  const t = text.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
  let out = '';
  let prevKana = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    const last = out[out.length - 1];
    if (ch === 'ッ') {
      if (last && isHangul(last)) { const [c, v, j] = parts(last); out = out.slice(0, -1) + syl(c, v, j || 19); } // 받침 ㅅ
      else out += '으';
      prevKana = ch;
    } else if (ch === 'ン') {
      if (last && isHangul(last)) { const [c, v, j] = parts(last); out = out.slice(0, -1) + (j ? last + '은' : syl(c, v, 4)); }
      else out += '은';
      prevKana = ch;
    } else if (ch === 'ー') { out += '-'; prevKana = ch; }
    else if (ch === '〜' || ch === '～') { out += '~'; prevKana = ch; }
    else if (YOON[ch] !== undefined && last && isHangul(last) && prevKana && KANA[prevKana] && KANA[prevKana][1] === I) {
      // キャ 캬, シャ 샤, チャ 차, ジャ 자, ニャ 냐, リャ 랴 ...
      const [c] = parts(last);
      out = out.slice(0, -1) + syl(c, YOON[ch]);
      prevKana = ch;
    } else if (SMALL_V[ch] !== undefined && last && isHangul(last) && ((prevKana === 'フ' && ch !== 'ゥ') || (prevKana === 'テ' && ch === 'ィ') || (prevKana === 'デ' && ch === 'ィ') || (prevKana === 'ウ' && ch !== 'ゥ') || (prevKana === 'ト' && ch === 'ゥ') || (prevKana === 'ド' && ch === 'ゥ') || (prevKana === 'ヴ'))) {
      // ファ 파, ティ 티, ウェ 웨, トゥ 투 ...
      const [c] = parts(last);
      const cho = prevKana === 'フ' ? 17 : prevKana === 'ウ' ? 11 : prevKana === 'ヴ' ? 7 : c;
      const v = prevKana === 'ウ' ? { ィ: 16, ェ: 15, ォ: 14 }[ch] : SMALL_V[ch];
      out = out.slice(0, -1) + syl(cho, v);
      prevKana = ch;
    } else if (KANA[ch]) { out += syl(...KANA[ch]); prevKana = ch; }
    else { out += ch; prevKana = ''; }
  }
  return out;
}
