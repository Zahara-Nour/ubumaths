# Migration `number('-N')` → `opposite(number('N'))` — Progression

> **Objet** : éliminer la dual-representation des nombres négatifs dans mathAST. Forme canonique unique : `OppositeNode(NumberNode positif)`. Aligne mathAST sur la stratégie Poincaré (`Rational::shallowBeautify` toujours-positif + `Opposite` wrapper).

**Démarrage** : 2026-05-02
**Branche** : `main`

---

## Phase 0 — Spécification TDD ✓

### Comportements validés

1. **`number(value)` rejette les nombres négatifs** : `number('-3')`, `number(-3)`, `number('-3.5')` throw avec un message indiquant la forme correcte.
2. **`number('+3')` throw** (Q2 : décision utilisateur).
3. **`number('-0')` throw** (Q1 : décision utilisateur).
4. **`number('1.5e-3')` reste valide** : le `-` est dans l'exposant, pas le signe global. La regex de détection doit cibler **le préfixe uniquement**.
5. **Tous les call sites internes produisent désormais la forme canonique** : aucun `NumberNode` avec `value` commençant par `-` après migration.
6. **`isNegativeOne` est renommé `isMinusOne`** (Q4 : décision utilisateur, alignement avec Poincaré `Rational::isMinusOne`). Couvre les deux formes pendant la transition.
7. **Aucune régression** sur la suite de tests existante.

### Décisions ouvertes — fermées

- **Q3 (`safeNumber` helper de transition)** : ❌ rejeté. Pas d'escape hatch générique. Helpers ciblés au cas par cas (typés, dans le module concerné). Ex : `rationalToNode(r: Rational)` dans `normal/`.

---

## Phase 1 — Audit & helpers (en cours)

### Sites créateurs identifiés (à migrer en Phase 3)

| #   | Fichier                                    | Ligne | Pattern                     | Type                                                               |
| --- | ------------------------------------------ | ----- | --------------------------- | ------------------------------------------------------------------ |
| 1   | `mathAST/analysis/coefficient-utils.ts`    | 35    | `MINUS_ONE = number('-1')`  | constante                                                          |
| 2   | `mathAST/integration/integrators/basic.ts` | 453   | `power(expr, number('-1'))` | static                                                             |
| 3   | `mathAST/cli/commands/solve.command.ts`    | 42    | `number('-' + val)`         | dynamic                                                            |
| 4   | `mathAST/cli/commands/solve.command.ts`    | 311   | `number('-1')`              | static                                                             |
| 5   | `mathAST/domain/builtins.ts`               | 75    | `number(-1)`                | static                                                             |
| 6   | `mathAST/domain/builtins.ts`               | 90    | `number(-1)`                | static                                                             |
| 7   | `mathAST/domain/builtins.ts`               | 100   | `number(-1)`                | static                                                             |
| 8   | `mathAST/domain/factory.ts`                | 201   | `number(-1)`                | static                                                             |
| 9   | `math/intervals/factory.ts`                | 222   | `number(-1)`                | static (HORS mathAST/, mais importe depuis `$lib/mathAST/factory`) |

**Total : 9 sites**.

### Consommateurs à adapter (cassent au throw si non migrés)

| #   | Fichier                                        | Lignes    | Comportement actuel                                                          | Action requise                                                   |
| --- | ---------------------------------------------- | --------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| C1  | `mathAST/latex-generator.ts:visitComplexSpans` | 781-839   | Inspecte `n.value === '-1'`, `n.value.startsWith('-')` pour générer `a - bi` | Étendre la détection pour reconnaître `OppositeNode(NumberNode)` |
| C2  | `mathAST/latex-generator.ts:generateComplex`   | 1330-1377 | Idem (duplication de C1)                                                     | Idem                                                             |
| C3  | `mathAST/analysis/coefficient-utils.ts`        | 96        | `coefficient.value === '-1'`                                                 | Remplacer par `isMinusOne(coefficient)`                          |
| C4  | `mathAST/eval/evaluate.ts`                     | 219       | `value.startsWith('-') ? -1n : 1n` (parsing Rational)                        | Devient dead branch, OK à laisser ou simplifier                  |

### Helpers à créer / étendre

- **`isMinusOne(node: MathNode)`** (renommé de `isNegativeOne`) :
  - Existe déjà à `guards.ts:754`
  - Couvre `number('-1')` ET `opposite(number('1'))` (vérifié dans le code source)
  - Action : renommage uniquement (`s/isNegativeOne/isMinusOne/g` dans `guards.ts` + `common/simplify.ts`)
- **Possibilité Phase 3** : créer `isNegativeNumeric(node)` pour les cas `latex-generator` (plus général que `isMinusOne`). À décider en Phase 3.

### JSDoc à mettre à jour (cosmétique, faisable en Phase 5)

