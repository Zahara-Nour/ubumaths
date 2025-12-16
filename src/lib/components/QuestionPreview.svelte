<!--
	Question Preview Component
	==========================

	Live preview of generated question instances.

	FEATURES:
	- Generate instance from template on demand
	- Show generated statement, answer, choices
	- Display validation errors
	- Regenerate button with different seed
	- MathLive rendering for LaTeX

	PROPS:
	- template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
-->

<script lang="ts">
	import type { QuestionTemplate, QuestionInstance } from '$lib/questions/types';
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { AlertCircle, RefreshCw, Check, X } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { MarkdownRenderer } from '$lib/components/markdown';

	interface Props {
		template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
	}

	let { template }: Props = $props();

	let instance = $state<QuestionInstance | null>(null);
	let errors = $state<string[]>([]);
	let isGenerating = $state(false);
	let seed = $state(Math.floor(Math.random() * 1000000));
	let mathLiveLoaded = $state(false);
	let selectedVariationIndex = $state<number | 'random'>(0);

	// Build correction markdown from ResolvedCorrection object
	const correctionMarkdown = $derived.by(() => {
		if (!instance?.correction) return '';
		const parts: string[] = [];
		if (instance.correction.steps && instance.correction.steps.length > 0) {
			parts.push(...instance.correction.steps);
		}
		if (instance.correction.feedback?.correct) {
			parts.push(instance.correction.feedback.correct);
		}
		return parts.join('\n\n');
	});

	// FlashCard configuration
	let interactive = $state<boolean>(true);
	let displaySize = $state<'sm' | 'md' | 'lg'>('md');
	let showCorrectionOnWrong = $state(false);

	// Derived: Number of variations in template
	let variationCount = $derived(template.variations?.length || 1);

	// Generate instance
	function generate() {
		isGenerating = true;
		errors = [];
		instance = null;

		// Small delay for visual feedback
		setTimeout(() => {
			try {
				// Calculate effective seed based on variation selection
				let effectiveSeed = seed;
				if (selectedVariationIndex !== 'random' && variationCount > 1) {
					// Use seed that guarantees this specific variation will be selected
					// Formula: seed = variationIndex + (variationCount * N) for any N
					effectiveSeed =
						selectedVariationIndex + variationCount * Math.floor(seed / variationCount);
				}

				const result = generateInstance(template as QuestionTemplate, effectiveSeed);

				if (result.success) {
					instance = result.instance;
				} else {
					errors = result.errors;
				}
			} catch (error) {
				errors = [error instanceof Error ? error.message : 'Erreur de génération'];
			} finally {
				isGenerating = false;
			}
		}, 100);
	}

	// Regenerate with new seed
	function regenerate() {
		seed = Math.floor(Math.random() * 1000000);
		generate();
	}

	// Handle variation selection change
	function handleVariationChange(value: string) {
		if (value === 'random') {
			selectedVariationIndex = 'random';
		} else {
			selectedVariationIndex = parseInt(value);
		}
		generate();
	}

	// Render LaTeX with MathLive
	function renderLatex(_element: HTMLElement) {
		if (typeof window !== 'undefined' && window.MathfieldElement && mathLiveLoaded) {
			// Use MathLive's renderMathInElement if available
			// For now, just display raw LaTeX
			// TODO: Integrate MathLive rendering
		}
	}

	// Auto-generate on mount and template change
	$effect(() => {
		// Track template changes by accessing it
		void template;
		generate();
	});

	// Load MathLive
	onMount(() => {
		// Check if MathLive is available
		if (typeof window !== 'undefined' && window.MathfieldElement) {
			mathLiveLoaded = true;
		}
	});

	// Format variable value for display
	function formatVariableValue(value: unknown): string {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return String(value);
		if (typeof value === 'boolean') return String(value);
		if (Array.isArray(value)) return JSON.stringify(value);
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	}
</script>

