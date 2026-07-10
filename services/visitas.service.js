const db = require('../config/db');

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

async function iniciar(data) {
  const { cliente_id, vendedor_id, fecha, hora_llegada, observaciones, latitud, longitud, precision_gps } = data;

  if (!cliente_id || !vendedor_id || !hora_llegada || !validarGps({ latitud, longitud, precision_gps })) {
    const error = new Error('Cliente, vendedor, hora de llegada y GPS válido son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO visitas
     (cliente_id, vendedor_id, fecha, hora_llegada, observaciones, latitud, longitud, precision_gps)
     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      cliente_id,
      vendedor_id,
      fecha || null,
      hora_llegada,
      observaciones || null,
      latitud,
      longitud,
      precision_gps || null
    ]
  );

  return result.rows[0];
}

async function finalizar(id, data) {
  const { hora_salida, compro, observaciones, proxima_visita } = data;

  if (!hora_salida || typeof compro !== 'boolean') {
    const error = new Error('Hora de salida y resultado de compra son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `UPDATE visitas
     SET hora_salida = $1,
         compro = $2,
         observaciones = COALESCE($3, observaciones),
         proxima_visita = $4,
         actualizado_en = NOW()
     WHERE id = $5
     RETURNING *`,
    [hora_salida, compro, observaciones || null, proxima_visita || null, id]
  );

  if (!result.rows[0]) {
    const error = new Error('Visita no encontrada');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function listarPorVendedor(vendedorId) {
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

async function listarPorCliente(clienteId) {
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
  listarPorCliente
};
