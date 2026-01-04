# Jobs CRON - Guide Technique

> Documentation complete du systeme de jobs planifies UbuMaths.

## Architecture

Le systeme CRON est compose de **2 couches** :

```
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
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Weekly Rewards      │  │ Daily Summaries     │          │
│  │ 0 0,12 * * * (2x/j) │  │ 0 * * * * (1x/h)    │          │
│  └─────────────────────┘  └─────────────────────┘          │
│  ┌─────────────────────┐                                   │
│  │ Cleanup All         │                                   │
│  │ 0 2 * * * (02:00)   │                                   │
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
| [Cleanup Stale Trades](./pg-cron.md#cleanup-stale-trades)                     | pg_cron | `*/10 * * * *` | 10 min                |
| [Minesweeper Ref Times](./pg-cron.md#recalculate-minesweeper-reference-times) | pg_cron | `30 1 * * 0`   | 1x/sem dimanche 01:30 |
| [Cleanup Stuck Jobs](./pg-cron.md#cleanup-stuck-job-runs)                     | pg_cron | `30 * * * *`   | 1x/heure              |
| [Weekly Best Bonuses](./pg-cron.md#weekly-best-game-bonuses)                  | pg_cron | `0 0,12 * * *` | 2x/jour               |
| [Weekly Rewards](./pg-cron.md#weekly-rewards-no-warnings-bonus)               | pg_cron | `0 0,12 * * *` | 2x/jour               |
| [Daily Summaries](./pg-cron.md#daily-summaries)                               | pg_cron | `0 * * * *`    | 1x/heure (18h local)  |
| [Cleanup All](./pg-cron.md#cleanup-all)                                       | pg_cron | `0 2 * * *`    | 1x/jour 02:00 UTC     |

## Quotas

| Plateforme      | Free Tier  | Utilisation           |
| --------------- | ---------- | --------------------- |
| **Vercel Cron** | 2 jobs max | 0/2 (100% disponible) |
| **pg_cron**     | Illimite   | 7 jobs actifs         |

## Fichiers Cles

```
src/
├── lib/
│   ├── server/
│   │   ├── auth/cron.ts              # Authentification CRON
│   │   └── validation/cron.ts        # Schemas Zod
│   └── utils/
│       └── notification-formatters.ts # Formatage daily_summary client-side
├── routes/
│   ├── api/admin/cron/
│   │   ├── jobs/+server.ts           # GET list jobs
│   │   └── trigger/+server.ts        # POST manual trigger
│   └── (protected)/dashboard/admin/cron/
│       ├── +page.server.ts
│       └── +page.svelte              # Interface admin

supabase/migrations/
├── 20251107112527_create_background_job_runs.sql
├── 20260104120000_pg_cron_cleanup_stale_trades.sql
├── 20260104130000_pg_cron_minesweeper_ref_times.sql
├── 20260104140000_pg_cron_cleanup_stuck_jobs.sql
├── 20260104150000_pg_cron_weekly_best_bonuses.sql
├── 20260104160000_pg_cron_weekly_rewards.sql
├── 20260104170000_pg_cron_daily_summaries.sql
└── 20260104180000_pg_cron_cleanup_all.sql
```

## Documentation

- [pg_cron](./pg-cron.md) - Jobs PostgreSQL (tous les jobs)
- [Monitoring](./monitoring.md) - Table background_job_runs
- [Authentification](./authentication.md) - Securite CRON_SECRET
- [Interface Admin](./admin-interface.md) - Dashboard monitoring

> **Note** : Tous les jobs CRON ont ete migres vers pg_cron pour beneficier
> d'une execution sans timeout et timezone-aware.

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
