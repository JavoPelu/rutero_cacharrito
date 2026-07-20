const db = require('../config/db');

const ESTADOS_VENDEDOR = ['compro', 'no_compro', 'cerrado', 'reprogramado', 'otro'];
const ESTADOS_REPARTIDOR = ['pedido_entregado', 'cambios_entregados_recogidos', 'cliente_cerrado'];
const ESTADOS_VISITA = [...ESTADOS_VENDEDOR, ...ESTADOS_REPARTIDOR];

function estadosPermitidos(user = {}) {
  if (user.rol === 'administrador') {
    return ESTADOS_VISITA;
  }
  return user.es_repartidor ? ESTADOS_REPARTIDOR : ESTADOS_VENDEDOR;
}

function fechaColombiaISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validarGps({ latitud, longitud, precision_gps }) {
  const lat = Number(latitud);
  const lng = Number(longitud);
  const precision = precision_gps === undefined || precision_gps === null ? null : Number(precision_gps);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (precision === null || (Number.isFinite(precision) && precision >= 0))
  );
}

async function listar() {
  const result = await db.query(
    `SELECT vi.*, c.nombre_comercial AS cliente, v.nombre AS vendedor
     FROM visitas vi
     INNER JOIN clientes c ON c.id = vi.cliente_id
     INNER JOIN vendedores v ON v.id = vi.vendedor_id
     ORDER BY vi.fecha DESC, vi.hora_llegada DESC`
  );
  return result.rows;
}

async function iniciar(data, user = {}) {
  const { cliente_id, hora_llegada, observaciones, latitud, longitud, precision_gps } = data;

  // El vendedor_id nunca se toma del body: un vendedor solo puede iniciar
  // visitas a su propio nombre. El admin sí puede indicar cualquiera.
  const vendedor_id = user.rol === 'administrador' ? data.vendedor_id : user.vendedor_id;

  if (!cliente_id || !vendedor_id || !hora_llegada || !validarGps({ latitud, longitud, precision_gps })) {
    const error = new Error('Cliente, vendedor, hora de llegada y GPS válido son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO visitas
     (cliente_id, vendedor_id, fecha, hora_llegada, observaciones, latitud, longitud, precision_gps)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      cliente_id,
      vendedor_id,
      fechaColombiaISO(),
      hora_llegada,
      observaciones || null,
      latitud,
      longitud,
      precision_gps || null
    ]
  );

  return result.rows[0];
}

async function finalizar(id, data, user = {}) {
  const existente = await db.query('SELECT id, vendedor_id, hora_salida FROM visitas WHERE id = $1', [id]);
  const visita = existente.rows[0];

  if (!visita) {
    const error = new Error('Visita no encontrada');
    error.status = 404;
    throw error;
  }

  if (user.rol === 'vendedor' && visita.vendedor_id !== user.vendedor_id) {
    const error = new Error('No puede finalizar visitas de otro vendedor');
    error.status = 403;
    throw error;
  }

  const { hora_salida, compro, estado, observaciones, proxima_visita } = data;
  const permitidos = estadosPermitidos(user);
  const estadoFinal = estado || (compro === true ? 'compro' : 'no_compro');

  if (!hora_salida || !permitidos.includes(estadoFinal)) {
    const error = new Error('Hora de salida y estado de visita son obligatorios');
    error.status = 400;
    throw error;
  }

  const comproFinal = typeof compro === 'boolean' ? compro : estadoFinal === 'compro';

  const result = await db.query(
    `UPDATE visitas
     SET hora_salida = $1,
         compro = $2,
         estado = $3,
         observaciones = COALESCE($4, observaciones),
         proxima_visita = $5,
         actualizado_en = NOW()
     WHERE id = $6
     RETURNING *`,
    [hora_salida, comproFinal, estadoFinal, observaciones || null, proxima_visita || null, id]
  );

  return result.rows[0];
}

function puedeVerTodo(user = {}) {
  return user.rol === 'administrador' || user.es_repartidor === true;
}

async function listarPorVendedor(vendedorId, user = {}) {
  if (!puedeVerTodo(user) && Number(vendedorId) !== Number(user.vendedor_id)) {
    const error = new Error('No puede ver el historial de otro vendedor');
    error.status = 403;
    throw error;
  }

  const result = await db.query(
    `SELECT vi.*, c.nombre_comercial AS cliente
     FROM visitas vi
     INNER JOIN clientes c ON c.id = vi.cliente_id
     WHERE vi.vendedor_id = $1
     ORDER BY vi.fecha DESC, vi.hora_llegada DESC`,
    [vendedorId]
  );
  return result.rows;
}

async function listarPorCliente(clienteId, user = {}) {
  if (!puedeVerTodo(user)) {
    const propio = await db.query('SELECT id FROM clientes WHERE id = $1 AND vendedor_id = $2', [
      clienteId,
      user.vendedor_id
    ]);
    if (!propio.rows[0]) {
      const error = new Error('No puede ver el historial de un cliente que no es suyo');
      error.status = 403;
      throw error;
    }
  }

  const result = await db.query(
    `SELECT vi.*, v.nombre AS vendedor
     FROM visitas vi
     INNER JOIN vendedores v ON v.id = vi.vendedor_id
     WHERE vi.cliente_id = $1
     ORDER BY vi.fecha DESC, vi.hora_llegada DESC`,
    [clienteId]
  );
  return result.rows;
}

module.exports = {
  listar,
  iniciar,
  finalizar,
  listarPorVendedor,
  listarPorCliente,
  ESTADOS_VENDEDOR,
  ESTADOS_REPARTIDOR
};
