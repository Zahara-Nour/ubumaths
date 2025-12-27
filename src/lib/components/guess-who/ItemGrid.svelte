<script lang="ts">
	/**
	 * ItemGrid - Display 24 polymorphic items in a responsive grid
	 *
	 * Each item has a state (normal, eliminated, secret) and can be toggled
	 * between normal and eliminated states by clicking.
	 *
	 * Supports all item types: numbers, fractions, shapes, expressions, functions, polyhedra
	 */

	import ItemCard from './ItemCard.svelte';
	import type { GridItem } from '$lib/utils/guess-who/grid-item';
	import { gridItemToKey, gridItemsEqual } from '$lib/utils/guess-who/grid-item';

	interface Props {
		items: GridItem[];
		eliminatedItems: Set<string>; // Uses gridItemToKey for comparison
		secretItem?: GridItem;
		onToggle: (item: GridItem) => void;
		class?: string;
	}

	let { items, eliminatedItems, secretItem, onToggle, class: className = '' }: Props = $props();

	// Determine state for each item
	function getItemState(item: GridItem): 'normal' | 'eliminated' | 'secret' {
		if (secretItem && gridItemsEqual(item, secretItem)) return 'secret';
		if (eliminatedItems.has(gridItemToKey(item))) return 'eliminated';
		return 'normal';
	}

	// Handle click: toggle between normal and eliminated (secret cannot be toggled)
	function handleCardClick(item: GridItem) {
		if (secretItem && gridItemsEqual(item, secretItem)) return; // Cannot eliminate your own secret
		onToggle(item);
	}
</script>

<div class="item-grid {className}">
	{#each items as item (gridItemToKey(item))}
		<ItemCard {item} state={getItemState(item)} onclick={() => handleCardClick(item)} />
	{/each}
</div>

<style>
	.item-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	/* Responsive: smaller grid on mobile */
	@media (max-width: 640px) {
		.item-grid {
			grid-template-columns: repeat(4, 1fr);
			gap: 0.375rem;
			max-width: 400px;
		}
	}

	@media (max-width: 400px) {
		.item-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.25rem;
			max-width: 300px;
		}
	}
</style>
