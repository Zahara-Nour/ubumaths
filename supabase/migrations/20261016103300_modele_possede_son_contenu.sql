-- Le modèle de chapitre possède son contenu ; le chapitre lié le relie (ADR 0029, étape 2)
-- ==============================================================================
--
-- Six tables de contenu : un élément appartient SOIT à un chapitre (`chapter_id`),
-- SOIT à un modèle (`template_id`). Un chapitre lié porte une LIGNE DE LIEN par
-- élément du modèle (`source_id`) : publication, section, ordre et masquage lui
-- sont propres ; le contenu (titre, texte, chemin du fichier…) est celui du
-- modèle, recopié par la base. Le fichier reste unique, chez le modèle
-- (`chapter-documents/templates/<template_id>/…`).
-- Journal : docs/wip/refonte-modeles-chapitre-progress.md.
--
-- QUI POURRA LIRE QUOI, QU'IL NE POUVAIT PAS LIRE AVANT (tranché par David, Q6) :
--   personne. Le prof (et l'admin) lit et modifie le contenu de SES modèles. Un
--   élève ne lit jamais une ligne de modèle (sa policy exige un chapitre) ; il
--   lit une ligne de lien exactement comme une ligne de chapitre aujourd'hui :
--   chapitre visible de sa classe ET `published_at <= now()`. Aucune règle de
--   stockage élève n'est ajoutée pour `templates/…` : le serveur servira ces
--   fichiers après la garde (étape 3). Le retrait de la règle élève de
--   `chapters/…` (prod seulement) viendra après déploiement, à part.
--
-- Additive : colonnes facultatives, contraintes satisfaites par toutes les lignes
-- existantes (chapter_id rempli, template_id vide), policies et règles de
-- stockage NOUVELLES (les existantes ne changent pas), déclencheurs qui ne
-- s'appliquent qu'aux lignes de modèle ou de lien — il n'en existe aucune.
-- Seul `chapter_id` perd son NOT NULL (remplacé par « exactement un
-- propriétaire »), et `orphan_chapter_documents` ignore désormais les lignes de
-- lien (elles n'ont pas de fichier à elles). Le code en production n'écrit ni
-- ne lit aucune de ces nouveautés.
--
-- ROLLBACK:BEGIN
-- ⚠️ DESTRUCTIF : supprime le contenu des modèles (lignes `template_id`) et les
-- lignes de lien ; les fichiers `templates/…` restent dans le bucket mais plus
-- personne ne peut les lire. À ne jouer qu'avant toute reprise de données.
-- drop function if exists public.link_chapter_to_template(uuid, uuid);
-- drop policy if exists "Teachers can read template documents" on storage.objects;
-- drop policy if exists "Teachers can upload template documents" on storage.objects;
-- drop policy if exists "Teachers can update template documents" on storage.objects;
-- drop policy if exists "Teachers can delete template documents" on storage.objects;
-- -- 1) Les cinq tables d'éléments D'ABORD (leurs clés `*_section_modele_fkey`
-- --    dépendent de `chapter_sections.template_id`) : pour t dans chapter_documents,
-- --    chapter_checklist_items, chapter_exercises, chapter_worksheets, chapter_series
-- drop trigger if exists modele_lien_remplir on public.<t>;
-- drop trigger if exists modele_lien_garde on public.<t>;
-- drop trigger if exists modele_recopier on public.<t>;
-- drop trigger if exists modele_ajout_diffuse on public.<t>;
-- drop trigger if exists modele_retrait on public.<t>;
-- drop policy if exists "Teachers can manage content of their templates" on public.<t>;
-- delete from public.<t> where source_id is not null;          -- lignes de lien
-- delete from public.<t> where chapter_id is null;             -- lignes de modèle
-- alter table public.<t> drop column source_id, drop column template_id,
--   drop column retired_at, drop column hidden;
-- alter table public.<t> alter column chapter_id set not null;
-- -- 2) Puis chapter_sections, même chose (sans retired_at ni hidden).
-- -- 3) Enfin :
-- drop function if exists public.modele_lien_remplir();
-- drop function if exists public.modele_lien_garde();
-- drop function if exists public.modele_recopier();
-- drop function if exists public.modele_ajout_diffuse();
-- drop function if exists public.modele_retrait();
-- -- et restaurer orphan_chapter_documents sans le filtre `cd.source_id is null`.
-- ROLLBACK:END

