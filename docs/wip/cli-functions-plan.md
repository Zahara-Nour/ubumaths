# CLI/REPL Function Extension - Implementation Plan

**Status**: DRAFT - Awaiting Review
**Date**: 2025-12-04
**Depends on**: Generic Functions & Differentiation (completed)
**Model par défaut**: Opus (sauf indication contraire)

---

## Overview

Extend the MathAST CLI, REPL, and Web REPL with support for:

- Generic function definitions (f, g, h)
- Symbolic differentiation
- Derivative and inverse function evaluation
- Function composition
- Taylor series expansion

---

## Requirements Summary

| Feature                 | Specification                                  |
| ----------------------- | ---------------------------------------------- |
| Function definition     | `.def f(x)=x^2` syntax                         |
| Derivative computation  | Auto-compute on definition + manual override   |
| Differentiation command | `.diff expr [var]` (default var: x)            |
| Function recognition    | Auto from bindings (re-parse with known names) |
| Web REPL                | Enhanced UI with function palette              |
| Composition             | `@` operator: `(f @ g)(3)`                     |
| Priority                | Core first, then calculus features             |

---

## New Commands

| Command   | Aliases             | Description              | Example                            |
| --------- | ------------------- | ------------------------ | ---------------------------------- |
| `.def`    | `.fn`               | Define function          | `.def f(x)=x^2`                    |
| `.def'`   | `.fn'`              | Override derivative      | `.def' f=2x`                       |
| `.fns`    | `.functions`        | List all functions       | `.fns`                             |
| `.undef`  | `.delfn`            | Remove function          | `.undef f`                         |
| `.diff`   | `.d`, `.derivative` | Differentiate expression | `.diff x^3` or `.diff x*y y`       |
| `.inv`    | `.inverse`          | Show/define inverse      | `.inv f` or `.inv f=sqrt(x)`       |
| `.taylor` | —                   | Taylor series            | `.taylor sin 5 0` (5 terms at x=0) |

---

## Architecture Changes

### 1. State Extension (eval-state.ts)

```typescript
// Current
interface EvalState {
  bindings: Map<string, MathNode>;
  mode: EvalMode;
}

// Extended
interface EvalState {
  bindings: Map<string, MathNode>;      // Variable bindings
  functions: FunctionBindings;           // Function definitions
  functionNames: Set<string>;            // For parser config
  mode: EvalMode;
}

// New operations
createFunctionBinding(state, name, params, expr): EvalState
setFunctionDerivative(state, name, derivative): EvalState
setFunctionInverse(state, name, inverse): EvalState
removeFunctionBinding(state, name): EvalState
getFunctionNames(state): string[]
```

### 2. Parser Integration

```typescript
// In pipeline.ts - getParserOptions()
function getParserOptions(state?: EvalState): ParserOptions {
	return {
		genericFunctions: state?.functionNames.size
			? {
					names: [...state.functionNames],
					allowDerivatives: true,
					allowInverse: true,
					allowComposition: true
				}
			: undefined
	};
}
```

### 3. Composition Operator (@)

Add `@` as composition operator in custom syntax:

- Tokenizer: Recognize `@` as COMPOSITION token
- Parser: Bind with BP.COMPOSITION (25)
- Generator: Output `f @ g` in custom, `f \circ g` in LaTeX

---

## Implementation Phases

### Phase 1: State Extension & Core Infrastructure

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | Medium                     |
| **Tests**      | ~20 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/cli/core/eval-state.ts`
- `src/lib/mathAST/cli/core/pipeline.ts`
- `src/lib/mathAST/cli/types.ts`
- `src/lib/mathAST/cli/core/__tests__/eval-state.test.ts`

**Tâches**:

1. Extend `EvalState` interface with functions field
2. Add function binding CRUD operations
3. Update `createEvalState()` to initialize functions
4. Modify pipeline to inject parser options from state
5. Add tests for new state operations

**Validation Phase 1**:

- [ ] Code fonctionnel
- [ ] Tests passent (`pnpm test:server src/lib/mathAST/cli/core`)
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 2: Basic Commands (.def, .fns, .undef)

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | Medium                     |
| **Tests**      | ~40 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/cli/commands/def.command.ts` (NEW)
- `src/lib/mathAST/cli/commands/fns.command.ts` (NEW)
- `src/lib/mathAST/cli/commands/undef.command.ts` (NEW)
- `src/lib/mathAST/cli/commands/index.ts`
- `src/lib/mathAST/cli/commands/__tests__/def.command.test.ts` (NEW)
- `src/lib/mathAST/cli/commands/__tests__/fns.command.test.ts` (NEW)
- `src/lib/mathAST/cli/commands/__tests__/undef.command.test.ts` (NEW)

