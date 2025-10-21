<!--
	FormRichTextEditor Component
	============================

	Rich text editor for forms with bidirectional binding support.
	Based on RichTextEditor but adapted for form usage (no send button, persistent content).

	FEATURES:
	- Bidirectional binding with $bindable()
	- Initial content loading
	- Auto-save on content change
	- All formatting features from RichTextEditor
	- Math formula support with MathLive

	USAGE:
	<script>
		import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
		let description = $state('Initial HTML content');
	</script>

	<FormRichTextEditor bind:value={description} placeholder="Enter description..." />
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
		Heading1,
		Heading2,
		Heading3,
		AlignLeft,
		AlignCenter,
		AlignRight,
		AlignJustify,
		List,
		ListOrdered,
		ListTodo,
		Palette,
		Highlighter,
		Link as LinkIcon,
		Smile,
		Quote,
		Code2,
		Minus,
		ChevronDown,
		ChevronRight,
		X
	} from 'lucide-svelte';

	// Component Props
	interface Props {
		value?: string;
		placeholder?: string;
	}

	let { value = $bindable(''), placeholder = 'Entrez votre texte...' }: Props = $props();

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
	let currentAlignment = $state<'left' | 'center' | 'right' | 'justify'>('left');
	let currentHeading = $state<number | null>(null);

	// Color picker state
	let showColorPicker = $state(false);
	let showHighlightPicker = $state(false);

	// Link dialog state
	let showLinkDialog = $state(false);
	let linkUrl = $state('');

	// Emoji picker state
	let showEmojiPicker = $state(false);

	/**
	 * Color palette (same as RichTextEditor)
	 */
	const textColors = [
		{ name: 'Noir', value: '#000000' },
		{ name: 'Rouge', value: '#ef4444' },
		{ name: 'Bleu', value: '#3b82f6' },
		{ name: 'Vert', value: '#22c55e' },
		{ name: 'Orange', value: '#f97316' },
		{ name: 'Violet', value: '#a855f7' },
		{ name: 'Rose', value: '#ec4899' },
		{ name: 'Gris', value: '#6b7280' }
	];

	const highlightColors = [
		{ name: 'Aucun', value: null },
		{ name: 'Jaune', value: '#fef08a' },
		{ name: 'Vert', value: '#bbf7d0' },
		{ name: 'Bleu', value: '#bfdbfe' },
		{ name: 'Rose', value: '#fbcfe8' },
		{ name: 'Orange', value: '#fed7aa' },
		{ name: 'Violet', value: '#e9d5ff' }
	];

	/**
	 * Emoji categories (same as RichTextEditor)
	 */
	const emojiCategories = [
		{
			name: 'Smileys',
			emojis: [
				'😀',
				'😃',
				'😄',
				'😁',
				'😅',
				'😂',
				'🤣',
				'😊',
				'😇',
				'🙂',
				'🙃',
				'😉',
				'😌',
				'😍',
				'🥰',
				'😘',
				'😗',
				'😙',
				'😚',
				'😋',
				'😛',
				'😝',
				'😜',
				'🤪',
				'🤨',
				'🧐',
				'🤓',
				'😎',
				'🥳',
				'😏',
				'😒',
				'😞',
				'😔',
				'😟',
				'😕',
				'🙁',
				'😢'
			]
		},
		{
			name: 'Feedback',
			emojis: [
				'👍',
				'👎',
				'👏',
				'🙌',
				'👌',
				'🤝',
				'🙏',
				'✌️',
				'🤞',
				'🤟',
				'🤘',
				'👊',
				'✊',
				'🤛',
				'🤜',
				'💪',
				'🦾'
			]
		},
		{
			name: 'Math & Science',
			emojis: [
				'🔢',
				'➕',
				'➖',
				'✖️',
				'➗',
				'🟰',
				'💯',
				'🔬',
				'🧪',
				'🧬',
				'🔭',
				'📐',
				'📏',
				'📊',
				'📈',
				'📉',
				'⚗️'
			]
		},
		{
			name: 'School',
			emojis: [
				'📚',
				'📖',
				'📝',
				'✏️',
				'📓',
				'📔',
				'📕',
				'📗',
				'📘',
				'📙',
				'📄',
				'📃',
				'🗒️',
				'📋',
				'🎓',
				'🎒',
				'🖊️',
				'🖍️',
				'📌',
				'📍',
				'✂️',
				'🧷',
				'🗂️'
			]
		},
		{
			name: 'Stars & Symbols',
			emojis: [
				'⭐',
				'🌟',
				'✨',
				'💫',
				'🏆',
				'🥇',
				'🥈',
				'🥉',
				'🏅',
				'🎖️',
				'🎯',
				'✅',
				'❌',
				'⚠️',
				'💡',
				'🔥',
				'💥',
				'🎉',
				'🎊',
				'🎁',
				'💝'
			]
		},
		{
			name: 'Shapes',
			emojis: [
				'🔴',
				'🟠',
				'🟡',
				'🟢',
				'🔵',
				'🟣',
				'🟤',
				'⚫',
				'⚪',
				'🟥',
				'🟧',
				'🟨',
				'🟩',
				'🟦',
				'🟪',
				'🟫',
				'⬛',
				'⬜',
				'🔶',
				'🔷',
				'🔸',
				'🔹',
				'🔺',
				'🔻',
				'💠',
				'🔘'
			]
		},
		{
			name: 'Arrows',
			emojis: [
				'⬆️',
				'↗️',
				'➡️',
				'↘️',
				'⬇️',
				'↙️',
				'⬅️',
				'↖️',
				'↕️',
				'↔️',
				'↩️',
				'↪️',
				'⤴️',
				'⤵️',
				'🔄',
				'🔃',
				'🔁',
				'🔂',
				'▶️'
			]
		},
		{
			name: 'Nature',
			emojis: [
				'🌍',
				'🌎',
				'🌏',
				'🌙',
				'⭐',
				'☀️',
				'⛅',
				'☁️',
				'⛈️',
				'🌧️',
				'⚡',
				'❄️',
				'🔥',
				'💧',
				'🌊',
				'🌈',
				'🌪️',
				'🌀',
				'☃️',
				'⛄',
				'💨',
				'🌫️'
			]
		}
	];

	/**
	 * Initialize editor with content
	 */
	onMount(() => {
		if (!editorElement) return;

		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit.configure({
					heading: {
						levels: [1, 2, 3]
					}
				}),
				Underline,
				TextAlign.configure({
					types: ['heading', 'paragraph']
				}),
				TextStyle,
				Color,
				Highlight.configure({
					multicolor: true
				}),
				Link.configure({
					openOnClick: false,
					HTMLAttributes: {
						class: 'text-primary underline cursor-pointer'
					}
				}),
				Subscript,
				Superscript,
				TaskList.configure({
					HTMLAttributes: {
						class: 'task-list'
					}
				}),
				TaskItem.configure({
					nested: true
				}),
				MathInline,
				MathBlock
			],
			content: value || '',
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3'
				}
			},
			onUpdate: ({ editor }) => {
				// Update value on content change
				value = editor.getHTML();
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

		// Heading level
		if (editor.isActive('heading', { level: 1 })) currentHeading = 1;
		else if (editor.isActive('heading', { level: 2 })) currentHeading = 2;
		else if (editor.isActive('heading', { level: 3 })) currentHeading = 3;
		else currentHeading = null;

		// Text alignment
		if (editor.isActive({ textAlign: 'left' })) currentAlignment = 'left';
		else if (editor.isActive({ textAlign: 'center' })) currentAlignment = 'center';
		else if (editor.isActive({ textAlign: 'right' })) currentAlignment = 'right';
		else if (editor.isActive({ textAlign: 'justify' })) currentAlignment = 'justify';
		else currentAlignment = 'left';
	}

	/**
	 * Toolbar action functions
	 */
	function toggleBold() {
		editor?.chain().focus().toggleBold().run();
	}

	function toggleItalic() {
		editor?.chain().focus().toggleItalic().run();
	}

	function toggleUnderline() {
		editor?.chain().focus().toggleUnderline().run();
	}

	function toggleStrike() {
		editor?.chain().focus().toggleStrikethrough().run();
	}

	function toggleCode() {
		editor?.chain().focus().toggleCode().run();
	}

	function toggleSubscript() {
		editor?.chain().focus().toggleSubscript().run();
	}

	function toggleSuperscript() {
		editor?.chain().focus().toggleSuperscript().run();
	}

	function setHeading(level: 1 | 2 | 3) {
		editor?.chain().focus().toggleHeading({ level }).run();
	}

	function setParagraph() {
		editor?.chain().focus().setParagraph().run();
	}

	function setAlignment(align: 'left' | 'center' | 'right' | 'justify') {
		editor?.chain().focus().setTextAlign(align).run();
	}

	function toggleBulletList() {
		editor?.chain().focus().toggleBulletList().run();
	}

	function toggleOrderedList() {
		editor?.chain().focus().toggleOrderedList().run();
	}

	function toggleTaskList() {
		editor?.chain().focus().toggleTaskList().run();
	}

	function setTextColor(color: string) {
		editor?.chain().focus().setColor(color).run();
		showColorPicker = false;
	}

	function setHighlight(color: string | null) {
		if (color === null) {
			editor?.chain().focus().unsetHighlight().run();
		} else {
			editor?.chain().focus().setHighlight({ color }).run();
		}
		showHighlightPicker = false;
	}

	function insertLink() {
		if (linkUrl) {
			editor?.chain().focus().setLink({ href: linkUrl }).run();
		}
		showLinkDialog = false;
		linkUrl = '';
	}

	function removeLink() {
		editor?.chain().focus().unsetLink().run();
	}

	function insertEmoji(emoji: string) {
		editor?.chain().focus().insertContent(emoji).run();
		showEmojiPicker = false;
	}

	function toggleBlockquote() {
		editor?.chain().focus().toggleBlockquote().run();
	}

	function insertCodeBlock() {
		editor?.chain().focus().toggleCodeBlock().run();
	}

	function insertHorizontalRule() {
		editor?.chain().focus().setHorizontalRule().run();
	}

	function insertMathInline(template?: string) {
		const content = template || '';
		editor?.chain().focus().insertContent(`<math-inline latex="${content}"></math-inline>`).run();
	}

	function insertMathBlock() {
		editor?.chain().focus().insertContent('<math-block latex=""></math-block>').run();
	}

	function clearFormatting() {
		editor?.chain().focus().clearNodes().unsetAllMarks().run();
	}
