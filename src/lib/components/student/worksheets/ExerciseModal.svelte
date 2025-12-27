<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ChevronLeft,
		ChevronRight,
		Info,
		Circle,
		CheckCircle,
		AlertCircle,
		X
	} from 'lucide-svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import ReportErrorButton from '$lib/components/worksheets/ReportErrorButton.svelte';
	import TutorChat from '$lib/components/tutor/TutorChat.svelte';
	import TutorFAB from './TutorFAB.svelte';
	import TutorDrawer from './TutorDrawer.svelte';
	import type { StudentExerciseView, StudentErrorReportView } from '$lib/types/worksheets';
	import type { MasteryStatus } from '$lib/types/exercise-mastery';
	import { MASTERY_LABELS } from '$lib/types/exercise-mastery';

	interface Props {
		exercises: StudentExerciseView[];
		currentIndex: number;
		open: boolean;
		masteryStatus: MasteryStatus;
		assignmentId: string;
		reportsMap: Map<string, StudentErrorReportView>;
		onOpenChange: (open: boolean) => void;
		onNavigate: (index: number) => void;
		onMasteryChange: (status: MasteryStatus) => void;
		onReportCreated: (worksheetExerciseId: string, report: StudentErrorReportView) => void;
	}

	let {
		exercises,
		currentIndex,
		open,
		masteryStatus,
		assignmentId,
		reportsMap,
		onOpenChange,
		onNavigate,
		onMasteryChange,
		onReportCreated
	}: Props = $props();

	let exercise = $derived(exercises[currentIndex] ?? null);
	let hasCorrection = $derived(exercise?.correction_visible && exercise?.correction !== null);
	let pointsLabel = $derived(
		exercise?.points !== null ? `${exercise.points} point${exercise.points !== 1 ? 's' : ''}` : null
	);
	let canGoPrev = $derived(currentIndex > 0);
	let canGoNext = $derived(currentIndex < exercises.length - 1);
	let currentReport = $derived(exercise ? (reportsMap.get(exercise.id) ?? null) : null);

	// Mobile tutor drawer state
	let tutorDrawerOpen = $state(false);

	// Tutor context derived from current exercise
	let tutorContext = $derived(
		exercise
			? {
					exerciseId: exercise.exercise_id,
					statement: exercise.statement
				}
			: undefined
	);

	function goPrev() {
		if (canGoPrev) onNavigate(currentIndex - 1);
	}

	function goNext() {
		if (canGoNext) onNavigate(currentIndex + 1);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft' && canGoPrev) {
			e.preventDefault();
			goPrev();
		} else if (e.key === 'ArrowRight' && canGoNext) {
			e.preventDefault();
			goNext();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onOpenChange(false);
		}
	}

	function closeModal() {
		onOpenChange(false);
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content
		class="fixed inset-0 !top-0 !left-0 z-50 flex h-screen !max-h-none w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col rounded-none border-none p-0"
		onkeydown={handleKeydown}
		showCloseButton={false}
	>
		<!-- DESKTOP LAYOUT: Split 60/40 -->
		<div class="hidden h-full w-full lg:flex">
			<!-- Exercise Panel (60%) -->
			<div class="flex w-[60%] flex-col border-r border-border">
				<!-- Header -->
				<div
					class="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4"
				>
					<div class="flex items-center gap-3">
						<Dialog.Title class="flex items-center gap-3 text-xl font-semibold">
							Exercice {currentIndex + 1}{#if exercise?.title}&nbsp;: {exercise.title}{/if}
							{#if pointsLabel}
								<Badge variant="outline" class="font-normal">
									{pointsLabel}
								</Badge>
							{/if}
						</Dialog.Title>
					</div>
					<div class="flex items-center gap-3">
						{#if exercise}
							<ReportErrorButton
								{assignmentId}
								exerciseId={exercise.exercise_id}
								exercisePosition={exercise.position}
								existingReport={currentReport}
								onReportCreated={(report) => onReportCreated(exercise.id, report)}
							/>
						{/if}
						<div class="text-sm text-muted-foreground">
							{currentIndex + 1} / {exercises.length}
						</div>
						<Button variant="ghost" size="icon" onclick={closeModal} aria-label="Fermer">
							<X class="h-5 w-5" />
						</Button>
					</div>
				</div>

				<!-- Exercise Content -->
				<div class="flex-1 overflow-y-auto p-6">
					{#if exercise}
						{#if exercise.custom_instructions}
							<div
								class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50"
							>
								<div class="flex items-start gap-2">
									<Info class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
									<p class="text-sm text-amber-700 dark:text-amber-300">
										{exercise.custom_instructions}
									</p>
								</div>
							</div>
						{/if}

						{#if hasCorrection}
							<Tabs.Root value="statement" class="w-full">
								<Tabs.List class="grid w-full grid-cols-2">
									<Tabs.Trigger value="statement">Enonce</Tabs.Trigger>
									<Tabs.Trigger value="correction">Correction</Tabs.Trigger>
								</Tabs.List>
								<Tabs.Content value="statement" class="mt-4">
									<div class="prose prose-sm max-w-none dark:prose-invert">
										<MarkdownRenderer content={exercise.statement} />
									</div>
								</Tabs.Content>
								<Tabs.Content value="correction" class="mt-4">
									<div
										class="prose prose-sm max-w-none text-green-800 dark:text-green-200 dark:prose-invert"
									>
										<MarkdownRenderer content={exercise.correction ?? ''} />
									</div>
								</Tabs.Content>
							</Tabs.Root>
						{:else}
							<div class="prose prose-sm max-w-none dark:prose-invert">
								<MarkdownRenderer content={exercise.statement} />
							</div>
						{/if}
					{:else}
						<div class="flex flex-1 items-center justify-center p-8">
							<p class="text-muted-foreground">Exercice non disponible</p>
						</div>
					{/if}
				</div>

				<!-- Footer with mastery and navigation -->
				<div class="flex-shrink-0 border-t border-border bg-card px-6 py-4">
					<div class="flex w-full flex-col gap-4">
						<!-- Mastery status buttons -->
						<div class="flex items-center justify-center gap-2">
							<span class="mr-2 text-sm text-muted-foreground">Statut :</span>
							<Button
								variant={masteryStatus === 'not_worked' ? 'default' : 'outline'}
								size="sm"
								onclick={() => onMasteryChange('not_worked')}
								aria-label={MASTERY_LABELS.not_worked}
								aria-pressed={masteryStatus === 'not_worked'}
							>
								<Circle class="mr-1.5 h-4 w-4" />
								{MASTERY_LABELS.not_worked}
							</Button>
							<Button
								variant={masteryStatus === 'mastered' ? 'default' : 'outline'}
								size="sm"
								onclick={() => onMasteryChange('mastered')}
								aria-label={MASTERY_LABELS.mastered}
								aria-pressed={masteryStatus === 'mastered'}
							>
								<CheckCircle class="mr-1.5 h-4 w-4" />
								{MASTERY_LABELS.mastered}
							</Button>
							<Button
								variant={masteryStatus === 'needs_review' ? 'default' : 'outline'}
								size="sm"
								onclick={() => onMasteryChange('needs_review')}
								aria-label={MASTERY_LABELS.needs_review}
								aria-pressed={masteryStatus === 'needs_review'}
							>
								<AlertCircle class="mr-1.5 h-4 w-4" />
								{MASTERY_LABELS.needs_review}
							</Button>
						</div>

						<!-- Navigation buttons -->
						<div class="flex items-center justify-between">
							<Button
								variant="outline"
								onclick={goPrev}
								disabled={!canGoPrev}
								aria-label="Exercice precedent (fleche gauche)"
							>
								<ChevronLeft class="mr-1 h-4 w-4" />
								Precedent
							</Button>
							<Button
								variant="outline"
								onclick={goNext}
								disabled={!canGoNext}
								aria-label="Exercice suivant (fleche droite)"
							>
								Suivant
								<ChevronRight class="ml-1 h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>

			<!-- Tutor Panel (40%) -->
			<div class="flex w-[40%] flex-col overflow-hidden bg-muted/30">
				{#if tutorContext}
					<TutorChat exerciseContext={tutorContext} {assignmentId} />
				{:else}
					<div class="flex h-full items-center justify-center text-muted-foreground">
						<p>Selectionnez un exercice pour commencer</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- MOBILE LAYOUT: Full exercise + FAB + Drawer -->
		<div class="flex h-full w-full flex-col lg:hidden">
			<!-- Header -->
			<div class="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
				<div class="flex items-center gap-2">
					<Dialog.Title class="flex items-center gap-2 text-lg font-semibold">
						Exercice {currentIndex + 1}{#if exercise?.title}&nbsp;: {exercise.title}{/if}
						{#if pointsLabel}
							<Badge variant="outline" class="text-xs font-normal">
								{pointsLabel}
							</Badge>
						{/if}
					</Dialog.Title>
				</div>
				<div class="flex items-center gap-2">
					{#if exercise}
						<ReportErrorButton
							{assignmentId}
							exerciseId={exercise.exercise_id}
							exercisePosition={exercise.position}
							existingReport={currentReport}
							onReportCreated={(report) => onReportCreated(exercise.id, report)}
						/>
					{/if}
					<span class="text-xs text-muted-foreground">
						{currentIndex + 1}/{exercises.length}
					</span>
					<Button variant="ghost" size="icon" onclick={closeModal} aria-label="Fermer">
						<X class="h-5 w-5" />
					</Button>
				</div>
			</div>

			<!-- Exercise Content -->
			<div class="flex-1 overflow-y-auto p-4">
				{#if exercise}
					{#if exercise.custom_instructions}
						<div
							class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50"
						>
							<div class="flex items-start gap-2">
								<Info class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
								<p class="text-sm text-amber-700 dark:text-amber-300">
									{exercise.custom_instructions}
								</p>
							</div>
						</div>
					{/if}

					{#if hasCorrection}
						<Tabs.Root value="statement" class="w-full">
							<Tabs.List class="grid w-full grid-cols-2">
								<Tabs.Trigger value="statement">Enonce</Tabs.Trigger>
								<Tabs.Trigger value="correction">Correction</Tabs.Trigger>
							</Tabs.List>
							<Tabs.Content value="statement" class="mt-4">
								<div class="prose prose-sm max-w-none dark:prose-invert">
									<MarkdownRenderer content={exercise.statement} />
								</div>
							</Tabs.Content>
							<Tabs.Content value="correction" class="mt-4">
								<div
									class="prose prose-sm max-w-none text-green-800 dark:text-green-200 dark:prose-invert"
								>
									<MarkdownRenderer content={exercise.correction ?? ''} />
								</div>
							</Tabs.Content>
						</Tabs.Root>
					{:else}
						<div class="prose prose-sm max-w-none dark:prose-invert">
							<MarkdownRenderer content={exercise.statement} />
						</div>
					{/if}
				{:else}
					<div class="flex flex-1 items-center justify-center p-8">
						<p class="text-muted-foreground">Exercice non disponible</p>
					</div>
				{/if}
			</div>

			<!-- Footer with mastery and navigation -->
			<div class="flex-shrink-0 border-t border-border bg-card px-4 py-3">
				<div class="flex w-full flex-col gap-3">
					<!-- Mastery status buttons -->
					<div class="flex flex-wrap items-center justify-center gap-2">
						<Button
							variant={masteryStatus === 'not_worked' ? 'default' : 'outline'}
							size="sm"
							onclick={() => onMasteryChange('not_worked')}
							aria-pressed={masteryStatus === 'not_worked'}
						>
							<Circle class="mr-1.5 h-4 w-4" />
							<span class="text-xs">{MASTERY_LABELS.not_worked}</span>
						</Button>
						<Button
							variant={masteryStatus === 'mastered' ? 'default' : 'outline'}
							size="sm"
							onclick={() => onMasteryChange('mastered')}
							aria-pressed={masteryStatus === 'mastered'}
						>
							<CheckCircle class="mr-1.5 h-4 w-4" />
							<span class="text-xs">{MASTERY_LABELS.mastered}</span>
						</Button>
						<Button
							variant={masteryStatus === 'needs_review' ? 'default' : 'outline'}
							size="sm"
							onclick={() => onMasteryChange('needs_review')}
							aria-pressed={masteryStatus === 'needs_review'}
						>
							<AlertCircle class="mr-1.5 h-4 w-4" />
							<span class="text-xs">{MASTERY_LABELS.needs_review}</span>
						</Button>
					</div>

					<!-- Navigation buttons -->
					<div class="flex items-center justify-between">
						<Button variant="outline" size="sm" onclick={goPrev} disabled={!canGoPrev}>
							<ChevronLeft class="mr-1 h-4 w-4" />
							Prec.
						</Button>
						<Button variant="outline" size="sm" onclick={goNext} disabled={!canGoNext}>
							Suiv.
							<ChevronRight class="ml-1 h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<!-- Tutor FAB -->
			<TutorFAB onclick={() => (tutorDrawerOpen = true)} />

			<!-- Tutor Drawer -->
			<TutorDrawer open={tutorDrawerOpen} onClose={() => (tutorDrawerOpen = false)}>
				{#if tutorContext}
					<TutorChat exerciseContext={tutorContext} {assignmentId} />
				{:else}
					<div class="flex h-full items-center justify-center text-muted-foreground">
						<p>Selectionnez un exercice pour commencer</p>
					</div>
				{/if}
			</TutorDrawer>
		</div>
	</Dialog.Content>
</Dialog.Root>
