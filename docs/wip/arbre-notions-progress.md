# Arbre des notions — progression

Décisions : [ADR 0019](../adr/0019-classement-branche-notion-sous-notion.md). Page de travail (privée) :
https://claude.ai/artifact/6g66KoBWfZdQ91tNn66Hg5 (générée depuis le scratchpad de la session du 2026-10-06).

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
  seule une ligne introduisant du neuf devient un point (régime automatisme). JAMAIS de
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
