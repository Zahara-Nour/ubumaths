-- ============================================================================
-- Seed des points de programme de Tle TECHNOLOGIQUE (enseignement commun de
-- mathématiques de la classe terminale de la voie technologique) + RÉFÉRENCES.
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/seed-ttechno.md (VALIDÉ par David le
-- 2026-10-08 : « je te suis », recommandations suivies sur les discutables, T3, T4) ;
-- fichier GÉNÉRÉ — ne pas éditer à la main. Aucun changement d'arbre ; pas d'ancien
-- seed pour ce niveau.
--   * 69 points, codes TTECHNO-001…TTECHNO-069, grade 'T_TECHNO' ; attendus, sauf
--     les 8 Situations algorithmiques en approfondissement (T3 : « peuvent ») ; la série
--     est dite dans la rubrique (T1 : « Activités géométriques (série STD2A) > … »).
--   * 85 références du grade 'T_TECHNO' : lignes de la partie Automatismes
--     de Tle (dont 1 auto-référence, l'indice de base 100 ; T4 : pas de reprise de la
--     liste de 1re), entretien (U5/V1) des contenus repris de 2de et de 1re techno, dont
--     tout le bloc Algorithmique. Parcours T_TECHNO → 1_TECHNO → 2.
--
-- MIGRATION ADDITIVE (aucune ligne modifiée ni supprimée). Rollback (⚠️ scopé) :
--   delete from public.curriculum_point_automatismes where grade = 'T_TECHNO';
--   delete from public.curriculum_points where grade = 'T_TECHNO';
-- ⚠️ Ce rollback n'est anodin que tant qu'AUCUN usage ne s'accroche à ces
-- points. Supprimer un point efface EN SILENCE (ON DELETE CASCADE) : le suivi
-- élève (student_point_state), les rattachements d'exercices du prof
-- (exercise_curriculum_points), journal_entry_points, srs_anti_fraud_flags, et
-- les références d'automatismes d'AUTRES grades qui viseraient ces points ; question_template_points (ON DELETE RESTRICT) fait échouer le rollback.
-- Dès qu'un usage existe : DESTRUCTIF (données d'élèves mineurs) — arrêt obligatoire
-- et accord explicite de David (règle CLAUDE.md).
-- ============================================================================

-- ---- 1. Les 69 points ------------------------------------------------------

-- Activités géométriques (série STD2A) > Géométrie plane
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-001$pt$, $pt$Coniques : sections planes d'un cône de révolution$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, 'T_TECHNO', 1, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$sections planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-002$pt$, $pt$Notion de tangente à une conique en un point$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, 'T_TECHNO', 2, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$coniques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-003$pt$, $pt$Étudier le raccordement d'arcs de cercles, d'ellipses ou de courbes représentatives de fonctions$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie plane$pt$, 'T_TECHNO', 3, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$coniques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));

-- Activités géométriques (série STD2A) > Géométrie dans l'espace
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-004$pt$, $pt$Perspective centrale : projection centrale$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 4, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-005$pt$, $pt$Propriétés de conservation (alignement, contact) ou de non conservation (longueurs, milieux, rapports de longueurs, angles, parallélisme) ; cas particulier des plans frontaux$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 5, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-006$pt$, $pt$Point de fuite d'une droite$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 6, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-007$pt$, $pt$Point de fuite principal$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 7, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-008$pt$, $pt$Ligne de fuite d'un plan non frontal, ligne d'horizon$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 8, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-009$pt$, $pt$Image d'un quadrillage, de solides simples (parallélépipède rectangle, prisme, pyramide)$pt$, 'connaissance', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 9, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-010$pt$, $pt$Utiliser le vocabulaire usuel de la perspective centrale$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 10, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-011$pt$, $pt$Utiliser les propriétés d'une projection centrale$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 11, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-012$pt$, $pt$Utiliser la conservation de forme dans les plans frontaux$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 12, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-013$pt$, $pt$Utiliser la position relative de l'image de deux droites parallèles$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 13, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-014$pt$, $pt$Construire l'image d'un quadrillage ou d'un parallélépipède rectangle ayant au moins une arête en vraie grandeur$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Activités géométriques (série STD2A) > Géométrie dans l'espace$pt$, 'T_TECHNO', 14, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$perspective centrale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));

