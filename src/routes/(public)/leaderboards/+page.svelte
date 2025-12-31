<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Trophy } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Classements | UbuMaths</title>
	<meta name="description" content="Classements des jeux UbuMaths" />
</svelte:head>

<div class="mx-auto max-w-4xl p-4 md:p-6">
	<div class="mb-8 text-center">
		<div class="mb-4 flex justify-center">
			<div
				class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg"
			>
				<Trophy class="h-8 w-8 text-white" />
			</div>
		</div>
		<h1 class="mb-2 text-3xl font-bold text-foreground md:text-4xl">Classements</h1>
		<p class="text-muted-foreground">Découvrez les meilleurs joueurs de chaque jeu</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<!-- Minesweeper -->
		<a href="/leaderboards/minesweeper" class="block">
			<Card
				class="p-6 transition-all hover:scale-[1.02] hover:shadow-lg hover:ring-2 hover:ring-primary/20"
			>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl"
					>
						💣
					</div>
					<div class="flex-1">
						<h2 class="text-xl font-bold text-foreground">Démineur</h2>
						<p class="text-sm text-muted-foreground">Meilleurs temps par difficulté</p>
					</div>
					<Button variant="ghost" size="sm">Voir</Button>
				</div>
			</Card>
		</a>

		<!-- 2048 - Coming soon -->
		<Card class="p-6 opacity-50">
			<div class="flex items-center gap-4">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-2xl"
				>
					🎮
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-bold text-foreground">2048</h2>
					<p class="text-sm text-muted-foreground">Bientôt disponible</p>
				</div>
			</div>
		</Card>

		<!-- Trio - Coming soon -->
		<Card class="p-6 opacity-50">
			<div class="flex items-center gap-4">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-2xl"
				>
					🎯
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-bold text-foreground">Trio</h2>
					<p class="text-sm text-muted-foreground">Bientôt disponible</p>
				</div>
			</div>
		</Card>

		<!-- Mathémo - Coming soon -->
		<Card class="p-6 opacity-50">
			<div class="flex items-center gap-4">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-2xl"
				>
					🔤
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-bold text-foreground">Mathémo</h2>
					<p class="text-sm text-muted-foreground">Bientôt disponible</p>
				</div>
			</div>
		</Card>
	</div>
</div>
