<script lang="ts" context="module">
	function generateCSV(stats: {
		overview: {
			total_uses: number;
			total_templates: number;
			completion_rate: number;
			unique_users: number;
			avg_time_to_complete: number;
		};
		top_templates?: { title: string; usage_count: number; completion_rate: number }[];
	}): string {
		const rows: string[] = [];

		// Header
		rows.push('Type,Donnée,Valeur');

		// Overview
		rows.push(`Général,Utilisations totales,${stats.overview.total_uses}`);
		rows.push(`Général,Templates actifs,${stats.overview.total_templates}`);
		rows.push(`Général,Taux de complétion,${(stats.overview.completion_rate * 100).toFixed(2)}%`);
		rows.push(`Général,Utilisateurs uniques,${stats.overview.unique_users}`);
		rows.push(`Général,Temps moyen (s),${stats.overview.avg_time_to_complete.toFixed(2)}`);

		// Empty line
		rows.push('');
		rows.push('Template,Utilisations,Taux de complétion');

		// Top templates
		if (stats.top_templates) {
			stats.top_templates.forEach((t) => {
				rows.push(`"${t.title}",${t.usage_count},${(t.completion_rate * 100).toFixed(2)}%`);
			});
		}

		return rows.join('\n');
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Loader2, TrendingUp, Users, CheckCircle, BarChart3, ArrowLeft } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';

	// State
	let isLoading = $state(true);
	let stats = $state<unknown>(null);
	let timeRange = $state<'7d' | '30d' | '90d' | 'all'>('30d');

	const timeRangeOptions = [
		{ value: '7d', label: '7 derniers jours' },
		{ value: '30d', label: '30 derniers jours' },
		{ value: '90d', label: '90 derniers jours' },
		{ value: 'all', label: 'Tout' }
	];

	onMount(() => {
		loadStats();
	});

	async function loadStats() {
		isLoading = true;
		try {
			const params = new URLSearchParams({ time_range: timeRange });
			const response = await fetch(`/api/messages/templates/stats?${params}`);

			if (response.ok) {
				stats = await response.json();
			} else {
				toaster.error('Erreur lors du chargement des statistiques');
			}
		} catch (error) {
			console.error('Error loading stats:', error);
			toaster.error('Une erreur est survenue');
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (timeRange) {
			loadStats();
		}
	});

	function formatNumber(num: number): string {
		if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'k';
		}
		return num.toString();
	}

	function formatPercentage(num: number): string {
		return (num * 100).toFixed(1) + '%';
	}

	function formatDuration(seconds: number): string {
		if (seconds < 60) {
			return `${Math.round(seconds)}s`;
		}
		const minutes = Math.floor(seconds / 60);
		const secs = Math.round(seconds % 60);
		return `${minutes}m ${secs}s`;
	}

	function getTriggerTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			general: 'Message général',
			assessment_question: 'Question sur évaluation',
			srs_help: 'Aide SRS',
			system_notification: 'Notification système',
			enigma_answer: 'Réponse énigme'
		};
		return labels[type] || type;
	}
</script>

