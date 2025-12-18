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
  await window.supabaseClient.auth.signOut();
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
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${tipo === 'error' ? '#ff4444' : '#00ff88'};
    color: #000;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
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