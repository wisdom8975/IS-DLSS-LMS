// Reliability loader for the interactive formative assessment.
(function(){
  function load(){
    // The service worker injects this loader with data-formative-loader on the
    // loader tag itself. Do NOT use that attribute as the duplicate check.
    // Instead, check whether the actual assessment script is already present.
    if(document.querySelector('script[src*="formative-assessment.js"]')) return;
    var s=document.createElement('script');
    s.src='formative-assessment.js?v=20260821-4';
    s.defer=true;
    s.setAttribute('data-formative-assessment','true');
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load); else load();
})();
