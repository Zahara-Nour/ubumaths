# Lot 1spe-a : questions à trancher

Analyse des 101 modèles de 1re spécialité du lot `1spe-a` (passe lycée, étape d, 2026-10-23). Chaque entrée se lit
seule : modèle, exemple tiré du relevé, options, recommandation.

## E1 — La construction en escalier est-elle au programme de 1re spé ?

**Modèles** :

- `146a7c79` « Comportement d'une suite sur l'escalier » : la courbe de f, la droite y = x et l'escalier qui part de
  u₀ sont tracés pour u(n+1) = 0,5u(n) + 3 (u₀ = 1) ; l'élève choisit « (uₙ) semble croissante et converger ». Les cinq
  variations donnent les cinq réponses (croissante et converge, décroissante et converge, tend vers +∞, tend vers −∞,
  ni croissante ni décroissante pour u(n+1) = −0,5u(n) + b).
- `baefb288` « Lire un terme sur l'escalier » : même figure, l'élève lit u₁ ou u₂ sur l'axe des abscisses (réponses
  entières de 0 à 10).

**Ce que disent les bornes** : le BO 1re spé demande d'« utiliser le registre de la langue naturelle, le registre
algébrique, le registre graphique, et passer de l'un à l'autre » (point **1SPE-221** « Passer d'un registre à l'autre
pour une suite : de l'expression algébrique à la représentation graphique (nuage de points) et inversement ») et de
« conjecturer, dans des cas simples, la limite éventuelle d'une suite » (point **1SPE-231**, borne : « calculs
numériques, algorithme de seuil »). Le mode u(n+1) = f(u(n)) est au programme (1SPE-368). Mais l'escalier n'est écrit
nulle part, et le libellé de 1SPE-221 dit « nuage de points » (libellé laissé par David le 2026-10-23).

**Options** :

- **A** — L'escalier est une forme du registre graphique d'une suite récurrente : `baefb288` → **1SPE-221**,
  `146a7c79` → **1SPE-231** (conjecturer la limite éventuelle ; le sens de variation vient avec).
- **B** — L'escalier n'est pas au programme de 1re (le registre graphique d'une suite, c'est le nuage de points) : les
  deux modèles restent sans point en 1re ; aucun point de terminale ne le porte non plus.
- **C** — Comme A pour `baefb288`, mais `146a7c79` porte deux savoirs (sens de variation 1SPE-219 et limite
  1SPE-231) : le rattacher à 1SPE-231 seulement en acceptant la couverture partielle.

**Recommandation** : A. Le registre graphique n'est pas restreint par le BO, la récurrence u(n+1) = f(u(n)) est au
programme, et les fonctions tracées sont affines à coefficients simples (0,5, 2, −0,5).

## E2 — `99c772c0` en terminale : cos x = cos α avec α non remarquable, cos x = k avec |k| > 1

