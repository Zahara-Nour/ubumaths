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

## Phase 2 — Tests rouges (à venir)

[à compléter après Phase 1]

---

## Phase 3 — Migration par module (à venir)

[à compléter après Phase 2]

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
