<script lang="ts">
	/**
	 * VIP Card power bar for the 2048 game.
	 * Displays all power buttons in 2 rows.
	 * Row 1: Undo, Bomb, Freeze Spawn
	 * Row 2: Fusion, Joker, Vision, Multiplier
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
		// Fusion
		fusionCardsAvailable: number;
		fusionUsedThisGame: number;
		maxFusionPerGame: number;
		fusionMode: boolean;
		hasFusionTargets: boolean;
		onUseFusion: () => void;
		onCancelFusion: () => void;
		// Joker
		jokerCardsAvailable: number;
		jokerUsedThisGame: number;
		maxJokerPerGame: number;
		jokerMode: boolean;
		hasJokerTargets: boolean;
		onUseJoker: () => void;
		onCancelJoker: () => void;
		// Vision
		visionCardsAvailable: number;
		visionUsedThisGame: number;
		maxVisionPerGame: number;
		visionActive: boolean;
		onUseVision: () => void;
		// Multiplier
		multiplierCardsAvailable: number;
		multiplierUsedThisGame: number;
		maxMultiplierPerGame: number;
		scoreMultiplier: number;
		onUseMultiplier: () => void;
		// Gidouilles
		gidouilles: number;
		undoCostGidouilles: number;
		bombCostGidouilles: number;
		freezeCostGidouilles: number;
		fusionCostGidouilles: number;
		jokerCostGidouilles: number;
		visionCostGidouilles: number;
		multiplierCostGidouilles: number;
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
		fusionCardsAvailable,
		fusionUsedThisGame,
		maxFusionPerGame,
		fusionMode,
		hasFusionTargets,
		onUseFusion,
		onCancelFusion,
		jokerCardsAvailable,
		jokerUsedThisGame,
		maxJokerPerGame,
		jokerMode,
		hasJokerTargets,
		onUseJoker,
		onCancelJoker,
		visionCardsAvailable,
		visionUsedThisGame,
		maxVisionPerGame,
		visionActive,
		onUseVision,
		multiplierCardsAvailable,
		multiplierUsedThisGame,
		maxMultiplierPerGame,
		scoreMultiplier,
		onUseMultiplier,
		gidouilles,
		undoCostGidouilles,
		bombCostGidouilles,
		freezeCostGidouilles,
		fusionCostGidouilles,
		jokerCostGidouilles,
		visionCostGidouilles,
		multiplierCostGidouilles
	}: Props = $props();

	// ================================================================
	// Row 1: Undo, Bomb, Freeze
	// ================================================================
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

	// ================================================================
	// Row 2: Fusion, Joker, Vision, Multiplier
	// ================================================================
	const fusionMaxed = $derived(fusionUsedThisGame >= maxFusionPerGame);
	const hasFusionCards = $derived(fusionCardsAvailable > 0);
	const canAffordFusion = $derived(gidouilles >= fusionCostGidouilles);
	const fusionDisabled = $derived(
		gameOver ||
			fusionMaxed ||
			isLoading ||
			(!hasFusionCards && !canAffordFusion) ||
			!hasFusionTargets
	);

	const jokerMaxed = $derived(jokerUsedThisGame >= maxJokerPerGame);
	const hasJokerCards = $derived(jokerCardsAvailable > 0);
	const canAffordJoker = $derived(gidouilles >= jokerCostGidouilles);
	const jokerDisabled = $derived(
		gameOver || jokerMaxed || isLoading || (!hasJokerCards && !canAffordJoker) || !hasJokerTargets
	);

	const visionMaxed = $derived(visionUsedThisGame >= maxVisionPerGame);
	const hasVisionCards = $derived(visionCardsAvailable > 0);
	const canAffordVision = $derived(gidouilles >= visionCostGidouilles);
	const visionDisabled = $derived(
		gameOver || visionMaxed || isLoading || visionActive || (!hasVisionCards && !canAffordVision)
	);

	const multiplierMaxed = $derived(multiplierUsedThisGame >= maxMultiplierPerGame);
	const hasMultiplierCards = $derived(multiplierCardsAvailable > 0);
	const canAffordMultiplier = $derived(gidouilles >= multiplierCostGidouilles);
	const multiplierDisabled = $derived(
		gameOver ||
			multiplierMaxed ||
			isLoading ||
			scoreMultiplier > 1 ||
			(!hasMultiplierCards && !canAffordMultiplier)
	);

	// ================================================================
	// Tooltips
	// ================================================================
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

	const fusionTooltip = $derived.by(() => {
		if (fusionMaxed) return `Maximum atteint (${maxFusionPerGame} par partie)`;
		if (!hasFusionTargets) return 'Aucune paire adjacente identique';
		if (hasFusionCards) return 'Fusionner 2 tuiles adjacentes (carte VIP)';
		return `Fusionner 2 tuiles adjacentes (${fusionCostGidouilles}g)`;
	});

	const jokerTooltip = $derived.by(() => {
		if (jokerMaxed) return `Maximum atteint (${maxJokerPerGame} par partie)`;
		if (!hasJokerTargets) return 'Aucune tuile eligible';
		if (hasJokerCards) return 'Tuile prend la valeur du plus grand voisin (carte VIP)';
		return `Tuile prend la valeur du plus grand voisin (${jokerCostGidouilles}g)`;
	});

	const visionTooltip = $derived.by(() => {
		if (visionMaxed) return `Maximum atteint (${maxVisionPerGame} par partie)`;
		if (visionActive) return 'Vision deja active';
		if (hasVisionCards) return 'Voir le prochain spawn pendant 3 coups (carte VIP)';
		return `Voir le prochain spawn pendant 3 coups (${visionCostGidouilles}g)`;
	});

	const multiplierTooltip = $derived.by(() => {
		if (scoreMultiplier > 1) return `Multiplicateur x${scoreMultiplier} actif`;
		if (multiplierMaxed) return `Maximum atteint (${maxMultiplierPerGame} par partie)`;
		if (hasMultiplierCards) return 'Score multiplie pour la partie (carte VIP)';
		return `Score multiplie pour la partie (${multiplierCostGidouilles}g)`;
	});
</script>

{#snippet powerBadge(count: number, color: string)}
	<span
		class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-{color}-600 text-[10px] font-bold text-white shadow"
	>
		{count}
	</span>
{/snippet}

{#snippet gidouilleBadge()}
	<span
		class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow"
	>
		<img src={gidouilleImg} alt="Gidouilles" class="h-4 w-4" />
	</span>
{/snippet}

{#if isAuthenticated}
	<Tooltip.Provider>
		<div class="mb-4 rounded-lg border border-border bg-card/50 px-3 py-2">
			<!-- Row 1: Undo, Bomb, Freeze -->
			<div class="flex items-center justify-center gap-2">
				<!-- Undo -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseUndo}
								disabled={undoDisabled}
								class={cn(
									'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-all',
									undoDisabled
										? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
										: hasUndoCards
											? 'border-green-500 bg-green-50 hover:border-green-400 dark:bg-green-950/20'
											: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
								)}
								aria-label="Annuler le dernier coup"
							>
								↩️
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content><p class="max-w-48 text-sm">{undoTooltip}</p></Tooltip.Content>
					</Tooltip.Root>
					{#if !undoMaxed}
						{#if hasUndoCards}
							{@render powerBadge(undoCardsAvailable, 'green')}
						{:else if canAffordUndo}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>

				<!-- Bomb -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#if bombMode}
								<button
									onclick={onCancelBomb}
									class="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl border-2 border-red-500 bg-red-50 text-lg dark:bg-red-950/20"
									aria-label="Annuler bombe">❌</button
								>
							{:else}
								<button
									onclick={onUseBomb}
									disabled={bombDisabled}
									class={cn(
										'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-all',
										bombDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasBombCards
												? 'border-orange-500 bg-orange-50 hover:border-orange-400 dark:bg-orange-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
									)}
									aria-label="Utiliser bombe">💣</button
								>
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
							{@render powerBadge(bombCardsAvailable, 'orange')}
						{:else if canAffordBomb}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>

				<!-- Freeze -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseFreezeSpawn}
								disabled={freezeDisabled}
								class={cn(
									'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-all',
									freezeActive
										? 'border-cyan-500 bg-cyan-100 dark:bg-cyan-950/30'
										: freezeDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasFreezeCards
												? 'border-cyan-500 bg-cyan-50 hover:border-cyan-400 dark:bg-cyan-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
								)}
								aria-label="Gel de Spawn">❄️</button
							>
						</Tooltip.Trigger>
						<Tooltip.Content><p class="max-w-48 text-sm">{freezeTooltip}</p></Tooltip.Content>
					</Tooltip.Root>
					{#if freezeActive}
						{@render powerBadge(0, 'cyan')}
					{:else if !freezeMaxed}
						{#if hasFreezeCards}
							{@render powerBadge(freezeCardsAvailable, 'cyan')}
						{:else if canAffordFreeze}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>
			</div>

			<!-- Row 1 labels -->
			<div class="mt-0.5 flex items-center justify-center gap-2 text-[9px] text-muted-foreground">
				<span class="w-11 text-center">Retour</span>
				<span class="w-11 text-center">{bombMode ? 'Annuler' : 'Bombe'}</span>
				<span class="w-11 text-center">Gel</span>
			</div>

			<!-- Separator -->
			<div class="my-1.5 border-t border-border/50"></div>

			<!-- Row 2: Fusion, Joker, Vision, Multiplier -->
			<div class="flex items-center justify-center gap-2">
				<!-- Fusion -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#if fusionMode}
								<button
									onclick={onCancelFusion}
									class="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl border-2 border-purple-500 bg-purple-50 text-lg dark:bg-purple-950/20"
									aria-label="Annuler fusion">❌</button
								>
							{:else}
								<button
									onclick={onUseFusion}
									disabled={fusionDisabled}
									class={cn(
										'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-all',
										fusionDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasFusionCards
												? 'border-purple-500 bg-purple-50 hover:border-purple-400 dark:bg-purple-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
									)}
									aria-label="Fusion Forcee">🔀</button
								>
							{/if}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p class="max-w-48 text-sm">
								{fusionMode ? 'Selectionnez 2 tuiles identiques' : fusionTooltip}
							</p>
						</Tooltip.Content>
					</Tooltip.Root>
					{#if !fusionMaxed && !fusionMode}
						{#if hasFusionCards}
							{@render powerBadge(fusionCardsAvailable, 'purple')}
						{:else if canAffordFusion}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>

				<!-- Joker -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#if jokerMode}
								<button
									onclick={onCancelJoker}
									class="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl border-2 border-pink-500 bg-pink-50 text-lg dark:bg-pink-950/20"
									aria-label="Annuler joker">❌</button
								>
							{:else}
								<button
									onclick={onUseJoker}
									disabled={jokerDisabled}
									class={cn(
										'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-all',
										jokerDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasJokerCards
												? 'border-pink-500 bg-pink-50 hover:border-pink-400 dark:bg-pink-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
									)}
									aria-label="Joker">🃏</button
								>
							{/if}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p class="max-w-48 text-sm">
								{jokerMode ? 'Cliquez une tuile a transformer' : jokerTooltip}
							</p>
						</Tooltip.Content>
					</Tooltip.Root>
					{#if !jokerMaxed && !jokerMode}
						{#if hasJokerCards}
							{@render powerBadge(jokerCardsAvailable, 'pink')}
						{:else if canAffordJoker}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>

				<!-- Vision -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseVision}
								disabled={visionDisabled}
								class={cn(
									'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-all',
									visionActive
										? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-950/30'
										: visionDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasVisionCards
												? 'border-indigo-500 bg-indigo-50 hover:border-indigo-400 dark:bg-indigo-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
								)}
								aria-label="Vision">👁</button
							>
						</Tooltip.Trigger>
						<Tooltip.Content><p class="max-w-48 text-sm">{visionTooltip}</p></Tooltip.Content>
					</Tooltip.Root>
					{#if visionActive}
						{@render powerBadge(0, 'indigo')}
					{:else if !visionMaxed}
						{#if hasVisionCards}
							{@render powerBadge(visionCardsAvailable, 'indigo')}
						{:else if canAffordVision}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>

				<!-- Multiplier -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseMultiplier}
								disabled={multiplierDisabled}
								class={cn(
									'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-all',
									scoreMultiplier > 1
										? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-950/30'
										: multiplierDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasMultiplierCards
												? 'border-yellow-500 bg-yellow-50 hover:border-yellow-400 dark:bg-yellow-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
								)}
								aria-label="Multiplicateur de score">✖️</button
							>
						</Tooltip.Trigger>
						<Tooltip.Content><p class="max-w-48 text-sm">{multiplierTooltip}</p></Tooltip.Content>
					</Tooltip.Root>
					{#if scoreMultiplier > 1}
						<span
							class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-600 text-[9px] font-bold text-white shadow"
						>
							x{scoreMultiplier}
						</span>
					{:else if !multiplierMaxed}
						{#if hasMultiplierCards}
							{@render powerBadge(multiplierCardsAvailable, 'yellow')}
						{:else if canAffordMultiplier}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>
			</div>

			<!-- Row 2 labels -->
			<div class="mt-0.5 flex items-center justify-center gap-2 text-[9px] text-muted-foreground">
				<span class="w-11 text-center">{fusionMode ? 'Annuler' : 'Fusion'}</span>
				<span class="w-11 text-center">{jokerMode ? 'Annuler' : 'Joker'}</span>
				<span class="w-11 text-center">Vision</span>
				<span class="w-11 text-center">{scoreMultiplier > 1 ? `x${scoreMultiplier}` : 'Multi'}</span
				>
			</div>
		</div>
	</Tooltip.Provider>
{/if}
