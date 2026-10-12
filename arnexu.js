/* Arnexu · código completo de la web (un solo archivo) */
/* ===== config ===== */
(window.__arnexuModulos = window.__arnexuModulos || {}).config = true;
const ARNEXU_VERSION = '3.0.0';
const SUPABASE_URL = 'https://ifdajpaxbvpnbgeuohej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGFqcGF4YnZwbmJnZXVvaGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzA4ODMsImV4cCI6MjA4MTQwNjg4M30._2ogsIF2R5knYgea2mg5KE3TVlkEVt13TIyBZ69Yry4';

// Inicializar el cliente de Supabase
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Obtener el usuario actual
async function getCurrentUser() {
  const { data: { user } } = await window.supabaseClient.auth.getUser();
  return user;
}

// Verificar si hay una sesión activa
async function checkSession() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  return session;
}

// Cerrar sesión
async function logout() {
  try { if (window.arnexuPush) await window.arnexuPush.quitarDispositivo(); } catch (e) { /* no bloquea el cierre de sesión */ }
  await window.supabaseClient.auth.signOut();
  Object.keys(sessionStorage).filter(k => k.startsWith('arnexu_')).forEach(k => sessionStorage.removeItem(k));
  window.location.href = 'index.html';
}

// Formatear fecha (ejemplo: "hace 2 horas")
function formatearFecha(fecha) {
  const ahora = new Date();
  const fechaPublicacion = new Date(fecha);
  const diferencia = ahora - fechaPublicacion;
  
  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(diferencia / 3600000);
  const dias = Math.floor(diferencia / 86400000);
  
  if (minutos < 1) return 'Justo ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas}h`;
  if (dias < 7) return `Hace ${dias}d`;
  
  return fechaPublicacion.toLocaleDateString('es-ES');
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
  const notif = document.createElement('div');
  notif.className = `notificacion ${tipo}`;
  notif.textContent = mensaje;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

// Proteger páginas (redirigir si no está autenticado)
async function protegerPagina() {
  const session = await checkSession();
  if (!session) {
    window.location.href = 'index.html';
  }
}

console.log('✅ Configuración de Supabase cargada');

// ============================================
// SEGURIDAD: ESCAPE DE HTML Y URLS
// ============================================

// Convierte texto de usuarios en texto inofensivo antes de ponerlo en innerHTML
function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const AVATAR_POR_DEFECTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2a2a2a"/>' +
  '<circle cx="50" cy="38" r="18" fill="#a0a0a0"/><path d="M14 92c4-22 20-32 36-32s32 10 36 32z" fill="#a0a0a0"/></svg>'
);

