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

## L'affichage bouge, huit fois — et j'avais annoncé cinq

Mon empreinte comptait 45 témoins ; la revue en a pris 139 et trouvé trois
déplacements de plus. **C'est la deuxième fois de suite** que j'affirme sur un
corpus trop étroit : sur la PR #386 j'avais écrit « l'affichage ne bouge pas »
et il bougeait neuf fois. La leçon n'est pas « élargir le corpus », c'est que
l'empreinte doit contenir la classe que le correctif vise, et que je ne peux pas
la deviner sans la construire exprès.

| entrée                    | `main`                 | branche           |
| ------------------------- | ---------------------- | ----------------- |
| `(2x²−2y²)/(3x²+6xy+3y²)` | la fraction développée | `(2x−2y)/(3x+3y)` |
| `(x²−4y²)/(x²−4xy+4y²)`   | la fraction développée | `(x+2y)/(x−2y)`   |
| `(a²b−ab²)/(a²−b²)`       | la fraction développée | `ab/(a+b)`        |
| `(xy+y²)/(x²−y²)`         | inchangée              | `y/(x−y)`         |
| `(ab+ac)/(b²−c²)`         | inchangée              | `a/(b−c)`         |
| `(x³+x²y)/(x²−y²)`        | inchangée              | `x²/(x−y)`        |
| `(x²+xy)/(y²+xy)`         | inchangée              | `x/y`             |
| `exp(x+1)/exp(1)`         | `exp(x+1)/e`           | `exp(x)`          |

**La dernière contredit ce que j'avais écrit.** J'affirmais « aucune
exponentielle ne bouge », et j'en tirais la preuve que l'identification restait
du côté du décideur. La phrase était fausse et l'argument tombait avec elle.

La cause est une asymétrie : `combineExpAcrossFraction` promeut la constante
d'Euler sans la condition qui garde les deux autres sites. C'est **voulu** — les
deux côtés d'une fraction forment un seul geste, et `exp(x+1)/exp(1)` est
précisément ce qu'il faut réduire, son dénominateur ne portant qu'une constante.
L'asymétrie est désormais écrite dans le code.

Ce qui reste vrai, et qui est mesuré : les écritures avec la **lettre** `e` ne
bougent pas. `e`, `e^x`, `e^{2}`, `e²/x`, `e^{x+1}/e` s'affichent au caractère
près comme avant.

### Élargissement du domaine de définition

`(xy+y²)/(x²−y²)` s'affiche maintenant `y/(x−y)`. En `x = −y ≠ 0`, l'original
vaut `0/0` et le réduit vaut `−1/2`. Le décideur déclare donc égales deux
fonctions de domaines différents. Ce n'est pas nouveau — la division exacte de
la PR #386 fait déjà exactement ça, et David l'a tranché en validant
`(x²−y²)/(x−y) ≡ x+y`. Cette branche étend la classe de cas concernés.

## Le coût, et le budget de correction

Les plafonds internes du pgcd bornent sa **terminaison**, pas son **temps**. Sur
une fraction dense à quatre variables de degré 3, aucun n'est atteint :

|                         | `main` | branche, sans pré-filtre | branche, avec |
| ----------------------- | ------ | ------------------------ | ------------- |
| `f ≡ f + 0`, 20 monômes | 18 ms  | 164 ms                   | **19 ms**     |

`validation-rule-evaluator.ts` corrige une réponse d'élève avec un budget de
500 ms, et un dépassement la compte **fausse**. Un pré-filtre de taille au site
d'appel supprime le risque : mesuré, le contrat de ce chantier ne consomme
jamais plus de 16 (produit des nombres de termes) là où la fraction dense en
consomme 420. Le plafond est posé à 64, quatre fois la marge du contrat.

Sur le corpus banal, le pgcd n'était déjà jamais atteint : rien ne change.

## Hors périmètre, et pourquoi

Un exposant symbolique sur une base **quelconque** reste opaque :
`x^a·x^b ≢ x^{a+b}`, `2^{2x}/2^{x} ≢ 2^{x}`. Un `SymbolicFactor` porte un
exposant **rationnel**, si bien qu'une puissance à exposant symbolique ne peut
pas être représentée comme facteur et reste une base opaque. Le réparer
demanderait de changer la forme normale, pas d'y ajouter une règle. Deux tests
le pinnent tel quel.

## Vert

- `pgcd-multivarie.test.ts` 28/28 (10 étaient rouges) · `pgcd-multivarie-unit.test.ts` 28/28
- `euler-puissance.test.ts` 27/27 (11 étaient rouges, plus 4 posés après la revue)
- mathAST : 322 fichiers, 14 598 tests
- questions, utils, grapheur, transpilers, exercices : 89 fichiers, 4 185 tests
- `lint:fast` propre
