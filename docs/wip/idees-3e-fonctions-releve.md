# Relevé « généralités sur les fonctions » de Troisième (2026-11-24)

Chantier [`idees-3e-fonctions`](idees-3e-fonctions-progress.md). 19 exercices d'une autre
plateforme (codes 3F1, anciennes versions exclues), lus dans leur code source par deux agents ;
points décisifs relus dans le code (3F10, 3F10-4, 3F13, 3F13-2, 3F1QCM-3). Verdicts face à nos
modèles : § Verdicts ; fiches de phase 0 dans le journal.

## Notes de lecture brutes

### Lot A (3F1-act, 3F10 à 3F10-7)

- **3F1-act** — Activité « machines » retirée : n'affiche qu'un message de retrait. Rien à reprendre.
- **3F10** — Tableau de valeurs de 5 colonnes **mélangées**, six nombres distincts de [−20 ; 20] :
  a → b, c → d, e → d, d → a, f → c. Six questions : image de a, image de c, antécédent de a (un
  seul), antécédents de d (deux), « f(c) = … », « f(…) = c ». Tournures alternées : « image de » /
  « quel nombre a pour image ? », « antécédent » / « le ou les nombres qui ont … pour image ».
  Plusieurs antécédents dans un champ, séparés par « ; », ordre libre.
- **3F10-1** — QCM à plusieurs réponses : phrases de vocabulaire (« x a pour image y », « y a pour
  antécédent x »…), notations f(x) = y, f : x ↦ y, une droite avec un point marqué, ou
  f(x) = f(y) = m. x ∈ [−9 ; 9] sans 0, ±1 ; y ≠ x. Quatre propositions : deux vraies, deux qui
  inversent x et y.
- **3F10-2** (et 3F10-5, 3F10-6, qui en héritent) — Image (ou antécédent, linéaire et affine
  seulement) par une formule : mx, mx + n, x² ± mx + n, mx² + nx (+ y), quotients x/(x + m),
  mx/(x + m)… m ∈ [2 ; 6], n ∈ {2, 4, 5}, x positif, négatif ou relatif dans [−9 ; 9] selon le
  niveau, coefficients m/n possibles. Un champ ; fraction jugée par égalité de fraction.
- **3F10-3** — QCM de vocabulaire, quatre types : f(x) = y en phrase, phrase en égalité, point
  d'une droite tracée et son égalité, expression f(x) = ax, ax², ax + b. Nom de fonction tiré
  (f, g, h, u…).
- **3F10-4** — Courbe lissée sur quadrillage 0,2, 1 à 5 images à lire, **x à 0,1 près** (option
  entiers), tableau à compléter, tolérance 0,11.
- **3F10-7** — L'élève choisit des x, remplit le tableau et **trace la courbe** (ligne brisée) ;
  jugé par l'aire entre courbes. ax, ax + b, (p/q)x (+ b), ax², (x + a)(x + b), x de −5 à 5.

### Lot B (3F12 à 3F1QCM-3)

- **3F12** — Exercice retiré (message seul). Rien à reprendre.
- **3F12-2** — Image par f : x ↦ … : affine (4 signes), second degré (7 formes : ax² + bx + c,
  ax² + c, −ax² − bx + c…), quotients a/(cx + d), (ax + b)/(cx + d), produits (ax + b)(cx + d),
  (ax + b)². x = ±[1 ; 12] (produits : [−2 ; 2]), a, b, c ∈ [2 ; 11]. Fraction jugée par égalité.
- **3F12-3** — Compléter un tableau de 3 colonnes (x parmi [−3, 0, 3], [−2, 0, 2], [1, 2, 5],
  [−3, 6, 9]) : affine, second degré, quotient, produit. Fractions simplifiées attendues.
- **3F12-4** — Lire 2 ou 3 images sur une droite, une parabole ou une **cubique** tracée
  (quadrillage, x ∈ [−6 ; 8], images entières de [−6 ; 6]) ; un champ par image.
- **3F13** — Antécédents sur une courbe : droite (un antécédent), parabole avec **un seul
  antécédent** (le sommet, 1 fois sur 4) ou deux. Liste « ; » jugée comme suite de nombres.
- **3F13-1** — Courbe interpolée par 5 points : 2 images, antécédent unique, deux antécédents ;
  image lue entre deux points.
- **3F13-2** — « Résoudre f(x) = k » par lecture : droite (1 solution), parabole (2), **cubique
  (3)** ; échelle de l'axe des ordonnées adaptée. Corrigé : droite y = k tracée, points marqués.
- **3F14-1** — Modéliser par une fonction affine ou linéaire, 7 contextes à coefficients
  décimaux : salle de sport (deux formules), location au km, abonnés qui diminuent, carburant
  (linéaire), silo qui se vide, toupie qui ralentit, facture d'eau. Saisie de l'expression.
