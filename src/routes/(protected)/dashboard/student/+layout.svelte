<script lang="ts">
	/**
	 * Student Dashboard Layout (Client)
	 * ==================================
	 *
	 * Hydrates the student cache with server-loaded data for instant access.
	 * Also hydrates consent store for RGPD compliance UI.
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
	 * CONSENT INTEGRATION (RGPD Article 8):
	 * - Consent status is passed from protected layout
	 * - ConsentBanner shows warning for students without consent
	 * - consent store enables UI disabling across child components
	 *
	 * @example
	 * // Example usage in child page
	 * import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	 * let profile = $derived(studentCache.getProfileSync());
	 */

	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { consent } from '$lib/stores/consent.svelte';
	import ConsentBanner from '$lib/components/ConsentBanner.svelte';
	import { onMount } from 'svelte';

	// Get server data (includes consentStatus from parent protected layout)
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

		// Hydrate consent store for UI disabling
		if (data.consentStatus) {
			consent.set(data.consentStatus);
		}
	});
</script>

<!-- Consent Banner (shows warning for students without parental consent) -->
{#if data.consentStatus}
	<ConsentBanner consentStatus={data.consentStatus} />
{/if}

{@render children()}
