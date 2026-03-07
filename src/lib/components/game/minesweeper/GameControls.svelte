<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';

	interface Props {
		timeElapsed: number;
		minesRemaining: number;
		gameStatus: 'not_started' | 'in_progress' | 'won' | 'lost';
		onReset: () => void;
		hintsUsed?: number;
		hintCardsAvailable?: number;
		onUseHint?: () => void;
		freezeCardsByType?: { freeze: number; chronostase: number };
		freezeRemainingSeconds?: number;
		onUseFreeze?: (cardType: 'freeze' | 'chronostase') => void;
		isAuthenticated?: boolean;
		isLoading?: boolean;
		isTournament?: boolean;
	}

	let {
		timeElapsed,
		minesRemaining,
		gameStatus,
		onReset,
		hintsUsed = 0,
		hintCardsAvailable = 0,
		onUseHint,
		freezeCardsByType = { freeze: 0, chronostase: 0 },
		freezeRemainingSeconds = 0,
		onUseFreeze,
		isAuthenticated = false,
		isLoading = false,
		isTournament = false
	}: Props = $props();

	// Format time as MM:SS or HH:MM:SS
	const formattedTime = $derived.by(() => {
		const hours = Math.floor(timeElapsed / 3600);
		const minutes = Math.floor((timeElapsed % 3600) / 60);
		const seconds = timeElapsed % 60;
		if (hours > 0) {
			return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	});

	// Status
	const statusMessage = $derived.by(() => {
		if (gameStatus === 'won') return 'Victoire !';
		if (gameStatus === 'lost') return 'Defaite';
		return null;
	});
	const statusColor = $derived.by(() => {
		if (gameStatus === 'won') return 'text-green-600 dark:text-green-400';
		if (gameStatus === 'lost') return 'text-destructive';
		return '';
	});

	const isFrozen = $derived(freezeRemainingSeconds > 0);
	const gameInProgress = $derived(gameStatus === 'in_progress');

	// Hint state
	const hintMaxed = $derived(hintsUsed >= 3);
	const hasHintCards = $derived(hintCardsAvailable > 0);
	const hintDisabled = $derived(!gameInProgress || hintMaxed || isLoading);

	const hintTooltip = $derived.by(() => {
		const base = 'Indice : revele une cellule sure au hasard.';
		if (hasHintCards) return `${base} Penalite reduite avec carte VIP.`;
		return `${base} Coute 1 gidouille.`;
	});

	// Freeze state helpers
	const freezeDisabled = $derived(!gameInProgress || isLoading || isTournament || isFrozen);

	function freezeTooltip(type: 'freeze' | 'chronostase'): string {
		const duration = type === 'freeze' ? 60 : 120;
		const name = type === 'freeze' ? 'Gel Temporaire' : 'Chronostase';
		return `${name} : gele le chronometre pendant ${duration}s.`;
	}

	const showPowers = $derived(isAuthenticated && !isTournament && (onUseHint || onUseFreeze));

	const hasFreezeCards = $derived(freezeCardsByType.freeze > 0);
	const hasChronostaseCards = $derived(freezeCardsByType.chronostase > 0);
	const showFreeze = $derived(onUseFreeze && (hasFreezeCards || hasChronostaseCards || isFrozen));
</script>

<Tooltip.Provider>
	<div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
		<!-- Header: mines + timer -->
		<div class="flex items-center justify-center gap-4">
			<div class="flex items-center gap-1.5 font-mono" aria-label="Mines restantes">
				<img
					src="/images/games/minesweeper-flag.webp"
					alt=""
					class="h-16 w-16"
					aria-hidden="true"
				/>
				<span class="text-lg font-bold tabular-nums">{minesRemaining}</span>
			</div>
			<div
				class={cn(
					'rounded-lg border border-border bg-muted/50 px-4 py-1.5 font-mono',
					isFrozen && 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-950/20'
				)}
				aria-label="Temps ecoule"
			>
				<span
					class={cn(
						'text-2xl font-bold text-foreground tabular-nums',
						isFrozen && 'text-cyan-600 dark:text-cyan-400'
					)}>{formattedTime}</span
				>
			</div>
		</div>

		<!-- Freeze countdown banner -->
		{#if isFrozen}
			<div
				class="flex animate-pulse items-center justify-center gap-2 rounded-md bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
			>
				❄️ Gele : {freezeRemainingSeconds}s
			</div>
		{/if}

		<!-- Status message -->
		{#if statusMessage}
			<div
				class={cn('text-center text-lg font-bold', statusColor)}
				role="status"
				aria-live="polite"
			>
				{gameStatus === 'won' ? '🎉' : '💥'}
				{statusMessage}
			</div>
		{/if}

		<!-- Reset button -->
		<Button onclick={onReset} variant="outline" size="sm" class="w-full">🔄 Nouvelle partie</Button>

		<!-- Power bar -->
		{#if showPowers}
			<div class="border-t border-border pt-3">
				<div class="flex items-center justify-center gap-3">
					<!-- Hint power -->
					{#if onUseHint}
						<div class="relative">
							<Tooltip.Root>
								<Tooltip.Trigger>
									<button
										onclick={onUseHint}
										disabled={hintDisabled}
										class={cn(
											'h-14 w-14 overflow-hidden rounded-xl border-2 transition-all',
											hintDisabled
												? 'cursor-not-allowed border-muted opacity-50 grayscale'
												: hasHintCards
													? 'border-green-500 hover:border-green-400 hover:shadow-md hover:shadow-green-500/20'
													: 'border-amber-500 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/20'
										)}
										aria-label="Utiliser un indice"
									>
										<img
											src="/images/games/power-hint.jpg"
											alt="Indice"
											class="h-full w-full object-cover"
										/>
										{#if isLoading}
											<span class="absolute inset-0 flex items-center justify-center bg-black/40">
												<span class="animate-spin text-lg text-white">⏳</span>
											</span>
										{/if}
									</button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p class="max-w-48 text-sm">{hintTooltip}</p>
								</Tooltip.Content>
							</Tooltip.Root>
							{#if hasHintCards && !hintMaxed}
								<span
									class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white shadow"
								>
									{hintCardsAvailable}
								</span>
							{/if}
						</div>
					{/if}

					<!-- Freeze power (Gel Temporaire - 60s) -->
					{#if showFreeze && hasFreezeCards}
						<div class="relative">
							<Tooltip.Root>
								<Tooltip.Trigger>
									<button
										onclick={() => onUseFreeze?.('freeze')}
										disabled={freezeDisabled || freezeCardsByType.freeze <= 0}
										class={cn(
											'h-14 w-14 overflow-hidden rounded-xl border-2 transition-all',
											freezeDisabled || freezeCardsByType.freeze <= 0
												? 'cursor-not-allowed border-muted opacity-50 grayscale'
												: 'border-cyan-500 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/20'
										)}
										aria-label="Utiliser le Gel Temporaire (60s)"
									>
										<img
											src="/images/games/power-freeze.jpg"
											alt="Gel Temporaire"
											class="h-full w-full object-cover"
										/>
									</button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p class="max-w-48 text-sm">{freezeTooltip('freeze')}</p>
								</Tooltip.Content>
							</Tooltip.Root>
							{#if freezeCardsByType.freeze > 0}
								<span
									class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white shadow"
								>
									{freezeCardsByType.freeze}
								</span>
							{/if}
						</div>
					{/if}

					<!-- Chronostase power (120s) -->
					{#if showFreeze && hasChronostaseCards}
						<div class="relative">
							<Tooltip.Root>
								<Tooltip.Trigger>
									<button
										onclick={() => onUseFreeze?.('chronostase')}
										disabled={freezeDisabled || freezeCardsByType.chronostase <= 0}
										class={cn(
											'h-14 w-14 overflow-hidden rounded-xl border-2 transition-all',
											freezeDisabled || freezeCardsByType.chronostase <= 0
												? 'cursor-not-allowed border-muted opacity-50 grayscale'
												: 'border-violet-500 hover:border-violet-400 hover:shadow-md hover:shadow-violet-500/20'
										)}
										aria-label="Utiliser la Chronostase (120s)"
									>
										<img
											src="/images/games/power-chronostase.jpg"
											alt="Chronostase"
											class="h-full w-full object-cover"
										/>
									</button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p class="max-w-48 text-sm">{freezeTooltip('chronostase')}</p>
								</Tooltip.Content>
							</Tooltip.Root>
							{#if freezeCardsByType.chronostase > 0}
								<span
									class="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow"
								>
									{freezeCardsByType.chronostase}
								</span>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Labels under powers -->
				<div
					class="mt-1.5 flex items-center justify-center gap-3 text-[10px] text-muted-foreground"
				>
					{#if onUseHint}
						<span class="w-14 text-center">Indice</span>
					{/if}
					{#if showFreeze && hasFreezeCards}
						<span class="w-14 text-center">Gel 60s</span>
					{/if}
					{#if showFreeze && hasChronostaseCards}
						<span class="w-14 text-center">Gel 120s</span>
					{/if}
				</div>

				<!-- Hints used counter -->
				{#if onUseHint && hintsUsed > 0}
					<div class="mt-2 text-center text-xs text-muted-foreground">
						Indices : <span
							class={cn(
								'font-semibold',
								hintsUsed >= 3
									? 'text-red-600 dark:text-red-400'
									: hintsUsed > 0
										? 'text-amber-600 dark:text-amber-400'
										: ''
							)}>{hintsUsed}/3</span
						>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</Tooltip.Provider>
