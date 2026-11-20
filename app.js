/* Explorador de países — consume la API REST Countries v3.1 con fetch + async/await. */
'use strict';

const API_BASE = 'https://restcountries.com/v3.1';
// /all exige el parámetro "fields" (máximo 10 campos).
const LIST_FIELDS = 'name,translations,cca3,capital,region,population,flags';
const DETAIL_FIELDS = 'name,translations,flags,capital,region,subregion,population,area,languages,currencies';
const PAGE_SIZE = 12;
const TIMEOUT_MS = 10000;

const REGIONES = { Africa: 'África', Americas: 'América', Asia: 'Asia', Europe: 'Europa', Oceania: 'Oceanía', Antarctic: 'Antártida' };
const nf = new Intl.NumberFormat('es-MX');

/* ---------- Capa de red ---------- */
class ApiError extends Error {
  constructor(message, kind, status) { super(message); this.kind = kind; this.status = status; }
}

async function fetchJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) {
      if (res.status === 404) throw new ApiError('Sin resultados.', 'notfound', 404);
      if (res.status === 429) throw new ApiError('Demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.', 'ratelimit', 429);
      if (res.status >= 500) throw new ApiError('El servicio no está disponible en este momento.', 'server', res.status);
      throw new ApiError(`La API respondió con un error (${res.status}).`, 'http', res.status);
    }
    try { return await res.json(); }
    catch { throw new ApiError('La respuesta de la API no tiene un formato válido.', 'parse', res.status); }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new ApiError('La API tardó demasiado en responder.', 'timeout');
    throw new ApiError('No se pudo conectar. Revisa tu conexión a internet.', 'network');
  } finally {
    clearTimeout(timer);
  }
}

const getAllCountries = () => fetchJSON(`${API_BASE}/all?fields=${LIST_FIELDS}`);
const getCountry = async (code) => {
  const data = await fetchJSON(`${API_BASE}/alpha/${encodeURIComponent(code)}?fields=${DETAIL_FIELDS}`);
  return Array.isArray(data) ? data[0] : data;
};

/* ---------- Lógica pura (filtrar, ordenar, paginar) ---------- */
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const nombreEs = (c) => c.translations?.spa?.common || c.name?.common || 'Sin nombre';

function filtrar(paises, texto, region) {
  const t = norm(texto);
  return paises.filter((c) => {
    if (region && c.region !== region) return false;
    if (!t) return true;
    return [nombreEs(c), c.name?.common, c.name?.official, ...(c.capital || [])].some((v) => norm(v).includes(t));
  });
}

function ordenar(paises, criterio) {
  const copia = [...paises];
  const porNombre = (a, b) => nombreEs(a).localeCompare(nombreEs(b), 'es');
  switch (criterio) {
    case 'name-desc': return copia.sort((a, b) => porNombre(b, a));
    case 'pop-desc': return copia.sort((a, b) => (b.population || 0) - (a.population || 0));
    case 'pop-asc': return copia.sort((a, b) => (a.population || 0) - (b.population || 0));
    default: return copia.sort(porNombre);
  }
}

const paginar = (lista, pagina) => lista.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
const totalPaginas = (n) => Math.max(1, Math.ceil(n / PAGE_SIZE));

if (typeof module !== 'undefined') {
  module.exports = { filtrar, ordenar, paginar, totalPaginas, norm, nombreEs, fetchJSON, ApiError };
}

