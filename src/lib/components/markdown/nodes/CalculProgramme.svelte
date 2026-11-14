<!--
	CalculProgramme.svelte
	======================

	Bloc ```calcul (chantier `blockly`, PR 5b ; journal `docs/wip/blockly-progress.md`) : l'élève
	assemble un programme de calcul en blocs, l'essaie sur les nombres qu'il veut ; sa réponse est
	son programme écrit en texte (`etatVersTexteCalcul`), jugé par le serveur sur ce qu'il affiche
	pour chaque nombre d'essai.

	- L'éditeur (Blockly, lourd) est chargé à la demande, une fois la carte affichée : les autres
	  questions ne le paient pas. En attendant, et au rendu côté serveur : un cadre d'attente.
	- `départ:` : le programme posé d'avance dans l'espace de travail, à modifier. Il ne devient la
	  réponse qu'au premier changement (un programme de départ non touché n'est pas une réponse).
	- Programme vide → réponse vide (Valider grisé) ; trop long → refusé avant l'envoi, réponse vide.
	- Après la validation : blocs verrouillés, cadre vert ou rouge ; le corrigé (`CalculCorrige`)
	  montre le tableau nombre → résultat.
	- Hors question (aperçu de l'éditeur, cours) : le geste libre, rien de jugé.

	@module components/markdown/nodes/CalculProgramme
-->
<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { LONGUEUR_MAX_PROGRAMME, type TexteLu } from '$lib/shared/blockly/tortue/notation';
	import { CALCUL_UNAVAILABLE, type CalculNode } from '$lib/ubumark/types/calcul';
	import { readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';

	// =============================================================================
	// Types
	// =============================================================================

	interface EditeurProps {
		programme: string;
		readonly?: boolean;
		onprogramme?: (lu: TexteLu) => void;
	}

	interface Props {
		node: CalculNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer */
		showErrors?: boolean;
		class?: string;
	}

	// =============================================================================
	// Constantes
	// =============================================================================

	const PROGRAMME_TROP_LONG =
		'Programme trop long : enlève des blocs (une répétition peut en remplacer plusieurs).';

	// =============================================================================
	// Props
	// =============================================================================

	let { node, answer, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	// =============================================================================
	// Variables
	// =============================================================================

	let Editeur = $state<Component<EditeurProps> | null>(null);
	let chargementRate = $state(false);

	/** Programme du geste libre (sans case) */
	let programmeLibre = $state('');

	/** Pourquoi le programme n'est pas une réponse (trop long, bloc inconnu) ; null sinon */
	let refus = $state<string | null>(null);

	// =============================================================================
	// État dérivé
	// =============================================================================

	let spec = $derived(node.spec);
	let verrouille = $derived(answer?.disabled ?? false);
	let verdict = $derived(answer?.isCorrect ?? null);

	/**
	 * Les blocs posés à l'ouverture : la réponse déjà donnée, sinon `départ:` — aussi projeté en
	 * classe (verrouillé sans verdict), jamais une fois jugé (ce n'est pas le programme de l'élève)
	 */
	let programme = $derived.by(() => {
		const donne = answer ? answer.value : programmeLibre;
		if (donne !== '' || verdict !== null) return donne;
		return spec?.depart ?? '';
	});

	// =============================================================================
	// Fonctions
	// =============================================================================

	function handleProgramme(lu: TexteLu): void {
		let valeur = '';
		if (!lu.ok) refus = lu.message;
		else if (lu.texte.length > LONGUEUR_MAX_PROGRAMME) refus = PROGRAMME_TROP_LONG;
		else {
			refus = null;
			valeur = lu.texte;
		}
		if (answer) answer.onChange(valeur);
		else programmeLibre = valeur;
	}

	onMount(() => {
		import('$lib/components/blockly/CalculEditeur.svelte')
			.then((module) => (Editeur = module.default))
			.catch(() => (chargementRate = true));
	});
</script>

{#if spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="calcul-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc calcul : question non affichée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="calcul-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{CALCUL_UNAVAILABLE}
		</div>
	{/if}
{:else}
	<div
		class="calcul-programme my-2 rounded-md border-2 p-2 {verdict === true
			? 'calcul-juste'
			: verdict === false
				? 'calcul-faux'
				: 'border-transparent'} {className}"
	>
		{#if Editeur}
			<Editeur {programme} readonly={verrouille} onprogramme={handleProgramme} />
			<!-- Aussi après la validation : la réponse est vide, l'élève voit pourquoi -->
			{#if refus}
				<p class="mt-2 text-sm text-destructive" role="alert">{refus}</p>
			{/if}
		{:else}
			<!-- Avant l'éditeur (rendu serveur, chargement) -->
			<p
				class="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
				role="status"
			>
				{chargementRate
					? 'Les blocs ne se sont pas chargés : recharge la page.'
					: 'Chargement des blocs…'}
			</p>
		{/if}
	</div>
{/if}

<style>
	.calcul-juste {
		border-color: var(--color-success);
	}

	.calcul-faux {
		border-color: var(--color-destructive);
	}
</style>
