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
