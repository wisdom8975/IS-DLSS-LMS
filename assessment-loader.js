// Reliability loader for the interactive formative assessment.
(function(){
  function load(){
    if(document.querySelector('script[data-formative-loader]')) return;
    var s=document.createElement('script');
    s.src='formative-assessment.js?v=20260821-2';
    s.defer=true;
    s.setAttribute('data-formative-loader','true');
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load); else load();
})();
