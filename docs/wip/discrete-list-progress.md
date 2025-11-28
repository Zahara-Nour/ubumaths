# Progress: Extension {{random:...}} pour listes discrètes

## Status: Phase 3 - En cours

## Résumé

Ajout du support pour la sélection aléatoire parmi une liste de valeurs discrètes.

**Syntaxe**: `{{random:a|b|c}}` ou `{{a|b|c}}` (shorthand)

## Phases

| Phase | Description        | Status   | Commit     |
| ----- | ------------------ | -------- | ---------- |
| 1     | Types et Parser    | ✅ Done  | `c72006c8` |
| 2     | Tokenizer          | ✅ Done  | `adbd6d73` |
| 3     | Generator/Resolver | En cours | -          |
| 4     | Tests              | Pending  | -          |
| 5     | Migration          | Pending  | -          |
| 6     | Documentation      | Pending  | -          |
| 7     | Quality Checks     | Pending  | -          |

## Phase 1: Types et Parser ✅

### Fichiers modifiés

- [x] `src/lib/shared/parameterization/types.ts`
- [x] `src/lib/shared/parameterization/parser/random-parser.ts`

### Fonctions ajoutées

- `hasTopLevelPipe()` - Détecte pipes au niveau 0
- `splitAtTopLevelMultiple()` - Split en respectant les accolades imbriquées
- `parseDiscreteList()` - Parser principal pour listes discrètes

### Code review: APPROVED

## Phase 2: Tokenizer ✅

### Fichiers modifiés

- [x] `src/lib/shared/parameterization/parser/tokenizer.ts`

### Fonctions ajoutées

- `hasTopLevelPipe()` (dupliqué de random-parser - TODO: extraire)
- `isRandomShorthand()` mis à jour pour détecter pipes

### Code review: APPROVED (suggestion: extraire hasTopLevelPipe dans module partagé)

## Phase 3: Generator/Resolver - En cours

### Fichiers à modifier

- [ ] `src/lib/shared/parameterization/resolver/random-generator.ts`
- [ ] `src/lib/shared/parameterization/resolver/variable-resolver.ts`

### Objectif

- `generateFromDiscreteList()` - Sélection aléatoire équiprobable
- Résolution des noms nus (variables vs littéraux)
- Support des exclusions
