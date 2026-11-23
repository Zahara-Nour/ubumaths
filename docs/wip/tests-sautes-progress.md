# tests-sautes

## Reprendre ici

_Mis à jour le 2026-11-01, avant la première PR._

- **État** : 13 `it.skip` « not in browser » des stores remplacés par `gardes-ssr.test.ts` (projet server) · **Prochaine action** : merger la PR · **En attente de David** : rien · **Pièges en cours** : le mock de `$app/environment` est figé en Chromium (projet client), d'où le fichier server · **Worktree / branche** : `ubumaths-wt-tests-sautes` / `test/tests-sautes`

## Journal

- Mock mutable (getter, objet hoisted) essayé dans les `*.svelte.test.ts` : sans effet en mode navigateur.
- Gardes `!browser` retirées temporairement des 3 stores : les 13 nouveaux tests échouent (annulé).
