// Module-level formative assessment compatibility layer.
// The assessment is now ONE objective A-D formative assessment per module.
// Each module contains exactly 20 unique questions; there is no lesson-level 20-question duplication.
(function(){
  'use strict';

  function shuffleChoices(){
    document.querySelectorAll('#moduleQuiz .choices').forEach(function(container){
      if(container.dataset.shuffled === '1') return;
      var items=Array.prototype.slice.call(container.querySelectorAll('.choice'));
      if(items.length<2) return;
      for(var i=items.length-1;i>0;i--){
        var j=Math.floor(Math.random()*(i+1));
        var tmp=items[i];items[i]=items[j];items[j]=tmp;
      }
      items.forEach(function(item){container.appendChild(item);});
      container.dataset.shuffled='1';
    });
  }

  function setAssessmentHeading(){
    document.querySelectorAll('h3').forEach(function(h){
      var text=(h.textContent||'').trim().toLowerCase();
      if(text==='📝 formative quiz' || text==='formative quiz') h.textContent='📝 Formative Assessment';
    });
  }

  function clean(){
    // Keep the module quiz visible. It is the authoritative assessment now.
    // Remove any obsolete lesson-level formative cards if an old cached script creates one.
    document.querySelectorAll('.lesson-formative-card').forEach(function(el){el.remove();});
    setAssessmentHeading();
    shuffleChoices();
  }

  function boot(){
    clean();
    new MutationObserver(function(){clean();}).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
