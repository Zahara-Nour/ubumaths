# Migration Supabase `us-east-2` → EU (`eu-west-3` Paris) — Plan

> Date : 2026-06-13 · **Révisé 2026-06-14 (inventaire mesuré contre la prod en
> lecture seule).** Statut : **PLAN — rien exécuté.** Décision déclenchée par
> RGPD (données d'élèves mineurs) + latence (élèves français, base actuellement aux US).
> ⚠️ Opération sensible : migration de données + bascule de production. À planifier
> sur une fenêtre dédiée, avec sauvegardes et rollback prêts.
>
> **Vérité terrain (mesurée le 2026-06-14, ancien ref `aqtijumsgfufoztohdua`) :**
> DB **152 MB** · Storage **~13 MB / 340 objets** · **107 comptes** auth / 79 identités ·
> **203 tables** publiques · realtime = `messages` · **8 jobs pg_cron** actifs ·
> **609 migrations**. → tout tient largement dans le free tier ; le risque n'est pas le
> volume mais la **fidélité** (auth/triggers/refs). Voir §4 pour les pièges bloquants (§4.3/4.6/4.7).

## 1. Pourquoi

1. **RGPD / conformité (raison principale)** — l'app traite des **données d'élèves
   mineurs**. Les héberger en `us-east-2` (transfert UE→US, contexte post-Schrems II)
   est un risque de conformité. Cible : **toutes les données personnelles en EU**.
2. **Latence** — SSR + Supabase aux US = transatlantique sur chaque page. Base en EU
   - fonctions Vercel `cdg1` (Paris) ≈ TTFB divisé par ~2 pour les élèves FR.

## 2. Principe (important)

**Supabase ne permet PAS de changer la région d'un projet existant.** La migration =
**créer un nouveau projet** dans `eu-west-3`, **y recopier** schéma + données + Storage

- Auth, **réécrire** les URLs/refs codés en dur, puis **basculer** l'app (env + DNS
  logique via les clés).

Cible région : **`eu-west-3` (Paris)** — plus proche des élèves FR et co-localisable
avec les fonctions Vercel `cdg1`. (Alternative : `eu-central-1` Francfort.)

## 3. Inventaire à migrer

| Élément              | Source de vérité                                                      | Méthode                                                                                                                        |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Schéma + RLS + funcs | **prod** (`supabase db dump`, fidèle) — 609 migrations = fallback     | dump schéma → restore (cf. Phase 1) ; `db push` en secours                                                                     |
| Données (tables)     | base prod (**152 MB, 203 tables**)                                    | `supabase db dump --data-only` → restore **en mode réplica** (§4.6)                                                            |
| Storage (buckets)    | **prod, pas les migrations** — 7 buckets (cf. Phase 3)                | recopie objet par objet (~340, script `supabase-js`)                                                                           |
| Auth users           | `auth.users` + `auth.identities` (**107 / 79**)                       | dump SQL `auth` en préservant les `id` (§4.5)                                                                                  |
| pg_cron jobs         | **8 jobs actifs** (cf. §4.3)                                          | activer `pg_cron`, puis re-scheduler les 8 jobs (Phase 1)                                                                      |
| Extensions           | installées : `pg_cron`, `pgcrypto`, `vector`, `unaccent`, `uuid-ossp` | **`pg_cron` + `vector` + `unaccent` activés à la main AVANT le restore** (public en dépend) ; le reste suit le dump (cf. §4.3) |
| Secrets / env        | Vercel + `.env` local                                                 | mise à jour manuelle (voir Phase 5)                                                                                            |

> ⚠️ **`pg_net` n'est PAS installé en prod** (zéro appel HTTP en base) — ne pas
> l'activer sur le projet EU. À l'inverse, **`vector` (pgvector) EST utilisé** (embeddings).

## 4. Pièges identifiés (CRITIQUES — vérifiés dans le code)

### 4.1 URLs Storage **absolues** stockées en base ⚠️ (le plus gros)

Un nouveau projet a un **nouveau host** → toute URL absolue contenant l'ancien ref
casse. **Audit exhaustif fait** (scan de toutes les colonnes text/jsonb des 203 tables,
2026-06-14). Contrairement à l'hypothèse initiale, **aucune colonne `image_url`** ne
porte le ref. Les **5 vraies colonnes** (189 lignes) à réécrire en **Phase 4** :

