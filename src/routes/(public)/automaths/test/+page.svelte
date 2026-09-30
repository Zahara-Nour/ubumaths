<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { buildSeriesItems } from '$lib/questions/series-items';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';
	import type { CartItem } from '$lib/stores/questionCart.svelte';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { ClassroomItem, TestMode, TestSession } from '$lib/types/test';
	import { AlertCircle } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	// Import test components
	import ClassroomSeries from '$lib/components/test/ClassroomSeries.svelte';
	import TestInteractive from '$lib/components/test/TestInteractive.svelte';
	import TestCourse from '$lib/components/test/TestCourse.svelte';
	import FlashSeries from '$lib/components/test/FlashSeries.svelte';
	import type { TestResult } from '$lib/types/test';

	let { data }: { data: PageData } = $props();

	// State
	let testSession = $state<TestSession | null>(null);
	// Forme « En classe » : chaque question porte sa durée et sa catégorie
	let classroomItems = $state<ClassroomItem[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let assignmentId = $state<string | null>(null);
	let assessmentTitle = $state<string | null>(null);

	/**
	 * Parse URL parameters and initialize test session
	 */
	async function initializeTest() {
		try {
			// Get URL params
			const url = new URL(page.url);
			const modeParam = url.searchParams.get('mode');
			const categoriesParam = url.searchParams.get('categories');
			const timeParam = url.searchParams.get('time');
			const assignmentParam = url.searchParams.get('assignment');

			// Handle assignment mode
			// Une évaluation assignée est TOUJOURS un Entraînement : le paramètre `mode`
			// est ignoré, jamais de forme flash (score auto-évalué) pour une évaluation.
			if (assignmentParam) {
				assignmentId = assignmentParam;

				// Validate assignment and get assessment data
				const validationResponse = await fetch(
					`/api/assessments/${assignmentId}/validate-attempt`,
					{
						method: 'POST'
					}
				);

				if (!validationResponse.ok) {
					throw new Error("Impossible de valider l'assignment");
				}

				const { validation } = await validationResponse.json();

				if (!validation.can_attempt) {
					throw new Error(validation.reason || 'Vous ne pouvez pas commencer cette évaluation');
				}

				// Get assessment details
				const assessmentResponse = await fetch(`/api/assessments/${assignmentId}`);
				if (!assessmentResponse.ok) {
					throw new Error("Impossible de charger l'évaluation");
				}

				const { assessment } = await assessmentResponse.json();
				assessmentTitle = assessment.title;

				// Use assessment categories and settings
				const categories = assessment.categories;
				const mode = 'interactive'; // Assessments are always interactive
				const timeLimit = assessment.settings.time_limit;

				// Generate instances from assessment categories
				// Évaluation notée : les cartes de cours (auto-évaluées) sont exclues
				const instances = await generateInstancesFromCategories(categories, {
					excludeCourseCards: true
				});

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

				isLoading = false;
				return;
			}

			// Normal test mode (non-assignment)
			// Validate mode
			if (!modeParam || !['display', 'interactive', 'course', 'flash'].includes(modeParam)) {
				throw new Error('Mode de test invalide');
			}
			const mode = modeParam as TestMode;

			// Decode and parse categories
			if (!categoriesParam) {
				throw new Error('Aucune catégorie spécifiée');
			}
			const categories: CartItem[] = JSON.parse(decodeURIComponent(categoriesParam));

			if (!categories || categories.length === 0) {
				throw new Error('Le panier est vide');
			}

			// Parse time limit (for course mode)
			const timeLimit = timeParam ? parseInt(timeParam, 10) : undefined;

			// Generate instances
			// Course aux nombres : pas de carte de cours (décision 2026-09-28)
			const items = generateSeriesItems(categories, { excludeCourseCards: mode === 'course' });
			const instances = items.map((item) => item.instance);
			// « En classe » : chaque question garde sa durée et sa catégorie
			if (mode === 'display') classroomItems = items;

			// Create test session
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

			isLoading = false;
		} catch (err) {
			console.error('Error initializing test:', err);
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			isLoading = false;
		}
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
	 * Instances seules (évaluation assignée : Entraînement forcé)
	 */
	async function generateInstancesFromCategories(
		categories: CartItem[],
		options: { excludeCourseCards?: boolean } = {}
	): Promise<QuestionInstance[]> {
		return generateSeriesItems(categories, options).map((item) => item.instance);
	}

	/**
	 * « En classe » : Recommencer tire de nouvelles questions
	 */
	function handleClassroomRestart() {
		if (!testSession) return;
		classroomItems = generateSeriesItems(testSession.categories);
	}

	/**
	 * « Flash-cards » : Recommencer tire de nouvelles questions (cartes de cours comprises)
	 */
	function handleFlashRestart() {
		if (!testSession) return;
		testSession.instances = generateSeriesItems(testSession.categories).map(
			(item) => item.instance
		);
		testSession.startTime = Date.now();
	}

	/**
	 * Handle back to cart
	 */
	function handleBackToCart() {
		goto('/automaths/panier').then(() => {});
	}

	/**
	 * Handle test completion - save results to database
	 */
	async function handleTestComplete(result: TestResult) {
		// Visiteur non connecté : rien à enregistrer (l'API répondrait 401) ; la forme
		// Flash-cards l'annonce à l'écran
		if (!data.user) return;
		// Save to database (interactive, course, et flash : même sauvegarde que l'Entraînement)
		if (result.mode === 'interactive' || result.mode === 'course' || result.mode === 'flash') {
			try {
				const response = await fetch('/api/tests/save', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						result,
						categories: testSession?.categories || [],
						// Une séance flash n'est jamais rattachée à une évaluation (refusé par l'API)
						assignmentId: result.mode === 'flash' ? undefined : assignmentId || undefined
					})
				});

				if (response.ok) {
					const data = await response.json();
					console.log('Test results saved with session ID:', data.sessionId);
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
		// Initialize cache with server-loaded templates (SSR support)
		// Priority: server data > existing cache > API fetch (only if necessary)

		// First: use server-loaded templates (from SSR)
		if (data.templates && data.templates.length > 0) {
			questionTemplatesCache.initializeFromServer(data.templates);
		}
		// Second: only fetch from API if cache is completely empty AND server didn't load data
		// This prevents fetch loops when offline
		else if (questionTemplatesCache.isEmpty && !questionTemplatesCache.error) {
			// Wait for fetch to complete before initializing test
			// This ensures templates are available (or error is set)
			await questionTemplatesCache.fetchTemplates();
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
					<Button onclick={handleBackToCart} class="mt-6">Retour au panier</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if testSession}
		<!-- Test content -->
		{#if testSession.mode === 'display'}
			<!-- Forme « En classe » -->
			<ClassroomSeries
				items={classroomItems}
				onBack={handleBackToCart}
				onRestart={handleClassroomRestart}
			/>
		{:else if testSession.mode === 'interactive'}
			<!-- Interactive mode -->
			<TestInteractive
				session={testSession}
				onComplete={handleTestComplete}
				onBack={handleBackToCart}
				assignmentId={assignmentId || undefined}
				assessmentTitle={assessmentTitle || undefined}
			/>
		{:else if testSession.mode === 'course'}
			<!-- Course mode -->
			<TestCourse session={testSession} onComplete={handleTestComplete} onBack={handleBackToCart} />
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
	{/if}
</div>
