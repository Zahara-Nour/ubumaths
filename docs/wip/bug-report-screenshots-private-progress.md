# Bug report screenshots → bucket privé + URLs signées

**État : implémenté + migration APPLIQUÉE en production (2026-06-14).**
Vérifié via MCP : bucket `public=false`, policy publique supprimée, policy owner SELECT créée, policy admin ALL intacte.

## Problème (advisor sécurité 0025 + RGPD)

Le bucket `bug-report-screenshots` était `public=true` avec une policy SELECT
`public` → n'importe qui pouvait (1) énumérer tous les fichiers (`.list()`) et
(2) télécharger n'importe quelle capture via son URL CDN publique. Les captures
de bug peuvent contenir des données d'élèves mineurs.

## Décision

Option B : bucket **privé** + **URLs signées** générées côté serveur.
TTL : affichage **1 h**, export markdown **7 j**. Compatible free tier (signed
URLs et buckets privés sont gratuits ; pas d'Image Transformations).

## Modèle

- Stockage : on ne garde que `bug_reports.screenshot_path`. `screenshot_url`
  n'est plus une URL durable — il est **repeuplé au load** par une URL signée
  fraîche dérivée du path. Les composants lisent toujours `screenshot_url`.
- RLS : owner peut lire son propre dossier (`foldername[1] = auth.uid()`),
  admins via la policy ALL existante. Aucune voie anonyme.

## Fichiers

| Fichier                                                                 | Change                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `supabase/migrations/20260614101541_bug_report_screenshots_private.sql` | bucket privé + drop policy publique + policy owner SELECT               |
| `src/lib/server/bug-report-screenshots.ts` _(nouveau)_                  | `signBugReportScreenshots` / `signBugReportScreenshot` + constantes TTL |
| `src/lib/server/bug-report-screenshots.test.ts` _(nouveau)_             | 6 tests (path, null, échec, batch, TTL, single) — ✅ passent            |
| `.../dashboard/admin/bug-reports/+page.server.ts`                       | signe les reports (1 h)                                                 |
| `.../dashboard/bug-reports/+page.server.ts`                             | signe les reports (1 h)                                                 |
| `.../api/bug-reports/[reportId]/export/+server.ts`                      | signe le report (7 j) avant export                                      |
| `.../api/bug-reports/[reportId]/screenshot/+server.ts`                  | `getPublicUrl` → `createSignedUrl` ; stocke `screenshot_url: null`      |
| `src/lib/server/validation/bug-reports.ts`                              | retire `screenshotUrl`/`screenshotPath` du schéma de création           |
| `src/routes/api/bug-reports/+server.ts`                                 | n'insère plus `screenshot_url`/`screenshot_path` à la création          |
| `src/lib/types/bug-reports.ts`                                          | retire les champs vestigiaux de `CreateBugReportRequest`                |

## Revue de code

`code-reviewer` (Opus) : RLS correcte, aucune voie anonyme, helper correct.
A relevé 1 trou (screenshotUrl accepté à la création, stocké non signé) →
**corrigé** (retiré du schéma + insert + types).

## Validation

- 6 tests helper ✅ ; ESLint propre ; `pnpm check:incremental` = 0 erreur hors `extern/`.
- Données existantes : 2/247 rapports ont une capture, les 2 ont `screenshot_path` → couverts par signature au load.

## Reste à faire (David)

1. ~~`pnpm db:migrate`~~ ✅ appliquée en prod le 2026-06-14.
2. Vérif manuelle (recommandée) : page admin (toutes captures), page élève (sa capture only),
   export (lien ouvrable), et que l'URL CDN publique d'une ancienne capture renvoie 400.
3. Déployer le **code** (les pages/endpoints) : tant que le code n'est pas déployé,
   les 2 captures existantes en prod ne s'afficheront plus (URL publique cassée par le
   bucket privé) jusqu'à ce que le signing au load soit en ligne.
4. `pnpm db:types` non nécessaire (pas de changement de schéma de table).
