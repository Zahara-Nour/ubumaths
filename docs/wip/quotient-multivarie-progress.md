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

**L'affichage ne bouge pas.** Empreinte de `simplify` sur 24 fractions témoins
prise avant et après : `diff` vide. Le correctif touche `normalize`, donc ce
contrôle ne va pas de soi et aucun test du contrat ne l'aurait dit.

## Exposition réelle, mesurée

| source                                       | résultat                                                          |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `question_templates` en prod (EU, read-only) | 2 templates au total, 0 avec fraction                             |
| corpus des 633 questions à migrer            | 36 avec une fraction, **0** à dénominateur littéral ≥ 2 variables |

Aucune question existante ne déclenchait le bug. Il fallait le corriger parce
qu'un moteur qui refuse sa propre sortie est indéfendable, et parce que la
refonte du référentiel vise la 1ʳᵉ spé.

## Trouvé en chemin, NON traité

- `(x³−y³)/(x²−y²)` n'est pas réduit par `simplify` (attendu `(x²+xy+y²)/(x+y)`).
- `e^{2x}/e^x` n'est pas réduit (attendu `e^x`).
