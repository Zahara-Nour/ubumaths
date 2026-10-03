# Ce que `areEquivalent` veut dire

> Écrit le 2026-09-20, après une journée où la même question s'est reposée
> quatre fois de suite sous quatre déguisements différents.

## La règle, en une phrase

**Deux expressions sont équivalentes quand elles prennent la même valeur en
tout point où elles sont TOUTES DEUX définies.**

Le domaine n'entre pas dans la comparaison. Ce qui se passe là où l'une des deux
n'existe pas ne compte pas.

## Ce que ça tranche, sans avoir à en rediscuter

| paire                 | verdict  | pourquoi                                                  |
| --------------------- | -------- | --------------------------------------------------------- |
| `(x²−y²)/(x−y) ≡ x+y` | **vrai** | égales partout sauf en `x = y`, où la gauche n'existe pas |
| `(x+y)²/(x+y) ≡ x+y`  | **vrai** | idem en `x = −y`                                          |
| `√x·√x ≡ x`           | **vrai** | écrire `√x` impose `x ≥ 0` ; égales sur ce domaine        |
| `√(x²) ≡ x`           | **faux** | `√(x²)` existe pour `x < 0` et y vaut `−x`                |
| `√(x²) ≡ \|x\|`       | **vrai** | mêmes valeurs partout                                     |
| `x/x ≡ 1`             | **vrai** | égales sauf en 0, où la gauche n'existe pas               |

La ligne 4 est la seule qui rende `faux`, et c'est la seule où les deux membres
**existent** au même endroit en y prenant des valeurs différentes.

## Pourquoi cette convention et pas l'autre

C'est celle de l'algèbre des fractions rationnelles, et c'est celle qu'attend un
élève de lycée. Quand on lui demande de simplifier `(x²−y²)/(x−y)` et qu'il
écrit `x+y`, il a fait ce qu'on lui a enseigné. Le compter faux au motif que les
domaines diffèrent serait défendable mathématiquement et absurde
pédagogiquement.

Décision de David, prise le 2026-09-20 sur les quotients multivariés, et
étendue aux racines le même jour.

## Ce que la convention NE dit pas

Elle ne dit pas que le moteur sait toujours conclure. Il a des **faux
négatifs** : des égalités vraies qu'il ne prouve pas, faute d'une règle ou d'un
budget. Un faux négatif est un refus, jamais une erreur de correction dans le
sens dangereux.

Elle ne dit pas non plus que le moteur peut se permettre un **faux positif**.
Déclarer équivalentes deux expressions qui ne le sont pas compte JUSTE une
réponse FAUSSE d'élève. C'est la seule faute qui ne se rattrape pas.

⚠️ **Toutes les réductions du moteur ne vérifient PAS leur résultat.** Celles qui
calculent un facteur, comme la division exacte et le pgcd multivarié, le font :
elles recalculent le produit avant d'accepter. Celles qui appliquent une
identité, comme `√a·√a → a`, reposent sur la justesse de leur condition — et
cette condition-là a déjà été trop large une fois, en s'appliquant aux racines
n-ièmes. **Ne pas lire cette section comme une garantie.**

## Conséquence pratique quand on ajoute une règle

Avant d'écrire une réduction, se poser la question dans cet ordre :

1. **La règle peut-elle produire un faux positif ?** Si elle calcule un facteur,
   elle doit vérifier son résultat en recalculant le produit. Si elle applique
   une identité, il faut prouver que sa condition d'application est exactement
   celle de l'identité — pas « à peu près ». `√a·√a → a` a été livrée avec une
   condition qui attrapait aussi `∛a·∛a`, où l'identité est fausse.
2. **Élargit-elle le domaine ?** Si oui, c'est permis par la convention, et ça
   n'a pas à être rediscuté.
3. **Le restreint-elle ?** Alors la règle est probablement fausse : la
   convention compare sur l'intersection, pas sur le plus petit domaine.

## Ce que le moteur ne sait pas faire, et qui n'est pas un bug

Le décideur ne porte **aucune information de domaine**. Il ne sait pas que
`x ≥ 0` dans `√x·√x`, il le sait seulement parce que la règle qui fusionne les
radicaux en tient compte au moment où elle s'applique. Un mécanisme général de
contraintes sur les variables existe (`numtype/VariableAssumption`,
`domain/computeDomain`), mais il n'est branché ni sur `normalize` ni sur
`areEquivalent`.

