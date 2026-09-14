<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Teacher Chapter Content Editor Page
	 * ====================================
	 *
	 * Manage chapter content with tabs:
	 * - Documents (upload/Google Drive)
	 * - Quiz questions (modèles de questions publiés)
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
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import PublicationToggle from '$lib/components/cours/teacher/PublicationToggle.svelte';
	import {
		ChapterSectionsEditor,
		ChecklistEditor,
		StudentProgressTable,
		DocumentUpload
	} from '$lib/components/cours/teacher';
	import { DocumentCard } from '$lib/components/cours';
	import { ChapterTemplateIndicator } from '$lib/components/templates';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getChapterColorClasses } from '$lib/types/chapters';
	import {
		ArrowLeft,
		Plus,
		Trash2,
		FileText,
		HelpCircle,
		ListChecks,
		BookOpen,
		Users,
		BookMarked,
		ClipboardList,
		Copy,
		Eye,
		EyeOff
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Tab state
	let activeTab = $state('checklist');

	// Dialog states
	let showAddQuestionDialog = $state(false);
	let showLinkExerciseDialog = $state(false);
	let showLinkWorksheetDialog = $state(false);
	let showCreateTemplateDialog = $state(false);

	// Form states
	let selectedQuestionId = $state('');
	let selectedExerciseId = $state('');
	let selectedWorksheetId = $state('');
	let isSubmitting = $state(false);

	/** Titre du futur modèle, pré-rempli avec celui du chapitre. */
	let templateTitle = $state('');
	let templateDescription = $state('');

	// Chapter color
	let colorClasses = $derived(
		getChapterColorClasses(data.chapter.color as Parameters<typeof getChapterColorClasses>[0])
	);

	// Content counts
	let documentCount = $derived(data.documents.length);
	let quizCount = $derived(data.quizQuestions.length);
	let checklistCount = $derived(data.checklistItems.length);
	let exerciseCount = $derived(data.exercises.length);
	let worksheetCount = $derived(data.worksheets.length);
	let studentCount = $derived(data.students.length);

	/**
	 * Un chapitre sans contenu ne fait pas un modèle : le serveur refuse de
	 * publier un modèle vide, autant ne pas le laisser créer.
	 */
	let hasContent = $derived(
		documentCount + quizCount + checklistCount + exerciseCount + worksheetCount > 0
	);

	// Available items for selects
	let questionItems = $derived([
		{ value: '', label: 'Choisir une question...' },
		...data.availableTemplates
			.filter((t) => !data.quizQuestions.some((q) => q.questionTemplateId === t.id))
			.map((t) => ({
				value: t.id,
				label: `${t.title} — ${t.domain} (niv. ${t.level})`
			}))
	]);

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
				addQuizQuestion: 'Question ajoutee',
				removeQuizQuestion: 'Question supprimee',
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
			if (form.action === 'addQuizQuestion') {
				showAddQuestionDialog = false;
				selectedQuestionId = '';
			}
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
			quizQuestions={data.quizQuestions}
			worksheets={data.worksheets}
			questionTemplates={data.questionTemplates}
			exerciseDetails={data.exerciseDetails}
		/>
	</section>

	<!-- Content Tabs -->
	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="mb-6 grid w-full grid-cols-5">
			<Tabs.Trigger value="checklist" class="flex items-center gap-2">
				<ListChecks class="h-4 w-4" />
				<span class="hidden sm:inline">Objectifs</span>
				<Badge variant="secondary" class="ml-1">{checklistCount}</Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="quiz" class="flex items-center gap-2">
				<HelpCircle class="h-4 w-4" />
				<span class="hidden sm:inline">Quiz</span>
				<Badge variant="secondary" class="ml-1">{quizCount}</Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="exercises" class="flex items-center gap-2">
				<BookOpen class="h-4 w-4" />
				<span class="hidden sm:inline">{lore.learning.exercise}s</span>
				<Badge variant="secondary" class="ml-1">{exerciseCount}</Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="worksheets" class="flex items-center gap-2">
				<ClipboardList class="h-4 w-4" />
				<span class="hidden sm:inline">Fiches</span>
				<Badge variant="secondary" class="ml-1">{worksheetCount}</Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="documents" class="flex items-center gap-2">
				<FileText class="h-4 w-4" />
				<span class="hidden sm:inline">Documents</span>
				<Badge variant="secondary" class="ml-1">{documentCount}</Badge>
			</Tabs.Trigger>
			<Tabs.Trigger value="progress" class="flex items-center gap-2">
				<Users class="h-4 w-4" />
				<span class="hidden sm:inline">Progression</span>
				<Badge variant="secondary" class="ml-1">{studentCount}</Badge>
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Checklist Tab -->
		<Tabs.Content value="checklist">
			<ChecklistEditor items={data.checklistItems} chapterId={data.chapter.id} />
		</Tabs.Content>

		<!-- Quiz Tab -->
		<Tabs.Content value="quiz">
			<div class="space-y-4">
				<!-- Add question button -->
				<div class="flex justify-end">
					<Button onclick={() => (showAddQuestionDialog = true)} size="sm">
						<Plus class="mr-2 h-4 w-4" />
						Ajouter une question
					</Button>
				</div>

				{#if quizCount === 0}
					<Card.Root class="border-dashed">
						<Card.Content class="py-12 text-center">
							<HelpCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
							<p class="text-muted-foreground">Aucune question dans ce quiz</p>
							<Button
								onclick={() => (showAddQuestionDialog = true)}
								variant="ghost"
								size="sm"
								class="mt-2"
							>
								Ajouter la premiere question
							</Button>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="space-y-3">
						{#each data.quizQuestions as question, index (question.id)}
							{@const template = data.questionTemplates[question.questionTemplateId]}
							<Card.Root>
								<Card.Content class="flex items-center gap-4 p-4">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
									>
										{index + 1}
									</div>
									<div class="min-w-0 flex-1">
										<p class="font-medium">
											{template?.title ?? 'Modèle supprimé'}
										</p>
										<!--
											Trois états distincts, que l'ancienne version confondait en une
											case vide : modèle publié (l'élève le voit), modèle redevenu
											brouillon (l'élève ne le voit plus), modèle supprimé.
										-->
										<p class="text-sm text-muted-foreground">
											{#if !template}
												Ce modèle n'existe plus : la question ne s'affichera pas.
											{:else if template.status !== 'published'}
												Brouillon — les élèves ne verront pas cette question.
											{:else}
												Publié
											{/if}
										</p>
									</div>
									<PublicationToggle
										contentType="quiz"
										itemId={question.id}
										publishedAt={question.publishedAt}
									/>
									<form method="POST" action="?/removeQuizQuestion" use:enhance>
										<input type="hidden" name="quizQuestionId" value={question.id} />
										<Button type="submit" variant="ghost" size="icon-sm" class="text-destructive">
											<Trash2 class="h-4 w-4" />
										</Button>
									</form>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<!-- Exercises Tab -->
		<Tabs.Content value="exercises">
			<div class="space-y-4">
				<!-- Link exercise button -->
				<div class="flex justify-end">
					<Button onclick={() => (showLinkExerciseDialog = true)} size="sm">
						<Plus class="mr-2 h-4 w-4" />
						Lier une {lore.learning.exercise}
					</Button>
				</div>

				{#if exerciseCount === 0}
					<Card.Root class="border-dashed">
						<Card.Content class="py-12 text-center">
							<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
							<p class="text-muted-foreground">Aucune {lore.learning.exercise} lie</p>
							<Button
								onclick={() => (showLinkExerciseDialog = true)}
								variant="ghost"
								size="sm"
								class="mt-2"
							>
								Lier une {lore.learning.exercise}
							</Button>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="space-y-3">
						{#each data.exercises as exercise, index (exercise.id)}
							{@const details = data.exerciseDetails[exercise.exerciseId]}
							<Card.Root>
								<Card.Content class="flex items-center gap-4 p-4">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
									>
										{index + 1}
									</div>
									<div class="min-w-0 flex-1">
										<p class="font-medium">
											{details?.title || `${lore.learning.exercise} non trouvée`}
										</p>
									</div>
									<PublicationToggle
										contentType="exercise"
										itemId={exercise.id}
										publishedAt={exercise.publishedAt}
									/>
									<form method="POST" action="?/unlinkExercise" use:enhance>
										<input type="hidden" name="chapterExerciseId" value={exercise.id} />
										<Button type="submit" variant="ghost" size="icon-sm" class="text-destructive">
											<Trash2 class="h-4 w-4" />
										</Button>
									</form>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<!-- Worksheets Tab -->
		<Tabs.Content value="worksheets">
			<div class="space-y-4">
				<div class="flex items-start justify-between gap-4">
					<p class="text-sm text-muted-foreground">
						Rattacher une fiche la range dans ce chapitre — ça ne la distribue pas. Les élèves ne la
						verront ici qu'une fois que tu l'auras affectée.
					</p>
					<Button onclick={() => (showLinkWorksheetDialog = true)} size="sm" class="shrink-0">
						<Plus class="mr-2 h-4 w-4" />
						Rattacher une fiche
					</Button>
				</div>

				{#if worksheetCount === 0}
					<Card.Root class="border-dashed">
						<Card.Content class="py-12 text-center">
							<ClipboardList class="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
							<p class="text-muted-foreground">Aucune fiche rattachée à ce chapitre</p>
							<Button
								onclick={() => (showLinkWorksheetDialog = true)}
								variant="ghost"
								size="sm"
								class="mt-2"
							>
								Rattacher une fiche
							</Button>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="space-y-3">
						{#each data.worksheets as fiche, index (fiche.id)}
							<Card.Root>
								<Card.Content class="flex items-center gap-4 p-4">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
									>
										{index + 1}
									</div>
									<div class="min-w-0 flex-1">
										<p class="font-medium">{fiche.title ?? 'Fiche non trouvée'}</p>
									</div>
									<PublicationToggle
										contentType="worksheet"
										itemId={fiche.id}
										publishedAt={fiche.publishedAt}
										distributed={data.distributedWorksheetIds.includes(fiche.worksheetId)}
									/>
									<form method="POST" action="?/unlinkWorksheet" use:enhance>
										<input type="hidden" name="chapterWorksheetId" value={fiche.id} />
										<Button type="submit" variant="ghost" size="icon-sm" class="text-destructive">
											<Trash2 class="h-4 w-4" />
										</Button>
									</form>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<!-- Documents Tab -->
		<Tabs.Content value="documents">
			<div class="space-y-6">
				<!-- Upload component -->
				<!--
					Le client du navigateur pousse le fichier directement dans le
					stockage : il ne traverse plus la fonction, qui refusait au-delà de
					quelques mégaoctets.
				-->
				<DocumentUpload
					chapterId={data.chapter.id}
					supabase={data.supabase}
					onSuccess={() => invalidateAll()}
				/>

				<!-- Documents list -->
				{#if documentCount === 0}
					<Card.Root class="border-dashed">
						<Card.Content class="py-8 text-center">
							<FileText class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
							<p class="text-muted-foreground">Aucun document dans ce chapitre</p>
							<p class="mt-1 text-sm text-muted-foreground">
								Utilisez le formulaire ci-dessus pour ajouter des documents
							</p>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="space-y-3">
						<h3 class="text-sm font-medium text-muted-foreground">
							{documentCount} document{documentCount > 1 ? 's' : ''}
						</h3>
						<div class="grid gap-4 sm:grid-cols-2">
							{#each data.documents as document (document.id)}
								<div class="group relative">
									<DocumentCard {document} />
									<div class="mt-2">
										<PublicationToggle
											contentType="document"
											itemId={document.id}
											publishedAt={document.publishedAt}
										/>
									</div>
									<!-- Delete button overlay -->
									<form
										method="POST"
										action="?/deleteDocument"
										use:enhance={() => {
											isSubmitting = true;
											return async ({ update }) => {
												await update();
											};
										}}
										class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<input type="hidden" name="documentId" value={document.id} />
										<Button
											type="submit"
											variant="destructive"
											size="icon-sm"
											disabled={isSubmitting}
											title="Supprimer"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</form>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<!-- Progress Tab -->
		<Tabs.Content value="progress">
			<StudentProgressTable
				students={data.students}
				checklistItems={data.checklistItems}
				progress={data.checklistProgress}
			/>
		</Tabs.Content>
	</Tabs.Root>
</main>

<!-- Add Quiz Question Dialog -->
<Dialog.Root bind:open={showAddQuestionDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Ajouter une question au quiz</Dialog.Title>
			<Dialog.Description>
				Seuls les modèles <strong>publiés</strong> sont proposés : un brouillon serait invisible aux
				élèves.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/addQuizQuestion"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label>Question</Label>
				{#if data.availableTemplates.length === 0}
					<!--
						Une liste vide ne doit pas laisser croire à une panne : ici, elle
						dit ce qu'il manque et où le faire.
					-->
					<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						Aucun modèle de question publié pour le moment. Publie un modèle depuis
						<a href="/dashboard/admin/questions" class="underline">la banque de questions</a>
						pour pouvoir l'ajouter ici.
					</p>
				{:else}
					<MySelect type="single" bind:value={selectedQuestionId} items={questionItems} />
					<input type="hidden" name="questionTemplateId" value={selectedQuestionId} />
					{#if data.hiddenTemplateCount > 0}
						<!-- Un plafond silencieux ferait conclure que la question n'existe pas. -->
						<p class="text-xs text-muted-foreground">
							{data.hiddenTemplateCount} autre{data.hiddenTemplateCount > 1 ? 's' : ''} modèle{data.hiddenTemplateCount >
							1
								? 's'
								: ''} publié{data.hiddenTemplateCount > 1 ? 's' : ''} ne {data.hiddenTemplateCount >
							1
								? 'sont'
								: 'est'} pas listé{data.hiddenTemplateCount > 1 ? 's' : ''} ici (limite d'affichage).
						</p>
					{/if}
				{/if}
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showAddQuestionDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !selectedQuestionId}>
					{isSubmitting ? 'Ajout...' : 'Ajouter'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Link Worksheet Dialog -->
<Dialog.Root bind:open={showCreateTemplateDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Faire un modèle de ce chapitre</Dialog.Title>
			<Dialog.Description>
				Le modèle emporte une copie du contenu : objectifs, questions de quiz, exercices, fiches et
				documents. Il naît en brouillon, et rien n'est distribué aux élèves.
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
