<!--
	Admin Dashboard Component - Comprehensive System Health Monitoring
	===================================================================

	FEATURES:
	---------
	- Real-time system health monitoring with 12+ widgets
	- Auto-refresh capability (user opt-in, 2-minute interval)
	- Manual refresh with loading states
	- Responsive grid layout (1/2/3 columns)
	- Error handling with toast notifications
	- Relative time display for last update
	- Server-side cached data (5-minute cache)

	WIDGETS:
	--------
	Row 1: Critical System Health
	  - Database health status with latency
	  - Critical errors count (24h)
	  - Unresolved errors count

	Row 2: User Activity
	  - Online users
	  - Active users (24h) with trend
	  - New users (7 days)

	Row 3: Performance & Errors
	  - 7-day error trend chart
	  - API response time
	  - Error rate percentage

	Row 4: Content & Jobs
	  - Content summary (exercises, assessments, etc.)
	  - Completion rate
	  - Background jobs status

	SECURITY:
	---------
	- Admin-only endpoint (RLS enforced)
	- No sensitive data exposure in client state

	DATA SOURCE:
	------------
	/api/admin/health-stats (GET)
	- 5-minute server-side cache
	- Type-safe response with Zod validation
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Switch from '$lib/components/ui/switch';
	import {
		MetricCard,
		HealthStatusCard,
		TrendChart,
		AlertBadge,
		WidgetSkeleton
	} from '$lib/components/admin/widgets';
	import * as Card from '$lib/components/ui/card';
	import {
		Users,
		UserPlus,
		Activity,
		TrendingUp,
		FileText,
		CheckCircle2,
		AlertCircle,
		AlertTriangle,
		RefreshCw,
		Clock
	} from 'lucide-svelte';
	import { cn } from '$lib/utils';

	import type { PageData } from './$types';
	import type { HealthStatsResponse } from '$lib/server/validation/health';

	// Props
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let { data }: { data: PageData } = $props();

	// State
	let stats = $state<HealthStatsResponse | null>(null);
	let loading = $state(true);
	let autoRefresh = $state(false);
	let lastUpdated = $state<Date | null>(null);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	// Derived values
	let relativeTime = $derived.by(() => {
		if (!lastUpdated) return 'Jamais';

		const now = new Date();
		const diffMs = now.getTime() - lastUpdated.getTime();
		const diffSec = Math.floor(diffMs / 1000);

		if (diffSec < 10) return "à l'instant";
		if (diffSec < 60) return `il y a ${diffSec} secondes`;

		const diffMin = Math.floor(diffSec / 60);
		if (diffMin === 1) return 'il y a 1 minute';
		if (diffMin < 60) return `il y a ${diffMin} minutes`;

		const diffHour = Math.floor(diffMin / 60);
		if (diffHour === 1) return 'il y a 1 heure';
		if (diffHour < 24) return `il y a ${diffHour} heures`;

		const diffDays = Math.floor(diffHour / 24);
		if (diffDays === 1) return 'il y a 1 jour';
		return `il y a ${diffDays} jours`;
	});

	let dbStatus = $derived.by<'ok' | 'degraded' | 'down'>(() => {
		if (!stats) return 'down';
		const latency = stats.performance.avgResponseTime;
		if (latency < 200) return 'ok';
		if (latency < 500) return 'degraded';
		return 'down';
	});

	let dbLatency = $derived(stats?.performance?.avgResponseTime ?? 0);

	let criticalErrorsStatus = $derived.by<'ok' | 'warning' | 'critical'>(() => {
		if (!stats) return 'ok';
		return stats.errors.critical > 0 ? 'critical' : 'ok';
	});

	let unresolvedErrorsStatus = $derived.by<'ok' | 'warning' | 'critical'>(() => {
		if (!stats) return 'ok';
		return stats.errors.unresolved > 10 ? 'warning' : 'ok';
	});

	let responseTimeStatus = $derived.by<'ok' | 'warning' | 'critical'>(() => {
		if (!stats) return 'ok';
		const avgTime = stats.performance.avgResponseTime;
		if (avgTime < 500) return 'ok';
		if (avgTime < 1000) return 'warning';
		return 'critical';
	});

	let errorRateStatus = $derived.by<'ok' | 'warning' | 'critical'>(() => {
		if (!stats) return 'ok';
		const rate = stats.performance.errorRate;
		if (rate < 1) return 'ok';
		if (rate < 5) return 'warning';
		return 'critical';
	});

	let completionRateStatus = $derived.by<'ok' | 'warning' | 'critical'>(() => {
		if (!stats) return 'ok';
		// Calculate completion rate from content stats
		const { assignments24h, completions24h } = stats.content;
		if (assignments24h === 0) return 'ok';
		const rate = (completions24h / assignments24h) * 100;
		if (rate > 70) return 'ok';
		if (rate > 50) return 'warning';
		return 'critical';
	});

	let completionRateValue = $derived.by(() => {
		if (!stats) return 0;
		const { assignments24h, completions24h } = stats.content;
		if (assignments24h === 0) return 0;
		return ((completions24h / assignments24h) * 100).toFixed(1);
	});

	// Functions
	async function fetchStats() {
		loading = true;
		try {
			const response = await fetch('/api/admin/health-stats');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			stats = data;
			lastUpdated = new Date();
		} catch (err) {
			toaster.error('Erreur lors du chargement des statistiques système');
			console.error('Failed to fetch health stats:', err);
		} finally {
			loading = false;
		}
	}

	function handleRefresh() {
		fetchStats();
	}

	// Effects
	$effect(() => {
		// Auto-refresh effect
		if (autoRefresh) {
			// Clear existing interval if any
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}

			// Set new interval
			refreshInterval = setInterval(() => {
				fetchStats();
			}, 120000); // 2 minutes

			// Cleanup function
			return () => {
				if (refreshInterval) {
					clearInterval(refreshInterval);
					refreshInterval = null;
				}
			};
		} else {
			// Clear interval when auto-refresh is disabled
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		}
	});

	onMount(() => {
		fetchStats();
	});
