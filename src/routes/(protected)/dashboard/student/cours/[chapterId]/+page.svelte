<script lang="ts">
	/**
	 * Student Chapter Detail Page
	 * ============================
	 *
	 * Displays a chapter with tabs for:
	 * - Documents (PDFs, Google Drive links)
	 * - Quiz (Vrai/Faux questions with SRS integration)
	 * - Exercices (linked exercises)
	 * - Checklist (personal progress tracking)
	 */

	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ChapterProgressIndicator,
		DocumentCard,
		ChecklistSection,
		ChapterQuiz
	} from '$lib/components/cours';
	import { getChapterColorClasses } from '$lib/types/chapters';
	import {
		ArrowLeft,
		FileText,
		HelpCircle,
		ListChecks,
		BookOpen,
		BookMarked,
		ClipboardList
	} from 'lucide-svelte';
	import WorksheetCard from '$lib/components/student/worksheets/WorksheetCard.svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Tab state
	let activeTab = $state('documents');

	// Chapter color classes
	let colorClasses = $derived(getChapterColorClasses(data.chapter.color));

	// Content counts
	let documentCount = $derived(data.chapter.documents.length);
	let quizCount = $derived(data.chapter.quizQuestionsWithResults.length);
	let exerciseCount = $derived(data.chapter.exercises.length);
	let checklistCount = $derived(data.chapter.checklistItemsWithProgress.length);
	let worksheetCount = $derived(data.worksheets.length);

	// Quiz state
	let _quizCompleted = $derived(
		data.chapter.quizQuestionsWithResults.every((q) => q.bestResult !== null)
	);

	// Handle form submission result
	$effect(() => {
		if (form?.success) {
			// Refresh data after successful action
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>{data.chapter.title} | Cours | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-6">
	<!-- Breadcrumb & Back -->
	<div class="mb-6">
		<Button variant="ghost" href="/dashboard/student/cours" class="mb-2 -ml-2">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux cours
		</Button>
		<p class="text-sm text-muted-foreground">
			{data.className}
		</p>
	</div>

	<!-- Chapter Header -->
	<Card.Root class="mb-6 {colorClasses.border} border-2">
		<Card.Header class={colorClasses.bg}>
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<div class="mb-2 flex items-center gap-2">
						<BookMarked class="h-6 w-6 {colorClasses.text}" />
						<Card.Title class="text-2xl">{data.chapter.title}</Card.Title>
					</div>
					{#if data.chapter.description}
						<Card.Description class="text-base">
							{data.chapter.description}
						</Card.Description>
					{/if}
				</div>
				<ChapterProgressIndicator progress={data.chapter.progress} size="lg" />
			</div>
		</Card.Header>
	</Card.Root>

	<!-- Content Tabs -->
	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="mb-6 grid w-full grid-cols-5">
			<Tabs.Trigger value="documents" class="flex items-center gap-2">
				<FileText class="h-4 w-4" />
				<span class="hidden sm:inline">Documents</span>
				{#if documentCount > 0}
					<Badge variant="secondary" class="ml-1">{documentCount}</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="quiz" class="flex items-center gap-2">
				<HelpCircle class="h-4 w-4" />
				<span class="hidden sm:inline">Quiz</span>
				{#if quizCount > 0}
					<Badge variant="secondary" class="ml-1">{quizCount}</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="exercices" class="flex items-center gap-2">
				<BookOpen class="h-4 w-4" />
				<span class="hidden sm:inline">Exercices</span>
				{#if exerciseCount > 0}
					<Badge variant="secondary" class="ml-1">{exerciseCount}</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="fiches" class="flex items-center gap-2">
				<ClipboardList class="h-4 w-4" />
				<span class="hidden sm:inline">Fiches</span>
				{#if worksheetCount > 0}
					<Badge variant="secondary" class="ml-1">{worksheetCount}</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="checklist" class="flex items-center gap-2">
				<ListChecks class="h-4 w-4" />
				<span class="hidden sm:inline">Checklist</span>
				{#if checklistCount > 0}
					<Badge variant="secondary" class="ml-1">
						{data.chapter.progress.completedChecklistItems}/{checklistCount}
					</Badge>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Documents Tab -->
		<Tabs.Content value="documents">
			{#if documentCount === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<FileText class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
						<p class="text-muted-foreground">Aucun document pour ce chapitre</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2">
					{#each data.chapter.documents as document (document.id)}
						<DocumentCard {document} />
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Quiz Tab -->
		<Tabs.Content value="quiz">
			{#if quizCount === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<HelpCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
						<p class="text-muted-foreground">Aucune question pour ce chapitre</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<ChapterQuiz
					questions={data.chapter.quizQuestionsWithResults}
					questionTemplates={data.questionTemplates}
					progress={data.chapter.progress}
				/>
			{/if}
		</Tabs.Content>

		<!-- Exercices Tab -->
		<Tabs.Content value="exercices">
			{#if exerciseCount === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
						<p class="text-muted-foreground">Aucun exercice pour ce chapitre</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="space-y-3">
					{#each data.chapter.exercises as exercise (exercise.id)}
						{@const details = data.exerciseDetails[exercise.exerciseId]}
						{#if details}
							<Card.Root class="transition-shadow hover:shadow-md">
								<Card.Content class="flex items-center justify-between p-4">
									<div class="flex-1">
										<h3 class="font-medium">{details.title}</h3>
										{#if details.description}
											<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
												{details.description}
											</p>
										{/if}
									</div>
									<Button
										href="/dashboard/student/exercises/{exercise.exerciseId}"
										variant="outline"
										size="sm"
									>
										Ouvrir
									</Button>
								</Card.Content>
							</Card.Root>
						{/if}
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Fiches Tab -->
		<Tabs.Content value="fiches">
			{#if worksheetCount === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<ClipboardList class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
						<p class="text-muted-foreground">Aucune fiche pour cette classe</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2">
					{#each data.worksheets as worksheet (worksheet.assignment_id)}
						<WorksheetCard {worksheet} />
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Checklist Tab -->
		<Tabs.Content value="checklist">
			{#if checklistCount === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<ListChecks class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
						<p class="text-muted-foreground">Aucun élément de checklist pour ce chapitre</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<ChecklistSection
					items={data.chapter.checklistItemsWithProgress}
					progress={data.chapter.progress}
				/>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</main>
