/* Explorador de Pokémon — consume la API REST PokéAPI v2 con fetch + async/await. */
'use strict';

const API_BASE = 'https://pokeapi.co/api/v2';
const ART = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const PAGE_SIZE = 12;
const TIMEOUT_MS = 10000;
const MAX_ID = 10000; // los ids >= 10000 son formas alternativas, no Pokémon base

const TIPOS = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta', ice: 'Hielo',
  fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
};
const STATS = {
  hp: 'PS', attack: 'Ataque', defense: 'Defensa', 'special-attack': 'At. especial',
  'special-defense': 'Def. especial', speed: 'Velocidad',
};
const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

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
      if (res.status === 404) throw new ApiError('No se encontró el recurso solicitado.', 'notfound', 404);
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

const idDesdeUrl = (url) => parseInt(String(url).replace(/\/+$/, '').split('/').pop(), 10);

// Lista completa (solo nombre y url); se guarda en sessionStorage para no repetir la petición.
async function getListaPokemon() {
  try {
    const guardado = sessionStorage.getItem('pokemon-lista');
    if (guardado) return JSON.parse(guardado);
  } catch { /* sin acceso a sessionStorage: se consulta la API */ }
  const data = await fetchJSON(`${API_BASE}/pokemon?limit=100000&offset=0`);
  if (!data || !Array.isArray(data.results)) throw new ApiError('La respuesta de la API no tiene el formato esperado.', 'parse');
  const lista = data.results
    .map((r) => ({ id: idDesdeUrl(r.url), name: r.name }))
    .filter((p) => Number.isInteger(p.id) && p.id < MAX_ID);
  try { sessionStorage.setItem('pokemon-lista', JSON.stringify(lista)); } catch { /* ignorar */ }
  return lista;
}

const tipoCache = new Map();
async function getNombresPorTipo(tipo) {
  if (tipoCache.has(tipo)) return tipoCache.get(tipo);
  const data = await fetchJSON(`${API_BASE}/type/${encodeURIComponent(tipo)}`);
  if (!data || !Array.isArray(data.pokemon)) throw new ApiError('La respuesta de la API no tiene el formato esperado.', 'parse');
  const nombres = new Set(data.pokemon.map((p) => p.pokemon.name));
  tipoCache.set(tipo, nombres);
  return nombres;
}

const getPokemon = (id) => fetchJSON(`${API_BASE}/pokemon/${encodeURIComponent(id)}`);

/* ---------- Lógica pura (filtrar, ordenar, paginar) ---------- */
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const nombreBonito = (n) => String(n).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const numero = (id) => `#${String(id).padStart(4, '0')}`;
const imagen = (id) => `${ART}/other/official-artwork/${id}.png`;
const imagenRespaldo = (id) => `${ART}/${id}.png`;

