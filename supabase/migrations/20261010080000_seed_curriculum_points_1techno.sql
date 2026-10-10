-- ============================================================================
-- Seed des points de programme de 1re TECHNOLOGIQUE (programme de mathématiques
-- de la classe de première de la voie technologique, toutes séries) + RÉFÉRENCES.
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/seed-1techno.md (VALIDÉ INTÉGRALEMENT par
-- David le 2026-10-08 : scissions, entretien, « modéliser » retirés, références,
-- discutables, T1, T2) ; fichier GÉNÉRÉ — ne pas éditer à la main. Aucun changement
-- d'arbre ; pas d'ancien seed pour ce niveau.
--   * 105 points, codes 1TECHNO-001…1TECHNO-105, grade '1_TECHNO', tous attendus
--     (T2 : Situations algorithmiques attendues) ; la série est dite dans la rubrique
--     (T1 : « Algorithmique et programmation (sauf série STD2A) », « Activités
--     géométriques (série STD2A) > … »).
--   * 89 références du grade '1_TECHNO' : lignes propres de la partie
--     Automatismes (dont 1 auto-référence), liste de 2de reprise (C16), entretien du
--     vocabulaire de 2de (U5/V1). Parcours 1_TECHNO → 2.
--
-- MIGRATION ADDITIVE (aucune ligne modifiée ni supprimée). Rollback (⚠️ scopé) :
--   delete from public.curriculum_point_automatismes where grade = '1_TECHNO';
--   delete from public.curriculum_points where grade = '1_TECHNO';
-- ⚠️ Ce rollback n'est anodin que tant qu'AUCUN usage ne s'accroche à ces
-- points. Supprimer un point efface EN SILENCE (ON DELETE CASCADE) : le suivi
-- élève (student_point_state), les rattachements d'exercices du prof
-- (exercise_curriculum_points), journal_entry_points, srs_anti_fraud_flags, et
-- les références d'automatismes d'AUTRES grades (Tle techno…) qui viseraient ces
-- points ; question_template_points (ON DELETE RESTRICT) fait échouer le rollback.
-- Dès qu'un usage existe : DESTRUCTIF (données d'élèves mineurs) — arrêt obligatoire
-- et accord explicite de David (règle CLAUDE.md).
-- ============================================================================

-- ---- 1. Les 105 points ------------------------------------------------------

-- Vocabulaire ensembliste et logique
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-001$pt$, $pt$Identifier le statut d'une égalité (identité, équation) et celui de la ou des lettres utilisées (variable, indéterminée, inconnue, paramètre)$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Vocabulaire ensembliste et logique$pt$, '1_TECHNO', 1, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$statut des lettres et des égalités$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Proposition mathématique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Logique$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-002$pt$, $pt$Utiliser à bon escient les expressions « condition nécessaire », « condition suffisante », « équivalence logique »$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Vocabulaire ensembliste et logique$pt$, '1_TECHNO', 2, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Implication et équivalence$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Logique$pt$)));

-- Algorithmique et programmation (sauf série STD2A)
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-003$pt$, $pt$Utiliser un générateur de nombres aléatoires entre 0 et 1 pour simuler une loi de Bernoulli de paramètre $p$$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 3, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Variables et instructions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-004$pt$, $pt$Utiliser la notion de compteur$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 4, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Boucles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-005$pt$, $pt$Utiliser le principe d'accumulateur pour calculer une somme, un produit$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 5, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Boucles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-006$pt$, $pt$Identifier les entrées et les sorties d'une fonction$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 6, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$définir une fonction$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonctions Python$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-007$pt$, $pt$Structurer un programme en ayant recours aux fonctions$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 7, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonctions Python$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-008$pt$, $pt$Générer une liste en extension ou par ajouts successifs$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 8, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$créer une liste$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Listes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-009$pt$, $pt$Générer une liste en compréhension$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 9, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$liste en compréhension$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Listes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-010$pt$, $pt$Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 10, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$éléments et indices$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Listes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-011$pt$, $pt$Itérer sur les éléments d'une liste$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 11, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parcourir une liste$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Listes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algorithmique$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-012$pt$, $pt$Traiter un fichier contenant des données réelles pour en extraire de l'information et l'analyser$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 12, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Tableaux croisés$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-013$pt$, $pt$Réaliser un tableau croisé de données sur deux critères à partir de données brutes$pt$, 'algorithme', 'attendu', 'diversite', $pt$Algorithmique et programmation (sauf série STD2A)$pt$, '1_TECHNO', 13, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$tableau croisé d'effectifs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Tableaux croisés$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));

