-- L'année courante se déduit des dates, pas d'un drapeau
-- ======================================================
--
-- `school_years.is_active` était censé désigner « l'année en cours ». Deux
-- défauts, et le second est structurel :
--
-- 1. RIEN NE LE POSE JAMAIS. Il n'existe aucun geste « démarrer l'année » :
--    seulement une case à cocher dans le formulaire de création d'année.
--    Personne ne pense à la décocher en juin, ni à cocher la suivante en
--    septembre. Les deux années enregistrées sont d'ailleurs cochées.
--
-- 2. IL NE PEUT PAS DIRE LA VÉRITÉ EN JUILLET. L'année écoulée est finie, la
--    suivante n'a pas commencé : un drapeau oui/non ne sait pas exprimer ça.
--    Soit on laisse l'ancienne active alors qu'elle est terminée, soit on n'a
--    plus AUCUNE année active — et `getActiveSchoolYear` ne trouve rien,
--    silencieusement, ses deux appelants avalant l'erreur par un
--    `.catch(() => null)`.
--
-- LA RÈGLE : l'année qui CONTIENT aujourd'hui ; à défaut, la plus récente
-- déjà commencée. Déterministe, sans entretien, et elle donne en juillet la
-- dernière année vécue plutôt que rien.
--
-- AUCUN CHANGEMENT OBSERVABLE aujourd'hui : vérifié en production, la règle
-- rend la même année que le drapeau pour les deux écoles.
--
-- `security invoker` VOLONTAIREMENT : la RLS de `school_years` s'applique
-- donc normalement — un élève ne verra jamais l'année d'une autre école à
-- travers cette fonction.
--
-- `is_active` N'EST PAS SUPPRIMÉE. Elle reste pour l'affichage et d'éventuels
-- usages manuels ; elle cesse simplement d'être le critère de « l'année
-- courante ». La retirer demanderait de reprendre le formulaire d'année, ce
-- qui dépasse ce correctif.
--
-- ROLLBACK : drop function public.current_school_year(uuid);
--            et rétablir les filtres `is_active` dans `warnings.ts`.

create or replace function public.current_school_year(p_school_id uuid)
returns setof public.school_years
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $function$
	select sy.*
	from public.school_years sy
	where sy.school_id = p_school_id
		and sy.start_date <= current_date
	order by
		-- Celle qui contient aujourd'hui d'abord…
		(current_date between sy.start_date and sy.end_date) desc,
		-- … sinon la plus récente déjà commencée.
		sy.start_date desc
	limit 1;
$function$;

comment on function public.current_school_year(uuid) is
	'L''année scolaire courante d''une école : celle qui contient aujourd''hui, sinon la plus récente déjà commencée. Ne consulte pas `is_active`, que rien ne tient à jour.';

revoke execute on function public.current_school_year(uuid) from public;
revoke execute on function public.current_school_year(uuid) from anon;
grant execute on function public.current_school_year(uuid) to authenticated;
