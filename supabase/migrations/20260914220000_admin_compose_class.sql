-- Composer une classe, en déplaçant l'élève d'école si besoin
-- ============================================================
--
-- La composition d'une classe (`/api/admin/compose-class`) était bornée à
-- l'école de destination. Or le cas réel de cette année est justement
-- inter-écoles : reprendre d'anciens élèves du Lycée Voltaire dans une école
-- « Cours particuliers ».
--
-- POURQUOI DÉPLACER LE PROFIL, ET NON CONTOURNER LA FRONTIÈRE. Les
-- fonctionnalités de CLASSE (fiches, exercices, salon, kanban) se rattachent à
-- `classes`. Mais les fonctionnalités d'ÉCOLE lisent `profiles.school_id` :
--
--   * policy « Students can read their school periods »  → academic_periods
--   * policy « Students can read their school years »    → school_years
--   * policy « marketplace_listings_select_same_school » → le marché
--
-- Inscrire un élève dans une classe de l'école B en laissant son profil sur
-- l'école A le laisserait à moitié cassé : ses fiches marcheraient, mais il
-- verrait le calendrier, les trimestres et le marché de A. Déplacer le profil
-- n'est donc pas un contournement de la frontière — c'est ce qui la garde
-- cohérente, une seule école par élève.
--
-- POURQUOI UNE FONCTION. Deux écritures doivent tenir ou échouer ensemble. Si
-- l'inscription passait et le déplacement échouait, on fabriquerait
-- précisément l'état à moitié cassé ci-dessus. Postgres sait faire ça ; le
-- client Supabase, non.
--
-- Accès — posé et tranché par David le 2026-09-14 :
--   L'élève déplacé voit le calendrier, les trimestres et le marché de sa
--   NOUVELLE école, et cesse de voir ceux de l'ancienne. Il ne gagne rien
--   d'autre : les fiches et le salon suivent la classe. Ses anciennes
--   adhésions restent archivées, son historique intact.
--   La fonction elle-même est réservée aux admins ; aucun élève ne peut
--   l'appeler pour se déplacer lui-même.
--
-- Rollback :
--   drop function if exists public.admin_compose_class(uuid, uuid[]);
--   (l'API repasse alors à ses deux écritures séparées, bornées à une école)

create or replace function public.admin_compose_class(
	p_class_id uuid,
	p_student_ids uuid[]
)
returns table (enrolled integer, moved integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
	v_school_id uuid;
	v_is_active boolean;
	v_end_date date;
	v_enrolled integer;
	v_moved integer;
begin
	-- Réservé aux admins. Le garde vit DANS la fonction : elle est un point
	-- d'entrée privilégié, et ne peut pas dépendre de la route qui l'appelle.
	if not is_admin() then
		raise exception 'Réservé aux administrateurs' using errcode = '42501';
	end if;

	select c.school_id, c.is_active, sy.end_date
	  into v_school_id, v_is_active, v_end_date
	  from classes c
	  left join school_years sy on sy.id = c.school_year_id
	 where c.id = p_class_id;

	if not found then
		raise exception 'Classe de destination introuvable' using errcode = 'P0002';
	end if;

	-- Les mêmes invariants que l'API annonce à l'utilisateur, mais tenus ici :
	-- composer vers une classe close ou une année terminée fabriquerait des
	-- adhésions que plus rien ne gouverne.
	if not v_is_active then
		raise exception 'Classe archivée' using errcode = 'P0001';
	end if;

	if v_end_date is null then
		raise exception 'Classe sans année scolaire' using errcode = 'P0001';
	end if;

	if v_end_date < current_date then
		raise exception 'Année scolaire terminée' using errcode = 'P0001';
	end if;

	-- Déplacement d'école. Borné aux comptes d'ÉLÈVES : un identifiant de
	-- professeur ou d'admin glissé dans la liste ne doit pas voir son école
	-- réécrite.
	with deplaces as (
		update profiles p
		   set school_id = v_school_id,
		       updated_at = now()
		 where p.id = any(p_student_ids)
		   and p.role = 'student'
		   and p.school_id is distinct from v_school_id
		returning 1
	)
	select count(*)::integer into v_moved from deplaces;

	-- Inscription. `on conflict do nothing` sur la contrainte unique
	-- (class_id, student_id) : un élève déjà membre n'est pas dupliqué, et une
	-- adhésion ARCHIVÉE dans cette classe n'est pas réactivée — la réactiver
	-- serait une décision du professeur, pas un effet de bord de ce geste.
	with inscrits as (
		insert into class_members (student_id, class_id, status)
		select p.id, p_class_id, 'active'
		  from profiles p
		 where p.id = any(p_student_ids)
		   and p.role = 'student'
		on conflict (class_id, student_id) do nothing
		returning 1
	)
	select count(*)::integer into v_enrolled from inscrits;

	return query select v_enrolled, v_moved;
end;
$$;

comment on function public.admin_compose_class(uuid, uuid[]) is
	'Compose une classe : inscrit les élèves donnés et, si la classe appartient à une autre école, y déplace leur profil — les deux dans la même transaction, sans quoi on fabriquerait un élève inscrit dans une école et rattaché à une autre. Réservée aux admins.';

revoke all on function public.admin_compose_class(uuid, uuid[]) from public;
revoke all on function public.admin_compose_class(uuid, uuid[]) from anon;
grant execute on function public.admin_compose_class(uuid, uuid[]) to authenticated;
