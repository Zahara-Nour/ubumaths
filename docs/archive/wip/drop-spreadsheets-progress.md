---
title: Suppression de la table `spreadsheets` (tableur V4)
date: 2026-10-25
status: CLOS le 2026-10-25 (#1730 + PR 2, db:migrate joué)
---

## Reprendre ici

_Mis à jour le 2026-10-25, chantier clos._

- **État** : CLOS. #1730 (migration, test d'intégration, doc) mergée ; `db:migrate` joué le
  2026-10-25 avec l'accord de David (table et fonction absentes de la prod, vérifié) ; PR 2 :
  `database.ts` régénéré depuis la prod, `spreadsheets` retirée de `scripts/generate-db-doc.ts`.
- **Doc durable** : [outils-prof.md § 3](../../systeme/outils-prof.md).
- **Prochaine action** : aucune.

## Ce qui est perdu

Une ligne : « Nouveau tableur », créée par un élève le 2025-12-04, modifiée le 2025-12-05,
12 cellules (536 octets). Inaccessible depuis le retrait de `/spreadsheet` (#1692, en prod
depuis v0.47.0).

## Usages (grep du 2026-10-25)

`grep -rn spreadsheets src tests scripts` : `src/lib/types/database.ts` (généré, PR 2),
`redirectHandle.test.ts` (adresses `/spreadsheets` qui ne doivent PAS rediriger : sans rapport),
`anon-option-b.test.ts` (fonction retirée de l'inventaire), `db-seed-riche/regles.ts` (retirée),
`generate-db-doc.ts` (PR 2). Prod : aucune vue, FK entrante, publication ni fonction dépendante.
