// IS-DLSS — temporary-password UI lifecycle fix.
// Hides the Change password control immediately after a temporary password
// has been successfully replaced with the learner/teacher's permanent password.
(function(){
  'use strict';
  if(window.__ISDLSS_PASSWORD_VISIBILITY_V1__) return;
  window.__ISDLSS_PASSWORD_VISIBILITY_V1__=true;

  const POLL_MS=2500;
  let timer=null;
  let observing=false;

  function buttons(){
    return [...document.querySelectorAll('button,a,[role="button"]')].filter(el=>
      /change\s+password/i.test((el.textContent||'').replace(/\s+/g,' ').trim())
    );
  }

  function setVisible(visible){
    buttons().forEach(el=>{
      el.style.display=visible?'':'none';
      el.setAttribute('aria-hidden',visible?'false':'true');
      if(!visible) el.dataset.isdPasswordControlHidden='true';
      else delete el.dataset.isdPasswordControlHidden;
    });
  }

  async function readPasswordState(){
    try{
      const s=window.sb;
      const user=window.currentUser;
      if(!s||!user)return null;
      const {data,error}=await s.from('profiles')
        .select('must_change_password')
        .eq('id',user.id)
        .maybeSingle();
      if(error||!data)return null;
      return data.must_change_password===true;
    }catch(e){
      console.warn('IS-DLSS password-state check failed:',e);
      return null;
    }
  }

  async function sync(){
    const required=await readPasswordState();
    if(required===null){
      // Do not hide the control when the status cannot be verified.
      setVisible(true);
      return;
    }
    setVisible(required);
    if(!required && timer){clearInterval(timer);timer=null;}
  }

  function startPolling(){
    if(timer)clearInterval(timer);
    timer=setInterval(sync,POLL_MS);
    sync();
  }

  function observe(){
    if(observing||!document.body)return;
    observing=true;
    new MutationObserver(()=>{
      const hidden=buttons().some(el=>el.dataset.isdPasswordControlHidden==='true');
      if(hidden)sync();
    }).observe(document.body,{childList:true,subtree:true});
  }

  // If the existing password-change flow uses Supabase auth.updateUser,
  // mark the profile as no longer requiring a temporary-password change.
  function patchAuthUpdate(){
    const s=window.sb;
    if(!s?.auth?.updateUser||s.auth.__isdPasswordPatch)return;
    const original=s.auth.updateUser.bind(s.auth);
    s.auth.updateUser=async function(...args){
      const result=await original(...args);
      try{
        if(!result?.error&&window.currentUser?.id){
          await s.from('profiles').update({
            must_change_password:false,
            updated_at:new Date().toISOString()
          }).eq('id',window.currentUser.id);
          setVisible(false);
        }
      }catch(e){
        console.warn('IS-DLSS could not clear temporary-password flag:',e);
      }
      return result;
    };
    s.auth.__isdPasswordPatch=true;
  }

  function boot(){
    observe();
    patchAuthUpdate();
    sync();
    startPolling();
    if(window.sb?.auth?.onAuthStateChange){
      window.sb.auth.onAuthStateChange(()=>setTimeout(()=>{patchAuthUpdate();sync()},150));
    }
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('button,a,[role="button"]') && /change\s+password/i.test(e.target.closest('button,a,[role="button"]').textContent||'')){
        setTimeout(startPolling,200);
      }
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500));
  else setTimeout(boot,500);
  window.isdPasswordVisibility={sync,startPolling};
})();
