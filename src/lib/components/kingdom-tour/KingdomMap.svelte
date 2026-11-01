<!--
@component
La grande carte du Royaume (chantier cartes-site) : le fond peint, et par-dessus les noms,
cliquables. Une Province mène à sa fiche (`#province-<id>`), une ville à sa page.

La carte est un décor (`aria-hidden`, liens hors du clavier) : tout ce qu'elle permet de
faire passe aussi par les fiches des Provinces et par le lien de Sandomir, sous la carte.

Props :
- active : la Province lue, teintée sur la carte (`null` : aucune)
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { CITIES, cityPath } from '$lib/kingdom-tour/cities';
	import {
		CITY_LABELS,
		KINGDOM_MAP,
		KINGDOM_OUTLINE,
		OTHER_LABELS,
		PROVINCE_AREAS,
		PROVINCE_LABELS,
		type KingdomLabel
	} from '$lib/kingdom-tour/kingdom-map';
	import { PROVINCES, type ProvinceId } from '$lib/kingdom-tour/tour';

	// Constantes

	const { width: W, height: H, images } = KINGDOM_MAP;
	const SRCSET = images.map((image) => `${image.src} ${image.width}w`).join(', ');

	// Variables

	let { active = null }: { active?: ProvinceId | null } = $props();

	// Functions

	function anchorOf(label: KingdomLabel): string {
		return label.anchor ?? 'middle';
	}

	function transformOf(label: KingdomLabel): string | undefined {
		return label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined;
	}
</script>

<div class="kingdom" style:aspect-ratio="{W} / {H}">
	<img
		src={images[0].src}
		srcset={SRCSET}
		sizes="(min-width: 1024px) 50vw, 100vw"
		width={W}
		height={H}
		alt=""
		loading="lazy"
		decoding="async"
	/>
	<svg viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false" data-testid="kingdom-map">
		<defs>
			<clipPath id="kingdom-outline">
				<path d={KINGDOM_OUTLINE} />
			</clipPath>
		</defs>

		<g clip-path="url(#kingdom-outline)">
			{#each PROVINCES as province (province.id)}
				<a href="#province-{province.id}" tabindex="-1" aria-label={province.name}>
					<path
						d={PROVINCE_AREAS[province.id]}
						class="area"
						class:current={active === province.id}
						data-province-area={province.id}
					/>
				</a>
			{/each}
		</g>

		{#each OTHER_LABELS as label (label.text)}
			<text
				x={label.x}
				y={label.y}
				text-anchor={anchorOf(label)}
				transform={transformOf(label)}
				class={label.kind}>{label.text}</text
			>
		{/each}

		{#each PROVINCES as province (province.id)}
			{@const label = PROVINCE_LABELS[province.id]}
			<a href="#province-{province.id}" tabindex="-1">
				<text
					x={label.x}
					y={label.y}
					text-anchor={anchorOf(label)}
					class="province"
					class:current={active === province.id}>{label.text}</text
				>
			</a>
		{/each}

		{#each CITIES as city (city.slug)}
			{@const label = CITY_LABELS[city.slug]}
			<a href={resolve(cityPath(city.slug))} tabindex="-1">
				<text x={label.x} y={label.y} text-anchor={anchorOf(label)} class={label.kind}
					>{label.text}</text
				>
			</a>
		{/each}
	</svg>
</div>

<style lang="postcss">
	@reference "../../../app.css";

	.kingdom {
		@apply relative w-full overflow-hidden rounded-2xl border border-border shadow-sm;
	}
	img,
	svg {
		@apply absolute inset-0 h-full w-full;
	}

	/* Surfaces des Provinces : invisibles, teintées au survol et pendant la lecture */
	.area {
		fill: var(--color-primary);
		fill-opacity: 0;
		transition: fill-opacity 0.5s;
	}
	a:hover .area {
		fill-opacity: 0.12;
	}
	.area.current {
		fill-opacity: 0.22;
	}

	/* Noms : ceux de la carte validée, agrandis pour rester lisibles sur un téléphone */
	text {
		font-family: Georgia, 'Times New Roman', serif;
		fill: #1b2232;
		paint-order: stroke;
		stroke: #f1ede4;
		stroke-linejoin: round;
	}
	.province {
		font-size: 150px;
		font-weight: bold;
		letter-spacing: 18px;
		stroke-width: 22px;
		stroke-opacity: 0.8;
		transition: fill 0.4s;
	}
	.province.current {
		fill: var(--color-primary);
	}
	.capital {
		font-size: 112px;
		font-style: italic;
		stroke-width: 18px;
		stroke-opacity: 0.85;
	}
	.royal {
		font-size: 140px;
		font-weight: bold;
		stroke-width: 22px;
		stroke-opacity: 0.85;
	}
	.water {
		font-size: 90px;
		font-style: italic;
		fill: #2b5c9e;
		stroke-width: 14px;
		stroke-opacity: 0.6;
		letter-spacing: 12px;
	}
	.neighbour {
		font-size: 100px;
		font-style: italic;
		stroke-width: 14px;
		stroke-opacity: 0.6;
	}
	.title {
		font-size: 70px;
		font-weight: bold;
		letter-spacing: 5px;
		stroke: none;
	}
	a {
		cursor: pointer;
	}
	a:hover text {
		fill: var(--color-primary);
	}

	@media (prefers-reduced-motion: reduce) {
		.area,
		.province {
			transition: none;
		}
	}
</style>
