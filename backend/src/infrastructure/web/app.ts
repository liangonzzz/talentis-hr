import express from 'express';
import cors from 'cors';
import path from 'path';
import { envs } from '../config/environment-vars';
import authRoutes from '../routes/auth.routes';
import hojaVidaRoutes from '../routes/hojavida.routes';
import tareaRoutes from '../routes/tarea.routes';
import candidatoRoutes from '../routes/candidato.routes';
import mensajesRoutes from '../routes/mensajes.routes';
import dashboardRoutes from '../routes/dashboard.routes';
import funcionarioRoutes from '../routes/funcionario.routes';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Azure pone un proxy delante de la app
app.set('trust proxy', 1);

app.use(cors({
  origin: envs.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Carpeta de archivos subidos: persistente en Azure (/home), local en tu PC
const uploadsDir = isProduction
  ? '/home/uploads'
  : path.join(__dirname, '..', '..', 'static', 'uploads');

// Endpoint para verificar que el servidor está vivo
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rutas de la API
app.use('/api/auth',            authRoutes);
app.use('/api/hoja-vida',       hojaVidaRoutes);
app.use('/api/tareas',          tareaRoutes);
app.use('/api/candidatos',      candidatoRoutes);
app.use('/api/mensajes',        mensajesRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/funcionarios',    funcionarioRoutes);

// Archivos subidos
app.use('/uploads', express.static(uploadsDir));

if (isProduction) {
  // En producción el backend también sirve el frontend compilado
  // (backend/dist/infrastructure/web -> raíz del repo -> frontend/dist)
  const frontendDist = path.join(__dirname, '..', '..', '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ message: 'Talentis API funcionando' });
  });
}

export default app;