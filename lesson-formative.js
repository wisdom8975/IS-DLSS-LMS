(function(){
  'use strict';
  const VERSION='20260822-lesson-20q-v10', ITEMS=20, LABELS=['A','B','C','D'];
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
  const db=()=>{try{return window.sb?.from?window.sb:null}catch(e){return null}};
  function ids(article){
    const b=article.querySelector('button[onclick*="toggleLessonComplete"]');
    const raw=b?.getAttribute('onclick')||'';
    const lesson=raw.match(/toggleLessonComplete\(['\"]([^'\"]+)['\"]/);
    return {lessonId:lesson?.[1]||article.dataset.lessonId||null};
  }
  function moduleId(article){
    const raw=article.closest('.screen')?.innerHTML||'';
    const m=raw.match(/openModule\(['\"]([^'\"]+)['\"]/);
    return m?.[1]||window.__activeModuleId||null;
  }
  function parse(v){if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){v=[]}}if(Array.isArray(v))return v.map(String).filter(Boolean).slice(0,4);if(v&&typeof v==='object')return LABELS.map(k=>v[k]).filter(x=>x!=null).map(String).slice(0,4);return []}
  function prepare(q,i){const o=parse(q.options);if(o.length!==4)return null;let ci=o.findIndex(x=>norm(x)===norm(q.correct_answer));if(ci<0&&/^[A-D]$/i.test(String(q.correct_answer)))ci=LABELS.indexOf(String(q.correct_answer).toUpperCase());if(ci<0)return null;const correct=o[ci],wrong=o.filter((_,x)=>x!==ci);for(let x=wrong.length-1;x>0;x--){const j=Math.floor(Math.random()*(x+1));[wrong[x],wrong[j]]=[wrong[j],wrong[x]]}const target=i%4,out=[];let w=0;for(let x=0;x<4;x++)out.push(x===target?correct:wrong[w++]);return{q,options:out}}
  async function getQuestions(article,lessonId){
    const c=db();if(!c)return {rows:[],source:'service'};
    let r=await c.from('quiz_questions').select('id,lesson_id,module_id,question,options,correct_answer,points,position').eq('lesson_id',lessonId).order('position',{ascending:true});
    let rows=!r.error?(r.data||[]):[];
    if(rows.length>=ITEMS)return {rows:rows.slice(0,ITEMS),source:'lesson'};
    const mid=moduleId(article);
    if(mid){r=await c.from('quiz_questions').select('id,lesson_id,module_id,question,options,correct_answer,points,position').eq('module_id',mid).order('position',{ascending:true});const moduleRows=!r.error?(r.data||[]):[];const seen=new Set(rows.map(x=>x.id));for(const q of moduleRows)if(!seen.has(q.id)){rows.push(q);seen.add(q.id);if(rows.length>=ITEMS)break}}
    return {rows:rows.slice(0,ITEMS),source:rows.length>=ITEMS?'module-fallback':'insufficient'};
  }
  function removeOld(){document.querySelectorAll('#moduleQuiz,#quizResult').forEach(x=>x.remove());document.querySelectorAll('h3').forEach(h=>{const t=(h.textContent||'').trim().toLowerCase();if(t==='📝 formative quiz'||t==='formative quiz')h.remove()});document.querySelectorAll('button').forEach(b=>{if((b.textContent||'').trim().toLowerCase()==='submit quiz'&&!b.closest('.lesson-formative-card'))b.remove()})}
  async function build(article){
    if(!article||article.querySelector('.lesson-formative-card')||!article.querySelector('.lesson-content'))return;
    const {lessonId}=ids(article);if(!lessonId)return;
    const data=await getQuestions(article,lessonId), rows=data.rows;
    const completeButton=article.querySelector('button[onclick*="toggleLessonComplete"]');
    const card=document.createElement('section');card.className='lesson-formative-card';card.dataset.lessonId=lessonId;card.dataset.version=VERSION;
    if(rows.length<ITEMS){
      card.innerHTML='<div class="lf-head"><div class="lf-kicker">FORMATIVE ASSESSMENT</div><h3>20-Question Formative Assessment</h3><p><b>Assessment setup incomplete.</b> This lesson currently has '+rows.length+' usable question'+(rows.length===1?'':'s')+'. The LMS requires 20 objective questions for this lesson before the assessment can start.</p></div><div class="lf-result warning">The blank space you saw has been replaced with this clear status message. No lesson is silently left without an assessment.</div>';
      if(completeButton)completeButton.before(card);else article.appendChild(card);return;
    }
    const prepared=rows.map(prepare).filter(Boolean);if(prepared.length<ITEMS){card.innerHTML='<div class="lf-head"><div class="lf-kicker">FORMATIVE ASSESSMENT</div><h3>20-Question Formative Assessment</h3><p>Assessment questions could not be prepared correctly. Please contact the teacher.</p></div>';if(completeButton)completeButton.before(card);else article.appendChild(card);return}
    const answers=Array(ITEMS).fill(null);let current=0;
    card.innerHTML='<div class="lf-head"><div class="lf-kicker">FORMATIVE ASSESSMENT</div><h3>20-Question Formative Assessment</h3><p>This assessment belongs to <b>this lesson only</b>. Answer each question in order. Select A, B, C or D, then continue.</p><div class="lf-progress"><span class="lf-progress-bar"></span></div><div class="lf-progress-text"></div></div>';
    const form=document.createElement('div');form.className='lf-form';
    prepared.forEach((item,i)=>{const box=document.createElement('div');box.className='lf-question';const h=document.createElement('h4');h.innerHTML='<span class="lf-number">'+(i+1)+'</span><span>'+esc(item.q.question)+'</span>';box.appendChild(h);const choices=document.createElement('div');choices.className='lf-choices';item.options.forEach((text,j)=>{const b=document.createElement('button');b.type='button';b.className='lf-choice';b.innerHTML='<b>'+LABELS[j]+'.</b> '+esc(text);b.onclick=()=>{answers[i]=text;choices.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');update()};choices.appendChild(b)});box.appendChild(choices);form.appendChild(box)});
    const nav=document.createElement('div');nav.className='lf-nav';const prev=document.createElement('button');prev.type='button';prev.className='btn alt';prev.textContent='← Previous';const next=document.createElement('button');next.type='button';next.className='btn';next.textContent='Next →';nav.append(prev,next);
    const submit=document.createElement('button');submit.type='button';submit.className='btn lf-submit';submit.textContent='SUBMIT FORMATIVE ASSESSMENT';
    const result=document.createElement('div');result.className='lf-result';card.append(form,nav,submit,result);
    function answered(){return answers.filter(Boolean).length}
    function update(){card.querySelector('.lf-progress-bar').style.width=(answered()/ITEMS*100)+'%';card.querySelector('.lf-progress-text').textContent='Question '+(current+1)+' of '+ITEMS+' • '+answered()+' answered';prev.disabled=current===0;next.style.display=current===ITEMS-1?'none':'block';submit.style.display=current===ITEMS-1?'block':'none'}
    function show(i){current=Math.max(0,Math.min(ITEMS-1,i));form.querySelectorAll('.lf-question').forEach((q,n)=>q.classList.toggle('active',n===current));result.textContent='';result.className='lf-result';update()}
    prev.onclick=()=>show(current-1);next.onclick=()=>{if(!answers[current]){result.className='lf-result warning';result.textContent='Please select an answer before continuing.';return}show(current+1)};
    submit.onclick=async()=>{const missing=answers.map((v,i)=>v?null:i+1).filter(Boolean);if(missing.length){result.className='lf-result warning';result.textContent='Please answer all 20 questions. Unanswered: '+missing.join(', ');show(missing[0]-1);return}const c=db();if(!c?.rpc){result.className='lf-result bad';result.textContent='The learning service is not ready. Please refresh and try again.';return}submit.disabled=true;prev.disabled=true;next.disabled=true;submit.textContent='MARKING…';result.textContent='Marking your assessment…';try{const payload={};prepared.forEach((item,i)=>payload[item.q.id]=String(answers[i]));const {data,error}=await c.rpc('submit_lesson_formative',{p_lesson_id:lessonId,p_answers:payload});if(error)throw error;const row=Array.isArray(data)?data[0]:data;const score=Number(row?.score||0),max=Number(row?.max_score||ITEMS),pct=max?Math.round(score/max*100):0;result.className='lf-result '+(pct>=50?'good':'bad');result.innerHTML='<strong>Formative assessment completed.</strong><br>Score: '+score+'/'+max+' ('+pct+'%).<br>'+(pct>=50?'Good work. Your result has been saved.':'Review this lesson and try the assessment again.');card.dataset.completed='true';card.dataset.score=String(score)}catch(e){result.className='lf-result bad';result.textContent=e?.message||'Unable to mark this assessment. Please try again.'}finally{submit.disabled=false;prev.disabled=false;next.disabled=false;submit.textContent='SUBMIT AGAIN'}};
    if(completeButton)completeButton.before(card);else article.appendChild(card);show(0);
  }
  function style(){if(document.getElementById('lesson-formative-styles'))return;const s=document.createElement('style');s.id='lesson-formative-styles';s.textContent='.lesson-formative-card{margin:24px 0;padding:14px;border:2px solid #b9d8c7;border-radius:18px;background:#fbfefd}.lf-head{padding:17px;background:#eef7f1;border-radius:14px;margin-bottom:14px;color:#17312a}.lf-kicker{font-size:12px;font-weight:900;color:#075c3a;letter-spacing:.7px}.lf-head h3{margin:5px 0;font-size:21px}.lf-head p{margin:0;color:#65746e;font-size:13px;line-height:1.6}.lf-progress{height:9px;background:#dfeae4;border-radius:99px;overflow:hidden;margin-top:14px}.lf-progress-bar{display:block;height:100%;width:0;background:#075c3a;transition:.2s}.lf-progress-text{font-size:12px;font-weight:800;color:#075c3a;margin-top:7px}.lf-question{display:none;padding:16px;background:#fff;border:1px solid #dfe7e2;border-radius:14px}.lf-question.active{display:block}.lf-question h4{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;font-size:17px;line-height:1.5}.lf-number{min-width:32px;height:32px;border-radius:10px;background:#e8f3ed;color:#075c3a;display:grid;place-items:center;font-size:13px;font-weight:900}.lf-choices{display:grid;gap:9px;margin-top:12px}.lf-choice{display:block;width:100%;text-align:left;padding:13px;border:2px solid #dfe7e2;border-radius:12px;background:#fff;color:#17312a;min-height:50px;cursor:pointer;font-size:14px}.lf-choice.selected{border-color:#075c3a;background:#eef7f1}.lf-nav{display:flex;gap:9px;margin-top:12px}.lf-nav button{flex:1}.lf-submit{width:100%;margin-top:10px}.lf-result{margin-top:12px;padding:13px;border-radius:11px;line-height:1.55}.lf-result.good{background:#e9f8ee;color:#075c3a}.lf-result.bad{background:#fff0f1;color:#a3223c}.lf-result.warning{background:#fff8e8;color:#805400}@media(max-width:600px){.lesson-formative-card{padding:10px}.lf-head{padding:14px}.lf-question{padding:14px}.lf-choice{font-size:14px;padding:12px}}';document.head.appendChild(s)}
  let running=false;async function decorate(){if(running)return;running=true;try{removeOld();for(const article of [...document.querySelectorAll('article')]){try{await build(article)}catch(e){console.warn('lesson formative error',e)}}removeOld()}finally{running=false}}
  function boot(){style();decorate();let n=0;const timer=setInterval(()=>{decorate();if(++n>60)clearInterval(timer)},700);new MutationObserver(()=>decorate()).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
