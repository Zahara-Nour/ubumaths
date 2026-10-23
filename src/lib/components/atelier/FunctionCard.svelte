<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * La carte d'une fonction : une seule ligne, `● f(x) = [champ]`.
	 *
	 * Lot 3 de `docs/archive/wip/atelier-refonte-interface-phase0.md` (demande de David du
	 * 2026-10-18) : plus de vue développée. Le membre de droite s'édite sur place
	 * et vaut à Entrée ou à la sortie du champ ; le point de couleur ouvre
	 * couleur et trait ; un menu rassemble l'affichage (tangente, aire) et les
	 * actions. Ce qui se LIT (le point de tangence, l'aire) reste sous la ligne,
	 * seulement quand il est allumé.
	 *
	 * Une carte qui SUIT une autre fonction (`f′`, `f⁻¹`) ne s'édite pas : sa
	 * formule est calculée, et une icône de lien dit ce qu'elle suit.
	 */
	import { tick } from 'svelte';
	import type { FunctionObject } from '$lib/atelier/types';
	import { actionsFor, actionMovesFocus, type ObjectAction } from '$lib/atelier/actions';
	import { useAtelier } from '$lib/atelier/context';
	import { useGrapheurStore } from '$lib/stores/grapheur-context';
	import { astOf } from '$lib/atelier/parse';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { convertLatexToMarkup, convertLatexToSpeakableText } from 'mathlive';
	import { forMathlive } from '$lib/atelier/mathfield';
	import { derivativeOf, displayName, reciprocalOf } from '$lib/atelier/names';
	import { derivativeAstOf } from '$lib/atelier/engine';
	import { INTERNAL_LETTER, renameVariableIn, typedLetterOf } from '$lib/atelier/letter';
	import { intervalLabelOf } from '$lib/atelier/interval';
	import { integralToggle, tangentToggle } from '$lib/atelier/curve-toggles';
	import { tabulationDefaults } from '$lib/atelier/tabulate';
	import { EllipsisVertical, Eye, EyeOff, Link2 } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import DefinitionField from './DefinitionField.svelte';
	import CurveSettings from './CurveSettings.svelte';
	import CurveStylePopover from './CurveStylePopover.svelte';
	import FormulaText from './FormulaText.svelte';
	import CardActionItems from './CardActionItems.svelte';

	interface Props {
		object: FunctionObject;
		selected?: boolean;
		onAction?: (action: ObjectAction, object: FunctionObject) => void;
		/** « Tabuler » (tableur, lot 3) : écrire le tableau dans la grille ; ce qui a été fait, ou le refus. */
		onTabulate?: (
			name: string,
			bounds: { from: string; to: string; step: string }
		) => { text: string; failed: boolean };
	}

	let { object, selected = false, onAction, onTabulate }: Props = $props();

	const atelier = useAtelier();
	const graph = useGrapheurStore();
	const uid = $props.id();

	const name = $derived(displayName(object.name));
	const letter = $derived(typedLetterOf(atelier, object));

	/** La fonction dont cette carte est la dérivée (`f′` → `f`), ou `null`. */
	const derivative = $derived(derivativeOf(object.name));
	/** La fonction dont cette carte est la réciproque (`f⁻¹` → `f`), ou `null`. */
	const reciprocal = $derived(reciprocalOf(object.name));
	const editable = $derived(derivative === null && reciprocal === null);

	/** Ce qu'elle suit, dit en toutes lettres (infobulle, lecteur d'écran, note). */
	const follows = $derived(
		derivative !== null
			? `dérivée de ${displayName(derivative.base)} — elle suit ${displayName(derivative.base)}`
			: reciprocal !== null
				? `réciproque de ${reciprocal} — elle suit ${reciprocal}`
				: null
	);
	/** La note « elle suit f », montrée d'un toucher sur l'icône (téléphone : pas d'infobulle). */
	let showFollows = $state(false);

	/**
	 * La formule d'une carte qui suit, en écriture mathématique — toujours
	 * REGÉNÉRÉE par `toLatex` depuis l'arbre, jamais le texte rangé passé à
	 * `{@html}` (même règle que les autres cartes, voir `ObjectCard`).
	 */
	const rendered = $derived.by(() => {
		if (editable) return null;
		const derived = derivative ? derivativeAstOf(atelier, object.name) : null;
		const ast =
			derived !== null
				? derived.ok
					? derived.ast
					: null
				: astOf(object.definition, object.provenance ?? 'url', atelier.functionNames);
		if (ast === null) return null;
		const shown = letter !== INTERNAL_LETTER ? renameVariableIn(ast, INTERNAL_LETTER, letter) : ast;
		const latex = forMathlive(toLatex(shown));
		return {
			markup: convertLatexToMarkup(latex, { defaultMode: 'inline-math' }),
			spoken: convertLatexToSpeakableText(latex)
		};
	});

	const intervalLabel = $derived(intervalLabelOf(object));

	const display = $derived(object.plotted ? object.display : undefined);
	/** Ce qui se lit sous la ligne : seulement quand tangente ou aire sont allumées. */
	const analysisShown = $derived(
		display !== undefined && (display.tangentAt !== null || display.integral !== null)
	);

	/** Les actions de la fonction, avec leurs raisons d'indisponibilité. */
	const actions = $derived(actionsFor(object, atelier));

	/** Pourquoi tangente et aire ne s'allument pas encore. */
	const NOT_PLOTTED = 'Trace d’abord la courbe (👁).';
	/** Les réglages d'affichage du menu, dans leur ordre. */
	const TOGGLES = ['Tangente', 'Aire sous la courbe', 'Lecture graphique'] as const;

	function toggleTangent(on: boolean) {
		atelier.setDisplay(object.name, tangentToggle(on, graph.viewport));
	}

	function toggleIntegral(on: boolean) {
		atelier.setDisplay(object.name, integralToggle(on, graph.viewport));
	}

	// -------------------------------------------------------------------------
	// Le menu et ce qu'il ouvre
	// -------------------------------------------------------------------------

	/** La carte : le focus revient à son bouton de menu quand la fenêtre de Tabuler se ferme. */
	let card = $state<HTMLElement | null>(null);
	/**
	 * L'action choisie emmène le focus ailleurs (console préparée, fenêtre de
	 * Tabuler) : le menu ne doit pas le ramener sur son bouton en se fermant.
	 */
	let focusLeaves = false;

	function handleCloseAutoFocus(event: Event) {
		if (!focusLeaves) return;
		focusLeaves = false;
		event.preventDefault();
	}

	/** Une action disponible (`CardActionItems` garde le menu ouvert sur une indisponible). */
	function handleSelect(action: ObjectAction) {
		if (action.id === 'table' && onTabulate) {
			focusLeaves = true;
			void openTabulate();
			return;
		}
		// Une carte supprimée confie le focus au panneau (WCAG 2.4.3) : le bouton
		// du menu, lui, n'existe plus ; Propriétés le donne au panneau déplié
		if (actionMovesFocus(action.id)) focusLeaves = true;
		onAction?.(action, object);
	}

	/** La fenêtre de Tabuler (« de / à / pas »), pré-remplie (Q-L3-3). */
	let tabulating = $state(false);
	let tabulateBounds = $state({ from: '', to: '', step: '' });
	let tabulateRefusal = $state<string | null>(null);
	/** Ce qu'a donné le dernier tableau, tant que la grille n'a pas changé depuis. */
	let tabulateResult = $state<{ text: string; revision: number } | null>(null);
	const shownTabulate = $derived(
		tabulateResult !== null && tabulateResult.revision === atelier.revision ? tabulateResult : null
	);

	async function openTabulate() {
		tabulateBounds = tabulationDefaults(object);
		tabulateRefusal = null;
		// Après la fermeture du menu : les deux se disputeraient le focus
		await tick();
		tabulating = true;
	}

	function handleTabulateSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!onTabulate) return;
		const result = onTabulate(object.name, { ...tabulateBounds });
		if (result.failed) {
			tabulateRefusal = result.text;
			return;
		}
		// Réussi : la fenêtre se referme — une seconde Entrée n'écrirait pas un
		// second tableau, et le focus passe dans la grille (revue du lot 3 du tableur)
		tabulateResult = { text: result.text, revision: atelier.revision };
		tabulating = false;
	}

	function handleTabulateCloseFocus(event: Event) {
		// Le tableau écrit, le focus est déjà dans la grille : on ne l'en retire pas
		if (tabulateResult !== null && tabulateResult.revision === atelier.revision) {
			event.preventDefault();
			return;
		}
		event.preventDefault();
		card?.querySelector<HTMLButtonElement>(`button[aria-label="Options de ${name}"]`)?.focus();
	}
