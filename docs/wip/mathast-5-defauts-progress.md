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

| #   | Module                   | Branche             | PR                                                       | État                                     |
| --- | ------------------------ | ------------------- | -------------------------------------------------------- | ---------------------------------------- |
| 1   | `taylor`                 | `fix/taylor-signes` | [#352](https://github.com/Zahara-Nour/ubumaths/pull/352) | PR ouverte, CI en cours                  |
| 2   | `pedagogical-arithmetic` | —                   | —                                                        | cause confirmée, pas commencé            |
| 3   | `variations`             | —                   | —                                                        | pas commencé                             |
| 4   | `units` (4b + 4c)        | —                   | —                                                        | pas commencé                             |
| 5   | `numtype`                | —                   | —                                                        | relevé d'exhaustivité fait, pas commencé |

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

`mapNodeTopDown` existe déjà (`transforms.ts:496`) — candidat, à peser contre
le risque de changer l'ordre des étapes ailleurs.

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
