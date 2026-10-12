import {request,asset,cloudState,publish,logout} from './cloud-api.js';
import {githubMedia,assertUpload} from './github-media.js';
import {bindGitHubConnection} from './github-connection.js';
import {requireAdmin,readableError} from '../runtime/firebase-sdk.js';
try{await requireAdmin();}catch{location.replace(new URL('index.html',location.href));throw new Error('請先登入後台。');}
const draftKey='hct-online-draft-'+(await requireAdmin()).user.uid;
import {defaultStyles,typeStyle,text} from './model-browser.js';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
let model,view='works',sectionTab='hero',dirty=false,generation=0,search='',workFilter='all',editing=null,editingNew=false,uploadBusy=false,previewVisible=innerWidth>=900,previewTouched=false,device='desktop',previewTimer,previewVersion=0,previewAnchor='top';
let indexOrdering=null;
const labels={works:['CONTENT LIBRARY','作品管理','上傳與整理作品。分類、標題與說明會同步到各區塊和詳細頁。'],categories:['CATEGORIES','分類管理','這裡的名稱是共用資料。精選與索引的順序可在各自頁面調整。'],sections:['HOME CONTENT','首頁文字與電視框','調整各區塊的文字與樣式；電視框色彩只套用在框線與腳架。'],selected:['HIGHLIGHTS','精選作品','每個分類選一件作品。圖文從作品管理帶入，字體樣式可在這裡獨立調整。'],index:['WORK INDEX','作品索引','調整分類 Filter 的順序，並用編號批次排列各分類內的作品。'],about:['ABOUT','ABOUT','保留黑色背景。右側可新增、排序或移除 Email 與文字區塊。'],header:['NAVIGATION','導覽列與 Logo','更換識別圖像與文案，設定選單名稱、目的區塊和文字樣式。']};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const gitConnection=bindGitHubConnection(githubMedia,{notify:toast});
function readyForUpload(){if(githubMedia.state().connected)return true;gitConnection.open();toast('請先連接 GitHub，再選擇要上傳的檔案。');return false;}
const get=path=>path.split('.').reduce((obj,key)=>obj?.[key],model);
function set(path,value){const keys=path.split('.'),key=keys.pop(),obj=keys.reduce((o,k)=>o[k],model);obj[key]=value;}

