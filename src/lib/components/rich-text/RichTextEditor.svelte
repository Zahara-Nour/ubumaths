<!--
	RichTextEditor Component
	========================

	Editable rich text editor with mathematical formula support.
	Built with TipTap (ProseMirror) and MathLive integration.

	Features:
	- Text formatting (bold, italic)
	- Inline and block math formulas
	- Automatic $$...$$ LaTeX detection
	- 9 common math templates
	- Clear and Send actions

	Usage:
		<RichTextEditor
			onSend={(content) => console.log(content)}
			placeholder="Écrivez votre message..."
		/>

	Props:
		- onSend?: (content: any) => void
			Callback when user clicks "Envoyer" button.
			Receives TipTap JSON content.

		- placeholder?: string (default: "Écrivez votre message...")
			Placeholder text shown in empty editor.

	Content Format:
		Returns TipTap JSON:
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

	@see src/lib/extensions/math-extension.ts for math node implementations
	@see src/lib/components/rich-text/README.md for full documentation
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { MathInline, MathBlock } from '$lib/extensions/math-extension';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Bold, Italic, Sigma, Eraser } from 'lucide-svelte';
	import 'mathlive'; // Import MathLive web components

	// Component Props (Svelte 5 runes)
	interface Props {
		onSend?: (content: any) => void; // Callback when sending content
		placeholder?: string; // Placeholder text for empty editor
	}

	let { onSend, placeholder = 'Écrivez votre message...' }: Props = $props();

	// Editor State (Svelte 5 $state rune)
	let editorElement = $state<HTMLElement | null>(null); // DOM element for TipTap mount
	let editor = $state<Editor | null>(null); // TipTap editor instance

	/**
	 * Common Math Formula Templates
	 * ==============================
	 *
	 * Predefined LaTeX formulas that appear in the "Formule" dropdown menu.
	 * These provide quick access to frequently used mathematical notation.
	 *
	 * Each template has:
	 * - label: Display name in French
	 * - latex: LaTeX formula string
	 */
	const mathTemplates = [
		{ label: 'Fraction', latex: '\\frac{a}{b}' },
		{ label: 'Racine carrée', latex: '\\sqrt{x}' },
		{ label: 'Puissance', latex: 'x^{n}' },
		{ label: 'Indice', latex: 'x_{i}' },
		{ label: 'Intégrale', latex: '\\int_{a}^{b} f(x) dx' },
		{ label: 'Somme', latex: '\\sum_{i=1}^{n} x_i' },
		{ label: 'Limite', latex: '\\lim_{x \\to \\infty} f(x)' },
		{ label: 'Dérivée', latex: '\\frac{d}{dx} f(x)' },
		{ label: 'Équation du 2nd degré', latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' }
	];

	/**
	 * Initialize TipTap Editor
	 * ========================
	 *
	 * Creates the editor instance on component mount.
	 *
	 * Configuration:
	 * - element: DOM node to mount editor into
	 * - extensions: Text editing + math support
	 * - content: Initial content (empty string)
	 * - editorProps: CSS classes for styling
	 *
	 * Cleanup:
	 * - Returns cleanup function that destroys editor on unmount
	 * - Important: Prevents memory leaks
	 */
	onMount(() => {
		if (!editorElement) return;

		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit, // Basic text editing (bold, italic, lists, etc.)
				MathInline, // Inline math formulas
				MathBlock // Block math formulas
			],
			content: '', // Start with empty editor
			editorProps: {
				attributes: {
					// Tailwind classes for editor styling
					// prose: Typography plugin for nice text rendering
					// prose-sm: Smaller text size
					// max-w-none: No max width restriction
					// focus:outline-none: Remove default focus outline
					// min-h-[100px]: Minimum height of 100px
					// p-3: Padding of 12px (3 * 4px)
					class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3'
				}
			}
		});

		// Cleanup function (called when component unmounts)
		return () => {
			editor?.destroy();
		};
	});

	/**
	 * Handle Send Button Click
	 * =========================
	 *
	 * Extracts content as JSON and calls the onSend callback.
	 *
	 * Empty Check:
	 * - Prevents sending empty content
	 * - Checks for no content, empty array, or single empty paragraph
	 *
	 * After Sending:
	 * - Clears editor content
	 * - Ready for next message
	 */
	function handleSend() {
		if (!editor) return;

		// Get content as TipTap JSON format
		const content = editor.getJSON();

		// Check if editor is empty
		// Empty states:
		// 1. No content property
		// 2. Empty content array
		// 3. Single paragraph with no content
		if (
			!content.content ||
			content.content.length === 0 ||
			(content.content.length === 1 &&
				content.content[0].type === 'paragraph' &&
				!content.content[0].content)
		) {
			return; // Don't send empty content
		}

		// Call parent callback with content
		onSend?.(content);

		// Clear editor for next message
		editor.commands.clearContent();
	}

	/**
	 * Handle Clear Button Click
	 * ==========================
	 *
	 * Removes all content from the editor.
	 * Useful for starting over without sending.
	 */
	function handleClear() {
		editor?.commands.clearContent();
	}

	/**
	 * Insert Inline Math Formula
	 * ===========================
	 *
	 * Programmatically inserts a math node into the editor.
	 *
	 * @param latex - LaTeX formula string (default: empty for manual input)
	 *
	 * Process:
	 * 1. Call custom insertMathInline command (from math-extension.ts)
	 * 2. Focus editor so user can continue typing
	 */
	function insertMathInline(latex: string = '') {
		editor?.commands.insertMathInline(latex);
		editor?.commands.focus();
	}

	/**
	 * Insert Block Math Formula
	 * ==========================
	 *
	 * Inserts a centered, larger math block.
	 *
	 * @param latex - LaTeX formula string (default: empty)
	 */
	function insertMathBlock(latex: string = '') {
		editor?.commands.insertMathBlock(latex);
		editor?.commands.focus();
	}
