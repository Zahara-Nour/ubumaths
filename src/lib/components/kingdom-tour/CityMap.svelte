<!--
@component
La carte d'une ville du Royaume (chantier cartes-site) : le fond peint, et par-dessus le nom
court de chaque lieu et ses zones cliquables (invisibles). Un clic choisit le lieu.

La carte est un décor (`aria-hidden`, rien au clavier) : la page liste chaque lieu, avec son
nom complet et sa description.

Props :
- city : la ville
- selected : l'identifiant du lieu choisi (`null` : aucun), entouré sur la carte
- onselect : appelé avec l'identifiant du lieu cliqué
-->
<script lang="ts">
	import { CITY_MAP_SIZE, type City, type MapLabel } from '$lib/kingdom-tour/cities';

	// Constantes

	const SIZE = CITY_MAP_SIZE;

	// Variables

	let {
		city,
		selected = null,
		onselect
	}: { city: City; selected?: string | null; onselect: (placeId: string) => void } = $props();

	// Functions

	/** Un seul écouteur pour toute la carte : la cible cliquée porte `data-place` */
	function pick(event: MouseEvent) {
		const id = (event.target as Element | null)
			?.closest('[data-place]')
			?.getAttribute('data-place');
		if (id) onselect(id);
	}

	function transformOf(label: MapLabel): string | undefined {
		return label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined;
	}
</script>

<div class="city-map">
	<img src={city.image} width={SIZE} height={SIZE} alt="" decoding="async" />
	<!-- Décor caché aux lecteurs d'écran : au clavier, la page liste chaque lieu avec sa fiche -->
	<svg
		viewBox="0 0 {SIZE} {SIZE}"
		aria-hidden="true"
		focusable="false"
		data-testid="city-map"
		onclick={pick}
	>
		{#each city.places as place (place.id)}
			<g class="place" class:selected={selected === place.id}>
				{#each place.targets as target, i (i)}
					<ellipse
						cx={target.cx}
						cy={target.cy}
						rx={target.rx}
						ry={target.ry}
						class="target"
						data-place={place.id}
					/>
				{/each}
				<text
					x={place.labelAt.x}
					y={place.labelAt.y}
					text-anchor={place.labelAt.anchor ?? 'middle'}
					transform={transformOf(place.labelAt)}
					data-place={place.id}>{place.label}</text
				>
			</g>
		{/each}
	</svg>
</div>

<style lang="postcss">
	@reference "../../../app.css";

	.city-map {
		@apply relative aspect-square w-full overflow-hidden rounded-2xl border border-border shadow-sm;
	}
	img,
	svg {
		@apply absolute inset-0 h-full w-full;
	}

	.target {
		fill: #fff;
		fill-opacity: 0;
		stroke: var(--color-primary);
		stroke-opacity: 0;
		stroke-width: 5;
		cursor: pointer;
		transition:
			fill-opacity 0.3s,
			stroke-opacity 0.3s;
	}
	.place:hover .target {
		fill-opacity: 0.18;
	}
	.place.selected .target {
		fill-opacity: 0.22;
		stroke-opacity: 1;
	}

	/* Noms de la carte validée, agrandis sur téléphone pour rester lisibles */
	text {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 24px;
		font-weight: bold;
		font-style: italic;
		fill: #1b2232;
		paint-order: stroke;
		stroke: #f1ede4;
		stroke-width: 6px;
		stroke-opacity: 0.9;
		stroke-linejoin: round;
		cursor: pointer;
	}
	@media (max-width: 639px) {
		text {
			font-size: 32px;
			stroke-width: 8px;
		}
	}
	.place:hover text,
	.place.selected text {
		fill: var(--color-primary);
	}

	@media (prefers-reduced-motion: reduce) {
		.target {
			transition: none;
		}
	}
</style>
