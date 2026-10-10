# Procédure de sauvegarde et de restauration de la base, progression

> Ouvert le 2026-09-29 à la demande de David. **Procédure établie et testée
> sur la pile LOCALE le 2026-09-29** (section « Procédure testée »). **Jamais
> exécutée contre la prod** : tant que les points « Reste à établir » ne sont
> pas levés, aucune opération risquée sur la prod ne doit compter dessus.

## Pourquoi

La base de production contient les données réelles d'élèves mineurs. Une
opération risquée (migration destructive, nettoyage de données) n'a de filet
que si l'on sait **restaurer** — pas seulement sauvegarder. Or, le 2026-09-29,
en convertissant les check-lists de `scripts/` (commit `f05a02ddf`) :

- leur « sauvegarde de production » (`supabase db dump -f …`) ne contenait
  **aucune donnée** ;
- leur restauration (`supabase db restore …`) utilisait une commande **qui
  n'existe pas**.

Si ces check-lists ont été suivies, la sauvegarde faite alors était inutile
pour restaurer des données. Il n'existe aujourd'hui **aucune procédure de
restauration testée**.

## Ce qui est vérifié (CLI du projet, 2.118.0, `pnpm exec supabase`)

- `db dump` **sans option** passe `--schema-only` à `pg_dump` (vu avec
  `pnpm exec supabase db dump --local --dry-run`) : schéma seul.
- `db dump --data-only` passe `--data-only --column-inserts
--rows-per-insert 100000` : les données, en `INSERT`.
- Cibles disponibles : `--linked` (projet lié : prod), `--local`, `--db-url`.
- Sous-commandes de `db` : diff, dump, push, pull, reset, lint, start, query,
  advisors, schema. **Pas de `restore`** (`Unknown subcommand "restore"`).

Sauvegarde en deux fichiers, commandes vérifiées (options), **pas encore
exécutées sur la prod** :

```bash
pnpm exec supabase db dump --linked -f backup-<date>-schema.sql
pnpm exec supabase db dump --linked --data-only -f backup-<date>-data.sql
```

## Ce qui n'est PAS établi

