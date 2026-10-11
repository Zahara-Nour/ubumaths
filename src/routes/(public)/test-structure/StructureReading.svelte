<!--
	Une lecture en français
	=======================

	Rend une lecture de `$lib/mathAST/structure` (`readingOf`) : le texte de
	liaison tel quel, les formules en `math-span`, les mots du dictionnaire en
	mots cliquables (`LexiconTerm` : la même fiche que dans un énoncé, au niveau
	posé par la page). Une clé absente du dictionnaire : le mot sans lien.

	Sens inverse (Q10) : survoler (ou atteindre au clavier) un segment appelle
	`onhighlight` avec la sous-expression qu'il désigne, `null` en le quittant.
	MathLive est chargé par la page.
-->
<script lang="ts">
	import LexiconTerm from '$lib/components/markdown/nodes/LexiconTerm.svelte';
	import type { Reading } from '$lib/mathAST/structure';

	// Types
	interface Props {
		reading: Reading;
		/** Sous-expression désignée par le segment survolé, `null` en le quittant */
		onhighlight?: (id: number | null) => void;
	}

	// Variables
	let { reading, onhighlight }: Props = $props();

	// Fonctions
	function enter(id: number) {
		onhighlight?.(id);
	}

	function leave() {
		onhighlight?.(null);
	}

	/** Le focus part (fiche ouverte au clic) : l'encadré reste tant que le pointeur est sur le mot */
	function blur(event: FocusEvent) {
		if (event.currentTarget instanceof Element && event.currentTarget.matches(':hover')) return;
		leave();
	}
</script>

<!-- Aucun blanc entre les segments : les espaces sont dans leur texte -->
<span class="structure-reading"
	>{#each reading.segments as segment, i (i)}<span
			class="reading-segment"
			data-node={segment.node}
			role="presentation"
			onpointerenter={() => enter(segment.node)}
			onpointerleave={leave}
			onfocusin={() => enter(segment.node)}
			onfocusout={blur}
			>{#if segment.kind === 'word'}<LexiconTerm ids={[segment.key]}>{segment.text}</LexiconTerm
				>{:else if segment.kind === 'formula'}<math-span>{segment.latex}</math-span
				>{:else}{segment.text}{/if}</span
		>{/each}</span
>

<style>
	.reading-segment {
		border-radius: 0.25rem;
	}

	.reading-segment:hover {
		background: light-dark(rgb(251 191 36 / 0.18), rgb(251 191 36 / 0.14));
	}
</style>
