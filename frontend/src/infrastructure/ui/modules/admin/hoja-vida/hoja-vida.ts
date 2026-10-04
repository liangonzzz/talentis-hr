import './hoja-vida.css';

const API = '/api/hoja-vida';

function token(): string {
  return localStorage.getItem('token') ?? '';
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token()}`,
  };
}

function obtenerIniciales(nombre: string): string {
  return nombre.split(' ').filter(p => p.length > 0).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function val(id: string): string {
  return (document.getElementById(id) as HTMLInputElement)?.value?.trim() ?? '';
}

function setVal(id: string, value: string): void {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.value = value ?? '';
}

// ── TOGGLE / TABS ───────────────────────────────────────────

function toggleSec(card: HTMLElement): void {
  card.classList.toggle('open');
}

function switchTab(btn: HTMLElement, panelId: string): void {
  const secBody = btn.closest('.sec-body')!;
  secBody.querySelectorAll<HTMLElement>('.dp-tab').forEach(t => t.classList.remove('active'));
  secBody.querySelectorAll<HTMLElement>('.dp-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  secBody.querySelector<HTMLElement>(`#${panelId}`)!.classList.add('active');
}

// ── PANEL IZQUIERDO ─────────────────────────────────────────

function cargarPanel(): void {
  const nombre = localStorage.getItem('nombre') ?? 'Usuario';
  const rol    = localStorage.getItem('rol')    ?? '';
  const correo = localStorage.getItem('correo') ?? '';
  document.getElementById('panel-avatar')!.textContent = obtenerIniciales(nombre);
  document.getElementById('panel-nombre')!.textContent = nombre;
  document.getElementById('panel-role')!.textContent   = rol;
  document.getElementById('panel-email')!.textContent  = correo;
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

function desmarcarStep(stepId: string): void {
  completados.delete(stepId);
  document.getElementById(stepId)?.classList.remove('on');
  const card = document.querySelector<HTMLElement>(`.sec-card[data-step="${stepId}"]`);
  card?.querySelector('.sec-check')?.classList.remove('on');
  actualizarProgreso();
}

function actualizarProgreso(): void {
  const pct   = Math.round((completados.size / STEPS.length) * 100);
  const fill  = document.querySelector<HTMLElement>('.progress-fill')!;
  const badge = document.querySelector<HTMLElement>('.progress-badge')!;
  fill.style.width  = `${pct}%`;
  badge.textContent = `${pct}%`;
}

// ── PERFIL ──────────────────────────────────────────────────

async function cargarPerfil(): Promise<void> {
  const nombre = localStorage.getItem('nombre') ?? '';
  const rol    = localStorage.getItem('rol') ?? '';

  // Cambiar label y placeholder según el rol
  const label = document.getElementById('perfil-cargo-label');
  const input = document.getElementById('perfil-cargo') as HTMLInputElement;
  if (rol === 'candidato') {
    if (label) label.textContent = 'Cargo al que aspira';
    if (input) input.placeholder = 'Escriba el cargo al que aspira';
  } else {
    if (label) label.textContent = 'Cargo actual';
    if (input) input.placeholder = 'Escriba su cargo actual';
  }

  setVal('perfil-nombre', nombre);
  const res  = await fetch(`${API}/perfil`, { headers: headers() });
  const data = await res.json();
  setVal('perfil-cargo',       data.cargo_actual ?? '');
  setVal('perfil-descripcion', data.descripcion  ?? '');
  setVal('perfil-habilidad1',  data.habilidad_1  ?? '');
  setVal('perfil-habilidad2',  data.habilidad_2  ?? '');
  setVal('perfil-habilidad3',  data.habilidad_3  ?? '');
  if (data.cargo_actual) marcarStep('step-perfil');
}

async function guardarPerfil(): Promise<void> {
  const camposObligatorios = ['perfil-cargo', 'perfil-descripcion', 'perfil-habilidad1', 'perfil-habilidad2', 'perfil-habilidad3'];
  if (!validarCampos(camposObligatorios)) {
    mostrarToast('toast-perfil', 'Por favor complete todos los campos obligatorios.', 'error');
    return;
  }
  await fetch(`${API}/perfil`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      cargo_actual: val('perfil-cargo'),
      descripcion:  val('perfil-descripcion'),
      habilidad_1:  val('perfil-habilidad1'),
      habilidad_2:  val('perfil-habilidad2'),
      habilidad_3:  val('perfil-habilidad3'),
    }),
  });
  marcarStep('step-perfil');
  mostrarToast('toast-perfil', 'Información de perfil guardada correctamente.', 'success');
}

