<!--
	TortueProgramme.svelte
	======================

	Bloc ```tortue (chantier `blockly`, PR 4b ; journal `docs/wip/blockly-progress.md`) : l'élève
	assemble des blocs tortue, sa réponse est son programme écrit en texte (`etatVersTexte`),
	jugé sur le tracé par le serveur.

	- L'éditeur (Blockly, lourd) est chargé à la demande, une fois la carte affichée : les autres
	  questions ne le paient pas. En attendant, et au rendu côté serveur : le quadrillage seul.
	- `montrer: oui` : la figure à reproduire en gris sur le quadrillage.
	- Programme vide → réponse vide (Valider grisé) ; trop long → refusé avant l'envoi, réponse vide.
	- Après la validation : blocs verrouillés, tracé de l'élève vert ou rouge, l'attendu en
	  pointillés quand il est connu (jamais dans une évaluation notée : `attendu: ?`).
	- Hors question (aperçu de l'éditeur, cours) : le geste libre, rien de jugé.

	@module components/markdown/nodes/TortueProgramme
-->
<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import TortueCanvas from '$lib/components/blockly/TortueCanvas.svelte';
	import { LONGUEUR_MAX_PROGRAMME, type TexteLu } from '$lib/shared/blockly/tortue/notation';
	import { lireProgrammeTortue } from '$lib/shared/blockly/tortue/jugement';
	import type { Segment } from '$lib/shared/blockly/tortue/segments';
	import { readExpectedTortueAnswer } from '$lib/ubumark/utils/tortue-answer';
	import { TORTUE_UNAVAILABLE, type TortueNode } from '$lib/ubumark/types/tortue';
	import { readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';

	// =============================================================================
	// Types
	// =============================================================================

	interface EditeurProps {
		programme: string;
		readonly?: boolean;
		modele?: readonly Segment[] | null;
		attendu?: readonly Segment[] | null;
		verdict?: boolean | null;
		onprogramme?: (lu: TexteLu) => void;
	}

	interface Props {
		node: TortueNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** Réponse attendue de la case (`position | <programme>`) : l'attendu en pointillés */
		expected?: string;
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

	let { node, answer, expected, showErrors, class: className = '' }: Props = $props();

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
	let modele = $derived(spec?.montrer ? spec.modele : null);
	let verrouille = $derived(answer?.disabled ?? false);
	let verdict = $derived(answer?.isCorrect ?? null);
	let programme = $derived(answer ? answer.value : programmeLibre);

	/** L'attendu, après la validation seulement : la réponse attendue, sinon le bloc */
	let attendu = $derived.by((): Segment[] | null => {
		if (verdict === null) return null;
		const reference =
			(expected !== undefined ? readExpectedTortueAnswer(expected)?.attendu : undefined) ??
			spec?.attendu ??
			null;
		if (reference === null) return null;
		const lu = lireProgrammeTortue(reference);
		return lu.ok ? lu.segments : null;
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
		import('$lib/components/blockly/TortueEditeur.svelte')
			.then((module) => (Editeur = module.default))
			.catch(() => (chargementRate = true));
	});
</script>

{#if spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="tortue-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc tortue : question non affichée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="tortue-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{TORTUE_UNAVAILABLE}
		</div>
	{/if}
{:else}
	<div
		class="tortue-programme my-2 rounded-md border-2 p-2 {verdict === true
			? 'tortue-juste'
			: verdict === false
				? 'tortue-faux'
				: 'border-transparent'} {className}"
	>
		{#if Editeur}
			<Editeur
				{programme}
				readonly={verrouille}
				{modele}
				{attendu}
				{verdict}
				onprogramme={handleProgramme}
			/>
			{#if refus && !verrouille}
				<p class="mt-2 text-sm text-destructive" role="alert">{refus}</p>
			{/if}
		{:else}
			<!-- Avant l'éditeur (rendu serveur, chargement) : le quadrillage et la figure -->
			<div class="mx-auto flex max-w-80 flex-col gap-2">
				<TortueCanvas segments={[]} tortue={{ x: 0, y: 0, cap: 0, styloBaisse: true }} {modele} />
				<p class="text-sm text-muted-foreground" role="status">
					{chargementRate
						? 'Les blocs ne se sont pas chargés : recharge la page.'
						: 'Chargement des blocs…'}
				</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.tortue-juste {
		border-color: var(--color-success);
	}

	.tortue-faux {
		border-color: var(--color-destructive);
	}
</style>
