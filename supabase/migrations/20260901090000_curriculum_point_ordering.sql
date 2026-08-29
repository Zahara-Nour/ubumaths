-- ============================================================================
-- Référentiel — position d'affichage : placement, réordonnancement, remise à plat
-- ============================================================================
-- `display_order` est local à l'objectif (1, 2, 3… et non 1 à 153) et n'a aucun
-- rapport avec le `code` : rien ne trie par code, et un point déplacé garde le
-- sien. Si les deux séries coïncident aujourd'hui, c'est seulement que le seed a
-- créé les points dans l'ordre du BO — dès le premier déplacement elles divergent,
-- et c'est le but.
--
-- Trois manques que cette migration comble :
--
--   1. Un point créé dans l'app arrivait EN PREMIER. L'API pose `display_order = 0`
--      faute de valeur, alors que les points seedés commencent à 1 — le nouveau
--      passait donc devant tout le monde, et deux créations successives se
--      retrouvaient toutes deux à 0, départagées par ordre alphabétique.
--
--   2. Réordonner se faisait d'un cran à la fois, par échange avec le voisin :
--      deux requêtes et un rechargement complet par cran. Remonter un point de
--      dix places coûtait vingt requêtes.
--
--   3. Rien ne garantissait que les positions d'un objectif forment bien 1..N.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Un nouveau point se place en dernier
-- ---------------------------------------------------------------------------
-- Convention : `display_order = 0` à l'insertion signifie « à la fin ». C'est le
-- défaut de la colonne, donc le cas de tout appelant qui ne se prononce pas ; les
-- seeds, eux, numérotent explicitement à partir de 1 et ne sont pas touchés.

create or replace function public.place_curriculum_point_last()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
BEGIN
    IF NEW.display_order IS DISTINCT FROM 0 THEN
        RETURN NEW;
    END IF;

    -- Sérialise les créations concurrentes dans le même objectif, sinon deux
    -- insertions lisent le même maximum et atterrissent à égalité.
    PERFORM pg_advisory_xact_lock(hashtext('curriculum_point_order:' || NEW.objective_id::text));

    SELECT coalesce(max(display_order), 0) + 1
      INTO NEW.display_order
      FROM public.curriculum_points
     WHERE objective_id = NEW.objective_id;

    RETURN NEW;
END $function$;

comment on function public.place_curriculum_point_last() is
	'Place un point créé sans position explicite (display_order = 0) à la fin de son objectif.';

-- Nommé pour passer APRÈS `curriculum_points_assign_code` (ordre alphabétique des
-- triggers) — les deux sont indépendants, mais l'ordre reste ainsi prévisible.
create trigger curriculum_points_place_last
	before insert on public.curriculum_points
	for each row
	execute function public.place_curriculum_point_last();

-- ---------------------------------------------------------------------------
-- 2. Réordonner tout un objectif en une fois
-- ---------------------------------------------------------------------------
-- INVOKER délibérément : l'écriture doit rester soumise à la RLS de
-- `curriculum_points` (`is_teacher_or_admin()`). L'API vérifie déjà le rôle, la
-- RLS reste le vrai garde.
--
-- La liste doit couvrir EXACTEMENT les points de l'objectif. Accepter un
-- sous-ensemble renumèroterait une partie en laissant l'autre sur ses anciennes
-- valeurs — donc des doublons et un ordre final imprévisible. Les points archivés
-- en font partie : ils sont masqués dans l'UI, pas retirés de l'objectif.

create or replace function public.reorder_curriculum_points(
	p_objective_id uuid,
	p_point_ids uuid[]
)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_given    integer := coalesce(array_length(p_point_ids, 1), 0);
    v_belong   integer;
    v_expected integer;
BEGIN
    SELECT count(*)
      INTO v_expected
      FROM public.curriculum_points
     WHERE objective_id = p_objective_id;

    SELECT count(DISTINCT u.id)
      INTO v_belong
      FROM unnest(p_point_ids) AS u(id)
      JOIN public.curriculum_points cp
        ON cp.id = u.id AND cp.objective_id = p_objective_id;

    IF v_belong <> v_given THEN
        RAISE EXCEPTION 'liste invalide : doublon, ou point étranger à cet objectif';
    END IF;

    IF v_given <> v_expected THEN
        RAISE EXCEPTION 'liste incomplète : % points fournis, % attendus (archivés compris)',
            v_given, v_expected;
    END IF;

    UPDATE public.curriculum_points cp
       SET display_order = v.ord,
           updated_at    = now()
      FROM (
        SELECT id, ord::int
          FROM unnest(p_point_ids) WITH ORDINALITY AS t(id, ord)
      ) v
     WHERE cp.id = v.id
       AND cp.display_order IS DISTINCT FROM v.ord;
END $function$;

comment on function public.reorder_curriculum_points(uuid, uuid[]) is
	'Renumérote 1..N les points d''un objectif dans l''ordre fourni. La liste doit couvrir exactement l''objectif, archivés compris.';

grant execute on function public.reorder_curriculum_points(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Remise à plat des positions existantes
-- ---------------------------------------------------------------------------
-- Rattrape les zéros posés par les créations passées, les égalités et les trous.
-- L'ordre actuel est préservé — c'est le tri `display_order, name` qu'utilisent
-- déjà les lectures.

with ordered as (
	select id,
	       row_number() over (partition by objective_id order by display_order, name) as n
	  from public.curriculum_points
)
update public.curriculum_points p
   set display_order = ordered.n
  from ordered
 where ordered.id = p.id
   and p.display_order is distinct from ordered.n;

comment on column public.curriculum_points.display_order is
	'Position dans l''objectif (1..N), sans rapport avec le code. À l''insertion, 0 signifie « à la fin ».';
