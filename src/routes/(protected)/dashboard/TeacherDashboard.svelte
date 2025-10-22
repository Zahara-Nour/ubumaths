<!--
	Teacher Dashboard Component
	============================

	This component is rendered when a user with role='teacher' accesses /dashboard.
	It displays teacher-specific information and management tools.

	TEACHER ROLE CAPABILITIES:
	--------------------------
	Teachers can:
	- Select and manage their classes via dropdown
	- Find their current class based on schedule (auto-detection)
	- View quick stats: total classes, students, assignments, pending reviews
	- Create and manage classes
	- Add students to their classes
	- Create custom exercises for their students
	- Create assignments from existing exercises
	- Review student submissions
	- Track student progress across all their classes
	- Generate class performance reports

	NEW FEATURES (Class Selection):
	--------------------------------
	1. **Class Selector Dropdown**:
	   - Displays all teacher's classes
	   - Selection persists to localStorage
	   - Auto-selects first class on initial load
	   - Shows selected class info with student count

	2. **"Find Current Class" Button**:
	   - Matches current day (Sunday-Thursday) and time against schedules
	   - Auto-selects matching class in dropdown
	   - Shows success toast with schedule details
	   - Handles edge cases: weekends, no classes, no schedules

	RENDERED BY:
	------------
	+page.svelte when data.profile.role === 'teacher'

	RECEIVED DATA:
	--------------
	- data.profile: User's profile with { id, email, full_name, role }
	- data.teacherClasses: Array of teacher's classes with:
	  - Class info (id, name, description, join_code, etc.)
	  - student_count: Number of enrolled students
	  - schedules: Array of ClassSchedule entries

	FUTURE ENHANCEMENTS:
	--------------------
	- Replace hardcoded stats with real database queries
	- Show active assignments (where is_published = true)
	- List recent submissions needing review
	- Add quick action buttons that navigate to creation pages
	- Display class performance analytics and charts
	- Use selected class for filtering dashboard data
-->

