# Pgcd multivarié, et `e^{x}` reconnu comme l'exponentielle

**Branche** `fix/pgcd-multivarie-et-exposants` · ouvert le 2026-09-20

Trois bugs, dont **un que je n'avais pas vu en ouvrant le chantier**.

## 1. L'invariant était encore cassé

La PR #386 a réglé la **divisibilité** : `(x+y)²/(x+y)` se réduit parce que le
dénominateur divise le numérateur. Mais quand les deux partagent un facteur sans
que l'un divise l'autre, rien ne se passait, et le moteur refusait toujours sa
propre sortie. Mesuré sur `main` à `59c62b499` :

| entrée                     | `simplify` rend | `areEquivalent(entrée, ça)` |
| -------------------------- | --------------- | --------------------------- |
| `(x²−y²)/(x²+2xy+y²)`      | `(x−y)/(x+y)`   | **`false`**                 |
| `(x+y)(x−y)/((x+y)(x+2y))` | `(x−y)/(x+2y)`  | **`false`**                 |
| `(a+b)(a−b)/((a+b)(a+2b))` | `(a−b)/(a+2b)`  | **`false`**                 |

**Correctif** : un pgcd multivarié, suite de restes primitive récursive sur les
variables. Comme pour la division exacte, il n'a **pas besoin d'être prouvé** :
tout candidat est vérifié par division exacte des deux côtés avant usage. Un
candidat faux produit un faux négatif, jamais un faux positif.

Plafonds calibrés par dichotomie jusqu'au premier rouge : 500 tours pour un
plancher mesuré à 15, 300 termes pour un plancher à 4, 5 variables pour un
maximum observé à 3.

## 2. `e^{x}` n'était pas une exponentielle pour le décideur

Le parseur lit `e^{x}` comme `superscript(variable e, x)`, alors que la
machinerie de combinaison ne reconnaît que les nœuds **fonction** `exp`. Elle ne
voyait donc jamais passer cette écriture : `exp(x)·exp(2x) ≡ exp(3x)` rendait
`true` et `e^x·e^{2x} ≡ e^{3x}` rendait `false`.

Ce n'était pas une question de produit. `evaluate(parseLatex('e'))` rend déjà
`2.718281828459045`, et `types.ts` dit noir sur blanc que `e` doit être
`MathConstant('euler')`. Seul le chemin symbolique l'ignorait.

**Correctif** : `normal/rules/euler-power.ts`, branché dans `equivalenceForm`
**seul**. La forme affichée garde la notation de l'élève : `simplify(e^{x})`
rend toujours `e^x`.

⚠️ **Piège payé** : `mapNode` travaille de bas en haut, donc la base `e` était
réécrite en `exp(1)` avant qu'on n'atteigne la puissance, et `e^{x}` restait
`exp(1)^x` que personne ne sait combiner. `e^{2}` passait quand même — les deux
côtés valant un nombre — et masquait le défaut.

## 3. L'exposant 1 sortait l'exponentielle de la machinerie

Trouvé en chemin, **préexistant**, sans aucune lettre `e` en jeu :

| paire                      | verdict sur `main` |
| -------------------------- | ------------------ |
| `exp(x+2)/exp(2) ≡ exp(x)` | `true`             |
| `exp(x+1)/exp(1) ≡ exp(x)` | **`false`**        |
| `exp(x+1) ≡ exp(x)·exp(1)` | **`false`**        |

`exp(1)` normalise vers la constante d'Euler tandis que `exp(2)` reste un nœud
fonction : la combinaison ne voyait plus qu'un côté sur deux.

**Correctif en deux temps, et le second a coûté une régression.**

D'abord, la combinaison rend maintenant la forme **canonique** : argument `1` →
constante d'Euler, pas `exp(1)`.

Ensuite la constante doit être reconnue comme base exponentielle. Ma première
version le faisait sans condition, et c'était sur le chemin d'**écriture** :
`e²` devenait `exp(2)` dans la forme normale. Mesuré, `ln(x²+1) − 2 = 0` passait
de deux solutions à **zéro**, le solveur ne reconnaissant plus la forme
attendue. Bissecté en neutralisant un changement à la fois depuis une copie.

La promotion est donc **conditionnée** : la constante ne se laisse traiter comme
une exponentielle que s'il y a une vraie exponentielle avec qui se combiner. Un
`e` isolé n'a rien à absorber, le promouvoir ne servait qu'à casser.

## L'affichage bouge, cinq fois

Empreinte de `simplify` sur 45 témoins, `main` contre la branche :

| entrée                    | `main`                 | branche           |
| ------------------------- | ---------------------- | ----------------- |
| `(2x²−2y²)/(3x²+6xy+3y²)` | la fraction développée | `(2x−2y)/(3x+3y)` |
| `(x²−4y²)/(x²−4xy+4y²)`   | la fraction développée | `(x+2y)/(x−2y)`   |
| `(a²b−ab²)/(a²−b²)`       | la fraction développée | `ab/(a+b)`        |
| `(xy+y²)/(x²−y²)`         | inchangée              | `y/(x−y)`         |
| `(ab+ac)/(b²−c²)`         | inchangée              | `a/(b−c)`         |

Toutes sont des réductions justes. **Aucune exponentielle ne bouge** : `e`,
`e^x`, `e^{2}`, `exp(1)`, `e^{x+1}/e` s'affichent au caractère près comme avant,
ce qui est la preuve que l'identification reste sur le chemin du décideur.

## Hors périmètre, et pourquoi

Un exposant symbolique sur une base **quelconque** reste opaque :
`x^a·x^b ≢ x^{a+b}`, `2^{2x}/2^{x} ≢ 2^{x}`. Un `SymbolicFactor` porte un
exposant **rationnel**, si bien qu'une puissance à exposant symbolique ne peut
pas être représentée comme facteur et reste une base opaque. Le réparer
demanderait de changer la forme normale, pas d'y ajouter une règle. Deux tests
le pinnent tel quel.

## Vert

- `pgcd-multivarie.test.ts` 28/28 (10 étaient rouges) · `pgcd-multivarie-unit.test.ts` 28/28
- `euler-puissance.test.ts` 22/22 (11 étaient rouges)
- mathAST : 322 fichiers, 14 598 tests
- questions, utils, grapheur, transpilers, exercices : 89 fichiers, 4 185 tests
- `lint:fast` propre
