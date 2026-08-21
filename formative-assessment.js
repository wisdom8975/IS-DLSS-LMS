// Interactive formative assessment module for IS-DLSS.
// This file is intentionally self-contained so the student portal can load it
// reliably even when the main HTML has cached/older inline assessment markup.
(function(){
  'use strict';

  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});
  }

  function getAssessmentHost(){
    return document.querySelector('#moduleQuiz') || document.querySelector('[data-formative-assessment]');
  }

  function getQuestions(){
    return [
      {q:'Which organ produces sperm cells?', options:['Prostate gland','Testis','Ureter','Bladder'], answer:1, explanation:'The testes contain seminiferous tubules where sperm production occurs.'},
      {q:'Gametes are normally:', options:['Diploid','Triploid','Haploid','Tetraploid'], answer:2, explanation:'Gametes are haploid so that fertilisation restores the diploid chromosome number.'},
      {q:'Where does spermatogenesis mainly occur?', options:['Seminiferous tubules','Uterus','Cervix','Oviduct'], answer:0, explanation:'Spermatogenesis takes place in the seminiferous tubules of the testes.'},
      {q:'Which process increases genetic variation during meiosis?', options:['Binary fission','Crossing over','Transpiration','Diffusion'], answer:1, explanation:'Crossing over exchanges DNA between homologous chromosomes during meiosis I.'},
      {q:'What is the usual site of fertilisation in humans?', options:['Uterus','Oviduct','Cervix','Vagina'], answer:1, explanation:'Fertilisation normally occurs in the oviduct (fallopian tube), especially the ampulla.'}
    ];
  }

  function render(){
    var host=getAssessmentHost();
    if(!host) return false;
    // Replace the old text-only assessment with actual controls.
    host.innerHTML='';
    host.setAttribute('data-interactive-formative','true');
    var title=document.createElement('div');
    title.className='formative-title';
    title.innerHTML='<h3>FORMATIVE ASSESSMENT</h3><p>Answer all 5 questions. Select one answer for each question, then submit.</p>';
    host.appendChild(title);
    var qs=getQuestions();
    qs.forEach(function(item,i){
      var box=document.createElement('section');
      box.className='formative-question';
      box.innerHTML='<h4>'+ (i+1)+'. '+escapeHtml(item.q)+'</h4>';
      var choices=document.createElement('div');
      choices.className='formative-choices';
      item.options.forEach(function(opt,j){
        var label=document.createElement('label');
        label.className='formative-choice';
        label.innerHTML='<input type="radio" name="formative_'+i+'" value="'+j+'"><span><b>'+String.fromCharCode(65+j)+'.</b> '+escapeHtml(opt)+'</span>';
        choices.appendChild(label);
      });
      box.appendChild(choices);
      host.appendChild(box);
    });
    var submit=document.createElement('button');
    submit.type='button';
    submit.className='btn formative-submit';
    submit.textContent='SUBMIT FORMATIVE ASSESSMENT';
    submit.addEventListener('click',function(){submitAssessment(host,qs);});
    host.appendChild(submit);
    var result=document.createElement('div');
    result.id='formativeResult';
    result.setAttribute('aria-live','polite');
    host.appendChild(result);
    return true;
  }

  async function submitAssessment(host,qs){
    var score=0, answered=0;
    qs.forEach(function(item,i){
      var selected=host.querySelector('input[name="formative_'+i+'"]:checked');
      var labels=host.querySelectorAll('input[name="formative_'+i+'"]');
      labels.forEach(function(input){input.closest('label').classList.remove('correct','incorrect');});
      if(selected){
        answered++;
        var label=selected.closest('label');
        if(Number(selected.value)===item.answer){score++;label.classList.add('correct');}
        else label.classList.add('incorrect');
      }
    });
    var result=host.querySelector('#formativeResult');
    if(answered<qs.length){
      result.className='formative-result warning';
      result.textContent='Please answer all 5 questions before submitting.';
      return;
    }
    var percent=Math.round(score/qs.length*100);
    result.className='formative-result '+(percent>=50?'good':'bad');
    result.innerHTML='<strong>Assessment completed.</strong> Score: '+score+'/'+qs.length+' ('+percent+'%). '+(percent>=50?'Good work. Review the highlighted answers and continue to the next lesson.':'Review the lesson content and try again.');
    host.dataset.completed='true';
    host.dataset.score=String(score);
    // Persist locally immediately; if the application exposes its existing
    // assessment persistence function, use it as well.
    try{
      localStorage.setItem('isdlss_formative_module1_completed','true');
      localStorage.setItem('isdlss_formative_module1_score',String(score));
      if(typeof window.saveAssessmentResult==='function') await window.saveAssessmentResult('biology-module-1',score,qs.length);
    }catch(e){}
  }

  function injectStyles(){
    if(document.getElementById('interactive-formative-styles')) return;
    var s=document.createElement('style');s.id='interactive-formative-styles';
    s.textContent=''+
      '[data-interactive-formative]{margin-top:18px}'+
      '.formative-title{padding:16px 18px;background:#eef7f1;border:1px solid #d9eee2;border-radius:14px;margin-bottom:14px}'+
      '.formative-title h3{margin:0 0 5px;color:#075c3a;font-size:20px}'+
      '.formative-title p{margin:0;color:#65746e;font-size:14px}'+
      '.formative-question{padding:16px;margin:12px 0;border:1px solid #dfe7e2;border-radius:14px;background:#fff}'+
      '.formative-question h4{margin:0 0 12px;line-height:1.55;font-size:16px}'+
      '.formative-choices{display:grid;gap:9px}'+
      '.formative-choice{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid #dfe7e2;border-radius:10px;background:#fff;cursor:pointer;transition:.15s}'+
      '.formative-choice:hover{background:#f5f8f7;border-color:#9db9aa}'+
      '.formative-choice input{margin-top:4px;accent-color:#075c3a}'+
      '.formative-choice.correct{border:2px solid #18804f;background:#e9f8ee}'+
      '.formative-choice.incorrect{border:2px solid #dc4c64;background:#fff0f1}'+
      '.formative-submit{width:100%;margin-top:15px;padding:13px;font-size:14px}'+
      '.formative-result{margin-top:14px;padding:14px;border-radius:10px;line-height:1.55}'+
      '.formative-result.good{background:#e9f8ee;color:#075c3a}.formative-result.bad{background:#fff0f1;color:#a3223c}.formative-result.warning{background:#fff8e8;color:#805400}';
    document.head.appendChild(s);
  }

  function boot(){
    injectStyles();
    // Run repeatedly because the LMS renders course/lesson screens dynamically.
    render();
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(render() || tries>30) clearInterval(timer);
    },500);
    var obs=new MutationObserver(function(){
      if(document.querySelector('#moduleQuiz') && !document.querySelector('[data-interactive-formative="true"]')) render();
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
