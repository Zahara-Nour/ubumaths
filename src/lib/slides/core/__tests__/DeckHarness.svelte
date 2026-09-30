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
	}

	let { durations, config = {}, onend, onprobe }: Props = $props();
</script>

<div style="width: 800px; height: 450px;">
	<Deck config={{ hash: false, ...config }} {onend}>
		{#each durations as duration, index (index)}
			<Slide autoSlide={duration}>
				<p>Diapositive {index}</p>
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
