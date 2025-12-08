<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { TrendingUp, BarChart3, Award, Coins } from 'lucide-svelte';

	interface Analytics {
		engagement: {
			totalStudents: number;
			activeTraders: number;
			percentageActive: number;
			averageListingsPerStudent: number;
			averageTradesPerStudent: number;
		};
		economic: {
			totalGidouillesCirculated: number;
			averageGidouillesPerTrade: number;
			largestTransaction: number;
			mostExpensiveListings: Array<{
				id: string;
				title: string;
				gidouilles: number;
			}>;
		};
		cards: {
			mostTradedCards: Array<{
				template_id: string;
				name: string;
				count: number;
			}>;
			totalCardsTraded: number;
			uniqueCardsTraded: number;
		};
		temporal: {
			tradesOverTime: Array<{
				date: string;
				count: number;
			}>;
			listingsOverTime: Array<{
				date: string;
				count: number;
			}>;
			peakHours: Array<{
				hour: number;
				count: number;
			}>;
			averageTimeToAcceptanceHours: number;
		};
	}

	let { classId = '', dateFrom = '' }: { classId?: string; dateFrom?: string } = $props();

	// State
	let analytics = $state<Analytics | null>(null);
	let isLoading = $state(true);

	// Fetch analytics
	async function fetchAnalytics() {
		isLoading = true;
		try {
			const params = new URLSearchParams();
			if (classId) params.set('class_id', classId);
			if (dateFrom) params.set('date_from', dateFrom);

			const response = await fetch(`/api/marketplace/admin/analytics?${params}`);
			if (!response.ok) {
				throw new Error('Erreur lors de la récupération des analyses');
			}

			const data = await response.json();
			analytics = data.analytics;
		} catch (err) {
			console.error('Error fetching analytics:', err);
			toaster.error('Erreur lors du chargement des analyses');
			analytics = null;
		} finally {
			isLoading = false;
		}
	}

	// Format number
	function formatNumber(num: number): string {
		return num.toLocaleString('fr-FR');
	}

	// Get engagement level color
	function getEngagementColor(percentage: number): string {
		if (percentage >= 75) return 'text-green-600';
		if (percentage >= 50) return 'text-yellow-600';
		if (percentage >= 25) return 'text-orange-600';
		return 'text-red-600';
	}

	// Create simple SVG chart for trades over time
	function createLineChart(data: Array<{ date: string; count: number }>): string {
		if (!data || data.length === 0) return '';

		const maxCount = Math.max(...data.map((d) => d.count));
		const width = 400;
		const height = 150;
		const padding = 20;
		const chartWidth = width - padding * 2;
		const chartHeight = height - padding * 2;

		const points = data
			.map((d, i) => {
				const x = padding + (i / (data.length - 1)) * chartWidth;
				const y = padding + chartHeight - (d.count / maxCount) * chartHeight;
				return `${x},${y}`;
			})
			.join(' ');

		return `
			<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
				<polyline
					points="${points}"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="text-primary"
				/>
				${data
					.map((d, i) => {
						const x = padding + (i / (data.length - 1)) * chartWidth;
						const y = padding + chartHeight - (d.count / maxCount) * chartHeight;
						return `<circle cx="${x}" cy="${y}" r="4" fill="currentColor" class="text-primary" />`;
					})
					.join('')}
			</svg>
		`;
	}

	// Create bar chart for peak hours
	function createBarChart(data: Array<{ hour: number; count: number }>): string {
		if (!data || data.length === 0) return '';

		const maxCount = Math.max(...data.map((d) => d.count));
		const width = 200;
		const height = 100;
		const barWidth = width / data.length - 4;

		return `
			<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
				${data
					.map((d, i) => {
						const barHeight = (d.count / maxCount) * (height - 20);
						const x = i * (barWidth + 4);
						const y = height - barHeight - 10;
						return `
						<rect
							x="${x}"
							y="${y}"
							width="${barWidth}"
							height="${barHeight}"
							fill="currentColor"
							class="text-primary opacity-80"
						/>
						<text
							x="${x + barWidth / 2}"
							y="${height}"
							text-anchor="middle"
							fill="currentColor"
							class="text-xs text-muted-foreground"
						>${d.hour}h</text>
					`;
					})
					.join('')}
			</svg>
		`;
	}

	// Load on mount
	onMount(() => {
		fetchAnalytics();
	});

	// Refetch when parameters change
	$effect(() => {
		if (classId !== undefined || dateFrom !== undefined) {
			fetchAnalytics();
		}
	});
</script>