-- Automatismes
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-015$pt$, $pt$Interpréter un indice de base 100 ; calculer un indice ; calculer le taux d'évolution entre deux valeurs$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Automatismes$pt$, 'T_TECHNO', 15, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$indices$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Évolutions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Proportionnalité$pt$))));

-- Analyse > Suites numériques
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-016$pt$, $pt$Moyenne arithmétique de deux nombres$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 16, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-017$pt$, $pt$Somme des $n$ premiers termes d'une suite arithmétique ; notation $\Sigma$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 17, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$somme des termes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-018$pt$, $pt$Moyenne géométrique de deux nombres positifs$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 18, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-019$pt$, $pt$Somme des $n$ premiers termes d'une suite géométrique ; notation $\Sigma$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 19, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$somme des termes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-020$pt$, $pt$Prouver que trois nombres sont (ou ne sont pas) les termes consécutifs d'une suite arithmétique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 20, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-021$pt$, $pt$Prouver que trois nombres sont (ou ne sont pas) les termes consécutifs d'une suite géométrique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 21, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-022$pt$, $pt$Déterminer la raison d'une suite arithmétique modélisant une évolution$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 22, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$raison$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-023$pt$, $pt$Déterminer la raison d'une suite géométrique modélisant une évolution$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 23, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$raison$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-024$pt$, $pt$Exprimer en fonction de $n$ le terme général d'une suite arithmétique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 24, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$terme général$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-025$pt$, $pt$Exprimer en fonction de $n$ le terme général d'une suite géométrique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 25, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$terme général$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-026$pt$, $pt$Calculer la somme des $n$ premiers termes d'une suite arithmétique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 26, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$somme des termes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-027$pt$, $pt$Calculer la somme des $n$ premiers termes d'une suite géométrique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 27, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$somme des termes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-028$pt$, $pt$Reconnaitre une situation relevant du calcul d'une somme de termes consécutifs d'une suite arithmétique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 28, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$somme des termes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites arithmétiques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-029$pt$, $pt$Reconnaitre une situation relevant du calcul d'une somme de termes consécutifs d'une suite géométrique$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 29, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$somme des termes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites géométriques$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-030$pt$, $pt$Écrire en langage Python une fonction qui calcule la somme des $n$ premiers carrés, des $n$ premiers cubes ou des $n$ premiers inverses ; établir le lien entre l'écriture de la somme à l'aide du symbole $\Sigma$ et les composantes de l'algorithme (initialisation, sortie de boucle, accumulateur, compteur)$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Analyse > Suites numériques$pt$, 'T_TECHNO', 30, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$algorithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Suites et modélisation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Suites$pt$))));

-- Analyse > Fonctions exponentielles
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-031$pt$, $pt$Définition de la fonction $x \mapsto a^x$ pour $x$ positif comme prolongement à des valeurs non entières positives de la suite géométrique $(a^n)_{n \in \mathbb{N}}$ ; extension à $\mathbb{R}_-$ en posant $a^{-x} = \frac{1}{a^x}$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 31, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-032$pt$, $pt$Sens de variation de $x \mapsto a^x$ selon les valeurs de $a$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 32, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-033$pt$, $pt$Allure de la courbe représentative de $x \mapsto a^x$ selon les valeurs de $a$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 33, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-034$pt$, $pt$Propriétés algébriques : $a^{x+y} = a^x a^y$ ; $a^{x-y} = \frac{a^x}{a^y}$ ; $a^{nx} = (a^x)^n$ pour $n$ entier relatif$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 34, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-035$pt$, $pt$Cas particulier de l'exposant $\frac{1}{n}$ pour calculer un taux d'évolution moyen équivalent à $n$ évolutions successives$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 35, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$taux d'évolution moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Évolutions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Proportionnalité$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-036$pt$, $pt$Connaitre et utiliser le sens de variation des fonctions de la forme $x \mapsto k a^x$, selon le signe de $k$ et les valeurs de $a$$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 36, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-037$pt$, $pt$Connaitre les propriétés algébriques des fonctions exponentielles et les utiliser pour transformer des écritures numériques ou littérales$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 37, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-038$pt$, $pt$Calculer le taux d'évolution moyen équivalent à des évolutions successives$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 38, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$taux d'évolution moyen$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Évolutions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Proportionnalité$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-039$pt$, $pt$Intercaler entre deux points déjà construits un troisième point ayant pour abscisse (respectivement pour ordonnée) la moyenne arithmétique (respectivement géométrique) des abscisses (respectivement des ordonnées) des deux points initiaux$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Analyse > Fonctions exponentielles$pt$, 'T_TECHNO', 39, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions x ↦ aˣ$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction exponentielle$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));

