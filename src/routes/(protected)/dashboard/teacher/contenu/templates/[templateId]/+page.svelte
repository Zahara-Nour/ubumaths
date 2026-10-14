<!--
	Page d'un modèle de chapitre
	============================

	Le modèle POSSÈDE son contenu et s'édite ici, avec le MÊME éditeur que le
	chapitre (ADR 0029) : sections, documents (téléversés ou Drive), objectifs,
	exercices, fiches, séries. Rien n'y est publié — un modèle ne donne rien aux
	élèves ; chaque chapitre lié décide de ce qu'il publie.

	Une correction faite ici arrive aussitôt dans chaque chapitre lié ; un ajout
	y arrive préparé. « Retirer du modèle » laisse l'élément aux classes qui
	l'avaient déjà publié.

	Plus de versions ni de « Mettre à jour depuis un chapitre » : le lien est
	vivant, il n'y a plus rien à reprendre.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
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
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ChapterAddDialogs, ChapterSectionsEditor } from '$lib/components/cours/teacher';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		FileText,
		CheckSquare,
		BookOpen,
		ClipboardList,
		Layers,
		Upload,
		Archive,
		Trash2,
		PlayCircle,
		Pencil
	} from '@lucide/svelte';
	import { formatGradeShort } from '$lib/utils/grades';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isPublishing = $state(false);
	let isArchiving = $state(false);
	let isDeleting = $state(false);
	let showDeleteDialog = $state(false);

	/** Titre et description du modèle, repris dans la boîte « Modifier ». */
	let showEditDialog = $state(false);
	let isSaving = $state(false);
	let editTitle = $state('');
	let editDescription = $state('');

	let isInstantiating = $state(false);
	let showInstantiateDialog = $state(false);
	let selectedClassId = $state<string>('');
	let chapterTitle = $state('');
	let chapterIsVisible = $state(false);

	/** Les boîtes d'ajout (objectif, exercice, fiche, série, document). */
	let addDialogs: ReturnType<typeof ChapterAddDialogs> | undefined = $state();

	/** Ce que contient VRAIMENT le modèle (ses tables), plus la photo d'avant. */
	const contentCounts = $derived({
		documentCount: data.content.documents.length,
		checklistItemCount: data.content.checklistItems.length,
		exerciseCount: data.content.exercises.length,
		worksheetCount: data.content.worksheets.length,
		seriesCount: data.content.series.length
	});

	const classItems = $derived(
		data.classes.map((cls) => ({
			value: cls.id,
			label: cls.grade ? `${cls.name} (${cls.grade})` : cls.name
		}))
	);

	const selectedClassLabel = $derived(
		classItems.find((c) => c.value === selectedClassId)?.label ?? 'aucune sélection'
	);

	/** Ce que dit le succès d'une action, par nom d'action. */
	const MESSAGES: Record<string, string> = {
		publish: 'Modèle publié : il peut servir à créer des chapitres',
		archive: 'Modèle archivé',
		update: 'Modèle modifié',
		addChecklistItem: 'Objectif ajouté au modèle',
		updateChecklistItem: 'Objectif corrigé — dans chaque chapitre lié aussi',
		linkExercise: `${lore.learning.exercise} ajoutée au modèle`,
		linkWorksheet: 'Fiche ajoutée au modèle',
		linkSeries: 'Série ajoutée au modèle',
		setSeriesForm: 'Forme de la série modifiée',
		addGoogleDriveDocument: 'Document Google Drive ajouté au modèle'
	};

	/** Les actions « retirer du modèle », toutes rendues sous leur propre nom. */
	const RETRAITS = new Set([
		'deleteDocument',
		'deleteChecklistItem',
		'unlinkExercise',
		'unlinkWorksheet',
		'unlinkSeries'
	]);

	function getStatusBadgeColor(status: string) {
		switch (status) {
			case 'published':
				return 'bg-green-600 text-white';
			case 'archived':
				return 'bg-amber-600 text-white';
			default:
				return 'bg-muted text-muted-foreground';
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

	function ouvrirModification() {
		editTitle = data.template.title;
		editDescription = data.template.description ?? '';
		showEditDialog = true;
	}

	// Retour des actions : message, puis relecture du modèle.
	$effect(() => {
		if (form?.success) {
			if (form.action === 'instantiate') {
				toaster.success('Chapitre lié créé');
				showInstantiateDialog = false;
				if ('chapterId' in form && form.chapterId && selectedClassId) {
					goto(`/dashboard/teacher/cours/${selectedClassId}/${form.chapterId}`);
				}
				return;
			}

			if (RETRAITS.has(form.action)) {
				// `deleted: false` : encore publié dans une classe, l'élément y reste.
				toaster.success(
					'deleted' in form && form.deleted === false
						? 'Retiré du modèle — il reste chez les classes qui l’avaient publié'
						: 'Retiré du modèle'
				);
			} else {
				const message = MESSAGES[form.action] ?? 'Modification enregistrée';
				// Créé, mais pas dans la section visée : le dire, sinon on le cherche.
				if ('placed' in form && form.placed === false) {
					toaster.warning(`${message}, mais rangé en « Non classé » — glisse-le dans sa section.`);
				} else {
					toaster.success(message);
				}
			}

			if (form.action === 'update') showEditDialog = false;
			invalidateAll();
		} else if (form?.error) {
			toaster.error(form.error);
		}
	});
</script>

<svelte:head>
	<title>{data.template.title} - Modèle | Chiphre</title>
</svelte:head>

<div class="space-y-6">
	<!-- En-tête -->
	<div>
		<BackLink href="/dashboard/teacher/contenu/templates" label="Retour aux modèles" />
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0 flex-1">
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<h1 class="text-3xl font-bold tracking-tight">{data.template.title}</h1>
					<Badge class={getStatusBadgeColor(data.template.status)}>
						{getStatusLabel(data.template.status)}
					</Badge>
				</div>
				{#if data.template.description}
					<p class="mt-1 text-muted-foreground">{data.template.description}</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<Button variant="outline" onclick={ouvrirModification}>
					<Pencil class="mr-2 h-4 w-4" />
					Modifier
				</Button>

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
							{isPublishing ? 'Publication…' : 'Publier'}
						</Button>
					</form>
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
							{isArchiving ? 'Archivage…' : 'Archiver'}
						</Button>
					</form>
				{/if}

				<!--
					Un modèle archivé est une trace de ce qui a servi : on ne le
					détruit pas. Un modèle relié à des chapitres non plus — le serveur
					le refuse et demande de l'archiver.
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
			</div>
		</div>
	</div>

	<!-- Informations -->
	<Card>
		<CardHeader>
			<CardTitle>Informations</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
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
						<p class="text-xs text-muted-foreground">Objectifs</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<BookOpen class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.exerciseCount}</p>
						<p class="text-xs text-muted-foreground">{lore.learning.exercise}s</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<ClipboardList class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.worksheetCount}</p>
						<p class="text-xs text-muted-foreground">Fiches</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Layers class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.seriesCount}</p>
						<p class="text-xs text-muted-foreground">Séries</p>
					</div>
				</div>
			</div>

			<div class="space-y-1 border-t pt-4 text-sm text-muted-foreground">
				{#if data.linkedChapters.length > 0}
					<p>
						{data.linkedChapters.length === 1 ? 'Chapitre lié' : 'Chapitres liés'} :
						{data.linkedChapters
							.map((c) => (c.className ? `${c.title} (${c.className})` : c.title))
							.join(', ')}
					</p>
				{:else}
					<p>Aucun chapitre lié pour l’instant.</p>
				{/if}
				<p>Créé le {formatDate(data.template.createdAt)}</p>
				<p>Dernière modification : {formatDate(data.template.updatedAt)}</p>
			</div>
		</CardContent>
	</Card>

	<!-- Créer un chapitre lié -->
	{#if data.template.status === 'published' && data.classes.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Utiliser ce modèle</CardTitle>
				<CardDescription>
					Créez un chapitre lié dans une de vos {lore.entities.class}s : il suit le modèle, et rien
					n’y est publié tant que vous ne le décidez pas.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button onclick={() => (showInstantiateDialog = true)}>
					<PlayCircle class="mr-2 h-4 w-4" />
					Créer un chapitre
				</Button>
			</CardContent>
		</Card>
	{/if}

	<!-- Le plan du modèle : le même éditeur que le chapitre. -->
	<section class="space-y-3">
		<div>
			<h2 class="text-xl font-semibold">Plan du modèle</h2>
			<p class="text-sm text-muted-foreground">
				Une correction faite ici arrive aussitôt dans chaque chapitre lié ; un ajout y arrive
				préparé, sans être publié. Retirer un élément du modèle le laisse aux classes qui l’ont déjà
				publié.
			</p>
		</div>

		<ChapterSectionsEditor
			templateId={data.template.id}
			sections={data.content.sections}
			documents={data.content.documents}
			exercises={data.content.exercises}
			checklistItems={data.content.checklistItems}
			worksheets={data.worksheets}
			chapterSeries={data.series}
			exerciseDetails={data.exerciseDetails}
			onAdd={(kind, sectionId) => addDialogs?.ouvrirAjout(kind, sectionId)}
			onEditChecklistItem={(item) => addDialogs?.modifierObjectif(item)}
		/>
	</section>
</div>

<ChapterAddDialogs
	bind:this={addDialogs}
	templateId={data.template.id}
	supabase={data.supabase}
	availableExercises={data.availableExercises}
	availableWorksheets={data.availableWorksheets}
	availableSeries={data.availableSeries}
	takenExerciseIds={data.content.exercises.map((e) => e.exerciseId)}
	takenWorksheetIds={data.content.worksheets.map((w) => w.worksheetId)}
	takenSeriesIds={data.content.series.map((s) => s.seriesId)}
	onDocumentAdded={() => invalidateAll()}
/>

<!-- Modifier le titre et la description -->
<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Modifier le modèle</Dialog.Title>
			<Dialog.Description>
				Le titre et la description du modèle. Les chapitres liés gardent leur propre titre.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				isSaving = true;
				return async ({ update }) => {
					isSaving = false;
					await update({ reset: false });
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="template-edit-title">Titre</Label>
				<Input
					id="template-edit-title"
					name="title"
					bind:value={editTitle}
					maxlength={200}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="template-edit-description">Description (facultative)</Label>
				<Textarea
					id="template-edit-description"
					name="description"
					bind:value={editDescription}
					maxlength={2000}
					rows={3}
				/>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showEditDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSaving || !editTitle.trim()}>
					{isSaving ? 'Enregistrement…' : 'Enregistrer'}
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
				Le modèle « {data.template.title} » et ses fichiers seront effacés définitivement. Un modèle encore
				lié à des chapitres ne se supprime pas : archivez-le plutôt, ses chapitres continuent de le suivre.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				isDeleting = true;
				return async ({ result, update }) => {
					isDeleting = false;
					if (result.type === 'failure') showDeleteDialog = false;
					await update();
				};
			}}
		>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showDeleteDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" variant="destructive" disabled={isDeleting}>
					{isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showInstantiateDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Créer un chapitre lié</Dialog.Title>
			<Dialog.Description>
				Le chapitre suit ce modèle : son contenu y arrive préparé, rien n’est publié aux {lore
					.entities.student}s.
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
				<div class="space-y-2">
					<Label for="instantiate-class">
						{lore.entities.class}<span class="text-destructive">*</span>
					</Label>
					<MySelect
						id="instantiate-class"
						type="single"
						bind:value={selectedClassId}
						items={classItems}
						placeholder="Sélectionnez une {lore.entities.class}"
						triggerAriaLabel="{lore.entities.class} : {selectedClassLabel}"
					/>
					<input type="hidden" name="classId" value={selectedClassId} />
				</div>

				<div class="space-y-2">
					<Label for="instantiate-title">Titre du chapitre (facultatif)</Label>
					<Input
						id="instantiate-title"
						name="title"
						type="text"
						placeholder={data.template.title}
						bind:value={chapterTitle}
					/>
					<p class="text-xs text-muted-foreground">
						Laissez vide pour reprendre le titre du modèle.
					</p>
				</div>

				<MyCheckbox
					bind:checked={chapterIsVisible}
					label="Rendre le chapitre visible immédiatement"
				/>
				{#if chapterIsVisible}
					<input type="hidden" name="isVisible" value="true" />
				{/if}
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
					{isInstantiating ? 'Création…' : 'Créer le chapitre'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
