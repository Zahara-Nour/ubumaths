---
title: Écarts — lot moderation-surveillance
date: 2026-11-28
status: en cours
---

# Écarts — lot `moderation-surveillance`

## Reprendre ici

_Mis à jour le 2026-11-28, PR 1 ouverte._

- **État** : PR 1 (C39, L109, L110, L122, M59) ouverte, revues faites (`code-reviewer` : `maxlength` de la recherche ajouté ; `security-auditor` : aucun bloquant) · **Prochaine action** : après le merge, barrer les 5 lignes au registre avec le n° de PR ; puis phase 0 de L123 et D45, question d'accès de L124, L125, T34, T36 ; T26 à regarder · **En attente de David** : L123 (forme du badge « inconnu »), D45 (décision de produit), question d'accès avant tout SQL · **Pièges en cours** : T26 touche le rendu des contenus d'élèves, ne jamais l'élargir ; L124 touche la table `messages` (zone du lot `messagerie`) · **Worktree / branche** : `../ubumaths-wt-ecarts-moderation-surveillance` · `fix/ecarts-moderation-surveillance`

## Écarts du lot (12)

L109, L110, L122, L123, L124, L125, T26, T34, T36, C39, M59, D45.

## Historique

- 2026-11-28 : lot réservé, worktree ouvert.
- 2026-11-28 : PR 1. C39 (`error_critical`), L109 (Zod sur les filtres admin et la note de résolution), L110 (garde de configuration dans `freezeDetection`), L122 (effacement silencieux journalisé, test devenu ordinaire), M59 (branche admin morte retirée de la page de modération). Docs `surveillance-des-erreurs.md` et `messagerie-et-moderation.md` mises à jour.
