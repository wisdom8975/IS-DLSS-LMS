// Production assessment-review hardening.
// Keeps the existing assessment UI but fixes teacher scope and feedback access.
(function(){
  'use strict';

  async function getTeacherScope(){
    if(window.role!=='Teacher') return null;
    const {data:courses,error}=await window.sb.from('courses').select('id,title').eq('instructor_id',window.currentUser.id);
    if(error) throw error;
    const courseIds=(courses||[]).map(c=>c.id);
    if(!courseIds.length) return {courses:[],modules:[],moduleIds:[]};
    const {data:modules,error:moduleError}=await window.sb.from('modules').select('id,title,course_id,position').in('course_id',courseIds).order('position');
    if(moduleError) throw moduleError;
    return {courses:courses||[],modules:modules||[],moduleIds:(modules||[]).map(m=>m.id)};
  }

  async function assessmentReview(){
    const main=document.getElementById('main');
    main.innerHTML='<div class="card"><h2>Assessment Centre</h2><div class="notice">Loading live assessment evidence…</div></div>';

    let attempts=[];
    let modules=[];
    let students=[];

    try{
      if(window.role==='Student'){
        const {data,error}=await window.sb.from('quiz_attempts')
          .select('id,student_id,module_id,score,max_score,answers,submitted_at')
          .eq('student_id',window.currentUser.id)
          .order('submitted_at',{ascending:false}).limit(100);
        if(error) throw error;
        attempts=data||[];
      }else if(window.role==='Teacher'){
        const scope=await getTeacherScope();
        modules=scope.modules;
        if(scope.moduleIds.length){
          const {data,error}=await window.sb.from('quiz_attempts')
            .select('id,student_id,module_id,score,max_score,answers,submitted_at')
            .in('module_id',scope.moduleIds)
            .order('submitted_at',{ascending:false}).limit(100);
          if(error) throw error;
          attempts=data||[];
        }
      }else{
        const {data,error}=await window.sb.from('quiz_attempts')
          .select('id,student_id,module_id,score,max_score,answers,submitted_at')
          .order('submitted_at',{ascending:false}).limit(100);
        if(error) throw error;
        attempts=data||[];
      }

      const attemptIds=attempts.map(a=>a.id);
      const moduleIds=[...new Set(attempts.map(a=>a.module_id).filter(Boolean))];
      if(!modules.length && moduleIds.length){
        const {data,error}=await window.sb.from('modules').select('id,title,course_id,position').in('id',moduleIds);
        if(error) throw error;
        modules=data||[];
      }
      const courseIds=[...new Set(modules.map(m=>m.course_id).filter(Boolean))];
      const [{data:courseRows,error:courseError},{data:feedbackRows,error:feedbackError}]=await Promise.all([
        courseIds.length?window.sb.from('courses').select('id,title,instructor_id').in('id',courseIds):Promise.resolve({data:[],error:null}),
        attemptIds.length?window.sb.from('assessment_feedback').select('id,attempt_id,reviewer_id,feedback,strengths,improvement_area,action_plan,updated_at').in('attempt_id',attemptIds):Promise.resolve({data:[],error:null})
      ]);
      if(courseError) throw courseError;
      if(feedbackError) throw feedbackError;
      const courseMap=Object.fromEntries((courseRows||[]).map(c=>[c.id,c]));
      if(window.role!=='Student' && attempts.length){
        const ids=[...new Set(attempts.map(a=>a.student_id))];
        const {data,error}=ids.length?await window.sb.from('profiles').select('id,full_name,username').in('id',ids):{data:[],error:null};
        if(error) throw error;
        students=data||[];
      }
      const moduleMap=Object.fromEntries(modules.map(m=>[m.id,m]));
      const studentMap=Object.fromEntries(students.map(s=>[s.id,s.full_name||s.username||'Student']));
      const feedbackMap=Object.fromEntries((feedbackRows||[]).map(f=>[f.attempt_id,f]));
      const scored=attempts.filter(a=>Number(a.max_score)>0);
      const avg=scored.length?Math.round(scored.reduce((sum,a)=>sum+100*Number(a.score||0)/Number(a.max_score),0)/scored.length):0;
      const passed=scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)>=50).length;
      const passRate=scored.length?Math.round(100*passed/scored.length):0;
      const support=new Set(scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).map(a=>a.student_id));
      const title=window.role==='Student'?'My Assessment Results':window.role==='Teacher'?'Learner Assessment Results':'Institutional Assessment Results';
      const rows=attempts.map(a=>{
        const m=moduleMap[a.module_id], c=courseMap[m?.course_id], pct=Number(a.max_score)?Math.round(100*Number(a.score||0)/Number(a.max_score)):0;
        const f=feedbackMap[a.id];
        return `<tr><td>${window.role==='Student'?'You':escapeHtml(studentMap[a.student_id]||'Student')}</td><td>${escapeHtml(m?.title||'Assessment')}</td><td>${escapeHtml(c?.title||'')}</td><td><span class="status" style="${pct<50?'background:#fff0f0;color:#9b1c1c':''}">${pct}%</span></td><td>${new Date(a.submitted_at).toLocaleString()}</td><td>${f?'<span class="status">Feedback available</span>':'<span class="small muted">No feedback yet</span>'}</td><td><button class="btn alt" onclick="assessmentDetail('${a.id}')">${window.role==='Student'?'View Feedback':'Review & Feedback'}</button></td></tr>`;
      }).join('');
      main.innerHTML=`<div class="hero"><span class="badge">LIVE ASSESSMENT</span><h1>${title}</h1><p>${window.role==='Student'?'Review your quiz history, teacher feedback and areas that need more practice.':'Use assessment evidence to identify learners who need feedback, reteaching or targeted support.'}</p></div><div class="grid4"><div class="card"><div class="metric">${attempts.length}</div><p>Quiz attempts</p></div><div class="card"><div class="metric">${avg}%</div><p>Average score</p></div><div class="card"><div class="metric">${passRate}%</div><p>Pass rate</p></div><div class="card"><div class="metric">${window.role==='Student'?scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).length:support.size}</div><p>${window.role==='Student'?'Low scores':'Learners needing support'}</p></div></div><div class="card" style="margin-top:18px"><div class="kpi"><div><h2>Assessment history</h2><p class="muted">Results and feedback are read directly from the LMS database.</p></div>${window.role!=='Student'?'<button class="btn alt" onclick="exportAssessmentCsv()">Export CSV</button>':''}</div><div style="overflow:auto"><table><tr><th>Student</th><th>Module</th><th>Course</th><th>Score</th><th>Submitted</th><th>Feedback</th><th></th></tr>${rows||'<tr><td colspan="7"><div class="notice">No quiz attempts have been recorded yet.</div></td></tr>'}</table></div></div>`;
      window.__assessmentRows=attempts;
      window.__assessmentMaps={moduleMap,courseMap,studentMap};
    }catch(error){
      main.innerHTML=`<div class="card"><h2>Assessment Centre</h2><div class="dangerbox">${escapeHtml(error.message||'Unable to load assessment evidence.')}</div></div>`;
    }
  }

  window.assessment=assessmentReview;
})();
