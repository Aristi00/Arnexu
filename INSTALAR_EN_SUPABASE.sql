-- =====================================================================
-- ARNEXU · INSTALACIÓN COMPLETA (un solo archivo)
--
-- CÓMO USARLO:  Supabase → SQL Editor → New query → pega TODO este archivo → Run.
-- Es seguro ejecutarlo más de una vez. No tienes que cambiar nada dentro.
-- La cuenta más antigua (la tuya) queda como administradora automáticamente.
-- =====================================================================


-- #####################################################################
-- PARTE 1 de 4 · Seguridad (RLS), funciones y primer administrador
-- #####################################################################

-- =====================================================================
-- ARNEXU · PASO 1 de 3 · Seguridad a nivel de filas (RLS)
-- Pégalo completo en Supabase > SQL Editor > New query > Run
-- Es seguro ejecutarlo más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLUMNAS NUEVAS (moderación)
-- ---------------------------------------------------------------------
alter table public.usuarios      add column if not exists es_admin   boolean not null default false;
alter table public.usuarios      add column if not exists suspendido boolean not null default false;
alter table public.publicaciones add column if not exists oculta     boolean not null default false;
alter table public.publicaciones alter column likes_count set default 0;

-- ---------------------------------------------------------------------
-- 2. TABLAS DE MODERACIÓN
-- ---------------------------------------------------------------------
create table if not exists public.bloqueos (
  bloqueador_id uuid not null references public.usuarios(id) on delete cascade,
  bloqueado_id  uuid not null references public.usuarios(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  check (bloqueador_id <> bloqueado_id)
);

create table if not exists public.reportes (
  id                    uuid primary key default gen_random_uuid(),
  reportante_id         uuid not null references public.usuarios(id) on delete cascade,
  tipo_contenido        text not null check (tipo_contenido in ('publicacion','comentario','usuario','mensaje','bitacora')),
  contenido_id          uuid not null,
  reportado_usuario_id  uuid references public.usuarios(id) on delete set null,
  motivo                text not null check (motivo in ('spam','estafa','ofensivo','falso','suplantacion','otro')),
  detalle               text check (char_length(detalle) <= 500),
  copia_contenido       text,
  estado                text not null default 'pendiente' check (estado in ('pendiente','accion_tomada','descartado')),
  revisado_por          uuid references public.usuarios(id) on delete set null,
  revisado_en           timestamptz,
  created_at            timestamptz not null default now(),
  unique (reportante_id, tipo_contenido, contenido_id)   -- un reporte por persona y contenido
);

-- ---------------------------------------------------------------------
-- 3. FUNCIONES AUXILIARES (las usan las políticas)
--    SECURITY DEFINER = se ejecutan con permisos del dueño, así pueden
--    mirar tablas sin que la política se llame a sí misma en bucle.
-- ---------------------------------------------------------------------
create or replace function public.soy_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select u.es_admin from public.usuarios u where u.id = auth.uid()), false);
$$;

create or replace function public.esta_suspendido()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select u.suspendido from public.usuarios u where u.id = auth.uid()), false);
$$;

create or replace function public.es_participante(p_chat uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chats c
    where c.id = p_chat and p_user in (c.participante1_id, c.participante2_id)
  );
$$;

-- ¿Yo bloqueé a esta persona?
create or replace function public.yo_bloquee(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bloqueos b
    where b.bloqueador_id = auth.uid() and b.bloqueado_id = p_user
  );
$$;

-- ¿Esa persona me bloqueó a mí?
create or replace function public.me_bloqueo(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bloqueos b
    where b.bloqueador_id = p_user and b.bloqueado_id = auth.uid()
  );
$$;

