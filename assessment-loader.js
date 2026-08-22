// Production loader for the isolated module-level formative assessment engine.
(function(){
  'use strict';
  const VERSION='20260822-module-assessment-v8';

  function add(src,attr){
    if(document.querySelector('script[src*="'+src+'"]')) return;
    const s=document.createElement('script');
    s.src=src+'?v='+VERSION;
    s.defer=true;
    s.setAttribute(attr,'true');
    document.head.appendChild(s);
  }

  function attachToOpenModule(){
    if(typeof window.openModule!=='function' || window.__isdAssessmentWrapped) return;
    const original=window.openModule;
    window.openModule=async function(moduleId,courseId){
      const result=await original.apply(this,arguments);
      try{
        const oldQuiz=document.getElementById('moduleQuiz');
        if(!oldQuiz) return result;
        const host=document.createElement('div');
        host.id='moduleAssessmentHost';
        host.setAttribute('data-module-assessment-host','true');
        host.className='module-assessment-host';
        oldQuiz.replaceWith(host);
        const legacySubmit=document.querySelector('button[onclick*="submitModuleQuiz"]');
        if(legacySubmit) legacySubmit.remove();
        document.querySelectorAll('h3').forEach(function(h){
          const text=(h.textContent||'').trim().toLowerCase();
          if(text==='📝 formative quiz' || text==='formative quiz') h.textContent='📝 Formative Assessment';
        });
        if(window.ModuleAssessment && typeof window.ModuleAssessment.mount==='function'){
          await window.ModuleAssessment.mount({moduleId:moduleId,courseId:courseId||null,container:host});
        }
      }catch(error){
        console.error('IS-DLSS module assessment attachment failed:',error);
      }
      return result;
    };
    window.__isdAssessmentWrapped=true;
  }

  function load(){
    add('module-assessment.js','data-module-assessment');
    add('assessment-review-fix.js','data-assessment-review-fix');
    add('teacher-feedback-fix.js','data-teacher-feedback-fix');
    add('assessment-runtime-guard.js','data-assessment-runtime-guard');
    attachToOpenModule();
    let attempts=0;
    const timer=setInterval(function(){
      attachToOpenModule();
      attempts+=1;
      if(window.__isdAssessmentWrapped || attempts>40) clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load);
  else load();
})();