Le brancher rendrait le décideur **plus strict**, alors que cette convention le
veut **large**. Les deux tirent en sens inverse. Ce n'est pas un chantier à
ouvrir sans avoir d'abord un besoin pédagogique concret, par exemple un exercice
qui porte explicitement sur les domaines — auquel cas le bon outil serait une
option par question, pas un changement du décideur.

## Conséquence connue et assumée

`√x·√x ≡ |x|` rend **faux**, alors que les deux sont égaux sur `[0, +∞)`, le
seul domaine où le membre de gauche existe. Le décideur compare `x` à `|x|` et
les sépare, faute de porter le domaine. Faux négatif, assumé : `√x·√x ≡ x` est
ce qu'un élève écrit, `√x·√x ≡ |x|` est exotique.

## Virgule nue : décimale ou séparateur (#520)

MathLive n'a pas de `decimalSeparator` réglé : une virgule tapée au clavier physique arrive **nue**
(`1,5`), pas `1{,}5`. La règle (`src/lib/mathAST/decimal-comma.ts`) :

- **Contexte nombre** (case à précision, `rulesSuffice`, grandeur, évaluation numérique) : toute
  virgule nue entre deux chiffres est décimale.
- **`areEquivalent(élève, attendu)`** : c'est la **réponse attendue** qui décide. Si elle porte une
  virgule séparatrice — couple ou intervalle de deux nombres `(3,14)` `[3,14]` `]3,14[`, liste
  `1,2,3`, ensemble `\{1,2\}`, `f(x,y)`, `3, 4` — aucune virgule n'est convertie, ni d'un côté ni de
  l'autre. Sinon, toute virgule nue entre deux chiffres est décimale des deux côtés.
- Une écriture qui contient `;` a toujours ses virgules entre chiffres décimales (convention
  française : `A(1,5;2)`, `[1,5;2]`).

⚠️ **Pour un auteur** : dans une réponse attendue, `(3,5)` veut dire **le couple (3 ; 5)**, pas
3,5 entre parenthèses. Écrire un décimal avec `{,}` ou un point (`3{,}5`, `3.5`), jamais une
virgule nue entre délimiteurs. Aucun des 640 modèles n'était concerné au 2026-09-29.

## Exposants littéraux (#521)

La forme normale ne porte que des exposants **rationnels** (`SymbolicFactor.exponent: Rational`).
Plutôt que de la changer (800-1 200 lignes, écarté le 2026-09-29), trois règles sur le chemin de
`equivalenceForm` seul — rien ne change à l'affichage :

- **Base numérique strictement positive** (`rules/general-power.ts`) : `a^u → exp(u·ln a)` quand
  `u` n'est pas rationnel. `2^{2x}/2^x ≡ 2^x`, `4^x ≡ 2^{2x}`, `2^x·3^x ≡ 6^x`, `3·2^n ≡ 6·2^{n-1}`.
- **Base numérique négative** (`mergeNegativeBasePowers`) : `a^{u+k} = a^u·a^k` (k entier) et
  `(a^u)^p(a^v)^q = a^{pu+qv}` (p, q entiers), vrais partout où les deux membres existent.
  `5(-2)^n ≡ -10(-2)^{n-1}`. `(-2)^{2n} ≢ 4^n` (en n = ½ : −2 contre 2).
