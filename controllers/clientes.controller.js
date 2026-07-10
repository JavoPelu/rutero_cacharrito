const clientesService = require('../services/clientes.service');

async function listar(req, res, next) {
  try {
    res.json({ ok: true, data: await clientesService.listar(req.user) });
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    res.status(201).json({ ok: true, data: await clientesService.crear(req.body, req.user) });
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    res.json({ ok: true, data: await clientesService.actualizar(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    res.json({ ok: true, data: await clientesService.eliminar(req.params.id) });
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
