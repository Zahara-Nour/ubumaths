<script lang="ts">
	/**
	 * Admin Question Templates - List Page
	 * =====================================
	 *
	 * Features:
	 * - List all question templates with pagination
	 * - Filter by type and grade level
	 * - Search by text (client-side)
	 * - Actions: View, Edit, Duplicate, Delete
	 * - Preview modal for generated instances
	 */

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		Plus,
		Eye,
		Pencil,
		Copy,
		Trash2,
		ChevronLeft,
		ChevronRight,
		Search
	} from 'lucide-svelte';
	import type { QuestionTemplate, QuestionType, GradeLevel } from '$lib/questions/types';

	let { data }: { data: PageData } = $props();

	// Local state
	let searchTerm = $state('');
	let selectedType = $state<string>(data.filters.type || 'all');
	let selectedGrades = $state<string>(data.filters.grades || '');
	let deleteConfirmOpen = $state(false);
	let templateToDelete = $state<string | null>(null);
	let isDeleting = $state(false);

	// Question types for filter
	const questionTypes: { value: string; label: string }[] = [
		{ value: 'all', label: 'Tous les types' },
		{ value: 'numerical_exact', label: 'Numérique (exact)' },
		{ value: 'numerical_decimal', label: 'Numérique (décimal)' },
		{ value: 'numerical_rounded', label: 'Numérique (arrondi)' },
		{ value: 'algebraic_transform', label: 'Transformation algébrique' },
		{ value: 'fill_in_blanks', label: 'À trous' },
		{ value: 'multiple_choice', label: 'QCM' }
	];

	// Grade levels for filter
	const gradeLevels: { value: string; label: string }[] = [
		{ value: 'CP', label: 'CP' },
		{ value: 'CE1', label: 'CE1' },
		{ value: 'CE2', label: 'CE2' },
		{ value: 'CM1', label: 'CM1' },
		{ value: 'CM2', label: 'CM2' },
		{ value: '6', label: '6ème' },
		{ value: '5', label: '5ème' },
		{ value: '4', label: '4ème' },
		{ value: '3', label: '3ème' },
		{ value: '2', label: '2nde' },
		{ value: 'SPE_1', label: '1ère Spé' },
		{ value: 'SPE_T', label: 'Tale Spé' }
	];

	// Filtered templates (client-side search)
	let filteredTemplates = $derived(
		data.templates.filter((template) => {
			if (!searchTerm) return true;
			const search = searchTerm.toLowerCase();

			// Search in statement content
			const statementText = template.statement
				.filter((s: any) => s.type === 'text')
				.map((s: any) => s.content)
				.join(' ')
				.toLowerCase();

			return statementText.includes(search);
		})
	);

	// Pagination info
	let totalPages = $derived(Math.ceil(data.total / data.limit));
	let currentPage = $derived(data.page);

	/**
	 * Get display label for question type
	 */
	function getTypeLabel(type: string): string {
		const found = questionTypes.find((t) => t.value === type);
		return found?.label || type;
	}

	/**
	 * Get badge color for question type
	 */
	function getTypeBadgeClass(type: string): string {
		switch (type) {
			case 'numerical_exact':
			case 'numerical_decimal':
			case 'numerical_rounded':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'algebraic_transform':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			case 'fill_in_blanks':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'multiple_choice':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	/**
	 * Get first text content from statement (for preview)
	 */
	function getStatementPreview(statement: any[]): string {
		const textField = statement.find((s) => s.type === 'text');
		if (!textField) return '(No text content)';

		const content = textField.content;
		// Remove LaTeX delimiters for preview
		const cleaned = content.replace(/\$\$/g, '');
		return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
	}

	/**
	 * Apply filters (navigates with query params)
	 */
	function applyFilters() {
		const params = new URLSearchParams();

		if (selectedType && selectedType !== 'all') {
			params.set('type', selectedType);
		}

		if (selectedGrades) {
			params.set('grades', selectedGrades);
		}

		goto(`/dashboard/admin/questions?${params.toString()}`);
	}

	/**
	 * Clear all filters
	 */
	function clearFilters() {
		selectedType = 'all';
		selectedGrades = '';
		searchTerm = '';
		goto('/dashboard/admin/questions');
	}

	/**
	 * Navigate to create page
	 */
	function handleCreate() {
		goto('/dashboard/admin/questions/create');
	}

	/**
	 * Navigate to edit page
	 */
	function handleEdit(id: string) {
		goto(`/dashboard/admin/questions/${id}/edit`);
	}

	/**
	 * Navigate to preview page
	 */
	function handlePreview(id: string) {
		goto(`/dashboard/admin/questions/${id}/preview`);
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
				toaster.success('Template dupliqué avec succès');
				// Refresh page
				goto('/dashboard/admin/questions', { invalidateAll: true });
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
				toaster.success('Template supprimé avec succès');
				deleteConfirmOpen = false;
				templateToDelete = null;
				// Refresh page
				goto('/dashboard/admin/questions', { invalidateAll: true });
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
			<p class="text-muted-foreground">Gérer les templates de questions mathématiques</p>
		</div>
		<Button onclick={handleCreate} class="gap-2">
			<Plus class="h-4 w-4" />
			Nouvelle Question
		</Button>
	</div>

	<!-- Filters Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 md:grid-cols-3">
				<!-- Type filter -->
				<div class="space-y-2">
					<label class="text-sm font-medium">Type de question</label>
					<Select.Root
						selected={{ value: selectedType, label: getTypeLabel(selectedType) }}
						onSelectedChange={(v) => {
							if (v) selectedType = v.value;
						}}
					>
						<Select.Trigger>
							<Select.Value placeholder="Tous les types" />
						</Select.Trigger>
						<Select.Content>
							{#each questionTypes as type}
								<Select.Item value={type.value}>{type.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Search -->
				<div class="space-y-2">
					<label class="text-sm font-medium">Recherche</label>
					<div class="relative">
						<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							bind:value={searchTerm}
							placeholder="Rechercher dans les énoncés..."
							class="pl-8"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-end gap-2">
					<Button onclick={applyFilters} variant="default">Appliquer</Button>
					<Button onclick={clearFilters} variant="outline">Réinitialiser</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Results info -->
	<div class="flex items-center justify-between text-sm text-muted-foreground">
		<span>
			{filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''} trouvé{filteredTemplates.length >
			1
				? 's'
				: ''}
		</span>
		<span>
			Page {currentPage} sur {totalPages}
		</span>
	</div>

	<!-- Templates Table -->
	<Card.Root>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b bg-muted/50">
						<tr>
							<th class="px-4 py-3 text-left text-sm font-medium">Type</th>
							<th class="px-4 py-3 text-left text-sm font-medium">Énoncé</th>
							<th class="px-4 py-3 text-left text-sm font-medium">Niveaux</th>
							<th class="px-4 py-3 text-left text-sm font-medium">Créé le</th>
							<th class="px-4 py-3 text-right text-sm font-medium">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if filteredTemplates.length === 0}
							<tr>
								<td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
									Aucun template trouvé
								</td>
							</tr>
						{:else}
							{#each filteredTemplates as template (template.id)}
								<tr class="hover:bg-muted/30">
									<!-- Type -->
									<td class="px-4 py-3">
										<Badge class={getTypeBadgeClass(template.type)}>
											{getTypeLabel(template.type)}
										</Badge>
									</td>

									<!-- Statement preview -->
									<td class="px-4 py-3">
										<div class="max-w-md">
											<p class="truncate text-sm">{getStatementPreview(template.statement)}</p>
										</div>
									</td>

									<!-- Grades -->
									<td class="px-4 py-3">
										<div class="flex flex-wrap gap-1">
											{#each template.grades.slice(0, 3) as grade}
												<Badge variant="outline" class="text-xs">{grade}</Badge>
											{/each}
											{#if template.grades.length > 3}
												<Badge variant="outline" class="text-xs">+{template.grades.length - 3}</Badge>
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
