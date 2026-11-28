---
title: Lot d'écarts messagerie
date: 2026-11-28
status: lot codé, PR à ouvrir
---

# Lot d'écarts `messagerie`

## Reprendre ici

_Mis à jour le 2026-11-28, avant l'ouverture de la PR._

- **État** : tout le lot codé sur la branche (migration `20261128161241`, Zod, `replyRecipientId`, code mort) ; tests verts (16 fichiers d'intégration messagerie, unitaires) ; V135 vu à l'écran ; `code-reviewer` sans bloquant.
- **Prochaine action** : relancer `security-auditor` sur `git diff origin/main...HEAD` (le premier tournait encore au `/clear`, résultat perdu), puis push, PR, merge, puis `db:migrate` (additive) et clôture du lot (registre, `ecarts-lots.md`, archive du journal).
- **En attente de David** : rien.
- **Pièges en cours** : L135 clos sans code (invariant mono-professeur) ; L84 : preuve passée de `it.fails` à `it` dans `ecarts-messagerie.test.ts`, fichier partagé avec le lot `carnet-notifications`.
- **Worktree / branche** : `../ubumaths-wt-ecarts-messagerie` · `fix/ecarts-messagerie`.

## Écarts (11)

V135, L84, L127, L131, L132, L133, L134, L135, T37, M41, C44.

## Vérification (2026-11-28)

Dernière définition des fonctions : `20261126132310_messagerie_noms_et_message_de_classe.sql`.

- L127 = L131 : `send_private_message` lit `thread_root_id` du parent sans vérifier que l'appelant l'a envoyé ou reçu.
- L132 : `p_is_group_message` et `p_class_id` enregistrés tels quels quand l'envoi n'est pas à une classe.
- L133 : `get_message_details` et `get_message_thread` ne lisent pas `message_inbox.deleted`.
- L134 : aucun dédoublonnage des destinataires (ni Zod, ni SQL).
- L84 : `validate_message_recipients` (20260618093000) accepte tout `role = 'student'`, test compris ; la liste exclut `is_test`.
- L135 : branche élève de `get_allowed_recipients` sans filtre `is_test`.
- V135 : `replyRecipientId` (`src/lib/utils/message-reply.ts`) propose de répondre à tout expéditeur, admin compris.
- T37, M41, C44 : mécaniques, sans question.

## Phase 0 — tranchée par David le 2026-11-28 (« je te suis »)

Question d'accès : personne ne lit rien de nouveau, chaque point retire un accès.

1. Réponse seulement à un message envoyé ou reçu (L127, L131) ; refus « Vous ne pouvez pas répondre à ce message. »
2. Comptes de test exclus : le prof n'écrit plus à un élève de test (L84). L135 : **faux**, l'invariant mono-professeur interdit tout second compte prof → clos sans code.
3. Message supprimé par son destinataire : plus ouvert, ni seul ni dans le fil ; l'expéditeur garde le sien (L133).
4. Étiquette de classe ignorée hors envoi à une classe (L132), sans refus.
5. Destinataire en double compté une fois, sans erreur (L134), en Zod et en SQL.
6. Pas de « Répondre » sur un message de l'admin pour l'élève (V135) ; règle de `validate_message_recipients` côté page.

Sans question : T37 (droits retirés sur `message_search_index`), M41 (store + route de recherche), C44 (tests d'envoi périmés de `api-routes.test.ts` retirés, `send.test.ts` les couvre).

## Fait

- Tests rouges vérifiés avant la migration : 12 rouges, 6 témoins verts (`messagerie-ecarts-lot.test.ts`).
- Revue `code-reviewer` : 0 bloquant ; mineur 2 corrigé (message de refus propre), mineurs 1 et 3 consignés dans la doc / laissés (répondre à un message qu'on a supprimé reste accepté, sans enjeu d'accès).
