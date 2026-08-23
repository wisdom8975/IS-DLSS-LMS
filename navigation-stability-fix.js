// IS-DLSS Navigation Stability Fix v2
// Prevents reconnect/offline recovery handlers from forcing learners back to Dashboard
// and restores the learner's last course/module after an unexpected page reload.
(function(){
  'use strict';
  const KEY='isd_navigation_view_v2';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}};
  const clear=()=>{try{localStorage.removeItem(KEY)}catch(_) {}};
  const isLearnerSurface=()=>{
    const r=read(),hint=window.__isdViewHint||r?.view||'';
    return hint==='courses'||hint==='course'||hint==='module'||!!document.getElementById('moduleQuiz');
  };
  const currentUserId=()=>window.currentUser?.id||null;
  const saveRoute=(view,courseId=null,moduleId=null)=>write({view,courseId:courseId?String(courseId):null,moduleId:moduleId?String(moduleId):null,userId:currentUserId(),savedAt:new Date().toISOString()});

  let tries=0;
  const hook=()=>{
    let changed=false;
    if(typeof window.show==='function'&&!window.show.__isdNavStable){
      const original=window.show;
      const wrapped=function(v){
        const view=String(v||'');
        if(view==='dashboard')clear();
        else saveRoute(view);
        window.__isdViewHint=view;
        return original.apply(this,arguments);
      };
      wrapped.__isdNavStable=true;window.show=wrapped;changed=true;
    }
    if(typeof window.studentLearning==='function'&&!window.studentLearning.__isdNavStable){
      const original=window.studentLearning;
      const wrapped=function(){saveRoute('courses');window.__isdViewHint='courses';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.studentLearning=wrapped;changed=true;
    }
    if(typeof window.openCourse==='function'&&!window.openCourse.__isdNavStable){
      const original=window.openCourse;
      const wrapped=function(courseId){saveRoute('course',courseId);window.__isdViewHint='course';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.openCourse=wrapped;changed=true;
    }
    if(typeof window.openModule==='function'&&!window.openModule.__isdNavStable){
      const original=window.openModule;
      const wrapped=function(moduleId,courseId){saveRoute('module',courseId,moduleId);window.__isdViewHint='module';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.openModule=wrapped;changed=true;
    }
    if(typeof window.logout==='function'&&!window.logout.__isdNavStable){
      const original=window.logout;
      const wrapped=function(){clear();return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.logout=wrapped;changed=true;
    }
    if(typeof window.dashboard==='function'&&!window.dashboard.__isdNavStable){
      const original=window.dashboard;
      const wrapped=async function(){
        // The existing online/reconnect handler calls dashboard() unconditionally.
        // Never allow that call to destroy an active learner course/module surface.
        if(isLearnerSurface())return;
        return original.apply(this,arguments);
      };
      wrapped.__isdNavStable=true;window.dashboard=wrapped;changed=true;
    }
    return changed;
  };
  const timer=setInterval(()=>{if(hook()||++tries>120)clearInterval(timer)},100);
  hook();

  // If the browser actually reloads, restore the learner's last location once the
  // application has initialized. This is deliberately limited to the same user.
  let restoreTries=0,restored=false;
  const restore=async()=>{
    if(restored||!currentUserId())return;
    const r=read();
    if(!r||r.userId!==currentUserId())return;
    if(r.view==='dashboard')return;
    if(typeof window.studentLearning!=='function'||typeof window.openCourse!=='function'||typeof window.openModule!=='function')return;
    restored=true;
    try{
      if(r.view==='courses')await window.studentLearning();
      else if(r.view==='course'&&r.courseId)await window.openCourse(r.courseId);
      else if(r.view==='module'&&r.moduleId&&r.courseId)await window.openModule(r.moduleId,r.courseId);
    }catch(e){restored=false;console.warn('IS-DLSS navigation restore failed:',e)}
  };
  const restoreTimer=setInterval(()=>{if(restored||restoreTries++>120){clearInterval(restoreTimer);return}restore()},250);
  window.__isdNavigationStabilityFix='20260823-v2';
})();
