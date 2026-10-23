<script lang="ts">
	/**
	 * Un objet de l'atelier : l'aiguillage vers la carte de son type.
	 *
	 * Les actions sont attachées à l'objet, dans le menu de sa carte, et jamais
	 * dans une barre de menus globale (§3). Chaque type a sa carte, sur une ligne
	 * (refonte de l'atelier) : `FunctionCard` (lot 3), `ValueCard`,
	 * `SequenceCard`, `ListCard` (lot 4a), `FigureCard` pour les points et les
	 * courbes (lot 4b).
	 *
	 * « Propriétés » et « Renommer » ne sortent pas de la carte : ils déplient
	 * son panneau (`ObjectProperties`), dont l'état vit dans la liste — il
	 * survit au renommage, qui change la clé de la carte.
	 */
	import type { AtelierObject } from '$lib/atelier/types';
	import { PROPERTIES_ACTIONS, type ObjectAction } from '$lib/atelier/actions';
	import { isFigureObject, isFunction, isList, isSequence, isValue } from '$lib/atelier/types';
	import FunctionCard from './FunctionCard.svelte';
	import ValueCard from './ValueCard.svelte';
	import SequenceCard from './SequenceCard.svelte';
	import ListCard from './ListCard.svelte';
	import FigureCard from './FigureCard.svelte';
	import ObjectProperties from './ObjectProperties.svelte';

	interface Props {
		object: AtelierObject;
		selected?: boolean;
		onAction?: (action: ObjectAction, object: AtelierObject) => void;
		/** « Tabuler » (tableur, lot 3) : écrire le tableau dans la grille ; ce qui a été fait, ou le refus. */
		onTabulate?: (
			name: string,
			bounds: { from: string; to: string; step: string }
		) => { text: string; failed: boolean };
		/** Le panneau « Propriétés » déplié, où va le focus, et le numéro de l'ouverture ; `null` : replié. */
		properties?: { focus: 'name' | 'panel'; opening: number } | null;
		onProperties?: (focus: 'name' | 'panel' | null) => void;
		/** Un renommage réussi depuis le panneau : la liste suit le nouveau nom. */
		onRenamed?: (name: string) => void;
	}

	let {
		object,
		selected = false,
		onAction: forward,
		onTabulate,
		properties = null,
		onProperties,
		onRenamed
	}: Props = $props();

	function onAction(action: ObjectAction, target: AtelierObject) {
		if (PROPERTIES_ACTIONS.has(action.id)) {
			onProperties?.(action.id === 'rename' ? 'name' : 'panel');
			return;
		}
		forward?.(action, target);
	}
</script>

{#if isFunction(object)}
	<FunctionCard {object} {selected} {onAction} {onTabulate} />
{:else if isValue(object)}
	<ValueCard {object} {selected} {onAction} />
{:else if isSequence(object)}
	<SequenceCard {object} {selected} {onAction} />
{:else if isList(object)}
	<ListCard {object} {selected} {onAction} />
{:else if isFigureObject(object)}
	<FigureCard {object} {selected} {onAction} />
{/if}

{#if properties !== null}
	<ObjectProperties
		{object}
		focus={properties.focus}
		opening={properties.opening}
		onclose={() => onProperties?.(null)}
		onrenamed={(name) => onRenamed?.(name)}
	/>
{/if}
