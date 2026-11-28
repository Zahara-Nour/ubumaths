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
	 * - L'état affiché est celui du COMPTE (`enabled`, lu côté serveur dans
	 *   `user_preferences`), jamais celui du navigateur : sur un autre appareil,
	 *   l'interrupteur dit la même chose que les listes d'élèves affichées
	 *
	 * USAGE:
	 * ```svelte
	 * <TestModeToggle currentUserIsTest={profile.is_test} enabled={data.teacherTestMode} />
	 * ```
	 */

	import { Badge } from '#lib/components/ui/badge/index.ts';

	// Props
	let {
		currentUserIsTest = false,
		enabled = false
	}: { currentUserIsTest?: boolean; enabled?: boolean } = $props();

	// État affiché : celui du compte, basculé le temps de l'enregistrement
	let pendingValue = $state<boolean | null>(null);
	let shown = $derived(pendingValue ?? enabled);

	// Loading state
	let isLoading = $state(false);

	// Handle toggle
	async function handleToggle() {
		const newValue = !enabled;
		isLoading = true;
		pendingValue = newValue;

		try {
			const response = await fetch('/api/test-mode', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: newValue })
			});

			if (!response.ok) {
				console.error('[TestModeToggle] Failed to sync test mode with server');
				pendingValue = null;
				isLoading = false;
				return;
			}

			await response.json();

			// Rechargement complet : les listes d'élèves sont relues avec le nouveau mode
			window.location.reload();
		} catch (error) {
			console.error('[TestModeToggle] Error syncing test mode:', error);
			pendingValue = null;
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
				checked={shown}
				onchange={handleToggle}
				class="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-ring"
			/>
		</label>

		{#if shown}
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
