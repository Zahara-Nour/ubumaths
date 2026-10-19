---
title: Retrait de worksheets.template_id — journal
date: 2026-10-19
status: PR 1 livrée (#1532, migrée en prod) ; PR 2 (code) à faire
---

## Reprendre ici

_Mis à jour le 2026-10-19, après #1532._

- **État** : PR 1 mergée (#1532) et `db:migrate` fait : en prod, 0 fiche à recopier, 28 fiches avec `style_id`, 0 divergente, dates de modification gardées, triggers actifs.
- **Prochaine action** : PR 2 (code) dans un nouveau worktree — plus aucune lecture (`styleIdOf`, `student-worksheet-typst.ts`, preview d'affectation, duplication, `countWorksheetsUsingTemplate`) ni écriture (POST, PUT) de `worksheets.template_id` ; **400** sur un `template_id` envoyé. Revue `code-reviewer` + `security-auditor` (API).
- **En attente de David** : rien.
- **Pièges en cours** : le code ÉCRIT encore `template_id` (POST `api/worksheets` l. 171, PUT `api/worksheets/[id]` l. 199) ; `fiche-choix-du-style.test.ts` asserte cette double écriture (D10) → à réécrire. PR 3 (`drop column`) seulement après le `deploy:prod` de la PR 2.
- **Worktree / branche** : PR 2 → `git worktree add -b refactor/retrait-template-id-code ../ubumaths-wt-retrait-template-id origin/main`.

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
- `security-auditor` : aucun finding bloquant ; recommandation suivie — ne recopier qu'un style de Chiphre ou de l'auteur de la fiche (la garde `worksheets_style_owner_check` laisse passer `postgres`). 0 cas en prod.
- Test `tests/integration/recopie-style-depuis-template.test.ts` : rouge avec une migration vide (2 échecs), le test de la date rouge sans la coupure du trigger, le test « style d'un autre compte » rouge sans la condition de propriétaire, 9/9 vert avec la migration.

### 2026-10-19 — PR 1 livrée

- #1532 mergée (CI verte), `db:migrate` : seule migration en attente, appliquée. Vérifié en prod après coup : 0 à recopier, 28 avec style, 0 divergente, `max(updated_at)` inchangé (2026-10-16), `update_worksheets_updated_at` et `worksheets_style_owner_check` actifs (`O`).
