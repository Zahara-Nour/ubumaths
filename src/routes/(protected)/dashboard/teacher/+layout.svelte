<!--
	Teacher Dashboard Layout
	========================

	SSR hydration + auto-initialize selectedClassId and selectedPeriodId
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { getSelectedClassId, setSelectedClass } from '$lib/stores/selectedClass.svelte';
	import { getSelectedPeriodId, setSelectedPeriod } from '$lib/stores/selectedPeriod.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import type { LayoutData } from './$types';
	import type { ClassWithData } from '$lib/server/students';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Classes loaded via SSR hydration
	let classes = $state<ClassWithData[]>(data.classes || []);

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

	// Hydrate cache on mount with SSR data
	onMount(() => {
		// Hydrate classes
		if (data.classes && data.classes.length > 0) {
			console.log(
				`[Teacher Layout] ✅ Hydrating cache with ${data.classes.length} classes (from SSR)`
			);
			teacherCache.hydrateAllClasses(data.classes);
			classes = data.classes;
			initializeSelectedClass();
		}

		// Hydrate periods
		const schoolId = data.profile?.school_id;
		if (schoolId && (data.currentPeriod || data.allPeriods)) {
			console.log(`[Teacher Layout] ✅ Hydrating periods cache (from SSR)`);
			teacherCache.setPeriods(schoolId, data.currentPeriod, data.allPeriods || []);

			// Auto-select current period if not set
			if (data.currentPeriod && !getSelectedPeriodId()) {
				setSelectedPeriod(data.currentPeriod.id);
				console.log(
					`[Teacher Layout] 🎯 Auto-selected current period: ${data.currentPeriod.name || 'Période actuelle'}`
				);
			}
		}
	});

	// EFFECT 1: Auto-fetch student data when selectedClassId changes
	// Cache methods auto-fetch from API if cache miss/expired
	$effect(() => {
		const selectedClassId = getSelectedClassId();

		if (data.user && data.profile && selectedClassId) {
			// These methods check cache first, then auto-fetch if needed
			teacherCache.getStudentBasic(selectedClassId);
			teacherCache.getStudentRewards(selectedClassId);
		}
	});

	// EFFECT 2: Auto-fetch warnings when selectedClassId OR selectedPeriodId changes
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