</script>

<div class="space-y-6">
	<!-- Header with refresh controls -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Tableau de Bord Administrateur</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Vue d'ensemble de la santé du système et des statistiques en temps réel
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<!-- Auto-refresh toggle -->
			<div class="flex items-center gap-2">
				<Switch.Root
					id="auto-refresh"
					checked={autoRefresh}
					onCheckedChange={(checked) => (autoRefresh = checked ?? false)}
				/>
				<label for="auto-refresh" class="cursor-pointer text-sm font-medium text-foreground">
					Auto-refresh (2 min)
				</label>
			</div>

			<!-- Refresh button -->
			<Button onclick={handleRefresh} variant="outline" size="sm" disabled={loading}>
				<RefreshCw class={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
				Rafraîchir
			</Button>

			<!-- Last updated timestamp -->
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Clock class="h-4 w-4" />
				<span>MAJ: {relativeTime}</span>
			</div>
		</div>
	</div>

	<!-- Loading skeletons -->
	{#if loading && !stats}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each Array(12) as _, i (i)}
				<WidgetSkeleton type={i % 3 === 0 ? 'status' : i % 3 === 1 ? 'chart' : 'metric'} />
			{/each}
		</div>
	{:else if stats}
		<!-- Row 1: Critical System Health -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-foreground">État Critique du Système</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<!-- Database Health -->
				<HealthStatusCard
					service="Base de Données"
					status={dbStatus}
					latency={dbLatency}
					lastCheck={stats.meta.generatedAt}
					message={dbStatus === 'ok'
						? 'Toutes les requêtes répondent normalement'
						: dbStatus === 'degraded'
							? 'Temps de réponse élevé détecté'
							: 'Problème de connexion à la base de données'}
				/>

				<!-- Critical Errors -->
				<MetricCard
					label="Erreurs Critiques (24h)"
					value={stats.errors.critical}
					status={criticalErrorsStatus}
					icon={AlertCircle}
					link="/dashboard/admin/errors"
				/>

				<!-- Unresolved Errors -->
				<MetricCard
					label="Erreurs Non Résolues"
					value={stats.errors.unresolved}
					status={unresolvedErrorsStatus}
					icon={AlertTriangle}
					link="/dashboard/admin/errors"
				/>
			</div>
		</div>

		<!-- Row 2: User Activity -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-foreground">Activité des Utilisateurs</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<!-- Online Users -->
				<MetricCard label="Utilisateurs En Ligne" value={stats.users.online} icon={Users} />

				<!-- Active Users 24h -->
				<MetricCard
					label="Actifs (24h)"
					value={stats.users.active24h}
					icon={Activity}
					trend={stats.users.active7d > 0
						? ((stats.users.active24h - stats.users.active7d / 7) / (stats.users.active7d / 7)) *
							100
						: 0}
				/>

				<!-- New Users 7d -->
				<MetricCard label="Nouveaux Utilisateurs (7j)" value={stats.users.new7d} icon={UserPlus} />
			</div>
		</div>

		<!-- Row 3: Performance & Errors -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-foreground">Performance & Erreurs</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<!-- Error Trend Chart -->
				<Card.Root>
					<Card.Content class="p-4">
						<TrendChart data={stats.errors.trend7d} label="Erreurs (7 jours)" color="red" />
					</Card.Content>
				</Card.Root>

				<!-- API Response Time -->
				<MetricCard
					label="Temps Réponse API (moy)"
					value={`${stats.performance.avgResponseTime}ms`}
					status={responseTimeStatus}
					icon={TrendingUp}
				/>

				<!-- Error Rate -->
				<MetricCard
					label="Taux d'Erreur"
					value={`${stats.performance.errorRate.toFixed(2)}%`}
					status={errorRateStatus}
					icon={AlertCircle}
				/>
			</div>
		</div>

		<!-- Row 4: Content & Activity -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-foreground">Contenu & Activité</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<!-- Content Summary -->
				<Card.Root>
					<Card.Content class="p-6">
						<div class="mb-4 flex items-start justify-between">
							<h3 class="text-sm font-medium text-gray-600">Contenu de la Plateforme</h3>
							<FileText class="h-5 w-5 text-gray-400" />
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<p class="text-2xl font-bold text-gray-900">{stats.content.exercises}</p>
								<p class="text-xs text-gray-600">Exercices</p>
							</div>
							<div>
								<p class="text-2xl font-bold text-gray-900">{stats.content.assessments}</p>
								<p class="text-xs text-gray-600">Évaluations</p>
							</div>
							<div>
								<p class="text-2xl font-bold text-gray-900">{stats.content.riddles}</p>
								<p class="text-xs text-gray-600">Énigmes</p>
							</div>
							<div>
								<p class="text-2xl font-bold text-gray-900">{stats.content.srsDecks}</p>
								<p class="text-xs text-gray-600">Decks SRS</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Activity Today -->
				<Card.Root>
					<Card.Content class="p-6">
						<div class="mb-4 flex items-start justify-between">
							<h3 class="text-sm font-medium text-gray-600">Activité (24h)</h3>
							<Activity class="h-5 w-5 text-gray-400" />
						</div>
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600">Devoirs assignés</span>
								<span class="text-xl font-bold text-gray-900">{stats.content.assignments24h}</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600">Complétés</span>
								<span class="text-xl font-bold text-gray-900">{stats.content.completions24h}</span>
							</div>
							<div class="border-t border-gray-200 pt-2">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium text-gray-700">Taux de complétion</span>
									<span
										class={cn(
											'text-xl font-bold',
											completionRateStatus === 'ok' && 'text-green-600',
											completionRateStatus === 'warning' && 'text-orange-600',
											completionRateStatus === 'critical' && 'text-red-600'
										)}
									>
										{completionRateValue}%
									</span>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Completion Rate Card -->
				<MetricCard
					label="Taux de Complétion Global"
					value={`${completionRateValue}%`}
					status={completionRateStatus}
					icon={CheckCircle2}
				/>
			</div>
		</div>

		<!-- Row 5: Background Jobs -->
		<div>
			<h2 class="mb-4 text-lg font-semibold text-foreground">Tâches de Fond</h2>
			<Card.Root>
				<Card.Content class="p-6">
					<div class="space-y-3">
						<!-- Job summary badges -->
						<div class="mb-4 flex flex-wrap items-center gap-2">
							<AlertBadge count={stats.jobs.total} severity="info" label="Total" pulse={false} />
							<AlertBadge
								count={stats.jobs.running}
								severity="warning"
								label="En cours"
								pulse={stats.jobs.running > 0}
							/>
							<AlertBadge
								count={stats.jobs.failed}
								severity="critical"
								label="Échouées"
								pulse={stats.jobs.failed > 0}
							/>
						</div>

						<!-- Recent jobs list -->
						{#if stats.jobs.recentJobs.length > 0}
							<div class="space-y-2">
								<h3 class="text-sm font-medium text-gray-700">Tâches Récentes</h3>
								<div class="space-y-2">
									{#each stats.jobs.recentJobs as job (job.name)}
										<div
											class="flex items-center justify-between rounded-lg border border-gray-200 p-3"
										>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium text-gray-900">{job.name}</p>
												<div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
													{#if job.lastRun}
														<span>
															Dernière exécution: {new Date(job.lastRun).toLocaleString('fr-FR')}
														</span>
													{/if}
													{#if job.executionTime}
														<span>{job.executionTime}ms</span>
													{/if}
												</div>
												{#if job.error}
													<p class="mt-1 truncate text-xs text-red-600">{job.error}</p>
												{/if}
											</div>
											<div class="ml-3">
												{#if job.status === 'success'}
													<span
														class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
													>
														Succès
													</span>
												{:else if job.status === 'failed'}
													<span
														class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
													>
														Échoué
													</span>
												{:else if job.status === 'running'}
													<span
														class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
													>
														En cours
													</span>
												{:else}
													<span
														class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
													>
														Timeout
													</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<p class="py-4 text-center text-sm text-gray-500">Aucune tâche récente</p>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Cache indicator -->
		{#if stats.meta.cached}
			<div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
				<div class="h-2 w-2 rounded-full bg-blue-400"></div>
				<span>Données en cache (rafraîchissement automatique toutes les 5 minutes)</span>
			</div>
		{/if}
	{:else}
		<!-- Error state -->
		<Card.Root class="border-red-200 bg-red-50">
			<Card.Content class="p-6">
				<div class="flex items-center gap-3">
					<AlertCircle class="h-6 w-6 text-red-600" />
					<div>
						<h3 class="font-semibold text-red-900">Erreur de chargement</h3>
						<p class="text-sm text-red-700">
							Impossible de charger les statistiques système. Veuillez réessayer.
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
