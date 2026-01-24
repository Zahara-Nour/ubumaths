<script lang="ts">
	/**
	 * UbuMarkSlide - Slide with UbuMark content
	 *
	 * Renders UbuMark markdown content inside a reveal.js slide.
	 * Supports:
	 * - Math formulas ($...$ and $$...$$)
	 * - Variables (predefined via props)
	 * - Fragments via {.fragment} marker
	 */
	import { onMount } from 'svelte';
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
		state,
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
	let slideElement: HTMLElement | undefined;

	// Process fragments after mount
	onMount(() => {
		if (!slideElement) return;

		// Find elements with {.fragment} and add reveal.js fragment class
		const processFragments = (selector: string) => {
			slideElement?.querySelectorAll(selector).forEach((el) => {
				if (el.innerHTML.includes('{.fragment}')) {
					el.classList.add('fragment');
					el.innerHTML = el.innerHTML.replace(/\{\.fragment\}/g, '');
				}
			});
		};

		processFragments('li');
		processFragments('p');
	});

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
		state,
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
