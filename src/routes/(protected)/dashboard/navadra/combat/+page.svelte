<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import MonsterCard from '$lib/components/game/combat/MonsterCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
</script>

<div class="combat-selection mx-auto max-w-6xl p-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="mb-4">
			<Button href="/dashboard/navadra" variant="ghost" class="gap-2">
				← Retour au hub
			</Button>
		</div>
		<h1 class="mb-2 text-4xl font-bold text-foreground">Choisis ton adversaire</h1>
		<p class="text-lg text-muted-foreground">
			Affronte un monstre et résous des défis mathématiques pour gagner de l'XP et des récompenses !
		</p>
	</div>

	<!-- Quick Start -->
	<div class="mb-8 rounded-lg border border-primary bg-primary/10 p-6">
		<h2 class="mb-3 text-2xl font-bold text-foreground">Combat rapide</h2>
		<p class="mb-4 text-muted-foreground">
			Commence un combat contre un monstre aléatoire adapté à ton niveau.
		</p>

		<form method="POST" action="?/startCombat" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}>
			<Button type="submit" size="lg" disabled={loading}>
				{loading ? 'Génération...' : '⚔️ Commencer un combat'}
			</Button>
		</form>
	</div>

	<!-- DEBUG: Weak Monster -->
	<div class="mb-8 rounded-lg border border-yellow-500 bg-yellow-50 p-6 dark:bg-yellow-950/20">
		<h2 class="mb-3 text-2xl font-bold text-foreground">🐛 DEBUG: Monstre faible</h2>
		<p class="mb-4 text-muted-foreground">
			Affronte un monstre de test avec seulement 1 PV pour tester rapidement la victoire.
		</p>

		<form method="POST" action="?/spawnDebugMonster" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}>
			<Button type="submit" size="lg" variant="outline" disabled={loading} class="border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
				{loading ? 'Création...' : '🐛 Combattre un monstre DEBUG (1 PV)'}
			</Button>
		</form>
	</div>

	<!-- Available Monsters -->
	{#if data.availableMonsters.length > 0}
		<div class="mb-8">
			<h2 class="mb-4 text-2xl font-bold text-foreground">Monstres disponibles</h2>

			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{#each data.availableMonsters as monster}
					<form method="POST" action="?/startCombat" use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
						};
					}}>
						<input type="hidden" name="monster_id" value={monster.id} />
						<MonsterCard {monster} onclick={() => {}} selectable={true} />
					</form>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Player Stats Summary -->
	<div class="rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-xl font-bold text-card-foreground">Tes statistiques</h2>

		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<div class="text-center">
				<p class="text-2xl font-bold text-primary">{data.gamePlayer.level}</p>
				<p class="text-sm text-muted-foreground">Niveau</p>
			</div>
			<div class="text-center">
				<p class="text-2xl font-bold text-primary">{data.gamePlayer.combats_won}</p>
				<p class="text-sm text-muted-foreground">Victoires</p>
			</div>
			<div class="text-center">
				<p class="text-2xl font-bold text-primary">{data.gamePlayer.combats_lost}</p>
				<p class="text-sm text-muted-foreground">Défaites</p>
			</div>
			<div class="text-center">
				<p class="text-2xl font-bold text-primary">
					{data.gamePlayer.total_combats > 0
						? Math.round((data.gamePlayer.combats_won / data.gamePlayer.total_combats) * 100)
						: 0}%
				</p>
				<p class="text-sm text-muted-foreground">Taux de victoire</p>
			</div>
		</div>
	</div>
</div>
