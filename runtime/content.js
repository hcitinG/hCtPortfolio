import {validate} from '../shared/model.js';
import {githubConfig} from '../github-config.js';
import {firebaseConfig} from '../firebase-config.js';
export function canonicalJSON(value){if(Array.isArray(value))return '['+value.map(canonicalJSON).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(value[k])).join(',')+'}';return JSON.stringify(value);}
export function validateOnline(input,bucket=''){
 bucket=bucket||firebaseConfig.projectId+'.firebasestorage.app';
 const model=validate(input),media=model.media||{};
 if(!media||typeof media!=='object'||Array.isArray(media)||Object.keys(media).length>4000)throw new Error('素材資料格式不正確。');
 for(const [name,record]of Object.entries(media)){
  if(!/^assets\/(cloud|github)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(name))throw new Error('雲端素材路徑不正確。');
  if(!record||typeof record!=='object'||Array.isArray(record))throw new Error('素材資料格式不正確。');
  let url;try{url=new URL(record.url);}catch{throw new Error('素材連結不正確。');}
  if(name.startsWith('assets/github/')){
   const path=url.pathname.split('/'),object='assets/uploads/'+name.slice('assets/github/'.length);
   if(record.provider!=='github'||url.protocol!=='https:'||url.hostname!=='raw.githubusercontent.com'||url.username||url.password||url.search||url.hash||path[1]?.toLowerCase()!==githubConfig.owner.toLowerCase()||path[2]?.toLowerCase()!==githubConfig.repo.toLowerCase()||!/^[a-f0-9]{40}$/.test(path[3])||path.slice(4).join('/')!==object||!/^image\/(png|jpeg|webp|gif)$|^video\/(mp4|webm)$/.test(record.contentType)||!Number.isInteger(record.bytes)||record.bytes<=0||record.bytes>25*1024*1024)throw new Error('GitHub 素材必須來自指定的作品集儲存庫。');
   continue;
  }
  const object='hct-portfolio/'+name.slice('assets/cloud/'.length);
  if(url.protocol!=='https:'||url.hostname!=='firebasestorage.googleapis.com'||url.username||url.password||!url.pathname.endsWith('/o/'+encodeURIComponent(object))||(bucket&&!url.pathname.startsWith('/v0/b/'+encodeURIComponent(bucket)+'/')))throw new Error('雲端素材必須來自這個 Firebase 專案。');
 }
 const references=new Set([model.header.logo.image,...model.items.flatMap(p=>[p.image,p.thumbnail,p.video,p.still])].filter(Boolean));
 for(const name of references)if(/^assets\/(cloud|github)\//.test(name)&&!media[name])throw new Error('找不到新作品的雲端素材，請重新上傳。');
 model.media=Object.fromEntries(Object.entries(media).filter(([name])=>references.has(name)));
 if(new TextEncoder().encode(JSON.stringify(model)).length>850000)throw new Error('目前內容超過單次儲存上限，請縮短過長的作品說明後再試。');
 return model;
}
export function assetHref(value,model,root){
 if(!value)return '';
 const cloud=model.media?.[value];
 return cloud?cloud.url+'#'+value.split('/').at(-1):new URL(value,root).href;
}
export function displayModel(model,root){
 const view=structuredClone(model);
 for(const p of view.items)for(const key of ['image','thumbnail','video','still'])if(p[key])p[key]=assetHref(p[key],model,root);
 if(view.header.logo.image)view.header.logo.image=assetHref(view.header.logo.image,model,root);
 return view;
}