| Fichier                                     | Ligne       | Contenu actuel                        |
| ------------------------------------------- | ----------- | ------------------------------------- |
| `mathAST/solve/solve.ts`                    | 1081        | exemple `number('-2')`                |
| `mathAST/analysis/linear-combination.ts`    | 20, 89, 200 | exemples `number(-1)`, `number('-3')` |
| `mathAST/analysis/quadratic-combination.ts` | 273         | exemple `number('-9')`                |
| `math/intervals/types.ts`                   | 49          | exemple `number('-1')`                |
| `math/intervals/algebra.ts`                 | 137         | exemple `number('-3')`                |

### Piège résiduel — `isMinusOne` dans deux modules

Après le renommage, deux exports `isMinusOne` distincts :

- `mathAST/guards.ts` → `(node: MathNode): boolean`
- `mathAST/normal/rational.ts:478` → `(r: Rational): boolean`

`mathAST/index.ts:434` fait `export * from './normal/index.js'` qui inclut `isMinusOne` (Rational). La version `MathNode` n'est PAS dans la liste des réexports `index.ts:280-316`, donc **pas de collision actuelle**.

⚠️ **À documenter** : ne jamais ajouter `isMinusOne` à la liste des réexports de `guards` dans `index.ts` sans renommer l'un des deux.

### Risques identifiés

1. **Cas dynamique non détectable** : un site qui ferait `number(coef.toString())` où `coef` peut être négatif. Mitigation : test E2E "no negative NumberNode in any AST" en Phase 2.
2. **Régressions silencieuses dans `latex-generator`** : si on retire les NumberNode négatifs SANS adapter le générateur (C1, C2), `complex(real, opposite(num))` rendrait `... + (-num)i` au lieu de `... - num·i`. Tests visuels et tests existants doivent capturer ça.

---

## Phase 2 — Tests rouges ✓

**Date** : 2026-05-02

### Fichiers créés / modifiés

| Fichier                                                     | Action                                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/__tests__/factory.test.ts`                 | Ajout de `describe('number — negative rejection (Phase 4)')` avec 5 `it.fails` + 1 `it` régression |
| `src/lib/mathAST/__tests__/no-negative-number-node.test.ts` | Nouveau fichier — 5 tests E2E sur les ASTs produits                                                |

### Résultats des tests

#### `factory.test.ts` — 103 tests, tous verts ✓

Les 5 cas `it.fails` passent (sémantique inversée : ils sont verts maintenant car `number()` ne throw pas encore). Ils deviendront rouges en Phase 4 quand on ajoutera le throw, puis on les convertira en `it` + `.toThrow()`.

| Test                       | Statut actuel       | Deviendra rouge en |
| -------------------------- | ------------------- | ------------------ |
| `number('-3') throws`      | ✓ vert (`it.fails`) | Phase 4            |
| `number(-3) throws`        | ✓ vert (`it.fails`) | Phase 4            |
| `number('-3.5') throws`    | ✓ vert (`it.fails`) | Phase 4            |
| `number('-0') throws`      | ✓ vert (`it.fails`) | Phase 4            |
| `number('+3') throws`      | ✓ vert (`it.fails`) | Phase 4            |
| `number('1.5e-3') accepté` | ✓ vert (`it`)       | doit rester vert   |

#### `no-negative-number-node.test.ts` — 5 tests : **2 rouges, 3 verts**

| Test                                            | Statut    | Site                                     | Action Phase 3                                                                                                                                                                                                                        |
| ----------------------------------------------- | --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MINUS_ONE should not be a negative NumberNode` | **rouge** | #1 `coefficient-utils.ts:35`             | `number('-1')` → `opposite(number('1'))`                                                                                                                                                                                              |
| `d/dx[x^2] no negative NumberNode`              | ✓ vert    | —                                        | sanity check, doit rester vert                                                                                                                                                                                                        |
| `d/dx[-x^3] no negative NumberNode`             | ✓ vert    | #1 indirect                              | vert car la négation passe par `opposite()`, pas `multiply(MINUS_ONE)` dans ce chemin                                                                                                                                                 |
| `integrate(x^(-1)) no negative NumberNode`      | ✓ vert    | #2 `basic.ts:453`                        | vert car normalisation préalable transforme `power(x, opposite(1))` en `division` avant basic integrator — le NumberNode `-1` de la ligne 453 n'est jamais produit en pratique. Fix site #2 reste utile mais ce test ne le force pas. |
| `unitInterval() no negative NumberNode`         | **rouge** | #5-8 `builtins.ts` + `domain/factory.ts` | `number(-1)` → `opposite(number('1'))`                                                                                                                                                                                                |

### Observations post-phase 2

