<!--
	ClassroomSeries
	===============
	Forme « En classe » d'une série : le professeur projette les questions une à
	une, les élèves répondent sur leur cahier. Rien n'est enregistré.

	- Page d'attente d'abord (`SeriesStartScreen`) : réglages, indications,
	  « C'est parti ! » (chantier `diaporama-reglages`). Réglages gardés dans le
	  navigateur (`classroomSettings`), modifiables aussi pendant la série (⚙,
	  diaporama en pause tant que le panneau est ouvert).
	- Une question par diapositive (UbuSlides), carte en lecture seule, sans
	  retournement : la réponse n'est pas montrée à la classe.
	- Réglage « Correction après chaque question » : une diapositive de
	  correction (verso de la carte) suit chaque question, durée réglable.
	- Réglage « Pause à la fin du temps » : à 0, la question reste affichée en
	  pause ; Espace passe à la suite.
	- Réglage « Son » : un son discret à l'arrivée d'une nouvelle question.
	- Minuteur par question = durée de sa ligne de série ; à 0, question suivante.
	- ±5 s : change la durée du modèle de la question courante (elle et les
	  suivantes du même modèle), minimum 5 s, sans remise à zéro du compte.
	- Espace = pause / reprise (au lieu de « suivante » dans UbuSlides).
	- Fin : grille des questions, puis grille des corrections (aller-retour).
-->

