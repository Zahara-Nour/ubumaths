<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * Un objet de l'atelier : son nom, sa définition, son état, ses actions.
	 *
	 * Les actions sont attachées ICI, sur l'objet, et jamais dans une barre de
	 * menus globale — c'est ce qui fait la progressivité 6ᵉ → terminale (§3).
	 *
	 * Fonctions, valeurs, suites et listes ont chacune leur carte, sur une ligne
	 * (`FunctionCard`, lot 3 de la refonte ; `ValueCard`, `SequenceCard`,
	 * `ListCard`, lot 4a) ; points et courbes gardent ici leur vue repliée /
	 * développée, jusqu'au lot 4b.
	 */
	import type { AtelierObject } from '$lib/atelier/types';
	import { actionsFor, type ObjectAction } from '$lib/atelier/actions';
	import { useAtelier } from '$lib/atelier/context';
	import { isFunction, isList, isSequence, isValue } from '$lib/atelier/types';
	import FunctionCard from './FunctionCard.svelte';
	import ValueCard from './ValueCard.svelte';
	import SequenceCard from './SequenceCard.svelte';
	import ListCard from './ListCard.svelte';
	import { astOf, pointCoordinatesOf } from '$lib/atelier/parse';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { convertLatexToMarkup, convertLatexToSpeakableText } from 'mathlive';
	import { forMathlive } from '$lib/atelier/mathfield';
	import { displayName } from '$lib/atelier/names';
	import { studentDefinitionOf } from '$lib/atelier/letter';
	import { intervalLabelOf } from '$lib/atelier/interval';
	import DefinitionField from './DefinitionField.svelte';
	import { curveNatureOf } from '$lib/atelier/curve-nature';

	interface Props {
		object: AtelierObject;
		selected?: boolean;
		onSelect?: (name: string) => void;
		onAction?: (action: ObjectAction, object: AtelierObject) => void;
		/** « Tabuler » (tableur, lot 3) : écrire le tableau dans la grille ; ce qui a été fait, ou le refus. */
		onTabulate?: (
			name: string,
			bounds: { from: string; to: string; step: string }
		) => { text: string; failed: boolean };
	}

	let { object, selected = false, onSelect, onAction, onTabulate }: Props = $props();

	const atelier = useAtelier();

	/** Ouvrir ou refermer la carte. */
	function handleHeaderClick() {
		onSelect?.(object.name);
	}

	function handleActionClick(action: ObjectAction) {
		if (action.disabledReason !== undefined) return;
		onAction?.(action, object);
	}

	/** ⚠️ Avec l'atelier : sans lui, `actionsFor` retombe sur le catalogue de repli. */
	const actions = $derived(actionsFor(object, atelier));

	/** Les libellés français des types — l'interface ne parle pas anglais. */
	const KIND_LABELS: Partial<Record<AtelierObject['kind'], string>> = {
		point: 'point',
		curve: 'courbe'
	};

	/**
	 * La nature d'une courbe (« droite », « cercle »…, C1 et C2) et le constat
	 * d'une courbe vide (C6), recalculés à chaque changement — jamais rangés.
	 */
	const nature = $derived(object.kind === 'curve' ? curveNatureOf(atelier, object.name) : null);

	/**
	 * Le signe entre le nom et la définition d'un objet de la figure : la carte
	 * se lit comme la saisie, « d : y = 3x − 2 », « A = (1 ; 2) » (G3, G5).
	 */
	const separator = $derived(object.kind === 'curve' ? ':' : object.kind === 'point' ? '=' : null);

	/** Un point : ses deux coordonnées, chacune régénérée depuis son arbre. */
	function pointLatex(o: AtelierObject): string | null {
		const coordinates = pointCoordinatesOf(o.definition);
		if (coordinates === null) return null;
		const [x, y] = coordinates.map((c) => astOf(c, o.provenance ?? 'url', atelier.functionNames));
		if (x === null || y === null) return null;
		return `\\left(${toLatex(x)}\\,;\\,${toLatex(y)}\\right)`;
	}

	/**
	 * La définition en écriture mathématique (C1), ou `null` si elle ne se lit
	 * pas — elle s'affiche alors en texte, telle que l'élève l'a tapée.
	 *
	 * ⚠️ Toujours REGÉNÉRÉE par `toLatex` depuis l'arbre, jamais le texte saisi
	 * passé tel quel à `{@html}` : une définition peut venir d'un lien reçu, et
	 * seul notre générateur garantit un LaTeX sans commande arbitraire.
	 */
	const rendered = $derived.by(() => {
		if (object.definition.trim() === '') return null;
		if (object.kind === 'point') {
			const latex = pointLatex(object);
			if (latex === null) return null;
			const shownPoint = forMathlive(latex);
			return {
				markup: convertLatexToMarkup(shownPoint, { defaultMode: 'inline-math' }),
				spoken: convertLatexToSpeakableText(shownPoint)
			};
		}
		// (Les fonctions ont leur carte, `FunctionCard`, qui fait ce même travail.)
		const ast = astOf(object.definition, object.provenance ?? 'url', atelier.functionNames);
		if (ast === null) return null;
		const latex = forMathlive(toLatex(ast));
		return {
			markup: convertLatexToMarkup(latex, { defaultMode: 'inline-math' }),
			// Le rendu est fait de glyphes : un lecteur d'écran lit ceci à la place
			spoken: convertLatexToSpeakableText(latex)
		};
	});

	/** L'ensemble d'une fonction définie sur un intervalle (`sur [0 ; +∞[`), ou `null`. */
	const intervalLabel = $derived(intervalLabelOf(object));

	/** Les objets dont on saisit la définition dans la carte développée. */
	const editable = $derived(object.kind === 'point' || object.kind === 'curve');

	/** Ce que l'élève lit quand l'objet ne peut rien produire. */
	const stateLabel = $derived.by(() => {
		switch (object.status) {
			case 'error':
				return 'erreur';
			case 'pending':
				return 'en attente';
			case 'incomplete':
				return 'à compléter';
			default:
				return null;
		}
	});