-- Analyse > Fonction logarithme décimal
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-040$pt$, $pt$Définition du logarithme décimal de $b$ pour $b > 0$ comme l'unique solution de l'équation $10^x = b$ ; notation $\log$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonction logarithme décimal$pt$, 'T_TECHNO', 40, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$logarithme décimal$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Logarithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-041$pt$, $pt$Sens de variation de la fonction logarithme décimal$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonction logarithme décimal$pt$, 'T_TECHNO', 41, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$logarithme décimal$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Logarithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-042$pt$, $pt$Propriétés algébriques : $\log(ab) = \log(a) + \log(b)$, $\log(a^n) = n\log(a)$ et $\log\left(\frac{a}{b}\right) = \log(a) - \log(b)$, pour $n$ entier naturel, $a$ et $b$ réels strictement positifs$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonction logarithme décimal$pt$, 'T_TECHNO', 42, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$logarithme décimal$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Logarithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-043$pt$, $pt$Utiliser le logarithme décimal pour résoudre une équation du type $a^x = b$ ou $x^a = b$ d'inconnue $x$ réelle, une inéquation du type $a^x < b$ ou $x^a < b$ d'inconnue $x$ réelle ou du type $a^n < b$ d'inconnue $n$ entier naturel$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonction logarithme décimal$pt$, 'T_TECHNO', 43, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$logarithme décimal$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Logarithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-044$pt$, $pt$Utiliser les propriétés algébriques de la fonction logarithme décimal pour transformer des expressions numériques ou littérales$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonction logarithme décimal$pt$, 'T_TECHNO', 44, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$logarithme décimal$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Logarithmes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));

-- Analyse > Fonction inverse
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-045$pt$, $pt$Comportement de la fonction inverse aux bornes de son ensemble de définition$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonction inverse$pt$, 'T_TECHNO', 45, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$définition et courbe$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction inverse$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-046$pt$, $pt$Dérivée de la fonction inverse$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonction inverse$pt$, 'T_TECHNO', 46, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$fonctions dérivées$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-047$pt$, $pt$Sens de variation de la fonction inverse$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonction inverse$pt$, 'T_TECHNO', 47, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$variations$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction inverse$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-048$pt$, $pt$Courbe représentative de la fonction inverse ; asymptotes$pt$, 'connaissance', 'attendu', 'diversite', $pt$Analyse > Fonction inverse$pt$, 'T_TECHNO', 48, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$définition et courbe$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction inverse$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-049$pt$, $pt$Étudier et représenter des fonctions obtenues par combinaisons linéaires de la fonction inverse et de fonctions polynomiales de degré au maximum 3$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Analyse > Fonction inverse$pt$, 'T_TECHNO', 49, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$étude de fonction$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Dérivation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));

