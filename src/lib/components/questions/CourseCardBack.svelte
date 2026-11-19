<!--
	CourseCardBack
	==============

	Verso d'une carte de cours : UNE seule source (`courseCardBackParts`), partagée
	par FlashCard (révision SRS) et CourseCardView (entraînement, aperçus).
	Étapes écrites (mode A) OU étapes générées (mode B), plus le feedback.
	Le texte passe par CorrectionView : concis par défaut (ADR 0017).
	Aucun mot du dictionnaire : c'est une correction (R2, mots-cliquables).
-->

<script lang="ts">
	import type { ResolvedCorrection } from '#lib/questions/types.ts';
	import { courseCardBackParts } from '#lib/questions/course-card.ts';
	import type { GenericFunctionConfig } from '#lib/mathAST/index.ts';
	import CorrectionView from './CorrectionView.svelte';
	import GeneratedStepsCorrection from './GeneratedStepsCorrection.svelte';
	import { provideLexicon } from '#lib/components/markdown/lexicon-context.ts';

	interface Props {
		correction: ResolvedCorrection | undefined;
		/** Fonctions déclarées par le modèle (`P(x)`), pour les formules `~…~` ; absent : défauts */
		genericFunctions?: GenericFunctionConfig;
	}

	let { correction, genericFunctions }: Props = $props();

	// Correction : aucun mot du dictionnaire (R2, chantier mots-cliquables)
	provideLexicon(() => null);

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
