# Bornes des points de première technologique

Objectif : pour chaque point actif de 1re technologique (`points-lycee.csv`, grade `1_TECHNO`), dire jusqu'où vont les questions générées (« seulement »). 143 points. Programme du BO n° 14 du 2026-04-02 ; héritage : la seconde (BO 2de), dont rien n'est recopié sauf ce qui change.

## Sources et façon de citer

| Abréviation       | Document                                                                                                                                                     | Page citée  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **BO 1re techno** | Programme de mathématiques de la classe de première de la voie technologique (BO n° 14 du 2026-04-02, `docs/ref/programmes/`, extrait dans `bo/1techno.txt`) | page du PDF |
| **BO Tle techno** | Programme de mathématiques de la classe terminale de la voie technologique (même BO, `bo/ttechno.txt`)                                                       | page du PDF |
| **BO 2de**        | Programme de seconde générale et technologique (`bo/2de.txt`), pour ce qui est hérité                                                                        | page du PDF |

Aucun document d'accompagnement n'est disponible pour ces programmes : aucun n'est cité.

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite, le plus souvent une **absence** (ce que la liste des contenus ne contient pas), toujours expliquée dans la remarque ⚠ du point ou dans le texte de la borne générale.

## Ce qui est le plus utile pour la vérification « seulement »

- **Fonctions** : seules familles nouvelles, les polynômes de degré 2 et 3 ; **ni exponentielle, ni logarithme, ni trigonométrie** (la voie générale les a dès la 1re).
- **Second degré** : **pas de discriminant**, ni formule −b/2a ; racines lues sur une **forme factorisée** ou évidentes ; parabole associée seulement aux formes ax², ax² + c, a(x − x₁)(x − x₂).
- **Dérivation** : polynômes de degré ≤ 3 seulement (x², x³, somme, kf) ; **ni produit, ni quotient, ni composée, ni 1/x, ni √x** ; limite intuitive.
- **Suites** : géométriques **à termes strictement positifs** ; notation u(n) avant uₙ ; **pas de formule de somme** (Tle) ni de logarithme pour un seuil (algorithme ou tableur).
- **Probabilités** : répétition de Bernoulli **n ⩽ 4** ; variable aléatoire **sans formalisme**, espérance seulement (pas de variance) ; probabilités totales « dans les cas simples ».
- **Statistiques à deux variables** : ajustement affine (jugé, Mayer, moindres carrés), **aucune connaissance théorique** (pas de formule de covariance attendue).
- **Séries** : algorithmique pour toutes sauf STD2A ; géométrie (frises, pavages, perspective cavalière, sections) pour STD2A seulement.

## Contradictions et tensions entre passages

1. **Probabilités totales** : non attendues en 2de (BO 2de p.13), au programme de 1re techno « dans les cas simples » (p.10), « introduites » en Tle techno (BO Tle techno p.9). → l1t-1.
2. **Variations d'un polynôme de degré 3** : capacité au programme (p.8) alors que le discriminant est exclu (p.8) ; le solveur n'est cité qu'« en cas de besoin ». → l1t-2.
3. **STD2A** : « Les professeurs peuvent aborder d'autres notions si la situation étudiée le nécessite » (p.5), en tension avec l'inclusion stricte. → l1t-8.
4. **Approche graphique du nombre dérivé** (p.8) et, en Tle (p.9), « réinvestir la définition du nombre dérivé à partir du calcul du taux de variation » : le calcul algébrique en 1re n'est pas écrit mais supposé. → l1t-7.

## Questions (tranchées par David)

Les incertitudes sont dans `questions-techno.json` (sans décision) :

- **l1t-1** — Probabilités totales : quelle partition en 1re techno ? (reco : `deux`). → **deux** (2026-10-23)
- **l1t-2** — Variations d'un polynôme de degré 3 sans discriminant (reco : `evidentes`). → **evidentes** (2026-10-23)
- **l1t-3** — Automatismes : « privilégiant l'activité mentale » est-il une borne ? (reco : `modalite`). → **modalite** (2026-10-23)
- **l1t-4** — Racines et coefficients non entiers du second degré en 1re techno (reco : `simples`). → **simples** (2026-10-23)
- **l1t-5** — Indépendance : le critère produit est-il permis ? (reco : `produit-admis`). → **produit-admis** (2026-10-23)
- **l1t-6** — Variable aléatoire : {X > a}, {X ⩾ a} en 1re techno ? (reco : `complement`). → **complement** (2026-10-23)
- **l1t-7** — Nombre dérivé : calcul algébrique de la limite du taux de variation ? (reco : `algebrique`). → **algebrique** (2026-10-23)
- **l1t-8** — STD2A : « d'autres notions si la situation le nécessite » (reco : `strict`). → **strict** (2026-10-23)

