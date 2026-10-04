import { Router } from 'express';
import { verificarToken } from '../adapter/auth.middleware';
import {
  getPerfil, upsertPerfil,
  getDatosPersonales, upsertDatosPersonales,
  getContacto, upsertContacto,
  getFamiliares, createFamiliar, updateFamiliar, deleteFamiliar,
  getFormacion, createFormacion, updateFormacion, deleteFormacion,
  getExperiencia, createExperiencia, updateExperiencia, deleteExperiencia,
  getAfiliaciones, upsertAfiliaciones,
  getDocumentos, upsertDocumentos,
  getEstadoModulos,
} from '../controller/HojaVidaController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { deleteDocumento } from '../controller/HojaVidaController';
import { getHojaVidaCandidato } from '../controller/HojaVidaController';


const uploadsDir =
  process.env.NODE_ENV === 'production'
    ? '/home/uploads'
    : path.join(__dirname, '..', '..', 'static', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
    const usuario = (req as any).usuario;
    const nombre  = usuario?.nombre?.toLowerCase().replace(/\s+/g, '-') ?? 'usuario';
    cb(null, `${file.fieldname}-${nombre}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.use(verificarToken);

// Perfil
router.get ('/perfil',           getPerfil);
router.post('/perfil',           upsertPerfil);

// Datos personales
router.get ('/datos-personales', getDatosPersonales);
router.post('/datos-personales', upsertDatosPersonales);

// Contacto
router.get ('/contacto',         getContacto);
router.post('/contacto',         upsertContacto);

// Familiares
router.get   ('/familiares',      getFamiliares);
router.post  ('/familiares',      createFamiliar);
router.put   ('/familiares/:id',  updateFamiliar);
router.delete('/familiares/:id',  deleteFamiliar);

// Formación
router.get   ('/formacion',       getFormacion);
router.post  ('/formacion',       createFormacion);
router.put   ('/formacion/:id',   updateFormacion);
router.delete('/formacion/:id',   deleteFormacion);

// Experiencia
router.get   ('/experiencia',     getExperiencia);
router.post  ('/experiencia',     createExperiencia);
router.put   ('/experiencia/:id', updateExperiencia);
router.delete('/experiencia/:id', deleteExperiencia);

// Afiliaciones
router.get ('/afiliaciones',     getAfiliaciones);
router.post('/afiliaciones',     upsertAfiliaciones);

// Documentos
router.get ('/documentos',       getDocumentos);
router.post('/documentos', upload.fields([
  { name: 'cedula',       maxCount: 1 },
  { name: 'diploma',      maxCount: 1 },
  { name: 'policia',      maxCount: 1 },
  { name: 'procuraduria', maxCount: 1 },
  { name: 'contrato',     maxCount: 1 },
  { name: 'referencia',   maxCount: 1 },
]), upsertDocumentos);

// Documentos
router.delete('/documentos/:campo', deleteDocumento);

// Estado de módulos
router.get('/candidatos/:id/modulos', getEstadoModulos);

// Hoja de vida candidato
router.get('/candidato/:id', getHojaVidaCandidato);

export default router;




