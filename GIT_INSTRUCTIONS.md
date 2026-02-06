# 📖 Instrucciones para Subir a GitHub

Esta guía te llevará paso a paso para subir el proyecto Arnexu a GitHub de forma segura, **sin exponer tu API key**.

## ✅ Pre-requisitos

Antes de comenzar, asegúrate de tener:

- [x] Git instalado en tu computadora
- [x] Cuenta en GitHub
- [x] Los archivos del proyecto completos
- [x] Tu API key configurada en `js/env.js` (localmente)

## 📋 Paso 1: Verificar Estructura de Archivos

Asegúrate de tener esta estructura:

```
arnexu/
├── ia-mentor.html
├── inicio.html
├── .gitignore          ← Debe existir
├── README.md           ← Debe existir
├── js/
│   ├── env.example.js  ← Debe existir (SUBIR)
│   ├── env.js          ← Debe existir (NO SUBIR)
│   ├── config.js
│   ├── app.js
│   └── badge-notifications.js
└── css/
    └── styles.css
```

## 📋 Paso 2: Verificar .gitignore

Abre el archivo `.gitignore` y asegúrate de que contiene:

```
js/env.js
.env
*.key
```

## 📋 Paso 3: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com/)
2. Haz clic en el botón **"+"** (arriba a la derecha)
3. Selecciona **"New repository"**
4. Configura:
   - **Repository name:** `arnexu`
   - **Description:** "Plataforma de IA para Emprendedores"
   - **Visibility:** Private (recomendado) o Public
   - **NO** marques "Initialize with README" (ya tienes uno)
5. Haz clic en **"Create repository"**

## 📋 Paso 4: Inicializar Git Localmente

Abre tu terminal en la carpeta del proyecto:

```bash
# Navega a la carpeta del proyecto
cd /ruta/a/arnexu

# Inicializa Git (si no está iniciado)
git init

# Verifica el estado
git status
```

## 📋 Paso 5: Verificar que env.js NO se subirá

**CRÍTICO:** Ejecuta este comando para verificar:

```bash
git status
```

**Debes ver:**
- ✅ `js/env.example.js` - Sin ignorar (aparecerá)
- ❌ `js/env.js` - IGNORADO (NO debe aparecer)

**Si `js/env.js` aparece en rojo/verde:**

```bash
# Esto significa que está siendo rastreado, elimínalo del tracking:
git rm --cached js/env.js

# Verifica de nuevo
git status
```

Ahora `js/env.js` NO debe aparecer.

## 📋 Paso 6: Agregar Archivos

```bash
# Agregar todos los archivos (excepto los ignorados)
git add .

# Verificar qué se va a subir
git status
```

**Verifica que aparezcan:**
- ✅ `.gitignore`
- ✅ `README.md`
- ✅ `GIT_INSTRUCTIONS.md`
- ✅ `ia-mentor.html`
- ✅ `js/env.example.js`
- ✅ Todos los demás archivos

**Verifica que NO aparezca:**
- ❌ `js/env.js`

## 📋 Paso 7: Hacer Commit

```bash
git commit -m "feat: Implementar IA Mentor con Groq API

- Integración completa con Groq AI (llama-3.3-70b-versatile)
- Sistema de especializaciones empresariales
- Gestión de conversaciones persistentes
- Límite de 50 mensajes diarios
- Autenticación con Supabase
- Variables de entorno para seguridad"
```

## 📋 Paso 8: Conectar con GitHub

Copia los comandos que GitHub te mostró después de crear el repo:

```bash
# Agrega el repositorio remoto (reemplaza con tu URL)
git remote add origin https://github.com/TU-USUARIO/arnexu.git

# O si usas SSH:
git remote add origin git@github.com:TU-USUARIO/arnexu.git

# Verifica que se agregó correctamente
git remote -v
```

## 📋 Paso 9: Renombrar Rama a 'main' (si es necesario)

```bash
# Verifica tu rama actual
git branch

# Si dice 'master', renombra a 'main'
git branch -M main
```

## 📋 Paso 10: Subir a GitHub

```bash
# Push inicial
git push -u origin main
```

## 📋 Paso 11: Verificar en GitHub

1. Ve a tu repositorio en GitHub
2. Verifica que **existan** estos archivos:
   - ✅ `js/env.example.js`
   - ✅ `.gitignore`
   - ✅ `README.md`
   - ✅ `ia-mentor.html`

3. Verifica que **NO exista**:
   - ❌ `js/env.js` (tu API key privada)

## ✅ ¡Listo! Proyecto Subido

Tu proyecto ahora está en GitHub de forma **segura**.

---

## 🔄 Actualizaciones Futuras

Cuando hagas cambios en el proyecto:

```bash
# Ver cambios
git status

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat: Descripción del cambio"

# Subir a GitHub
git push
```

---

## 🐛 Solución de Problemas

### Error: "GitHub bloqueó el push por secret"

**Causa:** Intentaste subir `js/env.js` con tu API key.

**Solución:**
```bash
# Elimina del staging
git rm --cached js/env.js

# Verifica .gitignore
cat .gitignore | grep env.js

# Si no está, agrégalo
echo "js/env.js" >> .gitignore

# Vuelve a intentar
git add .
git commit -m "fix: Remover API key del repositorio"
git push
```

### Error: "remote origin already exists"

**Solución:**
```bash
# Elimina el remoto existente
git remote remove origin

# Agrega de nuevo
git remote add origin https://github.com/TU-USUARIO/arnexu.git
```

### Error: "Permission denied (publickey)"

**Solución:** Estás usando SSH pero no tienes configurada tu clave.

**Opción 1 - Usar HTTPS:**
```bash
git remote set-url origin https://github.com/TU-USUARIO/arnexu.git
```

**Opción 2 - Configurar SSH:**
```bash
# Generar clave SSH
ssh-keygen -t ed25519 -C "tu@email.com"

# Copiar clave pública
cat ~/.ssh/id_ed25519.pub

# Agregar en GitHub: Settings → SSH and GPG keys → New SSH key
```

---

## 📚 Recursos Adicionales

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Protecting Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

## ⚠️ Recordatorio de Seguridad

**NUNCA:**
- ❌ Hacer commit de `js/env.js`
- ❌ Subir archivos con API keys
- ❌ Compartir tu API key públicamente
- ❌ Hacer el repositorio público con credenciales

**SIEMPRE:**
- ✅ Usar `.gitignore` correctamente
- ✅ Verificar antes de hacer push
- ✅ Usar variables de entorno
- ✅ Rotar API keys si se exponen

---

¿Necesitas ayuda? Consulta el `README.md` o crea un Issue en GitHub.