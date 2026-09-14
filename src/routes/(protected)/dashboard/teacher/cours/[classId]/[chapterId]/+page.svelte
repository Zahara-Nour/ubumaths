<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Teacher Chapter Content Editor Page
	 * ====================================
	 *
	 * Manage chapter content with tabs:
	 * - Documents (upload/Google Drive)
	 * - Checklist items
	 * - Exercises (links)
	 * - Worksheets (links) — rattacher ne distribue pas
	 * - Student progress
	 */

	import { applyAction, enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		ChapterSectionsEditor,
		StudentProgressTable,
		DocumentUpload
	} from '$lib/components/cours/teacher';
	import { ChapterTemplateIndicator } from '$lib/components/templates';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getChapterColorClasses } from '$lib/types/chapters';
	import { ArrowLeft, BookMarked, Copy, Eye, EyeOff } from '@lucide/svelte';
	import type { SectionContentKind } from '$lib/server/validation/chapter-sections';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Dialog states
	let showLinkExerciseDialog = $state(false);
	let showLinkWorksheetDialog = $state(false);
	let showCreateTemplateDialog = $state(false);
	let showChecklistDialog = $state(false);
	let showDocumentDialog = $state(false);

	/**
	 * La section où ira la prochaine ressource créée.
	 *
	 * ⚠️ Posée au moment du clic sur « Ajouter », et relue à l'envoi du
	 * formulaire : c'est elle qui fait la différence entre « créé là où j'ai
	 * cliqué » et « créé en Non classé, débrouille-toi ». `null` est une valeur
	 * légitime — c'est « Non classé ».
	 */
	let targetSectionId = $state<string | null>(null);

	/** Objectif en cours d'écriture — vide pour une création, rempli pour une reprise. */
	let checklistItemId = $state('');
	let checklistContent = $state('');
	let checklistDescription = $state('');

	// Form states
	let selectedExerciseId = $state('');
	let selectedWorksheetId = $state('');
	let isSubmitting = $state(false);

	/** Titre du futur modèle, pré-rempli avec celui du chapitre. */
	let templateTitle = $state('');
	let templateDescription = $state('');

	/**
	 * Le professeur a choisi un type dans le menu « Ajouter » d'une section.
	 *
	 * Chaque type a déjà sa boîte de dialogue ; on retient la cible, puis on
	 * ouvre la bonne. Rien n'est créé ici.
	 */
	function ouvrirAjout(kind: SectionContentKind, sectionId: string | null) {
		targetSectionId = sectionId;

		if (kind === 'checklistItem') {
			checklistItemId = '';
			checklistContent = '';
			checklistDescription = '';
			showChecklistDialog = true;
		} else if (kind === 'exercise') {
			selectedExerciseId = '';
			showLinkExerciseDialog = true;
		} else if (kind === 'worksheet') {
			selectedWorksheetId = '';
			showLinkWorksheetDialog = true;
		} else {
			showDocumentDialog = true;
		}
	}

	/** Reprendre le texte d'un objectif déjà posé. */
	function modifierObjectif(item: { id: string; content: string; description: string | null }) {
		checklistItemId = item.id;
		checklistContent = item.content;
		checklistDescription = item.description ?? '';
		// La section ne bouge pas : on ne fait que corriger le texte.
		targetSectionId = null;
		showChecklistDialog = true;
	}

	// Chapter color
	let colorClasses = $derived(
		getChapterColorClasses(data.chapter.color as Parameters<typeof getChapterColorClasses>[0])
	);

	// Content counts
	let documentCount = $derived(data.documents.length);
	let checklistCount = $derived(data.checklistItems.length);
	let exerciseCount = $derived(data.exercises.length);
	let worksheetCount = $derived(data.worksheets.length);

	/**
	 * Un chapitre sans contenu ne fait pas un modèle : le serveur refuse de
	 * publier un modèle vide, autant ne pas le laisser créer.
	 */
	let hasContent = $derived(documentCount + checklistCount + exerciseCount + worksheetCount > 0);

	// Available items for selects
	let exerciseItems = $derived([
		{ value: '', label: `Choisir une ${lore.learning.exercise}...` },
		...data.availableExercises
			.filter((e) => !data.exercises.some((ex) => ex.exerciseId === e.id))
			.map((e) => ({
				value: e.id,
				// `exercises.title` est nullable : un libellé de repli vaut mieux
				// qu'une entrée vide dans la liste déroulante.
				label: e.title ?? 'Exercice sans titre'
			}))
	]);

	let worksheetItems = $derived([
		{ value: '', label: 'Choisir une fiche...' },
		...data.availableWorksheets
			.filter((w) => !data.worksheets.some((cw) => cw.worksheetId === w.id))
			.map((w) => ({
				value: w.id,
				label: w.title ?? 'Fiche sans titre'
			}))
	]);

	// Handle form results
	$effect(() => {
		if (form?.success) {
			const actionMessages: Record<string, string> = {
				addChecklistItem: 'Objectif ajoute',
				updateChecklistItem: 'Objectif mis a jour',
				deleteChecklistItem: 'Objectif supprime',
				linkExercise: `${lore.learning.exercise} liée`,
				unlinkExercise: `${lore.learning.exercise} retirée`,
				linkWorksheet: 'Fiche rattachée au chapitre',
				unlinkWorksheet: 'Fiche retirée du chapitre',
				addGoogleDriveDocument: 'Document Google Drive ajoute',
				deleteDocument: 'Document supprime',
				migrateToVersion: 'Chapitre mis a jour depuis le template',
				detachFromTemplate: 'Chapitre detache du template'
			};
			const message = actionMessages[form.action] || 'Operation reussie';
			toaster.success(message);

			// Close dialogs
			if (form.action === 'linkExercise') {
				showLinkExerciseDialog = false;
				selectedExerciseId = '';
			}
			invalidateAll();
		} else if (form?.error) {
			toaster.error(form.error);
		}
		isSubmitting = false;
	});

	// Navigating state (reserved for future loading indicators)
	let _isNavigating = $derived(!!$navigating);

	// Template form refs
	let migrateForm: HTMLFormElement | undefined = $state();
	let detachForm: HTMLFormElement | undefined = $state();

	// Template action handlers
	function handleMigrate() {
		if (migrateForm) {
			migrateForm.requestSubmit();
		}
	}

	function handleDetach() {
		if (detachForm) {
			detachForm.requestSubmit();
		}
	}
