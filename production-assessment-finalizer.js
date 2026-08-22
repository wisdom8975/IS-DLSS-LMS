// Final production assessment loader.
// Loaded after index.html so assessment-review-fix and feedback-fix run
// after the original inline LMS functions have been declared.
(function(){
  'use strict';
  const VERSION='20260822-assessment-final';
  const files=[
    'assessment-review-fix.js',
    'teacher-feedback-fix.js',
    'assessment-loader.js'
  ];

  function load(src){
    if(document.querySelector('script[data-production-assessment-src="'+src+'"]')) return;
    const s=document.createElement('script');
    s.src=src+'?v='+VERSION;
    s.async=false;
    s.setAttribute('data-production-assessment-src',src);
    document.body.appendChild(s);
  }

  files.forEach(load);
})();
