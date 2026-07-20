const db = require('../config/db');

function validarCoordenadas(latitud, longitud) {
  if (latitud !== undefined && latitud !== null && latitud !== '' && (Number(latitud) < -90 || Number(latitud) > 90)) {
    return false;
  }
  if (longitud !== undefined && longitud !== null && longitud !== '' && (Number(longitud) < -180 || Number(longitud) > 180)) {
    return false;
  }
  return true;
}

async function obtenerMunicipioId({ municipio_id, municipio_codigo }) {
  if (municipio_id) {
    return municipio_id;
  }

  if (!municipio_codigo) {
    return null;
  }

  const result = await db.query('SELECT id FROM municipios WHERE codigo = $1 LIMIT 1', [
    municipio_codigo
  ]);

  return result.rows[0]?.id || null;
}

async function listar(user = {}) {
  const params = [];
  const where = [];

  if (user.rol === 'vendedor' && user.vendedor_id && !user.es_repartidor) {
    params.push(user.vendedor_id);
    where.push(`c.vendedor_id = $${params.length}`);
  }

  const result = await db.query(
    `SELECT c.*,
            m.nombre AS municipio,
            m.codigo AS municipio_codigo,
            v.nombre AS vendedor
     FROM clientes c
     INNER JOIN municipios m ON m.id = c.municipio_id
     LEFT JOIN vendedores v ON v.id = c.vendedor_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY c.nombre_comercial ASC`,
    params
  );
  return result.rows;
}

async function crear(data, user = {}) {
  const {
    nombre_comercial,
    razon_social,
    nit,
    contacto,
    telefono,
    direccion,
    vendedor_id,
    foto_url,
    latitud,
    longitud
  } = data;
  const municipioId = await obtenerMunicipioId(data);
  const vendedorId = user.rol === 'vendedor' ? user.vendedor_id : vendedor_id;

  if (user.rol === 'vendedor' && !user.vendedor_id) {
    const error = new Error('El usuario vendedor no tiene vendedor asociado');
    error.status = 400;
    throw error;
  }

  if (!municipioId || !nombre_comercial || !validarCoordenadas(latitud, longitud)) {
    const error = new Error('Municipio, nombre comercial y coordenadas validas son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO clientes
     (municipio_id, vendedor_id, nombre_comercial, razon_social, nit, contacto, telefono, direccion, foto_url, latitud, longitud)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      municipioId,
      vendedorId || null,
      nombre_comercial,
      razon_social || null,
      nit || null,
      contacto || null,
      telefono || null,
      direccion || null,
      foto_url || null,
      latitud || null,
      longitud || null
    ]
  );

  return result.rows[0];
}

async function actualizar(id, data) {
  if (!validarCoordenadas(data.latitud, data.longitud)) {
    const error = new Error('Coordenadas invalidas');
    error.status = 400;
    throw error;
  }

  const municipioId = await obtenerMunicipioId(data);

  const result = await db.query(
    `UPDATE clientes
     SET municipio_id = COALESCE($1, municipio_id),
         vendedor_id = $2,
         nombre_comercial = COALESCE($3, nombre_comercial),
         razon_social = COALESCE($4, razon_social),
         nit = COALESCE($5, nit),
         contacto = COALESCE($6, contacto),
         telefono = COALESCE($7, telefono),
         direccion = COALESCE($8, direccion),
         foto_url = COALESCE($9, foto_url),
         latitud = COALESCE($10, latitud),
         longitud = COALESCE($11, longitud),
         activo = COALESCE($12, activo),
         actualizado_en = NOW()
     WHERE id = $13
     RETURNING *`,
    [
      municipioId,
      data.vendedor_id || null,
      data.nombre_comercial || null,
      data.razon_social || null,
      data.nit || null,
      data.contacto || null,
      data.telefono || null,
      data.direccion || null,
      data.foto_url || null,
      data.latitud || null,
      data.longitud || null,
      typeof data.activo === 'boolean' ? data.activo : null,
      id
    ]
  );

  if (!result.rows[0]) {
    const error = new Error('Cliente no encontrado');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function eliminar(id) {
  const result = await db.query(
    'UPDATE clientes SET activo = FALSE, actualizado_en = NOW() WHERE id = $1 RETURNING id',
    [id]
  );

  if (!result.rows[0]) {
    const error = new Error('Cliente no encontrado');
    error.status = 404;
    throw error;
  }

  return { message: 'Cliente desactivado correctamente' };
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar
};
