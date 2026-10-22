// 포켓 밴드 시퀀서. 페이지 템플릿은 _includes/pocket-band.html, 문구는 아래 I18N. 언어는 <html lang> 을 따릅니다.
(function(){
'use strict';
const STEPS_PER_BAR = 16, CELL_W = 26, ROW_H = 20, KEY_W = 64, RULER_H = 28;
const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BLACK = {1:1,3:1,6:1,8:1,10:1};
const DRUMS = [{n:49},{n:51},{n:46},{n:42},{n:50},{n:45},{n:39},{n:38},{n:36}];
const TRACKS = [
  {id:'guitar', cssVar:'--c-guitar', low:40, high:81, program:27, channel:0},
  {id:'bass',   cssVar:'--c-bass',   low:28, high:62, program:33, channel:1},
  {id:'keys',   cssVar:'--c-keys',   low:36, high:96, program:4,  channel:2},
  {id:'drums',  cssVar:'--c-drums',  drum:true, channel:9}
];
const STORE_KEY = 'pocket-band-v1';

// ---------- 다국어 ----------
const I18N = {
  ko:{
    brand:'포켓 밴드 시퀀서', brand_sub:'기타 · 베이스 · 키보드 · 드럼', title:'포켓 밴드 시퀀서',
    play:'재생', stop:'정지', loop:'반복', bars:'마디', draw:'그리기', erase:'지우기', scroll:'스크롤',
    clear:'트랙 비우기', clear_confirm:'정말요? 다시 클릭', cleared:'{name} 트랙을 비웠어요',
    midi:'MIDI 내보내기', save:'프로젝트 저장', load:'불러오기', load_file:'프로젝트 파일 선택', help:'도움말', close:'닫기',
    edit_mode:'편집 모드', tracks:'트랙', roll:'피아노롤',
    status_idle:'빈 칸을 클릭한 뒤 옆으로 끌면 음이 생겨요',
    track:{guitar:'기타',bass:'베이스',keys:'키보드',drums:'드럼'},
    drum:{49:'크래시',51:'라이드',46:'오픈 햇',42:'하이햇',50:'하이 탐',45:'로우 탐',39:'클랩',38:'스네어',36:'킥'},
    mute:'음소거', unmute:'음소거 해제', volume:'볼륨',
    desc:(name,bar,beat,len)=>`<b>${name}</b> · ${bar}마디 ${beat}박 · 길이 ${len}박`,
    no_notes:'먼저 음을 하나 이상 그려 주세요',
    midi_saved:'MIDI 파일(pocket-band.mid)을 저장했어요', midi_saved_zip:'MIDI 파일을 zip으로 저장했어요. 압축을 풀면 pocket-band.mid가 나옵니다.',
    saved:'프로젝트를 저장했어요', loaded:'불러왔어요',
    load_err:'프로젝트 파일을 읽지 못했어요. 이 앱에서 저장한 .json 파일인지 확인해 주세요.',
    save_err:'저장하지 못했어요: ', unknown_err:'알 수 없는 오류', no_audio:'이 브라우저에서는 소리를 낼 수 없어요',
    help_title:'사용법',
    help_items:[
      '<b>트랙 고르기</b> 왼쪽 카드를 누르거나 숫자 키 1~4를 누르세요. 다른 트랙의 음은 연하게 겹쳐 보여요.',
      '<b>음 그리기</b> 빈 칸을 누른 채 옆으로 끌면 길이, 위아래로 끌면 음정이 정해져요.',
      '<b>고치기</b> 음을 끌면 이동, 오른쪽 끝을 끌면 길이 조절. 더블클릭이나 오른쪽 클릭, 또는 지우기 모드로 삭제해요.',
      '<b>드럼</b> 줄 하나가 악기 하나예요. 옆으로 끌면 연속 타격이 찍혀요.',
      '<b>듣기</b> 왼쪽 건반을 누르면 미리 들을 수 있고, 스페이스바로 재생/정지해요. D·E·S 키로 모드를 바꿔요.',
      '<b>내보내기</b> 표준 MIDI 파일(.mid)로 저장해 DAW나 GarageBand에서 열 수 있어요. 프로젝트는 .json으로 저장하고 불러올 수 있고, 브라우저에도 자동 저장돼요.'
    ],
    help_note:'폰에서는 그리기 모드일 때 격자를 쓸어도 스크롤되지 않아요. 스크롤 모드로 바꾸거나 왼쪽 건반 열을 쓸어 주세요. 삭제는 지우기 모드가 확실해요.'
  },
  en:{
    brand:'Pocket Band Sequencer', brand_sub:'Guitar · Bass · Keys · Drums', title:'Pocket Band Sequencer',
    play:'Play', stop:'Stop', loop:'Loop', bars:'Bars', draw:'Draw', erase:'Erase', scroll:'Scroll',
    clear:'Clear track', clear_confirm:'Sure? Click again', cleared:'Cleared the {name} track',
    midi:'Export MIDI', save:'Save project', load:'Load', load_file:'Choose a project file', help:'Help', close:'Close',
    edit_mode:'Edit mode', tracks:'Tracks', roll:'Piano roll',
    status_idle:'Click an empty cell and drag sideways to add a note',
    track:{guitar:'Guitar',bass:'Bass',keys:'Keys',drums:'Drums'},
    drum:{49:'Crash',51:'Ride',46:'Open hat',42:'Hi-hat',50:'Hi tom',45:'Low tom',39:'Clap',38:'Snare',36:'Kick'},
    mute:'Mute', unmute:'Unmute', volume:'Volume',
    desc:(name,bar,beat,len)=>`<b>${name}</b> · bar ${bar} beat ${beat} · ${len} beat${len==1?'':'s'}`,
    no_notes:'Draw at least one note first',
    midi_saved:'Saved the MIDI file (pocket-band.mid)', midi_saved_zip:'Saved the MIDI file as a zip. Unzip it to get pocket-band.mid.',
    saved:'Project saved', loaded:'Project loaded',
    load_err:'Could not read that file. Make sure it is a .json project saved from this app.',
    save_err:'Could not save: ', unknown_err:'unknown error', no_audio:'This browser cannot play sound',
    help_title:'How to use',
    help_items:[
      '<b>Pick a track</b> Click a card on the left or press 1–4. Notes from other tracks show faintly behind.',
      '<b>Draw a note</b> Press an empty cell and drag sideways for length, up or down for pitch.',
      '<b>Edit</b> Drag a note to move it, drag its right edge to resize. Delete with double-click, right-click, or Erase mode.',
      '<b>Drums</b> Each row is an instrument. Drag sideways to paint repeated hits.',
      '<b>Listen</b> Press a key on the left to preview it. Space plays and stops. D, E and S switch modes.',
      '<b>Export</b> Save a standard MIDI file (.mid) and open it in any DAW or GarageBand. Projects save and load as .json, and the browser keeps your work automatically.'
    ],
    help_note:'On a phone, swiping the grid in Draw mode will not scroll. Switch to Scroll mode or swipe the key column on the left. Use Erase mode to delete.'
  }
};
let lang = 'ko';
const t = k => I18N[lang][k];
function trackName(i){ return I18N[lang].track[TRACKS[i].id]; }
function drumLabel(n){ return I18N[lang].drum[n] || String(n); }
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{ el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = t(el.dataset.i18nTitle); });
  $('playLabel').textContent = playing? t('stop') : t('play');
  $('helpTitle').textContent = t('help_title');
  $('helpList').innerHTML = t('help_items').map(s=>`<li>${s}</li>`).join('');
  $('helpNote').textContent = t('help_note');
  if(!clearArmed) $('clearLabel').textContent = t('clear');
  setStatus(t('status_idle'));
  if(state){ renderRail(); layout(); }
}

