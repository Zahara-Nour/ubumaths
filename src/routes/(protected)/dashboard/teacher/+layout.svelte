<!--
	Teacher Dashboard Layout
	========================

	SSR hydration + auto-initialize selectedClassId and selectedPeriodId
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { getSelectedClassId, reconcileSelectedClass } from '$lib/stores/selectedClass.svelte';
	import { getSelectedPeriodId, setSelectedPeriod } from '$lib/stores/selectedPeriod.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Hydrate cache on mount with SSR data
	// (onMount est déclaré avant les effets : la classe retenue est vérifiée
	// avant que l'effet 1 ne lance les lectures pour elle)
	onMount(() => {
		// La liste n'est connue que si la lecture serveur a réussi : alors elle fait
		// foi, purge le cache des classes et corrige la classe retenue
		if (data.classesLoaded) {
			teacherCache.hydrateAllClasses(data.classes);
			reconcileSelectedClass(data.classes.map((c) => c.id));
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
