<!--
	Page d'erreur de tout le site (404, 403, 500…).

	Reprend la page de l'ancien site — la spirale de π qui tourne et sa question
	sur les décimales — en rendant la blague vraie : le code d'erreur est situé à
	sa première apparition dans les décimales de π, et coloré dans la spirale.

	⚠️ SvelteKit précharge ce composant sur TOUTES les pages : il doit rester léger.
	La spirale y est pourtant importée statiquement, pour être rendue par le serveur
	et visible dès le HTML (chargée à la demande, elle apparaissait en retard) :
	1,6 Ko compressé de plus sur le chunk préchargé, mesuré au build.

	Le layout racine masque en-tête et barre latérale sous /dashboard : une erreur
	y est rendue sans navigation. Les boutons de cette page sont alors la seule
	sortie — ils ne doivent jamais disparaître.

	Doc : docs/systeme/page-erreur.md
-->
<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import PiSpiral from '$lib/components/error-page/PiSpiral.svelte';
	import avatarPereUbu from '$lib/assets/images/avatar-pereubu.png';
	import { describeError } from '$lib/error-page/error-copy';
	import { frenchOrdinal, piOccurrence } from '$lib/error-page/pi-status';
	import { suggestPages } from '$lib/error-page/suggestions';

	const status = $derived(page.status);
	const copy = $derived(describeError(status, page.error?.message));
	const occurrence = $derived(piOccurrence(status));
	const suggestions = $derived(status === 404 ? suggestPages(page.url.pathname) : []);
	const technicalDetail = $derived(page.error?.detail ?? copy.technicalDetail);

	// Actions secondaires : simples liens, un seul bouton plein par page
	const secondaryLinkClass =
		'text-muted-foreground underline-offset-4 hover:text-foreground hover:underline';

	// « A », « A ou B », « A, B ou C »
	function separator(index: number): string {
		if (index === 0) return '';
		return index === suggestions.length - 1 ? ' ou ' : ', ';
	}

	// « Page précédente » seulement si elle ramène sur Chiphre : navigation interne
	// (`from`), ou arrivée par un lien du site. `history.length` compte aussi
	// l'onglet neuf. Connu après le montage : le serveur n'a pas d'historique.
	let canGoBack = $state(false);
	afterNavigate(({ from }) => {
		canGoBack = from !== null || document.referrer.startsWith(`${location.origin}/`);
	});
</script>

<svelte:head>
	<title>{copy.title} | Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Desktop : deux colonnes (spirale | texte), le tout tient dans la hauteur de l'écran.
	Mobile : une colonne, la spirale au-dessus. -->
<div
	class="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-8 sm:py-12 lg:min-h-full lg:flex-row lg:justify-center lg:gap-12"
>
	<div class="relative aspect-square w-[min(28rem,85vw)] shrink-0 lg:w-[min(30rem,40vw,70vh)]">
		<div class="absolute inset-0">
			<PiSpiral highlightPosition={occurrence?.position ?? null} />
		</div>
		<img
			src={avatarPereUbu}
			alt=""
			width="262"
			height="266"
			class="absolute top-1/2 left-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-500 bg-background object-cover dark:border-amber-400"
		/>
	</div>

	<div class="flex max-w-xl flex-col items-center gap-6 text-center lg:items-start lg:text-left">
		<div class="flex flex-col items-center gap-3 lg:items-start">
			<p class="font-semibold tracking-widest text-muted-foreground uppercase">
				Erreur {status}
			</p>
			<h1 class="text-3xl font-bold text-balance sm:text-4xl">{copy.title}</h1>
		</div>

		{#if occurrence}
			<p class="text-balance">
				Le nombre {status}
				{copy.piVerb}
				<strong>{frenchOrdinal(occurrence.position)} décimale</strong>&nbsp;de&nbsp;π{copy.piTwist}.
			</p>
		{/if}

		{#if suggestions.length > 0}
			<nav aria-label="Pages proches">
				<p class="text-balance">
					Tu cherchais peut-être
					{#each suggestions as suggestion, i (suggestion.path)}{separator(i)}<a
							href={suggestion.path}
							class="font-semibold text-amber-600 underline-offset-4 hover:underline dark:text-amber-400"
							>{suggestion.title}</a
						>{/each}{suggestions.at(-1)?.title.endsWith('?') ? '' : '\u00a0?'}
				</p>
			</nav>
		{/if}

		<div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
			{#if copy.offerLogin}
				<Button href={resolve('/auth/login')}>Se connecter</Button>
			{:else if copy.offerRetry}
				<Button onclick={() => location.reload()}>Réessayer</Button>
			{/if}
			{#if copy.offerLogin || copy.offerRetry}
				<a href={resolve('/')} class={secondaryLinkClass}>Retour à l’accueil</a>
			{:else}
				<Button href={resolve('/')}>Retour à l’accueil</Button>
			{/if}
			{#if canGoBack}
				<button type="button" class={secondaryLinkClass} onclick={() => history.back()}>
					← Page précédente
				</button>
			{/if}
		</div>

		{#if technicalDetail}
			<details class="w-full text-left text-sm text-muted-foreground">
				<summary class="cursor-pointer text-center lg:text-left">Détails techniques</summary>
				<p class="mt-2 rounded-md bg-muted p-3 font-mono break-all">{technicalDetail}</p>
			</details>
		{/if}
	</div>
</div>
