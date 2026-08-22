// Runtime hardening for the production Assessment Centre.
// The live LMS can call the assessment route more than once while its
// background surfaces refresh. Do not replace the Assessment Centre DOM while
// an assessment load is already in progress or already rendered.
(function(){
  'use strict';

  function install(){
    if(typeof window.assessment!=='function' || window.__isdAssessmentRuntimeGuard) return;
    const original=window.assessment;
    window.assessment=async function(){
      const main=document.getElementById('main');
      const existing=main && main.querySelector('.hero h1');
      const loading=main && main.querySelector('.notice');
      if(existing && /Assessment Results|Assessment Centre/i.test(existing.textContent||'')) return;
      if(loading && /Loading live assessment evidence/i.test(loading.textContent||'')) return;

      if(window.__isdAssessmentLoadPromise) return window.__isdAssessmentLoadPromise;
      window.__isdAssessmentLoadPromise=Promise.race([
        Promise.resolve(original.apply(this,arguments)),
        new Promise(function(_,reject){setTimeout(function(){reject(new Error('Assessment Centre is taking too long to load. Please try again.'));},15000);})
      ]).catch(function(error){
        const target=document.getElementById('main');
        if(target) target.innerHTML='<div class="card"><h2>Assessment Centre</h2><div class="dangerbox">'+String(error.message||'Unable to load Assessment Centre.')+'</div><button class="btn" type="button" onclick="window.__isdAssessmentLoadPromise=null;window.assessment()">Try Again</button></div>';
      }).finally(function(){window.__isdAssessmentLoadPromise=null;});
      return window.__isdAssessmentLoadPromise;
    };
    window.__isdAssessmentRuntimeGuard=true;
  }

  install();
  const timer=setInterval(function(){
    install();
    if(window.__isdAssessmentRuntimeGuard) clearInterval(timer);
  },100);
})();