<script lang="ts">
	import type { ActionReturn } from 'svelte/action';
	import { tick } from 'svelte';
	import type { ClassroomItem } from '#lib/types/test.ts';
	import type { DeckContext, SlideChangedEvent } from '#lib/slides/core/types.ts';
	import Deck from '#lib/slides/core/Deck.svelte';
	import Slide from '#lib/slides/core/Slide.svelte';
	import { isFromEditableField } from '#lib/slides/actions/editableTarget.ts';
	import FlashCard from '#lib/components/questions/FlashCard.svelte';
	import { TILE_CARD_HEIGHT } from '#lib/components/questions/tile-card.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import SeriesStartScreen, { type StartHint } from './SeriesStartScreen.svelte';
	import { seriesSummary } from './series-summary.ts';
	import ClassroomSettingsPanel from './ClassroomSettingsPanel.svelte';
	import {
		classroomSettings,
		CORRECTION_SECONDS_MAX
	} from '#lib/stores/classroomSettings.svelte.ts';
	import { playChime, unlockChime } from '#lib/utils/chime.ts';
	import { cn } from '#lib/utils.ts';
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
		RotateCcw,
		Settings,
		X
	} from '@lucide/svelte';

	// Types
	interface Props {
		items: ClassroomItem[];
		onBack: () => void;
		onRestart: () => void;
	}

	type Phase = 'ready' | 'slides' | 'questions' | 'corrections';

	/** Une diapositive : une question, ou la correction d'une question */
	interface Step {
		kind: 'question' | 'correction';
		/** Rang de la question dans la série */
		index: number;
		item: ClassroomItem;
	}

	// Constantes
	const MIN_DELAY_SECONDS = 5;
	const DELAY_STEP_SECONDS = 5;
	// Sous ce seuil (s), le temps restant passe en couleur d'alerte
	const WARNING_SECONDS = 3;
	const QUIT_HREF = '/automaths/panier';
	const START_HINTS: StartHint[] = [
		{ key: 'Espace', label: 'pause' },
		{ key: 'F', label: 'plein écran' },
		{ key: '← →', label: 'question précédente / suivante' },
		{ key: '−5 s / +5 s', label: 'durée des questions du modèle' }
	];

	// Props
	let { items, onBack, onRestart }: Props = $props();

	// Variables
	let phase = $state<Phase>('ready');
	// Incrémenté à chaque « Recommencer » : remonte le Deck (minuteurs à neuf)
	let run = $state(0);
	// Durées ajustées par modèle (s) ; absente = durée de l'item
	let templateDelays = $state<Record<string, number>>({});
	// Contexte du Deck monté, pour la touche Espace (hors du snippet overlay)
	let deckContext: DeckContext | undefined;
	let settingsOpen = $state(false);
	// Le diaporama tournait à l'ouverture des réglages : il reprend à leur fermeture
	let resumeOnSettingsClose = false;
	// Diapositive retenue en pause à la fin de son temps (« Pause à la fin du temps »)
	let heldH = $state<number | null>(null);
	// Question affichée : le Deck remonté (correction allumée ou éteinte) y revient
	let currentQuestionIndex = 0;
	// Le prochain changement de diapositive est ce retour : pas de son
	let restoring = false;
	// « C'est parti ! » a demandé le plein écran : le Deck monté le prend
	let fullscreenPending = false;

	const activeSettings = $derived(classroomSettings.settings);
	const steps = $derived(buildSteps(items, activeSettings.correctionAfterEach));
	const summary = $derived(buildSummary());

	// Functions
	function buildSteps(list: ClassroomItem[], withCorrections: boolean): Step[] {
		return list.flatMap((item, index): Step[] => {
			const question: Step = { kind: 'question', index, item };
			return withCorrections ? [question, { kind: 'correction', index, item }] : [question];
		});
	}

	function buildSummary(): string {
		const questionsSeconds = items.reduce((total, item) => total + delayOf(item), 0);
		const correctionsSeconds = activeSettings.correctionAfterEach
			? items.length * activeSettings.correctionSeconds
			: 0;
		return seriesSummary(items.length, questionsSeconds + correctionsSeconds, {
			approximate: true
		});
	}

	function delayOf(item: ClassroomItem): number {
		return templateDelays[item.templateId] ?? item.delaySeconds;
	}

	function durationOf(step: Step): number {
		return step.kind === 'correction' ? activeSettings.correctionSeconds : delayOf(step.item);
	}

	function currentStep(deck: DeckContext): Step | undefined {
		return steps[deck.getIndices().h];
	}

	function positionLabel(step: Step | undefined): string {
		if (!step) return '';
		const name = step.kind === 'correction' ? 'Correction' : 'Question';
		return `${name} ${step.index + 1} / ${items.length}`;
	}

	// −5 s / +5 s : durée du modèle (question) ou des corrections (correction)
	function adjustDelay(deck: DeckContext, delta: number) {
		const step = currentStep(deck);
		if (!step) return;
		if (step.kind === 'correction') {
			classroomSettings.update({ correctionSeconds: activeSettings.correctionSeconds + delta });
			return;
		}
		templateDelays[step.item.templateId] = Math.max(MIN_DELAY_SECONDS, delayOf(step.item) + delta);
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
		// (pas pendant les réglages : le panneau garde le focus)
		if (!settingsOpen) {
			node.closest<HTMLElement>('[role="application"]')?.focus({ preventScroll: true });
		}
		void tick().then(() => prepareDeck(deck));
		return {
			destroy() {
				if (deckContext === deck) deckContext = undefined;
			}
		};
	}

	// Deck tout juste monté : plein écran demandé, retour à la question affichée
	function prepareDeck(deck: DeckContext) {
		if (deckContext !== deck) return;
		// Le Deck neuf a oublié les minuteurs : plus rien n'est « Temps écoulé »
		heldH = null;
		if (fullscreenPending) {
			fullscreenPending = false;
			// Refus du navigateur : la série continue sans plein écran
			if (!deck.isFullscreen()) void deck.toggleFullscreen().catch(() => {});
		}
		const target = steps.findIndex(
			(step) => step.kind === 'question' && step.index === currentQuestionIndex
		);
		if (target > 0) {
			restoring = true;
			deck.slide(target);
			// Pas de changement de diapositive : pas d'événement à attendre
			if (deck.getIndices().h !== target) restoring = false;
		}
		if (settingsOpen) deck.pause();
	}

	function handleSlideChanged(event: SlideChangedEvent) {
		heldH = null;
		const step = steps[event.h];
		if (!step) return;
		currentQuestionIndex = step.index;
		if (restoring) {
			restoring = false;
			return;
		}
		if (step.kind === 'question' && activeSettings.chime) playChime();
	}

	// « Pause à la fin du temps » : une question terminée reste affichée, en pause
	function holdOnExpire({ h }: { h: number; v: number }): boolean {
		if (!activeSettings.pauseAtEnd || steps[h]?.kind !== 'question') return false;
		heldH = h;
		return true;
	}

	function isHeld(deck: DeckContext): boolean {
		return heldH !== null && deck.getIndices().h === heldH;
	}

	// Espace ou ▶ : après « Temps écoulé », la suite ; sinon pause / reprise
	function playOrPause(deck: DeckContext) {
		// Réglages ouverts : le diaporama reste en pause jusqu'à leur fermeture
		if (settingsOpen) return;
		if (!isHeld(deck)) {
			deck.togglePause();
			return;
		}
		const h = heldH;
		heldH = null;
		if (h === steps.length - 1) {
			handleEnd();
			return;
		}
		deck.next();
		deck.resume();
	}

	function openSettings(deck: DeckContext) {
		resumeOnSettingsClose = !deck.isPaused();
		deck.pause();
		settingsOpen = true;
	}

	function closeSettings() {
		settingsOpen = false;
		if (resumeOnSettingsClose) deckContext?.resume();
		resumeOnSettingsClose = false;
		// Le Deck reprend le focus pour ses raccourcis
		document
			.querySelector<HTMLElement>('.classroom-projection [role="application"]')
			?.focus({ preventScroll: true });
	}

	// Action du panneau de réglages : il prend le focus à son ouverture (et après
	// un remontage du Deck), et ses touches s'arrêtent à lui. Écouteur natif : un
	// `onkeydown` de Svelte est délégué à la racine, donc vu APRÈS le Deck
	function settingsPanel(node: HTMLElement): ActionReturn {
		const stop = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') event.stopPropagation();
		};
		node.addEventListener('keydown', stop);
		node.focus({ preventScroll: true });
		return {
			destroy() {
				node.removeEventListener('keydown', stop);
			}
		};
	}

	function isFromSettingsPanel(event: Event): boolean {
		return (
			event.target instanceof Element && event.target.closest('[data-settings-panel]') !== null
		);
	}

	// Réglages ouverts : Échap les ferme ; aucune touche n'atteint le Deck
	// (ni Espace qui relancerait, ni flèches qui changeraient de question)
	function handleKeydownWhileSettingsOpen(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			closeSettings();
			return;
		}
		// Dans le panneau, la touche va à sa case ; il l'arrête lui-même avant le Deck
		// (action `settingsPanel`)
		if (!isFromSettingsPanel(event)) event.stopPropagation();
	}

	// Espace : pause / reprise. Intercepté en phase de capture, avant le Deck
	// qui en ferait « question suivante »
	function handleKeydownCapture(event: KeyboardEvent) {
		if (settingsOpen) {
			handleKeydownWhileSettingsOpen(event);
			return;
		}
		if (event.key !== ' ') return;
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (isFromEditableField(event) || isFromSettingsPanel(event)) return;
		if (!deckContext) return;
		event.preventDefault();
		event.stopPropagation();
		playOrPause(deckContext);
	}

	function handleStart() {
		// Le clic est un geste : le navigateur accepte alors son et plein écran
		if (activeSettings.chime) unlockChime();
		fullscreenPending = activeSettings.fullscreenOnStart;
		currentQuestionIndex = 0;
		heldH = null;
		phase = 'slides';
	}

	function handleEnd() {
		settingsOpen = false;
		resumeOnSettingsClose = false;
		phase = 'questions';
	}

	function handleRestart() {
		phase = 'ready';
		run += 1;
		onRestart();
	}
