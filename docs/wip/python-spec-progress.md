---
title: Spec d'un modèle à case Python qui a aussi une case ordinaire
date: 2026-11-28
status: relu, PR ouverte
---

# Chantier `python-spec`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR._

- **État** : règle et remplissage d'office codés et commités sur la branche, tests verts
  (`python/__tests__/python-spec.test.ts`), `check:incremental` 0 erreur, cliquet tenu, garde de doc OK.
- **Prochaine action** : relecture faite (rien de bloquant, JSDoc replacé, limites documentées) ;
  PR ouverte, `pnpm pr:merger <n>`, puis archiver ce journal.
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-python-spec` · `feat/python-spec`.

## Décision (David, 2026-11-28)

Suite de l'outil 49 (#3318, journal archivé `docs/archive/wip/outil-python-progress.md`). David a
demandé mes recommandations, puis : « je te suis ».

- Modèle dont toutes les cases sont des programmes Python : pas de spec exigée (inchangé).
- Modèle qui a aussi une case ordinaire (« donne le rang pour A = 1000 ») : spec exigée.
- Dans une spec, la case Python laissée vide (`""`) est comptée juste d'office : la spec vérifie
  vraiment la case ordinaire et ne prétend rien sur le programme.

## Code

- `review/check-template.ts` : `hasOrdinaryCase` (premier tirage de chaque variation ; tirage en
  échec = spec exigée).
- `test-spec-runner.ts` : `withPythonCasesJudged` remplit une case Python vide d'un verdict
  « juste » avant la validation ; une réponse écrite est gardée.
- Doc : `docs/systeme/questions.md` (invariant 9).
