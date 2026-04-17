<script lang="ts">
	/**
	 * VIP Card power bar for the 2048 game.
	 * Displays all power buttons in 2 rows.
	 * Row 1: Undo, Bomb(1), Bomb(2), Bomb(3), Freeze Spawn
	 * Row 2: Fusion, Joker, Vision, Multi x1.5, Multi x2
	 */
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import gidouilleImg from '$lib/assets/images/gidouille.png';

	const STORAGE_BASE =
		'https://aqtijumsgfufoztohdua.supabase.co/storage/v1/object/public/vip-card-images';
	const powerImg = (id: string) => `${STORAGE_BASE}/${id}@0.5x.webp`;

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
		// Bomb (per-tier)
		bomb1Cards: number;
		bomb2Cards: number;
		bombUsedThisGame: number;
		maxBombPerGame: number;
		bombMode: boolean;
		activeBombTier: number | null;
		hasBomb1Targets: boolean;
		hasBomb2Targets: boolean;
		onUseBomb: (tier: number) => void;
		onCancelBomb: () => void;
		bomb1Cost: number;
		bomb2Cost: number;
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
		// Multiplier (per-factor)
		multi15Cards: number;
		multi2Cards: number;
		multiplierUsedThisGame: number;
		maxMultiplierPerGame: number;
		scoreMultiplier: number;
		onUseMultiplier: (factor: number) => void;
		multi15Cost: number;
		multi2Cost: number;
		// Gidouilles
		gidouilles: number;
		undoCostGidouilles: number;
		freezeCostGidouilles: number;
		fusionCostGidouilles: number;
		jokerCostGidouilles: number;
		visionCostGidouilles: number;
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
		bomb1Cards,
		bomb2Cards,
		bombUsedThisGame,
		maxBombPerGame,
		bombMode,
		activeBombTier,
		hasBomb1Targets,
		hasBomb2Targets,
		onUseBomb,
		onCancelBomb,
		bomb1Cost,
		bomb2Cost,
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
		multi15Cards,
		multi2Cards,
		multiplierUsedThisGame,
		maxMultiplierPerGame,
		scoreMultiplier,
		onUseMultiplier,
		multi15Cost,
		multi2Cost,
		gidouilles,
		undoCostGidouilles,
		freezeCostGidouilles,
		fusionCostGidouilles,
		jokerCostGidouilles,
		visionCostGidouilles
	}: Props = $props();

	// ================================================================
	// Row 1: Undo, Bomb(1), Bomb(2), Bomb(3), Freeze
	// ================================================================
	const undoMaxed = $derived(undoUsedThisGame >= maxUndoPerGame);
	const hasUndoCards = $derived(undoCardsAvailable > 0);
	const canAffordUndo = $derived(gidouilles >= undoCostGidouilles);
	const undoDisabled = $derived(
		gameOver || !canUndo || undoMaxed || isLoading || (!hasUndoCards && !canAffordUndo)
	);

	const bombMaxed = $derived(bombUsedThisGame >= maxBombPerGame);

	// Per-tier bomb derived state
	const hasBomb1Cards = $derived(bomb1Cards > 0);
	const canAffordBomb1 = $derived(gidouilles >= bomb1Cost);
	const bomb1Disabled = $derived(
		gameOver ||
			bombMaxed ||
			isLoading ||
			(!hasBomb1Cards && !canAffordBomb1) ||
			!hasBomb1Targets ||
			(bombMode && activeBombTier !== 4)
	);

	const hasBomb2Cards = $derived(bomb2Cards > 0);
	const canAffordBomb2 = $derived(gidouilles >= bomb2Cost);
	const bomb2Disabled = $derived(
		gameOver ||
			bombMaxed ||
			isLoading ||
			(!hasBomb2Cards && !canAffordBomb2) ||
			!hasBomb2Targets ||
			(bombMode && activeBombTier !== 16)
	);

	const freezeMaxed = $derived(freezeUsedThisGame >= maxFreezePerGame);
	const hasFreezeCards = $derived(freezeCardsAvailable > 0);
	const canAffordFreeze = $derived(gidouilles >= freezeCostGidouilles);
	const freezeDisabled = $derived(
		gameOver || freezeMaxed || isLoading || freezeActive || (!hasFreezeCards && !canAffordFreeze)
	);

	// ================================================================
	// Row 2: Fusion, Joker, Vision, Multi x1.5, Multi x2
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

	// Per-factor multiplier derived state
	const hasMulti15Cards = $derived(multi15Cards > 0);
	const canAffordMulti15 = $derived(gidouilles >= multi15Cost);
	const multi15Disabled = $derived(
		gameOver ||
			multiplierMaxed ||
			isLoading ||
			scoreMultiplier > 1 ||
			(!hasMulti15Cards && !canAffordMulti15)
	);

	const hasMulti2Cards = $derived(multi2Cards > 0);
	const canAffordMulti2 = $derived(gidouilles >= multi2Cost);
	const multi2Disabled = $derived(
		gameOver ||
			multiplierMaxed ||
			isLoading ||
			scoreMultiplier > 1 ||
			(!hasMulti2Cards && !canAffordMulti2)
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

	function bombTooltipForTier(
		tier: number,
		maxed: boolean,
		hasTargets: boolean,
		hasCards: boolean,
		cost: number
	): string {
		if (maxed) return `Maximum atteint (${maxBombPerGame} par partie)`;
		if (!hasTargets) return `Aucune tuile \u2264 ${tier}`;
		if (hasCards) return `Supprimer une tuile \u2264 ${tier} (carte VIP)`;
		return `Supprimer une tuile \u2264 ${tier} (${cost}g)`;
	}

	const bomb1Tooltip = $derived(
		bombTooltipForTier(4, bombMaxed, hasBomb1Targets, hasBomb1Cards, bomb1Cost)
	);
	const bomb2Tooltip = $derived(
		bombTooltipForTier(16, bombMaxed, hasBomb2Targets, hasBomb2Cards, bomb2Cost)
	);
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

	function multiTooltipForFactor(
		factor: number,
		maxed: boolean,
		active: boolean,
		hasCards: boolean,
		cost: number
	): string {
		if (active) return `Multiplicateur x${scoreMultiplier} actif`;
		if (maxed) return `Maximum atteint (${maxMultiplierPerGame} par partie)`;
		if (hasCards) return `Score x${factor} pour la partie (carte VIP)`;
		return `Score x${factor} pour la partie (${cost}g)`;
	}

	const multi15Tooltip = $derived(
		multiTooltipForFactor(1.5, multiplierMaxed, scoreMultiplier > 1, hasMulti15Cards, multi15Cost)
	);
	const multi2Tooltip = $derived(
		multiTooltipForFactor(2, multiplierMaxed, scoreMultiplier > 1, hasMulti2Cards, multi2Cost)
	);
</script>

{#snippet powerBadge(count: number, bgClass: string)}
	<span
		class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow {bgClass}"
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

{#snippet bombButton(
	tier: number,
	cards: number,
	hasCards: boolean,
	canAfford: boolean,
	disabled: boolean,
	hasTargets: boolean,
	tooltip: string,
	cardId: string
)}
	{@const isActiveTier = bombMode && activeBombTier === tier}
	<div class="relative">
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#if isActiveTier}
					<button
						onclick={onCancelBomb}
						class="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/20"
						aria-label="Annuler bombe"
					>
						❌
					</button>
				{:else}
					<button
						onclick={() => onUseBomb(tier)}
						{disabled}
						class={cn(
							'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition-all',
							disabled
								? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
								: hasCards
									? 'border-orange-500 bg-orange-50 hover:border-orange-400 dark:bg-orange-950/20'
									: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
						)}
						aria-label="Bombe \u2264 {tier}"
					>
						<img
							src={powerImg(cardId)}
							alt="Bombe \u2264 {tier}"
							class="h-full w-full object-cover"
						/>
					</button>
				{/if}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p class="max-w-48 text-sm">
					{isActiveTier ? 'Cliquez une tuile ou annulez' : tooltip}
				</p>
			</Tooltip.Content>
		</Tooltip.Root>
		{#if !bombMaxed && !isActiveTier}
			{#if hasCards}
				{@render powerBadge(cards, 'bg-orange-600')}
			{:else if canAfford && hasTargets}
				{@render gidouilleBadge()}
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet multiplierButton(
	factor: number,
	cards: number,
	hasCards: boolean,
	canAfford: boolean,
	disabled: boolean,
	tooltip: string,
	cardId: string
)}
	<div class="relative">
		<Tooltip.Root>
			<Tooltip.Trigger>
				<button
					onclick={() => onUseMultiplier(factor)}
					{disabled}
					class={cn(
						'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition-all',
						scoreMultiplier > 1
							? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-950/30'
							: disabled
								? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
								: hasCards
									? 'border-yellow-500 bg-yellow-50 hover:border-yellow-400 dark:bg-yellow-950/20'
									: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
					)}
					aria-label="Multiplicateur x{factor}"
				>
					<img src={powerImg(cardId)} alt="Multi x{factor}" class="h-full w-full object-cover" />
				</button>
			</Tooltip.Trigger>
			<Tooltip.Content><p class="max-w-48 text-sm">{tooltip}</p></Tooltip.Content>
		</Tooltip.Root>
		{#if scoreMultiplier > 1}
			<span
				class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-600 text-[9px] font-bold text-white shadow"
			>
				x{scoreMultiplier}
			</span>
		{:else if !multiplierMaxed}
			{#if hasCards}
				{@render powerBadge(cards, 'bg-yellow-600')}
			{:else if canAfford}
				{@render gidouilleBadge()}
			{/if}
		{/if}
	</div>
{/snippet}

{#if isAuthenticated}
	<Tooltip.Provider>
		<div class="mb-4 rounded-lg border border-border bg-card/50 px-3 py-2">
			<!-- Row 1: Undo, Bomb(1), Bomb(2), Bomb(3), Freeze -->
			<div class="flex items-center justify-center gap-2">
				<!-- Undo -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseUndo}
								disabled={undoDisabled}
								class={cn(
									'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition-all',
									undoDisabled
										? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
										: hasUndoCards
											? 'border-green-500 bg-green-50 hover:border-green-400 dark:bg-green-950/20'
											: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
								)}
								aria-label="Annuler le dernier coup"
							>
								<img src={powerImg('2048-undo')} alt="Retour" class="h-full w-full object-cover" />
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content><p class="max-w-48 text-sm">{undoTooltip}</p></Tooltip.Content>
					</Tooltip.Root>
					{#if !undoMaxed}
						{#if hasUndoCards}
							{@render powerBadge(undoCardsAvailable, 'bg-green-600')}
						{:else if canAffordUndo}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>

				<!-- Bomb tier 1 (<=4) -->
				{@render bombButton(
					4,
					bomb1Cards,
					hasBomb1Cards,
					canAffordBomb1,
					bomb1Disabled,
					hasBomb1Targets,
					bomb1Tooltip,
					'2048-bomb'
				)}

				<!-- Bomb tier 2 (<=16) -->
				{@render bombButton(
					16,
					bomb2Cards,
					hasBomb2Cards,
					canAffordBomb2,
					bomb2Disabled,
					hasBomb2Targets,
					bomb2Tooltip,
					'2048-bomb-2'
				)}

				<!-- Freeze -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								onclick={onUseFreezeSpawn}
								disabled={freezeDisabled}
								class={cn(
									'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition-all',
									freezeActive
										? 'border-cyan-500 bg-cyan-100 dark:bg-cyan-950/30'
										: freezeDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasFreezeCards
												? 'border-cyan-500 bg-cyan-50 hover:border-cyan-400 dark:bg-cyan-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
								)}
								aria-label="Gel de Spawn"
							>
								<img
									src={powerImg('2048-freeze-spawn')}
									alt="Gel"
									class="h-full w-full object-cover"
								/>
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content><p class="max-w-48 text-sm">{freezeTooltip}</p></Tooltip.Content>
					</Tooltip.Root>
					{#if freezeActive}
						{@render powerBadge(0, 'bg-cyan-600')}
					{:else if !freezeMaxed}
						{#if hasFreezeCards}
							{@render powerBadge(freezeCardsAvailable, 'bg-cyan-600')}
						{:else if canAffordFreeze}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>
			</div>

			<!-- Row 1 labels -->
			<div class="mt-0.5 flex items-center justify-center gap-2 text-[9px] text-muted-foreground">
				<span class="w-11 text-center">Retour</span>
				<span class="w-11 text-center"
					>{bombMode && activeBombTier === 4 ? 'Annuler' : 'B.(\u22644)'}</span
				>
				<span class="w-11 text-center"
					>{bombMode && activeBombTier === 16 ? 'Annuler' : 'B.(\u226416)'}</span
				>
				<span class="w-11 text-center">Gel</span>
			</div>

			<!-- Separator -->
			<div class="my-1.5 border-t border-border/50"></div>

			<!-- Row 2: Fusion, Joker, Vision, Multi x1.5, Multi x2 -->
			<div class="flex items-center justify-center gap-2">
				<!-- Fusion -->
				<div class="relative">
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#if fusionMode}
								<button
									onclick={onCancelFusion}
									class="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/20"
									aria-label="Annuler fusion"
								>
									❌
								</button>
							{:else}
								<button
									onclick={onUseFusion}
									disabled={fusionDisabled}
									class={cn(
										'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition-all',
										fusionDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasFusionCards
												? 'border-purple-500 bg-purple-50 hover:border-purple-400 dark:bg-purple-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
									)}
									aria-label="Fusion Forcee"
								>
									<img
										src={powerImg('2048-merge')}
										alt="Fusion"
										class="h-full w-full object-cover"
									/>
								</button>
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
							{@render powerBadge(fusionCardsAvailable, 'bg-purple-600')}
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
									class="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl border-2 border-pink-500 bg-pink-50 dark:bg-pink-950/20"
									aria-label="Annuler joker"
								>
									❌
								</button>
							{:else}
								<button
									onclick={onUseJoker}
									disabled={jokerDisabled}
									class={cn(
										'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition-all',
										jokerDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasJokerCards
												? 'border-pink-500 bg-pink-50 hover:border-pink-400 dark:bg-pink-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
									)}
									aria-label="Joker"
								>
									<img
										src={powerImg('2048-joker')}
										alt="Joker"
										class="h-full w-full object-cover"
									/>
								</button>
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
							{@render powerBadge(jokerCardsAvailable, 'bg-pink-600')}
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
									'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 transition-all',
									visionActive
										? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-950/30'
										: visionDisabled
											? 'cursor-not-allowed border-muted bg-muted/30 opacity-50 grayscale'
											: hasVisionCards
												? 'border-indigo-500 bg-indigo-50 hover:border-indigo-400 dark:bg-indigo-950/20'
												: 'border-amber-500 bg-amber-50 hover:border-amber-400 dark:bg-amber-950/20'
								)}
								aria-label="Vision"
							>
								<img
									src={powerImg('2048-vision')}
									alt="Vision"
									class="h-full w-full object-cover"
								/>
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content><p class="max-w-48 text-sm">{visionTooltip}</p></Tooltip.Content>
					</Tooltip.Root>
					{#if visionActive}
						{@render powerBadge(0, 'bg-indigo-600')}
					{:else if !visionMaxed}
						{#if hasVisionCards}
							{@render powerBadge(visionCardsAvailable, 'bg-indigo-600')}
						{:else if canAffordVision}
							{@render gidouilleBadge()}
						{/if}
					{/if}
				</div>

				<!-- Multiplier x1.5 -->
				{@render multiplierButton(
					1.5,
					multi15Cards,
					hasMulti15Cards,
					canAffordMulti15,
					multi15Disabled,
					multi15Tooltip,
					'2048-multiplier'
				)}

				<!-- Multiplier x2 -->
				{@render multiplierButton(
					2,
					multi2Cards,
					hasMulti2Cards,
					canAffordMulti2,
					multi2Disabled,
					multi2Tooltip,
					'2048-multiplier-2'
				)}
			</div>

			<!-- Row 2 labels -->
			<div class="mt-0.5 flex items-center justify-center gap-2 text-[9px] text-muted-foreground">
				<span class="w-11 text-center">{fusionMode ? 'Annuler' : 'Fusion'}</span>
				<span class="w-11 text-center">{jokerMode ? 'Annuler' : 'Joker'}</span>
				<span class="w-11 text-center">Vision</span>
				<span class="w-11 text-center">{scoreMultiplier > 1 ? `x${scoreMultiplier}` : 'x1.5'}</span>
				<span class="w-11 text-center">{scoreMultiplier > 1 ? `x${scoreMultiplier}` : 'x2'}</span>
			</div>
		</div>
	</Tooltip.Provider>
{/if}
