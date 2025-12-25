<script lang="ts" module>
	function getDateFromPeriod(period: string): string {
		let dateFrom = new Date();

		switch (period) {
			case 'day':
				dateFrom.setHours(0, 0, 0, 0);
				break;
			case 'week':
				dateFrom.setDate(dateFrom.getDate() - 7);
				dateFrom.setHours(0, 0, 0, 0);
				break;
			case 'month':
				dateFrom.setMonth(dateFrom.getMonth() - 1);
				dateFrom.setHours(0, 0, 0, 0);
				break;
		}

		return dateFrom.toISOString();
	}
</script>

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import MySelect from '$lib/components/MySelect.svelte';
	import MarketplaceStats from '$lib/components/marketplace/teacher/MarketplaceStats.svelte';
	import TradeHistoryTable from '$lib/components/marketplace/teacher/TradeHistoryTable.svelte';
	import ActivityFeed from '$lib/components/marketplace/teacher/ActivityFeed.svelte';
	import ListingsMonitor from '$lib/components/marketplace/teacher/ListingsMonitor.svelte';
	import MarketplaceAnalytics from '$lib/components/marketplace/teacher/MarketplaceAnalytics.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		RefreshCw,
		Settings,
		TrendingUp,
		Activity,
		Package,
		BarChart3,
		ArrowLeftRight
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// State
	let selectedClassId = $state(data.selectedClassId || '');
	let selectedPeriod = $state(data.period);
	let isLoading = $state(false);
	let activeTab = $state('overview');

	// Derived values
	let classOptions = $derived([
		{ value: '', label: 'Toutes les classes' },
		...data.teacherClasses.map((c) => ({
			value: c.id,
			label: c.name
		}))
	]);

	let periodOptions = $derived([
		{ value: 'day', label: "Aujourd'hui" },
		{ value: 'week', label: 'Cette semaine' },
		{ value: 'month', label: 'Ce mois' }
	]);

	// Handle filter changes
	async function handleClassChange() {
		const url = new URL($page.url);
		if (selectedClassId) {
			url.searchParams.set('class_id', selectedClassId);
		} else {
			url.searchParams.delete('class_id');
		}
		await goto(url.toString());
	}

	async function handlePeriodChange() {
		const url = new URL($page.url);
		url.searchParams.set('period', selectedPeriod);
		await goto(url.toString());
	}

	// Refresh data
	async function refreshData() {
		isLoading = true;
		try {
			await goto($page.url.toString(), { invalidateAll: true });
			toaster.success('Données actualisées');
		} catch (err) {
			console.error('Error refreshing data:', err);
			toaster.error("Erreur lors de l'actualisation");
		} finally {
			isLoading = false;
		}
	}

	// Navigate to settings
	function goToSettings() {
		goto('/dashboard/teacher/classes');
	}

	// Format number with spaces as thousands separator
	function formatNumber(num: number): string {
		return num.toLocaleString('fr-FR');
	}

	// Update selected values when data changes
	$effect(() => {
		selectedClassId = data.selectedClassId || '';
		selectedPeriod = data.period;
	});
