document.addEventListener('DOMContentLoaded', () => {
  const apiUrl = 'https://oceanos-api.datoslab.cl';

  const state = {
    categoria: 'all',
    q: '',
    tipo: '',
    perPage: 20,
    page: 1,
    data: { flora: [], fauna: [] }
  };

  const els = {
    grid: document.getElementById('resultsGrid'),
    pag: document.getElementById('resultsPagination'),
    skeletons: document.getElementById('skeletons'),
    emptyState: document.getElementById('emptyState'),
    q: document.getElementById('q'),
    filterCategoria: document.getElementById('filterCategoria'),
    tipoTabs: document.getElementById('tipoTabs'),
    perButtons: Array.from(document.querySelectorAll('[data-perpage]')),
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
  const normalizeKey = (key) => String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
  const getField = (item, ...candidates) => {
    if (!item || typeof item !== 'object') return '';
    const entries = Object.entries(item);
    const lookup = new Map(entries.map(([key, value]) => [normalizeKey(key), value]));
    for (const candidate of candidates) {
      const value = lookup.get(normalizeKey(candidate));
      if (value !== undefined && value !== null) return value;
    }
    return '';
  };
  const normalizeItem = (item) => ({
    ...item,
    ID: getField(item, 'ID'),
    Tipo: getField(item, 'Tipo'),
    Nombre_Cientifico: getField(item, 'Nombre_Cientifico', 'Nombre Cientifico', 'Nombre científico'),
    Nombre_Comun: getField(item, 'Nombre_Comun', 'Nombre Comun', 'Nombre común'),
    Url_Imagen: getField(item, 'Url_Imagen', 'URL_Imagen', 'Url Imagen'),
    Fotografo: getField(item, 'Fotografo', 'Fotógrafo'),
    Habitat: getField(item, 'Habitat', 'Hábitat'),
    Descripcion: getField(item, 'Descripcion', 'Descripción'),
    Reproduccion: getField(item, 'Reproduccion', 'Reproducción'),
    Alimentacion: getField(item, 'Alimentacion', 'Alimentación'),
    Informacion_Adicional: getField(item, 'Informacion_Adicional', 'Información_Adicional', 'Informacion adicional', 'Información adicional'),
    Datos_curiosos: getField(item, 'Datos_curiosos', 'Datos_Curiosos', 'Datos curiosos'),
    Defensa: getField(item, 'Defensa')
  });
  const getFallbackImage = (kind) => kind === 'flora' ? 'assets/img/Descubre/1.png' : 'assets/img/Descubre/2.png';
  const getItemKind = (item, fallbackKind='fauna') => {
    const categoria = String(getField(item, 'Categoría', 'Categoria') || '').trim().toLowerCase();
    if (categoria === 'flora' || categoria === 'fauna') return categoria;
    return fallbackKind;
  };
  const getImageSrc = (item, kind) => {
    const fallback = getFallbackImage(getItemKind(item, kind));
    const img = firstImg(item && item.Url_Imagen);
    if (!img) return fallback;
    if (/^https?:\/\//i.test(img) || img.startsWith('assets/') || img.startsWith('IMAGENES/')) return img;
    return `IMAGENES/${img}`;
  };

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
    const imgSrc = getImageSrc(item, kind);
    const fallbackImg = getFallbackImage(kind);
    const tipo = item.Tipo || '';
    const nombre = item.Nombre_Comun || '';
    return `
      <a href="detalle.html?id=${item.ID}" class="text-decoration-none" data-quick-id="${item.ID}" data-quick-kind="${kind}">
        <div class="card card-modern h-100">
          <div class="media-wrap">
            <img src="${imgSrc}" alt="${nombre}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}';" />
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

  const renderGrid = () => {
    const grid = els.grid;
    const pag = els.pag;

    const q = state.q.trim().toLowerCase();
    const tipo = state.tipo.trim().toLowerCase();
    
    let base = [];
    if (state.categoria === 'all') {
      base = [...(state.data.fauna || []), ...(state.data.flora || [])];
    } else {
      base = state.data[state.categoria] || [];
    }

    const filtered = base.filter(it => {
      const okQ = !q || (it.Nombre_Comun||'').toLowerCase().includes(q);
      const okT = !tipo || (it.Tipo||'').toLowerCase() === tipo;
      return okQ && okT;
    });

    applyFewItemsClass(grid, filtered);

    const per = state.perPage === 'all' ? Infinity : Number(state.perPage) || 20;
    const page = state.page;
    const { slice, totalPages } = paginate(filtered, page, per);

    grid.innerHTML = '';
    slice.forEach(item => {
      const wrap = document.createElement('div'); wrap.className='five-col';
      wrap.innerHTML = cardHTML(item, item.Categoría?.toLowerCase() || state.categoria);
      grid.appendChild(wrap);
    });

    // Empty state
    els.emptyState.classList.toggle('d-none', filtered.length !== 0);

    // Pagination
    pag.innerHTML = '';
    if (els.resultsInfo) {
      if (per === Infinity) {
        els.resultsInfo.textContent = `${filtered.length} resultados`;
      } else {
        els.resultsInfo.textContent = `${filtered.length} resultados • Página ${page} de ${totalPages}`;
      }
    }
    if (per === Infinity || totalPages <= 1) { pag.style.display='none'; return; } else { pag.style.display=''; }
    const add = (label, pageNum, disabled=false, active=false) => {
      const li = document.createElement('li'); li.className = `page-item${disabled?' disabled':''}${active?' active':''}`;
      const a = document.createElement('a'); a.className='page-link'; a.href='#'; a.textContent=label;
      if (!disabled){ a.addEventListener('click', (e)=>{ e.preventDefault(); state.page=pageNum; renderGrid(); }); }
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
      state.data.flora = Array.isArray(flora) ? flora.map(normalizeItem) : [];
      state.data.fauna = Array.isArray(fauna) ? fauna.map(normalizeItem) : [];

      buildTipoTabs(state.categoria);
      hideSkeletons();
      renderGrid();
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
      state.page = 1;
      renderGrid();
    });
  });

  els.q.addEventListener('input', debounce(() => { state.q = els.q.value; state.page=1; renderGrid(); }, 250));
  
  els.filterCategoria.addEventListener('change', () => {
    state.categoria = els.filterCategoria.value;
    state.tipo = '';
    state.page = 1;
    buildTipoTabs(state.categoria);
    renderGrid();
  });

  const buildTipoTabs = (kind) => {
    let data = [];
    if (kind === 'all') {
      data = [...(state.data.fauna || []), ...(state.data.flora || [])];
    } else {
      data = state.data[kind] || [];
    }
    const tipos = [...new Set(data.map(i => i.Tipo || ''))].filter(Boolean).sort();
    
    let html = `
      <li class="nav-item" role="presentation">
        <button class="nav-link ${state.tipo === '' ? 'active' : ''}" type="button" data-tipo="">Todos</button>
      </li>
    `;
    
    tipos.forEach(t => {
      html += `
        <li class="nav-item" role="presentation">
          <button class="nav-link ${state.tipo === t ? 'active' : ''}" type="button" data-tipo="${t}">${t}</button>
        </li>
      `;
    });
    
    els.tipoTabs.innerHTML = html;
    
    // Add click events to tabs
    els.tipoTabs.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tipo = btn.getAttribute('data-tipo');
        state.page = 1;
        
        // Update active class
        els.tipoTabs.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        renderGrid();
      });
    });
  };

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
    const cientifico = item.Nombre_Cientifico || '';
    
    // Actualizar cabecera
    const nameHeader = document.getElementById("quickNombreComunHeader");
    const scientificHeader = document.getElementById("quickNombreCientificoHeader");
    if (nameHeader) nameHeader.textContent = nombre;
    if (scientificHeader) scientificHeader.textContent = cientifico;

    // Populate detail fields with row handling
    const setRow = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        const rowId = `row-${id}`;
        const rowElement = document.getElementById(rowId);
        if (val && String(val).trim().toLowerCase() !== 'n/a' && String(val).trim() !== '') {
          el.textContent = val;
          if (rowElement) rowElement.style.display = '';
        } else {
          el.textContent = '';
          if (rowElement) rowElement.style.display = 'none';
        }
      }
    };
    
    setRow('quickHabitat', getField(item, 'Habitat', 'Hábitat'));
    setRow('quickDescripcion', getField(item, 'Descripcion', 'Descripción'));
    setRow('quickReproduccion', getField(item, 'Reproduccion', 'Reproducción'));
    setRow('quickAlimentacion', getField(item, 'Alimentacion', 'Alimentación'));
    setRow('quickDefensa', getField(item, 'Defensa'));
    setRow('quickDatosCuriosos', getField(item, 'Datos_curiosos', 'Datos_Curiosos', 'Datos curiosos'));
    setRow('quickInformacionAdicional', getField(item, 'Informacion_Adicional', 'Información_Adicional', 'Informacion adicional', 'Información adicional'));

    // set main image
    const fallbackImg = getFallbackImage(kind);
    const rawImgs = String(item.Url_Imagen || '').split(',').map(s=>s.trim()).filter(Boolean);
    const normalize = (u) => u.startsWith('http') ? u : (u.startsWith('assets/') || u.startsWith('IMAGENES/') ? u : `IMAGENES/${u}`);
    const imgList = rawImgs.length ? rawImgs.map(normalize) : [fallbackImg];
    const first = imgList[0];
    
    if (els.quick.img) {
      els.quick.img.src = first;
      els.quick.img.alt = nombre;
      els.quick.img.onerror = () => {
        if (els.quick.img) {
          els.quick.img.onerror = null;
          els.quick.img.src = fallbackImg;
        }
      };
    }
    
    // render thumbnails
    const thumbs = document.getElementById('quickThumbs');
    if (thumbs) {
      thumbs.innerHTML = imgList.map((u, idx) => {
        const src = normalize(u);
        const active = idx === 0 ? ' active' : '';
        return `<img src="${src}" alt="thumb" class="${active}" data-thumb-src="${src}" onerror="this.onerror=null;this.src='${fallbackImg}';this.setAttribute('data-thumb-src','${fallbackImg}');">`;
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
  els.grid.addEventListener('click', (e)=> {
    const btn = e.target.closest('[data-quick-id]');
    if (!btn) return;
    const kind = btn.getAttribute('data-quick-kind') || state.categoria;
    onQuickClick(e, kind);
  });

  // Init
  loadData();
});
