-- Une classe appartient à une année scolaire
-- ==========================================
--
-- Phase 1 de la bascule d'année — voir
-- `docs/wip/bascule-annee-scolaire-etat-des-lieux.md`.
--
-- `school_years` existait déjà, portait les trimestres et les vacances, et
-- servait au calendrier de séances du cahier de texte. Mais `classes` n'avait
-- aucune colonne vers cette table : `classes.is_active` tenait lieu de
-- rattachement à l'année, à la main. D'où ses deux sens contradictoires —
-- « pas encore ouverte » et « terminée » : il remplaçait un lien qui n'avait
-- jamais été posé.
--
-- CETTE MIGRATION NE CHANGE AUCUN ACCÈS. Rien ne lit encore `school_year_id`,
-- et `is_active` continue de gouverner exactement comme avant. C'est une
-- fondation, pas un changement de comportement.
--
-- LE RATTRAPAGE, en deux passes :
--
--   1. l'année de la même école qui CONTIENT la date de création ;
--   2. pour le reste, l'unique année de l'école — quand elle n'en a qu'une,
--      il n'y a pas d'ambiguïté à lever.
--
-- La seconde passe compte : `1SPE-TEST` a été créée le 2026-08-25, six jours
-- avant le début de l'année 2026-2027 de son école et deux mois après la fin
-- de la précédente. Elle tombe entre deux exercices, et un rattrapage par date
-- seule l'aurait laissée à NULL en silence. Son école ne comptant qu'une
-- année, la seconde passe la rattache sans hésiter.
--
-- Une classe SANS école reste sans année : aucune ne peut en être déduite.
-- Il n'y en a aucune en production, mais `classes.school_id` est nullable.
--
-- LA COLONNE RESTE NULLABLE. La rendre obligatoire viendra quand la création
-- de classe posera l'année d'elle-même — Phase 2. La contraindre maintenant
-- casserait toute création par une voie qui l'ignore encore.
--
-- ROLLBACK : alter table public.classes drop column school_year_id;

alter table public.classes
	add column if not exists school_year_id uuid references public.school_years(id) on delete set null;

comment on column public.classes.school_year_id is
	'L''année scolaire de la classe. Deux classes homonymes de deux années sont deux objets distincts. Nullable tant que la création ne la pose pas d''elle-même.';

-- Passe 1 : l'année qui contient la date de création.
update public.classes c
set school_year_id = sy.id
from public.school_years sy
where sy.school_id = c.school_id
	and c.school_year_id is null
	and c.created_at::date between sy.start_date and sy.end_date;

-- Passe 2 : l'unique année de l'école, pour les dates hors bornes.
update public.classes c
set school_year_id = sy.id
from public.school_years sy
where sy.school_id = c.school_id
	and c.school_year_id is null
	and (select count(*) from public.school_years s2 where s2.school_id = c.school_id) = 1;

-- Garde : une classe qui a une école DOIT avoir une année. Le cas restant
-- serait une école à plusieurs années dont aucune ne couvre la date — il
-- demande un arbitrage humain, pas un choix par défaut.
do $$
declare
	v_orphelines integer;
begin
	select count(*) into v_orphelines
	from public.classes c
	where c.school_id is not null
		and c.school_year_id is null;

	if v_orphelines > 0 then
		raise exception
			'Rattrapage incomplet : % classe(s) ont une école mais aucune année. Leur école compte plusieurs années dont aucune ne couvre leur date de création — rattacher à la main avant de rejouer.',
			v_orphelines;
	end if;
end $$;

-- L'index suit l'usage à venir : « les classes de l'année courante ».
create index if not exists idx_classes_school_year
	on public.classes (school_year_id)
	where school_year_id is not null;
