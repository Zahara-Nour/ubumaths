# Vercel CRON Jobs

> Reference pour les jobs HTTP planifies via Vercel (2 max sur free tier).

## Statut Actuel

**Aucun job Vercel CRON actif** - Tous les jobs ont ete migres vers pg_cron.

```json
// vercel.json
{
	"crons": []
}
```

> **Migration complete** : Daily Summaries, Weekly Rewards, Weekly Best Bonuses et Cleanup All
> ont tous ete migres vers pg_cron pour beneficier d'une execution sans timeout et timezone-aware.
> Voir [pg-cron.md](./pg-cron.md) pour la liste complete des jobs.

---

## Creer un Nouveau Job Vercel (si necessaire)

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
		{
			"path": "/api/cron/my-job-name",
			"schedule": "0 3 * * *"
		}
	]
}
```

### 3. Ajouter dans validation

```typescript
// src/lib/server/validation/cron.ts
const ALLOWED_JOB_PATHS = [
	'/api/cron/my-job-name' // Nouveau
] as const;
```

### 4. Ajouter mapping admin

```typescript
// src/routes/(protected)/dashboard/admin/cron/+page.svelte
function getJobPath(jobName: string): string {
	const pathMap: Record<string, string> = {
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

Pour contourner ces limitations, utiliser **pg_cron** :

- Nombre de jobs illimite
- Pas de timeout
- Frequence jusqu'a 1x/minute
- Execution timezone-aware

Voir [pg-cron.md](./pg-cron.md) pour plus de details.