// ── DATOS PERSONALES ────────────────────────────────────────

async function cargarDatosPersonales(): Promise<void> {
  const nombre    = localStorage.getItem('nombre') ?? '';
  const partes    = nombre.split(' ');
  const nombres   = partes.slice(0, Math.ceil(partes.length / 2)).join(' ');
  const apellidos = partes.slice(Math.ceil(partes.length / 2)).join(' ');
  setVal('dp-nombres',   nombres);
  setVal('dp-apellidos', apellidos);

  const res  = await fetch(`${API}/datos-personales`, { headers: headers() });
  const data = await res.json();
  setVal('dp-sexo',             data.sexo             ?? '');
  setVal('dp-rh',               data.rh               ?? '');
  setVal('dp-lugar-nacimiento', data.lugar_nacimiento ?? '');
  setVal('dp-fecha-nacimiento', data.fecha_nacimiento?.split('T')[0] ?? '');
  setVal('dp-nacionalidad',     data.nacionalidad     ?? '');
  setVal('dp-fecha-expedicion', data.fecha_expedicion?.split('T')[0] ?? '');
  setVal('dp-lugar-expedicion', data.lugar_expedicion ?? '');
  setVal('dp-tipo-documento',   localStorage.getItem('tipo_documento')   ?? '');
  setVal('dp-numero-documento', localStorage.getItem('numero_documento') ?? '');

  if (data.sexo) marcarStep('step-personal');
}

async function guardarDatosPersonales(): Promise<void> {
  const camposObligatorios = ['dp-sexo', 'dp-rh', 'dp-lugar-nacimiento', 'dp-fecha-nacimiento', 'dp-nacionalidad', 'dp-fecha-expedicion', 'dp-lugar-expedicion'];
  if (!validarCampos(camposObligatorios)) {
    mostrarToast('toast-personal', 'Por favor complete todos los campos obligatorios.', 'error');
    return;
  }
  await fetch(`${API}/datos-personales`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      sexo:             val('dp-sexo'),
      rh:               val('dp-rh'),
      lugar_nacimiento: val('dp-lugar-nacimiento'),
      fecha_nacimiento: val('dp-fecha-nacimiento') || null,
      nacionalidad:     val('dp-nacionalidad'),
      fecha_expedicion: val('dp-fecha-expedicion') || null,
      lugar_expedicion: val('dp-lugar-expedicion'),
    }),
  });
  const cedulaInput = document.getElementById('doc-cedula-input') as HTMLInputElement;
  if (cedulaInput?.files?.[0]) {
    const formData = new FormData();
    formData.append('cedula', cedulaInput.files[0]);
    await fetch(`${API}/documentos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` },
      body: formData,
    });
  }
  marcarStep('step-personal');
  mostrarToast('toast-personal', 'Datos personales guardados correctamente.', 'success');
}

// ── CONTACTO ────────────────────────────────────────────────

async function cargarContacto(): Promise<void> {
  const res  = await fetch(`${API}/contacto`, { headers: headers() });
  const data = await res.json();
  setVal('ct-correo',      localStorage.getItem('correo') ?? '');
  setVal('ct-direccion',   data.direccion    ?? '');
  setVal('ct-departamento',data.departamento ?? '');
  setVal('ct-ciudad',      data.ciudad       ?? '');
  setVal('ct-casa-propia', data.casa_propia  ?? '');
  setVal('ct-celular',     data.celular      ?? '');
  setVal('ct-celular2',    data.celular_2    ?? '');
}

