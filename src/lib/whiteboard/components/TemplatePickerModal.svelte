<script lang="ts">
	/**
	 * TemplatePickerModal - Dialog for selecting and creating whiteboard templates
	 *
	 * Features:
	 * - Tabs: "Parcourir" (browse) and "Creer" (create)
	 * - Favorites section with star toggle
	 * - Category filtering
	 * - Template creation form with format, background, font options
	 * - Customization dialog before applying a template
	 */

	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		Loader2,
		FileText,
		Grid3x3,
		TriangleIcon,
		FunctionSquare,
		Axis3d,
		Star,
		Plus
	} from 'lucide-svelte';
	import { templateService, type CreateFromModalInput } from '../services/template-service';
	import {
		TEMPLATE_CATEGORIES,
		TEMPLATE_CATEGORY_LABELS,
		TEMPLATE_FONTS,
		TEMPLATE_FONT_LABELS,
		type WhiteboardTemplateWithFavorite,
		type WhiteboardTemplateCategory,
		type TemplateFont,
		type TemplatePageData
	} from '../types/templates';
	import { PAGE_FORMATS, type BackgroundStyle, type PageFormatKey } from '../types/document';
	import { toaster } from '$lib/stores/toaster.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open: boolean;
		onSelect: (pageData: TemplatePageData) => void;
		onClose: () => void;
	}

	let { open = $bindable(), onSelect, onClose }: Props = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	const BACKGROUND_STYLES: { value: BackgroundStyle; label: string }[] = [
		{ value: 'plain', label: 'Uni' },
		{ value: 'grid', label: 'Quadrille' },
		{ value: 'ruled', label: 'Lignes' },
		{ value: 'dotted', label: 'Points' },
		{ value: 'triangular', label: 'Triangulaire' },
		{ value: 'triangular-dotted', label: 'Triangulaire points' },
		{ value: 'hexagonal', label: 'Hexagonal' },
		{ value: 'hexagonal-dotted', label: 'Hexagonal points' }
	];

	const PAGE_FORMAT_ITEMS = Object.entries(PAGE_FORMATS).map(([key, { label }]) => ({
		value: key as PageFormatKey,
		label
	}));

	const FONT_ITEMS = TEMPLATE_FONTS.map((font) => ({
		value: font,
		label: TEMPLATE_FONT_LABELS[font]
	}));

	const GRID_SPACING_OPTIONS = [
		{ value: 10, label: '10px (fin)' },
		{ value: 15, label: '15px' },
		{ value: 20, label: '20px (defaut)' },
		{ value: 25, label: '25px' },
		{ value: 30, label: '30px (large)' },
		{ value: 40, label: '40px' },
		{ value: 50, label: '50px (tres large)' }
	];

	const BACKGROUND_COLORS = [
		'#ffffff',
		'#fffef0',
		'#f0f8ff',
		'#f5f5f5',
		'#fff5ee',
		'#f0fff0',
		'#e8e8e8',
		'#1a1a2e'
	];

	// ==========================================================================
	// State - Main
	// ==========================================================================

	let activeTab = $state<'browse' | 'create'>('browse');
	let loading = $state(true);
	let error = $state<string | null>(null);
	let templates = $state<WhiteboardTemplateWithFavorite[]>([]);
	let selectedCategory = $state<WhiteboardTemplateCategory | 'all'>('all');

	// ==========================================================================
	// State - Create Form
	// ==========================================================================

	let createName = $state('');
	let createDescription = $state('');
	let createCategory = $state<WhiteboardTemplateCategory>('grids');
	let createFormat = $state<PageFormatKey>('A4');
	let createBackgroundColor = $state('#ffffff');
	let createBackgroundStyle = $state<BackgroundStyle>('grid');
	let createGridSpacing = $state(20);
	let createFont = $state<TemplateFont | undefined>(undefined);
	let isCreating = $state(false);

	// ==========================================================================
	// State - Customization Dialog
	// ==========================================================================

	let showCustomizeDialog = $state(false);
	let selectedTemplate = $state<WhiteboardTemplateWithFavorite | null>(null);
	let customBackgroundColor = $state('#ffffff');
	let customBackgroundStyle = $state<BackgroundStyle>('plain');
	let customGridSpacing = $state(20);
	let customFont = $state<TemplateFont | undefined>(undefined);

	// ==========================================================================
	// Derived
	// ==========================================================================

	const favoriteTemplates = $derived(templates.filter((t) => t.isFavorite));

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

	const showGridSpacing = $derived(createBackgroundStyle !== 'plain');
	const showCustomGridSpacing = $derived(customBackgroundStyle !== 'plain');

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		if (open) {
			loadTemplates();
		}
	});

	// ==========================================================================
	// Methods - Data Loading
	// ==========================================================================

	async function loadTemplates() {
		loading = true;
		error = null;

		const result = await templateService.getTemplates(undefined, true);

		if (result.success && result.templates) {
			templates = result.templates;
		} else {
			error = result.error ?? 'Erreur lors du chargement des modeles';
		}

		loading = false;
	}

	// ==========================================================================
	// Methods - Favorites
	// ==========================================================================

	async function toggleFavorite(e: MouseEvent, template: WhiteboardTemplateWithFavorite) {
		e.stopPropagation();

		const newIsFavorite = !template.isFavorite;
		const result = await templateService.toggleFavorite(template.id, newIsFavorite);

		if (result.success) {
			// Update local state optimistically
			templates = templates.map((t) =>
				t.id === template.id ? { ...t, isFavorite: newIsFavorite } : t
			);
		} else {
			toaster.error(result.error ?? 'Erreur lors de la mise a jour des favoris');
		}
	}

	// ==========================================================================
	// Methods - Template Selection
	// ==========================================================================

	function handleTemplateClick(template: WhiteboardTemplateWithFavorite) {
		selectedTemplate = template;

		// Initialize customization with template's current values
		const bg = template.pageData.background;
		if (bg.type === 'plain') {
			customBackgroundColor = bg.color;
			customBackgroundStyle = bg.style;
			customGridSpacing = bg.gridSpacing ?? 20;
		} else {
			customBackgroundColor = '#ffffff';
			customBackgroundStyle = 'plain';
			customGridSpacing = 20;
		}
		customFont = template.pageData.font;

		showCustomizeDialog = true;
	}

	function applyCustomizedTemplate() {
		if (!selectedTemplate) return;

		// Build customized page data
		const pageData: TemplatePageData = {
			...selectedTemplate.pageData,
			background: {
				type: 'plain',
				style: customBackgroundStyle,
				color: customBackgroundColor,
				...(showCustomGridSpacing ? { gridSpacing: customGridSpacing } : {})
			},
			...(customFont ? { font: customFont } : {})
		};

		onSelect(pageData);
		showCustomizeDialog = false;
		selectedTemplate = null;
		open = false;
	}

	// ==========================================================================
	// Methods - Create Template
	// ==========================================================================

	async function handleCreateTemplate() {
		if (!createName.trim()) {
			toaster.error('Veuillez entrer un nom pour le modele');
			return;
		}

		isCreating = true;

		const input: CreateFromModalInput = {
			name: createName.trim(),
			description: createDescription.trim() || null,
			category: createCategory,
			format: createFormat,
			backgroundColor: createBackgroundColor,
			backgroundStyle: createBackgroundStyle,
			...(showGridSpacing ? { gridSpacing: createGridSpacing } : {}),
			...(createFont ? { font: createFont } : {})
		};

		const result = await templateService.createFromModal(input);

		isCreating = false;

		if (result.success && result.template) {
			toaster.success('Modele cree avec succes');
			// Reset form
			resetCreateForm();
			// Switch to browse tab and reload
			activeTab = 'browse';
			await loadTemplates();
		} else {
			toaster.error(result.error ?? 'Erreur lors de la creation du modele');
		}
	}

	function resetCreateForm() {
		createName = '';
		createDescription = '';
		createCategory = 'grids';
		createFormat = 'A4';
		createBackgroundColor = '#ffffff';
		createBackgroundStyle = 'grid';
		createGridSpacing = 20;
		createFont = undefined;
	}

	// ==========================================================================
	// Methods - UI
	// ==========================================================================

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

	function getBackgroundPreviewStyle(bgColor: string, bgStyle: BackgroundStyle): string {
		switch (bgStyle) {
			case 'grid':
				return `background-color: ${bgColor}; background-image: linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px); background-size: 10px 10px;`;
			case 'ruled':
				return `background-color: ${bgColor}; background-image: linear-gradient(#ccc 1px, transparent 1px); background-size: 100% 10px;`;
			case 'dotted':
				return `background-color: ${bgColor}; background-image: radial-gradient(#999 1px, transparent 1px); background-size: 10px 10px;`;
			case 'triangular':
			case 'triangular-dotted':
				return `background-color: ${bgColor}; background-image: linear-gradient(60deg, #ccc 1px, transparent 1px), linear-gradient(-60deg, #ccc 1px, transparent 1px); background-size: 10px 17px;`;
			case 'hexagonal':
			case 'hexagonal-dotted':
				return `background-color: ${bgColor}; background-image: radial-gradient(#999 1px, transparent 1px); background-size: 15px 26px;`;
			default:
				return `background-color: ${bgColor};`;
		}
	}

	function getTemplatePreviewStyle(template: WhiteboardTemplateWithFavorite): string {
		const bg = template.pageData.background;
		if (bg.type !== 'plain') {
			return 'background-color: #f0f0f0;';
		}
		return getBackgroundPreviewStyle(bg.color, bg.style);
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
	<Dialog.Content class="flex max-h-[85vh] max-w-3xl flex-col">
		<Dialog.Header>
			<Dialog.Title>Choisir un modele</Dialog.Title>
			<Dialog.Description>
				Parcourez les modeles existants ou creez-en un nouveau
			</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root bind:value={activeTab} class="flex flex-1 flex-col overflow-hidden">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="browse">Parcourir</Tabs.Trigger>
				<Tabs.Trigger value="create">
					<Plus class="mr-1 h-4 w-4" />
					Creer
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Browse Tab -->
			<Tabs.Content value="browse" class="flex flex-1 flex-col overflow-hidden">
				<!-- Category Filter -->
				<div class="border-b py-3">
					<MySelect
						type="single"
						bind:value={selectedCategory}
						items={categoryItems}
						placeholder="Filtrer par categorie"
					/>
				</div>

				<!-- Templates Content -->
				<div class="min-h-[300px] flex-1 overflow-y-auto py-4">
					{#if loading}
						<div class="flex h-full items-center justify-center">
							<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					{:else if error}
						<div
							class="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground"
						>
							<p class="text-sm">{error}</p>
							<Button variant="outline" size="sm" onclick={loadTemplates}>Reessayer</Button>
						</div>
					{:else}
						<!-- Favorites Section -->
						{#if favoriteTemplates.length > 0 && selectedCategory === 'all'}
							<div class="mb-6">
								<h3 class="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
									<Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
									Favoris
								</h3>
								<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
									{#each favoriteTemplates as template (template.id)}
										{@const Icon = getCategoryIcon(template.category)}
										<div
											role="button"
											tabindex="0"
											class="template-card group"
											onclick={() => handleTemplateClick(template)}
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													handleTemplateClick(template);
												}
											}}
										>
											<div class="template-preview" style={getTemplatePreviewStyle(template)}>
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
											<div class="template-info">
												<div class="flex items-start justify-between gap-2">
													<h4 class="truncate text-sm font-medium">{template.name}</h4>
													<button
														type="button"
														class="favorite-btn"
														onclick={(e) => toggleFavorite(e, template)}
														title={template.isFavorite
															? 'Retirer des favoris'
															: 'Ajouter aux favoris'}
													>
														<Star
															class="h-4 w-4 {template.isFavorite
																? 'fill-yellow-400 text-yellow-400'
																: 'text-muted-foreground'}"
														/>
													</button>
												</div>
												<span class="category-badge">
													{TEMPLATE_CATEGORY_LABELS[template.category]}
												</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
							<hr class="mb-4" />
						{/if}

						<!-- All Templates -->
						{#if filteredTemplates.length === 0}
							<div class="flex h-full items-center justify-center text-muted-foreground">
								<p class="text-sm">Aucun modele disponible</p>
							</div>
						{:else}
							<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
								{#each filteredTemplates as template (template.id)}
									{@const Icon = getCategoryIcon(template.category)}
									<div
										role="button"
										tabindex="0"
										class="template-card group"
										onclick={() => handleTemplateClick(template)}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												handleTemplateClick(template);
											}
										}}
									>
										<div class="template-preview" style={getTemplatePreviewStyle(template)}>
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
										<div class="template-info">
											<div class="flex items-start justify-between gap-2">
												<h4 class="truncate text-sm font-medium">{template.name}</h4>
												<button
													type="button"
													class="favorite-btn"
													onclick={(e) => toggleFavorite(e, template)}
													title={template.isFavorite
														? 'Retirer des favoris'
														: 'Ajouter aux favoris'}
												>
													<Star
														class="h-4 w-4 {template.isFavorite
															? 'fill-yellow-400 text-yellow-400'
															: 'text-muted-foreground hover:text-yellow-400'}"
													/>
												</button>
											</div>
											<span class="category-badge">
												{TEMPLATE_CATEGORY_LABELS[template.category]}
											</span>
											{#if template.isSystem}
												<span class="system-badge">Systeme</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</Tabs.Content>

			<!-- Create Tab -->
			<Tabs.Content value="create" class="flex-1 overflow-y-auto py-4">
				<div class="grid gap-4">
					<!-- Name -->
					<div class="grid gap-2">
						<Label for="template-name">Nom du modele *</Label>
						<Input
							id="template-name"
							bind:value={createName}
							placeholder="Ex: Quadrillage standard"
							maxlength={100}
						/>
					</div>

					<!-- Description -->
					<div class="grid gap-2">
						<Label for="template-description">Description (optionnel)</Label>
						<Textarea
							id="template-description"
							bind:value={createDescription}
							placeholder="Description du modele..."
							rows={2}
							maxlength={500}
						/>
					</div>

					<!-- Category & Format -->
					<div class="grid grid-cols-2 gap-4">
						<div class="grid gap-2">
							<Label>Categorie</Label>
							<MySelect
								type="single"
								bind:value={createCategory}
								items={TEMPLATE_CATEGORIES.map((cat) => ({
									value: cat,
									label: TEMPLATE_CATEGORY_LABELS[cat]
								}))}
							/>
						</div>
						<div class="grid gap-2">
							<Label>Format de page</Label>
							<MySelect type="single" bind:value={createFormat} items={PAGE_FORMAT_ITEMS} />
						</div>
					</div>

					<!-- Background Color -->
					<div class="grid gap-2">
						<Label>Couleur de fond</Label>
						<div class="flex flex-wrap gap-2">
							{#each BACKGROUND_COLORS as color (color)}
								<button
									type="button"
									class="color-swatch {createBackgroundColor === color ? 'selected' : ''}"
									style:background-color={color}
									onclick={() => (createBackgroundColor = color)}
									title={color}
								/>
							{/each}
							<input
								type="color"
								bind:value={createBackgroundColor}
								class="h-8 w-8 cursor-pointer rounded border"
								title="Couleur personnalisee"
							/>
						</div>
					</div>

					<!-- Background Style -->
					<div class="grid gap-2">
						<Label>Style de fond</Label>
						<MySelect type="single" bind:value={createBackgroundStyle} items={BACKGROUND_STYLES} />
					</div>

					<!-- Grid Spacing (conditional) -->
					{#if showGridSpacing}
						<div class="grid gap-2">
							<Label>Espacement de la grille</Label>
							<MySelect type="single" bind:value={createGridSpacing} items={GRID_SPACING_OPTIONS} />
						</div>
					{/if}

					<!-- Font -->
					<div class="grid gap-2">
						<Label>Police par defaut (optionnel)</Label>
						<MySelect
							type="single"
							bind:value={createFont}
							items={[{ value: undefined, label: 'Aucune preference' }, ...FONT_ITEMS]}
						/>
					</div>

					<!-- Preview -->
					<div class="grid gap-2">
						<Label>Apercu</Label>
						<div
							class="h-24 rounded-lg border"
							style={getBackgroundPreviewStyle(createBackgroundColor, createBackgroundStyle)}
						/>
					</div>

					<!-- Create Button -->
					<Button
						onclick={handleCreateTemplate}
						disabled={isCreating || !createName.trim()}
						class="w-full"
					>
						{#if isCreating}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Creation...
						{:else}
							Creer le modele
						{/if}
					</Button>
				</div>
			</Tabs.Content>
		</Tabs.Root>

		<Dialog.Footer class="border-t pt-4">
			<Button variant="outline" onclick={handleClose}>Annuler</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Customization Dialog -->
<Dialog.Root bind:open={showCustomizeDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Personnaliser "{selectedTemplate?.name}"</Dialog.Title>
			<Dialog.Description>Modifiez les options avant de creer la page</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<!-- Background Color -->
			<div class="grid gap-2">
				<Label>Couleur de fond</Label>
				<div class="flex flex-wrap gap-2">
					{#each BACKGROUND_COLORS as color (color)}
						<button
							type="button"
							class="color-swatch {customBackgroundColor === color ? 'selected' : ''}"
							style:background-color={color}
							onclick={() => (customBackgroundColor = color)}
							title={color}
						/>
					{/each}
					<input
						type="color"
						bind:value={customBackgroundColor}
						class="h-8 w-8 cursor-pointer rounded border"
						title="Couleur personnalisee"
					/>
				</div>
			</div>

			<!-- Background Style -->
			<div class="grid gap-2">
				<Label>Style de fond</Label>
				<MySelect type="single" bind:value={customBackgroundStyle} items={BACKGROUND_STYLES} />
			</div>

			<!-- Grid Spacing (conditional) -->
			{#if showCustomGridSpacing}
				<div class="grid gap-2">
					<Label>Espacement de la grille</Label>
					<MySelect type="single" bind:value={customGridSpacing} items={GRID_SPACING_OPTIONS} />
				</div>
			{/if}

			<!-- Font -->
			<div class="grid gap-2">
				<Label>Police par defaut</Label>
				<MySelect
					type="single"
					bind:value={customFont}
					items={[{ value: undefined, label: 'Aucune preference' }, ...FONT_ITEMS]}
				/>
			</div>

			<!-- Preview -->
			<div class="grid gap-2">
				<Label>Apercu</Label>
				<div
					class="h-20 rounded-lg border"
					style={getBackgroundPreviewStyle(customBackgroundColor, customBackgroundStyle)}
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCustomizeDialog = false)}>Annuler</Button>
			<Button onclick={applyCustomizedTemplate}>Creer la page</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.template-card {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
		background-color: hsl(var(--card));
		color: hsl(var(--card-foreground));
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
		transition: all 0.15s;
		cursor: pointer;
		text-align: left;
	}

	.template-card:hover {
		border-color: hsl(var(--primary));
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.template-preview {
		display: flex;
		height: 5rem;
		width: 100%;
		align-items: center;
		justify-content: center;
	}

	.template-info {
		padding: 0.75rem;
	}

	.category-badge {
		display: inline-block;
		margin-top: 0.5rem;
		border-radius: 9999px;
		background-color: hsl(var(--muted));
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
	}

	.system-badge {
		display: inline-block;
		margin-left: 0.25rem;
		margin-top: 0.5rem;
		border-radius: 9999px;
		background-color: hsl(var(--primary) / 0.1);
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--primary));
	}

	.favorite-btn {
		flex-shrink: 0;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: transform 0.1s;
	}

	.favorite-btn:hover {
		transform: scale(1.1);
	}

	.color-swatch {
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		border: 2px solid transparent;
		cursor: pointer;
		transition:
			transform 0.1s,
			border-color 0.1s;
	}

	.color-swatch:hover {
		transform: scale(1.05);
	}

	.color-swatch.selected {
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 2px hsl(var(--background));
	}
</style>
