# Arbre des notions — progression

Décisions : [ADR 0019](../adr/0019-classement-branche-notion-sous-notion.md). Page de travail (privée) :
https://claude.ai/artifact/6g66KoBWfZdQ91tNn66Hg5 (générée depuis le scratchpad de la session du 2026-10-06).

## Reprendre ici

_Mis à jour le 2026-10-21, après #1581 (étape 3, B2 mergée)._

- **État** : C5 étape 3 (bascule du code). Fait : #1060 (page Programme), #1577 (B1) et #1581 (B2 : cahier de
  texte, Avancement et tags d'exercice sur branche > notion > points ; `getCurriculumTree` supprimé ; tags d'exercice
  limités aux notions de rangement, règle 1). Pas encore en prod (aucun `deploy:prod` depuis B1).
- **Prochaine action** : **D** dans un worktree neuf (élève : progression, `COVERED_GRADES`, `/student/objectifs`),
  phase 0 à présenter ; puis F (analytique), E (scripts de rattachement, Q8), étape 4 (suppression, destructive : arrêt).
- **En attente de David** : 3 points de revue B2 à trancher — l'API accepte de cocher / taguer un point neuf
  ARCHIVÉ (les écrans ne le proposent pas) ; un 404 au DELETE est traité « déjà retiré » même si c'est un refus RLS ;
  l'Avancement compte les archivés travaillés dans « vus / total ». Signalés avant : 11 modèles sans corrigé ;
  c9d6c5db attend une règle de correction. 📌 Futur chantier non décidé : écran de rangement des exercices.
- **Pièges en cours** : un exercice ne prend un point neuf que s'il est rangé sur son nœud ou sa notion (trigger) →
  décors d'intégration : `makeTaggedExercise` range l'exercice ; un test qui pose des points ANCIENS asserte l'ancien
  comportement ; une PR en conflit ne lance PAS la CI `pull_request` (fusionner `origin/main`) ; MySelect affiche le
  LaTeX en brut.
- **Worktree / branche** : aucun (B2 nettoyé).

## Tranché avec David (2026-10-06)

- Arbre branche > notion > sous-notion, commun exercices + modèles de questions ; type d'activité et
  source hors de l'arbre ; « chapitre » reste l'unité de cours.
- **Trois niveaux seulement** (option b) : une sous-notion double s'écrit « opération : précision »
  (« Multiplier : tables »).
- **Nombres et calculs rangé par type de nombre** : Entiers, Décimaux, Fractions, Relatifs, Puissances,
  Racines carrées, Nombres complexes ; l'opération en sous-notion. « À trou », « astucieux » →
  types d'activité.
- **Arithmétique = branche à part** : Divisibilité (dès le cycle 3, reprend « Entiers : diviser,
  divisibilité »), Nombres premiers, PGCD Bézout et Gauss, Congruences. Pas dans Entiers (niveaux
  CP→Tle mêlés, notion perdue comme unité).
- Fusion des thèmes d'exercices faite en prod : Fonction → Fonctions (1), Bac → BAC (2).

- **Grosses notions découpées par opération, type de nombre en tête** : Entiers (numération ;
  addition et soustraction ; multiplication ; division ; priorités opératoires), Décimaux (numération ;
  calculs), Fractions, Relatifs, Puissances et Racines carrées (sens et écritures ; calculs), par
  cohérence (choix de David). Sous-notions courtes, sans préfixe.
- **Nombres complexes = branche à part** (5 notions : forme algébrique, module et argument, formes
  trigo. et exponentielle, équations polynomiales, interprétation géométrique).

- **Racines carrées** : égalités et réduire dans « sens et écritures » (choix de David).
- **Proportionnalité** (5 notions) : Situations de proportionnalité (reprend Tableaux), Pourcentages,
  Évolutions, Échelle d'une carte, Vitesse (sortie de Grandeurs et mesures).

- **Algèbre** (7 notions) : Calcul littéral (une seule notion, 7 sous-notions) ; Équations : premier
  degré / produit et quotient / second degré ; Inéquations : premier degré / produit et quotient /
  second degré. Équations classées par forme (ℕ, ℤ, ℚ → difficulté `level`).
- **Second degré** : équations et inéquations dans Algèbre ; dans Fonctions > Second degré, les énoncés
  « fonction » (racines, signe, formes, variations, parabole). Frontière : la consigne porte sur une
  équation → Algèbre, sur une fonction → Fonctions.
- **Matrices** et **Graphes** : deux branches à part (maths expertes) ; Chaînes de Markov dans Graphes.

- **Fonctions** (15 notions) : une notion par fonction de référence (carré, inverse, racine carrée,
  cube, valeur absolue) ; Optimisation = sous-notion de Dérivation ; Limites et Continuité séparées.
- **Intégration** (4 notions) et **Équations différentielles** (5 notions : Généralités, y′ = f avec
  les primitives en sous-notions, y′ = ay, y′ = ay + b, y′ = ay + f) : deux branches à part.

- **Logique** (Ensembles, Logique et raisonnement) et **Algorithmique** (Variables et instructions,
  Boucles, Fonctions Python, Listes) : deux branches. **Grandeurs et mesures** : Périmètres et Aires
  séparés.

- **Vecteurs** : « sans coordonnées » / « avec coordonnées ». Frontière avec Géométrie repérée : un
  énoncé sur un vecteur → Vecteurs ; sur des points, droites, cercles dans un repère → Géométrie repérée.

- **Espace** et **Orthogonalité** (Tle) : chacune « sans coordonnées » / « avec coordonnées », comme
  Vecteurs. Géométrie : 8 notions.

- **Suites** (8 notions) et **Grandeurs et mesures** validées telles que dessinées.
- **Probabilités** (7 notions ; « Expériences aléatoires » remplace « Probabilités ») et
  **Statistiques** (4 notions : Représenter des données, Indicateurs, Échantillonnage, Statistique à
  deux variables) : deux branches. Statistiques à valider.

- **Dénombrement** : branche à part (4 notions). Sommes et concentration reste dans Probabilités.
- **Logique** (4 notions : connecteurs, implication, quantificateurs, raisonnements) et **Ensembles**
  (3 notions : ensembles de nombres, opérations, cardinal et produit cartésien) : deux branches.

- **Descripteurs hors de l'arbre (2026-10-07)** : « type d'activité » supprimé (Apprivoiser → niveau
  de difficulté, À trou → rien, astucieux → sous-notion « calcul astucieux ») ; catégorie d'exercice
  gardée, pas de catégorie pour les questions (question de cours sinon automatisme) ; source =
  exercices seulement, texte libre + type de source en liste fermée ; tags = transversal seulement.
  Glossaire et ADR 0019 mis à jour sur la branche.