async function guardarContacto(): Promise<void> {
  const camposObligatorios = ['ct-direccion', 'ct-departamento', 'ct-ciudad', 'ct-casa-propia', 'ct-celular'];
  if (!validarCampos(camposObligatorios)) {
    mostrarToast('toast-contacto', 'Por favor complete todos los campos obligatorios.', 'error');
    return;
  }
  await fetch(`${API}/contacto`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      direccion:    val('ct-direccion'),
      departamento: val('ct-departamento'),
      ciudad:       val('ct-ciudad'),
      casa_propia:  val('ct-casa-propia'),
      celular:      val('ct-celular'),
      celular_2:    val('ct-celular2'),
    }),
  });
  mostrarToast('toast-contacto', 'Datos de contacto guardados correctamente.', 'success');
}

// ── FAMILIARES ──────────────────────────────────────────────

let familiares: any[] = [];

async function cargarFamiliares(): Promise<void> {
  const res = await fetch(`${API}/familiares`, { headers: headers() });
  familiares = await res.json();
  renderFamiliares();
}

function renderFamiliares(): void {
  const tbody = document.getElementById('familiares-tbody')!;
  const empty = document.getElementById('familiares-empty')!;
  tbody.innerHTML = '';
  if (familiares.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  familiares.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.nombre}</td>
      <td>${f.parentesco}</td>
      <td>${f.contacto ?? ''}</td>
      <td><button onclick="eliminarFamiliar(${f.id})"><i class="fa-solid fa-trash"></i></button></td>`;
    tbody.appendChild(tr);
  });
}

function abrirModalFamiliar(): void {
  document.getElementById('modalFamiliar')!.classList.add('active');
}

function cerrarModalFamiliar(): void {
  document.getElementById('modalFamiliar')!.classList.remove('active');
}

async function guardarFamiliar(): Promise<void> {
  const nombre     = (document.getElementById('fam-nombre')     as HTMLInputElement).value.trim();
  const parentesco = (document.getElementById('fam-parentesco') as HTMLSelectElement).value;
  const contacto   = (document.getElementById('fam-contacto')   as HTMLInputElement).value.trim();
  if (!nombre || !parentesco) return;
  await fetch(`${API}/familiares`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ nombre, parentesco, contacto }),
  });
  cerrarModalFamiliar();
  await cargarFamiliares();
}

async function eliminarFamiliar(id: number): Promise<void> {
  await fetch(`${API}/familiares/${id}`, { method: 'DELETE', headers: headers() });
  await cargarFamiliares();
}

// ── FORMACIÓN ───────────────────────────────────────────────

let formaciones: any[] = [];

async function cargarFormacion(): Promise<void> {
  const res = await fetch(`${API}/formacion`, { headers: headers() });
  formaciones = await res.json();
  renderFormacion();
  if (formaciones.length > 0) marcarStep('step-formacion');
}

function renderFormacion(): void {
  const lista = document.getElementById('lista-formacion')!;
  if (formaciones.length === 0) { lista.innerHTML = ''; return; }
  lista.innerHTML = `
    <div class="registro-lista">
      ${formaciones.map(f => `
        <div class="registro-item">
          <div class="registro-info">
            <span class="registro-titulo">${f.institucion}</span>
            <span class="registro-sub">${f.titulo} · ${f.nivel}</span>
          </div>
          <button class="btn-eliminar-registro" onclick="eliminarFormacion(${f.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`).join('')}
    </div>`;
}

async function guardarFormacion(): Promise<void> {
  const camposObligatorios = ['form-institucion', 'form-titulo', 'form-nivel', 'form-graduado', 'form-fecha-inicio'];
  if (!validarCampos(camposObligatorios)) {
    mostrarToast('toast-formacion', 'Por favor complete todos los campos obligatorios.', 'error');
    return;
  }
  await fetch(`${API}/formacion`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      institucion:  val('form-institucion'),
      titulo:       val('form-titulo'),
      nivel:        val('form-nivel'),
      graduado:     val('form-graduado') === 'si',
      fecha_inicio: val('form-fecha-inicio') || null,
      fecha_fin:    val('form-fecha-fin') || null,
    }),
  });
  const diplomaInput = document.getElementById('doc-diploma-input') as HTMLInputElement;
  if (diplomaInput?.files?.[0]) {
    const formData = new FormData();
    formData.append('diploma', diplomaInput.files[0]);
    await fetch(`${API}/documentos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` },
      body: formData,
    });
  }
  ['form-institucion','form-titulo','form-nivel','form-graduado','form-fecha-inicio','form-fecha-fin']
    .forEach(id => setVal(id, ''));
  await cargarFormacion();
  marcarStep('step-formacion');
  mostrarToast('toast-formacion', 'Formación académica guardada correctamente.', 'success');
}

async function eliminarFormacion(id: number): Promise<void> {
  await fetch(`${API}/formacion/${id}`, { method: 'DELETE', headers: headers() });
  await cargarFormacion();
  if (formaciones.length === 0) desmarcarStep('step-formacion');
}


// ── EXPERIENCIA ─────────────────────────────────────────────

let experiencias: any[] = [];

async function cargarExperiencia(): Promise<void> {
  const res = await fetch(`${API}/experiencia`, { headers: headers() });
  experiencias = await res.json();
  renderExperiencia();
  if (experiencias.length > 0) marcarStep('step-experiencia');
}

function renderExperiencia(): void {
  const lista = document.getElementById('lista-experiencia')!;
  if (experiencias.length === 0) { lista.innerHTML = ''; return; }
  lista.innerHTML = `
    <div class="registro-lista">
      ${experiencias.map(e => `
        <div class="registro-item">
          <div class="registro-info">
            <span class="registro-titulo">${e.empresa}</span>
            <span class="registro-sub">${e.cargo} · ${e.trabajo_actual ? 'Actual' : (e.fecha_fin ?? '')}</span>
          </div>
          <button class="btn-eliminar-registro" onclick="eliminarExperiencia(${e.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`).join('')}
    </div>`;
}

async function guardarExperiencia(): Promise<void> {
  const trabajoActual = val('exp-trabajo-actual') === 'si';
  const camposObligatorios = ['exp-empresa', 'exp-cargo', 'exp-fecha-inicio', 'exp-trabajo-actual'];
  if (!trabajoActual) camposObligatorios.push('exp-fecha-fin');
  if (!validarCampos(camposObligatorios)) {
    mostrarToast('toast-experiencia', 'Por favor complete todos los campos obligatorios.', 'error');
    return;
  }
  await fetch(`${API}/experiencia`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      empresa:        val('exp-empresa'),
      cargo:          val('exp-cargo'),
      fecha_inicio:   val('exp-fecha-inicio') || null,
      fecha_fin:      val('exp-fecha-fin') || null,
      trabajo_actual: trabajoActual,
      descripcion:    val('exp-descripcion'),
    }),
  });
  ['exp-empresa','exp-cargo','exp-fecha-inicio','exp-fecha-fin','exp-trabajo-actual','exp-descripcion']
    .forEach(id => setVal(id, ''));
  await cargarExperiencia();
  marcarStep('step-experiencia');
  mostrarToast('toast-experiencia', 'Experiencia laboral guardada correctamente.', 'success');
}

async function eliminarExperiencia(id: number): Promise<void> {
  await fetch(`${API}/experiencia/${id}`, { method: 'DELETE', headers: headers() });
  await cargarExperiencia();
  if (experiencias.length === 0) desmarcarStep('step-experiencia');
}

// ── AFILIACIONES ────────────────────────────────────────────

async function cargarAfiliaciones(): Promise<void> {
  const res  = await fetch(`${API}/afiliaciones`, { headers: headers() });
  const data = await res.json();
  setVal('af-eps',     data.eps               ?? '');
  setVal('af-pension', data.fondo_pension      ?? '');
  setVal('af-arl',     data.arl               ?? '');
  setVal('af-caja',    data.caja_compensacion  ?? '');
  if (data.eps) marcarStep('step-afiliaciones');
}

async function guardarAfiliaciones(): Promise<void> {
  const camposObligatorios = ['af-eps', 'af-pension', 'af-arl', 'af-caja'];
  if (!validarCampos(camposObligatorios)) {
    mostrarToast('toast-afiliaciones', 'Por favor complete todos los campos obligatorios.', 'error');
    return;
  }
  await fetch(`${API}/afiliaciones`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      eps:               val('af-eps'),
      fondo_pension:     val('af-pension'),
      arl:               val('af-arl'),
      caja_compensacion: val('af-caja'),
    }),
  });
  marcarStep('step-afiliaciones');
  mostrarToast('toast-afiliaciones', 'Afiliaciones guardadas correctamente.', 'success');
}



// ── DOCUMENTOS ──────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initDocumentoVisual(
  inputId: string, btnId: string, previewId: string,
  nameId: string, sizeId: string, deleteId: string, downloadId: string
): void {
  const input     = document.getElementById(inputId)   as HTMLInputElement;
  const btn       = document.getElementById(btnId)     as HTMLButtonElement;
  const preview   = document.getElementById(previewId) as HTMLElement;
  const nameEl    = document.getElementById(nameId)    as HTMLElement;
  const sizeEl    = document.getElementById(sizeId)    as HTMLElement;
  const deleteBtn = document.getElementById(deleteId)  as HTMLButtonElement;
  const downloadBtn = downloadId ? document.getElementById(downloadId) as HTMLButtonElement : null;

  if (!input || !btn) return;

  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('El archivo no puede superar 5 MB'); input.value = ''; return; }
    nameEl.textContent    = file.name;
    sizeEl.textContent    = formatBytes(file.size);
    btn.style.display     = 'none';
    preview.style.display = 'flex';
  });

  deleteBtn?.addEventListener('click', () => {
    input.value           = '';
    preview.style.display = 'none';
    btn.style.display     = '';
  });

  downloadBtn?.addEventListener('click', () => {
    const url = downloadBtn.dataset.url;
    if (!url) return;
    window.open(url, '_blank');
  });
}

function mostrarDocumentoGuardado(prefix: string, url: string | null, downloadId: string): void {
  if (!url) return;
  const preview     = document.getElementById(`${prefix}-preview`);
  const nameEl      = document.getElementById(`${prefix}-name`);
  const btn         = document.getElementById(`${prefix}-btn`);
  const drop        = document.getElementById(`drop-${prefix.replace('doc-', '')}`);
  const input       = document.getElementById(`${prefix}-input`) as HTMLInputElement;
  const downloadBtn = downloadId ? document.getElementById(downloadId) as HTMLButtonElement : null;

  if (preview && nameEl) {
    nameEl.textContent    = url.split('/').pop() ?? 'documento';
    preview.style.display = 'flex';
    if (btn) btn.style.display = 'none';
    if (downloadBtn) downloadBtn.dataset.url = url;

    // Deshabilitar el dropzone y el input para que no se pueda subir otro
    if (input) {
      input.disabled = true;
      input.value    = '';
    }
    if (drop) {
      drop.style.pointerEvents = 'none';
      drop.style.opacity       = '0.5';
    }
  }
}

async function cargarDocumentos(): Promise<void> {
  const res  = await fetch(`${API}/documentos`, { headers: headers() });
  const data = await res.json();
  mostrarDocumentoGuardado('doc-cedula',       data.cedula_url,       'doc-cedula-download');
  mostrarDocumentoGuardado('doc-diploma',      data.diploma_url,      'doc-diploma-download');
  mostrarDocumentoGuardado('doc-policia',      data.policia_url,      '');
  mostrarDocumentoGuardado('doc-procuraduria', data.procuraduria_url, '');
  mostrarDocumentoGuardado('doc-contrato',     data.contrato_url,     '');
  mostrarDocumentoGuardado('doc-referencia',   data.referencia_url,   '');
  if (data.cedula_url || data.policia_url) marcarStep('step-documentos');
}

async function guardarDocumentos(): Promise<void> {
  const formData = new FormData();
  const campos: Record<string, string> = {
    policia:      'doc-policia-input',
    procuraduria: 'doc-procuraduria-input',
    contrato:     'doc-contrato-input',
    referencia:   'doc-referencia-input',
  };
  let hayArchivos = false;
  Object.entries(campos).forEach(([campo, inputId]) => {
    const file = (document.getElementById(inputId) as HTMLInputElement)?.files?.[0];
    if (file) { formData.append(campo, file); hayArchivos = true; }
  });
  if (!hayArchivos) {
    mostrarToast('toast-documentos', 'Seleccione al menos un documento para guardar.', 'error');
    return;
  }
  await fetch(`${API}/documentos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token()}` },
    body: formData,
  });
  marcarStep('step-documentos');
  await cargarDocumentos();
  mostrarToast('toast-documentos', 'Documentos guardados correctamente.', 'success');
}

// ── TOAST ───────────────────────────────────────────────────

function mostrarToast(id: string, msg: string, tipo: 'error' | 'success'): void {
  const toast = document.getElementById(id)!;
  const msgEl = document.getElementById(`${id}-msg`)!;
  const icon  = toast.querySelector('i')!;

  msgEl.textContent = msg;
  toast.className   = `hv-toast ${tipo} visible`;
  icon.className    = tipo === 'error'
    ? 'fa-solid fa-circle-xmark'
    : 'fa-solid fa-circle-check';

  clearTimeout((window as any)[`_timer_${id}`]);
  (window as any)[`_timer_${id}`] = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

// ── VALIDACIÓN ──────────────────────────────────────────────

function validarCampos(ids: string[]): boolean {
  let valido = true;
  ids.forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (!el) return;
    if (!el.value.trim()) {
      el.classList.add('input-error');
      valido = false;
    } else {
      el.classList.remove('input-error');
    }
    // Quitar error al escribir
    el.addEventListener('input', () => el.classList.remove('input-error'), { once: true });
  });
  return valido;
}

// ── MODAL CONFIRMAR BORRAR DOCUMENTO ────────────────────────
let campoPendienteEliminar: string | null = null;
let prefijoPendienteEliminar: string | null = null;

function confirmarBorrarDocumento(campo: string, prefix: string): void {
  campoPendienteEliminar   = campo;
  prefijoPendienteEliminar = prefix;
  document.getElementById('modal-borrar-doc')!.classList.add('active');
}

function cerrarModalBorrarDoc(): void {
  document.getElementById('modal-borrar-doc')!.classList.remove('active');
  campoPendienteEliminar   = null;
  prefijoPendienteEliminar = null;
}

async function confirmarEliminarDocumento(): Promise<void> {
  if (!campoPendienteEliminar || !prefijoPendienteEliminar) return;
  await fetch(`${API}/documentos/${campoPendienteEliminar}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const preview = document.getElementById(`${prefijoPendienteEliminar}-preview`);
  const btn     = document.getElementById(`${prefijoPendienteEliminar}-btn`);
  const input   = document.getElementById(`${prefijoPendienteEliminar}-input`) as HTMLInputElement;
  const drop    = document.getElementById(`drop-${prefijoPendienteEliminar.replace('doc-', '')}`);
  if (preview) preview.style.display = 'none';
  if (btn)     btn.style.display     = '';
  if (input)   { input.disabled = false; input.value = ''; }
  if (drop)    { drop.style.pointerEvents = ''; drop.style.opacity = ''; }
  cerrarModalBorrarDoc();
}

