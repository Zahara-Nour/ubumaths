---
title: Écarts — lot moderation-surveillance
date: 2026-11-28
status: en cours
---

# Écarts — lot `moderation-surveillance`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3327._

- **État** : #3320 et #3324 mergées, migration L124 en prod (trigger vérifié). Barrés : C39, L109, L110, L122, M59, L123, L124, L125 ; D45 clos (rien pour l'instant, décision de David) ; T26 corrigé (#3327). Restent **T34, T36** · **Prochaine action** : une PR pour les deux (tests d'intégration rouges d'abord, `security-auditor`). **T34** (tranché, 2026-11-28) : migration de `delete_user_account`, tout le dossier `<élève>/` du bucket `bug-report-screenshots` lu dans `storage.objects`. **T36** (tranché, 2026-11-28) : le signalement montre le message tel que le destinataire l'a vu (rendu restreint, formules et images comprises) ; `get_reports_for_moderation` rend le contenu ; `extract_plain_text_from_tiptap`, le marquage et la recherche NE changent PAS. Ancienne note : T36 en phase 0 (exemples : formule, légende d'image, bloc ; la fonction `extract_plain_text_from_tiptap` sert AUSSI au marquage du chat et à la recherche, donc l'étendre change ce que le filtre repère) ; T34 par migration de `delete_user_account` (dossier `<élève>/` du bucket `bug-report-screenshots`, lu dans `storage.objects`) · **En attente de David** : rien · **Pièges en cours** : T36 tranché sur l'accès (oui), pas sur la forme ; 3 messages de janvier de plus de 200 000 caractères en prod · **Worktree / branche** : aucun (tous retirés) ; prochain : `../ubumaths-wt-ecarts-moderation-surveillance-4` · `fix/ecarts-moderation-surveillance-4`

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
