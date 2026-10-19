---
title: Retrait de worksheets.template_id — journal
date: 2026-10-19
status: PR 1 (#1532) et PR 2 (#1542) mergées ; #1544 (scripts) ; PR 3 (drop) préparée, après deploy:prod
---

## Reprendre ici

_Mis à jour le 2026-10-19, PR 3 préparée (branche non mergée)._

- **État** : #1532 (migrée) et #1542 (code) mergées. Les scripts de fiches (`scripts/create-*.ts`, `regen-depuis-base.ts`) cassés depuis #1542 → corrigés par #1544 (`style_id`). PR 3 prête sur `refactor/retrait-template-id-drop` : migration `20261019221542_retrait_worksheets_template_id.sql` (RPC de partage sans `template_id`, puis `drop column`), tests adaptés (5 rouges sans la migration, verts avec), test de recopie retiré, doc système à jour.
- **Prochaine action** : après le `deploy:prod` qui livre #1542 → pousser la PR 3, CI verte, merger, `db:migrate` (destructive : feu vert de David), puis PR 4 : `db:types`, nettoyage des tests unitaires qui portent encore `template_id` dans `WorksheetRow` (`style-de-la-fiche.test.ts`, `.svelte.test.ts`), `db:doc` (`base-de-donnees-tables.md`), puis versement du journal.
- **En attente de David** : `pnpm deploy:prod`, puis feu vert pour la PR 3 destructive (grep des usages et réconciliation : voir PR).
- **Pièges en cours** : ⛔ ne PAS merger la PR 3 avant le deploy (un `db:migrate` d'une autre session jouerait le drop sous la v0.40.0, qui lit encore la colonne). Réconciliation prod du 2026-10-19 : 28/36 fiches avec `template_id`, toutes `style_id = template_id`.
- **Worktree / branche** : `../ubumaths-wt-retrait-template-id` · `refactor/retrait-template-id-drop` ; `../ubumaths-wt-retrait-template-id-scripts` · `fix/retrait-template-id-scripts` (#1544, à nettoyer après merge).

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

### 2026-10-19 — PR 2 (code)

- Lectures retirées : `styleIdOf` (= `style_id ?? null`), `loadStyleTemplate` / `loadAuthorStyleTemplate`, PDF élève, API élève et aperçu (colonne plus sélectionnée, clé plus rendue), schémas de réponse (vue élève, liens partagés : la clé est retirée), `countWorksheetsUsingTemplate` (ne compte que `style_id` ; gabarit sans style propre → 0, `style_id` ne vise que `worksheet_styles`).
- Écritures retirées : POST, PUT, duplication. `template_id` dans le corps du POST/PUT → **400** (`z.never().optional()` : `null` aussi refusé). Aucun client ne l'envoyait plus.
- Types : `template_id` retiré de `WorksheetRow`, `WorksheetInsert`/`Update`, `WorksheetFormData`, `StudentWorksheetView` ; maquettes de tests nettoyées (`style_id` à la place quand elles choisissaient un style).
- Preuve rouge : `fiche-choix-du-style` + `pdf-eleve-style` (intégration) avec l'ancien `src/` → 8 échecs ; avec le nouveau → 36/36.
- Les fonctions SQL des liens partagés rendent encore `template_id` (et s'en servent en repli) : non touchées ici (migration), c'est la PR 3 — 0 fiche concernée en prod.
