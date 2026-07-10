const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function getRolVendedorId() {
  const result = await db.query('SELECT id FROM roles WHERE nombre = $1 LIMIT 1', ['vendedor']);
  if (!result.rows[0]) {
    const error = new Error('El rol vendedor no existe');
    error.status = 500;
    throw error;
  }
  return result.rows[0].id;
}

async function listar() {
  const result = await db.query(
    `SELECT v.id, v.nombre, v.foto_url, v.activo, v.creado_en, u.id AS usuario_id, u.usuario, u.documento
     FROM vendedores v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     ORDER BY v.nombre ASC`
  );
  return result.rows;
}

async function crear(data) {
  const { nombre, documento, usuario, password = '123456', foto_url } = data;
  if (!nombre || !usuario || password.length < 6) {
    const error = new Error('Nombre, usuario y contraseña válida son obligatorios');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const rolId = await getRolVendedorId();
    const hash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO usuarios (rol_id, nombres, documento, usuario, password_hash, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, nombres, documento, usuario`,
      [rolId, nombre, documento || null, usuario, hash]
    );

    const vendedorResult = await client.query(
      `INSERT INTO vendedores (usuario_id, nombre, foto_url, activo)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, usuario_id, nombre, foto_url, activo, creado_en`,
      [userResult.rows[0].id, nombre, foto_url || null]
    );

    await client.query('COMMIT');
    return { ...vendedorResult.rows[0], usuario: userResult.rows[0].usuario };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      error.message = 'El usuario o documento ya existe';
      error.status = 409;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function actualizar(id, data) {
  const { nombre, documento, usuario, foto_url, activo } = data;
  if (!nombre && !documento && !usuario && !foto_url && typeof activo !== 'boolean') {
    const error = new Error('No hay datos para actualizar');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query('SELECT usuario_id FROM vendedores WHERE id = $1', [id]);
    if (!found.rows[0]) {
      const error = new Error('Vendedor no encontrado');
      error.status = 404;
      throw error;
    }

    if (nombre || foto_url || typeof activo === 'boolean') {
      await client.query(
        `UPDATE vendedores
         SET nombre = COALESCE($1, nombre),
             foto_url = COALESCE($2, foto_url),
             activo = COALESCE($3, activo)
         WHERE id = $4`,
        [nombre || null, foto_url || null, typeof activo === 'boolean' ? activo : null, id]
      );
    }

    await client.query(
      `UPDATE usuarios
       SET nombres = COALESCE($1, nombres),
           documento = COALESCE($2, documento),
           usuario = COALESCE($3, usuario),
           activo = COALESCE($4, activo),
           actualizado_en = NOW()
       WHERE id = $5`,
      [
        nombre || null,
        documento || null,
        usuario || null,
        typeof activo === 'boolean' ? activo : null,
        found.rows[0].usuario_id
      ]
    );

    await client.query('COMMIT');
    return obtenerPorId(id);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      error.message = 'El usuario o documento ya existe';
      error.status = 409;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function eliminar(id) {
  const result = await db.query(
    `UPDATE vendedores v
     SET activo = FALSE
     WHERE v.id = $1
     RETURNING v.usuario_id`,
    [id]
  );

  if (!result.rows[0]) {
    const error = new Error('Vendedor no encontrado');
    error.status = 404;
    throw error;
  }

  await db.query('UPDATE usuarios SET activo = FALSE, actualizado_en = NOW() WHERE id = $1', [
    result.rows[0].usuario_id
  ]);

  return { message: 'Vendedor desactivado correctamente' };
}

async function obtenerPorId(id) {
  const result = await db.query(
    `SELECT v.id, v.nombre, v.foto_url, v.activo, v.creado_en, u.id AS usuario_id, u.usuario, u.documento
     FROM vendedores v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     WHERE v.id = $1`,
    [id]
  );

  return result.rows[0];
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar
};
