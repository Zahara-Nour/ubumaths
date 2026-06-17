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
	import {
		AlertCircle,
		AlertTriangle,
		CheckCircle2,
		RefreshCw,
		Edit3,
		Code2,
		Copy,
		Check
	} from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import type {
		QuestionVariable,
		QuestionCorrection,
		QuestionTemplate,
		TemplateBlank,
		RequiredForm,
		ValidationRule,
		BlankDefaults
	} from '$lib/questions/types';
	import 'mathlive';

	interface Props {
		original: Record<string, unknown>; // Old question format
		transformed: Record<string, unknown> | null; // New format (null if transformation failed)
		warnings: string[];
		errors: string[];
		isEdited?: boolean;
		class?: string;
	}

	let {
		original,
		transformed,
		warnings,
		errors,
		isEdited = false,
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
		expressions: original.expressions || [],
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
					title: (transformed.title as string) || '',
					variations: (transformed.variations as MigrationVariation[]) || [],
					shared: transformed.shared as
						| {
								statement?: string;
								variables?: QuestionVariable[];
								solution?: string | string[];
								correction?: QuestionCorrection;
								choices?: Array<{ content: string; isCorrect?: boolean }>;
								validationRules?: ValidationRule[];
								requiredForm?: RequiredForm;
								blankDefaults?: BlankDefaults;
								answerFormats?: Record<string, string>;
						  }
						| undefined,
					grades: (transformed.grades as string[]) || [],
					theme: (transformed.theme as string) || '',
					domain: (transformed.domain as string) || '',
					level: transformed.level as number | null,
					status: (transformed.status as string) || '',
					delay: transformed.delay as number | null,
					options: transformed.options as
						| {
								constraints?: Record<string, string | boolean>;
								unitOptions?: Record<string, unknown>;
								shuffleChoices?: boolean;
								orderIndependent?: boolean;
								[key: string]: unknown;
						  }
						| undefined,
					defaultDisplayOptions: transformed.defaultDisplayOptions as
						| Record<string, boolean>
						| undefined,
					exerciseInstruction: transformed.exerciseInstruction as string | undefined
				}
			: null
	);

	/**
	 * Infer the question type from transformed data
	 */
	const inferredType = $derived.by((): string => {
		if (!newFields) return '';
		// Check if any variation or shared has choices
		const hasChoices =
			newFields.variations.some((v) => v.choices && v.choices.length > 0) ||
			(newFields.shared?.choices && newFields.shared.choices.length > 0);
		return hasChoices ? 'QCM' : 'Blancs';
	});

	// Raw view toggle states
	let showRawOriginal = $state(false);
	let showRawTransformed = $state(false);
	let showRawInstance = $state(false);

	// Copy to clipboard with visual feedback
	let copiedId = $state<string | null>(null);
	async function copyToClipboard(text: string, id: string) {
		await navigator.clipboard.writeText(text);
		copiedId = id;
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}

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
		correctChoiceIndex?: string | string[];
		correction?: QuestionCorrection;
		choices?: Array<{ content: string; isCorrect?: boolean }>;
		blanks?: TemplateBlank[];
		answerFormats?: Record<string, string>;
		validationRules?: ValidationRule[];
		requiredForm?: RequiredForm;
		blankDefaults?: BlankDefaults;
	}

	/**
	 * Generate a QuestionInstance using the real pipeline (generateInstance).
	 * Used for both the detail view and the FlashCard rendering.
	 */
	const generationResult = $derived.by(() => {
		if (!transformed || !newFields?.variations?.length) return null;

		const variation = newFields.variations[selectedVariationIndex];
		if (!variation) return null;

		// Build a QuestionTemplate with only the selected variation
		const template: QuestionTemplate = {
			id: 'migration-preview',
			title: newFields.title || 'Preview',
			shared: newFields.shared as QuestionTemplate['shared'],
			variations: [variation as QuestionTemplate['variations'][number]],
			grades: (newFields.grades ?? []) as QuestionTemplate['grades'],
			theme: newFields.theme ?? '',
			domain: newFields.domain ?? '',
			level: newFields.level ?? 1,
			status: 'draft',
			options: newFields.options as QuestionTemplate['options'],
			defaultDisplayOptions: newFields.defaultDisplayOptions,
			exerciseInstruction: newFields.exerciseInstruction
		};

		return generateInstance(template, instanceSeed);
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
					<Button
						variant={showRawOriginal ? 'secondary' : 'ghost'}
						size="icon"
						class="ml-auto h-7 w-7"
						onclick={() => (showRawOriginal = !showRawOriginal)}
						title="Voir le JSON brut"
					>
						<Code2 class="h-4 w-4" />
					</Button>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if showRawOriginal}
					<div class="relative">
						<Button
							variant="ghost"
							size="icon"
							class="absolute top-2 right-2 h-7 w-7"
							onclick={() => copyToClipboard(JSON.stringify(original, null, 2), 'original')}
							title="Copier"
						>
							{#if copiedId === 'original'}
								<Check class="h-4 w-4 text-green-600" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</Button>
						<pre
							class="max-h-[70vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(
								original,
								null,
								2
							)}</pre>
					</div>
				{:else}
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

					<!-- Expressions -->
					{#if Array.isArray(oldFields.expressions) && oldFields.expressions.length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">
								expressions ({oldFields.expressions.length})
							</h4>
							<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
									oldFields.expressions
								)}</pre>
						</div>
					{/if}

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
					{#if isEdited}
						<Badge variant="outline" class="border-blue-500 text-blue-600">
							<Edit3 class="mr-1 h-3 w-3" />
							Modifie
						</Badge>
					{/if}
					<Button
						variant={showRawTransformed ? 'secondary' : 'ghost'}
						size="icon"
						class="ml-auto h-7 w-7"
						onclick={() => (showRawTransformed = !showRawTransformed)}
						title="Voir le JSON brut"
					>
						<Code2 class="h-4 w-4" />
					</Button>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if showRawTransformed}
					<div class="relative">
						<Button
							variant="ghost"
							size="icon"
							class="absolute top-2 right-2 h-7 w-7"
							onclick={() => copyToClipboard(JSON.stringify(transformed, null, 2), 'transformed')}
							title="Copier"
						>
							{#if copiedId === 'transformed'}
								<Check class="h-4 w-4 text-green-600" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</Button>
						<pre
							class="max-h-[70vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(
								transformed,
								null,
								2
							)}</pre>
					</div>
				{:else if newFields}
					<!-- Type (inferred) + Title -->
					<div class="flex items-center gap-2">
						<Badge variant={inferredType === 'QCM' ? 'default' : 'secondary'}>
							{inferredType}
						</Badge>
						<span class="text-sm font-medium">{newFields.title}</span>
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

					<!-- Options (constraints, unitOptions, etc.) -->
					{#if newFields.options && Object.keys(newFields.options).length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">Options</h4>
							<div class="space-y-1 rounded-md bg-muted p-3 font-mono text-xs">
								{#if newFields.options.constraints}
									{#each Object.entries(newFields.options.constraints) as [key, value] (key)}
										<div>
											<span class="text-primary">{key}</span>
											<span class="text-muted-foreground"> = </span>
											<span>{value}</span>
										</div>
									{/each}
								{/if}
								{#if newFields.options.shuffleChoices !== undefined}
									<div>
										<span class="text-primary">shuffleChoices</span>
										<span class="text-muted-foreground"> = </span>
										<span>{newFields.options.shuffleChoices}</span>
									</div>
								{/if}
								{#if newFields.options.unitOptions}
									{#each Object.entries(newFields.options.unitOptions) as [key, value] (key)}
										<div>
											<span class="text-primary">unit.{key}</span>
											<span class="text-muted-foreground"> = </span>
											<span>{value}</span>
										</div>
									{/each}
								{/if}
							</div>
						</div>
					{/if}

					<!-- Default Display Options -->
					{#if newFields.defaultDisplayOptions && Object.keys(newFields.defaultDisplayOptions).length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">Display Options</h4>
							<div class="space-y-1 rounded-md bg-muted p-3 font-mono text-xs">
								{#each Object.entries(newFields.defaultDisplayOptions) as [key, value] (key)}
									<div>
										<span class="text-primary">{key}</span>
										<span class="text-muted-foreground"> = </span>
										<span>{value}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

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

					<!-- Shared answerFormats -->
					{#if newFields.shared?.answerFormats && Object.keys(newFields.shared.answerFormats).length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">
								answerFormats (partagé)
							</h4>
							<div class="space-y-1 rounded-md bg-muted p-3 font-mono text-xs">
								{#each Object.entries(newFields.shared.answerFormats) as [key, value] (key)}
									<div>
										<span class="text-primary">{key}</span>
										<span class="text-muted-foreground"> → </span>
										<span>{value}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Shared requiredForm -->
					{#if newFields.shared?.requiredForm}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">requiredForm (partagé)</h4>
							<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
									newFields.shared.requiredForm
								)}</pre>
						</div>
					{/if}

					<!-- Shared validationRules -->
					{#if newFields.shared?.validationRules && newFields.shared.validationRules.length > 0}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">
								validationRules (partagé) ({newFields.shared.validationRules.length})
							</h4>
							<pre
								class="max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
									newFields.shared.validationRules
								)}</pre>
						</div>
					{/if}

					<!-- Shared blankDefaults -->
					{#if newFields.shared?.blankDefaults}
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">
								blankDefaults (partagé)
							</h4>
							<pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{formatValue(
									newFields.shared.blankDefaults
								)}</pre>
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
									<Tabs.Content value={String(i)} class="space-y-3">
										<!-- Statement -->
										{#if variation.statement}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">statement</h4>
												<pre
													class="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">{variation.statement}</pre>
											</div>
										{/if}

										<!-- Variables -->
										{#if variation.variables && variation.variables.length > 0}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">
													variables ({variation.variables.length})
												</h4>
												<div class="space-y-0.5 rounded-md bg-muted p-2 font-mono text-xs">
													{#each variation.variables as v (v.name)}
														<div>
															<span class="text-primary">{v.name}</span> = {v.expression}
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Blanks (v2) -->
										{#if variation.blanks && variation.blanks.length > 0}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">
													blanks ({variation.blanks.length})
												</h4>
												<div class="space-y-1 rounded-md bg-muted p-2 text-xs">
													{#each variation.blanks as blank, bi (bi)}
														<div class="flex flex-wrap items-center gap-1">
															<Badge variant="outline" class="font-mono text-[10px]">#{bi}</Badge>
															<span class="font-mono text-primary">{blank.expectedAnswer}</span>
															{#if blank.prefilled}
																<Badge variant="secondary" class="text-[10px]"
																	>prefilled: {blank.prefilled}</Badge
																>
															{/if}
															{#if blank.unit}
																<Badge variant="secondary" class="text-[10px]">unit</Badge>
															{/if}
															{#if blank.pool}
																<Badge variant="secondary" class="text-[10px]"
																	>pool: {blank.pool.length}</Badge
																>
															{/if}
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- answerFormats -->
										{#if variation.answerFormats && Object.keys(variation.answerFormats).length > 0}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">
													answerFormats
												</h4>
												<div class="space-y-0.5 rounded-md bg-muted p-2 font-mono text-xs">
													{#each Object.entries(variation.answerFormats) as [key, value] (key)}
														<div>
															<span class="text-primary">{key}</span>
															<span class="text-muted-foreground"> → </span>
															<span>{value}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- validationRules -->
										{#if variation.validationRules && variation.validationRules.length > 0}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">
													validationRules
												</h4>
												<pre
													class="max-h-32 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">{formatValue(
														variation.validationRules
													)}</pre>
											</div>
										{/if}

										<!-- requiredForm -->
										{#if variation.requiredForm}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">requiredForm</h4>
												<pre class="rounded-md bg-muted p-2 font-mono text-xs">{formatValue(
														variation.requiredForm
													)}</pre>
											</div>
										{/if}

										<!-- Solution -->
										{#if variation.correctChoiceIndex !== undefined}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">solution</h4>
												<pre class="rounded-md bg-muted p-2 font-mono text-xs">{formatValue(
														variation.correctChoiceIndex
													)}</pre>
											</div>
										{/if}

										<!-- Choices -->
										{#if variation.choices && variation.choices.length > 0}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">
													choices ({variation.choices.length})
												</h4>
												<div class="space-y-0.5 rounded-md bg-muted p-2 text-xs">
													{#each variation.choices as choice, ci (ci)}
														<div class="flex items-center gap-1">
															<span class="font-mono">{ci}.</span>
															<span>{choice.content}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Correction -->
										{#if variation.correction}
											<div>
												<h4 class="mb-1 text-xs font-medium text-muted-foreground">correction</h4>
												<pre
													class="max-h-32 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">{formatValue(
														variation.correction
													)}</pre>
											</div>
										{/if}
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
					<div class="flex items-center gap-1">
						<Button
							variant={showRawInstance ? 'secondary' : 'ghost'}
							size="icon"
							class="h-7 w-7"
							onclick={() => (showRawInstance = !showRawInstance)}
							title="Voir le JSON brut"
						>
							<Code2 class="h-4 w-4" />
						</Button>
						<Button variant="outline" size="sm" onclick={regenerateInstance}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Nouvelle
						</Button>
					</div>
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if generationResult && !generationResult.success}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						{#each generationResult.errors as err, i (i)}
							<p>{err}</p>
						{/each}
					</div>
				{:else if generationResult?.success}
					{@const inst = generationResult.instance}
					{#if showRawInstance}
						<div class="relative">
							<Button
								variant="ghost"
								size="icon"
								class="absolute top-2 right-2 h-7 w-7"
								onclick={() => copyToClipboard(JSON.stringify(inst, null, 2), 'instance')}
								title="Copier"
							>
								{#if copiedId === 'instance'}
									<Check class="h-4 w-4 text-green-600" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</Button>
							<pre
								class="max-h-[70vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(
									inst,
									null,
									2
								)}</pre>
						</div>
					{:else}
						<!-- Statement -->
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">Énoncé</h4>
							<p class="text-sm whitespace-pre-wrap">{inst.statement}</p>
						</div>

						<!-- Solution -->
						<div>
							<h4 class="mb-1 text-sm font-medium text-muted-foreground">Solution</h4>
							<p class="font-mono text-sm text-primary">
								{Array.isArray(inst.correctChoiceIndex)
									? inst.correctChoiceIndex.join(', ')
									: (inst.correctChoiceIndex ?? '')}
							</p>
						</div>

						<!-- Variables resolved -->
						{#if inst.resolvedVariables && inst.resolvedVariables.length > 0}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">
									Variables ({inst.resolvedVariables.length})
								</h4>
								<div class="flex flex-wrap gap-2">
									{#each inst.resolvedVariables as v (v.name)}
										<Badge variant="secondary" class="font-mono">
											{v.name}={v.value}
										</Badge>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Choices -->
						{#if inst.choices}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">Choix</h4>
								<ul class="space-y-1 text-sm">
									{#each inst.choices as choice, ci (ci)}
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
						{#if inst.blanks}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">
									Blancs à remplir ({inst.blanks.length})
								</h4>
								<div class="space-y-2 text-sm">
									{#each inst.blanks as blank, bi (bi)}
										<div class="rounded-md bg-muted p-2">
											<div class="flex items-center gap-2">
												<Badge variant="outline" class="font-mono text-xs">#{bi}</Badge>
												<span class="font-mono text-primary">
													{blank.expectedAnswer}
												</span>
											</div>
											{#if blank.unit}
												<div class="mt-1 text-xs text-muted-foreground">
													unité: {blank.unit.required ?? 'attendue'}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Correction -->
						{#if inst.correction}
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">Correction</h4>
								{#if inst.correction.feedback?.correct}
									<p class="mb-2 text-sm whitespace-pre-wrap">
										{inst.correction.feedback.correct}
									</p>
								{/if}
								{#if inst.correction.steps && inst.correction.steps.length > 0}
									<ol class="list-inside list-decimal space-y-1 text-sm">
										{#each inst.correction.steps as step, si (si)}
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
			<Card.Content>
				{#if generationResult && !generationResult.success}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						{#each generationResult.errors as err, i (i)}
							<p>{err}</p>
						{/each}
					</div>
				{:else if generationResult?.success}
					<FlashCard instance={generationResult.instance} size="sm" />
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
				<Card.Title class="flex items-center gap-2 text-warning">
					<AlertTriangle class="h-5 w-5" />
					Avertissements ({warnings.length})
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2">
					{#each warnings as warning, i (i)}
						<li class="flex items-start gap-2 text-sm">
							<AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
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
</div>
