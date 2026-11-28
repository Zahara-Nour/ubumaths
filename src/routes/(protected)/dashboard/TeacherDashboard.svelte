<!--
	Tableau de bord du prof
	=======================

	Rendu par +page.svelte quand data.profile.role === 'teacher'.

	CE QU'IL AFFICHE :
	- sélecteur de classe (choix gardé dans localStorage, selectedClass) et de période
	- bouton « Trouver ma classe » : jour et heure courants face aux emplois du temps,
	  jours chômés selon le `week_config` de l'école
	- tirage au sort d'un élève (Wheel), carte VIP, actions rapides par élève
	  (StudentQuickActionsTable), lien vers les decks de révision, dialogues de jeux

	DONNÉES :
	- classes : teacherCache (cache d'abord, sinon /api/teacher/classes)
	- périodes : data.academicPeriods, sinon teacherCache / /api/teacher/periods
	- data.profile, data.weekConfig, data.students
-->

<script lang="ts">
	import { lore } from '#lib/config/lore.ts';
	// ============================================================================
	// IMPORTS
	// ============================================================================

	// Types
	import type { PageData } from './$types';
	import type { ClassWithData } from '#lib/server/students.ts';
	import type { Database } from '#lib/types/database.ts';
	import type { Class, ClassSchedule } from '#lib/types/database-helpers.ts';

	type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

	// UI Components
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Calendar, Clock, Target, BookOpen, Users } from '@lucide/svelte';
	import Wheel from '#lib/components/Wheel.svelte';
	import StudentQuickActionsTable from '#lib/components/teacher/StudentQuickActionsTable.svelte';
	import VipCardUseDialog from '#lib/components/teacher/VipCardUseDialog.svelte';

	// Stores & Utilities
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import {
		getSelectedClassId,
		setSelectedClass,
		clearSelectedClass,
		reconcileSelectedClass
	} from '#lib/stores/selectedClass.svelte.ts';
	import { getSelectedPeriodId, setSelectedPeriod } from '#lib/stores/selectedPeriod.svelte.ts';
	import {
		findCurrentSchedule,
		formatScheduleMatch,
		getNoClassMessage,
		isWeekend
	} from '#lib/utils/timeMatching.ts';
	import { findCurrentPeriod, getPeriodName } from '#lib/utils/academic-period.ts';
	import { teacherCache } from '#lib/stores/teacherDashboardCache.svelte.ts';

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
	 * Derived from teacherCache (loaded via cache-first strategy)
	 *
	 * Cache is hydrated in 2 locations for instant access:
	 * 1. /dashboard/teacher/+layout.svelte (for sub-routes)
	 * 2. This component's loadClasses() (for /dashboard route)
	 */
	let classes = $derived<ClassWithData[]>(teacherCache.getAllClassesSync());

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

	/**
	 * Selected academic period ID
	 * Used by StudentQuickActionsTable to filter warnings by period
	 * Auto-detected on mount, then synced with store for consistency
	 */
	let selectedPeriodId = $state<string | null>(null);

	/**
	 * Auto-detect and set current period when academic periods load
	 * Always uses findCurrentPeriod() to ensure correct period based on today's date
	 */
	$effect(() => {
		if (data.academicPeriods && data.academicPeriods.length > 0) {
			// Auto-detect current period based on today's date
			const detectedPeriodId = findCurrentPeriod(
				data.academicPeriods as unknown as AcademicPeriod[]
			);
			if (detectedPeriodId) {
				selectedPeriodId = detectedPeriodId;
				setSelectedPeriod(detectedPeriodId);
			}
		}
	});

	// ============================================================================
	// CURRENT ACADEMIC PERIOD
	// ============================================================================

	/**
	 * Current academic period object (derived from selectedPeriodId)
	 * Contains name, start_date, end_date, color, etc.
	 */
	const currentAcademicPeriod = $derived(
		data.academicPeriods?.find((p) => p.id === selectedPeriodId) ?? null
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

	/**
	 * Les classes ont déjà été demandées au serveur depuis l'ouverture de la page.
	 *
	 * Volontairement PAS un `$state`, et jamais remis à faux : `loadClasses()` est appelée par un
	 * `$effect`, qui relance tout ce qu'il lit. Un drapeau réactif remis à faux après un échec, ou un
	 * cache resté vide (prof sans classe), faisait repartir la demande en boucle (E83).
	 */
	let classesRequested = false;

	/**
	 * Les périodes ont déjà été demandées au serveur depuis l'ouverture de la page (même règle, E83)
	 */
	let periodsRequested = false;

	// ============================================================================
	// VIP CARD MODAL STATE
	// ============================================================================

	let batmanModalOpen = $state(false);
	let mathemagieModalOpen = $state(false);
	let jeuModalOpen = $state(false);
	let helpModalOpen = $state(false);
	let memoireModalOpen = $state(false);

	// ============================================================================
	// CACHE HYDRATION
	// ============================================================================

	/**
	 * Load classes with cache-first strategy
	 *
	 * 1. Check memory cache first (instant)
	 * 2. If cache miss, fetch from API
	 * 3. Hydrate cache for next time
	 */
	async function loadClasses() {
		// STEP 1: Try cache first
		const cached = teacherCache.getAllClassesSync();
		if (cached.length > 0) {
			console.log(`[TeacherDashboard] ✅ Cache HIT: ${cached.length} classes`);
			return;
		}

		// STEP 2: Cache miss - fetch from API
		if (classesRequested) return; // Un seul essai par ouverture de la page (E83)

		console.log('[TeacherDashboard] ⚠️  Cache MISS: Fetching from API...');
		classesRequested = true;

		try {
			const response = await fetch('/api/teacher/classes', {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const { classes: fetchedClasses } = (await response.json()) as { classes: ClassWithData[] };

			// STEP 3: Hydrate cache
			teacherCache.hydrateAllClasses(fetchedClasses);

			console.log(`[TeacherDashboard] ✅ API SUCCESS: Loaded ${fetchedClasses.length} classes`);
			initializeSelectedClass(fetchedClasses.map((c) => c.id));
		} catch (err) {
			console.error('[TeacherDashboard] ❌ Failed to load classes:', err);
			toaster.error(`Erreur lors du chargement des ${lore.entities.class}s`);
		}
	}

	/**
	 * Confronte la classe retenue à la liste lue (écart L47)
	 *
	 * L'identifiant gardé dans localStorage peut désigner une classe supprimée ou
	 * désactivée : il est remplacé par la première classe, ou vidé sans classe.
	 * La copie locale suit le store, sinon le sélecteur garderait l'ancienne.
	 *
	 * @param classIds - Identifiants de la liste COMPLÈTE lue au serveur
	 */
	function initializeSelectedClass(classIds: readonly string[]) {
		reconcileSelectedClass(classIds);
		selectedClassId = getSelectedClassId();
	}

	/**
	 * Initialize selectedPeriodId if not already set
	 * Auto-selects current period if no selection exists
	 */
	function initializeSelectedPeriod(currentPeriod: { id: string; name: string } | null) {
		const currentSelectedId = getSelectedPeriodId();

		if (!currentSelectedId && currentPeriod) {
			// No period selected - auto-select current period
			const periodId = currentPeriod.id;
			const periodName = currentPeriod.name || 'Période actuelle';
			setSelectedPeriod(periodId);
			console.log(`[TeacherDashboard] 🎯 Auto-selected current period: ${periodName}`);
		}
	}

	/**
	 * Load academic periods with cache-first strategy
	 *
	 * 1. Check memory cache first (instant)
	 * 2. If cache miss, fetch from API
	 * 3. Store in cache for next time
	 */
	async function loadPeriods() {
		const schoolId = data.profile?.school_id;
		if (!schoolId) return;

		// STEP 1: Try cache first
		const cached = teacherCache.getPeriodsSync(schoolId);
		if (cached) {
			console.log(`[TeacherDashboard] ✅ Cache HIT: Periods for school ${schoolId}`);
			return;
		}

		// STEP 2: Cache miss - fetch from API
		if (periodsRequested) return; // Un seul essai par ouverture de la page (E83)

		console.log('[TeacherDashboard] ⚠️  Cache MISS: Fetching periods from API...');
		periodsRequested = true;

		try {
			const response = await fetch('/api/teacher/periods', {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const { currentPeriod, allPeriods } = await response.json();

			// STEP 3: Store in cache
			teacherCache.setPeriods(schoolId, currentPeriod, allPeriods);

			console.log(`[TeacherDashboard] ✅ API SUCCESS: Loaded ${allPeriods.length} periods`);
			initializeSelectedPeriod(currentPeriod);
		} catch (err) {
			console.error('[TeacherDashboard] ❌ Failed to load periods:', err);
			toaster.error('Erreur lors du chargement des périodes');
		}
	}

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
	 * 2. Vérifie que le jour est travaillé, d'après `week_config` de l'école
	 * 3. Finds schedule entry matching current time
	 * 4. Auto-selects matching class in dropdown
	 * 5. Shows appropriate toast notification
	 *
	 * EDGE CASES HANDLED:
	 * - Teacher with no classes → Error toast
	 * - Jour chômé selon `week_config` de l'école → Warning toast
	 * - No schedules configured → Error toast
	 * - No class at current time → Info toast
	 * - Class found → Success toast with details + auto-select
	 */
	function handleFindCurrentClass() {
		// Edge case 1: Teacher has no classes assigned
		if (classes.length === 0) {
			toaster.error(`Aucun ${lore.entities.class} assigné`);
			return;
		}

		// Edge case 2 : jour chômé, selon la semaine de CETTE école
		if (isWeekend(data.weekConfig)) {
			toaster.warning("Pas de cours aujourd'hui (week-end)");
			return;
		}

		// Edge case 3: Classes exist but no schedules configured
		const hasAnySchedules = classes.some((cls) => cls.schedules && cls.schedules.length > 0);
		if (!hasAnySchedules) {
			toaster.error('Aucun emploi du temps configuré');
			return;
		}

		// Find matching schedule for current day/time
		// ClassWithData extends Class and includes all required fields
		const match = findCurrentSchedule(
			classes as unknown as Array<Class & { schedules?: ClassSchedule[] }>
		);

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
			const message = getNoClassMessage(
				classes as unknown as Array<Class & { schedules?: ClassSchedule[] }>,
				data.weekConfig
			);
			toaster.info(message);
		}
	}

	/**
	 * Handle opening the Wheel of Fortune modal
	 *
	 * Fetches students from the API for the selected class and opens the modal.
	 * Shows loading state while fetching.
	 *
	 * API ENDPOINT:
	 * - GET /api/classes/${classId}/students
	 * - Returns: { students: [{ id, firstname, lastname, avatar_url }] }
	 * - Respects test mode and only returns visible students
	 *
	 * EDGE CASES HANDLED:
	 * - No class selected → Shows error toast (prevented by disabled button)
	 * - Fetch error → Shows error toast and doesn't open modal
	 * - Empty class → Modal opens but shows empty state
	 */
	async function handleOpenWheel() {
		if (!selectedClassId) {
			toaster.error(`Veuillez sélectionner un ${lore.entities.class}`);
			return;
		}

		try {
			// Set loading state
			isLoadingStudents = true;
			wheelModalOpen = true; // Open modal to show loading state

			// Fetch students from API
			const response = await fetch(`/api/classes/${selectedClassId}/students`, {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			wheelStudents = data.students || [];
		} catch (error) {
			console.error('Failed to fetch students for wheel:', error);
			toaster.error(`Erreur lors du chargement des ${lore.entities.student}s`);
			wheelModalOpen = false; // Close modal on error
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
	function handleWinner(_student: { id: string; firstname: string }) {
		// SECURITY (finding M2): do not log student PII to the browser console (ships in prod).
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
	 * EFFECT 1: Load classes and periods on mount (cache-first)
	 * Only fetch if user/profile data is available (prevents 403 during hot reload)
	 */
	$effect(() => {
		if (data.user && data.profile) {
			loadClasses();
			loadPeriods();
		}
	});

	/**
	 * EFFECT 2: Auto-fetch student data when selectedClassId changes
	 * Cache methods auto-fetch from API if cache miss/expired
	 */
	$effect(() => {
		const classId = getSelectedClassId();

		if (data.user && data.profile && classId) {
			// These methods check cache first, then auto-fetch if needed
			teacherCache.getStudentBasic(classId);
			teacherCache.getStudentRewards(classId);
		}
	});

	/**
	 * EFFECT 3: Auto-fetch warnings when selectedClassId OR selectedPeriodId changes
	 */
	$effect(() => {
		const classId = getSelectedClassId();
		const periodId = getSelectedPeriodId();

		if (data.user && data.profile && classId && periodId) {
			// Auto-fetch warnings (cache-first, auto-fetch if cache miss/expired)
			teacherCache.getStudentWarnings(classId, periodId);
		}
	});

	/**
	 * EFFECT 4: Auto-select first class if none selected
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
</script>

<!-- ============================================================================
     TEMPLATE
     ============================================================================ -->

<div class="space-y-6">
	<!--
		HEADER WITH ACADEMIC PERIOD BADGE
		==================================
		Shows current academic period (trimester, semester, etc.)
	-->
	{#if currentAcademicPeriod}
		<div class="flex items-center justify-end">
			<Badge
				variant="secondary"
				class="px-3 py-1 text-sm"
				style={currentAcademicPeriod.color
					? `background-color: ${currentAcademicPeriod.color}20; border-color: ${currentAcademicPeriod.color}`
					: ''}
			>
				<Calendar class="mr-1.5 h-3.5 w-3.5" />
				{getPeriodName(currentAcademicPeriod as AcademicPeriod)}
			</Badge>
		</div>
	{/if}

	<!--
		CLASS SELECTOR SECTION (Unified)
		=================================
		Single card with class selection and action buttons
	-->
	{#if classes.length > 0}
		<div class="rounded-lg bg-card p-6 shadow">
			<!-- Header row: Title + Period badge (mobile) -->
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-foreground">Ma {lore.entities.class}</h3>
				{#if selectedClass}
					<Badge variant="outline" class="text-sm">
						<Users class="mr-1.5 h-3.5 w-3.5" />
						{selectedClass.student_count || 0}
						{lore.entities.student}{(selectedClass.student_count || 0) > 1 ? 's' : ''}
					</Badge>
				{/if}
			</div>

			<!-- Class selector row -->
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<!-- Dropdown -->
				<div class="flex-1">
					<select
						value={selectedClassId || ''}
						onchange={handleClassChange}
						class="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
					>
						<option value="" disabled>Sélectionner une classe...</option>
						{#each classes as cls (cls.id)}
							<option value={cls.id}>{cls.name}</option>
						{/each}
					</select>
				</div>

				<!-- Find current class button -->
				<Button onclick={handleFindCurrentClass} variant="outline" size="sm">
					<Clock class="mr-2 h-4 w-4" />
					Auto-détecter
				</Button>
			</div>

			<!-- Action buttons row -->
			{#if selectedClass}
				<div class="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
					<!-- Wheel of Fortune -->
					<Button
						onclick={handleOpenWheel}
						variant="secondary"
						size="sm"
						disabled={!selectedClassId || (selectedClass.student_count || 0) === 0}
					>
						<Target class="mr-2 h-4 w-4" />
						Roue de la fortune
					</Button>

					<!-- Batman & Robin -->
					<Button
						onclick={() => (batmanModalOpen = true)}
						variant="secondary"
						size="sm"
						disabled={!selectedClassId}
					>
						Batman & Robin
					</Button>

					<!-- Mathémagie -->
					<Button
						onclick={() => (mathemagieModalOpen = true)}
						variant="secondary"
						size="sm"
						disabled={!selectedClassId}
					>
						Mathémagie
					</Button>

					<!-- Jeu -->
					<Button
						onclick={() => (jeuModalOpen = true)}
						variant="secondary"
						size="sm"
						disabled={!selectedClassId}
					>
						Jeu
					</Button>

					<!-- Help ! -->
					<Button
						onclick={() => (helpModalOpen = true)}
						variant="secondary"
						size="sm"
						disabled={!selectedClassId}
					>
						Help !
					</Button>

					<!-- Trou de mémoire -->
					<Button
						onclick={() => (memoireModalOpen = true)}
						variant="secondary"
						size="sm"
						disabled={!selectedClassId}
					>
						Trou de mémoire
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- STUDENT QUICK ACTIONS TABLE -->
	{#if selectedClassId && selectedPeriodId}
		<div class="rounded-lg bg-card p-6 shadow">
			<h3 class="mb-4 text-lg font-semibold text-foreground">
				Actions Rapides - {lore.entities.student}s
			</h3>
			<StudentQuickActionsTable classId={selectedClassId} periodId={selectedPeriodId} />
		</div>
	{/if}

	<!-- SRS DECKS SECTION -->
	<div class="rounded-lg bg-card p-6 shadow">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-lg font-semibold text-foreground">Decks SRS (Révision Espacée)</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Créez et gérez des decks de révision espacée pour vos {lore.entities.student}s
				</p>
			</div>
			<a href="/dashboard/teacher/srs/decks" data-sveltekit-preload-data="hover">
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
				<Target class="h-6 w-6 text-primary" />
				Roue de la fortune
			</Dialog.Title>
			<Dialog.Description>
				{#if selectedClass}
					Sélectionnez aléatoirement un {lore.entities.student} de {selectedClass.name}
				{:else}
					Sélectionnez aléatoirement un {lore.entities.student}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-6 w-full">
			{#if isLoadingStudents}
				<!-- Loading state -->
				<div class="flex flex-col items-center justify-center py-16">
					<div class="mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-primary"></div>
					<p class="text-muted-foreground">Chargement des {lore.entities.student}s...</p>
				</div>
			{:else if wheelStudents.length === 0}
				<!-- Empty state -->
				<div class="py-16 text-center">
					<p class="text-lg text-muted-foreground">
						Ce {lore.entities.class} ne contient aucun {lore.entities.student}.
					</p>
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

<!-- ============================================================================
     VIP CARD USE DIALOGS
     ============================================================================ -->

<VipCardUseDialog
	bind:open={batmanModalOpen}
	cardId="batman"
	title="Batman & Robin"
	classId={selectedClassId}
	showWheelOption={true}
/>

<VipCardUseDialog
	bind:open={mathemagieModalOpen}
	cardId="mathemagie"
	title="Mathémagie"
	classId={selectedClassId}
	showWheelOption={true}
/>

<VipCardUseDialog
	bind:open={jeuModalOpen}
	cardId="jeu"
	title="Jeu"
	classId={selectedClassId}
	showWheelOption={true}
/>

<VipCardUseDialog
	bind:open={helpModalOpen}
	cardId="help"
	title="Help !"
	classId={selectedClassId}
/>

<VipCardUseDialog
	bind:open={memoireModalOpen}
	cardId="memoire"
	title="Trou de mémoire"
	classId={selectedClassId}
/>