// ---------- 상태 ----------
let state = null, active = 0, mode = 'draw';
function demoState(){
  const g=[], b=[], k=[], d=[];
  const chords = [[57,60,64],[53,57,60],[60,64,67],[55,59,62]];
  const bassRoots = [33,29,36,31];
  chords.forEach((ch,i)=>{
    const s=i*16;
    ch.forEach(p=>{ k.push({p,s,l:6}); k.push({p,s:s+8,l:6}); });
    b.push({p:bassRoots[i],s,l:3}); b.push({p:bassRoots[i],s:s+6,l:2}); b.push({p:bassRoots[i]+7,s:s+10,l:2}); b.push({p:bassRoots[i],s:s+12,l:3});
    for(let q=0;q<16;q+=2) d.push({p:42,s:s+q,l:1});
    d.push({p:36,s,l:1}); d.push({p:36,s:s+10,l:1}); d.push({p:38,s:s+4,l:1}); d.push({p:38,s:s+12,l:1});
  });
  d.push({p:49,s:0,l:1});
  const mel=[[64,0,2],[67,2,2],[69,4,4],[72,8,4],[69,12,4],[65,16,4],[64,20,2],[62,22,2],[60,24,8],[64,32,2],[67,34,2],[72,36,4],[71,40,4],[69,44,4],[67,48,6],[64,54,2],[62,56,8]];
  mel.forEach(([p,s,l])=>g.push({p,s,l}));
  return {bpm:100, bars:4, loop:true, tracks:[{notes:g,vol:.8,mute:false},{notes:b,vol:.9,mute:false},{notes:k,vol:.55,mute:false},{notes:d,vol:.8,mute:false}]};
}
function sanitize(s){
  const out = {bpm:100,bars:4,loop:true,tracks:[]};
  if(s && typeof s==='object'){
    if(Number.isFinite(+s.bpm)) out.bpm = Math.min(240,Math.max(40,Math.round(+s.bpm)));
    if([1,2,4,8].includes(+s.bars)) out.bars = +s.bars;
    out.loop = s.loop!==false;
  }
  for(let i=0;i<4;i++){
    const tr = (s && Array.isArray(s.tracks) && s.tracks[i]) || {};
    const notes = Array.isArray(tr.notes)? tr.notes.filter(n=>n&&Number.isFinite(+n.p)&&Number.isFinite(+n.s)&&Number.isFinite(+n.l)).map(n=>({p:+n.p|0,s:+n.s|0,l:Math.max(1,+n.l|0)})) : [];
    out.tracks.push({notes, vol: Number.isFinite(+tr.vol)? Math.min(1,Math.max(0,+tr.vol)) : .8, mute: !!tr.mute});
  }
  return out;
}
function persist(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){} }
function totalSteps(){ return state.bars*STEPS_PER_BAR; }
function rowsOf(ti){ const T=TRACKS[ti]; return T.drum? DRUMS.length : (T.high-T.low+1); }
function rowToPitch(ti,r){ const T=TRACKS[ti]; return T.drum? DRUMS[r].n : T.high - r; }
function pitchToRow(ti,p){ const T=TRACKS[ti]; if(T.drum) return DRUMS.findIndex(d=>d.n===p); const r=T.high-p; return (r<0||r>=rowsOf(ti))? -1 : r; }
function noteName(p){ return NAMES[p%12] + (Math.floor(p/12)-1); }
function cssVal(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function colorOf(ti){ return cssVal(TRACKS[ti].cssVar); }

// ---------- DOM ----------
const $ = id=>document.getElementById(id);
const roll=$('roll'), sheet=$('sheet'), rulerC=$('ruler'), keysC=$('keys'), notesC=$('notes'), playheadEl=$('playhead'), statusEl=$('status'), toastEl=$('toast');
let toastTimer=null;
function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2800); }
function setStatus(html){ statusEl.innerHTML = html; }

