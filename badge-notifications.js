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