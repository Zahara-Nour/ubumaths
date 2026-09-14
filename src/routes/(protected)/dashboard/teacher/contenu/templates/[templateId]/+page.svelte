<!--
	Template Detail Page
	====================

	View and manage a specific chapter template.
	Shows: metadata, content snapshot, versions, instantiation options.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		ArrowLeft,
		FileText,
		CheckSquare,
		BookOpen,
		ClipboardList,
		Upload,
		Archive,
		RefreshCw,
		Trash2,
		PlayCircle,
		Clock
	} from '@lucide/svelte';
	import { getContentCounts } from '$lib/types/chapter-templates';
	import { formatGradeShort } from '$lib/utils/grades';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isPublishing = $state(false);
	let isArchiving = $state(false);
	let isDeleting = $state(false);
	let showDeleteDialog = $state(false);
	let isUpdatingFromChapter = $state(false);
	let showUpdateDialog = $state(false);
	let selectedChapterId = $state('');
	let changeSummary = $state('');

	/** Chapitres qui suivent ce modèle, nommés avec leur classe. */
	const chapterItems = $derived([
		{ value: '', label: 'Choisir un chapitre...' },
		...data.linkedChapters.map((chapter) => ({
			value: chapter.id,
			label: chapter.className ? `${chapter.title} — ${chapter.className}` : chapter.title
		}))
	]);
	let isInstantiating = $state(false);
	let showInstantiateDialog = $state(false);
	let selectedClassId = $state<string>('');
	let chapterTitle = $state('');

	const contentCounts = $derived(getContentCounts(data.template.contentSnapshot));

	function getStatusBadgeColor(status: string) {
		switch (status) {
			case 'draft':
				return 'bg-gray-500';
			case 'published':
				return 'bg-green-500';
			case 'archived':
				return 'bg-amber-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'draft':
				return 'Brouillon';
			case 'published':
				return 'Publié';
			case 'archived':
				return 'Archivé';
			default:
				return status;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Show success/error toasts
	$effect(() => {
		if (form?.success) {
			if (form.action === 'publish') {
				toaster.success('Template publié avec succès');
			} else if (form.action === 'archive') {
				toaster.success('Template archivé');
			} else if (form.action === 'update') {
				toaster.success('Template mis à jour');
			} else if (form.action === 'updateFromChapter') {
				toaster.success(
					data.template.status === 'draft'
						? 'Contenu du modèle repris depuis le chapitre'
						: 'Nouvelle version créée depuis le chapitre'
				);
				showUpdateDialog = false;
				selectedChapterId = '';
				changeSummary = '';
			} else if (form.action === 'instantiate') {
				toaster.success('Chapitre créé avec succès');
				showInstantiateDialog = false;
				if (form.chapterId && selectedClassId) {
					goto(`/dashboard/teacher/cours/${selectedClassId}/${form.chapterId}`);
				}
			}
		}
		if (form?.error) {
			toaster.error(form.error);
		}
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<Button variant="ghost" href="/dashboard/teacher/contenu/templates" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux templates
		</Button>
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1">
				<div class="mb-2 flex items-center gap-2">
					<h1 class="text-3xl font-bold tracking-tight">{data.template.title}</h1>
					<Badge class={getStatusBadgeColor(data.template.status)}>
						{getStatusLabel(data.template.status)}
					</Badge>
				</div>
				{#if data.template.description}
					<p class="mt-1 text-muted-foreground">{data.template.description}</p>
				{/if}
			</div>

			<!-- Actions (owner only) -->
			{#if data.isOwner}
				<div class="flex items-center gap-2">
					{#if data.template.status === 'draft'}
						<form
							method="POST"
							action="?/publish"
							use:enhance={() => {
								isPublishing = true;
								return async ({ update }) => {
									isPublishing = false;
									await update();
								};
							}}
						>
							<Button type="submit" disabled={isPublishing}>
								<Upload class="mr-2 h-4 w-4" />
								{isPublishing ? 'Publication...' : 'Publier'}
							</Button>
						</form>
					{/if}

					<!--
						Reprendre le contenu d'un chapitre : c'est le seul moyen de
						faire évoluer un modèle, son contenu n'étant pas modifiable
						pièce à pièce.
					-->
					{#if data.template.status !== 'archived' && data.linkedChapters.length > 0}
						<Button variant="outline" onclick={() => (showUpdateDialog = true)}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Mettre à jour depuis un chapitre
						</Button>
					{/if}

					<!--
						Un modèle archivé est une trace de ce qui a servi : on ne le
						détruit pas. Brouillon et publié se suppriment, la
						confirmation disant ce que cela emporte.
					-->
					{#if data.template.status !== 'archived'}
						<Button
							variant="outline"
							class="text-destructive hover:text-destructive"
							onclick={() => (showDeleteDialog = true)}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Supprimer
						</Button>
					{/if}

					{#if data.template.status === 'published'}
						<form
							method="POST"
							action="?/archive"
							use:enhance={() => {
								isArchiving = true;
								return async ({ update }) => {
									isArchiving = false;
									await update();
								};
							}}
						>
							<Button type="submit" variant="outline" disabled={isArchiving}>
								<Archive class="mr-2 h-4 w-4" />
								{isArchiving ? 'Archivage...' : 'Archiver'}
							</Button>
						</form>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Template Info -->
	<Card>
		<CardHeader>
			<CardTitle>Informations</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Grades -->
			{#if data.template.grades.length > 0}
				<div>
					<p class="mb-2 text-sm font-medium">Niveaux :</p>
					<div class="flex flex-wrap gap-2">
						{#each data.template.grades as grade (grade)}
							<!-- Le nom court vient du référentiel : « 2de », « 1re spé »… -->
							<Badge variant="outline">{formatGradeShort(grade)}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Stats -->
			<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
				<div class="flex items-center gap-2">
					<FileText class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.documentCount}</p>
						<p class="text-xs text-muted-foreground">Documents</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<CheckSquare class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.checklistItemCount}</p>
						<p class="text-xs text-muted-foreground">Tâches</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<BookOpen class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.exerciseCount}</p>
						<p class="text-xs text-muted-foreground">{lore.learning.exercise}s</p>
					</div>
				</div>
				<!--
					Les fiches font partie du modèle depuis la PR #256 : les compter
					ici, sans quoi un modèle qui n'emporte qu'elles paraît vide.
				-->
				<div class="flex items-center gap-2">
					<ClipboardList class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.worksheetCount}</p>
						<p class="text-xs text-muted-foreground">Fiches</p>
					</div>
				</div>
			</div>

			<!-- Meta -->
			<div class="space-y-1 border-t pt-4 text-sm text-muted-foreground">
				<p>Version actuelle : v{data.template.currentVersion}</p>
				<p>Utilisations : {data.template.instantiationCount}</p>
				<p>Créé le {formatDate(data.template.createdAt)}</p>
				<p>Dernière modification : {formatDate(data.template.updatedAt)}</p>
			</div>
		</CardContent>
	</Card>

	<!-- Instantiate -->
	{#if data.template.status === 'published' && data.classes.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Utiliser ce Template</CardTitle>
				<CardDescription>
					Créez un chapitre depuis ce template dans une de vos {lore.entities.class}s
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button onclick={() => (showInstantiateDialog = true)}>
					<PlayCircle class="mr-2 h-4 w-4" />
					Créer un Chapitre
				</Button>
			</CardContent>
		</Card>
	{/if}

	<!-- Versions History -->
	{#if data.versions.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Historique des Versions</CardTitle>
				<CardDescription>{data.versions.length} versions</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each data.versions as version (version.id)}
						<div class="flex items-start gap-3 rounded-lg border p-3">
							<Clock class="mt-0.5 h-5 w-5 text-muted-foreground" />
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<p class="font-medium">Version {version.versionNumber}</p>
									{#if version.versionNumber === data.template.currentVersion}
										<Badge variant="outline" class="text-xs">Actuelle</Badge>
									{/if}
								</div>
								{#if version.changeSummary}
									<p class="mt-1 text-sm text-muted-foreground">{version.changeSummary}</p>
								{/if}
								<p class="mt-1 text-xs text-muted-foreground">
									{formatDate(version.createdAt)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

<!-- Instantiate Dialog -->
<Dialog.Root bind:open={showUpdateDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Mettre à jour ce modèle</Dialog.Title>
			<Dialog.Description>
				Le contenu du chapitre choisi remplacera celui du modèle.
				{#if data.template.status === 'draft'}
					Le modèle est en brouillon : son contenu est simplement réécrit.
				{:else}
					Le modèle est publié : cela crée une nouvelle version, et les chapitres qui le suivent se
					verront proposer la mise à jour.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/updateFromChapter"
			use:enhance={() => {
				isUpdatingFromChapter = true;
				return async ({ update }) => {
					isUpdatingFromChapter = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label>Chapitre source</Label>
				<MySelect type="single" bind:value={selectedChapterId} items={chapterItems} />
				<input type="hidden" name="chapterId" value={selectedChapterId} />
			</div>

			{#if data.template.status !== 'draft'}
				<div class="space-y-2">
					<Label for="change-summary">Ce qui change (facultatif)</Label>
					<Input
						id="change-summary"
						name="changeSummary"
						bind:value={changeSummary}
						maxlength={200}
						placeholder="Ajout de deux exercices sur le discriminant"
					/>
				</div>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showUpdateDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isUpdatingFromChapter || !selectedChapterId}>
					{isUpdatingFromChapter ? 'Mise à jour...' : 'Mettre à jour'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showDeleteDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Supprimer ce modèle ?</Dialog.Title>
			<Dialog.Description>
				Le modèle « {data.template.title} » et son historique de versions seront effacés définitivement.
				Le chapitre dont il a été tiré n'est pas touché, et les chapitres déjà créés à partir de lui
				sont conservés — ils deviennent simplement indépendants.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				isDeleting = true;
				return async ({ update }) => {
					isDeleting = false;
					await update();
				};
			}}
		>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showDeleteDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" variant="destructive" disabled={isDeleting}>
					{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showInstantiateDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Créer un Chapitre</Dialog.Title>
			<Dialog.Description>
				Instanciez ce template dans une de vos {lore.entities.class}s pour créer un nouveau
				chapitre.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/instantiate"
			use:enhance={() => {
				isInstantiating = true;
				return async ({ update }) => {
					isInstantiating = false;
					await update();
				};
			}}
		>
			<div class="space-y-4">
				<!-- Class selection -->
				<div class="space-y-2">
					<Label for="classId">
						{lore.entities.class}<span class="text-destructive">*</span>
					</Label>
					<MySelect
						type="single"
						bind:value={selectedClassId}
						items={data.classes.map((cls) => ({
							value: cls.id,
							label: `${cls.name} (${cls.grade})`
						}))}
						placeholder="Sélectionnez un {lore.entities.class}"
					/>
					<input type="hidden" name="classId" value={selectedClassId} />
				</div>

				<!-- Custom title -->
				<div class="space-y-2">
					<Label for="title">Titre du Chapitre (optionnel)</Label>
					<Input
						id="title"
						name="title"
						type="text"
						placeholder={data.template.title}
						bind:value={chapterTitle}
					/>
					<p class="text-xs text-muted-foreground">
						Laissez vide pour utiliser le titre du template
					</p>
				</div>

				<!-- Visibility -->
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="isVisible"
						name="isVisible"
						value="true"
						class="h-4 w-4 rounded border-gray-300"
					/>
					<Label for="isVisible" class="cursor-pointer">
						Rendre le chapitre visible immédiatement
					</Label>
				</div>
			</div>

			<Dialog.Footer class="mt-6">
				<Button
					type="button"
					variant="outline"
					onclick={() => (showInstantiateDialog = false)}
					disabled={isInstantiating}
				>
					Annuler
				</Button>
				<Button type="submit" disabled={isInstantiating || !selectedClassId}>
					{isInstantiating ? 'Création...' : 'Créer le Chapitre'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
