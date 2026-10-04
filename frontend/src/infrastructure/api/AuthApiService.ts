import { IAuthService, LoginResponse } from '../../domain/ports/IAuthService';

const API_URL = '/api/auth';

export class AuthApiService implements IAuthService {
  async login(
    tipo_documento: string,
    numero_documento: string,
    password: string
  ): Promise<LoginResponse> {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tipo_documento: tipo_documento.trim().toUpperCase(),
        numero_documento: numero_documento.trim(),
        password: password.trim()
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Credenciales incorrectas.');
    }

    return data;
  }

  async solicitarRestablecimiento(correo: string): Promise<void> {
    const res = await fetch(`${API_URL}/solicitar-restablecimiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        correo
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error al enviar el correo.');
    }
  }

  async verificarTokenReset(token: string): Promise<void> {
    const res = await fetch(
      `${API_URL}/verificar-token-reset?token=${token}`
    );

    if (!res.ok) {
      throw new Error('Token inválido o expirado.');
    }
  }

  async confirmarRestablecimiento(
    token: string,
    nuevaPassword: string
  ): Promise<void> {
    const res = await fetch(`${API_URL}/confirmar-restablecimiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        nuevaPassword
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error al restablecer la contraseña.');
    }
  }
}