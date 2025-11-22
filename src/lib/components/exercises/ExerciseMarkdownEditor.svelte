<!--
	ExerciseMarkdownEditor Component
	==================================

	Markdown editor for mathematical exercises with live preview.
	Built specifically for the exercise bank system.

	FEATURES:
	- Raw markdown editing with syntax highlighting
	- Toolbar with markdown shortcuts
	- Live preview with MathLive rendering
	- Support for math ($...$, $$...$$), lists, tables, images
	- Split view: editor + preview
	- Variable editor for parameterized exercises
	- Distribution mode selector
	- Syntax helper buttons for parameterization

	TOOLBAR SECTIONS:
	- Texte: Bold, Italic, Code
	- Math: Inline and block formulas
	- Structure: Headings, lists, tables
	- Media: Images, horizontal rules
	- Parameterization: Variable references, random values, expressions

	@see src/lib/exercises/parser/markdown-parser.ts
	@see src/lib/shared/parameterization for variable system
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Bold,
		Italic,
		Code,
		Heading,
		List,
		ListOrdered,
		Table,
		Image,
		Minus,
		Eye,
		EyeOff,
		Type,
		Sigma,
		LayoutGrid,
		Upload,
		Loader2
	} from 'lucide-svelte';
	import ExerciseMarkdownPreview from './ExerciseMarkdownPreview.svelte';
	import ImageAttributePanel from './ImageAttributePanel.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { uploadExerciseImage } from '$lib/exercises/services/image-upload';
	import {
		findImageAtCursor,
		replaceImageMarkdown,
		type ExtractedImage
	} from '$lib/exercises/services/image-markdown-editor';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Variable } from '$lib/shared/parameterization';
	import type { DistributionMode, ImageSizeClass, ImageAlignment } from '$lib/exercises/types';

	// Props
	interface Props {
		value?: string;
		placeholder?: string;
		showPreview?: boolean;
		supabase?: SupabaseClient;
		userId?: string;
		variables?: Variable[];
		distributionMode?: DistributionMode;
	}

	let {
		value = $bindable(''),
		placeholder = 'Écrivez votre exercice en markdown...',
		showPreview = true,
		supabase,
		userId,
		variables = $bindable([]),
		distributionMode = $bindable('on_demand')
	}: Props = $props();

	// Editor state
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let previewVisible = $state(showPreview);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let uploadingImage = $state(false);

	// Image configuration dialog state
	let imageDialogOpen = $state(false);
	let uploadedImageUrl = $state('');
	let uploadedImageAlt = $state('');

	// Edit mode state (for editing existing images)
	let editingImage = $state<ExtractedImage | null>(null);
	let editImageSizeClass = $state<ImageSizeClass | undefined>(undefined);
	let editImageWidthPercent = $state<number | undefined>(undefined);
	let editImageAlignment = $state<ImageAlignment | undefined>(undefined);
	let editImageCaption = $state<string | undefined>(undefined);

	// Section visibility
	let textSectionOpen = $state(true);
	let mathSectionOpen = $state(false);
	let structureSectionOpen = $state(false);
	let parameterizationSectionOpen = $state(false);

	// Auto-show parameterization section if variables exist
	$effect(() => {
		if (variables && variables.length > 0) {
			parameterizationSectionOpen = true;
		}
	});

	/**
	 * Insert text at cursor position
	 */
	function insertText(before: string, after: string = '') {
		if (!textareaEl) return;

		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const selectedText = value.substring(start, end);

		const newText =
			value.substring(0, start) + before + selectedText + after + value.substring(end);

		value = newText;

		// Set cursor position
		setTimeout(() => {
			if (!textareaEl) return;
			const newPosition = start + before.length + selectedText.length;
			textareaEl.focus();
			textareaEl.setSelectionRange(newPosition, newPosition);
		}, 0);
	}

	/**
	 * Insert line-level syntax (headings, lists, etc.)
	 */
	function insertLine(prefix: string) {
		if (!textareaEl) return;

		const start = textareaEl.selectionStart;
		const lineStart = value.lastIndexOf('\n', start - 1) + 1;

		const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);

		value = newText;

		setTimeout(() => {
			if (!textareaEl) return;
			textareaEl.focus();
			const newPosition = lineStart + prefix.length + (start - lineStart);
			textareaEl.setSelectionRange(newPosition, newPosition);
		}, 0);
	}

	/**
	 * Insert template (table, image, etc.)
	 */
	function insertTemplate(template: string) {
		if (!textareaEl) return;

		const start = textareaEl.selectionStart;
		const newText = value.substring(0, start) + '\n' + template + '\n' + value.substring(start);

		value = newText;

		setTimeout(() => {
			if (!textareaEl) return;
			textareaEl.focus();
		}, 0);
	}

	// Toolbar actions
	const actions = {
		bold: () => insertText('**', '**'),
		italic: () => insertText('*', '*'),
		code: () => insertText('`', '`'),
		mathInline: () => insertText('$', '$'),
		mathBlock: () => insertText('\n$$\n', '\n$$\n'),
		heading1: () => insertLine('# '),
		heading2: () => insertLine('## '),
		heading3: () => insertLine('### '),
		bulletList: () => insertLine('- '),
		orderedList: () => insertLine('1. '),
		table: () =>
			insertTemplate(
				`| Colonne 1 | Colonne 2 |
|-----------|-----------|
| Cellule 1 | Cellule 2 |`
			),
		image: () => insertText('![Description](', ')'),
		hr: () => insertTemplate('---'),
		// Parameterization actions
		varReference: () => insertText('{{', '}}'),
		randomInt: () => insertText('{{random:', '}}'),
		evalExpression: () => insertText('{{eval:', '}}')
	};

	// Math templates
	const mathTemplates = [
		{ label: 'Fraction', latex: '\\frac{a}{b}', icon: 'ᵃ⁄ᵦ' },
		{ label: 'Racine', latex: '\\sqrt{x}', icon: '√x' },
		{ label: 'Puissance', latex: 'x^{n}', icon: 'xⁿ' },
		{ label: 'Indice', latex: 'x_{i}', icon: 'xᵢ' },
		{ label: 'Somme', latex: '\\sum_{i=1}^{n}', icon: '∑' },
		{ label: 'Intégrale', latex: '\\int_{a}^{b}', icon: '∫' }
	];

	function insertMathTemplate(latex: string) {
		insertText(`$${latex}$`, '');
	}

	/**
	 * Open file picker for image upload
	 */
	function openImageUpload() {
		if (!supabase || !userId) {
			toaster.error('Impossible de télécharger une image. Veuillez vous reconnecter.');
			return;
		}
		fileInputEl?.click();
	}

	/**
	 * Handle image file selection and upload
	 */
	async function handleImageUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		if (!supabase || !userId) {
			toaster.error('Impossible de télécharger une image. Veuillez vous reconnecter.');
			return;
		}

		uploadingImage = true;

		try {
			const result = await uploadExerciseImage(supabase, file, userId);

			if (result.success && result.url) {
				// Store URL and alt text, then show configuration dialog
				const imageName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
				uploadedImageUrl = result.url;
				uploadedImageAlt = imageName.replace(/[-_]/g, ' ');
				imageDialogOpen = true;
				toaster.success('Image téléchargée - Configurez les options');
			} else {
				toaster.error(result.error || "Erreur lors du téléchargement de l'image");
			}
		} catch (error) {
			console.error('Error uploading image:', error);
			toaster.error("Erreur inattendue lors du téléchargement de l'image");
		} finally {
			uploadingImage = false;
			// Reset file input
			if (target) target.value = '';
		}
	}

	/**
	 * Handle markdown insertion from ImageAttributePanel
	 */
	function handleImageInsert(markdown: string) {
		if (editingImage) {
			// Edit mode: replace existing image
			value = replaceImageMarkdown(value, editingImage, markdown);
			toaster.success('Image mise à jour');
		} else {
			// Insert mode: add new image
			insertText(markdown, '');
		}
		closeImageDialog();
	}

	/**
	 * Close image dialog and reset state
	 */
	function closeImageDialog() {
		imageDialogOpen = false;
		uploadedImageUrl = '';
		uploadedImageAlt = '';
		editingImage = null;
		editImageSizeClass = undefined;
		editImageWidthPercent = undefined;
		editImageAlignment = undefined;
		editImageCaption = undefined;
	}

	/**
	 * Try to edit an existing image at cursor position
	 * Returns true if an image was found and dialog opened
	 */
	function tryEditImageAtCursor(): boolean {
		if (!textareaEl) return false;

		const cursorPos = textareaEl.selectionStart;
		const image = findImageAtCursor(value, cursorPos);

		if (image) {
			// Store the image being edited
			editingImage = image;
			uploadedImageUrl = image.url;
			uploadedImageAlt = image.alt;
			editImageSizeClass = image.sizeClass;
			editImageWidthPercent = image.widthPercent;
			editImageAlignment = image.alignment;
			editImageCaption = image.caption;
			imageDialogOpen = true;
			return true;
		}

		return false;
	}

	/**
	 * Handle image button click - edit existing or upload new
	 */
	function handleImageButtonClick() {
		// First try to edit image at cursor
		if (tryEditImageAtCursor()) {
			return;
		}

		// No image at cursor - open file picker for new upload
		openImageUpload();
	}