</script>

{#if phase === 'ready'}
	<SeriesStartScreen
		title="En classe"
		{summary}
		hints={START_HINTS}
		quitHref={QUIT_HREF}
		onstart={handleStart}
	>
		{#snippet settings()}
			<ClassroomSettingsPanel />
		{/snippet}
	</SeriesStartScreen>
{:else if phase === 'slides'}
	<!-- Projection : texte agrandi (--font-scale, relu par app.css et la FlashCard) -->
	<div
		class="classroom-projection h-[calc(100dvh-8rem)] min-h-96 w-full"
		style:--font-scale="2"
		onkeydowncapture={handleKeydownCapture}
	>
		<!-- Correction allumée ou éteinte : autre suite de diapositives, Deck remonté -->
		{#key items}
			{#key run}
				{#key activeSettings.correctionAfterEach}
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
						onslidechanged={handleSlideChanged}
						{holdOnExpire}
					>
						{#each steps as step, index (index)}
							<Slide autoSlide={durationOf(step) * 1000}>
								<div class="flex h-full w-full items-center justify-center px-4">
									<!-- Correction : verso de la carte (réponse + correction concise) -->
									<FlashCard
										instance={step.item.instance}
										interactive={false}
										size="lg"
										flippable={false}
										startFlipped={step.kind === 'correction'}
									/>
								</div>
							</Slide>
						{/each}

						{#snippet overlay(deck)}
							{@const step = currentStep(deck)}
							{@const seconds = remainingSeconds(deck)}
							{@const paused = deck.isPaused()}
							{@const held = isHeld(deck)}
							{@const duration = step ? durationOf(step) : 0}
							{@const maxDuration = step?.kind === 'correction' ? CORRECTION_SECONDS_MAX : Infinity}
							<div
								class="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-3"
								use:connectDeck={deck}
							>
								<div
									class="pointer-events-auto flex items-center gap-2 rounded-lg bg-background/85 p-1.5 pr-3 shadow-sm backdrop-blur"
								>
									<!-- La forme « En classe » ne s'ouvre que depuis le panier -->
									<BackLink href={QUIT_HREF} label="Quitter" kind="quit" class="mb-0 ml-0" />
									<span class="text-lg font-semibold" data-testid="classroom-position">
										{positionLabel(step)}
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
											aria-disabled={!step || duration <= MIN_DELAY_SECONDS}
											onclick={() => adjustDelay(deck, -DELAY_STEP_SECONDS)}
										>
											<Minus class="h-5 w-5" />
										</Button>
										<span
											class="min-w-12 text-center text-sm font-medium text-muted-foreground tabular-nums"
											data-testid="classroom-duration"
											title={step?.kind === 'correction'
												? 'Durée de chaque correction'
												: 'Durée des questions de ce modèle'}
										>
											{duration} s
										</span>
										<Button
											variant="secondary"
											size="icon"
											aria-label="Augmenter la durée de 5 secondes"
											aria-disabled={!step || duration >= maxDuration}
											onclick={() => adjustDelay(deck, DELAY_STEP_SECONDS)}
										>
											<Plus class="h-5 w-5" />
										</Button>
									</div>

									<Button
										variant="secondary"
										size="icon"
										aria-label={paused ? 'Reprendre' : 'Mettre en pause'}
										title={paused ? 'Reprendre (Espace)' : 'Mettre en pause (Espace)'}
										onclick={() => playOrPause(deck)}
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

									<Button
										variant={settingsOpen ? 'default' : 'secondary'}
										size="icon"
										aria-label="Réglages"
										aria-expanded={settingsOpen}
										title="Réglages"
										onclick={() => (settingsOpen ? closeSettings() : openSettings(deck))}
									>
										<Settings class="h-5 w-5" />
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

								{#if settingsOpen}
									<!-- Dans le Deck (et non une fenêtre) : visible en plein écran.
										 Ses touches ne vont pas au Deck (Espace coche une case). -->
									<div
										class="pointer-events-auto ml-auto w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg"
										data-settings-panel
										data-testid="classroom-settings-panel"
										role="dialog"
										tabindex="-1"
										aria-label="Réglages"
										use:settingsPanel
									>
										<div class="mb-3 flex items-center justify-between">
											<h2 class="text-lg font-semibold">Réglages</h2>
											<Button
												variant="ghost"
												size="icon"
												aria-label="Fermer les réglages"
												onclick={closeSettings}
											>
												<X class="h-5 w-5" />
											</Button>
										</div>
										<ClassroomSettingsPanel showFullscreen={false} />
									</div>
								{:else if held}
									<p
										class="pointer-events-none w-full text-center text-sm font-medium text-muted-foreground"
									>
										Temps écoulé — Espace pour continuer
									</p>
								{:else if paused}
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
					Retour à ma série
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
