# 0010 — Pas de re-vérification serveur du Python

- **Statut** : acceptée (no-go sur la phase 1b)
- **Date** : 2026-08-27 · **Décidée par** : David

## Contexte

La soumission d'un exercice Python fait confiance au verdict de Pyodide **dans le navigateur**,
forgeable. Une re-vérification serveur a été construite (phase 1a : noyau de validation headless
`src/lib/shared/python/validation-core/`, PR #82, en production).

## Décision

**Pas de phase 1b** (exécution serveur) : PR #83 fermée ; la branche `feat/python-recheck-1b` est
conservée sur origin, réactivable.

## Écarté

- Pyodide dans une fonction Vercel : fichiers de données à bundler, code élève CPU-bound qui bloque
  l'event loop (le timeout JS ne se déclenche pas), itérations de déploiement à l'aveugle (pas de
  previews). ROI insuffisant face à une menace étroite : le prof voit déjà le code, la maîtrise est
  formative.

## Conséquences

- Même modèle que l'ADR 0001 : le verdict Python est un outil pour l'élève, pas une note.
- **Tranché le 2026-10-13** : la table `python_submission_server_verdicts` (migration
  `20260827120000`), vide et inutilisée, est supprimée avec `run_flag_stale_python_rechecks`
  (migration `20261016103000`, en production).
