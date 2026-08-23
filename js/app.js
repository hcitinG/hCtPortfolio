(()=>{
  const items=window.PORTFOLIO_ITEMS||[];
  const gallery=document.getElementById('gallery');
  const filterList=document.getElementById('portfolio-filters');
  const filterShell=document.getElementById('filter-shell');
  const filterStatus=document.getElementById('filter-status');
  const projectCount=document.getElementById('project-count');
  const progressBar=document.getElementById('scroll-progress-bar');
  const backToTop=document.getElementById('back-to-top');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  let activeFilter='all';
  let resizeTimer=null;
  let revealObserver=null;

  projectCount.textContent=pad(items.length);

  const counts=items.reduce((acc,item)=>{
    const key=item.category||'uncategorized';
    acc[key]=(acc[key]||0)+1;
    return acc;
  },{all:items.length});

  filterList.querySelectorAll('.filter-button').forEach(button=>{
    const sup=button.querySelector('sup');
    if(sup) sup.textContent=pad(counts[button.dataset.filter]||0);
  });

  gallery.innerHTML=items.map((item,index)=>{
    const external=Boolean(item.link);
    const attrs=external
      ? `href="${esc(item.link)}" target="_blank" rel="noopener noreferrer"`
      : `href="${esc(item.image)}" data-lightbox="pfg-lightbox" data-title="${esc(item.title)}"`;
    const displayImage=item.thumbnail||item.image;
    const displayWidth=item.thumbWidth||item.width;
    const displayHeight=item.thumbHeight||item.height;
    const imageSize=(displayWidth&&displayHeight)?` width="${displayWidth}" height="${displayHeight}"`:'';
    const loading=index<6?'eager':'lazy';
    const priority=index<3?' fetchpriority="high"':'';
    const category=item.categoryName||'網站視覺';
    const action=external?'↗':'＋';
    return `<article class="filtr-item is-visible" data-index="${index}" data-category="${esc(item.category||'0')}" style="--reveal-delay:${(index%6)*45}ms">
      <div class="img-box">
        <a class="portfolio-link" ${attrs} aria-label="${esc(item.title)}${external?'（開啟外部連結）':'（放大檢視）'}">
          <figure class="portfolio-figure">
            <img class="portfolio-thumbnail" src="${esc(displayImage)}" alt="${esc(item.title)}"${imageSize} loading="${loading}" decoding="async"${priority}>
          </figure>
          <span class="portfolio-action${external?' external':''}" aria-hidden="true">${action}</span>
        </a>
        <div class="card-info">
          <div class="card-meta"><span class="card-category">${esc(category)}</span><span>${pad(index+1)}</span></div>
          <h3 class="pfg_title_37">${esc(item.title)}</h3>
          ${item.description?`<p class="pfg_desc_37">${esc(item.description)}</p>`:''}
        </div>
      </div>
    </article>`;
  }).join('');

  const cards=[...gallery.querySelectorAll('.filtr-item')];

  function columns(){
    const w=window.innerWidth;
    if(w>=1120) return 3;
    if(w>=680) return 2;
    return 1;
  }

  function layout(){
    const cols=columns();
    const width=gallery.clientWidth/cols;
    const heights=new Array(cols).fill(0);
    let visibleIndex=0;

    cards.forEach(card=>{
      const show=activeFilter==='all'||card.dataset.category===activeFilter;
      card.style.width=`${width}px`;

      if(show){
        const col=visibleIndex%cols;
        const x=col*width;
        const y=heights[col];
        card.classList.remove('is-hidden');
        card.classList.add('is-visible');
        card.setAttribute('aria-hidden','false');
        const link=card.querySelector('a');
        if(link) link.tabIndex=0;
        card.style.transform=`translate3d(${x}px,${y}px,0)`;
        heights[col]+=card.offsetHeight;
        visibleIndex++;
      }else{
        card.classList.remove('is-visible');
        card.classList.add('is-hidden');
        card.setAttribute('aria-hidden','true');
        const link=card.querySelector('a');
        if(link) link.tabIndex=-1;
      }
    });

    gallery.style.height=`${Math.max(...heights,0)}px`;
  }

  function setFilter(value,button){
    activeFilter=value;
    filterList.querySelectorAll('.filter-button').forEach(btn=>{
      const active=btn===button;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',String(active));
    });

    const label=button.querySelector('span')?.textContent?.trim()||'All';
    const count=value==='all'?items.length:(counts[value]||0);
    filterStatus.textContent=`${label.toUpperCase()} · ${pad(count)}`;
    layout();
  }

  filterList.addEventListener('click',e=>{
    const button=e.target.closest('.filter-button[data-filter]');
    if(button) setFilter(button.dataset.filter,button);
  });

  function refreshLayoutSoon(){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(layout,90);
  }

  window.addEventListener('resize',refreshLayoutSoon,{passive:true});
  gallery.querySelectorAll('img').forEach(img=>{
    img.addEventListener('load',refreshLayoutSoon,{once:true});
    img.addEventListener('error',refreshLayoutSoon,{once:true});
  });

  if('IntersectionObserver' in window){
    revealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },{rootMargin:'0px 0px -7% 0px',threshold:.06});
    cards.forEach(card=>revealObserver.observe(card));
  }else{
    cards.forEach(card=>card.classList.add('is-revealed'));
  }

  function updateScrollUI(){
    const scrollTop=window.scrollY||document.documentElement.scrollTop;
    const max=Math.max(document.documentElement.scrollHeight-window.innerHeight,1);
    progressBar.style.transform=`scaleX(${Math.min(scrollTop/max,1)})`;
    filterShell.classList.toggle('is-stuck',filterShell.getBoundingClientRect().top<=1&&scrollTop>20);
  }
  window.addEventListener('scroll',updateScrollUI,{passive:true});
  updateScrollUI();

  backToTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

  requestAnimationFrame(()=>{
    document.body.classList.add('is-loaded');
    layout();
    gallery.classList.add('is-ready');
  });

  if(window.lightbox){
    window.lightbox.option({
      fadeDuration:380,
      imageFadeDuration:360,
      resizeDuration:520,
      positionFromTop:36,
      showImageNumberLabel:true,
      albumLabel:'%1 / %2',
      wrapAround:true,
      disableScrolling:true,
      sanitizeTitle:true
    });
  }
})();