-- Statistique et probabilités > Séries statistiques à deux variables quantitatives
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-050$pt$, $pt$Changement de variable dans l'étude graphique d'une série statistique à deux variables quantitatives$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistique et probabilités > Séries statistiques à deux variables quantitatives$pt$, 'T_TECHNO', 50, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$changement de variable$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-051$pt$, $pt$Ajustement se ramenant par changement de variable à un ajustement affine$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistique et probabilités > Séries statistiques à deux variables quantitatives$pt$, 'T_TECHNO', 51, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$changement de variable$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-052$pt$, $pt$Représenter un nuage de points en effectuant un changement de variable donné (par exemple $u^2$, $\frac{1}{t}$, $\frac{1}{\sqrt{n}}$, $\log(y)$, etc.) afin de conjecturer une relation de linéarité entre de nouvelles variables$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistique et probabilités > Séries statistiques à deux variables quantitatives$pt$, 'T_TECHNO', 52, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$changement de variable$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-053$pt$, $pt$Automatiser le calcul de $\sum_i \left(y_i - (ax_i + b)\right)^2$$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Statistique et probabilités > Séries statistiques à deux variables quantitatives$pt$, 'T_TECHNO', 53, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-054$pt$, $pt$Rechercher un couple $(a, b)$ minimisant cette expression parmi un ensemble fini de couples proposés par les élèves ou générés par balayage, tirage aléatoire, etc.$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Statistique et probabilités > Séries statistiques à deux variables quantitatives$pt$, 'T_TECHNO', 54, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ajustement affine$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Statistique à deux variables$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));

-- Statistique et probabilités > Probabilités conditionnelles
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-055$pt$, $pt$Formule des probabilités totales pour une partition de l'univers$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistique et probabilités > Probabilités conditionnelles$pt$, 'T_TECHNO', 55, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$probabilités totales$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-056$pt$, $pt$Calculer la probabilité d'un évènement connaissant ses probabilités conditionnelles relatives à une partition de l'univers$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistique et probabilités > Probabilités conditionnelles$pt$, 'T_TECHNO', 56, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$probabilités totales$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Probabilités conditionnelles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));

-- Statistique et probabilités > Variables aléatoires discrètes finies
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-057$pt$, $pt$Loi binomiale $\mathcal{B}(n, p)$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 57, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-058$pt$, $pt$Espérance de la loi binomiale (admise)$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 58, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$espérance et variance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-059$pt$, $pt$Coefficients binomiaux $\binom{n}{k}$$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 59, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$coefficients binomiaux$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-060$pt$, $pt$Triangle de Pascal$pt$, 'connaissance', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 60, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$triangle de Pascal$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Combinaisons$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Dénombrement$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-061$pt$, $pt$Calculer des coefficients binomiaux $\binom{n}{k}$ à l'aide du triangle de Pascal pour $n \leqslant 10$$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 61, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$coefficients binomiaux$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-062$pt$, $pt$Reconnaitre une situation relevant de la loi binomiale et en identifier le couple de paramètres$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 62, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître une loi$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-063$pt$, $pt$Lorsque la variable aléatoire $X$ suit une loi binomiale : interpréter l'évènement $\{X = k\}$ sur un arbre de probabilité$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 63, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$calcul de probabilités$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-064$pt$, $pt$Lorsque la variable aléatoire $X$ suit une loi binomiale : calculer les probabilités des évènements $\{X = 0\}$, $\{X = 1\}$, $\{X = n\}$, $\{X = n - 1\}$ et de ceux qui s'en déduisent par réunion$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 64, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$calcul de probabilités$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-065$pt$, $pt$Lorsque la variable aléatoire $X$ suit une loi binomiale : calculer la probabilité de l'évènement $\{X = k\}$ à l'aide des coefficients binomiaux$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 65, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$coefficients binomiaux$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-066$pt$, $pt$Générer un triangle de Pascal de taille $n$ donnée$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 66, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$triangle de Pascal$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Combinaisons$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Dénombrement$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-067$pt$, $pt$Représenter par un diagramme en bâtons la loi de probabilité d'une loi binomiale $\mathcal{B}(n, p)$ ; faire le lien avec l'histogramme des fréquences observées des 1 lors de la simulation de $N$ échantillons de taille $n$ d'une loi de Bernoulli de paramètre $p$ faite en classe de première$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 67, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-068$pt$, $pt$Calculer l'espérance $\sum x_i p_i$ d'une variable aléatoire suivant une loi de probabilité donnée ; cas particulier d'une variable aléatoire suivant la loi binomiale $\mathcal{B}(n, p)$$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 68, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$espérance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Variables aléatoires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$TTECHNO-069$pt$, $pt$Représenter graphiquement l'espérance de lois binomiales $\mathcal{B}(n, p)$ à $p$ fixé et $n$ variable, à $n$ fixé et $p$ variable, puis faire le lien avec l'expression admise de l'espérance$pt$, 'algorithme', 'approfondissement', 'diversite', $pt$Statistique et probabilités > Variables aléatoires discrètes finies$pt$, 'T_TECHNO', 69, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$espérance et variance$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Loi binomiale$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$))));

