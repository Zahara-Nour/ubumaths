<!--
	Teacher Dashboard Layout
	========================

	Cache-first class loading + auto-initialize selectedClassId
-->

<script lang="ts">
	import { getSelectedClassId, setSelectedClass } from '$lib/stores/selectedClass.svelte';
	import { getSelectedPeriodId, setSelectedPeriod } from '$lib/stores/selectedPeriod.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import type { LayoutData } from './$types';
	import type { ClassWithData } from '$lib/server/students';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Classes loaded via cache-first strategy
	let classes = $state<ClassWithData[]>([]);
	let isLoadingClasses = $state(false);
	let isLoadingPeriods = $state(false);

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
			console.log(`[Teacher Layout] ✅ Cache HIT: ${cached.length} classes`);
			classes = cached;
			initializeSelectedClass();
			return;
		}

		// STEP 2: Cache miss - fetch from API
		if (isLoadingClasses) return; // Prevent duplicate requests

		console.log('[Teacher Layout] ⚠️  Cache MISS: Fetching from API...');
		isLoadingClasses = true;

		try {
			const response = await fetch('/api/teacher/classes');

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const { classes: fetchedClasses } = await response.json();

			// STEP 3: Hydrate cache
			teacherCache.hydrateAllClasses(fetchedClasses);
			classes = fetchedClasses;

			console.log(`[Teacher Layout] ✅ API SUCCESS: Loaded ${classes.length} classes`);
			initializeSelectedClass();
		} catch (err) {
			console.error('[Teacher Layout] ❌ Failed to load classes:', err);
			// TODO: Show error toast to user
		} finally {
			isLoadingClasses = false;
		}
	}

	/**
	 * Initialize selectedClassId if not already set
	 * Auto-selects first class if no selection exists
	 */
	function initializeSelectedClass() {
		const currentSelectedId = getSelectedClassId();

		if (!currentSelectedId && classes.length > 0) {
			// No class selected - auto-select first class
			const firstClassId = classes[0].id;
			setSelectedClass(firstClassId);
			console.log(`[Teacher Layout] 🎯 Auto-selected first class: ${classes[0].name}`);
		}
	}

	/**
	 * Initialize selectedPeriodId if not already set
	 * Auto-selects current period if no selection exists
	 */
	function initializeSelectedPeriod(currentPeriod: unknown | null) {
		const currentSelectedId = getSelectedPeriodId();

		if (!currentSelectedId && currentPeriod) {
			// No period selected - auto-select current period
			const periodId = (currentPeriod as any).id;
			const periodName = (currentPeriod as any).name || 'Période actuelle';
			setSelectedPeriod(periodId);
			console.log(`[Teacher Layout] 🎯 Auto-selected current period: ${periodName}`);
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
			console.log(`[Teacher Layout] ✅ Cache HIT: Periods for school ${schoolId}`);
			return;
		}

		// STEP 2: Cache miss - fetch from API
		if (isLoadingPeriods) return; // Prevent duplicate requests

		console.log('[Teacher Layout] ⚠️  Cache MISS: Fetching periods from API...');
		isLoadingPeriods = true;

		try {
			const response = await fetch('/api/teacher/periods');

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const { currentPeriod, allPeriods } = await response.json();

			// STEP 3: Store in cache
			teacherCache.setPeriods(schoolId, currentPeriod, allPeriods);

			console.log(`[Teacher Layout] ✅ API SUCCESS: Loaded ${allPeriods.length} periods`);
			initializeSelectedPeriod(currentPeriod);
		} catch (err) {
			console.error('[Teacher Layout] ❌ Failed to load periods:', err);
			// TODO: Show error toast to user
		} finally {
			isLoadingPeriods = false;
		}
	}

	// EFFECT 1: Load classes and periods on mount (cache-first)
	// Only fetch if user/profile data is available (prevents 403 during hot reload)
	$effect(() => {
		if (data.user && data.profile) {
			loadClasses();
			loadPeriods();
		}
	});

	// EFFECT 2: Auto-fetch student data when selectedClassId changes
	// Cache methods auto-fetch from API if cache miss/expired
	$effect(() => {
		const selectedClassId = getSelectedClassId();

		if (data.user && data.profile && selectedClassId) {
			// These methods check cache first, then auto-fetch if needed
			teacherCache.getStudentBasic(selectedClassId);
			teacherCache.getStudentRewards(selectedClassId);
		}
	});

	// EFFECT 3: Auto-fetch warnings when selectedClassId OR selectedPeriodId changes
	$effect(() => {
		const selectedClassId = getSelectedClassId();
		const selectedPeriodId = getSelectedPeriodId();

		if (data.user && data.profile && selectedClassId && selectedPeriodId) {
			// Auto-fetch warnings (cache-first, auto-fetch if cache miss/expired)
			teacherCache.getStudentWarnings(selectedClassId, selectedPeriodId);
		}
	});
</script>

{@render children()}
