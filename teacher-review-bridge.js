(function(){
'use strict';
if(window.__isdTeacherReviewBridge)return;
window.__isdTeacherReviewBridge=true;
const SUPABASE_URL='https://vahkwyetointavhzwfef.supabase.co';
const SUPABASE_KEY='sb_publishable_gAs0e-XS4JVWNduZSBMqfw_49bLInX7';
function db(){
  if(window.sb)return window.sb;
  if(window.supabase&&typeof window.supabase.createClient==='function'){
    window.sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    return window.sb;
  }
  return null;
}
window.studentEvidence=async function(studentId,courseId){
  const s=db();
  if(!s)throw new Error('Database session unavailable.');
  const {data:{user},error:ue}=await s.auth.getUser();
  if(ue||!user)throw new Error('Your secure teacher session could not be verified.');
  const {data:profile,error:pe}=await s.from('profiles').select('role,active').eq('id',user.id).single();
  if(pe)throw pe;
  if(profile?.role!=='Teacher'||profile?.active===false)throw new Error('Only an active Teacher can review learner assessment evidence.');
  let moduleIds=[];
  if(courseId){
    const {data:mods,error}=await s.from('modules').select('id').eq('course_id',courseId);
    if(error)throw error; moduleIds=(mods||[]).map(x=>x.id);
  }
  let q=s.from('quiz_attempts').select('id,student_id,module_id,score,max_score,submitted_at').eq('student_id',studentId).order('submitted_at',{ascending:false}).limit(1);
  if(moduleIds.length)q=q.in('module_id',moduleIds);
  const {data:attempts,error}=await q;
  if(error)throw error;
  if(!attempts?.length){
    const main=document.getElementById('main');
    if(main)main.insertAdjacentHTML('afterbegin','<div class="card"><div class="notice">No submitted assessment is available for this learner yet.</div></div>');
    return;
  }
  if(typeof window.assessmentDetail==='function')return window.assessmentDetail(attempts[0].id);
  if(typeof window.productionAssessmentDetail==='function')return window.productionAssessmentDetail(attempts[0].id);
  if(typeof window.show==='function')return window.show('assessment');
  throw new Error('Assessment review module is not available.');
};
window.__isdTeacherReviewBridgeVersion='20260822-teacher-review-feedback-v1';
})();