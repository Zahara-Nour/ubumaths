<!--
	MultiClassStudentSelector Component
	====================================

	A component for selecting individual students from multiple classes.
	Designed for multi-class worksheet assignments.

	Features:
	- Load students from multiple classes via API
	- Group students by class with collapsible sections
	- Search filter by name
	- "Select all" / "Deselect all" per class
	- Support for students from classes not in the current selection

	Usage:
	```svelte
	<MultiClassStudentSelector
		classIds={['uuid1', 'uuid2']}
		bind:selectedStudentIds={studentIds}
		allTeacherClasses={classes}
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		ChevronDown,
		ChevronRight,
		Loader2,
		Search,
		Users,
		UserPlus,
		CheckSquare,
		Square
	} from 'lucide-svelte';
	import { untrack } from 'svelte';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface Student {
		id: string;
		firstname: string;
		lastname?: string;
	}

	interface ClassWithStudents {
		id: string;
		name: string;
		students: Student[];
		isOpen: boolean;
	}

	interface ClassOption {
		id: string;
		name: string;
	}

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		classIds: string[];
		selectedStudentIds: string[];
		allTeacherClasses: ClassOption[];
		disabled?: boolean;
	}

	let {
		classIds,
		selectedStudentIds = $bindable([]),
		allTeacherClasses,
		disabled = false
	}: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	let classesWithStudents = $state<ClassWithStudents[]>([]);
	let otherClassesWithStudents = $state<ClassWithStudents[]>([]);
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);
	let searchQuery = $state('');

	// ============================================================================
	// DERIVED
	// ============================================================================

	// Set for efficient lookup
	let selectedSet = $derived(new Set(selectedStudentIds));

	// Filter students by search query
	let filteredClasses = $derived.by(() => {
		if (!searchQuery.trim()) return classesWithStudents;

		const query = searchQuery.toLowerCase();
		return classesWithStudents
			.map((cls) => ({
				...cls,
				students: cls.students.filter(
					(s) =>
						s.firstname.toLowerCase().includes(query) ||
						(s.lastname?.toLowerCase().includes(query) ?? false)
				)
			}))
			.filter((cls) => cls.students.length > 0);
	});

	let filteredOtherClasses = $derived.by(() => {
		if (!searchQuery.trim()) return otherClassesWithStudents;

		const query = searchQuery.toLowerCase();
		return otherClassesWithStudents
			.map((cls) => ({
				...cls,
				students: cls.students.filter(
					(s) =>
						s.firstname.toLowerCase().includes(query) ||
						(s.lastname?.toLowerCase().includes(query) ?? false)
				)
			}))
			.filter((cls) => cls.students.length > 0);
	});

	// Count selected students per class
	function getSelectedCountForClass(cls: ClassWithStudents): number {
		return cls.students.filter((s) => selectedSet.has(s.id)).length;
	}

	// Check if all students in a class are selected
	function areAllClassStudentsSelected(cls: ClassWithStudents): boolean {
		return cls.students.length > 0 && cls.students.every((s) => selectedSet.has(s.id));
	}

	// Total selected count
	let totalSelectedCount = $derived(selectedStudentIds.length);

	// ============================================================================
	// EFFECTS
	// ============================================================================

	// Reload students when classIds changes
	$effect(() => {
		// Track classIds for reactivity (read it to establish dependency)
		const currentClassIds = classIds;
		// Use untrack to avoid tracking state changes inside loadStudents
		if (currentClassIds) {
			untrack(() => {
				loadStudents();
			});
		}
	});

	// ============================================================================
	// FUNCTIONS
	// ============================================================================

	/**
	 * Load students from all selected classes
	 */
	async function loadStudents(): Promise<void> {
		if (classIds.length === 0) {
			classesWithStudents = [];
			otherClassesWithStudents = [];
			return;
		}

		isLoading = true;
		loadError = null;

		try {
			const selectedClassIdSet = new Set(classIds);
			const allClasses: ClassWithStudents[] = [];
			const otherClasses: ClassWithStudents[] = [];

			// Fetch students for each class
			for (const cls of allTeacherClasses) {
				try {
					const response = await fetch(`/api/classes/${cls.id}/students`);
					if (!response.ok) {
						console.error(`Failed to fetch students for class ${cls.id}`);
						continue;
					}

					const data = await response.json();
					const students: Student[] = (data.students || []).map(
						(s: { id: string; firstname: string; lastname?: string }) => ({
							id: s.id,
							firstname: s.firstname,
							lastname: s.lastname
						})
					);

					const classWithStudents: ClassWithStudents = {
						id: cls.id,
						name: cls.name,
						students,
						isOpen: selectedClassIdSet.has(cls.id)
					};

					if (selectedClassIdSet.has(cls.id)) {
						allClasses.push(classWithStudents);
					} else if (students.length > 0) {
						otherClasses.push(classWithStudents);
					}
				} catch (err) {
					console.error(`Error fetching students for class ${cls.id}:`, err);
				}
			}

			classesWithStudents = allClasses;
			otherClassesWithStudents = otherClasses;
		} catch (err) {
			console.error('Error loading students:', err);
			loadError = err instanceof Error ? err.message : 'Erreur lors du chargement';
			toaster.error('Erreur lors du chargement des eleves');
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Toggle student selection
	 */
	function toggleStudent(studentId: string): void {
		if (disabled) return;

		if (selectedSet.has(studentId)) {
			selectedStudentIds = selectedStudentIds.filter((id) => id !== studentId);
		} else {
			selectedStudentIds = [...selectedStudentIds, studentId];
		}
	}

	/**
	 * Select all students in a class
	 */
	function selectAllInClass(cls: ClassWithStudents): void {
		if (disabled) return;

		const classStudentIds = cls.students.map((s) => s.id);
		const existingIds = selectedStudentIds;
		const newIds = classStudentIds.filter((id) => !existingIds.includes(id));
		selectedStudentIds = [...existingIds, ...newIds];
	}

	/**
	 * Deselect all students in a class
	 */
	function deselectAllInClass(cls: ClassWithStudents): void {
		if (disabled) return;

		const classStudentIds = new Set(cls.students.map((s) => s.id));
		selectedStudentIds = selectedStudentIds.filter((id) => !classStudentIds.has(id));
	}

	/**
	 * Toggle class section open/close
	 */
	function toggleClassSection(classId: string): void {
		classesWithStudents = classesWithStudents.map((cls) =>
			cls.id === classId ? { ...cls, isOpen: !cls.isOpen } : cls
		);
	}

	/**
	 * Toggle other class section open/close
	 */
	function toggleOtherClassSection(classId: string): void {
		otherClassesWithStudents = otherClassesWithStudents.map((cls) =>
			cls.id === classId ? { ...cls, isOpen: !cls.isOpen } : cls
		);
	}

	/**
	 * Get student display name
	 */
	function getStudentName(student: Student): string {
		return student.lastname ? `${student.firstname} ${student.lastname}` : student.firstname;
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<UserPlus class="h-4 w-4" />
			<span>Eleves individuels (optionnel)</span>
		</div>
		{#if totalSelectedCount > 0}
			<span class="text-sm font-medium text-primary">
				{totalSelectedCount} eleve(s) selectionne(s)
			</span>
		{/if}
	</div>

	<!-- Search -->
	<div class="relative">
		<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Rechercher un eleve..."
			bind:value={searchQuery}
			class="pl-10"
			{disabled}
		/>
	</div>

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			<span class="ml-2 text-sm text-muted-foreground">Chargement des eleves...</span>
		</div>
	{:else if loadError}
		<div class="py-4 text-center">
			<p class="text-sm text-destructive">{loadError}</p>
			<Button variant="outline" size="sm" onclick={loadStudents} class="mt-2">Reessayer</Button>
		</div>
	{:else if classIds.length === 0}
		<div class="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
			<Users class="mx-auto h-8 w-8 opacity-50" />
			<p class="mt-2 text-sm">Selectionnez d'abord au moins une classe pour voir les eleves.</p>
		</div>
	{:else if filteredClasses.length === 0 && filteredOtherClasses.length === 0}
		<div class="py-4 text-center text-muted-foreground">
			<p class="text-sm">
				{searchQuery ? 'Aucun eleve ne correspond a la recherche.' : 'Aucun eleve disponible.'}
			</p>
		</div>
	{:else}
		<!-- Selected classes students -->
		<div class="max-h-[400px] space-y-2 overflow-y-auto rounded-lg border p-2">
			{#if filteredClasses.length > 0}
				<p class="px-2 text-xs font-medium text-muted-foreground uppercase">
					Classes selectionnees
				</p>

				{#each filteredClasses as cls (cls.id)}
					{@const selectedCount = getSelectedCountForClass(cls)}
					{@const allSelected = areAllClassStudentsSelected(cls)}

					<Collapsible.Root open={cls.isOpen} onOpenChange={() => toggleClassSection(cls.id)}>
						<div
							class="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted"
						>
							<Collapsible.Trigger class="flex flex-1 items-center gap-2" {disabled}>
								{#if cls.isOpen}
									<ChevronDown class="h-4 w-4" />
								{:else}
									<ChevronRight class="h-4 w-4" />
								{/if}
								<span class="font-medium">{cls.name}</span>
								<span class="text-xs text-muted-foreground">
									({selectedCount}/{cls.students.length})
								</span>
							</Collapsible.Trigger>

							<div class="flex gap-1">
								{#if allSelected}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => deselectAllInClass(cls)}
										{disabled}
										title="Tout deselectionner"
									>
										<Square class="h-4 w-4" />
									</Button>
								{:else}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => selectAllInClass(cls)}
										{disabled}
										title="Tout selectionner"
									>
										<CheckSquare class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>

						<Collapsible.Content>
							<div class="mt-1 space-y-1 pl-6">
								{#each cls.students as student (student.id)}
									{@const isSelected = selectedSet.has(student.id)}
									<div
										class="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-muted/30"
									>
										<MyCheckbox
											checked={isSelected}
											{disabled}
											onCheckedChange={() => toggleStudent(student.id)}
										/>
										<span class="text-sm">{getStudentName(student)}</span>
									</div>
								{/each}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			{/if}

			<!-- Other classes (not in selection) -->
			{#if filteredOtherClasses.length > 0}
				<Separator class="my-3" />
				<p class="px-2 text-xs font-medium text-muted-foreground uppercase">Autres classes</p>

				{#each filteredOtherClasses as cls (cls.id)}
					{@const selectedCount = getSelectedCountForClass(cls)}
					{@const allSelected = areAllClassStudentsSelected(cls)}

					<Collapsible.Root open={cls.isOpen} onOpenChange={() => toggleOtherClassSection(cls.id)}>
						<div
							class="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 hover:bg-muted/50"
						>
							<Collapsible.Trigger class="flex flex-1 items-center gap-2" {disabled}>
								{#if cls.isOpen}
									<ChevronDown class="h-4 w-4" />
								{:else}
									<ChevronRight class="h-4 w-4" />
								{/if}
								<span class="font-medium text-muted-foreground">{cls.name}</span>
								{#if selectedCount > 0}
									<span class="text-xs text-primary">({selectedCount} selectionne(s))</span>
								{:else}
									<span class="text-xs text-muted-foreground">({cls.students.length} eleves)</span>
								{/if}
							</Collapsible.Trigger>

							<div class="flex gap-1">
								{#if allSelected}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => deselectAllInClass(cls)}
										{disabled}
										title="Tout deselectionner"
									>
										<Square class="h-4 w-4" />
									</Button>
								{:else}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => selectAllInClass(cls)}
										{disabled}
										title="Tout selectionner"
									>
										<CheckSquare class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>

						<Collapsible.Content>
							<div class="mt-1 space-y-1 pl-6">
								{#each cls.students as student (student.id)}
									{@const isSelected = selectedSet.has(student.id)}
									<div
										class="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-muted/30"
									>
										<MyCheckbox
											checked={isSelected}
											{disabled}
											onCheckedChange={() => toggleStudent(student.id)}
										/>
										<span class="text-sm">{getStudentName(student)}</span>
									</div>
								{/each}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Help text -->
	<p class="text-xs text-muted-foreground">
		Les eleves selectionnes individuellement recevront l'assignation en plus des classes
		selectionnees.
	</p>
</div>
