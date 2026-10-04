import { DataSource } from 'typeorm';
import { envs } from './environment-vars';
import { UsuarioEntity } from '../entities/UsuarioEntity';
import { PasswordResetTokenEntity } from '../entities/PasswordResetTokenEntity';
import { TareaEntity } from '../entities/TareaEntity';
import { MensajeEntity } from '../entities/MensajeEntity';

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: envs.DB_HOST,
  port: envs.DB_PORT,
  database: envs.DB_NAME,
  username: envs.DB_USER,
  password: envs.DB_PASSWORD,
  // En Azure no se modifican las tablas automáticamente
  synchronize: !isProduction,
  // Azure PostgreSQL exige SSL
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  entities: [UsuarioEntity, PasswordResetTokenEntity, TareaEntity, MensajeEntity],
});