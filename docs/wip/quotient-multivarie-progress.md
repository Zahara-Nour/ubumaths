# Réduire un quotient par un facteur commun polynomial, à plusieurs variables

**Branche** `fix/quotient-multivarie` · ouvert le 2026-09-20

## Le symptôme : le moteur refusait sa propre sortie

`simplify` rend la bonne réponse, et `areEquivalent` déclare l'entrée **non
équivalente** à cette réponse. Mesuré sur `main`, 4 cas sur 6 :

| entrée             | `simplify` rend | `areEquivalent(entrée, ça)` |
| ------------------ | --------------- | --------------------------- |
| `(x²−y²)/(x−y)`    | `x + y`         | **`false`**                 |
| `(x+y)²/(x+y)`     | `x + y`         | **`false`**                 |
| `(x+y)(x−y)/(x+y)` | `x − y`         | **`false`**                 |
| `(a+b+c)²/(a+b+c)` | `a + b + c`     | **`false`**                 |
| `(x²−1)/(x+1)`     | `x − 1`         | `true`                      |
| `2ab/a`            | `2b`            | `true`                      |

## La cause

Deux mécanismes de portée différente. `simplify` réduit par ses **règles de
factorisation**, et sait déjà faire à plusieurs variables — mesuré,
`(a+b)(a−b)/((a+b)(a+2b))` rend `(a−b)/(a+2b)`. Le décideur, lui, réduit par
**pgcd** : `tryUnivariateGcd` ne traite qu'une seule variable, et son repli
`gcdPolynomials` n'extrait qu'un facteur **monôme**. Un facteur commun
polynomial à plusieurs lettres n'est donc vu par personne.

## La décision de produit (David, 2026-09-20)

Un élève qui simplifie `(x²−y²)/(x−y)` en `x+y` est **compté juste**, bien que
les deux écritures ne coïncident pas en `x = y`. C'est le choix déjà fait à une
variable, appliqué au-delà.

## L'approche : division exacte, pas pgcd multivarié

`exactDividePolynomials(a, b)` rend `q` tel que `a = b·q` exactement, ou `null`.
Division multivariée classique pour l'ordre **graded lex** (degré total, puis
lexicographique sur les hachages de bases triés), qui garantit la terminaison.

**Filet de sécurité** : avant de rendre `q`, le produit `b·q` est recalculé et
comparé à `a`. Un faux positif du décideur compte juste une réponse fausse
d'élève ; cette vérification le rend structurellement impossible. Un second
garde-fou exige la décroissance stricte du monôme de tête, pour qu'aucune
division de coefficients inexacte ne puisse boucler à l'infini.

Le branchement dans `normalize` n'agit que si les deux chemins existants n'ont
**rien** réduit, et refuse un diviseur constant — sans cette garde,
`2/(x+y)` devenait `1/(x/2 + y/2)` et `1/√2` était détourné du chemin de
rationalisation.

## Limite assumée

`(x+y)²/(x+2y)` ne se réduit pas : ni l'un ne divise l'autre. Un vrai pgcd
multivarié le ferait, la division exacte non. Testé comme tel dans le contrat.

## Vert

- Contrat `quotient-multivarie.test.ts` : **41/41** (15 étaient rouges)
- `exact-division.test.ts` : 19/19
- mathAST : 319 fichiers, 14 509 tests
- questions, utils, grapheur, transpilers, exercices : 89 fichiers, 4 185 tests
- `lint:fast` propre · `check:incremental` 0 erreur sur 1615 fichiers

## ⚠️ L'affichage BOUGE — neuf déplacements, et j'avais écrit le contraire

J'avais pris une empreinte de `simplify` sur 24 fractions témoins, `diff` vide,
et j'en avais conclu **en gras** que l'affichage ne bougeait pas. C'était faux :
mon corpus ne contenait aucune fraction donnée sous forme **développée** que la
factorisation de `simplify` ne savait pas reconnaître, c'est-à-dire exactement
la classe que ce correctif rattrape.

Empreinte refaite sur 48 témoins, `main` contre la branche :

| entrée                    | `main`                         | branche   |
| ------------------------- | ------------------------------ | --------- |
| `(x⁴−y⁴)/(x²−y²)`         | `\dfrac{x^4-y^4}{x^2-y^2}`     | `x² + y²` |
| `(−x−y)/(x+y)`            | `\dfrac{-x-y}{x+y}`            | `−1`      |
| `(x²y²−1)/(xy−1)`         | `\dfrac{x^2y^2-1}{xy-1}`       | `xy + 1`  |
| `(2x+4y)/(x+2y)`          | `\dfrac{2x+4y}{x+2y}`          | `2`       |
| `(3a−3b)/(a−b)`           | `\dfrac{3a-3b}{a-b}`           | `3`       |
| `(6a−6b)/(2a−2b)`         | `\dfrac{3a-3b}{a-b}`           | `3`       |
| `(√3x+√3y)/(x+y)`         | `\dfrac{x\sqrt3+y\sqrt3}{x+y}` | `√3`      |
| `(x³+3x²y+3xy²+y³)/(x+y)` | la somme développée sur `x+y`  | `(x+y)²`  |
| `(4x²−9y²)/(2x−3y)`       | `\dfrac{4x^2-9y^2}{2x-3y}`     | `2x + 3y` |