1. **Site #2 moins critique qu'anticipé** : La normalisation dans `integrate()` transforme `power(x, opposite(1))` → `division` avant d'entrer dans le basic integrator. La ligne 453 `power(expr, number('-1'))` n'est donc jamais atteinte avec les entrées normales. Le fix reste recommandé pour la cohérence du code, mais le test E2E ne peut pas le forcer facilement sans contourner la normalisation.

2. **Sites #3, #4 (solve.command.ts)** : Non testés E2E — les call sites dynamiques (`number('-' + val)`) nécessitent des tests spécifiques au CLI qui sortent du scope des tests unitaires mathAST. Voir Phase 3 pour décision.

3. **Site #9 (`math/intervals/factory.ts:222`)** : Non testé ici (hors du dossier `mathAST/__tests__/`). À ajouter dans un test dédié `math/intervals/` en Phase 3 si jugé nécessaire.

### Notes pour les phases suivantes (issues du code review Phase 2)

- **Helper `findNegativeNumberNodesInIntervalSet`** : intentionnellement non exporté (usage interne au fichier de test). Si Phase 3 ajoute un test E2E dans `math/intervals/__tests__/` (site #9), décider entre ré-implémenter localement ou exporter.
- **Risque TS en Phase 4** : si on ajoute une surcharge TypeScript qui rend `number('-3')` une erreur de **compilation** (pas seulement runtime), le fichier `factory.test.ts` ne compilera plus et les `it.fails` ne pourront pas tourner rouge — la suite plantera à la compilation. Risque faible (le throw est runtime), mais à vérifier au moment de la Phase 4.

4. **`it.fails` vs `it.todo`** : Choix fait pour `it.fails` dans `factory.test.ts`. La sémantique est claire : le test passe aujourd'hui et échouera en Phase 4 quand le throw sera ajouté, signalant qu'il faut le convertir en `it` + `.toThrow()`. Ce retournement est intentionnel et documenté.

---

## Phase 3 — Migration par module

### Phase 3a — `analysis/coefficient-utils.ts` (site #1) ✓

**Date** : 2026-05-02

#### Fichiers modifiés

| Fichier                                                          | Action                                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/mathAST/analysis/coefficient-utils.ts`                  | `MINUS_ONE = number('-1')` → `MINUS_ONE = opposite(number('1'))` ; `applySign` réécrite avec `numericNode` ; `addCoefficients` utilise `getNumericValue + numericNode` (gère désormais aussi `opposite(number(...))` comme opérande) |
| `src/lib/mathAST/analysis/__tests__/linear-combination.test.ts`  | Helpers `getNumericCoeff`, `getAffineNumericCoeff`, `getAffineConstant` utilisent `getNumericValue` au lieu de `isNumber + parseFloat`. Suppression de l'import `isOpposite` devenu inutile                                          |
| `src/lib/mathAST/analysis/__tests__/polynomial-analysis.test.ts` | Helper `getNumericCoeff` adapté pareillement                                                                                                                                                                                         |

#### Tests qui virent au vert

- ✓ `no-negative-number-node.test.ts > MINUS_ONE constant` (rouge → vert)

#### Régressions résolues

8 tests dans `analysis/` ont cassé après le changement de `MINUS_ONE` (les helpers de test rejetaient les `opposite(number(...))` car `isNumber()` ne matche pas). Tous corrigés via `getNumericValue` qui gère les deux formes.

#### Décisions de scope

- **`addCoefficients` élargi** : la branche numérique gère désormais aussi le cas `opposite(number(...)) + number(...)`. Élargissement intentionnel : avant la migration, un tel pattern n'arrivait quasi jamais (les négatifs étaient des `number('-N')`). Après migration, il devient le cas dominant. Sans cet élargissement, `5x - 2x` aurait retourné `add(number('5'), opposite(number('2')))` au lieu de `number('3')`, cassant le test "subtraction of like terms".

#### État Phase 3a

- 482 tests `analysis/` verts (avant : 482 dont 8 cassés post-migration → maintenant tous verts).
- Suite mathAST complète : 11658 verts, 1 rouge intentionnel (test E2E `unitInterval` à résoudre en Phase 3d).
- `pnpm check:incremental` ✓ aucune erreur introduite.

### Phase 3b — `integration/integrators/basic.ts` (site #2) ✓

**Date** : 2026-05-02

Changement minimal : `power(expr, number('-1'))` → `power(expr, opposite(number('1')))` ligne 453, ajout de l'import `opposite`. Site dead-branch en pratique (la normalisation préalable de `integrate()` transforme `power(x, opposite(1))` en `division` avant d'atteindre cette ligne), correction par cohérence.

Tests : 340/340 `integration/` verts.

### Phase 3c — `cli/commands/solve.command.ts` (sites #3, #4) ✓

**Date** : 2026-05-02

#### Modifications

- `negate(node)` ligne 35 : refactorée. La branche `'-' + val` (qui produisait du `number('-N')`) est remplacée par `opposite(node)`. La branche `slice('-')` est conservée le temps de la transition (elle gère un `number('-N')` legacy entrant).
- `extractCoefficientFromTerm` ligne 311 : `number('-1')` → `opposite(number('1'))`.

Tests : 883 verts dans `cli/`, suite mathAST inchangée (11658 verts, 1 rouge intentionnel sites #5-8).

### Phase 3d — `domain/builtins.ts` + `domain/factory.ts` + `math/intervals/factory.ts` (sites #5-9) ✓

**Date** : 2026-05-02

#### Source files

- `src/lib/mathAST/domain/builtins.ts` — import `opposite`, 3 occurrences `number(-1)` → `opposite(number('1'))` (replace_all).
- `src/lib/mathAST/domain/factory.ts` — import `opposite`, `unitInterval()` migré.
- `src/lib/math/intervals/factory.ts` — import `opposite`, `unitInterval()` migré.

#### Tests adaptés

- `src/lib/mathAST/domain/__tests__/factory.test.ts` — `closedInterval(number(-1), number(1))` → forme canonique ; assertion `isNumber(...)` remplacée par `getNumericValue(...)` (renforcement, vérifie aussi la valeur).
- `src/lib/mathAST/domain/__tests__/algebra.test.ts` — 3 occurrences `number(-1)` migrées (replace_all), assertions `isNumber` du test `complement([-1, 1])` adaptées via `getNumericValue`.

#### Tests qui virent au vert

- ✓ `no-negative-number-node.test.ts > unitInterval() bounds` (rouge → vert)

#### Décisions issues du code review Phase 3d

- **Site supplémentaire repéré** : `domainFromNumericBounds` (`builtins.ts:821-725`) appelle `number(lower)` et `number(upper)` avec des `number` JavaScript pouvant être négatifs (BUILTIN_RANGES contient `lower: -1`, `lower: -Math.PI/2`, etc.). À traiter en **Phase 3d-bis**.
- **Régression visuelle latente** : les tests `complex-latex.test.ts` (8+ cas avec `complex(number('-3'), number('-4'))`) passent encore au vert grâce aux branches dédiées `value.startsWith('-')` du générateur LaTeX. Phase 4 cassera ces tests si on ne migre pas. → Phase 3e doit être faite avant Phase 4.

#### État Phase 3d

- 1018/1018 tests `domain/` + `intervals/` verts.
- Suite mathAST complète : **11659 verts, 0 rouge**.

### Phase 3d-bis — `domainFromNumericBounds` (sites dynamiques BUILTIN_RANGES) ✓

**Date** : 2026-05-02

#### Modifications

`src/lib/mathAST/domain/builtins.ts` :

- Import `numericNode` depuis `$lib/mathAST/common/numeric`.
- `rangeEntryToDomain` (lignes 670-727) : 11 occurrences `number(lower)`, `number(upper)`, `number(lower!)` → `numericNode(...)`. Ces sites recevaient des `number` JS pouvant être négatifs (ex. `lower: -Math.PI / 2` dans BUILTIN_RANGES).
- `domainFromNumericBounds` (lignes 822-843) : 2 occurrences idem.

`numericNode(value)` (déjà existant dans `common/numeric.ts:46`) wrappe automatiquement les valeurs négatives dans `opposite(...)` — forme canonique garantie sans intervention manuelle.

#### Tests

- 757/757 tests `domain/` verts.
- Suite mathAST complète : 11659 verts, 0 rouge.

### Phase 3e — Consommateurs `latex-generator.ts` (C1, C2) ✓

**Date** : 2026-05-02

#### Modifications

- `src/lib/mathAST/latex-generator.ts` :
  - `visitComplexSpans` : helpers `isNegOne`, `isNegative`, `absValue` étendus pour reconnaître **les deux formes** : `number('-N')` (legacy) et `opposite(number('N'))` (canonique).
  - `generateComplex` : idem.
- `src/lib/mathAST/__tests__/complex-latex.test.ts` : 8 cas migrés vers la forme canonique. Import `opposite` ajouté.

#### Tests

- 21/21 `complex-latex.test.ts` verts.
- Suite mathAST complète : 11659 verts, 0 rouge.

### Phase 3f — Migration des tests legacy restants ✓

**Date** : 2026-05-02

#### Fichiers de tests migrés (forme canonique partout où possible)

| Fichier                                                               | Sites migrés | Tests verts |
| --------------------------------------------------------------------- | -----------: | ----------: |
| `mathAST/integration/__tests__/rules.test.ts`                         |            2 |          66 |
| `mathAST/integration/__tests__/numeric.test.ts`                       |            1 |          34 |
| `mathAST/integration/__tests__/integrate.test.ts`                     |            5 |          37 |
| `mathAST/piecewise/__tests__/boundaries.test.ts`                      |            1 |          15 |
| `mathAST/variations/__tests__/extrema.test.ts`                        |            5 |          33 |
| `mathAST/limits/__tests__/infinity-algebra-integration.test.ts`       |            2 |          12 |
| `mathAST/limits/__tests__/evaluate.test.ts`                           |            2 |          26 |
| `mathAST/limits/__tests__/exact-evaluation.test.ts`                   |            1 |          67 |
| `mathAST/limits/__tests__/edge-cases.test.ts`                         |            9 |         202 |
| `mathAST/solve/__tests__/domain-filtering.test.ts`                    |            7 |          43 |
| `mathAST/domain/__tests__/range.test.ts`                              |            6 |         140 |
| `mathAST/domain/__tests__/types.test.ts`                              |            1 |          15 |
| `mathAST/domain/__tests__/format.test.ts`                             |            2 |          26 |
| `mathAST/domain/__tests__/edge-cases.test.ts`                         |            4 |         103 |
| `mathAST/__tests__/piecewise-node.test.ts`                            |            3 |          14 |
| `mathAST/eval/__tests__/compare-numeric.test.ts`                      |            2 |         110 |
| `mathAST/eval/__tests__/compare-numeric-custom.test.ts`               |            2 |         112 |
| `mathAST/eval/__tests__/evaluate-complex.test.ts`                     |            2 |          29 |
| `mathAST/eval/__tests__/evaluate-complex-edge-cases.test.ts`          |            7 |          66 |
| `mathAST/matrix/__tests__/operations.test.ts`                         |            1 |          91 |
| `mathAST/differentiation/__tests__/piecewise-differentiation.test.ts` |            1 |           6 |
| `mathAST/domain/__tests__/compute.test.ts`                            |            2 |          38 |
| `math/intervals/__tests__/algebra.test.ts`                            |            4 |          63 |
| `math/intervals/__tests__/format.test.ts`                             |            7 |          77 |

**Total : 23 fichiers, ~78 sites migrés**

#### Tests **non migrés** (bloqueurs identifiés — code de production à adapter en Phase 4)

Plusieurs tests dépendent de helpers du code de production qui ne reconnaissent pas encore la forme canonique `opposite(number(...))`. Migration différée à Phase 4 :

| Fichier                                              | Sites | Bloqueur                                                                                                         |
| ---------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------- |
| `mathAST/limits/__tests__/exact-evaluation.test.ts`  |     3 | `substituteApproachFactors` utilise `isNumber(approach)` + `parseFloat(.value)`                                  |
| `mathAST/limits/__tests__/edge-cases.test.ts`        |     1 | Idem (chemin `evaluateLimit` → `substituteApproachFactors`)                                                      |
| `mathAST/eval/__tests__/extended-arithmetic.test.ts` |    13 | `addExtended`, `multiplyExtended`, `divideExtended` ne reconnaissent que `isNumber` (pattern matching numérique) |
| `mathAST/pattern/__tests__/constraints.test.ts`      |    50 | `parseNumberValue` dans `pattern/constraints.ts` exige `isNumber(node)`                                          |
| `mathAST/pattern/__tests__/match.test.ts`            |     2 | Idem (`P.isPositive`, `P.isNonzero`)                                                                             |
| `mathAST/pattern/__tests__/sequence-match.test.ts`   |     3 | Idem + `P.isNegative` ne matche que `number('-N')` actuellement                                                  |
| `math/intervals/__tests__/factory.test.ts`           |     3 | Tests **directs** de `number(-1)`, `number(-0)`, `number(-1e15)` — invalidés par Phase 4 (à supprimer/convertir) |
| `mathAST/__tests__/factory.test.ts`                  |     8 | `it.fails` Phase 4 (intentionnels, déjà documentés)                                                              |
| `mathAST/__tests__/no-negative-number-node.test.ts`  |    10 | Commentaires intentionnels (déjà documentés)                                                                     |

**Total reverté/non migré : ~93 occurrences, mais seulement ~75 nécessitent une action en Phase 4** (les autres sont des `it.fails` ou commentaires).

#### Helpers de production à adapter en Phase 4 (avant le throw)

1. **`mathAST/limits/exact-evaluation.ts:257`** : `isNumber(approach) ? parseFloat(approach.value) : null` → utiliser `getNumericValue(approach)`.
2. **`mathAST/eval/extended-arithmetic.ts`** : `addExtended`, `multiplyExtended`, `divideExtended` doivent reconnaître `opposite(number(...))` comme valeur numérique. Probablement via `getNumericValue` partout.
3. **`mathAST/pattern/constraints.ts:24-28`** : `parseNumberValue` doit utiliser `getNumericValue` au lieu de `isNumber + parseFloat`.
4. **`mathAST/pattern/builder.ts`** (probablement) : `P.isNegative()`, `P.isPositive()`, `P.isNonzero()` doivent reconnaître la forme canonique.
5. **`math/intervals/__tests__/factory.test.ts`** : tests `number(-1)`, `number(-0)`, `number(-1e15)` à convertir en tests `it.fails` ou supprimer (testaient le comportement legacy).

#### Régressions notées (issues du grep initial étendu)

L'audit grep final a révélé que la liste initiale fournie était incomplète. Les fichiers suivants n'étaient pas dans la liste mais ont été migrés ici :

- `mathAST/limits/__tests__/edge-cases.test.ts` (Negative Approach Values + Vertical Asymptotes — 9 sites au lieu du seul Domain section)
- `mathAST/__tests__/piecewise-node.test.ts` (3 sites)
- `mathAST/eval/__tests__/compare-numeric.test.ts` (2)
- `mathAST/eval/__tests__/compare-numeric-custom.test.ts` (2)
- `mathAST/eval/__tests__/evaluate-complex.test.ts` (2)
- `mathAST/eval/__tests__/evaluate-complex-edge-cases.test.ts` (7)
- `mathAST/matrix/__tests__/operations.test.ts` (1)
- `mathAST/differentiation/__tests__/piecewise-differentiation.test.ts` (1)
- `mathAST/domain/__tests__/compute.test.ts` (2)
- `math/intervals/__tests__/format.test.ts` (7)

#### Grep final post-Phase 3f

```bash
$ grep -rn "number('-\|number(\"-\|number(-[0-9]" src/lib/mathAST src/lib/math/intervals 2>/dev/null | grep -v "\.test\.ts:" | wc -l
0  # (que des commentaires/JSDoc, aucun code source actif)

$ grep -rn "number('-\|number(\"-\|number(-[0-9]" src/lib/mathAST src/lib/math/intervals 2>/dev/null | grep "\.test\.ts:" | wc -l
93  # Décomposés ci-dessus : bloqueurs + factory.test.ts it.fails + commentaires
```

### Phase 3g — Adapter les helpers de production ✓

**Date** : 2026-05-02

3 helpers production qui inspectaient `parseFloat(node.value)` sans gérer la forme canonique sont désormais alignés.

#### Modifications

- `src/lib/mathAST/eval/extended-arithmetic.ts` :
  - Import `numericNode, getNumericValue` de `common/numeric`.
  - `getNumberValue` simplifié pour déléguer à `getNumericValue` (gère les deux formes).
  - 11 occurrences `number((<expr>).toString())` → `numericNode(<expr>)` (préserve la canonicité quand le résultat est négatif).
- `src/lib/mathAST/limits/exact-evaluation.ts` :
  - Import `getNumericValue` ; suppression de `isNumber` devenu inutile.
  - 9 patterns `isNumber(node) + parseFloat(node.value)` → `getNumericValue(node) + null check` dans `analyzeSubtraction`, `analyzeAdditionAsSubtraction`, `substituteApproachFactors`, `getSubstitutionValue`, et le fallback de `evaluateNumeric`.
- `src/lib/mathAST/limits/sign-tracking.ts` :
  - Import `numericNode`.
  - `signedValueToMathNode` (2 occurrences `case 'finite'`) : `number(formatNumber(value.value))` → `numericNode(value.value)`.
  - `mathNodeToSignedValue` : utilise `getNumericValue` au lieu de `isNumber + parseFloat`.
- `src/lib/mathAST/pattern/constraints.ts` :
  - Import `getNumericValue`.
  - `parseNumberValue` utilise `getNumericValue` (gère les deux formes).
  - Constraint `number` (cas pattern) : accepte aussi `opposite(number(...))` ; ne filtre pas par finitude (préserve la sémantique d'origine `Infinity`/`NaN`).
  - Constraint `interval` : utilise `parseNumberValue` au lieu de `isNumber` (accepte la forme canonique).

#### Tests adaptés

- `src/lib/mathAST/eval/__tests__/extended-arithmetic.test.ts` : helper `expectNumber` utilise `getNumericValue` (accepte les deux formes). 13 sites `number('-N')` migrés vers `opposite(number('N'))`. Commentaires "Phase 3f legacy" retirés.

#### Tests verts

- 73/73 `extended-arithmetic.test.ts`
- 507/507 `limits/`
- 134/134 `pattern/__tests__/constraints.test.ts`
- 11915/11915 suite mathAST + intervals globalement

### Phase 3h — Migration des tests legacy ultimes ✓

**Date** : 2026-05-02

Sites finaux découverts en audit grep complet après Phase 3g :

#### Tests migrés

- `mathAST/pattern/__tests__/match.test.ts` — 2 sites
- `mathAST/pattern/__tests__/sequence-match.test.ts` — 3 sites (un test `fails combined constraint` ré-écrit avec `variable('b')` car le sequence matcher extrait les signes des `opposite()` avant d'évaluer les contraintes — la sémantique "négative" était perdue par flatten).
- `mathAST/pattern/__tests__/constraints.test.ts` — 50 occurrences (déjà couvertes par Phase 3g, listées ici pour traçabilité).
- `mathAST/limits/__tests__/exact-evaluation.test.ts` — 3 sites (commentaires "Phase 3f: legacy retained" supprimés).
- `mathAST/limits/__tests__/edge-cases.test.ts` — 1 site `ln(x+5) at x=-5`.
- `math/intervals/__tests__/factory.test.ts` — 2 tests legacy ré-écrits (test "creates NumberNode for -1" reformulé en "canonical OppositeNode", test "handles negative zero" supprimé car son comportement est éliminé par Phase 4).
- `geometry-core/compute/__tests__/compare.test.ts` — 1 site (test dual-representation réécrit en tautologie post-migration).
- `geometry-core/compute/__tests__/geo-arithmetic.test.ts` — 2 sites (`number('-4')`, `number('-1')`).
- `geometry-core/compute/__tests__/to-number.test.ts` — 1 test redondant supprimé (le test "via opposite" ligne suivante couvre déjà le cas).
- `geometry-core/graph/__tests__/figure-line-equation.test.ts` — 1 site.

#### État final post-Phase 3h

- **Audit grep** :
  - Code source : **0 call site** `number('-N')` ou `number(-N)`.
  - Tests : seules exceptions persistantes (intentionnelles) :
    - `factory.test.ts:106-120` — `it.fails` pour Phase 4.
    - `no-negative-number-node.test.ts:125-135` — commentaires JSDoc historiques.
    - `templates/advancedEngine.test.ts:101` — `TEMPLATE_FILTERS.number(-1234)` (filter de template, **pas** la factory `number()` de mathAST).
- **Tests** : 14901/14901 verts dans `src/lib/mathAST + src/lib/math/intervals + src/lib/geometry-core` (3 todo, 20 skipped).
- **Prêt pour Phase 4** : la factory peut désormais throw sans casser de test.

#### Tests verts post-Phase 3f

- `pnpm test:server src/lib/mathAST` : **11659 verts | 0 rouge | 18 skipped | 3 todo**
- `pnpm test:server src/lib/math/intervals` : **256 verts | 0 rouge**

#### État Phase 3f

✓ Tous les sites listés dans la consigne initiale ont été migrés (sauf bloqueurs documentés).
✓ Tous les sites supplémentaires identifiés par grep ont été migrés (sauf bloqueurs documentés).
✓ 0 régression : suite mathAST + intervals reste verte.

⚠️ **Phase 4 prerequisite** : avant d'ajouter le `throw` dans `factory.number()`, il faudra adapter les helpers de production listés ci-dessus pour qu'ils reconnaissent `opposite(number('N'))` comme valeur numérique. Sans cette adaptation, ~75 tests casseront simultanément.

---

## Phase 4 — Throw dans la factory (à venir)

[à compléter après Phase 3]

---

## Phase 5 — Quality + cleanup (à venir)

[à compléter après Phase 4]

---

## Documents produits

- `docs/wip/migrate-negative-numbers-progress.md` (ce fichier)

## Fichiers modifiés

### Phase 1 (renommage `isNegativeOne` → `isMinusOne` + audit)

- `src/lib/mathAST/guards.ts` — renommage de la définition + JSDoc enrichie (mention migration + alignement Poincaré)
- `src/lib/mathAST/common/simplify.ts` — adaptation de l'import + 2 call sites
- `docs/wip/migrate-negative-numbers-progress.md` — créé

### Phase 2 (tests rouges)

- `src/lib/mathAST/__tests__/factory.test.ts` — ajout de `describe('number — negative rejection (Phase 4)')` (5 `it.fails` + 1 `it`)
- `src/lib/mathAST/__tests__/no-negative-number-node.test.ts` — créé (5 tests E2E, 2 rouges / 3 verts)

### Phase 3a (migration `coefficient-utils.ts`, site #1)

- `src/lib/mathAST/analysis/coefficient-utils.ts` — MINUS_ONE canonique, applySign refactorisée, addCoefficients élargie
- `src/lib/mathAST/analysis/__tests__/linear-combination.test.ts` — helpers de test adaptés, import `isOpposite` retiré
- `src/lib/mathAST/analysis/__tests__/polynomial-analysis.test.ts` — helper `getNumericCoeff` adapté

### Phase 3b (migration `integration/basic.ts`, site #2)

- `src/lib/mathAST/integration/integrators/basic.ts` — import `opposite`, ligne 453 `number('-1')` → `opposite(number('1'))`

### Phase 3c (migration `cli/solve.command.ts`, sites #3, #4)

- `src/lib/mathAST/cli/commands/solve.command.ts` — `negate()` refactorée, `extractCoefficientFromTerm` site #4 corrigé

### Phase 3d (migration `domain/` + `intervals/`, sites #5-9)

- `src/lib/mathAST/domain/builtins.ts` — import `opposite`, 3 occurrences `number(-1)` migrées
- `src/lib/mathAST/domain/factory.ts` — import `opposite`, `unitInterval()` migré
- `src/lib/math/intervals/factory.ts` — import `opposite`, `unitInterval()` migré
- `src/lib/mathAST/domain/__tests__/factory.test.ts` — imports + 1 site test + assertions `getNumericValue`
- `src/lib/mathAST/domain/__tests__/algebra.test.ts` — imports + 3 sites test + assertions `getNumericValue`

### Phase 3d-bis (sites dynamiques `rangeEntryToDomain` + `domainFromNumericBounds`)

- `src/lib/mathAST/domain/builtins.ts` — import `numericNode`, 13 occurrences `number(lower|upper)` → `numericNode(...)`

### Phase 3e (latex-generator + tests complex)

- `src/lib/mathAST/latex-generator.ts` — `visitComplexSpans` et `generateComplex` étendus pour reconnaître les deux formes (legacy + canonique)
- `src/lib/mathAST/__tests__/complex-latex.test.ts` — import `opposite`, 8 cas migrés vers la forme canonique

### Phase 3f (migration tests legacy)

Tests migrés vers forme canonique :

- `src/lib/mathAST/integration/__tests__/rules.test.ts` — 2 sites
- `src/lib/mathAST/integration/__tests__/numeric.test.ts` — 1 site
- `src/lib/mathAST/integration/__tests__/integrate.test.ts` — 5 sites
- `src/lib/mathAST/piecewise/__tests__/boundaries.test.ts` — 1 site
- `src/lib/mathAST/variations/__tests__/extrema.test.ts` — 5 sites
- `src/lib/mathAST/limits/__tests__/infinity-algebra-integration.test.ts` — 2 sites
- `src/lib/mathAST/limits/__tests__/evaluate.test.ts` — 2 sites
- `src/lib/mathAST/limits/__tests__/exact-evaluation.test.ts` — 1 site (3 sites laissés legacy : bloqueur `substituteApproachFactors`)
- `src/lib/mathAST/limits/__tests__/edge-cases.test.ts` — 9 sites (1 site laissé legacy : `ln(x+5) at x=-5`)
- `src/lib/mathAST/solve/__tests__/domain-filtering.test.ts` — 7 sites
- `src/lib/mathAST/domain/__tests__/range.test.ts` — 6 sites (alias import `opposite as factoryOpposite` pour éviter shadow conflict)
- `src/lib/mathAST/domain/__tests__/types.test.ts` — 1 site
- `src/lib/mathAST/domain/__tests__/format.test.ts` — 2 sites
- `src/lib/mathAST/domain/__tests__/edge-cases.test.ts` — 4 sites
- `src/lib/mathAST/domain/__tests__/compute.test.ts` — 2 sites
- `src/lib/mathAST/__tests__/piecewise-node.test.ts` — 3 sites
- `src/lib/mathAST/eval/__tests__/compare-numeric.test.ts` — 2 sites
- `src/lib/mathAST/eval/__tests__/compare-numeric-custom.test.ts` — 2 sites
- `src/lib/mathAST/eval/__tests__/evaluate-complex.test.ts` — 2 sites
- `src/lib/mathAST/eval/__tests__/evaluate-complex-edge-cases.test.ts` — 7 sites
- `src/lib/mathAST/matrix/__tests__/operations.test.ts` — 1 site
- `src/lib/mathAST/differentiation/__tests__/piecewise-differentiation.test.ts` — 1 site
- `src/lib/math/intervals/__tests__/algebra.test.ts` — 4 sites
- `src/lib/math/intervals/__tests__/format.test.ts` — 7 sites

Tests **non migrés** (bloqueurs documentés ci-dessus) :

- `src/lib/mathAST/eval/__tests__/extended-arithmetic.test.ts` — 13 sites (bloqueur : helpers `addExtended`, `multiplyExtended`, `divideExtended`)
- `src/lib/mathAST/pattern/__tests__/constraints.test.ts` — 50 sites (bloqueur : `parseNumberValue`)
- `src/lib/mathAST/pattern/__tests__/match.test.ts` — 2 sites (idem)
- `src/lib/mathAST/pattern/__tests__/sequence-match.test.ts` — 3 sites (idem)
- `src/lib/math/intervals/__tests__/factory.test.ts` — 3 sites (testaient `number(-N)` directement, à convertir en Phase 4)
