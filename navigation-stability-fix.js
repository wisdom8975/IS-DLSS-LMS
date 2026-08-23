// IS-DLSS Navigation Stability Fix v1
// Prevents reconnect/offline recovery handlers from forcing learners back to Dashboard.
(function(){
  'use strict';
  const KEY='isd_navigation_view_v1';
  const read=()=>{try{return localStorage.getItem(KEY)||''}catch(_){return ''}};
  const write=v=>{try{localStorage.setItem(KEY,String(v||''))}catch(_) {}};
  const isLearnerSurface=()=>{
    const hint=window.__isdViewHint||read();
    return hint==='courses'||hint==='course'||hint==='module'||!!document.getElementById('moduleQuiz');
  };

  // Record the logical screen whenever the existing global navigation functions are used.
  let tries=0;
  const hook=()=>{
    let changed=false;
    if(typeof window.show==='function'&&!window.show.__isdNavStable){
      const original=window.show;
      const wrapped=function(v){write(v==='courses'?'courses':v==='dashboard'?'dashboard':String(v||''));window.__isdViewHint=String(v||'');return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.show=wrapped;changed=true;
    }
    if(typeof window.studentLearning==='function'&&!window.studentLearning.__isdNavStable){
      const original=window.studentLearning;
      const wrapped=function(){write('courses');window.__isdViewHint='courses';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.studentLearning=wrapped;changed=true;
    }
    if(typeof window.openCourse==='function'&&!window.openCourse.__isdNavStable){
      const original=window.openCourse;
      const wrapped=function(){write('course');window.__isdViewHint='course';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.openCourse=wrapped;changed=true;
    }
    if(typeof window.openModule==='function'&&!window.openModule.__isdNavStable){
      const original=window.openModule;
      const wrapped=function(){write('module');window.__isdViewHint='module';return original.apply(this,arguments)};
      wrapped.__isdNavStable=true;window.openModule=wrapped;changed=true;
    }
    if(typeof window.dashboard==='function'&&!window.dashboard.__isdNavStable){
      const original=window.dashboard;
      const wrapped=async function(){
        // The existing online/reconnect handler calls dashboard() unconditionally.
        // Never allow that call to destroy an active learner course/module surface.
        if(isLearnerSurface())return;
        write('dashboard');window.__isdViewHint='dashboard';
        return original.apply(this,arguments);
      };
      wrapped.__isdNavStable=true;window.dashboard=wrapped;changed=true;
    }
    return changed;
  };
  const timer=setInterval(()=>{if(hook()||++tries>100)clearInterval(timer)},100);
  hook();
  window.__isdNavigationStabilityFix='20260823-v1';
})();
