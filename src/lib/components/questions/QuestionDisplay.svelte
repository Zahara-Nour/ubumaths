<!--
	Question Display Component
	===========================

	Student-facing component for displaying and answering question instances.

	FEATURES:
	- Display question statement with LaTeX rendering
	- Type-specific answer inputs (numerical, algebraic, QCM, fill-in-blanks)
	- Answer validation and submission
	- Feedback display (correct/incorrect)
	- Correction display on incorrect answers
	- Timer support (optional)

	PROPS:
	- instance: QuestionInstance - The generated question
	- onSubmit: (answer: any) => Promise<{ correct: boolean; feedback?: string }>
	- showCorrection: boolean - Whether to show correction immediately
	- readonly: boolean - Display only mode (no interaction)
	- timer: number - Optional countdown timer in seconds
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Check, X, Clock, Send } from 'lucide-svelte';

	interface Props {
		instance: QuestionInstance;
		onSubmit?: (answer: any) => Promise<{ correct: boolean; feedback?: string }>;
		showCorrection?: boolean;
		readonly?: boolean;
		timer?: number;
	}

	let {
		instance,
		onSubmit,
		showCorrection = false,
		readonly = false,
		timer
	}: Props = $props();

	// ===========================
	// STATE MANAGEMENT
	// ===========================

	// Student's answer - type varies by question type (string, string[], number)
	let studentAnswer = $state<any>(getInitialAnswer());

	// Submission state tracking
	let isSubmitting = $state(false); // True during async submit
	let hasSubmitted = $state(false); // True after first submit (prevents re-submit)
	let isCorrect = $state<boolean | null>(null); // null = not submitted, true/false = result
	let feedback = $state<string>(''); // Optional feedback message from validation

	// Timer state (undefined = no timer)
	let timeRemaining = $state<number | undefined>(timer);

	// ===========================
	// TIMER SETUP
	// ===========================

	// Timer countdown interval (auto-submit when reaching 0)
	let timerInterval: number | undefined;
	if (timer && timer > 0) {
		timerInterval = setInterval(() => {
			if (timeRemaining && timeRemaining > 0) {
				timeRemaining--;
			} else {
				// Timer expired
				if (timerInterval) clearInterval(timerInterval);
				// Auto-submit if not already submitted and not in readonly mode
				if (!hasSubmitted && !readonly) {
					handleSubmit();
				}
			}
		}, 1000); // Tick every second
	}

	// Cleanup timer on component unmount to prevent memory leaks
	$effect(() => {
		return () => {
			if (timerInterval) clearInterval(timerInterval);
		};
	});

	// ===========================
	// HELPER FUNCTIONS
	// ===========================

	/**
	 * Get initial answer based on question type
	 *
	 * Returns the appropriate empty value for each question type:
	 * - Numerical/Algebraic: Empty string ''
	 * - Fill-in-blanks: Array of empty strings (one per blank)
	 * - QCM single: Empty string '' (radio button value)
	 * - QCM multiple: Empty array [] (checkbox values)
	 */
	function getInitialAnswer(): any {
		switch (instance.type) {
			case 'numerical_exact':
			case 'numerical_decimal':
			case 'numerical_rounded':
				return ''; // Empty text input

			case 'algebraic_transform':
				return ''; // Empty textarea

			case 'fill_in_blanks':
				// Create array of empty strings matching number of blanks
				return Array.isArray(instance.answer) ? new Array(instance.answer.length).fill('') : [''];

			case 'multiple_choice':
				// Single answer = string, multiple = array
				return instance.multiple_answers ? [] : '';

			default:
				return '';
		}
	}

	/**
	 * Format time as MM:SS
	 *
	 * @param seconds - Total seconds to format
	 * @returns Formatted time string (e.g., "05:30", "00:45")
	 */
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	/**
	 * Submit student's answer for validation
	 *
	 * Calls the onSubmit callback (if provided) with the student's answer.
	 * Updates isCorrect and feedback based on result.
	 * Stops the timer after submission.
	 *
	 * Guards:
	 * - Does nothing if no onSubmit callback
	 * - Does nothing if already submitted
	 * - Does nothing in readonly mode
	 */
	async function handleSubmit() {
		// Guard clauses
		if (!onSubmit || hasSubmitted || readonly) return;

		isSubmitting = true;

		try {
			// Call validation callback (async)
			const result = await onSubmit(studentAnswer);

			// Update feedback state
			isCorrect = result.correct;
			feedback = result.feedback || '';
			hasSubmitted = true;

			// Stop timer after successful submission
			if (timerInterval) {
				clearInterval(timerInterval);
				timerInterval = undefined;
			}
		} catch (error) {
			console.error('Submit error:', error);
			feedback = 'Erreur lors de la soumission';
		} finally {
			isSubmitting = false;
		}
	}

	/**
	 * Render content fields (text and images) as HTML string
	 *
	 * Currently renders images as placeholder text.
	 * TODO: Integrate MathLive for LaTeX rendering in text fields.
	 *
	 * @param fields - Array of content objects (text or image)
	 * @returns HTML string to be rendered with {@html}
	 */
	function renderContent(fields: { type: 'text' | 'image'; content: string }[]): string {
		return fields
			.map((field) => {
				if (field.type === 'text') {
					return field.content;
				} else {
					// Image placeholder (TODO: render actual images)
					return `[Image: ${field.content}]`;
				}
			})
			.join(' ');
	}

	/**
	 * Get display letter for choice (A, B, C, D...)
	 *
	 * Converts index to uppercase letter for QCM choices.
	 *
	 * @param index - Zero-based index
	 * @returns Uppercase letter (0 → 'A', 1 → 'B', etc.)
	 */
	function getChoiceLetter(index: number): string {
		return String.fromCharCode(65 + index); // 65 = ASCII 'A'
	}
