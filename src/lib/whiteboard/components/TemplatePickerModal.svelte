<script lang="ts">
	/**
	 * TemplatePickerModal - Dialog for selecting a whiteboard template
	 *
	 * Features:
	 * - Displays templates organized by category
	 * - Category filter using MySelect
	 * - Template cards with preview thumbnails
	 * - Loading and error states
	 */

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Loader2, FileText, Grid3x3, TriangleIcon, FunctionSquare, Axis3d } from 'lucide-svelte';
	import { templateService } from '../services/template-service';
	import {
		TEMPLATE_CATEGORIES,
		TEMPLATE_CATEGORY_LABELS,
		type WhiteboardTemplate,
		type WhiteboardTemplateCategory
	} from '../types/templates';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open: boolean;
		onSelect: (template: WhiteboardTemplate) => void;
		onClose: () => void;
	}

	let { open = $bindable(), onSelect, onClose }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let loading = $state(true);
	let error = $state<string | null>(null);
	let templates = $state<WhiteboardTemplate[]>([]);
	let selectedCategory = $state<WhiteboardTemplateCategory | 'all'>('all');

	// ==========================================================================
	// Derived
	// ==========================================================================

	const filteredTemplates = $derived(
		selectedCategory === 'all'
			? templates
			: templates.filter((t) => t.category === selectedCategory)
	);

	const categoryItems = $derived([
		{ value: 'all', label: 'Toutes les categories' },
		...TEMPLATE_CATEGORIES.map((cat) => ({
			value: cat,
			label: TEMPLATE_CATEGORY_LABELS[cat]
		}))
	]);

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		if (open) {
			loadTemplates();
		}
	});

	// ==========================================================================
	// Methods
	// ==========================================================================

	async function loadTemplates() {
		loading = true;
		error = null;

		const result = await templateService.getTemplates();

		if (result.success && result.templates) {
			templates = result.templates;
		} else {
			error = result.error ?? 'Erreur lors du chargement des templates';
		}

		loading = false;
	}

	function handleSelect(template: WhiteboardTemplate) {
		onSelect(template);
		open = false;
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function getCategoryIcon(category: WhiteboardTemplateCategory) {
		switch (category) {
			case 'geometry':
				return TriangleIcon;
			case 'algebra':
				return FunctionSquare;
			case 'graphs':
				return Axis3d;
			case 'grids':
				return Grid3x3;
			case 'blank':
			default:
				return FileText;
		}
	}

	/**
	 * Get background style CSS for template preview
	 */
	function getBackgroundPreviewStyle(template: WhiteboardTemplate): string {
		const bg = template.pageData.background;

		if (bg.type !== 'plain') {
			return 'background-color: #f0f0f0;';
		}

		const baseColor = bg.color || '#ffffff';

		switch (bg.style) {
			case 'grid':
				return `background-color: ${baseColor}; background-image: linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px); background-size: 10px 10px;`;
			case 'ruled':
				return `background-color: ${baseColor}; background-image: linear-gradient(#ccc 1px, transparent 1px); background-size: 100% 10px;`;
			case 'dotted':
				return `background-color: ${baseColor}; background-image: radial-gradient(#999 1px, transparent 1px); background-size: 10px 10px;`;
			case 'triangular':
			case 'triangular-dotted':
				return `background-color: ${baseColor}; background-image: linear-gradient(60deg, #ccc 1px, transparent 1px), linear-gradient(-60deg, #ccc 1px, transparent 1px); background-size: 10px 17px;`;
			case 'hexagonal':
			case 'hexagonal-dotted':
				return `background-color: ${baseColor}; background-image: radial-gradient(#999 1px, transparent 1px); background-size: 15px 26px;`;
			default:
				return `background-color: ${baseColor};`;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
	<Dialog.Content class="flex max-h-[80vh] max-w-2xl flex-col">
		<Dialog.Header>
			<Dialog.Title>Choisir un modele</Dialog.Title>
			<Dialog.Description>Selectionnez un modele pour creer une nouvelle page</Dialog.Description>
		</Dialog.Header>

		<!-- Category Filter -->
		<div class="border-b py-3">
			<MySelect
				type="single"
				bind:value={selectedCategory}
				items={categoryItems}
				placeholder="Filtrer par categorie"
			/>
		</div>

		<!-- Templates Grid -->
		<div class="min-h-[300px] flex-1 overflow-y-auto py-4">
			{#if loading}
				<div class="flex h-full items-center justify-center">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if error}
				<div class="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
					<p class="text-sm">{error}</p>
					<Button variant="outline" size="sm" onclick={loadTemplates}>Reessayer</Button>
				</div>
			{:else if filteredTemplates.length === 0}
				<div class="flex h-full items-center justify-center text-muted-foreground">
					<p class="text-sm">Aucun modele disponible</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
					{#each filteredTemplates as template (template.id)}
						{@const Icon = getCategoryIcon(template.category)}
						<button
							type="button"
							class="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md"
							onclick={() => handleSelect(template)}
						>
							<!-- Preview Thumbnail -->
							<div
								class="flex h-24 w-full items-center justify-center"
								style={getBackgroundPreviewStyle(template)}
							>
								{#if template.thumbnail}
									<img
										src={template.thumbnail}
										alt={template.name}
										class="h-full w-full object-cover"
									/>
								{:else}
									<Icon class="h-8 w-8 text-muted-foreground/50" />
								{/if}
							</div>

							<!-- Template Info -->
							<div class="p-3 text-left">
								<h4 class="truncate text-sm font-medium">{template.name}</h4>
								{#if template.description}
									<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
										{template.description}
									</p>
								{/if}
								<div class="mt-2 flex items-center gap-1">
									<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
										{TEMPLATE_CATEGORY_LABELS[template.category]}
									</span>
									{#if template.isSystem}
										<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
											Systeme
										</span>
									{/if}
								</div>
							</div>

							<!-- Hover overlay -->
							<div
								class="pointer-events-none absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100"
							/>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="border-t pt-4">
			<Button variant="outline" onclick={handleClose}>Annuler</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
