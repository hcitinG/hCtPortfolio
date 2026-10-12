'use strict';
const siteRoot=new URL(document.documentElement.dataset.siteRoot||'./',location.href);
const previewDraft=document.documentElement.dataset.previewDraft||'';
const projectHref=id=>{const target=new URL(previewDraft?'preview.html':'work.html',siteRoot);target.searchParams.set('id',id);if(previewDraft)target.searchParams.set('draft',previewDraft);return target.href;};
const mediaHref=value=>/^https?:\/\//i.test(value)?value:new URL(value,siteRoot).href;
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
const small=window.matchMedia('(max-width: 699px)');
function stored(key){try{return JSON.parse(sessionStorage.getItem(previewDraft?'hct-preview-'+previewDraft+'-'+key:key)||'null')}catch{return null}}
function storeState(key,value){try{sessionStorage.setItem(previewDraft?'hct-preview-'+previewDraft+'-'+key:key,JSON.stringify(value))}catch{}}
const wantsReturn=stored('hct-restore-home')===true;
const savedReturn=wantsReturn?stored('hct-return'):null;
try{sessionStorage.removeItem(previewDraft?'hct-preview-'+previewDraft+'-hct-restore-home':'hct-restore-home')}catch{}
// A returning page reserves stable geometry instead of replaying its reveal offsets.
if(savedReturn)document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-visible'));
let observer;
function setupReveal(){
  if(motion.matches||!('IntersectionObserver'in window)){observer?.disconnect();document.documentElement.classList.remove('motion-ready');return;}
  document.documentElement.classList.add('motion-ready');
  observer?.disconnect();
  observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.06});
  document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
}
setupReveal();
const layers=[...document.querySelectorAll('[data-depth]')].map(el=>({el,current:null}));
const scenes=[...document.querySelectorAll('.feature')];
const focusPlanes=[...document.querySelectorAll('[data-focus]')].map(el=>({el,current:null}));
function sizeScenes(){
  scenes.forEach(scene=>{
    const media=scene.querySelector('.feature-media'),copy=scene.querySelector('.feature-copy');
    const usable=!small.matches&&!motion.matches;
    scene.classList.toggle('depth-scene',usable);
    if(!usable){scene.style.removeProperty('--scene-height');return;}
    const pin=Math.max(110,Math.min(180,(innerHeight-media.offsetHeight)/2));
    // A short hold replaces the previous empty inter-project spacing.
    const dwell=innerWidth<1100?220:280;
    scene.style.setProperty('--pin-top',pin+'px');
    scene.style.setProperty('--scene-height',Math.max(media.offsetHeight,copy.offsetHeight+100)+dwell+'px');
  });
}
if(scenes.length){
  sizeScenes();
  if('ResizeObserver'in window){const sceneResize=new ResizeObserver(()=>{sizeScenes();queueDepth()});scenes.forEach(scene=>{sceneResize.observe(scene.querySelector('.feature-media'));sceneResize.observe(scene.querySelector('.feature-copy'))});}
  document.fonts?.ready.then(()=>{sizeScenes();queueDepth()});
}
let ticking=false;
function paintDepth(){
  ticking=false;
  if(motion.matches){layers.forEach(layer=>{layer.el.style.removeProperty('transform');layer.current=null});focusPlanes.forEach(plane=>{plane.el.style.removeProperty('scale');plane.current=null});return;}
  const h=window.innerHeight,scale=small.matches?.3:window.innerWidth<1100?.7:1,max=small.matches?28:window.innerWidth<1100?110:180;
  let moving=false;
  layers.forEach(layer=>{
    const parent=layer.el.parentElement.getBoundingClientRect();if(parent.bottom< -220||parent.top>h+220)return;
    const progress=Math.max(-1,Math.min(1,(h/2-(parent.top+parent.height/2))/(h*.85)));
    const target=Math.max(-max,Math.min(max,progress*Number(layer.el.dataset.depth)*scale));
    if(layer.current===null)layer.current=target;
    else layer.current+= (target-layer.current)*.18;
    if(Math.abs(target-layer.current)>.12)moving=true;else layer.current=target;
    layer.el.style.transform=`translate3d(0,${layer.current.toFixed(2)}px,0)`;
  });
  focusPlanes.forEach(plane=>{
    const scene=plane.el.closest('.feature')||plane.el.closest('.hero-gallery');
    const rect=scene.getBoundingClientRect();if(rect.bottom< -220||rect.top>h+220)return;
    const progress=Math.max(0,Math.min(1,(h-rect.top)/(h+rect.height)));
    const strength=small.matches?.35:1;
    const target=plane.el.dataset.focus==='front'?1+(progress*.13)*strength:1-((1-progress)*.14)*strength;
    if(plane.current===null)plane.current=target;else plane.current+=(target-plane.current)*.18;
    if(Math.abs(target-plane.current)>.0002)moving=true;else plane.current=target;
    plane.el.style.scale=plane.current.toFixed(4);
  });
  if(moving)queueDepth();
}
function queueDepth(){if(!ticking){ticking=true;requestAnimationFrame(paintDepth)}}
if(layers.length){window.addEventListener('scroll',queueDepth,{passive:true});window.addEventListener('resize',()=>{sizeScenes();queueDepth()});queueDepth();}
motion.addEventListener('change',()=>{setupReveal();sizeScenes();queueDepth()});small.addEventListener('change',()=>{sizeScenes();queueDepth()});

