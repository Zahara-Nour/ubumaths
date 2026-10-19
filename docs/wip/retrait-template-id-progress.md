---
title: Retrait de worksheets.template_id — journal
date: 2026-10-19
status: PR 1 (migration de recopie) en cours
---

## Reprendre ici

_Mis à jour le 2026-10-19, PR 1 en cours._

- **État** : phase 0 validée par David (avec 400 sur `template_id`). PR 1 = migration `20261017090300_recopie_style_id_depuis_template_id.sql` + test d'intégration (rouge sans, vert avec).
- **Prochaine action** : merge de la PR 1 → `db:migrate` depuis `main` (4 conditions réunies) → vérifier en prod 0 fiche `style_id null` avec `template_id` style. Puis PR 2 (code).
- **En attente de David** : rien.
- **Pièges en cours** : le code ÉCRIT encore `template_id` (POST `api/worksheets` l. 171, PUT `api/worksheets/[id]` l. 199) → la PR 2 doit couper lectures ET écritures, et REFUSER (400) un `template_id` envoyé.
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

- Un client qui enverrait encore `template_id` (POST/PUT) : **erreur 400** (schéma Zod strict sur cette clé) — décision de David, 2026-10-19.

## Journal

### 2026-10-19 — décisions de phase 0, PR 1

- David : comportements validés, **400** sur un `template_id` envoyé (au lieu de l'ignorer) ; question d'accès : **personne** ne gagne d'accès. Vérifié en prod : les 26 fiches à recopier pointent toutes un style de Chiphre (`owner_id` null), 0 orpheline, 0 divergente.
- Rollback = ne rien faire (conseil suivi) : `style_id = template_id` sur les lignes touchées, `styleIdOf` rend le même style ; une liste d'id serait périmée au `db:migrate` (le code écrit encore `template_id`).
- La migration coupe le trigger `update_worksheets_updated_at` le temps de la recopie : sans cela, les 26 fiches remonteraient en tête des « modifiées récemment ». Le trigger `worksheets_style_owner_check` ne s'applique pas (rôle `postgres`), et les données le satisfont de toute façon.
- Test `tests/integration/recopie-style-depuis-template.test.ts` : rouge avec une migration vide (2 échecs), le test de la date rouge sans la coupure du trigger, 7/7 vert avec la migration.
