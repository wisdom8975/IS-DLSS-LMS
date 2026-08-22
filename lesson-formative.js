(function(){
  'use strict';
  const ITEMS=20;
  const PREFIX='isdlss-lesson-formative-v7';
  const LABELS=['A','B','C','D'];

  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');

  function options(q){
    let x=q?.options;
    if(typeof x==='string'){try{x=JSON.parse(x)}catch{x=[]}}
    let out=[];
    if(Array.isArray(x))out=x.map(String).filter(Boolean).slice(0,4);
    else if(x&&typeof x==='object')out=LABELS.map(k=>x[k]).filter(v=>v!==undefined&&v!==null).map(String).filter(Boolean);
    return out.length===4?out:[];
  }

  // Every formative assessment question is strictly A-D. The correct answer
  // is rotated through A, B, C and D across the 20-question assessment.
  function prepare(q,index){
    const opts=options(q);
    if(opts.length!==4)return {q,opts:[]};
    const correct=norm(q.correct_answer);
    let correctIndex=opts.findIndex(x=>norm(x)===correct);
    if(correctIndex<0 && /^[A-D]$/i.test(String(q.correct_answer||'')))correctIndex=LABELS.indexOf(String(q.correct_answer).toUpperCase());
    if(correctIndex<0)return {q,opts:[]};
    const correctText=opts[correctIndex];
    const distractors=opts.filter((_,i)=>i!==correctIndex);
    for(let i=distractors.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[distractors[i],distractors[j]]=[distractors[j],distractors[i]];}
    const target=index%4;
    const out=[];let di=0;
    for(let i=0;i<4;i++)out.push(i===target?correctText:distractors[di++]);
    return {q,opts:out};
  }

  function lessonId(article){
    const b=article.querySelector('button[onclick*=\"toggleLessonComplete\"]');
    const m=b?.getAttribute('onclick')?.match(/toggleLessonComplete\('([^']+)'/);
    return m?.[1]||null;
  }
  function lessonNumber(article){const t=article.querySelector('.badge')?.textContent||'';const m=t.match(/LESSON\s+(\d+)/i);return m?Number(m[1]):null;}
  function questionsFor(lid){return (window.__moduleQuestions||[]).filter(q=>String(q?.lesson_id||'')===String(lid)).sort((a,b)=>Number(a.position||0)-Number(b.position||0)).slice(0,ITEMS);}

  function cleanLegacy(article){
    const c=article.querySelector('.lesson-content');if(!c)return;
    const text=c.textContent||'';const marker='𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗩𝗘 𝗔𝗦𝗦𝗘𝗦𝗦𝗠𝗘𝗡𝗧',study='𝗦𝗧𝗨𝗗𝗬 𝗖𝗛𝗘𝗖𝗞';
    const a=text.indexOf(marker);if(a>=0){const b=text.indexOf(study,a);c.textContent=(text.slice(0,a).trim()+'\n\n'+(b>=0?text.slice(b).trim():'')).trim();}
  }

  function build(article){
    if(article.querySelector('.lesson-formative-card'))return;
    const lid=lessonId(article);if(!lid)return;
    const qs=questionsFor(lid);if(qs.length!==ITEMS)return;
    const prepared=qs.map((q,i)=>prepare(q,i));
    if(prepared.some(x=>x.opts.length!==4))return;
    const state=Array(ITEMS).fill(null);let current=0;

    const host=document.createElement('section');host.className='lesson-formative-card';host.dataset.lessonId=lid;
    host.innerHTML='<div class="lf-head"><div class="lf-kicker">FORMATIVE ASSESSMENT</div><h3>20-question lesson assessment</h3><p>Choose one answer from A, B, C or D. The correct answer position is balanced across the assessment. Your result is marked and saved securely.</p><div class="lf-progress"><span class="lf-progress-bar"></span></div><div class="lf-progress-text"></div></div>';
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
      const label=document.createElement('label');label.className='lf-answer-label';label.textContent='Your answer';
      const input=document.createElement('input');input.type='text';input.className='lf-answer-input';input.placeholder='Type your answer, or choose A-D below';input.autocomplete='off';label.appendChild(input);box.appendChild(label);
      const choices=document.createElement('div');choices.className='lf-choices';
      item.opts.forEach((text,j)=>{const b=document.createElement('button');b.type='button';b.className='lf-choice';b.innerHTML='<b>'+LABELS[j]+'.</b> '+esc(text);b.addEventListener('click',()=>{state[i]=text;input.value=text;choices.querySelectorAll('.lf-choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');update();});choices.appendChild(b);});
      input.addEventListener('input',()=>{const v=input.value.trim();state[i]=v||null;choices.querySelectorAll('.lf-choice').forEach((x,j)=>x.classList.toggle('selected',norm(item.opts[j])===norm(state[i])));update();});
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
      submit.disabled=true;prev.disabled=true;next.disabled=true;submit.textContent='MARKING…';result.className='lf-result';result.textContent='Checking answers and saving your result…';
      try{
        const client=window.sb||((typeof sb!=='undefined')?sb:null);if(!client?.rpc)throw new Error('Learning service is not ready. Please refresh and try again.');
        const answers={};prepared.forEach((item,i)=>answers[item.q.id]=String(state[i]||''));
        const {data,error}=await client.rpc('submit_lesson_formative',{p_lesson_id:lid,p_answers:answers});if(error)throw error;
        const row=Array.isArray(data)?data[0]:data;const score=Number(row?.score??0),max=Number(row?.max_score??ITEMS),pct=max?Math.round(score/max*100):0;
        try{localStorage.setItem(PREFIX+':'+lid,JSON.stringify({score,max_score:max,completed_at:row?.completed_at||new Date().toISOString()}));}catch{}
        result.className='lf-result '+(pct>=50?'good':'bad');result.innerHTML='<strong>Assessment completed.</strong><br>Score: '+score+'/'+max+' ('+pct+'%).<br>'+(pct>=50?'Good work. You may continue to the next lesson.':'Review the lesson carefully and try the assessment again.');
        host.dataset.completed='true';host.dataset.score=String(score);submit.disabled=false;prev.disabled=false;next.disabled=false;submit.textContent='SUBMIT AGAIN';
      }catch(e){result.className='lf-result bad';result.textContent=e?.message||'Unable to mark this assessment. Please try again.';submit.disabled=false;prev.disabled=false;next.disabled=false;submit.textContent='SUBMIT & MARK ASSESSMENT';}
    });
    const anchor=article.querySelector('button[onclick*=\"toggleLessonComplete\"]');if(anchor)anchor.before(host);else article.appendChild(host);show(0);
  }

  function style(){
    if(document.getElementById('lesson-formative-styles'))return;
    const s=document.createElement('style');s.id='lesson-formative-styles';s.textContent=`
.lesson-formative-card{margin:22px 0;padding:14px;border:1px solid #d9eee2;border-radius:18px;background:#fbfefd;scroll-margin-top:90px}.lf-head{padding:16px;background:#eef7f1;border-radius:14px;margin-bottom:14px;color:#17312a}.lf-kicker{font-size:12px;font-weight:900;color:#075c3a;letter-spacing:.5px}.lf-head h3{margin:4px 0;font-size:20px}.lf-head p{margin:0;color:#65746e;font-size:13px;line-height:1.55}.lf-progress{height:8px;background:#dfeae4;border-radius:99px;overflow:hidden;margin-top:14px}.lf-progress-bar{display:block;height:100%;width:0;background:#075c3a;transition:.2s}.lf-progress-text{font-size:12px;font-weight:800;color:#075c3a;margin-top:7px}.lf-question{display:none;padding:16px;background:#fff;border:1px solid #dfe7e2;border-radius:14px}.lf-question.active{display:block}.lf-question h4{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;font-size:17px;line-height:1.5}.lf-number{min-width:32px;height:32px;border-radius:10px;background:#e8f3ed;color:#075c3a;display:grid;place-items:center;font-size:13px;font-weight:900}.lf-answer-label{display:block;font-size:13px;font-weight:900;color:#075c3a}.lf-answer-input{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:13px 14px;border:2px solid #cfded5;border-radius:12px;background:#fff;color:#17312a;font-size:16px;outline:none}.lf-answer-input:focus{border-color:#075c3a;box-shadow:0 0 0 3px rgba(7,92,58,.10)}.lf-choices{display:grid;gap:9px;margin-top:12px}.lf-choice{display:block;width:100%;text-align:left;padding:13px;border:2px solid #dfe7e2;border-radius:12px;background:#fff;color:#17312a;min-height:48px;cursor:pointer;font-size:14px}.lf-choice.selected{border-color:#075c3a;background:#eef7f1}.lf-nav{display:flex;gap:9px;margin-top:12px}.lf-nav button{flex:1}.lf-submit{width:100%;margin-top:10px}.lf-dots{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.lf-dot{width:30px;height:30px;border-radius:8px;border:1px solid #dfe7e2;background:#fff;color:#65746e;font-size:11px;font-weight:800;cursor:pointer}.lf-dot.done{background:#eef7f1;color:#075c3a;border-color:#9bc9ad}.lf-dot.active{outline:2px solid #075c3a;outline-offset:1px}.lf-result{margin-top:12px;padding:13px;border-radius:11px;line-height:1.55}.lf-result.good{background:#e9f8ee;color:#075c3a}.lf-result.bad{background:#fff0f1;color:#a3223c}.lf-result.warning{background:#fff8e8;color:#805400}@media(max-width:600px){.lesson-formative-card{padding:10px}.lf-head{padding:14px}.lf-question{padding:14px}.lf-question h4{font-size:16px}.lf-choice{font-size:14px;padding:12px}.lf-answer-input{font-size:16px}.lf-dot{width:29px;height:29px}}
`;
    document.head.appendChild(s);
  }
  function decorate(){if(!Array.isArray(window.__moduleQuestions)||!window.__moduleQuestions.length)return;document.querySelectorAll('.screen article.card').forEach(article=>{const n=lessonNumber(article);if(n){cleanLegacy(article);build(article);}});}
  function boot(){style();decorate();let i=0;const timer=setInterval(()=>{decorate();if(++i>50)clearInterval(timer);},500);new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