## Première technologique (143 points, 61 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Familles nouvelles de 1re techno : polynômes de degré 2 et 3 seulement ; restent connues les fonctions de référence de 2de (affines, carré, inverse, racine carrée, cube, valeur absolue). — _BO 1re techno p.7 ; BO 2de p.10-11_ (BO)
- Ni exponentielle, ni logarithme, ni fonction trigonométrique (aucune n'apparaît au programme de 1re techno ; x ↦ aˣ et log arrivent en Tle techno, la base e n'existe pas dans la voie techno). — _BO 1re techno p.7-9 ; BO Tle techno p.8_ (déduite)
- Dérivation limitée aux polynômes de degré ≤ 3 : dérivées de x², x³, d'une somme, de kf ; ni produit, ni quotient, ni composée ; la dérivée de 1/x n'est pas au programme de mathématiques de 1re (vue en spécialité physique-chimie et mathématiques en STI2D/STL, reprise en Tle). — _BO 1re techno p.8 ; BO Tle techno p.9_ (BO)
- Second degré : le calcul des racines par le discriminant ne figure pas au programme ; on privilégie les racines évidentes et les interprétations graphiques ; en cas de besoin, l'équation du second degré se résout au solveur. — _BO 1re techno p.8_ (BO)
- Limite : pas de définition formelle, approche intuitive à partir d'exemples ; vocabulaire et notation introduits avec le nombre dérivé. — _BO 1re techno p.9_ (BO)
- Suites : la notation u(n) précède la notation uₙ. — _BO 1re techno p.7_ (BO)
- La variable n'est pas toujours x (t, u, etc.) ; graphiques reliant une grandeur y à une grandeur composée (x², 1/x…). — _BO 1re techno p.8_ (BO)
- Variables aléatoires : aucun formalisme, manipulées en contexte (issues numériques). — _BO 1re techno p.10_ (BO)
- Variable aléatoire : espérance seulement, ni variance ni écart type de X (absents du programme) ; le seul écart type rencontré est celui d'une série de fréquences observées. — _BO 1re techno p.10_ (déduite)
- Programmation : Python (ou tableur pour les situations algorithmiques) ; seule notion nouvelle, la liste, sans autre type de collection ; affectation notée ← en langage naturel. — _BO 1re techno p.4-5_ (BO)
- « Algorithmique et programmation » : toutes les séries sauf STD2A ; « Activités géométriques » : série STD2A seulement. — _BO 1re techno p.4_ (BO)
- Probabilités totales : quelle partition en 1re techno ? : 1re : partition {A, Ā} seulement (arbre à deux niveaux) ; trois évènements et plus en Tle. — _Décision de David, 2026-10-23 (question l1t-1) ; d'après BO 2de p.13, BO 1re techno p.10, BO Tle techno p.9_ (décision)
- Variations d'un polynôme de degré 3 sans discriminant : Dérivée factorisable sans discriminant : forme factorisée, racine évidente, ou racines données dans l'énoncé. — _Décision de David, 2026-10-23 (question l1t-2) ; d'après BO 1re techno p.8_ (décision)
- Automatismes : « privilégiant l'activité mentale » est-il une borne ? : Modalité d'enseignement, pas une borne : le grain du savoir fixe seul l'inclusion. — _Décision de David, 2026-10-23 (question l1t-3) ; d'après BO 1re techno p.6, BO Tle techno p.6_ (décision)
- Racines et coefficients non entiers du second degré en 1re techno : 1re : racines entières ou fractions simples (1/2, −4/3) ; paramètres littéraux exclus. — _Décision de David, 2026-10-23 (question l1t-4) ; d'après BO Tle techno p.6, BO 1re techno p.8_ (décision)
- Indépendance : le critère produit est-il permis ? : Critère produit admis (conséquence directe de P(A ∩ B) = P(A)·P_A(B), vu en 2de). — _Décision de David, 2026-10-23 (question l1t-5) ; d'après BO 1re techno p.9-10, BO 2de p.13_ (décision)
- Variable aléatoire : {X > a}, {X ⩾ a} en 1re techno ? : Admis : {X > a} est le contraire de {X ⩽ a}, et {X ⩾ a}, {X < a} s'y ramènent ; seules les écritures d'intervalle {a ⩽ X ⩽ b} restent hors point. — _Décision de David, 2026-10-23 (question l1t-6) ; d'après BO 1re techno p.10, BO 2de p.6_ (décision)
- Nombre dérivé : calcul algébrique de la limite du taux de variation ? : Admis sur des polynômes simples : taux de variation simplifié, puis h → 0 de façon intuitive. — _Décision de David, 2026-10-23 (question l1t-7) ; d'après BO 1re techno p.8, BO 1re techno p.9, BO Tle techno p.9_ (décision)
- STD2A : « d'autres notions si la situation le nécessite » : Inclusion stricte : seules les notions listées ; une autre notion relève de son propre point (ou d'aucun). — _Décision de David, 2026-10-23 (question l1t-8) ; d'après BO 1re techno p.5_ (décision)

