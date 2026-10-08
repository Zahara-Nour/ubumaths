# Seed 1re technologique — points du programme ET références (architecture points → nœuds)

> **Statut : VALIDÉ INTÉGRALEMENT par David le 2026-10-08 (« je valide tout » : scissions,
> entretien, « modéliser » retirés, références, discutables, T1, T2). Livraison en cours.** ⚠️ Soin maximal.
> Source : « Programme de mathématiques de la classe de première de la voie
> technologique » (10 p., `progs-lycee/premiere-techno.pdf`, fourni par David le
> 2026-10-07), relu **puce par puce** — enseignement commun à toutes les séries
> (STMG, STI2D, STL, ST2S, STD2A, STHR, S2TMD). **Pas d'ancien seed** : construit
> directement depuis le BO (ni liens à préserver, ni colonne « ex- »). Mapping :
> [programmes-ecarts-1re-techno.md](programmes-ecarts-1re-techno.md) (X1-X4 tranchées le
> 2026-10-07 : STD2A couverte, Sélection de données sous Tableaux croisés). Arbre
> `2026-10-07.15`, **aucun changement d'arbre**. Parcours : `1_TECHNO` → `2` — voie
> parallèle à la 1re spé, dont elle ne peut pas référencer les points (C14).
> Règles déjà tranchées, appliquées sans être redemandées : une puce = un point, scission
> si notions différentes ; entretien des contenus repris mot pour mot de la 2de
> (U5/V1) ; « modéliser » = compétence ; bloc Algorithmique en `algorithme` (L1) ;
> automatismes = références (dont reprise de la liste de 2de, C16) ; auto-référence
> permise (C13).

## Attributs communs

| Attribut               | Valeur                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `grade`                | `1_TECHNO`                                                                                                    |
| `code`                 | **`1TECHNO-001` à `1TECHNO-105`** (préfixe fabriqué par la base : `1_TECHNO` → `1TECHNO` ; aucun ancien seed) |
| `objective_id`, `rang` | `NULL`                                                                                                        |
| `rubrique`             | « partie > section » du BO, **série comprise** pour les deux parties qui en dépendent (question T1)           |
| `kind`                 | conn. (Contenus) / s-f (Capacités attendues) / algo. (Algorithmique + Situations algorithmiques)              |
| `exigence`             | `attendu` partout — y compris les **Situations algorithmiques** (question T2)                                 |
| `regime_acquisition`   | `diversite` partout                                                                                           |

**105 points**. Les **Commentaires** du BO sont du cadrage : pas de point (sauf la
dernière ligne de la section Variables aléatoires, « Compter le nombre de valeurs situées
dans un intervalle [p − ks ; p + ks] », qui prolonge les Situations algorithmiques).

---

## ⚠️ Puces multi-parties : scindées (9 puces → +9 points)

| Puce du BO                                                                                                                                                     | Décision                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Générer une liste (en extension, par ajouts successifs, en compréhension) »                                                                                  | **×2**, comme en 1re spé : `créer une liste` / `liste en compréhension`.                                                                                                    |
| « Suites arithmétiques … et suites géométriques … : relation de récurrence ; explicitation du terme de rang n ; sens de variation ; représentation graphique » | **×2 pour les trois premières** (deux notions, comme en 1re spé) ; la représentation graphique reste UN point (`Généralités > représentation graphique`, commune aux deux). |
| « Démontrer qu'une suite est arithmétique ou géométrique »                                                                                                     | **×2** (deux notions).                                                                                                                                                      |
| « Déterminer le sens de variation d'une suite arithmétique ou géométrique à l'aide de la raison »                                                              | **×2** (deux notions).                                                                                                                                                      |
| « Utiliser la forme factorisée … pour trouver ses racines **et** étudier son signe »                                                                           | **×2** : `racines` / `signe` (deux sous-notions, deux gestes).                                                                                                              |
| « **Ajustement affine, point moyen** »                                                                                                                         | **×2** (deux sous-notions, comme en Tle comp.).                                                                                                                             |
| « Variable aléatoire discrète : **loi de probabilité, espérance** »                                                                                            | **×2** (deux sous-notions).                                                                                                                                                 |

