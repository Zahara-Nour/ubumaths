<!--
	Answer Editor Component
	=======================

	Dynamic answer editor that changes based on question type.

	QUESTION TYPES:
	- numerical_exact/decimal/rounded: Single LaTeX expression + precision
	- algebraic_transform: LaTeX expression + transform type
	- fill_in_blanks: Array of answers + blank positions
	- multiple_choice: Array of choices + correct answer(s)

	PROPS:
	- questionType: QuestionType
	- answer: string | string[] (bindable)
	- precision: PrecisionType (bindable, for numerical)
	- transformType: string (bindable, for algebraic)
	- blanks: number[] (bindable, for fill-in-blanks)
	- choices: string[] (bindable, for QCM)
	- multipleAnswers: boolean (bindable, for QCM)
-->

<script lang="ts">
	import type { QuestionType, PrecisionType } from '$lib/questions/types';
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
		blanks?: number[];
		choices?: string[];
		multipleAnswers?: boolean;
	}

	let {
		questionType,
		answer = $bindable(),
		precision = $bindable(),
		transformType = $bindable(),
		blanks = $bindable(),
		choices = $bindable(),
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
				choices = ['', '', '', ''];
			}
			if (typeof answer !== 'string') {
				answer = '0'; // Default to first choice
			}
		} else if (questionType === 'fill_in_blanks') {
			if (!Array.isArray(answer)) {
				answer = [''];
			}
			if (!blanks || blanks.length === 0) {
				blanks = [0];
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
		if (!choices) choices = [];
		choices = [...choices, ''];
	}

	// QCM: Remove choice
	function removeChoice(index: number) {
		if (!choices) return;
		choices = choices.filter((_, i) => i !== index);
		// Adjust answer if it was the removed choice
		if (multipleAnswers && Array.isArray(answer)) {
			answer = answer.filter((a) => parseInt(a) !== index);
		} else if (typeof answer === 'string' && parseInt(answer) === index) {
			answer = '0';
		}
	}

	// Fill-in-blanks: Add blank
	function addBlank() {
		if (!Array.isArray(answer)) answer = [];
		if (!blanks) blanks = [];
		answer = [...answer, ''];
		blanks = [...blanks, answer.length - 1];
	}

	// Fill-in-blanks: Remove blank
	function removeBlank(index: number) {
		if (!Array.isArray(answer) || !blanks) return;
		answer = answer.filter((_, i) => i !== index);
		blanks = blanks.filter((_, i) => i !== index).map((b, i) => i);
	}
</script>

<div class="space-y-4">
	<!-- Numerical Questions -->
	{#if questionType === 'numerical_exact' || questionType === 'numerical_decimal' || questionType === 'numerical_rounded'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Réponse numérique</Card.Title>
				<Card.Description>
					Expression LaTeX à évaluer. Utilisez les variables et la syntaxe spéciale.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="answer">Expression de la réponse</Label>
					<Input
						id="answer"
						bind:value={answer}
						placeholder={'Ex: {@:a} + {@:b}, {eval:2^3}, 42'}
						class="font-mono"
					/>
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
				<Card.Description>
					Expression LaTeX attendue après transformation
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="transform-type">Type de transformation</Label>
					<select
						id="transform-type"
						bind:value={transformType}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#each TRANSFORM_TYPES as type}
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
				<Card.Description>
					Définissez les réponses pour chaque trou
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if Array.isArray(answer) && blanks}
					{#each answer as blank, index}
						<div class="flex gap-3">
							<div class="flex-1 space-y-2">
								<Label for="blank-{index}">
									Trou #{index + 1}
									<Badge variant="outline" class="ml-2">Position {blanks[index]}</Badge>
								</Label>
								<Input
									id="blank-{index}"
									bind:value={answer[index]}
									placeholder="Réponse attendue"
								/>
							</div>
							<Button
								variant="destructive"
								size="icon"
								onclick={() => removeBlank(index)}
								disabled={answer.length === 1}
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
					Les positions des trous seront automatiquement ajustées dans l'énoncé
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
					Définissez les choix possibles et la/les bonne(s) réponse(s)
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
							// Reset answer when switching modes
							answer = multipleAnswers ? [] : '0';
						}}
					/>
					<Label for="multiple-answers">Autoriser plusieurs réponses correctes</Label>
				</div>

				<!-- Choices -->
				{#if choices}
					<div class="space-y-3">
						{#each choices as choice, index}
							<div class="flex gap-3">
								<!-- Correct answer checkbox/radio -->
								<div class="flex items-center pt-8">
									{#if multipleAnswers}
										<Checkbox
											checked={Array.isArray(answer) && answer.includes(String(index))}
											onCheckedChange={(checked) => {
												if (!Array.isArray(answer)) answer = [];
												if (checked) {
													answer = [...answer, String(index)];
												} else {
													answer = answer.filter((a) => a !== String(index));
												}
											}}
										/>
									{:else}
										<input
											type="radio"
											name="correct-answer"
											value={index}
											checked={typeof answer === 'string' && answer === String(index)}
											onchange={() => {
												answer = String(index);
											}}
											class="h-4 w-4"
										/>
									{/if}
								</div>

								<!-- Choice content -->
								<div class="flex-1 space-y-2">
									<Label for="choice-{index}">
										Choix {String.fromCharCode(65 + index)}
										{#if (multipleAnswers && Array.isArray(answer) && answer.includes(String(index))) || (!multipleAnswers && typeof answer === 'string' && answer === String(index))}
											<Badge class="ml-2">Correct</Badge>
										{/if}
									</Label>
									<Input
										id="choice-{index}"
										bind:value={choices[index]}
										placeholder="Contenu du choix (LaTeX supporté)"
										class="font-mono"
									/>
								</div>

								<!-- Delete button -->
								<Button
									variant="destructive"
									size="icon"
									onclick={() => removeChoice(index)}
									disabled={choices.length <= 2}
									class="mt-8"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}

				<Button onclick={addChoice} class="w-full gap-2" variant="outline">
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
