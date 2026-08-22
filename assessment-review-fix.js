// Production assessment-review hardening.
// Restricts teacher review to courses they teach and leaves notification creation to the DB trigger.
(function(){
  'use strict';
  async function context(){
    const auth=await window.sb.auth.getUser();
    const user=auth?.data?.user;
    if(!user) throw new Error('Your session has expired. Please sign in again.');
    const {data:profile,error}=await window.sb.from('profiles').select('id,full_name,username,role,active').eq('id',user.id).single();
    if(error) throw error;
    return {user,profile,role:profile.role};
  }
  async function getTeacherScope(userId){
    const {data:courses,error}=await window.sb.from('courses').select('id,title').eq('instructor_id',userId);
    if(error) throw error;
    const courseIds=(courses||[]).map(c=>c.id);
    if(!courseIds.length)return {courses:[],modules:[],moduleIds:[]};
    const {data:modules,error:moduleError}=await window.sb.from('modules').select('id,title,course_id,position').in('course_id',courseIds).order('position');
    if(moduleError)throw moduleError;
    return {courses:courses||[],modules:modules||[],moduleIds:(modules||[]).map(m=>m.id)};
  }
  async function assessmentReview(){
    const main=document.getElementById('main');
    main.innerHTML='<div class="card"><h2>Assessment Centre</h2><div class="notice">Loading live assessment evidence…</div></div>';
    try{
      const ctx=await context(),role=ctx.role;let attempts=[],modules=[],students=[];
      if(role==='Student'){
        const {data,error}=await window.sb.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').eq('student_id',ctx.user.id).order('submitted_at',{ascending:false}).limit(100);if(error)throw error;attempts=data||[];
      }else if(role==='Teacher'){
        const scope=await getTeacherScope(ctx.user.id);modules=scope.modules;
        if(scope.moduleIds.length){const {data,error}=await window.sb.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').in('module_id',scope.moduleIds).order('submitted_at',{ascending:false}).limit(100);if(error)throw error;attempts=data||[];}
      }else{
        const {data,error}=await window.sb.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').order('submitted_at',{ascending:false}).limit(100);if(error)throw error;attempts=data||[];
      }
      const attemptIds=attempts.map(a=>a.id),moduleIds=[...new Set(attempts.map(a=>a.module_id).filter(Boolean))];
      if(!modules.length&&moduleIds.length){const {data,error}=await window.sb.from('modules').select('id,title,course_id,position').in('id',moduleIds);if(error)throw error;modules=data||[];}
      const courseIds=[...new Set(modules.map(m=>m.course_id).filter(Boolean))];
      const [{data:courseRows,error:courseError},{data:feedbackRows,error:feedbackError}]=await Promise.all([courseIds.length?window.sb.from('courses').select('id,title,instructor_id').in('id',courseIds):Promise.resolve({data:[],error:null}),attemptIds.length?window.sb.from('assessment_feedback').select('id,attempt_id,reviewer_id,feedback,strengths,improvement_area,action_plan,updated_at').in('attempt_id',attemptIds):Promise.resolve({data:[],error:null})]);
      if(courseError)throw courseError;if(feedbackError)throw feedbackError;
      const courseMap=Object.fromEntries((courseRows||[]).map(c=>[c.id,c]));
      if(role!=='Student'&&attempts.length){const ids=[...new Set(attempts.map(a=>a.student_id))];const {data,error}=await window.sb.from('profiles').select('id,full_name,username').in('id',ids);if(error)throw error;students=data||[];}
      const moduleMap=Object.fromEntries(modules.map(m=>[m.id,m])),studentMap=Object.fromEntries(students.map(s=>[s.id,s.full_name||s.username||'Student'])),feedbackMap=Object.fromEntries((feedbackRows||[]).map(f=>[f.attempt_id,f])),scored=attempts.filter(a=>Number(a.max_score)>0);
      const avg=scored.length?Math.round(scored.reduce((sum,a)=>sum+100*Number(a.score||0)/Number(a.max_score),0)/scored.length):0,passed=scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)>=50).length,passRate=scored.length?Math.round(100*passed/scored.length):0,support=new Set(scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).map(a=>a.student_id));
      const title=role==='Student'?'My Assessment Results':role==='Teacher'?'Learner Assessment Results':'Institutional Assessment Results';
      const rows=attempts.map(a=>{const m=moduleMap[a.module_id],c=courseMap[m?.course_id],pct=Number(a.max_score)?Math.round(100*Number(a.score||0)/Number(a.max_score)):0,f=feedbackMap[a.id];return `<tr><td>${role==='Student'?'You':escapeHtml(studentMap[a.student_id]||'Student')}</td><td>${escapeHtml(m?.title||'Assessment')}</td><td>${escapeHtml(c?.title||'')}</td><td><span class="status" style="${pct<50?'background:#fff0f0;color:#9b1c1c':''}">${pct}%</span></td><td>${new Date(a.submitted_at).toLocaleString()}</td><td>${f?'<span class="status">Feedback available</span>':'<span class="small muted">No feedback yet</span>'}</td><td><button class="btn alt" onclick="assessmentDetail('${a.id}')">${role==='Student'?'View Feedback':'Review & Feedback'}</button></td></tr>`}).join('');
      main.innerHTML=`<div class="hero"><span class="badge">LIVE ASSESSMENT</span><h1>${title}</h1><p>${role==='Student'?'Review your quiz history, teacher feedback and areas that need more practice.':'Use assessment evidence to identify learners who need feedback, reteaching or targeted support.'}</p></div><div class="grid4"><div class="card"><div class="metric">${attempts.length}</div><p>Quiz attempts</p></div><div class="card"><div class="metric">${avg}%</div><p>Average score</p></div><div class="card"><div class="metric">${passRate}%</div><p>Pass rate</p></div><div class="card"><div class="metric">${role==='Student'?scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).length:support.size}</div><p>${role==='Student'?'Low scores':'Learners needing support'}</p></div></div><div class="card" style="margin-top:18px"><div class="kpi"><div><h2>Assessment history</h2><p class="muted">Results and feedback are read directly from the LMS database.</p></div>${role!=='Student'?'<button class="btn alt" onclick="exportAssessmentCsv()">Export CSV</button>':''}</div><div style="overflow:auto"><table><tr><th>Student</th><th>Module</th><th>Course</th><th>Score</th><th>Submitted</th><th>Feedback</th><th></th></tr>${rows||'<tr><td colspan="7"><div class="notice">No quiz attempts have been recorded yet.</div></td></tr>'}</table></div></div>`;
      window.__assessmentRows=attempts;window.__assessmentMaps={moduleMap,courseMap,studentMap};
    }catch(error){main.innerHTML=`<div class="card"><h2>Assessment Centre</h2><div class="dangerbox">${escapeHtml(error.message||'Unable to load assessment evidence.')}</div></div>`;}
  }
  async function assessmentDetailReview(attemptId){
    const main=document.getElementById('main');main.innerHTML='<div class="card"><div class="notice">Loading assessment review…</div></div>';
    try{
      const ctx=await context();
      const {data:attempt,error}=await window.sb.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').eq('id',attemptId).single();if(error||!attempt)throw new Error('Assessment attempt could not be loaded.');
      const {data:module}=await window.sb.from('modules').select('id,title,course_id').eq('id',attempt.module_id).single();if(!module)throw new Error('Assessment module could not be loaded.');
      const {data:course}=await window.sb.from('courses').select('id,title,instructor_id').eq('id',module.course_id).single();
      const authorized=ctx.role==='Administrator'||(ctx.role==='Teacher'&&course?.instructor_id===ctx.user.id)||(ctx.role==='Student'&&attempt.student_id===ctx.user.id);if(!authorized)throw new Error('You are not authorized to review this assessment.');
      const [{data:student},{data:feedback}]=await Promise.all([window.sb.from('profiles').select('id,full_name,username').eq('id',attempt.student_id).single(),window.sb.from('assessment_feedback').select('id,reviewer_id,feedback,strengths,improvement_area,action_plan,updated_at').eq('attempt_id',attempt.id).maybeSingle()]);
      let questions=[];if(ctx.role!=='Student'){const q=await window.sb.from('quiz_questions').select('id,question,correct_answer,points,position').eq('module_id',attempt.module_id).order('position');if(q.error)throw q.error;questions=q.data||[];}
      const pct=Number(attempt.max_score)?Math.round(100*Number(attempt.score||0)/Number(attempt.max_score)):0,answers=attempt.answers&&typeof attempt.answers==='object'?attempt.answers:{};
      const answerRows=questions.map((q,i)=>{const selected=answers[q.id]??answers[String(q.id)]??'';const correct=String(selected)===String(q.correct_answer);return `<div class="card" style="margin-bottom:10px"><b>Q${i+1}. ${escapeHtml(q.question)}</b><div class="small muted" style="margin-top:7px">Selected: ${escapeHtml(String(selected)||'Not answered')} • Correct: ${escapeHtml(String(q.correct_answer||''))}</div><div class="status" style="margin-top:8px;${correct?'':'background:#fff0f0;color:#9b1c1c'}">${correct?'Correct':'Needs review'} • ${Number(q.points||1)} point${Number(q.points||1)===1?'':'s'}</div></div>`}).join('')||(ctx.role==='Student'?'<div class="notice">Your submitted assessment has been recorded and scored by the LMS.</div>':'<div class="notice">Question-level evidence is unavailable for this attempt.</div>');
      const feedbackView=feedback?`<div class="card"><h3>Teacher feedback</h3><p>${escapeHtml(feedback.feedback||'')}</p>${feedback.strengths?`<p><b>Strengths:</b> ${escapeHtml(feedback.strengths)}</p>`:''}${feedback.improvement_area?`<p><b>Improvement area:</b> ${escapeHtml(feedback.improvement_area)}</p>`:''}${feedback.action_plan?`<div class="notice"><b>Action plan:</b> ${escapeHtml(feedback.action_plan)}</div>`:''}<p class="small muted">Updated ${new Date(feedback.updated_at).toLocaleString()}</p></div>`:'<div class="notice">No teacher feedback has been added yet.</div>';
      const canReview=ctx.role==='Teacher'||ctx.role==='Administrator';
      main.innerHTML=`<div class="hero"><div class="kpi"><div><span class="badge">ASSESSMENT REVIEW</span><h1>${escapeHtml(module.title||'Assessment')}</h1><p>${ctx.role==='Student'?'Your submitted assessment':'Learner: '+escapeHtml(student?.full_name||student?.username||'Student')} • ${new Date(attempt.submitted_at).toLocaleString()}</p></div><span class="status" style="font-size:18px;${pct<50?'background:#fff0f0;color:#9b1c1c':''}">${pct}%</span></div></div><div class="grid"><div><div class="card"><h3>Assessment evidence</h3>${answerRows}</div></div><div><div class="card"><h3>Feedback</h3>${feedbackView}</div>${canReview?`<div class="card" style="margin-top:18px"><h3>${feedback?'Update':'Add'} teacher feedback</h3><p class="small muted">Give concise, actionable feedback the learner can use in the next learning cycle.</p><label>Overall feedback<textarea id="fb_feedback" rows="4">${escapeAttr(feedback?.feedback||'')}</textarea></label><label>Strengths<textarea id="fb_strengths" rows="3">${escapeAttr(feedback?.strengths||'')}</textarea></label><label>Improvement area<textarea id="fb_improvement" rows="3">${escapeAttr(feedback?.improvement_area||'')}</textarea></label><label>Action plan<textarea id="fb_action" rows="3">${escapeAttr(feedback?.action_plan||'')}</textarea></label><button class="btn" onclick="saveAssessmentFeedback('${attempt.id}')">Save Feedback</button><div id="feedbackResult" style="margin-top:10px"></div></div>`:''}</div></div><br><button class="btn alt" onclick="assessment()">← Back to Assessment Centre</button>`;
    }catch(error){main.innerHTML=`<div class="card"><div class="dangerbox">${escapeHtml(error.message||'Unable to load assessment review.')}</div></div>`;}
  }
  async function saveFeedback(attemptId){
    const result=document.getElementById('feedbackResult');if(!result)return;
    try{
      const ctx=await context();if(ctx.role!=='Teacher'&&ctx.role!=='Administrator')throw new Error('Only a teacher or administrator can submit feedback.');
      const {data:attempt,error:attemptError}=await window.sb.from('quiz_attempts').select('id,module_id,student_id').eq('id',attemptId).single();if(attemptError||!attempt)throw new Error('Assessment attempt could not be loaded.');
      const {data:module}=await window.sb.from('modules').select('course_id').eq('id',attempt.module_id).single();const {data:course}=await window.sb.from('courses').select('instructor_id').eq('id',module.course_id).single();
      if(ctx.role==='Teacher'&&course?.instructor_id!==ctx.user.id)throw new Error('You are not authorized to provide feedback for this assessment.');
      const payload={attempt_id:attemptId,reviewer_id:ctx.user.id,feedback:document.getElementById('fb_feedback').value.trim(),strengths:document.getElementById('fb_strengths').value.trim()||null,improvement_area:document.getElementById('fb_improvement').value.trim()||null,action_plan:document.getElementById('fb_action').value.trim()||null,updated_at:new Date().toISOString()};
      if(!payload.feedback){result.innerHTML='<div class="dangerbox">Please add overall feedback before saving.</div>';return;}
      result.innerHTML='<div class="notice">Saving feedback…</div>';
      const {data:existing}=await window.sb.from('assessment_feedback').select('id').eq('attempt_id',attemptId).maybeSingle();
      const response=existing?await window.sb.from('assessment_feedback').update(payload).eq('id',existing.id):await window.sb.from('assessment_feedback').insert(payload);if(response.error)throw response.error;
      result.innerHTML='<div class="feedback good"><b>Feedback saved.</b> The learner has been notified and can now see it in the Assessment Centre.</div>';
      setTimeout(()=>assessmentDetailReview(attemptId),700);
    }catch(error){result.innerHTML=`<div class="dangerbox">${escapeHtml(error.message||'Unable to save feedback.')}</div>`;}
  }
  window.assessment=assessmentReview;window.assessmentDetail=assessmentDetailReview;window.saveAssessmentFeedback=saveFeedback;
})();