- **Question d'accès tranchée (2026-10-07)** : lecture de l'arbre et des types de source par tout le
  monde, anon compris (y compris les notions sans contenu) ; écriture par l'admin seul ; rangement d'un
  contenu : droits inchangés (auteur d'un exercice, admin pour un modèle). Personne ne perd d'accès.

- **Phase 0, réponses aux questions de David (2026-10-07)** : niveaux sur notion et sous-notion
  (héritage, inclusion) ; pas de lien arbre ↔ programme officiel (A7 retiré) ; exercice → un ou
  plusieurs nœuds avec principal facultatif, modèle → un seul ; incohérence de niveaux = avertissement.

- **PR 1 base écrite (2026-10-07)** : migration `20261007120000_arbre_des_notions.sql` + 40 tests
  d'intégration (rouges avant, verts après, neutralisation prouvée). Règles ajoutées validées par David :
  genre d'un nœud immuable, pas de nœud actif sous un parent archivé, type de source unique sans casse,
  messages en français. Rangement d'un exercice : prof auteur seulement, pas l'admin (validé).

## Ouvert

- **Arbre validé en entier le 2026-10-07** : 19 branches, 115 notions, 418 sous-notions →
  `docs/wip/arbre-notions/` (JSON + page). Branche de travail `feat/arbre-notions`, rien en base. Puis relecture d'ensemble.
- **Phase 0 close (2026-10-07)** : archiver un nœud à enfants actifs = interdit ; table de
  correspondance = fichier de proposition avec confiance par ligne, validé par David avant toute écriture.
- Ensuite : question d'accès (lecture publique des listes, écriture admin seule), phase 0, PR 1 (base).

- **Programme du cycle 2 comparé (2026-10-07)** : programme 2025 (arrêté du 22-10-2024, BOENJS
  n° 41 du 31/10/2024) + livrets CP/CE1/CE2 (séquences modèles, pas des inventaires) →
  `docs/wip/arbre-notions/programmes-ecarts-cycle2.md`. Proposé : 9 notions (Problèmes
  arithmétiques, Longueurs, Masses, Contenances, Monnaie, Solides, Figures planes, Symétrie
  axiale, Repérage et déplacements), ~17 sous-notions, niveaux sur 7 notions (fractions dès le
  CE1 !). Questions P1-P7. Référentiel `curriculum_*` : rien en prod pour CP-CE2, schéma prêt.

- **Question A7 ROUVERTE (2026-10-07)** : « pas de lien arbre ↔ programme officiel (A7 retiré) »
  n'était PAS une décision de David — la question avait été retirée sans lui être posée. David :
  « il y a un lien évident ». Options et bénéfices dans `programmes-ecarts-cycle2.md` § Lien
  arbre ↔ référentiel ; question P7 à trancher.

- **Décisions de David (2026-10-07, fin de journée)** : (1) **l'arbre des notions est CENTRAL** —
  les maths sont immuables, les programmes changent ; un programme = des pointeurs vers l'arbre,
  l'arbre peut déborder des programmes (notions hors programme pour les élèves avancés) ;
  (2) **l'arbre ne porte AUCUNE information de niveau** — le niveau vit dans la couche programme
  (les pointeurs/points par grade), pas sur les nœuds. Conséquences : la colonne `grades` de
  `classification_nodes` et ses règles (non-vide sur notion, héritage/inclusion sur sous-notion)
  sortent de la PR 1 ; les « niveaux » du JSON deviennent un intrant pour le futur pointage des
  programmes, plus une propriété des nœuds ; les [N] des documents d'écarts se relisent
  « le programme de ce niveau doit pointer ce nœud ». Restent ouvertes avant l'ADR : variante A
  (pointeurs nus) ou B (points BO rattachés aux nœuds — reco) ; un point pointe notion OU
  sous-notion, jamais une branche (reco oui).

- **ADR 0020 écrite (2026-10-07, variante B confirmée par David)** : arbre central sans niveaux,
  grain au filtre, programmes = points BO rattachés aux nœuds (notion ou sous-notion, jamais une
  branche — corollaire de 0019, à faire infirmer par David s'il voit autrement), `level` des
  questions = gradation intra-point, themes/objectives à retirer à terme (destructif, plus tard).
  0019 amendée (statut) ; mesures à l'appui : 432/1 005 modèles tagués vers 499 points, mêmes
  titres à plusieurs levels sous un même point. Prochaine étape technique sur la branche : amender
  la PR 1 (retrait de `classification_nodes.grades` et des règles d'héritage/inclusion + tests).

- **PR 1 amendée (2026-10-07, ADR 0020)** : `classification_nodes.grades` retirée (colonne,
  contraintes de forme/validité, bloc inclusion du trigger de validation, bloc niveaux du trigger
  enfants). Tests : 52 verts (les 2 tests de niveaux supprimés avec la règle).

- **Programme du cycle 3 comparé (2026-10-07, soir)** : programme BOENJS du 17 avril 2025 (en
  vigueur en 6e depuis la rentrée 2026) + livrets CM1/CM2/6e 2026 (séquences modèles) →
  `docs/wip/arbre-notions/programmes-ecarts-cycle3.md`. Proposé : 2 notions (Premiers pas
  algébriques, Angles), ~8 sous-notions, niveaux rafraîchis ; ⚠️ seed 6e en prod (95 points) =
  programme 2020, périmé. Questions R1-R6.

- **R5 tranchée (2026-10-07) : option B** — le seed 6e (2020, inutilisé) reste en place sans
  servir ; la 6e nouvelle sera le premier niveau seedé directement dans l'architecture
  points → nœuds (ADR 0020). R1-R4 et R6 toujours en attente de validation.

- **Cycle 3 appliqué (2026-10-07, « je valide tout »)** : notions Premiers pas algébriques
  (Algèbre) et Angles (Grandeurs), 3 sous-notions de Figures planes, bloc R4, niveaux
  rafraîchis → 19 branches, 126 notions, 466 sous-notions (JSON 2026-10-07.3), diagramme
  republié.

- **Programme du cycle 4 comparé (2026-10-07, soir)** : NOUVEAU programme (arrêté du 18-02-2026,
  BO n° 10 du 05-03-2026 ; 5e dès 2026, 4e 2027, 3e 2028) + attendus/repères de l'ancien →
  `programmes-ecarts-cycle4.md`. D2 se referme : 7 notions de géométrie proposées (dont
  Rotations et Homothéties HORS PROGRAMME, demandées par David), ~10 sous-notions, niveaux
  rafraîchis. Questions S1-S7 en attente.

- **Cycle 4 appliqué (2026-10-07, « je valide tout sauf S6 : même traitement hors
  programme »)** : 9 notions de géométrie (Symétrie centrale, Translations, Pythagore, Thalès
  avec droite des milieux, Trigonométrie du triangle rectangle + HORS PROGRAMME Rotations,
  Homothéties, Triangles semblables, Repérage dans l'espace), 17 sous-notions, Algorithmique
  étendue 5e à 2de, niveaux rafraîchis → 19 branches, 135 notions, 483 sous-notions
  (JSON 2026-10-07.4), diagramme republié. D2 CLOSE.

- **2de reprise au gabarit v2 (2026-10-07, soir)** : nouveau texte fourni par David (Annexe,
  vague 2026, calée sur le nouveau cycle 4) vérifié quasi identique à la version révisée de la
  session précédente → `programmes-ecarts-2de.md` (remplace la section 2de de
  `programmes-ecarts.md`). D1 et D3 DISSOUTES par l'ADR 0020, D2 réglée. Proposé : notion
  Tableaux croisés, ~12 sous-notions. Questions T1-T6 en attente.

- **Règle des Automatismes (David, 2026-10-07)** : un contenu = UN point, dans le programme
  qui l'introduit ; une ligne d'Automatismes renvoyant à un contenu antérieur = RÉFÉRENCE
  (point_id, grade) — c'est le rôle de `curriculum_point_automatismes`, déjà en prod et vide ;
  seule une ligne introduisant du neuf devient un point, auto-référencé dans sa liste d'automatismes. JAMAIS de
  duplication de points entre programmes. À inscrire dans la spec du schéma cible ADR 0020.

- **Règle des Automatismes appliquée rétroactivement aux docs cycles 3 et 4 (2026-10-07)** :
  notes ajoutées — les rubriques Automatismes de 6e/5e/4e/3e = références vers des points
  antérieurs, pas des points de l'année. Cycle 2 : non concerné (pas de rubrique Automatismes,
  calcul mental = contenu annuel). Rien en base pour ces niveaux : erreur purement
  documentaire, corrigée avant tout pointage.

- **2de appliquée (2026-10-07, « je valide tout »)** : notion Tableaux croisés, 12
  sous-notions (isoler une variable, expressions fractionnaires, nombres irrationnels, vecteur
  directeur, intersection de deux droites, combinaison linéaire, évolutions successives et
  réciproque, inversion du conditionnement, compléments des fonctions de référence…), 2
  renommages, Puissances : calculs « 5e à 2de », Fractions : sens « CE1 à 2de » → 19 branches,
  136 notions, 495 sous-notions (JSON 2026-10-07.5), diagramme republié. Restent : 1re spé,
  Tle spé, Tle comp., Expertes à reprendre au gabarit v2.

- **1re spé reprise au gabarit v2 (2026-10-07, soir)** : nouveau texte fourni par David
  (Annexe, 11 p., vague 2026) vérifié identique au texte déjà sauvegardé
  (`progs-lycee/premiere-spe.txt`) → `programmes-ecarts-1re-spe.md` (remplace la section
  1re spé de `programmes-ecarts.md`). Vérifié en prod (lecture seule) : le seed 1re spé
  (173 points) suit DÉJÀ ce texte (trigo réduite au cercle, objectif Expérimentations, pas de
  thème Automatismes) — pas de péremption type seed 6e. Proposé : 0 notion, ~12 sous-notions
  (7 en Dérivation/Analyse), 3 requalifications en points, automatismes = références.
  Questions U1-U5 en attente.

- **1re spé appliquée (2026-10-07, « je valide tout », U1-U5)** : 12 sous-notions — condition
  nécessaire/suffisante, statut des lettres et des égalités (Logique), éléments et indices
  (Listes), parité (Généralités sur les fonctions, « 5e à 1re »), taux de variation,
  approximation affine, opérations sur les dérivées, dérivabilité en un point, position
  relative de deux courbes (Dérivation : 7 → 12), angles associés (Fonctions trigo),
  probabilités totales, épreuves indépendantes successives (Probabilités conditionnelles) ;
  requalifiés en points : quantifications implicites, linéarité de l'espérance,
  König-Huygens ; niveaux : Échantillonnage « 2de, 1re », Évolutions « 4e à 2de » → 19
  branches, 136 notions, 507 sous-notions (JSON 2026-10-07.6), diagramme republié. Restent :
  Tle spé, Tle comp., Expertes au gabarit v2.

- **Tle spé reprise au gabarit v2 (2026-10-07, soir)** : nouveau texte fourni par David
  (Annexe, 14 p., vague 2026) vérifié identique au texte déjà sauvegardé
  (`progs-lycee/terminale-spe.txt`) → `programmes-ecarts-tle-spe.md` (remplace la section
  Tle spé de l'ancien). Les fonctions sinus et cosinus sont bien en Tle (vigilance 1re
  levée) ; PAS de rubrique Automatismes en Tle. Seed prod T_SPE (262 points) déjà sur ce
  texte (18 objectifs conformes, vérifié en prod lecture seule). Trois manques v1 déjà
  comblés par le lot 1re (CN/CS, probabilités totales, épreuves indépendantes successives).
  Proposé : 0 notion, ~10 sous-notions (6 en Analyse), 2 requalifications en points.
  Questions V1-V5 en attente.

- **Tle spé appliquée (2026-10-07, « je valide tout », V1-V5)** : 10 sous-notions — par
  équivalence (Raisonnements, « 2de à Tle »), coordonnées du projeté orthogonal
  (Orthogonalité : avec coordonnées), comparaison et encadrement (Limites de fonctions),
  continuité en un point et encadrement d'une solution (Continuité), méthode d'Euler
  (Équations différentielles > Généralités), positivité et inégalités et suites d'intégrales
  (Calcul d'intégrales), intervalle de fluctuation (Loi binomiale), loi des grands nombres
  (Sommes et concentration) ; requalifiés en points : loi de Bernoulli, limites du
  logarithme ; niveau Fonction exponentielle « 1re, Tle » → 19 branches, 136 notions,
  517 sous-notions (JSON 2026-10-07.7), diagramme republié. Restent : Tle comp. et Expertes
  au gabarit v2.

- **Maths de l'enseignement scientifique de 1re, analysées au gabarit v2 (2026-10-07,
  soir)** : programme NOUVEAU dans le chantier (le « module spécifique » = ex-« maths
  spécifiques », grade `1_GEN`, sans section v1, sans texte sauvegardé, sans seed prod) ;
  texte fourni par David (Annexe, 7 p., vague 2026, sauvegardé
  `progs-lycee/premiere-ens-sci.pdf`) → `programmes-ecarts-1re-ens-sci.md`. Structure en deux
  colonnes (seule la droite est exigible) ; Automatismes identiques mot pour mot à la 1re
  spé → mêmes références ; pas de géométrie ; discriminant explicitement exclu. Proposé :
  0 notion, 2 sous-notions (taux d'évolution moyen, fonctions x ↦ aˣ) + question du libellé
  de niveau (« 1re ens. sci. »). Questions W1-W4 en attente.

- **Règle des Automatismes précisée par David (2026-10-07, module 1re ens. sci.)** : une
  référence `curriculum_point_automatismes` vise un point des années PRÉCÉDENTES du parcours
  de l'élève (cycle 4, 2de) ou un point du MÊME programme (contenu neuf de l'année) — jamais
  un point d'un programme parallèle d'une autre voie (le module `1_GEN` ne référence pas un
  point `1_SPE`, même quand les listes d'automatismes sont identiques). Contrainte à inscrire
  dans la spec du schéma cible. Doc corrigé (`programmes-ecarts-1re-ens-sci.md`).

- **Module 1re ens. sci. appliqué (2026-10-07, « je valide tout », W1-W4)** : libellé de
  niveau « 1re ens. sci. » acté (premier programme PARALLÈLE de l'arbre ; grade prod
  `1_GEN` inchangé) ; 2 sous-notions — taux d'évolution moyen (Évolutions, « 4e à 2de,
  1re ens. sci. »), fonctions x ↦ aˣ (Fonction exponentielle, « 1re, 1re ens. sci., Tle » ;
  racine n-ième et exposant 1/n = points dessous) ; Statistique à deux variables
  « 1re ens. sci., Tle comp. » → 19 branches, 136 notions, 519 sous-notions (JSON
  2026-10-07.8), diagramme republié. Restent : Tle comp., Expertes, voie techno 1re/Tle.

- **1re techno analysée au gabarit v2 (2026-10-07, soir)** : programme NOUVEAU (enseignement
  commun voie techno, grade `1_TECHNO`, sans section v1, sans seed prod) ; texte fourni par
  David (Annexe, 10 p., vague 2026, sauvegardé `progs-lycee/premiere-techno.pdf`) →
  `programmes-ecarts-1re-techno.md`. Tronc commun ENTIÈREMENT couvert par l'arbre (les lots
  1re spé/ens. sci. avaient créé toutes les sous-notions nécessaires) : 0 création, points et
  références partout. Propositions limitées à la variante STD2A (4 sous-notions : polygones
  réguliers, frises et pavages, perspective cavalière, sections planes + pointage du nœud
  hors programme Repérage dans l'espace) et à la rubrique Sélection de données (points sous
  Tableaux croisés). Spécialité PCM (STI2D/STL) signalée, hors périmètre. Questions X1-X4 en
  attente.

- **1re techno appliquée (2026-10-07, « je valide », X1-X4)** : libellé « 1re techno » acté ;
  tronc commun = 0 création (points et références) ; Sélection de données = points sous
  Tableaux croisés ; variante STD2A couverte — 4 sous-notions (polygones réguliers dans
  Figures planes, frises et pavages dans Translations, perspective cavalière et sections
  planes dans Solides) et le nœud hors programme Repérage dans l'espace repointé
  (« 1re techno (STD2A) ») ; niveaux : Statistique à deux variables « 1re ens. sci.,
  1re techno, Tle comp. », Échantillonnage « 2de, 1re, 1re techno » → 19 branches,
  136 notions, 523 sous-notions (JSON 2026-10-07.9), diagramme republié. Restent : Tle
  comp., Expertes, Tle techno (texte à venir), spé PCM STI2D/STL (si fournie).

- **Tle techno analysée au gabarit v2 (2026-10-07, soir)** : programme NOUVEAU (grade
  `T_TECHNO`, sans section v1, sans seed prod) ; texte fourni par David (Annexe, 11 p.,
  vague 2026, sauvegardé `progs-lycee/terminale-techno.pdf`) →
  `programmes-ecarts-tle-techno.md`. La Tle techno A une rubrique Automatismes (italiques =
  automatismes propres, références internes au parcours) avec UN contenu orphelin : l'indice
  de base 100 → point de Tle techno auto-référencé dans sa liste d'automatismes (le cas prévu par la règle 2de).
  Les créations ens. sci. (x ↦ aˣ, taux moyen) reçoivent leurs pointeurs techno comme
  anticipé. Proposé : 4 sous-notions (logarithme décimal + renommage Logarithme népérien →
  Logarithmes, indices, coniques et perspective centrale pour STD2A). Questions Y1-Y5 en
  attente.

- **Tle techno appliquée (2026-10-07, « je valide tout », Y1-Y5)** : libellé « Tle techno » ;
  4 sous-notions — indices (Évolutions), logarithme décimal (avec RENOMMAGE de la notion
  `Logarithme népérien` → `Logarithmes`, répercuté dans les 4 fichiers de
  `correspondance/` : 9 occurrences), coniques (Figures planes) et perspective centrale
  (Solides) pour STD2A ; indice de base 100 = premier point né d'une rubrique Automatismes, prévu
  par la règle 2de ; niveaux : Évolutions, Fonction exponentielle, Logarithmes, Statistique
  à deux variables (4 libellés), Loi binomiale, Figures planes et Solides « 1re et Tle
  techno » → 19 branches, 136 notions, 527 sous-notions (JSON 2026-10-07.10), diagramme
  republié. Restent : Tle comp. et Expertes (reprise v1 → v2), spé PCM STI2D/STL si fournie.

- **Tle comp. reprise au gabarit v2 (2026-10-07, soir)** : texte refourni par David
  (Annexe, 12 p., vague 2026) vérifié identique au texte sauvegardé
  (`progs-lycee/complementaires.txt`) → `programmes-ecarts-tle-comp.md` (remplace la
  section Tle comp. de l'ancien doc). Seed prod T_COMP (139 points) déjà sur ce texte
  (vérifié en prod). Moisson maximale des lots précédents : encadrement d'une solution,
  méthode d'Euler, intervalle de fluctuation, formes de primitives 2uu′/eᵘu′/u′/u → tous
  les ex-[P] « avec Tle comp. » passent en [C]. Proposé : 5 sous-notions (fonction
  réciproque, absence de mémoire, fonction de répartition, coefficient de corrélation,
  déciles et rapport interdécile) + renommage `Autres lois > espérance` → « espérance et
  variance ». Questions Z1-Z4 en attente. Ne restera ensuite que la section Expertes.

- **Tle comp. appliquée (2026-10-07, « je valide », Z1-Z4)** : 5 sous-notions — fonction
  réciproque (Continuité), absence de mémoire et fonction de répartition (Autres lois),
  coefficient de corrélation (Statistique à deux variables), déciles et rapport interdécile
  (Indicateurs, « 5e à 2de, Tle comp. ») — + renommage `Autres lois > espérance` →
  « espérance et variance » ; requalifications reconduites (somme géométrique, loi de
  Bernoulli, moindres carrés/interpolation = points) → 19 branches, 136 notions,
  532 sous-notions (JSON 2026-10-07.11), diagramme republié. Reste : la section Expertes de
  l'ancienne analyse (dernier lot lycée).

- **Expertes reprises au gabarit v2 (2026-10-07, soir — DERNIER LOT)** : texte fourni par
  David (annexe BO classique, 11 p. — pas de mouture « vague 2026 », texte reconduit)
  vérifié identique au texte sauvegardé (`progs-lycee/expertes.txt`) →
  `programmes-ecarts-expertes.md` (remplace la section Expertes de l'ancien doc, désormais
  entièrement remplacé). Seed prod T_EXP (153 points) déjà conforme. Les 4 branches
  concernées étant nées de ce programme, presque tout est [C]. Proposé : 5 sous-notions
  (formule du binôme, formules d'addition et de duplication, petit théorème de Fermat,
  équations ax ≡ b [n], distribution après n transitions) + 2 requalifications en points.
  Questions AA1-AA3 en attente.

- **Expertes appliquées (2026-10-07, « je valide tout », AA1-AA3) — TOUR DES PROGRAMMES
  COMPLET** : 5 sous-notions — formule du binôme (Forme algébrique), formules d'addition et
  de duplication (Formes trigo. et exponentielle — seul programme introducteur depuis la
  réforme 2026), équations ax ≡ b [n] et petit théorème de Fermat (Congruences),
  distribution après n transitions (Chaînes de Markov) ; premiers entre eux et infinité des
  nombres premiers = points → 19 branches, **136 notions, 537 sous-notions** (JSON
  2026-10-07.12), diagramme republié. TOUS les programmes CP→Tle, toutes voies, sont au
  gabarit v2 (11 documents : cycles 2-4, 2de, 1re/Tle spé, Tle comp., Expertes, 1re ens.
  sci., 1re/Tle techno) ; `programmes-ecarts.md` (v1) est entièrement remplacé, conservé en
  archive. Prochaine étape du chantier : spécification du schéma cible ADR 0020
  (points→nœuds, références d'automatismes par parcours, régimes fluence/diversité, 6e d'avril
  2025 en premier seed — phase 0 TDD à faire valider), puis relance de la table de
  correspondance sur l'arbre élargi.

- **Clarification terminologique + questions de phase 0 (2026-10-07, soir)** : David a fait
  retrouver l'origine de `regime_acquisition` — migrations du 2026-08-29 (création
  `knowledge_type`) et du 2026-08-30 (renommage : `automatisme` → `fluence` [≥ 5 réussites
  ET ≥ 3/5 dernières], `capacite_attendue` → `diversite` [≥ 2 modèles distincts ET 0 échec
  /3 dernières], appliqués par `update_student_point_state` ; la MÊME migration créait
  `curriculum_point_automatismes` avec déjà le raisonnement des références). Mon « régime
  automatisme » du tour des programmes était un ABUS DE LANGAGE recréant la confusion
  qu'août avait éliminée → 11 occurrences corrigées (progress, cycle 3, 2de, Tle techno) en
  « point auto-référencé dans sa liste d'automatismes ». Mesuré aussi : `rang` (échelle
  descriptive 1-4 par objectif) = 0/1007 rempli, code vivant mais à vide → reco ABANDON.
  → `schema-cible-questions.md` créé : acquis tranchés + 7 questions pour la phase 0
  (rang, rubrique BO, kind algorithme, héritage des listes, parcours, accès, régime au
  reseed).

- **Phase 0 du schéma cible LANCÉE (2026-10-07, soir)** : `schema-cible-spec.md` écrit —
  27 comportements (C1-C27) en cas nominal/limite/erreur, bâtis sur la PR 1 (nœuds +
  rangements exercices/modèles déjà livrés, un seul nœud par contenu — l'ex-Q8 était déjà
  tranchée). Périmètre : points→nœuds (node_id nullable en transition, grade porté par le
  point, rubrique), références d'automatismes (contrainte de parcours, auto-référence,
  héritage par duplication au seed), table grade_predecessors (clôture transitive, T_EXP
  sans T_SPE dans son parcours, T_GEN hors parcours), transition (6e premier seed, seeds
  existants intacts), accès (MESURÉ : référentiel actuel = authenticated seulement ; arbre
  PR 1 = anon ; proposition d'alignement anon = LA question d'accès). 7 décisions B1-B7 en
  attente de David. Pas de test ni de SQL avant validation.