function sizeCanvas(c, w, h){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  c.width = Math.round(w*dpr); c.height = Math.round(h*dpr);
  c.style.width = w+'px'; c.style.height = h+'px';
  const ctx = c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); return ctx;
}
function layout(){
  const cols = totalSteps(), rows = rowsOf(active);
  const W = cols*CELL_W, H = rows*ROW_H;
  sheet.style.gridTemplateColumns = KEY_W+'px '+W+'px';
  sheet.style.gridTemplateRows = RULER_H+'px '+H+'px';
  sheet.style.width = (KEY_W+W)+'px'; sheet.style.height = (RULER_H+H)+'px';
  $('corner').style.width=KEY_W+'px'; $('corner').style.height=RULER_H+'px';
  drawRuler(); drawKeys(); drawNotes();
}
function drawRuler(){
  const cols=totalSteps(), W=cols*CELL_W;
  const ctx=sizeCanvas(rulerC,W,RULER_H);
  ctx.fillStyle=cssVal('--panel'); ctx.fillRect(0,0,W,RULER_H);
  ctx.strokeStyle=cssVal('--line2'); ctx.beginPath(); ctx.moveTo(0,RULER_H-.5); ctx.lineTo(W,RULER_H-.5); ctx.stroke();
  ctx.textBaseline='alphabetic';
  for(let s=0;s<=cols;s++){
    const x=s*CELL_W+.5, isBar=s%STEPS_PER_BAR===0, isBeat=s%4===0;
    ctx.strokeStyle = isBar? cssVal('--line3') : cssVal('--line2');
    ctx.beginPath(); ctx.moveTo(x, isBar? 8 : isBeat? RULER_H-10 : RULER_H-5); ctx.lineTo(x,RULER_H); ctx.stroke();
    if(isBar && s<cols){ ctx.fillStyle=cssVal('--fg'); ctx.font='600 12px '+cssVal('--font-disp'); ctx.fillText(String(s/STEPS_PER_BAR+1), x+5, 17); }
    else if(isBeat && s<cols){ ctx.fillStyle=cssVal('--muted'); ctx.font='500 10px '+cssVal('--font-mono'); ctx.fillText(String((s%STEPS_PER_BAR)/4+1), x+4, RULER_H-13); }
  }
}
function drawKeys(){
  const rows=rowsOf(active), H=rows*ROW_H, T=TRACKS[active];
  const ctx=sizeCanvas(keysC,KEY_W,H);
  ctx.textBaseline='middle';
  for(let r=0;r<rows;r++){
    const y=r*ROW_H, p=rowToPitch(active,r);
    const black = !T.drum && BLACK[p%12];
    ctx.fillStyle = black? cssVal('--fg') : cssVal('--white');
    ctx.fillRect(0,y,KEY_W,ROW_H);
    ctx.strokeStyle=cssVal('--line'); ctx.beginPath(); ctx.moveTo(0,y+ROW_H-.5); ctx.lineTo(KEY_W,y+ROW_H-.5); ctx.stroke();
    ctx.font = '500 11px ' + (T.drum? cssVal('--font-ui') : cssVal('--font-mono'));
    const label = T.drum? drumLabel(p) : noteName(p);
    ctx.fillStyle = black? cssVal('--bg') : (T.drum || p%12===0)? cssVal('--fg') : cssVal('--muted');
    ctx.fillText(label, 8, y+ROW_H/2+.5);
  }
  ctx.strokeStyle=cssVal('--line2'); ctx.beginPath(); ctx.moveTo(KEY_W-.5,0); ctx.lineTo(KEY_W-.5,H); ctx.stroke();
}
function drawNotes(){
  const cols=totalSteps(), rows=rowsOf(active), W=cols*CELL_W, H=rows*ROW_H, T=TRACKS[active];
  const ctx=sizeCanvas(notesC,W,H);
  for(let r=0;r<rows;r++){
    const p=rowToPitch(active,r);
    const shade = T.drum? (r%2===1) : BLACK[p%12];
    ctx.fillStyle = shade? cssVal('--blackkey') : cssVal('--panel');
    ctx.fillRect(0,r*ROW_H,W,ROW_H);
  }
  ctx.lineWidth=1;
  for(let r=0;r<=rows;r++){ const y=r*ROW_H+.5; const p=r<rows? rowToPitch(active,r):-1; ctx.strokeStyle = (!T.drum && p%12===11)? cssVal('--line2') : cssVal('--line'); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  for(let s=0;s<=cols;s++){ const x=s*CELL_W+.5; ctx.strokeStyle = s%STEPS_PER_BAR===0? cssVal('--line3') : s%4===0? cssVal('--line2') : cssVal('--line'); ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  if(!T.drum){
    TRACKS.forEach((ot,oi)=>{
      if(oi===active || ot.drum) return;
      ctx.globalAlpha=.22; ctx.fillStyle=colorOf(oi);
      state.tracks[oi].notes.forEach(n=>{ const r=pitchToRow(active,n.p); if(r<0) return; ctx.fillRect(n.s*CELL_W+2, r*ROW_H+6, n.l*CELL_W-4, ROW_H-12); });
      ctx.globalAlpha=1;
    });
  }
  const col=colorOf(active);
  ctx.font='500 10px '+cssVal('--font-mono'); ctx.textBaseline='middle';
  state.tracks[active].notes.forEach(n=>{
    const r=pitchToRow(active,n.p); if(r<0) return;
    const x=n.s*CELL_W+1.5, y=r*ROW_H+2.5, w=n.l*CELL_W-3, h=ROW_H-5;
    ctx.fillStyle=col; ctx.beginPath(); ctx.roundRect(x,y,w,h,3); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.stroke();
    if(!T.drum){ ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fillRect(x+w-5,y+3,2,h-6); }
    if(!T.drum && w>30){ ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillText(noteName(n.p), x+5, y+h/2+.5); }
  });
}

// ---------- 편집 ----------
let drag=null;
function hitNote(step,row){
  const notes=state.tracks[active].notes;
  for(let i=notes.length-1;i>=0;i--){ const n=notes[i]; if(pitchToRow(active,n.p)===row && step>=n.s && step<n.s+n.l) return n; }
  return null;
}
function removeOverlaps(keep){
  const notes=state.tracks[active].notes;
  for(let i=notes.length-1;i>=0;i--){ const n=notes[i]; if(n!==keep && n.p===keep.p && n.s<keep.s+keep.l && keep.s<n.s+n.l) notes.splice(i,1); }
}
function describe(n){
  const T=TRACKS[active]; const name = T.drum? drumLabel(n.p) : noteName(n.p);
  const beats=n.l/4, len = beats%1===0? beats : beats.toFixed(2);
  return I18N[lang].desc(name, Math.floor(n.s/STEPS_PER_BAR)+1, Math.floor((n.s%STEPS_PER_BAR)/4)+1, len);
}
function posFromEvent(e){
  const rect=notesC.getBoundingClientRect();
  const x=e.clientX-rect.left, y=e.clientY-rect.top;
  return { step: Math.max(0,Math.min(totalSteps()-1,Math.floor(x/CELL_W))), row: Math.max(0,Math.min(rowsOf(active)-1,Math.floor(y/ROW_H))), x };
}
notesC.addEventListener('contextmenu', e=>e.preventDefault());
notesC.addEventListener('pointerdown', e=>{
  if(mode==='scroll') return;
  if(e.button!==0 && e.button!==2) return;
  e.preventDefault();
  const {step,row,x}=posFromEvent(e);
  const T=TRACKS[active], notes=state.tracks[active].notes;
  const hit=hitNote(step,row);
  if(mode==='erase' || e.button===2){
    if(hit){ notes.splice(notes.indexOf(hit),1); drag={kind:'erase'}; notesC.setPointerCapture(e.pointerId); afterEdit(); }
    return;
  }
  notesC.setPointerCapture(e.pointerId);
  if(hit){
    const endX=(hit.s+hit.l)*CELL_W;
    if(!T.drum && x>endX-8){ drag={kind:'resize',n:hit}; }
    else { drag={kind:'move',n:hit,offStep:step-hit.s,lastRow:row}; }
    preview(hit.p); setStatus(describe(hit)); return;
  }
  const n={p:rowToPitch(active,row), s:step, l:1};
  notes.push(n);
  drag={kind:'create',n,startStep:step,lastRow:row};
  preview(n.p); afterEdit(); setStatus(describe(n));
});
notesC.addEventListener('pointermove', e=>{
  if(!drag) return;
  const {step,row}=posFromEvent(e);
  const T=TRACKS[active], notes=state.tracks[active].notes;
  if(drag.kind==='erase'){ const hit=hitNote(step,row); if(hit){ notes.splice(notes.indexOf(hit),1); afterEdit(); } return; }
  const n=drag.n;
  if(drag.kind==='create'){
    if(T.drum){
      const p=rowToPitch(active,row);
      const a=Math.min(drag.startStep,step), b=Math.max(drag.startStep,step);
      if(row!==drag.lastRow){ n.p=p; drag.lastRow=row; preview(p); }
      for(let s=a;s<=b;s++){ if(!notes.some(m=>m.p===n.p && m.s===s)) notes.push({p:n.p,s,l:1}); }
      afterEdit(); setStatus(describe(n)); return;
    }
    if(step>=n.s) n.l=Math.min(Math.max(1, step-n.s+1), totalSteps()-n.s);
    if(row!==drag.lastRow){ n.p=rowToPitch(active,row); drag.lastRow=row; preview(n.p); }
    afterEdit(); setStatus(describe(n)); return;
  }
  if(drag.kind==='resize'){ n.l=Math.max(1, Math.min(step-n.s+1, totalSteps()-n.s)); afterEdit(); setStatus(describe(n)); return; }
  if(drag.kind==='move'){
    const ns=Math.max(0, Math.min(step-drag.offStep, totalSteps()-n.l));
    const np=rowToPitch(active,row);
    if(ns!==n.s || np!==n.p){ if(np!==n.p) preview(np); n.s=ns; n.p=np; afterEdit(); setStatus(describe(n)); }
  }
});
function endDrag(){
  if(!drag) return;
  if(drag.n && drag.kind!=='erase') removeOverlaps(drag.n);
  drag=null; afterEdit(); persist();
}
notesC.addEventListener('pointerup', endDrag);
notesC.addEventListener('pointercancel', endDrag);
notesC.addEventListener('dblclick', e=>{
  const {step,row}=posFromEvent(e); const hit=hitNote(step,row);
  if(hit){ const notes=state.tracks[active].notes; notes.splice(notes.indexOf(hit),1); afterEdit(); persist(); }
});
keysC.addEventListener('pointerdown', e=>{ const rect=keysC.getBoundingClientRect(); const row=Math.max(0,Math.min(rowsOf(active)-1,Math.floor((e.clientY-rect.top)/ROW_H))); preview(rowToPitch(active,row)); });
function afterEdit(){ drawNotes(); }

// ---------- 트랙 레일 ----------
const rail=$('rail');
function renderRail(){
  rail.innerHTML='';
  TRACKS.forEach((T,i)=>{
    const st=state.tracks[i];
    const el=document.createElement('button'); el.type='button'; el.className='track'; el.style.setProperty('--tc',`var(${T.cssVar})`);
    el.setAttribute('aria-pressed', String(i===active)); el.id='track-'+T.id;
    el.innerHTML=`<span class="name"><span class="dot"></span>${trackName(i)}<span class="key" aria-hidden="true">${i+1}</span></span>
      <span class="volrow">
        <span class="mute" role="button" tabindex="0" id="mute-${T.id}" aria-pressed="${st.mute}" aria-label="${trackName(i)} ${t('mute')}" title="${st.mute? t('unmute') : t('mute')}">
          <svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>
          <svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>
        </span>
        <input class="vol" type="range" min="0" max="1" step="0.01" value="${st.vol}" id="vol-${T.id}" style="--pct:${Math.round(st.vol*100)}%" aria-label="${trackName(i)} ${t('volume')}">
      </span>`;
    el.addEventListener('click', e=>{ if(e.target.closest('.mute')||e.target.closest('.vol')) return; selectTrack(i); });
    const mute=el.querySelector('.mute');
    const toggleMute=()=>{ st.mute=!st.mute; mute.setAttribute('aria-pressed',String(st.mute)); mute.title=st.mute? t('unmute') : t('mute'); persist(); };
    mute.addEventListener('click', e=>{ e.stopPropagation(); toggleMute(); });
    mute.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); toggleMute(); } });
    const vol=el.querySelector('.vol');
    vol.addEventListener('input', ()=>{ st.vol=+vol.value; vol.style.setProperty('--pct', Math.round(st.vol*100)+'%'); if(trackGains[i]) trackGains[i].gain.setTargetAtTime(st.vol, actx.currentTime, .02); });
    vol.addEventListener('change', persist);
    vol.addEventListener('click', e=>e.stopPropagation());
    rail.appendChild(el);
  });
}
function selectTrack(i){
  active=i;
  document.querySelectorAll('.track').forEach((el,j)=>el.setAttribute('aria-pressed',String(j===i)));
  layout();
  const T=TRACKS[i]; let r = T.drum? 0 : pitchToRow(i, Math.round((T.low+T.high)/2)+6);
  const notes=state.tracks[i].notes; if(notes.length && !T.drum){ const avg=notes.reduce((a,n)=>a+n.p,0)/notes.length; r=pitchToRow(i,Math.round(avg)); }
  roll.scrollTop = Math.max(0, r*ROW_H - (roll.clientHeight-RULER_H)/2);
}