</script>

<svelte:head>
	<title>{data.chapter.title} - Edition | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<!-- Breadcrumb -->
	<div class="mb-6">
		<Button variant="ghost" href="/dashboard/teacher/cours/{data.classData?.id}" class="mb-2 -ml-2">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour a {data.classData?.name}
		</Button>
	</div>

	<!-- Chapter Header -->
	<Card.Root class="mb-6 {colorClasses.border} border-2">
		<Card.Header class={colorClasses.bg}>
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-center gap-3">
					<BookMarked class="h-8 w-8 {colorClasses.text}" />
					<div>
						<Card.Title class="text-2xl">{data.chapter.title}</Card.Title>
						{#if data.chapter.description}
							<Card.Description class="mt-1">
								{data.chapter.description}
							</Card.Description>
						{/if}
						<!-- Template indicator -->
						{#if data.templateInstantiation}
							<div class="mt-2">
								<ChapterTemplateIndicator
									instantiation={data.templateInstantiation}
									hasUpdate={data.templateInstantiation.hasUpdate}
									onUpdate={handleMigrate}
									onDetach={handleDetach}
								/>
							</div>
						{/if}
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<!--
						Faire un modèle de ce chapitre : c'est le seul chemin qui
						remplit un modèle, le contenu y entre par capture.
					-->
					<Button
						variant="outline"
						size="sm"
						disabled={!hasContent}
						onclick={() => {
							templateTitle = data.chapter.title;
							templateDescription = data.chapter.description ?? '';
							showCreateTemplateDialog = true;
						}}
						title={hasContent
							? 'Créer un modèle réutilisable à partir de ce chapitre'
							: 'Ajoutez du contenu au chapitre avant d’en faire un modèle'}
					>
						<Copy class="mr-2 h-4 w-4" />
						Faire un modèle
					</Button>

					<Badge
						variant={data.chapter.isVisible ? 'default' : 'secondary'}
						class="flex items-center gap-1"
					>
						{#if data.chapter.isVisible}
							<Eye class="h-3 w-3" />
							Visible
						{:else}
							<EyeOff class="h-3 w-3" />
							Masque
						{/if}
					</Badge>
				</div>
			</div>
		</Card.Header>
	</Card.Root>

	<!--
		Le PLAN du chapitre : l'axe de rangement est le moment du cours, pas le
		type de ressource. Les onglets par type, plus bas, restent l'endroit où
		l'on ajoute et modifie une ressource ; celui-ci est l'endroit où on la
		range.
	-->
	<section class="mb-8 space-y-3">
		<div>
			<h2 class="text-xl font-semibold">Plan du chapitre</h2>
			<p class="text-sm text-muted-foreground">
				Rangez chaque ressource dans la section où elle intervient. Les sections se renomment, se
				réordonnent, s'ajoutent et se suppriment — supprimer une section ne supprime jamais ses
				ressources.
			</p>
		</div>

		<ChapterSectionsEditor
			chapterId={data.chapter.id}
			sections={data.sections}
			documents={data.documents}
			exercises={data.exercises}
			checklistItems={data.checklistItems}
			worksheets={data.worksheets}
			exerciseDetails={data.exerciseDetails}
			distributedWorksheetIds={data.distributedWorksheetIds}
			onAdd={ouvrirAjout}
			onEditChecklistItem={modifierObjectif}
		/>
	</section>

	<!--
		La progression n'est pas une ressource du chapitre : elle ne se range dans
		aucune section, et c'est pourquoi elle vit ici, sous le plan, plutôt que
		dedans.
	-->
	<section class="space-y-3">
		<div>
			<h2 class="text-xl font-semibold">Progression des {lore.entities.student}s</h2>
			<p class="text-sm text-muted-foreground">
				Où en est chacun sur les objectifs publiés de ce chapitre.
			</p>
		</div>
		<StudentProgressTable
			students={data.students}
			checklistItems={data.checklistItems}
			progress={data.checklistProgress}
		/>
	</section>
</main>

<!-- Link Worksheet Dialog -->
<Dialog.Root bind:open={showCreateTemplateDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Faire un modèle de ce chapitre</Dialog.Title>
			<Dialog.Description>
				Le modèle emporte une copie du contenu : objectifs, exercices, fiches et documents. Il naît
				en brouillon, et rien n'est distribué aux élèves.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/createTemplate"
			use:enhance={() => {
				isSubmitting = true;

				return async ({ result }) => {
					isSubmitting = false;

					// Ce formulaire quitte la page : laisser l'effet global le
					// traiter lancerait un rechargement de la page courante en même
					// temps que la navigation, et les deux se bloqueraient.
					if (result.type === 'success' && result.data?.templateId) {
						showCreateTemplateDialog = false;
						toaster.success('Modèle créé à partir de ce chapitre');
						await goto(`/dashboard/teacher/contenu/templates/${result.data.templateId}`);
						return;
					}

					await applyAction(result);
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="template-title">Titre du modèle</Label>
				<Input
					id="template-title"
					name="title"
					bind:value={templateTitle}
					maxlength={200}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="template-description">Description (facultative)</Label>
				<Textarea
					id="template-description"
					name="description"
					bind:value={templateDescription}
					maxlength={2000}
					rows={3}
				/>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showCreateTemplateDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !templateTitle.trim()}>
					{isSubmitting ? 'Création...' : 'Créer le modèle'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showLinkWorksheetDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Rattacher une fiche</Dialog.Title>
			<Dialog.Description>
				La fiche sera rangée dans ce chapitre. Elle n'est pas distribuée pour autant : les élèves ne
				la verront qu'une fois affectée.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/linkWorksheet"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="sectionId" value={targetSectionId ?? ''} />
			<div class="space-y-2">
				<Label>Fiche</Label>
				<MySelect type="single" bind:value={selectedWorksheetId} items={worksheetItems} />
				<input type="hidden" name="worksheetId" value={selectedWorksheetId} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showLinkWorksheetDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !selectedWorksheetId}>
					{isSubmitting ? 'Rattachement...' : 'Rattacher'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Link Exercise Dialog -->
<Dialog.Root bind:open={showLinkExerciseDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Lier une {lore.learning.exercise}</Dialog.Title>
			<Dialog.Description>
				Selectionnez une {lore.learning.exercise} existant pour le lier a ce chapitre.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/linkExercise"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="sectionId" value={targetSectionId ?? ''} />
			<div class="space-y-2">
				<Label>{lore.learning.exercise}</Label>
				<MySelect type="single" bind:value={selectedExerciseId} items={exerciseItems} />
				<input type="hidden" name="exerciseId" value={selectedExerciseId} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showLinkExerciseDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !selectedExerciseId}>
					{isSubmitting ? 'Liaison...' : 'Lier'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!--
	Objectif : la MÊME boîte crée et corrige.
	=========================================

	`checklistItemId` fait la bascule — vide, on crée dans la section visée ;
	rempli, on corrige un texte existant sans toucher à son rangement. Deux
	boîtes auraient divergé, et le professeur aurait fini par ne plus savoir
	laquelle ouvre quoi.
-->
<Dialog.Root bind:open={showChecklistDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>
				{checklistItemId ? 'Modifier l’objectif' : 'Ajouter un objectif'}
			</Dialog.Title>
			<Dialog.Description>
				Ce que l’{lore.entities.student} doit savoir faire à la fin du chapitre. Il reste préparé tant
				que tu ne l’as pas publié.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action={checklistItemId ? '?/updateChecklistItem' : '?/addChecklistItem'}
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') showChecklistDialog = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="sectionId" value={targetSectionId ?? ''} />
			{#if checklistItemId}
				<input type="hidden" name="itemId" value={checklistItemId} />
			{/if}

			<div class="space-y-2">
				<Label for="checklist-content">Objectif</Label>
				<Input
					id="checklist-content"
					name="content"
					bind:value={checklistContent}
					maxlength={500}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="checklist-description">Précision (facultative)</Label>
				<Textarea
					id="checklist-description"
					name="description"
					bind:value={checklistDescription}
					maxlength={1000}
					rows={2}
				/>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showChecklistDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !checklistContent.trim()}>
					{checklistItemId ? 'Enregistrer' : 'Ajouter'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!--
	Document : l'envoi direct et le lien Drive, tels quels.
	Le fichier ne traverse pas la fonction — il part du navigateur vers le
	stockage, muni d'une autorisation à usage unique.
-->
<Dialog.Root bind:open={showDocumentDialog}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Ajouter un document</Dialog.Title>
			<Dialog.Description>
				Dépose un fichier, ou colle le lien d’un document Google Drive.
			</Dialog.Description>
		</Dialog.Header>

		<DocumentUpload
			chapterId={data.chapter.id}
			supabase={data.supabase}
			sectionId={targetSectionId}
			onSuccess={() => {
				showDocumentDialog = false;
				invalidateAll();
			}}
		/>
	</Dialog.Content>
</Dialog.Root>

<!-- Hidden forms for template actions -->
{#if data.templateInstantiation}
	<form
		bind:this={migrateForm}
		method="POST"
		action="?/migrateToVersion"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
			};
		}}
		class="hidden"
	>
		<input
			type="hidden"
			name="targetVersion"
			value={data.templateInstantiation.latestVersion ?? data.templateInstantiation.templateVersion}
		/>
	</form>

	<form
		bind:this={detachForm}
		method="POST"
		action="?/detachFromTemplate"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
			};
		}}
		class="hidden"
	></form>
{/if}
