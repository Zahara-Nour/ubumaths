# Progress: Extension {{random:...}} pour listes discrètes

## Status: Phase 1 - En cours

## Résumé

Ajout du support pour la sélection aléatoire parmi une liste de valeurs discrètes.

**Syntaxe**: `{{random:a|b|c}}` ou `{{a|b|c}}` (shorthand)

## Phases

| Phase | Description        | Status   |
| ----- | ------------------ | -------- |
| 1     | Types et Parser    | En cours |
| 2     | Tokenizer          | Pending  |
| 3     | Generator/Resolver | Pending  |
| 4     | Tests              | Pending  |
| 5     | Migration          | Pending  |
| 6     | Documentation      | Pending  |
| 7     | Quality Checks     | Pending  |

## Phase 1: Types et Parser

### Fichiers modifiés

- [ ] `src/lib/shared/parameterization/types.ts`
- [ ] `src/lib/shared/parameterization/parser/random-parser.ts`

### Décisions prises

- Type: `'discrete-list'` ajouté à RandomSpec
- Items: tableau de strings (noms nus résolus au runtime)
- Exclusions: après `!`, séparées par `,`

### Notes

- Détection pipes au niveau 0 (respecter accolades imbriquées)
- Cohérent avec le pattern de parseRandomSpec existant