### Vocabulaire ensembliste et logique

- **1TECHNO-001** — Identifier le statut d'une égalité (identité, équation) — _hérite des bornes générales_
- **1TECHNO-106** — Identifier le statut de la ou des lettres utilisées (variable, indéterminée, inconnue, paramètre) — _hérite des bornes générales_
- **1TECHNO-002** — Utiliser à bon escient les expressions « condition nécessaire », « condition suffisante », « équivalence logique » — _hérite des bornes générales_

### Algorithmique et programmation (sauf série STD2A)

- **1TECHNO-003** — Utiliser un générateur de nombres aléatoires entre 0 et 1 pour simuler une loi de Bernoulli de paramètre $p$
  - Générateur de nombres aléatoires entre 0 et 1 ; loi de Bernoulli de paramètre p. — _BO 1re techno p.5_ (BO)
- **1TECHNO-004** — Utiliser la notion de compteur — _hérite des bornes générales_
- **1TECHNO-005** — Utiliser le principe d'accumulateur pour calculer une somme — _hérite des bornes générales_
- **1TECHNO-107** — Utiliser le principe d'accumulateur pour calculer un produit — _hérite des bornes générales_
- **1TECHNO-006** — Identifier les entrées et les sorties d'une fonction — _hérite des bornes générales_
- **1TECHNO-007** — Structurer un programme en ayant recours aux fonctions
  - Programmation modulaire : découper une tâche complexe en tâches plus simples (fonctions). — _BO 1re techno p.5_ (BO)
- **1TECHNO-008** — Générer une liste en extension
  - Listes seulement ; génération en extension et en compréhension mise en lien avec la notion d'ensemble. — _BO 1re techno p.5_ (BO)
- **1TECHNO-108** — Générer une liste par ajouts successifs
  - Listes seulement (pas d'autre type de collection). — _BO 1re techno p.5_ (BO)
- **1TECHNO-009** — Générer une liste en compréhension
  - Listes seulement ; les conditions d'une liste en compréhension travaillent la logique. — _BO 1re techno p.5_ (BO)
- **1TECHNO-010** — Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices — _hérite des bornes générales_
- **1TECHNO-011** — Itérer sur les éléments d'une liste — _hérite des bornes générales_
- **1TECHNO-012** — Traiter un fichier contenant des données réelles pour en extraire de l'information et l'analyser — _point-compétence, aucune borne_
  - ⚠ Point-compétence : puce large sans grain questionnable (évaluation par compétences), aucune borne propre. Traitement de fichiers de données réelles.
- **1TECHNO-013** — Réaliser un tableau croisé de données sur deux critères à partir de données brutes — _hérite des bornes générales_

### Activités géométriques (série STD2A) > Géométrie plane

- **1TECHNO-014** — Exemples de polygones réguliers — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-015** — Exemples de frises
  - Motif élémentaire : triangle rectangle ou isocèle, parallélogramme ou rectangle ; la classification des types de frises ou de pavages n'est pas un attendu. — _BO 1re techno p.5_ (BO)
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-109** — Exemples de pavages
  - Motif élémentaire : triangle rectangle ou isocèle, parallélogramme ou rectangle ; la classification des types de frises ou de pavages n'est pas un attendu. — _BO 1re techno p.5_ (BO)
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-016** — Analyser des polygones réguliers à l'aide d'un motif élémentaire et de transformations du plan — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-110** — Construire des polygones réguliers à l'aide d'un motif élémentaire et de transformations du plan — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-017** — Calculer des distances associées aux polygones réguliers — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-111** — Calculer des angles associés aux polygones réguliers — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-112** — Calculer des aires associées aux polygones réguliers — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-113** — Calculer des périmètres associés aux polygones réguliers — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-018** — Créer une figure à partir d'un motif élémentaire par répétition d'une ou de deux transformations simples — _point-compétence, aucune borne_
  - ⚠ Point-compétence : puce large sans grain questionnable (évaluation par compétences), aucune borne propre. Création de figure (« dialogue entre observation, analyse et création artistique », BO 1re techno p.5). Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-019** — Analyser une frise et en rechercher un motif élémentaire
  - Motif élémentaire : triangle rectangle ou isocèle, parallélogramme ou rectangle ; la classification des types de frises ou de pavages n'est pas un attendu. — _BO 1re techno p.5_ (BO)
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-114** — Analyser un pavage et en rechercher un motif élémentaire
  - Motif élémentaire : triangle rectangle ou isocèle, parallélogramme ou rectangle ; la classification des types de frises ou de pavages n'est pas un attendu. — _BO 1re techno p.5_ (BO)
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.

### Activités géométriques (série STD2A) > Géométrie dans l'espace

- **1TECHNO-020** — Coordonnées d'un point dans un repère orthonormal de l'espace
  - Repère orthonormal de l'espace. — _BO 1re techno p.6_ (BO)
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-021** — Distance entre deux points — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-022** — Perspective cavalière : projection sur un plan parallèlement à une droite — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-023** — Propriétés conservées (milieux, contacts, rapports de longueurs) et non conservées (longueurs, angles) par une projection parallèle
  - Conservés : milieux, contacts, rapports de longueurs ; non conservés : longueurs, angles. — _BO 1re techno p.6_ (BO)
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-024** — Cylindres de révolution — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-025** — Sections planes d'un cube — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-026** — Sections planes d'un cylindre de révolution ; ellipses — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-027** — Utiliser la représentation en perspective cavalière d'un quadrillage ou d'un cube pour représenter d'autres objets
  - À partir de la perspective cavalière d'un quadrillage ou d'un cube. — _BO 1re techno p.6_ (BO)
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-028** — Représenter en perspective des sections planes — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-115** — Représenter en vraie grandeur des sections planes — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-029** — Construire des sections planes de cubes — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-116** — Construire des sections planes de cylindres de révolution — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-030** — Construire un parallélogramme circonscrit à une ellipse — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.
- **1TECHNO-031** — Construire l'image perspective d'un cercle à partir d'un carré circonscrit au cercle — _hérite des bornes générales_
  - ⚠ Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »). → décision l1t-8 : strict.

