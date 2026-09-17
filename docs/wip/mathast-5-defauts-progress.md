# Progression — correction des 5 défauts de mathAST

Chantier du 2026-09-16/17, d'après
[`mathast-5-defauts-prompt.md`](mathast-5-defauts-prompt.md).
Une branche + une PR par défaut, dans l'ordre. Ce fichier note ce qui a été
**mesuré**, pas ce qui est supposé.

## État

| #   | Module                   | PR                                                       | État      |
| --- | ------------------------ | -------------------------------------------------------- | --------- |
| 1   | `taylor`                 | [#352](https://github.com/Zahara-Nour/ubumaths/pull/352) | ✅ mergée |
| 2   | `pedagogical-arithmetic` | [#354](https://github.com/Zahara-Nour/ubumaths/pull/354) | ✅ mergée |
| 3   | `variations`             | [#355](https://github.com/Zahara-Nour/ubumaths/pull/355) | ✅ mergée |
| 4   | `units`                  | [#356](https://github.com/Zahara-Nour/ubumaths/pull/356) | ✅ mergée |
| 5   | `numtype`                | [#358](https://github.com/Zahara-Nour/ubumaths/pull/358) | ✅ mergée |

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

## Vérification finale

Le script de reproduction d'origine, rejoué **sans modification** sur `main`
après les cinq merges :

```
1. taylor      sin(x) -> x - \dfrac{1}{6} x^3      (était : x + -\dfrac{1}{6} x^3)
2. fractions   2/3+3/4 -> 2 étapes                  (était : 51)
3. variations  x^2 -> extrema = 1                   (était : 0, intervalle `unknown`)
4. units       L -> dm^3 = 0,9999999999999998       (était : null)
5. numtype     2.5 -> decimal                       (était : real)
```

⚠️ Le facteur `L -> dm^3` vaut 0,999999999999999**8**, pas 1 : `0.1^3` ne vaut
pas exactement 0,001 en flottant. C'est le comportement normal du module
(`km/h -> m/s` rend déjà 0,2777777777777778) ; les tests utilisent
`toBeCloseTo(..., 12)`. À ne pas prendre pour un défaut résiduel.

---

# Suite — détail des produits de racines

Le chantier des 5 défauts a laissé les radicaux dans un état que David a
jugé trop rapide : `√2 × √8 = 4` en une seule étape. Deux PR de suite ont
détaillé le chemin.

## Le problème

`multiply-radicals` multipliait **et** extrayait le carré parfait dans la
même étape — c'était écrit noir sur blanc dans le code :

> `√a × √b → c√r` … Coefficient extraction happens here so that
> `√2 × √8 → √16 → 4` **directly without a separate extract step**.

Conséquence, `√12 × √18 = 6√6` tombait d'un bloc : l'élève devait calculer
216, puis le factoriser, sans qu'aucune ligne ne le montre.

## Les règles de choix (décidées par David)

Deux chemins mènent au résultat. On prend le plus simple selon le cas :

| Cas                                                 | Règle qui gagne                | Résultat                      |
| --------------------------------------------------- | ------------------------------ | ----------------------------- |
| les **deux** racines se simplifient                 | `extract-both-radicals` (108)  | `√12 × √18 = 2√3 × 3√2 = 6√6` |
| **une seule** se simplifie, produit = carré parfait | `multiply-radicals` (110)      | `√2 × √8 = √16 = 4`           |
| **une seule** se simplifie, produit quelconque      | `extract-perfect-square` (100) | `√12 × √2 = 2√3 × √2 = 2√6`   |
| aucune ne se simplifie                              | `multiply-radicals` (110)      | `√2 × √6 = √12 = 2√3`         |

⚠️ **Le cas « les deux se simplifient » gagne même si le produit est un
carré parfait.** `√18 × √50` passait par `√900`, ce qui demande de
reconnaître 900 = 30² ; `3√2 × 5√2` est plus doux. Arbitrage de David
après avoir vu le rendu.

Le garde vit dans la **condition** de `multiply-radicals`, pas dans sa
priorité : étant la plus prioritaire (110), elle doit se retirer
d'elle-même pour laisser l'extraction passer devant.

## Deux formes que personne n'écrit

Basculer la priorité seule ne suffisait pas. Sur `3√2 × 5√2`, la règle
écrivait `15√4`, puis l'extraction donnait `15 2` — quatre étapes dont
deux formes illisibles. Quand le produit des radicandes tombe juste **et**
qu'il y a des coefficients, la règle écrit donc le produit d'entiers :

```
√18 × √50 = 3√2 × 5√2
          = 15 × 2
          = 30
```

Sans coefficient, elle garde la racine (`√2 × √8 = √16`), qui est tout
l'intérêt de l'étape. Le départage se fait sur `coefficient !== 1`.

## `highlightsOf` — un crochet déclaratif sur les règles

`extract-both-radicals` réécrit **deux** sous-arbres dans la même étape,
donc son `before` est le produit entier. Or le renderer surligne
`step.before` par défaut (`renderer.ts:107`,
`step.highlightSubTrees ?? [step.before]`) : toute la ligne serait passée
en bleu au lieu de désigner les deux racines.

Le mécanisme `highlightSubTrees` existait déjà côté rendu et côté
pipeline, mais n'était accessible **qu'au code de la passe
`group-multiplications-in-addition`**, pas aux règles du moteur. Il est
désormais déclaratif :

```ts
highlightsOf: (before) => [√12, √18]
```

Le pipeline appelle ce crochet en construisant l'étape. Toute règle future
qui réécrit plusieurs sous-arbres en profitera sans toucher au pipeline.

Rendu obtenu :

```
[0] On extrait le facteur carré parfait sous chaque racine
    🔵√12 × 🔵√18  =  2√3 × 3√2
[1] On multiplie les racines (la racine du produit)
    🔵2√3 × 3√2    =  6√6
```

Le contraste se voit sur `√12 × √2`, où seule `√12` passe en bleu : une
racine, une règle simple, surlignage par défaut.

## Une étape sans explication supprimée

La règle lit aussi les racines à coefficient (`c√a × d√b`), ce qui lui
permet de conclure le chemin « extraire d'abord ». Sans ça,
`2√3 × 3√2 = 6√6` tombait dans `evaluate-final`, le repli du pipeline
libellé **« On calcule »**. Un test interdit désormais qu'une étape y
retombe.

## Le piège de test, encore

Le test « `√12 × √18` ne passe pas par `√216` » **passait déjà** sur le
comportement fautif : une étape unique `√12 × √18 = 6√6` ne contient pas
non plus « √216 ». Il a fallu y ajouter la borne sur le nombre d'étapes et
la présence de `2√3 × 3√2` pour qu'il morde. Même famille que les cinq
formes relevées plus haut.

## Infrastructure

Les étapes de radicaux ne sont pas un cas à part. Chaîne vérifiée :

```
extract-perfect-square / extract-both-radicals / multiply-radicals
      ↓  (PedagogicalArithmeticRule)
generatePedagogicalArithmeticSteps   → PedagogicalArithmeticStep[]  (extends BaseStep)
      ↓
PedagogicalArithmeticRenderer.renderAll()   → RenderedStep[]
      ↓
correction-generator.ts:266
      ↓
GeneratedStepsCorrection.svelte
```

`BaseStep` (`common/step-recorder-base.ts:26`) est partagé par 12 modules.
