<!--
	Carnet de liaison — la page du parent (ADR 0040 ; B1-B5, E5)
	============================================================

	Ce que voit un parent, sans compte, par son lien : le carnet de son enfant
	(`CarnetView`) et le réglage de ses courriels. Rien d'autre : pas de
	navigation vers le reste de l'application, pas de connexion suggérée.

	`?bienvenue` : on arrive de la confirmation de l'adresse ; le lien est sous
	les yeux du parent, il faut lui dire de le garder.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import CarnetView from '$lib/components/carnet/CarnetView.svelte';
	import { Mail } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let pending = $state(false);

	const welcome = $derived(page.url.searchParams.has('bienvenue'));
	const name = $derived(data.carnet.firstname?.trim() || 'votre enfant');
</script>

<svelte:head>
	<title>Carnet de liaison — {name}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-bold">Carnet de liaison</h1>
		<p class="text-muted-foreground">Le travail de {name} sur Chiphre.</p>
	</header>

	{#if welcome}
		<div class="rounded-lg border border-border bg-muted/40 p-4 text-sm" role="status">
			<p class="font-medium">Votre adresse est confirmée.</p>
			<p class="mt-1 text-muted-foreground">
				Ce lien vous est propre : ajoutez cette page à vos favoris, ou à l'écran d'accueil de votre
				téléphone. Ne le transférez pas ; l'autre parent peut recevoir le sien.
			</p>
		</div>
	{/if}

	<CarnetView carnet={data.carnet} />

	<Card.Root id="courriels">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-lg">
				<Mail class="size-5 text-muted-foreground" aria-hidden="true" />
				Courriels
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#if data.carnet.emails_stopped}
				<p class="text-sm">
					Vous ne recevez plus de courriels. Cette page reste ouverte et à jour.
				</p>
				<form
					method="POST"
					action="?/resumeEmails"
					use:enhance={() => {
						pending = true;
						return async ({ update }) => {
							await update();
							pending = false;
						};
					}}
				>
					<Button type="submit" variant="outline" disabled={pending}>
						Recevoir à nouveau les courriels
					</Button>
				</form>
			{:else}
				<p class="text-sm text-muted-foreground">
					Chiphre ne vous écrit que si quelque chose mérite votre attention : une évaluation non
					faite, des révisions en retard, une longue absence de travail. Au plus un courriel par
					semaine.
				</p>
				<form
					method="POST"
					action="?/stopEmails"
					use:enhance={() => {
						pending = true;
						return async ({ update }) => {
							await update();
							pending = false;
						};
					}}
				>
					<Button type="submit" variant="outline" disabled={pending}>
						Ne plus recevoir ces courriels
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
