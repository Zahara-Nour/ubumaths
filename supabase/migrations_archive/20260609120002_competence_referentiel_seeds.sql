-- ============================================================================
-- Migration: Competence Referentiel — Seeds (Phase 1 step 1.3)
-- Generated: 2026-06-09 07:51:48 UTC
-- Generator: scripts/generate-competence-seeds.ts
--
-- Re-generate with: pnpm tsx scripts/generate-competence-seeds.ts
--
-- Sources:
--   Family A (knowledge) : docs/wip/referentiel/6e-savoirs.md
--   Family B (competence): docs/wip/referentiel/college-competences.md
--
-- Counts (verified by script):
--   Family A: 6 themes | 18 objectives | 72 capacities
--   Family B: 6 competences | 22 subdimensions | 56 observables
-- ============================================================================

DO $$
DECLARE
  v_theme_nombresetcalcul_id UUID;
  v_theme_organisationgestiondedonneesetprobabilites_id UUID;
  v_theme_proportionnalite_id UUID;
  v_theme_espaceetgeometrie_id UUID;
  v_theme_grandeursetmesures_id UUID;
  v_theme_initiationalapenseeinformatique_id UUID;

  v_obj_1_id UUID;
  v_obj_2_id UUID;
  v_obj_3_id UUID;
  v_obj_5_id UUID;
  v_obj_6_id UUID;
  v_obj_7_id UUID;
  v_obj_8_id UUID;
  v_obj_9_id UUID;
  v_obj_10_id UUID;
  v_obj_11_id UUID;
  v_obj_12_id UUID;
  v_obj_13_id UUID;
  v_obj_14_id UUID;
  v_obj_15_id UUID;
  v_obj_16_id UUID;
  v_obj_17_id UUID;
  v_obj_18_id UUID;
  v_obj_19_id UUID;

  v_comp_chercher_id UUID;
  v_comp_calculer_id UUID;
  v_comp_raisonner_id UUID;
  v_comp_communiquer_id UUID;
  v_comp_modeliser_id UUID;
  v_comp_representer_id UUID;

  v_subdim_chercher_a_id UUID;
  v_subdim_chercher_b_id UUID;
  v_subdim_chercher_c_id UUID;
  v_subdim_chercher_d_id UUID;
  v_subdim_calculer_a_id UUID;
  v_subdim_calculer_b_id UUID;
  v_subdim_calculer_c_id UUID;
  v_subdim_calculer_d_id UUID;
  v_subdim_raisonner_a_id UUID;
  v_subdim_raisonner_b_id UUID;
  v_subdim_raisonner_c_id UUID;
  v_subdim_raisonner_d_id UUID;
  v_subdim_communiquer_a_id UUID;
  v_subdim_communiquer_b_id UUID;
  v_subdim_communiquer_c_id UUID;
  v_subdim_modeliser_a_id UUID;
  v_subdim_modeliser_b_id UUID;
  v_subdim_modeliser_c_id UUID;
  v_subdim_representer_a_id UUID;
  v_subdim_representer_b_id UUID;
  v_subdim_representer_c_id UUID;
  v_subdim_representer_d_id UUID;
