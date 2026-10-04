import '../admin/hoja-vida/hoja-vida.css';

const API = '/api';

function token(): string {
  return localStorage.getItem('token') ?? '';
}

function headers(): HeadersInit {
  return { 'Authorization': `Bearer ${token()}` };
}

function obtenerIniciales(nombre: string): string {
  return nombre.split(' ').filter(p => p.length > 0).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function getIdFromUrl(): number {
  return parseInt(new URLSearchParams(window.location.search).get('id') ?? '0');
}

// ── PROGRESO ────────────────────────────────────────────────

const STEPS = ['step-perfil', 'step-personal', 'step-formacion', 'step-experiencia', 'step-afiliaciones', 'step-documentos'];
const completados = new Set<string>();

function marcarStep(stepId: string): void {
  completados.add(stepId);
  document.getElementById(stepId)?.classList.add('on');
  const card = document.querySelector<HTMLElement>(`.sec-card[data-step="${stepId}"]`);
  card?.querySelector('.sec-check')?.classList.add('on');
  actualizarProgreso();
}

function actualizarProgreso(): void {
  const pct = Math.round((completados.size / STEPS.length) * 100);
  const fill  = document.getElementById('progress-fill')!;
  const badge = document.getElementById('progress-badge')!;
  fill.style.width  = `${pct}%`;
  badge.textContent = `${pct}%`;
}

// ── RENDER SECCIONES ─────────────────────────────────────────

function crearSeccion(titulo: string, stepId: string, contenido: string): string {
  return `
    <div class="sec-card" data-step="${stepId}" onclick="this.classList.toggle('open')">
      <div class="sec-header">
        <div class="sec-left">
          <div class="sec-check"><svg viewBox="0 0 12 12" fill="none" stroke="var(--green)" stroke-width="2.5" width="10" height="10"><polyline points="2,6 5,9 10,3"/></svg></div>
          <span class="sec-title">${titulo}</span>
        </div>
        <span class="sec-chev"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M5 8l5 5 5-5"/></svg></span>
      </div>
      <div class="sec-body" onclick="event.stopPropagation()">
        ${contenido}
      </div>
    </div>`;
}

function campo(label: string, valor: string): string {
  return `
    <div class="fgrp">
      <label class="flbl">${label}</label>
      <input class="finp finp-readonly" readonly value="${valor ?? ''}"/>
    </div>`;
}

function fila(...campos: string[]): string {
  return `<div class="frow">${campos.join('')}</div>`;
}

// ── CARGAR DATOS ─────────────────────────────────────────────

async function cargarTodo(usuarioId: number): Promise<void> {
  const candidatosRes = await fetch(`${API}/candidatos`, { headers: headers() });
  const candidatos    = await candidatosRes.json();
  const usuario       = candidatos.find((c: any) => c.id === usuarioId);

  const hvRes = await fetch(`${API}/hoja-vida/candidato/${usuarioId}`, { headers: headers() });
  const hv    = await hvRes.json();

  const { perfil, datosPersonales, contacto, formacion, experiencia, afiliaciones, documentos } = hv;

  // Panel izquierdo
  const nombre = `${usuario?.nombre ?? ''} ${usuario?.apellidos ?? ''}`.trim();
  console.log('panel-avatar:', document.getElementById('panel-avatar'));
console.log('container:', document.getElementById('secciones-container'));
  document.getElementById('panel-avatar')!.textContent = obtenerIniciales(nombre);
  document.getElementById('panel-nombre')!.textContent = nombre;
  document.getElementById('panel-role')!.textContent   = perfil?.cargo_actual ?? '';
  document.getElementById('panel-email')!.textContent  = usuario?.correo ?? '';

  // Renderizar secciones
  const container = document.getElementById('secciones-container')!;
  container.innerHTML = '';

  // Información de perfil
  container.innerHTML += crearSeccion('Información de perfil', 'step-perfil', `
    ${fila(campo('Cargo actual', perfil?.cargo_actual), campo('Descripción', perfil?.descripcion))}
    ${fila(campo('Habilidad 1', perfil?.habilidad_1), campo('Habilidad 2', perfil?.habilidad_2), campo('Habilidad 3', perfil?.habilidad_3))}
  `);
  if (perfil?.cargo_actual) marcarStep('step-perfil');

  // Datos personales
  container.innerHTML += crearSeccion('Datos personales', 'step-personal', `
    ${fila(campo('Sexo', datosPersonales?.sexo), campo('RH', datosPersonales?.rh))}
    ${fila(campo('Lugar de nacimiento', datosPersonales?.lugar_nacimiento), campo('Fecha de nacimiento', datosPersonales?.fecha_nacimiento?.split('T')[0]))}
    ${fila(campo('Nacionalidad', datosPersonales?.nacionalidad), campo('Tipo de documento', usuario?.tipo_documento))}
    ${fila(campo('Número de documento', usuario?.numero_documento), campo('Fecha de expedición', datosPersonales?.fecha_expedicion?.split('T')[0]))}
    ${fila(campo('Lugar de expedición', datosPersonales?.lugar_expedicion))}
  `);
  if (datosPersonales?.sexo) marcarStep('step-personal');

  // Formación académica
  const listaFormacion = Array.isArray(formacion) && formacion.length > 0
    ? formacion.map((f: any) => `
        <div class="registro-item">
          <div class="registro-info">
            <span class="registro-titulo">${f.institucion}</span>
            <span class="registro-sub">${f.titulo} · ${f.nivel}</span>
          </div>
        </div>`).join('')
    : '<p style="color:var(--text-soft);font-size:13px">Sin registros</p>';
  container.innerHTML += crearSeccion('Formación académica', 'step-formacion', `<div class="registro-lista">${listaFormacion}</div>`);
  if (Array.isArray(formacion) && formacion.length > 0) marcarStep('step-formacion');

  // Experiencia laboral
  const listaExp = Array.isArray(experiencia) && experiencia.length > 0
    ? experiencia.map((e: any) => `
        <div class="registro-item">
          <div class="registro-info">
            <span class="registro-titulo">${e.empresa}</span>
            <span class="registro-sub">${e.cargo} · ${e.trabajo_actual ? 'Actual' : (e.fecha_fin ?? '')}</span>
          </div>
        </div>`).join('')
    : '<p style="color:var(--text-soft);font-size:13px">Sin registros</p>';
  container.innerHTML += crearSeccion('Experiencia laboral', 'step-experiencia', `<div class="registro-lista">${listaExp}</div>`);
  if (Array.isArray(experiencia) && experiencia.length > 0) marcarStep('step-experiencia');

  // Afiliaciones
  container.innerHTML += crearSeccion('Afiliaciones', 'step-afiliaciones', `
    ${fila(campo('EPS', afiliaciones?.eps), campo('Fondo de pensión', afiliaciones?.fondo_pension))}
    ${fila(campo('ARL', afiliaciones?.arl), campo('Caja de compensación', afiliaciones?.caja_compensacion))}
  `);
  if (afiliaciones?.eps) marcarStep('step-afiliaciones');

  // Documentos
  const docs = [
    { label: 'Cédula',                  url: documentos?.cedula_url },
    { label: 'Antecedentes de Policía', url: documentos?.policia_url },
    { label: 'Procuraduría',            url: documentos?.procuraduria_url },
    { label: 'Referencia Personal',     url: documentos?.referencia_url },
  ];
  const listaDoc = docs.map(d => `
    <div class="registro-item">
      <div class="registro-info">
        <span class="registro-titulo">${d.label}</span>
        <span class="registro-sub">${d.url ? '✅ Subido' : '⚪ No subido'}</span>
      </div>
      ${d.url ? `<a href="${d.url}" target="_blank" class="fdoc-action-btn"><i class="fa-solid fa-download"></i></a>` : ''}
    </div>`).join('');
  container.innerHTML += crearSeccion('Documentos', 'step-documentos', `<div class="registro-lista">${listaDoc}</div>`);
  if (docs.some(d => d.url)) marcarStep('step-documentos');
}

export async function initHojaVidaReadonly(id: number): Promise<void> {
  document.getElementById('btn-volver')?.addEventListener('click', () => {
    const navItems = document.querySelectorAll<HTMLElement>('.nav-item');
    navItems.forEach(item => {
      const label = item.querySelector('.nav-label')?.textContent?.trim();
      if (label === 'Candidatos') item.click();
    });
  });

  await cargarTodo(id);
}