</script>

<article bind:this={card} class="objet fonction" class:selected data-status={object.status}>
	<div class="ligne">
		<!-- Nom et définition, qui passent à la ligne ; les boutons restent à droite -->
		<div class="corps">
			<CurveStylePopover {object} />
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
			<span class="variable" aria-hidden="true">({letter}) =</span>
			<div class="membre">
				{#if editable}
					<DefinitionField
						{object}
						commit="validate"
						showPrefix={false}
						autofocus={selected && object.definition === ''}
					/>
				{:else}
					<span class="formule">
						{#if rendered}
							<span aria-hidden="true">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- LaTeX regénéré par toLatex, voir `rendered` -->
								{@html rendered.markup}
							</span>
							<span class="sr-only">{rendered.spoken}</span>
						{:else}
							…
						{/if}
						{#if intervalLabel}
							<span class="intervalle">sur {intervalLabel}</span>
						{/if}
					</span>
				{/if}
			</div>
		</div>
		<div class="boutons">
			<!-- C3 : tracer en un clic, sans changer de vue -->
			<button
				type="button"
				class="icone"
				aria-pressed={object.plotted === true}
				aria-label={`Tracer ${name}`}
				title="Tracer sur le graphique"
				onclick={() => atelier.setPlotted(object.name, !object.plotted)}
			>
				{#if object.plotted}
					<Eye class="h-4 w-4" />
				{:else}
					<EyeOff class="h-4 w-4" />
				{/if}
			</button>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="icone"
							aria-label={`Options de ${name}`}
							title="Affichage et actions"
						>
							<EllipsisVertical class="h-4 w-4" aria-hidden="true" />
						</button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-60" onCloseAutoFocus={handleCloseAutoFocus}>
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading>Affichage</DropdownMenu.GroupHeading>
						{#if display === undefined}
							<!--
							Courbe non tracée : tangente et aire restent dans le menu, atteignables
							au clavier, annoncées indisponibles avec leur raison (revue de #1488 :
							un élément `disabled` est sauté, et une raison hors des éléments du
							menu n'est jamais lue).
						-->
							{#each TOGGLES as label (label)}
								<DropdownMenu.Item
									class="indisponible"
									onSelect={(event) => event.preventDefault()}
								>
									{#snippet child({ props })}
										<div
											{...props}
											role="menuitemcheckbox"
											aria-checked="false"
											aria-disabled="true"
											aria-label={label}
											aria-describedby="{uid}-trace-dabord"
										>
											<span class="item">
												<span>{label}</span>
												<span class="raison">{NOT_PLOTTED}</span>
											</span>
										</div>
									{/snippet}
								</DropdownMenu.Item>
							{/each}
							<span class="sr-only" id="{uid}-trace-dabord">{NOT_PLOTTED}</span>
						{:else}
							<DropdownMenu.CheckboxItem
								checked={display.tangentAt != null}
								onCheckedChange={toggleTangent}
							>
								Tangente
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={display.integral != null}
								onCheckedChange={toggleIntegral}
							>
								Aire sous la courbe
							</DropdownMenu.CheckboxItem>
							<!-- Lot 3 bis : les f(a) de la console et un point glissant, en pointillés -->
							<DropdownMenu.CheckboxItem
								checked={display.showReading}
								onCheckedChange={(on) => atelier.setDisplay(object.name, { showReading: on })}
							>
								Lecture graphique
							</DropdownMenu.CheckboxItem>
						{/if}
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading>Actions</DropdownMenu.GroupHeading>
						<CardActionItems {actions} onselect={handleSelect} />
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	{#if follows && showFollows}
		<p class="note" id="{uid}-suit">{follows}</p>
	{/if}

	{#if object.message}
		<!-- Le refus d'une carte `f⁻¹` cite des formules `$…$` (réciproques par morceau) -->
		<p class="message">
			{#if reciprocal !== null}<FormulaText text={object.message} />{:else}{object.message}{/if}
		</p>
	{/if}

	{#if analysisShown && display}
		<CurveSettings {object} {display} compact />
	{/if}

	{#if onTabulate}
		<!-- Toujours là, vide sans rien à dire : une région vivante créée avec son
		     texte n'est pas toujours lue. Un `span` : `main p` impose sa taille -->
		<span class="tabuler-resultat" role="status">{shownTabulate?.text ?? ''}</span>
	{/if}
</article>

<Dialog.Root bind:open={tabulating}>
	<Dialog.Content class="sm:max-w-sm" onCloseAutoFocus={handleTabulateCloseFocus}>
		<Dialog.Header>
			<Dialog.Title>Tabuler {name}</Dialog.Title>
			<Dialog.Description
				>Le tableau de valeurs s’écrit dans la grille des Données.</Dialog.Description
			>
		</Dialog.Header>
		<form class="tabuler" onsubmit={handleTabulateSubmit}>
			<!-- Pas d'`inputmode="decimal"` : sur iOS ce clavier n'a ni touche Entrée, ni « - » -->
			<label>
				<span>de</span>
				<input
					type="text"
					autocomplete="off"
					enterkeyhint="go"
					bind:value={tabulateBounds.from}
					aria-label={`Début du tableau de ${name}`}
				/>
			</label>
			<label>
				<span>à</span>
				<input
					type="text"
					autocomplete="off"
					enterkeyhint="go"
					bind:value={tabulateBounds.to}
					aria-label={`Fin du tableau de ${name}`}
				/>
			</label>
			<label>
				<span>pas</span>
				<input
					type="text"
					autocomplete="off"
					enterkeyhint="go"
					bind:value={tabulateBounds.step}
					aria-label={`Pas du tableau de ${name}`}
				/>
			</label>
			<button type="submit" class="tabuler-valider">Tabuler</button>
		</form>
		<p class="refus" role="alert">{tabulateRefusal ?? ''}</p>
	</Dialog.Content>
</Dialog.Root>

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
		--boutons: 3.75rem;
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
	.variable {
		font-family: var(--font-serif, serif);
		font-style: italic;
		white-space: nowrap;
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
	.formule {
		font-size: 0.9375rem;
		overflow-wrap: anywhere;
	}
	.intervalle {
		margin-left: 0.25em;
		color: var(--color-muted-foreground);
	}

	.icone,
	.lien {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		/* Cible d'au moins 28 px (WCAG 2.5.8) */
		min-width: 1.75rem;
		min-height: 1.75rem;
		border: none;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-muted-foreground);
		cursor: pointer;
	}
	.lien {
		/* Plus discrète : elle accompagne le nom, elle ne commande rien */
		min-width: 1.5rem;
		min-height: 1.5rem;
	}
	.icone[aria-pressed='true'] {
		color: var(--color-foreground);
		background: var(--color-muted);
	}
	.icone:hover,
	.lien:hover {
		background: var(--color-muted);
	}
	.icone:focus-visible,
	.lien:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}

	.note,
	.message {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
	[data-status='error'] .message {
		color: var(--color-destructive);
	}

	.item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.raison {
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}
	:global([data-slot='dropdown-menu-item'].indisponible) {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.tabuler {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem;
		font-size: 0.875rem;
	}
	.tabuler label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	.tabuler input {
		width: 5rem;
		min-height: 2rem;
		padding: 0 0.375rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		font: inherit;
	}
	.tabuler-valider {
		min-height: 2rem;
		padding: 0 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		font: inherit;
		cursor: pointer;
	}
	.refus {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-destructive);
	}
	.refus:empty {
		display: none;
	}
	.tabuler-resultat {
		font-size: 0.8125rem;
	}
	.tabuler-resultat:empty {
		display: none;
	}
</style>
