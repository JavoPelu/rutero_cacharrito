const API_BASE = window.APP_API_BASE || '/api';
const TOKEN_KEY = 'rutero_token';
const USER_KEY = 'rutero_user';
const THEME_KEY = 'rutero_theme';

const state = {
  page: 1,
  pageSize: 8,
  rows: [],
  filtered: [],
  editing: null,
  activeVisit: null
};

const routes = {
  admin: [
    ['dashboard-admin.html', 'Inicio', '⌂'],
    ['clientes.html', 'Clientes', '□'],
    ['vendedores.html', 'Vendedores', '◇'],
    ['visitas.html', 'Visitas', '◉'],
    ['configuracion.html', 'Configuracion', '⚙']
  ],
  vendedor: [
    ['dashboard-vendedor.html', 'Mi ruta', '⌂'],
    ['clientes.html', 'Clientes', '□'],
    ['configuracion.html', 'Configuracion', '⚙']
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
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch (_error) {
    return null;
  }
}

function setUserSession(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
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

function requireAuth(roles = []) {
  if (location.pathname.endsWith('login.html')) return;
  const user = getUser();
  if (!getToken() || !user) {
    location.href = 'login.html';
    return;
  }
  if (roles.length && !roles.includes(user.rol)) {
    location.href = user.rol === 'administrador' ? 'dashboard-admin.html' : 'dashboard-vendedor.html';
  }
}

function shell() {
  const user = getUser();
  const sidebar = qs('#sidebar');
  if (!sidebar || !user) return;
  const current = location.pathname.split('/').pop() || 'dashboard-admin.html';
  const roleRoutes = routes[user.rol] || routes.vendedor;

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="brand-mark">RC</div>
      <div>
        <div class="sidebar-title">Rutero Cacharrito</div>
        <div class="sidebar-subtitle">${user.rol}</div>
      </div>
    </div>
    <nav class="nav-menu">
      ${roleRoutes
        .map(([href, label, icon]) => `<a class="nav-link ${href === current ? 'active' : ''}" href="${href}"><span>${icon}</span>${label}</a>`)
        .join('')}
    </nav>
  `;

  qs('#userName') && (qs('#userName').textContent = user.nombres || user.usuario);
  qs('#userRole') && (qs('#userRole').textContent = user.rol);
  qs('#logoutBtn')?.addEventListener('click', logout);
  qs('#mobileMenu')?.addEventListener('click', () => sidebar.classList.toggle('open'));
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function formatTime(date = new Date()) {
  return date.toTimeString().slice(0, 8);
}

function boolBadge(value) {
  return value ? '<span class="badge success">Activo</span>' : '<span class="badge danger">Inactivo</span>';
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
              ${columns.map((column) => `<td>${column.render ? column.render(row) : row[column.key] ?? '-'}</td>`).join('')}
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
    state.filtered = state.rows.filter((row) => {
      const matchesSearch = !search || JSON.stringify(row).toLowerCase().includes(search);
      const matchesFilters = qsa('[data-filter]').every((filter) => {
        if (!filter.value) return true;
        const key = filter.dataset.filter;
        return String(row[key]) === filter.value;
      });
      return matchesSearch && matchesFilters;
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
  if (!location.pathname.endsWith('login.html')) return;
  if (getToken() && getUser()) {
    const user = getUser();
    location.href = user.rol === 'administrador' ? 'dashboard-admin.html' : 'dashboard-vendedor.html';
    return;
  }
  qs('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
      });
      setUserSession(data);
      location.href = data.usuario.rol === 'administrador' ? 'dashboard-admin.html' : 'dashboard-vendedor.html';
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
  qs('#metricClientes').textContent = clientes.length;
  qs('#metricVendedores').textContent = vendedores.filter((item) => item.activo).length;
  qs('#metricVisitas').textContent = visitas.length;
  qs('#metricCompras').textContent = visitas.filter((item) => item.compro).length;
  state.rows = visitas.slice(0, 8);
  state.filtered = state.rows;
  renderTable({
    columns: [
      { key: 'cliente', render: (row) => row.cliente || '-' },
      { key: 'vendedor', render: (row) => row.vendedor || '-' },
      { key: 'fecha', render: (row) => formatDate(row.fecha) },
      { key: 'hora_llegada' },
      { key: 'compro', render: (row) => (row.compro ? '<span class="badge success">Compro</span>' : '<span class="badge warning">Pendiente/No</span>') }
    ]
  });
}

async function loadDashboardVendedor() {
  if (!document.body.dataset.page?.includes('dashboard-vendedor')) return;
  requireAuth(['vendedor', 'administrador']);
  await populateClientes('#clienteVisita');
  const user = getUser();
  const visitas = await apiFetch(`/visitas/vendedor/${user.vendedor_id || user.id}`).catch(() => []);
  qs('#metricMisVisitas').textContent = visitas.length;
  qs('#metricPendientes').textContent = visitas.filter((item) => !item.hora_salida).length;
  state.rows = visitas;
  state.filtered = visitas;
  renderTable({
    columns: [
      { key: 'cliente', render: (row) => row.cliente || '-' },
      { key: 'fecha', render: (row) => formatDate(row.fecha) },
      { key: 'hora_llegada' },
      { key: 'hora_salida', render: (row) => row.hora_salida || '-' },
      { key: 'compro', render: (row) => (row.compro ? '<span class="badge success">Compro</span>' : '<span class="badge warning">Sin cierre</span>') }
    ],
    actions: (row) => (!row.hora_salida ? `<button class="btn btn-primary" data-end-visit="${row.id}">Finalizar</button>` : '')
  });
  bindTableControls(() => renderTable({
    columns: [
      { key: 'cliente', render: (row) => row.cliente || '-' },
      { key: 'fecha', render: (row) => formatDate(row.fecha) },
      { key: 'hora_llegada' },
      { key: 'hora_salida', render: (row) => row.hora_salida || '-' },
      { key: 'compro', render: (row) => (row.compro ? '<span class="badge success">Compro</span>' : '<span class="badge warning">Sin cierre</span>') }
    ],
    actions: (row) => (!row.hora_salida ? `<button class="btn btn-primary" data-end-visit="${row.id}">Finalizar</button>` : '')
  }));
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
      fecha: now.toISOString().slice(0, 10),
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
  openModal(
    'Finalizar visita',
    `
      <div class="form-grid">
        <label>Resultado
          <select class="select" name="compro" required>
            <option value="true">Cliente compro</option>
            <option value="false">Cliente no compro</option>
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
          compro: form.get('compro') === 'true',
          observaciones: formValue(form, 'observaciones'),
          proxima_visita: formValue(form, 'proxima_visita')
        })
      });
      alertMessage('Visita finalizada');
      location.reload();
    }
  );
}