</script>

<!--
═══════════════════════════════════════════════════════════════════════════════
TEMPLATE - MAIN CARD STRUCTURE
═══════════════════════════════════════════════════════════════════════════════
-->

<Card.Root class="w-full">
	<!-- ========== CARD HEADER: Type badge, grade badges, timer ========== -->
	<Card.Header>
		<div class="flex items-center justify-between">
			<!-- Left: Question type and grade level badges -->
			<div class="flex items-center gap-3">
				<Badge variant="outline" class="text-sm">
					{instance.type.replace('_', ' ')}
				</Badge>
				{#if instance.grades && instance.grades.length > 0}
					<div class="flex gap-1">
						{#each instance.grades.slice(0, 3) as grade}
							<Badge variant="secondary" class="text-xs">{grade}</Badge>
						{/each}
						{#if instance.grades.length > 3}
							<Badge variant="secondary" class="text-xs">+{instance.grades.length - 3}</Badge>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Right: Timer (red when < 30 seconds) -->
			{#if timeRemaining !== undefined}
				<div
					class="flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold {timeRemaining <
					30
						? 'bg-destructive text-destructive-foreground'
						: 'bg-muted text-muted-foreground'}"
				>
					<Clock class="h-4 w-4" />
					<span>{formatTime(timeRemaining)}</span>
				</div>
			{/if}
		</div>
	</Card.Header>

	<!-- ========== CARD CONTENT ========== -->
	<Card.Content class="space-y-6">
		<!-- Question Statement (rendered as HTML with LaTeX support) -->
		<div class="space-y-3">
			<div class="prose prose-lg dark:prose-invert max-w-none">
				{@html renderContent(instance.statement)}
			</div>
		</div>

		<!-- ========== ANSWER INPUT SECTION (only if not readonly and not submitted) ========== -->
		{#if !readonly && !hasSubmitted}
			<div class="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
				<h3 class="text-lg font-semibold">Votre réponse</h3>

				<!-- Numerical Questions -->
				{#if instance.type === 'numerical_exact' || instance.type === 'numerical_decimal' || instance.type === 'numerical_rounded'}
					<div class="space-y-2">
						<Label for="answer-input">Entrez votre réponse numérique</Label>
						<Input
							id="answer-input"
							type="text"
							bind:value={studentAnswer}
							placeholder="Exemple: 42, 3.14, -5"
							class="text-lg"
							disabled={isSubmitting}
						/>
						{#if instance.precision && instance.precision.type !== 'none'}
							<p class="text-sm text-muted-foreground">
								{#if instance.precision.type === 'decimal'}
									Précision: {instance.precision.digits} décimales
								{:else if instance.precision.type === 'significant'}
									Chiffres significatifs: {instance.precision.digits}
								{:else if instance.precision.type === 'tolerance'}
									Tolérance: ±{instance.precision.tolerance}
									{instance.precision.mode === 'relative' ? '%' : ''}
								{/if}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Algebraic Questions -->
				{#if instance.type === 'algebraic_transform'}
					<div class="space-y-2">
						<Label for="algebraic-answer">Entrez votre expression algébrique</Label>
						<Textarea
							id="algebraic-answer"
							bind:value={studentAnswer}
							placeholder="Exemple: 2x + 3, (x-1)(x+1), x^2 - 1"
							rows={3}
							class="font-mono text-lg"
							disabled={isSubmitting}
						/>
						{#if instance.transform_type}
							<p class="text-sm text-muted-foreground">
								Type: {instance.transform_type}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Fill in the Blanks -->
				{#if instance.type === 'fill_in_blanks' && Array.isArray(studentAnswer)}
					<div class="space-y-3">
						<Label>Remplissez les cases vides</Label>
						{#each studentAnswer as blank, i}
							<div class="flex items-center gap-3">
								<Badge class="w-8">{i + 1}</Badge>
								<Input
									type="text"
									bind:value={studentAnswer[i]}
									placeholder="Réponse {i + 1}"
									class="flex-1"
									disabled={isSubmitting}
								/>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Multiple Choice - Single Answer -->
				{#if instance.type === 'multiple_choice' && !instance.multiple_answers && instance.shuffledChoices}
					<RadioGroup bind:value={studentAnswer} class="space-y-3">
						{#each instance.shuffledChoices as choice, i}
							<div class="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50">
								<RadioGroupItem value={String(i)} id="choice-{i}" disabled={isSubmitting} />
								<Label
									for="choice-{i}"
									class="flex flex-1 cursor-pointer items-center gap-3 text-base"
								>
									<Badge variant="outline">{getChoiceLetter(i)}</Badge>
									<span class="flex-1">{choice}</span>
								</Label>
							</div>
						{/each}
					</RadioGroup>
				{/if}

				<!-- Multiple Choice - Multiple Answers -->
				{#if instance.type === 'multiple_choice' && instance.multiple_answers && instance.shuffledChoices}
					<div class="space-y-3">
						<p class="text-sm text-muted-foreground">Sélectionnez toutes les bonnes réponses</p>
						{#each instance.shuffledChoices as choice, i}
							<div class="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50">
								<Checkbox
									id="choice-{i}"
									checked={studentAnswer.includes(String(i))}
									onCheckedChange={(checked) => {
										if (checked) {
											studentAnswer = [...studentAnswer, String(i)];
										} else {
											studentAnswer = studentAnswer.filter((a: string) => a !== String(i));
										}
									}}
									disabled={isSubmitting}
								/>
								<Label
									for="choice-{i}"
									class="flex flex-1 cursor-pointer items-center gap-3 text-base"
								>
									<Badge variant="outline">{getChoiceLetter(i)}</Badge>
									<span class="flex-1">{choice}</span>
								</Label>
							</div>
						{/each}
					</div>
				{/if}

				<!-- ========== SUBMIT BUTTON ========== -->
				<!-- Disabled if answer is empty or during submission -->
				<div class="pt-4">
					<Button
						onclick={handleSubmit}
						disabled={isSubmitting || !studentAnswer || (Array.isArray(studentAnswer) && studentAnswer.every((a) => !a))}
						class="w-full gap-2 text-lg"
						size="lg"
					>
						<Send class="h-5 w-5" />
						{isSubmitting ? 'Envoi en cours...' : 'Soumettre ma réponse'}
					</Button>
				</div>
			</div>
		{/if}

		<!-- ========== FEEDBACK DISPLAY (shown after submission) ========== -->
		{#if hasSubmitted && isCorrect !== null}
			<div
				class="space-y-4 rounded-lg border-2 p-6 {isCorrect
					? 'border-green-500 bg-green-50 dark:bg-green-950/20'
					: 'border-destructive bg-destructive/10'}"
			>
				<div class="flex items-center gap-3">
					{#if isCorrect}
						<div class="rounded-full bg-green-500 p-2 text-white">
							<Check class="h-6 w-6" />
						</div>
						<div>
							<h3 class="text-xl font-bold text-green-700 dark:text-green-400">
								Correct !
							</h3>
							<p class="text-green-600 dark:text-green-300">
								Excellente réponse !
							</p>
						</div>
					{:else}
						<div class="rounded-full bg-destructive p-2 text-destructive-foreground">
							<X class="h-6 w-6" />
						</div>
						<div>
							<h3 class="text-xl font-bold text-destructive">
								Incorrect
							</h3>
							<p class="text-destructive/80">
								Essayez à nouveau ou consultez la correction
							</p>
						</div>
					{/if}
				</div>

				{#if feedback}
					<div class="rounded-md bg-background/50 p-4">
						<p class="text-sm">{feedback}</p>
					</div>
				{/if}

				<!-- Show Correction on Error (if enabled) -->
				{#if !isCorrect && showCorrection && instance.correction}
					<div class="space-y-2 border-t pt-4">
						<h4 class="font-semibold">Correction</h4>
						<div class="prose prose-sm dark:prose-invert max-w-none">
							{@html renderContent(instance.correction)}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ========== READONLY MODE: Display correct answer without interaction ========== -->
		{#if readonly}
			<div class="rounded-lg border-2 border-muted bg-muted/30 p-6">
				<h3 class="mb-3 font-semibold">Réponse attendue</h3>
				<div class="text-lg font-mono">
					<!-- Array answers (fill-in-blanks, multiple choice) -->
					{#if Array.isArray(instance.answer)}
						<ul class="space-y-1">
							{#each instance.answer as ans, i}
								<li class="flex items-center gap-2">
									<Badge>{i + 1}</Badge>
									<span>{ans}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<!-- Single answer (numerical, algebraic) -->
						{instance.answer}
					{/if}
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<!--
═══════════════════════════════════════════════════════════════════════════════
END OF COMPONENT
═══════════════════════════════════════════════════════════════════════════════
-->
