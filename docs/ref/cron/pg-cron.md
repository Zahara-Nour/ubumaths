# pg_cron Jobs

> Jobs PostgreSQL natifs executes directement dans la base de donnees.

## Avantages vs Vercel CRON

| Critere         | Vercel CRON      | pg_cron             |
| --------------- | ---------------- | ------------------- |
| Quota free tier | 2 jobs max       | **Illimite**        |
| Frequence min   | 1x/jour          | **1x/minute**       |
| Timeout         | 10s (free)       | **Aucun**           |
| Latence         | HTTP → DB        | **Direct SQL**      |
| Dependance      | App doit etre up | **PostgreSQL seul** |

## Activation

pg_cron doit etre active manuellement dans Supabase :

1. Aller dans **Database > Extensions**
2. Rechercher `pg_cron`
3. Cliquer **Enable**
4. Selectionner schema : `extensions`

## Jobs Actifs

### Cleanup Stale Trades

**Migration** : `supabase/migrations/20260104120000_pg_cron_cleanup_stale_trades.sql`

| Propriete     | Valeur                             |
| ------------- | ---------------------------------- |
| Schedule      | `*/10 * * * *` (toutes les 10 min) |
| Fonction      | `public.cleanup_stale_trades()`    |
| Duree typique | < 100ms                            |

#### Objectif

Annule les trades marketplace inactifs depuis plus de 30 minutes pour :

- Liberer les ressources Supabase Realtime (heartbeat)
- Nettoyer les trades oublies

#### Logique

```sql
UPDATE marketplace_trades
SET status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
WHERE status = 'negotiating'
  AND updated_at < NOW() - INTERVAL '30 minutes';
```

#### Code Complet

```sql
CREATE OR REPLACE FUNCTION public.cleanup_stale_trades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_cancelled_count INTEGER;
    v_stale_threshold INTERVAL := INTERVAL '30 minutes';
BEGIN
    -- Start tracking (meme systeme que Vercel CRON)
    v_run_id := start_job_run('cleanup_stale_trades', '{}'::jsonb);

    BEGIN
        -- Annuler trades inactifs
        UPDATE marketplace_trades
        SET status = 'cancelled',
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE status = 'negotiating'
          AND updated_at < NOW() - v_stale_threshold;

        GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

        -- Log succes
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'cancelled_count', v_cancelled_count,
                'threshold_minutes', 30
            )
        );

    EXCEPTION WHEN OTHERS THEN
        -- Log echec
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object('cancelled_count', COALESCE(v_cancelled_count, 0))
        );
        RAISE;
    END;
END;
$$;
```

#### Scheduling

```sql
SELECT cron.schedule(
    'cleanup-stale-trades',           -- nom du job
    '*/10 * * * *',                   -- toutes les 10 minutes
    'SELECT public.cleanup_stale_trades()'
);
```

#### Metadata Generee

```json
{
	"cancelled_count": 3,
	"threshold_minutes": 30
}
```

---

### Recalculate Minesweeper Reference Times

**Migration** : `supabase/migrations/20260104130000_pg_cron_minesweeper_ref_times.sql`

| Propriete     | Valeur                                           |
| ------------- | ------------------------------------------------ |
| Schedule      | `30 1 * * 0` (dimanche 01:30 UTC)                |
| Fonction      | `public.run_recalculate_minesweeper_ref_times()` |
| Duree typique | < 5s                                             |

#### Objectif

Recalcule les temps de reference Minesweeper par cycle pedagogique :

- Calcule la mediane des temps sur 4 semaines
- Met a jour `minesweeper_reference_times` si assez d'echantillons
- Applique les bornes min/max de securite

#### Logique

```sql
-- Pour chaque combinaison cycle/difficulte
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_seconds)
FROM minesweeper_games mg
JOIN profiles p ON mg.student_id = p.id
WHERE mg.status = 'won'
  AND mg.completed_at >= week_start
  AND get_cycle_for_grade(p.grade) = current_cycle
  AND mg.difficulty = current_difficulty;
```

#### Code Complet (Wrapper)

```sql
CREATE OR REPLACE FUNCTION public.run_recalculate_minesweeper_ref_times()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_results RECORD;
    v_updated_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
BEGIN
    v_run_id := start_job_run('recalculate_minesweeper_ref_times', '{}'::jsonb);

    BEGIN
        FOR v_results IN SELECT * FROM recalculate_minesweeper_reference_times()
        LOOP
            IF v_results.updated THEN
                v_updated_count := v_updated_count + 1;
            ELSE
                v_skipped_count := v_skipped_count + 1;
            END IF;
        END LOOP;

        PERFORM complete_job_run(v_run_id, 'success', NULL,
            jsonb_build_object(
                'updated_count', v_updated_count,
                'skipped_count', v_skipped_count
            ));

    EXCEPTION WHEN OTHERS THEN
        PERFORM complete_job_run(v_run_id, 'failed', SQLERRM, NULL);
        RAISE;
    END;
END;
$$;
```

#### Metadata Generee

```json
{
	"updated_count": 5,
	"skipped_count": 10,
	"total_samples": 1250,
	"combinations_processed": 15
}
```

---

### Cleanup Stuck Job Runs

**Migration** : `supabase/migrations/20260104140000_pg_cron_cleanup_stuck_jobs.sql`

| Propriete     | Valeur                            |
| ------------- | --------------------------------- |
| Schedule      | `30 * * * *` (chaque heure a :30) |
| Fonction      | `public.cleanup_stuck_job_runs()` |
| Duree typique | < 100ms                           |

#### Objectif

Marque automatiquement les jobs bloques en status `running` comme `timeout` :

