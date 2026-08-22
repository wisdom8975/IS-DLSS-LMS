(function(){
'use strict';
if(window.__isdRoleRouterInstalled)return;
window.__isdRoleRouterInstalled=true;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const db=()=>window.sb||null;
const adminDashboard=window.dashboard;
async function getRole(){
  const p=window.profile;
  if(p?.role)return String(p.role);
  if(window.currentUser?.role)return String(window.currentUser.role);
  const s=db();
  if(!s)return '';
  const {data:{user}}=await s.auth.getUser();
  if(!user)return '';
  const {data}=await s.from('profiles').select('id,full_name,username,role,active,institution').eq('id',user.id).single();
  if(data){window.profile=data;window.currentUser=window.currentUser||user;window.role=data.role;}
  return String(data?.role||'');
}
async function teacherDashboard(){
 const main=document.getElementById('main');if(!main)return;
 const s=db();if(!s)throw new Error('Supabase client is unavailable.');
 main.innerHTML='<div class="card"><div class="notice">Loading Teacher Dashboard…</div></div>';
 const uid=window.currentUser?.id;
 if(!uid)throw new Error('Teacher session could not be verified.');
 const {data:me,error:meError}=await s.from('profiles').select('id,full_name,username,role,active,institution').eq('id',uid).single();
 if(meError)throw meError;
 if(String(me?.role)!=='Teacher'||me.active===false)throw new Error('This account is not an active Teacher.');
 window.profile=me;
 const {data:rows,error}=await s.rpc('teacher_supervision_students',{p_teacher_id:uid});
 if(error)throw error;
 const supervised=rows||[];
 const studentMap=new Map(supervised.map(r=>[r.student_id,r]));
 const courseMap=new Map(supervised.map(r=>[r.course_id,r.course_title]));
 const progress=supervised.map(r=>Number(r.progress_percent||0));
 const progressAvg=progress.length?Math.round(progress.reduce((a,b)=>a+b,0)/progress.length):0;
 const scored=supervised.filter(r=>r.latest_score!==null&&Number(r.latest_max_score)>0);
 const quizAvg=scored.length?Math.round(scored.reduce((a,r)=>a+100*Number(r.latest_score||0)/Number(r.latest_max_score),0)/scored.length):0;
 const support=[...studentMap.values()].filter(r=>Number(r.progress_percent||0)<50 || (r.latest_score!==null&&Number(r.latest_max_score)>0&&100*Number(r.latest_score||0)/Number(r.latest_max_score)<50));
 const name=esc(me.full_name||me.username||'Teacher');
 main.innerHTML=`<div class="connection-bar"><span class="live-dot"></span>Connected to live IS-DLSS database • ${name}</div>
 <section class="hero"><span class="role-badge teacher">TEACHER • INSTRUCTIONAL SUPERVISOR</span><h1>Welcome back, ${name}.</h1><p>Monitor learner progress, review assessment evidence, identify support needs and follow up with targeted instructional support.</p><div class="quick"><button class="btn" onclick="show('supervision')">Supervise Learners</button><button class="btn alt" onclick="show('courses')">Manage My Courses</button><button class="btn alt" onclick="show('analytics')">Open Analytics</button></div></section>
 <div class="grid4"><div class="card"><div class="metric">${studentMap.size}</div><p>Students supervised</p></div><div class="card"><div class="metric">${courseMap.size}</div><p>My courses</p></div><div class="card"><div class="metric">${quizAvg}%</div><p>Latest quiz average</p></div><div class="card"><div class="metric">${support.length}</div><p>Need support</p></div></div>
 <div class="grid"><div class="card"><h3>Students needing support</h3><div class="list">${support.slice(0,8).map(r=>{const qp=r.latest_score!==null&&Number(r.latest_max_score)>0?Math.round(100*Number(r.latest_score||0)/Number(r.latest_max_score)):null;return `<div class="list-row"><div class="grow"><b>${esc(r.student_name||r.student_username||'Student')}</b><div class="small muted">${esc(r.course_title||'Course')} • ${Number(r.progress_percent||0)}% progress${qp===null?'':' • '+qp+'% latest quiz'}</div></div><button class="btn alt" onclick="studentEvidence('${r.student_id}')">Review</button></div>`}).join('')||'<div class="notice">No learners currently meet the support threshold.</div>'}</div></div>
 <div class="card"><h3>Recent assessment evidence</h3><div style="overflow:auto"><table><tr><th>Student</th><th>Course</th><th>Progress</th><th>Score</th></tr>${supervised.filter(r=>r.latest_score!==null).slice(0,10).map(r=>{const pct=Number(r.latest_max_score)>0?Math.round(100*Number(r.latest_score||0)/Number(r.latest_max_score)):0;return `<tr><td>${esc(r.student_name||r.student_username||'Student')}</td><td>${esc(r.course_title||'Course')}</td><td>${Number(r.progress_percent||0)}%</td><td><span class="status" style="${pct<50?'background:#fff0f0;color:#9b1c1c':''}">${pct}%</span></td></tr>`}).join('')||'<tr><td colspan="4">No assessment evidence yet.</td></tr>'}</table></div></div>
 <div class="card"><h3>Next best action</h3><div class="notice"><b>Use evidence, then act.</b> Open a learner record to review completed lessons and quiz attempts before planning targeted support.</div><br><button class="btn" onclick="show('supervision')">Open Supervision Centre</button></div></div>`;
}
async function studentDashboard(){
 const main=document.getElementById('main');if(!main)return;
 main.innerHTML='<div class="card"><div class="notice">Loading Student Dashboard…</div></div>';
 const uid=window.currentUser?.id;if(!uid)throw new Error('Student session could not be verified.');
 const s=db();const {data:me,error}=await s.from('profiles').select('id,full_name,username,role,active,institution').eq('id',uid).single();if(error)throw error;if(String(me?.role)!=='Student'||me.active===false)throw new Error('This account is not an active Student.');window.profile=me;
 const {data:enrol}=await s.from('course_enrolments').select('course_id').eq('student_id',uid);const ids=(enrol||[]).map(x=>x.course_id);
 let courses=[];let progress=[];if(ids.length){const r=await s.from('courses').select('id,title,description').in('id',ids).order('title');courses=r.data||[];const p=await s.from('student_progress').select('course_id,progress_percent').eq('student_id',uid).in('course_id',ids);progress=p.data||[];}
 const pm=Object.fromEntries(progress.map(x=>[x.course_id,Number(x.progress_percent||0)]));const avg=progress.length?Math.round(progress.reduce((a,x)=>a+Number(x.progress_percent||0),0)/progress.length):0;
 main.innerHTML=`<div class="connection-bar"><span class="live-dot"></span>Connected to live IS-DLSS database • ${esc(me.full_name||me.username||'Student')}</div><section class="hero"><span class="role-badge student">STUDENT • LEARNER PORTAL</span><h1>Welcome, ${esc(me.full_name||me.username||'Learner')}.</h1><p>Learn, practise, discuss and track your progress from your learner-centred dashboard.</p><div class="quick"><button class="btn" onclick="show('courses')">Continue Learning</button><button class="btn alt" onclick="show('assessment')">My Assessments</button><button class="btn alt" onclick="show('resources')">Resource Library</button></div></section><div class="grid4"><div class="card"><div class="metric">${avg}%</div><p>Average progress</p></div><div class="card"><div class="metric">${courses.length}</div><p>Courses enrolled</p></div><div class="card"><div class="metric">${progress.filter(x=>Number(x.progress_percent||0)>=100).length}</div><p>Courses completed</p></div><div class="card"><div class="metric">${progress.filter(x=>Number(x.progress_percent||0)<50).length}</div><p>Courses needing attention</p></div></div><div class="grid"><div class="card"><h3>My courses</h3><div class="list">${courses.slice(0,8).map(c=>`<div class="list-row"><div class="grow"><b>${esc(c.title)}</b><div class="progress" style="margin-top:7px"><i style="width:${pm[c.id]||0}%"></i></div><div class="small muted">${pm[c.id]||0}% complete</div></div><button class="btn alt" onclick="openCourse('${c.id}')">Open</button></div>`).join('')||'<div class="notice">You are not enrolled in a course yet.</div>'}</div></div><div class="card"><h3>Learning focus</h3><div class="notice">Complete your next lesson, attempt the formative assessment and check teacher feedback after submission.</div></div><div class="card"><h3>Support</h3><p class="muted">Use the Inbox for assessment feedback and important learning notifications.</p><button class="btn alt" onclick="notifications(this)">Open Inbox</button></div></div>`;
}
window.__isdAdminDashboard=adminDashboard;
window.dashboard=async function(){
 const r=(await getRole()).toLowerCase();
 if(r==='administrator')return adminDashboard();
 if(r==='teacher')return teacherDashboard();
 if(r==='student')return studentDashboard();
 throw new Error('Your account role could not be determined.');
};
window.__isdRoleRoutingVersion='20260822-role-routing-v1';
})();