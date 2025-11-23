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
	import { Code2, Eye, Plus, AlertCircle, FileText } from 'lucide-svelte';
	import type { TemplatePlaceholder } from '$lib/types/worksheets';
	import {
		COMMON_PLACEHOLDERS,
		SAMPLE_PREVIEW_DATA,
		renderTemplate
	} from '$lib/worksheets/default-templates';

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
	 * Group placeholders by type
	 */
	function getPlaceholdersByType(type: 'text' | 'date' | 'dynamic'): TemplatePlaceholder[] {
		return placeholders.filter((p) => p.type === type);
	}

	/**
	 * Extract used placeholders from content
	 */
	function getUsedPlaceholders(): string[] {
		const matches = content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
		return matches.map((m) => m.replace(/\{\{|\}\}/g, ''));
	}

	// Derived: used placeholders
	let usedPlaceholders = $derived(getUsedPlaceholders());
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
							onclick={() => {
								renderedPreview = renderTemplate(content, previewData);
							}}
							class="h-8 gap-2"
						>
							<RefreshCw class="h-3 w-3" />
							Actualiser
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<!-- Rendered preview (raw Typst for now) -->
					<div class="rounded-lg border bg-white p-4 dark:bg-zinc-950">
						<pre
							class="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">{renderedPreview}</pre>
					</div>

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
