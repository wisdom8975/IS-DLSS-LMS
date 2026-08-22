// Teacher feedback editor isolation.
// The feedback surface is a separate editing session: no live assessment
// evidence refresh may replace it, even while its initial data is loading.
(function(){
  'use strict';

  function esc(v){
    return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]);});
  }

  function makeOverlay(){
    const overlay=document.createElement('div');
    overlay.id='isdFeedbackOverlay';
    overlay.style.cssText='position:fixed;inset:0;background:#f7faf8;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;';
    overlay.innerHTML='<div style="background:#fff;width:min(760px,100%);border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.18)"><h2 style="margin:0">Assessment Feedback</h2><p class="muted">Opening feedback editor…</p></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  async function openFeedback(attemptId){
    if(!window.sb || !window.currentUser) return;

    // Lock the Assessment Centre BEFORE any asynchronous database request.
    window.__isdFeedbackEditing=true;
    const overlay=makeOverlay();

    try{
      const {data:attempt,error:attemptError}=await window.sb.from('quiz_attempts')
        .select('id,student_id,module_id,score,max_score,submitted_at').eq('id',attemptId).single();
      if(attemptError) throw attemptError;

      const {data:module,error:moduleError}=await window.sb.from('modules')
        .select('id,title,course_id').eq('id',attempt.module_id).single();
      if(moduleError) throw moduleError;

      const {data:course,error:courseError}=await window.sb.from('courses')
        .select('id,title,instructor_id').eq('id',module.course_id).single();
      if(courseError) throw courseError;

      if(window.role==='Teacher' && course.instructor_id!==window.currentUser.id){
        throw new Error('You are not authorized to review this assessment.');
      }
      if(window.role==='Student' && attempt.student_id!==window.currentUser.id){
        throw new Error('You are not authorized to view this assessment.');
      }

      const {data:existing,error:feedbackError}=await window.sb.from('assessment_feedback')
        .select('id,reviewer_id,feedback,strengths,improvement_area,action_plan,updated_at')
        .eq('attempt_id',attemptId).maybeSingle();
      if(feedbackError) throw feedbackError;

      const readOnly=window.role!=='Teacher';
      overlay.innerHTML=`<div style="background:#fff;width:min(760px,100%);max-height:92vh;overflow:auto;border-radius:18px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><span class="badge">${readOnly?'FEEDBACK':'TEACHER FEEDBACK'}</span><h2 style="margin:8px 0 3px">${esc(module.title)}</h2><p class="muted small">${esc(course.title)} · Score ${esc(attempt.score)}/${esc(attempt.max_score)}</p></div><button id="isdFeedbackClose" class="btn alt" type="button">Close</button></div>
        <div class="notice" style="margin:14px 0">${readOnly?'Teacher feedback and your action plan are shown below.':'Live assessment evidence is paused while you edit. Nothing on this form is replaced or refreshed until you save or close it.'}</div>
        <label><b>Overall feedback</b></label><textarea id="isd_fb_feedback" ${readOnly?'readonly':''} placeholder="Enter overall feedback...">${esc(existing?.feedback||'')}</textarea>
        <label><b>Strengths</b></label><textarea id="isd_fb_strengths" ${readOnly?'readonly':''} placeholder="Describe the learner's strengths...">${esc(existing?.strengths||'')}</textarea>
        <label><b>Improvement area</b></label><textarea id="isd_fb_improvement" ${readOnly?'readonly':''} placeholder="Identify what should improve...">${esc(existing?.improvement_area||'')}</textarea>
        <label><b>Action plan</b></label><textarea id="isd_fb_action" ${readOnly?'readonly':''} placeholder="Give the learner clear next steps...">${esc(existing?.action_plan||'')}</textarea>
        ${readOnly?'<div class="notice good" style="margin-top:14px">This feedback is read from the saved assessment feedback record.</div>':'<div id="isdFeedbackStatus" class="small muted" style="margin-top:10px"></div><button id="isdFeedbackSave" class="btn" type="button" style="margin-top:12px;width:100%">Save Feedback</button>'}
      </div>`;

      const close=()=>{ window.__isdFeedbackEditing=false; overlay.remove(); };
      document.getElementById('isdFeedbackClose').onclick=close;
      overlay.addEventListener('click',e=>{if(e.target===overlay)close();});

      if(!readOnly){
        const saveButton=document.getElementById('isdFeedbackSave');
        const status=document.getElementById('isdFeedbackStatus');
        saveButton.onclick=async function(){
          saveButton.disabled=true;
          saveButton.textContent='Saving feedback…';
          status.textContent='';
          try{
            const payload={
              attempt_id:attemptId,
              reviewer_id:window.currentUser.id,
              feedback:document.getElementById('isd_fb_feedback').value.trim(),
              strengths:document.getElementById('isd_fb_strengths').value.trim(),
              improvement_area:document.getElementById('isd_fb_improvement').value.trim(),
              action_plan:document.getElementById('isd_fb_action').value.trim()
            };
            if(!payload.feedback&&!payload.strengths&&!payload.improvement_area&&!payload.action_plan){
              throw new Error('Enter at least one feedback field before saving.');
            }
            if(existing?.id){
              const {error}=await window.sb.from('assessment_feedback').update(payload).eq('id',existing.id);
              if(error) throw error;
            }else{
              const {error}=await window.sb.from('assessment_feedback').insert(payload);
              if(error) throw error;
            }
            status.textContent='Feedback saved successfully.';
            status.style.color='#075c3a';
            saveButton.textContent='Saved';
            setTimeout(close,700);
          }catch(error){
            status.textContent=error.message||'Unable to save feedback.';
            status.style.color='#a3223c';
            saveButton.disabled=false;
            saveButton.textContent='Save Feedback';
          }
        };
      }
    }catch(error){
      window.__isdFeedbackEditing=false;
      overlay.innerHTML='<div style="background:#fff;width:min(760px,100%);border-radius:18px;padding:24px"><h2>Assessment Feedback</h2><div class="dangerbox">'+esc(error.message||'Unable to open assessment feedback.')+'</div><button id="isdFeedbackErrorClose" class="btn alt" type="button">Close</button></div>';
      document.getElementById('isdFeedbackErrorClose').onclick=function(){overlay.remove();};
    }
  }

  function install(){
    if(typeof window.assessmentDetail!=='function' || window.__isdTeacherFeedbackFix) return;
    window.assessmentDetail=async function(attemptId){ await openFeedback(attemptId); };
    window.__isdTeacherFeedbackFix=true;
  }

  install();
  const timer=setInterval(function(){
    install();
    if(window.__isdTeacherFeedbackFix) clearInterval(timer);
  },100);
})();