// ── BIND BOTONES ────────────────────────────────────────────

function bindBotones(): void {
  document.getElementById('btn-guardar-perfil')      ?.addEventListener('click', guardarPerfil);
  document.getElementById('btn-guardar-personal')    ?.addEventListener('click', guardarDatosPersonales);
  document.getElementById('btn-guardar-contacto')    ?.addEventListener('click', guardarContacto);
  document.getElementById('btn-guardar-formacion')   ?.addEventListener('click', guardarFormacion);
  document.getElementById('btn-guardar-experiencia') ?.addEventListener('click', guardarExperiencia);
  document.getElementById('btn-guardar-afiliaciones')?.addEventListener('click', guardarAfiliaciones);
  document.getElementById('btn-guardar-documentos')  ?.addEventListener('click', guardarDocumentos);
}

// ── INIT ────────────────────────────────────────────────────

export async function initHojaDeVida(): Promise<void> {
  cargarPanel();
  bindBotones();

  await Promise.all([
    cargarPerfil(),
    cargarDatosPersonales(),
    cargarContacto(),
    cargarFamiliares(),
    cargarFormacion(),
    cargarExperiencia(),
    cargarAfiliaciones(),
    cargarDocumentos(),
  ]);

  (window as any).toggleSec           = toggleSec;
  (window as any).switchTab           = switchTab;
  (window as any).abrirModalFamiliar  = abrirModalFamiliar;
  (window as any).cerrarModalFamiliar = cerrarModalFamiliar;
  (window as any).guardarFamiliar     = guardarFamiliar;
  (window as any).eliminarFamiliar    = eliminarFamiliar;
  (window as any).eliminarFormacion   = eliminarFormacion;
  (window as any).eliminarExperiencia = eliminarExperiencia;
  (window as any).confirmarBorrarDocumento   = confirmarBorrarDocumento;
  (window as any).cerrarModalBorrarDoc       = cerrarModalBorrarDoc;
  (window as any).confirmarEliminarDocumento = confirmarEliminarDocumento;

  initDocumentoVisual('doc-cedula-input',      'doc-cedula-btn',      'doc-cedula-preview',      'doc-cedula-name',      'doc-cedula-size',      'doc-cedula-delete',      'doc-cedula-download');
  initDocumentoVisual('doc-diploma-input',     'doc-diploma-btn',     'doc-diploma-preview',     'doc-diploma-name',     'doc-diploma-size',     'doc-diploma-delete',     'doc-diploma-download');
  initDocumentoVisual('doc-policia-input',     'drop-policia',        'doc-policia-preview',     'doc-policia-name',     'doc-policia-size',     'doc-policia-delete',     '');
  initDocumentoVisual('doc-procuraduria-input','drop-procuraduria',   'doc-procuraduria-preview','doc-procuraduria-name','doc-procuraduria-size','doc-procuraduria-delete','');
  initDocumentoVisual('doc-contrato-input',    'drop-contrato',       'doc-contrato-preview',    'doc-contrato-name',    'doc-contrato-size',    'doc-contrato-delete',    '');
  initDocumentoVisual('doc-referencia-input',  'drop-referencia',     'doc-referencia-preview',  'doc-referencia-name',  'doc-referencia-size',  'doc-referencia-delete',  '');

 
    const rolActual = localStorage.getItem('rol');
    const rolesConChat = ['candidato', 'empleado'];
    if (rolesConChat.includes(rolActual ?? '')) {
      initChatCandidato();
    }
}

