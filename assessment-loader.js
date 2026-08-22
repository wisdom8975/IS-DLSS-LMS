// Reliability loader for the module-level formative assessment.
(function(){
  'use strict';
  const VERSION='20260822-module-20q-v12';

  function add(src,attr){
    if(document.querySelector('script[src*="'+src+'"]')) return;
    const s=document.createElement('script');
    s.src=src+'?v='+VERSION;
    s.defer=true;
    s.setAttribute(attr,'true');
    document.head.appendChild(s);
  }

  function load(){
    // The LMS now uses one 20-question objective formative assessment per module.
    // Do not load the retired lesson-level formative script.
    add('formative-assessment.js','data-formative-assessment');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load);
  else load();
})();
