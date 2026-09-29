<!--
	Question Preview Demo Page
	==========================

	Allows teachers/admins to test the QuestionDisplay component
	with real question instances generated from templates.

	Features:
	- Load question template by ID
	- Generate multiple instances (different seeds)
	- Test answer validation with QuestionDisplay
	- Toggle correction display
	- Switch between interactive/flashcard modes
-->

<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import AnswerAssumptionsNotice from '$lib/components/questions/AnswerAssumptionsNotice.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, RefreshCw, Loader2 } from '@lucide/svelte';

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
	let interactive = $state(true); // Interactive mode (answer validation)

	// Réponses attendues, lisibles : une ligne par trou, ou le(s) choix correct(s) d'un QCM
	let expectedAnswers = $derived.by(() => {
		if (!instance) return [];
		if (instance.blanks && instance.blanks.length > 0) {
			return instance.blanks.map((blank, index) => ({
				label: `Trou ${index + 1}`,
				value: blank.expectedAnswer
			}));
		}
		if (instance.correctChoiceIndex !== undefined) {
			const indexes = [instance.correctChoiceIndex].flat();
			return [{ label: 'Choix correct', value: indexes.join(', ') }];
		}
		return [];
	});

	// ===========================
	// LIFECYCLE
	// ===========================

	// Auto-generate instance when component mounts
	// `untrack` : l'effet ne dépend que du modèle affiché. Sans lui, il suivrait `seed`
	// (lue et écrite par generateInstance) et chaque nouvelle seed relancerait la génération.
	$effect(() => {
		if (templateId) {
			untrack(() => generateInstance());
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
	/** Seed à 6 chiffres au plus (0-999999) */
	function randomSeed(): number {
		return Math.floor(Math.random() * 1000000);
	}

	async function generateInstance(customSeed?: number) {
		isLoading = true;

		try {
			// Seed fournie, sinon celle du champ, sinon tirée ici : toute instance affichée
			// doit pouvoir être reproduite (la seed apparaît dans le débogage)
			const seedParam = customSeed ?? seed ?? randomSeed();
			seed = seedParam;

			// Call POST endpoint with seed in body
			const response = await fetch(`/api/questions/generate/${templateId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ seed: seedParam })
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
		generateInstance(randomSeed());
	}

	/**
	 * Handle answer submission from QuestionDisplay
	 *
	 * Called after QuestionDisplay validates the answer client-side.
	 * Shows a toast notification based on the validation result.
	 *
	 * @param answerData - Answer data with validation result from QuestionDisplay
	 */
	function handleAnswerSubmit(answerData: AnswerData) {
		if (answerData.isCorrect) {
			toaster.success('Excellente réponse ! 🎉');
		} else {
			toaster.error("Ce n'est pas la bonne réponse. Consultez la correction.");
		}
	}

	/**
	 * Navigate back to questions list page
	 */
	function handleBack() {
		goto('/dashboard/admin/questions').then(() => {});
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
			<Card.Description>Personnalisez l'instance et testez différents scénarios</Card.Description>
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
						<Button variant="outline" onclick={() => generateInstance()} disabled={isLoading}>
							{#if isLoading}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								Générer
							{/if}
						</Button>
					</div>
					<p class="text-xs text-muted-foreground">Même seed = même instance (reproductible)</p>
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
						<Label for="correction" class="cursor-pointer">Afficher la correction</Label>
						<Switch id="correction" bind:checked={showCorrection} />
					</div>

					<!-- Interactive Mode Toggle -->
					<div class="flex items-center justify-between space-x-2">
						<Label for="interactive" class="cursor-pointer">Mode interactif</Label>
						<Switch id="interactive" bind:checked={interactive} />
					</div>
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
		<AnswerAssumptionsNotice assumptions={instance.options?.answerAssumptions} />
		<FlashCard
			{interactive}
			{instance}
			onAnswerSubmit={handleAnswerSubmit}
			showCorrectionOnWrong={showCorrection}
			size="lg"
			maxAttempts={0}
		/>

		<!-- Debug Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">Informations de Débogage</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
					<dt class="text-muted-foreground">Seed</dt>
					<dd class="font-mono">{instance.seed ?? '—'}</dd>

					<dt class="text-muted-foreground">Type</dt>
					<dd class="font-mono">{getQuestionType(instance)}</dd>

					{#if instance.selectedVariationIndex !== undefined}
						<dt class="text-muted-foreground">Variation</dt>
						<dd class="font-mono">{instance.selectedVariationIndex + 1}</dd>
					{/if}

					<dt class="text-muted-foreground">Réponse attendue</dt>
					<dd>
						{#if expectedAnswers.length === 0}
							<span class="text-muted-foreground">—</span>
						{:else}
							<ul class="space-y-1">
								{#each expectedAnswers as answer (answer.label)}
									<li class="break-all">
										{#if expectedAnswers.length > 1 || answer.label === 'Choix correct'}
											<span class="text-muted-foreground">{answer.label} :</span>
										{/if}
										<code class="font-mono">{answer.value}</code>
									</li>
								{/each}
							</ul>
						{/if}
					</dd>
				</dl>

				{#if instance.resolvedVariables && instance.resolvedVariables.length > 0}
					<div class="border-t pt-3">
						<p class="mb-2 text-sm text-muted-foreground">Variables résolues</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 font-mono text-xs">
							{#each instance.resolvedVariables as variable (variable.name)}
								<dt>{variable.name}</dt>
								<dd class="break-all">
									= {variable.value}
									{#if variable.displayValue && variable.displayValue !== variable.value}
										<span class="text-muted-foreground">(affiché : {variable.displayValue})</span>
									{/if}
								</dd>
							{/each}
						</dl>
					</div>
				{/if}
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