- **Précision de David sur les rangements (2026-10-07)** : un modèle de question = UN nœud ;
  un exercice, plus composite, = UN OU PLUSIEURS nœuds. Vérifié : la PR 1 le fait déjà
  (`exercise_classifications` en table de liaison, PK (exercise_id, node_id), au plus un
  `is_primary` par exercice, test « deux principaux refusés » vert) — seule la phrase de
  résumé de `schema-cible-spec.md` (« un seul nœud par contenu ») était fausse, corrigée.
  Aucun changement de migration ni de test.

- **Orientation de transition corrigée par David (2026-10-07)** : « on refait tout à 0 » —
  la cible se reconstruit depuis les documents v2 (source de vérité), on ne complète NI ne
  corrige les points existants. Spec réécrite (C4 : seeds neufs complets dès l'insertion ;
  C5 : anciens points intouchés → transfert des tags par appariement → bascule → archivage ;
  C23 aligné). Mesuré en prod : 0 acquisition d'élève, 22 tentatives (tenant aux modèles),
  1 026 tags modèles→points = le SEUL actif à transférer (342 1_SPE, 308 T_SPE, 173 T_EXP,
  140 T_COMP, 63 2de). Le backfill de grade des anciens points est abandonné (inutile).

- **C5 durci par David (2026-10-07) : base propre tout de suite, pas de musée.** Inventaire
  d'usages fait (règle pré-DROP) : ~25 fichiers de prod lisent le référentiel actuel
  (programme/objectifs/analytics, édition questions, skill-attempts, SRS, anti-fraude,
  export RGPD) → la suppression ne peut pas précéder la bascule du code, mais elle devient
  l'ÉTAPE FINALE PLANIFIÉE de la séquence (seeds neufs → transfert des 1 026 tags → bascule
  du code → suppression anciens points + themes/objectives + rang + vieux seed 6e), plus un
  « volet de fin de chantier » indéfini. Spec mise à jour (en-tête, C5, C10, C11, C22, C23).

