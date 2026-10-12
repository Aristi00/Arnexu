# Arnexu · puesta en marcha (GitHub Pages + Supabase)

## 1) Sube la web a GitHub
Al descomprimir el ZIP queda **una sola carpeta** llamada `Arnexu`. Abre esa carpeta, selecciona **todos los archivos que hay dentro** y súbelos a tu repositorio (la carpeta en sí no hace falta), reemplazando los anteriores.
En GitHub: *Add file → Upload files*, arrastra los archivos. Espera ~1 minuto y recarga la web con **Ctrl + F5**.

Tus logos originales no se tocaron: `arnexu-64x (1).png` es exactamente el que me diste. Los íconos de la app (`arnexu-icon-*.png`, `arnexu-apple-touch.png`, `arnexu-favicon.png`) son ese mismo logo, solo cambiado de tamaño.

Los archivos clave son `arnexu.js`, `arnexu.css` y `arnexu-ciudades.txt`. Si falta alguno, la web lo dice con un aviso rojo.

## 2) Instala la base de datos (un solo paso)
Supabase → **SQL Editor → New query** → pega TODO el archivo `INSTALAR_EN_SUPABASE.sql` → **Run**.
Se puede repetir sin problema. Tu cuenta (la más antigua) queda como administradora automáticamente.

## 3) (Solo para "Olvidé mi contraseña")
Supabase → **Authentication → URL Configuration → Redirect URLs** → agrega `https://aristi00.github.io/Arnexu/**`

## 4) Comprueba que todo funciona
Abre `https://aristi00.github.io/Arnexu/diagnostico.html` (inicia sesión antes). Te dice en verde/rojo si los archivos, la base de datos, tu perfil, tus chats y tu foto están bien, y qué hacer si algo falla. Con "Copiar informe" me lo puedes mandar.

---

## Qué incluye
- Diseño nuevo, con barra inferior tipo app en el celular.
- Búsqueda y menú de filtros desplegable (categoría, etapa, ciudad). La ciudad se elige de una lista con ~107.000 ciudades del mundo mientras escribes.
- "Para ti" según tu tesis de inversión, señal de interés 💰, bitácora por proyecto, moderación y panel de administración.
- App instalable (botón 📲 del menú). Arnexu Lab: pausado, solo interfaz.

## Opcional: notificaciones push
Necesitan una función en Supabase (no corren solo con GitHub): `node supabase/desplegar.mjs --push`.

## Notas
- Los datos de personas están sujetos a la Ley 1581 (habeas data): valida tus textos legales con un abogado.
- `supabase/desplegar.mjs` es opcional: repite los pasos 2 y 3 desde tu computador.
