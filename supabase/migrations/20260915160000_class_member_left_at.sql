-- Un élève qui a quitté la classe ne reçoit plus ce qu'on y distribue ensuite
-- ===========================================================================
--
-- La relecture rétroactive existe exprès : un élève parti en cours d'année doit
-- pouvoir relire ce qu'on lui avait donné. Elle était bornée par le bas
-- (« distribué après son arrivée »), par l'année scolaire, et par une extinction
-- douze mois après la fin de l'année — mais PAS par sa date de départ, faute de
-- la connaître : `class_members` ne portait que `joined_at` et `status`.
--
-- Conséquence : un élève archivé en décembre continuait de recevoir les fiches
-- distribuées en mars.
--
-- ACCÈS — qui pourra lire quoi, qu'il ne pouvait pas lire avant ?
--   PERSONNE. Cette migration ne fait que RESTREINDRE. Question posée à David le
--   2026-09-13 — « un élève qui quitte ta classe en décembre doit-il continuer à
--   voir les fiches que tu distribues en mars ? » — réponse : NON.
--
--   Et elle ne retire rien à personne aujourd'hui : les 77 adhésions archivées
--   en production gardent `left_at` à NULL (date de départ inconnue), ce qui
--   conserve exactement le comportement actuel pour elles. La borne ne
--   s'applique qu'aux départs postérieurs à cette migration, que le trigger
--   horodate. Mesuré le 2026-09-13 : 0 adhésion archivée dans une classe et une
--   année toutes deux actives, donc 0 accès modifié à l'application.
--
-- POURQUOI UN TRIGGER, et non l'écriture par les appelants : une colonne que
-- chaque chemin doit penser à écrire finit par être fausse là où on l'oublie —
-- et ici « fausse » voudrait dire « un ancien élève continue de recevoir ».
-- Le trigger la rend vraie quel que soit le chemin, présent ou futur.
--
-- ⚠️ PORTÉE RÉELLE AUJOURD'HUI — à lire avant de croire que le problème est
-- réglé. Vérifié le 2026-09-13 : `src/` ne contient AUCUN `.update()` sur
-- `class_members` et AUCUNE écriture de `status = 'archived'`. Les trois seules
-- écritures sont deux INSERT (ajout à une classe, import d'élèves) et un
-- DELETE (`api/admin/remove-from-class`). Seule la fonction SQL
-- `close_school_year` archive, et elle n'est appelée par aucune route.
--
-- Donc : cette migration est CORRECTE mais INERTE tant que retirer un élève
-- d'une classe le SUPPRIME au lieu de l'archiver. Et ce DELETE défait au
-- passage l'autre moitié de la décision de David : sans ligne
-- `class_members`, la jointure de la relecture rétroactive ne rend rien, et
-- l'ancien élève perd TOUT son historique au lieu de le conserver.
--
-- Changer ce chemin est une décision distincte, qui REND de l'accès (l'élève
-- retiré retrouverait sa relecture) : elle a sa propre question d'accès et ne
-- se glisse pas ici.
--
-- ROLLBACK (additive, sans perte d'accès existant) :
--   -- 1. rétablir la fonction SANS la borne haute (collable tel quel) :
--   --    create or replace function public.had_class_access_to_assignment(p_assignment_id uuid)
--   --    returns boolean language sql stable security definer
--   --    set search_path to 'public', 'pg_temp' as $r$
--   --      select exists (
--   --        select 1 from worksheet_assignment_classes wac
--   --        join class_members cm on cm.class_id = wac.class_id
--   --        join classes c on c.id = wac.class_id
--   --        join school_years sy on sy.id = c.school_year_id
--   --        join worksheet_assignments wa on wa.id = wac.assignment_id
--   --        where wac.assignment_id = p_assignment_id
--   --          and cm.student_id = auth.uid()
--   --          and (cm.status = 'archived' or not c.is_active)
--   --          and coalesce(wa.available_from, wa.assigned_at, wa.created_at)::date
--   --              between sy.start_date and sy.end_date
--   --          and coalesce(wa.available_from, wa.assigned_at, wa.created_at) >= cm.joined_at
--   --          and sy.end_date >= (current_date - interval '12 months')
--   --      );
--   --    $r$;
--   --    ⚠️ L'ordre compte : le corps est une chaîne `$$…$$`, donc Postgres ne
--   --    suit AUCUNE dépendance. Un `drop column` fait avant passerait sans
--   --    broncher et casserait la fonction à l'exécution, en production.
--   -- 2. drop trigger if exists trg_class_members_left_at on class_members;
--   --    drop function if exists public.set_class_member_left_at();
--   -- 3. alter table class_members drop column left_at;
--   --    puis `pnpm db:types` (la colonne disparaît des types générés).
--   L'étape 1 REND de l'accès (elle défait une restriction) : c'est le sens
--   inverse de la migration, et donc sans danger d'exposition nouvelle au-delà
--   de ce qui était déjà permis avant. Seule la date de départ est perdue.

-- ---------------------------------------------------------------------------
-- 1. La date de départ
-- ---------------------------------------------------------------------------

alter table class_members add column if not exists left_at timestamptz;

comment on column class_members.left_at is
	'Date de sortie de la classe, posée par trigger au passage en statut archived et effacée au retour. NULL = toujours membre, ou départ antérieur à la migration (date inconnue).';

-- ---------------------------------------------------------------------------
-- 2. Le trigger qui la tient à jour
-- ---------------------------------------------------------------------------

-- PAS de `security definer` : ce corps ne lit ni n'écrit aucune table, il
-- n'affecte que `NEW`. Lui donner les droits du propriétaire ne servirait à
-- rien — et ferait tourner HORS RLS la moindre écriture qu'on y ajouterait plus
-- tard, sans que personne ne le remarque.
create or replace function public.set_class_member_left_at()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
	-- Le départ s'horodate au passage en archivé, et une seule fois : un second
	-- UPDATE sur une adhésion déjà archivée ne doit pas repousser la date, sinon
	-- toute modification ultérieure rouvrirait l'accès.
	if new.status = 'archived' and (tg_op = 'INSERT' or old.status is distinct from 'archived') then
		new.left_at := now();
	end if;

	-- Réintégration : sans cet effacement, l'élève revenu resterait borné à son
	-- ancienne date de départ et ne recevrait plus rien.
	if new.status <> 'archived' then
		new.left_at := null;
	end if;

	-- Une date de départ ne se REPOUSSE pas.
	--
	-- Sans ce garde, un `update class_members set left_at = '2099-01-01'` — qui
	-- ne touche pas `status`, donc échapperait à un trigger déclaré
	-- `update of status` — rouvrirait l'accès aux distributions postérieures au
	-- départ. D'où le déclenchement sur TOUT UPDATE.
	--
	-- Seul ce sens-là est bloqué. Avancer la date, ou la remettre à NULL
	-- (« départ inconnu », l'état des 77 adhésions archivées avant cette
	-- migration), reste possible : ce sont des corrections légitimes, et elles
	-- ne rendent jamais plus que le comportement d'avant.
	if
		tg_op = 'UPDATE'
		and new.status = 'archived'
		and old.status = 'archived'
		and new.left_at is not null
		and old.left_at is not null
		and new.left_at > old.left_at
	then
		new.left_at := old.left_at;
	end if;

	return new;
end;
$$;

drop trigger if exists trg_class_members_left_at on class_members;
create trigger trg_class_members_left_at
	before insert or update on class_members
	for each row
	execute function public.set_class_member_left_at();

-- ---------------------------------------------------------------------------
-- 3. La borne haute dans la relecture rétroactive
-- ---------------------------------------------------------------------------
-- Corps identique à l'existant, à la dernière condition près.

create or replace function public.had_class_access_to_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	select exists (
		select 1
		from worksheet_assignment_classes wac
		join class_members cm on cm.class_id = wac.class_id
		join classes c on c.id = wac.class_id
		join school_years sy on sy.id = c.school_year_id
		join worksheet_assignments wa on wa.id = wac.assignment_id
		where wac.assignment_id = p_assignment_id
			and cm.student_id = auth.uid()
			-- Ancien membre : l'adhésion est archivée, OU la classe est fermée.
			-- Les deux disent la même chose — cet élève n'est plus en cours
			-- d'année dans cette classe — et une clôture peut n'en produire
			-- qu'une seule des deux.
			and (cm.status = 'archived' or not c.is_active)
			-- Distribuée pendant l'année de la classe…
			and coalesce(wa.available_from, wa.assigned_at, wa.created_at)::date
				between sy.start_date and sy.end_date
			-- …et après l'arrivée de l'élève dans cette classe.
			and coalesce(wa.available_from, wa.assigned_at, wa.created_at) >= cm.joined_at
			-- …et pas après son départ.
			--
			-- `left_at is null` = départ inconnu (adhésion archivée avant cette
			-- migration) : on conserve alors le comportement d'avant plutôt que
			-- de retirer rétroactivement un accès qu'on ne sait pas dater.
			and (
				cm.left_at is null
				or coalesce(wa.available_from, wa.assigned_at, wa.created_at) <= cm.left_at
			)
			-- …et la relecture s'éteint douze mois après la fin de l'année.
			and sy.end_date >= (current_date - interval '12 months')
	);
$$;

comment on function public.had_class_access_to_assignment(uuid) is
	'Relecture rétroactive d''un ancien membre : distribué pendant l''année de la classe, après son arrivée, PAS APRÈS SON DÉPART (class_members.left_at, NULL = date inconnue donc pas de borne), et jusqu''à douze mois après la fin de l''année.';
