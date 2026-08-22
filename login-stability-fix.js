// IS-DLSS login stability patch.
// Runs after the legacy application is defined; it prevents post-auth dashboard failures
// from returning a successfully authenticated user to the login overlay.
(function(){
  'use strict';
  if(window.__ISDLSS_LOGIN_STABILITY__) return;
  window.__ISDLSS_LOGIN_STABILITY__=true;

  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const db=()=>window.sb||null;

  // The legacy dashboard is allowed to fail without taking the authenticated session
  // back to the sign-in overlay. Supabase authentication remains authoritative.
  if(typeof window.dashboard==='function'){
    const originalDashboard=window.dashboard;
    window.dashboard=async function(){
      try{
        return await originalDashboard.apply(this,arguments);
      }catch(error){
        const main=document.getElementById('main');
        if(main) main.innerHTML='<div class="card"><h2>Dashboard</h2><div class="dangerbox">The account is signed in, but the dashboard data is taking too long or returned an error. Your session is still active. Please refresh once to retry.</div></div>';
        return null;
      }
    };
  }

  // Keep the login request bounded so a stalled network/gateway request cannot leave
  // the mobile browser spinning indefinitely.
  if(typeof window.login==='function'){
    const originalLogin=window.login;
    window.login=async function(){
      const overlay=document.getElementById('loginOverlay');
      const message=document.getElementById('loginMessage');
      let finished=false;
      const timer=setTimeout(()=>{
        if(finished)return;
        if(message) message.innerHTML='<div class="login-error">The sign-in service is taking too long. Check your connection and try SIGN IN again. No account changes were made.</div>';
      },15000);
      try{return await originalLogin.apply(this,arguments)}
      finally{finished=true;clearTimeout(timer);}
    };
  }

  // Ensure an already authenticated session is not hidden behind the login overlay
  // after a successful auth event.
  try{
    if(window.currentUser && document.getElementById('loginOverlay')){
      document.getElementById('loginOverlay').style.display='none';
    }
  }catch(_){ }
})();
