# Vercel CRON Jobs

> Jobs HTTP planifies via Vercel (2 max sur free tier).

## Configuration

**Fichier** : `vercel.json`

```json
{
	"crons": [
		{
			"path": "/api/cron/daily-summaries-and-rewards",
			"schedule": "0 1 * * *"
		},
		{
			"path": "/api/cleanup/all",
			"schedule": "0 2 * * *"
		}
	]
}
```

## Jobs Actifs

### Daily Summaries & Rewards

**Fichier** : `src/routes/api/cron/daily-summaries-and-rewards/+server.ts`

| Propriete     | Valeur                           |
| ------------- | -------------------------------- |
| Schedule      | `0 1 * * *` (01:00 UTC)          |
| Methodes      | GET (Vercel auto), POST (manuel) |
| Duree typique | 2-10s selon nombre de classes    |

#### Operations

```
1. Daily Summaries
   └─ Pour chaque classe ayant eu cours hier
      └─ Genere resume quotidien par eleve
         (gidouilles, bonus, avertissements)

2. Weekly Rewards (si dernier jour de semaine)
   └─ +1 gidouille aux eleves avec 0 avertissement

3. Weekly Best Bonuses (si dernier jour de semaine)
   └─ RPC award_weekly_best_bonuses()
   └─ Attribue meilleur bonus theorique de la semaine

4. Minesweeper Reference Times (dimanche seulement)
   └─ RPC recalculate_minesweeper_reference_times()
   └─ Recalcule temps de reference par cycle/difficulte
```

#### Metadata Generee

```json
{
	"classes_processed": 15,
	"daily_summaries_generated": 120,
	"daily_summaries_classes": 10,
	"weekly_rewards_awarded": 45,
	"weekly_rewards_classes": 15,
	"weekly_best_bonuses_awarded": 30,
	"minesweeper_ref_times_updated": 5,
	"minesweeper_ref_times_skipped": 10
}
```

#### Code Simplifie

```typescript
const cronHandler: RequestHandler = async ({ request }) => {
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();
	const runId = await serviceClient.rpc('start_job_run', {
		p_job_name: 'daily_summaries_and_rewards'
	});

	// Fetch classes avec timezone
	const { data: classes } = await serviceClient
		.from('classes')
		.select('*, schools(timezone, timetable)')
		.eq('is_active', true);

	for (const classData of classes) {
		const timezone = classData.schools?.timezone || 'Europe/Paris';
		const yesterday = getYesterdayInTimezone(timezone);

		// Daily summaries si cours hier
		if (await checkClassSchedule(serviceClient, classData.id, yesterday)) {
			await generateDailySummary(serviceClient, classData, yesterday);
		}

		// Weekly rewards si fin de semaine
		if (isWeeklyRewardsDay(weekConfig, currentDayOfWeek)) {
			await generateWeeklyRewards(serviceClient, classData);
		}
	}

	await serviceClient.rpc('complete_job_run', {
		p_run_id: runId,
		p_status: 'success',
		p_metadata: results
	});

	return json(results);
};
```

---

### Cleanup All

**Fichier** : `src/routes/api/cleanup/all/+server.ts`

| Propriete     | Valeur                  |
| ------------- | ----------------------- |
| Schedule      | `0 2 * * *` (02:00 UTC) |
| Methodes      | GET, POST               |
| Duree typique | < 1s                    |

#### Operations

```
1. Cache Cleanup
   └─ RPC cleanup_expired_cache()
   └─ Supprime entries expirees de server_cache

2. Notifications Cleanup
   └─ cleanupExpiredNotifications()
   └─ Hard delete notifications expirees (> 30 jours)
```

#### Metadata Generee

```json
{
	"cache_deleted": 15,
	"notifications_deleted": 42,
	"total_deleted": 57,
	"cache_success": true,
	"notifications_success": true
}
```

#### Code Simplifie

