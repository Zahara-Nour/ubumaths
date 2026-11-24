<script lang="ts">
	import '#lib/utils/mathlive-styles.ts';
	/**
	 * Un message dont les formules sont écrites `$…$` (refus de `.réciproque` :
	 * « sur [0 ; +∞[ : $f^{-1}(x) = \sqrt{x}$ »), formules composées.
	 *
	 * ⚠️ Seulement pour des messages que l'atelier a écrits lui-même — formules
	 * venues de `toLatex` (arbre du moteur), jamais d'un texte saisi — OU relus
	 * du `localStorage` (lignes de Calcul gardées) : ceux-là sont NON FIABLES, et
	 * `loadCalcHistory` retire `formulas` dès qu'un `$…$` échoue à la liste
	 * blanche `isSafeLatex` (même découpage, `messageParts`). Une formule que
	 * MathLive ne sait pas composer reste en texte, échappée.
	 */
	import { convertLatexToMarkup } from 'mathlive';
	import { speakLatexInFrench } from '#lib/utils/formula-speech/french.ts';
	import { messageParts } from '#lib/atelier/reciprocal.ts';

	interface Props {
		text: string;
	}

	let { text }: Props = $props();

	const parts = $derived(
		messageParts(text).map((part) => {
			if (!part.math) return { ...part, markup: null, spoken: '' };
			try {
				return {
					...part,
					markup: convertLatexToMarkup(part.text, { defaultMode: 'inline-math' }),
					spoken: speakLatexInFrench(part.text)
				};
			} catch {
				return { ...part, markup: null, spoken: '' };
			}
		})
	);
</script>

{#each parts as part, index (index)}{#if part.markup !== null}<span class="formule"
			><span aria-hidden="true" data-latex={part.text}
				><!-- eslint-disable-next-line svelte/no-at-html-tags -- toLatex ou liste blanche, voir l'en-tête -->{@html part.markup}</span
			><span class="sr-only">{part.spoken}</span></span
		>{:else}{part.text}{/if}{/each}