// ---------- 오디오 ----------
let actx=null, master=null, trackGains=[], noiseBuf=null;
function ensureAudio(){
  if(actx){ if(actx.state==='suspended') actx.resume(); return; }
  const AC=window.AudioContext||window.webkitAudioContext; actx=new AC();
  master=actx.createDynamicsCompressor(); master.threshold.value=-12; master.ratio.value=4; master.attack.value=.003; master.release.value=.2;
  const out=actx.createGain(); out.gain.value=.9; master.connect(out); out.connect(actx.destination);
  trackGains=TRACKS.map((T,i)=>{ const g=actx.createGain(); g.gain.value=state.tracks[i].vol; g.connect(master); return g; });
  noiseBuf=actx.createBuffer(1, actx.sampleRate*1.5, actx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
}
const hz=p=>440*Math.pow(2,(p-69)/12);
function osc(type,f,t0,dur,detune){ const o=actx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t0); if(detune) o.detune.value=detune; o.start(t0); o.stop(t0+dur+.1); return o; }
function gainEnv(t0,peak,decay,hold){ const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(peak,t0+.006); if(hold){ g.gain.setTargetAtTime(peak*.55,t0+.05,.25); g.gain.setTargetAtTime(0.0001,t0+hold,.07); } else { g.gain.exponentialRampToValueAtTime(0.0001,t0+decay); } return g; }
function noise(t0,dur){ const s=actx.createBufferSource(); s.buffer=noiseBuf; s.start(t0); s.stop(t0+dur+.05); return s; }
function filt(type,f,q){ const b=actx.createBiquadFilter(); b.type=type; b.frequency.value=f; if(q) b.Q.value=q; return b; }
function playNote(ti,p,t0,dur,vel){
  vel=vel||1; const dest=trackGains[ti]; const T=TRACKS[ti];
  if(T.drum){ drumHit(dest,p,t0,vel); return; }
  const f=hz(p);
  if(T.id==='guitar'){
    const decay=Math.min(dur+.35,1.6);
    const g=gainEnv(t0,.5*vel,decay); const lp=filt('lowpass',2600,.7);
    lp.frequency.setValueAtTime(2600+f,t0); lp.frequency.exponentialRampToValueAtTime(400+f*.5,t0+decay*.7);
    const o1=osc('sawtooth',f,t0,decay), o2=osc('triangle',f,t0,decay,-5), o3=osc('square',f*2,t0,decay);
    const g3=actx.createGain(); g3.gain.value=.12; o3.connect(g3); g3.connect(lp);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dest);
  } else if(T.id==='bass'){
    const decay=Math.min(dur+.2,1.2);
    const g=gainEnv(t0,.9*vel,decay); const lp=filt('lowpass',420,1.1);
    lp.frequency.setValueAtTime(600,t0); lp.frequency.exponentialRampToValueAtTime(140,t0+decay*.6);
    const o1=osc('sine',f,t0,decay), o2=osc('sawtooth',f,t0,decay); const g2=actx.createGain(); g2.gain.value=.5; o2.connect(g2); g2.connect(lp);
    o1.connect(g); lp.connect(g); g.connect(dest);
  } else {
    const g=gainEnv(t0,.32*vel,0,dur); const lp=filt('lowpass',2800,.5);
    const o1=osc('triangle',f,t0,dur+.5), o2=osc('triangle',f,t0,dur+.5,7), o3=osc('sine',f*2,t0,dur+.5); const g3=actx.createGain(); g3.gain.setValueAtTime(.35,t0); g3.gain.exponentialRampToValueAtTime(.05,t0+.6);
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp); lp.connect(g); g.connect(dest);
  }
}
function drumHit(dest,n,t0,vel){
  vel=vel||1;
  const sweep=(f0,f1,dur,peak)=>{ const o=actx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f0,t0); o.frequency.exponentialRampToValueAtTime(f1,t0+dur*.6); const g=gainEnv(t0,peak*vel,dur); o.connect(g); g.connect(dest); o.start(t0); o.stop(t0+dur+.05); };
  const burst=(ftype,f,q,dur,peak,at)=>{ const s=noise(at||t0,dur); const b=filt(ftype,f,q); const g=gainEnv(at||t0,peak*vel,dur); s.connect(b); b.connect(g); g.connect(dest); };
  switch(n){
    case 36: sweep(170,45,.45,1.0); burst('lowpass',900,.5,.03,.5); break;
    case 38: sweep(210,150,.12,.5); burst('bandpass',1900,.7,.22,.8); break;
    case 39: burst('bandpass',1300,1.2,.13,.6); burst('bandpass',1300,1.2,.13,.5,t0+.013); burst('bandpass',1300,1.2,.2,.45,t0+.026); break;
    case 42: burst('highpass',7500,.8,.06,.35); break;
    case 46: burst('highpass',6000,.8,.38,.35); break;
    case 45: sweep(150,85,.4,.8); break;
    case 50: sweep(260,170,.3,.8); break;
    case 49: burst('bandpass',5200,.25,1.4,.5); burst('highpass',9000,.5,.4,.25); break;
    case 51: burst('highpass',8500,.6,.6,.25); { const o=osc('square',840,t0,.6); const b=filt('bandpass',4200,2); const g=gainEnv(t0,.08*vel,.6); o.connect(b); b.connect(g); g.connect(dest); } break;
    default: burst('bandpass',2000,1,.1,.5);
  }
}
let previewLast=0;
function preview(p){
  try{ ensureAudio(); }catch(e){ return; }
  const now=actx.currentTime; if(now-previewLast<.03) return; previewLast=now;
  playNote(active,p,now+.01,.3,.9);
}

