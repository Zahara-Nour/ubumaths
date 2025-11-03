<!--
	Teacher Dashboard Layout
	========================

	Cache-first class loading + auto-initialize selectedClassId
-->

<script lang="ts">
	import { getSelectedClassId, setSelectedClass } from '$lib/stores/selectedClass.svelte';
	import { hydrateClassData } from '$lib/stores/classHydration';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import type { LayoutData } from './$types';
	import type { ClassWithData } from '$lib/server/students';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Classes loaded via cache-first strategy
	let classes = $state<ClassWithData[]>([]);
	let isLoadingClasses = $state(false);

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

	// EFFECT 1: Load classes on mount (cache-first)
	$effect(() => {
		loadClasses();
	});

	// EFFECT 2: Hydrate student data when selectedClassId changes
	$effect(() => {
		const selectedClassId = getSelectedClassId();

		if (selectedClassId && data.supabase) {
			console.log(`[Teacher Layout] 🔄 Hydrating cache for class ${selectedClassId}`);
			hydrateClassData(selectedClassId, data.supabase);
		}
	});
</script>

{@render children()}
