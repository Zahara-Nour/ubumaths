<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { MessageCircle, Sparkles, Sword, Lock, Target } from 'lucide-svelte';
	import pereUbuImage from '$lib/assets/images/pereubu.png';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Check if user is authenticated
	const isAuthenticated = $derived(!!data.session);

	// Game cards data
	const games = [
		{
			title: 'Père Ubu',
			description: 'Discutez avec le Père Ubu, votre professeur de mathématiques pataphysique. Posez vos questions et recevez des explications... originales !',
			icon: MessageCircle,
			href: '/pere-ubu',
			color: 'from-purple-500 to-indigo-600',
			emoji: '🎭',
			public: true,
			image: pereUbuImage
		},
		{
			title: 'Trio',
			description: 'Trouvez trois nombres alignés qui satisfont une équation mathématique. Entraînez-vous au calcul mental tout en résolvant des puzzles !',
			icon: Target,
			href: '/games/trio',
			color: 'from-green-500 to-blue-600',
			emoji: '🎯',
			public: true
		},
		{
			title: 'Navadra',
			description: 'Affrontez des monstres épiques en résolvant des problèmes mathématiques. Gagnez de l\'expérience et débloquez de nouveaux sorts !',
			icon: Sword,
			href: '/dashboard/navadra',
			color: 'from-red-500 to-orange-600',
			emoji: '⚔️',
			public: false
		}
	];
</script>

<svelte:head>
	<title>Jeux Mathématiques | UbuMaths</title>
	<meta
		name="description"
		content="Apprenez les mathématiques en vous amusant avec nos jeux éducatifs : Père Ubu, Trio et Navadra."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl">
	<!-- Hero Section -->
	<section class="mb-12 text-center">
		<div class="mb-4 flex justify-center">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-4xl shadow-lg"
			>
				🎮
			</div>
		</div>
		<h1 class="mb-4 text-4xl font-bold text-foreground md:text-5xl">
			Jeux Mathématiques
		</h1>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
			Apprenez les mathématiques en vous amusant ! Explorez nos jeux éducatifs interactifs et
			progressez tout en jouant.
		</p>
	</section>

	<!-- Games Grid -->
	<section class="mb-12">
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each games as game}
				<div
					class="group relative overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-all hover:shadow-xl"
				>
					<!-- Background gradient on hover -->
					<div
						class="absolute inset-0 bg-gradient-to-br {game.color} opacity-0 transition-opacity duration-300 group-hover:opacity-5"
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
									{game.emoji}
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
						<p class="mb-6 text-muted-foreground">
							{game.description}
						</p>

						<!-- Action button -->
						{#if game.public || isAuthenticated}
							<Button
								href={game.href}
								class="w-full bg-gradient-to-r {game.color} text-white hover:opacity-90"
							>
								<Sparkles class="mr-2 h-5 w-5" />
								Jouer maintenant
							</Button>
						{:else}
							<Button href="/auth/login" variant="outline" class="w-full">
								<Lock class="mr-2 h-4 w-4" />
								Se connecter pour jouer
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Coming Soon Section -->
	<section class="rounded-xl border border-border bg-card/50 p-8 text-center">
		<div class="mb-4 text-4xl">🚀</div>
		<h3 class="mb-2 text-xl font-bold text-card-foreground">Bientôt disponible</h3>
		<p class="text-muted-foreground">
			De nouveaux jeux mathématiques sont en cours de développement. Restez connectés !
		</p>
	</section>
</div>
