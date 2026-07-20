const DEFAULT_API_BASE = 'https://rutero-cacharrito.vercel.app/api';
const API_BASE = (typeof window !== 'undefined' && window.APP_API_BASE) ? window.APP_API_BASE : DEFAULT_API_BASE;
const TOKEN_KEY = 'rutero_token';
const USER_KEY = 'rutero_user';
const THEME_KEY = 'rutero_theme';
const MAX_INLINE_IMAGE_MB = 2;

const state = {
  page: 1,
  pageSize: 8,
  rows: [],
  filtered: [],
  editing: null,
  activeVisit: null,
  vendedores: [],
  municipios: []
};

const routes = {
  admin: [
    ['dashboard-admin.html', 'Inicio', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>'],
    ['clientes.html', 'Clientes', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M9 20v-6h6v6"/></svg>'],
    ['vendedores.html', 'Vendedores', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'],
    ['municipios.html', 'Municipios', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>'],
    ['visitas.html', 'Visitas', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2"/></svg>'],
    ['configuracion.html', 'Configuracion', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/><path d="M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4"/></svg>']
  ],
  vendedor: [
    ['dashboard-vendedor.html', 'Mi ruta', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>'],
    ['clientes.html', 'Clientes', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M9 20v-6h6v6"/></svg>'],
    ['configuracion.html', 'Configuracion', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/><path d="M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4"/></svg>']
  ]
};
function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return user ? { ...user, rol: normalizeRole(user.rol) } : null;
  } catch (_error) {
    return null;
  }
}

function normalizeAuthPayload(data) {
  const payload = data?.data ?? data;
  const token = payload?.token || payload?.accessToken || null;
  const usuario = payload?.usuario || payload?.user || null;
  return { token, usuario };
}

function setUserSession(data) {
  const session = normalizeAuthPayload(data);
  if (!session.token || !session.usuario) {
    throw new Error('La respuesta del servidor no contiene los datos de sesión esperados');
  }

  const user = { ...session.usuario, rol: normalizeRole(session.usuario.rol) };
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { token: session.token, usuario: user };
}

function normalizeRole(role = '') {
  const value = String(role).trim().toLowerCase();
  if (['admin', 'administrador', 'administrator'].includes(value)) return 'administrador';
  if (['vendedor', 'seller', 'ventas'].includes(value)) return 'vendedor';
  return value;
}

function isAdmin(user = getUser()) {
  return normalizeRole(user?.rol) === 'administrador';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.size) {
      resolve(null);
      return;
    }
    if (file.size > MAX_INLINE_IMAGE_MB * 1024 * 1024) {
      reject(new Error(`La imagen no puede superar ${MAX_INLINE_IMAGE_MB} MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  location.href = 'login.html';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  qsa('[data-theme-toggle]').forEach((button) => {
    button.textContent = theme === 'dark' ? '☾' : '☀';
    button.title = theme === 'dark' ? 'Tema oscuro' : 'Tema claro';
  });
}

function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  qsa('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
}

function showLoader(show = true) {
  qs('#loader')?.classList.toggle('show', show);
}

function alertMessage(message, type = 'success') {
  const stack = qs('#alerts');
  if (!stack) return;
  const alert = document.createElement('div');
  alert.className = `alert ${type}`;
  alert.textContent = message;
  stack.appendChild(alert);
  setTimeout(() => alert.remove(), 4200);
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  showLoader(true);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || 'No fue posible completar la solicitud');
    }
    return payload.data ?? payload;
  } finally {
    showLoader(false);
  }
}

function isLoginPage() {
  return Boolean(document.getElementById('loginForm'));
}

function requireAuth(roles = []) {
  if (isLoginPage()) return;
  const user = getUser();
  if (!getToken() || !user) {
    location.href = 'login.html';
    return;
  }
  const role = normalizeRole(user?.rol);
  if (roles.length && !roles.map(normalizeRole).includes(role)) {
    location.href = role === 'administrador' ? 'dashboard-admin.html' : 'dashboard-vendedor.html';
  }
}

function shell() {
  const user = getUser();
  const sidebar = qs('#sidebar');
  if (!sidebar || !user) return;
  const current = location.pathname.split('/').pop() || 'dashboard-admin.html';
  const role = normalizeRole(user.rol);
  const roleRoutes = routes[role] || routes.vendedor;

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div id="brandMark" class="brand-mark"><img src="assets/logo.svg" alt="Rutero Cacharrito" onerror="this.style.display='none'; this.parentElement.textContent='RC'" /></div>
      <div>
        <div id="businessName" class="sidebar-title">Rutero Cacharrito</div>
        <div class="sidebar-subtitle">${role}</div>
      </div>
    </div>
    <nav class="nav-menu">
      ${roleRoutes
        .map(([href, label, icon]) => `<a class="nav-link ${href === current ? 'active' : ''}" href="${href}"><span>${icon}</span>${label}</a>`)
        .join('')}
    </nav>
  `;

  qs('#userName') && (qs('#userName').textContent = user.nombres || user.usuario);
  qs('#userRole') && (qs('#userRole').textContent = role);
  qs('#adminHomeBtn') && (qs('#adminHomeBtn').style.display = role === 'administrador' ? '' : 'none');
  qs('#logoutBtn')?.addEventListener('click', logout);
  qs('#mobileMenu')?.addEventListener('click', () => sidebar.classList.toggle('open'));
  loadBusinessBrand();
}

async function loadBusinessBrand() {
  try {
    const config = await apiFetch('/configuracion');
    qsa('#businessName').forEach((item) => {
      item.textContent = config.nombre_negocio || 'Rutero Cacharrito';
    });
    qsa('#brandMark').forEach((item) => {
      item.innerHTML = config.logo_url ? `<img src="${config.logo_url}" alt="">` : 'RC';
    });
  } catch (_error) {
    // La marca no debe bloquear la navegacion si la configuracion aun no existe.
  }
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function todayISO() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function formatTime(date = new Date()) {
  return date.toTimeString().slice(0, 8);
}

function boolBadge(value) {
  return value ? '<span class="badge success">Activo</span>' : '<span class="badge danger">Inactivo</span>';
}

function visitStatusBadge(row) {
  if (!row.hora_salida) {
    return '<span class="badge warning">En curso</span>';
  }
  const estado = String(row.estado || '').toLowerCase();
  if (estado === 'compro') return '<span class="badge success">Compr&oacute;</span>';
  if (estado === 'no_compro') return '<span class="badge danger">No Compr&oacute;</span>';
  if (estado === 'cerrado') return '<span class="badge success">Cerrado</span>';
  if (estado === 'reprogramado') return '<span class="badge warning">Reprogramado</span>';
  if (estado === 'otro') return '<span class="badge">Otro</span>';
  if (estado === 'pedido_entregado') return '<span class="badge success">Pedido entregado</span>';
  if (estado === 'cambios_entregados_recogidos') return '<span class="badge success">Cambios entregados/recogidos</span>';
  if (estado === 'cliente_cerrado') return '<span class="badge warning">Cliente cerrado</span>';
  return row.compro ? '<span class="badge success">Compr&oacute;</span>' : '<span class="badge danger">No Compr&oacute;</span>';
}

function shortText(value, max = 48) {
  if (!value) return '-';
  const text = String(value);
  return text.length > max ? `${escapeHtml(text.slice(0, max))}...` : escapeHtml(text);
}

function fullObservation(value) {
  if (!value) return '-';
  const text = escapeHtml(value);
  if (String(value).length <= 70) {
    return `<span class="observation-text">${text}</span>`;
  }
  return `
    <details class="observation-details">
      <summary>${shortText(value, 70)}</summary>
      <div>${text}</div>
    </details>
  `;
}

function mapLink(row) {
  const lat = Number(row.latitud);
  const lng = Number(row.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return '-';
  }
  const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return `<a class="map-link" href="${url}" target="_blank" rel="noopener">Ver mapa<span>${label}</span></a>`;
}

function renderTable({ columns, actions = () => '' }) {
  const tbody = qs('#tableBody');
  const pageInfo = qs('#pageInfo');
  if (!tbody) return;

  const start = (state.page - 1) * state.pageSize;
  const rows = state.filtered.slice(start, start + state.pageSize);
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              ${columns.map((column) => `<td class="${column.className || ''}">${column.render ? column.render(row) : row[column.key] ?? '-'}</td>`).join('')}
              <td><div class="table-actions">${actions(row)}</div></td>
            </tr>
          `
        )
        .join('')
    : `<tr><td colspan="${columns.length + 1}"><div class="empty-state">No hay registros para mostrar</div></td></tr>`;

  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  pageInfo && (pageInfo.textContent = `Pagina ${state.page} de ${totalPages}`);
  qs('#prevPage') && (qs('#prevPage').disabled = state.page <= 1);
  qs('#nextPage') && (qs('#nextPage').disabled = state.page >= totalPages);
}

function bindTableControls(render) {
  qs('#searchInput')?.addEventListener('input', applyFilters(render));
  qsa('[data-filter]').forEach((filter) => filter.addEventListener('change', applyFilters(render)));
  qsa('[data-date-from], [data-date-to]').forEach((filter) => filter.addEventListener('change', applyFilters(render)));
  qs('#prevPage')?.addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1);
    render();
  });
  qs('#nextPage')?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(totalPages, state.page + 1);
    render();
  });
}

function applyFilters(render) {
  return () => {
    const search = (qs('#searchInput')?.value || '').trim().toLowerCase();
    const dateFrom = qs('[data-date-from]')?.value || '';
    const dateTo = qs('[data-date-to]')?.value || '';
    state.filtered = state.rows.filter((row) => {
      const matchesSearch = !search || JSON.stringify(row).toLowerCase().includes(search);
      const matchesFilters = qsa('[data-filter]').every((filter) => {
        if (!filter.value) return true;
        const key = filter.dataset.filter;
        return String(row[key]) === filter.value;
      });
      const rowDate = dateOnly(row.fecha);
      const isOpenVisit = row.hora_salida === null || row.hora_salida === undefined || row.hora_salida === '';
      const matchesDateFrom = isOpenVisit || !dateFrom || (rowDate && rowDate >= dateFrom);
      const matchesDateTo = isOpenVisit || !dateTo || (rowDate && rowDate <= dateTo);
      return matchesSearch && matchesFilters && matchesDateFrom && matchesDateTo;
    });
    state.page = 1;
    render();
  };
}

function openModal(title, body, onSubmit) {
  qs('#modalTitle').textContent = title;
  qs('#modalBody').innerHTML = body;
  qs('#modal').classList.add('show');
  const form = qs('#modalForm');
  form.onsubmit = async (event) => {
    event.preventDefault();
    await onSubmit(new FormData(form));
    closeModal();
  };
}

function closeModal() {
  qs('#modal')?.classList.remove('show');
  qs('#modalForm') && (qs('#modalForm').onsubmit = null);
}

function bindModal() {
  qs('#modalClose')?.addEventListener('click', closeModal);
  qs('#modalCancel')?.addEventListener('click', closeModal);
}

function formValue(form, key, fallback = null) {
  const value = form.get(key);
  return value === '' || value === null ? fallback : value;
}

async function initLogin() {
  if (!isLoginPage()) return;
  if (getToken() && getUser()) {
    const user = getUser();
    location.href = normalizeRole(user.rol) === 'administrador' ? 'dashboard-admin.html' : 'dashboard-vendedor.html';
    return;
  }
  qs('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
      });
      const session = setUserSession(data);
      location.href = normalizeRole(session.usuario.rol) === 'administrador' ? 'dashboard-admin.html' : 'dashboard-vendedor.html';
    } catch (error) {
      alertMessage(error.message, 'error');
    }
  });
}

async function loadDashboardAdmin() {
  if (!document.body.dataset.page?.includes('dashboard-admin')) return;
  requireAuth(['administrador']);
  const [clientes, vendedores, visitas] = await Promise.all([
    apiFetch('/clientes'),
    apiFetch('/vendedores'),
    apiFetch('/visitas')
  ]);
  const adminDateFilter = qs('#adminDateFilter');
  if (adminDateFilter && !adminDateFilter.value) adminDateFilter.value = todayISO();

  const renderAdminDashboard = () => {
    const selectedDate = adminDateFilter?.value || '';
    const visitasFiltradas = selectedDate ? visitas.filter((item) => dateOnly(item.fecha) === selectedDate) : visitas;

    qs('#metricClientes').textContent = clientes.length;
    qs('#metricVendedores').textContent = vendedores.filter((item) => item.activo).length;
    qs('#metricVisitas').textContent = visitasFiltradas.length;
    qs('#metricCompras').textContent = visitasFiltradas.filter((item) => item.estado === 'compro' || (!item.estado && item.compro)).length;
    state.rows = visitasFiltradas.slice(0, 8);
    state.filtered = state.rows;
    renderTable({
      columns: [
        { key: 'cliente', render: (row) => row.cliente || '-' },
        { key: 'vendedor', render: (row) => row.vendedor || '-' },
        { key: 'fecha', render: (row) => formatDate(row.fecha) },
        { key: 'hora_llegada' },
        { key: 'observaciones', className: 'observation-cell', render: (row) => fullObservation(row.observaciones) },
        { key: 'proxima_visita', render: (row) => formatDate(row.proxima_visita) },
        { key: 'ubicacion', render: mapLink },
        { key: 'estado', render: visitStatusBadge }
      ]
    });
  };

  renderAdminDashboard();
  adminDateFilter?.addEventListener('change', renderAdminDashboard);
}

function vendedorVisitColumns() {
  return [
    { key: 'cliente', render: (row) => row.cliente || '-' },
    { key: 'fecha', render: (row) => formatDate(row.fecha) },
    { key: 'hora_llegada' },
    { key: 'hora_salida', render: (row) => row.hora_salida || '-' },
    { key: 'observaciones', className: 'observation-cell', render: (row) => fullObservation(row.observaciones) },
    { key: 'proxima_visita', render: (row) => formatDate(row.proxima_visita) },
    { key: 'ubicacion', render: mapLink },
    { key: 'estado', render: visitStatusBadge }
  ];
}

function vendedorVisitActions(row) {
  return !row.hora_salida ? `<button class="btn btn-primary" data-end-visit="${row.id}">Finalizar</button>` : '';
}

function renderVendedorVisitsTable() {
  renderTable({
    columns: vendedorVisitColumns(),
    actions: vendedorVisitActions
  });
  qs('#metricMisVisitas') && (qs('#metricMisVisitas').textContent = state.filtered.length);
  qs('#metricPendientes') && (qs('#metricPendientes').textContent = state.filtered.filter((item) => !item.hora_salida).length);
}

async function refreshVendedorVisits() {
  const user = getUser();
  const visitas = await apiFetch(`/visitas/vendedor/${user.vendedor_id || user.id}`).catch(() => []);
  state.rows = visitas;
  state.filtered = visitas;
  applyFilters(renderVendedorVisitsTable)();
}

async function loadDashboardVendedor() {
  if (!document.body.dataset.page?.includes('dashboard-vendedor')) return;
  requireAuth(['vendedor', 'administrador']);
  await populateClientes('#clienteVisita');
  qsa('[data-date-from], [data-date-to]').forEach((filter) => {
    if (!filter.value) filter.value = todayISO();
  });
  await refreshVendedorVisits();
  bindTableControls(renderVendedorVisitsTable);
  qs('#startVisitForm').addEventListener('submit', startVisit);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-end-visit]');
    if (button) finishVisit(button.dataset.endVisit);
  });
}

async function populateClientes(selector) {
  const select = qs(selector);
  if (!select) return [];
  const clientes = await apiFetch('/clientes');
  select.innerHTML = '<option value="">Seleccionar cliente</option>' + clientes.map((cliente) => `<option value="${cliente.id}">${cliente.nombre_comercial}</option>`).join('');
  return clientes;
}

async function populateVendedores(selector) {
  const select = qs(selector);
  if (!select) return [];
  const vendedores = await apiFetch('/vendedores');
  select.innerHTML = '<option value="">Seleccionar vendedor</option>' + vendedores.map((vendedor) => `<option value="${vendedor.id}">${vendedor.nombre}</option>`).join('');
  return vendedores;
}

async function loadMunicipios() {
  state.municipios = await apiFetch('/municipios?active=true');
  return state.municipios;
}

function municipioOptions(selectedCodigo = '') {
  return state.municipios
    .map((municipio) => {
      const selected = String(municipio.codigo) === String(selectedCodigo) ? 'selected' : '';
      return `<option value="${municipio.codigo}" ${selected}>${municipio.codigo} - ${municipio.nombre}</option>`;
    })
    .join('');
}

function vendedorOptions(selectedId = '') {
  return state.vendedores
    .map((vendedor) => {
      const selected = String(vendedor.id) === String(selectedId || '') ? 'selected' : '';
      return `<option value="${vendedor.id}" ${selected}>${vendedor.nombre}</option>`;
    })
    .join('');
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('El navegador no soporta geolocalizacion'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    });
  });
}

async function startVisit(event) {
  event.preventDefault();
  try {
    const form = new FormData(event.currentTarget);
    const position = await getPosition();
    const user = getUser();
    const now = new Date();
    const payload = {
      cliente_id: form.get('cliente_id'),
      vendedor_id: form.get('vendedor_id') || user.vendedor_id || user.id,
      fecha: todayISO(),
      hora_llegada: formatTime(now),
      observaciones: form.get('observaciones') || null,
      latitud: position.coords.latitude,
      longitud: position.coords.longitude,
      precision_gps: position.coords.accuracy
    };
    const visit = await apiFetch('/visitas/iniciar', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.activeVisit = visit;
    qs('#visitStatus').innerHTML = `Visita iniciada a las <strong>${visit.hora_llegada}</strong>. GPS: ${Number(visit.latitud).toFixed(5)}, ${Number(visit.longitud).toFixed(5)}`;
    alertMessage('Visita iniciada correctamente');
    const formElement = event.currentTarget;
    if (formElement && typeof formElement.reset === 'function') {
      formElement.reset();
    }
    await populateClientes('#clienteVisita');
    await refreshVendedorVisits();
  } catch (error) {
    alertMessage(error.message || 'No fue posible iniciar la visita', 'error');
  }
}

async function finishVisit(id = null) {
  const visitId = id || state.activeVisit?.id;
  if (!visitId) {
    alertMessage('No hay una visita activa para finalizar', 'error');
    return;
  }
  const esRepartidor = getUser()?.es_repartidor === true;
  const opcionesEstado = esRepartidor
    ? `
      <option value="pedido_entregado">Pedido entregado</option>
      <option value="cambios_entregados_recogidos">Cambios entregados y/o recogidos</option>
      <option value="cliente_cerrado">Cliente cerrado</option>
    `
    : `
      <option value="compro">Compr&oacute;</option>
      <option value="no_compro">No Compr&oacute;</option>
      <option value="cerrado">Cerrado</option>
      <option value="reprogramado">Reprogramado</option>
      <option value="otro">Otro</option>
    `;

  openModal(
    'Finalizar visita',
    `
      <div class="form-grid">
        <label>Estado
          <select class="select" name="estado" required>
            ${opcionesEstado}
          </select>
        </label>
        <label>Proxima visita
          <input class="input" type="date" name="proxima_visita">
        </label>
        <label class="span-2">Observaciones
          <textarea class="textarea" name="observaciones"></textarea>
        </label>
      </div>
    `,
    async (form) => {
      await apiFetch(`/visitas/finalizar/${visitId}`, {
        method: 'PUT',
        body: JSON.stringify({
          hora_salida: formatTime(new Date()),
          estado: form.get('estado'),
          compro: form.get('estado') === 'compro',
          observaciones: formValue(form, 'observaciones'),
          proxima_visita: formValue(form, 'proxima_visita')
        })
      });
      alertMessage('Visita finalizada');
      await refreshVendedorVisits();
    }
  );
}

async function loadClientes() {
  if (!document.body.dataset.page?.includes('clientes')) return;
  requireAuth(['administrador', 'vendedor']);
  const user = getUser();
  const canEdit = isAdmin(user);
  qs('#newClientBtn') && (qs('#newClientBtn').style.display = '');
  const requests = [apiFetch('/clientes'), loadMunicipios()];
  if (canEdit) requests.push(apiFetch('/vendedores'));
  const [clientes, , vendedores = []] = await Promise.all(requests);
  state.vendedores = vendedores;
  state.rows = clientes;
  state.filtered = state.rows;
  const render = () => renderTable({
    columns: [
      { key: 'foto_url', render: (row) => row.foto_url ? `<img class="avatar" src="${row.foto_url}" alt="">` : '<span class="avatar">C</span>' },
      { key: 'nombre_comercial' },
      { key: 'municipio', render: (row) => row.municipio_codigo ? `${row.municipio_codigo} - ${row.municipio}` : row.municipio || '-' },
      { key: 'vendedor', render: (row) => row.vendedor || 'Sin asignar' },
      { key: 'contacto', render: (row) => row.contacto || '-' },
      { key: 'telefono', render: (row) => row.telefono || '-' },
      { key: 'activo', render: (row) => boolBadge(row.activo !== false) }
    ],
    actions: (row) => canEdit ? `<button class="btn" data-edit-client="${row.id}">Editar</button><button class="btn btn-danger" data-delete-client="${row.id}">Desactivar</button>` : ''
  });
  render();
  bindTableControls(render);
  qs('#newClientBtn')?.addEventListener('click', () => clientModal());
  document.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit-client]');
    const del = event.target.closest('[data-delete-client]');
    if (edit) clientModal(state.rows.find((row) => String(row.id) === edit.dataset.editClient));
    if (del && confirm('Deseas desactivar este cliente?')) {
      await apiFetch(`/clientes/${del.dataset.deleteClient}`, { method: 'DELETE' });
      alertMessage('Cliente desactivado');
      location.reload();
    }
  });
}

function clientModal(client = {}) {
  const user = getUser();
  const canAssignSeller = isAdmin(user);
  openModal(
    client.id ? 'Editar cliente' : 'Nuevo cliente',
    `
      <div class="form-grid">
        <label>Codigo municipio
          <select class="select" name="municipio_codigo" required>
            <option value="">Seleccionar municipio</option>
            ${municipioOptions(client.municipio_codigo)}
          </select>
        </label>
        ${canAssignSeller ? `<label>Asignar vendedor
            <select class="select" name="vendedor_id">
              <option value="">Sin asignar</option>
              ${vendedorOptions(client.vendedor_id)}
            </select>
          </label>` : ''}
        <label>Nombre comercial <input class="input" name="nombre_comercial" value="${escapeHtml(client.nombre_comercial || '')}" required></label>
        <label>Contacto <input class="input" name="contacto" value="${escapeHtml(client.contacto || '')}"></label>
        <label>Telefono <input class="input" name="telefono" value="${escapeHtml(client.telefono || '')}"></label>
        <label>Foto cliente <input class="input" name="foto" type="file" accept="image/png,image/jpeg,image/webp"></label>
        <label class="span-2">Direccion <input class="input" name="direccion" value="${escapeHtml(client.direccion || '')}"></label>
      </div>
    `,
    async (form) => {
      const payload = Object.fromEntries(form.entries());
      delete payload.foto;
      const fotoUrl = await fileToDataUrl(form.get('foto'));
      if (fotoUrl) payload.foto_url = fotoUrl;
      await apiFetch(client.id ? `/clientes/${client.id}` : '/clientes', {
        method: client.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      alertMessage(client.id ? 'Cliente actualizado' : 'Cliente creado');
      location.reload();
    }
  );
}

async function loadVendedores() {
  if (!document.body.dataset.page?.includes('vendedores')) return;
  requireAuth(['administrador']);
  state.rows = await apiFetch('/vendedores');
  state.filtered = state.rows;
  const render = () => renderTable({
    columns: [
      { key: 'foto_url', render: (row) => row.foto_url ? `<img class="avatar" src="${row.foto_url}" alt="">` : '<span class="avatar">V</span>' },
      { key: 'nombre' },
      { key: 'usuario' },
      { key: 'documento', render: (row) => row.documento || '-' },
      { key: 'activo', render: (row) => boolBadge(row.activo) }
    ],
    actions: (row) => `<button class="btn" data-edit-seller="${row.id}">Editar</button><button class="btn btn-danger" data-delete-seller="${row.id}">Desactivar</button>`
  });
  render();
  bindTableControls(render);
  qs('#newSellerBtn')?.addEventListener('click', () => sellerModal());
  document.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit-seller]');
    const del = event.target.closest('[data-delete-seller]');
    if (edit) sellerModal(state.rows.find((row) => String(row.id) === edit.dataset.editSeller));
    if (del && confirm('Deseas desactivar este vendedor?')) {
      await apiFetch(`/vendedores/${del.dataset.deleteSeller}`, { method: 'DELETE' });
      alertMessage('Vendedor desactivado');
      location.reload();
    }
  });
}

function sellerModal(seller = {}) {
  openModal(
    seller.id ? 'Editar vendedor' : 'Nuevo vendedor',
    `
      <div class="form-grid">
        <label>Nombre <input class="input" name="nombre" value="${seller.nombre || ''}" required></label>
        <label>Documento <input class="input" name="documento" value="${seller.documento || ''}"></label>
        <label>Usuario <input class="input" name="usuario" value="${seller.usuario || ''}" required></label>
        <label>Foto <input class="input" name="foto" type="file" accept="image/png,image/jpeg,image/webp"></label>
        ${seller.id ? `<label>Nueva contrasena <input class="input" name="password" type="password" minlength="6" placeholder="Dejar vacia para conservar"></label><label>Estado <select class="select" name="activo"><option value="true" ${seller.activo !== false ? 'selected' : ''}>Activo</option><option value="false" ${seller.activo === false ? 'selected' : ''}>Inactivo</option></select></label>` : '<label>Password <input class="input" name="password" type="password" value="123456" required></label>'}
      </div>
    `,
    async (form) => {
      const payload = Object.fromEntries(form.entries());
      delete payload.foto;
      if (!payload.password) delete payload.password;
      const fotoUrl = await fileToDataUrl(form.get('foto'));
      if (fotoUrl) payload.foto_url = fotoUrl;
      if ('activo' in payload) payload.activo = payload.activo === 'true';
      await apiFetch(seller.id ? `/vendedores/${seller.id}` : '/vendedores', {
        method: seller.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      alertMessage(seller.id ? 'Vendedor actualizado' : 'Vendedor creado');
      location.reload();
    }
  );
}

async function loadMunicipiosAdmin() {
  if (!document.body.dataset.page?.includes('municipios')) return;
  requireAuth(['administrador']);
  state.rows = await apiFetch('/municipios');
  state.filtered = state.rows;
  const render = () => renderTable({
    columns: [
      { key: 'codigo' },
      { key: 'nombre' },
      { key: 'departamento' },
      { key: 'region', render: (row) => row.region || '-' },
      { key: 'activo', render: (row) => boolBadge(row.activo !== false) }
    ],
    actions: (row) => `<button class="btn" data-edit-city="${row.id}">Editar</button><button class="btn btn-danger" data-delete-city="${row.id}">Desactivar</button>`
  });
  render();
  bindTableControls(render);
  qs('#newCityBtn')?.addEventListener('click', () => municipioModal());
  document.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit-city]');
    const del = event.target.closest('[data-delete-city]');
    if (edit) municipioModal(state.rows.find((row) => String(row.id) === edit.dataset.editCity));
    if (del && confirm('Deseas desactivar este municipio?')) {
      await apiFetch(`/municipios/${del.dataset.deleteCity}`, { method: 'DELETE' });
      alertMessage('Municipio desactivado');
      location.reload();
    }
  });
}

function municipioModal(municipio = {}) {
  openModal(
    municipio.id ? 'Editar municipio' : 'Nuevo municipio',
    `
      <div class="form-grid">
        <label>Nombre <input class="input" name="nombre" value="${escapeHtml(municipio.nombre || '')}" required></label>
        <label>Departamento <input class="input" name="departamento" value="${escapeHtml(municipio.departamento || '')}" required></label>
        <label>Region <input class="input" name="region" value="${escapeHtml(municipio.region || '')}"></label>
        ${municipio.id ? `<label>Estado <select class="select" name="activo"><option value="true" ${municipio.activo !== false ? 'selected' : ''}>Activo</option><option value="false" ${municipio.activo === false ? 'selected' : ''}>Inactivo</option></select></label>` : ''}
        <p class="span-2 sidebar-subtitle">El codigo se genera automaticamente con las primeras 5 letras del nombre mas un consecutivo.</p>
      </div>
    `,
    async (form) => {
      const payload = Object.fromEntries(form.entries());
      if ('activo' in payload) payload.activo = payload.activo === 'true';
      await apiFetch(municipio.id ? `/municipios/${municipio.id}` : '/municipios', {
        method: municipio.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      alertMessage(municipio.id ? 'Municipio actualizado' : 'Municipio creado');
      location.reload();
    }
  );
}

async function loadVisitas() {
  if (!document.body.dataset.page?.includes('visitas')) return;
  requireAuth(['administrador']);
  await Promise.all([populateClientes('#filterCliente'), populateVendedores('#filterVendedor')]);
  qsa('[data-date-from], [data-date-to]').forEach((filter) => {
    if (!filter.value) filter.value = todayISO();
  });
  state.rows = await apiFetch('/visitas');
  state.filtered = state.rows;
  const render = () => renderTable({
    columns: [
      { key: 'cliente', render: (row) => row.cliente || '-' },
      { key: 'vendedor', render: (row) => row.vendedor || '-' },
      { key: 'fecha', render: (row) => formatDate(row.fecha) },
      { key: 'hora_llegada' },
      { key: 'hora_salida', render: (row) => row.hora_salida || '-' },
      { key: 'observaciones', className: 'observation-cell', render: (row) => fullObservation(row.observaciones) },
      { key: 'proxima_visita', render: (row) => formatDate(row.proxima_visita) },
      { key: 'ubicacion', render: mapLink },
      { key: 'estado', render: visitStatusBadge }
    ]
  });
  applyFilters(render)();
  bindTableControls(render);
}

function initConfiguracion() {
  if (!document.body.dataset.page?.includes('configuracion')) return;
  requireAuth(['administrador', 'vendedor']);
  const user = getUser();
  qs('#businessPanel') && (qs('#businessPanel').style.display = isAdmin(user) ? '' : 'none');
  qs('#profileName').textContent = user.nombres || user.usuario;
  qs('#profileUser').textContent = user.usuario;
  qs('#profileRole').textContent = normalizeRole(user.rol);
  qs('#passwordForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await apiFetch('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
      });
      const formElement = event.currentTarget;
      if (formElement && typeof formElement.reset === 'function') {
        formElement.reset();
      }
      alertMessage('Password actualizado');
    } catch (error) {
      alertMessage(error.message, 'error');
    }
  });
  loadConfiguracionNegocio();
  qs('#businessForm')?.addEventListener('submit', saveConfiguracionNegocio);
}

async function loadConfiguracionNegocio() {
  const form = qs('#businessForm');
  if (!form) return;
  const config = await apiFetch('/configuracion');
  form.nombre_negocio.value = config.nombre_negocio || '';
  qs('#logoPreview') && (qs('#logoPreview').innerHTML = config.logo_url ? `<img class="logo-preview" src="${config.logo_url}" alt="">` : '<span class="badge">Sin logo</span>');
}

async function saveConfiguracionNegocio(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const logoUrl = await fileToDataUrl(form.get('logo'));
  const payload = {
    nombre_negocio: form.get('nombre_negocio')
  };
  if (logoUrl) payload.logo_url = logoUrl;
  await apiFetch('/configuracion', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  alertMessage('Configuracion del negocio actualizada');
  await loadBusinessBrand();
  await loadConfiguracionNegocio();
}

async function boot() {
  initTheme();
  await initLogin();
  if (!isLoginPage()) {
    requireAuth();
    shell();
    bindModal();
    await loadDashboardAdmin();
    await loadDashboardVendedor();
    await loadClientes();
    await loadVendedores();
    await loadMunicipiosAdmin();
    await loadVisitas();
    initConfiguracion();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((error) => alertMessage(error.message, 'error'));
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeAuthPayload,
    normalizeRole,
    setUserSession
  };
}
