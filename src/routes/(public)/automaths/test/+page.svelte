<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { buildSeriesItems } from '$lib/questions/series-items';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';
	import type { CartItem } from '$lib/stores/questionCart.svelte';
	import type { ClassroomItem, TestMode, TestSession } from '$lib/types/test';
	import { AlertCircle, Rocket } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	// Import test components
	import ClassroomSeries from '$lib/components/test/ClassroomSeries.svelte';
	import TestInteractive from '$lib/components/test/TestInteractive.svelte';
	import TestCourse from '$lib/components/test/TestCourse.svelte';
	import FlashSeries from '$lib/components/test/FlashSeries.svelte';
	import TestModeDialog from '$lib/components/test/TestModeDialog.svelte';
	import EvaluationResults from '$lib/components/test/EvaluationResults.svelte';
	import { resolveTestLaunch } from '$lib/utils/test-launch';
	import type { TestResult, TestAnswerResult } from '$lib/types/test';
	import type {
		EvaluationStartResponse,
		EvaluationSubmitResponse
	} from '$lib/types/evaluation-attempt';
	import type { SubmittedAnswer } from '$lib/questions/grading';
	import { toDisplayInstance, unitKeysOf } from '$lib/questions/public-question';

	let { data }: { data: PageData } = $props();

	// State
	let testSession = $state<TestSession | null>(null);
	// « En classe » et « Entraînement » : chaque question porte sa durée et sa catégorie
	let seriesItems = $state<ClassroomItem[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let assignmentId = $state<string | null>(null);
	let assessmentTitle = $state<string | null>(null);
	// Lien de série sans forme (C19) : la fenêtre de choix s'ouvre sur ces catégories
	let pendingCategories = $state<CartItem[] | null>(null);
	let modeDialogOpen = $state(false);

	// Évaluation notée (chantier 5, ADR 0015) : le SERVEUR tire, corrige et note.
	// La page ne reçoit que des questions publiques ; la correction arrive à l'envoi.
	/** Tentative en cours (null : entraînement libre ou aperçu du prof) */
	let attemptId = $state<string | null>(null);
	/** Rang de chaque question affichée dans la tentative */
	let attemptPositions = $state<number[]>([]);
	/** Touches d'unités de chaque question (calculées par le serveur) */
	let attemptUnitKeys = $state<(string[] | undefined)[]>([]);
	let evaluationResult = $state<EvaluationSubmitResponse | null>(null);
	/** Copie prête à (ré)envoyer si l'envoi a échoué */
	let pendingSubmission = $state<{
		answers: Array<SubmittedAnswer & { position: number; timeSpent?: number }>;
		timeSpent: number;
	} | null>(null);
	let submitError = $state<string | null>(null);
	let isSubmitting = $state(false);

	/**
	 * Parse URL parameters and initialize test session
	 */
	async function initializeTest() {
		try {
			const launch = resolveTestLaunch(new URL(page.url).searchParams);

			if (launch.kind === 'error') {
				throw new Error(launch.message);
			}

			// Évaluation assignée : forme et temps limite viennent de l'ÉVALUATION,
			// le paramètre `mode` de l'URL est ignoré (B15). Jamais de flash-cards.
			if (launch.kind === 'assignment') {
				await startEvaluation(launch.assignmentId);
				return;
			}

			// Lien de série partagé, sans forme : l'élève (ou le visiteur) choisit
			if (launch.kind === 'choose-form') {
				pendingCategories = launch.categories;
				modeDialogOpen = true;
				isLoading = false;
				return;
			}

			startSeries(launch.mode, launch.categories, launch.timeLimit);
			isLoading = false;
		} catch (err) {
			console.error('Error initializing test:', err);
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			isLoading = false;
		}
	}

	/** Message d'erreur d'une réponse d'API (`error` ou `message`) */
	function errorMessageOf(body: unknown, fallback: string): string {
		if (body && typeof body === 'object') {
			if ('error' in body && typeof body.error === 'string') return body.error;
			if ('message' in body && typeof body.message === 'string') return body.message;
		}
		return fallback;
	}

	/**
	 * Ouvre une évaluation assignée : le serveur crée (ou reprend) la tentative et
	 * renvoie des questions SANS réponse (B6, B9). Aperçu du prof : questions
	 * générées ici, comme un entraînement libre, jamais rattachées.
	 */
	async function startEvaluation(id: string) {
		assignmentId = id;

		const response = await fetch(`/api/evaluations/assignments/${encodeURIComponent(id)}/start`, {
			method: 'POST'
		});
		const body: unknown = await response.json().catch(() => null);

		if (!response.ok) {
			throw new Error(errorMessageOf(body, "Impossible d'ouvrir l'évaluation"));
		}

		const start = body as EvaluationStartResponse;
		assessmentTitle = start.evaluation.title;
		const form = start.evaluation.form;

		if (start.preview) {
			// Aperçu : les modèles sont chargés seulement maintenant (la page d'un
			// élève en évaluation n'en reçoit aucun)
			if (questionTemplatesCache.isEmpty) await questionTemplatesCache.fetchTemplates();
			seriesItems = generateSeriesItems(start.evaluation.categories, { excludeCourseCards: true });
			testSession = {
				mode: form,
				categories: start.evaluation.categories,
				instances: seriesItems.map((item) => item.instance),
				userAnswers: new Map(),
				startTime: Date.now(),
				timeLimit: form === 'course' ? (start.evaluation.time_limit ?? undefined) : undefined,
				currentQuestionIndex: 0,
				isPaused: false
			};
			isLoading = false;
			return;
		}

		const { attempt } = start;
		attemptId = attempt.id;
		attemptPositions = attempt.questions.map((question) => question.position);
		attemptUnitKeys = attempt.questions.map(unitKeysOf);
		seriesItems = attempt.questions.map((question) => ({
			instance: toDisplayInstance(question),
			delaySeconds: question.delaySeconds,
			categoryKey: '',
			unitKeys: unitKeysOf(question)
		}));

		testSession = {
			mode: form,
			categories: [],
			instances: seriesItems.map((item) => item.instance),
			userAnswers: new Map(),
			startTime: Date.now(),
			// Course : le temps RESTANT de la tentative (reprise comprise, B9)
			timeLimit:
				form === 'course'
					? Math.max(1, attempt.remainingSeconds ?? start.evaluation.time_limit ?? 300)
					: undefined,
			currentQuestionIndex: 0,
			isPaused: false
		};

		if (attempt.resumed) {
			toaster.info('Tu reprends ta tentative en cours : mêmes questions, réponses à retaper.');
		}
		isLoading = false;
	}

	/**
	 * Lance une série libre (panier ou lien) sous la forme choisie
	 */
	function startSeries(mode: TestMode, categories: CartItem[], timeLimit?: number) {
		// Course aux nombres : pas de carte de cours (décision 2026-09-28)
		const items = generateSeriesItems(categories, { excludeCourseCards: mode === 'course' });
		const instances = items.map((item) => item.instance);
		// « En classe », « Entraînement » : chaque question garde sa durée et sa catégorie
		if (mode === 'display' || mode === 'interactive') seriesItems = items;

		testSession = {
			mode,
			categories,
			instances,
			userAnswers: new Map(),
			startTime: Date.now(),
			timeLimit,
			currentQuestionIndex: 0,
			isPaused: false
		};
	}

	/**
	 * Forme choisie dans la fenêtre (lien de série sans `mode`)
	 */
	function handleModeSelect(mode: TestMode, timeLimit?: number) {
		if (!pendingCategories) return;
		try {
			startSeries(mode, pendingCategories, timeLimit);
			modeDialogOpen = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			modeDialogOpen = false;
		}
	}

	function handleOpenModeDialog() {
		modeDialogOpen = true;
	}

	/**
	 * Questions d'une série, chacune avec sa durée et sa catégorie
	 * (`buildSeriesItems`) ; source des modèles : cache, sinon données serveur.
	 */
	function generateSeriesItems(
		categories: CartItem[],
		options: { excludeCourseCards?: boolean } = {}
	): ClassroomItem[] {
		const templates =
			questionTemplatesCache.templates.length > 0
				? questionTemplatesCache.templates
				: data.templates;

		// Aucun modèle du tout (hors ligne, sans cache) : échec explicite
		if (templates.length === 0) {
			throw new Error(
				'Aucun template disponible. Veuillez vous reconnecter à Internet et recharger la page.'
			);
		}
		return buildSeriesItems(categories, templates, options);
	}

	/**
	 * « En classe », « Entraînement » : Recommencer tire de nouvelles questions
	 * (évaluation : toujours sans carte de cours)
	 */
	function handleSeriesRestart() {
		if (!testSession) return;
		try {
			seriesItems = generateSeriesItems(testSession.categories, {
				excludeCourseCards: !!assignmentId
			});
			testSession.instances = seriesItems.map((item) => item.instance);
			testSession.startTime = Date.now();
		} catch (err) {
			// Hors ligne, cache vidé : dire pourquoi rien ne se passe
			toaster.error(
				err instanceof Error ? err.message : 'Impossible de tirer de nouvelles questions'
			);
		}
	}

	/**
	 * « Flash-cards » : Recommencer tire de nouvelles questions (cartes de cours comprises)
	 */
	function handleFlashRestart() {
		if (!testSession) return;
		try {
			testSession.instances = generateSeriesItems(testSession.categories).map(
				(item) => item.instance
			);
			testSession.startTime = Date.now();
		} catch (err) {
			toaster.error(
				err instanceof Error ? err.message : 'Impossible de tirer de nouvelles questions'
			);
		}
	}

	/**
	 * Handle back to cart
	 */
	function handleBackToCart() {
		goto('/automaths/panier').then(() => {});
	}

	/**
	 * Évaluation : on revient à « Mes évaluations », jamais au panier (une
	 * nouvelle tentative y repasse par la vérification des tentatives)
	 */
	function handleBack() {
		if (assignmentId) {
			goto('/dashboard/student/assessments').then(() => {});
		} else {
			handleBackToCart();
		}
	}

	/** Réponse d'une question, au format de l'envoi (le serveur corrige) */
	function toSubmittedAnswer(
		position: number,
		answer: TestAnswerResult | undefined
	): SubmittedAnswer & { position: number; timeSpent?: number } {
		const data = answer?.userAnswer;
		// Chrono écoulé sans rien taper : `value` vaut '' → question vide
		if (!data || data.value === '') return { position };
		const timeSpent = Math.max(0, Math.round(data.timeSpent ?? 0));
		const value = data.value;
		if (typeof value === 'number') return { position, choices: [value], timeSpent };
		if (Array.isArray(value) && value.every((v) => typeof v === 'number')) {
			return { position, choices: value as number[], timeSpent };
		}
		const values = Array.isArray(value) ? value.map(String) : [String(value)];
		return {
			position,
			values,
			...(data.valueLatex && { latex: data.valueLatex }),
			timeSpent
		};
	}

	/** Envoie la copie : le serveur corrige, note et renvoie la correction (C10) */
	async function submitEvaluation() {
		if (!attemptId || !pendingSubmission || isSubmitting) return;
		isSubmitting = true;
		submitError = null;
		try {
			const response = await fetch(
				`/api/evaluations/attempts/${encodeURIComponent(attemptId)}/submit`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(pendingSubmission)
				}
			);
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok) {
				submitError = errorMessageOf(body, "Ta copie n'a pas pu être envoyée.");
				return;
			}
			evaluationResult = body as EvaluationSubmitResponse;
			pendingSubmission = null;
		} catch {
			submitError = "Ta copie n'a pas pu être envoyée. Vérifie ta connexion et réessaie.";
		} finally {
			isSubmitting = false;
		}
	}

	function handleRetrySubmit() {
		submitEvaluation().then(() => {});
	}

	/**
	 * Handle test completion - save results to database
	 */
	async function handleTestComplete(result: TestResult) {
		// Évaluation notée : rien n'est corrigé ici, la copie part au serveur
		if (attemptId) {
			pendingSubmission = {
				answers: attemptPositions.map((position, index) =>
					toSubmittedAnswer(position, result.answers[index])
				),
				timeSpent: Math.max(0, Math.min(86_400, Math.round(result.timeSpent)))
			};
			await submitEvaluation();
			return;
		}
		// Visiteur non connecté : rien à enregistrer (l'API répondrait 401) ; les formes
		// Flash-cards et Entraînement l'annoncent à l'écran
		if (!data.user) return;
		// Save to database (interactive, course, et flash : même sauvegarde que l'Entraînement).
		// Aperçu d'une évaluation par le prof : enregistré comme un entraînement libre
		// (jamais d'assignation : une évaluation ne s'enregistre que par son envoi)
		if (result.mode === 'interactive' || result.mode === 'course' || result.mode === 'flash') {
			try {
				const response = await fetch('/api/tests/save', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						result,
						categories: testSession?.categories || []
					})
				});

				if (response.ok) {
					const data = await response.json();
					// Update result with session ID
					result.sessionId = data.sessionId;
				} else {
					console.error('Failed to save test results:', await response.text());
					// 401 = visiteur non connecté : rien à enregistrer, rien à signaler
					if (response.status !== 401) {
						toaster.error("Tes résultats n'ont pas pu être enregistrés.");
					}
				}
			} catch (error) {
				console.error('Error saving test results:', error);
				toaster.error("Tes résultats n'ont pas pu être enregistrés.");
			}
		}
	}

	// Initialize on mount
	onMount(async () => {
		// Évaluation assignée : aucun modèle n'est chargé (le serveur tire les
		// questions ; l'aperçu du prof les chargera lui-même)
		if (!new URL(page.url).searchParams.has('assignment')) {
			// Priority: server data > existing cache > API fetch (only if necessary)
			if (data.templates && data.templates.length > 0) {
				questionTemplatesCache.initializeFromServer(data.templates);
			}
			// Only fetch from API if cache is completely empty AND server didn't load data
			// This prevents fetch loops when offline
			else if (questionTemplatesCache.isEmpty && !questionTemplatesCache.error) {
				await questionTemplatesCache.fetchTemplates();
			}
		}

		// Initialize test after cache is ready
		await initializeTest();
	});
