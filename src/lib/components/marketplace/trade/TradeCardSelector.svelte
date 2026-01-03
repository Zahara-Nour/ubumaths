<!--
	TradeCardSelector Component
	===========================
	Grid of VIP cards for selection in trades.
	Adapted from VipCardChooseModal pattern.

	Features:
	- Responsive grid (2/3/4 columns)
	- Toggle selection with checkmark badge
	- Read-only mode for partner's cards
	- Cards grouped by rarity (legendary first)

	Props:
	- cards: VipCardInstance[] - Available cards
	- selectedCardIds: string[] - Currently selected card IDs
	- readonly: boolean - Disable selection
	- onSelect?: (cardId: string) => void
	- onDeselect?: (cardId: string) => void
-->
<script lang="ts">
	import VipCard from '$lib/components/VipCard.svelte';
	import {
		vipCardTemplates,
		getTemplateById,
		templateToVipCard
	} from '$lib/stores/vipCardTemplates.svelte';
	import { getRarityPoints } from '$lib/types/vip-card';
	import type { VipCardInstance } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';

	// Extended type for cards with instanceId
	type TradeCard = VipCardInstance & { instanceId: string };

	interface Props {
		cards: TradeCard[];
		selectedCardIds: string[];
		readonly?: boolean;
		onSelect?: (cardId: string) => void;
		onDeselect?: (cardId: string) => void;
	}

	let { cards, selectedCardIds, readonly = false, onSelect, onDeselect }: Props = $props();

	// Sort cards by rarity (legendary first) then by name
	let sortedCards = $derived.by(() => {
		return [...cards].sort((a, b) => {
			const templateA = getTemplateById(a.cardId, $vipCardTemplates);
			const templateB = getTemplateById(b.cardId, $vipCardTemplates);

			if (!templateA || !templateB) return 0;

			// Higher rarity first (legendary = 27, epic = 9, rare = 3, common = 1)
			const rarityDiff =
				getRarityPoints(templateB.rarity as 'common' | 'rare' | 'epic' | 'legendary') -
				getRarityPoints(templateA.rarity as 'common' | 'rare' | 'epic' | 'legendary');

			if (rarityDiff !== 0) return rarityDiff;

			// Then by name
			return templateA.name.localeCompare(templateB.name);
		});
	});

	/**
	 * Get VipCard object from template
	 */
	function getCardData(cardId: string) {
		const template = getTemplateById(cardId, $vipCardTemplates);
		return template ? templateToVipCard(template) : null;
	}

	/**
	 * Check if card is selected
	 */
	function isSelected(instanceId: string): boolean {
		return selectedCardIds.includes(instanceId);
	}

	/**
	 * Toggle card selection
	 */
	function toggleCard(instanceId: string): void {
		if (readonly) return;

		if (isSelected(instanceId)) {
			onDeselect?.(instanceId);
		} else {
			onSelect?.(instanceId);
		}
	}
</script>

{#if cards.length === 0}
	<p class="py-6 text-center text-sm text-muted-foreground">Aucune carte disponible</p>
{:else}
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
		{#each sortedCards as card (card.instanceId)}
			{@const cardData = getCardData(card.cardId)}
			{@const selected = isSelected(card.instanceId)}

			{#if cardData}
				<button
					type="button"
					onclick={() => toggleCard(card.instanceId)}
					disabled={readonly}
					class={cn(
						'relative rounded-lg border-2 p-1.5 transition-all',
						selected ? 'border-primary bg-primary/10 shadow-lg' : 'border-transparent',
						readonly ? 'cursor-default' : 'cursor-pointer hover:border-primary/50'
					)}
				>
					<VipCard card={cardData} size="sm" clickable={false} />

					<!-- Selection checkmark -->
					{#if selected}
						<div
							class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md"
						>
							&#10003;
						</div>
					{/if}
				</button>
			{/if}
		{/each}
	</div>
{/if}
