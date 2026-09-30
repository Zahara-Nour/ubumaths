<!--
	ClassroomSeries
	===============
	Forme « En classe » d'une série : le professeur projette les questions une à
	une, les élèves répondent sur leur cahier. Rien n'est enregistré.

	- Une question par diapositive (UbuSlides), carte en lecture seule, sans
	  retournement : la réponse n'est pas montrée à la classe.
	- Minuteur par question = durée de sa catégorie ; à 0, question suivante.
	- ±5 s : change la durée de la catégorie de la question courante (elle et les
	  suivantes de la même catégorie), minimum 5 s, sans remise à zéro du compte.
	- Espace = pause / reprise (au lieu de « suivante » dans UbuSlides).
	- Fin : grille des questions, puis grille des corrections (aller-retour).
-->

<script lang="ts">
	import type { ActionReturn } from 'svelte/action';
	import type { ClassroomItem } from '$lib/types/test';
	import type { DeckContext } from '$lib/slides/core/types';
	import Deck from '$lib/slides/core/Deck.svelte';
	import Slide from '$lib/slides/core/Slide.svelte';
	import { isFromEditableField } from '$lib/slides/actions/editableTarget';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { TILE_CARD_HEIGHT } from '$lib/components/questions/tile-card';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import {
		ArrowLeft,
		BookOpen,
		Eye,
		Maximize,
		Minimize,
		Minus,
		Pause,
		Play,
		Plus,
		RotateCcw
	} from '@lucide/svelte';

	// Types
	interface Props {
		items: ClassroomItem[];
		onBack: () => void;
		onRestart: () => void;
	}

	type Phase = 'slides' | 'questions' | 'corrections';

	// Constantes
	const MIN_DELAY_SECONDS = 5;
	const DELAY_STEP_SECONDS = 5;
	// Sous ce seuil (s), le temps restant passe en couleur d'alerte
	const WARNING_SECONDS = 3;

	// Props
	let { items, onBack, onRestart }: Props = $props();

	// Variables
	let phase = $state<Phase>('slides');
	// Incrémenté à chaque « Recommencer » : remonte le Deck (minuteurs à neuf)
	let run = $state(0);
	// Durées ajustées par catégorie (s) ; absente = durée de l'item
	let categoryDelays = $state<Record<string, number>>({});
	// Contexte du Deck monté, pour la touche Espace (hors du snippet overlay)
	let deckContext: DeckContext | undefined;

	// Functions
	function delayOf(item: ClassroomItem): number {
		return categoryDelays[item.categoryKey] ?? item.delaySeconds;
	}

	function currentItem(deck: DeckContext): ClassroomItem | undefined {
		return items[deck.getIndices().h];
	}

	function adjustCategoryDelay(deck: DeckContext, delta: number) {
		const item = currentItem(deck);
		if (!item) return;
		categoryDelays[item.categoryKey] = Math.max(MIN_DELAY_SECONDS, delayOf(item) + delta);
	}

	function remainingSeconds(deck: DeckContext): number {
		return Math.ceil(deck.getAutoSlideRemaining() / 1000);
	}

	function remainingRatio(deck: DeckContext): number {
		const duration = deck.getAutoSlideDuration();
		return duration > 0 ? deck.getAutoSlideRemaining() / duration : 0;
	}

	// Action (et non {@attach} : le plugin prettier du dépôt ne le connaît pas encore)
	function connectDeck(node: HTMLElement, deck: DeckContext): ActionReturn<DeckContext> {
		deckContext = deck;
		// Les raccourcis du Deck n'agissent que s'il a le focus : on le lui donne
		node.closest<HTMLElement>('[role="application"]')?.focus({ preventScroll: true });
		return {
			destroy() {
				if (deckContext === deck) deckContext = undefined;
			}
		};
	}

	// Espace : pause / reprise. Intercepté en phase de capture, avant le Deck
	// qui en ferait « question suivante »
	function handleKeydownCapture(event: KeyboardEvent) {
		if (event.key !== ' ') return;
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (isFromEditableField(event)) return;
		if (!deckContext) return;
		event.preventDefault();
		event.stopPropagation();
		deckContext.togglePause();
	}

	function handleEnd() {
		phase = 'questions';
	}

	function handleRestart() {
		phase = 'slides';
		run += 1;
		onRestart();
	}
</script>

