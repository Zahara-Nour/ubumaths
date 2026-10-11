<!--
	Page d'erreur de tout le site (404, 403, 500…).

	Reprend la page de l'ancien site — la spirale de π qui tourne et sa question
	sur les décimales — en rendant la blague vraie : le code d'erreur est situé à
	sa première apparition dans les décimales de π, et coloré dans la spirale.

	⚠️ SvelteKit précharge ce composant sur TOUTES les pages : il reste léger, et
	la spirale (1 800 décimales, ~1 700 nœuds SVG) est chargée à la demande.

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
	import avatarPereUbu from '$lib/assets/images/avatar-pereubu.png';
	import { describeError } from '$lib/error-page/error-copy';
	import { frenchOrdinal, piOccurrence } from '$lib/error-page/pi-status';
	import { suggestPages } from '$lib/error-page/suggestions';

	const status = $derived(page.status);
	const copy = $derived(describeError(status, page.error?.message));
	const occurrence = $derived(piOccurrence(status));
	const suggestions = $derived(status === 404 ? suggestPages(page.url.pathname) : []);
	const technicalDetail = $derived(page.error?.detail ?? copy.technicalDetail);
	// Début de l'extrait : « 3, » quand le code suit presque la virgule (415), « … » sinon
	const excerptStart = $derived(
		occurrence && occurrence.position - 1 <= occurrence.before.length ? '3,' : '…'
	);

	// « Page précédente » seulement si elle ramène sur Chiphre : navigation interne
	// (`from`), ou arrivée par un lien du site. `history.length` compte aussi
	// l'onglet neuf. Connu après le montage : le serveur n'a pas d'historique.
	let canGoBack = $state(false);
	afterNavigate(({ from }) => {
		canGoBack = from !== null || document.referrer.startsWith(`${location.origin}/`);
	});

	// Chargée à la demande : ce composant-ci est préchargé partout
	const spiral = import('$lib/components/error-page/PiSpiral.svelte');
</script>

<svelte:head>
	<title>{copy.title} | Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-8 text-center sm:py-12">
	<!-- Place réservée d'avance : la spirale arrive sans décaler la page -->
	<div class="relative aspect-square w-[min(28rem,85vw)]">
		{#await spiral then { default: PiSpiral }}
			<div class="absolute inset-0">
				<PiSpiral highlightPosition={occurrence?.position ?? null} />
			</div>
		{/await}
		<img
			src={avatarPereUbu}
			alt=""
			width="262"
			height="266"
			class="absolute top-1/2 left-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-500 bg-background object-cover dark:border-amber-400"
		/>
	</div>

	<div class="flex flex-col items-center gap-3">
		<p class="font-semibold tracking-widest text-muted-foreground uppercase">
			Erreur {status}
		</p>
		<h1 class="text-3xl font-bold text-balance sm:text-4xl">{copy.title}</h1>
		<p class="text-balance text-muted-foreground">{copy.explanation}</p>
		{#if copy.detail}
			<p class="rounded-md bg-muted px-3 py-1">{copy.detail}</p>
		{/if}
	</div>

	{#if occurrence}
		<div class="flex flex-col items-center gap-2">
			<p class="text-balance">
				Le nombre {status}, lui, se trouve toujours : il apparaît pour la première fois à la
				<strong>{frenchOrdinal(occurrence.position)} décimale</strong> de π.
			</p>
			<!-- Redit visuellement la phrase précédente : masqué aux lecteurs d'écran -->
			<p class="font-mono tracking-wider tabular-nums" aria-hidden="true">
				π = {excerptStart}{occurrence.before}<span
					class="font-bold text-amber-600 dark:text-amber-400">{status}</span
				>{occurrence.after}…
			</p>
		</div>
	{/if}

	{#if suggestions.length > 0}
		<nav aria-labelledby="suggestions-title" class="flex flex-col items-center gap-2">
			<p id="suggestions-title" class="font-semibold">Tu cherchais peut-être :</p>
			<ul class="flex flex-wrap justify-center gap-2">
				{#each suggestions as suggestion (suggestion.path)}
					<li>
						<Button href={suggestion.path} variant="outline" size="sm">{suggestion.title}</Button>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	<div class="flex flex-wrap justify-center gap-3">
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
			<summary class="cursor-pointer text-center">Détails techniques</summary>
			<p class="mt-2 rounded-md bg-muted p-3 font-mono break-all">{technicalDetail}</p>
		</details>
	{/if}
</div>