-- ¿Puedo escribir en este chat? (falso si la otra persona me bloqueó)
create or replace function public.puede_escribir(p_chat uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1
    from public.chats c
    join public.bloqueos b
      on b.bloqueador_id in (c.participante1_id, c.participante2_id)
     and b.bloqueado_id = auth.uid()
    where c.id = p_chat and b.bloqueador_id <> auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- 4. BORRAR POLÍTICAS VIEJAS
--    Las políticas se SUMAN entre sí (basta que una diga "sí" para dejar
--    pasar). Si en el panel creaste alguna tipo "permitir todo", anularía
--    las nuevas. Por eso se limpian primero.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('usuarios','publicaciones','likes','comentarios','chats','mensajes',
                        'mensajes_no_leidos','mensajes_ocultos','contactos_proyectos','badges',
                        'bloqueos','reportes')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. USUARIOS
--    Todos los logueados ven nombre, usuario, foto, rol y bio.
--    Email y teléfono quedan PRIVADOS (permiso por columna).
-- ---------------------------------------------------------------------
alter table public.usuarios enable row level security;

create policy usuarios_select on public.usuarios for select to authenticated using (true);
create policy usuarios_insert on public.usuarios for insert to authenticated with check (id = auth.uid());
create policy usuarios_update on public.usuarios for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.usuarios from anon, authenticated;
grant select (id, nombre_completo, nombre_usuario, foto_perfil, rol, biografia) on public.usuarios to authenticated;
grant insert (id, email, telefono, nombre_completo, nombre_usuario, foto_perfil, rol, biografia) on public.usuarios to authenticated;
grant update (biografia, foto_perfil) on public.usuarios to authenticated;   -- NO se puede cambiar rol, es_admin ni suspendido

-- ---------------------------------------------------------------------
-- 6. PUBLICACIONES
-- ---------------------------------------------------------------------
alter table public.publicaciones enable row level security;

create policy pub_select on public.publicaciones for select to authenticated using (
  usuario_id = auth.uid()
  or public.soy_admin()
  or (oculta = false and not public.yo_bloquee(usuario_id))
);
create policy pub_insert on public.publicaciones for insert to authenticated
  with check (usuario_id = auth.uid() and not public.esta_suspendido());
create policy pub_update on public.publicaciones for update to authenticated
  using (usuario_id = auth.uid() and not public.esta_suspendido())
  with check (usuario_id = auth.uid());
create policy pub_delete on public.publicaciones for delete to authenticated
  using (usuario_id = auth.uid() or public.soy_admin());

revoke all on public.publicaciones from anon, authenticated;
grant select on public.publicaciones to authenticated;
grant insert (usuario_id, titulo, tipo, descripcion, categoria, archivos) on public.publicaciones to authenticated;
grant update (titulo, tipo, descripcion, categoria, archivos, updated_at) on public.publicaciones to authenticated;  -- likes_count y oculta NO
grant delete on public.publicaciones to authenticated;

-- ---------------------------------------------------------------------
-- 7. LIKES  (el contador lo mantiene la base de datos, no el navegador)
-- ---------------------------------------------------------------------
-- Quita likes duplicados (si los hubiera) y evita que se repitan
delete from public.likes a using public.likes b
 where a.ctid < b.ctid and a.publicacion_id = b.publicacion_id and a.usuario_id = b.usuario_id;
create unique index if not exists likes_unico on public.likes (publicacion_id, usuario_id);

alter table public.likes enable row level security;
create policy likes_select on public.likes for select to authenticated using (true);
create policy likes_insert on public.likes for insert to authenticated with check (usuario_id = auth.uid());
create policy likes_delete on public.likes for delete to authenticated using (usuario_id = auth.uid());

revoke all on public.likes from anon, authenticated;
grant select, delete on public.likes to authenticated;
grant insert (publicacion_id, usuario_id) on public.likes to authenticated;

create or replace function public.actualizar_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.publicaciones set likes_count = coalesce(likes_count,0) + 1 where id = new.publicacion_id;
  elsif tg_op = 'DELETE' then
    update public.publicaciones set likes_count = greatest(coalesce(likes_count,0) - 1, 0) where id = old.publicacion_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_likes_count on public.likes;
create trigger trg_likes_count after insert or delete on public.likes
  for each row execute function public.actualizar_likes_count();

-- Recalcula los contadores actuales por si se desfasaron
update public.publicaciones p
   set likes_count = (select count(*) from public.likes l where l.publicacion_id = p.id);

-- ---------------------------------------------------------------------
-- 8. COMENTARIOS
-- ---------------------------------------------------------------------
alter table public.comentarios enable row level security;
create policy com_select on public.comentarios for select to authenticated
  using (usuario_id = auth.uid() or not public.yo_bloquee(usuario_id));
create policy com_insert on public.comentarios for insert to authenticated
  with check (usuario_id = auth.uid() and not public.esta_suspendido());
create policy com_delete on public.comentarios for delete to authenticated
  using (usuario_id = auth.uid() or public.soy_admin());

revoke all on public.comentarios from anon, authenticated;
grant select, delete on public.comentarios to authenticated;
grant insert (publicacion_id, usuario_id, contenido) on public.comentarios to authenticated;

-- ---------------------------------------------------------------------
-- 9. CHATS
-- ---------------------------------------------------------------------
alter table public.chats enable row level security;
create policy chats_select on public.chats for select to authenticated
  using (auth.uid() in (participante1_id, participante2_id));
create policy chats_insert on public.chats for insert to authenticated
  with check (participante1_id = auth.uid() and not public.esta_suspendido() and not public.me_bloqueo(participante2_id));
create policy chats_update on public.chats for update to authenticated
  using (auth.uid() in (participante1_id, participante2_id))
  with check (auth.uid() in (participante1_id, participante2_id));

revoke all on public.chats from anon, authenticated;
grant select on public.chats to authenticated;
grant insert (participante1_id, participante2_id) on public.chats to authenticated;
grant update (ultimo_mensaje, ultimo_mensaje_fecha) on public.chats to authenticated;

-- ---------------------------------------------------------------------
-- 10. MENSAJES
--     Solo los dos participantes leen. Nadie puede falsificar mensajes
--     de la IA (tipo 'ia') desde el navegador.
-- ---------------------------------------------------------------------
alter table public.mensajes enable row level security;
create policy msg_select on public.mensajes for select to authenticated
  using (public.es_participante(chat_id));
create policy msg_insert on public.mensajes for insert to authenticated
  with check (
    remitente_id = auth.uid()
    and tipo in ('texto','imagen','video','audio','archivo')
    and public.es_participante(chat_id)
    and public.puede_escribir(chat_id)
    and not public.esta_suspendido()
  );
create policy msg_delete on public.mensajes for delete to authenticated
  using (remitente_id = auth.uid());

revoke all on public.mensajes from anon, authenticated;
grant select, delete on public.mensajes to authenticated;
grant insert (chat_id, remitente_id, contenido, tipo, archivo_url, archivo_nombre, archivo_tipo) on public.mensajes to authenticated;

-- ---------------------------------------------------------------------
-- 11. MENSAJES NO LEÍDOS
--     Antes el navegador del que escribe modificaba el contador del
--     otro. Ahora lo hace un trigger; cada persona solo ve y borra lo suyo.
-- ---------------------------------------------------------------------
alter table public.mensajes_no_leidos enable row level security;
create policy nl_select on public.mensajes_no_leidos for select to authenticated using (usuario_id = auth.uid());
create policy nl_delete on public.mensajes_no_leidos for delete to authenticated using (usuario_id = auth.uid());

revoke all on public.mensajes_no_leidos from anon, authenticated;
grant select, delete on public.mensajes_no_leidos to authenticated;

create or replace function public.registrar_mensaje_no_leido()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dest uuid;
begin
  select case when c.participante1_id = new.remitente_id then c.participante2_id else c.participante1_id end
    into v_dest from public.chats c where c.id = new.chat_id;

  if v_dest is null or v_dest = new.remitente_id then
    return null;   -- chat contigo mismo (notas personales): no cuenta como no leído
  end if;

  update public.mensajes_no_leidos
     set cantidad = coalesce(cantidad,0) + 1, ultimo_mensaje_id = new.id, updated_at = now()
   where chat_id = new.chat_id and usuario_id = v_dest;
  if not found then
    insert into public.mensajes_no_leidos (chat_id, usuario_id, cantidad, ultimo_mensaje_id, updated_at)
    values (new.chat_id, v_dest, 1, new.id, now());
  end if;
  return null;
end $$;

drop trigger if exists trg_mensaje_no_leido on public.mensajes;
create trigger trg_mensaje_no_leido after insert on public.mensajes
  for each row execute function public.registrar_mensaje_no_leido();

-- ---------------------------------------------------------------------
-- 12. MENSAJES OCULTOS (ocultar "solo para mí")
-- ---------------------------------------------------------------------
alter table public.mensajes_ocultos enable row level security;
create policy mo_select on public.mensajes_ocultos for select to authenticated using (usuario_id = auth.uid());
create policy mo_insert on public.mensajes_ocultos for insert to authenticated with check (usuario_id = auth.uid());
create policy mo_delete on public.mensajes_ocultos for delete to authenticated using (usuario_id = auth.uid());

revoke all on public.mensajes_ocultos from anon, authenticated;
grant select, delete on public.mensajes_ocultos to authenticated;
grant insert (usuario_id, mensaje_id) on public.mensajes_ocultos to authenticated;

-- ---------------------------------------------------------------------
-- 13. CONTACTOS A PROYECTOS (alimentan las insignias)
--     Un contacto por persona y proyecto: así nadie infla su insignia
--     escribiendo 5 mensajes seguidos.
-- ---------------------------------------------------------------------
delete from public.contactos_proyectos a using public.contactos_proyectos b
 where a.ctid < b.ctid and a.publicacion_id = b.publicacion_id and a.contacto_por = b.contacto_por;
create unique index if not exists contactos_unico on public.contactos_proyectos (publicacion_id, contacto_por);

alter table public.contactos_proyectos enable row level security;
create policy cp_select on public.contactos_proyectos for select to authenticated
  using (
    contacto_por = auth.uid()
    or exists (select 1 from public.publicaciones p where p.id = publicacion_id and p.usuario_id = auth.uid())
  );
create policy cp_insert on public.contactos_proyectos for insert to authenticated
  with check (contacto_por = auth.uid());

revoke all on public.contactos_proyectos from anon, authenticated;
grant select on public.contactos_proyectos to authenticated;
grant insert (publicacion_id, contacto_por) on public.contactos_proyectos to authenticated;

-- ---------------------------------------------------------------------
-- 14. BADGES (insignias): todos las ven, NADIE las escribe desde el navegador
-- ---------------------------------------------------------------------
alter table public.badges enable row level security;
create policy badges_select on public.badges for select to authenticated using (true);

revoke all on public.badges from anon, authenticated;
grant select on public.badges to authenticated;

-- ⚠️ IMPORTANTE: las funciones verificar_emprendedor_serial y
-- verificar_inversor_interesado escriben en badges. Si fueron creadas sin
-- SECURITY DEFINER, dejarán de poder otorgar insignias. Revísalo con:
--
--   select proname, prosecdef from pg_proc
--   where proname in ('verificar_emprendedor_serial','verificar_inversor_interesado');
--
-- Si prosecdef sale en "false", ejecuta (ajusta el tipo del argumento si no es uuid):
--
--   alter function public.verificar_emprendedor_serial(uuid) security definer set search_path = public;
--   alter function public.verificar_inversor_interesado(uuid) security definer set search_path = public;

-- ---------------------------------------------------------------------
-- 15. BLOQUEOS Y REPORTES
-- ---------------------------------------------------------------------
alter table public.bloqueos enable row level security;
create policy bloq_select on public.bloqueos for select to authenticated using (bloqueador_id = auth.uid());
create policy bloq_insert on public.bloqueos for insert to authenticated with check (bloqueador_id = auth.uid());
create policy bloq_delete on public.bloqueos for delete to authenticated using (bloqueador_id = auth.uid());

revoke all on public.bloqueos from anon, authenticated;
grant select, delete on public.bloqueos to authenticated;
grant insert (bloqueador_id, bloqueado_id) on public.bloqueos to authenticated;

-- Los reportes NO se escriben directo: se crean con la función reportar_contenido (paso 3)
alter table public.reportes enable row level security;
create policy rep_select on public.reportes for select to authenticated
  using (reportante_id = auth.uid() or public.soy_admin());

revoke all on public.reportes from anon, authenticated;
grant select on public.reportes to authenticated;

-- ---------------------------------------------------------------------
-- 16. LÍMITES DE LONGITUD (NOT VALID = no revisa filas viejas, sí las nuevas)
-- ---------------------------------------------------------------------
alter table public.publicaciones drop constraint if exists pub_largo;
alter table public.publicaciones add constraint pub_largo
  check (char_length(titulo) between 1 and 100 and char_length(descripcion) between 1 and 5000) not valid;

alter table public.comentarios drop constraint if exists com_largo;
alter table public.comentarios add constraint com_largo
  check (char_length(trim(contenido)) between 1 and 1000) not valid;

alter table public.mensajes drop constraint if exists msg_largo;
alter table public.mensajes add constraint msg_largo
  check (contenido is null or char_length(contenido) <= 4000) not valid;

alter table public.usuarios drop constraint if exists usr_bio_largo;
alter table public.usuarios add constraint usr_bio_largo
  check (biografia is null or char_length(biografia) <= 200) not valid;

-- ---------------------------------------------------------------------
-- 17. PRIMER ADMINISTRADOR AUTOMÁTICO (no tienes que hacer nada)
--     • La primera cuenta que se registre en una base vacía queda como administradora.
--     • Si ya hay cuentas y ninguna es administradora, la cuenta MÁS ANTIGUA lo será.
--     Para cambiarlo después:  update public.usuarios set es_admin = true where email = 'otro@correo.com';
-- ---------------------------------------------------------------------
create or replace function public.primer_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.usuarios where es_admin) then
    new.es_admin := true;
  end if;
  return new;
