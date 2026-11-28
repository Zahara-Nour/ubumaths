---
title: Lot d'écarts carnet-notifications
date: 2026-11-28
status: en cours
---

# Lot d'écarts `carnet-notifications`

## Reprendre ici

_Mis à jour le 2026-11-28, à l'ouverture du lot._

- **État** : lot réservé, worktree créé, aucun écart vérifié.
- **Prochaine action** : vérifier chaque écart (V107, L78, L79, L80, L81, L82, L83) avant de le corriger ; phase 0 pour V107 (bug visible).
- **En attente de David** : rien.
- **Pièges en cours** : données d'élèves et de parents → revue `code-reviewer` + `security-auditor` ; L82, L83 touchent des droits (question d'accès avant tout SQL).
- **Worktree / branche** : `../ubumaths-wt-ecarts-carnet-notifications` · `fix/ecarts-carnet-notifications`.

## Écarts du lot

| Écart | Nature      | Sujet                                                                  | État       |
| ----- | ----------- | ---------------------------------------------------------------------- | ---------- |
| V107  | bug visible | notification « importante » rangée après les « normales »              | à vérifier |
| L78   | bug latent  | adresse de parent invalide restée « confirmée »                        | à vérifier |
| L79   | bug latent  | compteur d'ouvertures qui mélange lien et courriels                    | à vérifier |
| L80   | bug latent  | avertissement d'exception renvoyé après une panne de base              | à vérifier |
| L81   | bug latent  | type TypeScript des notifications plus large que la base               | à vérifier |
| L82   | bug latent  | avertissement posé par le prof dans une classe qui n'est pas la sienne | à vérifier |
| L83   | bug latent  | notification visant un élève qui a quitté les classes du prof          | à vérifier |

## Historique

- 2026-11-28 : lot pris, chantier ouvert.
