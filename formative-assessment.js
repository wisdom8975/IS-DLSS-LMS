(function(){
  'use strict';

  const HEADING='𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗩𝗘 𝗔𝗦𝗦𝗘𝗦𝗦𝗠𝗘𝗡𝗧';
  const STUDY='𝗦𝗧𝗨𝗗𝗬 𝗖𝗛𝗘𝗖𝗞';
  let busy=false;

  const css=`
    .fa-box{margin:22px 0;padding:18px;border:1px solid #dfe7e2;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(23,49,42,.07)}
    .fa-title{margin:0 0 6px;color:#17312a;font-size:20px;font-weight:850}
    .fa-subtitle{margin:0 0 16px;color:#65746e;font-size:13px}
    .fa-question{padding:15px;margin:12px 0;border:1px solid #dfe7e2;border-radius:13px;background:#fbfdfc}
    .fa-question.done{border-color:#9ed8b7;background:#f2fbf5}
    .fa-qtext{font-weight:800;margin-bottom:10px;line-height:1.55}
    .fa-options{display:grid;gap:8px}
    .fa-option{display:flex;align-items:flex-start;gap:9px;padding:11px 12px;border:1px solid #dfe7e2;border-radius:10px;background:#fff;cursor:pointer;font-size:14px;line-height:1.4}
    .fa-option:hover{border-color:#075c3a;background:#f3f8f5}
    .fa-option input{margin-top:3px;accent-color:#075c3a}
    .fa-option.selected{border:2px solid #075c3a;background:#eaf6ef}
    .fa-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}
    .fa-submit{background:#075c3a;color:#fff;border:0;padding:12px 16px;border-radius:10px;font-weight:850;cursor:pointer;width:100%}
    .fa-submit:disabled{opacity:.55;cursor:not-allowed}
    .fa-result{margin-top:13px;padding:13px;border-radius:11px;font-weight:750}
    .fa-good{background:#e9f8ee;color:#166534;border:1px solid #bfe7cc}
    .fa-warn{background:#fff8e8;color:#805400;border:1px solid #f5e3ae}
    .fa-review{margin-top:10px;padding:10px;border-radius:9px;background:#fff;border:1px solid #dfe7e2;font-weight:500}
    .fa-review.correct{border-color:#bfe7cc;background:#f3fbf5}
    .fa-review.wrong{border-color:#f2c4ca;background:#fff5f6}
    @media(max-width:600px){.fa-box{padding:14px}.fa-option{font-size:13px;padding:11px}.fa-title{font-size:18px}}
  `;

  function addStyles(){
    if(document.getElementById('formativeAssessmentStyles'))return;
    const s=document.createElement('style');s.id='formativeAssessmentStyles';s.textContent=css;document.head.appendChild(s);
  }

  function clean(v){return String(v||'').replace(/[𝗔-𝗭𝗮-𝘇]/g,'').replace(/\s+/g,' ').trim().toLowerCase().replace(/[?!.:]+$/,'');}

  function parseAssessment(raw){
    const text=String(raw||'').replace(/\u00a0/g,' ');
    const start=text.indexOf(HEADING);
    if(start<0)return null;
    const end=text.indexOf(STUDY,start);
    const block=(end>start?text.slice(start+HEADING.length,end):text.slice(start+HEADING.length));
    const normalized=block.replace(/\s+/g,' ').trim();
    const matches=[];
    const re=/(\d+)\.\s*(.*?)\s*A\.\s*(.*?)\s*B\.\s*(.*?)\s*C\.\s*(.*?)\s*D\.\s*(.*?)(?=\s+\d+\.\s*|$)/g;
    let m;
    while((m=re.exec(normalized))!==null){
      matches.push({n:Number(m[1]),question:m[2].trim(),options:[m[3].trim(),m[4].trim(),m[5].trim(),m[6].trim()]});
    }
    return {start,end,endIndex:end>start?end:text.length,questions:matches};
  }

  async function loadQuestionKeys(moduleId,questions){
    const client=(typeof sb!=='undefined')?sb:null;
    if(!client||!moduleId)return questions;
    try{
      const {data,error}=await client.from('quiz_questions').select('id,module_id,question,options,correct_answer,position').eq('module_id',moduleId).order('position');
      if(error||!data)return questions;
      return questions.map(q=>{
        const found=data.find(x=>clean(x.question)===clean(q.question));
        if(!found)return q;
        const opts=Array.isArray(found.options)?found.options:(found.options||{});
        const optionValues=Object.values(opts);
        const correctValue=opts[found.correct_answer]||found.correct_answer;
        return {...q,id:found.id,correct:found.correct_answer,correctValue,dbOptions:optionValues.length===4?optionValues:null};
      });
    }catch(e){return questions;}
  }

  function renderQuestions(container,questions){
    container.innerHTML=`<div class="fa-box"><h3 class="fa-title">FORMATIVE ASSESSMENT — ANSWER ALL ${questions.length}</h3><p class="fa-subtitle">Select one answer for each question, then submit your answers.</p><div class="fa-list">${questions.map((q,i)=>`<div class="fa-question" data-fa-q="${i}"><div class="fa-qtext">${i+1}. ${escapeHtml(q.question)}</div><div class="fa-options">${q.options.map((o,j)=>`<label class="fa-option"><input type="radio" name="fa_${i}" value="${j}" data-q="${i}"><span><b>${'ABCD'[j]}.</b> ${escapeHtml(o)}</span></label>`).join('')}</div></div>`).join('')}</div><div class="fa-actions"><button class="fa-submit" type="button">Submit Formative Assessment</button></div><div class="fa-result" style="display:none"></div></div>`;
    container.querySelectorAll('input[type=radio]').forEach(input=>input.addEventListener('change',()=>{
      const q=container.querySelector(`[data-fa-q="${input.dataset.q}"]`);q?.classList.add('done');
      q?.querySelectorAll('.fa-option').forEach(x=>x.classList.remove('selected'));input.closest('.fa-option')?.classList.add('selected');
    }));
    container.querySelector('.fa-submit').addEventListener('click',()=>submitAssessment(container,questions));
  }

  async function submitAssessment(container,questions){
    if(busy)return;
    const answers={};
    for(let i=0;i<questions.length;i++){
      const selected=container.querySelector(`input[name="fa_${i}"]:checked`);
      if(!selected){
        const result=container.querySelector('.fa-result');result.style.display='block';result.className='fa-result fa-warn';result.textContent=`Please answer question ${i+1} before submitting.`;container.querySelector(`[data-fa-q="${i}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});return;
      }
      const q=questions[i];answers[q.id||`formative_${i+1}`]=q.options[Number(selected.value)];
    }
    const result=container.querySelector('.fa-result');result.style.display='block';result.className='fa-result fa-warn';result.textContent='Submitting your formative assessment…';
    const btn=container.querySelector('.fa-submit');btn.disabled=true;busy=true;
    try{
      let score=0;
      questions.forEach((q,i)=>{
        const chosen=q.options[Number(container.querySelector(`input[name="fa_${i}"]:checked`).value)];
        if(q.correctValue && clean(chosen)===clean(q.correctValue))score++;
        else if(q.correct && 'ABCD'[Number(container.querySelector(`input[name="fa_${i}"]:checked`).value)]===q.correct)score++;
      });
      let saved=false;
      if(window.submitQuizAttempt && window.__activeModuleId && questions.every(q=>q.id)){
        const response=await window.submitQuizAttempt({moduleId:window.__activeModuleId,answers,clientSubmissionId:window.createClientSubmissionId?window.createClientSubmissionId():`fa-${Date.now()}-${Math.random().toString(36).slice(2)}`});
        if(response?.queued){saved=true;}
        else if(response?.data){score=Number(response.data.score??score);saved=true;}
      }
      const percent=Math.round(score/questions.length*100);
      result.className=`fa-result ${percent>=50?'fa-good':'fa-warn'}`;
      result.innerHTML=`<b>Assessment completed — Score: ${score}/${questions.length} (${percent}%).</b><div class="fa-review">${questions.map((q,i)=>{const chosen=q.options[Number(container.querySelector(`input[name="fa_${i}"]:checked`).value)];const ok=q.correctValue?clean(chosen)===clean(q.correctValue):(q.correct&&'ABCD'[Number(container.querySelector(`input[name="fa_${i}"]:checked`).value)]===q.correct);return `<div class="fa-review ${ok?'correct':'wrong'}"><b>${i+1}. ${ok?'✓ Correct':'✗ Review'}</b> — Your answer: ${escapeHtml(chosen)}${!ok&&q.correctValue?`<br>Correct answer: <b>${escapeHtml(q.correctValue)}</b>`:''}</div>`}).join('')}</div>`;
      if(saved&&responseQueued())result.innerHTML='<b>Assessment saved.</b><br>Your answers have been recorded and will sync if needed.'+result.innerHTML;
      container.querySelectorAll('input').forEach(x=>x.disabled=true);btn.textContent='Assessment Completed';
      if(saved&&window.refreshLiveSurface)window.refreshLiveSurface('formative-assessment');
    }catch(e){
      result.className='fa-result fa-warn';result.textContent='The assessment could not be submitted. Please try again.';btn.disabled=false;
    }finally{busy=false;}
  }

  let lastQueued=false;
  function responseQueued(){const x=lastQueued;lastQueued=false;return x;}

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

  async function processLesson(article){
    if(!article||article.dataset.faProcessed)return;
    const content=article.querySelector('.lesson-content');if(!content)return;
    const parsed=parseAssessment(content.textContent);if(!parsed||parsed.questions.length<5)return;
    article.dataset.faProcessed='loading';
    const questions=await loadQuestionKeys(window.__activeModuleId,parsed.questions.slice(0,5));
    const marker=document.createElement('div');marker.className='fa-mount';
    const studyText=content.textContent.slice(parsed.endIndex);
    const mainText=content.textContent.slice(0,parsed.start).trim();
    const studyPart=studyText.trim();
    content.textContent=mainText;
    content.insertAdjacentElement('afterend',marker);
    renderQuestions(marker,questions);
    const study=studyPart?document.createElement('div'):null;
    if(study){study.className='lesson-content';study.textContent=studyPart;marker.insertAdjacentElement('afterend',study);}
    article.dataset.faProcessed='yes';
  }

  async function scan(){
    addStyles();
    const articles=[...document.querySelectorAll('article.card')];
    for(const article of articles)await processLesson(article);
  }

  function boot(){
    addStyles();scan();
    const observer=new MutationObserver(()=>{if(!busy)scan()});
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{if(!busy)scan()},1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