### Automatismes > Fonctions et représentations

- **1TECHNO-139** — Déterminer graphiquement le signe d'une fonction — _hérite des bornes générales_
- **1TECHNO-140** — Tracer une droite donnée par un point et son coefficient directeur — _hérite des bornes générales_
- **1TECHNO-141** — Déterminer le coefficient directeur d'une droite à partir des coordonnées de deux de ses points — _hérite des bornes générales_
  - ⚠ La liste d'automatismes de Tle techno (p.7), qui référence ce point, dit « Déterminer l'équation réduite d'une droite à partir des coordonnées de deux de ses points » : plus que le coefficient directeur.

### Analyse > Suites numériques

- **1TECHNO-032** — Différents modes de génération d'une suite numérique
  - Modes de génération : relation fonctionnelle ou relation de récurrence ; le tableur sert à calculer des termes. — _BO 1re techno p.7_ (BO)
- **1TECHNO-033** — Sens de variation d'une suite — _hérite des bornes générales_
- **1TECHNO-034** — Représentation graphique : nuage de points $(n, u(n))$ — _hérite des bornes générales_
- **1TECHNO-035** — Suites arithmétiques (modèles discrets d'évolutions absolues constantes) : relation de récurrence
  - Suite arithmétique : modèle discret d'évolution absolue constante (croissance linéaire). — _BO 1re techno p.7_ (BO)
- **1TECHNO-036** — Suites géométriques à termes strictement positifs (modèles discrets d'évolutions relatives constantes) : relation de récurrence
  - Suites géométriques à termes strictement positifs (premier terme et raison strictement positifs). — _BO 1re techno p.7_ (BO)
- **1TECHNO-037** — Suites arithmétiques : explicitation du terme de rang $n$ — _hérite des bornes générales_
- **1TECHNO-038** — Suites géométriques : explicitation du terme de rang $n$
  - Suites géométriques à termes strictement positifs (premier terme et raison strictement positifs). — _BO 1re techno p.7_ (BO)
- **1TECHNO-039** — Suites arithmétiques : sens de variation — _hérite des bornes générales_
- **1TECHNO-040** — Suites géométriques : sens de variation
  - Suites géométriques à termes strictement positifs (premier terme et raison strictement positifs). — _BO 1re techno p.7_ (BO)
- **1TECHNO-041** — Suites arithmétiques : représentation graphique — _hérite des bornes générales_
- **1TECHNO-117** — Suites géométriques : représentation graphique
  - Suites géométriques à termes strictement positifs (premier terme et raison strictement positifs). — _BO 1re techno p.7_ (BO)
- **1TECHNO-142** — Modéliser une situation à l'aide d'une suite — _point-compétence, aucune borne_
  - ⚠ Point-compétence : puce large sans grain questionnable (évaluation par compétences), aucune borne propre. Modéliser.
- **1TECHNO-042** — Reconnaitre si une situation relève d'un modèle discret de variation linéaire ou exponentielle
  - Deux modèles seulement : variation linéaire (arithmétique) ou exponentielle (géométrique). — _BO 1re techno p.7_ (BO)
- **1TECHNO-043** — Calculer un terme de rang donné d'une suite définie par une relation fonctionnelle — _hérite des bornes générales_
- **1TECHNO-118** — Calculer un terme de rang donné d'une suite définie par une relation de récurrence
  - La définition par récurrence fonctionne en 1re ; on présente aussi des suites ni arithmétiques ni géométriques. — _BO 1re techno p.7_ (BO)
- **1TECHNO-044** — Réaliser la représentation graphique des termes d'une suite — _hérite des bornes générales_
- **1TECHNO-119** — Exploiter la représentation graphique des termes d'une suite — _hérite des bornes générales_
- **1TECHNO-045** — Conjecturer, à partir de sa représentation graphique, la nature arithmétique ou géométrique d'une suite — _hérite des bornes générales_
- **1TECHNO-046** — Démontrer qu'une suite est arithmétique — _hérite des bornes générales_
- **1TECHNO-047** — Démontrer qu'une suite est géométrique
  - Suites géométriques à termes strictement positifs (premier terme et raison strictement positifs). — _BO 1re techno p.7_ (BO)
- **1TECHNO-048** — Déterminer le sens de variation d'une suite arithmétique à l'aide de la raison — _hérite des bornes générales_
- **1TECHNO-049** — Déterminer le sens de variation d'une suite géométrique à l'aide de la raison
  - Suites géométriques à termes strictement positifs (premier terme et raison strictement positifs). — _BO 1re techno p.7_ (BO)
- **1TECHNO-050** — Calculer un terme de rang donné d'une suite
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
- **1TECHNO-120** — Calculer une somme finie de termes
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
  - Somme calculée par algorithme (accumulateur) ; la formule de la somme des termes d'une suite arithmétique ou géométrique est de Tle. — _BO 1re techno p.7 ; BO Tle techno p.7_ (déduite)
  - ⚠ Lecture déduite : la somme finie de termes n'apparaît en 1re qu'en situation algorithmique ; la « somme des n premiers termes » et la notation Σ sont des contenus de Tle techno (p.7).
- **1TECHNO-051** — Déterminer une liste de termes d'une suite
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
- **1TECHNO-121** — Représenter une liste de termes d'une suite
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
- **1TECHNO-052** — Déterminer le rang à partir duquel les termes d'une suite sont supérieurs ou inférieurs à un seuil donné
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
  - Seuil cherché par algorithme ou tableur ; la résolution de qⁿ > b par le logarithme est de Tle. — _BO 1re techno p.7 ; BO Tle techno p.8_ (déduite)
  - ⚠ Lecture déduite : le logarithme décimal et l'inéquation aⁿ < b d'inconnue n entière n'arrivent qu'en Tle techno (p.8).
- **1TECHNO-122** — Déterminer le rang à partir duquel les termes d'une suite sont supérieurs ou inférieurs aux termes de même rang d'une autre suite
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)

### Analyse > Fonctions de la variable réelle

- **1TECHNO-053** — Différents modes de représentation d'une fonction : expression littérale, représentation graphique — _hérite des bornes générales_
- **1TECHNO-054** — Notations $y = f(x)$ et $x \mapsto f(x)$ — _hérite des bornes générales_
- **1TECHNO-055** — Taux de variation, entre deux valeurs de la variable $x$, d'une grandeur $y$ vérifiant $y = f(x)$ — _hérite des bornes générales_
- **1TECHNO-056** — Fonctions monotones sur un intervalle, lien avec le signe du taux de variation — _hérite des bornes générales_
- **1TECHNO-057** — Éléments caractéristiques de la courbe d'une fonction polynôme de degré 2 : allure — _hérite des bornes générales_
- **1TECHNO-123** — Éléments caractéristiques de la courbe d'une fonction polynôme de degré 2 : axe de symétrie
  - Aucune formule attendue (pas de −b/2a) : l'axe de symétrie se détermine par exemple en résolvant f(x) = c. — _BO 1re techno p.8_ (BO)
- **1TECHNO-124** — Éléments caractéristiques de la courbe d'une fonction polynôme de degré 2 : coordonnées du sommet en lien avec la symétrie
  - Aucune formule attendue : sommet obtenu par la symétrie (axe trouvé par exemple en résolvant f(x) = c). — _BO 1re techno p.8_ (BO)
- **1TECHNO-125** — Éléments caractéristiques de la courbe d'une fonction polynôme de degré 2 : tableau de variation de la fonction — _hérite des bornes générales_
- **1TECHNO-058** — Racines d'un polynôme de degré 2 donné sous forme factorisée (le calcul des racines à l'aide du discriminant ne figure pas au programme)
  - Polynôme de degré 2 donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re techno p.8_ (BO)
  - ⚠ Voir l1t-4 (racines non entières). → décision l1t-4 : simples.