-- Activités géométriques (série STD2A) > Géométrie plane
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-014$pt$, $pt$Exemples de polygones réguliers$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, '1_TECHNO', 14, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$polygones réguliers$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-015$pt$, $pt$Exemples de frises ou de pavages$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, '1_TECHNO', 15, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$frises et pavages$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Translations$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-016$pt$, $pt$Analyser et construire des polygones réguliers à l'aide d'un motif élémentaire et de transformations du plan$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, '1_TECHNO', 16, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$polygones réguliers$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-017$pt$, $pt$Calculer des distances, des angles, des aires et des périmètres associés aux polygones réguliers$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, '1_TECHNO', 17, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$polygones réguliers$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-018$pt$, $pt$Créer une figure à partir d'un motif élémentaire par répétition d'une ou de deux transformations simples$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, '1_TECHNO', 18, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$frises et pavages$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Translations$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-019$pt$, $pt$Analyser une frise ou un pavage et en rechercher un motif élémentaire$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, '1_TECHNO', 19, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$frises et pavages$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Translations$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));

-- Activités géométriques (série STD2A) > Géométrie dans l'espace
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-020$pt$, $pt$Coordonnées d'un point dans un repère orthonormal de l'espace$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 20, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Repérage dans l'espace$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-021$pt$, $pt$Distance entre deux points$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 21, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Repérage dans l'espace$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-022$pt$, $pt$Perspective cavalière : projection sur un plan parallèlement à une droite$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 22, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective cavalière$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-023$pt$, $pt$Propriétés conservées (milieux, contacts, rapports de longueurs) et non conservées (longueurs, angles) par une projection parallèle$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 23, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective cavalière$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-024$pt$, $pt$Cylindres de révolution$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 24, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître et décrire$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-025$pt$, $pt$Sections planes d'un cube$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 25, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$sections planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-026$pt$, $pt$Sections planes d'un cylindre de révolution ; ellipses$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 26, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$sections planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-027$pt$, $pt$Utiliser la représentation en perspective cavalière d'un quadrillage ou d'un cube pour représenter d'autres objets$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 27, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective cavalière$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-028$pt$, $pt$Représenter en perspective ou en vraie grandeur des sections planes$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 28, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$sections planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-029$pt$, $pt$Construire des sections planes de cubes et de cylindres de révolution$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 29, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$sections planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-030$pt$, $pt$Construire un parallélogramme circonscrit à une ellipse$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 30, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$coniques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-031$pt$, $pt$Construire l'image perspective d'un cercle à partir d'un carré circonscrit au cercle$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, '1_TECHNO', 31, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective cavalière$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));

-- Analyse > Suites numériques
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-032$pt$, $pt$Différents modes de génération d'une suite numérique$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 32, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$explicite ou par récurrence$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-033$pt$, $pt$Sens de variation d'une suite$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 33, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$sens de variation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-034$pt$, $pt$Représentation graphique : nuage de points $(n, u(n))$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 34, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-035$pt$, $pt$Suites arithmétiques (modèles discrets d'évolutions absolues constantes) : relation de récurrence$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 35, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-036$pt$, $pt$Suites géométriques à termes strictement positifs (modèles discrets d'évolutions relatives constantes) : relation de récurrence$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 36, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-037$pt$, $pt$Suites arithmétiques : explicitation du terme de rang $n$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 37, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$terme général$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-038$pt$, $pt$Suites géométriques : explicitation du terme de rang $n$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 38, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$terme général$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-039$pt$, $pt$Suites arithmétiques : sens de variation$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 39, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-040$pt$, $pt$Suites géométriques : sens de variation$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 40, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-041$pt$, $pt$Suites arithmétiques et géométriques : représentation graphique$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 41, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-042$pt$, $pt$Reconnaitre si une situation relève d'un modèle discret de variation linéaire ou exponentielle$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 42, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-043$pt$, $pt$Calculer un terme de rang donné d'une suite définie par une relation fonctionnelle ou une relation de récurrence$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 43, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$calculer un terme$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-044$pt$, $pt$Réaliser et exploiter la représentation graphique des termes d'une suite$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 44, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-045$pt$, $pt$Conjecturer, à partir de sa représentation graphique, la nature arithmétique ou géométrique d'une suite$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 45, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-046$pt$, $pt$Démontrer qu'une suite est arithmétique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 46, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-047$pt$, $pt$Démontrer qu'une suite est géométrique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 47, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-048$pt$, $pt$Déterminer le sens de variation d'une suite arithmétique à l'aide de la raison$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 48, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$raison$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-049$pt$, $pt$Déterminer le sens de variation d'une suite géométrique à l'aide de la raison$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 49, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$raison$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-050$pt$, $pt$Calculer un terme de rang donné d'une suite, une somme finie de termes$pt$, 'algorithme', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 50, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$algorithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-051$pt$, $pt$Déterminer une liste de termes d'une suite et les représenter$pt$, 'algorithme', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 51, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$algorithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-052$pt$, $pt$Déterminer le rang à partir duquel les termes d'une suite sont supérieurs ou inférieurs à un seuil donné, ou aux termes de même rang d'une autre suite$pt$, 'algorithme', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, '1_TECHNO', 52, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$seuil$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));

