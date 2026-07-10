const crypto = require('crypto');

const allowedTargets = ['logo', 'vendedor', 'cliente'];

async function procesarImagen(target, file) {
  if (!allowedTargets.includes(target)) {
    const error = new Error('Destino de carga inválido');
    error.status = 400;
    throw error;
  }

  if (!file) {
    const error = new Error('La imagen es obligatoria');
    error.status = 400;
    throw error;
  }

  const extension = file.originalname.includes('.')
    ? file.originalname.split('.').pop().toLowerCase()
    : file.mimetype.split('/').pop();

  const fileName = `${target}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const baseUrl = process.env.UPLOAD_PUBLIC_BASE_URL || '';

  return {
    target,
    fileName,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: baseUrl ? `${baseUrl.replace(/\/$/, '')}/${fileName}` : null,
    message:
      'Imagen validada en memoria. Configure un proveedor persistente como Vercel Blob, S3 o Cloudinary para guardar el archivo en producción.'
  };
}

module.exports = {
  procesarImagen
};
