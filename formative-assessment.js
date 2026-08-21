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
  function boot(){removeLegacyText();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  new MutationObserver(removeLegacyText).observe(document.body,{childList:true,subtree:true});
})();
