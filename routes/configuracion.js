const express = require('express');
const configuracionController = require('../controllers/configuracion.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');

const router = express.Router();

router.use(auth);

router.get('/', roles('administrador', 'vendedor'), configuracionController.obtener);
router.put('/', roles('administrador'), configuracionController.actualizar);

module.exports = router;
