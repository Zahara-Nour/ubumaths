---
couvre:
  - src/lib/server/read-all-rows.ts
---

# Database (Supabase)

Référence synthétique pour Claude : **workflow migrations**, **règle des types**, **RLS mono-professeur**, **tests d'intégration**. Détail schéma : [docs/systeme/base-de-donnees.md](../systeme/base-de-donnees.md) · règles condensées dans [CLAUDE.md](../../CLAUDE.md).

---

## Infra (EU / RGPD)

- **Postgres 17** (`supabase/config.toml` → `major_version = 17`), hébergé **EU / eu-west-3** (RGPD : vraies données d'**élèves mineurs**).
- Project ref prod : **`cnevnzsvixxpnurautls`** (cible de `db:migrate` et du MCP read-only ; `db:types` ne lit plus la prod). ⚠️ `config.toml` porte `project_id = "ubumaths"` — c'est le **nom local** du stack, **pas** le ref prod.
- Vercel déploie en `cdg1`. Bascule historique **us-east-2 → eu-west-3** (RGPD mineurs + latence).

---

## Workflow migrations

| Étape               | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Créer            | `.sql` dans `supabase/migrations/`, nommé **`<timestamp>_<description>.sql`** (ex. `20260616240000_fix_private_messages_sender_fk.sql`). Le timestamp ordonne l'application et doit être **unique** : prendre **l'heure réelle** UTC à la seconde (`pnpm migration:horodatage`), jamais un nombre rond « max + 1 » (deux chantiers parallèles ont pris le même le 2026-10-13, puis `20261101215000` le 2026-11-01). Gardes : `src/lib/__tests__/migrations-horodatage-unique.test.ts` (CI), et `pnpm check:migrations` (`scripts/garde-migrations-horodatage.sh`, au pre-push et en `--pr <n>` juste avant `gh pr merge`), qui relit `origin/main` à l'instant : la CI d'une PR a pu tourner sur un main périmé, la protection de `main` n'exigeant pas une branche à jour. Une migration plus ancienne que la dernière déjà jouée passe : `pnpm db:migrate` = `supabase db push --include-all`. |
| 2. Schéma **+** RLS | Mettre changement de schéma **ET** policies/triggers RLS associés **dans la même migration**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 3. Tester en local  | `pnpm test:integration [fichier]` (Docker requis ; démarre la pile de test et y joue la migration, cf. §Tests).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 4. Pousser          | **`pnpm db:migrate`** (= `supabase db push`) → applique vers la prod EU ; si `db:migrate` refuse une migration « inserted before the last migration » (plus ancienne que la dernière jouée, normal avec l'heure réelle), lancer `pnpm db:migrate --dry-run --include-all`, vérifier que la liste ne contient que des migrations mergées, puis `pnpm db:migrate --include-all`. **Uniquement depuis la branche mergée**, aux 4 conditions de CLAUDE.md (§Migrations : preuves, pas approbation) ; destructive → arrêt et explication à David.                                                                                                                                                                                                                                                                                                                                                     |
| 5. Régénérer types  | **`pnpm db:types`**, dans la même PR que la migration, avant d'écrire le code qui l'appelle → réécrit `src/lib/types/database.ts` et la doc des tables depuis les migrations de la branche (§Types générés). Commit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6. Documenter       | Mettre à jour [docs/systeme/base-de-donnees.md](../systeme/base-de-donnees.md) si cluster de tables feature-level.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

**CLI Supabase** : devDependency du projet, version **exacte** dans `package.json` (2.118.0 depuis #512) — la même sur chaque poste et en CI (`nightly-integration.yml`). Aucune CLI globale (Homebrew désinstallée le 2026-09-29). Les scripts `pnpm db:*` la trouvent via `node_modules/.bin` ; pour une commande à la main : `pnpm exec supabase <commande>`, **sauf `start`, `stop` et `db reset`** : toujours `pnpm db:start`, `db:stop`, `db:reset`, qui cachent à la CLI les versions de la prod écrites dans le dossier `.temp` de `supabase/` (`scripts/pile-de-dev.sh`, cf. [environnement-de-dev.md](environnement-de-dev.md)).

```bash
pnpm db:start      # supabase start (pile de dev, Docker requis), versions de la CI
pnpm db:stop       # supabase stop
pnpm db:reset      # supabase db reset → recrée la base depuis le baseline + seed
pnpm db:neuf       # remise à neuf de la base de dev : reset + contenu de la prod + élèves fictifs (rare)
pnpm db:test:stop  # pile de TEST (celle de test:integration) : l'arrêter ; db:test:reset la reconstruit
pnpm db:a-jour     # base LOCALE : joue les migrations en attente, sans rien effacer (--essai pour voir)
pnpm db:migrate    # supabase db push → applique migrations en attente vers EU
pnpm db:types      # database.ts + doc des tables, depuis les migrations de la BRANCHE (pile de test) ; db:types:verifier compare sans écrire
pnpm db:status     # diagnostic : profiles manquants vs auth.users
```

- ⛔ **JAMAIS modifier le schéma via le Dashboard Supabase.** Toute évolution passe par une migration versionnée (reproductible, reviewable).
- ⚠️ **Prod / données locales** : `db:migrate` touche la prod (autonome seulement aux 4 conditions de CLAUDE.md) ; `db:reset` recrée la base locale de dev (verrou `supabase` partagé entre worktrees). Les tests d'intégration n'y touchent pas : ils ont leur pile (`ubumaths-test`, ports `5532x`, verrou `supabase-test`).
- **Mettre la base locale à jour = `pnpm db:a-jour`**, jamais `supabase migration up --local` (elle refuse dès que la base porte la migration d'une autre branche) ni `psql` d'un fichier à la main. `pnpm dev` la lance tout seul pour les migrations déjà sur `origin/main` ; la migration d'une branche en cours demande un `pnpm db:a-jour` explicite. Sur une base au contenu de la prod (`db:seed-riche`), une migration de contenu dont la garde refuse (« modèles déjà rangés ») est **notée comme faite sans être jouée** ; une migration qui touche le schéma n'est jamais sautée. Secours : `pnpm db:a-jour --noter <version>`. Code : `scripts/db-a-jour/`.
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
import type { Tables } from '#lib/types/database.ts';
import type { Profile, FriendProfile } from '#lib/types/database-helpers.ts';
```

`database-helpers.ts` existe précisément pour survivre aux régénérations : tout type fait-main y vit.

---

### Types générés : depuis les migrations de la branche

`pnpm db:types` (`scripts/db-types/`) ne lit pas la prod. Il met la **pile de test** d'accord avec
la branche (elle porte exactement ses migrations, `scripts/pile-de-test.sh`), y lance le générateur
de la CLI Supabase, met le résultat en forme avec prettier, puis régénère la doc des tables. La base
de dev ne sert pas de source : partagée par tous les worktrees, elle porte les migrations d'autres
branches.

- **Une migration et le code qui s'en sert tiennent dans la même PR** : migration, `pnpm db:types`,
  code. `pnpm db:migrate` reste joué au merge ; `pnpm deploy:prod` refuse de livrer un commit dont
  une migration manque en prod.
- **Garde de la CI** (`pnpm db:types:verifier`, job « Garde SECURITY DEFINER » de `quality.yml`) :
  la base du job est montée depuis les migrations de la PR, le fichier est régénéré et comparé.
  Rouge = migration ajoutée sans `pnpm db:types`, ou `database.ts` retouché à la main.
- **Limite connue** : la garde ne tourne que sur les PR. Deux PR de migration vertes chacune de son
  côté peuvent laisser sur `main` un `database.ts` qui n'est celui d'aucune des deux ; la PR
  suivante qui touche au schéma rougit alors : `pnpm db:types` et commit.
- **Le fichier dépend de la version de la CLI Supabase** (son générateur) et de prettier, toutes
  deux épinglées : une montée de version de la CLI peut le changer, et sa PR le régénère.

### La prod est-elle la base que le dépôt décrit ?

`database.ts` décrit les migrations du dépôt, pas la prod. Les migrations peuvent être toutes
« jouées » et la prod différer quand même : table retouchée au Dashboard, migration modifiée après
avoir été jouée. **`pnpm db:types:prod`** (`scripts/db-types/prod.ts`) le vérifie : il demande les
types de la prod à Supabase (`supabase gen types --linked`, **lecture seule**, rien n'est écrit) et
les compare au `database.ts` du dossier, ou d'un commit (`--commit <sha>`).

- **Où** : sur le Mac mini, depuis le dépôt principal (le projet lié y est déclaré). GitHub n'a aucun
  accès à la prod, et n'en aura pas. `pnpm deploy:prod` le joue avant de créer la version, sur le
  commit à livrer : un écart arrête tout.
- **Ce qui est comparé** : le schéma `public` — colonnes (type, obligatoire ou non), clés étrangères,
  vues, fonctions (arguments, retour, surcharges), enums, types composites. Pas les policies, ni les
  triggers, ni le corps des fonctions : les types ne les décrivent pas.
- **Deux générateurs, deux écritures** : celui de la prod n'écrit pas comme celui de la CLI locale.
  On ne compare donc pas deux textes mais deux listes « chemin → type » lues dans l'arbre
  syntaxique (`scripts/db-types/prod-depot.ts`), une fois effacées les différences de forme connues :
  `ComputedFields` (local seulement), `NonNullable<Json>` = `Json`, `Record<PropertyKey, never>` =
  `never`, colonne calculée interdite à l'écriture (`never` en local).
- **Sortie 1** : écart (les premiers de chaque famille sont nommés), ou types de la prod illisibles.
  Un fichier où l'on ne retrouve ni table ni fonction n'est jamais pris pour « aucun écart ».
- **Si le générateur de la prod change de forme** : le contrôle crie à l'écart sur toute la base,
  ou dit « forme non reconnue ». `pnpm deploy:prod --sans-controle-types` livre quand même ;
  ajouter ensuite la nouvelle différence de forme dans `prod-depot.ts`, avec son test.
- **Ce que les types ne disent pas** : l'ordre des valeurs d'un enum, et le caractère calculé
  (`GENERATED`) d'une colonne — la prod l'écrit comme une colonne ordinaire à valeur par défaut. Une
  forme que le contrôle ne connaît pas (signature d'index, rubrique nouvelle) est refusée, pas
  ignorée.
- **Avec `--migration-apres`, `deploy:prod` ne fait pas ce contrôle** (il le dit) : la prod garde ce
  que la migration retire. Le rejouer à la main après `pnpm db:migrate`.
- Sur une branche qui apporte une migration pas encore jouée, l'écart est attendu.
- **Plus strict que l'ancien fichier (lu en prod jusqu'au 2026-11-22)** : une colonne jsonb
  `NOT NULL` est typée `NonNullable<Json>` (alias `JsonRequis`, `database-helpers.ts`), et une
  colonne calculée par la base (`slug`, `search_vector`…) ne s'écrit plus. `toJson(valeur)` rend
  `JsonRequis` quand `valeur` ne peut être ni `null` ni `undefined`.
- **Deux scripts lisent `database.ts` par sa mise en forme** : `scripts/generate-db-doc.ts` (doc des
  tables) et `scripts/db-seed-riche/regles.ts` (`lireSchema`). Leurs tests rougissent si le format
  change.

## Lire « toutes » les lignes : le plafond de 1 000

PostgREST rend **1 000 lignes au plus** par requête (`max_rows`), et tronque **en silence** : ni erreur, ni avertissement. Une lecture sans filtre borné (tous les modèles publiés, toutes les catégories…) passe donc par `readAllRows` (`src/lib/server/read-all-rows.ts`), qui lit page par page et lève une erreur si une page échoue, jamais de liste partielle.

```ts
const rows = await readAllRows(
	(from, to) =>
		supabase
			.from('question_templates')
			.select('*')
			.eq('status', 'published')
			.order('id')
			.range(from, to),
	'des modèles publiés'
);
```

- **Tri stable obligatoire**, terminé par `.order('id')` : sans lui, une ligne peut sauter ou être lue deux fois d'une page à l'autre (`created_at` est nullable et partagé par les imports en lot).
- Cas vécu (2026-11-04) : 1 912 modèles publiés, la page de test et le panier n'en voyaient que 1 000 ; des séries sautaient des catégories (« Série : aucun modèle pour … »).
- D'anciennes boucles recopiées à la main subsistent (`template-review`, `curriculum-coverage`, `dictionary`, `mathoux`…) : elles sont justes, à migrer vers `readAllRows` lors d'un ménage.

## RLS — modèle mono-professeur (Option B)

> Refactor « professeur unique » : mergé (PR #11). Doc : `docs/archive/wip/single-teacher-refactor.md`.

- **Un seul prof (+ admin)** : la **classe n'est plus une frontière d'accès**. Le prof unique voit les données pédagogiques de **TOUS les élèves**, y compris ceux **hors classe**.
- **L'école (`profiles.school_id`) = frontière sociale / safeguarding** ; la classe = sous-groupe d'organisation. Les classements de jeux, le social, etc. sont **bornés par l'école** (défense en profondeur — `p.school_id = public.my_school()`).
- Source de vérité des inscriptions : **`class_members`** (PAS un tableau `class_ids`).

**Helpers `SECURITY DEFINER` pivots** (référencés par les ~13 policies de lecture prof) :

| Fonction                      | Rôle                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `is_teacher_or_admin()`       | bypass RLS, vrai si l'appelant est teacher/admin                               |
| `is_my_student(p_student_id)` | pivot Option B : un élève est-il « à moi » (inclut hors-classe)                |
| `my_school()`                 | `profiles.school_id` de l'appelant (NULL si non rattaché) — borne safeguarding |

⚠️ **Avant d'écrire ou de retirer une policy** : lire
[rls-echecs-silencieux.md](rls-echecs-silencieux.md). Une opération
refusée par la RLS rend zéro ligne, pas une erreur — `if (error) throw` ne se
déclenche jamais. Les policies permissives se combinent en **OU**, donc une
seule `using (true)` annule toutes les autres.

**Bonnes pratiques policies** : RLS activé sur **toute** table ; une policy **par opération** (SELECT/INSERT/UPDATE/DELETE) ; `auth.uid()` pour l'identité ; `SECURITY DEFINER` pour l'autorisation complexe ; commenter l'intention (`COMMENT ON FUNCTION/POLICY`).

**Visiteur non connecté (`anon`) : aucun droit par défaut** (depuis `20261001120000`). Une nouvelle table ou séquence de `public` ne donne rien à `anon` ; une page publique qui doit la lire sans connexion demande, dans sa migration, un GRANT explicite **et** une policy : `grant select on table public.ma_table to anon;` + `create policy "ma_table_select_anon" on public.ma_table for select to anon using (…);`. Idem pour les **fonctions** neuves (défaut global : plus d'EXECUTE pour PUBLIC) : une fonction appelée par `anon` (page publique, ou policy évaluée pour `anon`) demande `grant execute on function public.ma_fonction(…) to anon;` explicite. `authenticated` et `service_role` gardent EXECUTE dans `public`. ⚠️ `supabase_auth_admin` et `supabase_storage_admin` perdent aussi l'EXECUTE qu'ils tenaient de PUBLIC : un futur trigger sur `auth.*` / `storage.*` appelant une nouvelle fonction de `public`, ou un futur hook Auth, doit être `SECURITY DEFINER` ou recevoir `grant execute on function public.ma_fonction(…) to supabase_auth_admin;` (ou `supabase_storage_admin`), sinon l'inscription casse. `handle_new_user` (SECURITY DEFINER, existante) n'est pas concernée.

---

## Tests d'intégration (OBLIGATOIRES pour la DB)

> Architecture : [docs/pratiques/tests.md](tests.md) · standards : [quality-standards.md](qualite.md#testing-standards).

**Toute RLS / fonction `SECURITY DEFINER` / trigger / policy → test d'intégration obligatoire** avant merge.

```bash
pnpm test:integration [fichier]   # démarre la pile de TEST, y joue les migrations de la branche, lance vitest
```

Pas de `pnpm db:start` ni de `db:reset` avant : la pile de test se met seule d'accord avec la branche, et se reconstruit quand une migration a été modifiée depuis son passage ([tests.md § 4](tests.md#4-écrire-un-test-dintégration)). Preuve « rouge sans la migration » : retirer le fichier (ou se placer sur le commit d'avant) et relancer, la pile est reconstruite sans elle.

- Tests dans `tests/integration/` (ex. `single-teacher-rls.test.ts`, `kanban-rls.test.ts`, `game-leaderboards.test.ts`), helpers dans `tests/helpers/database/`.
- Pattern : **vrais clients authentifiés** (`createAuthenticatedClient(email)`) → RLS réellement appliqué, pas un client service-role qui bypasse tout.
- ⚠️ **JAMAIS valider une fonction `SECURITY DEFINER` par un smoke-test avec `auth.uid()` NULL** : la quasi-totalité de nos RPC ouvrent sur `IF auth.uid() IS NULL THEN RETURN error` → le garde **sort avant la vraie requête** → **faux positif** (a déjà laissé partir une RPC cassée en prod). Tester avec un contexte authentifié réel.
- La suite a déjà attrapé des bugs prod (ex. `ORDER BY rank` → `rk` dans `game_leaderboard`, 0A000). ~190 fichiers de tests d'intégration.

---

## Auth (Supabase Auth)

- Google OAuth (domaine `voltairedoha.com`) **désactivé** : `GOOGLE_LOGIN_ENABLED = false` dans `src/lib/config/google-login.ts` (plomberie conservée).
- Avatar (`UserAvatar.svelte`) : `avatar_url` → image par rôle (`getAvatarFallback`, sans genre) → initiales.
- ⚠️ **Edge case import élève** : login **avant** import → insertion directe dans `class_members` (l'auto-enrollment ne s'est pas déclenché). Toujours considérer les deux flux (import→login vs login→import).
- ⚠️ **Safari/WebKit TDZ** : pas d'import statique lourd dans `+layout.ts` ; `@supabase/ssr` en `await import()` dynamique (chunk root layout < 100 KB). Doc : [docs/pratiques/safari-webkit-tdz.md](safari-webkit-tdz.md).

---

## Interroger la prod

- **MCP Supabase read-only** (EU, `--read-only --project-ref=cnevnzsvixxpnurautls` dans `.mcp.json`) : lecture seule pour inspecter le schéma/les données prod (`list_tables`, `execute_sql` SELECT, `get_advisors`, `query_logs`).
- ⛔ **Ne JAMAIS appeler un outil MCP d'écriture** (`apply_migration`, `execute_sql` mutant, `create_branch`…). Toute écriture passe par une migration `.sql` + `db:migrate`.

---

> Voir aussi : [quality-standards.md](qualite.md) · [best-practices.md](svelte-typescript.md) · [git-workflow.md](git-workflow.md) · schéma : [database-schema.md](../systeme/base-de-donnees.md).

Vérifié contre le code le 2026-10-10.