<script lang="ts">
	// ============================================================================
	// IMPORTS
	// ============================================================================

	// Types
	import type { PageData } from './$types';
	import type { Class } from '$lib/types/database';

	// UI Components
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Clock, Target, BookOpen } from 'lucide-svelte';
	import Wheel from '$lib/components/Wheel.svelte';

	// Stores & Utilities
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		getSelectedClassId,
		setSelectedClass,
		clearSelectedClass
	} from '$lib/stores/selectedClass.svelte';
	import {
		findCurrentSchedule,
		formatScheduleMatch,
		getNoClassMessage,
		isWeekend
	} from '$lib/utils/timeMatching';
	import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

	// ============================================================================
	// COMPONENT STATE
	// ============================================================================

	/**
	 * Received data from parent (+page.svelte)
	 * Contains profile and teacherClasses loaded from dashboard layout
	 */
	let { data }: { data: PageData } = $props();

	/**
	 * Teacher's classes enriched with student count and schedules
	 * Derived from data.teacherClasses (loaded in +layout.server.ts)
	 */
	type ClassWithData = Class & { student_count?: number; schedules?: any[] };
	const classes = $derived<ClassWithData[]>((data.teacherClasses as ClassWithData[]) || []);

	/**
	 * Currently selected class ID
	 * Restored from localStorage on component mount
	 * Updated when teacher changes dropdown or uses "Find Current Class"
	 */
	let selectedClassId = $state<string | null>(getSelectedClassId());

	/**
	 * Full class object for the selected class ID
	 * Used to display class name, description, and student count
	 */
	const selectedClass = $derived<ClassWithData | undefined>(
		classes.find((c) => c.id === selectedClassId)
	);

	// ============================================================================
	// WHEEL OF FORTUNE MODAL STATE
	// ============================================================================

	/**
	 * Modal visibility state
	 */
	let wheelModalOpen = $state(false);

	/**
	 * Students fetched for the wheel (with full details)
	 */
	let wheelStudents = $state<
		Array<{ id: string; firstname: string; lastname?: string; avatar_url?: string }>
	>([]);

	/**
	 * Loading state while fetching students
	 */
	let isLoadingStudents = $state(false);

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	/**
	 * Handle class selection change from dropdown
	 * Updates reactive state and persists to localStorage
	 *
	 * @param event - Change event from native <select> element
	 */
	function handleClassChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;

		if (value) {
			// Valid class selected
			selectedClassId = value;
			setSelectedClass(value); // Persist to localStorage
		} else {
			// Empty selection (shouldn't happen with current UI)
			selectedClassId = null;
			clearSelectedClass();
		}
	}

	/**
	 * Handle "Find Current Class" button click
	 *
	 * Matches current day/time against all class schedules:
	 * 1. Validates teacher has classes and schedules configured
	 * 2. Checks if current day is a school day (Sunday-Thursday)
	 * 3. Finds schedule entry matching current time
	 * 4. Auto-selects matching class in dropdown
	 * 5. Shows appropriate toast notification
	 *
	 * EDGE CASES HANDLED:
	 * - Teacher with no classes → Error toast
	 * - Weekend (Friday/Saturday) → Warning toast
	 * - No schedules configured → Error toast
	 * - No class at current time → Info toast
	 * - Class found → Success toast with details + auto-select
	 */
	function handleFindCurrentClass() {
		// Edge case 1: Teacher has no classes assigned
		if (classes.length === 0) {
			toaster.error('Aucune classe assignée');
			return;
		}

		// Edge case 2: Current day is weekend (Friday or Saturday)
		if (isWeekend()) {
			toaster.warning("Pas de cours aujourd'hui (weekend)");
			return;
		}

		// Edge case 3: Classes exist but no schedules configured
		const hasAnySchedules = classes.some((cls) => cls.schedules && cls.schedules.length > 0);
		if (!hasAnySchedules) {
			toaster.error('Aucun emploi du temps configuré');
			return;
		}

		// Find matching schedule for current day/time
		const match = findCurrentSchedule(classes);

		if (match) {
			// SUCCESS: Class found at current time
			// Auto-select the matched class in dropdown
			selectedClassId = match.class.id;
			setSelectedClass(match.class.id);

			// Show success toast with schedule details
			// Format: "Math 6A - Mathématiques - Salle 101 (8h00-9h00)"
			const details = formatScheduleMatch(match);
			toaster.success(`Classe trouvée : ${details}`);
		} else {
			// NO MATCH: Valid school day/time, but no class scheduled
			const message = getNoClassMessage(classes);
			toaster.info(message);
		}
	}

	/**
	 * Handle opening the Wheel of Fortune modal
	 *
	 * Uses cache to fetch students for the selected class and opens the modal.
	 * Shows loading state while fetching (only on first fetch per class).
	 *
	 * CACHE INTEGRATION:
	 * - First check cache for existing data
	 * - If cached, show immediately (no loading state)
	 * - If not cached, fetch from API and populate cache
	 * - Future opens of same class are instant (cached)
	 *
	 * EDGE CASES HANDLED:
	 * - No class selected → Should be prevented by disabled button
	 * - Fetch error → Shows error toast and doesn't open modal
	 * - Cache invalidation → Automatic refetch on next open
	 */
	async function handleOpenWheel() {
		if (!selectedClassId) {
			toaster.error('Veuillez sélectionner une classe');
			return;
		}

		// Check cache first for instant display
		const cached = teacherStudentsCache.getCached(selectedClassId);

		if (cached) {
			// Cache hit - instant display
			wheelStudents = cached;
			wheelModalOpen = true;
			isLoadingStudents = false;
		} else {
			// Cache miss - show loading state
			wheelStudents = [];
			isLoadingStudents = true;
			wheelModalOpen = true;
		}

		try {
			// Fetch students from cache (will use cached data or fetch from API)
			// Using non-full data for wheel (id, firstname, lastname, avatar_url only)
			const students = await teacherStudentsCache.getStudents(selectedClassId, false);
			wheelStudents = students;

			if (wheelStudents.length === 0) {
				toaster.warning('Cette classe ne contient aucun élève');
			}
		} catch (error) {
			console.error('Error fetching students:', error);
			toaster.error('Erreur lors du chargement des élèves');
			wheelModalOpen = false;
		} finally {
			isLoadingStudents = false;
		}
	}

	/**
	 * Handle winner selection from the wheel
	 *
	 * Called by the Wheel component when a student is selected.
	 * Currently just logs the winner (Wheel component displays it internally).
	 */
	function handleWinner(student: { id: string; firstname: string }) {
		console.log('Winner selected:', student.firstname);
	}

	/**
	 * Handle modal close
	 *
	 * Resets all wheel-related state.
	 */
	function handleCloseWheel() {
		wheelModalOpen = false;
		wheelStudents = [];
	}

	// ============================================================================
	// REACTIVE EFFECTS
	// ============================================================================

	/**
	 * Auto-select first class if none selected
	 *
	 * Runs when:
	 * - Component mounts and no class is selected
	 * - Teacher's classes change (e.g., new class created)
	 *
	 * Ensures dropdown always has a valid selection when classes exist.
	 */
	$effect(() => {
		if (!selectedClassId && classes.length > 0) {
			const firstClassId = classes[0].id;
			selectedClassId = firstClassId;
			setSelectedClass(firstClassId); // Persist to localStorage
		}
	});

	/**
	 * Preload students for selected class (optional performance optimization)
	 *
	 * When a class is selected, preload its students in the background.
	 * This makes the wheel modal open instantly on first click.
	 *
	 * Benefits:
	 * - First wheel open feels instant (data already cached)
	 * - Minimal overhead (fire-and-forget background fetch)
	 */
	$effect(() => {
		if (selectedClassId) {
			// Preload students for selected class (non-blocking)
			teacherStudentsCache.preload(selectedClassId, false);
		}
	});
</script>

<!-- ============================================================================
     TEMPLATE
     ============================================================================ -->

