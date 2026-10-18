<script lang="ts">
	import '$lib/utils/mathlive-styles';
	/**
	 * La carte d'une suite : une ligne, `● u(n) = [champ]` ou `● u(n+1) = [champ]`.
	 *
	 * Lot 4a de `docs/wip/atelier-refonte-interface-phase0.md` (décision de David
	 * du 2026-10-18) : la grammaire de la carte de fonction (lot 3). Sous la
	 * ligne, en petit, le départ de la suite : le premier terme d'une récurrence
	 * (`u(0) = [3]`, deux champs) ou le premier rang d'une suite explicite. Le
	 * point de couleur ouvre couleur et trait ; le menu rassemble l'affichage
	 * (nuage ou escalier), le mode et les actions. Les marches d'un escalier se
	 * règlent sous la ligne, seulement quand il est tracé.
	 *
	 * Tout s'écrit dans l'atelier (`setSequence`, `setSequenceDisplay`), refusé
	 * avec sa raison — reprise des réglages de la carte d'avant (phase 0
	 * `/grapheur` §5 U1, U2 ; décisions S1 à S4).
	 */
	import type { SequenceMode, SequenceObject } from '$lib/atelier/types';
	import { actionsFor, type ObjectAction } from '$lib/atelier/actions';
	import { useAtelier } from '$lib/atelier/context';
	import { cobwebRefusal } from '$lib/atelier/atelier.svelte';
	import { displayName } from '$lib/atelier/names';
	import { stateLabelOf } from '$lib/atelier/card-state';
	import { EllipsisVertical, Eye, EyeOff } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import DefinitionField from './DefinitionField.svelte';
	import CurveStylePopover from './CurveStylePopover.svelte';
	import CardActionItems from './CardActionItems.svelte';
	import UnavailableItem from './UnavailableItem.svelte';

	interface Props {
		object: SequenceObject;
		selected?: boolean;
		onAction?: (action: ObjectAction, object: SequenceObject) => void;
	}

	let { object, selected = false, onAction }: Props = $props();

	const atelier = useAtelier();

	const name = $derived(displayName(object.name));
	/** « à compléter », « en attente »… (revue de #1501). */
	const stateLabel = $derived(stateLabelOf(object.status));
	/** Une récurrence donne le terme SUIVANT (décision S3). */
	const variable = $derived(object.mode === 'recurrence' ? '(n+1) =' : '(n) =');

	const actions = $derived(actionsFor(object, atelier));

	/** Pourquoi nuage et escalier ne se choisissent pas encore. */
	const NOT_PLOTTED = 'Trace d’abord la suite (👁).';
	/** Pourquoi l'escalier est impossible ici, ou `null`. */
	const cobwebReason = $derived(cobwebRefusal(object, atelier.functionNames));
	const display = $derived(object.plotted ? object.display : undefined);

	// -------------------------------------------------------------------------
	// Les réglages, refusés avec leur raison
	// -------------------------------------------------------------------------

	/** Le contrôle dont le réglage a été refusé. */
	type Field = 'mode' | 'firstIndex' | 'firstTerm' | 'steps' | 'display';

	/**
	 * Pourquoi le dernier réglage n'a pas été retenu, et sur QUEL champ — reste
	 * affiché, relié à ce seul champ (revue a11y du lot 5b).
	 */
	let refusal = $state<{ field: Field; message: string } | null>(null);

	const refusalId = $derived(`refus-suite-${object.name}`);

	/** Un geste (mode, nuage, escalier, champ validé) : le refus se dit tout de suite. */
	function report(field: Field, result: { ok: true } | { ok: false; message: string }) {
		refusal = result.ok ? null : { field, message: result.message };
	}

	function handleMode(value: string) {
		if (value === 'explicit' || value === 'recurrence') {
			report('mode', atelier.setSequence(object.name, { mode: value as SequenceMode }));
		}
	}

	function handleRepresentation(value: string) {
		if (value === 'ranks' || value === 'cobweb') {
			report('display', atelier.setSequenceDisplay(object.name, { representation: value }));
		}
	}

	/** Ce que le champ demande, ou `null` s'il est vide ou illisible (rien n'est rangé). */
	function requested(field: 'firstIndex' | 'firstTerm' | 'steps', typed: string) {
		const text = typed.trim();
		if (text === '') return null;
		if (field === 'firstTerm') return atelier.setSequence(object.name, { firstTerm: text });
		const parsed = Number(text);
		if (!Number.isFinite(parsed)) return null;
		return field === 'steps'
			? atelier.setSequenceDisplay(object.name, { cobwebSteps: parsed })
			: atelier.setSequence(object.name, { firstIndex: parsed });
	}

	/** Ce que le champ montre quand rien n'est en cours : la valeur RETENUE. */
	function storedText(field: 'firstIndex' | 'firstTerm' | 'steps'): string {
		return field === 'steps' ? String(object.display?.cobwebSteps ?? '') : String(object[field]);
	}

	/** Effacer le refus de ce champ, s'il est le sien. */
	function clearRefusal(field: Field) {
		if (refusal?.field === field) refusal = null;
	}

	/**
	 * Le rang, le premier terme et les marches sont rangés à Entrée ou à la
	 * sortie du champ (`change`), jamais à la frappe — comme la définition
	 * (décision de David du 2026-10-18). Refusé : le refus se dit, et le champ
	 * reprend la valeur RETENUE. Vide, ou inchangé (après Échap) : rien n'est
	 * rangé, et l'ancien refus s'efface (revue de #1504).
	 */
	function commit(field: 'firstIndex' | 'firstTerm' | 'steps') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			if (event.currentTarget.value.trim() === storedText(field)) {
				clearRefusal(field);
				return;
			}
			const result = requested(field, event.currentTarget.value);
			if (result === null) clearRefusal(field);
			else report(field, result);
			if (result === null || !result.ok) event.currentTarget.value = storedText(field);
		};
	}

	/**
	 * Échap rétablit la valeur retenue et efface le refus — même contrat que la
	 * définition (`DefinitionField`) : la sortie du champ qui suit ne range
	 * plus la saisie annulée (revue de #1504).
	 */
	function cancel(field: 'firstIndex' | 'firstTerm' | 'steps') {
		return (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			event.currentTarget.value = storedText(field);
			clearRefusal(field);
		};
	}

	/** Relier un champ au refus, seulement s'il est le fautif. */
	function describedBy(field: Field): string | undefined {
		return refusal?.field === field ? refusalId : undefined;
	}

	// -------------------------------------------------------------------------
	// Le menu
	// -------------------------------------------------------------------------

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

