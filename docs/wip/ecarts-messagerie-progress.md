---
title: Lot d'écarts messagerie
date: 2026-11-28
status: phase 0 posée à David, aucun code
---

# Lot d'écarts `messagerie`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : écarts vérifiés dans le SQL (tous encore vrais) ; phase 0 et question d'accès posées à David, aucun code.
- **Prochaine action** : selon ses réponses, tests d'intégration rouges, puis une migration additive.
- **En attente de David** : réponses de la phase 0 ci-dessous.
- **Pièges en cours** : L127 et L131 sont le même défaut (parent d'une réponse non contrôlé).
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

## Phase 0

Posée à David le 2026-11-28 (voir la conversation) : question d'accès et comportements.
