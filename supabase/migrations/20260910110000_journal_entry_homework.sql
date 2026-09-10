-- ============================================================================
-- Cahier de texte : plusieurs travaux à faire, chacun avec son échéance
-- ============================================================================
-- Jusqu'ici une séance ne portait QU'UN travail : `class_journal_entries`
-- .homework_content + .homework_due_date. Un professeur qui donne un exercice
-- pour jeudi et un DM pour la semaine suivante devait tout écrire dans le même
-- bloc, sous une seule date — donc mentir sur l'une des deux échéances.
--
-- QUESTION D'ACCÈS (posée et tranchée avec David) : **personne ne lit rien de
-- nouveau.** Un travail est lisible exactement par qui lit déjà la séance qui le
-- porte :
--   * professeur / admin                → tout ;
--   * élève inscrit dans la classe      → seulement si la séance est PUBLIÉE et
--                                          sa date PASSÉE (règle inchangée) ;
--   * visiteur avec le lien de partage  → mêmes séances, via la fonction
--                                          SECURITY DEFINER existante ;
--   * `anon` sans lien                  → rien.
-- Cette table ne contient aucune donnée d'élève : un texte de devoir et une
-- date. Le risque n'est pas RGPD-mineurs, c'est qu'un contenu de classe devienne
-- lisible sans lien — ce que les REVOKE ci-dessous ferment.
--
-- ADDITIVE : `homework_content` et `homework_due_date` sont CONSERVÉES, non
-- lues, non écrites. Aucune séance en production ne les utilise (1 séance en
-- base, sans travail) ; leur suppression fera l'objet d'une migration dédiée,
-- après inventaire des usages — une quinzaine de fichiers les citent, dont des
-- schémas Zod et des chaînes PostgREST invisibles au typecheck.
--
-- CE QUI N'EST VOLONTAIREMENT PAS CONTRAINT ICI : « l'échéance tombe un jour où
-- la classe a cours ». Cette règle dépend de `class_schedules` et de
-- `school_holidays`, qui changent. Un trigger de validation rendrait une ligne
-- parfaitement valide impossible à modifier le jour où le professeur déplace un
-- cours ou ajoute des vacances. Elle vit donc côté serveur
-- (`$lib/utils/class-sessions`), qui la rejoue à chaque enregistrement.
--
-- ROLLBACK :
--   drop function if exists public.set_journal_entry_homework(uuid, jsonb);
--   drop table if exists public.journal_entry_homework;
--   -- puis restaurer la version précédente de
--   -- public.get_class_journal_by_share_token(text), qui est dans
--   -- 20260908150000_class_journal_share_tokens.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. La table
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entry_homework (
	id uuid primary key default gen_random_uuid(),
	entry_id uuid not null references public.class_journal_entries(id) on delete cascade,
	-- HTML de l'éditeur riche, comme `class_journal_entries.lesson_content` :
	-- les citations [[exercice:…]] y sont donc possibles, et alimentent la
	-- couverture du programme au même titre que le contenu de séance.
	content text not null,
	-- NULL = classe sans emploi du temps renseigné. C'est le SEUL cas : dès que
	-- l'emploi du temps existe, le serveur résout une échéance vide au prochain
	-- cours plutôt que d'écrire NULL. Trois des quatre classes actives n'ont
	-- aucun emploi du temps aujourd'hui, ce cas n'a rien de théorique.
	due_date date,
	display_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- Un travail sans texte n'est pas un travail : il s'afficherait comme une
	-- puce vide chez l'élève, avec une échéance et rien à faire.
	constraint journal_entry_homework_content_not_blank check (btrim(content) <> ''),
	-- Même borne que `MAX_CONTENT_LENGTH` côté Zod. La liste est plafonnée à 50
	-- travaux, mais sans borne par travail une séance pèserait autant qu'on veut
	-- — et c'est le visiteur anonyme du lien de partage qui la retélécharge
	-- entièrement, sans cache ni pagination.
	constraint journal_entry_homework_content_length check (char_length(content) <= 50000)
);

