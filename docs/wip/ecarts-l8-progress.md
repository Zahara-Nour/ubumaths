---
title: Écarts, lot 5 (L8, fin de la journalisation serveur) — journal
date: 2026-11-01
status: lot 5 mergé (#2144)
---

## Reprendre ici

_Mis à jour le 2026-11-01, après #2144._

- **État** : L8 clos, mergé (#2144, pas en prod) : plus aucun `console.*` serveur, cliquet vide ; revue + audit sans bloquant · **Prochaine action** : aucune (lot fini) · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés

---

## Lot

Fichiers : `server/documents/pdf-extractor.ts`, `dashboard/teacher/contenu/templates/(+new)/+page.server.ts`, `api/documents/+server.ts`, `api/documents/[id]/+server.ts` (avait déjà son logger), `api/documents/upload/+server.ts`, `api/latex/compile/+server.ts`, `api/teacher/categories/[classId]/+server.ts`. Les préfixes `[Templates Gallery]`, `[Document API]`, `[Categories]`… sont retirés : le logger écrit déjà `[fichier]`. Revue : aucune (remplacement mécanique, aucune logique).

## Revue (code-reviewer sonnet + security-auditor opus)

Aucun bloquant. Corrigé : en-tête de `pdf-extractor.ts` remonté au-dessus de l’import ; « contrôle d’accès impossible » distingue Suppression / Modification. Audit : rien de nouveau dans les journaux, au contraire (UUID tronqués, e-mails masqués) ; noté sans correction : un code Zod d’un seul mot (`custom`) sort `[REDACTED]`, perte négligeable (le message garde tout).
