// Separate teacher assessment Review and Feedback features.
(function(){
'use strict';
const VERSION='20260822-review-feedback-separate-v2';
const SUPABASE_URL='https://vahkwyetointavhzwfef.supabase.co';
const SUPABASE_KEY='sb_publishable_gAs0e-XS4JVWNduZSBMqfw_49bLInX7';
function db(){
  if(window.sb) return window.sb;
  if(window.supabase&&typeof window.supabase.createClient==='function'){
    window.sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    return window.sb;
  }
  return null;
}
async function user(){
  if(window.currentUser) return window.currentUser;
  const s=db();
  if(!s) return null;
  const {data,error}=await s.auth.getUser();
  if(error) throw error;
  return data?.user||null;
}
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
let open=false;
function close(){document.getElementById('isd-feedback-overlay')?.remove();open=false;window.__isdFeedbackEditing=false;window.__isdCurrentFeedbackAttempt=null;}
async function load(id){
  const s=db(),me=await user();
  if(!s||!me) throw new Error('Your secure database session could not be verified.');
  const [{data:a,error:ae},{data:f,error:fe}]=await Promise.all([
    s.from('quiz_attempts').select('id,student_id,module_id,score,max_score,submitted_at').eq('id',id).single(),
    s.from('assessment_feedback').select('id,feedback,strengths,improvement_area,action_plan,reviewer_id,updated_at').eq('attempt_id',id).maybeSingle()
  ]);
  if(ae) throw ae; if(fe) throw fe;
  const [{data:module,error:meErr},{data:student,error:se}]=await Promise.all([
    s.from('modules').select('id,title').eq('id',a.module_id).single(),
    s.from('profiles').select('id,full_name,username').eq('id',a.student_id).single()
  ]);
  if(meErr) throw meErr; if(se) throw se;
  return {a,f,module,student,me};
}
function mount(body){
  const o=document.createElement('div');o.id='isd-feedback-overlay';
  o.innerHTML='<div class="isd-rf-backdrop"></div><div class="isd-rf-panel">'+body+'</div>';
  document.body.appendChild(o);o.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);return o.querySelector('.isd-rf-panel');
}
async function choose(id){
  if(open)return;open=true;window.__isdCurrentFeedbackAttempt=id;
  try{
    const {a,module,student}=await load(id),pct=Number(a.max_score)?Math.round(100*Number(a.score||0)/Number(a.max_score)):0;
    mount('<div class="isd-rf-head"><div><span class="badge">ASSESSMENT CENTRE</span><h2>Assessment Actions</h2><p>'+esc(module.title)+' • '+esc(student.full_name||student.username)+' • '+pct+'%</p></div><button data-close>×</button></div><div class="isd-rf-body"><div class="isd-rf-grid"><button class="isd-rf-card" id="isd-review-btn"><b>Review Assessment</b><span>Read the submitted assessment, score and existing feedback. No editing.</span></button><button class="isd-rf-card" id="isd-feedback-btn"><b>Give Feedback</b><span>Enter teacher feedback, strengths, improvement area and action plan. Save when finished.</span></button></div></div>');
    document.getElementById('isd-review-btn').onclick=()=>openReview(id);document.getElementById('isd-feedback-btn').onclick=()=>openFeedback(id);
  }catch(e){
    open=false;mount('<div class="isd-rf-head"><h2>Assessment Actions</h2><button data-close>×</button></div><div class="isd-rf-body"><div class="dangerbox">'+esc(e.message||e)+'</div></div>');
  }
}
async function openReview(id){
  try{
    const {a,f,module,student}=await load(id),pct=Number(a.max_score)?Math.round(100*Number(a.score||0)/Number(a.max_score)):0;
    const p=mount('<div class="isd-rf-head"><div><span class="badge">REVIEW ONLY</span><h2>Review Assessment</h2><p>'+esc(module.title)+' • '+esc(student.full_name||student.username)+' • '+pct+'%</p></div><button data-close>×</button></div><div class="isd-rf-body"><div class="isd-rf-info">Read-only assessment review. Teacher feedback is a separate feature.</div><div class="isd-rf-summary"><b>Score:</b> '+Number(a.score||0)+' / '+Number(a.max_score||0)+' &nbsp; <b>Submitted:</b> '+esc(a.submitted_at?new Date(a.submitted_at).toLocaleString():'—')+'</div><div class="isd-rf-section"><h3>Teacher feedback</h3><p>'+esc(f?.feedback||'No feedback has been saved yet.')+'</p><p><b>Strengths:</b> '+esc(f?.strengths||'—')+'</p><p><b>Improvement Area:</b> '+esc(f?.improvement_area||'—')+'</p><p><b>Action Plan:</b> '+esc(f?.action_plan||'—')+'</p></div><div class="isd-rf-actions"><button class="btn alt" data-close>Close</button></div></div>');
    p.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
  }catch(e){mount('<div class="isd-rf-body"><div class="dangerbox">'+esc(e.message||e)+'</div></div>');}
}
async function openFeedback(id){
  const s=db(),me=await user();if(!s||!me)return;
  window.__isdFeedbackEditing=true;window.__isdCurrentFeedbackAttempt=id;
  try{
    const {a,f,module,student}=await load(id),role=document.getElementById('role')?.value;
    if(role!=='Teacher'&&role!=='Administrator')throw new Error('Only an authorized teacher or administrator can give feedback.');
    const p=mount('<div class="isd-rf-head"><div><span class="badge">TEACHER FEEDBACK</span><h2>Give Feedback</h2><p>'+esc(module.title)+' • '+esc(student.full_name||student.username)+'</p></div><button data-close>×</button></div><div class="isd-rf-body"><div class="isd-rf-info">This is the teacher feedback feature. It is independent of assessment review and will not be replaced by live assessment updates.</div><label>Overall Feedback<textarea id="isd_fb_feedback" rows="6">'+esc(f?.feedback||'')+'</textarea></label><label>Strengths<textarea id="isd_fb_strengths" rows="5">'+esc(f?.strengths||'')+'</textarea></label><label>Improvement Area<textarea id="isd_fb_improvement_area" rows="5">'+esc(f?.improvement_area||'')+'</textarea></label><label>Action Plan<textarea id="isd_fb_action_plan" rows="5">'+esc(f?.action_plan||'')+'</textarea></label><div id="isd-feedback-result"></div><div class="isd-rf-actions"><button class="btn alt" data-close>Close</button><button class="btn" id="isd-feedback-save">Save Feedback</button></div></div>');
    p.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
    p.querySelector('#isd-feedback-save').onclick=async()=>{
      const btn=p.querySelector('#isd-feedback-save'),r=p.querySelector('#isd-feedback-result'),payload={attempt_id:id,reviewer_id:me.id,feedback:p.querySelector('#isd_fb_feedback').value.trim(),strengths:p.querySelector('#isd_fb_strengths').value.trim()||null,improvement_area:p.querySelector('#isd_fb_improvement_area').value.trim()||null,action_plan:p.querySelector('#isd_fb_action_plan').value.trim()||null,updated_at:new Date().toISOString()};
      if(!payload.feedback&&!payload.strengths&&!payload.improvement_area&&!payload.action_plan){r.innerHTML='<div class="dangerbox">Enter at least one feedback field.</div>';return;}
      btn.disabled=true;btn.textContent='Saving Feedback…';
      const q=f?s.from('assessment_feedback').update(payload).eq('id',f.id):s.from('assessment_feedback').insert(payload),out=await q;
      if(out.error){r.innerHTML='<div class="dangerbox">'+esc(out.error.message)+'</div>';btn.disabled=false;btn.textContent='Save Feedback';return;}
      if(!f){const n=await s.from('notifications').insert({user_id:a.student_id,type:'assessment_feedback',title:'New teacher feedback',message:'Your assessment has been reviewed. Open it to read your feedback and action plan.',entity_id:id});if(n.error)console.warn('Notification failed:',n.error.message);}
      r.innerHTML='<div class="feedback good"><b>Feedback saved.</b> The learner has been notified.</div>';btn.textContent='Saved';setTimeout(close,900);
    };
  }catch(e){window.__isdFeedbackEditing=false;mount('<div class="isd-rf-body"><div class="dangerbox">'+esc(e.message||e)+'</div></div>');}
}
const style=document.createElement('style');style.textContent='#isd-feedback-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px}.isd-rf-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55)}.isd-rf-panel{position:relative;width:min(920px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.35);color:#111}.isd-rf-head{display:flex;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #ddd}.isd-rf-head h2{margin:8px 0 4px}.isd-rf-head p{margin:0;color:#666}.isd-rf-head button{border:0;background:transparent;font-size:30px;cursor:pointer}.isd-rf-body{padding:24px}.isd-rf-info{padding:12px 14px;margin-bottom:18px;border-radius:10px;background:#f1f7ff;color:#234}.isd-rf-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.isd-rf-card{padding:22px;text-align:left;border:1px solid #d8e2dc;background:#fff;border-radius:14px;cursor:pointer}.isd-rf-card b{display:block;font-size:18px;margin-bottom:8px}.isd-rf-card span{color:#66736d;font-size:13px}.isd-rf-summary,.isd-rf-section{padding:14px;border:1px solid #e1e7e3;border-radius:12px;margin-bottom:14px}.isd-rf-body label{display:block;font-weight:700;margin:0 0 16px}.isd-rf-body textarea{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #bbb;border-radius:10px;font:inherit;resize:vertical}.isd-rf-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.isd-rf-body .dangerbox,.isd-rf-body .feedback{margin-top:10px;padding:12px;border-radius:10px}.isd-rf-body .dangerbox{background:#fff0f0;color:#9b1c1c}.isd-rf-body .feedback.good{background:#edf9f0;color:#176b2c}@media(max-width:600px){#isd-feedback-overlay{padding:0}.isd-rf-panel{max-height:100vh;height:100%;border-radius:0}.isd-rf-body{padding:16px}.isd-rf-grid{grid-template-columns:1fr}}';document.head.appendChild(style);window.productionAssessmentDetail=choose;window.assessmentDetail=choose;window.__feedbackSessionLockVersion=VERSION;})();