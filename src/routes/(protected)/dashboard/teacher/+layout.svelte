<!--
	Teacher Dashboard Layout
	========================

	SSR hydration (montage et relecture du layout) + auto-initialize selectedClassId and selectedPeriodId
-->

<script lang="ts">
	import { untrack } from 'svelte';
	import { getSelectedClassId, reconcileSelectedClass } from '#lib/stores/selectedClass.svelte.ts';
	import { getSelectedPeriodId, setSelectedPeriod } from '#lib/stores/selectedPeriod.svelte.ts';
	import { teacherCache } from '#lib/stores/teacherDashboardCache.svelte.ts';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Dernière liste de classes versée au cache (comparée par référence, pas réactive)
	let hydratedClasses: LayoutData['classes'] | null = null;

	// Hydrate cache with SSR data, au montage ET à chaque relecture du layout
	// (`refreshAll()` après une action de formulaire : écart L45). Seules les
	// données du layout sont suivies ; le reste est lu sans dépendance.
	// (déclaré avant les autres effets : la classe retenue est vérifiée avant
	// que l'effet 1 ne lance les lectures pour elle)
	$effect(() => {
		const { classesLoaded, classes, profile, currentPeriod, allPeriods } = data;
		untrack(() => {
			// La liste n'est connue que si la lecture serveur a réussi : alors elle fait
			// foi, purge le cache des classes et corrige la classe retenue
			// Seulement une liste NEUVE : `data` change aussi quand un layout parent est
			// relu, sans que la liste ait été relue.
			if (classesLoaded && classes !== hydratedClasses) {
				teacherCache.hydrateAllClasses(classes);
				reconcileSelectedClass(classes.map((c) => c.id));
				hydratedClasses = classes;
			}

			// Hydrate periods
			const schoolId = profile?.school_id;
			if (schoolId && (currentPeriod || allPeriods)) {
				console.log(`[Teacher Layout] ✅ Hydrating periods cache (from SSR)`);
				teacherCache.setPeriods(schoolId, currentPeriod, allPeriods || []);

				// Auto-select current period if not set
				if (currentPeriod && !getSelectedPeriodId()) {
					setSelectedPeriod(currentPeriod.id);
					console.log(
						`[Teacher Layout] 🎯 Auto-selected current period: ${currentPeriod.name || 'Période actuelle'}`
					);
				}
			}
		});
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
