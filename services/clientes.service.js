const db = require('../config/db');

function validarCoordenadas(latitud, longitud) {
  if (latitud !== undefined && latitud !== null && (Number(latitud) < -90 || Number(latitud) > 90)) {
    return false;
  }
  if (longitud !== undefined && longitud !== null && (Number(longitud) < -180 || Number(longitud) > 180)) {
    return false;
  }
  return true;
}

async function listar() {
  const result = await db.query(
    `SELECT c.*, m.nombre AS municipio
     FROM clientes c
     INNER JOIN municipios m ON m.id = c.municipio_id
     ORDER BY c.nombre_comercial ASC`
  );
  return result.rows;
}

async function crear(data) {
  const {
    municipio_id,
    nombre_comercial,
    razon_social,
    nit,
    contacto,
    telefono,
    direccion,
    latitud,
    longitud
  } = data;

  if (!municipio_id || !nombre_comercial || !validarCoordenadas(latitud, longitud)) {
    const error = new Error('Municipio, nombre comercial y coordenadas válidas son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO clientes
     (municipio_id, nombre_comercial, razon_social, nit, contacto, telefono, direccion, latitud, longitud)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      municipio_id,
      nombre_comercial,
      razon_social || null,
      nit || null,
      contacto || null,
      telefono || null,
      direccion || null,
      latitud || null,
      longitud || null
    ]
  );

  return result.rows[0];
}

async function actualizar(id, data) {
  if (!validarCoordenadas(data.latitud, data.longitud)) {
    const error = new Error('Coordenadas inválidas');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `UPDATE clientes
     SET municipio_id = COALESCE($1, municipio_id),
         nombre_comercial = COALESCE($2, nombre_comercial),
         razon_social = COALESCE($3, razon_social),
         nit = COALESCE($4, nit),
         contacto = COALESCE($5, contacto),
         telefono = COALESCE($6, telefono),
         direccion = COALESCE($7, direccion),
         latitud = COALESCE($8, latitud),
         longitud = COALESCE($9, longitud),
         activo = COALESCE($10, activo),
         actualizado_en = NOW()
     WHERE id = $11
     RETURNING *`,
    [
      data.municipio_id || null,
      data.nombre_comercial || null,
      data.razon_social || null,
      data.nit || null,
      data.contacto || null,
      data.telefono || null,
      data.direccion || null,
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
