---
title: Écarts — lot moderation-surveillance
date: 2026-11-28
status: en cours
---

# Écarts — lot `moderation-surveillance`

## Reprendre ici

_Mis à jour le 2026-11-28, PR 4 (T34, T36) en préparation._

- **État** : barrés C39, L109, L110, L122, M59, L123, L124, L125, T26 ; D45 clos (rien pour l'instant). PR 4 sur `fix/ecarts-moderation-surveillance-4` : **T34** (migration `20261128162608` : `delete_user_account` rend tout le dossier `<élève>/` du bucket des captures, lu dans `storage.objects`) et **T36** (`ReportedMessageContent` : le signalement rend le message comme le chat, en rendu restreint ; aucune migration, `get_reports_for_moderation` et la lecture du contexte rendaient déjà `content`). Tests rouges vus avant correction, verts après.
- **Prochaine action** : revues (`code-reviewer` + `security-auditor`), PR, CI, merge, puis `db:migrate` (additive, 4 conditions) et clôture du lot (versement, journal archivé, réservation levée).
- **En attente de David** : rien.
- **Pièges en cours** : L143 inscrit (pièces jointes absentes du signalement), hors lot ; aucun signalement possible sur un message privé (messagerie) : seul le chat se signale, T36 vaut donc pour le chat (le registre disait « message privé ») ; `db:migrate` : `migration list --linked` d'abord.
- **Worktree / branche** : `../ubumaths-wt-ecarts-moderation-surveillance-4` · `fix/ecarts-moderation-surveillance-4`

## Écarts du lot (12)

L109, L110, L122, L123, L124, L125, T26, T34, T36, C39, M59, D45.

## Historique

- 2026-11-28 : lot réservé, worktree ouvert.
- 2026-11-28 : PR 1. C39 (`error_critical`), L109 (Zod sur les filtres admin et la note de résolution), L110 (garde de configuration dans `freezeDetection`), L122 (effacement silencieux journalisé, test devenu ordinaire), M59 (branche admin morte retirée de la page de modération). Docs `surveillance-des-erreurs.md` et `messagerie-et-moderation.md` mises à jour.
- 2026-11-28 : #3320 mergée. David : « je te suis » sur L123 (pastille « ? »), L124 (personne ne lit rien de plus) et L125 (nom et date effacés à la réouverture). D45 sans réponse.
- 2026-11-28 : #3324 ouverte (L123, L124, L125). Revue : le chat écrit dans `messages` sans borne côté site → toast « Message trop long » sur `22001`. PR 3 préparée : T26.
- 2026-11-28 : #3324 mergée, `db:migrate` (seule migration en attente, vérifiée par `migration list --linked`), trigger vu en prod. David (« je te suis » sur mes recommandations) : D45 rien pour l'instant ; T34 effacer le dossier du compte (puis reposé : il faut du SQL) ; T36 oui sur l'accès. Prod (lecture seule) : 0 message marqué, 4 signalements, 0 capture.
- 2026-11-28 : #3327 mergée (T26).
- 2026-11-28 : David (« je te suis ») : T34 par migration de `delete_user_account` (personne ne lit rien de plus) ; T36 = rendu restreint du message dans le signalement, marquage et recherche inchangés.
- 2026-11-28 : PR 4 préparée. T34 : test d'intégration rouge (fichiers orphelins du dossier oubliés), migration, vert. T36 : test navigateur rouge (formule absente de la fenêtre), `ReportedMessageContent`, vert. Constat : seuls les messages du chat se signalent ; `plain_text` du chat est lui aussi recalculé par `extract_plain_text_from_tiptap`, même défaut.
- 2026-11-28 : revues PR 4. `code-reviewer` : rien de bloquant. `security-auditor` : rien de bloquant ; corrigés dans la PR : retrait par tranches de 1000 noms (`deleted-account-files.ts`, sinon un gros dossier ne partait jamais) et filtre « .. » retiré pour les captures (mesuré : le stockage range `<élève>/a/../5.png` en `<élève>/5.png`) ; inscrit : L143 (pièces jointes absentes de la fenêtre du signalement).
