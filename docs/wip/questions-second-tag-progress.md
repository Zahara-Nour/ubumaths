---
title: Second tag 1TECHNO-095 du modèle 505ee05a — journal
date: 2026-11-28
status: en attente de la réponse de David à la question d'accès
---

# Second tag 1TECHNO-095 du modèle 505ee05a

## Reprendre ici

_Mis à jour le 2026-11-28, avant la migration._

- **État** : fichier `scripts/questions/idees-1re-variables-aleatoires-neufs/f1-loi-de-x-tableau-a-completer.json`
  passé à `"rangement": { "pointsAjoutes": ["1TECHNO-095"] }` (outil 66, #3297). Aucun SQL écrit.
  · **En attente de David** : la question d'accès (proposé : personne ne gagne d'accès ; le modèle
  compte aussi pour 1TECHNO-095 dans la progression des élèves de 1re techno, qui le voient déjà).
  · **Prochaine action** : `pnpm tsx scripts/questions/migration-rangement.ts --dir scripts/questions/idees-1re-variables-aleatoires-neufs --nom idees-1re-variables-aleatoires-second-tag`
  (lit la PROD, `.env` seul), test d'intégration `migrations-rangement-tags`, `security-auditor`,
  PR, merge, `db:migrate` si les 4 conditions. · **Pièges** : le modèle est 505ee05a, PAS d683e906
  (rangé comme lui) ; si 1TECHNO-095 n'est ni sur le nœud ni sur sa notion, le script refuse.
  · **Worktree / branche** : `../ubumaths-wt-questions-second-tag`, `feat/questions-second-tag-1techno`.