</script>

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Marché d'échange</h1>
			<p class="text-muted-foreground">Surveillez et gérez les échanges de vos élèves</p>
		</div>
		<div class="flex gap-2">
			<Button onclick={refreshData} variant="outline" disabled={isLoading}>
				<RefreshCw class={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
				Actualiser
			</Button>
			<Button onclick={goToSettings} variant="outline">
				<Settings class="mr-2 h-4 w-4" />
				Paramètres
			</Button>
		</div>
	</div>

	<!-- Status Card -->
	<Card>
		<CardHeader class="pb-3">
			<div class="flex items-center justify-between">
				<CardTitle class="text-lg">État du marché</CardTitle>
				{#if data.marketplaceConfig.is_enabled}
					<Badge class="bg-green-100 text-green-800">Activé</Badge>
				{:else}
					<Badge variant="secondary">Désactivé</Badge>
				{/if}
			</div>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
				<div>
					<span class="text-muted-foreground">Nombre d'élèves:</span>
					<span class="ml-2 font-semibold">{formatNumber(data.studentCount)}</span>
				</div>
				<div>
					<span class="text-muted-foreground">Max annonces/élève:</span>
					<span class="ml-2 font-semibold">{data.marketplaceConfig.max_listings_per_student}</span>
				</div>
				<div>
					<span class="text-muted-foreground">Max échanges/jour:</span>
					<span class="ml-2 font-semibold">{data.marketplaceConfig.max_trades_per_day}</span>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Filters -->
	<Card>
		<CardContent class="pt-6">
			<div class="flex flex-wrap gap-4">
				<div class="min-w-[200px] flex-1">
					<label for="class-filter" class="mb-1 block text-sm font-medium">Classe</label>
					<MySelect
						type="single"
						bind:value={selectedClassId}
						items={classOptions}
						onchange={handleClassChange}
					/>
				</div>
				<div class="min-w-[200px] flex-1">
					<label for="period-filter" class="mb-1 block text-sm font-medium">Période</label>
					<MySelect
						type="single"
						bind:value={selectedPeriod}
						items={periodOptions}
						onchange={handlePeriodChange}
					/>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Main Content Tabs -->
	<Tabs bind:value={activeTab} class="space-y-4">
		<TabsList class="flex h-auto w-full flex-wrap justify-center gap-1">
			<TabsTrigger value="overview" class="flex items-center gap-1">
				<TrendingUp class="h-4 w-4" />
				<span class="hidden sm:inline">Vue d'ensemble</span>
			</TabsTrigger>
			<TabsTrigger value="activity" class="flex items-center gap-1">
				<Activity class="h-4 w-4" />
				<span class="hidden sm:inline">Activité</span>
			</TabsTrigger>
			<TabsTrigger value="trades" class="flex items-center gap-1">
				<ArrowLeftRight class="h-4 w-4" />
				<span class="hidden sm:inline">Échanges</span>
			</TabsTrigger>
			<TabsTrigger value="listings" class="flex items-center gap-1">
				<Package class="h-4 w-4" />
				<span class="hidden sm:inline">Annonces</span>
			</TabsTrigger>
			<TabsTrigger value="analytics" class="flex items-center gap-1">
				<BarChart3 class="h-4 w-4" />
				<span class="hidden sm:inline">Analyses</span>
			</TabsTrigger>
		</TabsList>

		<!-- Overview Tab -->
		<TabsContent value="overview" class="space-y-4">
			{#if data.stats}
				<MarketplaceStats stats={data.stats} period={selectedPeriod} />
			{:else}
				<Card>
					<CardContent class="pt-6">
						<p class="text-center text-muted-foreground">
							Aucune statistique disponible pour la période sélectionnée
						</p>
					</CardContent>
				</Card>
			{/if}

			<!-- Recent Activity Preview -->
			<Card>
				<CardHeader>
					<CardTitle>Activité récente</CardTitle>
					<CardDescription>Les derniers événements du marché</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data.recentActivity && data.recentActivity.length > 0}
						<ActivityFeed activities={data.recentActivity.slice(0, 5)} compact={true} />
						<div class="mt-4 text-center">
							<Button variant="outline" size="sm" onclick={() => (activeTab = 'activity')}>
								Voir toute l'activité
							</Button>
						</div>
					{:else}
						<p class="py-4 text-center text-muted-foreground">Aucune activité récente</p>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Activity Tab -->
		<TabsContent value="activity" class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Fil d'activité</CardTitle>
					<CardDescription>Tous les événements récents du marché</CardDescription>
				</CardHeader>
				<CardContent>
					<ActivityFeed classId={selectedClassId} limit={50} />
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Trades Tab -->
		<TabsContent value="trades" class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Historique des échanges</CardTitle>
					<CardDescription>Consultez tous les échanges entre élèves</CardDescription>
				</CardHeader>
				<CardContent>
					<TradeHistoryTable classId={selectedClassId} />
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Listings Tab -->
		<TabsContent value="listings" class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Annonces actives</CardTitle>
					<CardDescription>Surveillez les annonces créées par vos élèves</CardDescription>
				</CardHeader>
				<CardContent>
					<ListingsMonitor classId={selectedClassId} />
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Analytics Tab -->
		<TabsContent value="analytics" class="space-y-4">
			<MarketplaceAnalytics
				classId={selectedClassId}
				dateFrom={getDateFromPeriod(selectedPeriod)}
			/>
		</TabsContent>
	</Tabs>
</div>