</script>

<div class="rounded-lg border border-border bg-background">
	<!-- Toolbar -->
	<div class="border-b border-border bg-muted/30 p-2">
		<div class="flex flex-wrap items-center gap-1">
			<!-- Text Formatting Section -->
			<div class="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => (textSectionOpen = !textSectionOpen)}
				>
					{#if textSectionOpen}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</Button>
				<span class="text-xs font-medium">Texte</span>
			</div>

			{#if textSectionOpen}
				<div class="mx-1 h-6 w-px bg-border"></div>
				<Button
					type="button"
					variant={isBold ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleBold}
				>
					<Bold class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isItalic ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleItalic}
				>
					<Italic class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isUnderline ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleUnderline}
				>
					<UnderlineIcon class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isStrike ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleStrike}
				>
					<Strikethrough class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isCode ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleCode}
				>
					<Code class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isSubscript ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleSubscript}
				>
					<SubscriptIcon class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isSuperscript ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleSuperscript}
				>
					<SuperscriptIcon class="h-4 w-4" />
				</Button>
			{/if}

			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- Paragraph Section -->
			<div class="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => (paragraphSectionOpen = !paragraphSectionOpen)}
				>
					{#if paragraphSectionOpen}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</Button>
				<span class="text-xs font-medium">Paragraphe</span>
			</div>

			{#if paragraphSectionOpen}
				<div class="mx-1 h-6 w-px bg-border"></div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} type="button" variant="ghost" size="sm" class="h-8 gap-1 px-2">
								{#if currentHeading === 1}
									<Heading1 class="h-4 w-4" />
								{:else if currentHeading === 2}
									<Heading2 class="h-4 w-4" />
								{:else if currentHeading === 3}
									<Heading3 class="h-4 w-4" />
								{:else}
									<span class="text-xs">Normal</span>
								{/if}
								<ChevronDown class="h-3 w-3" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item onclick={() => setParagraph()}>Normal</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => setHeading(1)}>
							<Heading1 class="mr-2 h-4 w-4" />
							Titre 1
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => setHeading(2)}>
							<Heading2 class="mr-2 h-4 w-4" />
							Titre 2
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => setHeading(3)}>
							<Heading3 class="mr-2 h-4 w-4" />
							Titre 3
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<Button
					type="button"
					variant={currentAlignment === 'left' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => setAlignment('left')}
				>
					<AlignLeft class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={currentAlignment === 'center' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => setAlignment('center')}
				>
					<AlignCenter class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={currentAlignment === 'right' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => setAlignment('right')}
				>
					<AlignRight class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={currentAlignment === 'justify' ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => setAlignment('justify')}
				>
					<AlignJustify class="h-4 w-4" />
				</Button>
			{/if}

			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- Insert Section -->
			<div class="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => (insertSectionOpen = !insertSectionOpen)}
				>
					{#if insertSectionOpen}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</Button>
				<span class="text-xs font-medium">Insertion</span>
			</div>

			{#if insertSectionOpen}
				<div class="mx-1 h-6 w-px bg-border"></div>
				<Button
					type="button"
					variant={isBulletList ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleBulletList}
				>
					<List class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isOrderedList ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleOrderedList}
				>
					<ListOrdered class="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={isTaskList ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0"
					onclick={toggleTaskList}
				>
					<ListTodo class="h-4 w-4" />
				</Button>

				<!-- Color Picker -->
				<div class="relative">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						onclick={() => (showColorPicker = !showColorPicker)}
					>
						<Palette class="h-4 w-4" />
					</Button>
					{#if showColorPicker}
						<div
							class="absolute top-full left-0 z-50 mt-1 rounded-lg border border-border bg-popover p-2 shadow-md"
						>
							<div class="grid grid-cols-4 gap-1">
								{#each textColors as color}
									<button
										type="button"
										class="h-6 w-6 rounded border border-border"
										style="background-color: {color.value}"
										onclick={() => setTextColor(color.value)}
										title={color.name}
									></button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Highlight Picker -->
				<div class="relative">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						onclick={() => (showHighlightPicker = !showHighlightPicker)}
					>
						<Highlighter class="h-4 w-4" />
					</Button>
					{#if showHighlightPicker}
						<div
							class="absolute top-full left-0 z-50 mt-1 rounded-lg border border-border bg-popover p-2 shadow-md"
						>
							<div class="grid grid-cols-4 gap-1">
								{#each highlightColors as color}
									<button
										type="button"
										class="h-6 w-6 rounded border border-border"
										style="background-color: {color.value || 'transparent'}"
										onclick={() => setHighlight(color.value)}
										title={color.name}
									>
										{#if color.value === null}
											<X class="h-3 w-3 text-muted-foreground" />
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Link Dialog -->
				{#if !showLinkDialog}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						onclick={() => (showLinkDialog = true)}
					>
						<LinkIcon class="h-4 w-4" />
					</Button>
				{:else}
					<div class="flex items-center gap-1 rounded bg-muted p-1">
						<Input
							type="url"
							bind:value={linkUrl}
							placeholder="https://..."
							class="h-7 w-48 text-xs"
						/>
						<Button type="button" size="sm" class="h-7 px-2" onclick={insertLink}>OK</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							class="h-7 w-7 p-0"
							onclick={() => {
								showLinkDialog = false;
								linkUrl = '';
							}}
						>
							<X class="h-3 w-3" />
						</Button>
					</div>
				{/if}

				<!-- Emoji Picker -->
				<div class="relative">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						onclick={() => (showEmojiPicker = !showEmojiPicker)}
					>
						<Smile class="h-4 w-4" />
					</Button>
					{#if showEmojiPicker}
						<div
							class="absolute top-full left-0 z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-md"
						>
							{#each emojiCategories as category}
								<div class="mb-2">
									<p class="mb-1 text-xs font-medium text-muted-foreground">{category.name}</p>
									<div class="grid grid-cols-8 gap-1">
										{#each category.emojis as emoji}
											<button
												type="button"
												class="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
												onclick={() => insertEmoji(emoji)}
											>
												{emoji}
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- Formula Section -->
			<div class="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={() => (formuleSectionOpen = !formuleSectionOpen)}
				>
					{#if formuleSectionOpen}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</Button>
				<span class="text-xs font-medium">Formule</span>
			</div>

			{#if formuleSectionOpen}
				<div class="mx-1 h-6 w-px bg-border"></div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 px-2"
					onclick={() => insertMathInline()}
				>
					<span class="text-xs">$$...$$</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 px-2"
					onclick={() => insertMathInline('\\frac{a}{b}')}
					title="Fraction"
				>
					<span class="text-xs">ᵃ⁄ᵦ</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 px-2"
					onclick={() => insertMathInline('\\sqrt{x}')}
					title="Racine carrée"
				>
					<span class="text-xs">√x</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 px-2"
					onclick={() => insertMathInline('x^{n}')}
					title="Exposant"
				>
					<span class="text-xs">xⁿ</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 px-2"
					onclick={() => insertMathInline('x_{i}')}
					title="Indice"
				>
					<span class="text-xs">xᵢ</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-8 px-2"
					onclick={insertMathBlock}
					title="Formule en bloc"
				>
					<span class="text-xs">Bloc</span>
				</Button>
			{/if}

			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- More menu -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} type="button" variant="ghost" size="sm" class="h-8 px-2">
							<span class="text-xs">Plus</span>
							<ChevronDown class="ml-1 h-3 w-3" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item onclick={toggleBlockquote}>
						<Quote class="mr-2 h-4 w-4" />
						Citation
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={insertCodeBlock}>
						<Code2 class="mr-2 h-4 w-4" />
						Bloc de code
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={insertHorizontalRule}>
						<Minus class="mr-2 h-4 w-4" />
						Ligne horizontale
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="h-8 px-2"
				onclick={clearFormatting}
				title="Effacer le formatage"
			>
				<span class="text-xs">Effacer</span>
			</Button>
		</div>
	</div>

	<!-- Editor -->
	<div bind:this={editorElement} class="min-h-[150px]"></div>
</div>

<style>
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
</style>
