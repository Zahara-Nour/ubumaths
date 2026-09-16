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
	import { openSession, type Session, type SessionNotice } from '$lib/atelier/session';
	import type { AtelierObject } from '$lib/atelier/types';
	import type { ObjectAction } from '$lib/atelier/actions';
	import ObjectPanel from './ObjectPanel.svelte';
	import CalculView from './CalculView.svelte';
	import DataView from './DataView.svelte';
	import { CalcDesk } from '$lib/atelier/desk.svelte';
	import GrapheurContainer from '$lib/components/grapheur/GrapheurContainer.svelte';
	import { GrapheurStore } from '$lib/stores/grapheur.svelte';
	import { syncPlots } from '$lib/atelier/plot-sync';

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
	// `$state` et non un simple `let` : l'effet ci-dessous doit se redéclencher
	// quand la session s'ouvre, sinon il part une fois sur `null` et ne revient
	// jamais — rien n'est alors jamais enregistré.
	let session = $state<Session | null>(null);

	onMount(() => {
		if (ephemeral) return;
		session = openSession(atelier, {
			storage: readStorage(),
			target: window,
			onNotice: (notice) => (notices = [...notices, notice])
		});
		// Le chargement initial compte comme une modification : on note la
		// révision de départ pour ne pas ré-enregistrer ce qu'on vient de lire.
		lastSeenRevision = atelier.revision;
		return () => {
			session?.close();
			session = null;
		};
	});

	/**
	 * Le grapheur de CET atelier.
	 *
	 * Clé de rangement propre : sans elle, il chargerait les courbes de
	 * `/grapheur` puis les écraserait (revue #334). L'atelier range ses objets
	 * lui-même, le grapheur n'a donc rien à conserver — d'où `null`.
	 */
	const graph = new GrapheurStore(null);

	/**
	 * Le pupitre de la vue Calcul.
	 *
	 * ⚠️ Il vit ICI, et non dans `CalculView` : une action cliquée dans « Mes
	 * objets » doit écrire dans le MÊME historique que la saisie au clavier. Sans
	 * ça, « Dériver » ne produisait rien du tout — le bouton était actif et muet.
	 */
	const desk = new CalcDesk(atelier);

	let lastSeenRevision = $state(-1);

	// ⚠️ UNE seule source de « ça a changé ». Prévenir la session depuis chaque
	// endroit qui modifie l'atelier ne tenait pas : les créations depuis le
	// panneau ne déclenchaient aucune sauvegarde, et chaque action à venir
	// aurait rouvert le trou.
	$effect(() => {
		const current = atelier.revision;
		if (session === null || current === lastSeenRevision) return;
		lastSeenRevision = current;
		session.touch();
	});

	// Option B : la courbe suit l'objet. Un seul sens — l'atelier détient l'état.
	//
	// ⚠️ Cet effet LIT `graph.functions` (via `syncPlots`) et l'ÉCRIT : Svelte le
	// rejoue donc une fois de plus après chaque synchronisation. Il ne boucle que
	// parce que `syncPlots` est **idempotent** — la seconde passe ne réécrit
	// rien. Toute modification qui rendrait `syncPlots` inconditionnel donnerait
	// un `effect_update_depth_exceeded`.
	$effect(() => {
		void atelier.revision;
		syncPlots(atelier, graph);
	});

	/** Un navigateur peut refuser `localStorage` — ce n'est pas une erreur (§5 E1). */
	function readStorage(): Storage | null {
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}

	function handleAction(action: ObjectAction, object: AtelierObject) {
		if (action.id === 'remove') {
			atelier.remove(object.name);
			if (selected === object.name) selected = null;
			return;
		}
		if (action.id === 'plot') {
			atelier.setPlotted(object.name, !object.plotted);
			activeView = 'graphe';
			return;
		}

		// Les actions de calcul et de données répondent dans la vue Calcul : on y
		// bascule, sans quoi l'élève cliquerait et ne verrait jamais la réponse
		// arriver. `graph` suit, parce que « Nuage de points » écrit dedans.
		const outcome = desk.runFromPanel(action.id, object.name, graph);
		if (outcome === 'unsupported') return;

		// Un nuage se voit dans le Graphe, pas dans l'historique : c'est là que
		// l'élève doit regarder.
		activeView = action.id === 'scatter' ? 'graphe' : 'calcul';
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

		<!--
			`aria-live` : un avertissement de perte de données doit être ANNONCÉ,
			pas seulement affiché. La région existe toujours, sinon un lecteur
			d'écran ne verrait jamais apparaître son contenu.
		-->
		<ul class="avis" aria-live="polite" class:vide={notices.length === 0}>
			{#each notices as notice, i (i)}
				<li data-kind={notice.kind}>{notice.message}</li>
			{/each}
		</ul>

		<section class="vue" class:pleine={activeView === 'graphe'}>
			{#if activeView === 'calcul'}
				<CalculView {desk} />
			{:else if activeView === 'graphe'}
				<!--
					`panel={false}` : dans l'atelier, c'est « Mes objets » qui tient ce
					rôle. Deux listes de fonctions côte à côte ne posent pas seulement la
					question de savoir laquelle fait foi — l'élève y PERD sa saisie, que
					la synchronisation réécrit aussitôt avec la définition de l'objet.
				-->
				<GrapheurContainer store={graph} panel={false} />
			{:else}
				<DataView />
			{/if}
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
	.avis.vide {
		padding: 0;
	}
	.avis li[data-kind='warning'] {
		color: var(--color-destructive);
	}

	.vue {
		flex: 1;
		min-height: 0;
		padding: 1rem;
	}
	.vue.pleine {
		padding: 0;
		display: flex;
	}

	@media (max-width: 720px) {
		.atelier {
			grid-template-columns: 1fr;
		}
	}
</style>
