export function bindGitHubConnection(client,{notify=()=>{}}={}){
 const $=id=>document.getElementById(id),dialog=$('github-dialog'),field=$('github-token');
 let busy=false;
 function render(){
  const state=client.state();$('github-repository').textContent=state.owner+' / '+state.repo+(state.branch?' · '+state.branch:'');
  $('github-connect').textContent=state.connected?'GitHub 已連線':'GitHub 圖片連線';$('github-connect').dataset.connected=String(state.connected);
  $('github-disconnect').hidden=!state.connected;$('github-token').required=!state.connected;
  $('github-submit').textContent=state.connected?'更換授權碼':'確認連線';
 }
 function open(){render();field.value='';$('github-status').textContent=client.state().connected?'目前已連線，可直接上傳新素材。':'';if(!dialog.open)dialog.showModal();}
 function close(){if(busy)return;field.value='';dialog.close();}
 $('github-connect').addEventListener('click',open);$('github-close').addEventListener('click',close);$('github-cancel').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();else field.value='';});
 $('github-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  if(!field.value.trim()&&client.state().connected){close();return;}
  let credential=field.value;field.value='';busy=true;$('github-submit').disabled=true;$('github-status').textContent='正在確認 GitHub 連線…';
  try{await client.connect(credential);$('github-status').textContent='已連線，現在可以上傳素材。';notify('GitHub 已連線，可以上傳新圖片。');}
  catch(error){$('github-status').textContent=error.message;}
  finally{credential='';busy=false;$('github-submit').disabled=false;render();}
 });
 $('github-disconnect').addEventListener('click',()=>{if(busy)return;client.disconnect();field.value='';render();$('github-status').textContent='GitHub 授權已清除。已上傳的圖片與作品不受影響。';});
 window.addEventListener('pagehide',()=>{client.disconnect();field.value='';});
 window.addEventListener('pageshow',()=>{field.value='';render();if(!client.state().connected)$('github-status').textContent='';});
 render();$('github-connect').disabled=false;
 return {open,refresh:render,busy(value){busy=value;$('github-connect').disabled=value;if(!value)render();}};
}