const uid=prefix=>prefix+'-'+crypto.randomUUID().slice(0,12);
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500);}
function status(){ $('#works-count').textContent=model?.items.length??'';$('#save-state').textContent=dirty?'有尚未儲存的變更':model?.revision===cloudState.publishedRevision?'公開網站已更新':'草稿已儲存，尚未發布';$('#save-state').classList.toggle('dirty',dirty);$('#discard').hidden=!dirty; }
function preserveDraft(){model.media={...model.media,...cloudState.media};try{sessionStorage.setItem(draftKey,JSON.stringify(model))}catch{}}
function changed(){dirty=true;generation++;preserveDraft();status();schedulePreview();}
function confirmAction(message,accept='確認'){
 const dialog=$('#confirm-dialog');$('#confirm-message').textContent=message;$('#confirm-accept').textContent=accept;
 return new Promise(resolve=>{const finish=value=>{dialog.close();$('#confirm-cancel').onclick=$('#confirm-accept').onclick=null;dialog.oncancel=null;resolve(value)};$('#confirm-cancel').onclick=()=>finish(false);$('#confirm-accept').onclick=()=>finish(true);dialog.oncancel=event=>{event.preventDefault();finish(false)};dialog.showModal();});
}
function field(label,path,options={}){
 const value=get(path),common=`data-path="${path}" ${options.numeric?'data-numeric="true"':''}`;
 return `<label class="field">${esc(label)}${options.options?`<select ${common}>${options.options.map(([v,l])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`:options.rows?`<textarea ${common} rows="${options.rows}" maxlength="20000">${esc(value)}</textarea>`:`<input ${common} value="${esc(value)}" type="${options.type||'text'}" ${options.type==='number'?'min="8" max="220"':''}>`}${options.help?`<span class="field-help">${esc(options.help)}</span>`:''}</label>`;
}
const weightOptions=[400,500,600,700,800].map(n=>[n,String(n)+(n===400?' · 標準':n===500?' · 中等':n===600?' · 半粗':n===700?' · 粗體':' · 加粗')]);
function styleEditor(path){const value=get(path);return `<div class="type-controls"><label>大小 · px<input type="number" min="8" max="220" step="1" data-numeric="true" data-path="${path}.size" value="${value.size}"></label><label>色彩<div class="color-control"><input type="color" aria-label="文字色彩" data-path="${path}.color" value="${esc(value.color)}"><input type="text" aria-label="色彩代碼" data-path="${path}.color" pattern="#[0-9a-fA-F]{6}" maxlength="7" value="${esc(value.color)}"></div></label><label>粗細<select data-path="${path}.weight" data-numeric="true">${weightOptions.map(([v,l])=>`<option value="${v}" ${value.weight===v?'selected':''}>${l}</option>`).join('')}</select></label></div>`;}
function textEditor(label,path){return `<div class="text-editor">${field(label,path+'.text',{rows:label.includes('文案')?3:2})}${styleEditor(path)}</div>`;}
function moveButtons(path,index,length,remove=true){return `<div class="row-actions"><button class="icon-button" type="button" aria-label="往前移動" data-action="move" data-path-array="${path}" data-index="${index}" data-direction="-1" ${index===0?'disabled':''}>↑</button><button class="icon-button" type="button" aria-label="往後移動" data-action="move" data-path-array="${path}" data-index="${index}" data-direction="1" ${index===length-1?'disabled':''}>↓</button>${remove?`<button class="icon-button" type="button" aria-label="移除此區塊" data-action="remove-row" data-path-array="${path}" data-index="${index}">×</button>`:''}</div>`;}
function categoryOptions(value){return model.categories.map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>${esc(c.name)}</option>`).join('');}
function categoryName(id){return model.categories.find(c=>c.id===id)?.name||'';}
function worksView(){return `<div class="toolbar"><input id="work-search" aria-label="搜尋作品" placeholder="搜尋作品標題或說明…" value="${esc(search)}"><select id="work-filter" aria-label="依分類篩選"><option value="all">全部分類</option>${categoryOptions(workFilter)}</select></div><div class="work-grid" id="work-grid"></div>`;}
function renderWorkGrid(){
 const items=model.items.filter(p=>(workFilter==='all'||p.category===workFilter)&&(!search||[p.title,p.description,categoryName(p.category)].join(' ').toLowerCase().includes(search.toLowerCase())));
 $('#work-grid').innerHTML=items.length?items.map(p=>`<button type="button" class="work-tile" data-action="edit-work" data-id="${p.id}" aria-label="編輯 ${esc(p.title)}"><div class="work-thumb"><img loading="lazy" src="${asset(p.thumbnail)}" alt="">${p.mediaType==='video'?'<span class="media-badge">VIDEO</span>':''}</div><h3>${esc(p.title)}</h3><p>${esc(categoryName(p.category))}</p></button>`).join(''):'<p class="empty">沒有符合的作品。可以上傳新作品，或更改搜尋條件。</p>';
}
function categoriesView(){return `<section class="panel"><div class="panel-heading"><div><h2>共用作品分類</h2><p>修改名稱後，前台分類、精選說明與作品頁會一起更新。</p></div></div>${model.categories.map((c,i)=>`<div class="row-card"><div class="category-grid">${field('分類名稱',`categories.${i}.name`)}${field('作品頁英文分類（選填）',`categories.${i}.english`,{help:model.items.filter(p=>p.category===c.id).length+' 件作品'})}</div><div class="row-actions"><button type="button" class="icon-button" data-action="delete-category" data-id="${c.id}" aria-label="刪除 ${esc(c.name)} 分類">×</button></div></div>`).join('')}</section><section class="panel"><h2>新增分類</h2><form id="category-form" style="margin-top:20px"><div class="inline-fields"><label class="field">分類名稱<input name="name" required maxlength="100" placeholder="例如：影音"></label><label class="field">作品頁英文分類（選填）<input name="english" maxlength="100" placeholder="例如：Motion"></label></div><button class="button primary" type="submit">＋ 新增分類</button></form></section>`;}
function sectionsView(){
 const key=sectionTab,name={hero:'Visual, in focus.',selected:'Selected works.',index:'Work index.'}[key];
 return `<div class="toolbar" role="group" aria-label="選擇首頁區塊">${['hero','selected','index'].map(k=>`<button type="button" class="button ${key===k?'primary':''}" data-action="section-tab" data-key="${k}">${{hero:'Visual, in focus.',selected:'Selected works.',index:'Work index.'}[k]}</button>`).join('')}</div><section class="panel"><div class="panel-heading"><div><h2>${name}</h2><p>換行可直接使用 Enter；留空的文案不會顯示。</p></div></div>${textEditor('主標前段',`sections.${key}.title`)}${textEditor('主標強調文字',`sections.${key}.accent`)}${textEditor('區塊標籤',`sections.${key}.kicker`)}${textEditor('副標文字',`sections.${key}.subtitle`)}${textEditor('文案內容',`sections.${key}.body`)}</section>${key==='hero'?`<section class="panel"><h2>電視框線</h2><label class="field" style="margin-top:20px">框線與腳架顏色<div class="color-control"><input type="color" aria-label="電視框線顏色" data-path="sections.hero.frameColor" value="${model.sections.hero.frameColor}"><input type="text" data-path="sections.hero.frameColor" value="${model.sections.hero.frameColor}" pattern="#[0-9a-fA-F]{6}" maxlength="7"></div></label><p class="field-help">維持黑底螢幕、隨機閃爍與雜訊，不加入陰影。</p></section>`:''}`;
}
function addCategoryRow(target){const existing=new Set(get(target).map(e=>e.categoryId)),remaining=model.categories.filter(c=>!existing.has(c.id));return remaining.length?`<section class="panel"><div class="add-row"><select id="add-category-choice" aria-label="選擇要加入的分類">${remaining.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button type="button" class="button" data-action="add-category-row" data-target="${target}">＋ ${target==='selected'?'加入分類區塊':'加入分類 Filter'}</button></div></section>`:`<p class="field-help">所有分類都已加入。需要新分類時，先到「分類管理」新增。</p>`;}
function selectedView(){return model.selected.map((e,i)=>{
 const works=model.items.filter(p=>p.category===e.categoryId),p=works.find(p=>p.id===e.workId)||works[0];
 return `<section class="panel"><div class="row-heading"><h3>${esc(categoryName(e.categoryId))}</h3>${moveButtons('selected',i,model.selected.length)}</div>${field('展示作品',`selected.${i}.workId`,{options:[['','自動使用此分類第一件作品'],...works.map(p=>[p.id,p.title])]})}${p?`<div class="selected-sample"><img src="${asset(p.thumbnail)}" alt=""><div><h4>${esc(p.title)}</h4><p>${esc(p.description||'這件作品尚未填寫說明。')}</p></div></div>`:'<p class="field-help">這個分類尚無作品，加入作品後即可展示。</p>'}${field('圖片與文字構圖',`selected.${i}.layout`,{options:[['feature-wide','寬幅圖片'],['feature-left','圖片在左'],['feature-right','圖片在右']]})}<div class="text-editor"><label class="field">分類文字樣式</label>${styleEditor(`selected.${i}.styles.category`)}</div><div class="text-editor"><label class="field">作品標題樣式</label>${styleEditor(`selected.${i}.styles.title`)}</div><div class="text-editor"><label class="field">作品說明樣式</label>${styleEditor(`selected.${i}.styles.description`)}</div><details><summary>覆寫這個區塊的文字（選填）</summary><p class="field-help">只影響此精選區塊；留空會自動帶入作品資料。View more 仍指向所選作品。</p>${field('區塊分類文字',`selected.${i}.overrides.category`)}${field('區塊作品標題',`selected.${i}.overrides.title`,{rows:2})}${field('區塊作品說明',`selected.${i}.overrides.description`,{rows:3})}</details></section>`;
 }).join('')+addCategoryRow('selected');}
function orderedIndexWorks(entry,onlyIncluded=false){
 const ranks=new Map((entry.workOrder||[]).map((id,i)=>[id,i]));
 return model.items.filter(p=>p.category===entry.categoryId&&(!onlyIncluded||entry.workIds===null||entry.workIds.includes(p.id))).sort((a,b)=>(ranks.get(a.id)??Number.MAX_SAFE_INTEGER)-(ranks.get(b.id)??Number.MAX_SAFE_INTEGER));
}
function filterOrderView(){return `<section class="panel"><div class="panel-heading"><div><h2>分類 Filter 排序</h2><p>調整前台篩選按鈕的先後順序；「全部」固定在最前面。</p></div></div><div class="filter-order-preview" aria-label="前台 Filter 順序"><span>全部</span>${model.index.categories.filter(e=>e.enabled).map(e=>`<span>${esc(categoryName(e.categoryId))}</span>`).join('')}</div><p class="field-help">「全部」的作品也依此分類順序展示。例如將網頁移到最前面，網頁作品就會優先出現。精選作品的順序不受影響。</p><div class="filter-order-list">${model.index.categories.map((e,i)=>`<div class="filter-sort-row"><span>${esc(categoryName(e.categoryId))}${e.enabled?'':'<small>已隱藏</small>'}</span>${moveButtons('index.categories',i,model.index.categories.length,false).replace('aria-label="往前移動"',`aria-label="${esc(categoryName(e.categoryId))} Filter 往前移動"`).replace('aria-label="往後移動"',`aria-label="${esc(categoryName(e.categoryId))} Filter 往後移動"`)}</div>`).join('')}</div></section>`;}
function indexView(){return filterOrderView()+`<section class="panel"><h2>圖片與文字展示</h2><label class="check-label"><input type="checkbox" data-path="index.showCaptions" ${model.index.showCaptions?'checked':''}>在作品圖下顯示分類、標題與說明</label><p class="field-help">未開啟時保持定案的純圖片排列。分類篩選與作品連結仍正常運作。</p></section>`+model.index.categories.map((e,i)=>{
 const works=orderedIndexWorks(e),included=orderedIndexWorks(e,true),key=`index.categories.${i}`;
 return `<section class="panel"><div class="row-heading"><h3>${esc(categoryName(e.categoryId))}</h3><button class="icon-button" type="button" aria-label="${esc(categoryName(e.categoryId))}：移除索引分類" data-action="remove-row" data-path-array="index.categories" data-index="${i}">×</button></div><label class="check-label"><input type="checkbox" data-path="${key}.enabled" ${e.enabled?'checked':''}>顯示這個分類 Filter 與作品</label><div class="index-work-order"><div><h4>分類內的作品排序</h4><p class="field-help">${included.length} 件收錄作品，以編號一次調整順序。新作品會接在已排序的作品後面。</p></div><button type="button" class="button small" data-action="edit-index-order" data-category="${e.categoryId}" ${included.length?'':'disabled'}>編號排序</button></div><div class="text-editor"><label class="field">分類 Filter 文字樣式</label>${styleEditor(key+'.filter')}</div><label class="field">收錄作品<select data-action="index-source" data-index="${i}"><option value="all" ${e.workIds===null?'selected':''}>此分類的全部作品（新作品會自動加入）</option><option value="picked" ${e.workIds!==null?'selected':''}>自行挑選作品</option></select></label>${e.workIds!==null?`<div class="choices">${works.map(p=>`<label><input type="checkbox" data-action="index-work" data-index="${i}" data-id="${p.id}" ${e.workIds.includes(p.id)?'checked':''}><img src="${asset(p.thumbnail)}" alt=""><span>${esc(p.title)}</span></label>`).join('')}</div>`:''}<details ${model.index.showCaptions?'open':''}><summary>圖下文字樣式</summary><p class="field-help">開啟圖下資訊時套用，內容統一來自作品管理。</p>${['category','title','description'].map((k,n)=>`<div class="text-editor"><label class="field">${['分類','標題','說明'][n]}</label>${styleEditor(key+'.styles.'+k)}</div>`).join('')}</details></section>`;
 }).join('')+addCategoryRow('index.categories');}
function showIndexOrder(categoryId){
 const entry=model.index.categories.find(e=>e.categoryId===categoryId);if(!entry)return;
 const works=orderedIndexWorks(entry,true);indexOrdering={categoryId,allIds:orderedIndexWorks(entry).map(p=>p.id)};
 $('#index-order-title').textContent=categoryName(categoryId)+' · 作品編號排序';$('#index-order-error').textContent='';
 $('#index-order-list').innerHTML=works.map((p,i)=>`<label class="work-order-row"><img loading="lazy" src="${asset(p.thumbnail)}" alt=""><span>${esc(p.title)}</span><input type="number" min="1" max="10000" step="1" required data-order-id="${p.id}" aria-label="${esc(p.title)}的排序編號" value="${i+1}"></label>`).join('');
 $('#index-order-dialog').showModal();
}
function aboutView(){return `<section class="panel"><div class="panel-heading"><h2>左側介紹區</h2></div>${textEditor('主標文字','sections.about.title')}${textEditor('主標強調文字','sections.about.accent')}${textEditor('區塊標籤','sections.about.kicker')}${textEditor('副標文字','sections.about.subtitle')}${textEditor('文案內容（選填）','sections.about.body')}</section><div class="panel-heading"><h2>右側內容</h2><div><button type="button" class="button small" data-action="add-about" data-type="text">＋ 文字</button><button type="button" class="button small" data-action="add-about" data-type="email">＋ Email</button></div></div>${model.aboutBlocks.map((b,i)=>`<section class="panel"><div class="row-heading"><h3>${b.type==='email'?'Email':'文字區塊'}</h3>${moveButtons('aboutBlocks',i,model.aboutBlocks.length)}</div>${textEditor('區塊標籤',`aboutBlocks.${i}.label`)}${textEditor(b.type==='email'?'Email 文字':'文案內容',`aboutBlocks.${i}.body`)}${field(b.type==='email'?'Email 連結':'外部連結（選填）',`aboutBlocks.${i}.link`,{help:b.type==='email'?'使用 mailto:信箱地址；修改顯示文字時，連結也會同步更新。':'可留空，或填入 https:// 開頭的網址。'})}</section>`).join('')}`;}
function headerView(){return `<section class="panel"><div class="panel-heading"><h2>Logo 與左側文字</h2></div><div class="logo-preview">${model.header.logo.image?`<img src="${asset(model.header.logo.image)}" alt="目前 Logo">`:`<span style="color:${model.header.logo.color}">${esc(model.header.logo.text)}</span>`}</div><div class="toolbar"><button class="button" type="button" data-action="upload-logo">上傳 Logo 圖片</button>${model.header.logo.image?'<button class="button quiet" type="button" data-action="remove-logo">改回文字 Logo</button>':''}</div>${field('Logo 文字／圖片替代文字','header.logo.text')}${styleEditor('header.logo')}<p class="field-help">使用圖片時，「大小」設定為圖片高度。</p>${textEditor('左側文案','header.copy')}</section><div class="panel-heading"><h2>右側選單</h2><button class="button small" type="button" data-action="add-menu">＋ 新增選單項目</button></div>${model.header.menu.map((m,i)=>`<section class="panel"><div class="row-heading"><h3>${esc(m.text||'選單項目')}</h3>${moveButtons('header.menu',i,model.header.menu.length)}</div>${field('選單名稱',`header.menu.${i}.text`)}${field('連到哪裡',`header.menu.${i}.target`,{options:[['top','首頁頂端'],['selected','精選作品'],['index','作品索引'],['about','ABOUT'],...model.categories.map(c=>['category:'+c.id,'作品索引 · '+c.name])]})}${styleEditor('header.menu.'+i)}</section>`).join('')}`;}
function render(){
 Object.assign(cloudState.media,model.media||{});
 const [kicker,title,description]=labels[view];$('#view-kicker').textContent=kicker;$('#view-title').textContent=title;$('#view-description').textContent=description;
 $$('.sidebar nav [data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
 $('#view-actions').innerHTML=view==='works'?'<button type="button" class="button primary" data-action="new-work">＋ 上傳作品</button>':['selected','index'].includes(view)?'<button type="button" class="button" data-action="go-categories">＋ 新增分類</button>':'';
 const renderers={works:worksView,categories:categoriesView,sections:sectionsView,selected:selectedView,index:indexView,about:aboutView,header:headerView};$('#view').innerHTML=renderers[view]();if(view==='works')renderWorkGrid();status();
}
function navigate(next){view=next;previewAnchor={works:'index',categories:'index',sections:sectionTab==='hero'?'top':sectionTab,selected:'selected',index:'index',about:'about',header:'top'}[view];render();window.scrollTo({top:0,behavior:'instant'});schedulePreview(0);}
async function save(){
 if(uploadBusy)throw new Error('檔案正在處理，請稍候。');const version=generation,snapshot=clone(model);$('#save').disabled=true;$('#save-state').textContent='儲存中…';
 try{const response=await request('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)}),result=await response.json();model.revision=result.revision;if(generation===version){model=result;dirty=false;try{sessionStorage.removeItem(draftKey)}catch{}}else preserveDraft();status();schedulePreview(0);toast('草稿已儲存到 Firebase，按「發布網站」才會更新公開內容。');return result;}finally{$('#save').disabled=false;status();}
}
function schedulePreview(delay=650){clearTimeout(previewTimer);previewTimer=setTimeout(updatePreview,delay);}
function fitPreview(){const box=$('.preview-viewport');if(!box||box.clientWidth===0)return;const width=device==='mobile'?390:1440,scale=Math.min(1,(box.clientWidth-20)/width);$('#preview-scale').style.transform=`scale(${scale})`;$('#site-preview').style.height=Math.max(device==='mobile'?844:1080,(box.clientHeight-28)/scale)+'px';$('#preview-scale').style.width=width+'px';}
async function updatePreview(){
 if(!model)return;const version=++previewVersion;$('#preview-status').textContent='更新預覽…';
 try{
  const result=await(await request('/api/preview',{method:'POST',body:JSON.stringify({model,draftId:updatePreview.draftId})})).json();if(version!==previewVersion)return;updatePreview.draftId=result.draftId;
  const frame=$('#site-preview');let scroll=0,previous;try{scroll=frame.contentWindow.scrollY;previous=new URL(frame.contentWindow.location.href);}catch{}
  const next=new URL(result.url),id=previous?.searchParams.get('id');if(id&&model.items.some(p=>p.id===id))next.searchParams.set('id',id);next.searchParams.set('preview',version);if(!id)next.hash=previewAnchor;
  const rendered=event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='hct-preview-ready'||event.data.version!==version||version!==previewVersion)return;window.removeEventListener('message',rendered);fitPreview();if(id||!updatePreview.lastAnchor||updatePreview.lastAnchor===previewAnchor)frame.contentWindow.scrollTo({top:scroll,behavior:'instant'});updatePreview.lastAnchor=previewAnchor;$('#preview-status').textContent=dirty?'預覽包含尚未儲存的變更':'已儲存的草稿預覽'};
  if(updatePreview.listener)window.removeEventListener('message',updatePreview.listener);updatePreview.listener=rendered;window.addEventListener('message',rendered);frame.onload=fitPreview;frame.src=next.href;$('#preview-open').href=next.href;
 }catch(error){if(version===previewVersion)$('#preview-status').textContent=readableError(error);}
}
async function download(kind){
 if(kind==='export'){
  $('#export').disabled=true;
  try{
   if(!await confirmAction('發布目前草稿？公開網站會使用這份作品與文字內容。','發布網站'))return;
   if(dirty)await save();await publish(model);status();toast('已發布。公開網站重新開啟或重新整理後就會使用新版內容。');
  }catch(error){toast(error.message);}finally{$('#export').disabled=false;}
  return;
 }
 $('#backup').disabled=true;
 try{const blob=await(await request('/api/backup',{method:'POST',body:JSON.stringify(model)})).blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='hCt-firebase-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('資料備份已下載，包含作品、設定與雲端素材連結。');}catch(error){toast(error.message);}finally{$('#backup').disabled=false;}
}
async function upload(blob){const response=await request('/api/upload',{method:'POST',headers:{'Content-Type':blob.type},body:blob});return(await response.json()).path;}
async function artwork(file){
 assertUpload(file);gitConnection.busy(true);try{
 const video=file.type.startsWith('video/'),url=URL.createObjectURL(file);let media,width,height;
 try{
  media=video?document.createElement('video'):new Image();if(video){media.muted=true;media.playsInline=true;media.preload='auto';}
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('無法讀取素材。請確認檔案可正常播放或顯示。')),20000);media[video?'onloadeddata':'onload']=()=>{clearTimeout(timeout);resolve()};media.onerror=()=>{clearTimeout(timeout);reject(new Error('無法讀取這個檔案。'))};media.src=url;});
  width=video?media.videoWidth:media.naturalWidth;height=video?media.videoHeight:media.naturalHeight;if(!width||!height||width>30000||height>30000)throw new Error('素材尺寸不正確。');
  const scale=Math.min(1,900/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.getContext('2d').drawImage(media,0,0,canvas.width,canvas.height);
  const thumbnailBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.88));if(!thumbnailBlob)throw new Error('封面圖建立失敗。');
  const original=await upload(file),thumbnail=await upload(thumbnailBlob),isGif=file.type==='image/gif';
  const still=isGif?await upload(await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))):undefined;
  return {mediaType:video?'video':'image',image:video?thumbnail:original,thumbnail,video:video?original:undefined,still,width,height,thumbWidth:canvas.width,thumbHeight:canvas.height};
 }finally{URL.revokeObjectURL(url);if(video){media?.removeAttribute('src');media?.load();}}
}finally{gitConnection.busy(false);}
}
function showWork(p,isNew=false){editing=clone(p);editingNew=isNew;$('#work-dialog-title').textContent=isNew?'新增作品':'編輯作品';const form=$('#work-form');form.elements.title.value=editing.title;form.elements.description.value=editing.description;form.elements.link.value=editing.link||'';form.elements.category.innerHTML=categoryOptions(editing.category);$('#delete-work').hidden=isNew;$('#work-upload-status').textContent='';renderWorkImage();$('#work-dialog').showModal();}
function renderWorkImage(){$('#work-image-preview').innerHTML=editing.mediaType==='video'?`<video controls playsinline src="${asset(editing.video)}" poster="${asset(editing.thumbnail)}"></video>`:`<img src="${asset(editing.thumbnail)}" alt="作品預覽">`;}
function closeWork(){if(uploadBusy){toast('檔案正在處理，請稍候。');return;}$('#work-dialog').close();editing=null;}
async function removeWork(id){const p=model.items.find(p=>p.id===id);if(!p||!await confirmAction(`刪除「${p.title}」？\n作品會從輪播、精選與索引移除。發布後才會更新公開內容。`,'確認刪除'))return;model.items=model.items.filter(p=>p.id!==id);for(const e of model.selected)if(e.workId===id)e.workId=model.items.find(p=>p.category===e.categoryId)?.id||'';for(const e of model.index.categories){if(e.workIds!==null)e.workIds=e.workIds.filter(workId=>workId!==id);e.workOrder=(e.workOrder||[]).filter(workId=>workId!==id);}closeWork();changed();render();toast('作品已移除。');}
async function editFile(file,cover=false){
 if(!file||!editing)return;if(!readyForUpload())return;uploadBusy=true;$('#apply-work').disabled=true;$('#work-upload-status').textContent='正在處理素材與封面圖…';
 try{const value=await artwork(file);if(cover){editing.thumbnail=value.thumbnail;editing.thumbWidth=value.thumbWidth;editing.thumbHeight=value.thumbHeight;if(editing.mediaType==='video')editing.image=value.thumbnail;}else{delete editing.video;delete editing.still;Object.assign(editing,value);}renderWorkImage();$('#work-upload-status').textContent='檔案已準備好，按「套用作品」加入內容。';}catch(error){$('#work-upload-status').textContent=error.message;}finally{uploadBusy=false;$('#apply-work').disabled=false;}
}
document.addEventListener('input',event=>{
 const el=event.target;if(el.id==='work-search'){search=el.value;renderWorkGrid();return;}
 if(!el.dataset.path)return;const path=el.dataset.path;if(el.type==='checkbox')return;
 let value=el.dataset.numeric?Number(el.value):el.value;if(el.dataset.numeric&&(value<8&&path.endsWith('.size')||!Number.isFinite(value)))return;
 set(path,value);
 if(path.endsWith('.color')||path==='sections.hero.frameColor')$$('[data-path]').filter(other=>other!==el&&other.dataset.path===path).forEach(other=>{if(other.type!=='color'||/^#[\da-f]{6}$/i.test(value))other.value=value});
 if(/^aboutBlocks\.\d+\.body\.text$/.test(path)){const index=Number(path.split('.')[1]),block=model.aboutBlocks[index];if(block.type==='email'){block.link='mailto:'+value;const link=$(`[data-path="aboutBlocks.${index}.link"]`);if(link)link.value=block.link;}}
 changed();
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='work-filter'){workFilter=el.value;renderWorkGrid();return;}
 if(el.dataset.path&&(el.type==='checkbox'||el.tagName==='SELECT')){set(el.dataset.path,el.type==='checkbox'?el.checked:el.dataset.numeric?Number(el.value):el.value);changed();if(el.dataset.path==='index.showCaptions'||/^selected\.\d+\.workId$/.test(el.dataset.path))render();}
 if(el.dataset.action==='index-source'){const entry=model.index.categories[Number(el.dataset.index)];entry.workIds=el.value==='all'?null:model.items.filter(p=>p.category===entry.categoryId).map(p=>p.id);changed();render();}
 if(el.dataset.action==='index-work'){const entry=model.index.categories[Number(el.dataset.index)];entry.workIds=entry.workIds.filter(id=>id!==el.dataset.id);if(el.checked)entry.workIds.push(el.dataset.id);changed();}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.view){navigate(button.dataset.view);return;}
 const action=button.dataset.action;
 try{
  if(action==='new-work'){if(!readyForUpload())return;$('#new-work-file').click();}
  if(action==='edit-work')showWork(model.items.find(p=>p.id===button.dataset.id));
  if(action==='close-work')closeWork();
  if(action==='section-tab'){sectionTab=button.dataset.key;previewAnchor=sectionTab==='hero'?'top':sectionTab;render();schedulePreview(0);}
  if(action==='go-categories')navigate('categories');
  if(action==='edit-index-order')showIndexOrder(button.dataset.category);
  if(action==='close-index-order'){$('#index-order-dialog').close();indexOrdering=null;}
  if(action==='move'){const array=get(button.dataset.pathArray),index=Number(button.dataset.index),next=index+Number(button.dataset.direction);[array[index],array[next]]=[array[next],array[index]];changed();render();}
  if(action==='remove-row'){get(button.dataset.pathArray).splice(Number(button.dataset.index),1);changed();render();}
  if(action==='add-category-row'){const categoryId=$('#add-category-choice').value,target=button.dataset.target;get(target).push(target==='selected'?{id:uid('selection'),categoryId,workId:model.items.find(p=>p.category===categoryId)?.id||'',layout:'feature-wide',styles:defaultStyles(),overrides:{title:'',description:'',category:''}}:{id:uid('index'),categoryId,enabled:true,workIds:null,workOrder:[],filter:typeStyle(16,'#68645F',400),styles:defaultStyles()});changed();render();}
  if(action==='add-about'){model.aboutBlocks.push({id:uid('about'),type:button.dataset.type,label:text('',11,'#AAA39C',600),body:text('',button.dataset.type==='email'?28:17,'#FFFFFF',400),link:''});changed();render();}
  if(action==='upload-logo'){if(!readyForUpload())return;$('#logo-file').click();}
  if(action==='remove-logo'){model.header.logo.image='';changed();render();}
  if(action==='add-menu'){model.header.menu.push({id:uid('menu'),text:'',target:'index',size:13,color:'#171717',weight:600});changed();render();}
  if(action==='delete-category'){
    const cat=model.categories.find(c=>c.id===button.dataset.id),works=model.items.filter(p=>p.category===cat.id);if(works.length){toast(`「${cat.name}」有 ${works.length} 件作品，請先將作品移到其他分類，再刪除此分類。`);return;}
    if(!await confirmAction(`刪除「${cat.name}」分類及其精選／索引區塊？`,'確認刪除'))return;
    model.categories=model.categories.filter(c=>c.id!==cat.id);model.selected=model.selected.filter(e=>e.categoryId!==cat.id);model.index.categories=model.index.categories.filter(e=>e.categoryId!==cat.id);model.header.menu=model.header.menu.filter(m=>m.target!=='category:'+cat.id);changed();render();
  }
 }catch(error){toast(error.message)}
});
document.addEventListener('submit',event=>{
 if(event.target.id==='index-order-form'){
  event.preventDefault();if(!indexOrdering)return;
  const entry=model.index.categories.find(e=>e.categoryId===indexOrdering.categoryId);if(!entry)return;
  const ranks=$$('#index-order-list [data-order-id]').map((input,i)=>({id:input.dataset.orderId,rank:Number(input.value),position:i}));
  if(ranks.some(r=>!Number.isInteger(r.rank)||r.rank<1||r.rank>10000)){$('#index-order-error').textContent='請填寫 1 到 10000 的整數編號。';return;}
  const seen=new Map();for(const row of ranks){if(seen.has(row.rank)){const titles=[seen.get(row.rank),row.id].map(id=>model.items.find(p=>p.id===id)?.title);$('#index-order-error').textContent=`編號 ${row.rank} 重複：「${titles[0]}」與「${titles[1]}」。請使用不同編號後再套用。`;return;}seen.set(row.rank,row.id);}
  const ordered=ranks.sort((a,b)=>a.rank-b.rank).map(r=>r.id),included=new Set(ordered);
  entry.workOrder=[...ordered,...indexOrdering.allIds.filter(id=>!included.has(id))];
  $('#index-order-dialog').close();indexOrdering=null;changed();render();toast('作品順序已套用，儲存草稿後會保留。');return;
 }
 if(event.target.id==='category-form'){event.preventDefault();const form=event.target,id=uid('cat'),name=form.elements.name.value.trim();if(!name)return;if(model.categories.some(c=>c.name===name)){toast('這個分類名稱已存在。');return;}model.categories.push({id,name,english:form.elements.english.value.trim()});model.index.categories.push({id:uid('index'),categoryId:id,enabled:true,workIds:null,workOrder:[],filter:typeStyle(16,'#68645F',400),styles:defaultStyles()});changed();render();toast('分類已新增；作品索引會自動加入，精選區可自行加入。');}
});
$('#work-form').addEventListener('submit',event=>{
 event.preventDefault();if(uploadBusy||!editing)return;const form=event.target;editing.title=form.elements.title.value.trim();editing.category=form.elements.category.value;editing.description=form.elements.description.value;editing.link=form.elements.link.value.trim();if(!editing.title||!editing.category){toast('請填寫標題與分類。');return;}editing.categoryName=categoryName(editing.category);
 if(editingNew)model.items.unshift(editing);else model.items[model.items.findIndex(p=>p.id===editing.id)]=editing;
 for(const row of model.selected)if(row.workId===editing.id&&row.categoryId!==editing.category)row.workId=model.items.find(p=>p.category===row.categoryId)?.id||'';
 for(const row of model.index.categories){if(row.workIds!==null)row.workIds=row.workIds.filter(id=>model.items.some(p=>p.id===id&&p.category===row.categoryId));row.workOrder=(row.workOrder||[]).filter(id=>model.items.some(p=>p.id===id&&p.category===row.categoryId));}
 closeWork();changed();render();toast('作品已套用，儲存草稿後會保留。');
});
$('#delete-work').addEventListener('click',()=>editing&&removeWork(editing.id));
$('#work-dialog').addEventListener('cancel',event=>{if(uploadBusy)event.preventDefault();else editing=null;});
$('#index-order-dialog').addEventListener('cancel',()=>{indexOrdering=null;});
$('#work-media').addEventListener('change',event=>{editFile(event.target.files[0]);event.target.value='';});
$('#work-cover').addEventListener('change',event=>{editFile(event.target.files[0],true);event.target.value='';});
$('#new-work-file').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;if(!model.categories.length){toast('請先新增一個作品分類。');return;}uploadBusy=true;$('#view-actions').classList.add('loading');toast('正在上傳作品並建立封面圖…');
 try{const value=await artwork(file);showWork({id:uid('work'),title:file.name.replace(/\.[^.]+$/,''),description:'',category:workFilter==='all'?model.categories[0].id:workFilter,categoryName:'',link:'',...value},true);}catch(error){toast(error.message)}finally{uploadBusy=false;$('#view-actions').classList.remove('loading');}
});
$('#logo-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;uploadBusy=true;try{const value=await artwork(file);model.header.logo.image=value.image;changed();render();toast('Logo 已套用。');}catch(error){toast(error.message)}finally{uploadBusy=false;}});
$('#logout').addEventListener('click',async()=>{if(uploadBusy){toast('檔案正在處理，請稍候再登出。');return;}if(dirty&&!await confirmAction('登出前仍有尚未儲存的變更，確定要登出？','登出'))return;try{await logout();}catch(error){toast(error.message);}});
$('#save').addEventListener('click',()=>save().catch(error=>toast(error.message)));
$('#discard').addEventListener('click',async()=>{if(!await confirmAction('放棄目前尚未儲存的變更，回到已儲存的網站內容？','放棄變更'))return;try{model=await(await request('/api/state')).json();dirty=false;generation++;try{sessionStorage.removeItem(draftKey)}catch{}render();schedulePreview(0);toast('已回到儲存的草稿。');}catch(error){toast(error.message)}});
$('#export').addEventListener('click',()=>download('export'));$('#backup').addEventListener('click',()=>download('backup'));
$('#preview-refresh').addEventListener('click',updatePreview);
function showPreview(){ $('#preview-toggle').setAttribute('aria-pressed',String(previewVisible));$('.admin-shell').classList.toggle('no-preview',!previewVisible);$('.admin-shell').classList.toggle('show-mobile-preview',previewVisible&&innerWidth<900);fitPreview();}
$('#preview-toggle').addEventListener('click',()=>{previewTouched=true;previewVisible=!previewVisible;showPreview();});
$$('[data-device]').forEach(button=>button.addEventListener('click',()=>{device=button.dataset.device;$$('[data-device]').forEach(b=>b.classList.toggle('active',b===button));$('#preview-panel').classList.toggle('mobile',device==='mobile');fitPreview();}));
$('#restore').addEventListener('click',()=>$('#restore-file').click());
$('#restore-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file||!await confirmAction('還原這份資料備份？目前的作品與設定會被備份內容取代。','確認還原'))return;try{const response=await request('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:file});model=await response.json();dirty=false;try{sessionStorage.removeItem(draftKey)}catch{}generation++;render();schedulePreview(0);toast('資料備份已還原。');}catch(error){toast(error.message)}});
new ResizeObserver(fitPreview).observe($('.preview-viewport'));window.addEventListener('resize',()=>{if(!previewTouched)previewVisible=innerWidth>=900;showPreview();});showPreview();
new ResizeObserver(()=>document.documentElement.style.setProperty('--admin-header-height',$('.admin-top').offsetHeight+'px')).observe($('.admin-top'));
try{model=await(await request('/api/state')).json();try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(draft?.revision===model.revision&&draft.version===model.version){model=draft;dirty=true;toast('已恢復尚未儲存的草稿。')}}catch{}render();fitPreview();$('#site-preview').addEventListener('load',fitPreview);schedulePreview(0);}catch(error){$('#view').innerHTML=`<section class="panel"><h2>無法載入後台</h2><p class="muted">${esc(error.message)}</p><button type="button" class="button" onclick="location.reload()">重新載入</button></section>`;}
