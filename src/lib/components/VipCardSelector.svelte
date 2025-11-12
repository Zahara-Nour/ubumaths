<!--
	VipCardSelector Component
	==========================
	Clickable zone for VIP card selection that opens VipCardSelectorModal.

	Features:
	- Empty state: Shows placeholder with icon and "Sélectionner une carte VIP"
	- Selected state: Displays the selected VIP card
	- Opens VipCardSelectorModal on click
	- Responsive with hover effects (scale, border color)
	- Accessible (keyboard navigation, ARIA labels)

	Props:
	- selectedCardId: Currently selected card ID (bindable)
	- availableCards: Array of available VIP card templates

	Behavior:
	- Click anywhere → open modal
	- Select card in modal → update selectedCardId → close modal
	- Hover → scale up + border color change
	- Keyboard: Enter/Space → open modal
-->

<script lang="ts">
	import VipCard from '$lib/components/VipCard.svelte';
	import VipCardSelectorModal from '$lib/components/VipCardSelectorModal.svelte';
	import { cn } from '$lib/utils';
	import { CreditCard, X } from 'lucide-svelte';
	import {
		templateToVipCard,
		getTemplateById,
		type VipCardTemplate
	} from '$lib/stores/vipCardTemplates.svelte';

	// Component Props
	interface Props {
		selectedCardId?: string | null;
		availableCards: VipCardTemplate[];
	}

	let { selectedCardId = $bindable(null), availableCards }: Props = $props();

	// Internal state
	let modalOpen = $state(false);

	/**
	 * Get the selected card template object
	 */
	const selectedCard = $derived.by(() => {
		if (!selectedCardId) return null;
		return getTemplateById(selectedCardId, availableCards);
	});

	/**
	 * Handle click on the selector zone
	 * Opens the modal for card selection
	 */
	function handleClick(): void {
		modalOpen = true;
	}

	/**
	 * Handle card selection from modal
	 * Updates the bindable selectedCardId prop
	 * @param cardId - ID of the selected card
	 */
	function handleCardSelect(cardId: string): void {
		selectedCardId = cardId;
		// Modal auto-closes via VipCardSelectorModal
	}

	/**
	 * Handle clearing the selection
	 * Prevents event bubbling to avoid opening modal
	 */
	function handleClear(event: MouseEvent): void {
		event.stopPropagation(); // Prevent opening modal
		selectedCardId = null;
	}

	/**
	 * Handle keyboard events (Enter/Space)
	 * @param event - KeyboardEvent
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	}

	/**
	 * Get accessible label based on current state
	 */
	const ariaLabel = $derived(
		selectedCard
			? `Carte sélectionnée : ${selectedCard.name}. Cliquer pour changer`
			: 'Sélectionner une carte VIP'
	);
</script>

<!-- Main clickable zone -->
<button
	type="button"
	class={cn(
		'w-48 rounded-xl p-4 transition-all duration-200',
		'hover:scale-105 focus:scale-105',
		'focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none',
		selectedCard
			? 'border-2 border-border hover:border-primary'
			: 'border-2 border-dashed border-gray-300 hover:border-primary dark:border-gray-600'
	)}
	onclick={handleClick}
	onkeydown={handleKeydown}
	aria-label={ariaLabel}
>
	{#if selectedCard}
		<!-- Selected State: Display VipCard with clear button -->
		<div class="relative flex justify-center">
			<!-- Clear button (absolute positioned in top-right corner) -->
			<button
				type="button"
				onclick={handleClear}
				class="absolute top-0 right-0 z-10 rounded-full bg-destructive p-1 text-destructive-foreground shadow-lg transition-transform hover:scale-110 focus:ring-2 focus:ring-ring focus:outline-none"
				aria-label="Désélectionner la carte"
				title="Désélectionner"
			>
				<X class="h-4 w-4" />
			</button>

			<!-- VipCard display -->
			<VipCard card={templateToVipCard(selectedCard)} size="sm" clickable={false} />
		</div>
	{:else}
		<!-- Empty State: Placeholder with icon and text -->
		<div class="flex flex-col items-center justify-center gap-2 py-8">
			<CreditCard class="h-16 w-16 text-muted-foreground opacity-50" />
			<p class="text-sm text-muted-foreground"></p>
		</div>
	{/if}
</button>

<!-- VIP Card Selector Modal -->
<VipCardSelectorModal bind:open={modalOpen} {availableCards} onSelect={handleCardSelect} />
