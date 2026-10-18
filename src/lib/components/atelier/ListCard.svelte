<script lang="ts">
	/**
	 * La carte d'une liste : une ligne, `L = {3 ; 5 ; 8 ; …}` et son nombre de valeurs.
	 *
	 * Lot 4a de `docs/wip/atelier-refonte-interface-phase0.md` (décisions de David
	 * du 2026-10-18) :
	 * - une liste NE s'édite PAS sur sa ligne (trente valeurs ne tiennent pas
	 *   dans un champ d'une ligne) : elle s'y lit, et se modifie dans Données
	 *   (« Modifier dans Données ») ;
	 * - les actions à deux listes passent par le sous-menu « Avec une autre
	 *   liste », une partenaire après l'autre — à la place du choix de la
	 *   partenaire (Q46) qui vivait sur la carte.
	 */
	import type { ListObject } from '$lib/atelier/types';
	import { actionsFor, partnersOf, type ObjectAction } from '$lib/atelier/actions';
	import { useAtelier } from '$lib/atelier/context';
	import { displayName } from '$lib/atelier/names';
	import { stateLabelOf } from '$lib/atelier/card-state';
	import { listCountLabel, listEntriesOf, listPreview } from '$lib/atelier/list-preview';
	import { EllipsisVertical } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import CardActionItems from './CardActionItems.svelte';

	interface Props {
		object: ListObject;
		selected?: boolean;
		onAction?: (action: ObjectAction, object: ListObject) => void;
	}

	let { object, selected = false, onAction }: Props = $props();

	const atelier = useAtelier();

	const name = $derived(displayName(object.name));
	/** « à compléter », « en attente »… (revue de #1501). */
	const stateLabel = $derived(stateLabelOf(object.status));

	const entries = $derived(listEntriesOf(object, (column, row) => atelier.cellValue(column, row)));
	const preview = $derived(listPreview(entries));
	const count = $derived(listCountLabel(entries, object.categories));
	/** Une colonne de formules (tableur, lot 2) : l'aperçu montre leurs valeurs, on le dit. */
	const calculated = $derived(
		object.definition.split(';').some((entry) => entry.trim().startsWith('='))
	);

	/** Renommer et Supprimer, toujours en fin de menu (lot 4). */
	const LAST = new Set(['rename', 'remove']);

	/** Les actions de la liste seule : celles qui ne portent pas de partenaire. */
	const own = $derived(actionsFor(object, atelier).filter((a) => a.partner === undefined));
	const ownFirst = $derived(own.filter((a) => !LAST.has(a.id)));
	const ownLast = $derived(own.filter((a) => LAST.has(a.id)));

	/** Pour chaque autre liste, les actions faites avec elle. */
	const withPartners = $derived(
		partnersOf(object, atelier)
			.map((partner) => ({
				partner,
				actions: actionsFor(object, atelier, partner).filter((a) => a.partner === partner)
			}))
			.filter((group) => group.actions.length > 0)
	);

	/** « Modifier dans Données » : la vue Données s'ouvre sur la colonne de la liste. */
	const EDIT_IN_DATA: ObjectAction = { id: 'data', label: 'Modifier dans Données' };

	/** L'élément choisi emmène le focus ailleurs : le menu ne le ramène pas sur son bouton. */
	let focusLeaves = false;
	/**
	 * Une commande PRÉPARÉE (tableau croisé, simuler) se termine au clavier dans
	 * la console : elle part une fois le menu fermé ET retiré
	 * (`onOpenChangeComplete`). Lancée avant, le champ mathématique de la
	 * console n'obtenait pas le focus, que le menu gardait pendant sa
	 * disparition (mesuré en écriture mathématique).
	 */
	let prepared: ObjectAction | null = null;
	const PREPARED = new Set(['cross', 'simulate']);

	function handleCloseAutoFocus(event: Event) {
		if (prepared === null && !focusLeaves) return;
		focusLeaves = false;
		event.preventDefault();
	}

	function handleOpenChangeComplete(open: boolean) {
		if (open || prepared === null) return;
		const action = prepared;
		prepared = null;
		onAction?.(action, object);
	}

	function handleSelect(action: ObjectAction) {
		const root = action.id.split(':')[0];
		if (PREPARED.has(root)) {
			prepared = action;
			return;
		}
		// Supprimer confie le focus au panneau ; Données le prend dans la grille
		if (root === 'remove' || root === EDIT_IN_DATA.id) focusLeaves = true;
		onAction?.(action, object);
	}
</script>

<article class="objet liste" class:selected data-status={object.status}>
	<div class="ligne">
		<span class="nom">{name}</span>
		<span class="egal" aria-hidden="true">=</span>
		<span class="apercu">
			<span class="valeurs">{preview}</span>
			<span class="compte">({count}{calculated ? ', calculée dans la grille' : ''})</span>
		</span>
		{#if stateLabel}
			<span class="etat">{stateLabel}</span>
		{/if}
		<DropdownMenu.Root onOpenChangeComplete={handleOpenChangeComplete}>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="icone"
						aria-label={`Options de ${name}`}
						title="Actions"
					>
						<EllipsisVertical class="h-4 w-4" aria-hidden="true" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-64" onCloseAutoFocus={handleCloseAutoFocus}>
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Actions</DropdownMenu.GroupHeading>
					<CardActionItems actions={ownFirst} onselect={handleSelect} />
					{#if withPartners.length > 0}
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>Avec une autre liste</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-64">
								{#each withPartners as group, index (group.partner)}
									{#if index > 0}<DropdownMenu.Separator />{/if}
									<DropdownMenu.Group>
										<DropdownMenu.GroupHeading
											>Avec {displayName(group.partner)}</DropdownMenu.GroupHeading
										>
										<CardActionItems actions={group.actions} onselect={handleSelect} />
									</DropdownMenu.Group>
								{/each}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					{/if}
					<DropdownMenu.Item onSelect={() => handleSelect(EDIT_IN_DATA)}>
						{EDIT_IN_DATA.label}
					</DropdownMenu.Item>
					<CardActionItems actions={ownLast} onselect={handleSelect} />
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

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
	.apercu {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 0.375rem;
		font-size: 0.9375rem;
		overflow-wrap: anywhere;
	}
	.compte {
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
		font-variant-numeric: tabular-nums;
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
	.message {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
	}
	[data-status='error'] .message {
		color: var(--color-destructive);
	}
</style>
