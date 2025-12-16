<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import type { ShopItemTemplate } from '$lib/types/shop';
	import {
		Pencil,
		Trash2,
		ToggleLeft,
		ToggleRight,
		Upload,
		MoreVertical,
		Package
	} from 'lucide-svelte';

	interface Props {
		item: ShopItemTemplate;
		isEnabled?: boolean;
		onToggle?: (enabled: boolean) => void;
		onEdit?: () => void;
		onDelete?: () => void;
		onUploadImage?: () => void;
	}

	let { item, isEnabled, onToggle, onEdit, onDelete, onUploadImage }: Props = $props();

	// Rarity colors
	const rarityColor = (rarity: string) => {
		switch (rarity) {
			case 'common':
				return 'bg-gray-100 text-gray-800';
			case 'uncommon':
				return 'bg-green-100 text-green-800';
			case 'rare':
				return 'bg-blue-100 text-blue-800';
			case 'epic':
				return 'bg-purple-100 text-purple-800';
			case 'legendary':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// Rarity label
	const rarityLabel = (rarity: string) => {
		switch (rarity) {
			case 'common':
				return 'Commun';
			case 'uncommon':
				return 'Peu commun';
			case 'rare':
				return 'Rare';
			case 'epic':
				return 'Épique';
			case 'legendary':
				return 'Légendaire';
			default:
				return rarity;
		}
	};

	// Category label
	const categoryLabel = (category: string) => {
		switch (category) {
			case 'consumable':
				return 'Consommable';
			case 'booster':
				return 'Booster';
			case 'cosmetic':
				return 'Cosmétique';
			case 'utility':
				return 'Utilitaire';
			default:
				return category;
		}
	};

	// Calculate final price
	const finalPrice = $derived(
		Math.floor(item.base_price * (1 - (item.discount_percentage || 0) / 100))
	);

	// Check if item is currently available
	const isAvailable = $derived.by(() => {
		const now = new Date();
		if (item.available_from && new Date(item.available_from) > now) {
			return false;
		}
		if (item.available_until && new Date(item.available_until) < now) {
			return false;
		}
		return true;
	});

	// Effective enabled state
	const effectiveEnabled = $derived(isEnabled ?? item.is_active);
</script>

<Card.Root
	class={cn(
		'relative overflow-hidden transition-all',
		!effectiveEnabled && 'opacity-60',
		!isAvailable && 'ring-2 ring-orange-200'
	)}
>
	{#if item.discount_percentage && item.discount_percentage > 0}
		<div
			class="absolute top-2 -right-8 rotate-45 bg-red-500 px-8 py-1 text-xs font-bold text-white"
		>
			-{item.discount_percentage}%
		</div>
	{/if}

	<Card.Header class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1 space-y-1">
				<Card.Title class="line-clamp-1 text-base">
					{item.display_name}
				</Card.Title>
				<div class="flex flex-wrap gap-1">
					<Badge variant="secondary" class={cn('text-xs', rarityColor(item.rarity))}>
						{rarityLabel(item.rarity)}
					</Badge>
					<Badge variant="outline" class="text-xs">
						{categoryLabel(item.category)}
					</Badge>
				</div>
			</div>

			{#if onEdit || onDelete || onUploadImage || onToggle}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon" class="h-8 w-8" aria-label="Actions de l'article">
								<MoreVertical class="h-4 w-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						{#if onToggle}
							<DropdownMenu.Item onclick={() => onToggle(!effectiveEnabled)}>
								{#if effectiveEnabled}
									<ToggleLeft class="mr-2 h-4 w-4" />
									Désactiver
								{:else}
									<ToggleRight class="mr-2 h-4 w-4" />
									Activer
								{/if}
							</DropdownMenu.Item>
						{/if}
						{#if onEdit}
							<DropdownMenu.Item onclick={onEdit}>
								<Pencil class="mr-2 h-4 w-4" />
								Modifier
							</DropdownMenu.Item>
						{/if}
						{#if onUploadImage}
							<DropdownMenu.Item onclick={onUploadImage}>
								<Upload class="mr-2 h-4 w-4" />
								Changer l'image
							</DropdownMenu.Item>
						{/if}
						{#if onDelete}
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={onDelete} class="text-destructive">
								<Trash2 class="mr-2 h-4 w-4" />
								Supprimer
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>
	</Card.Header>

	<Card.Content class="space-y-3">
		<!-- Image -->
		<div class="relative aspect-square overflow-hidden rounded-lg bg-muted">
			{#if item.icon_url}
				<img src={item.icon_url} alt={item.display_name} class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center">
					<Package class="h-12 w-12 text-muted-foreground" />
				</div>
			{/if}
		</div>

		<!-- Description -->
		{#if item.description}
			<p class="line-clamp-2 text-sm text-muted-foreground">
				{item.description}
			</p>
		{/if}

		<!-- Price -->
		<div class="flex items-baseline justify-between">
			<div class="flex items-baseline gap-2">
				{#if item.discount_percentage && item.discount_percentage > 0}
					<span class="text-sm text-muted-foreground line-through">
						{item.base_price}
					</span>
					<span class="text-lg font-bold text-green-600">
						{finalPrice}
					</span>
				{:else}
					<span class="text-lg font-bold">
						{item.base_price}
					</span>
				{/if}
				<span class="text-sm text-muted-foreground">gidouilles</span>
			</div>
		</div>

		<!-- Limits -->
		{#if item.max_owned_per_student || item.daily_purchase_limit || item.weekly_purchase_limit}
			<div class="space-y-1 border-t pt-2">
				<p class="text-xs font-medium text-muted-foreground">Limites:</p>
				<div class="flex flex-wrap gap-2">
					{#if item.max_owned_per_student}
						<Badge variant="outline" class="text-xs">
							Max: {item.max_owned_per_student}
						</Badge>
					{/if}
					{#if item.daily_purchase_limit}
						<Badge variant="outline" class="text-xs">
							{item.daily_purchase_limit}/jour
						</Badge>
					{/if}
					{#if item.weekly_purchase_limit}
						<Badge variant="outline" class="text-xs">
							{item.weekly_purchase_limit}/semaine
						</Badge>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Status indicators -->
		<div class="flex flex-wrap gap-2 border-t pt-2">
			{#if !effectiveEnabled}
				<Badge variant="secondary" class="text-xs">Désactivé</Badge>
			{/if}
			{#if !isAvailable}
				<Badge variant="secondary" class="bg-orange-100 text-xs text-orange-800">
					Non disponible
				</Badge>
			{/if}
			{#if !item.is_tradeable}
				<Badge variant="secondary" class="text-xs">Non échangeable</Badge>
			{/if}
			{#if item.item_type}
				<Badge variant="outline" class="text-xs">
					{item.item_type}
				</Badge>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
