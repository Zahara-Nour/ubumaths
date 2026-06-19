<!-- Admin CRON Monitoring Page -->
<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Switch from '$lib/components/ui/switch';
	import { toaster } from '$lib/stores/toaster.svelte';
	import TypedConfirmDialog from '$lib/components/admin/TypedConfirmDialog.svelte';
	import { MetricCard } from '$lib/components/admin/widgets';
	import { cn } from '$lib/utils';
	import {
		RefreshCw,
		Clock,
		CheckCircle2,
		XCircle,
		AlertTriangle,
		Play,
		Timer,
		Activity
	} from '@lucide/svelte';
	import type { CronJobRun } from '$lib/server/validation/cron';

	let { data } = $props();

	// Snapshot for $state inits below.
	// svelte-ignore state_referenced_locally
	const initialData = data;

	// Filter state
	let jobNameFilter = $state(initialData.filters.job_name ?? 'all');
	let statusFilter = $state(initialData.filters.status);
	let periodFilter = $state(initialData.filters.period);

	// UI state
	let loading = $state(false);
	let autoRefresh = $state(false);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	// Modal state
	let detailsModalOpen = $state(false);
	let selectedJob = $state<CronJobRun | null>(null);

	// Typed-confirmation keyword for the (global, destructive) manual trigger.
	// Re-enforced server-side via assertTypedConfirmation.
	const TRIGGER_CONFIRM_KEYWORD = 'LANCER';

	// Filter items
	const jobNameItems = $derived([
		{ value: 'all', label: 'Tous les jobs' },
		...data.jobNames.map((name) => ({
			value: name,
			label: formatJobName(name)
		}))
	]);

	const statusItems = [
		{ value: 'all', label: 'Tous statuts' },
		{ value: 'success', label: 'Succes' },
		{ value: 'failed', label: 'Echec' },
		{ value: 'running', label: 'En cours' },
		{ value: 'timeout', label: 'Timeout' }
	];

	const periodItems = [
		{ value: '24h', label: '24 heures' },
		{ value: '7d', label: '7 jours' },
		{ value: '30d', label: '30 jours' }
	];

	// Filtered jobs (client-side filtering for job name and status)
	// Note: Period filtering happens server-side via applyFilters()
	let filteredJobs = $derived.by(() => {
		let jobs = data.jobs;

		if (jobNameFilter !== 'all') {
			jobs = jobs.filter((j) => j.job_name === jobNameFilter);
		}

		if (statusFilter !== 'all') {
			jobs = jobs.filter((j) => j.status === statusFilter);
		}

		return jobs;
	});

	// Stats derived from filtered jobs
	let displayStats = $derived({
		total: filteredJobs.length,
		success: filteredJobs.filter((j) => j.status === 'success').length,
		failed: filteredJobs.filter((j) => j.status === 'failed' || j.status === 'timeout').length,
		avgTime: calculateAvgTime(filteredJobs)
	});

	// Helper functions
	function formatJobName(name: string): string {
		return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).format(date);
	}

	function formatDuration(ms: number | null): string {
		if (ms === null) return '-';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	function calculateAvgTime(jobs: CronJobRun[]): number {
		const times = jobs
			.filter((j) => j.execution_time_ms !== null)
			.map((j) => j.execution_time_ms as number);
		if (times.length === 0) return 0;
		return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'success':
				return {
					variant: 'default' as const,
					class: 'bg-success hover:bg-success/90',
					icon: CheckCircle2,
					text: 'Succes'
				};
			case 'failed':
				return { variant: 'destructive' as const, class: '', icon: XCircle, text: 'Echec' };
			case 'running':
				return {
					variant: 'secondary' as const,
					class: 'bg-warning hover:bg-warning/90 text-warning-foreground',
					icon: Activity,
					text: 'En cours'
				};
			case 'timeout':
				return {
					variant: 'destructive' as const,
					class: 'bg-warning hover:bg-warning/90',
					icon: AlertTriangle,
					text: 'Timeout'
				};
			default:
				return { variant: 'outline' as const, class: '', icon: Clock, text: status };
		}
	}

	function getJobPath(jobName: string): string {
		const pathMap: Record<string, string> = {
			auto_select_daily_riddle: '/api/riddles/auto-select-daily',
			// pg_cron jobs (triggered via RPC, not HTTP)
			cleanup_all: 'rpc:run_cleanup_all',
			cleanup_stale_trades: 'rpc:cleanup_stale_trades',
			recalculate_minesweeper_ref_times: 'rpc:run_recalculate_minesweeper_ref_times',
			cleanup_stuck_job_runs: 'rpc:cleanup_stuck_job_runs',
			weekly_best_bonuses: 'rpc:run_weekly_best_bonuses',
			weekly_rewards: 'rpc:run_weekly_rewards',
			daily_summaries: 'rpc:run_daily_summaries'
		};
		return pathMap[jobName] ?? '';
	}

	// Actions
	function applyFilters() {
		loading = true;
		const params = new URLSearchParams();

		if (jobNameFilter !== 'all') params.set('job_name', jobNameFilter);
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (periodFilter !== '7d') params.set('period', periodFilter);

		goto(`?${params.toString()}`).then(() => {
			loading = false;
		});
	}

	function resetFilters() {
		jobNameFilter = 'all';
		statusFilter = 'all';
		periodFilter = '7d';
		goto('?').then(() => {});
	}

	async function refresh() {
		loading = true;
		await invalidateAll();
		loading = false;
	}

	function openDetails(job: CronJobRun) {
		selectedJob = job;
		detailsModalOpen = true;
	}

	// Triggers a job by path; sends the typed-confirmation keyword in the body.
	// Throws on failure so the TypedConfirmDialog keeps itself open + toasts.
	// On success it schedules a refresh and resolves (the dialog closes + toasts).
	async function triggerJob(jobPath: string) {
		const response = await fetch('/api/admin/cron/trigger', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ job_path: jobPath, confirm: TRIGGER_CONFIRM_KEYWORD })
		});

		const result = await response.json().catch(() => ({}));

		if (response.ok && result.success) {
			// Refresh after a short delay to see the new job run.
			setTimeout(() => refresh(), 2000);
			return;
		}

		if (response.status === 429) {
			throw new Error(result.message || 'Rate limit atteint. Attendez avant de reessayer.');
		}
		throw new Error(result.message || 'Echec du declenchement du job');
	}

	// Auto-refresh effect
	$effect(() => {
		if (autoRefresh) {
			if (refreshInterval) clearInterval(refreshInterval);
			refreshInterval = setInterval(() => refresh(), 120000); // 2 minutes

			return () => {
				if (refreshInterval) {
					clearInterval(refreshInterval);
					refreshInterval = null;
				}
			};
		} else {
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		}
	});
