import './funcionario.css';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Funcionario {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  estado: 'Activo' | 'Inactivo' | 'Incapacidad' | 'Vacaciones';
}

// ── Estado del módulo ──────────────────────────────────────────────────────
let funcionarios: Funcionario[] = [];
let dropdownFuncionarioId: number | null = null;

// Pendientes para confirmación
let pendienteEstado: { id: number; nuevoEstado: string } | null = null;
let pendienteEliminar: number | null = null;

// Chat
let chatFuncionarioId: number | null = null;
let chatPollingInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────
function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

function obtenerIniciales(nombre: string, apellidos: string): string {
  const partes = [nombre, apellidos].join(' ').split(' ').filter(p => p.length > 0);
  return partes.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function claseEstado(estado: string): string {
  const mapa: Record<string, string> = {
    Activo: 'activo', Inactivo: 'inactivo',
    Incapacidad: 'incapacidad', Vacaciones: 'vacaciones',
  };
  return mapa[estado] ?? 'activo';
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// ── Fetch funcionarios ─────────────────────────────────────────────────────
async function cargarFuncionarios(): Promise<void> {
  const tbody = document.getElementById('funcionarios-tbody')!;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-soft)">Cargando...</td></tr>`;

  try {
    const res = await fetch('/api/funcionarios', { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al cargar funcionarios');
    funcionarios = await res.json();
    filtrar();
  } catch (err: any) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#dc2626">${err.message}</td></tr>`;
  }
}

// ── Render tabla ───────────────────────────────────────────────────────────
function renderTabla(lista: Funcionario[]): void {
  const tbody = document.getElementById('funcionarios-tbody')!;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-soft)">No se encontraron funcionarios.</td></tr>`;
    return;
  }

  lista.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="func-avatar-wrap">
          <div class="func-avatar">${obtenerIniciales(f.nombre, f.apellidos)}</div>
          <span class="func-nombre">${f.nombre} ${f.apellidos}</span>
        </div>
      </td>
      <td class="func-correo">${f.correo}</td>
      <td>${f.tipo_documento}</td>
      <td>${f.numero_documento}</td>
      <td>
        <div class="estado-badge">
          <span class="estado-punto ${claseEstado(f.estado)}"></span>
          ${f.estado}
        </div>
      </td>
      <td>
        <div class="acciones-wrap">
                    <button class="btn-accion descargar" title="Descargar hoja de vida" onclick="descargarHojaVida(${f.id})">
            <i class="fa-solid fa-download"></i>
          </button>
          <button class="btn-accion descargar" title="Compartir hoja de vida" onclick="compartirHojaVida(${f.id})">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          <button class="btn-accion chat" title="Chat con funcionario" onclick="abrirChat(${f.id}, '${f.nombre} ${f.apellidos}')">
            <i class="fa-solid fa-envelope"></i>
          </button>
          <button class="btn-accion cambiar" title="Cambiar estado" onclick="abrirDropdownEstado(event, ${f.id})">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-accion eliminar" title="Eliminar" onclick="pedirConfirmarEliminar(${f.id}, '${f.nombre} ${f.apellidos}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── Filtros ────────────────────────────────────────────────────────────────
function filtrar(): void {
  const busqueda = (document.getElementById('buscar-input') as HTMLInputElement).value.toLowerCase();
  const estado   = (document.getElementById('filtro-estado') as HTMLSelectElement).value;
  const tipo     = (document.getElementById('filtro-tipo') as HTMLSelectElement).value;

  const lista = funcionarios.filter(f => {
    const nombreCompleto = `${f.nombre} ${f.apellidos}`.toLowerCase();
    const coincideBusqueda = nombreCompleto.includes(busqueda) || f.correo.toLowerCase().includes(busqueda);
    const coincideEstado   = !estado || f.estado === estado;
    const coincideTipo     = !tipo   || f.tipo_documento === tipo;
    return coincideBusqueda && coincideEstado && coincideTipo;
  });

  renderTabla(lista);
}

// ── Dropdown estado ────────────────────────────────────────────────────────
function abrirDropdownEstado(e: MouseEvent, id: number): void {
  e.stopPropagation();
  const dropdown = document.getElementById('estado-dropdown')!;
  const btn = e.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();

  dropdownFuncionarioId = id;
  dropdown.style.display = 'block';
  dropdown.style.top  = `${rect.bottom + 6}px`;
  dropdown.style.left = `${rect.left}px`;
}

function cerrarDropdown(): void {
  document.getElementById('estado-dropdown')!.style.display = 'none';
  dropdownFuncionarioId = null;
}

// ── Modal confirmar cambio de estado ──────────────────────────────────────
function pedirConfirmarEstado(nuevoEstado: string): void {
  if (dropdownFuncionarioId === null) return;
  const f = funcionarios.find(x => x.id === dropdownFuncionarioId);
  if (!f) return;

  pendienteEstado = { id: f.id, nuevoEstado };
  cerrarDropdown();

  (document.getElementById('modal-estado-nombre') as HTMLElement).textContent = `${f.nombre} ${f.apellidos}`;
  (document.getElementById('modal-estado-nuevo') as HTMLElement).textContent = nuevoEstado;
  (document.getElementById('modal-confirmar-estado') as HTMLElement).classList.add('active');
}

async function confirmarCambioEstado(): Promise<void> {
  if (!pendienteEstado) return;
  const { id, nuevoEstado } = pendienteEstado;
  pendienteEstado = null;
  cerrarModalEstado();

  try {
    const res = await fetch(`/api/funcionarios/${id}/estado`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (!res.ok) throw new Error('No se pudo cambiar el estado');
    const idx = funcionarios.findIndex(f => f.id === id);
    if (idx !== -1) funcionarios[idx].estado = nuevoEstado as Funcionario['estado'];
    filtrar();
  } catch (err: any) {
    alert(err.message);
  }
}

function cerrarModalEstado(): void {
  (document.getElementById('modal-confirmar-estado') as HTMLElement).classList.remove('active');
  pendienteEstado = null;
}

// ── Modal confirmar eliminar ───────────────────────────────────────────────
function pedirConfirmarEliminar(id: number, nombre: string): void {
  pendienteEliminar = id;
  (document.getElementById('modal-eliminar-nombre') as HTMLElement).textContent = nombre;
  (document.getElementById('modal-confirmar-eliminar') as HTMLElement).classList.add('active');
}

async function confirmarEliminar(): Promise<void> {
  if (pendienteEliminar === null) return;
  const id = pendienteEliminar;
  pendienteEliminar = null;
  cerrarModalEliminar();

  try {
    const res = await fetch(`/api/funcionarios/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('No se pudo eliminar el funcionario');
    funcionarios = funcionarios.filter(f => f.id !== id);
    filtrar();
  } catch (err: any) {
    alert(err.message);
  }
}

function cerrarModalEliminar(): void {
  (document.getElementById('modal-confirmar-eliminar') as HTMLElement).classList.remove('active');
  pendienteEliminar = null;
}

// ── Chat ───────────────────────────────────────────────────────────────────
async function abrirChat(id: number, nombreCompleto: string): Promise<void> {
  chatFuncionarioId = id;

  // Iniciales para avatar
  const iniciales = obtenerIniciales(nombreCompleto.split(' ')[0], nombreCompleto.split(' ').slice(1).join(' '));
  const avatar = document.getElementById('chat-avatar-admin')!;
  avatar.textContent = iniciales;
  (document.getElementById('chat-nombre-admin') as HTMLElement).textContent = nombreCompleto;

  (document.getElementById('modal-mensaje') as HTMLElement).classList.add('active');
  await cargarMensajes();

  // Polling cada 5s
  if (chatPollingInterval) clearInterval(chatPollingInterval);
  chatPollingInterval = setInterval(cargarMensajes, 5000);
}

function cerrarChat(): void {
  (document.getElementById('modal-mensaje') as HTMLElement).classList.remove('active');
  chatFuncionarioId = null;
  if (chatPollingInterval) { clearInterval(chatPollingInterval); chatPollingInterval = null; }
}

async function cargarMensajes(): Promise<void> {
  if (!chatFuncionarioId) return;
  const contenedor = document.getElementById('chat-mensajes-admin')!;

  try {
    const res = await fetch(`/api/mensajes/${chatFuncionarioId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const mensajes: any[] = await res.json();
    const eraAbajo = contenedor.scrollTop + contenedor.clientHeight >= contenedor.scrollHeight - 10;

    contenedor.innerHTML = '';

    if (mensajes.length === 0) {
      contenedor.innerHTML = `<div class="chat-loading">Sin mensajes aún. ¡Sé el primero en escribir!</div>`;
      return;
    }

    mensajes.forEach(m => {
      const burbuja = document.createElement('div');
      const esAdmin = m.autor_rol === 'admin';
      burbuja.className = `chat-burbuja ${esAdmin ? 'enviado' : 'recibido'}`;   
      burbuja.innerHTML = m.mensaje;

      const wrap = document.createElement('div');
      wrap.className = `chat-burbuja-wrap ${esAdmin ? 'enviado' : 'recibido'}`;
      wrap.appendChild(burbuja);

      const hora = document.createElement('span');
      hora.className = 'chat-hora';
      hora.textContent = formatHora(m.created_at);
      wrap.appendChild(hora);

      contenedor.appendChild(wrap);
    });

    if (eraAbajo) contenedor.scrollTop = contenedor.scrollHeight;
  } catch {
    // silencioso — no interrumpir al usuario
  }
}

async function enviarMensaje(): Promise<void> {
  if (!chatFuncionarioId) return;
  const input = document.getElementById('chat-input-admin') as HTMLTextAreaElement;
  const texto = input.value.trim();
  if (!texto) return;

  input.value = '';
  input.style.height = 'auto';

  try {
    const res = await fetch(`/api/mensajes/${chatFuncionarioId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mensaje: texto }),
    });
    if (!res.ok) throw new Error('No se pudo enviar el mensaje');
    await cargarMensajes();
  } catch (err: any) {
    alert(err.message);
  }
}

// ── Descargar hoja de vida ─────────────────────────────────────────────────
async function descargarHojaVida(id: number): Promise<void> {
  try {
    const res = await fetch(`/api/hoja-vida/candidato/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('No se pudo obtener la hoja de vida');
    const data = await res.json();

    // Generar HTML con la plantilla
    const htmlPDF = generarHTMLHojaVida(data);

    // Abrir en ventana nueva para imprimir/guardar como PDF
    const ventana = window.open('', '_blank');
    if (!ventana) { alert('Permite ventanas emergentes para descargar la hoja de vida'); return; }
    ventana.document.write(htmlPDF);
    ventana.document.close();
    ventana.onload = () => ventana.print();
  } catch (err: any) {
    alert(err.message);
  }
}

// ── Compartir hoja de vida (Web Share API, funcionalidad móvil) ────────────
async function compartirHojaVida(id: number): Promise<void> {
  try {
    const res = await fetch(`/api/hoja-vida/candidato/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('No se pudo obtener la hoja de vida');
    const data = await res.json();

    const perfil      = data.perfil      ?? {};
    const contacto    = data.contacto    ?? {};
    const formacion   = data.formacion   ?? [];
    const experiencia = data.experiencia ?? [];

    const nombre = `${perfil.nombre ?? ''} ${perfil.apellidos ?? ''}`.trim() || 'Funcionario';
    const lineas: string[] = [
      `Hoja de vida - ${nombre}`,
      perfil.cargo ? `Cargo: ${perfil.cargo}` : '',
      contacto.correo   ? `Correo: ${contacto.correo}`     : '',
      contacto.telefono ? `Teléfono: ${contacto.telefono}` : '',
      formacion.length   ? `Formación: ${formacion.map((f: any) => f.titulo).join(', ')}` : '',
      experiencia.length ? `Experiencia: ${experiencia.map((e: any) => `${e.cargo} en ${e.empresa}`).join('; ')}` : '',
      'Generado con GRH Talentis',
    ].filter(Boolean);
    const texto = lineas.join('\n');

    if (navigator.share) {
      // Menú nativo del celular (WhatsApp, correo, etc.)
      await navigator.share({ title: `Hoja de vida - ${nombre}`, text: texto });
    } else if (navigator.clipboard) {
      // Computador sin menú de compartir: se copia al portapapeles
      await navigator.clipboard.writeText(texto);
      alert('Tu navegador no tiene menú de compartir. El resumen se copió al portapapeles.');
    } else {
      alert('Compartir no está disponible en este dispositivo.');
    }
  } catch (err: any) {
    // AbortError = el usuario cerró el menú; no es un error real
    if (err?.name !== 'AbortError') alert(err.message ?? 'No se pudo compartir');
  }
}

function generarHTMLHojaVida(data: any): string {
  const perfil      = data.perfil      ?? {};
  const contacto    = data.contacto    ?? {};
  const formacion   = data.formacion   ?? [];
  const experiencia = data.experiencia ?? [];
  const afiliaciones = data.afiliaciones ?? {};
  const habilidades = perfil.habilidades ?? [];

  const nombreCompleto = `${perfil.nombre ?? ''} ${perfil.apellidos ?? ''}`.trim() || 'Sin nombre';
  const cargo          = perfil.cargo ?? 'Funcionario';
  const fotoUrl        = perfil.foto_url ? `/static/uploads/${perfil.foto_url}` : '';

  const filasFormacion = formacion.map((f: any) => `
    <div class="card-item">
      <div class="card-row"><span class="card-label">Título obtenido:</span><span>${f.titulo ?? ''}</span></div>
      <div class="card-row"><span class="card-label">Nivel de formación:</span><span>${f.nivel ?? ''}</span></div>
      <div class="card-row"><span class="card-label">Institución educativa:</span><span>${f.institucion ?? ''}</span></div>
      <div class="card-row"><span class="card-label">País o ciudad:</span><span>${f.ciudad ?? ''}</span></div>
      <div class="card-row"><span class="card-label">Estado del estudio:</span><span>${f.estado ?? ''}</span></div>
      <div class="card-row"><span class="card-label">Fecha de finalización:</span><span>${f.fecha_fin ?? ''}</span></div>
    </div>`).join('');

  const filasExperiencia = experiencia.map((e: any) => `
    <div class="card-item">
      <div class="card-row"><span class="card-label">Cargo:</span><span>${e.cargo ?? ''}</span></div>
      <div class="card-row"><span class="card-label">Empresa:</span><span>${e.empresa ?? ''}</span></div>
      <div class="card-row"><span class="card-label">Fecha de inicio:</span><span>${e.fecha_inicio ?? ''}</span></div>
      <div class="card-row"><span class="card-label">Fecha de fin:</span><span>${e.fecha_fin ?? 'Cargo actual'}</span></div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Hoja de vida - ${nombreCompleto}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #1e2d3d; font-size: 12px; }
    .page { display: flex; min-height: 100vh; }

    /* Columna izquierda */
    .sidebar { width: 220px; background: #1a3a5c; color: #fff; padding: 28px 20px; display: flex; flex-direction: column; gap: 20px; flex-shrink: 0; }
    .foto-wrap { display: flex; justify-content: center; }
    .foto { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; }
    .foto-placeholder { width: 90px; height: 90px; border-radius: 50%; background: #2563a8; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #fff; border: 3px solid #fff; }
    .sidebar-nombre { text-align: center; }
    .sidebar-nombre h2 { font-size: 15px; font-weight: 700; }
    .sidebar-nombre p  { font-size: 11px; opacity: .75; margin-top: 3px; }
    .sidebar-section h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #4a9fd4; border-bottom: 1px solid rgba(255,255,255,.15); padding-bottom: 5px; margin-bottom: 8px; }
    .info-item { display: flex; align-items: flex-start; gap: 7px; margin-bottom: 6px; font-size: 11px; opacity: .9; }
    .info-item i { margin-top: 2px; font-size: 10px; }
    .habilidad { font-size: 11px; opacity: .85; margin-bottom: 4px; }
    .afiliacion { font-size: 11px; opacity: .85; margin-bottom: 6px; }
    .afiliacion strong { display: block; }

    /* Logo */
    .logo-wrap { text-align: center; margin-bottom: 8px; }
    .logo-wrap img { width: 60px; }

    /* Columna derecha */
    .content { flex: 1; padding: 28px 28px 28px 28px; display: flex; flex-direction: column; gap: 22px; }
    .section-title { font-size: 14px; font-weight: 700; color: #2563a8; border-bottom: 2px solid #4a9fd4; padding-bottom: 4px; margin-bottom: 12px; }
    .perfil-texto { font-size: 12px; line-height: 1.6; color: #3a4f63; }
    .card-item { border: 1px solid #dde6f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
    .card-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 11.5px; }
    .card-label { font-weight: 600; color: #3a4f63; min-width: 130px; flex-shrink: 0; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sidebar { background: #1a3a5c !important; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="sidebar">
    <div class="logo-wrap">
      <div style="font-weight:800;font-size:13px;color:#4a9fd4">GRH Talentis</div>
    </div>
    <div class="foto-wrap">
      ${fotoUrl
        ? `<img class="foto" src="${fotoUrl}" alt="Foto"/>`
        : `<div class="foto-placeholder">${nombreCompleto.split(' ').slice(0,2).map((p:string)=>p[0]).join('')}</div>`}
    </div>
    <div class="sidebar-nombre">
      <h2>${nombreCompleto}</h2>
      <p>${cargo}</p>
    </div>
    <div class="sidebar-section">
      <h4>Información de contacto:</h4>
      ${contacto.documento ? `<div class="info-item"><i>📄</i>${contacto.documento}</div>` : ''}
      ${contacto.correo    ? `<div class="info-item"><i>✉</i>${contacto.correo}</div>` : ''}
      ${contacto.telefono  ? `<div class="info-item"><i>📞</i>${contacto.telefono}</div>` : ''}
      ${contacto.direccion ? `<div class="info-item"><i>📍</i>${contacto.direccion}</div>` : ''}
      ${contacto.ciudad    ? `<div class="info-item"><i>🏙</i>${contacto.ciudad}</div>` : ''}
    </div>
    ${habilidades.length > 0 ? `
    <div class="sidebar-section">
      <h4>Habilidades:</h4>
      ${habilidades.map((h: string) => `<div class="habilidad">${h}</div>`).join('')}
    </div>` : ''}
    ${(afiliaciones.eps || afiliaciones.pension || afiliaciones.cesantias) ? `
    <div class="sidebar-section">
      <h4>Afiliaciones:</h4>
      ${afiliaciones.eps       ? `<div class="afiliacion"><strong>EPS:</strong>${afiliaciones.eps}</div>` : ''}
      ${afiliaciones.pension   ? `<div class="afiliacion"><strong>Fondo de Pensión:</strong>${afiliaciones.pension}</div>` : ''}
      ${afiliaciones.cesantias ? `<div class="afiliacion"><strong>Fondo de Cesantías:</strong>${afiliaciones.cesantias}</div>` : ''}
    </div>` : ''}
  </div>

  <div class="content">
    ${perfil.resumen ? `
    <div>
      <div class="section-title">Perfil Profesional:</div>
      <p class="perfil-texto">${perfil.resumen}</p>
    </div>` : ''}

    ${formacion.length > 0 ? `
    <div>
      <div class="section-title">Formación Académica:</div>
      ${filasFormacion}
    </div>` : ''}

    ${experiencia.length > 0 ? `
    <div>
      <div class="section-title">Experiencia Laboral:</div>
      ${filasExperiencia}
    </div>` : ''}
  </div>
</div>
</body>
</html>`;
}

// ── Init ───────────────────────────────────────────────────────────────────
export function initFuncionarios(): void {
  cargarFuncionarios();

  // Filtros
  document.getElementById('buscar-input') ?.addEventListener('input', filtrar);
  document.getElementById('filtro-estado')?.addEventListener('change', filtrar);
  document.getElementById('filtro-tipo')  ?.addEventListener('change', filtrar);

  // Dropdown estado → modal confirmación (delegación de eventos)
  document.getElementById('estado-dropdown')?.addEventListener('click', (e) => {
    const opt = (e.target as HTMLElement).closest('.estado-option') as HTMLElement | null;
    if (opt) pedirConfirmarEstado(opt.dataset.estado ?? '');
  });

  // Cerrar dropdown al click fuera
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('estado-dropdown');
    if (dropdown && !dropdown.contains(e.target as Node)) cerrarDropdown();
  });

  // Modal estado
  document.getElementById('btn-confirmar-estado')?.addEventListener('click', confirmarCambioEstado);
  document.getElementById('btn-cancelar-estado') ?.addEventListener('click', cerrarModalEstado);

  // Modal eliminar
  document.getElementById('btn-confirmar-eliminar')?.addEventListener('click', confirmarEliminar);
  document.getElementById('btn-cancelar-eliminar') ?.addEventListener('click', cerrarModalEliminar);

  // Chat
  document.getElementById('close-mensaje')   ?.addEventListener('click', cerrarChat);
  document.getElementById('chat-send-admin') ?.addEventListener('click', enviarMensaje);
  document.getElementById('chat-input-admin')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); }
  });

  // Auto-resize textarea
  document.getElementById('chat-input-admin')?.addEventListener('input', (e) => {
    const ta = e.target as HTMLTextAreaElement;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  });

  // Cerrar modales al click en overlay
  document.getElementById('modal-confirmar-estado')  ?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('func-modal-overlay')) cerrarModalEstado();
  });
  document.getElementById('modal-confirmar-eliminar')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('func-modal-overlay')) cerrarModalEliminar();
  });
  document.getElementById('modal-mensaje')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) cerrarChat();
  });

  // Exponer al window para los onclick del HTML dinámico
  (window as any).descargarHojaVida      = descargarHojaVida;
  (window as any).compartirHojaVida      = compartirHojaVida;
  (window as any).abrirChat              = abrirChat;
  (window as any).abrirDropdownEstado    = abrirDropdownEstado;
  (window as any).pedirConfirmarEliminar = pedirConfirmarEliminar;
}