---
title: Retrait de worksheets.template_id — journal
date: 2026-10-19
status: phase 0 — comportements et question d'accès soumis à David
---

## Reprendre ici

_Mis à jour le 2026-10-19, ouverture du chantier (issue #1529)._

- **État** : phase 0 écrite (ci-dessous), rien de codé.
- **Prochaine action** : PR 1 = migration de recopie `style_id ← template_id`, dès la validation de David.
- **En attente de David** : validation des comportements + réponse à la question d'accès.
- **Pièges en cours** : le code ÉCRIT encore `template_id` (POST `api/worksheets` l. 171, PUT `api/worksheets/[id]` l. 199) → la PR 2 doit couper lectures ET écritures.
- **Worktree / branche** : `../ubumaths-wt-retrait-template-id` · `refactor/retrait-template-id`.

---

## Contexte

Dernière étape de l'ADR 0028 (un seul générateur PDF) : le style d'une fiche se lit `style_id ?? template_id ?? « Fiche élève »` (`styleIdOf`, `src/lib/typst/templates/styles.ts:130`). Issue #1529.

Prod au 2026-10-19 : 36 fiches — 26 n'ont que `template_id`, 2 ont `style_id`, 8 aucun, 0 divergente ; les 26 `template_id` existent dans `worksheet_styles`.

Seule la **colonne** `worksheets.template_id` part. La table `worksheet_templates` (gabarits) reste.

## Plan en 3 PR

1. **Migration additive** : `update worksheets set style_id = template_id where style_id is null and template_id is not null`. Rollback : impossible de distinguer les lignes recopiées après coup → noter leurs id dans la migration (commentaire) ou accepter que le rollback soit « ne rien faire » (le rendu est identique).
2. **Code** : plus de lecture (`styleIdOf`, `student-worksheet-typst.ts`, preview d'affectation, duplication, `countWorksheetsUsingTemplate`) ni d'écriture (POST, PUT, schémas Zod) de `worksheets.template_id`.
3. **Migration destructive** `drop column` — après le `deploy:prod` de la PR 2, avec l'accord de David, grep des usages collé.

## Phase 0 — comportements

**Nominal**

- Après la PR 1, chacune des 26 fiches a `style_id` = son ancien `template_id` ; son PDF (élève, corrigé, aperçu, lien partagé) est identique octet pour octet.
- Après la PR 2, créer une fiche avec un style de Chiphre ou du prof n'écrit que `style_id` ; changer de style n'écrit que `style_id`.
- Dupliquer une fiche copie `style_id`.

**Limite**

- Une fiche sans style (8 en prod) garde le style par défaut « Fiche élève ».
- Supprimer un gabarit du prof : le compte des fiches qui l'utilisent ne regarde plus que `style_id`.
- Une fiche créée entre la PR 1 et le déploiement de la PR 2 : l'ancien code écrit `style_id` ET `template_id` (identiques) → rien à rattraper.

**Erreur**

- Un client qui enverrait encore `template_id` (POST/PUT) : la clé est ignorée (retirée du schéma Zod), pas d'erreur 400.

## Journal
