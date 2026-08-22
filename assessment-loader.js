// Reliability loader for the interactive lesson formative assessment.
(function(){
  'use strict';
  function add(src, attr){
    if(document.querySelector('script[src*="'+src+'"]')) return;
    var s=document.createElement('script');
    s.src=src+'?v=20260822-20q';
    s.defer=true;
    s.setAttribute(attr,'true');
    document.head.appendChild(s);
  }
  function load(){
    // Load the authoritative 20-question lesson assessment first.
    add('lesson-formative.js','data-lesson-formative');
    // Then load the compatibility cleanup that removes the obsolete module quiz.
    add('formative-assessment.js','data-formative-assessment');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load); else load();
})();
