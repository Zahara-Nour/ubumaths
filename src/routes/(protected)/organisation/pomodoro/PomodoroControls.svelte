<!--
	PomodoroControls
	================

	Play/Pause · Skip · Reset buttons.
	Reset opens a ConfirmDialog before actually calling pomodoroStore.reset().
-->

<script lang="ts">
	import { Play, Pause, SkipForward, RotateCcw } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { pomodoroStore } from '$lib/stores/pomodoro/pomodoro.svelte';
	import { unlockAudio } from '$lib/stores/pomodoro/effects';

	// ---------------------------------------------------------------------------
	// Reset confirmation dialog state
	// ---------------------------------------------------------------------------
	let resetConfirmOpen = $state(false);

	function requestReset() {
		resetConfirmOpen = true;
	}

	function performReset() {
		pomodoroStore.reset();
	}

	// ---------------------------------------------------------------------------
	// Derived button labels / visibility
	// ---------------------------------------------------------------------------
	let status = $derived(pomodoroStore.state.status);
	let isRunning = $derived(status === 'running');

	/** Label adapts to whether the user is starting fresh, resuming, or pausing. */
	let toggleLabel = $derived(isRunning ? 'Pause' : status === 'paused' ? 'Reprendre' : 'Démarrer');

	function handleToggle() {
		// Unlock the AudioContext from this user-gesture handler so the
		// later auto-transition bell (from a setInterval, not a gesture)
		// is allowed to play on browsers that enforce autoplay policies
		// (Safari especially). Idempotent after the first call.
		unlockAudio();
		if (isRunning) pomodoroStore.pause();
		else pomodoroStore.play();
	}

	/** Skip is disabled from the ready state (guard mirrors the store). */
	let skipDisabled = $derived(status === 'ready');
</script>

<div class="flex flex-wrap items-center justify-center gap-3">
	<!--
		Single Play/Pause button: we keep ONE DOM node and swap label + icon
		in place, so keyboard focus survives the state change. Two separate
		conditional buttons would drop focus to <body> when the active one
		unmounts.
	-->
	<Button
		size="lg"
		variant={isRunning ? 'secondary' : 'default'}
		class="gap-2 px-8"
		onclick={handleToggle}
		aria-label={toggleLabel}
	>
		{#if isRunning}
			<Pause class="h-5 w-5" aria-hidden="true" />
		{:else}
			<Play class="h-5 w-5" aria-hidden="true" />
		{/if}
		{toggleLabel}
	</Button>

	<!-- Skip -->
	<Button
		size="lg"
		variant="outline"
		class="gap-2"
		disabled={skipDisabled}
		onclick={() => pomodoroStore.skip()}
		aria-label="Passer à la phase suivante"
	>
		<SkipForward class="h-4 w-4" aria-hidden="true" />
		Passer
	</Button>

	<!-- Reset -->
	<Button
		size="lg"
		variant="ghost"
		class="gap-2 text-muted-foreground hover:text-foreground"
		onclick={requestReset}
		aria-label="Réinitialiser le cycle"
	>
		<RotateCcw class="h-4 w-4" aria-hidden="true" />
		Réinitialiser
	</Button>
</div>

<!-- Reset confirmation -->
<ConfirmDialog
	bind:open={resetConfirmOpen}
	title="Réinitialiser le cycle"
	description="Réinitialiser le cycle en cours ? Le compteur du jour est conservé."
	confirmLabel="Réinitialiser"
	cancelLabel="Annuler"
	variant="destructive"
	onConfirm={performReset}
/>
