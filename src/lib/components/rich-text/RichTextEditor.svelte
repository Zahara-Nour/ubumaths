<!--
	RichTextEditor Component
	========================

	Comprehensive rich text editor with mathematical formula support for educational use.
	Built with TipTap (ProseMirror) and MathLive integration.

	TOOLBAR ORGANIZATION:
	- Collapsible sections (Texte, Paragraphe, Insertion, Formule)
	- Always-visible: "Plus" dropdown, "Effacer", "Envoyer"
	- Chevron icons indicate section state (▼ = open, ▶ = closed)

	FEATURES BY SECTION:

	📝 Texte (default: open):
		- Bold, Italic, Underline, Strikethrough, Code
		- Subscript, Superscript

	¶ Paragraphe:
		- Headings (H1-H6) with dropdown
		- Text alignment (left, center, right, justify)

	➕ Insertion:
		- Lists: Bullet, Ordered, Task (checkboxes)
		- Text color picker (8 preset colors)
		- Text highlighting (6 preset colors + clear)
		- Hyperlinks with inline URL dialog
		- Emoji picker (200+ curated emojis in 8 categories)

	Σ Formule:
		- Empty formula button
		- 9 math templates with icon buttons (ᵃ⁄ᵦ, √x, xⁿ, xᵢ, ∫, ∑, lim, f', ±)
		- Block formula button (centered equations)
		- Auto-detection of $$...$$ patterns

	⋯ Plus (dropdown):
		- Blockquote (citations)
		- Code block (multi-line code)
		- Horizontal rule (separator)

	REACTIVE HIGHLIGHTING:
	All formatting buttons show active state when cursor is on formatted text.
	Uses updateFormattingState() called on selection changes.

	EMOJI CATEGORIES:
	1. Smileys (37) - Emotions and expressions
	2. Feedback (17) - Hand gestures for interaction
	3. Math & Science (17) - Educational tools and symbols
	4. School (23) - Study materials and supplies
	5. Stars & Symbols (21) - Achievement markers
	6. Shapes (26) - Geometric shapes and colors
	7. Arrows (19) - Direction indicators
	8. Nature (22) - Weather and elements

	@see src/lib/extensions/math-extension.ts for math node implementations
	@see src/lib/components/rich-text/README.md for complete documentation
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Underline from '@tiptap/extension-underline';
	import TextAlign from '@tiptap/extension-text-align';
	import { TextStyle } from '@tiptap/extension-text-style';
	import Color from '@tiptap/extension-color';
	import Highlight from '@tiptap/extension-highlight';
	import Link from '@tiptap/extension-link';
	import Subscript from '@tiptap/extension-subscript';
	import Superscript from '@tiptap/extension-superscript';
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import { MathInline, MathBlock } from '$lib/extensions/math-extension';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
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
		Smile
	} from 'lucide-svelte';
	import 'mathlive';

	// Component Props
	interface Props {
		onSend?: (content: any) => void;
		placeholder?: string;
	}

	let { onSend }: Props = $props();

	// Editor State
	let editorElement = $state<HTMLElement | null>(null);
	let editor = $state<Editor | null>(null);

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

	// Math templates with icon representations
	const mathTemplates = [
		{ label: 'Fraction', latex: '\\frac{a}{b}', icon: 'ᵃ⁄ᵦ', title: 'Fraction' },
		{ label: 'Racine carrée', latex: '\\sqrt{x}', icon: '√x', title: 'Racine carrée' },
		{ label: 'Puissance', latex: 'x^{n}', icon: 'xⁿ', title: 'Puissance' },
		{ label: 'Indice', latex: 'x_{i}', icon: 'xᵢ', title: 'Indice' },
		{ label: 'Intégrale', latex: '\\int_{a}^{b} f(x) dx', icon: '∫', title: 'Intégrale' },
		{ label: 'Somme', latex: '\\sum_{i=1}^{n} x_i', icon: '∑', title: 'Somme' },
		{ label: 'Limite', latex: '\\lim_{x \\to \\infty} f(x)', icon: 'lim', title: 'Limite' },
		{ label: 'Dérivée', latex: '\\frac{d}{dx} f(x)', icon: "f'", title: 'Dérivée' },
		{ label: 'Équation du 2nd degré', latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', icon: '±', title: 'Équation du 2nd degré' }
	];

	// Color palettes
	const colors = [
		'#000000',
		'#ef4444',
		'#f97316',
		'#eab308',
		'#22c55e',
		'#3b82f6',
		'#8b5cf6',
		'#ec4899'
	];

	const highlights = [
		'',
		'#fef3c7',
		'#fecaca',
		'#d9f99d',
		'#bfdbfe',
		'#e9d5ff',
		'#fbcfe8'
	];

	/**
	 * Curated Emoji Categories for Educational Use
	 * ==============================================
	 *
	 * 200+ carefully selected emojis organized into 8 categories.
	 * No external emoji libraries - uses native Unicode emojis.
	 *
	 * Category Selection Rationale:
	 * - Smileys: Student/teacher expression and engagement
	 * - Feedback: Quick positive/negative responses
	 * - Math & Science: Domain-specific educational symbols
	 * - School: Study materials and academic context
	 * - Stars & Symbols: Achievement marking and feedback
	 * - Shapes: Visual representation and color coding
	 * - Arrows: Directional indicators for problem-solving
	 * - Nature: Universal symbols for context setting
	 */
	const emojiCategories = [
		{
			name: 'Smileys',
			emojis: ['😊', '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😉', '😌', '😍', '🥰', '😘', '😋', '😎', '🤓', '🧐', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😬', '😮', '😯', '😲', '😳', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😱']
		},
		{
			name: 'Feedback',
			emojis: ['👍', '👎', '👏', '🙌', '👌', '✌️', '🤞', '🤝', '🙏', '✋', '🤚', '👋', '💪', '✊', '👊', '🤜', '🤛']
		},
		{
			name: 'Math & Science',
			emojis: ['📐', '📏', '📊', '📈', '📉', '🔬', '🔭', '⚗️', '🧮', '🧬', '⚛️', '🔢', '➕', '➖', '✖️', '➗', '🟰']
		},
		{
			name: 'School',
			emojis: ['📚', '📖', '📝', '✏️', '✒️', '🖊️', '🖍️', '📒', '📓', '📔', '📕', '📗', '📘', '📙', '🎓', '🎒', '🏫', '💡', '🧠', '📌', '📍', '✂️', '📎']
		},
		{
			name: 'Stars & Symbols',
			emojis: ['⭐', '🌟', '✨', '💫', '🔥', '💥', '✅', '❌', '⚠️', '❗', '❓', '❕', '❔', '💯', '🎯', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅']
		},
		{
			name: 'Shapes',
			emojis: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘']
		},
		{
			name: 'Arrows',
			emojis: ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔀', '🔁', '🔂']
		},
		{
			name: 'Nature',
			emojis: ['🌞', '🌝', '🌛', '⭐', '🌟', '💫', '✨', '🌍', '🌎', '🌏', '🌈', '☀️', '⛅', '☁️', '🌧️', '⛈️', '🌩️', '⚡', '❄️', '🔥', '💧', '🌊']
		}
	];

	// Currently selected emoji category (0-7 index)
	let selectedEmojiCategory = $state(0);

	/**
	 * Update Formatting State
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
	onMount(() => {
		if (!editorElement) return;

		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit.configure({
					heading: {
						levels: [1, 2, 3, 4, 5, 6]
					}
				}),
				Underline,
				TextAlign.configure({
					types: ['heading', 'paragraph']
				}),
				TextStyle,
				Color,
				Highlight.configure({ multicolor: true }),
				Link.configure({
					openOnClick: false,
					HTMLAttributes: {
						class: 'text-primary underline cursor-pointer'
					}
				}),
				Subscript,
				Superscript,
				TaskList,
				TaskItem.configure({
					nested: true
				}),
				MathInline,
				MathBlock
			],
			content: '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3'
				}
			},
			onUpdate: () => {
				updateFormattingState();
			},
			onSelectionUpdate: () => {
				updateFormattingState();
			}
		});

		updateFormattingState();

		return () => {
			editor?.destroy();
		};
	});

	/**
	 * Handle Send Button
	 */
	function handleSend() {
		if (!editor) return;

		const content = editor.getJSON();

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
	}

	/**
	 * Insert Math Formulas
	 */
	function insertMathInline(latex: string = '') {
		editor?.commands.insertMathInline(latex);
		editor?.commands.focus();
	}

	function insertMathBlock(latex: string = '') {
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
			editor?.chain().focus().setHeading({ level }).run();
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
	function setHighlight(color: string) {
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
<div class="border border-border rounded-lg bg-card overflow-hidden">
	<!-- Toolbar -->
	<div class="border-b border-border bg-muted/50">
		<!-- Main Toolbar Row -->
		<div class="flex flex-wrap items-center gap-1 p-2">
			<!-- Text Section Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (textSectionOpen = !textSectionOpen)}
				class="font-medium"
				disabled={!editor}
			>
				<Type class="h-4 w-4 mr-1" />
				Texte
				{#if textSectionOpen}
					<ChevronDown class="h-3 w-3 ml-1" />
				{:else}
					<ChevronRight class="h-3 w-3 ml-1" />
				{/if}
			</Button>

			<!-- Paragraph Section Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (paragraphSectionOpen = !paragraphSectionOpen)}
				class="font-medium"
				disabled={!editor}
			>
				<PilcrowSquare class="h-4 w-4 mr-1" />
				Paragraphe
				{#if paragraphSectionOpen}
					<ChevronDown class="h-3 w-3 ml-1" />
				{:else}
					<ChevronRight class="h-3 w-3 ml-1" />
				{/if}
			</Button>

			<!-- Insert Section Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (insertSectionOpen = !insertSectionOpen)}
				class="font-medium"
				disabled={!editor}
			>
				<Plus class="h-4 w-4 mr-1" />
				Insertion
				{#if insertSectionOpen}
					<ChevronDown class="h-3 w-3 ml-1" />
				{:else}
					<ChevronRight class="h-3 w-3 ml-1" />
				{/if}
			</Button>

			<!-- Formule Section Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (formuleSectionOpen = !formuleSectionOpen)}
				class="font-medium"
				disabled={!editor}
			>
				<Sigma class="h-4 w-4 mr-1" />
				Formule
				{#if formuleSectionOpen}
					<ChevronDown class="h-3 w-3 ml-1" />
				{:else}
					<ChevronRight class="h-3 w-3 ml-1" />
				{/if}
			</Button>

			<!-- More Dropdown (Advanced Features) -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
					disabled={!editor}
				>
					<MoreHorizontal class="h-4 w-4" />
					Plus
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Label>Blocs spéciaux</DropdownMenu.Label>
					<DropdownMenu.Item
						onclick={() => editor?.chain().focus().toggleBlockquote().run()}
						class={isBlockquote ? 'bg-accent' : ''}
					>
						<Quote class="h-4 w-4 mr-2" />
						Citation
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
						class={isCodeBlock ? 'bg-accent' : ''}
					>
						<CodeSquare class="h-4 w-4 mr-2" />
						Bloc de code
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => editor?.chain().focus().setHorizontalRule().run()}>
						<Minus class="h-4 w-4 mr-2" />
						Ligne horizontale
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Action Buttons (Always Visible) -->
			<Button variant="ghost" size="sm" onclick={handleClear} disabled={!editor}>
				<Eraser class="h-4 w-4 mr-1" />
				Effacer
			</Button>

			<Button size="sm" onclick={handleSend} disabled={!editor}> Envoyer </Button>
		</div>

		<!-- Text Section (Collapsible) -->
		{#if textSectionOpen}
			<div class="flex flex-wrap items-center gap-1 px-2 pb-2 border-t border-border/50 pt-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleBold().run()}
					class={isBold ? 'bg-accent' : ''}
					disabled={!editor}
					title="Gras"
				>
					<Bold class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					class={isItalic ? 'bg-accent' : ''}
					disabled={!editor}
					title="Italique"
				>
					<Italic class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleUnderline().run()}
					class={isUnderline ? 'bg-accent' : ''}
					disabled={!editor}
					title="Souligné"
				>
					<UnderlineIcon class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleStrike().run()}
					class={isStrike ? 'bg-accent' : ''}
					disabled={!editor}
					title="Barré"
				>
					<Strikethrough class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleCode().run()}
					class={isCode ? 'bg-accent' : ''}
					disabled={!editor}
					title="Code inline"
				>
					<Code class="h-4 w-4" />
				</Button>

				<div class="w-px h-6 bg-border mx-1"></div>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleSubscript().run()}
					class={isSubscript ? 'bg-accent' : ''}
					disabled={!editor}
					title="Indice"
				>
					<SubscriptIcon class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleSuperscript().run()}
					class={isSuperscript ? 'bg-accent' : ''}
					disabled={!editor}
					title="Exposant"
				>
					<SuperscriptIcon class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Paragraph Section (Collapsible) -->
		{#if paragraphSectionOpen}
			<div class="flex flex-wrap items-center gap-1 px-2 pb-2 border-t border-border/50 pt-2">
				<!-- Headings Dropdown -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 {currentHeading
							? 'bg-accent'
							: ''}"
						disabled={!editor}
					>
						<Heading class="h-4 w-4 mr-1" />
						{#if currentHeading}
							<span>H{currentHeading}</span>
						{:else}
							<span>Titre</span>
						{/if}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item onclick={() => editor?.chain().focus().setParagraph().run()}>
							Paragraphe
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						{#each [1, 2, 3, 4, 5, 6] as level}
							<DropdownMenu.Item onclick={() => setHeading(level)}>
								Titre {level}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<div class="w-px h-6 bg-border mx-1"></div>

				<!-- Text Alignment -->
				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('left').run()}
					class={currentAlignment === 'left' ? 'bg-accent' : ''}
					disabled={!editor}
					title="Aligner à gauche"
				>
					<AlignLeft class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('center').run()}
					class={currentAlignment === 'center' ? 'bg-accent' : ''}
					disabled={!editor}
					title="Centrer"
				>
					<AlignCenter class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('right').run()}
					class={currentAlignment === 'right' ? 'bg-accent' : ''}
					disabled={!editor}
					title="Aligner à droite"
				>
					<AlignRight class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().setTextAlign('justify').run()}
					class={currentAlignment === 'justify' ? 'bg-accent' : ''}
					disabled={!editor}
					title="Justifier"
				>
					<AlignJustify class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Insert Section (Collapsible) -->
		{#if insertSectionOpen}
			<div class="flex flex-wrap items-center gap-1 px-2 pb-2 border-t border-border/50 pt-2">
				<!-- Lists -->
				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleBulletList().run()}
					class={isBulletList ? 'bg-accent' : ''}
					disabled={!editor}
					title="Liste à puces"
				>
					<List class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleOrderedList().run()}
					class={isOrderedList ? 'bg-accent' : ''}
					disabled={!editor}
					title="Liste numérotée"
				>
					<ListOrdered class="h-4 w-4" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={() => editor?.chain().focus().toggleTaskList().run()}
					class={isTaskList ? 'bg-accent' : ''}
					disabled={!editor}
					title="Liste de tâches"
				>
					<ListTodo class="h-4 w-4" />
				</Button>

				<div class="w-px h-6 bg-border mx-1"></div>

				<!-- Color Picker -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
						disabled={!editor}
					>
						<Palette class="h-4 w-4" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Label>Couleur du texte</DropdownMenu.Label>
						<div class="grid grid-cols-4 gap-1 p-2">
							{#each colors as color}
								<button
									onclick={() => setColor(color)}
									class="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
									style="background-color: {color}"
									title={color}
								></button>
							{/each}
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<!-- Highlight Picker -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
						disabled={!editor}
					>
						<Highlighter class="h-4 w-4" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Label>Surlignage</DropdownMenu.Label>
						<div class="grid grid-cols-4 gap-1 p-2">
							{#each highlights as color, i}
								<button
									onclick={() => setHighlight(color)}
									class="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
									style="background-color: {color || 'transparent'}"
									title={i === 0 ? 'Aucun' : color}
								>
									{#if i === 0}
										<span class="text-xs">✕</span>
									{/if}
								</button>
							{/each}
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<div class="w-px h-6 bg-border mx-1"></div>

				<!-- Link -->
				<Button
					variant="ghost"
					size="sm"
					onclick={toggleLink}
					class={editor?.isActive('link') ? 'bg-accent' : ''}
					disabled={!editor}
					title="Lien"
				>
					<LinkIcon class="h-4 w-4" />
				</Button>

				<div class="w-px h-6 bg-border mx-1"></div>

				<!-- Emoji Picker -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3"
						disabled={!editor}
					>
						<Smile class="h-4 w-4" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-80">
						<!-- Emoji Category Tabs -->
						<div class="flex border-b border-border mb-2">
							{#each emojiCategories as category, index}
								<button
									onclick={() => (selectedEmojiCategory = index)}
									class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent {selectedEmojiCategory ===
									index
										? 'border-b-2 border-primary text-primary'
										: 'text-muted-foreground'}"
								>
									{category.name}
								</button>
							{/each}
						</div>
						<!-- Emoji Grid -->
						<div class="grid grid-cols-8 gap-1 p-2 max-h-64 overflow-y-auto">
							{#each emojiCategories[selectedEmojiCategory].emojis as emoji}
								<button
									onclick={() => insertEmoji(emoji)}
									class="text-2xl hover:bg-accent rounded p-1 transition-colors"
									title={emoji}
								>
									{emoji}
								</button>
							{/each}
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/if}

		<!-- Formule Section (Collapsible) -->
		{#if formuleSectionOpen}
			<div class="flex flex-wrap items-center gap-1 px-2 pb-2 border-t border-border/50 pt-2">
				<!-- Empty Formula Button -->
				<Button
					variant="ghost"
					size="sm"
					onclick={() => insertMathInline()}
					disabled={!editor}
					title="Formule vide"
					class="font-mono"
				>
					∅
				</Button>

				<div class="w-px h-6 bg-border mx-1"></div>

				<!-- Math Template Buttons -->
				{#each mathTemplates as template}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => insertMathInline(template.latex)}
						disabled={!editor}
						title={template.title}
						class="font-mono text-base"
					>
						{template.icon}
					</Button>
				{/each}

				<div class="w-px h-6 bg-border mx-1"></div>

				<!-- Block Formula Button -->
				<Button
					variant="ghost"
					size="sm"
					onclick={() => insertMathBlock()}
					disabled={!editor}
					title="Bloc de formule (centré)"
					class="font-mono"
				>
					⬚
				</Button>
			</div>
		{/if}
	</div>

	<!-- Link Dialog -->
	{#if showLinkDialog}
		<div class="p-3 bg-muted/50 border-b border-border flex items-center gap-2">
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
			<Button size="sm" onclick={setLink}>Valider</Button>
			<Button
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