| Table.colonne                             | lignes | type                                |
| ----------------------------------------- | ------ | ----------------------------------- |
| `tutor_conversations.exercise_statement`  | 97     | text                                |
| `vip_card_templates.image_path`           | 45     | text                                |
| `tutor_conversations.exercise_correction` | 24     | text                                |
| `exercises.variations`                    | 21     | **jsonb** (cast `::text`→`::jsonb`) |
| `bug_reports.screenshot_url`              | 2      | text                                |

**Bonnes nouvelles confirmées par l'audit :**

- `profiles.avatar_url` **ne contient pas** l'ancien ref → avatars externes (Google) ou
  relatifs : **rien à réécrire** côté avatars.
- `question-images` (254 objets) est servi via `getQuestionImageUrl(supabaseUrl, …)`
  dans `src/lib/questions/constants.ts` → URL construite **dynamiquement** depuis
  `PUBLIC_SUPABASE_URL` : **auto-migré**, rien à toucher.

**Requête d'audit réutilisable** (rejouer après Phase 4, doit renvoyer 0 ligne) :

```sql
select table_name, column_name, hits from (
  select c.table_name, c.column_name,
    (xpath('/row/v/text()', query_to_xml(format(
      'select count(*) v from public.%I where %I::text like ''%%aqtijumsgfufoztohdua%%''',
      c.table_name, c.column_name), false, true, '')))[1]::text::int as hits
  from information_schema.columns c
  join information_schema.tables t on t.table_schema=c.table_schema
    and t.table_name=c.table_name and t.table_type='BASE TABLE'
  where c.table_schema='public' and c.data_type in ('text','character varying','jsonb','json')
) s where hits > 0 order by hits desc;
```

### 4.2 Ref projet codé en dur

Liste exhaustive vérifiée (grep `aqtijumsgfufoztohdua`, hors `node_modules`, 2026-06-14) :

**Code de prod (host Storage absolu codé en dur) — ✅ RÉSOLU (commit `22e771f9b`)**

