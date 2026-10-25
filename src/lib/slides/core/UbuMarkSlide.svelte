<script lang="ts">
	/**
	 * UbuMarkSlide - Slide with UbuMark content
	 *
	 * Renders UbuMark markdown content inside a slide.
	 * Supports:
	 * - Math formulas ($...$ and $$...$$)
	 * - Variables (predefined via props)
	 * - Fragments via {.fragment} marker
	 * - Contenu trop grand réduit pour tenir dans la diapositive, jusqu'à
	 *   MIN_FIT_SCALE ; au-delà, la diapositive défile (chantier demo-debug, 6i-b)
	 */
	import { tick, getContext } from 'svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { SlideProps } from './types.js';
	import Slide from './Slide.svelte';
	import { DECK_CONTEXT_KEY } from './context.js';
	import type { DeckStore } from '../stores/deckStore.svelte.js';

	// Échelle minimale d'un contenu trop grand : en dessous, il ne serait plus lisible
	const MIN_FIT_SCALE = 0.5;

	// Get deck store from context to update fragment visibility after processing
	const deckContext = getContext<{ getStore: () => DeckStore }>(DECK_CONTEXT_KEY);
	const deckStore = deckContext?.getStore();

	interface Props extends SlideProps {
		/** UbuMark content to render */
		content: string;
		/** Predefined variables (optional) */
		variables?: Record<string, string | number>;
	}

	// Slide props are spread through to <Slide> via ...slideProps to preserve
	// reactivity — collecting them into a plain object would only capture
	// initial values (state_referenced_locally).
	let { content, variables = {}, ...slideProps }: Props = $props();

	// Simple variable substitution
	function resolveContent(text: string, vars: Record<string, string | number>): string {
		let result = text;
		for (const [name, value] of Object.entries(vars)) {
			const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
			result = result.replace(regex, String(value));
		}
		return result;
	}

	// Resolved content with variables substituted
	const resolvedContent = $derived(resolveContent(content, variables));

	// Reference to the slide element for fragment processing
	let slideElement: HTMLElement | undefined = $state();

	// Track if fragments have been processed (to avoid flash)
	let fragmentsReady = $state(false);

	// Réduction : la diapositive (boîte) et la taille naturelle du contenu, à
	// largeur fixe (celle de la boîte) — changer l'échelle ne refait pas la mise en page
	let boxElement: HTMLElement | undefined = $state();
	let fit = $state({ scale: 1, boxWidth: 0, height: 0 });

	function measureFit() {
		if (!boxElement || !slideElement) return;
		const boxWidth = boxElement.clientWidth;
		const boxHeight = boxElement.clientHeight;
		const height = slideElement.offsetHeight;
		const width = slideElement.scrollWidth;
		if (boxWidth === 0 || boxHeight === 0 || height === 0) return;
		const needed = Math.min(1, boxHeight / height, boxWidth / width);
		const scale = needed >= 1 ? 1 : Math.max(MIN_FIT_SCALE, needed);
		if (scale !== fit.scale || boxWidth !== fit.boxWidth || height !== fit.height) {
			fit = { scale, boxWidth, height };
		}
	}

	// Les formules, figures et images se rendent après coup : on remesure à chaque
	// changement de taille du contenu ou de la diapositive
	$effect(() => {
		if (!boxElement || !slideElement) return;
		const observer = new ResizeObserver(() => measureFit());
		observer.observe(boxElement);
		observer.observe(slideElement);
		return () => observer.disconnect();
	});

	const scaled = $derived(fit.scale < 1);

	/**
	 * Update fragment visibility based on current deckStore.f
	 * Must be called after processFragmentMarkers() adds .fragment classes
	 */
	function updateFragmentVisibility() {
		if (!slideElement || !deckStore) return;

		const currentF = deckStore.f;
		const fragments = slideElement.querySelectorAll('.fragment');
		fragments.forEach((fragment, index) => {
			const isVisible = index <= currentF;
			const isCurrent = index === currentF;

			fragment.classList.toggle('visible', isVisible);
			fragment.classList.toggle('current-fragment', isCurrent);
		});
	}

	// Process fragment markers when slideElement becomes available
	// Syntax: "text ->" at end of line marks element as fragment
	$effect(() => {
		if (!slideElement) return;

		// Use tick() to ensure MarkdownRenderer has rendered to DOM
		tick().then(() => {
			processFragmentMarkers();
			// Update fragment visibility immediately after adding .fragment classes
			// This ensures fragments are shown correctly when returning to a slide
			updateFragmentVisibility();
			fragmentsReady = true;
		});
	});

	function processFragmentMarkers() {
		if (!slideElement) return;

		// Find all text nodes and elements containing " ->" marker
		const walker = document.createTreeWalker(slideElement, NodeFilter.SHOW_TEXT, null);

		const nodesToProcess: { textNode: Text; parent: HTMLElement }[] = [];

		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			if (node.textContent?.includes(' ->')) {
				const parent = node.parentElement;
				if (parent) {
					nodesToProcess.push({ textNode: node, parent });
				}
			}
		}

		// Process each found marker
		for (const { textNode, parent } of nodesToProcess) {
			// Remove the " ->" marker from text
			textNode.textContent = textNode.textContent!.replace(/\s*->\s*$/, '');

			// Find the best element to add fragment class to
			// For list items, go up to the <li>
			// For paragraphs, use the <p> or closest block element
			let fragmentTarget: HTMLElement = parent;

			// Walk up to find li (preferred) or p
			// Keep walking to find <li> even if we find <p> first
			let current: HTMLElement | null = parent;
			while (current && current !== slideElement) {
				if (current.tagName === 'LI') {
					fragmentTarget = current;
					break; // <li> is preferred, stop here
				}
				if (current.tagName === 'P' && fragmentTarget === parent) {
					fragmentTarget = current; // Remember <p> but keep looking for <li>
				}
				current = current.parentElement;
			}

			fragmentTarget.classList.add('fragment');
		}
	}
