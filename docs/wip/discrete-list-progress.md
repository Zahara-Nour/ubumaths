# Progress: Extension {{random:...}} pour listes discrètes

## Status: ✅ COMPLETE

## Résumé

Ajout du support pour la sélection aléatoire parmi une liste de valeurs discrètes.

**Syntaxe**: `{{random:a|b|c}}` ou `{{a|b|c}}` (shorthand)

## Phases

| Phase | Description        | Status  | Commit     |
| ----- | ------------------ | ------- | ---------- |
| 1     | Types et Parser    | ✅ Done | `c72006c8` |
| 2     | Tokenizer          | ✅ Done | `adbd6d73` |
| 3     | Generator/Resolver | ✅ Done | `1f17d47d` |
| 4     | Tests              | ✅ Done | (inclus)   |
| 5     | Migration          | ✅ Done | `a2cfadc0` |
| 6     | Documentation      | ✅ Done | `c59522fd` |
| 7     | Quality Checks     | ✅ Done | `2c860a3b` |

## Phase 1: Types et Parser ✅

- `discrete-list` ajouté à RandomSpec
- `parseDiscreteList()`, `hasTopLevelPipe()`, `splitAtTopLevelMultiple()`

## Phase 2: Tokenizer ✅

- `isRandomShorthand()` détecte pipes au niveau 0
- `{{a|b|c}}` reconnu comme type `'random'`

## Phase 3: Generator/Resolver ✅

- `generateFromDiscreteList()` avec résolution noms nus
- Support exclusions variables
- Return type `number | string`
- Tests inclus (18 nouveaux tests)

## Phase 4: Tests ✅

Inclus dans Phase 3:

- 10 tests unitaires random-generator
- 8 tests intégration variable-resolver
- **375/375 tests passent**

## Phase 5: Migration ✅

- `syntax-converter.ts` mis à jour
- Sortie de `$l{a;b;c}` → `{{a|b|c}}`

## Phase 6: Documentation ✅

- `docs/ref/markdown.md` mis à jour
- Section 1.2.5 Listes discrètes ajoutée
- Table RandomSpec mise à jour
- Résumé syntaxique mis à jour

## Phase 7: Quality Checks ✅

- **375/375** tests parameterization passent
- **118/118** tests syntax-converter passent
- ESLint: 0 errors
- TypeScript: 8 erreurs pré-existantes (non liées)
- Tests migration integration: 42 échecs pré-existants (non liés)
