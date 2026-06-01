# Configuración Google Auth — Arnexu

## Lo que se cambió en el código

| Archivo | Qué se hizo |
|---|---|
| `index.html` | Botón "Iniciar sesión con Google" + función OAuth |
| `registro.html` | Botón "Regístrate con Google" + función OAuth |
| `completar-perfil.html` | **Página nueva** — formulario para username, teléfono y rol |
| `inicio.html` | Verifica si el perfil está completo al entrar |

---

## Configuración en Supabase (obligatorio)

### 1. Redirect URLs
Ve a: **Supabase → Authentication → URL Configuration**

Agrega estas dos URLs en **Redirect URLs**:
```
https://TU-USUARIO.github.io/TU-REPO/completar-perfil.html
http://localhost:5500/completar-perfil.html
```

> Reemplaza `TU-USUARIO` y `TU-REPO` con tu usuario y nombre del repositorio de GitHub Pages.

### 2. Site URL
En el mismo panel, en **Site URL** pon:
```
https://TU-USUARIO.github.io/TU-REPO
```

---

## Configuración en Google Cloud Console (obligatorio)

### Authorized redirect URIs
Ve a: **Google Cloud Console → APIs & Services → Credentials → tu OAuth Client**

Agrega en **Authorized redirect URIs**:
```
https://ifdajpaxbvpnbgeuohej.supabase.co/auth/v1/callback
```
(Este ya debería estar si conectaste Google en Supabase — solo verifica que esté)

### Authorized JavaScript origins
Agrega:
```
https://TU-USUARIO.github.io
```

---

## Flujo completo del usuario

```
Usuario hace clic en "Iniciar/Registrar con Google"
        ↓
Google autentica → redirige a completar-perfil.html
        ↓
Usuario llena: username, teléfono, rol
(la foto y nombre vienen automáticos desde Google)
        ↓
Se guarda en tabla "usuarios" de Supabase
        ↓
Redirige a inicio.html ✅
```

Si el usuario ya completó su perfil antes,
`completar-perfil.html` lo redirige directo a `inicio.html`.

---

## Tabla usuarios — columnas que se llenan con Google

| Columna | Fuente |
|---|---|
| `id` | ID de Supabase Auth (automático) |
| `email` | Desde Google (automático) |
| `nombre_completo` | Desde Google metadata |
| `foto_perfil` | Foto de Google (o la que el usuario cambie) |
| `nombre_usuario` | El usuario lo escribe en completar-perfil |
| `telefono` | El usuario lo escribe en completar-perfil |
| `rol` | El usuario lo elige en completar-perfil |
| `biografia` | Vacío por defecto (puede editar en perfil.html) |
| `created_at` | Automático por Supabase |

