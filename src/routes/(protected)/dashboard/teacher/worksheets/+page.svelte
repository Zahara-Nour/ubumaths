<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		Plus,
		Copy,
		Pencil,
		Trash2,
		FileText,
		ClipboardCheck,
		BookOpen,
		HelpCircle,
		Home,
		Loader2
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { WorksheetType, WorksheetStatus } from '$lib/types/worksheets';
	import { formatGradeShort } from '$lib/utils/grades';
	import type { GradeCode } from '$lib/types/grades';

	let { data }: { data: PageData } = $props();

	// Filter state
	let searchQuery = $state(data.filters.search || '');
	let selectedStatus = $state<string>(data.filters.status || '');
	let selectedType = $state<string>(data.filters.type || '');

	// Loading states
	let deletingId = $state<string | null>(null);
	let duplicatingId = $state<string | null>(null);

	// Delete confirmation dialog state
	let deleteDialogOpen = $state(false);
	let worksheetToDelete = $state<{ id: string; title: string } | null>(null);

	/**
	 * Open delete confirmation dialog
	 */
	function openDeleteDialog(worksheet: { id: string; title: string }) {
		worksheetToDelete = worksheet;
		deleteDialogOpen = true;
	}

	/**
	 * Handle delete confirmation
	 */
	async function handleDelete() {
		if (!worksheetToDelete) return;

		deletingId = worksheetToDelete.id;
		deleteDialogOpen = false;

		try {
			const response = await fetch(`/api/worksheets/${worksheetToDelete.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				throw new Error(error.message || 'Erreur lors de la suppression');
			}

			toaster.success('Feuille supprimee');
			await invalidateAll();
		} catch (error) {
			console.error('Delete error:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
		} finally {
			deletingId = null;
			worksheetToDelete = null;
		}
	}

	/**
	 * Handle duplicate
	 */
	async function handleDuplicate(worksheetId: string) {
		duplicatingId = worksheetId;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/duplicate`, {
				method: 'POST'
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				throw new Error(error.message || 'Erreur lors de la duplication');
			}

			toaster.success('Feuille dupliquee');
			await invalidateAll();
		} catch (error) {
			console.error('Duplicate error:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la duplication');
		} finally {
			duplicatingId = null;
		}
	}

	// Status filter options
	const statusOptions = [
		{ value: '', label: 'Tous les statuts' },
		{ value: 'draft', label: 'Brouillon' },
		{ value: 'published', label: 'Publie' },
		{ value: 'archived', label: 'Archive' }
	];

	// Type filter options
	const typeOptions = [
		{ value: '', label: 'Tous les types' },
		{ value: 'worksheet', label: "Feuille d'exercices" },
		{ value: 'assessment', label: 'Evaluation' },
		{ value: 'exam', label: 'Examen' },
		{ value: 'quiz', label: 'Quiz' },
		{ value: 'homework', label: 'Devoirs' }
	];

	// Type label map
	const typeLabels: Record<WorksheetType, string> = {
		worksheet: 'Feuille',
		assessment: 'Evaluation',
		exam: 'Examen',
		quiz: 'Quiz',
		homework: 'Devoirs'
	};

	// Type icon map
	const typeIcons: Record<WorksheetType, typeof FileText> = {
		worksheet: FileText,
		assessment: ClipboardCheck,
		exam: BookOpen,
		quiz: HelpCircle,
		homework: Home
	};

	// Status badge variant map
	const statusVariants: Record<WorksheetStatus, 'default' | 'secondary' | 'outline'> = {
		draft: 'secondary',
		published: 'default',
		archived: 'outline'
	};

	// Status labels
	const statusLabels: Record<WorksheetStatus, string> = {
		draft: 'Brouillon',
		published: 'Publie',
		archived: 'Archive'
	};

	/**
	 * Apply filters to URL
	 */
	function applyFilters() {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- used only for URL building, not state
		const params = new URLSearchParams();

		if (searchQuery) params.set('search', searchQuery);
		if (selectedStatus) params.set('status', selectedStatus);
		if (selectedType) params.set('type', selectedType);
		params.set('page', '1');

		goto(`?${params.toString()}`, { keepFocus: true });
	}

	/**
	 * Clear all filters
	 */
	function clearFilters() {
		searchQuery = '';
		selectedStatus = '';
		selectedType = '';
		goto('/dashboard/teacher/worksheets', { keepFocus: true });
	}

	/**
	 * Go to page
	 */
	function goToPage(pageNum: number) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- used only for URL building, not state
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	/**
	 * Format date
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Feuilles d'exercices - UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Feuilles d'exercices</h1>
			<p class="text-muted-foreground">
				Creez et gerez vos feuilles d'exercices, evaluations et examens
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" href="/dashboard/teacher/worksheets/templates">
				<FileText class="mr-2 h-4 w-4" />
				Templates
			</Button>
			<Button href="/dashboard/teacher/worksheets/new">
				<Plus class="mr-2 h-4 w-4" />
				Nouvelle feuille
			</Button>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					applyFilters();
				}}
				class="grid gap-4 md:grid-cols-4"
			>
				<!-- Search -->
				<div class="space-y-2">
					<Label for="search">Recherche</Label>
					<Input
						id="search"
						type="text"
						placeholder="Titre ou description..."
						bind:value={searchQuery}
					/>
				</div>

				<!-- Status -->
				<div class="space-y-2">
					<Label>Statut</Label>
					<MySelect
						items={statusOptions}
						bind:value={selectedStatus}
						placeholder="Tous les statuts"
					/>
				</div>

				<!-- Type -->
				<div class="space-y-2">
					<Label>Type</Label>
					<MySelect items={typeOptions} bind:value={selectedType} placeholder="Tous les types" />
				</div>

				<!-- Actions -->
				<div class="flex items-end gap-2">
					<Button type="submit" class="flex-1">Filtrer</Button>
					<Button type="button" variant="outline" onclick={clearFilters}>Effacer</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Results count -->
	<div class="text-sm text-muted-foreground">
		{data.pagination.total} feuille{data.pagination.total > 1 ? 's' : ''} trouvee{data.pagination
			.total > 1
			? 's'
			: ''}
	</div>

	<!-- Worksheets table -->
	<Card.Root>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Titre</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Statut</Table.Head>
						<Table.Head>Niveaux</Table.Head>
						<Table.Head>Exercices</Table.Head>
						<Table.Head>Cree le</Table.Head>
						<Table.Head class="w-16"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.worksheets.length === 0}
						<Table.Row>
							<Table.Cell colspan={7} class="py-8 text-center text-muted-foreground">
								Aucune feuille trouvee. Creez votre premiere feuille d'exercices !
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.worksheets as worksheet (worksheet.id)}
							{@const TypeIcon = typeIcons[worksheet.type]}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a href="/dashboard/teacher/worksheets/{worksheet.id}" class="hover:underline">
										{worksheet.title || '(Sans titre)'}
									</a>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<TypeIcon class="h-4 w-4 text-muted-foreground" />
										<span>{typeLabels[worksheet.type]}</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={statusVariants[worksheet.status]}>
										{statusLabels[worksheet.status]}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									{#if worksheet.grade_levels && worksheet.grade_levels.length > 0}
										<div class="flex flex-wrap gap-1">
											{#each worksheet.grade_levels.slice(0, 3) as grade, i (i)}
												<Badge variant="outline" class="text-xs">
													{formatGradeShort(grade as unknown as GradeCode)}
												</Badge>
											{/each}
											{#if worksheet.grade_levels.length > 3}
												<Badge variant="outline" class="text-xs">
													+{worksheet.grade_levels.length - 3}
												</Badge>
											{/if}
										</div>
									{:else}
										<span class="text-sm text-muted-foreground">-</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									{worksheet.exercise_count ?? 0}
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{formatDate(worksheet.created_at)}
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8"
											href="/dashboard/teacher/worksheets/{worksheet.id}"
											title="Modifier"
										>
											<Pencil class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8"
											disabled={duplicatingId === worksheet.id}
											onclick={() => handleDuplicate(worksheet.id)}
											title="Dupliquer"
										>
											{#if duplicatingId === worksheet.id}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Copy class="h-4 w-4" />
											{/if}
										</Button>
										{#if worksheet.status === 'draft'}
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-destructive hover:text-destructive"
												disabled={deletingId === worksheet.id}
												onclick={() =>
													openDeleteDialog({ id: worksheet.id, title: worksheet.title })}
												title="Supprimer"
											>
												{#if deletingId === worksheet.id}
													<Loader2 class="h-4 w-4 animate-spin" />
												{:else}
													<Trash2 class="h-4 w-4" />
												{/if}
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="flex items-center justify-center gap-2">
			<Button
				variant="outline"
				disabled={data.pagination.page === 1}
				onclick={() => goToPage(data.pagination.page - 1)}
			>
				Precedent
			</Button>
			<span class="text-sm text-muted-foreground">
				Page {data.pagination.page} sur {data.pagination.totalPages}
			</span>
			<Button
				variant="outline"
				disabled={data.pagination.page === data.pagination.totalPages}
				onclick={() => goToPage(data.pagination.page + 1)}
			>
				Suivant
			</Button>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Supprimer cette feuille ?"
	description={`Vous allez supprimer la feuille "${worksheetToDelete?.title || '(Sans titre)'}". Cette action est irreversible.`}
	confirmLabel="Supprimer"
	variant="destructive"
	onConfirm={handleDelete}
/>
