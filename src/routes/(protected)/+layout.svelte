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
	- Magasin de consentement (`consent`) : rempli ici pour TOUTES les pages
	  protégées, pas seulement l'espace élève (E67 : sur « Mon profil »,
	  « Acheter » un avatar n'était pas grisé pour un élève sans consentement).

	No chrome of its own — each section (organisation, dashboard, …)
	owns its own visual layout below this one.
-->

<script lang="ts">
	import type { Snippet } from 'svelte';
	import PomodoroEffects from '#lib/stores/pomodoro/PomodoroEffects.svelte';
	import { consent } from '#lib/stores/consent.svelte.ts';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Le magasin suit les données du serveur (rechargées après une réponse d'âge, un
	// consentement accordé…) ; le serveur reste seul juge (`requireConsent`).
	$effect(() => {
		consent.set(data.consentStatus);
	});
</script>

<PomodoroEffects />
{@render children?.()}
