<script lang="ts">
	/**
	 * Test Mode Toggle Component
	 * ===========================
	 *
	 * Allows teachers to toggle between viewing test and real students.
	 *
	 * FEATURES:
	 * - Switch UI with clear labeling
	 * - Syncs with server database via API
	 * - Auto-reloads page when toggled (to refresh server data)
	 * - Full-page loading overlay during mode switch
	 * - Only shown for non-test teachers
	 * - Test teachers (is_test = true) are always in test mode
	 *
	 * USAGE:
	 * ```svelte
	 * <TestModeToggle currentUserIsTest={profile.is_test} />
	 * ```
	 */

	import { testMode } from '$lib/stores/test-mode.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { goto, invalidateAll } from '$app/navigation';
	import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

	// Props
	let { currentUserIsTest = false }: { currentUserIsTest?: boolean } = $props();

	// Loading state
	let isLoading = $state(false);

	// Handle toggle
	async function handleToggle() {
		// Set loading state
		isLoading = true;

		// 1. Update client-side store (for immediate UI feedback)
		testMode.toggle();
		const newValue = $testMode; // Get the new value AFTER toggling
		console.log('[TestModeToggle] Toggled to:', newValue);

		// 2. Sync with server database
		try {
			console.log('[TestModeToggle] Syncing with server...');
			const response = await fetch('/api/test-mode', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: newValue })
			});

			if (!response.ok) {
				console.error('[TestModeToggle] Failed to sync test mode with server');
				// Revert client-side change on error
				testMode.toggle();
				isLoading = false;
				return;
			}

			const result = await response.json();
			console.log('[TestModeToggle] Server sync successful:', result);

			// 3. Clear student cache (students are filtered differently now)
			console.log('[TestModeToggle] Clearing student cache...');
			teacherStudentsCache.clear();

			// 4. Force HARD page reload to refetch with new test mode
			console.log('[TestModeToggle] Forcing hard reload...');
			window.location.reload();
		} catch (error) {
			console.error('[TestModeToggle] Error syncing test mode:', error);
			// Revert client-side change on error
			testMode.toggle();
			isLoading = false;
		}
	}
</script>

{#if !currentUserIsTest}
	<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
		<label for="test-mode-toggle" class="flex items-center gap-2">
			<span class="text-sm font-medium">Mode Test</span>
			<input
				type="checkbox"
				id="test-mode-toggle"
				checked={$testMode}
				onchange={handleToggle}
				class="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-ring"
			/>
		</label>

		{#if $testMode}
			<Badge class="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
				Affichage : Étudiants de test
			</Badge>
		{:else}
			<Badge variant="outline">Affichage : Étudiants réels</Badge>
		{/if}
	</div>
{/if}

<!-- Loading Overlay -->
{#if isLoading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="rounded-lg bg-card p-8 shadow-xl">
			<div class="flex flex-col items-center gap-4">
				<!-- Spinner -->
				<div
					class="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"
				></div>

				<!-- Loading Text -->
				<div class="text-center">
					<p class="text-lg font-medium">Changement de mode...</p>
					<p class="text-sm text-muted-foreground">Rechargement de la page en cours</p>
				</div>
			</div>
		</div>
	</div>
{/if}