</script>

<div class="flex h-full flex-col rounded-lg border border-border bg-card">
	<!-- Toolbar -->
	<div class="border-b border-border bg-muted/50">
		<div class="flex flex-wrap items-center gap-1 p-2">
			<!-- Text Section Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (textSectionOpen = !textSectionOpen)}
				class="font-medium"
			>
				<Type class="mr-1 h-4 w-4" />
				Texte
			</Button>

			<!-- Math Section Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (mathSectionOpen = !mathSectionOpen)}
				class="font-medium"
			>
				<Sigma class="mr-1 h-4 w-4" />
				Math
			</Button>

			<!-- Structure Section Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (structureSectionOpen = !structureSectionOpen)}
				class="font-medium"
			>
				<LayoutGrid class="mr-1 h-4 w-4" />
				Structure
			</Button>

			<!-- Parameterization Section Toggle (only if variables exist) -->
			{#if variables && variables.length > 0}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => (parameterizationSectionOpen = !parameterizationSectionOpen)}
					class="font-medium"
					title="Syntaxe de paramétrage"
				>
					<Type class="mr-1 h-4 w-4" />
					Variables
				</Button>
			{/if}
			<div class="flex-1"></div>

			<!-- Preview Toggle -->
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (previewVisible = !previewVisible)}
				title={previewVisible ? 'Masquer la prévisualisation' : 'Afficher la prévisualisation'}
			>
				{#if previewVisible}
					<Eye class="mr-1 h-4 w-4" />
					Aperçu
				{:else}
					<EyeOff class="mr-1 h-4 w-4" />
					Aperçu
				{/if}
			</Button>
		</div>

		<!-- Text Section -->
		{#if textSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<Button variant="ghost" size="sm" onclick={actions.bold} title="Gras">
					<Bold class="h-4 w-4" />
				</Button>

				<Button variant="ghost" size="sm" onclick={actions.italic} title="Italique">
					<Italic class="h-4 w-4" />
				</Button>

				<Button variant="ghost" size="sm" onclick={actions.code} title="Code inline">
					<Code class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Math Section -->
		{#if mathSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={actions.mathInline}
					title="Formule inline"
					class="font-mono"
				>
					$x$
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={actions.mathBlock}
					title="Formule bloc"
					class="font-mono"
				>
					$$
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				{#each mathTemplates as template (template.latex)}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => insertMathTemplate(template.latex)}
						title={template.label}
						class="font-mono text-base"
					>
						{template.icon}
					</Button>
				{/each}
			</div>
		{/if}

		<!-- Structure Section -->
		{#if structureSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<Button variant="ghost" size="sm" onclick={actions.heading1} title="Titre 1">
					<Heading class="mr-1 h-4 w-4" />
					H1
				</Button>

				<Button variant="ghost" size="sm" onclick={actions.heading2} title="Titre 2">
					<Heading class="mr-1 h-4 w-4" />
					H2
				</Button>

				<Button variant="ghost" size="sm" onclick={actions.heading3} title="Titre 3">
					<Heading class="mr-1 h-4 w-4" />
					H3
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<Button variant="ghost" size="sm" onclick={actions.bulletList} title="Liste à puces">
					<List class="h-4 w-4" />
				</Button>

				<Button variant="ghost" size="sm" onclick={actions.orderedList} title="Liste numérotée">
					<ListOrdered class="h-4 w-4" />
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<Button variant="ghost" size="sm" onclick={actions.table} title="Insérer un tableau">
					<Table class="h-4 w-4" />
				</Button>

				{#if supabase && userId}
					<!-- Image upload/edit button (when Supabase is available) -->
					<Button
						variant="ghost"
						size="sm"
						onclick={handleImageButtonClick}
						disabled={uploadingImage}
						title="Image (editer si curseur sur image, sinon telecharger)"
					>
						{#if uploadingImage}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Upload class="h-4 w-4" />
						{/if}
					</Button>
				{:else}
					<!-- Manual image insertion (fallback when Supabase is not available) -->
					<Button variant="ghost" size="sm" onclick={actions.image} title="Insérer une image">
						<Image class="h-4 w-4" />
					</Button>
				{/if}

				<Button variant="ghost" size="sm" onclick={actions.hr} title="Ligne horizontale">
					<Minus class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Parameterization Section (only show if variables exist) -->
		{#if variables && variables.length > 0 && parameterizationSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={actions.varReference}
					title="Référence à une variable"
					class="font-mono"
				>
					&#123;&#123;var&#125;&#125;
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={actions.randomInt}
					title="Nombre aléatoire"
					class="font-mono"
				>
					&#123;&#123;random:1-10&#125;&#125;
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={actions.evalExpression}
					title="Expression évaluée"
					class="font-mono"
				>
					&#123;&#123;eval:...&#125;&#125;
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<span class="text-xs text-muted-foreground">
					Utilisez ces syntaxes pour insérer des variables dans votre texte
				</span>
			</div>
		{/if}
	</div>

	<!-- Editor and Preview -->
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Markdown Editor -->
		<div
			class={previewVisible
				? 'w-1/2 overflow-y-auto border-r border-border'
				: 'w-full overflow-y-auto'}
		>
			<textarea
				bind:this={textareaEl}
				bind:value
				{placeholder}
				class="h-full w-full resize-none rounded-none border-0 bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:outline-none"
			></textarea>
		</div>

		<!-- Live Preview -->
		{#if previewVisible}
			<div class="w-1/2 overflow-y-auto bg-background p-4">
				<ExerciseMarkdownPreview markdown={value} />
			</div>
		{/if}
	</div>
</div>

<!-- Hidden file input for image upload -->
<input
	bind:this={fileInputEl}
	type="file"
	accept="image/jpeg,image/png,image/gif,image/svg+xml"
	onchange={handleImageUpload}
	class="hidden"
	aria-label="Upload image"
/>

<!-- Image Configuration Dialog -->
<Dialog.Root
	bind:open={imageDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			closeImageDialog();
		}
	}}
>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{editingImage ? "Modifier l'image" : "Configurer l'image"}</Dialog.Title>
			<Dialog.Description>
				{editingImage
					? "Modifiez les parametres d'affichage de cette image."
					: "Ajustez les parametres d'affichage de votre image avant de l'inserer."}
			</Dialog.Description>
		</Dialog.Header>

		<ImageAttributePanel
			initialUrl={uploadedImageUrl}
			initialAlt={uploadedImageAlt}
			initialSizeClass={editImageSizeClass}
			initialWidthPercent={editImageWidthPercent}
			initialAlignment={editImageAlignment}
			initialCaption={editImageCaption}
			onInsert={handleImageInsert}
		/>
	</Dialog.Content>
</Dialog.Root>
