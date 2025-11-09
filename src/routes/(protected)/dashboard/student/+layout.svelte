<script lang="ts">
	/**
	 * Student Dashboard Layout (Client)
	 * ==================================
	 *
	 * Hydrates the student cache with server-loaded data for instant access.
	 */

	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { onMount } from 'svelte';

	// Get server data
	let { data, children } = $props();

	// Hydrate cache on mount
	onMount(() => {
		// Hydrate profile cache
		if (data.studentProfile) {
			studentCache.hydrateProfile(data.studentProfile);
		}

		// Hydrate rewards cache
		if (data.rewards) {
			studentCache.hydrateRewards(data.rewards);
		}
	});
</script>

{@render children()}
