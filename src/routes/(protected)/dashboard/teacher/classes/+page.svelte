<!--
	Teacher Classes Page
	====================

	Main page for managing teacher's classes and their schedules.
	Displays all classes in tabbed interface with statistics and weekly schedule grids.

	FEATURES:
	- Tabbed navigation (one tab per class)
	- Class information header (name, description, join code)
	- Stats card showing student count
	- Interactive weekly schedule grid (Sunday-Thursday, 7:00-18:00)
	- Modal for creating/editing/deleting schedule entries
	- Toast notifications for user feedback
	- Auto-refresh after CRUD operations

	NAVIGATION:
	- Accessible via sidebar "Classes" link
	- Or from Teacher Dashboard "Voir Mes Classes" button
	- Route: /dashboard/teacher/classes

	DATA FLOW:
	1. Server loads classes with student counts and schedules
	2. Page displays classes in tabs
	3. User clicks grid cell or "Edit Schedule" button
	4. Modal opens for create/edit
	5. Form submission sends data to server action
	6. Page refreshes to show updated data
	7. Toast notification confirms success/error

	SECURITY:
	- Only teachers can access this page
	- All CRUD operations verify teacher owns the class
	- Server-side validation on all mutations
-->

<script lang="ts">
	import type { PageData } from './$types';
	import type { ClassSchedule } from '$lib/types/database';
	import type { ScheduleFormData } from '$lib/components/ScheduleEntryModal.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import ClassStatsCard from '$lib/components/ClassStatsCard.svelte';
	import ClassScheduleGrid from '$lib/components/ClassScheduleGrid.svelte';
	import ScheduleEntryModal from '$lib/components/ScheduleEntryModal.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// ============================================================================
	// Modal State Management
	// ============================================================================

	// Controls whether the schedule entry modal is visible
	let modalOpen = $state(false);

	// Determines modal behavior: create (new entry), edit (modify), or view (read-only)
	let modalMode = $state<'create' | 'edit' | 'view'>('create');

	// Stores the schedule entry being edited (undefined for create mode)
	let selectedEntry = $state<ClassSchedule | undefined>(undefined);

	// Tracks which class the schedule entry belongs to
	let currentClassId = $state<string>('');

	// Default values for new entries (set when user clicks a grid cell)
	let defaultDay = $state<number>(0); // 0-4 (Sunday-Thursday)
	let defaultTime = $state<string | undefined>(undefined); // HH:MM:SS format

	// ============================================================================
	// Optimistic UI State
	// ============================================================================

	// Track optimistically added entries (before server confirms)
	// Key format: "classId-day-time"
	let optimisticEntries = $state<Record<string, ClassSchedule>>({});

	// Track pending requests to prevent double-clicks
	let pendingRequests = $state<Set<string>>(new Set());

	/**
	 * Generate unique key for optimistic entry tracking
	 */
	function getEntryKey(classId: string, day: number, time: string): string {
		return `${classId}-${day}-${time}`;
	}

	/**
	 * Get merged schedules (server data + optimistic entries)
	 * Used to display both confirmed and pending entries
	 */
	function getMergedSchedules(classId: string, serverSchedules: ClassSchedule[]): ClassSchedule[] {
		const optimisticList = Object.entries(optimisticEntries)
			.filter(([key]) => key.startsWith(classId))
			.map(([, entry]) => entry);

		return [...serverSchedules, ...optimisticList];
	}

	// ============================================================================
	// Event Handlers
	// ============================================================================

	/**
	 * Handle "Edit Schedule" button click
	 * Opens modal in create mode with default values (Sunday, 8:00)
	 */
	function handleEditSchedule(classId: string) {
		currentClassId = classId;
		modalMode = 'create';
		selectedEntry = undefined;
		defaultDay = 0;
		defaultTime = undefined;
		modalOpen = true;
	}

	/**
	 * Handle schedule grid cell click
	 * - Empty cell: Automatically create "Maths" entry
	 * - Existing entry: Open modal to edit
	 *
	 * @param classId - ID of the class this entry belongs to
	 * @param day - Day of week (0-4)
	 * @param time - Time slot clicked (HH:MM:SS)
	 * @param entry - Existing schedule entry, or undefined for empty cell
	 */
	async function handleCellClick(
		classId: string,
		day: number,
		time: string,
		entry?: ClassSchedule
	) {
		currentClassId = classId;
		defaultDay = day;
		defaultTime = time;

		if (entry) {
			// Edit existing entry - open modal
			modalMode = 'edit';
			selectedEntry = entry;
			modalOpen = true;
		} else {
			// Empty cell - automatically create "Maths" entry
			await createMathsEntry(classId, day, time);
		}
	}

	/**
	 * Automatically create a "Maths" schedule entry with optimistic UI
	 * Called when user clicks an empty cell
	 */
	async function createMathsEntry(classId: string, day: number, time: string) {
		// Find the period that starts at this time
		const period = data.school?.timetable?.periods.find((p) => p.start_time === time);

		if (!period) {
			toaster.error('Période introuvable');
			return;
		}

		// Check if already pending (prevent double-click)
		const entryKey = getEntryKey(classId, day, time);
		if (pendingRequests.has(entryKey)) {
			return; // Request already in progress
		}

		// Add to pending requests
		pendingRequests.add(entryKey);

		// Create optimistic entry (shown immediately in UI)
		const optimisticEntry: ClassSchedule = {
			id: `temp-${entryKey}`, // Temporary ID
			class_id: classId,
			teacher_id: data.profile.id,
			day_of_week: day,
			start_time: period.start_time,
			end_time: period.end_time,
			period_number: period.number,
			subject: 'Maths',
			room: null,
			notes: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		// Add to optimistic state (shows immediately)
		optimisticEntries[entryKey] = optimisticEntry;

		// Prepare form data
		const formData = new FormData();
		formData.append('class_id', classId);
		formData.append('day_of_week', day.toString());
		formData.append('period_number', period.number.toString());
		formData.append('start_time', period.start_time);
		formData.append('end_time', period.end_time);
		formData.append('subject', 'Maths');
		formData.append('room', '');
		formData.append('notes', '');

		try {
			const response = await fetch('?/createScheduleEntry', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			if (response.ok) {
				// Success: Remove optimistic entry and refresh data
				delete optimisticEntries[entryKey];
				pendingRequests.delete(entryKey);

				// Small delay to show the transition smoothly
				setTimeout(async () => {
					await invalidateAll();
					toaster.success('Créneau "Maths" ajouté');
				}, 100);
			} else {
				// Error: Remove optimistic entry and show error
				delete optimisticEntries[entryKey];
				pendingRequests.delete(entryKey);

				const result = await response.json();
				toaster.error(result?.message || 'Erreur lors de la création');
			}
		} catch (error) {
			// Error: Remove optimistic entry
			delete optimisticEntries[entryKey];
			pendingRequests.delete(entryKey);

			console.error('Error creating Maths entry:', error);
			toaster.error('Erreur lors de la création');
		}
	}

	/**
	 * Handle modal close
	 * Resets modal state and clears selected entry
	 */
	function handleModalClose() {
		modalOpen = false;
		selectedEntry = undefined;
	}

	/**
	 * Handle form save (create or update)
	 * Submits schedule entry data to appropriate server action
	 *
	 * @param formData - Form data from modal (day, period, times, subject, room, notes)
	 *
	 * PROCESS:
	 * 1. Determine action endpoint (create or update)
	 * 2. Build FormData with all fields
	 * 3. Send POST request with SvelteKit action header
	 * 4. Refresh page data on success
	 * 5. Show success/error toast notification
	 */
	async function handleSave(formData: ScheduleFormData) {
		const action = modalMode === 'create' ? '?/createScheduleEntry' : '?/updateScheduleEntry';

		// Prepare form data for submission
		const data = new FormData();
		if (formData.id) {
			data.append('id', formData.id); // Required for update action
		}
		data.append('class_id', currentClassId);
		data.append('day_of_week', formData.day_of_week.toString());
		data.append('period_number', formData.period_number.toString());
		data.append('start_time', formData.start_time);
		data.append('end_time', formData.end_time);
		data.append('subject', formData.subject);
		data.append('room', formData.room);
		data.append('notes', formData.notes);

		try {
			// Submit to SvelteKit form action
			const response = await fetch(action, {
				method: 'POST',
				body: data,
				headers: {
					'x-sveltekit-action': 'true' // Required for SvelteKit actions
				}
			});

			if (response.ok) {
				// Refresh all page data to show new/updated entry
				await invalidateAll();
				toaster.success(
					modalMode === 'create' ? 'Créneau créé avec succès' : 'Créneau modifié avec succès'
				);
				modalOpen = false;
			} else {
				const result = await response.json();
				toaster.error(result?.message || 'Une erreur est survenue');
			}
		} catch (error) {
			console.error('Error saving schedule entry:', error);
			toaster.error('Une erreur est survenue');
		}
	}

	/**
	 * Handle delete button click
	 * Deletes the currently selected schedule entry with confirmation
	 *
	 * PROCESS:
	 * 1. Show browser confirmation dialog
	 * 2. If confirmed, send DELETE request to server
	 * 3. Refresh page data on success
	 * 4. Show success/error toast notification
	 */
	async function handleDelete() {
		if (!selectedEntry) return;

		// Confirm deletion with user
		if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) {
			return;
		}

		const formData = new FormData();
		formData.append('id', selectedEntry.id);

		try {
			// Submit delete request
			const response = await fetch('?/deleteScheduleEntry', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			if (response.ok) {
				// Refresh all page data to remove deleted entry
				await invalidateAll();
				toaster.success('Créneau supprimé avec succès');
				modalOpen = false;
			} else {
				const result = await response.json();
				toaster.error(result?.message || 'Une erreur est survenue');
			}
		} catch (error) {
			console.error('Error deleting schedule entry:', error);
			toaster.error('Une erreur est survenue');
		}
	}
</script>

<svelte:head>
	<title>Mes Classes - UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold text-foreground">Mes Classes</h1>
		<p class="mt-2 text-muted-foreground">Gérez vos classes et leurs emplois du temps</p>
	</div>

	<!-- Warning if no timetable configured -->
	{#if !data.school?.timetable || data.school.timetable.periods.length === 0}
		<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
			<p class="text-sm">
				<strong>Attention:</strong> Aucun emploi du temps n'est configuré pour votre école. Contactez
				l'administrateur pour configurer les périodes avant de créer des créneaux.
			</p>
		</div>
	{/if}

	<!-- Classes Tabs -->
	{#if data.classes && data.classes.length > 0}
		<Tabs.Root value={data.classes[0]?.id} class="space-y-6">
			<!-- Tab List -->
			<Tabs.List
				class="grid w-full grid-cols-{data.classes.length > 4 ? '5' : data.classes.length}"
			>
				{#each data.classes as classItem (classItem.id)}
					<Tabs.Trigger value={classItem.id}>
						{classItem.name}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			<!-- Tab Content -->
			{#each data.classes as classItem}
				<Tabs.Content value={classItem.id} class="space-y-6">
					<!-- Class Info Header -->
					<div class="rounded-lg border border-border bg-muted/30 p-4">
						<h2 class="text-xl font-semibold text-foreground">{classItem.name}</h2>
						{#if classItem.description}
							<p class="mt-1 text-sm text-muted-foreground">{classItem.description}</p>
						{/if}
						<p class="mt-2 text-sm text-muted-foreground">
							Code de classe: <span class="font-mono font-semibold">{classItem.join_code}</span>
						</p>
					</div>

					<!-- Stats Card -->
					<ClassStatsCard
						studentCount={classItem.student_count}
						onEditSchedule={() => handleEditSchedule(classItem.id)}
					/>

					<!-- Schedule Grid -->
					<div>
						<h3 class="mb-4 text-lg font-semibold text-foreground">Emploi du Temps</h3>
						<ClassScheduleGrid
							schedules={getMergedSchedules(classItem.id, classItem.schedules)}
							periods={data.school?.timetable?.periods || []}
							onCellClick={(day, time, entry) => handleCellClick(classItem.id, day, time, entry)}
						/>
					</div>
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{:else}
		<!-- Empty State -->
		<div class="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
			<h3 class="mb-2 text-lg font-semibold text-foreground">Aucune classe</h3>
			<p class="text-muted-foreground">
				Vous n'avez pas encore de classes. Contactez un administrateur pour créer une classe.
			</p>
		</div>
	{/if}
</div>

<!-- Schedule Entry Modal -->
{#if data.school?.timetable}
	<ScheduleEntryModal
		bind:open={modalOpen}
		mode={modalMode}
		entry={selectedEntry}
		{defaultDay}
		periods={data.school.timetable.periods}
		onClose={handleModalClose}
		onSave={handleSave}
		onDelete={modalMode === 'edit' ? handleDelete : undefined}
	/>
{:else}
	<!-- Warning: No timetable configured -->
	<ScheduleEntryModal
		bind:open={modalOpen}
		mode={modalMode}
		entry={selectedEntry}
		{defaultDay}
		periods={[]}
		onClose={handleModalClose}
		onSave={handleSave}
		onDelete={modalMode === 'edit' ? handleDelete : undefined}
	/>
{/if}