</script>

<!--
	Editor Container
	================

	Structure:
	1. Toolbar (top) - Formatting and math insertion buttons
	2. Editor area (bottom) - TipTap content editable area

	Styling:
	- border-border: Theme-aware border color
	- rounded-lg: Large border radius (8px)
	- bg-card: Theme-aware card background
	- overflow-hidden: Clip content to rounded corners
-->
<div class="border border-border rounded-lg bg-card overflow-hidden">
	<!-- Toolbar -->
	<div class="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/50">
		<!-- Text Formatting Section -->

		<!-- Bold Button -->
		<Button
			variant="ghost"
			size="sm"
			onclick={() => editor?.chain().focus().toggleBold().run()}
			class={editor?.isActive('bold') ? 'bg-accent' : ''}
			disabled={!editor}
		>
			<Bold class="h-4 w-4" />
		</Button>

		<!-- Italic Button -->
		<Button
			variant="ghost"
			size="sm"
			onclick={() => editor?.chain().focus().toggleItalic().run()}
			class={editor?.isActive('italic') ? 'bg-accent' : ''}
			disabled={!editor}
		>
			<Italic class="h-4 w-4" />
		</Button>

		<!-- Vertical Separator -->
		<div class="w-px h-6 bg-border mx-1"></div>

		<!-- Math Formula Insertion Dropdown -->
		<!--
			Note: Using DropdownMenu.Trigger without asChild to avoid Svelte 5 snippet conflicts.
			Button styles are applied directly to the trigger element via class attribute.
		-->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
				disabled={!editor}
			>
				<Sigma class="h-4 w-4 mr-1" />
				Formule
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<!-- Empty Inline Formula -->
				<DropdownMenu.Label>Formule en ligne</DropdownMenu.Label>
				<DropdownMenu.Item onclick={() => insertMathInline()}>Formule vide</DropdownMenu.Item>

				<DropdownMenu.Separator />

				<!-- Common Formula Templates -->
				<DropdownMenu.Label>Formules courantes</DropdownMenu.Label>
				{#each mathTemplates as template}
					<DropdownMenu.Item onclick={() => insertMathInline(template.latex)}>
						{template.label}
					</DropdownMenu.Item>
				{/each}

				<DropdownMenu.Separator />

				<!-- Block Formula Option -->
				<DropdownMenu.Label>Formule en bloc</DropdownMenu.Label>
				<DropdownMenu.Item onclick={() => insertMathBlock()}>Bloc de formule</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- Spacer (pushes action buttons to the right) -->
		<div class="flex-1"></div>

		<!-- Action Buttons Section -->

		<!-- Clear Button -->
		<Button variant="ghost" size="sm" onclick={handleClear} disabled={!editor}>
			<Eraser class="h-4 w-4 mr-1" />
			Effacer
		</Button>

		<!-- Send Button -->
		<Button size="sm" onclick={handleSend} disabled={!editor}> Envoyer </Button>
	</div>

	<!-- Editor Content Area -->
	<!--
		This div is bound to editorElement and serves as the mount point for TipTap.
		TipTap will inject its contenteditable element here.

		Styling:
		- bg-background: Theme-aware background (ensures good contrast with text)
	-->
	<div bind:this={editorElement} class="bg-background"></div>
</div>