Les neuf sont **justes** et plus courtes. Aucune sortie n'est devenue fausse,
aucune erreur nouvelle. La classe touchée reste étroite : mesuré, 410 fractions
aléatoires et 600 fractions de la forme `(A·B)/A` ne bougent pas d'un caractère,
`simplify` les réduisant déjà par ses règles de factorisation.

Ce sont néanmoins des déplacements de **sortie élève**. Un exercice qui demande
« simplifie `(3a−3b)/(a−b)` » attend désormais `3` et non une fraction.
**À trancher par David**, c'est du produit.

## Non-régression de l'affichage, ce qui ne bouge pas

## Exposition réelle, mesurée

| source                                       | résultat                                                          |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `question_templates` en prod (EU, read-only) | 2 templates au total, 0 avec fraction                             |
| corpus des 633 questions à migrer            | 36 avec une fraction, **0** à dénominateur littéral ≥ 2 variables |

Aucune question existante ne déclenchait le bug. Il fallait le corriger parce
qu'un moteur qui refuse sa propre sortie est indéfendable, et parce que la
refonte du référentiel vise la 1ʳᵉ spé.

## Le reste de la revue

**Aucun faux positif trouvé**, sur ~25 000 paires vérifiées par un évaluateur
numérique indépendant du moteur : 23 685 paires unitaires en 12 points chacune,
plus 1 200 fractions de bout en bout en 8 points. Le décideur gagne
**11 équivalences vraies** sur 1 200 sans en inventer aucune.

**L'ordre monomial est un vrai ordre monomial**, mesuré exhaustivement :
65 536 paires pour l'antisymétrie et pour `cmp = 0 ⟺ mêmes exposants`,
400 000 triplets pour la transitivité, 200 000 pour la compatibilité avec la
multiplication. Zéro violation. La terminaison est garantie deux fois, par la
théorie et par un garde-fou qui rend `null` au lieu de boucler.

**Le filet rejetait une division valide** quand le quotient vaut `1` et que le
diviseur arrive dans un ordre non canonique : `mulPolynomials` court-circuite
sur un facteur `1` et rend l'autre non trié, si bien que le filet comparait un
tableau brut à un tableau trié. Faux négatif, jamais faux positif, et
inatteignable depuis `normalize`. Corrigé quand même — la fonction est exportée.
Cinq tests le pinnent, rouge prouvé.

**Un trou que la revue n'avait pas vu, trouvé par ma propre campagne.** Le repli
ne se déclenchait que si aucun chemin précédent n'avait rien réduit. Or dès que
`gcdPolynomials` extrait un facteur **monôme** — un `z`, un `2`, un `xy` — il a
réduit quelque chose, et ce qui reste peut encore porter un facteur commun
**polynomial** : `z(x+y)²/(z(x+y))` devient `(x+y)²/(x+y)` une fois le `z`
sorti, et plus personne ne le regardait. Mesuré, campagne indépendante de
1386 verdicts vérifiés en 8 points numériques :

|                | avant   | après   |
| -------------- | ------- | ------- |
| vrais positifs | 354     | **693** |
| faux négatifs  | **339** | **0**   |
| faux positifs  | 0       | 0       |

Le repli opère désormais sur ce qui **reste** après les chemins existants, et
tourne toujours. Partant du couple déjà réduit, il ne peut rien défaire. Cinq
tests le pinnent, rouge prouvé.

**Coût : nul sur le banal, ×2 à ×11,6 sur le multivarié non réductible.** Sur
20 paires courantes en 4 000 appels, la branche est dans le bruit face à `main`.
Sur une fraction multivariée que personne ne réduit, la division exacte
s'exécute pour rien et dans les deux sens : `(a+b+c+d+e)⁵/(a+b+c+d+e+1)` passe
de 1,83 à 21,18 ms. Sous un budget serré, une réponse juste peut être comptée
fausse — mesuré à `timeoutMs = 30`. Au budget de production de 500 ms, le pire
mesuré est 142 ms, soit une marge de 3,5 sur des expressions déjà très au-delà
de ce qu'un élève écrit. À surveiller si le nombre de variables augmente.

**Précondition documentée** : `compareMonomialsGradedLex` est faux sur un
monôme portant deux facteurs de même base — `cmp([x¹, x²], [x³])` rend −1 au
lieu de 0. `mulTerms` garantit la fusion, rien dans `normalize` ne produit ça,
et on ne paie pas une fusion défensive à chaque comparaison pour un cas qui
n'arrive pas. C'est écrit au-dessus de la fonction.

## Trouvé en chemin, NON traité

- `(x³−y³)/(x²−y²)` n'est pas réduit par `simplify` (attendu `(x²+xy+y²)/(x+y)`).
- `e^{2x}/e^x` n'est pas réduit (attendu `e^x`).
