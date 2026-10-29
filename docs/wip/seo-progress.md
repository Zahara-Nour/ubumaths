# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-10-29, avant la PR 1._

- **État** : PR 1 (`robots.txt` : robots d'entraînement des IA bloqués) ouverte.
- **Prochaine action** : phase 0 du glossaire en une page par terme (comportements à faire valider par David).
- **En attente de David** : validation de la phase 0 du glossaire.
- **Pièges en cours** : données structurées toujours reportées par David (2026-10-05) — ne pas les lancer.
- **Worktree / branche** : `../ubumaths-wt-seo` · `chore/seo-robots-ia`.

## Plan (validé par David le 2026-10-29 : « on commence avec tes recos »)

1. `robots.txt` : bloquer les robots d'entraînement (GPTBot, ClaudeBot, CCBot, Google-Extended…),
   garder ceux de recherche et de réponse. Pas de `llms.txt` (aucun effet sur Google).
2. Glossaire en une page par terme (`/glossaire/<terme>`), pour que chaque définition soit une
   page d'arrivée sur Google.

## Historique

- 2026-10-29 : worktree ouvert, PR 1 écrite.
