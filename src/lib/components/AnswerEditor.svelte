<!--
	Answer Editor Component
	=======================

	Dynamic answer editor that changes based on question type.

	QUESTION TYPES:
	- numerical_exact/decimal/rounded: Single LaTeX expression + precision
	- algebraic_transform: LaTeX expression + transform type
	- fill_in_blanks: Complex blanks with positions and expected answers
	- multiple_choice: Choices with TemplateMarkdown content and isCorrect flags

	PROPS:
	- questionType: QuestionType
	- answer: string | string[] (bindable) - NOT used for QCM (uses isCorrect instead)
	- precision: PrecisionType (bindable, for numerical)
	- transformType: string (bindable, for algebraic)
	- blanks: { position: number; expectedAnswer: string }[] (bindable, for fill-in-blanks)
	- choices: { content: TemplateMarkdown; isCorrect: boolean }[] (bindable, for QCM)
	- multipleAnswers: boolean (bindable, for QCM)

	UPDATED: Refactored to use TemplateMarkdown for choice content (branded string type)
-->

<script lang="ts">
	import type { QuestionType, PrecisionType } from '$lib/questions/types';
	import type { TemplateMarkdown } from '$lib/shared/markdown';
	import { templateMarkdown } from '$lib/shared/markdown';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import PrecisionEditor from './PrecisionEditor.svelte';
	import { Plus, Trash2 } from 'lucide-svelte';

	interface Props {
		questionType: QuestionType;
		answer: string | string[];
		precision?: PrecisionType;
		transformType?: string;
		blanks?: { position: number; expectedAnswer: string }[];
		choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
		multipleAnswers?: boolean;
	}

	let {
		questionType,
		answer = $bindable(),
		precision = $bindable(),
		transformType = $bindable(),
		blanks = $bindable([]),
		choices = $bindable([]),
		multipleAnswers = $bindable()
	}: Props = $props();

	// Transform types for algebraic questions
	const TRANSFORM_TYPES = [
		{ value: 'simplify', label: 'Simplification' },
		{ value: 'expand', label: 'Développement' },
		{ value: 'factor', label: 'Factorisation' },
		{ value: 'solve', label: 'Résolution' },
		{ value: 'canonical', label: 'Forme canonique' }
	];

	// Initialize fields based on question type
	$effect(() => {
		if (questionType === 'multiple_choice') {
			if (!choices || choices.length === 0) {
				choices = [
					{ content: templateMarkdown(''), isCorrect: true },
					{ content: templateMarkdown(''), isCorrect: false },
					{ content: templateMarkdown(''), isCorrect: false },
					{ content: templateMarkdown(''), isCorrect: false }
				];
			}
			// answer is managed separately (index or indices of correct choices)
			if (typeof answer !== 'string' && !Array.isArray(answer)) {
				answer = '0'; // Default to first choice
			}
		} else if (questionType === 'fill_in_blanks') {
			if (!Array.isArray(answer)) {
				answer = [''];
			}
			if (!blanks || blanks.length === 0) {
				blanks = [{ position: 0, expectedAnswer: '' }];
			}
		} else {
			// Numerical or algebraic - single string answer
			if (Array.isArray(answer)) {
				answer = '';
			}
		}
	});

	// QCM: Add choice
	function addChoice() {
		choices = [...choices, { content: templateMarkdown(''), isCorrect: false }];
	}

	// QCM: Remove choice
	function removeChoice(index: number) {
		choices = choices.filter((_, i) => i !== index);

		// Update isCorrect flags if we're removing a correct choice
		const removedChoice = choices[index];
		if (removedChoice?.isCorrect) {
			// If there are no more correct choices, mark the first one as correct
			const hasCorrectChoice = choices.some((c) => c.isCorrect);
			if (!hasCorrectChoice && choices.length > 0) {
				choices[0].isCorrect = true;
			}
		}

		// Note: answer field is not used with new structure (isCorrect flag on each choice)
	}

	// QCM: Toggle choice correctness
	function toggleChoiceCorrect(index: number) {
		if (multipleAnswers) {
			// Multiple answers: toggle this choice
			choices[index].isCorrect = !choices[index].isCorrect;
		} else {
			// Single answer: uncheck all, then check this one
			choices = choices.map((c, i) => ({
				...c,
				isCorrect: i === index
			}));
		}
		choices = [...choices]; // Trigger reactivity
	}

	// Fill-in-blanks: Add blank
	function addBlank() {
		if (!Array.isArray(answer)) answer = [];
		answer = [...answer, ''];
		blanks = [...blanks, { position: blanks.length, expectedAnswer: '' }];
	}

	// Fill-in-blanks: Remove blank
	function removeBlank(index: number) {
		if (!Array.isArray(answer)) return;
		answer = answer.filter((_, i) => i !== index);
		blanks = blanks
			.filter((_, i) => i !== index)
			.map((b, i) => ({
				position: i,
				expectedAnswer: b.expectedAnswer
			}));
	}

	// Insert syntax helper into input/textarea
	function insertSyntax(
		elementId: string,
		syntax: string,
		updateCallback: (newValue: string) => void
	) {
		const element = document.getElementById(elementId) as HTMLInputElement | HTMLTextAreaElement;
		if (!element) return;

		const start = element.selectionStart || 0;
		const end = element.selectionEnd || 0;
		const currentValue = element.value;

		const newValue = currentValue.substring(0, start) + syntax + currentValue.substring(end);
		updateCallback(newValue);

		// Set cursor after inserted text
		setTimeout(() => {
			element.focus();
			element.setSelectionRange(start + syntax.length, start + syntax.length);
		}, 0);
	}
