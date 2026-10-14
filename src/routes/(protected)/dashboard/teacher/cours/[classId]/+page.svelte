<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Teacher Class Chapters Page
	 * ============================
	 *
	 * Manage chapters for a specific class:
	 * - Create new chapters
	 * - Create from template
	 * - Edit/delete existing chapters
	 * - Reorder chapters via drag and drop
	 * - Toggle visibility
	 */

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { CourseShareLinkCard } from '$lib/components/cours/teacher';
	import { CHAPTER_ICONS } from '$lib/types/chapters';
	import {
		Plus,
		Eye,
		EyeOff,
		Trash2,
		Pencil,
		GripVertical,
		FolderOpen,
		Book,
		FileText,
		ClipboardList,
		Dumbbell,
		FileStack,
		Copy
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { TemplateSummary } from '$lib/types/chapter-templates';
	import { templateSelectItems } from '$lib/utils/template-select-items';
	import { formatGradeShort } from '$lib/utils/grades';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Dialog states
	let showCreateDialog = $state(false);
	let showTemplateDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let selectedChapter = $state<(typeof data.chapters)[0] | null>(null);

	// Form states
	let createTitle = $state('');
	let createDescription = $state('');
	let createIcon = $state('');
	let createIsVisible = $state(false);

	// Template form states
	let selectedTemplateId = $state('');
	let templateTitle = $state('');
	let templateIsVisible = $state(false);

	// Derived template data
	let selectedTemplate = $derived(
		data.templates.find((t: TemplateSummary) => t.id === selectedTemplateId)
	);

	let editTitle = $state('');
	let editDescription = $state('');
	let editIcon = $state('');
	let editIsVisible = $state(false);

	/** URL complète du lien du cours (ADR 0025), celle qu'on colle dans un carnet ou un mail. */
	let courseShareUrl = $derived(
		data.courseShareToken ? `${page.url.origin}/cours/${data.courseShareToken.token}` : null
	);

	// Loading state
	let isSubmitting = $state(false);
	let isNavigating = $derived(!!navigating.to);

	// Color options for MySelect
	// Icon options for MySelect
	let iconItems = $derived([
		{ value: '', label: 'Aucune icone' },
		...CHAPTER_ICONS.map((i) => ({ value: i, label: i }))
	]);

	// Template items for MySelect
	let templateItems = $derived(templateSelectItems(data.templates));

	// Handle form results
	$effect(() => {
		if (form?.success) {
			if (form.action === 'create') {
				toaster.success('Chapitre cree avec succes');
				showCreateDialog = false;
				resetCreateForm();
			} else if (form.action === 'update') {
				toaster.success('Chapitre mis a jour');
				showEditDialog = false;
			} else if (form.action === 'delete') {
				toaster.success('Chapitre supprime');
				showDeleteDialog = false;
				selectedChapter = null;
			} else if (form.action === 'toggleVisibility') {
				toaster.success('Visibilite mise a jour');
			} else if (form.action === 'shareCourseLink') {
				toaster.success('Lien du cours prêt');
			} else if (form.action === 'revokeCourseLink') {
				toaster.success('Lien du cours révoqué');
			} else if (form.action === 'instantiateFromTemplate') {
				toaster.success('Chapitre créé depuis le modèle');
				showTemplateDialog = false;
				resetTemplateForm();
			}
			invalidateAll();
		} else if (form?.error) {
			toaster.error(form.error);
		}
		isSubmitting = false;
	});

	// Reset create form
	function resetCreateForm() {
		createTitle = '';
		createDescription = '';
		createIcon = '';
		createIsVisible = false;
	}

	// Reset template form
	function resetTemplateForm() {
		selectedTemplateId = '';
		templateTitle = '';
		templateIsVisible = false;
	}

	// Open edit dialog with chapter data
	function openEditDialog(chapter: (typeof data.chapters)[0]) {
		selectedChapter = chapter;
		editTitle = chapter.title;
		editDescription = chapter.description || '';
		editIcon = chapter.icon || '';
		editIsVisible = chapter.isVisible;
		showEditDialog = true;
	}

	// Open delete dialog
	function openDeleteDialog(chapter: (typeof data.chapters)[0]) {
		selectedChapter = chapter;
		showDeleteDialog = true;
	}
</script>

<svelte:head>
	<title>Cours - {data.classData.name} | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<BackLink href="/dashboard/teacher/cours" label="Retour aux cours" />

	<!-- Header -->
	<div class="mb-8 flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<Book class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">{data.classData.name}</h1>
				<p class="text-muted-foreground">
					{data.chapters.length} chapitre{data.chapters.length !== 1 ? 's' : ''}
				</p>
			</div>
		</div>
		<div class="flex gap-2">
			{#if data.templates.length > 0}
				<Button variant="outline" onclick={() => (showTemplateDialog = true)}>
					<Copy class="mr-2 h-4 w-4" />
					Depuis un modèle
				</Button>
			{/if}
			<Button onclick={() => (showCreateDialog = true)}>
				<Plus class="mr-2 h-4 w-4" />
				Nouveau chapitre
			</Button>
		</div>
	</div>

	<!-- Lien du cours : les élèves sans compte n'ont pas d'autre accès (ADR 0025) -->
	<CourseShareLinkCard
		shareUrl={courseShareUrl}
		expiresAt={data.courseShareToken?.expires_at ?? null}
		accessCount={data.courseShareToken?.access_count ?? 0}
	/>

	<!-- Loading state -->
	{#if isNavigating}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
				<p class="text-muted-foreground">Chargement...</p>
			</div>
		</div>
	{:else if data.chapters.length === 0}
		<!-- Empty state -->
		<Card.Root class="border-dashed">
			<Card.Content class="py-16 text-center">
				<FolderOpen class="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
				<h2 class="text-xl font-semibold">Aucun chapitre</h2>
				<p class="mt-2 text-muted-foreground">
					Créez votre premier chapitre pour commencer à organiser le contenu de votre cours.
				</p>
				<Button onclick={() => (showCreateDialog = true)} class="mt-4">
					<Plus class="mr-2 h-4 w-4" />
					Créer un chapitre
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Chapters list -->
		<div class="space-y-4">
			{#each data.chapters as chapter, index (chapter.id)}
				<Card.Root class="group relative transition-shadow hover:shadow-md">
					<Card.Content class="flex items-center gap-4 p-4">
						<!-- Drag handle (for future drag&drop) -->
						<div class="cursor-grab text-muted-foreground/40">
							<GripVertical class="h-5 w-5" />
						</div>

						<!-- Order number -->
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
						>
							{index + 1}
						</div>

						<!-- Chapter info -->
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h3 class="truncate font-medium">{chapter.title}</h3>
								{#if !chapter.isVisible}
									<Badge variant="secondary" class="flex items-center gap-1">
										<EyeOff class="h-3 w-3" />
										Masque
									</Badge>
								{/if}
							</div>
							{#if chapter.description}
								<p class="mt-1 truncate text-sm text-muted-foreground">
									{chapter.description}
								</p>
							{/if}
							<div class="mt-2 flex gap-4 text-xs text-muted-foreground">
								<span>{chapter.documentCount} doc{chapter.documentCount !== 1 ? 's' : ''}</span>
								<span
									>{chapter.checklistItemCount} objectif{chapter.checklistItemCount !== 1
										? 's'
										: ''}</span
								>
								<span
									>{chapter.exerciseCount}
									{lore.learning.exercise}{chapter.exerciseCount !== 1 ? 's' : ''}</span
								>
							</div>
						</div>

						<!-- Actions -->
						<div
							class="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<!-- Toggle visibility -->
							<form method="POST" action="?/toggleVisibility" use:enhance>
								<input type="hidden" name="chapterId" value={chapter.id} />
								<input type="hidden" name="isVisible" value={!chapter.isVisible} />
								<Button
									type="submit"
									variant="ghost"
									size="icon-sm"
									title={chapter.isVisible ? 'Masquer' : 'Afficher'}
								>
									{#if chapter.isVisible}
										<Eye class="h-4 w-4" />
									{:else}
										<EyeOff class="h-4 w-4" />
									{/if}
								</Button>
							</form>

							<!-- Edit -->
							<Button
								variant="ghost"
								size="icon-sm"
								onclick={() => openEditDialog(chapter)}
								title="Modifier"
							>
								<Pencil class="h-4 w-4" />
							</Button>

							<!-- Delete -->
							<Button
								variant="ghost"
								size="icon-sm"
								onclick={() => openDeleteDialog(chapter)}
								title="Supprimer"
								class="text-destructive hover:text-destructive"
							>
								<Trash2 class="h-4 w-4" />
							</Button>

							<!-- Open detail -->
							<Button
								href="/dashboard/teacher/cours/{data.classData.id}/{chapter.id}"
								variant="outline"
								size="sm"
							>
								Gerer le contenu
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</main>

<!-- Create Chapter Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouveau chapitre</Dialog.Title>
			<Dialog.Description>
				Creez un nouveau chapitre pour organiser le contenu de votre cours.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="create-title">Titre *</Label>
				<Input
					id="create-title"
					name="title"
					bind:value={createTitle}
					placeholder="Ex: Chapitre 1 - Les fractions"
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="create-description">Description</Label>
				<Textarea
					id="create-description"
					name="description"
					bind:value={createDescription}
					placeholder="Description du chapitre (optionnel)"
					rows={3}
				/>
			</div>

			<div class="space-y-2">
				<Label>Icone</Label>
				<MySelect type="single" bind:value={createIcon} items={iconItems} />
				<input type="hidden" name="icon" value={createIcon} />
			</div>

			<div class="flex items-center gap-2">
				<MyCheckbox bind:checked={createIsVisible} label="Visible par les élèves" />
				<input type="hidden" name="isVisible" value={createIsVisible} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showCreateDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !createTitle.trim()}>
					{isSubmitting ? 'Création…' : 'Créer'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Chapter Dialog -->
<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Modifier le chapitre</Dialog.Title>
		</Dialog.Header>

		{#if selectedChapter}
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="chapterId" value={selectedChapter.id} />

				<div class="space-y-2">
					<Label for="edit-title">Titre *</Label>
					<Input id="edit-title" name="title" bind:value={editTitle} required />
				</div>

				<div class="space-y-2">
					<Label for="edit-description">Description</Label>
					<Textarea
						id="edit-description"
						name="description"
						bind:value={editDescription}
						rows={3}
					/>
				</div>

				<div class="space-y-2">
					<Label>Icone</Label>
					<MySelect type="single" bind:value={editIcon} items={iconItems} />
					<input type="hidden" name="icon" value={editIcon} />
				</div>

				<div class="flex items-center gap-2">
					<MyCheckbox bind:checked={editIsVisible} label="Visible par les élèves" />
					<input type="hidden" name="isVisible" value={editIsVisible} />
				</div>

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (showEditDialog = false)}>
						Annuler
					</Button>
					<Button type="submit" disabled={isSubmitting || !editTitle.trim()}>
						{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Supprimer le chapitre</Dialog.Title>
			<Dialog.Description>
				Etes-vous sur de vouloir supprimer le chapitre "{selectedChapter?.title}" ? Cette action est
				irreversible. Les documents seront conserves dans les fichiers orphelins.
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedChapter}
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
					};
				}}
			>
				<input type="hidden" name="chapterId" value={selectedChapter.id} />

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (showDeleteDialog = false)}>
						Annuler
					</Button>
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{isSubmitting ? 'Suppression...' : 'Supprimer'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Create from Template Dialog -->
<Dialog.Root bind:open={showTemplateDialog}>
	<Dialog.Content class="max-w-xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Copy class="h-5 w-5 text-primary" />
				Créer depuis un modèle
			</Dialog.Title>
			<Dialog.Description>
				Sélectionnez un modèle : le chapitre créé lui sera lié, et suivra ses corrections. Son
				contenu y arrive préparé — rien n’est publié aux élèves.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/instantiateFromTemplate"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
				};
			}}
			class="space-y-4"
		>
			<!-- Template selection -->
			<div class="space-y-2">
				<Label for="template-select">Modèle *</Label>
				<MySelect
					id="template-select"
					type="single"
					bind:value={selectedTemplateId}
					items={templateItems}
					placeholder="Sélectionnez un modèle"
					triggerAriaLabel="Modèle : {selectedTemplate?.title ?? 'aucune sélection'}"
				/>
				<input type="hidden" name="templateId" value={selectedTemplateId} />
			</div>

			<!-- Template preview -->
			{#if selectedTemplate}
				<Card.Root>
					<Card.Header class="pb-3">
						<Card.Title class="text-base">{selectedTemplate.title}</Card.Title>
						{#if selectedTemplate.description}
							<Card.Description class="text-sm">{selectedTemplate.description}</Card.Description>
						{/if}
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-3 text-sm">
							<div class="flex items-center gap-2">
								<FileText class="h-4 w-4 text-muted-foreground" />
								<span
									>{selectedTemplate.documentCount} document{selectedTemplate.documentCount > 1
										? 's'
										: ''}</span
								>
							</div>
							<div class="flex items-center gap-2">
								<ClipboardList class="h-4 w-4 text-muted-foreground" />
								<span
									>{selectedTemplate.checklistItemCount} objectif{selectedTemplate.checklistItemCount >
									1
										? 's'
										: ''}</span
								>
							</div>
							<div class="flex items-center gap-2">
								<Dumbbell class="h-4 w-4 text-muted-foreground" />
								<span
									>{selectedTemplate.exerciseCount}
									{lore.learning.exercise}{selectedTemplate.exerciseCount > 1 ? 's' : ''}</span
								>
							</div>
							<div class="flex items-center gap-2">
								<FileStack class="h-4 w-4 text-muted-foreground" />
								<span
									>{selectedTemplate.worksheetCount} fiche{selectedTemplate.worksheetCount > 1
										? 's'
										: ''}</span
								>
							</div>
						</div>

						{#if selectedTemplate.grades.length > 0}
							<div class="mt-3 flex flex-wrap gap-1">
								{#each selectedTemplate.grades as grade (grade)}
									<Badge variant="secondary" class="text-xs">{formatGradeShort(grade)}</Badge>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Title override -->
			<div class="space-y-2">
				<Label for="template-title">Titre du chapitre (optionnel)</Label>
				<Input
					id="template-title"
					name="title"
					bind:value={templateTitle}
					placeholder={selectedTemplate?.title || 'Utiliser le titre du modèle'}
				/>
				<p class="text-xs text-muted-foreground">Laissez vide pour reprendre le titre du modèle.</p>
			</div>

			<!-- Visibility -->
			<div class="flex items-center gap-2">
				<MyCheckbox bind:checked={templateIsVisible} label="Visible par les élèves" />
				<input type="hidden" name="isVisible" value={templateIsVisible} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showTemplateDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !selectedTemplateId}>
					<Copy class="mr-2 h-4 w-4" />
					{isSubmitting ? 'Création…' : 'Créer le chapitre'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
