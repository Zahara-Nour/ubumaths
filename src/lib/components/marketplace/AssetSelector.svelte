<script lang="ts">
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import { shopStore } from '$lib/stores/shop.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { CreditCard, Package, Check, AlertCircle } from 'lucide-svelte';
	import type { ShopItemRarity } from '$lib/types/shop';

	// Props
	let {
		selectedCardIds = $bindable([]),
		selectedItemIds = $bindable([]),
		maxCards = 5,
		maxItems = 10,
		mode = 'both' // 'cards-only', 'items-only', 'both'
	} = $props<{
		selectedCardIds?: string[];
		selectedItemIds?: string[];
		maxCards?: number;
		maxItems?: number;
		mode?: 'cards-only' | 'items-only' | 'both';
	}>();

	// State
	let activeTab = $state(mode === 'items-only' ? 'items' : 'cards');

	// Get available cards and items
	let availableCards = $derived(
		marketplaceStore.myVipCards.filter(
			(card) => !card.locked_for_listing_id && !card.locked_for_trade_id
		)
	);

	let availableItems = $derived(
		shopStore.inventory.filter(
			(item) =>
				item.template.is_tradeable &&
				!item.locked_for_listing_id &&
				!item.locked_for_trade_id &&
				!item.is_equipped
		)
	);

	// Toggle card selection
	function toggleCard(cardId: string) {
		if (selectedCardIds.includes(cardId)) {
			selectedCardIds = selectedCardIds.filter((id: string) => id !== cardId);
		} else {
			if (selectedCardIds.length >= maxCards) {
				return;
			}
			selectedCardIds = [...selectedCardIds, cardId];
		}
	}

	// Toggle item selection
	function toggleItem(itemId: string) {
		if (selectedItemIds.includes(itemId)) {
			selectedItemIds = selectedItemIds.filter((id: string) => id !== itemId);
		} else {
			if (selectedItemIds.length >= maxItems) {
				return;
			}
			selectedItemIds = [...selectedItemIds, itemId];
		}
	}

	// Get rarity color
	function getRarityColor(rarity: string): string {
		switch (rarity) {
			case 'common':
				return 'bg-gray-500';
			case 'uncommon':
				return 'bg-green-500';
			case 'rare':
				return 'bg-blue-500';
			case 'epic':
				return 'bg-purple-500';
			case 'legendary':
				return 'bg-orange-500';
			default:
				return 'bg-gray-500';
		}
	}

	// Get category icon
	function getCategoryIcon(category: string) {
		switch (category) {
			case 'consumable':
				return '🧪';
			case 'booster':
				return '⚡';
			case 'cosmetic':
				return '✨';
			case 'utility':
				return '🔧';
			default:
				return '📦';
		}
	}
</script>

