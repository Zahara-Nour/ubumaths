<script lang="ts">
	/**
	 * La carte des six Provinces : la gidouille de Sandomir se dessine jusqu'à la Province
	 * qu'on lit (grand écran : la spirale reste en place pendant que les fiches défilent).
	 * Sur téléphone, la spirale, entière, précède les fiches.
	 *
	 * La spirale est un décor (`aria-hidden`) : tout ce qu'elle dit est dans les fiches.
	 */
	import type { Action } from 'svelte/action';
	import { Crown } from '@lucide/svelte';
	import { PROVINCES } from '$lib/kingdom-tour/tour';
	import {
		buildSpiral,
		placeLabel,
		PROVINCE_MAP,
		type SpiralLabel
	} from '$lib/kingdom-tour/spiral';

	// Constantes

	const { size: SIZE, turns, innerRadius, outerRadius } = PROVINCE_MAP;
	const SPIRAL = buildSpiral({
		size: SIZE,
		turns,
		innerRadius,
		outerRadius,
		stops: PROVINCES.length
	});

	/** La fiche qui croise le milieu de l'écran est la Province lue */
	const READING_LINE = '-50% 0px -50% 0px';

	// Variables

	/** Province lue ; -1 avant la première */
	let active = $state(-1);
	const progress = $derived(active < 0 ? 0 : SPIRAL.stops[active].progress);

	// Functions

	/** Le nom d'une Province, posé à côté de son étape */
	function labelOf(index: number): SpiralLabel {
		return placeLabel(SPIRAL.stops[index], PROVINCES[index].name, SIZE);
	}

	/** JavaScript actif : la spirale peut suivre la lecture (sans lui, elle reste tracée) */
	let live = $state(false);

	/**
	 * La fiche n° `index` devient la Province lue quand elle croise le milieu de l'écran.
	 * Remonté au-dessus de la première fiche : plus aucune Province n'est lue.
	 */
	const watch: Action<HTMLElement, number> = (element, index) => {
		if (typeof IntersectionObserver === 'undefined') return;
		live = true;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) active = index;
					else if (
						index === 0 &&
						entry.rootBounds &&
						entry.boundingClientRect.top > entry.rootBounds.bottom
					)
						active = -1;
				}
			},
			{ rootMargin: READING_LINE }
		);
		observer.observe(element);
		return { destroy: () => observer.disconnect() };
	};
</script>

