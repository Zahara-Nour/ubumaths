<script lang="ts">
	import { cn } from '$lib/utils';

	// Types
	type OpponentProgress = {
		playerId: string;
		playerName: string;
		cellsRevealed: number;
		flagsUsed: number;
		timeElapsed: number;
		lastAction: {
			type: 'reveal' | 'flag' | 'unflag';
			row: number;
			col: number;
			timestamp: number;
		} | null;
	} | null;

	// Props
	let { opponentProgress }: { opponentProgress: OpponentProgress } = $props();

	// State
	let showActionAnimation = $state(false);
	let lastActionTimestamp = $state<number>(0);

	// Derived
	let formattedTime = $derived.by(() => {
		if (!opponentProgress) return '0:00';
		const minutes = Math.floor(opponentProgress.timeElapsed / 60);
		const seconds = opponentProgress.timeElapsed % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	let actionText = $derived.by(() => {
		if (!opponentProgress?.lastAction) return '';
		const { type, row, col } = opponentProgress.lastAction;
		const action = type === 'reveal' ? 'Révélé' : type === 'flag' ? 'Marqué' : 'Démarqué';
		return `${action} (${row},${col})`;
	});

	let actionIcon = $derived.by(() => {
		if (!opponentProgress?.lastAction) return '';
		const { type } = opponentProgress.lastAction;
		return type === 'reveal' ? '🔴' : type === 'flag' ? '🚩' : '⚪';
	});

	// Effects
	$effect(() => {
		if (opponentProgress?.lastAction && opponentProgress.lastAction.timestamp !== lastActionTimestamp) {
			lastActionTimestamp = opponentProgress.lastAction.timestamp;
			showActionAnimation = true;
			setTimeout(() => {
				showActionAnimation = false;
			}, 1000);
		}
	});
</script>

{#if opponentProgress}
	<div
		class={cn(
			'rounded-lg border border-border bg-card p-3 shadow-sm transition-all',
			'dark:bg-card dark:border-border'
		)}
	>
		<!-- Opponent name -->
		<div class="mb-2 flex items-center gap-2">
			<span class="text-lg">👤</span>
			<span class="font-semibold text-foreground">Adversaire: {opponentProgress.playerName}</span>
		</div>

		<!-- Stats -->
		<div class="mb-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
			<div class="flex items-center gap-1">
				<span>📊</span>
				<span>Cellules: <strong class="text-foreground">{opponentProgress.cellsRevealed}</strong></span>
			</div>
			<div class="flex items-center gap-1">
				<span>🚩</span>
				<span>Drapeaux: <strong class="text-foreground">{opponentProgress.flagsUsed}</strong></span>
			</div>
			<div class="flex items-center gap-1">
				<span>⏱️</span>
				<span><strong class="text-foreground">{formattedTime}</strong></span>
			</div>
		</div>

		<!-- Last action -->
		{#if opponentProgress.lastAction}
			<div
				class={cn(
					'flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm transition-all',
					showActionAnimation && 'animate-pulse bg-primary/10'
				)}
			>
				<span class={cn('transition-transform', showActionAnimation && 'scale-125')}
					>{actionIcon}</span
				>
				<span class="text-muted-foreground"
					>Dernière action: <strong class="text-foreground">{actionText}</strong></span
				>
			</div>
		{/if}
	</div>
{:else}
	<div
		class="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground"
	>
		En attente de l'adversaire...
	</div>
{/if}
