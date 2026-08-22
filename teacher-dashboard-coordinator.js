// IS-DLSS — deterministic Teacher Dashboard coordinator.
// One Teacher dashboard owner; feedback/review modules mount into a single slot.
(function(){
'use strict';
if(window.__isdTeacherDashboardCoordinator)return;
window.__isdTeacherDashboardCoordinator=true;
const VERSION='20260822-teacher-dashboard-coordinator-v1';
let originalDashboard=null;
function role(){return String(document.getElementById('role')?.value||window.profile?.role||window.currentUser?.role||'').trim().toLowerCase();}
function mountFeedback(){
  if(role()!=='teacher')return;
  const main=document.getElementById('main');
  if(!main)return;
  const old=[...main.querySelectorAll('#isd-teacher-feedback-dashboard')];
  const host=old[0]||document.createElement('section');
  old.slice(1).forEach(x=>x.remove());
  if(!host.id)host.id='isd-teacher-feedback-dashboard';
  if(!host.parentNode){
    const metrics=main.querySelector('.grid4');
    if(metrics)metrics.insertAdjacentElement('afterend',host);
    else main.appendChild(host);
  }
  if(typeof window.teacherFeedbackDashboard?.refresh==='function'){
    try{window.teacherFeedbackDashboard.refresh();}catch(_){ }
  }
}
function bindReviewBridge(){
  const host=document.getElementById('isd-teacher-feedback-dashboard');
  if(!host||host.__isdReviewCapture)return;
  host.__isdReviewCapture=true;
  host.addEventListener('click',function(e){
    const b=e.target.closest('[data-id]');
    if(!b||!host.contains(b))return;
    const id=b.getAttribute('data-id');
    if(!id||typeof window.assessmentDetail!=='function')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.assessmentDetail(id);
  },true);
}
async function run(){
  if(!originalDashboard)originalDashboard=window.dashboard;
  if(typeof originalDashboard!=='function')return;
  const result=await originalDashboard.apply(this,arguments);
  if(role()==='teacher'){
    mountFeedback();
    bindReviewBridge();
    setTimeout(()=>{mountFeedback();bindReviewBridge();},50);
  }
  return result;
}
window.dashboard=run;
window.__isdTeacherDashboardCoordinatorVersion=VERSION;
const timer=setInterval(()=>{
  if(window.dashboard!==run&&typeof window.__isdRoleRoutingVersion==='string'){
    originalDashboard=window.dashboard;
    window.dashboard=run;
  }
  if(role()==='teacher')bindReviewBridge();
},500);
setTimeout(()=>clearInterval(timer),15000);
})();
