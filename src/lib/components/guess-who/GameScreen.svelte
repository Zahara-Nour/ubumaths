<script lang="ts">
	/**
	 * GameScreen - Main game interface for Guess Who Math
	 *
	 * Integrates all game components: GameStatus, Timer, NumberGrid,
	 * QuestionSelector, AnswerPrompt, and MoveHistory.
	 * Uses guessWhoStore for all state management.
	 */

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';
	import { guessWhoStore } from '$lib/stores/guessWhoGame.svelte';
	import { Target, LogOut } from 'lucide-svelte';

	import GameStatus from './GameStatus.svelte';
	import Timer from './Timer.svelte';
	import NumberGrid from './NumberGrid.svelte';
	import ItemGrid from './ItemGrid.svelte';
	import QuestionSelector from './QuestionSelector.svelte';
	import AnswerPrompt from './AnswerPrompt.svelte';
	import GuessPrompt from './GuessPrompt.svelte';
	import MoveHistory from './MoveHistory.svelte';

	import { GAME_PACKS, type AnyQuestionType } from '$lib/types/guess-who';
	import type { GridItem } from '$lib/utils/guess-who/grid-item';
	import { gridItemToKey, numberItem } from '$lib/utils/guess-who/grid-item';

	interface Props {
		player1Name?: string;
		player2Name?: string;
		currentUserId: string;
		class?: string;
	}

	let {
		player1Name = 'Joueur 1',
		player2Name = 'Joueur 2',
		currentUserId,
		class: className = ''
	}: Props = $props();

	// Local UI state
	let showGuessPrompt = $state(false);
	let showAbandonDialog = $state(false);

	// Derived from store
	const game = $derived(guessWhoStore.game);
	const mySecretNumber = $derived(guessWhoStore.mySecretNumber);
	const eliminatedNumbers = $derived(guessWhoStore.eliminatedNumbers);
	const moves = $derived(guessWhoStore.moves);
	const timer = $derived(guessWhoStore.timer);
	const isMyTurn = $derived(guessWhoStore.isMyTurn);
	const mustAnswer = $derived(guessWhoStore.mustAnswer);
	const canAskQuestion = $derived(guessWhoStore.canAskQuestion);
	const bonusTurnsRemaining = $derived(guessWhoStore.bonusTurnsRemaining);
	const pendingQuestion = $derived(guessWhoStore.pendingQuestion);
	const isSubmitting = $derived(guessWhoStore.isSubmitting);
	const isConnected = $derived(guessWhoStore.isConnected);
	const availableQuestions = $derived(guessWhoStore.availableQuestions);
	const packId = $derived(guessWhoStore.packId);

	// Get item type for current pack
	const itemType = $derived(GAME_PACKS[packId]?.itemType ?? 'number');

	// Whether using polymorphic items (non-number pack)
	const isPolymorphic = $derived(itemType !== 'number');

	// Grid items (from game or converted from numbers)
	const gridItems = $derived.by((): GridItem[] => {
		if (!game) return [];
		if (game.gridItems && game.gridItems.length > 0) {
			return game.gridItems;
		}
		// Fallback: convert numbers to NumberGridItems
		return game.gridNumbers.map(numberItem);
	});

	// My secret item (from store data or converted from number)
	const mySecretItem = $derived.by((): GridItem | undefined => {
		if (mySecretNumber === null) return undefined;
		// TODO: When store supports polymorphic items, use mySecretItem directly
		return numberItem(mySecretNumber);
	});

	// Eliminated items as Set<string> for ItemGrid
	const eliminatedItemKeys = $derived.by((): Set<string> => {
		const keys = new Set<string>();
		for (const num of eliminatedNumbers) {
			keys.add(gridItemToKey(numberItem(num)));
		}
		return keys;
	});

	// Get current player name for display
	const currentPlayerName = $derived.by(() => {
		if (!game) return '';
		if (game.currentTurnPlayerId === currentUserId) return 'Vous';
		return game.player1Id === currentUserId ? player2Name : player1Name;
	});

	// Handle number toggle (eliminate/restore)
	function handleNumberToggle(num: number) {
		if (eliminatedNumbers.has(num)) {
			guessWhoStore.restoreNumber(num);
		} else {
			guessWhoStore.eliminateNumber(num);
		}
	}

	// Handle item toggle (for polymorphic grids)
	function handleItemToggle(item: GridItem) {
		// For now, convert to number if it's a number item
		// TODO: When store supports polymorphic items, toggle item directly
		if (item.type === 'number') {
			handleNumberToggle(item.value);
		}
		// Non-number items: would need store support for eliminatedItems
	}

	// Handle asking a question
	async function handleAskQuestion(type: AnyQuestionType, param?: number) {
		await guessWhoStore.askQuestion(type, param);
	}

	// Handle answering a question
	async function handleAnswer(answer: boolean) {
		await guessWhoStore.answerQuestion(answer);
	}

	// Handle making a guess
	async function handleGuess(number: number) {
		await guessWhoStore.guess(number);
		showGuessPrompt = false;
	}

	// Handle abandon
	async function handleAbandon() {
		await guessWhoStore.abandonGame();
		showAbandonDialog = false;
	}
</script>

