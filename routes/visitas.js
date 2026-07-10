const express = require('express');
const visitasController = require('../controllers/visitas.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

const router = express.Router();

router.use(auth);

router.get('/', roles('administrador'), visitasController.listar);
router.post('/iniciar', roles('administrador', 'vendedor'), visitasController.iniciar);
router.put('/finalizar/:id', roles('administrador', 'vendedor'), visitasController.finalizar);
router.get('/vendedor/:id', roles('administrador', 'vendedor'), visitasController.listarPorVendedor);
router.get('/cliente/:id', roles('administrador', 'vendedor'), visitasController.listarPorCliente);

module.exports = router;
