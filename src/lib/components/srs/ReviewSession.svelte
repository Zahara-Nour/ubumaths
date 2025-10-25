<!--
	ReviewSession Component
	=======================

	Manages a complete SRS review session for a deck.

	Features:
	- Fetches due cards from API
	- Displays cards one by one using FlashCard
	- Shows FSRS grading buttons after flip
	- Submits reviews and updates stats
	- Progress tracking
	- Completion summary

	Props:
	- deckId: ID of the deck being reviewed
	- onComplete: Callback when session ends
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import CustomFlashCard from './CustomFlashCard.svelte';
	import FSRSButtons from './FSRSButtons.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { CheckCircle2, Trophy, ArrowLeft } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { ReviewCard } from '$lib/srs/types';

	interface Props {
		deckId: string;
		onComplete?: (summary: SessionSummary) => void;
		onBack?: () => void;
	}

	interface SessionSummary {
		totalCards: number;
		correctCount: number;
		wrongCount: number;
		totalTime: number;
	}

	let { deckId, onComplete, onBack }: Props = $props();

	// State
	let cards = $state<ReviewCard[]>([]);
	let currentIndex = $state(0);
	let isFlipped = $state(false);
	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let sessionComplete = $state(false);

	// Session stats
	let correctCount = $state(0);
	let wrongCount = $state(0);
	let sessionStartTime = $state<number>(0);
	let cardStartTime = $state<number>(0);

	// Derived state
	const currentCard = $derived(cards[currentIndex]);
	const totalCards = $derived(cards.length);
	const progressPercent = $derived(totalCards > 0 ? (currentIndex / totalCards) * 100 : 0);
	const remainingCards = $derived(totalCards - currentIndex);
	const showGradeButtons = $derived(isFlipped && !isSubmitting);

	// ============================================================================
	// INITIALIZATION
	// ============================================================================

	onMount(async () => {
		sessionStartTime = Date.now();
		await fetchDueCards();
	});

	/**
	 * Fetch due cards from API
	 */
	async function fetchDueCards() {
		isLoading = true;

		try {
			const response = await fetch(`/api/srs/review/due?deck_id=${deckId}`);

			if (!response.ok) {
				throw new Error('Failed to fetch due cards');
			}

			const data = await response.json();
			cards = data.cards || [];

			if (cards.length === 0) {
				sessionComplete = true;
			} else {
				cardStartTime = Date.now();
			}
		} catch (error) {
			console.error('Error fetching due cards:', error);
			toaster.error('Erreur lors du chargement des cartes');
		} finally {
			isLoading = false;
		}
	}

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	/**
	 * Handle card flip
	 */
	function handleFlip(flipped: boolean) {
		isFlipped = flipped;
	}

	/**
	 * Handle grade selection
	 */
	async function handleGrade(grade: 1 | 2 | 3 | 4) {
		if (!currentCard || isSubmitting) return;

		isSubmitting = true;

		// Calculate time spent on this card (in seconds)
		const timeSpent = Math.round((Date.now() - cardStartTime) / 1000);

		// Track correct/wrong
		if (grade >= 3) {
			correctCount++;
		} else {
			wrongCount++;
		}

		try {
			const response = await fetch('/api/srs/review/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cardId: currentCard.cardId,
					deckId,
					grade,
					timeSpent
				})
			});

			if (!response.ok) {
				throw new Error('Failed to submit review');
			}

			// Move to next card
			await moveToNextCard();
		} catch (error) {
			console.error('Error submitting review:', error);
			toaster.error('Erreur lors de la soumission');
			isSubmitting = false;
		}
	}

	/**
	 * Move to next card or complete session
	 */
	async function moveToNextCard() {
		if (currentIndex + 1 >= totalCards) {
			// Session complete
			completeSession();
		} else {
			// Next card
			currentIndex++;
			isFlipped = false;
			isSubmitting = false;
			cardStartTime = Date.now();
		}
	}

	/**
	 * Complete session and show summary
	 */
	function completeSession() {
		sessionComplete = true;

		const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);

		const summary: SessionSummary = {
			totalCards,
			correctCount,
			wrongCount,
			totalTime
		};

		onComplete?.(summary);
	}

	/**
	 * Format time (seconds to mm:ss)
	 */
	function _formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<!-- Loading State -->
{#if isLoading}
	<div class="flex min-h-[400px] items-center justify-center">
		<div class="text-center">
			<div
				class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
			<p class="text-muted-foreground">Chargement des cartes...</p>
		</div>
	</div>

	<!-- Empty State -->
{:else if !isLoading && totalCards === 0 && !sessionComplete}
	<Card.Root class="mx-auto max-w-2xl">
		<Card.Header>
			<Card.Title>Aucune carte à réviser</Card.Title>
			<Card.Description>Félicitations ! Toutes vos cartes sont à jour.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col items-center gap-4 py-8">
				<CheckCircle2 class="h-16 w-16 text-green-600" />
				<p class="text-center text-muted-foreground">
					Revenez plus tard pour continuer vos révisions.
				</p>
				{#if onBack}
					<Button onclick={onBack} variant="outline" class="mt-4">
						<ArrowLeft class="mr-2 h-4 w-4" />
						Retour aux decks
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Session Complete -->
{:else if sessionComplete}
	<Card.Root class="mx-auto max-w-2xl">
		<Card.Header>
			<div class="flex flex-col items-center gap-4">
				<Trophy class="h-16 w-16 text-yellow-500" />
				<Card.Title class="text-center text-2xl">Session terminée !</Card.Title>
				<Card.Description class="text-center">
					Excellent travail ! Voici votre résumé.
				</Card.Description>
			</div>
		</Card.Header>
		<Card.Content>
			<!-- Summary Stats -->
			<div class="grid grid-cols-3 gap-4 rounded-lg border bg-muted/50 p-6">
				<div class="text-center">
					<p class="text-3xl font-bold">{totalCards}</p>
					<p class="text-sm text-muted-foreground">Cartes révisées</p>
				</div>
				<div class="text-center">
					<p class="text-3xl font-bold text-green-600">{correctCount}</p>
					<p class="text-sm text-muted-foreground">Réussies</p>
				</div>
				<div class="text-center">
					<p class="text-3xl font-bold text-red-600">{wrongCount}</p>
					<p class="text-sm text-muted-foreground">Ratées</p>
				</div>
			</div>

			<!-- Accuracy Rate -->
			<div class="mt-6">
				<div class="mb-2 flex justify-between text-sm">
					<span>Taux de réussite</span>
					<span class="font-semibold">
						{totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0}%
					</span>
				</div>
				<Progress value={totalCards > 0 ? (correctCount / totalCards) * 100 : 0} class="h-3" />
			</div>

			<!-- Actions -->
			<div class="mt-6 flex gap-3">
				{#if onBack}
					<Button onclick={onBack} variant="outline" class="flex-1">
						<ArrowLeft class="mr-2 h-4 w-4" />
						Retour aux decks
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Active Review -->
{:else if currentCard}
	<div class="review-session mx-auto w-full max-w-4xl">
		<!-- Progress Header -->
		<div class="mb-6 space-y-3">
			<div class="flex items-center justify-between text-sm text-muted-foreground">
				<span>Carte {currentIndex + 1} sur {totalCards}</span>
				<span>{remainingCards} restante{remainingCards > 1 ? 's' : ''}</span>
			</div>
			<Progress value={progressPercent} class="h-2" />
		</div>

		<!-- FlashCard Display -->
		<div class="mb-6">
			{#if currentCard.cardType === 'template' && currentCard.instance}
				<FlashCard
					interactive={false}
					instance={currentCard.instance}
					size="lg"
					onFlip={handleFlip}
				/>
			{:else if currentCard.cardType === 'custom' && currentCard.frontContent && currentCard.backContent}
				<CustomFlashCard
					frontContent={currentCard.frontContent}
					backContent={currentCard.backContent}
					size="lg"
					onFlip={handleFlip}
				/>
			{/if}
		</div>

		<!-- FSRS Grading Buttons (shown after flip) -->
		{#if showGradeButtons}
			<div class="grade-section animate-fadeIn">
				<FSRSButtons onGrade={handleGrade} disabled={isSubmitting} showIntervals={false} />
			</div>
		{:else if !isFlipped}
			<div class="text-center text-sm text-muted-foreground">
				<p>Retournez la carte pour révéler la correction, puis notez votre réponse</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.review-session {
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.3s ease-out;
	}
</style>
