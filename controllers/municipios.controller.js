const municipiosService = require('../services/municipios.service');

async function listar(req, res, next) {
  try {
    res.json({ ok: true, data: await municipiosService.listar(req.query.search, req.query.active) });
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    res.status(201).json({ ok: true, data: await municipiosService.crear(req.body) });
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    res.json({ ok: true, data: await municipiosService.actualizar(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    res.json({ ok: true, data: await municipiosService.eliminar(req.params.id) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar
};
