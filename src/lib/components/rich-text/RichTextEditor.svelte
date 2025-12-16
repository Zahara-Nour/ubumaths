<!--
	RichTextEditorUnified Component
	================================

	Unified rich text editor that combines RichTextEditor (chat mode) and
	FormRichTextEditor (form mode) into a single component.

	MODES:
	- 'form' (default): Bidirectional binding with htmlValue prop, no send button
	- 'chat': Send callback with JSON content, clears after send

	USAGE:
	<script>
		// Form mode (default)
		let content = $state('');
		<RichTextEditorUnified bind:htmlValue={content} />

		// Chat mode
		function handleSend(json) { ... }
		<RichTextEditorUnified mode="chat" onSend={handleSend} />
	</script>
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import {
		Bold,
		Italic,
		Underline as UnderlineIcon,
		Strikethrough,
		Code,
		Subscript as SubscriptIcon,
		Superscript as SuperscriptIcon,
		AlignLeft,
		AlignCenter,
		AlignRight,
		AlignJustify,
		List,
		ListOrdered,
		ListTodo,
		Heading,
		Palette,
		Highlighter,
		Link as LinkIcon,
		Quote,
		CodeSquare,
		Minus,
		Sigma,
		Eraser,
		MoreHorizontal,
		ChevronDown,
		ChevronRight,
		Type,
		PilcrowSquare,
		Plus,
		Smile,
		Send,
		X,
		Braces,
		Eye,
		EyeOff,
		Maximize,
		Minimize,
		ImageIcon,
		FileCode
	} from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import ImageAttributePanel from '$lib/components/exercises/ImageAttributePanel.svelte';
	import { parseMarkdown } from '$lib/custom-markdown/parser';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { browser } from '$app/environment';
	import 'mathlive';

	// Shared configuration imports
	import {
		TEXT_COLORS,
		HIGHLIGHT_COLORS,
		EMOJI_CATEGORIES,
		MATH_TEMPLATES_FULL,
		MATH_TEMPLATES_BASIC,
		EDITOR_PRESETS
	} from './config';
	import { createEditorExtensions, getEditorProps } from './editor-config';
	import { tipTapToMarkdown } from './markdown-export';
	import { markdownToTipTap } from './markdown-import';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { MarkdownDisplayMode } from '$lib/components/markdown/types';
	import type {
		RichTextMode,
		MathTemplateLevel,
		ToolbarConfig,
		EditorPreset,
		ImageUploadConfig
	} from './types';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

	// Component Props
	interface Props {
		mode?: RichTextMode;
		htmlValue?: string;
		jsonValue?: unknown;
		markdownValue?: string;
		onSend?: (content: unknown) => void;
		/** Editor preset - predefined configurations. Explicit props override preset values. */
		preset?: EditorPreset;
		mathTemplates?: MathTemplateLevel;
		toolbar?: ToolbarConfig;
		showSendButton?: boolean;
		showClearButton?: boolean;
		minHeight?: string;
		disabled?: boolean;
		/** Image upload configuration - enables image button in toolbar when provided */
		imageUpload?: ImageUploadConfig;
		/**
		 * Configuration for generic function names in math parsing (for preview).
		 * Controls which identifiers are recognized as function calls (e.g., f(x), C'(x))
		 */
		genericFunctions?: GenericFunctionConfig | null;
	}

	let {
		mode = 'form',
		htmlValue = $bindable(''),
		jsonValue = $bindable(undefined),
		markdownValue = $bindable(undefined as string | undefined),
		onSend,
		preset = 'full',
		mathTemplates: mathTemplatesOverride,
		toolbar: toolbarOverride,
		showSendButton,
		showClearButton = true,
		minHeight = '100px',
		disabled = false,
		imageUpload,
		genericFunctions
	}: Props = $props();

	// Resolve configuration: explicit props override preset values
	let resolvedToolbar = $derived(toolbarOverride ?? EDITOR_PRESETS[preset].toolbar);
	let resolvedMathTemplates = $derived(
		mathTemplatesOverride ?? EDITOR_PRESETS[preset].mathTemplates
	);

	// Computed toolbar visibility from resolved config
	let showText = $derived(resolvedToolbar.text ?? true);
	let showParagraph = $derived(resolvedToolbar.paragraph ?? true);
	let showInsertion = $derived(resolvedToolbar.insertion ?? true);
	let showFormula = $derived(resolvedToolbar.formula ?? true);
	let showTemplates = $derived(resolvedToolbar.templates ?? true);
	let showMore = $derived(resolvedToolbar.more ?? true);
	let showPreview = $derived(resolvedToolbar.preview ?? false);
	let showFullscreen = $derived(resolvedToolbar.fullscreen ?? true);

	// Computed defaults based on mode
	let effectiveShowSendButton = $derived(showSendButton ?? mode === 'chat');

	// Editor State
	let editorElement = $state<HTMLElement | null>(null);
	let editor = $state<Editor | null>(null);
	// Non-reactive flag to prevent update loops (NOT $state - just a guard)
	let isUpdatingFromProp = false;

	// Toolbar Section State
	let textSectionOpen = $state(true);
	let paragraphSectionOpen = $state(false);
	let insertSectionOpen = $state(false);
	let formuleSectionOpen = $state(false);
	let templatesSectionOpen = $state(false);

	// Reactive formatting state
	let isBold = $state(false);
	let isItalic = $state(false);
	let isUnderline = $state(false);
	let isStrike = $state(false);
	let isCode = $state(false);
	let isSubscript = $state(false);
	let isSuperscript = $state(false);
	let isBulletList = $state(false);
	let isOrderedList = $state(false);
	let isTaskList = $state(false);
	let isBlockquote = $state(false);
	let isCodeBlock = $state(false);
	let currentHeading = $state<number | null>(null);
	let currentAlignment = $state<string>('left');

	// Link dialog state
	let showLinkDialog = $state(false);
	let linkUrl = $state('');

	// Emoji picker state
	let selectedEmojiCategory = $state('Smileys');

	// Image upload dialog state
	let imageDialogOpen = $state(false);
	let uploadedImageUrl = $state('');
	let uploadedImageAlt = $state('');
	let isUploadingImage = $state(false);

	// Preview and Fullscreen state
	let isPreviewMode = $state(false);
	let isFullscreen = $state(false);
	let previewMarkdown = $state('');
	let previewDisplayMode = $state<MarkdownDisplayMode>('rendered');
	let previewTimeout: ReturnType<typeof setTimeout> | null = null;
	const PREVIEW_DEBOUNCE_MS = 150;

	/**
	 * Toggle preview display mode between rendered and raw
	 */
	function togglePreviewDisplayMode() {
		previewDisplayMode = previewDisplayMode === 'rendered' ? 'raw' : 'rendered';
	}

	// Markdown binding debounce
	const MARKDOWN_DEBOUNCE_MS = 150;
	let markdownTimeout: ReturnType<typeof setTimeout> | null = null;

	// Get math templates based on resolved level
	let mathTemplatesList = $derived(
		resolvedMathTemplates === 'full'
			? MATH_TEMPLATES_FULL
			: resolvedMathTemplates === 'basic'
				? MATH_TEMPLATES_BASIC
				: []
	);

	/**
	 * Update reactive formatting state based on current selection
	 */
	function updateFormattingState() {
		if (!editor) return;
		isBold = editor.isActive('bold');
		isItalic = editor.isActive('italic');
		isUnderline = editor.isActive('underline');
		isStrike = editor.isActive('strike');
		isCode = editor.isActive('code');
		isSubscript = editor.isActive('subscript');
		isSuperscript = editor.isActive('superscript');
		isBulletList = editor.isActive('bulletList');
		isOrderedList = editor.isActive('orderedList');
		isTaskList = editor.isActive('taskList');
		isBlockquote = editor.isActive('blockquote');
		isCodeBlock = editor.isActive('codeBlock');

		// Check heading level
		currentHeading = null;
		for (let i = 1; i <= 6; i++) {
			if (editor.isActive('heading', { level: i })) {
				currentHeading = i;
				break;
			}
		}

		// Check alignment
		if (editor.isActive({ textAlign: 'left' })) currentAlignment = 'left';
		else if (editor.isActive({ textAlign: 'center' })) currentAlignment = 'center';
		else if (editor.isActive({ textAlign: 'right' })) currentAlignment = 'right';
		else if (editor.isActive({ textAlign: 'justify' })) currentAlignment = 'justify';
		else currentAlignment = 'left';
	}

	/**
	 * Update markdown binding with debounce (only if bound)
	 */
	function updateMarkdownDebounced() {
		if (markdownTimeout) clearTimeout(markdownTimeout);
		markdownTimeout = setTimeout(() => {
			if (editor && markdownValue !== undefined) {
				markdownValue = tipTapToMarkdown(editor.getJSON());
			}
		}, MARKDOWN_DEBOUNCE_MS);
	}

	/**
	 * Get markdown content on-demand (exported method)
	 */
	export function getMarkdown(): string {
		if (!editor) return '';
		return tipTapToMarkdown(editor.getJSON());
	}

	/**
	 * Initialize TipTap Editor
	 */
	onMount(() => {
		if (!editorElement) return;

		// Async initialization wrapped in an IIFE
		(async () => {
			// Disable MathLive sounds globally (client-side only)
			const { MathfieldElement } = await import('mathlive');
			MathfieldElement.soundsDirectory = null;

			const extensions = createEditorExtensions({ headingLevels: 6 });
			const editorProps = getEditorProps({ minHeight });

			// Prevent reactive updates during initialization
			isUpdatingFromProp = true;

			// TipTap accepts both HTML string and JSON object for content
			// Priority: markdownValue > jsonValue (if object) > htmlValue (if string) > empty
			const initialContent =
				mode === 'form'
					? markdownValue !== undefined
						? markdownToTipTap(markdownValue, {
								genericFunctions: genericFunctions ?? undefined
							})
						: jsonValue && typeof jsonValue === 'object'
							? jsonValue
							: htmlValue || ''
					: '';

			editor = new Editor({
				element: editorElement,
				extensions,
				content: initialContent,
				editorProps,
				editable: !disabled,
				onUpdate: ({ editor: ed }) => {
					if (isUpdatingFromProp) return;

					// Update bound values in form mode
					if (mode === 'form') {
						htmlValue = ed.getHTML();
						if (jsonValue !== undefined) {
							jsonValue = ed.getJSON();
						}
						// Update markdown binding (debounced) - only if bound
						if (markdownValue !== undefined) {
							updateMarkdownDebounced();
						}
					}
					updateFormattingState();
					updatePreviewDebounced();
				},
				onSelectionUpdate: () => {
					updateFormattingState();
				}
			});

			// Allow reactive updates after initialization
			isUpdatingFromProp = false;

			updateFormattingState();
		})();

		return () => {
			if (previewTimeout) {
				clearTimeout(previewTimeout);
				previewTimeout = null;
			}
			if (markdownTimeout) {
				clearTimeout(markdownTimeout);
				markdownTimeout = null;
			}
			editor?.destroy();
		};
	});

	/**
	 * Sync external htmlValue changes (form mode only)
	 */
	$effect(() => {
		if (mode !== 'form' || !editor || !htmlValue) return;

		// Avoid infinite loops
		const currentHtml = editor.getHTML();
		if (currentHtml !== htmlValue) {
			isUpdatingFromProp = true;
			editor.commands.setContent(htmlValue);
			isUpdatingFromProp = false;
		}
	});

	/**
	 * Sync external jsonValue changes (form mode only)
	 * This is used when content is set programmatically via JSON (e.g., from markdown import)
	 */
	$effect(() => {
		if (mode !== 'form' || !editor || !jsonValue || typeof jsonValue !== 'object') return;

		// Compare JSON to avoid infinite loops
		const currentJson = editor.getJSON();
		if (JSON.stringify(currentJson) !== JSON.stringify(jsonValue)) {
			isUpdatingFromProp = true;
			editor.commands.setContent(jsonValue);
			isUpdatingFromProp = false;
		}
	});

	/**
	 * Sync external markdownValue changes (form mode only)
	 */
	$effect(() => {
		if (mode !== 'form' || !editor || markdownValue === undefined) return;

		// Compare with current markdown to avoid infinite loops
		const currentMd = tipTapToMarkdown(editor.getJSON());
		if (currentMd !== markdownValue) {
			isUpdatingFromProp = true;
			const json = markdownToTipTap(markdownValue, {
				genericFunctions: genericFunctions ?? undefined
			});
			editor.commands.setContent(json);
			isUpdatingFromProp = false;
		}
	});

	/**
	 * Handle editor disabled state changes
	 * Only call setEditable if the value actually changed
	 */
	$effect(() => {
		if (editor && editor.isEditable !== !disabled) {
			isUpdatingFromProp = true;
			editor.setEditable(!disabled);
			isUpdatingFromProp = false;
		}
	});

	/**
	 * Handle Send Button (chat mode)
	 */
	function handleSend() {
		if (!editor) return;

		const content = editor.getJSON();

		// Check if content is empty
		if (
			!content.content ||
			content.content.length === 0 ||
			(content.content.length === 1 &&
				content.content[0].type === 'paragraph' &&
				!content.content[0].content)
		) {
			return;
		}

		onSend?.(content);
		editor.commands.clearContent();
	}

	/**
	 * Handle Clear Button
	 */
	function handleClear() {
		editor?.commands.clearContent();
		if (mode === 'form') {
			htmlValue = '';
		}
	}

	/**
	 * Insert Math Formulas using custom commands
	 */
	function insertMathInline(latex: string = '') {
		// Custom Tiptap command from math extension
		(editor?.commands as unknown as Record<string, (arg?: string) => boolean>).insertMathInline?.(
			latex
		);
		editor?.commands.focus();
	}

	function insertMathBlock(latex: string = '') {
		// Custom Tiptap command from math extension
		(editor?.commands as unknown as Record<string, (arg?: string) => boolean>).insertMathBlock?.(
			latex
		);
		editor?.commands.focus();
	}

	/**
	 * Set Heading Level
	 */
	function setHeading(level: number) {
		if (currentHeading === level) {
			editor?.chain().focus().setParagraph().run();
		} else {
			editor
				?.chain()
				.focus()
				.setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
				.run();
		}
	}

	/**
	 * Toggle Link
	 */
	function toggleLink() {
		if (editor?.isActive('link')) {
			editor?.chain().focus().unsetLink().run();
		} else {
			showLinkDialog = true;
			const previousUrl = editor?.getAttributes('link').href;
			linkUrl = previousUrl || '';
		}
	}

	function setLink() {
		if (linkUrl) {
			editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
		}
		showLinkDialog = false;
		linkUrl = '';
	}

	/**
	 * Set Text Color
	 */
	function setColor(color: string) {
		editor?.chain().focus().setColor(color).run();
	}

	/**
	 * Set Highlight Color
	 */
	function setHighlight(color: string | null) {
		if (color) {
			editor?.chain().focus().setHighlight({ color }).run();
		} else {
			editor?.chain().focus().unsetHighlight().run();
		}
	}

	/**
	 * Insert Emoji
	 */
	function insertEmoji(emoji: string) {
		editor?.chain().focus().insertContent(emoji).run();
	}

	/**
	 * Insert Template Elements using custom commands
	 */
	function insertVariable() {
		// Custom Tiptap command from template extension
		(
			editor?.commands as unknown as Record<string, (arg?: string) => boolean>
		).insertTemplateVariable?.('var');
		editor?.commands.focus();
	}

	function insertRandom() {
		// Custom Tiptap command from template extension
		(
			editor?.commands as unknown as Record<string, (arg?: string) => boolean>
		).insertTemplateRandom?.('1..10');
		editor?.commands.focus();
	}

	function insertEval() {
		// Custom Tiptap command from template extension
		(editor?.commands as unknown as Record<string, (arg?: string) => boolean>).insertTemplateEval?.(
			'a+b'
		);
		editor?.commands.focus();
	}

	function insertBlank() {
		// Custom Tiptap command from blank extension
		(editor?.commands as unknown as Record<string, (arg?: string) => boolean>).insertBlankField?.(
			'?'
		);
		editor?.commands.focus();
	}

	/**
	 * Handle Image Upload button click
	 * Opens file picker, uploads via imageUpload.uploadFn, then shows configuration dialog
	 */
	async function handleImageUpload() {
		if (!imageUpload || isUploadingImage) return; // Guard against duplicate calls

		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';

		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;

			isUploadingImage = true;
			try {
				const result = await imageUpload.uploadFn(file);
				if (result.success && result.url) {
					uploadedImageUrl = result.url;
					uploadedImageAlt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
					imageDialogOpen = true;
				} else {
					toaster.error(result.error || "Erreur lors de l'upload de l'image");
				}
			} catch (err) {
				console.error('Image upload error:', err);
				toaster.error("Erreur lors de l'upload de l'image");
			} finally {
				isUploadingImage = false;
			}
		};

		input.click();
	}

	/**
	 * Handle image insertion from ImageAttributePanel
	 * Parses the markdown to extract image attributes and inserts via TipTap
	 */
	function handleImageInsert(markdown: string) {
		if (!editor) return;

		try {
			// Parse the markdown to extract image node attributes
			const ast = parseMarkdown(markdown);
			const imageNode = ast.children.find((n) => n.type === 'image');

			if (imageNode && imageNode.type === 'image') {
				// Insert image with all attributes using TipTap's setImage command
				// Use type assertion for custom image attributes not in the base type
				editor
					.chain()
					.focus()
					.setImage({
						src: imageNode.src,
						alt: imageNode.alt || '',
						title: imageNode.title || undefined
					} as Parameters<typeof editor.commands.setImage>[0] & {
						sizeClass?: string;
						widthPercent?: number;
						alignment?: string;
						caption?: string;
					})
					.run();

				// If we have custom attributes, update the node
				if (
					imageNode.sizeClass ||
					imageNode.widthPercent ||
					imageNode.alignment ||
					imageNode.caption
				) {
					editor.commands.updateAttributes('image', {
						sizeClass: imageNode.sizeClass || undefined,
						widthPercent: imageNode.widthPercent || undefined,
						alignment: imageNode.alignment || undefined,
						caption: imageNode.caption || undefined
					});
				}
			}
		} catch (err) {
			console.error('Error parsing image markdown:', err);
			toaster.error("Erreur lors de l'insertion de l'image");
		}

		// Close dialog and reset state
		imageDialogOpen = false;
		uploadedImageUrl = '';
		uploadedImageAlt = '';
	}

	/**
	 * Close image dialog and reset state
	 */
	function closeImageDialog() {
		imageDialogOpen = false;
		uploadedImageUrl = '';
		uploadedImageAlt = '';
	}

	/**
	 * Update preview markdown with debounce (150ms)
	 */
	function updatePreviewDebounced() {
		if (!isPreviewMode) return;
		if (previewTimeout) clearTimeout(previewTimeout);
		previewTimeout = setTimeout(() => {
			if (editor) {
				try {
					previewMarkdown = tipTapToMarkdown(editor.getJSON());
				} catch (error) {
					console.error('Preview conversion failed:', error);
					previewMarkdown = '_Erreur de conversion_';
				}
			}
		}, PREVIEW_DEBOUNCE_MS);
	}

	/**
	 * Toggle preview mode and immediately update preview when enabling
	 */
	function togglePreview() {
		isPreviewMode = !isPreviewMode;
		if (isPreviewMode && editor) {
			// Immediately update preview when enabling
			try {
				previewMarkdown = tipTapToMarkdown(editor.getJSON());
			} catch (error) {
				console.error('Preview conversion failed:', error);
				previewMarkdown = '_Erreur de conversion_';
			}
		} else if (previewTimeout) {
			// Clear pending timeout when disabling preview
			clearTimeout(previewTimeout);
			previewTimeout = null;
		}
	}

	/**
	 * Toggle fullscreen mode
	 */
	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	/**
	 * Handle ESC key for fullscreen exit
	 */
	function handleFullscreenKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
		}
	}

	/**
	 * Body scroll lock when fullscreen
	 */
	$effect(() => {
		if (!browser) return;
		document.body.style.overflow = isFullscreen ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<!--
	ESC key handler for fullscreen exit
-->
<svelte:window onkeydown={handleFullscreenKeydown} />

<!--
	Editor Container with Organized Collapsible Toolbar
-->
<div
	class={isFullscreen
		? 'fixed inset-0 z-50 flex flex-col bg-background'
		: 'overflow-hidden rounded-lg border border-border bg-card'}
>
	<!-- Toolbar -->
	<div class="border-b border-border bg-muted/50">
		<!-- Main Toolbar Row -->
		<div class="flex flex-wrap items-center gap-1 p-2">
			<!-- Text Section Toggle -->
			{#if showText}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (textSectionOpen = !textSectionOpen)}
					class="font-medium"
					{disabled}
				>
					<Type class="mr-1 h-4 w-4" />
					Texte
					{#if textSectionOpen}
						<ChevronDown class="ml-1 h-3 w-3" />
					{:else}
						<ChevronRight class="ml-1 h-3 w-3" />
					{/if}
				</Button>
			{/if}

			<!-- Paragraph Section Toggle -->
			{#if showParagraph}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (paragraphSectionOpen = !paragraphSectionOpen)}
					class="font-medium"
					{disabled}
				>
					<PilcrowSquare class="mr-1 h-4 w-4" />
					Paragraphe
					{#if paragraphSectionOpen}
						<ChevronDown class="ml-1 h-3 w-3" />
					{:else}
						<ChevronRight class="ml-1 h-3 w-3" />
					{/if}
				</Button>
			{/if}

			<!-- Insert Section Toggle -->
			{#if showInsertion}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (insertSectionOpen = !insertSectionOpen)}
					class="font-medium"
					{disabled}
				>
					<Plus class="mr-1 h-4 w-4" />
					Insertion
					{#if insertSectionOpen}
						<ChevronDown class="ml-1 h-3 w-3" />
					{:else}
						<ChevronRight class="ml-1 h-3 w-3" />
					{/if}
				</Button>
			{/if}

			<!-- Formule Section Toggle (only if showFormula and resolvedMathTemplates !== 'none') -->
			{#if showFormula && resolvedMathTemplates !== 'none'}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (formuleSectionOpen = !formuleSectionOpen)}
					class="font-medium"
					{disabled}
				>
					<Sigma class="mr-1 h-4 w-4" />
					Formule
					{#if formuleSectionOpen}
						<ChevronDown class="ml-1 h-3 w-3" />
					{:else}
						<ChevronRight class="ml-1 h-3 w-3" />
					{/if}
				</Button>
			{/if}

			<!-- Templates Section Toggle -->
			{#if showTemplates}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (templatesSectionOpen = !templatesSectionOpen)}
					class="font-medium"
					{disabled}
				>
					<Braces class="mr-1 h-4 w-4" />
					Templates
					{#if templatesSectionOpen}
						<ChevronDown class="ml-1 h-3 w-3" />
					{:else}
						<ChevronRight class="ml-1 h-3 w-3" />
					{/if}
				</Button>
			{/if}

			<!-- More Dropdown (Advanced Features) -->
			{#if showMore}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger {disabled}>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
							>
								<MoreHorizontal class="h-4 w-4" />
								Plus
							</button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Label>Blocs spéciaux</DropdownMenu.Label>
						<DropdownMenu.Item
							onclick={() => editor?.chain().focus().toggleBlockquote().run()}
							class={isBlockquote ? 'bg-accent' : ''}
						>
							<Quote class="mr-2 h-4 w-4" />
							Citation
						</DropdownMenu.Item>
						<DropdownMenu.Item
							onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
							class={isCodeBlock ? 'bg-accent' : ''}
						>
							<CodeSquare class="mr-2 h-4 w-4" />
							Bloc de code
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => editor?.chain().focus().setHorizontalRule().run()}>
							<Minus class="mr-2 h-4 w-4" />
							Ligne horizontale
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}

			<!-- Preview Toggle -->
			{#if showPreview}
				<Button
					type="button"
					variant={isPreviewMode ? 'secondary' : 'ghost'}
					size="sm"
					onclick={togglePreview}
					{disabled}
					title={isPreviewMode ? 'Masquer apercu' : 'Afficher apercu'}
					aria-label={isPreviewMode ? 'Masquer apercu' : 'Afficher apercu'}
				>
					{#if isPreviewMode}
						<EyeOff class="mr-1 h-4 w-4" aria-hidden="true" />
					{:else}
						<Eye class="mr-1 h-4 w-4" aria-hidden="true" />
					{/if}
					Apercu
				</Button>
			{/if}

			<!-- Fullscreen Toggle -->
			{#if showFullscreen}
				<Button
					type="button"
					variant={isFullscreen ? 'secondary' : 'ghost'}
					size="sm"
					onclick={toggleFullscreen}
					{disabled}
					title={isFullscreen ? 'Quitter plein ecran' : 'Plein ecran'}
					aria-label={isFullscreen ? 'Quitter plein ecran' : 'Plein ecran'}
				>
					{#if isFullscreen}
						<Minimize class="h-4 w-4" aria-hidden="true" />
					{:else}
						<Maximize class="h-4 w-4" aria-hidden="true" />
					{/if}
				</Button>
			{/if}

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Action Buttons (Always Visible) -->
			{#if showClearButton}
				<Button type="button" variant="ghost" size="sm" onclick={handleClear} {disabled}>
					<Eraser class="mr-1 h-4 w-4" />
					Effacer
				</Button>
			{/if}

			{#if effectiveShowSendButton}
				<Button type="button" size="sm" onclick={handleSend} {disabled}>
					<Send class="mr-1 h-4 w-4" />
					Envoyer
				</Button>
			{/if}
		</div>

		<!-- Text Section (Collapsible) -->
		{#if showText && textSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<Button
					type="button"
					variant={isBold ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleBold().run()}
					{disabled}
					title="Gras"
				>
					<Bold class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={isItalic ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					{disabled}
					title="Italique"
				>
					<Italic class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={isUnderline ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleUnderline().run()}
					{disabled}
					title="Souligne"
				>
					<UnderlineIcon class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={isStrike ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleStrike().run()}
					{disabled}
					title="Barre"
				>
					<Strikethrough class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={isCode ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleCode().run()}
					{disabled}
					title="Code inline"
				>
					<Code class="h-4 w-4" />
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<Button
					type="button"
					variant={isSubscript ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleSubscript().run()}
					{disabled}
					title="Indice"
				>
					<SubscriptIcon class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={isSuperscript ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleSuperscript().run()}
					{disabled}
					title="Exposant"
				>
					<SuperscriptIcon class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Paragraph Section (Collapsible) -->
		{#if showParagraph && paragraphSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<!-- Headings Dropdown -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger {disabled}>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 {currentHeading
									? 'bg-accent'
									: ''}"
							>
								<Heading class="mr-1 h-4 w-4" />
								{#if currentHeading}
									<span>H{currentHeading}</span>
								{:else}
									<span>Titre</span>
								{/if}
							</button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item onclick={() => editor?.chain().focus().setParagraph().run()}>
							Paragraphe
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						{#each [1, 2, 3, 4, 5, 6] as level (level)}
							<DropdownMenu.Item onclick={() => setHeading(level)}>
								Titre {level}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Text Alignment -->
				<Button
					type="button"
					variant={currentAlignment === 'left' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('left').run()}
					{disabled}
					title="Aligner a gauche"
				>
					<AlignLeft class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={currentAlignment === 'center' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('center').run()}
					{disabled}
					title="Centrer"
				>
					<AlignCenter class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={currentAlignment === 'right' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('right').run()}
					{disabled}
					title="Aligner a droite"
				>
					<AlignRight class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={currentAlignment === 'justify' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('justify').run()}
					{disabled}
					title="Justifier"
				>
					<AlignJustify class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Insert Section (Collapsible) -->
		{#if showInsertion && insertSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<!-- Lists -->
				<Button
					type="button"
					variant={isBulletList ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleBulletList().run()}
					{disabled}
					title="Liste a puces"
				>
					<List class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={isOrderedList ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleOrderedList().run()}
					{disabled}
					title="Liste numerotee"
				>
					<ListOrdered class="h-4 w-4" />
				</Button>

				<Button
					type="button"
					variant={isTaskList ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => editor?.chain().focus().toggleTaskList().run()}
					{disabled}
					title="Liste de taches"
				>
					<ListTodo class="h-4 w-4" />
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Color Picker -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger {disabled}>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
							>
								<Palette class="h-4 w-4" />
							</button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Label>Couleur du texte</DropdownMenu.Label>
						<div class="grid grid-cols-4 gap-1 p-2">
							{#each TEXT_COLORS as color (color.value)}
								<button
									type="button"
									onclick={() => setColor(color.value)}
									class="h-8 w-8 rounded border-2 border-border transition-transform hover:scale-110"
									style="background-color: {color.value}"
									title={color.name}
									aria-label={color.name}
								></button>
							{/each}
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<!-- Highlight Picker -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger {disabled}>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
							>
								<Highlighter class="h-4 w-4" />
							</button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Label>Surlignage</DropdownMenu.Label>
						<div class="grid grid-cols-4 gap-1 p-2">
							{#each HIGHLIGHT_COLORS as color, i (i)}
								<button
									type="button"
									onclick={() => setHighlight(color.value)}
									class="flex h-8 w-8 items-center justify-center rounded border-2 border-border transition-transform hover:scale-110"
									style="background-color: {color.value || 'transparent'}"
									title={color.name}
									aria-label={color.name}
								>
									{#if color.value === null}
										<X class="h-4 w-4 text-muted-foreground" />
									{/if}
								</button>
							{/each}
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Link -->
				<Button
					type="button"
					variant={editor?.isActive('link') ? 'secondary' : 'ghost'}
					size="sm"
					onclick={toggleLink}
					{disabled}
					title="Lien"
				>
					<LinkIcon class="h-4 w-4" />
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Emoji Picker with Tabs -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger {disabled}>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
							>
								<Smile class="h-4 w-4" />
							</button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-80 p-0">
						<Tabs.Root bind:value={selectedEmojiCategory} class="w-full">
							<Tabs.List class="grid h-auto w-full grid-cols-4 rounded-none border-b">
								{#each EMOJI_CATEGORIES.slice(0, 4) as category (category.name)}
									<Tabs.Trigger value={category.name} class="px-2 py-1.5 text-xs">
										{category.name.slice(0, 4)}
									</Tabs.Trigger>
								{/each}
							</Tabs.List>
							<Tabs.List class="grid h-auto w-full grid-cols-4 rounded-none border-b">
								{#each EMOJI_CATEGORIES.slice(4, 8) as category (category.name)}
									<Tabs.Trigger value={category.name} class="px-2 py-1.5 text-xs">
										{category.name.slice(0, 4)}
									</Tabs.Trigger>
								{/each}
							</Tabs.List>
							{#each EMOJI_CATEGORIES as category (category.name)}
								<Tabs.Content value={category.name} class="mt-0 p-2">
									<div class="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
										{#each category.emojis as emoji (emoji)}
											<button
												type="button"
												onclick={() => insertEmoji(emoji)}
												class="rounded p-1 text-xl transition-colors hover:bg-accent"
												title={emoji}
											>
												{emoji}
											</button>
										{/each}
									</div>
								</Tabs.Content>
							{/each}
						</Tabs.Root>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<!-- Image Upload Button (only if imageUpload is provided) -->
				{#if imageUpload}
					<div class="mx-1 h-6 w-px bg-border"></div>

					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={handleImageUpload}
						disabled={disabled || isUploadingImage}
						title="Inserer une image"
					>
						{#if isUploadingImage}
							<span class="h-4 w-4 animate-spin">⏳</span>
						{:else}
							<ImageIcon class="h-4 w-4" />
						{/if}
					</Button>
				{/if}
			</div>
		{/if}

		<!-- Formule Section (Collapsible) - Only if showFormula and resolvedMathTemplates !== 'none' -->
		{#if showFormula && formuleSectionOpen && resolvedMathTemplates !== 'none'}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<!-- Empty Formula Button -->
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => insertMathInline()}
					{disabled}
					title="Formule vide"
					class="font-mono"
				>
					$$
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Math Template Buttons -->
				{#each mathTemplatesList as template (template.latex)}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={() => insertMathInline(template.latex)}
						{disabled}
						title={template.title}
						class="font-mono text-base"
					>
						{template.icon}
					</Button>
				{/each}

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Block Formula Button -->
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => insertMathBlock()}
					{disabled}
					title="Bloc de formule (centre)"
					class="font-mono"
				>
					$$...$$
				</Button>
			</div>
		{/if}

		<!-- Templates Section (Collapsible) -->
		{#if showTemplates && templatesSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<!-- Variable Button -->
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={insertVariable}
					{disabled}
					title="Variable"
					class="font-mono"
				>
					{'{{x}}'}
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Random Button -->
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={insertRandom}
					{disabled}
					title="Valeur aléatoire"
					class="font-mono"
				>
					{'{{1..10}}'}
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Eval Button -->
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={insertEval}
					{disabled}
					title="Expression évaluée"
					class="font-mono"
				>
					{'{{eval:}}'}
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<!-- Blank Field Button -->
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={insertBlank}
					{disabled}
					title="Champ à remplir"
					class="font-mono"
				>
					[____]
				</Button>
			</div>
		{/if}
	</div>

	<!-- Link Dialog -->
	{#if showLinkDialog}
		<div class="flex items-center gap-2 border-b border-border bg-muted/50 p-3">
			<Input
				type="url"
				bind:value={linkUrl}
				placeholder="https://exemple.com"
				class="flex-1"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						setLink();
					} else if (e.key === 'Escape') {
						showLinkDialog = false;
						linkUrl = '';
					}
				}}
			/>
			<Button type="button" size="sm" onclick={setLink}>Valider</Button>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				onclick={() => {
					showLinkDialog = false;
					linkUrl = '';
				}}>Annuler</Button
			>
		</div>
	{/if}

	<!-- Editor Content Area with Split View -->
	<div
		class="flex min-h-0 flex-1 {isPreviewMode ? 'flex-col md:flex-row' : ''}"
		style={isFullscreen ? '' : `min-height: ${minHeight}`}
	>
		<!-- Editor Panel -->
		<div
			class={isPreviewMode
				? 'h-1/2 min-h-0 overflow-y-auto md:h-full md:w-1/2 md:border-r md:border-border'
				: 'h-full w-full'}
		>
			<div bind:this={editorElement} class="h-full bg-background"></div>
		</div>

		<!-- Preview Panel -->
		{#if isPreviewMode}
			<div
				class="rich-text-preview relative h-1/2 overflow-y-auto border-t border-border bg-muted/20 p-4 md:h-full md:w-1/2 md:border-t-0"
			>
				<!-- Floating toggle button -->
				<button
					type="button"
					onclick={togglePreviewDisplayMode}
					class="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background shadow-sm transition-colors hover:bg-muted"
					title={previewDisplayMode === 'rendered' ? 'Voir le source' : 'Voir le rendu'}
					aria-label={previewDisplayMode === 'rendered'
						? 'Voir le source markdown'
						: 'Voir le rendu'}
				>
					{#if previewDisplayMode === 'rendered'}
						<FileCode class="h-4 w-4" />
					{:else}
						<Eye class="h-4 w-4" />
					{/if}
				</button>

				<MarkdownRenderer content={previewMarkdown} mode={previewDisplayMode} {genericFunctions} />
			</div>
		{/if}
	</div>
</div>

<!-- Image Configuration Dialog -->
{#if imageUpload}
	<Dialog.Root
		bind:open={imageDialogOpen}
		onOpenChange={(open) => {
			if (!open) closeImageDialog();
		}}
	>
		<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>Configurer l'image</Dialog.Title>
				<Dialog.Description>
					Ajustez les parametres d'affichage de votre image avant de l'inserer.
				</Dialog.Description>
			</Dialog.Header>

			<ImageAttributePanel
				initialUrl={uploadedImageUrl}
				initialAlt={uploadedImageAlt}
				onInsert={handleImageInsert}
			/>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	/* Task list styling */
	:global(.task-list) {
		list-style: none;
		padding-left: 0;
	}

	:global(.task-list li) {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	:global(.task-list li > label) {
		margin-top: 0.25rem;
	}

	:global(.task-list li > div) {
		flex: 1;
	}

	/*
	 * MathLive Integration - Seamless Inline Math
	 * ============================================
	 * Make math-field blend with surrounding text by removing all chrome
	 * and targeting MathLive's internal padding.
	 */

	/* Inline math wrapper - blend with text */
	:global(.math-inline-wrapper math-field) {
		display: inline-block;
		vertical-align: baseline;
		margin: 0 2px;
		font-size: inherit;
		line-height: 1;
		border: none;
		background: transparent;
		padding: 0;
		/* MathLive internal CSS variables */
		--_padding-vertical: 0;
		--_padding-horizontal: 0;
	}

	/* Hide MathLive UI buttons (menu and keyboard toggle) */
	:global(.math-inline-wrapper math-field::part(menu-toggle)),
	:global(.math-inline-wrapper math-field::part(virtual-keyboard-toggle)) {
		display: none;
	}

	/* Target MathLive internal elements to remove padding */
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

	/* Focus state - subtle underline */
	:global(.math-inline-wrapper math-field:focus) {
		outline: none;
		box-shadow: 0 2px 0 0 var(--color-primary, #3b82f6);
	}

	/* Block math - keep visually distinct */
	:global(.math-block-wrapper math-field) {
		display: block;
		width: 100%;
		border: 1px dashed var(--color-border, #e5e7eb);
		border-radius: 4px;
		margin: 0.5rem 0;
		padding: 0.75rem;
		background: var(--color-muted, #f9fafb);
		text-align: center;
		font-size: 1.2em;
	}

	/* Hide MathLive UI buttons in block math too */
	:global(.math-block-wrapper math-field::part(menu-toggle)),
	:global(.math-block-wrapper math-field::part(virtual-keyboard-toggle)) {
		display: none;
	}

	:global(.math-block-wrapper math-field:focus) {
		outline: 2px solid var(--color-ring, #3b82f6);
		outline-offset: 2px;
		border-color: var(--color-primary, #3b82f6);
		background: var(--color-background, #ffffff);
	}
</style>
