# Phase 6: Re-export Questions

Status: completed
Date: 2025-11-28 11:35

## Export effectué

- Dossier: `data/migration-output/export-2025-11-28/`
- Total: 633 questions exportées
- Success: 633 (100%)
- Warnings: 375
- Errors: 0

## Statistiques shared fields

- Questions avec `shared`: 325 (51.3%)
- Proche des 328 estimées (99%)

## Exemple vérifié

```json
{
  "type": "numerical_exact",
  "title": "Connaître la position décimale",
  "shared": {
    "variables": [
      { "name": "1", "expression": "{{1-9}}" },
      { "name": "2", "expression": "{{0-9!{{1}}}}" },
      ...
    ]
  },
  "variations": [
    { "statement": "...", "answer": "{{1}}" },
    { "statement": "...", "answer": "{{2}}" },
    { "statement": "...", "answer": "{{3}}" }
  ]
}
```

## Prochaines étapes

- Phase 7: Quality checks (lint, check, build, tests)

## Commandes exécutées

- `pnpm tsx scripts/export-questions-for-review.ts` → OK
- `grep -r '"shared"' data/migration-output/.../by-category/ | wc -l` → 325
