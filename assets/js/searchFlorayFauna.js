/*
  Archivo: assets/js/searchFlorayFauna.js
  Propósito: consumir la API y renderizar grillas de Flora (sin paginación) y Fauna (con paginación)
  Secciones:
   - Helpers: fetchData, getFirstImageUrl
   - Render Flora: grilla simple y estado visual cuando hay pocos ítems
   - Render Fauna: grilla + paginación + botones 10/20/30/Todos
   - Carga inicial: obtiene flora y fauna y refresca la UI
*/
document.addEventListener("DOMContentLoaded", function () {
  // URL de la API (reemplázala con la URL correcta)
  const apiUrl = "https://oceanos-api.datoslab.cl";

  // Función para obtener datos de la API
  const fetchData = async (url) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };
  // Función para mostrar solo la primera imagen de la lista
  const getFirstImageUrl = (urlList) => {
    if (!urlList) return "";
    const imageUrls = String(urlList).split(",");
    return (imageUrls[0] || "").trim();
  };

  // Flora: simple grid (sin paginación) + centrado si hay pocos ítems
  const renderFlora = (data) => {
    const loader = document.getElementById("loader-wrapper");
    if (loader) loader.style.display = "none";

    const container = document.getElementById("floraContainer");
    container.innerHTML = "";
    if (Array.isArray(data) && data.length > 0 && data.length <= 2) {
      container.classList.add("few-items");
    } else {
      container.classList.remove("few-items");
    }

    data.forEach((item) => {
      const wrap = document.createElement("div");
      wrap.className = "five-col";

      const link = document.createElement("a");
      link.href = `detalle.html?id=${item.ID}`;
      link.className = "text-decoration-none";

      const card = document.createElement("div");
      card.className = "card card-modern h-100";

      const imageUrl = getFirstImageUrl(item.Url_Imagen);
      const imgSrc = imageUrl ? `IMAGENES/${imageUrl}` : "assets/img/placeholder.png";
      card.innerHTML = `
        <div class="media-wrap">
          <img src="${imgSrc}" alt="${item.Nombre_Comun || "Imagen"}">
        </div>
        <div class="card-body">
          <h6 class="card-title mb-1">${item.Nombre_Comun || ""}</h6>
          <span class="badge rounded-pill text-bg-light badge-type">${item.Tipo || ""}</span>
        </div>
      `;

      link.appendChild(card);
      wrap.appendChild(link);
      container.appendChild(wrap);
    });
  };

  // Fauna: grid con paginación y tamaño 10/20/30/Todos
  let faunaData = [];
  let faunaPage = 1;
  let faunaPerPage = 10;

  const faunaContainer = document.getElementById("faunaContainer");
  const faunaPagination = document.getElementById("faunaPagination");
  const btn10 = document.getElementById("faunaShow10");
  const btn20 = document.getElementById("faunaShow20");
  const btn30 = document.getElementById("faunaShow30");
  const btnAll = document.getElementById("faunaShowAll");

  const renderFaunaGrid = (items) => {
    faunaContainer.innerHTML = "";
    items.forEach((item) => {
      const wrap = document.createElement("div");
      wrap.className = "five-col";

      const link = document.createElement("a");
      link.href = `detalle.html?id=${item.ID}`;
      link.className = "text-decoration-none";

      const card = document.createElement("div");
      card.className = "card card-modern h-100";

      const imageUrl = getFirstImageUrl(item.Url_Imagen);
      const imgSrc = imageUrl ? `IMAGENES/${imageUrl}` : "assets/img/placeholder.png";
      card.innerHTML = `
        <div class="media-wrap">
          <img src="${imgSrc}" alt="${item.Nombre_Comun || "Imagen"}">
        </div>
        <div class="card-body">
          <h6 class="card-title mb-1">${item.Nombre_Comun || ""}</h6>
          <span class="badge rounded-pill text-bg-light badge-type">${item.Tipo || ""}</span>
        </div>
      `;

      link.appendChild(card);
      wrap.appendChild(link);
      faunaContainer.appendChild(wrap);
    });
  };

  const renderFaunaPagination = () => {
    const total = faunaData.length;
    const perPage = Math.min(faunaPerPage, total) || total;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    faunaPagination.innerHTML = "";
    // ocultar si se muestran todos
    if (perPage >= total) {
      faunaPagination.style.display = "none";
      return;
    } else {
      faunaPagination.style.display = "";
    }

    const createItem = (label, page, disabled = false, active = false) => {
      const li = document.createElement("li");
      li.className = `page-item${disabled ? " disabled" : ""}${active ? " active" : ""}`;
      const a = document.createElement("a");
      a.className = "page-link";
      a.href = "#";
      a.textContent = label;
      if (!disabled) {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          faunaPage = page;
          renderFaunaPage();
        });
      }
      li.appendChild(a);
      return li;
    };

    faunaPagination.appendChild(createItem("«", Math.max(1, faunaPage - 1), faunaPage === 1));
    const windowSize = 5;
    const start = Math.max(1, faunaPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    for (let p = start; p <= end; p++) {
      faunaPagination.appendChild(createItem(String(p), p, false, p === faunaPage));
    }
    faunaPagination.appendChild(createItem("»", Math.min(totalPages, faunaPage + 1), faunaPage === totalPages));
  };

  const renderFaunaPage = () => {
    const loader = document.getElementById("loader-wrapper");
    if (loader) loader.style.display = "none";

    const perPage = Math.min(faunaPerPage, faunaData.length) || faunaData.length;
    const start = (faunaPage - 1) * perPage;
    const slice = faunaData.slice(start, start + perPage);
    renderFaunaGrid(slice);
    renderFaunaPagination();
  };

  const updateFaunaButtons = () => {
    const setBtn = (btn, active, outlineClass = 'btn-outline-primary', activeClass = 'btn-primary') => {
      if (!btn) return;
      btn.classList.toggle('active', active);
      btn.classList.toggle(activeClass, active);
      btn.classList.toggle(outlineClass, !active);
    };
    setBtn(btn10, faunaPerPage === 10);
    setBtn(btn20, faunaPerPage === 20);
    setBtn(btn30, faunaPerPage === 30);
    if (btnAll) {
      btnAll.classList.toggle('active', faunaPerPage === Infinity);
      btnAll.classList.toggle('btn-secondary', faunaPerPage === Infinity);
      btnAll.classList.toggle('btn-outline-secondary', faunaPerPage !== Infinity);
    }
  };
  if (btn10) btn10.addEventListener('click', () => { faunaPerPage = 10; faunaPage = 1; updateFaunaButtons(); renderFaunaPage(); });
  if (btn20) btn20.addEventListener('click', () => { faunaPerPage = 20; faunaPage = 1; updateFaunaButtons(); renderFaunaPage(); });
  if (btn30) btn30.addEventListener('click', () => { faunaPerPage = 30; faunaPage = 1; updateFaunaButtons(); renderFaunaPage(); });
  if (btnAll) btnAll.addEventListener('click', () => { faunaPerPage = Infinity; faunaPage = 1; updateFaunaButtons(); renderFaunaPage(); });

  // Cargar datos
  fetchData(apiUrl + "/flora").then((data) => {
    const floraData = Array.isArray(data) ? data : [];
    renderFlora(floraData);
  });

  fetchData(apiUrl + "/fauna").then((data) => {
    faunaData = Array.isArray(data) ? data : [];
    faunaPage = 1;
    updateFaunaButtons();
    renderFaunaPage();
  });
});