// ---------- 재생 ----------
let playing=false, schedTimer=null, nextStep=0, nextTime=0, anchor=0, rafId=0, stopAt=Infinity;
const stepDur=()=>60/state.bpm/4;
function startPlay(){
  try{ ensureAudio(); }catch(e){ toast(t('no_audio')); return; }
  playing=true; stopAt=Infinity;
  nextStep=0; nextTime=actx.currentTime+.08; anchor=nextTime;
  $('playLabel').textContent=t('stop'); $('playIcon').setAttribute('href','#i-stop');
  playheadEl.style.display='block';
  schedule(); schedTimer=setInterval(schedule,25);
  rafId=requestAnimationFrame(tick);
}
function stopPlay(){
  playing=false; clearInterval(schedTimer); cancelAnimationFrame(rafId);
  $('playLabel').textContent=t('play'); $('playIcon').setAttribute('href','#i-play'); playheadEl.style.display='none';
}
function schedule(){
  const sd=stepDur(), total=totalSteps();
  while(nextTime < actx.currentTime+.16){
    if(nextStep>=total){
      if(state.loop){ nextStep=0; anchor=nextTime; }
      else { stopAt=nextTime; break; }
    }
    state.tracks.forEach((tr,ti)=>{
      if(tr.mute) return;
      for(const n of tr.notes){ if(n.s===nextStep) playNote(ti,n.p,nextTime,n.l*sd*(TRACKS[ti].drum?1:.92),1); }
    });
    nextStep++; nextTime+=sd;
  }
  if(!state.loop && actx.currentTime>=stopAt+.1) stopPlay();
}
function tick(){
  if(!playing) return;
  const pos=(actx.currentTime-anchor)/stepDur();
  const clamped=Math.max(0,Math.min(totalSteps(),pos));
  const x=KEY_W+clamped*CELL_W;
  playheadEl.style.left=x+'px';
  if(x>roll.scrollLeft+roll.clientWidth-40) roll.scrollLeft=x-KEY_W-20;
  else if(x<roll.scrollLeft+KEY_W) roll.scrollLeft=Math.max(0,x-KEY_W-20);
  rafId=requestAnimationFrame(tick);
}
$('btnPlay').addEventListener('click', ()=> playing? stopPlay() : startPlay());
$('btnLoop').addEventListener('click', e=>{ state.loop=!state.loop; e.currentTarget.setAttribute('aria-pressed',String(state.loop)); persist(); });
$('inpBpm').addEventListener('change', e=>{ let v=Math.round(+e.target.value||100); v=Math.min(240,Math.max(40,v)); e.target.value=v; state.bpm=v; persist(); if(playing){ stopPlay(); startPlay(); } });
$('selBars').addEventListener('change', e=>{
  const nb=+e.target.value; const was=state.bars; state.bars=nb;
  if(nb<was){ const total=totalSteps(); state.tracks.forEach(tr=>{ tr.notes=tr.notes.filter(n=>n.s<total); tr.notes.forEach(n=>{ n.l=Math.min(n.l,total-n.s); }); }); }
  persist(); layout(); if(playing){ stopPlay(); startPlay(); }
});
document.addEventListener('keydown', e=>{
  if(e.target.matches('input,select,textarea')) return;
  if(e.key==='Escape' && !$('helpScrim').hidden){ closeHelp(); return; }
  if(e.code==='Space'){ e.preventDefault(); playing? stopPlay(): startPlay(); }
  if(e.key>='1'&&e.key<='4'){ selectTrack(+e.key-1); }
  const k=e.key.toLowerCase(); if(k==='d') setMode('draw'); if(k==='e') setMode('erase'); if(k==='s') setMode('scroll');
});

