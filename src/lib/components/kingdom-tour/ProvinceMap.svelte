<script lang="ts">
	/**
	 * La carte des six Provinces : la grande carte du Royaume, où la Province qu'on lit est
	 * teintée (grand écran : la carte reste en place pendant que les fiches défilent).
	 * Sur téléphone, la carte entière précède les fiches.
	 *
	 * La carte est un décor : tout ce qu'elle dit et permet est dans les fiches, et dans le
	 * lien de Sandomir, sous la carte.
	 */
	import type { Action } from 'svelte/action';
	import { Crown } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import KingdomMap from './KingdomMap.svelte';
	import { capitalOf, cityPath } from '$lib/kingdom-tour/cities';
	import { PROVINCES } from '$lib/kingdom-tour/tour';

	// Constantes

	/** La fiche qui croise le milieu de l'écran est la Province lue */
	const READING_LINE = '-50% 0px -50% 0px';

	// Variables

	/** Province lue ; -1 avant la première */
	let active = $state(-1);

	// Functions

	/**
	 * La fiche n° `index` devient la Province lue quand elle croise le milieu de l'écran.
	 * Remonté au-dessus de la première fiche : plus aucune Province n'est lue.
	 */
	const watch: Action<HTMLElement, number> = (element, index) => {
		if (typeof IntersectionObserver === 'undefined') return;
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

<div class="map" data-testid="province-map">
	<div class="kingdom-col">
		<KingdomMap active={active < 0 ? null : PROVINCES[active].id} />
		<a class="royal-link" href={resolve(cityPath('sandomir'))}>
			<Crown size={18} strokeWidth={2} aria-hidden="true" />
			Sandomir, capitale du Royaume <span aria-hidden="true">→</span>
		</a>
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
							<dd>
								<a class="capital" href={resolve(cityPath(capitalOf(province.id).slug))}
									>{province.capital}</a
								>
							</dd>
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
		@apply grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12;
	}

	/* Carte : entière au-dessus des fiches sur téléphone, tenue en place sur grand écran */
	.kingdom-col {
		@apply flex w-full flex-col items-center gap-3 lg:sticky lg:top-8 lg:self-start;
	}
	.royal-link {
		@apply inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/40 px-4 py-2 font-medium transition-colors hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none;
	}
	.capital {
		@apply text-primary underline underline-offset-2 hover:no-underline;
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
		.provinces > li {
			transition: none;
		}
	}
</style>
