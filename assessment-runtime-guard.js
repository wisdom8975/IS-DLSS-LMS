// Runtime hardening for the production Assessment Centre.
// The Assessment Centre is an editing surface during teacher feedback. Live
// background refreshes must never replace that surface or interrupt typing.
(function(){
  'use strict';

  function install(){
    if(window.__isdAssessmentRuntimeGuard) return;
    if(typeof window.assessment!=='function') return;

    const originalAssessment=window.assessment;
    window.assessment=async function(){
      if(window.__isdFeedbackEditing) return;
      const main=document.getElementById('main');
      const existing=main && main.querySelector('.hero h1');
      const loading=main && main.querySelector('.notice');
      if(existing && /Assessment Results|Assessment Centre/i.test(existing.textContent||'')) return;
      if(loading && /Loading live assessment evidence/i.test(loading.textContent||'')) return;
      if(window.__isdAssessmentLoadPromise) return window.__isdAssessmentLoadPromise;
      window.__isdAssessmentLoadPromise=Promise.race([
        Promise.resolve(originalAssessment.apply(this,arguments)),
        new Promise(function(_,reject){setTimeout(function(){reject(new Error('Assessment Centre is taking too long to load. Please try again.'));},15000);})
      ]).catch(function(error){
        const target=document.getElementById('main');
        if(target&&!window.__isdFeedbackEditing) target.innerHTML='<div class="card"><h2>Assessment Centre</h2><div class="dangerbox">'+String(error.message||'Unable to load Assessment Centre.')+'</div><button class="btn" type="button" onclick="window.__isdAssessmentLoadPromise=null;window.assessment()">Try Again</button></div>';
      }).finally(function(){window.__isdAssessmentLoadPromise=null;});
      return window.__isdAssessmentLoadPromise;
    };

    // The original live-update function is allowed to continue everywhere else,
    // but it is a complete no-op while teacher feedback is being edited.
    if(typeof window.refreshLiveSurface==='function' && !window.__isdRefreshGuardInstalled){
      const originalRefresh=window.refreshLiveSurface;
      window.refreshLiveSurface=async function(){
        if(window.__isdFeedbackEditing) return;
        return originalRefresh.apply(this,arguments);
      };
      window.__isdRefreshGuardInstalled=true;
    }

    window.__isdAssessmentRuntimeGuard=true;
  }

  install();
  const timer=setInterval(function(){
    install();
    if(window.__isdAssessmentRuntimeGuard) clearInterval(timer);
  },100);
})();
