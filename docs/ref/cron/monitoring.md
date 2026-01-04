# Monitoring des Jobs CRON

> Systeme de tracking unifie pour Vercel CRON et pg_cron.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Vercel CRON    │     │    pg_cron      │
│  (HTTP jobs)    │     │   (SQL jobs)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  start_job_run()      │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │  background_job_runs  │
         │       (table)         │
         └───────────┬───────────┘
                     │
         complete_job_run()
                     │
                     ▼
         ┌───────────────────────┐
         │  Admin CRON Dashboard │
         │  /dashboard/admin/cron│
         └───────────────────────┘
```

## Table : background_job_runs

**Migration** : `supabase/migrations/20251107112527_create_background_job_runs.sql`

### Schema

```sql
CREATE TABLE public.background_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT valid_completion CHECK (
    (status = 'running' AND completed_at IS NULL) OR
    (status != 'running' AND completed_at IS NOT NULL)
  )
);
```

### Colonnes

| Colonne             | Type        | Description                                    |
| ------------------- | ----------- | ---------------------------------------------- |
| `id`                | UUID        | Identifiant unique                             |
| `job_name`          | TEXT        | Nom du job (ex: `daily_summaries_and_rewards`) |
| `status`            | TEXT        | `running`, `success`, `failed`, `timeout`      |
| `started_at`        | TIMESTAMPTZ | Debut d'execution                              |
| `completed_at`      | TIMESTAMPTZ | Fin d'execution (NULL si running)              |
| `error_message`     | TEXT        | Message d'erreur si echec                      |
| `execution_time_ms` | INTEGER     | Duree en millisecondes                         |
| `metadata`          | JSONB       | Donnees specifiques au job                     |

### Indexes

```sql
-- Historique par job (recent en premier)
CREATE INDEX idx_job_runs_name_started
  ON background_job_runs(job_name, started_at DESC);

-- Recherche des echecs
CREATE INDEX idx_job_runs_status
  ON background_job_runs(status)
  WHERE status != 'success';

-- Requetes recentes
CREATE INDEX idx_job_runs_recent
  ON background_job_runs(started_at DESC);
```

---

## Fonctions Helper

### start_job_run()

Demarre le tracking d'une execution.

```sql
CREATE FUNCTION public.start_job_run(
  p_job_name TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
```

**Usage** :

```sql
SELECT start_job_run('my_job', '{"key": "value"}'::jsonb);
-- Retourne: UUID du run
```

**TypeScript** :

```typescript
const { data: runId } = await serviceClient.rpc('start_job_run', {
	p_job_name: 'my_job',
	p_metadata: { key: 'value' }
});
```

### complete_job_run()

Termine le tracking avec statut et resultats.

```sql
CREATE FUNCTION public.complete_job_run(
  p_run_id UUID,
  p_status TEXT,               -- 'success' | 'failed' | 'timeout'
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID
```

**Usage** :

```sql
-- Succes
SELECT complete_job_run(
  'uuid-here',
  'success',
  NULL,
  '{"processed": 42}'::jsonb
);

-- Echec
SELECT complete_job_run(
  'uuid-here',
  'failed',
  'Connection timeout',
  NULL
);
```

**TypeScript** :

```typescript
await serviceClient.rpc('complete_job_run', {
	p_run_id: runId,
	p_status: 'success',
	p_error_message: null,
	p_metadata: { processed: 42 }
});
```

### cleanup_old_job_runs()

Supprime les runs de plus de 7 jours.

```sql
CREATE FUNCTION public.cleanup_old_job_runs()
RETURNS TABLE(deleted_count INTEGER)
```

**Usage** :

```sql
SELECT * FROM cleanup_old_job_runs();
-- Retourne: { deleted_count: 150 }
```

---

## Vues Admin

### admin_job_status

Dernier run de chaque job.

```sql
CREATE VIEW public.admin_job_status AS
SELECT DISTINCT ON (job_name)
  job_name,
  status,
  started_at,
  completed_at,
  error_message,
  execution_time_ms,
  metadata
FROM background_job_runs
ORDER BY job_name, started_at DESC;
```

**Usage** :

```sql
SELECT * FROM admin_job_status;
```

### admin_job_failures

Echecs des 24 dernieres heures.

```sql
CREATE VIEW public.admin_job_failures AS
SELECT
  job_name,
  COUNT(*) as failure_count,
  MAX(started_at) as last_failure,
  array_agg(DISTINCT error_message) as error_messages
FROM background_job_runs
WHERE status IN ('failed', 'timeout')
  AND started_at > now() - interval '24 hours'
GROUP BY job_name
ORDER BY failure_count DESC;
```

**Usage** :

```sql
SELECT * FROM admin_job_failures;
```

---

## Pattern d'Implementation

### Vercel CRON (TypeScript)

```typescript
import { json } from '@sveltejs/kit';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { verifyCronAuth } from '$lib/server/auth/cron';

export const GET: RequestHandler = async ({ request }) => {
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();
	let runId: string | null = null;

	const results = {
		success: true,
		processed: 0,
		errors: [] as string[]
	};

	try {
		// 1. Start tracking
		const { data } = await serviceClient.rpc('start_job_run', {
			p_job_name: 'my_job_name',
			p_metadata: {}
		});
		runId = data;

		// 2. Execute job logic
		for (const item of items) {
			try {
				await processItem(item);
				results.processed++;
			} catch (err) {
				results.errors.push(err.message);
			}
		}

		// 3. Complete tracking
		results.success = results.errors.length === 0;

		await serviceClient.rpc('complete_job_run', {
			p_run_id: runId,
			p_status: results.success ? 'success' : 'partial_failure',
			p_metadata: results
		});

		return json(results, {
			status: results.success ? 200 : 207
		});
	} catch (err) {
		// Critical failure
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: err.message
			});
		}
		return json({ success: false, error: err.message }, { status: 500 });
	}
};
```

### pg_cron (SQL)

```sql
CREATE OR REPLACE FUNCTION public.my_pg_cron_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_run_id UUID;
    v_count INTEGER;
