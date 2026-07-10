const multer = require('multer');

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 5);

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: maxUploadMb * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }

    return cb(null, true);
  }
});

module.exports = upload;
