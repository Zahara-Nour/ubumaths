-- ==============================================================================
-- Question de démonstration — LOCAL UNIQUEMENT
-- ==============================================================================
-- Une seule question, dans la base locale, pour que le lien question ↔ programme
-- soit visible sans avoir à en écrire une d'abord : la table
-- `question_template_points` est vide partout, y compris en production, et
-- l'écran de tagging (`/dashboard/admin/questions/[id]/edit`) n'a donc rien à
-- montrer sur une base fraîche.
--
-- Elle est délibérément liée à TROIS points du programme de seconde, un par
-- sous-question. C'est le cas qui compte : une question ne valide pas un point,
-- elle en mobilise plusieurs, et c'est ce qui interdit de déduire l'acquisition
-- d'un point du seul score global de la question.
--
--   2-089  Expression des coordonnées de AB en fonction de celles de A et B
--   2-096  Calculer la distance entre deux points
--   2-097  Calculer les coordonnées du milieu d'un segment
--
-- Les points sont retrouvés par leur `code`, seul identifiant à la fois stable
-- d'un environnement à l'autre et lisible ici : les UUID sont régénérés à
-- chaque amorçage.
--
-- Trois variations, toutes construites sur un déplacement (dx ; dy) dont dx et
-- dy sont pairs et forment un triplet pythagoricien : la distance tombe juste
-- ET le milieu reste à coordonnées entières. Une variation à distance
-- irrationnelle (racine à simplifier) demanderait de contraindre la forme de la
-- réponse — c'est un autre sujet que celui de ce seed.
-- ==============================================================================

do $demo_question$
DECLARE
    v_template constant uuid := '55555555-5555-4555-8555-555555555555';
    v_codes constant text[] := ARRAY['2-089', '2-096', '2-097'];
    v_author uuid;
    v_owner uuid;
    v_tagged int;