<div class="map" class:live data-testid="province-map">
	<div class="spiral" aria-hidden="true">
		<svg viewBox="0 0 {SIZE} {SIZE}">
			<path d={SPIRAL.d} class="track" />
			<path d={SPIRAL.d} class="ink" pathLength="1" style:--progress={progress} />
			{#each SPIRAL.stops as stop, i (i)}
				{@const label = labelOf(i)}
				<g class="stop" class:reached={i <= active} class:current={i === active}>
					<circle cx={stop.x} cy={stop.y} r="13" />
					<text x={stop.x} y={stop.y + 4.5} text-anchor="middle" class="number">{i + 1}</text>
					<text x={label.x} y={label.y} text-anchor={label.anchor} class="name"
						>{PROVINCES[i].name}</text
					>
				</g>
			{/each}
			<g class="throne" class:reached={active === PROVINCES.length - 1}>
				<circle cx={SPIRAL.center.x} cy={SPIRAL.center.y} r="24" />
				<foreignObject x={SPIRAL.center.x - 11} y={SPIRAL.center.y - 13} width="22" height="22">
					<Crown size={22} strokeWidth={2} />
				</foreignObject>
				<text x={SPIRAL.center.x} y={SPIRAL.center.y + 40} text-anchor="middle" class="name"
					>Sandomir</text
				>
			</g>
		</svg>
	</div>

	<ol class="provinces">
		{#each PROVINCES as province, i (province.id)}
			<li id="province-{province.id}" class:current={i === active} use:watch={i}>
				<article aria-labelledby="province-{province.id}-name">
					<div class="card-head">
						<span class="badge" aria-hidden="true">{i + 1}</span>
						<div>
							<h3 id="province-{province.id}-name">{province.name}</h3>
							<span class="domain">{province.domain}</span>
						</div>
					</div>
					<blockquote>
						<span class="sr-only">Devise :</span> « {province.motto} »
					</blockquote>
					<p class="scenery">{province.scenery}</p>
					<dl>
						<div>
							<dt>Capitale</dt>
							<dd>{province.capital}</dd>
						</div>
						<div>
							<dt>Gouverneur</dt>
							<dd>{province.governor}</dd>
						</div>
					</dl>
					{#if province.tools.length > 0}
						<ul class="tools" aria-label="Y travailler sur Chiphre">
							{#each province.tools as tool (tool.href)}
								<li>
									<a href={tool.href}>{tool.label} <span aria-hidden="true">→</span></a>
								</li>
							{/each}
						</ul>
					{/if}
				</article>
			</li>
		{/each}
	</ol>
</div>

<style lang="postcss">
	@reference "../../../app.css";

	.map {
		@apply grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12;
	}

	/* Spirale : entière au-dessus des fiches sur téléphone, tenue en place sur grand écran */
	.spiral {
		@apply mx-auto w-full max-w-sm lg:sticky lg:top-8 lg:max-w-none lg:self-start;
	}
	.spiral svg {
		@apply h-auto w-full overflow-visible;
	}
	.track,
	.ink {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.track {
		stroke: var(--color-border);
		stroke-width: 10;
	}
	.ink {
		stroke: var(--color-primary);
		stroke-width: 10;
		stroke-dasharray: 1;
		/* Téléphone : la carte entière, déjà tracée */
		stroke-dashoffset: 0;
		transition: stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.stop circle {
		fill: var(--color-card);
		stroke: var(--color-border);
		stroke-width: 3;
		transition:
			fill 0.4s,
			stroke 0.4s,
			r 0.4s;
	}
	.stop .number {
		fill: var(--color-muted-foreground);
		font-size: 13px;
		font-weight: 700;
	}
	.name {
		fill: var(--color-foreground);
		font-family: 'Lora', Georgia, serif;
		font-size: 15px;
		font-weight: 600;
		paint-order: stroke;
		stroke: var(--color-background);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.stop.reached circle {
		fill: var(--color-primary);
		stroke: var(--color-primary);
	}
	.stop.reached .number {
		fill: var(--color-primary-foreground);
	}
	.stop.current circle {
		r: 17;
		filter: drop-shadow(0 0 10px var(--color-primary));
	}
	.throne circle {
		fill: var(--color-card);
		stroke: var(--color-primary);
		stroke-width: 3;
	}
	.throne foreignObject {
		color: var(--color-primary);
	}
	.throne.reached circle {
		fill: var(--color-primary);
	}
	.throne.reached foreignObject {
		color: var(--color-primary-foreground);
	}

	/* Grand écran, JavaScript actif : la spirale se dessine au fil de la lecture */
	@media (min-width: 1024px) {
		.live .ink {
			stroke-dashoffset: calc(1 - var(--progress, 0));
		}
	}

	.provinces {
		@apply flex flex-col gap-6 lg:gap-[14vh] lg:py-[10vh];
	}
	.provinces > li {
		@apply rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-500 sm:p-6;
	}
	.provinces > li.current {
		@apply border-primary shadow-lg;
	}
	article {
		@apply flex flex-col gap-3;
	}
	/* Un <div>, pas un <header> : app.css impose 1rem à tout ce que contient un <header> */
	.card-head {
		@apply flex items-center gap-3;
	}
	.badge {
		@apply grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground;
	}
	.domain {
		@apply font-medium tracking-wide text-foreground/75 uppercase;
		font-size: calc(0.875rem * var(--font-scale, 1));
	}
	blockquote {
		font-family: 'Lora', Georgia, serif;
		font-size: calc(clamp(1.25rem, 1rem + 1vw, 1.5rem) * var(--font-scale, 1));
		@apply leading-snug italic;
	}
	/* `main p` impose 1rem : une classe l'emporte, en gardant l'échelle A−/A+ */
	.scenery {
		@apply text-foreground/75;
		font-size: calc(1rem * var(--font-scale, 1)) !important;
	}
	dl {
		@apply flex flex-wrap gap-x-6 gap-y-1;
		font-size: calc(0.875rem * var(--font-scale, 1));
	}
	dl div {
		@apply flex gap-1.5;
	}
	dt {
		@apply text-foreground/75;
	}
	dt::after {
		content: ' :';
	}
	dd {
		@apply font-semibold;
	}
	.tools {
		@apply flex flex-wrap gap-2;
	}
	.tools a {
		@apply inline-flex min-h-11 items-center gap-1 rounded-full border border-foreground/40 px-4 py-2 font-medium transition-colors hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none;
	}

	@media (prefers-reduced-motion: reduce) {
		.ink,
		.stop circle,
		.provinces > li {
			transition: none;
		}
	}
</style>
