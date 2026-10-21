-- ASOCULSOR - MIGRACIÓN DE SEGURIDAD. Ejecutar UNA vez tras 001_base_original.sql
-- Compatible con instalaciones anteriores. No modifica registros existentes.
-- Nota: usar SQL Editor de Supabase con privilegios de administrador del proyecto.
BEGIN;

-- Funciones privilegiadas fuera del esquema expuesto por PostgREST.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT exists(SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND active = true);
$$;
CREATE OR REPLACE FUNCTION private.has_role(allowed text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT exists(SELECT 1 FROM public.profiles
               WHERE id = (SELECT auth.uid()) AND active = true AND role = ANY(allowed));
$$;
REVOKE ALL ON FUNCTION private.is_active() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.has_role(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(text[]) TO authenticated;

-- Aplicar políticas de mínimo privilegio. Se sustituyen todas las de estas tablas.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','beneficiaries','programs','enrollments',
  'activities','attendance','appointments','donations','documents','audit_logs'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon,authenticated',t);
  END LOOP;
END $$;

GRANT SELECT,UPDATE ON public.profiles TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.beneficiaries,public.programs,public.enrollments,
 public.activities,public.attendance,public.appointments,public.donations,public.documents TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
 USING(id=(SELECT auth.uid()) OR (SELECT private.is_active()));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
 USING((SELECT private.has_role(ARRAY['admin'])))
 WITH CHECK((SELECT private.has_role(ARRAY['admin'])));

CREATE POLICY beneficiaries_select ON public.beneficiaries FOR SELECT TO authenticated USING((SELECT private.is_active()));
CREATE POLICY beneficiaries_insert ON public.beneficiaries FOR INSERT TO authenticated WITH CHECK((SELECT private.is_active()));
CREATE POLICY beneficiaries_update ON public.beneficiaries FOR UPDATE TO authenticated
 USING((SELECT private.is_active())) WITH CHECK((SELECT private.is_active()));
CREATE POLICY beneficiaries_delete ON public.beneficiaries FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin'])));

CREATE POLICY programs_select ON public.programs FOR SELECT TO authenticated USING((SELECT private.is_active()));
CREATE POLICY programs_insert ON public.programs FOR INSERT TO authenticated WITH CHECK((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY programs_update ON public.programs FOR UPDATE TO authenticated
 USING((SELECT private.has_role(ARRAY['admin','coordinador']))) WITH CHECK((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY programs_delete ON public.programs FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));

CREATE POLICY enrollments_select ON public.enrollments FOR SELECT TO authenticated USING((SELECT private.is_active()));
CREATE POLICY enrollments_insert ON public.enrollments FOR INSERT TO authenticated WITH CHECK((SELECT private.is_active()));
CREATE POLICY enrollments_update ON public.enrollments FOR UPDATE TO authenticated
 USING((SELECT private.is_active())) WITH CHECK((SELECT private.is_active()));
CREATE POLICY enrollments_delete ON public.enrollments FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));

CREATE POLICY activities_select ON public.activities FOR SELECT TO authenticated USING((SELECT private.is_active()));
CREATE POLICY activities_insert ON public.activities FOR INSERT TO authenticated WITH CHECK((SELECT private.is_active()));
CREATE POLICY activities_update ON public.activities FOR UPDATE TO authenticated
 USING((SELECT private.is_active())) WITH CHECK((SELECT private.is_active()));
CREATE POLICY activities_delete ON public.activities FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));

CREATE POLICY attendance_select ON public.attendance FOR SELECT TO authenticated USING((SELECT private.is_active()));
CREATE POLICY attendance_insert ON public.attendance FOR INSERT TO authenticated WITH CHECK((SELECT private.is_active()));
CREATE POLICY attendance_update ON public.attendance FOR UPDATE TO authenticated
 USING((SELECT private.is_active())) WITH CHECK((SELECT private.is_active()));
CREATE POLICY attendance_delete ON public.attendance FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));