- Detecte les jobs en cours depuis > 1 heure
- Les marque comme `timeout` avec message explicatif
- Evite l'accumulation de jobs "fantomes" dans le dashboard

#### Cas d'usage

Jobs peuvent rester bloques si :

- Vercel CRON timeout (10s sur free tier)
- Crash avant `complete_job_run()`
- Problemes reseau

#### Code

```sql
UPDATE background_job_runs
SET
    status = 'timeout',
    completed_at = NOW(),
    execution_time_ms = 2147483647,  -- Max INT
    error_message = 'Auto-marked as timeout: job exceeded 1 hour runtime'
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';
```

#### Metadata Generee

```json
{
	"stuck_jobs_marked": 2,
	"threshold_hours": 1
}
```

---

## Gestion des Jobs

### Voir les jobs planifies

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job;
```

### Voir l'historique d'execution (pg_cron natif)

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Voir l'historique (notre systeme)

```sql
SELECT job_name, status, execution_time_ms, metadata, started_at
FROM background_job_runs
WHERE job_name = 'cleanup_stale_trades'
ORDER BY started_at DESC
LIMIT 10;
```

### Desactiver un job

```sql
SELECT cron.unschedule('cleanup-stale-trades');
```

### Reactiver un job

```sql
SELECT cron.schedule(
    'cleanup-stale-trades',
    '*/10 * * * *',
    'SELECT public.cleanup_stale_trades()'
);
```

### Executer manuellement

```sql
SELECT public.cleanup_stale_trades();
```

---

## Ajouter un Nouveau Job

### 1. Creer la fonction avec wrapper monitoring

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_my_pg_cron_job.sql

CREATE OR REPLACE FUNCTION public.my_cleanup_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_count INTEGER;
BEGIN
    -- Start tracking
    v_run_id := start_job_run('my_cleanup_function', '{}'::jsonb);

    BEGIN
        -- Votre logique ici
        DELETE FROM my_table WHERE expired_at < NOW();
        GET DIAGNOSTICS v_count = ROW_COUNT;

        -- Complete success
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object('deleted_count', v_count)
        );

    EXCEPTION WHEN OTHERS THEN
        PERFORM complete_job_run(v_run_id, 'failed', SQLERRM, NULL);
        RAISE;
    END;
END;
$$;

-- Grant pour triggers manuels
GRANT EXECUTE ON FUNCTION public.my_cleanup_function() TO service_role;
```

### 2. Planifier le job (dans la meme migration)

```sql
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('my-cleanup-job');
        PERFORM cron.schedule(
            'my-cleanup-job',
            '0 */6 * * *',  -- toutes les 6 heures
            'SELECT public.my_cleanup_function()'
        );
        RAISE NOTICE 'Job my-cleanup-job scheduled';
    ELSE
        RAISE NOTICE 'pg_cron not enabled - enable in Supabase Dashboard';
    END IF;
END;
$$;
```

### 3. Ajouter dans validation (pour trigger manuel)

```typescript
// src/lib/server/validation/cron.ts
const ALLOWED_JOB_PATHS = [
	// ... existants ...
	'rpc:my_cleanup_function' // Nouveau
] as const;
```

### 4. Ajouter mapping admin

```typescript
// src/routes/(protected)/dashboard/admin/cron/+page.svelte
function getJobPath(jobName: string): string {
	const pathMap: Record<string, string> = {
		// ... existants ...
		my_cleanup_function: 'rpc:my_cleanup_function' // Nouveau
	};
	return pathMap[jobName] ?? '';
}
```

---

## Fonctions Existantes (Non Schedulees)

Ces fonctions sont pretes pour pg_cron mais pas encore planifiees :

| Fonction                                | Description                        | Suggestion Schedule    |
| --------------------------------------- | ---------------------------------- | ---------------------- |
| `auto_expire_listings()`                | Expire annonces marketplace > date | `0 * * * *` (1x/heure) |
| `cleanup_stale_presence()`              | Nettoie presence inactive          | `*/5 * * * *` (5 min)  |
| `cleanup_expired_rate_limits()`         | Supprime rate limits expires       | `0 */6 * * *` (6h)     |
| `cleanup_abandoned_minesweeper_games()` | Supprime parties abandonnees       | `0 3 * * *` (1x/jour)  |
| `auto_activate_scheduled_tournaments()` | Active tournois programmes         | `* * * * *` (1 min)    |
| `auto_complete_tournaments()`           | Complete tournois termines         | `* * * * *` (1 min)    |

### Exemple : Activer auto_expire_listings

```sql
-- Wrapper avec monitoring
CREATE OR REPLACE FUNCTION public.run_auto_expire_listings()
RETURNS void AS $$
DECLARE
    v_run_id UUID;
    v_count INTEGER;
BEGIN
    v_run_id := start_job_run('auto_expire_listings', '{}'::jsonb);
    BEGIN
        v_count := auto_expire_listings();
        PERFORM complete_job_run(v_run_id, 'success', NULL,
            jsonb_build_object('expired_count', v_count));
    EXCEPTION WHEN OTHERS THEN
        PERFORM complete_job_run(v_run_id, 'failed', SQLERRM, NULL);
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Planifier
SELECT cron.schedule('auto-expire-listings', '0 * * * *',
    'SELECT public.run_auto_expire_listings()');
```

---

## Troubleshooting

### Job ne s'execute pas

1. Verifier que pg_cron est active :

   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Verifier que le job existe :

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-stale-trades';
   ```

3. Verifier les logs pg_cron :
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

### Erreur "function does not exist"

La migration n'a pas ete appliquee. Executer :

```bash
pnpm db:migrate
```

### Erreur "permission denied"

Ajouter grant :

```sql
GRANT EXECUTE ON FUNCTION public.my_function() TO service_role;
```
