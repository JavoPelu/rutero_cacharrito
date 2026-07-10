# Rutero Cacharrito

Aplicacion web para control de visitas comerciales. Incluye backend en Node.js + Express, frontend en HTML5/CSS3/JavaScript ES6 y conexion a PostgreSQL en Neon.

## Requisitos

- Node.js 18 o superior.
- Cuenta en Neon con una base de datos PostgreSQL creada.
- Cuenta en GitHub.
- Cuenta en Vercel.

## Variables de entorno

Crea un archivo `.env` local tomando como base `.env.example`:

```env
DATABASE_URL=
JWT_SECRET=
PORT=3000
NODE_ENV=production
JWT_EXPIRES_IN=8h
CORS_ORIGIN=
UPLOAD_PUBLIC_BASE_URL=
MAX_UPLOAD_MB=5
```

Para desarrollo local puedes usar `NODE_ENV=development` y `CORS_ORIGIN=http://localhost:3000`. En Vercel configura como minimo:

- `DATABASE_URL`: cadena de conexion de Neon con `sslmode=require`.
- `JWT_SECRET`: clave larga y segura para firmar tokens.
- `NODE_ENV`: `production`.
- `PORT`: `3000`, solo necesario para ejecucion local.

## Instalar dependencias

```bash
npm install
```

## Ejecutar localmente

```bash
npm run dev
```

Abre:

- Frontend: `http://localhost:3000/login.html`
- API health check: `http://localhost:3000/api/health`

Para ejecutar en modo produccion local:

```bash
npm start
```

## Importar la base de datos en Neon

1. Entra a Neon y abre tu proyecto.
2. Copia la cadena `DATABASE_URL` desde `Connection details`.
3. Verifica que la URL incluya `sslmode=require`.
4. Importa el script SQL de tu base de datos desde el editor SQL de Neon o desde consola:

```bash
psql "DATABASE_URL_DE_NEON" -f ruta/al/archivo.sql
```

5. Confirma que existan las tablas usadas por el backend: `usuarios`, `roles`, `vendedores`, `clientes`, `municipios` y `visitas`.
6. Crea al menos un usuario administrador con password cifrado con bcrypt, ya que el login valida `password_hash`.

## Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "Preparar aplicacion para produccion"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/rutero_cacharrito.git
git push -u origin main
```

Si el repositorio ya existe localmente, usa solo:

```bash
git add .
git commit -m "Preparar aplicacion para produccion"
git push
```

## Desplegar backend en Vercel

1. En Vercel, selecciona `Add New Project`.
2. Importa el repositorio de GitHub.
3. Framework Preset: `Other`.
4. Build Command: dejar vacio o usar `npm run vercel-build`.
5. Output Directory: dejar vacio.
6. Instala dependencias con `npm install`.
7. Agrega las variables de entorno en `Project Settings > Environment Variables`.
8. Despliega el proyecto.

La API queda disponible bajo:

```text
https://TU-DOMINIO.vercel.app/api
```

Endpoint de prueba:

```text
https://TU-DOMINIO.vercel.app/api/health
```

## Desplegar frontend en Vercel

El frontend se despliega en el mismo proyecto de Vercel. La configuracion `vercel.json` sirve los archivos de `frontend/` y mantiene `/api/*` apuntando al backend serverless.

Rutas principales:

- `/login.html`
- `/dashboard-admin.html`
- `/dashboard-vendedor.html`
- `/clientes.html`
- `/vendedores.html`
- `/visitas.html`
- `/configuracion.html`

La ruta raiz `/` abre `login.html`.

## Configurar variables de entorno en Vercel

En `Project Settings > Environment Variables`, agrega:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=una_clave_larga_y_segura
NODE_ENV=production
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://TU-DOMINIO.vercel.app
UPLOAD_PUBLIC_BASE_URL=
MAX_UPLOAD_MB=5
```

Despues de guardar variables, ejecuta `Redeploy` para que Vercel las aplique.

## Verificacion de produccion

Antes de desplegar:

```bash
npm run check
```

Despues de desplegar:

1. Abre `/api/health` y confirma `{ "ok": true }`.
2. Abre `/login.html`.
3. Inicia sesion con un usuario existente en Neon.
4. Valida que las pantallas carguen datos desde `/api/clientes`, `/api/vendedores` y `/api/visitas`.
5. Desde vendedor, prueba `Iniciar visita` permitiendo geolocalizacion y luego `Finalizar`.

## Estructura

```text
api/              Entrada serverless para Vercel
config/           Conexion a Neon/PostgreSQL
controllers/      Controladores HTTP
frontend/         HTML, CSS y JavaScript del cliente
middlewares/      Autenticacion, roles y carga de archivos
routes/           Rutas Express
services/         Logica de negocio y consultas SQL
app.js            Aplicacion Express
server.js         Servidor local
vercel.json       Rutas de frontend y backend en Vercel
```
