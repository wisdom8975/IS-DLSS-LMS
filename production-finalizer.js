// IS-DLSS production runtime finalizer.
// Loaded AFTER the legacy index.html script so production behavior is authoritative.
(function(){
  'use strict';
  const VERSION='20260822-production-final-v1';
  const getRole=()=>document.getElementById('role')?.value||'Student';
  const getDb=()=>window.sb||null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function removeLiveAssessmentLabels(){
    document.querySelectorAll('.badge').forEach(el=>{
      if(/LIVE ASSESSMENT/i.test(el.textContent||'')) el.textContent='ASSESSMENT';
    });
    const footer=document.querySelector('footer');
    if(footer) footer.textContent='IS-DLSS Professional Learning Management System • Production • 2026';
  }

  async function productionAssessment(){
    const db=getDb(), user=window.currentUser;
    const main=document.getElementById('main');
    if(!db||!user||!main) return;
    window.__isdAssessmentStaticView=true;
    main.innerHTML='<div class="card"><h2>Assessment Centre</h2><div class="notice">Loading assessment history…</div></div>';
    const role=getRole();
    try{
      let studentIds=[];
      if(role==='Student') studentIds=[user.id];
      else if(role==='Teacher'){
        const {data,error}=await db.rpc('teacher_supervision_students',{p_teacher_id:user.id});
        if(error) throw error;
        studentIds=[...new Set((data||[]).map(x=>x.student_id).filter(Boolean))];
      }else{
        const {data,error}=await db.from('profiles').select('id').eq('role','Student');
        if(error) throw error;
        studentIds=(data||[]).map(x=>x.id);
      }
      let attempts=[];
      if(studentIds.length){
        const {data,error}=await db.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').in('student_id',studentIds).order('submitted_at',{ascending:false}).limit(100);
        if(error) throw error;
        attempts=data||[];
      }
      const attemptIds=attempts.map(a=>a.id);
      const moduleIds=[...new Set(attempts.map(a=>a.module_id).filter(Boolean))];
      const [{data:mods,error:me},{data:feedback,error:fe}]=await Promise.all([
        moduleIds.length?db.from('modules').select('id,title,course_id').in('id',moduleIds):Promise.resolve({data:[],error:null}),
        attemptIds.length?db.from('assessment_feedback').select('id,attempt_id,feedback,strengths,improvement_area,action_plan,updated_at').in('attempt_id',attemptIds):Promise.resolve({data:[],error:null})
      ]);
      if(me) throw me; if(fe) throw fe;
      const courseIds=[...new Set((mods||[]).map(m=>m.course_id).filter(Boolean))];
      const [{data:courses,error:ce},{data:students,error:se}]=await Promise.all([
        courseIds.length?db.from('courses').select('id,title').in('id',courseIds):Promise.resolve({data:[],error:null}),
        role==='Student'?Promise.resolve({data:[],error:null}):studentIds.length?db.from('profiles').select('id,full_name,username').in('id',studentIds):Promise.resolve({data:[],error:null})
      ]);
      if(ce) throw ce; if(se) throw se;
      const mm=Object.fromEntries((mods||[]).map(m=>[m.id,m]));
      const cm=Object.fromEntries((courses||[]).map(c=>[c.id,c.title]));
      const sm=Object.fromEntries((students||[]).map(s=>[s.id,s.full_name||s.username||'Student']));
      const fm=Object.fromEntries((feedback||[]).map(f=>[f.attempt_id,f]));
      const scored=attempts.filter(a=>Number(a.max_score)>0);
      const avg=scored.length?Math.round(scored.reduce((s,a)=>s+100*Number(a.score||0)/Number(a.max_score),0)/scored.length):0;
      const passRate=scored.length?Math.round(100*scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)>=50).length/scored.length):0;
      const low=role==='Student'?scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).length:new Set(scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).map(a=>a.student_id)).size;
      const rows=attempts.map(a=>{
        const m=mm[a.module_id],pct=Number(a.max_score)?Math.round(100*Number(a.score||0)/Number(a.max_score)):0,f=fm[a.id];
        return `<tr><td>${role==='Student'?'You':esc(sm[a.student_id]||'Student')}</td><td>${esc(m?.title||'Assessment')}</td><td>${esc(cm[m?.course_id]||'')}</td><td><span class="status" style="${pct<50?'background:#fff0f0;color:#9b1c1c':''}">${pct}%</span></td><td>${new Date(a.submitted_at).toLocaleString()}</td><td>${f?'<span class="status">Feedback available</span>':'<span class="small muted">No feedback yet</span>'}</td><td><button class="btn alt" onclick="assessmentDetail('${a.id}')">${role==='Student'?'View Feedback':'Review & Feedback'}</button></td></tr>`;
      }).join('');
      main.innerHTML=`<div class="hero"><span class="badge">ASSESSMENT</span><h1>${role==='Student'?'My Assessment Results':role==='Teacher'?'Learner Assessment Results':'Institutional Assessment Results'}</h1><p>${role==='Student'?'Review submitted assessment results and saved teacher feedback.':'Review submitted assessment history. Open an assessment to provide or read feedback.'}</p></div><div class="grid4"><div class="card"><div class="metric">${attempts.length}</div><p>Quiz attempts</p></div><div class="card"><div class="metric">${avg}%</div><p>Average score</p></div><div class="card"><div class="metric">${passRate}%</div><p>Pass rate</p></div><div class="card"><div class="metric">${low}</div><p>${role==='Student'?'Low scores':'Learners needing support'}</p></div></div><div class="card" style="margin-top:18px"><div class="kpi"><div><h2>Assessment history</h2><p class="muted">Saved results are loaded when you open this page. The assessment screen does not live-refresh.</p></div>${role!=='Student'?'<button class="btn alt" onclick="exportAssessmentCsv()">Export CSV</button>':''}</div><div style="overflow:auto"><table><tr><th>Student</th><th>Module</th><th>Course</th><th>Score</th><th>Submitted</th><th>Feedback</th><th></th></tr>${rows||'<tr><td colspan="7"><div class="notice">No submitted assessments have been recorded yet.</div></td></tr>'}</table></div></div>`;
      window.__assessmentRows=attempts; window.__assessmentMaps={moduleMap:mm,courseMap:Object.fromEntries((courses||[]).map(c=>[c.id,c.title])),studentMap:sm};
    }catch(error){
      main.innerHTML=`<div class="card"><h2>Assessment Centre</h2><div class="dangerbox">${esc(error.message||'Unable to load assessment history.')}</div></div>`;
    }
    removeLiveAssessmentLabels();
  }

  async function productionAssessmentDetail(attemptId){
    const db=getDb(), user=window.currentUser, main=document.getElementById('main');
    if(!db||!user||!main) return;
    window.__isdFeedbackEditing=true;
    window.__isdAssessmentStaticView=true;
    main.innerHTML='<div class="card"><div class="notice">Opening assessment review…</div></div>';
    try{
      const {data:attempt,error:ae}=await db.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').eq('id',attemptId).single();
      if(ae) throw ae;
      const [{data:module,error:me},{data:student,error:se},{data:feedback,error:fe},{data:questions,error:qe}]=await Promise.all([
        db.from('modules').select('id,title,course_id').eq('id',attempt.module_id).single(),
        db.from('profiles').select('id,full_name,username').eq('id',attempt.student_id).single(),
        db.from('assessment_feedback').select('id,reviewer_id,feedback,strengths,improvement_area,action_plan,updated_at').eq('attempt_id',attempt.id).maybeSingle(),
        db.from('quiz_questions').select('id,question,correct_answer,points,position').eq('module_id',attempt.module_id).order('position')
      ]);
      if(me) throw me;if(se) throw se;if(fe) throw fe;if(qe) throw qe;
      const pct=Number(attempt.max_score)?Math.round(100*Number(attempt.score||0)/Number(attempt.max_score)):0;
      const answers=attempt.answers&&typeof attempt.answers==='object'?attempt.answers:{};
      const evidence=(questions||[]).map((q,i)=>{const selected=answers[q.id]??answers[String(q.id)]??'';const ok=String(selected)===String(q.correct_answer);return `<div class="card" style="margin-bottom:10px"><b>Q${i+1}. ${esc(q.question)}</b><div class="small muted">Selected: ${esc(selected||'Not answered')} • Correct: ${esc(q.correct_answer||'')}</div><span class="status" style="margin-top:8px;${ok?'':'background:#fff0f0;color:#9b1c1c'}">${ok?'Correct':'Needs review'}</span></div>`}).join('')||'<div class="notice">Question-level evidence is unavailable.</div>';
      const canEdit=getRole()==='Teacher'||getRole()==='Administrator';
      const feedbackHtml=feedback?`<div class="card"><h3>Saved teacher feedback</h3><p>${esc(feedback.feedback||'')}</p>${feedback.strengths?`<p><b>Strengths:</b> ${esc(feedback.strengths)}</p>`:''}${feedback.improvement_area?`<p><b>Improvement area:</b> ${esc(feedback.improvement_area)}</p>`:''}${feedback.action_plan?`<div class="notice"><b>Action plan:</b> ${esc(feedback.action_plan)}</div>`:''}</div>`:'<div class="notice">No teacher feedback has been saved yet.</div>';
      const editor=canEdit?`<div class="card" style="margin-top:18px"><h3>${feedback?'Update':'Add'} teacher feedback</h3><p class="small muted">Write and save your feedback. This page will remain unchanged until you choose Save Feedback or Back.</p><label>Overall feedback<textarea id="production_fb_feedback" rows="5">${esc(feedback?.feedback||'')}</textarea></label><label>Strengths<textarea id="production_fb_strengths" rows="4">${esc(feedback?.strengths||'')}</textarea></label><label>Improvement area<textarea id="production_fb_improvement" rows="4">${esc(feedback?.improvement_area||'')}</textarea></label><label>Action plan<textarea id="production_fb_action" rows="4">${esc(feedback?.action_plan||'')}</textarea></label><button id="production_fb_save" class="btn" type="button">Save Feedback</button><div id="production_fb_result" style="margin-top:10px"></div></div>`:'';
      main.innerHTML=`<div class="hero"><span class="badge">ASSESSMENT REVIEW</span><h1>${esc(module?.title||'Assessment')}</h1><p>${getRole()==='Student'?'Your submitted assessment':'Learner: '+esc(student?.full_name||student?.username||'Student')} • ${new Date(attempt.submitted_at).toLocaleString()} • ${pct}%</p></div><div class="grid"><div><div class="card"><h3>Assessment evidence</h3>${evidence}</div></div><div>${feedbackHtml}${editor}</div></div><br><button class="btn alt" id="production_fb_back" type="button">← Back to Assessment Centre</button>`;
      document.getElementById('production_fb_back').onclick=()=>{window.__isdFeedbackEditing=false;window.__isdAssessmentStaticView=false;productionAssessment();};
      if(canEdit){
        document.getElementById('production_fb_save').onclick=async()=>{
          const btn=document.getElementById('production_fb_save'),result=document.getElementById('production_fb_result');
          const payload={attempt_id:attemptId,reviewer_id:user.id,feedback:document.getElementById('production_fb_feedback').value.trim(),strengths:document.getElementById('production_fb_strengths').value.trim()||null,improvement_area:document.getElementById('production_fb_improvement').value.trim()||null,action_plan:document.getElementById('production_fb_action').value.trim()||null,updated_at:new Date().toISOString()};
          if(!payload.feedback&&!payload.strengths&&!payload.improvement_area&&!payload.action_plan){result.innerHTML='<div class="dangerbox">Enter at least one feedback field.</div>';return;}
          btn.disabled=true;btn.textContent='Saving feedback…';
          const response=feedback?await db.from('assessment_feedback').update(payload).eq('id',feedback.id):await db.from('assessment_feedback').insert(payload);
          if(response.error){result.innerHTML='<div class="dangerbox">'+esc(response.error.message)+'</div>';btn.disabled=false;btn.textContent='Save Feedback';return;}
          if(!feedback){const {data:owner}=await db.from('quiz_attempts').select('student_id').eq('id',attemptId).single();if(owner?.student_id){const n=await db.from('notifications').insert({user_id:owner.student_id,type:'assessment_feedback',title:'New teacher feedback',message:'Your assessment has been reviewed. Open it to read your feedback and action plan.',entity_id:attemptId});if(n.error)console.warn('Notification creation failed:',n.error.message);}}
          result.innerHTML='<div class="feedback good"><b>Feedback saved.</b> The learner has been notified.</div>';btn.textContent='Saved';
          setTimeout(()=>{window.__isdFeedbackEditing=false;productionAssessmentDetail(attemptId);},700);
        };
      }
    }catch(error){window.__isdFeedbackEditing=false;main.innerHTML=`<div class="card"><div class="dangerbox">${esc(error.message||'Unable to open assessment review.')}</div><br><button class="btn alt" onclick="productionAssessment()">Back to Assessment Centre</button></div>`;}
  }

  function productionAbout(){
    document.getElementById('main').innerHTML='<div class="card"><h2>About IS-DLSS</h2><p><b>Integrated Science Digital Learning Support System</b> is a production role-based learning management system for learner-centred Integrated Science instruction, assessment, teacher supervision and learner support.</p><div class="notice"><b>Production status:</b> Connected to the live Supabase database and deployed through Vercel.</div><br><p class="muted">The system supports Administrator, Teacher and Student roles, courses, modules, lessons, assessments, feedback, notifications, analytics, discussion and learning resources.</p></div>';
  }

  function install(){
    window.assessment=productionAssessment;
    window.assessmentDetail=productionAssessmentDetail;
    window.about=productionAbout;
    const originalRefresh=window.refreshLiveSurface;
    if(typeof originalRefresh==='function'&&!window.__isdProductionRefreshWrapped){
      window.refreshLiveSurface=async function(reason){
        if(window.__isdAssessmentStaticView||window.__isdFeedbackEditing)return;
        return originalRefresh.apply(this,arguments);
      };
      window.__isdProductionRefreshWrapped=true;
    }
    removeLiveAssessmentLabels();
    window.__isdProductionFinalizerVersion=VERSION;
  }

  // The script is deliberately loaded after the main inline LMS script.
  install();
  setTimeout(install,250);
})();