-- ---------------------------------------------------------------------------
-- 1. Colonnes et contraintes
-- ---------------------------------------------------------------------------

-- Sections : retirer une section du modèle laisse aux chapitres leur section,
-- devenue la leur (SET NULL) — rien n'y est perdu.
alter table public.chapter_sections
	alter column chapter_id drop not null,
	add column template_id uuid references public.chapter_templates (id) on delete cascade,
	add column source_id uuid references public.chapter_sections (id) on delete set null,
	add constraint chapter_sections_un_proprietaire
		check (num_nonnulls(chapter_id, template_id) = 1),
	add constraint chapter_sections_lien_sur_chapitre
		check (source_id is null or chapter_id is not null),
	add constraint chapter_sections_id_template_unique unique (id, template_id);

create index idx_chapter_sections_template on public.chapter_sections (template_id, display_order);
create unique index chapter_sections_un_lien_par_chapitre
	on public.chapter_sections (chapter_id, source_id) where source_id is not null;

-- Les cinq tables d'éléments. `source_id` en RESTRICT : la base refuse de perdre
-- une ligne reliée (un document publié chez des élèves) en supprimant l'élément
-- du modèle ou le modèle ; on retire (`retired_at`), on archive.
do $$
declare
	t text;
begin
	foreach t in array array[
		'chapter_documents', 'chapter_checklist_items', 'chapter_exercises',
		'chapter_worksheets', 'chapter_series'
	] loop
		execute format($f$
			alter table public.%1$I
				alter column chapter_id drop not null,
				add column template_id uuid references public.chapter_templates (id) on delete cascade,
				add column source_id uuid references public.%1$I (id) on delete restrict,
				add column retired_at timestamptz,
				add column hidden boolean not null default false,
				add constraint %1$s_un_proprietaire
					check (num_nonnulls(chapter_id, template_id) = 1),
				add constraint %1$s_lien_sur_chapitre
					check (source_id is null or chapter_id is not null),
				add constraint %1$s_retrait_sur_modele
					check (retired_at is null or template_id is not null),
				add constraint %1$s_modele_jamais_publie
					check (template_id is null or published_at is null),
				add constraint %1$s_masque_non_publie
					check (not hidden or (chapter_id is not null and published_at is null)),
				add constraint %1$s_section_modele_fkey
					foreign key (section_id, template_id)
					references public.chapter_sections (id, template_id)
					on delete set null (section_id)
		$f$, t);
		execute format(
			'create index idx_%1$s_template on public.%1$I (template_id)', t);
		execute format(
			'create unique index %1$s_un_lien_par_chapitre on public.%1$I (chapter_id, source_id) where source_id is not null',
			t);
	end loop;
end;
$$;

-- Un même exercice, une même fiche, une même série : une fois par modèle, comme
-- une fois par chapitre.
create unique index chapter_exercises_un_par_modele
	on public.chapter_exercises (template_id, exercise_id) where template_id is not null;
create unique index chapter_worksheets_un_par_modele
	on public.chapter_worksheets (template_id, worksheet_id) where template_id is not null;
create unique index chapter_series_un_par_modele
	on public.chapter_series (template_id, series_id) where template_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Policies : le prof gère le contenu de SES modèles
-- ---------------------------------------------------------------------------
--
-- Les policies existantes passent par `class_chapters` : elles ne voient aucune
-- ligne de modèle (`chapter_id` vide), ni pour le prof ni pour l'élève. Celle-ci
-- s'y ajoute (permissive, donc en OU) et ne concerne QUE les lignes de modèle.

do $$
declare
	t text;
