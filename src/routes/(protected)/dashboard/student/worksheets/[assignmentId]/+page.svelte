<script lang="ts">
	import WorksheetHeader from '$lib/components/student/worksheets/WorksheetHeader.svelte';
	import ExerciseListItem from '$lib/components/student/worksheets/ExerciseListItem.svelte';
	import ExerciseModal from '$lib/components/student/worksheets/ExerciseModal.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';
	import type { MasteryStatus, ExerciseMasteryListResponse } from '$lib/types/exercise-mastery';
	import type { StudentErrorReportView } from '$lib/types/worksheets';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let worksheet = $derived(data.worksheet);
	let exercises = $derived(worksheet.exercises ?? []);
	let exerciseCount = $derived(exercises.length);
	let assignmentId = $derived(worksheet.assignment_id);

	// Modal state
	let modalOpen = $state(false);
	let currentExerciseIndex = $state(0);

	// Mastery tracking state
	let masteryMap = $state(new Map<string, MasteryStatus>());

	// Error reports state
	let reportsMap = $state(new Map<string, StudentErrorReportView>());

	// Current exercise mastery status for the modal
	let currentExercise = $derived(exercises[currentExerciseIndex]);
	let currentExerciseMasteryStatus = $derived<MasteryStatus>(
		currentExercise ? (masteryMap.get(currentExercise.exercise_id) ?? 'not_worked') : 'not_worked'
	);

	// Fetch mastery statuses and error reports on mount
	$effect(() => {
		fetchMasteryStatuses();
		fetchErrorReports();
	});

	async function fetchMasteryStatuses() {
		try {
			const response = await fetch('/api/student/exercise-mastery');
			if (!response.ok) {
				console.error('Failed to fetch mastery statuses');
				return;
			}
			const data: ExerciseMasteryListResponse = await response.json();

			// Populate the mastery map
			const newMap = new Map<string, MasteryStatus>();
			for (const item of data.mastery) {
				newMap.set(item.exercise_id, item.status);
			}
			masteryMap = newMap;
		} catch (error) {
			console.error('Error fetching mastery statuses:', error);
		}
	}

	async function fetchErrorReports() {
		try {
			const response = await fetch(`/api/student/worksheets/${assignmentId}/reports`);
			if (!response.ok) {
				console.error('Failed to fetch error reports');
				return;
			}
			const data: { reports: StudentErrorReportView[] } = await response.json();

			// Populate the reports map (keyed by worksheet_exercise_id)
			const newMap = new Map<string, StudentErrorReportView>();
			for (const report of data.reports) {
				newMap.set(report.worksheet_exercise_id, report);
			}
			reportsMap = newMap;
		} catch (error) {
			console.error('Error fetching error reports:', error);
		}
	}

	async function updateMastery(exerciseId: string, status: MasteryStatus) {
		// Optimistic update
		const previousStatus = masteryMap.get(exerciseId);
		masteryMap.set(exerciseId, status);
		// Force reactivity by reassigning
		masteryMap = new Map(masteryMap);

		try {
			const response = await fetch(`/api/student/exercise-mastery/${exerciseId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});

			if (!response.ok) {
				// Revert on failure
				if (previousStatus !== undefined) {
					masteryMap.set(exerciseId, previousStatus);
				} else {
					masteryMap.delete(exerciseId);
				}
				masteryMap = new Map(masteryMap);
				toaster.error('Erreur lors de la mise a jour du statut');
			}
		} catch (error) {
			// Revert on error
			if (previousStatus !== undefined) {
				masteryMap.set(exerciseId, previousStatus);
			} else {
				masteryMap.delete(exerciseId);
			}
			masteryMap = new Map(masteryMap);
			console.error('Error updating mastery status:', error);
			toaster.error('Erreur lors de la mise a jour du statut');
		}
	}

	function handleMasteryChange(status: MasteryStatus) {
		const exercise = exercises[currentExerciseIndex];
		if (exercise) {
			updateMastery(exercise.exercise_id, status);
		}
	}

	function openExercise(index: number) {
		currentExerciseIndex = index;
		modalOpen = true;
	}

	function handleNavigate(index: number) {
		currentExerciseIndex = index;
	}

	function handleOpenChange(open: boolean) {
		modalOpen = open;
	}

	function handleReportCreated(worksheetExerciseId: string, report: StudentErrorReportView) {
		// Add the new report to the map
		reportsMap.set(worksheetExerciseId, report);
		// Force reactivity
		reportsMap = new Map(reportsMap);
	}
</script>

<svelte:head>
	<title>{worksheet.title} | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Breadcrumb -->
	<nav class="mb-6 text-sm text-muted-foreground" aria-label="Fil d'Ariane">
		<ol class="flex items-center gap-2">
			<li>
				<a href="/dashboard/student/worksheets" class="hover:text-foreground hover:underline">
					Mes Feuilles de Travail
				</a>
			</li>
			<li aria-hidden="true">/</li>
			<li class="truncate font-medium text-foreground" aria-current="page">
				{worksheet.title}
			</li>
		</ol>
	</nav>

	<!-- Header -->
	<WorksheetHeader {worksheet} />

	<!-- Exercises Section -->
	<section class="mt-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold">
				Exercices ({exerciseCount})
			</h2>
		</div>

		<Separator class="mb-6" />

		{#if exercises.length === 0}
			<!-- Empty State -->
			<Card.Root class="border-dashed">
				<Card.Content class="flex min-h-48 items-center justify-center p-6">
					<p class="text-center text-muted-foreground">
						Aucun exercice disponible pour cette fiche.
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<!-- Exercise List -->
			<div class="space-y-3">
				{#each exercises as exercise, i (exercise.id)}
					<ExerciseListItem
						{exercise}
						index={i + 1}
						masteryStatus={masteryMap.get(exercise.exercise_id) ?? 'not_worked'}
						{assignmentId}
						existingReport={reportsMap.get(exercise.id) ?? null}
						onclick={() => openExercise(i)}
						onReportCreated={(report) => handleReportCreated(exercise.id, report)}
					/>
				{/each}
			</div>
		{/if}
	</section>
</div>

<!-- Exercise Modal -->
<ExerciseModal
	{exercises}
	currentIndex={currentExerciseIndex}
	open={modalOpen}
	masteryStatus={currentExerciseMasteryStatus}
	{assignmentId}
	{reportsMap}
	onOpenChange={handleOpenChange}
	onNavigate={handleNavigate}
	onMasteryChange={handleMasteryChange}
	onReportCreated={handleReportCreated}
/>