**Tâches**:

1. Create `DefCommand` - parse `.def f(x)=expr`, extract name/params/body
2. Create `FnsCommand` - list all functions with formatted output
3. Create `UndefCommand` - remove function from state
4. Register commands in default registry
5. Add comprehensive tests for each command

**Parsing `.def f(x)=expr`**:

```typescript
// Regex: /^(\w+)\s*\(([^)]*)\)\s*=\s*(.+)$/
const match = input.match(/^(\w+)\s*\(([^)]*)\)\s*=\s*(.+)$/);
if (!match) throw new Error('Invalid syntax: .def name(params)=expr');
const [, name, paramsStr, exprStr] = match;
const params = paramsStr.split(',').map((p) => p.trim());
const expr = parseLatex(exprStr);
```

**Validation Phase 2**:

- [ ] Code fonctionnel
- [ ] Tests passent (`pnpm test:server src/lib/mathAST/cli/commands`)
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 3: Differentiation Command (.diff)

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | Low                        |
| **Tests**      | ~25 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/cli/commands/diff.command.ts` (NEW)
- `src/lib/mathAST/cli/commands/__tests__/diff.command.test.ts` (NEW)
- `src/lib/mathAST/cli/commands/index.ts`

**Tâches**:

1. Create `DiffCommand` - parse variable arg, call differentiate()
2. Handle default variable (x) vs explicit
3. Pass function bindings from state
4. Format output (LaTeX + custom)
5. Add tests

**Usage**:

```
.diff x^3           → 3x²  (default var: x)
.diff x*y^2 y       → 2xy  (explicit var: y)
.diff f(x)          → f'(x) or expanded if f is defined
```

**Validation Phase 3**:

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 4: Auto-compute Derivatives + Override (.def')

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | Medium                     |
| **Tests**      | ~30 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/cli/commands/def.command.ts` (update)
- `src/lib/mathAST/cli/commands/def-deriv.command.ts` (NEW)
- `src/lib/mathAST/cli/commands/__tests__/def-deriv.command.test.ts` (NEW)

**Tâches**:

1. On `.def f(x)=expr`, auto-compute derivative via `differentiate()`
2. Store in FunctionDefinition.derivative
3. Create `DefDerivCommand` for `.def' f=expr` override
4. Handle multi-variable functions (partial derivatives)
5. Add tests

**Validation Phase 4**:

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 5: Inverse Functions (.inv)

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | Medium                     |
| **Tests**      | ~20 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/cli/commands/inv.command.ts` (NEW)
- `src/lib/mathAST/cli/commands/__tests__/inv.command.test.ts` (NEW)

**Tâches**:

1. Create `InvCommand` - display or define inverse
2. `.inv f` - show current inverse (if defined)
3. `.inv f=expr` - define/override inverse
4. Integrate with evaluation (f^{-1}(x))
5. Add tests

**Note**: Auto-computing inverses is complex (not all functions have closed-form inverses). Manual definition only.

**Validation Phase 5**:

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 6: Composition Operator (@)

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | Medium-High                |
| **Tests**      | ~30 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/parser/custom/tokenizer.ts`
- `src/lib/mathAST/parser/custom/parser-pratt.ts`
- `src/lib/mathAST/custom-generator.ts`
- `src/lib/mathAST/cli/core/pipeline.ts`
- `src/lib/mathAST/parser/custom/__tests__/*.test.ts` (updates)

**Tâches**:

1. Add `@` token type (AT or COMPOSE)
2. Parse `f @ g` as CompositionNode
3. Generate `f @ g` in custom syntax
4. Handle `(f @ g)(x)` evaluation via applyComposition
5. Add tests for parsing and evaluation

**Validation Phase 6**:

