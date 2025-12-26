<script lang="ts">
	/**
	 * NumberGrid - Display 24 numbers in a 6x4 grid
	 *
	 * Each number has a state (normal, eliminated, secret) and can be toggled
	 * between normal and eliminated states by clicking.
	 */

	import NumberCard from './NumberCard.svelte';

	interface Props {
		numbers: number[];
		eliminatedNumbers: Set<number>;
		secretNumber?: number;
		onToggle: (n: number) => void;
		class?: string;
	}

	let {
		numbers,
		eliminatedNumbers,
		secretNumber,
		onToggle,
		class: className = ''
	}: Props = $props();

	// Determine state for each number
	function getNumberState(num: number): 'normal' | 'eliminated' | 'secret' {
		if (num === secretNumber) return 'secret';
		if (eliminatedNumbers.has(num)) return 'eliminated';
		return 'normal';
	}

	// Handle click: toggle between normal and eliminated (secret cannot be toggled)
	function handleCardClick(num: number) {
		if (num === secretNumber) return; // Cannot eliminate your own secret
		onToggle(num);
	}
</script>

<div class="number-grid {className}">
	{#each numbers as number (number)}
		<NumberCard {number} state={getNumberState(number)} onclick={() => handleCardClick(number)} />
	{/each}
</div>

<style>
	.number-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	/* Responsive: smaller grid on mobile */
	@media (max-width: 640px) {
		.number-grid {
			grid-template-columns: repeat(4, 1fr);
			gap: 0.375rem;
			max-width: 400px;
		}
	}

	@media (max-width: 400px) {
		.number-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.25rem;
			max-width: 300px;
		}
	}
</style>
