# Progression — correction des 5 défauts de mathAST

Chantier du 2026-09-16/17, d'après
[`mathast-5-defauts-prompt.md`](mathast-5-defauts-prompt.md).
Une branche + une PR par défaut, dans l'ordre. Ce fichier note ce qui a été
**mesuré**, pas ce qui est supposé.

## État

| #   | Module                   | PR                                                       | État       |
| --- | ------------------------ | -------------------------------------------------------- | ---------- |
| 1   | `taylor`                 | [#352](https://github.com/Zahara-Nour/ubumaths/pull/352) | ✅ mergée  |
| 2   | `pedagogical-arithmetic` | [#354](https://github.com/Zahara-Nour/ubumaths/pull/354) | ✅ mergée  |
| 3   | `variations`             | [#355](https://github.com/Zahara-Nour/ubumaths/pull/355) | ✅ mergée  |
| 4   | `units`                  | [#356](https://github.com/Zahara-Nour/ubumaths/pull/356) | PR ouverte |
| 5   | `numtype`                | —                                                        | commité    |

Script de reproduction rejoué avant de commencer : les cinq défauts se
reproduisaient **à l'identique** du doc de départ, ligne pour ligne.

## Décisions produit (tranchées par David)

1. **numtype** → **ajouter `decimal`** à l'union (ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ), plutôt que de
   se contenter de classer 2,5 en `rational`.
2. **units 4a** → **ne rien changer** à `format` (voir ci-dessous).
3. **units 4c** → `kWh` corrigé dans la même PR que 4b.
4. **radicaux** (conséquence du défaut 2) → `√2 × √8 = 4` en **une** étape.

## Le fil rouge : les tests n'ont pas raté ces bugs, ils les ont enregistrés

C'est le constat le plus réutilisable du chantier. Dans les cinq modules, la
suite était verte **parce que** les tests décrivaient le comportement fautif.

| Défaut                     | Forme prise par l'enregistrement du bug                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 `taylor`                 | Un bloc `describe('output format')` n'assertant que `toContain('x')` et `length > 0`.                                                      |
| 2 `pedagogical-arithmetic` | Un **snapshot** contenant les 50 étapes du cycle, commité comme sortie attendue.                                                           |
| 3 `variations`             | `if (extrema.length > 0) { assert } else { … }`, titres « _when extrema are found_ », commentaires « _due to sign analysis limitations_ ». |
| 4 `units`                  | `expect(unitsAreCompatible(L, m3)).toBe(false)` commenté « _known limitation that may be addressed in Phase 2_ ».                          |
| 5 `numtype`                | `expect(inferType('3.14').base).toBe('real')`.                                                                                             |

Corollaire pour la suite : **une suite verte ne dit rien tant qu'on n'a pas lu
ce qu'elle assert**. Les quatre premiers défauts ont été confirmés en lisant les
tests existants avant d'en écrire de nouveaux.

## Écarts constatés avec le doc de départ

### 4a n'était pas un défaut

`format` (`units/formatter.ts`) prend un paramètre `style`, dont `'original'`
qui rend l'unité écrite par l'élève :

```
km/h   original="km/h"   dot=m.s^-1   'original'=km/h   fraction=m/s
```

Les **6 appelants** dans `src/` (hors tests) passent tous `'original'` :
`latex-generator.ts:736,1280`, `custom-generator.ts:926,1359`,
`pretty-print.ts:589`, `atelier/parse.ts:326`. Le script de reproduction
appelait `format(u)` sans style et mesurait donc le défaut `'dot'`, documenté
comme normalisation SI. **Aucun chemin de production ne perdait l'unité.**

### Chaque défaut était plus large que décrit

- **1** ne cachait pas qu'un « + - » : pour un centre ≠ 0, `taylorExpand`
  affichait `x + -1^2` au lieu de `(x-1)^2` — une **autre expression**. Invisible
  au doc de départ, dont les trois cas de mesure sont tous centrés en 0.
- **2** ne touchait pas que les fractions : la même cause dégradait la notation
  scientifique et les radicaux.
- **3** privait de tableau de variations **toute fonction dont la dérivée
  s'annule en 0** — `x²`, `x³`, `x⁴`, les cas les plus courants du programme.
- **4** a révélé **deux défauts préexistants** dans `questions/units`, sans quoi
  le litre serait resté cassé de ce côté.
- **5** : l'angle mort n'était pas là où le doc l'annonçait (voir plus bas).

## 1. `taylor`

Deux défauts dans `taylor/expand.ts`, le calcul étant juste :

1. **branche morte** : les deux côtés du `if (term.type === 'opposite')`
   faisaient `add`, alors que le commentaire annonçait « use subtraction ».
2. **base non parenthésée** : `power(add(x, opposite(a)), n)` sans nœud
   `delimiter`. Le rendu n'ajoute **aucune** parenthèse d'après la priorité des
   opérateurs — mesuré : `toLatex(power(add(x, -1), 2))` = `x + -1^2`.

Écarté : `removeSignsAST`, proposé par le doc. La cause n'était pas une
normalisation manquante, et cette fonction balaie aussi les signes dans les
produits et quotients.

## 2. `pedagogical-arithmetic`

Priorités `to-common-denominator` **130**, `add-same-denominator` **110**,
`reduce-fraction` **30**. Mais `findFirstApplication` parcourt l'arbre avec
`mapNode`, **bottom-up** (`transforms.ts:277`), et capture la première règle qui
mord.

> **La priorité n'ordonnait que les règles essayées sur un même nœud ; entre
> nœuds, c'est la profondeur qui gagnait.**

Correctif : une passe préalable détermine la meilleure priorité applicable dans
tout l'arbre ; seules les règles de cette priorité peuvent ensuite mordre.
`mapNodeTopDown` écarté (il aurait combattu la règle « parenthèses d'abord »).

⚠️ Le test de cycle **doit chercher un motif de période 2 à 4** : une détection
limitée à « A B A B » ne mord pas, le cycle des fractions étant de période 3.

## 3. `variations`

**A.** `findAdjacentIntervals` retenait l'intervalle **dégénéré**
`constant [a ; a]`, qui sépare les deux vrais voisins. Corrigé là plutôt qu'en
cessant d'émettre ces intervalles : `variations/format.ts:90,386` s'en sert pour
la colonne du point critique (grep fait, comme demandé).

**B.** Le solveur linéaire ne posait pas `approximate` sur la solution **0** —
`normalize(0)` rend un numérateur vide, que la branche rationnelle
(`numerator.length === 1`) ne voit pas. Or `sign/analyze.ts:462` écarte tout
zéro sans `approximate` comme point de découpe.

Un helper `ensureApproximate` compensait déjà ce défaut dans `solve.ts` et
`rational.ts` — mais le chemin de l'analyse de signe n'y passe pas. **Une garde
centralisée ne protège que ce qui passe par elle.** Corrigé à la source.

**Part de chaque correctif, mesurée en les neutralisant un à un** (depuis une
copie, jamais `git checkout`) : A seul répare 4 cas sur 5 ; B n'est nécessaire
que pour `x^2`. `x^4` relève de A.

## 4. `units`

`L` était une entrée de `BASE_UNITS` de dimension `'volume'`, de signature
`{ volume: 1 }`, quand `dm^3` vaut `{ length: 3 }`. Le fichier documentait déjà
l'incohérence à propos de l'hectare (« This diverges from how 'volume' is
treated »). Le litre rejoint `DERIVED_UNITS` avec `components: Map([['m', 3]])`.

⚠️ **L'ordre de `DERIVED_UNITS` est significatif** : `recognizeDerivedUnit` rend
la PREMIÈRE entrée dont les composants correspondent. `Wh` a les mêmes
composants que `J` ; placé en tête, « 2 N × 3 m » rendait 6 Wh.

Deux défauts **préexistants** trouvés au passage, vérifiés sur arbre propre :

1. `questions/units/parser.ts` construisait l'unité comme `baseSymbol^1` en
   ignorant `components` : `1 ha + 1 m^2` était déclaré impossible à
   additionner. Invisible tant que les deux côtés étaient également faux.
2. `generateUnitWhitelist` ne connaissait que `BASE_UNITS × préfixes` : le
   tokenizer découpait `mL` en « m × L ».

## 5. `numtype`

`decimal` ajouté à l'union et inséré dans le treillis (`TYPE_LEVEL` renuméroté,
`DIRECT_PARENTS`, `ALL_ANCESTORS`).

**Le filet a bien joué**, mais pas là où on l'attendait. Les six
`Record<NumericType, …>` cassent au typecheck et signalent ce qu'il faut
compléter. L'angle mort réel était ailleurs : **six comparaisons STRICTES
`base === 'rational'`** dans `rules/power.ts` et `rules/arithmetic.ts`,
qu'aucun `Record` ne protège et qu'aucun test ne couvrait.

Une seule rendait un résultat **faux** : `inferDivisionType` laissait les
décimaux tomber dans `join`, qui concluait « décimal » pour `2,5 / 3` = 0,8333…
Les quatre branches sont regroupées en un `isSubtype(..., 'rational')`.

> Leçon #343 confirmée et précisée : ce n'est pas l'union qui est dangereuse,
> ce sont les **égalités strictes** sur ses membres. Les `Record` exhaustifs
> sont un bon filet ; `x === 'membre'` n'en a aucun.
