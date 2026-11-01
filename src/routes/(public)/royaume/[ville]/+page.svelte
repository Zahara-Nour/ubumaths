<script lang="ts">
	import { tick } from 'svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import CityMap from '$lib/components/kingdom-tour/CityMap.svelte';
	import { capitalTitle } from '$lib/kingdom-tour/cities';
	import { PROVINCES } from '$lib/kingdom-tour/tour';
	import type { PageProps } from './$types';

	// Variables

	let { data }: PageProps = $props();

	const city = $derived(data.city);
	const province = $derived(PROVINCES.find((p) => p.id === city.province) ?? null);

	/** Le lieu choisi sur la carte ; `null` : aucun */
	let selected = $state<string | null>(null);

	// Functions

	/** Choisir un lieu sur la carte : sa fiche est mise en évidence et amenée à l'écran */
	async function select(placeId: string) {
		selected = placeId;
		await tick();
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		document
			.getElementById(`lieu-${placeId}`)
			?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
	}
</script>

<SeoHead title="{city.name} : la carte de la ville | Chiphre" description={data.description} />

<div class="page">
	<BackLink href="/royaume" label="Retour au Tour du Royaume" />

	<h1>{city.name}</h1>
	<p class="kicker">{capitalTitle(city)}</p>
	<p class="intro">{city.intro}</p>

	<div class="layout">
		<div class="map-col">
			<CityMap {city} {selected} onselect={select} />
			<p class="hint">Clique sur un lieu de la carte pour lire sa fiche.</p>
		</div>

		<div class="list-col">
			<ol class="places" data-testid="city-places">
				{#each city.places as place (place.id)}
					<li
						id="lieu-{place.id}"
						aria-current={selected === place.id ? 'true' : undefined}
						class:selected={selected === place.id}
					>
						<h2>{place.name}</h2>
						<p class="description">{place.description}</p>
					</li>
				{/each}
			</ol>

			{#if province && province.tools.length > 0}
				<section class="tools" data-testid="city-tools" aria-labelledby="tools-title">
					<h2 id="tools-title">Y travailler sur Chiphre</h2>
					<p class="description">{province.name} : {province.domain.toLowerCase()}.</p>
					<ul>
						{#each province.tools as tool (tool.href)}
							<li>
								<a href={tool.href}>{tool.label} <span aria-hidden="true">→</span></a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</div>
</div>

<style lang="postcss">
	@reference "../../../../app.css";

	.page {
		@apply mx-auto max-w-6xl p-4 md:p-6;
	}
	h1 {
		@apply mt-2 text-3xl font-bold text-foreground md:text-4xl;
		font-family: 'Lora', Georgia, serif;
	}
	.kicker {
		@apply mt-1 font-medium tracking-wide text-primary uppercase;
		font-size: calc(0.875rem * var(--font-scale, 1)) !important;
	}
	/* `main p` impose 1rem : une classe l'emporte, en gardant l'échelle A−/A+ */
	.intro {
		@apply mt-3 max-w-3xl text-foreground/80;
		font-size: calc(1.125rem * var(--font-scale, 1)) !important;
	}
	.layout {
		@apply mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10;
	}
	.map-col {
		@apply flex flex-col gap-2 lg:sticky lg:top-8 lg:self-start;
	}
	.hint {
		@apply text-center text-muted-foreground;
		font-size: calc(0.875rem * var(--font-scale, 1)) !important;
	}
	.list-col {
		@apply flex flex-col gap-6;
	}
	.places {
		@apply flex flex-col gap-3;
	}
	.places > li {
		@apply scroll-mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors duration-300;
	}
	.places > li.selected {
		@apply border-primary bg-primary/5;
	}
	/* app.css grossit les <h2> de <main> : une classe l'emporte, en gardant l'échelle A−/A+ */
	h2 {
		@apply font-semibold text-foreground;
		font-family: 'Lora', Georgia, serif;
		font-size: calc(1.125rem * var(--font-scale, 1)) !important;
	}
	.description {
		@apply mt-1 text-foreground/80;
		font-size: calc(1rem * var(--font-scale, 1)) !important;
	}
	.tools ul {
		@apply mt-3 flex flex-wrap gap-2;
	}
	.tools a {
		@apply inline-flex min-h-11 items-center gap-1 rounded-full border border-foreground/40 px-4 py-2 font-medium transition-colors hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none;
	}

	@media (prefers-reduced-motion: reduce) {
		.places > li {
			transition: none;
		}
	}
</style>