<div class="space-y-4">
	<!-- Header with counts -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold">Sélectionnez vos objets</h3>
		<div class="flex gap-2">
			{#if mode !== 'items-only'}
				<Badge variant="outline">
					Cartes: {selectedCardIds.length}/{maxCards}
				</Badge>
			{/if}
			{#if mode !== 'cards-only'}
				<Badge variant="outline">
					Articles: {selectedItemIds.length}/{maxItems}
				</Badge>
			{/if}
		</div>
	</div>

	{#if mode === 'both'}
		<!-- Tabs for cards and items -->
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="cards" class="gap-2">
					<CreditCard class="h-4 w-4" />
					Cartes VIP ({availableCards.length})
				</Tabs.Trigger>
				<Tabs.Trigger value="items" class="gap-2">
					<Package class="h-4 w-4" />
					Articles ({availableItems.length})
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="cards" class="mt-4">
				<ScrollArea class="h-96">
					{#if availableCards.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<CreditCard class="h-12 w-12 text-muted-foreground" />
							<p class="mt-2 text-sm text-muted-foreground">
								Aucune carte VIP disponible pour l'échange
							</p>
						</div>
					{:else}
						<div class="grid gap-2 p-1">
							{#each availableCards as card (card.id)}
								{@const isSelected = selectedCardIds.includes(card.id)}
								{@const rarity = card.template?.rarity || 'common'}
								<button
									onclick={() => toggleCard(card.id)}
									disabled={!isSelected && selectedCardIds.length >= maxCards}
									class="relative overflow-hidden rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 {isSelected
										? 'border-primary ring-2 ring-primary'
										: 'border-border'}"
								>
									<!-- Rarity indicator -->
									<div class="{getRarityColor(rarity)} absolute top-0 left-0 h-1 w-full"></div>

									<!-- Selection indicator -->
									{#if isSelected}
										<div class="absolute top-2 right-2">
											<div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
												<Check class="h-4 w-4 text-primary-foreground" />
											</div>
										</div>
									{/if}

									<div class="pr-8">
										<div class="font-medium">
											{card.template?.name || 'Carte inconnue'}
										</div>
										<div class="mt-1 flex items-center gap-2">
											<Badge variant="secondary" class="text-xs">
												{card.template?.rarity || 'common'}
											</Badge>
											{#if card.template?.seasonal_event}
												<Badge variant="outline" class="text-xs">
													{card.template.seasonal_event}
												</Badge>
											{/if}
										</div>
										{#if card.custom_name}
											<p class="mt-1 text-xs text-muted-foreground italic">
												"{card.custom_name}"
											</p>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</ScrollArea>
			</Tabs.Content>

			<Tabs.Content value="items" class="mt-4">
				<ScrollArea class="h-96">
					{#if availableItems.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<Package class="h-12 w-12 text-muted-foreground" />
							<p class="mt-2 text-sm text-muted-foreground">
								Aucun article disponible pour l'échange
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Les articles équipés ou non échangeables ne peuvent pas être sélectionnés
							</p>
						</div>
					{:else}
						<div class="grid gap-2 p-1">
							{#each availableItems as item (item.id)}
								{@const isSelected = selectedItemIds.includes(item.id)}
								{@const rarity = item.template.rarity as ShopItemRarity}
								<button
									onclick={() => toggleItem(item.id)}
									disabled={!isSelected && selectedItemIds.length >= maxItems}
									class="relative overflow-hidden rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 {isSelected
										? 'border-primary ring-2 ring-primary'
										: 'border-border'}"
								>
									<!-- Rarity indicator -->
									<div class="{getRarityColor(rarity)} absolute top-0 left-0 h-1 w-full"></div>

									<!-- Selection indicator -->
									{#if isSelected}
										<div class="absolute top-2 right-2">
											<div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
												<Check class="h-4 w-4 text-primary-foreground" />
											</div>
										</div>
									{/if}

									<div class="flex gap-3 pr-8">
										<!-- Icon -->
										<div class="flex h-12 w-12 items-center justify-center rounded bg-muted">
											{#if item.template.icon_url}
												<img
													src={item.template.icon_url}
													alt={item.template.display_name}
													class="h-full w-full object-contain"
												/>
											{:else}
												<span class="text-xl">{getCategoryIcon(item.template.category)}</span>
											{/if}
										</div>

										<!-- Info -->
										<div class="flex-1">
											<div class="font-medium">
												{item.template.display_name}
											</div>
											<div class="mt-1 flex items-center gap-2">
												<Badge variant="secondary" class="text-xs">
													{rarity}
												</Badge>
												{#if item.quantity && item.quantity > 1}
													<Badge variant="outline" class="text-xs">
														×{item.quantity}
													</Badge>
												{/if}
												{#if item.uses_remaining !== null}
													<Badge variant="outline" class="text-xs">
														{item.uses_remaining} usages
													</Badge>
												{/if}
											</div>
											{#if item.instance_data?.custom_name}
												<p class="mt-1 text-xs text-muted-foreground italic">
													"{item.instance_data.custom_name}"
												</p>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</ScrollArea>
			</Tabs.Content>
		</Tabs.Root>
	{:else if mode === 'cards-only'}
		<!-- Cards only -->
		<ScrollArea class="h-96">
			<!-- Same cards content as above -->
			{#if availableCards.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<CreditCard class="h-12 w-12 text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">
						Aucune carte VIP disponible pour l'échange
					</p>
				</div>
			{:else}
				<div class="grid gap-2 p-1">
					{#each availableCards as card (card.id)}
						{@const isSelected = selectedCardIds.includes(card.id)}
						{@const rarity = card.template?.rarity || 'common'}
						<button
							onclick={() => toggleCard(card.id)}
							disabled={!isSelected && selectedCardIds.length >= maxCards}
							class="relative overflow-hidden rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 {isSelected
								? 'border-primary ring-2 ring-primary'
								: 'border-border'}"
						>
							<!-- Same card content as above -->
							<div class="{getRarityColor(rarity)} absolute top-0 left-0 h-1 w-full"></div>
							{#if isSelected}
								<div class="absolute top-2 right-2">
									<div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
										<Check class="h-4 w-4 text-primary-foreground" />
									</div>
								</div>
							{/if}
							<div class="pr-8">
								<div class="font-medium">
									{card.template?.name || 'Carte inconnue'}
								</div>
								<div class="mt-1 flex items-center gap-2">
									<Badge variant="secondary" class="text-xs">
										{card.template?.rarity || 'common'}
									</Badge>
									{#if card.template?.seasonal_event}
										<Badge variant="outline" class="text-xs">
											{card.template.seasonal_event}
										</Badge>
									{/if}
								</div>
								{#if card.custom_name}
									<p class="mt-1 text-xs text-muted-foreground italic">
										"{card.custom_name}"
									</p>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</ScrollArea>
	{:else}
		<!-- Items only -->
		<ScrollArea class="h-96">
			<!-- Same items content as above -->
			{#if availableItems.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<Package class="h-12 w-12 text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">Aucun article disponible pour l'échange</p>
					<p class="mt-1 text-xs text-muted-foreground">
						Les articles équipés ou non échangeables ne peuvent pas être sélectionnés
					</p>
				</div>
			{:else}
				<div class="grid gap-2 p-1">
					{#each availableItems as item (item.id)}
						{@const isSelected = selectedItemIds.includes(item.id)}
						{@const rarity = item.template.rarity as ShopItemRarity}
						<button
							onclick={() => toggleItem(item.id)}
							disabled={!isSelected && selectedItemIds.length >= maxItems}
							class="relative overflow-hidden rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 {isSelected
								? 'border-primary ring-2 ring-primary'
								: 'border-border'}"
						>
							<div class="{getRarityColor(rarity)} absolute top-0 left-0 h-1 w-full"></div>
							{#if isSelected}
								<div class="absolute top-2 right-2">
									<div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
										<Check class="h-4 w-4 text-primary-foreground" />
									</div>
								</div>
							{/if}
							<div class="flex gap-3 pr-8">
								<div class="flex h-12 w-12 items-center justify-center rounded bg-muted">
									{#if item.template.icon_url}
										<img
											src={item.template.icon_url}
											alt={item.template.display_name}
											class="h-full w-full object-contain"
										/>
									{:else}
										<span class="text-xl">{getCategoryIcon(item.template.category)}</span>
									{/if}
								</div>
								<div class="flex-1">
									<div class="font-medium">
										{item.template.display_name}
									</div>
									<div class="mt-1 flex items-center gap-2">
										<Badge variant="secondary" class="text-xs">
											{rarity}
										</Badge>
										{#if item.quantity && item.quantity > 1}
											<Badge variant="outline" class="text-xs">
												×{item.quantity}
											</Badge>
										{/if}
										{#if item.uses_remaining !== null}
											<Badge variant="outline" class="text-xs">
												{item.uses_remaining} usages
											</Badge>
										{/if}
									</div>
									{#if item.instance_data?.custom_name}
										<p class="mt-1 text-xs text-muted-foreground italic">
											"{item.instance_data.custom_name}"
										</p>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</ScrollArea>
	{/if}

	<!-- Warning if at limit -->
	{#if (mode !== 'items-only' && selectedCardIds.length >= maxCards) || (mode !== 'cards-only' && selectedItemIds.length >= maxItems)}
		<div class="bg-warning/10 flex items-center gap-2 rounded-lg p-3">
			<AlertCircle class="text-warning h-4 w-4" />
			<span class="text-warning text-sm">
				{#if selectedCardIds.length >= maxCards && selectedItemIds.length >= maxItems}
					Limite atteinte pour les cartes et les articles
				{:else if selectedCardIds.length >= maxCards}
					Limite de {maxCards} cartes atteinte
				{:else}
					Limite de {maxItems} articles atteinte
				{/if}
			</span>
		</div>
	{/if}
</div>