{#if phase === 'slides'}
	<!-- Projection : texte agrandi (--font-scale, relu par app.css et la FlashCard) -->
	<div
		class="classroom-projection h-[calc(100dvh-8rem)] min-h-96 w-full"
		style:--font-scale="2"
		onkeydowncapture={handleKeydownCapture}
	>
		{#key items}
			{#key run}
				<Deck
					config={{
						hash: false,
						pauseOverlay: false,
						width: 960,
						height: 540,
						maxScale: 3,
						controls: true,
						progress: true,
						slideNumber: false,
						loop: false
					}}
					onend={handleEnd}
				>
					{#each items as item, index (index)}
						<Slide autoSlide={delayOf(item) * 1000}>
							<div class="flex h-full w-full items-center justify-center px-4">
								<FlashCard
									instance={item.instance}
									interactive={false}
									size="lg"
									flippable={false}
								/>
							</div>
						</Slide>
					{/each}

					{#snippet overlay(deck)}
						{@const item = currentItem(deck)}
						{@const seconds = remainingSeconds(deck)}
						{@const paused = deck.isPaused()}
						<div
							class="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-3"
							use:connectDeck={deck}
						>
							<div
								class="pointer-events-auto flex items-center gap-2 rounded-lg bg-background/85 p-1.5 pr-3 shadow-sm backdrop-blur"
							>
								<Button variant="ghost" size="icon" aria-label="Retour au panier" onclick={onBack}>
									<ArrowLeft class="h-5 w-5" />
								</Button>
								<span class="text-lg font-semibold" data-testid="classroom-position">
									Question {deck.getIndices().h + 1} / {items.length}
								</span>
							</div>

							<div
								class="pointer-events-auto flex items-center gap-2 rounded-lg bg-background/85 p-1.5 shadow-sm backdrop-blur"
							>
								<div class="flex items-center gap-1" role="group" aria-label="Durée par question">
									<Button
										variant="secondary"
										size="icon"
										aria-label="Réduire la durée de 5 secondes"
										disabled={!item || delayOf(item) <= MIN_DELAY_SECONDS}
										onclick={() => adjustCategoryDelay(deck, -DELAY_STEP_SECONDS)}
									>
										<Minus class="h-5 w-5" />
									</Button>
									<span
										class="min-w-12 text-center text-sm font-medium text-muted-foreground tabular-nums"
										data-testid="classroom-duration"
										title="Durée des questions de cette catégorie"
									>
										{item ? delayOf(item) : 0} s
									</span>
									<Button
										variant="secondary"
										size="icon"
										aria-label="Augmenter la durée de 5 secondes"
										onclick={() => adjustCategoryDelay(deck, DELAY_STEP_SECONDS)}
									>
										<Plus class="h-5 w-5" />
									</Button>
								</div>

								<Button
									variant="secondary"
									size="icon"
									aria-label={paused ? 'Reprendre' : 'Mettre en pause'}
									title={paused ? 'Reprendre (Espace)' : 'Mettre en pause (Espace)'}
									onclick={() => deck.togglePause()}
								>
									{#if paused}
										<Play class="h-5 w-5" />
									{:else}
										<Pause class="h-5 w-5" />
									{/if}
								</Button>

								<Button
									variant="secondary"
									size="icon"
									aria-label={deck.isFullscreen() ? 'Quitter le plein écran' : 'Plein écran'}
									title={deck.isFullscreen() ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
									onclick={() => void deck.toggleFullscreen()}
								>
									{#if deck.isFullscreen()}
										<Minimize class="h-5 w-5" />
									{:else}
										<Maximize class="h-5 w-5" />
									{/if}
								</Button>

								<!-- Temps restant : lisible depuis le fond de la classe -->
								<div
									class="flex min-w-20 flex-col items-center px-2"
									role="timer"
									aria-label="Temps restant"
								>
									<span
										class={cn(
											'text-4xl leading-none font-bold tabular-nums',
											paused && 'text-muted-foreground',
											!paused && seconds <= WARNING_SECONDS && 'text-destructive'
										)}
										data-testid="classroom-remaining">{seconds}</span
									>
									<span class="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
										<span
											class="block h-full bg-primary"
											style:width="{remainingRatio(deck) * 100}%"
										></span>
									</span>
								</div>
							</div>

							{#if paused}
								<p
									class="pointer-events-none w-full text-center text-sm font-medium text-muted-foreground"
								>
									En pause — Espace pour reprendre
								</p>
							{/if}
						</div>
					{/snippet}
				</Deck>
			{/key}
		{/key}
	</div>
{:else}
	<div class="space-y-6">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold">
					{phase === 'questions' ? 'Série terminée' : 'Corrections'}
				</h1>
				<p class="text-sm text-muted-foreground">
					{items.length}
					{items.length > 1 ? 'questions' : 'question'}
				</p>
			</div>

			<div class="flex flex-wrap gap-2">
				{#if phase === 'questions'}
					<Button onclick={() => (phase = 'corrections')}>
						<BookOpen class="mr-2 h-4 w-4" />
						Voir les corrections
					</Button>
				{:else}
					<Button onclick={() => (phase = 'questions')}>
						<Eye class="mr-2 h-4 w-4" />
						Voir les questions
					</Button>
				{/if}
				<Button variant="outline" onclick={handleRestart}>
					<RotateCcw class="mr-2 h-4 w-4" />
					Recommencer
				</Button>
				<Button variant="outline" onclick={onBack}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Retour au panier
				</Button>
			</div>
		</div>

		{#if phase === 'questions'}
			<ol
				class="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
				data-testid="classroom-questions-grid"
			>
				{#each items as item, index (index)}
					<li class="min-w-0">
						<h2 class="mb-2 text-lg font-semibold">Question {index + 1}</h2>
						<FlashCard
							instance={item.instance}
							interactive={false}
							size="sm"
							flippable={false}
							height={TILE_CARD_HEIGHT}
						/>
					</li>
				{/each}
			</ol>
		{:else}
			<ol
				class="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
				data-testid="classroom-corrections-grid"
			>
				{#each items as item, index (index)}
					<li class="min-w-0">
						<h2 class="mb-2 text-lg font-semibold">Question {index + 1}</h2>
						<!-- Verso de la flash-card : réponse (en grand si une seule case) + explication -->
						<FlashCard
							instance={item.instance}
							interactive={false}
							size="sm"
							flippable={false}
							startFlipped
							height={TILE_CARD_HEIGHT}
						/>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
{/if}

<style>
	/* Le Deck reçoit le focus pour ses raccourcis : pas de cadre autour de la projection */
	.classroom-projection :global([role='application']:focus),
	.classroom-projection :global([role='application']:focus-visible) {
		outline: none;
	}
</style>
