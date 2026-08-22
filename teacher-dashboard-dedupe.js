// IS-DLSS — duplicate dashboard cleanup compatibility stub.
// The legacy Teacher Feedback dashboard is no longer mounted on the landing page.
// Do not remove or alter the original Teacher dashboard.
(function(){
'use strict';
if(window.__ISDLSS_TEACHER_DASHBOARD_DEDUPE__)return;
window.__ISDLSS_TEACHER_DASHBOARD_DEDUPE__=true;
function clean(){
  // Remove only an obsolete feedback host if an older cached script creates it.
  document.querySelectorAll('#isd-teacher-feedback-dashboard').forEach(x=>x.remove());
}
window.teacherDashboardDedupe={refresh:clean};
clean();
new MutationObserver(()=>clean()).observe(document.body,{childList:true,subtree:true});
})();
