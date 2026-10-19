<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * La carte d'un point ou d'une courbe de la figure : une seule ligne,
	 * `● A = [(1 ; 2)]`, `● d : [y = 3x − 2]`, `● d = [(AB)]`.
	 *
	 * Lot 4b de `docs/wip/atelier-refonte-interface-phase0.md` (validé par David
	 * le 2026-10-18, précisé avec la session de la géométrie). La grammaire de la
	 * carte de fonction (lot 3) : la définition s'édite sur place et vaut à
	 * Entrée ou à la sortie du champ. Sous la ligne, en gris : la nature, puis ce
	 * que vaut une CONSTRUCTION (coordonnées exactes, équation réduite, longueur),
	 * non éditable — c'est la construction qu'on modifie. Un point par
	 * coordonnées n'a que sa nature : il montre déjà ce qu'il vaut.
	 *
	 * Une seule carte pour les deux : ils ne diffèrent que par la fenêtre du
	 * point de couleur (taille ou trait) et l'étiquette d'un point.
	 */
	import type { CurveObject, PointObject } from '$lib/atelier/types';
	import { isPoint } from '$lib/atelier/types';
	import { actionsFor, type ObjectAction } from '$lib/atelier/actions';
	import { useAtelier } from '$lib/atelier/context';
	import { displayName } from '$lib/atelier/names';
	import { forMathlive } from '$lib/atelier/mathfield';
	import { convertLatexToMarkup } from 'mathlive';
	import {
		figureNatureOf,
		figureSeparatorOf,
		figureSummaryOf,
		followsOf,
		stateLabelOf
	} from '$lib/atelier/card-state';
	import { EllipsisVertical, Link2 } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DefinitionField from './DefinitionField.svelte';
	import FigureStylePopover from './FigureStylePopover.svelte';
	import CardActionItems from './CardActionItems.svelte';
	import ValueSlider from './ValueSlider.svelte';

	interface Props {
		object: PointObject | CurveObject;
		selected?: boolean;
		onAction?: (action: ObjectAction, object: PointObject | CurveObject) => void;
	}

	let { object, selected = false, onAction }: Props = $props();

	const atelier = useAtelier();
	const uid = $props.id();

	const name = $derived(displayName(object.name));
	const separator = $derived(figureSeparatorOf(object));
	const nature = $derived(figureNatureOf(atelier, object));
	const stateLabel = $derived(stateLabelOf(object.status));
	const follows = $derived(followsOf(atelier, object));
	/** La note « suit A et B », montrée d'un toucher sur l'icône (téléphone : pas d'infobulle). */
	let showFollows = $state(false);

	/**
	 * Ce que vaut une construction. ⚠️ LaTeX régénéré par `constructionSummaryOf`
	 * depuis le calcul, jamais le texte rangé passé à `{@html}`.
	 */
	const summary = $derived.by(() => {
		const read = figureSummaryOf(atelier, object.name);
		if (read === null) return null;
		const latex = forMathlive(read.latex);
		return { markup: convertLatexToMarkup(latex, { defaultMode: 'inline-math' }), text: read.text };
	});

	const actions = $derived(actionsFor(object, atelier));

	/** Le curseur de position d'un `point_sur` à position écrite (lot 2, PR 3), ou `null`. */
	const positionSlider = $derived(
		isPoint(object) && object.status !== 'error' ? atelier.positionSliderOf(object.name) : null
	);

	/** L'élément choisi emmène le focus ailleurs : le menu ne le ramène pas sur son bouton. */
	let focusLeaves = false;

	function handleCloseAutoFocus(event: Event) {
		if (!focusLeaves) return;
		focusLeaves = false;
		event.preventDefault();
	}

	function handleSelect(action: ObjectAction) {
		// Une carte supprimée confie le focus au panneau (WCAG 2.4.3)
		if (action.id === 'remove') focusLeaves = true;
		onAction?.(action, object);
	}
</script>

