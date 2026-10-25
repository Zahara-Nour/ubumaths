<!--
	Accueil de la vitrine (`/demo`)
	===============================

	Une carte par vitrine, dans l'ordre de `DEMO_PAGES` (chantier demo-debug,
	PR 7). Page carrefour : pas de lien de retour. Les jeux vivent dans `/games`.
-->
<script lang="ts">
	import { DEMO_HUB, DEMO_PAGES } from '$lib/seo/demo-pages';
	import { resolve } from '$app/paths';
	import { ArrowRight } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Démonstrations — Chiphre</title>
	<meta name="description" content={DEMO_HUB.description} />
</svelte:head>

<div class="container mx-auto max-w-5xl space-y-8 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold">{DEMO_HUB.title}</h1>
		<p class="text-muted-foreground">
			Voyez Chiphre en action, sans compte : chaque page montre un outil tel que le trouvent les
			élèves et les professeurs.
		</p>
	</header>

	<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each DEMO_PAGES as demo (demo.path)}
			<li>
				<a
					href={resolve(demo.path)}
					data-sveltekit-preload-data="hover"
					class="group flex h-full flex-col gap-2 rounded-lg border bg-card p-5 transition-colors hover:border-primary"
				>
					<h2 class="font-semibold group-hover:text-primary">{demo.title}</h2>
					<p class="flex-1 text-muted-foreground">{demo.description}</p>
					<span class="inline-flex items-center gap-1 text-sm text-primary" aria-hidden="true">
						Voir <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
					</span>
				</a>
			</li>
		{/each}
	</ul>
</div>
