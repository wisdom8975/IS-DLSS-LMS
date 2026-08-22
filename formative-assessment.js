// Module-level formative assessment compatibility layer.
// ONE objective A-D formative assessment per module, with exactly 20 unique questions.
(function(){
  'use strict';

  function shuffleChoices(){
    document.querySelectorAll('#moduleQuiz .choices').forEach(function(container){
      var items=Array.prototype.slice.call(container.querySelectorAll('.choice'));
      if(items.length<2) return;
      if(container.dataset.shuffled!=='1'){
        for(var i=items.length-1;i>0;i--){
          var j=Math.floor(Math.random()*(i+1));
          var tmp=items[i];items[i]=items[j];items[j]=tmp;
        }
        items.forEach(function(item){container.appendChild(item);});
        container.dataset.shuffled='1';
      }
      var current=Array.prototype.slice.call(container.querySelectorAll('.choice'));
      current.forEach(function(item,i){
        if(item.dataset.optionLabelled==='1') return;
        item.insertBefore(document.createTextNode(String.fromCharCode(65+i)+'. '),item.firstChild);
        item.dataset.optionLabelled='1';
      });
    });
  }

  function setAssessmentHeading(){
    document.querySelectorAll('h3').forEach(function(h){
      var text=(h.textContent||'').trim().toLowerCase();
      if(text==='📝 formative quiz' || text==='formative quiz') h.textContent='📝 Formative Assessment';
    });
  }

  function clean(){
    // Keep the module assessment visible. Remove obsolete lesson-level cards from cached scripts.
    document.querySelectorAll('.lesson-formative-card').forEach(function(el){el.remove();});
    setAssessmentHeading();
    shuffleChoices();
  }

  function boot(){
    clean();
    new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
