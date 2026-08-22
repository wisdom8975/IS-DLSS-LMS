// Teacher feedback editor isolation.
// The feedback form is a manual editor: the teacher can type, edit and save
// without the assessment page replacing or refreshing the form.
(function(){
  'use strict';

  const SUPABASE_URL='https://vahkwyetointavhzwfef.supabase.co';
  const SUPABASE_KEY='sb_publishable_gAs0e-XS4JVWNduZSBMqfw_49bLInX7';
  let db=null;

  function getRole(){
    const select=document.getElementById('role');
    return select && select.value ? select.value : 'Student';
  }

  function getDb(){
    if(window.sb) return window.sb;
    if(db) return db;
    if(window.supabase && typeof window.supabase.createClient==='function'){
      db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      return db;
    }
    return null;
  }

  async function getUser(){
    if(window.currentUser) return window.currentUser;
    const client=getDb();
    if(!client) return null;
    const {data,error}=await client.auth.getUser();
    if(error) throw error;
    return data?.user||null;
  }

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
    const client=getDb();
    const user=await getUser();
    if(!attemptId || !client || !user) return;

    window.__isdFeedbackEditing=true;
    const overlay=makeOverlay();

    try{
      const {data:attempt,error:attemptError}=await client.from('quiz_attempts')
        .select('id,student_id,module_id,score,max_score,submitted_at').eq('id',attemptId).single();
      if(attemptError) throw attemptError;

      const {data:module,error:moduleError}=await client.from('modules')
        .select('id,title,course_id').eq('id',attempt.module_id).single();
      if(moduleError) throw moduleError;

      const {data:course,error:courseError}=await client.from('courses')
        .select('id,title,instructor_id').eq('id',module.course_id).single();
      if(courseError) throw courseError;

      const currentRole=getRole();
      if(currentRole==='Teacher' && course.instructor_id!==user.id){
        throw new Error('You are not authorized to review this assessment.');
      }
      if(currentRole==='Student' && attempt.student_id!==user.id){
        throw new Error('You are not authorized to view this assessment.');
      }

      const {data:existing,error:feedbackError}=await client.from('assessment_feedback')
        .select('id,reviewer_id,feedback,strengths,improvement_area,action_plan,updated_at')
        .eq('attempt_id',attemptId).maybeSingle();
      if(feedbackError) throw feedbackError;

      const readOnly=currentRole!=='Teacher';
      overlay.innerHTML=`<div style="background:#fff;width:min(760px,100%);max-height:92vh;overflow:auto;border-radius:18px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><span class="badge">${readOnly?'FEEDBACK':'TEACHER FEEDBACK'}</span><h2 style="margin:8px 0 3px">${esc(module.title)}</h2><p class="muted small">${esc(course.title)} · Score ${esc(attempt.score)}/${esc(attempt.max_score)}</p></div><button id="isdFeedbackClose" class="btn alt" type="button">Close</button></div>
        <div class="notice" style="margin:14px 0">${readOnly?'Teacher feedback and your action plan are shown below.':'Type your feedback below and save it when you are finished. The form will stay in place while you write.'}</div>
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
              reviewer_id:user.id,
              feedback:document.getElementById('isd_fb_feedback').value.trim(),
              strengths:document.getElementById('isd_fb_strengths').value.trim(),
              improvement_area:document.getElementById('isd_fb_improvement').value.trim(),
              action_plan:document.getElementById('isd_fb_action').value.trim()
            };
            if(!payload.feedback&&!payload.strengths&&!payload.improvement_area&&!payload.action_plan){
              throw new Error('Enter at least one feedback field before saving.');
            }
            if(existing?.id){
              const {error}=await client.from('assessment_feedback').update(payload).eq('id',existing.id);
              if(error) throw error;
            }else{
              const {error}=await client.from('assessment_feedback').insert(payload);
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

  function installClickInterceptor(){
    if(window.__isdTeacherFeedbackClickInterceptor) return;
    document.addEventListener('click',function(event){
      if(getRole()!=='Teacher') return;
      if(window.__isdFeedbackEditing) return;
      const button=event.target && event.target.closest ? event.target.closest('button') : null;
      if(!button) return;
      const label=(button.textContent||'').replace(/\s+/g,' ').trim();
      if(!/^Review\s*&\s*Feedback$/i.test(label)) return;
      const inline=button.getAttribute('onclick')||'';
      const match=inline.match(/assessmentDetail\(\s*['\"]([^'\"]+)['\"]\s*\)/i);
      if(!match) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openFeedback(match[1]);
    },true);
    window.__isdTeacherFeedbackClickInterceptor=true;
  }

  function install(){
    installClickInterceptor();
    if(typeof window.assessmentDetail==='function' && !window.__isdTeacherFeedbackFix){
      window.assessmentDetail=async function(attemptId){ await openFeedback(attemptId); };
      window.__isdTeacherFeedbackFix=true;
    }
  }

  install();
  const timer=setInterval(function(){
    install();
    if(window.__isdTeacherFeedbackClickInterceptor && window.__isdTeacherFeedbackFix) clearInterval(timer);
  },100);
})();
