(()=>{
  const items=window.PORTFOLIO_ITEMS||[];
  const gallery=document.getElementById('gallery');
  const filterList=document.getElementById('portfolio-filters');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let activeFilter='all';
  let resizeTimer=null;

  gallery.innerHTML=items.map((item,index)=>{
    const external=Boolean(item.link);
    const attrs=external
      ? `href="${esc(item.link)}" target="_blank" rel="noopener noreferrer"`
      : `href="${esc(item.image)}" data-lightbox="pfg-lightbox" data-title="${esc(item.title)}"`;
    return `<div class="filtr-item is-visible" data-index="${index}" data-category="${esc(item.category||'0')}">
      <div class="img-box">
        <a class="portfolio-link" ${attrs} title="${esc(item.title)}">
          <figure class="portfolio-figure"><img class="portfolio-thumbnail" src="${esc(item.image)}" alt="${esc(item.title)}" decoding="async"></figure>
        </a>
        <div class="pfg_title_box_37">
          <h3 class="pfg_title_37">${esc(item.title)}</h3>
          ${item.description?`<p class="pfg_desc_37">${esc(item.description)}</p>`:''}
        </div>
      </div>
    </div>`;
  }).join('');

  const cards=[...gallery.querySelectorAll('.filtr-item')];

  function columns(){ return window.innerWidth>=1200?3:2; }

  function layout(animate=true){
    const cols=columns();
    const width=gallery.clientWidth/cols;
    const heights=new Array(cols).fill(0);
    let visibleIndex=0;

    cards.forEach(card=>{
      const show=activeFilter==='all'||card.dataset.category===activeFilter;
      card.style.width=`${width}px`;
      if(show){
        card.classList.remove('is-hidden');
        card.classList.add('is-visible');
        const col=visibleIndex%cols;
        const x=col*width;
        const y=heights[col];
        card.style.transform=`translate3d(${x}px,${y}px,0)`;
        heights[col]+=card.offsetHeight;
        visibleIndex++;
      }else{
        card.classList.remove('is-visible');
        card.classList.add('is-hidden');
      }
    });
    gallery.style.height=`${Math.max(...heights,0)}px`;
  }

  function applyFilter(value,source){
    activeFilter=value;
    [...filterList.querySelectorAll('li')].forEach(li=>li.classList.toggle('active',li===source));
    layout(true);
  }

  filterList.addEventListener('click',e=>{
    const li=e.target.closest('li[data-filter]');
    if(li) applyFilter(li.dataset.filter,li);
  });
  filterList.addEventListener('keydown',e=>{
    const li=e.target.closest('li[data-filter]');
    if(li&&(e.key==='Enter'||e.key===' ')){
      e.preventDefault();
      applyFilter(li.dataset.filter,li);
    }
  });

  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>layout(false),160);
  });

  let imageLayoutTimer=null;
  gallery.querySelectorAll('img').forEach(img=>{
    const refresh=()=>{
      clearTimeout(imageLayoutTimer);
      imageLayoutTimer=setTimeout(()=>layout(false),35);
    };
    img.addEventListener('load',refresh,{once:true});
    img.addEventListener('error',refresh,{once:true});
  });
  requestAnimationFrame(()=>{
    layout(false);
    gallery.classList.add('is-ready');
  });

  if(window.lightbox){
    window.lightbox.option({
      fadeDuration:600,
      imageFadeDuration:600,
      resizeDuration:700,
      positionFromTop:50,
      showImageNumberLabel:true,
      wrapAround:false,
      disableScrolling:false,
      sanitizeTitle:true
    });
  }
})();
