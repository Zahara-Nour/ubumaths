<script lang="ts">
	import {
		// Sword,
		Lock
		// Target
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Check if user is authenticated
	const isAuthenticated = $derived(!!data.user);

	// Game cards data
	const games: Array<{
		title: string;
		description: string;
		// icon: typeof Target | typeof Sword;
		href: string;
		color: string;
		// emoji: string;
		public: boolean;
		image?: string;
	}> = [
		{
			title: 'Trio',
			description: '',
			// icon: Target,
			href: '/games/trio',
			color: 'from-green-500 to-blue-600',
			// emoji: '🎯',
			public: true
		},
		{
			title: 'Mathémo',
			description: '',
			// icon: Target,
			href: '/games/mathemo',
			color: 'from-cyan-500 to-blue-600',
			// emoji: '🔤',
			public: true
		},
		{
			title: 'Démineur',
			description: '',
			// icon: Target,
			href: '/games/minesweeper',
			color: 'from-cyan-500 to-blue-600',
			// emoji: '🔤',
			public: true
		},
		{
			title: '2048',
			description: 'Fusionnez les tuiles pour atteindre 2048 !',
			href: '/games/2048',
			color: 'from-amber-500 to-orange-600',
			public: true
		}
		// {
		// 	title: 'Navadra',
		// 	description: '',
		// 	icon: Sword,
		// 	href: '/dashboard/navadra',
		// 	color: 'from-red-500 to-orange-600',
		// 	emoji: '⚔️',
		// 	public: false
		// }
	];
</script>

<svelte:head>
	<title>Jeux Mathématiques | UbuMaths</title>
	<meta
		name="description"
		content="Apprenez les mathématiques en vous amusant avec nos jeux éducatifs : Trio, Mathémo, 2048 et Navadra."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl">
	<!-- Hero Section -->
	<section class="mb-12 text-center">
		<div class="mb-4 flex justify-center">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-4xl shadow-lg"
			>
				<!-- 🎮 -->
			</div>
		</div>
		<h1 class="mb-4 text-4xl font-bold text-foreground md:text-5xl">Jeux</h1>
	</section>

	<!-- Games Grid -->
	<section class="mb-12">
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each games as game (game.href)}
				<a
					href={game.public || isAuthenticated ? game.href : '/auth/login'}
					class="group relative block cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
				>
					<!-- Background gradient on hover -->
					<div
						class="absolute inset-0 bg-gradient-to-br {game.color} opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>

					<!-- Card content -->
					<div class="relative p-8">
						<!-- Icon/Image -->
						<div class="mb-6 flex items-center gap-4">
							{#if game.image}
								<img
									src={game.image}
									alt={game.title}
									class="h-16 w-16 rounded-full border-2 border-border shadow-md"
								/>
							{:else}
								<div
									class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br {game.color} text-3xl shadow-md"
								>
									<!-- {game.emoji} -->
								</div>
							{/if}
							<div>
								<h2 class="text-2xl font-bold text-card-foreground">{game.title}</h2>
								{#if !game.public}
									<span
										class="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
									>
										<Lock class="h-3 w-3" />
										Connexion requise
									</span>
								{/if}
							</div>
						</div>

						<!-- Description -->
						<p class="text-muted-foreground">
							{game.description}
						</p>
					</div>
				</a>
			{/each}
		</div>
	</section>
</div>