<div class="space-y-6">
	<!--
		CLASS SELECTOR SECTION
		======================

		Displays a dropdown for manual class selection and a button for automatic
		detection of current class based on schedule.

		Features:
		- Native HTML <select> dropdown (better accessibility than custom component)
		- Selection persists to localStorage via selectedClass store
		- "Find Current Class" button with Clock icon
		- Displays selected class info: name, description, student count

		Only visible when teacher has at least one class.
	-->
	{#if classes.length > 0}
		<div class="rounded-lg bg-card p-6 shadow">
			<h3 class="mb-4 text-lg font-semibold text-foreground">Sélection de Classe</h3>

			<!-- Class selector and "Find Current Class" button (responsive flex layout) -->
			<div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
				<!-- Native HTML select dropdown (accessible and performant) -->
				<div class="w-full flex-1">
					<select
						value={selectedClassId || ''}
						onchange={handleClassChange}
						class="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
					>
						<!-- Placeholder option (disabled, should never be visible due to auto-select) -->
						<option value="" disabled>Sélectionner une classe...</option>

						<!-- Loop through all teacher's classes -->
						{#each classes as cls (cls.id)}
							<option value={cls.id}>{cls.name}</option>
						{/each}
					</select>
				</div>

				<!-- "Find Current Class" button (auto-detection based on schedule) -->
				<Button
					onclick={handleFindCurrentClass}
					variant="secondary"
					class="w-full whitespace-nowrap sm:w-auto"
				>
					<Clock class="mr-2 h-4 w-4" />
					Trouver ma classe actuelle
				</Button>
			</div>

			<!-- Selected class information card (conditional rendering) -->
			{#if selectedClass}
				<div class="mt-4 rounded-lg bg-muted p-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div class="flex-1">
							<!-- Label -->
							<p class="mb-1 text-sm text-muted-foreground">Classe sélectionnée :</p>

							<!-- Class name (always present) -->
							<p class="text-lg font-semibold text-foreground">{selectedClass.name}</p>

							<!-- Class description (optional) -->
							{#if selectedClass.description}
								<p class="mt-1 text-sm text-muted-foreground">{selectedClass.description}</p>
							{/if}

							<!-- Student count with proper French pluralization -->
							<p class="mt-2 text-sm text-muted-foreground">
								{selectedClass.student_count || 0} élève{(selectedClass.student_count || 0) > 1
									? 's'
									: ''}
							</p>
						</div>

						<!-- Wheel of Fortune Button -->
						<div class="flex-shrink-0">
							<Button
								onclick={handleOpenWheel}
								disabled={!selectedClassId || (selectedClass.student_count || 0) === 0}
								class="bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-600 hover:to-pink-600 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-50"
								title={!selectedClassId
									? 'Sélectionnez une classe'
									: (selectedClass.student_count || 0) === 0
										? 'Aucun élève dans cette classe'
										: 'Choisir un élève aléatoirement'}
							>
								<Target class="mr-2 h-5 w-5" />
								Choisir un élève
							</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- SRS DECKS SECTION -->
	<!-- Manage SRS flashcard decks for spaced repetition -->
	<div class="rounded-lg bg-card p-6 shadow">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-lg font-semibold text-foreground">Decks SRS (Révision Espacée)</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Créez et gérez des decks de révision espacée pour vos élèves
				</p>
			</div>
			<a href="/dashboard/teacher/srs/decks">
				<Button>
					<BookOpen class="mr-2 h-4 w-4" />
					Gérer les decks
				</Button>
			</a>
		</div>
	</div>
</div>

<!-- ============================================================================
     WHEEL OF FORTUNE MODAL
     ============================================================================ -->

<Dialog.Root bind:open={wheelModalOpen} onOpenChange={(open) => !open && handleCloseWheel()}>
	<Dialog.Content
		class="max-h-[95vh] overflow-y-auto sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw]"
	>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-2xl">
				<Target class="h-6 w-6 text-purple-500" />
				Choisir un élève
			</Dialog.Title>
			<Dialog.Description>
				{#if selectedClass}
					Sélectionnez aléatoirement un élève de {selectedClass.name}
				{:else}
					Sélectionnez aléatoirement un élève
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-6 w-full">
			{#if isLoadingStudents}
				<!-- Loading state -->
				<div class="flex flex-col items-center justify-center py-16">
					<div class="mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-purple-500"></div>
					<p class="text-muted-foreground">Chargement des élèves...</p>
				</div>
			{:else if wheelStudents.length === 0}
				<!-- Empty state -->
				<div class="py-16 text-center">
					<p class="text-lg text-muted-foreground">Cette classe ne contient aucun élève.</p>
				</div>
			{:else}
				<!-- Wheel component (includes winner display and controls) -->
				<div class="flex w-full justify-center py-4">
					<Wheel
						students={wheelStudents}
						onWinner={handleWinner}
						showConfetti={true}
						confettiZIndex={100}
					/>
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
