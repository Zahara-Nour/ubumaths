# Progression — correction des 5 défauts de mathAST

Chantier lancé le 2026-09-16, d'après
[`mathast-5-defauts-prompt.md`](mathast-5-defauts-prompt.md).
Une branche + une PR par défaut, dans l'ordre. Ce fichier sert de reprise
après crash : il note ce qui a été **mesuré**, pas ce qui est supposé.

## Script de reproduction

Rejoué le 2026-09-16 avant de commencer : **les cinq défauts se reproduisent
à l'identique** du doc de départ, ligne pour ligne.

## Décisions produit (tranchées par David le 2026-09-16)

1. **numtype** → **ajouter `decimal`** à l'union `NumericType`
   (ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ du collège), et non se contenter de `rational`.
2. **units 4a** → **ne rien changer** à `format` (voir « écarts » ci-dessous).
3. **units 4c** → `kWh` **corrigé dans la même PR** que 4b.

## Écarts constatés avec le doc de départ

### 4a n'est pas un défaut

`format` (`units/formatter.ts`) prend un paramètre `style`, dont `'original'`
qui rend l'unité écrite par l'élève. Mesuré :

```
km/h   original="km/h"   dot=m.s^-1   'original'=km/h   fraction=m/s
mL     original="mL"     dot=L        'original'=mL     fraction=L
```

Les **6 appelants** de `format` dans `src/` (hors tests) passent tous
`'original'` : `latex-generator.ts:736,1280`, `custom-generator.ts:926,1359`,
`pretty-print.ts:589`, `atelier/parse.ts:326`. Le script de repro appelait
`format(u)` sans style et mesurait donc le défaut `'dot'`, documenté comme
normalisation SI. **Aucun chemin de production ne perd l'unité de l'élève.**

### Le défaut 1 en cachait un plus grave

Les trois cas de mesure du doc sont tous centrés en 0. Pour un centre ≠ 0,
`taylorExpand` affichait `x + -1^2` au lieu de `(x-1)^2` — l'expression
montrée n'était pas celle qui avait été calculée. Corrigé dans la même PR.

## État par défaut

