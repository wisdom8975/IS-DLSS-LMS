// IS-DLSS — keep the Teacher landing dashboard clean.
// The Assessment Centre is a separate navigation destination; it must not
// be rendered underneath the Teacher Dashboard immediately after sign-in.
(function(){
'use strict';
if(window.__ISDLSS_TEACHER_DASHBOARD_CLEANUP__)return;
window.__ISDLSS_TEACHER_DASHBOARD_CLEANUP__=true;

function role(){
  return String(window.profile?.role||window.currentUser?.role||document.getElementById('role')?.value||'').trim().toLowerCase();
}
function view(){return String(window.currentView||'dashboard').trim().toLowerCase();}
function removeAssessmentSurface(){
  if(role()!=='teacher' || view()==='assessment')return;
  const main=document.getElementById('main');
  if(!main)return;
  const headings=[...main.querySelectorAll('h1,h2,h3')];
  const heading=headings.find(h=>{
    const t=(h.textContent||'').trim().toLowerCase();
    return t==='learner assessment results' || t==='assessment centre' || t==='institutional assessment results';
  });
  if(!heading)return;

  // Remove the containing assessment block rather than only its hero, so the
  // KPI cards and assessment-history table cannot remain below the dashboard.
  let node=heading.closest('.hero');
  if(node && node.parentElement===main){node.remove();return;}
  if(node){
    let root=node;
    while(root.parentElement && root.parentElement!==main)root=root.parentElement;
    if(root.parentElement===main){root.remove();return;}
  }
  // Fallback: remove a direct assessment heading and the following assessment
  // siblings until the next recognised Teacher Dashboard section.
  let el=heading.closest('.card')||heading;
  while(el && el.parentElement===main){
    const next=el.nextElementSibling;
    el.remove();
    if(!next)break;
    const text=(next.textContent||'').toLowerCase();
    if(text.includes('teacher dashboard')||text.includes('teacher feedback'))break;
    if(next.querySelector?.('h1,h2,h3')){const h=next.querySelector('h1,h2,h3');const ht=(h.textContent||'').toLowerCase();if(ht.includes('assessment')||ht.includes('quiz attempts')||ht.includes('assessment history'))continue;}
    break;
  }
}
function run(){
  try{removeAssessmentSurface();}catch(e){console.warn('Teacher dashboard cleanup:',e);}
}

window.teacherDashboardCleanup={refresh:run};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,200));
else setTimeout(run,200);
new MutationObserver(()=>setTimeout(run,60)).observe(document.body,{childList:true,subtree:true});
setInterval(run,1000);
})();
