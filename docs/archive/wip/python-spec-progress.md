---
title: Spec d'un modèle à case Python qui a aussi une case ordinaire
date: 2026-11-28
status: clos (#3326, 2026-11-28)
---

# Chantier `python-spec`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3326._

- **État** : chantier clos, #3326 mergée, journal archivé. Rien à reprendre.

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
