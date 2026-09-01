-- ============================================================================
-- Cahier de texte : rattacher des questions et des évaluations à une séance
-- ============================================================================
-- Le cahier de texte ne savait référencer que des exercices, alors que le
-- travail d'une séance passe aussi par le système de questions — une question
-- seule, ou une évaluation qui en rassemble plusieurs. Sans ces deux types, ce
-- travail n'apparaît nulle part dans le suivi du programme.
--
-- ON DELETE CASCADE, et non SET NULL comme `exercise_id` : le CHECK de forme
-- exige la colonne correspondant au `kind`, or SET NULL est un UPDATE, que le
-- CHECK réévalue. Supprimer un exercice référencé par une séance échoue donc
-- aujourd'hui sur une violation de contrainte (dette pré-existante, hors sujet
-- ici). CASCADE est la seule action qui reste cohérente avec la forme.
--   ⚠️ La couverture `auto` des séances concernées n'est alors plus
--   réconciliée — rien ne le fait à la suppression, pour les exercices non plus.
-- ============================================================================

alter table public.journal_entry_activities
	add column question_template_id uuid
		references public.question_templates(id) on delete cascade,
	add column assessment_id uuid
		references public.assessments(id) on delete cascade;

alter table public.journal_entry_activities
	drop constraint journal_entry_activities_valid_kind,
	add constraint journal_entry_activities_valid_kind
		check (kind = any (array['exercise', 'textbook', 'course', 'question', 'assessment'])),
	drop constraint journal_entry_activities_kind_shape,
	add constraint journal_entry_activities_kind_shape check (
		(kind = 'exercise' and exercise_id is not null)
		or (kind = 'course' and (chapter_id is not null or label is not null))
		or (kind = 'textbook' and textbook_ref is not null)
		or (kind = 'question' and question_template_id is not null)
		or (kind = 'assessment' and assessment_id is not null)
	);

create index idx_journal_entry_activities_question
	on public.journal_entry_activities (question_template_id)
	where question_template_id is not null;

create index idx_journal_entry_activities_assessment
	on public.journal_entry_activities (assessment_id)
	where assessment_id is not null;

-- ---------------------------------------------------------------------------
-- Résolution évaluation → points du programme
-- ---------------------------------------------------------------------------
-- Une évaluation ne référence pas ses questions : `categories` est un tableau
-- jsonb de quadruplets (thème, domaine, sous-domaine, niveau), et c'est l'index
-- unique `idx_question_templates_unique_category` qui garantit qu'un quadruplet
-- ne désigne qu'un seul template publié. La jointure se fait donc sur ces
-- quatre colonnes, et un quadruplet sans template publié ne rapporte rien.
--
-- `security invoker` : le prof lit déjà ses évaluations, les templates et leurs
-- tags par ses propres politiques. Aucune raison de contourner RLS ici.
--
-- Le niveau est comparé en texte plutôt que casté : `categories` n'est
-- contraint par rien, et un `level` non numérique ferait échouer la
-- réconciliation entière au lieu d'ignorer la seule catégorie fautive.
create or replace function public.assessment_curriculum_points(p_assessment_ids uuid[])
returns table (assessment_id uuid, point_id uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
	select distinct a.id, qtp.point_id
	from public.assessments a
	cross join lateral jsonb_array_elements(
		case when jsonb_typeof(a.categories) = 'array' then a.categories else '[]'::jsonb end
	) as c(item)
	join public.question_templates t
		on t.status = 'published'
		and t.theme = c.item -> 'category' ->> 'theme'
		and t.domain = c.item -> 'category' ->> 'domain'
		and coalesce(t.subdomain, '') = coalesce(c.item -> 'category' ->> 'subdomain', '')
		and t.level::text = c.item -> 'category' ->> 'level'
	join public.question_template_points qtp on qtp.template_id = t.id
	where a.id = any(p_assessment_ids);
$$;

comment on function public.assessment_curriculum_points(uuid[]) is
	'Points du programme couverts par des évaluations, via les templates publiés que désignent leurs catégories.';
