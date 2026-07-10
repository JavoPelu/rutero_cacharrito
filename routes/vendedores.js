const express = require('express');
const vendedoresController = require('../controllers/vendedores.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

const router = express.Router();

router.use(auth);

router.get('/', roles('administrador'), vendedoresController.listar);
router.post('/', roles('administrador'), vendedoresController.crear);
router.put('/:id', roles('administrador'), vendedoresController.actualizar);
router.delete('/:id', roles('administrador'), vendedoresController.eliminar);

module.exports = router;
