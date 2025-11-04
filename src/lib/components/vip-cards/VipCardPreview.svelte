<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import type { Database } from '$lib/types/database';
	import {
		rarityLabel,
		rarityColorClass,
		rarityBadgeClass,
		categoryIcon,
		categoryLabel
	} from './utils';

	type VipCardTemplate = Database['public']['Tables']['vip_card_templates']['Row'];

	interface Props {
		card: VipCardTemplate;
		isEnabled?: boolean;
		showActions?: boolean;
		onToggle?: (enabled: boolean) => void;
		onEdit?: () => void;
		onDelete?: () => void;
		onUploadImage?: () => void;
	}

	let {
		card,
		isEnabled,
		showActions = false,
		onToggle,
		onEdit,
		onDelete,
		onUploadImage
	}: Props = $props();

	const currentEnabled = $derived(isEnabled ?? card.is_enabled);
</script>

<div class="overflow-hidden rounded-lg border {rarityColorClass(card.rarity)} transition-all">
	<!-- Card Image -->
	<div class="relative aspect-square bg-muted">
		{#if card.image_url}
			<img src={card.image_url} alt={card.name} class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full w-full items-center justify-center text-6xl">
				{categoryIcon(card.category)}
			</div>
		{/if}

		<!-- Rarity badge overlay -->
		<div class="absolute top-2 right-2">
			<span
				class="rounded-full border px-2 py-1 text-xs {rarityBadgeClass(
					card.rarity
				)} backdrop-blur-sm"
			>
				{rarityLabel(card.rarity)}
			</span>
		</div>
	</div>

	<!-- Card Content -->
	<div class="space-y-3 bg-card p-4">
		<div>
			<h3 class="truncate text-lg font-semibold">{card.name}</h3>
			<p class="line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
		</div>

		<div class="flex items-center justify-between text-xs text-muted-foreground">
			<span>{categoryIcon(card.category)} {categoryLabel(card.category)}</span>
			<span>Ordre: {card.sort_order}</span>
		</div>

		<!-- Toggle Switch -->
		{#if onToggle}
			<div class="flex items-center justify-between border-t py-2">
				<span class="text-sm font-medium">Activée</span>
				<Switch checked={currentEnabled} onCheckedChange={(checked) => onToggle(!!checked)} />
			</div>
		{/if}

		<!-- Action Buttons -->
		{#if showActions}
			<div class="flex flex-col gap-2 border-t pt-2">
				{#if onEdit}
					<Button size="sm" variant="outline" onclick={onEdit} class="w-full">Modifier</Button>
				{/if}

				{#if onUploadImage}
					<Button size="sm" variant="outline" onclick={onUploadImage} class="w-full">
						Changer l'image
					</Button>
				{/if}

				{#if onDelete}
					<Button size="sm" variant="destructive" onclick={onDelete} class="w-full">
						Supprimer
					</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>
