(function(){
  'use strict';
  const ITEMS=20;
  const VERSION='20260822-20q-v4';
  const LABELS=['A','B','C','D'];
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');

  function getClient(){try{if(window.sb?.from)return window.sb; if(typeof sb!=='undefined'&&sb?.from)return sb;}catch(e){} return null;}
  function getLessonId(article){
    const b=article.querySelector('button[onclick*="toggleLessonComplete"]');
    const raw=b?.getAttribute('onclick')||'';
    const m=raw.match(/toggleLessonComplete\(['\"]([^'\"]+)['\"]/);
    return m?.[1]||article.dataset.lessonId||null;
  }
  function isLessonArticle(article){
    return !!(article && getLessonId(article) && (article.querySelector('.lesson-content')||/LESSON\s+\d+/i.test(article.textContent||'')));
  }
  function parseOptions(v){
    if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){v=[]}}
    if(Array.isArray(v))return v.map(String).filter(Boolean).slice(0,4);
    if(v&&typeof v==='object')return LABELS.map(k=>v[k]).filter(x=>x!==undefined&&x!==null).map(String).slice(0,4);
    return [];
  }
  function prepare(q,index){
    const opts=parseOptions(q.options);
    if(opts.length!==4)return null;
    const correct=norm(q.correct_answer);
    let ci=opts.findIndex(x=>norm(x)===correct);
    if(ci<0&&/^[A-D]$/i.test(String(q.correct_answer||'')))ci=LABELS.indexOf(String(q.correct_answer).toUpperCase());
    if(ci<0)return null;
    const correctText=opts[ci];
    const rest=opts.filter((_,i)=>i!==ci);
    for(let i=rest.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}
    const target=index%4;
    const out=[];let d=0;
    for(let i=0;i<4;i++)out.push(i===target?correctText:rest[d++]);
    return {q,opts:out};
  }

  async function loadQuestions(lessonId){
    const key='lesson:'+lessonId;
    if(window.__lessonFormativeQuestionsCache?.[key])return window.__lessonFormativeQuestionsCache[key];
    const client=getClient();
    let rows=[];
    if(client){
      const r=await client.from('quiz_questions').select('id,lesson_id,question,options,correct_answer,points,position').eq('lesson_id',lessonId).order('position');
      if(!r.error)rows=r.data||[];
    }
    rows=rows.slice(0,ITEMS);
    window.__lessonFormativeQuestionsCache=window.__lessonFormativeQuestionsCache||{};
    window.__lessonFormativeQuestionsCache[key]=rows;
    return rows;
  }

  function removeOldQuiz(){
    document.querySelectorAll('#moduleQuiz').forEach(x=>x.remove());
    document.querySelectorAll('h3').forEach(h=>{const t=(h.textContent||'').trim().toLowerCase();if(t==='📝 formative quiz'||t==='formative quiz')h.remove();});
    document.querySelectorAll('#quizResult').forEach(x=>x.remove());
    document.querySelectorAll('button').forEach(b=>{if((b.textContent||'').trim().toLowerCase()==='submit quiz')b.remove();});
    document.querySelectorAll('.screen .notice').forEach(n=>{if((n.textContent||'').toLowerCase().includes('complete the formative quiz'))n.remove();});
  }

  async function build(article){
    if(article.querySelector('.lesson-formative-card'))return;
    const lessonId=getLessonId(article);if(!lessonId)return;
    const rows=await loadQuestions(lessonId);
    if(rows.length!==ITEMS)return;
    const prepared=rows.map(prepare).filter(Boolean);
    if(prepared.length!==ITEMS)return;
    const state=Array(ITEMS).fill(null);let current=0;
    const host=document.createElement('section');host.className='lesson-formative-card';host.dataset.lessonId=lessonId;host.dataset.version=VERSION;
    host.innerHTML='<div class="lf-head"><div class="lf-kicker">FORMATIVE ASSESSMENT</div><h3>20-Question Objective Assessment</h3><p>Answer all 20 questions by selecting A, B, C or D. Correct answers are balanced across the assessment and your score is marked and saved automatically.</p><div class="lf-progress"><span class="lf-progress-bar"></span></div><div class="lf-progress-text"></div></div>';
    const form=document.createElement('div');form.className='lf-form';
    const dots=document.createElement('div');dots.className='lf-dots';
    const prev=document.createElement('button');prev.type='button';prev.className='btn alt';prev.textContent='← Previous';
    const next=document.createElement('button');next.type='button';next.className='btn';next.textContent='Next →';
    const nav=document.createElement('div');nav.className='lf-nav';nav.append(prev,next);
    const submit=document.createElement('button');submit.type='button';submit.className='btn lf-submit';submit.textContent='SUBMIT & MARK ASSESSMENT';
    const result=document.createElement('div');result.className='lf-result';result.setAttribute('aria-live','polite');

    prepared.forEach((item,i)=>{
      const box=document.createElement('div');box.className='lf-question';box.dataset.index=i;
      const title=document.createElement('h4');title.innerHTML='<span class="lf-number">'+(i+1)+'</span><span>'+esc(item.q.question)+'</span>';box.appendChild(title);
      const choices=document.createElement('div');choices.className='lf-choices';
      item.opts.forEach((text,j)=>{const b=document.createElement('button');b.type='button';b.className='lf-choice';b.innerHTML='<b>'+LABELS[j]+'.</b> '+esc(text);b.addEventListener('click',()=>{state[i]=text;choices.querySelectorAll('.lf-choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');update();});choices.appendChild(b);});
      box.appendChild(choices);form.appendChild(box);
      const dot=document.createElement('button');dot.type='button';dot.className='lf-dot';dot.textContent=String(i+1);dot.addEventListener('click',()=>show(i));dots.appendChild(dot);
    });
    host.append(form,dots,nav,submit,result);

    function answered(){return state.filter(Boolean).length;}
    function update(){host.querySelector('.lf-progress-bar').style.width=(answered()/ITEMS*100)+'%';host.querySelector('.lf-progress-text').textContent='Question '+(current+1)+' of '+ITEMS+' • '+answered()+' answered';dots.querySelectorAll('.lf-dot').forEach((d,i)=>{d.classList.toggle('done',!!state[i]);d.classList.toggle('active',i===current)});prev.disabled=current===0;next.style.display=current===ITEMS-1?'none':'block';submit.style.display=current===ITEMS-1?'block':'none';}
    function show(i){current=Math.max(0,Math.min(ITEMS-1,i));form.querySelectorAll('.lf-question').forEach((x,j)=>x.classList.toggle('active',j===current));result.textContent='';result.className='lf-result';update();}
    prev.addEventListener('click',()=>show(current-1));
    next.addEventListener('click',()=>{if(!state[current]){result.className='lf-result warning';result.textContent='Please answer this question before continuing.';return;}show(current+1);});
    submit.addEventListener('click',async()=>{
      const missing=state.map((v,i)=>v?null:i+1).filter(Boolean);
      if(missing.length){result.className='lf-result warning';result.textContent='Please answer all 20 questions. Unanswered: '+missing.join(', ');show(missing[0]-1);return;}
      const client=getClient();
      if(!client?.rpc){result.className='lf-result bad';result.textContent='Learning service is not ready. Please refresh the page and try again.';return;}
      submit.disabled=true;prev.disabled=true;next.disabled=true;submit.textContent='MARKING…';result.className='lf-result';result.textContent='Checking answers and saving your result…';
      try{
        const answers={};prepared.forEach((item,i)=>answers[item.q.id]=String(state[i]||''));
        const {data,error}=await client.rpc('submit_lesson_formative',{p_lesson_id:lessonId,p_answers:answers});
        if(error)throw error;
        const row=Array.isArray(data)?data[0]:data;const score=Number(row?.score??0),max=Number(row?.max_score??ITEMS),pct=max?Math.round(score/max*100):0;
        result.className='lf-result '+(pct>=50?'good':'bad');result.innerHTML='<strong>Assessment completed.</strong><br>Score: '+score+'/'+max+' ('+pct+'%).<br>'+(pct>=50?'Good work. Your result has been saved.':'Review the lesson carefully and try again.');
        host.dataset.completed='true';host.dataset.score=String(score);submit.disabled=false;prev.disabled=false;next.disabled=false;submit.textContent='SUBMIT AGAIN';
      }catch(e){result.className='lf-result bad';result.textContent=e?.message||'Unable to mark this assessment. Please try again.';submit.disabled=false;prev.disabled=false;next.disabled=false;submit.textContent='SUBMIT & MARK ASSESSMENT';}
    });
    const anchor=article.querySelector('button[onclick*="toggleLessonComplete"]');if(anchor)anchor.before(host);else article.appendChild(host);
    show(0);
  }

  function style(){if(document.getElementById('lesson-formative-styles'))return;const s=document.createElement('style');s.id='lesson-formative-styles';s.textContent=`
.lesson-formative-card{margin:24px 0;padding:14px;border:1px solid #d9eee2;border-radius:18px;background:#fbfefd;scroll-margin-top:90px}.lf-head{padding:16px;background:#eef7f1;border-radius:14px;margin-bottom:14px;color:#17312a}.lf-kicker{font-size:12px;font-weight:900;color:#075c3a;letter-spacing:.6px}.lf-head h3{margin:4px 0;font-size:20px}.lf-head p{margin:0;color:#65746e;font-size:13px;line-height:1.55}.lf-progress{height:8px;background:#dfeae4;border-radius:99px;overflow:hidden;margin-top:14px}.lf-progress-bar{display:block;height:100%;width:0;background:#075c3a;transition:.2s}.lf-progress-text{font-size:12px;font-weight:800;color:#075c3a;margin-top:7px}.lf-question{display:none;padding:16px;background:#fff;border:1px solid #dfe7e2;border-radius:14px}.lf-question.active{display:block}.lf-question h4{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;font-size:17px;line-height:1.5}.lf-number{min-width:32px;height:32px;border-radius:10px;background:#e8f3ed;color:#075c3a;display:grid;place-items:center;font-size:13px;font-weight:900}.lf-choices{display:grid;gap:9px;margin-top:12px}.lf-choice{display:block;width:100%;text-align:left;padding:13px;border:2px solid #dfe7e2;border-radius:12px;background:#fff;color:#17312a;min-height:48px;cursor:pointer;font-size:14px}.lf-choice.selected{border-color:#075c3a;background:#eef7f1}.lf-nav{display:flex;gap:9px;margin-top:12px}.lf-nav button{flex:1}.lf-submit{width:100%;margin-top:10px}.lf-dots{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.lf-dot{width:30px;height:30px;border-radius:8px;border:1px solid #dfe7e2;background:#fff;color:#65746e;font-size:11px;font-weight:800;cursor:pointer}.lf-dot.done{background:#eef7f1;color:#075c3a;border-color:#9bc9ad}.lf-dot.active{outline:2px solid #075c3a;outline-offset:1px}.lf-result{margin-top:12px;padding:13px;border-radius:11px;line-height:1.55}.lf-result.good{background:#e9f8ee;color:#075c3a}.lf-result.bad{background:#fff0f1;color:#a3223c}.lf-result.warning{background:#fff8e8;color:#805400}@media(max-width:600px){.lesson-formative-card{padding:10px}.lf-head{padding:14px}.lf-question{padding:14px}.lf-question h4{font-size:16px}.lf-choice{font-size:14px;padding:12px}.lf-dot{width:29px;height:29px}}
`;document.head.appendChild(s);}

  let running=false;
  async function decorate(){
    if(running)return;running=true;
    try{
      removeOldQuiz();
      const articles=[...document.querySelectorAll('article')].filter(isLessonArticle);
      for(const article of articles){try{await build(article);}catch(e){console.warn('Lesson formative build failed',e);}}
    }finally{running=false;}
  }
  function boot(){style();decorate();let n=0;const timer=setInterval(()=>{decorate();if(++n>80)clearInterval(timer);},500);new MutationObserver(()=>decorate()).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
