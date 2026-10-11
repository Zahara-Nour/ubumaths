-- ============================================================================
-- Seed des points de programme de 1re ENSEIGNEMENT SCIENTIFIQUE (programme de
-- mathématiques intégré à l'enseignement scientifique de 1re générale, « module
-- spécifique », grade '1_GEN') + RÉFÉRENCES.
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/seed-1gen.md (VALIDÉ INTÉGRALEMENT par
-- David le 2026-10-08 : titres non retenus, scissions, entretien, références,
-- discutables) ; fichier GÉNÉRÉ — ne pas éditer à la main. Aucun changement d'arbre ;
-- pas d'ancien seed pour ce niveau.
--   * 44 points, codes 1GEN-001…1GEN-044, grade '1_GEN', tous attendus, aucun
--     algorithme (le module n'a pas de bloc Algorithmique).
--   * 84 références du grade '1_GEN' : lignes de la partie Automatismes
--     (dont 1 auto-référence, 1GEN-027), liste de 2de reprise (C16), entretien (U5/V1).
--     Parcours 1_GEN → 2 : aucune référence vers 1_SPE ni 1_TECHNO (programmes parallèles).
--
-- MIGRATION ADDITIVE (aucune ligne modifiée ni supprimée). Rollback (⚠️ scopé) :
--   delete from public.curriculum_point_automatismes where grade = '1_GEN';
--   delete from public.curriculum_points where grade = '1_GEN';
-- ⚠️ Ce rollback n'est anodin que tant qu'AUCUN usage ne s'accroche à ces
-- points. Supprimer un point efface EN SILENCE (ON DELETE CASCADE) : le suivi
-- élève (student_point_state), les rattachements d'exercices du prof
-- (exercise_curriculum_points), journal_entry_points, srs_anti_fraud_flags, et
-- les références d'automatismes d'AUTRES grades qui viseraient ces points ; question_template_points (ON DELETE RESTRICT) fait échouer le rollback.
-- Dès qu'un usage existe : DESTRUCTIF (données d'élèves mineurs) — arrêt obligatoire
-- et accord explicite de David (règle CLAUDE.md).
-- ============================================================================

-- ---- 1. Les 44 points ------------------------------------------------------

-- Analyse de l'information chiffrée
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-001$pt$, $pt$Deux caractères qualitatifs : exemples d'analyse du croisement de deux caractères par représentation graphique (diagrammes en barres, diagrammes circulaires)$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 1, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Tableaux croisés$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-002$pt$, $pt$Deux caractères quantitatifs : représentation par un nuage de points$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 2, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$nuage de points$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-003$pt$, $pt$Ajustement affine$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 3, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-004$pt$, $pt$Point moyen$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 4, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$point moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-005$pt$, $pt$Interpolation, extrapolation$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 5, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-006$pt$, $pt$Utiliser un tableur pour représenter des données sous forme de tableau ou de diagramme$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 6, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-007$pt$, $pt$Déterminer et utiliser un ajustement affine pour interpoler ou extrapoler des valeurs inconnues$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 7, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-008$pt$, $pt$Savoir calculer les coordonnées d'un point moyen$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse de l'information chiffrée$pt$, '1_GEN', 8, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$point moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));

-- Phénomènes aléatoires
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-009$pt$, $pt$Indépendance de deux évènements$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes aléatoires$pt$, '1_GEN', 9, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$indépendance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-010$pt$, $pt$Probabilité associée à la répétition d'épreuves aléatoires identiques et indépendantes de Bernoulli$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes aléatoires$pt$, '1_GEN', 10, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$épreuves indépendantes successives$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-011$pt$, $pt$Représenter par un arbre de probabilités la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$ afin de calculer des probabilités$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes aléatoires$pt$, '1_GEN', 11, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$épreuves indépendantes successives$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-012$pt$, $pt$Savoir utiliser ou justifier l'indépendance de deux évènements$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes aléatoires$pt$, '1_GEN', 12, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$indépendance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));

-- Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-013$pt$, $pt$Suites arithmétiques : définition par la relation de récurrence$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 13, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-014$pt$, $pt$Suites arithmétiques : explicitation du terme de rang $n$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 14, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$terme général$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-015$pt$, $pt$Suites arithmétiques : sens de variation$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 15, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-016$pt$, $pt$Suites arithmétiques : représentation graphique$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 16, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-017$pt$, $pt$Reconnaitre un phénomène discret ou continu de croissance linéaire et savoir le modéliser$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 17, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-018$pt$, $pt$Calculer un terme de rang donné d'une suite arithmétique définie par une relation fonctionnelle ou une relation de récurrence$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 18, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$calculer un terme$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-019$pt$, $pt$Réaliser et exploiter la représentation graphique des termes d'une suite arithmétique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 19, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-020$pt$, $pt$Réaliser et exploiter la représentation graphique d'une fonction affine$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 20, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$expression et droite$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonctions affines$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-021$pt$, $pt$Résoudre un problème de seuil dans le cas d'une croissance linéaire$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire$pt$, '1_GEN', 21, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$seuil$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));

-- Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-022$pt$, $pt$Fonctions polynômes de degré 2 : éléments caractéristiques de la courbe : allure de la courbe, axe de symétrie, coordonnées du sommet en lien avec la symétrie, tableau de variation de la fonction$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique$pt$, '1_GEN', 22, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parabole$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-023$pt$, $pt$Racines et signe d'un polynôme de degré 2 donné sous forme factorisée (le calcul des racines à l'aide du discriminant ne figure pas au programme)$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique$pt$, '1_GEN', 23, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-024$pt$, $pt$Associer une parabole à une expression algébrique de degré 2, pour les fonctions de la forme $x \mapsto ax^2$, $x \mapsto ax^2 + c$, $x \mapsto a(x - x_1)(x - x_2)$$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique$pt$, '1_GEN', 24, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parabole$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-025$pt$, $pt$Déterminer des éléments caractéristiques de la fonction $x \mapsto ax^2 + bx + c$ (aucune formule n'est attendue ; l'axe de symétrie se détermine par exemple en résolvant $f(x) = c$)$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique$pt$, '1_GEN', 25, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parabole$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-026$pt$, $pt$Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour trouver ses racines$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique$pt$, '1_GEN', 26, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$racines$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-027$pt$, $pt$Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour étudier son signe$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique$pt$, '1_GEN', 27, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$signe$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Second degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));

-- Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-028$pt$, $pt$Suites géométriques à termes strictement positifs : définition par relation de récurrence$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 28, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-029$pt$, $pt$Suites géométriques : explicitation du terme de rang $n$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 29, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$terme général$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-030$pt$, $pt$Suites géométriques : sens de variation$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 30, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-031$pt$, $pt$Suites géométriques : représentation graphique$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 31, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-032$pt$, $pt$Fonction $x \mapsto a^x$ ($a > 0$, $x \geqslant 0$)$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 32, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-033$pt$, $pt$Fonctions $x \mapsto a^x$ : propriétés algébriques (admises, par extension des propriétés des puissances entières)$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 33, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-034$pt$, $pt$Fonctions $x \mapsto a^x$ : variations$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 34, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-035$pt$, $pt$Fonctions $x \mapsto a^x$ : représentation graphique$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 35, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-036$pt$, $pt$Fonctions $x \mapsto a^x$ : cas particulier de l'exposant $\frac{1}{n}$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 36, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-037$pt$, $pt$Taux d'évolution moyen correspondant à $n$ évolutions successives$pt$, 'connaissance', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 37, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$taux d'évolution moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Évolutions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Proportionnalité$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-038$pt$, $pt$Reconnaitre un phénomène discret ou continu de croissance ou décroissance exponentielle et savoir le modéliser$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 38, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-039$pt$, $pt$Calculer un terme de rang donné d'une suite géométrique définie par une relation fonctionnelle ou une relation de récurrence$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 39, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$calculer un terme$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-040$pt$, $pt$Calculer un taux d'évolution moyen$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 40, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$taux d'évolution moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Évolutions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Proportionnalité$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-041$pt$, $pt$Réaliser et exploiter la représentation graphique des termes d'une suite géométrique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 41, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$représentation graphique$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les suites$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-042$pt$, $pt$Réaliser et exploiter la représentation graphique d'une fonction exponentielle$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 42, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-043$pt$, $pt$Estimer les ordres de grandeur d'une quantité en croissance ou décroissance exponentielle$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 43, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$1GEN-044$pt$, $pt$Résoudre un problème de seuil dans le cas d'une croissance ou décroissance exponentielle par le calcul, à l'aide d'une représentation graphique ou en utilisant un outil numérique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle$pt$, '1_GEN', 44, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$seuil$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));