1. **Restaurer ces dumps** : rejouer `schema.sql` puis `data.sql` avec `psql`
   est la piste évidente, **jamais testée ici**. Inconnues : ordre et
   contraintes (clés étrangères, triggers pendant l'insertion des données),
   séquences, rôles et droits (`--role-only` existe), schémas gérés par
   Supabase (`auth`, `storage`) — que contiennent les dumps, et que faut-il
   restaurer ou non ?
2. **Ce que les dumps ne contiennent pas** : les **fichiers** de Storage (le
   dump ne voit que la table `storage.objects`, pas les fichiers eux-mêmes),
   les comptes `auth.users` (à vérifier dans le dump), la configuration du
   projet (auth, e-mails, secrets).
3. **Les sauvegardes du tableau de bord Supabase** : existent-elles pour ce
   projet, à quelle fréquence, avec quelle rétention, et le « point in time »
   est-il disponible ? Dépend de l'offre souscrite — **à vérifier dans le
   tableau de bord**, pas à supposer.
4. **Restaurer sur place ou à côté** : écraser la prod, ou restaurer dans une
   base à part puis recopier le nécessaire ? (Lien avec
   `docs/wip/base-staging-progress.md` : une base de staging pourrait servir
   de cible de répétition.)
5. **Données sensibles** : un fichier de dump de prod contient des données de
   mineurs. Où le stocker, combien de temps, et comment le détruire (RGPD) ?
   Jamais dans le dépôt.

## Plan de test (sur la pile LOCALE uniquement)

1. `pnpm db:reset` + `pnpm db:dev-accounts` → une base locale avec des données
   de test connues.
2. Compter quelques tables de référence (profils, classes, réponses).
3. `pnpm exec supabase db dump --local -f /tmp/x-schema.sql` puis
   `--data-only -f /tmp/x-data.sql`.
4. Casser la base (supprimer des lignes, une table).
5. Essayer la restauration (`psql` sur les deux fichiers, dans l'ordre), noter
   **chaque** erreur.
6. Recompter : mêmes nombres ? Connexion avec un compte de test possible ?
   RLS et triggers toujours en place ?
7. Écrire ici la procédure qui a marché, avec ses commandes exactes et ce
   qu'elle ne restaure pas.

## Procédure testée (pile locale, 2026-09-29)

**Sauvegarde = TROIS fichiers.** Le dump du schéma ne contient que `public` :
les objets posés sur `auth` et `storage` qui dépendent de `public` (le trigger
`on_auth_user_created`, qui crée le profil à l'inscription, et les 4 policies
des documents de chapitre sur `storage.objects`) sont **perdus** par
`drop schema public cascade` sans être dans le dump. Une restauration à deux
fichiers laisse une base aux données intactes mais où **toute inscription crée
un compte sans profil** — sans aucune erreur.

```bash
# Cible : --local pour le test ; --linked visera la prod (jamais essayé).
pnpm exec supabase db dump --local -f x-schema.sql
pnpm exec supabase db dump --local --data-only -f x-data.sql
# Objets hors `public` (search_path vide → noms entièrement qualifiés) :
{ echo "set search_path = '';"; cat extraire-hors-public.sql; } \
  | docker exec -i supabase_db_ubumaths psql -U postgres -d postgres -At \
  | grep -v '^SET$' > x-hors-public.sql
```

`extraire-hors-public.sql` :

```sql
-- Objets posés sur auth/storage (hors du dump de `public`) : triggers et policies.
-- Chaque définition est précédée d'un DROP IF EXISTS : le fichier se rejoue sans risque.
select format('DROP TRIGGER IF EXISTS %I ON %I.%I;', t.tgname, n.nspname, c.relname) || E'\n' ||
       pg_get_triggerdef(t.oid) || ';'
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and n.nspname in ('auth', 'storage')
union all
select format('DROP POLICY IF EXISTS %I ON %I.%I;', policyname, schemaname, tablename) || E'\n' ||
       format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
              policyname, schemaname, tablename, permissive, cmd, array_to_string(roles, ', '),
              coalesce(' USING (' || qual || ')', ''),
              coalesce(' WITH CHECK (' || with_check || ')', ''))
from pg_policies where schemaname = 'storage';
```

**Restauration**, dans cet ordre, en une passe `psql` avec `ON_ERROR_STOP`, sous
le verrou partagé (`bash scripts/with-db-lock.sh …`) :

1. `drop schema public cascade; create schema public authorization pg_database_owner;`
   (en prod, `public` appartient à `pg_database_owner` ; un simple
   `create schema public` le rendrait propriété de `postgres`)
2. `x-schema.sql` (tables, fonctions, policies et droits de `public`,
   extensions `vector` et `unaccent`) ;
3. `x-hors-public.sql` (triggers et policies de `auth` / `storage`) ;
4. `truncate auth.users, auth.identities cascade; truncate storage.buckets cascade;`
   (le dump de données les contient ; la cascade vide aussi les sessions) ;
5. `x-data.sql` — il pose `session_replication_role = replica`, ce qui
   neutralise les clés étrangères circulaires signalées par `pg_dump`
   (`profiles`, `srs_decks`) ; il contient aussi les `setval` des séquences.

`psql` : celui du conteneur de la pile (`docker exec … psql`), pas besoin d'un
client installé sur le Mac.

### Preuves

- Casse réaliste : lignes supprimées (`worksheet_templates`), table supprimée
  en cascade (`curriculum_points`, 453 lignes), compte supprimé (élève).
- Restauration : **0 erreur**. Empreinte **identique** à la référence : nombre
  de lignes de chaque table de `public`, `auth`, `storage` + nombres de
  policies, tables RLS, triggers, fonctions, séquences (253 mesures), et **noms**
  des 962 policies et triggers.
- **Fonctionnel** : `pnpm test:integration` sur la base restaurée = 121/121
  fichiers, 1065 tests.
- **Contrôle inverse** : sans le trigger et les 4 policies (le défaut de la
  version à deux fichiers), 21 tests échouent dans 9 fichiers (inscription,
  profil, RGPD, documents) → le vert ci-dessus prouve bien quelque chose. Les
  objets remis avec le seul `x-hors-public.sql` → 71/71.
- Première tentative (deux fichiers) : données identiques, mais 4 policies et
  1 trigger manquants — c'est ce qui a imposé le troisième fichier.

### Reste à établir avant tout usage sur la prod

- ~~**Droits sur la prod**~~ : **vérifiés le 2026-09-29** (section « Droits du
  rôle `postgres` en prod »), identiques au local.
- **`--linked`** : jamais exécuté. Durée et taille sur les vraies données :
  inconnues.
- **Hors dumps** : fichiers de Storage (seule la table `storage.objects` est
  sauvegardée), configuration du projet (auth, e-mails, secrets).
- **Objets hors `public` non couverts** par l'extraction : seulement triggers
  de `auth`/`storage` et policies de `storage`. Une fonction ou une vue créée
  par une migration dans un autre schéma ne serait pas sauvegardée — à
  recenser (`grep` des migrations hors `public`).
- **Sauvegardes du tableau de bord Supabase** : non vérifiées (points 3 à 5
  ci-dessus toujours ouverts).
- **Restaurer à côté** plutôt que sur place : non testé.

## Recensement des objets hors `public` (2026-09-29)

Deux angles : le catalogue de la base locale (objets appartenant au rôle des
migrations, `postgres`, hors `public` ; publications ; `pg_cron`) et le texte
des 123 migrations.

| Objet                                                                                                                                                          | Où                                      | Couvert par la sauvegarde ?                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger `on_auth_user_created` → `public.handle_new_user`                                                                                                      | `auth.users`                            | ✅ 3ᵉ fichier (`x-hors-public.sql`)                                                                                                                                           |
| 4 policies « Teachers can … chapter documents »                                                                                                                | `storage.objects`                       | ✅ 3ᵉ fichier                                                                                                                                                                 |
| Publication `supabase_realtime` : `messages`, `notifications`, `student_achievements`, `minesweeper_multiplayer_matches`, `minesweeper_multiplayer_game_state` | hors schéma                             | ✅ dump de schéma (`ALTER PUBLICATION … ADD TABLE`) ; vérifié présent après restauration                                                                                      |
| Extensions `vector`, `unaccent`                                                                                                                                | `public`                                | ✅ dump de schéma                                                                                                                                                             |
| Lignes `auth.users`, `auth.identities`, `storage.buckets`                                                                                                      | `auth`, `storage`                       | ✅ dump de données                                                                                                                                                            |
| Historique des migrations                                                                                                                                      | `supabase_migrations.schema_migrations` | ⚠️ non sauvegardé ; intact en restauration **sur place**, à reconstituer dans un **nouveau** projet                                                                           |
| **Tâches `pg_cron`** (ex. `flag_stale_python_rechecks`)                                                                                                        | `cron.job`                              | ❌ **programmées à la main sur la prod** (« OUT OF BAND, like every other job », migration `20260827120000`) : dans **aucun** fichier du dépôt ; `cron.job` est vide en local |
| Policies `cron_job_policy`, `cron_job_run_details_policy`                                                                                                      | `cron`                                  | — fournies par l'extension `pg_cron`                                                                                                                                          |

Aucune fonction, vue, type ou table du projet hors `public` (hors
`supabase_migrations`).

### Conséquences pour la procédure

- **Tâches `pg_cron` pendant une restauration sur place** : elles survivent
  (`cron` n'est pas touché) et appellent des fonctions de `public` par leur
  nom — mais elles **continuent de se déclencher pendant la restauration**, sur
  une base à moitié vidée. Les **suspendre** avant
  (`cron.alter_job(<id>, active := false)`), les réactiver après.
- **Trafic applicatif pendant la restauration** : couper l'accès
  (`pnpm maintenance:on`, puis `:off`).
- **Liste des tâches de prod** : relevée le 2026-09-29 (section « Tâches
  `pg_cron` de la production » ci-dessous).

## Tâches `pg_cron` de la production (relevées le 2026-09-29)

Relevé en lecture seule (`select … from cron.job`, via
`pnpm exec supabase db query --linked`). Ces tâches ont été programmées **à la
main** : ce tableau est leur seule trace dans le dépôt. **À tenir à jour** à
chaque tâche ajoutée, modifiée ou supprimée en prod.

| jobid | Nom                                 | Planification (UTC) | Commande                                                |
| ----- | ----------------------------------- | ------------------- | ------------------------------------------------------- |
| 1     | `cleanup-stale-trades`              | `*/10 * * * *`      | `SELECT public.cleanup_stale_trades()`                  |
| 2     | `recalculate-minesweeper-ref-times` | `30 1 * * 0`        | `SELECT public.run_recalculate_minesweeper_ref_times()` |
| 3     | `cleanup-stuck-job-runs`            | `30 * * * *`        | `SELECT public.cleanup_stuck_job_runs()`                |
| 4     | `weekly-best-bonuses`               | `0 0,12 * * *`      | `SELECT public.run_weekly_best_bonuses()`               |
| 5     | `weekly-rewards`                    | `0 0,12 * * *`      | `SELECT public.run_weekly_rewards()`                    |
| 6     | `daily-summaries`                   | `0 * * * *`         | `SELECT public.run_daily_summaries()`                   |
| 7     | `cleanup-all`                       | `0 2 * * *`         | `SELECT public.run_cleanup_all()`                       |
| 8     | `rgpd-retention-cleanup`            | `0 3 * * 0`         | `SELECT public.run_cleanup_expired_data()`              |

Toutes actives, exécutées par `postgres`. Les 8 fonctions appelées existent
dans le schéma issu des migrations (vérifié sur la pile locale) : une
restauration les recrée.

⚠️ **Non programmée** : `flag_stale_python_rechecks`, que la migration
`20260827120000_python_submission_server_verification.sql` décrit comme « à
programmer » (horaire, `15 * * * *`). La fonction
`public.run_flag_stale_python_rechecks()` existe mais **ne tourne jamais** en
prod. À trancher par David (oubli ou choix).

**Recréer dans un nouveau projet :**

```sql
select cron.schedule('cleanup-stale-trades', '*/10 * * * *', 'SELECT public.cleanup_stale_trades()');
select cron.schedule('recalculate-minesweeper-ref-times', '30 1 * * 0', 'SELECT public.run_recalculate_minesweeper_ref_times()');
select cron.schedule('cleanup-stuck-job-runs', '30 * * * *', 'SELECT public.cleanup_stuck_job_runs()');
select cron.schedule('weekly-best-bonuses', '0 0,12 * * *', 'SELECT public.run_weekly_best_bonuses()');
select cron.schedule('weekly-rewards', '0 0,12 * * *', 'SELECT public.run_weekly_rewards()');
select cron.schedule('daily-summaries', '0 * * * *', 'SELECT public.run_daily_summaries()');
select cron.schedule('cleanup-all', '0 2 * * *', 'SELECT public.run_cleanup_all()');
select cron.schedule('rgpd-retention-cleanup', '0 3 * * 0', 'SELECT public.run_cleanup_expired_data()');
```

**Suspendre pendant une restauration sur place, puis réactiver** (non testé) :

```sql
select cron.alter_job(jobid, active := false) from cron.job;  -- avant
select cron.alter_job(jobid, active := true)  from cron.job;  -- après
```

`cleanup-stale-trades` tourne toutes les 10 minutes et `daily-summaries`
toutes les heures : une restauration de plus de quelques minutes les croisera
presque sûrement.

## Droits du rôle `postgres` en prod (vérifiés le 2026-09-29)

Même requête, en lecture seule, sur la pile locale et sur la prod
(`pnpm exec supabase db query --linked -f …`, exécutée par `postgres`).
Prod = Postgres 17.6.

| Capacité requise par la restauration                             | Local | Prod | Par quel mécanisme                                                                    |
| ---------------------------------------------------------------- | ----- | ---- | ------------------------------------------------------------------------------------- |
| Supprimer et recréer `public`                                    | ✅    | ✅   | `postgres` possède la base → membre de `pg_database_owner` ; `CREATE` sur la base     |
| `session_replication_role = replica`                             | ✅    | ✅   | `supautils.privileged_role_allowed_configs` (`postgres` ∈ `supabase_privileged_role`) |
| `truncate` de `auth.users`, `auth.identities`, `storage.buckets` | ✅    | ✅   | privilège `TRUNCATE` accordé                                                          |
| Trigger sur `auth.users`                                         | ✅    | ✅   | privilège `TRIGGER` + `supautils.drop_trigger_grants`                                 |
| Policies sur `storage.objects`                                   | ✅    | ✅   | `supautils.policy_grants` (le propriétaire est `supabase_storage_admin`)              |
| Suspendre les tâches (`cron.alter_job`)                          | ✅    | ✅   | `EXECUTE` accordé                                                                     |

⚠️ Les fonctions classiques mentent ici : `has_parameter_privilege(…,
'session_replication_role', 'SET')` rend `false` en local comme en prod, et
`postgres` n'est pas membre du propriétaire de `storage.objects` — pourtant la
restauration locale a fait les deux. C'est `supautils` qui accorde ces droits à
l'exécution. **Seule vraie différence** : le propriétaire de `public`
(`pg_database_owner` en prod, `postgres` en local) → étape 1 corrigée.

Vérifié par le catalogue, **pas par l'action** sur la prod : la preuve par
l'action reste une restauration de répétition (base à part, ou staging).

## Questions pour David

- Quelle perte de données est acceptable en cas de problème (une heure, un
  jour) ? Ça dit s'il faut les sauvegardes Supabase, des dumps réguliers, ou
  les deux.
- Accès au tableau de bord pour vérifier les sauvegardes disponibles
  (point 3) : qui le fait, toi ou moi via un outil en lecture seule ?
- Où conserver un dump de prod, et combien de temps ?

## Journal

- 2026-09-29 — Ouvert. Constat : sauvegarde des check-lists = schéma seul,
  `db restore` inexistant. Commandes de sauvegarde vérifiées (options, pas
  exécutées). Restauration : rien d'établi.
- 2026-09-29 — **Plan de test déroulé en local.** 1ʳᵉ tentative (2 fichiers) :
  données identiques, mais trigger `on_auth_user_created` et 4 policies de
  `storage.objects` perdus. Procédure à **3 fichiers** : empreinte identique
  (253 mesures, 962 noms), suite d'intégration 121/121 sur la base restaurée,
  contrôle inverse 21 échecs sans les objets. Pas de `psql` à installer.
  Base locale laissée dans l'état restauré (suite d'intégration passée dessus), comptes de dev remis (`db:dev-accounts`).
- 2026-09-29 — **Recensement hors `public`** : couverts = trigger `auth.users`,
  4 policies `storage.objects`, publication Realtime (dans le dump de schéma,
  vérifié), extensions, lignes `auth`/`storage`. Non couverts : historique des
  migrations (sans effet sur place) et **tâches `pg_cron` programmées à la main
  sur la prod**, absentes du dépôt. Ajouts à la procédure : suspendre les
  tâches cron et passer en maintenance pendant une restauration.
- 2026-09-29 — **Tâches `pg_cron` de prod relevées** (lecture seule, CLI
  `db query --linked` ; le MCP read-only a refusé : `SUPABASE_ACCESS_TOKEN` non
  exporté sur le Mac mini). 8 tâches actives, fonctions toutes présentes dans
  les migrations. `flag_stale_python_rechecks` n'est PAS programmée.
- 2026-09-29 — **Droits de `postgres` en prod vérifiés** (lecture seule) :
  mêmes capacités qu'en local, via la propriété de la base et `supautils`. Seule
  différence : `public` appartient à `pg_database_owner` en prod → étape 1 de la
  restauration corrigée (`create schema public authorization pg_database_owner`).

Vérifié contre le code le 2026-10-10.
