<!--
	Pomodoro Page
	=============

	Orchestrates the store-driven UI and the page <title>. Sound, browser
	notification, and aria-live announcement now live in the global
	<PomodoroEffects /> mounted in (protected)/+layout.svelte — they fire
	whether or not this page is on screen.
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { pomodoroStore } from '$lib/stores/pomodoro/pomodoro.svelte';
	import type { PomodoroPhase } from '$lib/stores/pomodoro/logic';

	import PomodoroDisplay from './PomodoroDisplay.svelte';
	import PomodoroControls from './PomodoroControls.svelte';
	import PomodoroSettings from './PomodoroSettings.svelte';

	// ---------------------------------------------------------------------------
	// Page title (<svelte:head>)
	// ---------------------------------------------------------------------------

	const PHASE_TITLE_LABELS: Record<PomodoroPhase, string> = {
		work: 'Travail',
		short_break: 'Pause courte',
		long_break: 'Pause longue'
	};

	/** Format epoch-ms remainder as "MM:SS" for the <title>. */
	function formatTime(ms: number): string {
		const totalSeconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	let pageTitle = $derived.by(() => {
		const status = pomodoroStore.state.status;
		if (status === 'ready') return 'Pomodoro | UbuMaths';
		const time = formatTime(pomodoroStore.remainingMs);
		const phase = PHASE_TITLE_LABELS[pomodoroStore.state.phase];
		return `${time} — ${phase} | UbuMaths`;
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<!-- Page heading -->
	<div>
		<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Pomodoro</h1>
		<p class="text-sm text-muted-foreground">
			Travaillez par intervalles concentrés pour rester productif.
		</p>
	</div>

	<!-- Main card: timer + controls -->
	<Card.Root class="mx-auto w-full max-w-sm">
		<Card.Content class="flex flex-col items-center gap-8 px-6 py-10">
			{#if pomodoroStore.hydrated}
				<PomodoroDisplay />
				<PomodoroControls />
			{:else}
				<!-- Hydration skeleton: prevents FOUC of stale localStorage state -->
				<div class="flex h-48 w-full items-center justify-center">
					<div class="h-10 w-32 animate-pulse rounded-md bg-muted"></div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Settings card -->
	<Card.Root class="mx-auto w-full max-w-sm">
		<Card.Content class="px-6 py-4">
			<PomodoroSettings />
		</Card.Content>
	</Card.Root>
</div>
