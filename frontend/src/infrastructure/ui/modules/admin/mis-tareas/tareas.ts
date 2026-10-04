import './tareas.css';

interface Tarea {
  id: number;
  usuario_id: number;
  nombre: string;
  descripcion: string;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  horas_planeadas: number;
  horas_ejecutadas: number;
  finalizada: boolean;
  created_at: string;
}

const API = '/api/tareas';

function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

function formatFecha(fecha: string): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

let tareas: Tarea[] = [];
let tareaActivaId: number | null = null;

// ─────────────────────────────────────────
// RENDER LISTA ACTIVAS
// ─────────────────────────────────────────

function renderLista(lista: Tarea[]): void {
  const empty     = document.getElementById('tareas-empty')!;
  const layout    = document.getElementById('tareas-layout')!;
  const listaCont = document.getElementById('tareas-lista')!;

  if (lista.length === 0) {
    empty.style.display  = 'flex';
    layout.style.display = 'none';
    return;
  }

  empty.style.display  = 'none';
  layout.style.display = 'flex';
  listaCont.innerHTML  = '';

  lista.forEach(t => {
    const div = document.createElement('div');
    div.className = `tarea-item${t.id === tareaActivaId ? ' active' : ''}`;
    div.dataset.id = String(t.id);
    div.innerHTML = `
      <div class="tarea-item-header">
        <span class="tarea-nombre">${t.nombre}</span>
        <button class="btn-eliminar-tarea" data-id="${t.id}" title="Eliminar tarea">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div class="tarea-meta">Actividad: <strong>${t.actividad}</strong></div>
      <div class="tarea-desc">${t.descripcion}</div>
    `;
    div.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-eliminar-tarea')) return;
      seleccionarTarea(t.id);
    });
    div.querySelector('.btn-eliminar-tarea')!.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModalEliminar(t.id);
    });
    listaCont.appendChild(div);
  });

  if (tareaActivaId !== null) {
    const activa = lista.find(t => t.id === tareaActivaId);
    if (activa) renderDetalle(activa);
  } else if (lista.length > 0) {
    seleccionarTarea(lista[0].id);
  }
}

function seleccionarTarea(id: number): void {
  tareaActivaId = id;
  const tarea = tareas.find(t => t.id === id);
  if (!tarea) return;

  document.querySelectorAll('.tarea-item').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.id === String(id));
  });

  renderDetalle(tarea);
}

function renderDetalle(t: Tarea): void {
  const horasPend = t.horas_planeadas - t.horas_ejecutadas;
  const avancePct = t.horas_planeadas > 0
    ? Math.round((t.horas_ejecutadas / t.horas_planeadas) * 100)
    : 0;

  (document.getElementById('detalle-fecha-inicio') as HTMLElement).textContent = formatFecha(t.fecha_inicio);
  (document.getElementById('detalle-fecha-fin')    as HTMLElement).textContent = formatFecha(t.fecha_fin);
  (document.getElementById('detalle-horas-plan')   as HTMLElement).textContent = String(t.horas_planeadas);
  (document.getElementById('detalle-horas-exec')   as HTMLElement).textContent = String(t.horas_ejecutadas);
  (document.getElementById('detalle-horas-pend')   as HTMLElement).textContent = String(horasPend);
  (document.getElementById('detalle-avance-fill')  as HTMLElement).style.width = `${avancePct}%`;
}

// ─────────────────────────────────────────
// FILTRO
// ─────────────────────────────────────────

function filtrar(): void {
  const busqueda  = (document.getElementById('buscar-tarea')     as HTMLInputElement).value.toLowerCase();
  const actividad = (document.getElementById('filtro-actividad') as HTMLSelectElement).value;

  const lista = tareas.filter(t => {
    const coincideB = t.nombre.toLowerCase().includes(busqueda) || t.descripcion.toLowerCase().includes(busqueda);
    const coincideA = !actividad || t.actividad === actividad;
    return coincideB && coincideA;
  });

  renderLista(lista);
}

// ─────────────────────────────────────────
// HISTORIAL (últimas 4 finalizadas)
// ─────────────────────────────────────────

