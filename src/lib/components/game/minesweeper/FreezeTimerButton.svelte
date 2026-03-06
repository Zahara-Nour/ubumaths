<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';

	let {
		freezeCardsAvailable = 0,
		freezeUsedThisGame = false,
		freezeRemainingSeconds = 0,
		gameStatus = 'in_progress',
		isLoading = false,
		isTournament = false,
		onUseFreeze
	}: {
		freezeCardsAvailable?: number;
		freezeUsedThisGame?: boolean;
		freezeRemainingSeconds?: number;
		gameStatus?: 'not_started' | 'in_progress' | 'won' | 'lost';
		isLoading?: boolean;
		isTournament?: boolean;
		onUseFreeze: () => void;
	} = $props();

	const isFrozen = $derived(freezeRemainingSeconds > 0);
	const hasCards = $derived(freezeCardsAvailable > 0);
	const disabled = $derived(gameStatus !== 'in_progress');

	const isButtonDisabled = $derived(
		disabled || freezeUsedThisGame || isLoading || isTournament || isFrozen || !hasCards
	);

	const tooltipContent = $derived.by(() => {
		if (isTournament) {
			return 'Non disponible en tournoi';
		}
		if (isFrozen) {
			return `Timer gelé (${freezeRemainingSeconds}s restantes)`;
		}
		if (freezeUsedThisGame) {
			return 'Déjà utilisé cette partie (max 1)';
		}
		if (!hasCards) {
			return 'Aucune carte Gel Temporaire disponible';
		}
		if (gameStatus === 'not_started') {
			return 'Cliquez sur une cellule pour commencer la partie';
		}
		if (disabled) {
			return 'La partie est terminée';
		}
		return 'Gèle le timer pendant 60 secondes. La carte sera consommée.';
	});
</script>

<div class="flex flex-col gap-2">
	{#if isFrozen}
		<div
			class="flex items-center justify-center gap-2 rounded-md bg-cyan-100 px-3 py-1.5 dark:bg-cyan-900/30"
		>
			<span class="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
				Timer gelé : {freezeRemainingSeconds}s
			</span>
		</div>
	{:else if hasCards && !freezeUsedThisGame && !isTournament}
		<div
			class="flex items-center justify-center gap-2 rounded-md bg-cyan-100 px-3 py-1.5 dark:bg-cyan-900/30"
		>
			<span class="text-sm font-semibold text-cyan-700 dark:text-cyan-400">
				{freezeCardsAvailable} carte(s) gel disponible(s)
			</span>
		</div>
	{/if}

	<Tooltip.Root>
		<Tooltip.Trigger>
			<Button
				onclick={onUseFreeze}
				disabled={isButtonDisabled}
				variant={isFrozen ? 'default' : 'secondary'}
				size="sm"
				class={cn(
					'w-full',
					isFrozen && 'animate-pulse bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600',
					hasCards &&
						!freezeUsedThisGame &&
						!isFrozen &&
						'bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-600'
				)}
				aria-label="Utiliser le Gel Temporaire"
			>
				{#if isLoading}
					<svg
						class="mr-2 h-4 w-4 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				{:else}
					<span class="mr-2" aria-hidden="true">{isFrozen ? '❄️' : '🧊'}</span>
				{/if}
				{#if isFrozen}
					Gelé ({freezeRemainingSeconds}s)
				{:else if freezeUsedThisGame}
					Gel utilisé
				{:else}
					Gel Temporaire
				{/if}
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p class="max-w-xs text-sm">{tooltipContent}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</div>