- ~~`GameControls.svelte` (minesweeper) + `Game2048Controls.svelte` (2048)~~ → **migrés**
  vers le helper `storageUrl(bucket, path)` (`$lib/utils/storage`, dérivé de
  `PUBLIC_SUPABASE_URL`). Plus aucun host codé en dur dans ces composants → **rien à faire
  en Phase 5** pour eux. _(Ces constantes n'étaient pas en base ; un `UPDATE` Phase 4 ne les
  touchait pas — d'où le refactor code, fait à froid.)_

**Config & tooling**

- `.mcp.json:9` → `--project-ref=aqtijumsgfufoztohdua` (serveur MCP Supabase).
- `package.json:53` → `db:types --project-id aqtijumsgfufoztohdua`.
- `scripts/image-url-mapping.json` (des milliers d'URLs `question-images`).
- Scripts : `scripts/migrate-missing-images.ts`, `scripts/migrate-constructions-to-dsl.ts`,
  `scripts/import-fixtures-to-dsl.ts`.

**Docstrings / tests / docs (non bloquant, à nettoyer)**

- `src/lib/server/validation/vip-card-admin.ts` (exemple en commentaire),
  `vip-card-admin.test.ts`,
  `.claude/syntax-audit-2025-11-19.md`, `docs/wip/question-migration-status.md`,
  migration `…_fix_2048_vip_card_image_paths.sql` (historique — ne pas réécrire).

→ Remplacer le ref partout (Phase 5), **sauf** les migrations historiques.

> **Variante « variable d'environnement » (recommandée pour le code de prod)**
> Plutôt que de remplacer un host par un autre (le problème reviendrait à la
> prochaine migration), sortir le host du code et le dériver de la config Supabase
> déjà présente :
>
> ```ts
> import { PUBLIC_SUPABASE_URL } from '$env/static/public';
> const STORAGE_BASE = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/vip-card-images`;
> ```
>
> Le host devient automatiquement correct (déduit de `PUBLIC_SUPABASE_URL`, mise à
> jour en Phase 5). **À faire idéalement AVANT la bascule** (refactor à froid,
> testable tout de suite), pas pendant la fenêtre de maintenance.

### 4.3 pg_cron — activer AVANT de (re)planifier les jobs (sinon skip silencieux) ⚠️

Les migrations qui planifient le cron sont **défensives** (« Check if pg_cron extension
is available », « This section will fail if pg_cron is not enabled »). Sur un projet
neuf où `pg_cron` n'est pas encore activé, **les rejouer réussit sans rien planifier**
→ schéma « OK » mais **0 job cron**. Il faut donc activer `pg_cron` (Dashboard ou API)
**avant** de (re)planifier les jobs — que ce soit en rejouant les migrations `*pg_cron*`
ou via `cron.schedule(...)` manuel — puis vérifier que les **8 jobs** sont bien là.

Les 8 jobs actifs (mesurés `select jobname, schedule from cron.job`) :

| job                      | schedule       | job                                 | schedule       |
| ------------------------ | -------------- | ----------------------------------- | -------------- |
| `cleanup-all`            | `0 2 * * *`    | `rgpd-retention-cleanup`            | `0 3 * * 0`    |
| `cleanup-stale-trades`   | `*/10 * * * *` | `weekly-best-bonuses`               | `0 0,12 * * *` |
| `cleanup-stuck-job-runs` | `30 * * * *`   | `weekly-rewards`                    | `0 0,12 * * *` |
| `daily-summaries`        | `0 * * * *`    | `recalculate-minesweeper-ref-times` | `30 1 * * 0`   |

> **`pg_net` : non concerné.** Il n'est **pas installé** en prod et **aucun** job cron
> ne fait d'appel HTTP (les jobs appellent des fonctions SQL `public.cleanup_*` /
> `public.*`). Donc pas d'URL `/api/...` à mettre à jour, et **ne pas activer `pg_net`**.

### 4.4 Auth / Google OAuth

Le redirect Google pointe sur `https://<ancien-ref>.supabase.co/auth/v1/callback`.
→ Dans **Google Cloud Console**, ajouter le callback du **nouveau** projet ; dans
**Supabase Auth** (nouveau projet), reconfigurer `Site URL` + `Redirect URLs`
(prod Vercel) et les secrets Google (client id/secret).

### 4.5 Migration des comptes

`auth.users`/`auth.identities` : migrer en préservant les `id` (les FK `profiles.id`
en dépendent). Conserver les hash de mots de passe (colonnes `encrypted_password`) et
les identités OAuth. Tester un login email **et** un login Google après bascule.
Détail mesuré : **79 identités < 107 users** (≈28 comptes sans ligne d'identité, legacy/
email) → bien dumper `auth.users` **ET** `auth.identities`. Vérifier aussi que les
colonnes de `auth.users` du **nouveau** projet (version GoTrue) matchent celles du dump
(ne copier que les colonnes communes ; `instance_id`, `aud`/`role='authenticated'`).

> **Périmètre auth = `users` + `identities` UNIQUEMENT.** Le reste du schéma `auth`
> (sessions, refresh_tokens, `audit_log_entries` = 28 508 lignes — la plus grosse table de
> toute la base, flow_state…) **repart à zéro** sur le projet EU : c'est **normal** (état
> GoTrue d'un projet neuf, aucune dépendance applicative — vérifié). Conséquence concrète :
> **tous les utilisateurs devront se reconnecter** après la bascule → **l'annoncer sur la
> page de maintenance**. Journal d'audit Auth vide côté EU = attendu, ne pas s'en alarmer.

### 4.6 Trigger `handle_new_user` — restaurer en mode réplica ⚠️ (bloquant)

Le trigger `on_auth_user_created` (`AFTER INSERT ON auth.users` →
`INSERT INTO public.profiles(... role='student')`, fichier `004_create_profile_trigger.sql`)
**se déclenche pendant la restauration de `auth.users`** :

1. restore `auth.users` → le trigger crée 107 profils stub `role='student'` ;
2. restore du dump `public.profiles` → **collision de clé primaire** (la ligne existe
   déjà) → échec ; et dans le cas dégradé, **profs/admins écrasés en `student`**.

Le `EXCEPTION WHEN unique_violation` du trigger protège l'insert _du trigger_, pas le
COPY du dump. **Correctif** : charger **toutes** les données en mode réplica (désactive
triggers **et** checks FK — règle aussi l'ordre `profiles`↔`auth.users`) :

```sql
set session_replication_role = replica;   -- AVANT tout chargement de données
--   … restore auth.users + auth.identities + public.* (ordre indifférent) …
set session_replication_role = origin;     -- APRÈS
```

> Sans ça, **tous** les triggers se déclenchent au restore (`updated_at`, audits,
> notifications…) avec effets de bord. Le rôle `postgres` de Supabase peut faire ce SET.

### 4.7 RPC / fonctions — ne PAS stripper les privilèges ⚠️ (bloquant)

L'app appelle **~120 RPC distinctes** (`supabase.rpc(...)`, 124 fichiers) : paiements/
gidouilles, trades, achievements, messagerie, jeux… Côté base : **506 fonctions** `public`,
dont **290 `SECURITY DEFINER`**, et **les 506 ont `EXECUTE` accordé à `anon` ET
`authenticated`** (c'est ce qui les expose via l'API PostgREST). `search_path` figé partout
(0 manquant). Donc :

- ⚠️ **Restaurer le schéma AVEC les privilèges.** Le `pg_restore --no-privileges` du guide
  officiel s'applique au **dump de données**, pas au schéma. Appliqué au **schéma**, il fait
  **sauter les 506 GRANT EXECUTE → toutes les RPC renvoient permission-denied → app cassée
  en bloc**. `supabase db dump` + `psql -f schema.sql` conserve les GRANTs (comportement par
  défaut) — ne pas ajouter `--no-privileges` côté schéma.
- **Rôles avant fonctions** : restaurer `roles.sql` (`--role-only`) **en premier** (les 290
  SECURITY DEFINER s'exécutent sous leur owner ; les GRANTs visent `anon`/`authenticated`).
- Après restore, si une RPC renvoie 404 : **recharger le cache PostgREST** →
  `notify pgrst, 'reload schema';`.
- **Ownership (vérifié)** : 384 fonctions owned `postgres`, 122 owned `supabase_admin` (rôle
  managé). Bonne nouvelle : **les 290 SECURITY DEFINER sont TOUTES owned `postgres`** → le
  restore-as-`postgres` est sain. Les `ALTER FUNCTION … OWNER TO supabase_admin` émis par le
  dump peuvent **warner** si `postgres` n'est pas membre de `supabase_admin` : **non bloquant**
  (fonctions non-SECDEF), ne pas confondre avec une vraie erreur. Vérifier après restore que
  les 290 SECURITY DEFINER ont bien `owner = postgres`.

### 4.8 Vérifié absent en prod (rien à migrer — pour éviter une chasse aux fantômes)

Sondé en SQL read-only (2026-06-14) et **confirmé vide/inoffensif** — à ne PAS chercher
pendant le cutover :

- **0 edge function** (pas de `supabase/functions/`).
- **0 secret Vault** (`vault.secrets`), **0 large object**, **0 `pg_graphql`** installé.
- **0 FK NOT VALID**, **0 colonne `GENERATED … IDENTITY`** (les `setval` du `--data-only` suffisent).
- **24/24 vues `public` en `security_invoker`** → owner `postgres` n'introduit **aucun** bypass RLS.
- Tous les **SECURITY DEFINER owned `postgres`** (cf. §4.7).

## 5. Étapes détaillées

### Phase 0 — Prérequis & geler le risque

- [ ] Sauvegarde complète du projet actuel (dump SQL + inventaire Storage).
- [ ] Vérifier le quota d'org Supabase (free tier ≈ 2 projets actifs max — le rollback
      consommera le 2ᵉ slot tant que l'ancien projet vit ; **un projet free se met en
      pause après 7 j d'inactivité** → ne pas laisser traîner la fenêtre).
- [x] ~~Auditer les colonnes stockant des URLs Storage~~ → **fait** : 5 colonnes (§4.1).
- [x] ~~Lister les buckets + politique + volume~~ → **fait** : 7 buckets (Phase 3).
- [x] ~~Noter les jobs pg_cron actifs~~ → **fait** : 8 jobs (§4.3).

### Phase 1 — Nouveau projet EU + schéma (méthode **dump+restore**, officielle Supabase)

> **Choix de méthode (important).** On **dumpe le schéma depuis la prod** (fidèle à
> l'état réel) plutôt que de rejouer les 609 migrations. Raison : la prod **dérive** des
> migrations (`question-images` et `pg_cron` créés via Dashboard) → un `db push` seul
> donnerait une base **infidèle**. C'est aussi la méthode du guide officiel Supabase
> « Migrate from one project to another ». Le `db push` reste un **fallback / outil de
> diff** (les migrations restent la source de vérité du schéma pour la suite).

- [ ] Créer le projet Supabase en **`eu-west-3`**.
- [ ] **Activer les extensions à la main AVANT le restore** : `pg_cron` (pour planifier les
      jobs, cf. §4.3) **+ `vector` + `unaccent`** (toutes deux `WITH SCHEMA public`, du
      `public` en dépend : colonne vector + index, 5 fonctions unaccent — ne PAS supposer
      qu'elles « arrivent avec le dump »). **Ne pas activer `pg_net`.**
- [ ] Dump rôles + schéma depuis la prod, puis restore sur le projet EU :

```bash
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql
psql "$NEW_DB_URL" -f roles.sql
psql "$NEW_DB_URL" -f schema.sql
```

- [ ] **Vérifier les settings per-rôle après `roles.sql`** : `anon`/`authenticated`/
      `authenticator`/`postgres` portent des `ALTER ROLE … SET` (statement_timeout,
      search_path, settings `pgrst.*`) hors dump schéma/data. `select rolname, rolconfig
from pg_roles where rolconfig is not null` doit matcher la prod ; sinon réappliquer.
- [ ] **Recréer les éléments hors schéma `public`** (ni un dump `public`, ni un `db push`
      ne les reproduisent fidèlement) : les **7 buckets** Storage + politiques (Phase 3) et
      les **8 jobs pg_cron** (rejouer les migrations `*pg_cron*`, ou `cron.schedule(...)`
      manuel — liste exacte en §4.3).
- [ ] **Ré-amorcer l'historique de migration** du nouveau projet pour que les futurs
      `supabase db push` marchent : `supabase migration repair --status applied <versions>`
      (ou insérer les versions dans `supabase_migrations.schema_migrations`).
- [ ] Vérifier RLS, functions, triggers, et **`select count(*) from cron.job` = 8**.
- [ ] (Optionnel) `supabase db push` sur une base jetable pour **diff** schéma
      dump ↔ migrations et détecter une dérive non documentée.

### Phase 2 — Données + Auth (**en mode réplica — cf. §4.6**)

- [ ] Dump des données depuis la prod :

```bash
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only
```

- [ ] Restaurer **en mode réplica** (désactive triggers + FK — **indispensable** à cause de
      `handle_new_user`, sinon collision PK sur `profiles` / rôles écrasés) :

```sql
set session_replication_role = replica;
\i data.sql
--   + restore auth.users / auth.identities (étape ci-dessous)
set session_replication_role = origin;
```

- [ ] Migrer `auth.users` + `auth.identities` en **préservant les `id`** (107 / 79 ;
      schéma `auth` managé → ne copier que les colonnes communes, cf. §4.5).
- [ ] **Contrôle d'orphelins (FK auth)** : **24 FK** `public.*` → `auth.users`. En mode
      réplica les FK sont off et Postgres ne les re-valide PAS au passage `origin` → si un
      user saute, orphelins silencieux. Vérifier `auth.users` cible = **107** ET 0 orphelin
      (au moins `select count(*) from profiles p where not exists (select 1 from auth.users u where u.id = p.id)` = 0).
- [ ] Recompter les lignes table par table (parité source/cible).
- [ ] Vérifier les séquences (`--data-only` émet les `setval`).
- [ ] **`refresh materialized view public.student_achievement_stats;`** (1 matview, vide
      après un restore `--data-only`).
- [ ] **`analyze;`** (ou `vacuum analyze;`) — un restore recrée les index mais PAS les
      statistiques → sinon premiers plans de requête mauvais = lenteurs après cutover.

### Phase 3 — Storage (inventaire **mesuré en prod**, pas dans les migrations)

⚠️ `question-images` (le plus gros) **n'est créé par aucune migration** → recréer les
buckets depuis cette liste, pas via `db push`. Flags exacts à reproduire :

| bucket                   | public   | file_size_limit | objets   |
| ------------------------ | -------- | --------------- | -------- |
| `question-images`        | ✅       | 5 MB            | 254      |
| `vip-card-images`        | ✅       | 5 MB            | 44       |
| `exercise-images`        | ✅       | —               | 39       |
| `bug-report-screenshots` | 🔒 privé | 5 MB            | 2        |
| `parody-evaluations`     | ✅       | —               | 1        |
| `chat-attachments`       | ✅       | —               | 0 (skip) |
| `chapter-documents`      | 🔒 privé | 10 MB           | 0 (skip) |

- [ ] Recréer les 5 buckets non vides (mêmes `public` + `file_size_limit`).
- [ ] Recopier les **~340 objets** (script `@supabase/supabase-js` list+download+upload —
      volume total **~13 MB**, pas besoin de `rclone`). Le bucket **privé**
      `bug-report-screenshots` exige le `service_role` pour télécharger.
- [ ] **Politiques RLS du schéma `storage` (27 policies) — ⚠️ PAS dans un dump `public`.**
      `supabase db dump -f schema.sql` ne dumpe que `public` → les 27 policies storage
      seraient **perdues**. Les ramener explicitement : `supabase db dump --schema storage`
      (ou rejouer les 7 migrations qui touchent `storage.objects`). Valider qu'elles
      couvrent bien `question-images`.

### Phase 4 — Réécriture des URLs en base (cf. §4.1)

- [ ] Exécuter les 5 `UPDATE` (remplacer `<NEW_REF>` par le ref du nouveau projet) :

```sql
update tutor_conversations set exercise_statement  = replace(exercise_statement,'aqtijumsgfufoztohdua','<NEW_REF>') where exercise_statement  like '%aqtijumsgfufoztohdua%';
update tutor_conversations set exercise_correction = replace(exercise_correction,'aqtijumsgfufoztohdua','<NEW_REF>') where exercise_correction like '%aqtijumsgfufoztohdua%';
update vip_card_templates  set image_path          = replace(image_path,'aqtijumsgfufoztohdua','<NEW_REF>')          where image_path          like '%aqtijumsgfufoztohdua%';
update bug_reports         set screenshot_url      = replace(screenshot_url,'aqtijumsgfufoztohdua','<NEW_REF>')      where screenshot_url      like '%aqtijumsgfufoztohdua%';
update exercises           set variations          = replace(variations::text,'aqtijumsgfufoztohdua','<NEW_REF>')::jsonb where variations::text like '%aqtijumsgfufoztohdua%';
```

- [ ] Rejouer la **requête d'audit** de §4.1 → doit renvoyer **0 ligne**.

### Phase 5 — Secrets / env / code

- [ ] Récupérer URL + `anon` + `service_role` du nouveau projet.
- [ ] Mettre à jour les env **Vercel** (prod + preview + dev), en distinguant **ce qui
      CHANGE** — `PUBLIC_SUPABASE_URL`, `*_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (nouveau
      projet) — de **ce qui se RECOPIE VERBATIM** (sinon ça casse) : ⚠️
      **`GOOGLE_TOKEN_ENCRYPTION_KEY`** (sinon la ligne `google_integrations` devient
      **indéchiffrable**), `GOOGLE_CLASSROOM_CLIENT_ID`/`SECRET`/`REDIRECT_URI`,
      `CRON_SECRET`, `BREVO_API_KEY` (+ `SENDER_*`), `GROQ_API_KEY`, `HF_API_KEY`, `PUBLIC_APP_URL`.
- [x] ~~**Code de prod (host Storage)** : réécrire `GameControls`/`Game2048Controls`~~ →
      **fait à froid** (commit `22e771f9b`) : helper `storageUrl()` dérivé de
      `PUBLIC_SUPABASE_URL`, plus de host littéral.
- [ ] `.mcp.json:9` : nouveau `--project-ref`.
- [ ] `package.json:53` : nouveau `--project-id` ; relancer `pnpm db:types`.
- [ ] `scripts/image-url-mapping.json` : régénérer/remplacer le ref.
- [ ] Scripts (`migrate-missing-images.ts`, `migrate-constructions-to-dsl.ts`,
      `import-fixtures-to-dsl.ts`) : remplacer le ref si encore utilisés.
- [ ] Docstrings/tests (`vip-card-admin.ts`/`.test.ts`) : remplacer le ref.
- [ ] Local : `pnpm env:pull` (une fois Vercel à jour) → `.env.local`.
- [ ] Docs mentionnant l'ancien ref : mettre à jour ou marquer historique
      (ne PAS toucher les migrations SQL historiques).
- [ ] Vérif finale : `grep -rl aqtijumsgfufoztohdua --exclude-dir=node_modules .`
      ne doit plus renvoyer que les migrations historiques + ce plan.

### Phase 6 — Auth / OAuth (cf. 4.4)

- [ ] Google Cloud Console : ajouter le callback du nouveau projet.
- [ ] Supabase Auth (nouveau) : `Site URL`, `Redirect URLs`, secrets Google.

### Phase 6bis — Vérifications Dashboard (hors dump SQL) ⚠️

> Config qui **n'est dans aucun dump** : elle vit dans le Dashboard Supabase / la plateforme.
> À **comparer Dashboard ↔ Dashboard** (ancien → EU) et re-saisir à la main. Non vérifiable
> en SQL read-only → checklist. Les **2 premiers** points peuvent **casser login/emails** ;
> les autres = confirmer que les défauts correspondent.

- [ ] **Auth Hooks** (Authentication → Hooks) : vérifier s'il existe un _custom access token
      hook_ / _before-user-created hook_. Si oui, le recréer sur EU — sinon des claims JWT
      manqueraient **en silence** (autorisations cassées). 🔴
- [ ] **SMTP + templates email** (Authentication → Emails) : si Supabase envoie les emails
      d'auth (confirm/reset/invite/magic-link), reconfigurer le SMTP + recopier les templates
      FR. _(À confirmer : si l'app passe par Brevo directement, sans objet.)_ 🔴
- [ ] **Auth settings** (Authentication → Providers + Policies) : confirmations email on/off,
      double opt-in, password policy, rate limits, durées de session → aligner sur l'ancien.
- [ ] **API → Exposed schemas / Max rows** (Settings → API) : si un schéma autre que `public`
      est exposé (PostgREST), le reproduire ; sinon ses endpoints disparaissent.
- [ ] **JWT secret** : un nouveau projet = nouveau secret. Au-delà du re-login global (§4.5),
      s'assurer qu'**aucun service externe** ne détient un `anon`/`service_role` en dur non mis à jour.
- [ ] (Rappel) **Vercel `cdg1`** : confirmer la dispo sur le plan Free au déploiement (cf.
      Phase 7) — sinon fallback `iad1`.

### Phase 7 — Vercel région

- [ ] `svelte.config.js` : `adapter({ runtime: 'nodejs22.x', regions: ['cdg1'] })`.
- [ ] Redéployer ; vérifier que les fonctions tournent bien en `cdg1`.

### Phase 8 — Cutover (fenêtre de maintenance)

- [ ] **Activer le mode maintenance** : `MAINTENANCE_MODE=true` +
      `MAINTENANCE_BYPASS_SECRET` sur Vercel (+ redeploy). Implémenté, 503 indépendant
      de la DB, bypass opérateur `/?bypass=<secret>` → cf.
      `docs/wip/maintenance-page-progress.md`.
- [ ] **Couper le cron sur l'ANCIEN projet** (après maintenance ON, AVANT le dump) :
      `select cron.unschedule(jobid) from cron.job;` puis vérifier `count(*) from cron.job = 0`.
      Sinon `cleanup-stale-trades` (toutes les 10 min) et surtout **`rgpd-retention-cleanup`**
      continuent de muter/supprimer des données **après** ton dump (les réactiver au rollback).
- [ ] **Dump complet final** (`pg_dump` n'est pas incrémental — et inutile de l'être :
      152 MB / 107 users se dumpent+restaurent en minutes). Maintenance ON → un seul
      `pg_dump` à froid → restore **en mode réplica** (§4.6) → Phase 4 (URLs). Pas de
      différentiel à gérer.
- [ ] Basculer les env Vercel sur le nouveau projet ; redéployer.
- [ ] Smoke tests prod (voir Phase 9).
- [ ] Lever le mode maintenance (`MAINTENANCE_MODE=false` + redeploy ; supprimer le secret).

### Phase 9 — Tests post-migration

- [ ] Login email + login **Google** OK.
- [ ] Images (cartes VIP, questions) s'affichent (URLs réécrites OK).
- [ ] Une question complète : génération, validation, sauvegarde.
- [ ] **`select count(*) from cron.job` = 8** (sinon pg_cron n'était pas activé au push,
      cf. §4.3) ; un job se déclenche (ou trigger manuel via `/api/admin/cron/trigger`).
- [ ] **Parité sécurité/logique** (compté en prod le 2026-06-14, doit matcher après
      restore) : `public` **780 policies RLS** sur **203/203 tables RLS-enabled**,
      **storage 27 policies**, **cron 2** ; **506 fonctions** + **159 triggers** (public).
      Requête : `select schemaname,count(*) from pg_policies group by 1;`. Aussi : **1 matview**,
      **9 enums**, **2 publications** (tester un _broadcast_, pas que `postgres_changes`),
      event triggers `pgrst_ddl_watch`/`pgrst_drop_watch` présents.
- [ ] RLS fonctionnel : un élève ne voit que ses données ; un prof voit sa classe.
- [ ] **RPC** (cf. §4.7) : une RPC `SECURITY DEFINER` sensible marche bout-en-bout (ex.
      `use_vip_card` / `deduct_gidouilles_atomic`) ; **aucune** RPC ne renvoie 401/403/404
      (sinon GRANTs sautés ou cache PostgREST à recharger).
- [ ] Realtime (`messages`) fonctionne (chat/présence).
- [ ] Tuteur IA : un échange existant s'affiche avec ses images (colonnes
      `tutor_conversations.*` réécrites en Phase 4).

## 6. Rollback

- Tant que le cutover (Phase 8) n'est pas validé, l'**ancien projet reste intact** →
  rollback = repointer les env Vercel sur l'ancien ref + redéployer.
- Ne **pas supprimer** l'ancien projet avant ~1-2 semaines de stabilité confirmée.

## 7. RGPD

- [ ] Mettre à jour le **registre des traitements** : hébergement EU (`eu-west-3`).
- [ ] Vérifier la localisation EU de **tous** les sous-traitants (Vercel `cdg1`,
      Brevo email, etc.).
- [ ] Mention d'hébergement/données dans la politique de confidentialité.

## 8. Estimation

- Préparation + audit URLs : ~0.5 j (**audit déjà fait**, cf. §4.1/§4.3/Phase 3).
- Setup projet + schéma + données + Storage + Auth : ~1 j (Storage = **13 MB**, pas un
  facteur ; le temps part dans l'auth + la validation, pas le volume).
- Réécriture URLs + env + OAuth + tests : ~0.5 j.
- Cutover : fenêtre de ~1–2 h.
- **Total réaliste : ~2 jours.** Le risque résiduel n'est pas le volume mais la fidélité
  auth/triggers (§4.6) et l'ordre pg_cron (§4.3).

## 9. Décisions en attente (David)

1. ~~Région cible~~ → **DÉCIDÉ : `eu-west-3` (Paris)** (2026-06-14).
2. **Fenêtre de bascule** : quand ? **Recommandé : pendant les grandes vacances
   (juillet-août), usage quasi nul** → fenêtre sans stress. À défaut : un week-end tôt
   le matin (ex. dimanche 6-8 h). Durée à prévoir : ~30 min-2 h (cf. §8).
3. ~~Faut-il un mode maintenance ?~~ → **DÉJÀ TRANCHÉ/CONSTRUIT** : `src/lib/server/maintenance.ts`
   (503 sans dépendance DB, câblé avant le handle Supabase, bypass opérateur ; docstring
   cite explicitement « the Supabase EU migration cutover »). On l'utilise (Phase 8).
4. ~~Confirmer la région actuelle~~ → **CONFIRMÉ : `us-east-2` (Ohio, US)**.

## 10. Pérennité — rendre la PROCHAINE migration triviale

La difficulté de **cette** migration vient de **4 causes racines**. Les corriger une fois
(indépendamment de la migration — et ça réduit aussi le risque de celle-ci) rend les
suivantes quasi gratuites :

| Cause racine                            | Symptôme actuel                                           | Correctif durable                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) URLs absolues stockées en base**  | Phase 4 : 5 colonnes à réécrire (189 lignes)              | Stocker des **chemins relatifs** (`vip-card-images/x.webp`) et composer l'URL au rendu via `PUBLIC_SUPABASE_URL`. Migration de normalisation des données + garde (validation/CHECK) interdisant de re-stocker une URL absolue. → **Phase 4 disparaît** la prochaine fois.                                                          |
| **(b) Host codé en dur dans le code**   | 2 composants jeux + `package.json` + `.mcp.json`          | Un seul helper `storageUrl(bucket, path)` dérivé de l'env, **zéro host littéral** (le pattern existe déjà dans `src/lib/questions/constants.ts → getQuestionImageUrl`).                                                                                                                                                            |
| **(c) Dérive prod ↔ migrations**       | `question-images` & `pg_cron` créés via Dashboard         | Mettre la **création des buckets + activation des extensions dans des migrations**. Un `db push` redevient fidèle → le replay redevient une option sûre.                                                                                                                                                                           |
| **(d) Config Dashboard non versionnée** | Phase 6bis : Auth hooks/SMTP/settings re-saisis à la main | Versionner la config Auth/API/Storage dans `supabase/config.toml` (déjà présent dans le repo) et l'appliquer au nouveau projet via `supabase config push`, au lieu du Dashboard. Pré-requis : mettre d'abord `config.toml` en cohérence avec la prod. Les **secrets** (client secrets OAuth, SMTP) restent gérés à part (Phase 5). |

**Bonus** : transformer le cutover en **script testé** (dump → restore-réplica → réécriture
URLs → copie Storage → vérifs §9) — rejouable prod→staging de temps en temps. Une opération
de ~2 jours artisanale devient un bouton.

> Les correctifs **(a)/(b)/(c)/(d)** sont indépendants de la migration et peuvent être faits
> **dès maintenant, à froid**. **(b) ✅ fait** (commit `22e771f9b`, helper `storageUrl()`) ;
> (a) est le plus rentable (supprime toute la Phase 4) ; (d) supprime l'essentiel de la Phase 6bis.