</script>

<Slide {...slideProps}>
	<div
		class="ubumark-slide"
		class:scrolls={scaled && fit.scale === MIN_FIT_SCALE}
		bind:this={boxElement}
		style:visibility={fragmentsReady ? 'visible' : 'hidden'}
	>
		<!-- Enveloppe à la taille réduite : centrage et défilement suivent ce qui se voit -->
		<div
			class="ubumark-sizer"
			style:width={scaled ? `${fit.boxWidth * fit.scale}px` : undefined}
			style:height={scaled ? `${fit.height * fit.scale}px` : undefined}
		>
			<div
				class="ubumark-fit"
				bind:this={slideElement}
				style:width={scaled ? `${fit.boxWidth}px` : undefined}
				style:transform={scaled ? `scale(${fit.scale})` : undefined}
			>
				<MarkdownRenderer content={resolvedContent} />
			</div>
		</div>
	</div>
</Slide>

<style>
	.ubumark-slide {
		/* Le rendu UbuMark colore ses paragraphes avec le thème (text-foreground) : tout le
		   contenu suit, sinon une formule en bloc hérite du blanc de Slide et disparaît
		   sur un fond clair */
		color: var(--color-foreground);
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		/* safe : un contenu qui déborde commence en haut, jamais coupé au-dessus */
		justify-content: safe center;
		align-items: center;
		text-align: center;
		overflow: hidden;
	}

	/* Contenu encore trop grand à l'échelle minimale : la diapositive défile */
	.ubumark-slide.scrolls {
		overflow-y: auto;
	}

	.ubumark-sizer {
		position: relative;
		width: 100%;
		flex-shrink: 0;
	}

	.ubumark-fit {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		transform-origin: top left;
	}

	/* Override markdown-content styles for slides */
	.ubumark-slide :global(.markdown-content) {
		max-width: 90%;
	}

	/* Headings */
	.ubumark-slide :global(h1) {
		font-size: 2.5em;
		margin-bottom: 0.5em;
	}

	.ubumark-slide :global(h2) {
		font-size: 1.8em;
		margin-bottom: 0.5em;
	}

	.ubumark-slide :global(h3) {
		font-size: 1.4em;
		margin-bottom: 0.4em;
	}

	/* Paragraphs */
	.ubumark-slide :global(p) {
		font-size: 1em;
		margin-bottom: 0.5em;
	}

	/* Lists */
	.ubumark-slide :global(ul),
	.ubumark-slide :global(ol) {
		text-align: left;
		display: inline-block;
		margin: 0.5em 0;
	}

	.ubumark-slide :global(li) {
		margin: 0.3em 0;
		font-size: 0.9em;
	}

	/* Math blocks */
	.ubumark-slide :global(.math-block) {
		margin: 1em 0;
	}

	/* Code blocks */
	.ubumark-slide :global(pre) {
		text-align: left;
		padding: 1em;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.3);
	}

	/* Tables */
	.ubumark-slide :global(table) {
		margin: 1em auto;
		border-collapse: collapse;
	}

	.ubumark-slide :global(th),
	.ubumark-slide :global(td) {
		padding: 0.5em 1em;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	/* Images */
	.ubumark-slide :global(img) {
		max-width: 80%;
		max-height: 60vh;
	}
</style>
