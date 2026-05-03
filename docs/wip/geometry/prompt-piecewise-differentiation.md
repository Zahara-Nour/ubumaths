# Prompt — Différentiation symbolique du `PiecewiseNode`

## Contexte

Le projet UbuMaths a un nœud AST `PiecewiseNode` (mathAST) pour les fonctions par morceaux, livré récemment. Le DSL de geometry-core accepte :

```
courbe("y = { -x si x < 0, x^2 si x >= 0 }")
courbe("y = { -1 sur ]-infini ; 0[, 1 sur [0 ; +infini[ }")
```

Le rendu fonctionne, mais **la différentiation symbolique du piecewise n'est pas implémentée** :

- `src/lib/mathAST/differentiation/differentiate.ts` (case `'piecewise'`) **lève une `DifferentiationError`** « non implémenté ».
- En conséquence, dans `src/lib/geometry-core/dsl/builtins.ts:createPiecewiseFunctionFromAst`, on stocke un **placeholder** : `derivative = number('0')` et `compiledDerivative = () => 0`.

Cela impacte :

1. **`tangente(f, x0)`** sur un piecewise → retourne une tangente horizontale fausse (pente = 0).
2. **Sampler adaptatif** dans `svg-primitives.ts:functionToSVG` → reçoit dérivée constante 0, dégrade en sampling quasi-uniforme.
3. **`derivee(f)`** sur un piecewise → produit `derivee = 0` partout au lieu du vrai piecewise dérivé.

## Objectif

Implémenter la différentiation symbolique du `PiecewiseNode` :

> Mathématiquement, si `f(x) = { v_1(x) si c_1, v_2(x) si c_2, ..., otherwise v_o(x) }`,
> alors `f'(x) = { v_1'(x) si c_1, v_2'(x) si c_2, ..., otherwise v_o'(x) }`.
>
> Les conditions sont **inchangées** (la dérivée dans chaque ouvert est la dérivée
> de la branche). La (non-)dérivabilité aux raccords est un sujet d'analyse séparé
> (continuité C¹), pas du calcul de la dérivée par morceaux.

## Travail à faire

### 1. Implémenter `case 'piecewise'` dans `differentiate`

Fichier : `src/lib/mathAST/differentiation/differentiate.ts`

Remplacer le bloc actuel qui lève `DifferentiationError` par :

```typescript
case 'piecewise': {
  const newPieces = node.pieces.map((p) => ({
    condition: p.condition, // unchanged
    value: differentiate(p.value, options) // recursive
  }));
  const newOtherwise = node.otherwise !== undefined
    ? differentiate(node.otherwise, options)
    : undefined;
  return piecewise(newPieces, newOtherwise, node.metadata);
}
```

Importer `piecewise` depuis `../factory`.

**Attention** : la dérivation des conditions n'a pas de sens (ce sont des booléens, pas des fonctions à dériver). On les garde telles quelles.

### 2. Tests unitaires

Fichier : `src/lib/mathAST/differentiation/__tests__/piecewise-differentiation.test.ts` (à créer)

Couvrir au minimum :

- Dérivée de `|x|` : `{ -x si x<0, x si x>=0 }` → `{ -1 si x<0, 1 si x>=0 }`
- Dérivée de `sign(x)` : trois branches constantes → `{ 0 si x<0, 0 si x=0, 0 si x>0 }`
- Dérivée d'un polynomial par morceaux : `{ x^2 si x<1, 2x-1 si x>=1 }` → `{ 2x si x<1, 2 si x>=1 }`
- Dérivée du `otherwise` aussi calculée
- Dérivée préserve les conditions inchangées (test structurel)

Utiliser le pattern de tests existants dans `src/lib/mathAST/differentiation/__tests__/`.

### 3. Mise à jour côté geometry-core

Fichier : `src/lib/geometry-core/dsl/builtins.ts`

Remplacer dans `createPiecewiseFunctionFromAst` :

```typescript
const derivativePlaceholder = ZERO_NODE;
const compiledDerivativePlaceholder = () => 0;
```

par :

```typescript
let derivative: MathNode;
let compiledDerivative: CompiledFn;
try {
	derivative = differentiate(piecewiseNode, { variable: 'x', simplify: true });
	compiledDerivative = compile(derivative);
} catch {
	// Si la différentiation échoue (cas pathologique), garder le placeholder.
	derivative = ZERO_NODE;
	compiledDerivative = () => 0;
}
```

