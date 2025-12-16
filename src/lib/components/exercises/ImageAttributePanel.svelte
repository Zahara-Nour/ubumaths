<!--
	ImageAttributePanel Component
	=============================

	Comprehensive panel for managing all image attributes in exercises.

	Combines:
	- ImageUploader: Upload images with drag-drop
	- ImageSizeSelector: Select size class or custom width
	- ImageAlignmentSelector: Set alignment (left/center/right)
	- ImageCaptionInput: Add optional caption

	Features:
	- Shows uploaded image preview
	- Generated markdown syntax preview
	- Copy to clipboard button
	- Export-ready configuration

	@see src/lib/exercises/types.ts
	@see src/lib/exercises/services/image-dimensions.ts
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Copy, Check, Image as ImageIcon, Settings } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { ImageSizeClass, ImageAlignment } from '$lib/custom-markdown';
	import { autoDetectSizeClass } from '$lib/exercises/services/image-dimensions';

	import ImageUploader from './ImageUploader.svelte';
	import ImageSizeSelector from './ImageSizeSelector.svelte';
	import ImageAlignmentSelector from './ImageAlignmentSelector.svelte';
	import ImageCaptionInput from './ImageCaptionInput.svelte';

	// Types
	interface UploadedImage {
		url: string;
		width: number;
		height: number;
		aspectRatio: number;
		filename: string;
		size: number;
		mimeType: string;
	}

	// Props
	interface Props {
		onInsert?: (markdown: string) => void;
		initialUrl?: string;
		initialAlt?: string;
		initialSizeClass?: ImageSizeClass;
		initialWidthPercent?: number;
		initialAlignment?: ImageAlignment;
		initialCaption?: string;
	}

	let {
		onInsert,
		initialUrl = '',
		initialAlt = '',
		initialSizeClass,
		initialWidthPercent,
		initialAlignment,
		initialCaption
	}: Props = $props();

	// State - initialize with props if provided
	let uploadedImage = $state<UploadedImage | null>(null);
	let sizeClass = $state<ImageSizeClass>(initialSizeClass ?? 'medium');
	let customWidth = $state<number | undefined>(initialWidthPercent);
	let alignment = $state<ImageAlignment>(initialAlignment ?? 'center');
	let caption = $state(initialCaption ?? '');
	let altText = $state(initialAlt);
	let copied = $state(false);

	// Sync state when props change (e.g., editing different image)
	$effect(() => {
		sizeClass = initialSizeClass ?? 'medium';
		customWidth = initialWidthPercent;
		alignment = initialAlignment ?? 'center';
		caption = initialCaption ?? '';
		altText = initialAlt;
	});

	// Derived: The image URL to use (uploaded or initial)
	const imageUrl = $derived(uploadedImage?.url || initialUrl);
	const hasImage = $derived(!!imageUrl);

	// Derived: Generate markdown syntax
	const markdownSyntax = $derived.by(() => {
		if (!imageUrl) return '';

		const alt = altText || uploadedImage?.filename || 'image';
		let attributes: string[] = [];

		// Add size attribute
		if (customWidth !== undefined) {
			attributes.push(`width=${customWidth}%`);
		} else if (sizeClass !== 'medium') {
			// Only add size if not default
			attributes.push(`size=${sizeClass}`);
		}

		// Add alignment if not center (default)
		if (alignment !== 'center') {
			attributes.push(`align=${alignment}`);
		}

		// Add caption if present
		if (caption) {
			// Escape quotes in caption
			const escapedCaption = caption.replace(/"/g, '\\"');
			attributes.push(`caption="${escapedCaption}"`);
		}

		// Build markdown
		let markdown = `![${alt}](${imageUrl})`;

		// Add attributes block if any
		if (attributes.length > 0) {
			markdown += `{${attributes.join(' ')}}`;
		}

		return markdown;
	});

	/**
	 * Handle successful upload
	 */
	function handleUploadComplete(data: UploadedImage | undefined) {
		if (!data) return;
		uploadedImage = data;

		// Auto-detect best size class based on dimensions
		const suggestedSize = autoDetectSizeClass(data.width, data.height);
		sizeClass = suggestedSize;

		// Use filename as alt text if not set
		if (!altText) {
			altText = data.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
		}
	}

	/**
	 * Copy markdown to clipboard
	 */
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(markdownSyntax);
			copied = true;
			toaster.success('Markdown copie dans le presse-papiers');
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
			toaster.error('Impossible de copier dans le presse-papiers');
		}
	}

	/**
	 * Insert markdown into editor
	 */
	function insertMarkdown() {
		if (onInsert && markdownSyntax) {
			onInsert(markdownSyntax);
			toaster.success("Image insérée dans l'éditeur");
		}
	}

	/**
	 * Reset panel to initial state
	 */
	function reset() {
		uploadedImage = null;
		sizeClass = initialSizeClass ?? 'medium';
		customWidth = initialWidthPercent;
		alignment = initialAlignment ?? 'center';
		caption = initialCaption ?? '';
		altText = initialAlt;
	}