async function cargarHistorial(): Promise<void> {
  try {
    const res = await fetch(`${API}/completadas`, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar historial');
    const lista: Tarea[] = await res.json();
    renderHistorial(lista);
  } catch (e: any) {
    console.error(e.message);
  }
}

function renderHistorial(lista: Tarea[]): void {
  const wrap = document.getElementById('historial-wrap')!;
  const cont = document.getElementById('historial-lista')!;

  if (lista.length === 0) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = '';
  cont.innerHTML = '';

  lista.forEach(t => {
    const pct = t.horas_planeadas > 0
      ? Math.round((t.horas_ejecutadas / t.horas_planeadas) * 100)
      : 0;

    const div = document.createElement('div');
    div.style.cssText = 'padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:6px; background:#f9fafb;';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:13px; font-weight:600;">${t.nombre}</span>
        <span style="font-size:11px; color:#6b7280;">${formatFecha(t.fecha_fin)}</span>
      </div>
      <div style="font-size:12px; color:#6b7280; margin-bottom:6px;">${t.actividad} · ${t.horas_ejecutadas}h ejecutadas</div>
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="flex:1; background:#e5e7eb; border-radius:4px; height:5px;">
          <div style="background:#1D9E75; border-radius:4px; height:5px; width:${pct}%;"></div>
        </div>
        <span style="font-size:11px; color:#6b7280;">${pct}%</span>
      </div>
    `;
    cont.appendChild(div);
  });
}

// ─────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────

async function cargarTareas(): Promise<void> {
  try {
    const res = await fetch(API, { headers: headers() });
    if (!res.ok) throw new Error('Error al cargar tareas');
    tareas = await res.json();
    tareaActivaId = null;
    filtrar();
    cargarHistorial();
  } catch (e: any) {
    console.error(e.message);
  }
}

async function guardarTarea(): Promise<void> {
  const nombre    = (document.getElementById('nueva-nombre')    as HTMLInputElement).value.trim();
  const desc      = (document.getElementById('nueva-desc')      as HTMLTextAreaElement).value.trim();
  const actividad = (document.getElementById('nueva-actividad') as HTMLSelectElement).value;
  const inicio    = (document.getElementById('nueva-inicio')    as HTMLInputElement).value;
  const fin       = (document.getElementById('nueva-fin')       as HTMLInputElement).value;
  const horas     = parseInt((document.getElementById('nueva-horas') as HTMLInputElement).value) || 0;

  if (!nombre || !inicio || !fin) return;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ nombre, descripcion: desc, actividad, fecha_inicio: inicio, fecha_fin: fin, horas_planeadas: horas }),
    });

    if (!res.ok) throw new Error('Error al crear tarea');

    const nueva: Tarea = await res.json();
    tareas.unshift(nueva);
    tareaActivaId = nueva.id;
    cerrarModal();
    filtrar();
  } catch (e: any) {
    console.error(e.message);
  }
}

async function registrarHoras(): Promise<void> {
  if (tareaActivaId === null) return;
  const horas = parseInt((document.getElementById('reg-horas') as HTMLInputElement).value) || 0;
  if (horas <= 0) return;
      // Bloquear si la tarea ya está completada
    const tareaActual = tareas.find(t => t.id === tareaActivaId);
    if (tareaActual && tareaActual.horas_ejecutadas >= tareaActual.horas_planeadas) {
      document.getElementById('modal-progreso-titulo')!.textContent = 'Tarea ya completada';
      document.getElementById('modal-progreso-texto')!.innerHTML =
        'Esta tarea ya tiene todas sus horas completadas.<br>Si quieres, puedes <strong>finalizarla</strong>.';
      document.getElementById('modal-progreso-icono')!.className = 'fa-solid fa-circle-exclamation';
      document.getElementById('modal-progreso-icono-wrap')!.style.cssText = 'background:#fffbeb; color:#d97706;';
      document.getElementById('confirm-progreso')!.style.display = '';
      document.getElementById('confirm-progreso')!.textContent = 'Finalizar tarea';
      document.getElementById('cancel-progreso')!.textContent = 'Cancelar';
      document.getElementById('modal-progreso')!.classList.add('active');
      return; // no sigue con el fetch
    }

    
  try {
    const res = await fetch(`${API}/${tareaActivaId}/horas`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ horas }),
    });
    if (!res.ok) throw new Error('Error al registrar horas');

    const actualizada: Tarea = await res.json();
    const idx = tareas.findIndex(t => t.id === tareaActivaId);
    if (idx !== -1) tareas[idx] = actualizada;

    (document.getElementById('reg-horas') as HTMLInputElement).value = '';
    renderDetalle(actualizada);

    // Mostrar modal según progreso
    const pendientes = actualizada.horas_planeadas - actualizada.horas_ejecutadas;
    if (pendientes <= 0) {
      // Completó todas las horas
      document.getElementById('modal-progreso-titulo')!.textContent = '¡Horas completadas!';
      document.getElementById('modal-progreso-texto')!.innerHTML =
        'Ya completaste todas las horas planeadas para esta tarea.<br>¿Quieres finalizarla?';
      document.getElementById('modal-progreso-icono')!.className = 'fa-solid fa-circle-check';
      document.getElementById('modal-progreso-icono-wrap')!.style.cssText = 'background:#f0fdf4; color:#16a34a;';
      document.getElementById('confirm-progreso')!.style.display = '';
      document.getElementById('confirm-progreso')!.textContent = 'Finalizar tarea';
      document.getElementById('cancel-progreso')!.textContent = 'Ahora no';
    } else {
      // Aún faltan horas
      document.getElementById('modal-progreso-titulo')!.textContent = 'Horas registradas';
      document.getElementById('modal-progreso-texto')!.innerHTML =
        `Tus horas fueron registradas correctamente.<br>Aún te faltan <strong>${pendientes} hora${pendientes !== 1 ? 's' : ''}</strong> para completar la tarea.`;
      document.getElementById('modal-progreso-icono')!.className = 'fa-solid fa-clock';
      document.getElementById('modal-progreso-icono-wrap')!.style.cssText = 'background:#eff6ff; color:#2563eb;';
      document.getElementById('confirm-progreso')!.style.display = 'none';
      document.getElementById('cancel-progreso')!.textContent = 'Entendido';
    }

    document.getElementById('modal-progreso')!.classList.add('active');
  } catch (e: any) {
    console.error(e.message);
  }
}

async function finalizarTarea(): Promise<void> {
  if (tareaActivaId === null) return;
  document.getElementById('modal-finalizar-tarea')!.classList.add('active');
}

async function ejecutarFinalizarTarea(): Promise<void> {
  if (tareaActivaId === null) return;
  try {
    const res = await fetch(`${API}/${tareaActivaId}/finalizar`, {
      method: 'PATCH',
      headers: headers(),
    });
    if (!res.ok) throw new Error('Error al finalizar tarea');
    tareas = tareas.filter(t => t.id !== tareaActivaId);
    tareaActivaId = null;
    document.getElementById('modal-finalizar-tarea')!.classList.remove('active');
    filtrar();
    cargarHistorial();
  } catch (e: any) {
    console.error(e.message);
  }
}

async function eliminarTarea(id: number): Promise<void> {
  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });

    if (!res.ok) throw new Error('Error al eliminar tarea');

    tareas = tareas.filter(t => t.id !== id);
    if (tareaActivaId === id) tareaActivaId = null;
    filtrar();
  } catch (e: any) {
    console.error(e.message);
  }
}

// ─────────────────────────────────────────
// MODAL ELIMINAR
// ─────────────────────────────────────────

let tareaAEliminarId: number | null = null;

function abrirModalEliminar(id: number): void {
  tareaAEliminarId = id;
  document.getElementById('modal-eliminar-tarea')!.classList.add('active');
}

function cerrarModalEliminar(): void {
  tareaAEliminarId = null;
  document.getElementById('modal-eliminar-tarea')!.classList.remove('active');
}

// ─────────────────────────────────────────
// MODAL CREAR
// ─────────────────────────────────────────

function abrirModal(): void {
  document.getElementById('modal-crear-tarea')!.classList.add('active');
}

function cerrarModal(): void {
  document.getElementById('modal-crear-tarea')!.classList.remove('active');
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────

export function initTareas(): void {
  cargarTareas();

  document.getElementById('buscar-tarea')     ?.addEventListener('input',  filtrar);
  document.getElementById('filtro-actividad') ?.addEventListener('change', filtrar);

  document.getElementById('btn-crear-empty')   ?.addEventListener('click', abrirModal);
  document.getElementById('btn-crear-lista')   ?.addEventListener('click', abrirModal);
  document.getElementById('close-crear-tarea') ?.addEventListener('click', cerrarModal);
  document.getElementById('cancel-crear-tarea')?.addEventListener('click', cerrarModal);
  document.getElementById('guardar-tarea')     ?.addEventListener('click', guardarTarea);
  document.getElementById('btn-registrar')     ?.addEventListener('click', registrarHoras);
  document.getElementById('btn-finalizar')     ?.addEventListener('click', finalizarTarea);

  document.getElementById('modal-crear-tarea')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-crear-tarea')) cerrarModal();
  });

  // Modal eliminar
  document.getElementById('close-eliminar-tarea')  ?.addEventListener('click', cerrarModalEliminar);
  document.getElementById('cancel-eliminar-tarea') ?.addEventListener('click', cerrarModalEliminar);
  document.getElementById('confirm-eliminar-tarea')?.addEventListener('click', async () => {
    if (tareaAEliminarId !== null) {
      await eliminarTarea(tareaAEliminarId);
      cerrarModalEliminar();
    }
  });
  document.getElementById('modal-eliminar-tarea')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-eliminar-tarea')) cerrarModalEliminar();
  });

  // Modal finalizar
  document.getElementById('close-finalizar-tarea')  ?.addEventListener('click', () => document.getElementById('modal-finalizar-tarea')!.classList.remove('active'));
  document.getElementById('cancel-finalizar-tarea') ?.addEventListener('click', () => document.getElementById('modal-finalizar-tarea')!.classList.remove('active'));
  document.getElementById('confirm-finalizar-tarea')?.addEventListener('click', ejecutarFinalizarTarea);
  document.getElementById('modal-finalizar-tarea')  ?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-finalizar-tarea')) document.getElementById('modal-finalizar-tarea')!.classList.remove('active');
  });

  // Modal progreso
  document.getElementById('cancel-progreso')?.addEventListener('click', () =>
    document.getElementById('modal-progreso')!.classList.remove('active'));
  document.getElementById('confirm-progreso')?.addEventListener('click', async () => {
    document.getElementById('modal-progreso')!.classList.remove('active');
    await ejecutarFinalizarTarea();
  });
  document.getElementById('modal-progreso')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-progreso')) document.getElementById('modal-progreso')!.classList.remove('active');
  });
}