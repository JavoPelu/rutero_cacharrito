require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const vendedoresRoutes = require('./routes/vendedores');
const clientesRoutes = require('./routes/clientes');
const visitasRoutes = require('./routes/visitas');
const uploadRoutes = require('./routes/upload');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'frontend')));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'control-visitas-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (_req, res) => {
  res.redirect('/login.html');
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    message: status === 500 ? 'Error interno del servidor' : err.message
  });
});

module.exports = app;