</script>

<div class="flex flex-col gap-6 rounded-lg border border-border bg-card p-4">
	<!-- Header -->
	<div class="flex items-center gap-2">
		<ImageIcon class="h-5 w-5 text-primary" aria-hidden="true" />
		<h2 class="text-lg font-semibold">Gestion d'image</h2>
	</div>

	<!-- Image Uploader (hidden if initialUrl is provided) -->
	{#if !initialUrl}
		<ImageUploader onUploadComplete={handleUploadComplete} />
	{/if}

	<!-- Image Preview when initialUrl is provided -->
	{#if initialUrl && !uploadedImage}
		<div class="flex flex-col items-center gap-2">
			<img
				src={initialUrl}
				alt="Aperçu"
				class="max-h-48 rounded-md border border-border object-contain"
			/>
			<p class="text-xs text-muted-foreground">Image téléchargée</p>
		</div>
	{/if}

	{#if hasImage}
		<Separator />

		<!-- Alt text input -->
		<div class="flex flex-col gap-2">
			<label for="alt-text" class="text-sm font-medium"
				>Texte alternatif <span class="text-destructive" aria-label="obligatoire">*</span></label
			>
			<input
				id="alt-text"
				type="text"
				bind:value={altText}
				placeholder="Description de l'image pour l'accessibilite"
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				required
				aria-describedby="alt-text-hint"
			/>
			<p id="alt-text-hint" class="text-xs text-muted-foreground">
				Important pour l'accessibilite. Decrit le contenu et le contexte de l'image pour les
				utilisateurs de lecteurs d'ecran.
			</p>
		</div>

		<Separator />

		<!-- Settings Section -->
		<div class="flex items-center gap-2">
			<Settings class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
			<h3 class="text-sm font-medium">Parametres d'affichage</h3>
		</div>

		<!-- Size Selector -->
		<ImageSizeSelector bind:value={sizeClass} bind:customWidth />

		<Separator />

		<!-- Alignment Selector -->
		<ImageAlignmentSelector bind:value={alignment} />

		<Separator />

		<!-- Caption Input -->
		<ImageCaptionInput bind:value={caption} />

		<Separator />

		<!-- Generated Markdown Preview -->
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium">Syntaxe Markdown generee</h3>
				<Button
					variant="ghost"
					size="sm"
					onclick={copyToClipboard}
					disabled={!markdownSyntax}
					class="h-8 gap-1"
					aria-label={copied ? 'Copie dans le presse-papiers' : 'Copier dans le presse-papiers'}
				>
					{#if copied}
						<Check class="h-4 w-4 text-green-500" aria-hidden="true" />
						<span>Copie!</span>
					{:else}
						<Copy class="h-4 w-4" aria-hidden="true" />
						<span>Copier</span>
					{/if}
				</Button>
			</div>

			<div
				class="rounded-md border border-border bg-muted/30 p-3"
				role="region"
				aria-label="Code Markdown genere"
			>
				<code
					class="block font-mono text-xs break-all whitespace-pre-wrap text-foreground"
					aria-label="Syntaxe: {markdownSyntax || 'Aucune image selectionnee'}"
				>
					{markdownSyntax || 'Aucune image selectionnee'}
				</code>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-2">
			{#if onInsert}
				<Button onclick={insertMarkdown} disabled={!markdownSyntax} class="flex-1">
					Insérer dans l'éditeur
				</Button>
			{/if}
			<Button variant="outline" onclick={reset}>Réinitialiser</Button>
		</div>
	{/if}
</div>
