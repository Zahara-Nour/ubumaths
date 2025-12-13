<!--
	RichTextEditorUnified Component
	================================

	Unified rich text editor that combines RichTextEditor (chat mode) and
	FormRichTextEditor (form mode) into a single component.

	MODES:
	- 'form' (default): Bidirectional binding with value prop, no send button
	- 'chat': Send callback with JSON content, clears after send

	USAGE:
	<script>
		// Form mode (default)
		let content = $state('');
		<RichTextEditorUnified bind:value={content} />

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
		X
	} from 'lucide-svelte';
	import 'mathlive';

	// Shared configuration imports
	import {
		TEXT_COLORS,
		HIGHLIGHT_COLORS,
		EMOJI_CATEGORIES,
		MATH_TEMPLATES_FULL,
		MATH_TEMPLATES_BASIC
	} from './config';
	import { createEditorExtensions, getEditorProps } from './editor-config';
	import type { RichTextMode, MathTemplateLevel } from './types';

	// Component Props
	interface Props {
		mode?: RichTextMode;
		value?: string;
		jsonValue?: unknown;
		onSend?: (content: unknown) => void;
		mathTemplates?: MathTemplateLevel;
		showSendButton?: boolean;
		showClearButton?: boolean;
		minHeight?: string;
		disabled?: boolean;
	}

	let {
		mode = 'form',
		value = $bindable(''),
		jsonValue = $bindable(undefined),
		onSend,
		mathTemplates = 'full',
		showSendButton,
		showClearButton = true,
		minHeight = '100px',
		disabled = false
	}: Props = $props();

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

	// Get math templates based on level
	let mathTemplatesList = $derived(
		mathTemplates === 'full'
			? MATH_TEMPLATES_FULL
			: mathTemplates === 'basic'
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
	 * Initialize TipTap Editor
	 */
	onMount(async () => {
		if (!editorElement) return;

		// Disable MathLive sounds globally (client-side only)
		const { MathfieldElement } = await import('mathlive');
		MathfieldElement.soundsDirectory = null;

		const extensions = createEditorExtensions({ headingLevels: 6 });
		const editorProps = getEditorProps({ minHeight });

		// Prevent reactive updates during initialization
		isUpdatingFromProp = true;

		editor = new Editor({
			element: editorElement,
			extensions,
			content: mode === 'form' ? value || '' : '',
			editorProps,
			editable: !disabled,
			onUpdate: ({ editor: ed }) => {
				if (isUpdatingFromProp) return;

				// Update bound values in form mode
				if (mode === 'form') {
					value = ed.getHTML();
					if (jsonValue !== undefined) {
						jsonValue = ed.getJSON();
					}
				}
				updateFormattingState();
			},
			onSelectionUpdate: () => {
				updateFormattingState();
			}
		});

		// Allow reactive updates after initialization
		isUpdatingFromProp = false;

		updateFormattingState();

		return () => {
			editor?.destroy();
		};
	});

	/**
	 * Sync external value changes (form mode only)
	 */
	$effect(() => {
		if (mode !== 'form' || !editor || !value) return;

		// Avoid infinite loops
		const currentHtml = editor.getHTML();
		if (currentHtml !== value) {
			isUpdatingFromProp = true;
			editor.commands.setContent(value);
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
			value = '';
		}
	}

	/**
	 * Insert Math Formulas using custom commands
	 */
	function insertMathInline(latex: string = '') {
		// @ts-expect-error - Custom Tiptap command from math extension
		editor?.commands.insertMathInline(latex);
		editor?.commands.focus();
	}

	function insertMathBlock(latex: string = '') {
		// @ts-expect-error - Custom Tiptap command from math extension
		editor?.commands.insertMathBlock(latex);
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
</script>

<!--
	Editor Container with Organized Collapsible Toolbar
-->
<div class="overflow-hidden rounded-lg border border-border bg-card">
	<!-- Toolbar -->
	<div class="border-b border-border bg-muted/50">
		<!-- Main Toolbar Row -->
		<div class="flex flex-wrap items-center gap-1 p-2">
			<!-- Text Section Toggle -->
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

			<!-- Paragraph Section Toggle -->
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

			<!-- Insert Section Toggle -->
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

			<!-- Formule Section Toggle (only if mathTemplates !== 'none') -->
			{#if mathTemplates !== 'none'}
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

			<!-- More Dropdown (Advanced Features) -->
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
		{#if textSectionOpen}
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
		{#if paragraphSectionOpen}
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
		{#if insertSectionOpen}
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
			</div>
		{/if}

		<!-- Formule Section (Collapsible) - Only if mathTemplates !== 'none' -->
		{#if formuleSectionOpen && mathTemplates !== 'none'}
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

	<!-- Editor Content Area -->
	<div bind:this={editorElement} class="bg-background"></div>
</div>

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
