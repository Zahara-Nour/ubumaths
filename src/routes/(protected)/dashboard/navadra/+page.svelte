<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { playerStore } from '$lib/stores/game/player.svelte';
	import { spellsStore } from '$lib/stores/game/spells.svelte';

	// Game stats
	const stats = $derived({
		level: playerStore.level,
		xp: playerStore.xp,
		xpForNextLevel: playerStore.xpForNextLevel,
		prestige: playerStore.prestige,
		totalSpells: spellsStore.totalSpells,
		combatsWon: playerStore.combatsWon,
		combatsLost: playerStore.combatsLost,
		winRate: playerStore.winRate.toFixed(1)
	});
</script>

<div class="game-hub mx-auto max-w-6xl p-8">
	<!-- Welcome Section -->
	<section class="mb-8">
		<h1 class="mb-2 text-4xl font-bold text-foreground">Bienvenue dans Navadra !</h1>
		<p class="text-lg text-muted-foreground">
			Apprends les mathématiques en combattant des monstres épiques.
		</p>
	</section>

	<!-- Player Stats Card -->
	<section class="mb-8 rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-2xl font-bold text-card-foreground">Tes Statistiques</h2>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<div class="text-center">
				<p class="text-3xl font-bold text-primary">{stats.level}</p>
				<p class="text-sm text-muted-foreground">Niveau</p>
			</div>
			<div class="text-center">
				<p class="text-3xl font-bold text-primary">{stats.prestige}</p>
				<p class="text-sm text-muted-foreground">Prestige</p>
			</div>
			<div class="text-center">
				<p class="text-3xl font-bold text-primary">{stats.combatsWon}</p>
				<p class="text-sm text-muted-foreground">Victoires</p>
			</div>
			<div class="text-center">
				<p class="text-3xl font-bold text-primary">{stats.winRate}%</p>
				<p class="text-sm text-muted-foreground">Taux de victoire</p>
			</div>
		</div>

		<!-- XP Progress Bar -->
		<div class="mt-6">
			<div class="mb-2 flex justify-between text-sm">
				<span class="text-muted-foreground">XP: {stats.xp} / {stats.xpForNextLevel}</span>
				<span class="text-muted-foreground">Prochain niveau</span>
			</div>
			<div class="h-4 w-full rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
					style="width: {(stats.xp / stats.xpForNextLevel) * 100}%"
				></div>
			</div>
		</div>
	</section>

	<!-- Main Actions Grid -->
	<section class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		<!-- Combat Card -->
		<a
			href="/dashboard/navadra/combat"
			class="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
		>
			<div class="mb-4 text-5xl">⚔️</div>
			<h3 class="mb-2 text-xl font-bold text-card-foreground group-hover:text-primary">
				Combattre
			</h3>
			<p class="text-sm text-muted-foreground">
				Affrontez des monstres et gagnez de l'expérience et des récompenses.
			</p>
		</a>

		<!-- Spells Card -->
		<a
			href="/dashboard/navadra/spells"
			class="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
		>
			<div class="mb-4 text-5xl">📖</div>
			<h3 class="mb-2 text-xl font-bold text-card-foreground group-hover:text-primary">Grimoire</h3>
			<p class="text-sm text-muted-foreground">
				Gérez vos sorts et créez des decks pour le combat. ({stats.totalSpells} sorts)
			</p>
		</a>

		<!-- Achievements Card -->
		<a
			href="/dashboard/navadra/achievements"
			class="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
		>
			<div class="mb-4 text-5xl">🏆</div>
			<h3 class="mb-2 text-xl font-bold text-card-foreground group-hover:text-primary">Succès</h3>
			<p class="text-sm text-muted-foreground">Consultez vos succès et vos progrès dans le jeu.</p>
		</a>

		<!-- Leaderboard Card -->
		<a
			href="/dashboard/navadra/leaderboard"
			class="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
		>
			<div class="mb-4 text-5xl">🥇</div>
			<h3 class="mb-2 text-xl font-bold text-card-foreground group-hover:text-primary">
				Classement
			</h3>
			<p class="text-sm text-muted-foreground">Comparez vos scores avec les autres joueurs.</p>
		</a>

		<!-- Profile Card -->
		<a
			href="/dashboard/navadra/profile"
			class="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
		>
			<div class="mb-4 text-5xl">👤</div>
			<h3 class="mb-2 text-xl font-bold text-card-foreground group-hover:text-primary">Profil</h3>
			<p class="text-sm text-muted-foreground">
				Consultez votre profil de joueur et vos statistiques détaillées.
			</p>
		</a>
	</section>

	<!-- Tutorial Section (if not completed) -->
	{#if !playerStore.tutorialCompleted}
		<section class="mt-8 rounded-lg border border-primary bg-primary/10 p-6">
			<h2 class="mb-2 text-xl font-bold text-foreground">Tutoriel</h2>
			<p class="mb-4 text-muted-foreground">
				Vous n'avez pas encore terminé le tutoriel. Complétez-le pour débloquer toutes les
				fonctionnalités !
			</p>
			<Button href="/dashboard/navadra/tutorial">Continuer le tutoriel</Button>
		</section>
	{/if}
</div>
