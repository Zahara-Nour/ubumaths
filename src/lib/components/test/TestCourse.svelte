<!--
	TestCourse Component
	====================
	Course aux nombres mode - all questions displayed simultaneously with time limit

	Features:
	- All questions displayed in grid layout
	- Global countdown timer in sticky header
	- Each question uses QuestionDisplay in interactive mode (compact)
	- User can answer in any order
	- "Finish" button or auto-finish when time runs out
	- At the end: show TestResults with score
	- Entraînement libre : page d'attente d'abord (`SeriesStartScreen`, « 20
	  questions · 5 min ») ; le chrono global part au clic sur « C'est parti ! »,
	  et les durées tracées aussi. Contrôle assigné : pas de page d'attente ici,
	  la page `automaths/test` affiche la sienne AVANT que le serveur démarre la
	  tentative (chantier `diaporama-reglages`, PR 2b)

	Props:
	- session: TestSession - Active test session
	- onComplete: (result: TestResult) => void - Callback when test completed
	- onBack: () => void - Callback to return to cart (« Mes évaluations » pour une évaluation)
	- inEvaluation: évaluation assignée → pas de « Recommencer » (une tentative de
	  plus ne passe que par « Mes évaluations »)
	- onRestart: « Recommencer » demande de nouvelles questions à la page (comme les
	  autres formes) ; absent → la même série, remise à zéro sur place (page
	  d'attente comprise)
	- onStart: « C'est parti ! » cliqué sur la page d'attente (la page y fait partir
	  la durée de série)
	- sameQuestions: « Mêmes nombres pour tous » (lien avec graine) → Recommencer
	  redonne les mêmes questions, et le bouton le dit
	- collectOnly: évaluation notée → réponses collectées SANS correction (ADR 0015)
	- showResults: false → pas d'écran de résultats (la page affiche la correction
	  du serveur) ; « Envoi de ta copie… » en attendant
	- unitKeys: touches d'unités de chaque question (évaluation)
	- buddyGain: gain du Palotin, affiché sur l'écran de résultats (`null` → rien)
	- mathouNews: nouveautés de la Chatterie, affichées sur l'écran de résultats (`null` → rien)
	- traceRecorder: série libre d'un élève connecté → une trace par question (lieu
	  `number_race`, ADR 0038) ; `null` → rien (contrôle, visiteur). Question validée :
	  durée = du début de la course à « Valider », durée allouée = durée de la course.
	  À la fin, question jamais validée : ratée, fin « temps écoulé » au chrono, sans
	  durée ni fin si l'élève a cliqué « Terminer » (décision de David, 2026-11-11).
-->

