<script lang="ts">
	/**
	 * Admin Question Templates - List Page
	 * =====================================
	 *
	 * Features:
	 * - List all question templates with pagination
	 * - Server-side sorting (Created date, Last updated date, Question type)
	 * - Server-side full-text search with PostgreSQL (French config)
	 * - Filter by type and grade level (multi-select)
	 * - Debounced search input (500ms delay)
	 * - View mode toggle (Table / Card grid)
	 * - localStorage persistence for view mode
	 * - URL query parameters for shareable filtered views
	 * - Actions: View, Edit, Duplicate, Delete
	 * - Preview modal for generated instances
	 *
	 * Performance Optimizations:
	 * - All filtering done server-side (0ms client-side processing)
	 * - Debounced search prevents excessive API calls
	 * - localStorage reduces re-fetching view preferences
	 * - Card/table view persisted across sessions
	 *
	 * Data Flow:
	 * 1. User changes filter/sort → Update local state
	 * 2. applyFilters() → Build URL query params
	 * 3. goto() → Navigate with params
	 * 4. +page.server.ts load() → Process query params
	 * 5. Supabase query → Return filtered/sorted data
	 * 6. Component re-renders with new data
	 */

	import type { PageData } from './$types';
	import { getQuestionType } from '$lib/questions/types';
	import { goto, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { questionCategoriesCache } from '$lib/stores/questionCategories.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import QuestionTemplateCard from '$lib/components/QuestionTemplateCard.svelte';
	import { GRADE_OPTIONS, type GradeCode } from '$lib/types/grades';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import BulkStatusReport from './BulkStatusReport.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		BulkStatusError,
		changeTemplatesStatus,
		type BulkStatusSummary,
		type BulkTemplateStatus
	} from '$lib/questions/bulk-status';
	import {
		Plus,
		Eye,
		Pencil,
		Copy,
		Trash2,
		ChevronLeft,
		ChevronRight,
		Search,
		LayoutGrid,
		List,
		ArrowUpDown,
		ArrowUp,
		ArrowDown,
		Loader2,
		ChevronDown,
		Send,
		Undo2
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	// Snapshot of the initial data prop for $state initializers below.

	// svelte-ignore state_referenced_locally
	const initialData = data;

	/**
	 * Local state (Svelte 5 runes)
	 *
	 * All state is initialized from URL query parameters (initialData.filters)
	 * to ensure consistency when navigating with filtered URLs.
	 */
	let searchTerm = $state(initialData.filters.search || ''); // Current search term
	let selectedType = $state<string>(initialData.filters.type || 'all'); // Filter by question type
	let selectedGradesList = $state<GradeCode[]>(
		// Filter by grade levels (comma-separated in URL)
		(initialData.filters.grades
			? initialData.filters.grades.split(',').map((g) => g.trim())
			: []) as GradeCode[]
	);
	let selectedTheme = $state<string>(initialData.filters.theme || 'all'); // Filter by theme
	let selectedDomain = $state<string>(initialData.filters.domain || 'all'); // Filter by domain
	let selectedSubdomain = $state<string>(initialData.filters.subdomain || 'all'); // Filter by subdomain
	let minLevel = $state<number | undefined>(
		initialData.filters.minLevel ? parseInt(initialData.filters.minLevel) : undefined
	); // Minimum difficulty level
	let maxLevel = $state<number | undefined>(
		initialData.filters.maxLevel ? parseInt(initialData.filters.maxLevel) : undefined
	); // Maximum difficulty level
	let sortField = $state<string>(initialData.sort || 'created_at'); // Sort column
	let sortOrder = $state<'asc' | 'desc'>(initialData.order === 'asc' ? 'asc' : 'desc'); // Sort direction
	let viewMode = $state<'table' | 'card'>('table'); // Display mode (persisted in localStorage)
	let deleteConfirmOpen = $state(false); // Delete dialog state
	let templateToDelete = $state<string | null>(null); // Template ID to delete
	let isDeleting = $state(false); // Deletion in progress
	let isSearching = $state(false); // Search API call in progress
	let searchDebounceTimer: number; // Timeout ID for debounced search
	let filtersOpen = $state(true); // Filters section collapsible state

	// Publication par lot
	const selectedDraftIds = new SvelteSet<string>(); // Brouillons cochés
	const selectedPublishedIds = new SvelteSet<string>(); // Publiés cochés (page courante)
	let draftGradeFilter = $state('all'); // Filtre de l'onglet Brouillons : niveau scolaire
	let draftThemeFilter = $state('all'); // Filtre de l'onglet Brouillons : thème
	let bulkProgress = $state<{ done: number; total: number } | null>(null); // Paquets envoyés
	let bulkSummary = $state<BulkStatusSummary | null>(null); // Dernier compte rendu
	let bulkError = $state<string | null>(null); // Paquet en échec
	let unpublishConfirmOpen = $state(false); // Confirmation du retour en brouillon

	// Question types for filter
	const questionTypes: { value: string; label: string }[] = [
		{ value: 'all', label: 'Tous les types' },
		{ value: 'fill_in_blanks', label: 'À trous' },
		{ value: 'multiple_choice', label: 'QCM' },
		{ value: 'course_card', label: 'Carte de cours' }
	];

	// Sort field options
	const sortFields = [
		{ value: 'created_at', label: 'Date de création' },
		{ value: 'updated_at', label: 'Dernière modification' },
		{ value: 'type', label: 'Type de question' }
	];

	// Pagination info
	let totalPages = $derived(Math.ceil(data.total / data.limit));
	let currentPage = $derived(data.page);

	// Brouillons visibles selon les filtres de l'onglet (niveau scolaire, thème)
	let filteredDrafts = $derived(
		data.drafts.filter(
			(template) =>
				(draftGradeFilter === 'all' || template.grades.includes(draftGradeFilter)) &&
				(draftThemeFilter === 'all' || template.theme === draftThemeFilter)
		)
	);
	// On ne publie que ce qu'on voit : coché ET visible
	let draftIdsToPublish = $derived(
		filteredDrafts.filter((template) => selectedDraftIds.has(template.id)).map((t) => t.id)
	);
	let allFilteredDraftsSelected = $derived(
		filteredDrafts.length > 0 && draftIdsToPublish.length === filteredDrafts.length
	);
	let publishedIdsToUnpublish = $derived(
		data.templates.filter((template) => selectedPublishedIds.has(template.id)).map((t) => t.id)
	);
	let allPublishedSelected = $derived(
		data.templates.length > 0 && publishedIdsToUnpublish.length === data.templates.length
	);
	let draftGradeItems = $derived([
		{ value: 'all', label: 'Tous les niveaux' },
		...GRADE_OPTIONS.filter((option) =>
			data.drafts.some((template) => template.grades.includes(option.value))
		)
	]);
	let draftThemeItems = $derived([
		{ value: 'all', label: 'Tous les thèmes' },
		...[...new Set(data.drafts.map((template) => template.theme))]
			.sort((a, b) => a.localeCompare(b, 'fr'))
			.map((theme) => ({ value: theme, label: theme }))
	]);
	let isBulkRunning = $derived(bulkProgress !== null);
	let unpublishConfirmText = $derived(
		publishedIdsToUnpublish.length > 1
			? `${publishedIdsToUnpublish.length} modèles ne seront plus proposés aux élèves. Les republier repassera le contrôle complet.`
			: 'Ce modèle ne sera plus proposé aux élèves. Le republier repassera le contrôle complet.'
	);

	/**
	 * localStorage persistence for view mode
	 *
	 * Load saved view mode on mount (client-side only)
	 * Guards with `browser` check to prevent SSR issues
	 */
	if (browser) {
		const savedViewMode = localStorage.getItem('questionsViewMode');
		if (savedViewMode === 'table' || savedViewMode === 'card') {
			viewMode = savedViewMode;
		}
	}

	/**
	 * Auto-save view mode to localStorage when it changes
	 *
	 * Uses Svelte 5 $effect rune to react to viewMode changes
	 * Ensures preference persists across sessions
	 */
	$effect(() => {
		if (browser) {
			localStorage.setItem('questionsViewMode', viewMode);
		}
	});

	/**
	 * Get display label for question type
	 */
	function getTypeLabel(type: string): string {
		const found = questionTypes.find((t) => t.value === type);
		return found?.label || type;
	}

	/**
	 * Get badge color for question type
	 * All types use secondary color variant
	 */
	function getTypeBadgeClass(_type: string): string {
		return 'bg-secondary text-secondary-foreground';
	}

	/**
	 * Debounced search handler
	 *
	 * Delays search API call by 500ms to prevent excessive requests
	 * while user is still typing. Clears previous timer on each keystroke.
	 *
	 * Flow:
	 * 1. User types → Update searchTerm → Show loading spinner
	 * 2. Clear previous timer (if any)
	 * 3. Start new 500ms timer
	 * 4. When timer fires → Call applyFilters() → Server-side search
	 * 5. Hide loading spinner
	 *
	 * Performance: For "mathematics", prevents 11 API calls down to 1
	 */
	function handleSearchInput(value: string) {
		searchTerm = value;
		isSearching = true;

		// Clear existing timer
		if (searchDebounceTimer) {
			clearTimeout(searchDebounceTimer);
		}

		// Set new timer (500ms delay)
		searchDebounceTimer = setTimeout(() => {
			applyFilters();
			isSearching = false;
		}, 500) as unknown as number;
	}

	/**
	 * Handle sort column click
	 *
	 * Clicking a column header toggles sort order if already sorted by that field,
	 * or sets sort to that field with descending order (most recent first).
	 *
	 * Example:
	 * - Click "Créé le" (not sorted) → Sort by created_at DESC
	 * - Click "Créé le" again → Toggle to ASC
	 * - Click "Type" → Switch to type DESC
	 */
	function handleSort(field: string) {
		// Toggle order if same field, otherwise default to desc
		if (sortField === field) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortOrder = 'desc';
		}
		applyFilters();
	}

	/**
	 * Get sort icon for table header
	 *
	 * Returns:
	 * - ArrowUpDown: Column not currently sorted (default state)
	 * - ArrowUp: Sorted ascending (A→Z, oldest first)
	 * - ArrowDown: Sorted descending (Z→A, newest first)
	 */
	function getSortIcon(field: string) {
		if (sortField !== field) return ArrowUpDown;
		return sortOrder === 'asc' ? ArrowUp : ArrowDown;
	}

	/**
	 * Toggle view mode (table/card)
	 */
	function toggleViewMode() {
		viewMode = viewMode === 'table' ? 'card' : 'table';
	}

	/**
	 * Apply filters (navigates with query params)
	 *
	 * Builds URL query string from current filter/sort state and navigates.
	 * This triggers +page.server.ts load() function with updated params.
	 *
	 * Query Parameter Format:
	 * - type: Question type ('numerical_exact', 'algebraic_transform', etc.)
	 * - grades: Comma-separated grade levels ('6,5,4')
	 * - search: Full-text search term
	 * - sort: Sort field ('created_at', 'updated_at', 'type')
	 * - order: Sort direction ('asc' or 'desc')
	 *
	 * Example URL:
	 * /dashboard/admin/questions?type=numerical_exact&grades=6,5&search=fraction&sort=created_at&order=desc
	 *
	 * Benefits:
	 * - Shareable URLs (send link to colleague with filters applied)
	 * - Bookmarkable (save frequently-used filter combinations)
	 * - Browser history (back button restores previous filter state)
	 */
	function applyFilters() {
		const params = new URLSearchParams();

		if (selectedType && selectedType !== 'all') {
			params.set('type', selectedType);
		}

		if (selectedGradesList.length > 0) {
			params.set('grades', selectedGradesList.join(','));
		}

		if (selectedTheme && selectedTheme !== 'all') {
			params.set('theme', selectedTheme);
		}

		if (selectedDomain && selectedDomain !== 'all') {
			params.set('domain', selectedDomain);
		}

		if (selectedSubdomain && selectedSubdomain !== 'all') {
			params.set('subdomain', selectedSubdomain);
		}

		if (minLevel !== undefined && minLevel > 0) {
			params.set('minLevel', minLevel.toString());
		}

		if (maxLevel !== undefined && maxLevel > 0) {
			params.set('maxLevel', maxLevel.toString());
		}

		if (searchTerm) {
			params.set('search', searchTerm);
		}

		if (sortField) {
			params.set('sort', sortField);
		}

		if (sortOrder) {
			params.set('order', sortOrder);
		}

		goto(`/dashboard/admin/questions?${params.toString()}`);
	}

	/**
	 * Clear all filters
	 */
	function clearFilters() {
		selectedType = 'all';
		selectedGradesList = [];
		selectedTheme = 'all';
		selectedDomain = 'all';
		selectedSubdomain = 'all';
		minLevel = undefined;
		maxLevel = undefined;
		searchTerm = '';
		sortField = 'created_at';
		sortOrder = 'desc';
		goto('/dashboard/admin/questions').then(() => {});
	}

	/**
	 * Navigate to create page
	 */
	function handleCreate() {
		goto('/dashboard/admin/questions/create').then(() => {});
	}

	/**
	 * Navigate to edit page
	 */
	function handleEdit(id: string) {
		goto(`/dashboard/admin/questions/${id}/edit`).then(() => {});
	}

	/**
	 * Navigate to preview page
	 */
	function handlePreview(id: string) {
		goto(`/dashboard/admin/questions/${id}/preview`).then(() => {});
	}

	/**
	 * Duplicate template
	 */
	async function handleDuplicate(id: string) {
		try {
			// Fetch original template
			const response = await fetch(`/api/questions/templates/${id}`);
			if (!response.ok) throw new Error('Failed to fetch template');

			const original = await response.json();

			// Create duplicate (remove id and timestamps)
			const duplicate = {
				...original,
				id: undefined,
				created_at: undefined,
				updated_at: undefined,
				created_by: undefined
			};

			// Create new template
			const createResponse = await fetch('/api/questions/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(duplicate)
			});

			if (!createResponse.ok) throw new Error('Failed to create duplicate');

			const result = await createResponse.json();

			if (result.success) {
				// Invalidate caches to force refresh
				questionCategoriesCache.invalidate();
				questionTemplatesCache.invalidate();

				toaster.success('Template dupliqué avec succès');
				// Refresh page
				goto('/dashboard/admin/questions', { invalidateAll: true }).then(() => {});
			} else {
				toaster.error('Erreur lors de la duplication : ' + result.errors.join(', '));
			}
		} catch (error) {
			console.error('Duplicate error:', error);
			toaster.error('Erreur lors de la duplication du template');
		}
	}

	/**
	 * Open delete confirmation dialog
	 */
	function handleDeleteClick(id: string) {
		templateToDelete = id;
		deleteConfirmOpen = true;
	}

	/**
	 * Confirm delete
	 */
	async function confirmDelete() {
		if (!templateToDelete) return;

		isDeleting = true;
		try {
			const response = await fetch(`/api/questions/templates/${templateToDelete}`, {
				method: 'DELETE'
			});

			if (!response.ok) throw new Error('Delete failed');

			const result = await response.json();

			if (result.success) {
				// Invalidate caches to force refresh
				questionCategoriesCache.invalidate();
				questionTemplatesCache.invalidate();

				toaster.success('Template supprimé avec succès');
				deleteConfirmOpen = false;
				templateToDelete = null;
				// Refresh page
				goto('/dashboard/admin/questions', { invalidateAll: true }).then(() => {});
			} else {
				toaster.error('Erreur lors de la suppression');
			}
		} catch (error) {
			console.error('Delete error:', error);
			toaster.error('Erreur lors de la suppression du template');
		} finally {
			isDeleting = false;
		}
	}

	/**
	 * Coche / décoche une ligne
	 */
	function handleToggleRow(selection: SvelteSet<string>, id: string, checked: boolean) {
		if (checked) selection.add(id);
		else selection.delete(id);
	}

	/**
	 * « Tout cocher » : porte sur les lignes visibles seulement
	 */
	function handleToggleAll(selection: SvelteSet<string>, ids: string[], checked: boolean) {
		for (const id of ids) {
			if (checked) selection.add(id);
			else selection.delete(id);
		}
	}

	/**
	 * Publication / retour en brouillon par lot, puis rechargement des données
	 */
	async function runBulkStatusChange(ids: string[], status: BulkTemplateStatus) {
		if (ids.length === 0 || isBulkRunning) return;
		bulkSummary = null;
		bulkError = null;
		bulkProgress = { done: 0, total: ids.length };
		try {
			bulkSummary = await changeTemplatesStatus(ids, status, (done, total) => {
				bulkProgress = { done, total };
			});
		} catch (err) {
			console.error('Bulk status error:', err);
			bulkError = err instanceof Error ? err.message : 'Erreur inconnue';
			if (err instanceof BulkStatusError) bulkSummary = err.partial;
			toaster.error('Le changement de statut a été interrompu');
		} finally {
			bulkProgress = null;
		}
		// Les modèles changés quittent leur onglet : on vide les sélections
		for (const entry of bulkSummary?.changed ?? []) {
			selectedDraftIds.delete(entry.id);
			selectedPublishedIds.delete(entry.id);
		}
		questionCategoriesCache.invalidate();
		questionTemplatesCache.invalidate();
		await invalidateAll();
	}

	function handlePublishSelection() {
		runBulkStatusChange(draftIdsToPublish, 'published').then(() => {});
	}

	function handleConfirmUnpublish() {
		unpublishConfirmOpen = false;
		runBulkStatusChange(publishedIdsToUnpublish, 'draft').then(() => {});
	}

	/**
	 * Navigate to page
	 */
	function goToPage(page: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', String(page));
		goto(`/dashboard/admin/questions?${params.toString()}`);
	}