function filtrar(lista, texto, nombresDeTipo) {
  const t = norm(texto).replace(/^#/, '').replace(/-/g, ' ');
  return lista.filter((p) => {
    if (nombresDeTipo && !nombresDeTipo.has(p.name)) return false;
    if (!t) return true;
    return norm(p.name).replace(/-/g, ' ').includes(t) || String(p.id) === t || numero(p.id).slice(1) === t.padStart(4, '0');
  });
}

function ordenar(lista, criterio) {
  const copia = [...lista];
  switch (criterio) {
    case 'id-desc': return copia.sort((a, b) => b.id - a.id);
    case 'name-asc': return copia.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    case 'name-desc': return copia.sort((a, b) => b.name.localeCompare(a.name, 'es'));
    default: return copia.sort((a, b) => a.id - b.id);
  }
}

const paginar = (lista, pagina) => lista.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
const totalPaginas = (n) => Math.max(1, Math.ceil(n / PAGE_SIZE));

if (typeof module !== 'undefined') {
  module.exports = { filtrar, ordenar, paginar, totalPaginas, norm, nombreBonito, numero, idDesdeUrl, fetchJSON, ApiError, getListaPokemon };
}

/* ---------- Interfaz (solo en el navegador) ---------- */
if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  const els = {
    q: $('q'), tipo: $('tipo'), sort: $('sort'), status: $('status'), feedback: $('feedback'),
    grid: $('grid'), pager: $('pager'), prev: $('prev'), next: $('next'), info: $('page-info'),
    dialog: $('detail'), body: $('detail-body'), close: $('close'),
  };
  const state = { todos: [], texto: '', tipo: '', nombresDeTipo: null, orden: 'id-asc', pagina: 1 };

  for (const [valor, etiqueta] of Object.entries(TIPOS)) {
    els.tipo.append(Object.assign(document.createElement('option'), { value: valor, textContent: etiqueta }));
  }

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

  function img(id, alt, extra = {}) {
    const i = el('img', { src: imagen(id), alt, ...extra });
    i.addEventListener('error', () => {
      if (i.dataset.fallback) { i.removeAttribute('src'); return; }
      i.dataset.fallback = '1'; i.src = imagenRespaldo(id);
    });
    return i;
  }

  function showFeedback(kind, icon, title, text, retry, retryLabel = 'Reintentar') {
    els.feedback.className = `feedback ${kind}`;
    els.feedback.replaceChildren(
      kind === 'loading' ? el('div', { class: 'spinner', 'aria-hidden': 'true' }) : el('div', { class: 'icon', 'aria-hidden': 'true', text: icon }),
      el('h2', { text: title }),
      el('p', { text }),
      retry ? Object.assign(el('button', { type: 'button', class: 'primary', text: retryLabel }), { onclick: retry }) : null,
    );
    els.feedback.hidden = false;
  }
  const hideFeedback = () => { els.feedback.hidden = true; els.feedback.replaceChildren(); };

  function tarjeta(p) {
    const card = el('button', { type: 'button', class: 'card', 'aria-label': `Ver detalle de ${nombreBonito(p.name)}` },
      el('div', { class: 'art' }, img(p.id, `Ilustración de ${nombreBonito(p.name)}`, { loading: 'lazy' })),
      el('div', { class: 'body' },
        el('span', { class: 'num', text: numero(p.id) }),
        el('h2', { text: nombreBonito(p.name) }),
      ),
    );
    card.addEventListener('click', () => abrirDetalle(p));
    return card;
  }

  function limpiarFiltros() {
    els.q.value = ''; els.tipo.value = '';
    state.texto = ''; state.tipo = ''; state.nombresDeTipo = null; state.pagina = 1;
    render();
  }

  function render() {
    const lista = ordenar(filtrar(state.todos, state.texto, state.nombresDeTipo), state.orden);
    const paginas = totalPaginas(lista.length);
    state.pagina = Math.min(state.pagina, paginas);
    els.grid.replaceChildren();

    if (lista.length === 0) {
      els.pager.hidden = true;
      els.status.textContent = '0 Pokémon encontrados.';
      showFeedback('empty', '🔍', 'No encontramos Pokémon', 'Prueba con otro nombre o cambia el filtro de tipo.', limpiarFiltros, 'Limpiar filtros');
      return;
    }
    hideFeedback();
    els.grid.append(...paginar(lista, state.pagina).map(tarjeta));
    els.status.textContent = `${lista.length} Pokémon encontrados.`;
    els.pager.hidden = paginas === 1;
    els.info.textContent = `Página ${state.pagina} de ${paginas}`;
    els.prev.disabled = state.pagina === 1;
    els.next.disabled = state.pagina === paginas;
  }

  async function cargar() {
    els.grid.replaceChildren(); els.pager.hidden = true; els.status.textContent = '';
    showFeedback('loading', '', 'Cargando Pokémon…', 'Consultando la API PokéAPI.');
    try {
      state.todos = await getListaPokemon();
      render();
    } catch (err) {
      els.status.textContent = '';
      showFeedback('error', '⚠️', 'No se pudieron cargar los Pokémon', err.message, cargar);
    }
  }

  async function aplicarTipo(tipo) {
    state.tipo = tipo; state.pagina = 1;
    if (!tipo) { state.nombresDeTipo = null; render(); return; }
    els.grid.replaceChildren(); els.pager.hidden = true; els.status.textContent = '';
    showFeedback('loading', '', 'Filtrando por tipo…', `Consultando los Pokémon de tipo ${TIPOS[tipo]}.`);
    try {
      state.nombresDeTipo = await getNombresPorTipo(tipo);
      if (state.tipo === tipo) render();
    } catch (err) {
      showFeedback('error', '⚠️', 'No se pudo aplicar el filtro', err.message, () => aplicarTipo(tipo));
    }
  }

  async function abrirDetalle(resumen) {
    els.body.replaceChildren(el('div', { class: 'feedback loading' }, el('div', { class: 'spinner', 'aria-hidden': 'true' }), el('p', { text: 'Cargando detalle…' })));
    if (!els.dialog.open) els.dialog.showModal();
    try {
      const p = await getPokemon(resumen.id);
      const fila = (k, v) => el('tr', {}, el('th', { scope: 'row', text: k }), el('td', { text: v }));
      const tipos = (p.types || []).map((t) => TIPOS[t.type.name] || nombreBonito(t.type.name));
      const habilidades = (p.abilities || []).map((a) => nombreBonito(a.ability.name) + (a.is_hidden ? ' (oculta)' : ''));
      const stats = (p.stats || []).map((s) => {
        const pct = Math.min(100, Math.round((s.base_stat / 255) * 100));
        return el('div', { class: 'stat' },
          el('span', { class: 'sname', text: STATS[s.stat.name] || nombreBonito(s.stat.name) }),
          el('span', { class: 'sval', text: String(s.base_stat) }),
          el('span', { class: 'bar', 'aria-hidden': 'true' }, el('span', { class: 'fill', style: `width:${pct}%` })));
      });
      els.body.replaceChildren(el('div', { class: 'detail' },
        el('div', { class: 'art big' }, img(p.id, `Ilustración de ${nombreBonito(p.name)}`)),
        el('div', { class: 'content' },
          el('span', { class: 'num', text: numero(p.id) }),
          el('h2', { id: 'detail-title', text: nombreBonito(p.name) }),
          el('p', { class: 'badges' }, ...tipos.map((t) => el('span', { class: 'badge', text: t }))),
          el('table', {}, el('tbody', {},
            fila('Altura', `${nf.format((p.height || 0) / 10)} m`),
            fila('Peso', `${nf.format((p.weight || 0) / 10)} kg`),
            fila('Habilidades', habilidades.join(', ') || '—'),
          )),
          el('h3', { text: 'Estadísticas base' }),
          el('div', { class: 'stats' }, ...stats),
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
  els.tipo.addEventListener('change', () => { if (state.todos.length) aplicarTipo(els.tipo.value); });
  els.sort.addEventListener('change', () => { state.orden = els.sort.value; state.pagina = 1; if (state.todos.length) render(); });
  const irA = (delta) => { state.pagina += delta; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  els.prev.addEventListener('click', () => irA(-1));
  els.next.addEventListener('click', () => irA(1));
  els.close.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', (e) => { if (e.target === els.dialog) els.dialog.close(); });

  cargar();
}
