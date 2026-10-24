<!--
	Carrefour des démonstrations publiques (`/demo`)
	================================================

	Ne relie que des pages ouvertes à tous. Les bancs d'essai et les pages de
	test sont partis sous `/dev` (chantier demo-debug) ; l'accueil de la vitrine
	remplacera cette page (phase 7).
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Gamepad2, Presentation, Circle } from '@lucide/svelte';

	const demoPages = [
		{
			title: 'Cercle Trigonométrique',
			description: 'Visualisation du cercle unité avec valeurs remarquables et équations',
			href: '/demo/trig-circle-demo',
			icon: Circle,
			color: 'from-blue-500 to-indigo-500'
		},
		{
			title: 'Mathémo',
			description: 'Wordle mathématique avec termes français par niveau (6ème-Tale)',
			href: '/games/mathemo',
			icon: Gamepad2,
			color: 'from-rose-500 to-pink-500'
		},
		{
			title: 'Trio',
			description: "Jeu mathématique: alignez 3 nombres pour résoudre l'équation",
			href: '/games/trio',
			icon: Gamepad2,
			color: 'from-indigo-500 to-purple-500'
		}
	];
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Hero Section -->
	<div class="mb-12 text-center">
		<div class="mb-4 inline-flex items-center justify-center">
			<Presentation class="mr-3 h-12 w-12 text-primary" />
			<h1 class="text-4xl font-bold text-foreground">Démonstrations</h1>
		</div>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
			Explorez quelques fonctionnalités de l'application Chiphre
		</p>
	</div>

	<!-- Demo Pages Grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each demoPages as demo (demo.href)}
			<a href={demo.href} data-sveltekit-preload-data="hover" class="group block">
				<Card.Root
					class="h-full border-2 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
				>
					<Card.Header>
						<div class="mb-2 flex items-start justify-between">
							<div
								class="rounded-lg bg-gradient-to-br p-3 {demo.color} text-white shadow-md transition-shadow group-hover:shadow-lg"
							>
								<!-- Svelte 5: Components are dynamic by default -->
								<demo.icon class="h-6 w-6" />
							</div>
						</div>
						<Card.Title class="text-xl transition-colors group-hover:text-primary">
							{demo.title}
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-muted-foreground">{demo.description}</p>
					</Card.Content>
					<Card.Footer>
						<Button variant="ghost" class="w-full group-hover:bg-primary/10">Voir la démo →</Button>
					</Card.Footer>
				</Card.Root>
			</a>
		{/each}
	</div>
</div>
