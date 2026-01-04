# Interface Admin CRON

> Dashboard de monitoring et declenchement manuel des jobs.

## Acces

**URL** : `/dashboard/admin/cron`

**Requis** : Role `admin`

## Fichiers

```
src/routes/(protected)/dashboard/admin/cron/
├── +page.server.ts    # Chargement initial des donnees
└── +page.svelte       # Interface utilisateur

src/routes/api/admin/cron/
├── jobs/+server.ts    # GET - Liste des executions
└── trigger/+server.ts # POST - Declenchement manuel
```

---

## Fonctionnalites

### 1. Statistiques

Affiche pour la periode selectionnee :

| Metrique    | Description               |
| ----------- | ------------------------- |
| Executions  | Nombre total de runs      |
| Succes      | Runs termines avec succes |
| Echecs      | Runs failed ou timeout    |
| Temps moyen | Duree moyenne d'execution |

### 2. Filtres

| Filtre  | Options                                | Default |
| ------- | -------------------------------------- | ------- |
| Job     | Tous, Daily Summaries, Cleanup, etc.   | Tous    |
| Statut  | Tous, Succes, Echec, En cours, Timeout | Tous    |
| Periode | 24h, 7 jours, 30 jours                 | 7 jours |

### 3. Liste des Executions

Pour chaque execution :

- Badge de statut (couleur)
- Nom du job
- Date/heure de debut
- Duree d'execution
- Message d'erreur (si echec)
- Bouton "Details"
- Bouton "Relancer"

### 4. Modal Details

Affiche :

- Statut avec badge
- Duree
- Timestamps (debut/fin)
- Message d'erreur (si applicable)
- Metadata JSON formatee

### 5. Declenchement Manuel

- Bouton "Play" sur chaque execution
- Dialog de confirmation
- Rate limiting : 1x/min par job
- Support jobs HTTP (Vercel) et RPC (pg_cron)

### 6. Auto-Refresh

Toggle pour actualisation automatique toutes les 2 minutes.

---

## API Endpoints

### GET /api/admin/cron/jobs

Liste les executions de jobs.

**Query Parameters** (Zod validated) :

```typescript
{
  job_name?: string,      // Filtrer par nom
  status: 'all' | 'running' | 'success' | 'failed' | 'timeout',
  period: '24h' | '7d' | '30d',
  limit: 1-100,           // Default: 50
  offset: number          // Default: 0
}
```

**Response** :

```typescript
{
  jobs: Array<{
    id: string,
    job_name: string,
    status: 'running' | 'success' | 'failed' | 'timeout',
    started_at: string,
    completed_at: string | null,
    execution_time_ms: number | null,
    error_message: string | null,
    metadata: Record<string, unknown> | null
  }>,
  stats: {
    total_runs_period: number,
    success_count: number,
    failed_count: number,
    avg_execution_time_ms: number
  },
  pagination: {
    total: number,
    limit: number,
    offset: number
  }
}
```

### POST /api/admin/cron/trigger

Declenche manuellement un job.

**Request Body** :

```typescript
{
	job_path: string; // Ex: '/api/cron/daily-summaries-and-rewards'
	// ou 'rpc:cleanup_stale_trades'
}
```

**Response** :

```typescript
{
  success: boolean,
  message: string,
  job_path: string,
  triggered_at: string,  // ISO 8601
  result?: unknown       // Resultat du job si disponible
}
```

**Rate Limiting** : 429 si meme job declenche < 1 min avant.

---

## Mapping Job Names ↔ Paths

```typescript
// +page.svelte
function getJobPath(jobName: string): string {
	const pathMap: Record<string, string> = {
		// Vercel CRON (HTTP)
		daily_summaries_and_rewards: '/api/cron/daily-summaries-and-rewards',
		cleanup_all: '/api/cleanup/all',
		auto_select_daily_riddle: '/api/riddles/auto-select-daily',

		// pg_cron (RPC)
		cleanup_stale_trades: 'rpc:cleanup_stale_trades'
	};
	return pathMap[jobName] ?? '';
}
```

Pour ajouter un nouveau job, mettre a jour :

1. Ce mapping (affichage bouton Play)
2. `ALLOWED_JOB_PATHS` dans `validation/cron.ts` (autorisation)

---

## Validation Schemas

```typescript
// src/lib/server/validation/cron.ts

// Jobs autorises pour trigger manuel
const ALLOWED_JOB_PATHS = [
	'/api/cron/daily-summaries-and-rewards',
	'/api/cleanup/all',
	'/api/riddles/auto-select-daily',
	'rpc:cleanup_stale_trades'
] as const;

// Validation query params
export const cronJobsQuerySchema = z.object({
	job_name: z.string().max(100).optional(),
	status: z.enum(['all', 'running', 'success', 'failed', 'timeout']).default('all'),
	period: z.enum(['24h', '7d', '30d']).default('7d'),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0)
});

// Validation body trigger
export const cronTriggerBodySchema = z.object({
	job_path: z
		.string()
		.min(1)
		.refine(
			(path) => ALLOWED_JOB_PATHS.includes(path),
			`Job path must be one of: ${ALLOWED_JOB_PATHS.join(', ')}`
		)
});
```

