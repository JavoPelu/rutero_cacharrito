const db = require('../config/db');

const DEFAULT_CONFIG = {
  nombre_negocio: 'Rutero Cacharrito',
  logo_url: null
};

async function obtener() {
  const result = await db.query(
    `SELECT clave, valor
     FROM configuracion
     WHERE clave IN ('nombre_negocio', 'logo_url')`
  );

  return result.rows.reduce(
    (config, row) => ({
      ...config,
      [row.clave]: row.valor
    }),
    { ...DEFAULT_CONFIG }
  );
}

async function actualizar(data) {
  const entries = [
    ['nombre_negocio', data.nombre_negocio],
    ['logo_url', data.logo_url]
  ].filter(([, value]) => value !== undefined);

  for (const [clave, valor] of entries) {
    await db.query(
      `INSERT INTO configuracion (clave, valor)
       VALUES ($1, $2)
       ON CONFLICT (clave)
       DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = NOW()`,
      [clave, valor || null]
    );
  }

  return obtener();
}

module.exports = {
  obtener,
  actualizar
};