function loadArtwork(p,base=''){
  return new Promise(resolve=>{
    const image=new Image(),timeout=setTimeout(()=>resolve(false),10000);
    image.onload=async()=>{clearTimeout(timeout);try{await image.decode?.()}catch{}resolve(true)};
    image.onerror=()=>{clearTimeout(timeout);resolve(false)};
    image.src=mediaHref(p.image.endsWith('.gif')&&motion.matches?(p.still||'assets/stills/'+p.id+'.png'):p.thumbnail);
  });
}
// Keep the previous content visible until the decoded replacement overlaps it.
async function transitionContent(container,render,{duration=680,travel=10,axis='Y',resize=true}={}){
  if(motion.matches||typeof container.animate!=='function'){render();return;}
  const before=container.offsetHeight,ghost=container.cloneNode(true);
  ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  ghost.classList.add('transition-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
  render();
  const after=container.offsetHeight,children=[...container.children];
  ghost.style.height=before+'px';container.append(ghost);
  const options={duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'};
  const animations=[ghost.animate([{opacity:1,transform:'translate'+axis+'(0)'},{opacity:0,transform:'translate'+axis+'('+(-travel)+'px)'}],options),...children.map(el=>el.animate([{opacity:0,transform:'translate'+axis+'('+travel+'px)'},{opacity:1,transform:'translate'+axis+'(0)'}],options))];
  if(resize&&Math.abs(after-before)>1)animations.push(container.animate([{height:before+'px'},{height:after+'px'}],options));
  const disable=()=>animations.forEach(animation=>animation.finish());motion.addEventListener('change',disable);
  try{await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})))}
  finally{ghost.remove();animations.forEach(animation=>animation.cancel());motion.removeEventListener('change',disable);sizeScenes();queueDepth()}
}
const data=document.getElementById('portfolio-data');
const editorConfig=JSON.parse(document.getElementById('portfolio-config')?.textContent||'null');
if(data){
  const items=JSON.parse(data.textContent),list=document.getElementById('work-list'),filters=[...document.querySelectorAll('[data-filter]')],more=document.getElementById('load-more'),count=document.getElementById('shown-count'),status=document.getElementById('results-status');
  const category=editorConfig?Object.fromEntries(editorConfig.categories.map(c=>[c.id,c.name])):{'1':'活動BN','2':'社群圖文','6':'印刷品','4':'EDM','5':'網頁','7':'遊戲'};
  const indexEntries=editorConfig?.index.categories.filter(c=>c.enabled);
  const order=indexEntries?indexEntries.map(c=>c.categoryId):['1','2','6','4','5','7'];
  const sorted=indexEntries?indexEntries.flatMap(entry=>{
    const ranks=new Map((entry.workOrder||[]).map((id,i)=>[id,i]));
    return items.filter(p=>p.category===entry.categoryId&&(entry.workIds===null||entry.workIds.includes(p.id))).sort((a,b)=>(ranks.get(a.id)??Number.MAX_SAFE_INTEGER)-(ranks.get(b.id)??Number.MAX_SAFE_INTEGER));
  }):[...items].sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category));
  function makeArtwork(p,eager=false){
    const image=document.createElement('img');image.src=p.thumbnail;image.alt='';image.width=p.thumbWidth;image.height=p.thumbHeight;image.loading=eager?'eager':'lazy';image.decoding='async';
    if(!p.image.endsWith('.gif'))return image;
    const picture=document.createElement('picture'),source=document.createElement('source');source.media='(prefers-reduced-motion: reduce)';source.srcset=p.still||`assets/stills/${p.id}.png`;picture.append(source,image);return picture;
  }
  let active='all',limit=12;
  const plusMarkup='<span class="plus-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14"/></svg></span>';
  let layoutQueued=false;
  function layoutGallery(){
    layoutQueued=false;const width=list.clientWidth;if(!width)return;
    const styles=getComputedStyle(list),columns=Number(styles.getPropertyValue('--gallery-columns'))||1,gap=Number.parseFloat(styles.getPropertyValue('--gallery-gap'))||20;
    const cardWidth=(width-gap*(columns-1))/columns,heights=Array(columns).fill(0);
    const cards=[...list.querySelectorAll('.work-card')];
    cards.forEach(card=>{
      const col=heights.indexOf(Math.min(...heights));
      card.style.width=`${cardWidth}px`;card.style.left=`${col*(cardWidth+gap)}px`;card.style.top=`${heights[col]}px`;
      // Preview dimensions reserve the exact space before a lazy image loads.
      const image=card.querySelector('img'),height=cardWidth*Number(image.getAttribute('height'))/Number(image.getAttribute('width'));
      heights[col]+=height+(card.querySelector('.editable-index-caption')?.offsetHeight||0)+gap;
    });
    list.style.height=cards.length?`${Math.max(...heights)-gap}px`:'auto';
    layoutQueued=false;
  }
  function queueGallery(){if(!layoutQueued){layoutQueued=true;requestAnimationFrame(layoutGallery)}}
  if('ResizeObserver'in window){const resizeGallery=new ResizeObserver(queueGallery);resizeGallery.observe(list)}
  window.addEventListener('resize',queueGallery);
  // Recover browsing position when returning from a project in the same tab.
  const indexState=savedReturn?.index||stored('hct-index');
  if(indexState&&filters.some(b=>b.dataset.filter===indexState.active)){active=indexState.active;limit=Math.max(12,Math.min(72,Number(indexState.limit)||12));}
  const requestedCategory=new URLSearchParams(location.search).get('category');
  if(requestedCategory&&filters.some(b=>b.dataset.filter===requestedCategory)){active=requestedCategory;limit=12;}
  function render(announce=true){
    const found=sorted.filter(p=>active==='all'||p.category===active);
    const shown=found.slice(0,limit);list.replaceChildren();
    shown.forEach(p=>{const card=document.createElement('a');card.className='work-card';card.href=projectHref(p.id);card.dataset.id=p.id;
      card.setAttribute('aria-label',`檢視 ${p.title} — ${category[p.category]}`);
      const art=document.createElement('div');art.className='work-card-image';art.append(makeArtwork(p));art.insertAdjacentHTML('beforeend',plusMarkup);card.append(art);
      if(editorConfig?.index.showCaptions){
        const caption=document.createElement('div');caption.className='editable-index-caption';
        const settings=indexEntries.find(c=>c.categoryId===p.category).styles;
        for(const [field,tag,value] of [['category','span',category[p.category]],['title','h3',p.title],['description','p',p.description]]){
          if(!value)continue;const text=document.createElement(tag),size=settings[field].size;text.textContent=value;Object.assign(text.style,{fontSize:size<=20?size+'px':`clamp(${size*.66}px,${size/1500*100}vw,${size}px)`,color:settings[field].color,fontWeight:String(settings[field].weight)});caption.append(text);
        }card.append(caption);
      }list.append(card)});
    if(!found.length){const empty=document.createElement('p');empty.className='empty-result';empty.textContent='這個分類目前沒有作品。';list.append(empty)}
    layoutGallery();
    filters.forEach(b=>{const selected=b.dataset.filter===active;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
    count.textContent=`SHOWING ${shown.length} / ${found.length} WORKS`;more.hidden=shown.length>=found.length;
    if(announce)status.textContent=`找到 ${found.length} 件作品，目前顯示 ${shown.length} 件。`;
    storeState('hct-index',{active,limit});
  }
  filters.forEach(b=>b.addEventListener('click',()=>{active=b.dataset.filter;limit=12;render()}));
  more.addEventListener('click',()=>{const oldLimit=limit;limit+=12;render();list.querySelectorAll('.work-card')[oldLimit]?.focus({preventScroll:true})});
  render(false);
  document.fonts?.ready.then(queueGallery);

  const gallery=document.querySelector('.hero-gallery');
  const frames=[...document.querySelectorAll('[data-carousel]')].map((el,index)=>({el,index,current:el.dataset.current,timer:null,effectTimer:null,grainTimer:null,effects:[],hovered:false,loading:false,version:0}));
  let inView=true,pageActive=true;
  const canPlay=f=>pageActive&&!motion.matches&&!document.hidden&&inView&&!f.hovered&&!f.el.contains(document.activeElement);
  const between=(min,max)=>min+Math.random()*(max-min);
  function stop(f){clearTimeout(f.timer);f.timer=null;}
  function clearSignal(f){
    f.effects.forEach(animation=>animation.cancel());f.effects=[];
    clearInterval(f.grainTimer);f.grainTimer=null;
    f.el.querySelector('.screen-picture').style.filter='';
    f.el.querySelectorAll('.screen-noise,.tracking-band').forEach(el=>el.style.opacity='0');
    f.el.removeAttribute('data-effect');
  }
  function stopSignal(f){clearTimeout(f.effectTimer);f.effectTimer=null;clearSignal(f);}
  async function disturb(f){
    if(!canPlay(f)||f.el.dataset.effect||typeof f.el.animate!=='function')return;
    const snowy=Math.random()<.58,amount=.65;
    const picture=f.el.querySelector('.screen-picture'),grain=f.el.querySelector('.screen-noise'),band=f.el.querySelector('.tracking-band'),seed=f.el.querySelector('feTurbulence');
    f.el.dataset.effect=snowy?'noise':'flicker';
    const options={duration:snowy?480:340,easing:'ease-out'};
    const effects=[picture.animate([{filter:'brightness(1)'},{filter:`brightness(${1-amount*(snowy?.18:.35)})`,offset:.32},{filter:'brightness(.97)',offset:.7},{filter:'brightness(1)'}],options)];
    if(snowy){
      const renew=()=>seed.setAttribute('seed',String(Math.floor(Math.random()*999)));
      renew();f.grainTimer=setInterval(renew,90);
      effects.push(grain.animate([{opacity:0},{opacity:amount*.5,offset:.22},{opacity:amount*.2,offset:.58},{opacity:0}],options));
      band.setAttribute('y',String(between(10,82)));
      effects.push(band.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:amount*.22,transform:'translateY(0px)',offset:.3},{opacity:0,transform:'translateY(25px)'}],options));
    }
    f.effects=effects;
    await Promise.all(effects.map(animation=>animation.finished.catch(()=>{})));
    if(f.effects===effects)clearSignal(f);
  }
  function scheduleSignal(f,first=false){
    clearTimeout(f.effectTimer);f.effectTimer=null;if(!canPlay(f))return;
    f.effectTimer=setTimeout(()=>{f.effectTimer=null;disturb(f);scheduleSignal(f)},first?1200+f.index*1700:between(4200,8400));
  }
  function schedule(f,first=false){
    stop(f);if(canPlay(f)&&!f.loading)f.timer=setTimeout(()=>{f.timer=null;advance(f)},first?3700+f.index*2400:between(f.index?7600:5600,f.index?10400:7600));
  }
  function sync(){
    frames.forEach(f=>{
      if(!canPlay(f)){stop(f);stopSignal(f);f.version++;f.fade?.cancel();}
      else{if(!f.timer)schedule(f,true);if(!f.effectTimer)scheduleSignal(f,true);}
    });
  }
  const preload=p=>loadArtwork(p);
  const selectionStatus=document.getElementById('selection-status');
  function setFeatureArtwork(feature,p){
    const art=makeArtwork(p,true);(art.matches('img')?art:art.querySelector('img')).alt=p.title;
    feature.querySelector('.art-depth').replaceChildren(art);
  }
  function setFeatureCopy(feature,p){
    const settings=editorConfig?.selected.find(e=>e.id===feature.dataset.selection),name=settings?.overrides.title||p.title;
    const title=feature.querySelector('h3'),split=name.indexOf('-');title.replaceChildren();
    if(split<0)title.textContent=name;
    else title.append(document.createTextNode(name.slice(0,split)),document.createElement('br'),document.createTextNode(name.slice(split+1)));
    const description=feature.querySelector('.feature-description'),body=settings?.overrides.description||p.description;description.textContent=body;description.hidden=!body;
    feature.querySelector('.feature-copy>.eyebrow').textContent=settings?.overrides.category||category[p.category];
    feature.querySelector('.feature-view').href=projectHref(p.id);feature.dataset.current=p.id;
  }
  function setFeature(feature,p){setFeatureArtwork(feature,p);setFeatureCopy(feature,p)}
  if(savedReturn?.features){document.querySelectorAll('.feature[data-category]').forEach(feature=>{
    const p=items.find(p=>p.id===savedReturn.features[feature.dataset.category]&&p.category===feature.dataset.category);if(p)setFeature(feature,p);
  });}
  document.querySelectorAll('.feature[data-category]').forEach(feature=>{
    const button=feature.querySelector('.feature-refresh');
    button.addEventListener('click',async()=>{
      if(button.disabled)return;
      const candidates=items.filter(p=>p.category===feature.dataset.category&&p.id!==feature.dataset.current);
      const p=candidates[Math.floor(Math.random()*candidates.length)];if(!p)return;
      button.disabled=true;feature.setAttribute('aria-busy','true');
      try{
        if(!await preload(p)){selectionStatus.textContent='圖片暫時無法載入，請再試一次。';return;}
        await Promise.all([transitionContent(feature.querySelector('.art-depth'),()=>setFeatureArtwork(feature,p)),transitionContent(feature.querySelector('.feature-copy'),()=>setFeatureCopy(feature,p),{duration:560,travel:8})]);
        selectionStatus.textContent=`${category[p.category]}已更換為：${p.title}`;queueDepth();
      }finally{button.disabled=false;feature.removeAttribute('aria-busy');feature.classList.remove('is-changing')}
    });
  });
  async function advance(f,manual=false,initial=false){
    if(f.loading||(!manual&&!canPlay(f)))return;
    stop(f);const other=frames.filter(x=>x!==f).flatMap(x=>[x.current,x.pending]);const candidates=items.filter(p=>p.id!==f.current&&!other.includes(p.id));const p=candidates[Math.floor(Math.random()*candidates.length)];
    if(!p)return;
    const version=++f.version;f.loading=true;f.pending=p.id;
    try{
      if(!await preload(p)||version!==f.version)return;
      if(version!==f.version)return;
      const picture=f.el.querySelector('.screen-picture'),replacement=makeArtwork(p,true);
      if(!initial&&!motion.matches&&typeof picture.animate==='function'){
        replacement.classList.add('incoming-art');picture.append(replacement);
        const fade=replacement.animate([{opacity:0},{opacity:1}],{duration:850,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});f.fade=fade;
        try{
          await fade.finished.catch(()=>{});
          if(version!==f.version)return;
          picture.replaceChildren(replacement);replacement.classList.remove('incoming-art');
        }finally{fade.cancel();f.fade=null;if(version!==f.version)replacement.remove();}
      }else picture.replaceChildren(replacement);
      const link=f.el.querySelector('.hero-frame-link');link.href=projectHref(p.id);link.setAttribute('aria-label',`檢視 ${p.title}`);f.current=p.id;f.el.dataset.current=p.id;
    }finally{f.el.classList.remove('is-changing');f.loading=false;f.pending=null;schedule(f,initial)}
  }
  frames.forEach(f=>{
    f.el.addEventListener('mouseenter',()=>{f.hovered=true;sync()});f.el.addEventListener('mouseleave',()=>{f.hovered=false;sync()});
    f.el.addEventListener('focusin',sync);f.el.addEventListener('focusout',()=>requestAnimationFrame(sync));
  });
  if(gallery){
    document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
    window.addEventListener('pagehide',()=>{pageActive=false;sync()});window.addEventListener('pageshow',()=>{pageActive=true;sync()});
    if('IntersectionObserver'in window){const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:.05});visibility.observe(gallery);}
    // Randomize both frames at entry, then rotate each on its own cadence.
    sync();frames.forEach(f=>advance(f,true,true));
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link||!['work.html',...(previewDraft?['preview.html']:[])].some(name=>new URL(link.href).pathname===new URL(name,siteRoot).pathname))return;
    const feature=link.closest('.feature'),card=link.closest('.work-card'),hero=link.closest('.hero-frame');
    const anchor=feature?`.feature[data-category="${feature.dataset.category}"]`:card?`.work-card[data-id="${card.dataset.id}"]`:'.hero';
    const target=feature||card||document.querySelector('.hero');
    const url=new URL(location.href);url.hash=feature?'selected':card?'index':'top';
    const features=Object.fromEntries([...document.querySelectorAll('.feature[data-category]')].map(e=>[e.dataset.category,e.dataset.current]));
    storeState('hct-return',{url:url.href,anchor,offset:target.getBoundingClientRect().top,y:window.scrollY,index:{active,limit},features});
  });
  if(savedReturn){
    const restorePosition=()=>{
      layoutGallery();const anchor=document.querySelector(savedReturn.anchor);
      const top=anchor?window.scrollY+anchor.getBoundingClientRect().top-Number(savedReturn.offset||0):Number(savedReturn.y||0);
      window.scrollTo({top:Math.max(0,top),behavior:'instant'});
      const focus=anchor?.matches('.work-card')?anchor:anchor?.querySelector('.feature-view');focus?.focus({preventScroll:true});queueDepth();
    };
    const ready=()=>Promise.resolve(document.fonts?.ready).then(()=>requestAnimationFrame(()=>requestAnimationFrame(restorePosition)));
    if(document.readyState==='complete')ready();else window.addEventListener('load',ready,{once:true});
  }
}
const backLink=document.querySelector('.back-link');
if(backLink){
  const context=stored('hct-return');
  try{const url=new URL(context?.url),root=siteRoot;
    if(url.origin===root.origin&&(url.pathname===root.pathname||url.pathname===`${root.pathname}index.html`||(previewDraft&&url.pathname===`${root.pathname}preview.html`))){
      backLink.href=url.href;backLink.setAttribute('aria-label','返回原本的作品瀏覽位置');
      backLink.addEventListener('click',()=>storeState('hct-restore-home',true));
    }
  }catch{}
}
const relatedData=document.getElementById('related-data');
if(relatedData&&document.querySelector('.related-grid')){
  const peers=JSON.parse(relatedData.textContent),grid=document.querySelector('.related-grid'),previous=document.querySelector('.related-previous'),next=document.querySelector('.related-next'),status=document.getElementById('related-status');
  let start=0,changing=false;
  async function rotate(direction){
    if(changing||!peers.length)return;changing=true;previous.disabled=true;next.disabled=true;grid.setAttribute('aria-busy','true');
    const nextStart=(start+direction+peers.length)%peers.length,shown=Array.from({length:Math.min(3,peers.length)},(_,i)=>peers[(nextStart+i)%peers.length]);
    try{
      const loaded=await Promise.all(shown.map(p=>loadArtwork(p,'../../')));
      if(loaded.some(ok=>!ok)){status.textContent='圖片暫時無法載入，請再試一次。';return;}
      await transitionContent(grid,()=>{
        grid.replaceChildren();start=nextStart;
        for(const p of shown){
          const link=document.createElement('a'),frame=document.createElement('div'),image=document.createElement('img');
          link.className='related-card';link.href=projectHref(p.id);link.setAttribute('aria-label',`檢視 ${p.title}`);
          image.src=mediaHref(p.thumbnail);image.alt='';image.width=p.thumbWidth;image.height=p.thumbHeight;image.decoding='async';
          if(p.image.endsWith('.gif')){const picture=document.createElement('picture'),source=document.createElement('source');source.media='(prefers-reduced-motion: reduce)';source.srcset=mediaHref(p.still||'assets/stills/'+p.id+'.png');picture.append(source,image);frame.append(picture)}else frame.append(image);
          link.append(frame);grid.append(link);
        }
      },{duration:620,travel:direction*28,axis:'X',resize:false});
      status.textContent=`已更換同類作品圖片列，共顯示 ${shown.length} 件。`;
    }finally{changing=false;previous.disabled=false;next.disabled=false;grid.removeAttribute('aria-busy')}
  }
  previous.addEventListener('click',()=>rotate(-1));next.addEventListener('click',()=>rotate(1));
}
const imageButton=document.querySelector('.project-image'),dialog=document.getElementById('image-dialog');
if(imageButton&&dialog){imageButton.addEventListener('click',()=>{dialog.showModal();document.body.classList.add('dialog-open')});document.getElementById('close-image').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');imageButton.focus({preventScroll:true})});dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});}