-- Analyse > Fonctions de la variable réelle
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-053$pt$, $pt$Différents modes de représentation d'une fonction : expression littérale, représentation graphique$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 53, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-054$pt$, $pt$Notations $y = f(x)$ et $x \mapsto f(x)$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 54, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-055$pt$, $pt$Taux de variation, entre deux valeurs de la variable $x$, d'une grandeur $y$ vérifiant $y = f(x)$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 55, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$taux de variation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-056$pt$, $pt$Fonctions monotones sur un intervalle, lien avec le signe du taux de variation$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 56, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$variations$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-057$pt$, $pt$Éléments caractéristiques de la courbe d'une fonction polynôme de degré 2 : allure, axe de symétrie, coordonnées du sommet en lien avec la symétrie et tableau de variation de la fonction$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 57, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parabole$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-058$pt$, $pt$Racines et signe d'un polynôme de degré 2 donné sous forme factorisée (le calcul des racines à l'aide du discriminant ne figure pas au programme)$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 58, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-059$pt$, $pt$Résoudre graphiquement une équation du type $f(x) = k$ ou une inéquation de la forme $f(x) < k$ ou $f(x) > k$$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 59, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$résolution graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-060$pt$, $pt$Interpréter le taux de variation comme pente de la sécante à la courbe passant par deux points distincts$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 60, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$taux de variation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-061$pt$, $pt$Associer une parabole à une expression algébrique de degré 2, pour les fonctions de la forme $x \mapsto ax^2$, $x \mapsto ax^2 + c$, $x \mapsto a(x - x_1)(x - x_2)$$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 61, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parabole$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-062$pt$, $pt$Déterminer des éléments caractéristiques de la fonction $x \mapsto ax^2 + bx + c$ (aucune formule n'est attendue ; l'axe de symétrie se détermine par exemple en résolvant $f(x) = c$)$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 62, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parabole$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-063$pt$, $pt$Vérifier qu'une valeur conjecturée est racine d'un polynôme de degré 2$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 63, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$racines$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-064$pt$, $pt$Savoir factoriser, dans des cas simples, une expression du second degré connaissant au moins une de ses racines$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 64, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$formes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-065$pt$, $pt$Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour trouver ses racines$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 65, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$racines$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-066$pt$, $pt$Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour étudier son signe$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 66, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$signe$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-067$pt$, $pt$Calculer une valeur approchée d'une solution d'une équation par balayage$pt$, 'algorithme', 'attendu', 'diversite', $pt$Analyse > Fonctions de la variable réelle$pt$, '1_TECHNO', 67, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$résolution graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));

-- Analyse > Dérivation
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-068$pt$, $pt$Sécantes à une courbe passant par un point donné ; taux de variation en un point$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 68, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$taux de variation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-069$pt$, $pt$Tangente à une courbe en un point, définie comme position limite des sécantes passant par ce point$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 69, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$tangente$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-070$pt$, $pt$Nombre dérivé en un point défini comme limite du taux de variation en ce point$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 70, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$nombre dérivé$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-071$pt$, $pt$Équation réduite de la tangente en un point$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 71, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$tangente$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-072$pt$, $pt$Fonction dérivée$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 72, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions dérivées$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-073$pt$, $pt$Fonctions dérivées de $x \mapsto x^2$, $x \mapsto x^3$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 73, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions dérivées$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-074$pt$, $pt$Dérivée d'une somme, dérivée de $kf$ ($k \in \mathbb{R}$), dérivée d'un polynôme de degré inférieur ou égal à 3$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 74, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$opérations sur les dérivées$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-075$pt$, $pt$Sens de variation d'une fonction, lien avec le signe de la dérivée$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 75, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$variations$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-076$pt$, $pt$Tableau de variations, extrémums$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 76, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$étude de fonction$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-077$pt$, $pt$Interpréter géométriquement le nombre dérivé comme coefficient directeur de la tangente$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 77, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$nombre dérivé$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-078$pt$, $pt$Construire la tangente à une courbe en un point$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 78, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$tangente$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-079$pt$, $pt$Déterminer l'équation réduite de la tangente à une courbe en un point$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 79, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$tangente$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-080$pt$, $pt$Calculer la dérivée d'une fonction polynôme de degré inférieur ou égal à trois$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 80, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$opérations sur les dérivées$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-081$pt$, $pt$Déterminer le sens de variation et les extrémums d'une fonction polynôme de degré inférieur ou égal à 3$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Dérivation$pt$, '1_TECHNO', 81, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$étude de fonction$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));