</script>

<div class="space-y-4">
	<!-- Numerical Questions -->
	{#if questionType === 'numerical_exact' || questionType === 'numerical_decimal' || questionType === 'numerical_rounded'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Réponse numérique</Card.Title>
				<Card.Description></Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="answer">Expression de la réponse</Label>
					<Input
						id="answer"
						bind:value={answer}
						placeholder={'Ex: {{a}} + {{b}}, {{eval:2^3}}, 42'}
						class="font-mono"
					/>

					<!-- Syntax helper buttons -->
					<div class="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '{{}}', (v) => (answer = v))}
							class="text-xs"
						>
							Variable
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '{{random:1..10}}', (v) => (answer = v))}
							class="text-xs"
						>
							Aléatoire
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '{{eval:}}', (v) => (answer = v))}
							class="text-xs"
						>
							Évaluation
						</Button>
					</div>

					<p class="text-xs text-muted-foreground">
						Cette expression sera évaluée pour produire la réponse numérique attendue
					</p>
				</div>

				{#if questionType !== 'numerical_exact'}
					<PrecisionEditor bind:precision />
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Algebraic Transform -->
	{#if questionType === 'algebraic_transform'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Transformation algébrique</Card.Title>
				<Card.Description>Expression LaTeX attendue après transformation</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="transform-type">Type de transformation</Label>
					<select
						id="transform-type"
						bind:value={transformType}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#each TRANSFORM_TYPES as type (type.value)}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-2">
					<Label for="answer">Expression attendue</Label>
					<Textarea
						id="answer"
						bind:value={answer}
						placeholder="Ex: (x+2)(x-3), x^2-1"
						rows={2}
						class="font-mono"
					/>

					<!-- Syntax helper buttons -->
					<div class="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '{{}}', (v) => (answer = v))}
							class="text-xs"
						>
							Variable
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '{{eval:}}', (v) => (answer = v))}
							class="text-xs"
						>
							Évaluation
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '\\frac{}{}', (v) => (answer = v))}
							class="text-xs"
						>
							Fraction
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '^{}', (v) => (answer = v))}
							class="text-xs"
						>
							Exposant
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => insertSyntax('answer', '_{}', (v) => (answer = v))}
							class="text-xs"
						>
							Indice
						</Button>
					</div>

					<p class="text-xs text-muted-foreground">
						L'équivalence algébrique sera vérifiée avec le Compute Engine
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Fill in Blanks -->
	{#if questionType === 'fill_in_blanks'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Texte à trous</Card.Title>
				<Card.Description>Définissez les positions et réponses pour chaque trou</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if blanks}
					{#each blanks as blank, index (index)}
						<div class="flex gap-3">
							<div class="flex-1 space-y-2">
								<Label for="blank-{index}">
									Trou #{index + 1}
								</Label>
								<div class="grid grid-cols-2 gap-2">
									<div class="space-y-2">
										<Label for="blank-position-{index}" class="text-xs text-muted-foreground">
											Position
										</Label>
										<Input
											id="blank-position-{index}"
											type="number"
											min="0"
											bind:value={blank.position}
											placeholder="0"
											class="font-mono"
										/>
									</div>
									<div class="space-y-2">
										<Label for="blank-answer-{index}" class="text-xs text-muted-foreground">
											Réponse attendue
										</Label>
										<Input
											id="blank-answer-{index}"
											bind:value={blank.expectedAnswer}
											placeholder={'Ex: {{var}}, {{eval:...}}'}
											class="font-mono"
										/>
										<!-- Syntax helper buttons -->
										<div class="flex flex-wrap gap-1">
											<Button
												variant="outline"
												size="sm"
												onclick={() =>
													insertSyntax(
														`blank-answer-${index}`,
														'{{}}',
														(v) => (blank.expectedAnswer = v)
													)}
												class="h-auto px-2 py-0.5 text-xs"
											>
												Variable
											</Button>
											<Button
												variant="outline"
												size="sm"
												onclick={() =>
													insertSyntax(
														`blank-answer-${index}`,
														'{{eval:}}',
														(v) => (blank.expectedAnswer = v)
													)}
												class="h-auto px-2 py-0.5 text-xs"
											>
												Éval
											</Button>
										</div>
									</div>
								</div>
							</div>
							<Button
								variant="destructive"
								size="icon"
								onclick={() => removeBlank(index)}
								disabled={blanks.length === 1}
								class="mt-8"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					{/each}
				{/if}

				<Button onclick={addBlank} class="w-full gap-2" variant="outline">
					<Plus class="h-4 w-4" />
					Ajouter un trou
				</Button>

				<p class="text-xs text-muted-foreground">
					La position indique l'index du champ dans l'énoncé où insérer le trou (0 = début)
				</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Multiple Choice -->
	{#if questionType === 'multiple_choice'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Questionnaire à choix multiples</Card.Title>
				<Card.Description>
					Définissez les choix possibles et indiquez la/les bonne(s) réponse(s)
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Multiple answers toggle -->
				<div class="flex items-center gap-2">
					<Checkbox
						id="multiple-answers"
						checked={multipleAnswers}
						onCheckedChange={(checked) => {
							multipleAnswers = checked as boolean;
							// When switching to single answer mode, keep only first correct choice
							if (!multipleAnswers) {
								const firstCorrectIndex = choices.findIndex((c) => c.isCorrect);
								choices = choices.map((c, i) => ({
									...c,
									isCorrect: i === (firstCorrectIndex >= 0 ? firstCorrectIndex : 0)
								}));
							}
						}}
					/>
					<Label for="multiple-answers">Autoriser plusieurs réponses correctes</Label>
				</div>

				<!-- Choices -->
				{#if choices}
					<div class="space-y-3">
						{#each choices as choice, index (index)}
							<div class="flex gap-3">
								<!-- Correct answer checkbox/radio -->
								<div class="flex items-center pt-8">
									{#if multipleAnswers}
										<Checkbox
											checked={choice.isCorrect}
											onCheckedChange={() => toggleChoiceCorrect(index)}
										/>
									{:else}
										<input
											type="radio"
											name="correct-answer"
											value={index}
											checked={choice.isCorrect}
											onchange={() => toggleChoiceCorrect(index)}
											class="h-4 w-4"
										/>
									{/if}
								</div>

								<!-- Choice content -->
								<div class="flex-1 space-y-2">
									<Label for="choice-{index}">
										Choix {String.fromCharCode(65 + index)}
										{#if choice.isCorrect}
											<Badge class="ml-2">Correct</Badge>
										{/if}
									</Label>
									<!-- Choice content is now a TemplateMarkdown string -->
									<Input
										id="choice-{index}"
										bind:value={choice.content}
										placeholder={'Contenu du choix (LaTeX, {{var}}, {{random:...}} supportes)'}
										class="font-mono"
									/>
									<!-- Syntax helper buttons -->
									<div class="flex flex-wrap gap-1">
										<Button
											variant="outline"
											size="sm"
											onclick={() =>
												insertSyntax(
													`choice-${index}`,
													'{{}}',
													(v) => (choice.content = templateMarkdown(v))
												)}
											class="h-auto px-2 py-0.5 text-xs"
										>
											Variable
										</Button>
										<Button
											variant="outline"
											size="sm"
											onclick={() =>
												insertSyntax(
													`choice-${index}`,
													'{{eval:}}',
													(v) => (choice.content = templateMarkdown(v))
												)}
											class="h-auto px-2 py-0.5 text-xs"
										>
											Eval
										</Button>
										<Button
											variant="outline"
											size="sm"
											onclick={() =>
												insertSyntax(
													`choice-${index}`,
													'\\frac{}{}',
													(v) => (choice.content = templateMarkdown(v))
												)}
											class="h-auto px-2 py-0.5 text-xs"
										>
											Frac
										</Button>
									</div>
								</div>

								<!-- Delete button -->
								<Button
									variant="destructive"
									size="icon"
									onclick={() => removeChoice(index)}
									disabled={choices.length <= 2}
									class="mt-8"
									type="button"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}

				<Button onclick={addChoice} class="w-full gap-2" variant="outline" type="button">
					<Plus class="h-4 w-4" />
					Ajouter un choix
				</Button>

				<p class="text-xs text-muted-foreground">
					Les choix seront mélangés aléatoirement lors de la génération d'instances
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
