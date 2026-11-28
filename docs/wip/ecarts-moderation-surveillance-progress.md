---
title: Écarts — lot moderation-surveillance
date: 2026-11-28
status: en cours
---

# Écarts — lot `moderation-surveillance`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3320._

- **État** : #3320 mergée (C39, L109, L110, L122, M59, barrés au registre). PR 2 en préparation (L123 pastille « ? », L124 borne de taille à l'envoi par trigger + toast « Message trop long », L125 résolution effacée à la réouverture), revues faites · **Prochaine action** : ouvrir la PR 2, `db:migrate` au merge (4 conditions réunies : accès tranché par David « je te suis » le 2026-11-28, test rouge sans la migration, `security-auditor` sans bloquant, additive avec rollback) ; puis T26, T34, T36 · **En attente de David** : D45 (lien vers la conversation, bouton « traité », les deux, ou rien) · **Pièges en cours** : T26 touche le rendu des contenus d'élèves, ne jamais l'élargir ; 3 messages de janvier 2026 de plus de 200 000 caractères en prod (images rangées dans le message) : pas de contrainte CHECK · **Worktree / branche** : `../ubumaths-wt-ecarts-moderation-surveillance-2` · `fix/ecarts-moderation-surveillance-2`

## Écarts du lot (12)

L109, L110, L122, L123, L124, L125, T26, T34, T36, C39, M59, D45.

## Historique

- 2026-11-28 : lot réservé, worktree ouvert.
- 2026-11-28 : PR 1. C39 (`error_critical`), L109 (Zod sur les filtres admin et la note de résolution), L110 (garde de configuration dans `freezeDetection`), L122 (effacement silencieux journalisé, test devenu ordinaire), M59 (branche admin morte retirée de la page de modération). Docs `surveillance-des-erreurs.md` et `messagerie-et-moderation.md` mises à jour.
- 2026-11-28 : #3320 mergée. David : « je te suis » sur L123 (pastille « ? »), L124 (personne ne lit rien de plus) et L125 (nom et date effacés à la réouverture). D45 sans réponse.