-- Statistiques et probabilités > Séries statistiques à deux variables quantitatives
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-082$pt$, $pt$Nuage de points associé à une série statistique à deux variables quantitatives$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Séries statistiques à deux variables quantitatives$pt$, '1_TECHNO', 82, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$nuage de points$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-083$pt$, $pt$Ajustement affine$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Séries statistiques à deux variables quantitatives$pt$, '1_TECHNO', 83, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-084$pt$, $pt$Point moyen$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Séries statistiques à deux variables quantitatives$pt$, '1_TECHNO', 84, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$point moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-085$pt$, $pt$Représenter un nuage de points$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Séries statistiques à deux variables quantitatives$pt$, '1_TECHNO', 85, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$nuage de points$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-086$pt$, $pt$Savoir calculer les coordonnées du point moyen$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Séries statistiques à deux variables quantitatives$pt$, '1_TECHNO', 86, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$point moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-087$pt$, $pt$Déterminer et utiliser un ajustement affine$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Séries statistiques à deux variables quantitatives$pt$, '1_TECHNO', 87, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-088$pt$, $pt$Interpoler ou extrapoler des valeurs inconnues à l'aide d'un ajustement affine$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Séries statistiques à deux variables quantitatives$pt$, '1_TECHNO', 88, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));

-- Statistiques et probabilités > Probabilités conditionnelles : indépendance
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-089$pt$, $pt$Indépendance de deux évènements$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Probabilités conditionnelles : indépendance$pt$, '1_TECHNO', 89, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$indépendance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-090$pt$, $pt$Formule des probabilités totales$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Probabilités conditionnelles : indépendance$pt$, '1_TECHNO', 90, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$probabilités totales$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-091$pt$, $pt$Savoir utiliser ou justifier l'indépendance de deux évènements$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Probabilités conditionnelles : indépendance$pt$, '1_TECHNO', 91, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$indépendance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-092$pt$, $pt$Dans les cas simples, calculer une probabilité à l'aide de la formule des probabilités totales$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Probabilités conditionnelles : indépendance$pt$, '1_TECHNO', 92, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$probabilités totales$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));

-- Statistiques et probabilités > Modèle associé à une expérience aléatoire à plusieurs épreuves indépendantes
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-093$pt$, $pt$Probabilité associée à la répétition d'épreuves aléatoires identiques et indépendantes de Bernoulli$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Modèle associé à une expérience aléatoire à plusieurs épreuves indépendantes$pt$, '1_TECHNO', 93, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$épreuves indépendantes successives$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-094$pt$, $pt$Représenter par un arbre de probabilités la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$ afin de calculer des probabilités$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Modèle associé à une expérience aléatoire à plusieurs épreuves indépendantes$pt$, '1_TECHNO', 94, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$épreuves indépendantes successives$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));

