<script lang="ts">
	import { browser } from '$app/environment';
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
		X,
		Loader2
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
		isSavingMastery?: boolean;
		assignmentId: string;
		reportsMap: Map<string, StudentErrorReportView[]>;
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
		isSavingMastery = false,
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
	let currentReports = $derived(exercise ? (reportsMap.get(exercise.id) ?? []) : []);

	// Mobile tutor drawer state
	let tutorDrawerOpen = $state(false);

	// Viewport detection to mount only ONE TutorChat instance at a time
	// This prevents race conditions between desktop and mobile instances
	let isDesktop = $state(browser ? window.matchMedia('(min-width: 1024px)').matches : true);

	$effect(() => {
		if (!browser) return;

		const mediaQuery = window.matchMedia('(min-width: 1024px)');
		const handler = (e: MediaQueryListEvent) => {
			isDesktop = e.matches;
			// Close drawer when switching to desktop
			if (e.matches) {
				tutorDrawerOpen = false;
			}
		};

		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	});

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
								existingReports={currentReports}
								onReportCreated={(report) => onReportCreated(exercise.id, report)}
							/>
						{/if}
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

				<!-- Footer with mastery and navigation - compact single row -->
				<div class="flex-shrink-0 border-t border-border bg-card px-6 py-2">
					<div class="flex items-center justify-between gap-2">
						<!-- Navigation prev -->
						<Button
							variant="outline"
							size="sm"
							onclick={goPrev}
							disabled={!canGoPrev}
							aria-label="Exercice precedent (fleche gauche)"
						>
							<ChevronLeft class="h-4 w-4" />
						</Button>

						<!-- Mastery status buttons -->
						<div class="flex items-center gap-1">
							{#if isSavingMastery}
								<Loader2 class="mr-1 h-4 w-4 animate-spin text-muted-foreground" />
							{/if}
							<Button
								variant={masteryStatus === 'not_worked' ? 'default' : 'outline'}
								size="sm"
								class="h-8 gap-1 px-2 text-xs"
								onclick={() => onMasteryChange('not_worked')}
								disabled={isSavingMastery}
								title={MASTERY_LABELS.not_worked}
								aria-pressed={masteryStatus === 'not_worked'}
							>
								<Circle class="h-3.5 w-3.5" />
								<span class="hidden sm:inline">Non fait</span>
							</Button>
							<Button
								variant={masteryStatus === 'mastered' ? 'default' : 'outline'}
								size="sm"
								class="h-8 gap-1 px-2 text-xs"
								onclick={() => onMasteryChange('mastered')}
								disabled={isSavingMastery}
								title={MASTERY_LABELS.mastered}
								aria-pressed={masteryStatus === 'mastered'}
							>
								<CheckCircle class="h-3.5 w-3.5" />
								<span class="hidden sm:inline">OK</span>
							</Button>
							<Button
								variant={masteryStatus === 'needs_review' ? 'default' : 'outline'}
								size="sm"
								class="h-8 gap-1 px-2 text-xs {masteryStatus === 'needs_review'
									? 'bg-amber-500 hover:bg-amber-600'
									: ''}"
								onclick={() => onMasteryChange('needs_review')}
								disabled={isSavingMastery}
								title={MASTERY_LABELS.needs_review}
								aria-pressed={masteryStatus === 'needs_review'}
							>
								<AlertCircle class="h-3.5 w-3.5" />
								<span class="hidden sm:inline">A revoir</span>
							</Button>
						</div>

						<!-- Pagination + Navigation next -->
						<div class="flex items-center gap-2">
							<span class="text-sm text-muted-foreground">
								{currentIndex + 1}/{exercises.length}
							</span>
							<Button
								variant="outline"
								size="sm"
								onclick={goNext}
								disabled={!canGoNext}
								aria-label="Exercice suivant (fleche droite)"
							>
								<ChevronRight class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>

			<!-- Tutor Panel (40%) - Only mount TutorChat on desktop to avoid dual instances -->
			<div class="flex w-[40%] flex-col overflow-hidden bg-muted/30">
				{#if isDesktop && tutorContext}
					<!-- Key forces remount when exercise changes, ensuring fresh state -->
					{#key tutorContext.exerciseId}
						<TutorChat exerciseContext={tutorContext} {assignmentId} />
					{/key}
				{:else if isDesktop}
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
							existingReports={currentReports}
							onReportCreated={(report) => onReportCreated(exercise.id, report)}
						/>
					{/if}
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

			<!-- Footer with mastery and navigation - compact single row -->
			<div class="flex-shrink-0 border-t border-border bg-card px-3 py-2">
				<div class="flex items-center justify-between gap-1">
					<!-- Navigation prev -->
					<Button
						variant="outline"
						size="sm"
						class="h-8 px-2"
						onclick={goPrev}
						disabled={!canGoPrev}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>

					<!-- Mastery status buttons -->
					<div class="flex items-center gap-1">
						{#if isSavingMastery}
							<Loader2 class="h-3 w-3 animate-spin text-muted-foreground" />
						{/if}
						<Button
							variant={masteryStatus === 'not_worked' ? 'default' : 'outline'}
							size="sm"
							class="h-8 px-2"
							onclick={() => onMasteryChange('not_worked')}
							disabled={isSavingMastery}
							title={MASTERY_LABELS.not_worked}
							aria-pressed={masteryStatus === 'not_worked'}
						>
							<Circle class="h-4 w-4" />
						</Button>
						<Button
							variant={masteryStatus === 'mastered' ? 'default' : 'outline'}
							size="sm"
							class="h-8 px-2"
							onclick={() => onMasteryChange('mastered')}
							disabled={isSavingMastery}
							title={MASTERY_LABELS.mastered}
							aria-pressed={masteryStatus === 'mastered'}
						>
							<CheckCircle class="h-4 w-4" />
						</Button>
						<Button
							variant={masteryStatus === 'needs_review' ? 'default' : 'outline'}
							size="sm"
							class="h-8 px-2 {masteryStatus === 'needs_review'
								? 'bg-amber-500 hover:bg-amber-600'
								: ''}"
							onclick={() => onMasteryChange('needs_review')}
							disabled={isSavingMastery}
							title={MASTERY_LABELS.needs_review}
							aria-pressed={masteryStatus === 'needs_review'}
						>
							<AlertCircle class="h-4 w-4" />
						</Button>
					</div>

					<!-- Pagination + Navigation next -->
					<div class="flex items-center gap-1">
						<span class="text-xs text-muted-foreground">
							{currentIndex + 1}/{exercises.length}
						</span>
						<Button
							variant="outline"
							size="sm"
							class="h-8 px-2"
							onclick={goNext}
							disabled={!canGoNext}
						>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<!-- Tutor FAB - Only show on mobile -->
			{#if !isDesktop}
				<TutorFAB onclick={() => (tutorDrawerOpen = true)} />

				<!-- Tutor Drawer - Only mount TutorChat on mobile to avoid dual instances -->
				<TutorDrawer open={tutorDrawerOpen} onClose={() => (tutorDrawerOpen = false)}>
					{#if tutorContext}
						<!-- Key forces remount when exercise changes, ensuring fresh state -->
						{#key tutorContext.exerciseId}
							<TutorChat exerciseContext={tutorContext} {assignmentId} />
						{/key}
					{:else}
						<div class="flex h-full items-center justify-center text-muted-foreground">
							<p>Selectionnez un exercice pour commencer</p>
						</div>
					{/if}
				</TutorDrawer>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
