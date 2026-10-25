<!--
	Barre du minuteur d'une diapositive de `/demo/diaporama` : elle se vide au
	rythme du défilement automatique de la diapositive courante (`autoSlide`).
	Posée dans une diapositive, elle n'est visible que quand celle-ci l'est.
-->
<script lang="ts">
	import { getContext } from 'svelte';
	import { DECK_CONTEXT_KEY } from '$lib/slides';
	import type { DeckContext } from '$lib/slides';

	// Variables
	const deck = getContext<DeckContext | undefined>(DECK_CONTEXT_KEY);

	const duration = $derived(deck?.getAutoSlideDuration() ?? 0);
	const remaining = $derived(deck?.getAutoSlideRemaining() ?? 0);
	const ratio = $derived(duration > 0 ? remaining / duration : 0);
	const seconds = $derived(Math.ceil(remaining / 1000));
</script>

<div class="flex w-full max-w-xl items-center gap-3" role="timer" aria-label="Temps restant">
	<span class="h-3 flex-1 overflow-hidden rounded-full bg-muted">
		<span
			class="block h-full rounded-full bg-primary"
			style:width="{ratio * 100}%"
			data-testid="chrono-fill"
		></span>
	</span>
	<span class="min-w-12 text-right text-2xl font-bold tabular-nums">{seconds} s</span>
</div>