-- Statistiques et probabilités > Variables aléatoires
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-095$pt$, $pt$Variable aléatoire discrète : loi de probabilité$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 95, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$loi d'une variable aléatoire$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Variables aléatoires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-096$pt$, $pt$Variable aléatoire discrète : espérance$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 96, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$espérance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Variables aléatoires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-097$pt$, $pt$Loi de Bernoulli (0,1) de paramètre $p$, espérance$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 97, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$schéma de Bernoulli$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-098$pt$, $pt$Interpréter en situation les écritures $\{X = a\}$, $\{X \leqslant a\}$ où $X$ désigne une variable aléatoire et calculer les probabilités correspondantes $P(X = a)$, $P(X \leqslant a)$$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 98, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$loi d'une variable aléatoire$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Variables aléatoires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-099$pt$, $pt$Calculer et interpréter en contexte l'espérance d'une variable aléatoire discrète$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 99, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$espérance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Variables aléatoires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-100$pt$, $pt$Reconnaitre une situation aléatoire modélisée par une loi de Bernoulli$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 100, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$schéma de Bernoulli$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-101$pt$, $pt$Simuler $N$ échantillons de taille $n$ d'une loi de Bernoulli et représenter les fréquences observées des 1 par un histogramme ou un nuage de points$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 101, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$simulation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Échantillonnage$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-102$pt$, $pt$Interpréter sur des exemples la distance à $p$ de la fréquence observée des 1 dans un échantillon de taille $n$ d'une loi de Bernoulli de paramètre $p$$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 102, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fluctuation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Échantillonnage$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-103$pt$, $pt$Simuler des échantillons de taille $n$ d'une loi de Bernoulli à partir d'un générateur de nombres aléatoires entre 0 et 1$pt$, 'algorithme', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 103, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$simulation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Échantillonnage$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-104$pt$, $pt$Représenter par un histogramme ou par un nuage de points les fréquences observées des 1 dans $N$ échantillons de taille $n$ d'une loi de Bernoulli$pt$, 'algorithme', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 104, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$simulation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Échantillonnage$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1TECHNO-105$pt$, $pt$Compter le nombre de valeurs situées dans un intervalle de la forme $[p - ks\,;\,p + ks]$ pour $k \in \{1\,;2\,;3\}$$pt$, 'algorithme', 'attendu', 'diversite', $pt$Statistiques et probabilités > Variables aléatoires$pt$, '1_TECHNO', 105, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fluctuation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Échantillonnage$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));

-- ---- 2. Les références (grade '1_TECHNO') --------------------------------------
-- Un code introuvable insérerait 0 ligne EN SILENCE : le bloc DO final compte.
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-377$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-367$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-378$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-379$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-267$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-328$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-330$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-066$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-016$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-022$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-039$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-336$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-329$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-349$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-316$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-315$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-314$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-077$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-372$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-030$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-096$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-382$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-370$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-029$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-039$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-040$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-396$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-397$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-399$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-400$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-276$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-277$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-013$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-025$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-005$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-106$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-119$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$CM1-068$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-150$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-051$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$CE2-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-159$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$CE2-047$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-011$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-008$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-025$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-014$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-269$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-273$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-274$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-035$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-140$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-141$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-057$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-040$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-331$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-041$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-044$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-016$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-047$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-144$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-147$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-152$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-061$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-050$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-053$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-029$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-021$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-034$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-022$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-023$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-380$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-381$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-186$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-048$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$6-187$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-201$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-202$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-203$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-204$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-205$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-206$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-207$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-210$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-212$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$2-214$pt$ and p.grade is not null;

-- ---- 3. Vérifications (la migration échoue si le compte n'y est pas) --------

do $check$
declare
	v_pts integer; v_sans_noeud integer; v_refs integer; v_auto integer;
	v_algo integer; v_non_attendu integer; v_regime integer; v_std2a integer; v_sauf integer;
begin
	select count(*) into v_pts from public.curriculum_points where grade = '1_TECHNO';
	select count(*) into v_sans_noeud from public.curriculum_points where grade = '1_TECHNO' and node_id is null;
	select count(*) into v_refs from public.curriculum_point_automatismes where grade = '1_TECHNO';
	select count(*) into v_auto from public.curriculum_point_automatismes a
	  join public.curriculum_points p on p.id = a.point_id
	 where a.grade = '1_TECHNO' and p.grade = '1_TECHNO';
	select count(*) into v_algo from public.curriculum_points where grade = '1_TECHNO' and kind = 'algorithme';
	select count(*) into v_non_attendu from public.curriculum_points where grade = '1_TECHNO' and exigence <> 'attendu';
	select count(*) into v_regime from public.curriculum_points where grade = '1_TECHNO' and regime_acquisition <> 'diversite';
	select count(*) into v_std2a from public.curriculum_points where grade = '1_TECHNO' and rubrique like 'Activités géométriques (série STD2A)%';
	select count(*) into v_sauf from public.curriculum_points where grade = '1_TECHNO' and rubrique = 'Algorithmique et programmation (sauf série STD2A)';
	if v_pts <> 105 or v_sans_noeud <> 0 or v_refs <> 89 or v_auto <> 1
	   or v_algo <> 18 or v_non_attendu <> 0 or v_regime <> 0 or v_std2a <> 18 or v_sauf <> 11 then
		raise exception 'seed 1re techno incohérent : points=%, sans nœud=%, réfs=%, auto=%, algo=%, non attendus=%, non-diversité=%, STD2A=%, sauf STD2A=%',
			v_pts, v_sans_noeud, v_refs, v_auto, v_algo, v_non_attendu, v_regime, v_std2a, v_sauf;
	end if;
end $check$;
