# Phase C — `PiecewiseNode` natif dans mathAST

**Date** : 2026-05-02
**Statut** : ✅ Terminé (minimum viable)
**Plan** : `docs/wip/geometry/piecewise-functions-plan.md`
**Commits précédents** :

- Phase A : `4e50d1597 refactor(intervals): use ';' as French interval bound separator`
- Phase B : `9d397a26f feat(geometry-core): domain restriction on function curves with reactive bounds`

---

## Objectif

Ajouter le nœud AST `PiecewiseNode` dans mathAST pour représenter les fonctions par morceaux (« cases »), sans encore exposer de syntaxe DSL côté geometry-core (Phase D).

## Scope livré (minimum viable pour Phase D)

### Type system

- `PiecewiseNode { type: 'piecewise', pieces: PiecewisePiece[], otherwise? }`
- `PiecewisePiece { condition: MathNode, value: MathNode }`
- Ajouté à l'union `MathNode`
- Sémantique premier-match-gagne (style Desmos / GeoGebra)

### Factory et guards

- `piecewise(pieces, otherwise?, metadata?)` — constructeur
- `piecewisePiece(condition, value)` — convenience helper
- `isPiecewise(node)` — type guard

### Visiteurs récursifs (`transforms.ts`)

- `getChildren` — retourne conditions, valeurs, otherwise
- `mapNode` (bottom-up)
- `mapNodeTopDown`
- `cloneNode`
- `stripBracketsInternal` — retire les parenthèses superflues dans les sous-expressions

### Visiteurs supplémentaires (`visitor.ts`, hors transforms.ts)

- `TYPE_TO_METHOD_NAME` — méthode `Piecewise`
- `getChildrenWithPaths` — paths `pieces[i].condition`, `pieces[i].value`, `otherwise`
- `reconstructNode` — rebuild avec `transformedChildren` map
- **Bonus** : `signed-zero` ajouté aussi (pré-existant manquant détecté par le code review)

### Compilation (`eval/compile.ts`)

- `compile(piecewiseNode)` produit une closure JS qui :
  1. Itère les pieces dans l'ordre
  2. Évalue chaque `condition` via `compileCondition`
  3. Retourne le `value` du premier branche `true`
  4. Fallback `otherwise` si aucune correspondance, sinon `NaN`
- `compileCondition` gère :
  - `BooleanNode` (true/false littéraux)
  - `LogicalNode` (`and`, `or`)
  - `LogicalNotNode`
  - `RelationNode` simple ou chaîne (`a < x <= b` via `flattenRelationChain`)
  - Opérateurs : `<`, `<=`, `>`, `>=`, `=`, `!=` + Unicode `≤`, `≥`, `≠`

### Sortie LaTeX (`latex-generator.ts`)

```latex
\begin{cases} value₁ & condition₁ \\ value₂ & condition₂ \\ otherwise & \text{sinon} \end{cases}
```

Forme symbolique standard française (sans `si`/`sur`).

### Sortie DSL custom (`custom-generator.ts`)

```
{ value₁ si condition₁, value₂ si condition₂, otherwise }
```

Forme `si` retenue par l'utilisateur (cf. mémoire `dsl-piecewise-syntax.md`).

### Cohérence avec autres modules consommateurs

- `pretty-print.ts` — case `'piecewise'` (et `'signed-zero'` bonus) ajouté avant l'exhaustive `never` check
- `differentiation/differentiate.ts` — case piecewise/boolean/logical/signed-zero pour ne plus tomber dans le `never` exhaustive ; piecewise lance une `DifferentiationError` claire (« non implémenté en Phase C »)
- `numtype/infer.ts` — case piecewise (renvoie le type commun aux branches, sinon `UNKNOWN_TYPE`) ; cases bonus pour boolean/logical/signed-zero
- Aucune régression sur les ~11600 tests mathAST

## Tests Phase C

- `src/lib/mathAST/__tests__/piecewise-node.test.ts` — **14 tests** :
  - factory + guard (3)
  - transforms : `getChildren`, `mapNode`, `cloneNode` (3)
  - compilation : single/multi/otherwise/NaN/ordering (5)
  - conditions : `and`, `or`, relation chains, complex (3)

**Total mathAST** : 11617 tests verts (1 test flaky pré-existant `bounds composition ln(sqrt)` qui passe en isolation, indépendant de Phase C).

## Scope NON livré (volontairement, suit la règle « no silent scope cuts »)

### Ce qui est explicitement reporté