end $$;

drop trigger if exists trg_primer_admin on public.usuarios;
create trigger trg_primer_admin before insert on public.usuarios
  for each row execute function public.primer_admin();

update public.usuarios
   set es_admin = true
 where id = (select u.id from public.usuarios u join auth.users a on a.id = u.id order by a.created_at asc limit 1)
   and not exists (select 1 from public.usuarios where es_admin);


-- #####################################################################
-- PARTE 2 de 4 · Archivos subidos
-- #####################################################################

-- =====================================================================
-- ARNEXU · PASO 2 de 3 · Archivos subidos (Storage)
-- Ejecuta DESPUÉS de 01_rls.sql. Es seguro ejecutarlo más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BUCKET PÚBLICO: fotos de perfil y adjuntos de publicaciones
--    Límite de 50 MB y solo tipos seguros (sin SVG ni HTML, que podrían
--    ejecutar código al abrirse).
-- ---------------------------------------------------------------------
update storage.buckets
   set public = true,
       file_size_limit = 52428800,
       allowed_mime_types = array[
         'image/jpeg','image/png','image/webp','image/gif',
         'video/mp4','video/webm','video/quicktime',
         'application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation'
       ]
 where id = 'arnexu-files';

-- ---------------------------------------------------------------------
-- 2. BUCKET PRIVADO NUEVO: archivos de chat
--    Los adjuntos de una conversación ya no son públicos: solo los dos
--    participantes pueden abrirlos (con enlaces temporales de 1 hora).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-files', 'chat-files', false, 52428800,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/webm','audio/ogg','audio/mp4','audio/mpeg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 3. LIMPIAR POLÍTICAS VIEJAS DE STORAGE
--    (si usas otros buckets además de estos dos, vuelve a crear sus políticas)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. POLÍTICAS DEL BUCKET PÚBLICO (arnexu-files)
--    Ruta obligatoria:  publicaciones/<tu-id>/archivo   o   avatars/<tu-id>/archivo
--    Solo puedes subir y borrar dentro de TU carpeta.
--    (Leer no necesita política: el bucket es público)
-- ---------------------------------------------------------------------
create policy arnexu_subir_propio on storage.objects for insert to authenticated
  with check (
    bucket_id = 'arnexu-files'
    and (storage.foldername(name))[1] in ('publicaciones','avatars')
    and (storage.foldername(name))[2] = auth.uid()::text
    and not public.esta_suspendido()
  );

