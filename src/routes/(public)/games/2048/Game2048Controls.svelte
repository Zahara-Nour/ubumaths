<script lang="ts">
	/**
	 * VIP Card power bar for the 2048 game.
	 * Displays Undo, Bomb, and Freeze Spawn power buttons.
	 * Pattern: follows GameControls.svelte from Minesweeper.
	 */
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import gidouilleImg from '$lib/assets/images/gidouille.png';

	interface Props {
		gameOver: boolean;
		isAuthenticated: boolean;
		isLoading: boolean;
		// Undo
		undoCardsAvailable: number;
		canUndo: boolean;
		undoUsedThisGame: number;
		maxUndoPerGame: number;
		onUseUndo: () => void;
		// Bomb
		bombCardsAvailable: number;
		bombUsedThisGame: number;
		maxBombPerGame: number;
		bombMode: boolean;
		hasBombTargets: boolean;
		onUseBomb: () => void;
		onCancelBomb: () => void;
		// Freeze Spawn
		freezeCardsAvailable: number;
		freezeUsedThisGame: number;
		maxFreezePerGame: number;
		freezeActive: boolean;
		onUseFreezeSpawn: () => void;
		// Gidouilles
		gidouilles: number;
		undoCostGidouilles: number;
		bombCostGidouilles: number;
		freezeCostGidouilles: number;
	}

	let {
		gameOver,
		isAuthenticated,
		isLoading,
		undoCardsAvailable,
		canUndo,
		undoUsedThisGame,
		maxUndoPerGame,
		onUseUndo,
		bombCardsAvailable,
		bombUsedThisGame,
		maxBombPerGame,
		bombMode,
		hasBombTargets,
		onUseBomb,
		onCancelBomb,
		freezeCardsAvailable,
		freezeUsedThisGame,
		maxFreezePerGame,
		freezeActive,
		onUseFreezeSpawn,
		gidouilles,
		undoCostGidouilles,
		bombCostGidouilles,
		freezeCostGidouilles
	}: Props = $props();

	// Derived states
	const undoMaxed = $derived(undoUsedThisGame >= maxUndoPerGame);
	const hasUndoCards = $derived(undoCardsAvailable > 0);
	const canAffordUndo = $derived(gidouilles >= undoCostGidouilles);
	const undoDisabled = $derived(
		gameOver || !canUndo || undoMaxed || isLoading || (!hasUndoCards && !canAffordUndo)
	);

	const bombMaxed = $derived(bombUsedThisGame >= maxBombPerGame);
	const hasBombCards = $derived(bombCardsAvailable > 0);
	const canAffordBomb = $derived(gidouilles >= bombCostGidouilles);
	const bombDisabled = $derived(
		gameOver || bombMaxed || isLoading || (!hasBombCards && !canAffordBomb) || !hasBombTargets
	);

	const freezeMaxed = $derived(freezeUsedThisGame >= maxFreezePerGame);
	const hasFreezeCards = $derived(freezeCardsAvailable > 0);
	const canAffordFreeze = $derived(gidouilles >= freezeCostGidouilles);
	const freezeDisabled = $derived(
		gameOver || freezeMaxed || isLoading || freezeActive || (!hasFreezeCards && !canAffordFreeze)
	);

	const undoTooltip = $derived.by(() => {
		if (undoMaxed) return `Maximum atteint (${maxUndoPerGame} par partie)`;
		if (!canUndo) return 'Aucun coup a annuler';
		if (hasUndoCards) return 'Annuler le dernier coup (carte VIP)';
		return `Annuler le dernier coup (${undoCostGidouilles}g)`;
	});

	const bombTooltip = $derived.by(() => {
		if (bombMaxed) return `Maximum atteint (${maxBombPerGame} par partie)`;
		if (!hasBombTargets) return 'Aucune tuile eligible';
		if (hasBombCards) return 'Supprimer une tuile (carte VIP)';
		return `Supprimer une tuile (${bombCostGidouilles}g)`;
	});

	const freezeTooltip = $derived.by(() => {
		if (freezeMaxed) return `Maximum atteint (${maxFreezePerGame} par partie)`;
		if (freezeActive) return 'Deja actif pour le prochain coup';
		if (hasFreezeCards) return 'Prochain coup sans nouvelle tuile (carte VIP)';
		return `Prochain coup sans nouvelle tuile (${freezeCostGidouilles}g)`;
	});
