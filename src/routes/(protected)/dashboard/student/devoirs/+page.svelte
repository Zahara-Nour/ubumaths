<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		Calendar,
		Clock,
		Trophy,
		FileText,
		ExternalLink,
		BookOpen,
		User,
		GraduationCap,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Filter state
	let selectedClass = $state(data.filters.classId);
	let selectedCategory = $state(data.filters.categoryId);
	let currentPage = $state(data.filters.page);
	let isLoading = $state(false);

	// Derived values
	let hasFilters = $derived(!!selectedClass || !!selectedCategory);

	// Class items for MySelect
	let classItems = $derived([
		{ value: '', label: 'Toutes les classes' },
		...data.classes.map((c) => ({ value: c.id, label: c.name }))
	]);

	// Category items for MySelect (only show when class is selected)
	let categoryItems = $derived([
		{ value: '', label: 'Toutes les catégories' },
		...data.categories.map((c) => ({
			value: c.id,
			label: c.icon ? `${c.icon} ${c.name}` : c.name
		}))
	]);

	// Functions
	function applyFilters() {
		isLoading = true;

		const params = new URLSearchParams();
		if (selectedClass) params.set('classId', selectedClass);
		if (selectedCategory) params.set('categoryId', selectedCategory);
		params.set('page', '1'); // Reset to page 1 when filters change

		goto(`/dashboard/student/devoirs?${params.toString()}`).finally(() => {
			isLoading = false;
		});
	}

	function clearFilters() {
		selectedClass = '';
		selectedCategory = '';
		isLoading = true;

		goto('/dashboard/student/devoirs').finally(() => {
			isLoading = false;
		});
	}

	function goToPage(page: number) {
		if (page < 1 || page > data.pagination.totalPages) return;

		isLoading = true;
		currentPage = page;

		const params = new URLSearchParams();
		if (selectedClass) params.set('classId', selectedClass);
		if (selectedCategory) params.set('categoryId', selectedCategory);
		params.set('page', page.toString());

		goto(`/dashboard/student/devoirs?${params.toString()}`).finally(() => {
			isLoading = false;
		});
	}

	function formatDueDateTime(date: string | null, time: string | null): string {
		if (!date) return '';

		const dateObj = new Date(date);
		const dateStr = dateObj.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});

		if (time) {
			// Parse time (format: "HH:MM:SS" or "HH:MM")
			const timeParts = time.split(':');
			const hours = timeParts[0];
			const minutes = timeParts[1];
			return `${dateStr} à ${hours}:${minutes}`;
		}

		return dateStr;
	}

	function getWorkTypeBadgeVariant(
		workType: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (workType) {
			case 'ASSIGNMENT':
				return 'default';
			case 'SHORT_ANSWER_QUESTION':
				return 'secondary';
			case 'MULTIPLE_CHOICE_QUESTION':
				return 'outline';
			default:
				return 'default';
		}
	}

	function getWorkTypeLabel(workType: string): string {
		switch (workType) {
			case 'ASSIGNMENT':
				return 'Devoir';
			case 'SHORT_ANSWER_QUESTION':
				return 'Question courte';
			case 'MULTIPLE_CHOICE_QUESTION':
				return 'QCM';
			default:
				return workType;
		}
	}

	function formatSharedDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return "Partagé aujourd'hui";
		} else if (diffDays === 1) {
			return 'Partagé hier';
		} else if (diffDays < 7) {
			return `Partagé il y a ${diffDays} jours`;
		} else {
			return `Partagé le ${date.toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})}`;
		}
	}

	// Watch for class change to reset category
	$effect(() => {
		// When class changes, reset category if it's not in the new class's categories
		if (selectedClass !== data.filters.classId) {
			selectedCategory = '';
		}
	});
</script>

