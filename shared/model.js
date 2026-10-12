const ink='#171717',rose='#B95756',muted='#68645F';
export const text=(value,size,color=ink,weight=500)=>({text:value,size,color,weight});
export const typeStyle=(size,color=ink,weight=500)=>({size,color,weight});
export const defaultStyles=()=>({category:typeStyle(11,rose,600),title:typeStyle(36,ink,500),description:typeStyle(16,muted,400)});
export function createModel(manifest){
 const categories=[['1','活動BN','Campaign'],['2','社群圖文','Social'],['6','印刷品','Print'],['4','EDM','EDM'],['5','網頁','Web'],['7','遊戲','Game']].map(([id,name,english])=>({id,name,english}));
 const sections={
  hero:{title:text('Visual,',162,ink,600),accent:text('in focus.',164,rose,400),kicker:text('VISUAL DESIGN PORTFOLIO',11,ink,600),subtitle:text('A COLLECTION OF DESIGN',11,ink,600),body:text('用設計傳遞價值，\n讓視覺說好每個故事。',16,ink,400),frameColor:ink},
  selected:{title:text('Selected',96),accent:text('works.',96,rose,400),kicker:text('THE SELECTION',11,ink,600),subtitle:text('不同媒介，同樣專注。\n從畫面到細節。',12,muted,400),body:text('',16,muted,400)},
  index:{title:text('Work',96),accent:text('index.',96,rose,400),kicker:text('THE COMPLETE COLLECTION',11,ink,600),subtitle:text('直接觀看作品，\n依類別探索設計。',12,muted,400),body:text('',16,muted,400)},
  about:{title:text('HUANG\nCI TING',90,'#FFFFFF',600),accent:text('.',90,rose,600),kicker:text('ABOUT',11,'#AAA39C',600),subtitle:text('VISUAL DESIGNER',11,'#AAA39C',600),body:text('',17,'#FFFFFF',400)}
 };
 return {version:1,revision:0,items:manifest.items.map(p=>({...p,mediaType:'image'})),categories,sections,
  header:{logo:{image:'',text:'hCt',size:36,color:ink,weight:800},copy:text('HUANG CI TING\nVISUAL DESIGNER',10,ink,400),menu:[['highlights','Highlights','selected'],['index','Index','index'],['about','About','about']].map(([id,label,target])=>({id,text:label,target,size:13,color:ink,weight:600}))},
  selected:[['1','373','feature-wide'],['2','340','feature-left'],['6','432','feature-right'],['4','392','feature-left'],['5','399','feature-wide'],['7','409','feature-right']].map(([categoryId,workId,layout])=>({id:'selection-'+categoryId,categoryId,workId,layout,styles:defaultStyles(),overrides:{title:'',description:'',category:''}})),
  index:{showCaptions:false,categories:categories.map(c=>({id:'index-'+c.id,categoryId:c.id,enabled:true,workIds:null,workOrder:[],filter:typeStyle(16,muted,400),styles:defaultStyles()}))},
  aboutBlocks:[{id:'contact-email',type:'email',label:text('EMAIL',11,'#AAA39C',600),body:text('hcitingworkonly@gmail.com',28,'#FFFFFF',400),link:'mailto:hcitingworkonly@gmail.com'}]
 };
}
export const clone=value=>JSON.parse(JSON.stringify(value));
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const lines=value=>esc(value).replace(/\n/g,'<br>');
export const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
export function style(s,base=1500){return `font-size:${s.size<=20?s.size+'px':`clamp(${Math.max(12,s.size*(s.size<=40?.66:.55))}px,${s.size/base*100}vw,${s.size}px)`};color:${s.color};font-weight:${s.weight}`;}
export function validate(input){
 const model=clone(input);
 function fail(message){throw new Error(message)}
 if(model.version!==1||!Array.isArray(model.items)||!Array.isArray(model.categories)||!model.sections||!model.header||!Array.isArray(model.selected)||!model.index||!Array.isArray(model.aboutBlocks))fail('網站資料格式不正確。');
 if(model.items.length>1000||model.categories.length>50||model.selected.length>50||model.aboutBlocks.length>50)fail('資料數量超出可編輯範圍。');
 const ids=new Set(),cats=new Set();
 function id(value,set){if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(value)||set.has(value))fail('識別碼重複或格式不正確。');set.add(value)}
 function content(value,max=20000){if(typeof value!=='string'||value.length>max)fail('文字內容過長或格式不正確。')}
 function shape(s){if(!s||!Number.isFinite(s.size)||s.size<8||s.size>220||!/^#[0-9a-f]{6}$/i.test(s.color)||!Number.isInteger(s.weight)||s.weight<100||s.weight>900)fail('文字大小、顏色或粗細設定不正確。')}
 function block(s){shape(s);content(s.text)}
 function asset(value,empty=false){if(empty&&value==='')return;if(typeof value!=='string'||!/^assets\/[a-zA-Z0-9_./-]+$/.test(value)||value.split('/').includes('..'))fail('素材路徑不正確。')}
 function link(value){if(value===''||/^(https?:\/\/|mailto:)/i.test(value)){if(/[<>"\u0000-\u001f]/.test(value))fail('連結格式不正確。');return;}fail('連結請使用 https://、http:// 或 mailto:。')}
 for(const c of model.categories){id(c.id,cats);content(c.name,100);content(c.english,100);if(!c.name.trim())fail('分類名稱不能空白。')}
 for(const p of model.items){id(p.id,ids);if(!cats.has(p.category))fail('作品的分類不存在。');content(p.title,300);if(!p.title.trim())fail('作品標題不能空白。');content(p.description);link(p.link||'');asset(p.image);asset(p.thumbnail);if(p.mediaType==='video')asset(p.video);else if(p.mediaType!=='image')fail('作品格式不正確。');if(p.still)asset(p.still);for(const k of ['width','height','thumbWidth','thumbHeight'])if(!Number.isInteger(p[k])||p[k]<1||p[k]>30000)fail('圖片尺寸不正確。');p.categoryName=model.categories.find(c=>c.id===p.category).name}
 for(const key of ['hero','selected','index','about']){const section=model.sections[key];if(!section)fail('缺少頁面區塊。');for(const field of ['title','accent','kicker','subtitle','body'])block(section[field])}
 if(!/^#[0-9a-f]{6}$/i.test(model.sections.hero.frameColor))fail('電視框線色彩不正確。');
 shape(model.header.logo);content(model.header.logo.text,100);asset(model.header.logo.image,true);block(model.header.copy);
 if(!Array.isArray(model.header.menu)||model.header.menu.length>20)fail('選單資料不正確。');
 const menus=new Set();for(const m of model.header.menu){id(m.id,menus);content(m.text,100);shape(m);if(!['top','selected','index','about',...model.categories.map(c=>'category:'+c.id)].includes(m.target))fail('選單目的區塊不存在。')}
 const selections=new Set();for(const e of model.selected){id(e.id,selections);if(!cats.has(e.categoryId)||!['feature-wide','feature-left','feature-right'].includes(e.layout))fail('精選分類區塊不正確。');if(e.workId&&!model.items.some(p=>p.id===e.workId&&p.category===e.categoryId))fail('精選作品與分類不一致。');for(const field of ['category','title','description']){shape(e.styles[field]);content(e.overrides[field])}}
 if(!Array.isArray(model.index.categories))fail('索引分類資料不正確。');const indexes=new Set();for(const e of model.index.categories){id(e.categoryId,indexes);if(!cats.has(e.categoryId))fail('索引分類不存在。');shape(e.filter);for(const field of ['category','title','description'])shape(e.styles[field]);if(e.workIds!==null&&(!Array.isArray(e.workIds)||e.workIds.some(id=>!model.items.some(p=>p.id===id&&p.category===e.categoryId))))fail('索引作品與分類不一致。');if(e.workOrder===undefined)e.workOrder=[];if(!Array.isArray(e.workOrder)||new Set(e.workOrder).size!==e.workOrder.length||e.workOrder.some(id=>!model.items.some(p=>p.id===id&&p.category===e.categoryId)))fail('作品排序資料與分類不一致。')}
 const blocks=new Set();for(const b of model.aboutBlocks){id(b.id,blocks);if(!['email','text'].includes(b.type))fail('ABOUT 文案格式不正確。');block(b.label);block(b.body);link(b.link||'')}
 if(!Number.isSafeInteger(model.revision)||model.revision<0)model.revision=0;
 return model;
}
export function clientConfig(model){return {categories:model.categories,selected:model.selected,index:model.index};}
