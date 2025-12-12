<!--
	StudentSelector Component
	=========================

	A dialog-based component for selecting individual students to assign to a worksheet.
	Loads students from a class and shows which ones are already assigned.

	Features:
	- Load students from class via Supabase API
	- Show checkboxes for each student
	- Indicate already-assigned students
	- Call students API on change (POST to add, DELETE to remove)
	- Loading and error states

	Usage:
	```svelte
	<StudentSelector
		worksheetId="..."
		assignmentId="..."
		classId="..."
		onClose={() => (dialogOpen = false)}
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Users, UserPlus, Search } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface ClassStudent {
		id: string;
		firstname: string;
		lastname?: string;
	}

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
		open?: boolean;
		onClose?: () => void;
		onStudentsChanged?: () => void;
	}

	let {
		worksheetId,
		assignmentId,
		classId,
		open = $bindable(false),
		onClose,
		onStudentsChanged
	}: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	let classStudents = $state<ClassStudent[]>([]);
	let assignedStudents = $state<AssignedStudent[]>([]);
	let isLoadingClass = $state(false);
	let isLoadingAssigned = $state(false);
	let loadError = $state<string | null>(null);
	let searchQuery = $state('');
	let pendingOperations = $state<Set<string>>(new Set());

	// ============================================================================
	// DERIVED
	// ============================================================================

	let assignedStudentIds = $derived(new Set(assignedStudents.map((s) => s.student_id)));

	let filteredStudents = $derived.by(() => {
		if (!searchQuery.trim()) return classStudents;
		const query = searchQuery.toLowerCase();
		return classStudents.filter(
			(s) =>
				s.firstname.toLowerCase().includes(query) ||
				(s.lastname?.toLowerCase().includes(query) ?? false)
		);
	});

	let isLoading = $derived(isLoadingClass || isLoadingAssigned);

	// ============================================================================
	// FUNCTIONS
	// ============================================================================

	/**
	 * Fetch students from the class
	 */
	async function fetchClassStudents(): Promise<void> {
		isLoadingClass = true;
		loadError = null;

		try {
			const response = await fetch(`/api/classes/${classId}/students`);
			if (!response.ok) {
				throw new Error('Impossible de charger les eleves de la classe');
			}
			const data = await response.json();
			classStudents = data.students ?? [];
		} catch (err) {
			console.error('Error fetching class students:', err);
			loadError = err instanceof Error ? err.message : 'Erreur lors du chargement';
		} finally {
			isLoadingClass = false;
		}
	}

	/**
	 * Fetch students already assigned to the assignment
	 */
	async function fetchAssignedStudents(): Promise<void> {
		isLoadingAssigned = true;

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
			// Don't show error toast here since the main list is more important
		} finally {
			isLoadingAssigned = false;
		}
	}

	/**
	 * Add a student to the assignment
	 */
	async function addStudent(studentId: string): Promise<void> {
		pendingOperations = new Set([...pendingOperations, studentId]);

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/students`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ student_ids: [studentId] })
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Erreur lors de l'ajout de l'eleve");
			}

			// Refresh assigned students list
			await fetchAssignedStudents();
			toaster.success("Eleve ajoute a l'assignation");
			onStudentsChanged?.();
		} catch (err) {
			console.error('Error adding student:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
		} finally {
			pendingOperations = new Set([...pendingOperations].filter((id) => id !== studentId));
		}
	}

	/**
	 * Remove a student from the assignment
	 */
	async function removeStudent(studentId: string): Promise<void> {
		pendingOperations = new Set([...pendingOperations, studentId]);

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

			// Refresh assigned students list
			await fetchAssignedStudents();
			toaster.success("Eleve retire de l'assignation");
			onStudentsChanged?.();
		} catch (err) {
			console.error('Error removing student:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			pendingOperations = new Set([...pendingOperations].filter((id) => id !== studentId));
		}
	}

	/**
	 * Handle checkbox change for a student
	 */
	function handleStudentToggle(studentId: string, isCurrentlyAssigned: boolean): void {
		if (isCurrentlyAssigned) {
			removeStudent(studentId);
		} else {
			addStudent(studentId);
		}
	}

	/**
	 * Handle dialog open state change
	 */
	function handleOpenChange(isOpen: boolean): void {
		if (isOpen && classId) {
			// Load data when dialog opens
			fetchClassStudents();
			fetchAssignedStudents();
		}
		open = isOpen;
		if (!isOpen) {
			onClose?.();
		}
	}

	/**
	 * Get student display name
	 */
	function getStudentName(student: ClassStudent): string {
		return student.lastname ? `${student.firstname} ${student.lastname}` : student.firstname;
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" class="gap-2">
				<UserPlus class="h-4 w-4" />
				Gerer les eleves
			</Button>
		{/snippet}
	</Dialog.Trigger>

	<Dialog.Content class="max-h-[85vh] max-w-lg overflow-hidden">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				Selectionner les eleves
			</Dialog.Title>
			<Dialog.Description>
				Cochez les eleves a qui vous souhaitez assigner cette feuille individuellement.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 overflow-hidden">
			<!-- Search input -->
			<div class="relative">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Rechercher un eleve..."
					bind:value={searchQuery}
					class="pl-10"
				/>
			</div>

			<Separator />

			<!-- Student list -->
			<div class="max-h-[400px] min-h-[200px] overflow-y-auto">
				{#if isLoading && classStudents.length === 0}
					<div class="flex items-center justify-center py-12">
						<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				{:else if loadError}
					<div class="py-8 text-center">
						<p class="text-destructive">{loadError}</p>
						<Button variant="outline" size="sm" onclick={fetchClassStudents} class="mt-4">
							Reessayer
						</Button>
					</div>
				{:else if classStudents.length === 0}
					<div class="py-12 text-center text-muted-foreground">
						<Users class="mx-auto h-12 w-12 opacity-50" />
						<p class="mt-2">Aucun eleve dans cette classe</p>
					</div>
				{:else if filteredStudents.length === 0}
					<div class="py-8 text-center text-muted-foreground">
						<p>Aucun eleve ne correspond a la recherche</p>
					</div>
				{:else}
					<div class="space-y-1">
						{#each filteredStudents as student (student.id)}
							{@const isAssigned = assignedStudentIds.has(student.id)}
							{@const isPending = pendingOperations.has(student.id)}

							<div
								class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
							>
								<MyCheckbox
									checked={isAssigned}
									disabled={isPending}
									onCheckedChange={() => handleStudentToggle(student.id, isAssigned)}
								/>
								<span class="flex-1 text-sm">{getStudentName(student)}</span>
								{#if isPending}
									<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Summary -->
			{#if assignedStudents.length > 0}
				<div class="border-t pt-3 text-sm text-muted-foreground">
					{assignedStudents.length} eleve(s) assigne(s) individuellement
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