<div class="container mx-auto p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<Button
				variant="ghost"
				onclick={() => goto('/dashboard/admin/message-templates').then(() => {})}
			>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Retour aux templates
			</Button>
			<h1 class="mt-2 text-3xl font-bold">Statistiques des Templates</h1>
			<p class="text-muted-foreground">Analysez l'utilisation et les performances des templates</p>
		</div>

		<!-- Time Range Filter -->
		<MySelect
			type="single"
			bind:value={timeRange}
			items={timeRangeOptions}
			placeholder="Période"
			triggerClass="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
		/>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
		</div>
	{:else if !stats}
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<p class="text-muted-foreground">Aucune statistique disponible</p>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Overview Cards -->
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Total Uses -->
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Utilisations totales</Card.Title>
						<TrendingUp class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatNumber(stats.overview.total_uses)}</div>
						<p class="text-xs text-muted-foreground">
							{stats.overview.total_templates} templates actifs
						</p>
					</Card.Content>
				</Card.Root>

				<!-- Completion Rate -->
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Taux de complétion</Card.Title>
						<CheckCircle class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">
							{formatPercentage(stats.overview.completion_rate)}
						</div>
						<p class="text-xs text-muted-foreground">
							{stats.overview.completed_uses} sur {stats.overview.total_uses} complétés
						</p>
					</Card.Content>
				</Card.Root>

				<!-- Unique Users -->
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Utilisateurs actifs</Card.Title>
						<Users class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatNumber(stats.overview.unique_users)}</div>
						<p class="text-xs text-muted-foreground">Ont utilisé des templates</p>
					</Card.Content>
				</Card.Root>

				<!-- Avg Time to Complete -->
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Temps moyen</Card.Title>
						<BarChart3 class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">
							{formatDuration(stats.overview.avg_time_to_complete)}
						</div>
						<p class="text-xs text-muted-foreground">Pour compléter un template</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Top Templates -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Templates les plus utilisés</Card.Title>
					<Card.Description>Classement par nombre d'utilisations</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if stats.top_templates && stats.top_templates.length > 0}
						<div class="space-y-3">
							{#each stats.top_templates as template, index (template.id)}
								<div class="flex items-center justify-between rounded-lg border border-border p-3">
									<div class="flex items-center gap-3">
										<Badge variant="outline" class="font-mono">{index + 1}</Badge>
										<div>
											<div class="font-medium">{template.title}</div>
											<div class="text-xs text-muted-foreground">
												{getTriggerTypeLabel(template.trigger_type)}
												{#if template.scope === 'system'}
													• Système
												{:else}
													• Classe
												{/if}
											</div>
										</div>
									</div>
									<div class="text-right">
										<div class="font-semibold">{template.usage_count} utilisations</div>
										<div class="text-xs text-muted-foreground">
											{formatPercentage(template.completion_rate)} complétés
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="py-8 text-center text-sm text-muted-foreground">
							Aucune donnée d'utilisation disponible
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Usage by Trigger Type -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Utilisation par type de déclencheur</Card.Title>
					<Card.Description>Répartition des utilisations par catégorie</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if stats.by_trigger_type && stats.by_trigger_type.length > 0}
						<div class="space-y-3">
							{#each stats.by_trigger_type as item (item.trigger_type)}
								{@const percentage = (item.usage_count / stats.overview.total_uses) * 100}
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<span class="text-sm font-medium">
											{getTriggerTypeLabel(item.trigger_type)}
										</span>
										<span class="text-sm text-muted-foreground">
											{item.usage_count} ({percentage.toFixed(1)}%)
										</span>
									</div>
									<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
										<div
											class="h-full bg-primary transition-all"
											style="width: {percentage}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="py-8 text-center text-sm text-muted-foreground">Aucune donnée disponible</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Recent Usage Activity -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Activité récente</Card.Title>
					<Card.Description>Dernières utilisations de templates</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if stats.recent_usage && stats.recent_usage.length > 0}
						<div class="space-y-2">
							{#each stats.recent_usage as usage (usage.id)}
								<div class="flex items-center justify-between rounded-lg border border-border p-3">
									<div>
										<div class="font-medium">{usage.template_title}</div>
										<div class="text-xs text-muted-foreground">
											{usage.user_name || 'Utilisateur inconnu'}
											{#if usage.class_name}
												• {usage.class_name}
											{/if}
										</div>
									</div>
									<div class="text-right">
										<div class="text-sm">
											{#if usage.completed}
												<Badge variant="default">Complété</Badge>
											{:else}
												<Badge variant="outline">En cours</Badge>
											{/if}
										</div>
										<div class="text-xs text-muted-foreground">
											{new Date(usage.used_at).toLocaleDateString('fr-FR', {
												day: 'numeric',
												month: 'short',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="py-8 text-center text-sm text-muted-foreground">Aucune activité récente</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- User Adoption -->
			{#if stats.user_adoption}
				<Card.Root>
					<Card.Header>
						<Card.Title>Adoption par les utilisateurs</Card.Title>
						<Card.Description
							>Répartition des utilisateurs par fréquence d'utilisation</Card.Description
						>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-4 md:grid-cols-3">
							<!-- Power Users -->
							<div class="rounded-lg border border-border bg-muted/50 p-4">
								<div class="text-center">
									<div class="text-2xl font-bold text-green-600">
										{stats.user_adoption.power_users || 0}
									</div>
									<div class="text-sm font-medium">Utilisateurs avancés</div>
									<div class="text-xs text-muted-foreground">10+ utilisations</div>
								</div>
							</div>

							<!-- Regular Users -->
							<div class="rounded-lg border border-border bg-muted/50 p-4">
								<div class="text-center">
									<div class="text-2xl font-bold text-blue-600">
										{stats.user_adoption.regular_users || 0}
									</div>
									<div class="text-sm font-medium">Utilisateurs réguliers</div>
									<div class="text-xs text-muted-foreground">3-9 utilisations</div>
								</div>
							</div>

							<!-- Casual Users -->
							<div class="rounded-lg border border-border bg-muted/50 p-4">
								<div class="text-center">
									<div class="text-2xl font-bold text-gray-600">
										{stats.user_adoption.casual_users || 0}
									</div>
									<div class="text-sm font-medium">Utilisateurs occasionnels</div>
									<div class="text-xs text-muted-foreground">1-2 utilisations</div>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Export Button -->
			<div class="flex justify-end">
				<Button
					variant="outline"
					onclick={async () => {
						try {
							const csv = generateCSV(stats);
							const blob = new Blob([csv], { type: 'text/csv' });
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = `template-stats-${new Date().toISOString().split('T')[0]}.csv`;
							a.click();
							URL.revokeObjectURL(url);
							toaster.success('Statistiques exportées');
						} catch (error) {
							console.error('Export error:', error);
							toaster.error("Erreur lors de l'export");
						}
					}}
				>
					Exporter en CSV
				</Button>
			</div>
		</div>
	{/if}
</div>
