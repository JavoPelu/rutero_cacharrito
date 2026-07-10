function rolesPermitidos(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, message: 'No autorizado' });
    }

    return next();
  };
}

module.exports = rolesPermitidos;
