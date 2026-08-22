// Final production assessment override.
// This file is intentionally loaded after index.html's inline application code
// so the original live-assessment function cannot win the race at boot.
(function(){
  'use strict';

  function install(){
    if(typeof window.assessment!=='function') return false;
    if(window.__isdProductionAssessmentFinalizerInstalled) return true;

    const staticAssessment = window.assessment;
    window.assessment = function(){
      window.__isdAssessmentStaticView = true;
      return staticAssessment.apply(this, arguments);
    };

    if(typeof window.refreshLiveSurface==='function'){
      const refresh = window.refreshLiveSurface;
      window.refreshLiveSurface = async function(reason){
        if(window.__isdAssessmentStaticView || window.__isdFeedbackEditing) return;
        return refresh.apply(this, arguments);
      };
    }

    if(typeof window.show==='function'){
      const show = window.show;
      window.show = function(view, el){
        if(view !== 'assessment') window.__isdAssessmentStaticView = false;
        return show.apply(this, arguments);
      };
    }

    window.__isdProductionAssessmentFinalizerInstalled = true;
    return true;
  }

  install();
  const timer=setInterval(function(){
    if(install()) clearInterval(timer);
  },50);
  setTimeout(function(){clearInterval(timer);},10000);
})();