-- ---- 2. Les références (grade 'T_TECHNO') --------------------------------------
-- Un code introuvable insérerait 0 ligne EN SILENCE : le bloc DO final compte.
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$6-140$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$4-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-364$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-376$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$4-057$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-377$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-367$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$TTECHNO-015$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-378$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-379$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-042$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-036$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$4-013$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-025$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$3-005$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$6-106$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$3-006$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$6-119$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$CM1-068$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$6-150$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-051$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$CE2-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$6-159$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$4-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$CE2-047$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-279$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-280$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-281$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-328$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-330$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-066$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-273$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-274$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-035$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$3-016$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$4-022$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-039$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-080$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-077$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-079$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$3-040$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-336$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-057$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-329$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-349$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-331$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-316$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-315$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-314$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-077$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-372$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$3-030$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-096$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-201$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-202$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-203$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-204$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-205$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-206$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-207$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-210$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-212$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-214$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-001$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-002$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-003$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-004$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-005$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-006$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-007$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-008$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-009$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-010$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-011$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-012$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-013$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-037$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-038$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-393$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-398$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-399$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-391$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$2-397$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-096$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$1TECHNO-099$pt$ and p.grade is not null;

-- ---- 3. Vérifications (la migration échoue si le compte n'y est pas) --------

do $check$
declare
	v_pts integer; v_sans_noeud integer; v_refs integer; v_auto integer;
	v_algo integer; v_approf integer; v_approf_hors_algo integer; v_regime integer; v_std2a integer;
begin
	select count(*) into v_pts from public.curriculum_points where grade = 'T_TECHNO';
	select count(*) into v_sans_noeud from public.curriculum_points where grade = 'T_TECHNO' and node_id is null;
	select count(*) into v_refs from public.curriculum_point_automatismes where grade = 'T_TECHNO';
	select count(*) into v_auto from public.curriculum_point_automatismes a
	  join public.curriculum_points p on p.id = a.point_id
	 where a.grade = 'T_TECHNO' and p.grade = 'T_TECHNO';
	select count(*) into v_algo from public.curriculum_points where grade = 'T_TECHNO' and kind = 'algorithme';
	select count(*) into v_approf from public.curriculum_points where grade = 'T_TECHNO' and exigence = 'approfondissement';
	select count(*) into v_approf_hors_algo from public.curriculum_points where grade = 'T_TECHNO' and (exigence = 'approfondissement') <> (kind = 'algorithme');
	select count(*) into v_regime from public.curriculum_points where grade = 'T_TECHNO' and regime_acquisition <> 'diversite';
	select count(*) into v_std2a from public.curriculum_points where grade = 'T_TECHNO' and rubrique like 'Activités géométriques (série STD2A)%';
	if v_pts <> 69 or v_sans_noeud <> 0 or v_refs <> 85 or v_auto <> 1
	   or v_algo <> 8 or v_approf <> 8 or v_approf_hors_algo <> 0 or v_regime <> 0 or v_std2a <> 14 then
		raise exception 'seed Tle techno incohérent : points=%, sans nœud=%, réfs=%, auto=%, algo=%, approf.=%, approf. ≠ algo=%, non-diversité=%, STD2A=%',
			v_pts, v_sans_noeud, v_refs, v_auto, v_algo, v_approf, v_approf_hors_algo, v_regime, v_std2a;
	end if;
end $check$;