- **1TECHNO-126** — Signe d'un polynôme de degré 2 donné sous forme factorisée
  - Polynôme de degré 2 donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re techno p.8_ (BO)
  - ⚠ Voir l1t-4 (racines non entières). → décision l1t-4 : simples.
- **1TECHNO-143** — Modéliser la dépendance entre deux grandeurs à l'aide d'une fonction — _point-compétence, aucune borne_
  - ⚠ Point-compétence : puce large sans grain questionnable (évaluation par compétences), aucune borne propre. Modéliser.
- **1TECHNO-059** — Résoudre graphiquement une équation du type $f(x) = k$ — _hérite des bornes générales_
- **1TECHNO-127** — Résoudre graphiquement une inéquation de la forme $f(x) < k$ ou $f(x) > k$ — _hérite des bornes générales_
- **1TECHNO-060** — Interpréter le taux de variation comme pente de la sécante à la courbe passant par deux points distincts — _hérite des bornes générales_
- **1TECHNO-061** — Associer une parabole à une expression algébrique de degré 2, pour les fonctions de la forme $x \mapsto ax^2$, $x \mapsto ax^2 + c$, $x \mapsto a(x - x_1)(x - x_2)$
  - Formes x ↦ ax², x ↦ ax² + c, x ↦ a(x − x₁)(x − x₂) seulement. — _BO 1re techno p.8_ (BO)
