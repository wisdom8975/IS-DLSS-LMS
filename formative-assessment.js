// Backward-compatible bridge for older cached assessment loaders.
// The production assessment UI now lives in module-assessment.js.
(function(){
  'use strict';
  const VERSION='20260822-module-assessment-bridge-v1';
  if(document.querySelector('script[src*="module-assessment.js"]')) return;
  const script=document.createElement('script');
  script.src='module-assessment.js?v='+VERSION;
  script.defer=true;
  script.setAttribute('data-module-assessment-bridge','true');
  document.head.appendChild(script);
})();