- [ ] Code fonctionnel
- [ ] Tests passent (parser + CLI)
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 7: Taylor Series (.taylor)

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | High                       |
| **Tests**      | ~40 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/taylor/types.ts` (NEW)
- `src/lib/mathAST/taylor/expand.ts` (NEW)
- `src/lib/mathAST/taylor/index.ts` (NEW)
- `src/lib/mathAST/taylor/__tests__/taylor.test.ts` (NEW)
- `src/lib/mathAST/cli/commands/taylor.command.ts` (NEW)
- `src/lib/mathAST/cli/commands/__tests__/taylor.command.test.ts` (NEW)

**Tâches**:

1. Create Taylor expansion algorithm:
   - Compute n-th derivatives
   - Evaluate at point x0
   - Build polynomial sum
2. Create `TaylorCommand`
3. Handle special functions (sin, cos, exp, ln)
4. Format output as polynomial
5. Add tests

**Usage**:

```
.taylor sin 5 0     → x - x³/6 + x⁵/120  (5 terms at x=0)
.taylor exp 4 0     → 1 + x + x²/2 + x³/6
.taylor f 3 1       → Taylor of f(x) at x=1, 3 terms
```

**Validation Phase 7**:

- [ ] Code fonctionnel
- [ ] Tests passent (`pnpm test:server src/lib/mathAST/taylor`)
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 8: Web REPL Enhancement

| Aspect         | Detail                                             |
| -------------- | -------------------------------------------------- |
| **Agent**      | `frontend-developer` (opus) pour composants Svelte |
| **Agent**      | `backend-developer` (opus) pour WebReplEngine      |
| **Complexité** | High                                               |
| **Tests**      | ~30 nouveaux                                       |

**Fichiers**:

- `src/lib/mathAST/cli/web/web-repl-engine.ts`
- `src/lib/mathAST/cli/web/output-formatter-web.ts`
- `src/lib/mathAST/cli/web/types.ts`
- `src/lib/components/mathAST/FunctionPalette.svelte` (NEW)
- `src/lib/components/mathAST/FunctionCard.svelte` (NEW)

**Tâches**:

1. Expose function state in WebReplEngine
2. Add HTML formatting for function output
3. Create function palette component (Svelte 5 runes):
   - List defined functions
   - Show f(x), f'(x), f^{-1}(x) if defined
   - Click to insert into input
4. Visual indicators for:
   - Auto-computed vs manual derivatives
   - Function dependencies
5. Add CSS classes for function styling (Tailwind)
6. Integration tests

**Components** (Svelte 5):

```svelte
<!-- FunctionPalette.svelte -->
<script lang="ts">
	let { functions, onInsert }: Props = $props();
	// ...
</script>
```

**Validation Phase 8**:

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] `code-reviewer` (sonnet) - review composants Svelte
- [ ] `svelte-expert` MCP tool - vérification patterns Svelte 5
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 9: CLI REPL Updates

| Aspect         | Detail                     |
| -------------- | -------------------------- |
| **Agent**      | `backend-developer` (opus) |
| **Complexité** | Low                        |
| **Tests**      | ~15 nouveaux               |

**Fichiers**:

- `src/lib/mathAST/cli/repl.ts`
- `src/lib/mathAST/cli/__tests__/repl.test.ts` (update)

**Tâches**:

1. Update REPL to pass evalState with functions to commands
2. Add inline function definition: `f(x) = x^2` (without .def)
3. Auto-evaluate function calls when function is defined
4. Update help text
5. Add integration tests

**Validation Phase 9**:

- [ ] Code fonctionnel
- [ ] Tests passent
- [ ] `code-reviewer` (sonnet) - review qualité
- [ ] Commit après validation
- [ ] Mise à jour `docs/wip/cli-functions-progress.md`

---

### Phase 10: Documentation & Final Checks

| Aspect         | Detail                         |
| -------------- | ------------------------------ |
| **Agent**      | `documentation-writer` (haiku) |
| **Complexité** | Low                            |

**Fichiers**:

- `docs/ref/mathAST.md`
- `docs/wip/cli-functions-progress.md` → archiver

**Tâches**:

1. Document all new commands in mathAST.md
2. Add usage examples
3. Update CLI section
4. Add troubleshooting section
5. Create quick-reference card

**Validation Finale**:

- [ ] `pnpm lint` - 0 errors
- [ ] `pnpm check` - 0 errors
- [ ] `pnpm test:server src/lib/mathAST` - all pass
- [ ] Documentation complète
- [ ] Commit final
- [ ] Archiver `cli-functions-progress.md`

---

## Test Summary

| Phase                | New Tests | Cumulative |
| -------------------- | --------- | ---------- |
| 1. State Extension   | 20        | 20         |
| 2. Basic Commands    | 40        | 60         |
| 3. Diff Command      | 25        | 85         |
| 4. Auto Derivatives  | 30        | 115        |
| 5. Inverse Functions | 20        | 135        |
| 6. Composition @     | 30        | 165        |
| 7. Taylor Series     | 40        | 205        |
| 8. Web REPL          | 30        | 235        |
| 9. CLI REPL          | 15        | 250        |
| **Total**            | **250**   |            |

---

## Agents par Phase (Résumé)

| Phase | Agent Principal                            | Model | Code Review                           |
| ----- | ------------------------------------------ | ----- | ------------------------------------- |
| 1     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 2     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 3     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 4     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 5     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 6     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 7     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 8     | `frontend-developer` + `backend-developer` | opus  | `code-reviewer` (sonnet) + MCP svelte |
| 9     | `backend-developer`                        | opus  | `code-reviewer` (sonnet)              |
| 10    | `documentation-writer`                     | haiku | —                                     |

---

## File Changes Summary

### New Files

```
src/lib/mathAST/cli/commands/
├── def.command.ts           # .def f(x)=expr
├── def-deriv.command.ts     # .def' f=expr
├── fns.command.ts           # .fns
├── undef.command.ts         # .undef f
├── diff.command.ts          # .diff expr [var]
├── inv.command.ts           # .inv f[=expr]
└── taylor.command.ts        # .taylor f n x0

