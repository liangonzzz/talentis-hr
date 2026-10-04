const LOGIN_URL = '/src/infrastructure/ui/auth/login-principal/login.html';

function obtenerIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(p => p.length > 0)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

function cargarDatosUsuario(): void {
  const nombre  = localStorage.getItem('nombre') ?? 'Usuario';
  const rol     = localStorage.getItem('rol')    ?? '';
  const correo  = localStorage.getItem('correo') ?? '';

  const iniciales = obtenerIniciales(nombre);

  // Topnav
  document.getElementById('topnav-nombre')!.textContent = nombre;
  document.getElementById('topnav-rol')!.textContent    = rol;
  document.getElementById('topnav-avatar')!.textContent = iniciales;

  // Modal
  document.getElementById('modal-avatar')!.textContent  = iniciales;
  document.getElementById('modal-nombre')!.textContent  = nombre;
  document.getElementById('modal-rol')!.textContent     = rol;
  document.getElementById('modal-correo')!.textContent  = correo;
}

function openModal(): void {
  document.getElementById('modalOverlay')!.classList.add('active');
}

function closeModal(): void {
  document.getElementById('modalOverlay')!.classList.remove('active');
}

async function cerrarSesion(): Promise<void> {
  localStorage.clear();
  window.location.href = LOGIN_URL;
}

async function verificarToken(): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = LOGIN_URL;
    return;
  }
  try {
    const response = await fetch('/api/auth/verificar', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      localStorage.clear();
      window.location.href = LOGIN_URL;
    }
  } catch {
    localStorage.clear();
    window.location.href = LOGIN_URL;
  }
}

export async function initTopnav(): Promise<void> {
  await verificarToken();
  cargarDatosUsuario();
  (window as any).openModal  = openModal;
  (window as any).closeModal = closeModal;
  (window as any).cerrarSesion = cerrarSesion;
}