<svelte:head>
	<title>Devoirs Google Classroom | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Devoirs Google Classroom</h1>
		<p class="mt-2 text-muted-foreground">
			{data.pagination.total} devoir{data.pagination.total > 1 ? 's' : ''} partagé{data.pagination
				.total > 1
				? 's'
				: ''}
		</p>
	</div>

	<!-- Filters Section -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-4 md:flex-row md:items-end">
				<!-- Class Filter -->
				<div class="flex-1">
					<label for="class-select" class="mb-2 block text-sm font-medium">Classe</label>
					<MySelect
						bind:value={selectedClass}
						items={classItems}
						placeholder="Sélectionner une classe"
						triggerClass="w-full h-10 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>

				<!-- Category Filter (only show when class is selected) -->
				{#if selectedClass && data.categories.length > 0}
					<div class="flex-1">
						<label for="category-select" class="mb-2 block text-sm font-medium">Catégorie</label>
						<MySelect
							bind:value={selectedCategory}
							items={categoryItems}
							placeholder="Sélectionner une catégorie"
							triggerClass="w-full h-10 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						/>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="flex gap-2">
					<Button onclick={applyFilters} disabled={isLoading}>
						{isLoading ? 'Chargement...' : 'Appliquer'}
					</Button>
					{#if hasFilters}
						<Button variant="outline" onclick={clearFilters} disabled={isLoading}>
							Effacer les filtres
						</Button>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Coursework Grid -->
	{#if isLoading}
		<!-- Loading Skeletons -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i (i)}
				<Card.Root>
					<Card.Header>
						<div class="h-6 w-3/4 animate-pulse rounded bg-muted"></div>
						<div class="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted"></div>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="h-4 w-full animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-full animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-2/3 animate-pulse rounded bg-muted"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else if data.coursework.length === 0}
		<!-- Empty State -->
		<Card.Root class="border-dashed">
			<Card.Content class="py-12 text-center">
				<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<p class="text-lg font-medium">
					{hasFilters ? 'Aucun devoir trouvé avec ces filtres' : 'Aucun devoir partagé'}
				</p>
				<p class="mt-2 text-sm text-muted-foreground">
					{hasFilters
						? 'Essayez de modifier les filtres pour voir plus de devoirs'
						: "Vos professeurs n'ont pas encore partagé de devoirs"}
				</p>
				{#if hasFilters}
					<Button variant="outline" class="mt-4" onclick={clearFilters}>Effacer les filtres</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Coursework Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.coursework as work (work.id)}
				<Card.Root class="flex flex-col">
					<Card.Header>
						<Card.Title class="line-clamp-2 text-xl">
							{work.title}
						</Card.Title>
						<Card.Description class="flex items-center gap-2">
							<User class="h-4 w-4" />
							<span>{work.teacherName}</span>
							<span class="text-muted-foreground">•</span>
							<GraduationCap class="h-4 w-4" />
							<span>{work.className}</span>
						</Card.Description>
					</Card.Header>

					<Card.Content class="flex-1 space-y-3">
						<!-- Course Name Badge -->
						<div class="flex flex-wrap gap-2">
							<Badge variant="secondary">
								<BookOpen class="mr-1 h-3 w-3" />
								{work.courseName}
							</Badge>

							<!-- Category Badge -->
							{#if work.categoryName}
								<Badge variant="outline">
									{#if work.categoryIcon}
										<span class="mr-1">{work.categoryIcon}</span>
									{/if}
									{work.categoryName}
								</Badge>
							{/if}

							<!-- Work Type Badge -->
							<Badge variant={getWorkTypeBadgeVariant(work.workType)}>
								{getWorkTypeLabel(work.workType)}
							</Badge>
						</div>

						<!-- Description -->
						{#if work.description}
							<div class="text-sm text-muted-foreground">
								<p class="line-clamp-3">{work.description}</p>
							</div>
						{/if}

						<!-- Metadata -->
						<div class="space-y-2 text-sm">
							<!-- Due Date -->
							{#if work.dueDate}
								<div class="flex items-center gap-2 text-orange-600 dark:text-orange-400">
									<Calendar class="h-4 w-4 flex-shrink-0" />
									<span class="font-medium">
										{formatDueDateTime(work.dueDate, work.dueTime)}
									</span>
								</div>
							{/if}

							<!-- Max Points -->
							{#if work.maxPoints}
								<div class="flex items-center gap-2">
									<Trophy class="h-4 w-4 flex-shrink-0" />
									<span>{work.maxPoints} point{work.maxPoints > 1 ? 's' : ''}</span>
								</div>
							{/if}

							<!-- Materials Count -->
							{#if work.materialsCount > 0}
								<div class="flex items-center gap-2">
									<FileText class="h-4 w-4 flex-shrink-0" />
									<span>
										{work.materialsCount} document{work.materialsCount > 1 ? 's' : ''}
									</span>
								</div>
							{/if}
						</div>

						<!-- Shared Date -->
						<div class="pt-2 text-xs text-muted-foreground">
							<Clock class="mb-1 inline h-3 w-3" />
							{formatSharedDate(work.sharedAt)}
						</div>
					</Card.Content>

					<Card.Footer class="pt-4">
						<Button
							variant="outline"
							class="w-full"
							onclick={() => window.open(work.alternateLink, '_blank')}
						>
							<ExternalLink class="mr-2 h-4 w-4" />
							Ouvrir dans Google Classroom
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div class="mt-6 flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === 1 || isLoading}
					onclick={() => goToPage(currentPage - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
					Précédent
				</Button>

				<div class="flex items-center gap-2 text-sm">
					<span class="text-muted-foreground">
						Page {currentPage} sur {data.pagination.totalPages}
					</span>
				</div>

				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === data.pagination.totalPages || isLoading}
					onclick={() => goToPage(currentPage + 1)}
				>
					Suivant
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	{/if}
</div>
