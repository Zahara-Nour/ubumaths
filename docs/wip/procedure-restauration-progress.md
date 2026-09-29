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

1. `drop schema public cascade; create schema public;`
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

- **Droits sur la prod** : en local, le rôle `postgres` a pu vider `auth.*` et
  poser `session_replication_role = replica`. Sur le projet hébergé, à
  vérifier (une restauration qui échoue au milieu laisse une base à moitié
  vidée).
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
