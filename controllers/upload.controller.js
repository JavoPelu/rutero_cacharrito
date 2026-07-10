const uploadService = require('../services/upload.service');

function subir(target) {
  return async (req, res, next) => {
    try {
      const data = await uploadService.procesarImagen(target, req.file);
      res.status(201).json({ ok: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  subir
};
