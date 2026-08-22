// Production loader for the isolated module-level formative assessment engine.
(function(){
  'use strict';
  const VERSION='20260822-module-assessment-v1';

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

        // Preserve the existing module/lesson UI but replace only the legacy quiz surface.
        const host=document.createElement('div');
        host.id='moduleAssessmentHost';
        host.setAttribute('data-module-assessment-host','true');
        host.className='module-assessment-host';
        oldQuiz.replaceWith(host);

        // Remove the legacy "Submit Quiz" button immediately following the old quiz container.
        const legacySubmit=document.querySelector('button[onclick*="submitModuleQuiz"]');
        if(legacySubmit) legacySubmit.remove();

        document.querySelectorAll('h3').forEach(function(h){
          const text=(h.textContent||'').trim().toLowerCase();
          if(text==='📝 formative quiz' || text==='formative quiz') h.textContent='📝 Formative Assessment';
        });

        if(window.ModuleAssessment && typeof window.ModuleAssessment.mount==='function'){
          await window.ModuleAssessment.mount({moduleId,courseId,container:host});
        }
      }catch(error){
        console.error('IS-DLSS module assessment attachment failed:',error);
      }
      return result;
    };
    window.__isdAssessmentWrapped=true;
  }

  function load(){
    // The LMS now uses one isolated 20-question objective assessment per module.
    // Do not load the retired lesson-level or legacy inline quiz engine.
    add('module-assessment.js','data-module-assessment');
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
