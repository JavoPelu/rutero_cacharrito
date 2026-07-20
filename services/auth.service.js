const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      vendedor_id: user.vendedor_id,
      usuario: user.usuario,
      rol: user.rol,
      es_repartidor: user.es_repartidor === true
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function login({ usuario, password }) {
  if (!usuario || !password) {
    const error = new Error('Usuario y contraseña son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `SELECT u.id, u.nombres, u.usuario, u.password_hash, u.activo, r.nombre AS rol,
            v.id AS vendedor_id, COALESCE(v.es_repartidor, FALSE) AS es_repartidor
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.rol_id
     LEFT JOIN vendedores v ON v.usuario_id = u.id
     WHERE u.usuario = $1 OR u.documento = $1
     LIMIT 1`,
    [usuario]
  );

  const user = result.rows[0];
  if (!user || !user.activo) {
    const error = new Error('Credenciales inválidas');
    error.status = 401;
    throw error;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    const error = new Error('Credenciales inválidas');
    error.status = 401;
    throw error;
  }

  await db.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);

  return {
    token: signToken(user),
    usuario: {
      id: user.id,
      vendedor_id: user.vendedor_id,
      nombres: user.nombres,
      usuario: user.usuario,
      rol: user.rol,
      es_repartidor: user.es_repartidor === true
    }
  };
}

async function cambiarPassword({ userId, passwordActual, passwordNuevo }) {
  if (!passwordActual || !passwordNuevo || passwordNuevo.length < 6) {
    const error = new Error('La contraseña nueva debe tener mínimo 6 caracteres');
    error.status = 400;
    throw error;
  }

  const result = await db.query('SELECT id, password_hash FROM usuarios WHERE id = $1', [userId]);
  const user = result.rows[0];

  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    throw error;
  }

  const passwordOk = await bcrypt.compare(passwordActual, user.password_hash);
  if (!passwordOk) {
    const error = new Error('Contraseña actual inválida');
    error.status = 401;
    throw error;
  }

  const hash = await bcrypt.hash(passwordNuevo, 12);
  await db.query('UPDATE usuarios SET password_hash = $1, actualizado_en = NOW() WHERE id = $2', [
    hash,
    userId
  ]);

  return { message: 'Contraseña actualizada correctamente' };
}

module.exports = {
  login,
  cambiarPassword
};
