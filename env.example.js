// js/env.example.js
// 📝 INSTRUCCIONES DE CONFIGURACIÓN:
// 
// 1. Copia este archivo como 'env.js' en la misma carpeta js/
//    Comando: cp js/env.example.js js/env.js
//
// 2. Edita el archivo js/env.js (NO este archivo)
//
// 3. Reemplaza 'tu_api_key_aqui' con tu API key real de Groq
//
// 4. Para obtener tu API key de Groq:
//    - Ve a: https://console.groq.com/keys
//    - Inicia sesión o crea una cuenta gratuita
//    - Haz clic en "Create API Key"
//    - Dale un nombre descriptivo (ej: "Arnexu IA Mentor")
//    - Copia la key generada
//    - Pégala en js/env.js
//
// ⚠️ IMPORTANTE: 
// - NUNCA subas el archivo js/env.js a GitHub
// - El archivo .gitignore debe incluir js/env.js
// - Este archivo (env.example.js) SÍ se sube a GitHub como plantilla

window.ENV = {
  GROQ_API_KEY: 'tu_api_key_aqui'
};