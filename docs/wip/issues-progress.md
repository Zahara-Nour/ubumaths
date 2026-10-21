# issues — tri des issues et PR ouvertes sur GitHub

## Reprendre ici

_Mis à jour le 2026-10-21, après #1593._

- **État** : flakes CI corrigés (#1447, #1586, #1590, #1591), dépendances sécurisées (#1593, audit prod 0) ; triages #130 #879 #921 #978 #1237 #1511 #1549 #1571 et #1529 fermés · **Prochaine action** : aucune côté code · **En attente de David** : fermer les PR remplacées #1459 #1316 #1512 #1207 (`gh pr close … --delete-branch`) ; changer les mots de passe des comptes prod teacher@/student@/admin@ puis fermer #71 et #74 ; `deploy:prod` pour livrer #1447 et #1593 · **Pièges en cours** : le mode auto refuse `gh issue/pr close` (David les lance avec `!`) · **Worktree / branche** : aucun (dépôt principal, `main`)

## Historique

- Restent ouverts volontairement : #1078 (Core Web Vitals) et #89 (hygiène hebdo), rapports des routines ; #1592 (inscription parent), autre session.
- Flake non traité : `questions-de-cours.test.ts` (timeout 5 s, une seule occurrence, test mocké) — à reprendre s'il revient au triage.
- Journaux des chantiers : `docs/archive/{tableur-chrono,typst-polices,atelier-attente,deps-securite}-progress.md`.
