---
title: Lot d'écarts carnet-notifications
date: 2026-11-28
status: en cours
---

# Lot d'écarts `carnet-notifications`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3333._

- **État** : #3333 mergée (V107, L79, L80, L81, L82, L83). Migration `20261128163026_avertissement_adhesion_active_compteur_lien_parent.sql` sur `main`, **pas encore jouée en prod**. Reste L78. Worktree et branche retirés.
- **Prochaine action** : (1) avec le « oui » de David : `pnpm exec supabase migration list --linked` (une seule en attente, la nôtre, sinon stop) puis `pnpm db:migrate` depuis le dépôt principal ; (2) L78 en PR 2 : nouveau worktree `../ubumaths-wt-ecarts-carnet-notifications` depuis `origin/main`, phase 0 du webhook Brevo (adresse invalide → statut `invalid`, ce que voit le prof ; l'écran sait déjà l'afficher), gestes de David : déclarer l'adresse dans Brevo, secret dans Vercel.
- **En attente de David** : « oui » explicite à la question d'accès (personne ne lit rien de plus ; le prof perd l'avertissement hors adhésion active et la notification nominative à un élève parti ; élève archivé refusé).
- **Pièges en cours** : la migration est mergée : le `db:migrate` d'une autre session la jouerait aussi. `add_warning` sans appelant : sa suppression est une décision à part. L'empreinte de la policy des notifications est figée dans `tests/integration/anon-preparation.test.ts`.
- **Worktree / branche** : aucun (retirés par `pr:merger`).

## Écarts du lot

| Écart | Nature      | Sujet                                                                  | État                        |
| ----- | ----------- | ---------------------------------------------------------------------- | --------------------------- |
| V107  | bug visible | notification « importante » rangée après les « normales »              | corrigé (tri en mémoire)    |
| L78   | bug latent  | adresse de parent invalide restée « confirmée »                        | webhook Brevo, seconde PR   |
| L79   | bug latent  | compteur d'ouvertures qui mélange lien et courriels                    | corrigé (migration)         |
| L80   | bug latent  | avertissement d'exception renvoyé après une panne de base              | corrigé (passage en erreur) |
| L81   | bug latent  | type TypeScript des notifications plus large que la base               | corrigé                     |
| L82   | bug latent  | avertissement posé par le prof dans une classe qui n'est pas la sienne | corrigé (migration)         |
| L83   | bug latent  | notification visant un élève qui a quitté les classes du prof          | corrigé (adhésion active)   |

## Historique

- 2026-11-28 : lot pris, chantier ouvert.
- 2026-11-28 : #3333 mergée (empreinte de la policy des notifications mise à jour dans `anon-preparation.test.ts` après la première CI).
- 2026-11-28 : audit de sécurité : preuves de `add_warnings_bulk`, de l'insertion directe et de l'élève archivé ajoutées ; policy des notifications (L83) dans la migration.
- 2026-11-28 : migration L82 + L79 écrite, preuves vertes ; revue de code sans bloquant.
- 2026-11-28 : V107 (phase 0 validée), L83, L80, L81 corrigés ; L82, L79 attendent la question d'accès ; L78 = webhook Brevo.
