<!--
	AssignmentStudentsPanel Component
	==================================

	A panel component for managing individually assigned students on an existing assignment.
	Shows the list of assigned students with the ability to add/remove.

	Features:
	- List individually assigned students
	- "Add students" button opens StudentSelector dialog
	- Remove button for each student
	- Uses the students API endpoints
	- Loading and error states

	Usage:
	```svelte
	<AssignmentStudentsPanel
		worksheetId="..."
		assignmentId="..."
		classId="..."
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import StudentSelector from '$lib/components/worksheets/StudentSelector.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Users, UserMinus, RefreshCw } from 'lucide-svelte';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface AssignedStudent {
		id: string;
		student_id: string;
		first_name: string | null;
		last_name: string | null;
		created_at: string;
	}

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		worksheetId: string;
		assignmentId: string;
		classId: string;
	}

	let { worksheetId, assignmentId, classId }: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	let assignedStudents = $state<AssignedStudent[]>([]);
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);
	let removingStudentId = $state<string | null>(null);
	let selectorOpen = $state(false);

	// ============================================================================
	// FUNCTIONS
	// ============================================================================

	/**
	 * Fetch students assigned to this assignment
	 */
	async function fetchAssignedStudents(): Promise<void> {
		isLoading = true;
		loadError = null;

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/students`
			);
			if (!response.ok) {
				throw new Error('Impossible de charger les eleves assignes');
			}
			const data = await response.json();
			assignedStudents = data.students ?? [];
		} catch (err) {
			console.error('Error fetching assigned students:', err);
			loadError = err instanceof Error ? err.message : 'Erreur lors du chargement';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Remove a student from the assignment
	 */
	async function removeStudent(studentId: string): Promise<void> {
		removingStudentId = studentId;

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/students`,
				{
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ student_id: studentId })
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Erreur lors de la suppression de l'eleve");
			}

			// Remove from local state
			assignedStudents = assignedStudents.filter((s) => s.student_id !== studentId);
			toaster.success('Eleve retire du devoir');
		} catch (err) {
			console.error('Error removing student:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			removingStudentId = null;
		}
	}

	/**
	 * Get student display name
	 */
	function getStudentName(student: AssignedStudent): string {
		const first = student.first_name ?? '';
		const last = student.last_name ?? '';
		return last ? `${first} ${last}` : first || 'Eleve inconnu';
	}

	/**
	 * Handle students changed from selector
	 */
	function handleStudentsChanged(): void {
		fetchAssignedStudents();
	}

	// Load students on mount - this is intentional side effect for data fetching
	$effect(() => {
		// Read dependencies to track them
		const aid = assignmentId;
		const wid = worksheetId;
		if (aid && wid) {
			fetchAssignedStudents();
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Card.Title class="flex items-center gap-2">
					<Users class="h-5 w-5" />
					Eleves assignes individuellement
				</Card.Title>
				{#if assignedStudents.length > 0}
					<Badge variant="secondary">{assignedStudents.length}</Badge>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon" onclick={fetchAssignedStudents} disabled={isLoading}>
					<RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
					<span class="sr-only">Actualiser</span>
				</Button>
				<StudentSelector
					{worksheetId}
					{assignmentId}
					{classId}
					bind:open={selectorOpen}
					onStudentsChanged={handleStudentsChanged}
				/>
			</div>
		</div>
		<Card.Description>
			Eleves assignes a ce devoir en plus de ceux de la classe. Ces assignations permettent
			d'ajouter des eleves specifiques qui ne sont pas dans la classe assignee.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if isLoading && assignedStudents.length === 0}
			<div class="flex items-center justify-center py-8">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else if loadError}
			<div class="py-6 text-center">
				<p class="text-sm text-destructive">{loadError}</p>
				<Button variant="outline" size="sm" onclick={fetchAssignedStudents} class="mt-3">
					Reessayer
				</Button>
			</div>
		{:else if assignedStudents.length === 0}
			<div class="py-8 text-center text-muted-foreground">
				<Users class="mx-auto h-10 w-10 opacity-50" />
				<p class="mt-2 text-sm">Aucun eleve assigne individuellement</p>
				<p class="mt-1 text-xs">
					Utilisez le bouton "Gerer les eleves" pour ajouter des eleves specifiques.
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each assignedStudents as student (student.id)}
					{@const isRemoving = removingStudentId === student.student_id}

					<div
						class="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
					>
						<div class="flex flex-col">
							<span class="font-medium">{getStudentName(student)}</span>
							<span class="text-xs text-muted-foreground">
								Ajoute le {new Date(student.created_at).toLocaleDateString('fr-FR', {
									day: 'numeric',
									month: 'short',
									year: 'numeric'
								})}
							</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => removeStudent(student.student_id)}
							disabled={isRemoving}
							class="text-destructive hover:bg-destructive/10 hover:text-destructive"
						>
							{#if isRemoving}
								<Loader2 class="mr-1 h-4 w-4 animate-spin" />
							{:else}
								<UserMinus class="mr-1 h-4 w-4" />
							{/if}
							Retirer
						</Button>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
