document.addEventListener('DOMContentLoaded', () => {
  const apiUrl = 'https://oceanos-api.datoslab.cl';

  const state = {
    tab: 'flora',
    q: '',
    tipo: '',
    perPage: 20,
    page: { flora: 1, fauna: 1 },
    data: { flora: [], fauna: [] }
  };

  const els = {
    floraGrid: document.getElementById('floraGrid'),
    faunaGrid: document.getElementById('faunaGrid'),
    floraPag: document.getElementById('floraPagination'),
    faunaPag: document.getElementById('faunaPagination'),
    skeletons: document.getElementById('skeletons'),
    emptyState: document.getElementById('emptyState'),
    q: document.getElementById('q'),
    filterTipo: document.getElementById('filterTipo'),
    perButtons: Array.from(document.querySelectorAll('[data-perpage]')),
    floraTab: document.getElementById('flora-tab'),
    faunaTab: document.getElementById('fauna-tab'),
    resultsInfo: document.getElementById('resultsInfo'),
    quick: {
      modal: document.getElementById('quickModal'),
      title: document.getElementById('quickTitle'),
      tipo: document.getElementById('quickTipo'),
      img: document.getElementById('quickImg')
    }
  };

  // Helpers
  const fetchJSON = async (url) => { const r = await fetch(url); return r.json(); };
  const firstImg = (s) => { if(!s) return ''; const a = String(s).split(','); return (a[0]||'').trim(); };
  const debounce = (fn, ms=250) => { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; };

  // Skeletons
  const showSkeletons = (n=8) => {
    els.skeletons.innerHTML = '';
    for (let i=0;i<n;i++) {
      const wrap = document.createElement('div'); wrap.className='five-col';
      const sk = document.createElement('div'); sk.className='skeleton skel-card';
      wrap.appendChild(sk); els.skeletons.appendChild(wrap);
    }
    els.skeletons.classList.remove('d-none');
  };
  const hideSkeletons = () => els.skeletons.classList.add('d-none');

  // Render
  const cardHTML = (item, kind) => {
    const img = firstImg(item.Url_Imagen);
    const imgSrc = img ? `IMAGENES/${img}` : 'assets/img/placeholder.png';
    const tipo = item.Tipo || '';
    const nombre = item.Nombre_Comun || '';
    return `
      <a href="detalle.html?id=${item.ID}" class="text-decoration-none" data-quick-id="${item.ID}" data-quick-kind="${kind}">
        <div class="card card-modern h-100">
          <div class="media-wrap">
            <img src="${imgSrc}" alt="${nombre}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/placeholder.png';" />
            <div class="media-overlay"></div>
            <div class="quick-wrap">
              <button class="btn btn-sm btn-light quick-btn" type="button" data-quick-id="${item.ID}" data-quick-kind="${kind}" title="Vista rápida">
                <i class="bi bi-eye"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <h6 class="card-title mb-1 line-clamp-2" title="${nombre}">${nombre}</h6>
            <span class="badge rounded-pill text-bg-light badge-type icon-badge">
              <i class="bi bi-tag"></i> ${tipo}
            </span>
          </div>
        </div>
      </a>`;
  };

  const applyFewItemsClass = (gridEl, items) => {
    if (items.length > 0 && items.length <= 2) gridEl.classList.add('few-items');
    else gridEl.classList.remove('few-items');
  };

  const paginate = (arr, page, perPage) => {
    if (perPage === Infinity) return { slice: arr, totalPages: 1 };
    const totalPages = Math.max(1, Math.ceil(arr.length / perPage));
    const start = (page - 1) * perPage;
    return { slice: arr.slice(start, start + perPage), totalPages };
  };

  const renderGrid = (kind) => {
    const grid = kind==='flora' ? els.floraGrid : els.faunaGrid;
    const pag = kind==='flora' ? els.floraPag : els.faunaPag;

    const q = state.q.trim().toLowerCase();
    const tipo = state.tipo.trim().toLowerCase();
    const base = state.data[kind] || [];

    const filtered = base.filter(it => {
      const okQ = !q || (it.Nombre_Comun||'').toLowerCase().includes(q);
      const okT = !tipo || (it.Tipo||'').toLowerCase().includes(tipo);
      return okQ && okT;
    });

    applyFewItemsClass(grid, filtered);

    const per = state.perPage === 'all' ? Infinity : Number(state.perPage) || 20;
    const page = state.page[kind];
    const { slice, totalPages } = paginate(filtered, page, per);

    grid.innerHTML = '';
    slice.forEach(item => {
      const wrap = document.createElement('div'); wrap.className='five-col';
      wrap.innerHTML = cardHTML(item, kind);
      grid.appendChild(wrap);
    });

    // Empty state
    els.emptyState.classList.toggle('d-none', filtered.length !== 0);

    // Pagination
    pag.innerHTML = '';
    // Results info text
    if (els.resultsInfo) {
      if (per === Infinity) {
        els.resultsInfo.textContent = `${filtered.length} resultados`;
      } else {
        const currentPage = state.page[kind];
        els.resultsInfo.textContent = `${filtered.length} resultados • Página ${currentPage} de ${totalPages}`;
      }
    }
    if (per === Infinity || totalPages <= 1) { pag.style.display='none'; return; } else { pag.style.display=''; }
    const add = (label, pageNum, disabled=false, active=false) => {
      const li = document.createElement('li'); li.className = `page-item${disabled?' disabled':''}${active?' active':''}`;
      const a = document.createElement('a'); a.className='page-link'; a.href='#'; a.textContent=label;
      if (!disabled){ a.addEventListener('click', (e)=>{ e.preventDefault(); state.page[kind]=pageNum; renderGrid(kind); }); }
      li.appendChild(a); pag.appendChild(li);
    };
    add('«', Math.max(1, page-1), page===1);
    const windowSize = 5; const start = Math.max(1, page - Math.floor(windowSize/2)); const end = Math.min(totalPages, start + windowSize - 1);
    for (let p=start; p<=end; p++){ add(String(p), p, false, p===page); }
    add('»', Math.min(totalPages, page+1), page===totalPages);
  };

  const loadData = async () => {
    showSkeletons(10);
    try {
      const [flora, fauna] = await Promise.all([
        fetchJSON(`${apiUrl}/flora`),
        fetchJSON(`${apiUrl}/fauna`)
      ]);
      state.data.flora = Array.isArray(flora)? flora : [];
      state.data.fauna = Array.isArray(fauna)? fauna : [];

      // build initial tipo filter options for current tab
      buildTipoOptions(state.tab);

      hideSkeletons();
      renderGrid('flora');
      renderGrid('fauna');
    } catch (e) {
      hideSkeletons();
      els.emptyState.classList.remove('d-none');
      console.error(e);
    }
  };

  // Events
  els.perButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-perpage');
      state.perPage = (v === 'all') ? 'all' : Number(v);
      els.perButtons.forEach(b=>{
        const isActive = b===btn;
        const isAll = b.getAttribute('data-perpage')==='all';
        b.classList.toggle('active', isActive);
        b.classList.toggle(isAll ? 'btn-secondary':'btn-primary', isActive);
        b.classList.toggle(isAll ? 'btn-outline-secondary':'btn-outline-primary', !isActive);
      });
      state.page.flora = 1; state.page.fauna = 1;
      renderGrid(state.tab);
    });
  });

  els.q.addEventListener('input', debounce(() => { state.q = els.q.value; state.page.flora=1; state.page.fauna=1; renderGrid(state.tab); }, 250));
  els.filterTipo.addEventListener('change', () => { state.tipo = els.filterTipo.value; state.page.flora=1; state.page.fauna=1; renderGrid(state.tab); });

  // Rebuild 'Tipo' options on tab change based on that tab's dataset
  const buildTipoOptions = (kind) => {
    const data = state.data[kind] || [];
    const tipos = new Set(data.map(i => i.Tipo || ''));
    const current = state.tipo;
    els.filterTipo.innerHTML = '<option value="">Todos</option>' + [...tipos].filter(Boolean).sort().map(t=>`<option value="${t}">${t}</option>`).join('');
    // If previous selection doesn't exist in new set, reset to Todos
    if (!tipos.has(current)) { state.tipo = ''; }
  };

  els.floraTab.addEventListener('shown.bs.tab', ()=>{ state.tab='flora'; buildTipoOptions('flora'); renderGrid('flora'); });
  els.faunaTab.addEventListener('shown.bs.tab', ()=>{ state.tab='fauna'; buildTipoOptions('fauna'); renderGrid('fauna'); });

  // Quick view handlers (event delegation)
  const onQuickClick = (e, kind) => {
    const btn = e.target.closest('[data-quick-id]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute('data-quick-id');
    const dataset = state.data[kind] || [];
    const item = dataset.find(x => String(x.ID) === String(id));
    if (!item) return;
    const nombre = item.Nombre_Comun || '';
    const tipo = item.Tipo || '';
    els.quick.title.textContent = nombre;
    els.quick.tipo.textContent = tipo;
    // Populate detail fields
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
    setText('quickNombreCientifico', item.Nombre_Cientifico || item.NombreCientifico || '');
    setText('quickNombreComun', item.Nombre_Comun || item.NombreComun || '');
    setText('quickDistribucion', item.Distribucion || item.Distribución || '');
    setText('quickHabitat', item.Habitat || item.Hábitat || '');
    setText('quickDescripcion', item.Descripcion || item.Descripción || '');
    setText('quickReproduccion', item.Reproduccion || item.Reproducción || '');
    setText('quickAlimentacion', item.Alimentacion || item.Alimentación || '');
    // Format fuente links (only hyperlink if it looks like a URL)
    const fuenteCell = document.getElementById('quickFuente');
    if (fuenteCell) {
      const raw = String(item.Fuente || '').trim();
      if (!raw) {
        fuenteCell.textContent = '';
      } else {
        const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        const isUrl = (s) => /^(https?:\/\/|www\.)/i.test(s);
        const html = parts.map((u, idx) => {
          if (isUrl(u)) {
            const url = u.startsWith('http') ? u : `https://${u}`;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">Fuente ${idx + 1}</a>`;
          }
          // plain text token
          return `<span>${u.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;
        }).join(' ');
        fuenteCell.innerHTML = html;
      }
    }
    // set single image
    const rawImgs = String(item.Url_Imagen || '').split(',').map(s=>s.trim()).filter(Boolean);
    const imgList = rawImgs.length ? rawImgs : ['assets/img/placeholder.png'];
    const normalize = (u) => u.startsWith('http') ? u : (u.startsWith('assets/') || u.startsWith('IMAGENES/') ? u : `IMAGENES/${u}`);
    const first = normalize(imgList[0]);
    if (els.quick.img) { els.quick.img.src = first; els.quick.img.alt = nombre; }
    // render thumbnails
    const thumbs = document.getElementById('quickThumbs');
    if (thumbs) {
      thumbs.innerHTML = imgList.map((u, idx) => {
        const src = normalize(u);
        const active = idx === 0 ? ' active' : '';
        return `<img src="${src}" alt="thumb" class="${active}" data-thumb-src="${src}">`;
      }).join('');
      // attach click to swap main image
      thumbs.querySelectorAll('img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          const newSrc = imgEl.getAttribute('data-thumb-src');
          if (els.quick.img && newSrc) {
            els.quick.img.src = newSrc;
          }
          thumbs.querySelectorAll('img').forEach(e => e.classList.remove('active'));
          imgEl.classList.add('active');
        });
      });
    }
    const modal = bootstrap.Modal.getOrCreateInstance(els.quick.modal);
    modal.show();
  };
  els.floraGrid.addEventListener('click', (e)=> onQuickClick(e, 'flora'));
  els.faunaGrid.addEventListener('click', (e)=> onQuickClick(e, 'fauna'));

  // Init
  loadData();
});