create policy arnexu_borrar_propio on storage.objects for delete to authenticated
  using (bucket_id = 'arnexu-files' and (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 5. POLÍTICAS DEL BUCKET PRIVADO (chat-files)
--    Ruta obligatoria:  <id-del-chat>/<tu-id>/archivo
-- ---------------------------------------------------------------------
create or replace function public.puede_acceder_archivo_chat(p_ruta text)
returns boolean language plpgsql stable security definer set search_path = public, storage as $$
declare v_chat uuid;
begin
  begin
    v_chat := ((storage.foldername(p_ruta))[1])::uuid;
  exception when others then
    return false;
  end;
  return public.es_participante(v_chat);
end $$;

create policy chat_leer on storage.objects for select to authenticated
  using (bucket_id = 'chat-files' and public.puede_acceder_archivo_chat(name));

create policy chat_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-files'
    and public.puede_acceder_archivo_chat(name)
    and (storage.foldername(name))[2] = auth.uid()::text
    and not public.esta_suspendido()
  );

create policy chat_borrar_propio on storage.objects for delete to authenticated
  using (bucket_id = 'chat-files' and (storage.foldername(name))[2] = auth.uid()::text);


-- #####################################################################
-- PARTE 3 de 4 · Moderación (reportes y panel)
-- #####################################################################

-- =====================================================================
-- ARNEXU · PASO 3 de 3 · Moderación (reportes y panel de administración)
-- Ejecuta DESPUÉS de 01_rls.sql. Es seguro ejecutarlo más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. REPORTAR CONTENIDO
--    El servidor guarda una COPIA del contenido en el momento del reporte
--    (así no se puede falsificar ni borrar la evidencia) y valida todo.
-- ---------------------------------------------------------------------
create or replace function public.reportar_contenido(
  p_tipo text, p_id uuid, p_motivo text, p_detalle text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_autor uuid;
  v_copia text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;

  if (select count(*) from public.reportes
       where reportante_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Límite diario de reportes alcanzado';
  end if;

  if p_tipo = 'publicacion' then
    select usuario_id, left(titulo || E'\n' || descripcion, 1000)
      into v_autor, v_copia from public.publicaciones where id = p_id;
  elsif p_tipo = 'comentario' then
    select usuario_id, left(contenido, 1000)
      into v_autor, v_copia from public.comentarios where id = p_id;
  elsif p_tipo = 'usuario' then
    select id, left(nombre_completo || ' (@' || nombre_usuario || ') ' || coalesce(biografia, ''), 1000)
      into v_autor, v_copia from public.usuarios where id = p_id;
  elsif p_tipo = 'mensaje' then
    -- solo puedes reportar mensajes de chats en los que participas
    select m.remitente_id, left(coalesce(nullif(m.contenido, ''), m.archivo_nombre, '[archivo]'), 1000)
      into v_autor, v_copia from public.mensajes m
     where m.id = p_id and public.es_participante(m.chat_id, auth.uid());
  elsif p_tipo = 'bitacora' then
    -- solo entradas de bitácoras que puedes ver (públicas, o tuyas)
    select e.usuario_id, left(e.titulo || E'\n' || e.contenido, 1000)
      into v_autor, v_copia from public.bitacora_entradas e
     where e.id = p_id and public.bitacora_visible(e.bitacora_id);
  else
    raise exception 'Tipo de contenido no válido';
  end if;

  if v_autor is null then
    raise exception 'Contenido no encontrado';
  end if;
  if v_autor = auth.uid() then
    raise exception 'No puedes reportar tu propio contenido';
  end if;

  insert into public.reportes (reportante_id, tipo_contenido, contenido_id, reportado_usuario_id, motivo, detalle, copia_contenido)
  values (auth.uid(), p_tipo, p_id, v_autor, p_motivo, nullif(trim(p_detalle), ''), v_copia);
end $$;

-- ---------------------------------------------------------------------
-- 2. HERRAMIENTAS DEL ADMINISTRADOR (todas verifican es_admin)
-- ---------------------------------------------------------------------
create or replace function public.admin_listar_reportes(p_estado text default 'pendiente')
returns table (
  id uuid, tipo_contenido text, contenido_id uuid, motivo text, detalle text,
  copia_contenido text, estado text, created_at timestamptz, reportante_usuario text,
  reportado_usuario_id uuid, reportado_usuario text, reportado_suspendido boolean,
  reportes_mismo_contenido bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.soy_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select r.id, r.tipo_contenido, r.contenido_id, r.motivo, r.detalle,
           r.copia_contenido, r.estado, r.created_at, ur.nombre_usuario,
           r.reportado_usuario_id, ud.nombre_usuario, coalesce(ud.suspendido, false),
           (select count(*) from public.reportes x
             where x.tipo_contenido = r.tipo_contenido and x.contenido_id = r.contenido_id)
      from public.reportes r
      left join public.usuarios ur on ur.id = r.reportante_id
      left join public.usuarios ud on ud.id = r.reportado_usuario_id
     where r.estado = p_estado
     order by r.created_at desc
     limit 100;
end $$;

create or replace function public.admin_resolver_reporte(p_reporte uuid, p_accion text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.reportes%rowtype;
begin
  if not public.soy_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into r from public.reportes where id = p_reporte;
  if not found then
    raise exception 'Reporte no encontrado';
  end if;

  if p_accion = 'ocultar_publicacion' and r.tipo_contenido = 'publicacion' then
    update public.publicaciones set oculta = true where id = r.contenido_id;
  elsif p_accion = 'eliminar_comentario' and r.tipo_contenido = 'comentario' then
    delete from public.comentarios where id = r.contenido_id;
  elsif p_accion = 'eliminar_mensaje' and r.tipo_contenido = 'mensaje' then
    delete from public.mensajes where id = r.contenido_id;
  elsif p_accion = 'eliminar_entrada' and r.tipo_contenido = 'bitacora' then
    delete from public.bitacora_entradas where id = r.contenido_id;
  elsif p_accion = 'suspender_usuario' then
    if r.reportado_usuario_id is null then
      raise exception 'El usuario ya no existe';
    end if;
    if exists (select 1 from public.usuarios where id = r.reportado_usuario_id and es_admin) then
      raise exception 'No se puede suspender a un administrador';
    end if;
    update public.usuarios set suspendido = true where id = r.reportado_usuario_id;
  elsif p_accion = 'descartar' then
    null;
  else
    raise exception 'Acción no válida para este tipo de reporte';
  end if;

  -- Cierra todos los reportes pendientes sobre ese mismo contenido
  update public.reportes
     set estado = case when p_accion = 'descartar' then 'descartado' else 'accion_tomada' end,
         revisado_por = auth.uid(), revisado_en = now()
   where tipo_contenido = r.tipo_contenido and contenido_id = r.contenido_id and estado = 'pendiente';
end $$;

-- Para deshacer errores (se usa desde el SQL Editor o se puede conectar al panel luego)
create or replace function public.admin_reactivar_usuario(p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.soy_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.usuarios set suspendido = false where id = p_usuario;
end $$;

create or replace function public.admin_mostrar_publicacion(p_publicacion uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.soy_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.publicaciones set oculta = false where id = p_publicacion;
end $$;

-- ---------------------------------------------------------------------
-- 3. QUIÉN PUEDE EJECUTAR QUÉ (por defecto, cualquiera; aquí lo cerramos)
-- ---------------------------------------------------------------------
revoke execute on function public.reportar_contenido(text, uuid, text, text)   from public, anon;
revoke execute on function public.admin_listar_reportes(text)                  from public, anon;
revoke execute on function public.admin_resolver_reporte(uuid, text)           from public, anon;
revoke execute on function public.admin_reactivar_usuario(uuid)                from public, anon;
revoke execute on function public.admin_mostrar_publicacion(uuid)              from public, anon;

grant execute on function public.reportar_contenido(text, uuid, text, text)    to authenticated;
grant execute on function public.admin_listar_reportes(text)                   to authenticated;
grant execute on function public.admin_resolver_reporte(uuid, text)            to authenticated;
grant execute on function public.admin_reactivar_usuario(uuid)                 to authenticated;
grant execute on function public.admin_mostrar_publicacion(uuid)               to authenticated;


-- #####################################################################
-- PARTE 4 de 4 · Ficha, señales, bitácora, Para ti y notificaciones
-- #####################################################################

-- =====================================================================
-- ARNEXU · PASO 4 de 4 · Ficha de proyecto, Señal de interés, Bitácora,
--                        Arnexu Lab, Deal flow y Notificaciones push
-- Ejecuta DESPUÉS de 01, 02 y 03. Es seguro ejecutarlo más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. UTILIDADES
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. FICHA DE PROYECTO: etapa, ciudad y monto que busca (en dólares)
-- ---------------------------------------------------------------------
alter table public.publicaciones add column if not exists etapa           text;
alter table public.publicaciones add column if not exists ciudad          text;
alter table public.publicaciones add column if not exists monto_busca     numeric(14,0);
alter table public.publicaciones add column if not exists senales_count   integer not null default 0;
alter table public.publicaciones add column if not exists lab_puntaje     integer;
alter table public.publicaciones add column if not exists lab_actualizado timestamptz;

alter table public.publicaciones drop constraint if exists pub_etapa_valida;
alter table public.publicaciones add constraint pub_etapa_valida
  check (etapa is null or etapa in ('idea','prototipo','traccion','escalando')) not valid;

alter table public.publicaciones drop constraint if exists pub_ciudad_largo;
alter table public.publicaciones add constraint pub_ciudad_largo
  check (ciudad is null or char_length(ciudad) between 2 and 80) not valid;

alter table public.publicaciones drop constraint if exists pub_monto_rango;
alter table public.publicaciones add constraint pub_monto_rango
  check (monto_busca is null or (monto_busca >= 1 and monto_busca <= 10000000000)) not valid;

alter table public.publicaciones drop constraint if exists pub_lab_rango;
alter table public.publicaciones add constraint pub_lab_rango
  check (lab_puntaje is null or lab_puntaje between 0 and 100) not valid;

-- Los campos nuevos que SÍ puede escribir el dueño (senales_count y lab_* NO)
grant insert (etapa, ciudad, monto_busca) on public.publicaciones to authenticated;
grant update (etapa, ciudad, monto_busca) on public.publicaciones to authenticated;

-- Índices para que búsqueda y filtros sigan rápidos con muchos proyectos
create index if not exists pub_idx_fecha     on public.publicaciones (created_at desc);
create index if not exists pub_idx_filtros   on public.publicaciones (categoria, etapa);
create index if not exists pub_idx_ciudad    on public.publicaciones (lower(ciudad));
create index if not exists pub_idx_monto     on public.publicaciones (monto_busca);
create index if not exists pub_idx_usuario   on public.publicaciones (usuario_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. SEÑAL DE INTERÉS (reemplaza al like)
--    Cada persona indica cuánto invertiría (USD). El monto solo lo ven
--    quien lo puso y el dueño del proyecto. Públicamente solo se ve el conteo.
-- ---------------------------------------------------------------------
create table if not exists public.senales_interes (
  id             uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  usuario_id     uuid not null references public.usuarios(id) on delete cascade,
  monto          numeric(14,0) not null check (monto >= 1 and monto <= 10000000000),
  nota           text check (nota is null or char_length(nota) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (publicacion_id, usuario_id)
);
create index if not exists senales_idx_pub on public.senales_interes (publicacion_id);
create index if not exists senales_idx_usr on public.senales_interes (usuario_id);

drop trigger if exists trg_senales_updated on public.senales_interes;
create trigger trg_senales_updated before update on public.senales_interes
  for each row execute function public.set_updated_at();

create or replace function public.actualizar_senales_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.publicaciones set senales_count = senales_count + 1 where id = new.publicacion_id;
  elsif tg_op = 'DELETE' then
    update public.publicaciones set senales_count = greatest(senales_count - 1, 0) where id = old.publicacion_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_senales_count on public.senales_interes;
create trigger trg_senales_count after insert or delete on public.senales_interes
  for each row execute function public.actualizar_senales_count();

alter table public.senales_interes enable row level security;
drop policy if exists senales_select on public.senales_interes;
drop policy if exists senales_insert on public.senales_interes;
drop policy if exists senales_update on public.senales_interes;
drop policy if exists senales_delete on public.senales_interes;

create policy senales_select on public.senales_interes for select to authenticated
  using (
    usuario_id = auth.uid()
    or exists (select 1 from public.publicaciones p where p.id = publicacion_id and p.usuario_id = auth.uid())
  );
create policy senales_insert on public.senales_interes for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and not public.esta_suspendido()
    and exists (select 1 from public.publicaciones p
                 where p.id = publicacion_id and p.usuario_id <> auth.uid() and p.oculta = false)
  );
create policy senales_update on public.senales_interes for update to authenticated
  using (usuario_id = auth.uid() and not public.esta_suspendido())
  with check (usuario_id = auth.uid());
create policy senales_delete on public.senales_interes for delete to authenticated
  using (usuario_id = auth.uid());

revoke all on public.senales_interes from anon, authenticated;
grant select, delete on public.senales_interes to authenticated;
grant insert (publicacion_id, usuario_id, monto, nota) on public.senales_interes to authenticated;
grant update (monto, nota) on public.senales_interes to authenticated;

-- ---------------------------------------------------------------------
-- 3. BITÁCORA DEL PROYECTO
--    Al crear una publicación se crea sola una bitácora PRIVADA.
--    El dueño escribe notas/artículos y puede hacerla pública.
-- ---------------------------------------------------------------------
create table if not exists public.bitacoras (
  id             uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null unique references public.publicaciones(id) on delete cascade,
  usuario_id     uuid not null references public.usuarios(id) on delete cascade,
  publica        boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists bitacoras_idx_usr on public.bitacoras (usuario_id);

create table if not exists public.bitacora_entradas (
  id          uuid primary key default gen_random_uuid(),
  bitacora_id uuid not null references public.bitacoras(id) on delete cascade,
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  titulo      text not null check (char_length(trim(titulo)) between 1 and 120),
  contenido   text not null check (char_length(trim(contenido)) between 1 and 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists entradas_idx_bit on public.bitacora_entradas (bitacora_id, created_at desc);

drop trigger if exists trg_entradas_updated on public.bitacora_entradas;
create trigger trg_entradas_updated before update on public.bitacora_entradas
  for each row execute function public.set_updated_at();

-- Cada publicación nueva crea su bitácora (privada)
create or replace function public.crear_bitacora_de_publicacion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bitacoras (publicacion_id, usuario_id)
  values (new.id, new.usuario_id)
  on conflict (publicacion_id) do nothing;
  return null;
end $$;

drop trigger if exists trg_crear_bitacora on public.publicaciones;
create trigger trg_crear_bitacora after insert on public.publicaciones
  for each row execute function public.crear_bitacora_de_publicacion();

-- Bitácoras para los proyectos que ya existen
insert into public.bitacoras (publicacion_id, usuario_id)
select p.id, p.usuario_id from public.publicaciones p
on conflict (publicacion_id) do nothing;

-- ¿Puedo ver esta bitácora? (dueño, o pública y sin bloqueo, y proyecto no oculto)
create or replace function public.bitacora_visible(p_bitacora uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.bitacoras b
      join public.publicaciones p on p.id = b.publicacion_id
     where b.id = p_bitacora
       and (
         b.usuario_id = auth.uid()
         or (b.publica and not p.oculta and not public.yo_bloquee(b.usuario_id))
       )
  );
$$;

alter table public.bitacoras enable row level security;
drop policy if exists bit_select on public.bitacoras;
drop policy if exists bit_update on public.bitacoras;
create policy bit_select on public.bitacoras for select to authenticated
  using (public.bitacora_visible(id));
create policy bit_update on public.bitacoras for update to authenticated
  using (usuario_id = auth.uid() and not public.esta_suspendido())
  with check (usuario_id = auth.uid());

revoke all on public.bitacoras from anon, authenticated;
grant select on public.bitacoras to authenticated;
grant update (publica) on public.bitacoras to authenticated;

alter table public.bitacora_entradas enable row level security;
drop policy if exists ent_select on public.bitacora_entradas;
drop policy if exists ent_insert on public.bitacora_entradas;
drop policy if exists ent_update on public.bitacora_entradas;
drop policy if exists ent_delete on public.bitacora_entradas;
create policy ent_select on public.bitacora_entradas for select to authenticated
  using (public.bitacora_visible(bitacora_id));
create policy ent_insert on public.bitacora_entradas for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and not public.esta_suspendido()
    and exists (select 1 from public.bitacoras b where b.id = bitacora_id and b.usuario_id = auth.uid())
  );
create policy ent_update on public.bitacora_entradas for update to authenticated
  using (usuario_id = auth.uid() and not public.esta_suspendido())
  with check (usuario_id = auth.uid());
create policy ent_delete on public.bitacora_entradas for delete to authenticated
  using (usuario_id = auth.uid() or public.soy_admin());

revoke all on public.bitacora_entradas from anon, authenticated;
grant select, delete on public.bitacora_entradas to authenticated;
grant insert (bitacora_id, usuario_id, titulo, contenido) on public.bitacora_entradas to authenticated;
grant update (titulo, contenido) on public.bitacora_entradas to authenticated;

-- Las bitácoras públicas también se pueden reportar
alter table public.reportes drop constraint if exists reportes_tipo_contenido_check;
alter table public.reportes add constraint reportes_tipo_contenido_check
  check (tipo_contenido in ('publicacion','comentario','usuario','mensaje','bitacora'));

-- ---------------------------------------------------------------------
-- 4. ARNEXU LAB (comité de inversión con IA)
--    Solo el servidor (Edge Function "lab") escribe aquí. El navegador
--    únicamente lee las evaluaciones propias.
-- ---------------------------------------------------------------------
create table if not exists public.lab_evaluaciones (
  id             uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  usuario_id     uuid not null references public.usuarios(id) on delete cascade,
  estado         text not null default 'en_curso' check (estado in ('en_curso','completada')),
  preguntas      jsonb not null,
  respuestas     jsonb,
  puntaje        integer check (puntaje is null or puntaje between 0 and 100),
  desglose       jsonb,
  fortalezas     jsonb,
  brechas        jsonb,
  resumen        text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index if not exists lab_idx_pub on public.lab_evaluaciones (publicacion_id, created_at desc);
create index if not exists lab_idx_usr on public.lab_evaluaciones (usuario_id, created_at desc);

alter table public.lab_evaluaciones enable row level security;
drop policy if exists lab_select on public.lab_evaluaciones;
create policy lab_select on public.lab_evaluaciones for select to authenticated
  using (usuario_id = auth.uid());

revoke all on public.lab_evaluaciones from anon, authenticated;
grant select on public.lab_evaluaciones to authenticated;

-- ---------------------------------------------------------------------
-- 5. TESIS DEL INVERSOR + DEAL FLOW ("Para ti")
-- ---------------------------------------------------------------------
create table if not exists public.tesis_inversor (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  categorias text[] not null default '{}' check (cardinality(categorias) <= 14),
  etapas     text[] not null default '{}' check (cardinality(etapas) <= 4),
  ciudades   text[] not null default '{}' check (cardinality(ciudades) <= 10),
  monto_min  numeric(14,0) check (monto_min is null or monto_min >= 0),
  monto_max  numeric(14,0) check (monto_max is null or monto_max >= 0),
  updated_at timestamptz not null default now(),
  check (monto_min is null or monto_max is null or monto_min <= monto_max)
);

drop trigger if exists trg_tesis_updated on public.tesis_inversor;
create trigger trg_tesis_updated before update on public.tesis_inversor
  for each row execute function public.set_updated_at();

alter table public.tesis_inversor enable row level security;
drop policy if exists tesis_select on public.tesis_inversor;
drop policy if exists tesis_insert on public.tesis_inversor;
drop policy if exists tesis_update on public.tesis_inversor;
drop policy if exists tesis_delete on public.tesis_inversor;
create policy tesis_select on public.tesis_inversor for select to authenticated using (usuario_id = auth.uid());
create policy tesis_insert on public.tesis_inversor for insert to authenticated with check (usuario_id = auth.uid());
create policy tesis_update on public.tesis_inversor for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy tesis_delete on public.tesis_inversor for delete to authenticated using (usuario_id = auth.uid());

revoke all on public.tesis_inversor from anon, authenticated;
grant select, delete on public.tesis_inversor to authenticated;
grant insert (usuario_id, categorias, etapas, ciudades, monto_min, monto_max) on public.tesis_inversor to authenticated;
grant update (categorias, etapas, ciudades, monto_min, monto_max) on public.tesis_inversor to authenticated;

-- Proyectos que encajan con tu tesis, con puntaje y razones.
-- SECURITY INVOKER: respeta tus bloqueos y los proyectos ocultos.
create or replace function public.deal_flow(p_limite integer default 5)
returns table (publicacion_id uuid, puntaje_match integer, razones text[])
language plpgsql stable security invoker set search_path = public as $$
declare
  t public.tesis_inversor%rowtype;
  v_ciudades text[];
begin
  select * into t from public.tesis_inversor where usuario_id = auth.uid();
  if not found then
    return;
  end if;
  select coalesce(array_agg(lower(trim(x))), '{}') into v_ciudades from unnest(t.ciudades) x;

  return query
  with base as (
    select p.id, p.created_at, p.categoria, p.etapa, p.ciudad, p.monto_busca, p.lab_puntaje,
           (p.categoria = any (t.categorias))                                           as m_cat,
           (p.etapa = any (t.etapas))                                                   as m_eta,
           (p.ciudad is not null and lower(trim(p.ciudad)) = any (v_ciudades))          as m_ciu,
           (p.monto_busca is not null
              and (t.monto_min is null or p.monto_busca >= t.monto_min)
              and (t.monto_max is null or p.monto_busca <= t.monto_max)
              and (t.monto_min is not null or t.monto_max is not null))                 as m_mon
      from public.publicaciones p
     where p.usuario_id <> auth.uid()
       and p.oculta = false
       and not exists (select 1 from public.senales_interes s
                        where s.publicacion_id = p.id and s.usuario_id = auth.uid())
  )
  select b.id,
         least(100,
           (case when b.m_cat then 35 else 0 end) + (case when b.m_eta then 25 else 0 end) +
           (case when b.m_ciu then 10 else 0 end) + (case when b.m_mon then 20 else 0 end) +
           coalesce(round(b.lab_puntaje / 10.0)::int, 0))::int,
         array_remove(array[
           case when b.m_cat then 'Categoría: ' || b.categoria end,
           case when b.m_eta then 'Etapa: ' || b.etapa end,
           case when b.m_ciu then 'Ciudad: ' || b.ciudad end,
           case when b.m_mon then 'Busca USD ' || to_char(b.monto_busca, 'FM999,999,999,999') || ', dentro de tu rango' end,
           case when b.lab_puntaje is not null then 'Puntaje Arnexu Lab: ' || b.lab_puntaje || '/100' end
         ], null)
    from base b
   where b.m_cat or b.m_eta or b.m_ciu or b.m_mon
   order by 2 desc, b.created_at desc
   limit least(greatest(coalesce(p_limite, 5), 1), 20);
end $$;

-- ---------------------------------------------------------------------
-- 6. NOTIFICACIONES PUSH
-- ---------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net no disponible: las notificaciones push quedan desactivadas (no afecta lo demás)';
end $$;

-- Configuración privada (nadie la lee desde el navegador)
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

insert into public.app_config (key, value) values
  ('push_secret', gen_random_uuid()::text),
  ('push_url',    'https://ifdajpaxbvpnbgeuohej.supabase.co/functions/v1/push')
on conflict (key) do nothing;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_idx_usr on public.push_subscriptions (usuario_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists push_select on public.push_subscriptions;
drop policy if exists push_delete on public.push_subscriptions;
create policy push_select on public.push_subscriptions for select to authenticated using (usuario_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated using (usuario_id = auth.uid());

revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Registrar este dispositivo para el usuario actual (si el dispositivo era de otra cuenta, pasa a esta)
create or replace function public.registrar_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then
    raise exception 'Suscripción no válida';
  end if;
  insert into public.push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
     set usuario_id = excluded.usuario_id, p256dh = excluded.p256dh,
         auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

-- Envía el aviso llamando a la Edge Function "push". Nunca rompe la operación que lo dispara.
create or replace function public.enviar_push(p_dest uuid, p_titulo text, p_cuerpo text, p_url text, p_tag text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_secret text;
begin
  if p_dest is null or not exists (select 1 from public.push_subscriptions where usuario_id = p_dest) then
    return;
  end if;
  select value into v_url    from public.app_config where key = 'push_url';
  select value into v_secret from public.app_config where key = 'push_secret';
  if v_url is null or v_secret is null then return; end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('destinatario', p_dest, 'titulo', p_titulo, 'cuerpo', p_cuerpo, 'url', p_url, 'tag', p_tag),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 4000
  );
exception when others then
  null;
end $$;

-- Mensaje nuevo
create or replace function public.push_por_mensaje()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dest uuid; v_nombre text; v_cuerpo text;
begin
  if new.tipo = 'ia' then return null; end if;
  select case when c.participante1_id = new.remitente_id then c.participante2_id else c.participante1_id end
    into v_dest from public.chats c where c.id = new.chat_id;
  if v_dest is null or v_dest = new.remitente_id then return null; end if;
  if exists (select 1 from public.bloqueos b where b.bloqueador_id = v_dest and b.bloqueado_id = new.remitente_id) then
    return null;
  end if;
  select nombre_completo into v_nombre from public.usuarios where id = new.remitente_id;
  v_cuerpo := case new.tipo
    when 'imagen' then '📷 Imagen' when 'video' then '🎥 Video' when 'audio' then '🎤 Mensaje de voz'
    when 'archivo' then '📎 ' || coalesce(left(new.archivo_nombre, 60), 'Archivo')
    else left(coalesce(new.contenido, ''), 90) end;
  perform public.enviar_push(v_dest, coalesce(v_nombre, 'Nuevo mensaje'), v_cuerpo,
                             'chat.html?nuevo=' || new.remitente_id, 'chat-' || new.chat_id);
  return null;
end $$;

drop trigger if exists trg_push_mensaje on public.mensajes;
create trigger trg_push_mensaje after insert on public.mensajes
  for each row execute function public.push_por_mensaje();

-- Señal de interés nueva
create or replace function public.push_por_senal()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dueno uuid; v_titulo text; v_nombre text;
begin
  select usuario_id, titulo into v_dueno, v_titulo from public.publicaciones where id = new.publicacion_id;
  select nombre_completo into v_nombre from public.usuarios where id = new.usuario_id;
  perform public.enviar_push(v_dueno, '💰 Nueva señal de interés',
    coalesce(v_nombre, 'Alguien') || ' podría invertir USD ' || to_char(new.monto, 'FM999,999,999,999') ||
    ' en "' || left(coalesce(v_titulo, 'tu proyecto'), 60) || '"',
    'perfil.html', 'senal-' || new.publicacion_id);
  return null;
end $$;

drop trigger if exists trg_push_senal on public.senales_interes;
create trigger trg_push_senal after insert on public.senales_interes
  for each row execute function public.push_por_senal();

-- Comentario nuevo en tu proyecto
create or replace function public.push_por_comentario()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dueno uuid; v_nombre text;
begin
  select usuario_id into v_dueno from public.publicaciones where id = new.publicacion_id;
  if v_dueno is null or v_dueno = new.usuario_id then return null; end if;
  if exists (select 1 from public.bloqueos b where b.bloqueador_id = v_dueno and b.bloqueado_id = new.usuario_id) then
    return null;
  end if;
  select nombre_completo into v_nombre from public.usuarios where id = new.usuario_id;
  perform public.enviar_push(v_dueno, '💬 Nuevo comentario',
    coalesce(v_nombre, 'Alguien') || ': ' || left(coalesce(new.contenido, ''), 80),
    'inicio.html', 'comentario-' || new.publicacion_id);
  return null;
end $$;

drop trigger if exists trg_push_comentario on public.comentarios;
create trigger trg_push_comentario after insert on public.comentarios
  for each row execute function public.push_por_comentario();

-- ---------------------------------------------------------------------
-- 7. QUIÉN PUEDE EJECUTAR QUÉ
-- ---------------------------------------------------------------------
revoke execute on function public.enviar_push(uuid, text, text, text, text)        from public, anon, authenticated;
revoke execute on function public.registrar_push(text, text, text, text)           from public, anon;
revoke execute on function public.deal_flow(integer)                               from public, anon;
revoke execute on function public.bitacora_visible(uuid)                           from public, anon;
revoke execute on function public.es_participante(uuid, uuid)                      from public, anon;
grant  execute on function public.registrar_push(text, text, text, text)           to authenticated;
grant  execute on function public.deal_flow(integer)                               to authenticated;
grant  execute on function public.bitacora_visible(uuid)                           to authenticated;
grant  execute on function public.es_participante(uuid, uuid)                      to authenticated;