---

## Trigger Manual : HTTP vs RPC

### Jobs HTTP (Vercel)

```typescript
// trigger/+server.ts
if (!job_path.startsWith('rpc:')) {
	const response = await fetch(`${baseUrl}${job_path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${CRON_SECRET}`
		}
	});
}
```

### Jobs RPC (pg_cron)

```typescript
// trigger/+server.ts
if (job_path.startsWith('rpc:')) {
	const functionName = job_path.replace('rpc:', '');
	const serviceClient = createServiceRoleClient();
	await serviceClient.rpc(functionName);
}
```

---

## Composants UI

### MetricCard

```svelte
<MetricCard label="Executions (7d)" value={displayStats.total} icon={Activity} />
```

### Status Badge

```svelte
{@const statusInfo = getStatusBadge(job.status)}
<Badge variant={statusInfo.variant} class={statusInfo.class}>
	<statusInfo.icon class="mr-1 h-3 w-3" />
	{statusInfo.text}
</Badge>
```

| Status  | Couleur | Icone         |
| ------- | ------- | ------------- |
| success | Vert    | CheckCircle2  |
| failed  | Rouge   | XCircle       |
| running | Orange  | Activity      |
| timeout | Jaune   | AlertTriangle |

---

## Screenshots Conceptuels

### Vue principale

```
┌────────────────────────────────────────────────────────────┐
│  Monitoring CRON Jobs                    [Auto-refresh ○]  │
│  Suivi des taches planifiees             [Rafraichir]      │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 47       │ │ 45       │ │ 2        │ │ 1.2s     │      │
│  │ Execut.  │ │ Succes   │ │ Echecs   │ │ Temps moy│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├────────────────────────────────────────────────────────────┤
│  Filtres                                                   │
│  [Job: Tous    ▼] [Statut: Tous ▼] [Periode: 7j ▼]        │
│  [Appliquer] [Reinitialiser]                              │
├────────────────────────────────────────────────────────────┤
│  Executions (47)                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ [✓ Succes] Daily Summaries And Rewards               │ │
│  │   🕐 04/01/2026 01:00:15  ⏱ 2.34s    [Details] [▶]  │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ [✓ Succes] Cleanup Stale Trades                      │ │
│  │   🕐 04/01/2026 00:50:00  ⏱ 0.05s    [Details] [▶]  │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ [✗ Echec] Cleanup All                                │ │
│  │   🕐 04/01/2026 02:00:00  ⏱ 0.8s     [Details] [▶]  │ │
│  │   ⚠ Connection timeout                               │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Modal Details

```
┌────────────────────────────────────────┐
│  Details de l'execution            [X] │
│  Daily Summaries And Rewards           │
├────────────────────────────────────────┤
│  Statut         Duree                  │
│  [✓ Succes]     2.34s                  │
│                                        │
│  Debut          Fin                    │
│  04/01/2026     04/01/2026             │
│  01:00:15       01:00:17               │
│                                        │
│  Metadata                              │
│  ┌──────────────────────────────────┐  │
│  │ {                                │  │
│  │   "classes_processed": 15,       │  │
│  │   "daily_summaries_generated":   │  │
│  │     120,                         │  │
│  │   "weekly_rewards_awarded": 45   │  │
│  │ }                                │  │
│  └──────────────────────────────────┘  │
├────────────────────────────────────────┤
│              [Fermer] [▶ Relancer]     │
└────────────────────────────────────────┘
```

---

## Ajouter un Nouveau Job a l'Interface

### 1. Ajouter dans ALLOWED_JOB_PATHS

```typescript
// src/lib/server/validation/cron.ts
const ALLOWED_JOB_PATHS = [
	// ... existants ...
	'/api/cron/my-new-job', // HTTP
	'rpc:my_new_rpc_function' // ou RPC
] as const;
```

### 2. Ajouter le mapping

```typescript
// src/routes/(protected)/dashboard/admin/cron/+page.svelte
function getJobPath(jobName: string): string {
	const pathMap: Record<string, string> = {
		// ... existants ...
		my_new_job: '/api/cron/my-new-job',
		my_new_rpc_function: 'rpc:my_new_rpc_function'
	};
	return pathMap[jobName] ?? '';
}
```

Le job apparaitra automatiquement dans la liste des qu'il aura une execution dans `background_job_runs`.
