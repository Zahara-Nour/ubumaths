<!--
	CorrectionView
	==============

	Correction concise / détaillée (ADR 0017) : composant commun à tous les
	affichages d'une correction écrite (markdown).

	- S'ouvre CONCISE (D7) — sauf si l'élève a choisi « détaillée » sur cet
	  appareil (Q88, localStorage protégé).
	- Un seul interrupteur « Voir le détail » / « Masquer le détail », absent
	  quand la correction n'a pas de détail (D4) ; bouton natif, `aria-expanded`
	  (D9).
	- Tout est détail (D6) : la vue concise montre la réponse attendue ; sans
	  elle, la version détaillée, sans interrupteur (jamais de correction vide).
	- Marqueur mal formé (D5) : version détaillée pour l'élève, messages
	  d'auteur seulement en contexte auteur (`showAuthoringErrors`).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import type { GenericFunctionConfig } from '$lib/mathAST';
	import { readAuthoringErrors } from '$lib/components/markdown/authoring-errors';
	import { splitCorrectionDetail } from '$lib/questions/correction-detail';
	import { readDetailPreference, writeDetailPreference } from './correction-view-preference';

	interface Props {
		/** Markdown de la correction (variables déjà résolues) */
		markdown: string;
		/** Réponse attendue (markdown), montrée si tout est détail (D6) */
		expectedAnswer?: string;
		/**
		 * Contexte AUTEUR : afficher les marqueurs mal formés. Absent : celui du
		 * rendu parent, sinon contexte élève.
		 */
		showAuthoringErrors?: boolean;
		class?: string;
		/** Fonctions déclarées par le modèle (`P(x)`), pour les formules `~…~` ; absent : défauts */
		genericFunctions?: GenericFunctionConfig;
	}

	let {
		markdown,
		expectedAnswer,
		showAuthoringErrors,
		class: className = '',
		genericFunctions
	}: Props = $props();

	const regionId = $props.id();
	const parentAuthoringErrors = readAuthoringErrors();

	let detailed = $state(false);

	const versions = $derived(splitCorrectionDetail(markdown));
	const showErrors = $derived(
		(showAuthoringErrors ?? parentAuthoringErrors()) && versions.errors.length > 0
	);
	// Tout est détail, sans réponse attendue : la version détaillée, sans interrupteur
	const fallsBackToDetailed = $derived(versions.conciseEmpty && !expectedAnswer?.trim());
	const hasToggle = $derived(versions.hasDetails && !fallsBackToDetailed);
	const displayed = $derived.by(() => {
		if (!versions.hasDetails || detailed || fallsBackToDetailed) return versions.detailed;
		return versions.conciseEmpty ? (expectedAnswer ?? '') : versions.concise;
	});

	onMount(() => {
		detailed = readDetailPreference();
	});

	function handleToggle() {
		detailed = !detailed;
		writeDetailPreference(detailed);
	}
</script>

<div class="space-y-3 {className}" data-testid="correction-view">
	{#if showErrors}
		<div
			class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
			data-authoring-errors
		>
			<p class="font-semibold">Détails de correction mal écrits (l’élève voit tout le détail) :</p>
			<ul class="list-disc pl-5">
				{#each versions.errors as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if hasToggle}
		<div class="flex justify-end">
			<button
				type="button"
				class="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				aria-expanded={detailed}
				aria-controls={regionId}
				onclick={handleToggle}
			>
				{detailed ? 'Masquer le détail' : 'Voir le détail'}
				<ChevronDown
					class="h-4 w-4 transition-transform {detailed ? 'rotate-180' : ''}"
					aria-hidden="true"
				/>
			</button>
		</div>
	{/if}

	<!-- Conteneur de requête : le rappel en marge suit la largeur de la correction -->
	<div id={regionId} class="@container">
		{#if displayed}
			<MarkdownRenderer content={displayed} {showAuthoringErrors} {genericFunctions} />
		{/if}
	</div>
</div>
