-- L'élève garde SES signalements d'erreur, même archivé
-- =====================================================
--
-- Depuis 20260912090000, un élève archivé perd l'accès aux fiches de la classe
-- qu'il a quittée — c'est voulu. Mais `GET /api/student/reports` affichait ses
-- signalements en joignant `worksheet_exercises`, `worksheets` et
-- `worksheet_assignments` en `!inner`, ce qui exige que ces lignes soient
-- VISIBLES. Sa liste se vidait donc en silence, emportant la trace de ce qu'il
-- avait signalé et des réponses que le professeur lui avait faites.
--
-- La fiche appartient à la classe ; le signalement appartient à l'élève.
--
-- QUI GAGNE QUOI : un élève voit ses PROPRES signalements, avec le strict
-- contexte qui les rend lisibles — titre de la fiche, numéro de l'exercice,
-- titre du devoir. Rien de plus : ni l'énoncé, ni les exercices, ni la fiche
-- elle-même, qui restent fermés. Et rien des signalements d'autrui.
--
-- POURQUOI UNE FONCTION plutôt qu'un élargissement de policy : rouvrir
-- `worksheets` à l'élève archivé lui rendrait la fiche ENTIÈRE. Ici la
-- projection est fixée par la signature : trois colonnes de contexte, pas une
-- de plus.
--
-- ⚠️ `security definer` contourne la RLS : la clause `r.student_id =
-- auth.uid()` est la SEULE garde, et elle doit le rester. Un `auth.uid()` nul
-- (rôle anon) ne correspond à aucun élève et ne rend donc rien.
--
-- ROLLBACK : drop function public.get_my_error_reports();
--            et rétablir les trois `!inner` dans la requête PostgREST.

create or replace function public.get_my_error_reports()
returns table (
	id uuid,
	assignment_id uuid,
	worksheet_exercise_id uuid,
	exercise_position integer,
	worksheet_id uuid,
	worksheet_title text,
	assignment_title text,
	description text,
	status text,
	response text,
	created_at timestamptz,
	updated_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	select
		r.id,
		r.assignment_id,
		r.worksheet_exercise_id,
		we.position as exercise_position,
		we.worksheet_id,
		w.title as worksheet_title,
		wa.title as assignment_title,
		r.description,
		r.status,
		r.response,
		r.created_at,
		r.updated_at
	from public.worksheet_error_reports r
	join public.worksheet_exercises we on we.id = r.worksheet_exercise_id
	join public.worksheets w on w.id = we.worksheet_id
	join public.worksheet_assignments wa on wa.id = r.assignment_id
	where r.student_id = auth.uid()
	order by r.created_at desc
	-- Borne DURE. L'endpoint filtre et pagine en mémoire, donc les plafonds Zod
	-- (`limit <= 50`) ne bornent plus le travail de la base : sans cette ligne,
	-- un élève qui multiplie les signalements se fabrique son propre déni de
	-- service. Le commentaire « quelques dizaines au plus » décrit l'usage
	-- attendu, pas une limite.
	limit 500;
$function$;

comment on function public.get_my_error_reports() is
	'Les signalements de l''élève connecté, avec le seul contexte qui les rend lisibles. Reste accessible après archivage de son adhésion : le signalement est sa donnée, la fiche est celle de la classe.';

-- `authenticated` seulement : un visiteur anonyme n'a pas de signalements, et
-- la fonction n'a pas à lui être exposée.
-- `revoke ... from public` ne retire PAS un grant nominatif : c'est la cause
-- racine de l'audit d'août 2026. On nomme donc `anon` explicitement, au lieu
-- de compter sur l'ACL par défaut du rôle qui applique la migration.
revoke execute on function public.get_my_error_reports() from public;
revoke execute on function public.get_my_error_reports() from anon;
grant execute on function public.get_my_error_reports() to authenticated;
