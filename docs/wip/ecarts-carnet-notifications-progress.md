---
title: Lot d'écarts carnet-notifications
date: 2026-11-28
status: en cours
---

# Lot d'écarts `carnet-notifications`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : V107, L80, L81, L83 corrigés et commités sur la branche (non poussée). L79, L82 : migration à écrire. L78 : webhook Brevo, seconde PR.
- **Prochaine action** : sur le « oui » de David, migration L82 (adhésion active exigée dans `add_warning`, `add_warnings_bulk` et la policy d'insertion) + L79 (compteur du lien seulement par le jeton du lien) ; preuves rouges sans elle ; revue `code-reviewer` + `security-auditor` ; PR.
- **En attente de David** : question d'accès de L82 / L79 (recommandation : rien ne s'ouvre, seule l'écriture se ferme ; élève archivé refusé) ; L78 en seconde PR ou laissé.
- **Pièges en cours** : L81 retire quatre choix du menu « Type » des pages de création (prof, admin) : à voir à l'écran avant la PR. `add_warning` sans appelant : ne pas le retirer ici (suppression = décision à part).
- **Worktree / branche** : `../ubumaths-wt-ecarts-carnet-notifications` · `fix/ecarts-carnet-notifications`.

## Écarts du lot

| Écart | Nature      | Sujet                                                                  | État                        |
| ----- | ----------- | ---------------------------------------------------------------------- | --------------------------- |
| V107  | bug visible | notification « importante » rangée après les « normales »              | corrigé (tri en mémoire)    |
| L78   | bug latent  | adresse de parent invalide restée « confirmée »                        | webhook Brevo, seconde PR   |
| L79   | bug latent  | compteur d'ouvertures qui mélange lien et courriels                    | migration, en attente       |
| L80   | bug latent  | avertissement d'exception renvoyé après une panne de base              | corrigé (passage en erreur) |
| L81   | bug latent  | type TypeScript des notifications plus large que la base               | corrigé                     |
| L82   | bug latent  | avertissement posé par le prof dans une classe qui n'est pas la sienne | migration, en attente       |
| L83   | bug latent  | notification visant un élève qui a quitté les classes du prof          | corrigé (adhésion active)   |

## Historique

- 2026-11-28 : lot pris, chantier ouvert.
- 2026-11-28 : V107 (phase 0 validée), L83, L80, L81 corrigés ; L82, L79 attendent la question d'accès ; L78 = webhook Brevo.
