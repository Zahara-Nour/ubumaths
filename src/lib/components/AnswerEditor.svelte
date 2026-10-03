<!--
	Answer Editor Component
	=======================

	Dynamic answer editor that changes based on question type.

	QUESTION TYPES:
	- fill_in_blanks: Blanks with expected answers
	- multiple_choice: Choices with TemplateMarkdown content and isCorrect flags

	PROPS:
	- questionType: QuestionType
	- answer: string | string[] (bindable)
	- blanks: TemplateBlank[] (bindable, for fill-in-blanks)
	- choices: { content: TemplateMarkdown; isCorrect: boolean }[] (bindable, for QCM)
	- multipleAnswers: boolean (bindable, for QCM)
	- shuffleChoices: boolean (bindable, for QCM) — `false` après le préréglage
	  « Vrai / Faux » (Q106 : jamais mélangé)
	- onSingleAnswer: appelé quand « plusieurs réponses » est coupé ici (case
	  décochée ou « Vrai / Faux ») : le réglage vaut pour tout le modèle, le parent
	  normalise les AUTRES listes de choix
-->

<script lang="ts">
	import type { QuestionType, TemplateBlank } from '$lib/questions/types';
	import type { TemplateMarkdown } from '$lib/ubumark';
	import { templateMarkdown } from '$lib/ubumark';
	import { keepFirstCorrectChoice } from '$lib/questions/single-answer';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import MyCheckbox from './MyCheckbox.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { Plus, Trash2 } from '@lucide/svelte';

	interface Props {
		questionType: QuestionType;
		answer?: string | string[];
		blanks?: TemplateBlank[];
		choices?: { content: TemplateMarkdown; isCorrect?: boolean }[];
		multipleAnswers?: boolean;
		shuffleChoices?: boolean;
		onSingleAnswer?: () => void;
	}

	// Constantes
	/** Préréglage « Vrai / Faux » (V7) : un QCM ordinaire à deux choix */
	const TRUE_FALSE_CONTENTS = ['Vrai', 'Faux'];

	let {
		questionType,
		answer = $bindable(),
		blanks = $bindable([]),
		choices = $bindable([]),
		multipleAnswers = $bindable(),
		shuffleChoices = $bindable(),
		onSingleAnswer
	}: Props = $props();

	// Plusieurs éditeurs sur la page (partagé + variations) : un groupe radio chacun
	const uid = $props.id();

	let trueFalseConfirmOpen = $state(false);

	// Choix déjà écrits : le préréglage les effacerait
	let writtenChoices = $derived(
		(choices ?? []).map((c) => c.content.trim()).filter((content) => content.length > 0)
	);

	// Nombre de bonnes réponses (V1) : signalé au plus près des choix ; le refus
	// d'enregistrer vit dans `choiceAnswerCountErrors` (formulaire et serveur)
	let correctCount = $derived((choices ?? []).filter((c) => c.isCorrect).length);
	let answerCountWarning = $derived(
		correctCount === 0
			? multipleAnswers
				? 'Coche au moins une bonne réponse.'
				: 'Coche la bonne réponse.'
			: correctCount > 1 && !multipleAnswers
				? 'Une seule bonne réponse sans « plusieurs réponses ».'
				: ''
	);

	// Initialize fields based on question type
	$effect(() => {
		if (questionType === 'multiple_choice') {
			if (!choices || choices.length === 0) {
				choices = [
					{ content: templateMarkdown(''), isCorrect: true },
					{ content: templateMarkdown(''), isCorrect: false }
				];
			}
		} else if (questionType === 'fill_in_blanks') {
			if (!Array.isArray(answer)) {
				answer = [''];
			}
			if (!blanks || blanks.length === 0) {
				blanks = [{ expectedAnswer: '' }];
			}
		}
	});

	// QCM: Add choice
	function addChoice() {
		choices = [...choices, { content: templateMarkdown(''), isCorrect: false }];
	}

	// QCM: Remove choice
	function removeChoice(index: number) {
		// Check if the choice being removed is correct before filtering
		const wasCorrect = choices[index]?.isCorrect;

		choices = choices.filter((_, i) => i !== index);

		// If we removed a correct choice, ensure at least one remains correct
		if (wasCorrect) {
			const hasCorrectChoice = choices.some((c) => c.isCorrect);
			if (!hasCorrectChoice && choices.length > 0) {
				choices[0].isCorrect = true;
			}
		}
	}

	// QCM : préréglage « Vrai / Faux » (V7) — aucune bonne réponse cochée : à
	// l'auteur de cocher la bonne ; jamais mélangé (Q106)
	function applyTrueFalse() {
		choices = TRUE_FALSE_CONTENTS.map((content) => ({
			content: templateMarkdown(content),
			isCorrect: false
		}));
		multipleAnswers = false;
		shuffleChoices = false;
		onSingleAnswer?.();
	}

	function requestTrueFalse() {
		if (writtenChoices.length > 0) {
			trueFalseConfirmOpen = true;
		} else {
			applyTrueFalse();
		}
	}

	// « Plusieurs réponses » décoché : on garde la première bonne réponse
	function handleMultipleAnswersChange(checked: boolean) {
		multipleAnswers = checked;
		if (!checked) {
			choices = keepFirstCorrectChoice(choices);
			onSingleAnswer?.();
		}
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
		blanks = [...blanks, { expectedAnswer: '' }];
	}

	// Fill-in-blanks: Remove blank
	function removeBlank(index: number) {
		if (!Array.isArray(answer)) return;
		answer = answer.filter((_, i) => i !== index);
		blanks = blanks.filter((_, i) => i !== index);
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
	<!-- Fill in Blanks -->
	{#if questionType === 'fill_in_blanks'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Texte à trous</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if blanks}
					{#each blanks as blank, index (index)}
						<div class="flex gap-3">
							<div class="flex-1 space-y-2">
								<Label for="blank-answer-{index}">
									Trou #{index + 1} — Réponse attendue
								</Label>
								<Input
									id="blank-answer-{index}"
									bind:value={blank.expectedAnswer}
									class="font-mono"
								/>
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
					Les trous sont positionnels par index dans l'énoncé
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
				<!-- Plusieurs réponses + préréglage Vrai / Faux -->
				<div class="flex flex-wrap items-center justify-between gap-2">
					<MyCheckbox
						checked={multipleAnswers ?? false}
						onchange={handleMultipleAnswersChange}
						label="Autoriser plusieurs réponses correctes"
					/>
					<Button variant="outline" size="sm" type="button" onclick={requestTrueFalse}>
						Vrai / Faux
					</Button>
				</div>

				<!-- Choices -->
				{#if choices}
					<div class="space-y-3">
						{#each choices as choice, index (index)}
							<div class="flex gap-3">
								<!-- Correct answer checkbox/radio -->
								<div class="flex items-center pt-8">
									{#if multipleAnswers}
										<MyCheckbox
											checked={choice.isCorrect ?? false}
											onchange={() => toggleChoiceCorrect(index)}
											aria-label="Choix {String.fromCharCode(65 + index)} : bonne réponse"
										/>
									{:else}
										<input
											type="radio"
											name="correct-answer-{uid}"
											value={index}
											checked={choice.isCorrect ?? false}
											onchange={() => toggleChoiceCorrect(index)}
											aria-label="Choix {String.fromCharCode(65 + index)} : bonne réponse"
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

				{#if answerCountWarning}
					<p role="alert" class="text-sm text-destructive">{answerCountWarning}</p>
				{/if}

				<p class="text-xs text-muted-foreground">
					{shuffleChoices === false
						? 'Les choix seront affichés dans cet ordre (pas de mélange).'
						: "Les choix seront mélangés aléatoirement lors de la génération d'instances"}
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<ConfirmDialog
	bind:open={trueFalseConfirmOpen}
	title="Remplacer les choix par Vrai / Faux ?"
	description="Les choix actuels ({writtenChoices.join(
		' ; '
	)}) seront remplacés par « Vrai » et « Faux »."
	confirmLabel="Remplacer"
	cancelLabel="Annuler"
	variant="default"
	onConfirm={applyTrueFalse}
/>
