# Procédure de sauvegarde et de restauration de la base, progression

> Ouvert le 2026-09-29 à la demande de David. **Rien n'est établi ni testé.**
> Ce document pose ce qui est vérifié, ce qui ne l'est pas, et comment le
> tester. Tant qu'il n'est pas terminé, **aucune opération risquée sur la prod
> ne doit compter sur une restauration**.

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
