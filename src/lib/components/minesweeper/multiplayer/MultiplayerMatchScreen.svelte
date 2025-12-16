<script lang="ts">
	import OpponentProgressIndicator from './OpponentProgressIndicator.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import { multiplayerStore } from '$lib/stores/multiplayer.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let {
		playerProgress,
		onMatchComplete
	}: {
		playerProgress: {
			cellsRevealed: number;
			flagsUsed: number;
			timeElapsed: number;
		};
		onMatchComplete?: () => void;
	} = $props();

	// State
	let showAbandonDialog = $state(false);

	// Derived state from multiplayerStore
	let match = $derived(multiplayerStore.match);
	let matchStatus = $derived(multiplayerStore.matchStatus);
	let countdown = $derived(multiplayerStore.countdown);
	let opponentProgress = $derived(multiplayerStore.opponentProgress);

	let isCountdown = $derived(matchStatus === 'countdown');
	let isInProgress = $derived(matchStatus === 'in_progress');
	let isCompleted = $derived(matchStatus === 'completed');
	let isAbandoned = $derived(matchStatus === 'abandoned');

	let difficultyLabel = $derived.by(() => {
		if (!match || !match.difficulty) return '';
		const labels: Record<string, string> = {
			beginner: 'Débutant',
			intermediate: 'Intermédiaire',
			expert: 'Expert'
		};
		return labels[match.difficulty] || match.difficulty;
	});

	let matchTypeLabel = $derived(match?.matchType === 'quick' ? 'Rapide' : 'Classé');

	let playerFormattedTime = $derived.by(() => {
		const minutes = Math.floor(playerProgress.timeElapsed / 60);
		const seconds = playerProgress.timeElapsed % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	let statusMessage = $derived.by(() => {
		if (isCountdown)
			return `La partie commence dans ${countdown} seconde${countdown > 1 ? 's' : ''}...`;
		if (isInProgress) return 'En cours';
		if (isCompleted) return 'Partie terminée';
		if (isAbandoned) return 'Partie abandonnée';
		return '';
	});

	let statusEmoji = $derived.by(() => {
		if (isCountdown) return '⏱️';
		if (isInProgress) return '🎮';
		if (isCompleted) return '🏁';
		if (isAbandoned) return '❌';
		return '⏳';
	});

	// Functions
	async function handleAbandonMatch() {
		try {
			await multiplayerStore.abandonMatch('player_quit');
			toaster.info('Vous avez abandonné la partie');
			showAbandonDialog = false;
			if (onMatchComplete) {
				onMatchComplete();
			}
		} catch (_err) {
			toaster.error("Erreur lors de l'abandon de la partie");
		}
	}

	function openAbandonDialog() {
		showAbandonDialog = true;
	}

	function closeAbandonDialog() {
		showAbandonDialog = false;
	}
</script>

{#if match}
	<div class="space-y-4 p-4">
		<!-- Status Header -->
		<Card class="p-4">
			<div class="mb-3 text-center">
				<div class="mb-2 text-4xl">{statusEmoji}</div>
				<h2 class="text-xl font-bold text-foreground">{statusMessage}</h2>
			</div>

			<Separator class="my-3" />

			<!-- Match Info -->
			<div class="text-center text-sm text-muted-foreground">
				<p class="flex flex-wrap items-center justify-center gap-2">
					<span class="font-semibold text-foreground">{difficultyLabel}</span>
					<span>•</span>
					<span class="font-semibold text-foreground">{matchTypeLabel}</span>
					<span>•</span>
					<span class="font-semibold text-foreground">vs. {match.opponentName}</span>
				</p>
			</div>
		</Card>

		<!-- Progress Section (only show during game) -->
		{#if isInProgress || isCompleted}
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Your Progress -->
				<Card class="p-4">
					<h3 class="mb-3 flex items-center gap-2 font-semibold text-foreground">
						<span>📊</span>
						<span>Vous</span>
					</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Cellules révélées:</span>
							<span class="font-medium text-foreground">{playerProgress.cellsRevealed}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Drapeaux utilisés:</span>
							<span class="font-medium text-foreground">{playerProgress.flagsUsed}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Temps:</span>
							<span class="font-medium text-foreground">{playerFormattedTime}</span>
						</div>
					</div>
				</Card>

				<!-- Opponent Progress -->
				<div>
					<OpponentProgressIndicator {opponentProgress} />
				</div>
			</div>
		{/if}

		<!-- Countdown Display (large) -->
		{#if isCountdown && countdown > 0}
			<Card class="bg-primary/5 p-8">
				<div class="text-center">
					<div class="mb-4 animate-pulse text-7xl font-bold text-primary">{countdown}</div>
					<p class="text-lg text-muted-foreground">Préparez-vous...</p>
				</div>
			</Card>
		{/if}

		<!-- Action Buttons -->
		{#if isInProgress}
			<div class="flex justify-center">
				<Button onclick={openAbandonDialog} variant="destructive" size="sm">
					<span class="mr-2">❌</span>
					Abandonner la partie
				</Button>
			</div>
		{/if}

		<!-- Game Instructions (countdown only) -->
		{#if isCountdown}
			<Card class="bg-muted/30 p-4">
				<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
					<span>💡</span>
					<span>Objectif</span>
				</h3>
				<ul class="space-y-1 text-xs text-muted-foreground">
					<li>• Terminez la grille avant votre adversaire</li>
					<li>• Utilisez les drapeaux pour marquer les mines</li>
					<li>• Votre progression est visible en temps réel</li>
					<li>• Bonus de vitesse si vous gagnez rapidement!</li>
				</ul>
			</Card>
		{/if}
	</div>

	<!-- Abandon Confirmation Dialog -->
	<Dialog.Root bind:open={showAbandonDialog}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Abandonner la partie?</Dialog.Title>
				<Dialog.Description>
					Si vous abandonnez, vous perdrez automatiquement cette partie. Cette action ne peut pas
					être annulée.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button onclick={closeAbandonDialog} variant="outline">Annuler</Button>
				<Button onclick={handleAbandonMatch} variant="destructive">Abandonner</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<div class="flex min-h-[400px] items-center justify-center p-4">
		<Card class="w-full max-w-md p-6 text-center">
			<div class="mb-4 text-5xl">⏳</div>
			<h2 class="mb-2 text-xl font-semibold text-foreground">Chargement de la partie...</h2>
			<p class="text-sm text-muted-foreground">Veuillez patienter</p>
		</Card>
	</div>
{/if}