1. **`evaluate()` symbolique** dans `eval/evaluate.ts` — non nécessaire pour Phase D (`compile` suffit pour le rendu).
2. ~~**`differentiate()` symbolique** des piecewises — Phase D fallback sur le sampling numérique. La différentiation par branche + analyse de raccord (continuité C¹) sera ajoutée si un usage pédagogique le demande.~~ **Levée en Phase G** : différentiation par branche implémentée, conditions inchangées. Analyse de continuité C¹ aux raccords reste hors scope.
3. **`computeDomain()` pour piecewise** — Phase D peut sampler les bornes via `getVariables`/`compile` ; pas critique.
4. **`analyzeContinuity()` aux raccords** — détection numérique des sauts via le sampler suffit pour Phase D V1.
5. **Parser custom mathAST** pour `{ ... si ... }` syntax — sera implémenté côté `geometry-core/dsl/piecewise-parser.ts` en Phase D, pas dans `mathAST/parser/custom`. Cela isole le sucre DSL côté geometry-core et garde mathAST agnostique de la syntaxe.

### Bug critique trouvé par le code-reviewer et corrigé

🔴 **`visitor.ts` — TYPE_TO_METHOD_NAME, getChildrenWithPaths, reconstructNode** ne couvraient pas `'piecewise'` (et même pas `'signed-zero'` pré-existant). Aurait causé `TS2739` à la compilation et corruption silencieuse au runtime via `transformAST`. **Fix** : tous les cases ajoutés, ainsi que les imports `PiecewiseNode`, `SignedZeroNode`, `piecewise`, `signedZero`.

🔴 **`pretty-print.ts` et `differentiation/differentiate.ts`** — exhaustive `never` check aurait fait échouer le typecheck dès qu'une expression piecewise atteint ces fonctions. **Fix** : cases ajoutés, comportement expliqué dans le code (pretty-print imprime l'arbre, differentiate lance une erreur claire).

🟡 **`numtype/infer.ts`** — switch non-exhaustif (sans default), retournait `undefined` pour piecewise/boolean/logical/signed-zero. **Fix** : cases ajoutés explicitement (UNKNOWN_TYPE pour booléens, REAL_TYPE pour signed-zero, type commun ou UNKNOWN pour piecewise).

## Modifications

| Fichier                                            | Change                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/types.ts`                         | `PiecewiseNode`, `PiecewisePiece`, ajout à l'union `MathNode`                                 |
| `src/lib/mathAST/factory.ts`                       | `piecewise()`, `piecewisePiece()`                                                             |
| `src/lib/mathAST/guards.ts`                        | `isPiecewise()`                                                                               |
| `src/lib/mathAST/transforms.ts`                    | 5 cases dans `getChildren`, `mapNode`, `mapNodeTopDown`, `cloneNode`, `stripBracketsInternal` |
| `src/lib/mathAST/eval/compile.ts`                  | Compilation piecewise + `compileCondition` (relations, logical, chains)                       |
| `src/lib/mathAST/latex-generator.ts`               | Sortie `\begin{cases}` (deux variantes : spans + simple)                                      |
| `src/lib/mathAST/custom-generator.ts`              | Sortie DSL `{ ... si ... }` (deux variantes)                                                  |
| `src/lib/mathAST/visitor.ts`                       | TYPE_TO_METHOD_NAME, getChildrenWithPaths, reconstructNode + `signed-zero`                    |
| `src/lib/mathAST/pretty-print.ts`                  | Case `piecewise`                                                                              |
| `src/lib/mathAST/differentiation/differentiate.ts` | Cases piecewise/boolean/logical/signed-zero (throw documenté)                                 |
| `src/lib/mathAST/numtype/infer.ts`                 | Cases piecewise/boolean/logical/signed-zero                                                   |
| `src/lib/mathAST/__tests__/piecewise-node.test.ts` | NOUVEAU — 14 tests                                                                            |

## Briques posées pour Phase D

- `compile(piecewiseNode)` est tout ce dont Phase D a besoin pour évaluer numériquement.
- `latex-generator` produit `\begin{cases}` directement → MathLive rend correctement.
- `custom-generator` produit `{ ... si ... }` → round-trip naturel quand le parser sera côté geometry-core.
- Les visiteurs récursifs gèrent les sous-expressions, donc tout transform existant (substitute, simplify partiels, etc.) descend correctement dans les piecewises.
- Les conditions parsent via `RelationNode`/`LogicalNode` existants — Phase D peut construire des conditions complexes (`a < x and x < b`) sans nouveau type.

## Prochaine phase

**Phase D** : Intégration piecewise dans `geometry-core`

- Parser DSL `{ expr si cond, ... }` ou `{ expr sur ]a;b[, ... }` dans `geometry-core/dsl/piecewise-parser.ts` produisant un `PiecewiseNode`
- `createCurveFromEquation` détecte `{ ... }` et délègue
- Sampler split aux frontières des conditions, détection numérique de saut, marqueurs ouverts/fermés selon les bornes des `RelationNode`
- Sérialisation round-trip
- Tests E2E
