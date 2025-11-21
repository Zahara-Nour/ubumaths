<!--
	AchievementNotifications Component
	===================================
	Integration component for displaying achievement unlock toasts
	and initializing real-time listeners.

	This component should be included in the main protected layout
	to enable achievement notifications throughout the app.

	Props:
	- supabase: SupabaseClient instance
	- userId: Current authenticated user ID

	Features:
	- Initializes achievementsRealtimeManager on mount
	- Starts listening for real-time achievement unlocks
	- Displays toast notifications from the queue
	- Cleans up listeners on destroy

	Usage:
	```svelte
	<script>
	  import AchievementNotifications from '$lib/components/achievements/AchievementNotifications.svelte';
	  let { data } = $props();
	</script>

	<AchievementNotifications supabase={data.supabase} userId={data.session.user.id} />
	```
-->

<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Database } from '$lib/types/database';
	import { onMount, onDestroy } from 'svelte';
	import { achievementsRealtimeManager } from '$lib/stores/achievementsRealtime.svelte';
	import { achievementsStore } from '$lib/stores/achievements.svelte';
	import AchievementToast from './AchievementToast.svelte';

	interface Props {
		supabase: SupabaseClient<Database>;
		userId: string;
	}

	let { supabase, userId }: Props = $props();

	// Track if component is mounted
	let isMounted = $state(false);

	// Initialize and start listening on mount
	onMount(async () => {
		isMounted = true;

		// Initialize stores
		achievementsRealtimeManager.init(supabase, userId);
		achievementsStore.init();

		// Start listening for real-time achievement unlocks
		await achievementsRealtimeManager.startListening();
	});

	// Cleanup on destroy
	// Note: onDestroy doesn't wait for async callbacks, so we use void
	// The manager's internal state tracking prevents issues with double-stops
	onDestroy(() => {
		isMounted = false;

		// Fire and forget - the manager handles state internally
		void achievementsRealtimeManager.stopListening();
	});

	// Get current toast from store
	let currentToast = $derived(achievementsStore.currentToast);
	let hasToasts = $derived(achievementsStore.hasToasts);

	// Handle toast dismiss
	function handleToastClose() {
		achievementsStore.dismissToast();
	}
</script>

<!-- Toast container - fixed position at top right with high z-index -->
{#if hasToasts && currentToast && isMounted}
	<AchievementToast
		achievement={currentToast.achievement}
		points={currentToast.points}
		gidouilles={currentToast.gidouilles}
		onClose={handleToastClose}
	/>
{/if}
