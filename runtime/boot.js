import {renderSite} from '../shared/render.js';
import {clientConfig} from '../shared/model.js';
import {validateOnline,assetHref,displayModel} from './content.js';
import {configured,connect,requireAdmin} from './firebase-sdk.js';
const root=new URL('../',import.meta.url),url=new URL(location.href),isPreview=url.pathname===new URL('preview.html',root).pathname;
const legacy=url.pathname.match(/\/work\/([a-zA-Z0-9_-]+)\/index.html$/);
const id=url.searchParams.get('id')||legacy?.[1]||null;
let model;
async function seed(){const response=await fetch(new URL('runtime/public-seed.json',root));if(!response.ok)throw new Error('目前無法載入作品集。');return validateOnline(await response.json());}
async function published(){
 let timer;
 try{return await Promise.race([(async()=>{const sdk=await connect(),record=await sdk.getDocFromServer(sdk.doc(sdk.db,'hct_portfolio','main'));return record.exists()?validateOnline(record.data().model,sdk.config.storageBucket):await seed();})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('作品資料連線逾時。')),5000);})]);}
 finally{clearTimeout(timer);}
}
try{
 if(isPreview){
  await requireAdmin();
  const key=url.searchParams.get('draft');
  if(!key||!/^[a-zA-Z0-9-]+$/.test(key))throw new Error('這份草稿預覽已失效，請回後台更新預覽。');
  const payload=sessionStorage.getItem('hct-online-preview-'+key);
  if(!payload)throw new Error('這份草稿預覽已失效，請回後台更新預覽。');
  model=validateOnline(JSON.parse(payload));
 }else if(configured){
  try{
   model=await published();
   try{sessionStorage.setItem('hct-public-model',JSON.stringify(model));}catch{}
  }catch{
   try{model=validateOnline(JSON.parse(sessionStorage.getItem('hct-public-model')||'null'));}catch{model=await seed();}
  }
 }else model=await seed();
 const view=displayModel(model,root),files=renderSite(model,{onlyProject:id||''});
 let html=files.get(id?'work/'+id+'/index.html':'index.html');
 if(!html){document.title='找不到作品 — hCt';document.body.innerHTML='<main class="wrap" style="padding-block:90px"><h1>這件作品已移除</h1><p style="margin:24px 0">可以回到作品集瀏覽其他作品。</p><a class="text-link" href="'+new URL('index.html#index',root).href+'">Back to index</a></main>';}
 else{
  const doc=new DOMParser().parseFromString(html,'text/html'),base=new URL(id?'work/'+id+'/index.html':'index.html',root);
  for(const el of doc.querySelectorAll('[href],[src],[srcset],[poster]'))for(const attribute of ['href','src','srcset','poster']){
   const value=el.getAttribute(attribute);if(!value||value.startsWith('#')||/^(https?:|mailto:|data:)/i.test(value))continue;
   const target=new URL(value,base),project=target.pathname.match(/\/work\/([a-zA-Z0-9_-]+)\/index.html$/);
   if(attribute==='href'&&project)el.setAttribute(attribute,new URL('work.html?id='+encodeURIComponent(project[1]),root).href);
   else if(['src','srcset','poster'].includes(attribute)&&target.href.startsWith(root.href+'assets/'))el.setAttribute(attribute,assetHref(target.href.slice(root.href.length),model,root));
   else el.setAttribute(attribute,target.href);
  }
  if(isPreview){
   for(const a of doc.querySelectorAll('a[href]')){
    const target=new URL(a.href);
    if(target.origin!==root.origin)continue;
    if(target.pathname===new URL('work.html',root).pathname||target.pathname===new URL('index.html',root).pathname||target.pathname===root.pathname){
     target.pathname=new URL('preview.html',root).pathname;target.searchParams.set('draft',url.searchParams.get('draft'));a.href=target.href;
    }
   }
  }
  const data=doc.getElementById('portfolio-data');if(data)data.textContent=JSON.stringify(view.items).replace(/</g,'\\u003c');
  const related=doc.getElementById('related-data');if(related)related.textContent=JSON.stringify(view.items.filter(p=>p.category===model.items.find(p=>p.id===id)?.category&&p.id!==id)).replace(/</g,'\\u003c');
  doc.getElementById('portfolio-config').textContent=JSON.stringify(clientConfig(model)).replace(/</g,'\\u003c');
  document.title=doc.title;document.documentElement.dataset.siteRoot=root.href;
  if(isPreview)document.documentElement.dataset.previewDraft=url.searchParams.get('draft');
  const styles=doc.querySelector('style');if(styles)document.head.append(styles);
  document.querySelector('meta[name="description"]')?.setAttribute('content',doc.querySelector('meta[name="description"]')?.content||'');
  document.body.replaceWith(document.importNode(doc.body,true));
  const script=document.createElement('script');script.src=new URL('app.js',root).href;
  if(isPreview)script.onload=()=>Promise.resolve(document.fonts?.ready).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>parent.postMessage({type:'hct-preview-ready',version:Number(url.searchParams.get('preview')),draft:url.searchParams.get('draft')},location.origin))));
  document.body.append(script);
 }
}catch(error){
 document.body.innerHTML='';const main=document.createElement('main');main.className='wrap';main.style.paddingBlock='80px';
 const heading=document.createElement('h1');heading.textContent=isPreview?'無法載入草稿預覽':'暫時無法載入作品集';
 const note=document.createElement('p');note.style.margin='24px 0';note.textContent=error.message;
 const link=document.createElement('a');link.className='text-link';link.href=new URL(isPreview?'admin/editor.html':'index.html',root).href;link.textContent=isPreview?'返回後台':'重新開啟作品集';main.append(heading,note,link);document.body.append(main);
}
