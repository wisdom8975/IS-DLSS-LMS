// Compatibility shim for the lesson formative assessment.
// The authoritative 20-question assessment is implemented in lesson-formative.js
// and graded server-side by Supabase. This file intentionally does not render
// the old hard-coded 5-question client-side quiz.
(function(){
  'use strict';

  function removeLegacyText(){
    document.querySelectorAll('.lesson-content').forEach(function(c){
      var text=c.textContent||'';
      if(text.includes('𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗩𝗘 𝗔𝗦𝗦𝗘𝗦𝗦𝗠𝗘𝗡𝗧')){
        var marker='𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗩𝗘 𝗔𝗦𝗦𝗘𝗦𝗦𝗠𝗘𝗡𝗧',study='𝗦𝗧𝗨𝗗𝗬 𝗖𝗛𝗘𝗖𝗞',a=text.indexOf(marker),b=text.indexOf(study,a);
        c.textContent=(text.slice(0,a).trim()+'\\n\\n'+(b>=0?text.slice(b).trim():'')).trim();
      }
    });
  }

  // Remove the old module-level formative quiz completely.
  // The LMS now uses the 20-question formative assessment attached to each lesson,
  // so the previous module-level quiz would duplicate assessment content.
  function removeDuplicateModuleQuiz(){
    document.querySelectorAll('#moduleQuiz').forEach(function(el){el.remove();});

    document.querySelectorAll('h3').forEach(function(h){
      var text=(h.textContent||'').trim().toLowerCase();
      if(text==='📝 formative quiz' || text==='formative quiz') h.remove();
    });

    document.querySelectorAll('#quizResult').forEach(function(el){el.remove();});

    // Remove the old module-level Submit Quiz button, but never remove
    // the lesson-level "SUBMIT & MARK ASSESSMENT" button.
    document.querySelectorAll('button').forEach(function(btn){
      var text=(btn.textContent||'').trim().toLowerCase();
      if(text==='submit quiz' && btn.closest('#moduleQuiz')===null) btn.remove();
    });

    // Remove the explanatory notice that tells students to complete the old quiz.
    document.querySelectorAll('.screen .notice').forEach(function(n){
      var text=(n.textContent||'').trim().toLowerCase();
      if(text.includes('complete the formative quiz')) n.remove();
    });
  }

  function clean(){
    removeLegacyText();
    removeDuplicateModuleQuiz();
  }

  function boot(){
    clean();
    new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