Vérifier les imports `differentiate` et `compile` depuis `$lib/mathAST`.

### 4. Tests E2E geometry-core

Fichier : `src/lib/geometry-core/dsl/__tests__/courbe-piecewise.test.ts`

Ajouter une section :

```typescript
describe('courbe() — piecewise differentiation', () => {
	it('produces correct derivative for |x|', () => {
		const { figure } = run('f = courbe("y = { -x si x < 0, x si x >= 0 }")');
		const fn = getFunction(figure);
		expect(fn.compiledDerivative({ x: -2 })).toBe(-1);
		expect(fn.compiledDerivative({ x: 3 })).toBe(1);
	});

	it('produces correct derivative for piecewise polynomial', () => {
		const { figure } = run('f = courbe("y = { x^2 si x < 1, 2*x - 1 si x >= 1 }")');
		const fn = getFunction(figure);
		expect(fn.compiledDerivative({ x: -2 })).toBe(-4); // 2x at x=-2
		expect(fn.compiledDerivative({ x: 3 })).toBe(2); // d/dx(2x-1) = 2
	});
});
```

### 5. Mise à jour de la documentation

- Retirer le point « Différentiation symbolique » de la section limitations dans :
  - `docs/wip/geometry/phase-d-geometry-piecewise-progress.md`
  - `docs/wip/geometry/phase-c-piecewise-node-progress.md` (point 2 du scope non-livré)
- Ajouter un commit log entry mentionnant que la limitation est levée.

### 6. Vérification visuelle (à demander à l'utilisateur)

Lancer `pnpm dev -- --port 5175` et vérifier sur `/geometry-demo/piecewise` :

- Les courbes piecewise non-constantes (ex: |x|, polynomial par morceaux) ont un sampling
  désormais adaptatif (plus dense près des fortes pentes).
- Si on ajoute `tangente(f, x0)` à un exemple, la tangente a la bonne pente.

## Contraintes techniques

- **Suivre les règles `CLAUDE.md`** : Svelte 5 runes (mais non concerné ici), code en anglais, pas de `pnpm check`/`build`/`lint` sur tout le projet (utiliser `pnpm check:incremental` à la fin).
- **TDD collaboratif** : proposer les comportements en français, attendre validation, écrire les tests d'abord.
- **Pas de `any`**.
- **Code review** par l'agent `code-reviewer` (Opus) avant commit.
- **Document de progression** : `docs/wip/geometry/phase-g-piecewise-differentiation-progress.md` après le commit.
- **Commit message** : `feat(mathAST): symbolic differentiation of PiecewiseNode`.

## Fichiers à modifier

```
src/lib/mathAST/differentiation/differentiate.ts                    (case piecewise)
src/lib/mathAST/differentiation/__tests__/piecewise-differentiation.test.ts  (NEW)
src/lib/geometry-core/dsl/builtins.ts                               (createPiecewiseFunctionFromAst)
src/lib/geometry-core/dsl/__tests__/courbe-piecewise.test.ts        (extend)
docs/wip/geometry/phase-d-geometry-piecewise-progress.md            (update limitations)
docs/wip/geometry/phase-c-piecewise-node-progress.md                (update scope)
docs/wip/geometry/phase-g-piecewise-differentiation-progress.md     (NEW)
```

## Tests attendus à la fin

- Tous les tests `mathAST/differentiation` passent (incluant les nouveaux)
- Tous les tests `geometry-core` passent (incluant les nouveaux)
- 0 régression sur la suite complète (~14600 tests)

## Hors scope

- **Continuité C¹ aux raccords** : analyser si la dérivée présente un saut au point de transition (ex: |x| a un coude à 0). Reporter si nécessaire.
- **Différentiation par rapport à autre chose que `x`** : on suppose `variable='x'` comme partout ailleurs.
- **Simplification de la dérivée** (ex: dériver une constante donne 0) : laisser au pipeline existant via `differentiate(..., { simplify: true })`.

## Référence

Mémoire associée : `~/.claude/projects/-Users-david-Coding-js-ubumaths/memory/dsl-piecewise-syntax.md`

Commits précédents pour contexte :

- `b954cd8f4` — `feat(mathAST): native PiecewiseNode AST type with compilation`
- `e0c81121b` — `feat(geometry-core): piecewise function curves in DSL`
- `b37fab674` — `feat(geometry-core): symbolic piecewise boundary analysis`
- `3ffe6e1e9` — `feat(geometry-core): resolve slider-bound piecewise boundaries`
