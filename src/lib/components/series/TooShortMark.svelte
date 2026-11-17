<script lang="ts">
	/**
	 * Marque « Durée sans doute trop courte » (chantier `durees-trop-courtes`) :
	 * bilan d'un contrôle, panier, éditeur de série. Rien si la durée n'est pas
	 * signalée. Des comptes, jamais un nom.
	 */
	import { Timer } from '@lucide/svelte';
	import {
		TOO_SHORT_LABEL,
		tooShortSentence,
		type QuestionTiming
	} from '$lib/types/evaluation-breakdown';

	let { timing, class: className = '' }: { timing: QuestionTiming | null; class?: string } =
		$props();
</script>

{#if timing?.tooShort}
	<!-- Couleur d'accent sur l'icône seule : le texte garde son contraste -->
	<p class="flex items-start gap-1 text-sm font-normal {className}" data-duree-trop-courte>
		<Timer class="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
		<span><strong>{TOO_SHORT_LABEL}</strong> · {tooShortSentence(timing)}</span>
	</p>
{/if}
