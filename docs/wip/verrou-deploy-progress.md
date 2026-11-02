# Chantier `verrou-deploy`

## Reprendre ici

_Mis à jour le 2026-11-02, phase 0 rédigée._

- **État** : phase 0 (comportements + choix de piste) proposée à David, aucun code.
- **Prochaine action** : après validation, tests rouges dans `scripts/__tests__/deploy-prod.test.ts`, puis le code.
- **En attente de David** : validation de la piste et des questions Q1-Q5 ci-dessous.
- **Pièges en cours** : ne jamais lancer `pnpm deploy:prod` soi-même.
- **Worktree / branche** : `../ubumaths-wt-verrou-deploy`, `fix/verrou-deploy`.

## Problème

`pnpm deploy:prod` tient le verrou « deploy » (`scripts/lib/lock.py`, flock + execvp) seulement pendant que `scripts/deploy-prod.sh` tourne. Dès qu'il s'arrête (`arreter`), le verrou est relâché, les sessions fusionnent, et leurs pushes annulent la CI de la version en attente (groupe de concurrence de `quality.yml` : un seul run en attente par ref).

### Incident du 2026-11-02 (vérifié par `gh api …/activity` et `gh run view`)

- 09:20:44 UTC : push de v0.63.0 (`9f8558521`).
- Run 41419872530, tentative 1 : shard navigateur 1/2 rouge, `TypeError: Cannot read properties of undefined (reading 'wrapDynamicImport')` ; « CI Summary » rouge à 09:29:30 ; script arrêté, verrou relâché.
- 09:29:43, 09:29:49, 09:29:50 : trois merges (#2228, puis #2227, #2226) ; 09:30:41 push ; 09:34:56 #2230.
- Relance du job, lancée hors verrou : run conclu `cancelled` à 09:35:01. Prod restée en v0.62.0.

### Diagnostic du 2026-11-01 (mémoire `project_chantier-verrou-deploy`)

1. Course TOCTOU dans `.claude/hooks/garde-commandes.py` (jugé au lancement de la commande seulement).
2. Trou entre deux lancements (cause de l'incident ci-dessus).
3. Formes non vues par le hook : `gh api …/merge`, `bash -c "git push"`, scripts qui poussent.

## Phase 0 — proposition

Voir le message de phase 0 de la session (comportements N/L/E, piste recommandée A + C + D, questions Q1-Q5). Recopié ici après validation.
