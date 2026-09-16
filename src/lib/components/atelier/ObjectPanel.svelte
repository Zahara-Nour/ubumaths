<script lang="ts">
	/**
	 * « Mes objets » — la colonne vertébrale de l'atelier.
	 *
	 * Ce panneau n'est pas une liste parmi d'autres : c'est lui qui rend l'état
	 * partagé visible, et c'est sur ses objets que les actions s'attachent. Les
	 * vues (Calcul, Graphe, Données) n'en sont que des projections.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import type { AtelierObject, ObjectKind } from '$lib/atelier/types';
	import type { ObjectAction } from '$lib/atelier/actions';
	import ObjectCard from './ObjectCard.svelte';

	interface Props {
		/** Objet sélectionné, dont les actions sont dépliées. */
		selected?: string | null;
		onSelect?: (name: string) => void;
		onAction?: (action: ObjectAction, object: AtelierObject) => void;
	}

	let { selected = $bindable(null), onSelect, onAction }: Props = $props();

	const atelier = useAtelier();

	/** Ce qu'on peut créer d'un clic. Le nom, lui, est proposé par l'atelier. */
	const CREATABLE: { kind: ObjectKind; label: string }[] = [
		{ kind: 'function', label: '+ Fonction' },
		{ kind: 'value', label: '+ Valeur' },
		{ kind: 'sequence', label: '+ Suite' },
		{ kind: 'list', label: '+ Liste' }
	];

	function create(kind: ObjectKind) {
		const result = atelier.create({ kind });
		if (result.ok) {
			selected = result.object.name;
			onSelect?.(result.object.name);
		}
	}

	function select(name: string) {
		selected = name;
		onSelect?.(name);
	}
</script>

<aside class="panneau">
	<header class="tete">
		<strong>Mes objets</strong>
		<span class="compte">
			{atelier.objects.length}
			{atelier.objects.length > 1 ? 'objets' : 'objet'}
		</span>
	</header>

	<div class="liste">
		{#each atelier.objects as object (object.name)}
			<ObjectCard {object} selected={object.name === selected} onSelect={select} {onAction} />
		{:else}
			<p class="vide">Rien encore. Crée un objet pour commencer à chercher.</p>
		{/each}
	</div>

	<footer class="creer">
		{#each CREATABLE as item (item.kind)}
			<button type="button" onclick={() => create(item.kind)}>{item.label}</button>
		{/each}
	</footer>
</aside>

<style>
	.panneau {
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-right: 1px solid var(--color-border);
		background: var(--color-muted);
	}

	.tete {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0.875rem 0.625rem;
		border-bottom: 1px solid var(--color-border);
	}
	.tete strong {
		font-size: 0.8125rem;
	}
	.compte {
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.liste {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.vide {
		margin: 0;
		padding: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}

	.creer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.5rem;
		border-top: 1px solid var(--color-border);
	}
	.creer button {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		cursor: pointer;
	}
</style>
