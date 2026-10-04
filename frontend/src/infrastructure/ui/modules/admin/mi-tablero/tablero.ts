import './tablero.css';
import { SessionStorageService } from '../../../../storage/SessionStorage';

const API_URL = '/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function tiempoRelativo(fecha: string): string {
  const ahora = new Date();
  const then = new Date(fecha);
  const diff = Math.floor((ahora.getTime() - then.getTime()) / 1000);

  if (diff < 60)     return 'Hace un momento';
  if (diff < 3600)   return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `Hace ${Math.floor(diff / 3600)} hora${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  if (diff < 172800) return 'Ayer';
  return then.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function dotClass(tipo: string): string {
  if (tipo === 'tarea_completada')  return 'dot-green';
  if (tipo === 'nuevo_funcionario') return 'dot-teal';
  return 'dot-blue';
}

function fechaHoy(): string {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderCards(resumen: any): void {
  const set = (sel: string, val: string | number) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = String(val);
  };

  set('#val-candidatos',   resumen.totalCandidatos);
  set('#val-funcionarios', resumen.totalFuncionarios);
  set('#val-hojas',        resumen.hojasPendientes);
  set('#val-tareas',       resumen.tareasHoy);
  set('#badge-tareas',     `${resumen.tareasCompletadasHoy} completadas`);
}

function renderActividad(actividad: any[]): void {
  const contenedor = document.getElementById('actividad-lista');
  if (!contenedor) return;

  if (!actividad.length) {
    contenedor.innerHTML = '<p class="activity-empty">Sin actividad reciente</p>';
    return;
  }

  contenedor.innerHTML = actividad.map(item => `
    <div class="activity-item">
      <div class="activity-dot ${dotClass(item.tipo)}"></div>
      <div>
        <div class="activity-text">${item.descripcion}</div>
        <div class="activity-time">${tiempoRelativo(item.created_at)}</div>
      </div>
    </div>
  `).join('');
}

function renderEstado(estado: any): void {
  const total = estado.postulados + estado.en_revision + estado.contratados || 1;

  const items = [
    { key: 'postulados',  clase: 'fill-blue' },
    { key: 'en_revision', clase: 'fill-teal' },
    { key: 'contratados', clase: 'fill-green' },
  ];

  items.forEach(({ key, clase }) => {
    const count = estado[key] ?? 0;
    const pct   = Math.round((count / total) * 100);

    const pctEl   = document.querySelector(`[data-estado="${key}"] .estado-pct`);
    const countEl = document.querySelector(`[data-estado="${key}"] .estado-count`);
    const fillEl  = document.querySelector(`[data-estado="${key}"] .fill`) as HTMLElement | null;

    if (pctEl)   pctEl.textContent   = `${pct}%`;
    if (countEl) countEl.textContent = String(count);
    if (fillEl)  fillEl.style.width  = `${pct}%`;
  });
}

// ── Tareas pendientes ─────────────────────────────────────────────────────────

async function cargarTareasPendientes(): Promise<void> {
  const token = SessionStorageService.obtenerToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/tareas`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;

    const tareas = await res.json();
    const pendientes = tareas.filter((t: any) => !t.finalizada);

    const paneles = document.querySelectorAll('.db-panel');
    let contenedor: Element | null = null;
    paneles.forEach(panel => {
      if (panel.querySelector('.task-item')) contenedor = panel;
    });
    if (!contenedor) return;

    (contenedor as Element).querySelectorAll('.task-item').forEach(el => el.remove());

    if (pendientes.length === 0) {
      (contenedor as Element).innerHTML += '<p style="font-size:13px;color:var(--color-text-secondary);padding:8px 0">Sin tareas pendientes</p>';
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];

    pendientes.forEach((tarea: any) => {
      const fechaFin = tarea.fecha_fin?.split('T')[0] ?? '';
      const esHoy    = fechaFin === hoy;
      const vencida  = fechaFin < hoy;

      const pill = vencida
        ? `<span class="task-pill pill-urgent">Vencida</span>`
        : esHoy
        ? `<span class="task-pill pill-normal">Hoy</span>`
        : `<span class="task-pill pill-normal">${fechaFin}</span>`;

      (contenedor as Element).innerHTML += `
        <div class="task-item">
          <div class="task-check"></div>
          <span class="task-label">${tarea.nombre}</span>
          ${pill}
        </div>`;
    });

    // ── Ver todo → navega a Mis tareas ──
    const verTodo = Array.from(document.querySelectorAll('.panel-link'))
      .find(el => el.closest('.db-panel')?.querySelector('.task-item'));
    if (verTodo) {
      (verTodo as HTMLElement).style.cursor = 'pointer';
      verTodo.addEventListener('click', () => {
        const tareaItem = Array.from(document.querySelectorAll<HTMLElement>('.nav-item'))
          .filter(item => item.style.display !== 'none')
          .find(item => item.querySelector('.nav-label')?.textContent?.trim() === 'Mis tareas');
        if (tareaItem) tareaItem.click();
      });
    }

  } catch (e) {
    console.error('Error cargando tareas pendientes:', e);
  }
}

// ── Estado de carga ───────────────────────────────────────────────────────────

function mostrarSkeleton(): void {
  document.querySelectorAll('.db-card-value').forEach(el => {
    el.textContent = '—';
  });
}

function mostrarError(msg: string): void {
  const wrap = document.querySelector('.db-wrap');
  if (!wrap) return;
  const banner = document.createElement('div');
  banner.className = 'db-error-banner';
  banner.textContent = `Error al cargar datos: ${msg}`;
  wrap.prepend(banner);
}

// ── Fetch principal ───────────────────────────────────────────────────────────

async function cargarDashboard(): Promise<void> {
  const token = SessionStorageService.obtenerToken();
  if (!token) return;

  mostrarSkeleton();

  try {
    const res = await fetch(`${API_URL}/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    renderCards(data.resumen);
    renderActividad(data.actividadReciente);
    renderEstado(data.estadoCandidatos);

  } catch (e: any) {
    console.error('Dashboard error:', e);
    mostrarError(e.message ?? 'Error desconocido');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initTablero(): void {
  const fechaEl = document.querySelector('.db-date');
  if (fechaEl) fechaEl.textContent = fechaHoy();

  cargarDashboard();
  cargarTareasPendientes();
}