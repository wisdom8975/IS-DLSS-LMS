// IS-DLSS runtime stability guard v1
(function(){
'use strict';
if(window.__ISDLSS_STABILITY_GUARD__) return;
window.__ISDLSS_STABILITY_GUARD__=true;
window.refreshLiveSurface=async function(){
  if(typeof window.refreshNotificationBadge==='function' && window.currentUser){
    try{ await window.refreshNotificationBadge(); }catch(e){}
  }
};
window.startLiveUpdates=function(){
  if(!window.currentUser || window.__isdStableLiveStarted)return;
  window.__isdStableLiveStarted=true;
  try{
    if(window.sb && typeof window.sb.channel==='function'){
      const ch=window.sb.channel('isd-lms-notifications-'+window.currentUser.id);
      ch.on('postgres_changes',{event:'*',schema:'public',table:'notifications'},p=>{
        const n=p&&p.new;
        if(!n||n.user_id===window.currentUser.id){
          if(typeof window.refreshNotificationBadge==='function') window.refreshNotificationBadge().catch(()=>{});
        }
      });
      ch.subscribe();
      window.__isdStableLiveChannel=ch;
    }
  }catch(e){}
};
})();
