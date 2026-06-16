-- ============================================================================
-- Migration: Tagging des templates 6ᵉ existants → capacités référentiel
-- Date:      2026-06-09
-- Spec:      docs/wip/competence-referentiel-phase2-progress.md (étape 2.1)
-- Décision 59: tagging au niveau template via question_template_skills
-- ============================================================================
-- Tague 3 des 10 templates existants vers leurs capacités 6ᵉ.
-- Les 7 autres restent untagged (cycle 4 / lycée — référentiel pas encore produit).
--
-- Templates non tagués (à tagger quand référentiel cycle 4 existera) :
-- - Aires de cercle (Géométrie / Aires / Cercle)
-- - Identités remarquables (Algèbre / Factorisation / Identités remarquables)
-- - Théorème de Pythagore (Géométrie / Théorème de Pythagore)
-- - Équations linéaires (Algèbre / Équations / Linéaires)
-- - Simplification de fractions (Arithmétique / Fractions / Simplification)
-- - Opérations simples (Arithmétique / Opérations) — multi-niveaux CM1/CM2/6ᵉ, non tagué V1
-- - Équations quadratiques (Algèbre / Équations / Quadratiques)
--
-- Sécurité : INSERT idempotents via ON CONFLICT DO NOTHING (re-rejouable).
-- Pattern  : matching template ⇄ skill par (theme/domain/subdomain) ⇄ (objective.name + display_order),
--            pas d'UUID hard-codé (les seeds utilisent gen_random_uuid()).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Mapping 1 — Addition de fractions
-- Template : Arithmétique / Fractions / Addition (migrations 071 Example 1 + 075 update)
-- Skill    : Item 3 « Fractions » — Rang 4 « Effectuer des opérations sur les
--            fractions : additionner, soustraire (cas simples), multiplier
--            une fraction par un entier » (knowledge_type capacite_attendue)
-- Niveau   : 6e
-- ----------------------------------------------------------------------------
-- Debug SELECT (commenté) :
-- SELECT t.id AS template_id, s.id AS skill_id, t.theme, t.domain, t.subdomain,
--        o.name AS objective, s.display_order, s.name AS capacity
--   FROM public.question_templates t
--   CROSS JOIN public.skills s
--   INNER JOIN public.skill_objectives o ON s.objective_id = o.id
--  WHERE t.theme = 'Arithmétique' AND t.domain = 'Fractions' AND t.subdomain = 'Addition'
--    AND o.name = 'Fractions' AND s.display_order = 4 AND s.niveau_scolaire = '6e';

INSERT INTO public.question_template_skills (template_id, skill_id)
SELECT t.id, s.id
  FROM public.question_templates t
  CROSS JOIN public.skills s
  INNER JOIN public.skill_objectives o ON s.objective_id = o.id
 WHERE t.theme = 'Arithmétique'
   AND t.domain = 'Fractions'
   AND t.subdomain = 'Addition'
   AND o.name = 'Fractions'
   AND s.display_order = 4
   AND s.niveau_scolaire = '6e'
ON CONFLICT (template_id, skill_id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- Mapping 2 — Multiplication décimaux
-- Template : Arithmétique / Décimaux / Multiplication (migrations 071 Example 2 + 075 update)
-- Skill    : Item 5 « Calcul (sens des opérations + calcul posé) » — Rang 3 ⭐
--            « Multiplier (posé) entiers et entier × décimal ; effectuer une
--            division euclidienne (diviseur ≤ 100) ; diviser un décimal par
--            un entier < 10 » (knowledge_type capacite_attendue)
-- Niveau   : 6e
-- Note     : le template cible CM1/CM2/6 mais la capacité existe seulement
--            en 6ᵉ dans le référentiel V1 — le tagging reste valide.
-- ----------------------------------------------------------------------------
-- Debug SELECT (commenté) :
-- SELECT t.id AS template_id, s.id AS skill_id, t.theme, t.domain, t.subdomain,
--        o.name AS objective, s.display_order, s.name AS capacity
--   FROM public.question_templates t
--   CROSS JOIN public.skills s
--   INNER JOIN public.skill_objectives o ON s.objective_id = o.id
--  WHERE t.theme = 'Arithmétique' AND t.domain = 'Décimaux' AND t.subdomain = 'Multiplication'
--    AND o.name = 'Calcul (sens des opérations + calcul posé)' AND s.display_order = 3
--    AND s.niveau_scolaire = '6e';

INSERT INTO public.question_template_skills (template_id, skill_id)
SELECT t.id, s.id
  FROM public.question_templates t
  CROSS JOIN public.skills s
  INNER JOIN public.skill_objectives o ON s.objective_id = o.id
 WHERE t.theme = 'Arithmétique'
   AND t.domain = 'Décimaux'
   AND t.subdomain = 'Multiplication'
   AND o.name = 'Calcul (sens des opérations + calcul posé)'
   AND s.display_order = 3
   AND s.niveau_scolaire = '6e'
ON CONFLICT (template_id, skill_id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- Mapping 3 — Pourcentages réduction
-- Template : Arithmétique / Pourcentages / Réduction (migrations 071 Example 7 + 075 update)
-- Skill    : Item 9 « Proportionnalité et pourcentages » — Rang 3 ⭐
--            « Comprendre, calculer et appliquer un pourcentage »
--            (knowledge_type capacite_attendue)
-- Niveau   : 6e
-- ----------------------------------------------------------------------------
-- Debug SELECT (commenté) :
-- SELECT t.id AS template_id, s.id AS skill_id, t.theme, t.domain, t.subdomain,
--        o.name AS objective, s.display_order, s.name AS capacity
--   FROM public.question_templates t
--   CROSS JOIN public.skills s
--   INNER JOIN public.skill_objectives o ON s.objective_id = o.id
--  WHERE t.theme = 'Arithmétique' AND t.domain = 'Pourcentages' AND t.subdomain = 'Réduction'
--    AND o.name = 'Proportionnalité et pourcentages' AND s.display_order = 3
--    AND s.niveau_scolaire = '6e';

INSERT INTO public.question_template_skills (template_id, skill_id)
SELECT t.id, s.id
  FROM public.question_templates t
  CROSS JOIN public.skills s
  INNER JOIN public.skill_objectives o ON s.objective_id = o.id
 WHERE t.theme = 'Arithmétique'
   AND t.domain = 'Pourcentages'
   AND t.subdomain = 'Réduction'
   AND o.name = 'Proportionnalité et pourcentages'
   AND s.display_order = 3
   AND s.niveau_scolaire = '6e'
ON CONFLICT (template_id, skill_id) DO NOTHING;


-- ============================================================================
-- Vérification post-migration (commentée) :
-- SELECT t.theme, t.domain, t.subdomain, o.name AS objective, s.display_order, s.name
--   FROM public.question_template_skills qts
--   JOIN public.question_templates t  ON qts.template_id = t.id
--   JOIN public.skills s              ON qts.skill_id = s.id
--   JOIN public.skill_objectives o    ON s.objective_id = o.id
--  ORDER BY t.theme, t.domain;
-- Attendu : 3 lignes (1 par mapping ci-dessus).
-- ============================================================================