- **Base variable** : **aucune règle** sans hypothèse — `x^a·x^b ≢ x^{a+b}`, `(x^2)^n ≢ x^{2n}`
  (supposer x > 0 d'office donnerait un faux positif en x = −1, n = ½). Tranché par l'ADR 0012 :
  reconnu quand le modèle déclare l'**hypothèse de l'énoncé** x > 0 (section suivante).

Faux négatifs connus : `(-2)^n/(-2)^m ≢ (-2)^{n-m}`, `(-2)^n(-3)^n ≢ 6^n`, `(-8)^{x/3} ≢ (-2)^x`,
`(√2)^x ≢ 2^{x/2}`, `(2^x+4^x)/2^x ≢ 1+2^x`, `0^x ≢ 0`. Revue adverse : 7 729 paires, 0 faux positif.

## Hypothèses de l'énoncé (ADR 0012)

`areEquivalent(a, b, { assumptions: { x: 'positive', n: 'integer' } })` compare sur l'intersection
des domaines ∩ le domaine **déclaré**. Vocabulaire : `positive` (x > 0), `nonnegative` (x ≥ 0),
`nonzero`, `integer`, `natural` (`src/lib/mathAST/assumptions.ts`, traduit en `TypeContext` de
`numtype`). Sans hypothèse, ou `{}` : rien ne change (verdicts de la revue #521 identiques à l'octet).

| hypothèse   | devient juste                                                                                             | reste faux                                         |
| ----------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| x > 0       | `x^a·x^b ≡ x^{a+b}`, `x^{a+2} ≡ x²·x^a`, `(x^a)^b ≡ x^{ab}`, `2^x·x^x ≡ (2x)^x`, `√(x²) ≡ x`, `\|x\| ≡ x` | `x^a ≡ x^b`, `(−x)^a(−x)^b ≡ (−x)^{a+b}`, `−x ≡ x` |
| x ≥ 0       | `√(x²) ≡ x`, `\|x\| ≡ x`                                                                                  | `x^a·x^b ≡ x^{a+b}` (0^a)                          |
| n entier, ℕ | `(−2)^{2n} ≡ 4^n`, `(−1)^{2n} ≡ 1`, `(−1)^n(−1)^n ≡ 1`, `((−2)^n)² ≡ 4^n`                                 | `2^n ≡ 3^n`, `(−2)^n ≡ 2^n`, `(−2)^{3n} ≡ 8^n`     |

Trois règles, sur le chemin de `equivalenceForm` seul, chacune gardée par un prédicat de `numtype`
ET par la présence d'une variable déclarée dans l'expression (une hypothèse sur `y` ne change rien
ailleurs) : base déclarée strictement positive → `exp(u·ln base)` (`rules/general-power.ts`) ;
`|u| → u` pour `u ≥ 0` déclaré (`normalize.ts`, cas `abs`) ; `a^{2k} → |a|^{2k}` pour une base
négative et un exposant entier pair en variables déclarées entières (`foldEvenIntegerPower`).
Revue adverse, tirages dans le domaine déclaré seul : 11 533 paires, 0 faux positif (2026-09-29).

## Logarithmes de base quelconque

**`\log` sans base est décimal** (convention du dépôt : `normalize`, l'évaluateur, la dérivation).
Sur le chemin de `equivalenceForm` seul, `\log_{b}(a)` devient `\ln(a)/\ln(b)` et `\log(a)` devient
`\ln(a)/\ln(10)` (`normal/rules/log-base.ts`) — même domaine des deux côtés (a > 0, b > 0, b ≠ 1),
rien ne change à l'affichage. Deviennent justes : `\log_{x}(2) ≡ \frac{\ln 2}{\ln x}`,
`\log_{4}(x) ≡ \frac{1}{2}\log_{2}(x)`, `\log_{10}(x) ≡ \log x`, `\log_{e}(x) ≡ \ln x`,
`\log_{1/2}(8) ≡ −3`, `\log^{2}_{2}(x) ≡ (\log_{2}x)^{2}` (exposant conservé, réciproque `^{-1}` exclue),
`\log_{x}(x^{a}) ≡ a` (`log_b(b^u) → u` avant le quotient). `\log_{x}(x) ≡ 1` est vrai par la convention (comme `x/x ≡ 1`).

Faux positif corrigé : `|\log_{x}(2)| ≡ \log_{x}(2)` rendait vrai, l'évaluateur lisant `\log_{x}(2)`
comme `\log 2` (base ignorée, donc « positif »). Le signe de `\log_{b}(a)` n'est connu que si `b`
l'est : `b > 1` garde le signe de `\log a`, `0 < b < 1` l'inverse, base variable → inconnu. Un log à
base reste hors de la liste blanche des hypothèses (`isPlainAlgebra`).

Revue adverse (2026-09-29) : 38 422 paires (bases 2, 3, 4, 9, 10, ½, ¼, 0.5, e, x, y, x+1, x² ;
valeurs absolues, carrés, quotients, inverses `1/\log_{a}(b)`, bases inversées), chaque verdict
« équivalent » évalué en 121 points réels : **0 faux positif** (contre 137 sur `main`, tous des
`|\log_{b}(a)|` à base < 1 ou variable). Écarts avec `main` : 137 vrai → faux (exactement ces 137
faux positifs), 3 680 faux → vrai (tous vérifiés numériquement). Échantillon sans base (4 000 paires) :
0 écart. Seconde passe après la revue de #524 (exposants, `log_b(b^u)`) : 70 194 paires, 0 faux
positif ; 177 vrai → faux (exactement les 177 faux positifs de `main`), 4 051 faux → vrai.

## Réponse « équation » : même ensemble de points (case `answerKind: "equation"`)

`areEquivalent` compare deux équations comme deux relations : `2x-y+1=0` et `y=2x+1` ne sont pas
« la même chose » pour lui. Une case marquée `answerKind: "equation"` (géométrie repérée,
spécification de David du 2026-10-03) ne passe PAS par `areEquivalent` :
`questions/equations/equation-answer.ts` réduit P = (gauche − droite) avec `normalize` (exact :
rationnels et radicaux, aucun flottant) et exige un polynôme non constant en x et y. Réponse et
attendue sont justes si P_rép = k·P_att, k constante non nulle (produits en croix exacts) :

| Attendue            | Réponse                                           | Verdict                  |
| ------------------- | ------------------------------------------------- | ------------------------ |
| `2x-y+1=0`          | `y=2x+1`, `4x-2y+2=0`, `x-\frac12y+\frac12=0`     | juste (droite : tout k)  |
| `x=4`               | `x-4=0`, `2x=8`                                   | juste                    |
| `(x-1)^2+(y+2)^2=9` | `x^2+y^2-2x+4y-4=0`, `…=3^2`, `9=(x-1)^2+(y+2)^2` | juste (coefficient ±1)   |
| `2x^2+2y^2=8`       | `x^2+y^2=4`                                       | juste (attendue ramenée) |
| `(x-1)^2+(y+2)^2=9` | `2x^2+2y^2-4x+8y-8=0`, `-2x^2-2y^2…=0`            | ½ : \|k\| = 2 (degré 2)  |
| `2x-y+1=0`          | `2x-y+1`, `x<3`, `x=\sqrt{y}`, `a+b=0`            | faux, sans exception     |

Formes exigeables (`requiredForm`) : `reduite`, `cartesienne`, `centre-rayon`, jugées sur
l'écriture APRÈS la valeur (mauvaise forme seulement si l'équation est juste). Sans `answerKind`,
rien ne change : une équation reste comparée par `areEquivalent`.

Degré ≥ 2 (décision du 2026-10-03) : l'équation est ramenée au coefficient 1 d'un terme de
référence avant de mesurer k : x², sinon y², sinon le premier terme de plus haut degré dans
l'ordre canonique de mathAST (`xy` pour `xy=1`). La réponse est juste si ce coefficient vaut ±1
(signe libre : membres échangés, tout changé de signe), ½ sinon. L'écriture de l'attendue
(`2x^2+2y^2=8`) n'est donc jamais imposée à l'élève.

## Réponse « vecteur » : coordonnées exactes, ou colinéaire (case `answerKind: "vecteur"`)

`areEquivalent` ne lit pas un couple `(2;-3)`. Une case marquée `answerKind: "vecteur"`
(spécification de David du 2026-10-03) est jugée par `questions/vectors/vector-answer.ts` :

- écritures lues, dans UNE case : `(a;b)`, `\left(a;b\right)`, `(a\,;\,b)`, colonne
  `\begin{pmatrix}a\\b\end{pmatrix}` (le `\\ ` de MathLive compris), dimension 2 ou 3 ; un
  préfixe `\vec{u}=` / `\overrightarrow{AB}=` est ignoré ;
- coordonnées constantes (fractions, racines, π, virgule décimale `0,5`) réduites par `normalize`
  et comparées EXACTEMENT, aucun flottant : `\frac{2}{\sqrt2}` = `\sqrt2`, `1,414` ≠ `\sqrt2` ;
- seule la VALEUR est jugée : `(\frac{2}{4};1)` est juste pour `(\frac12;1)`, sans ½ ni contrainte
  d'écriture.

| `vectorMode`     | Attendue  | Réponse                                                  | Verdict                 |
| ---------------- | --------- | -------------------------------------------------------- | ----------------------- |
| `exact` (défaut) | `(2;-3)`  | `(2;-3)`, `\begin{pmatrix}2\\-3\end{pmatrix}`            | juste                   |
| `exact`          | `(2;-3)`  | `(-2;3)`, `(4;-6)`                                       | faux                    |
| `colineaire`     | `(2;-3)`  | `(-2;3)`, `(4;-6)`, `(1;-\frac32)`, `(2\sqrt2;-3\sqrt2)` | juste (tout k ≠ 0)      |
| `colineaire`     | `(2;-3)`  | `(0;0)`                                                  | faux, « vecteur nul »   |
| les deux         | `(1;2;3)` | `(1;2)`                                                  | faux, « 3 coordonnées » |
| les deux         | `(2;-3)`  | `(2,3)`, `(x;1)`, `)(`, matrice ligne                    | faux, sans exception    |

Colinéarité : tous les déterminants 2×2 a_i·e_j − a_j·e_i nuls (calcul exact), réponse non nulle.
Une attendue illisible, de dimension autre que 2 ou 3, ou nulle en mode `colineaire` fait échouer
les specs du modèle. Sans `answerKind`, rien ne change.