BEGIN
    -- 1. Start tracking
    v_run_id := start_job_run('my_pg_cron_job', '{}'::jsonb);

    BEGIN
        -- 2. Execute job logic
        UPDATE my_table SET processed = true WHERE ...;
        GET DIAGNOSTICS v_count = ROW_COUNT;

        -- 3. Complete success
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object('processed_count', v_count)
        );

    EXCEPTION WHEN OTHERS THEN
        -- 3. Complete failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object('processed_count', COALESCE(v_count, 0))
        );
        RAISE;
    END;
END;
$$;
```

---

## Requetes Utiles

### Executions recentes

```sql
SELECT
  job_name,
  status,
  execution_time_ms,
  metadata,
  started_at
FROM background_job_runs
ORDER BY started_at DESC
LIMIT 20;
```

### Stats par job (7 derniers jours)

```sql
SELECT
  job_name,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status IN ('failed', 'timeout')) as failure_count,
  ROUND(AVG(execution_time_ms)) as avg_time_ms
FROM background_job_runs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY job_name
ORDER BY total_runs DESC;
```

### Jobs en cours (potentiellement bloques)

```sql
SELECT *
FROM background_job_runs
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';
```

### Tendance des echecs

```sql
SELECT
  DATE(started_at) as date,
  job_name,
  COUNT(*) as failures
FROM background_job_runs
WHERE status IN ('failed', 'timeout')
  AND started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at), job_name
ORDER BY date DESC, failures DESC;
```

---

## Retention des Donnees

Par defaut, les runs sont conserves indefiniment. Pour nettoyer :

### Manuel

```sql
SELECT * FROM cleanup_old_job_runs();
```

### Automatique (ajouter au cleanup_all)

Dans `/api/cleanup/all/+server.ts` :

```typescript
// Cleanup 3: Old job runs
const { data: jobRunsDeleted } = await serviceClient.rpc('cleanup_old_job_runs');
```

---

## Alerting (Future)

Ideas pour alerting automatique :

```sql
-- Trigger sur echec
CREATE OR REPLACE FUNCTION notify_job_failure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' THEN
    -- Envoyer notification admin
    INSERT INTO notifications (user_id, type, title, message)
    SELECT id, 'system', 'Job CRON en echec',
           format('Job %s a echoue: %s', NEW.job_name, NEW.error_message)
    FROM profiles WHERE role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_failure_notification
  AFTER UPDATE ON background_job_runs
  FOR EACH ROW
  WHEN (OLD.status = 'running' AND NEW.status = 'failed')
  EXECUTE FUNCTION notify_job_failure();
```
