<script lang="ts">
	/**
	 * MigrationQuestionEditForm Component
	 * ====================================
	 *
	 * Form for editing transformed questions during migration review.
	 *
	 * Features:
	 * - Tabs for Edit/Preview
	 * - Title and description editing
	 * - Variation switching with add/remove
	 * - Statement editor with markdown support
	 * - Variables editor (add/remove/edit)
	 * - Solution editor
	 * - Choices editor (for QCM)
	 * - Correction editor (collapsible)
	 * - Live preview in Preview tab
	 */

	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { resolveVariables, resolveExpression, resolveSolution } from '$lib/questions';
	import type { QuestionVariable } from '$lib/questions/types';
	import {
		Plus,
		X,
		ChevronDown,
		ChevronUp,
		Save,
		Eye,
		Edit3,
		AlertCircle,
		CheckCircle2
	} from 'lucide-svelte';
	import { cn } from '$lib/utils';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface Choice {
		content: string;
		isCorrect?: boolean;
	}

	interface Blank {
		position: number;
		expectedAnswer: string;
	}

	interface Correction {
		feedback?: {
			correct?: string;
			incorrect?: string;
			partial?: string;
		};
		steps?: string[];
	}

	interface Variation {
		statement: string;
		variables?: QuestionVariable[];
		solution: string | string[];
		correction?: Correction;
		choices?: Choice[];
		blanks?: Blank[];
	}

	interface SharedDefaults {
		variables?: QuestionVariable[];
		choices?: Choice[];
	}

	export interface EditedQuestion {
		type?: string;
		title: string;
		description?: string;
		shared?: SharedDefaults;
		variations: Variation[];
		exerciseInstruction?: string;
		grades?: string[];
		theme?: string;
		domain?: string;
		subdomain?: string;
		level?: number;
		status?: 'draft' | 'published';
		delay?: number;
	}

	interface Props {
		initialData: EditedQuestion;
		onSave: (data: EditedQuestion, notes: string) => void;
		onCancel: () => void;
		isSaving?: boolean;
		class?: string;
	}

	let { initialData, onSave, onCancel, isSaving = false, class: className }: Props = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	// Form data - deep clone to avoid mutating original.
	// Note: This captures initialData at mount time only. The parent component
	// should remount this form when editing a different question (which is handled
	// by the dialog key={...} pattern in the parent).
	// Using JSON parse/stringify because structuredClone can't handle some object types.
	let formData = $state<EditedQuestion>(JSON.parse(JSON.stringify(initialData)));
	let editNotes = $state('');

	// UI state
	let activeTab = $state<'edit' | 'preview'>('edit');
	let selectedVariationIndex = $state(0);
	let isCorrectionOpen = $state(false);
	let isDescriptionOpen = $state(false);
	let previewSeed = $state(Date.now());

	// ============================================================================
	// DERIVED
	// ============================================================================

	const currentVariation = $derived(formData.variations[selectedVariationIndex] || null);

	const isQCM = $derived(
		formData.type === 'multiple_choice' ||
			(currentVariation?.choices && currentVariation.choices.length > 0) ||
			(formData.shared?.choices && formData.shared.choices.length > 0)
	);

	// Preview instance generation
	const previewInstance = $derived.by(() => {
		if (!currentVariation) return null;

		try {
			// Merge shared variables with variation-specific variables
			const sharedVars = formData.shared?.variables || [];
			const variationVars = currentVariation.variables || [];
			const allVariables = [...sharedVars, ...variationVars];

			// Resolve variables
			const resolved = resolveVariables(allVariables, previewSeed);

			// Resolve statement
			const statement = currentVariation.statement
				? resolveExpression(currentVariation.statement, resolved, previewSeed)
				: '';

			// Resolve solution
			const solution = currentVariation.solution
				? resolveSolution(currentVariation.solution, resolved, previewSeed)
				: '';

			// Resolve choices
			const rawChoices = currentVariation.choices || formData.shared?.choices;
			const correctIndices = Array.isArray(solution)
				? solution.map((s) => parseInt(String(s), 10))
				: [parseInt(String(solution), 10)];

			const choices = rawChoices
				? rawChoices.map((c, index) => ({
						content: resolveExpression(c.content, resolved, previewSeed),
						isCorrect: correctIndices.includes(index)
					}))
				: null;

			return {
				statement,
				solution,
				choices,
				variables: resolved,
				error: null
			};
		} catch (e) {
			return {
				statement: '',
				solution: '',
				choices: null,
				variables: [],
				error: e instanceof Error ? e.message : String(e)
			};
		}
	});

	// Form validation
	const isValid = $derived(
		formData.title.trim().length > 0 &&
			formData.variations.length > 0 &&
			formData.variations.every((v) => v.statement.trim().length > 0)
	);

	// ============================================================================
	// HANDLERS
	// ============================================================================

	function handleSave() {
		if (!isValid) return;
		onSave(formData, editNotes);
	}

	function addVariation() {
		formData.variations = [
			...formData.variations,
			{
				statement: '',
				solution: '',
				variables: [],
				choices: isQCM ? [{ content: '', isCorrect: false }] : undefined
			}
		];
		selectedVariationIndex = formData.variations.length - 1;
	}

	function removeVariation(index: number) {
		if (formData.variations.length <= 1) return;
		formData.variations = formData.variations.filter((_, i) => i !== index);
		if (selectedVariationIndex >= formData.variations.length) {
			selectedVariationIndex = formData.variations.length - 1;
		}
	}

	function addVariable() {
		if (!currentVariation) return;
		const vars = currentVariation.variables || [];
		formData.variations[selectedVariationIndex].variables = [...vars, { name: '', expression: '' }];
	}

	function removeVariable(varIndex: number) {
		if (!currentVariation?.variables) return;
		formData.variations[selectedVariationIndex].variables = currentVariation.variables.filter(
			(_, i) => i !== varIndex
		);
	}

	function addChoice() {
		if (!currentVariation) return;
		const choices = currentVariation.choices || [];
		formData.variations[selectedVariationIndex].choices = [
			...choices,
			{ content: '', isCorrect: false }
		];
	}

	function removeChoice(choiceIndex: number) {
		if (!currentVariation?.choices || currentVariation.choices.length <= 1) return;
		formData.variations[selectedVariationIndex].choices = currentVariation.choices.filter(
			(_, i) => i !== choiceIndex
		);
	}

	function addCorrectionStep() {
		if (!currentVariation) return;
		const correction = currentVariation.correction || { steps: [] };
		const steps = correction.steps || [];
		formData.variations[selectedVariationIndex].correction = {
			...correction,
			steps: [...steps, '']
		};
	}

	function removeCorrectionStep(stepIndex: number) {
		if (!currentVariation?.correction?.steps) return;
		formData.variations[selectedVariationIndex].correction = {
			...currentVariation.correction,
			steps: currentVariation.correction.steps.filter((_, i) => i !== stepIndex)
		};
	}

	function regeneratePreview() {
		previewSeed = Date.now();
	}
