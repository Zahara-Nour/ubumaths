<!--
	RichTextDisplay Component
	=========================

	Read-only display component for rich text content with math formulas.
	Uses TipTap in non-editable mode to render formatted text and MathLive
	for mathematical formulas.

	Features:
	- Displays formatted text (bold, italic, links, underline, etc.)
	- Renders math formulas (non-editable)
	- Automatically updates when content changes
	- Uses same extensions as RichTextEditor for consistency

	Usage:
		<RichTextDisplay content={messageContent} />

		Or with custom styling:
		<RichTextDisplay content={messageContent} class="p-4 bg-gray-50" />

	Props:
		- content: any (required)
			TipTap JSON content to display.
			Same format returned by RichTextEditor.

		- class?: string (optional)
			Additional CSS classes for the container div.

	Content Format:
		Expects TipTap JSON:
		{
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Text' },
						{ type: 'mathInline', attrs: { latex: 'x^2' } }
					]
				}
			]
		}

	Note: Math fields are automatically read-only because editor.isEditable = false.

	@see RichTextEditor.svelte for the editable version
	@see src/lib/extensions/math-extension.ts for math rendering logic
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor, type Content } from '@tiptap/core';
	import { createEditorExtensions } from './editor-config';
	import 'mathlive'; // Import MathLive web components

	// Component Props (Svelte 5 runes)
	interface Props {
		content: unknown; // TipTap JSON content to display
		class?: string; // Optional CSS classes
	}

	let { content, class: className = '' }: Props = $props();

	// Display State (Svelte 5 $state rune)
	let displayElement = $state<HTMLElement | null>(null); // DOM element for TipTap mount
	let editor = $state<Editor | null>(null); // TipTap editor instance (read-only)

	/**
	 * Initialize Read-Only TipTap Editor
	 * ===================================
	 *
	 * Creates a non-editable editor instance for displaying content.
	 *
	 * Key Difference from RichTextEditor:
	 * - editable: false - Content cannot be modified
	 * - content: Initialized with prop value (not empty)
	 *
	 * Math Formulas:
	 * - MathLive fields automatically become read-only
	 * - Controlled by the math-extension.ts node views
	 * - They check editor.isEditable and set mathfield.readOnly = true
	 *
	 * Cleanup:
	 * - Returns cleanup function to destroy editor on unmount
	 * - Prevents memory leaks
	 */
	onMount(() => {
		if (!displayElement) return;

		// Use shared extension configuration for consistency with RichTextEditor
		// This ensures links, underlines, and other formatting render correctly
		const extensions = createEditorExtensions({ headingLevels: 6 });

		editor = new Editor({
			element: displayElement,
			extensions,
			content: content as Content, // Initial content from props
			editable: false, // IMPORTANT: Makes content read-only
			editorProps: {
				attributes: {
					// Tailwind classes for display styling
					// prose: Typography plugin for nice text rendering
					// prose-sm: Smaller text size
					// max-w-none: No max width restriction
					class: 'prose prose-sm max-w-none'
				}
			}
		});

		// Cleanup function (called when component unmounts)
		return () => {
			editor?.destroy();
		};
	});

	/**
	 * React to Content Changes
	 * =========================
	 *
	 * Svelte 5 $effect that runs when the content prop changes.
	 *
	 * Purpose:
	 * - Allows parent component to update displayed content
	 * - Useful for real-time updates (e.g., live chat, collaborative editing)
	 *
	 * Process:
	 * 1. Watch for changes to 'content' prop
	 * 2. When changed, update editor's content
	 * 3. TipTap re-renders with new content
	 *
	 * Note:
	 * - Only updates if editor exists and content is truthy
	 * - Uses editor.commands.setContent() to replace all content
	 */
	$effect(() => {
		if (editor && content) {
			editor.commands.setContent(content);
		}
	});
</script>

<!--
	Display Container
	=================

	Simple div that serves as the mount point for TipTap.
	Additional classes can be passed via the class prop for custom styling.

	Examples:
		<RichTextDisplay content={msg} class="p-4 bg-card rounded-lg" />
		<RichTextDisplay content={msg} class="border-l-4 border-primary pl-4" />
-->
<div bind:this={displayElement} class={className}></div>

<style>
	/*
	 * MathLive Integration - Read-only Math Display
	 * ==============================================
	 * Make math-field blend seamlessly with text (no chrome).
	 */

	/* Inline math - completely transparent */
	:global(.math-inline-wrapper math-field) {
		display: inline-block;
		vertical-align: baseline;
		margin: 0 2px;
		font-size: inherit;
		line-height: 1;
		border: none;
		background: transparent;
		padding: 0;
		cursor: default;
		/* MathLive internal CSS variables */
		--_padding-vertical: 0;
		--_padding-horizontal: 0;
	}

	/* Hide MathLive UI buttons (menu and keyboard toggle) */
	:global(.math-inline-wrapper math-field::part(menu-toggle)),
	:global(.math-inline-wrapper math-field::part(virtual-keyboard-toggle)),
	:global(.math-block-wrapper math-field::part(menu-toggle)),
	:global(.math-block-wrapper math-field::part(virtual-keyboard-toggle)) {
		display: none;
	}

	/* Target MathLive internal elements */
	:global(.math-inline-wrapper math-field::part(container)) {
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(.math-inline-wrapper math-field .ML__container) {
		padding: 0 !important;
	}

	:global(.math-inline-wrapper math-field .ML__base) {
		padding: 0 !important;
	}

	/* Block math - subtle styling */
	:global(.math-block-wrapper math-field) {
		display: block;
		width: 100%;
		border: none;
		margin: 0.5rem 0;
		padding: 0.5rem;
		background: transparent;
		text-align: center;
		font-size: 1.2em;
		cursor: default;
	}
</style>
