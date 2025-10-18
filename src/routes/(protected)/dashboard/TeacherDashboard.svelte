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
	import { Clock, Target } from 'lucide-svelte';
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
	let wheelStudents = $state<Array<{ id: string; firstname: string; lastname?: string; avatar_url?: string }>>([]);

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
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-lg font-semibold text-foreground mb-4">Sélection de Classe</h3>

			<!-- Class selector and "Find Current Class" button (responsive flex layout) -->
			<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
				<!-- Native HTML select dropdown (accessible and performant) -->
				<div class="flex-1 w-full">
					<select
						value={selectedClassId || ''}
						onchange={handleClassChange}
						class="w-full h-10 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
					>
						<!-- Placeholder option (disabled, should never be visible due to auto-select) -->
						<option value="" disabled>Sélectionner une classe...</option>

						<!-- Loop through all teacher's classes -->
						{#each classes as cls}
							<option value={cls.id}>{cls.name}</option>
						{/each}
					</select>
				</div>

				<!-- "Find Current Class" button (auto-detection based on schedule) -->
				<Button
					onclick={handleFindCurrentClass}
					variant="secondary"
					class="whitespace-nowrap w-full sm:w-auto"
				>
					<Clock class="h-4 w-4 mr-2" />
					Trouver ma classe actuelle
				</Button>
			</div>

			<!-- Selected class information card (conditional rendering) -->
			{#if selectedClass}
				<div class="mt-4 p-4 bg-muted rounded-lg">
					<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div class="flex-1">
							<!-- Label -->
							<p class="text-sm text-muted-foreground mb-1">Classe sélectionnée :</p>

							<!-- Class name (always present) -->
							<p class="text-lg font-semibold text-foreground">{selectedClass.name}</p>

							<!-- Class description (optional) -->
							{#if selectedClass.description}
								<p class="text-sm text-muted-foreground mt-1">{selectedClass.description}</p>
							{/if}

							<!-- Student count with proper French pluralization -->
							<p class="text-sm text-muted-foreground mt-2">
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
								class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
								title={!selectedClassId
									? 'Sélectionnez une classe'
									: (selectedClass.student_count || 0) === 0
										? 'Aucun élève dans cette classe'
										: 'Choisir un élève aléatoirement'}
							>
								<Target class="h-5 w-5 mr-2" />
								Choisir un élève
							</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- QUICK STATS SECTION -->
	<!-- Four-column grid showing key teacher metrics -->
	<!-- TODO: Replace hardcoded values with real data from database -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<!-- Stat 1: Total Classes -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Classes Totales</h3>
			<!-- TODO: Count classes where teacher_id = data.profile.id -->
			<p class="text-3xl font-bold text-foreground mt-2">3</p>
		</div>

		<!-- Stat 2: Total Students (across all classes) -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Élèves Totaux</h3>
			<!-- TODO: Count distinct students in class_members for teacher's classes -->
			<p class="text-3xl font-bold text-foreground mt-2">87</p>
		</div>

		<!-- Stat 3: Active Assignments -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Devoirs Actifs</h3>
			<!-- TODO: Count assignments where created_by = teacher and is_published = true -->
			<p class="text-3xl font-bold text-foreground mt-2">12</p>
		</div>

		<!-- Stat 4: Submissions Needing Review -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Révisions en Attente</h3>
			<!-- TODO: Count unreviewed free-response submissions for teacher's assignments -->
			<p class="text-3xl font-bold text-foreground mt-2">24</p>
		</div>
	</div>

	<!-- QUICK ACTIONS SECTION -->
	<!-- Common teacher tasks as quick-access buttons -->
	<div class="bg-card rounded-lg shadow p-6">
		<h3 class="text-lg font-semibold text-foreground mb-4">Actions Rapides</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Action 1: Create new assignment -->
			<Button class="px-4 py-3">
				Créer un Devoir
				<!-- TODO: Link to /dashboard/assignments/create -->
			</Button>

			<!-- Action 2: Create new exercise -->
			<Button variant="secondary" class="px-4 py-3">
				Créer un Exercice
				<!-- TODO: Link to /dashboard/exercises/create -->
			</Button>

			<!-- Action 3: Add new class -->
			<Button variant="outline" class="px-4 py-3">
				Ajouter une Classe
				<!-- TODO: Link to /dashboard/classes/create -->
			</Button>
		</div>
	</div>

	<!-- MY CLASSES SECTION -->
	<!-- Lists all classes owned by this teacher -->
	<div class="bg-card rounded-lg shadow">
		<div class="px-6 py-4 border-b border-border">
			<h3 class="text-lg font-semibold text-foreground">Mes Classes</h3>
		</div>
		<div class="p-6">
			<!-- Link to classes page with schedules -->
			<div class="text-center py-8">
				<p class="text-muted-foreground mb-4">
					Gérez vos classes et leurs emplois du temps
				</p>
				<a href="/dashboard/teacher/classes" data-sveltekit-preload-data="tap">
					<Button>Voir Mes Classes</Button>
				</a>
			</div>
		</div>
	</div>

	<!-- RECENT SUBMISSIONS SECTION -->
	<!-- Shows recent student submissions that may need review -->
	<div class="bg-card rounded-lg shadow">
		<div class="px-6 py-4 border-b border-border">
			<h3 class="text-lg font-semibold text-foreground">Soumissions Récentes</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Query assignment_submissions for teacher's assignments -->
			<!-- Join with students and assignments to show: -->
			<!-- - Student name -->
			<!-- - Assignment name -->
			<!-- - Submission date -->
			<!-- - Score/completion percentage -->
			<!-- - Link to review submission -->
			<p class="text-muted-foreground text-center py-8">Aucune soumission récente à réviser</p>
		</div>
	</div>
</div>

<!-- ============================================================================
     WHEEL OF FORTUNE MODAL
     ============================================================================ -->

<Dialog.Root bind:open={wheelModalOpen} onOpenChange={(open) => !open && handleCloseWheel()}>
	<Dialog.Content class="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] max-h-[95vh] overflow-y-auto">
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
					<div
						class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mb-4"
					></div>
					<p class="text-muted-foreground">Chargement des élèves...</p>
				</div>
			{:else if wheelStudents.length === 0}
				<!-- Empty state -->
				<div class="text-center py-16">
					<p class="text-lg text-muted-foreground">Cette classe ne contient aucun élève.</p>
				</div>
			{:else}
				<!-- Wheel component (includes winner display and controls) -->
				<div class="w-full flex justify-center py-4">
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
