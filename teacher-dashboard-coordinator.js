// IS-DLSS — Teacher Dashboard owner.
// The Teacher landing page is the original role dashboard rendered by dashboard().
// Do NOT mount the separate Teacher Feedback dashboard here.
// Feedback/review remains available from the Teacher supervision workflow.
(function(){
'use strict';
if(window.__isdTeacherDashboardCoordinator)return;
window.__isdTeacherDashboardCoordinator=true;
const VERSION='20260822-teacher-dashboard-single-owner-v2';
function role(){return String(document.getElementById('role')?.value||window.profile?.role||window.currentUser?.role||'').trim().toLowerCase();}
function view(){return String(window.currentView||'dashboard').trim().toLowerCase();}
function removeLegacyFeedbackDashboard(){
  if(role()!=='teacher'||view()!=='dashboard')return;
  document.querySelectorAll('#isd-teacher-feedback-dashboard').forEach(x=>x.remove());
  document.querySelectorAll('#isd-tfb-v6-modal').forEach(x=>x.remove());
}
function runCleanup(){
  try{removeLegacyFeedbackDashboard();}catch(e){console.warn('Teacher dashboard owner cleanup:',e);}
}
window.teacherDashboardCoordinator={refresh:runCleanup};
window.__isdTeacherDashboardCoordinatorVersion=VERSION;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(runCleanup,100));
else setTimeout(runCleanup,100);
new MutationObserver(()=>setTimeout(runCleanup,40)).observe(document.body,{childList:true,subtree:true});
})();
