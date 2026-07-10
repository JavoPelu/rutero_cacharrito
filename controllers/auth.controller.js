const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function cambiarPassword(req, res, next) {
  try {
    const data = await authService.cambiarPassword({
      userId: req.user.id,
      passwordActual: req.body.passwordActual,
      passwordNuevo: req.body.passwordNuevo
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  cambiarPassword
};
