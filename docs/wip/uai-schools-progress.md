# Progression — UAI/RNE des établissements

> **État** : implémentation terminée, en attente de push migration + commit.
> **Date** : 2026-06-10. **Contexte** : pré-requis administratif identifié par l'étude `docs/wip/mapping-lsu-study.md` (export LSU), traité de façon autonome car réutilisable ailleurs (SIECLE, bulletins…).

## Décisions actées (avec le PO)

- **Périmètre réduit à l'UAI/RNE des écoles** (pas d'INE élève pour l'instant).
- **UAI = RNE** : un seul champ (`schools.uai`). RNE est l'ancien nom du même code.
- **Format** : 8 caractères = 7 chiffres + 1 lettre majuscule (ex. `0750001H`), nullable, normalisé en majuscules.
- **Source de remplissage** : option B retenue — **sélecteur depuis l'API « Annuaire de l'éducation nationale »** (data.education.gouv.fr, Opendatasoft v2.1, publique, sans clé). Auto-remplit UAI + nom + ville + adresse. Champ UAI éditable à la main en secours.
- **Qui édite** : admin uniquement (CRUD écoles déjà admin-only).

## Fichiers créés / modifiés

| Fichier                                                          | Type     | Détail                                                                                                                                                     |
| ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260610120000_add_uai_to_schools.sql`      | **créé** | Colonne `uai TEXT` + CHECK `^[0-9]{7}[A-Z]$` + index unique partiel + comment. **À pusher** (`pnpm db:migrate`).                                           |
| `src/lib/types/database.ts`                                      | modifié  | `uai: string \| null` ajouté à `schools` (Row/Insert/Update).                                                                                              |
| `src/lib/server/validation/schools.ts`                           | modifié  | `uaiSchema`, `optionalUaiSchema`, `annuaireSearchQuerySchema`, `annuaireRecordSchema`, `annuaireResponseSchema`, type `AnnuaireSchool`, const `UAI_REGEX`. |
| `src/lib/server/validation/schools.test.ts`                      | **créé** | 19 tests (strict/optional/query/réponse). ✅ passent.                                                                                                      |
| `src/routes/api/annuaire/search/+server.ts`                      | **créé** | Proxy GET admin-only vers Opendatasoft, Zod-validé, payload normalisé.                                                                                     |
| `src/routes/(protected)/dashboard/admin/schools/+page.server.ts` | modifié  | Actions `create`/`update` valident l'UAI via `optionalUaiSchema`.                                                                                          |
| `src/routes/(protected)/dashboard/admin/schools/+page.svelte`    | modifié  | Autocomplete Annuaire (debounce 300 ms) + champ UAI + colonne tableau.                                                                                     |

> `docs/architecture/database-schema.md` **non touché** : ce doc ne couvre que des schémas par feature (Kanban, Compétences, SRS…), la table `schools` n'y figure pas. La colonne est documentée par le `COMMENT ON COLUMN` de la migration + ce doc de progression.

## API Annuaire — référence

- Endpoint : `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records`
- Recherche : `where=search(nom_etablissement,"<terme>")`, `limit=10`, `select=identifiant_de_l_etablissement,nom_etablissement,type_etablissement,nom_commune,code_postal,adresse_1,libelle_academie`.
- Champ UAI dans le dataset : `identifiant_de_l_etablissement`.

## Vérifications

- `pnpm test:server schools.test.ts` → 19/19 ✅
- `npx eslint` (fichiers modifiés) → 0 ✅
- `pnpm check:incremental` → 9 errors / 46 warnings (**baseline inchangée**) ✅
- svelte-autofixer → 0 issue sur mon code (1 issue pré-existante `href` sans `resolve()` ligne 305, hors scope, convention du codebase).

## Code review (`code-reviewer`, 2026-06-10)

Verdict initial : CHANGES_REQUESTED. Feature jugée propre/sûre/bien testée. Sécurité proxy OK (admin-only, anti-injection ODSQL, pas de SSRF). Suites données :

| #   | Point                                                           | Décision                                                                                      |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| #5  | `closeModal()` ne nettoyait pas l'état Annuaire (fetch fantôme) | **corrigé** (`resetAnnuaire()` dans `closeModal`)                                             |
| #6  | Guard manuel vs helper partagé                                  | **corrigé** (`requireRole(locals, 'admin')`)                                                  |
| #7  | Race entre réponses fetch concurrentes                          | **corrigé** (token de séquence `annuaireSeq`)                                                 |
| #4  | `bulk_create` n'insère pas l'UAI                                | **documenté** (commentaire : import tableur sans colonne UAI → NULL, saisie unitaire ensuite) |
| #1  | `is_active` = `<input type="checkbox">` natif (règle #2)        | **corrigé** (PO a validé : `MyCheckbox` + input hidden pour la soumission du form action)     |
| #3  | `name`/`city`/`country`/`logo_url` non validés Zod côté serveur | **dette pré-existante** → signalée, non élargie au scope UAI                                  |

Re-checks après corrections : eslint 0, autofixer 0 (mon code), `check:incremental` 9/46 inchangé.

## Décisions PO finales

- **Commit `database.ts`** : « inclus tout » → le reformat `db:types` préexistant est embarqué dans le commit feature.
- **Checkbox `is_active`** : à corriger → fait (`MyCheckbox`).

## Reste à faire

- [ ] Push migration (`pnpm db:migrate`) — **par l'utilisateur**.

## Pistes futures (hors scope)

- INE élève (`profiles.ine`) quand l'export LSU sera implémenté.
- Extraire un composant réutilisable `SchoolAnnuairePicker.svelte` si d'autres écrans en ont besoin.
- Brancher l'UAI dans l'import SIECLE / l'export LSU.