begin
	foreach t in array array[
		'chapter_sections', 'chapter_documents', 'chapter_checklist_items',
		'chapter_exercises', 'chapter_worksheets', 'chapter_series'
	] loop
		execute format($f$
			create policy "Teachers can manage content of their templates" on public.%1$I
				for all to authenticated
				using (
					template_id is not null
					and public.is_teacher_or_admin()
					and exists (
						select 1 from public.chapter_templates ct
						where ct.id = %1$I.template_id and ct.created_by = auth.uid()
					)
				)
				with check (
					template_id is not null
					and public.is_teacher_or_admin()
					and exists (
						select 1 from public.chapter_templates ct
						where ct.id = %1$I.template_id and ct.created_by = auth.uid()
					)
				)
		$f$, t);
	end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Déclencheurs du lien
-- ---------------------------------------------------------------------------
--
-- Chaque déclencheur reçoit en arguments les colonnes de CONTENU de sa table :
-- ce qui vient du modèle et ne se décide pas par classe. SECURITY INVOKER
-- partout : chaque lecture et chaque écriture passent par la RLS de l'appelant
-- (le prof, l'admin, ou le service pour la reprise des données).

-- 3a. Insérer une ligne de lien : le contenu, l'ordre et la section viennent du
-- modèle. Refus si la source n'est pas un élément de modèle lisible, ou si le
-- chapitre n'est pas lié (non détaché) à ce modèle.
create function public.modele_lien_remplir()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_src jsonb;
	v_section uuid;
	v_cles text[] := tg_argv || array['display_order', 'section_order'];
begin
	if new.source_id is null then
		return new;
	end if;

	execute format('select to_jsonb(s) from public.%I s where s.id = $1', tg_table_name)
		into v_src using new.source_id;

	if v_src is null or v_src->>'template_id' is null then
		raise exception 'Lien refusé : la source n''est pas un élément de modèle.'
			using errcode = 'foreign_key_violation';
	end if;

	if not exists (
		select 1 from public.chapter_template_instantiations i
		where i.chapter_id = new.chapter_id
			and i.template_id = (v_src->>'template_id')::uuid
			and not i.is_detached
	) then
		raise exception 'Lien refusé : ce chapitre n''est pas lié à ce modèle.'
			using errcode = 'insufficient_privilege';
	end if;

	new := jsonb_populate_record(
		new,
		(select jsonb_object_agg(k, v_src->k) from unnest(v_cles) k where v_src ? k)
	);

	-- La section du modèle → la ligne de lien de cette section dans le chapitre.
	if tg_table_name <> 'chapter_sections' and v_src->>'section_id' is not null then
		select s.id into v_section
		from public.chapter_sections s
		where s.chapter_id = new.chapter_id
			and s.source_id = (v_src->>'section_id')::uuid;
		new := jsonb_populate_record(new, jsonb_build_object('section_id', v_section));
	end if;

	return new;
end;
$$;

-- 3b. Une ligne de lien ne se retouche pas à la main (Q2) : ni son contenu, ni sa
-- source. Elle peut se DÉTACHER (source remise à vide), et c'est alors seulement
-- que son contenu peut changer (fichier recopié chez le chapitre). Les
-- recopies faites par 3c passent (profondeur de déclencheur > 1).
create function public.modele_lien_garde()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_old jsonb := to_jsonb(old);
	v_new jsonb := to_jsonb(new);
begin
	if pg_trigger_depth() > 1 then
		return new;
	end if;

	if old.source_id is null and new.source_id is not null then
		raise exception 'Lien refusé : un élément propre au chapitre ne se relie pas à un modèle.'
			using errcode = 'check_violation';
	end if;

	if old.source_id is not null and new.source_id is not null then
		if new.source_id <> old.source_id or exists (
			select 1 from unnest(tg_argv) k where v_new->k is distinct from v_old->k
		) then
			raise exception 'Élément du modèle : il se corrige dans le modèle, pas dans le chapitre.'
				using errcode = 'check_violation';
		end if;
	end if;

	return new;
end;
$$;

-- 3c. Corriger un élément du modèle le corrige dans chaque chapitre lié.
create function public.modele_recopier()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_set text;
begin
	select string_agg(format('%1$I = r.%1$I', k), ', ') into v_set from unnest(tg_argv) k;
	execute format(
		'update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.source_id = $2',
		tg_table_name, v_set, tg_table_name
	) using to_jsonb(new), new.id;
	return null;
end;
$$;

-- 3d. Ajouter un élément au modèle : une ligne de lien, non publiée, dans chaque
-- chapitre lié et non détaché. Un chapitre qui a déjà cet exercice, cette fiche
-- ou cette série en propre garde la sienne.
create function public.modele_ajout_diffuse()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
	execute format(
		'insert into public.%I (chapter_id, source_id)
		 select i.chapter_id, $1 from public.chapter_template_instantiations i
		 where i.template_id = $2 and not i.is_detached
		 on conflict do nothing',
		tg_table_name
	) using new.id, new.template_id;
	return null;
end;
$$;

-- 3e. Retirer un élément du modèle : il disparaît des chapitres où il n'était
-- pas publié, et reste chez les élèves qui l'avaient reçu.
create function public.modele_retrait()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
	execute format(
		'delete from public.%I where source_id = $1 and (published_at is null or published_at > now())',
		tg_table_name
	) using new.id;
	return null;
end;
$$;

do $$
declare
	r record;
begin
	for r in
		select * from (values
			('chapter_sections', array['title']),
			('chapter_documents', array['title', 'description', 'source_type', 'storage_path',
				'file_name', 'file_size', 'mime_type', 'google_drive_url', 'google_file_id',
				'thumbnail_url']),
			('chapter_checklist_items', array['content', 'description']),
			('chapter_exercises', array['exercise_id']),
			('chapter_worksheets', array['worksheet_id']),
			('chapter_series', array['series_id', 'form'])
		) as v(t, cols)
	loop
		execute format(
			'create trigger modele_lien_remplir before insert on public.%I
			 for each row when (new.source_id is not null)
			 execute function public.modele_lien_remplir(%s)',
			r.t, (select string_agg(quote_literal(c), ', ') from unnest(r.cols) c));
		execute format(
			'create trigger modele_lien_garde before update on public.%I
			 for each row when (old.source_id is not null or new.source_id is not null)
			 execute function public.modele_lien_garde(%s)',
			r.t, (select string_agg(quote_literal(c), ', ') from unnest(r.cols) c));
		execute format(
			'create trigger modele_recopier after update on public.%I
			 for each row when (new.template_id is not null)
			 execute function public.modele_recopier(%s)',
			r.t, (select string_agg(quote_literal(c), ', ') from unnest(r.cols) c));
		execute format(
			'create trigger modele_ajout_diffuse after insert on public.%I
			 for each row when (new.template_id is not null)
			 execute function public.modele_ajout_diffuse()',
			r.t);
		if r.t <> 'chapter_sections' then
			execute format(
				'create trigger modele_retrait after update of retired_at on public.%I
				 for each row when (new.retired_at is not null and old.retired_at is null)
				 execute function public.modele_retrait()',
				r.t);
		end if;
	end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Lier un chapitre à un modèle
-- ---------------------------------------------------------------------------
--
-- Une ligne de lien par élément non retiré du modèle, sections d'abord (les
-- éléments y trouvent leur place). Rejouable : ce qui est déjà relié l'est une
-- fois. Sert à l'instanciation et à la reprise du chapitre d'origine (déjà
-- rattaché au modèle, option B du 2026-09-14). SECURITY INVOKER : le prof ne lie
-- que ses chapitres à ses modèles.
create function public.link_chapter_to_template(p_chapter_id uuid, p_template_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_inst public.chapter_template_instantiations;
	t text;
begin
	select * into v_inst from public.chapter_template_instantiations
	where chapter_id = p_chapter_id;

	if v_inst.id is null then
		insert into public.chapter_template_instantiations
			(template_id, template_version, chapter_id, current_template_version)
		select ct.id, ct.current_version, p_chapter_id, ct.current_version
		from public.chapter_templates ct
		where ct.id = p_template_id;
		if not found then
			raise exception 'Modèle introuvable.' using errcode = 'no_data_found';
		end if;
	elsif v_inst.template_id is distinct from p_template_id or v_inst.is_detached then
		raise exception 'Ce chapitre est déjà rattaché à un autre modèle, ou détaché.'
			using errcode = 'check_violation';
	end if;

	insert into public.chapter_sections (chapter_id, source_id)
	select p_chapter_id, s.id from public.chapter_sections s
	where s.template_id = p_template_id
	on conflict do nothing;

	foreach t in array array[
		'chapter_documents', 'chapter_checklist_items', 'chapter_exercises',
		'chapter_worksheets', 'chapter_series'
	] loop
		execute format(
			'insert into public.%I (chapter_id, source_id)
			 select $1, e.id from public.%I e
			 where e.template_id = $2 and e.retired_at is null
			 on conflict do nothing',
			t, t
		) using p_chapter_id, p_template_id;
	end loop;
end;
$$;

revoke all on function public.link_chapter_to_template(uuid, uuid) from public, anon;
grant execute on function public.link_chapter_to_template(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Stockage : les fichiers d'un modèle, `templates/<template_id>/…`
-- ---------------------------------------------------------------------------
--
-- Symétriques des règles professeur de `chapters/…`, sur SES modèles. Aucune
-- règle élève : le serveur servira ces fichiers après la garde de publication.

create policy "Teachers can read template documents" on storage.objects
	for select to authenticated
	using (
		bucket_id = 'chapter-documents'
		and (string_to_array(name, '/'))[1] = 'templates'
		and public.is_teacher_or_admin()
		and exists (
			select 1 from public.chapter_templates ct
			where ct.id::text = (string_to_array(objects.name, '/'))[2]
				and ct.created_by = auth.uid()
		)
	);

create policy "Teachers can upload template documents" on storage.objects
	for insert to authenticated
	with check (
		bucket_id = 'chapter-documents'
		and (string_to_array(name, '/'))[1] = 'templates'
		and public.is_teacher_or_admin()
		and exists (
			select 1 from public.chapter_templates ct
			where ct.id::text = (string_to_array(objects.name, '/'))[2]
				and ct.created_by = auth.uid()
		)
	);

create policy "Teachers can update template documents" on storage.objects
	for update to authenticated
	using (
		bucket_id = 'chapter-documents'
		and (string_to_array(name, '/'))[1] = 'templates'
		and public.is_teacher_or_admin()
		and exists (
			select 1 from public.chapter_templates ct
			where ct.id::text = (string_to_array(objects.name, '/'))[2]
				and ct.created_by = auth.uid()
		)
	);

create policy "Teachers can delete template documents" on storage.objects
	for delete to authenticated
	using (
		bucket_id = 'chapter-documents'
		and (string_to_array(name, '/'))[1] = 'templates'
		and public.is_teacher_or_admin()
		and exists (
			select 1 from public.chapter_templates ct
			where ct.id::text = (string_to_array(objects.name, '/'))[2]
				and ct.created_by = auth.uid()
		)
	);

-- ---------------------------------------------------------------------------
-- 6. Supprimer un chapitre : une ligne de lien n'a pas de fichier à elle
-- ---------------------------------------------------------------------------
--
-- Identique à la version en production (vérifié le 2026-10-14), plus le filtre
-- `cd.source_id is null` : le fichier d'un lien appartient au modèle.
create or replace function public.orphan_chapter_documents()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_teacher_id UUID;
BEGIN
    -- Mono-teacher: attribute orphaned documents to the sole teacher.
    SELECT id INTO v_teacher_id
    FROM public.profiles
    WHERE role = 'teacher'
    LIMIT 1;

    -- Only process uploaded documents (not Google Drive links), and never a
    -- template link: its file belongs to the template.
    INSERT INTO public.orphaned_documents (
        original_document_id,
        original_chapter_id,
        original_class_id,
        teacher_id,
        title,
        file_name,
        mime_type,
        file_size,
        orphaned_storage_path,
        original_created_at
    )
    SELECT
        cd.id,
        cd.chapter_id,
        ch.class_id,
        v_teacher_id,
        cd.title,
        cd.file_name,
        cd.mime_type,
        cd.file_size,
        'orphaned-documents/' || v_teacher_id || '/' || cd.id || '/' || cd.file_name,
        cd.created_at
    FROM public.chapter_documents cd
    JOIN public.class_chapters ch ON ch.id = cd.chapter_id
    WHERE cd.chapter_id = OLD.id
      AND cd.source_type = 'upload'
      AND cd.storage_path IS NOT NULL
      AND cd.source_id IS NULL;

    RETURN OLD;
END;
$function$;
