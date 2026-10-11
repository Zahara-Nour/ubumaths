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
			{#if copy.explanation}
				<p class="text-balance text-muted-foreground">{copy.explanation}</p>
			{/if}
			{#if copy.detail}
				<p class="rounded-md bg-muted px-3 py-1">{copy.detail}</p>
			{/if}
		</div>

		{#if occurrence}
			<p class="text-balance">
				Le nombre {status} apparaît à la
				<strong>{frenchOrdinal(occurrence.position)} décimale</strong> de π{#if status === 404},
					mais la page, elle, reste introuvable{/if}.
			</p>
		{/if}

		{#if suggestions.length > 0}
			<nav
				aria-labelledby="suggestions-title"
				class="flex flex-col items-center gap-2 lg:items-start"
			>
				<p id="suggestions-title" class="font-semibold">Tu cherchais peut-être :</p>
				<ul class="flex flex-wrap justify-center gap-2 lg:justify-start">
					{#each suggestions as suggestion (suggestion.path)}
						<li>
							<Button href={suggestion.path} variant="outline" size="sm">{suggestion.title}</Button>
						</li>
					{/each}
				</ul>
			</nav>
		{/if}

		<div class="flex flex-wrap justify-center gap-3 lg:justify-start">
			{#if copy.offerLogin}
				<Button href={resolve('/auth/login')}>Se connecter</Button>
			{/if}
			{#if copy.offerRetry}
				<Button onclick={() => location.reload()}>Réessayer</Button>
			{/if}
			<Button
				href={resolve('/')}
				variant={copy.offerLogin || copy.offerRetry ? 'outline' : 'default'}
			>
				Retour à l’accueil
			</Button>
			{#if canGoBack}
				<Button variant="outline" onclick={() => history.back()}>Page précédente</Button>
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
