const express = require('express');
const uploadController = require('../controllers/upload.controller');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const upload = require('../middlewares/upload');

const router = express.Router();

router.use(auth);

router.post('/logo', roles('administrador'), upload.single('imagen'), uploadController.subir('logo'));
router.post('/vendedor', roles('administrador'), upload.single('imagen'), uploadController.subir('vendedor'));
router.post(
  '/cliente',
  roles('administrador', 'vendedor'),
  upload.single('imagen'),
  uploadController.subir('cliente')
);

module.exports = router;
