<script lang="ts">
	/**
	 * Bouton « Fermer le clavier », posé juste au-dessus du clavier virtuel MathLive tant
	 * qu'il est ouvert.
	 *
	 * Le clavier par défaut de MathLive (123, symboles, abc, grec) n'a aucune touche pour se
	 * fermer : seule la perte du focus le referme. Sur un téléphone en paysage, il couvrait
	 * presque tout l'écran sans issue visible (essais iPhone du 2026-11-03). Une touche
	 * ajoutée dans le clavier élargirait sa dernière rangée, différente d'un onglet à
	 * l'autre, et la ferait déborder sur un écran étroit : d'où un bouton au-dessus, comme
	 * la barre « OK » du clavier d'iOS.
	 *
	 * Monté une fois, dans le layout racine.
	 */
	import { ChevronDown } from '@lucide/svelte';

	/** Écart entre le bouton et le haut du clavier, en px */
	const GAP = 6;

	/** Hauteur du clavier ouvert, 0 quand il est fermé */
	let keyboardHeight = $state(0);

	/**
	 * Fermeture demandée, pas encore faite : MathLive attend ≈ 300 ms, et un événement de
	 * géométrie dans l'intervalle (onglets du clavier remis à zéro au `focusout` de la question,
	 * `FillBlanksInput`) ferait réapparaître le bouton. Levé jusqu'à la fermeture réelle, ou
	 * jusqu'à ce qu'un champ MathLive reprenne le focus.
	 */
	let closing = false;

	/**
	 * Le clavier (`window.mathVirtualKeyboard`) n'existe qu'une fois MathLive chargé : on s'y
	 * accroche au premier focus venu, puis on suit son ouverture et sa taille.
	 */
	$effect(() => {
		let keyboard: typeof window.mathVirtualKeyboard | undefined;
		const update = () => {
			if (!keyboard?.visible) closing = false;
			keyboardHeight = keyboard?.visible && !closing ? keyboard.boundingRect.height : 0;
		};
		const attach = (event?: FocusEvent) => {
			if (closing && event?.target instanceof Element && event.target.tagName === 'MATH-FIELD') {
				closing = false;
				update();
			}
			if (keyboard || !window.mathVirtualKeyboard) return;
			keyboard = window.mathVirtualKeyboard;
			keyboard.addEventListener('virtual-keyboard-toggle', update);
			keyboard.addEventListener('geometrychange', update);
			update();
		};
		attach();
		document.addEventListener('focusin', attach);
		return () => {
			document.removeEventListener('focusin', attach);
			keyboard?.removeEventListener('virtual-keyboard-toggle', update);
			keyboard?.removeEventListener('geometrychange', update);
		};
	});

	/**
	 * Le focus passe au bouton : le champ le perd, MathLive ferme alors le clavier lui-même
	 * (≈ 300 ms), et un nouveau toucher sur le champ le rouvrira. Le bouton disparu, le focus
	 * retombe sur la page.
	 *
	 * ⚠️ Ni `blur()` sur le champ, ni `mathVirtualKeyboard.hide()` (MathLive 0.111, mesuré au
	 * navigateur) : `blur()` lève la garde interne `blurInProgress`, si bien que le champ ne
	 * note pas sa perte de focus et se croit encore actif ; à la fermeture du clavier, il
	 * reprend alors le focus et le rouvre. `hide()` seul fait de même. Un vrai déplacement du
	 * focus, lui, passe par le chemin normal (comme toucher une case de signe).
	 * Sur iOS, toucher un bouton ne lui donne pas le focus : d'où le `focus()` explicite.
	 */
	function closeKeyboard(event: MouseEvent) {
		if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
		closing = true;
		keyboardHeight = 0;
	}
</script>

{#if keyboardHeight > 0}
	<button
		type="button"
		class="math-keyboard-close fixed right-2 flex min-h-10 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground shadow-md"
		style:bottom="{keyboardHeight + GAP}px"
		onclick={closeKeyboard}
	>
		<ChevronDown class="size-4" aria-hidden="true" />
		Fermer le clavier
	</button>
{/if}

<style>
	/* Au-dessus du clavier MathLive (z-index 105 par défaut) */
	.math-keyboard-close {
		z-index: 110;
	}
</style>