-- ---- 2. Les références (grade '1_GEN') -----------------------------------------
-- Un code introuvable insérerait 0 ligne EN SILENCE : le bloc DO final compte.
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-377$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-367$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-378$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-379$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-267$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-328$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-330$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$1GEN-027$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-016$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-022$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-039$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-336$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-329$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-349$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-316$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-315$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-314$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-077$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-372$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-030$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-096$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-382$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-370$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-029$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-039$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-040$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-396$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-397$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-399$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-400$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-276$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-277$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-013$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-025$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-005$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-106$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-119$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$CM1-068$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-150$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-051$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$CE2-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-159$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$CE2-047$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-011$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-008$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-025$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-014$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-269$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-273$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-274$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-035$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-140$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-141$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-057$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-040$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-331$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-041$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-044$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-016$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-047$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-144$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-147$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-152$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-061$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-050$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-053$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-029$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-021$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-034$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-022$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-023$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-380$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-381$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-186$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-048$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$6-187$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-383$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-390$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-352$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-348$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$2-347$pt$ and p.grade is not null;

-- ---- 3. Vérifications (la migration échoue si le compte n'y est pas) --------

do $check$
declare
	v_pts integer; v_sans_noeud integer; v_refs integer; v_auto integer;
	v_algo integer; v_non_attendu integer; v_regime integer; v_paralleles integer;
begin
	select count(*) into v_pts from public.curriculum_points where grade = '1_GEN';
	select count(*) into v_sans_noeud from public.curriculum_points where grade = '1_GEN' and node_id is null;
	select count(*) into v_refs from public.curriculum_point_automatismes where grade = '1_GEN';
	select count(*) into v_auto from public.curriculum_point_automatismes a
	  join public.curriculum_points p on p.id = a.point_id
	 where a.grade = '1_GEN' and p.grade = '1_GEN';
	select count(*) into v_algo from public.curriculum_points where grade = '1_GEN' and kind = 'algorithme';
	select count(*) into v_non_attendu from public.curriculum_points where grade = '1_GEN' and exigence <> 'attendu';
	select count(*) into v_regime from public.curriculum_points where grade = '1_GEN' and regime_acquisition <> 'diversite';
	select count(*) into v_paralleles from public.curriculum_point_automatismes a
	  join public.curriculum_points p on p.id = a.point_id
	 where a.grade = '1_GEN' and p.grade in ('1_SPE', '1_TECHNO');
	if v_pts <> 44 or v_sans_noeud <> 0 or v_refs <> 84 or v_auto <> 1
	   or v_algo <> 0 or v_non_attendu <> 0 or v_regime <> 0 or v_paralleles <> 0 then
		raise exception 'seed 1re ens. sci. incohérent : points=%, sans nœud=%, réfs=%, auto=%, algo=%, non attendus=%, non-diversité=%, cibles parallèles=%',
			v_pts, v_sans_noeud, v_refs, v_auto, v_algo, v_non_attendu, v_regime, v_paralleles;
	end if;
end $check$;
