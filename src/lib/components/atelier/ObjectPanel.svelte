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
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ObjectCard from './ObjectCard.svelte';

	interface Props {
		/** Objet sélectionné, dont les actions sont dépliées. */
		selected?: string | null;
		onSelect?: (name: string) => void;
		onAction?: (action: ObjectAction, object: AtelierObject) => void;
		onTabulate?: (
			name: string,
			bounds: { from: string; to: string; step: string }
		) => { text: string; failed: boolean };
	}

	let { selected = $bindable(null), onSelect, onAction, onTabulate }: Props = $props();

	const atelier = useAtelier();

	/**
	 * Sur téléphone (une colonne, ≤ 720 px), le panneau ouvert ramenait la vue à
	 * son plancher : il s'ouvre replié (décision du 2026-10-19). Au-dessus, le
	 * bouton est caché et le panneau toujours déplié — c'est le CSS qui tranche,
	 * sans `matchMedia` : pas de panneau déplié puis replié au chargement.
	 */
	let opened = $state(false);
	/**
	 * Le panneau « Propriétés » déplié — un seul à la fois — et où va le focus.
	 * Ici, et pas dans la carte : un renommage change la clé de la carte, qui
	 * renaît, et le panneau la suit sous son nouveau nom.
	 */
	let openProperties = $state<{ name: string; focus: 'name' | 'panel' } | null>(null);

	/** Vide, il reste déplié : ses boutons « + » sont la seule entrée. */
	const expanded = $derived(opened || atelier.objects.length === 0);

	// Une carte qui prend la main (la carte prête à taper de /grapheur, f′ après
	// « Dériver ») doit se voir : une sélection NOUVELLE déplie le panneau. Replier
	// ensuite le laisse replié, même si la carte reste sélectionnée
	$effect.pre(() => {
		if (selected !== null) opened = true;
	});

	/** Ce qu'on peut créer d'un clic. Le nom, lui, est proposé par l'atelier. */
	const CREATABLE: { kind: ObjectKind; label: string }[] = [
		{ kind: 'function', label: '+ Fonction' },
		{ kind: 'value', label: '+ Valeur' },
		{ kind: 'sequence', label: '+ Suite' },
		{ kind: 'list', label: '+ Liste' },
		// Géométrie (v2, lot 1) : la vue Figure les montrera (PR 2)
		{ kind: 'point', label: '+ Point' },
		{ kind: 'curve', label: '+ Courbe' }
	];

	function create(kind: ObjectKind) {
		// Créer depuis le panneau, c'est s'en servir : le premier objet ne le replie pas
		opened = true;
		const result = atelier.create({ kind });
		if (result.ok) {
			selected = result.object.name;
			onSelect?.(result.object.name);
		}
	}
</script>

<aside class="panneau" class:replie={!expanded}>
	<header class="tete">
		<!-- Point d'arrivée du focus quand une carte disparaît (suppression, a11y 2.4.3) -->
		<strong id="atelier-mes-objets" tabindex="-1">Mes objets</strong>
		<span class="compte">
			{atelier.objects.length}
			{atelier.objects.length > 1 ? 'objets' : 'objet'}
		</span>
		<!-- Vide, rien à replier : pas de bouton. Nom constant (le titre),
		     l'état est dit par `aria-expanded` seul (motif « disclosure ») -->
		{#if atelier.objects.length > 0}
			<button
				type="button"
				class="replier"
				aria-labelledby="atelier-mes-objets"
				aria-expanded={expanded}
				aria-controls="atelier-mes-objets-corps"
				onclick={() => (opened = !expanded)}
			>
				<ChevronDown class="size-4" aria-hidden="true" />
			</button>
		{/if}
	</header>

	<div class="corps" id="atelier-mes-objets-corps">
		<div class="liste">
			{#each atelier.objects as object (object.name)}
				<ObjectCard
					{object}
					selected={object.name === selected}
					{onAction}
					{onTabulate}
					properties={openProperties?.name === object.name ? openProperties.focus : null}
					onProperties={(focus) =>
						(openProperties = focus === null ? null : { name: object.name, focus })}
					onRenamed={(name) => (openProperties = { name, focus: 'name' })}
				/>
			{:else}
				<p class="vide">Rien encore. Crée un objet pour commencer à chercher.</p>
			{/each}
		</div>

		<footer class="creer">
			{#each CREATABLE as item (item.kind)}
				<button type="button" onclick={() => create(item.kind)}>{item.label}</button>
			{/each}
		</footer>
	</div>
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
	/* Le compte pousse le bouton au bout de la barre */
	.compte {
		margin-left: auto;
		font-size: 0.6875rem;
		color: var(--color-muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.replier {
		display: none;
	}

	.corps {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
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

	/* Au-dessus de la vue (une colonne) : le panneau garde sa hauteur propre et
	   défile, au lieu d'être écrasé par la vue */
	@media (max-width: 720px) {
		.panneau {
			max-height: 45vh;
			border-right: none;
			border-bottom: 1px solid var(--color-border);
		}
		.tete {
			align-items: center;
			padding-block: 0.25rem;
		}
		.replier {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: 2.75rem;
			min-height: 2.75rem;
			margin-block: -0.25rem;
			border: none;
			border-radius: 0.375rem;
			background: none;
			color: var(--color-foreground);
			cursor: pointer;
		}
		.replier :global(svg) {
			transition: transform 0.15s;
		}
		.replier[aria-expanded='true'] :global(svg) {
			transform: rotate(180deg);
		}
		.replier:focus-visible {
			outline: 2px solid var(--color-ring, currentColor);
			outline-offset: -2px;
		}
		.replie .corps {
			display: none;
		}
		.replie .tete {
			border-bottom: none;
		}
	}
</style>