BEGIN

  -- ========================================================================
  -- FAMILY A — skill_themes
  -- ========================================================================

  -- Theme 1: Nombres et calcul
  SELECT id INTO v_theme_nombresetcalcul_id
    FROM public.skill_themes
   WHERE niveau_scolaire = '6e' AND name = 'Nombres et calcul';
  IF v_theme_nombresetcalcul_id IS NULL THEN
    INSERT INTO public.skill_themes (niveau_scolaire, name, display_order)
    VALUES ('6e', 'Nombres et calcul', 1)
    RETURNING id INTO v_theme_nombresetcalcul_id;
  END IF;

  -- Theme 2: Organisation, gestion de données et probabilités
  SELECT id INTO v_theme_organisationgestiondedonneesetprobabilites_id
    FROM public.skill_themes
   WHERE niveau_scolaire = '6e' AND name = 'Organisation, gestion de données et probabilités';
  IF v_theme_organisationgestiondedonneesetprobabilites_id IS NULL THEN
    INSERT INTO public.skill_themes (niveau_scolaire, name, display_order)
    VALUES ('6e', 'Organisation, gestion de données et probabilités', 2)
    RETURNING id INTO v_theme_organisationgestiondedonneesetprobabilites_id;
  END IF;

  -- Theme 3: Proportionnalité
  SELECT id INTO v_theme_proportionnalite_id
    FROM public.skill_themes
   WHERE niveau_scolaire = '6e' AND name = 'Proportionnalité';
  IF v_theme_proportionnalite_id IS NULL THEN
    INSERT INTO public.skill_themes (niveau_scolaire, name, display_order)
    VALUES ('6e', 'Proportionnalité', 3)
    RETURNING id INTO v_theme_proportionnalite_id;
  END IF;

  -- Theme 4: Espace et géométrie
  SELECT id INTO v_theme_espaceetgeometrie_id
    FROM public.skill_themes
   WHERE niveau_scolaire = '6e' AND name = 'Espace et géométrie';
  IF v_theme_espaceetgeometrie_id IS NULL THEN
    INSERT INTO public.skill_themes (niveau_scolaire, name, display_order)
    VALUES ('6e', 'Espace et géométrie', 4)
    RETURNING id INTO v_theme_espaceetgeometrie_id;
  END IF;

  -- Theme 5: Grandeurs et mesures
  SELECT id INTO v_theme_grandeursetmesures_id
    FROM public.skill_themes
   WHERE niveau_scolaire = '6e' AND name = 'Grandeurs et mesures';
  IF v_theme_grandeursetmesures_id IS NULL THEN
    INSERT INTO public.skill_themes (niveau_scolaire, name, display_order)
    VALUES ('6e', 'Grandeurs et mesures', 5)
    RETURNING id INTO v_theme_grandeursetmesures_id;
  END IF;

  -- Theme 6: Initiation à la pensée informatique
  SELECT id INTO v_theme_initiationalapenseeinformatique_id
    FROM public.skill_themes
   WHERE niveau_scolaire = '6e' AND name = 'Initiation à la pensée informatique';
  IF v_theme_initiationalapenseeinformatique_id IS NULL THEN
    INSERT INTO public.skill_themes (niveau_scolaire, name, display_order)
    VALUES ('6e', 'Initiation à la pensée informatique', 6)
    RETURNING id INTO v_theme_initiationalapenseeinformatique_id;
  END IF;

  -- ========================================================================
  -- FAMILY A — skill_objectives
  -- ========================================================================

  -- Theme 1: Nombres et calcul
  -- Item 1: Nombres entiers
  SELECT id INTO v_obj_1_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_nombresetcalcul_id AND name = 'Nombres entiers';
  IF v_obj_1_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_nombresetcalcul_id, 'Nombres entiers', 1)
    RETURNING id INTO v_obj_1_id;
  END IF;

  -- Item 2: Nombres décimaux
  SELECT id INTO v_obj_2_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_nombresetcalcul_id AND name = 'Nombres décimaux';
  IF v_obj_2_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_nombresetcalcul_id, 'Nombres décimaux', 2)
    RETURNING id INTO v_obj_2_id;
  END IF;

  -- Item 3: Fractions
  SELECT id INTO v_obj_3_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_nombresetcalcul_id AND name = 'Fractions';
  IF v_obj_3_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_nombresetcalcul_id, 'Fractions', 3)
    RETURNING id INTO v_obj_3_id;
  END IF;

  -- Item 5: Calcul (sens des opérations + calcul posé)
  SELECT id INTO v_obj_5_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_nombresetcalcul_id AND name = 'Calcul (sens des opérations + calcul posé)';
  IF v_obj_5_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_nombresetcalcul_id, 'Calcul (sens des opérations + calcul posé)', 4)
    RETURNING id INTO v_obj_5_id;
  END IF;

  -- Item 6: Algèbre
  SELECT id INTO v_obj_6_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_nombresetcalcul_id AND name = 'Algèbre';
  IF v_obj_6_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_nombresetcalcul_id, 'Algèbre', 5)
    RETURNING id INTO v_obj_6_id;
  END IF;

  -- Theme 2: Organisation, gestion de données et probabilités
  -- Item 7: Organiser et lire des données
  SELECT id INTO v_obj_7_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_organisationgestiondedonneesetprobabilites_id AND name = 'Organiser et lire des données';
  IF v_obj_7_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_organisationgestiondedonneesetprobabilites_id, 'Organiser et lire des données', 1)
    RETURNING id INTO v_obj_7_id;
  END IF;

  -- Item 8: Probabilités
  SELECT id INTO v_obj_8_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_organisationgestiondedonneesetprobabilites_id AND name = 'Probabilités';
  IF v_obj_8_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_organisationgestiondedonneesetprobabilites_id, 'Probabilités', 2)
    RETURNING id INTO v_obj_8_id;
  END IF;

  -- Theme 3: Proportionnalité
  -- Item 9: Proportionnalité et pourcentages
  SELECT id INTO v_obj_9_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_proportionnalite_id AND name = 'Proportionnalité et pourcentages';
  IF v_obj_9_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_proportionnalite_id, 'Proportionnalité et pourcentages', 1)
    RETURNING id INTO v_obj_9_id;
  END IF;

  -- Theme 4: Espace et géométrie
  -- Item 10: Figures usuelles (lexique, reconnaissance)
  SELECT id INTO v_obj_10_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_espaceetgeometrie_id AND name = 'Figures usuelles (lexique, reconnaissance)';
  IF v_obj_10_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_espaceetgeometrie_id, 'Figures usuelles (lexique, reconnaissance)', 1)
    RETURNING id INTO v_obj_10_id;
  END IF;

  -- Item 11: Constructions
  SELECT id INTO v_obj_11_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_espaceetgeometrie_id AND name = 'Constructions';
  IF v_obj_11_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_espaceetgeometrie_id, 'Constructions', 2)
    RETURNING id INTO v_obj_11_id;
  END IF;

  -- Item 12: Symétrie axiale
  SELECT id INTO v_obj_12_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_espaceetgeometrie_id AND name = 'Symétrie axiale';
  IF v_obj_12_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_espaceetgeometrie_id, 'Symétrie axiale', 3)
    RETURNING id INTO v_obj_12_id;
  END IF;

  -- Item 13: Espace (vision 3D, patrons)
  SELECT id INTO v_obj_13_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_espaceetgeometrie_id AND name = 'Espace (vision 3D, patrons)';
  IF v_obj_13_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_espaceetgeometrie_id, 'Espace (vision 3D, patrons)', 4)
    RETURNING id INTO v_obj_13_id;
  END IF;

  -- Theme 5: Grandeurs et mesures
  -- Item 14: Longueurs (périmètres)
  SELECT id INTO v_obj_14_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_grandeursetmesures_id AND name = 'Longueurs (périmètres)';
  IF v_obj_14_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_grandeursetmesures_id, 'Longueurs (périmètres)', 1)
    RETURNING id INTO v_obj_14_id;
  END IF;

  -- Item 15: Aires
  SELECT id INTO v_obj_15_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_grandeursetmesures_id AND name = 'Aires';
  IF v_obj_15_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_grandeursetmesures_id, 'Aires', 2)
    RETURNING id INTO v_obj_15_id;
  END IF;

  -- Item 16: Volumes
  SELECT id INTO v_obj_16_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_grandeursetmesures_id AND name = 'Volumes';
  IF v_obj_16_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_grandeursetmesures_id, 'Volumes', 3)
    RETURNING id INTO v_obj_16_id;
  END IF;

  -- Item 17: Angles (mesure)
  SELECT id INTO v_obj_17_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_grandeursetmesures_id AND name = 'Angles (mesure)';
  IF v_obj_17_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_grandeursetmesures_id, 'Angles (mesure)', 4)
    RETURNING id INTO v_obj_17_id;
  END IF;

  -- Item 18: Durées et repérage dans le temps
  SELECT id INTO v_obj_18_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_grandeursetmesures_id AND name = 'Durées et repérage dans le temps';
  IF v_obj_18_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_grandeursetmesures_id, 'Durées et repérage dans le temps', 5)
    RETURNING id INTO v_obj_18_id;
  END IF;

  -- Theme 6: Initiation à la pensée informatique
  -- Item 19: Programmer
  SELECT id INTO v_obj_19_id
    FROM public.skill_objectives
   WHERE theme_id = v_theme_initiationalapenseeinformatique_id AND name = 'Programmer';
  IF v_obj_19_id IS NULL THEN
    INSERT INTO public.skill_objectives (theme_id, name, display_order)
    VALUES (v_theme_initiationalapenseeinformatique_id, 'Programmer', 1)
    RETURNING id INTO v_obj_19_id;
  END IF;

  -- ========================================================================
  -- FAMILY A — skills (capacities, 72 rows)
  -- ========================================================================

  -- Item 1: Nombres entiers
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_1_id, 'Comprendre la valeur d''un chiffre selon sa position dans un nombre entier', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_1_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_1_id, 'Lire et écrire un grand nombre entier (jusqu''au milliard) en chiffres et en lettres', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_1_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_1_id, 'Comparer et ordonner des nombres entiers, les placer sur une demi-droite graduée', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_1_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_1_id, 'Estimer et interpréter de très grands nombres dans un contexte réel (démographie, astronomie)', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_1_id AND display_order = 4
  );

  -- Item 2: Nombres décimaux
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_2_id, 'Reconnaître un nombre décimal et passer entre ses différentes écritures (virgule ↔ fraction décimale ↔ somme de fractions décimales)', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_2_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_2_id, 'Placer un nombre décimal sur une demi-droite graduée et le repérer', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_2_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_2_id, 'Comparer et ordonner des nombres décimaux, encadrer, intercaler', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_2_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_2_id, 'Arrondir un nombre décimal à l''unité, au dixième, au centième', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_2_id AND display_order = 4
  );

  -- Item 3: Fractions
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_3_id, 'Reconnaître et représenter une fraction (sens partage : 3/4 = 3 quarts d''une unité ; sens quotient : 3/4 = quart de 3) ; placer sur une demi-droite graduée', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_3_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_3_id, 'Établir des égalités de fractions et comparer des fractions (y compris encadrer entre deux entiers)', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_3_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_3_id, 'Calculer une fraction d''une quantité ou d''un nombre (opérateur multiplicatif)', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_3_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_3_id, 'Effectuer des opérations sur les fractions : additionner, soustraire (cas simples), multiplier une fraction par un entier', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_3_id AND display_order = 4
  );

  -- Item 5: Calcul (sens des opérations + calcul posé)
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_5_id, 'Comprendre le sens des 4 opérations et choisir l''opération pertinente dans un problème', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_5_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_5_id, 'Additionner et soustraire des nombres entiers et des nombres décimaux (calcul posé)', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_5_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_5_id, 'Multiplier (posé) entiers et entier × décimal ; effectuer une division euclidienne (diviseur ≤ 100) ; diviser un décimal par un entier < 10', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_5_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_5_id, 'Multiplier deux nombres décimaux et calculer avec parenthèses, en contrôlant par un ordre de grandeur', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_5_id AND display_order = 4
  );

  -- Item 6: Algèbre
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_6_id, 'Compléter une égalité à trous (en utilisant l''opération inverse)', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_6_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_6_id, 'Résoudre un problème avec un nombre inconnu (schéma en barre ou représentation visuelle)', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_6_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_6_id, 'Identifier et poursuivre une régularité dans une suite de nombres ou un motif évolutif', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_6_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_6_id, 'Exécuter et produire un programme de calcul ; identifier la structure générique d''un motif évolutif', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_6_id AND display_order = 4
  );

  -- Item 7: Organiser et lire des données
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_7_id, 'Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe (lecture immédiate)', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_7_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_7_id, 'Construire un tableau pour présenter des données et y filtrer une information selon un critère', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_7_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_7_id, 'Tracer un diagramme (en barres ou circulaire) pour représenter un ensemble de données', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_7_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_7_id, 'Mener une enquête statistique : planifier, recueillir, organiser, choisir la représentation, analyser', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_7_id AND display_order = 4
  );

  -- Item 8: Probabilités
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_8_id, 'Reconnaître si une situation est certaine, impossible, peu probable ou très probable ; situer une probabilité sur une échelle 0 → 1', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_8_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_8_id, 'Dénombrer les issues possibles d''une expérience aléatoire et celles qui correspondent à un événement (« a chances sur b »)', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_8_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_8_id, 'Calculer une probabilité dans une situation simple d''équiprobabilité et l''exprimer sous forme de fraction, de décimal ou de pourcentage', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_8_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_8_id, 'Comparer une fréquence observée et une probabilité calculée sur une expérience aléatoire répétée (approche fréquentiste)', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_8_id AND display_order = 4
  );

  -- Item 9: Proportionnalité et pourcentages
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_9_id, 'Identifier une situation de proportionnalité et la distinguer d''une situation non proportionnelle', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_9_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_9_id, 'Résoudre un problème de proportionnalité par linéarité (multiplicative ou additive) ou par retour à l''unité ; représenter par un tableau (avec noms et unités)', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_9_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_9_id, 'Comprendre, calculer et appliquer un pourcentage', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_9_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_9_id, 'Résoudre un problème d''échelle (carte, plan) en mobilisant la proportionnalité', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_9_id AND display_order = 4
  );

  -- Item 10: Figures usuelles (lexique, reconnaissance)
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_10_id, 'Reconnaître et nommer les figures planes usuelles : carré, rectangle, triangle, cercle', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_10_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_10_id, 'Connaître et utiliser le lexique géométrique : sommet, côté, segment, droite, demi-droite, angle, perpendiculaire, parallèle, rayon, diamètre', 'automatisme', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_10_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_10_id, 'Coder et lire un codage d''une figure : angles droits, longueurs égales, points alignés, axes de symétrie', 'automatisme', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_10_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_10_id, 'Reconnaître les figures particulières à partir de leurs propriétés : triangles (isocèle, équilatéral, rectangle), quadrilatères (losange, parallélogramme)', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_10_id AND display_order = 4
  );

  -- Item 11: Constructions
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_11_id, 'Tracer un schéma à main levée d''une figure (avec codages)', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_11_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_11_id, 'Tracer aux instruments une figure usuelle de dimensions données : cercle, triangle, rectangle, carré, losange', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_11_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_11_id, 'Réaliser une construction à partir d''un programme ou d''un schéma : perpendiculaire, parallèle, médiatrice, bissectrice, triangle sous contraintes', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_11_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_11_id, 'Écrire un programme de construction pour qu''un autre puisse reproduire la figure', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_11_id AND display_order = 4
  );

  -- Item 12: Symétrie axiale
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_12_id, 'Reconnaître un axe de symétrie d''une figure et reconnaître si deux figures sont symétriques par rapport à un axe', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_12_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_12_id, 'Compléter une figure par symétrie sur un quadrillage ou sur papier pointé', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_12_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_12_id, 'Construire le symétrique d''un point ou d''une figure par rapport à une droite sur papier uni (aux instruments)', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_12_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_12_id, 'Utiliser les propriétés de conservation (longueurs, angles, alignements) pour effectuer des constructions ou résoudre des problèmes', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_12_id AND display_order = 4
  );

  -- Item 13: Espace (vision 3D, patrons)
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_13_id, 'Identifier (nommer) les solides usuels : pavé, cube, cylindre, cône, boule, pyramide, prisme droit', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_13_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_13_id, 'Connaître le lexique des solides : faces, arêtes, sommets ; reconnaître les caractéristiques d''un solide', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_13_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_13_id, 'Voir dans l''espace : passer entre un assemblage 3D et ses représentations 2D (vues, dénombrement de cubes cachés)', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_13_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_13_id, 'Construire un patron d''un cube ou d''un pavé droit (réactivation/prolongement CM2)', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_13_id AND display_order = 4
  );

  -- Item 14: Longueurs (périmètres)
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_14_id, 'Connaître les unités de longueur (du kilomètre au millimètre) et leurs relations', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_14_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_14_id, 'Convertir entre unités de longueur (cas usuels)', 'automatisme', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_14_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_14_id, 'Calculer le périmètre d''un polygone (carré, rectangle, triangle) et d''un disque (formule π × d)', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_14_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_14_id, 'Calculer le périmètre d''une figure composée ; résoudre un problème impliquant des longueurs', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_14_id AND display_order = 4
  );

  -- Item 15: Aires
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_15_id, 'Connaître les unités d''aire (cm², dm², m²) et leurs relations', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_15_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_15_id, 'Comparer des aires sans recours à la mesure (superposition, découpage/recollement) ; déterminer une aire par quadrillage', 'automatisme', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_15_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_15_id, 'Calculer l''aire d''un carré ou d''un rectangle (formules, première sensibilisation au calcul littéral)', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_15_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_15_id, 'Effectuer des conversions d''aire ; résoudre un problème d''aire (figures composées de rectangles)', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_15_id AND display_order = 4
  );

  -- Item 16: Volumes
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_16_id, 'Connaître l''unité cm³ et reconnaître que 1 cm³ = volume d''un cube de 1 cm d''arête', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_16_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_16_id, 'Comparer des volumes (par superposition mentale, transvasement, dénombrement) ; estimer un volume usuel', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_16_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_16_id, 'Déterminer un volume par dénombrement de cubes (assemblages avec cubes cachés)', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_16_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_16_id, 'Calculer le volume d''un pavé droit (formule L × l × h) ; résoudre un problème de volume composé', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_16_id AND display_order = 4
  );

  -- Item 17: Angles (mesure)
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_17_id, 'Connaître le lexique des angles (droit, plat, plein, nul, aigu, obtus) ; reconnaître les angles opposés par le sommet, adjacents, supplémentaires', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_17_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_17_id, 'Mesurer un angle avec un rapporteur ; tracer un angle de mesure donnée', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_17_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_17_id, 'Utiliser la somme des angles d''un triangle (180°) pour calculer un angle manquant', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_17_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_17_id, 'Utiliser les propriétés des angles (opposés, supplémentaires, triangles particuliers) pour calculer ou justifier dans une configuration plane', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_17_id AND display_order = 4
  );

  -- Item 18: Durées et repérage dans le temps
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_18_id, 'Lire l''heure (cadran à aiguilles, digital) et connaître les unités de durée (jour, heure, minute, seconde) et leurs relations', 'automatisme', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_18_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_18_id, 'Convertir entre unités de durée (système sexagésimal : heures, minutes, secondes)', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_18_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_18_id, 'Calculer la durée entre deux horaires ou un horaire à partir d''une durée', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_18_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_18_id, 'Résoudre un problème impliquant horaires et durées (avec conversions sexagésimal ↔ décimal)', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_18_id AND display_order = 4
  );

  -- Item 19: Programmer
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_19_id, 'Identifier une instruction, une séquence d''instructions, une répétition dans un programme', 'capacite_attendue', 1, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_19_id AND display_order = 1
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_19_id, 'Exécuter une séquence d''instructions à la main ou à l''aide d''un outil (Scratch, robot)', 'capacite_attendue', 2, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_19_id AND display_order = 2
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_19_id, 'Produire une séquence d''instructions pour accomplir une tâche imposée (déplacement, tracé)', 'capacite_attendue', 3, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_19_id AND display_order = 3
  );
  INSERT INTO public.skills
    (objective_id, name, knowledge_type, display_order, niveau_scolaire)
  SELECT v_obj_19_id, 'Programmer la construction d''un chemin en utilisant entrées, sorties et répétitions', 'capacite_attendue', 4, '6e'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE objective_id = v_obj_19_id AND display_order = 4
  );

  -- ========================================================================
  -- FAMILY B — math_competences
  -- ========================================================================

  -- Competence 1: Chercher
  SELECT id INTO v_comp_chercher_id
    FROM public.math_competences
   WHERE code = 'chercher';
  IF v_comp_chercher_id IS NULL THEN
    INSERT INTO public.math_competences (code, name, gloss_for_student, display_order)
    VALUES ('chercher', 'Chercher', 'essayer des pistes, persévérer', 1)
    RETURNING id INTO v_comp_chercher_id;
  END IF;

  -- Competence 2: Calculer
  SELECT id INTO v_comp_calculer_id
    FROM public.math_competences
   WHERE code = 'calculer';
  IF v_comp_calculer_id IS NULL THEN
    INSERT INTO public.math_competences (code, name, gloss_for_student, display_order)
    VALUES ('calculer', 'Calculer', 'calculer juste, vérifier', 2)
    RETURNING id INTO v_comp_calculer_id;
  END IF;

  -- Competence 3: Raisonner
  SELECT id INTO v_comp_raisonner_id
    FROM public.math_competences
   WHERE code = 'raisonner';
  IF v_comp_raisonner_id IS NULL THEN
    INSERT INTO public.math_competences (code, name, gloss_for_student, display_order)
    VALUES ('raisonner', 'Raisonner', 'justifier mes affirmations', 3)
    RETURNING id INTO v_comp_raisonner_id;
  END IF;

  -- Competence 4: Communiquer
  SELECT id INTO v_comp_communiquer_id
    FROM public.math_competences
   WHERE code = 'communiquer';
  IF v_comp_communiquer_id IS NULL THEN
    INSERT INTO public.math_competences (code, name, gloss_for_student, display_order)
    VALUES ('communiquer', 'Communiquer', 'expliquer ma démarche', 4)
    RETURNING id INTO v_comp_communiquer_id;
  END IF;

  -- Competence 5: Modéliser
  SELECT id INTO v_comp_modeliser_id
    FROM public.math_competences
   WHERE code = 'modeliser';
  IF v_comp_modeliser_id IS NULL THEN
    INSERT INTO public.math_competences (code, name, gloss_for_student, display_order)
    VALUES ('modeliser', 'Modéliser', 'traduire en maths', 5)
    RETURNING id INTO v_comp_modeliser_id;
  END IF;

  -- Competence 6: Représenter
  SELECT id INTO v_comp_representer_id
    FROM public.math_competences
   WHERE code = 'representer';
  IF v_comp_representer_id IS NULL THEN
    INSERT INTO public.math_competences (code, name, gloss_for_student, display_order)
    VALUES ('representer', 'Représenter', 'schémas, tableaux, figures', 6)
    RETURNING id INTO v_comp_representer_id;
  END IF;

  -- ========================================================================
  -- FAMILY B — math_competence_subdimensions
  -- ========================================================================

  -- Competence: Chercher
  -- Subdimension A: S'approprier le problème
  SELECT id INTO v_subdim_chercher_a_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_chercher_id AND letter = 'A';
  IF v_subdim_chercher_a_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_chercher_id, 'A', 'S''approprier le problème', 1)
    RETURNING id INTO v_subdim_chercher_a_id;
  END IF;

  -- Subdimension B: S'engager et explorer
  SELECT id INTO v_subdim_chercher_b_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_chercher_id AND letter = 'B';
  IF v_subdim_chercher_b_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_chercher_id, 'B', 'S''engager et explorer', 2)
    RETURNING id INTO v_subdim_chercher_b_id;
  END IF;

  -- Subdimension C: Conduire et réorienter
  SELECT id INTO v_subdim_chercher_c_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_chercher_id AND letter = 'C';
  IF v_subdim_chercher_c_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_chercher_id, 'C', 'Conduire et réorienter', 3)
    RETURNING id INTO v_subdim_chercher_c_id;
  END IF;

  -- Subdimension D: Mobiliser des ressources
  SELECT id INTO v_subdim_chercher_d_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_chercher_id AND letter = 'D';
  IF v_subdim_chercher_d_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_chercher_id, 'D', 'Mobiliser des ressources', 4)
    RETURNING id INTO v_subdim_chercher_d_id;
  END IF;

  -- Competence: Calculer
  -- Subdimension A: Choisir une stratégie de calcul
  SELECT id INTO v_subdim_calculer_a_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_calculer_id AND letter = 'A';
  IF v_subdim_calculer_a_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_calculer_id, 'A', 'Choisir une stratégie de calcul', 1)
    RETURNING id INTO v_subdim_calculer_a_id;
  END IF;

  -- Subdimension B: Exécuter le calcul
  SELECT id INTO v_subdim_calculer_b_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_calculer_id AND letter = 'B';
  IF v_subdim_calculer_b_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_calculer_id, 'B', 'Exécuter le calcul', 2)
    RETURNING id INTO v_subdim_calculer_b_id;
  END IF;

  -- Subdimension C: Calculer avec des lettres
  SELECT id INTO v_subdim_calculer_c_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_calculer_id AND letter = 'C';
  IF v_subdim_calculer_c_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_calculer_id, 'C', 'Calculer avec des lettres', 3)
    RETURNING id INTO v_subdim_calculer_c_id;
  END IF;

  -- Subdimension D: Contrôler le résultat
  SELECT id INTO v_subdim_calculer_d_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_calculer_id AND letter = 'D';
  IF v_subdim_calculer_d_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_calculer_id, 'D', 'Contrôler le résultat', 4)
    RETURNING id INTO v_subdim_calculer_d_id;
  END IF;

  -- Competence: Raisonner
  -- Subdimension A: Organiser
  SELECT id INTO v_subdim_raisonner_a_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_raisonner_id AND letter = 'A';
  IF v_subdim_raisonner_a_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_raisonner_id, 'A', 'Organiser', 1)
    RETURNING id INTO v_subdim_raisonner_a_id;
  END IF;

  -- Subdimension B: Justifier et démontrer
  SELECT id INTO v_subdim_raisonner_b_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_raisonner_id AND letter = 'B';
  IF v_subdim_raisonner_b_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_raisonner_id, 'B', 'Justifier et démontrer', 2)
    RETURNING id INTO v_subdim_raisonner_b_id;
  END IF;

  -- Subdimension C: Utiliser des outils logiques
  SELECT id INTO v_subdim_raisonner_c_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_raisonner_id AND letter = 'C';
  IF v_subdim_raisonner_c_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_raisonner_id, 'C', 'Utiliser des outils logiques', 3)
    RETURNING id INTO v_subdim_raisonner_c_id;
  END IF;

  -- Subdimension D: Valider et critiquer
  SELECT id INTO v_subdim_raisonner_d_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_raisonner_id AND letter = 'D';
  IF v_subdim_raisonner_d_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_raisonner_id, 'D', 'Valider et critiquer', 4)
    RETURNING id INTO v_subdim_raisonner_d_id;
  END IF;

  -- Competence: Communiquer
  -- Subdimension A: Employer un langage mathématique correct
  SELECT id INTO v_subdim_communiquer_a_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_communiquer_id AND letter = 'A';
  IF v_subdim_communiquer_a_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_communiquer_id, 'A', 'Employer un langage mathématique correct', 1)
    RETURNING id INTO v_subdim_communiquer_a_id;
  END IF;

  -- Subdimension B: Expliquer ma démarche
  SELECT id INTO v_subdim_communiquer_b_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_communiquer_id AND letter = 'B';
  IF v_subdim_communiquer_b_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_communiquer_id, 'B', 'Expliquer ma démarche', 2)
    RETURNING id INTO v_subdim_communiquer_b_id;
  END IF;

  -- Subdimension C: Comprendre et échanger
  SELECT id INTO v_subdim_communiquer_c_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_communiquer_id AND letter = 'C';
  IF v_subdim_communiquer_c_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_communiquer_id, 'C', 'Comprendre et échanger', 3)
    RETURNING id INTO v_subdim_communiquer_c_id;
  END IF;

  -- Competence: Modéliser
  -- Subdimension A: Mathématiser la situation
  SELECT id INTO v_subdim_modeliser_a_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_modeliser_id AND letter = 'A';
  IF v_subdim_modeliser_a_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_modeliser_id, 'A', 'Mathématiser la situation', 1)
    RETURNING id INTO v_subdim_modeliser_a_id;
  END IF;

  -- Subdimension B: Revenir à la situation réelle
  SELECT id INTO v_subdim_modeliser_b_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_modeliser_id AND letter = 'B';
  IF v_subdim_modeliser_b_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_modeliser_id, 'B', 'Revenir à la situation réelle', 2)
    RETURNING id INTO v_subdim_modeliser_b_id;
  END IF;

  -- Subdimension C: Valider et ajuster le modèle
  SELECT id INTO v_subdim_modeliser_c_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_modeliser_id AND letter = 'C';
  IF v_subdim_modeliser_c_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_modeliser_id, 'C', 'Valider et ajuster le modèle', 3)
    RETURNING id INTO v_subdim_modeliser_c_id;
  END IF;

  -- Competence: Représenter
  -- Subdimension A: Lire et interpréter
  SELECT id INTO v_subdim_representer_a_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_representer_id AND letter = 'A';
  IF v_subdim_representer_a_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_representer_id, 'A', 'Lire et interpréter', 1)
    RETURNING id INTO v_subdim_representer_a_id;
  END IF;

  -- Subdimension B: Produire une représentation
  SELECT id INTO v_subdim_representer_b_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_representer_id AND letter = 'B';
  IF v_subdim_representer_b_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_representer_id, 'B', 'Produire une représentation', 2)
    RETURNING id INTO v_subdim_representer_b_id;
  END IF;

  -- Subdimension C: Convertir et mettre en relation
  SELECT id INTO v_subdim_representer_c_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_representer_id AND letter = 'C';
  IF v_subdim_representer_c_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_representer_id, 'C', 'Convertir et mettre en relation', 3)
    RETURNING id INTO v_subdim_representer_c_id;
  END IF;

  -- Subdimension D: Choisir et exploiter
  SELECT id INTO v_subdim_representer_d_id
    FROM public.math_competence_subdimensions
   WHERE math_competence_id = v_comp_representer_id AND letter = 'D';
  IF v_subdim_representer_d_id IS NULL THEN
    INSERT INTO public.math_competence_subdimensions
      (math_competence_id, letter, name, display_order)
    VALUES (v_comp_representer_id, 'D', 'Choisir et exploiter', 4)
    RETURNING id INTO v_subdim_representer_d_id;
  END IF;

  -- ========================================================================
  -- FAMILY B — skills (observables, 56 rows)
  -- ========================================================================

  -- Chercher > A — S'approprier le problème
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_a_id, 'A1', 'Je reformule ce qui est demandé.',
         'Reformule la question avec ses propres mots, sans recopier l''énoncé.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_a_id AND observable_code = 'A1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_a_id, 'A2', 'Je trie les informations utiles.',
         'Distingue les informations utiles des données inutiles ou distractrices.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_a_id AND observable_code = 'A2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_a_id, 'A3', 'Je produis une représentation pour comprendre.',
         'Construit une représentation (schéma, figure, tableau) pour clarifier la situation.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_a_id AND observable_code = 'A3'
  );

  -- Chercher > B — S'engager et explorer
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_b_id, 'B1', 'Je produis un premier essai sans aide.',
         'Produit une première tentative personnelle avant toute demande de méthode.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_b_id AND observable_code = 'B1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_b_id, 'B2', 'J''essaie sur des cas simples.',
         'Explore en traitant des cas particuliers ou simplifiés.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_b_id AND observable_code = 'B2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_b_id, 'B3', 'J''émets une conjecture.',
         'Formule une hypothèse ou une affirmation à vérifier.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_b_id AND observable_code = 'B3'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_b_id, 'B4', 'J''expérimente pour produire des données.',
         'Manipule, calcule ou teste pour produire des données exploitables.', 4, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_b_id AND observable_code = 'B4'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_b_id, 'B5', 'Je détecte des invariants ou des régularités.',
         'Repère une régularité, un motif ou une propriété qui se répète.', 5, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_b_id AND observable_code = 'B5'
  );

  -- Chercher > C — Conduire et réorienter
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_c_id, 'C1', 'J''organise ma démarche, par exemple en la découpant en étapes ou en sous-problèmes.',
         'Structure sa recherche de façon visible (étapes ordonnées, sous-problèmes), plutôt que d''accumuler des essais épars.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_c_id AND observable_code = 'C1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_c_id, 'C2', 'Je teste une autre piste quand je suis bloqué.',
         'Face à un blocage, abandonne la voie en cours et engage une autre piste, plutôt que de rester figé.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_c_id AND observable_code = 'C2'
  );

  -- Chercher > D — Mobiliser des ressources
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_d_id, 'D1', 'Je mobilise une connaissance utile (une propriété, une définition, un résultat déjà appris).',
         'Convoque à bon escient une connaissance ponctuelle (propriété, définition, résultat).', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_d_id AND observable_code = 'D1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_d_id, 'D2', 'Je mobilise un outil adapté (instrument, logiciel, technique, représentation).',
         'Met en œuvre un outil adapté (instrument, logiciel, technique, représentation).', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_d_id AND observable_code = 'D2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_chercher_d_id, 'D3', 'Je rapproche ce problème d''un problème déjà rencontré.',
         'Reconnaît que la situation entière est analogue à un problème antérieur.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_chercher_d_id AND observable_code = 'D3'
  );

  -- Calculer > A — Choisir une stratégie de calcul
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_a_id, 'A1', 'Je choisis un mode de calcul adapté (mental, posé, calculatrice, tableur).',
         'Choisit un mode de calcul adapté à la situation (mental, posé, instrumenté) plutôt qu''un mode imposé par habitude.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_a_id AND observable_code = 'A1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_a_id, 'A2', 'Je décide si un résultat exact ou approché est nécessaire.',
         'Juge si la situation appelle un résultat exact ou une valeur approchée, et tranche en conséquence.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_a_id AND observable_code = 'A2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_a_id, 'A3', 'J''organise un calcul en plusieurs étapes.',
         'Décompose un calcul complexe en étapes ordonnées, avec des résultats intermédiaires.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_a_id AND observable_code = 'A3'
  );

  -- Calculer > B — Exécuter le calcul
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_b_id, 'B1', 'Je calcule de tête de façon sûre.',
         'Effectue un calcul mental fiable sur les nombres en jeu.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_b_id AND observable_code = 'B1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_b_id, 'B2', 'Je pose et j''effectue une opération correctement.',
         'Pose et exécute une opération écrite sans erreur de technique.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_b_id AND observable_code = 'B2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_b_id, 'B3', 'J''utilise la calculatrice ou le tableur pour écrire un calcul et lire le résultat.',
         'Écrit un calcul à la calculatrice ou au tableur, en lit le résultat, et y recourt à bon escient.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_b_id AND observable_code = 'B3'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_b_id, 'B4', 'J''applique une procédure ou un algorithme connu.',
         'Met en œuvre une procédure ou un algorithme connu (conversion, formule, suite d''opérations).', 4, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_b_id AND observable_code = 'B4'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_b_id, 'B5', 'Je mène mes calculs en gérant correctement les unités (conversions, cohérence).',
         'Gère les unités au cours du calcul : convertit, suit la cohérence dimensionnelle, n''additionne pas des grandeurs hétérogènes.', 5, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_b_id AND observable_code = 'B5'
  );

  -- Calculer > C — Calculer avec des lettres
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_c_id, 'C1', 'Je calcule la valeur d''une expression en remplaçant les lettres.',
         'Substitue des valeurs aux lettres et calcule l''expression numérique obtenue.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_c_id AND observable_code = 'C1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_c_id, 'C2', 'Je transforme une expression littérale (développer, factoriser, réduire).',
         'Transforme une expression littérale (développe, factorise, réduit) sans erreur.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_c_id AND observable_code = 'C2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_c_id, 'C3', 'Je calcule avec des lettres pour établir une expression générale.',
         'Conduit un calcul littéral pour produire une expression ou une formule générale.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_c_id AND observable_code = 'C3'
  );

  -- Calculer > D — Contrôler le résultat
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_d_id, 'D1', 'Je vérifie que mon résultat est plausible (ordre de grandeur, signe, unité).',
         'Apprécie la plausibilité du résultat : ordre de grandeur, signe, unité, taille attendue.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_d_id AND observable_code = 'D1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_calculer_d_id, 'D2', 'Je contrôle mon résultat par un autre moyen (opération inverse, second calcul).',
         'Vérifie par un moyen indépendant (opération inverse, autre méthode, second calcul).', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_calculer_d_id AND observable_code = 'D2'
  );

  -- Raisonner > A — Organiser
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_a_id, 'A1', 'J''organise mon raisonnement en étapes enchaînées dans un ordre logique.',
         'Enchaîne les étapes de son raisonnement dans un ordre où chacune prépare logiquement la suivante.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_a_id AND observable_code = 'A1'
  );

  -- Raisonner > B — Justifier et démontrer
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_b_id, 'B1', 'Je justifie mes affirmations en m''appuyant sur des résultats connus.',
         'Fonde chaque affirmation sur un résultat établi (propriété, théorème, définition, donnée), et en tire la conséquence.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_b_id AND observable_code = 'B1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_b_id, 'B2', 'Je raisonne sur le cas général, pas seulement sur des exemples.',
         'Conduit son raisonnement sur un objet ou un cas général, sans se limiter à la vérification sur des exemples.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_b_id AND observable_code = 'B2'
  );

  -- Raisonner > C — Utiliser des outils logiques
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_c_id, 'C1', 'Je trouve un contre-exemple pour montrer qu''une affirmation est fausse.',
         'Produit un contre-exemple pertinent pour réfuter une affirmation.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_c_id AND observable_code = 'C1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_c_id, 'C2', 'J''utilise les outils de la logique : disjonction de cas, « si… alors », contraposée, raisonnement par l''absurde.',
         'Mobilise un mode de raisonnement logique : disjonction de cas, implication « si… alors », contraposée, raisonnement par l''absurde.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_c_id AND observable_code = 'C2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_c_id, 'C3', 'Je distingue une propriété de sa réciproque, et je ne confonds pas les deux sens d''une implication.',
         'Distingue une propriété de sa réciproque ; n''infère pas l''une de l''autre sans justification.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_c_id AND observable_code = 'C3'
  );

  -- Raisonner > D — Valider et critiquer
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_d_id, 'D1', 'Je distingue ce qui est démontré de ce qui est seulement vérifié sur des exemples.',
         'Distingue une vérification empirique (sur des exemples) d''une démonstration (valable en général).', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_d_id AND observable_code = 'D1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_raisonner_d_id, 'D2', 'Je relis un raisonnement d''un œil critique pour repérer et corriger les erreurs.',
         'Relit un raisonnement — le sien ou celui d''autrui — pour y détecter et corriger une erreur ou une faille.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_raisonner_d_id AND observable_code = 'D2'
  );

  -- Communiquer > A — Employer un langage mathématique correct
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_communiquer_a_id, 'A1', 'J''emploie le vocabulaire mathématique précis.',
         'Emploie le vocabulaire mathématique exact et à propos (et non un terme approximatif ou courant).', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_communiquer_a_id AND observable_code = 'A1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_communiquer_a_id, 'A2', 'J''utilise correctement les symboles et les notations.',
         'Écrit symboles et notations correctement (signes, parenthèses, égalités, unités).', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_communiquer_a_id AND observable_code = 'A2'
  );

  -- Communiquer > B — Expliquer ma démarche
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_communiquer_b_id, 'B1', 'J''explique ma démarche ou mon résultat par écrit, de façon claire et structurée.',
         'Rédige une explication claire et structurée de sa démarche ou de son résultat, compréhensible sans commentaire oral.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_communiquer_b_id AND observable_code = 'B1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_communiquer_b_id, 'B2', 'J''explique ma démarche à l''oral, de façon claire et structurée.',
         'Expose oralement sa démarche de façon claire, structurée et audible.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_communiquer_b_id AND observable_code = 'B2'
  );

  -- Communiquer > C — Comprendre et échanger
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_communiquer_c_id, 'C1', 'Je reformule ou je questionne pour clarifier.',
         'Reformule ce qu''il a compris, ou pose une question pertinente pour lever une ambiguïté.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_communiquer_c_id AND observable_code = 'C1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_communiquer_c_id, 'C2', 'J''argumente dans l''échange : je défends mon point et je réponds aux objections.',
         'Argumente dans l''échange : défend sa position, prend en compte et répond aux objections.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_communiquer_c_id AND observable_code = 'C2'
  );

  -- Modéliser > A — Mathématiser la situation
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_a_id, 'A1', 'Je tente de traduire la situation en mathématiques.',
         'Amorce un traitement mathématique de la situation : quantifie, esquisse une mise en équation ou un schéma, même imparfait ou inadapté.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_a_id AND observable_code = 'A1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_a_id, 'A2', 'J''identifie les grandeurs et les relations utiles, et je néglige ce qui ne l''est pas.',
         'Sélectionne les grandeurs et relations pertinentes, écarte le superflu, pose au besoin des hypothèses simplificatrices.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_a_id AND observable_code = 'A2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_a_id, 'A3', 'Je construis un modèle mathématique fidèle à la situation.',
         'Aboutit à un modèle mathématique fidèle à la situation : les grandeurs et les relations du réel y sont correctement rendues (équation, fonction, configuration, modèle probabiliste...).', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_a_id AND observable_code = 'A3'
  );

  -- Modéliser > B — Revenir à la situation réelle
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_b_id, 'B1', 'J''interprète le résultat mathématique dans le contexte de la situation.',
         'Réexprime le résultat mathématique dans les termes de la situation réelle (et non comme un nombre nu).', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_b_id AND observable_code = 'B1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_b_id, 'B2', 'Je vérifie que ma réponse est vraisemblable dans la situation.',
         'Apprécie la plausibilité concrète du résultat (ordre de grandeur, sens physique, cohérence avec la situation).', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_b_id AND observable_code = 'B2'
  );

  -- Modéliser > C — Valider et ajuster le modèle
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_c_id, 'C1', 'Je confronte le modèle à la réalité et je le valide ou je l''invalide.',
         'Confronte le modèle aux faits et juge s''il convient : le valide ou l''invalide.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_c_id AND observable_code = 'C1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_c_id, 'C2', 'J''identifie les hypothèses et les limites du modèle.',
         'Explicite les hypothèses retenues et les limites du modèle (domaine de validité, simplifications).', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_c_id AND observable_code = 'C2'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_modeliser_c_id, 'C3', 'J''ajuste le modèle ou j''en propose un meilleur.',
         'Corrige le modèle, l''affine ou en propose un plus pertinent.', 3, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_modeliser_c_id AND observable_code = 'C3'
  );

  -- Représenter > A — Lire et interpréter
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_a_id, 'A1', 'Je lis une représentation pour en extraire une information.',
         'Extrait une information exacte d''une représentation donnée (graphique, tableau, figure, écriture).', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_a_id AND observable_code = 'A1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_a_id, 'A2', 'J''interprète une représentation : je comprends ce qu''elle décrit, au-delà de la lecture brute.',
         'Dégage la signification de la représentation — ce qu''elle décrit, sa tendance, sa structure — au-delà de la valeur lue.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_a_id AND observable_code = 'A2'
  );

  -- Représenter > B — Produire une représentation
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_b_id, 'B1', 'Ma représentation est correcte sur la forme (codages, en-têtes, échelle, perspective…).',
         'Produit une représentation correcte sur la forme : codages sur figure, en-têtes et unités d''un tableau, axes / échelle / légende d''un graphique, règles de perspective.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_b_id AND observable_code = 'B1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_b_id, 'B2', 'Ma représentation est fidèle à l''objet ou aux données représentés.',
         'Produit une représentation fidèle à l''objet ou aux données : ce qui est représenté correspond à ce qui devait l''être.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_b_id AND observable_code = 'B2'
  );

  -- Représenter > C — Convertir et mettre en relation
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_c_id, 'C1', 'Je passe d''une représentation à une autre du même objet.',
         'Convertit une représentation en une autre du même objet, sans en altérer le sens (formule ↔ courbe, tableau ↔ graphique, figure ↔ coordonnées...).', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_c_id AND observable_code = 'C1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_c_id, 'C2', 'Je mets en relation plusieurs représentations du même objet et je contrôle qu''elles s''accordent.',
         'Fait correspondre plusieurs représentations du même objet et vérifie leur cohérence mutuelle.', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_c_id AND observable_code = 'C2'
  );

  -- Représenter > D — Choisir et exploiter
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_d_id, 'D1', 'Je choisis la représentation la plus adaptée, au besoin en en comparant plusieurs.',
         'Choisit la représentation qui rend le problème le plus traitable, le cas échéant après en avoir comparé plusieurs.', 1, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_d_id AND observable_code = 'D1'
  );
  INSERT INTO public.skills
    (subdimension_id, observable_code, name, teacher_grid_text, display_order, niveau_scolaire)
  SELECT v_subdim_representer_d_id, 'D2', 'Je m''appuie sur une représentation pour faire avancer mon travail (recherche, calcul).',
         'Mobilise une représentation comme appui pour progresser (orienter une recherche, conduire un calcul).', 2, 'college'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills
    WHERE subdimension_id = v_subdim_representer_d_id AND observable_code = 'D2'
  );

END $$;
