<script lang="ts">
	/**
	 * Teacher Chapter Content Editor Page
	 * ====================================
	 *
	 * Manage chapter content with tabs:
	 * - Documents (upload/Google Drive)
	 * - Quiz questions (true/false)
	 * - Checklist items
	 * - Exercises (links)
	 * - Student progress
	 */

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
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
		Eye,
		EyeOff
	} from 'lucide-svelte';
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

	// Form states
	let selectedQuestionId = $state('');
	let selectedExerciseId = $state('');
	let isSubmitting = $state(false);

	// Chapter color
	let colorClasses = $derived(
		getChapterColorClasses(data.chapter.color as Parameters<typeof getChapterColorClasses>[0])
	);

	// Content counts
	let documentCount = $derived(data.documents.length);
	let quizCount = $derived(data.quizQuestions.length);
	let checklistCount = $derived(data.checklistItems.length);
	let exerciseCount = $derived(data.exercises.length);
	let studentCount = $derived(data.students.length);

	// Available items for selects
	let questionItems = $derived([
		{ value: '', label: 'Choisir une question...' },
		...data.availableTemplates
			.filter((t) => !data.quizQuestions.some((q) => q.questionTemplateId === t.id))
			.map((t) => ({
				value: t.id,
				label: t.question.length > 60 ? t.question.slice(0, 60) + '...' : t.question
			}))
	]);

	let exerciseItems = $derived([
		{ value: '', label: 'Choisir un exercice...' },
		...data.availableExercises
			.filter((e) => !data.exercises.some((ex) => ex.exerciseId === e.id))
			.map((e) => ({
				value: e.id,
				label: e.title
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
				linkExercise: 'Exercice lie',
				unlinkExercise: 'Exercice retire',
				uploadDocument: 'Document uploade',
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
	<title>{data.chapter.title} - Edition | UbuMaths</title>
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
		</Card.Header>
	</Card.Root>

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
				<span class="hidden sm:inline">Exercices</span>
				<Badge variant="secondary" class="ml-1">{exerciseCount}</Badge>
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
											{template?.question || 'Question non trouvee'}
										</p>
										<p class="text-sm text-muted-foreground">
											Reponse: {template?.answer === true || template?.answer === 'true'
												? 'Vrai'
												: 'Faux'}
										</p>
									</div>
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
						Lier un exercice
					</Button>
				</div>

				{#if exerciseCount === 0}
					<Card.Root class="border-dashed">
						<Card.Content class="py-12 text-center">
							<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
							<p class="text-muted-foreground">Aucun exercice lie</p>
							<Button
								onclick={() => (showLinkExerciseDialog = true)}
								variant="ghost"
								size="sm"
								class="mt-2"
							>
								Lier un exercice
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
										<p class="font-medium">{details?.title || 'Exercice non trouve'}</p>
										{#if details?.description}
											<p class="truncate text-sm text-muted-foreground">
												{details.description}
											</p>
										{/if}
									</div>
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

		<!-- Documents Tab -->
		<Tabs.Content value="documents">
			<div class="space-y-6">
				<!-- Upload component -->
				<DocumentUpload chapterId={data.chapter.id} onSuccess={() => invalidateAll()} />

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
				checklistProgress={data.checklistProgress}
				quizQuestions={data.quizQuestions}
				quizResults={data.quizResults}
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
				Selectionnez une question Vrai/Faux existante pour l'ajouter au quiz.
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
				<MySelect type="single" bind:value={selectedQuestionId} items={questionItems} />
				<input type="hidden" name="questionTemplateId" value={selectedQuestionId} />
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

<!-- Link Exercise Dialog -->
<Dialog.Root bind:open={showLinkExerciseDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Lier un exercice</Dialog.Title>
			<Dialog.Description>
				Selectionnez un exercice existant pour le lier a ce chapitre.
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
				<Label>Exercice</Label>
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
	/>
{/if}
