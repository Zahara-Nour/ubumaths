<!--
	InCorrection
	============

	Enveloppe d'un rendu de correction qui ne passe pas par `CorrectionView`
	(aperçu de l'éditeur de modèle, « Solution » d'un exercice) : pose le
	contexte « correction » (`provideInCorrection`), pour que ```engrenages y
	tourne comme dans `CorrectionView`.

	@module components/markdown/InCorrection
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { provideInCorrection } from './correction-context';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	provideInCorrection();
</script>

{@render children()}
