<!--
	Admin section layout
	====================

	Wraps every `/dashboard/admin/*` page. When the caller is here through an
	active admin ELEVATION (a teacher stepped up), it shows a sticky amber banner
	with a live mm:ss countdown to the elevation expiry and a "Quitter le mode
	admin" button. A real admin login has no elevation → no banner (they are
	simply admins, not in a temporary elevated mode).

	Countdown approach: `expiresAt` is a Unix epoch in ms (from the server). We
	keep a reactive `now` ($state) refreshed by a 1s interval started in an
	$effect (with cleanup). `remaining`/`countdown` are $derived from it, so the
	mm:ss display ticks without manual DOM work. At 0 the cookie has expired
	server-side; the next navigation will bounce the teacher back to the
	elevation screen.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { LogOut, ShieldCheck } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Reactive clock — refreshed every second by the interval below. Drives the
	// countdown without touching the DOM by hand.
	let now = $state(Date.now());

	// Whether we are in an elevated (step-up) session that warrants the banner.
	let elevated = $derived(data.adminElevation?.active === true);

	// Milliseconds left before the elevation expires (clamped at 0).
	let remainingMs = $derived(
		data.adminElevation?.expiresAt ? Math.max(0, data.adminElevation.expiresAt - now) : 0
	);

	// mm:ss formatting of the remaining time.
	let countdown = $derived.by(() => {
		const totalSeconds = Math.floor(remainingMs / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	});

	// Tick the clock while an elevated banner is shown; clean up on teardown.
	$effect(() => {
		if (!elevated) return;
		const id = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	let revoking = $state(false);

	async function handleRevoke() {
		if (revoking) return;
		revoking = true;
		try {
			const response = await fetch('/api/admin/elevate/revoke', { method: 'POST' });
			if (!response.ok) {
				toaster.error('Impossible de quitter le mode administration. Réessayez.');
				return;
			}
			// Re-run server loads so the dropped cookie is reflected, then leave the
			// admin section (we can no longer access it without re-elevating).
			await invalidateAll();
			await goto('/dashboard');
		} catch {
			toaster.error('Erreur réseau. Réessayez.');
		} finally {
			revoking = false;
		}
	}
</script>

{#if elevated}
	<div
		class="sticky top-0 z-40 border-b border-amber-300 bg-amber-100 text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100"
		role="status"
		aria-live="polite"
	>
		<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2">
			<div class="flex items-center gap-2">
				<ShieldCheck class="h-5 w-5 shrink-0" />
				<span class="font-semibold">Mode administration</span>
				<span class="text-sm text-amber-700 dark:text-amber-200/80">
					· expire dans
					<span class="font-mono tabular-nums" aria-label="Temps restant {countdown}">
						{countdown}
					</span>
				</span>
			</div>
			<Button
				variant="outline"
				size="sm"
				onclick={handleRevoke}
				disabled={revoking}
				class="border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
			>
				<LogOut class="mr-1 h-4 w-4" />
				{revoking ? 'Sortie…' : 'Quitter le mode admin'}
			</Button>
		</div>
	</div>
{/if}

{@render children()}