- **1TECHNO-062** — Déterminer des éléments caractéristiques de la fonction $x \mapsto ax^2 + bx + c$ (aucune formule n'est attendue ; l'axe de symétrie se détermine par exemple en résolvant $f(x) = c$)
  - Aucune formule attendue ; l'axe de symétrie se détermine par exemple en résolvant f(x) = c. — _BO 1re techno p.8_ (BO)
- **1TECHNO-063** — Vérifier qu'une valeur conjecturée est racine d'un polynôme de degré 2 — _hérite des bornes générales_
  - ⚠ Voir l1t-4 (racines non entières). → décision l1t-4 : simples.
- **1TECHNO-064** — Savoir factoriser, dans des cas simples, une expression du second degré connaissant au moins une de ses racines
  - Cas simples, au moins une racine connue. — _BO 1re techno p.8_ (BO)
  - ⚠ Voir l1t-4 (racines non entières). → décision l1t-4 : simples.
- **1TECHNO-065** — Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour trouver ses racines
  - Polynôme de degré 2 donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re techno p.8_ (BO)
  - ⚠ Voir l1t-4 (racines non entières). → décision l1t-4 : simples.
- **1TECHNO-066** — Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour étudier son signe
  - Polynôme de degré 2 donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re techno p.8_ (BO)
  - ⚠ Point référencé par les automatismes : voir l1t-3 (activité mentale) et l1t-4 (racines non entières). → décisions l1t-3 : modalite ; l1t-4 : simples.
- **1TECHNO-067** — Calculer une valeur approchée d'une solution d'une équation par balayage
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
  - Valeur approchée par balayage. — _BO 1re techno p.8_ (BO)

### Analyse > Dérivation

- **1TECHNO-068** — Sécantes à une courbe passant par un point donné — _hérite des bornes générales_
- **1TECHNO-128** — Taux de variation en un point — _hérite des bornes générales_
  - ⚠ Voir l1t-7 (calcul algébrique du taux de variation). → décision l1t-7 : algebrique.
- **1TECHNO-069** — Tangente à une courbe en un point, définie comme position limite des sécantes passant par ce point
  - Position limite des sécantes, visualisée au logiciel de géométrie dynamique ; pas de définition formelle de la limite. — _BO 1re techno p.9_ (BO)
- **1TECHNO-070** — Nombre dérivé en un point défini comme limite du taux de variation en ce point
  - Limite : approche intuitive, sans définition formelle ; vocabulaire et notation introduits à cette occasion. — _BO 1re techno p.9_ (BO)
  - ⚠ Voir l1t-7 (calcul algébrique du taux de variation). → décision l1t-7 : algebrique.
- **1TECHNO-071** — Équation réduite de la tangente en un point — _hérite des bornes générales_
- **1TECHNO-072** — Fonction dérivée — _hérite des bornes générales_
- **1TECHNO-073** — Fonction dérivée de $x \mapsto x^2$ — _hérite des bornes générales_
- **1TECHNO-129** — Fonction dérivée de $x \mapsto x^3$ — _hérite des bornes générales_
- **1TECHNO-074** — Dérivée d'une somme — _hérite des bornes générales_
- **1TECHNO-130** — Dérivée de $kf$ ($k \in \mathbb{R}$) — _hérite des bornes générales_
- **1TECHNO-131** — Dérivée d'un polynôme de degré inférieur ou égal à 3 — _hérite des bornes générales_
- **1TECHNO-075** — Sens de variation d'une fonction, lien avec le signe de la dérivée
  - Une fonction monotone a une dérivée de signe constant (démontrable) ; la réciproque est admise. — _BO 1re techno p.9_ (BO)
  - ⚠ Voir l1t-2 (dérivée de degré 2 sans racine évidente). → décision l1t-2 : evidentes.
