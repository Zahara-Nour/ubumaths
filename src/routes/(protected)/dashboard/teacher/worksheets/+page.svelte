<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		MoreHorizontal,
		Plus,
		Copy,
		Pencil,
		Trash2,
		Eye,
		FileText,
		ClipboardCheck,
		BookOpen,
		HelpCircle,
		Home
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type { WorksheetRow, WorksheetType, WorksheetStatus } from '$lib/types/worksheets';
	import { formatGradeShort } from '$lib/utils/grades';
	import type { GradeCode } from '$lib/types/grades';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Filter state
	let searchQuery = $state(data.filters.search || '');
	let selectedStatus = $state<string>(data.filters.status || '');
	let selectedType = $state<string>(data.filters.type || '');

	// Loading states
	let deletingId = $state<string | null>(null);
	let duplicatingId = $state<string | null>(null);

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

	/**
	 * Format grade levels array for display
	 */
	function formatGrades(grades: number[]): string {
		if (!grades || grades.length === 0) return '-';
		// Convert numeric grade levels to grade codes if needed
		// For now, display as is since grade_levels is numeric array
		return grades.map((g) => String(g)).join(', ');
	}

	// Show toast on form result
	$effect(() => {
		if (form?.success) {
			toaster.success(form.message || 'Operation reussie');
		} else if (form?.message) {
			toaster.error(form.message);
		}
	});
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
		<Button href="/dashboard/teacher/worksheets/new">
			<Plus class="mr-2 h-4 w-4" />
			Nouvelle feuille
		</Button>
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
									{worksheet.total_points ?? 0}
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{formatDate(worksheet.created_at)}
								</Table.Cell>
								<Table.Cell>
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											<Button variant="ghost" size="icon" class="h-8 w-8">
												<MoreHorizontal class="h-4 w-4" />
												<span class="sr-only">Actions</span>
											</Button>
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Item>
												<a
													href="/dashboard/teacher/worksheets/{worksheet.id}"
													class="flex items-center gap-2"
												>
													<Eye class="h-4 w-4" />
													Voir
												</a>
											</DropdownMenu.Item>
											<DropdownMenu.Item>
												<a
													href="/dashboard/teacher/worksheets/{worksheet.id}/edit"
													class="flex items-center gap-2"
												>
													<Pencil class="h-4 w-4" />
													Modifier
												</a>
											</DropdownMenu.Item>
											<DropdownMenu.Separator />
											<form
												method="POST"
												action="?/duplicate"
												use:enhance={() => {
													duplicatingId = worksheet.id;
													return async ({ result, update }) => {
														await update();
														if (result.type === 'success') {
															toaster.success('Feuille dupliquee');
															await invalidateAll();
														}
														duplicatingId = null;
													};
												}}
											>
												<input type="hidden" name="worksheet_id" value={worksheet.id} />
												<DropdownMenu.Item>
													<button
														type="submit"
														disabled={duplicatingId === worksheet.id}
														class="flex w-full items-center gap-2"
													>
														<Copy class="h-4 w-4" />
														{duplicatingId === worksheet.id ? 'Duplication...' : 'Dupliquer'}
													</button>
												</DropdownMenu.Item>
											</form>
											{#if worksheet.status === 'draft'}
												<DropdownMenu.Separator />
												<form
													method="POST"
													action="?/delete"
													use:enhance={() => {
														deletingId = worksheet.id;
														return async ({ result, update }) => {
															await update();
															if (result.type === 'success') {
																toaster.success('Feuille supprimee');
																await invalidateAll();
															}
															deletingId = null;
														};
													}}
												>
													<input type="hidden" name="worksheet_id" value={worksheet.id} />
													<DropdownMenu.Item class="text-destructive focus:text-destructive">
														<button
															type="submit"
															disabled={deletingId === worksheet.id}
															class="flex w-full items-center gap-2"
														>
															<Trash2 class="h-4 w-4" />
															{deletingId === worksheet.id ? 'Suppression...' : 'Supprimer'}
														</button>
													</DropdownMenu.Item>
												</form>
											{/if}
										</DropdownMenu.Content>
									</DropdownMenu.Root>
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
