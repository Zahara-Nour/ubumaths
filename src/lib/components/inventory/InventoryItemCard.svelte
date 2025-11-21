<script lang="ts">
	import { shopStore } from '$lib/stores/shop.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Package,
		Lock,
		Clock,
		Zap,
		Star,
		AlertTriangle,
		MoreVertical,
		Play,
		Pause
	} from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ItemUseButton from './ItemUseButton.svelte';
	import type { InventoryItemWithLockStatus, ShopItemRarity } from '$lib/types/shop';

	// Props
	let { item } = $props<{
		item: InventoryItemWithLockStatus;
	}>();

	// State
	let isEquipping = $state(false);

	// Get rarity info
	function getRarityInfo(rarity: ShopItemRarity) {
		switch (rarity) {
			case 'common':
				return { color: 'bg-gray-500', label: 'Commun' };
			case 'uncommon':
				return { color: 'bg-green-500', label: 'Peu commun' };
			case 'rare':
				return { color: 'bg-blue-500', label: 'Rare' };
			case 'epic':
				return { color: 'bg-purple-500', label: 'Épique' };
			case 'legendary':
				return { color: 'bg-orange-500', label: 'Légendaire' };
			default:
				return { color: 'bg-gray-500', label: 'Commun' };
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

	// Check if item is expiring soon
	function isExpiringSoon() {
		if (!item.expires_at) return false;
		const daysUntilExpiry = Math.ceil(
			(new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
	}

	// Get days until expiry
	function getDaysUntilExpiry() {
		if (!item.expires_at) return null;
		const days = Math.ceil(
			(new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		return days > 0 ? days : 0;
	}

	// Handle equip toggle
	async function handleEquipToggle() {
		isEquipping = true;
		await shopStore.toggleEquip(item.id, !item.is_equipped);
		isEquipping = false;
	}

	// Computed
	let rarityInfo = $derived(getRarityInfo(item.template.rarity as ShopItemRarity));
	let categoryIcon = $derived(getCategoryIcon(item.template.category));
	let isLocked = $derived(!!item.locked_for_listing_id || !!item.locked_for_trade_id);
	let canUse = $derived(
		item.template.category === 'consumable' &&
			!isLocked &&
			(!item.uses_remaining || item.uses_remaining > 0)
	);
	let canEquip = $derived(
		(item.template.category === 'cosmetic' || item.template.category === 'booster') && !isLocked
	);
	let expiringDays = $derived(getDaysUntilExpiry());
	let isExpiring = $derived(isExpiringSoon());
</script>

<Card class="group relative overflow-hidden transition-all hover:shadow-lg">
	<!-- Rarity banner -->
	<div class="{rarityInfo.color} absolute top-0 left-0 h-1 w-full"></div>

	<!-- Status badges -->
	<div class="absolute top-2 right-2 z-10 flex flex-col gap-1">
		{#if item.is_equipped}
			<Badge variant="default" class="gap-1">
				<Star class="h-3 w-3" />
				Équipé
			</Badge>
		{/if}
		{#if isLocked}
			<Badge variant="secondary" class="gap-1">
				<Lock class="h-3 w-3" />
				{item.lock_reason === 'in_listing' ? 'En vente' : 'En échange'}
			</Badge>
		{/if}
		{#if isExpiring}
			<Badge variant="warning" class="gap-1">
				<AlertTriangle class="h-3 w-3" />
				{expiringDays}j
			</Badge>
		{/if}
	</div>

	<CardContent class="p-4">
		<!-- Icon/Image -->
		<div class="mb-3 flex h-20 w-full items-center justify-center rounded-lg bg-muted">
			{#if item.template.icon_url}
				<img
					src={item.template.icon_url}
					alt={item.template.display_name}
					class="h-full w-full object-contain"
				/>
			{:else}
				<span class="text-3xl">{categoryIcon}</span>
			{/if}
		</div>

		<!-- Item name -->
		<h3 class="line-clamp-1 font-semibold">
			{item.template.display_name}
		</h3>

		<!-- Custom name if set -->
		{#if item.instance_data?.custom_name}
			<p class="text-sm text-muted-foreground italic">
				"{item.instance_data.custom_name}"
			</p>
		{/if}

		<!-- Category and rarity -->
		<div class="mt-2 flex gap-1">
			<Badge variant="secondary" class="text-xs">
				{rarityInfo.label}
			</Badge>
			<Badge variant="outline" class="text-xs">
				{item.template.category}
			</Badge>
		</div>

		<!-- Quantity and uses -->
		<div class="mt-3 flex items-center justify-between text-sm">
			{#if item.quantity && item.quantity > 1}
				<div class="flex items-center gap-1">
					<Package class="h-3 w-3" />
					<span>×{item.quantity}</span>
				</div>
			{/if}
			{#if item.uses_remaining !== null}
				<div class="flex items-center gap-1 text-muted-foreground">
					<Zap class="h-3 w-3" />
					<span>{item.uses_remaining} usages</span>
				</div>
			{/if}
		</div>

		<!-- Expiration warning -->
		{#if item.expires_at}
			{@const daysLeft = getDaysUntilExpiry()}
			{#if daysLeft !== null && daysLeft <= 7}
				<div
					class="bg-warning/10 text-warning mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs"
				>
					<Clock class="h-3 w-3" />
					{#if daysLeft === 0}
						Expire aujourd'hui
					{:else if daysLeft === 1}
						Expire demain
					{:else}
						Expire dans {daysLeft} jours
					{/if}
				</div>
			{/if}
		{/if}

		<!-- Actions -->
		<div class="mt-4 flex gap-2">
			{#if canUse}
				<ItemUseButton inventoryId={item.id} itemName={item.template.display_name} />
			{/if}

			{#if canEquip}
				<Button
					onclick={handleEquipToggle}
					disabled={isEquipping}
					size="sm"
					variant={item.is_equipped ? 'secondary' : 'default'}
					class="flex-1"
				>
					{#if isEquipping}
						<span class="animate-spin">⏳</span>
					{:else if item.is_equipped}
						<Pause class="mr-2 h-3 w-3" />
						Déséquiper
					{:else}
						<Play class="mr-2 h-3 w-3" />
						Équiper
					{/if}
				</Button>
			{/if}

			<!-- More options -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild let:builder>
					<Button builders={[builder]} size="icon" variant="ghost" class="h-8 w-8">
						<MoreVertical class="h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Item onclick={() => shopStore.selectInventoryItem(item)}>
						Voir les détails
					</DropdownMenu.Item>
					{#if !isLocked && item.template.is_tradeable}
						<DropdownMenu.Item>Mettre en vente</DropdownMenu.Item>
					{/if}
					{#if item.instance_data?.notes !== undefined}
						<DropdownMenu.Item>Ajouter une note</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</CardContent>
</Card>
