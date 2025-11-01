<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { playerStore } from '$lib/stores/game/player.svelte';
	import { spellsStore } from '$lib/stores/game/spells.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Initialize stores with server data
	onMount(() => {
		if (data.gamePlayer) {
			playerStore.syncWithServer(data.gamePlayer);
		}
		if (data.spells) {
			spellsStore.spells = data.spells;
		}
		if (data.activeDeck) {
			spellsStore.activeDeck = data.activeDeck;
		}
		if (data.allDecks) {
			spellsStore.allDecks = data.allDecks;
		}
	});

	// Handle exit game
	function handleExitGame() {
		goto('/dashboard').then(() => {});
	}
</script>

<!-- Fullscreen game container -->
<div class="game-container fixed inset-0 z-50 bg-background">
	<!-- Game Header -->
	<header
		class="game-header flex items-center justify-between border-b border-border bg-card px-4 py-2"
	>
		<!-- Left: Game Title -->
		<div class="flex items-center gap-2">
			<h1 class="text-xl font-bold text-foreground">Navadra</h1>
		</div>

		<!-- Center: Player Stats -->
		<div class="flex items-center gap-4">
			<!-- Level & XP -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Niveau {playerStore.level}</span>
				<div class="h-2 w-32 rounded-full bg-muted">
					<div
						class="h-full rounded-full bg-primary transition-all"
						style="width: {playerStore.xpProgress}%"
					></div>
				</div>
			</div>

			<!-- Prestige -->
			<div class="flex items-center gap-1">
				<span class="text-sm text-muted-foreground">Prestige:</span>
				<span class="text-sm font-medium text-foreground">{playerStore.prestige}</span>
			</div>

			<!-- Element Pyrs -->
			<div class="flex items-center gap-2">
				<div class="flex items-center gap-1" title="Pyrs Feu">
					<span class="text-sm">🔥</span>
					<span class="text-sm font-medium">{playerStore.elementPyrs.fire}</span>
				</div>
				<div class="flex items-center gap-1" title="Pyrs Eau">
					<span class="text-sm">💧</span>
					<span class="text-sm font-medium">{playerStore.elementPyrs.water}</span>
				</div>
				<div class="flex items-center gap-1" title="Pyrs Terre">
					<span class="text-sm">🌍</span>
					<span class="text-sm font-medium">{playerStore.elementPyrs.earth}</span>
				</div>
				<div class="flex items-center gap-1" title="Pyrs Vent">
					<span class="text-sm">💨</span>
					<span class="text-sm font-medium">{playerStore.elementPyrs.wind}</span>
				</div>
			</div>
		</div>

		<!-- Right: Exit Button -->
		<button
			onclick={handleExitGame}
			class="rounded-md bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
		>
			Quitter le jeu
		</button>
	</header>

	<!-- Game Content -->
	<main class="game-content h-[calc(100vh-60px)] overflow-auto">
		{@render children()}
	</main>
</div>
