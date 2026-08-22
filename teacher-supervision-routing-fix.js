// IS-DLSS — Teacher supervision navigation fix.
// A Teacher's "Supervise Learners" action must open the supervision workspace,
// not stack the feedback dashboard on top of the legacy supervision view.
(function(){
'use strict';
if(window.__isdTeacherSupervisionRoutingFix)return;
window.__isdTeacherSupervisionRoutingFix=true;
const originalShow=window.show;
if(typeof originalShow!=='function')return;
const isTeacher=()=>String(window.role||document.getElementById('role')?.value||window.profile?.role||window.currentUser?.role||'').trim().toLowerCase()==='teacher';
const removeTeacherFeedbackSurfaces=()=>{
  document.querySelectorAll('#isd-teacher-feedback-dashboard').forEach(x=>x.remove());
  document.querySelectorAll('#isd-tfb-v6-modal').forEach(x=>x.remove());
};
window.show=function(view,el){
  if(String(view).toLowerCase()==='supervision'&&isTeacher()){
    removeTeacherFeedbackSurfaces();
    const result=originalShow.apply(this,arguments);
    Promise.resolve(result).finally(()=>{
      setTimeout(removeTeacherFeedbackSurfaces,0);
      setTimeout(removeTeacherFeedbackSurfaces,250);
    });
    return result;
  }
  return originalShow.apply(this,arguments);
};
window.__isdTeacherSupervisionRoutingFixVersion='20260822-teacher-supervision-routing-v1';
})();