// Solo acepta enlaces que apunten al almacenamiento de ESTE proyecto de Supabase.
// Bloquea javascript:, sitios externos (rastreadores) y comillas que rompan el HTML.
// Versión "cruda": para asignar directo a elemento.src / window.open
function urlSeguraCruda(url) {
  try {
    const u = new URL(String(url ?? ''), window.location.origin);
    const permitidos = [
      SUPABASE_URL + '/storage/v1/object/public/',
      SUPABASE_URL + '/storage/v1/object/sign/'
    ];
    if (!permitidos.some(p => u.href.startsWith(p))) return '';
    return u.href.replace(/'/g, '%27').replace(/"/g, '%22').replace(/</g, '%3C')
                 .replace(/>/g, '%3E').replace(/`/g, '%60').replace(/\\/g, '%5C');
  } catch (e) {
    return '';
  }
}

// Versión para meter dentro de plantillas HTML (src="${urlSegura(x)}")
function urlSegura(url) {
  return esc(urlSeguraCruda(url));
}

// Fotos de perfil: si el enlace no es válido, usa el avatar por defecto
function urlImagen(url) {
  return urlSegura(url) || AVATAR_POR_DEFECTO;
}
function urlImagenCruda(url) {
  return urlSeguraCruda(url) || AVATAR_POR_DEFECTO;
}

function esUUID(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor || '');
}

// Abre en otra pestaña cualquier elemento con data-abrir-url (reemplaza onclick="window.open('...')")
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-abrir-url]');
  if (!el) return;
  const url = el.getAttribute('data-abrir-url');
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
});

// ============================================
// SEGURIDAD: CONTRASEÑAS
// ============================================
function validarPassword(password) {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe incluir letras y números';
  return null; // null = válida
}

// ============================================
// SEGURIDAD: ARCHIVOS SUBIDOS
// ============================================
// Solo tipos conocidos (sin SVG ni HTML). La extensión sale del tipo, no del nombre original.
const TIPOS_ARCHIVO = {
  imagen: {
    etiqueta: 'imagen', maxMB: 10,
    mimes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
  },
  video: {
    etiqueta: 'video', maxMB: 50,
    mimes: { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }
  },
  documento: {
    etiqueta: 'documento', maxMB: 20,
    mimes: {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
    }
  },
  audio: {
    etiqueta: 'audio', maxMB: 10,
    mimes: { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3' }
  }
};

const ACCEPT_ADJUNTOS = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.docx,.xlsx,.pptx';
const MAX_ADJUNTOS_PUBLICACION = 5;

// Error "amable": su mensaje se puede mostrar tal cual al usuario
function errorValidacion(mensaje) {
  const e = new Error(mensaje);
  e.validacion = true;
  return e;
}

// Devuelve { ok, error, categoria, ext, mime }
function validarArchivo(file, categorias = ['imagen', 'video', 'documento'], maxMBPropio = null) {
  if (!file) return { ok: false, error: 'No se seleccionó ningún archivo' };
  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  for (const cat of categorias) {
    const tipo = TIPOS_ARCHIVO[cat];
    if (tipo && tipo.mimes[mime]) {
      const limite = maxMBPropio || tipo.maxMB;
      if (file.size > limite * 1024 * 1024) {
        return { ok: false, error: `"${file.name}" pesa más de ${limite} MB (límite para ${tipo.etiqueta})` };
      }
      if (file.size === 0) return { ok: false, error: `"${file.name}" está vacío` };
      return { ok: true, categoria: cat, ext: tipo.mimes[mime], mime };
    }
  }
  return { ok: false, error: `"${file.name}": tipo de archivo no permitido` };
}

function nombreArchivoSeguro(ext) {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

// Sube un archivo al bucket público dentro de TU carpeta: <carpeta>/<tu-id>/<nombre-seguro>
async function subirArchivoPublico(file, carpeta, uid, categorias, maxMBPropio = null) {
  const v = validarArchivo(file, categorias, maxMBPropio);
  if (!v.ok) throw errorValidacion(v.error);
  const ruta = `${carpeta}/${uid}/${nombreArchivoSeguro(v.ext)}`;
  const { error } = await window.supabaseClient.storage
    .from('arnexu-files')
    .upload(ruta, file, { contentType: v.mime, cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = window.supabaseClient.storage.from('arnexu-files').getPublicUrl(ruta);
  return { url: data.publicUrl, nombre: String(file.name).slice(0, 120), tipo: v.mime };
}

// Valida TODOS los archivos primero y luego sube (para no dejar subidas a medias por un error de tipo)
async function subirAdjuntosPublicacion(files, uid, yaExistentes = 0) {
  const lista = Array.from(files || []);
  if (yaExistentes + lista.length > MAX_ADJUNTOS_PUBLICACION) {
    throw errorValidacion(`Máximo ${MAX_ADJUNTOS_PUBLICACION} archivos por publicación`);
  }
  for (const f of lista) {
    const v = validarArchivo(f);
    if (!v.ok) throw errorValidacion(v.error);
  }
  const subidos = [];
  for (const f of lista) {
    subidos.push(await subirArchivoPublico(f, 'publicaciones', uid, ['imagen', 'video', 'documento']));
  }
  return subidos;
}


/* ===== app ===== */
// Navegación entre páginas de Arnexu
// - Transición suave al entrar y al salir.
// - Funciona con TODOS los enlaces internos (también con ?parámetros y los creados después de cargar la página).
// - Nunca bloquea: Ctrl/Cmd+clic, "abrir en pestaña nueva", descargas y enlaces externos funcionan normal.
// - Si el navegador vuelve a una página con "Atrás", queda visible y operativa.

const TIEMPO_SALIDA_MS = 200;
const sinAnimaciones = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.supabaseClient) console.error('Supabase no cargó');
  else console.log('✅ App inicializada correctamente');
  document.body.classList.add('page-fade-in');
});

// Al volver con "Atrás/Adelante" el navegador restaura la página tal como se dejó (con la animación de salida
// ya aplicada y por eso invisible): aquí se deja de nuevo a la vista.
window.addEventListener('pageshow', (e) => {
  if (!document.body) return;
  document.body.classList.remove('page-fade-out');
  if (e.persisted) document.body.classList.add('page-fade-in');
});

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = e.target.closest && e.target.closest('a[href]');
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;

  let url;
  try { url = new URL(link.href, window.location.href); } catch (err) { return; }
  if (url.origin !== window.location.origin || !url.pathname.endsWith('.html')) return;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return; // ancla en la misma página

  if (sinAnimaciones) return; // navegación normal, sin efectos
  e.preventDefault();
  document.body.classList.remove('page-fade-in');
  document.body.classList.add('page-fade-out');
  setTimeout(() => { window.location.href = url.href; }, TIEMPO_SALIDA_MS);
});

// ---------------------------------------------------------------------------
// Menú: marca la página actual y pone nombre accesible a cada icono
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const nombres = { 'inicio.html': 'Inicio', 'crear.html': 'Crear proyecto', 'chat.html': 'Mensajes', 'perfil.html': 'Mi perfil' };
  const actual = (window.location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.navbar-menu a').forEach((a) => {
    const href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
    if (nombres[href]) {
      a.setAttribute('aria-label', nombres[href]);
      a.title = nombres[href];
      if (href === actual) a.setAttribute('aria-current', 'page');
    } else if (a.getAttribute('onclick') && a.getAttribute('onclick').includes('logout')) {
      a.setAttribute('aria-label', 'Cerrar sesión');
      a.title = 'Cerrar sesión';
    }
  });
});


/* ===== moderacion ===== */
(window.__arnexuModulos = window.__arnexuModulos || {}).moderacion = true;
/**
 * Moderación de Arnexu: reportar contenido, bloquear usuarios y acceso al panel de admin.
 * Archivo: js/moderacion.js  (requiere config.js)
 */
(function () {
  'use strict';

  const MOTIVOS = [
    ['spam', 'Spam o publicidad engañosa'],
    ['estafa', 'Posible estafa o fraude'],
    ['ofensivo', 'Contenido ofensivo o acoso'],
    ['falso', 'Información falsa'],
    ['suplantacion', 'Suplantación de identidad'],
    ['otro', 'Otro motivo']
  ];

  const TITULOS = {
    publicacion: 'Reportar publicación',
    comentario: 'Reportar comentario',
    usuario: 'Reportar usuario',
    mensaje: 'Reportar mensaje'
  };

  function el(tag, estilos, texto) {
    const nodo = document.createElement(tag);
    if (estilos) nodo.style.cssText = estilos;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }

  // ---------------------------------------------
  // REPORTAR
  // ---------------------------------------------
  function reportarContenido(tipo, id) {
    if (!TITULOS[tipo] || !esUUID(id)) return;
    if (document.getElementById('modalReporte')) return;

    const fondo = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;');
    fondo.id = 'modalReporte';

    const caja = el('div', 'background:var(--gris-oscuro);border:1px solid var(--gris-medio);border-radius:12px;padding:25px;width:100%;max-width:420px;');
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-labelledby', 'tituloReporte');

    const titulo = el('h3', 'margin-bottom:6px;font-size:20px;', TITULOS[tipo]);
    titulo.id = 'tituloReporte';
    const ayuda = el('p', 'color:var(--gris-neon);font-size:14px;margin-bottom:18px;', 'Un administrador lo revisará. La otra persona no sabrá quién reportó.');

    const lblMotivo = el('label', 'display:block;font-size:14px;margin-bottom:6px;', 'Motivo');
    lblMotivo.htmlFor = 'reporteMotivo';
    const motivo = el('select', 'width:100%;padding:10px;border-radius:8px;border:1px solid var(--gris-medio);background:var(--negro);color:var(--blanco);margin-bottom:14px;');
    motivo.id = 'reporteMotivo';
    MOTIVOS.forEach(([valor, texto]) => {
      const op = document.createElement('option');
      op.value = valor;
      op.textContent = texto;
      motivo.appendChild(op);
    });

    const lblDetalle = el('label', 'display:block;font-size:14px;margin-bottom:6px;', 'Detalles (opcional)');
    lblDetalle.htmlFor = 'reporteDetalle';
    const detalle = el('textarea', 'width:100%;padding:10px;border-radius:8px;border:1px solid var(--gris-medio);background:var(--negro);color:var(--blanco);min-height:80px;resize:vertical;font-family:inherit;');
    detalle.id = 'reporteDetalle';
    detalle.maxLength = 500;
    detalle.placeholder = 'Cuéntanos qué pasó (máx. 500 caracteres)';

    const botones = el('div', 'display:flex;gap:10px;justify-content:flex-end;margin-top:18px;');
    const cancelar = el('button', '', 'Cancelar');
    cancelar.type = 'button';
    cancelar.className = 'btn btn-secondary';
    const enviar = el('button', '', 'Enviar reporte');
    enviar.type = 'button';
    enviar.className = 'btn btn-primary';
    botones.append(cancelar, enviar);

    caja.append(titulo, ayuda, lblMotivo, motivo, lblDetalle, detalle, botones);
    fondo.appendChild(caja);
    document.body.appendChild(fondo);
    motivo.focus();

    const cerrar = () => {
      document.removeEventListener('keydown', alTeclear);
      fondo.remove();
    };
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclear);
    cancelar.addEventListener('click', cerrar);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });

    enviar.addEventListener('click', async () => {
      enviar.disabled = true;
      enviar.textContent = 'Enviando...';
      const { error } = await window.supabaseClient.rpc('reportar_contenido', {
        p_tipo: tipo,
        p_id: id,
        p_motivo: motivo.value,
        p_detalle: detalle.value.trim() || null
      });

      if (!error) {
        cerrar();
        mostrarNotificacion('Gracias. Revisaremos tu reporte.');
        return;
      }

      let mensaje = 'No se pudo enviar el reporte. Intenta de nuevo.';
      if (error.code === '23505') mensaje = 'Ya reportaste este contenido.';
      else if ((error.message || '').includes('propio contenido')) mensaje = 'No puedes reportar tu propio contenido.';
      else if ((error.message || '').includes('Límite diario')) mensaje = 'Alcanzaste el límite de reportes de hoy.';
      mostrarNotificacion(mensaje, 'error');
      enviar.disabled = false;
      enviar.textContent = 'Enviar reporte';
    });
  }

  // ---------------------------------------------
  // BLOQUEAR / DESBLOQUEAR
  // ---------------------------------------------
  async function estaBloqueado(usuarioId) {
    const user = await getCurrentUser();
    if (!user || !esUUID(usuarioId)) return false;
    const { data } = await window.supabaseClient
      .from('bloqueos')
      .select('bloqueado_id')
      .eq('bloqueador_id', user.id)
      .eq('bloqueado_id', usuarioId)
      .maybeSingle();
    return !!data;
  }

  async function bloquearUsuario(usuarioId, nombre) {
    if (!esUUID(usuarioId)) return false;
    const ok = confirm(`¿Bloquear a ${nombre || 'este usuario'}?\n\nNo verás sus publicaciones ni comentarios y no podrá escribirte.`);
    if (!ok) return false;
    const user = await getCurrentUser();
    const { error } = await window.supabaseClient
      .from('bloqueos')
      .insert([{ bloqueador_id: user.id, bloqueado_id: usuarioId }]);
    if (error && error.code !== '23505') {
      mostrarNotificacion('No se pudo bloquear al usuario', 'error');
      return false;
    }
    mostrarNotificacion('Usuario bloqueado');
    return true;
  }

  async function desbloquearUsuario(usuarioId) {
    if (!esUUID(usuarioId)) return false;
    const user = await getCurrentUser();
    const { error } = await window.supabaseClient
      .from('bloqueos')
      .delete()
      .eq('bloqueador_id', user.id)
      .eq('bloqueado_id', usuarioId);
    if (error) {
      mostrarNotificacion('No se pudo desbloquear al usuario', 'error');
      return false;
    }
    mostrarNotificacion('Usuario desbloqueado');
    return true;
  }

  // ---------------------------------------------
  // ENLACE AL PANEL (solo si eres admin)
  // ---------------------------------------------
  async function esAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    const clave = 'arnexu_es_admin_' + user.id;   // por usuario, para no mezclar sesiones
    const guardado = sessionStorage.getItem(clave);
    if (guardado !== null) return guardado === '1';
    const { data, error } = await window.supabaseClient.rpc('soy_admin');
    if (error) return false;
    sessionStorage.setItem(clave, data ? '1' : '0');
    return !!data;
  }

  async function agregarEnlaceAdmin() {
    const menu = document.querySelector('.navbar-menu');
    if (!menu || menu.querySelector('[data-enlace-admin]')) return;
    const user = await getCurrentUser();
    if (!user) return;
    if (!(await esAdmin())) return;

    const li = document.createElement('li');
    li.setAttribute('data-enlace-admin', '');
    const a = document.createElement('a');
    a.href = 'admin.html';
    a.title = 'Moderación';
    a.textContent = '🛡️';
    a.style.fontSize = '26px';
    li.appendChild(a);
    menu.insertBefore(li, menu.lastElementChild);
  }

  window.reportarContenido = reportarContenido;
  window.bloquearUsuario = bloquearUsuario;
  window.desbloquearUsuario = desbloquearUsuario;
  window.estaBloqueado = estaBloqueado;
  window.arnexuEsAdmin = esAdmin;

  document.addEventListener('DOMContentLoaded', () => {
    if (window.supabaseClient) agregarEnlaceAdmin();
  });
})();


/* ===== proyectos ===== */
(window.__arnexuModulos = window.__arnexuModulos || {}).proyectos = true;
/**
 * Arnexu · lógica compartida de proyectos (ficha, señal de interés, tesis del inversor).
 * Requiere config.js y moderacion.js ya cargados.
 */
(function () {
  'use strict';

  const CATEGORIAS = ['E-commerce', 'Bienes Raíces', 'Alimentos', 'Finanzas', 'Salud', 'Educación', 'Tecnología',
    'Moda', 'Entretenimiento', 'Servicios', 'Turismo', 'Deportes', 'Sostenibilidad', 'Otro'];

  const ETAPAS = {
    idea: '💡 Idea',
    prototipo: '🛠️ Prototipo / MVP',
    traccion: '📈 Con tracción',
    escalando: '🚀 Escalando'
  };

  const MONTO_MAX = 10000000000;

  // ---------- utilidades ----------
  function el(tag, estilos, texto) {
    const n = document.createElement(tag);
    if (estilos) n.style.cssText = estilos;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function formatoUSD(n) {
    const v = Number(n);
    if (!isFinite(v)) return 'USD —';
    return 'USD ' + v.toLocaleString('es-CO');
  }

  // Deja solo dígitos (para campos de monto: solo números, sin puntos, comas ni símbolos)
  function soloDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '').slice(0, 11);
  }

  // Convierte el texto de un campo de monto en número entero, o null si está vacío. Lanza error si no es válido.
  function leerMonto(valor, obligatorio) {
    const limpio = soloDigitos(valor);
    if (!limpio) {
      if (obligatorio) throw errorValidacion('Escribe el monto en dólares, solo el número');
      return null;
    }
    const n = parseInt(limpio, 10);
    if (n < 1 || n > MONTO_MAX) throw errorValidacion('El monto debe estar entre 1 y 10.000.000.000 dólares');
    return n;
  }

  // Activa el filtro "solo números" en un input de texto
  function campoSoloNumeros(input) {
    input.addEventListener('input', () => {
      const limpio = soloDigitos(input.value);
      if (input.value !== limpio) input.value = limpio;
    });
  }

  function limpiarCiudad(valor) {
    const c = String(valor ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (c && c.length < 2) throw errorValidacion('La ciudad debe tener al menos 2 letras');
    return c || null;
  }

  // Texto para usar dentro de un filtro de búsqueda (solo letras, números y espacios)
  function terminoBusqueda(valor) {
    return String(valor ?? '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  function chipsProyecto(pub) {
    const chips = [];
    if (pub.etapa && ETAPAS[pub.etapa]) chips.push(`<span class="chip">${esc(ETAPAS[pub.etapa])}</span>`);
    if (pub.ciudad) chips.push(`<span class="chip">📍 ${esc(pub.ciudad)}</span>`);
    if (pub.monto_busca) chips.push(`<span class="chip chip-dinero">💰 Busca ${esc(formatoUSD(pub.monto_busca))}</span>`);
    if (pub.lab_puntaje !== null && pub.lab_puntaje !== undefined) {
      chips.push(`<span class="chip chip-lab" title="Puntaje de preparación Arnexu Lab">🧪 Lab ${Number(pub.lab_puntaje) | 0}/100</span>`);
    }
    return chips.length ? `<div class="chips">${chips.join('')}</div>` : '';
  }

  // ---------- modal genérico ----------
  function abrirModal(construir) {
    const fondo = el('div');
    fondo.className = 'ax-modal-fondo';
    const caja = el('div');
    caja.className = 'ax-modal';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    fondo.appendChild(caja);
    document.body.appendChild(fondo);

    const cerrar = () => {
      document.removeEventListener('keydown', alTeclear);
      fondo.remove();
    };
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclear);
    fondo.addEventListener('mousedown', (e) => { if (e.target === fondo) cerrar(); });

    construir(caja, cerrar);
    return cerrar;
  }

  function botonModal(texto, clase, onClick) {
    const b = el('button', '', texto);
    b.type = 'button';
    b.className = 'btn ' + clase;
    b.addEventListener('click', onClick);
    return b;
  }

  // ---------- SEÑAL DE INTERÉS ----------
  // miSenal: { monto, nota } o null. alGuardar(estado) recibe { monto, nota, count } o null si se retiró
  function abrirModalSenal(pub, miSenal, alGuardar) {
    abrirModal((caja, cerrar) => {
      caja.setAttribute('aria-labelledby', 'tituloSenal');
      const h = el('h3', '', '💰 Señal de interés');
      h.id = 'tituloSenal';
      const ayuda = el('p', '', `¿Cuánto podrías invertir en "${String(pub.titulo).slice(0, 80)}"? Solo el dueño del proyecto verá el monto. No es un compromiso legal.`);
      ayuda.className = 'ayuda';

      const lblMonto = el('label', '', 'Monto que invertirías (en dólares, solo el número)');
      lblMonto.htmlFor = 'senalMonto';
      const monto = el('input');
      monto.type = 'text';
      monto.id = 'senalMonto';
      monto.inputMode = 'numeric';
      monto.autocomplete = 'off';
      monto.placeholder = 'Ej: 5000';
      monto.maxLength = 11;
      monto.value = miSenal ? String(miSenal.monto) : '';
      campoSoloNumeros(monto);

      const lblNota = el('label', '', 'Mensaje para el emprendedor (opcional)');
      lblNota.htmlFor = 'senalNota';
      const nota = el('textarea');
      nota.id = 'senalNota';
      nota.maxLength = 300;
      nota.placeholder = 'Ej: Me interesa conversar sobre condiciones.';
      nota.value = miSenal && miSenal.nota ? miSenal.nota : '';

      const acciones = el('div');
      acciones.className = 'acciones';

      const guardar = botonModal(miSenal ? 'Actualizar señal' : 'Enviar señal', 'btn-primary', async () => {
        let valor;
        try { valor = leerMonto(monto.value, true); }
        catch (e) { mostrarNotificacion(e.message, 'error'); monto.focus(); return; }

        guardar.disabled = true;
        const user = await getCurrentUser();
        const datosNota = nota.value.trim().slice(0, 300) || null;
        let error;
        if (miSenal) {
          ({ error } = await window.supabaseClient.from('senales_interes')
            .update({ monto: valor, nota: datosNota })
            .eq('publicacion_id', pub.id).eq('usuario_id', user.id));
        } else {
          ({ error } = await window.supabaseClient.from('senales_interes')
            .insert([{ publicacion_id: pub.id, usuario_id: user.id, monto: valor, nota: datosNota }]));
        }
        if (error) {
          console.error('Error guardando señal:', error);
          mostrarNotificacion(error.code === '42501' ? 'No puedes enviar una señal a este proyecto' : 'No se pudo guardar tu señal', 'error');
          guardar.disabled = false;
          return;
        }
        const { data: p } = await window.supabaseClient.from('publicaciones').select('senales_count').eq('id', pub.id).maybeSingle();
        cerrar();
        mostrarNotificacion(miSenal ? 'Señal actualizada' : '💰 Señal enviada al emprendedor');
        if (alGuardar) alGuardar({ monto: valor, nota: datosNota, count: p ? p.senales_count : undefined });
      });

      acciones.append(botonModal('Cancelar', 'btn-secondary', cerrar));
      if (miSenal) {
        acciones.append(botonModal('Retirar señal', 'btn-secondary', async () => {
          if (!confirm('¿Retirar tu señal de interés?')) return;
          const user = await getCurrentUser();
          const { error } = await window.supabaseClient.from('senales_interes')
            .delete().eq('publicacion_id', pub.id).eq('usuario_id', user.id);
          if (error) { mostrarNotificacion('No se pudo retirar la señal', 'error'); return; }
          const { data: p } = await window.supabaseClient.from('publicaciones').select('senales_count').eq('id', pub.id).maybeSingle();
          cerrar();
          mostrarNotificacion('Señal retirada');
          if (alGuardar) alGuardar(null, p ? p.senales_count : undefined);
        }));
      }
      acciones.append(guardar);

      caja.append(h, ayuda, lblMonto, monto, lblNota, nota, acciones);
      monto.focus();
    });
  }

  // El dueño del proyecto ve quién mostró interés y cuánto
  async function abrirModalSenalesRecibidas(pubId, titulo) {
    const { data, error } = await window.supabaseClient
      .from('senales_interes')
      .select('monto, nota, created_at, usuario_id, usuario:usuarios(nombre_completo, nombre_usuario, foto_perfil)')
      .eq('publicacion_id', pubId)
      .order('monto', { ascending: false });

    abrirModal((caja, cerrar) => {
      const h = el('h3', '', '💰 Señales de interés');
      const ayuda = el('p', '', `Personas interesadas en "${String(titulo).slice(0, 80)}". Esta información es privada.`);
      ayuda.className = 'ayuda';
      caja.append(h, ayuda);

      if (error) {
        caja.append(el('p', 'color: var(--error);', 'No se pudieron cargar las señales.'));
      } else if (!data || data.length === 0) {
        caja.append(el('p', 'color: var(--gris-neon);', 'Todavía nadie ha enviado una señal. Comparte tu proyecto para recibir las primeras.'));
      } else {
        const total = data.reduce((s, x) => s + Number(x.monto), 0);
        caja.append(el('p', 'margin-bottom: 14px; font-weight: 600;', `${data.length} señal(es) · Total: ${formatoUSD(total)}`));
        data.forEach(s => {
          const fila = el('div', 'display:flex; gap:12px; padding:12px 0; border-top:1px solid var(--gris-medio); align-items:flex-start;');
          const foto = el('img', 'width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0;');
          foto.src = urlImagenCruda(s.usuario && s.usuario.foto_perfil);
          foto.alt = '';
          const info = el('div', 'flex:1; min-width:0;');
          const nombre = el('div', 'font-weight:600;', s.usuario ? s.usuario.nombre_completo : 'Usuario');
          const dinero = el('div', 'color: var(--acento); font-weight:700;', formatoUSD(s.monto));
          info.append(nombre, dinero);
          if (s.nota) info.append(el('div', 'font-size:13px; color: var(--gris-neon); margin-top:4px; white-space:pre-wrap; word-break:break-word;', s.nota));
          const escribir = botonModal('💬 Escribir', 'btn-secondary', () => {
            window.location.href = 'chat.html?nuevo=' + encodeURIComponent(s.usuario_id);
          });
          escribir.style.padding = '8px 12px';
          fila.append(foto, info, escribir);
          caja.append(fila);
        });
      }
      const acciones = el('div');
      acciones.className = 'acciones';
      acciones.append(botonModal('Cerrar', 'btn-secondary', cerrar));
      caja.append(acciones);
    });
  }

  // ---------- TESIS DEL INVERSOR ----------
  async function abrirModalTesis(alGuardar) {
    const user = await getCurrentUser();
    const { data: actual } = await window.supabaseClient.from('tesis_inversor').select('*').eq('usuario_id', user.id).maybeSingle();

    abrirModal((caja, cerrar) => {
      const h = el('h3', '', '🎯 Mi tesis de inversión');
      const ayuda = el('p', '', 'Cuéntanos qué buscas y cada día te mostraremos los proyectos que mejor encajan. Solo tú ves esto.');
      ayuda.className = 'ayuda';
      caja.append(h, ayuda);

      const grupoChecks = (titulo, opciones, seleccion) => {
        caja.append(el('label', '', titulo));
        const cont = el('div');
        cont.className = 'ax-checks';
        opciones.forEach(([valor, texto]) => {
          const lbl = el('label');
          lbl.className = 'ax-check';
          const cb = el('input');
          cb.type = 'checkbox';
          cb.value = valor;
          cb.checked = seleccion.includes(valor);
          lbl.append(cb, document.createTextNode(texto));
          cont.append(lbl);
        });
        caja.append(cont);
        return cont;
      };

      const contCat = grupoChecks('Sectores', CATEGORIAS.map(c => [c, c]), (actual && actual.categorias) || []);
      const contEta = grupoChecks('Etapas', Object.entries(ETAPAS), (actual && actual.etapas) || []);

      const lblCiu = el('label', '', 'Ciudades (opcional)');
      lblCiu.htmlFor = 'tesisCiudad';
      const ciu = el('input');
      ciu.type = 'text';
      ciu.id = 'tesisCiudad';
      ciu.maxLength = 80;
      ciu.placeholder = 'Busca una ciudad y elígela de la lista';
      const chipsCiu = el('div');
      chipsCiu.className = 'chips';
      let ciudadesSel = actual && actual.ciudades ? [...actual.ciudades] : [];
      const pintarChips = () => {
        chipsCiu.replaceChildren();
        ciudadesSel.forEach((c) => {
          const chip = el('span'); chip.className = 'chip'; chip.append(document.createTextNode(c + ' '));
          const x = el('button', 'background:none;border:none;color:inherit;cursor:pointer;font-size:14px;padding:0 0 0 4px;', '✕');
          x.type = 'button'; x.setAttribute('aria-label', 'Quitar ' + c);
          x.addEventListener('click', () => { ciudadesSel = ciudadesSel.filter((k) => k !== c); pintarChips(); });
          chip.append(x); chipsCiu.append(chip);
        });
      };
      pintarChips();
      if (window.Ciudades) {
        Ciudades.enlazar(ciu, { alElegir: (v) => {
          if (ciudadesSel.length >= 10) mostrarNotificacion('Máximo 10 ciudades', 'error');
          else if (!ciudadesSel.includes(v)) ciudadesSel.push(v);
          ciu.value = ''; delete ciu.dataset.valor; pintarChips();
        } });
      }

      const lblMin = el('label', '', 'Monto mínimo que buscas (USD, solo número)');
      lblMin.htmlFor = 'tesisMin';
      const min = el('input');
      min.type = 'text'; min.id = 'tesisMin'; min.inputMode = 'numeric'; min.placeholder = 'Ej: 1000';
      min.value = actual && actual.monto_min !== null ? String(actual.monto_min) : '';
      campoSoloNumeros(min);

      const lblMax = el('label', '', 'Monto máximo (USD, solo número)');
      lblMax.htmlFor = 'tesisMax';
      const max = el('input');
      max.type = 'text'; max.id = 'tesisMax'; max.inputMode = 'numeric'; max.placeholder = 'Ej: 50000';
      max.value = actual && actual.monto_max !== null ? String(actual.monto_max) : '';
      campoSoloNumeros(max);

      caja.append(lblCiu, ciu, chipsCiu, lblMin, min, lblMax, max);

      const acciones = el('div');
      acciones.className = 'acciones';
      const guardar = botonModal('Guardar tesis', 'btn-primary', async () => {
        const marcados = (cont) => Array.from(cont.querySelectorAll('input:checked')).map(i => i.value);
        const categorias = marcados(contCat);
        const etapas = marcados(contEta);
        const ciudades = ciudadesSel.slice(0, 10);
        let vMin, vMax;
        try { vMin = leerMonto(min.value, false); vMax = leerMonto(max.value, false); }
        catch (e) { mostrarNotificacion(e.message, 'error'); return; }
        if (vMin !== null && vMax !== null && vMin > vMax) {
          mostrarNotificacion('El monto mínimo no puede ser mayor que el máximo', 'error');
          return;
        }
        if (!categorias.length && !etapas.length && !ciudades.length && vMin === null && vMax === null) {
          mostrarNotificacion('Elige al menos un criterio', 'error');
          return;
        }
        guardar.disabled = true;
        const fila = { categorias, etapas, ciudades, monto_min: vMin, monto_max: vMax };
        let error;
        if (actual) {
          ({ error } = await window.supabaseClient.from('tesis_inversor').update(fila).eq('usuario_id', user.id));
        } else {
          ({ error } = await window.supabaseClient.from('tesis_inversor').insert([{ usuario_id: user.id, ...fila }]));
        }
        if (error) {
          console.error('Error guardando tesis:', error);
          mostrarNotificacion('No se pudo guardar tu tesis', 'error');
          guardar.disabled = false;
          return;
        }
        cerrar();
        mostrarNotificacion('🎯 Tesis guardada');
        if (alGuardar) alGuardar();
      });
      acciones.append(botonModal('Cancelar', 'btn-secondary', cerrar), guardar);
      caja.append(acciones);
    });
  }

  window.Proyectos = {
    CATEGORIAS, ETAPAS, MONTO_MAX,
    formatoUSD, soloDigitos, leerMonto, campoSoloNumeros, limpiarCiudad, terminoBusqueda,
    chipsProyecto, abrirModal, abrirModalSenal, abrirModalSenalesRecibidas, abrirModalTesis
  };
})();


/* ===== ciudades ===== */
/**
 * Arnexu · selector de ciudades del mundo con sugerencias mientras escribes.
 * Datos: arnexu-ciudades.txt (≈107.000 ciudades de GeoNames). Si ese archivo no carga, usa una lista
 * integrada de las ciudades más importantes para que el campo nunca quede inservible.
 */
(function () {
  'use strict';
  (window.__arnexuModulos = window.__arnexuModulos || {}).ciudades = true;

  const FALLBACK = /*FALLBACK*/[["Shanghái","CN",""],["Istanbul","TR",""],["Estambul","TR",""],["Buenos Aires","AR",""],["Mumbai","IN",""],["Bombay","IN",""],["Mexico City","MX",""],["Ciudad de México","MX",""],["Beijing","CN",""],["Pekín","CN",""],["Karachi","PK",""],["Tianjin","CN",""],["Guangzhou","CN",""],["Cantón","CN",""],["Delhi","IN",""],["Moscow","RU",""],["Moscú","RU",""],["Shenzhen","CN",""],["Dhaka","BD",""],["Daca","BD",""],["Seoul","KR",""],["Seúl","KR",""],["São Paulo","BR",""],["Wuhan","CN",""],["Lagos","NG",""],["Jakarta","ID",""],["Yakarta","ID",""],["Tokyo","JP",""],["Tokio","JP",""],["New York City","US","NY"],["Nueva York","US","NY"],["Dongguan","CN",""],["Taipéi","TW",""],["Kinshasa","CD",""],["Lima","PE",""],["Cairo","EG",""],["El Cairo","EG",""],["Bogotá","CO",""],["London","GB",""],["Londres","GB",""],["Chongqing","CN",""],["Chengdu","CN",""],["Baghdad","IQ",""],["Bagdad","IQ",""],["Nanjing","CN",""],["Tehran","IR",""],["Teherán","IR",""],["Nanchong","CN",""],["Hong Kong","HK",""],["Xi’an","CN",""],["Lahore","PK",""],["Shenyang","CN",""],["Hangzhou","CN",""],["Río de Janeiro","BR",""],["Harbin","CN",""],["Tai’an","CN",""],["Suzhou","CN",""],["Shantou","CN",""],["Bangkok","TH",""],["Bengaluru","IN",""],["Bangalore","IN",""],["Saint Petersburg","RU",""],["San Petersburgo","RU",""],["Santiago","CL",""],["Kolkata","IN",""],["Calcuta","IN",""],["Sydney","AU",""],["Sídney","AU",""],["Yangon","MM",""],["Rangún","MM",""],["Jinan","CN",""],["Chennai","IN",""],["Zhengzhou","CN",""],["Melbourne","AU",""],["Riyadh","SA",""],["Riad","SA",""],["Changchun","CN",""],["Dalian","CN",""],["Los Ángeles","US","CA"],["Chittagong","BD",""],["Kunming","CN",""],["Alexandria","EG",""],["Ahmedabad","IN",""],["Qingdao","CN",""],["Busan","KR",""],["Abidjan","CI",""],["Kano","NG",""],["Foshan","CN",""],["Hyderabad","IN",""],["Puyang","CN",""],["Yokohama","JP",""],["Ibadan","NG",""],["Singapore","SG",""],["Singapur","SG",""],["Wuxi","CN",""],["Xiamen","CN",""],["Ankara","TR",""],["Tianshui","CN",""],["Ningbo","CN",""],["Ho Chi Minh City","VN",""],["Saigón","VN",""],["Shiyan","CN",""],["Cape Town","ZA",""],["Ciudad del Cabo","ZA",""],["Taiyuan","CN",""],["Berlín","DE",""],["Tangshan","CN",""],["Hefei","CN",""],["Madrid","ES",""],["Pyongyang","KP",""],["Casablanca","MA",""],["Zibo","CN",""],["Zhongshan","CN",""],["Durban","ZA",""],["Changsha","CN",""],["Kabul","AF",""],["Ürümqi","CN",""],["Caracas","VE",""],["Dubái","AE",""],["Pune","IN",""],["Sūrat","IN",""],["Jeddah","SA",""],["Shijiazhuang","CN",""],["Kanpur","IN",""],["Kyiv","UA",""],["Kiev","UA",""],["Luanda","AO",""],["Quezon City","PH",""],["Addis Ababa","ET",""],["Adís Abeba","ET",""],["Nairobi","KE",""],["Chicago","US","IL"],["Salvador","BR",""],["Jaipur","IN",""],["Dar es Salaam","TZ",""],["Lanzhou","CN",""],["Incheon","KR",""],["Yunfu","CN",""],["Toronto","CA",""],["Navi Mumbai","IN",""],["Basrah","IQ",""],["Osaka","JP",""],["Mogadishu","SO",""],["Daegu","KR",""],["Faisalabad","PK",""],["İzmir","TR",""],["Dakar","SN",""],["Lucknow","IN",""],["Giza","EG",""],["Fortaleza","BR",""],["Cali","CO",""],["Surabaya","ID",""],["Belo Horizonte","BR",""],["Nanchang","CN",""],["Rome","IT",""],["Roma","IT",""],["Mashhad","IR",""],["Brooklyn","US","NY"],["Houston","US","TX"],["Queens","US","NY"],["Nagpur","IN",""],["Maracaibo","VE",""],["Brasília","BR",""],["Santo Domingo","DO",""],["Nagoya","JP",""],["Brisbane","AU",""],["Havana","CU",""],["La Habana","CU",""],["París","FR",""],["Al Mawşil al Jadīdah","IQ",""],["Johannesburg","ZA",""],["Johannesburgo","ZA",""],["Kowloon","HK",""],["Al Başrah al Qadīmah","IQ",""],["Almaty","KZ",""],["Dadonghai","CN",""],["Medellín","CO",""],["Tashkent","UZ",""],["Algiers","DZ",""],["Argel","DZ",""],["Khartoum","SD",""],["Accra","GH",""],["Guayaquil","EC",""],["Ordos","CN",""],["Sanaa","YE",""],["Beirut","LB",""],["Perth","AU",""],["Sapporo","JP",""],["Jilin","CN",""],["Bucharest","RO",""],["Bucarest","RO",""],["Hamburgo","DE",""],["Varsovia","PL",""],["Viena","AT",""],["Damasco","SY",""],["Filadelfia","US","PA"],["Estocolmo","SE",""],["Kioto","JP",""],["Katmandú","NP",""],["La Meca","SA",""],["Belgrado","RS",""],["Praga","CZ",""],["Copenhague","DK",""],["Bruselas","BE",""],["Ciudad de Guatemala","GT",""],["Fez","MA",""],["Nápoles","IT",""],["Jerusalén","IL",""],["Cracovia","PL",""],["Túnez","TN",""],["Atenas","GR",""],["Fráncfort","DE",""],["Róterdam","NL",""],["Génova","IT",""],["Gotemburgo","SE",""],["Vilna","LT",""],["Lisboa","PT",""],["Dresde","DE",""],["Skopie","MK",""],["La Haya","NL",""],["Edimburgo","GB",""],["Amberes","BE",""],["Tallin","EE",""],["Nueva Orleans","US","LA"],["Bolonia","IT",""],["Salónica","GR",""],["Florencia","IT",""],["Nueva Delhi","IN",""],["Liubliana","SI",""],["Oporto","PT",""],["Chipre","CY",""],["Ginebra","CH",""],["Basilea","CH",""],["Ratisbona","DE",""],["Berna","CH",""],["Reikiavik","IS",""],["Venecia","IT",""],["La Valeta","MT",""]];

  // ---------- utilidades ----------
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  let nombresPais = null;
  function nombrePais(cc) {
    try {
      if (!nombresPais) nombresPais = new Intl.DisplayNames(['es'], { type: 'region' });
      return nombresPais.of(cc) || cc;
    } catch (e) { return cc; }
  }

  let datos = null, promesa = null;

  function construir(filas, paises, esFallback) {
    const n = filas.length;
    const d = { n, nombre: new Array(n), norm: new Array(n), cc: new Array(n), adm: new Array(n), paisNorm: {}, paisTxt: {}, fallback: esFallback };
    filas.forEach((f, i) => { d.nombre[i] = f[0]; d.norm[i] = norm(f[0]); d.cc[i] = f[1]; d.adm[i] = f[2] || ''; });
    paises.forEach((cc) => { d.paisTxt[cc] = nombrePais(cc); d.paisNorm[cc] = norm(d.paisTxt[cc]); });
    return d;
  }

  function desdeFallback() {
    const paises = [...new Set(FALLBACK.map((f) => f[1]))];
    return construir(FALLBACK, paises, true);
  }

  function procesarTexto(texto) {
    const lineas = texto.split('\n');
    const paises = lineas[0].slice(1).split(',');
    const filas = [];
    for (let i = 1; i < lineas.length; i++) {
      const p = lineas[i].split('\t');
      if (p.length < 2) continue;
      filas.push([p[1], paises[parseInt(p[0], 10)], p[2] || '']);
    }
    return construir(filas, paises, false);
  }

  function cargar() {
    if (datos) return Promise.resolve(datos);
    if (promesa) return promesa;
    promesa = fetch('arnexu-ciudades.txt', { cache: 'force-cache' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((t) => { datos = procesarTexto(t); return datos; })
      .catch((e) => { console.warn('No se pudo cargar la lista completa de ciudades; se usa la lista básica.', e); datos = desdeFallback(); return datos; });
    return promesa;
  }

  // ¿a y b difieren como máximo en una letra de más, de menos, cambiada, o dos letras intercambiadas?
  function aUnaEdicion(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (i === la || i === lb) return Math.abs(la - lb) <= 1;
    if (la === lb) {
      if (a.slice(i + 1) === b.slice(i + 1)) return true;                                   // letra cambiada
      return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);   // letras intercambiadas
    }
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);         // una de más / de menos
  }

  function etiqueta(d, i) {
    return d.nombre[i] + (d.adm[i] ? ', ' + d.adm[i] : '') + ', ' + d.paisTxt[d.cc[i]];
  }

  // Hasta `max` sugerencias: primero las que empiezan igual, luego palabras, luego "contiene", luego con errores de tipeo.
  // Los datos vienen ordenados por población, así que dentro de cada grupo salen primero las ciudades más grandes.
  function buscarEn(d, texto, max) {
    let q = norm(texto), filtroPais = '';
    const coma = String(texto).indexOf(',');
    if (coma > 0) { q = norm(String(texto).slice(0, coma)); filtroPais = norm(String(texto).slice(coma + 1).split(',').pop()); }
    if (q.length < 2) return [];
    const pasaPais = (i) => !filtroPais || d.paisNorm[d.cc[i]].startsWith(filtroPais) || d.paisNorm[d.cc[i]].includes(' ' + filtroPais);
    const exactas = [], p = [], w = [], c = [], t = [];
    const n = d.n;
    for (let i = 0; i < n; i++) {
      const nm = d.norm[i];
      if (!pasaPais(i)) continue;
      if (nm.startsWith(q)) { (nm === q ? exactas : p).push(i); if (exactas.length + p.length >= max) break; }
      else if (w.length < max && nm.includes(' ' + q)) w.push(i);
      else if (c.length < max && q.length >= 3 && nm.includes(q)) c.push(i);
    }
    let r = [...exactas, ...p, ...w, ...c];
    if (r.length < max && q.length >= 4) {                       // errores de tipeo: "medelin" → Medellín
      for (let i = 0; i < n && t.length < max; i++) {
        const nm = d.norm[i];
        if (nm.length < q.length - 1 || !pasaPais(i)) continue;
        if (nm[0] !== q[0] && nm[1] !== q[1]) continue;
        if (aUnaEdicion(q, nm.slice(0, q.length)) || aUnaEdicion(q, nm.slice(0, q.length - 1)) || aUnaEdicion(q, nm.slice(0, q.length + 1))) t.push(i);
      }
      r = r.concat(t.filter((i) => !r.includes(i)));
    }
    const vistos = new Set();
    return r.filter((i) => { const k = etiqueta(d, i); if (vistos.has(k)) return false; vistos.add(k); return true; })
      .slice(0, max).map((i) => ({ valor: etiqueta(d, i), ciudad: d.nombre[i], pais: d.paisTxt[d.cc[i]] }));
  }

  async function buscar(texto, max = 8) { return buscarEn(await cargar(), texto, max); }

  // ---------- componente de interfaz ----------
  let contador = 0;

  function resaltar(contenedor, texto, consulta) {
    const q = String(consulta).split(',')[0].trim();
    const base = norm(texto);
    const nq = norm(q);
    const pos = nq.length >= 2 ? base.indexOf(nq) : -1;
    if (pos < 0 || base.length !== texto.length) { contenedor.textContent = texto; return; }
    contenedor.append(document.createTextNode(texto.slice(0, pos)));
    const m = document.createElement('mark'); m.textContent = texto.slice(pos, pos + nq.length);
    contenedor.append(m, document.createTextNode(texto.slice(pos + nq.length)));
  }

  function enlazar(input, opciones = {}) {
    if (!input || input.dataset.ciudadesListo) return null;
    input.dataset.ciudadesListo = '1';
    const id = 'ciu-lista-' + (++contador);

    const envoltura = document.createElement('div');
    envoltura.className = 'ciu-wrap';
    input.parentNode.insertBefore(envoltura, input);
    envoltura.appendChild(input);
    const lista = document.createElement('ul');
    lista.className = 'ciu-lista'; lista.id = id; lista.setAttribute('role', 'listbox'); lista.hidden = true;
    envoltura.appendChild(lista);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'words');
    input.setAttribute('spellcheck', 'false');
    if (!input.placeholder) input.placeholder = 'Escribe tu ciudad…';

    let items = [], activo = -1, temporizador = null, ultimaConsulta = 0;

    const cerrar = () => { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); activo = -1; input.removeAttribute('aria-activedescendant'); };
    const abrir = () => { lista.hidden = false; input.setAttribute('aria-expanded', 'true'); };

    function elegir(valor) {
      input.value = valor; input.dataset.valor = valor;
      cerrar();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (opciones.alElegir) opciones.alElegir(valor);
    }

    function marcar(i) {
      const lis = lista.querySelectorAll('li[role=option]');
      lis.forEach((li, k) => { li.setAttribute('aria-selected', k === i ? 'true' : 'false'); li.classList.toggle('activa', k === i); });
      activo = i;
      if (lis[i]) { input.setAttribute('aria-activedescendant', lis[i].id); if (lis[i].scrollIntoView) lis[i].scrollIntoView({ block: 'nearest' }); }
    }

    function pintar(res, consulta, estado) {
      lista.replaceChildren();
      if (estado) {
        const li = document.createElement('li'); li.className = 'ciu-estado'; li.textContent = estado; lista.appendChild(li); abrir(); return;
      }
      items = res;
      if (!res.length) {
        const li = document.createElement('li'); li.className = 'ciu-estado';
        li.textContent = 'No encontramos esa ciudad. Revisa cómo la escribiste.'; lista.appendChild(li); abrir(); return;
      }
      res.forEach((r, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option'); li.id = id + '-' + i; li.setAttribute('aria-selected', 'false');
        const ciudad = document.createElement('span'); ciudad.className = 'ciu-nombre'; resaltar(ciudad, r.ciudad, consulta);
        const pais = document.createElement('span'); pais.className = 'ciu-pais'; pais.textContent = r.valor.slice(r.ciudad.length).replace(/^,\s*/, '');
        li.append(ciudad, pais);
        li.addEventListener('mousedown', (e) => { e.preventDefault(); elegir(r.valor); });
        li.addEventListener('mousemove', () => marcar(i));
        lista.appendChild(li);
      });
      abrir(); marcar(0);
    }

    async function consultar() {
      const texto = input.value;
      if (norm(texto).length < 2) { cerrar(); return; }
      const mia = ++ultimaConsulta;
      if (!datos) pintar([], texto, 'Cargando ciudades del mundo…');
      const res = await buscar(texto, 8);
      if (mia !== ultimaConsulta) return;
      pintar(res, texto);
    }

    input.addEventListener('focus', () => { cargar(); if (norm(input.value).length >= 2 && input.dataset.valor !== input.value) consultar(); });
    input.addEventListener('input', () => {
      delete input.dataset.valor;
      clearTimeout(temporizador); temporizador = setTimeout(consultar, 90);
    });
    input.addEventListener('blur', () => setTimeout(cerrar, 120));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { if (lista.hidden) { consultar(); } else if (items.length) marcar((activo + 1) % items.length); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { if (items.length && !lista.hidden) { marcar((activo - 1 + items.length) % items.length); e.preventDefault(); } }
      else if (e.key === 'Enter') { if (!lista.hidden && items[activo]) { e.preventDefault(); elegir(items[activo].valor); } }
      else if (e.key === 'Escape') { if (!lista.hidden) { cerrar(); e.stopPropagation(); } }
    });

    return { cerrar };
  }

  // ---------- validación ----------
  // Una ciudad es válida si se eligió de la lista (o es una ciudad ya guardada). Si la lista completa no pudo
  // cargarse (sin internet), se acepta texto libre para no bloquear al usuario.
  function valido(input) {
    const v = input.value.trim();
    if (!v) return false;
    if (input.dataset.valor && input.dataset.valor === input.value) return true;
    return !!(datos && datos.fallback && v.length >= 2);
  }
  function establecer(input, valor) { input.value = valor || ''; if (valor) input.dataset.valor = valor; else delete input.dataset.valor; }

  window.Ciudades = { enlazar, buscar, cargar, valido, establecer, norm, _buscarEn: buscarEn, _procesarTexto: procesarTexto };
})();


/* ===== pwa ===== */
(window.__arnexuModulos = window.__arnexuModulos || {}).pwa = true;
/**
 * Arnexu · app instalable (PWA) y notificaciones push.
 * Requiere config.js y push-config.js. Se carga en todas las páginas.
 */
(function () {
  'use strict';

  const esSeguro = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const soportaSW = 'serviceWorker' in navigator && esSeguro;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  let promptInstalacion = null;

  // ---------- Service Worker ----------
  if (soportaSW) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=2.0.0').catch((e) => console.warn('No se pudo registrar el service worker:', e));
    });
  }

  // ---------- utilidades ----------
  function claveABytes(base64) {
    const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
    const crudo = atob(b64);
    return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
  }

  const pushDisponible = () =>
    soportaSW && 'PushManager' in window && 'Notification' in window &&
    typeof VAPID_PUBLIC_KEY === 'string' && VAPID_PUBLIC_KEY.length > 20;

  async function registro() { return navigator.serviceWorker.ready; }

  async function guardarSuscripcion(sub) {
    const j = sub.toJSON();
    if (!j.endpoint || !j.keys) throw new Error('Suscripción incompleta');
    const { error } = await window.supabaseClient.rpc('registrar_push', {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: navigator.userAgent
    });
    if (error) throw error;
  }

  async function suscribir(reg) {
    let sub = await reg.pushManager.getSubscription();
    if (sub) return sub;
    return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(VAPID_PUBLIC_KEY) });
  }

  // ---------- activar / desactivar ----------
  async function activar() {
    if (!pushDisponible()) { mostrarNotificacion('Este navegador no permite notificaciones', 'error'); return false; }
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      mostrarNotificacion('Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.', 'error');
      return false;
    }
    try {
      const reg = await registro();
      let sub;
      try { sub = await suscribir(reg); }
      catch (e) { // clave anterior distinta: se renueva
        const vieja = await reg.pushManager.getSubscription();
        if (vieja) await vieja.unsubscribe();
        sub = await suscribir(reg);
      }
      await guardarSuscripcion(sub);
      mostrarNotificacion('🔔 Notificaciones activadas');
      return true;
    } catch (e) {
      console.error('Error activando notificaciones:', e);
      mostrarNotificacion('No se pudieron activar las notificaciones', 'error');
      return false;
    }
  }

  async function quitarDispositivo() {
    if (!soportaSW) return;
    const reg = await registro();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await window.supabaseClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  }

  async function desactivar() {
    try {
      const reg = await registro();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await window.supabaseClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      mostrarNotificacion('Notificaciones desactivadas');
      return true;
    } catch (e) {
      console.error(e);
      mostrarNotificacion('No se pudieron desactivar', 'error');
      return false;
    }
  }

  async function estadoPush() {
    if (!pushDisponible() || Notification.permission !== 'granted') return false;
    try { const reg = await registro(); return !!(await reg.pushManager.getSubscription()); } catch (e) { return false; }
  }

  // Si el permiso ya estaba concedido, deja el dispositivo registrado para la cuenta actual
  async function resincronizar(user) {
    if (!pushDisponible() || Notification.permission !== 'granted') return;
    const clave = 'arnexu_push_sync_' + user.id;
    if (sessionStorage.getItem(clave)) return;
    try {
      const reg = await registro();
      const sub = await suscribir(reg);
      await guardarSuscripcion(sub);
      sessionStorage.setItem(clave, '1');
    } catch (e) { console.warn('No se pudo resincronizar el push:', e); }
  }

  // ---------- botones en la barra ----------
  function agregarBoton(id, texto, titulo, alClick) {
    const menu = document.querySelector('.navbar-menu');
    if (!menu) return null;
    let li = menu.querySelector(`[data-nav-extra="${id}"]`);
    if (!li) {
      li = document.createElement('li');
      li.setAttribute('data-nav-extra', id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-extra';
      b.addEventListener('click', alClick);
      li.appendChild(b);
      menu.insertBefore(li, menu.lastElementChild);
    }
    const b = li.firstChild;
    b.textContent = texto;
    b.title = titulo;
    b.setAttribute('aria-label', titulo);
    return li;
  }

  async function pintarCampana() {
    if (!pushDisponible()) return;
    const activa = await estadoPush();
    agregarBoton('campana', activa ? '🔔' : '🔕', activa ? 'Notificaciones activadas (toca para desactivar)' : 'Activar notificaciones',
      async () => { if (await estadoPush()) await desactivar(); else await activar(); pintarCampana(); });
  }

  function pintarInstalar() {
    if (instalada()) return;
    if (promptInstalacion) {
      agregarBoton('instalar', '📲', 'Instalar la app de Arnexu', async () => {
        promptInstalacion.prompt();
        const r = await promptInstalacion.userChoice;
        if (r.outcome === 'accepted') { const li = document.querySelector('[data-nav-extra="instalar"]'); if (li) li.remove(); }
        promptInstalacion = null;
      });
    } else if (esIOS) {
      agregarBoton('instalar', '📲', 'Cómo instalar la app', () => {
        alert('Para instalar Arnexu en tu iPhone o iPad:\n\n1. Toca el botón Compartir (el cuadrado con la flecha) en Safari.\n2. Elige "Añadir a pantalla de inicio".\n\nAsí también podrás recibir notificaciones.');
      });
    }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstalacion = e;
    pintarInstalar();
  });
  window.addEventListener('appinstalled', () => {
    promptInstalacion = null;
    const li = document.querySelector('[data-nav-extra="instalar"]');
    if (li) li.remove();
    mostrarNotificacion('📲 Arnexu instalada');
  });

  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.querySelector('.navbar-menu') || !window.supabaseClient) return;
    try {
      const user = await getCurrentUser();
      if (!user) return;
      pintarInstalar();
      await pintarCampana();
      resincronizar(user);
    } catch (e) { /* sin sesión: no hay botones */ }
  });

  window.arnexuPush = { activar, desactivar, quitarDispositivo, estadoPush };
})();


/* ===== badge-notifications ===== */
/**
 * Sistema de Notificaciones Globales para Arnexu
 * Archivo: js/badge-notifications.js
 * 
 * Este script muestra el contador de mensajes no leídos en todas las páginas
 */

(function() {
  'use strict';

  let intervalNotificacionesGlobal = null;
  let usuarioActualGlobal = null;

  /**
   * Inicializa el sistema de notificaciones
   */
  async function inicializarNotificaciones() {
    try {
      // Esperar a que supabaseClient esté disponible
      if (typeof window.supabaseClient === 'undefined') {
        console.warn('Supabase no está inicializado aún');
        setTimeout(inicializarNotificaciones, 500);
        return;
      }

      // Obtener usuario actual
      const { data: { user }, error } = await window.supabaseClient.auth.getUser();
      
      if (error || !user) {
        console.log('Usuario no autenticado, notificaciones deshabilitadas');
        return;
      }

      usuarioActualGlobal = user;

      // Actualizar inmediatamente
      await actualizarBadgeGlobal();

      // Iniciar actualización periódica cada 5 segundos
      if (intervalNotificacionesGlobal) {
        clearInterval(intervalNotificacionesGlobal);
      }
      intervalNotificacionesGlobal = setInterval(actualizarBadgeGlobal, 5000);

    } catch (error) {
      console.error('Error inicializando notificaciones:', error);
    }
  }

  /**
   * Actualiza el contador de mensajes no leídos
   */
  async function actualizarBadgeGlobal() {
    try {
      if (!usuarioActualGlobal) return;

      // Consultar mensajes no leídos
      const { data: noLeidos, error } = await window.supabaseClient
        .from('mensajes_no_leidos')
        .select('cantidad')
        .eq('usuario_id', usuarioActualGlobal.id);

      if (error) {
        console.error('Error consultando mensajes no leídos:', error);
        return;
      }

      // Calcular total de mensajes no leídos
      const totalNoLeidos = (noLeidos || []).reduce((sum, item) => sum + (item.cantidad || 0), 0);

      // Actualizar badge en la navbar
      const badge = document.getElementById('badgeGlobal');
      
      if (badge) {
        if (totalNoLeidos > 0) {
          badge.textContent = totalNoLeidos > 99 ? '99+' : totalNoLeidos;
          badge.style.display = 'flex';
          
          // Opcional: Actualizar título de la página
          if (totalNoLeidos > 0) {
            const tituloOriginal = document.title.replace(/^\(\d+\+?\)\s/, '');
            document.title = `(${totalNoLeidos > 99 ? '99+' : totalNoLeidos}) ${tituloOriginal}`;
          }
        } else {
          badge.style.display = 'none';
          // Restaurar título original
          document.title = document.title.replace(/^\(\d+\+?\)\s/, '');
        }
      }

    } catch (error) {
      console.error('Error actualizando badge global:', error);
    }
  }

  /**
   * Limpiar intervalos al salir de la página
   */
  function limpiarNotificaciones() {
    if (intervalNotificacionesGlobal) {
      clearInterval(intervalNotificacionesGlobal);
      intervalNotificacionesGlobal = null;
    }
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarNotificaciones);
  } else {
    inicializarNotificaciones();
  }

  // Limpiar al salir de la página
  window.addEventListener('beforeunload', limpiarNotificaciones);

  // Exponer funciones globalmente si se necesitan
  window.arnexuNotifications = {
    actualizar: actualizarBadgeGlobal,
    inicializar: inicializarNotificaciones,
    limpiar: limpiarNotificaciones
  };

})();