</script>

<div class={cn('space-y-4', className)}>
	<!-- Tabs -->
	<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v as 'edit' | 'preview')}>
		<Tabs.List>
			<Tabs.Trigger value="edit">
				<Edit3 class="mr-2 h-4 w-4" />
				Editer
			</Tabs.Trigger>
			<Tabs.Trigger value="preview">
				<Eye class="mr-2 h-4 w-4" />
				Apercu
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Edit Tab -->
		<Tabs.Content value="edit" class="mt-4 space-y-6">
			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Titre</Label>
				<Input id="title" bind:value={formData.title} placeholder="Titre de la question" />
			</div>

			<!-- Description (collapsible) -->
			<Collapsible.Root bind:open={isDescriptionOpen}>
				<Collapsible.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="sm" class="w-full justify-between">
							<span>Description (optionnelle)</span>
							{#if isDescriptionOpen}
								<ChevronUp class="h-4 w-4" />
							{:else}
								<ChevronDown class="h-4 w-4" />
							{/if}
						</Button>
					{/snippet}
				</Collapsible.Trigger>
				<Collapsible.Content class="mt-2">
					<Textarea
						bind:value={formData.description}
						placeholder="Description de la question..."
						rows={3}
					/>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- Variation Selector -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<Label>Variations ({formData.variations.length})</Label>
					<Button variant="outline" size="sm" onclick={addVariation}>
						<Plus class="mr-1 h-3 w-3" />
						Ajouter
					</Button>
				</div>

				<div class="flex flex-wrap gap-2">
					{#each formData.variations as _, i (i)}
						<Button
							variant={i === selectedVariationIndex ? 'default' : 'outline'}
							size="sm"
							onclick={() => (selectedVariationIndex = i)}
							class="relative"
						>
							V{i + 1}
							{#if formData.variations.length > 1}
								<button
									type="button"
									class="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-white hover:bg-destructive/80"
									onclick={(e) => {
										e.stopPropagation();
										removeVariation(i);
									}}
								>
									<X class="h-3 w-3" />
								</button>
							{/if}
						</Button>
					{/each}
				</div>
			</div>

			{#if currentVariation}
				<!-- Statement -->
				<div class="space-y-2">
					<Label for="statement">Enonce</Label>
					<Textarea
						id="statement"
						bind:value={formData.variations[selectedVariationIndex].statement}
						placeholder="Enonce de la question (supporte le markdown et LaTeX)..."
						rows={4}
						class="font-mono text-sm"
					/>
					<p class="text-xs text-muted-foreground">
						Utilisez $...$ pour le LaTeX inline, $$...$$ pour les blocs, et {'{{var}}'} pour les variables.
					</p>
				</div>

				<!-- Variables -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label>Variables ({currentVariation.variables?.length || 0})</Label>
						<Button variant="outline" size="sm" onclick={addVariable}>
							<Plus class="mr-1 h-3 w-3" />
							Ajouter
						</Button>
					</div>

					{#if currentVariation.variables && currentVariation.variables.length > 0}
						<div class="space-y-2">
							{#each currentVariation.variables as _variable, vi (vi)}
								<div class="flex items-center gap-2">
									<Input
										bind:value={formData.variations[selectedVariationIndex].variables![vi].name}
										placeholder="nom"
										class="w-24 font-mono"
									/>
									<span class="text-muted-foreground">=</span>
									<Input
										bind:value={
											formData.variations[selectedVariationIndex].variables![vi].expression
										}
										placeholder={'expression (ex: {{random:1..10}})'}
										class="flex-1 font-mono text-sm"
									/>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => removeVariable(vi)}
										class="text-destructive hover:text-destructive"
									>
										<X class="h-4 w-4" />
									</Button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">Aucune variable definie.</p>
					{/if}
				</div>

				<!-- Solution -->
				<div class="space-y-2">
					<Label for="solution">Solution</Label>
					{#if Array.isArray(currentVariation.solution)}
						<div class="space-y-2">
							{#each currentVariation.solution as _sol, si (si)}
								<Input
									bind:value={formData.variations[selectedVariationIndex].solution[si]}
									placeholder="Solution {si + 1}"
									class="font-mono"
								/>
							{/each}
						</div>
					{:else}
						<Input
							bind:value={formData.variations[selectedVariationIndex].solution}
							placeholder={'Solution (ex: {{a}}+{{b}})'}
							class="font-mono"
						/>
					{/if}
				</div>

				<!-- Choices (for QCM) -->
				{#if isQCM}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<Label>Choix ({currentVariation.choices?.length || 0})</Label>
							<Button variant="outline" size="sm" onclick={addChoice}>
								<Plus class="mr-1 h-3 w-3" />
								Ajouter
							</Button>
						</div>

						{#if currentVariation.choices && currentVariation.choices.length > 0}
							<div class="space-y-2">
								{#each currentVariation.choices as _choice, ci (ci)}
									<div class="flex items-center gap-2">
										<Badge variant="outline" class="w-8 justify-center">
											{String.fromCharCode(65 + ci)}
										</Badge>
										<Input
											bind:value={formData.variations[selectedVariationIndex].choices![ci].content}
											placeholder="Contenu du choix..."
											class="flex-1 font-mono text-sm"
										/>
										{#if currentVariation.choices.length > 1}
											<Button
												variant="ghost"
												size="icon"
												onclick={() => removeChoice(ci)}
												class="text-destructive hover:text-destructive"
											>
												<X class="h-4 w-4" />
											</Button>
										{/if}
									</div>
								{/each}
							</div>
							<p class="text-xs text-muted-foreground">
								Le choix correct est determine par la solution (index).
							</p>
						{/if}
					</div>
				{/if}

				<!-- Correction (collapsible) -->
				<Collapsible.Root bind:open={isCorrectionOpen}>
					<Collapsible.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="sm" class="w-full justify-between">
								<span>Correction (optionnelle)</span>
								{#if isCorrectionOpen}
									<ChevronUp class="h-4 w-4" />
								{:else}
									<ChevronDown class="h-4 w-4" />
								{/if}
							</Button>
						{/snippet}
					</Collapsible.Trigger>
					<Collapsible.Content class="mt-2 space-y-4">
						<!-- Feedback -->
						<div class="space-y-2">
							<Label>Feedback (bonne reponse)</Label>
							<Input
								value={currentVariation.correction?.feedback?.correct || ''}
								oninput={(e) => {
									const val = (e.target as HTMLInputElement).value;
									formData.variations[selectedVariationIndex].correction = {
										...currentVariation.correction,
										feedback: {
											...currentVariation.correction?.feedback,
											correct: val
										}
									};
								}}
								placeholder="Bravo ! C'est correct."
							/>
						</div>

						<!-- Steps -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label>Etapes de correction</Label>
								<Button variant="outline" size="sm" onclick={addCorrectionStep}>
									<Plus class="mr-1 h-3 w-3" />
									Ajouter
								</Button>
							</div>

							{#if currentVariation.correction?.steps && currentVariation.correction.steps.length > 0}
								<div class="space-y-2">
									{#each currentVariation.correction.steps as _step, si (si)}
										<div class="flex items-center gap-2">
											<Badge variant="outline" class="w-8 justify-center">
												{si + 1}
											</Badge>
											<Input
												bind:value={
													formData.variations[selectedVariationIndex].correction!.steps![si]
												}
												placeholder="Etape {si + 1}..."
												class="flex-1"
											/>
											<Button
												variant="ghost"
												size="icon"
												onclick={() => removeCorrectionStep(si)}
												class="text-destructive hover:text-destructive"
											>
												<X class="h-4 w-4" />
											</Button>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-muted-foreground">Aucune etape de correction.</p>
							{/if}
						</div>
					</Collapsible.Content>
				</Collapsible.Root>
			{/if}

			<!-- Edit Notes -->
			<div class="space-y-2">
				<Label for="notes">Notes d'edition (optionnelles)</Label>
				<Textarea
					id="notes"
					bind:value={editNotes}
					placeholder="Decrivez vos modifications..."
					rows={2}
				/>
			</div>
		</Tabs.Content>

		<!-- Preview Tab -->
		<Tabs.Content value="preview" class="mt-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-3">
					<Card.Title class="text-sm">Apercu de l'instance</Card.Title>
					<Button variant="outline" size="sm" onclick={regeneratePreview}>Regenerer</Button>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if previewInstance}
						{#if previewInstance.error}
							<div
								class="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
							>
								<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
								<span>Erreur: {previewInstance.error}</span>
							</div>
						{:else}
							<!-- Title -->
							<div>
								<h4 class="mb-1 text-sm font-medium text-muted-foreground">Titre</h4>
								<p class="text-sm">{formData.title}</p>
							</div>

							<!-- Statement -->
							<div>
								<h4 class="mb-2 text-sm font-medium text-muted-foreground">Enonce</h4>
								<div class="rounded-lg border bg-card p-4">
									<MarkdownRenderer content={previewInstance.statement} />
								</div>
							</div>

							<!-- Variables -->
							{#if previewInstance.variables.length > 0}
								<div>
									<h4 class="mb-1 text-sm font-medium text-muted-foreground">Variables</h4>
									<div class="flex flex-wrap gap-2">
										{#each previewInstance.variables as v (v.name)}
											<Badge variant="secondary" class="font-mono">
												{v.name}={v.value}
											</Badge>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Choices -->
							{#if previewInstance.choices}
								<div>
									<h4 class="mb-2 text-sm font-medium text-muted-foreground">Choix</h4>
									<div class="space-y-2">
										{#each previewInstance.choices as choice, ci (ci)}
											<div
												class={cn(
													'flex items-center gap-3 rounded-lg border p-3',
													choice.isCorrect
														? 'border-success bg-success/10'
														: 'border-border bg-card'
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

							<!-- Solution -->
							<div>
								<h4 class="mb-2 text-sm font-medium text-muted-foreground">Solution</h4>
								<div class="rounded-lg border-2 border-primary/50 bg-primary/5 p-3">
									{#if Array.isArray(previewInstance.solution)}
										{#each previewInstance.solution as sol, si (si)}
											<div class="mb-1 last:mb-0">
												<MarkdownRenderer content={`$$${sol}$$`} />
											</div>
										{/each}
									{:else}
										<MarkdownRenderer content={`$$${previewInstance.solution}$$`} />
									{/if}
								</div>
							</div>
						{/if}
					{:else}
						<div class="py-12 text-center">
							<p class="text-sm text-muted-foreground">Aucune donnee a afficher.</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>

	<!-- Actions -->
	<div class="flex items-center justify-end gap-3 border-t pt-4">
		<Button variant="outline" onclick={onCancel} disabled={isSaving}>Annuler</Button>
		<Button onclick={handleSave} disabled={!isValid || isSaving}>
			<Save class="mr-2 h-4 w-4" />
			{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
		</Button>
	</div>
</div>
