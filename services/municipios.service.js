const db = require('../config/db');

function normalizarCodigo(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 5)
    .padEnd(5, 'X');
}

async function generarCodigo(nombre, idActual = null) {
  const base = normalizarCodigo(nombre);
  const result = await db.query(
    `SELECT codigo
     FROM municipios
     WHERE codigo LIKE $1
       AND ($2::bigint IS NULL OR id <> $2)
     ORDER BY codigo ASC`,
    [`${base}%`, idActual]
  );
  const usados = new Set(result.rows.map((row) => row.codigo));

  let consecutivo = 1;
  let codigo = `${base}${consecutivo}`;
  while (usados.has(codigo)) {
    consecutivo += 1;
    codigo = `${base}${consecutivo}`;
  }

  return codigo;
}

async function listar(search = '', active) {
  const term = `%${String(search || '').trim()}%`;
  const onlyActive = active === 'true';
  const result = await db.query(
    `SELECT id, codigo, nombre, departamento, region, activo
     FROM municipios
     WHERE (
        $1 = '%%'
        OR codigo ILIKE $1
        OR nombre ILIKE $1
        OR departamento ILIKE $1
        OR region ILIKE $1
     )
       AND ($2::boolean IS FALSE OR activo = TRUE)
     ORDER BY nombre ASC
     LIMIT 200`,
    [term, onlyActive]
  );

  return result.rows;
}

async function crear(data) {
  const { nombre, departamento, region } = data;

  if (!nombre || !departamento) {
    const error = new Error('Nombre y departamento son obligatorios');
    error.status = 400;
    throw error;
  }

  const codigo = await generarCodigo(nombre);
  const result = await db.query(
    `INSERT INTO municipios (codigo, nombre, departamento, region, activo)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id, codigo, nombre, departamento, region, activo`,
    [codigo, nombre, departamento, region || null]
  );

  return result.rows[0];
}

async function actualizar(id, data) {
  const actual = await db.query('SELECT id, nombre FROM municipios WHERE id = $1', [id]);
  if (!actual.rows[0]) {
    const error = new Error('Municipio no encontrado');
    error.status = 404;
    throw error;
  }

  const nombreFinal = data.nombre || actual.rows[0].nombre;
  const codigo = data.nombre ? await generarCodigo(nombreFinal, id) : null;
  const result = await db.query(
    `UPDATE municipios
     SET codigo = COALESCE($1, codigo),
         nombre = COALESCE($2, nombre),
         departamento = COALESCE($3, departamento),
         region = COALESCE($4, region),
         activo = COALESCE($5, activo)
     WHERE id = $6
     RETURNING id, codigo, nombre, departamento, region, activo`,
    [
      codigo,
      data.nombre || null,
      data.departamento || null,
      data.region || null,
      typeof data.activo === 'boolean' ? data.activo : null,
      id
    ]
  );

  return result.rows[0];
}

async function eliminar(id) {
  const result = await db.query(
    `UPDATE municipios
     SET activo = FALSE
     WHERE id = $1
     RETURNING id, codigo, nombre, departamento, region, activo`,
    [id]
  );

  if (!result.rows[0]) {
    const error = new Error('Municipio no encontrado');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar
};
