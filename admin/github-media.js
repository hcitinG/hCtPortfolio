import {githubConfig} from '../github-config.js';
import {requireAdmin} from '../runtime/firebase-sdk.js';

export const maxUploadBytes=25*1024*1024;
const formats={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'};
const validUID=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]+$/.test(value);
const validSHA=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
export function validateRepository(config){
 if(!config||!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(config.owner)||!/^[a-zA-Z0-9_.-]{1,100}$/.test(config.repo)||['.','..'].includes(config.repo))throw new Error('GitHub 儲存庫設定不正確，請檢查 github-config.js。');
 if(config.branch&&(!/^[a-zA-Z0-9_./-]{1,200}$/.test(config.branch)||/\.\.|\/\/|^\/|\/$/.test(config.branch)))throw new Error('GitHub 分支設定不正確。');
 return {...config};
}
export function assertUpload(blob){
 if(!blob||!formats[blob.type]||!blob.size||blob.size>maxUploadBytes)throw new Error('請使用 25 MB 以下的 PNG、JPG、WebP、GIF、MP4 或 WebM。');
 return formats[blob.type];
}
export async function ensurePublicMedia(records,{fetchImpl=(...args)=>fetch(...args)}={}){
 let index=0;
 async function worker(){while(index<records.length){
  const record=records[index++];let ready=false;
  const url=new URL(record.url);if(url.protocol!=='https:'||url.hostname!=='raw.githubusercontent.com')throw new Error('GitHub 素材網址不正確。');
  for(let attempt=0;attempt<3&&!ready;attempt++){
   try{const result=await fetchImpl(url.href,{method:'HEAD',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});ready=result.ok&&(result.headers.get('Content-Type')||'').split(';')[0]===record.contentType;}catch{}
   if(!ready&&attempt<2)await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!ready)throw new Error('新圖片尚未能從 GitHub 公開讀取，草稿仍已保留。請稍後再按「發布網站」。');
 }}
 await Promise.all(Array.from({length:Math.min(3,records.length)},worker));
}
async function base64(blob){
 const bytes=new Uint8Array(await blob.arrayBuffer()),chunks=[];
 for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
 return btoa(chunks.join(''));
}
// The credential lives only in this closure. No token is stored in a file,
// URL, model, DOM attribute, localStorage, sessionStorage, or backup.
export function createGitHubMediaClient({config=githubConfig,authorize=requireAdmin,fetchImpl=(...args)=>fetch(...args)}={}){
 const settings=validateRepository(config),repository='/repos/'+settings.owner+'/'+settings.repo;
 let connection=null,epoch=0,queue=Promise.resolve(),connecting=false;
 const state=()=>({connected:!!connection,owner:settings.owner,repo:settings.repo,branch:connection?.branch||settings.branch||'',userId:connection?.userId||''});
 function disconnect(){epoch++;connection=null;}
 async function identity(){try{const {user}=await authorize();if(!validUID(user?.uid))throw new Error('目前登入帳號不適用於圖片上傳。');return user;}catch(error){disconnect();throw error;}}
 async function api(route,token,options={}){
  let result;
  try{result=await fetchImpl('https://api.github.com'+route,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10',Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{})},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(60000)});}
  catch{throw new Error('無法確認 GitHub 操作結果，請檢查網路後再試。若正在上傳，可先到儲存庫確認是否已有新檔案。');}
  if(!result.ok){
   if(result.status===401){disconnect();throw new Error('GitHub 授權碼無效或已到期，請重新連線。');}
   if(result.status===403||result.status===429){const rate=result.headers.get('x-ratelimit-remaining');throw new Error(rate==='0'||result.status===429?'GitHub 暫時限制請求，請稍後再試。':'GitHub 拒絕操作，請確認授權碼只選定此儲存庫，並授予 Contents 的 Read and write 權限。');}
   if(result.status===404)throw new Error('找不到 GitHub 儲存庫或分支，或授權碼沒有存取權限。');
   if(result.status===409||result.status===422)throw new Error('GitHub 寫入衝突或分支限制，請確認分支允許直接新增檔案後再試。');
   throw new Error('GitHub 操作未完成，請稍後再試。');
  }
  try{return await result.json();}catch{throw new Error('GitHub 回傳資料不完整，請稍後再試。');}
 }
 async function connect(input){
  if(connecting)throw new Error('正在確認 GitHub 連線，請稍候。');
  const token=String(input||'').trim();
  if(!/^github_pat_[a-zA-Z0-9_]{20,250}$/.test(token))throw new Error('請使用 GitHub 的 Fine-grained personal access token，開頭為 github_pat_。');
  connecting=true;disconnect();const version=epoch;
  try{
   const user=await identity(),info=await api(repository,token);
   if(info.private!==false||info.archived||info.disabled||String(info.full_name).toLowerCase()!==(settings.owner+'/'+settings.repo).toLowerCase())throw new Error('圖片需存放在指定的公開、可寫入 GitHub 儲存庫。');
   if(info.permissions?.push===false)throw new Error('此 GitHub 帳號沒有這個儲存庫的寫入權限。');
   const branch=settings.branch||info.default_branch;
   validateRepository({...settings,branch});if(!branch)throw new Error('儲存庫尚未有預設分支，請先上傳網站檔案。');
   await api(repository+'/branches/'+encodeURIComponent(branch),token);
   const current=await identity();if(current.uid!==user.uid||version!==epoch)throw new Error('登入或連線狀態已變更，請重新連線。');
   connection={token,branch,userId:user.uid};return state();
  }finally{connecting=false;}
 }
 async function runUpload(blob){
  const ext=assertUpload(blob),user=await identity(),active=connection,version=epoch;
  if(!active)throw new Error('請先按「GitHub 圖片連線」輸入授權碼，再上傳新素材。');
  if(user.uid!==active.userId){disconnect();throw new Error('登入帳號已變更，請重新連接 GitHub。');}
  const filename=crypto.randomUUID()+'.'+ext,object='assets/uploads/'+user.uid+'/'+filename,logical='assets/github/'+user.uid+'/'+filename;
  const content=await base64(blob),current=await identity();
  if(active!==connection||version!==epoch||current.uid!==user.uid)throw new Error('登入或連線狀態已變更，請重新連線。');
  const result=await api(repository+'/contents/'+object,active.token,{method:'PUT',body:JSON.stringify({message:'Add portfolio media',content,branch:active.branch})});
  if(result.content?.path!==object||!validSHA(result.commit?.sha)||!validSHA(result.content?.sha))throw new Error('圖片寫入結果不完整，請到 GitHub 確認後再試。');
  const confirmed=await identity();
  if(active!==connection||version!==epoch||confirmed.uid!==user.uid)throw new Error('登入或連線狀態已變更，檔案已送往 GitHub，請重新登入後再處理作品。');
  // Pin to the immutable commit so replacing another file never changes this
  // image, and preview does not depend on a Pages deployment finishing.
  return {path:logical,record:{provider:'github',url:'https://raw.githubusercontent.com/'+settings.owner+'/'+settings.repo+'/'+result.commit.sha+'/'+object,contentType:blob.type,bytes:blob.size}};
 }
 function upload(blob){const pending=queue.then(()=>runUpload(blob));queue=pending.catch(()=>{});return pending;}
 return {connect,disconnect,state,upload};
}
export const githubMedia=createGitHubMediaClient();
