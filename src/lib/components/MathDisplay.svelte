<!--
	MathDisplay Component
	=====================

	@deprecated Use MarkdownRenderer from '$lib/components/markdown' instead.
	This component is kept for backward compatibility with ChatBot and SRS components.
	New code should use MarkdownRenderer which supports full markdown + math + images.

	Example migration:
	- Old: <MathDisplay text="Calculate $$2+3$$" />
	- New: <MarkdownRenderer content="Calculate $2+3$" />

	Note: MarkdownRenderer uses $...$ for inline math (standard markdown),
	while MathDisplay uses $$...$$ for both inline and block math.

	---

	Renders text with embedded LaTeX expressions using MathLive.
	Designed specifically for chatbot responses with real-time typing animation support.

	Features:
	- Parses text for $$...$$ LaTeX expressions
	- Renders math expressions as MathLive fields (read-only)
	- Preserves text formatting (whitespace, line breaks)
	- Updates smoothly during typing animations
	- Seamless integration: math fields blend with message bubble background
	- No borders, no hover effects, transparent background

	Usage:
		<MathDisplay text="La formule $$x^2 + y^2$$ est belle" />

	Props:
		- text: string (required)
			Plain text with $$...$$ LaTeX expressions to render

		- class?: string (optional)
			Additional CSS classes for the container

	Styling:
	- Math fields inherit background color from parent (message bubble)
	- No visual borders or outlines
	- No hover or focus effects
	- Appears as natural inline math within text

	Note:
	- MathLive must be imported globally (already done in app.html)
	- Math fields are automatically read-only for display purposes
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { parseLatex } from '$lib/utils/latex-parser';
	import type { ContentSegment } from '$lib/utils/latex-parser';
	import 'mathlive'; // Import MathLive web components

	// Component Props (Svelte 5 runes)
	interface Props {
		text: string; // Text with $$...$$ LaTeX expressions
		class?: string; // Optional CSS classes
	}

	let { text, class: className = '' }: Props = $props();

	// State
	let containerElement = $state<HTMLDivElement | null>(null);
	let segments = $state<ContentSegment[]>([]);

	/**
	 * Parse text into segments whenever it changes
	 * ============================================
	 *
	 * This effect runs on every text change (including during typing animation).
	 * It parses the text and updates the segments array, which triggers
	 * a re-render of the component with updated MathLive fields.
	 *
	 * This enables real-time math rendering during typing.
	 */
	$effect(() => {
		segments = parseLatex(text);
	});

	/**
	 * Initialize MathLive fields on mount
	 * ====================================
	 *
	 * Ensures MathLive web components are properly initialized.
	 * The actual rendering happens in the template using {#each} blocks.
	 */
	onMount(() => {
		// MathLive is already initialized globally
		// This is just a placeholder for any future initialization needs
		return () => {
			// Cleanup if needed
		};
	});
</script>

<!--
	Display Container
	=================

	Renders segments as a sequence of text spans and math-field elements.
	The container uses inline-flex to allow math fields to flow naturally with text.
-->
<div bind:this={containerElement} class="math-display-container {className}">
	{#each segments as segment, index (index)}
		{#if segment.type === 'text'}
			<!-- Text segment: preserve whitespace and line breaks -->
			<span class="text-segment">{segment.content}</span>
		{:else if segment.type === 'math'}
			<!-- Math segment: render as MathLive field (read-only) -->
			<math-field
				read-only
				value={segment.latex}
				class="math-field-inline"
				style="display: inline-block; font-size: inherit; vertical-align: middle;"
			>
			</math-field>
		{/if}
	{/each}
</div>

<style>
	/*
	 * Container Styling
	 * =================
	 * The main container displays inline to flow naturally with surrounding text.
	 * Preserves whitespace and line breaks for proper text formatting.
	 */
	.math-display-container {
		display: inline;
		line-height: 1.6;
		word-wrap: break-word;
		white-space: pre-wrap; /* Preserve whitespace and line breaks */
	}

	/*
	 * Text Segment Styling
	 * ====================
	 * Regular text segments display inline to flow with math fields.
	 */
	.text-segment {
		display: inline;
	}

	/*
	 * Math Field Inline Styling - Seamless Integration
	 * =================================================
	 * These styles ensure math fields blend perfectly with message bubbles:
	 * - Transparent background (inherits from parent message bubble)
	 * - No borders or outlines
	 * - No hover or focus effects
	 * - Default cursor (not text cursor)
	 *
	 * The !important flags override MathLive's default styles.
	 */
	:global(.math-field-inline) {
		display: inline-block !important;
		margin: 0 2px; /* Small spacing between math and text */
		vertical-align: middle; /* Align with text baseline */
		background: transparent !important; /* Inherit bubble background */
		border: none !important; /* No border */
		outline: none !important; /* No outline */
		box-shadow: none !important; /* No shadow */
	}

	/*
	 * MathLive Container Part
	 * =======================
	 * MathLive uses shadow DOM with ::part selectors.
	 * Remove all default container styling for seamless integration.
	 */
	:global(.math-field-inline::part(container)) {
		display: inline-block;
		padding: 0;
		border: none !important;
		background: transparent !important;
		outline: none !important;
		box-shadow: none !important;
	}

	/*
	 * MathLive Content Part
	 * =====================
	 * The content area where the actual math is rendered.
	 * Minimal padding, transparent background.
	 */
	:global(.math-field-inline::part(content)) {
		padding: 0 2px; /* Minimal padding around math content */
		background: transparent !important;
		border: none !important;
	}

	/*
	 * MathLive Internal Rendering
	 * ============================
	 * Ensure the actual math content inherits font size and has no background.
	 */
	:global(.math-field-inline .ML__mathlive) {
		font-size: inherit; /* Match surrounding text size */
		background: transparent !important;
	}

	/*
	 * Hover State - No Visual Feedback
	 * =================================
	 * Remove all hover effects to prevent the field from looking interactive.
	 * The math is read-only and should not appear clickable.
	 */
	:global(.math-field-inline:hover) {
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
		cursor: default !important; /* Not a text cursor */
	}

	/*
	 * Focus State - No Visual Feedback
	 * =================================
	 * Even though read-only, remove focus rings to maintain seamless appearance.
	 */
	:global(.math-field-inline:focus),
	:global(.math-field-inline:focus-within) {
		background: transparent !important;
		border: none !important;
		outline: none !important;
		box-shadow: none !important;
	}

	/*
	 * Catch-All for MathLive Internal Elements
	 * =========================================
	 * Ensure all nested elements within the math field are transparent.
	 * This overrides any default MathLive styling that might add backgrounds.
	 */
	:global(.math-field-inline *) {
		background: transparent !important;
		border: none !important;
		outline: none !important;
	}
</style>