function initChatCandidato(): void {
  const candidatoId = Number(localStorage.getItem('id'));
  if (!candidatoId) return;

  document.body.insertAdjacentHTML('beforeend', `
    <button class="chat-fab" id="chat-fab-btn" title="Mensajes de RR.HH.">
      <i class="fa-solid fa-comments"></i>
      <span class="chat-fab-badge" id="chat-fab-badge" style="display:none"></span>
    </button>
    <div class="modal-chat-candidato" id="chat-modal-candidato">
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-avatar">RH</div>
          <span class="chat-nombre">RR.HH. — Talentis</span>
        </div>
        <button class="modal-close" id="chat-candidato-close" style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:16px">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="chat-mensajes" id="chat-mensajes-candidato">
        <div class="chat-loading">Cargando mensajes...</div>
      </div>
      <div class="chat-input-wrap">
        <textarea class="chat-input" id="chat-input-candidato" placeholder="Escribe un mensaje..." rows="1"></textarea>
        <button class="chat-send-btn" id="chat-send-candidato">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `);

  let chatAbierto = false;
  let pollingChat: number | null = null;

  function formatHora(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  function renderMensajesCandidato(mensajes: any[]): void {
    const container = document.getElementById('chat-mensajes-candidato')!;
    if (mensajes.length === 0) {
      container.innerHTML = `<div class="chat-empty">No hay mensajes aún.</div>`;
      return;
    }
    container.innerHTML = mensajes.map((m: any) => {
      const esMio = m.autor_id === candidatoId;
      return `
        <div class="chat-burbuja-wrap ${esMio ? 'derecha' : 'izquierda'}">
          <div class="chat-burbuja">${m.mensaje}</div>
          <span class="chat-hora">${formatHora(m.created_at)}</span>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  async function cargarMensajesCandidato(): Promise<void> {
    try {
      const res = await fetch(`/api/mensajes/${candidatoId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return;
      const mensajes = await res.json();
      renderMensajesCandidato(mensajes);
    } catch {}
  }

  async function verificarNoLeidos(): Promise<void> {
    try {
      const res = await fetch(`/api/mensajes/${candidatoId}/no-leidos`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return;
      const { count } = await res.json();
      const badge = document.getElementById('chat-fab-badge')!;
      if (count > 0) {
        badge.textContent = String(count);
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch {}
  }

  async function enviarMensajeCandidato(): Promise<void> {
    const input = document.getElementById('chat-input-candidato') as HTMLTextAreaElement;
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    input.style.height = 'auto';
    try {
      await fetch(`/api/mensajes/${candidatoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ mensaje: texto }),
      });
      await cargarMensajesCandidato();
    } catch {
      alert('Error al enviar el mensaje.');
    }
  }

  document.getElementById('chat-fab-btn')?.addEventListener('click', () => {
    chatAbierto = !chatAbierto;
    document.getElementById('chat-modal-candidato')!.classList.toggle('abierto', chatAbierto);
    if (chatAbierto) {
      cargarMensajesCandidato();
      document.getElementById('chat-fab-badge')!.style.display = 'none';
      if (pollingChat) clearInterval(pollingChat);
      pollingChat = window.setInterval(cargarMensajesCandidato, 5000);
    } else {
      if (pollingChat) { clearInterval(pollingChat); pollingChat = null; }
    }
  });

  document.getElementById('chat-candidato-close')?.addEventListener('click', () => {
    chatAbierto = false;
    document.getElementById('chat-modal-candidato')!.classList.remove('abierto');
    if (pollingChat) { clearInterval(pollingChat); pollingChat = null; }
  });

  document.getElementById('chat-send-candidato')?.addEventListener('click', enviarMensajeCandidato);

  document.getElementById('chat-input-candidato')?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensajeCandidato();
    }
  });

  document.getElementById('chat-input-candidato')?.addEventListener('input', function(this: HTMLTextAreaElement) {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  verificarNoLeidos();
  setInterval(verificarNoLeidos, 30000);
}