</script>

<div class="container mx-auto space-y-6 py-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Banque de Questions</h1>
		</div>
		<div class="flex gap-2">
			<!-- View Toggle -->
			<Button
				onclick={toggleViewMode}
				variant="outline"
				size="icon"
				title={viewMode === 'table' ? 'Vue en cartes' : 'Vue en tableau'}
			>
				{#if viewMode === 'table'}
					<LayoutGrid class="h-4 w-4" />
				{:else}
					<List class="h-4 w-4" />
				{/if}
			</Button>
			<!-- Create Button -->
			<Button onclick={handleCreate} class="gap-2">
				<Plus class="h-4 w-4" />
				Nouvelle Question
			</Button>
		</div>
	</div>

	<!-- Filters Card -->
	<Card.Root>
		<Card.Header>
			<Collapsible.Root bind:open={filtersOpen}>
				<Collapsible.Trigger
					class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
				>
					<Card.Title>Filtres et Tri</Card.Title>
					<ChevronDown
						class="h-4 w-4 transition-transform duration-200 {filtersOpen ? 'rotate-180' : ''}"
					/>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Card.Content>
						<!-- First row: Type, Grades, Search -->
						<div class="grid gap-4 md:grid-cols-3">
							<!-- Type filter -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Type de question</Label>
								<select
									bind:value={selectedType}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									{#each questionTypes as type (type.value)}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</div>

							<!-- Grade filter -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Niveaux scolaires</Label>
								<GradeBadgeSelector bind:value={selectedGradesList} placeholder="Tous niveaux" />
							</div>

							<!-- Search -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Recherche</Label>
								<div class="relative">
									<Search class="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
									{#if isSearching}
										<Loader2
											class="absolute top-2.5 right-2 h-4 w-4 animate-spin text-muted-foreground"
										/>
									{/if}
									<Input
										value={searchTerm}
										oninput={(e) => handleSearchInput(e.currentTarget.value)}
										placeholder="Rechercher dans les énoncés..."
										class="pr-8 pl-8"
									/>
								</div>
							</div>
						</div>

						<!-- Second row: Category filters -->
						<div class="mt-4 grid gap-4 md:grid-cols-4">
							<!-- Theme filter -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Thème</Label>
								<select
									bind:value={selectedTheme}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									<option value="all">Tous les thèmes</option>
									{#each data.categories.themes as theme (theme)}
										<option value={theme}>{theme}</option>
									{/each}
								</select>
							</div>

							<!-- Domain filter -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Domaine</Label>
								<select
									bind:value={selectedDomain}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									<option value="all">Tous les domaines</option>
									{#each data.categories.domains as domain (domain)}
										<option value={domain}>{domain}</option>
									{/each}
								</select>
							</div>

							<!-- Subdomain filter -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Sous-domaine</Label>
								<select
									bind:value={selectedSubdomain}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									<option value="all">Tous les sous-domaines</option>
									{#each data.categories.subdomains as subdomain (subdomain)}
										<option value={subdomain}>{subdomain}</option>
									{/each}
								</select>
							</div>

							<!-- Level range filter -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Niveau de difficulté</Label>
								<div class="flex gap-2">
									<Input
										type="number"
										min="1"
										bind:value={minLevel}
										placeholder="Min"
										class="w-1/2"
									/>
									<Input
										type="number"
										min="1"
										bind:value={maxLevel}
										placeholder="Max"
										class="w-1/2"
									/>
								</div>
							</div>
						</div>

						<!-- Third row: Sort filter -->
						<div class="mt-4 grid gap-4 md:grid-cols-2">
							<!-- Sort filter -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Trier par</Label>
								<div class="flex gap-2">
									<select
										bind:value={sortField}
										class="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
									>
										{#each sortFields as field (field.value)}
											<option value={field.value}>{field.label}</option>
										{/each}
									</select>
									<Button
										onclick={() => {
											sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
											applyFilters();
										}}
										variant="outline"
										size="icon"
										title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
									>
										{#if sortOrder === 'asc'}
											<ArrowUp class="h-4 w-4" />
										{:else}
											<ArrowDown class="h-4 w-4" />
										{/if}
									</Button>
								</div>
							</div>

							<div></div>
						</div>

						<!-- Actions row -->
						<div class="mt-4 flex gap-2">
							<Button onclick={applyFilters} variant="default">Appliquer les filtres</Button>
							<Button onclick={clearFilters} variant="outline">Réinitialiser</Button>
						</div>
					</Card.Content>
				</Collapsible.Content>
			</Collapsible.Root>
		</Card.Header>
	</Card.Root>

	<!-- Progression / compte rendu de la publication par lot -->
	{#if bulkProgress}
		<p class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
			<Loader2 class="h-4 w-4 animate-spin" />
			Traitement… {bulkProgress.done} / {bulkProgress.total}
		</p>
	{/if}
	{#if bulkSummary}
		<BulkStatusReport
			summary={bulkSummary}
			error={bulkError}
			ondismiss={() => {
				bulkSummary = null;
				bulkError = null;
			}}
		/>
	{/if}

	<!-- Tabs: Drafts / Published -->
	<Tabs.Root value="published" class="space-y-4">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="drafts">Brouillons</Tabs.Trigger>
			<Tabs.Trigger value="published">Publiés</Tabs.Trigger>
		</Tabs.List>

		<!-- Drafts Tab -->
		<Tabs.Content value="drafts" class="space-y-4">
			<!-- Results info -->
			<div class="flex items-center justify-between text-sm text-muted-foreground">
				<span>
					{data.drafts.length} brouillon{data.drafts.length > 1 ? 's' : ''}
					{#if filteredDrafts.length !== data.drafts.length}
						· {filteredDrafts.length} affiché{filteredDrafts.length > 1 ? 's' : ''}
					{/if}
				</span>
			</div>

			<!-- Publication par lot : filtres + sélection -->
			<div class="flex flex-wrap items-end gap-4">
				<div class="w-48 space-y-2">
					<Label class="text-sm font-medium">Niveau scolaire</Label>
					<MySelect type="single" bind:value={draftGradeFilter} items={draftGradeItems} />
				</div>
				<div class="w-56 space-y-2">
					<Label class="text-sm font-medium">Thème</Label>
					<MySelect type="single" bind:value={draftThemeFilter} items={draftThemeItems} />
				</div>
				<MyCheckbox
					checked={allFilteredDraftsSelected}
					disabled={filteredDrafts.length === 0 || isBulkRunning}
					label="Tout cocher (filtrés)"
					onchange={(checked) =>
						handleToggleAll(
							selectedDraftIds,
							filteredDrafts.map((template) => template.id),
							checked
						)}
				/>
				<Button
					class="ml-auto gap-2"
					disabled={draftIdsToPublish.length === 0 || isBulkRunning}
					onclick={handlePublishSelection}
				>
					<Send class="h-4 w-4" />
					Publier la sélection ({draftIdsToPublish.length})
				</Button>
			</div>

			<!-- Templates Display (Table or Card view) -->
			{#if viewMode === 'table'}
				{@const SortTypeIcon = getSortIcon('type')}
				{@const SortCreatedAtIcon = getSortIcon('created_at')}
				<!-- Table View -->
				<Card.Root>
					<Card.Content class="p-0">
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="border-b bg-muted/50">
									<tr>
										<th class="w-10 px-4 py-3"><span class="sr-only">Sélection</span></th>
										<!-- Sortable Type header -->
										<th class="px-4 py-3 text-left text-sm font-medium">
											<button
												onclick={() => handleSort('type')}
												class="flex items-center gap-1 hover:text-foreground"
											>
												Type
												<SortTypeIcon class="h-4 w-4" />
											</button>
										</th>
										<th class="px-4 py-3 text-left text-sm font-medium">Titre</th>
										<th class="px-4 py-3 text-left text-sm font-medium">Niveaux</th>
										<!-- Sortable Created date header -->
										<th class="px-4 py-3 text-left text-sm font-medium">
											<button
												onclick={() => handleSort('created_at')}
												class="flex items-center gap-1 hover:text-foreground"
											>
												Créé le
												<SortCreatedAtIcon class="h-4 w-4" />
											</button>
										</th>
										<th class="px-4 py-3 text-right text-sm font-medium">Actions</th>
									</tr>
								</thead>
								<tbody class="divide-y">
									{#if filteredDrafts.length === 0}
										<tr>
											<td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
												Aucun brouillon
											</td>
										</tr>
									{:else}
										{#each filteredDrafts as template (template.id)}
											<tr class="hover:bg-muted/30">
												<td class="px-4 py-3">
													<MyCheckbox
														checked={selectedDraftIds.has(template.id)}
														disabled={isBulkRunning}
														aria-label={`Sélectionner « ${template.title || 'Sans titre'} »`}
														onchange={(checked) =>
															handleToggleRow(selectedDraftIds, template.id, checked)}
													/>
												</td>
												<!-- Type + Status + Categories -->
												<td class="px-4 py-3">
													<div class="flex flex-col gap-1">
														<Badge class={getTypeBadgeClass(getQuestionType(template))}>
															{getTypeLabel(getQuestionType(template))}
														</Badge>
														<Badge class="bg-warning/10 text-warning">Brouillon</Badge>
														<Badge variant="outline" class="text-xs">{template.theme}</Badge>
														<Badge variant="outline" class="text-xs">{template.domain}</Badge>
													</div>
												</td>

												<!-- Title -->
												<td class="px-4 py-3">
													<div class="max-w-md">
														<p class="truncate text-sm">{template.title || '(Sans titre)'}</p>
													</div>
												</td>

												<!-- Grades -->
												<td class="px-4 py-3">
													<div class="flex flex-wrap gap-1">
														{#each template.grades.slice(0, 3) as grade (grade)}
															<Badge variant="outline" class="text-xs">{grade}</Badge>
														{/each}
														{#if template.grades.length > 3}
															<Badge variant="outline" class="text-xs"
																>+{template.grades.length - 3}</Badge
															>
														{/if}
													</div>
												</td>

												<!-- Created date -->
												<td class="px-4 py-3 text-sm text-muted-foreground">
													{new Date(template.created_at).toLocaleDateString('fr-FR')}
												</td>

												<!-- Actions -->
												<td class="px-4 py-3">
													<div class="flex justify-end gap-2">
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handlePreview(template.id)}
															title="Aperçu"
														>
															<Eye class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handleEdit(template.id)}
															title="Modifier"
														>
															<Pencil class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handleDuplicate(template.id)}
															title="Dupliquer"
														>
															<Copy class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handleDeleteClick(template.id)}
															title="Supprimer"
															class="text-destructive hover:text-destructive"
														>
															<Trash2 class="h-4 w-4" />
														</Button>
													</div>
												</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<!-- Card Grid View (Drafts) -->
				{#if filteredDrafts.length === 0}
					<Card.Root>
						<Card.Content class="py-12 text-center">
							<p class="text-muted-foreground">Aucun brouillon</p>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each filteredDrafts as template (template.id)}
							<QuestionTemplateCard
								{template}
								onPreview={handlePreview}
								onEdit={handleEdit}
								onDuplicate={handleDuplicate}
								onDelete={handleDeleteClick}
							/>
						{/each}
					</div>
				{/if}
			{/if}
		</Tabs.Content>

		<!-- Published Tab -->
		<Tabs.Content value="published" class="space-y-4">
			<!-- Results info -->
			<div class="flex items-center justify-between text-sm text-muted-foreground">
				<span>
					{data.total} template{data.total > 1 ? 's' : ''} trouvé{data.total > 1 ? 's' : ''}
				</span>
				<span>
					Page {currentPage} sur {totalPages}
				</span>
			</div>

			<!-- Retour en brouillon par lot (page courante) -->
			<div class="flex flex-wrap items-center gap-4">
				<MyCheckbox
					checked={allPublishedSelected}
					disabled={data.templates.length === 0 || isBulkRunning}
					label="Tout cocher (page)"
					onchange={(checked) =>
						handleToggleAll(
							selectedPublishedIds,
							data.templates.map((template) => template.id),
							checked
						)}
				/>
				<Button
					variant="outline"
					class="ml-auto gap-2"
					disabled={publishedIdsToUnpublish.length === 0 || isBulkRunning}
					onclick={() => (unpublishConfirmOpen = true)}
				>
					<Undo2 class="h-4 w-4" />
					Repasser en brouillon ({publishedIdsToUnpublish.length})
				</Button>
			</div>

			<!-- Templates Display (Table or Card view) -->
			{#if viewMode === 'table'}
				{@const SortTypeIcon = getSortIcon('type')}
				{@const SortCreatedAtIcon = getSortIcon('created_at')}
				<!-- Table View -->
				<Card.Root>
					<Card.Content class="p-0">
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="border-b bg-muted/50">
									<tr>
										<th class="w-10 px-4 py-3"><span class="sr-only">Sélection</span></th>
										<!-- Sortable Type header -->
										<th class="px-4 py-3 text-left text-sm font-medium">
											<button
												onclick={() => handleSort('type')}
												class="flex items-center gap-1 hover:text-foreground"
											>
												Type
												<SortTypeIcon class="h-4 w-4" />
											</button>
										</th>
										<th class="px-4 py-3 text-left text-sm font-medium">Titre</th>
										<th class="px-4 py-3 text-left text-sm font-medium">Niveaux</th>
										<!-- Sortable Created date header -->
										<th class="px-4 py-3 text-left text-sm font-medium">
											<button
												onclick={() => handleSort('created_at')}
												class="flex items-center gap-1 hover:text-foreground"
											>
												Créé le
												<SortCreatedAtIcon class="h-4 w-4" />
											</button>
										</th>
										<th class="px-4 py-3 text-right text-sm font-medium">Actions</th>
									</tr>
								</thead>
								<tbody class="divide-y">
									{#if data.templates.length === 0}
										<tr>
											<td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
												Aucun template trouvé
											</td>
										</tr>
									{:else}
										{#each data.templates as template (template.id)}
											<tr class="hover:bg-muted/30">
												<td class="px-4 py-3">
													<MyCheckbox
														checked={selectedPublishedIds.has(template.id)}
														disabled={isBulkRunning}
														aria-label={`Sélectionner « ${template.title || 'Sans titre'} »`}
														onchange={(checked) =>
															handleToggleRow(selectedPublishedIds, template.id, checked)}
													/>
												</td>
												<!-- Type + Categories -->
												<td class="px-4 py-3">
													<div class="flex flex-col gap-1">
														<Badge class={getTypeBadgeClass(getQuestionType(template))}>
															{getTypeLabel(getQuestionType(template))}
														</Badge>
														<Badge variant="outline" class="text-xs">{template.theme}</Badge>
														<Badge variant="outline" class="text-xs">{template.domain}</Badge>
													</div>
												</td>

												<!-- Title -->
												<td class="px-4 py-3">
													<div class="max-w-md">
														<p class="truncate text-sm">{template.title || '(Sans titre)'}</p>
													</div>
												</td>

												<!-- Grades -->
												<td class="px-4 py-3">
													<div class="flex flex-wrap gap-1">
														{#each template.grades.slice(0, 3) as grade (grade)}
															<Badge variant="outline" class="text-xs">{grade}</Badge>
														{/each}
														{#if template.grades.length > 3}
															<Badge variant="outline" class="text-xs"
																>+{template.grades.length - 3}</Badge
															>
														{/if}
													</div>
												</td>

												<!-- Created date -->
												<td class="px-4 py-3 text-sm text-muted-foreground">
													{new Date(template.created_at).toLocaleDateString('fr-FR')}
												</td>

												<!-- Actions -->
												<td class="px-4 py-3">
													<div class="flex justify-end gap-2">
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handlePreview(template.id)}
															title="Aperçu"
														>
															<Eye class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handleEdit(template.id)}
															title="Modifier"
														>
															<Pencil class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handleDuplicate(template.id)}
															title="Dupliquer"
														>
															<Copy class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onclick={() => handleDeleteClick(template.id)}
															title="Supprimer"
															class="text-destructive hover:text-destructive"
														>
															<Trash2 class="h-4 w-4" />
														</Button>
													</div>
												</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<!-- Card Grid View (Published) -->
				{#if data.templates.length === 0}
					<Card.Root>
						<Card.Content class="py-12 text-center">
							<p class="text-muted-foreground">Aucun template trouvé</p>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each data.templates as template (template.id)}
							<QuestionTemplateCard
								{template}
								onPreview={handlePreview}
								onEdit={handleEdit}
								onDuplicate={handleDuplicate}
								onDelete={handleDeleteClick}
							/>
						{/each}
					</div>
				{/if}
			{/if}

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage === 1}
						onclick={() => goToPage(currentPage - 1)}
					>
						<ChevronLeft class="h-4 w-4" />
						Précédent
					</Button>

					<span class="text-sm text-muted-foreground">
						Page {currentPage} / {totalPages}
					</span>

					<Button
						variant="outline"
						size="sm"
						disabled={currentPage === totalPages}
						onclick={() => goToPage(currentPage + 1)}
					>
						Suivant
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteConfirmOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirmer la suppression</Dialog.Title>
			<Dialog.Description>
				Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={() => (deleteConfirmOpen = false)} disabled={isDeleting}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={confirmDelete} disabled={isDeleting}>
				{isDeleting ? 'Suppression...' : 'Supprimer'}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Confirmation du retour en brouillon par lot -->
<Dialog.Root bind:open={unpublishConfirmOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Repasser en brouillon</Dialog.Title>
			<Dialog.Description>
				{unpublishConfirmText}
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={() => (unpublishConfirmOpen = false)}>Annuler</Button>
			<Button variant="destructive" onclick={handleConfirmUnpublish}>Repasser en brouillon</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
