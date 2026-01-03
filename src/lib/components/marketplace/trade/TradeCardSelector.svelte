<!--
	TradeCardSelector Component
	===========================
	Grid of VIP cards for selection in trades.
	Follows VipCardExchangeModal pattern: cards grouped by template with counter.

	Features:
	- Cards grouped by template (cardId)
	- Click to increment selection counter
	- Click when all selected → deselect all
	- Badge showing selectedCount/totalCount
	- Read-only mode for partner's cards

	Props:
	- cards: TradeCard[] - Available cards with instanceId
	- selectedCardIds: string[] - Currently selected instance IDs
	- readonly: boolean - Disable selection
	- onSelect?: (cardId: string) => void - Called with instanceId to select
	- onDeselect?: (cardId: string) => void - Called with instanceId to deselect
-->
<script lang="ts">
	import VipCard from '$lib/components/VipCard.svelte';
	import {
		vipCardTemplates,
		getTemplateById,
		templateToVipCard
	} from '$lib/stores/vipCardTemplates.svelte';
	import { getRarityPoints } from '$lib/types/vip-card';
	import type { VipCardInstance, VipCard as VipCardType } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';

	// Extended type for cards with instanceId
	type TradeCard = VipCardInstance & { instanceId: string };

	interface Props {
		cards: TradeCard[];
		selectedCardIds: string[];
		readonly?: boolean;
		onSelect?: (instanceId: string) => void;
		onDeselect?: (instanceId: string) => void;
	}

	let { cards, selectedCardIds, readonly = false, onSelect, onDeselect }: Props = $props();

	// Group cards by template (cardId)
	let groupedCards = $derived.by(() => {
		const groups = new Map<
			string,
			{
				cardId: string;
				card: VipCardType | null;
				instances: TradeCard[];
				totalCount: number;
				selectedCount: number;
			}
		>();

		// Group by cardId (template)
		for (const tradeCard of cards) {
			const template = getTemplateById(tradeCard.cardId, $vipCardTemplates);
			const card = template ? templateToVipCard(template) : null;

			if (!groups.has(tradeCard.cardId)) {
				groups.set(tradeCard.cardId, {
					cardId: tradeCard.cardId,
					card,
					instances: [],
					totalCount: 0,
					selectedCount: 0
				});
			}

			const group = groups.get(tradeCard.cardId)!;
			group.instances.push(tradeCard);
			group.totalCount++;

			if (selectedCardIds.includes(tradeCard.instanceId)) {
				group.selectedCount++;
			}
		}

		// Convert to array and sort by rarity (legendary first)
		return Array.from(groups.values())
			.filter((g) => g.card !== null)
			.sort((a, b) => {
				const rarityA = getRarityPoints(a.card!.rarity as 'common' | 'rare' | 'epic' | 'legendary');
				const rarityB = getRarityPoints(b.card!.rarity as 'common' | 'rare' | 'epic' | 'legendary');
				// Higher rarity first
				return rarityB - rarityA;
			});
	});

	/**
	 * Toggle card group selection
	 * - If some unselected: select next unselected instance
	 * - If all selected: deselect all instances of this group
	 */
	function toggleCardGroup(cardId: string): void {
		if (readonly) return;

		const group = groupedCards.find((g) => g.cardId === cardId);
		if (!group) return;

		// Find first unselected instance
		const unselectedInstance = group.instances.find(
			(inst) => !selectedCardIds.includes(inst.instanceId)
		);

		if (unselectedInstance) {
			// Select next unselected instance
			onSelect?.(unselectedInstance.instanceId);
		} else {
			// All selected → deselect all instances of this group
			for (const inst of group.instances) {
				if (selectedCardIds.includes(inst.instanceId)) {
					onDeselect?.(inst.instanceId);
				}
			}
		}
	}
</script>

{#if groupedCards.length === 0}
	<p class="py-6 text-center text-sm text-muted-foreground">Aucune carte disponible</p>
{:else}
	<div class="grid grid-cols-3 gap-2 overflow-hidden sm:grid-cols-4 lg:grid-cols-5">
		{#each groupedCards as group (group.cardId)}
			<button
				type="button"
				onclick={() => toggleCardGroup(group.cardId)}
				disabled={readonly}
				class={cn(
					'relative rounded-lg border-2 p-0.5 transition-all',
					group.selectedCount > 0 ? 'border-primary bg-primary/10 shadow-lg' : 'border-transparent',
					readonly ? 'cursor-default' : 'cursor-pointer hover:border-primary/50'
				)}
			>
				<VipCard card={group.card} size="sm" clickable={false} />

				<!-- Selection badge -->
				{#if group.totalCount > 1}
					<!-- Multiple cards: show counter -->
					<div
						class={cn(
							'absolute -top-2 -right-2 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-md',
							group.selectedCount > 0
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground'
						)}
					>
						{group.selectedCount}/{group.totalCount}
					</div>
				{:else if group.selectedCount > 0}
					<!-- Single card selected: show checkmark -->
					<div
						class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md"
					>
						&#10003;
					</div>
				{/if}
			</button>
		{/each}
	</div>
{/if}