<div class="space-y-6">
	{#if isLoading}
		<div class="grid gap-4 md:grid-cols-2">
			{#each Array(4) as _, i (i)}
				<Card>
					<CardHeader>
						<div class="h-5 w-32 animate-pulse rounded bg-gray-200" />
						<div class="mt-2 h-4 w-48 animate-pulse rounded bg-gray-200" />
					</CardHeader>
					<CardContent>
						<div class="h-24 animate-pulse rounded bg-gray-200" />
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else if !analytics}
		<Card>
			<CardContent class="pt-6 text-center">
				<BarChart3 class="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
				<p class="text-muted-foreground">Aucune donnée d'analyse disponible</p>
			</CardContent>
		</Card>
	{:else}
		<!-- Engagement Metrics -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-sm font-medium">Taux d'engagement</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						class={`text-2xl font-bold ${getEngagementColor(analytics.engagement.percentageActive)}`}
					>
						{analytics.engagement.percentageActive}%
					</div>
					<Progress value={analytics.engagement.percentageActive} class="mt-2 h-2" />
					<p class="mt-2 text-xs text-muted-foreground">
						{analytics.engagement.activeTraders}/{analytics.engagement.totalStudents} élèves actifs
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-sm font-medium">Moy. annonces/élève</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{analytics.engagement.averageListingsPerStudent.toFixed(1)}
					</div>
					<p class="mt-2 text-xs text-muted-foreground">Par élève actif</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-sm font-medium">Moy. échanges/élève</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">
						{analytics.engagement.averageTradesPerStudent.toFixed(1)}
					</div>
					<p class="mt-2 text-xs text-muted-foreground">Par élève actif</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-sm font-medium">Temps d'acceptation</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="flex items-baseline gap-1">
						<div class="text-2xl font-bold">
							{analytics.temporal.averageTimeToAcceptanceHours}
						</div>
						<span class="text-sm text-muted-foreground">heures</span>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">Temps moyen avant acceptation</p>
				</CardContent>
			</Card>
		</div>

		<!-- Economic Metrics -->
		<Card>
			<CardHeader>
				<CardTitle>Économie du marché</CardTitle>
				<CardDescription>Flux de gidouilles et valeurs d'échange</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4 md:grid-cols-3">
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<Coins class="h-4 w-4 text-yellow-500" />
							<span class="text-sm font-medium">Total en circulation</span>
						</div>
						<p class="text-2xl font-bold">
							{formatNumber(analytics.economic.totalGidouillesCirculated)}
						</p>
					</div>

					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<TrendingUp class="h-4 w-4 text-green-500" />
							<span class="text-sm font-medium">Moyenne/échange</span>
						</div>
						<p class="text-2xl font-bold">
							{formatNumber(analytics.economic.averageGidouillesPerTrade)}
						</p>
					</div>

					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<Award class="h-4 w-4 text-purple-500" />
							<span class="text-sm font-medium">Plus grosse transaction</span>
						</div>
						<p class="text-2xl font-bold">{formatNumber(analytics.economic.largestTransaction)}</p>
					</div>
				</div>

				{#if analytics.economic.mostExpensiveListings.length > 0}
					<div class="mt-6">
						<h4 class="mb-3 text-sm font-medium">Annonces les plus chères</h4>
						<div class="space-y-2">
							{#each analytics.economic.mostExpensiveListings as listing (listing.id)}
								<div class="flex items-center justify-between rounded-lg bg-muted/50 p-2">
									<span class="flex-1 truncate text-sm">{listing.title}</span>
									<Badge variant="secondary">
										{formatNumber(listing.gidouilles)} gidouilles
									</Badge>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Cards Metrics -->
		<div class="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Cartes les plus échangées</CardTitle>
					<CardDescription>Top des cartes par nombre d'échanges</CardDescription>
				</CardHeader>
				<CardContent>
					{#if analytics.cards.mostTradedCards.length > 0}
						<div class="space-y-3">
							{#each analytics.cards.mostTradedCards as card, index (`${card.template_id}-${index}`)}
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
											<span class="text-sm font-semibold">{index + 1}</span>
										</div>
										<span class="text-sm font-medium">{card.name}</span>
									</div>
									<Badge variant="outline">{card.count} échanges</Badge>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">Aucune carte échangée</p>
					{/if}

					<div class="mt-4 border-t pt-4">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p class="text-muted-foreground">Total cartes</p>
								<p class="font-semibold">{formatNumber(analytics.cards.totalCardsTraded)}</p>
							</div>
							<div>
								<p class="text-muted-foreground">Cartes uniques</p>
								<p class="font-semibold">{formatNumber(analytics.cards.uniqueCardsTraded)}</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Temporal Analytics -->
			<Card>
				<CardHeader>
					<CardTitle>Activité dans le temps</CardTitle>
					<CardDescription>Évolution des échanges et annonces</CardDescription>
				</CardHeader>
				<CardContent>
					{#if analytics.temporal.tradesOverTime.length > 0}
						<div class="space-y-4">
							<div>
								<h4 class="mb-2 text-sm font-medium">Échanges par jour</h4>
								<div class="h-[150px] w-full">
									{@html createLineChart(analytics.temporal.tradesOverTime)}
								</div>
							</div>

							{#if analytics.temporal.peakHours.length > 0}
								<div>
									<h4 class="mb-2 text-sm font-medium">Heures de pointe</h4>
									<div class="h-[100px] w-full">
										{@html createBarChart(analytics.temporal.peakHours)}
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">
							Pas assez de données pour afficher les tendances
						</p>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
