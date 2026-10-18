<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * La carte d'une valeur : une seule ligne, `a = [champ]`.
	 *
	 * Lot 4a de `docs/wip/atelier-refonte-interface-phase0.md` (décision de David
	 * du 2026-10-18) : la grammaire de la carte de fonction (lot 3). La
	 * définition s'édite sur place et vaut à Entrée ou à la sortie du champ ;
	 * une grandeur s'écrit avec son unité (`v = 3 m/s`).
	 *
	 * Le curseur est SOUS la ligne quand la valeur est un paramètre — un autre
	 * objet la cite, point ou courbe compris ; sinon il est caché, et le menu
	 * l'affiche. ⚠️ La règle lit `object.slider` : le modèle l'omet pour une
	 * grandeur (D4, `build()`) et l'omettra pour une mesure (`aire(…)`,
	 * géométrie) — la carte ne juge jamais la FORME de la définition. Seule
	 * exception, d'avant ce lot : une valeur CALCULÉE (`b + 1`) n'a pas de
	 * curseur, il effacerait sa formule.
	 */
	import { tick } from 'svelte';
	import type { ValueObject } from '$lib/atelier/types';
	import { actionsFor, type ObjectAction } from '$lib/atelier/actions';
	import { useAtelier } from '$lib/atelier/context';
	import { constantOf } from '$lib/atelier/atelier.svelte';
	import { displayName } from '$lib/atelier/names';
	import { stateLabelOf } from '$lib/atelier/card-state';
	import { EllipsisVertical } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import DefinitionField from './DefinitionField.svelte';
	import ValueSlider from './ValueSlider.svelte';
	import SliderSettings from './SliderSettings.svelte';
	import CardActionItems from './CardActionItems.svelte';
	import UnavailableItem from './UnavailableItem.svelte';
	import { valueAnswerOf } from '$lib/atelier/calcul';
	import { forMathlive } from '$lib/atelier/mathfield';
	import { convertLatexToMarkup } from 'mathlive';

	interface Props {
		object: ValueObject;
		selected?: boolean;
		onAction?: (action: ObjectAction, object: ValueObject) => void;
	}

	let { object, selected = false, onAction }: Props = $props();

	const atelier = useAtelier();

	const name = $derived(displayName(object.name));
	/** « à compléter », « en attente »… : une valeur vide sans message le dit quand même. */
	const stateLabel = $derived(stateLabelOf(object.status));

	/**
	 * Une mesure nommée (géométrie, lot 2, L4 et L7) : ce qu'elle vaut — ce que
	 * Calcul répond quand on tape son nom (`valueAnswerOf`), une seule source de
	 * vérité (revue de la PR 2). `S = aire(A, B, C)` → 6.
	 */
	const measure = $derived.by(() => {
		if (object.status !== 'ok' || atelier.measuredOf(object) === null) return null;
		const read = valueAnswerOf(atelier, object.name);
		if (read === null) return null;
		const latex = forMathlive(read.latex);
		return { markup: convertLatexToMarkup(latex, { defaultMode: 'inline-math' }), text: read.text };
	});

	/** Les objets qui la citent : elle est alors un paramètre, son curseur reste affiché. */
	const citedBy = $derived(atelier.dependents(object.name));

	/**
	 * Le curseur que l'élève a affiché depuis le menu (valeur qui n'est pas un
	 * paramètre) : retenu avec l'atelier, il survit au rechargement et au
	 * renommage (décision de David du 2026-10-18).
	 */
	const shownByMenu = $derived(object.sliderShown === true);

	/**
	 * Pourquoi cette valeur n'a pas de curseur, ou `null` si elle en a un.
	 * Les deux raisons d'avant ce lot, dites dans le menu au lieu de la carte.
	 */
	const noSliderReason = $derived.by(() => {
		if (object.unit !== undefined) {
			return `Grandeur en ${object.unit} : pas de curseur (on ne fait pas glisser une longueur).`;
		}
		if (object.slider === undefined) return `${name} n’a pas de curseur.`;
		if (object.definition.trim() === '') return `Donne d’abord une valeur à ${name}.`;
		if (constantOf(object.definition, object.provenance, atelier.functionNames) === null) {
			return `${name} est calculée à partir d'autres objets : pas de curseur, il effacerait sa formule.`;
		}
		return null;
	});

	const isParameter = $derived(citedBy.length > 0);
	const sliderShown = $derived(noSliderReason === null && (isParameter || shownByMenu));

	const actions = $derived(actionsFor(object, atelier));

	// -------------------------------------------------------------------------
	// Le menu et ce qu'il ouvre
	// -------------------------------------------------------------------------

	let card = $state<HTMLElement | null>(null);
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

	/** La fenêtre des bornes et du pas. */
	let settingsOpen = $state(false);

	async function openSettings() {
		focusLeaves = true;
		// Après la fermeture du menu : les deux se disputeraient le focus
		await tick();
		settingsOpen = true;
	}

	function handleSettingsCloseFocus(event: Event) {
		event.preventDefault();
		card?.querySelector<HTMLButtonElement>(`button[aria-label="Options de ${name}"]`)?.focus();
	}
