# Jobs CRON - Guide Technique

> Documentation complete du systeme de jobs planifies UbuMaths.

## Architecture

Le systeme CRON est compose de **3 couches** :

```
┌─────────────────────────────────────────────────────────────┐
│                      VERCEL CRON                            │
│  (2 jobs max free tier - orchestration quotidienne)         │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Daily Summaries     │  │ Cleanup All         │          │
│  │ 01:00 UTC           │  │ 02:00 UTC           │          │
│  └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       PG_CRON                               │
│  (PostgreSQL natif - taches frequentes illimitees)          │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Cleanup Stale Trades│  │ Minesweeper Ref     │          │
│  │ */10 * * * *        │  │ 30 1 * * 0 (dim)    │          │
│  └─────────────────────┘  └─────────────────────┘          │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Cleanup Stuck Jobs  │  │ Weekly Best Bonuses │          │
│  │ 30 * * * * (1x/h)   │  │ 0 0,12 * * * (2x/j) │          │
│  └─────────────────────┘  └─────────────────────┘          │
│  ┌─────────────────────┐                                   │
│  │ Weekly Rewards      │                                   │
│  │ 0 0,12 * * * (2x/j) │                                   │
│  └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ background_job_runs (table)                          │   │
│  │ Admin CRON Dashboard (/dashboard/admin/cron)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Jobs Actifs

| Job                                                                           | Type    | Schedule       | Frequence             |
| ----------------------------------------------------------------------------- | ------- | -------------- | --------------------- |
| [Daily Summaries](./vercel-cron.md#daily-summaries)                           | Vercel  | `0 1 * * *`    | 1x/jour 01:00 UTC     |
| [Cleanup All](./vercel-cron.md#cleanup-all)                                   | Vercel  | `0 2 * * *`    | 1x/jour 02:00 UTC     |
| [Cleanup Stale Trades](./pg-cron.md#cleanup-stale-trades)                     | pg_cron | `*/10 * * * *` | 10 min                |
| [Minesweeper Ref Times](./pg-cron.md#recalculate-minesweeper-reference-times) | pg_cron | `30 1 * * 0`   | 1x/sem dimanche 01:30 |
| [Cleanup Stuck Jobs](./pg-cron.md#cleanup-stuck-job-runs)                     | pg_cron | `30 * * * *`   | 1x/heure              |
| [Weekly Best Bonuses](./pg-cron.md#weekly-best-game-bonuses)                  | pg_cron | `0 0,12 * * *` | 2x/jour               |
| [Weekly Rewards](./pg-cron.md#weekly-rewards-no-warnings-bonus)               | pg_cron | `0 0,12 * * *` | 2x/jour               |

## Quotas

| Plateforme      | Free Tier  | Utilisation   |
| --------------- | ---------- | ------------- |
| **Vercel Cron** | 2 jobs max | 2/2 (100%)    |
| **pg_cron**     | Illimite   | 5 jobs actifs |

## Fichiers Cles

```
src/
├── lib/server/
│   ├── auth/cron.ts              # Authentification CRON
│   └── validation/cron.ts        # Schemas Zod
├── routes/
│   ├── api/
│   │   ├── cron/
│   │   │   └── daily-summaries-and-rewards/+server.ts
│   │   ├── cleanup/
│   │   │   └── all/+server.ts
│   │   └── admin/cron/
│   │       ├── jobs/+server.ts   # GET list jobs
│   │       └── trigger/+server.ts # POST manual trigger
│   └── (protected)/dashboard/admin/cron/
│       ├── +page.server.ts
│       └── +page.svelte          # Interface admin

supabase/migrations/
├── 20251107112527_create_background_job_runs.sql
├── 20260104120000_pg_cron_cleanup_stale_trades.sql
├── 20260104130000_pg_cron_minesweeper_ref_times.sql
├── 20260104140000_pg_cron_cleanup_stuck_jobs.sql
├── 20260104150000_pg_cron_weekly_best_bonuses.sql
└── 20260104160000_pg_cron_weekly_rewards.sql

vercel.json                        # Configuration Vercel CRON
```

## Documentation

- [Vercel CRON](./vercel-cron.md) - Jobs HTTP planifies
- [pg_cron](./pg-cron.md) - Jobs PostgreSQL
- [Monitoring](./monitoring.md) - Table background_job_runs
- [Authentification](./authentication.md) - Securite CRON_SECRET
- [Interface Admin](./admin-interface.md) - Dashboard monitoring

## Variables d'Environnement

| Variable      | Description                          | Requis |
| ------------- | ------------------------------------ | ------ |
| `CRON_SECRET` | Token pour authentification manuelle | Oui    |
| `VERCEL`      | Detection plateforme Vercel (auto)   | Auto   |

## Quick Start

### Declencher manuellement un job

```bash
# Via curl
curl -X POST https://ubumaths.fr/api/cron/daily-summaries-and-rewards \
  -H "Authorization: Bearer $CRON_SECRET"

# Via interface admin
# /dashboard/admin/cron → Cliquer "Play" sur un job
```

### Ajouter un nouveau job Vercel

1. Creer endpoint dans `src/routes/api/cron/[job-name]/+server.ts`
2. Ajouter authentification : `verifyCronAuth(request)`
3. Utiliser tracking : `start_job_run()` / `complete_job_run()`
4. Ajouter dans `vercel.json` (si quota disponible)

### Ajouter un nouveau job pg_cron

1. Creer fonction SQL avec wrapper monitoring
2. Creer migration avec `cron.schedule()`
3. Ajouter path dans `ALLOWED_JOB_PATHS` (validation/cron.ts)
4. Ajouter mapping dans admin `+page.svelte`

Voir [pg-cron.md](./pg-cron.md#ajouter-un-nouveau-job) pour details.
