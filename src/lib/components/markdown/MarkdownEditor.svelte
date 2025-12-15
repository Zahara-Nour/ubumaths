<!--
	MarkdownEditor Component
	========================

	Generic markdown editor with live preview for any content type.
	Supports optional image upload and parameterization features.

	FEATURES:
	- Raw markdown editing with syntax highlighting
	- Toolbar with markdown shortcuts
	- Live preview with MathLive rendering via MarkdownRenderer
	- Support for math ($...$, $$...$$), lists, tables, images
	- Split view: editor + preview
	- Optional parameterization syntax helpers
	- Optional image upload with configurable bucket

	TOOLBAR SECTIONS:
	- Text: Bold, Italic, Code
	- Math: Inline and block formulas, templates
	- Structure: Headings, lists, tables, horizontal rules
	- Media: Images (manual or upload)
	- Parameterization: Variable references, random values, expressions (optional)

	@see MarkdownRenderer.svelte for preview rendering
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
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import type { ImageUploadConfig } from './types';
	import type { Variable } from '$lib/custom-markdown';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

	// Props
	interface Props {
		/** Markdown content (bindable) */
		value?: string;
		/** Placeholder text for empty editor */
		placeholder?: string;
		/** Show/hide preview panel initially */
		showPreview?: boolean;
		/** Show parameterization toolbar section */
		showParameterization?: boolean;
		/** Image upload configuration (optional - enables upload feature) */
		imageUpload?: ImageUploadConfig;
		/** Variables for parameterization reference (shows variable names in toolbar) */
		variables?: Variable[];
		/** Number of rows for textarea */
		rows?: number;
		/** Additional CSS class for container */
		class?: string;
		/** Callback when image is inserted (for custom handling) */
		onImageInsert?: (markdown: string) => void;
		/** Custom function identifiers for math parsing (e.g., ['P', 'Q']) */
		genericFunctions?: string[];
	}

	let {
		value = $bindable(''),
		placeholder = 'Ecrivez votre contenu en markdown...',
		showPreview = true,
		showParameterization = false,
		imageUpload,
		variables = [],
		rows = 10,
		class: className = '',
		onImageInsert,
		genericFunctions
	}: Props = $props();

	// Build GenericFunctionConfig from genericFunctions array
	let genericFunctionsConfig = $derived.by<GenericFunctionConfig | undefined>(() => {
		console.log('[MarkdownEditor] genericFunctions prop:', genericFunctions);
		if (!genericFunctions || genericFunctions.length === 0) {
			return undefined;
		}
		const config = {
			names: genericFunctions,
			allowDerivatives: true,
			allowInverse: true
		};
		console.log('[MarkdownEditor] Created config:', config);
		return config;
	});

	// Editor state
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let previewVisible = $state(showPreview);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let uploadingImage = $state(false);

	// Section visibility
	let textSectionOpen = $state(true);
	let mathSectionOpen = $state(false);
	let structureSectionOpen = $state(false);
	let parameterizationSectionOpen = $state(false);

	// Derived: should show parameterization section
	const showParamSection = $derived(showParameterization || (variables && variables.length > 0));

	// Auto-show parameterization section if variables exist
	$effect(() => {
		if (variables && variables.length > 0) {
			parameterizationSectionOpen = true;
		}
	});

	/**
	 * Insert text at cursor position, wrapping selected text
	 */
	function insertText(before: string, after: string = '') {
		if (!textareaEl) return;

		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const selectedText = value.substring(start, end);

		const newText =
			value.substring(0, start) + before + selectedText + after + value.substring(end);

		value = newText;

		// Set cursor position after insertion
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
	 * Insert block template (table, image, etc.)
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

	// Math templates for quick insertion
	const mathTemplates = [
		{ label: 'Fraction', latex: '\\frac{a}{b}', icon: 'a/b' },
		{ label: 'Racine', latex: '\\sqrt{x}', icon: 'Vx' },
		{ label: 'Puissance', latex: 'x^{n}', icon: 'x^n' },
		{ label: 'Indice', latex: 'x_{i}', icon: 'xi' },
		{ label: 'Somme', latex: '\\sum_{i=1}^{n}', icon: 'E' },
		{ label: 'Integrale', latex: '\\int_{a}^{b}', icon: 'S' }
	];

	function insertMathTemplate(latex: string) {
		insertText(`$${latex}$`, '');
	}

	/**
	 * Open file picker for image upload
	 */
	function openImageUpload() {
		if (!imageUpload) return;
		fileInputEl?.click();
	}

	/**
	 * Handle image file selection and upload
	 */
	async function handleImageUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file || !imageUpload) return;

		uploadingImage = true;

		try {
			// Use custom upload function if provided, otherwise use default
			const uploadFn = imageUpload.uploadFn;

			if (uploadFn) {
				const result = await uploadFn(imageUpload.supabase, file, imageUpload.userId);

				if (result.success && result.url) {
					const imageName = file.name.replace(/\.[^/.]+$/, '');
					const altText = imageName.replace(/[-_]/g, ' ');
					const markdown = `![${altText}](${result.url})`;

					if (onImageInsert) {
						onImageInsert(markdown);
					} else {
						insertText(markdown, '');
					}
				} else {
					console.error('Image upload failed:', result.error);
				}
			} else {
				// Default upload using Supabase storage directly
				const bucket = imageUpload.bucket || 'exercise-images';
				const timestamp = Date.now();
				const uuid = crypto.randomUUID();
				const ext = file.name.split('.').pop() || 'png';
				const storagePath = `${imageUpload.userId}/${timestamp}-${uuid}.${ext}`;

				const { error: uploadError } = await imageUpload.supabase.storage
					.from(bucket)
					.upload(storagePath, file, {
						cacheControl: '3600',
						upsert: false
					});

				if (uploadError) {
					console.error('Storage upload error:', uploadError);
					return;
				}

				const {
					data: { publicUrl }
				} = imageUpload.supabase.storage.from(bucket).getPublicUrl(storagePath);

				const imageName = file.name.replace(/\.[^/.]+$/, '');
				const altText = imageName.replace(/[-_]/g, ' ');
				const markdown = `![${altText}](${publicUrl})`;

				if (onImageInsert) {
					onImageInsert(markdown);
				} else {
					insertText(markdown, '');
				}
			}
		} catch (error) {
			console.error('Error uploading image:', error);
		} finally {
			uploadingImage = false;
			// Reset file input
			if (target) target.value = '';
		}
	}

	/**
	 * Handle image button click - upload if configured, manual insert otherwise
	 */
	function handleImageButtonClick() {
		if (imageUpload) {
			openImageUpload();
		} else {
			actions.image();
		}
	}
