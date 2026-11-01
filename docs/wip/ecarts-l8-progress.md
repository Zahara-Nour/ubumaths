---
title: Écarts, lot 5 (L8, fin de la journalisation serveur) — journal
date: 2026-11-01
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-01, avant la PR._

- **État** : 19 `console.error` des 8 derniers fichiers passés à `createServerLogger` ; cliquet vide (`{}`) ; typecheck 0 ; garde doc : aucun trou (zones documentées depuis le lot 3) · **Prochaine action** : PR, CI, merge · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-ecarts-l8` (`fix/ecarts-l8`)

---

## Lot

Fichiers : `server/documents/pdf-extractor.ts`, `dashboard/teacher/contenu/templates/(+new)/+page.server.ts`, `api/documents/+server.ts`, `api/documents/[id]/+server.ts` (avait déjà son logger), `api/documents/upload/+server.ts`, `api/latex/compile/+server.ts`, `api/teacher/categories/[classId]/+server.ts`. Les préfixes `[Templates Gallery]`, `[Document API]`, `[Categories]`… sont retirés : le logger écrit déjà `[fichier]`. Revue : aucune (remplacement mécanique, aucune logique).

## Revue (code-reviewer sonnet + security-auditor opus)

Aucun bloquant. Corrigé : en-tête de `pdf-extractor.ts` remonté au-dessus de l’import ; « contrôle d’accès impossible » distingue Suppression / Modification. Audit : rien de nouveau dans les journaux, au contraire (UUID tronqués, e-mails masqués) ; noté sans correction : un code Zod d’un seul mot (`custom`) sort `[REDACTED]`, perte négligeable (le message garde tout).
