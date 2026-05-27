<!--
	PomodoroEffects
	===============

	Headless-ish global mount for Pomodoro side effects.

	Renders only a visually-hidden aria-live region. The `$effect` drains
	`pomodoroStore.pendingTransitions`, fires the bell + browser notif
	(when enabled), and updates the announcement text.

	Mounted in `(protected)/+layout.svelte` so the side effects fire
	regardless of which authenticated page the user is currently looking
	at — the v1 page-local behaviour was a documented limitation.
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

	// Single drainer for the whole app — keeps sound/notif/aria-live in
	// one place and avoids races between several consumers.
	let announcement = $state('');

	$effect(() => {
		const transitions = pomodoroStore.pendingTransitions;
		if (transitions.length === 0) return;

		const latest = transitions[transitions.length - 1];
		announcement = PHASE_ANNOUNCEMENTS[latest];

		if (pomodoroStore.settings.soundEnabled) playBell();
		if (pomodoroStore.settings.notificationsEnabled) showPhaseNotification(latest);

		pomodoroStore.clearPendingTransitions();
	});
</script>

<!-- Visually hidden global aria-live region for phase announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
	{announcement}
</div>