</script>

{#if isAuthenticated}
	<Tooltip.Provider>
		<div class="mb-4 rounded-lg border border-border bg-card/50 px-3 py-2">
			<div class="flex items-center justify-center gap-3">
				<!-- Undo power -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseUndo}
								disabled={undoDisabled}
								class={cn(
									'flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl transition-all',
									undoDisabled
										? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
										: hasUndoCards
											? 'border-green-500 bg-green-50 hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 dark:bg-green-950/20'
											: 'border-amber-500 bg-amber-50 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/20 dark:bg-amber-950/20'
								)}
								aria-label="Annuler le dernier coup"
							>
								↩️
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p class="max-w-48 text-sm">{undoTooltip}</p>
						</Tooltip.Content>
					</Tooltip.Root>
					{#if !undoMaxed}
						{#if hasUndoCards}
							<span
								class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white shadow"
							>
								{undoCardsAvailable}
							</span>
						{:else if canAffordUndo}
							<span
								class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow"
							>
								<img src={gidouilleImg} alt="Gidouilles" class="h-4 w-4" />
							</span>
						{/if}
					{/if}
				</div>

				<!-- Bomb power -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#if bombMode}
								<button
									onclick={onCancelBomb}
									class="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl border-2 border-red-500 bg-red-50 text-xl transition-all hover:border-red-400 dark:bg-red-950/20"
									aria-label="Annuler le mode bombe"
								>
									❌
								</button>
							{:else}
								<button
									onclick={onUseBomb}
									disabled={bombDisabled}
									class={cn(
										'flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl transition-all',
										bombDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasBombCards
												? 'border-orange-500 bg-orange-50 hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 dark:bg-orange-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/20 dark:bg-amber-950/20'
									)}
									aria-label="Utiliser une bombe"
								>
									💣
								</button>
							{/if}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p class="max-w-48 text-sm">
								{bombMode ? 'Cliquez une tuile ou annulez' : bombTooltip}
							</p>
						</Tooltip.Content>
					</Tooltip.Root>
					{#if !bombMaxed && !bombMode}
						{#if hasBombCards}
							<span
								class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow"
							>
								{bombCardsAvailable}
							</span>
						{:else if canAffordBomb}
							<span
								class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow"
							>
								<img src={gidouilleImg} alt="Gidouilles" class="h-4 w-4" />
							</span>
						{/if}
					{/if}
				</div>

				<!-- Freeze Spawn power -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseFreezeSpawn}
								disabled={freezeDisabled}
								class={cn(
									'flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl transition-all',
									freezeActive
										? 'border-cyan-500 bg-cyan-100 dark:bg-cyan-950/30'
										: freezeDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasFreezeCards
												? 'border-cyan-500 bg-cyan-50 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/20 dark:bg-cyan-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/20 dark:bg-amber-950/20'
								)}
								aria-label="Gel de Spawn"
							>
								❄️
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p class="max-w-48 text-sm">{freezeTooltip}</p>
						</Tooltip.Content>
					</Tooltip.Root>
					{#if freezeActive}
						<span
							class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white shadow"
						>
							✓
						</span>
					{:else if !freezeMaxed}
						{#if hasFreezeCards}
							<span
								class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white shadow"
							>
								{freezeCardsAvailable}
							</span>
						{:else if canAffordFreeze}
							<span
								class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow"
							>
								<img src={gidouilleImg} alt="Gidouilles" class="h-4 w-4" />
							</span>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Labels -->
			<div class="mt-1 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
				<span class="w-12 text-center">Retour</span>
				<span class="w-12 text-center">{bombMode ? 'Annuler' : 'Bombe'}</span>
				<span class="w-12 text-center">Gel</span>
			</div>
		</div>
	</Tooltip.Provider>
{/if}
