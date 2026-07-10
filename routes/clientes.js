const express = require('express');
const clientesController = require('../controllers/clientes.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

const router = express.Router();

router.use(auth);

router.get('/', roles('administrador', 'vendedor'), clientesController.listar);
router.post('/', roles('administrador'), clientesController.crear);
router.put('/:id', roles('administrador'), clientesController.actualizar);
router.delete('/:id', roles('administrador'), clientesController.eliminar);

module.exports = router;