**Gardées en un point** : « Reconnaitre si une situation relève d'un modèle discret de
variation linéaire ou exponentielle » (le geste est le choix du modèle) ; « Calculer un
terme de rang donné d'une suite, une somme finie de termes » (une situation
algorithmique, comme en 1re spé) ; « Racines et signe d'un polynôme de degré 2 sous
forme factorisée » (contenu, sur la notion) ; « Utiliser à bon escient condition
nécessaire, condition suffisante, équivalence logique » (sur la notion).

## Entretien : contenus repris mot pour mot de la 2de (U5/V1) — 10 références

| Puce du BO de 1re techno                                                                                              | Entretien → référence                                 |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Notions d'ensembles, symboles, ensembles de nombres et intervalles, couple et produit cartésien, complémentaire, Card | 2-201 · 2-202 · 2-203 · 2-204 · 2-205 · 2-206 · 2-207 |
| Utiliser correctement les connecteurs « et », « ou »                                                                  | 2-210                                                 |
| Utiliser un contre-exemple pour infirmer une proposition universelle                                                  | 2-212                                                 |
| Distinguer une proposition de sa réciproque, de sa contraposée                                                        | 2-214                                                 |

**Dépassent la 2de → points** : le statut des égalités et des lettres, et condition
nécessaire / suffisante / équivalence logique.

## ⚠️ « Modéliser » = compétence → non retenues

- « Modéliser une situation à l'aide d'une suite » — jumelle des puces retirées en 1re spé
  et en Tle comp. ; sa part questionnable est portée par « Reconnaitre si une situation
  relève d'un modèle discret de variation linéaire ou exponentielle ».
- « Modéliser la dépendance entre deux grandeurs à l'aide d'une fonction » — même règle.

## Les références (`curriculum_point_automatismes`, grade `1_TECHNO`)

### A. Lignes propres de la 1re techno (partie « Automatismes » du BO)

Les mêmes lignes que la 1re spé (cinq rubriques, mêmes puces) → **mêmes cibles** de 2de et
du cycle 4, toutes dans le parcours ; la ligne « signe d'une expression factorisée du
second degré » vise le point de 1re techno (**auto-référence** : 1TECHNO-066).

| Ligne d'Automatismes (résumé fidèle)                                                 | Cible(s)                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------- |
| Appliquer un taux d'évolution pour calculer une valeur finale ou initiale            | 2-377                                         |
| Calculer un taux d'évolution, l'exprimer en pourcentage                              | 2-367 · 2-377                                 |
| Calculer le taux d'évolution équivalent à plusieurs évolutions successives           | 2-378                                         |
| Calculer un taux d'évolution réciproque                                              | 2-379                                         |
| Résoudre une équation produit nul                                                    | 2-267                                         |
| Signe d'une expression du premier degré, d'une expression factorisée du second degré | 2-328 · 2-330 · 1TECHNO-066 (auto-réf)        |
| Développer, factoriser, réduire une expression algébrique simple                     | 3-016 · 4-022 · 4-070 · 5-039                 |
| Résoudre graphiquement $f(x) = k$, $f(x) < k$                                        | 2-336                                         |
| Déterminer graphiquement le signe d'une fonction ou son tableau de variations        | 2-329 · 2-349                                 |
| Tracer une droite (équation réduite, ou point et coefficient directeur)              | 2-316                                         |
| Lire graphiquement l'équation réduite d'une droite                                   | 2-315                                         |
| Coefficient directeur d'une droite à partir de deux de ses points                    | 2-314                                         |
| Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite…   | 5-077 · 5-110 · 5-111 · 2-372 · 3-030         |
| Passer du graphique aux données et vice-versa                                        | 5-077 · 5-110 · 5-111 · 5-096                 |
| Calculer et interpréter des indicateurs statistiques                                 | 2-382 · 2-370 · 3-029 · 3-056 · 4-039 · 4-040 |
| Probabilités conditionnelles sur tableau croisé d'effectifs ou arbre pondéré         | 2-396 · 2-397                                 |
| Distinguer $P(A \cap B)$, $P_A(B)$, $P_B(A)$                                         | 2-399 · 2-400                                 |

