<script lang="ts">
	import { onMount, setContext, type Snippet } from 'svelte';
	import Reveal from 'reveal.js';
	import 'reveal.js/dist/reveal.css';
	import 'reveal.js/dist/theme/black.css';
	import { mergeConfig } from './config.js';
	import { DECK_CONTEXT_KEY } from './context.js';
	import type { DeckConfig, DeckContext, RevealInstance, SlideChangedEvent } from './types.js';
	import SlideAnnotationToolbar from '../components/SlideAnnotationToolbar.svelte';
	import { slideAnnotationStore } from '../stores/slideAnnotationStore.svelte.js';

	interface Props {
		/** Deck configuration */
		config?: Partial<DeckConfig>;
		/** Slides content */
		children: Snippet;
		/** Called when deck is ready */
		onready?: () => void;
		/** Called when slide changes */
		onslidechanged?: (event: SlideChangedEvent) => void;
	}

	let { config = {}, children, onready, onslidechanged }: Props = $props();

	let deckElement: HTMLDivElement | undefined = $state();
	let reveal: RevealInstance | undefined = $state();
	let ready = $state(false);

	// Provide context to child Slide components
	const context: DeckContext = {
		getReveal: () => reveal,
		isReady: () => ready,
		slide: (h, v, f) => reveal?.slide(h, v, f),
		next: () => reveal?.next(),
		prev: () => reveal?.prev(),
		getIndices: () => reveal?.getIndices() ?? { h: 0, v: 0, f: 0 },
		getTotalSlides: () => reveal?.getTotalSlides() ?? 0
	};

	setContext(DECK_CONTEXT_KEY, context);

	onMount(() => {
		if (!deckElement) return;

		const mergedConfig = mergeConfig(config);

		reveal = new Reveal(deckElement, mergedConfig);

		reveal.initialize().then(() => {
			ready = true;
			// Force layout calculation after init
			reveal?.layout();
			onready?.();
		});

		// Event listeners
		reveal.on('slidechanged', (event: unknown) => {
			const e = event as SlideChangedEvent;
			onslidechanged?.(e);
		});

		return () => {
			// Cleanup on unmount
			if (reveal) {
				reveal.destroy();
				reveal = undefined;
				ready = false;
			}
		};
	});

	// React to config changes
	$effect(() => {
		if (reveal && ready) {
			const mergedConfig = mergeConfig(config);
			reveal.configure(mergedConfig);
		}
	});
</script>

<div class="deck-wrapper">
	<div class="reveal" bind:this={deckElement}>
		<div class="slides">
			{@render children()}
		</div>
	</div>

	<!-- Annotation toolbar rendered outside reveal.js container -->
	{#if slideAnnotationStore.available}
		<SlideAnnotationToolbar
			tool={slideAnnotationStore.tool}
			style={slideAnnotationStore.style}
			enabled={slideAnnotationStore.enabled}
			canUndo={slideAnnotationStore.canUndo}
			canRedo={slideAnnotationStore.canRedo}
			ontoolchange={(tool) => slideAnnotationStore.setTool(tool)}
			onstylechange={(style) => slideAnnotationStore.setStyle(style)}
			ontoggle={() => slideAnnotationStore.toggle()}
			onclear={() => slideAnnotationStore.clear()}
			onundo={() => slideAnnotationStore.undo()}
			onredo={() => slideAnnotationStore.redo()}
		/>
	{/if}
</div>

<style>
	.deck-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.reveal {
		width: 100%;
		height: 100%;
	}
</style>
