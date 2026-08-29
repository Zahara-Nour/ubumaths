-- ============================================================================
-- Référentiel — le code devient obligatoire et s'attribue tout seul
-- ============================================================================
-- Le `code` avait été introduit pour que le rejeu d'un seed retrouve un point
-- après renommage. Ce rôle disparaît : le markdown n'amorce plus qu'un niveau
-- vide, et c'est ensuite la page Programme qui fait foi.
--
-- Il en garde un autre, qui devient le principal : c'est le seul identifiant
-- d'un point qui soit à la fois LISIBLE et STABLE D'UN ENVIRONNEMENT À L'AUTRE.
-- Les UUID diffèrent entre le local et la prod ; `1SPE-047` non. C'est donc lui
-- qu'on écrit dans une fiche d'exercices, dans une URL, ou qu'on donne à un
-- élève (« revois 1SPE-047 »).
--
-- Un point sans code serait donc un point qu'on ne peut ni citer ni transporter.
-- On ferme la porte : attribution par trigger (aucun chemin d'insertion ne peut
-- l'oublier — ni l'API, ni un seed, ni un INSERT à la main), backfill des points
-- créés avant l'arrivée de la colonne, puis NOT NULL.
--
-- Format : `<PRÉFIXE>-<NNN>`, préfixe = le grade sans underscore et en
-- majuscules (`1_SPE` → `1SPE`, `6` → `6`). Une seule série continue par
-- niveau : les points créés dans l'app prennent la suite de ceux du programme
-- (`1SPE-154`…), sans marqueur distinctif — leur provenance n'a plus d'effet
-- sur rien maintenant que le seed ne rejoue plus.
--
-- Le numéro suivant est calculé sur le plus haut EXISTANT. Un point archivé
-- garde donc le sien : archiver ne libère rien, et un code cité dans une fiche
-- continue de désigner la même chose. Seule une suppression définitive rend un
-- numéro disponible — et l'API la refuse dès qu'un point porte la moindre
-- référence (tag d'exercice, couverture, acquisition d'élève). Ce qui reste
-- recyclable, c'est donc le numéro d'un point créé puis effacé sans avoir
-- jamais servi.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. « Le prochain code libre pour ce niveau »
-- ---------------------------------------------------------------------------
-- Une seule implémentation, appelée par le trigger ET par le backfill : deux
-- calculs parallèles finiraient par diverger.
--
-- SECURITY DEFINER : le maximum doit être calculé sur TOUTE la table. Si une
-- politique RLS venait un jour à masquer des points à l'appelant, un maximum
-- partiel produirait un code déjà pris.

create or replace function public.next_curriculum_point_code(p_grade text)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_prefix text;
    v_next   integer;
BEGIN
    v_prefix := replace(upper(p_grade), '_', '');

    -- Le préfixe est injecté dans une regex : on refuse tout ce qui n'est pas
    -- alphanumérique plutôt que d'échapper. Les grades sont de toute façon
    -- contraints par un CHECK à une liste fixe.
    IF v_prefix !~ '^[A-Z0-9]+$' THEN
        RAISE EXCEPTION 'grade % : préfixe de code invalide (%)', p_grade, v_prefix;
    END IF;

    -- Sérialise les attributions concurrentes pour ce niveau. Sans ça, deux
    -- insertions simultanées calculent le même maximum et la seconde se fait
    -- rejeter par l'index unique.
    PERFORM pg_advisory_xact_lock(hashtext('curriculum_point_code:' || v_prefix));

    SELECT coalesce(max(substring(code from ('^' || v_prefix || '-(\d+)$'))::int), 0) + 1
      INTO v_next
      FROM public.curriculum_points
     WHERE code ~ ('^' || v_prefix || '-\d+$');

    RETURN v_prefix || '-' || lpad(v_next::text, 3, '0');
END $function$;

comment on function public.next_curriculum_point_code(text) is
	'Prochain code disponible pour un niveau (ex. 1SPE-154). Ne réutilise jamais un numéro libéré.';

-- ---------------------------------------------------------------------------
-- 2. Backfill — les points antérieurs à la colonne `code`
-- ---------------------------------------------------------------------------
-- En pratique les 95 points de 6ᵉ, seedés avant que la colonne existe. Écrit
-- en boucle plutôt qu'en UPDATE ensembliste pour réutiliser la fonction
-- ci-dessus : une numérotation par `row_number()` repartirait de 1 et
-- collisionnerait sur un niveau déjà partiellement codé.

do $backfill$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.id, t.grade
          FROM public.curriculum_points p
          JOIN public.curriculum_objectives o ON o.id = p.objective_id
          JOIN public.curriculum_themes t     ON t.id = o.theme_id
         WHERE p.code IS NULL
         ORDER BY t.grade, t.display_order, o.display_order, p.display_order, p.name
    LOOP
        UPDATE public.curriculum_points
           SET code = public.next_curriculum_point_code(r.grade)
         WHERE id = r.id;
    END LOOP;
END $backfill$;

-- ---------------------------------------------------------------------------
-- 3. Attribution à l'insertion
-- ---------------------------------------------------------------------------
-- Un code fourni explicitement (les seeds) est respecté ; sinon on le calcule.

create or replace function public.assign_curriculum_point_code()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_grade text;
BEGIN
    IF NEW.code IS NOT NULL AND NEW.code <> '' THEN
        RETURN NEW;
    END IF;

    SELECT t.grade
      INTO v_grade
      FROM public.curriculum_objectives o
      JOIN public.curriculum_themes t ON t.id = o.theme_id
     WHERE o.id = NEW.objective_id;

    IF v_grade IS NULL THEN
        RAISE EXCEPTION 'objectif % introuvable : code impossible à attribuer', NEW.objective_id;
    END IF;

    NEW.code := public.next_curriculum_point_code(v_grade);
    RETURN NEW;
END $function$;

create trigger curriculum_points_assign_code
	before insert on public.curriculum_points
	for each row
	execute function public.assign_curriculum_point_code();

-- ---------------------------------------------------------------------------
-- 4. Plus aucun point sans code
-- ---------------------------------------------------------------------------

alter table public.curriculum_points
	alter column code set not null;

comment on column public.curriculum_points.code is
	'Identifiant lisible et stable d''un environnement à l''autre (ex. 1SPE-047), attribué par trigger. Ne change jamais, même si le libellé change : c''est lui qu''on cite dans une fiche, une URL ou face à un élève.';
