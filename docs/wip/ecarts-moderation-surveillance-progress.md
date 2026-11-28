---
title: Écarts — lot moderation-surveillance
date: 2026-11-28
status: en cours
---

# Écarts — lot `moderation-surveillance`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3320 ; #3324 en CI._

- **État** : #3320 mergée (C39, L109, L110, L122, M59 barrés). #3324 (L123, L124 migration, L125) en CI, `pr:merger` lancé. PR 3 (T26 : `REVIEWED_SAFE_MATHLIVE_MACROS` + garde évaluée dans `node:vm`) commitée, `security-auditor` fait (point important corrigé), pas encore ouverte · **Prochaine action** : au merge de #3324, `migration list --linked` puis `db:migrate` (4 conditions réunies) et barrer L123, L124, L125 ; ouvrir la PR 3 · **En attente de David** : D45 (lien / bouton « traité » / les deux / rien), T34 (effacer le dossier du compte seul, ou aussi interdire le dépôt), T36 (question d'accès : le modérateur lirait formules, légendes et texte au-delà de 5 000 caractères) · **Pièges en cours** : T26 ne doit jamais élargir le rendu (la liste n'est lue par aucun filtre) ; 3 messages de janvier 2026 de plus de 200 000 caractères en prod · **Worktree / branche** : `../ubumaths-wt-ecarts-moderation-surveillance-3` · `fix/ecarts-moderation-surveillance-3` (la `-2` disparaît au merge de #3324)

## Écarts du lot (12)

L109, L110, L122, L123, L124, L125, T26, T34, T36, C39, M59, D45.

## Historique

- 2026-11-28 : lot réservé, worktree ouvert.
- 2026-11-28 : PR 1. C39 (`error_critical`), L109 (Zod sur les filtres admin et la note de résolution), L110 (garde de configuration dans `freezeDetection`), L122 (effacement silencieux journalisé, test devenu ordinaire), M59 (branche admin morte retirée de la page de modération). Docs `surveillance-des-erreurs.md` et `messagerie-et-moderation.md` mises à jour.
- 2026-11-28 : #3320 mergée. David : « je te suis » sur L123 (pastille « ? »), L124 (personne ne lit rien de plus) et L125 (nom et date effacés à la réouverture). D45 sans réponse.
- 2026-11-28 : #3324 ouverte (L123, L124, L125). Revue : le chat écrit dans `messages` sans borne côté site → toast « Message trop long » sur `22001`. PR 3 préparée : T26.