async function loadClientes() {
  if (!document.body.dataset.page?.includes('clientes')) return;
  requireAuth(['administrador', 'vendedor']);
  const user = getUser();
  const canEdit = user.rol === 'administrador';
  qs('#newClientBtn') && (qs('#newClientBtn').style.display = canEdit ? '' : 'none');
  state.rows = await apiFetch('/clientes');
  state.filtered = state.rows;
  const render = () => renderTable({
    columns: [
      { key: 'nombre_comercial' },
      { key: 'municipio', render: (row) => row.municipio || row.municipio_id || '-' },
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
  openModal(
    client.id ? 'Editar cliente' : 'Nuevo cliente',
    `
      <div class="form-grid">
        <label>Municipio ID <input class="input" name="municipio_id" type="number" value="${client.municipio_id || ''}" required></label>
        <label>Nombre comercial <input class="input" name="nombre_comercial" value="${client.nombre_comercial || ''}" required></label>
        <label>Razon social <input class="input" name="razon_social" value="${client.razon_social || ''}"></label>
        <label>NIT <input class="input" name="nit" value="${client.nit || ''}"></label>
        <label>Contacto <input class="input" name="contacto" value="${client.contacto || ''}"></label>
        <label>Telefono <input class="input" name="telefono" value="${client.telefono || ''}"></label>
        <label>Latitud <input class="input" name="latitud" type="number" step="any" value="${client.latitud || ''}"></label>
        <label>Longitud <input class="input" name="longitud" type="number" step="any" value="${client.longitud || ''}"></label>
        <label class="span-2">Direccion <input class="input" name="direccion" value="${client.direccion || ''}"></label>
      </div>
    `,
    async (form) => {
      const payload = Object.fromEntries(form.entries());
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
        ${seller.id ? '<label>Estado <select class="select" name="activo"><option value="true">Activo</option><option value="false">Inactivo</option></select></label>' : '<label>Password <input class="input" name="password" type="password" value="123456" required></label>'}
      </div>
    `,
    async (form) => {
      const payload = Object.fromEntries(form.entries());
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

async function loadVisitas() {
  if (!document.body.dataset.page?.includes('visitas')) return;
  requireAuth(['administrador']);
  await Promise.all([populateClientes('#filterCliente'), populateVendedores('#filterVendedor')]);
  state.rows = await apiFetch('/visitas');
  state.filtered = state.rows;
  const render = () => renderTable({
    columns: [
      { key: 'cliente', render: (row) => row.cliente || '-' },
      { key: 'vendedor', render: (row) => row.vendedor || '-' },
      { key: 'fecha', render: (row) => formatDate(row.fecha) },
      { key: 'hora_llegada' },
      { key: 'hora_salida', render: (row) => row.hora_salida || '-' },
      { key: 'compro', render: (row) => (row.compro ? '<span class="badge success">Compro</span>' : '<span class="badge warning">No/Pendiente</span>') }
    ]
  });
  render();
  bindTableControls(render);
}

function initConfiguracion() {
  if (!document.body.dataset.page?.includes('configuracion')) return;
  requireAuth(['administrador', 'vendedor']);
  const user = getUser();
  qs('#profileName').textContent = user.nombres || user.usuario;
  qs('#profileUser').textContent = user.usuario;
  qs('#profileRole').textContent = user.rol;
  qs('#passwordForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await apiFetch('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
      });
      event.currentTarget.reset();
      alertMessage('Password actualizado');
    } catch (error) {
      alertMessage(error.message, 'error');
    }
  });
}

async function boot() {
  initTheme();
  await initLogin();
  if (!location.pathname.endsWith('login.html')) {
    requireAuth();
    shell();
    bindModal();
    await loadDashboardAdmin();
    await loadDashboardVendedor();
    await loadClientes();
    await loadVendedores();
    await loadVisitas();
    initConfiguracion();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  boot().catch((error) => alertMessage(error.message, 'error'));
});
