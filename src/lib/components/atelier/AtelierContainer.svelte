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
	import { derivativeName, displayName } from '$lib/atelier/names';
	import type { AtelierState } from '$lib/atelier/persistence';
	import type { ObjectAction } from '$lib/atelier/actions';
	import ObjectPanel from './ObjectPanel.svelte';
	import CalculView from './CalculView.svelte';
	import DataView from './DataView.svelte';
	import ShareBar from './ShareBar.svelte';
	import { CalcDesk } from '$lib/atelier/desk.svelte';
	import GrapheurContainer from '$lib/components/grapheur/GrapheurContainer.svelte';
	import { GrapheurStore } from '$lib/stores/grapheur.svelte';
	import { provideGrapheurStore } from '$lib/stores/grapheur-context';
	import { syncPlots } from '$lib/atelier/plot-sync';
	import { ATELIER_STATE_VERSION } from '$lib/atelier/persistence';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { cascadeMessage, removedMessage } from '$lib/atelier/removal';

	interface Props {
		/** L'atelier à piloter. Sans lui, le conteneur crée le sien. */
		atelier?: Atelier;
		/** Vue ouverte au démarrage. */
		view?: ViewId;
		/** Ne rien charger ni ranger — mode éphémère (§6, §7 N2). */
		ephemeral?: boolean;
		/** L'atelier reçu par l'URL. Sa présence fait le mode éphémère. */
		received?: AtelierState | null;
		/** Ce que la relecture de l'URL a eu à dire. */
		notice?: string | null;
		/**
		 * Un atelier VIDE reçoit une carte de ce type, tracée et prête à taper —
		 * c'est l'ouverture de `/grapheur` (phase 0 §6 B3 : pas de x² d'office).
		 */
		startWith?: 'function';
		/** Le titre de la page (niveau 1, pour les lecteurs d'écran — revue a11y). */
		heading?: string;
	}

	type ViewId = 'calcul' | 'graphe' | 'donnees';

	const VIEWS: { id: ViewId; label: string }[] = [
		{ id: 'calcul', label: 'Calcul' },
		{ id: 'graphe', label: 'Graphe' },
		{ id: 'donnees', label: 'Données' }
	];

	let {
		atelier = new Atelier(),
		view = 'calcul',
		ephemeral = false,
		received = null,
		notice = null,
		startWith,
		heading = 'Atelier'
	}: Props = $props();

	/** Durée pendant laquelle « Annuler » reste proposé après une suppression (E2). */
	const UNDO_DURATION_MS = 10_000;

	/** L'objet dont la suppression attend confirmation, avec ce qu'elle emporterait (N2). */
	let pendingRemoval = $state<{ name: string; dependents: readonly string[] } | null>(null);
	let confirmRemoval = $state(false);

	/** « Repartir de zéro » : la confirmation est-elle ouverte ? (B7) */
	let confirmReset = $state(false);

	/** Vider l'atelier — seulement après confirmation, jamais sur un lien reçu. */
	function handleReset() {
		atelier.restore({ version: ATELIER_STATE_VERSION, objects: [] });
		// L'historique aussi : il parlait d'objets supprimés (revue du lot 6, C3)
		desk.clear();
		seen = 0;
		selected = null;
		// Sur `/grapheur`, on retrouve l'écran d'arrivée : une carte prête à taper
		startIfEmpty();
		announce('L’atelier est vide.');
	}

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

	/**
	 * Ce qu'une action a changé hors de la vue courante (bascule d'onglet,
	 * diagramme affiché ou retiré), dit au lecteur d'écran (WCAG 4.1.3, audit
	 * a11y du lot 5 des outils statistiques).
	 */
	let announcement = $state('');

	// Le cycle de vie n'a de sens que dans un navigateur : la session lit le
	// stockage et écoute les autres onglets.
	// `$state` et non un simple `let` : l'effet ci-dessous doit se redéclencher
	// quand la session s'ouvre, sinon il part une fois sur `null` et ne revient
	// jamais — rien n'est alors jamais enregistré.
	let session = $state<Session | null>(null);

	/**
	 * B3 : à l'ouverture, un atelier VIDE reçoit une carte prête à taper, tracée
	 * pour que la courbe apparaisse dès la frappe. Après la relecture de la
	 * sauvegarde, sinon on croirait vide un atelier pas encore relu.
	 */
	function startIfEmpty() {
		if (startWith === undefined || atelier.objects.length > 0) return;
		const created = atelier.create({ kind: startWith });
		if (!created.ok) return;
		atelier.setPlotted(created.object.name, true);
		selected = created.object.name;
	}

	onMount(() => {
		if (ephemeral) {
			startIfEmpty();
			return;
		}
		session = openSession(atelier, {
			storage: readStorage(),
			target: window,
			onNotice: (notice) => (notices = [...notices, notice])
		});
		// La carte d'accueil AVANT de noter la révision de départ : sinon la simple
		// visite de `/grapheur` enregistrait une carte vide (revue du lot 6, C2) —
		// elle ne l'est que si l'élève y touche.
		startIfEmpty();
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
	// Fourni à tout le conteneur, et pas seulement à la vue Graphe : la carte
	// (« Sur le graphique ») lit la courbe dessinée et la fenêtre visible
	provideGrapheurStore(graph);

	/**
	 * Le pupitre de la vue Calcul.
	 *
	 * ⚠️ Il vit ICI, et non dans `CalculView` : une action cliquée dans « Mes
	 * objets » doit écrire dans le MÊME historique que la saisie au clavier. Sans
	 * ça, « Dériver » ne produisait rien du tout — le bouton était actif et muet.
	 */
	// Capture volontaire : le pupitre garde CETTE instance d'atelier pour toute
	// la vie du conteneur, comme le grapheur ci-dessus.
	// svelte-ignore state_referenced_locally
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

	/**
	 * Supprimer l'objet et ses dépendants, puis proposer « Annuler » (lot B,
	 * N1, N3, N4). Le message disparaît seul : la suppression devient définitive.
	 */
	function removeNow(name: string) {
		const result = atelier.removeWithDependents(name);
		if (!result.ok) {
			toaster.error(result.message);
			return;
		}
		if (selected !== null && result.removed.includes(selected)) selected = null;
		toaster.message(removedMessage(result.removed), {
			duration: UNDO_DURATION_MS,
			action: {
				label: 'Annuler',
				onClick: () => {
					// L4 : l'atelier a changé depuis — on le dit plutôt que de restaurer par-dessus
					if (!atelier.undoRemoval(result)) {
						toaster.warning(
							'L’atelier a changé depuis : la suppression ne peut plus être annulée.'
						);
					}
				}
			}
		});
	}

	function handleConfirmRemoval() {
		if (pendingRemoval !== null) removeNow(pendingRemoval.name);
		pendingRemoval = null;
	}

	function handleAction(action: ObjectAction, object: AtelierObject) {
		if (action.id === 'remove') {
			const dependents = atelier.removalOf(object.name);
			if (dependents.length === 0) {
				removeNow(object.name);
				return;
			}
			pendingRemoval = { name: object.name, dependents };
			confirmRemoval = true;
			return;
		}
		if (action.id === 'plot') {
			atelier.setPlotted(object.name, !object.plotted);
			showView('graphe');
			return;
		}

		// L1 : dériver une seconde fois sélectionne la carte f′ qui existe déjà
		const derivative = derivativeName(object.name);
		const derivativeExisted = action.id === 'derive' && atelier.get(derivative) !== undefined;

		// ⚠️ Décision G7 de David : une action écrit sa ligne dans Calcul SANS y
		// emmener l'élève — il y va quand il le décide ; l'onglet signale le
		// nouveau résultat. `graph` suit, parce que « Nuage de points » écrit dedans.
		const before = desk.entries.length;
		const outcome = desk.runFromPanel(action.id, object.name, graph);
		if (outcome === 'unsupported') return;
		// …seulement si elle vaut quelque chose (f = |x| : la ligne dit pourquoi)
		if (derivativeExisted && atelier.get(derivative)?.status === 'ok') selected = derivative;

		// Une commande PRÉPARÉE (« Tableau croisé », « Simuler ») se termine au
		// clavier, dans Calcul : y aller est le geste lui-même, pas une bascule.
		// ⚠️ Écart avec A1, qui range `.simuler` parmi les actions sans bascule :
		// signalé à David (le geste ne produit rien tant que n n'est pas validé)
		if (outcome === 'needs-argument') {
			showView('calcul');
			return;
		}
		if (desk.entries.length > before && activeView !== 'calcul') {
			announce('Nouvelle ligne dans l’onglet Calcul.');
		}

		// Un nuage se voit dans le Graphe, un diagramme dans les Données : c'est là
		// que l'élève doit regarder. ⚠️ Comparer la RACINE : les actions portent
		// leur partenaire (`scatter:M`), et `action.id === 'scatter'` ne
		// répondait plus jamais (outils statistiques, Q39).
		const root = action.id.split(':')[0];
		// Diagramme en bâtons / en barres (`chart`) ou circulaire (`pie`, Q88) :
		// même destination, l'onglet Données (revue : `pie` menait à Calcul)
		const isChart = root === 'chart' || root === 'pie';
		// Retirer un diagramme ne mène nulle part : on reste où l'on est
		const chartShown = isChart && atelier.chartOf(object.name) !== undefined;
		// A5 : ce qui se VOIT ailleurs (nuage, diagramme) y emmène, comme « Tracer »
		if (root === 'scatter') showView('graphe');
		else if (chartShown) showView('donnees');

		if (isChart) {
			announce(
				atelier.chartOf(object.name)
					? `Diagramme de ${object.name} affiché dans l’onglet Données.`
					: `Diagramme de ${object.name} retiré.`
			);
		} else if (root === 'scatter') {
			announce(`Nuage de ${object.name} affiché dans l’onglet Graphe.`);
		}
	}

	/**
	 * Les lignes de Calcul que l'élève a déjà eues sous les yeux.
	 *
	 * Mis à jour en ENTRANT dans Calcul et en en SORTANT : ce qu'on calcule
	 * sous ses yeux n'est pas « nouveau » quand on part vers le Graphe.
	 */
	let seen = $state(0);

	/** Les résultats arrivés dans Calcul pendant qu'on regardait ailleurs (A3). */
	const unseen = $derived(activeView === 'calcul' ? 0 : Math.max(0, desk.entries.length - seen));

	function showView(next: ViewId) {
		if (activeView === 'calcul' || next === 'calcul') seen = desk.entries.length;
		activeView = next;
	}

	/**
	 * L'image d'un nombre, demandée depuis une carte (A4). Pas d'annonce ici :
	 * la carte annonce déjà « f(3) = 9 » ; deux annonces se bousculeraient.
	 */
	function handleImage(name: string, value: string) {
		return desk.image(name, value);
	}

	/** Vider puis écrire : le même message deux fois de suite est annoncé deux fois. */
	function announce(message: string) {
		announcement = '';
		setTimeout(() => (announcement = message), 0);
	}
</script>

<div class="atelier">
	<ObjectPanel bind:selected onAction={handleAction} onImage={handleImage} />

	<!-- `section` et non `main` : la page est déjà dans le `<main>` du layout,
	     et deux repères `main` perturbent la navigation (revue a11y du lot 6) -->
	<section class="zone" aria-labelledby="titre-atelier">
		<h1 id="titre-atelier" class="sr-only">{heading}</h1>
		<div class="barre">
			<ShareBar {received} {notice} />
			{#if !ephemeral}
				<button
					type="button"
					class="vider"
					disabled={atelier.objects.length === 0}
					onclick={() => (confirmReset = true)}
				>
					Repartir de zéro
				</button>
			{/if}
		</div>
		<ConfirmDialog
			bind:open={confirmReset}
			title="Repartir de zéro ?"
			description="Tous les objets de l’atelier seront effacés — fonctions, valeurs, suites et listes —, ainsi que l’historique de calcul. Un lien de partage déjà copié les garde."
			confirmLabel="Vider l’atelier"
			variant="destructive"
			onConfirm={handleReset}
		/>
		<ConfirmDialog
			bind:open={confirmRemoval}
			title="Supprimer {pendingRemoval ? displayName(pendingRemoval.name) : ''} ?"
			description={pendingRemoval
				? cascadeMessage(pendingRemoval.name, pendingRemoval.dependents)
				: ''}
			confirmLabel="Tout supprimer"
			variant="destructive"
			onConfirm={handleConfirmRemoval}
			onCancel={() => (pendingRemoval = null)}
		/>
		<nav class="onglets" aria-label="Vues de l'atelier">
			{#each VIEWS as item (item.id)}
				<button
					type="button"
					class="onglet"
					aria-current={activeView === item.id ? 'page' : undefined}
					onclick={() => showView(item.id)}
				>
					{item.label}
					{#if item.id === 'calcul' && unseen > 0}
						<!-- A3 : un résultat attend dans Calcul -->
						<!-- Un NOMBRE contrasté, pas un point orange (revue a11y : 2,2:1) -->
						<span class="nouveau" aria-hidden="true">{unseen}</span>
						<span class="sr-only">
							— {unseen} nouveau{unseen > 1 ? 'x' : ''} résultat{unseen > 1 ? 's' : ''}
						</span>
					{/if}
				</button>
			{/each}
		</nav>

		<!--
			`aria-live` : un avertissement de perte de données doit être ANNONCÉ,
			pas seulement affiché. La région existe toujours, sinon un lecteur
			d'écran ne verrait jamais apparaître son contenu.
		-->
		<p class="sr-only" aria-live="polite" data-annonce>{announcement}</p>
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
	</section>
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

	.barre {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.vider:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.vider {
		/* Lisible et visable en projection (revue a11y du lot 6) */
		min-height: 2.5rem;
		padding: 0.125rem 0.625rem;
		margin-right: 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.vider:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
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
	.nouveau {
		display: inline-block;
		min-width: 1.125rem;
		margin-left: 0.375rem;
		padding: 0 0.3125rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1.125rem;
		text-align: center;
		/* Inversé : le contraste du texte courant, dans les deux thèmes */
		background: var(--color-foreground);
		color: var(--color-background);
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