// ---------- 모드 / 비우기 / 도움말 / 언어 ----------
function setMode(m){ mode=m; ['draw','erase','scroll'].forEach(k=>{ $('mode'+k[0].toUpperCase()+k.slice(1)).setAttribute('aria-pressed',String(k===m)); roll.classList.toggle('mode-'+k, k===m); }); }
$('modeDraw').addEventListener('click',()=>setMode('draw'));
$('modeErase').addEventListener('click',()=>setMode('erase'));
$('modeScroll').addEventListener('click',()=>setMode('scroll'));
let clearArmed=null;
$('btnClear').addEventListener('click', e=>{
  const b=e.currentTarget, lbl=$('clearLabel');
  if(clearArmed){ clearTimeout(clearArmed); clearArmed=null; state.tracks[active].notes=[]; afterEdit(); persist(); lbl.textContent=t('clear'); b.setAttribute('aria-pressed','false'); toast(t('cleared').replace('{name}',trackName(active))); return; }
  lbl.textContent=t('clear_confirm'); b.setAttribute('aria-pressed','true');
  clearArmed=setTimeout(()=>{ clearArmed=null; lbl.textContent=t('clear'); b.setAttribute('aria-pressed','false'); },2500);
});
function openHelp(){ $('helpScrim').hidden=false; $('btnHelpClose').focus(); }
function closeHelp(){ $('helpScrim').hidden=true; $('btnHelp').focus(); }
$('btnHelp').addEventListener('click', openHelp);
$('btnHelpClose').addEventListener('click', closeHelp);
$('helpScrim').addEventListener('click', e=>{ if(e.target===e.currentTarget) closeHelp(); });