</script>

{#if isFunction(object)}
	<FunctionCard {object} {selected} {onAction} {onTabulate} />
{:else if isValue(object)}
	<ValueCard {object} {selected} {onAction} />
{:else if isSequence(object)}
	<SequenceCard {object} {selected} {onAction} />
{:else if isList(object)}
	<ListCard {object} {selected} {onAction} />
{:else}
	<article class="objet" class:selected data-status={object.status}>
		<div class="tete">
			<button type="button" class="entete" onclick={handleHeaderClick}>
				<span class="nom">{displayName(object.name)}</span>
				{#if separator}
					<!-- Lu, pas affiché : la carte se lit comme celle d'une fonction — le nom,
				     puis l'équation ou les coordonnées (revue de la PR 2 de la géométrie) -->
					<span class="signe sr-only">{separator}</span>
				{/if}
				<span class="definition">
					{#if rendered}
						<span aria-hidden="true">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -- LaTeX regénéré par toLatex, voir `rendered` -->
							{@html rendered.markup}
						</span>
						<span class="sr-only">{rendered.spoken}</span>
					{:else}
						{studentDefinitionOf(atelier, object) || '…'}
					{/if}
					{#if intervalLabel}
						<span class="intervalle">sur {intervalLabel}</span>
					{/if}
				</span>
				<span class="type">{nature?.label ?? KIND_LABELS[object.kind] ?? ''}</span>
				{#if stateLabel}
					<span class="etat">{stateLabel}</span>
				{/if}
			</button>
		</div>

		{#if nature?.note}
			<!-- C6 : on ne valide pas, on constate — la courbe reste acceptée -->
			<p class="constat">{nature.note}</p>
		{/if}

		{#if selected && editable}
			<DefinitionField {object} />
		{/if}
		{#if object.message}
			<!-- Le refus d'une carte `f⁻¹` cite des formules `$…$` (réciproques par morceau) -->
			<p class="message">{object.message}</p>
		{/if}

		{#if selected}
			<div class="actions">
				{#each actions as action (action.id)}
					<!--
					`aria-disabled` et non `disabled` : un bouton désactivé sort de
					l'ordre de tabulation, donc sa raison n'est jamais lue au clavier ni
					par un lecteur d'écran — or c'est justement elle qui dit à l'élève ce
					qui lui manque. Il reste atteignable, et le geste ne fait rien.
				-->
					<button
						type="button"
						class="action"
						aria-disabled={action.disabledReason !== undefined}
						aria-describedby={action.disabledReason
							? `${object.name}-${action.id.replace(':', '-')}-raison`
							: undefined}
						onclick={() => handleActionClick(action)}
					>
						{action.label}
					</button>
					{#if action.disabledReason}
						<span id="{object.name}-{action.id.replace(':', '-')}-raison" class="raison">
							{action.disabledReason}
						</span>
					{/if}
				{/each}
			</div>
		{/if}
	</article>
{/if}

<style>
	.objet {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.5rem 0.625rem;
		border: 1px solid transparent;
		border-radius: 0.5rem;
	}
	.objet:hover {
		border-color: var(--color-border);
	}
	.objet.selected {
		border-color: var(--color-primary);
		background: var(--color-card);
	}

	.tete {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
	}

	.entete:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}

	.entete {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	.nom {
		font-style: italic;
		font-weight: 600;
		font-size: 1.0625rem;
	}
	.signe {
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}
	.definition {
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
		overflow-wrap: anywhere;
	}
	.intervalle {
		margin-left: 0.25em;
	}
	.type {
		font-size: 0.625rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}
	.etat {
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}

	.message {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
	[data-status='error'] .message {
		color: var(--color-destructive);
	}
	/* Un constat, pas une erreur : la couleur du texte courant atténué */
	.constat {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.action {
		font-size: 0.75rem;
		/* Cible d'au moins 28 px : les actions se multiplient avec les listes
		   partenaires (WCAG 2.5.8, audit a11y du lot 5) */
		min-height: 1.75rem;
		padding: 0.1875rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		cursor: pointer;
	}
	.action[aria-disabled='true'] {
		opacity: 0.55;
		cursor: not-allowed;
		border-style: dashed;
	}

	.raison {
		flex-basis: 100%;
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}
</style>
