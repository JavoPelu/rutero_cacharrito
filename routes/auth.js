const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const auth = require('../middlewares/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos de inicio de sesión' }
});

router.post('/login', loginLimiter, authController.login);
router.post('/cambiar-password', auth, authController.cambiarPassword);

module.exports = router;
