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
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		ArrowLeft,
		MoreHorizontal,
		Plus,
		Copy,
		Trash2,
		Eye,
		FileText,
		Globe,
		Lock,
		Sparkles
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type { DefaultTemplate } from '$lib/worksheets/default-templates';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Filter state
	let searchQuery = $state(data.filters.search || '');
	let includePublic = $state(data.filters.includePublic);

	// Dialog state
	let showDefaultsDialog = $state(false);
	let selectedDefault = $state<DefaultTemplate | null>(null);

	// Loading states
	let deletingId = $state<string | null>(null);
	let duplicatingId = $state<string | null>(null);
	let creatingFromDefault = $state<string | null>(null);

	// Type labels (for default templates)
	const typeLabels: Record<string, string> = {
		worksheet: 'Feuille',
		assessment: 'Evaluation',
		exam: 'Examen',
		quiz: 'Quiz',
		homework: 'Devoirs'
	};

	/**
	 * Apply filters to URL
	 */
	function applyFilters() {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- used only for URL building, not state
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (!includePublic) params.set('include_public', 'false');
		params.set('page', '1');
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	/**
	 * Clear all filters
	 */
	function clearFilters() {
		searchQuery = '';
		includePublic = true;
		goto('/dashboard/teacher/worksheets/templates', { keepFocus: true });
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

	/**
	 * Check if template is owned by current user
	 */
	function isOwnTemplate(createdBy: string | null): boolean {
		return createdBy === data.userId;
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
	<title>Templates - UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/dashboard/teacher/worksheets">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div class="flex-1">
			<h1 class="text-3xl font-bold">Templates de mise en page</h1>
			<p class="text-muted-foreground">
				Gerez vos templates Typst pour personnaliser la mise en page de vos feuilles
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => (showDefaultsDialog = true)}>
				<Sparkles class="mr-2 h-4 w-4" />
				Templates par defaut
			</Button>
			<Button href="/dashboard/teacher/worksheets/templates/new">
				<Plus class="mr-2 h-4 w-4" />
				Nouveau template
			</Button>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					applyFilters();
				}}
				class="flex flex-wrap items-end gap-4"
			>
				<!-- Search -->
				<div class="min-w-[200px] flex-1 space-y-2">
					<Label for="search">Recherche</Label>
					<Input
						id="search"
						type="text"
						placeholder="Nom ou description..."
						bind:value={searchQuery}
					/>
				</div>

				<!-- Include public -->
				<div class="flex items-center gap-2 pb-2">
					<MyCheckbox bind:checked={includePublic} label="Afficher les templates publics" />
				</div>

				<!-- Actions -->
				<div class="flex gap-2">
					<Button type="submit">Filtrer</Button>
					<Button type="button" variant="outline" onclick={clearFilters}>Effacer</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Results count -->
	<div class="text-sm text-muted-foreground">
		{data.pagination.total} template{data.pagination.total > 1 ? 's' : ''} trouve{data.pagination
			.total > 1
			? 's'
			: ''}
	</div>

	<!-- Templates table -->
	<Card.Root>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nom</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head>Visibilite</Table.Head>
						<Table.Head>Cree le</Table.Head>
						<Table.Head class="w-16"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.templates.length === 0}
						<Table.Row>
							<Table.Cell colspan={5} class="py-8 text-center text-muted-foreground">
								Aucun template trouve. Creez votre premier template ou utilisez un template par
								defaut !
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.templates as template (template.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a
										href="/dashboard/teacher/worksheets/templates/{template.id}"
										class="hover:underline"
									>
										{template.name}
									</a>
									{#if !isOwnTemplate(template.created_by)}
										<Badge variant="outline" class="ml-2 text-xs">Partage</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="max-w-[300px] truncate text-sm text-muted-foreground">
									{template.description || '-'}
								</Table.Cell>
								<Table.Cell>
									{#if template.is_public}
										<Badge variant="secondary" class="gap-1">
											<Globe class="h-3 w-3" />
											Public
										</Badge>
									{:else}
										<Badge variant="outline" class="gap-1">
											<Lock class="h-3 w-3" />
											Prive
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{formatDate(template.created_at)}
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
													href="/dashboard/teacher/worksheets/templates/{template.id}"
													class="flex items-center gap-2"
												>
													<Eye class="h-4 w-4" />
													Voir / Modifier
												</a>
											</DropdownMenu.Item>
											<DropdownMenu.Separator />
											<form
												method="POST"
												action="?/duplicate"
												use:enhance={() => {
													duplicatingId = template.id;
													return async ({ result, update }) => {
														await update();
														if (result.type === 'success') {
															toaster.success('Template duplique');
															await invalidateAll();
														}
														duplicatingId = null;
													};
												}}
											>
												<input type="hidden" name="template_id" value={template.id} />
												<DropdownMenu.Item>
													<button
														type="submit"
														disabled={duplicatingId === template.id}
														class="flex w-full items-center gap-2"
													>
														<Copy class="h-4 w-4" />
														{duplicatingId === template.id ? 'Duplication...' : 'Dupliquer'}
													</button>
												</DropdownMenu.Item>
											</form>
											{#if isOwnTemplate(template.created_by)}
												<DropdownMenu.Separator />
												<form
													method="POST"
													action="?/delete"
													use:enhance={() => {
														deletingId = template.id;
														return async ({ result, update }) => {
															await update();
															if (result.type === 'success') {
																toaster.success('Template supprime');
																await invalidateAll();
															}
															deletingId = null;
														};
													}}
												>
													<input type="hidden" name="template_id" value={template.id} />
													<DropdownMenu.Item class="text-destructive focus:text-destructive">
														<button
															type="submit"
															disabled={deletingId === template.id}
															class="flex w-full items-center gap-2"
														>
															<Trash2 class="h-4 w-4" />
															{deletingId === template.id ? 'Suppression...' : 'Supprimer'}
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

<!-- Default templates dialog -->
<Dialog.Root bind:open={showDefaultsDialog}>
	<Dialog.Content class="max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Templates par defaut</Dialog.Title>
			<Dialog.Description>
				Selectionnez un template par defaut pour creer votre propre version personnalisable
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4 sm:grid-cols-2">
			{#each data.defaultTemplates as template (template.id)}
				<Card.Root
					class="cursor-pointer transition-colors hover:bg-muted/50 {selectedDefault?.id ===
					template.id
						? 'ring-2 ring-primary'
						: ''}"
					onclick={() => (selectedDefault = template)}
				>
					<Card.Header class="pb-2">
						<div class="flex items-center justify-between">
							<Card.Title class="text-base">{template.name}</Card.Title>
							<Badge variant="outline">{typeLabels[template.type]}</Badge>
						</div>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">{template.description}</p>
						<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
							<FileText class="h-3 w-3" />
							{template.placeholders.length} placeholders
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDefaultsDialog = false)}>Annuler</Button>
			{#if selectedDefault}
				<form
					method="POST"
					action="?/createFromDefault"
					use:enhance={() => {
						creatingFromDefault = selectedDefault?.id ?? null;
						showDefaultsDialog = false;
						return async ({ result }) => {
							if (result.type === 'redirect') {
								// Let the redirect happen
							} else if (result.type === 'failure') {
								toaster.error('Erreur lors de la creation');
							}
							creatingFromDefault = null;
						};
					}}
				>
					<input type="hidden" name="template_id" value={selectedDefault.id} />
					<Button type="submit" disabled={creatingFromDefault !== null}>
						{creatingFromDefault ? 'Creation...' : `Utiliser "${selectedDefault.name}"`}
					</Button>
				</form>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
