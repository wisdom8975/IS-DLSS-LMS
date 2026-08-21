(function(){
  'use strict';
  const PREFIX='isdlss-lesson-formative-v3';
  const ITEMS_PER_LESSON=20;
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function opts(q){
    if(Array.isArray(q?.options))return q.options.map(String);
    if(q?.options&&typeof q.options==='object')return Object.keys(q.options).sort().map(k=>String(q.options[k]));
    if(typeof q?.options==='string'){try{const x=JSON.parse(q.options);return Array.isArray(x)?x.map(String):Object.keys(x).sort().map(k=>String(x[k]));}catch{return[]}}
    return[];
  }
  function lessonId(article){const b=article.querySelector('button[onclick*=\"toggleLessonComplete\"]');const m=b?.getAttribute('onclick')?.match(/toggleLessonComplete\('([^']+)'/);return m?.[1]||null;}
  function lessonNumber(article){const t=article.querySelector('.badge')?.textContent||'';const m=t.match(/LESSON\s+(\d+)/i);return m?Number(m[1]):null;}
  function questionsFor(n,lid){
    const all=(window.__moduleQuestions||[]).slice();
    let qs=all.filter(q=>String(q?.lesson_id||'')===String(lid));
    if(qs.length<ITEMS_PER_LESSON){const sorted=all.slice().sort((a,b)=>Number(a.position||0)-Number(b.position||0));const start=Math.max(0,(n-1)*ITEMS_PER_LESSON);qs=sorted.slice(start,start+ITEMS_PER_LESSON);}
    return qs.sort((a,b)=>Number(a.position||0)-Number(b.position||0)).slice(0,ITEMS_PER_LESSON);
  }
  function build(article,n){
    if(article.querySelector('.lesson-formative-card'))return;
    const lid=lessonId(article);if(!lid)return;
    const qs=questionsFor(n,lid);if(qs.length!==ITEMS_PER_LESSON)return;
    const host=document.createElement('section');host.className='lesson-formative-card';host.dataset.lessonId=lid;
    host.innerHTML='<div class=\"lf-head\"><div class=\"lf-kicker\">FORMATIVE ASSESSMENT</div><h3>20-question lesson assessment</h3><p>Tap one answer for each question. Your answers are saved in this assessment and marked automatically when you submit.</p><div class=\"lf-progress\"><span class=\"lf-progress-bar\"></span></div><div class=\"lf-progress-text\">Question 1 of 20</div></div>';
    const form=document.createElement('div');form.className='lf-form';const state=Array(ITEMS_PER_LESSON).fill(null);let current=0;
    qs.forEach((q,i)=>{
      const box=document.createElement('div');box.className='lf-question';box.dataset.index=String(i);box.dataset.questionId=q.id;
      const title=document.createElement('h4');title.innerHTML='<span class=\"lf-number\">'+(i+1)+'</span><span>'+esc(q.question)+'</span>';box.appendChild(title);
      const choiceWrap=document.createElement('div');choiceWrap.className='lf-choices';
      opts(q).forEach((o,j)=>{const label=document.createElement('label');label.className='lf-choice';const input=document.createElement('input');input.type='radio';input.name=PREFIX+'-'+lid+'-'+i;input.value=String.fromCharCode(65+j);input.setAttribute('aria-label',String.fromCharCode(65+j)+'. '+o);const span=document.createElement('span');span.innerHTML='<b>'+String.fromCharCode(65+j)+'.</b> '+esc(o);label.append(input,span);input.addEventListener('change',()=>{state[i]=input.value;choiceWrap.querySelectorAll('.lf-choice').forEach(x=>x.classList.remove('selected'));label.classList.add('selected');updateProgress();});choiceWrap.appendChild(label);});
      box.appendChild(choiceWrap);form.appendChild(box);
    });
    host.appendChild(form);
    const nav=document.createElement('div');nav.className='lf-nav';const prev=document.createElement('button');prev.type='button';prev.className='btn alt lf-prev';prev.textContent='← Previous';const next=document.createElement('button');next.type='button';next.className='btn lf-next';next.textContent='Next →';nav.append(prev,next);
    const dots=document.createElement('div');dots.className='lf-dots';qs.forEach((_,i)=>{const d=document.createElement('button');d.type='button';d.className='lf-dot';d.textContent=String(i+1);d.setAttribute('aria-label','Go to question '+(i+1));d.addEventListener('click',()=>show(i));dots.appendChild(d);});host.appendChild(dots);host.appendChild(nav);
    const submit=document.createElement('button');submit.type='button';submit.className='btn lf-submit';submit.textContent='SUBMIT & MARK ASSESSMENT';submit.style.display='none';
    const result=document.createElement('div');result.className='lf-result';result.setAttribute('aria-live','polite');
    submit.addEventListener('click',async()=>{
      const missing=state.map((v,i)=>v?null:i+1).filter(Boolean);if(missing.length){result.className='lf-result warning';result.textContent='Please answer all 20 questions. Unanswered: '+missing.join(', ')+'.';show(missing[0]-1);return;}
      submit.disabled=true;prev.disabled=true;next.disabled=true;submit.textContent='MARKING…';result.className='lf-result';result.textContent='Checking answers and saving your result…';
      try{const client=(typeof sb!=='undefined'?sb:window.sb);if(!client||typeof client.rpc!=='function')throw new Error('Learning service is not ready. Please try again.');const answers={};qs.forEach((q,i)=>{answers[q.id]=state[i];});const {data,error}=await client.rpc('submit_lesson_formative',{p_lesson_id:lid,p_answers:answers});if(error)throw error;const row=Array.isArray(data)?data[0]:data;const score=Number(row?.score||0),max=Number(row?.max_score||ITEMS_PER_LESSON),pct=max?Math.round(score/max*100):0;try{localStorage.setItem(PREFIX+':'+lid,JSON.stringify({score,max_score:max,completed_at:row?.completed_at||new Date().toISOString()}));}catch{}result.className='lf-result '+(pct>=50?'good':'bad');result.innerHTML='<strong>Assessment completed.</strong><br>Score: '+score+'/'+max+' ('+pct+'%).<br>'+(pct>=50?'Good work. Review the lesson and continue learning.':'Review the lesson content and try again.');host.dataset.completed='true';host.dataset.score=String(score);submit.textContent='SUBMITTED — RETRY';prev.disabled=false;next.disabled=false;submit.disabled=false;}catch(e){result.className='lf-result bad';result.textContent=e?.message||'Unable to mark this assessment. Please try again.';submit.textContent='SUBMIT & MARK ASSESSMENT';submit.disabled=false;prev.disabled=false;next.disabled=false;}
    });
    host.append(submit,result);
    function answeredCount(){return state.filter(Boolean).length;}
    function updateProgress(){host.querySelector('.lf-progress-bar').style.width=(answeredCount()/ITEMS_PER_LESSON*100)+'%';host.querySelector('.lf-progress-text').textContent='Question '+(current+1)+' of '+ITEMS_PER_LESSON+' • '+answeredCount()+' answered';dots.querySelectorAll('.lf-dot').forEach((d,i)=>{d.classList.toggle('done',!!state[i]);d.classList.toggle('active',i===current);});}
    function show(i){current=Math.max(0,Math.min(ITEMS_PER_LESSON-1,i));form.querySelectorAll('.lf-question').forEach((x,j)=>x.classList.toggle('active',j===current));prev.disabled=current===0;next.style.display=current===ITEMS_PER_LESSON-1?'none':'block';submit.style.display=current===ITEMS_PER_LESSON-1?'block':'none';updateProgress();host.scrollIntoView({behavior:'smooth',block:'start'});}
    prev.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>{if(!state[current]){result.className='lf-result warning';result.textContent='Please select an answer before moving to the next question.';return;}result.className='lf-result';result.textContent='';show(current+1);});
    const anchor=article.querySelector('button[onclick*=\"toggleLessonComplete\"]');if(anchor)anchor.before(host);else article.appendChild(host);show(0);
  }
  function cleanLegacy(article){const c=article.querySelector('.lesson-content');if(!c)return;const text=c.textContent||'';const marker='𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗩𝗘 𝗔𝗦𝗦𝗘𝗦𝗦𝗠𝗘𝗡𝗧';const study='𝗦𝗧𝗨𝗗𝗬 𝗖𝗛𝗘𝗖𝗞';const a=text.indexOf(marker);if(a>=0){const b=text.indexOf(study,a);c.textContent=(text.slice(0,a).trim()+'\\n\\n'+(b>=0?text.slice(b).trim():'')).trim();}}
  function style(){if(document.getElementById('lesson-formative-styles'))return;const s=document.createElement('style');s.id='lesson-formative-styles';s.textContent='.lesson-formative-card{margin:20px 0;padding:14px;border:1px solid #d9eee2;border-radius:18px;background:#fbfefd;scroll-margin-top:90px}.lf-head{padding:16px;background:#eef7f1;border-radius:14px;margin-bottom:14px;color:#17312a}.lf-kicker{font-size:12px;font-weight:900;color:#075c3a;letter-spacing:.4px}.lf-head h3{margin:4px 0;font-size:20px}.lf-head p{margin:0;color:#65746e;font-size:13px;line-height:1.55}.lf-progress{height:8px;background:#dfeae4;border-radius:99px;overflow:hidden;margin-top:14px}.lf-progress-bar{display:block;height:100%;width:0;background:#075c3a;transition:.2s}.lf-progress-text{font-size:12px;font-weight:800;color:#075c3a;margin-top:7px}.lf-question{display:none;padding:16px;margin:0;background:#fff;border:1px solid #dfe7e2;border-radius:14px}.lf-question.active{display:block}.lf-question h4{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;font-size:17px;line-height:1.5}.lf-number{min-width:32px;height:32px;border-radius:10px;background:#e8f3ed;color:#075c3a;display:grid;place-items:center;font-size:13px;font-weight:900}.lf-choices{display:grid;gap:9px}.lf-choice{display:flex;align-items:flex-start;gap:10px;padding:13px;border:2px solid #dfe7e2;border-radius:12px;cursor:pointer;background:#fff;min-height:48px;transition:.15s}.lf-choice:active{transform:scale(.99)}.lf-choice.selected{border-color:#075c3a;background:#eef7f1}.lf-choice input{margin-top:4px;accent-color:#075c3a;transform:scale(1.15)}.lf-nav{display:flex;gap:9px;margin-top:12px}.lf-nav button{flex:1}.lf-submit{width:100%;margin-top:10px}.lf-result{margin-top:12px;padding:13px;border-radius:11px;line-height:1.55}.lf-result.good{background:#e9f8ee;color:#075c3a}.lf-result.bad{background:#fff0f1;color:#a3223c}.lf-result.warning{background:#fff8e8;color:#805400}.lf-dots{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.lf-dot{width:30px;height:30px;border-radius:8px;border:1px solid #dfe7e2;background:#fff;color:#65746e;font-size:11px;font-weight:800;cursor:pointer}.lf-dot.done{background:#eef7f1;color:#075c3a;border-color:#9bc9ad}.lf-dot.active{outline:2px solid #075c3a;outline-offset:1px}@media(max-width:600px){.lesson-formative-card{padding:10px;border-radius:15px}.lf-head{padding:14px}.lf-head h3{font-size:18px}.lf-question{padding:14px}.lf-question h4{font-size:16px}.lf-choice{font-size:14px;padding:12px}.lf-dot{width:29px;height:29px}}';document.head.appendChild(s);}
  function decorate(){if(!window.__moduleQuestions?.length)return;document.querySelectorAll('.screen article.card').forEach(article=>{const n=lessonNumber(article);if(n){cleanLegacy(article);build(article,n);}});}
  function boot(){style();decorate();let i=0;const timer=setInterval(()=>{decorate();if(++i>50)clearInterval(timer)},500);new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
