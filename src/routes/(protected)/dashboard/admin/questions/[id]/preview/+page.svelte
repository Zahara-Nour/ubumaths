<!--
	Question Preview Demo Page
	==========================

	Allows teachers/admins to test the QuestionDisplay component
	with real question instances generated from templates.

	Features:
	- Load question template by ID
	- Generate multiple instances (different seeds)
	- Test answer submission with mock validation
	- Toggle correction display
	- Test timer functionality
	- Switch between student/readonly modes
-->

<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { QuestionInstance } from '$lib/questions/types';
	import QuestionDisplay from '$lib/components/questions/QuestionDisplay.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-svelte';

	// ===========================
	// PROPS & DERIVED STATE
	// ===========================

	// Get template ID from URL params (/dashboard/admin/questions/[id]/preview)
	const templateId = $derived(page.params.id);

	// ===========================
	// STATE MANAGEMENT
	// ===========================

	// Generated question instance (null until first generation)
	let instance = $state<QuestionInstance | null>(null);

	// Generation state
	let isLoading = $state(false); // True during API call

	// Generation options
	let seed = $state<number | undefined>(undefined); // Optional seed for reproducibility

	// Display options
	let showCorrection = $state(false); // Show correction on wrong answer
	let readonly = $state(false); // Display-only mode (no interaction)
	let enableTimer = $state(false); // Enable countdown timer
	let timerSeconds = $state(60); // Timer duration (10-600 seconds)

	// ===========================
	// LIFECYCLE
	// ===========================

	// Auto-generate instance when component mounts
	$effect(() => {
		if (templateId) {
			generateInstance();
		}
	});

	// ===========================
	// EVENT HANDLERS
	// ===========================

	/**
	 * Generate a new question instance from the template
	 *
	 * Calls the API endpoint /api/questions/generate/[id] with optional seed parameter.
	 * Updates instance state on success, shows error toast on failure.
	 *
	 * @param customSeed - Optional seed override (used by regenerate button)
	 */
	async function generateInstance(customSeed?: number) {
		isLoading = true;

		try {
			// Use custom seed if provided, otherwise use state seed
			const seedParam = customSeed !== undefined ? customSeed : seed;

			// Call POST endpoint with seed in body
			const response = await fetch(`/api/questions/generate/${templateId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(seedParam !== undefined ? { seed: seedParam } : {})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				instance = result.instance;
				toaster.success('Instance générée avec succès');
			} else {
				toaster.error(result.errors?.join(', ') || 'Erreur lors de la génération');
				instance = null;
			}
		} catch (error) {
			console.error('Generation error:', error);
			toaster.error('Erreur réseau lors de la génération');
			instance = null;
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Regenerate with a random seed
	 *
	 * Generates a random 6-digit seed, updates state, and regenerates instance.
	 * This allows testing variability while maintaining reproducibility.
	 */
	function handleRegenerate() {
		const randomSeed = Math.floor(Math.random() * 1000000); // 0-999999
		seed = randomSeed; // Update seed input for display
		generateInstance(randomSeed);
	}

	/**
	 * Mock answer validation (for testing only)
	 *
	 * Simulates server-side answer validation with 500ms delay.
	 * Uses simple comparison logic - REAL validation should be server-side!
	 *
	 * TODO: Replace with actual server-side validation endpoint
	 *
	 * @param answer - Student's submitted answer (type varies by question)
	 * @returns Validation result with correct boolean and optional feedback
	 */
	async function handleSubmit(answer: any): Promise<{ correct: boolean; feedback?: string }> {
		// Simulate server delay (realistic network latency)
		await new Promise((resolve) => setTimeout(resolve, 500));

		if (!instance) {
			return { correct: false, feedback: 'Instance introuvable' };
		}

		// Simple validation (real validation would be on server)
		const isCorrect = checkAnswer(answer, instance.answer);

		return {
			correct: isCorrect,
			feedback: isCorrect
				? 'Excellente réponse ! 🎉'
				: 'Ce n\'est pas la bonne réponse. Consultez la correction.'
		};
	}

	/**
	 * Basic answer checking (mock - real validation on server)
	 *
	 * Simple comparison logic for testing purposes only.
	 * Real validation should handle:
	 * - Numerical precision/tolerance
	 * - Algebraic equivalence (e.g., "2x+4" vs "2(x+2)")
	 * - Partial credit
	 * - Case sensitivity settings
	 *
	 * @param studentAnswer - Student's submitted answer
	 * @param correctAnswer - Expected correct answer from instance
	 * @returns true if answers match, false otherwise
	 */
	function checkAnswer(studentAnswer: any, correctAnswer: any): boolean {
		// Numerical answers - parse and compare
		if (typeof correctAnswer === 'number') {
			return parseFloat(studentAnswer) === correctAnswer;
		}

		// String answers (algebraic, text) - case-insensitive comparison
		if (typeof correctAnswer === 'string') {
			return studentAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
		}

		// Array answers (fill-in-blanks, multiple choice) - compare each element
		if (Array.isArray(correctAnswer)) {
			if (!Array.isArray(studentAnswer)) return false;
			if (correctAnswer.length !== studentAnswer.length) return false;

			// Check each element
			return correctAnswer.every((ans, i) => {
				if (typeof ans === 'number') {
					return parseFloat(studentAnswer[i]) === ans;
				}
				return studentAnswer[i]?.trim().toLowerCase() === ans?.toLowerCase();
			});
		}

		return false;
	}

	/**
	 * Navigate back to questions list page
	 */
	function handleBack() {
		goto('/dashboard/admin/questions');
	}
</script>

<!--
═══════════════════════════════════════════════════════════════════════════════
TEMPLATE - PAGE LAYOUT
═══════════════════════════════════════════════════════════════════════════════
-->

<div class="container mx-auto max-w-5xl space-y-6 py-8">
	<!-- ========== PAGE HEADER ========== -->
	<div class="flex items-center justify-between">
		<div class="space-y-1">
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="sm" onclick={handleBack}>
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<h1 class="text-3xl font-bold">Aperçu de la Question</h1>
			</div>
			<p class="text-muted-foreground">
				Testez l'affichage et la validation des réponses avec des instances réelles
			</p>
		</div>

		<Badge variant="outline" class="text-sm">
			Template ID: {templateId}
		</Badge>
	</div>

	<!-- ========== CONTROLS CARD: Generation & Display Options ========== -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Paramètres de Test</Card.Title>
			<Card.Description>
				Personnalisez l'instance et testez différents scénarios
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<!-- Generation Controls: Seed input and regenerate buttons -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="seed">Seed (optionnel)</Label>
					<div class="flex gap-2">
						<Input
							id="seed"
							type="number"
							bind:value={seed}
							placeholder="Aléatoire"
							class="flex-1"
						/>
						<Button
							variant="outline"
							onclick={() => generateInstance()}
							disabled={isLoading}
						>
							{#if isLoading}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								Générer
							{/if}
						</Button>
					</div>
					<p class="text-xs text-muted-foreground">
						Même seed = même instance (reproductible)
					</p>
				</div>

				<div class="flex items-end">
					<Button onclick={handleRegenerate} disabled={isLoading} class="w-full">
						<RefreshCw class="mr-2 h-4 w-4" />
						Régénérer (seed aléatoire)
					</Button>
				</div>
			</div>

			<!-- Display Options -->
			<div class="space-y-4 border-t pt-4">
				<h3 class="font-semibold">Options d'Affichage</h3>

				<div class="grid gap-4 md:grid-cols-2">
					<!-- Show Correction Toggle -->
					<div class="flex items-center justify-between space-x-2">
						<Label for="correction" class="cursor-pointer">
							Afficher la correction
						</Label>
						<Switch id="correction" bind:checked={showCorrection} />
					</div>

					<!-- Readonly Mode Toggle -->
					<div class="flex items-center justify-between space-x-2">
						<Label for="readonly" class="cursor-pointer">
							Mode lecture seule
						</Label>
						<Switch id="readonly" bind:checked={readonly} />
					</div>
				</div>

				<!-- Timer Options -->
				<div class="space-y-3">
					<div class="flex items-center justify-between space-x-2">
						<Label for="timer" class="cursor-pointer">
							Activer le timer
						</Label>
						<Switch id="timer" bind:checked={enableTimer} />
					</div>

					{#if enableTimer}
						<div class="space-y-2">
							<Label for="timer-seconds">Durée (secondes)</Label>
							<Input
								id="timer-seconds"
								type="number"
								bind:value={timerSeconds}
								min={10}
								max={600}
								class="max-w-xs"
							/>
						</div>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Question Display -->
	{#if isLoading}
		<Card.Root>
			<Card.Content class="flex items-center justify-center py-12">
				<div class="text-center">
					<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
					<p class="mt-4 text-muted-foreground">Génération de l'instance...</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if instance}
		<QuestionDisplay
			{instance}
			onSubmit={handleSubmit}
			{showCorrection}
			{readonly}
			timer={enableTimer ? timerSeconds : undefined}
		/>

		<!-- Debug Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">Informations de Débogage</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<div class="grid gap-2 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Type:</span>
						<code>{instance.type}</code>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Réponse attendue:</span>
						<code class="max-w-md truncate">
							{JSON.stringify(instance.answer)}
						</code>
					</div>
					{#if instance.resolvedVariables && Object.keys(instance.resolvedVariables).length > 0}
						<div class="border-t pt-2">
							<span class="text-muted-foreground">Variables résolues:</span>
							<div class="mt-1 space-y-1">
								{#each Object.entries(instance.resolvedVariables) as [name, value]}
									<div class="flex justify-between font-mono text-xs">
										<span>{name}:</span>
										<span>{value}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				<p>Aucune instance générée</p>
				<p class="text-sm">Cliquez sur "Générer" pour créer une instance</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
