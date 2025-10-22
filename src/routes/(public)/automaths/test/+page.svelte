<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import type { PageData } from './$types';
	import type { CartItem } from '$lib/stores/questionCart.svelte';
	import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
	import type { TestMode, TestSession } from '$lib/types/test';
	import { AlertCircle } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	// Import test components
	import TestDisplay from '$lib/components/test/TestDisplay.svelte';
	import TestInteractive from '$lib/components/test/TestInteractive.svelte';
	import TestCourse from '$lib/components/test/TestCourse.svelte';
	import type { TestResult } from '$lib/types/test';

	let { data }: { data: PageData } = $props();

	// State
	let testSession = $state<TestSession | null>(null);
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
			if (assignmentParam) {
				assignmentId = assignmentParam;

				// Validate assignment and get assessment data
				const validationResponse = await fetch(`/api/assessments/${assignmentId}/validate-attempt`, {
					method: 'POST'
				});

				if (!validationResponse.ok) {
					throw new Error('Impossible de valider l\'assignment');
				}

				const { validation } = await validationResponse.json();

				if (!validation.can_attempt) {
					throw new Error(validation.reason || 'Vous ne pouvez pas commencer cette évaluation');
				}

				// Get assessment details
				const assessmentResponse = await fetch(`/api/assessments/${assignmentId}`);
				if (!assessmentResponse.ok) {
					throw new Error('Impossible de charger l\'évaluation');
				}

				const { assessment } = await assessmentResponse.json();
				assessmentTitle = assessment.title;

				// Use assessment categories and settings
				const categories = assessment.categories;
				const mode = 'interactive'; // Assessments are always interactive
				const timeLimit = assessment.settings.time_limit;

				// Generate instances from assessment categories
				const instances = await generateInstancesFromCategories(categories);

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
			if (!modeParam || !['display', 'interactive', 'course'].includes(modeParam)) {
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
			const instances = await generateInstancesFromCategories(categories);

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
	 * Generate instances from categories
	 */
	async function generateInstancesFromCategories(categories: CartItem[]): Promise<QuestionInstance[]> {
		const instances: QuestionInstance[] = [];

		for (const cartItem of categories) {
				// Find matching templates from cache (or fallback to data.templates)
				const usingCache = questionTemplatesCache.templates.length > 0;
				const templates = usingCache ? questionTemplatesCache.templates : data.templates;

				// If we have no templates at all (offline + no cache), fail early
				if (templates.length === 0) {
					throw new Error(
						'Aucun template disponible. Veuillez vous reconnecter à Internet et recharger la page.'
					);
				}

				const matchingTemplates = templates.filter(
					(t) =>
						t.theme === cartItem.category.theme &&
						t.domain === cartItem.category.domain &&
						(t.subdomain || null) === cartItem.category.subdomain &&
						t.level === cartItem.category.level
				);

				if (matchingTemplates.length === 0) {
					console.warn(
						`No templates found for category: ${cartItem.category.theme}/${cartItem.category.domain}/${cartItem.category.subdomain || 'null'} (level ${cartItem.category.level})`
					);
					console.warn(`Available templates count: ${templates.length}`);
					console.warn(
						`Searching in:`,
						templates.map((t) => `${t.theme}/${t.domain}/${t.subdomain || 'null'} (L${t.level})`)
					);
					continue;
				}

				// Log success when templates are found
				console.log(
					`✓ Found ${matchingTemplates.length} template(s) for ${cartItem.category.theme}/${cartItem.category.domain}/${cartItem.category.subdomain || 'null'} (level ${cartItem.category.level}) - Source: ${usingCache ? 'cache' : 'server data'}`
				);

				// Generate required quantity of instances
				for (let i = 0; i < cartItem.quantity; i++) {
					// Randomly select a template
					const randomTemplate =
						matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)];

					// Generate instance
					const result = generateInstance(randomTemplate);

					if (result.success && result.instance) {
						instances.push(result.instance);
					} else {
						console.error(
							`Failed to generate instance for template ${randomTemplate.id}:`,
							'errors' in result ? result.errors : 'Unknown error'
						);
					}
				}
			}
		}

		return instances;
	}

	/**
	 * Handle back to cart
	 */
	function handleBackToCart() {
		goto('/automaths/panier');
	}

	/**
	 * Handle test completion - save results to database
	 */
	async function handleTestComplete(result: TestResult) {
		// Save to database (only for interactive and course modes)
		if (result.mode === 'interactive' || result.mode === 'course') {
			try {
				const response = await fetch('/api/tests/save', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						result,
						categories: testSession?.categories || [],
						assignmentId: assignmentId || undefined
					})
				});

				if (response.ok) {
					const data = await response.json();
					console.log('Test results saved with session ID:', data.sessionId);
					// Update result with session ID
					result.sessionId = data.sessionId;
				} else {
					console.error('Failed to save test results:', await response.text());
				}
			} catch (error) {
				console.error('Error saving test results:', error);
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
	<title>Test - Automaths | UbuMaths</title>
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
			<!-- Display mode -->
			<TestDisplay session={testSession} onBack={handleBackToCart} />
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
		{/if}
	{/if}
</div>
