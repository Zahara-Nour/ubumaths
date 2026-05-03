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

### Phase 3b — `integration/integrators/basic.ts` (site #2)

[à venir]

### Phase 3c — `cli/commands/solve.command.ts` (sites #3, #4)

[à venir]

### Phase 3d — `domain/builtins.ts` + `domain/factory.ts` + `math/intervals/factory.ts` (sites #5-9)

[à venir]

### Phase 3e — Consommateurs `latex-generator.ts` (C1, C2)

[à venir]

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