- **1TECHNO-076** — Tableau de variations — _hérite des bornes générales_
- **1TECHNO-132** — Extrémums — _hérite des bornes générales_
- **1TECHNO-077** — Interpréter géométriquement le nombre dérivé comme coefficient directeur de la tangente — _hérite des bornes générales_
- **1TECHNO-078** — Construire la tangente à une courbe en un point — _hérite des bornes générales_
- **1TECHNO-079** — Déterminer l'équation réduite de la tangente à une courbe en un point
  - f′(a) calculé pour un polynôme de degré ≤ 3, ou donné, ou lu graphiquement. — _BO 1re techno p.8_ (déduite)
  - ⚠ Lecture déduite : les seules fonctions que l'élève sait dériver en 1re techno sont les polynômes de degré ≤ 3 ; pour une autre courbe, le nombre dérivé ne peut être que donné ou lu.
- **1TECHNO-080** — Calculer la dérivée d'une fonction polynôme de degré inférieur ou égal à trois
  - Polynômes de degré ≤ 3 : dérivées de x², x³, somme et kf ; ni produit ni quotient. — _BO 1re techno p.8_ (BO)
- **1TECHNO-081** — Déterminer le sens de variation d'une fonction polynôme de degré inférieur ou égal à 3
  - Polynômes de degré ≤ 3 seulement. — _BO 1re techno p.8_ (BO)
  - ⚠ Voir l1t-2 (dérivée de degré 2 sans racine évidente). → décision l1t-2 : evidentes.
- **1TECHNO-133** — Déterminer les extrémums d'une fonction polynôme de degré inférieur ou égal à 3
  - Polynômes de degré ≤ 3 seulement. — _BO 1re techno p.8_ (BO)
  - ⚠ Voir l1t-2 (dérivée de degré 2 sans racine évidente). → décision l1t-2 : evidentes.

### Statistiques et probabilités > Séries statistiques à deux variables quantitatives

- **1TECHNO-082** — Nuage de points associé à une série statistique à deux variables quantitatives — _hérite des bornes générales_
- **1TECHNO-083** — Ajustement affine
  - Ajustements au jugé, droite de Mayer, moindres carrés ; aucune connaissance théorique attendue. — _BO 1re techno p.9_ (BO)
- **1TECHNO-084** — Point moyen — _hérite des bornes générales_
- **1TECHNO-085** — Représenter un nuage de points — _hérite des bornes générales_
- **1TECHNO-086** — Savoir calculer les coordonnées du point moyen — _hérite des bornes générales_
- **1TECHNO-087** — Déterminer un ajustement affine
  - Ajustements au jugé, droite de Mayer, moindres carrés (droite y = ax + b minimisant Σ(yᵢ − (axᵢ + b))²) ; aucune connaissance théorique attendue. — _BO 1re techno p.9_ (BO)
- **1TECHNO-088** — Interpoler ou extrapoler des valeurs inconnues à l'aide d'un ajustement affine
  - Esprit critique sur la pertinence de l'ajustement et les limites de l'extrapolation. — _BO 1re techno p.9_ (BO)

### Statistiques et probabilités > Probabilités conditionnelles : indépendance

- **1TECHNO-089** — Indépendance de deux évènements
  - Définition : pour P(A) ≠ 0, B est indépendant de A si P_A(B) = P(B) ; la symétrie est démontrée pour A et B de probabilités non nulles. — _BO 1re techno p.9-10_ (BO)
  - ⚠ Voir l1t-5 (critère produit). → décision l1t-5 : produit-admis.
- **1TECHNO-090** — Formule des probabilités totales — _hérite des bornes générales_
  - ⚠ Contradiction : le BO de 2de (p.13) dit que le calcul d'une probabilité connaissant ses probabilités conditionnelles relatives à une partition « n'est pas un attendu » ; le BO de 1re techno inscrit la formule (p.10) ; le BO de Tle techno dit qu'on l'« introduit » en Tle (p.9). Voir l1t-1. → décision l1t-1 : deux.
- **1TECHNO-091** — Savoir utiliser l'indépendance de deux évènements — _hérite des bornes générales_
  - ⚠ Voir l1t-5 (critère produit). → décision l1t-5 : produit-admis.