**Modèle** : `99c772c0` « Équations trigonométriques : aucune solution, cos x = cos α, sin x = sin α » (classé 1re spé,
hors programme en 1re : pas d'équation trigonométrique). Examiné contre la terminale spé, point **TSPE-457**
« Résoudre une équation du type cos(x) = a ».

**Exemples du relevé** :

- V1-V2 : « Résous dans ]−π ; π] l'équation cos x = 5 » → ∅ ; « Résous dans [0 ; 2π[ l'équation sin x = 3/2 » → ∅.
- V3-V4 : « Résous dans ]−π ; π] l'équation cos x = cos(8π/9) » → {−8π/9 ; 8π/9} (n ∈ {5, 7, 8, 9, 10, 12}).
- V5 : « Résous dans [0 ; 2π[ l'équation sin x = sin(3π/7) » → {3π/7 ; 4π/7}.

**Ce que disent les bornes** : décision lts-3 (2026-10-23) : « a parmi les valeurs remarquables, solutions exactes ».
cos(8π/9) n'est pas une valeur remarquable ; 5 et 3/2 non plus, mais l'équation n'a alors aucune solution à écrire.

**Options** :

- **A** — Lire lts-3 comme une borne sur les solutions à calculer : cos x = cos α se résout sans connaître la valeur de
  cos α, et |a| > 1 donne ∅ sans calcul → **TAG TSPE-457** pour tout le modèle.
- **B** — Lecture stricte de lts-3 pour cos x = cos α, mais |a| > 1 admis (rien à calculer) → **MODIFIER** : retirer
  V3, V4, V5 ; V1-V2 seules → TSPE-457.
- **C** — Lecture stricte complète : a doit être une valeur remarquable → retirer V1 à V5, le modèle n'a plus de
  point.

**Recommandation** : B. La décision lts-3 a été prise pour fixer les valeurs de a ; cos x = cos(8π/9) en sort à la
lettre. Le cas |a| > 1 ne demande aucune valeur et reste dans le sens de la borne.

## E3 — « Arithmétique, géométrique ou ni l'un ni l'autre ? » : quel point en 1re spé ?

**Modèles** (tous en QCM à trois réponses : arithmétique, géométrique, ni l'un ni l'autre) :

- `61e2ac1f` « … à partir de ses premiers termes » : « −5 ; −15 ; −45 ; −135 ; −405 » → géométrique ;
  « 9 ; 10 ; 13 ; 18 ; 25 » → ni l'un ni l'autre.
- `d2943133` « … à partir de sa forme explicite » : uₙ = 9 − 5n → arithmétique ; uₙ = −9 × 4ⁿ → géométrique ;
  uₙ = 3ⁿ + 9 → ni l'un ni l'autre.
- `f63408c5` « … à partir de sa relation de récurrence » : uₙ₊₁ = −2uₙ → géométrique ; uₙ₊₁ = 4uₙ + 9 → ni l'un ni
  l'autre.
- `d2067413` « … sur un nuage de points » : points de u₀ à u₈ de b + rn, a·2ⁿ, a·0,5ⁿ, (n − c)² + d.

**Ce que disent les bornes** : tag actuel **1SPE-213** « Suites arithmétiques : exemples, définition » (borne :
uₙ₊₁ = uₙ + r) pour les trois premiers, **1SPE-214** « Suites arithmétiques : lien avec l'étude d'évolutions
successives à accroissements constants » pour le nuage. La réponse « géométrique » relève de **1SPE-216** « Suites
géométriques : exemples, définition » (uₙ₊₁ = q·uₙ), et chaque question, quelle que soit sa réponse, mobilise les deux
définitions. Aucun point de 1re spé ne décrit « reconnaître la nature d'une suite » (en 1re techno, si :
**1TECHNO-045** « Conjecturer, à partir de sa représentation graphique, la nature arithmétique ou géométrique d'une
suite », retenu pour `d2067413`).

**Options** :

- **A** — Tolérer le jumelage des deux définitions : 1SPE-213 pour `61e2ac1f`, `d2943133`, `f63408c5` (le point
  arithmétique, premier des deux) ; **1SPE-221** « Passer d'un registre à l'autre pour une suite » pour `d2067413`
  (registre graphique → nature de la suite).
- **B** — Inclusion stricte : aucun point de 1re spé ; les quatre modèles restent sur leur nœud, sans point en 1re
  (`d2067413` garde 1TECHNO-045).
- **C** — Scinder chaque modèle en deux (arithmétique ou non → 1SPE-213 ; géométrique ou non → 1SPE-216) : la
  réponse « ni l'un ni l'autre » reste possible dans chaque moitié.

**Recommandation** : C si David veut garder ces modèles dans le parcours de 1re spé (chaque moitié reste dans un
seul point) ; sinon B. A contredit l'inclusion stricte : une question à réponse « géométrique » n'est pas dans
1SPE-213. Le 1SPE-214 actuel de `d2067413` est à retirer dans tous les cas (le nuage ne parle pas d'évolutions à
accroissements constants).

Ajout à E3 : `c90fa022` « Intérêts simples ou composés : nature de la suite » pose la même question en contexte
(intérêts simples → arithmétique, composés → géométrique, taux puis frais fixes → ni l'un ni l'autre). En 1re spé,
deux points en jeu dans chaque question : **1SPE-230** « Modéliser un phénomène discret à croissance linéaire par une
suite arithmétique » et **1SPE-379** « … à croissance exponentielle par une suite géométrique ». Les mêmes options
valent (A : 1SPE-230 par convention ; B : sans point ; C : scinder). En 1re techno, **1TECHNO-042** « Reconnaître si
une situation relève d'un modèle discret de variation linéaire ou exponentielle » le porte en entier.

## E4 — Récurrence qui dépend aussi de n (uₙ₊₁ = uₙ + 2n + c) : dans 1SPE-377 ?

**Modèles** :

- `0495289a` « Calculer un terme » : « u₀ = 6 et uₙ₊₁ = uₙ + 5n + 5, calcule u₃ » → 36 ; « u₀ = 4 et
  uₙ₊₁ = 3uₙ + 3n » → 123. Toutes les variations ont une récurrence qui dépend de n.
- `1239554b` « Calculer un terme » : V1 « u₀ = 5 et uₙ₊₁ = 3uₙ + 2, calcule u₂ » (forme f(uₙ)) ; V2
  « uₙ₊₁ = uₙ + 2n + 5 » et V3 « uₙ₊₁ = 2uₙ − n » (dépendent de n).

Les deux portent aujourd'hui 1SPE-223 « Calculer des termes d'une suite définie explicitement » : faux, ce sont des
récurrences.

**Ce que disent les bornes** : point **1SPE-377** « Calculer des termes d'une suite définie par récurrence », borne
« Termes d'une suite définie par une récurrence uₙ₊₁ = f(uₙ) » (force déduite : « le seul mode de récurrence écrit au
BO est uₙ₊₁ = f(uₙ) », remarque écrite pour exclure la récurrence d'ordre 2). Le BO écrit en contenu « par une relation
de récurrence uₙ₊₁ = f(uₙ) » et en capacité « Calculer des termes d'une suite définie explicitement, par récurrence ou
par un algorithme », sans forme.

**Options** :

- **A** — La capacité ne restreint pas la forme : uₙ₊₁ = f(n, uₙ) est une récurrence d'ordre 1 comme une autre →
  **TAG 1SPE-377** pour les deux modèles.
- **B** — Lecture stricte de la borne uₙ₊₁ = f(uₙ) : `1239554b` → **MODIFIER** (retirer V2, V3 ; V1 → 1SPE-377) ;
  `0495289a` sans point en 1re spé.

**Recommandation** : A. La remarque de la borne vise l'ordre 2 (Fibonacci), pas la présence de n ; la capacité « par
récurrence » est générale, et l'élève calcule pas à pas sans aucune connaissance nouvelle. En 1re techno, les deux
modèles reçoivent 1TECHNO-118 (aucune restriction de forme).

## E5 — Seuil d'une suite arithmétique « par le calcul » : quel point en 1re spé ?

**Modèle** : `eb9517ed` « Seuil d'une suite arithmétique par le calcul » : « (uₙ) est la suite arithmétique de
premier terme u₀ = 6 et de raison r = 9. Détermine le plus petit entier n tel que uₙ > 498 » → 55 (rangs de 9 à 192,
raisons de ±3 à ±9). L'élève écrit 6 + 9n > 498 et résout l'inéquation.

**Ce que disent les bornes** : le tag actuel **1SPE-237** « Calcul de seuil » est rangé dans les « Exemples
d'algorithme » du BO (approfondissement possible) ; sa borne : « Algorithme de seuil : premier rang à partir duquel uₙ
dépasse (ou passe sous) une valeur ; pas de résolution algébrique de qⁿ > A (logarithme : terminale) ». Aucun autre
point de 1re spé ne nomme le seuil. En enseignement scientifique, **1GEN-021** « Résoudre un problème de seuil dans
le cas d'une croissance linéaire » le porte exactement (retenu).

**Options** :

- **A** — 1SPE-237 : le grain de la borne est « premier rang à partir duquel uₙ dépasse une valeur », et la seule
  exclusion écrite vise le logarithme ; le calcul pour une suite arithmétique y reste.
- **B** — **1SPE-224** « Pour une suite arithmétique, calculer le terme général » : l'élève écrit le terme général
  puis résout une inéquation de 2de.
- **C** — Pas de point en 1re spé (le seuil par le calcul n'est pas un contenu de 1re).

**Recommandation** : A. Le point 1SPE-237 décrit le résultat cherché (le rang de seuil), sa borne n'exclut que la
résolution par logarithme ; B tague un savoir dont la question ne demande pas le résultat.

## E6 — Somme et produit des racines dans la même question

**Modèle** : `0dee4515` « Somme et produit des racines » : « Le polynôme P(x) = 2x² + 9x + 9 a deux racines x₁ et
x₂. Sans les calculer, détermine leur somme et leur produit » → x₁ + x₂ = −9/2 et x₁ × x₂ = 9/2 (a de −5 à 5, b et c
de −9 à 9, Δ > 0).

**Ce que disent les bornes** : le BO écrit en une phrase « Racines, signe, expression de la somme et du produit des
racines », mais l'arbre en fait deux points : **1SPE-245** « Expression de la somme des racines » (x₁ + x₂ = −b/a) et
**1SPE-383** « Expression du produit des racines » (x₁x₂ = c/a). Chaque question demande les deux.

**Options** :

- **A** — 1SPE-245 (tag actuel), en acceptant que la case « produit » déborde sur le point jumeau.
- **B** — Scinder le modèle en deux cases séparées en deux variations ou deux modèles (somme → 1SPE-245, produit →
  1SPE-383).
- **C** — Pas de point (inclusion stricte), le modèle reste sur son nœud.

**Recommandation** : B. Les deux expressions sont deux points de l'arbre ; une question qui les demande ensemble sort
de chacun. Si David préfère garder le modèle tel quel, A est le moindre mal (même contenu BO, même phrase).

## E7 — Axe de symétrie d'une parabole donnée sous forme développée ou factorisée

**Modèle** : `9f00da01` « Déterminer l'équation de l'axe de symétrie de la parabole » (tag actuel 1SPE-247, sommet).

- V1 : f(x) = 5 + (x − 5)² → x = 5 (forme canonique).
- V2 : f(x) = x² + 6x + 6 → x = −3 ; a de 1 à 3, b de −6 à 6, donc aussi x = −5/6, −1/3 (forme développée).
- V3 : f(x) = −2(x + 5)(x + 6) → x = −11/2 (forme factorisée, milieu des racines).

**Ce que disent les bornes** : **1SPE-384** « Axe de symétrie d'une parabole », borne déduite « Axe de symétrie x = α,
lu sur la forme canonique » ; la formule x = −b/(2a) n'est pas écrite au BO (libellé absent du BO, laissé par David).
**1SPE-247** « Calcul des coordonnées du sommet d'une parabole » admet le sommet « lu sur la forme canonique, ou obtenu
par l'extrémum en lien avec la dérivation » : V2 et V3 s'y prêtent (f′(x) = 0). Décision l1s-2 : forme canonique
seulement si b/(2a) est entier ou demi-entier.

**Options** :

- **A** — 1SPE-247 (tag actuel) : l'axe est la droite x = abscisse du sommet, et la borne de 1SPE-247 admet toutes
  les voies (canonique, dérivation).
- **B** — 1SPE-384 en **MODIFIER** : garder V1 ; V2 restreinte à b/(2a) entier ou demi-entier (forme canonique en cas
  simple) ; retirer V3 (ou lire la symétrie des racines comme hors borne).
- **C** — 1SPE-384 tel quel, en lisant la borne déduite « lu sur la forme canonique » comme un exemple et non une
  limite.

**Recommandation** : B. La question porte sur l'axe (1SPE-384), pas sur le sommet ; la borne déduite de 1SPE-384 et
la décision l1s-2 fixent la voie (forme canonique en cas simple). A tague un point voisin.
