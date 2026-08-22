// IS-DLSS — prevent duplicate Teacher dashboard surfaces.
(function(){
'use strict';
if(window.__ISDLSS_TEACHER_DASHBOARD_DEDUPE__)return;
window.__ISDLSS_TEACHER_DASHBOARD_DEDUPE__=true;
function clean(){
  const hosts=[...document.querySelectorAll('#isd-teacher-feedback-dashboard')];
  hosts.slice(1).forEach(x=>x.remove());
  // Some older dashboard versions can render an equivalent surface without
  // the shared host id. Keep the first real feedback dashboard only.
  const candidates=[...document.querySelectorAll('.isd-v6-hero')];
  candidates.slice(1).forEach(hero=>{
    const section=hero.closest('section');
    if(section && section!==hosts[0]) section.remove();
  });
}
clean();
new MutationObserver(()=>clean()).observe(document.body,{childList:true,subtree:true});
window.teacherDashboardDedupe={refresh:clean};
})();
