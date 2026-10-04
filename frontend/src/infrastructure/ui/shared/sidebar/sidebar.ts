const LOGIN_URL = '/src/infrastructure/ui/auth/login-principal/login.html';
const ACTIVE_KEY = 'sidebar-active';

const MODULOS: Record<string, string> = {
  'Mi tablero':      '../modules/admin/mi-tablero/tablero.html',
  'Mi hoja de vida': '../modules/admin/hoja-vida/hoja-vida.html',
  'Candidatos':      '../modules/candidato/candidato.html',
  'Funcionarios':    '../modules/funcionario/funcionario.html',
  'Mis tareas':      '../modules/admin/mis-tareas/tareas.html',
};

// ── Modales de estado ─────────────────────────────────────────────

function inyectarModales(): void {
  if (document.getElementById('modal-estado-candidato')) return;

  const html = `
  <style>
    .modal-estado-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
    }
    .modal-estado-box {
      background: #fff; border-radius: 16px; padding: 40px 36px;
      max-width: 460px; width: 90%; text-align: center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
    }
    .modal-estado-icon { font-size: 52px; margin-bottom: 16px; }
    .modal-estado-title {
      font-family: 'Sora', sans-serif; font-size: 20px;
      font-weight: 700; color: #1a1a2e; margin-bottom: 10px;
    }
    .modal-estado-text {
      font-size: 14px; color: #6b7280; line-height: 1.6;
      margin-bottom: 8px;
    }
    .modal-estado-motivo {
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 12px 16px;
      font-size: 13px; color: #b91c1c;
      margin: 12px 0 20px; text-align: left;
    }
    .modal-estado-countdown {
      font-size: 13px; color: #9ca3af; margin-bottom: 24px;
    }
    .modal-estado-btn {
      display: inline-block; padding: 11px 32px;
      border-radius: 8px; border: none; cursor: pointer;
      font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif;
    }
    .modal-estado-btn.verde {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #fff;
    }
    .modal-estado-btn.rojo {
      background: #fee2e2; color: #b91c1c;
    }
  </style>

  <!-- Modal: ACEPTADO -->
  <div class="modal-estado-overlay" id="modal-aceptado" style="display:none">
    <div class="modal-estado-box">
      <div class="modal-estado-icon">🎉</div>
      <div class="modal-estado-title">¡Felicitaciones!</div>
      <p class="modal-estado-text">
        Has sido seleccionado y ahora eres parte de nuestro equipo.<br/>
        Por favor inicia sesión nuevamente para acceder a tu nueva vista como funcionario.
      </p>
      <button class="modal-estado-btn verde" id="btn-aceptado-logout">
        Cerrar sesión e iniciar de nuevo
      </button>
    </div>
  </div>

  <!-- Modal: BLOQUEADO -->
  <div class="modal-estado-overlay" id="modal-bloqueado" style="display:none">
    <div class="modal-estado-box">
      <div class="modal-estado-icon">🚫</div>
      <div class="modal-estado-title">Tu cuenta ha sido bloqueada</div>
      <p class="modal-estado-text">
        Lamentablemente no fuiste seleccionado en este proceso.<br/>
        Tu cuenta será eliminada en las próximas 72 horas.
      </p>
      <div class="modal-estado-motivo" id="bloqueo-motivo-texto"></div>
      <div class="modal-estado-countdown" id="bloqueo-countdown"></div>
      <button class="modal-estado-btn rojo" id="btn-bloqueado-logout">
        Entendido, cerrar sesión
      </button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('btn-aceptado-logout')?.addEventListener('click', cerrarSesion);
  document.getElementById('btn-bloqueado-logout')?.addEventListener('click', cerrarSesion);
}

function cerrarSesion(): void {
  localStorage.clear();
  window.location.href = LOGIN_URL;
}

function iniciarCountdown(bloqueadoAt: string): void {
  const el = document.getElementById('bloqueo-countdown');
  if (!el) return;

  const limite = new Date(bloqueadoAt).getTime() + 72 * 60 * 60 * 1000;

  function actualizar() {
    const diff = limite - Date.now();
    if (diff <= 0) {
      el!.textContent = 'Tu cuenta será eliminada en breve.';
      return;
    }
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    el!.textContent = `Tiempo restante: ${h}h ${m}m ${s}s`;
    setTimeout(actualizar, 1_000);
  }
  actualizar();
}

// ── Verificar estado del usuario ──────────────────────────────────

async function verificarEstadoUsuario(): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const usuario = await res.json();

    inyectarModales();

    // Fue aceptado: rol cambió a empleado pero localStorage aún dice candidato
    if (usuario.rol === 'empleado' && localStorage.getItem('rol') === 'candidato') {
      document.getElementById('modal-aceptado')!.style.display = 'flex';
      return;
    }

    // Está bloqueado
    if (usuario.bloqueado) {
      document.getElementById('bloqueo-motivo-texto')!.textContent =
        `Motivo: ${usuario.motivo_bloqueo ?? 'No especificado'}`;
      iniciarCountdown(usuario.bloqueado_at ?? new Date().toISOString());
      document.getElementById('modal-bloqueado')!.style.display = 'flex';
      return;
    }
  } catch {
    // Si falla silenciosamente no bloqueamos la app
  }
}

// ── Resto del sidebar (sin cambios) ───────────────────────────────

async function cargarModulo(nombre: string): Promise<void> {
  const path = MODULOS[nombre];
  const container = document.getElementById('content-container');
  if (!container) return;

  if (!path) { container.innerHTML = ''; return; }

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error();
    container.innerHTML = await res.text();

    if (nombre === 'Mi hoja de vida') {
      const { initHojaDeVida } = await import('../../modules/admin/hoja-vida/hoja-vida');
      initHojaDeVida();
    }
    if (nombre === 'Candidatos') {
      const { initCandidatos } = await import('../../modules/candidato/candidato');
      initCandidatos();
    }
    if (nombre === 'Funcionarios') {
      const { initFuncionarios } = await import('../../modules/funcionario/funcionario');
      initFuncionarios();
    }
    if (nombre === 'Mi tablero') {
      const { initTablero } = await import('../../modules/admin/mi-tablero/tablero');
      initTablero();
    }
    if (nombre === 'Mis tareas') {
      const { initTareas } = await import('../../modules/admin/mis-tareas/tareas');
      initTareas();
    }
  } catch {
    container.innerHTML = '';
  }
}

function aplicarRoles(): void {
  const rol = localStorage.getItem('rol');
  if (!rol) { window.location.href = LOGIN_URL; return; }

  document.querySelectorAll<HTMLElement>('.nav-item[data-roles]').forEach(item => {
    const roles = item.dataset.roles!.split(',');
    if (!roles.includes(rol)) item.style.display = 'none';
  });
}

function aplicarActive(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.nav-item'))
    .filter(item => item.style.display !== 'none');

  let activoIndex = localStorage.getItem(ACTIVE_KEY);
  if (activoIndex === null || !items[parseInt(activoIndex)]) {
    activoIndex = '0';
    localStorage.setItem(ACTIVE_KEY, activoIndex);
  }

  const activo = items[parseInt(activoIndex)];
  if (activo) {
    activo.classList.add('active');
    const nombre = activo.querySelector('.nav-label')?.textContent?.trim() ?? '';
    cargarModulo(nombre);
  }

  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      localStorage.setItem(ACTIVE_KEY, String(index));
      const nombre = item.querySelector('.nav-label')?.textContent?.trim() ?? '';
      cargarModulo(nombre);
      closeMenu(); // en celular, cierra el menú al elegir una opción
    });
  });
}

function toggleSidebar(): void {
  document.body.classList.toggle('collapsed');
}

// ── Menú en celular ───────────────────────────────────────────────

function openMenu(): void {
  document.body.classList.add('menu-open');
}

function closeMenu(): void {
  document.body.classList.remove('menu-open');
}

async function verificarSesion(): Promise<void> {
  const token = localStorage.getItem('token');
  const rol   = localStorage.getItem('rol');
  if (!token || !rol) { window.location.href = LOGIN_URL; return; }

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

export async function initSidebar(): Promise<void> {
  await verificarSesion();
  await verificarEstadoUsuario(); // ← nuevo: chequea bloqueo/aceptación
  aplicarRoles();
  aplicarActive();
  (window as any).toggleSidebar = toggleSidebar;
  (window as any).openMenu = openMenu;
  (window as any).closeMenu = closeMenu;

  // Si se agranda la ventana, el menú del celular se cierra solo
  window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
    if (e.matches) closeMenu();
  });
}