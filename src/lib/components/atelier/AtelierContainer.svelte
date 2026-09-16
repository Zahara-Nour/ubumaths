<script lang="ts">
	/**
	 * L'atelier : un panneau d'objets, et des vues qui en sont des projections.
	 *
	 * ⚠️ C'est l'atelier qui POSSÈDE l'état (décision figée n° 1) : les vues ne
	 * détiennent rien, elles montrent les mêmes objets autrement. C'est ce qui
	 * permet le changement de registre sans transfert ni re-parse.
	 */
	import { onMount } from 'svelte';
	import { Atelier } from '$lib/atelier/atelier.svelte';
	import { provideAtelier } from '$lib/atelier/context';
	import { openSession, type SessionNotice } from '$lib/atelier/session.svelte';
	import type { AtelierObject } from '$lib/atelier/types';
	import type { ObjectAction } from '$lib/atelier/actions';
	import ObjectPanel from './ObjectPanel.svelte';

	interface Props {
		/** L'atelier à piloter. Sans lui, le conteneur crée le sien. */
		atelier?: Atelier;
		/** Vue ouverte au démarrage. */
		view?: ViewId;
		/** Ne rien charger ni ranger — mode éphémère (§6, §7 N2). */
		ephemeral?: boolean;
	}

	type ViewId = 'calcul' | 'graphe' | 'donnees';

	const VIEWS: { id: ViewId; label: string }[] = [
		{ id: 'calcul', label: 'Calcul' },
		{ id: 'graphe', label: 'Graphe' },
		{ id: 'donnees', label: 'Données' }
	];

	let { atelier = new Atelier(), view = 'calcul', ephemeral = false }: Props = $props();

	// svelte-ignore state_referenced_locally
	provideAtelier(atelier);

	// `view` donne la vue de DÉPART — celle qu'une URL demande (`/grapheur`
	// ouvre sur Graphe, §7 N1). Ensuite l'élève change d'onglet librement, sans
	// que la prop le ramène en arrière : capture volontaire, pattern documenté
	// dans `docs/ref/warning-svelte.md` §1.
	// svelte-ignore state_referenced_locally
	let activeView = $state<ViewId>(view);
	let selected = $state<string | null>(null);
	let notices = $state<SessionNotice[]>([]);

	// Le cycle de vie n'a de sens que dans un navigateur : la session lit le
	// stockage et écoute les autres onglets.
	onMount(() => {
		if (ephemeral) return;
		const session = openSession(atelier, {
			storage: readStorage(),
			target: window,
			onNotice: (notice) => (notices = [...notices, notice])
		});
		sessionTouch = session.touch;
		return session.close;
	});

	let sessionTouch: (() => void) | null = null;

	/** Un navigateur peut refuser `localStorage` — ce n'est pas une erreur (§5 E1). */
	function readStorage(): Storage | null {
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}

	function handleAction(action: ObjectAction, object: AtelierObject) {
		// Les actions arriveront avec leurs vues ; pour l'instant seules celles
		// qui ne dépendent d'aucune vue sont câblées.
		if (action.id === 'remove') {
			atelier.remove(object.name);
			if (selected === object.name) selected = null;
			sessionTouch?.();
		}
	}
</script>

<div class="atelier">
	<ObjectPanel bind:selected onAction={handleAction} />

	<main class="zone">
		<nav class="onglets" aria-label="Vues de l'atelier">
			{#each VIEWS as item (item.id)}
				<button
					type="button"
					class="onglet"
					aria-current={activeView === item.id ? 'page' : undefined}
					onclick={() => (activeView = item.id)}
				>
					{item.label}
				</button>
			{/each}
		</nav>

		{#if notices.length > 0}
			<ul class="avis">
				{#each notices as notice, i (i)}
					<li data-kind={notice.kind}>{notice.message}</li>
				{/each}
			</ul>
		{/if}

		<section class="vue">
			<p class="a-venir">
				La vue « {VIEWS.find((v) => v.id === activeView)?.label} » arrive au prochain lot.
			</p>
		</section>
	</main>
</div>

<style>
	.atelier {
		display: grid;
		grid-template-columns: minmax(14rem, 18rem) 1fr;
		height: 100%;
		min-height: 0;
	}

	.zone {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.onglets {
		display: flex;
		gap: 0.125rem;
		padding: 0.5rem 0.625rem 0;
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
	}
	.onglet {
		font-size: 0.8125rem;
		padding: 0.4375rem 0.875rem;
		border: 1px solid transparent;
		border-bottom: none;
		border-radius: 0.5rem 0.5rem 0 0;
		background: none;
		color: var(--color-muted-foreground);
		cursor: pointer;
		white-space: nowrap;
	}
	.onglet[aria-current='page'] {
		background: var(--color-background);
		color: var(--color-foreground);
		border-color: var(--color-border);
		margin-bottom: -1px;
		font-weight: 600;
	}

	.avis {
		list-style: none;
		margin: 0;
		padding: 0.5rem 0.75rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8125rem;
	}
	.avis li {
		padding: 0.375rem 0.625rem;
		border-radius: 0.375rem;
		background: var(--color-muted);
	}
	.avis li[data-kind='warning'] {
		color: var(--color-destructive);
	}

	.vue {
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}
	.a-venir {
		margin: 0;
		color: var(--color-muted-foreground);
		font-size: 0.875rem;
	}

	@media (max-width: 720px) {
		.atelier {
			grid-template-columns: 1fr;
		}
	}
</style>
