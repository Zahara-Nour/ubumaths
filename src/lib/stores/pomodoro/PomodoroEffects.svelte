<!--
	PomodoroEffects
	===============

	Headless-ish global mount for Pomodoro side effects.

	Renders only a visually-hidden aria-live region. The `$effect` drains
	`pomodoroStore.pendingTransitions`, fires the bell + browser notif
	(when enabled), and updates the announcement text.

	Cross-tab dedup: queue entries from a peer tab carry `isRemote: true`.
	Aria-live still fires on every tab so screen-reader users hear the
	transition wherever they are, but bell + browser notif fire only on
	the originating tab — preventing N concurrent dings when several
	tabs are open.

	Mounted in `(protected)/+layout.svelte` so the side effects fire
	regardless of which authenticated page the user is currently looking
	at.
-->

<script lang="ts">
	import { pomodoroStore } from '$lib/stores/pomodoro/pomodoro.svelte';
	import { playBell, showPhaseNotification } from '$lib/stores/pomodoro/effects';
	import type { PomodoroPhase } from '$lib/stores/pomodoro/logic';

	const PHASE_ANNOUNCEMENTS: Record<PomodoroPhase, string> = {
		work: 'Pomodoro de travail commencé',
		short_break: 'Pause courte commencée',
		long_break: 'Pause longue commencée'
	};

	// Single drainer for the whole app — keeps sound / notif / aria-live in
	// one place and avoids races between several consumers.
	let announcement = $state('');

	$effect(() => {
		const transitions = pomodoroStore.pendingTransitions;
		if (transitions.length === 0) return;

		const latest = transitions[transitions.length - 1];
		announcement = PHASE_ANNOUNCEMENTS[latest.phase];

		// Audio + browser notification only on the originating tab to
		// avoid duplication across open tabs of the same origin.
		if (!latest.isRemote) {
			if (pomodoroStore.settings.soundEnabled) playBell();
			if (pomodoroStore.settings.notificationsEnabled) showPhaseNotification(latest.phase);
		}

		pomodoroStore.clearPendingTransitions();
	});
</script>

<!-- Visually hidden global aria-live region for phase announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
	{announcement}
</div>
