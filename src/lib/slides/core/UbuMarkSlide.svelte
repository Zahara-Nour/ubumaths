<script lang="ts">
	/**
	 * UbuMarkSlide - Slide with UbuMark content
	 *
	 * Renders UbuMark markdown content inside a slide.
	 * Supports:
	 * - Math formulas ($...$ and $$...$$)
	 * - Variables (predefined via props)
	 * - Fragments via {.fragment} marker
	 */
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { SlideProps } from './types.js';
	import Slide from './Slide.svelte';

	interface Props extends SlideProps {
		/** UbuMark content to render */
		content: string;
		/** Predefined variables (optional) */
		variables?: Record<string, string | number>;
	}

	let {
		content,
		variables = {},
		// Slide props
		transition,
		transitionSpeed,
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundOpacity,
		state: slideState,
		autoSlide,
		autoAnimate,
		autoAnimateId,
		visibility,
		class: className,
		data
	}: Props = $props();

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

	// Process fragment markers when slideElement becomes available
	// Syntax: "text ->" at end of line marks element as fragment
	$effect(() => {
		if (!slideElement) return;

		// Small delay to ensure MarkdownRenderer has rendered
		const timer = setTimeout(() => {
			processFragmentMarkers();
		}, 50);

		return () => clearTimeout(timer);
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

	// Collect slide props to pass through
	const slideProps = {
		transition,
		transitionSpeed,
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundOpacity,
		state: slideState,
		autoSlide,
		autoAnimate,
		autoAnimateId,
		visibility,
		class: className,
		data
	};
</script>

<Slide {...slideProps}>
	<div class="ubumark-slide" bind:this={slideElement}>
		<MarkdownRenderer content={resolvedContent} />
	</div>
</Slide>

<style>
	.ubumark-slide {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
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
