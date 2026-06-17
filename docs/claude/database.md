# Database (Supabase)

Référence synthétique pour Claude : **workflow migrations**, **règle des types**, **RLS mono-professeur**, **tests d'intégration**. Détail schéma : [docs/architecture/database-schema.md](../architecture/database-schema.md) · règles condensées dans [CLAUDE.md](../../CLAUDE.md).

---

## Infra (EU / RGPD)

- **Postgres 17** (`supabase/config.toml` → `major_version = 17`), hébergé **EU / eu-west-3** (RGPD : vraies données d'**élèves mineurs**).
- Project ref prod : **`cnevnzsvixxpnurautls`** (cible de `db:types` et du MCP read-only). ⚠️ `config.toml` porte `project_id = "ubumaths"` — c'est le **nom local** du stack, **pas** le ref prod.
- Vercel déploie en `cdg1`. Bascule historique **us-east-2 → eu-west-3** (RGPD mineurs + latence).

---

## Workflow migrations

| Étape               | Action                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Créer            | `.sql` dans `supabase/migrations/`, nommé **`<timestamp>_<description>.sql`** (ex. `20260616240000_fix_private_messages_sender_fk.sql`). Le timestamp ordonne l'application. |
| 2. Schéma **+** RLS | Mettre changement de schéma **ET** policies/triggers RLS associés **dans la même migration**.                                                                                |
| 3. Tester en local  | `pnpm db:start` (Docker) → `pnpm test:integration` (cf. §Tests).                                                                                                             |
| 4. Pousser          | **`pnpm db:migrate`** (= `supabase db push`) → applique vers la prod EU. **Uniquement depuis la branche mergée, avec accord explicite.**                                     |
| 5. Régénérer types  | **`pnpm db:types`** → réécrit `src/lib/types/database.ts`. Commit.                                                                                                           |
| 6. Documenter       | Mettre à jour [docs/architecture/database-schema.md](../architecture/database-schema.md) si cluster de tables feature-level.                                                 |

```bash
pnpm db:start      # supabase start (stack local, Docker requis)
pnpm db:stop       # supabase stop
pnpm db:reset      # supabase db reset → recrée la base depuis le baseline + seed
pnpm db:migrate    # supabase db push → applique migrations en attente vers EU
pnpm db:types      # supabase gen types typescript --project-id cnevnzsvixxpnurautls > database.ts
pnpm db:status     # diagnostic : profiles manquants vs auth.users
```

- ⛔ **JAMAIS modifier le schéma via le Dashboard Supabase.** Toute évolution passe par une migration versionnée (reproductible, reviewable).
- ⚠️ **OOM** : ne pas lancer `db:migrate` / `db:reset` en agent ou sans accord (touche la prod / lourd).
- État actuel des migrations : **1 baseline** (`20260616220000_baseline_schema.sql`, ~46 k lignes, schéma EU complet) **+ correctifs** post-baseline. Les **619** anciennes migrations sont archivées dans `supabase/migrations_archive/` (ne pas les rejouer).

### Timing additif vs destructif

| Type                       | Exemples                                                                                       | Quand `db:migrate` ?                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Additif** (non-breaking) | `CREATE TABLE`, `ADD COLUMN` (nullable / défaut), `CREATE INDEX`, `CREATE OR REPLACE FUNCTION` | **Avant / avec** le déploiement du code qui l'utilise (le nouveau code a besoin du schéma).                   |
| **Destructif** (breaking)  | `DROP COLUMN`/`TABLE`, `RENAME`, `NOT NULL` sur colonne existante, suppression de fonction     | **Après** que le code n'utilisant plus l'ancien schéma soit déployé (sinon la prod casse pendant le rollout). |

---

## Règle des types (non négociable)

> CLAUDE.md règle #6.

| Type                                                                 | Origine                           | Où le définir                                                                           |
| -------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `Database`, `Tables<>`, `Json`                                       | **Auto-généré** (`pnpm db:types`) | `src/lib/types/database.ts` — **NE JAMAIS éditer à la main** (écrasé à la régénération) |
| Alias (`type Profile = Tables<'profiles'>`)                          | Dérivé                            | `src/lib/types/database-helpers.ts`                                                     |
| Composite (`interface FriendshipWithProfile {…}`)                    | Custom                            | `src/lib/types/database-helpers.ts`                                                     |
| Union contrainte (`type CheckpointRunStatus = 'passed' \| 'failed'`) | Custom                            | `src/lib/types/database-helpers.ts`                                                     |

```ts
// ✅ import des types
import type { Tables } from '$lib/types/database';
import type { Profile, FriendProfile } from '$lib/types/database-helpers';
```

`database-helpers.ts` existe précisément pour survivre aux régénérations : tout type fait-main y vit.

---

## RLS — modèle mono-professeur (Option B)

> Refactor « professeur unique » : mergé (PR #11). Doc : `docs/wip/single-teacher-refactor.md`.

- **Un seul prof (+ admin)** : la **classe n'est plus une frontière d'accès**. Le prof unique voit les données pédagogiques de **TOUS les élèves**, y compris ceux **hors classe**.
- **L'école (`profiles.school_id`) = frontière sociale / safeguarding** ; la classe = sous-groupe d'organisation. Les classements de jeux, le social, etc. sont **bornés par l'école** (défense en profondeur — `p.school_id = public.my_school()`).
- Source de vérité des inscriptions : **`class_members`** (PAS un tableau `class_ids`).

**Helpers `SECURITY DEFINER` pivots** (référencés par les ~13 policies de lecture prof) :

| Fonction                      | Rôle                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `is_teacher_or_admin()`       | bypass RLS, vrai si l'appelant est teacher/admin                               |
| `is_my_student(p_student_id)` | pivot Option B : un élève est-il « à moi » (inclut hors-classe)                |
| `my_school()`                 | `profiles.school_id` de l'appelant (NULL si non rattaché) — borne safeguarding |

**Bonnes pratiques policies** : RLS activé sur **toute** table ; une policy **par opération** (SELECT/INSERT/UPDATE/DELETE) ; `auth.uid()` pour l'identité ; `SECURITY DEFINER` pour l'autorisation complexe ; commenter l'intention (`COMMENT ON FUNCTION/POLICY`).

---

## Tests d'intégration (OBLIGATOIRES pour la DB)

> Architecture : [docs/ref/tests/](../ref/tests/) · standards : [quality-standards.md](quality-standards.md#testing-standards).

**Toute RLS / fonction `SECURITY DEFINER` / trigger / policy → test d'intégration obligatoire** avant merge.

```bash
pnpm db:start            # stack local
pnpm test:integration    # vitest run --config vitest.integration.config.ts
```

- Tests dans `tests/integration/` (ex. `single-teacher-rls.test.ts`, `kanban-rls.test.ts`, `game-leaderboards.test.ts`), helpers dans `tests/helpers/database/`.
- Pattern : **vrais clients authentifiés** (`createAuthenticatedClient(email)`) → RLS réellement appliqué, pas un client service-role qui bypasse tout.
- ⚠️ **JAMAIS valider une fonction `SECURITY DEFINER` par un smoke-test avec `auth.uid()` NULL** : la quasi-totalité de nos RPC ouvrent sur `IF auth.uid() IS NULL THEN RETURN error` → le garde **sort avant la vraie requête** → **faux positif** (a déjà laissé partir une RPC cassée en prod). Tester avec un contexte authentifié réel.
- La suite a déjà attrapé des bugs prod (ex. `ORDER BY rank` → `rk` dans `game_leaderboard`, 0A000). ~285 tests d'intégration.

---

## Auth (Supabase Auth)

- Google OAuth restreint au domaine `@voltairedoha.com`.
- Avatar : priorité `profile.avatar_url` → `user.user_metadata.picture` → `user.user_metadata.avatar_url` → fallback rôle/genre → initiales.
- ⚠️ **Edge case import élève** : login **avant** import → insertion directe dans `class_members` (l'auto-enrollment ne s'est pas déclenché). Toujours considérer les deux flux (import→login vs login→import).
- ⚠️ **Safari/WebKit TDZ** : pas d'import statique lourd dans `+layout.ts` ; `@supabase/ssr` en `await import()` dynamique (chunk root layout < 100 KB). Doc : [docs/ref/safari-webkit-tdz.md](../ref/safari-webkit-tdz.md).

---

## Interroger la prod

- **MCP Supabase read-only** (EU, `--read-only --project-ref=cnevnzsvixxpnurautls` dans `.mcp.json`) : lecture seule pour inspecter le schéma/les données prod (`list_tables`, `execute_sql` SELECT, `get_advisors`, `get_logs`).
- ⛔ **Ne JAMAIS appeler un outil MCP d'écriture** (`apply_migration`, `execute_sql` mutant, `create_branch`…). Toute écriture passe par une migration `.sql` + `db:migrate`.

---

> Voir aussi : [quality-standards.md](quality-standards.md) · [best-practices.md](best-practices.md) · [git-workflow.md](git-workflow.md) · schéma : [database-schema.md](../architecture/database-schema.md).
