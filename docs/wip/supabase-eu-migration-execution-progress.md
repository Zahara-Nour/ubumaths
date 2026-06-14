# Migration Supabase EU — Journal d'EXÉCUTION (2026-06-14)

> Suivi de l'exécution réelle du cutover. Plan de référence :
> [`supabase-eu-migration-plan.md`](./supabase-eu-migration-plan.md).
> ⚠️ **L'état vit dans la nouvelle DB**, pas dans git — ce doc sert à reprendre sur crash.

## Projets & accès

- **Ancien (source)** : `aqtijumsgfufoztohdua` — us-east-2. Pooler Session :
  `aws-1-us-east-2.pooler.supabase.com:5432`, user `postgres.aqtijumsgfufoztohdua`.
- **Nouveau (cible)** : `cnevnzsvixxpnurautls` — **eu-west-3**. Pooler Session :
  `aws-0-eu-west-3.pooler.supabase.com:5432`, user `postgres.cnevnzsvixxpnurautls`.
- ⚠️ **Connexions DIRECTES `db.<ref>.supabase.co:5432` ne résolvent pas** (IPv6-only) →
  **toujours passer par le Session pooler** ci-dessus.
- ⚠️ **2 mots de passe DB partagés en clair dans le chat** → **à régénérer tous les deux**
  une fois la migration validée.

## Outils

- Client : **libpq** `/opt/homebrew/opt/libpq/bin/` (psql/pg_dump **18.4**). Keg-only.
- **Pas de Docker**, **pas de `supabase db dump`** (exige Docker) → tout en **pg_dump/psql natif**.
- Fichiers de travail : `/tmp/eu-migration/` (⚠️ **éphémère**, perdu au reboot).

## Fait & VÉRIFIÉ

- **Phase 1 — schéma** (`pg_dump --schema-only --schema=public`, AVEC privilèges) :
  tables **203**, fonctions **384** (nos `postgres` ; +122 plateforme via extensions = 507),
  policies **780**, triggers **159**, enums **9**, matview **1** — parité exacte.
  Extensions `vector`/`unaccent`/`pg_cron` activées AVANT le restore. Rôles + settings +
  default-privileges OK (12 erreurs `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` =
  **bénignes**, déjà posées par Supabase).
- **Phase 2 — données** (`--data-only`, restore **en `session_replication_role=replica`**) :
  **total exact `old = new = 53 748` lignes** (203 tables). auth.users **107**, auth.identities
  **79**, storage.buckets **7**, profiles **107**, **0 orphelin**. `analyze` + `refresh
materialized view student_achievement_stats` faits. `postgres` PEUT bien faire le SET replica.
- **Phase 3 — Storage** — storage.buckets **7** + **27 policies RLS** + **objets 338/340**
  (script `copy-storage.sh` : download public URL → upload service_role ; vérifié 338, tailles
  identiques). **Reste 2 fichiers privés** `bug-report-screenshots` (nécessitent OLD service_role
  — non migrés, peu critiques).
- **Phase 4 — URLs** : 5 colonnes réécrites (host `aqtij…`→`cnevn…`) — 97+24+45+2+21 = **189
  lignes** ; scan exhaustif = **0 occurrence restante**.

## RESTE À FAIRE

- **Phase 3 — 2 fichiers privés** `bug-report-screenshots` (optionnel ; ajouter `OLD_SERVICE_ROLE`
  au fichier secrets puis adapter `copy-storage.sh`). Le reste du Storage est fait.
- **Phase 5 — env/code** : `(b)` storageUrl déjà fait (commit `22e771f9b`). Reste : ref dans
  `package.json:53` + `.mcp.json:9` → `cnevnzsvixxpnurautls` ; env Vercel (URL/anon/service_role
  CHANGENT ; le reste RECOPIÉ verbatim — cf. plan Phase 5, ⚠️ `GOOGLE_TOKEN_ENCRYPTION_KEY`).
- **Phase 6 / 6bis** — Google OAuth (callback + Site URL + Redirect URLs sur le nouveau) ;
  vérifs Dashboard (Auth Hooks, SMTP/templates, exposed schemas).
- **Phase 7** — Vercel `regions: ['cdg1']` dans `svelte.config.js`.
- **Phase 8** — cutover (bascule env Vercel → nouveau projet ; lever la maintenance).
- **Phase 9** — tests post-migration (login email + Google, images, RPC, RLS, realtime, cron).

## Notes de méthode (réutilisables)

- Restore data en **une seule session psql** (`-f wrapper.sql` avec `SET session_replication_role`
  - `\i` includes) — le pooler **Session** (port 5432) conserve l'état de session.
- Toujours **comptage EXACT** (`query_to_xml` + `count(*)`) pour valider la parité, pas `reltuples`
  (estimé, ±3% de bruit — ici 52231 estimé vs 53748 exact).