BEGIN
    -- Le référentiel de seconde est amorcé par une migration, donc avant ce
    -- seed. Si la garde saute, c'est que l'ordre a changé : on le dit plutôt
    -- que d'échouer sur une contrainte de clé étrangère.
    IF NOT EXISTS (SELECT 1 FROM public.curriculum_points WHERE code = ANY(v_codes)) THEN
        RAISE WARNING 'Programme de seconde absent : question de démonstration non créée.';
        RETURN;
    END IF;

    SELECT id INTO v_author FROM public.profiles WHERE email = 'admin@local.test';
    -- La série appartient au PROF et non à l'admin : les politiques RLS de
    -- `assessments` sont restées à `created_by = auth.uid()`, contrairement aux
    -- tables passées à `is_teacher_or_admin()` lors du refactor mono-professeur.
    -- Une série créée par l'admin serait donc invisible depuis le compte prof.
    SELECT id INTO v_owner FROM public.profiles WHERE email = 'teacher@local.test';

    INSERT INTO public.question_templates (
        id, title, description, status, type, grades,
        theme, domain, subdomain, level, shared, variations, created_by
    ) VALUES (
        v_template,
        'Distance et milieu dans un repère orthonormé',
        'Trois sous-questions sur un même couple de points : coordonnées du vecteur, distance, milieu.',
        'published',
        'fill_in_blanks',
        ARRAY['2'],
        'Géométrie',
        'Géométrie repérée',
        'Distance et milieu',
        1,
        '{"statement": "Le plan est muni d''un repère orthonormé.\n\nOn donne les points $A({{xa}} ; {{ya}})$ et $B({{xb}} ; {{yb}})$.\n\n1. Les coordonnées du vecteur $\\vec{AB}$ sont $(? ; ?)$.\n2. La distance entre $A$ et $B$ vaut $?$.\n3. Le milieu $I$ du segment $[AB]$ a pour coordonnées $I(? ; ?)$.", "correction": {"steps": ["On retranche les coordonnées de $A$ à celles de $B$ : $x_{\\vec{AB}} = x_B - x_A$ et $y_{\\vec{AB}} = y_B - y_A$. Ici $\\vec{AB}({{dx}} ; {{dy}})$.", "Le repère est orthonormé, donc la distance est la norme de $\\vec{AB}$ : $\\sqrt{x_{\\vec{AB}}^2 + y_{\\vec{AB}}^2} = \\sqrt{{{eval:dx*dx}} + {{eval:dy*dy}}} = \\sqrt{{{eval:dx*dx+dy*dy}}} = {{d}}$.", "Les coordonnées du milieu sont les moyennes de celles des extrémités : $x_I = \\frac{x_A + x_B}{2}$ et $y_I = \\frac{y_A + y_B}{2}$. Ici $I({{eval:xa+dx/2}} ; {{eval:ya+dy/2}})$."], "feedback": {"correct": "Les trois formules de la géométrie repérée sont en place.", "incorrect": "Attention au sens de la soustraction : $\\vec{AB}$ se lit « arrivée moins départ », donc $x_B - x_A$ — et le milieu, lui, s''obtient par une somme divisée par deux."}}}'::jsonb,
        '[{"variables": [{"name": "dx", "expression": "6"}, {"name": "dy", "expression": "8"}, {"name": "d", "expression": "10"}, {"name": "xa", "expression": "{{-4..4}}"}, {"name": "ya", "expression": "{{-4..4}}"}, {"name": "xb", "expression": "{{eval:xa+dx}}"}, {"name": "yb", "expression": "{{eval:ya+dy}}"}], "blanks": [{"expectedAnswer": "{{dx}}"}, {"expectedAnswer": "{{dy}}"}, {"expectedAnswer": "{{d}}"}, {"expectedAnswer": "{{eval:xa+dx/2}}"}, {"expectedAnswer": "{{eval:ya+dy/2}}"}]}, {"variables": [{"name": "dx", "expression": "-8"}, {"name": "dy", "expression": "6"}, {"name": "d", "expression": "10"}, {"name": "xa", "expression": "{{-4..4}}"}, {"name": "ya", "expression": "{{-4..4}}"}, {"name": "xb", "expression": "{{eval:xa+dx}}"}, {"name": "yb", "expression": "{{eval:ya+dy}}"}], "blanks": [{"expectedAnswer": "{{dx}}"}, {"expectedAnswer": "{{dy}}"}, {"expectedAnswer": "{{d}}"}, {"expectedAnswer": "{{eval:xa+dx/2}}"}, {"expectedAnswer": "{{eval:ya+dy/2}}"}]}, {"variables": [{"name": "dx", "expression": "12"}, {"name": "dy", "expression": "-16"}, {"name": "d", "expression": "20"}, {"name": "xa", "expression": "{{-4..4}}"}, {"name": "ya", "expression": "{{-4..4}}"}, {"name": "xb", "expression": "{{eval:xa+dx}}"}, {"name": "yb", "expression": "{{eval:ya+dy}}"}], "blanks": [{"expectedAnswer": "{{dx}}"}, {"expectedAnswer": "{{dy}}"}, {"expectedAnswer": "{{d}}"}, {"expectedAnswer": "{{eval:xa+dx/2}}"}, {"expectedAnswer": "{{eval:ya+dy/2}}"}]}]'::jsonb,
        v_author
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.question_template_points (template_id, point_id)
    SELECT v_template, p.id FROM public.curriculum_points p WHERE p.code = ANY(v_codes)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_tagged = ROW_COUNT;
    RAISE NOTICE 'Question de démonstration : % point(s) du programme rattaché(s).', v_tagged;

    -- ------------------------------------------------------------------
    -- Une série contenant cette question
    -- ------------------------------------------------------------------
    -- Sans elle, le troisième sélecteur du cahier de texte reste invisible :
    -- il ne s'affiche que s'il a quelque chose à proposer, et la table est
    -- vide partout — la création d'évaluation ayant toujours échoué sur le
    -- trigger `class_id` (cf. migration 20260904090000).
    --
    -- Elle désigne sa question par CATÉGORIE et non par identifiant, comme le
    -- fait le modèle : c'est le quadruplet (thème, domaine, sous-domaine,
    -- niveau) qui pointe l'unique template publié de cette catégorie. Ce seed
    -- exerce donc aussi `assessment_curriculum_points()`.
    INSERT INTO public.assessments (id, title, grade, description, created_by, categories, status)
    VALUES (
        '66666666-6666-4666-8666-666666666666',
        'Géométrie repérée — série de démonstration',
        '2',
        'Une seule question, pour rendre visible le rattachement d''une série à une séance.',
        v_owner,
        jsonb_build_array(jsonb_build_object(
            'category', jsonb_build_object(
                'theme', 'Géométrie',
                'domain', 'Géométrie repérée',
                'subdomain', 'Distance et milieu',
                'level', 1
            ),
            'quantity', 3,
            'delay', 45
        )),
        'published'
    )
    ON CONFLICT (id) DO NOTHING;
END $demo_question$;
