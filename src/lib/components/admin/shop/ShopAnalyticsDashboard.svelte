<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Package, ShoppingCart, Users, TrendingUp, Clock } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		analytics: {
			overview: {
				total_items: number;
				active_items: number;
				total_purchases: number;
				total_revenue: number;
				items_sold: number;
				unique_buyers: number;
			};
			items_by_category: Record<string, number>;
			items_by_rarity: Record<string, number>;
			top_selling_items: Array<{
				template_id: string;
				display_name: string;
				category: string;
				rarity: string;
				icon_url: string | null;
				total_sales: number;
				total_revenue: number;
				units_sold: number;
			}>;
			recent_purchases: Array<{
				id: string;
				purchased_at: string;
				quantity: number;
				total_price: number;
				student: {
					id: string;
					username: string;
					avatar_url: string | null;
				};
				item: {
					display_name: string;
					category: string;
					rarity: string;
					icon_url: string | null;
				};
			}>;
			daily_revenue: Array<{
				date: string;
				revenue: number;
				purchases: number;
			}>;
		};
	}

	let { analytics }: Props = $props();

	// Format number with thousands separator
	function formatNumber(num: number): string {
		return num.toLocaleString('fr-FR');
	}

	// Format date
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short'
		});
	}

	// Format relative time
	function formatRelativeTime(dateStr: string): string {
		const now = Date.now();
		const date = new Date(dateStr).getTime();
		const diff = now - date;

		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return "À l'instant";
		if (minutes < 60) return `Il y a ${minutes} min`;
		if (hours < 24) return `Il y a ${hours}h`;
		if (days < 7) return `Il y a ${days}j`;

		return new Date(dateStr).toLocaleDateString('fr-FR');
	}

	// Category labels
	const categoryLabels: Record<string, string> = {
		consumable: 'Consommables',
		booster: 'Boosters',
		cosmetic: 'Cosmétiques',
		utility: 'Utilitaires'
	};

	// Rarity labels and colors
	const rarityConfig: Record<string, { label: string; color: string }> = {
		common: { label: 'Commun', color: 'bg-gray-100 text-gray-800' },
		uncommon: { label: 'Peu commun', color: 'bg-green-100 text-green-800' },
		rare: { label: 'Rare', color: 'bg-blue-100 text-blue-800' },
		epic: { label: 'Épique', color: 'bg-purple-100 text-purple-800' },
		legendary: { label: 'Légendaire', color: 'bg-yellow-100 text-yellow-800' }
	};

	// Calculate max revenue for chart scaling
	const maxRevenue = $derived(Math.max(...analytics.daily_revenue.map((d) => d.revenue), 1));
</script>

<div class="space-y-6">
	<!-- Overview Stats -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Articles actifs</Card.Title>
				<Package class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{analytics.overview.active_items}</div>
				<p class="text-xs text-muted-foreground">
					sur {analytics.overview.total_items} au total
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Ventes (30j)</Card.Title>
				<ShoppingCart class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{formatNumber(analytics.overview.total_purchases)}</div>
				<p class="text-xs text-muted-foreground">
					{formatNumber(analytics.overview.items_sold)} articles vendus
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Revenus (30j)</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{formatNumber(analytics.overview.total_revenue)}</div>
				<p class="text-xs text-muted-foreground">gidouilles</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Acheteurs uniques</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{formatNumber(analytics.overview.unique_buyers)}</div>
				<p class="text-xs text-muted-foreground">élèves actifs</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Charts Row -->
	<div class="grid gap-4 md:grid-cols-2">
		<!-- Revenue Chart -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Revenus quotidiens</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#each analytics.daily_revenue as day (day.date)}
						<div class="flex items-center gap-2">
							<span class="w-16 text-xs text-muted-foreground">
								{formatDate(day.date)}
							</span>
							<div class="flex-1">
								<div
									class="h-6 rounded bg-primary transition-all"
									style="width: {(day.revenue / maxRevenue) * 100}%"
								></div>
							</div>
							<span class="w-20 text-right text-xs font-medium">
								{formatNumber(day.revenue)} g
							</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Categories & Rarities -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Répartition des articles</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- By Category -->
				<div>
					<p class="mb-2 text-sm font-medium">Par catégorie</p>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(analytics.items_by_category) as [category, count] (category)}
							<Badge variant="secondary">
								{categoryLabels[category] || category}: {count}
							</Badge>
						{/each}
					</div>
				</div>

				<!-- By Rarity -->
				<div>
					<p class="mb-2 text-sm font-medium">Par rareté</p>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(analytics.items_by_rarity) as [rarity, count] (rarity)}
							{@const config = rarityConfig[rarity]}
							<Badge class={cn('text-xs', config?.color || '')}>
								{config?.label || rarity}: {count}
							</Badge>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Top Selling Items -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Articles les plus vendus</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each analytics.top_selling_items as item (item.template_id)}
					{@const config = rarityConfig[item.rarity]}
					<div class="flex items-center gap-3">
						<span class="text-sm font-medium text-muted-foreground">
							#{analytics.top_selling_items.indexOf(item) + 1}
						</span>

						{#if item.icon_url}
							<img
								src={item.icon_url}
								alt={item.display_name}
								class="h-10 w-10 rounded object-cover"
							/>
						{:else}
							<div class="flex h-10 w-10 items-center justify-center rounded bg-muted">
								<Package class="h-5 w-5 text-muted-foreground" />
							</div>
						{/if}

						<div class="flex-1">
							<p class="font-medium">{item.display_name}</p>
							<div class="flex gap-2">
								<Badge variant="outline" class="text-xs">
									{categoryLabels[item.category] || item.category}
								</Badge>
								<Badge class={cn('text-xs', config?.color || '')}>
									{config?.label || item.rarity}
								</Badge>
							</div>
						</div>

						<div class="text-right">
							<p class="font-semibold">{formatNumber(item.total_revenue)} g</p>
							<p class="text-sm text-muted-foreground">
								{item.units_sold} vendus ({item.total_sales} ventes)
							</p>
						</div>
					</div>
				{/each}

				{#if analytics.top_selling_items.length === 0}
					<p class="text-center text-muted-foreground">Aucune vente pour la période sélectionnée</p>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Recent Purchases -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Achats récents</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each analytics.recent_purchases as purchase (purchase.id)}
					<div class="flex items-center gap-3">
						{#if purchase.student.avatar_url}
							<img
								src={purchase.student.avatar_url}
								alt={purchase.student.username}
								class="h-8 w-8 rounded-full"
							/>
						{:else}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
							>
								{purchase.student.username.charAt(0).toUpperCase()}
							</div>
						{/if}

						<div class="flex-1">
							<p class="text-sm">
								<span class="font-medium">{purchase.student.username}</span>
								a acheté
								<span class="font-medium">
									{purchase.quantity}× {purchase.item.display_name}
								</span>
							</p>
							<div class="flex items-center gap-2">
								<Clock class="h-3 w-3 text-muted-foreground" />
								<span class="text-xs text-muted-foreground">
									{formatRelativeTime(purchase.purchased_at)}
								</span>
							</div>
						</div>

						<div class="text-right">
							<p class="font-semibold">{formatNumber(purchase.total_price)} g</p>
						</div>
					</div>
				{/each}

				{#if analytics.recent_purchases.length === 0}
					<p class="text-center text-muted-foreground">Aucun achat récent</p>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