<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { computeTestScore } from '#lib/utils/test-score.ts';
	import type { TestSession, TestResult, TestAnswerResult } from '#lib/types/test.ts';
	import type { AnswerData } from '#lib/types/question-display.ts';
	import QuestionCard from '#lib/components/questions/QuestionCard.svelte';
	import TestTimer from './TestTimer.svelte';
	import TestResults from './TestResults.svelte';
	import SeriesStartScreen from './SeriesStartScreen.svelte';
	import { seriesSummary } from './series-summary.ts';
	import type { BuddyGainView } from '#lib/components/buddy/buddy-gain.ts';
	import type { MathouNews } from '#lib/mathoux/news.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import { automathsQuitLink } from '#lib/navigation/return-links.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { CheckCircle2, ArrowUp } from '@lucide/svelte';
	import { cn } from '#lib/utils.ts';
	import {
		buildSeriesTrace,
		type SeriesTraceTiming,
		type TraceRecorder
	} from '#lib/questions/series-trace.ts';

	interface Props {
		session: TestSession;
		onComplete: (result: TestResult) => void;
		onBack: () => void;
		onRestart?: () => void;
		/** « C'est parti ! » cliqué sur la page d'attente */
		onStart?: () => void;
		sameQuestions?: boolean;
		inEvaluation?: boolean;
		collectOnly?: boolean;
		showResults?: boolean;
		unitKeys?: (string[] | undefined)[];
		buddyGain?: BuddyGainView | null;
		mathouNews?: MathouNews | null;
		traceRecorder?: TraceRecorder | null;
	}

	let {
		session,
		onComplete,
		onBack,
		onRestart,
		onStart,
		sameQuestions = false,
		inEvaluation = false,
		collectOnly = false,
		showResults = true,
		unitKeys = [],
		buddyGain = null,
		mathouNews = null,
		traceRecorder = null
	}: Props = $props();

	// « Quitter » : « Mes contrôles » (avec confirmation) en contrôle, le panier sinon
	const quit = $derived(automathsQuitLink({ inEvaluation, attemptOpen: collectOnly, timed: true }));

	// State
	let answers = $state<Map<number, AnswerData>>(new Map());
	// Questions validées : fin envoyée avec la copie d'un contrôle (PR 4 bis)
	const validated = new SvelteSet<number>();
	// Cartes des questions : en évaluation, ce qui est tapé sans « Valider » part aussi
	let cards = $state<Array<ReturnType<typeof QuestionCard> | undefined>>([]);
	let isCompleted = $state(false);
	let testResult = $state<TestResult | null>(null);
	let showScrollTop = $state(false);
	// « C'est parti ! » cliqué (entraînement libre) : la course démarre
	let started = $state(false);
	// Début de la course : au clic ; contrôle, sans page d'attente : celui de la session
	let startedAt: number | null = null;

	// Derived
	let timeLimit = $derived(session.timeLimit || 300); // Default 5 minutes
	let answeredCount = $derived(answers.size);
	const showStartScreen = $derived(!inEvaluation && !started);
	const startSummary = $derived(
		seriesSummary(session.instances.length, timeLimit, { approximate: false })
	);

	/** Début de la course, d'où partent les durées */
	function raceStart(): number {
		return startedAt ?? session.startTime;
	}

	/** « C'est parti ! » : les questions s'affichent, le chrono part */
	function handleStart() {
		startedAt = Date.now();
		started = true;
		onStart?.();
	}

	/**
	 * Handle answer submission for a specific question
	 */
	function handleAnswerSubmit(index: number, answerData: AnswerData) {
		// Course finie (chrono, « Terminer ») : une validation tardive (programme Python qui
		// tournait encore) n'écrit ni seconde trace ni réponse après le score
		if (testResult) return;
		if (!answers.has(index)) {
			validated.add(index);
			recordTrace(index, answerData, {
				responseMs: Date.now() - raceStart(),
				allottedMs: timeLimit * 1000,
				endReason: 'validated'
			});
		}
		answers.set(index, answerData);
		// Force reactivity
		answers = new Map(answers);
	}

	/** Trace d'une question (ADR 0038) ; jamais en contrôle (`traceRecorder` nul) */
	function recordTrace(index: number, answerData?: AnswerData, timing?: SeriesTraceTiming) {
		if (!traceRecorder || collectOnly) return;
		const trace = buildSeriesTrace({
			place: 'number_race',
			instance: session.instances[index],
			answer: answerData,
			timing
		});
		if (trace) traceRecorder.record(trace);
	}

	/**
	 * Handle timer completion - auto-finish test
	 */
	function handleTimerComplete() {
		if (!isCompleted) {
			finishTest('timeout');
		}
	}

	/**
	 * Handle manual finish button
	 */
	function handleFinish() {
		// Évaluation : une réponse tapée sans « Valider » part quand même (finishTest)
		const unansweredCount = session.instances.filter(
			(_, index) => !answers.has(index) && !(collectOnly && cards[index]?.hasPendingAnswer())
		).length;
		if (
			unansweredCount > 0 &&
			!confirm(
				`Il reste ${unansweredCount} question${unansweredCount > 1 ? 's' : ''} non répondue${unansweredCount > 1 ? 's' : ''}. Voulez-vous vraiment terminer ?`
			)
		) {
			return;
		}
		finishTest('finish');
	}

	/**
	 * Finish test and calculate results
	 */
	function finishTest(reason: 'timeout' | 'finish') {
		// Évaluation : une réponse tapée mais pas validée est envoyée telle quelle
		// (le serveur la corrige) ; hors évaluation, comportement inchangé
		if (collectOnly) {
			session.instances.forEach((_, index) => {
				if (answers.has(index)) return;
				const pending = cards[index]?.submitPendingAnswer() ?? null;
				if (pending) answers.set(index, pending);
			});
		}
		// Questions jamais validées : ratées ; « temps écoulé » seulement au chrono
		session.instances.forEach((_, index) => {
			if (answers.has(index)) return;
			recordTrace(
				index,
				undefined,
				reason === 'timeout'
					? { responseMs: timeLimit * 1000, allottedMs: timeLimit * 1000, endReason: 'timeout' }
					: undefined
			);
		});
		const endTime = Date.now();
		const timeSpent = Math.round((endTime - raceStart()) / 1000);

		// Build answer results
		const answerResults: TestAnswerResult[] = session.instances.map((instance, index) => {
			const userAnswer = answers.get(index);

			return {
				index,
				instance,
				userAnswer,
				isCorrect: userAnswer?.isCorrect || false,
				timeSpent: userAnswer?.timeSpent,
				attempts: userAnswer?.attempts,
				// Non validée : temps écoulé au chrono ; laissée par « Terminer » : aucune fin
				endReason: validated.has(index)
					? ('validated' as const)
					: reason === 'timeout'
						? ('timeout' as const)
						: undefined
			};
		});

		// Calculate score
		// Les cartes de cours (auto-évaluées) sont hors score (décision 2026-09-28)
		const {
			correctAnswers,
			reviewedCards,
			score: scoreOn10,
			scorePercentage
		} = computeTestScore(answerResults);
		const totalQuestions = session.instances.length;
		const averageTime = timeSpent / totalQuestions;

		// Build result
		testResult = {
			mode: 'course',
			score: scoreOn10,
			scorePercentage,
			totalQuestions,
			correctAnswers,
			reviewedCards,
			timeSpent,
			averageTime,
			answers: answerResults,
			completedAt: new Date().toISOString()
		};

		isCompleted = true;

		// Emit completion event
		onComplete(testResult);
	}

	/**
	 * « Recommencer » : la page tire de nouvelles questions (le composant est
	 * remonté) ; sans elle, la même série est remise à zéro sur place
	 */
	function handleRestart() {
		if (onRestart) {
			onRestart();
			return;
		}
		// Reset state
		answers = new Map();
		validated.clear();
		isCompleted = false;
		testResult = null;
		// Retour à la page d'attente : la course repart au prochain clic
		startedAt = null;
		started = false;
	}

	/**
	 * Scroll to top
	 */
	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/**
	 * Handle scroll to show/hide scroll-to-top button
	 */
	function handleScroll() {
		showScrollTop = window.scrollY > 300;
	}

	// Écoute du défilement, retirée au démontage (composant remonté à chaque « Recommencer »)
	$effect(() => {
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

{#if showStartScreen}
	<SeriesStartScreen
		title="Course aux nombres"
		summary={startSummary}
		hints={[]}
		quitHref={quit.href}
		onstart={handleStart}
	/>
{:else if !isCompleted}
	<!-- Course aux nombres mode -->
	<div class="space-y-6">
		<!-- Sticky header with timer and stats -->
		<div
			class="sticky top-0 z-30 -mx-4 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
		>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<!-- Left: Back button and title -->
						<div>
							<BackLink
								href={quit.href}
								label="Quitter"
								kind="quit"
								confirmLeave={quit.confirmLeave}
								class="mb-0"
							/>
							<div>
								<h1 class="font-bold">Course aux nombres</h1>
								<p class="text-sm text-muted-foreground">
									{answeredCount} / {session.instances.length} répondu{answeredCount > 1 ? 's' : ''}
								</p>
							</div>
						</div>

						<!-- Center: Timer -->
						<TestTimer
							duration={timeLimit}
							isPaused={false}
							size="md"
							onComplete={handleTimerComplete}
						/>

						<!-- Right: Finish button -->
						<Button onclick={handleFinish} size="lg">
							<CheckCircle2 class="mr-2 h-5 w-5" />
							Terminer
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Questions grid -->
		<div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
			{#each session.instances as instance, index (index)}
				<div class="relative" id="question-{index}">
					<!-- Question number badge -->
					<div
						class="absolute -top-3 -left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg"
					>
						{index + 1}
					</div>

					<!-- Question display (compact) -->
					<div
						class={cn('transition-all', answers.has(index) && 'ring-2 ring-primary ring-offset-2')}
					>
						<QuestionCard
							bind:this={cards[index]}
							interactive={true}
							{instance}
							onAnswerSubmit={(answerData) => handleAnswerSubmit(index, answerData)}
							size="sm"
							{collectOnly}
							unitKeys={unitKeys[index]}
						/>
					</div>
				</div>
			{/each}
		</div>

		<!-- Scroll to top button -->
		{#if showScrollTop}
			<button
				onclick={scrollToTop}
				class="fixed right-8 bottom-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
				aria-label="Retour en haut"
			>
				<ArrowUp class="h-6 w-6" />
			</button>
		{/if}
	</div>
{:else if testResult && !showResults}
	<!-- Évaluation : la correction vient du serveur, la page l'affiche -->
	<Card.Root>
		<Card.Content class="p-6 text-center" role="status">
			<p class="text-muted-foreground">Envoi de ta copie…</p>
		</Card.Content>
	</Card.Root>
{:else if testResult}
	<!-- Show results -->
	<TestResults
		result={testResult}
		onRestart={handleRestart}
		{sameQuestions}
		onBackToCart={onBack}
		{inEvaluation}
		{buddyGain}
		{mathouNews}
	/>
{/if}
