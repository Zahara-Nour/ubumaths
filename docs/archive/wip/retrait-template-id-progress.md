---
title: Retrait de worksheets.template_id — journal
date: 2026-10-19
status: clos — PR 1 #1532, PR 2 #1542, #1544, PR 3 #1548 (migrée le 2026-10-20), PR 4 (types, tests, archivage)
---

## Reprendre ici

_Mis à jour le 2026-10-20, PR 4 : chantier CLOS, journal archivé._

- **État** : clos. #1532 (recopie, migrée), #1542 (code, en prod v0.41.0), #1544 (scripts), #1548 (drop, migrée le 2026-10-20 : colonne absente en prod, RPC de partage sans `template_id`), PR 4 (`db:types`, tests unitaires, commentaire de seed, `db:doc`, archivage).
- **Prochaine action** : aucune. Le durable est dans `docs/systeme/fiches-et-pdf.md` et `base-de-donnees.md`.

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

### 2026-10-20 — PR 3 migrée, PR 4

- #1548 mergée (CI verte ; `security-auditor` et `code-reviewer` sans finding bloquant). `db:migrate` lancé par David. Vérifié en prod : colonne absente, les deux RPC de partage sans `template_id` et toujours `SECURITY DEFINER`, 36 fiches dont 28 avec `style_id`.
- PR 4 : `db:types` (seuls `template_id` et `worksheets_template_id_fkey` disparaissent), tests unitaires `style-de-la-fiche*.test.ts` sans `template_id` (les cas « `template_id` ne compte plus » retirés : la colonne n'existe plus), commentaire de `supabase/seed/worksheet_system_templates.sql`, `base-de-donnees-tables.md` régénéré, journal archivé.
