<script lang="ts">
	/**
	 * La silhouette de l'atelier, rendue par le serveur (piste 4 (c), volet 4).
	 *
	 * L'atelier n'existe qu'une fois son JS chargé et `openLink(…)` résolu : sans
	 * elle, l'écran restait vide plusieurs secondes en 4G lente. Elle reprend la
	 * forme de `AtelierContainer` (« Mes objets », barre d'outils, onglets, scène)
	 * pour que rien ne saute à l'arrivée, et ne contient AUCUN contrôle : les
	 * parties visibles sont `inert`. Le titre et l'annonce de chargement restent
	 * hors de l'inerte, pour les lecteurs d'écran.
	 *
	 * ⚠️ Les dimensions recopient celles de `AtelierContainer`, `ObjectPanel` et
	 * `ToolButton` : les retoucher là-bas, c'est les retoucher ici.
	 */

	interface Props {
		/** Le titre de niveau 1, le même que celui de l'atelier une fois chargé. */
		heading: string;
	}

	const TABS = ['Graphe', 'Géométrie', 'Données'];
	/** Annuler, Rétablir, Repartir de zéro, Charger, Enregistrer · Console, Partager, Réglages */
	const TOOLS_LEFT = 5;
	const TOOLS_RIGHT = 3;
	/** Les boutons « + Fonction », « + Valeur »… du bas de « Mes objets ». */
	const CREATE_WIDTHS = ['4.875rem', '4.0625rem', '3.625rem', '3.5rem', '3.625rem', '4.5rem'];

	let { heading }: Props = $props();
</script>

<div class="silhouette">
	<aside class="panneau" inert>
		<!-- Un `header`, comme dans `ObjectPanel` : les styles globaux des `header` s'y appliquent aussi -->
		<header class="tete"><strong>Mes objets</strong></header>
		<div class="liste"></div>
		<div class="creer">
			{#each CREATE_WIDTHS as width, i (i)}
				<span class="bloc pastille" style:width></span>
			{/each}
		</div>
	</aside>

	<section class="zone" aria-labelledby="titre-atelier-silhouette">
		<h1 id="titre-atelier-silhouette" class="sr-only">{heading}</h1>
		<div class="barre" inert>
			<div class="outils">
				{#each { length: TOOLS_LEFT }, i (i)}
					<span class="bloc outil"></span>
				{/each}
			</div>
			<div class="outils">
				{#each { length: TOOLS_RIGHT }, i (i)}
					<span class="bloc outil"></span>
				{/each}
			</div>
		</div>
		<div class="onglets" inert>
			{#each TABS as label, i (label)}
				<span class="onglet" class:actif={i === 0}>{label}</span>
			{/each}
		</div>
		<div class="scene">
			<p class="chargement" role="status">Chargement de l’atelier…</p>
		</div>
	</section>
</div>

<style>
	.silhouette {
		display: grid;
		grid-template-columns: minmax(14rem, 18rem) 1fr;
		height: 100%;
		min-height: 0;
	}

	.panneau {
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-right: 1px solid var(--color-border);
		background: var(--color-muted);
	}
	.tete {
		padding: 0.75rem 0.875rem 0.625rem;
		border-bottom: 1px solid var(--color-border);
	}
	.tete strong {
		font-size: 0.8125rem;
	}
	.liste {
		flex: 1;
	}
	.creer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.zone {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.barre {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.25rem 0.625rem;
		border-bottom: 1px solid var(--color-border);
	}
	.outils {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.onglets {
		display: flex;
		gap: 0.125rem;
		padding: 0.5rem 0.625rem 0;
		border-bottom: 1px solid var(--color-border);
		overflow: hidden;
	}
	.onglet {
		font-size: 0.8125rem;
		padding: 0.4375rem 0.875rem;
		border: 1px solid transparent;
		border-bottom: none;
		border-radius: 0.5rem 0.5rem 0 0;
		color: var(--color-muted-foreground);
		white-space: nowrap;
	}
	.onglet.actif {
		background: var(--color-background);
		color: var(--color-foreground);
		border-color: var(--color-border);
		margin-bottom: -1px;
		font-weight: 600;
	}
	.scene {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.chargement {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}

	/* Les blocs à la place des boutons : la forme, sans rien à cliquer */
	.bloc {
		display: block;
		border-radius: 0.375rem;
		background: var(--color-border);
		opacity: 0.6;
	}
	/* Un bouton d'outil fait 2,5 rem ; le bloc a la taille de son icône */
	.outil {
		width: 1.25rem;
		height: 1.25rem;
		margin: 0.625rem;
	}
	.pastille {
		height: 1.75rem;
	}
	@media (prefers-reduced-motion: no-preference) {
		.bloc {
			animation: respire 1.6s ease-in-out infinite;
		}
	}
	@keyframes respire {
		50% {
			opacity: 0.3;
		}
	}

	/* Une colonne sur téléphone, comme l'atelier : « Mes objets » au-dessus */
	@media (max-width: 720px) {
		.silhouette {
			grid-template-columns: 1fr;
			grid-template-rows: auto minmax(0, 1fr);
		}
		.panneau {
			max-height: 45vh;
			border-right: none;
			border-bottom: 1px solid var(--color-border);
		}
		/* La place du « Rien encore. Crée un objet… » d'un premier passage, sur deux lignes */
		.liste {
			min-height: 5rem;
		}
		.tete {
			padding-block: 0.25rem;
		}
	}
</style>
