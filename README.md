# 🚀 Arnexu - Plataforma de IA para Emprendedores

Plataforma web innovadora con mentor de IA empresarial powered by Groq, diseñada para ayudar a emprendedores y empresarios a tomar mejores decisiones.

![Arnexu Logo](arnexu-64x%20(1).png)

## ✨ Características Principales

- 🤖 **IA Mentor Empresarial**: Asistente inteligente que combina la sabiduría de Bill Gates, Mark Zuckerberg, Elon Musk y Jeff Bezos
- 💬 **Chat en Tiempo Real**: Conversaciones fluidas con respuestas instantáneas gracias a Groq
- 🎯 **Especializaciones**: 6 modos expertos para diferentes áreas de negocio
  - 📈 Marketing Digital y Growth Hacking
  - 🎨 Diseño UX/UI y Branding
  - 🎯 Estrategia de Negocio
  - ⚖️ Aspectos Legales
  - 💰 Finanzas y Fundraising
  - 💻 Tecnología y Desarrollo
- 📊 **Gestión de Uso**: Límite de 50 mensajes diarios por usuario con reinicio automático
- 💾 **Historial Persistente**: Todas tus conversaciones guardadas y organizadas
- 🔒 **Autenticación Segura**: Sistema completo con Supabase
- ⚡ **Ultra Rápido**: Respuestas casi instantáneas gracias a Groq AI

## 🛠️ Instalación y Configuración

### Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ Navegador web moderno (Chrome, Firefox, Safari, Edge)
- ✅ Cuenta en [Groq Console](https://console.groq.com/) - **GRATIS**
- ✅ Cuenta en [Supabase](https://supabase.com/) - **GRATIS**
- ✅ Editor de código (VS Code, Sublime, etc.)

### 🔧 Instalación Paso a Paso

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/arnexu.git
cd arnexu
```

#### 2. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp js/env.example.js js/env.js
```

#### 3. Obtener API Key de Groq

1. Ve a [Groq Console](https://console.groq.com/keys)
2. Inicia sesión con tu cuenta de Google/GitHub
3. Haz clic en **"Create API Key"**
4. Dale un nombre descriptivo: `Arnexu IA Mentor`
5. **Copia la API key generada** (solo se muestra una vez)

#### 4. Configurar tu API Key

Abre el archivo `js/env.js` que acabas de crear y pega tu API key:

```javascript
window.ENV = {
  GROQ_API_KEY: 'gsk_tu_api_key_real_aqui'
};
```

#### 5. Configurar Supabase

Edita el archivo `js/config.js` con tus credenciales de Supabase:

```javascript
const supabaseUrl = 'https://tu-proyecto.supabase.co';
const supabaseKey = 'tu_anon_key_aqui';
```

**Para obtener estas credenciales:**
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com/)
2. Settings → API
3. Copia `Project URL` y `anon public` key

#### 6. Crear Tablas en Supabase

Ejecuta estos scripts SQL en tu editor SQL de Supabase:

```sql
-- Tabla de conversaciones
CREATE TABLE conversaciones_ia (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE mensajes_ia (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversacion_id UUID REFERENCES conversaciones_ia(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('user', 'assistant')),
  contenido TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de uso diario
CREATE TABLE uso_ia (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  mensajes_enviados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, fecha)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_conversaciones_usuario ON conversaciones_ia(usuario_id, updated_at DESC);
CREATE INDEX idx_mensajes_conversacion ON mensajes_ia(conversacion_id, created_at ASC);
CREATE INDEX idx_uso_usuario_fecha ON uso_ia(usuario_id, fecha);
```

#### 7. Configurar Políticas de Seguridad (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE conversaciones_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_ia ENABLE ROW LEVEL SECURITY;

-- Políticas para conversaciones_ia
CREATE POLICY "Los usuarios pueden ver sus propias conversaciones"
  ON conversaciones_ia FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear sus propias conversaciones"
  ON conversaciones_ia FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias conversaciones"
  ON conversaciones_ia FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias conversaciones"
  ON conversaciones_ia FOR DELETE
  USING (auth.uid() = usuario_id);

-- Políticas para mensajes_ia
CREATE POLICY "Los usuarios pueden ver sus propios mensajes"
  ON mensajes_ia FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear sus propios mensajes"
  ON mensajes_ia FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Políticas para uso_ia
CREATE POLICY "Los usuarios pueden ver su propio uso"
  ON uso_ia FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden insertar su propio uso"
  ON uso_ia FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar su propio uso"
  ON uso_ia FOR UPDATE
  USING (auth.uid() = usuario_id);
```

#### 8. Ejecutar el Proyecto

Opción A - Abrir directamente:
```bash
# Simplemente abre inicio.html en tu navegador
open inicio.html  # macOS
start inicio.html # Windows
xdg-open inicio.html # Linux
```

Opción B - Con servidor local (recomendado):
```bash
# Python 3
python -m http.server 8000

# Node.js (si tienes npm)
npx http-server

# PHP
php -S localhost:8000
```

Luego abre: `http://localhost:8000`

## 📁 Estructura del Proyecto

```
arnexu/
│
├── 📄 ia-mentor.html           # Página principal del IA Mentor
├── 📄 inicio.html              # Dashboard/Inicio
├── 📄 chat.html                # Chat general
├── 📄 crear.html               # Crear contenido
├── 📄 perfil.html              # Perfil de usuario
├── 📄 README.md                # Documentación (este archivo)
├── 📄 .gitignore               # Archivos ignorados por Git
│
├── 📁 css/
│   └── styles.css              # Estilos principales
│
├── 📁 js/
│   ├── env.example.js          # ✅ Plantilla de configuración (SUBIR)
│   ├── env.js                  # ❌ Configuración real (NO SUBIR)
│   ├── config.js               # Configuración de Supabase
│   ├── app.js                  # Funciones principales
│   └── badge-notifications.js  # Sistema de notificaciones
│
└── 📁 assets/
    └── arnexu-64x (1).png      # Logo de la aplicación
```

## 🎯 Uso de la Plataforma

### Iniciar Sesión

1. Abre `inicio.html`
2. Crea una cuenta o inicia sesión
3. Navega al IA Mentor desde el menú

### Usar el IA Mentor

1. **Selecciona una Especialización** (opcional):
   - Haz clic en uno de los botones de especialización
   - El mentor ajustará su enfoque a ese área

2. **Escribe tu Pregunta**:
   - Describe tu desafío empresarial
   - Sé específico para mejores respuestas

3. **Recibe Consejos Personalizados**:
   - Respuestas casi instantáneas
   - Consejos accionables y prácticos

4. **Gestiona tus Conversaciones**:
   - Crea nuevas conversaciones
   - Accede a conversaciones anteriores
   - Todo se guarda automáticamente

### Límites de Uso

- 📊 **50 mensajes por día** por usuario
- 🔄 Se reinicia automáticamente cada 24 horas
- 📈 Contador visible en la barra lateral

## 🔒 Seguridad y Mejores Prácticas

### ⚠️ CRÍTICO - Protección de API Keys

**NUNCA hagas esto:**
- ❌ Subir `js/env.js` a GitHub
- ❌ Compartir tu API key públicamente
- ❌ Hardcodear API keys en archivos públicos
- ❌ Hacer commit de archivos con credenciales

**SIEMPRE haz esto:**
- ✅ Mantén `js/env.js` en `.gitignore`
- ✅ Usa variables de entorno
- ✅ Rota tus API keys regularmente
- ✅ Monitorea el uso de tu API

### Configuración de Seguridad en Groq

1. Ve a [Groq Console Settings](https://console.groq.com/settings)
2. Configura **Rate Limits**:
   - Requests per minute: 30
   - Requests per day: 14,400
3. Monitorea el uso en el dashboard
4. Rota la API key si detectas uso sospechoso

### Para Producción

Si vas a desplegar en producción, considera:

1. **Backend Proxy**: Crear un servidor que maneje las llamadas a Groq
2. **Variables de Entorno del Servidor**: No exponer keys en el cliente
3. **Autenticación Robusta**: Verificar usuarios antes de permitir acceso
4. **Rate Limiting**: Implementar límites adicionales en tu servidor
5. **Logging**: Registrar uso para detectar anomalías

## 🐛 Solución de Problemas

### Error: "API key inválida"

**Solución:**
```bash
# Verifica que env.js existe
ls js/env.js

# Si no existe, créalo desde la plantilla
cp js/env.example.js js/env.js

# Edita y agrega tu API key real
nano js/env.js  # o usa tu editor preferido
```

### Error: "No se puede conectar a Supabase"

**Solución:**
1. Verifica credenciales en `js/config.js`
2. Asegúrate de que las tablas existan
3. Verifica que RLS esté configurado correctamente
4. Revisa la consola del navegador para errores específicos

### Error: "Failed to load resource"

**Solución:**
```bash
# Limpia caché del navegador
# Chrome: Ctrl + Shift + Delete
# Firefox: Ctrl + Shift + Delete
# Safari: Cmd + Option + E

# Verifica que env.js se está cargando
# Abre DevTools → Network → Busca env.js
```

### El contador de mensajes no funciona

**Solución:**
1. Verifica que la tabla `uso_ia` existe en Supabase
2. Comprueba las políticas RLS
3. Revisa la consola para errores de base de datos

### Las respuestas son muy lentas

**Posibles causas:**
1. Conexión a internet lenta
2. API de Groq sobrecargada (poco común)
3. Historial de conversación muy largo

**Solución:**
- Crea una nueva conversación
- Verifica tu conexión a internet

## 📊 Modelos de IA Disponibles

Actualmente usando **Llama 3.3 70B Versatile** de Groq:

- ⚡ **Velocidad**: ~500 tokens/segundo
- 🧠 **Capacidad**: 70 mil millones de parámetros
- 💬 **Contexto**: 32,768 tokens
- 🎯 **Especialidad**: Conversación general y tareas complejas

### Otros modelos disponibles en Groq:

- `llama-3.1-70b-versatile` - Alternativa estable
- `mixtral-8x7b-32768` - Más rápido, menos capaz
- `gemma-7b-it` - Ligero y eficiente

## 🔄 Actualizaciones

### Próximas Features

- [ ] Exportar conversaciones a PDF
- [ ] Modo voz (speech-to-text)
- [ ] Análisis de métricas empresariales
- [ ] Integración con calendario
- [ ] Plantillas de respuestas rápidas
- [ ] Compartir conversaciones con equipo

## 📝 Changelog

### v1.0.0 (2025-02-06)
- ✨ Lanzamiento inicial
- 🤖 Integración con Groq AI
- 💬 Sistema de chat completo
- 🎯 6 especializaciones empresariales
- 📊 Límites de uso diario
- 🔒 Autenticación con Supabase

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

### Proceso:

1. **Fork** el proyecto
2. **Crea una rama** para tu feature:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** tus cambios:
   ```bash
   git commit -m 'Add: Descripción de la feature'
   ```
4. **Push** a tu rama:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Abre un Pull Request**

### Guías de Estilo:

- 📝 Commits en español
- 🎨 Mantener el estilo de código existente
- ✅ Probar antes de hacer PR
- 📚 Documentar nuevas features

## 📧 Soporte y Contacto

- 🐛 **Reportar bugs**: [GitHub Issues](https://github.com/tu-usuario/arnexu/issues)
- 💬 **Preguntas**: Usa GitHub Discussions
- 📧 **Contacto directo**: A través de la plataforma

## 📜 Licencia

© 2025 Arnexu. Todos los derechos reservados.

Este proyecto es privado y propietario. No se permite la redistribución sin autorización.

---

## 🙏 Agradecimientos

- [Groq](https://groq.com/) - Por la infraestructura de IA ultra-rápida
- [Supabase](https://supabase.com/) - Por el backend como servicio
- [Meta](https://ai.meta.com/) - Por el modelo Llama 3.3

---

<div align="center">

⚡ **Powered by Groq AI** - Ultra-fast inference

🚀 **Hecho con ❤️ para emprendedores**

</div>