</script>

<div class="container mx-auto py-8">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold">Monitoring CRON Jobs</h1>
			<p class="mt-1 text-muted-foreground">Suivi des taches planifiees et declenchement manuel</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<!-- Auto-refresh toggle -->
			<div class="flex items-center gap-2">
				<Switch.Root
					id="auto-refresh"
					checked={autoRefresh}
					onCheckedChange={(checked) => (autoRefresh = checked ?? false)}
				/>
				<label for="auto-refresh" class="cursor-pointer text-sm font-medium">
					Auto-refresh (2 min)
				</label>
			</div>

			<!-- Refresh button -->
			<Button onclick={refresh} variant="outline" size="sm" disabled={loading}>
				<RefreshCw class={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
				Rafraichir
			</Button>
		</div>
	</div>

	<!-- Statistics Cards -->
	<div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<MetricCard label="Executions ({periodFilter})" value={displayStats.total} icon={Activity} />
		<MetricCard
			label="Succes"
			value={displayStats.success}
			icon={CheckCircle2}
			status={displayStats.success > 0 ? 'ok' : undefined}
		/>
		<MetricCard
			label="Echecs"
			value={displayStats.failed}
			icon={XCircle}
			status={displayStats.failed > 0 ? 'critical' : 'ok'}
		/>
		<MetricCard label="Temps moyen" value={formatDuration(displayStats.avgTime)} icon={Timer} />
	</div>

	<!-- Filters -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 md:grid-cols-3">
				<!-- Job Name Filter -->
				<div class="space-y-2">
					<Label>Job</Label>
					<MySelect
						type="single"
						bind:value={jobNameFilter}
						items={jobNameItems}
						placeholder="Tous les jobs"
						triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>

				<!-- Status Filter -->
				<div class="space-y-2">
					<Label>Statut</Label>
					<MySelect
						type="single"
						bind:value={statusFilter}
						items={statusItems}
						placeholder="Tous statuts"
						triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>

				<!-- Period Filter -->
				<div class="space-y-2">
					<Label>Periode</Label>
					<MySelect
						type="single"
						bind:value={periodFilter}
						items={periodItems}
						placeholder="7 jours"
						triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>
			</div>

			<div class="mt-4 flex gap-2">
				<Button onclick={applyFilters} disabled={loading}>Appliquer</Button>
				<Button variant="outline" onclick={resetFilters} disabled={loading}>Reinitialiser</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Job List -->
	<Card.Root>
		<Card.Header>
			<Card.Title>
				Executions ({filteredJobs.length})
			</Card.Title>
			<Card.Description>Historique des executions de jobs CRON</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if filteredJobs.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<Activity class="mx-auto mb-2 h-12 w-12 opacity-50" />
					<p>Aucune execution trouvee</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each filteredJobs as job (job.id)}
						{@const statusInfo = getStatusBadge(job.status)}
						{@const jobPath = getJobPath(job.job_name)}
						<div
							class="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
						>
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex items-center gap-2">
									<Badge variant={statusInfo.variant} class={statusInfo.class}>
										<statusInfo.icon class="mr-1 h-3 w-3" />
										{statusInfo.text}
									</Badge>
									<span class="truncate font-medium">{formatJobName(job.job_name)}</span>
								</div>
								<div class="flex items-center gap-4 text-sm text-muted-foreground">
									<span class="flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{formatDate(job.started_at)}
									</span>
									{#if job.execution_time_ms !== null}
										<span class="flex items-center gap-1">
											<Timer class="h-3 w-3" />
											{formatDuration(job.execution_time_ms)}
										</span>
									{/if}
								</div>
								{#if job.error_message}
									<p class="mt-1 truncate text-sm text-destructive">
										{job.error_message}
									</p>
								{/if}
							</div>

							<div class="ml-4 flex items-center gap-2">
								<Button variant="outline" size="sm" onclick={() => openDetails(job)}>
									Details
								</Button>
								{#if jobPath}
									<TypedConfirmDialog
										expected={TRIGGER_CONFIRM_KEYWORD}
										onConfirm={() => triggerJob(jobPath)}
										title="Declencher le job « {formatJobName(job.job_name)} »"
										description="Le job sera execute immediatement. Vous ne pouvez declencher le meme job qu'une fois par minute."
										confirmLabel="Declencher"
										successMessage="Job declenche avec succes"
									>
										{#snippet trigger(props)}
											<Button {...props} variant="ghost" size="sm" title="Relancer ce job">
												<Play class="h-4 w-4" />
											</Button>
										{/snippet}
									</TypedConfirmDialog>
								{:else}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => toaster.error('Ce job ne peut pas etre declenche manuellement')}
										title="Relancer ce job"
									>
										<Play class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Details Modal -->
<Dialog.Root bind:open={detailsModalOpen}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Details de l'execution</Dialog.Title>
			<Dialog.Description>
				{#if selectedJob}
					{formatJobName(selectedJob.job_name)}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedJob}
			{@const statusInfo = getStatusBadge(selectedJob.status)}
			<div class="space-y-4 py-4">
				<!-- Status and timing -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Statut</p>
						<Badge variant={statusInfo.variant} class={cn('mt-1', statusInfo.class)}>
							<statusInfo.icon class="mr-1 h-3 w-3" />
							{statusInfo.text}
						</Badge>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Duree</p>
						<p class="mt-1 text-lg font-semibold">
							{formatDuration(selectedJob.execution_time_ms)}
						</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Debut</p>
						<p class="mt-1">{formatDate(selectedJob.started_at)}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Fin</p>
						<p class="mt-1">
							{selectedJob.completed_at ? formatDate(selectedJob.completed_at) : '-'}
						</p>
					</div>
				</div>

				<!-- Error message -->
				{#if selectedJob.error_message}
					<div>
						<p class="text-sm font-medium text-destructive">Erreur</p>
						<div class="mt-1 rounded-md bg-destructive/10 p-3">
							<pre
								class="text-sm whitespace-pre-wrap text-destructive">{selectedJob.error_message}</pre>
						</div>
					</div>
				{/if}

				<!-- Metadata -->
				{#if selectedJob.metadata && Object.keys(selectedJob.metadata).length > 0}
					<div>
						<p class="text-sm font-medium text-muted-foreground">Metadata</p>
						<div class="mt-1 rounded-md bg-muted p-3">
							<pre class="text-sm whitespace-pre-wrap">{JSON.stringify(
									selectedJob.metadata,
									null,
									2
								)}</pre>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (detailsModalOpen = false)}>Fermer</Button>
			{#if selectedJob}
				{@const selectedJobPath = getJobPath(selectedJob.job_name)}
				{#if selectedJobPath}
					<TypedConfirmDialog
						expected={TRIGGER_CONFIRM_KEYWORD}
						onConfirm={() => triggerJob(selectedJobPath)}
						title="Declencher le job « {formatJobName(selectedJob.job_name)} »"
						description="Le job sera execute immediatement. Vous ne pouvez declencher le meme job qu'une fois par minute."
						confirmLabel="Declencher"
						successMessage="Job declenche avec succes"
					>
						{#snippet trigger(props)}
							<Button {...props}>
								<Play class="mr-2 h-4 w-4" />
								Relancer
							</Button>
						{/snippet}
					</TypedConfirmDialog>
				{:else}
					<Button onclick={() => toaster.error('Ce job ne peut pas etre declenche manuellement')}>
						<Play class="mr-2 h-4 w-4" />
						Relancer
					</Button>
				{/if}
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
