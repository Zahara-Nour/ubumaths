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

	TOOLBAR SECTIONS:
	- Texte: Bold, Italic, Code
	- Math: Inline and block formulas
	- Structure: Headings, lists, tables
	- Media: Images, horizontal rules

	@see src/lib/exercises/parser/markdown-parser.ts
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
	import ExerciseDisplay from './ExerciseDisplay.svelte';
	import { uploadExerciseImage } from '$lib/exercises/services/image-upload';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	// Props
	interface Props {
		value?: string;
		placeholder?: string;
		showPreview?: boolean;
		supabase?: SupabaseClient;
		userId?: string;
	}

	let {
		value = $bindable(''),
		placeholder = 'Écrivez votre exercice en markdown...',
		showPreview = true,
		supabase,
		userId
	}: Props = $props();

	// Editor state
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let previewVisible = $state(showPreview);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let uploadingImage = $state(false);

	// Section visibility
	let textSectionOpen = $state(true);
	let mathSectionOpen = $state(false);
	let structureSectionOpen = $state(false);

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
		hr: () => insertTemplate('---')
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
				// Insert markdown image syntax with the uploaded URL
				const imageName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
				insertText(`![${imageName}](${result.url})`, '');
				toaster.success('Image téléchargée avec succès');
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
					<!-- Image upload button (when Supabase is available) -->
					<Button
						variant="ghost"
						size="sm"
						onclick={openImageUpload}
						disabled={uploadingImage}
						title="Télécharger une image"
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
				<ExerciseDisplay markdown={value} />
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
