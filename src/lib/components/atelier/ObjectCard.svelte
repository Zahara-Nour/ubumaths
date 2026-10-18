<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * Un objet de l'atelier : son nom, sa définition, son état, ses actions.
	 *
	 * Les actions sont attachées ICI, sur l'objet, et jamais dans une barre de
	 * menus globale — c'est ce qui fait la progressivité 6ᵉ → terminale (§3).
	 *
	 * Une FONCTION a sa propre carte, sur une ligne (`FunctionCard`, lot 3 de la
	 * refonte) ; les autres objets gardent ici leur vue repliée / développée,
	 * jusqu'au lot 4.
	 */
	import type { AtelierObject } from '$lib/atelier/types';
	import { actionsFor, defaultPartner, partnersOf, type ObjectAction } from '$lib/atelier/actions';
	import MySelect from '$lib/components/MySelect.svelte';
	import { useAtelier } from '$lib/atelier/context';
	import { isFunction, isSequence } from '$lib/atelier/types';
	import FunctionCard from './FunctionCard.svelte';
	import { astOf, pointCoordinatesOf } from '$lib/atelier/parse';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { curveColorValue } from '$lib/grapheur/colors';
	import { convertLatexToMarkup, convertLatexToSpeakableText } from 'mathlive';
	import { forMathlive } from '$lib/atelier/mathfield';
	import { displayName } from '$lib/atelier/names';
	import { studentDefinitionOf } from '$lib/atelier/letter';
	import { intervalLabelOf } from '$lib/atelier/interval';
	import { Eye, EyeOff } from '@lucide/svelte';
	import DefinitionField from './DefinitionField.svelte';
	import ValueSlider from './ValueSlider.svelte';
	import SequenceSettings from './SequenceSettings.svelte';
	import { constantOf } from '$lib/atelier/atelier.svelte';
	import { curveNatureOf } from '$lib/atelier/curve-nature';
	import {
		constructionLatex,
		constructionNatureOf,
		constructionSummaryOf
	} from '$lib/atelier/construction';
	import { readConstruction } from '$lib/atelier/construction-read';

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

	/**
	 * ⚠️ Avec l'atelier : sans lui, `actionsFor` retombe sur le catalogue de
	 * repli, et les actions par partenaire (« Nuage avec M », « Diagramme avec
	 * effectifs M ») comme la bascule « Retirer le diagramme » n'atteignaient
	 * jamais l'écran (constaté au lot 5 des outils statistiques).
	 */
	const partners = $derived(partnersOf(object, atelier));
	/**
	 * La partenaire choisie sur cette carte (Q46), gardée par l'atelier pour
	 * suivre un renommage (Q48) ; sinon celle par défaut.
	 */
	const partner = $derived.by(() => {
		const chosen = atelier.partnerChoiceOf(object.name);
		return chosen !== undefined && partners.includes(chosen)
			? chosen
			: defaultPartner(object, atelier);
	});

	const actions = $derived(actionsFor(object, atelier, partner ?? undefined));
	/** Les actions de l'objet lui-même, puis celles faites avec la partenaire */
	const ownActions = $derived(actions.filter((a) => a.partner === undefined));
	const partnerActions = $derived(actions.filter((a) => a.partner !== undefined));

	/** Les libellés français des types — l'interface ne parle pas anglais. */
	const KIND_LABELS: Record<AtelierObject['kind'], string> = {
		value: 'valeur',
		function: 'fonction',
		sequence: 'suite',
		list: 'liste',
		point: 'point',
		curve: 'courbe'
	};

	/**
	 * Une construction (géométrie, lot 2, L7) : sa nature (« point », « segment »…),
	 * lue sur sa définition, et ce qu'elle vaut — coordonnées, longueur, équation.
	 */
	const constructionNature = $derived(constructionNatureOf(object));

	/**
	 * La nature d'une courbe (« droite », « cercle »…, C1 et C2) et le constat
	 * d'une courbe vide (C6), recalculés à chaque changement — jamais rangés.
	 */
	const nature = $derived(
		object.kind === 'curve'
			? curveNatureOf(atelier, object.name)
			: constructionNature !== null
				? { label: constructionNature }
				: null
	);

	const summary = $derived.by(() => {
		const read = constructionSummaryOf(atelier, object.name);
		if (read === null) return null;
		const latex = forMathlive(read.latex);
		return { markup: convertLatexToMarkup(latex, { defaultMode: 'inline-math' }), text: read.text };
	});

	/**
	 * Le signe entre le nom et la définition d'un objet de la figure : la carte
	 * se lit comme la saisie, « d : y = 3x − 2 », « A = (1 ; 2) » (G3, G5).
	 */
	const separator = $derived(
		object.kind === 'curve' && constructionNature === null
			? ':'
			: object.kind === 'point' || object.kind === 'curve'
				? '='
				: null
	);

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
		if (object.definition.trim() === '' || object.kind === 'list') return null;
		// Une construction, telle qu'écrite : régénérée depuis sa lecture (`constructionLatex`)
		if (constructionNature !== null) {
			const read = readConstruction(object.definition, object.provenance ?? 'url');
			if (read === null || !read.ok) return null;
			const shownConstruction = forMathlive(constructionLatex(read.call));
			return {
				markup: convertLatexToMarkup(shownConstruction, { defaultMode: 'inline-math' }),
				spoken: read.call.text
			};
		}
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

	/** La couleur de la courbe, si la suite est tracée (C1, C2). */
	const curveColor = $derived(
		isSequence(object) && object.plotted && object.display
			? curveColorValue(object.display.color)
			: null
	);

	/**
	 * Les objets dont on saisit la définition dans la carte (C11 : pas les
	 * listes). Les suites depuis le lot 5b.
	 */
	const editable = $derived(
		object.kind === 'value' ||
			object.kind === 'sequence' ||
			object.kind === 'point' ||
			object.kind === 'curve'
	);

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
{:else}
	<article class="objet" class:selected data-status={object.status}>
		<div class="tete">
			{#if object.kind === 'sequence'}
				<span
					class="pastille"
					style={curveColor ? `background: ${curveColor}; border-color: ${curveColor}` : undefined}
					aria-hidden="true"
				></span>
			{/if}
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
				<span class="type">{nature?.label ?? KIND_LABELS[object.kind]}</span>
				{#if stateLabel}
					<span class="etat">{stateLabel}</span>
				{/if}
			</button>
			{#if object.kind === 'sequence'}
				<!-- C3 : tracer en un clic, sans ouvrir la carte ni changer de vue -->
				<button
					type="button"
					class="oeil"
					aria-pressed={object.plotted === true}
					aria-label={`Tracer ${displayName(object.name)}`}
					title="Tracer sur le graphique"
					onclick={() => atelier.setPlotted(object.name, !object.plotted)}
				>
					{#if object.plotted}
						<Eye class="h-4 w-4" />
					{:else}
						<EyeOff class="h-4 w-4" />
					{/if}
				</button>
			{/if}
		</div>

		{#if nature?.note}
			<!-- C6 : on ne valide pas, on constate — la courbe reste acceptée -->
			<p class="constat">{nature.note}</p>
		{/if}

		{#if summary}
			<!-- L7 : ce que vaut la construction ; la mise en page des cartes revient au lot 4 de la refonte -->
			<p class="valeur">
				<span aria-hidden="true">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- LaTeX regénéré par toLatex (constructionSummaryOf) -->
					{@html summary.markup}
				</span>
				<span class="sr-only">{summary.text}</span>
			</p>
		{/if}

		{#if selected && editable}
			<DefinitionField {object} />
		{/if}
		<!-- Le curseur d'une valeur (§4) — ou pourquoi elle n'en a pas -->
		{#if selected && object.kind === 'value' && object.definition.trim() !== ''}
			{#if object.unit !== undefined}
				<p class="sans-curseur">
					Grandeur en {object.unit} : pas de curseur (on ne fait pas glisser une longueur).
				</p>
			{:else if constantOf(object.definition, object.provenance, atelier.functionNames) === null}
				<p class="sans-curseur">
					{object.name} est calculée à partir d'autres objets : pas de curseur, il effacerait sa formule.
				</p>
			{:else if object.slider}
				<ValueSlider {object} slider={object.slider} />
			{/if}
		{/if}

		<!-- Une suite : mode, rang, premier terme, et son tracé (§5 U1, U2) -->
		{#if selected && isSequence(object)}
			<SequenceSettings {object} />
		{/if}

		{#if object.message}
			<!-- Le refus d'une carte `f⁻¹` cite des formules `$…$` (réciproques par morceau) -->
			<p class="message">{object.message}</p>
		{/if}

		{#if selected}
			<div class="actions">
				{#each ownActions as action (action.id)}
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
				<!-- Une partenaire à la fois (Q46) : au plus 11 boutons (Q78, Q119), quel que soit le
			     nombre de listes. Avec plusieurs listes, l'élève la choisit ici. -->
				{#if partner !== null}
					<!-- Un groupe NOMMÉ : le lecteur d'écran sait avec quelle liste agissent
				     ces boutons (audit a11y, WCAG 1.3.1) -->
					<div class="partenaire" role="group" aria-label={`Avec la liste ${partner}`}>
						<div class="avec">
							{#if partners.length === 1}
								<span>Avec la liste {partner}</span>
							{:else}
								<span aria-hidden="true">Avec la liste</span>
								<!-- Le nom du bouton contient la liste CHOISIE (WCAG 4.1.2) -->
								<MySelect
									type="single"
									triggerAriaLabel={`Avec la liste ${partner}`}
									value={partner}
									onValueChange={(name) => atelier.choosePartner(object.name, name)}
									items={partners.map((name) => ({ value: name, label: name }))}
									placeholder="Liste partenaire"
									fitContent
								/>
							{/if}
						</div>
						{#each partnerActions as action (action.id)}
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
	.pastille {
		flex-shrink: 0;
		width: 0.625rem;
		height: 0.625rem;
		margin-top: 0.4375rem;
		border-radius: 9999px;
		/* Cercle VIDE tant que la fonction n'est pas tracée (C2) : forme et
		   couleur s'opposent à la pastille pleine, lisible en projection */
		background: transparent;
		border: 1.5px solid var(--color-muted-foreground);
	}
	.oeil {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		/* Cible d'au moins 28 px (WCAG 2.5.8), comme les actions */
		min-width: 1.75rem;
		min-height: 1.75rem;
		border: none;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-muted-foreground);
		cursor: pointer;
	}
	.oeil[aria-pressed='true'] {
		color: var(--color-foreground);
		/* Une marque visible indépendante du dessin de l'icône */
		background: var(--color-muted);
	}
	.oeil:focus-visible,
	.entete:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	.oeil:hover {
		background: var(--color-muted);
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

	.sans-curseur {
		margin: 0;
		font-size: 0.8125rem;
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
	.constat,
	.valeur {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.partenaire {
		display: flex;
		flex-wrap: wrap;
		gap: inherit;
		flex-basis: 100%;
	}

	.avec {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-basis: 100%;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
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