### B. Reprise de la liste de 2de (C16 : « s'ajoute la liste des automatismes de seconde »)

Les **58 cibles** (66 depuis les passes des cycles 3 et 4 : + 6-199, 6-201, 5-108, 5-110, 5-111, 4-070, 3-052, 3-056) de la liste de 2de, reprises telles quelles avec le grade `1_TECHNO`.

### E. Entretien du vocabulaire de 2de (U5/V1) — 10 références (tableau plus haut)

---

## Rattachements discutables

1. **« Construire un parallélogramme circonscrit à une ellipse »** (STD2A, 1TECHNO-030) →
   `Figures planes > coniques` (l'objet construit est autour d'une ellipse). Alternative :
   `Solides > sections planes`, sa section dans le BO (l'ellipse y naît d'une section de
   cylindre).
2. **« Utiliser un générateur de nombres aléatoires … pour simuler une loi de Bernoulli »**
   (bloc Algorithmique, 1TECHNO-003) → `Variables et instructions` (notion), comme le doc
   d'écarts (« Variables » du BO). Alternative : `Échantillonnage > simulation`, son usage.
3. **« Calculer une valeur approchée d'une solution d'une équation par balayage »**
   (situation algorithmique, 1TECHNO-067) → `Généralités sur les fonctions > résolution
graphique` (doc d'écarts, validé). Alternative : `Continuité > encadrement d'une
solution`, qui porte les balayages de Tle — mais la continuité n'est pas au programme de
   1re techno.
4. **« Traiter un fichier contenant des données réelles… »** (Sélection de données,
   1TECHNO-012) → `Tableaux croisés` (notion), selon X2 ; l'analyse touche aussi
   `Représenter des données` et `Indicateurs`.
5. **« Cylindres de révolution »** (STD2A, 1TECHNO-024) → `Solides > reconnaître et
décrire`.

## Questions — TOUTES TRANCHÉES (David, 2026-10-08 : « je valide tout »)

> **T1** : la série est dite dans la rubrique (sauf STD2A / série STD2A), exigence `attendu`.
> **T2** : Situations algorithmiques = `algorithme` `attendu`.

- **T1 — séries STD2A / sauf STD2A.** Le programme est commun, mais deux parties dépendent de
  la série : l'Algorithmique (**sauf** STD2A, 11 points) et les Activités géométriques
  (**uniquement** STD2A, 18 points). Le schéma n'a pas de colonne « série ». Reco : **le
  dire dans la rubrique** (« Algorithmique et programmation (sauf série STD2A) »,
  « Activités géométriques (série STD2A) > … »), exigence `attendu` — un prof filtre par
  rubrique ; une classe STMG ignore simplement les 18 points STD2A. Alternative : ne pas
  seeder la partie STD2A tant qu'aucune classe STD2A n'est suivie.
- **T2 — Situations algorithmiques : `attendu`.** Contrairement aux « Exemples
  d'algorithme » de la voie générale (E1 : illustrations → approfondissement), le BO de
  1re techno écrit que ces situations « **doivent toutes faire l'objet d'un travail
  spécifique** » et qu'en fin d'année « les élèves aient acquis les capacités attendues en
  algorithmique ». Reco : **`attendu`** (kind `algorithme`).
- **Validation d'ensemble** : les scissions, l'entretien (10 réfs), les deux « modéliser »
  non retenus, les références A + B, les 5 discutables.

---

## Les 105 points

### Vocabulaire ensembliste et logique (rubrique = le thème)

| Code        | Énoncé                                                                                                                                        | kind | nœud                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| 1TECHNO-001 | Identifier le statut d'une égalité (identité, équation) et celui de la ou des lettres utilisées (variable, indéterminée, inconnue, paramètre) | s-f  | `Logique` Proposition mathématique > statut des lettres et des égalités |
| 1TECHNO-002 | Utiliser à bon escient les expressions « condition nécessaire », « condition suffisante », « équivalence logique »                            | s-f  | `Logique` Implication et équivalence (notion)                           |

### Algorithmique et programmation (sauf série STD2A) (kind `algorithme`, L1)

| Code        | Énoncé                                                                                                       | kind  | nœud                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------ |
| 1TECHNO-003 | Utiliser un générateur de nombres aléatoires entre 0 et 1 pour simuler une loi de Bernoulli de paramètre $p$ | algo. | `Algorithmique` Variables et instructions (notion)           |
| 1TECHNO-004 | Utiliser la notion de compteur                                                                               | algo. | `Algorithmique` Boucles (notion)                             |
| 1TECHNO-005 | Utiliser le principe d'accumulateur pour calculer une somme, un produit                                      | algo. | `Algorithmique` Boucles (notion)                             |
| 1TECHNO-006 | Identifier les entrées et les sorties d'une fonction                                                         | algo. | `Algorithmique` Fonctions Python > définir une fonction      |
| 1TECHNO-007 | Structurer un programme en ayant recours aux fonctions                                                       | algo. | `Algorithmique` Fonctions Python (notion)                    |
| 1TECHNO-008 | ✂ Générer une liste en extension ou par ajouts successifs                                                   | algo. | `Algorithmique` Listes > créer une liste                     |
| 1TECHNO-009 | ✂ Générer une liste en compréhension                                                                        | algo. | `Algorithmique` Listes > liste en compréhension              |
| 1TECHNO-010 | Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices                               | algo. | `Algorithmique` Listes > éléments et indices                 |
| 1TECHNO-011 | Itérer sur les éléments d'une liste                                                                          | algo. | `Algorithmique` Listes > parcourir une liste                 |
| 1TECHNO-012 | Traiter un fichier contenant des données réelles pour en extraire de l'information et l'analyser             | algo. | `Statistiques` Tableaux croisés (notion)                     |
| 1TECHNO-013 | Réaliser un tableau croisé de données sur deux critères à partir de données brutes                           | algo. | `Statistiques` Tableaux croisés > tableau croisé d'effectifs |

### Activités géométriques (série STD2A) > Géométrie plane (branche `Géométrie`)

| Code        | Énoncé                                                                                                       | kind  | nœud                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------ |
| 1TECHNO-014 | Exemples de polygones réguliers                                                                              | conn. | Figures planes > polygones réguliers |
| 1TECHNO-015 | Exemples de frises ou de pavages                                                                             | conn. | Translations > frises et pavages     |
| 1TECHNO-016 | Analyser et construire des polygones réguliers à l'aide d'un motif élémentaire et de transformations du plan | s-f   | Figures planes > polygones réguliers |
| 1TECHNO-017 | Calculer des distances, des angles, des aires et des périmètres associés aux polygones réguliers             | s-f   | Figures planes > polygones réguliers |
| 1TECHNO-018 | Créer une figure à partir d'un motif élémentaire par répétition d'une ou de deux transformations simples     | s-f   | Translations > frises et pavages     |
| 1TECHNO-019 | Analyser une frise ou un pavage et en rechercher un motif élémentaire                                        | s-f   | Translations > frises et pavages     |

### Activités géométriques (série STD2A) > Géométrie dans l'espace (branche `Géométrie`)

| Code        | Énoncé                                                                                                                              | kind  | nœud                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------ |
| 1TECHNO-020 | Coordonnées d'un point dans un repère orthonormal de l'espace                                                                       | conn. | Repérage dans l'espace (notion)            |
| 1TECHNO-021 | Distance entre deux points                                                                                                          | conn. | Repérage dans l'espace (notion)            |
| 1TECHNO-022 | Perspective cavalière : projection sur un plan parallèlement à une droite                                                           | conn. | Solides > perspective cavalière            |
| 1TECHNO-023 | Propriétés conservées (milieux, contacts, rapports de longueurs) et non conservées (longueurs, angles) par une projection parallèle | conn. | Solides > perspective cavalière            |
| 1TECHNO-024 | Cylindres de révolution                                                                                                             | conn. | Solides > reconnaître et décrire           |
| 1TECHNO-025 | Sections planes d'un cube                                                                                                           | conn. | Solides > sections planes                  |
| 1TECHNO-026 | Sections planes d'un cylindre de révolution ; ellipses                                                                              | conn. | Solides > sections planes                  |
| 1TECHNO-027 | Utiliser la représentation en perspective cavalière d'un quadrillage ou d'un cube pour représenter d'autres objets                  | s-f   | Solides > perspective cavalière            |
| 1TECHNO-028 | Représenter en perspective ou en vraie grandeur des sections planes                                                                 | s-f   | Solides > sections planes                  |
| 1TECHNO-029 | Construire des sections planes de cubes et de cylindres de révolution                                                               | s-f   | Solides > sections planes                  |
| 1TECHNO-030 | Construire un parallélogramme circonscrit à une ellipse                                                                             | s-f   | Figures planes > coniques _(discutable 1)_ |
| 1TECHNO-031 | Construire l'image perspective d'un cercle à partir d'un carré circonscrit au cercle                                                | s-f   | Solides > perspective cavalière            |

### Analyse > Suites numériques (branche `Suites`)

| Code        | Énoncé                                                                                                                                                 | kind  | nœud                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | -------------------------------------------------------- |
| 1TECHNO-032 | Différents modes de génération d'une suite numérique                                                                                                   | conn. | Généralités sur les suites > explicite ou par récurrence |
| 1TECHNO-033 | Sens de variation d'une suite                                                                                                                          | conn. | Généralités sur les suites > sens de variation           |
| 1TECHNO-034 | Représentation graphique : nuage de points $(n, u(n))$                                                                                                 | conn. | Généralités sur les suites > représentation graphique    |
| 1TECHNO-035 | ✂ Suites arithmétiques (modèles discrets d'évolutions absolues constantes) : relation de récurrence                                                   | conn. | Suites arithmétiques > reconnaître                       |
| 1TECHNO-036 | ✂ Suites géométriques à termes strictement positifs (modèles discrets d'évolutions relatives constantes) : relation de récurrence                     | conn. | Suites géométriques > reconnaître                        |
| 1TECHNO-037 | ✂ Suites arithmétiques : explicitation du terme de rang $n$                                                                                           | conn. | Suites arithmétiques > terme général                     |
| 1TECHNO-038 | ✂ Suites géométriques : explicitation du terme de rang $n$                                                                                            | conn. | Suites géométriques > terme général                      |
| 1TECHNO-039 | ✂ Suites arithmétiques : sens de variation                                                                                                            | conn. | Suites arithmétiques (notion)                            |
| 1TECHNO-040 | ✂ Suites géométriques : sens de variation                                                                                                             | conn. | Suites géométriques (notion)                             |
| 1TECHNO-041 | Suites arithmétiques et géométriques : représentation graphique                                                                                        | conn. | Généralités sur les suites > représentation graphique    |
| 1TECHNO-042 | Reconnaitre si une situation relève d'un modèle discret de variation linéaire ou exponentielle                                                         | s-f   | Suites et modélisation (notion)                          |
| 1TECHNO-043 | Calculer un terme de rang donné d'une suite définie par une relation fonctionnelle ou une relation de récurrence                                       | s-f   | Généralités sur les suites > calculer un terme           |
| 1TECHNO-044 | Réaliser et exploiter la représentation graphique des termes d'une suite                                                                               | s-f   | Généralités sur les suites > représentation graphique    |
| 1TECHNO-045 | Conjecturer, à partir de sa représentation graphique, la nature arithmétique ou géométrique d'une suite                                                | s-f   | Généralités sur les suites > représentation graphique    |
| 1TECHNO-046 | ✂ Démontrer qu'une suite est arithmétique                                                                                                             | s-f   | Suites arithmétiques > reconnaître                       |
| 1TECHNO-047 | ✂ Démontrer qu'une suite est géométrique                                                                                                              | s-f   | Suites géométriques > reconnaître                        |
| 1TECHNO-048 | ✂ Déterminer le sens de variation d'une suite arithmétique à l'aide de la raison                                                                      | s-f   | Suites arithmétiques > raison                            |
| 1TECHNO-049 | ✂ Déterminer le sens de variation d'une suite géométrique à l'aide de la raison                                                                       | s-f   | Suites géométriques > raison                             |
| 1TECHNO-050 | Calculer un terme de rang donné d'une suite, une somme finie de termes                                                                                 | algo. | Suites et modélisation > algorithmes                     |
| 1TECHNO-051 | Déterminer une liste de termes d'une suite et les représenter                                                                                          | algo. | Suites et modélisation > algorithmes                     |
| 1TECHNO-052 | Déterminer le rang à partir duquel les termes d'une suite sont supérieurs ou inférieurs à un seuil donné, ou aux termes de même rang d'une autre suite | algo. | Suites et modélisation > seuil                           |

### Analyse > Fonctions de la variable réelle (branche `Fonctions`)

| Code        | Énoncé                                                                                                                                                                                     | kind  | nœud                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------- |
| 1TECHNO-053 | Différents modes de représentation d'une fonction : expression littérale, représentation graphique                                                                                         | conn. | Généralités sur les fonctions (notion)               |
| 1TECHNO-054 | Notations $y = f(x)$ et $x \mapsto f(x)$                                                                                                                                                   | conn. | Généralités sur les fonctions (notion)               |
| 1TECHNO-055 | Taux de variation, entre deux valeurs de la variable $x$, d'une grandeur $y$ vérifiant $y = f(x)$                                                                                          | conn. | Dérivation > taux de variation                       |
| 1TECHNO-056 | Fonctions monotones sur un intervalle, lien avec le signe du taux de variation                                                                                                             | conn. | Généralités sur les fonctions > variations           |
| 1TECHNO-057 | Éléments caractéristiques de la courbe d'une fonction polynôme de degré 2 : allure, axe de symétrie, coordonnées du sommet en lien avec la symétrie et tableau de variation de la fonction | conn. | Second degré > parabole                              |
| 1TECHNO-058 | Racines et signe d'un polynôme de degré 2 donné sous forme factorisée (le calcul des racines à l'aide du discriminant ne figure pas au programme)                                          | conn. | Second degré (notion)                                |
| 1TECHNO-059 | Résoudre graphiquement une équation du type $f(x) = k$ ou une inéquation de la forme $f(x) < k$ ou $f(x) > k$                                                                              | s-f   | Généralités sur les fonctions > résolution graphique |
| 1TECHNO-060 | Interpréter le taux de variation comme pente de la sécante à la courbe passant par deux points distincts                                                                                   | s-f   | Dérivation > taux de variation                       |
| 1TECHNO-061 | Associer une parabole à une expression algébrique de degré 2, pour les fonctions de la forme $x \mapsto ax^2$, $x \mapsto ax^2 + c$, $x \mapsto a(x - x_1)(x - x_2)$                       | s-f   | Second degré > parabole                              |
| 1TECHNO-062 | Déterminer des éléments caractéristiques de la fonction $x \mapsto ax^2 + bx + c$ (aucune formule n'est attendue ; l'axe de symétrie se détermine par exemple en résolvant $f(x) = c$)     | s-f   | Second degré > parabole                              |
| 1TECHNO-063 | Vérifier qu'une valeur conjecturée est racine d'un polynôme de degré 2                                                                                                                     | s-f   | Second degré > racines                               |
| 1TECHNO-064 | Savoir factoriser, dans des cas simples, une expression du second degré connaissant au moins une de ses racines                                                                            | s-f   | Second degré > formes                                |
| 1TECHNO-065 | ✂ Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour trouver ses racines                                                                | s-f   | Second degré > racines                               |
| 1TECHNO-066 | ✂ Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour étudier son signe                                                                  | s-f   | Second degré > signe                                 |
| 1TECHNO-067 | Calculer une valeur approchée d'une solution d'une équation par balayage                                                                                                                   | algo. | Généralités sur les fonctions > résolution graphique |

### Analyse > Dérivation (branche `Fonctions`)

| Code        | Énoncé                                                                                                          | kind  | nœud                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------- |
| 1TECHNO-068 | Sécantes à une courbe passant par un point donné ; taux de variation en un point                                | conn. | Dérivation > taux de variation           |
| 1TECHNO-069 | Tangente à une courbe en un point, définie comme position limite des sécantes passant par ce point              | conn. | Dérivation > tangente                    |
| 1TECHNO-070 | Nombre dérivé en un point défini comme limite du taux de variation en ce point                                  | conn. | Dérivation > nombre dérivé               |
| 1TECHNO-071 | Équation réduite de la tangente en un point                                                                     | conn. | Dérivation > tangente                    |
| 1TECHNO-072 | Fonction dérivée                                                                                                | conn. | Dérivation > fonctions dérivées          |
| 1TECHNO-073 | Fonctions dérivées de $x \mapsto x^2$, $x \mapsto x^3$                                                          | conn. | Dérivation > fonctions dérivées          |
| 1TECHNO-074 | Dérivée d'une somme, dérivée de $kf$ ($k \in \mathbb{R}$), dérivée d'un polynôme de degré inférieur ou égal à 3 | conn. | Dérivation > opérations sur les dérivées |
| 1TECHNO-075 | Sens de variation d'une fonction, lien avec le signe de la dérivée                                              | conn. | Dérivation > variations                  |
| 1TECHNO-076 | Tableau de variations, extrémums                                                                                | conn. | Dérivation > étude de fonction           |
| 1TECHNO-077 | Interpréter géométriquement le nombre dérivé comme coefficient directeur de la tangente                         | s-f   | Dérivation > nombre dérivé               |
| 1TECHNO-078 | Construire la tangente à une courbe en un point                                                                 | s-f   | Dérivation > tangente                    |
| 1TECHNO-079 | Déterminer l'équation réduite de la tangente à une courbe en un point                                           | s-f   | Dérivation > tangente                    |
| 1TECHNO-080 | Calculer la dérivée d'une fonction polynôme de degré inférieur ou égal à trois                                  | s-f   | Dérivation > opérations sur les dérivées |
| 1TECHNO-081 | Déterminer le sens de variation et les extrémums d'une fonction polynôme de degré inférieur ou égal à 3         | s-f   | Dérivation > étude de fonction           |

### Statistiques et probabilités > Séries statistiques à deux variables quantitatives (branche `Statistiques`)

| Code        | Énoncé                                                                         | kind  | nœud                                             |
| ----------- | ------------------------------------------------------------------------------ | ----- | ------------------------------------------------ |
| 1TECHNO-082 | Nuage de points associé à une série statistique à deux variables quantitatives | conn. | Statistique à deux variables > nuage de points   |
| 1TECHNO-083 | ✂ Ajustement affine                                                           | conn. | Statistique à deux variables > ajustement affine |
| 1TECHNO-084 | ✂ Point moyen                                                                 | conn. | Statistique à deux variables > point moyen       |
| 1TECHNO-085 | Représenter un nuage de points                                                 | s-f   | Statistique à deux variables > nuage de points   |
| 1TECHNO-086 | Savoir calculer les coordonnées du point moyen                                 | s-f   | Statistique à deux variables > point moyen       |
| 1TECHNO-087 | Déterminer et utiliser un ajustement affine                                    | s-f   | Statistique à deux variables > ajustement affine |
| 1TECHNO-088 | Interpoler ou extrapoler des valeurs inconnues à l'aide d'un ajustement affine | s-f   | Statistique à deux variables > ajustement affine |

### Statistiques et probabilités > Probabilités conditionnelles : indépendance (branche `Probabilités`)

| Code        | Énoncé                                                                                         | kind  | nœud                                                |
| ----------- | ---------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------- |
| 1TECHNO-089 | Indépendance de deux évènements                                                                | conn. | Probabilités conditionnelles > indépendance         |
| 1TECHNO-090 | Formule des probabilités totales                                                               | conn. | Probabilités conditionnelles > probabilités totales |
| 1TECHNO-091 | Savoir utiliser ou justifier l'indépendance de deux évènements                                 | s-f   | Probabilités conditionnelles > indépendance         |
| 1TECHNO-092 | Dans les cas simples, calculer une probabilité à l'aide de la formule des probabilités totales | s-f   | Probabilités conditionnelles > probabilités totales |

### Statistiques et probabilités > Modèle associé à une expérience aléatoire à plusieurs épreuves indépendantes (branche `Probabilités`)

| Code        | Énoncé                                                                                                                                                                            | kind  | nœud                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| 1TECHNO-093 | Probabilité associée à la répétition d'épreuves aléatoires identiques et indépendantes de Bernoulli                                                                               | conn. | Probabilités conditionnelles > épreuves indépendantes successives |
| 1TECHNO-094 | Représenter par un arbre de probabilités la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$ afin de calculer des probabilités | s-f   | Probabilités conditionnelles > épreuves indépendantes successives |

### Statistiques et probabilités > Variables aléatoires (branches `Probabilités` / `Statistiques`)

| Code        | Énoncé                                                                                                                                                                                    | kind  | nœud                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------- |
| 1TECHNO-095 | ✂ Variable aléatoire discrète : loi de probabilité                                                                                                                                       | conn. | Variables aléatoires > loi d'une variable aléatoire |
| 1TECHNO-096 | ✂ Variable aléatoire discrète : espérance                                                                                                                                                | conn. | Variables aléatoires > espérance                    |
| 1TECHNO-097 | Loi de Bernoulli (0,1) de paramètre $p$, espérance                                                                                                                                        | conn. | Loi binomiale > schéma de Bernoulli                 |
| 1TECHNO-098 | Interpréter en situation les écritures $\{X = a\}$, $\{X \leqslant a\}$ où $X$ désigne une variable aléatoire et calculer les probabilités correspondantes $P(X = a)$, $P(X \leqslant a)$ | s-f   | Variables aléatoires > loi d'une variable aléatoire |
| 1TECHNO-099 | Calculer et interpréter en contexte l'espérance d'une variable aléatoire discrète                                                                                                         | s-f   | Variables aléatoires > espérance                    |
| 1TECHNO-100 | Reconnaitre une situation aléatoire modélisée par une loi de Bernoulli                                                                                                                    | s-f   | Loi binomiale > schéma de Bernoulli                 |
| 1TECHNO-101 | Simuler $N$ échantillons de taille $n$ d'une loi de Bernoulli et représenter les fréquences observées des 1 par un histogramme ou un nuage de points                                      | s-f   | `Statistiques` Échantillonnage > simulation         |
| 1TECHNO-102 | Interpréter sur des exemples la distance à $p$ de la fréquence observée des 1 dans un échantillon de taille $n$ d'une loi de Bernoulli de paramètre $p$                                   | s-f   | `Statistiques` Échantillonnage > fluctuation        |
| 1TECHNO-103 | Simuler des échantillons de taille $n$ d'une loi de Bernoulli à partir d'un générateur de nombres aléatoires entre 0 et 1                                                                 | algo. | `Statistiques` Échantillonnage > simulation         |
| 1TECHNO-104 | Représenter par un histogramme ou par un nuage de points les fréquences observées des 1 dans $N$ échantillons de taille $n$ d'une loi de Bernoulli                                        | algo. | `Statistiques` Échantillonnage > simulation         |
| 1TECHNO-105 | Compter le nombre de valeurs situées dans un intervalle de la forme $[p - ks\,;\,p + ks]$ pour $k \in \{1\,;2\,;3\}$                                                                      | algo. | `Statistiques` Échantillonnage > fluctuation        |

## Après validation (plan de livraison)

Migration additive générée depuis ce document : 105 points `1TECHNO-001`…`105`,
références A + B + E (auto-référence comprise) ; bloc DO auto-vérifiant (comptes, kinds,
0 sans nœud, références) ; test intégral, preuve rouge, audit, PR, CI, merge,
`db:migrate`, vérification prod.
