<!--
	(protected) Layout
	==================

	Authentication is enforced by `+layout.server.ts` (the load function
	rejects unauthenticated requests). This visual layout exists only to
	host app-wide side-effect components that should run for every
	authenticated user, regardless of the specific protected route.

	Currently:
	- <PomodoroEffects /> — drains pomodoro phase transitions
	  (bell + browser notification + aria-live announcement).

	No chrome of its own — each section (organisation, dashboard, …)
	owns its own visual layout below this one.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import PomodoroEffects from '$lib/stores/pomodoro/PomodoroEffects.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<PomodoroEffects />
{@render children?.()}
