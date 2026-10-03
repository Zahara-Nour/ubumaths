<!--
	CourseCardBack
	==============

	Verso d'une carte de cours : UNE seule source (`courseCardBackParts`), partagée
	par FlashCard (révision SRS) et CourseCardView (entraînement, aperçus).
	Étapes écrites (mode A) OU étapes générées (mode B), plus le feedback.
	Le texte passe par CorrectionView : concis par défaut (ADR 0017).
-->

<script lang="ts">
	import type { ResolvedCorrection } from '$lib/questions/types';
	import { courseCardBackParts } from '$lib/questions/course-card';
	import type { GenericFunctionConfig } from '$lib/mathAST';
	import CorrectionView from './CorrectionView.svelte';
	import GeneratedStepsCorrection from './GeneratedStepsCorrection.svelte';

	interface Props {
		correction: ResolvedCorrection | undefined;
		/** Fonctions déclarées par le modèle (`P(x)`), pour les formules `~…~` ; absent : défauts */
		genericFunctions?: GenericFunctionConfig;
	}

	let { correction, genericFunctions }: Props = $props();

	const parts = $derived(courseCardBackParts(correction));
</script>

<div class="space-y-3" data-testid="course-card-back">
	{#if parts.generatedSteps}
		<GeneratedStepsCorrection steps={parts.generatedSteps} />
	{/if}
	{#if parts.text}
		<!-- Concise par défaut, interrupteur « Voir le détail » (ADR 0017) -->
		<CorrectionView markdown={parts.text} {genericFunctions} />
	{/if}
</div>