{#if game && mySecretNumber !== null}
	<div class={cn('game-screen', className)}>
		<!-- Connection indicator -->
		{#if !isConnected}
			<div
				class="mb-4 rounded-lg bg-yellow-100 p-3 text-center text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
			>
				Reconnexion en cours...
			</div>
		{/if}

		<!-- Main layout: responsive grid -->
		<div class="game-layout">
			<!-- Left column: Game status, Timer, Grid -->
			<div class="game-main space-y-4">
				<!-- Status and Timer row -->
				<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
					<GameStatus
						{isMyTurn}
						{currentPlayerName}
						{bonusTurnsRemaining}
						{mustAnswer}
						class="flex-1"
					/>
					<Timer seconds={timer} isActive={isMyTurn || mustAnswer} class="shrink-0" />
				</div>

				<Separator />

				<!-- My secret number/item badge -->
				<div class="flex items-center justify-center gap-3">
					<span class="text-sm text-muted-foreground">
						{isPolymorphic ? 'Votre élément secret :' : 'Votre nombre secret :'}
					</span>
					<Badge variant="secondary" class="px-4 py-2 text-xl font-bold">
						{mySecretNumber}
					</Badge>
				</div>

				<!-- Grid (Number or Polymorphic) -->
				<Card class="p-4">
					{#if isPolymorphic}
						<ItemGrid
							items={gridItems}
							eliminatedItems={eliminatedItemKeys}
							secretItem={mySecretItem}
							onToggle={handleItemToggle}
						/>
					{:else}
						<NumberGrid
							numbers={game.gridNumbers}
							{eliminatedNumbers}
							secretNumber={mySecretNumber}
							onToggle={handleNumberToggle}
						/>
					{/if}
				</Card>

				<!-- Action area -->
				<div class="action-area">
					{#if mustAnswer && pendingQuestion}
						<!-- Must answer opponent's question -->
						<AnswerPrompt
							question={pendingQuestion}
							{mySecretNumber}
							onAnswer={handleAnswer}
							{timer}
							{isSubmitting}
						/>
					{:else if isMyTurn && canAskQuestion}
						<!-- Can ask a question or make a guess -->
						<Card class="p-4">
							<div class="space-y-4">
								<QuestionSelector
									onSubmit={handleAskQuestion}
									disabled={isSubmitting}
									{itemType}
									{availableQuestions}
								/>

								<Separator />

								<Button
									onclick={() => (showGuessPrompt = true)}
									variant="secondary"
									class="w-full"
									disabled={isSubmitting}
								>
									<Target class="mr-2 h-4 w-4" />
									Deviner le nombre
								</Button>
							</div>
						</Card>
					{:else if isMyTurn && pendingQuestion}
						<!-- Waiting for opponent's answer -->
						<Card class="p-4 text-center">
							<p class="text-muted-foreground">En attente de la reponse de votre adversaire...</p>
						</Card>
					{:else}
						<!-- Opponent's turn -->
						<Card class="p-4 text-center">
							<p class="text-muted-foreground">C'est le tour de votre adversaire</p>
							<p class="mt-2 text-sm text-muted-foreground">
								Vous pouvez cliquer sur les nombres pour les marquer
							</p>
						</Card>
					{/if}
				</div>
			</div>

			<!-- Right column: Move history and controls -->
			<div class="game-sidebar space-y-4">
				<!-- Move history -->
				<Card class="p-4">
					<MoveHistory {moves} {player1Name} {player2Name} {currentUserId} />
				</Card>

				<!-- Abandon button -->
				<Button
					onclick={() => (showAbandonDialog = true)}
					variant="destructive"
					class="w-full"
					size="sm"
				>
					<LogOut class="mr-2 h-4 w-4" />
					Abandonner la partie
				</Button>
			</div>
		</div>
	</div>

	<!-- Guess Prompt Modal -->
	{#if showGuessPrompt}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
		>
			<GuessPrompt
				gridNumbers={game.gridNumbers}
				{eliminatedNumbers}
				onGuess={handleGuess}
				onCancel={() => (showGuessPrompt = false)}
				{isSubmitting}
			/>
		</div>
	{/if}

	<!-- Abandon Confirmation Dialog -->
	<Dialog.Root bind:open={showAbandonDialog}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Abandonner la partie ?</Dialog.Title>
				<Dialog.Description>
					Si vous abandonnez, votre adversaire gagne automatiquement. Cette action ne peut pas etre
					annulee.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button onclick={() => (showAbandonDialog = false)} variant="outline">Annuler</Button>
				<Button onclick={handleAbandon} variant="destructive">Abandonner</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<!-- Loading state -->
	<div class="flex min-h-[400px] items-center justify-center p-4">
		<Card class="w-full max-w-md p-6 text-center">
			<div class="mb-4 text-5xl">?</div>
			<h2 class="mb-2 text-xl font-semibold text-foreground">Chargement de la partie...</h2>
			<p class="text-sm text-muted-foreground">Veuillez patienter</p>
		</Card>
	</div>
{/if}

<style>
	.game-screen {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.game-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	/* Desktop: side-by-side layout */
	@media (min-width: 1024px) {
		.game-layout {
			grid-template-columns: 2fr 1fr;
		}
	}

	.game-main {
		min-width: 0; /* Prevent grid blowout */
	}

	.game-sidebar {
		min-width: 0;
	}

	.action-area {
		max-width: 500px;
		margin: 0 auto;
	}
</style>
