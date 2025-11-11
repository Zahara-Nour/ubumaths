<!--
	VipCardSelectorModal Component
	================================
	Modal for selecting a VIP card from a visual gallery.

	Features:
	- Displays VIP cards in a responsive grid (2/3/4 columns)
	- Cards sorted by rarity (legendary → common)
	- Click on any card to select it
	- Hover effect on cards (scale transform)
	- Responsive design with Tailwind CSS
	- Accessible (keyboard navigation, ARIA labels)

	Props:
	- open: Dialog open/close state (bindable)
	- availableCards: Array of VIP card templates to display
	- onSelect: Callback when a card is selected (receives cardId)

	Behavior:
	- Click on card → call onSelect(cardId) → close modal
	- Click outside or press Escape → close modal
	- No "Cancel" button (clicking outside closes it)
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import VipCard from '$lib/components/VipCard.svelte';
	import { cn } from '$lib/utils';
	import { templateToVipCard } from '$lib/stores/vipCardTemplates.svelte';
	import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';

	// Component Props
	interface Props {
		open?: boolean;
		availableCards: VipCardTemplate[];
		onSelect: (cardId: string) => void;
	}

	let { open = $bindable(false), availableCards, onSelect }: Props = $props();

	/**
	 * Rarity priority mapping for sorting
	 * legendary (highest) → epic → rare → common (lowest)
	 */
	const rarityPriority = {
		legendary: 4,
		epic: 3,
		rare: 2,
		common: 1
	};

	/**
	 * Sorted cards by rarity (legendary first)
	 */
	const sortedCards = $derived.by(() => {
		return [...availableCards].sort((a, b) => {
			const priorityA = a.rarity
				? (rarityPriority[a.rarity as keyof typeof rarityPriority] ?? 0)
				: 0;
			const priorityB = b.rarity
				? (rarityPriority[b.rarity as keyof typeof rarityPriority] ?? 0)
				: 0;
			return priorityB - priorityA; // Descending order (highest priority first)
		});
	});

	/**
	 * Handle card selection
	 * @param cardId - ID of the selected card
	 */
	function handleCardSelect(cardId: string): void {
		onSelect(cardId);
		open = false; // Close modal after selection
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>Sélectionner une carte VIP</Dialog.Title>
			<Dialog.Description>
				Cliquez sur une carte pour la sélectionner. Les cartes les plus rares sont affichées en
				premier.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Cards Grid -->
		<div class="max-h-[60vh] overflow-y-auto py-4">
			{#if sortedCards.length === 0}
				<!-- Empty State -->
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 text-6xl opacity-50">📦</div>
					<p class="text-muted-foreground">Aucune carte disponible</p>
				</div>
			{:else}
				<!-- Responsive Grid: 2 columns (mobile) → 3 (tablet) → 4 (desktop) -->
				<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
					{#each sortedCards as template (template.id)}
						<button
							type="button"
							onclick={() => handleCardSelect(template.id)}
							class={cn(
								'transform cursor-pointer transition-transform duration-200',
								'hover:scale-105 focus:scale-105',
								'focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none',
								'rounded-lg'
							)}
							aria-label={`Sélectionner la carte ${template.name}`}
						>
							<VipCard card={templateToVipCard(template)} size="sm" clickable={false} />
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
