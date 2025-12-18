// Esperar a que TODO esté cargado
document.addEventListener("DOMContentLoaded", () => {
  if (!window.window.supabaseClient) {
    console.error("Supabase no cargó");
    return;
  }
  console.log("✅ App inicializada correctamente");
});