- **Phase 0 VALIDÉE (2026-10-07, « je valide tout », B1-B7 + C1-C27)** : rang abandonné,
  rubrique en champ texte, kind `algorithme`, duplication des listes au seed, table
  `grade_predecessors` (T_EXP ← 1_SPE, T_GEN hors parcours), LECTURE ANONYME du référentiel
  (la question d'accès), régime au choix par seed. Suite engagée : tests d'intégration
  (rouges d'abord) → migration additive → security-auditor. db:migrate prod attendra la
  décision de pousser la branche (la PR 1 des nœuds n'est pas en prod).

- **Migration du schéma cible écrite et VERTE en local (2026-10-07, soir)** :
  `20261007230000_schema_cible_points.sql` (additive, rollback en commentaire) — node_id/
  grade/rubrique sur curriculum_points (objective_id devenu facultatif), kind `algorithme`,
  table `grade_predecessors` + `grade_ancestors()` + anti-cycle + seed des 16 paires,
  contrainte de parcours sur curriculum_point_automatismes (voie parallèle/postérieur/point
  sans grade = 23514), lecture anon (GRANT nécessaire : l'audit 2026-08 avait tout révoqué
  à anon — découvert au premier run). Tests `schema-cible-points.test.ts` : preuve ROUGE
  d'abord (19 échecs sans la migration), puis **88/88 verts** (25 nouveaux + 52 PR 1 + 11
  renommage). ⚠️ `main` MERGÉ dans la branche (le renommage #922 n'y était pas — contrainte
  locale refusait 1_TECHNO). check:incremental 0 erreur, lint:fast OK. Reste :
  security-auditor (condition 3) ; db:migrate prod attendra la décision de pousser.

- **Audit sécurité passé et corrections appliquées (2026-10-07, soir)** : AUCUN finding
  bloquant. Corrigé sur ses findings : (1) le garde-fou `anon-option-b.test.ts` (inventaire
  de l'audit d'octobre, 141→139 relations fermées, curriculum_points/automatismes +
  grade_predecessors ajoutés aux tables LUES par anon — l'ouverture B6 est enregistrée) ;
  (2) commentaires inexacts de la migration (grade_ancestors N'est PAS exécutable par anon
  — privilèges par défaut ; UNION borne la récursion même en cas de cycle) ; (3) remarque 3
  transformée en verrou : trigger symétrique `curriculum_points_references_parcours`
  (changer le grade d'un point référencé ne peut pas invalider ses références — C14 vaut
  pour l'ÉTAT) + test. Résultat : **683/683 verts** (schéma cible 26, arbre 52, renommage
  11, anon-option-b 594), check:incremental 0 erreur. Les 4 conditions db:migrate seront
  réunies au moment du passage en prod (décision de pousser = David).

- **Correspondance RELANCÉE sur l'arbre complet (2026-10-07, soir)** : cibles revérifiées
  (3 mortes corrigées — les 2 renommages de sous-notions non répercutés), 160 modèles +
  150 exercices rejugés un à un → 22 + 23 bascules (le bénéfice direct des sous-notions du
  tour : angles associés, petit Fermat, distribution après n transitions, coordonnées du
  projeté orthogonal, suites d'intégrales, positivité et inégalités, épreuves indépendantes
  successives, position relative, opérations sur les dérivées…), familles NC tranchées
  (« à trou » = l'opération confirmé, ×0,5 → moitié), « debug » EXCLU, 4 cas à trancher
  avec David, et DÉCOUVERTE : **26 exercices sans titre** en prod (pas 2). CSV mis à jour
  en place, 0 cible morte, synthese.md marqué périmé → `correspondance/relance-2026-10-07.md`
  (lots 1-4 à valider par David).

- **Règle de rangement énoncée par David (2026-10-07)** : on classe ce que le contenu EST,
  jamais ce qui est au programme — un nœud hors du programme du grade est un rangement
  légitime (l'arbre déborde ; nœud sans point pour le grade = étiquette « hors programme »
  automatique dans le schéma cible). Corrigé en conséquence : BAC Mars 2021 (suites
  couplées RESTAURÉES aux côtés de récurrence/limites) et les 2 modèles « escalier » de 1re
  (→ Suites récurrentes > escalier). Grep de contrôle : aucune autre censure dans la
  correspondance.

- **Relance de la correspondance : lots 1-3 VALIDÉS par David (2026-10-07)** — familles NC,
  45 bascules (+ les 3 corrections de la règle de rangement), 260 confirmations en bloc.
  Reste le lot 4 (7 cas ligne à ligne), en cours de présentation avec les énoncés réels lus
  en prod.

- **Lot 4 tranché sur pièces (2026-10-07)** : les 7 énoncés lus en prod (lecture seule) —
  phare/bateau → équations de droites + normal + distance ; Concours général → récurrence
  centrale ; presque isocèles → réciproque de Pythagore + boucle (titre proposé) ;
  vrai/faux → substitution + opposé (titre proposé) ; encadrement de e → position relative
  (PAS les suites : l'énoncé passe par les variations) ; marche aléatoire → épreuves
  indépendantes successives confirmées ; fréquence des lettres → Listes + effectifs (pas de
  VA dans l'énoncé). CSV final : 1 005 modèles + 328 exercices en haute, 1 exclu. Validation
  du lot 4 par David en attente.

- **CORRESPONDANCE ENTIÈREMENT VALIDÉE (2026-10-07, lots 1-4)** : 1 005 modèles + 328
  exercices en haute, 1 exclu (« debug »), 0 cible morte. Prête pour le remplissage des
  rangements dès la mise en prod de la branche (PR 1 + schéma cible). Décisions données
  prod à part : titrage des 26 sans-titre (2 titres déjà proposés), sort de « debug ».

- **EN PRODUCTION (2026-10-07, soir — « on envoie » de David)** : PR #937 mergée (CI verte
  au 2e passage : 4 tests de l'ancien monde mis au diapason B6/C13 ; crash navigateur =
  flaky d'infra purgé au re-run) ; branche et worktree supprimés proprement (0 untracked).
  `db push --include-all` : migrations 20261007120000 (arbre) + 20261007230000 (schéma
  cible) APPLIQUÉES EN PROD — vérifié : 16 parcours, 1 007 points intacts (0 modifié, C5),
  3 colonnes neuves, arbre/source_types vides (seeds de données = étape suivante).
  `db:types` → PR #940 mergée (avec le filet `?? ''` sur la page programme :
  `objective_id` nullable). PROCHAINES ÉTAPES : seed des NŒUDS (l'arbre 2026-10-07.12
  depuis le JSON) + seed 6e (premier programme points→nœuds) + remplissage des rangements
  depuis la correspondance validée + séquence C5 (transfert tags → bascule → suppression) ;
  décisions données prod à part : titrage des 26 sans-titre, sort de « debug ».

- **Seed des NŒUDS écrit et vert en local (2026-10-08, « 1 » de David)** : migration
  `20261008090000_seed_classification_nodes.sql` GÉNÉRÉE depuis arbre-notions.json
  (2026-10-07.12) par script — 19 branches, 136 notions, 537 sous-notions, positions =
  ordre du JSON, unicité par fratrie vérifiée avant génération. Test
  `seed-classification-nodes.test.ts` : preuve rouge (692 chemins absents) puis VERT —
  comparaison INTÉGRALE des 692 chemins JSON ↔ base (lecture anonyme, pagination
  PostgREST), positions, rien d'archivé ; non-régression arbre + schéma cible : 81/81.

- **L'ARBRE EST EN PRODUCTION (2026-10-08)** : PR #943 mergée (CI 13/13, audit sécurité
  sans finding), `db:migrate` appliqué, vérifié en prod : **19 branches, 136 notions,
  537 sous-notions** dans `classification_nodes`, lisibles par tous. Worktree et branches
  supprimés. Prochaines étapes : seed 6e (premier programme points→nœuds), remplissage des
  rangements (correspondance validée), séquence C5.

- **Ordre de seed REDÉFINI par David (2026-10-07) : CM1-CM2 → cycle 2 (CP-CE1-CE2) → 6e**
  (remplace « la 6e d'abord » de R5/C23) : les programmes du primaire n'ont aucune rubrique
  Automatismes → seeds autonomes, et la 6e arrivera complète d'un coup, références
  d'automatismes comprises (la question C22 des références différées disparaît). Document
  de seed CM1-CM2 rédigé : `docs/wip/arbre-notions/seed-cm.md` — 246 points (130 CM1 +
  116 CM2), énoncés verbatim du BO (28 p. relues), nœuds résolus, rubriques C11, 1 seule
  scission (faits numériques), questions S1-S6 posées à David. EN ATTENTE DE VALIDATION —
  aucune migration avant.

- **Seed CM1-CM2 VALIDÉ et construit (2026-10-07, « je valide tout » : S3-S6 = recos)** :
  décisions de David sur les 6 rattachements discutables — fractions décimales = FRACTIONS
  (12 points re-rattachés), renommages « arrondis et ordres de grandeur » et « double et
  moitié », sous-notions « calcul réfléchi » (division) et « droite graduée » (décimaux),
  notion « Préalgorithmique » EN TÊTE de la branche Algorithmique (les 4 points pensée
  informatique de la 6e y sont candidats, à confirmer au seed 6e), assemblages de cubes
  sous Solides. Arbre **2026-10-07.13** (19 + 137 + 539). Migration
  `20261008120000_seed_curriculum_points_cm.sql` GÉNÉRÉE depuis seed-cm.md (script en
  session) : ajustements d'arbre + 246 points (130 CM1 + 116 CM2, objective_id NULL,
  codes explicites, fluence = calcul mental). Preuve rouge faite (3 tests), puis VERT :
  comparaison intégrale fixture ↔ base en lecture anonyme (79/79 avec les voisins).
  Correspondance : 3 chemins « moitié » répercutés dans modeles.csv.

- **Document de seed cycle 2 rédigé (2026-10-08, « cycle 2 » de David)** :
  `docs/wip/arbre-notions/seed-cycle2.md` — 227 points (CP 69, CE1 82, CE2 76), Annexe 4
  du BOENJS n° 41 du 31-10-2024 extraite ligne à ligne (38 p., colonne « Objectifs
  d'apprentissage » seule). Conventions du seed CM reconduites ; AUCUNE scission, aucun
  changement d'arbre (le .13 absorbe tout) ; fluence = 30 points de calcul mental ;
  8 rattachements discutables listés (dont assemblages → Solides, montants en euro →
  Monnaie). EN ATTENTE DE VALIDATION (V1) — aucune migration avant.

- **Seed cycle 2 VALIDÉ et construit (2026-10-08, « ok » de David = V1)** : migration
  `20261008150000_seed_curriculum_points_cycle2.sql` GÉNÉRÉE depuis seed-cycle2.md —
  227 points (69 CP + 82 CE1 + 76 CE2), AUCUN changement d'arbre (le .13 absorbe tout),
  fluence = 30 points de calcul mental, scopage branche+parent d'emblée (leçon du seed
  CM). Preuve rouge (3 tests) puis comparaison intégrale fixture ↔ base en lecture
  anonyme : 83/83 verts avec les voisins (seed CM, nœuds, schéma cible, curriculum-seed).

- **Document de seed 6e rédigé (2026-10-08, « go » de David)** :
  `docs/wip/arbre-notions/seed-6e.md` — 97 points (95 Connaissances + 2 lignes
  d'Automatismes au contenu neuf : périmètre carré/rectangle, jours/année/siècle), codes
  6-101…6-197 (l'ancien seed 2020 garde 6-001…6-095 jusqu'à C5), ET les 35 lignes
  d'Automatismes dispatchées en RÉFÉRENCES vers 28 points CM1/CM2/CE1/CE2 (règle : cible
  = le point le plus récent du parcours qui couvre). Premier grade à références — C22
  dissoute. Questions A1-A4 (Préalgorithmique vs coder un déplacement ; kind algorithme ;
  codes ; ensemble). EN ATTENTE DE VALIDATION — aucune migration avant.

- **Seed 6e VALIDÉ et construit (2026-10-08, « je valide tout » : A1-A4 = recos)** :
  migration `20261008190000_seed_curriculum_points_6e.sql` GÉNÉRÉE depuis seed-6e.md —
  97 points (codes 6-101…6-197, display_order = code − 100), kind `algorithme` pour les
  4 points de pensée informatique → notion Préalgorithmique (A1), fluence = les 2 points
  issus d'Automatismes, ET les 28 PREMIÈRES références de curriculum_point_automatismes
  (grade '6' → points CM1/CM2/CE1/CE2, trigger de parcours à l'œuvre). Bloc DO : 97/0/28/
  2/4 + les 95 anciens 6-0xx INTACTS. Preuve rouge (3 tests) puis 88/88 verts avec les
  5 voisins. La question C22 (références différées) est définitivement dissoute.

- **LE SEED 6e EST EN PROD (2026-10-08, PR #946) — l'ordre CP→6e est COMPLET : 570
  points dans l'architecture points → nœuds.** Audit non bloquant (remarque I-1 intégrée
  au rollback) ; CI verte au re-run (flaky `evaluation-notee-serveur` test D : anti-fuite
  `not.toContain('"6"')`, faux positif de graine — 30/30 ×6 en local ; à durcir un jour).
  Vérifié prod : 97 points / 0 sans nœud / 28 références (4 grades cibles) / 4 algorithme
  / 2 fluence / 95 anciens 6-0xx intacts. Suivent : remplissage des rangements
  (correspondance validée) puis séquence C5 (transfert des tags → bascule → suppression).

- **Document de seed cycle 4 rédigé (2026-10-08, redirection David : « dans l'ordre des
  années à cause des références »)** : `docs/wip/arbre-notions/seed-cycle4.md` — 226
  points (106 en 5e, 69 en 4e, 51 en 3e), Annexe 2 du BO n° 10 du 05-03-2026 ligne à
  ligne (20 p.), dont 3 lignes d'Automatismes au contenu neuf (angles de l'équerre 5e ;
  décomposition en facteurs premiers et opposé d'une expression 3e), 17 points kind
  algorithme (pensée informatique → Variables et instructions/Boucles, S5), 4 points
  demonstration, 1 seule scission (aire du disque / volume du cylindre), et ~100 lignes
  d'Automatismes dispatchées en références (cibles cycle 2/CM/6e ET intra-cycle 4 par
  codes prévisionnels 5-xxx/4-xxx). La 2de déjà extraite (13 p.) attend son tour.
  EN ATTENTE DE VALIDATION (C1-C3) — aucune migration avant.

- **Seed cycle 4 VALIDÉ et construit (2026-10-08, points 1-10 + C1 + C2 tranchés un à un
  par David)** : migration `20261008230000_seed_curriculum_points_cycle4.sql` GÉNÉRÉE
  depuis seed-cycle4.md — sous-notion « ratio » (Situations de proportionnalité, arbre
  **2026-10-07.14** : 19+137+540), 226 points (106/69/51), kinds demonstration ×4 et
  algorithme ×18 (dont 5-011), fluence ×5 (C2 étendu : + carrés 0-12 et cube de 10),
  4-038 (rectangles sans équerre) → triangles (inversion David), ET 118 références
  d'automatismes (44/40/34) vers cycle 2/CM/6e et INTRA-cycle 4. Preuve rouge (5 tests)
  puis 93/93 verts avec les 6 voisins. dessin_branches.py + HTML régénérés (diagramme à
  republier après merge).

- **LE SEED CYCLE 4 EST EN PROD (2026-10-08, PR #948) — CP→3e complet : 796 points du
  nouveau monde, 146 références d'automatismes.** Audit : rien de bloquant (I-1/I-2
  intégrés avant merge), CI verte du premier coup sur le commit corrigé. Vérifié prod :
  106/69/51 points, 0 sans nœud, 44/40/34 réfs, fluence 5, algorithme 18, demonstration
  4, 696 nœuds (ratio), 1 007 anciens intacts. Diagramme republié (v43). Suivent, dans
  l'ordre des années : 2de (déjà extraite), 1re spé, Tle spé, Tle comp., Expertes.

- **LE SEED 2de EST EN PROD (2026-10-08, PR #954) — CP→2de : 996 points du nouveau monde,
  204 références d'automatismes.** `seed-2de.md` validé intégralement par David (11 puces
  multi-notions scindées → 28 points, 10 non-scissions argumentées, 2 puces trop larges
  NON retenues : ex-2-099 « représentation la plus adaptée des vecteurs » et ex-2-100
  « méthodes diverses » — évaluation par compétence, pas des points ; L1 bloc algo en
  `algorithme`, L2 Exemples d'algorithme `attendu`, L3 Approfondissements savoir-faire).
  Arbre `.15` : branche Logique restructurée (C2) — « Proposition mathématique » en tête
  (statut des lettres + et, ou, non), contre-exemple → Raisonnements ; diagramme v44.
  Vérifié prod : 200 points (2-201…2-400), 0 sans nœud, 58 réfs dont 8 auto-références,
  algorithme 27, démonstration 11, approfondissement 14, 185 anciens 2de et 1 007 anciens
  intacts, 696 nœuds. Audit : rien de bloquant (rollback : tables en cascade nommées ;
  collision de codes vérifiée en prod). CI : un timeout de l'oracle des limites (5 037 ms
  sous charge, 0,8 s en local ×3) → relance verte ; 2ᵉ test instable connu. Suivent :
  1re spé, Tle spé, Tle comp., Expertes.

- **LE SEED 1re SPÉ EST EN PROD (2026-10-08, PR #957) — 1 161 points du nouveau monde,
  297 références.** `seed-1spe.md` validé intégralement (11 puces scindées → 24 points ;
  S1 : 3 anciens points absents du texte littéral GARDÉS car des modèles les travaillent
  — remarque de David ; V2 : règle « point vague → spécifier, compétence → retirer »,
  2 retraits, 1 refusion, 3 reformulations ; V1 : 14 références d'entretien du
  vocabulaire de 2de ; C16 : liste de 2de reprise). **E1** : les Exemples d'algorithme
  sont `approfondissement` (décision du 2026-08-29, que j'avais mal présentée en 2de) —
  les 10 de 2de corrigés dans la même migration. Vérifié prod : 165 points, 0 sans nœud,
  93 réfs (1 auto-référence), algorithme 17, démonstration 12, approfondissement 29,
  E1 = 10, 173 anciens points et leurs 342 liens intacts. Audit : rien de bloquant.
  CI : le test de l'ancien seed (« aucune liste 1_SPE ») mis au diapason. Report C5 des
  liens documenté (vocabulaire → points de 2de). Suivent : Tle spé, Tle comp., Expertes ;
  passe « points vagues » sur la 2de à faire.

- **LE SEED Tle SPÉ EST EN PROD (2026-10-08, PR #960) — 1 400 points du nouveau monde,
  400 références.** `seed-tspe.md` validé intégralement : 239 points `TSPE-301`…`539`
  (base 301 : l'ancien seed occupe 001…262) ; 7 puces scindées en plus de l'ancien
  découpage (+8), 6 refusions (parties visant le même nœud, sans lien) ; entretien
  (U5/V1) → 23 références vers 2de/1re (vocabulaire, logique, listes, transformation par
  exp) ; A1 : liste d'automatismes de 1re spé reprise pour le cycle terminal (103 réfs au
  total) ; P1 : « Résoudre des problèmes impliquant des grandeurs et mesures » retirée.
  18 Exemples d'algorithme (E1), 18 démonstrations, 50 approfondissements. Vérifié prod :
  0 sans nœud, 262 anciens points et 308 liens intacts. Audit : rien de bloquant. CI verte
  du premier coup (test de l'ancien seed restreint à grade NULL avant le push). Suivent :
  Tle comp., Expertes ; passe « points vagues » sur la 2de.

- **LE SEED Tle COMP. EST EN PROD (2026-10-08, PR #961) — 1 529 points du nouveau monde,
  497 références.** `seed-tcomp.md` validé intégralement : 129 points `TCOMP-201`…`329`
  (parcours `T_COMP` → `1_SPE`, voie parallèle à la Tle spé) ; 8 puces scindées (+8),
  3 refusions ; entretien → 15 références vers la 2de et la 1re ; A1 → liste de 1re reprise
  (97 réfs) ; ex-007 « modéliser » retiré (compétence), P1 : ex-030 retiré ; D1 : point
  « déciles, rapport interdécile » (seul contenu propre aux Thèmes d'étude) en
  approfondissement ; Démonstrations possibles en approfondissement. Vérifié prod : 0 sans
  nœud, 139 anciens points et 140 liens intacts. Audit : rien de bloquant. CI verte du
  premier coup. Reste : Expertes ; passe « points vagues » sur la 2de.

- **LE SEED MATHS EXPERTES EST EN PROD (2026-10-08, PR #965) — TOUS LES SEEDS SONT FAITS :
  1 682 points du nouveau monde sur 14 niveaux (CP → Tle, voies générales), 0 sans nœud,
  497 références.** `seed-texp.md` validé intégralement : 153 points `TEXP-201`…`353`,
  reprise UN POUR UN de l'ancien découpage (aucune scission ni fusion nouvelle), rubrique =
  thème seul pour Arithmétique et Graphes et matrices (le BO ne les découpe pas), 4 Exemples
  d'algorithmes et 28 Problèmes possibles en approfondissement, A1 = non (aucune
  référence : la liste de 1re est portée par la Tle spé, suivie en parallèle). Vérifié
  prod : 153 anciens points et 173 liens intacts. Audit : rien de bloquant. CI verte du
  premier coup. **Restent** : passe « points vagues » sur la 2de (PR dédiée) ; remplissage
  des rangements ; séquence C5 (transfert des liens ex- → nouveaux points, bascule, puis
  SUPPRESSION de l'ancien monde — destructif, arrêt et accord David).

- **LE SEED 1re TECHNO EST EN PROD (2026-10-08, PR #966) — 1 787 points du nouveau monde,
  586 références.** (Correction : le « tous les seeds faits » annoncé après les Expertes
  était faux — David a rappelé la voie techno ; restaient 1_TECHNO, T_TECHNO, 1_GEN.)
  `seed-1techno.md` validé intégralement : 105 points `1TECHNO-001`…`105` (pas d'ancien
  seed : construit puce par puce depuis le BO PDF) ; T1 : série dans la rubrique (11 points
  « sauf STD2A », 18 « série STD2A ») ; T2 : Situations algorithmiques `attendu` ; 9 puces
  scindées (+9) ; 2 « modéliser » retirés ; 89 réfs (lignes propres + auto-réf 1TECHNO-066

  - liste de 2de C16 + entretien). Vérifié prod : 0 sans nœud. Audit : rien de bloquant.
    CI verte du premier coup. Restent : T_TECHNO, 1_GEN (ens. sci.) ; passe « points
    vagues » 2de ; rangements ; C5.

- **LE SEED Tle TECHNO EST EN PROD (2026-10-08, PR #968) — 1 856 points du nouveau monde,
  671 références ; ancien monde intact (1 007 points).** `seed-ttechno.md` validé (« je te
  suis » : recommandations suivies sur les 7 discutables, T3, T4) : 69 points
  `TTECHNO-001`…`069` (pas d'ancien seed, construit puce par puce depuis le BO PDF) ; T1 :
  14 points « série STD2A » ; T3 : 8 Situations algorithmiques en `approfondissement` ;
  8 puces scindées (+8) ; 85 réfs (53 Automatismes de Tle dont l'auto-réf TTECHNO-015, T4 :
  pas de reprise de la liste de 1re ; 32 d'entretien, dont tout le bloc Algorithmique →
  1TECHNO-003…013). Preuve rouge (3/4), intégration 184 fichiers verts, audit sans
  bloquant, CI verte du premier coup. Vérifié prod : 0 sans nœud. Restent : 1_GEN (ens.
  sci.) ; passe « points vagues » 2de ; rangements ; C5.

- **LE SEED 1re ENS. SCI. (1_GEN) EST EN PROD (2026-10-08, PR #971) — TOUS LES SEEDS SONT
  FAITS : 1 900 points du nouveau monde sur 17 niveaux, 755 références ; ancien monde
  intact (1 007 points).** `seed-1gen.md` validé intégralement : 44 points `1GEN-001`…`044`
  (pas d'ancien seed), tout `attendu`, aucun algorithme ; colonne « Situations et
  problèmes » non exigible ; intitulés « Analyse statistique de deux caractères … » traités
  comme préfixes ; 4 puces scindées (+4) ; 84 réfs (lignes Automatismes = mêmes cibles
  qu'en 1re techno, auto-réf 1GEN-027 ; liste de 2de C16 ; 7 d'entretien) ; aucune cible
  1_SPE / 1_TECHNO (bloc DO + test). Preuve rouge 3/4 (après ajout d'un compte au test
  d'attributs, qui passait sur base vide), intégration 185 fichiers verts, audit sans
  bloquant, CI verte. Restent : passe « points vagues » 2de ; rangements (1 005 modèles,
  328 exercices) ; C5 (transfert, bascule, suppression de l'ancien monde — destructif,
  arrêt et accord David).

- **PASSE « POINTS VAGUES » SUR LA 2de EN PROD (2026-10-08, PR #972).**
  `passe-points-vagues-2de.md` validée intégralement : 200 points relus, 6 touchés.
  **2-332 SUPPRIMÉ** (« Modéliser par des fonctions… », compétence) — accord explicite de
  David après exposé de la perte (la ligne seule : 0 usage dans les 6 tables qui
  référencent les points, ancien jumeau 2-128 sans lien, aucune mention dans `src/`) ;
  garde dans la migration (verrou de ligne + refus si usage), testée en local avec un usage
  fabriqué ; usage revérifié à 0 en prod juste avant `db:migrate`. **5 libellés
  spécifiés** avec les mots du BO (2-262, 2-277, 2-392, 2-394, 2-395) ; **2-262** passe
  sur la notion `Calcul littéral` (son ancien jumeau 2-060 porte 7 modèles de calcul
  littéral général). `seed-2de.md`, fixture et test de la 2de mis à jour (199 points).
  Preuve rouge (2 tests de la passe), intégration 185 fichiers verts, audit sans
  bloquant (mineur corrigé : verrou), CI verte. Vérifié prod : 199 points de 2de, 1 899
  points du nouveau monde, ancien monde intact (1 007). Restent : rangements (1 005
  modèles, 328 exercices) ; C5 (transfert, bascule, suppression de l'ancien monde —
  destructif, arrêt et accord David).

- **PASSE « PUCES ET POINTS » SUR LE CYCLE 2 EN PROD (2026-10-09, PR #974).** Demande de
  David : « le même soin qu'au lycée » pour les cycles 2, 3, 4 (le primaire et le collège
  avaient été seedés avec une règle lâche : puce sur plusieurs sous-notions → point sur la
  notion, quasi aucune scission). BO relus en entier (cycle 2 : BO 31-10-2024 ; cycle 3 :
  BO 17-04-2025 ; cycle 4 : BO 05-03-2026 — tous en vigueur en 2026, retrouvés dans les
  uploads de session). `passe-cycle2.md` validé : 16 scissions (+17 points), 9
  spécifications avec les « Exemples de réussite », CE1-052 en connaissance, 0 suppression,
  aucune référence touchée → 244 points. Preuve rouge (3 tests de la passe), intégration
  185 fichiers verts, audit sans bloquant (mineurs du rollback corrigés), CI verte.
  Vérifié prod : 72/89/83, 34 fluence, ordre 1..n par grade, 2 réfs CE2-022 intactes,
  1 916 points du nouveau monde. **En validation** : `passe-cycle3.md` (16 scissions, 9
  spécifications, 2 retraits, 17 réfs ajoutées) et `passe-cycle4.md` (12 scissions, 12
  spécifications, 4 libellés au mot près, 2 retraits, 42 réfs ajoutées) — analysés par
  agents puis vérifiés (nœuds, BO, réfs, usages des retraits = 0, codes neufs libres).

- **PASSE « PUCES ET POINTS » SUR LE CYCLE 3 EN PROD (2026-10-09, PR #976).** Validée par
  David (« cycle 3 puis cycle 4 », doutes = recos, retraits compris). 16 puces scindées
  (+22 points : CM1-131…139, CM2-117…125, 6-198…201), 9 spécifications, 17 références
  AJOUTÉES (la ligne qui visait le point d'origine couvre la nouvelle partie ; les réfs de
  1re/Tle viennent de la liste de 2de reprise, passée de 58 à 60 cibles), **CM1-096 et
  CM2-086 SUPPRIMÉS** (0 usage revérifié juste avant `db:migrate` ; garde avec verrou,
  testée en local). Preuve rouge (9 fichiers), intégration verte, audit sans bloquant
  (état final rejoué = fixtures, 363/363), CI verte. Vérifié prod : CM1 138, CM2 124, 6e 101,
  ordre 1..n, 17 réfs, 1 936 points du nouveau monde, 772 réfs. Le test 6e filtre désormais
  par grade (6-200, 6-201 sortent du motif 6-1xx).

- **PASSE « PUCES ET POINTS » SUR LE CYCLE 4 EN PROD (2026-10-09, PR #977) — LA PASSE EST
  FINIE SUR TOUS LES NIVEAUX DU PRIMAIRE ET DU COLLÈGE.** 13 puces scindées (+17 points :
  5-107…115, 4-070…072, 3-052…056 ; 5-073 scindé, reco du doute 1), 12 spécifications, 4
  libellés remis au mot près du BO (4-001, 4-003, 4-013, 4-020), 42 références AJOUTÉES (la
  partie qui garde le code est celle que visent les références : 4-025 « résoudre », 5-077
  « graphiques », 4-034/3-022 théorème direct, 3-008 analytique), **5-081 et 3-031
  SUPPRIMÉS** (0 usage revérifié avant `db:migrate`, garde testée en local). Preuve rouge
  (8 fichiers), intégration verte, audit sans bloquant (rejeu prod + migration = fixtures,
  241/241), CI verte. Vérifié prod : 5e 114, 4e 72, 3e 55, ordre 1..n, 42 réfs ; **1 951
  points du nouveau monde, 814 références, ancien monde intact (1 007)**. Laissé à David
  (mineur, signalé par l'audit) : 3-053 (x² = a graphique) et 5-112…114 (représenter des
  données) ne reçoivent aucune référence — les lignes d'automatismes ne les visaient pas
  avant la scission. Restent : rangements (modèles, exercices) ; C5.

- **RANGEMENTS — LANCÉS (2026-10-09, « ok on commence le rangement »).** Ordre retenu avec
  David : rangements PUIS C5 (transfert des liens → bascule du code → suppression). Prod
  mesurée : 1 005 modèles et 329 exercices, **ensembles d'identifiants identiques** à la
  correspondance validée (empreintes md5 égales), 0 rangé, 0 type de source. **Décisions de
  David** : livraison par **migration de données** (prouvée en rejouant la migration en local
  sur des copies des identifiants de la prod) ; **types de source** (7 « Bac », 1 « Concours »)
  dans la même livraison. Correspondance mise à jour : 7 cibles périmées par la restructuration
  C2 de la branche Logique (3 modèles → `Raisonnements > contre-exemple` ou `Proposition
mathématique > et, ou, non` ; 4 exercices de 2de, rangement secondaire → `Raisonnements >
contre-exemple`). « debug » reste exclu (aucun nœud). `updated_at` préservé (le rangement
  est une métadonnée, pas une modification du contenu).

- **RANGEMENTS EN PROD (2026-10-09, PR #981).** Migration de données
  `20261011200000_rangements_modeles_exercices` : 1 005 modèles → `classification_node_id`,
  328 exercices → 450 `exercise_classifications` (premier nœud = principal), « debug » exclu,
  types de source « Bac » (7) et « Concours » (1). Résolution stricte des chemins ;
  `updated_at` préservé (triggers de date suspendus le temps du remplissage) ; garde « rien
  déjà rangé » ; vérification « tout ou rien » ; `lock_timeout` 5 s. Preuve : le test fabrique
  des copies des identifiants de la prod puis rejoue le fichier (comparaison intégrale +
  branches d'échec) ; neutralisations rouges ; intégration 186 fichiers verts ; audit sans
  bloquant (374/374 chemins résolus en prod, RLS inchangée). Vérifié prod : 1 005 / 450 / 328
  principaux / 8 types, dates inchangées, triggers réactivés. **Suite : séquence C5** —
  (2) transfert des liens modèles → points (lots à valider par David, contrôle de cohérence
  avec le nœud du modèle), (3) bascule du code, (4) suppression de l'ancien monde (arrêt).
- **2026-10-09 — lien modèles ↔ points : décision d'architecture OUVERTE.** La proposition de
  l'étape 2 de C5 (`c5-transfert-liens.md`) est suspendue par la question de David : « un double
  travail ? ». Analyse dans `c5-architecture-liens.md`.
  - Ma recommandation initiale (option 4 : déduire le lien du nœud) est **retirée**. Ses bornes
    font de chaque point un objet plus fin que son nœud : CE1-021 « de même dénominateur » et
    5-026 « de dénominateurs quelconques » partagent un nœud.
  - Reco révisée : l'ADR 0020 § 7 telle que décidée.
    - Le nœud stocké est le filtre ; les points saisis sont le programme.
    - Chaque point est contraint au nœud de la ressource ou à sa notion.
    - Un modèle a un point par programme.
  - **Attente : Q1 (nœud stocké ou déduit des points), Q2 (un point par programme), Q3 (passe
    « bornes »).** Ne rien écrire en base avant.
- **2026-10-09 — DÉCIDÉ par David : Q1 = B, Q2 = exactement un point par programme.**
  - Q1 = B : le nœud est stocké ; les points sont saisis et contraints au nœud de la ressource
    ou à sa notion (un exercice : l'un de ses nœuds ou leur notion).
  - Les précisions sont inscrites dans l'ADR 0020 § 7.
  - Q3 (la passe « bornes ») est encore ouverte.
  - Suite : le lot de l'étape 2 de C5 sous ces règles, à présenter à David.
- **2026-10-09 — QA = (a), la règle stricte.**
  - David : « la structure la plus propre possible, même s'il y a beaucoup de travail ».
  - Un modèle et son point pointent le même nœud. Seule exception : le point peut être sur la
    notion qui contient ce nœud, quand la puce du BO couvre toute la notion (exemple : CP-014
    « Comprendre le sens de l'addition et de la soustraction ») ; 265 points sont dans ce cas.
  - Ma proposition (b), une contrainte seulement à la notion, est retirée : elle cachait les
    défauts de catégorisation au lieu de les corriger.
  - Les 97 désaccords deviennent un **audit de la catégorisation**, à corriger. Les corrections
    possibles :
    - déplacer le modèle ;
    - fusionner une sous-notion « facette » avec la sous-notion de contenu qui la recouvre ;
    - remonter à la notion un point qui couvre plusieurs sous-notions ;
    - supprimer un doublon de l'arbre ;
    - retirer un tag hors programme.
  - Les mêmes défauts attendent le balisage des cycles 2 à 4 : 33 sous-notions portent
    123 modèles mais aucun point (par exemple « somme » : 30 modèles, alors que les points du
    CP sont sur « calcul astucieux », « tables » et « calcul posé »).
  - Q3 (la passe « bornes ») : mon avis est donné, la décision de David est en attente.
- **2026-10-09 — Lot de l'étape 2 de C5 proposé** : `c5-transfert-liens.md` et le CSV des 495
  couples, à valider par David.
  - 341 couples se règlent automatiquement, 151 demandent une décision : 53 choix,
    47 déplacements de modèle, 10 retags, 15 retraits, 14 remontées de points, 11 fusions,
    1 doublon.
  - 17 cas sont à trancher, regroupés en 14 questions.
  - La simulation, avec toutes les corrections appliquées, ne trouve aucune violation de la
    règle.
  - Effets : 56 modèles et 4 rangements d'exercices changent de nœud ; 13 points sont
    re-rattachés ; 5 sous-notions se vident (à archiver ?).
  - La question d'accès de la future migration est posée à David. Ne rien écrire en base avant
    sa validation.
- **2026-10-09 — Crible des 339 automatiques** (`c5-crible-automatiques.md`), sur le go de David.
  Chaque modèle a été relu sur son contenu en prod.
  - Verdicts : 308 confirmés, 22 changent de point, 9 couples déplacent le modèle (8 modèles),
    aucun tag retiré.
  - 6 modèles sont à scinder ; ils gardent leur point principal en attendant.
  - 3 questions s'ajoutent : A78 suit D16 ; A93-A94 (angles associés pour tout x, alors que le
    BO de 1re spé se borne aux valeurs remarquables) ; A171 suit D36.
  - D36 trouve une place sans contradiction : TSPE-371, sous « Espace : avec coordonnées >
    positions relatives par le calcul » (« étudier une situation d'alignement »).
- **2026-10-09 — QUESTION OUVERTE de David : faut-il deux sortes de sous-notions ?** Il s'agit
  des facettes (découpage par activité, créées pour le filtre pendant les rangements) et des
  sous-notions de contenu.
  - Ma reco : un seul découpage, par contenu mathématique.
  - Cela demande un audit des 39 notions qui montrent le symptôme, puis une réécriture du critère
    de l'ADR 0020 § 3, puis un recalcul du lot.
  - Attente de sa décision. Ne pas reprendre le lot avant.
- **2026-10-09 — DÉCIDÉ par David (« oui ») : un seul découpage par notion, par contenu.**
  - Le critère est précisé dans l'ADR 0020 § 3 : objet, propriété ou technique ; jamais
    activité, registre ou outil.
  - Ordre de la suite :
    1. audit des facettes (`audit-facettes.md`) : les 39 notions qui montrent le symptôme,
       plus les sous-notions-facettes repérées ailleurs ;
    2. validation par David ;
    3. migration de l'arbre, des seeds et des rangements ;
    4. recalcul du lot de l'étape 2 sur l'arbre propre, avec les verdicts du crible.
- **2026-10-09 — Audit des facettes proposé** (`audit-facettes.md`), à valider par David.
  - Les comptes :
    - 55 facettes archivées, dont 42 dans les notions du symptôme et 13 trouvées par le
      balayage ;
    - 2 sous-notions « définition » créées (suites arithmétiques et géométriques) ;
    - tout compris, 192 modèles, 84 points et 35 exercices changent de nœud ;
    - aucun libellé de point ne change.
  - Simulation (arbre → audit → lot → crible) : aucune violation de la règle.
  - Questions à trancher : Q1 à Q7 (optimisation, Décimaux : calculs, doubles et triples,
    « avec / sans coordonnées », notions-activités, proportionnalité, archivages).
  - Renommages facultatifs : section D.
- **2026-10-09 — Sections A et B de l'audit VALIDÉES par David.**
  - Cela couvre les 55 facettes archivées, les 2 « définition » créées, et les modèles, points et
    exercices qui suivent.
  - **Q1 = oui** (David) : « optimisation » se fond dans « variations ».
  - **Q2 = oui** (David) : « Décimaux : calculs » garde les opérations, les techniques y sont versées.
  - **Q3, « double et moitié » = deux nœuds** (David) : on garde ceux de l'addition et de la multiplication.
  - **Q4 = maintenant** (David) : refonte « avec / sans coordonnées » avec le nettoyage ; noms à confirmer.
  - Audit mis à jour avec Q1, Q2 et Q4 : 56 facettes archivées ; 230 modèles, 177 points et
    51 exercices changent de nœud ; simulation sans violation. Q4 change le point de D36
    (→ TSPE-371), D37 (→ TSPE-343) et D38 (→ TSPE-353).
  - Tranché ensuite (David) :
    - **Q3** : « triple et tiers » n'a qu'un nœud, sous la multiplication ;
    - **noms de Q4** gardés : « Vecteurs », « Espace », « Orthogonalité et distances dans l'espace » ;
    - **Q5** : les notions-activités sont gardées, et « Suites et modélisation » devient « Modèles d'évolution » ;
    - **Q7** : on archive les sous-notions que le lot viderait.
  - **Q6 validée** (David) :
    - « reconnaître » devient « caractérisation » ;
    - « appliquer » va sur la notion ;
    - nouvelle sous-notion « coefficient de proportionnalité » (5-088 et 2 modèles).
  - **4-059 (partage proportionnel) va sous « ratio »** (David).
  - **Section D validée** (David, « ok pour le renommage ») : tous les renommages.
  - **AUDIT ENTIÈREMENT TRANCHÉ.** Suite :
    1. les questions restantes du lot ;
    2. la question d'accès ;
    3. la phase 0 TDD ;
    4. la migration de l'arbre (PR 1) ;
    5. le lot recalculé sur l'arbre propre (PR 2).
- **2026-10-09 — Lot : D16 et A78 tranchés** (David). Ils vont sous « Dérivation > variations »
  avec 1SPE-283. Les décisions du lot sont tenues en tête de `c5-transfert-liens.md`.
- **2026-10-09 — Lot : D10 et D24 tranchés** (David), selon ma recommandation : D10 avec 1SPE-274,
  D24 avec 1SPE-280.
- **2026-10-09 — Lot : D69 tranché** (David) : il reste en place, sans point. « suites majorées,
  minorées » ne se vide donc pas (Q7 sans objet pour elle).
- **2026-10-09 — Lot : D81, D88 et D89 tranchés** (David), selon ma recommandation :
  - D81 garde « seuil », avec TSPE-387 ;
  - D88 et D89 restent sous « escalier », sans tag de 1re spé.
- **2026-10-09 — LOT ENTIÈREMENT TRANCHÉ** (David : « je suis tes reco » pour les dernières questions).
  - A93-A94 : tag retiré, à borner. C23 : 1SPE-254. C37 : TEXP-260, à scinder.
  - D33 : sous « chaînes et cycles », avec TEXP-315, à scinder. D51 : fusion dans Dénombrement.
  - D53, D56, D57 : avec 2-400. D54 : sous « probabilités totales », avec 1SPE-340, à scinder.
  - D61 : avec 2-378.
  - Reste avant la migration : la question d'accès, puis la phase 0 TDD (comportements à valider).
- **2026-10-09 — État final consolidé** (arbre → audit → lot → crible, toutes les décisions appliquées en simulation) :
  - nœuds : 3 sous-notions créées, 6 re-parentées, 63 renommées, 74 archivées (dont 3 notions) ;
  - points : 125 re-rattachés ; modèles : 234 déplacés ;
  - rangements d'exercices : 49 déplacés et **4 supprimés (doublons)** ;
  - tags : 473 ; couples sans point : 21.
  - Simulation : 0 violation.
  - Le CSV du lot est mis à jour (494 couples).
  - **Les 4 suppressions sont des DELETE** : arrêt et accord de David requis. Ce sont des exercices rangés à la
    fois sur une facette et sur sa destination ; deux d'entre eux transfèrent leur rangement principal.
- **2026-10-09 — David : « ok » aux quatre points.**
  - Il accepte les 4 suppressions de rangements en doublon.
  - Il valide en bloc le reste du lot et du crible.
  - Question d'accès : personne ne gagne d'accès. Les états des élèves sur les points neufs restent lisibles par l'élève,
    son prof et l'admin.
  - Il valide les 8 comportements à tester de la migration de l'arbre.
  - **Suite : PR 1, migration de nettoyage de l'arbre** (worktree `ubumaths-wt-facettes`, branche
    `feat/arbre-nettoyage-facettes`). Les tests d'abord, puis la migration, puis les fixtures et les docs mises à jour.
    La PR 2 suivra, avec les 473 tags et les deux règles en base.
- **2026-10-10 — PR 1 #1002 FUSIONNÉE** (nettoyage des facettes, arbre .16).
  - Migration `20261012080000_nettoyage_facettes_arbre.sql` : 41 tests, intégration complète verte (2 641),
    code-reviewer et security-auditor sans point bloquant, durcissements intégrés.
  - L'audit a vérifié en lecture seule que la prod est exactement dans l'état de départ attendu.
  - **`db:migrate` EN ATTENTE** : refusé par le filtre de sécurité automatique de Claude Code, pas par David. À lancer
    par David (`! pnpm db:migrate`), puis vérification en prod.
  - Le worktree `ubumaths-wt-facettes` est gardé jusqu'à la migration appliquée.
  - David a validé l'ordre suivant :
    1. l'audit ;
    2. les questions restantes du lot ;
    3. la question d'accès ;
    4. la migration.
- **2026-10-10 — Migration appliquée en prod, doc de l'arbre passée en .16.**
  - `db:migrate` a été lancé par David (20261012080000). Les empreintes de prod sont identiques à l'état attendu :
    1 005 modèles, 446 rangements d'exercices, 1 951 points ; 625 nœuds actifs et 74 archivés ; triggers de date
    rétablis, dates inchangées.
  - `arbre-notions.json` est réécrit en .16 depuis la fixture, avec la liste `archives` et un statut à jour. La note
    de Dérivation (optimisation) est corrigée.
  - `dessin_branches.py` et `page.py` LISENT le JSON : plus d'arbre ni de comptes en dur. La page est régénérée :
    19 branches, 134 notions, 472 sous-notions, 74 archivés.
  - Docs `seed-*.md` : 491 colonnes de nœud mises à jour. Les 1 951 lignes de point ont été vérifiées par script
    contre leur fixture .16, sans aucun écart.
  - LISEZMOI à jour : la base fait foi, le JSON en est la copie de doc.
- **2026-10-10 — PR 2 (les tags), phase 0 VALIDÉE par David** (« comportements validés ; a) »).
  - Elle écrit les 473 tags neufs du lot ; les 1 026 anciens restent jusqu'à l'étape 4.
  - Elle pose deux règles en base :
    - **règle 1** : un point neuf est sur le nœud du modèle ou sur la notion de ce nœud ; pour un exercice, sur l'un de ses
      nœuds ou leur notion ;
    - **règle 2** : au plus un point neuf par programme sur un modèle, même en écritures simultanées.
  - Toute écriture qui casserait un tag est refusée : déplacer un modèle, re-rattacher un point, déplacer une
    sous-notion, retirer le rangement d'un exercice.
  - **Décision (a)** : un tag de point neuf sur un modèle sans nœud, ou sur un exercice sans rangement, est REFUSÉ. On
    range d'abord ; le formulaire pré-remplira le nœud avec celui du point.
  - Filtres provisoires « ancienne génération » (objective_id non nul) jusqu'à la bascule du code :
    - la couverture du cahier de texte (`templatePointIds`) ;
    - le compteur « N tagués » du formulaire d'admin ;
    - le script `readLinks`, pour que `--remplacer-points` n'efface pas les tags neufs.
  - Effets acceptés :
    - les états d'acquisition des élèves sur les points neufs se calculent à chaque nouvelle tentative (visibles
      seulement dans l'export RGPD) ;
    - un point neuf tagué ne se supprime plus.
  - Ordre : fusion, puis déploiement Vercel des filtres, PUIS `db:migrate` (lancé par David).
- **2026-10-10 — À revoir PLUS TARD (David)** : les 21 couples (modèle, programme) sans point du lot (liste dans
  `c5-transfert-liens.csv`, colonne point vide). Ce sont :
  - 8 contenus de Tle tagués en 1re spé (trigonométrie, escalier) ;
  - 4 tags de 1re spé remplacés par un point de 2de ;
  - 4 sans point du BO (reconnaître un raisonnement, contre-exemple en 1re spé, suite majorée) ;
  - 3 contenus de Tle comp. tagués en Tle spé ;
  - 2 hors bornes (angles associés pour tout x).
  - 12 modèles n'ont plus aucun point ; 420 en gardent.
- **2026-10-10 — PR 2 : décision (A) de David (« oui »).** Les fonctions de trigger des règles de tag passent en
  SECURITY DEFINER, pour lire avec une vue complète.
  - Raison : en lecture INVOKER, l'admin ne voit pas les exercices privés du prof. La règle laissait donc casser un tag
    d'exercice privé sans erreur (re-parentage), ou refusait à tort (tag, re-rattachement).
  - Garde-fous :
    - un utilisateur connecté qui n'est ni prof ni admin n'est pas évalué ; la RLS refuse son écriture comme avant ;
    - les migrations et le service évaluent les règles ;
    - aucun message ne nomme un contenu invisible de l'auteur ;
    - EXECUTE révoqué, `search_path` fixé ;
    - déclaration dans le garde-fou CI des fonctions SECURITY DEFINER.
  - Les tests tournent avec les vrais rôles (prof, admin, élève). Le re-parentage concurrent est fermé par un verrou sur
    les nœuds.
- **2026-10-10 — PR 2 (#1037) en prod.** Code livré par `deploy:prod` (v0.18.0), puis migration `20261013120000`
  appliquée par David.
  - Poussée depuis le worktree de la PR, avec `--project-ref` et `--include-all` : la prod avait déjà
    `20261014100000_suppression_compte_art17`, et un `db:migrate` depuis `main` aurait aussi emporté quatre migrations
    d'autres sessions (passées depuis).
  - Vérifié en prod, en lecture seule :
    - 473 tags neufs sur 420 modèles et 1 026 anciens ;
    - 0 violation des règles 1, 2 et (a) ;
    - contrainte `curriculum_points_one_generation` présente ;
    - les 6 fonctions en DEFINER, propriétaire postgres, `search_path` fixé, garde présente, aucun EXECUTE pour public,
      anon ou authenticated ;
    - les 6 triggers activés.
  - Reste : les 21 couples sans point (plus tard), étape 3 (bascule du code), étape 4 (nettoyage destructif), passe des
    bornes.
- **2026-10-10 — Étape 3 (bascule du code) : recos validées par David (« je valide tes recos »).**
  - Mesuré en prod avant : 0 état d'acquisition (anciens ou neufs), 0 point coché en séance, 814 automatismes déjà
    sur des points neufs, 22 tentatives → rien à transférer, la bascule ne touche que du code.
  - Q1 : la page Programme devient une **consultation** branche > notion > points du niveau, plus **renommer** et
    **archiver** un point. Création de point = migration (le BO fait foi) ; plus de réordonnancement (ordre du BO).
  - Q2 : les 7 routes d'API thèmes/objectifs sont **supprimées à l'étape 3** ; les tables à l'étape 4.
  - Q3 : côté élève, la **notion remplace l'objectif** (tableau de bord, « Ma progression », page de détail = page
    notion avec ses points et automatismes) ; l'échelle 1-4 par rang disparaît (état par point) ;
    `/student/objectifs/…` redirige vers « Ma progression ».
  - Q4 : paquet Programme : libellé = notion du point, lien vers la page notion.
  - Q5 : la liste figée `COVERED_GRADES` disparaît : **un programme apparaît dans la progression de l'élève dès qu'un
    modèle y est tagué**. Nouvelle **étape 2 bis, en parallèle** : taguer primaire et collège (573 couples : 138 à un
    seul point possible, 362 à choisir, 73 sans point) — lot proposé, page à cocher, migration.
  - Q6 : analytique : la **branche remplace le thème** ; le sélecteur ne montre que les branches du niveau de la classe.
  - Q7 : tags admin : un choix unique par programme, parmi les points du nœud du modèle ou de sa notion ; modèle sans
    nœud → « rangez d'abord ce modèle ».
  - Q8 : les codes de points des 397 JSON de `scripts/questions` sont abandonnés (les tags vivent en base).
  - Découpage : PR A migration SQL (4 fonctions lisent encore l'objectif) · B lectures mécaniques · C nouvel arbre du
    programme (prof, admin) · D élève · E suppression éditeur et API · F analytique.
- **2026-10-11 — Étape 2 bis (tags primaire et collège) : règles validées par David (« je valide tout sauf R4 »).**
  - Lot préparé : 573 couples (modèle, niveau) de CP à 3e ; 138 à un seul point possible, 362 à choisir, 73 sans point.
  - R1 : un tag seulement si le point décrit ce que le modèle fait faire ; point de vocabulaire ou de technique voisine
    = pas de tag (calcul mental cycle 2, triple/tiers, complément, conventions d'écriture 5e, décimaux avec retenue au
    CM1…). Un point général mais juste se garde (3-044). Aucun point ajouté au BO.
  - R2 : modèle mal rangé (bon point sur un nœud voisin) → déplacé sur la bonne sous-notion, puis tagué (équations 4e
    sur la notion, sommes algébriques 5e à une seule opération, 11 cas C).
  - R3 : niveau déclaré douteux → pas de tag pour ce niveau, niveaux non modifiés (décision « niveaux » à part) ; liste
    à part sur la page.
  - R4 (refusée, recadrée par David) : les deux sous-notions « double et moitié » (sous Addition et sous Multiplication)
    restent. Elles distinguent un modèle dont l'énoncé ou la correction passe par une **somme** de celui qui passe par
    un **produit** : chaque modèle se range en lisant son contenu en détail, puis se tague selon la règle (a).
- **2026-10-11 — Étape 2 bis : scission des points « dans les deux sens » validée par David.**
  - CP-018, CE1-026, CE2-020 (tables d'addition) et CE1-027, CE2-021 (tables de multiplication) deviennent le sens
    direct (« donner la somme / le produit ») ; nouveaux CP-073, CE1-090, CE2-084, CE1-091, CE2-085 = l'autre sens,
    **uniquement l'opération à trou** (3 + ? = 7 ; 3 × ? = 12). Même nœud « tables », juste après dans l'ordre du BO.
  - Règle de David : une soustraction ou une division est explicite, elle n'est PAS le sens inverse des tables → point
    de calcul astucieux qui la décrit (après déplacement, R2), sinon pas de tag (R1). Les deux soustractions du CP
    (73550ee8, fa57c725) passent en R1.
  - Les 13 modèles dont les variations relèvent de plusieurs points sont sortis des parties 1 à 3 de la page à cocher :
    choix « Scinder » / « Un seul tag » en partie 4.
- **2026-10-17 — Principes validés par David, consignés dans l'ADR 0020 (§7, précisions du 2026-10-17).**
  - Le BO est immuable : pas de point « entraînement » ou « approfondissement ». Un modèle qu'aucun point ne décrit
    reste sur son nœud, jouable, hors progression du programme (progression par nœud possible plus tard).
  - Un savoir-faire répété d'une année à l'autre garde un point par année ; un modèle porte un tag par programme
    (déjà la règle en base : « au plus un point par programme »).
  - Une scission vaut pour toute la famille de points répétés (ex. tables CP → CE2 et répertoires CM1, CM2).
- **2026-10-17 — Scissions : réponses de David sur la page à cocher.**
  - Les 20 familles de la page sont à scinder (101 points). Q1 : opérations à trou hors tables → pas de tag (R1).
    Q2 : répertoires du CM scindés comme les tables. Q3 : garder « connaître les moitiés » et « déterminer la moitié ».
    Q4 : **trois** points comparer / encadrer / intercaler. Q6 : « lire et interpréter » à revoir → familles M19
    (18 points lire / interpréter) et M20 (moyenne, médiane, étendue : calculer / interpréter) ajoutées à la page.
  - Q5 : 3-001 et 3-002 sont un doublon du BO lui-même (cycle 4, 3e, Nombres rationnels, lignes consécutives).
    David : « je ne veux pas de deux points qui disent la même chose » → 3-002 archivé dans la migration des
    scissions ; exception consignée dans l'ADR 0020 (§7).
  - Programmes du BO des cycles 2, 3 et 4 (PDF) commités sous `docs/ref/programmes/`.
- **2026-10-17 — Critère de scission de David, consigné dans l'ADR 0020 (§7).** On scinde quand la scission donne au
  moins un point évaluable par un modèle de question, avec nos outils actuels ou à venir ; l'autre partie peut relever
  du cours (démonstration, oral, collecte). 5-058 se scinde (connaître / démontrer). Pas de retour sur les familles
  déjà tranchées. Recos de la partie 3 de la page mises à jour en conséquence : suite écrite / orale, 5-058,
  représentations des solides (5-048, 4-028), recueillir / présenter des données → scinder.
- **2026-10-17 — Vérifications avant migration (page « Vérifications des scissions »).** David : CM1-019 et CM2-018
  scindés comme leurs jumeaux ; 3-038 archivé (quasi-doublon du BO avec 3-041) ; les 25 corrections de libellés prises ;
  automatismes revus ligne par ligne (52 lignes). Principe nouveau, consigné dans l'ADR 0020 §7 : une partie de ligne
  d'automatisme sans référence → d'abord scinder un point antérieur (avec sa famille), sinon point ⚙ dans le programme
  de la ligne. 11 mots à reprendre ainsi (quadruple, quart, tiers en 6e ; perspective cavalière en 5e ; somme des
  opposés, triple / prédécesseur / successeur en 4e ; pourcentage sans coefficient en 3e ; périmètre d'un polygone,
  interpréter les quartiles au lycée).
- **2026-10-17 — Scissions en prod (#1463, migration `20261017090000_scission_points_programme`, appliquée par David).**
  149 points scindés en 168 moitiés neuves (tables comprises), 7 points ⚙ (6-211, 5-144, 4-082, 3-068, 3-069, 2-401,
  2-402), 3-002 et 3-038 archivés, références d'automatismes 814 → 969. Vérifié en prod : comptes par niveau (CP 84,
  CE1 107, CE2 97, CM1 171, CM2 158, 6e 111, 5e 143, 4e 82, 3e 68, 2de 201), ordre 1..N sans trou, archivages.
  Suite : refaire le lot de tags du primaire et du collège (étape 2 bis) sur les points scindés, puis la page à cocher.
- **2026-10-18 — Relecture du lot 2 bis : analyse jugée insuffisante par David, méthode revue.** Exemples : 9710ae96 /
  bcd7e907 (« Trouver le double », sous-titres « dizaines jusqu'à 50 » / « nombre inférieur à 10 », bornes du CP non
  vérifiées) ; 943151d0 (QCM « le plus petit » proposé sur « comparer avec les symboles », sans symbole) ; 73258d60
  (+ 9 et + 19 seulement, proposé sur CE2-024 « 8, 9, 18, 19, 28, 29, 38 ou 39 »). Décisions de David (« je suis tes
  recos ») :
  - **Inclusion stricte** : un tag n'est accepté que si TOUTES les questions générées (toutes variations, plages
    réelles) restent dans le point (forme, notations, bornes). Sinon : pas de tag, modification du modèle proposée, ou
    modèle hors programme.
  - **Couverture partielle acceptée** : un modèle peut ne couvrir qu'une partie du point ; la couverture de chaque point
    par l'ensemble de ses modèles est suivie à part (liste de modèles à créer ou à élargir).
  - **Document de référence des bornes, par point** (bornes générales par programme, héritées), sourcé BO et documents
    d'accompagnement — la « passe des bornes » du chantier. Validé par David avant l'analyse des modèles.
  - Lecture des documents d'accompagnement autorisée ; un index de référence de ces documents est produit
    (le dossier, 332 Mo, reste hors git).
  - Page à cocher : afficher titre, sous-titre (`description`), consigne, exemples générés, plages réelles, verdict.
- **2026-10-18 — Bornes validées, modèles relevés et jugés.**
  - Page « Bornes des programmes » (https://claude.ai/artifact/6H9uF1gjrdg7cr7eo5Mf1w) : 36 incertitudes tranchées
    (6 écarts à la reco : c2-5, c2-6, c2-7, c2-8, c2-12, c3-5, toutes vers l'option stricte), 9 niveaux validés sans
    commentaire. Appliqué dans `arbre-notions/bornes/` (58 bornes de force « décision »), commit a7ba5b118. Reste :
    exemple faux de c4-3 (médiane de 3, 7, 8, 12 : 7 et 8 acceptés ?) et contrôle visuel de c4-8.
  - Relevé : `arbre-notions/releves/releve.ts` (`pnpm exec tsx … --rafraichir`), 573 modèles × 300 tirages par
    variation, 0 échec. Les 573 JSON (12 Mo) restent non suivis, régénérables ; `index.csv` et `templates.json` suivis.
  - Verdicts (consigne `analyse/CONSIGNE.md`, CSV par lot) : 282 TAG, 48 MODIFIER, 7 TAG_PAR_VARIATION, 20 A_TRANCHER,
    216 HORS_PROGRAMME. 16 questions dans `analyse/questions-modeles.json` (dont Q1 opérations à trou face à CM1-061
    « 748 + … = 1 200 », QCM « le plus petit » incohérent entre lots, trou vs équation au cycle 4).
  - Page « Verdicts des modèles » (https://claude.ai/artifact/F9FLrWzCSE72E7zeEyCyH5, générateur
    `analyse/page/gen.mjs`, collections `questions`, `niveaux`, `modeles`). **Reprendre ici** : lire les réponses de
    David (ArtifactData list des 3 collections), appliquer aux CSV, puis lister les modifications de modèles et préparer
    la migration des tags (lot 2 bis).
- **2026-10-20 — Réponses de David aux 14 questions des modèles** (page raccourcie : exemple, question, choix courts,
  dossier replié ; champ `court` de `questions-modeles.json`). 12 suivent la reco : m-cycle2-1 tag CE1-024 ;
  m-cm-2 modifier (un seul rang, puis CM1-039 / CM1-133) ; m-sixieme-1 refuser 1/n (2 réécrits, 2 sans tag) ;
  m-sixieme-2 hors (3-068) ; m-cycle4-2 reclasser en 4e, 4-073 ; m-cycle4-3 entiers ; m-cycle4-4 tag 3-012 ;
  m-cycle4-5 stricte (6 MODIFIER) ; m-transversal-1 point-trou (CM1-061 / CM2-065 au CM) ; m-transversal-2
  comme-equations ; m-transversal-3 symboles (5 MODIFIER) ; m-transversal-4 règle (retirer si le point a d'autres
  modèles, scinder sinon). **Écarts** : m-cm-1 → **hors** (pas de tag au CM2 pour les critères par 3 et 9, pas de
  modification) ; m-cycle4-1 → **avis** : « il faut trouver dans quels programmes on a ce genre d'équation ».
  - Recherche m-cycle4-1 (textes) : **a/x = b** est nommé en 2de, automatismes (« Résoudre une équation du type x² = a,
    ax + b = cx + d ou a/x = b », programme 2de p.5) ; équation quotient A(x)/B(x) = k en 2de. **a − x = b** : c'est
    ax + b = c avec a = −1, donc 4-024 en 4e (entiers relatifs) ; rien en 5e (« x + b = c », exemples x/3 = 1, x/2 = 0).
    En trou, au CM : « 178 – … = 6 × 8 » (BO c3), « 5 760 − … = 5 360 » (CM1-061), « 20 ÷ … = 4 » (livret CM2 2026).
    Niveaux des 4 modèles (5e) non modifiés (R3) : question reposée à David.
  - m-cycle4-1 tranché par David (après explication) : **18 − x = 9** → modèles reclassés en 4e, tag 4-024
    (6bc8108f, d80e2e02 ; a73f55ba, fractions, sans tag) ; **a/x = b** → aucun tag au collège (c0c8920a ; et
    b0ef6947, 419887ff en 4e). Effets : trous « a − ? = b » de 5e (24331791, 84755a7b, b1550840) → MODIFIER 5-045 en
    retirant v2-v3 ; trou au diviseur 0b6d749f → MODIFIER 4-024 en retirant v1-v3.
  - Égalités à trous au CM, vérifiées modèle par modèle sur les relevés : 19 TAG (12 CM1-061, 7 CM2-065), 4 refusés
    sur leurs nombres (aa788ca7, ac2dae38, a5d5a7a0, et 45e06ece : 0,000 1 et 9,954 5 tirés, quatre décimales ; le
    relevé annonce `decimales_max` 3 à tort — à vérifier dans `releve.ts`).
  - **Appliqué aux CSV** (60 lignes, justification « Décision de David (2026-10-20, …) », `variations_hors` remis à
    jour) : 306 TAG, 65 MODIFIER, 202 HORS_PROGRAMME, plus aucun A_TRANCHER ni TAG_PAR_VARIATION. 3 modèles changent
    de niveau (78feafed, 6bc8108f, d80e2e02 : 5e → 4e ; colonne `grade`). Page régénérée (version 3).
  - **Division à trou du CM2 (45e06ece) vérifiée** : le modèle tire b (au plus trois décimales) et affiche b : 10^a,
    soit jusqu'à **quatre décimales** (q ≤ 4 − a) : « ? : 100 = 9,954 5 », « ? : 1 000 = 0,000 1 », environ un tirage
    sur trois (4 des 12 exemples relevés). Verdict → **MODIFIER CM2-065** (condition q ≤ 3 − a), au lieu de
    HORS_PROGRAMME. Cause du faux `decimales_max` 3 : `extractNumbers` de `releve.ts` coupait la partie décimale à
    l'espace fine (`9{,}954\,5` lu 9,954 et 5) ; corrigé, relevé relancé (50 s) : seuls 8 modèles changent
    (45e06ece, 819df2a9, 953574d4, 99c4ab73, 9f380957, def797c6, e1b540fa, f9a3333d), aucun autre verdict touché
    (6e sans borne générale de décimales, c3-11 ; 4e déjà hors programme pour d'autres raisons).
  - Médiane (c4-3), relu dans les textes : définition « toute valeur qui partage la série ordonnée en deux sous-séries
    de même effectif » (Exemples c4 2026 p.36) ; reste à trancher : bornes 7 et 8 acceptées pour 3, 7, 8, 12 ?
  - **c4-3 tranché** : médiane d'effectif pair, bornes comprises (3, 7, 8, 12 : toute valeur de 7 à 8). Écrit dans
    `bornes/cycle4.{md,json}` (4-040) et `bornes/questions.json` (champ `precision`). Aucun modèle de médiane dans
    le lot : aucun verdict touché.
- **2026-10-20 — Niveaux validés, liste des modifications du lot 2 bis.** Partie 2 de la page : les 9 niveaux « ok »,
  sans note ; collection `modeles` vide (aucun verdict contesté). `analyse/lot-2bis-liste.py` croise les CSV avec la
  prod (points et nœuds par l'API REST anonyme) → `analyse/lot-2bis-modifications.md`. 92 des 372 tags (TAG +
  MODIFIER) ont leur point hors du nœud du modèle et de sa notion : le trigger les refuserait. Plusieurs justifications
  disaient « déplacement inutile pour le tag » : c'est faux sous la règle (a) du 2026-10-09. 84 vont sans choix sur la
  sous-notion du point (R2) ; 8 ont un point sur une notion à sous-notions (6-106 ×2, 6-149, 5-045 ×4, 4-073) → choix
  à faire. 3 changements de niveau (5e → 4e). Les 66 MODIFIER : 39 nombres resserrés, 7 retraits de variations, 17
  consignes ou affichages, 3 scissions (5-026 / 5-123). Aucun tag en prod sur les 573 modèles (vérifié par MCP).
- **2026-10-20 — Réponses de David (« oui » aux trois propositions) et migration du lot 2 bis.** Sous-notions :
  6-106 → Décimaux : numération > forme fractionnaire ; 5-045 → Équations : premier degré > ax + b = c ; 6-149 →
  Longueurs > comparaison et mesure ; 4-073 rattaché à Entiers : priorités opératoires > écriture d'une expression,
  **avec 4-004** dont il est la moitié (question posée, reco suivie). Ordre : cette migration (déplacements, niveaux,
  tags des TAG), puis les 66 MODIFIER par lots. Accès : aucune règle ne change (tags lisibles par tout connecté) ;
  l'élève voit son programme dans « Ma progression » dès qu'un modèle de son niveau est tagué. Migration générée
  (`analyse/lot-2bis-migration.py`, fixture `tests/integration/fixtures/tags-lot-2bis.json`) : gardes tout ou rien
  (321 modèles), nœud et niveaux relevés, aucun tag déjà posé ; rollback exécutable, éprouvé par le test ; fixture du
  seed cycle 4 mise à jour (4-004, 4-073).
- **2026-10-21 — #1563 mergée, migration `20261020233600` appliquée (db:migrate, 4 conditions réunies).** Revues :
  code-reviewer (lot recalculé depuis les CSV, 0 écart) et security-auditor sans bloquant ; rollback rendu strict
  (chemin d'origine introuvable → échec). Vérifié en prod : 306 tags aux comptes attendus par niveau, 4-004 / 4-073
  rattachés, 3 modèles en 4e, trigger de date actif, aucun `updated_at` modifié.
- **2026-10-21 — Lot B « retirer des variations » (7 modèles).** Relu en prod (anon) :
  `etat-prod-2026-10-21/modeles-variations.json`. 716d5c68 garde V1-4 (sous-titre : « deux nombres à 2 chiffres ») ;
  24331791, 84755a7b, b1550840 gardent V1 (b1550840 perd la variable commune c, qui ne servait qu'à V3) ; b2af6f39
  garde V1-2 ; 0b6d749f garde V4-6 ; 6a60ed10 garde V5-6. Specs réindexées : 32/32 vertes (`question:specs`),
  2 800 tirages sans étape vide (`audit-question-draws`). Données d'élèves : 0 tentative d'évaluation, 0 carte SRS,
  aucune fiche ni exercice ni deck ; 2 tentatives de compétence (sans indice de variation) et 2 réponses de test sur
  716d5c68 (instance figée, indice affiché seulement). Migration `20261021100000` ; preuve rouge (migration
  neutralisée : 5 échecs + suite nominale en échec), puis 22/22 verts avec le lot A refactorisé.
- **2026-10-21 — #1566 mergée, migration `20261021100000` appliquée (db:migrate, 4 conditions réunies).** David :
  « oui » à la question d'accès, garde le sous-titre de 716d5c68. Revues : code-reviewer et security-auditor sans
  bloquant. Vérifié en prod : variations 3/1/2/4/1/1/2, specs et tags attendus (CP-026, 5-045 ×3, 4-007, 4-024 ×2),
  variable `c` retirée de b1550840, `updated_at` avancé.
- **2026-10-21 — Lot D en prod (#1570 puis #1572).** Premier `db:migrate` en échec SANS effet (transaction annulée) :
  les neufs copiaient la catégorie de leur origine, interdit entre modèles publiés ; le test posait les origines en
  brouillon, catégorie bidon, d'où le trou. Correctif : niveaux 8, 9, 10 (tranché par David), garde « catégories des
  modèles neufs déjà prises », décor de test aligné sur la prod (rouge sur l'ancienne migration avec l'erreur de la
  prod, 18/18 sur la nouvelle). security-auditor sans bloquant (0 série, session de test ni tentative ne vise ces
  niveaux). Vérifié en prod : 3 origines (titres, sous-titres, 2/1/1 variations, `off` pour f92d63a6), 3 neufs
  publiés aux niveaux 8-10, 6 tags (3 × 5-026, 3 × 5-123).
- **2026-10-21 — État de l'étape 3 relevé (absent du journal).** #1060 (2026-10-10) : page Programme en consultation
  (branche > notion > points), PATCH réduit à `{ name?, archived? }`, routes thèmes / objectifs et réordonnancement
  supprimés. Prod : 1 007 anciens points, 2 126 neufs. Les 8 fonctions SQL qui lisent l'objectif sont sans appelant
  (`reorder_*`, `curriculum_referenced_points`) ou des triggers inertes pour les points neufs (code et ordre posés par
  migration) : la PR A tombe, tout part à l'étape 4. Lisent encore l'ancien monde : `getCurriculumTree` (cahier de
  texte, avancement, exercices, édition admin), `curriculum-coverage`, `buddy-themes`, decks programme,
  `student-progression` + `/student/objectifs/[id]`, analytique (`class-knowledge`, page analytics), `skills.objective_id`.
- **2026-10-21 — Étape 3, PR B1 (worktree `ubumaths-wt-arbre-bascule-b`).** David : « je suis tes recos » (découpage
  B1 / B2, clé du Palotin = branche). B1 bascule sur les points neufs : couverture auto du cahier de texte (niveau lu
  sur le point), deck « Programme » (notion sous chaque carte, sans lien jusqu'à la PR D), bonus « nouveau thème »
  du Palotin (branche, `placeOfNode`), édition admin des tags d'un modèle (un MySelect par programme, Q7 ;
  `programme-tags.ts`), DELETE de `template-tags` qui relit ses lignes (404 sinon). `isLegacyPoint` →
  `isProgrammePoint` ; code mort de `skills.ts` retiré (la table `skills` n'existe plus) ; les scripts de
  rattachement par code gardent leur propre filtre (Q8, retirés en PR E). Prod mesurée : 0 tag d'exercice, 0 point
  coché au cahier de texte, 0 Palotin avec thème exploré, 325 libellés de points neufs en LaTeX (le menu les montre
  en texte brut, le point choisi est rendu dessous). Correction de la phase 0 : le deck n'excluait aucune carte, seul
  le libellé dépendait de l'objectif.
- **2026-10-21 — Étape 3, PR B2, phase 0 validée par David** (worktree `ubumaths-wt-arbre-notions`). Cahier de
  texte (« Programme travaillé »), Avancement et tags d'un exercice passent sur branche > notion > points (sous-notion
  nommée à côté du point, compteurs par branche et par notion) ; `getCurriculumTree` disparaît ; DELETE couverture et
  tag d'exercice relisent leurs lignes (404 sinon). **Q1** : un point archivé déjà coché / tagué reste affiché, marqué
  « archivé », pour pouvoir le décocher ; non coché, il reste masqué. **Q2** : POST couverture / tag d'exercice
  refuse un ancien point (400 « Point hors programme », `isProgrammePoint`). Accès : rien ne change.
- **2026-10-21 — B2 : tags d'un exercice, point 3 révisé avec David** (« je suis tes recos »). Découvert aux tests
  d'intégration : la règle 1 de `20261013120000` vaut aussi pour les exercices (point sur un nœud de rangement de
  l'exercice ou sur sa notion ; exercice non rangé → aucun point neuf). Aucun écran ne range un exercice (rangements
  posés par migration). Prod : 328 / 379 exercices rangés, 446 rangements, 0 tag. Décidé : l'écran ne propose que
  les points compatibles, des **niveaux de l'exercice** (298 exercices ont des points, 5 en moyenne ; tous
  programmes : 326, 10) ; non rangé (51) → « Cet exercice n'est rangé dans aucune notion : aucun point du programme
  ne peut lui être associé. » ; rangé sans point compatible → « Aucun point du programme de ses niveaux sur les
  notions où il est rangé. » ; Q1 tient. 📌 Futur chantier, non décidé : un écran de rangement des exercices.
- **2026-10-21 — #1581 mergée (B2).** Revues : code-reviewer (0 bloquant ; corrigés : panne de lecture journalisée,
  test du chemin d'erreur de la création, tags d'un niveau retiré visibles) et security-auditor (0 bloquant ni
  important ; corrigés : lecture par lots de 100, message générique au DELETE). Intégration : 5 cas nouveaux rouges
  sur `origin/main`, 67/67 sur la branche. 3 points laissés à David (cf. « Reprendre ici »).