@ <Card.Root>
	<Card.Header>
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Aperçu de la question</Card.Title>
					<Card.Description>
						Instance générée avec graine : <code class="rounded bg-muted px-1">{seed}</code>
					</Card.Description>
				</div>
				<Button onclick={regenerate} disabled={isGenerating} class="gap-2">
					<RefreshCw class="h-4 w-4" />
					Régénérer
				</Button>
			</div>

			<!-- Variation Selector (only show if multiple variations) -->
			{#if variationCount > 1}
				<div class="flex items-center gap-4">
					<Label for="variation-select" class="text-sm font-medium">
						Variation à prévisualiser:
					</Label>
					<select
						id="variation-select"
						value={selectedVariationIndex === 'random' ? 'random' : String(selectedVariationIndex)}
						onchange={(e) => handleVariationChange(e.currentTarget.value)}
						class="flex h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						<option value="random">Aléatoire (selon la graine)</option>
						{#each Array(variationCount) as _, index (index)}
							<option value={String(index)}>Variation {index + 1}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>
	</Card.Header>
	<Card.Content>
		{#if isGenerating}
			<div class="flex items-center justify-center py-8">
				<div class="flex items-center gap-3 text-muted-foreground">
					<RefreshCw class="h-5 w-5 animate-spin" />
					<span>Génération en cours...</span>
				</div>
			</div>
		{:else if errors.length > 0}
			<div class="space-y-3">
				<div class="flex items-center gap-2 text-destructive">
					<AlertCircle class="h-5 w-5" />
					<span class="font-semibold">Erreurs de génération</span>
				</div>
				<ul class="space-y-1">
					{#each errors as error, i (i)}
						<li class="flex items-start gap-2 text-sm text-destructive">
							<X class="mt-0.5 h-4 w-4 flex-shrink-0" />
							<span>{error}</span>
						</li>
					{/each}
				</ul>
			</div>
		{:else if instance}
			<div class="space-y-6">
				<!-- Success indicator with variation info -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-green-600">
						<Check class="h-5 w-5" />
						<span class="font-semibold">Instance générée avec succès</span>
					</div>
					{#if instance.selectedVariationIndex !== undefined && variationCount > 1}
						<Badge variant="secondary" class="gap-1">
							Variation {instance.selectedVariationIndex + 1} / {variationCount}
						</Badge>
					{/if}
				</div>

				<!-- FlashCard Configuration -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">Configuration de l'aperçu visuel</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-4">
							<!-- Mode -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Mode</Label>
								<div class="flex gap-2">
									<Button
										type="button"
										variant={!interactive ? 'default' : 'outline'}
										onclick={() => (interactive = false)}
										size="sm"
										class="flex-1"
									>
										Lecture seule
									</Button>
									<Button
										type="button"
										variant={interactive ? 'default' : 'outline'}
										onclick={() => (interactive = true)}
										size="sm"
										class="flex-1"
									>
										Interactive
									</Button>
								</div>
							</div>

							<!-- Size -->
							<div class="space-y-2">
								<Label for="display-size" class="text-sm font-medium">Taille</Label>
								<select
									id="display-size"
									bind:value={displaySize}
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									<option value="sm">Petite</option>
									<option value="md">Moyenne</option>
									<option value="lg">Grande</option>
								</select>
							</div>

							<!-- Options -->
							<div class="space-y-2">
								<Label class="text-sm font-medium">Options</Label>
								<div class="space-y-1">
									<label class="flex items-center gap-2 text-sm">
										<input type="checkbox" bind:checked={showCorrectionOnWrong} class="rounded" />
										Afficher correction si faux
									</label>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Visual Preview with FlashCard -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-base">Aperçu visuel (tel que vu par l'étudiant)</Card.Title>
					</Card.Header>
					<Card.Content>
						<FlashCard
							{interactive}
							{instance}
							size={displaySize}
							{showCorrectionOnWrong}
							maxAttempts={0}
						/>
					</Card.Content>
				</Card.Root>

				<!-- Technical Details Separator -->
				<div class="flex items-center gap-2">
					<div class="h-px flex-1 bg-border"></div>
					<Badge variant="outline">Détails techniques</Badge>
					<div class="h-px flex-1 bg-border"></div>
				</div>

				<!-- Statement -->
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<Badge variant="outline">Énoncé</Badge>
						<Badge>{template.type}</Badge>
					</div>
					<div class="rounded-lg border bg-card p-4" use:renderLatex>
						<MarkdownRenderer content={instance.statement} />
					</div>
				</div>

				<!-- Variables (if any) -->
				{#if instance.resolvedVariables && Object.keys(instance.resolvedVariables).length > 0}
					<div class="space-y-2">
						<Badge variant="outline">Variables résolues</Badge>
						<div class="grid gap-2 md:grid-cols-2">
							{#each Object.entries(instance.resolvedVariables) as [name, value] (name)}
								<div class="flex items-start gap-2 rounded border bg-muted/50 p-2 text-sm">
									<code class="flex-shrink-0 font-semibold">{name}:</code>
									<code class="break-all">{formatVariableValue(value)}</code>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Answer -->
				<div class="space-y-2">
					<Badge variant="outline">Réponse</Badge>
					<div class="rounded border bg-green-50 p-3 dark:bg-green-950/20">
						{#if Array.isArray(instance.solution)}
							<ul class="space-y-1">
								{#each instance.solution as ans, i (i)}
									<li class="flex items-center gap-2">
										<Badge class="bg-green-600">{i + 1}</Badge>
										<code class="font-mono">{ans}</code>
									</li>
								{/each}
							</ul>
						{:else}
							<code class="font-mono text-lg">{instance.solution}</code>
						{/if}
					</div>
				</div>

				<!-- Choices (for QCM) -->
				{#if instance.shuffledChoices && instance.shuffledChoices.length > 0}
					<div class="space-y-2">
						<Badge variant="outline">Choix (mélangés)</Badge>
						<div class="space-y-2">
							{#each instance.shuffledChoices as choice, i (i)}
								{@const isCorrect =
									(typeof instance.solution === 'string' && instance.solution === String(i)) ||
									(Array.isArray(instance.solution) && instance.solution.includes(String(i)))}
								<div
									class="flex items-center gap-3 rounded border p-3 {isCorrect
										? 'border-green-500 bg-green-50 dark:bg-green-950/20'
										: 'bg-card'}"
								>
									<Badge variant={isCorrect ? 'default' : 'outline'}>
										{String.fromCharCode(65 + i)}
									</Badge>
									<code class="flex-1 font-mono">{choice}</code>
									{#if isCorrect}
										<Check class="h-5 w-5 text-green-600" />
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Correction (if any) -->
				{#if correctionMarkdown}
					<div class="space-y-2">
						<Badge variant="outline">Correction</Badge>
						<div class="rounded-lg border bg-muted/50 p-4 text-sm">
							<MarkdownRenderer content={correctionMarkdown} />
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex items-center justify-center py-8 text-muted-foreground">
				<p>Remplissez le formulaire pour voir un aperçu</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
