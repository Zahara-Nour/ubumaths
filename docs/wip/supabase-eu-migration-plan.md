# Migration Supabase `us-east-2` → EU (`eu-west-3` Paris) — Plan

> Date : 2026-06-13 · Statut : **PLAN — rien exécuté.** Décision déclenchée par
> RGPD (données d'élèves mineurs) + latence (élèves français, base actuellement aux US).
> ⚠️ Opération sensible : migration de données + bascule de production. À planifier
> sur une fenêtre dédiée, avec sauvegardes et rollback prêts.

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

| Élément              | Source de vérité                                       | Méthode                                        |
| -------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| Schéma + RLS + funcs | `supabase/migrations/` (**607 fichiers**)              | `supabase db push` sur le nouveau projet       |
| Données (tables)     | base prod actuelle                                     | `pg_dump --data-only` → `psql`/`pg_restore`    |
| Storage (buckets)    | buckets prod (`vip-card-images`, `question-images`, …) | recopie objet par objet (script ou rclone)     |
| Auth users           | `auth.users` + `auth.identities`                       | dump SQL des schémas `auth` OU export/import   |
| pg_cron jobs         | migrations `*pg_cron*`, `*cleanup*`, `*retention*`     | réactiver l'extension + rejouer les migrations |
| Extensions           | `pg_cron`, `pg_net`, `pgcrypto`, …                     | activer dans le nouveau projet                 |
| Secrets / env        | Vercel + `.env` local                                  | mise à jour manuelle (voir Phase 6)            |

## 4. Pièges identifiés (CRITIQUES — vérifiés dans le code)

### 4.1 URLs Storage **absolues** stockées en base ⚠️ (le plus gros)

Des colonnes `image_url` contiennent des URLs **absolues** avec l'ancien ref, ex. :
`https://aqtijumsgfufoztohdua.supabase.co/storage/v1/object/public/vip-card-images/...`
(cf. `supabase/migrations/20260417093000_fix_2048_vip_card_image_paths.sql`,
`vip-card-admin.test.ts`, et `scripts/image-url-mapping.json` pour `question-images`).

→ Un nouveau projet a un **nouveau host** → **toutes ces URLs cassent** sauf réécriture.
**Phase 5** : `UPDATE … SET image_url = replace(image_url, '<ancien-ref>', '<nouveau-ref>')`
sur **toutes** les tables/colonnes concernées (et tout champ JSON contenant des URLs).

**Action préalable** : auditer exhaustivement les colonnes/JSON stockant des URLs
Storage (au-delà de `image_url` : contenus de questions, cartes VIP, énigmes, chat…).

### 4.2 Ref projet codé en dur

- `package.json:48` → `db:types --project-id aqtijumsgfufoztohdua`
- `scripts/image-url-mapping.json` (des milliers d'URLs `question-images`)
- docs : `.claude/syntax-audit-2025-11-19.md`, `docs/wip/question-migration-status.md`
  → Remplacer le ref partout (Phase 6).

### 4.3 pg_cron / pg_net

Plusieurs migrations créent des jobs pg_cron (daily summaries, cleanup, retention,
rate limits). Le nouveau projet doit : activer `pg_cron` (+ `pg_net` si HTTP), puis
rejouer les migrations. Si un job appelle l'URL **du projet** (pg_net → `/api/...`),
mettre à jour cette URL.

### 4.4 Auth / Google OAuth

Le redirect Google pointe sur `https://<ancien-ref>.supabase.co/auth/v1/callback`.
→ Dans **Google Cloud Console**, ajouter le callback du **nouveau** projet ; dans
**Supabase Auth** (nouveau projet), reconfigurer `Site URL` + `Redirect URLs`
(prod Vercel) et les secrets Google (client id/secret).

### 4.5 Migration des comptes

`auth.users`/`auth.identities` : migrer en préservant les `id` (les FK `profiles.id`
en dépendent). Conserver les hash de mots de passe (colonnes `encrypted_password`) et
les identités OAuth. Tester un login email **et** un login Google après bascule.

## 5. Étapes détaillées

### Phase 0 — Prérequis & geler le risque

- [ ] Sauvegarde complète du projet actuel (dump SQL + inventaire Storage).
- [ ] Vérifier le quota d'org Supabase (free tier ≈ 2 projets actifs max).
- [ ] Auditer **toutes** les colonnes stockant des URLs Storage (cf. 4.1).
- [ ] Lister les buckets + leur politique (public/privé) et leur volume.
- [ ] Noter les jobs pg_cron actifs : `select * from cron.job;`.

### Phase 1 — Nouveau projet EU + schéma

- [ ] Créer le projet Supabase en **`eu-west-3`**.
- [ ] Activer extensions nécessaires (`pg_cron`, `pg_net`, `pgcrypto`, …).
- [ ] `supabase link` sur le nouveau ref, puis `supabase db push` (607 migrations).
- [ ] Vérifier RLS, functions, triggers présents.

### Phase 2 — Données

- [ ] `pg_dump --data-only --schema=public` (prod) → restore sur le nouveau projet.
- [ ] Migrer `auth.users` + `auth.identities` en **préservant les `id`**.
- [ ] Recompter les lignes table par table (parité source/cible).

### Phase 3 — Storage

- [ ] Recréer les buckets (mêmes noms, mêmes politiques public/privé).
- [ ] Recopier tous les objets (script `@supabase/supabase-js` list+download+upload,
      ou `rclone`/CLI). Vérifier les checksums/volumes.

### Phase 4 — Réécriture des URLs en base (cf. 4.1)

- [ ] `UPDATE` de toutes les colonnes/JSON : `<ancien-ref>` → `<nouveau-ref>`.
- [ ] Vérifier qu'aucune URL ne contient encore l'ancien ref (`select … where … like '%aqtijumsgfufoztohdua%'`).

### Phase 5 — Secrets / env / code

- [ ] Récupérer URL + `anon` + `service_role` du nouveau projet.
- [ ] Mettre à jour les env **Vercel** (production + preview + development).
- [ ] `package.json:48` : nouveau `--project-id` ; relancer `pnpm db:types`.
- [ ] `scripts/image-url-mapping.json` : régénérer/remplacer le ref.
- [ ] Local : `pnpm env:pull` (une fois Vercel à jour) → `.env.local`.
- [ ] Docs mentionnant l'ancien ref : mettre à jour ou marquer historique.

### Phase 6 — Auth / OAuth (cf. 4.4)

- [ ] Google Cloud Console : ajouter le callback du nouveau projet.
- [ ] Supabase Auth (nouveau) : `Site URL`, `Redirect URLs`, secrets Google.

### Phase 7 — Vercel région

- [ ] `svelte.config.js` : `adapter({ runtime: 'nodejs22.x', regions: ['cdg1'] })`.
- [ ] Redéployer ; vérifier que les fonctions tournent bien en `cdg1`.

### Phase 8 — Cutover (fenêtre de maintenance)

- [ ] **Activer le mode maintenance** : `MAINTENANCE_MODE=true` +
      `MAINTENANCE_BYPASS_SECRET` sur Vercel (+ redeploy). Implémenté, 503 indépendant
      de la DB, bypass opérateur `/?bypass=<secret>` → cf.
      `docs/wip/maintenance-page-progress.md`.
- [ ] **Dump différentiel final** (données créées depuis le dump initial) → cible.
- [ ] Basculer les env Vercel sur le nouveau projet ; redéployer.
- [ ] Smoke tests prod (voir Phase 9).
- [ ] Lever le mode maintenance (`MAINTENANCE_MODE=false` + redeploy ; supprimer le secret).

### Phase 9 — Tests post-migration

- [ ] Login email + login **Google** OK.
- [ ] Images (cartes VIP, questions) s'affichent (URLs réécrites OK).
- [ ] Une question complète : génération, validation, sauvegarde.
- [ ] Un job pg_cron se déclenche (ou trigger manuel via `/api/admin/cron/trigger`).
- [ ] RLS : un élève ne voit que ses données ; un prof voit sa classe.
- [ ] Realtime (chat/présence) fonctionne.

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

- Préparation + audit URLs : ~0.5–1 j.
- Setup projet + schéma + données + Storage + Auth : ~1 j (selon volume Storage).
- Réécriture URLs + env + OAuth + tests : ~0.5 j.
- Cutover : fenêtre de ~1–2 h.
- **Total réaliste : ~2–3 jours**, hors imprévus Storage volumineux.

## 9. Décisions en attente (David)

1. **Région cible** : `eu-west-3` (Paris, recommandé) ou `eu-central-1` (Francfort) ?
2. **Fenêtre de bascule** : quand (heure creuse, peu d'élèves connectés) ?
3. Faut-il un **mode maintenance** in-app pour le cutover, ou bascule à chaud acceptée ?
4. ~~Confirmer la région actuelle~~ → **CONFIRMÉ : `us-east-2` (Ohio, US)**.