</script>

<article bind:this={card} class="objet valeur" class:selected data-status={object.status}>
	<div class="ligne">
		<span class="nom">{name}</span>
		<span class="egal" aria-hidden="true">=</span>
		<div class="membre">
			<DefinitionField
				{object}
				commit="validate"
				showPrefix={false}
				autofocus={selected && object.definition === ''}
			/>
		</div>
		{#if stateLabel}
			<span class="etat">{stateLabel}</span>
		{/if}
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
			<DropdownMenu.Content align="end" class="w-64" onCloseAutoFocus={handleCloseAutoFocus}>
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Affichage</DropdownMenu.GroupHeading>
					{#if noSliderReason !== null}
						<UnavailableItem label="Curseur" reason={noSliderReason} role="menuitemcheckbox" />
					{:else if isParameter}
						<UnavailableItem
							label="Curseur"
							reason={`${name} est un paramètre (${citedBy.map(displayName).join(', ')} la cite) : son curseur reste affiché.`}
							role="menuitemcheckbox"
							checked
						/>
					{:else}
						<DropdownMenu.CheckboxItem
							checked={shownByMenu}
							onCheckedChange={(on) => atelier.setSliderShown(object.name, on)}
						>
							Curseur
						</DropdownMenu.CheckboxItem>
					{/if}
					{#if noSliderReason === null}
						<DropdownMenu.Item onSelect={openSettings}>Bornes et pas du curseur…</DropdownMenu.Item>
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

	{#if measure}
		<!-- L7 : la valeur d'une mesure ; la mise en page des cartes revient à la refonte -->
		<p class="mesure">
			<span aria-hidden="true">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- LaTeX de la réponse de Calcul, regénéré par toLatex (valueAnswerOf) -->
				{@html measure.markup}
			</span>
			<span class="sr-only">{measure.text}</span>
		</p>
	{/if}

	{#if sliderShown && object.slider}
		<ValueSlider {object} slider={object.slider} />
	{/if}

	{#if object.message}
		<p class="message">{object.message}</p>
	{/if}
</article>

{#if object.slider}
	<Dialog.Root bind:open={settingsOpen}>
		<Dialog.Content class="sm:max-w-sm" onCloseAutoFocus={handleSettingsCloseFocus}>
			<Dialog.Header>
				<Dialog.Title>Curseur de {name}</Dialog.Title>
				<Dialog.Description>Ses bornes et son pas.</Dialog.Description>
			</Dialog.Header>
			<SliderSettings {object} slider={object.slider} />
		</Dialog.Content>
	</Dialog.Root>
{/if}

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
	.ligne {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
	}
	.nom {
		/* La place du point de couleur des fonctions : les noms restent alignés */
		margin-left: 1.5rem;
		font-family: var(--font-serif, serif);
		font-style: italic;
		font-weight: 600;
		font-size: 1.0625rem;
	}
	.egal {
		font-family: var(--font-serif, serif);
		margin-right: 0.125rem;
	}
	.membre {
		flex: 1;
		min-width: 0;
	}
	.etat {
		flex-shrink: 0;
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}
	.icone {
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
	.icone:hover {
		background: var(--color-muted);
	}
	.icone:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	.mesure {
		margin: 0;
		/* Sous le nom, comme la ligne grise des autres cartes (`SequenceCard`) */
		padding-left: 1.75rem;
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
</style>
