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
- **pg_cron — 8 jobs re-planifiés** (`cron.schedule`, absents du dump `public` — piège §4.3) :
  `cron.job` = **8** sur le nouveau projet (mêmes noms/schedules/commands que l'ancien).

## ✅ VALIDATION LOCALE (dev pointé sur l'EU via `.env`) — 2026-06-15

Tous les tests passent : login **email** + **Google**, **images** Storage, **RPC/gidouilles/
cartes VIP** (§4.7 confirmé OK), **questions/écritures**, **RLS**, **realtime**. → migration
prouvée correcte de bout en bout.

**Bugs pré-existants détectés (HORS migration, à traiter séparément) :**

- `svelte-sonner`/`bits-ui` : `target.exclude.has is not a function` en **dev** — **RÉSOLU**
  par `rm -rf node_modules/.vite` (cache optimize-deps Vite corrompu). Dev-only, prod non
  affectée, sans rapport avec la migration.
- 4 cartes VIP « mathemo » : `image_path` = chemin **statique local** `/images/vip-cards/mathemo-*.webp`
  mais le dossier `static/images/vip-cards/` n'existe pas → **404 pré-existant** (pas du Storage).

## ✅ CUTOVER TERMINÉ — SITE LIVE SUR L'EU (2026-06-15)

- **Phases 5/6/7/8 faites** : env Vercel (3 vars Supabase → EU via CLI **54.14.0** +
  `--value … --no-sensitive --force` ; ⚠️ le stdin/`--value` du CLI 54.13.0 stockait du vide,
  et Production/Preview sont `sensitive` par défaut = illisibles via `pull`) ; Google OAuth fait ;
  merge `main` + déploiement git **débloqué par un bump v0.10.4** (l'« Ignored Build Step »
  `git diff HEAD^ HEAD -- ':(exclude)docs/**'` saute les commits docs-only — le merge FF avait mis
  un commit docs en HEAD) ; **maintenance levée** via `pnpm maintenance:off`.
- **Vérifié en prod** : `www.chiph.re` → HTTP 200, `x-vercel-id: …::cdg1::…` (fonctions **cdg1/Paris**).
- ⚠️ **Vercel Preview** : 3 vars Supabase NON posées (bug CLI « all preview branches » non-interactif)
  → à faire au **dashboard** (non bloquant, sert seulement aux previews de branches).

### Reste à faire (post-cutover)

- ✅ **SÉCURITÉ — FAIT (2026-06-15)** : 2 mots de passe DB régénérés ; service*role → \*\*Secret key
  `sb_secret*`** + anon → **Publishable key `sb*publishable*`** (nouveau système Supabase),
propagées Vercel Prod/Dev + `.env`+ redéployées ; **clés legacy révoquées** ; prod re-vérifiée
**200 sur`cdg1`** après révocation. \*(Reste : poser les 2 vars Supabase sur Vercel **Preview\*_ au dashboard.)_
- **Ne PAS supprimer l'ancien projet** `aqtijumsgfufoztohdua` avant ~1-2 semaines (rollback =
  repointer les 3 env Vercel + redéployer).
- **RGPD** (§7 du plan) : registre des traitements → hébergement EU.
- Optionnel : 2 fichiers privés bug-report ; bug pré-existant 4 images statiques `mathemo`.

## Notes de méthode (réutilisables)

- Restore data en **une seule session psql** (`-f wrapper.sql` avec `SET session_replication_role`
  - `\i` includes) — le pooler **Session** (port 5432) conserve l'état de session.
- Toujours **comptage EXACT** (`query_to_xml` + `count(*)`) pour valider la parité, pas `reltuples`
  (estimé, ±3% de bruit — ici 52231 estimé vs 53748 exact).
