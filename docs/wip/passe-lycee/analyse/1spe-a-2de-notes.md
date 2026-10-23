# Lot 1spe-a, programme de 2de : questions à trancher

Les 101 modèles du lot `1spe-a` ont été jugés contre le programme de seconde (`2`), en plus des jugements de
`1spe-a.csv` (passe lycée, étape d, 2026-10-23). Les deux questions ci-dessous ont la même forme : la **tâche** est
au programme de 2de, mais l'**énoncé** emploie un mot défini seulement en 1re. Chaque entrée se lit seule.

## Q1 — « Racines d'un polynôme du second degré » quand la tâche est un produit nul de 2de

**Modèles** :

- `18e26873` « Déterminer les racines d'un polynôme du second degré » (à l'aide de la forme factorisée) : « Détermine
  les racines de ce polynôme du second degré. P(x) = (4x − 7)(x − 6) » → 7/4 et 6 ; aussi −(x + 6)(x − 3) → −6 et 3.
- `1b1a6d7b` même titre (forme pas complètement factorisée) : (−5x − 25)(x + 2) → −5 et −2 ; x(−5x − 25) → 0 et −5 ;
  (12x + 21)(x + 1) → −7/4 et −1.
- `eae2ff6a` même titre (graphiquement) : « Détermine graphiquement les racines du polynôme représenté par cette
  parabole » → deux entiers de −4 à 4 lus sur l'axe des abscisses.

**Ce que disent les bornes** : en 2de, le point **2-267** « Équation de la forme A(x)B(x) = 0 (équation produit
nul) » (borne : A(x) et B(x) du premier degré) décrit exactement le calcul de `18e26873` et `1b1a6d7b` ; le point
**2-336** « Résoudre une équation du type f(x) = k, en choisissant une méthode adaptée : graphique, algébrique,
logicielle » décrit la lecture de `eae2ff6a` (k = 0). Mais les bornes générales de 2de excluent le « polynôme du
second degré général », et le mot « racine » (d'un polynôme) n'apparaît pas au BO de 2de : c'est le vocabulaire de
1re (1SPE-244, « racine »). Un élève de 2de saurait résoudre (4x − 7)(x − 6) = 0, mais pas forcément comprendre
« racines de ce polynôme ».

**Options** :

- **A** — Pas de point en 2de : l'énoncé repose sur un vocabulaire de 1re ; la tâche de 2de est déjà portée par les
  modèles de produit nul (« Résoudre (ax + b)(cx + d) = 0 »).
- **B** — On lit le sens de la tâche : `18e26873`, `1b1a6d7b` → **2-267**, `eae2ff6a` → **2-336**, et le mot
  « racine » passe pour un détail de vocabulaire.
- **C** — Comme A, et créer plus tard des modèles jumeaux de 2de (« Résous P(x) = 0 », « lis les solutions de
  f(x) = 0 ») si ces formes manquent.

**Reco** : **A** (inclusion stricte : un mot que l'élève de 2de n'a pas appris suffit à sortir la question des
bornes) ; C seulement si le repérage montre un manque de modèles de produit nul en 2de.

## Q2 — « Tangente » quand la tâche est la lecture d'une droite de 2de

**Modèle** : `ed8444bb` « Lire l'équation d'une tangente sur un graphique ». Énoncé : « La courbe C_f d'une fonction
f (trait plein) et sa tangente T au point A d'abscisse 4 (en pointillés) sont tracées ci-dessous. La tangente T a pour
équation y = mx + p. Lis son coefficient directeur m et son ordonnée à l'origine p. » → m = 1/2, p = −4 (m entier ou
demi-entier de −3 à 3, p entier de −4 à 4).

**Ce que disent les bornes** : lire m et p sur une droite tracée est de la 2de : **2-315** « Déterminer la pente d'une
droite donnée par une représentation graphique », et l'ordonnée à l'origine (**2-474** « Pour une fonction affine
donnée par f(x) = mx + p, interprétation de p comme ordonnée à l'origine »). Mais la droite est présentée comme « la
tangente à C_f au point A » : la tangente à une courbe est une notion de 1re (1SPE-261, lien avec le nombre dérivé),
absente du BO de 2de (le mot « tangente » n'y désigne que la ligne trigonométrique du triangle rectangle). Le modèle
demande aussi deux choses (m et p), qui relèvent de deux points de 2de.

**Options** :

- **A** — Pas de point en 2de : l'objet de la question (la tangente) est de 1re ; les modèles de 2de « Déterminer le
  coefficient directeur graphiquement » (déjà tagués 2-347) portent la lecture.
- **B** — **2-315** : on lit la droite tracée, le mot « tangente » ne sert pas au calcul ; la lecture de p est un
  complément.
- **C** — **TAG_PAR_VARIATION** impossible ici (une seule variation demande m et p ensemble) : si l'on veut un point
  de 2de, scinder les deux cases.

**Reco** : **A**, pour la même raison que Q1 (vocabulaire de 1re dans l'énoncé, tâche déjà couverte en 2de).
