-- ============================================================================
-- Référentiel — étendre aux thèmes et aux objectifs ce qui n'avait été fait
-- que pour les points
-- ============================================================================
-- `20260901090000` a réglé trois défauts de position, mais uniquement sur
-- `curriculum_points`. Les deux niveaux au-dessus les ont gardés, et ça se voit :
-- dans « Probabilités et statistiques » de 1ʳᵉ spé, deux objectifs portaient
-- l'ordre 0 — un du seed, un créé depuis l'app. L'échange deux-à-deux de l'UI
-- troque alors 0 contre 0 : rien ne bouge, et le thème paraît bloqué.
--
-- Les trois mêmes correctifs, donc, appliqués aux thèmes et aux objectifs :
--
--   1. un nœud créé sans position se place EN DERNIER (0 = « à la fin ») ;
--   2. un réordonnancement renumérote la fratrie entière 1..N en une
--      transaction, au lieu d'un échange de voisins qui échoue silencieusement
--      dès que deux positions se valent ;
--   3. une remise à plat rattrape l'existant — doublons, trous et zéros.
--
-- L'échange deux-à-deux n'est pas seulement lent (deux requêtes et un
-- rechargement par cran) : il est FAUX dès qu'il y a un doublon. C'est la
-- renumérotation qui rend l'opération sûre, pas sa rapidité.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Placement en dernier
-- ---------------------------------------------------------------------------
-- Même convention que pour les points : `display_order = 0` à l'insertion
-- signifie « à la fin ». C'est le défaut de la colonne, donc le cas de tout
-- appelant qui ne se prononce pas ; les seeds numérotent explicitement.

create or replace function public.place_curriculum_theme_last()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
BEGIN
    IF NEW.display_order IS DISTINCT FROM 0 THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('curriculum_theme_order:' || NEW.grade));

    SELECT coalesce(max(display_order), 0) + 1
      INTO NEW.display_order
      FROM public.curriculum_themes
     WHERE grade = NEW.grade;

    RETURN NEW;
END $function$;

create trigger curriculum_themes_place_last
	before insert on public.curriculum_themes
	for each row
	execute function public.place_curriculum_theme_last();

create or replace function public.place_curriculum_objective_last()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
BEGIN
    IF NEW.display_order IS DISTINCT FROM 0 THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('curriculum_objective_order:' || NEW.theme_id::text));

    SELECT coalesce(max(display_order), 0) + 1
      INTO NEW.display_order
      FROM public.curriculum_objectives
     WHERE theme_id = NEW.theme_id;

    RETURN NEW;
END $function$;

create trigger curriculum_objectives_place_last
	before insert on public.curriculum_objectives
	for each row
	execute function public.place_curriculum_objective_last();

-- ---------------------------------------------------------------------------
-- 2. Réordonnancement en bloc
-- ---------------------------------------------------------------------------
-- INVOKER, comme `reorder_curriculum_points` : ces fonctions écrivent, la RLS
-- doit s'appliquer. La liste doit couvrir exactement la fratrie — un
-- sous-ensemble laisserait le reste sur ses anciennes valeurs.

create or replace function public.reorder_curriculum_themes(
	p_grade text,
	p_theme_ids uuid[]
)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_given    integer := coalesce(array_length(p_theme_ids, 1), 0);
    v_belong   integer;
    v_expected integer;
BEGIN
    SELECT count(*) INTO v_expected
      FROM public.curriculum_themes WHERE grade = p_grade;

    SELECT count(DISTINCT u.id) INTO v_belong
      FROM unnest(p_theme_ids) AS u(id)
      JOIN public.curriculum_themes t ON t.id = u.id AND t.grade = p_grade;

    IF v_belong <> v_given THEN
        RAISE EXCEPTION 'liste invalide : doublon, ou thème étranger à ce niveau';
    END IF;
    IF v_given <> v_expected THEN
        RAISE EXCEPTION 'liste incomplète : % thèmes fournis, % attendus', v_given, v_expected;
    END IF;

    UPDATE public.curriculum_themes t
       SET display_order = v.ord, updated_at = now()
      FROM (SELECT id, ord::int FROM unnest(p_theme_ids) WITH ORDINALITY AS x(id, ord)) v
     WHERE t.id = v.id AND t.display_order IS DISTINCT FROM v.ord;
END $function$;

create or replace function public.reorder_curriculum_objectives(
	p_theme_id uuid,
	p_objective_ids uuid[]
)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_given    integer := coalesce(array_length(p_objective_ids, 1), 0);
    v_belong   integer;
    v_expected integer;
BEGIN
    SELECT count(*) INTO v_expected
      FROM public.curriculum_objectives WHERE theme_id = p_theme_id;

    SELECT count(DISTINCT u.id) INTO v_belong
      FROM unnest(p_objective_ids) AS u(id)
      JOIN public.curriculum_objectives o ON o.id = u.id AND o.theme_id = p_theme_id;

    IF v_belong <> v_given THEN
        RAISE EXCEPTION 'liste invalide : doublon, ou objectif étranger à ce thème';
    END IF;
    IF v_given <> v_expected THEN
        RAISE EXCEPTION 'liste incomplète : % objectifs fournis, % attendus', v_given, v_expected;
    END IF;

    UPDATE public.curriculum_objectives o
       SET display_order = v.ord, updated_at = now()
      FROM (SELECT id, ord::int FROM unnest(p_objective_ids) WITH ORDINALITY AS x(id, ord)) v
     WHERE o.id = v.id AND o.display_order IS DISTINCT FROM v.ord;
END $function$;

comment on function public.reorder_curriculum_themes(text, uuid[]) is
	'Renumérote 1..N les thèmes d''un niveau dans l''ordre fourni. La liste doit couvrir exactement le niveau.';
comment on function public.reorder_curriculum_objectives(uuid, uuid[]) is
	'Renumérote 1..N les objectifs d''un thème dans l''ordre fourni. La liste doit couvrir exactement le thème.';

grant execute on function public.reorder_curriculum_themes(text, uuid[]) to authenticated;
grant execute on function public.reorder_curriculum_objectives(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Remise à plat de l'existant
-- ---------------------------------------------------------------------------
-- L'ordre affiché est préservé : c'est le tri `display_order, name` qu'utilisent
-- déjà les lectures. Seules les valeurs sont normalisées.

with ordered as (
	select id, row_number() over (partition by grade order by display_order, name) as n
	  from public.curriculum_themes
)
update public.curriculum_themes t
   set display_order = ordered.n
  from ordered
 where ordered.id = t.id and t.display_order is distinct from ordered.n;

with ordered as (
	select id, row_number() over (partition by theme_id order by display_order, name) as n
	  from public.curriculum_objectives
)
update public.curriculum_objectives o
   set display_order = ordered.n
  from ordered
 where ordered.id = o.id and o.display_order is distinct from ordered.n;

comment on column public.curriculum_themes.display_order is
	'Position dans le niveau (1..N). À l''insertion, 0 signifie « à la fin ».';
comment on column public.curriculum_objectives.display_order is
	'Position dans le thème (1..N). À l''insertion, 0 signifie « à la fin ».';
