<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { TrendingUp, Package, Coins, CheckCircle, XCircle, Clock, Trophy } from 'lucide-svelte';

	interface Stats {
		period: string;
		totalTrades: number;
		completedTrades: number;
		cancelledTrades: number;
		negotiatingTrades?: number;
		activeListings: number;
		totalGidouillesTraded: number;
		totalCardsTraded: number;
		topTraders: Array<{
			student_id: string;
			username: string;
			trade_count: number;
		}>;
		averageGidouillesPerTrade: number;
		averageCardsPerTrade: number;
	}

	let { stats, period }: { stats: Stats; period: string } = $props();

	// Calculate success rate
	let successRate = $derived(
		stats.totalTrades > 0 ? Math.round((stats.completedTrades / stats.totalTrades) * 100) : 0
	);

	// Format numbers
	function formatNumber(num: number): string {
		return num.toLocaleString('fr-FR');
	}

	// Get period label
	function getPeriodLabel(period: string): string {
		switch (period) {
			case 'day':
				return "aujourd'hui";
			case 'week':
				return 'cette semaine';
			case 'month':
				return 'ce mois';
			default:
				return '';
		}
	}

	// Get status color
	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'cancelled':
				return 'bg-red-100 text-red-800';
			case 'negotiating':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
	<!-- Total Trades Card -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle class="text-sm font-medium">Échanges totaux</CardTitle>
			<TrendingUp class="h-4 w-4 text-muted-foreground" />
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold">{formatNumber(stats.totalTrades)}</div>
			<p class="text-xs text-muted-foreground">
				{getPeriodLabel(period)}
			</p>
			<div class="mt-2 flex gap-2">
				<Badge class={getStatusColor('completed')} variant="secondary">
					{stats.completedTrades} terminés
				</Badge>
				{#if stats.negotiatingTrades}
					<Badge class={getStatusColor('negotiating')} variant="secondary">
						{stats.negotiatingTrades} en cours
					</Badge>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Active Listings Card -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle class="text-sm font-medium">Annonces actives</CardTitle>
			<Package class="h-4 w-4 text-muted-foreground" />
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold">{formatNumber(stats.activeListings)}</div>
			<p class="text-xs text-muted-foreground">En attente de propositions</p>
			<div class="mt-3">
				<Progress value={successRate} class="h-2" />
				<p class="mt-1 text-xs text-muted-foreground">
					{successRate}% de taux de réussite
				</p>
			</div>
		</CardContent>
	</Card>

	<!-- Gidouilles Traded Card -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle class="text-sm font-medium">Gidouilles échangées</CardTitle>
			<Coins class="h-4 w-4 text-muted-foreground" />
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold">{formatNumber(stats.totalGidouillesTraded)}</div>
			<p class="text-xs text-muted-foreground">
				Total {getPeriodLabel(period)}
			</p>
			<div class="mt-2">
				<div class="flex justify-between text-xs">
					<span class="text-muted-foreground">Moyenne/échange:</span>
					<span class="font-medium">{formatNumber(stats.averageGidouillesPerTrade)}</span>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Cards Traded Card -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle class="text-sm font-medium">Cartes échangées</CardTitle>
			<Package class="h-4 w-4 text-muted-foreground" />
		</CardHeader>
		<CardContent>
			<div class="text-2xl font-bold">{formatNumber(stats.totalCardsTraded)}</div>
			<p class="text-xs text-muted-foreground">
				Total {getPeriodLabel(period)}
			</p>
			<div class="mt-2">
				<div class="flex justify-between text-xs">
					<span class="text-muted-foreground">Moyenne/échange:</span>
					<span class="font-medium">{stats.averageCardsPerTrade.toFixed(1)}</span>
				</div>
			</div>
		</CardContent>
	</Card>
</div>

<!-- Top Traders Section -->
{#if stats.topTraders && stats.topTraders.length > 0}
	<Card class="mt-4">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Trophy class="h-5 w-5 text-yellow-500" />
				Élèves les plus actifs
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-3">
				{#each stats.topTraders as trader, index (`${trader.student_id}-${index}`)}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
								<span class="text-sm font-semibold">{index + 1}</span>
							</div>
							<div>
								<p class="text-sm font-medium">{trader.username}</p>
							</div>
						</div>
						<Badge variant="secondary">
							{trader.trade_count} échange{trader.trade_count > 1 ? 's' : ''}
						</Badge>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>
{/if}

<!-- Trade Status Breakdown -->
<Card class="mt-4">
	<CardHeader>
		<CardTitle>Répartition des échanges</CardTitle>
	</CardHeader>
	<CardContent>
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<CheckCircle class="h-4 w-4 text-green-500" />
					<span class="text-sm">Terminés</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{stats.completedTrades}</span>
					<Progress
						value={(stats.completedTrades / Math.max(stats.totalTrades, 1)) * 100}
						class="h-2 w-24"
					/>
				</div>
			</div>

			{#if stats.negotiatingTrades}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Clock class="h-4 w-4 text-yellow-500" />
						<span class="text-sm">En négociation</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">{stats.negotiatingTrades}</span>
						<Progress
							value={(stats.negotiatingTrades / Math.max(stats.totalTrades, 1)) * 100}
							class="h-2 w-24"
						/>
					</div>
				</div>
			{/if}

			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<XCircle class="h-4 w-4 text-red-500" />
					<span class="text-sm">Annulés</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{stats.cancelledTrades}</span>
					<Progress
						value={(stats.cancelledTrades / Math.max(stats.totalTrades, 1)) * 100}
						class="h-2 w-24"
					/>
				</div>
			</div>
		</div>
	</CardContent>
</Card>