<article class="objet figure" class:selected data-kind={object.kind} data-status={object.status}>
	<div class="ligne">
		<!-- Nom et définition, qui passent à la ligne ; les boutons restent à droite -->
		<div class="corps">
			<FigureStylePopover {object} />
			<span class="nom" title={follows ?? undefined}>{name}</span>
			{#if follows}
				<button
					type="button"
					class="lien"
					aria-label={follows}
					aria-expanded={showFollows}
					aria-controls="{uid}-suit"
					title={follows}
					onclick={() => (showFollows = !showFollows)}
				>
					<Link2 class="h-3.5 w-3.5" aria-hidden="true" />
				</button>
			{/if}
			<span class="egal" aria-hidden="true">{separator}</span>
			<div class="membre">
				<DefinitionField
					{object}
					commit="validate"
					showPrefix={false}
					autofocus={selected && object.definition === ''}
				/>
			</div>
		</div>
		<div class="boutons">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="icone"
							aria-label={`Options de ${name}`}
							title={isPoint(object) ? 'Affichage et actions' : 'Actions'}
						>
							<EllipsisVertical class="h-4 w-4" aria-hidden="true" />
						</button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-56" onCloseAutoFocus={handleCloseAutoFocus}>
					{#if isPoint(object)}
						<DropdownMenu.Group>
							<DropdownMenu.GroupHeading>Affichage</DropdownMenu.GroupHeading>
							<!-- Son nom écrit près de lui, dans la vue Géométrie -->
							<DropdownMenu.CheckboxItem
								checked={object.display?.showLabel ?? true}
								onCheckedChange={(on) => atelier.setFigureDisplay(object.name, { showLabel: on })}
							>
								Étiquette
							</DropdownMenu.CheckboxItem>
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
					{/if}
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading>Actions</DropdownMenu.GroupHeading>
						<CardActionItems {actions} onselect={handleSelect} />
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
	{#if stateLabel}
		<p class="etat">{stateLabel}</p>
	{/if}

	{#if positionSlider && isPoint(object)}
		<!-- L5 : la position de M sur son objet, réglée comme une valeur -->
		<ValueSlider {object} slider={positionSlider} />
	{/if}

	{#if follows && showFollows}
		<p class="note" id="{uid}-suit">{follows}</p>
	{/if}

	<!-- La nature sous la ligne, puis ce que vaut une construction (L7) : la
	     ligne de tête garde sa largeur pour le champ (constat du 2026-10-19,
	     « cercle(O ; 3) » réduit à « cer » dans le panneau) -->
	<p class="dessous">
		<span class="type">{nature.label}</span>
		{#if summary}
			<!-- En gris, non éditable : c'est la construction qu'on modifie -->
			<span class="valeur">
				<span class="point-median" aria-hidden="true">·</span>
				<span aria-hidden="true">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- LaTeX regénéré (constructionSummaryOf) -->
					{@html summary.markup}
				</span>
				<span class="sr-only">{summary.text}</span>
			</span>
		{/if}
	</p>

	{#if nature.note}
		<!-- C6 : on ne valide pas, on constate — la courbe reste acceptée -->
		<p class="constat">{nature.note}</p>
	{/if}

	{#if object.message}
		<p class="message">{object.message}</p>
	{/if}
</article>

<style>
	.objet {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.375rem 0.5rem;
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
	/* Le nom et la définition passent à la ligne ; les boutons restent en haut à
	   droite (régression de #1508 : ⋮ passait sous le champ, à gauche). Le champ
	   réserve leur place derrière lui (`::after`) : sur la ligne du nom, rien ne
	   passe sous les boutons ; trop long, il descend sur la ligne suivante, où
	   la réserve se replie et lui laisse toute la largeur */
	.ligne {
		--boutons: 1.75rem;
		position: relative;
		min-width: 0;
	}
	.corps {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
		min-height: 1.75rem;
	}
	.boutons {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		height: 1.75rem;
	}
	.nom {
		font-family: var(--font-serif, serif);
		font-style: italic;
		font-weight: 600;
		font-size: 1.0625rem;
	}
	.egal {
		font-family: var(--font-serif, serif);
		margin-right: 0.125rem;
	}
	/* Ne rétrécit jamais sous son contenu : trop long pour la ligne, il passe
	   dessous, en entier (plafonné à la largeur de la carte) */
	.membre {
		display: flex;
		flex: 1 0 auto;
		min-width: 0;
		max-width: 100%;
	}
	.membre > :global(*) {
		flex: 1 0 auto;
		min-width: 0;
		max-width: 100%;
	}
	.membre::after {
		content: '';
		flex: 0 1000 var(--boutons);
		/* Compte dans la largeur du champ : c'est elle qui décide du retour à la ligne */
		width: var(--boutons);
		min-width: 0;
	}
	/* La nature, discrète : elle se lit, elle ne se clique pas */
	.type {
		font-size: 0.625rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.point-median {
		margin: 0 0.25rem;
	}
	.etat {
		flex-shrink: 0;
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}
	.lien,
	.icone {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-muted-foreground);
		cursor: pointer;
	}
	.icone {
		/* Cible d'au moins 28 px (WCAG 2.5.8) */
		min-width: 1.75rem;
		min-height: 1.75rem;
	}
	.lien {
		min-width: 1.5rem;
		min-height: 1.5rem;
	}
	.lien:hover,
	.icone:hover {
		background: var(--color-muted);
	}
	.lien:focus-visible,
	.icone:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	/* Sous la ligne, alignées sur le nom (après le point de couleur) */
	.dessous,
	.constat,
	.note,
	.message {
		margin: 0 0 0 1.75rem;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
	[data-status='error'] .message {
		color: var(--color-destructive);
	}
</style>
