<script lang="ts">
	/**
	 * Un objet de l'atelier : son nom, sa définition, son état, ses actions.
	 *
	 * Les actions sont attachées ICI, sur l'objet, et jamais dans une barre de
	 * menus globale — c'est ce qui fait la progressivité 6ᵉ → terminale (§3).
	 */
	import type { AtelierObject } from '$lib/atelier/types';
	import { actionsFor, defaultPartner, partnersOf, type ObjectAction } from '$lib/atelier/actions';
	import MySelect from '$lib/components/MySelect.svelte';
	import { useAtelier } from '$lib/atelier/context';
	import { isFunction } from '$lib/atelier/types';
	import { astOf } from '$lib/atelier/parse';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { curveColorValue } from '$lib/grapheur/colors';
	import { convertLatexToMarkup, convertLatexToSpeakableText } from 'mathlive';
	import { forMathlive } from '$lib/atelier/mathfield';
	import { Eye, EyeOff } from '@lucide/svelte';
	import DefinitionField from './DefinitionField.svelte';
	import CurveSettings from './CurveSettings.svelte';

	interface Props {
		object: AtelierObject;
		selected?: boolean;
		onSelect?: (name: string) => void;
		onAction?: (action: ObjectAction, object: AtelierObject) => void;
	}

	let { object, selected = false, onSelect, onAction }: Props = $props();

	const atelier = useAtelier();

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
		list: 'liste'
	};

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
		const ast = astOf(object.definition, object.provenance ?? 'url', atelier.functionNames);
		if (ast === null) return null;
		const latex = forMathlive(toLatex(ast));
		return {
			markup: convertLatexToMarkup(latex, { defaultMode: 'inline-math' }),
			// Le rendu est fait de glyphes : un lecteur d'écran lit ceci à la place
			spoken: convertLatexToSpeakableText(latex)
		};
	});

	/** La couleur de la courbe, si la fonction est tracée (C1, C2). */
	const curveColor = $derived(
		isFunction(object) && object.plotted && object.display
			? curveColorValue(object.display.color)
			: null
	);

	/** Les objets dont on saisit la définition dans la carte (C11 : pas les listes ; les suites au lot 5). */
	const editable = $derived(object.kind === 'function' || object.kind === 'value');

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

<article class="objet" class:selected data-status={object.status}>
	<div class="tete">
		{#if object.kind === 'function'}
			<span
				class="pastille"
				style={curveColor ? `background: ${curveColor}; border-color: ${curveColor}` : undefined}
				aria-hidden="true"
			></span>
		{/if}
		<button type="button" class="entete" onclick={() => onSelect?.(object.name)}>
			<span class="nom">{object.name}</span>
			<span class="definition">
				{#if rendered}
					<span aria-hidden="true">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- LaTeX regénéré par toLatex, voir `rendered` -->
						{@html rendered.markup}
					</span>
					<span class="sr-only">{rendered.spoken}</span>
				{:else}
					{object.definition || '…'}
				{/if}
			</span>
			<span class="type">{KIND_LABELS[object.kind]}</span>
			{#if stateLabel}
				<span class="etat">{stateLabel}</span>
			{/if}
		</button>
		{#if object.kind === 'function'}
			<!-- C3 : tracer en un clic, sans ouvrir la carte ni changer de vue -->
			<button
				type="button"
				class="oeil"
				aria-pressed={object.plotted === true}
				aria-label={`Tracer ${object.name}`}
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

	{#if selected && editable}
		<DefinitionField {object} />
	{/if}

	<!-- « Sur le graphique » : seulement pour une fonction tracée (§1 S1–S5) -->
	{#if selected && isFunction(object) && object.plotted && object.display}
		<CurveSettings {object} display={object.display} />
	{/if}

	{#if object.message}
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
					onclick={() => {
						if (action.disabledReason !== undefined) return;
						onAction?.(action, object);
					}}
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
							onclick={() => {
								if (action.disabledReason !== undefined) return;
								onAction?.(action, object);
							}}
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
	.definition {
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
		overflow-wrap: anywhere;
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