```typescript
const cleanupHandler: RequestHandler = async ({ request, locals }) => {
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();
	const runId = await serviceClient.rpc('start_job_run', {
		p_job_name: 'cleanup_all'
	});

	// 1. Cache cleanup
	const { data: cacheDeleted } = await serviceClient.rpc('cleanup_expired_cache');

	// 2. Notifications cleanup
	const notifResult = await cleanupExpiredNotifications(locals.supabase);

	await serviceClient.rpc('complete_job_run', {
		p_run_id: runId,
		p_status: 'success',
		p_metadata: {
			cache_deleted: cacheDeleted,
			notifications_deleted: notifResult.deletedCount
		}
	});

	return json(results);
};
```

---

## Creer un Nouveau Job Vercel

### 1. Creer l'endpoint

```typescript
// src/routes/api/cron/[job-name]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { verifyCronAuth } from '$lib/server/auth/cron';

const cronHandler: RequestHandler = async ({ request }) => {
	// 1. Authentification
	verifyCronAuth(request);

	const serviceClient = createServiceRoleClient();
	let runId: string | null = null;

	try {
		// 2. Start tracking
		const { data } = await serviceClient.rpc('start_job_run', {
			p_job_name: 'my_job_name',
			p_metadata: {}
		});
		runId = data;

		// 3. Logique metier
		// ... votre code ...

		// 4. Complete success
		await serviceClient.rpc('complete_job_run', {
			p_run_id: runId,
			p_status: 'success',
			p_metadata: {
				/* resultats */
			}
		});

		return json({ success: true });
	} catch (err) {
		// 5. Complete failure
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

export const GET = cronHandler; // Vercel auto-trigger
export const POST = cronHandler; // Manual trigger
```

### 2. Ajouter dans vercel.json

```json
{
	"crons": [
		// ... jobs existants ...
		{
			"path": "/api/cron/my-job-name",
			"schedule": "0 3 * * *"
		}
	]
}
```

> **Attention** : Free tier limite a 2 jobs. Si deja atteint, utiliser pg_cron.

### 3. Ajouter dans validation

```typescript
// src/lib/server/validation/cron.ts
const ALLOWED_JOB_PATHS = [
	'/api/cron/daily-summaries-and-rewards',
	'/api/cleanup/all',
	'/api/cron/my-job-name' // Nouveau
] as const;
```

### 4. Ajouter mapping admin

```typescript
// src/routes/(protected)/dashboard/admin/cron/+page.svelte
function getJobPath(jobName: string): string {
	const pathMap: Record<string, string> = {
		daily_summaries_and_rewards: '/api/cron/daily-summaries-and-rewards',
		cleanup_all: '/api/cleanup/all',
		my_job_name: '/api/cron/my-job-name' // Nouveau
	};
	return pathMap[jobName] ?? '';
}
```

---

## Syntaxe Cron

```
┌───────────── minute (0-59)
│ ┌───────────── heure (0-23)
│ │ ┌───────────── jour du mois (1-31)
│ │ │ ┌───────────── mois (1-12)
│ │ │ │ ┌───────────── jour de semaine (0-6, 0=dimanche)
│ │ │ │ │
* * * * *
```

| Expression     | Description            |
| -------------- | ---------------------- |
| `0 1 * * *`    | Tous les jours a 01:00 |
| `0 */6 * * *`  | Toutes les 6 heures    |
| `0 0 * * 0`    | Dimanche a minuit      |
| `*/15 * * * *` | Toutes les 15 minutes  |

---

## Limitations Vercel Free Tier

| Limite             | Valeur      |
| ------------------ | ----------- |
| Nombre de jobs     | 2 max       |
| Timeout execution  | 10 secondes |
| Frequence minimale | 1x/jour     |

Pour contourner :

- **Plus de jobs** : Utiliser pg_cron
- **Timeout** : Decouperlogique en plusieurs appels
- **Frequence** : Utiliser pg_cron (1x/min possible)
