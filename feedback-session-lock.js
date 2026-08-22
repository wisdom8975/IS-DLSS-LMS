// Independent teacher feedback editor.
// The editor is mounted outside #main so live assessment/dashboard rendering cannot replace it.
(function(){
  'use strict';
  const VERSION='20260822-feedback-overlay-v2';
  const db=()=>window.sb||null;
  const user=()=>window.currentUser||null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let open=false;

  function close(){
    const el=document.getElementById('isd-feedback-overlay');
    if(el)el.remove();
    open=false;
    window.__isdFeedbackEditing=false;
    window.__isdCurrentFeedbackAttempt=null;
  }

  async function openEditor(attemptId){
    if(open)return;
    const supabase=db(), me=user();
    if(!supabase||!me)return;
    open=true; window.__isdFeedbackEditing=true; window.__isdCurrentFeedbackAttempt=attemptId;
    const overlay=document.createElement('div');
    overlay.id='isd-feedback-overlay';
    overlay.innerHTML='<div class="isd-feedback-backdrop"></div><div class="isd-feedback-panel"><div class="notice">Opening assessment review…</div></div>';
    document.body.appendChild(overlay);
    const panel=overlay.querySelector('.isd-feedback-panel');
    try{
      const [{data:attempt,error:ae},{data:feedback,error:fe},{data:module,error:meErr},{data:student,error:se}]=await Promise.all([
        supabase.from('quiz_attempts').select('id,student_id,module_id,score,max_score,submitted_at').eq('id',attemptId).single(),
        supabase.from('assessment_feedback').select('id,feedback,strengths,improvement_area,action_plan').eq('attempt_id',attemptId).maybeSingle(),
        supabase.from('modules').select('id,title').eq('id',attemptId).maybeSingle(),
        supabase.from('profiles').select('id,full_name,username').eq('id',me.id).maybeSingle()
      ]);
      if(ae)throw ae;if(fe)throw fe;
      const {data:moduleReal}=await supabase.from('modules').select('id,title').eq('id',attempt.module_id).single();
      const {data:studentReal}=await supabase.from('profiles').select('id,full_name,username').eq('id',attempt.student_id).single();
      const isTeacher=document.getElementById('role')?.value==='Teacher'||document.getElementById('role')?.value==='Administrator';
      if(!isTeacher)throw new Error('Only an authorized teacher or administrator can edit assessment feedback.');
      const pct=Number(attempt.max_score)?Math.round(100*Number(attempt.score||0)/Number(attempt.max_score)):0;
      panel.innerHTML=`<div class="isd-feedback-head"><div><span class="badge">ASSESSMENT REVIEW</span><h2>Review &amp; Feedback</h2><p>${esc(moduleReal?.title||'Assessment')} • ${esc(studentReal?.full_name||studentReal?.username||'Student')} • ${pct}%</p></div><button type="button" id="isd-feedback-close" aria-label="Close">×</button></div><div class="isd-feedback-body"><div class="isd-feedback-info">This review form is independent of live assessment updates. Type freely; nothing will replace this form until you choose Save Feedback or Close.</div><label>Overall Feedback<textarea id="isd_fb_feedback" rows="6">${esc(feedback?.feedback||'')}</textarea></label><label>Strengths<textarea id="isd_fb_strengths" rows="5">${esc(feedback?.strengths||'')}</textarea></label><label>Improvement Area<textarea id="isd_fb_improvement_area" rows="5">${esc(feedback?.improvement_area||'')}</textarea></label><label>Action Plan<textarea id="isd_fb_action_plan" rows="5">${esc(feedback?.action_plan||'')}</textarea></label><div id="isd-feedback-result"></div><div class="isd-feedback-actions"><button type="button" class="btn alt" id="isd-feedback-cancel">Close</button><button type="button" class="btn" id="isd-feedback-save">Save Feedback</button></div></div>`;
      document.getElementById('isd-feedback-close').onclick=close;
      document.getElementById('isd-feedback-cancel').onclick=close;
      document.getElementById('isd-feedback-save').onclick=async()=>{
        const btn=document.getElementById('isd-feedback-save'),result=document.getElementById('isd-feedback-result');
        const payload={attempt_id:attemptId,reviewer_id:me.id,feedback:document.getElementById('isd_fb_feedback').value.trim(),strengths:document.getElementById('isd_fb_strengths').value.trim()||null,improvement_area:document.getElementById('isd_fb_improvement_area').value.trim()||null,action_plan:document.getElementById('isd_fb_action_plan').value.trim()||null,updated_at:new Date().toISOString()};
        if(!payload.feedback&&!payload.strengths&&!payload.improvement_area&&!payload.action_plan){result.innerHTML='<div class="dangerbox">Enter at least one feedback field.</div>';return;}
        btn.disabled=true;btn.textContent='Saving Feedback…';
        const response=feedback?await supabase.from('assessment_feedback').update(payload).eq('id',feedback.id):await supabase.from('assessment_feedback').insert(payload);
        if(response.error){result.innerHTML='<div class="dangerbox">'+esc(response.error.message)+'</div>';btn.disabled=false;btn.textContent='Save Feedback';return;}
        if(!feedback){
          const n=await supabase.from('notifications').insert({user_id:attempt.student_id,type:'assessment_feedback',title:'New teacher feedback',message:'Your assessment has been reviewed. Open it to read your feedback and action plan.',entity_id:attemptId});
          if(n.error)console.warn('Assessment feedback notification failed:',n.error.message);
        }
        result.innerHTML='<div class="feedback good"><b>Feedback saved.</b> The learner has been notified.</div>';
        btn.textContent='Saved';
        setTimeout(close,900);
      };
    }catch(error){
      panel.innerHTML='<div class="isd-feedback-head"><h2>Review &amp; Feedback</h2><button type="button" id="isd-feedback-close">×</button></div><div class="isd-feedback-body"><div class="dangerbox">'+esc(error.message||'Unable to open feedback editor.')+'</div></div>';
      document.getElementById('isd-feedback-close').onclick=close;
    }
  }

  const style=document.createElement('style');
  style.textContent='#isd-feedback-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px}.isd-feedback-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55)}.isd-feedback-panel{position:relative;width:min(920px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.35);color:#111}.isd-feedback-head{display:flex;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #ddd}.isd-feedback-head h2{margin:8px 0 4px}.isd-feedback-head p{margin:0;color:#666}.isd-feedback-head button{border:0;background:transparent;font-size:30px;cursor:pointer}.isd-feedback-body{padding:24px}.isd-feedback-body label{display:block;font-weight:700;margin:0 0 16px}.isd-feedback-body textarea{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #bbb;border-radius:10px;font:inherit;resize:vertical}.isd-feedback-info{padding:12px 14px;margin-bottom:18px;border-radius:10px;background:#f1f7ff;color:#234}.isd-feedback-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.isd-feedback-actions button:disabled{opacity:.6}.isd-feedback-body .dangerbox,.isd-feedback-body .feedback{margin-top:10px;padding:12px;border-radius:10px}.isd-feedback-body .dangerbox{background:#fff0f0;color:#9b1c1c}.isd-feedback-body .feedback.good{background:#edf9f0;color:#176b2c}@media(max-width:600px){.isd-feedback-overlay{padding:0}.isd-feedback-panel{max-height:100vh;height:100%;border-radius:0}.isd-feedback-body{padding:16px}}';
  document.head.appendChild(style);

  function install(){
    window.productionAssessmentDetail=openEditor;
    window.assessmentDetail=openEditor;
    window.__feedbackSessionLockVersion=VERSION;
  }
  install();setTimeout(install,100);setTimeout(install,500);
})();
