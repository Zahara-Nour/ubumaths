<!--
	TypstEditor Component
	=====================

	A Typst template editor with placeholder insertion and live preview.

	Features:
	- Code editor with Typst syntax (using textarea with monospace font)
	- Placeholder insertion buttons for quick template building
	- Live preview with sample data
	- Error display for invalid Typst
	- Auto-save support

	Usage:
	```svelte
	<TypstEditor
		bind:content={templateContent}
		placeholders={availablePlaceholders}
		onchange={(content) => handleChange(content)}
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Code2, Eye, Plus, AlertCircle, FileText, RefreshCw, Loader2 } from 'lucide-svelte';
	import type { TemplatePlaceholder } from '$lib/types/worksheets';
	import {
		COMMON_PLACEHOLDERS,
		SAMPLE_PREVIEW_DATA,
		renderTemplate
	} from '$lib/worksheets/default-templates';
	import {
		getTypstCompiler,
		type TypstCompiler,
		getCompilerError,
		resetCompilerState
	} from '$lib/worksheets/typst-compiler';

	// Props
	interface Props {
		content: string;
		placeholders?: TemplatePlaceholder[];
		previewData?: Record<string, string>;
		readonly?: boolean;
		onchange?: (content: string) => void;
	}

	let {
		content = $bindable(''),
		placeholders = COMMON_PLACEHOLDERS,
		previewData = SAMPLE_PREVIEW_DATA,
		readonly = false,
		onchange
	}: Props = $props();

	// Local state
	let activeTab = $state('editor');
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let renderedPreview = $state('');
	let validationError = $state<string | null>(null);

	// Typst compilation state
	let typst = $state<TypstCompiler | null>(null);
	let isTypstLoading = $state(false);
	let typstError = $state<string | null>(null);
	let svgContent = $state<string>('');
	let isGeneratingSvg = $state(false);

	// Derived: render preview when content changes
	$effect(() => {
		try {
			renderedPreview = renderTemplate(content, previewData);
			validationError = validateTypst(content);
		} catch (e) {
			validationError = e instanceof Error ? e.message : 'Unknown error';
		}
	});

	/**
	 * Insert a placeholder at the current cursor position
	 */
	function insertPlaceholder(placeholder: TemplatePlaceholder) {
		if (!textareaRef || readonly) return;

		const start = textareaRef.selectionStart;
		const end = textareaRef.selectionEnd;
		const placeholderText = `{{${placeholder.key}}}`;

		// Insert placeholder at cursor position
		const before = content.slice(0, start);
		const after = content.slice(end);
		content = before + placeholderText + after;

		// Trigger change callback
		onchange?.(content);

		// Restore focus and move cursor after placeholder
		requestAnimationFrame(() => {
			if (textareaRef) {
				textareaRef.focus();
				const newPos = start + placeholderText.length;
				textareaRef.setSelectionRange(newPos, newPos);
			}
		});
	}

	/**
	 * Handle textarea input
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		content = target.value;
		onchange?.(content);
	}

	/**
	 * Basic Typst syntax validation
	 * Returns error message if invalid, null if valid
	 */
	function validateTypst(typstContent: string): string | null {
		if (!typstContent.trim()) {
			return 'Le template ne peut pas etre vide';
		}

		// Check for unclosed brackets
		const openBrackets = (typstContent.match(/\[/g) || []).length;
		const closeBrackets = (typstContent.match(/\]/g) || []).length;
		if (openBrackets !== closeBrackets) {
			return `Crochets non equilibres: ${openBrackets} ouverts, ${closeBrackets} fermes`;
		}

		// Check for unclosed curly braces (excluding placeholders)
		const contentWithoutPlaceholders = typstContent.replace(/\{\{[^}]+\}\}/g, '');
		const openBraces = (contentWithoutPlaceholders.match(/\{/g) || []).length;
		const closeBraces = (contentWithoutPlaceholders.match(/\}/g) || []).length;
		if (openBraces !== closeBraces) {
			return `Accolades non equilibrees: ${openBraces} ouvertes, ${closeBraces} fermees`;
		}

		// Check for unclosed parentheses
		const openParens = (typstContent.match(/\(/g) || []).length;
		const closeParens = (typstContent.match(/\)/g) || []).length;
		if (openParens !== closeParens) {
			return `Parentheses non equilibrees: ${openParens} ouvertes, ${closeParens} fermees`;
		}

		// Check for invalid placeholder syntax
		const invalidPlaceholders = typstContent.match(/\{\{[^}]*[^a-zA-Z0-9_}][^}]*\}\}/g);
		if (invalidPlaceholders) {
			return `Placeholder invalide: ${invalidPlaceholders[0]}`;
		}

		return null;
	}

	/**
	 * Get placeholder label in French
	 */
	function getPlaceholderLabel(placeholder: TemplatePlaceholder): string {
		return placeholder.label || placeholder.key;
	}

	/**
	 * Group placeholders by type, ensuring unique keys
	 */
	function getPlaceholdersByType(type: 'text' | 'date' | 'dynamic'): TemplatePlaceholder[] {
		const filtered = placeholders.filter((p) => p.type === type);
		// Deduplicate by key (keep first occurrence)
		const seen = new Set<string>();
		return filtered.filter((p) => {
			if (seen.has(p.key)) return false;
			seen.add(p.key);
			return true;
		});
	}

	/**
	 * Extract used placeholders from content (unique keys only)
	 */
	function getUsedPlaceholders(): string[] {
		const matches = content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
		const keys = matches.map((m) => m.replace(/\{\{|\}\}/g, ''));
		return [...new Set(keys)];
	}

	/**
	 * Load Typst compiler (lazy loading on preview tab)
	 */
	async function loadTypstCompiler() {
		if (typst || isTypstLoading) return;

		isTypstLoading = true;
		typstError = null;

		try {
			const compiler = await getTypstCompiler();
			typst = compiler;
			typstError = null;
		} catch (err) {
			typstError = getCompilerError() || `Erreur de chargement: ${err}`;
			console.error('Typst loading error:', err);
		} finally {
			isTypstLoading = false;
		}
	}

	/**
	 * Retry loading Typst after an error
	 */
	async function retryLoadTypst() {
		resetCompilerState();
		typst = null;
		await loadTypstCompiler();
	}

	/**
	 * Generate SVG preview from Typst content
	 */
	async function generateSvgPreview() {
		if (!typst || isGeneratingSvg) return;

		isGeneratingSvg = true;
		typstError = null;

		try {
			const svg = await typst.svg({ mainContent: renderedPreview });
			svgContent = svg;

			// Scale SVG to fit container after render
			setTimeout(() => {
				const container = document.getElementById('typst-svg-preview');
				const svgElem = container?.querySelector('svg');
				if (svgElem && container) {
					const width = Number.parseFloat(svgElem.getAttribute('width') || '0');
					const height = Number.parseFloat(svgElem.getAttribute('height') || '0');
					const containerWidth = container.clientWidth - 40;

					if (width > 0 && height > 0 && containerWidth > 0) {
						svgElem.setAttribute('width', String(containerWidth));
						svgElem.setAttribute('height', String((height * containerWidth) / width));
					}
				}
			}, 50);
		} catch (err) {
			typstError = `Erreur de compilation: ${err}`;
			console.error('Typst compilation error:', err);
		} finally {
			isGeneratingSvg = false;
		}
	}

	/**
	 * Handle preview tab activation - load Typst and generate preview
	 */
	async function handlePreviewTabActivated() {
		if (!typst) {
			await loadTypstCompiler();
		}
		if (typst && renderedPreview) {
			await generateSvgPreview();
		}
	}

	// Derived: used placeholders
	let usedPlaceholders = $derived(getUsedPlaceholders());

	// Auto-generate preview when switching to preview tab
	$effect(() => {
		if (activeTab === 'preview') {
			handlePreviewTabActivated();
		}
	});
</script>

<div class="space-y-4">
	<!-- Toolbar with placeholder buttons -->
	<Card.Root>
		<Card.Header class="pb-3">
			<Card.Title class="text-sm font-medium">Inserer un placeholder</Card.Title>
			<Card.Description>
				Cliquez sur un placeholder pour l'inserer a la position du curseur
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				<!-- Text placeholders -->
				{#if getPlaceholdersByType('text').length > 0}
					<div class="space-y-1">
						<Label class="text-xs text-muted-foreground">Texte</Label>
						<div class="flex flex-wrap gap-1">
							{#each getPlaceholdersByType('text') as placeholder (placeholder.key)}
								<Button
									variant={usedPlaceholders.includes(placeholder.key) ? 'secondary' : 'outline'}
									size="sm"
									onclick={() => insertPlaceholder(placeholder)}
									disabled={readonly}
									class="h-7 text-xs"
								>
									<Plus class="mr-1 h-3 w-3" />
									{getPlaceholderLabel(placeholder)}
								</Button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Date placeholders -->
				{#if getPlaceholdersByType('date').length > 0}
					<div class="space-y-1">
						<Label class="text-xs text-muted-foreground">Date</Label>
						<div class="flex flex-wrap gap-1">
							{#each getPlaceholdersByType('date') as placeholder (placeholder.key)}
								<Button
									variant={usedPlaceholders.includes(placeholder.key) ? 'secondary' : 'outline'}
									size="sm"
									onclick={() => insertPlaceholder(placeholder)}
									disabled={readonly}
									class="h-7 text-xs"
								>
									<Plus class="mr-1 h-3 w-3" />
									{getPlaceholderLabel(placeholder)}
								</Button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Dynamic placeholders -->
				{#if getPlaceholdersByType('dynamic').length > 0}
					<div class="space-y-1">
						<Label class="text-xs text-muted-foreground">Dynamique</Label>
						<div class="flex flex-wrap gap-1">
							{#each getPlaceholdersByType('dynamic') as placeholder (placeholder.key)}
								<Button
									variant={usedPlaceholders.includes(placeholder.key) ? 'secondary' : 'outline'}
									size="sm"
									onclick={() => insertPlaceholder(placeholder)}
									disabled={readonly}
									class="h-7 text-xs"
								>
									<Plus class="mr-1 h-3 w-3" />
									{getPlaceholderLabel(placeholder)}
								</Button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Used placeholders summary -->
			{#if usedPlaceholders.length > 0}
				<Separator class="my-3" />
				<div class="flex items-center gap-2">
					<span class="text-xs text-muted-foreground">Utilises:</span>
					<div class="flex flex-wrap gap-1">
						{#each usedPlaceholders as key (key)}
							<Badge variant="secondary" class="text-xs">
								{key}
							</Badge>
						{/each}
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Editor/Preview tabs -->
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="editor" class="gap-2">
				<Code2 class="h-4 w-4" />
				Editeur
			</Tabs.Trigger>
			<Tabs.Trigger value="preview" class="gap-2">
				<Eye class="h-4 w-4" />
				Apercu
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Editor Tab -->
		<Tabs.Content value="editor" class="mt-4">
			<div class="space-y-2">
				<!-- Validation error -->
				{#if validationError}
					<div
						class="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
					>
						<AlertCircle class="h-4 w-4 shrink-0" />
						<span>{validationError}</span>
					</div>
				{/if}

				<!-- Code editor -->
				<div class="relative">
					<Textarea
						bind:ref={textareaRef}
						value={content}
						oninput={handleInput}
						placeholder="// Entrez votre template Typst ici..."
						class="min-h-[500px] font-mono text-sm leading-relaxed"
						disabled={readonly}
					/>
					<div class="absolute top-2 right-2 flex items-center gap-2">
						<Badge variant="outline" class="text-xs">
							<FileText class="mr-1 h-3 w-3" />
							Typst
						</Badge>
					</div>
				</div>

				<!-- Editor hints -->
				<div class="text-xs text-muted-foreground">
					<p>
						Utilisez la syntaxe Typst. Les placeholders sont au format <code
							class="rounded bg-muted px-1">{'{{placeholder}}'}</code
						>.
					</p>
				</div>
			</div>
		</Tabs.Content>

		<!-- Preview Tab -->
		<Tabs.Content value="preview" class="mt-4">
			<Card.Root>
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Title class="text-sm">Apercu avec donnees exemple</Card.Title>
						<Button
							variant="ghost"
							size="sm"
							onclick={async () => {
								renderedPreview = renderTemplate(content, previewData);
								await generateSvgPreview();
							}}
							disabled={isGeneratingSvg || isTypstLoading}
							class="h-8 gap-2"
						>
							{#if isGeneratingSvg}
								<Loader2 class="h-3 w-3 animate-spin" />
							{:else}
								<RefreshCw class="h-3 w-3" />
							{/if}
							Actualiser
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<!-- Typst loading state -->
					{#if isTypstLoading}
						<div class="flex items-center justify-center py-12">
							<div class="space-y-3 text-center">
								<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
								<p class="text-sm text-muted-foreground">Chargement du generateur PDF...</p>
							</div>
						</div>
					{:else if typstError && !typst}
						<!-- Error state -->
						<div class="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
							<div class="flex items-start gap-3">
								<AlertCircle class="mt-0.5 h-5 w-5 text-destructive" />
								<div class="flex-1">
									<p class="font-medium text-destructive">Erreur de chargement</p>
									<p class="mt-1 text-sm text-muted-foreground">{typstError}</p>
									<Button variant="outline" size="sm" class="mt-3" onclick={retryLoadTypst}>
										<RefreshCw class="mr-2 h-4 w-4" />
										Reessayer
									</Button>
								</div>
							</div>
						</div>
					{:else if svgContent}
						<!-- SVG Preview -->
						<div class="relative">
							{#if isGeneratingSvg}
								<div
									class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
								>
									<div class="space-y-2 text-center">
										<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
										<p class="text-sm text-muted-foreground">Compilation en cours...</p>
									</div>
								</div>
							{/if}
							<div
								id="typst-svg-preview"
								class="min-h-[400px] overflow-auto rounded-lg border border-border bg-white p-5"
							>
								{@html svgContent}
							</div>
						</div>

						<!-- Compilation error (shown below preview if any) -->
						{#if typstError}
							<div
								class="mt-2 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
							>
								<AlertCircle class="h-4 w-4 shrink-0" />
								<span>{typstError}</span>
							</div>
						{/if}
					{:else}
						<!-- Empty/initial state - show raw Typst for now -->
						<div class="rounded-lg border bg-white p-4 dark:bg-zinc-950">
							<pre
								class="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">{renderedPreview ||
									'Cliquez sur "Actualiser" pour generer l\'apercu'}</pre>
						</div>
					{/if}

					<!-- Sample data used -->
					<div class="mt-4 space-y-2">
						<Label class="text-xs text-muted-foreground">Donnees utilisees pour l'apercu:</Label>
						<div class="grid gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
							{#each Object.entries(previewData).slice(0, 9) as [key, value] (key)}
								<div class="rounded border bg-muted/50 px-2 py-1">
									<span class="font-medium text-muted-foreground">{key}:</span>
									<span class="ml-1 truncate"
										>{value.length > 20 ? value.slice(0, 20) + '...' : value}</span
									>
								</div>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
