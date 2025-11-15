<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		FileText,
		ExternalLink,
		FolderOpen,
		Youtube,
		Link as LinkIcon,
		FileQuestion,
		ChevronLeft,
		ChevronRight,
		GraduationCap,
		Tag
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Filter state
	let selectedClass = $state(data.filters.classId);
	let selectedCategory = $state(data.filters.categoryId);
	let selectedTopic = $state(data.filters.topicId);
	let currentPage = $state(data.filters.page);

	// Derived values
	let isNavigating = $derived(!!$navigating);
	let hasFilters = $derived(!!selectedClass || !!selectedCategory || !!selectedTopic);

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

	// Topic items for MySelect (only show when class is selected)
	let topicItems = $derived([
		{ value: '', label: 'Tous les sujets' },
		...data.topics.map((t) => ({ value: t.id, label: t.name }))
	]);

	// Group materials by category or topic
	interface GroupedMaterial {
		id: string;
		descriptionOverride: string | null;
		visible: boolean;
		courseName: string;
		teacherName: string;
		createdAt: string;
		material: {
			id: string;
			googleMaterialId: string;
			title: string;
			description: string | null;
			state: string;
			createdTime: string;
			alternateLink: string;
			topic: { id: string; name: string } | null;
			attachments: Array<{
				id: string;
				drive_file_id: string | null;
				title: string;
				alternate_link: string;
				thumbnail_url: string | null;
				youtube_url: string | null;
				link_url: string | null;
				form_url: string | null;
			}>;
		};
		class: { id: string; name: string };
		category: { id: string; name: string; icon: string | null } | null;
		topic: { id: string; name: string } | null;
	}

	let groupedMaterials = $derived.by(() => {
		const groups = new Map<string, { name: string; icon?: string; items: GroupedMaterial[] }>();

		for (const material of data.materials) {
			let groupKey: string;
			let groupName: string;
			let groupIcon: string | undefined;

			// Priority: Category > Topic > Uncategorized
			if (material.category) {
				groupKey = `category-${material.category.id}`;
				groupName = material.category.name;
				groupIcon = material.category.icon || undefined;
			} else if (material.topic) {
				groupKey = `topic-${material.topic.id}`;
				groupName = material.topic.name;
			} else {
				groupKey = 'uncategorized';
				groupName = 'Non classé';
			}

			if (!groups.has(groupKey)) {
				groups.set(groupKey, { name: groupName, icon: groupIcon, items: [] });
			}

			groups.get(groupKey)!.items.push(material);
		}

		// Sort groups alphabetically, but keep "Non classé" at the end
		const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
			if (a[0] === 'uncategorized') return 1;
			if (b[0] === 'uncategorized') return -1;
			return a[1].name.localeCompare(b[1].name);
		});

		return sortedGroups;
	});

	// Functions
	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedClass) params.set('classId', selectedClass);
		if (selectedCategory) params.set('categoryId', selectedCategory);
		if (selectedTopic) params.set('topicId', selectedTopic);
		params.set('page', '1'); // Reset to page 1 when filters change

		goto(`/dashboard/student/materials?${params.toString()}`);
	}

	function clearFilters() {
		selectedClass = '';
		selectedCategory = '';
		selectedTopic = '';

		goto('/dashboard/student/materials');
	}

	function goToPage(page: number) {
		if (page < 1 || page > data.totalPages) return;

		currentPage = page;

		const params = new URLSearchParams();
		if (selectedClass) params.set('classId', selectedClass);
		if (selectedCategory) params.set('categoryId', selectedCategory);
		if (selectedTopic) params.set('topicId', selectedTopic);
		params.set('page', page.toString());

		goto(`/dashboard/student/materials?${params.toString()}`);
	}

	// Get icon for attachment type
	function getAttachmentIcon(
		attachment: GroupedMaterial['material']['attachments'][0]
	): typeof FileText {
		if (attachment.youtube_url) return Youtube;
		if (attachment.link_url) return LinkIcon;
		if (attachment.form_url) return FileQuestion;
		return FileText;
	}

	// Get attachment URL
	function getAttachmentUrl(attachment: GroupedMaterial['material']['attachments'][0]): string {
		return (
			attachment.youtube_url ||
			attachment.link_url ||
			attachment.form_url ||
			attachment.alternate_link
		);
	}

	// Format date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Matériel pédagogique | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Matériel pédagogique</h1>
		<p class="mt-2 text-muted-foreground" aria-live="polite" aria-atomic="true">
			{data.total} document{data.total > 1 ? 's' : ''} partagé{data.total > 1 ? 's' : ''}
		</p>
	</div>

	<!-- Filters -->
	<section aria-labelledby="filters-heading">
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title id="filters-heading" class="text-lg">Filtres</Card.Title>
			</Card.Header>
			<Card.Content>
				<fieldset>
					<legend class="sr-only">Filtrer les documents</legend>
					<div class="grid gap-4 md:grid-cols-3">
						<!-- Class filter -->
						<div class="space-y-2">
							<label class="text-sm font-medium">Classe</label>
							<MySelect
								type="single"
								bind:value={selectedClass}
								items={classItems}
								disabled={isNavigating}
							/>
						</div>

						<!-- Category filter (only if class selected and has categories) -->
						{#if selectedClass && data.categories.length > 0}
							<div class="space-y-2">
								<label class="text-sm font-medium">Catégorie UbuMaths</label>
								<MySelect
									type="single"
									bind:value={selectedCategory}
									items={categoryItems}
									disabled={isNavigating}
								/>
							</div>
						{/if}

						<!-- Topic filter (only if class selected and has topics) -->
						{#if selectedClass && data.topics.length > 0}
							<div class="space-y-2">
								<label class="text-sm font-medium">Sujet Google</label>
								<MySelect
									type="single"
									bind:value={selectedTopic}
									items={topicItems}
									disabled={isNavigating}
								/>
							</div>
						{/if}
					</div>

					<!-- Filter actions -->
					<div class="mt-4 flex gap-2" role="group" aria-label="Actions de filtrage">
						<Button onclick={applyFilters} disabled={isNavigating}>Appliquer</Button>
						{#if hasFilters}
							<Button variant="outline" onclick={clearFilters} disabled={isNavigating}>
								Effacer les filtres
							</Button>
						{/if}
					</div>
				</fieldset>
			</Card.Content>
		</Card.Root>
	</section>

	<!-- Loading state -->
	{#if isNavigating}
		<div class="flex items-center justify-center py-12" aria-live="polite" aria-atomic="true">
			<div class="text-center">
				<div
					class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
					aria-hidden="true"
				></div>
				<p class="text-muted-foreground">Chargement...</p>
			</div>
		</div>
	{:else if data.materials.length === 0}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<FolderOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
				<p class="text-lg font-medium">Aucun document trouvé</p>
				<p class="mt-2 text-sm text-muted-foreground">
					{hasFilters
						? 'Essayez de modifier les filtres pour voir plus de documents'
						: "Vos professeurs n'ont pas encore partagé de documents"}
				</p>
				{#if hasFilters}
					<Button variant="outline" class="mt-4" onclick={clearFilters}>Effacer les filtres</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Materials grouped by category/topic -->
		<section aria-labelledby="materials-heading">
			<h2 id="materials-heading" class="sr-only">Documents disponibles</h2>
			<div class="space-y-8">
				{#each groupedMaterials as [groupKey, group] (groupKey)}
					<div>
						<!-- Group header -->
						<div class="mb-4 flex items-center gap-2">
							{#if group.icon}
								<span class="text-2xl" aria-hidden="true">{group.icon}</span>
							{:else if groupKey.startsWith('topic-')}
								<Tag class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
							{:else}
								<FolderOpen class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
							{/if}
							<h3 class="text-xl font-semibold">{group.name}</h3>
							<Badge variant="outline">{group.items.length}</Badge>
						</div>

						<!-- Group materials -->
						<div class="grid gap-4 md:grid-cols-2">
							{#each group.items as material (material.id)}
								<Card.Root class="transition-shadow hover:shadow-md">
									<Card.Header>
										<div class="flex items-start justify-between gap-4">
											<div class="flex-1">
												<div class="mb-2 flex items-center gap-2">
													<FileText class="h-4 w-4 text-primary" aria-hidden="true" />
													<Card.Title class="text-base">{material.material.title}</Card.Title>
												</div>

												<!-- Class info -->
												<div class="flex items-center gap-2 text-sm text-muted-foreground">
													<GraduationCap class="h-3 w-3" aria-hidden="true" />
													<span>{material.class.name}</span>
												</div>
											</div>
										</div>
									</Card.Header>

									<Card.Content>
										<!-- Teacher's override description (priority) -->
										{#if material.descriptionOverride}
											<div class="mb-3 rounded-md bg-primary/5 p-3">
												<p class="text-sm font-medium text-primary">Note de l'enseignant :</p>
												<p class="mt-1 text-sm">{material.descriptionOverride}</p>
											</div>
										{/if}

										<!-- Material description -->
										{#if material.material.description}
											<p class="mb-3 text-sm whitespace-pre-wrap text-muted-foreground">
												{material.material.description}
											</p>
										{/if}

										<!-- Attachments -->
										{#if material.material.attachments.length > 0}
											<div class="mt-4 space-y-2">
												<p class="text-sm font-semibold">Pièces jointes :</p>
												<div class="space-y-2">
													{#each material.material.attachments as attachment (attachment.id)}
														{@const AttachmentIcon = getAttachmentIcon(attachment)}
														<a
															href={getAttachmentUrl(attachment)}
															target="_blank"
															rel="noopener noreferrer"
															class="flex items-center gap-2 rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/50"
															aria-label="{attachment.title} (s'ouvre dans un nouvel onglet)"
														>
															<AttachmentIcon class="h-4 w-4 text-primary" aria-hidden="true" />
															<div class="min-w-0 flex-1">
																<p class="truncate text-sm font-medium">{attachment.title}</p>
															</div>
															<ExternalLink
																class="h-3 w-3 text-muted-foreground"
																aria-hidden="true"
															/>
															<span class="sr-only">(s'ouvre dans un nouvel onglet)</span>
														</a>
													{/each}
												</div>
											</div>
										{/if}

										<Separator class="my-4" />

										<!-- Footer metadata -->
										<div class="flex items-center justify-between text-xs text-muted-foreground">
											<div>
												<span>Partagé par {material.teacherName}</span>
											</div>
											<div>
												<span>{formatDate(material.createdAt)}</span>
											</div>
										</div>
									</Card.Content>

									<Card.Footer>
										<Button
											variant="outline"
											class="w-full"
											onclick={() => window.open(material.material.alternateLink, '_blank')}
											aria-label="Ouvrir dans Google Classroom (s'ouvre dans un nouvel onglet)"
										>
											<ExternalLink class="mr-2 h-4 w-4" aria-hidden="true" />
											Ouvrir dans Google Classroom
										</Button>
									</Card.Footer>
								</Card.Root>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Pagination -->
		{#if data.totalPages > 1}
			<div class="mt-8 flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1 || isNavigating}
					aria-label="Page précédente"
				>
					<ChevronLeft class="h-4 w-4" />
				</Button>

				<div class="flex items-center gap-2">
					{#each Array.from({ length: data.totalPages }, (_, i) => i + 1) as pageNum (pageNum)}
						{#if pageNum === 1 || pageNum === data.totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)}
							<Button
								variant={pageNum === currentPage ? 'default' : 'outline'}
								size="sm"
								onclick={() => goToPage(pageNum)}
								disabled={isNavigating}
								aria-label="Page {pageNum}"
								aria-current={pageNum === currentPage ? 'page' : undefined}
							>
								{pageNum}
							</Button>
						{:else if pageNum === currentPage - 2 || pageNum === currentPage + 2}
							<span class="px-2 text-muted-foreground" aria-hidden="true">...</span>
						{/if}
					{/each}
				</div>

				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage === data.totalPages || isNavigating}
					aria-label="Page suivante"
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>

			<p class="mt-4 text-center text-sm text-muted-foreground">
				Page {currentPage} sur {data.totalPages}
			</p>
		{/if}
	{/if}
</main>
