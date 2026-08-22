// Compatibility and structure layer for lesson-level formative assessments.
// The authoritative 20-question assessment is implemented in lesson-formative.js
// and graded server-side by Supabase. This file keeps the old module-level quiz
// out of the page and makes every lesson assessment objective-only (A-D), matching
// the Biology lesson assessment structure.
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

  function removeDuplicateModuleQuiz(){
    document.querySelectorAll('#moduleQuiz').forEach(function(el){el.remove();});
    document.querySelectorAll('h3').forEach(function(h){
      var text=(h.textContent||'').trim().toLowerCase();
      if(text==='📝 formative quiz' || text==='formative quiz') h.remove();
    });
    document.querySelectorAll('#quizResult').forEach(function(el){el.remove();});
    document.querySelectorAll('button').forEach(function(btn){
      var text=(btn.textContent||'').trim().toLowerCase();
      if(text==='submit quiz' && btn.closest('.lesson-formative-card')===null) btn.remove();
    });
    document.querySelectorAll('.screen .notice').forEach(function(n){
      var text=(n.textContent||'').trim().toLowerCase();
      if(text.includes('complete the formative quiz') || text.includes('complete the formative assessment')) n.remove();
    });
  }

  function matchBiologyLessonStructure(){
    document.querySelectorAll('.lesson-formative-card').forEach(function(card){
      // Objective assessment: learners select one of four options. Do not show
      // a free-text answer box because these are objective items.
      card.querySelectorAll('.lf-answer-label,.lf-answer-input').forEach(function(el){el.remove();});

      var title=card.querySelector('.lf-head h3');
      if(title) title.textContent='20-Question Formative Assessment';

      // Keep the assessment directly inside its lesson and immediately before
      // the lesson-completion control, as in the Biology structure.
      var article=card.closest('article');
      var completeButton=article&&article.querySelector('button[onclick*="toggleLessonComplete"]');
      if(article&&completeButton&&card.parentElement===article&&completeButton.previousElementSibling!==card){
        completeButton.before(card);
      }
    });
  }

  function clean(){
    removeLegacyText();
    removeDuplicateModuleQuiz();
    matchBiologyLessonStructure();
  }

  function boot(){
    clean();
    new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
