<script lang="ts">
	/**
	 * Student Dashboard Layout (Client)
	 * ==================================
	 *
	 * Hydrates the student cache with server-loaded data for instant access.
	 *
	 * HYDRATION PROCESS:
	 * This component receives data from +layout.server.ts and populates the
	 * studentCache store. This avoids redundant API calls and ensures instant
	 * data availability for child pages.
	 *
	 * WHY ONMOUNT:
	 * - Runs once when layout mounts
	 * - Ensures cache is populated before child pages render
	 * - Data persists across navigation within student dashboard
	 *
	 * WORKFLOW:
	 * 1. Server (+layout.server.ts): Fetch data from database
	 * 2. Server: Pass data via layout props
	 * 3. Client (this file): Hydrate cache in onMount
	 * 4. Child pages: Access data via studentCache getters
	 *
	 * CACHE BENEFITS:
	 * - Zero API calls on page load
	 * - Instant data access in child components
	 * - Reactive updates with Svelte 5 $state
	 * - Automatic TTL-based expiration
	 *
	 * @example
	 * // Example usage in child page
	 * import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	 * let profile = $derived(studentCache.getProfileSync());
	 */

	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { onMount } from 'svelte';

	// Get server data
	let { data, children } = $props();

	/**
	 * Hydrate cache on mount
	 *
	 * TIMING:
	 * - Runs once when layout component mounts
	 * - Data is available immediately for child components
	 * - No loading states needed in child pages
	 */
	onMount(() => {
		// Hydrate profile cache (2h TTL)
		if (data.studentProfile) {
			studentCache.hydrateProfile(data.studentProfile);
		}

		// Hydrate rewards cache (10min TTL)
		if (data.rewards) {
			studentCache.hydrateRewards(data.rewards);
		}
	});
</script>

{@render children()}
