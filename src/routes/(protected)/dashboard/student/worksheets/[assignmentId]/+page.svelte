<script lang="ts">
	import WorksheetHeader from '$lib/components/student/worksheets/WorksheetHeader.svelte';
	import ExerciseListItem from '$lib/components/student/worksheets/ExerciseListItem.svelte';
	import ExerciseModal from '$lib/components/student/worksheets/ExerciseModal.svelte';
	import StudentReportsPanel from '$lib/components/worksheets/student/StudentReportsPanel.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { FileText, AlertTriangle } from 'lucide-svelte';
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
	let savingMasteryForExercise = $state<string | null>(null);

	// Error reports state
	let reportsMap = $state(new Map<string, StudentErrorReportView>());

	// Current exercise mastery status for the modal
	let currentExercise = $derived(exercises[currentExerciseIndex]);
	let currentExerciseMasteryStatus = $derived<MasteryStatus>(
		currentExercise ? (masteryMap.get(currentExercise.exercise_id) ?? 'not_worked') : 'not_worked'
	);
	let isSavingMastery = $derived(
		currentExercise ? savingMasteryForExercise === currentExercise.exercise_id : false
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
		// Set loading state
		savingMasteryForExercise = exerciseId;

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
				toaster.error('Erreur lors de la mise à jour du statut');
			} else {
				toaster.success('Statut mis à jour');
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
			toaster.error('Erreur lors de la mise à jour du statut');
		} finally {
			savingMasteryForExercise = null;
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

	<!-- Header -->
	<WorksheetHeader {worksheet} />

	<!-- Content Tabs -->
	<section class="mt-8">
		<Tabs.Root value="exercises" class="space-y-6">
			<Tabs.List>
				<Tabs.Trigger value="exercises" class="gap-2">
					<FileText class="h-4 w-4" />
					Exercices ({exerciseCount})
				</Tabs.Trigger>
				<Tabs.Trigger value="reports" class="gap-2">
					<AlertTriangle class="h-4 w-4" />
					Signalements
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Exercises Tab -->
			<Tabs.Content value="exercises" class="space-y-6">
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
			</Tabs.Content>

			<!-- Reports Tab -->
			<Tabs.Content value="reports">
				<StudentReportsPanel {assignmentId} />
			</Tabs.Content>
		</Tabs.Root>
	</section>
</div>

<!-- Exercise Modal -->
<ExerciseModal
	{exercises}
	currentIndex={currentExerciseIndex}
	open={modalOpen}
	masteryStatus={currentExerciseMasteryStatus}
	{isSavingMastery}
	{assignmentId}
	{reportsMap}
	onOpenChange={handleOpenChange}
	onNavigate={handleNavigate}
	onMasteryChange={handleMasteryChange}
	onReportCreated={handleReportCreated}
/>
