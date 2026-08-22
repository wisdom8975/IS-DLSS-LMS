// Static assessment centre and review guard.
// Assessment history is loaded when the teacher opens it and remains stable
// while reviewing feedback. No live assessment surface or refresh is used.
(function(){
  'use strict';

  const SUPABASE_URL='https://vahkwyetointavhzwfef.supabase.co';
  const SUPABASE_KEY='sb_publishable_gAs0e-XS4JVWNduZSBMqfw_49bLInX7';
  let client=null;

  function db(){
    if(client) return client;
    if(window.supabase && typeof window.supabase.createClient==='function'){
      client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    }
    return client;
  }

  function getRole(){
    const el=document.getElementById('role');
    return el?.value || 'Student';
  }

  async function getUser(){
    const c=db();
    if(!c) return null;
    const {data,error}=await c.auth.getUser();
    if(error) throw error;
    return data?.user||null;
  }

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  async function renderAssessment(){
    const main=document.getElementById('main');
    if(!main) return;
    window.__isdAssessmentStaticView=true;
    main.innerHTML='<div class="card"><h2>Assessment Centre</h2><div class="notice">Loading assessment history…</div></div>';

    try{
      const c=db();
      const user=await getUser();
      const currentRole=getRole();
      if(!c||!user) throw new Error('Your session has expired. Please sign in again.');

      let studentIds=[];
      if(currentRole==='Student'){
        studentIds=[user.id];
      }else if(currentRole==='Teacher'){
        const {data:courses,error}=await c.from('courses').select('id').eq('instructor_id',user.id);
        if(error) throw error;
        const courseIds=(courses||[]).map(x=>x.id);
        if(courseIds.length){
          const {data:mods,error:modError}=await c.from('modules').select('id').in('course_id',courseIds);
          if(modError) throw modError;
          const moduleIds=(mods||[]).map(x=>x.id);
          if(moduleIds.length){
            const {data:attempts,error:attemptError}=await c.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').in('module_id',moduleIds).order('submitted_at',{ascending:false}).limit(100);
            if(attemptError) throw attemptError;
            studentIds=[...new Set((attempts||[]).map(a=>a.student_id))];
          }
        }
      }else{
        const {data:students,error}=await c.from('profiles').select('id').eq('role','Student');
        if(error) throw error;
        studentIds=(students||[]).map(x=>x.id);
      }

      let attempts=[];
      if(currentRole==='Teacher'){
        const {data:courses,error}=await c.from('courses').select('id').eq('instructor_id',user.id);
        if(error) throw error;
        const courseIds=(courses||[]).map(x=>x.id);
        if(courseIds.length){
          const {data:mods,error:modError}=await c.from('modules').select('id').in('course_id',courseIds);
          if(modError) throw modError;
          const moduleIds=(mods||[]).map(x=>x.id);
          if(moduleIds.length){
            const {data:rows,error}=await c.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').in('module_id',moduleIds).order('submitted_at',{ascending:false}).limit(100);
            if(error) throw error;
            attempts=rows||[];
          }
        }
      }else if(studentIds.length){
        const {data:rows,error}=await c.from('quiz_attempts').select('id,student_id,module_id,score,max_score,answers,submitted_at').in('student_id',studentIds).order('submitted_at',{ascending:false}).limit(100);
        if(error) throw error;
        attempts=rows||[];
      }

      const attemptIds=attempts.map(a=>a.id);
      const moduleIds=[...new Set(attempts.map(a=>a.module_id).filter(Boolean))];
      const [{data:mods,error:modError},{data:feedbackRows,error:feedbackError}]=await Promise.all([
        moduleIds.length?c.from('modules').select('id,title,course_id').in('id',moduleIds):Promise.resolve({data:[],error:null}),
        attemptIds.length?c.from('assessment_feedback').select('id,attempt_id,feedback,strengths,improvement_area,action_plan,updated_at').in('attempt_id',attemptIds):Promise.resolve({data:[],error:null})
      ]);
      if(modError) throw modError;
      if(feedbackError) throw feedbackError;

      const courseIds=[...new Set((mods||[]).map(m=>m.course_id).filter(Boolean))];
      const {data:courses,error:courseError}=courseIds.length?await c.from('courses').select('id,title').in('id',courseIds):{data:[],error:null};
      if(courseError) throw courseError;
      const studentIdsForRows=[...new Set(attempts.map(a=>a.student_id))];
      const {data:students,error:studentError}=currentRole==='Student'?{data:[],error:null}:studentIdsForRows.length?await c.from('profiles').select('id,full_name,username').in('id',studentIdsForRows):{data:[],error:null};
      if(studentError) throw studentError;

      const moduleMap=Object.fromEntries((mods||[]).map(m=>[m.id,m]));
      const courseMap=Object.fromEntries((courses||[]).map(x=>[x.id,x]));
      const studentMap=Object.fromEntries((students||[]).map(x=>[x.id,x.full_name||x.username||'Student']));
      const feedbackMap=Object.fromEntries((feedbackRows||[]).map(x=>[x.attempt_id,x]));
      const scored=attempts.filter(a=>Number(a.max_score)>0);
      const avg=scored.length?Math.round(scored.reduce((s,a)=>s+100*Number(a.score||0)/Number(a.max_score),0)/scored.length):0;
      const passRate=scored.length?Math.round(100*scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)>=50).length/scored.length):0;
      const support=new Set(scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).map(a=>a.student_id));
      const title=currentRole==='Student'?'My Assessment Results':currentRole==='Teacher'?'Learner Assessment Results':'Institutional Assessment Results';
      const rows=attempts.map(a=>{
        const m=moduleMap[a.module_id];
        const pct=Number(a.max_score)?Math.round(100*Number(a.score||0)/Number(a.max_score)):0;
        const f=feedbackMap[a.id];
        return `<tr><td>${currentRole==='Student'?'You':esc(studentMap[a.student_id]||'Student')}</td><td>${esc(m?.title||'Assessment')}</td><td>${esc(courseMap[m?.course_id]?.title||'')}</td><td><span class="status" style="${pct<50?'background:#fff0f0;color:#9b1c1c':''}">${pct}%</span></td><td>${new Date(a.submitted_at).toLocaleString()}</td><td>${f?'<span class="status">Feedback available</span>':'<span class="small muted">No feedback yet</span>'}</td><td><button class="btn alt" onclick="assessmentDetail('${a.id}')">${currentRole==='Student'?'View Feedback':'Review & Feedback'}</button></td></tr>`;
      }).join('');

      main.innerHTML=`<div class="hero"><span class="badge">ASSESSMENT</span><h1>${title}</h1><p>${currentRole==='Student'?'Review your assessment history and saved teacher feedback.':'Review submitted assessment history, then open an individual record to write and save feedback.'}</p></div><div class="grid4"><div class="card"><div class="metric">${attempts.length}</div><p>Quiz attempts</p></div><div class="card"><div class="metric">${avg}%</div><p>Average score</p></div><div class="card"><div class="metric">${passRate}%</div><p>Pass rate</p></div><div class="card"><div class="metric">${currentRole==='Student'?scored.filter(a=>100*Number(a.score||0)/Number(a.max_score)<50).length:support.size}</div><p>${currentRole==='Student'?'Low scores':'Learners needing support'}</p></div></div><div class="card" style="margin-top:18px"><div class="kpi"><div><h2>Assessment history</h2><p class="muted">Saved assessment results and feedback are read from the LMS database when you open this page.</p></div>${currentRole!=='Student'?'<button class="btn alt" onclick="exportAssessmentCsv()">Export CSV</button>':''}</div><div style="overflow:auto"><table><tr><th>Student</th><th>Module</th><th>Course</th><th>Score</th><th>Submitted</th><th>Feedback</th><th></th></tr>${rows||'<tr><td colspan="7"><div class="notice">No quiz attempts have been recorded yet.</div></td></tr>'}</table></div></div>`;
      window.__assessmentRows=attempts;
      window.__assessmentMaps={moduleMap,courseMap,studentMap};
    }catch(error){
      main.innerHTML=`<div class="card"><h2>Assessment Centre</h2><div class="dangerbox">${esc(error.message||'Unable to load assessment history.')}</div></div>`;
    }
  }

  function install(){
    if(typeof window.assessment==='function' && !window.__isdStaticAssessmentInstalled){
      const original=window.assessment;
      window.assessment=function(){ return renderAssessment(); };
      window.__isdStaticAssessmentInstalled=true;
    }
    if(typeof window.refreshLiveSurface==='function' && !window.__isdAssessmentRefreshGuard){
      const originalRefresh=window.refreshLiveSurface;
      window.refreshLiveSurface=async function(reason){
        if(window.__isdAssessmentStaticView || window.__isdFeedbackEditing) return;
        return originalRefresh.apply(this,arguments);
      };
      window.__isdAssessmentRefreshGuard=true;
    }
    if(typeof window.show==='function' && !window.__isdAssessmentShowGuard){
      const originalShow=window.show;
      window.show=function(v,el){
        if(v!=='assessment') window.__isdAssessmentStaticView=false;
        return originalShow.apply(this,arguments);
      };
      window.__isdAssessmentShowGuard=true;
    }
  }

  install();
  const timer=setInterval(function(){
    install();
    if(window.__isdStaticAssessmentInstalled && window.__isdAssessmentRefreshGuard && window.__isdAssessmentShowGuard) clearInterval(timer);
  },100);
})();