</script>

<div class="flex h-full flex-col rounded-lg border border-border bg-card {className}">
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

			<!-- Parameterization Section Toggle (only if enabled or variables exist) -->
			{#if showParamSection}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => (parameterizationSectionOpen = !parameterizationSectionOpen)}
					class="font-medium"
					title="Syntaxe de parametrage"
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
				title={previewVisible ? 'Masquer la previsualisation' : 'Afficher la previsualisation'}
			>
				{#if previewVisible}
					<Eye class="mr-1 h-4 w-4" />
					Apercu
				{:else}
					<EyeOff class="mr-1 h-4 w-4" />
					Apercu
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

				<Button variant="ghost" size="sm" onclick={actions.bulletList} title="Liste a puces">
					<List class="h-4 w-4" />
				</Button>

				<Button variant="ghost" size="sm" onclick={actions.orderedList} title="Liste numerotee">
					<ListOrdered class="h-4 w-4" />
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<Button variant="ghost" size="sm" onclick={actions.table} title="Inserer un tableau">
					<Table class="h-4 w-4" />
				</Button>

				<!-- Image button (upload or manual) -->
				{#if imageUpload}
					<Button
						variant="ghost"
						size="sm"
						onclick={handleImageButtonClick}
						disabled={uploadingImage}
						title="Telecharger une image"
					>
						{#if uploadingImage}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Upload class="h-4 w-4" />
						{/if}
					</Button>
				{:else}
					<Button variant="ghost" size="sm" onclick={actions.image} title="Inserer une image">
						<Image class="h-4 w-4" />
					</Button>
				{/if}

				<Button variant="ghost" size="sm" onclick={actions.hr} title="Ligne horizontale">
					<Minus class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- Parameterization Section -->
		{#if showParamSection && parameterizationSectionOpen}
			<div class="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 pt-2 pb-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={actions.varReference}
					title="Reference a une variable"
					class="font-mono"
				>
					&#123;&#123;var&#125;&#125;
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={actions.randomInt}
					title="Nombre aleatoire"
					class="font-mono"
				>
					&#123;&#123;random:1-10&#125;&#125;
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={actions.evalExpression}
					title="Expression evaluee"
					class="font-mono"
				>
					&#123;&#123;eval:...&#125;&#125;
				</Button>

				<div class="mx-1 h-6 w-px bg-border"></div>

				<span class="text-xs text-muted-foreground">
					Utilisez ces syntaxes pour inserer des variables dans votre texte
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
				{rows}
				class="h-full w-full resize-none rounded-none border-0 bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:outline-none"
			></textarea>
		</div>

		<!-- Live Preview -->
		{#if previewVisible}
			<div class="w-1/2 overflow-y-auto bg-background p-4">
				<MarkdownRenderer content={value} genericFunctions={genericFunctionsConfig} />
			</div>
		{/if}
	</div>
</div>

<!-- Hidden file input for image upload -->
{#if imageUpload}
	<input
		bind:this={fileInputEl}
		type="file"
		accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
		onchange={handleImageUpload}
		class="hidden"
		aria-label="Upload image"
	/>
{/if}