CREATE POLICY appointments_select ON public.appointments FOR SELECT TO authenticated USING((SELECT private.is_active()));
CREATE POLICY appointments_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK((SELECT private.is_active()));
CREATE POLICY appointments_update ON public.appointments FOR UPDATE TO authenticated
 USING((SELECT private.is_active())) WITH CHECK((SELECT private.is_active()));
CREATE POLICY appointments_delete ON public.appointments FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin'])));

-- Datos financieros y expedientes: SOLO dirección/coordinación.
CREATE POLICY donations_select ON public.donations FOR SELECT TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY donations_insert ON public.donations FOR INSERT TO authenticated WITH CHECK((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY donations_update ON public.donations FOR UPDATE TO authenticated
 USING((SELECT private.has_role(ARRAY['admin','coordinador']))) WITH CHECK((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY donations_delete ON public.donations FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin'])));

CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated WITH CHECK((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated
 USING((SELECT private.has_role(ARRAY['admin','coordinador']))) WITH CHECK((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY documents_delete ON public.documents FOR DELETE TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated USING((SELECT private.has_role(ARRAY['admin','coordinador'])));

-- Almacenamiento real: bucket privado, restringido también desde Storage API.
UPDATE storage.buckets SET public=false, file_size_limit=10485760,
  allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
 WHERE id='expedientes';
DROP POLICY IF EXISTS expediente_select ON storage.objects;
DROP POLICY IF EXISTS expediente_insert ON storage.objects;
DROP POLICY IF EXISTS expediente_delete ON storage.objects;
DROP POLICY IF EXISTS expediente_update ON storage.objects;
DROP POLICY IF EXISTS expediente_guard_read ON storage.objects;
DROP POLICY IF EXISTS expediente_guard_insert ON storage.objects;
DROP POLICY IF EXISTS expediente_guard_update ON storage.objects;
DROP POLICY IF EXISTS expediente_guard_delete ON storage.objects;
-- Políticas restrictivas: protegen el bucket incluso si existen otras políticas permisivas.
CREATE POLICY expediente_guard_read ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id <> 'expedientes' OR (SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY expediente_guard_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id <> 'expedientes' OR (SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY expediente_guard_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id <> 'expedientes' OR (SELECT private.has_role(ARRAY['admin','coordinador'])))
 WITH CHECK(bucket_id <> 'expedientes' OR (SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY expediente_guard_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING(bucket_id <> 'expedientes' OR (SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY expediente_select ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='expedientes' AND (SELECT private.has_role(ARRAY['admin','coordinador'])));
CREATE POLICY expediente_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='expedientes' AND (SELECT private.has_role(ARRAY['admin','coordinador']))
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY expediente_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='expedientes' AND (SELECT private.has_role(ARRAY['admin','coordinador'])));

-- Auditoría: los eventos se escriben desde el servidor sin confiar en el cliente.
CREATE OR REPLACE FUNCTION private.record_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.audit_logs(actor_id,table_name,record_id,action)
   VALUES((SELECT auth.uid()),TG_TABLE_NAME,
   (CASE WHEN TG_OP='DELETE' THEN OLD.id::text ELSE NEW.id::text END),TG_OP);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.record_audit() FROM PUBLIC,anon,authenticated;
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','beneficiaries','programs','enrollments',
 'activities','attendance','appointments','donations','documents'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS audit_row ON public.%I',t);
  EXECUTE format('CREATE TRIGGER audit_row AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.record_audit()',t);
 END LOOP;
END $$;

-- Marcar autor real sin permitir suplantación por JSON desde el navegador.
CREATE OR REPLACE FUNCTION private.lock_actor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid;
BEGIN
 IF (SELECT auth.role())='service_role' THEN RETURN NEW; END IF;
 actor := (SELECT auth.uid());
 IF actor IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión para guardar registros.' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='attendance' OR TG_TABLE_NAME='donations' THEN
   IF TG_OP='INSERT' THEN NEW.recorded_by := actor;
   ELSE NEW.recorded_by := OLD.recorded_by; END IF;
 ELSIF TG_TABLE_NAME='documents' THEN
   IF TG_OP='INSERT' THEN NEW.uploaded_by := actor;
   ELSE
     NEW.uploaded_by := OLD.uploaded_by;
     IF NEW.file_path IS DISTINCT FROM OLD.file_path OR NEW.file_size IS DISTINCT FROM OLD.file_size OR
        NEW.mime_type IS DISTINCT FROM OLD.mime_type OR NEW.file_name IS DISTINCT FROM OLD.file_name THEN
       RAISE EXCEPTION 'Los atributos del archivo son inmutables.' USING ERRCODE='42501';
     END IF;
   END IF;
 ELSE
   IF TG_OP='INSERT' THEN NEW.created_by := actor;
   ELSE NEW.created_by := OLD.created_by; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.lock_actor() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['beneficiaries','programs','activities','attendance','appointments','donations','documents'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS actor_integrity ON public.%I',t);
  EXECUTE format('CREATE TRIGGER actor_integrity BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.lock_actor()',t);
 END LOOP;
END $$;

-- El administrador no puede alterar ID/email del perfil ni bloquear al último admin activo.
CREATE OR REPLACE FUNCTION private.guard_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'La identidad del usuario no puede modificarse desde esta pantalla.' USING ERRCODE='42501';
 END IF;
 IF OLD.active AND OLD.role='admin' AND (NOT NEW.active OR NEW.role<>'admin') AND
   (SELECT count(*) FROM public.profiles WHERE active AND role='admin') <= 1 THEN
   RAISE EXCEPTION 'No puedes deshabilitar al último administrador.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile ON public.profiles;
CREATE TRIGGER guard_profile BEFORE UPDATE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION private.guard_profile();
REVOKE ALL ON FUNCTION private.guard_profile() FROM PUBLIC,anon,authenticated;

-- Retirar funciones públicas privilegiadas del esquema expuesto.
DROP FUNCTION IF EXISTS public.user_is_active();
DROP FUNCTION IF EXISTS public.user_has_role(text[]);
-- Mantener trigger de creación, pero mover su ejecución fuera del esquema público.
CREATE OR REPLACE FUNCTION private.on_user_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles(id,email,full_name,role,active)
 VALUES(NEW.id,coalesce(NEW.email,''),left(coalesce(NEW.raw_user_meta_data->>'full_name',''),150),'operador',false)
 ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION private.on_user_created();
REVOKE ALL ON FUNCTION private.on_user_created() FROM PUBLIC,anon,authenticated;
DROP FUNCTION IF EXISTS public.on_user_created();
DROP FUNCTION IF EXISTS public.record_audit();


-- La validación de cupos también se ejecuta en el servidor y fuera del API público.
CREATE OR REPLACE FUNCTION private.enforce_program_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE max_places integer; occupied integer;
BEGIN
 IF NEW.status <> 'activo' THEN RETURN NEW; END IF;
 SELECT capacity INTO max_places FROM public.programs WHERE id=NEW.program_id FOR UPDATE;
 IF max_places IS NULL THEN RETURN NEW; END IF;
 SELECT count(*) INTO occupied FROM public.enrollments
 WHERE program_id=NEW.program_id AND status='activo' AND id IS DISTINCT FROM NEW.id;
 IF occupied>=max_places THEN RAISE EXCEPTION 'El programa ya alcanzó su cupo máximo.'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS check_program_capacity ON public.enrollments;
CREATE TRIGGER check_program_capacity BEFORE INSERT OR UPDATE OF status,program_id
 ON public.enrollments FOR EACH ROW EXECUTE FUNCTION private.enforce_program_capacity();
REVOKE ALL ON FUNCTION private.enforce_program_capacity() FROM PUBLIC,anon,authenticated;
DROP FUNCTION IF EXISTS public.enforce_program_capacity();

-- Validaciones de integridad del registro personal.
ALTER TABLE public.beneficiaries DROP CONSTRAINT IF EXISTS beneficiaries_name_nonempty;
ALTER TABLE public.beneficiaries ADD CONSTRAINT beneficiaries_name_nonempty
 CHECK (length(btrim(first_name))>0 AND length(btrim(last_name))>0);

COMMIT;
