// Prevent background/live LMS updates from replacing the teacher feedback form.
(function(){
  'use strict';
  const VERSION='20260822-feedback-session-lock-v1';
  let activeAttempt=null;
  let saved={feedback:'',strengths:'',improvement_area:'',action_plan:''};
  let restoring=false;
  let rerenderTimer=null;

  const getMain=()=>document.getElementById('main');
  const isEditing=()=>!!window.__isdFeedbackEditing && !!activeAttempt;

  function capture(){
    const ids=['feedback','strengths','improvement_area','action_plan'];
    ids.forEach(k=>{
      const el=document.getElementById('production_fb_'+k)||document.getElementById('isd_fb_'+k);
      if(el) saved[k]=el.value;
    });
  }

  function restore(){
    if(restoring)return;
    restoring=true;
    Object.keys(saved).forEach(k=>{
      const el=document.getElementById('production_fb_'+k)||document.getElementById('isd_fb_'+k);
      if(el && saved[k] && !el.value) el.value=saved[k];
    });
    restoring=false;
  }

  function watchInputs(){
    const main=getMain();
    if(!main || main.__feedbackLockInputs)return;
    main.__feedbackLockInputs=true;
    main.addEventListener('input',function(e){
      if(!isEditing())return;
      if(e.target && /^production_fb_|^isd_fb_/.test(e.target.id||'')) capture();
    },true);
  }

  function wrapNavigation(){
    if(typeof window.show==='function'&&!window.__feedbackLockShow){
      const original=window.show;
      window.show=function(view,el){
        if(isEditing() && (view==='assessment'||view==='dashboard'||view==='courses')) return;
        return original.apply(this,arguments);
      };
      window.__feedbackLockShow=true;
    }
    if(typeof window.assessment==='function'&&!window.__feedbackLockAssessment){
      const original=window.assessment;
      window.assessment=function(){
        if(isEditing()) return;
        return original.apply(this,arguments);
      };
      window.__feedbackLockAssessment=true;
    }
  }

  function watchMain(){
    const main=getMain();
    if(!main || main.__feedbackLockObserver)return;
    const observer=new MutationObserver(function(){
      if(!isEditing()||restoring)return;
      capture();
      clearTimeout(rerenderTimer);
      rerenderTimer=setTimeout(function(){
        if(!isEditing())return;
        const hasEditor=document.getElementById('production_fb_feedback')||document.getElementById('isd_fb_feedback');
        const hasReview=document.querySelector('.hero .badge') && /ASSESSMENT REVIEW/i.test(document.querySelector('.hero .badge').textContent||'');
        if(!hasEditor||!hasReview){
          if(typeof window.productionAssessmentDetail==='function') window.productionAssessmentDetail(activeAttempt);
        }
        setTimeout(restore,120);
      },80);
    });
    observer.observe(main,{childList:true,subtree:true});
    main.__feedbackLockObserver=observer;
  }

  function monitor(){
    wrapNavigation();
    watchMain();
    if(window.__isdFeedbackEditing){
      if(!activeAttempt){
        const match=location.hash.match(/assessment(?:\/|=)([A-Za-z0-9-]+)/i);
        activeAttempt=window.__isdCurrentFeedbackAttempt||match?.[1]||null;
      }
      watchInputs();
    }else{
      activeAttempt=null;
      saved={feedback:'',strengths:'',improvement_area:'',action_plan:''};
    }
  }

  const originalDetail=window.productionAssessmentDetail;
  if(typeof originalDetail==='function'&&!window.__feedbackLockDetail){
    window.productionAssessmentDetail=function(attemptId){
      activeAttempt=attemptId;
      window.__isdCurrentFeedbackAttempt=attemptId;
      return originalDetail.apply(this,arguments);
    };
    window.__feedbackLockDetail=true;
  }

  const timer=setInterval(monitor,100);
  window.__feedbackSessionLockVersion=VERSION;
})();
