-- ============================================================================
-- Écarts L82 et L79 (lot `carnet-notifications`, docs/wip/ecarts-lots.md)
-- ============================================================================
--
-- QUESTION D'ACCÈS (posée à David le 2026-11-28) : personne ne lit rien de
-- plus qu'avant. La migration FERME des écritures, elle n'en ouvre aucune :
--
--   · L82 : le professeur ne peut plus poser un avertissement à un élève dans
--     une classe où l'élève n'a pas d'adhésion ACTIVE (pas inscrit, ou adhésion
--     archivée). Avant, `is_class_teacher(class_id)` suffisait, et en
--     mono-professeur il est vrai pour toutes les classes.
--     Question en miroir (« qui ne pourra plus écrire ce qu'il écrivait ? ») :
--     le professeur, seulement pour ces avertissements sans élève dans la classe.
--     Fermé aux trois portes : `add_warning`, `add_warnings_bulk` (SECURITY
--     DEFINER, qui contournent la RLS) et la policy d'insertion directe.
--
--   · L83 : la policy d'insertion des notifications du prof n'accepte plus,
--     en ciblage nominatif, un élève sans adhésion active (déjà refusé par
--     `createNotification`, pas par une insertion directe).
--
--   · L79 : `get_carnet_by_token` n'ajoute plus une ouverture au lien quand le
--     carnet est ouvert par le jeton d'un courriel. Rien ne change de ce qui est
--     lu ; seul le compteur `access_count` (lu par aucun écran) est juste.
--
-- Additive : `create or replace` des fonctions (les droits restent), policies
-- remplacées par des plus strictes. Aucune donnée touchée.
--
-- ROLLBACK (rejouer les définitions précédentes) :
--   · add_warning, add_warnings_bulk : supabase/migrations/20260616220000_baseline_schema.sql
--     (puis `alter function … set search_path = public, pg_temp`, comme
--     20261003210000_rpc_lot4_hygiene.sql) ;
--   · get_carnet_by_token : supabase/migrations/20261116215952_carnet_courriels_exception.sql ;
--   · policy des notifications : rejouer le `with check` de
--     20260620090000_drop_class_teacher_id_mono_teacher.sql (ligne ~3289) par
--     `alter policy`, sans `and cm.status = 'active'` ;
--   · policy des avertissements :
--       drop policy if exists "teachers_insert_own_class_warnings" on public.student_warnings;
--       create policy "teachers_insert_own_class_warnings" on public.student_warnings
--         for insert to authenticated
--         with check (public.is_class_teacher(class_id) and created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 1. L82 : adhésion active de l'élève à la classe de l'avertissement
-- ---------------------------------------------------------------------------

create or replace function public.add_warning(
	p_student_id uuid,
	p_class_id uuid,
	p_academic_period_id uuid,
	p_warning_type text
) returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_total integer;
	v_counts json;
begin
	-- Garde d'appelant : professeur de la classe.
	if not is_class_teacher(p_class_id) then
		return json_build_object('success', false, 'error', 'Unauthorized: you do not teach this class');
	end if;

	-- L82 : l'élève doit être inscrit (adhésion active) dans cette classe.
	if not exists (
		select 1 from class_members m
		where m.class_id = p_class_id
			and m.student_id = p_student_id
			and m.status = 'active'
	) then
		return json_build_object('success', false, 'error', 'Student is not an active member of this class');
	end if;

	if p_warning_type not in ('C', 'M', 'R', 'T') then
		return json_build_object('success', false, 'error', 'Invalid warning type: ' || p_warning_type);
	end if;

	-- Sérialise les ajouts simultanés pour le même élève, classe et période.
	perform pg_advisory_xact_lock(hashtext(p_student_id::text || p_class_id::text || p_academic_period_id::text));

	select count(*) into v_total
	from student_warnings
	where student_id = p_student_id
		and class_id = p_class_id
		and academic_period_id = p_academic_period_id
		and deleted_at is null;

	if v_total >= 20 then
		return json_build_object('success', false, 'error', 'Student already has 20 warnings');
	end if;

	insert into student_warnings (student_id, class_id, academic_period_id, warning_type, created_by)
	values (p_student_id, p_class_id, p_academic_period_id, p_warning_type, auth.uid());

	select json_build_object(
		'C', coalesce(sum(case when warning_type = 'C' then 1 else 0 end), 0),
		'M', coalesce(sum(case when warning_type = 'M' then 1 else 0 end), 0),
		'R', coalesce(sum(case when warning_type = 'R' then 1 else 0 end), 0),
		'T', coalesce(sum(case when warning_type = 'T' then 1 else 0 end), 0)
	) into v_counts
	from student_warnings
	where student_id = p_student_id
		and class_id = p_class_id
		and academic_period_id = p_academic_period_id
		and deleted_at is null;

	return json_build_object('success', true, 'counts', v_counts);
end;
$$;

create or replace function public.add_warnings_bulk(
	p_student_id uuid,
	p_class_id uuid,
	p_academic_period_id uuid,
	p_warning_types text[]
) returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_total integer;
	v_to_add integer;
	v_type text;
	v_counts json;
begin
	-- Garde d'appelant : professeur de la classe.
	if not is_class_teacher(p_class_id) then
		return json_build_object('success', false, 'error', 'Unauthorized: you do not teach this class');
	end if;

	-- L82 : l'élève doit être inscrit (adhésion active) dans cette classe.
	if not exists (
		select 1 from class_members m
		where m.class_id = p_class_id
			and m.student_id = p_student_id
			and m.status = 'active'
	) then
		return json_build_object('success', false, 'error', 'Student is not an active member of this class');
	end if;

	v_to_add := coalesce(array_length(p_warning_types, 1), 0);
	if v_to_add = 0 then
		return json_build_object('success', false, 'error', 'No warning types provided');
	end if;

	if v_to_add > 20 then
		return json_build_object('success', false, 'error', 'Cannot add more than 20 warnings at once');
	end if;

	foreach v_type in array p_warning_types loop
		if v_type not in ('C', 'M', 'R', 'T') then
			return json_build_object('success', false, 'error', 'Invalid warning type: ' || v_type);
		end if;
	end loop;

	-- Sérialise les ajouts simultanés pour le même élève, classe et période.
	perform pg_advisory_xact_lock(hashtext(p_student_id::text || p_class_id::text || p_academic_period_id::text));

	select count(*) into v_total
	from student_warnings
	where student_id = p_student_id
		and class_id = p_class_id
		and academic_period_id = p_academic_period_id
		and deleted_at is null;

	if v_total + v_to_add > 20 then
		return json_build_object(
			'success', false,
			'error', format('Would exceed 20 warnings (current: %s, adding: %s)', v_total, v_to_add)
		);
	end if;

	insert into student_warnings (student_id, class_id, academic_period_id, warning_type, created_by)
	select p_student_id, p_class_id, p_academic_period_id, unnest(p_warning_types), auth.uid();

	select json_build_object(
		'C', coalesce(sum(case when warning_type = 'C' then 1 else 0 end), 0),
		'M', coalesce(sum(case when warning_type = 'M' then 1 else 0 end), 0),
		'R', coalesce(sum(case when warning_type = 'R' then 1 else 0 end), 0),
		'T', coalesce(sum(case when warning_type = 'T' then 1 else 0 end), 0)
	) into v_counts
	from student_warnings
	where student_id = p_student_id
		and class_id = p_class_id
		and academic_period_id = p_academic_period_id
		and deleted_at is null;

	return json_build_object('success', true, 'counts', v_counts, 'added', v_to_add);
end;
$$;

-- Insertion directe (PostgREST) : même règle que les deux fonctions.
drop policy if exists "teachers_insert_own_class_warnings" on public.student_warnings;
create policy "teachers_insert_own_class_warnings" on public.student_warnings
	for insert to authenticated
	with check (
		public.is_class_teacher(class_id)
		and created_by = auth.uid()
		and exists (
			select 1 from public.class_members m
			where m.class_id = student_warnings.class_id
				and m.student_id = student_warnings.student_id
				and m.status = 'active'
		)
	);
comment on policy "teachers_insert_own_class_warnings" on public.student_warnings is
	'Teachers can add warnings for active members of their classes';

-- ---------------------------------------------------------------------------
-- 2. L83 : notification nominative du prof, adhésion active de l'élève
-- ---------------------------------------------------------------------------
-- `createNotification` le contrôle côté serveur ; la policy le laissait passer
-- à une insertion directe (PostgREST, session du prof). `alter policy` garde
-- le rôle (`authenticated`, 20261001130000) ; seul `cm.status = 'active'`
-- s'ajoute.

alter policy "Teachers can create notifications for their classes" on public.notifications
	with check (
		(select p.role::text from public.profiles p where p.id = auth.uid()) = 'teacher'
		and (
			(
				target_type = 'classes'
				and target_class_ids <@ (
					select array_agg(c.id) from public.classes c
					where public.is_teacher_or_admin()
				)
			)
			or (
				target_type = 'users'
				and target_user_ids <@ (
					select array_agg(distinct cm.student_id)
					from public.class_members cm
					join public.classes c on c.id = cm.class_id
					where public.is_teacher_or_admin()
						and cm.status = 'active'
				)
			)
		)
	);

-- ---------------------------------------------------------------------------
-- 3. L79 : une ouverture n'est comptée au lien que si elle vient du lien
-- ---------------------------------------------------------------------------

create or replace function public.get_carnet_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_contact_id uuid;
	v_contact record;
begin
	if p_token is null or char_length(p_token) not between 32 and 128 then
		return null;
	end if;

	v_contact_id := public.carnet_contact_by_token(p_token);
	if v_contact_id is null then
		return null;
	end if;

	select c.student_id, c.status, c.emails_stopped_at into v_contact
	from public.parent_contacts c
	where c.id = v_contact_id;

	if not found
		or v_contact.status <> 'confirmed'
		or not public.carnet_student_is_shared(v_contact.student_id) then
		return null;
	end if;

	-- Le jeton d'un courriel ouvre le carnet mais ne compte pas pour le lien
	-- (L79) : seule l'empreinte du lien lui-même avance son compteur.
	update public.parent_carnet_links
	set access_count = access_count + 1, last_accessed_at = now()
	where contact_id = v_contact_id
		and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
		and revoked_at is null
		and expires_at > now();

	return public.carnet_payload(v_contact.student_id)
		|| jsonb_build_object('emails_stopped', v_contact.emails_stopped_at is not null);
end;
$$;
