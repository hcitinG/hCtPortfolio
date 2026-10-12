import {requireAdmin,connectAdmin,readableError} from '../runtime/firebase-sdk.js';
import {validateOnline,assetHref,canonicalJSON} from '../runtime/content.js';
import {githubMedia,ensurePublicMedia} from './github-media.js';
const root=new URL('../',import.meta.url);
export const cloudState={publishedRevision:null,userId:null,media:{}};
const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const copy=value=>JSON.parse(JSON.stringify(value));
let sdk;
async function guard(){const next=await requireAdmin();if(cloudState.userId&&cloudState.userId!==next.user.uid)throw new Error('登入帳號已變更，請重新開啟後台。');sdk=next;cloudState.userId=next.user.uid;return next;}
const docs=()=>({draft:sdk.doc(sdk.db,'hct_portfolio_drafts','main'),published:sdk.doc(sdk.db,'hct_portfolio','main')});
async function initial(){const r=await fetch(new URL('runtime/public-seed.json',root));if(!r.ok)throw new Error('找不到初始作品資料。');return validateOnline(await r.json());}
export function asset(value){return assetHref(value,{media:cloudState.media},root);}
export async function publish(model){
 try{
  await guard();const next=validateOnline({...copy(model),media:{...model.media,...cloudState.media}},sdk.config.storageBucket),{draft,published}=docs();
  const visible=await sdk.getDocFromServer(published),previousMedia=visible.exists()?visible.data().model.media||{}:{};
  await ensurePublicMedia(Object.values(next.media).filter(record=>record.provider==='github'&&!Object.values(previousMedia).some(previous=>previous.url===record.url)));
  await guard();
  await sdk.runTransaction(sdk.db,async tx=>{
   const [saved,current]=await Promise.all([tx.get(draft),tx.get(published)]);
   if(!saved.exists()||saved.data().revision!==next.revision||canonicalJSON(saved.data().model)!==canonicalJSON(next))throw new Error('草稿已由其他視窗更新，請重新載入後台後再發布。');
   if(current.exists()&&current.data().revision>next.revision)throw new Error('公開版本已更新，請重新載入後台後再發布。');
   tx.set(published,{model:next,revision:next.revision,updatedAt:sdk.serverTimestamp(),updatedBy:sdk.user.uid});
  });
  cloudState.publishedRevision=next.revision;return next;
 }catch(error){throw new Error(readableError(error));}
}
export async function request(route,options={}){
 try{
  await guard();const {draft,published}=docs();
  if(route==='/api/state'&&!options.method){
   const [saved,current]=await Promise.all([sdk.getDocFromServer(draft),sdk.getDocFromServer(published)]);
   cloudState.publishedRevision=current.exists()?current.data().revision:null;
   const model=validateOnline(saved.exists()?saved.data().model:current.exists()?current.data().model:await initial(),sdk.config.storageBucket);
   cloudState.media={...model.media};return response(model);
  }
  if(route==='/api/state'&&options.method==='PUT'){
   const input=JSON.parse(options.body),next=validateOnline({...input,media:{...input.media,...cloudState.media}},sdk.config.storageBucket);
   const saved=await sdk.runTransaction(sdk.db,async tx=>{
    const previous=await tx.get(draft);
    if(previous.exists()&&previous.data().revision!==next.revision)throw new Error('另一個視窗已儲存更新，請先下載資料備份，再重新載入後台。');
    const result={...next,revision:next.revision+1};
    tx.set(draft,{model:result,revision:result.revision,updatedAt:sdk.serverTimestamp(),updatedBy:sdk.user.uid});return result;
   });cloudState.media={...saved.media};return response(saved);
  }
  if(route==='/api/upload'){
   const value=await githubMedia.upload(options.body);
   cloudState.media[value.path]=value.record;return response({path:value.path});
  }
  if(route==='/api/preview'){
   const input=JSON.parse(options.body),model=validateOnline({...input.model,media:{...input.model.media,...cloudState.media}},sdk.config.storageBucket),draftId=input.draftId||crypto.randomUUID();
   sessionStorage.setItem('hct-online-preview-'+draftId,JSON.stringify(model));
   return response({url:new URL('preview.html?draft='+encodeURIComponent(draftId),root).href,draftId});
  }
  if(route==='/api/backup'){
   const model=validateOnline({...JSON.parse(options.body),media:{...JSON.parse(options.body).media,...cloudState.media}},sdk.config.storageBucket);
   return new Response(JSON.stringify({format:'hct-firebase-backup',version:1,model},null,2),{headers:{'Content-Type':'application/json'}});
  }
  if(route==='/api/import'){
   const value=JSON.parse(await options.body.text());if(value.format!=='hct-firebase-backup')throw new Error('請選擇線上後台下載的 JSON 資料備份。');
   const next=validateOnline(value.model,sdk.config.storageBucket),previous=await request('/api/state');next.revision=(await previous.json()).revision;
   cloudState.media={...next.media};return request('/api/state',{method:'PUT',body:JSON.stringify(next)});
  }
  throw new Error('這個操作不適用於線上後台。');
 }catch(error){throw new Error(readableError(error));}
}
export async function logout(){githubMedia.disconnect();const identity=await connectAdmin();await identity.signOut(identity.auth);sessionStorage.removeItem('hct-online-draft-'+cloudState.userId);for(const key of Object.keys(sessionStorage))if(key.startsWith('hct-online-preview-'))sessionStorage.removeItem(key);location.replace(new URL('admin/index.html',root));}
