const express = require('express');
const municipiosController = require('../controllers/municipios.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

const router = express.Router();

router.use(auth);

router.get('/', roles('administrador', 'vendedor'), municipiosController.listar);
router.post('/', roles('administrador'), municipiosController.crear);
router.put('/:id', roles('administrador'), municipiosController.actualizar);
router.delete('/:id', roles('administrador'), municipiosController.eliminar);

module.exports = router;