src/lib/mathAST/taylor/      # Taylor series module
├── types.ts
├── expand.ts
├── index.ts
└── __tests__/
    └── taylor.test.ts

src/lib/components/mathAST/  # Web REPL components
├── FunctionPalette.svelte
└── FunctionCard.svelte
```

### Modified Files

```
src/lib/mathAST/cli/core/eval-state.ts    # Add functions field
src/lib/mathAST/cli/core/pipeline.ts      # Parser options from state
src/lib/mathAST/cli/types.ts              # Extended types
src/lib/mathAST/cli/commands/index.ts     # Register new commands
src/lib/mathAST/cli/repl.ts               # Inline function syntax
src/lib/mathAST/cli/web/web-repl-engine.ts
src/lib/mathAST/cli/web/output-formatter-web.ts
src/lib/mathAST/cli/web/types.ts
src/lib/mathAST/parser/custom/tokenizer.ts  # @ token
src/lib/mathAST/parser/custom/parser-pratt.ts  # @ parsing
src/lib/mathAST/custom-generator.ts         # @ output
docs/ref/mathAST.md
```

---

## Usage Examples

### Basic Function Definition

```
> .def f(x) = x^2 + 2x - 3
Defined f(x) = x² + 2x - 3
  f'(x) = 2x + 2 (auto-computed)

> f(3)
12

> f'(3)
8

> .fns
Functions:
  f(x) = x² + 2x - 3
    f'(x) = 2x + 2
```

### Differentiation

```
> .diff sin(x^2)
2x cos(x²)

> .diff x*y^2 y
2xy
```

### Composition

```
> .def f(x) = x^2
> .def g(x) = x + 1
> (f @ g)(3)
16  // f(g(3)) = f(4) = 16

> f @ g
f ∘ g
```

### Inverse Functions

```
> .def f(x) = x^2
> .inv f = sqrt(x)
Defined f⁻¹(x) = √x

> f^{-1}(9)
3
```

### Taylor Series

```
> .taylor sin 5 0
x - x³/6 + x⁵/120

> .taylor exp 4 0
1 + x + x²/2 + x³/6 + x⁴/24
```

---

## Risk Assessment

| Risk                       | Likelihood | Impact | Mitigation                            |
| -------------------------- | ---------- | ------ | ------------------------------------- |
| Parser conflicts with @    | Medium     | High   | Thorough testing, fallback to \circ   |
| Taylor series complexity   | High       | Medium | Start with standard functions, expand |
| Web REPL state sync        | Medium     | Medium | Careful state management, tests       |
| Auto-derivative edge cases | Medium     | Low    | Fallback to manual, error messages    |

---

## Open Questions

1. **Web component location**: `src/lib/components/mathAST/` (proposé)
2. **Taylor series scope**: Univariate only for MVP
3. **Function persistence**: localStorage pour Web REPL? (à décider)
4. **Undo support**: Non pour MVP

---

## Checklist d'Approbation

- [ ] Phases et tâches approuvées
- [ ] Agents et modèles approuvés
- [ ] Syntaxe des commandes approuvée
- [ ] Architecture approuvée
- [ ] Questions ouvertes résolues
- [ ] Prêt à implémenter

---

## Documents Produits (à la fin)

1. `docs/wip/cli-functions-progress.md` - Progression (archivé à la fin)
2. `docs/ref/mathAST.md` - Documentation mise à jour
3. Tests: ~250 nouveaux tests

---

## Next Steps

Après approbation:

1. Créer `docs/wip/cli-functions-progress.md`
2. Démarrer Phase 1 avec `backend-developer` (opus)
3. Commit après chaque phase validée
4. Quality checks (`pnpm lint`, `pnpm check`) à la fin uniquement