</script>

<svelte:head>
	<title>Test - Automaths | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	{#if isLoading}
		<!-- Loading state -->
		<Card.Root>
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<div class="mb-4 animate-spin text-primary">
						<svg
							class="mx-auto h-12 w-12"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
					<h2 class="text-xl font-semibold">Préparation du test...</h2>
					<p class="mt-2 text-sm text-muted-foreground">Génération des questions en cours</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if error}
		<!-- Error state -->
		<Card.Root class="border-destructive">
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<AlertCircle class="mx-auto mb-4 h-16 w-16 text-destructive" />
					<h2 class="text-xl font-semibold text-destructive">Erreur</h2>
					<p class="mt-2 text-sm text-muted-foreground">{error}</p>
					<Button onclick={handleBack} class="mt-6">
						{assignmentId ? 'Mes évaluations' : 'Retour au panier'}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if evaluationResult}
		<!-- Évaluation envoyée : correction, points et note du SERVEUR -->
		<EvaluationResults result={evaluationResult} title={assessmentTitle ?? undefined} />
	{:else if submitError}
		<Card.Root class="border-destructive">
			<Card.Content class="flex min-h-64 items-center justify-center p-12">
				<div class="text-center" role="alert">
					<AlertCircle class="mx-auto mb-4 h-12 w-12 text-destructive" />
					<p class="font-semibold">{submitError}</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Tes réponses sont gardées sur cette page tant que tu ne la quittes pas.
					</p>
					<div class="mt-6 flex justify-center gap-3">
						<Button onclick={handleRetrySubmit} disabled={isSubmitting}>Réessayer l'envoi</Button>
						<Button variant="outline" onclick={handleBack}>Mes évaluations</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if testSession}
		<!-- Test content -->
		{#if testSession.mode === 'display'}
			<!-- Forme « En classe » -->
			<ClassroomSeries
				items={seriesItems}
				onBack={handleBackToCart}
				onRestart={handleSeriesRestart}
			/>
		{:else if testSession.mode === 'interactive'}
			<!-- Forme « Entraînement » : nouvelles questions = nouveau composant -->
			{#key seriesItems}
				<TestInteractive
					items={seriesItems}
					isLoggedIn={!!data.user}
					onComplete={handleTestComplete}
					onRestart={handleSeriesRestart}
					onBack={handleBack}
					assessmentTitle={assignmentId ? assessmentTitle || undefined : undefined}
					inEvaluation={!!assignmentId}
					collectOnly={!!attemptId}
					showResults={!attemptId}
				/>
			{/key}
		{:else if testSession.mode === 'course'}
			<!-- Course mode -->
			<TestCourse
				session={testSession}
				onComplete={handleTestComplete}
				onBack={handleBack}
				inEvaluation={!!assignmentId}
				collectOnly={!!attemptId}
				showResults={!attemptId}
				unitKeys={attemptUnitKeys}
			/>
		{:else if testSession.mode === 'flash' && !assignmentId}
			<!-- Forme « Flash-cards » : nouvelles questions = nouveau composant -->
			{#key testSession.instances}
				<FlashSeries
					instances={testSession.instances}
					isLoggedIn={!!data.user}
					onComplete={handleTestComplete}
					onRestart={handleFlashRestart}
					onBack={handleBackToCart}
				/>
			{/key}
		{/if}
	{:else if pendingCategories}
		<!-- Lien de série sans forme : la fenêtre de choix a été fermée sans choisir -->
		<Card.Root>
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<h2 class="text-xl font-semibold">Comment veux-tu travailler cette série ?</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						{pendingCategories.length} catégorie{pendingCategories.length > 1 ? 's' : ''} de questions
					</p>
					<Button onclick={handleOpenModeDialog} class="mt-6">
						<Rocket class="mr-2 h-4 w-4" />
						Choisir la forme
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

{#if pendingCategories && !testSession}
	<TestModeDialog bind:open={modeDialogOpen} onSelect={handleModeSelect} />
{/if}
