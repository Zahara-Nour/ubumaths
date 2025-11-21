<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { multiplayerStore } from '$lib/stores/multiplayer.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { cn } from '$lib/utils';
	import { Loader2 } from 'lucide-svelte';

	// Types
	type Difficulty = 'beginner' | 'intermediate' | 'expert';
	type MatchType = 'quick' | 'ranked';

	// State
	let selectedDifficulty = $state<Difficulty>('beginner');
	let selectedMatchType = $state<MatchType>('quick');

	// Items for selects
	const difficultyItems = [
		{ value: 'beginner', label: 'Débutant' },
		{ value: 'intermediate', label: 'Intermédiaire' },
		{ value: 'expert', label: 'Expert' }
	];

	const matchTypeItems = [
		{ value: 'quick', label: 'Rapide' },
		{ value: 'ranked', label: 'Classé' }
	];

	// Derived state from multiplayerStore
	let inQueue = $derived(multiplayerStore.inQueue);
	let queueStatus = $derived(multiplayerStore.queueStatus);
	let error = $derived(multiplayerStore.error);
	let rank = $derived(multiplayerStore.rank);

	let isSearching = $derived(queueStatus === 'searching');
	let hasError = $derived(queueStatus === 'error');

	let statusText = $derived.by(() => {
		switch (queueStatus) {
			case 'searching':
				return "En attente d'un adversaire...";
			case 'found':
				return 'Adversaire trouvé!';
			case 'error':
				return error || 'Erreur de connexion';
			default:
				return '';
		}
	});

	// Functions
	async function handleJoinQueue() {
		try {
			await multiplayerStore.joinQueue(selectedDifficulty, selectedMatchType);
		} catch (_err) {
			toaster.error("Impossible de rejoindre la file d'attente");
		}
	}

	async function handleLeaveQueue() {
		try {
			await multiplayerStore.leaveQueue();
			toaster.info("Vous avez quitté la file d'attente");
		} catch (_err) {
			toaster.error('Erreur lors de la sortie de la file');
		}
	}
</script>

<div class="flex min-h-[500px] items-center justify-center p-4">
	<Card className="w-full max-w-md p-6">
		<!-- Header -->
		<div class="mb-6 text-center">
			<h2 class="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
				<span>🎮</span>
				<span>Mode Multijoueur</span>
			</h2>
		</div>

		<Separator className="my-4" />

		<!-- Configuration -->
		<div class="mb-6 space-y-4">
			<!-- Difficulty Select -->
			<div>
				<label for="difficulty" class="mb-2 block text-sm font-medium text-foreground">
					Difficulté
				</label>
				<MySelect
					type="single"
					bind:value={selectedDifficulty}
					items={difficultyItems}
					placeholder="Sélectionnez une difficulté"
					disabled={inQueue}
				/>
			</div>

			<!-- Match Type Select -->
			<div>
				<label for="matchType" class="mb-2 block text-sm font-medium text-foreground">
					Type de match
				</label>
				<MySelect
					type="single"
					bind:value={selectedMatchType}
					items={matchTypeItems}
					placeholder="Sélectionnez un type"
					disabled={inQueue}
				/>
			</div>

			<!-- ELO Display (ranked only) -->
			{#if selectedMatchType === 'ranked' && rank !== null}
				<div class="rounded-lg bg-muted/50 p-3 text-center">
					<p class="text-sm text-muted-foreground">Votre classement</p>
					<p class="text-2xl font-bold text-primary">{rank} ELO</p>
				</div>
			{/if}
		</div>

		<!-- Queue Action Button -->
		<div class="mb-4">
			{#if !inQueue}
				<Button onclick={handleJoinQueue} className="w-full" size="lg">
					<span class="mr-2">🚀</span>
					Rejoindre la file d'attente
				</Button>
			{:else}
				<Button onclick={handleLeaveQueue} variant="destructive" className="w-full" size="lg">
					<span class="mr-2">❌</span>
					Quitter la file d'attente
				</Button>
			{/if}
		</div>

		<!-- Queue Status -->
		{#if inQueue}
			<div
				class={cn('rounded-lg p-4 text-center', hasError ? 'bg-destructive/10' : 'bg-primary/10')}
			>
				<!-- Status Icon & Text -->
				<div class="mb-2 flex items-center justify-center gap-2">
					{#if isSearching}
						<Loader2 className="h-5 w-5 animate-spin text-primary" />
					{:else if hasError}
						<span class="text-xl">⚠️</span>
					{:else if queueStatus === 'found'}
						<span class="text-xl">✅</span>
					{/if}
					<p class={cn('font-semibold', hasError ? 'text-destructive' : 'text-foreground')}>
						{statusText}
					</p>
				</div>

				<!-- Error Details -->
				{#if hasError && error}
					<p class="text-sm text-muted-foreground">{error}</p>
				{/if}

				<!-- Estimated Wait Time (searching only) -->
				{#if isSearching}
					<p class="mt-2 text-xs text-muted-foreground">Temps d'attente estimé: ~30 secondes</p>
				{/if}
			</div>
		{/if}

		<!-- Info Box -->
		{#if !inQueue}
			<div class="mt-4 rounded-lg bg-muted/30 p-4">
				<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
					<span>ℹ️</span>
					<span>Comment ça marche?</span>
				</h3>
				<ul class="space-y-1 text-xs text-muted-foreground">
					<li>• <strong>Rapide:</strong> Match sans classement, récompenses standards</li>
					<li>• <strong>Classé:</strong> Match avec ELO, récompenses augmentées</li>
					<li>• Premier à terminer la grille gagne</li>
					<li>• Suivez la progression de votre adversaire en temps réel</li>
				</ul>
			</div>
		{/if}
	</Card>
</div>
