// IS-DLSS Assessment Stability Fix v2
(function(){
  'use strict';
  const KEY='isd_active_quiz_route_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}};
  const clear=()=>{try{localStorage.removeItem(KEY)}catch(_) {}};
  const hasQuiz=()=>!!document.getElementById('moduleQuiz');
  function markActive(){
    const mid=window.__activeModuleId,cid=window.__activeCourseId;
    if(mid&&cid&&hasQuiz())write({moduleId:String(mid),courseId:String(cid),savedAt:new Date().toISOString()});
  }
  let attempts=0;
  const hook=()=>{
    if(typeof window.openModule==='function'&&!window.openModule.__isdStable){
      const original=window.openModule;
      const wrapped=async function(moduleId,courseId){
        write({moduleId:String(moduleId),courseId:String(courseId),savedAt:new Date().toISOString()});
        const result=await original.apply(this,arguments);markActive();return result;
      };
      wrapped.__isdStable=true;window.openModule=wrapped;return true;
    }return false;
  };
  const timer=setInterval(()=>{if(hook()||++attempts>40)clearInterval(timer)},100);hook();
  document.addEventListener('change',e=>{if(e.target?.matches('input[name^="q_"]'))markActive()},true);
  document.addEventListener('click',e=>{if(e.target&&(e.target.closest('.choice')||e.target.matches('input[name^="q_"]')))markActive()},true);
  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('button');if(!el)return;
    const text=(el.textContent||'').trim().toLowerCase();
    if(text.includes('course outline')||text.includes('my courses'))clear();
  },true);
  let refreshAttempts=0;
  const hookRefresh=()=>{
    if(typeof window.refreshLiveSurface==='function'&&!window.refreshLiveSurface.__isdStable){
      const original=window.refreshLiveSurface;
      const wrapped=async function(reason){
        if(hasQuiz()){
          try{if(typeof window.refreshNotificationBadge==='function')await window.refreshNotificationBadge()}catch(_){}
          return;
        }
        return original.apply(this,arguments);
      };
      wrapped.__isdStable=true;window.refreshLiveSurface=wrapped;return true;
    }return false;
  };
  const refreshTimer=setInterval(()=>{if(hookRefresh()||++refreshAttempts>40)clearInterval(refreshTimer)},100);hookRefresh();
  let restored=false;
  const restore=async()=>{
    if(restored||!window.currentUser||typeof window.openModule!=='function')return;
    const r=read();if(!r?.moduleId||!r?.courseId)return;
    const main=document.getElementById('main');if(!main||!main.innerHTML.trim())return;
    restored=true;
    try{await window.openModule(r.moduleId,r.courseId);markActive()}
    catch(err){restored=false;console.warn('IS-DLSS assessment restore failed:',err)}
  };
  let n=0;
  const restoreTimer=setInterval(()=>{if(restored||n++>80){clearInterval(restoreTimer);return}restore()},250);
  const observer=new MutationObserver(()=>{if(hasQuiz())markActive()});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),30000);
  window.__isdAssessmentStabilityFix='20260823-v2';
})();
