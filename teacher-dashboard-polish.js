// IS-DLSS — professional Teacher Dashboard presentation layer.
// Desktop-first, compact, information-dense; preserves existing data/actions.
(function(){
'use strict';
if(window.__isdTeacherDashboardPolish)return;
window.__isdTeacherDashboardPolish=true;
const css=`
/* Teacher workspace: professional desktop layout */
#isd-teacher-feedback-dashboard{width:100%!important;max-width:1180px!important;margin:0 auto 34px!important;font-family:inherit!important}
#isd-teacher-feedback-dashboard .isd-v6-hero{min-height:170px!important;padding:28px 32px!important;border-radius:18px!important;box-shadow:0 10px 28px rgba(12,62,43,.12)!important;align-items:flex-end!important}
#isd-teacher-feedback-dashboard .isd-v6-hero h1{font-size:34px!important;line-height:1.1!important;margin:8px 0!important;letter-spacing:-.6px!important}
#isd-teacher-feedback-dashboard .isd-v6-hero p{font-size:15px!important;max-width:700px!important;line-height:1.55!important}
#isd-teacher-feedback-dashboard .isd-v6-hero .btn{min-width:120px!important;height:42px!important;border-radius:10px!important;font-weight:800!important}
#isd-teacher-feedback-dashboard .isd-v6-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin:14px 0!important}
#isd-teacher-feedback-dashboard .isd-v6-card{min-height:94px!important;padding:17px 18px!important;border-radius:13px!important;box-shadow:0 3px 12px rgba(23,49,42,.04)!important;display:flex!important;flex-direction:column!important;justify-content:center!important;font-size:13px!important;color:#5f7069!important}
#isd-teacher-feedback-dashboard .isd-v6-card strong{font-size:30px!important;line-height:1!important;margin-bottom:7px!important}
#isd-teacher-feedback-dashboard .isd-v6-main{border-radius:15px!important;box-shadow:0 5px 18px rgba(23,49,42,.05)!important}
#isd-teacher-feedback-dashboard .isd-v6-head{display:flex!important;justify-content:space-between!important;align-items:center!important;padding:17px 20px!important}
#isd-teacher-feedback-dashboard .isd-v6-head h2{margin:0!important;font-size:19px!important}
#isd-teacher-feedback-dashboard .isd-v6-head p{margin:0!important;font-size:13px!important}
#isd-teacher-feedback-dashboard .isd-v6-tabs{padding:9px 12px!important;background:#f7faf8!important}
#isd-teacher-feedback-dashboard .isd-v6-tabs button{font-size:12px!important;padding:8px 12px!important;border-radius:8px!important;cursor:pointer!important}
#isd-teacher-feedback-dashboard .isd-v6-list{padding:10px!important;background:#f4f8f5!important;gap:7px!important}
#isd-teacher-feedback-dashboard .isd-v6-row{min-height:62px!important;padding:10px 12px!important;border-radius:10px!important;box-shadow:0 1px 3px rgba(23,49,42,.04)!important}
#isd-teacher-feedback-dashboard .isd-v6-row b{font-size:13px!important}
#isd-teacher-feedback-dashboard .isd-v6-row .small{font-size:11px!important;margin-top:3px!important}
#isd-teacher-feedback-dashboard .isd-v6-row small{font-size:10px!important}
#isd-teacher-feedback-dashboard .isd-v6-row .btn{min-width:110px!important;height:36px!important;padding:7px 12px!important;border-radius:8px!important;font-size:11px!important;font-weight:800!important}
#isd-teacher-feedback-dashboard .isd-v6-score{font-size:10px!important;white-space:nowrap!important}
#isd-teacher-learners{max-width:1180px!important;margin:0 auto 18px!important}
#isd-teacher-learners .isd-lc-directory{border-radius:15px!important;padding:18px!important;box-shadow:0 5px 18px rgba(23,49,42,.05)!important}
#isd-teacher-learners .isd-lc-dir-head{align-items:center!important}
#isd-teacher-learners .isd-lc-dir-head h2{font-size:19px!important}
#isd-teacher-learners .isd-lc-person{min-height:60px!important}
/* Keep the LMS desktop-first as requested. Tablets/phones remain usable but do not turn the workspace into a card-heavy mobile app. */
@media(min-width:1100px){
  #main{max-width:1320px!important;padding:30px 34px!important}
  #isd-teacher-feedback-dashboard{max-width:1180px!important}
}
@media(max-width:1099px){
  #isd-teacher-feedback-dashboard{min-width:900px!important}
}
`;
function apply(){if(!document.getElementById('isd-teacher-dashboard-polish-style')){const s=document.createElement('style');s.id='isd-teacher-dashboard-polish-style';s.textContent=css;document.head.appendChild(s);}}
apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
