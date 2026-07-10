const configuracionService = require('../services/configuracion.service');

async function obtener(_req, res, next) {
  try {
    res.json({ ok: true, data: await configuracionService.obtener() });
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    res.json({ ok: true, data: await configuracionService.actualizar(req.body) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  obtener,
  actualizar
};
