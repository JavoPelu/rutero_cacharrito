const vendedoresService = require('../services/vendedores.service');

async function listar(_req, res, next) {
  try {
    res.json({ ok: true, data: await vendedoresService.listar() });
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    res.status(201).json({ ok: true, data: await vendedoresService.crear(req.body) });
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    res.json({ ok: true, data: await vendedoresService.actualizar(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    res.json({ ok: true, data: await vendedoresService.eliminar(req.params.id) });
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
