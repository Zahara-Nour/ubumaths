<script lang="ts">
	/**
	 * QuestionCompareView Component
	 * ==============================
	 *
	 * Side-by-side comparison of old vs transformed question formats.
	 *
	 * Features:
	 * - Two-column layout (responsive: stacks on mobile)
	 * - JSON syntax highlighting for complex data
	 * - Tabbed variation view with instance generation
	 * - Warnings section (amber/yellow)
	 * - Errors section (red)
	 * - Approve/Reject actions
	 * - Dark mode support
	 */

	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import ReviewActions from './ReviewActions.svelte';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { resolveVariables, resolveExpression, resolveSolution } from '$lib/questions';
	import type {
		QuestionVariable,
		ResolvedVariable,
		QuestionCorrection
	} from '$lib/questions/types';

	interface Props {
		original: Record<string, unknown>; // Old question format
		transformed: Record<string, unknown> | null; // New format (null if transformation failed)
		warnings: string[];
		errors: string[];
		onApprove?: () => void;
		onReject?: (reason: string) => void;
		class?: string;
	}

	let {
		original,
		transformed,
		warnings,
		errors,
		onApprove,
		onReject,
		class: className
	}: Props = $props();

	// Status indicators
	const hasErrors = $derived(errors.length > 0);
	const hasWarnings = $derived(warnings.length > 0);
	const isClean = $derived(!hasErrors && !hasWarnings);

	/**
	 * Format a value for display
	 */
	function formatValue(value: unknown): string {
		if (value === null || value === undefined) {
			return 'null';
		}
		if (typeof value === 'string') {
			return value;
		}
		if (Array.isArray(value) || typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	// Type for old format choices
	interface OldChoice {
		text?: string;
		image?: string;
		imageBase64?: string;
	}

	/**
	 * Check if this is a QCM (has choices)
	 */
	const isQCM = $derived(
		Array.isArray(original.choicess) && (original.choicess as OldChoice[][]).length > 0
	);

	/**
	 * Get the text of correct choices for a variation
	 */
	function getCorrectChoicesText(
		variationIndex: number,
		solutionIndices: (string | number)[],
		choicess: OldChoice[][]
	): string[] {
		// Handle shared choices (1 array for all variations)
		const choicesForVariation = choicess.length === 1 ? choicess[0] : choicess[variationIndex];
		if (!choicesForVariation) return [];

		return solutionIndices.map((idx) => {
			const index = typeof idx === 'string' ? parseInt(idx, 10) : idx;
			const choice = choicesForVariation[index];
			if (!choice) return `[index ${index} invalide]`;
			return choice.text || choice.image || '[image]';
		});
	}

	/**
	 * Extract key fields from old format
	 */
	const oldFields = $derived({
		description: original.description || '',
		subdescription: original.subdescription || '',
		enounces: original.enounces || [],
		variabless: original.variabless || [],
		solutionss: original.solutionss || [],
		options: original.options || [],
		choicess: original.choicess || [],
		grade: original.grade || ''
	});

	/**
	 * Extract key fields from new format
	 */
	const newFields = $derived(
		transformed
			? {
					type: (transformed.type as string) || '',
					title: (transformed.title as string) || '',
					variations: (transformed.variations as unknown[]) || [],
					shared: transformed.shared as
						| {
								variables?: QuestionVariable[];
								choices?: Array<{ content: string; isCorrect: boolean }>;
						  }
						| undefined,
					grades: (transformed.grades as string[]) || [],
					theme: (transformed.theme as string) || '',
					domain: (transformed.domain as string) || '',
					level: transformed.level as number | null,
					status: (transformed.status as string) || '',
					delay: transformed.delay as number | null
				}
			: null
	);

	// Variation tab state
	let selectedVariationIndex = $state(0);
	let instanceSeed = $state(Date.now());

	function regenerateInstance() {
		instanceSeed = Date.now();
	}

	// Type for variation from migration export
	interface MigrationVariation {
		statement?: string;
		variables?: QuestionVariable[];
		solution?: string | string[];
		correction?: QuestionCorrection;
		choices?: Array<{ content: string; isCorrect: boolean }>;
		blanks?: Array<{ position: number; expectedAnswer: string }>;
	}

	// Resolved instance type
	interface ResolvedInstance {
		statement: string;
		solution: string | string[];
		correction: { feedback: string; steps: string[] } | null;
		choices: Array<{ content: string; isCorrect: boolean }> | null;
		blanks: Array<{ position: number; expectedAnswer: string }> | null;
		variables: ResolvedVariable[];
		error?: string;
	}

	/**
	 * Resolve correction placeholders
	 */
	function resolveCorrection(
		correction: QuestionCorrection | undefined,
		resolved: ResolvedVariable[],
		seed: number
	): { feedback: string; steps: string[] } | null {
		if (!correction) return null;
		try {
			const feedback = correction.feedback
				? resolveExpression(correction.feedback, resolved, seed)
				: '';
			const steps = correction.steps
				? correction.steps.map((step) => {
						if (typeof step === 'string') {
							return resolveExpression(step, resolved, seed);
						}
						return resolveExpression(String(step), resolved, seed);
					})
				: [];
			return { feedback, steps };
		} catch {
			return null;
		}
	}

	/**
	 * Generate a resolved instance from a variation
	 */
	const resolvedInstance = $derived.by((): ResolvedInstance | null => {
		if (!newFields?.variations?.length) return null;

		const variation = newFields.variations[selectedVariationIndex] as MigrationVariation;
		if (!variation) return null;

		try {
			// Merge shared variables with variation-specific variables
			const sharedVars = newFields.shared?.variables || [];
			const variationVars = variation.variables || [];
			const allVariables = [...sharedVars, ...variationVars];

			// Resolve variables
			const resolved = resolveVariables(allVariables, instanceSeed);

			// Resolve statement
			const statement = variation.statement
				? resolveExpression(variation.statement, resolved, instanceSeed)
				: '';

			// Resolve solution (expected answer)
			const solution = variation.solution
				? resolveSolution(variation.solution, resolved, instanceSeed)
				: '';

			// Resolve correction
			const correction = resolveCorrection(variation.correction, resolved, instanceSeed);

			// Resolve choices (variation overrides shared)
			// For QCM, isCorrect is determined by comparing index with evaluated solution
			const rawChoices = variation.choices || newFields.shared?.choices;
			const correctIndices = Array.isArray(solution)
				? solution.map((s) => parseInt(String(s), 10))
				: [parseInt(String(solution), 10)];

			const choices = rawChoices
				? rawChoices.map((c, index) => ({
						content: resolveExpression(c.content, resolved, instanceSeed),
						isCorrect: correctIndices.includes(index)
					}))
				: null;

			// Keep blanks as-is (expectedAnswer already resolved in solution)
			const blanks = variation.blanks || null;

			return {
				statement,
				solution,
				correction,
				choices,
				blanks,
				variables: resolved
			};
		} catch (e) {
			return {
				statement: '',
				solution: '',
				correction: null,
				choices: null,
				blanks: null,
				variables: [],
				error: e instanceof Error ? e.message : String(e)
			};
		}
	});
</script>

<div class={cn('space-y-6', className)}>
	<!-- Comparison Grid - 4 columns -->
	<div class="grid gap-6 lg:grid-cols-4">
		<!-- Old Format Column -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<span>Format Original</span>
					<Badge variant="outline" class="font-mono text-xs">Ancien</Badge>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Description -->
				<div>
					<h4 class="mb-1 text-sm font-medium text-muted-foreground">description</h4>
					<p class="text-sm">{oldFields.description}</p>
				</div>

				<!-- Subdescription -->
				{#if oldFields.subdescription}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">subdescription</h4>
						<p class="text-sm">{oldFields.subdescription}</p>
					</div>
				{/if}

				<!-- Grade -->
				{#if oldFields.grade}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">grade</h4>
						<p class="text-sm">{oldFields.grade}e</p>
					</div>
				{/if}

				<!-- Enounces -->
				<div>
					<h4 class="mb-1 text-sm font-medium text-muted-foreground">
						enounces ({Array.isArray(oldFields.enounces) ? oldFields.enounces.length : 0})
					</h4>
					<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
							oldFields.enounces
						)}</pre>
				</div>

				<!-- Variables -->
				{#if Array.isArray(oldFields.variabless) && oldFields.variabless.length > 0}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">
							variabless ({oldFields.variabless.length})
						</h4>
						<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
								oldFields.variabless
							)}</pre>
					</div>
				{/if}

				<!-- Solutions -->
				<div>
					<h4 class="mb-1 text-sm font-medium text-muted-foreground">
						solutionss ({Array.isArray(oldFields.solutionss) ? oldFields.solutionss.length : 0})
						{#if isQCM}<span class="text-xs text-muted-foreground/70"
								>(indices des choix corrects)</span
							>{/if}
					</h4>
					{#if isQCM && Array.isArray(oldFields.solutionss)}
						<!-- QCM: Afficher indices + texte des choix corrects -->
						<div class="space-y-2 rounded-md bg-muted p-3 text-xs">
							{#each oldFields.solutionss as sol, vi (vi)}
								{@const indices = Array.isArray(sol) ? sol : [sol]}
								{@const texts = getCorrectChoicesText(
									vi,
									indices,
									oldFields.choicess as OldChoice[][]
								)}
								<div>
									<span class="font-medium">Var {vi + 1}:</span>
									<span class="font-mono text-primary">
										{#if indices.length === 1}
											index {indices[0]}
										{:else}
											indices [{indices.join(', ')}]
										{/if}
									</span>
									<span class="mx-1 text-muted-foreground">&rarr;</span>
									<span class="text-success">
										{#if texts.length === 1}
											"{texts[0]}"
										{:else}
											[{texts.map((t) => `"${t}"`).join(', ')}]
										{/if}
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<!-- Non-QCM: Affichage JSON normal -->
						<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
								oldFields.solutionss
							)}</pre>
					{/if}
				</div>

				<!-- Options -->
				{#if Array.isArray(oldFields.options) && oldFields.options.length > 0}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">
							options ({oldFields.options.length})
						</h4>
						<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
								oldFields.options
							)}</pre>
					</div>
				{/if}

				<!-- Choices -->
				{#if Array.isArray(oldFields.choicess) && oldFields.choicess.length > 0}
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">
							choicess ({oldFields.choicess.length})
						</h4>
						<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
								oldFields.choicess
							)}</pre>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- New Format Column -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<span>Format Transformé</span>
					<Badge
						variant={hasErrors ? 'destructive' : hasWarnings ? 'warning' : 'success'}
						class="font-mono text-xs"
					>
						{hasErrors ? 'Erreur' : hasWarnings ? 'Attention' : 'Nouveau'}
					</Badge>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if newFields}
					<!-- Type -->
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">type</h4>
						<p class="text-sm">{newFields.type}</p>
					</div>

					<!-- Title -->
					<div>
						<h4 class="mb-1 text-sm font-medium text-muted-foreground">title</h4>
						<p class="text-sm">{newFields.title}</p>
					</div>

					<!-- Grades -->
					{#if newFields.grades.length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">grades</h4>
							<p class="text-sm">{newFields.grades.join(', ')}</p>
						</div>
					{/if}

					<!-- Theme / Domain / Level -->
					<div class="grid grid-cols-3 gap-4">
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">theme</h4>
							<p class="text-sm">{newFields.theme}</p>
						</div>
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">domain</h4>
							<p class="text-sm">{newFields.domain}</p>
						</div>
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">level</h4>
							<p class="text-sm">{newFields.level}</p>
						</div>
					</div>

					<!-- Status / Delay -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">status</h4>
							<p class="text-sm">{newFields.status}</p>
						</div>
						{#if newFields.delay}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">delay</h4>
								<p class="text-sm">{newFields.delay}s</p>
							</div>
						{/if}
					</div>

					<!-- Shared Variables -->
					{#if newFields.shared?.variables && newFields.shared.variables.length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">
								Variables partagées ({newFields.shared.variables.length})
							</h4>
							<div class="space-y-1 rounded-md bg-muted p-3 font-mono text-xs">
								{#each newFields.shared.variables as v (v.name)}
									<div>
										<span class="text-primary">{v.name}</span> = {v.expression}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Shared Choices -->
					{#if newFields.shared?.choices && newFields.shared.choices.length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">
								Choix partagés ({newFields.shared.choices.length})
							</h4>
							<p class="mb-1 text-xs text-muted-foreground/70">
								Le choix correct est déterminé par la solution évaluée
							</p>
							<div class="space-y-1 rounded-md bg-muted p-3 text-xs">
								{#each newFields.shared.choices as choice, ci (ci)}
									<div class="flex items-center gap-2">
										<span class="font-mono">{ci}.</span>
										<span>{choice.content}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Variations with Tabs -->
					{#if newFields.variations.length > 0}
						<div class="space-y-4">
							<h4 class="text-sm font-medium text-muted-foreground">
								Variations ({newFields.variations.length})
							</h4>

							<Tabs.Root
								value={String(selectedVariationIndex)}
								onValueChange={(v) => {
									selectedVariationIndex = Number(v);
								}}
							>
								<Tabs.List class="mb-4">
									{#each newFields.variations as _, i (i)}
										<Tabs.Trigger value={String(i)}>
											Var {i + 1}
										</Tabs.Trigger>
									{/each}
								</Tabs.List>

								{#each newFields.variations as variation, i (i)}
									<Tabs.Content value={String(i)}>
										<pre
											class="max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
												variation
											)}</pre>
									</Tabs.Content>
								{/each}
							</Tabs.Root>
						</div>
					{:else}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">variations</h4>
							<p class="text-sm text-muted-foreground">Aucune variation</p>
						</div>
					{/if}
				{:else}
					<!-- Transformation Failed -->
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<AlertCircle class="mb-3 h-12 w-12 text-destructive" />
						<p class="text-sm text-muted-foreground">
							La transformation a échoué. Consultez les erreurs ci-dessous.
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Instance Generated Column -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center justify-between">
					<span>Instance Générée</span>
					<Button variant="outline" size="sm" onclick={regenerateInstance}>
						<RefreshCw class="mr-2 h-4 w-4" />
						Nouvelle
					</Button>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if resolvedInstance}
					{#if resolvedInstance.error}
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							Erreur: {resolvedInstance.error}
						</div>
					{:else}
						<!-- Statement -->
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">Énoncé</h4>
							<p class="text-sm whitespace-pre-wrap">{resolvedInstance.statement}</p>
						</div>

						<!-- Solution -->
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">Solution</h4>
							<p class="font-mono text-sm text-primary">
								{Array.isArray(resolvedInstance.solution)
									? resolvedInstance.solution.join(', ')
									: resolvedInstance.solution}
							</p>
						</div>

						<!-- Variables resolved -->
						{#if resolvedInstance.variables.length > 0}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">
									Variables ({resolvedInstance.variables.length})
								</h4>
								<div class="flex flex-wrap gap-2">
									{#each resolvedInstance.variables as v (v.name)}
										<Badge variant="secondary" class="font-mono">
											{v.name}={v.value}
										</Badge>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Choices -->
						{#if resolvedInstance.choices}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">Choix</h4>
								<ul class="space-y-1 text-sm">
									{#each resolvedInstance.choices as choice, ci (ci)}
										<li
											class={cn(
												'rounded px-2 py-1',
												choice.isCorrect === true ? 'bg-success/10 text-success' : 'bg-muted'
											)}
										>
											{ci + 1}. {choice.content}
											{choice.isCorrect === true ? '✓' : ''}
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<!-- Blanks -->
						{#if resolvedInstance.blanks}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">Blancs à remplir</h4>
								<ul class="space-y-1 font-mono text-sm">
									{#each resolvedInstance.blanks as blank, bi (bi)}
										<li>
											Position {blank.position}:
											<span class="text-primary">{blank.expectedAnswer}</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<!-- Correction -->
						{#if resolvedInstance.correction}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">Correction</h4>
								{#if resolvedInstance.correction.feedback}
									<p class="mb-2 text-sm whitespace-pre-wrap">
										{resolvedInstance.correction.feedback}
									</p>
								{/if}
								{#if resolvedInstance.correction.steps.length > 0}
									<ol class="list-inside list-decimal space-y-1 text-sm">
										{#each resolvedInstance.correction.steps as step, si (si)}
											<li>{step}</li>
										{/each}
									</ol>
								{/if}
							</div>
						{/if}
					{/if}
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<p class="text-sm text-muted-foreground">
							Sélectionnez une variation pour générer une instance
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Rendered Preview Column -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center justify-between">
					<span>Rendu Visuel</span>
					<Badge variant="outline" class="font-mono text-xs">Preview</Badge>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if resolvedInstance}
					{#if resolvedInstance.error}
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							Erreur: {resolvedInstance.error}
						</div>
					{:else}
						<!-- Statement rendered -->
						<div>
							<h4 class="mb-2 text-sm font-medium text-muted-foreground">Énoncé</h4>
							<div class="rounded-lg border bg-card p-4">
								<MarkdownRenderer content={resolvedInstance.statement} />
							</div>
						</div>

						<!-- Solution rendered -->
						<div>
							<h4 class="mb-2 text-sm font-medium text-muted-foreground">Solution</h4>
							<div class="rounded-lg border-2 border-primary/50 bg-primary/5 p-3">
								{#if Array.isArray(resolvedInstance.solution)}
									{#each resolvedInstance.solution as sol, si (si)}
										<div class="mb-1 last:mb-0">
											<MarkdownRenderer content={`$$${sol}$$`} />
										</div>
									{/each}
								{:else}
									<MarkdownRenderer content={`$$${resolvedInstance.solution}$$`} />
								{/if}
							</div>
						</div>

						<!-- Choices rendered -->
						{#if resolvedInstance.choices}
							<div>
								<h4 class="mb-2 text-sm font-medium text-muted-foreground">Choix</h4>
								<div class="space-y-2">
									{#each resolvedInstance.choices as choice, ci (ci)}
										<div
											class={cn(
												'flex items-center gap-3 rounded-lg border p-3',
												choice.isCorrect ? 'border-success bg-success/10' : 'border-border bg-card'
											)}
										>
											<Badge variant={choice.isCorrect ? 'default' : 'outline'}>
												{String.fromCharCode(65 + ci)}
											</Badge>
											<div class="flex-1">
												<MarkdownRenderer content={choice.content} />
											</div>
											{#if choice.isCorrect}
												<CheckCircle2 class="h-4 w-4 text-success" />
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Correction rendered -->
						{#if resolvedInstance.correction}
							<div>
								<h4 class="mb-2 text-sm font-medium text-muted-foreground">Correction</h4>
								<div class="space-y-2 rounded-lg border bg-muted/50 p-4">
									{#if resolvedInstance.correction.feedback}
										<div class="text-sm">
											<MarkdownRenderer content={resolvedInstance.correction.feedback} />
										</div>
									{/if}
									{#if resolvedInstance.correction.steps.length > 0}
										<ol class="list-inside list-decimal space-y-2 text-sm">
											{#each resolvedInstance.correction.steps as step, si (si)}
												<li>
													<MarkdownRenderer content={step} />
												</li>
											{/each}
										</ol>
									{/if}
								</div>
							</div>
						{/if}
					{/if}
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<p class="text-sm text-muted-foreground">
							Sélectionnez une variation pour voir le rendu
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Warnings Section -->
	{#if hasWarnings}
		<Card.Root class="border-warning/50 bg-warning/5">
			<Card.Header>
				<Card.Title class="text-warning flex items-center gap-2">
					<AlertTriangle class="h-5 w-5" />
					Avertissements ({warnings.length})
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2">
					{#each warnings as warning, i (i)}
						<li class="flex items-start gap-2 text-sm">
							<AlertTriangle class="text-warning mt-0.5 h-4 w-4 shrink-0" />
							<span>{warning}</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Errors Section -->
	{#if hasErrors}
		<Card.Root class="border-destructive/50 bg-destructive/5">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<AlertCircle class="h-5 w-5" />
					Erreurs ({errors.length})
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2">
					{#each errors as error, i (i)}
						<li class="flex items-start gap-2 text-sm">
							<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
							<span>{error}</span>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Success Indicator (if clean) -->
	{#if isClean}
		<Card.Root class="border-success/50 bg-success/5">
			<Card.Content class="py-6">
				<div class="flex items-center justify-center gap-2 text-success">
					<CheckCircle2 class="h-5 w-5" />
					<p class="font-medium">Transformation réussie sans avertissements</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Review Actions -->
	{#if onApprove || onReject}
		<ReviewActions {onApprove} {onReject} disabled={hasErrors} />
	{/if}
</div>
