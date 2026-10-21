-- FUNDACIÓN ASOCULSOR · CENTRO CUATRO DE ENERO
-- Esquema inicial para Supabase Postgres. Ejecutar UNA VEZ en SQL Editor.
-- Importante: no se crean usuarios o contraseñas de ejemplo en la base real.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text not null default '',
 role text not null default 'operador' check (role in ('admin','coordinador','operador')),
 active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles(lower(email));

create table if not exists public.beneficiaries (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 first_name text not null,
 last_name text not null,
 identification text,
 date_of_birth date,
 gender text,
 disability_type text,
 phone text,
 email text,
 address text,
 guardian_name text,
 guardian_phone text,
 status text not null default 'activo' check(status in ('activo','inactivo','egresado')),
 notes text,
 created_by uuid references public.profiles(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists beneficiaries_status_idx on public.beneficiaries(status);

create table if not exists public.programs (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 category text,
 description text,
 capacity integer check (capacity is null or capacity >= 1),
 start_date date,
 end_date date,
 status text not null default 'planificado' check(status in ('activo','planificado','finalizado','suspendido')),
 created_by uuid references public.profiles(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint program_dates check(end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.enrollments (
 id uuid primary key default gen_random_uuid(),
 beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
 program_id uuid not null references public.programs(id) on delete cascade,
 joined_at date default current_date,
 status text not null default 'activo' check(status in ('activo','retirado','finalizado')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint unique_enrollment unique(beneficiary_id,program_id)
);
create index if not exists enrollment_program_idx on public.enrollments(program_id);

create table if not exists public.activities (
 id uuid primary key default gen_random_uuid(),
 program_id uuid references public.programs(id) on delete set null,
 title text not null,
 starts_at timestamptz not null,
 ends_at timestamptz,
 location text,
 status text not null default 'programada' check(status in ('programada','realizada','cancelada')),
 notes text,
 created_by uuid references public.profiles(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint activity_dates check(ends_at is null or ends_at >= starts_at)
);
create index if not exists activity_start_idx on public.activities(starts_at);

create table if not exists public.attendance (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null references public.activities(id) on delete cascade,
 beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
 status text not null default 'presente' check(status in ('presente','ausente','justificado')),
 notes text,
 recorded_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint unique_attendance unique(activity_id,beneficiary_id)
);

create table if not exists public.appointments (
 id uuid primary key default gen_random_uuid(),
 beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
 title text not null,
 starts_at timestamptz not null,
 ends_at timestamptz,
 staff_id uuid references public.profiles(id) on delete set null,
 status text not null default 'programada' check(status in ('programada','completada','cancelada','no_asistio')),
 notes text,
 created_by uuid references public.profiles(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint appointment_dates check(ends_at is null or ends_at >= starts_at)
);
create index if not exists appointment_start_idx on public.appointments(starts_at);

create table if not exists public.donations (
 id uuid primary key default gen_random_uuid(),
 donor_name text not null,
 donor_email text,
 amount numeric(12,2) not null default 0 check(amount>=0),
 donated_at date not null default current_date,
 method text not null default 'efectivo' check(method in ('efectivo','transferencia','tarjeta','especie')),
 purpose text,
 notes text,
 recorded_by uuid references public.profiles(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists donations_date_idx on public.donations(donated_at);

create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 beneficiary_id uuid references public.beneficiaries(id) on delete set null,
 file_name text not null,
 file_path text not null unique,
 file_size bigint not null check(file_size>=0 and file_size<=10485760),
 mime_type text,
 notes text,
 uploaded_by uuid references public.profiles(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.profiles(id) on delete set null,
 table_name text not null,
 record_id text,
 action text not null check(action in ('INSERT','UPDATE','DELETE')),
 created_at timestamptz not null default now()
);
create index if not exists audit_time_idx on public.audit_logs(created_at desc);

-- Alta controlada: ningún usuario nuevo obtiene acceso automático.
create or replace function public.on_user_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,email,full_name,role,active)
 values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''), 'operador', false)
 on conflict(id) do nothing;
 return new;
end; $$;
drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created after insert on auth.users
 for each row execute function public.on_user_created();

create or replace function public.user_is_active()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active=true);
$$;
create or replace function public.user_has_role(allowed text[])
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active=true and role=any(allowed));
$$;
revoke all on function public.user_is_active() from public,anon;
revoke all on function public.user_has_role(text[]) from public,anon;
grant execute on function public.user_is_active() to authenticated,service_role;
grant execute on function public.user_has_role(text[]) to authenticated,service_role;

-- Fechas de modificación.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end; $$;
do $$declare t text; begin
 foreach t in array array['profiles','beneficiaries','programs','enrollments','activities','attendance','appointments','donations','documents'] loop
  execute format('drop trigger if exists touch_updated_at on public.%I',t);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 end loop;
end $$;

-- Garantía de capacidad: serializa las inscripciones activas por programa.
create or replace function public.enforce_program_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare max_places integer; occupied integer;
begin
 if new.status <> 'activo' then return new; end if;
 select capacity into max_places from public.programs where id=new.program_id for update;
 if max_places is null then return new; end if;
 select count(*) into occupied from public.enrollments
 where program_id=new.program_id and status='activo' and id is distinct from new.id;
 if occupied >= max_places then
  raise exception 'El programa ya alcanzó su cupo máximo.';
 end if;
 return new;
end; $$;
drop trigger if exists check_program_capacity on public.enrollments;
create trigger check_program_capacity before insert or update of status,program_id
 on public.enrollments for each row execute function public.enforce_program_capacity();

-- Bitácora de cambios (sin copiar valores sensibles).
create or replace function public.record_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.audit_logs(actor_id,table_name,record_id,action)
 values(auth.uid(),TG_TABLE_NAME,case when TG_OP='DELETE' then old.id::text else new.id::text end,TG_OP);
 return case when TG_OP='DELETE' then old else new end;
end; $$;
do $$declare t text; begin
 foreach t in array array['profiles','beneficiaries','programs','enrollments','activities','attendance','appointments','donations','documents'] loop
  execute format('drop trigger if exists audit_row on public.%I',t);
  execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.record_audit()',t);
 end loop;
end $$;

-- Privilegios: jamás concedemos acceso a tablas de personas al rol anon.
do $$declare t text; begin
 foreach t in array array['profiles','beneficiaries','programs','enrollments','activities','attendance','appointments','donations','documents','audit_logs'] loop
  execute format('revoke all on table public.%I from anon',t);
  execute format('grant select,insert,update,delete on table public.%I to authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
  execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;

-- Personal: los usuarios nuevos solo ven su propio registro hasta que el admin los habilite.
create policy profiles_select on public.profiles for select to authenticated
 using(id=auth.uid() or public.user_is_active());
create policy profiles_update on public.profiles for update to authenticated
 using(public.user_has_role(array['admin'])) with check(public.user_has_role(array['admin']));

create policy beneficiaries_select on public.beneficiaries for select to authenticated using(public.user_is_active());
create policy beneficiaries_insert on public.beneficiaries for insert to authenticated with check(public.user_is_active());
create policy beneficiaries_update on public.beneficiaries for update to authenticated using(public.user_is_active()) with check(public.user_is_active());
create policy beneficiaries_delete on public.beneficiaries for delete to authenticated using(public.user_has_role(array['admin','coordinador']));

create policy programs_select on public.programs for select to authenticated using(public.user_is_active());
create policy programs_insert on public.programs for insert to authenticated with check(public.user_has_role(array['admin','coordinador']));
create policy programs_update on public.programs for update to authenticated using(public.user_has_role(array['admin','coordinador'])) with check(public.user_has_role(array['admin','coordinador']));
create policy programs_delete on public.programs for delete to authenticated using(public.user_has_role(array['admin','coordinador']));

create policy enrollments_select on public.enrollments for select to authenticated using(public.user_is_active());
create policy enrollments_insert on public.enrollments for insert to authenticated with check(public.user_is_active());
create policy enrollments_update on public.enrollments for update to authenticated using(public.user_is_active()) with check(public.user_is_active());
create policy enrollments_delete on public.enrollments for delete to authenticated using(public.user_has_role(array['admin','coordinador']));

create policy activities_select on public.activities for select to authenticated using(public.user_is_active());
create policy activities_insert on public.activities for insert to authenticated with check(public.user_is_active());
create policy activities_update on public.activities for update to authenticated using(public.user_is_active()) with check(public.user_is_active());
create policy activities_delete on public.activities for delete to authenticated using(public.user_has_role(array['admin','coordinador']));

create policy attendance_select on public.attendance for select to authenticated using(public.user_is_active());
create policy attendance_insert on public.attendance for insert to authenticated with check(public.user_is_active());
create policy attendance_update on public.attendance for update to authenticated using(public.user_is_active()) with check(public.user_is_active());
create policy attendance_delete on public.attendance for delete to authenticated using(public.user_has_role(array['admin','coordinador']));

create policy appointments_select on public.appointments for select to authenticated using(public.user_is_active());
create policy appointments_insert on public.appointments for insert to authenticated with check(public.user_is_active());
create policy appointments_update on public.appointments for update to authenticated using(public.user_is_active()) with check(public.user_is_active());
create policy appointments_delete on public.appointments for delete to authenticated using(public.user_has_role(array['admin','coordinador']));

create policy donations_select on public.donations for select to authenticated using(public.user_is_active());
create policy donations_insert on public.donations for insert to authenticated with check(public.user_has_role(array['admin','coordinador']));
create policy donations_update on public.donations for update to authenticated using(public.user_has_role(array['admin','coordinador'])) with check(public.user_has_role(array['admin','coordinador']));
create policy donations_delete on public.donations for delete to authenticated using(public.user_has_role(array['admin']));

create policy documents_select on public.documents for select to authenticated using(public.user_is_active());
create policy documents_insert on public.documents for insert to authenticated with check(public.user_is_active());
create policy documents_update on public.documents for update to authenticated using(public.user_is_active()) with check(public.user_is_active());
create policy documents_delete on public.documents for delete to authenticated using(public.user_has_role(array['admin','coordinador']));

create policy audit_select on public.audit_logs for select to authenticated using(public.user_has_role(array['admin','coordinador']));
-- Ningún usuario inserta, modifica ni borra auditoría por REST.
revoke insert,update,delete on table public.audit_logs from authenticated;
revoke insert,delete on table public.profiles from authenticated;

-- Depósito PRIVADO con MIME y tamaño limitados.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('expedientes','expedientes',false,10485760,array[
 'application/pdf','image/jpeg','image/png',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]) on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create policy expediente_select on storage.objects for select to authenticated
 using(bucket_id='expedientes' and public.user_is_active());
create policy expediente_insert on storage.objects for insert to authenticated
 with check(bucket_id='expedientes' and public.user_is_active() and (storage.foldername(name))[1]=auth.uid()::text);
create policy expediente_delete on storage.objects for delete to authenticated
 using(bucket_id='expedientes' and public.user_has_role(array['admin','coordinador']));

-- FIN. SIGUIENTE PASO:
-- 1) Crea una cuenta en la pantalla "Solicitar acceso" y verifica tu correo.
-- 2) Sustituye el correo a continuación y EJECUTA ESTA SENTENCIA POR SEPARADO:
-- update public.profiles set role='admin',active=true where lower(email)=lower('TU_CORREO@EJEMPLO.COM');
-- 3) Inicia sesión en el sitio. El admin podrá habilitar a los demás usuarios.
