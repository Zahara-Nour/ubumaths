---
title: Suppression de la table `spreadsheets` (tableur V4)
date: 2026-10-25
status: PR 1 (migration) ouverte
---

## Reprendre ici

_Mis à jour le 2026-10-25, à l'ouverture de la PR 1._

- **État** : PR 1 = migration `20261025230000_drop_spreadsheets.sql` (table + fonction de trigger),
  test d'intégration (rouge sans, vert avec), inventaire anon 135 → 134 fonctions, doc.
- **Prochaine action** : CI verte → merge → `db:migrate` **avec l'accord de David** (destructif) →
  PR 2 : `pnpm db:types` (database.ts depuis la prod) + retrait de `spreadsheets` dans
  `scripts/generate-db-doc.ts` (sinon sa garde rougit tant que database.ts a la table).
- **En attente de David** : son accord pour `db:migrate` (1 ligne perdue, voir plus bas).
- **Worktree / branche** : `../ubumaths-wt-drop-spreadsheets` · `chore/drop-spreadsheets`.

## Ce qui est perdu

Une ligne : « Nouveau tableur », créée par un élève le 2025-12-04, modifiée le 2025-12-05,
12 cellules (536 octets). Inaccessible depuis le retrait de `/spreadsheet` (#1692, en prod
depuis v0.47.0).

## Usages (grep du 2026-10-25)

`grep -rn spreadsheets src tests scripts` : `src/lib/types/database.ts` (généré, PR 2),
`redirectHandle.test.ts` (adresses `/spreadsheets` qui ne doivent PAS rediriger : sans rapport),
`anon-option-b.test.ts` (fonction retirée de l'inventaire), `db-seed-riche/regles.ts` (retirée),
`generate-db-doc.ts` (PR 2). Prod : aucune vue, FK entrante, publication ni fonction dépendante.
