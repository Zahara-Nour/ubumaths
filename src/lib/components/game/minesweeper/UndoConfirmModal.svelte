<!--
	UndoConfirmModal Component
	==========================

	Displays when a player clicks on a mine and has a "Seconde Chance" item available.
	Allows them to use the item to undo the fatal move or accept defeat.

	USAGE:
	```svelte
	{#if minesweeperStore.pendingBombCell}
		<UndoConfirmModal
			onUseUndo={() => minesweeperStore.useUndo()}
			onDecline={() => minesweeperStore.declineUndo()}
			isLoading={minesweeperStore.isLoading}
		/>
	{/if}
	```
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Undo2, X, Clock } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		onUseUndo: () => void;
		onDecline: () => void;
		isLoading?: boolean;
		autoDeclineSeconds?: number;
	}

	let { onUseUndo, onDecline, isLoading = false, autoDeclineSeconds = 10 }: Props = $props();

	// Countdown timer state
	let secondsRemaining = $state(autoDeclineSeconds);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		// Start countdown
		countdownInterval = setInterval(() => {
			secondsRemaining--;
			if (secondsRemaining <= 0) {
				// Auto-decline when timer runs out
				if (countdownInterval) {
					clearInterval(countdownInterval);
					countdownInterval = null;
				}
				onDecline();
			}
		}, 1000);
	});

	onDestroy(() => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	});

	function handleUseUndo() {
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		onUseUndo();
	}

	function handleDecline() {
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		onDecline();
	}
</script>

<!-- Modal backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-labelledby="undo-modal-title"
>
	<Card.Root
		class="animate-in zoom-in-95 mx-4 w-full max-w-sm border-2 border-amber-500 duration-200"
	>
		<Card.Header class="pb-2">
			<div class="flex items-center gap-2">
				<span class="text-3xl">💣</span>
				<Card.Title id="undo-modal-title" class="text-xl font-bold text-amber-600">
					Bombe touchée !
				</Card.Title>
			</div>
		</Card.Header>

		<Card.Content class="space-y-4">
			<!-- Warning message -->
			<div class="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/50">
				<p class="text-sm text-amber-800 dark:text-amber-200">
					Vous avez touché une bombe, mais vous possédez une <strong>Seconde Chance</strong> !
				</p>
			</div>

			<!-- Explanation -->
			<div class="text-center text-sm text-muted-foreground">
				<p>Utilisez votre item pour annuler ce coup et continuer à jouer.</p>
				<p class="mt-1 text-xs italic">L'item sera consommé de votre inventaire.</p>
			</div>

			<!-- Countdown timer -->
			<div
				class="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2 text-sm"
				class:text-destructive={secondsRemaining <= 3}
				class:animate-pulse={secondsRemaining <= 3}
			>
				<Clock class="h-4 w-4" />
				<span>Décision automatique dans {secondsRemaining}s</span>
			</div>
		</Card.Content>

		<Card.Footer class="flex justify-center gap-3 pt-2">
			<Button
				variant="default"
				onclick={handleUseUndo}
				disabled={isLoading}
				class="gap-2 bg-amber-600 hover:bg-amber-700"
			>
				{#if isLoading}
					<span class="animate-spin">...</span>
					Utilisation...
				{:else}
					<Undo2 class="h-4 w-4" />
					Seconde Chance
				{/if}
			</Button>

			<Button
				variant="outline"
				onclick={handleDecline}
				disabled={isLoading}
				class="gap-2 text-destructive hover:bg-destructive/10"
			>
				<X class="h-4 w-4" />
				Abandonner
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