- **3F14DNB-1** — Sujet de brevet sans saisie : f(x) = x² + (a + b)x + ab, g(x) = −ax ; image,
  antécédents lus dans un **tableau de tableur à deux lignes** (f et g), formule de tableur,
  « un nombre a-t-il la même image par f et g ? », factorisation, produit nul.
- **3F1QCM-3** — f(x) = ax² + b (a, b = ±2 à ±5) : parmi « f(0) = b », « 0 est un antécédent de
  b », « b est l'image de 0 », « f(b) = 0 », « l'image de −b est b », lesquelles sont vraies.

### Ce que leur format fait et pas le nôtre

- **Tracer une courbe point par point** (ligne brisée jugée par l'aire, 3F10-7). Chez nous :
  placer les points (` ```courbe `, `placer:`) ; la ligne qui les relie n'est pas un geste.
- **Lecture à 0,1 près** sur un quadrillage fin avec un point mobile (3F10-4). Chez nous : lecture
  aux nœuds du quadrillage, pas de point mobile qui affiche ses coordonnées.
- **Corrigé tracé** de f(x) = k (droite y = k, points d'intersection, 3F13-2) : chez nous, la
  courbe du corrigé peut porter une seconde fonction et des points (` ```courbe ` du corrigé) —
  rien ne manque.

## Verdicts (2026-11-24)

Comparés aux modèles de prod (MCP, lecture seule, variations et variables lues) : 3e d820232a
« Image et antécédent » (3-040, 5 variations), 6ad254b4 « Formule, tableau de valeurs, courbe »
(3-039, 4), 7407f328 (3-046), 81dda1bd (3-064), 15ddcc75 et 7c07749c (3-066) ; 4e cb545bd7,
e678f1d0, 15dd2a0f ; 5e 87e396e4, 5e4f9ecf, 2b3be6d7 ; 2de cc88ebd3, 17809937, 42c19a19,
bcfbf5f8. Bornes : `cycle4.json`, 3-039 (« exemples de fonctions sans étude générale ») et 3-040
(« images et antécédents à partir d'un graphique ou d'un tableau ; image par une expression
littérale simple »).

| Id        | Nos modèles                                                                | Verdict                                                                                | Fiche |
| --------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| 3F1-act   | —                                                                          | retiré chez eux                                                                        | —     |
| 3F12      | —                                                                          | retiré chez eux                                                                        | —     |
| 3F10      | d820232a v1-v2 (tableau d'une fonction affine, x de −2 à 2, un antécédent) | 🟡 manque le tableau quelconque, deux antécédents, aucun antécédent, « f(…) = c »      | F1    |
| 3F10-1    | 42c19a19 (2de : point de la courbe, phrases vraies)                        | ❌ en 3e : traduire f(a) = b en phrases et inversement                                 | N1    |
| 3F10-3    | 42c19a19 (2de)                                                             | ❌ même manque                                                                         | N1    |
| 3F1QCM-3  | —                                                                          | ❌ vrai / faux sur f(x) = ax² + b                                                      | N1    |
| 3F10-2    | 81dda1bd, 15ddcc75 (images linéaire, affine) ; d820232a v5 (x² − b)        | 🟡 manque ax² + bx + c, produits, et l'antécédent par le calcul                        | N2    |
| 3F10-5    | 81dda1bd, 15ddcc75                                                         | 🟡 manque l'antécédent par une fonction linéaire ou affine                             | N2    |
| 3F10-6    | d820232a v5                                                                | 🟡 manque le second degré complet ; quotients : question Q1                            | N2    |
| 3F12-2    | idem                                                                       | 🟡 même manque                                                                         | N2    |
| 3F12-3    | 6ad254b4 v1-v2 (une seule case, affine ou x² + c)                          | 🟡 manque le tableau de trois cases, second degré et produits                          | F2    |
| 3F12-4    | d820232a v3, 6ad254b4 v3 (une image sur une parabole) ; cc88ebd3 (2de)     | 🟡 manque plusieurs images sur une même courbe, droite et cubique                      | F3    |
| 3F10-4    | idem                                                                       | 🟡 idem ; lecture à 0,1 près : non reprise (aux nœuds du quadrillage chez nous)        | F3    |
| 3F13      | d820232a v4 (deux antécédents sur une parabole) ; 17809937 (2de)           | 🟡 manque l'antécédent unique (sommet)                                                 | F4    |
| 3F13-1    | idem                                                                       | 🟡 idem                                                                                | F4    |
| 3F13-2    | idem                                                                       | 🟡 manque trois antécédents (cubique) et aucun                                         | F4    |
| 3F10-7    | 2b3be6d7 (5e : placer les points d'un tableau donné)                       | ❌ en 3e : calculer les images puis placer les points                                  | N3    |
| 3F14-1    | cb545bd7 (4-062 : taxi, rectangle, réservoir, cinéma)                      | 🟡 manque les coefficients décimaux et la grandeur qui diminue                         | F5    |
| 3F14DNB-1 | d820232a                                                                   | 🟡 seule idée neuve : tableau à deux lignes f et g, « même image » ; le reste ailleurs | F1    |
