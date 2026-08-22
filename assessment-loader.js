// Reliability loader for the interactive lesson formative assessment.
(function(){
  'use strict';
  const VERSION='20260822-lesson-20q-v10';
  function add(src,attr){
    if(document.querySelector('script[src*="'+src+'"]'))return;
    const s=document.createElement('script');s.src=src+'?v='+VERSION;s.defer=true;s.setAttribute(attr,'true');document.head.appendChild(s);
  }
  function load(){add('lesson-formative.js','data-lesson-formative');add('formative-assessment.js','data-formative-assessment')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
