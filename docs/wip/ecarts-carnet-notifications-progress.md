---
title: Lot d'écarts carnet-notifications
date: 2026-11-28
status: en cours
---

# Lot d'écarts `carnet-notifications`

## Reprendre ici

_Mis à jour le 2026-11-28, avant l'ouverture de la première PR._

- **État** : V107, L79, L80, L81, L82, L83 corrigés et commités (migration `20261128163026_…` pour L82, L79 ; preuves d'intégration vertes avec elle, en « échec attendu » sans). Revue `code-reviewer` : rien de bloquant. Menu « Type » vu à l'écran (4 choix).
- **Prochaine action** : fin de l'audit `security-auditor`, puis push et PR ; au merge, `db:migrate` seulement si David a répondu « oui » à la question d'accès. Ensuite : L78 (webhook Brevo) en seconde PR, avec sa phase 0.
- **En attente de David** : « oui » explicite à la question d'accès de L82 / L79 (rien ne s'ouvre, seule l'écriture se ferme ; élève archivé refusé).
- **Pièges en cours** : `add_warning` sans appelant : ne pas le retirer ici (suppression = décision à part).
- **Worktree / branche** : `../ubumaths-wt-ecarts-carnet-notifications` · `fix/ecarts-carnet-notifications` · serveur de dev sur 5177.

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
- 2026-11-28 : migration L82 + L79 écrite, preuves vertes ; revue de code sans bloquant.
- 2026-11-28 : V107 (phase 0 validée), L83, L80, L81 corrigés ; L82, L79 attendent la question d'accès ; L78 = webhook Brevo.