| #   | Module                   | PR                                                       | État                                                     |
| --- | ------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| 1   | `taylor`                 | [#352](https://github.com/Zahara-Nour/ubumaths/pull/352) | ✅ **mergée**                                            |
| 2   | `pedagogical-arithmetic` | [#354](https://github.com/Zahara-Nour/ubumaths/pull/354) | ✅ **mergée**                                            |
| 3   | `variations`             | —                                                        | commité sur `fix/variations-extrema`, typecheck en cours |
| 4   | `units` (4b + 4c)        | —                                                        | cause localisée, pas commencé                            |
| 5   | `numtype`                | —                                                        | relevé d'exhaustivité fait, pas commencé                 |

## 1. `taylor` — fait

Deux défauts, tous deux dans `taylor/expand.ts`, le calcul étant juste :

1. **branche morte** : les deux côtés du `if (term.type === 'opposite')`
   faisaient `add`. Le commentaire annonçait « use subtraction ».
2. **base non parenthésée** : `power(add(x, opposite(a)), n)` sans nœud
   `delimiter`. Le rendu n'ajoute **aucune** parenthèse d'après la priorité
   des opérateurs — mesuré : `toLatex(power(add(x, -1), 2))` = `x + -1^2`.

Écarté : `removeSignsAST`, proposé par le doc. La cause n'était pas une
normalisation manquante, et cette fonction balaie aussi les signes dans les
produits et quotients (trop de rayon d'action, plus une dépendance du module
de calcul vers la couche cosmétique).

Preuves : 8 tests vus rouges, 53/53 verts après (dont 45 préexistants),
126 tests connexes verts, `check:incremental` 1615 fichiers 0 erreur.

## 2. `pedagogical-arithmetic` — cause confirmée par lecture

Priorités : `to-common-denominator` **130**, `add-same-denominator` **110**,
`reduce-fraction` **30**. Mais `findFirstApplication`
(`pedagogical-arithmetic/pipeline.ts:262`) parcourt l'arbre avec `mapNode`,
qui est **bottom-up** (`transforms.ts:277`, « children first, then parent »),
et `captured` court-circuite tout le reste dès le premier match.

Sur `8/12 + 9/12`, la division `8/12` déclenche donc `reduce-fraction` (30)
**avant** que l'addition parente ne soit confrontée à `add-same-denominator`
(110). D'où le cycle.

> **La priorité n'ordonne que les règles essayées sur un même nœud ; entre
> nœuds, c'est la profondeur qui gagne.**

**Correctif retenu** : une passe préalable détermine la meilleure priorité
applicable dans tout l'arbre, et seules les règles de cette priorité ont
ensuite le droit de mordre. `mapNodeTopDown` a été écarté (il aurait combattu
la règle « parenthèses d'abord », voulue).

⚠️ **La même cause de classe dégradait deux autres familles**, corrigées du
même coup : la notation scientifique (`10^4` développé en `10·10·10·10` avant
de multiplier) et les radicaux (`√2 × √8` décomposait `√8`). Décision produit
de David : chemin en une étape pour les radicaux.

Le snapshot de démonstration **gravait le cycle** comme sortie attendue : il
perd 3079 lignes pour 471 ajoutées.

⚠️ Piège documenté : `__tests__/fractions.test.ts` teste les règles en
isolation via `applyRule()` (ne traverse pas le pipeline) et
`__tests__/pipeline.test.ts` n'assert qu'une borne **inférieure**
(`toBeGreaterThanOrEqual(1)`). Le test à écrire est une borne **supérieure**.

## 5. `numtype` — relevé d'exhaustivité (à faire AVANT de coder)

Ajouter `decimal` cassera le typecheck sur **six `Record<NumericType, …>`**,
ce qui est un filet : quatre en production —
`format-fr.ts:16` (`TYPE_DESCRIPTIONS`), `algebra.ts:35` (`TYPE_LEVEL`),
`algebra.ts:50` (`DIRECT_PARENTS`), `algebra.ts:64` (`ALL_ANCESTORS`) —
et deux dans `__tests__/format-fr.test.ts:151,174`.

L'angle mort est ailleurs : ces fichiers nomment les membres **sans**
`Record`, en chaînes de `if/else` où `decimal` filerait en silence —
`predicates.ts` (17 mentions), `infer.ts` (9), `rules/power.ts` (56),
`rules/functions.ts` (22), `rules/literals.ts` (13),
`rules/arithmetic.ts` (10).

`algebra.ts` encode le treillis : `decimal` aura `rational` pour parent, et
`integer` prendra `decimal` pour parent.

Deux `switch` sur `NumericType` : `format-fr.ts:121` et `format-fr.ts:205`.
(Les `switch (type)` de `variations/` et des tokenizers portent sur d'autres
types — ne pas les confondre.)

## 3. `variations` — deux causes, chacune prouvée séparément

**A. `findAdjacentIntervals` retenait l'intervalle DÉGÉNÉRÉ.** Le zéro de la
dérivée produit un `constant [3/2 ; 3/2]` qui s'intercale entre le décroissant
et le croissant ; la boucle écrasant `before`, c'est lui qui restait.
Corrigé dans `extrema.ts` et **non** en cessant d'émettre ces intervalles :
`variations/format.ts` s'en sert pour la colonne du point critique dans le
tableau (grep fait, comme le demandait le doc de départ).

**B. Le solveur linéaire ne posait pas `approximate` sur la solution 0.**
`normalize(0)` rend un numérateur VIDE, donc la branche rationnelle de
`solvers/linear.ts` (qui teste `numerator.length === 1`) ne le voyait pas. Or
`sign/analyze.ts` écarte tout zéro sans `approximate` comme point de découpe →
un seul intervalle `unknown` → **toute fonction dont la dérivée s'annule en 0**
perdait son tableau de variations.

Un helper `ensureApproximate` compensait déjà ce défaut dans `solve.ts` et
`rational.ts` (« Handles the case where the linear solver doesn't set
approximate for zero »), mais le chemin de l'analyse de signe n'y passe pas —
une garde centralisée ne protège que ce qui passe par elle. Corrigé à la source.

**Part de chaque correctif, mesurée en les neutralisant un à un** : A seul
répare 4 cas sur 5 ; B n'est nécessaire que pour `x^2`. `x^4` relève de A.

⚠️ **Pourquoi la suite était verte** — pire qu'une borne inférieure : les tests
de `compute.test.ts` sont écrits `if (result.extrema.length > 0) { ... } else
{ ... }`, avec des commentaires « Extrema not found due to sign analysis
limitations » et des titres « when extrema are found ». Le défaut était encodé
comme résultat acceptable.
