<script lang="ts">
	import { resolve } from '$app/paths';
	import { MONTH_PALETTES } from '$lib/almanach/palettes';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import JsonLd from '$lib/seo/JsonLd.svelte';
	import PereUbuFigure from '$lib/components/kingdom-tour/PereUbuFigure.svelte';
	import { SITE_LOGO, SITE_NAME, SITE_URL, absoluteUrl } from '$lib/seo/site';
	import type { PageProps } from './$types';

	// Constantes

	/** Le site et son éditeur, décrits aux moteurs (schema.org) */
	const HOME_JSON_LD = {
		'@context': 'https://schema.org',
		'@graph': [
			{ '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, inLanguage: 'fr' },
			{
				'@type': 'Organization',
				name: SITE_NAME,
				url: SITE_URL,
				logo: absoluteUrl(SITE_LOGO)
			}
		]
	};

	let { data }: PageProps = $props();

	// Le serveur choisit le mois (un jour hors-mois prend celui qui le précède, cf. palettes.ts)
	const ambiance = $derived(MONTH_PALETTES[data.ambianceMonth]);
</script>

<SeoHead
	title="Chiphre - Les maths de la chandelle verte"
	description="Chiphre, les maths de la chandelle verte : exercices interactifs, automatismes, jeux et outils de mathématiques pour les élèves, de la 6ᵉ à la Terminale."
/>
<JsonLd data={HOME_JSON_LD} />

<!-- Grille 1fr / auto / 1fr : Père Ubu occupe la rangée du milieu, donc le centre exact de la zone.
     Le titre se cale en haut de la première rangée, le Shtam en bas de la dernière. -->
<div
	class="zone relative container mx-auto grid h-full grid-rows-[1fr_auto_1fr] justify-items-center overflow-hidden px-4 py-3 text-center"
>
	<div class="flex flex-col items-center gap-1 self-start">
		<h1 class="titre text-3xl font-bold sm:text-4xl">
			Les maths de la chandelle <span class="text-primary">verte</span>
		</h1>
		<a href={resolve('/(public)/royaume')} class="visite" data-testid="home-tour">
			Visiter le Royaume <span aria-hidden="true">→</span>
		</a>
	</div>

	<PereUbuFigure
		{ambiance}
		href={resolve('/(public)/royaume')}
		label="Père Ubu : visiter le Royaume avec lui"
	/>

	{#if data.shtam}
		<!-- Dépêche discrète : tout en bas, juste au-dessus du bouton « Infos et confidentialité » -->
		<a
			href={resolve('/(public)/shtam/[slug]', { slug: data.shtam.slug })}
			class="depeche"
			data-testid="home-shtam"
		>
			<span class="depeche-label"><span class="dot" aria-hidden="true"></span>Le Shtam</span>
			<span class="depeche-text">{data.shtam.title}</span>
		</a>
	{/if}
</div>

<style lang="postcss">
	@reference "../../app.css";

	/* La zone est un conteneur de taille : Ubu rétrécit selon la hauteur disponible
	   (240 px quand il y a la place), pour que tout tienne sans défiler sur petit écran.
	   Chaque rangée 1fr doit garder la place du titre (2 lignes + le lien de la visite)
	   ou du Shtam. */
	.zone {
		container-type: size;
	}
	.zone :global(figure) {
		--ubu-size: clamp(5rem, calc(100cqh - 15rem), 15rem);
	}
	.visite {
		@apply rounded-md px-2 py-0.5 text-sm text-foreground underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
	}
	.depeche {
		@apply flex max-w-xs items-baseline gap-2 self-end rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-foreground;
	}
	.depeche-label {
		@apply flex shrink-0 items-center gap-1.5 text-[0.65rem] font-bold tracking-wider text-destructive uppercase;
	}
	.dot {
		@apply inline-block h-1.5 w-1.5 rounded-full bg-destructive;
		animation: clignote 1.2s ease-in-out infinite;
	}
	@keyframes clignote {
		50% {
			opacity: 0.2;
		}
	}
	.depeche-text {
		@apply line-clamp-2 leading-snug;
	}
	/* Zone basse (petit téléphone) : titre resserré. Après les règles de base,
	   pour les remplacer à spécificité égale. */
	@container (max-height: 560px) {
		.titre {
			@apply text-2xl;
		}
		.zone :global(figure) {
			--ubu-size: clamp(5rem, calc(100cqh - 12.5rem), 15rem);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}
</style>
