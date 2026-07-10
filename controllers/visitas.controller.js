const visitasService = require('../services/visitas.service');

async function listar(_req, res, next) {
  try {
    res.json({ ok: true, data: await visitasService.listar() });
  } catch (error) {
    next(error);
  }
}

async function iniciar(req, res, next) {
  try {
    res.status(201).json({ ok: true, data: await visitasService.iniciar(req.body) });
  } catch (error) {
    next(error);
  }
}

async function finalizar(req, res, next) {
  try {
    res.json({ ok: true, data: await visitasService.finalizar(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
}

async function listarPorVendedor(req, res, next) {
  try {
    res.json({ ok: true, data: await visitasService.listarPorVendedor(req.params.id) });
  } catch (error) {
    next(error);
  }
}

async function listarPorCliente(req, res, next) {
  try {
    res.json({ ok: true, data: await visitasService.listarPorCliente(req.params.id) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  iniciar,
  finalizar,
  listarPorVendedor,
  listarPorCliente
};