- **1TECHNO-134** — Savoir justifier l'indépendance de deux évènements — _hérite des bornes générales_
  - ⚠ Voir l1t-5 (critère produit). → décision l1t-5 : produit-admis.
- **1TECHNO-092** — Dans les cas simples, calculer une probabilité à l'aide de la formule des probabilités totales
  - Cas simples. — _BO 1re techno p.10_ (BO)
  - ⚠ Voir l1t-1 (partition en deux ?). → décision l1t-1 : deux.

### Statistiques et probabilités > Modèle associé à une expérience aléatoire à plusieurs épreuves indépendantes

- **1TECHNO-093** — Probabilité associée à la répétition d'épreuves aléatoires identiques et indépendantes de Bernoulli — _hérite des bornes générales_
- **1TECHNO-094** — Représenter par un arbre de probabilités la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$
  - n ⩽ 4 épreuves de Bernoulli identiques et indépendantes. — _BO 1re techno p.10_ (BO)
- **1TECHNO-135** — Calculer des probabilités associées à la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$
  - n ⩽ 4 épreuves, probabilités calculées sur l'arbre. — _BO 1re techno p.10_ (BO)
  - ⚠ Le BO a une seule puce : « Représenter par un arbre […] avec n ⩽ 4 afin de calculer des probabilités ».

### Statistiques et probabilités > Variables aléatoires

- **1TECHNO-095** — Variable aléatoire discrète : loi de probabilité
  - Sans formalisme : issues numériques, en contexte. — _BO 1re techno p.10_ (BO)
- **1TECHNO-096** — Variable aléatoire discrète : espérance — _hérite des bornes générales_
- **1TECHNO-097** — Loi de Bernoulli (0,1) de paramètre $p$
  - Loi de Bernoulli à valeurs 0 et 1, de paramètre p. — _BO 1re techno p.10_ (BO)
- **1TECHNO-136** — Loi de Bernoulli (0,1) de paramètre $p$ : espérance — _hérite des bornes générales_
- **1TECHNO-098** — Interpréter en situation les écritures $\{X = a\}$, $\{X \leqslant a\}$ où $X$ désigne une variable aléatoire
  - Écritures {X = a} et {X ⩽ a}. — _BO 1re techno p.10_ (BO)
  - ⚠ Voir l1t-6 ({X > a}, {X ⩾ a}). → décision l1t-6 : complement.
- **1TECHNO-137** — Calculer les probabilités $P(X = a)$, $P(X \leqslant a)$
  - P(X = a) et P(X ⩽ a). — _BO 1re techno p.10_ (BO)
  - ⚠ Voir l1t-6 ({X > a}, {X ⩾ a}). → décision l1t-6 : complement.
- **1TECHNO-099** — Calculer l'espérance d'une variable aléatoire discrète — _hérite des bornes générales_
- **1TECHNO-138** — Interpréter en contexte l'espérance d'une variable aléatoire discrète — _hérite des bornes générales_
- **1TECHNO-100** — Reconnaitre une situation aléatoire modélisée par une loi de Bernoulli — _hérite des bornes générales_
- **1TECHNO-101** — Simuler $N$ échantillons de taille $n$ d'une loi de Bernoulli et représenter les fréquences observées des 1 par un histogramme ou un nuage de points
  - N de l'ordre de plusieurs centaines. — _BO 1re techno p.10_ (BO)
- **1TECHNO-102** — Interpréter sur des exemples la distance à $p$ de la fréquence observée des 1 dans un échantillon de taille $n$ d'une loi de Bernoulli de paramètre $p$
  - Sans théorie de la décision ni test : situation fréquente ou rare dans le cadre du modèle. — _BO 1re techno p.10_ (BO)
- **1TECHNO-103** — Simuler des échantillons de taille $n$ d'une loi de Bernoulli à partir d'un générateur de nombres aléatoires entre 0 et 1
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
- **1TECHNO-104** — Représenter par un histogramme ou par un nuage de points les fréquences observées des 1 dans $N$ échantillons de taille $n$ d'une loi de Bernoulli
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
  - N de l'ordre de plusieurs centaines. — _BO 1re techno p.10_ (BO)
- **1TECHNO-105** — Compter le nombre de valeurs situées dans un intervalle de la forme $[p - ks\,;\,p + ks]$ pour $k \in \{1\,;2\,;3\}$
  - Langage Python ou tableur. — _BO 1re techno p.4_ (BO)
  - k ∈ {1 ; 2 ; 3} ; s = écart type de la série des fréquences observées. — _BO 1re techno p.10_ (BO)
  - ⚠ Dans l'extraction du BO (p.10), cette ligne suit les situations algorithmiques sans tiret ; elle en fait partie (mise en page).