comment on table public.journal_entry_homework is
	'Travaux à faire d''une séance du cahier de texte : un texte et une échéance par travail. Remplace le couple class_journal_entries.homework_content / homework_due_date, conservé mais inerte.';

comment on column public.journal_entry_homework.due_date is
	'Jour de rendu. Le serveur n''y écrit que des dates où la classe a cours (emploi du temps hors vacances) ; NULL uniquement quand la classe n''a pas d''emploi du temps renseigné.';

-- ---------------------------------------------------------------------------
-- 2. Index
-- ---------------------------------------------------------------------------
-- Lecture d'une séance : toujours par entrée, toujours dans l'ordre d'affichage.
create index if not exists idx_journal_entry_homework_entry
	on public.journal_entry_homework (entry_id, display_order);

-- « Qu'est-ce qui est à rendre dans les jours qui viennent ? » — la requête de
-- la vue élève, qui filtre sur une plage d'échéances.
create index if not exists idx_journal_entry_homework_due
	on public.journal_entry_homework (due_date)
	where due_date is not null;

-- ---------------------------------------------------------------------------
-- 3. updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists update_journal_entry_homework_updated_at on public.journal_entry_homework;
create trigger update_journal_entry_homework_updated_at
	before update on public.journal_entry_homework
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. RLS — le périmètre exact de la séance porteuse
-- ---------------------------------------------------------------------------
alter table public.journal_entry_homework enable row level security;

drop policy if exists "Teachers manage journal entry homework" on public.journal_entry_homework;
create policy "Teachers manage journal entry homework"
	on public.journal_entry_homework for all
	to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- ⚠️ Deux policies SELECT permissives se combinent en OU : celle-ci ÉLARGIT la
-- lecture aux élèves, elle ne restreint pas celle du professeur.
--
-- Les trois conditions sont recopiées de la policy de `class_journal_entries`
-- (« Students can view published journal entries ») et doivent le rester : un
-- élève qui lirait le travail d'une séance non publiée ou future connaîtrait le
-- programme d'un contrôle avant l'heure.
drop policy if exists "Students read homework of visible entries" on public.journal_entry_homework;
create policy "Students read homework of visible entries"
	on public.journal_entry_homework for select
	to authenticated
	using (
		exists (
			select 1
			from public.class_journal_entries e
			join public.class_members m on m.class_id = e.class_id
			where e.id = journal_entry_homework.entry_id
				and e.is_published
				and e.entry_date <= current_date
				and m.student_id = auth.uid()
		)
	);

-- ---------------------------------------------------------------------------
-- 5. Droits
-- ---------------------------------------------------------------------------
-- Le baseline pose `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES` pour `anon`
-- ET `authenticated` (20260616220000:46144-46145) : une table neuve naît donc
-- ouverte aux deux. `revoke from public` n'y change rien — PUBLIC est un
-- pseudo-rôle, pas l'union des rôles — et `ALL` inclut TRUNCATE, qui IGNORE la
-- RLS. Les trois REVOKE sont donc nécessaires, pas redondants.
revoke all on public.journal_entry_homework from public, anon, authenticated;
grant select, insert, update, delete on public.journal_entry_homework to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Écriture atomique de la liste
-- ---------------------------------------------------------------------------
-- Enregistrer la liste des travaux, c'est remplacer l'ancienne : un DELETE puis
-- un INSERT. Le client Supabase n'a pas de transaction — un échec réseau entre
-- les deux effacerait le travail de la séance sans le réécrire. D'où cette
-- fonction, où les deux opérations vivent dans la même transaction implicite.
--
-- SECURITY INVOKER (le défaut, explicité ici pour qu'on n'en doute pas) : la
-- RLS ci-dessus s'applique intégralement. Un élève qui appellerait cette
-- fonction supprimerait zéro ligne et se verrait refuser l'insertion.
create or replace function public.set_journal_entry_homework(p_entry_id uuid, p_items jsonb)
returns setof public.journal_entry_homework
language plpgsql
security invoker
set search_path = public
as $$
begin
	if p_items is null or jsonb_typeof(p_items) <> 'array' then
		raise exception 'La liste des travaux doit être un tableau JSON'
			using errcode = '22023';
	end if;

	-- Borne de bon sens : une séance ne porte pas cinquante travaux. Sans elle,
	-- un appel malveillant écrit autant de lignes qu'il veut.
	if jsonb_array_length(p_items) > 50 then
		raise exception 'Trop de travaux pour une séance (maximum 50)'
			using errcode = '22023';
	end if;

	delete from public.journal_entry_homework where entry_id = p_entry_id;

	-- L'ordre du tableau EST l'ordre d'affichage : `with ordinality` évite au
	-- client d'avoir à numéroter lui-même, et donc de se tromper.
	return query
	insert into public.journal_entry_homework (entry_id, content, due_date, display_order)
	select
		p_entry_id,
		item->>'content',
		nullif(item->>'due_date', '')::date,
		(ord - 1)::integer
	from jsonb_array_elements(p_items) with ordinality as t(item, ord)
	returning *;
