<!--
	Une lecture en français
	=======================

	Rend une lecture de `$lib/mathAST/structure` (`readingOf`) : le texte de
	liaison tel quel, les formules en `math-span`, les mots du dictionnaire en
	mots cliquables (`LexiconTerm` : la même fiche que dans un énoncé, au niveau
	posé par la page). Une clé absente du dictionnaire : le mot sans lien.

	Sens inverse (Q10) : survoler (ou atteindre au clavier) un segment appelle
	`onhighlight` avec la sous-expression qu'il désigne, `null` en le quittant.
	Au clavier, chaque segment est un arrêt : un mot cliquable par son bouton,
	le texte et les formules par eux-mêmes (nommés par leur texte). L'encadré
	reste tant que la fiche d'un mot est ouverte, comme à la souris.

	`interactive={false}` (légendes du corpus) : texte seul, sans mot cliquable,
	sans arrêt clavier ni sens inverse. MathLive est chargé par la page.
-->
<script lang="ts">
	import { readLexicon } from '$lib/components/markdown/lexicon-context';
	import LexiconTerm from '$lib/components/markdown/nodes/LexiconTerm.svelte';
	import { lexiconRuntime } from '$lib/lexicon/runtime-store.svelte';
	import type { Reading, ReadingSegment } from '$lib/mathAST/structure';

	// Types
	interface Props {
		reading: Reading;
		/** Sous-expression désignée par le segment survolé, `null` en le quittant */
		onhighlight?: (id: number | null) => void;
		/** Faux : texte seul (pas de mot cliquable, pas d'arrêt clavier, pas de sens inverse) */
		interactive?: boolean;
	}

	// Constantes
	const CARD_SELECTOR = '[role="dialog"]';

	// Variables
	let { reading, onhighlight, interactive = true }: Props = $props();

	const lexicon = readLexicon();
	let root = $state<HTMLSpanElement>();
	/** Le focus est parti dans la fiche d'un mot : l'encadré reste jusqu'à ce qu'il en sorte */
	let keptByCard = false;

	// Fonctions
	/** Le mot a une fiche (même règle que `LexiconTerm`) : son bouton est l'arrêt clavier */
	function isLinked(key: string): boolean {
		const grade = lexicon();
		const runtime = lexiconRuntime();
		return grade !== null && runtime !== null && runtime.lexiconCard([key], grade).length > 0;
	}

	/** Nom accessible d'un segment de texte ou de formule : son texte */
	function labelOf(segment: ReadingSegment): string {
		return segment.kind === 'formula' ? segment.latex.replace(/-/g, '−') : segment.text.trim();
	}

	function enter(id: number) {
		onhighlight?.(id);
	}

	function leave() {
		onhighlight?.(null);
	}

	/**
	 * Le focus part : l'encadré reste si le pointeur est encore sur le segment,
	 * ou si le focus entre dans la fiche du mot (clic ou Entrée).
	 */
	function blur(event: FocusEvent) {
		if (event.currentTarget instanceof Element && event.currentTarget.matches(':hover')) return;
		if (event.relatedTarget instanceof Element && event.relatedTarget.closest(CARD_SELECTOR)) {
			keptByCard = true;
			return;
		}
		leave();
	}

	/** Le focus sort de la fiche ailleurs que vers la lecture (Échap y revient) : l'encadré part */
	function handleDocumentFocusIn(event: FocusEvent) {
		if (!keptByCard) return;
		const target = event.target;
		if (target instanceof Element && target.closest(CARD_SELECTOR)) return;
		keptByCard = false;
		if (!(target instanceof Node && root?.contains(target))) leave();
	}
</script>

<svelte:document onfocusin={handleDocumentFocusIn} />

<!-- Aucun blanc entre les segments : les espaces sont dans leur texte -->
{#if interactive}<span class="structure-reading" bind:this={root}
		>{#each reading.segments as segment, i (i)}{#if segment.kind === 'word' && isLinked(segment.key)}<span
					class="reading-segment"
					data-node={segment.node}
					role="presentation"
					onpointerenter={() => enter(segment.node)}
					onpointerleave={leave}
					onfocusin={() => enter(segment.node)}
					onfocusout={blur}><LexiconTerm ids={[segment.key]}>{segment.text}</LexiconTerm></span
				>{:else if labelOf(segment) === ''}{segment.kind === 'formula'
					? ''
					: segment.text}{:else}<span
					class="reading-segment"
					data-node={segment.node}
					role="button"
					tabindex="0"
					aria-label={labelOf(segment)}
					onpointerenter={() => enter(segment.node)}
					onpointerleave={leave}
					onfocusin={() => enter(segment.node)}
					onfocusout={blur}
					>{#if segment.kind === 'formula'}<math-span>{segment.latex}</math-span
						>{:else}{segment.text}{/if}</span
				>{/if}{/each}</span
	>{:else}<span class="structure-reading"
		>{#each reading.segments as segment, i (i)}{#if segment.kind === 'formula'}<math-span
					>{segment.latex}</math-span
				>{:else}{segment.text}{/if}{/each}</span
	>{/if}

<style>
	.reading-segment {
		border-radius: 0.25rem;
	}

	.reading-segment:hover,
	.reading-segment:focus-visible {
		background: light-dark(rgb(251 191 36 / 0.18), rgb(251 191 36 / 0.14));
	}
</style>
