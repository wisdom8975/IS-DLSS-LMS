// IS-DLSS Navigation Stability Fix v3
// Keep learners, teachers, and administrators on the active LMS surface when
// connectivity recovery or an unexpected browser refresh occurs.
(function(){
  'use strict';
  const KEY='isd_navigation_view_v3';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}};
  const clear=()=>{try{localStorage.removeItem(KEY)}catch(_) {}};
  const uid=()=>window.currentUser?.id||null;
  const save=(view,courseId=null,moduleId=null)=>write({view,courseId:courseId?String(courseId):null,moduleId:moduleId?String(moduleId):null,userId:uid(),savedAt:new Date().toISOString()});
  const route=()=>read();
  const activeView=()=>window.__isdViewHint||window.currentView||route()?.view||'';
  const protectedSurface=()=>{const v=activeView();return !!v&&v!=='dashboard'&&v!=='login'};

  let explicitDashboard=false;
  let tries=0;
  const hook=()=>{
    let changed=false;
    if(typeof window.show==='function'&&!window.show.__isdNavStable){
      const original=window.show;
      const wrapped=function(v){
        const view=String(v||'');
        if(view==='dashboard'){
          explicitDashboard=true;
          clear();
        }else{
          explicitDashboard=false;
          save(view);
        }
        window.__isdViewHint=view;
        return original.apply(this,arguments);
      };
      wrapped.__isdNavStable=true;window.show=wrapped;changed=true;
    }
    if(typeof window.studentLearning==='function'&&!window.studentLearning.__isdNavStable){
      const original=window.studentLearning;
      const wrapped=function(){save('courses');window.__isdViewHint='courses';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.studentLearning=wrapped;changed=true;
    }
    if(typeof window.openCourse==='function'&&!window.openCourse.__isdNavStable){
      const original=window.openCourse;
      const wrapped=function(courseId){save('course',courseId);window.__isdViewHint='course';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.openCourse=wrapped;changed=true;
    }
    if(typeof window.openModule==='function'&&!window.openModule.__isdNavStable){
      const original=window.openModule;
      const wrapped=function(moduleId,courseId){save('module',courseId,moduleId);window.__isdViewHint='module';return original.apply(this,arguments)};
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
        // The existing online/reconnect and offline-sync handlers call dashboard()
        // unconditionally. That must never interrupt an active LMS surface.
        if(protectedSurface()&&!explicitDashboard)return;
        const result=await original.apply(this,arguments);
        explicitDashboard=false;
        return result;
      };
      wrapped.__isdNavStable=true;window.dashboard=wrapped;changed=true;
    }
    return changed;
  };
  const timer=setInterval(()=>{if(hook()||++tries>120)clearInterval(timer)},100);
  hook();

  // Restore the last meaningful surface after a full browser/page reload.
  let restoreTries=0,restored=false;
  const restore=async()=>{
    if(restored||!uid())return;
    const r=route();
    if(!r||r.userId!==uid()||!r.view||r.view==='dashboard')return;
    restored=true;
    try{
      if(r.view==='courses'&&typeof window.studentLearning==='function')await window.studentLearning();
      else if(r.view==='course'&&r.courseId&&typeof window.openCourse==='function')await window.openCourse(r.courseId);
      else if(r.view==='module'&&r.moduleId&&r.courseId&&typeof window.openModule==='function')await window.openModule(r.moduleId,r.courseId);
      else if(typeof window.show==='function')await window.show(r.view);
      else restored=false;
    }catch(e){restored=false;console.warn('IS-DLSS navigation restore failed:',e)}
  };
  const restoreTimer=setInterval(()=>{if(restored||restoreTries++>160){clearInterval(restoreTimer);return}restore()},250);
  window.__isdNavigationStabilityFix='20260823-v3';
})();
