<script lang="ts">
	// Banc de test du Deck : une diapositive par durée de `durations`
	import Deck from '../Deck.svelte';
	import Slide from '../Slide.svelte';
	import ContextProbe from './ContextProbe.svelte';
	import type { DeckConfig, DeckContext } from '../types.js';

	interface Props {
		/** Durée autoSlide de chaque diapositive (undefined = celle du deck) */
		durations: Array<number | undefined>;
		config?: Partial<DeckConfig>;
		onend?: () => void;
		onprobe: (context: DeckContext) => void;
		/** Nombre de fragments de chaque diapositive (0 par défaut) */
		fragments?: number[];
	}

	let { durations, config = {}, onend, onprobe, fragments = [] }: Props = $props();
</script>

<div style="width: 800px; height: 450px;">
	<Deck config={{ hash: false, ...config }} {onend}>
		{#each durations as duration, index (index)}
			<Slide autoSlide={duration}>
				<p>Diapositive {index}</p>
				{#each { length: fragments[index] ?? 0 }, fragmentIndex (fragmentIndex)}
					<span class="fragment">Fragment {fragmentIndex}</span>
				{/each}
				{#if index === 0}
					<ContextProbe {onprobe} />
				{/if}
			</Slide>
		{/each}
		{#snippet overlay(deck)}
			<span data-testid="remaining">{deck.getAutoSlideRemaining()}</span>
			<span data-testid="duration">{deck.getAutoSlideDuration()}</span>
		{/snippet}
	</Deck>
</div>
