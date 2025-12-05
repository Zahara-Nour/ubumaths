<script lang="ts">
	/**
	 * PythonMigrationPrompt - Prompt to migrate local code to cloud
	 *
	 * Shows a prompt when a user logs in and has local code that could be saved to the cloud.
	 * Only shown once per session to avoid being intrusive.
	 */

	// Imports
	import { Button } from '$lib/components/ui/button';
	import { Cloud, X } from 'lucide-svelte';
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { browser } from '$app/environment';

	// Props
	let {
		isLoggedIn = false,
		onSaveToCloud,
		onDismiss
	}: {
		isLoggedIn: boolean;
		onSaveToCloud?: () => void;
		onDismiss?: () => void;
	} = $props();

	// Constants
	const SESSION_KEY = 'ubumaths-python-migration-dismissed';

	// State
	let isDismissed = $state(false);
	let hasLocalCode = $state(false);

	// Check for local code on mount
	$effect(() => {
		if (browser && isLoggedIn) {
			// Check if already dismissed this session
			const dismissed = sessionStorage.getItem(SESSION_KEY);
			if (dismissed === 'true') {
				isDismissed = true;
				return;
			}

			// Check if there's local code to migrate
			hasLocalCode = pythonStore.hasLocalCodeToMigrate();
		}
	});

	// Derived
	let shouldShow = $derived(isLoggedIn && hasLocalCode && !isDismissed);

	// Functions
	function handleSave(): void {
		onSaveToCloud?.();
		dismiss();
	}

	function dismiss(): void {
		isDismissed = true;
		if (browser) {
			sessionStorage.setItem(SESSION_KEY, 'true');
		}
		onDismiss?.();
	}
</script>

{#if shouldShow}
	<div
		class="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
		role="alert"
	>
		<div class="flex items-center gap-3">
			<Cloud class="size-5 shrink-0 text-primary" />
			<p class="text-sm">Vous avez du code local. Voulez-vous le sauvegarder dans le cloud ?</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="default" size="sm" onclick={handleSave}>Sauvegarder</Button>
			<Button variant="ghost" size="icon" class="size-8" onclick={dismiss} aria-label="Fermer">
				<X class="size-4" />
			</Button>
		</div>
	</div>
{/if}