end;
$$;

comment on function public.set_journal_entry_homework(uuid, jsonb) is
	'Remplace la liste des travaux d''une séance en une seule transaction (DELETE + INSERT). SECURITY INVOKER : la RLS de journal_entry_homework s''applique. L''ordre du tableau devient display_order.';

revoke all on function public.set_journal_entry_homework(uuid, jsonb) from public, anon;
grant execute on function public.set_journal_entry_homework(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Le lien de partage voit les travaux
-- ---------------------------------------------------------------------------
-- Même fonction qu'avant, mêmes gardes, une clé de plus dans le JSON. Les
-- anciennes clés `homework_content` / `homework_due_date` sont conservées le
-- temps que la page publique bascule : la fonction et la page se déploient
-- séparément, et l'ordre entre les deux ne doit rien casser.
--
-- SECURITY DEFINER contourne la RLS de `journal_entry_homework` : c'est assumé
-- et sans effet de bord, parce que les travaux remontés sont ceux — et
-- seulement ceux — des séances que la fonction retenait déjà, à savoir publiées
-- et non futures.
create or replace function public.get_class_journal_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_token record;
	v_result jsonb;
begin
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;

	select t.id, t.class_id into v_token
	from public.class_journal_share_tokens t
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now());

	if not found then
		return null;
	end if;

	select jsonb_build_object(
		'class_name', c.name,
		'class_grade', c.grade,
		'entries', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', e.id,
					'entry_date', e.entry_date,
					'lesson_content', e.lesson_content,
					'homework_content', e.homework_content,
					'homework_due_date', e.homework_due_date,
					'homework', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', h.id,
								'content', h.content,
								'due_date', h.due_date
							)
							order by h.display_order, h.created_at
						)
						from public.journal_entry_homework h
						where h.entry_id = e.id
					), '[]'::jsonb)
				)
				order by e.entry_date desc
			)
			from public.class_journal_entries e
			where e.class_id = v_token.class_id
				and e.is_published
				and e.entry_date <= current_date
		), '[]'::jsonb)
	) into v_result
	from public.classes c
	where c.id = v_token.class_id
		and c.is_active;

	if v_result is null then
		return null;
	end if;

	update public.class_journal_share_tokens
	set access_count = access_count + 1,
		last_accessed_at = now()
	where id = v_token.id;

	return v_result;
end;
$$;

comment on function public.get_class_journal_by_share_token(text) is
	'Résout un token de partage en cahier de texte lisible : entrées publiées et non futures d''une classe, avec leurs travaux à faire. SECURITY DEFINER car l''appelant est anonyme par construction. Renvoie NULL sans distinguer révoqué / expiré / inexistant.';

revoke all on function public.get_class_journal_by_share_token(text) from public;
grant execute on function public.get_class_journal_by_share_token(text) to anon, authenticated;
