// IS-DLSS Assessment Stability Fix v1
// Keeps a learner inside the active module quiz across accidental reloads,
// prevents live-refresh logic from replacing the quiz, and restores the draft.
(function(){
  'use strict';
  const KEY='isd_active_quiz_route_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}};
  const write=(v)=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}};
  const clear=()=>{try{localStorage.removeItem(KEY)}catch(_) {}};

  function hasQuiz(){return !!document.getElementById('moduleQuiz');}
  function markActive(){
    const mid=window.__activeModuleId, cid=window.__activeCourseId;
    if(mid&&cid&&hasQuiz()){
      write({moduleId:String(mid),courseId:String(cid),savedAt:new Date().toISOString()});
      if(typeof window.currentView!=='undefined') window.currentView='module';
    }
  }

  // Wrap module entry so the active module survives a browser refresh.
  let attempts=0;
  const hook=()=>{
    if(typeof window.openModule==='function' && !window.openModule.__isdStable){
      const original=window.openModule;
      const wrapped=async function(moduleId,courseId){
        write({moduleId:String(moduleId),courseId:String(courseId),savedAt:new Date().toISOString()});
        const result=await original.apply(this,arguments);
        markActive();
        return result;
      };
      wrapped.__isdStable=true;
      window.openModule=wrapped;
      return true;
    }
    return false;
  };
  const timer=setInterval(()=>{if(hook()||++attempts>40)clearInterval(timer)},100);
  hook();

  // Record every answer immediately. This does not cancel the application's
  // existing rememberQuizDraft handler.
  document.addEventListener('change',e=>{
    if(e.target && e.target.matches('input[name^="q_"]')) markActive();
  },true);
  document.addEventListener('click',e=>{
    if(e.target && (e.target.closest('.choice')||e.target.matches('input[name^="q_"]'))) markActive();
  },true);

  // If the learner intentionally leaves the quiz, remove the restore target.
  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('button');
    if(!el)return;
    const text=(el.textContent||'').trim().toLowerCase();
    if(text.includes('course outline')||text.includes('my courses')) clear();
  },true);

  // Re-open the saved module after authentication/boot has completed.
  let restored=false;
  const restore=async()=>{
    if(restored||!window.currentUser||typeof window.openModule!=='function')return;
    const r=read();
    if(!r?.moduleId||!r?.courseId)return;
    if(!document.getElementById('main'))return;
    restored=true;
    try{
      await window.openModule(r.moduleId,r.courseId);
      markActive();
    }catch(err){
      restored=false;
      console.warn('IS-DLSS assessment restore failed:',err);
    }
  };

  // Boot/auth state can settle asynchronously. Retry briefly rather than
  // changing the existing authentication flow.
  let n=0;
  const restoreTimer=setInterval(()=>{
    if(restored||n++>80){clearInterval(restoreTimer);return;}
    restore();
  },250);

  // Keep the route marked if another script rebuilds the quiz DOM.
  const observer=new MutationObserver(()=>{if(hasQuiz())markActive()});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),30000);

  window.__isdAssessmentStabilityFix='20260823-v1';
})();
