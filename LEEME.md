# Arnexu · cómo ponerlo en marcha (GitHub Pages + Supabase)

## 1) Sube la web a GitHub
Sube **todo el contenido de esta carpeta** a tu repositorio `Arnexu` (reemplaza lo que ya hay) y espera ~1 minuto a que GitHub Pages publique.
Importante: sube también la carpeta **js/**, **css/** e **icons/**. Si falta algún archivo, la web te muestra un aviso rojo diciendo cuál.
Después de subir, recarga con **Ctrl + F5** para limpiar la versión vieja.

## 2) Instala la base de datos (un solo paso)
En Supabase → **SQL Editor → New query** → pega TODO el archivo `INSTALAR_EN_SUPABASE.sql` → **Run**.
- No tienes que cambiar nada dentro del archivo.
- Se puede repetir sin problema.
- Tu cuenta (la más antigua) queda como **administradora automáticamente**.

## 3) (Solo si usas "Olvidé mi contraseña") Permite el enlace
Supabase → **Authentication → URL Configuration** → en **Redirect URLs** agrega:
`https://aristi00.github.io/Arnexu/**`

Listo. Entra a tu web y pruébala.

---

## Qué incluye
- Diseño nuevo: fondo animado, tarjetas, barra inferior tipo app en el celular.
- Búsqueda y filtros (texto, categoría, etapa, ciudad, monto en USD), "Para ti" según tu tesis de inversión.
- Señal de interés 💰 (reemplaza al like), bitácora por proyecto (privada o pública), moderación y panel de administración.
- App instalable (PWA): en el celular usa el botón 📲 del menú.
- Arnexu Lab: **pausado** (solo se ve la interfaz, sin IA). El código del servidor quedó guardado en `supabase/pausado/`.

## Opcional: notificaciones push
Necesitan una función en Supabase, así que no funcionan solo con GitHub. Si las quieres: `node supabase/desplegar.mjs --push`
(el botón 🔔 aparece solo cuando están activadas).

## Notas
- Los datos de personas están sujetos a la Ley 1581 (habeas data): valida tus textos legales con un abogado.
- El instalador `supabase/desplegar.mjs` es opcional: hace el paso 2 y 3 desde tu computador.