<article class="objet suite" class:selected data-status={object.status}>
	<div class="ligne">
		<CurveStylePopover {object} />
		<span class="nom">{name}</span>
		<span class="variable" aria-hidden="true">{variable}</span>
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
			<DropdownMenu.Content align="end" class="w-64" onCloseAutoFocus={handleCloseAutoFocus}>
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Affichage</DropdownMenu.GroupHeading>
					{#if display === undefined}
						<UnavailableItem label="Nuage" reason={NOT_PLOTTED} role="menuitemradio" />
						<UnavailableItem label="Escalier" reason={NOT_PLOTTED} role="menuitemradio" />
					{:else}
						<DropdownMenu.RadioGroup
							value={display.representation}
							onValueChange={handleRepresentation}
						>
							<DropdownMenu.RadioItem value="ranks" closeOnSelect={false}
								>Nuage</DropdownMenu.RadioItem
							>
							{#if cobwebReason === null}
								<DropdownMenu.RadioItem value="cobweb" closeOnSelect={false}
									>Escalier</DropdownMenu.RadioItem
								>
							{:else}
								<UnavailableItem label="Escalier" reason={cobwebReason} role="menuitemradio" />
							{/if}
						</DropdownMenu.RadioGroup>
					{/if}
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Définition</DropdownMenu.GroupHeading>
					<DropdownMenu.RadioGroup value={object.mode} onValueChange={handleMode}>
						<DropdownMenu.RadioItem value="explicit"
							>Explicite : {name}(n) = …</DropdownMenu.RadioItem
						>
						<DropdownMenu.RadioItem value="recurrence"
							>Récurrence : {name}(n+1) = …</DropdownMenu.RadioItem
						>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Actions</DropdownMenu.GroupHeading>
					<CardActionItems {actions} onselect={handleSelect} />
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<!-- Le départ de la suite, en petit sous la ligne (U1, S1) -->
	<div class="depart" role="group" aria-label={`Premier terme de ${name}`}>
		{#if object.mode === 'recurrence'}
			<span class="mot" aria-hidden="true">{name}(</span>
			<Input
				type="number"
				step="1"
				min="0"
				value={object.firstIndex}
				onchange={commit('firstIndex')}
				onkeydown={cancel('firstIndex')}
				class="h-7 w-12 text-sm"
				aria-label={`Rang du premier terme de ${name}`}
				aria-invalid={refusal?.field === 'firstIndex'}
				aria-describedby={describedBy('firstIndex')}
			/>
			<span class="mot" aria-hidden="true">) =</span>
			<Input
				type="text"
				value={object.firstTerm}
				onchange={commit('firstTerm')}
				onkeydown={cancel('firstTerm')}
				class="h-7 w-20 text-sm"
				placeholder="0 ou a"
				aria-label={`${name}(${object.firstIndex}) =, premier terme de ${name}`}
				aria-invalid={refusal?.field === 'firstTerm'}
				aria-describedby={describedBy('firstTerm')}
			/>
		{:else}
			<span class="mot" aria-hidden="true">à partir du rang</span>
			<Input
				type="number"
				step="1"
				min="0"
				value={object.firstIndex}
				onchange={commit('firstIndex')}
				onkeydown={cancel('firstIndex')}
				class="h-7 w-12 text-sm"
				aria-label={`Rang du premier terme de ${name}`}
				aria-invalid={refusal?.field === 'firstIndex'}
				aria-describedby={describedBy('firstIndex')}
			/>
		{/if}
	</div>

	{#if display?.representation === 'cobweb'}
		<div class="depart" role="group" aria-label={`Escalier de ${name}`}>
			<span class="mot" aria-hidden="true">marches</span>
			<Input
				type="number"
				step="1"
				min="1"
				value={display.cobwebSteps}
				onchange={commit('steps')}
				onkeydown={cancel('steps')}
				class="h-7 w-16 text-sm"
				aria-label={`marches de ${name}`}
				aria-invalid={refusal?.field === 'steps'}
				aria-describedby={describedBy('steps')}
			/>
		</div>
	{/if}

	{#if object.message}
		<p class="message">{object.message}</p>
	{/if}

	<!-- Toujours dans l'arbre : une alerte créée avec son texte n'est pas toujours lue -->
	<p class="refus-suite" id={refusalId} role="alert">{refusal?.message ?? ''}</p>
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
	/* Une définition trop longue pour la ligne passe dessous, en entier : le
	   champ prend toute la largeur restante, jamais moins que son contenu */
	.ligne {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
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
	.membre {
		flex: 1 1 auto;
		min-width: 0;
	}
	.etat {
		flex-shrink: 0;
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
	}
	.depart {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		/* Sous le nom, après le point de couleur */
		padding-left: 1.75rem;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}
	.mot {
		font-family: var(--font-serif, serif);
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
	.icone[aria-pressed='true'] {
		color: var(--color-foreground);
		background: var(--color-muted);
	}
	.icone:hover {
		background: var(--color-muted);
	}
	.icone:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	.message {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
	[data-status='error'] .message {
		color: var(--color-destructive);
	}
	.refus-suite {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.refus-suite:empty {
		visibility: hidden;
		height: 0;
	}
</style>
