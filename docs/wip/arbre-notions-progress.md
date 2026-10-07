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