/* ---------- Interfaz (solo en el navegador) ---------- */
if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  const els = {
    q: $('q'), region: $('region'), sort: $('sort'), status: $('status'), feedback: $('feedback'),
    grid: $('grid'), pager: $('pager'), prev: $('prev'), next: $('next'), info: $('page-info'),
    dialog: $('detail'), body: $('detail-body'), close: $('close'),
  };
  const state = { todos: [], texto: '', region: '', orden: 'name-asc', pagina: 1 };

  // Crea elementos con textContent para no insertar datos de la API como HTML.
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    children.flat().forEach((c) => c != null && node.append(c));
    return node;
  }

  function showFeedback(kind, icon, title, text, retry) {
    els.feedback.className = `feedback ${kind}`;
    els.feedback.replaceChildren(
      kind === 'loading' ? el('div', { class: 'spinner', 'aria-hidden': 'true' }) : el('div', { class: 'icon', 'aria-hidden': 'true', text: icon }),
      el('h2', { text: title }),
      el('p', { text }),
      retry ? Object.assign(el('button', { type: 'button', class: 'primary', text: 'Reintentar' }), { onclick: retry }) : null,
    );
    els.feedback.hidden = false;
  }
  const hideFeedback = () => { els.feedback.hidden = true; els.feedback.replaceChildren(); };

  function tarjeta(c) {
    const card = el('button', { type: 'button', class: 'card', 'aria-label': `Ver detalle de ${nombreEs(c)}` },
      el('img', { src: c.flags?.svg || c.flags?.png || '', alt: c.flags?.alt || `Bandera de ${nombreEs(c)}`, loading: 'lazy' }),
      el('div', { class: 'body' },
        el('h2', { text: nombreEs(c) }),
        el('dl', {},
          el('span', { class: 'row' }, el('dt', { text: 'Capital: ' }), el('dd', { text: (c.capital || ['—']).join(', ') })),
          el('span', { class: 'row' }, el('dt', { text: 'Región: ' }), el('dd', { text: REGIONES[c.region] || c.region || '—' })),
          el('span', { class: 'row' }, el('dt', { text: 'Población: ' }), el('dd', { text: nf.format(c.population || 0) })),
        ),
      ),
    );
    card.addEventListener('click', () => abrirDetalle(c));
    return card;
  }

  function render() {
    const lista = ordenar(filtrar(state.todos, state.texto, state.region), state.orden);
    const paginas = totalPaginas(lista.length);
    state.pagina = Math.min(state.pagina, paginas);
    els.grid.replaceChildren();

    if (lista.length === 0) {
      els.pager.hidden = true;
      els.status.textContent = '0 países encontrados.';
      showFeedback('empty', '🔍', 'No encontramos países', 'Prueba con otro nombre o cambia el filtro de región.',
        () => { els.q.value = ''; els.region.value = ''; state.texto = ''; state.region = ''; state.pagina = 1; render(); });
      els.feedback.querySelector('button').textContent = 'Limpiar filtros';
      return;
    }
    hideFeedback();
    els.grid.append(...paginar(lista, state.pagina).map(tarjeta));
    els.status.textContent = `${lista.length} ${lista.length === 1 ? 'país encontrado' : 'países encontrados'}.`;
    els.pager.hidden = paginas === 1;
    els.info.textContent = `Página ${state.pagina} de ${paginas}`;
    els.prev.disabled = state.pagina === 1;
    els.next.disabled = state.pagina === paginas;
  }

  async function cargar() {
    els.grid.replaceChildren(); els.pager.hidden = true; els.status.textContent = '';
    showFeedback('loading', '', 'Cargando países…', 'Consultando la API REST Countries.');
    try {
      const data = await getAllCountries();
      if (!Array.isArray(data)) throw new ApiError('La respuesta de la API no tiene el formato esperado.', 'parse');
      state.todos = data;
      render();
    } catch (err) {
      els.status.textContent = '';
      showFeedback('error', '⚠️', 'No se pudieron cargar los países', err.message, cargar);
    }
  }

  async function abrirDetalle(resumen) {
    els.body.replaceChildren(el('div', { class: 'feedback loading' }, el('div', { class: 'spinner', 'aria-hidden': 'true' }), el('p', { text: 'Cargando detalle…' })));
    if (!els.dialog.open) els.dialog.showModal();
    try {
      const c = await getCountry(resumen.cca3);
      const fila = (k, v) => el('tr', {}, el('th', { scope: 'row', text: k }), el('td', { text: v }));
      const idiomas = Object.values(c.languages || {}).join(', ') || '—';
      const monedas = Object.values(c.currencies || {}).map((m) => `${m.name}${m.symbol ? ` (${m.symbol})` : ''}`).join(', ') || '—';
      els.body.replaceChildren(el('div', { class: 'detail' },
        el('img', { src: c.flags?.svg || c.flags?.png || '', alt: c.flags?.alt || `Bandera de ${nombreEs(c)}` }),
        el('div', { class: 'content' },
          el('h2', { id: 'detail-title', text: nombreEs(c) }),
          el('p', { class: 'official', text: c.name?.official || '' }),
          el('table', {}, el('tbody', {},
            fila('Capital', (c.capital || ['—']).join(', ')),
            fila('Región', `${REGIONES[c.region] || c.region || '—'}${c.subregion ? ` · ${c.subregion}` : ''}`),
            fila('Población', nf.format(c.population || 0)),
            fila('Superficie', c.area ? `${nf.format(c.area)} km²` : '—'),
            fila('Idiomas', idiomas),
            fila('Monedas', monedas),
          )),
        ),
      ));
    } catch (err) {
      els.body.replaceChildren(el('div', { class: 'feedback error' },
        el('div', { class: 'icon', 'aria-hidden': 'true', text: '⚠️' }),
        el('h2', { id: 'detail-title', text: 'No se pudo cargar el detalle' }),
        el('p', { text: err.message }),
        Object.assign(el('button', { type: 'button', class: 'primary', text: 'Reintentar' }), { onclick: () => abrirDetalle(resumen) }),
      ));
    }
  }

  let debounce;
  els.q.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.texto = els.q.value; state.pagina = 1; if (state.todos.length) render(); }, 250);
  });
  els.region.addEventListener('change', () => { state.region = els.region.value; state.pagina = 1; if (state.todos.length) render(); });
  els.sort.addEventListener('change', () => { state.orden = els.sort.value; state.pagina = 1; if (state.todos.length) render(); });
  const irA = (delta) => { state.pagina += delta; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  els.prev.addEventListener('click', () => irA(-1));
  els.next.addEventListener('click', () => irA(1));
  els.close.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', (e) => { if (e.target === els.dialog) els.dialog.close(); });

  cargar();
}