// ---------- MIDI 쓰기 ----------
const PPQ=480, STEP_TICKS=PPQ/4;
function vlq(n){ const out=[n&0x7f]; n>>>=7; while(n>0){ out.unshift((n&0x7f)|0x80); n>>>=7; } return out; }
function u32(n){ return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]; }
function u16(n){ return [(n>>>8)&255,n&255]; }
function strBytes(s){ return Array.from(new TextEncoder().encode(s)); }
function chunk(tag,data){ return [...strBytes(tag),...u32(data.length),...data]; }
function trackChunk(events){
  events.sort((a,b)=>a.t-b.t || a.order-b.order);
  let last=0; const data=[];
  for(const ev of events){ data.push(...vlq(ev.t-last), ...ev.bytes); last=ev.t; }
  data.push(0x00,0xFF,0x2F,0x00);
  return chunk('MTrk',data);
}
function buildMidi(){
  const out=[...chunk('MThd',[...u16(1),...u16(5),...u16(PPQ)])];
  const mpqn=Math.round(60000000/state.bpm);
  const nm0=strBytes('Pocket Band');
  const tempo=[{t:0,order:0,bytes:[0xFF,0x51,0x03,(mpqn>>16)&255,(mpqn>>8)&255,mpqn&255]},{t:0,order:1,bytes:[0xFF,0x58,0x04,4,2,24,8]},{t:0,order:2,bytes:[0xFF,0x03,...vlq(nm0.length),...nm0]}];
  out.push(...trackChunk(tempo));
  const names={guitar:'Guitar',bass:'Bass',keys:'Keys',drums:'Drums'};
  TRACKS.forEach((T,ti)=>{
    const ev=[]; let order=0;
    const nm=strBytes(names[T.id]); ev.push({t:0,order:order++,bytes:[0xFF,0x03,...vlq(nm.length),...nm]});
    if(!T.drum) ev.push({t:0,order:order++,bytes:[0xC0|T.channel,T.program]});
    const vol=Math.round(state.tracks[ti].vol*127); ev.push({t:0,order:order++,bytes:[0xB0|T.channel,7,vol]});
    state.tracks[ti].notes.forEach(n=>{
      const on=n.s*STEP_TICKS; const len=T.drum? STEP_TICKS/2 : Math.max(STEP_TICKS/2, n.l*STEP_TICKS-10);
      const vel=T.drum? 110 : 100;
      ev.push({t:on,order:order++,bytes:[0x90|T.channel,n.p&127,vel]});
      ev.push({t:on+len,order:order++ - .5,bytes:[0x80|T.channel,n.p&127,0]});
    });
    out.push(...trackChunk(ev));
  });
  return new Uint8Array(out);
}
const CRC_T=(()=>{ const tb=new Uint32Array(256); for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); tb[i]=c>>>0; } return tb; })();
function crc32(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=CRC_T[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function le16(n){ return [n&255,(n>>>8)&255]; } function le32(n){ return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]; }
function zipSingle(name,bytes){
  const d=new Date(); const dosTime=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF; const dosDate=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  const nm=strBytes(name), crc=crc32(bytes), sz=bytes.length;
  const local=[...le32(0x04034b50),...le16(20),...le16(0),...le16(0),...le16(dosTime),...le16(dosDate),...le32(crc),...le32(sz),...le32(sz),...le16(nm.length),...le16(0),...nm];
  const central=[...le32(0x02014b50),...le16(20),...le16(20),...le16(0),...le16(0),...le16(dosTime),...le16(dosDate),...le32(crc),...le32(sz),...le32(sz),...le16(nm.length),...le16(0),...le16(0),...le16(0),...le16(0),...le32(0),...le32(0),...nm];
  const cdOff=local.length+sz;
  const eocd=[...le32(0x06054b50),...le16(0),...le16(0),...le16(1),...le16(1),...le32(central.length),...le32(cdOff),...le16(0)];
  const out=new Uint8Array(local.length+sz+central.length+eocd.length);
  out.set(local,0); out.set(bytes,local.length); out.set(central,cdOff); out.set(eocd,cdOff+central.length);
  return out;
}

// ---------- 저장 / 불러오기 ----------
let downloadsNs;
async function getDownloads(){ if(downloadsNs!==undefined) return downloadsNs; try{ downloadsNs = window.claude && window.claude.use ? await window.claude.use('downloads') : null; }catch(e){ downloadsNs=null; } return downloadsNs; }
function nativeDownload(filename,data,type){
  const blob = data instanceof Blob ? data : new Blob([data],{type});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
async function saveFile(filename,data,type,okMsg){
  const dl=await getDownloads();
  if(!dl){ try{ nativeDownload(filename,data,type); toast(okMsg); }catch(err){ toast(t('save_err')+((err&&err.message)||t('unknown_err'))); } return; }
  try{ await dl.save({filename,data}); toast(okMsg); }
  catch(err){ if(err && err.code==='declined') return; toast(t('save_err')+((err&&err.message)||t('unknown_err'))); }
}
$('btnMidi').addEventListener('click', async ()=>{
  if(!state.tracks.some(tr=>tr.notes.length)){ toast(t('no_notes')); return; }
  const mid=buildMidi();
  if(await getDownloads()){ // claude.ai 아티팩트 안에서는 .mid 확장자를 못 쓰므로 zip으로 감쌈
    saveFile('pocket-band-midi.zip', new Blob([zipSingle('pocket-band.mid',mid)],{type:'application/zip'}), 'application/zip', t('midi_saved_zip'));
  } else {
    saveFile('pocket-band.mid', mid, 'audio/midi', t('midi_saved'));
  }
});
$('btnSave').addEventListener('click', ()=> saveFile('pocket-band.json', JSON.stringify(state,null,1), 'application/json', t('saved')));
$('btnLoad').addEventListener('click', ()=> $('fileLoad').click());
$('fileLoad').addEventListener('change', e=>{
  const f=e.target.files && e.target.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=()=>{ try{ const s=sanitize(JSON.parse(r.result)); if(playing) stopPlay(); applyState(s); persist(); toast(t('loaded')); }catch(err){ toast(t('load_err')); } };
  r.readAsText(f); e.target.value='';
});

// ---------- 부팅 ----------
function applyState(s){
  state=s; $('inpBpm').value=state.bpm; $('selBars').value=String(state.bars); $('btnLoop').setAttribute('aria-pressed',String(state.loop));
  if(trackGains.length) trackGains.forEach((g,i)=>g.gain.value=state.tracks[i].vol);
  renderRail(); selectTrack(active);
}
function boot(data){
  lang = (document.documentElement.lang||'ko').toLowerCase().startsWith('en') ? 'en' : 'ko';
  let s=null;
  if(data && data.state) s=sanitize(data.state);
  if(!s){ try{ const raw=localStorage.getItem(STORE_KEY); if(raw) s=sanitize(JSON.parse(raw)); }catch(e){} }
  if(!s) s=demoState();
  applyLang();
  applyState(s);
  getDownloads();
}
boot({});
if('serviceWorker' in navigator && location.protocol==='https:'){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('/pocket-band/sw.js',{scope:'/pocket-band/'}).catch(()=>{}); }); }
const mq=window.matchMedia('(prefers-color-scheme: dark)'); if(mq.addEventListener) mq.addEventListener('change', ()=>state&&layout());
new MutationObserver(()=>state&&layout()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
})();
